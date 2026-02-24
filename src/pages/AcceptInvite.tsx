import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { requestVerificationCode, verifyPhoneCode } from '@/hooks/useData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

export default function AcceptInvitePage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get('token');

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(true);
    const [verifying, setVerifying] = useState(false);
    const [inviteValid, setInviteValid] = useState(false);
    const [whatsapp, setWhatsapp] = useState<string | null>(null);
    const [codeSent, setCodeSent] = useState(false);
    const [sendingCode, setSendingCode] = useState(false);
    const [verificationCode, setVerificationCode] = useState('');
    const [phoneVerified, setPhoneVerified] = useState(false);

    useEffect(() => {
        async function verifyToken() {
            if (!token) return;
            try {
                const { data, error } = await supabase
                    .from('invitations')
                    .select('email, used_at, expires_at, role, department, whatsapp')
                    .eq('token', token)
                    .maybeSingle();

                if (error || !data) throw new Error('Invalid token');
                if (data.used_at) throw new Error('Invitation already used');
                if (new Date(data.expires_at) < new Date()) throw new Error('Invitation expired');

                setEmail(data.email);
                if (data.whatsapp) setWhatsapp(data.whatsapp);
                setInviteValid(true);
            } catch (error: any) {
                toast.error(error.message || 'Invalid or expired invitation');
            } finally {
                setLoading(false);
            }
        }

        verifyToken();
    }, [token]);

    const handleSendCode = async () => {
        if (!whatsapp?.trim()) return;
        setSendingCode(true);
        try {
            const result = await requestVerificationCode(whatsapp);
            if (result.error) {
                toast.error(result.error);
                return;
            }
            setCodeSent(true);
            toast.success('Verification code sent to your WhatsApp.');
        } catch (e: any) {
            toast.error(e?.message || 'Failed to send code');
        } finally {
            setSendingCode(false);
        }
    };

    const handleVerifyCode = async () => {
        if (!whatsapp?.trim() || !verificationCode.trim()) {
            toast.error('Enter the code you received.');
            return;
        }
        setVerifying(true);
        try {
            const result = await verifyPhoneCode(whatsapp, verificationCode.trim());
            if (result.valid) {
                setPhoneVerified(true);
                toast.success('Phone verified.');
            } else {
                toast.error('Invalid or expired code. Request a new one if needed.');
            }
        } catch (e: any) {
            toast.error(e?.message || 'Verification failed');
        } finally {
            setVerifying(false);
        }
    };

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setVerifying(true);

        try {
            // 1. Fetch invitation details to get role, department, etc.
            const { data: inviteData, error: inviteError } = await supabase
                .from('invitations')
                .select('*')
                .eq('token', token!)
                .single();

            if (inviteError || !inviteData) {
                throw new Error('Invalid invitation token');
            }

            if (inviteData.used_at) {
                throw new Error('This invitation has already been used');
            }

            // 2. Sign up the user
            const { data: authData, error: signupError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        invitation_token: token
                    }
                }
            });

            if (signupError) throw signupError;

            if (!authData.user) {
                throw new Error('Failed to create user account');
            }

            // The profile is now created automatically by the database trigger 'on_auth_user_created'
            // which uses the invitation_token passed in the metadata above.

            // 3. Mark invitation as used (optional fallback, the trigger also does this)
            const { error: updateError } = await supabase
                .from('invitations')
                .update({ used_at: new Date().toISOString() })
                .eq('token', token!);


            if (updateError) {
                console.warn('Failed to mark invitation as used:', updateError);
                // Don't fail the signup process if this fails
            }

            toast.success('Account created successfully! You can now log in.');
            navigate('/login');

        } catch (error: any) {
            console.error('Signup error:', error);
            toast.error(error.message || 'Failed to create account');
        } finally {
            setVerifying(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <p>Verifying invitation...</p>
            </div>
        );
    }

    if (!token || !inviteValid) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <CardTitle className="text-destructive">Invalid Invitation</CardTitle>
                        <CardDescription>
                            This invitation link is invalid, expired, or has already been used.
                            Please ask your administrator for a new invitation.
                        </CardDescription>
                    </CardHeader>
                </Card>
            </div>
        );
    }

    const requirePhoneVerification = !!whatsapp && !phoneVerified;

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl font-bold">Accept Invitation</CardTitle>
                    <CardDescription>
                        Set up your account for {email}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {whatsapp && (
                        <div className="space-y-3 mb-6 p-4 rounded-lg border bg-muted/50">
                            <Label className="text-sm font-medium">Phone verification (WhatsApp)</Label>
                            <p className="text-xs text-muted-foreground">
                                A code will be sent to {whatsapp}. You must verify before creating your account.
                            </p>
                            {!codeSent ? (
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="w-full"
                                    onClick={handleSendCode}
                                    disabled={sendingCode}
                                >
                                    {sendingCode ? 'Sending...' : 'Send verification code'}
                                </Button>
                            ) : !phoneVerified ? (
                                <div className="space-y-2">
                                    <Input
                                        placeholder="Enter 6-digit code"
                                        value={verificationCode}
                                        onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                        maxLength={6}
                                        className="text-center text-lg tracking-widest"
                                    />
                                    <div className="flex gap-2">
                                        <Button type="button" variant="outline" className="flex-1" onClick={handleSendCode} disabled={sendingCode}>
                                            Resend code
                                        </Button>
                                        <Button type="button" className="flex-1" onClick={handleVerifyCode} disabled={verifying || verificationCode.length !== 6}>
                                            {verifying ? 'Checking...' : 'Verify'}
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-sm text-green-600 font-medium">Phone verified</p>
                            )}
                        </div>
                    )}

                    <form onSubmit={handleSignup} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input id="email" type="email" value={email} disabled />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Create Password</Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="Minimum 6 characters"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={6}
                            />
                        </div>
                        <Button
                            className="w-full"
                            type="submit"
                            disabled={verifying || requirePhoneVerification}
                        >
                            {verifying ? 'Creating Account...' : requirePhoneVerification ? 'Verify phone first' : 'Create Account'}
                        </Button>
                        <p className="mt-4 text-center text-xs text-muted-foreground bg-muted p-2 rounded">
                            <strong>Note:</strong> Check your Supabase Dashboard "Emails" tab if you don't receive a confirmation link.
                        </p>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
