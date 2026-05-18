// api/sync.js
export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') return res.status(200).end();

    const clientId = process.env.CLIO_CLIENT_ID;
    const clientSecret = process.env.CLIO_CLIENT_SECRET;
    
    // Explicit character-for-character match to your Clio developer profile screenshot
    const redirectUri = 'https://worktimeline-app.vercel.app/api/sync';

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    // ---- OAUTH HANDSHAKE RECEIVER (GET REQUEST FROM CLIO) ----
    if (req.method === 'GET' && req.query.code) {
        try {
            const tokenResponse = await fetch('https://ca.api.clio.com/oauth/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    grant_type: 'authorization_code',
                    code: req.query.code,
                    client_id: clientId,
                    client_secret: clientSecret,
                    redirect_uri: redirectUri
                })
            });

            const tokenData = await tokenResponse.json();

            if (!tokenResponse.ok) {
                return res.status(400).send(`OAuth Handshake Failed: ${JSON.stringify(tokenData)}`);
            }

            // Save the validated token into Supabase row 1
            const supabaseResponse = await fetch(`${supabaseUrl}/rest/v1/clio_auth?id=eq.1`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${supabaseKey}`,
                    'apikey': supabaseKey,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=minimal'
                },
                body: JSON.stringify({
                    access_token: tokenData.access_token,
                    updated_at: new Date().toISOString()
                })
            });

            if (!supabaseResponse.ok) {
                const dbError = await supabaseResponse.text();
                throw new Error(`Failed to save token to Supabase: ${dbError}`);
            }

            return res.redirect('/?status=connected');
        } catch (err) {
            return res.status(500).send(`Server Handshake Error: ${err.message}`);
        }
    }

    // ---- DATA TRANSMISSION PIPELINE (POST REQUEST FROM APP) ----
    if (req.method === 'POST') {
        const { logText } = req.body;

        try {
            const dbCheck = await fetch(`${supabaseUrl}/rest/v1/clio_auth?id=eq.1&select=access_token`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${supabaseKey}`,
                    'apikey': supabaseKey,
                    'Content-Type': 'application/json'
                }
            });

            const dbData = await dbCheck.json();
            const accessToken = dbData[0]?.access_token;

            if (!accessToken || accessToken === 'empty') {
                // Stripped down to bare essentials. Clio defaults to your profile checked boxes automatically
                const authUrl = `https://ca.api.clio.com/oauth/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}`;
                return res.status(401).json({ error: 'AUTH_REQUIRED', url: authUrl });
            }

            const growNotePayload = {
                note: {
                    subject: "WorkTimeline Log",
                    detail: logText,
                    client_id: "01KPZB4ZCXHE3Z92S1KM3AT96V"
                }
            };

            const clioResponse = await fetch('https://ca.grow.clio.com/api/v1/notes', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(growNotePayload)
            });

            if (!clioResponse.ok) {
                const errorText = await clioResponse.text();
                
                if (clioResponse.status === 401) {
                    await fetch(`${supabaseUrl}/rest/v1/clio_auth?id=eq.1`, {
                        method: 'PATCH',
                        headers: { 'Authorization': `Bearer ${supabaseKey}`, 'apikey': supabaseKey, 'Content-Type': 'application/json' },
                        body: JSON.stringify({ access_token: 'empty' })
                    });
                    return res.status(401).json({ error: 'AUTH_REQUIRED' });
                }
                throw new Error(`Clio API Rejected Entry: ${errorText}`);
            }

            return res.status(200).json({ success: true });

        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    }

    return res.status(405).json({ error: 'Method Not Allowed' });
}
