// api/sync.js
import { createClient } from '@supabase/supabase-js';

// 1. INITIALIZE SUPABASE CLIENT
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  // 2. STAGE GLOBAL CORS HEADERS FOR FRONTIEND COHESION
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*'); 
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  // Handle browser preflight checks instantly
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Extract calibrated environment variables 
  const CLIO_CLIENT_ID = process.env.CLIO_CLIENT_ID;
  const CLIO_CLIENT_SECRET = process.env.CLIO_CLIENT_SECRET;
  const REDIRECT_URI = process.env.REDIRECT_URI; 

  // ===================================================
  // ROUTE A: GET REQUEST (Clio Handshake Redirect Gate)
  // ===================================================
  if (req.method === 'GET') {
    const { code } = req.query;
    
    if (code) {
      try {
        // Exchange the authorization code string for formal secure access tokens
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

        // Commit tokens safely into your dedicated single-row clio_auth table
        const { error: dbError } = await supabase
          .from('clio_auth')
          .upsert({ 
            id: 1, 
            access_token: tokenData.access_token, 
            refresh_token: tokenData.refresh_token 
          });

        if (dbError) {
          console.error("Supabase Storage Error Details:", dbError);
          throw new Error('Failed to commit secure tokens to Supabase storage.');
        }

        console.log("Handshake successful. Vault authorized.");

        // Safe return redirect path back to your clean home page
        return res.redirect('/');
        
      } catch (error) {
        console.error("OAuth Processing Failure:", error);
        return res.status(500).json({ error: "Failed to complete security handshake negotiation." });
      }
    } else {
      return res.status(400).json({ error: "Clio Authorization protocol did not supply a verification code." });
    }
  } 
  
  // ===================================================
  // ROUTE B: POST REQUEST (Frontend Incident Log Transmit)
  // ===================================================
  else if (req.method === 'POST') {
    const { logText } = req.body;
    
    try {
      // Query Supabase for the current token matrix matching ID row 1
      const { data: authData, error: fetchError } = await supabase
        .from('clio_auth')
        .select('access_token')
        .eq('id', 1)
        .maybeSingle();
      
      const accessToken = authData ? authData.access_token : null;
      
      // If zero active access tokens are found inside Supabase, pass authorization directives back to UI
      if (!accessToken) {
        const authUrl = `https://ca.app.clio.com/oauth/authorize?response_type=code&client_id=${CLIO_CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`;
        
        return res.status(401).json({ 
          error: 'AUTH_REQUIRED', 
          url: authUrl 
        });
      }

      // If token exists, map the structured payload and dispatch straight into Clio Grow
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
              subject: "WorkTimeline Verification Signature",
              body: logText
            }
          }
        })
      });

      const clioResult = await clioResponse.json();

      if (!clioResponse.ok) {
         console.error("Clio System Data Response:", clioResult);
         throw new Error(clioResult.errors?.[0]?.detail || "Clio Platform rejected incoming logging schema.");
      }

      return res.status(200).json({ success: true, data: clioResult });

    } catch (error) {
      console.error("Data Transmission Stack Error:", error);
      return res.status(500).json({ error: error.message });
    }
  } 

  // Edge-case catch for unapproved protocols
  else {
    res.setHeader('Allow', ['GET', 'POST', 'OPTIONS']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
