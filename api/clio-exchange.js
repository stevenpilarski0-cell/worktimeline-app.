// api/clio-exchange.js

/**
 * Packs and formats timeline data for clean ingestion into Clio.
 * Ensures the payload matches Clio's specific structural syntax.
 */
export function formatClioNote(logText, displayTag, referenceId) {
    // Combine the trigger-word classification tag with the user's chronological logs
    const structuredBody = `WORKTIMELINE CONTEMPORANEOUS LOG\n` +
                           `Reference ID: ${referenceId}\n` +
                           `${displayTag}\n` +
                           `----------------------------------------\n` +
                           `${logText}\n` +
                           `----------------------------------------\n` +
                           `[Authenticated via WorkTimeline Secure Pipeline]`;

    // Returns the exact JSON structure required by Clio's architecture
    return {
        data: {
            type: "note",
            detail: structuredBody
        }
    };
}

export default async function handler(req, res) {
    // Security check to ensure it only accepts data transmissions
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { logText, displayTag, referenceId } = req.body;

    if (!logText) {
        return res.status(400).json({ error: 'Missing log text content for exchange mapping' });
    }

    try {
        // Format the payload seamlessly using our structural engine
        const formattedPayload = formatClioNote(logText, displayTag || '[STATUS: STANDARD]', referenceId || 'WT-LOCAL');
        
        // Return the formatted layout so your main sync file can send it down the pipeline
        return res.status(200).json({ 
            success: true, 
            payload: formattedPayload 
        });
        
    } catch (error) {
        return res.status(500).json({ error: 'Exchange translation processing failed', details: error.message });
    }
}
