const axios = require('axios');

export default async function handler(req, res) {
    const { code } = req.query;
    if (!code) return res.status(400).json({ error: 'Missing code' });

    try {
        const response = await axios.post('https://ca.auth.api.clio.com/oauth/token', {
            grant_type: 'authorization_code',
            code: code,
            client_id: process.env.CLIO_CLIENT_ID,
            client_secret: process.env.CLIO_CLIENT_SECRET,
            redirect_uri: "https://worktimeline-app.vercel.app"
        });
        res.status(200).json(response.data);
    } catch (error) {
        res.status(500).json({ error: 'Auth Exchange Failed' });
    }
}
// Add this helper logic to your existing data event listeners
function handleTimelineStateChange(actionType) {
    if (actionType === 'start_new_overlap') {
        // Triggers the relatable note when a parallel timeline is opened
        WorkTimelineCompliance.triggerNotification('newTimelineStarted');
    } else if (actionType === 'lock_entry') {
        // Triggers the security confirmation note when an entry seals
        WorkTimelineCompliance.triggerNotification('entryLocked');
    }
}
