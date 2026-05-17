// api/callback.js
export default async function handler(req, res) {
    const { code, error } = req.query;

    if (error) {
        return res.status(400).json({ error: `Authorization denied by user: ${error}` });
    }

    if (!code) {
        return res.status(400).json({ error: 'Missing authorization code from Clio.' });
    }

    try {
        // Construct the form data exactly as Clio expects
        const params = new URLSearchParams();
        params.append('client_id', process.env.CLIO_CLIENT_ID);
        params.append('client_secret', process.env.CLIO_CLIENT_SECRET);
        params.append('grant_type', 'authorization_code');
        params.append('code', code);
        params.append('redirect_uri', process.env.CLIO_REDIRECT_URI);

        // Native fetch call to Clio CA for Canadian data residency
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

        const { access_token, refresh_token } = data;

        // Redirect back to your main UI on success
        res.writeHead(302, { Location: '/timeline.html?status=connected' });
        res.end();

    } catch (err) {
        console.error('Clio Handshake Token Error:', err.message);
        return res.status(500).json({ error: 'Handshake failed', details: err.message });
    }
}
