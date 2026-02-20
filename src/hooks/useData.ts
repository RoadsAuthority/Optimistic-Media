
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { User, LeaveRequest, LeaveBalance, AuditLog, LeaveType, UserRole, LeaveStatus, Notification } from '@/types/leave';

// Helper to map profile to User
const mapProfileToUser = (profile: any): User => ({
    id: profile.id,
    name: profile.name,
    email: profile.email,
    role: profile.role as UserRole,

    managerId: profile.manager_id,
    avatar: profile.avatar_url,
    department: profile.department,
    companyId: profile.company_id,
    whatsapp: profile.whatsapp
});

// Helper for safe audit logging (prevents 403 Forbidden from blocking operations)
const safeLogAudit = async (log: any) => {
    try {
        // Ensure performed_by is either a valid UUID or null
        const isValidUUID = (uuid: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid);

        const dbLog = {
            ...log,
            performed_by: isValidUUID(log.performed_by) ? log.performed_by : null,
            timestamp: new Date().toISOString()
        };

        const { error } = await supabase.from('audit_logs').insert(dbLog);
        if (error) {
            console.warn('Audit log skipped due to permissions or schema error:', error.message);
            // Log full error for debugging in console
            console.error('Full Audit Log Error:', error);
        }
    } catch (err) {
        console.error('Audit log failed unexpectedly:', err);
    }
};


export const useUsers = () => {
    return useQuery({
        queryKey: ['users'],
        queryFn: async () => {
            const { data, error } = await supabase.from('profiles').select('*');
            if (error) throw error;
            return data.map(mapProfileToUser);
        }
    }).data;
};

export const useUser = (id?: string) => {
    return useQuery({
        queryKey: ['user', id],
        enabled: !!id,
        queryFn: async () => {
            const { data, error } = await supabase.from('profiles').select('*').eq('id', id!).maybeSingle();
            if (error) throw error;
            return data ? mapProfileToUser(data) : null;
        }
    }).data;
};

export const useLeaveTypes = () => {
    return useQuery({
        queryKey: ['leaveTypes'],
        queryFn: async () => {
            const { data, error } = await supabase.from('leave_types').select('*');
            if (error) throw error;
            return data.map((lt: any) => ({
                id: lt.id,
                name: lt.name,
                color: lt.color,
                annualAllowance: lt.annual_allowance,
                requiresAttachment: lt.requires_attachment
            }));
        }
    }).data;
};

export const useLeaveRequests = (userId?: string) => {
    return useQuery({
        queryKey: ['leaveRequests', userId],
        queryFn: async () => {
            let query = supabase
                .from('leave_requests')
                .select(`
                    *,
                    profiles:user_id (*),
                    leave_types:leave_type_id (*)
                `)
                .order('created_at', { ascending: false });

            if (userId) {
                query = query.eq('user_id', userId);
            }

            const { data, error } = await query;
            if (error) throw error;

            return data.map((r: any) => ({
                id: r.id,
                userId: r.user_id,
                leaveTypeId: r.leave_type_id,
                startDate: r.start_date,
                endDate: r.end_date,
                daysRequested: r.days_requested,
                reason: r.reason,
                status: r.status as LeaveStatus,
                managerComment: r.manager_comment,
                isEmergency: r.is_emergency,
                attachmentUrl: r.attachment_url,
                createdAt: r.created_at,
                updatedAt: r.updated_at,
                user: r.profiles ? mapProfileToUser(r.profiles) : undefined,
                leaveType: r.leave_types ? {
                    id: r.leave_types.id,
                    name: r.leave_types.name,
                    color: r.leave_types.color,
                    annualAllowance: r.leave_types.annual_allowance,
                    requiresAttachment: r.leave_types.requires_attachment
                } : undefined
            }));
        }
    }).data;
};

export const useLeaveBalances = (userId?: string) => {
    return useQuery({
        queryKey: ['leaveBalances', userId],
        enabled: !!userId,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('leave_balances')
                .select('*')
                .eq('user_id', userId!);

            if (error) throw error;

            return data.map((b: any) => ({
                userId: b.user_id,
                leaveTypeId: b.leave_type_id,
                remainingDays: b.remaining_days,
                usedDays: b.used_days,
                totalDays: b.total_days
            }));
        }
    }).data;
};

