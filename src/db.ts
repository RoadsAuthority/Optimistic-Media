
import Dexie, { type EntityTable } from 'dexie';
import { User, LeaveType, LeaveBalance, LeaveRequest, AuditLog } from './types/leave';

const db = new Dexie('OptimisticMediaDB') as Dexie & {
  users: EntityTable<User, 'id'>,
  leaveTypes: EntityTable<LeaveType, 'id'>,
  leaveBalances: EntityTable<LeaveBalance, 'userId'>, // Using userId as part of compound key for indexing
  leaveRequests: EntityTable<LeaveRequest, 'id'>,
  auditLogs: EntityTable<AuditLog, 'id'>
};

// Schema declaration:
db.version(1).stores({
  users: '&id, email, managerId, role', // Primary key and indexed props
  leaveTypes: '&id, name',
  leaveBalances: '[userId+leaveTypeId], userId, leaveTypeId', // Compound primary key
  leaveRequests: '&id, userId, leaveTypeId, status, startDate',
  auditLogs: '&id, performBy, targetId, action, timestamp'
});

export type { User, LeaveType, LeaveBalance, LeaveRequest, AuditLog };
export { db };
