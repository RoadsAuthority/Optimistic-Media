import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuditLogs } from '@/hooks/useData';
import { format } from 'date-fns';
import { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export default function AuditLogPage() {
  const auditLogs = useAuditLogs();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredLogs = useMemo(() => {
    if (!auditLogs) return [];
    if (!searchQuery) return auditLogs;

    const query = searchQuery.toLowerCase();
    return auditLogs.filter(log =>
      log.action.toLowerCase().includes(query) ||
      (log.performedByUser?.name || 'Unknown').toLowerCase().includes(query) ||
      (log.details || '').toLowerCase().includes(query)
    );
  }, [auditLogs, searchQuery]);

  if (!auditLogs) return <div>Loading audit logs...</div>;

  const getActionBadge = (action: string) => {
    const colors: Record<string, string> = {
      LEAVE_REQUEST_CREATED: 'bg-primary/10 text-primary',
      LEAVE_REQUEST_APPROVED: 'bg-approved/10 text-approved',
      LEAVE_REQUEST_REJECTED: 'bg-rejected/10 text-rejected',
      LEAVE_BALANCE_ADJUSTED: 'bg-warning/10 text-warning',
    };

    const labels: Record<string, string> = {
      LEAVE_REQUEST_CREATED: 'Created',
      LEAVE_REQUEST_APPROVED: 'Approved',
      LEAVE_REQUEST_REJECTED: 'Rejected',
      LEAVE_BALANCE_ADJUSTED: 'Adjusted',
    };

    return (
      <Badge className={colors[action] || 'bg-muted text-muted-foreground'}>
        {labels[action] || action}
      </Badge>
    );
  };

  return (
    <DashboardLayout
      title="Audit Log"
      subtitle="Complete history of all leave-related actions"
    >
      <div className="mb-6 relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search logs by action, user or details..."
          className="pl-9"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="dashboard-card overflow-hidden p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date & Time</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Performed By</TableHead>
              <TableHead>Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLogs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                  {searchQuery ? "No matching audit logs found" : "No audit logs found"}
                </TableCell>
              </TableRow>
            ) : (
              filteredLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="text-muted-foreground">
                    {format(new Date(log.timestamp), 'MMM d, yyyy HH:mm')}
                  </TableCell>
                  <TableCell>{getActionBadge(log.action)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={log.performedByUser?.avatar} />
                        <AvatarFallback className="text-xs">
                          {log.performedByUser?.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{log.performedByUser?.name || 'Unknown'}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-md truncate">
                    {log.details}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </DashboardLayout>
  );
}

