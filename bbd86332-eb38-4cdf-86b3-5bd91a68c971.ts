import { createClient as createSupabaseClient } from "npm:@supabase/supabase-js@2";

export function createClient() {
  return createSupabaseClient(
    "https://sghmgiaaqcuymqnfbleh.supabase.co",
    "sb_publishable_VL3kSjtNHGvLcmZYi1YXnA_Xlo8zpXy"
  );
}