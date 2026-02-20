
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PendingApprovalsCard } from '@/components/dashboard/PendingApprovalsCard';
import { RecentRequestsTable } from '@/components/dashboard/RecentRequestsTable';
import { useLeaveRequests, useUsers } from '@/hooks/useData';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function ApprovalsPage() {
  const { currentUser } = useAuth();
  const allRequests = useLeaveRequests();
  const allUsers = useUsers();

  if (!currentUser) return null;
  if (!allRequests || !allUsers) return <div>Loading approvals...</div>;

  const isAdmin = currentUser.role === 'ADMIN' || currentUser.role === 'HR';

  const approvableUserIds = allUsers
    .filter(u => {
      if (isAdmin) {
        // Admins can approve everyone EXCEPT themselves
        // (their own leave must be approved by another admin)
        return u.id !== currentUser.id;
      }
      // Managers see only their direct reports
      return u.managerId === currentUser.id;
    })
    .map(u => u.id);

  const teamRequests = allRequests.filter(r => approvableUserIds.includes(r.userId));
  const pendingRequests = teamRequests.filter(r => r.status === 'PENDING');
  const processedRequests = teamRequests.filter(r => r.status !== 'PENDING');

  return (
    <DashboardLayout
      title="Leave Approvals"
      subtitle="Review and manage team leave requests"
    >
      <Tabs defaultValue="pending" className="space-y-6">
        <TabsList>
          <TabsTrigger value="pending">
            Pending ({pendingRequests.length})
          </TabsTrigger>
          <TabsTrigger value="processed">
            Processed ({processedRequests.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <div className="grid gap-6 lg:grid-cols-2">
            {pendingRequests.length === 0 ? (
              <div className="dashboard-card lg:col-span-2 text-center py-12">
                <p className="text-muted-foreground">No pending approvals</p>
              </div>
            ) : (
              <div className="lg:col-span-2">
                <PendingApprovalsCard requests={teamRequests} />
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="processed">
          <RecentRequestsTable requests={processedRequests} showUser />
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}

