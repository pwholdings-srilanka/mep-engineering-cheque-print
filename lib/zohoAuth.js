// lib/zohoAuth.js
// Shared Zoho Books OAuth 2.0 helper for MEP Engineering & Trading Company (Pvt) Ltd
const fs = require('fs');
const path = require('path');

const TOKENS_PATH = process.env.VERCEL ? '/tmp/tokens.json' : path.join(process.cwd(), 'tokens.json');

const DEFAULT_CLIENT_ID = '1000.GRDR1K3KJ4DMA8DOGKE35LDFI277ZH';
const DEFAULT_CLIENT_SECRET = 'ad3e7845a59bc40b74471b009c111c416c40b2dcc4';
const DEFAULT_ORG_ID = '940082326';
const DEFAULT_REFRESH_TOKEN = '1000.57ec42130e16850f433c0cee72156ca5.dca11e286f4157cd23e8eaf34cefd236';

const CLIENT_ID = process.env.ZOHO_CLIENT_ID || DEFAULT_CLIENT_ID;
const CLIENT_SECRET = process.env.ZOHO_CLIENT_SECRET || DEFAULT_CLIENT_SECRET;
const ORG_ID = process.env.ZOHO_ORG_ID || DEFAULT_ORG_ID;

const ACCOUNTS_URL = 'https://accounts.zoho.com';
const API_URL = 'https://www.zohoapis.com/books/v3';

let cachedToken = null;
let cachedTokenExpiresAt = 0;

function getStoredTokens(customRefreshToken) {
  let rt = (customRefreshToken && String(customRefreshToken).trim());
  let fileTokens = null;
  try {
    if (fs.existsSync(TOKENS_PATH)) {
      fileTokens = JSON.parse(fs.readFileSync(TOKENS_PATH, 'utf8'));
    }
  } catch (_) {}

  if (!rt || rt.length < 20) {
    if (fileTokens && fileTokens.refresh_token && fileTokens.refresh_token.length > 20) {
      rt = fileTokens.refresh_token;
    } else if (process.env.ZOHO_REFRESH_TOKEN && process.env.ZOHO_REFRESH_TOKEN.length > 20) {
      rt = process.env.ZOHO_REFRESH_TOKEN;
    } else {
      rt = DEFAULT_REFRESH_TOKEN;
    }
  }

  return {
    refresh_token: rt,
    access_token: (fileTokens && fileTokens.access_token) || process.env.ZOHO_ACCESS_TOKEN || '',
    expires_at: (fileTokens && fileTokens.expires_at) || parseInt(process.env.ZOHO_EXPIRES_AT || '0', 10),
  };
}

function saveTokens(tokens) {
  cachedToken = tokens.access_token;
  cachedTokenExpiresAt = tokens.expires_at;
  try {
    fs.writeFileSync(TOKENS_PATH, JSON.stringify(tokens, null, 2));
  } catch (_) {}
  try {
    const envPath = path.join(process.cwd(), '.env');
    if (fs.existsSync(envPath) && tokens.refresh_token) {
      let envContent = fs.readFileSync(envPath, 'utf8');
      if (envContent.includes('ZOHO_REFRESH_TOKEN=')) {
        envContent = envContent.replace(/ZOHO_REFRESH_TOKEN=.*/, `ZOHO_REFRESH_TOKEN=${tokens.refresh_token}`);
      } else {
        envContent += `\nZOHO_REFRESH_TOKEN=${tokens.refresh_token}\n`;
      }
      fs.writeFileSync(envPath, envContent, 'utf8');
    }
  } catch (_) {}
}

async function refreshAccessToken(refreshToken, clientId, clientSecret, accountsServer) {
  const cId = clientId || CLIENT_ID;
  const cSec = clientSecret || CLIENT_SECRET;
  const baseAccounts = accountsServer || ACCOUNTS_URL;
  const url = `${baseAccounts}/oauth/v2/token?refresh_token=${encodeURIComponent(refreshToken)}&client_id=${encodeURIComponent(cId)}&client_secret=${encodeURIComponent(cSec)}&grant_type=refresh_token`;

  const res = await fetch(url, { method: 'POST' });
  const data = await res.json();
  if (!data.access_token) {
    throw new Error('Failed to refresh Zoho token: ' + JSON.stringify(data));
  }

  const tokens = getStoredTokens(refreshToken) || {};
  tokens.refresh_token = refreshToken;
  tokens.access_token = data.access_token;
  tokens.expires_at = Date.now() + (data.expires_in || 3600) * 1000;
  saveTokens(tokens);
  return data.access_token;
}

async function getAccessToken(customRefreshToken) {
  if (!customRefreshToken && cachedToken && cachedTokenExpiresAt && Date.now() < cachedTokenExpiresAt - 60000) {
    return cachedToken;
  }

  const tokens = getStoredTokens(customRefreshToken);
  if (!tokens || !tokens.refresh_token) {
    const err = new Error('NOT_AUTHORIZED');
    err.code = 'NOT_AUTHORIZED';
    throw err;
  }

  if (tokens.access_token && tokens.expires_at && Date.now() < tokens.expires_at - 60000) {
    cachedToken = tokens.access_token;
    cachedTokenExpiresAt = tokens.expires_at;
    return tokens.access_token;
  }

  return await refreshAccessToken(tokens.refresh_token);
}

async function apiRequest(method, endpoint, body, orgId, customRefreshToken) {
  const accessToken = await getAccessToken(customRefreshToken);
  let url;
  if (endpoint.startsWith('/organizations')) {
    url = `${API_URL}${endpoint}`;
  } else {
    const separator = endpoint.includes('?') ? '&' : '?';
    url = `${API_URL}${endpoint}${separator}organization_id=${orgId || ORG_ID}`;
  }

  const options = {
    method,
    headers: {
      'Authorization': `Zoho-oauthtoken ${accessToken}`,
      'Content-Type': 'application/json',
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const res = await fetch(url, options);
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

module.exports = {
  getStoredTokens,
  saveTokens,
  refreshAccessToken,
  getAccessToken,
  apiRequest,
  CLIENT_ID,
  CLIENT_SECRET,
  ORG_ID,
  DEFAULT_REFRESH_TOKEN,
  ACCOUNTS_URL,
  API_URL,
};

