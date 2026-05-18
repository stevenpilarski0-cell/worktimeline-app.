// api/sync.js
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

module.exports = async (req, res) => {
    const { code } = req.query;

    if (!code) {
        return res.status(400).send('Error: Missing authorization code parameter.');
    }

    // MATCHED KEYS: Mapping directly to your verified Vercel configuration names
    const supabase = createClient(
        process.env.SUPABASE_URL, 
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const CLIENT_ID = 'btscu9WmPHYellZtZA9slQfynBAqudwjaR7pEDdq'; 
    const REDIRECT_URI = 'https://worktimeline-app.vercel.app/api/sync';
    const CLIENT_SECRET = process.env.CLIO_MANAGE_SECRET; 

    try {
        // Pull latest chronological log tracks directly out of your active database rows
        const { data: records, error: dbError } = await supabase
            .from('timeline_records') // Verify this table name spelling matches your database panel!
            .select('*')
            .order('created_at', { ascending: false })
            .limit(15);

        if (dbError) throw new Error(`Supabase Database Fetch Failure: ${dbError.message}`);

        // Compile database fields into a structured summary log context
        let compiledNotes = "=== SUPABASE WORKTIMELINE™ DATABASE SYNCHRONIZATION ===\n";
        if (records && records.length > 0) {
            records.forEach((row, i) => {
                const messageText = row.content || row.text || row.note || JSON.stringify(row);
                compiledNotes += `\n[Log Entry #${i + 1}]: ${messageText}`;
            });
        } else {
            compiledNotes += "\nNo active data logs returned from table rows.";
        }

        // Exchange return code for access token on the Canadian Clio Manage server cluster
        const tokenExchangeResponse = await axios.post('https://ca.app.clio.com/oauth/token', {
            grant_type: 'authorization_code',
            code: code,
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
            redirect_uri: REDIRECT_URI
        });

        const accessToken = tokenExchangeResponse.data.access_token;

        // Package the message structure matching Clio Manage's Activity endpoint schema
        const activityPayload = {
            data: {
                type: "activity",
                note: compiledNotes.trim(),
                activity_description: "WorkTimeline Live Supabase Database Sync"
            }
        };

        // Inject the summary package into the legal firm instance Activity cluster
        await axios.post('https://ca.app.clio.com/api/v4/activities.json', activityPayload, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });

        return res.redirect('/?sync=success');

    } catch (error) {
        console.error('Handshake Process Failure:', error.response ? error.response.data : error.message);
        return res.status(500).send(`Synchronization Pipeline Handshake Failure: ${error.message}`);
    }
};
