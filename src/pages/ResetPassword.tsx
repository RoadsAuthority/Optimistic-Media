import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { PasswordStrengthIndicator } from '@/components/ui/password-strength-indicator';
import { validatePassword } from '@/lib/auth-utils';
import { useAuth } from '@/contexts/AuthContext';

export default function ResetPasswordPage() {
    const [password, setPassword] = useState('');
    const [isPasswordValid, setIsPasswordValid] = useState(false);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { logEvent } = useAuth();

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validatePassword(password)) {
            toast.error('Password does not meet requirements');
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase.auth.updateUser({
                password: password
            });

            if (error) throw error;

            // Log the event
            await logEvent('PASSWORD_RESET', { method: 'recovery_link' });

            toast.success('Password updated successfully! Redirecting to login...');

            // Wait a moment for the toast and log to settle
            setTimeout(() => {
                navigate('/login');
            }, 2000);
        } catch (error) {
            const err = error as Error;
            console.error('Reset password error:', err);
            toast.error(err.message || 'Failed to update password');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl">Reset Password</CardTitle>
                    <CardDescription>
                        Enter your new secure password below
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleResetPassword} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="new-password">New Password</Label>
                            <Input
                                id="new-password"
                                type="password"
                                placeholder="Enter new password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                            <PasswordStrengthIndicator
                                password={password}
                                onValidChange={setIsPasswordValid}
                            />
                        </div>
                        <Button type="submit" className="w-full" disabled={loading || !isPasswordValid}>
                            {loading ? 'Updating...' : 'Update Password'}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
