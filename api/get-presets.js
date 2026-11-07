// api/get-presets.js
// Returns saved presets from presets.json
const fs = require('node:fs');
const path = require('node:path');

const PRESETS_FILE = path.join(__dirname, '..', 'presets.json');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  let presets = {};
  if (fs.existsSync(PRESETS_FILE)) {
    try {
      presets = JSON.parse(fs.readFileSync(PRESETS_FILE, 'utf8'));
    } catch (_) {}
  }

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ success: true, presets }));
};

