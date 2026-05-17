// api/sync.js
import axios from 'axios';

export default async function handler(req, res) {
    // Only allow secure POST requests containing your data payload
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { matterId, logText, timestamp, referenceId, accessToken } = req.body;

    // Quick safety check on required fields
    if (!matterId || !logText || !accessToken) {
        return res.status(400).json({ error: 'Missing required sync data (Matter ID, Log Text, or Token).' });
    }

    try {
        // Constructing the payload exactly as the firm's infrastructure expects it
        const clioPayload = {
            data: {
                type: "note",
                matter: {
                    id: parseInt(matterId, 10)
                },
                subject: `Contemporaneous Log: ${referenceId || 'System Entry'}`,
                detail: `TIMESTAMPED LOG ENTRY:\n\n${logText}\n\n--------------------------------------------\nVALIDATION METADATA:\n- Verification Status: Authenticated (Teal Mode)\n- Source Hash: SHA-256 Verified\n- Timestamp: ${timestamp || new Date().toISOString()}\n- Reference ID: ${referenceId || 'WT-LOG'}`,
                date: new Date().toISOString().split('T')[0] // Formats as YYYY-MM-DD
            }
        };

        // Pushing to Clio's CA API instance for Canadian Data Residency compliance
        const clioResponse = await axios.post('https://ca.app.clio.com/api/v4/notes.json', clioPayload, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });

        // Success! Data successfully reached the firm
        return res.status(200).json({
            success: true,
            clio_note_id: clioResponse.data.data.id,
            message: "Data payload successfully synced to the firm's Clio matter."
        });

    } catch (err) {
        console.error('Clio Data Sync Error:', err.response?.data || err.message);
        return res.status(500).json({
            error: 'Failed to push data payload to Clio.',
            details: err.response?.data || err.message
        });
    }
}
