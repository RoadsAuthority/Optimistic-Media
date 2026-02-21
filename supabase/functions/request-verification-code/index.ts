// Request a verification code: store in DB and send via Twilio Content template.
// Requires: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_NUMBER (e.g. whatsapp:+14155238886)
// Optional: TWILIO_VERIFICATION_CONTENT_SID (default HX229f5a04fd0510ce1b071852155d3e75)

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
    const { to } = (await req.json()) as { to: string };
    if (!to?.trim()) {
      return new Response(
        JSON.stringify({ error: 'Missing "to" (phone number)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const whatsappNumber = Deno.env.get('TWILIO_WHATSAPP_NUMBER');
    const contentSid = Deno.env.get('TWILIO_VERIFICATION_CONTENT_SID') || 'HX229f5a04fd0510ce1b071852155d3e75';

    if (!accountSid || !authToken || !whatsappNumber) {
      return new Response(
        JSON.stringify({ error: 'Twilio or WhatsApp number not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const phone = ensureE164(to.trim());
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { error: insertError } = await supabase.from('phone_verifications').insert({
      phone,
      code,
      expires_at: expiresAt.toISOString(),
    });

    if (insertError) {
      console.error('phone_verifications insert error:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to store verification code' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const from = whatsappNumber.startsWith('whatsapp:') ? whatsappNumber : `whatsapp:${ensureE164(whatsappNumber.replace(/^whatsapp:/, ''))}`;
    const toParam = `whatsapp:${phone}`;
    const contentVariables = JSON.stringify({ '1': code });

    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const form = new URLSearchParams({
      To: toParam,
      From: from,
      ContentSid: contentSid,
      ContentVariables: contentVariables,
    });

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + btoa(`${accountSid}:${authToken}`),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: form.toString(),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return new Response(
        JSON.stringify({ error: data.message || 'Twilio request failed', code: data.code }),
        { status: res.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ ok: true, expiresIn: 600 }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: String(e) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
