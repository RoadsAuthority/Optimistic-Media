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
  // Remove all non-digits
  const digits = phone.replace(/\D/g, '');

  // If it already looks like a full E.164 (starts with a known large country code or just long enough)
  // we just ensure the + is there.
  if (phone.startsWith('+')) return '+' + digits;

  // Handle local 0-prefix: This is tricky without knowing the country.
  // Many users in Namibia (+264) enter 081... 
  // If no prefix and it starts with 0, we can't safely assume +264 unless we hardcode it.
  // But we can at least NOT turn 081 into +81 (Japan) if we are not sure.

  // Better approach: if it doesn't start with +, and it's 9-10 digits, it's likely local.
  // If it's longer, it's likely international without the +.

  if (digits.length >= 11 && (digits.startsWith('264') || digits.startsWith('27'))) {
    return '+' + digits;
  }

  return phone.startsWith('+') ? phone : '+' + digits;
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

    // Attempt 1: Using Content Template (Standard for WhatsApp)
    console.log(`Twilio Attempt 1 (Template): From ${from} To ${toParam} Sid ${contentSid}`);

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + btoa(`${accountSid}:${authToken}`),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        To: toParam,
        From: from,
        ContentSid: contentSid,
        ContentVariables: contentVariables,
      }).toString(),
    });

    const data = await res.json().catch(() => ({}));
    console.log('Twilio Attempt 1 Response:', { status: res.status, ok: res.ok, data });

    if (!res.ok) {
      // Attempt 2: Fallback to plain Body (if session exists or sandbox rules allow)
      console.log(`Twilio Attempt 1 failed. Trying Attempt 2 (Plain Body)...`);
      const res2 = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: 'Basic ' + btoa(`${accountSid}:${authToken}`),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          To: toParam,
          From: from,
          Body: `Your verification code is: ${code}`,
        }).toString(),
      });

      const data2 = await res2.json().catch(() => ({}));
      console.log('Twilio Attempt 2 Response:', { status: res2.status, ok: res2.ok, data: data2 });

      if (!res2.ok) {
        return new Response(
          JSON.stringify({
            error: data2.message || data.message || 'Twilio request failed',
            code: data2.code || data.code,
            attempt1: data.message,
            attempt2: data2.message
          }),
          { status: res2.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
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
