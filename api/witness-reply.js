const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

module.exports = async (req, res) => {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { name, verificationCode, statement } = req.body;

    if (!verificationCode || !statement) {
      return res.status(400).json({ error: 'Missing code or statement' });
    }

    const { data: invite } = await supabase
      .from('witness_invites')
      .select('*')
      .eq('verification_code', verificationCode)
      .single();

    if (!invite) {
      return res.status(400).json({ error: 'Invalid verification code' });
    }

    const record = {
      id: crypto.randomUUID(),
      witness_name: name || invite.name,
      contact: invite.contact,
      statement,
      verification_code: verificationCode,
      created_at: new Date().toISOString()
    };

    await supabase.from('witness_statements').insert(record);

    return res.status(200).json({
      success: true,
      ...record,
      receivedAt: record.created_at
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
};
