export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    
    const { text } = req.body;
    
    try {
        const response = await fetch("https://api.cohere.ai/v1/chat", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${process.env.COHERE_API_KEY}`,
                "Content-Type": "application/json",
                "accept": "application/json"
            },
            body: JSON.stringify({
                model: "command", 
                message: `You are an employment law context analyzer. Read this employee log: "${text}". Does this log indicate TERMINATION (being fired, let go, or laid off), RETALIATION (harassment, sudden hostility, or punishment), or NONE? Reply strictly with ONE WORD: TERMINATION, RETALIATION, or NONE.`,
                temperature: 0.1
            })
        });
        
        const data = await response.json();
        const reply = data.text ? data.text.toUpperCase() : "";
        
        let risk = "NONE";
        if (reply.includes("TERMINATION")) risk = "TERMINATION";
        else if (reply.includes("RETALIATION")) risk = "RETALIATION";
        
        res.status(200).json({ risk });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "AI Communication Failed" });
    }
}
