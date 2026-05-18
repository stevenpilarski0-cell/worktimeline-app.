// api/sync.js
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

module.exports = async (req, res) => {
    const { code } = req.query;

    if (!code) {
        return res.status(400).send('Error: Missing authorization execution code.');
    }

    // Capture the cookie code challenge verifier safely
    let verifier = '';
    const cookieHeader = req.headers.cookie;
    if (cookieHeader) {
        const match = cookieHeader.split(';').find(c => c.trim().startsWith('pkce_v='));
        if (match) verifier = match.split('=')[1].trim();
    }

    if (!verifier) verifier = "SamplePKCEChallengeVerificationStringValueLengthAlpha64CharsValid";

    const supabase = createClient(
        process.env.SUPABASE_URL, 
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const CLIENT_ID = '18C4aBAD8YThRDG04xn_-rs8XQTdc0ZJyhPefMZR-0s'; 
    const REDIRECT_URI = 'https://worktimeline-app.vercel.app/api/sync';
    const FIRM_ID = '01KPZB4ZCXHE3Z92S1KM3AT96V';

    try {
        const { data: records, error: dbError } = await supabase
            .from('timeline_records') 
            .select('*')
            .order('created_at', { ascending: false })
            .limit(15);

        if (dbError) throw new Error(`Supabase Database Fetch Failure: ${dbError.message}`);

        let compiledNotes = "=== SUPABASE WORKTIMELINE™ GROW INTAKE ===\n";
        if (records && records.length > 0) {
            records.forEach((row, i) => {
                const messageText = row.content || row.text || row.note || JSON.stringify(row);
                compiledNotes += `\n[Log Entry #${i + 1}]: ${messageText}`;
            });
        } else {
            compiledNotes += "\nNo active timeline logs found in database.";
        }

        // ALIGNED EXCHANGE ENDPOINT: Using the Canadian regional server configuration
        const tokenExchangeResponse = await axios.post('https://ca.grow.clio.com/oauth/token', {
            grant_type: 'authorization_code',
            code: code,
            client_id: CLIENT_ID,
            redirect_uri: REDIRECT_URI,
            code_verifier: verifier
        });

        const accessToken = tokenExchangeResponse.data.access_token;

        const leadPayload = {
            inbox_lead: {
                from_first: "WorkTimeline",
                from_last: "Intake Suite",
                from_source: "Supabase Canadian PKCE Bridge",
                referring_url: REDIRECT_URI,
                from_message: `${compiledNotes}\n\nFirm ID Assignment: ${FIRM_ID}`
            }
        };

        // Post the records straight into your Canadian workspace inbox
        await axios.post('https://ca.grow.clio.com/api/v4/inbox_leads.json', leadPayload, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });

        return res.redirect('/?sync=success');

    } catch (error) {
        console.error('Handshake Failure:', error.response ? error.response.data : error.message);
        return res.status(500).send(`Grow PKCE Handshake Failure: ${error.message}`);
    }
};
