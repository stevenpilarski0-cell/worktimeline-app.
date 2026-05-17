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
        // Formatted exactly to match Clio Grow's legacy Lead Inbox validation schemas
        const leadPayload = {
            inbox_lead: {
                from_first: "WorkTimeline",
                from_last: "Log Entry",
                from_email: "stevenpilarski0@gmail.com",
                from_message: `TIMESTAMPED CHRONOLOGY STATEMENT:\n\n${logText}\n\n--------------------------------------------\nMETADATA:\n- Target Firm ID: 01KPZB4ZCXHE3Z92S1KM3AT96V`,
                from_source: "WorkTimeline Integration",
                referring_url: "https://worktimeline-app.vercel.app"
            }
        };

        // TARGET URL: Shifted directly to Clio Canada's absolute inbox portal endpoint
        const growResponse = await fetch('https://ca.grow.clio.com/inbox_leads', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${staticToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(leadPayload)
        });

        const responseText = await growResponse.text();

        // Clio returns a 201 Created status code upon transmission success
        if (!growResponse.ok && growResponse.status !== 201) {
            throw new Error(`Clio rejected validation. Server status: ${growResponse.status}. Details: ${responseText}`);
        }

        return res.status(200).json({ success: true });

    } catch (err) {
        console.error('Sync Error:', err.message);
        return res.status(500).json({ error: err.message });
    }
}
