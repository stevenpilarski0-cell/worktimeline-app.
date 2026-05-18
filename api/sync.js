// api/sync.js
const axios = require('axios');

module.exports = async (req, res) => {
    const { code } = req.query;

    if (!code) {
        return res.status(400).send('Error: Missing authorization code parameter.');
    }

    const CLIENT_ID = '18C4aBAD8YThRDG04xn_-rs8XQTdc0ZJyhPefMZR-0s'; 
    const REDIRECT_URI = 'https://worktimeline-app.vercel.app/api/sync';
    const FIRM_ID = '01KPZB4ZCXHE3Z92S1KM3AT96V'; 

    try {
        // PUBLIC ENGINE HANDSHAKE: Trading code using pure transaction verifiers without Client Secrets
        const tokenExchangeResponse = await axios.post('https://ca.grow.clio.com/oauth/token', {
            grant_type: 'authorization_code',
            code: code,
            client_id: CLIENT_ID,
            redirect_uri: REDIRECT_URI
        });

        const accessToken = tokenExchangeResponse.data.access_token;

        const leadPayload = {
            inbox_lead: {
                from_first: "WorkTimeline",
                from_last: "Intake Suite",
                from_source: "Public PKCE Engine Suite",
                referring_url: REDIRECT_URI,
                from_message: `=== WORKTIMELINE™ PUBLIC COMPLIANT INTAKE ===\nFirm Identifier: ${FIRM_ID}\nStatus: Public PKCE Bridge Pipeline Sync Complete.`
            }
        };

        // Post validated message objects right down into your Lead Inbox 
        await axios.post('https://ca.grow.clio.com/api/v4/inbox_leads.json', leadPayload, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });

        return res.redirect('/?sync=success');

    } catch (error) {
        console.error('Handshake Failure:', error.response ? error.response.data : error.message);
        return res.status(500).send(`Public Synchronization Handshake Failure: ${error.message}`);
    }
};
