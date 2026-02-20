import { useState } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  parseISO,
  isWithinInterval
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { LeaveRequest } from '@/types/leave';

interface LeaveCalendarProps {
  requests: LeaveRequest[];
}

export function LeaveCalendar({ requests }: LeaveCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const approvedRequests = requests
    .filter(r => r.status === 'APPROVED');

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const getRequestsForDay = (date: Date) => {
    return approvedRequests.filter(request => {
      const start = parseISO(request.startDate);
      const end = parseISO(request.endDate);
      return isWithinInterval(date, { start, end }) ||
        isSameDay(date, start) ||
        isSameDay(date, end);
    });
  };

  const previousMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1));
  };

  return (
    <div className="dashboard-card animate-fade-in h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-foreground">
          {format(currentMonth, 'MMMM yyyy')}
        </h2>
        <div className="flex gap-1">
          <Button variant="outline" size="icon" onClick={previousMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={nextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden border">
        {/* Week day headers */}
        {weekDays.map((day) => (
          <div
            key={day}
            className="bg-muted py-3 text-center text-sm font-medium text-muted-foreground"
          >
            {day}
          </div>
        ))}

        {/* Calendar days */}
        {days.map((day, idx) => {
          const dayRequests = getRequestsForDay(day);
          const isCurrentMonth = isSameMonth(day, currentMonth);

          return (
            <div
              key={idx}
              className={cn(
                'min-h-[100px] bg-card p-2 transition-colors relative',
                !isCurrentMonth && 'bg-muted/50',
                isToday(day) && 'bg-primary/5'
              )}
            >
              <span
                className={cn(
                  'inline-flex h-7 w-7 items-center justify-center rounded-full text-sm',
                  isToday(day) && 'bg-primary text-primary-foreground font-medium',
                  !isCurrentMonth && 'text-muted-foreground'
                )}
              >
                {format(day, 'd')}
              </span>

              {/* Leave indicators */}
              <div className="mt-1 space-y-1">
                {dayRequests.slice(0, 3).map((request) => (
                  <TooltipProvider key={request.id}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div
                          className="flex items-center gap-1 rounded px-1.5 py-0.5 text-xs truncate cursor-pointer hover:opacity-80"
                          style={{
                            backgroundColor: `${request.leaveType?.color || '#3b82f6'}20`,
                            color: request.leaveType?.color || '#3b82f6',
                          }}
                        >
                          <Avatar className="h-4 w-4">
                            <AvatarImage src={request.user?.avatar} />
                            <AvatarFallback className="text-[8px]">
                              {request.user?.name.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <span className="truncate">{request.user?.name.split(' ')[0]}</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <div className="text-sm">
                          <p className="font-medium">{request.user?.name}</p>
                          <p className="text-muted-foreground">
                            {request.leaveType?.name}
                          </p>
                          <p className="text-muted-foreground">
                            {format(parseISO(request.startDate), 'MMM d')} - {format(parseISO(request.endDate), 'MMM d')}
                          </p>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ))}
                {dayRequests.length > 3 && (
                  <span className="text-xs text-muted-foreground pl-1">
                    +{dayRequests.length - 3} more
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-4">
        {approvedRequests
          .reduce((acc, req) => {
            if (!acc.find(r => r.leaveType?.id === req.leaveType?.id)) {
              acc.push(req);
            }
            return acc;
          }, [] as typeof approvedRequests)
          .map((request) => (
            <div key={request.leaveType?.id} className="flex items-center gap-2">
              <div
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: request.leaveType?.color }}
              />
              <span className="text-sm text-muted-foreground">{request.leaveType?.name}</span>
            </div>
          ))
        }
      </div>
    </div>
  );
}
