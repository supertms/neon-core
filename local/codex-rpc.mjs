// Codex App Server JSONL transport. No credentials are handled by Neon Core.
// Node 20+ (built-in APIs only). App Server is spawned locally over stdio.
import { EventEmitter } from 'node:events';
import { spawn } from 'node:child_process';
import readline from 'node:readline';

function defaultLauncher() {
  // Windows npm installs codex.cmd. This command string is constant, with no
  // user-supplied interpolation, to avoid command injection via cmd.exe.
  return process.platform === 'win32'
    ? spawn('cmd.exe', ['/d', '/s', '/c', 'codex app-server'], {
        stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true,
      })
    : spawn('codex', ['app-server'], {
        stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true,
      });
}

export class CodexRpc extends EventEmitter {
  constructor({ launcher = defaultLauncher, timeoutMs = 30000 } = {}) {
    super();
    this.launcher = launcher;
    this.timeoutMs = timeoutMs;
    this.child = null;
    this.pending = new Map();
    this.nextId = 0;
    this.ready = false;
    this.starting = null;
    this.closed = false;
  }

  write(message) {
    if (!this.child?.stdin?.writable) {
      throw new Error('Codex App Server is not running.');
    }
    this.child.stdin.write(JSON.stringify(message) + '\n');
  }

  call(method, params = {}, ms = this.timeoutMs) {
    if (this.closed) return Promise.reject(new Error('Codex transport closed.'));
    const id = ++this.nextId;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error('Codex timed out waiting for ' + method));
      }, ms);
      this.pending.set(id, { resolve, reject, timer });
      try {
        this.write({ id, method, params });
      } catch (error) {
        clearTimeout(timer);
        this.pending.delete(id);
        reject(error);
      }
    });
  }

  notify(method, params = {}) {
    this.write({ method, params });
  }

  reply(id, result) {
    if (typeof id !== 'number' && typeof id !== 'string') {
      throw new Error('Invalid server request id');
    }
    this.write({ id, result });
  }

  replyError(id, code = -32601, message = 'Unsupported client method') {
    this.write({ id, error: { code, message } });
  }

  handle(message) {
    if (!message || typeof message !== 'object') return;
    if (message.method && message.id !== undefined) {
      this.emit('serverRequest', message);
      return;
    }
    if (message.method) {
      this.emit('notification', message);
      return;
    }
    if (message.id !== undefined) {
      const p = this.pending.get(message.id);
      if (!p) return;
      this.pending.delete(message.id);
      clearTimeout(p.timer);
      if (message.error) p.reject(new Error(message.error.message || 'Codex RPC error'));
      else p.resolve(message.result ?? {});
    }
  }

  async start() {
    if (this.ready) return;
    if (this.starting) return this.starting;
    this.starting = this.connect();
    try {
      await this.starting;
    } finally {
      this.starting = null;
    }
  }

  async connect() {
    if (this.closed) throw new Error('Codex transport was closed.');
    this.child = this.launcher();
    const child = this.child;
    child.on('error', (error) => this.fail(new Error(
      'Unable to start Codex. Install the CLI and run "codex login". ' + error.message
    )));
    child.on('exit', (code, signal) => this.fail(new Error(
      'Codex App Server exited (' + (signal || code) + ').'
    )));
    const lines = readline.createInterface({ input: child.stdout, crlfDelay: Infinity });
    lines.on('line', (line) => {
      if (line.length > 4_000_000) return;
      try { this.handle(JSON.parse(line)); }
      catch { this.emit('warning', 'Malformed Codex JSONL message skipped.'); }
    });
    // Codex stderr can contain sensitive diagnostics; do not relay it to the browser.
    child.stderr.on('data', () => {});
    await this.call('initialize', {
      clientInfo: { name: 'neon_core', title: 'Neon Core', version: '0.9.0' }
    }, 25000);
    this.notify('initialized', {});
    this.ready = true;
    this.emit('ready');
  }

  fail(error) {
    if (this.closed) return;
    this.ready = false;
    this.closed = true;
    for (const [id, p] of this.pending) {
      clearTimeout(p.timer);
      p.reject(error);
      this.pending.delete(id);
    }
    this.emit('disconnect', error.message);
  }

  shutdown() {
    if (this.closed) return;
    this.closed = true;
    this.ready = false;
    for (const p of this.pending.values()) {
      clearTimeout(p.timer);
      p.reject(new Error('Codex connection closed.'));
    }
    this.pending.clear();
    if (this.child && !this.child.killed) this.child.kill();
  }
}
