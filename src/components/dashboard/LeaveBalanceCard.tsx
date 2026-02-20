import { LeaveBalance, LeaveType } from '@/types/leave';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface LeaveBalanceCardProps {
  balance: LeaveBalance;
  leaveType: LeaveType;
}

export function LeaveBalanceCard({ balance, leaveType }: LeaveBalanceCardProps) {
  const usagePercentage = (balance.usedDays / balance.totalDays) * 100;
  
  return (
    <div className="dashboard-card animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div 
            className="h-3 w-3 rounded-full" 
            style={{ backgroundColor: leaveType.color }}
          />
          <h3 className="font-medium text-foreground">{leaveType.name}</h3>
        </div>
        <span className="text-2xl font-bold text-foreground">
          {balance.remainingDays}
          <span className="text-sm font-normal text-muted-foreground"> / {balance.totalDays}</span>
        </span>
      </div>
      
      <div className="mt-4">
        <Progress 
          value={usagePercentage} 
          className="h-2"
        />
        <div className="mt-2 flex justify-between text-xs text-muted-foreground">
          <span>{balance.usedDays} days used</span>
          <span>{balance.remainingDays} days remaining</span>
        </div>
      </div>
    </div>
  );
}
