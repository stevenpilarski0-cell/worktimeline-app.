const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

module.exports = async (req, res) => {
  const { code, state } = req.query;

  if (!code) {
    return res.status(400).json({ error: 'Missing authorization code from Clio.' });
  }

  const userId = state;

  try {
    const clioResponse = await fetch('https://ca.app.clio.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        client_id: process.env.CLIO_CLIENT_ID,
        client_secret: process.env.CLIO_CLIENT_SECRET,
        redirect_uri: 'https://worktimeline.vercel.app/api/callback', // Replace with your actual live Vercel URL
      }),
    });

    const data = await clioResponse.json();

    if (!clioResponse.ok) {
      throw new Error(data.error_description || 'Token exchange failed.');
    }

    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + data.expires_in);

    const { error: dbError } = await supabase
      .from('clio_connections')
      .upsert({
        user_id: userId,
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_at: expiresAt.toISOString(),
      }, { onConflict: 'user_id' });

    if (dbError) throw dbError;

    return res.redirect('/timeline.html?status=clio_connected');

  } catch (error) {
    console.error('Handshake Error:', error.message);
    return res.redirect('/timeline.html?status=error&message=' + encodeURIComponent(error.message));
  }
};
