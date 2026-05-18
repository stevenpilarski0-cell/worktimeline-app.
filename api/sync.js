// api/sync.js
const axios = require('axios');

module.exports = async (req, res) => {
    // Catch the authorization code returned by Clio Grow
    const { code } = req.query;

    if (!code) {
        return res.status(400).send('Error: Missing authorization code from Clio Grow.');
    }

    // --- EXACT CREDENTIAL MATCH FROM YOUR DASHBOARD SCREENSHOT ---
    const CLIENT_ID = '18C4aBAD8YThRDG04xn_-rs8XQTdc0ZJyhPefMZR-0s'; 
    const REDIRECT_URI = 'https://worktimeline-app.vercel.app/api/sync';
    const FIRM_ID = '01KPZB4ZCXHE3Z92S1KM3AT96V'; 
    
    // Pulled securely from Vercel's environment settings
    const CLIENT_SECRET = process.env.CLIO_GROW_SECRET; 

    try {
        // Step 1: Secure OAuth2 Handshake
        const tokenExchangeResponse = await axios.post('https://ca.app.clio.com/oauth/token', {
            grant_type: 'authorization_code',
            code: code,
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
            redirect_uri: REDIRECT_URI
        });

        const accessToken = tokenExchangeResponse.data.access_token;

        // Step 2: Build a compliant Lead Message structure
        const cleanMessageBody = `
=== WORKTIMELINE™ PRODUCTION INTAKE ===
Firm ID: ${FIRM_ID}
Status: High-Fidelity Intake Initialized Successfully.
Zero-Knowledge execution pipeline holding true.
        `.trim();

        // Step 3: Format the payload to match the Clio Grow inbox schema
        const leadPayload = {
            inbox_lead: {
                from_first: "WorkTimeline",
                from_last: "Intake Suite",
                from_source: "Production Build Integration",
                referring_url: REDIRECT_URI,
                from_message: cleanMessageBody
            }
        };

        // Step 4: Vault the data natively into your Clio Grow Lead Inbox
        await axios.post('https://ca.app.clio.com/api/v4/inbox_leads.json', leadPayload, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });

        // Redirect back home with a success flag
        return res.redirect('/?sync=success');

    } catch (error) {
        console.error('Clio Grow Sync Failure:', error.response ? error.response.data : error.message);
        return res.status(500).send(`Synchronization Bridge Failed: ${error.message}`);
    }
};
