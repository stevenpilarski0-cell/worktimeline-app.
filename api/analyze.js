export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    const { logText } = req.body;
    
    if (!logText) {
        return res.status(400).json({ error: 'Missing content body for analysis' });
    }
    
    try {
        // Convert the text to lowercase to ensure we catch the words no matter how they are typed
        const lowerText = logText.toLowerCase();
        
        let risk = "NONE";
        let displayTag = "[STATUS: STANDARD TIMELINE]";

        // Local trigger word check
        if (
            lowerText.includes("constructive dismissal") || 
            lowerText.includes("fired") || 
            lowerText.includes("termination")
        ) {
            risk = "CRITICAL";
            displayTag = "[CRITICAL RISK: HIGH PRIORITY EMPLOYMENT CLAIM]";
        }
        
        // Return the clean local analysis results
        res.status(200).json({ 
            success: true,
            risk: risk, 
            displayTag: displayTag 
        });

    } catch (error) {
        res.status(500).json({ error: "Local analysis engine failure" });
    }
}
