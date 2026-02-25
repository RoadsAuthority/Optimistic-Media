import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Calendar } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { requestVerificationCode, verifyPhoneCode } from '@/hooks/useData';
import { PasswordStrengthIndicator } from '@/components/ui/password-strength-indicator';
import { cn } from '@/lib/utils';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [isPasswordValid, setIsPasswordValid] = useState(false);
    const [loading, setLoading] = useState(false);
    const [loginMethod, setLoginMethod] = useState<'email' | 'phone'>('email');
    const [authMode, setAuthMode] = useState<'password' | 'otp'>('password');
    const [verificationCode, setVerificationCode] = useState('');
    const [codeSent, setCodeSent] = useState(false);
    const [verifying, setVerifying] = useState(false);
    const [adminCount, setAdminCount] = useState<number | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchAdminCount = async () => {
            try {
                const { count, error } = await supabase
                    .from('profiles')
                    .select('*', { count: 'exact', head: true })
                    .eq('role', 'ADMIN');

                if (error) throw error;
                setAdminCount(count || 0);
            } catch (err) {
                console.error('Error fetching admin count:', err);
            }
        };

        fetchAdminCount();
    }, []);

    const handleRequestOTP = async () => {
        if (!phone.trim()) {
            toast.error('Please enter your WhatsApp number first.');
            return;
        }
        setLoading(true);
        try {
            const result = await requestVerificationCode(phone);
            if (result.error) {
                toast.error(result.error);
                return;
            }
            setCodeSent(true);
            toast.success('Verification code sent to WhatsApp!');
        } catch (error) {
            const err = error as Error;
            toast.error(err.message || 'Failed to send code');
        } finally {
            setLoading(false);
        }
    };

    const handleOTPLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!verificationCode.trim()) return;
        setLoading(true);

        try {
            // 1. Verify code
            const verifyResult = await verifyPhoneCode(phone, verificationCode);
            if (!verifyResult.valid) {
                toast.error('Invalid or expired verification code.');
                setLoading(false);
                return;
            }

            // 2. If valid, we need to sign in. 
            // Supabase Passwordless Auth (OTP) usually requires its own flow.
            // But for "demonstration purposes", we can simulate the login 
            // if we have a way to sign in without password, OR we can use 
            // the code to verify identity and then use a "magic" login if configured.

            // ACTUALLY: The user's "whatsapp twilio code verification" is a CUSTOM flow.
            // To "log in" via this custom flow, we'd need a way to get a session.
            // Since we don't have a custom "login by phone code" RPC that returns a session,
            // and regular Supabase Auth OTP uses its own SMS provider (not our Edge Function),
            // we will demonstrate the VERIFICATION part and then show a success message.

            // If the user *already exists*, we can try to find them and "simulate" login
            // for demonstration, OR we can inform the user that true OTP login
            // requires Supabase OTP configuration.

            // User said: "just for demonstration purposes"
            toast.success('Code verified! (Demonstration: In a real flow, you would now be logged in)');

            // To make it look real, we can try to find the profile and if it exists, 
            // we tell them they are verified.
            const { data: profile } = await supabase.from('profiles').select('id').eq('whatsapp', phone).maybeSingle();
            if (profile) {
                toast.info('User profile found and verified.');
            }

        } catch (error) {
            const err = error as Error;
            toast.error(err.message || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    const handleAuth = async (mode: 'login' | 'signup', e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            let result;
            if (mode === 'signup') {
                result = await supabase.auth.signUp({
                    email: loginMethod === 'email' ? email : undefined,
                    phone: loginMethod === 'phone' ? phone : undefined,
                    password,
                });
            } else {
                if (loginMethod === 'email') {
                    result = await supabase.auth.signInWithPassword({
                        email,
                        password,
                    });
                } else {
                    result = await supabase.auth.signInWithPassword({
                        phone,
                        password,
                    });
                }
            }

            const { data, error } = result;

            if (error) {
                if (error.message.includes('Email not confirmed')) {
                    toast.error('Email not confirmed. Please check your inbox or Supabase Dashboard -> Emails.');
                } else if (error.message.includes('Invalid login credentials')) {
                    toast.error('Invalid credentials. If you just signed up, did you confirm your account/phone?');
                } else {
                    throw error;
                }
                return;
            }

            if (mode === 'signup') {
                if (data.user && !data.session) {
                    toast.success(loginMethod === 'email'
                        ? 'Signup successful! Check your email to confirm your account.'
                        : 'Signup successful! Your account is ready.'
                    );
                } else {
                    toast.success('Account created and logged in!');
                    navigate('/');
                }
            } else {
                toast.success('Successfully logged in');
                navigate('/');
            }
        } catch (error) {
            const err = error as Error;
            console.error('Auth Error:', err);
            const msg = String(err?.message || '');
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const status = (err as any)?.status;

            if (status === 429 || msg.toLowerCase().includes('rate limit')) {
                toast.error(
                    'Rate limit exceeded. Wait a bit and try again.'
                );
            } else {
                toast.error(err.message || `Failed to ${mode}. Check console for details.`);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
            <Card className="w-full max-w-md animate-fade-in">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-white border p-1 shadow-sm">
                            <img src="/logo.jpeg" alt="Optimistic Media Group" className="h-full w-full object-contain" />
                        </div>
                    </div>
                    <CardTitle className="text-2xl">Welcome</CardTitle>
                    <CardDescription>
                        Sign in to your account or create a new one
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue="login" className="w-full">
                        <TabsList className={cn("grid w-full mb-4", (adminCount !== null && adminCount >= 2) ? "grid-cols-1" : "grid-cols-2")}>
                            <TabsTrigger value="login">Login</TabsTrigger>
                            {(adminCount === null || adminCount < 2) && (
                                <TabsTrigger value="signup">Sign Up</TabsTrigger>
                            )}
                        </TabsList>

                        <div className="flex justify-center mb-4 p-1 bg-muted rounded-lg w-fit mx-auto">
                            <Button
                                variant={loginMethod === 'email' ? 'secondary' : 'ghost'}
                                size="sm"
                                className="px-3 py-1 text-xs"
                                onClick={() => setLoginMethod('email')}
                            >
                                Email
                            </Button>
                            <Button
                                variant={loginMethod === 'phone' ? 'secondary' : 'ghost'}
                                size="sm"
                                className="px-3 py-1 text-xs"
                                onClick={() => setLoginMethod('phone')}
                            >
                                WhatsApp/Phone
                            </Button>
                        </div>

                        <TabsContent value="login">
                            <div className="space-y-4">
                                {loginMethod === 'phone' && (
                                    <div className="flex justify-center mb-2 p-1 bg-muted/50 rounded-lg w-fit mx-auto border">
                                        <Button
                                            variant={authMode === 'password' ? 'secondary' : 'ghost'}
                                            size="sm"
                                            className="px-3 py-1 text-[10px] h-7"
                                            onClick={() => setAuthMode('password')}
                                        >
                                            Password
                                        </Button>
                                        <Button
                                            variant={authMode === 'otp' ? 'secondary' : 'ghost'}
                                            size="sm"
                                            className="px-3 py-1 text-[10px] h-7"
                                            onClick={() => setAuthMode('otp')}
                                        >
                                            WhatsApp Code
                                        </Button>
                                    </div>
                                )}

                                {authMode === 'otp' && loginMethod === 'phone' ? (
                                    <form onSubmit={handleOTPLogin} className="space-y-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="phone-otp">WhatsApp Number</Label>
                                            <Input
                                                id="phone-otp"
                                                type="tel"
                                                placeholder="+264..."
                                                required
                                                value={phone}
                                                onChange={(e) => setPhone(e.target.value)}
                                                disabled={codeSent}
                                            />
                                        </div>

                                        {!codeSent ? (
                                            <Button type="button" className="w-full" onClick={handleRequestOTP} disabled={loading}>
                                                {loading ? 'Sending...' : 'Send Verification Code'}
                                            </Button>
                                        ) : (
                                            <>
                                                <div className="space-y-2">
                                                    <Label htmlFor="otp-code">Verification Code</Label>
                                                    <Input
                                                        id="otp-code"
                                                        placeholder="6-digit code"
                                                        required
                                                        value={verificationCode}
                                                        onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                                        maxLength={6}
                                                        className="text-center text-lg tracking-widest"
                                                    />
                                                </div>
                                                <Button type="submit" className="w-full" disabled={loading || verificationCode.length !== 6}>
                                                    {loading ? 'Verifying...' : 'Verify & Login'}
                                                </Button>
                                                <Button type="button" variant="link" className="w-full text-xs" onClick={() => setCodeSent(false)}>
                                                    Use a different number
                                                </Button>
                                            </>
                                        )}
                                    </form>
                                ) : (
                                    <form onSubmit={(e) => handleAuth('login', e)} className="space-y-4">
                                        {loginMethod === 'email' ? (
                                            <div className="space-y-2">
                                                <Label htmlFor="email-login">Email</Label>
                                                <Input id="email-login" type="email" placeholder="m@example.com" required value={email} onChange={(e) => setEmail(e.target.value)} />
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                <Label htmlFor="phone-login">WhatsApp Number (with +prefix)</Label>
                                                <Input id="phone-login" type="tel" placeholder="+264..." required value={phone} onChange={(e) => setPhone(e.target.value)} />
                                            </div>
                                        )}
                                        <div className="space-y-2">
                                            <Label htmlFor="password-login">Password</Label>
                                            <Input id="password-login" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
                                        </div>
                                        <Button type="submit" className="w-full" disabled={loading}>
                                            {loading ? 'Processing...' : 'Sign In'}
                                        </Button>
                                    </form>
                                )}
                            </div>
                        </TabsContent>

                        {(adminCount === null || adminCount < 2) ? (
                            <TabsContent value="signup">
                                <form onSubmit={(e) => handleAuth('signup', e)} className="space-y-4">
                                    {loginMethod === 'email' ? (
                                        <div className="space-y-2">
                                            <Label htmlFor="email-signup">Email</Label>
                                            <Input id="email-signup" type="email" placeholder="m@example.com" required value={email} onChange={(e) => setEmail(e.target.value)} />
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            <Label htmlFor="phone-signup">WhatsApp Number (with +prefix)</Label>
                                            <Input id="phone-signup" type="tel" placeholder="+264..." required value={phone} onChange={(e) => setPhone(e.target.value)} />
                                        </div>
                                    )}
                                    <div className="space-y-2">
                                        <Label htmlFor="password-signup">Password</Label>
                                        <Input id="password-signup" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
                                        <PasswordStrengthIndicator
                                            password={password}
                                            onValidChange={setIsPasswordValid}
                                        />
                                    </div>
                                    <Button type="submit" className="w-full" disabled={loading || !isPasswordValid}>
                                        {loading ? 'Processing...' : 'Create Account'}
                                    </Button>
                                </form>
                            </TabsContent>
                        ) : (
                            <TabsContent value="signup">
                                <div className="p-4 rounded-lg border bg-muted/50 text-center space-y-2">
                                    <p className="text-sm font-medium">Signup Restricted</p>
                                    <p className="text-xs text-muted-foreground">
                                        The system has reached its direct registration limit.
                                        Please contact an administrator to receive an invitation.
                                    </p>
                                </div>
                            </TabsContent>
                        )}
                    </Tabs>


                </CardContent>
            </Card>
        </div>
    );
}
