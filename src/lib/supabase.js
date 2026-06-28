import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const CONFIG_OK = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export const supabase = CONFIG_OK
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: "implicit",
      },
    })
  : null;

// True when this page load is the return from a magic-link email
// (token arrives in the URL hash before supabase-js cleans it up).
export const ARRIVED_VIA_MAGIC_LINK =
  typeof window !== "undefined" && window.location.hash.includes("access_token");
