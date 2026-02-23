
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
        refetchOnWindowFocus: true,
        refetchInterval: 30000, // Refetch every 30 seconds to catch new notifications
        staleTime: 0, // Always consider data stale so it refetches on invalidation
        queryFn: async () => {
            console.log('Fetching notifications for user:', userId);
            const { data, error } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', userId!)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching notifications:', error);
                throw error;
            }

            console.log('Notifications fetched:', data?.length || 0, 'notifications');
            return data.map((n: any) => ({
                id: n.id,
                userId: n.user_id,
                title: n.title,
                message: n.message,
                type: n.type,
                isRead: n.is_read,
                createdAt: n.created_at
            }));
        },
        onError: (error) => {
            console.error('useNotifications query error:', error);
        }
    }).data;
};


import { queryClient } from '@/lib/queryClient';

// Helper for safe notification creation
const safeCreateNotification = async (notification: Omit<Notification, 'id' | 'isRead' | 'createdAt'>) => {
    try {
        console.log('Creating notification for user:', notification.userId, notification.title);
        const { data, error } = await supabase.from('notifications').insert({
            user_id: notification.userId,
            title: notification.title,
            message: notification.message,
            type: notification.type || 'info'
        }).select();
        
        if (error) {
            console.error('Failed to create notification:', error.message, error);
            return false;
        }
        
        console.log('Notification created successfully:', data);
        
        // Invalidate notifications query for the user who received the notification
        // Use refetchType: 'active' to immediately refetch active queries
        await queryClient.invalidateQueries({ 
            queryKey: ['notifications', notification.userId],
            refetchType: 'active' 
        });
        
        // Also invalidate all notification queries as a fallback
        queryClient.invalidateQueries({ 
            queryKey: ['notifications'],
            refetchType: 'active'
        });
        
        return true;
    } catch (err) {
        console.error('Notification creation failed unexpectedly:', err);
        return false;
    }
};

