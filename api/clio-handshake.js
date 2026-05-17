// api/clio-handshake.js
export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    // Your exact credentials from your Clio Developer Portal screenshot
    const clientId = '18C4aBAD8YThRDG04xn_-rs8XQTdc0ZJyhPefMZR-0s';
    const redirectUri = 'https://worktimeline-app.vercel.app/api/callback';

    // Requesting the standard base-level Clio identifiers
    const authUrl = `https://ca.app.clio.com/oauth/authorize?` + 
        `response_type=code&` +
        `client_id=${encodeURIComponent(clientId)}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}`;

    // Force redirect your browser straight to Clio's account picker screen
    res.writeHead(302, { Location: authUrl });
    res.end();
}
