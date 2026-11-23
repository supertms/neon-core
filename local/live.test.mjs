import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, writeFile, chmod, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import net from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';

async function openPort(){
  const sock=net.createServer();
  await new Promise(resolve=>sock.listen(0,'127.0.0.1',resolve));
  const port=sock.address().port;
  await new Promise(resolve=>sock.close(resolve));
  return port;
}

test('local bridge performs real JSONL session, turn events, and manual approval end-to-end (mock Codex)',async()=>{
  if(process.platform==='win32')return; // PATH shim fixture is POSIX-specific
  const tmp=await mkdtemp(join(tmpdir(),'neon-codex-'));
  const fixture=await readFile(new URL('./fixtures/mock-codex.mjs',import.meta.url),'utf8');
  const fakePath=join(tmp,'codex');
  await writeFile(fakePath,'#!/usr/bin/env node\n'+fixture);
  await chmod(fakePath,0o755);
  const port=await openPort();
  const base='http://127.0.0.1:'+port;
  const proc=spawn(process.execPath,['local/server.mjs'],{
    cwd:process.cwd(),
    env:{...process.env,NEON_PORT:String(port),PATH:tmp+':'+process.env.PATH},
    stdio:['ignore','pipe','pipe']
  });
  let logs='';
  proc.stdout.on('data',b=>{logs+=String(b)});
  proc.stderr.on('data',b=>{logs+=String(b)});
  let reader=null;
  let abort=null;
  try{
    let status=null;
    for(let n=0;n<50;n++){
      try{
        const res=await fetch(base+'/api/status');
        if(res.ok){status=await res.json();break;}
      }catch{}
      await delay(75);
    }
    assert.ok(status,'Local bridge should start: '+logs);
    const headers={'Content-Type':'application/json','X-Neon-Token':status.token};
    const send=async (route,payload)=>{
      const res=await fetch(base+route,{method:'POST',headers,body:JSON.stringify(payload)});
      const obj=await res.json();
      assert.equal(res.status,200,route+': '+JSON.stringify(obj));
      return obj;
    };
    abort=new AbortController();
    const eventsResponse=await fetch(base+'/api/events?token='+status.token,{signal:abort.signal});
    assert.equal(eventsResponse.status,200);
    reader=eventsResponse.body.getReader();
    let buffer='';
    const buffered=[];
    async function nextUntil(predicate){
      while(true){
        for(let i=0;i<buffered.length;i++){
          if(predicate(buffered[i]))return buffered.splice(i,1)[0];
        }
        const {done,value}=await reader.read();
        if(done)throw new Error('SSE stream closed before desired event');
        buffer+=new TextDecoder().decode(value);
        let end;
        while((end=buffer.indexOf('\n\n'))>=0){
          const part=buffer.slice(0,end);
          buffer=buffer.slice(end+2);
          const data=part.split('\n').find(line=>line.startsWith('data: '));
          if(data)buffered.push(JSON.parse(data.slice(6)));
        }
      }
    }
    const session=await send('/api/session',{cwd:process.cwd()});
    assert.equal(session.threadId,'thread-1');
    assert.equal(session.readOnly,true);

    const turn=await send('/api/turn',{prompt:'Inspect this repository, read only.'});
    assert.equal(turn.turnId,'turn-1');
    const commandEvent=await nextUntil(x=>x.type==='codex'&&x.method==='item/started');
    assert.equal(commandEvent.params.item.type,'commandExecution');

    const approval=await nextUntil(x=>x.type==='approval');
    assert.equal(approval.method,'item/commandExecution/requestApproval');
    assert.equal(approval.requestId,'91');
    // Never silently approve a command; an explicit decision must be sent.
    const decision=await send('/api/approval',{requestId:'91',decision:'decline'});
    assert.equal(decision.ok,true);
    const finished=await nextUntil(x=>x.type==='codex'&&x.method==='turn/completed');
    assert.equal(finished.params.turn.status,'completed');
  }finally{
    abort?.abort();
    reader?.cancel().catch(()=>{});
    proc.kill();
    await delay(100);
    await rm(tmp,{recursive:true,force:true});
  }
});
