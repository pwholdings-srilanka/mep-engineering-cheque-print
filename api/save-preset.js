// api/save-preset.js
// Saves bank calibration presets permanently to presets.json
const fs = require('node:fs');
const path = require('node:path');

const PRESETS_FILE = path.join(__dirname, '..', 'presets.json');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Method not allowed. Use POST.' }));
    return;
  }

  let body = '';
  req.on('data', chunk => {
    body += chunk;
  });

  req.on('end', () => {
    try {
      const data = JSON.parse(body || '{}');
      const bank = data.bank || 'commercial';
      const config = data.config || {};

      let currentPresets = {};
      if (fs.existsSync(PRESETS_FILE)) {
        try {
          currentPresets = JSON.parse(fs.readFileSync(PRESETS_FILE, 'utf8'));
        } catch (_) {}
      }

      currentPresets[bank] = config;
      currentPresets._lastSaved = new Date().toISOString();

      fs.writeFileSync(PRESETS_FILE, JSON.stringify(currentPresets, null, 2), 'utf8');

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        message: `Preset for ${bank} saved permanently.`,
        presets: currentPresets,
      }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
  });
};

