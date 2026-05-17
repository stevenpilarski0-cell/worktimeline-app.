/**
 * GET /api/callback
 * 
 * Finalizes the server-side Clio Canada OAuth 2.0 handshake for WorkTimeline™.
 * Decodes the custom PKCE state payload, extracts the verifier, executes the
 * server-to-server token exchange, and returns the token to the application view layer.
 */

export default async function handler(req, res) {
  // 1. Capture incoming query parameters from Clio Canada
  const { code, error, state } = req.query;

  if (error) {
    return res.status(400).json({ error: `Clio Gateway Authorization Failure: ${error}` });
  }

  if (!code || !state) {
    return res.status(400).json({ error: 'Security Handshake Aborted: Missing code or state parameters.' });
  }

  try {
    // 2. Reconstruct the base64 string from the URL-safe state and decode it
    let base64 = state.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    
    const decodedStateString = Buffer.from(base64, 'base64').toString('utf-8');
    const statePayload = JSON.parse(decodedStateString);
    
    // Extract the frontend code verifier required by the PKCE validation process
    const codeVerifier = statePayload.verifier;

    if (!codeVerifier) {
      throw new Error('Verification failure: code_verifier not found in state telemetry.');
    }

    // 3. Load secret credentials securely stored inside your Vercel Environment Settings
    const clientId = process.env.CLIO_CLIENT_ID;
    const clientSecret = process.env.CLIO_CLIENT_SECRET;
    const redirectUri = process.env.REDIRECT_URI || 'https://worktimeline-app.vercel.app/api/callback';

    // 4. Post the payload directly to the Clio Canada token engine
    const tokenResponse = await fetch('https://ca.auth.api.clio.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        code_verifier: codeVerifier // Proves this request originated from your frontend script
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      throw new Error(tokenData.error_description || tokenData.error || 'Token exchange failed.');
    }

    /**
     * 5. Handshake Complete!
     * Redirect the user back to your main high-fidelity mobile view dashboard interface,
     * passing the access token safely inside a secure URL hash fragment (#).
     */
    return res.redirect(302, `/#access_token=${tokenData.access_token}`);

  } catch (err) {
    console.error('Critical Serverless Callback Exception:', err);
    return res.status(500).json({ error: 'Internal Server Error during serverless token authentication.' });
  }
}
