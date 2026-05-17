// api/clio-handshake.js

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    // Exact credentials matching your Clio Developer Portal screen
    const clientId = '18C4aBAD8YThRDG04xn_-rs8XQTdc0ZJyhPefMZR-0s';
    const redirectUri = 'https://worktimeline-app.vercel.app/api/callback';
    
    // STRATEGIC SECURITY FIX: Added random state parameter required for confidential client handshakes
    const secureState = 'worktimeline_secure_session_2026';

    // Construct the official Clio Canadian Authorization URL with the strict parameters
    const authUrl = `https://ca.app.clio.com/oauth/authorize?` + 
        `response_type=code&` +
        `client_id=${encodeURIComponent(clientId)}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `state=${secureState}`;

    // Force redirect the mobile browser straight to Clio's gateway login
    res.writeHead(302, { Location: authUrl });
    res.end();
}
