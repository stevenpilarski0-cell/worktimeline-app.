const axios = require('axios');

export default async function handler(req, res) {
    const { logs, targetId, platform, token } = req.body;
    const config = {
        GROW: { url: "https://ca.api.clio.com/grow/notes", headers: { 'X-REGION': 'CA' } },
        MANAGE: { url: "https://ca.app.clio.com/api/v4/activities.json", headers: {} }
    };
    const selected = config[platform];

    try {
        const syncPromises = logs.map(log => {
            const body = `${log.text}\n\nSTAMP: ${log.stamp}${log.isGold ? '\nAI AUDIT: ' + log.patternInsight : ''}`;
            const payload = platform === 'GROW' ? 
                { data: { content: body, subject: "Timeline Sync", contact_id: parseInt(targetId) } } :
                { data: { type: "TimeEntry", note: body, date: new Date().toISOString().split('T')[0], matter: { id: parseInt(targetId) } } };

            return axios.post(selected.url, payload, { headers: { 'Authorization': `Bearer ${token}`, ...selected.headers } });
        });
        await Promise.all(syncPromises);
        res.status(200).json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Sync Failed' });
    }
}
