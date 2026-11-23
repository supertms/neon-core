// Neon Core local-only bridge: secure same-origin UI + Codex App Server stdio.
// This service is intentionally NOT deployed to GitHub Pages.
import { createServer } from 'node:http';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { readFile, realpath, stat } from 'node:fs/promises';
import { dirname, resolve, extname, sep, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CodexRpc } from './codex-rpc.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.NEON_PORT || 4173);
if (!Number.isInteger(PORT) || PORT < 1024 || PORT > 65535) {
  throw new Error('NEON_PORT must be a port between 1024 and 65535.');
}
const TOKEN = randomBytes(32).toString('hex');
const ALLOWED_HOSTS = new Set(['127.0.0.1:' + PORT, 'localhost:' + PORT]);
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml' };
const MAX_BODY = 64 * 1024;
const MAX_EVENT_CHARS = 24000;
const EVENT_METHODS = new Set([
  'thread/started', 'thread/status/changed', 'turn/started', 'turn/completed',
  'turn/plan/updated', 'turn/diff/updated', 'item/started', 'item/completed',
  'item/agentMessage/delta', 'item/plan/delta',
  'item/commandExecution/outputDelta', 'error', 'warning',
  'serverRequest/resolved', 'account/updated'
]);
const APPROVAL_METHODS = new Set([
  'item/commandExecution/requestApproval', 'item/fileChange/requestApproval'
]);

const rpc = new CodexRpc();
const clients = new Set();
const approvals = new Map();
let threadId = null;
let activeTurn = null;
let workspace = null;
let sessionMode = 'readOnly';
let accountType = null;
let connecting = false;

function isLocal(req) {
  const addr = req.socket.remoteAddress || '';
  return (addr === '127.0.0.1' || addr === '::1' || addr === '::ffff:127.0.0.1') &&
    ALLOWED_HOSTS.has(req.headers.host || '');
}

function sameOrigin(req) {
  const origin = req.headers.origin;
  return !origin || ALLOWED_HOSTS.has(origin.replace(/^http:\/\//, ''));
}

function validToken(candidate) {
  if (typeof candidate !== 'string' || candidate.length !== TOKEN.length) return false;
  return timingSafeEqual(Buffer.from(candidate), Buffer.from(TOKEN));
}

function headers(extra = {}) {
  return {
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer',
    'Cross-Origin-Resource-Policy': 'same-origin',
    ...extra
  };
}

function json(res, status, body) {
  res.writeHead(status, headers({ 'Content-Type': 'application/json; charset=utf-8' }));
  res.end(JSON.stringify(body));
}

function sendEvent(client, message) {
  if (client.destroyed || !client.writable) {
    clients.delete(client);
    return;
  }
  const data = JSON.stringify(message);
  if (data.length > MAX_EVENT_CHARS) {
    client.write('data: ' + JSON.stringify({ type: 'notice', message: 'A very large event was truncated.' }) + '\n\n');
  } else {
    client.write('data: ' + data + '\n\n');
  }
}

function broadcast(message) {
  for (const client of clients) sendEvent(client, message);
}

function safeMessage(value) {
  return typeof value === 'string' ? value.slice(0, 1000) : 'Unknown error.';
}

function handleServerRequest(message) {
  // Unknown server-initiated RPCs fail closed. Never auto-approve commands.
  if (!APPROVAL_METHODS.has(message.method)) {
    rpc.replyError(message.id, -32601, 'Neon Core does not support this request.');
    return;
  }
  const key = String(message.id);
  const params = message.params || {};
  // A response from a different or expired thread cannot be approved by this UI.
  if (params.threadId && params.threadId !== threadId) {
    rpc.reply(message.id, { decision: 'decline' });
    return;
  }
  if (message.method === 'item/fileChange/requestApproval' && sessionMode !== 'workspaceWrite') {
    rpc.reply(message.id, { decision: 'decline' });
    return;
  }
  if (approvals.has(key)) return;
  const timer = setTimeout(() => decide(key, 'decline'), 120000);
  approvals.set(key, { message, timer });
  broadcast({
    type: 'approval',
    requestId: key,
    method: message.method,
    params: {
      reason: safeMessage(params.reason),
      command: Array.isArray(params.command) ? params.command.join(' ') :
        safeMessage(params.command || ''),
      cwd: safeMessage(params.cwd || ''),
      itemId: params.itemId || null,
      threadId: params.threadId || null,
      turnId: params.turnId || null,
      grantRoot: safeMessage(params.grantRoot || ''),
      networkApprovalContext: params.networkApprovalContext || null
    }
  });
}

function decide(requestId, decision) {
  const entry = approvals.get(requestId);
  if (!entry) return false;
  if (!['accept', 'decline'].includes(decision)) return false;
  clearTimeout(entry.timer);
  approvals.delete(requestId);
  try { rpc.reply(entry.message.id, { decision }); }
  catch (error) {
    broadcast({ type: 'notice', message: safeMessage(error.message) });
  }
  broadcast({ type: 'approvalResolved', requestId, decision });
  return true;
}

rpc.on('serverRequest', handleServerRequest);
rpc.on('notification', (msg) => {
  if (msg.method === 'turn/completed') {
    activeTurn = null;
    // Stale prompts are never left actionable after a turn has finished.
    for (const [key, entry] of approvals) {
      clearTimeout(entry.timer);
      approvals.delete(key);
      broadcast({ type: 'approvalResolved', requestId: key, decision: 'expired' });
    }
  }
  if (msg.method === 'serverRequest/resolved' && msg.params?.requestId !== undefined) {
    const key = String(msg.params.requestId);
    const entry = approvals.get(key);
    if (entry) {
      clearTimeout(entry.timer);
      approvals.delete(key);
      broadcast({ type: 'approvalResolved', requestId: key, decision: 'expired' });
    }
  }
  if (msg.method === 'account/updated') {
    accountType = msg.params?.authMode || null;
  }
  // Whitelisted event payloads stay on the local loopback connection.
  if (EVENT_METHODS.has(msg.method)) {
    broadcast({ type: 'codex', method: msg.method, params: msg.params || {} });
  }
});
rpc.on('warning', (message) => broadcast({ type: 'notice', message }));
rpc.on('disconnect', (message) => {
  activeTurn = null;
  broadcast({ type: 'disconnect', message: safeMessage(message) });
});

async function body(req) {
  let size = 0, raw = '';
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY) throw new Error('Request too large.');
    raw += chunk.toString('utf8');
  }
  try { return JSON.parse(raw || '{}'); }
  catch { throw new Error('Invalid JSON body.'); }
}

