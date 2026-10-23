'use strict';

const crypto = require('node:crypto');

const ADMIN_PASS = process.env.ADMIN_PASS || '20205';
const TOKEN_SECRET = process.env.TOKEN_SECRET || 'romana-project-secret-change-me';

function signToken() {
  const exp = Date.now() + 8 * 60 * 60 * 1000;
  const payload = Buffer.from(JSON.stringify({ exp })).toString('base64url');
  const sig = crypto.createHmac('sha256', TOKEN_SECRET).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    return res.end();
  }

  if (req.method !== 'POST') {
    res.statusCode = 405;
    return res.end(JSON.stringify({ error: 'method not allowed' }));
  }

  let body = '';
  for await (const chunk of req) body += chunk;
  let data;
  try {
    data = body ? JSON.parse(body) : {};
  } catch {
    res.statusCode = 400;
    return res.end(JSON.stringify({ ok: false, error: 'bad request' }));
  }

  if (data.password === ADMIN_PASS) {
    res.statusCode = 200;
    return res.end(JSON.stringify({ ok: true, token: signToken() }));
  }

  res.statusCode = 401;
  return res.end(JSON.stringify({ ok: false, error: 'wrong' }));
};
