import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://ibetcczlscpxfmrxaery.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_fOpTVyH5ORhYXRYhz3fagQ_xoGdCR77";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true },
});