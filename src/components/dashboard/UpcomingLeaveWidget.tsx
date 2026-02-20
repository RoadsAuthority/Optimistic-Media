import { LeaveRequest } from '@/types/leave';
import { format, isAfter, parseISO } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Calendar } from 'lucide-react';

interface UpcomingLeaveWidgetProps {
  requests: LeaveRequest[];
}

export function UpcomingLeaveWidget({ requests }: UpcomingLeaveWidgetProps) {
  const today = new Date();

  const upcomingLeaves = requests
    .filter(r => r.status === 'APPROVED' && isAfter(parseISO(r.startDate), today))
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
    .slice(0, 5);

  return (
    <div className="dashboard-card animate-fade-in h-full">
      <div className="flex items-center gap-2 mb-6">
        <Calendar className="h-5 w-5 text-primary" />
        <h3 className="font-semibold text-foreground">Upcoming Leaves</h3>
      </div>

      {upcomingLeaves.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No upcoming leaves
        </div>
      ) : (
        <div className="space-y-4">
          {upcomingLeaves.map((request) => (
            <div
              key={request.id}
              className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
            >
              <div
                className="flex flex-col items-center justify-center w-12 h-12 rounded bg-primary/10 text-primary"
              >
                <span className="text-xs font-medium uppercase">
                  {format(new Date(request.startDate), 'MMM')}
                </span>
                <span className="text-lg font-bold">
                  {format(new Date(request.startDate), 'd')}
                </span>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Avatar className="h-5 w-5">
                    <AvatarImage src={request.user?.avatar} />
                    <AvatarFallback className="text-[10px]">
                      {request.user?.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <p className="font-medium text-sm truncate">{request.user?.name}</p>
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {request.leaveType?.name} • {format(new Date(request.startDate), 'EEE')} - {format(new Date(request.endDate), 'EEE')}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
