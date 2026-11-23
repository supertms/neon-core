import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import net from 'node:net';
import { setTimeout as sleep } from 'node:timers/promises';

async function freePort() {
  const server=net.createServer();
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const port=server.address().port;
  await new Promise(resolve=>server.close(resolve));
  return port;
}

test('local bridge protects APIs and injects the real Codex client only on loopback', async () => {
  const port=await freePort();
  const origin='http://127.0.0.1:'+port;
  const child=spawn(process.execPath,['local/server.mjs'],{
    cwd:process.cwd(),
    stdio:['ignore','pipe','pipe'],
    env:{...process.env,NEON_PORT:String(port)}
  });
  let logs='';
  child.stdout.on('data',b=>{logs+=String(b)});
  child.stderr.on('data',b=>{logs+=String(b)});
  try{
    let status=null;
    for(let attempt=0;attempt<55;attempt++){
      try{
        const res=await fetch(origin+'/api/status');
        if(res.ok){status=await res.json();break;}
      }catch{}
      await sleep(80);
    }
    assert.ok(status, 'bridge should listen locally: '+logs);
    assert.equal(status.mode,'local');
    assert.equal(status.connected,false);
    assert.equal(status.readOnly,true);
    assert.equal(status.token.length,64);

    const html=await fetch(origin+'/');
    const page=await html.text();
    assert.equal(html.status,200);
    assert.ok(page.includes('window.__NEON_LOCAL_MODE__=true'));
    assert.ok(page.includes('/assets/local-client.js'));
    assert.ok(page.includes('/assets/local-client.css'));

    const script=await fetch(origin+'/assets/local-client.js');
    assert.equal(script.status,200);
    const deniedSource=await fetch(origin+'/local/server.mjs');
    assert.equal(deniedSource.status,404);
    const deniedSse=await fetch(origin+'/api/events');
    assert.equal(deniedSse.status,403);

    const noToken=await fetch(origin+'/api/session',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({cwd:process.cwd()})
    });
    assert.equal(noToken.status,403);

    const badOrigin=await fetch(origin+'/api/session',{
      method:'POST',
      headers:{'Content-Type':'application/json','X-Neon-Token':status.token,
        Origin:'https://malicious.invalid'},
      body:JSON.stringify({cwd:process.cwd()})
    });
    assert.equal(badOrigin.status,403);
  }finally{
    child.kill();
    await sleep(100);
  }
});
