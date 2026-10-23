'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const PORT = Number(process.env.PORT) || 3000;
const ROOT = __dirname;
const DATA_FILE = path.join(ROOT, 'data.json');
const ADMIN_PASS = process.env.ADMIN_PASS || '20205';
const TOKEN_SECRET = process.env.TOKEN_SECRET || crypto.randomBytes(24).toString('hex');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.png': 'image/png',
  '.json': 'application/json',
};

function readData() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    const data = JSON.parse(raw);
    if (!Array.isArray(data.subjects)) return { subjects: [] };
    return data;
  } catch {
    return { subjects: [] };
  }
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

function uid() {
  return crypto.randomBytes(6).toString('hex');
}

function signToken() {
  const exp = Date.now() + 8 * 60 * 60 * 1000;
  const payload = Buffer.from(JSON.stringify({ exp })).toString('base64url');
  const sig = crypto.createHmac('sha256', TOKEN_SECRET).update(payload).digest('base64url');
  return payload + '.' + sig;
}

function verifyToken(token) {
  if (!token || typeof token !== 'string') return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const payload = parts[0];
  const sig = parts[1];
  const expected = crypto.createHmac('sha256', TOKEN_SECRET).update(payload).digest('base64url');
  try {
    if (sig.length !== expected.length) return false;
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return false;
    const obj = JSON.parse(Buffer.from(payload, 'base64url').toString());
    return typeof obj.exp === 'number' && obj.exp > Date.now();
  } catch {
    return false;
  }
}

function getAuth(req) {
  const h = req.headers.authorization || '';
  if (h.startsWith('Bearer ')) return h.slice(7).trim();
  return null;
}

function json(res, status, body) {
  const buf = Buffer.from(JSON.stringify(body));
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Content-Length': buf.length,
  });
  res.end(buf);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > 1e6) {
        reject(new Error('too large'));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8');
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        reject(new Error('invalid json'));
      }
    });
    req.on('error', reject);
  });
}

async function handleApi(req, res, urlPath) {
  if (urlPath === '/api/auth' && req.method === 'POST') {
    try {
      const body = await readBody(req);
      if (body.password === ADMIN_PASS) {
        return json(res, 200, { ok: true, token: signToken() });
      }
      return json(res, 401, { ok: false, error: 'wrong' });
    } catch {
      return json(res, 400, { ok: false, error: 'bad request' });
    }
  }

  if (urlPath === '/api/data' && req.method === 'GET') {
    return json(res, 200, readData());
  }

  const authed = verifyToken(getAuth(req));

  if (urlPath === '/api/subjects' && req.method === 'POST') {
    if (!authed) return json(res, 401, { error: 'unauthorized' });
    try {
      const body = await readBody(req);
      const name = String(body.name || '').trim().slice(0, 80);
      if (!name) return json(res, 400, { error: 'name required' });
      const data = readData();
      const subject = { id: uid(), name, links: [] };
      data.subjects.push(subject);
      writeData(data);
      return json(res, 201, subject);
    } catch {
      return json(res, 400, { error: 'bad request' });
    }
  }

  if (urlPath.startsWith('/api/subjects/') && req.method === 'DELETE' && urlPath.split('/').length === 4) {
    if (!authed) return json(res, 401, { error: 'unauthorized' });
    const id = urlPath.slice('/api/subjects/'.length);
    const data = readData();
    data.subjects = data.subjects.filter((s) => s.id !== id);
    writeData(data);
    return json(res, 200, { ok: true });
  }

  if (/^\/api\/subjects\/[^/]+\/links$/.test(urlPath) && req.method === 'POST') {
    if (!authed) return json(res, 401, { error: 'unauthorized' });
    const id = urlPath.split('/')[3];
    try {
      const body = await readBody(req);
      let name = String(body.name || '').trim().slice(0, 120);
      let url = String(body.url || '').trim().slice(0, 500);
      if (!name || !url) return json(res, 400, { error: 'name and url required' });
      if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
      const data = readData();
      const sub = data.subjects.find((s) => s.id === id);
      if (!sub) return json(res, 404, { error: 'not found' });
      const link = { id: uid(), name, url };
      sub.links.push(link);
      writeData(data);
      return json(res, 201, link);
    } catch {
      return json(res, 400, { error: 'bad request' });
    }
  }

  if (/^\/api\/subjects\/[^/]+\/links\/[^/]+$/.test(urlPath) && req.method === 'PUT') {
    if (!authed) return json(res, 401, { error: 'unauthorized' });
    const parts = urlPath.split('/');
    const sid = parts[3];
    const lid = parts[5];
    try {
      const body = await readBody(req);
      let name = String(body.name || '').trim().slice(0, 120);
      let url = String(body.url || '').trim().slice(0, 500);
      if (!name || !url) return json(res, 400, { error: 'name and url required' });
      if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
      const data = readData();
      const sub = data.subjects.find((s) => s.id === sid);
      if (!sub) return json(res, 404, { error: 'not found' });
      const link = sub.links.find((l) => l.id === lid);
      if (!link) return json(res, 404, { error: 'not found' });
      link.name = name;
      link.url = url;
      writeData(data);
      return json(res, 200, link);
    } catch {
      return json(res, 400, { error: 'bad request' });
    }
  }

  if (/^\/api\/subjects\/[^/]+\/links\/[^/]+$/.test(urlPath) && req.method === 'DELETE') {
    if (!authed) return json(res, 401, { error: 'unauthorized' });
    const parts = urlPath.split('/');
    const sid = parts[3];
    const lid = parts[5];
    const data = readData();
    const sub = data.subjects.find((s) => s.id === sid);
    if (!sub) return json(res, 404, { error: 'not found' });
    sub.links = sub.links.filter((l) => l.id !== lid);
    writeData(data);
    return json(res, 200, { ok: true });
  }

  return json(res, 404, { error: 'not found' });
}