// Actions
export const createLeaveRequest = async (request: Omit<LeaveRequest, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'daysRequested'>, daysRequested: number, filedBy?: string) => {
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
        status: 'PENDING',
        // Track who filed this request — used to enforce conflict-of-interest rule
        // (the admin who filed cannot also approve it)
        filed_by: filedBy || null,
    }).select().single();

    if (error) throw error;

    // 2. Audit Log
    await safeLogAudit({
        action: 'LEAVE_REQUEST_CREATED',
        performed_by: request.userId,
        target_id: data.id,
        details: 'Created leave request'
    });

    // 3. Notify relevant users
    const { data: userData } = await supabase.from('profiles').select('manager_id, role').eq('id', request.userId).single();
    
    // If the requester is an admin, notify all other admins
    if (userData?.role === 'ADMIN' || userData?.role === 'HR') {
        const { data: admins } = await supabase
            .from('profiles')
            .select('id')
            .in('role', ['ADMIN', 'HR'])
            .neq('id', request.userId);
        
        if (admins && admins.length > 0) {
            for (const admin of admins) {
                await safeCreateNotification({
                    userId: admin.id,
                    title: 'New Admin Leave Request',
                    message: `An admin leave request has been submitted and requires your approval.`,
                    type: 'info'
                });
            }
        }
    } else if (userData?.manager_id) {
        // For non-admin users, notify their manager
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

    // Build the update payload — only include optional columns if they are likely to exist
    const updatePayload: Record<string, any> = { status };
    if (managerId) updatePayload.manager_id = managerId;
    if (rejectionReason !== undefined) updatePayload.rejection_reason = rejectionReason ?? null;
    updatePayload.updated_at = new Date().toISOString();

    let { error } = await supabase
        .from('leave_requests')
        .update(updatePayload)
        .eq('id', id);

    // If the full update fails (e.g. schema columns don't exist yet), fall back to status-only
    if (error) {
        console.warn('Full update failed, trying status-only update:', error.message);
        const fallback = await supabase
            .from('leave_requests')
            .update({ status })
            .eq('id', id);
        if (fallback.error) throw fallback.error;
    }

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

    // Security check: Users can only cancel their own requests
    if (request.user_id !== userId) {
        throw new Error('You can only cancel your own leave requests');
    }

    // Can only cancel PENDING or APPROVED requests
    if (request.status !== 'PENDING' && request.status !== 'APPROVED') {
        throw new Error(`Cannot cancel a ${request.status.toLowerCase()} request`);
    }

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
        .eq('id', id)
        .eq('user_id', userId); // Additional security: ensure we only update user's own requests

    if (error) throw error;

    // 4. Notify manager/admin if request was pending or approved
    if (request.status === 'PENDING' || request.status === 'APPROVED') {
        // Get user's manager or admins who might need to know
        const { data: userData } = await supabase.from('profiles').select('manager_id, role').eq('id', userId).single();
        
        if (userData?.manager_id) {
            await safeCreateNotification({
                userId: userData.manager_id,
                title: 'Leave Request Cancelled',
                message: `A leave request has been cancelled by the employee.`,
                type: 'info'
            });
        }
    }

    // 5. Audit Log
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
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
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
    try {
        console.log('Creating invitation for:', { email, role, department, managerId });

        // 0. Prevent duplicates against existing users
        if (email) {
            const { data: existingProfileByEmail, error: profileEmailError } = await supabase
                .from('profiles')
                .select('id')
                .eq('email', email)
                .maybeSingle();
            if (profileEmailError) {
                console.error('Error checking existing profile by email:', profileEmailError);
            }
            if (existingProfileByEmail) {
                throw new Error('This email is already registered to a user.');
            }
        }

        if (whatsapp) {
            const { data: existingProfileByWhatsapp, error: profileWhatsappError } = await supabase
                .from('profiles')
                .select('id')
                .eq('whatsapp', whatsapp)
                .maybeSingle();
            if (profileWhatsappError) {
                console.error('Error checking existing profile by whatsapp:', profileWhatsappError);
            }
            if (existingProfileByWhatsapp) {
                throw new Error('This WhatsApp number is already registered to a user.');
            }
        }

        // 1. Prevent duplicate active invitations
        if (email) {
            const { data: existingInviteByEmail, error: inviteEmailError } = await supabase
                .from('invitations')
                .select('id, used_at')
                .eq('email', email)
                .is('used_at', null)
                .maybeSingle();
            if (inviteEmailError) {
                console.error('Error checking existing invitation by email:', inviteEmailError);
            }
            if (existingInviteByEmail) {
                throw new Error('An active invitation already exists for this email.');
            }
        }

        if (whatsapp) {
            const { data: existingInviteByWhatsapp, error: inviteWhatsappError } = await supabase
                .from('invitations')
                .select('id, used_at')
                .eq('whatsapp', whatsapp)
                .is('used_at', null)
                .maybeSingle();
            if (inviteWhatsappError) {
                console.error('Error checking existing invitation by whatsapp:', inviteWhatsappError);
            }
            if (existingInviteByWhatsapp) {
                throw new Error('An active invitation already exists for this WhatsApp number.');
            }
        }

        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + 15);
        // Use our safe UUID generator to avoid crypto.randomUUID() issues
        const token = generateUUID();

        console.log('Generated token:', token);

        const { data, error } = await supabase.from('invitations').insert({
            email,
            role,
            department,
            token,
            manager_id: managerId || null,
            whatsapp: whatsapp || null,
            expires_at: expiresAt.toISOString()
        }).select().single();

        if (error) {
            console.error('Error creating invitation:', error);
            throw new Error(`Failed to create invitation: ${error.message}`);
        }

        if (!data) {
            throw new Error('Invitation created but no data returned');
        }

        if (!data.token) {
            console.error('Invitation data missing token:', data);
            throw new Error('Invitation created but token is missing');
        }

        console.log('Invitation created successfully:', { id: data.id, token: data.token });

        // Audit Log (don't let this fail the invitation creation)
        try {
            await safeLogAudit({
                action: 'INVITATION_GENERATED',
                performed_by: performedBy || 'SYSTEM',
                target_id: data.id,
                details: `Generated invitation for ${email} as ${role}`
            });
        } catch (auditError) {
            console.warn('Failed to log audit for invitation:', auditError);
            // Don't throw - invitation was created successfully
        }

        return data;
    } catch (error: any) {
        console.error('createInvitation error:', error);
        throw error;
    }
};

