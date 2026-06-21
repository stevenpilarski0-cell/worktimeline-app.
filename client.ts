import { createClient as createSupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

export function createClient() {
  return createSupabaseClient(
    "https://sghmgiaaqcuymqnfbleh.supabase.co",
    "sb_publishable_VL3kSjtNHGvLcmZYi1YXnA_Xlo8zpXy"
  );
}