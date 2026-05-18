// api/sync.js
const { createClient } = require('@supabase/supabase-js');

// Initialize permanent Supabase communication bridge
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = async function handler(req, res) {
  // Establish explicit cross-origin resource sharing access rules
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*'); 
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const CLIO_CLIENT_ID = process.env.CLIO_CLIENT_ID;
  const CLIO_CLIENT_SECRET = process.env.CLIO_CLIENT_SECRET;
  const REDIRECT_URI = process.env.REDIRECT_URI; 

  // ===================================================
  // ENDPOINT PHASE 1: OAuth Code Handshake Interceptor (GET)
  // ===================================================
  if (req.method === 'GET') {
    const { code } = req.query;
    
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

        // Lock access and refresh keys safely into Supabase row ID 1
        const { error: dbError } = await supabase
          .from('clio_auth')
          .upsert({ 
            id: 1, 
            access_token: tokenData.access_token, 
            refresh_token: tokenData.refresh_token 
          });

        if (dbError) throw dbError;

        // Redirect user right back to the root application screen
        return res.redirect('/');
        
      } catch (error) {
        console.error("OAuth Processing Failure:", error);
        return res.status(500).json({ error: "Failed to process internal vault handshake verification tokens." });
      }
    } else {
      return res.status(400).json({ error: "Missing authorization validation parameters." });
    }
  } 
  
  // ===================================================
  // ENDPOINT PHASE 2: Dispatch Log Entry payload to Clio Grow (POST)
  // ===================================================
  else if (req.method === 'POST') {
    const { logText } = req.body;
    
    try {
      // Pull down the token data stored inside your row 1 profile
      const { data: authData } = await supabase
        .from('clio_auth')
        .select('access_token')
        .eq('id', 1)
        .maybeSingle();
      
      const accessToken = authData ? authData.access_token : null;
      
      // If missing, generate the exact callback url mapping to push the browser to Clio
      if (!accessToken) {
        const authUrl = `https://ca.app.clio.com/oauth/authorize?response_type=code&client_id=${CLIO_CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`;
        return res.status(401).json({ error: 'AUTH_REQUIRED', url: authUrl });
      }

      // Format payload to comply directly with Clio Grow structural rules
      const clioResponse = await fetch('https://ca.grow.clio.com/api/v1/notes', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          data: {
            type: "notes",
            attributes: {
              subject: "WorkTimeline Log Verification Entry",
              body: logText
            }
          }
        })
      });

      const clioResult = await clioResponse.json();

      if (!clioResponse.ok) {
         console.error("Clio Engine Outbound Error:", clioResult);
         throw new Error(clioResult.errors?.[0]?.detail || "Clio Platform rejected payload validation rules.");
      }

      return res.status(200).json({ success: true, data: clioResult });

    } catch (error) {
      console.error("API Transmission Crash:", error);
      return res.status(500).json({ error: error.message });
    }
  } 
  
  else {
    res.setHeader('Allow', ['GET', 'POST', 'OPTIONS']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
};
