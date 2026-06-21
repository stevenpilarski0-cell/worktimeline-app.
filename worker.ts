import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://sghmgiaaqcuymqnfbleh.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

Deno.serve(async (req) => {
  try {
    // Fetch next pending job
    const { data: job, error: fetchError } = await supabase
      .from('clio_jobs')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    if (fetchError || !job) return new Response('No pending jobs', { status: 200 });

    // Mark as processing
    await supabase.from('clio_jobs').update({ status: 'processing' }).eq('job_id', job.job_id);

    // MOCK: Your actual heavy job logic runs here based on job.payload
    await new Promise(res => setTimeout(res, 2000));

    await supabase.from('clio_jobs').update({ status: 'completed', result: { success: true } }).eq('job_id', job.job_id);
    return new Response(`Processed Job: ${job.job_id}`, { status: 200 });
  } catch (error: any) {
    return new Response(`Worker Failed: ${error.message}`, { status: 500 });
  }
});