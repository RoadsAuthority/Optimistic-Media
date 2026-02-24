
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Calendar } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [loginMethod, setLoginMethod] = useState<'email' | 'phone'>('email');
    const navigate = useNavigate();

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
        } catch (error: any) {
            console.error('Auth Error:', error);
            const msg = String(error?.message || '');
            const status = error?.status;

            if (status === 429 || msg.toLowerCase().includes('rate limit')) {
                toast.error(
                    'Rate limit exceeded. Wait a bit and try again.'
                );
            } else {
                toast.error(error.message || `Failed to ${mode}. Check console for details.`);
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
                        <TabsList className="grid w-full grid-cols-2 mb-4">
                            <TabsTrigger value="login">Login</TabsTrigger>
                            <TabsTrigger value="signup">Sign Up</TabsTrigger>
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
                        </TabsContent>

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
                                </div>
                                <Button type="submit" className="w-full" disabled={loading}>
                                    {loading ? 'Processing...' : 'Create Account'}
                                </Button>
                            </form>
                        </TabsContent>
                    </Tabs>


                </CardContent>
            </Card>
        </div>
    );
}
