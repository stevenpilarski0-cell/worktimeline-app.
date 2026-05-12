// api/clio-exchange.js

export default async function handler(req, res) {
    // 1. Pull the keys from your Vercel Dashboard
    // 'CLIO_CLIENT_SECRET' matches the entry in 1000026120.jpg exactly.
    const { 
        CLIO_CLIENT_ID, 
        CLIO_CLIENT_SECRET, 
        NEXT_PUBLIC_CLIO_REDIRECT_URI 
    } = process.env;

    const { code } = req.query; // Code provided by Clio after user login

    // Phase 1: If no code yet, redirect user to Clio login
    if (!code) {
        const authUrl = `https://ca.app.clio.com/oauth/authorize?response_type=code&client_id=${CLIO_CLIENT_ID}&redirect_uri=${encodeURIComponent(NEXT_PUBLIC_CLIO_REDIRECT_URI)}&scope=identity%20leads`;
        return res.redirect(authUrl);
    }

    try {
        // Phase 2: Exchange Handshake Code for the Access Token
        const response = await fetch('https://ca.app.clio.com/oauth/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: CLIO_CLIENT_ID,
                client_secret: CLIO_CLIENT_SECRET,
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: NEXT_PUBLIC_CLIO_REDIRECT_URI
            })
        });

        const tokenData = await response.json();

        if (tokenData.access_token) {
            // Phase 3: Success! Create a Lead in Clio Grow
            // You can map your 'vault' data here in a later step
            await fetch('https://grow.clio.com/api/v1/leads', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${tokenData.access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    data: {
                        attributes: {
                            description: "New Evidence Package synced from WorkTimeline™.",
                            status: "New"
                        }
                    }
                })
            });

            // Redirect back to your app with a success indicator
            return res.redirect('/index.html?clio_status=success');
        }
    } catch (error) {
        console.error("Clio Auth Error:", error);
        return res.redirect('/index.html?clio_status=error');
    }
}
