import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { LeaveRequestForm } from '@/components/forms/LeaveRequestForm';

export default function LeaveRequestPage() {
  return (
    <DashboardLayout 
      title="New Leave Request"
      subtitle="Submit a request for time off"
    >
      <LeaveRequestForm />
    </DashboardLayout>
  );
}