export const useAuditLogs = () => {
    return useQuery({
        queryKey: ['auditLogs'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('audit_logs')
                .select('*, profiles:performed_by (*)')
                .order('timestamp', { ascending: false });

            if (error) throw error;

            return data.map((l: any) => ({
                id: l.id,
                action: l.action,
                performedBy: l.performed_by,
                targetId: l.target_id,
                details: l.details,
                timestamp: l.timestamp,
                performedByUser: l.profiles ? mapProfileToUser(l.profiles) : undefined
            }));
        }
    }).data;
};

export const useNotifications = (userId?: string) => {
    return useQuery({
        queryKey: ['notifications', userId],
        enabled: !!userId,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', userId!)
                .order('created_at', { ascending: false });

            if (error) throw error;

            return data.map((n: any) => ({
                id: n.id,
                userId: n.user_id,
                title: n.title,
                message: n.message,
                type: n.type,
                isRead: n.is_read,
                createdAt: n.created_at
            }));
        }
    }).data;
};


import { queryClient } from '@/lib/queryClient';

// Helper for safe notification creation
const safeCreateNotification = async (notification: Omit<Notification, 'id' | 'isRead' | 'createdAt'>) => {
    try {
        const { error } = await supabase.from('notifications').insert({
            user_id: notification.userId,
            title: notification.title,
            message: notification.message,
            type: notification.type || 'info'
        });
        if (error) {
            console.warn('Failed to create notification:', error.message);
        }
    } catch (err) {
        console.error('Notification creation failed unexpectedly:', err);
    }
};

// Actions
export const createLeaveRequest = async (request: Omit<LeaveRequest, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'daysRequested'>, daysRequested: number) => {
    // 0. Check for existing PENDING requests
    const { data: existingPending, error: checkError } = await supabase
        .from('leave_requests')
        .select('id')
        .eq('user_id', request.userId)
        .eq('status', 'PENDING');

    if (checkError) throw checkError;
    if (existingPending && existingPending.length > 0) {
        throw new Error('You already have a pending leave request. Please wait for it to be processed or cancel it before submitting a new one.');
    }

    // 1. Insert Request
    const { data, error } = await supabase.from('leave_requests').insert({
        user_id: request.userId,
        leave_type_id: request.leaveTypeId,
        start_date: request.startDate,
        end_date: request.endDate,
        days_requested: daysRequested,
        reason: request.reason,
        is_emergency: request.isEmergency || false,
        attachment_url: request.attachmentUrl || null,
        status: 'PENDING'
    }).select().single();

    if (error) throw error;

    // 2. Audit Log
    await safeLogAudit({
        action: 'LEAVE_REQUEST_CREATED',
        performed_by: request.userId,
        target_id: data.id,
        details: 'Created leave request'
    });

    // 3. Notify relevant users (e.g., manager if exists)
    const { data: userData } = await supabase.from('profiles').select('manager_id').eq('id', request.userId).single();
    if (userData?.manager_id) {
        await safeCreateNotification({
            userId: userData.manager_id,
            title: 'New Leave Request',
            message: `A new leave request has been submitted and is awaiting your approval.`,
            type: 'info'
        });
    }

    // Invalidate queries
    queryClient.invalidateQueries({ queryKey: ['leaveRequests'] });
    queryClient.invalidateQueries({ queryKey: ['auditLogs'] });
    queryClient.invalidateQueries({ queryKey: ['notifications'] });

    return data.id;
};

