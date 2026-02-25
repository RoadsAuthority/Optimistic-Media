
import { useState } from 'react';
import { useUsers } from '@/hooks/useData';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { queryClient } from '@/lib/queryClient';
import { UserRole } from '@/types/leave';
import { Loader2, AlertCircle } from 'lucide-react';

export default function AdminPage() {
    const users = useUsers();
    const [updating, setUpdating] = useState<string | null>(null);

    const updateUserRole = async (userId: string, newRole: UserRole) => {
        setUpdating(userId);
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ role: newRole })
                .eq('id', userId);

            if (error) throw error;

            toast.success('User role updated successfully');
            queryClient.invalidateQueries({ queryKey: ['users'] });
        } catch (error) {
            const err = error as Error;
            toast.error(err.message || 'Failed to update role');
        } finally {
            setUpdating(null);
        }
    };

    const updateUserManager = async (userId: string, managerId: string) => {
        setUpdating(userId);
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ manager_id: managerId === 'none' ? null : managerId })
                .eq('id', userId);

            if (error) throw error;

            toast.success('Manager updated successfully');
            queryClient.invalidateQueries({ queryKey: ['users'] });
        } catch (error) {
            const err = error as Error;
            toast.error(err.message || 'Failed to update manager');
        } finally {
            setUpdating(null);
        }
    };


    if (!users) return <div className="p-8 text-center"><Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" /></div>;

    const managers = users.filter(u => u.role === 'MANAGER' || u.role === 'ADMIN');

    return (
        <DashboardLayout
            title="Admin Dashboard"
            subtitle="Manage users, roles, and system settings"
        >
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>User Management</CardTitle>
                        <CardDescription>
                            Manage access levels and reporting lines for all employees in your company.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Role</TableHead>
                                    <TableHead>Manager</TableHead>
                                    <TableHead>Department</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {users.map((user) => (
                                    <TableRow key={user.id}>
                                        <TableCell className="font-medium">{user.name}</TableCell>
                                        <TableCell>{user.email}</TableCell>
                                        <TableCell>
                                            <Select
                                                defaultValue={user.role}
                                                onValueChange={(val) => updateUserRole(user.id, val as UserRole)}
                                                disabled={updating === user.id}
                                            >
                                                <SelectTrigger className="w-[130px]">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="EMPLOYEE">Employee</SelectItem>
                                                    <SelectItem value="MANAGER">Manager</SelectItem>
                                                    <SelectItem value="HR">HR</SelectItem>
                                                    <SelectItem value="ADMIN">Admin</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </TableCell>
                                        <TableCell>
                                            <Select
                                                defaultValue={user.managerId || 'none'}
                                                onValueChange={(val) => updateUserManager(user.id, val)}
                                                disabled={updating === user.id}
                                            >
                                                <SelectTrigger className="w-[180px]">
                                                    <SelectValue placeholder="Select Manager" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="none">No Manager</SelectItem>
                                                    {managers
                                                        .filter(m => m.id !== user.id) // Can't be own manager
                                                        .map(manager => (
                                                            <SelectItem key={manager.id} value={manager.id}>
                                                                {manager.name}
                                                            </SelectItem>
                                                        ))}
                                                </SelectContent>
                                            </Select>
                                        </TableCell>
                                        <TableCell>{user.department || '-'}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                <Card className="border-red-200 bg-red-50/30">
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <AlertCircle className="h-5 w-5 text-red-600" />
                            <CardTitle className="text-red-800">System Maintenance</CardTitle>
                        </div>
                        <CardDescription>
                            Critical system actions. Use with caution.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-between">
                            <div className="max-w-2xl">
                                <p className="text-sm font-semibold text-red-900">Reset All Leave Balances</p>
                                <p className="text-sm text-red-700/70 mt-1">
                                    This will reset all employees' leave balances to their annual allowance for the new year.
                                    All current remaining days will be overwritten by the default annual allowance for each leave type.
                                    This action is irreversible.
                                </p>
                            </div>
                            <Button
                                variant="destructive"
                                className="shadow-lg shadow-red-200"
                                onClick={async () => {
                                    if (confirm('ARE YOU ABSOLUTELY SURE? This will reset balances for ALL employees and CANNOT BE UNDONE.')) {
                                        setUpdating('system-reset');
                                        try {
                                            const { data: types } = await supabase.from('leave_types').select('*');
                                            if (!types) return;

                                            for (const type of types) {
                                                await supabase
                                                    .from('leave_balances')
                                                    .update({
                                                        remaining_days: type.annual_allowance,
                                                        used_days: 0,
                                                        total_days: type.annual_allowance
                                                    })
                                                    .eq('leave_type_id', type.id);
                                            }

                                            toast.success('All leave balances have been reset for the new year.');
                                            queryClient.invalidateQueries({ queryKey: ['leaveBalances'] });
                                        } catch (error) {
                                            const err = error as Error;
                                            toast.error('Failed to reset balances: ' + err.message);
                                        } finally {
                                            setUpdating(null);
                                        }
                                    }
                                }}
                                disabled={updating === 'system-reset'}
                            >
                                {updating === 'system-reset' ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : null}
                                Run New Year Reset
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
}
