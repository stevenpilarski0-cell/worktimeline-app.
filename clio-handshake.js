const axios = require('axios');

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).send('Use POST');

    const { logs, targetId, platform } = req.body;
    const region = "CA"; // Canadian environment per your screenshot
    
    // Choose the right token based on the platform target
    const token = platform === 'GROW' 
        ? process.env.CLIO_GROW_CA_TOKEN 
        : process.env.CLIO_MANAGE_CA_TOKEN;

    const baseURL = platform === 'GROW' 
        ? "https://ca.api.clio.com/grow/notes" 
        : "https://ca.app.clio.com/api/v4/activities.json";

    try {
        const syncPromises = logs.map(log => {
            // Build the "Legal Truth" string
            const fullContent = `[${log.mode}] ${log.text}\n\nSTAMP: ${log.stamp}\n${log.isGold ? 'AI PATTERN VERIFIED: ' + log.patternInsight : 'RAW ENTRY'}`;

            const payload = platform === 'GROW' ? {
                data: {
                    content: fullContent,
                    subject: "WorkTimeline™ Precision Sync",
                    contact_id: targetId
                }
            } : {
                data: {
                    type: "TimeEntry",
                    note: fullContent,
                    date: new Date().toISOString().split('T')[0], // Activities need YYYY-MM-DD
                    matter: { id: parseInt(targetId) }
                }
            };

            return axios.post(baseURL, payload, {
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'X-REGION': region,
                    'Content-Type': 'application/json'
                }
            });
        });

        await Promise.all(syncPromises);
        res.status(200).json({ success: true, count: logs.length });
    } catch (error) {
        res.status(500).json({ error: error.message, details: error.response?.data });
    }
}
