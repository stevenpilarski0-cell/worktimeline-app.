// @ts-nocheck
// index.ts — Full Production Supabase Edge Function for Clio OAuth
// Includes: OAuth exchange, refresh logic, token storage, redirect, logging.

// 1. Load environment variables
const CLIO_CLIENT_ID = Deno.env.get("CLIO_CLIENT_ID")!;
const CLIO_CLIENT_SECRET = Deno.env.get("CLIO_CLIENT_SECRET")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// 2. Create Supabase client
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// 3. Helper: Refresh Clio tokens
async function refreshClioToken(refresh_token: string) {
  const params = new URLSearchParams();
  params.append("grant_type", "refresh_token");
  params.append("client_id", CLIO_CLIENT_ID);
  params.append("client_secret", CLIO_CLIENT_SECRET);
  params.append("refresh_token", refresh_token);

  const res = await fetch("https://ca.app.clio.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  const data = await res.json();
  if (!res.ok) {
    console.error("Refresh failed:", data);
    return null;
  }

  return data;
}

// 4. Main handler
Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const mode = url.searchParams.get("mode");
    const state = url.searchParams.get("state");
    const userId = state || "unknown_user";

    // MODE: refresh tokens
    if (mode === "refresh") {
      const { data, error } = await supabase
        .from("clio_tokens")
        .select("refresh_token")
        .eq("user_id", userId)
        .single();

      if (error || !data) {
        return new Response("No refresh token found", { status: 400 });
      }

      const refreshed = await refreshClioToken(data.refresh_token);
      if (!refreshed) {
        return new Response("Failed to refresh token", { status: 500 });
      }

      await supabase.from("clio_tokens").update({
        access_token: refreshed.access_token,
        refresh_token: refreshed.refresh_token ?? data.refresh_token,
        expires_in: refreshed.expires_in,
        updated_at: new Date().toISOString(),
      }).eq("user_id", userId);

      return new Response("Token refreshed", { status: 200 });
    }

    // MODE: OAuth callback
    if (!code) {
      return new Response("Missing ?code= from Clio OAuth", { status: 400 });
    }

    // Exchange code for tokens
    const params = new URLSearchParams();
    params.append("grant_type", "authorization_code");
    params.append("client_id", CLIO_CLIENT_ID);
    params.append("client_secret", CLIO_CLIENT_SECRET);
    params.append("code", code);
    params.append("redirect_uri", Deno.env.get("CLIO_REDIRECT_URI") || "https://sghmgiaaqcuymqnfbleh.supabase.co/functions/v1/quick-worker");

    const tokenRes = await fetch("https://ca.app.clio.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    const tokenData = await tokenRes.json();

    if (!tokenRes.ok) {
      console.error("Token exchange failed:", tokenData);
      return new Response("OAuth token exchange failed", { status: 500 });
    }

    const {
      access_token,
      refresh_token,
      expires_in,
      id_token,
      token_type,
    } = tokenData;

    // Store tokens
    const { error } = await supabase
      .from("clio_tokens")
      .upsert({
        user_id: userId,
        access_token,
        refresh_token,
        expires_in,
        token_type,
        id_token,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      console.error("Supabase insert error:", error);
      return new Response("Failed to store tokens", { status: 500 });
    }

    const isAddToClio = state && state.includes("addtoclio");
    if (isAddToClio) {
      return Response.redirect("https://ca.app.clio.com/app_integrations_callback", 302);
    }

    // Redirect back to your Vercel app
    return Response.redirect(
      Deno.env.get("FRONTEND_SYNC_SUCCESS_URL") || "https://worktimeline-app.vercel.app/?sync=success",
      302,
    );

  } catch (err) {
    console.error("OAuth handler error:", err);
    return new Response("Server error", { status: 500 });
  }
});
