
import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
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

    useEffect(() => {
        async function verifyToken() {
            if (!token) return;
            try {
                const { data, error } = await supabase
                    .from('invitations')
                    .select('email, used_at, expires_at')
                    .eq('token', token)
                    .maybeSingle();

                if (error || !data) throw new Error('Invalid token');
                if (data.used_at) throw new Error('Invitation already used');
                if (new Date(data.expires_at) < new Date()) throw new Error('Invitation expired');

                setEmail(data.email);
                setInviteValid(true);
            } catch (error: any) {
                toast.error(error.message || 'Invalid or expired invitation');
            } finally {
                setLoading(false);
            }
        }

        verifyToken();
    }, [token]);

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setVerifying(true);

        try {
            // 1. Sign up the user
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        invitation_token: token // Optional: pass token in metadata for debug
                    }
                }
            });

            if (error) throw error;

            if (data.user) {
                toast.success('Account created successfully! You can now log in.');
                navigate('/login');
            }

        } catch (error: any) {
            console.error(error);
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
                        <Button className="w-full" type="submit" disabled={verifying}>
                            {verifying ? 'Creating Account...' : 'Create Account'}
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
