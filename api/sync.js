// api/sync.js
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

module.exports = async (req, res) => {
    const { code, state } = req.query;

    if (!code) {
        return res.status(400).send('Error: Missing authorization execution code.');
    }

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL, 
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const CLIENT_ID = process.env.CLIO_CLIENT_ID; 
    const CLIENT_SECRET = process.env.CLIO_CLIENT_SECRET;
    const REDIRECT_URI = process.env.CLIO_REDIRECT_URI;

    try {
        // 1. Exchange OAuth code for Clio Access & Refresh Tokens
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

        const { access_token, refresh_token, expires_in } = tokenExchangeResponse.data;

        // 2. Identify the user using Clio's who_am_i endpoint
        const whoAmIResponse = await axios.get('https://ca.app.clio.com/api/v4/users/who_am_i.json', {
            headers: {
                'Authorization': `Bearer ${access_token}`
            }
        });

        const clioUser = whoAmIResponse.data.data;
        const clioAccountId = clioUser.account.id;
        const lawyerName = clioUser.name;
        const lawyerEmail = clioUser.email;

        // Check if this is a Firm / Lawyer Onboarding Flow
        if (state && state.startsWith('firm_vault_')) {
            // Check if firm already exists
            const { data: existingFirm, error: findError } = await supabase
                .from('firms')
                .select('*')
                .eq('clio_account_id', clioAccountId)
                .single();

            let firmId;

            if (findError && findError.code !== 'PGRST116') {
                throw findError;
            }

            if (!existingFirm) {
                // Register new firm and generate referral invite code
                const inviteCode = `FIRM-${lawyerName.substring(0, 3).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
                const { data: newFirm, error: insertError } = await supabase
                    .from('firms')
                    .insert([{
                        clio_account_id: String(clioAccountId),
                        name: `${lawyerName}'s Legal Practice`,
                        invite_code: inviteCode
                    }])
                    .select()
                    .single();

                if (insertError) throw insertError;
                firmId = newFirm.id;
            } else {
                firmId = existingFirm.id;
            }

            // Save tokens to public.clio_tokens table (linked to auth.users or just referenced by client id)
            // For now, we store them keyed under the firm's account id or unique identifier
            const { error: tokenError } = await supabase
                .from('clio_tokens')
                .upsert({
                    user_id: firmId, // Keyed by firm id
                    access_token: access_token,
                    refresh_token: refresh_token,
                    expires_in: expires_in,
                    token_type: 'Bearer',
                    updated_at: new Date().toISOString()
                });

            if (tokenError) throw tokenError;

            // Redirect back to dashboard indicating success
            return res.redirect(`/?clio_auth=success&firm_id=${firmId}&invite_code=${inviteCode || existingFirm.invite_code}`);
        }

        // 3. Fallback: Client Sync Flow (if not explicitly firm flow)
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

        const leadPayload = {
            inbox_lead: {
                from_first: "Client",
                from_last: "Intake",
                from_email: "client@worktimeline.app",
                from_source: "WorkTimeline Integration",
                referring_url: REDIRECT_URI,
                from_message: compiledNotes
            }
        };

        // Post Lead to Clio Grow
        await axios.post('https://ca.grow.clio.com/api/v4/inbox_leads.json', leadPayload, {
            headers: {
                'Authorization': `Bearer ${access_token}`,
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
