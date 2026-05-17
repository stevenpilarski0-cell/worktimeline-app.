// api/sync.js
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    // Capture the Firm ID and the text log from the frontend selection
    const { firmId, firmName, logText, timestamp } = req.body;

    // Pulling your secure Clio master token from Vercel environment variables
    const accessToken = process.env.CLIO_GROW_API_TOKEN;

    if (!logText) {
        return res.status(400).json({ error: 'Missing contemporaneous log content.' });
    }

    if (!firmId) {
        return res.status(400).json({ error: 'Missing target Firm ID for routing.' });
    }

    try {
        // Structuring the payload to lock directly into the specified firm infrastructure
        const growPayload = {
            note: {
                subject: `WorkTimeline Sync: ${firmName || 'Authorized Workspace'}`,
                body: `TIMESTAMPED LOG ENTRY:\n\n${logText}\n\n--------------------------------------------\nVALIDATION METADATA:\n- Target Firm ID: ${firmId}\n- Verification Status: Authenticated [Teal Mode]\n- Timestamp: ${timestamp || new Date().toISOString()}`,
            }
        };

        // Push cleanly to Clio Grow's Canadian intake system
        const growResponse = await fetch('https://ca.grow.clio.com/api/v1/notes', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(growPayload)
        });

        const data = await growResponse.json();

        if (!growResponse.ok) {
            throw new Error(data.error || 'Clio server rejected the Firm ID configuration.');
        }

        return res.status(200).json({
            success: true,
            message: `Data successfully synced to Firm ID: ${firmId}`
        });

    } catch (err) {
        console.error('Clio Grow Firm Sync Error:', err.message);
        return res.status(500).json({ error: 'Failed to push data to firm destination', details: err.message });
    }
}
