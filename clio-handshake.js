// api/clio-handshake.js

export default async function handler(req, res) {
    // This endpoint handles the initial user request to connect the app to Clio
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed. Use GET to initialize authorization.' });
    }

    try {
        const clientId = process.env.CLIO_CLIENT_ID;
        const redirectUri = process.env.CLIO_REDIRECT_URI;

        if (!clientId || !redirectUri) {
            return res.status(500).json({ 
                error: 'Configuration missing. Ensure CLIO_CLIENT_ID and CLIO_REDIRECT_URI are set in Vercel.' 
            });
        }

        // Construct the official Clio Canadian OAuth 2.0 Identity Server URL
        const authUrl = `https://ca.app.clio.com/oauth/authorize?` + 
            `response_type=code&` +
            `client_id=${encodeURIComponent(clientId)}&` +
            `redirect_uri=${encodeURIComponent(redirectUri)}&` +
            `scope=notes%20matters%20contacts`; // Requesting precise operational scopes

        // Redirect the user's browser directly to the secure Clio Authorization Screen
        res.writeHead(302, { Location: authUrl });
        res.end();

    } catch (error) {
        console.error('Handshake Initializer Error:', error.message);
        return res.status(500).json({ error: 'Failed to initialize security handshake.', details: error.message });
    }
}

