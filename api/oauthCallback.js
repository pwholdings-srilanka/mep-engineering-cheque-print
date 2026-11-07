// api/oauthCallback.js
const { ACCOUNTS_URL, CLIENT_ID, CLIENT_SECRET, saveTokens, createSession } = require('../lib/zohoAuth');
const url = require('url');

module.exports = async function handler(req, res) {
  const query = req.query || url.parse(req.url, true).query || {};
  const code = query.code;

  if (!code) {
    res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end('<h2>Missing authorization code</h2><p>Please try <a href="/api/oauthStart">authorizing again</a>.</p>');
    return;
  }

  const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:8888';
  const isLocal = host.includes('localhost') || host.includes('127.0.0.1') || host.includes(':8888');
  const protocol = req.headers['x-forwarded-proto'] || (isLocal ? 'http' : 'https');
  const redirectHost = isLocal ? 'localhost:8888' : host;
  const customRedirectUri = query.redirect_uri || query.customRedirectUri;
  const redirectUri = customRedirectUri || `${protocol}://${redirectHost}/api/oauthCallback`;

  const accountsServer = (query['accounts-server'] || ACCOUNTS_URL).replace(/\/+$/, '');
  const tokenUrl = `${accountsServer}/oauth/v2/token`;

  const params = new URLSearchParams({
    code: code,
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  });

  try {
    const apiRes = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const data = await apiRes.json();

    if (!data.refresh_token) {
      res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`<!DOCTYPE html>
<html>
<head>
  <title>Zoho Connection</title>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #f8fafc; display:flex; align-items:center; justify-content:center; min-height:100vh; margin:0; }
    .card { background:#1e293b; border: 1px solid #ef4444; border-radius:16px; padding:30px; max-width:540px; text-align:center; }
    h2 { color:#f87171; margin-top:0; }
    pre { background:#0f172a; padding:12px; border-radius:8px; text-align:left; font-size:13px; color:#fca5a5; overflow-x:auto; }
    a.btn { display:inline-block; background:#0284c7; color:#fff; padding:10px 22px; border-radius:8px; text-decoration:none; font-weight:600; margin-top:14px; }
  </style>
</head>
<body>
  <div class="card">
    <h2>Error Connecting to Zoho</h2>
    <p>The authorization code was expired or already used.</p>
    <pre>${JSON.stringify(data, null, 2)}</pre>
    <a href="/api/oauthStart" class="btn">Try Again</a>
  </div>
</body>
</html>`);
      return;
    }

    // Security check: Verify that the authenticated Zoho account has access to MEP Engineering
    let isMepOrg = true;
    try {
      const orgRes = await fetch('https://www.zohoapis.com/books/v3/organizations', {
        headers: { Authorization: `Zoho-oauthtoken ${data.access_token}` }
      });
      const orgData = await orgRes.json();
      if (orgData && orgData.organizations && orgData.organizations.length > 0) {
        isMepOrg = orgData.organizations.some(o => String(o.organization_id) === '940082326');
      }
    } catch (_) {}

    if (!isMepOrg) {
      res.writeHead(403, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`<!DOCTYPE html>
<html>
<head><title>Access Denied - MEP Engineering</title><meta charset="utf-8">
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #f8fafc; display:flex; align-items:center; justify-content:center; min-height:100vh; margin:0; }
  .card { background:#1e293b; border: 1px solid #ef4444; border-radius:16px; padding:36px; max-width:480px; text-align:center; }
  h2 { color:#ef4444; margin-top:0; }
  a.btn { display:inline-block; background:#0284c7; color:#fff; padding:10px 24px; border-radius:8px; text-decoration:none; font-weight:600; margin-top:16px; }
</style>
</head>
<body>
  <div class="card">
    <h2>Access Denied</h2>
    <p>Your logged-in Zoho account does not belong to <strong>MEP Engineering & Trading Company (Pvt) Ltd</strong> (Org ID: 940082326).</p>
    <p style="color:#94a3b8; font-size:13px;">This cheque printing system is strictly restricted to MEP Engineering authorized users.</p>
    <a href="/api/oauthStart" class="btn">Log in with MEP Account</a>
  </div>
</body>
</html>`);
      return;
    }

    const tokens = {
      refresh_token: data.refresh_token,
      access_token: data.access_token,
      expires_at: Date.now() + (data.expires_in || 3600) * 1000,
    };
    saveTokens(tokens);

    const sessionToken = createSession('940082326');
    const returnUrl = query.state || '/';
    const sep = returnUrl.includes('?') ? '&' : '?';
    const finalUrl = `${returnUrl}${sep}session_token=${sessionToken}`;

    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`<!DOCTYPE html>
<html>
<head>
  <title>Connected to Zoho Books</title>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #f8fafc; display:flex; align-items:center; justify-content:center; min-height:100vh; margin:0; }
    .card { background:#1e293b; border: 1px solid #22c55e; border-radius:16px; padding:36px; max-width:520px; text-align:center; box-shadow:0 10px 25px -5px rgba(0,0,0,0.5); }
    h2 { color:#4ade80; margin-top:0; }
    .token-box { background:#0f172a; border:1px solid #334155; padding:12px; border-radius:8px; word-break:break-all; font-family:monospace; font-size:12px; color:#38bdf8; margin:16px 0; }
    a.btn { display:inline-block; background:#16a34a; color:#fff; padding:12px 28px; border-radius:8px; text-decoration:none; font-weight:700; font-size:15px; margin-top:14px; }
  </style>
</head>
<body>
  <div class="card">
    <h2>Connected &amp; Verified!</h2>
    <p>Authorized for <strong>MEP Engineering &amp; Trading Company (Pvt) Ltd</strong>.</p>
    <p><small style="color:#94a3b8;">Redirecting back to your cheque...</small></p>
    <a href="${finalUrl}" class="btn" id="returnBtn">Open Cheque Printer</a>
  </div>
  <script>
    try {
      localStorage.setItem('zoho_refresh_token', ${JSON.stringify(tokens.refresh_token)});
      sessionStorage.setItem('mep_session_token', ${JSON.stringify(sessionToken)});
    } catch (_) {}
    setTimeout(() => { window.location.href = ${JSON.stringify(finalUrl)}; }, 1000);
  </script>
</body>
</html>`);
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`<h3>Network Error: ${err.message}</h3><p><a href='/api/oauthStart'>Try Again</a></p>`);
  }
};

