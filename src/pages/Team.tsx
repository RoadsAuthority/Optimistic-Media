
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useUsers, useLeaveBalances, useLeaveTypes } from '@/hooks/useData';
import { User, LeaveBalance } from '@/types/leave';
import { UserProfileModal } from '@/components/employees/UserProfileModal';
import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

const TeamMemberRow = ({ member, onViewProfile }: { member: User, onViewProfile: (user: User) => void }) => {
  const balances = useLeaveBalances(member.id);
  const leaveTypes = useLeaveTypes();

  if (!balances || !leaveTypes) return null;

  return (
    <TableRow key={member.id}>
      <TableCell
        className="cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => {
          onViewProfile(member);
        }}
      >
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={member.avatar} />
            <AvatarFallback>
              {member.name.split(' ').map(n => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{member.name}</p>
            <p className="text-sm text-muted-foreground">{member.role}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>{member.department}</TableCell>
      <TableCell className="text-muted-foreground">{member.email}</TableCell>
      <TableCell>
        <div className="flex flex-wrap gap-2">
          {balances.slice(0, 3).map((balance: LeaveBalance) => {
            const leaveType = leaveTypes.find(lt => lt.id === balance.leaveTypeId);
            return (
              <Badge
                key={balance.leaveTypeId}
                variant="secondary"
                className="text-xs"
                title={`${balance.usedDays} days used / ${balance.totalDays} total`}
              >
                {leaveType?.name.split(' ')[0]}: {balance.remainingDays}/{balance.totalDays}d
              </Badge>
            );
          })}
        </div>
      </TableCell>
    </TableRow>
  );
};

export default function TeamPage() {
  const { currentUser } = useAuth();
  const allUsers = useUsers();
  const [viewingUser, setViewingUser] = useState<User | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  if (!currentUser || !allUsers) return null;

  const teamMembers = allUsers.filter(u => u.managerId === currentUser.id);

  return (
    <DashboardLayout
      title="My Team"
      subtitle="View and manage your team members"
    >
      <div className="dashboard-card overflow-hidden p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Leave Balances</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {teamMembers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                  No team members found
                </TableCell>
              </TableRow>
            ) : (
              teamMembers.map((member) => (
                <TeamMemberRow
                  key={member.id}
                  member={member}
                  onViewProfile={(user) => {
                    setViewingUser(user);
                    setIsProfileOpen(true);
                  }}
                />
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <UserProfileModal
        user={viewingUser}
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
      />
    </DashboardLayout>
  );
}

