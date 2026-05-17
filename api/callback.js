// /api/callback.js (Vercel Serverless Function Engine)

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { code, state, error: clioError, error_description } = req.query;

  if (clioError) {
    return res.status(400).json({ error: clioError, description: error_description });
  }

  if (!code || !state) {
    return res.status(400).json({ error: 'Missing code or state architecture parameters.' });
  }

  try {
    // 1. Reverse the URL-safe Base64 state payload to recover the verifier
    let base64State = state.replace(/-/g, '+').replace(/_/g, '/');
    while (base64State.length % 4) { base64State += '='; }
    const decodedStateText = Buffer.from(base64State, 'base64').toString('utf-8');
    const parsedState = JSON.parse(decodedStateText);
    const codeVerifier = parsedState.verifier;

    if (!codeVerifier) {
      throw new Error('Cryptographic code_verifier could not be retrieved from state matrix.');
    }

    // 2. Setup constants matching your verified platform configurations
    const TOKEN_ENDPOINT = 'https://ca.auth.api.clio.com/oauth/token';
    const CLIENT_ID = '18C4eBAD8YThRDG04xn_-rs8XQTdc0ZJyhPefMZR-0s';
    
    // Fixed domain match (Corrected from .com to .app to resolve the parsing conflict)
    const REDIRECT_URI = 'https://worktimeline-app.vercel.app/api/callback';

    // 3. Assemble x-www-form-urlencoded payload data
    const tokenPayload = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: CLIENT_ID,
      code: code,
      redirect_uri: REDIRECT_URI,
      code_verifier: codeVerifier
    });

    // 4. Dispatch verification query to Canadian Node
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
      return res.status(response.status).json({ error: 'Token handshake layout rejected.', details: responseData });
    }

    // Success! Tokens fetched seamlessly.
    return res.status(200).json({
      status: 'Synchronized',
      firm_context: parsedState.pilot_firm,
      credentials: {
        access_token: responseData.access_token,
        expires_in: responseData.expires_in
      }
    });

  } catch (error) {
    return res.status(500).json({ error: 'Internal Handshake Failure Exception', details: error.message });
  }
}
