import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://ibetcczlscpxfmrxaery.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImliZXRjY3psc2NweGZtcnhhZXJ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNTk0MTksImV4cCI6MjA5MzczNTQxOX0.R8rxGVxgQNylu5gifExkaqZsZdNEGoqWv8ZrszJHP6Q";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true },
});
