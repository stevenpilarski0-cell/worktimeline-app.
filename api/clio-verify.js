// /api/clio-verify.js
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const TOKEN_TABLE = process.env.SUPABASE_TOKEN_TABLE || 'oauth_tokens';
const CLIO_CLIENT_ID = process.env.CLIO_CLIENT_ID;
const CLIO_CLIENT_SECRET = process.env.CLIO_CLIENT_SECRET;

// Canada example; adjust if your firm is in another region.
const CLIO_MANAGE_BASE_URL = process.env.CLIO_MANAGE_BASE_URL || 'https://ca.app.clio.com/api/v4';
const CLIO_TOKEN_URL = process.env.CLIO_TOKEN_URL || 'https://ca.app.clio.com/oauth/token';

async function getTokenRecord(id = 'clio-grow') {
  const { data, error } = await supabase
    .from(TOKEN_TABLE)
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw new Error(`Supabase token fetch failed: ${error.message}`);
  return data;
}

async function upsertTokenRecord(record) {
  const { error } = await supabase
    .from(TOKEN_TABLE)
    .upsert(record, { onConflict: 'id' });

  if (error) throw new Error(`Supabase token write failed: ${error.message}`);
}

function isExpired(record) {
  if (!record || !record.expires_at) return true;
  return Math.floor(Date.now() / 1000) > Number(record.expires_at) - 60;
}

async function refreshClioToken(refreshToken) {
  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: CLIO_CLIENT_ID,
    client_secret: CLIO_CLIENT_SECRET
  });

  const response = await axios.post(CLIO_TOKEN_URL, params.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  });

  return response.data;
}

async function getValidAccessToken(id = 'clio-grow') {
  let tokenRecord = await getTokenRecord(id);

  if (!tokenRecord?.access_token) {
    throw new Error('No stored Clio token found.');
  }

  if (!isExpired(tokenRecord)) {
    return tokenRecord.access_token;
  }

  if (!tokenRecord.refresh_token) {
    throw new Error('Refresh token missing. Re-authorisation required.');
  }

  const refreshed = await refreshClioToken(tokenRecord.refresh_token);
  const expiresAt = Math.floor(Date.now() / 1000) + (refreshed.expires_in || 3600);

  tokenRecord = {
    ...tokenRecord,
    access_token: refreshed.access_token,
    refresh_token: refreshed.refresh_token || tokenRecord.refresh_token,
    token_type: refreshed.token_type,
    scope: refreshed.scope,
    expires_at: expiresAt,
    updated_at: new Date().toISOString()
  };

  await upsertTokenRecord(tokenRecord);
  return tokenRecord.access_token;
}

module.exports = async (req, res) => {
  try {
    const accessToken = await getValidAccessToken('clio-grow');

    // Live verification call
    const response = await axios.get(`${CLIO_MANAGE_BASE_URL}/users/who_am_i`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json'
      }
    });

    return res.status(200).json({
      success: true,
      verified: true,
      live: true,
      clioUser: response.data
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      verified: false,
      error: error.response?.data || error.message
    });
  }
};
