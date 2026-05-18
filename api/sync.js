// api/sync.js

export default async function handler(req, res) {
  // 1. CORS Setup: Ensures your frontend can communicate with this backend
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*'); 
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Environment variables required in your Vercel project settings:
  const CLIO_CLIENT_ID = process.env.CLIO_CLIENT_ID;
  const CLIO_CLIENT_SECRET = process.env.CLIO_CLIENT_SECRET;
  const REDIRECT_URI = process.env.REDIRECT_URI; // e.g., https://yourdomain.com/api/sync

  // ==========================================
  // ROUTE A: THE OAUTH HANDSHAKE (GET Request)
  // ==========================================
  if (req.method === 'GET') {
    const { code } = req.query;
    
    // If Clio sent us a code, we need to exchange it for an Access Token
    if (code) {
      try {
        const tokenResponse = await fetch('https://ca.app.clio.com/oauth/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: CLIO_CLIENT_ID,
            client_secret: CLIO_CLIENT_SECRET,
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: REDIRECT_URI
          })
        });

        const tokenData = await tokenResponse.json();

        if (!tokenResponse.ok) {
          throw new Error(tokenData.error_description || 'Token exchange failed');
        }

        // We successfully retrieved the tokens!
        const accessToken = tokenData.access_token;
        const refreshToken = tokenData.refresh_token;

        // TODO: Save accessToken and refreshToken to Supabase here
        console.log("Tokens secured successfully.");

        // Redirect the user back to the frontend to trigger the auto-transmit
        return res.redirect('/');
        
      } catch (error) {
        console.error("OAuth Error:", error);
        return res.status(500).json({ error: "Failed to negotiate token exchange with Clio." });
      }
    } else {
      return res.status(400).json({ error: "No authorization code provided by Clio." });
    }
  } 
  
  // ==========================================
  // ROUTE B: DATA TRANSMISSION (POST Request)
  // ==========================================
  else if (req.method === 'POST') {
    const { logText } = req.body;
    
    // TODO: Fetch the current access token from Supabase
    // For right now, we will simulate not having a token to trigger the redirect
    let accessToken = null; 
    
    // 1. If we do not have a token, command the frontend to redirect to Clio
    if (!accessToken) {
      const authUrl = `https://ca.app.clio.com/oauth/authorize?response_type=code&client_id=${CLIO_CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`;
      
      return res.status(401).json({ 
        error: 'AUTH_REQUIRED', 
        url: authUrl 
      });
    }

    // 2. If we DO have a token, transmit the payload to Clio Grow
    try {
      // NOTE: This URL targets Clio Grow. We can adjust this for Clio Manage later.
      const clioResponse = await fetch('https://ca.grow.clio.com/api/v1/notes', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          data: {
            // Clio Grow specific payload structure goes here
            content: logText 
          }
        })
      });

      if (!clioResponse.ok) {
         // If we get a 401 here, it means the token expired. We will need to write refresh logic later.
         throw new Error("Clio Grow rejected the payload.");
      }

      return res.status(200).json({ success: true });

    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  } 

  // Fallback for unsupported methods
  else {
    res.setHeader('Allow', ['GET', 'POST', 'OPTIONS']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
