
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { useLeaveRequests, useUsers, useLeaveTypes } from '@/hooks/useData';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { Calendar, Users, FileText, TrendingUp } from 'lucide-react';
import { LeaveRequest } from '@/types/leave';

export default function ReportsPage() {
  const leaveRequests: LeaveRequest[] | undefined = useLeaveRequests();
  const users = useUsers();
  const leaveTypes = useLeaveTypes();

  if (!leaveRequests || !users || !leaveTypes) return <div>Loading reports...</div>;

  // Calculate stats
  const totalRequests = leaveRequests.length;
  const approvedRequests = leaveRequests.filter(r => r.status === 'APPROVED');
  const rejectedRequests = leaveRequests.filter(r => r.status === 'REJECTED');
  const pendingRequests = leaveRequests.filter(r => r.status === 'PENDING');

  const totalDaysApproved = approvedRequests.reduce((acc, r) => acc + r.daysRequested, 0);
  const approvalRate = totalRequests > 0 ? Math.round((approvedRequests.length / totalRequests) * 100) : 0;

  // Data for charts
  const statusData = [
    { name: 'Approved', value: approvedRequests.length, fill: 'hsl(142, 76%, 36%)' },
    { name: 'Pending', value: pendingRequests.length, fill: 'hsl(43, 96%, 56%)' },
    { name: 'Rejected', value: rejectedRequests.length, fill: 'hsl(0, 84%, 60%)' },
  ].filter(d => d.value > 0);

  const leaveTypeData = leaveTypes.map(type => ({
    name: type.name.split(' ')[0],
    requests: leaveRequests.filter(r => r.leaveTypeId === type.id).length,
    fill: type.color,
  }));

  return (
    <DashboardLayout
      title="Reports"
      subtitle="Leave analytics and insights"
    >
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Requests"
            value={totalRequests}
            icon={<FileText className="h-6 w-6" />}
          />
          <StatCard
            title="Days Approved"
            value={totalDaysApproved}
            icon={<Calendar className="h-6 w-6" />}
          />
          <StatCard
            title="Approval Rate"
            value={`${approvalRate}%`}
            icon={<TrendingUp className="h-6 w-6" />}
          />
          <StatCard
            title="Active Employees"
            value={users.length}
            icon={<Users className="h-6 w-6" />}
          />
        </div>

        {/* Charts */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Status Distribution */}
          <div className="dashboard-card">
            <h3 className="font-semibold text-foreground mb-6">Request Status Distribution</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Requests by Leave Type */}
          <div className="dashboard-card">
            <h3 className="font-semibold text-foreground mb-6">Requests by Leave Type</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={leaveTypeData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={80} />
                  <Tooltip />
                  <Bar dataKey="requests" radius={[0, 4, 4, 0]}>
                    {leaveTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

