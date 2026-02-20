import { User, LeaveType, LeaveBalance, LeaveRequest, AuditLog } from '@/types/leave';

export const users: User[] = [
  {
    id: '1',
    name: 'John Smith',
    email: 'john.smith@company.com',
    role: 'EMPLOYEE',
    managerId: '2',
    department: 'Engineering',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=John',
  },
  {
    id: '2',
    name: 'Sarah Johnson',
    email: 'sarah.johnson@company.com',
    role: 'MANAGER',
    department: 'Engineering',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah',
  },
  {
    id: '3',
    name: 'Mike Chen',
    email: 'mike.chen@company.com',
    role: 'EMPLOYEE',
    managerId: '2',
    department: 'Engineering',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mike',
  },
  {
    id: '4',
    name: 'Emily Davis',
    email: 'emily.davis@company.com',
    role: 'HR',
    department: 'Human Resources',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Emily',
  },
  {
    id: '5',
    name: 'Alex Turner',
    email: 'alex.turner@company.com',
    role: 'EMPLOYEE',
    managerId: '2',
    department: 'Engineering',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex',
  },
];

export const leaveTypes: LeaveType[] = [
  {
    id: '1',
    name: 'Annual Leave',
    annualAllowance: 20,
    requiresAttachment: false,
    color: 'hsl(221, 83%, 53%)',
  },
  {
    id: '2',
    name: 'Sick Leave',
    annualAllowance: 10,
    requiresAttachment: true,
    color: 'hsl(0, 84%, 60%)',
  },
  {
    id: '3',
    name: 'Study Leave',
    annualAllowance: 5,
    requiresAttachment: true,
    color: 'hsl(262, 83%, 58%)',
  },
  {
    id: '4',
    name: 'Parental Leave',
    annualAllowance: 15,
    requiresAttachment: true,
    color: 'hsl(142, 76%, 36%)',
  },
  {
    id: '5',
    name: 'Emergency Leave',
    annualAllowance: 3,
    requiresAttachment: false,
    color: 'hsl(38, 92%, 50%)',
  },
];

export const leaveBalances: LeaveBalance[] = [
  { userId: '1', leaveTypeId: '1', remainingDays: 15, usedDays: 5, totalDays: 20 },
  { userId: '1', leaveTypeId: '2', remainingDays: 8, usedDays: 2, totalDays: 10 },
  { userId: '1', leaveTypeId: '3', remainingDays: 5, usedDays: 0, totalDays: 5 },
  { userId: '1', leaveTypeId: '4', remainingDays: 15, usedDays: 0, totalDays: 15 },
  { userId: '1', leaveTypeId: '5', remainingDays: 3, usedDays: 0, totalDays: 3 },
  { userId: '3', leaveTypeId: '1', remainingDays: 12, usedDays: 8, totalDays: 20 },
  { userId: '3', leaveTypeId: '2', remainingDays: 6, usedDays: 4, totalDays: 10 },
  { userId: '5', leaveTypeId: '1', remainingDays: 18, usedDays: 2, totalDays: 20 },
  { userId: '5', leaveTypeId: '2', remainingDays: 10, usedDays: 0, totalDays: 10 },
];

export const leaveRequests: LeaveRequest[] = [
  {
    id: '1',
    userId: '1',
    leaveTypeId: '1',
    startDate: '2026-02-10',
    endDate: '2026-02-14',
    daysRequested: 5,
    status: 'PENDING',
    reason: 'Family vacation to visit relatives',
    createdAt: '2026-02-01T09:00:00Z',
    updatedAt: '2026-02-01T09:00:00Z',
  },
  {
    id: '2',
    userId: '3',
    leaveTypeId: '2',
    startDate: '2026-02-05',
    endDate: '2026-02-06',
    daysRequested: 2,
    status: 'APPROVED',
    reason: 'Medical appointment',
    managerComment: 'Approved. Get well soon!',
    createdAt: '2026-02-03T10:30:00Z',
    updatedAt: '2026-02-03T14:00:00Z',
  },
  {
    id: '3',
    userId: '5',
    leaveTypeId: '1',
    startDate: '2026-02-20',
    endDate: '2026-02-21',
    daysRequested: 2,
    status: 'PENDING',
    reason: 'Personal matters',
    createdAt: '2026-02-04T08:15:00Z',
    updatedAt: '2026-02-04T08:15:00Z',
  },
  {
    id: '4',
    userId: '1',
    leaveTypeId: '2',
    startDate: '2026-01-15',
    endDate: '2026-01-16',
    daysRequested: 2,
    status: 'APPROVED',
    reason: 'Flu symptoms',
    managerComment: 'Approved',
    createdAt: '2026-01-14T07:00:00Z',
    updatedAt: '2026-01-14T09:00:00Z',
  },
  {
    id: '5',
    userId: '3',
    leaveTypeId: '1',
    startDate: '2026-01-20',
    endDate: '2026-01-24',
    daysRequested: 5,
    status: 'REJECTED',
    reason: 'Extended weekend trip',
    managerComment: 'Team deadline conflicts. Please reschedule.',
    createdAt: '2026-01-10T11:00:00Z',
    updatedAt: '2026-01-11T10:00:00Z',
  },
];

export const auditLogs: AuditLog[] = [
  {
    id: '1',
    action: 'LEAVE_REQUEST_CREATED',
    performedBy: '1',
    targetId: '1',
    details: 'Created leave request for Annual Leave (5 days)',
    timestamp: '2026-02-01T09:00:00Z',
  },
  {
    id: '2',
    action: 'LEAVE_REQUEST_APPROVED',
    performedBy: '2',
    targetId: '2',
    details: 'Approved Sick Leave request for Mike Chen',
    timestamp: '2026-02-03T14:00:00Z',
  },
  {
    id: '3',
    action: 'LEAVE_REQUEST_REJECTED',
    performedBy: '2',
    targetId: '5',
    details: 'Rejected Annual Leave request for Mike Chen',
    timestamp: '2026-01-11T10:00:00Z',
  },
  {
    id: '4',
    action: 'LEAVE_BALANCE_ADJUSTED',
    performedBy: '4',
    targetId: '1',
    details: 'Adjusted Annual Leave balance for John Smith (+2 days)',
    timestamp: '2026-01-05T15:00:00Z',
  },
];

// Helper functions
export const getUserById = (id: string): User | undefined => users.find(u => u.id === id);

export const getLeaveTypeById = (id: string): LeaveType | undefined => leaveTypes.find(lt => lt.id === id);

export const getLeaveBalanceForUser = (userId: string): LeaveBalance[] => 
  leaveBalances.filter(lb => lb.userId === userId);

export const getLeaveRequestsForUser = (userId: string): LeaveRequest[] =>
  leaveRequests.filter(lr => lr.userId === userId);

export const getPendingRequestsForManager = (managerId: string): LeaveRequest[] => {
  const teamMembers = users.filter(u => u.managerId === managerId);
  const teamMemberIds = teamMembers.map(tm => tm.id);
  return leaveRequests.filter(lr => teamMemberIds.includes(lr.userId) && lr.status === 'PENDING');
};

export const getTeamMembers = (managerId: string): User[] =>
  users.filter(u => u.managerId === managerId);

export const enrichLeaveRequest = (request: LeaveRequest): LeaveRequest => ({
  ...request,
  user: getUserById(request.userId),
  leaveType: getLeaveTypeById(request.leaveTypeId),
});

export const enrichAuditLog = (log: AuditLog): AuditLog => ({
  ...log,
  performedByUser: getUserById(log.performedBy),
});
