-- FIX: Add robust exception handling to handle_new_user trigger
-- to prevent signup failures from cascading into a 500 error.
-- This replaces the existing function with a version that catches
-- duplicate key and other errors gracefully.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_count int;
  new_role text;
  new_department text;
  new_manager_id uuid;
  existing_profile public.profiles%ROWTYPE;
  invite_token text;
  invite_record record;
  new_email text;
  new_whatsapp text;
BEGIN
  new_email := new.email;
  new_whatsapp := new.phone;

  -- 1. Check if a profile already exists for this email OR phone
  SELECT * INTO existing_profile
  FROM public.profiles
  WHERE (new_email IS NOT NULL AND email = new_email)
     OR (new_whatsapp IS NOT NULL AND whatsapp = new_whatsapp)
  ORDER BY created_at ASC
  LIMIT 1;

  IF existing_profile.id IS NOT NULL THEN
    -- Update ALL tables that FK-reference profiles.id BEFORE changing the PK
    -- (all constraints are NO ACTION on update, so we must do this manually)

    UPDATE public.leave_balances
      SET user_id = new.id WHERE user_id = existing_profile.id;

    UPDATE public.leave_requests
      SET user_id = new.id WHERE user_id = existing_profile.id;

    UPDATE public.notifications
      SET user_id = new.id WHERE user_id = existing_profile.id;

    UPDATE public.audit_logs
      SET performed_by = new.id WHERE performed_by = existing_profile.id;

    UPDATE public.invitations
      SET manager_id = new.id WHERE manager_id = existing_profile.id;

    -- Self-referential: other profiles managed by this user
    UPDATE public.profiles
      SET manager_id = new.id WHERE manager_id = existing_profile.id;

    -- Now safe to update the profile's own PK
    UPDATE public.profiles
    SET
      id = new.id,
      email = coalesce(existing_profile.email, new_email),
      whatsapp = coalesce(existing_profile.whatsapp, new_whatsapp)
    WHERE id = existing_profile.id;

    -- Initialize balances if not yet present
    INSERT INTO public.leave_balances (user_id, leave_type_id, total_days, remaining_days, used_days)
    SELECT new.id, id, annual_allowance, annual_allowance, 0
    FROM public.leave_types
    ON CONFLICT DO NOTHING;

    RETURN new;
  END IF;

  -- 2. Check for invitation data in raw_user_meta_data
  invite_token := new.raw_user_meta_data->>'invitation_token';

  IF invite_token IS NOT NULL THEN
    SELECT * INTO invite_record FROM public.invitations WHERE token = invite_token AND used_at IS NULL LIMIT 1;

    IF invite_record.id IS NOT NULL THEN
      new_role := invite_record.role;
      new_department := invite_record.department;
      new_manager_id := invite_record.manager_id;

      IF new_whatsapp IS NULL THEN
        new_whatsapp := invite_record.whatsapp;
      END IF;

      -- Mark invite as used
      UPDATE public.invitations SET used_at = now() WHERE id = invite_record.id;
    END IF;
  END IF;

  -- 3. If no invite, use the "First Two Admins" rule
  IF new_role IS NULL THEN
    SELECT count(*) INTO admin_count FROM public.profiles WHERE role = 'ADMIN';

    IF admin_count < 2 THEN
      new_role := 'ADMIN';
      new_department := 'Management';
    ELSE
      new_role := 'EMPLOYEE';
      new_department := '';
    END IF;
  END IF;

  -- 4. Create the profile (with exception handling)
  BEGIN
    INSERT INTO public.profiles (id, email, name, role, department, manager_id, whatsapp)
    VALUES (
      new.id,
      new_email,
      coalesce(
        new.raw_user_meta_data->>'name',
        CASE
          WHEN new_email IS NOT NULL THEN split_part(new_email, '@', 1)
          WHEN new_whatsapp IS NOT NULL THEN 'User ' || substring(new_whatsapp, length(new_whatsapp)-3)
          ELSE 'User ' || substring(new.id::text, 1, 8)
        END
      ),
      new_role,
      new_department,
      new_manager_id,
      new_whatsapp
    );
  EXCEPTION WHEN unique_violation THEN
    -- Profile already exists (race condition), ignore
    RAISE WARNING 'handle_new_user: profile already exists for user %', new.id;
  WHEN OTHERS THEN
    RAISE EXCEPTION 'handle_new_user: failed to create profile: %', SQLERRM;
  END;

  -- 5. Initialize leave balances for the new user
  BEGIN
    INSERT INTO public.leave_balances (user_id, leave_type_id, total_days, remaining_days, used_days)
    SELECT
      new.id,
      id,
      annual_allowance,
      annual_allowance,
      0
    FROM public.leave_types
    ON CONFLICT DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user: failed to initialize balances: %', SQLERRM;
  END;

  RETURN new;
END;
$$;

COMMENT ON FUNCTION public.handle_new_user() IS 'Creates profile on signup with robust error handling; first 2 users get ADMIN, rest EMPLOYEE.';
