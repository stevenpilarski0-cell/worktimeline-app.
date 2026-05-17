export default async function handler(req, res) {
    const { code, error } = req.query;

    if (error) {
        return res.status(400).json({ error: `Authorization denied by user: ${error}` });
    }

    if (!code) {
        return res.status(400).json({ error: 'Missing authorization code from Clio.' });
    }

    try {
        const params = new URLSearchParams();
        params.append('client_id', process.env.CLIO_CLIENT_ID);
        params.append('client_secret', process.env.CLIO_CLIENT_SECRET);
        params.append('grant_type', 'authorization_code');
        params.append('code', code);
        params.append('redirect_uri', process.env.CLIO_REDIRECT_URI);

        // Native exchange targeting the Canadian Clio authentication hub
        const tokenResponse = await fetch('https://ca.app.clio.com/oauth/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: params
        });

        const data = await tokenResponse.json();

        if (!tokenResponse.ok) {
            throw new Error(data.error_description || data.error || 'Failed token exchange');
        }

        // Grabbing the valid access token issued by Clio
        const { access_token } = data;

        // STRATEGIC FIX: Securely pass the token to your UI inside the URL redirect 
        // This ensures timeline.html can extract it and store it in sessionStorage
        res.writeHead(302, { 
            Location: `/timeline.html?status=connected&token=${encodeURIComponent(access_token)}` 
        });
        res.end();

    } catch (err) {
        console.error('Clio Handshake Token Error:', err.message);
        return res.status(500).json({ error: 'Handshake failed', details: err.message });
    }
}