export const updateLeaveRequestStatus = async (id: string, status: LeaveStatus, managerId: string, rejectionReason?: string) => {
    const { data: request, error: fetchError } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('id', id)
        .single();

    if (fetchError) throw fetchError;

    const { error } = await supabase
        .from('leave_requests')
        .update({
            status,
            manager_id: managerId,
            rejection_reason: rejectionReason || null,
            updated_at: new Date().toISOString()
        })
        .eq('id', id);

    if (error) throw error;

    // 2. If Approved, Update Balance
    if (status === 'APPROVED' && request) {
        // Decrement remaining_days, increment used_days
        const { data: balance } = await supabase.from('leave_balances')
            .select('*')
            .eq('user_id', request.user_id)
            .eq('leave_type_id', request.leave_type_id)
            .maybeSingle();

        if (balance) {
            // Standard update
            const newUsed = Number(balance.used_days || 0) + Number(request.days_requested);
            const newRemaining = Number(balance.remaining_days || 0) - Number(request.days_requested);

            await supabase.from('leave_balances').update({
                used_days: newUsed,
                remaining_days: newRemaining
            }).eq('id', balance.id);
        } else {
            // Fallback: If balance record doesn't exist, create it from leave type allowance
            const { data: leaveType } = await supabase.from('leave_types')
                .select('annual_allowance')
                .eq('id', request.leave_type_id)
                .single();

            if (leaveType) {
                await supabase.from('leave_balances').insert({
                    user_id: request.user_id,
                    leave_type_id: request.leave_type_id,
                    total_days: leaveType.annual_allowance,
                    used_days: request.days_requested,
                    remaining_days: leaveType.annual_allowance - request.days_requested
                });
            }
        }
    }

    // 3. Audit Log
    await safeLogAudit({
        action: `LEAVE_REQUEST_${status}`,
        performed_by: managerId,
        target_id: id,
        details: `${status} leave request`
    });

    // 4. Notify User
    if (request) {
        await safeCreateNotification({
            userId: request.user_id,
            title: `Leave Request ${status.charAt(0) + status.slice(1).toLowerCase()}`,
            message: `Your leave request from ${request.start_date} to ${request.end_date} has been ${status.toLowerCase()}.`,
            type: status === 'APPROVED' ? 'success' : (status === 'REJECTED' ? 'error' : 'info')
        });
    }


    // Invalidate queries
    queryClient.invalidateQueries({ queryKey: ['leaveRequests'] });
    queryClient.invalidateQueries({ queryKey: ['leaveBalances'] });
    queryClient.invalidateQueries({ queryKey: ['auditLogs'] });
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
};

export const cancelLeaveRequest = async (id: string, userId: string) => {
    // 1. Fetch request details
    const { data: request, error: fetchError } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('id', id)
        .single();

    if (fetchError) throw fetchError;

    // 2. If Approved, Reverse Balance
    if (request.status === 'APPROVED') {
        const { data: balance } = await supabase.from('leave_balances')
            .select('*')
            .eq('user_id', request.user_id)
            .eq('leave_type_id', request.leave_type_id)
            .maybeSingle();

        if (balance) {
            await supabase.from('leave_balances').update({
                used_days: Math.max(0, balance.used_days - request.days_requested),
                remaining_days: balance.remaining_days + request.days_requested
            }).eq('id', balance.id);
        }
    }

    // 3. Update Status to CANCELLED
    const { error } = await supabase
        .from('leave_requests')
        .update({ status: 'CANCELLED', updated_at: new Date().toISOString() })
        .eq('id', id);

    if (error) throw error;

    // 4. Audit Log
    await safeLogAudit({
        action: 'LEAVE_REQUEST_CANCELLED',
        performed_by: userId,
        target_id: id,
        details: `Cancelled ${request.status} leave request`
    });

    // Invalidate queries
    queryClient.invalidateQueries({ queryKey: ['leaveRequests'] });
    queryClient.invalidateQueries({ queryKey: ['leaveBalances'] });
    queryClient.invalidateQueries({ queryKey: ['auditLogs'] });
};

export const deleteLeaveRequest = async (id: string, userId: string) => {
    // Keep for downward compatibility if needed, but redirects to cancel
    return cancelLeaveRequest(id, userId);
};

export const createLeaveType = async (leaveType: Omit<LeaveType, 'id'>) => {
    const { data, error } = await supabase.from('leave_types').insert({
        name: leaveType.name,
        color: leaveType.color,
        annual_allowance: leaveType.annualAllowance,
        requires_attachment: leaveType.requiresAttachment
    }).select().single();

    if (error) throw error;

    queryClient.invalidateQueries({ queryKey: ['leaveTypes'] });
    return data;
};

