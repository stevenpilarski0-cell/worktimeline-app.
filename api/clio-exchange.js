const axios = require('axios');

export default async function handler(req, res) {
    const { code } = req.query;
    if (!code) return res.status(400).json({ error: 'No code provided' });

    try {
        const response = await axios.post('https://ca.auth.api.clio.com/oauth/token', {
            grant_type: 'authorization_code',
            code: code,
            client_id: process.env.CLIO_CLIENT_ID,
            client_secret: process.env.CLIO_CLIENT_SECRET,
            redirect_uri: "https://worktimeline-app.vercel.app"
        });

        // Send token back to frontend to be saved in localStorage
        res.status(200).json(response.data);
    } catch (error) {
        res.status(500).json({ error: 'Exchange Failed', details: error.response?.data });
    }
}