const server = http.createServer(async (req, res) => {
  const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);

  if (urlPath.startsWith('/api/')) {
    try {
      return await handleApi(req, res, urlPath);
    } catch (e) {
      console.error(e);
      return json(res, 500, { error: 'server error' });
    }
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { Allow: 'GET, HEAD', 'Cache-Control': 'no-store' });
    return res.end('Method Not Allowed');
  }

  let fileUrl = urlPath === '/' ? '/index.html' : urlPath;
  const safe = path.normalize(fileUrl).replace(/^(\.\.[/\\])+/, '');
  const filePath = path.join(ROOT, safe);

  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  fs.stat(filePath, (err, st) => {
    if (err || !st.isFile()) {
      const index = path.join(ROOT, 'index.html');
      return fs.readFile(index, (e2, buf) => {
        if (e2) {
          res.writeHead(404);
          return res.end('Not Found');
        }
        res.writeHead(200, {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-cache',
          'X-Content-Type-Options': 'nosniff',
        });
        if (req.method === 'HEAD') return res.end();
        res.end(buf);
      });
    }

    const ext = path.extname(filePath).toLowerCase();
    const type = MIME[ext] || 'application/octet-stream';
    const longCache = ext === '.woff2' || ext === '.svg' || ext === '.png';

    res.writeHead(200, {
      'Content-Type': type,
      'Cache-Control': longCache ? 'public, max-age=31536000, immutable' : 'public, max-age=120',
      'X-Content-Type-Options': 'nosniff',
      'Content-Length': st.size,
    });
    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(filePath).pipe(res);
  });
});

if (!fs.existsSync(DATA_FILE)) {
  writeData({
    subjects: [
      {
        id: uid(),
        name: 'Literatură',
        links: [
          {
            id: uid(),
            name: 'Copac Octombrie',
            url: 'https://www.figma.com/deck/CGIl0nptsWe1tYKgLKDl1F',
          },
        ],
      },
    ],
  });
}

server.listen(PORT, '0.0.0.0', () => {
  console.log('Română → http://localhost:' + PORT);
});

server.on('error', (err) => {
  console.error(err.message);
  process.exitCode = 1;
});