async function routes(req, res, url) {
  if (url.pathname === '/api/status' && req.method === 'GET') {
    return json(res, 200, {
      mode: 'local', token: TOKEN, connected: rpc.ready,
      threadId, turnId: activeTurn, cwd: workspace,
      accountType, readOnly: sessionMode === 'readOnly', sessionMode,
      approvalCount: approvals.size
    });
  }

  if (url.pathname === '/api/events' && req.method === 'GET') {
    if (!validToken(url.searchParams.get('token'))) return json(res, 403, { error: 'Unauthorized.' });
    if (clients.size >= 5) return json(res, 429, { error: 'Too many open UI tabs.' });
    res.writeHead(200, headers({
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    }));
    res.write(': connected\n\n');
    clients.add(res);
    sendEvent(res, { type: 'state', threadId, turnId: activeTurn, cwd: workspace,
      connected: rpc.ready, sessionMode, readOnly: sessionMode === 'readOnly' });
    for (const [key, entry] of approvals) {
      sendEvent(res, { type: 'approval', requestId: key, method: entry.message.method,
        params: entry.message.params || {} });
    }
    const ping = setInterval(() => { if (!res.destroyed) res.write(': ping\n\n'); }, 25000);
    req.on('close', () => { clearInterval(ping); clients.delete(res); });
    return;
  }

  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed.' });
  if (!sameOrigin(req) || !validToken(req.headers['x-neon-token'])) {
    return json(res, 403, { error: 'Local origin/token mismatch.' });
  }
  if (req.headers['content-type']?.split(';')[0] !== 'application/json') {
    return json(res, 415, { error: 'Use application/json.' });
  }
  const data = await body(req);

  if (url.pathname === '/api/session') {
    if (connecting || activeTurn || approvals.size) return json(res, 409, {
      error: 'Stop the current turn and resolve approvals before changing the project or permissions.'
    });
    const cwd = data.cwd;
    const requestedMode = data.mode === undefined ? 'readOnly' : data.mode;
    if (!['readOnly','workspaceWrite'].includes(requestedMode)) {
      return json(res, 400, { error: 'Only readOnly and workspaceWrite modes are supported.' });
    }
    if (typeof cwd !== 'string' || cwd.length > 2048 || !isAbsolute(cwd)) {
      return json(res, 400, { error: 'Choose an existing absolute project folder.' });
    }
    const full = await realpath(cwd);
    if (!(await stat(full)).isDirectory()) return json(res, 400, { error: 'Not a directory.' });
    if (requestedMode === 'workspaceWrite' && data.confirmWorkspace !== full) {
      return json(res, 400, {
        error: 'Write access requires an explicit confirmation matching the canonical project path.'
      });
    }
    connecting = true;
    try {
      await rpc.start();
      const account = await rpc.call('account/read', { refreshToken: false });
      if (account.requiresOpenaiAuth && !account.account) {
        return json(res, 401, { error: 'Codex not signed in. Run "codex login" in a local terminal.' });
      }
      // Never use dangerFullAccess. Writable mode is strictly opt-in and rooted
      // in the chosen workspace with network disabled at the sandbox layer.
      const response = await rpc.call('thread/start', {
        cwd: full, sandbox: requestedMode, approvalPolicy: 'on-request',
        serviceName: 'neon_core'
      });
      if (!response.thread?.id) throw new Error('thread/start did not return a thread id.');
      workspace = full;
      threadId = response.thread.id;
      sessionMode = requestedMode;
      accountType = account.account?.type || null;
      const readOnly = sessionMode === 'readOnly';
      broadcast({ type: 'state', connected: true, cwd: workspace, threadId, readOnly, sessionMode });
      return json(res, 200, { ok: true, threadId, cwd: workspace, readOnly, sessionMode, accountType });
    } finally {
      connecting = false;
    }
  }

  if (url.pathname === '/api/turn') {
    if (!rpc.ready || !threadId) return json(res, 409, { error: 'Connect a project first.' });
    if (activeTurn) return json(res, 409, { error: 'Previous turn is still running.' });
    const prompt = data.prompt;
    if (typeof prompt !== 'string' || !prompt.trim() || prompt.length > 12000) {
      return json(res, 400, { error: 'Enter a prompt up to 12,000 characters.' });
    }
    activeTurn = 'starting';
    try {
      const result = await rpc.call('turn/start', {
        threadId, cwd: workspace,
        input: [{ type: 'text', text: prompt.trim() }],
        approvalPolicy: 'on-request',
        sandboxPolicy: sessionMode === 'workspaceWrite'
          ? { type: 'workspaceWrite', writableRoots: [workspace], networkAccess: false }
          : { type: 'readOnly' }
      });
      if (!result.turn?.id) throw new Error('turn/start did not return a turn id.');
      // Completion may race with the request response; only replace while starting.
      if (activeTurn === 'starting') activeTurn = result.turn.id;
      broadcast({ type: 'userPrompt', text: prompt.trim(), turnId: result.turn.id });
      return json(res, 200, { ok: true, turnId: result.turn.id });
    } catch (err) {
      activeTurn = null;
      throw err;
    }
  }

  if (url.pathname === '/api/approval') {
    const key = String(data.requestId || '');
    if (!['accept', 'decline'].includes(data.decision)) {
      return json(res, 400, { error: 'Invalid approval decision.' });
    }
    if (!decide(key, data.decision)) return json(res, 409, { error: 'Approval expired or already resolved.' });
    return json(res, 200, { ok: true });
  }

  if (url.pathname === '/api/interrupt') {
    if (!rpc.ready || !threadId || !activeTurn || activeTurn === 'starting') {
      return json(res, 409, { error: 'No running turn.' });
    }
    await rpc.call('turn/interrupt', { threadId, turnId: activeTurn });
    return json(res, 200, { ok: true });
  }

  return json(res, 404, { error: 'Unknown action.' });
}

