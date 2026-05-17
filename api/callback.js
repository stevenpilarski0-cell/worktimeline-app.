const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

module.exports = async (req, res) => {
  const { code, state } = req.query;

  if (!code) {
    console.error("WorkTimeline Backend Error | Missing authorization tracking code.");
    return res.status(400).json({ error: 'Missing authorization code from Clio.' });
  }

  try {
    let userId = '01KPZB4ZCXHE3Z92S1KM3AT96V'; 
    let platform = 'grow';
    let localCodeVerifier = '';

    if (state) {
      try {
        const decodedState = JSON.parse(Buffer.from(decodeURIComponent(state), 'base64').toString());
        if (decodedState) {
          userId = decodedState.pilot_firm || '01KPZB4ZCXHE3Z92S1KM3AT96V';
          platform = decodedState.platform || 'grow';
          localCodeVerifier = decodedState.verifier || ''; 
        }
      } catch (e) {
        console.warn("WorkTimeline Backend | State decoding fallback initialized.", e);
        userId = state; 
      }
    }

    console.log(`WorkTimeline Matrix | Processing Code Exchange for: [${platform.toUpperCase()}]`);

    let clientId = '';
    let tokenGatewayUrl = '';
    
    const requestParams = new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: 'https://worktimeline-app.vercel.app/api/callback'
    });

    if (platform === 'grow') {
      clientId = process.env.CLIO_GROW_CLIENT_ID;
      // Core Grow token processing gateway
      tokenGatewayUrl = 'https://app.clio.com/grow/oauth/token';
      
      let finalVerifier = localCodeVerifier;
      if (!finalVerifier) {
        const cookieHeader = req.headers.cookie || '';
        const match = cookieHeader.match(/clio_pkce_verifier=([^;]+)/);
        if (match) finalVerifier = match[1];
      }
      
      if (finalVerifier) {
        requestParams.append('code_verifier', finalVerifier);
      }
      requestParams.append('client_id', clientId);
    } else {
      clientId = process.env.CLIO_MANAGE_CLIENT_ID;
      const clientSecret = process.env.CLIO_MANAGE_CLIENT_SECRET;
      tokenGatewayUrl = 'https://ca.app.clio.com/oauth/token';
      
      requestParams.append('client_id', clientId);
      if (clientSecret) {
        requestParams.append('client_secret', clientSecret);
      }
    }

    if (!clientId) {
      console.error(`WorkTimeline Fault | Configuration keys are missing inside your Vercel panel.`);
      throw new Error(`Server Configuration Error: Missing environment variables on Vercel.`);
    }

    console.log(`WorkTimeline Network Outbound | Shipping validation trade packet to: ${tokenGatewayUrl}`);

    const clioResponse = await fetch(tokenGatewayUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: requestParams.toString(),
    });

    const data = await clioResponse.json();

    if (!clioResponse.ok) {
      console.error("Clio Hub Refused Token Exchange. Diagnostic data payload: ", data);
      throw new Error(data.error_description || data.error || 'Token validation swap failed.');
    }

    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + (data.expires_in || 3600));

    console.log(`WorkTimeline Database Engine | Committing secure token layer to Supabase vault for user_id: ${userId}`);

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

    console.log("WorkTimeline Engine | Master Sync Complete. Redirecting to user interface dashboard panels.");
    return res.redirect('/?status=clio_connected');

  } catch (error) {
    console.error('WorkTimeline Core Handshake System Failure:', error.message);
    return res.redirect('/?status=error&message=' + encodeURIComponent(error.message));
  }
};
