// api/oauthStart.js
const { ACCOUNTS_URL, CLIENT_ID } = require('../lib/zohoAuth');
const url = require('url');

module.exports = async function handler(req, res) {
  const query = req.query || url.parse(req.url, true).query || {};
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:8888';
  const isLocal = host.includes('localhost') || host.includes('127.0.0.1') || host.includes(':8888');
  const protocol = req.headers['x-forwarded-proto'] || (isLocal ? 'http' : 'https');
  const redirectHost = isLocal ? 'localhost:8888' : host;

  let redirectUri = `${protocol}://${redirectHost}/api/oauthCallback`;
  if (query.redirect_uri === 'root' || query.redirect_uri === '/') {
    redirectUri = `${protocol}://${redirectHost}/`;
  } else if (query.redirect_uri) {
    redirectUri = query.redirect_uri;
  }
  const clientId = query.client_id || CLIENT_ID;

  if (!clientId) {
    res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`<h3>Error: Client ID is missing</h3><p>Please enter your Client ID in the app settings.</p>`);
    return;
  }

  const authUrl =
    `${ACCOUNTS_URL}/oauth/v2/auth?` +
    `scope=ZohoBooks.fullaccess.all&` +
    `client_id=${encodeURIComponent(clientId)}&` +
    `response_type=code&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `access_type=offline&` +
    `prompt=consent`;

  res.writeHead(302, { Location: authUrl });
  res.end();
};

