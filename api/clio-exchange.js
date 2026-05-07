export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { code } = req.body;

  const params = new URLSearchParams();
  params.append('grant_type', 'authorization_code');
  params.append('code', code);
  params.append('client_id', 'btscu5WlmPHYellZtZA9sIQfynBAQudwjaR7pEDdq');
  params.append('client_secret', 'kL0cWsjKkZTzWkdCVrcs7IktGIZeUj6pAvE2GJka');
  params.append('redirect_uri', 'https://worktimeline-app.vercel.app');

  try {
    // Notice this points to your Canadian server!
    const clioResponse = await fetch('https://ca.app.clio.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params,
    });

    const data = await clioResponse.json();
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to exchange token with Clio' });
  }
}