/** Send an invitation email via SMTP (Supabase Edge Function). */
export const sendEmailInvitation = async (
    to: string,
    subject: string,
    text: string,
    html?: string
): Promise<{ ok?: boolean; error?: string }> => {
    const { data, error } = await supabase.functions.invoke('send-email', {
        body: { to, subject, text, html },
    });

    if (error) {
        console.error('sendEmailInvitation error:', error);
        return { error: error.message };
    }

    const payload = data as { ok?: boolean; error?: string } | null;
    if (payload?.error) {
        console.error('send-email function error:', payload.error);
        return { error: payload.error };
    }

    return { ok: true };
};

// UUID v4 generator that works in both secure (HTTPS) and non-secure (HTTP) contexts
const generateUUID = (): string => {
    try {
        if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
            return crypto.randomUUID();
        }
    } catch (_) { /* fall through */ }

    // Polyfill for non-secure (HTTP) contexts where crypto.randomUUID is unavailable
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

export const createProfile = async (profile: Omit<User, 'id'>, performedBy?: string) => {
    try {
        const id = generateUUID();

        const rawEmail = profile.email?.trim();
        const email = rawEmail
            ? rawEmail
            : `${id.split('-')[0]}@invite.optimisticmedia.group`;

        // Prevent creating a second profile with the same email/whatsapp
        if (rawEmail) {
            const { data: existingByEmail, error: emailCheckError } = await supabase
                .from('profiles')
                .select('id, role')
                .eq('email', email)
                .maybeSingle();
            if (emailCheckError) {
                console.error('Error checking existing profile by email:', emailCheckError);
            }
            if (existingByEmail) {
                throw new Error('A user with this email already exists.');
            }
        }

        if (profile.whatsapp) {
            const { data: existingByWhatsapp, error: whatsappCheckError } = await supabase
                .from('profiles')
                .select('id, role')
                .eq('whatsapp', profile.whatsapp)
                .maybeSingle();
            if (whatsappCheckError) {
                console.error('Error checking existing profile by whatsapp:', whatsappCheckError);
            }
            if (existingByWhatsapp) {
                throw new Error('A user with this WhatsApp number already exists.');
            }
        }

        console.log('Creating profile via RPC:', { id, name: profile.name, email, role: profile.role });

        // Use a SECURITY DEFINER RPC function to bypass RLS.
        // Allows admins to insert profiles without matching auth.uid().
        const { data, error } = await supabase.rpc('create_employee_profile', {
            p_id: id,
            p_name: profile.name,
            p_email: email,
            p_role: profile.role,
            p_department: profile.department,
            p_whatsapp: profile.whatsapp || null,
            p_manager_id: profile.managerId || null,
        });

        if (error) {
            console.error('RPC error in createProfile:', error);
            throw new Error(`Failed to create employee: ${error.message}`);
        }

        const newUser = data as any;
        const newUserId = newUser?.id ?? id;

        // Initialize leave balances
        const { data: leaveTypes } = await supabase.from('leave_types').select('*');
        if (leaveTypes && leaveTypes.length > 0) {
            const balances = leaveTypes.map(lt => ({
                user_id: newUserId,
                leave_type_id: lt.id,
                total_days: lt.annual_allowance,
                remaining_days: lt.annual_allowance,
                used_days: 0,
            }));
            const { error: balanceError } = await supabase.from('leave_balances').insert(balances);
            if (balanceError) {
                console.warn('Failed to initialize leave balances:', balanceError.message);
            }
        }

        // Audit Log
        await safeLogAudit({
            action: 'PROFILE_CREATED_MANUALLY',
            performed_by: performedBy || 'SYSTEM',
            target_id: newUserId,
            details: `Created profile for ${profile.name}`,
        });

        queryClient.invalidateQueries({ queryKey: ['users'] });
        return newUser;
    } catch (error: any) {
        console.error('Unexpected error in createProfile:', error);
        throw error;
    }
};

