// api/sync.js
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

module.exports = async (req, res) => {
    const { code, state } = req.query;

    if (!code) {
        return res.status(400).send('Error: Missing authorization execution code.');
    }

    const supabase = createClient(
        process.env.SUPABASE_URL, 
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const CLIENT_ID = process.env.CLIO_CLIENT_ID; 
    const CLIENT_SECRET = process.env.CLIO_CLIENT_SECRET;
    const REDIRECT_URI = process.env.CLIO_REDIRECT_URI;
    const FIRM_ID = process.env.CLIO_FIRM_ID;

    try {
        const { data: records, error: dbError } = await supabase
            .from('timeline_entries') 
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
        
        const MAX_COMPILED_NOTES_LENGTH = 8000;
        if (compiledNotes.length > MAX_COMPILED_NOTES_LENGTH) {
            compiledNotes = compiledNotes.substring(0, MAX_COMPILED_NOTES_LENGTH) + '\n...[TRUNCATED LOGS]';
        }

        // ALIGNED EXCHANGE PASS: Directly swapping tokens via the Canadian endpoints using application/x-www-form-urlencoded
        const params = new URLSearchParams();
        params.append('grant_type', 'authorization_code');
        params.append('code', code);
        params.append('client_id', CLIENT_ID);
        params.append('client_secret', CLIENT_SECRET);
        params.append('redirect_uri', REDIRECT_URI);

        const tokenExchangeResponse = await axios.post('https://ca.app.clio.com/oauth/token', params, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        const accessToken = tokenExchangeResponse.data.access_token;

        const leadPayload = {
            inbox_lead: {
                from_first: "Spencer",
                from_last: "Densmore",
                from_email: "spencer@example.com",
                from_source: "Supabase PKCE Bridge",
                referring_url: REDIRECT_URI,
                from_message: `${compiledNotes}\n\nFirm ID Assignment: ${FIRM_ID}`
            }
        };

        // Inject the final record directly into your Canadian Grow endpoint dashboard logs
        await axios.post('https://ca.grow.clio.com/api/v4/inbox_leads.json', leadPayload, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });

        if (state && state.includes('addtoclio')) {
            return res.redirect('https://ca.app.clio.com/app_integrations_callback');
        }
        return res.redirect('/?sync=success');

    } catch (error) {
        console.error('Handshake Failure:', error.response ? error.response.data : error.message);
        return res.status(500).send(`Grow Handshake Failure: ${error.message}`);
    }
};

