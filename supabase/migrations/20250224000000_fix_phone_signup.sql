-- FIX: Allow phone-only signup by making email nullable in profiles
-- Run this in your Supabase SQL Editor

-- 1. Make email column nullable
ALTER TABLE public.profiles ALTER COLUMN email DROP NOT NULL;

-- 2. Update the handle_new_user function to be more resilient
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
  new_whatsapp := new.phone; -- Supabase Auth 'phone' field

  -- 1. Check if a profile already exists for this email OR phone
  -- We link the profile if it was pre-created by an admin
  SELECT * INTO existing_profile
  FROM public.profiles
  WHERE (new_email IS NOT NULL AND email = new_email)
     OR (new_whatsapp IS NOT NULL AND whatsapp = new_whatsapp)
  ORDER BY created_at ASC
  LIMIT 1;

  IF existing_profile.id IS NOT NULL THEN
    -- Update the old profile to match the new auth ID
    UPDATE public.profiles
    SET 
      id = new.id,
      email = coalesce(existing_profile.email, new_email),
      whatsapp = coalesce(existing_profile.whatsapp, new_whatsapp)
    WHERE id = existing_profile.id;
    
    -- Also initialize balance if not present
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
      
      -- If the invite had a specific phone, use it if auth didn't provide one
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

  -- 4. Create the profile
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

  -- 5. Initialize leave balances for the new user
  INSERT INTO public.leave_balances (user_id, leave_type_id, total_days, remaining_days, used_days)
  SELECT 
    new.id, 
    id, 
    annual_allowance, 
    annual_allowance, 
    0
  FROM public.leave_types
  ON CONFLICT DO NOTHING;

  RETURN new;
END;
$$;
