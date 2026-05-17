/**
 * GET /api/callback
 * 
 * Finalizes the Clio Canada OAuth 2.0 handshake by securely exchanging the 
 * temporary authorization code for a functional access token on the server side.
 * 
 * Rules Preserved: 
 * - Zero sensitive credentials (CLIO_CLIENT_SECRET) leak to the client browser.
 * - Redirects back to the UI layout safely passing the token via a clean URL hash fragment.
 */

export default async function handler(req, res) {
  // 1. Capture incoming parameters from the Clio Canada redirect query string
  const { code, error } = req.query;

  // Handle explicit authorization denials or configuration mismatches from the provider
  if (error) {
    return res.status(400).json({ error: `Clio Authorization Failed: ${error}` });
  }

  // Guard against direct hits or malformed requests lacking an authorization code
  if (!code) {
    return res.status(400).json({ error: 'Security Handshake Aborted: Missing authorization code.' });
  }

  // 2. Load protected environment variables configured inside your Vercel Dashboard
  const clientId = process.env.CLIO_CLIENT_ID;
  const clientSecret = process.env.CLIO_CLIENT_SECRET;
  const redirectUri = process.env.REDIRECT_URI || 'https://worktimeline-app.vercel.app/api/callback';

  try {
    // 3. Execute the server-to-server POST request directly to the Clio Canada cluster
    const response = await fetch('https://ca.api.clio.com/oauth/token', {
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
      }),
    });

    const data = await response.json();

    // Catch application-level OAuth rejections (e.g., expired codes or bad secrets)
    if (!response.ok) {
      throw new Error(data.error_description || data.error || 'Failed to exchange token');
    }

    /**
     * 4. Safe Frontend Transmission Hook
     * We pass the resulting access_token back to your application root using a hash fragment (#).
     * 
     * Why a hash fragment? 
     * Web browsers do not send URL hash values to web servers in subsequent HTTP requests. 
     * This keeps the token strictly within your client-side JavaScript memory state 
     * and completely out of server log traces.
     */
    res.redirect(302, `/#access_token=${data.access_token}`);

  } catch (err) {
    // Isolate exceptions securely within Vercel's server-side environment logs
    console.error('OAuth Code Exchange Error:', err);
    res.status(500).json({ error: 'Internal Server Error during security handshake exchange.' });
  }
}
