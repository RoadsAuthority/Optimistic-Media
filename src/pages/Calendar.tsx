
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { LeaveCalendar } from '@/components/calendar/LeaveCalendar';
import { useLeaveRequests, useUsers } from '@/hooks/useData';
import { LeaveRequest } from '@/types/leave';

export default function CalendarPage() {
  const { currentUser } = useAuth();
  const allRequests = useLeaveRequests();
  const allUsers = useUsers();

  if (!currentUser) return null;
  if (!allRequests || !allUsers) return <div>Loading calendar...</div>;

  // For managers, show team calendar. For employees, show their own + team.
  let relevantRequests: LeaveRequest[] = [];

  if (currentUser.role === 'MANAGER') {
    const teamMemberIds = allUsers
      .filter(u => u.managerId === currentUser.id)
      .map(u => u.id);
    relevantRequests = allRequests.filter(r =>
      teamMemberIds.includes(r.userId) || r.userId === currentUser.id
    );
  } else if (currentUser.role === 'EMPLOYEE') {
    // Show own leaves plus team members
    const managerId = currentUser.managerId;
    if (managerId) {
      const teamMemberIds = allUsers
        .filter(u => u.managerId === managerId)
        .map(u => u.id);
      relevantRequests = allRequests.filter(r => teamMemberIds.includes(r.userId));
    } else {
      relevantRequests = allRequests.filter(r => r.userId === currentUser.id);
    }
  } else {
    // HR sees all
    relevantRequests = allRequests;
  }

  return (
    <DashboardLayout
      title="Leave Calendar"
      subtitle="View scheduled leaves across your team"
    >
      <div className="h-[calc(100vh-12rem)] min-h-[600px]">
        <LeaveCalendar requests={relevantRequests} />
      </div>
    </DashboardLayout>
  );
}

