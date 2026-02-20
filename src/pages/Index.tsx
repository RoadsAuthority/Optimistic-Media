
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { LeaveBalanceCard } from '@/components/dashboard/LeaveBalanceCard';
import { RecentRequestsTable } from '@/components/dashboard/RecentRequestsTable';
import { UpcomingLeaveWidget } from '@/components/dashboard/UpcomingLeaveWidget';
import { PendingApprovalsCard } from '@/components/dashboard/PendingApprovalsCard';
import { useLeaveBalances, useLeaveRequests, useUsers, useLeaveTypes } from '@/hooks/useData';
import {
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  Users,
  FileText,
  TrendingUp,
  Sparkles,
  Shield,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

import { Link, Navigate } from 'react-router-dom';

import { LeaveRequest, User } from '@/types/leave';

function EmployeeDashboard() {
  const { currentUser } = useAuth();
  const balances = useLeaveBalances(currentUser?.id);
  const requests = useLeaveRequests(currentUser?.id);
  const leaveTypes = useLeaveTypes();

  if (!currentUser || !balances || !requests || !leaveTypes) return <div>Loading dashboard...</div>;

  const pendingCount = requests.filter(r => r.status === 'PENDING').length;
  const approvedCount = requests.filter(r => r.status === 'APPROVED').length;
  // Calculate total used days from balances
  const totalDaysUsed = balances.reduce((acc, b) => acc + b.usedDays, 0);

  // Find next approved leave
  const upcomingLeaves = requests
    .filter(r => r.status === 'APPROVED' && new Date(r.startDate) > new Date())
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

  const nextLeave = upcomingLeaves[0];
  const nextLeaveType = nextLeave ? leaveTypes.find(lt => lt.id === nextLeave.leaveTypeId) : null;

  return (
    <DashboardLayout
      title={`Welcome back, ${currentUser.name.split(' ')[0]}!`}
      subtitle="Manage your leave requests and view your balance"
    >
      <div className="space-y-6">
        {/* Welcome Hero */}
        <div className="relative overflow-hidden rounded-2xl bg-primary px-8 py-10 text-primary-foreground shadow-lg border-b-4 border-primary-foreground/10">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-4 max-w-lg">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold backdrop-blur-md">
                <Sparkles className="h-3 w-3" />
                <span>Optimistic Media Group Portal</span>
              </div>
              <h2 className="text-3xl font-bold tracking-tight">Stay Productive, Stay Balanced.</h2>
              <p className="text-primary-foreground/80 leading-relaxed">
                We value your time and dedication. Use this portal to plan your upcoming time off and check your leave allowance.
              </p>
              <div className="flex gap-4">
                <Link to="/request">
                  <Button variant="secondary" className="font-semibold shadow-sm">
                    Plan New Leave
                  </Button>
                </Link>
                <Link to="/calendar">
                  <Button variant="ghost" className="text-white hover:bg-white/10 decoration-primary-foreground/50 underline-offset-4 hover:underline">
                    View Calendar
                  </Button>
                </Link>
              </div>
            </div>

            <div className="hidden lg:flex items-center justify-center">
              <div className="h-24 w-24 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 p-4 shadow-2xl animate-float">
                <img src="/logo.jpeg" alt="Logo" className="h-full w-full object-contain filter invert brightness-200" />
              </div>
            </div>
          </div>

          {/* Decorative Elements */}
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -left-10 -bottom-10 h-40 w-40 rounded-full bg-primary-foreground/10 blur-2xl" />
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Pending Requests"
            value={pendingCount}
            icon={<Clock className="h-6 w-6" />}
          />
          <StatCard
            title="Approved This Year"
            value={approvedCount}
            icon={<CheckCircle2 className="h-6 w-6" />}
          />
          <StatCard
            title="Days Used"
            value={totalDaysUsed}
            icon={<Calendar className="h-6 w-6" />}
          />
          <StatCard
            title="Next Leave"
            value={nextLeave ? new Date(nextLeave.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '-'}
            subtitle={nextLeaveType?.name || 'No upcoming leave'}
            icon={<TrendingUp className="h-6 w-6" />}
          />
        </div>

        {/* Leave Balances */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4">Leave Balances</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {balances.map((balance) => {
              const leaveType = leaveTypes.find(lt => lt.id === balance.leaveTypeId);
              if (!leaveType) return null;
              return (
                <LeaveBalanceCard
                  key={balance.leaveTypeId}
                  balance={balance}
                  leaveType={leaveType}
                />
              );
            })}
          </div>
        </div>

        {/* Recent Requests */}
        <RecentRequestsTable requests={requests} canCancel />
      </div>
    </DashboardLayout>
  );
}

