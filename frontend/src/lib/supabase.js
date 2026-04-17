import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  // Soft fallback — matches the behaviour of the old kernal-mcp branch so the
  // SPA still mounts when Supabase env vars are absent (Realtime + auth features
  // will be disabled until REACT_APP_SUPABASE_URL / REACT_APP_SUPABASE_ANON_KEY
  // are provided in frontend/.env).
  // eslint-disable-next-line no-console
  console.warn("Supabase env vars not set — auth & realtime will not work");
}

export const supabase = createClient(
  SUPABASE_URL || "https://placeholder.supabase.co",
  SUPABASE_KEY || "placeholder-anon-key",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);
