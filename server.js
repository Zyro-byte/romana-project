
'use strict';

const http = require('node:http');

const PORT = Number(process.env.PORT) || 3000;

const TARGET =
  'https://www.figma.com/deck/CGIl0nptsWe1tYKgLKDl1F/Copac?node-id=1-65&t=0k2WxKEATDmRPKG1-0&scaling=min-zoom&content-scaling=fixed&page-id=0%3A1';

const server = http.createServer((req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, {
      Allow: 'GET, HEAD',
      'Cache-Control': 'no-store',
    });
    return res.end('Method Not Allowed');
  }

  res.writeHead(302, {
    Location: TARGET,
    'Cache-Control': 'no-store',
    'Content-Length': '0',
    'X-Content-Type-Options': 'nosniff',
  });

  res.end();
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Redirect server running at http://localhost:${PORT}`);
  console.log(`Redirecting visitors to: ${TARGET}`);
});

server.on('error', (err) => {
  console.error('Server error:', err.message);
  process.exitCode = 1;
});
