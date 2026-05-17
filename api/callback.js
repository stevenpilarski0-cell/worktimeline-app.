const { createClient } = require('@supabase/supabase-js');

// Initialize your Supabase infrastructure vault securely
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

module.exports = async (req, res) => {
  // 1. Capture the inbound authorization artifacts from Clio's gateway
  const { code, state } = req.query;

  if (!code) {
    console.error("WorkTimeline Backend Error | Code missing from inbound gateway redirection.");
    return res.status(400).json({ error: 'Missing authorization code from Clio.' });
  }

  try {
    // 2. Safely unpack your custom base64 state wrapper layer
    let userId = '01KPZB4ZCXHE3Z92S1KM3AT96V'; // Fallback to your Pilot Firm ID
    let platform = 'manage';

    if (state) {
      try {
        const decodedState = JSON.parse(Buffer.from(decodeURIComponent(state), 'base64').toString());
        if (decodedState) {
          userId = decodedState.pilot_firm || '01KPZB4ZCXHE3Z92S1KM3AT96V';
          platform = decodedState.platform || 'manage';
        }
      } catch (e) {
        console.warn("WorkTimeline Backend | State decoding fallback initialized.", e);
        userId = state; 
      }
    }

    console.log(`WorkTimeline Backend Matrix | Executing Active Token Trade for Platform: [${platform.toUpperCase()}]`);

    // 3. Dynamic Credentials Alignment Loop
    let clientId = '';
    let clientSecret = '';
    let tokenGatewayUrl = '';

    if (platform === 'grow') {
      clientId = process.env.CLIO_GROW_CLIENT_ID;
      tokenGatewayUrl = 'https://developers.api.clio.com/oauth/token';
    } else {
      // Phase 1 Target: Locked perfectly to the true Canadian platform API cluster node
      clientId = process.env.CLIO_MANAGE_CLIENT_ID;
      clientSecret = process.env.CLIO_MANAGE_CLIENT_SECRET;
      tokenGatewayUrl = 'https://ca.app.clio.com/oauth/token';
    }

    // Verify system validation configuration inside the active Vercel panel
    if (!clientId) {
      console.error(`WorkTimeline Architecture Fault | Required environment variables are missing from your Vercel console.`);
      throw new Error(`Server Configuration Error: Missing key mappings on Vercel.`);
    }

    // 4. Hardcoded Redirect URI to eliminate dynamic header mapping errors
    const redirectUri = 'https://worktimeline-app.vercel.app/api/callback';

    console.log(`WorkTimeline Network Outbound | Shipping validation trade packet to: ${tokenGatewayUrl}`);
    console.log(`WorkTimeline Network Outbound | Asserting verification match URL: ${redirectUri}`);

    // 5. Build standard x-www-form-urlencoded body payload parameters
    const requestParams = new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      client_id: clientId,
      redirect_uri: redirectUri
    });

    if (platform !== 'grow' && clientSecret) {
      requestParams.append('client_secret', clientSecret);
    }

    // 6. Execute direct backend code swap trade with Clio's Canadian cluster node
    const clioResponse = await fetch(tokenGatewayUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: requestParams.toString(),
    });

    const data = await clioResponse.json();

    if (!clioResponse.ok) {
      console.error("Clio Canadian API Cluster Refused Token Exchange Request. Diagnostic payload: ", data);
      throw new Error(data.error_description || data.error || 'Token validation swap failed.');
    }

    // 7. Calculate date window limits for secure token lifespan tracking
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + (data.expires_in || 3600));

    console.log(`WorkTimeline Database Engine | Committing secure token layer payload to Supabase vault for user_id: ${userId}`);

    // 8. Upsert the permanent secure operational access token layer cleanly into your Supabase columns
    const { error: dbError } = await supabase
      .from('clio_connections')
      .upsert({
        user_id: userId,
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_at: expiresAt.toISOString(),
      }, { onConflict: 'user_id' });

    if (dbError) {
      console.error("Supabase Security Vault Insertion Call Rejected: ", dbError);
      throw dbError;
    }

    console.log("WorkTimeline Engine | Master Sync Complete. Redirecting to UI visualizer panels.");
    
    // Redirect user back to your frontend layout engine with a hard validation confirmation state query parameter
    return res.redirect('/?status=clio_connected');

  } catch (error) {
    console.error('WorkTimeline Core Handshake System Failure:', error.message);
    return res.redirect('/?status=error&message=' + encodeURIComponent(error.message));
  }
};
