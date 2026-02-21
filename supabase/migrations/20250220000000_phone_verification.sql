-- Add whatsapp to invitations if not present (for invite flow)
ALTER TABLE public.invitations
  ADD COLUMN IF NOT EXISTS whatsapp text;

-- Table for storing verification codes sent via Twilio (used by Edge Functions with service role)
CREATE TABLE IF NOT EXISTS public.phone_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL,
  code text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_phone_verifications_phone_expires
  ON public.phone_verifications (phone, expires_at);

-- RLS: no direct client access; only Edge Functions (service role) read/write
ALTER TABLE public.phone_verifications ENABLE ROW LEVEL SECURITY;

-- No policies: service role bypasses RLS. Clients must use Edge Functions to send/verify.

COMMENT ON TABLE public.phone_verifications IS 'Used by Edge Functions only; stores OTP codes for Twilio verification.';
