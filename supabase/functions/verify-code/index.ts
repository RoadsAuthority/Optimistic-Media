// Verify a phone + code. Uses service role to read phone_verifications; deletes on success.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function ensureE164(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('0')) return '+' + digits.slice(1);
  if (!digits.startsWith('1') && digits.length <= 10) return '+1' + digits;
  return digits.startsWith('+') ? phone : '+' + digits;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { phone, code } = (await req.json()) as { phone: string; code: string };
    if (!phone?.trim() || !code?.trim()) {
      return new Response(
        JSON.stringify({ valid: false, error: 'Missing "phone" or "code"' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const normalizedPhone = ensureE164(phone.trim());
    const now = new Date().toISOString();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: row, error: selectError } = await supabase
      .from('phone_verifications')
      .select('id')
      .eq('phone', normalizedPhone)
      .eq('code', code.trim())
      .gt('expires_at', now)
      .limit(1)
      .maybeSingle();

    if (selectError || !row) {
      return new Response(
        JSON.stringify({ valid: false }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    await supabase.from('phone_verifications').delete().eq('id', row.id);

    return new Response(
      JSON.stringify({ valid: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ valid: false, error: String(e) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
