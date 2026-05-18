// api/sync.js

export default async function handler(req, res) {
  // 1. Handle CORS Preflight Request
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*'); // Update '*' to your specific domain in production
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(200).end();
  }

  // Set standard CORS headers for all other responses
  res.setHeader('Access-Control-Allow-Origin', '*');

  // 2. Handle the GET request (Clio OAuth Callback)
  if (req.method === 'GET') {
    const { code, state, error } = req.query;

    if (error) {
      return res.redirect('/?status=error&message=' + encodeURIComponent(error));
    }

    if (code) {
      // TODO: Exchange 'code' for access_token and refresh_token via ca.app.clio.com
      // TODO: Save BOTH tokens to Supabase
      
      // After saving, redirect user back to the app interface
      return res.redirect('/?status=connected');
    }

    return res.status(400).json({ error: 'Missing authorization code' });
  }

  // 3. Handle the POST request (Frontend Data Transmission)
  if (req.method === 'POST') {
    try {
      const { noteText } = req.body;

      // TODO: Fetch token from Supabase
      let accessToken = "YOUR_SUPABASE_ACCESS_TOKEN"; 
      let refreshToken = "YOUR_SUPABASE_REFRESH_TOKEN"; // You will need this!

      if (!accessToken) {
        // Build the dynamic URL
        const authUrl = `https://ca.app.clio.com/oauth/authorize?response_type=code&client_id=${process.env.CLIO_CLIENT_ID}&redirect_uri=${encodeURIComponent('https://yourdomain.com/api/sync')}&state=random_string`;
        
        return res.status(401).json({ 
          error: 'AUTH_REQUIRED', 
          authUrl: authUrl 
        });
      }

      // Attempt to transmit data to Clio Grow
      let clioResponse = await fetch('https://ca.grow.clio.com/api/v1/notes', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ data: { body: noteText } })
      });

      // 4. THE REFRESH BLINDSPOT FIX
      if (clioResponse.status === 401) {
         console.log("Token expired. Attempting refresh...");
         // TODO: POST to ca.app.clio.com/oauth/token with grant_type=refresh_token
         // TODO: Update Supabase with the new access_token
         // TODO: Retry the original ca.grow.clio.com fetch with the NEW token
      }

      if (!clioResponse.ok) {
         throw new Error(`Clio API Error: ${clioResponse.status}`);
      }

      return res.status(200).json({ success: true, message: "Timeline logged!" });

    } catch (error) {
      console.error("Sync Error:", error);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  }

  // If method is neither GET, POST, nor OPTIONS
  return res.status(405).json({ error: 'Method Not Allowed' });
}
