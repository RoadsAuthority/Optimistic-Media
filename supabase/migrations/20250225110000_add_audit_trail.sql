-- Create audit logs table for security and system events
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    performed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    target_id UUID,
    details TEXT,
    timestamp TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see their own logs
CREATE POLICY "Users can view own logs" ON public.audit_logs
    FOR SELECT USING (auth.uid() = performed_by);

-- Policy: Admins can see all logs
CREATE POLICY "Admins can view all logs" ON public.audit_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'ADMIN'
        )
    );

-- Policy: Authenticated users can insert logs (for their own events)
CREATE POLICY "Users can insert own logs" ON public.audit_logs
    FOR INSERT WITH CHECK (auth.uid() = performed_by OR performed_by IS NULL);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_performed_by ON public.audit_logs(performed_by);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON public.audit_logs(timestamp);
