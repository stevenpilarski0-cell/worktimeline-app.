// api/callback.js
import axios from 'axios';

export default async function handler(req, res) {
    // 1. Catch the temporary authorization code sent by Clio
    const { code, error } = req.query;

    // Handle any access denials or user cancellations
    if (error) {
        return res.status(400).json({ error: `Authorization denied by user: ${error}` });
    }

    if (!code) {
        return res.status(400).json({ error: 'Missing authorization code from Clio.' });
    }

    try {
        // 2. Exchange the temporary code for permanent access tokens
        // Always targeting the ca.app.clio.com endpoint for Canadian Data Residency
        const tokenResponse = await axios.post('https://ca.app.clio.com/oauth/token', {
            client_id: process.env.CLIO_CLIENT_ID,
            client_secret: process.env.CLIO_CLIENT_SECRET,
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: process.env.CLIO_REDIRECT_URI
        }, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        // The secure tokens returned by the firm's system
        const { access_token, refresh_token, expires_in } = tokenResponse.data;

        // 3. TODO: Save these tokens securely (e.g., in your database or encrypted session)
        // For security, never expose the raw access_token to the frontend index.html

        // 4. Redirect the user back to your main timeline interface on success
        res.writeHead(302, { Location: '/timeline.html?status=connected' });
        res.end();

    } catch (err) {
        console.error('Clio Handshake Token Exchange Error:', err.response?.data || err.message);
        return res.status(500).json({ 
            error: 'Failed to exchange authentication code with Clio.', 
            details: err.response?.data || err.message 
        });
    }
}