async function staticFile(req, res, url) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return json(res, 405, { error: 'Method not allowed.' });
  }
  const pathName = decodeURIComponent(url.pathname);
  const relative = pathName === '/' ? 'index.html' : pathName.slice(1);
  // Never serve project source, .git, docs, or a bridge implementation.
  if (relative !== 'index.html' &&
      !/^assets\/[a-zA-Z0-9._-]+\.(js|css|svg)$/.test(relative)) {
    return json(res, 404, { error: 'Not found.' });
  }
  const file = resolve(ROOT, relative);
  if (file !== resolve(ROOT, 'index.html') && !file.startsWith(resolve(ROOT, 'assets') + sep)) {
    return json(res, 404, { error: 'Not found.' });
  }
  let contents;
  try { contents = await readFile(file); }
  catch { return json(res, 404, { error: 'Not found.' }); }
  if (relative === 'index.html') {
    let html = contents.toString('utf8');
    html = html.replace('</head>',
      '<script>window.__NEON_LOCAL_MODE__=true;</script>' +
      '<link rel="stylesheet" href="/assets/local-client.css"></head>');
    html = html.replace('</body>', '<script src="/assets/local-client.js"></script></body>');
    contents = Buffer.from(html);
  }
  res.writeHead(200, headers({
    'Content-Type': MIME[extname(file)] || 'application/octet-stream',
    'Content-Length': contents.length
  }));
  if (req.method === 'HEAD') return res.end();
  res.end(contents);
}

const server = createServer(async (req, res) => {
  if (!isLocal(req) || !sameOrigin(req)) {
    return json(res, 403, { error: 'Neon Core is localhost-only.' });
  }
  try {
    const url = new URL(req.url || '/', 'http://' + req.headers.host);
    if (url.pathname.startsWith('/api/')) return await routes(req, res, url);
    return await staticFile(req, res, url);
  } catch (error) {
    const msg = safeMessage(error.message);
    return json(res, /ENOENT/.test(error.code || '') ? 400 : 500, { error: msg });
  }
});

server.on('upgrade', (_request, socket) => socket.destroy());
server.listen(PORT, '127.0.0.1', () => {
  console.log('Neon Core local Codex bridge at http://127.0.0.1:' + PORT);
  console.log('Local-only connection. Read-only by default; explicit workspaceWrite opt-in required. Sign in with "codex login" first.');
});
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, () => {
    for (const approval of approvals.values()) clearTimeout(approval.timer);
    rpc.shutdown();
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 2000).unref();
  });
}