export const updateLeaveType = async (id: string, leaveType: Partial<LeaveType>) => {
    const updates: any = {};
    if (leaveType.name) updates.name = leaveType.name;
    if (leaveType.color) updates.color = leaveType.color;
    if (leaveType.annualAllowance !== undefined) updates.annual_allowance = leaveType.annualAllowance;
    if (leaveType.requiresAttachment !== undefined) updates.requires_attachment = leaveType.requiresAttachment;

    const { error } = await supabase.from('leave_types').update(updates).eq('id', id);

    if (error) throw error;


    queryClient.invalidateQueries({ queryKey: ['leaveTypes'] });
};

export const updateProfile = async (id: string, updates: Partial<User>, performedBy?: string) => {
    // Map camelCase to snake_case
    const dbUpdates: any = {};
    if (updates.name) dbUpdates.name = updates.name;
    if (updates.role) dbUpdates.role = updates.role;
    if (updates.department) dbUpdates.department = updates.department;
    if (updates.whatsapp) dbUpdates.whatsapp = updates.whatsapp;
    if (updates.managerId !== undefined) dbUpdates.manager_id = updates.managerId || null;

    const { error } = await supabase.from('profiles').update(dbUpdates).eq('id', id);

    if (error) throw error;

    // Audit Log
    await safeLogAudit({
        action: 'PROFILE_UPDATED',
        performed_by: performedBy || id,
        target_id: id,
        details: `Updated profile fields: ${Object.keys(updates).join(', ')}`
    });

    queryClient.invalidateQueries({ queryKey: ['users'] });
    queryClient.invalidateQueries({ queryKey: ['user', id] });
};


export const createInvitation = async (email: string, role: string, department: string, performedBy?: string, whatsapp?: string, managerId?: string) => {
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15);
    const token = crypto.randomUUID(); // Manually generate token to ensure it exists

    const { data, error } = await supabase.from('invitations').insert({
        email,
        role,
        department,
        token,
        manager_id: managerId || null,
        expires_at: expiresAt.toISOString()
    }).select().single();

    if (error) throw error;

    // Audit Log
    await safeLogAudit({
        action: 'INVITATION_GENERATED',
        performed_by: performedBy || 'SYSTEM',
        target_id: data.id,
        details: `Generated invitation for ${email} as ${role}`
    });

    return data;
};

export const createProfile = async (profile: Omit<User, 'id'>, performedBy?: string) => {
    // Generate a random ID since we aren't using Supabase Auth for these manual entries
    const id = crypto.randomUUID();

    const { data, error } = await supabase.from('profiles').insert({
        id,
        name: profile.name,
        email: profile.email || `${id.split('-')[0]}@no-email.optimisticmedia.group`, // Fallback for email-less users
        role: profile.role,
        department: profile.department,
        whatsapp: profile.whatsapp,
        manager_id: profile.managerId || null
    }).select().single();

    if (error) throw error;

    // Initialize leave balances for new user
    const { data: leaveTypes } = await supabase.from('leave_types').select('*');
    if (leaveTypes) {
        const balances = leaveTypes.map(lt => ({
            user_id: id,
            leave_type_id: lt.id,
            total_days: lt.annual_allowance,
            remaining_days: lt.annual_allowance,
            used_days: 0
        }));
        await supabase.from('leave_balances').insert(balances);
    }

    // Audit Log
    await safeLogAudit({
        action: 'PROFILE_CREATED_MANUALLY',
        performed_by: performedBy || 'SYSTEM',
        target_id: id,
        details: `Created profile for ${profile.name}`
    });

    queryClient.invalidateQueries({ queryKey: ['users'] });
    return data;
};

export const markNotificationAsRead = async (id: string, userId: string) => {
    const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id)
        .eq('user_id', userId);

    if (error) throw error;
    queryClient.invalidateQueries({ queryKey: ['notifications', userId] });
};

export const markAllNotificationsAsRead = async (userId: string) => {
    const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false);

    if (error) throw error;
    queryClient.invalidateQueries({ queryKey: ['notifications', userId] });
};