function ManagerDashboard() {
  const { currentUser } = useAuth();
  const allRequests = useLeaveRequests(); // Fetch all requests to filter by team
  const allUsers = useUsers();

  if (!currentUser || !allRequests || !allUsers) return <div>Loading dashboard...</div>;

  // Filter requests for team members
  const teamMembers = allUsers.filter(u => u.managerId === currentUser.id);
  const teamMemberIds = teamMembers.map(u => u.id);

  const teamRequests = allRequests.filter(r => teamMemberIds.includes(r.userId));
  const pendingRequests = teamRequests.filter(r => r.status === 'PENDING');

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const approvedThisMonth = teamRequests.filter(r => {
    const d = new Date(r.startDate);
    return r.status === 'APPROVED' && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  }).length;

  // Calculate team on leave today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const teamOnLeaveToday = teamRequests.filter(r => {
    if (r.status !== 'APPROVED') return false;
    const start = new Date(r.startDate);
    const end = new Date(r.endDate);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    return today >= start && today <= end;
  }).length;

  return (
    <DashboardLayout
      title="Manager Dashboard"
      subtitle="Review team leave requests and manage approvals"
    >
      <div className="space-y-6">
        {/* Welcome Hero - Manager Version */}
        <div className="relative overflow-hidden rounded-2xl bg-slate-900 px-8 py-10 text-white shadow-lg border-b-4 border-primary/30">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-4 max-w-lg">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/20 px-3 py-1 text-xs font-semibold backdrop-blur-md border border-primary/30">
                <Users className="h-3 w-3 text-primary" />
                <span>Managerial Portal</span>
              </div>
              <h2 className="text-3xl font-bold tracking-tight">Lead with Optimism.</h2>
              <p className="text-white/70 leading-relaxed">
                Empower your team by managing their time-off requests effectively. A rested team is a productive team.
              </p>
              <div className="flex gap-4">
                <Link to="/approvals">
                  <Button className="font-semibold shadow-sm bg-primary hover:bg-primary/90">
                    Review Pending
                  </Button>
                </Link>
                <Link to="/team">
                  <Button variant="ghost" className="text-white hover:bg-white/10 decoration-primary/50 underline-offset-4 hover:underline">
                    Team Overview
                  </Button>
                </Link>
              </div>
            </div>

            <div className="hidden lg:flex items-center justify-center">
              <div className="h-24 w-24 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 p-4 shadow-2xl animate-float">
                <img src="/logo.jpeg" alt="Logo" className="h-full w-full object-contain filter brightness-150" />
              </div>
            </div>
          </div>

          {/* Decorative Elements */}
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/10 blur-3xl opacity-50" />
          <div className="absolute -left-10 -bottom-10 h-40 w-40 rounded-full bg-white/5 blur-2xl" />
        </div>
        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Pending Approvals"
            value={pendingRequests.length}
            icon={<Clock className="h-6 w-6" />}
          />
          <StatCard
            title="Team Members"
            value={teamMembers.length}
            icon={<Users className="h-6 w-6" />}
          />
          <StatCard
            title="Approved This Month"
            value={approvedThisMonth}
            icon={<CheckCircle2 className="h-6 w-6" />}
          />
          <StatCard
            title="Team on Leave Today"
            value={teamOnLeaveToday}
            icon={<Calendar className="h-6 w-6" />}
          />
        </div>

        {/* Main Content */}
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <RecentRequestsTable requests={teamRequests} showUser />
          </div>
          <div className="space-y-6">
            <PendingApprovalsCard requests={teamRequests} />
            <UpcomingLeaveWidget requests={teamRequests} />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

function HRDashboard() {
  const users = useUsers();
  const leaveRequests = useLeaveRequests();
  const leaveTypes = useLeaveTypes();

  if (!users || !leaveRequests || !leaveTypes) return <div>Loading dashboard...</div>;

  const totalEmployees = users.length;
  const pendingRequests = leaveRequests.filter(r => r.status === 'PENDING').length;

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const approvedRequests = leaveRequests.filter(r => {
    const d = new Date(r.startDate);
    return r.status === 'APPROVED' && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  }).length;

  return (
    <DashboardLayout
      title="HR Dashboard"
      subtitle="Company-wide leave management overview"
    >
      <div className="space-y-6">
        {/* Welcome Hero - HR Version */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-900 to-slate-900 px-8 py-10 text-white shadow-lg border-b-4 border-indigo-500/30">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-4 max-w-lg">
              <div className="inline-flex items-center gap-2 rounded-full bg-indigo-500/20 px-3 py-1 text-xs font-semibold backdrop-blur-md border border-indigo-500/30">
                <Shield className="h-3 w-3 text-indigo-400" />
                <span>Administration Hub</span>
              </div>
              <h2 className="text-3xl font-bold tracking-tight">Optimizing Group Performance.</h2>
              <p className="text-indigo-100/70 leading-relaxed">
                Monitor company-wide leave trends and manage employee data for the entire Optimistic Media Group.
              </p>
              <div className="flex gap-4">
                <Link to="/employees">
                  <Button className="font-semibold shadow-sm bg-indigo-600 hover:bg-indigo-700">
                    Manage Staff
                  </Button>
                </Link>
                <Link to="/reports">
                  <Button variant="ghost" className="text-white hover:bg-white/10 decoration-indigo-400/50 underline-offset-4 hover:underline">
                    View Reports
                  </Button>
                </Link>
              </div>
            </div>

            <div className="hidden lg:flex items-center justify-center">
              <div className="h-24 w-24 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 p-4 shadow-2xl animate-float">
                <img src="/logo.jpeg" alt="Logo" className="h-full w-full object-contain filter brightness-150" />
              </div>
            </div>
          </div>

          {/* Decorative Elements */}
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl opacity-50" />
          <div className="absolute -left-10 -bottom-10 h-40 w-40 rounded-full bg-white/5 blur-2xl" />
        </div>
        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Employees"
            value={totalEmployees}
            icon={<Users className="h-6 w-6" />}
          />
          <StatCard
            title="Pending Requests"
            value={pendingRequests}
            icon={<Clock className="h-6 w-6" />}
          />
          <StatCard
            title="Approved This Month"
            value={approvedRequests}
            icon={<CheckCircle2 className="h-6 w-6" />}
          />
          <StatCard
            title="Leave Types"
            value={leaveTypes.length}
            icon={<FileText className="h-6 w-6" />}
          />
        </div>

        {/* Main Content */}
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <RecentRequestsTable requests={leaveRequests} showUser />
          </div>
          <div className="space-y-6">
            <PendingApprovalsCard requests={leaveRequests} />
            <UpcomingLeaveWidget requests={leaveRequests} />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default function Index() {
  const { currentUser, isLoading } = useAuth();

  if (isLoading) {
    return <div>Loading...</div>;
  }


  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }


  switch (currentUser.role) {
    case 'MANAGER':
      return <ManagerDashboard />;
    case 'HR':
      return <HRDashboard />;
    default:
      return <EmployeeDashboard />;
  }
}

