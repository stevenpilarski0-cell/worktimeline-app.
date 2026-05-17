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
        // Restructured payload explicitly for the Clio Grow Lead Capture endpoint
        const leadPayload = {
            inbox_lead: {
                first_name: "WorkTimeline",
                last_name: "Log Entry",
                email: "stevenpilarski0@gmail.com",
                description: `TIMESTAMPED CHRONOLOGY STATEMENT:\n\n${logText}\n\n--------------------------------------------\nMETADATA:\n- Target Firm ID: 01KPZB4ZCXHE3Z92S1KM3AT96V\n- Security Protocol: Lead Capture Pipeline`,
                status: "received"
            }
        };

        // Pushing directly to Clio Grow's dedicated Lead Intake endpoint
        const growResponse = await fetch('https://ca.grow.clio.com/api/v1/inbox_leads', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${staticToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(leadPayload)
        });

        const responseText = await growResponse.text();

        if (!growResponse.ok) {
            throw new Error(`Clio rejected the lead sync. Server says: ${responseText}`);
        }

        return res.status(200).json({ success: true });

    } catch (err) {
        console.error('Sync Error:', err.message);
        return res.status(500).json({ error: err.message });
    }
}
