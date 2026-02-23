// Supabase Edge Function: send email invitations via SendGrid HTTP API
// Uses SendGrid API key configured as a Supabase secret.
//
// Required secrets:
// - SENDGRID_API_KEY
// - SENDGRID_FROM (e.g. "no-reply@yourdomain.com")
//
// Body:
// {
//   "to": "user@example.com",
//   "subject": "Invitation",
//   "text": "Plain text body",
//   "html": "<p>HTML body</p>"
// }

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type EmailPayload = {
  to: string;
  subject: string;
  text?: string;
  html?: string;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('SENDGRID_API_KEY');
    const fromEmail = Deno.env.get('SENDGRID_FROM');

    if (!apiKey || !fromEmail) {
      return new Response(
        JSON.stringify({ error: 'SendGrid is not fully configured (missing API key or from address)' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const payload = (await req.json()) as EmailPayload;
    const { to, subject, text, html } = payload;

    if (!to?.trim() || !subject?.trim()) {
      return new Response(
        JSON.stringify({ error: 'Missing "to" or "subject"' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const sgBody: Record<string, unknown> = {
      personalizations: [
        {
          to: [{ email: to }],
        },
      ],
      from: { email: fromEmail },
      subject,
      content: [] as Array<{ type: string; value: string }>,
    };

    if (text) {
      (sgBody.content as Array<{ type: string; value: string }>).push({
        type: 'text/plain',
        value: text,
      });
    }

    if (html) {
      (sgBody.content as Array<{ type: string; value: string }>).push({
        type: 'text/html',
        value: html,
      });
    }

    if ((sgBody.content as Array<unknown>).length === 0) {
      (sgBody.content as Array<{ type: string; value: string }>).push({
        type: 'text/plain',
        value: '',
      });
    }

    const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(sgBody),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      return new Response(
        JSON.stringify({ error: 'SendGrid request failed', status: res.status, body: errText }),
        { status: res.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(
      JSON.stringify({ ok: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    console.error('SendGrid send error:', e);
    return new Response(
      JSON.stringify({ error: String(e) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});

