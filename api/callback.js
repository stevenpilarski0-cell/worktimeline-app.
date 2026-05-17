// api/callback.js

export default async function handler(req, res) {
    // 1. Capture the temporary authorization code returned by Clio
    const { code, error } = req.query;

    if (error) {
        console.error('Clio Handshake Denied by User:', error);
        return res.status(400).send(`Authorization Denied: ${error}`);
    }

    if (!code) {
        return res.status(400).send('Missing authorization code from Clio infrastructure.');
    }

    // 2. Exact configuration variables matching your Clio Developer Portal screen
    const clientId = process.env.CLIO_CLIENT_ID || '18C4aBAD8YThRDG04xn_-rs8XQTdc0ZJyhPefMZR-0s';
    const clientSecret = process.env.CLIO_CLIENT_SECRET; // Pulled securely from Vercel env
    const redirectUri = 'https://worktimeline-app.vercel.app/api/callback';

    try {
        // 3. Trade the temporary code for a secure, authenticated Account Token
        const tokenResponse = await fetch('https://ca.app.clio.com/oauth/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                code: code,
                client_id: clientId,
                client_secret: clientSecret,
                redirect_uri: redirectUri
            })
        });

        const tokenData = await tokenResponse.json();

        if (!tokenResponse.ok) {
            throw new Error(tokenData.error_description || tokenData.error || 'Token exchange failed.');
        }

        // 4. Capture the Fresh Access Token
        const accessToken = tokenData.access_token;

        // 5. Bounce the user back to your timeline panel, passing the token safely in the URL
        res.writeHead(302, { 
            Location: `/timeline.html?token=${encodeURIComponent(accessToken)}` 
        });
        res.end();

    } catch (err) {
        console.error('Callback Pipeline Exchange Failure:', err.message);
        return res.status(500).send(`Pipeline Exchange Failed: ${err.message}`);
    }
}
