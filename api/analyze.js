// This runs on Vercel's servers, not the user's phone.
export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).send('Use POST');

    const { entries } = req.body;

    try {
        const response = await fetch('https://api.cohere.ai/v1/chat', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.COHERE_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: `Review these incidents against BC Labor Standards & WCB. Identify patterns of violations: ${JSON.stringify(entries)}`,
                model: 'command-r-plus',
                preamble: "You are a BC Legal intake expert. Be concise and professional."
            })
        });

        const data = await response.json();
        res.status(200).json({ summary: data.text });
    } catch (err) {
        res.status(500).json({ error: "AI Handshake Failed" });
    }
}
