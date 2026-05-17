// api/sync.js
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    // Clio Grow identifies records primarily by lead/matter ID or email
    const { leadId, logText, timestamp, referenceId, accessToken } = req.body;

    if (!leadId || !logText || !accessToken) {
        return res.status(400).json({ error: 'Missing required sync data for Clio Grow.' });
    }

    try {
        // Formatting the payload specifically as a workflow note for a Grow Lead/Matter
        const growPayload = {
            note: {
                lead_id: parseInt(leadId, 10),
                body: `TIMESTAMPED LOG ENTRY:\n\n${logText}\n\n--------------------------------------------\nVALIDATION METADATA:\n- Verification Status: Authenticated (Teal Mode)\n- Timestamp: ${timestamp || new Date().toISOString()}\n- Reference ID: ${referenceId || 'WT-GROW'}`,
                subject: `Contemporaneous Log: ${referenceId || 'System Entry'}`
            }
        };

        // Native fetch pushing cleanly to Clio Grow's CA pipeline
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
            throw new Error(data.error || 'Failed to push note to Clio Grow');
        }

        return res.status(200).json({
            success: true,
            clio_note_id: data.note.id,
            message: "Data payload successfully synced to your Clio Grow pipeline."
        });

    } catch (err) {
        console.error('Clio Grow Data Sync Error:', err.message);
        return res.status(500).json({ error: 'Failed to push data to Grow', details: err.message });
    }
}