export const markNotificationAsRead = async (id: string, userId: string) => {
    const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id)
        .eq('user_id', userId);

    if (error) {
        console.error('Error marking notification as read:', error);
        throw error;
    }
    
    // Invalidate and refetch immediately
    await queryClient.invalidateQueries({ 
        queryKey: ['notifications', userId],
        refetchType: 'active'
    });
};

export const markAllNotificationsAsRead = async (userId: string) => {
    const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false);

    if (error) {
        console.error('Error marking all notifications as read:', error);
        throw error;
    }
    
    // Invalidate and refetch immediately
    await queryClient.invalidateQueries({ 
        queryKey: ['notifications', userId],
        refetchType: 'active'
    });
};

/** Send SMS or WhatsApp via Twilio (Supabase Edge Function). Requires Twilio secrets set in Supabase. */
export const sendTwilioMessage = async (
    to: string,
    body: string,
    channel: 'sms' | 'whatsapp' = 'sms'
): Promise<{ sid?: string; error?: string }> => {
    const { data, error } = await supabase.functions.invoke('send-twilio-message', {
        body: { to, body, channel },
    });

    if (error) {
        console.error('Twilio invoke error:', error);
        // 401 usually means expired/invalid session; clear it so user can log in again
        if (error.message?.includes('401') || (error as any)?.context?.status === 401) {
            await supabase.auth.signOut();
        }
        return { error: error.message };
    }

    const payload = data as { sid?: string; error?: string; code?: number } | null;
    if (payload?.error) {
        console.error('Twilio function error:', payload.error);
        return { error: payload.error };
    }

    return { sid: payload?.sid };
};

/** Request a verification code sent to the phone via Twilio (Edge Function: stores code, sends via Content template). */
export const requestVerificationCode = async (to: string): Promise<{ ok?: boolean; error?: string }> => {
    const { data, error } = await supabase.functions.invoke('request-verification-code', { body: { to } });

    if (error) {
        console.error('requestVerificationCode error:', error);
        return { error: error.message };
    }

    const payload = data as { ok?: boolean; error?: string } | null;
    if (payload?.error) return { error: payload.error };
    return { ok: true };
};

/** Verify a phone + code (Edge Function). Returns { valid: boolean }. */
export const verifyPhoneCode = async (phone: string, code: string): Promise<{ valid: boolean; error?: string }> => {
    const { data, error } = await supabase.functions.invoke('verify-code', { body: { phone, code } });

    if (error) {
        console.error('verifyPhoneCode error:', error);
        return { valid: false, error: error.message };
    }

    const payload = data as { valid?: boolean; error?: string } | null;
    if (payload?.error) return { valid: false, error: payload.error };
    return { valid: payload?.valid === true };
};

/** Send verification code via Twilio Content template (e.g. WhatsApp). Uses your template contentSid and passes code as variable "1". */
export const sendTwilioVerificationCode = async (
    to: string,
    code: string,
    options: {
        channel?: 'sms' | 'whatsapp';
        contentSid?: string;
        contentVariableKey?: string;
        from?: string;
    } = {}
): Promise<{ sid?: string; error?: string }> => {
    const {
        channel = 'whatsapp',
        contentSid = 'HX229f5a04fd0510ce1b071852155d3e75',
        contentVariableKey = '1',
        from,
    } = options;

    const contentVariables = JSON.stringify({ [contentVariableKey]: code });

    const { data, error } = await supabase.functions.invoke('send-twilio-message', {
        body: { to, channel, contentSid, contentVariables, from },
    });

    if (error) {
        console.error('Twilio verification invoke error:', error);
        return { error: error.message };
    }

    const payload = data as { sid?: string; error?: string } | null;
    if (payload?.error) {
        console.error('Twilio verification function error:', payload.error);
        return { error: payload.error };
    }

    return { sid: payload?.sid };
};
