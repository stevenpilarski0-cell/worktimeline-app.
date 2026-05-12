// WorkTimeline™ | Production API Handshake & Lead Creation
export const CLIO_CONFIG = {
    clientId: "18C4aBAD8YThRDG04xn_-rs8XQTdc0ZJy...", // From your screenshot
    redirectUri: "https://worktimeline-app.vercel.app/api/clio-exchange",
    authUrl: "https://ca.app.clio.com/oauth/authorize",
    tokenUrl: "https://ca.app.clio.com/oauth/token",
    scopes: "identity leads_read"
};

export default async function handler(req, res) {
    const { code, state } = req.query;

    // Phase 1: If we have a code, exchange it for an Access Token
    if (code) {
        try {
            const tokenResponse = await fetch(CLIO_CONFIG.tokenUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    client_id: CLIO_CONFIG.clientId,
                    client_secret: process.env.CLIO_SECRET, // Use Vercel Env Var for Secret!
                    grant_type: 'authorization_code',
                    code: code,
                    redirect_uri: CLIO_CONFIG.redirectUri
                })
            });

            const data = await tokenResponse.json();
            
            // Phase 2: Accept Bid & Create Lead in Clio Grow
            // This is the trigger you asked for
            const leadRes = await fetch('https://grow.clio.com/api/v1/leads', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${data.access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    data: {
                        attributes: {
                            description: "Accepted Bid from WorkTimeline Marketplace",
                            status: "New"
                            // Map your 'Evidence Summary' here
                        }
                    }
                })
            });

            return res.redirect('/?clio=connected');
        } catch (error) {
            return res.redirect('/?clio=error');
        }
    }

    // Phase 0: Start Handshake
    const params = new URLSearchParams({
        response_type: 'code',
        client_id: CLIO_CONFIG.clientId,
        redirect_uri: CLIO_CONFIG.redirectUri,
        scope: CLIO_CONFIG.scopes
    });

    res.redirect(`${CLIO_CONFIG.authUrl}?${params.toString()}`);
}
