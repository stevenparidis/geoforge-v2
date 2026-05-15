'use strict';

// GeoForge development server
// Serves the app on port 8000 and proxies window.claude.complete → Anthropic API.
//
// Usage:
//   set ANTHROPIC_API_KEY=sk-ant-...
//   node dev-server.js
//
// Then open http://localhost:8000

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = 8000;
const REPO_ROOT = __dirname;
const API_KEY = process.env.ANTHROPIC_API_KEY;

if (!API_KEY) {
  console.error('ERROR: ANTHROPIC_API_KEY is not set.');
  console.error('Run:  set ANTHROPIC_API_KEY=sk-ant-...');
  process.exit(1);
}

function getMime(ext) {
  return ({
    '.html': 'text/html', '.js': 'application/javascript',
    '.jsx': 'application/javascript', '.css': 'text/css',
    '.json': 'application/json', '.png': 'image/png',
    '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
    '.woff2': 'font/woff2', '.woff': 'font/woff',
  })[ext] || 'application/octet-stream';
}

// The polyfill injected into index.html so window.claude.complete
// calls this server's /api/claude-complete endpoint instead of the
// Claude sandbox.
const POLYFILL = `
<script>
(function () {
  if (window.claude) return; // already provided by sandbox
  window.claude = {
    complete: async function (promptObj) {
      const res = await fetch('/api/claude-complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(promptObj),
      });
      if (!res.ok) throw new Error('API error ' + res.status);
      const data = await res.json();
      return data.text;
    },
  };
  console.log('[dev-server] window.claude.complete polyfill active');
})();
</script>
`;

function callAnthropic(promptObj) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: promptObj.system || '',
      messages: promptObj.messages || [],
    });

    const req = https.request({
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Length': Buffer.byteLength(body),
      },
    }, (res) => {
      let raw = '';
      res.on('data', (chunk) => { raw += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(raw);
          if (parsed.error) return reject(new Error(parsed.error.message));
          const text = parsed.content?.[0]?.text ?? '';
          resolve(text);
        } catch (e) { reject(e); }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

const server = http.createServer(async (req, res) => {
  // CORS for local dev
  res.setHeader('Access-Control-Allow-Origin', '*');

  // API proxy endpoint
  if (req.method === 'POST' && req.url === '/api/claude-complete') {
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', async () => {
      try {
        const promptObj = JSON.parse(body);
        const text = await callAnthropic(promptObj);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ text }));
      } catch (e) {
        console.error('API error:', e.message);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // Static file server — inject polyfill into index.html
  const urlPath = req.url.split('?')[0];
  const isIndex = urlPath === '/' || urlPath === '/index.html';
  const filePath = path.join(REPO_ROOT, isIndex ? 'index.html' : urlPath);
  const ext = path.extname(filePath).toLowerCase();

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found: ' + urlPath);
      return;
    }

    let out = data;
    if (isIndex) {
      // Inject polyfill just before </head>
      out = Buffer.from(data.toString().replace('</head>', POLYFILL + '</head>'));
    }

    res.writeHead(200, {
      'Content-Type': getMime(ext),
      'Cache-Control': 'no-store',
    });
    res.end(out);
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`GeoForge dev server → http://localhost:${PORT}`);
  console.log('Press Ctrl+C to stop.');
});
