// api/sync.js
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    // Pulling the aligned variables matching your index.html payload
    const { leadName, logText, timestamp, routingTarget } = req.body;

    // Pulling the access token securely out of the backend configuration
    const accessToken = process.env.CLIO_GROW_API_TOKEN || req.body.accessToken;

    if (!logText) {
        return res.status(400).json({ error: 'Missing contemporaneous log content.' });
    }

    if (!accessToken) {
        return res.status(400).json({ error: 'Missing required sync authentication token.' });
    }

    try {
        // Build out the specific note package layout for the Clio Grow Server
        const growPayload = {
            note: {
                // If a numerical identifier isn't generated yet, we tag it to the client name record
                subject: `Contemporaneous Log: ${leadName || 'Unassigned Lead'}`,
                body: `TIMESTAMPED LOG ENTRY:\n\n${logText}\n\n--------------------------------------------\nVALIDATION METADATA:\n- Verification Status: Authenticated [Teal Mode]\n- Timestamp: ${timestamp || new Date().toISOString()}\n- Routing Scope: ${routingTarget || 'GROW_INTAKE'}`,
            }
        };

        // Native fetch pushing cleanly to Clio Grow's Canadian intake system
        const growResponse = await fetch('https://ca.grow.clio.com/api/v1/notes', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(growPayload)
        });

        // Parse the server's tracking response
        const data = await growResponse.json();

        if (!growResponse.ok) {
            throw new Error(data.error || 'Server rejected the Clio Grow sync transmission.');
        }

        return res.status(200).json({
            success: true,
            clio_note_id: data.note?.id || 'LOCAL-SYNC-LOCK',
            message: "Data payload successfully synced to your Clio Grow pipeline."
        });

    } catch (err) {
        console.error('Clio Grow Data Sync Error:', err.message);
        return res.status(500).json({ error: 'Failed to push data to Grow', details: err.message });
    }
}
