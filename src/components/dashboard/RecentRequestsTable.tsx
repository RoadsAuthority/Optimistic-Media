

import { LeaveRequest } from '@/types/leave';
import { format, differenceInBusinessDays, parseISO } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Trash2, XCircle } from 'lucide-react';
import { cancelLeaveRequest } from '@/hooks/useData';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

interface RecentRequestsTableProps {
  requests: LeaveRequest[];
  showUser?: boolean;
  canCancel?: boolean;
}

export function RecentRequestsTable({ requests, showUser = false, canCancel = false }: RecentRequestsTableProps) {
  const { currentUser } = useAuth();

  const getStatusBadge = (status: string) => {
    const styles = {
      PENDING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-500',
      APPROVED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-500',
      REJECTED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-500',
      CANCELLED: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400',
    };

    return (
      <Badge variant="outline" className={cn('font-normal border-0', styles[status as keyof typeof styles])}>
        {status.charAt(0) + status.slice(1).toLowerCase()}
      </Badge>
    );
  };

  const calculateDays = (start: string, end: string) => {
    return differenceInBusinessDays(parseISO(end), parseISO(start)) + 1;
  };

  const handleCancel = async (id: string) => {
    if (!currentUser) return;
    if (!confirm('Are you sure you want to cancel this request?')) return;

    try {
      await cancelLeaveRequest(id, currentUser.id);
      toast.success('Leave request cancelled successfully');
    } catch (error) {
      const err = error as Error;
      console.error('Error cancelling leave request:', err);
      toast.error(err.message || 'Failed to cancel request');
    }
  };

  return (
    <div className="dashboard-card animate-fade-in overflow-hidden p-0">
      <div className="border-b px-6 py-4">
        <h3 className="font-semibold text-foreground">Recent Leave Requests</h3>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            {showUser && <TableHead>Employee</TableHead>}
            <TableHead>Type</TableHead>
            <TableHead>Dates</TableHead>
            <TableHead>Days</TableHead>
            <TableHead>Status</TableHead>
            {canCancel && <TableHead className="text-right">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {requests.length === 0 ? (
            <TableRow>
              <TableCell colSpan={showUser ? 5 : (canCancel ? 5 : 4)} className="text-center text-muted-foreground py-8">
                No leave requests found
              </TableCell>
            </TableRow>
          ) : (
            requests.map((request) => (
              <TableRow key={request.id} className="hover:bg-muted/50">
                {showUser && (
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={request.user?.avatar} />
                        <AvatarFallback className="text-xs">
                          {request.user?.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{request.user?.name}</span>
                    </div>
                  </TableCell>
                )}
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: request.leaveType?.color }}
                    />
                    {request.leaveType?.name}
                  </div>
                </TableCell>
                <TableCell>
                  {format(new Date(request.startDate), 'MMM d')} - {format(new Date(request.endDate), 'MMM d, yyyy')}
                </TableCell>
                <TableCell>
                  {request.daysRequested || calculateDays(request.startDate, request.endDate)}
                </TableCell>
                <TableCell>{getStatusBadge(request.status)}</TableCell>
                {canCancel && (
                  <TableCell className="text-right">
                    {(request.status === 'PENDING' || request.status === 'APPROVED') && (
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleCancel(request.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                )}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}


