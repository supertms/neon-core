// Test-only fake Codex CLI. The real bridge always invokes the installed
// "codex app-server"; this fixture is copied to a temporary PATH during tests.
import readline from 'node:readline';

const lines=readline.createInterface({input:process.stdin,crlfDelay:Infinity});
function send(x){process.stdout.write(JSON.stringify(x)+'\n');}

for await (const line of lines){
  let m;
  try{m=JSON.parse(line);}catch{continue;}
  if(m.method==='initialize'){
    send({id:m.id,result:{userAgent:'mock-codex/1.0'}});
  }else if(m.method==='account/read'){
    send({id:m.id,result:{account:{type:'chatgpt'},requiresOpenaiAuth:true}});
  }else if(m.method==='thread/start'){
    send({id:m.id,result:{thread:{id:'thread-1'}}});
  }else if(m.method==='turn/start'){
    send({id:m.id,result:{turn:{id:'turn-1',status:'inProgress'}}});
    send({method:'turn/started',params:{threadId:'thread-1',turn:{id:'turn-1',status:'inProgress'}}});
    send({method:'item/started',params:{threadId:'thread-1',turnId:'turn-1',
      item:{id:'item-1',type:'commandExecution',command:['echo','testing'],cwd:m.params.cwd,status:'inProgress'}}});
    send({id:91,method:'item/commandExecution/requestApproval',
      params:{threadId:'thread-1',turnId:'turn-1',itemId:'item-1',
        command:['echo','testing'],cwd:m.params.cwd,reason:'Test approval'}});
  }else if(m.id===91 && m.result?.decision){
    send({method:'item/completed',params:{threadId:'thread-1',turnId:'turn-1',
      item:{id:'item-1',type:'commandExecution',command:['echo','testing'],
        status:m.result.decision==='accept'?'completed':'declined',exitCode:0}}});
    send({method:'turn/completed',params:{threadId:'thread-1',
      turn:{id:'turn-1',status:'completed',items:[]}}});
  }else if(m.method==='turn/interrupt'){
    send({id:m.id,result:{}});
    send({method:'turn/completed',params:{threadId:'thread-1',
      turn:{id:'turn-1',status:'interrupted',items:[]}}});
  }
}
