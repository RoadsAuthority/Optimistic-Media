
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
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleAuth = async (mode: 'login' | 'signup', e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            let result;
            if (mode === 'signup') {
                result = await supabase.auth.signUp({
                    email,
                    password,
                });
            } else {
                result = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
            }

            const { data, error } = result;

            if (error) {
                if (error.message.includes('Email not confirmed')) {
                    toast.error('Email not confirmed. Please check your inbox or Supabase Dashboard -> Emails.');
                } else if (error.message.includes('Invalid login credentials')) {
                    toast.error('Invalid email or password. If you just signed up, did you confirm your email?');
                } else {
                    throw error;
                }
                return;
            }

            if (mode === 'signup') {
                if (data.user && !data.session) {
                    toast.success('Signup successful! Check your email to confirm your account.');
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
            toast.error(error.message || `Failed to ${mode}. Check console for details.`);
        } finally {
            setLoading(false);
        }
    };

    const handleMagicLink = async () => {
        if (!email) {
            toast.error('Please enter your email first');
            return;
        }
        setLoading(true);
        try {
            const { error } = await supabase.auth.signInWithOtp({
                email,
                options: {
                    emailRedirectTo: window.location.origin,
                }
            });
            if (error) throw error;
            toast.success('Magic link sent! Check your email.');
        } catch (error: any) {
            console.error('Magic Link Error:', error);
            if (error.message.includes('User not found')) {
                toast.error('No account found for this email. Please sign up first.');
            } else {
                toast.error(error.message || 'Failed to send magic link. Check console.');
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

                        <TabsContent value="login">
                            <form onSubmit={(e) => handleAuth('login', e)} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="email-login">Email</Label>
                                    <Input id="email-login" type="email" placeholder="m@example.com" required value={email} onChange={(e) => setEmail(e.target.value)} />
                                </div>
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
                                <div className="space-y-2">
                                    <Label htmlFor="email-signup">Email</Label>
                                    <Input id="email-signup" type="email" placeholder="m@example.com" required value={email} onChange={(e) => setEmail(e.target.value)} />
                                </div>
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

                    <div className="relative my-4">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-background px-2 text-muted-foreground">Or</span>
                        </div>
                    </div>

                    <Button variant="outline" className="w-full" onClick={handleMagicLink} disabled={loading}>
                        Send Magic Link
                    </Button>

                </CardContent>
            </Card>
        </div>
    );
}
