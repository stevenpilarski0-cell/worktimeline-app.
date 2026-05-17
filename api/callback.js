// /api/callback.js (Vercel Serverless Function Engine)

export default async function handler(req, res) {
  // Only allow inbound GET requests from the Clio authorization redirection frame
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // 1. Extract the raw incoming query parameters dispatched by Clio
  const { code, state, error: clioError, error_description } = req.query;

  // Handle explicit rejections or cancellations from the user interface
  if (clioError) {
    console.error(`Clio Auth Gate returned an error: ${clioError} - ${error_description}`);
    return res.status(400).json({ error: clioError, description: error_description });
  }

  if (!code || !state) {
    return res.status(400).json({ error: 'Missing code or state architecture parameters.' });
  }

  try {
    // 2. Reverse the URL-safe Base64 adjustments applied on the frontend
    let base64State = state.replace(/-/g, '+').replace(/_/g, '/');
    while (base64State.length % 4) {
      base64State += '=';
    }

    // Decode the base64 string back into readable JSON text structures
    const decodedStateText = Buffer.from(base64State, 'base64').toString('utf-8');
    const parsedState = JSON.parse(decodedStateText);
    
    const codeVerifier = parsedState.verifier;
    if (!codeVerifier) {
      throw new Error('Cryptographic code_verifier could not be retrieved from state matrix.');
    }

    // 3. Define Gateway Target Vectors for Clio Grow (Canada Shard)
    const TOKEN_ENDPOINT = 'https://ca.auth.api.clio.com/oauth/token';
    const CLIENT_ID = '18C4eBAD8YThRDG04xn_-rs8XQTdc0ZJyhPefMZR-0s';
    const REDIRECT_URI = 'https://worktimeline-app.vercel.app/api/callback';

    // 4. Construct URL-encoded Form Parameters (NOT raw JSON)
    const tokenPayload = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: CLIENT_ID,
      code: code,
      redirect_uri: REDIRECT_URI,
      code_verifier: codeVerifier // Essential for matching the S256 challenge string
    });

    console.log('WorkTimeline Backend | Dispatching Token Request Sequence to Canadian Nodes...');

    // 5. Execute secure payload delivery via native fetch interfaces
    const response = await fetch(TOKEN_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: tokenPayload.toString()
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error('Clio Server Token Rejection Payload:', responseData);
      return res.status(response.status).json({
        error: 'Token handshake layout rejected.',
        details: responseData
      });
    }

    // 6. Success! Handshake complete. Ingest tokens securely.
    // responseData will contain: { access_token, token_type, expires_in, refresh_token }
    console.log('WorkTimeline Backend | Engine Handshake Finalized Successfully.');
    
    // Pass tokens back down to your persistent local state or store securely
    return res.status(200).json({
      status: 'Synchronized',
      message: 'WorkTimeline has locked link configurations to Clio Grow successfully.',
      firm_context: parsedState.pilot_firm,
      credentials: {
        access_token: responseData.access_token,
        expires_in: responseData.expires_in
      }
    });

  } catch (error) {
    console.error('Critical Server Execution Exception Failed:', error.message);
    return res.status(500).json({ error: 'Internal Handshake Failure Exception', details: error.message });
  }
}
