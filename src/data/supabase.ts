import { createClient } from "@supabase/supabase-js";

// The URL and publishable key are safe to have in website code;
// the database rules in supabase/schema.sql are what keep letters private.
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_KEY,
);
