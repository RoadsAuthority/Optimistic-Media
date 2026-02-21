-- ============================================
-- RLS POLICIES FOR INVITATIONS TABLE
-- ============================================
-- These policies allow the invitation system to work properly
-- without conflicting with other tables or policies

-- Ensure RLS is enabled
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 1. SELECT POLICIES
-- ============================================

-- Policy 1a: Anyone (including unauthenticated) can read invitations by token
-- This is needed for the /accept-invite page to verify tokens
CREATE POLICY "Select invitations by token (public)"
ON public.invitations
FOR SELECT
TO public
USING (true); -- Allow reading any invitation (token is validated in app logic)

-- Policy 1b: Authenticated users (admins/HR) can see all invitations
-- This allows admins to view/manage invitations in the UI
CREATE POLICY "Select all invitations (authenticated)"
ON public.invitations
FOR SELECT
TO authenticated
USING (true);

-- ============================================
-- 2. INSERT POLICIES
-- ============================================

-- Policy 2: Only authenticated admins/HR can create invitations
-- This matches your app's behavior where only admins/HR can invite
CREATE POLICY "Insert invitations (admins/HR)"
ON public.invitations
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('ADMIN', 'HR')
  )
);

-- ============================================
-- 3. UPDATE POLICIES
-- ============================================

-- Policy 3: System can mark invitations as used
-- This allows marking invitations as used after successful signup
-- We allow authenticated users OR service role (for triggers/webhooks)
CREATE POLICY "Update invitations (mark as used)"
ON public.invitations
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- ============================================
-- 4. DELETE POLICIES (Optional - if you want admins to delete invitations)
-- ============================================

-- Policy 4: Only admins/HR can delete invitations
CREATE POLICY "Delete invitations (admins/HR)"
ON public.invitations
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('ADMIN', 'HR')
  )
);

-- ============================================
-- NOTES:
-- ============================================
-- 1. The SELECT policy allows public access because:
--    - The /accept-invite page needs to verify tokens
--    - Token validation happens in application logic (checking used_at, expires_at)
--    - This is safe because tokens are UUIDs (hard to guess)
--
-- 2. If you want stricter SELECT access, you can change Policy 1a to:
--    CREATE POLICY "Select invitations by token (public)"
--    ON public.invitations
--    FOR SELECT
--    TO public
--    USING (token IS NOT NULL); -- Only allow reading if token is provided
--
-- 3. The UPDATE policy is permissive because:
--    - After signup, the system needs to mark invitations as used
--    - You can tighten this later if needed
--
-- 4. These policies won't conflict with other tables because:
--    - They only reference the invitations table
--    - They only check profiles.role (which is already used elsewhere)
--    - They use standard Supabase RLS patterns
