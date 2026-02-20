
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { User, LeaveBalance, LeaveRequest } from '@/types/leave';
import { useLeaveBalances, useLeaveRequests, useLeaveTypes } from '@/hooks/useData';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import { Mail, Phone, Building2, ShieldCheck, MailQuestion } from 'lucide-react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';

interface UserProfileModalProps {
    user: User | null;
    isOpen: boolean;
    onClose: () => void;
}

export function UserProfileModal({ user, isOpen, onClose }: UserProfileModalProps) {
    const balances = useLeaveBalances(user?.id);
    const requests = useLeaveRequests(user?.id);
    const leaveTypes = useLeaveTypes();

    if (!user) return null;

    const getStatusBadge = (status: string) => {
        const styles = {
            PENDING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-500',
            APPROVED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-500',
            REJECTED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-500',
        };

        return (
            <Badge variant="outline" className={`font-normal border-0 ${styles[status as keyof typeof styles]}`}>
                {status.charAt(0) + status.slice(1).toLowerCase()}
            </Badge>
        );
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Employee Profile</DialogTitle>
                    <DialogDescription>Detailed information and leave history for {user.name}.</DialogDescription>
                </DialogHeader>

                <div className="space-y-8 py-4">
                    {/* Header Info */}
                    <div className="flex flex-col sm:flex-row items-center gap-6">
                        <Avatar className="h-24 w-24 border-2 border-primary/10">
                            <AvatarImage src={user.avatar} />
                            <AvatarFallback className="text-2xl">
                                {user.name.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                        </Avatar>
                        <div className="text-center sm:text-left space-y-1">
                            <h3 className="text-2xl font-bold">{user.name}</h3>
                            <div className="flex flex-wrap justify-center sm:justify-start gap-3 text-sm text-muted-foreground">
                                <div className="flex items-center gap-1">
                                    <ShieldCheck className="h-4 w-4" />
                                    {user.role}
                                </div>
                                <Separator orientation="vertical" className="hidden sm:block h-4" />
                                <div className="flex items-center gap-1">
                                    <Building2 className="h-4 w-4" />
                                    {user.department}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Contact & Details */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                            <div className="h-8 w-8 rounded-full bg-background flex items-center justify-center">
                                <Mail className="h-4 w-4 text-primary" />
                            </div>
                            <div className="space-y-0.5">
                                <p className="text-xs text-muted-foreground">Email Address</p>
                                <p className="text-sm font-medium truncate">{user.email || 'No email provided'}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                            <div className="h-8 w-8 rounded-full bg-background flex items-center justify-center">
                                <Phone className="h-4 w-4 text-green-600" />
                            </div>
                            <div className="space-y-0.5">
                                <p className="text-xs text-muted-foreground">WhatsApp</p>
                                <p className="text-sm font-medium">{user.whatsapp || 'No WhatsApp provided'}</p>
                            </div>
                        </div>
                    </div>

                    {/* Leave Balances */}
                    <div className="space-y-4">
                        <h4 className="font-semibold text-lg">Leave Balances</h4>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                            {balances?.map((balance) => {
                                const leaveType = leaveTypes?.find(lt => lt.id === balance.leaveTypeId);
                                const percentage = Math.round((balance.remainingDays / balance.totalDays) * 100);

                                return (
                                    <div key={balance.leaveTypeId} className="p-4 rounded-xl border bg-card space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-medium">{leaveType?.name}</span>
                                            <div
                                                className="h-3 w-3 rounded-full"
                                                style={{ backgroundColor: leaveType?.color }}
                                            />
                                        </div>
                                        <div>
                                            <div className="flex items-baseline gap-1">
                                                <span className="text-2xl font-bold">{balance.remainingDays}</span>
                                                <span className="text-sm text-muted-foreground">/ {balance.totalDays} days</span>
                                            </div>
                                            <div className="w-full bg-muted rounded-full h-1.5 mt-2">
                                                <div
                                                    className="h-1.5 rounded-full bg-primary transition-all"
                                                    style={{ width: `${percentage}%`, backgroundColor: leaveType?.color }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Leave History */}
                    <div className="space-y-4">
                        <h4 className="font-semibold text-lg">Leave History</h4>
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Type</TableHead>
                                        <TableHead>Dates</TableHead>
                                        <TableHead>Days</TableHead>
                                        <TableHead>Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {!requests || requests.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center text-muted-foreground py-6">
                                                No leave history found
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        requests.map((request) => (
                                            <TableRow key={request.id}>
                                                <TableCell className="font-medium">
                                                    {request.leaveType?.name}
                                                </TableCell>
                                                <TableCell className="text-sm">
                                                    {format(new Date(request.startDate), 'MMM d')} - {format(new Date(request.endDate), 'MMM d, yyyy')}
                                                </TableCell>
                                                <TableCell>
                                                    {request.daysRequested}
                                                </TableCell>
                                                <TableCell>
                                                    {getStatusBadge(request.status)}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
