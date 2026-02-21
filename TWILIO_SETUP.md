# Twilio messaging (invitations + verification)

## Quick setup checklist

1. **Run the SQL migration** (adds `phone_verifications` table and `invitations.whatsapp`):
   - In Supabase Dashboard → SQL Editor, run the contents of `supabase/migrations/20250220000000_phone_verification.sql`.

2. **Set Twilio secrets** (Dashboard → Project Settings → Edge Functions → Secrets):
   - `TWILIO_ACCOUNT_SID` (e.g. `AC8f7234e9f119f924882ff1224870c21b`)
   - `TWILIO_AUTH_TOKEN` (your real token, not `[AuthToken]`)
   - `TWILIO_WHATSAPP_NUMBER` (e.g. `whatsapp:+14155238886`)
   - Optional: `TWILIO_VERIFICATION_CONTENT_SID` (default `HX229f5a04fd0510ce1b071852155d3e75`)
   - Optional (show sandbox join instructions in app): in `.env` set `VITE_TWILIO_SANDBOX_JOIN_CODE` and `VITE_TWILIO_SANDBOX_NUMBER` to the code and number from Twilio Console → Try it out → Send a WhatsApp message.

3. **Deploy Edge Functions** (from project root):
   ```bash
   npx supabase functions deploy send-twilio-message
   npx supabase functions deploy request-verification-code
   npx supabase functions deploy verify-code
   ```
   `request-verification-code` and `verify-code` are configured with `verify_jwt = false` in `supabase/config.toml` so the Accept Invite page (unauthenticated users) can call them. If you still get **401** on these after deploy, turn off “Enforce JWT” for them in Dashboard → Edge Functions → each function → Settings.

4. **Invite with WhatsApp**: when creating an invitation, enter the invitee’s WhatsApp number **with country code** (e.g. `+264814680418`). They will receive the invite link; on Accept Invite they must request a verification code (sent via your Twilio Content template) and enter it before creating their account.

5. **If only your number receives messages (others don’t)**  
   You are likely using the **Twilio WhatsApp Sandbox**. In the sandbox, **only numbers that have “joined” can receive messages**.  
   - Have the recipient open WhatsApp and send the join message (e.g. `join <your-sandbox-code>`) to your Twilio sandbox number.  
   - Find the exact code and number in [Twilio Console → Messaging → Try it out → Send a WhatsApp message](https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp). To show this in the app when inviting, set in `.env`: `VITE_TWILIO_SANDBOX_JOIN_CODE=your-code` and `VITE_TWILIO_SANDBOX_NUMBER=+14155238886` (your sandbox number).  
   - For production, use the full **WhatsApp Business API** (approved business number) so you can message any user within WhatsApp’s template and 24-hour rules.

---

# Twilio messaging (invitations + verification)

Twilio is used for:

1. **Invitations** – send invite links via WhatsApp (and optionally SMS).
2. **Verification** – send verification codes via your Twilio **Content template** (e.g. WhatsApp with `contentSid` + `contentVariables`).

Your Twilio snippet uses a Content template:

```js
// Twilio’s example (do NOT put AuthToken in frontend code)
client.messages.create({
  from: 'whatsapp:+14155238886',
  contentSid: 'HX229f5a04fd0510ce1b071852155d3e75',
  contentVariables: '{"1":"409173"}',
  to: 'whatsapp:+264814680418'
});
```

The app does the same via a Supabase Edge Function so credentials stay server-side.

---

## 1. Supabase Edge Function

- **Function:** `send-twilio-message`
- **Path:** `supabase/functions/send-twilio-message/index.ts`

It supports:

- **Plain message:** `body` + `to` + `channel` (`sms` | `whatsapp`).
- **Verification (Content template):** `contentSid` + `contentVariables` (JSON string, e.g. `'{"1":"409173"}'`) + `to` + `channel`.

Deploy:

```bash
npx supabase functions deploy send-twilio-message
```

---

## 2. Twilio secrets in Supabase

**Do not put `accountSid` or `authToken` in frontend code.** Set them as Supabase secrets.

In Supabase Dashboard → **Project Settings → Edge Functions → Secrets** (or CLI below):

| Secret                     | Description | Example |
|----------------------------|-------------|---------|
| `TWILIO_ACCOUNT_SID`       | From [Twilio Console](https://console.twilio.com) | `AC8f7234e9f119f924882ff1224870c21b` |
| `TWILIO_AUTH_TOKEN`        | From Twilio Console (replace `[AuthToken]`) | your actual token |
| `TWILIO_PHONE_NUMBER`      | Twilio number for SMS (E.164) | `+1234567890` |
| `TWILIO_WHATSAPP_NUMBER`   | WhatsApp sender (same as snippet `from`) | `whatsapp:+14155238886` |

CLI:

```bash
npx supabase secrets set TWILIO_ACCOUNT_SID=AC8f7234e9f119f924882ff1224870c21b
npx supabase secrets set TWILIO_AUTH_TOKEN=your_actual_auth_token
npx supabase secrets set TWILIO_PHONE_NUMBER=+1234567890
npx supabase secrets set TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
```

---

## 3. Sending a verification code (your template)

In the app you can send a verification code using your Content template like this:

```ts
import { sendTwilioVerificationCode } from '@/hooks/useData';

// Generate a 6-digit code (store it in your DB and compare when user submits)
const code = String(Math.floor(100000 + Math.random() * 900000));

const result = await sendTwilioVerificationCode('+264814680418', code, {
  channel: 'whatsapp',
  contentSid: 'HX229f5a04fd0510ce1b071852155d3e75',  // optional, this is the default
  contentVariableKey: '1',                             // template placeholder key
  from: 'whatsapp:+14155238886',                      // optional override
});

if (result.error) {
  console.error('Failed to send verification code', result.error);
} else {
  console.log('Verification code sent', result.sid);
}
```

The function sends the same request as your snippet: `contentSid` + `contentVariables: '{"1":"<code>"}'` to the given number via WhatsApp.

---

## 4. Behaviour summary

- **Invite via WhatsApp:** sends the invite message via Twilio (or falls back to opening WhatsApp Web if Twilio fails).
- **Verification:** use `sendTwilioVerificationCode(to, code, options)` so the user receives the code via your Twilio Content template. You must generate the code, store it (e.g. in a `phone_verifications` or `invitations` table), and later compare the user input to the stored code.
