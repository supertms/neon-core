// Test-only fake Codex CLI. Never used in a real Neon Core session.
import readline from 'node:readline';

const lines = readline.createInterface({input:process.stdin,crlfDelay:Infinity});
function send(message){process.stdout.write(JSON.stringify(message)+'\n');}
let mode='readOnly',threadId='thread-1',turnId='turn-1';

for await (const line of lines) {
  let m;
  try { m=JSON.parse(line); } catch { continue; }
  if(m.method==='initialize'){
    send({id:m.id,result:{userAgent:'mock-codex/1.0'}});
  }else if(m.method==='account/read'){
    send({id:m.id,result:{account:{type:'chatgpt'},requiresOpenaiAuth:true}});
  }else if(m.method==='thread/start'){
    mode=m.params.sandbox;
    if(!['readOnly','workspaceWrite'].includes(mode)){
      send({id:m.id,error:{code:-32602,message:'Invalid sandbox: '+mode}});
      continue;
    }
    threadId=mode==='workspaceWrite'?'thread-write':'thread-1';
    send({id:m.id,result:{thread:{id:threadId}, sandbox:mode}});
  }else if(m.method==='turn/start'){
    if(m.params.sandboxPolicy?.type!==mode){
      send({id:m.id,error:{code:-32602,message:'Mode mismatch'}});
      continue;
    }
    if(mode==='workspaceWrite'){
      if(m.params.sandboxPolicy.networkAccess!==false ||
          m.params.sandboxPolicy.writableRoots?.length!==1){
        send({id:m.id,error:{code:-32602,message:'Unexpected write sandbox policy'}});
        continue;
      }
    }
    turnId=mode==='workspaceWrite'?'turn-write':'turn-1';
    send({id:m.id,result:{turn:{id:turnId,status:'inProgress'}}});
    send({method:'turn/started',params:{threadId,turn:{id:turnId,status:'inProgress'}}});
    if(mode==='workspaceWrite'){
      const diff='diff --git a/demo.txt b/demo.txt\n--- a/demo.txt\n+++ b/demo.txt\n@@ -1 +1 @@\n-old\n+new\n';
      const item={id:'item-write',type:'fileChange',status:'inProgress',
        changes:[{path:'demo.txt',kind:'update',diff}]};
      send({method:'item/started',params:{threadId,turnId,item}});
      send({method:'turn/diff/updated',params:{threadId,turnId,diff}});
      send({id:92,method:'item/fileChange/requestApproval',params:{
        threadId,turnId,itemId:'item-write',reason:'Test patch approval',grantRoot:m.params.cwd
      }});
    }else{
      send({method:'item/started',params:{threadId,turnId,
        item:{id:'item-1',type:'commandExecution',command:['echo','testing'],
          cwd:m.params.cwd,status:'inProgress'}}});
      send({id:91,method:'item/commandExecution/requestApproval',
        params:{threadId,turnId,itemId:'item-1',
          command:['echo','testing'],cwd:m.params.cwd,reason:'Test approval'}});
    }
  }else if(m.id===92 && m.result?.decision){
    send({method:'item/completed',params:{threadId,turnId,
      item:{id:'item-write',type:'fileChange',
        changes:[{path:'demo.txt',kind:'update'}],
        status:m.result.decision==='accept'?'completed':'declined'}}});
    send({method:'turn/completed',params:{threadId,
      turn:{id:turnId,status:'completed',items:[]}}});
  }else if(m.id===91 && m.result?.decision){
    send({method:'item/completed',params:{threadId,turnId,
      item:{id:'item-1',type:'commandExecution',command:['echo','testing'],
        status:m.result.decision==='accept'?'completed':'declined',exitCode:0}}});
    send({method:'turn/completed',params:{threadId,
      turn:{id:turnId,status:'completed',items:[]}}});
  }else if(m.method==='turn/interrupt'){
    send({id:m.id,result:{}});
    send({method:'turn/completed',params:{threadId,
      turn:{id:turnId,status:'interrupted',items:[]}}});
  }
}
