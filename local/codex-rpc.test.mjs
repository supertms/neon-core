import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter, once } from 'node:events';
import { PassThrough } from 'node:stream';
import { CodexRpc } from './codex-rpc.mjs';

function mockCodex() {
  const child = new EventEmitter();
  child.stdin = new PassThrough();
  child.stdout = new PassThrough();
  child.stderr = new PassThrough();
  child.killed = false;
  child.kill = () => { child.killed = true; };
  const writes = [];
  let incoming = '';
  child.stdin.on('data', chunk => {
    incoming += String(chunk);
    let cut;
    while ((cut = incoming.indexOf('\n')) >= 0) {
      const line = incoming.slice(0, cut);
      incoming = incoming.slice(cut + 1);
      const msg = JSON.parse(line);
      writes.push(msg);
      if (msg.method === 'initialize') {
        child.stdout.write(JSON.stringify({ id: msg.id, result: { userAgent: 'test' } }) + '\n');
      } else if (msg.method === 'thread/start') {
        child.stdout.write(JSON.stringify({ id: msg.id, result: { thread: { id: 'thread-real-01' } } }) + '\n');
      }
    }
  });
  return { child, writes };
}

test('Codex RPC initializes once and starts threads with JSONL', async () => {
  const fake = mockCodex();
  const rpc = new CodexRpc({ launcher: () => fake.child, timeoutMs: 2000 });
  await rpc.start();
  assert.equal(rpc.ready, true);
  assert.equal(fake.writes[0].method, 'initialize');
  assert.equal(fake.writes[1].method, 'initialized');
  assert.equal(fake.writes[0].params.clientInfo.name, 'neon_core');
  const result = await rpc.call('thread/start', { sandbox: 'read-only', cwd: '/tmp/test' });
  assert.equal(result.thread.id, 'thread-real-01');
  assert.equal(fake.writes[2].params.sandbox, 'read-only');
  await rpc.start();
  assert.equal(fake.writes.filter(x => x.method === 'initialize').length, 1);
  rpc.shutdown();
});

test('Codex RPC delivers command events and never auto-approves server requests', async () => {
  const fake = mockCodex();
  const rpc = new CodexRpc({ launcher: () => fake.child, timeoutMs: 2000 });
  await rpc.start();
  const notification = once(rpc, 'notification');
  fake.child.stdout.write(JSON.stringify({
    method: 'item/started', params: { item: { id: 'i1', type: 'commandExecution', command: ['ls'] } }
  }) + '\n');
  const [evt] = await notification;
  assert.equal(evt.params.item.type, 'commandExecution');

  const serverRequest = once(rpc, 'serverRequest');
  fake.child.stdout.write(JSON.stringify({
    id: 88, method: 'item/commandExecution/requestApproval',
    params: { command: ['echo','hello'], reason: 'permission needed' }
  }) + '\n');
  const [approval] = await serverRequest;
  assert.equal(approval.id, 88);
  assert.equal(fake.writes.filter(x => x.id === 88).length, 0,
    'No approval response should be sent without a user decision.');
  rpc.reply(88, { decision: 'decline' });
  assert.deepEqual(fake.writes.at(-1), { id: 88, result: { decision: 'decline' } });
  rpc.shutdown();
});
