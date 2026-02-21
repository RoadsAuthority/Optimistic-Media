/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_TWILIO_SANDBOX_JOIN_CODE?: string;
  readonly VITE_TWILIO_SANDBOX_NUMBER?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
