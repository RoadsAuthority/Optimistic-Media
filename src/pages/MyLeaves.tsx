
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { RecentRequestsTable } from '@/components/dashboard/RecentRequestsTable';
import { useLeaveRequests } from '@/hooks/useData';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function MyLeavesPage() {
  const { currentUser } = useAuth();
  const allRequests = useLeaveRequests(currentUser?.id);

  if (!currentUser) return null;
  if (!allRequests) return <div>Loading...</div>;

  const pendingRequests = allRequests.filter(r => r.status === 'PENDING');
  const approvedRequests = allRequests.filter(r => r.status === 'APPROVED');
  const rejectedRequests = allRequests.filter(r => r.status === 'REJECTED');

  return (
    <DashboardLayout
      title="My Leave History"
      subtitle="View all your leave requests and their status"
    >
      <Tabs defaultValue="all" className="space-y-6">
        <TabsList>
          <TabsTrigger value="all">
            All ({allRequests.length})
          </TabsTrigger>
          <TabsTrigger value="pending">
            Pending ({pendingRequests.length})
          </TabsTrigger>
          <TabsTrigger value="approved">
            Approved ({approvedRequests.length})
          </TabsTrigger>
          <TabsTrigger value="rejected">
            Rejected ({rejectedRequests.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <RecentRequestsTable requests={allRequests} canCancel={true} />
        </TabsContent>
        <TabsContent value="pending">
          <RecentRequestsTable requests={pendingRequests} canCancel={true} />
        </TabsContent>
        <TabsContent value="approved">
          <RecentRequestsTable requests={approvedRequests} canCancel={true} />
        </TabsContent>
        <TabsContent value="rejected">
          <RecentRequestsTable requests={rejectedRequests} canCancel={true} />
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}

