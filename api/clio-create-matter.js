// /api/clio-create-matter.js
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const TOKEN_TABLE = process.env.SUPABASE_TOKEN_TABLE || 'oauth_tokens';
const CLIO_CLIENT_ID = process.env.CLIO_CLIENT_ID;
const CLIO_CLIENT_SECRET = process.env.CLIO_CLIENT_SECRET;
const CLIO_TOKEN_URL = process.env.CLIO_TOKEN_URL || 'https://ca.app.clio.com/oauth/token';
const CLIO_MANAGE_BASE_URL = process.env.CLIO_MANAGE_BASE_URL || 'https://ca.app.clio.com/api/v4';

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

function buildMatterSummary({ timelineEntries = [], notesEntries = [], exhibits = [] }) {
  return [
    'WorkTimeline™ Matter Summary',
    '',
    'Chronological Timeline:',
    ...timelineEntries.map((line, i) => `${i + 1}. ${line}`),
    '',
    'Supplemental Notes:',
    ...notesEntries.map((line, i) => `${i + 1}. ${line}`),
    '',
    'Accepted Exhibits:',
    ...exhibits.map((line, i) => `${i + 1}. ${line}`),
    ''
  ].join('\n');
}

module.exports = async (req, res) => {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const {
      clientFirstName,
      clientLastName,
      clientEmail,
      matterDescription,
      timelineEntries = [],
      notesEntries = [],
      exhibits = []
    } = req.body || {};

    const accessToken = await getValidAccessToken('clio-grow');
    const headers = {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json'
    };

    // Suggested contact creation scaffold.
    // Align this body with the exact Clio Manage contact schema in your API reference.
    let contactId = null;
    if (clientFirstName || clientLastName || clientEmail) {
      const contactPayload = {
        data: {
          first_name: clientFirstName || 'WorkTimeline',
          last_name: clientLastName || 'Client',
          email_addresses: clientEmail ? [{ address: clientEmail, name: 'Primary' }] : []
        }
      };

      const contactResp = await axios.post(
        `${CLIO_MANAGE_BASE_URL}/contacts`,
        contactPayload,
        { headers }
      );

      contactId = contactResp.data?.data?.id || null;
    }

    // Suggested matter creation scaffold.
    // Align this body with the exact Clio Manage matter schema in your API reference.
    const matterPayload = {
      data: {
        description: matterDescription || 'WorkTimeline matter',
        client: contactId ? { id: contactId } : undefined
      }
    };

    const matterResp = await axios.post(
      `${CLIO_MANAGE_BASE_URL}/matters`,
      matterPayload,
      { headers }
    );

    const matterId = matterResp.data?.data?.id;
    const summary = buildMatterSummary({ timelineEntries, notesEntries, exhibits });

    // Suggested note creation scaffold.
    // Align note field names with your exact Clio Manage note schema.
    if (matterId) {
      const notePayload = {
        data: {
          subject: 'WorkTimeline Sync Summary',
          detail: summary
        }
      };

      await axios.post(
        `${CLIO_MANAGE_BASE_URL}/matters/${matterId}/notes`,
        notePayload,
        { headers }
      );
    }

    return res.status(200).json({
      success: true,
      contactId,
      matterId,
      matter: matterResp.data
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.response?.data || error.message
    });
  }
};
