// api/sync.js
export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    const { logText } = req.body;
    const staticToken = process.env.CLIO_GROW_API_TOKEN;

    if (!staticToken) {
        return res.status(500).json({ error: 'System Error: CLIO_GROW_API_TOKEN is missing.' });
    }

    try {
        const growPayload = {
            note: {
                subject: "WorkTimeline - Contemporaneous Log",
                body: `TIMESTAMPED CHRONOLOGY STATEMENT:\n\n${logText}\n\n--------------------------------------------\nMETADATA:\n- Target Firm ID: 01KPZB4ZCXHE3Z92S1KM3AT96V\n- Operator: Stephen Pilarski\n- Date: ${new Date().toISOString()}`
            }
        };

        const growResponse = await fetch('https://ca.api.clio.com/grow/api/v1/notes', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${staticToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(growPayload)
        });

        // SAFE TEXT CHECK: Reads raw server response first to stop the 'Unexpected token A' crash
        const responseText = await growResponse.text();

        if (!growResponse.ok) {
            throw new Error(`Clio rejected the sync. Server says: ${responseText}`);
        }

        return res.status(200).json({ success: true });

    } catch (err) {
        console.error('Sync Error:', err.message);
        return res.status(500).json({ error: err.message });
    }
}
