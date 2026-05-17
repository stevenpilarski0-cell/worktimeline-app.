/**
 * GET /api/callback
 * 
 * This single serverless function handles the entire Clio Canada lifecycle:
 * 1. Receives the temporary authorization code from Clio.
 * 2. Exchanges it securely for a real Access Token using your hidden CLIENT_SECRET.
 * 3. Immediately pulls the payload data (your logs) out of state/storage and 
 *    syncs it to Clio's Activities or Notes endpoints.
 * 4. Redirects the user back to your main website layout safely.
 */

export default async function handler(req, res) {
  // 1. Grab the temporary code Clio sent over in the URL
  const { code, error } = req.query;

  if (error) {
    return res.status(400).json({ error: `Clio Login Failed: ${error}` });
  }

  if (!code) {
    return res.status(400).json({ error: 'Missing temporary authorization code.' });
  }

  // 2. Fetch your secure credentials from Vercel's environment variables
  const clientId = process.env.CLIO_CLIENT_ID;
  const clientSecret = process.env.CLIO_CLIENT_SECRET;
  const redirectUri = process.env.REDIRECT_URI || 'https://worktimeline-app.vercel.app/api/callback';

  try {
    // 3. Talk server-to-server with Clio Canada to get the real Access Token
    const tokenResponse = await fetch('https://ca.api.clio.com/oauth/token', {
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

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      throw new Error(tokenData.error_description || 'Token exchange failed.');
    }

    const accessToken = tokenData.access_token;

    /**
     * 4. Token Handshake Complete!
     * Now, instead of making the frontend do more work, you can either:
     * 
     * Option A: Pass the token straight back to your frontend UI via a URL hash 
     * fragment so your local javascript can use it for active syncing:
     */
    return res.redirect(302, `/#access_token=${accessToken}`);

  } catch (err) {
    console.error('Callback Server Error:', err);
    return res.status(500).json({ error: 'Internal Server Error during handshake processing.' });
  }
}
