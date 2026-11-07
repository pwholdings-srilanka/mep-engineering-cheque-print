// server.js
// Node.js HTTP server for PW Holdings Cheque Printer
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const routes = {
  '/api/get-record': require('./api/get-record'),
  '/api/oauthStart': require('./api/oauthStart'),
  '/api/oauthCallback': require('./api/oauthCallback'),
};

const staticFiles = new Set([
  'index.html',
  'cheque.css',
  'cheque.js',
  'presets.js',
]);

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
};

const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, 'http://localhost');
  const pathname = parsedUrl.pathname.replace('/.netlify/functions/', '/api/');

  // Route API requests
  if (routes[pathname]) {
    req.query = Object.fromEntries(parsedUrl.searchParams);
    try {
      await routes[pathname](req, res);
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // Handle root callback if Zoho redirected to http://localhost:8888/?code=...
  if ((pathname === '/' || pathname === '/index.html') && parsedUrl.searchParams.has('code')) {
    req.query = Object.fromEntries(parsedUrl.searchParams);
    req.query.customRedirectUri = `${parsedUrl.protocol}//${parsedUrl.host}/`;
    try {
      await routes['/api/oauthCallback'](req, res);
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // Route static files
  let filename = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  if (!staticFiles.has(filename)) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('404 Not Found');
    return;
  }

  const filePath = path.join(__dirname, 'public', filename);
  if (!fs.existsSync(filePath)) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('File not found');
    return;
  }

  const ext = path.extname(filename);
  res.writeHead(200, {
    'Content-Type': mimeTypes[ext] || 'application/octet-stream',
    'X-Content-Type-Options': 'nosniff',
  });
  fs.createReadStream(filePath).pipe(res);
});

const PORT = Number(process.env.PORT) || 8888;
if (require.main === module) {
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`====================================================`);
    console.log(` PW Holdings Cheque Printer Running at:`);
    console.log(` http://localhost:${PORT}`);
    console.log(`====================================================`);
  });
}

module.exports = server;

