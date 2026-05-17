// api/sync.js
export default async function handler(req, res) {
    // Force clean CORS headers so your frontend can communicate without browser blocking
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    // Handle preflight browser check
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { logText } = req.body;
    
    // Grabs your static token directly from Vercel's secret manager
    const staticToken = process.env.CLIO_GROW_API_TOKEN;

    if (!staticToken) {
        return res.status(500).json({ 
            error: 'System Error: CLIO_GROW_API_TOKEN is missing from your Vercel settings.' 
        });
    }

    if (!logText) {
        return res.status(400).json({ error: 'Missing log text content.' });
    }

    try {
        // Constructing a payload structure tailored directly for the Grow endpoint
        const growPayload = {
            note: {
                subject: "WorkTimeline - Contemporaneous Log",
                body: `TIMESTAMPED CHRONOLOGY STATEMENT:\n\n${logText}\n\n--------------------------------------------\nMETADATA:\n- Target Firm ID: 01KPZB4ZCXHE3Z92S1KM3AT96V\n- Operator: Stephen Pilarski\n- Date: ${new Date().toISOString()}`
            }
        };

        // Pushing live into Clio's primary Canadian endpoint authority
        const growResponse = await fetch('https://ca.api.clio.com/grow/api/v1/notes', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${staticToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(growPayload)
        });

        if (!growResponse.ok) {
            const errorDetails = await growResponse.text();
            throw new Error(`Clio Infrastructure Rejected Token Authentication. Details: ${errorDetails}`);
        }

        return res.status(200).json({ success: true });

    } catch (err) {
        console.
