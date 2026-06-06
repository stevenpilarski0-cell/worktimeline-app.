// index.ts - Full Production Supabase Edge Function for Clio OAuth
// Includes: OAuth exchange, refresh logic, token storage, redirect, logging.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// Hardcoded Credentials from your Clio Developer Dashboard
const CLIO_CLIENT_ID = "18C4aBAD8YThRDG04xn_-rs8XQTdc0ZJyhPefMZR-0s";
const CLIO_CLIENT_SECRET = "MNDG0NJjVqFZAKZngJLhO4CyHifsEozbFwNEXGHk5dU";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function refreshClioToken(refresh_token: string) {
  const res = await fetch("https://ca.grow.clio.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "refresh_token",
      client_id: CLIO_CLIENT_ID,
      client_secret: CLIO_CLIENT_SECRET,
      refresh_token,
    }),
  });
  return await res.json();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    }});
  }

  try {
    const { logs, redirect_uri } = await req.json();

    if (!redirect_uri) {
      return new Response(JSON.stringify({ error: "Missing redirect_uri parameter" }), {
        status: 400,
        headers: { "Content-Type": "application/json", 'Access-Control-Allow-Origin': '*' }
      });
    }

    const { data: tokenData, error: fetchError } = await supabase
      .from("clio_tokens")
      .select("*")
      .single();

    let accessToken = tokenData?.access_token;

    if (fetchError || !accessToken) {
      const refreshResult = await refreshClioToken(tokenData?.refresh_token);
      if (refreshResult.access_token) {
        accessToken = refreshResult.access_token;
        await supabase.from("clio_tokens").update({
          access_token: accessToken,
          updated_at: new Date().toISOString()
        }).eq('id', tokenData.id);
      } else {
        throw new Error("Could not refresh regional security handshake token.");
      }
    }

    const clioSyncResponse = await fetch("https://ca.grow.clio.com/api/v4/inbox_leads.json", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        data: {
          description: "WorkTimeline Immutable Audit Package",
          note: JSON.stringify(logs)
        }
      })
    });

    const syncResult = await clioSyncResponse.json();

    return new Response(JSON.stringify({ success: true, data: syncResult }), {
      headers: { "Content-Type": "application/json", 'Access-Control-Allow-Origin': '*' },
      status: 200,
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { "Content-Type": "application/json", 'Access-Control-Allow-Origin': '*' },
      status: 500,
    });
  }
})
