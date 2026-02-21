// Supabase Edge Function: send SMS or WhatsApp via Twilio
// Supports: (1) plain message with body (2) verification with Content template (contentSid + contentVariables)
// Set secrets: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER, TWILIO_WHATSAPP_NUMBER

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

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

type Payload = {
  to: string;
  body?: string;
  channel?: 'sms' | 'whatsapp';
  /** Twilio Content template SID (e.g. HX229f5a04fd0510ce1b071852155d3e75) for verification */
  contentSid?: string;
  /** Template variables as JSON string (e.g. '{"1":"409173"}' where "1" is the placeholder for the code) */
  contentVariables?: string;
  /** Optional override for From (e.g. 'whatsapp:+14155238886') */
  from?: string;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const fromNumber = Deno.env.get('TWILIO_PHONE_NUMBER');
    const whatsappNumber = Deno.env.get('TWILIO_WHATSAPP_NUMBER');

    if (!accountSid || !authToken) {
      return new Response(
        JSON.stringify({ error: 'Twilio credentials not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const payload = (await req.json()) as Payload;
    const { to, body, channel = 'sms', contentSid, contentVariables, from: fromOverride } = payload;

    if (!to?.trim()) {
      return new Response(
        JSON.stringify({ error: 'Missing "to"' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const useContentTemplate = !!contentSid?.trim();
    if (useContentTemplate) {
      if (!contentVariables || typeof contentVariables !== 'string') {
        return new Response(
          JSON.stringify({ error: 'When using contentSid, "contentVariables" (JSON string) is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else {
      if (!body?.trim()) {
        return new Response(
          JSON.stringify({ error: 'Missing "body" (or use contentSid + contentVariables for template)' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const toE164 = ensureE164(to.trim());
    const isWhatsApp = channel === 'whatsapp';

    const from =
      fromOverride?.trim() ||
      (isWhatsApp
        ? (whatsappNumber || fromNumber || '').startsWith('whatsapp:')
          ? whatsappNumber
          : `whatsapp:${ensureE164((whatsappNumber || fromNumber || '').replace(/^whatsapp:/, ''))}`
        : fromNumber?.replace(/^whatsapp:/, '') || fromNumber);

    const toParam = isWhatsApp ? `whatsapp:${toE164}` : toE164;

    if (!from) {
      return new Response(
        JSON.stringify({ error: isWhatsApp ? 'TWILIO_WHATSAPP_NUMBER not set' : 'TWILIO_PHONE_NUMBER not set' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const form = new URLSearchParams({
      To: toParam,
      From: from,
    });

    if (useContentTemplate) {
      form.set('ContentSid', contentSid!.trim());
      form.set('ContentVariables', contentVariables!.trim());
    } else {
      form.set('Body', body!);
    }

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
      JSON.stringify({ sid: data.sid, status: data.status }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: String(e) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
