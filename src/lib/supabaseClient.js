import { createClient } from "@supabase/supabase-js";

// These are Supabase "publishable" (anon) keys — designed to be embedded in
// client-side code. They are useless for reading/writing data on their own;
// access is governed entirely by the Row Level Security policies on the
// `deals` table. This app is an internal single-tenant tool (one team,
// no per-user login), so RLS is intentionally open on this table rather
// than user-scoped. Do not reuse this pattern for multi-tenant data.
const SUPABASE_URL = "https://dsmxjaxchdqscpqqydnw.supabase.co";
const SUPABASE_PUBLISHABLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRzbXhqYXhjaGRxc2NwcXF5ZG53Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYzNTA0NzgsImV4cCI6MjEwMTkyNjQ3OH0.4KkySI77lxxKQUWNyMMgcaVa9Rdr4GpMi8Xl7LGwoa8";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: false },
});
