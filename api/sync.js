// api/sync.js
const axios = require('axios');

module.exports = async (req, res) => {
    const { code } = req.query;

    if (!code) {
        return res.status(400).send('Error: Missing authorization code parameter.');
    }

    // TARGETING YOUR RE-ALIGNED CLIO MANAGE APP CONFIGS
    const CLIENT_ID = 'btscu9WmPHYellZtZA9slQfynBAqudwjaR7pEDdq'; 
    const REDIRECT_URI = 'https://worktimeline-app.vercel.app/api/sync';
    const CLIENT_SECRET = process.env.CLIO_MANAGE_SECRET; 

    try {
        // Trade return authorization code for an operational access token
        const tokenExchangeResponse = await axios.post('https://ca.app.clio.com/oauth/token', {
            grant_type: 'authorization_code',
            code: code,
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
            redirect_uri: REDIRECT_URI
        });

        const accessToken = tokenExchangeResponse.data.access_token;

        // Structure a payload configuration matching Clio Manage's Activity API schema
        const activityPayload = {
            data: {
                type: "activity",
                note: "=== WORKTIMELINE™ LIVE INTAKE ===\nProduction pipeline verification successfully synchronized on the Canadian Clio Manage cluster feed logs.",
                activity_description: "WorkTimeline Dynamic Intake Sync"
            }
        };

        // Submit directly to your Canadian Clio Manage Activity database cluster
        await axios.post('https://ca.app.clio.com/api/v4/activities.json', activityPayload, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });

        return res.redirect('/?sync=success');

    } catch (error) {
        console.error('Handshake Failure:', error.response ? error.response.data : error.message);
        return res.status(500).send(`Manage Synchronization Handshake Failure: ${error.message}`);
    }
};
