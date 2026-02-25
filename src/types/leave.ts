
export type UserRole = 'EMPLOYEE' | 'MANAGER' | 'HR' | 'ADMIN';


export type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  managerId?: string;
  avatar?: string;

  department?: string;
  companyId?: string;
  whatsapp?: string;
}


export interface LeaveType {
  id: string;
  name: string;
  annualAllowance: number;
  requiresAttachment: boolean;
  color: string;
}

export interface LeaveBalance {
  userId: string;
  leaveTypeId: string;
  remainingDays: number;
  usedDays: number;
  totalDays: number;
}


export interface LeaveRequest {
  id: string;
  userId: string;
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  daysRequested: number; // Added field
  filedBy?: string; // Target of joined field
  reason: string;
  status: LeaveStatus;
  managerComment?: string;
  isEmergency?: boolean;
  attachmentUrl?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;

  // Enriched fields (optional as they are joined at runtime)
  user?: User;
  leaveType?: LeaveType;
}


export interface AuditLog {
  id: string;
  action: string;
  performedBy: string;
  performedByUser?: User;
  targetId?: string;
  details?: string;
  timestamp: string;
}

export interface TeamMember extends User {
  leaveBalance: LeaveBalance[];
}

export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  createdAt: string;
}
