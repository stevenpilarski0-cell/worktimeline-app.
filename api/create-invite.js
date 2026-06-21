// api/create-invite.js
const { createClient } = require('@supabase/supabase-js');

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).send('Method Not Allowed');
    }

    const { clientName, clientEmail, caseSummary, firmId } = req.body;

    if (!clientName || !clientEmail || !firmId) {
        return res.status(400).json({ error: 'Missing clientName, clientEmail, or firmId' });
    }

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL, 
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    try {
        // 1. Check if the firm exists
        const { data: firm, error: firmError } = await supabase
            .from('firms')
            .select('*')
            .eq('id', firmId)
            .single();

        if (firmError || !firm) {
            return res.status(404).json({ error: 'Firm not found.' });
        }

        // 2. Generate a secure custom invite code
        const inviteCode = `INVITE-${Math.floor(100000 + Math.random() * 900000)}`;

        // 3. Upsert a profile for this client with invite details (pre-registration state)
        // Since we don't have their auth.user yet, we can create a pending profile record,
        // or store the invitation details in a separate pending_invitations table.
        // Let's create a pending_invitations table or write it directly to the profiles table.
        // Writing to public.profiles requires a valid auth.users reference usually,
        // so let's create a public.pending_invitations table in our SQL migration.
        // Wait, since we already ran the schema migration, let's store it in a public.pending_invitations table!
        // We will execute a query to create public.pending_invitations if not exists.
        
        // Let's create the table public.pending_invitations:
        const { error: tableError } = await supabase.rpc('execute_sql', {
            sql_query: `
                CREATE TABLE IF NOT EXISTS public.pending_invitations (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    invite_code TEXT UNIQUE NOT NULL,
                    client_name TEXT NOT NULL,
                    client_email TEXT NOT NULL,
                    case_summary TEXT,
                    firm_id UUID REFERENCES public.firms(id) ON DELETE CASCADE,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
                );
            `
        });

        // If RPC execute_sql is not enabled, we can use standard tables. Since Supabase might not have RPC enabled,
        // we will just insert it into profiles by generating a fake auth.users record or using a simpler schema.
        // Better yet: let's modify the migration to include pending_invitations! Yes!
        // I will write this table creation into the SQL migration file.
        // For the function, let's write to public.pending_invitations.
        
        const { error: inviteError } = await supabase
            .from('pending_invitations')
            .insert([{
                invite_code: inviteCode,
                client_name: clientName,
                client_email: clientEmail,
                case_summary: caseSummary || '',
                firm_id: firmId
            }]);

        if (inviteError) throw inviteError;

        // 4. Construct the custom, branded setup URL
        const protocol = req.headers['x-forwarded-proto'] || 'http';
        const host = req.headers.host;
        const inviteUrl = `${protocol}://${host}/setup?code=${inviteCode}`;

        return res.status(200).json({
            inviteCode: inviteCode,
            inviteUrl: inviteUrl,
            message: 'Invite link successfully generated.'
        });

    } catch (error) {
        console.error('Create Invite Error:', error.message);
        return res.status(500).json({ error: error.message });
    }
};
