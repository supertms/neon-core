/* Neon Core v0.9 local-only Codex UI.
   This file is injected solely by local/server.mjs, never by public Pages. */
(() => {
  'use strict';
  const box = document.createElement('aside');
  box.id = 'neon-local';
  box.setAttribute('aria-label', 'Neon Core local Codex connection');
  box.innerHTML = [
    '<div class="local-header"><span class="local-led" id="local-led"></span>',
    '<strong>LIVE CODEX · LOCAL</strong><button class="minimize" id="local-min">−</button></div>',
    '<div class="local-body">',
      '<div><div class="local-caption">01 · Choose project</div>',
      '<label for="local-cwd">本机项目绝对路径（只读模式）</label>',
      '<input id="local-cwd" autocomplete="off" spellcheck="false" placeholder="C:\\\\Projects\\\\my-app">',
      '<div class="btn-row" style="margin-top:8px">',
      '<button id="local-connect">连接 Codex</button>',
      '<span class="read-only" id="local-state">尚未连接</span></div></div>',
      '<div><div class="local-caption">02 · Ask GPT / Codex</div>',
      '<label for="local-prompt">发送真实任务（第一版不允许修改文件）</label>',
      '<textarea id="local-prompt" placeholder="分析当前项目结构，并总结下一步应该完成的工作。" disabled></textarea>',
      '<div class="btn-row" style="margin-top:7px">',
      '<button id="local-send" disabled>▶ 执行任务</button>',
      '<button id="local-interrupt" disabled>■ 中断</button>',
      '</div></div>',
      '<div id="local-approvals"></div>',
      '<div class="local-caption">03 · Live Activity Stream</div>',
      '<div class="message-list" id="local-messages" aria-live="polite"></div>',
      '<div class="local-footer">只读本机连接 · 模型由已登录的 Codex 决定 · 用户审批不能自动通过</div>',
    '</div>'
  ].join('');
  document.body.appendChild(box);

  const $ = (id) => document.getElementById(id);
  const led = $('local-led');
  const stateText = $('local-state');
  const cwdField = $('local-cwd');
  const promptField = $('local-prompt');
  const connectButton = $('local-connect');
  const sendButton = $('local-send');
  const interruptButton = $('local-interrupt');
  const approvalsBox = $('local-approvals');
  const messages = $('local-messages');
  const itemPanels = new Map();
  const pendingApprovals = new Map();
  let token = null;
  let threadId = null;
  let activeTurn = null;
  let currentAnswer = null;
  let source = null;

  function status(message, connected = false) {
    stateText.textContent = message;
    led.classList.toggle('connected', connected);
  }

  function add(text, cls = '') {
    const row = document.createElement('div');
    row.className = 'message ' + cls;
    row.textContent = text;
    messages.appendChild(row);
    while (messages.children.length > 95) messages.firstElementChild.remove();
    messages.scrollTop = messages.scrollHeight;
    return row;
  }

  async function post(path, payload) {
    const response = await fetch(path, {
      method: 'POST', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', 'X-Neon-Token': token },
      body: JSON.stringify(payload)
    });
    const content = await response.json();
    if (!response.ok) throw new Error(content.error || 'Local bridge error.');
    return content;
  }

  function preview(item) {
    switch (item.type) {
      case 'commandExecution': return { kind:'command',icon:'›',title:'LIVE · COMMAND',
        line:Array.isArray(item.command)?item.command.join(' '):String(item.command||'Command'),w:242,h:158 };
      case 'fileChange': return { kind:'code',icon:'⌘',title:'LIVE · FILE CHANGE',
        line:(item.changes||[]).map(c=>c.path).join('\n')||'Proposed file changes',w:240,h:166 };
      case 'agentMessage': return { kind:'analysis',icon:'◈',title:'GPT · RESPONSE',
        line:String(item.text||'Receiving response...'),w:228,h:140 };
      case 'plan': return {kind:'plan',icon:'▣',title:'LIVE · PLAN',
        line:String(item.text||'Working on plan'),w:225,h:153 };
      case 'mcpToolCall': return {kind:'analysis',icon:'⌁',title:'TOOL · '+(item.tool||'Call'),
        line:'Tool request',w:215,h:140 };
      default:return null;
    }
  }

  function updatePanel(node, text) {
    if (!node || !node.isConnected) return;
    const body = node.querySelector('.panel-content');
    if (!body) return;
    body.style.whiteSpace = 'pre-wrap';
    body.style.overflow = 'hidden';
    body.style.overflowWrap = 'anywhere';
    body.style.fontFamily = 'Consolas, monospace';
    body.style.lineHeight = '1.55';
    body.textContent = text.slice(-700);
  }

  function trackItem(item) {
    if (!item || !item.id) return;
    const spec = preview(item);
    if (!spec) return;
    const existing = itemPanels.get(item.id);
    if (existing) {
      updatePanel(existing.node, spec.line);
      return;
    }
    if (typeof window.NeonUI?.spawn !== 'function') return;
    const node = window.NeonUI.spawn({
      kind:spec.kind,icon:spec.icon,title:spec.title,
      live:'REAL',w:spec.w,h:spec.h,
      body:'<div class="tag">LIVE CODEX EVENT</div>'
    });
    if (!node) return;
    itemPanels.set(item.id,{node,text:spec.line});
    updatePanel(node,spec.line);
    if (item.type === 'commandExecution') add('开始执行命令：'+spec.line.slice(0,180));
    else if (item.type === 'fileChange') add('Codex 文件变更事件：'+spec.line.slice(0,180));
  }

  function progress(params, method) {
    const id = params.itemId;
    if (!id) return;
    const item = itemPanels.get(id);
    if (!item) return;
    const delta = String(params.delta || '').slice(0,4000);
    item.text = (item.text + delta).slice(-4000);
    updatePanel(item.node,item.text);
    if (method === 'item/commandExecution/outputDelta' && delta.length) {
      // Keep terminal output inside the local page; never send it to Pages.
      if (delta.includes('error') || delta.includes('failed')) add(delta.slice(0,240),'error');
    }
  }

  function setTurn(id) {
    activeTurn = id || null;
    sendButton.disabled = !threadId || !!activeTurn;
    interruptButton.disabled = !activeTurn;
  }

  function settleItem(item) {
    if (!item || !item.id) return;
    const p = itemPanels.get(item.id);
    if (p && p.node.isConnected) {
      const last = preview(item);
      if (item.type === 'commandExecution') {
        const text = (item.aggregatedOutput || p.text || '') +
          '\nStatus: '+(item.status||'done')+
          (item.exitCode !== undefined ? ' · Exit '+item.exitCode : '');
        updatePanel(p.node,text);
      } else if (last) updatePanel(p.node,last.line);
      const state = p.node.querySelector('.state');
      if (state) state.textContent = item.status || 'DONE';
      // Recall is still the actual existing Classic panel animation.
      setTimeout(() => {
        if (p.node.isConnected) window.NeonUI?.retire?.(p.node);
        itemPanels.delete(item.id);
      },3500);
    }
    if (item.type === 'agentMessage' && item.text) add(item.text.slice(0,1400),'codex');
    if (item.type === 'commandExecution') add('命令完成 · '+(item.status||'unknown')+' · '+(item.exitCode??'—'),'codex');
  }

  function approvalPrompt(event) {
    const key=String(event.requestId||'');
    if (!key || pendingApprovals.has(key)) return;
    const root=document.createElement('section');
    root.className='approval';
    const title=document.createElement('strong');
    title.textContent='⚠ Codex 需要明确批准';
    const text=document.createElement('p');
    const p=event.params||{};
    text.textContent=[p.reason||'请求执行操作',p.command||'',p.cwd||'']
      .filter(Boolean).join('\n').slice(0,900);
    const buttons=document.createElement('div');
    buttons.className='btn-row';
    const yes=document.createElement('button');yes.textContent='允许本次';
    const no=document.createElement('button');no.textContent='拒绝';no.className='deny';
    function clear(){root.remove();pendingApprovals.delete(key);}
    async function answer(decision){
      yes.disabled=no.disabled=true;
      try {
        if (decision === 'accept' && !window.confirm('确认允许 Codex 执行当前显示的操作？')) {
          yes.disabled=no.disabled=false;return;
        }
        await post('/api/approval',{requestId:key,decision});
        clear();
        add('审批结果：'+decision,decision==='accept'?'codex':'error');
      } catch (err) {add(err.message,'error');yes.disabled=no.disabled=false;}
    }
    yes.onclick=()=>answer('accept');no.onclick=()=>answer('decline');
    buttons.append(yes,no);root.append(title,text,buttons);
    approvalsBox.appendChild(root);
    pendingApprovals.set(key,clear);
    add('Codex 正在等待人工批准','error');
  }

  function handleEvent(value){
    if (value.type === 'state') {
      if(value.threadId) {
        threadId=value.threadId;cwdField.value=value.cwd||cwdField.value;
        status('Codex 已连接 · 只读',true);
        promptField.disabled=false;
        setTurn(value.turnId);
      }
      return;
    }
    if (value.type === 'notice' || value.type === 'disconnect') {
      add(value.message||'Disconnected','error');
      if(value.type==='disconnect') {status('Codex 已断开');setTurn(null);}
      return;
    }
    if (value.type === 'approval')return approvalPrompt(value);
    if (value.type === 'approvalResolved') {
      pendingApprovals.get(String(value.requestId))?.();
      return;
    }
    if (value.type !== 'codex')return;
    const method=value.method;
    const p=value.params||{};
    if(method==='item/started') trackItem(p.item);
    else if(method==='item/completed')settleItem(p.item);
    else if(method==='item/commandExecution/outputDelta')progress(p,method);
    else if(method==='item/agentMessage/delta'){
      const delta=String(p.delta||'');
      if(!currentAnswer||!currentAnswer.isConnected)currentAnswer=add('GPT: ','codex');
      currentAnswer.textContent=(currentAnswer.textContent+delta).slice(-5000);
      messages.scrollTop=messages.scrollHeight;
    }else if(method==='turn/started'){
      setTurn(p.turn?.id||'working');
      currentAnswer=null;
      add('GPT 正在处理任务…');
    }else if(method==='turn/completed'){
      setTurn(null);
      const t=p.turn||{};
      add('任务结束：'+(t.status||'unknown')+
        (t.error?.message?' · '+t.error.message:''),t.status==='failed'?'error':'codex');
    }else if(method==='error'){
      add(p.error?.message||p.message||'Codex error','error');
    }else if(method==='turn/plan/updated'){
      add('计划更新：'+(p.plan||[]).map(i=>i.step).join(' → ').slice(0,350));
    }
  }

  connectButton.onclick=async()=>{
    connectButton.disabled=true;
    status('连接中…');
    try{
      const res=await post('/api/session',{cwd:cwdField.value.trim()});
      threadId=res.threadId;
      promptField.disabled=false;
      setTurn(null);
      status('Codex 已连接 · 只读',true);
      add('已连接 '+res.cwd,'codex');
      connectButton.textContent='重新创建会话';
    }catch(err){
      add(err.message,'error');status('未连接');
    }finally{connectButton.disabled=false;}
  };

  sendButton.onclick=async()=>{
    const prompt=promptField.value.trim();
    if(!prompt)return;
    sendButton.disabled=true;add('你：'+prompt,'user');
    try{
      const result=await post('/api/turn',{prompt});
      setTurn(result.turnId);
      promptField.value='';
    }catch(err){add(err.message,'error');setTurn(null);}
  };

  interruptButton.onclick=async()=>{
    try{await post('/api/interrupt',{});add('已请求停止当前任务。');}
    catch(err){add(err.message,'error');}
  };

  $('local-min').onclick=()=>{
    box.classList.toggle('minimized');
    $('local-min').textContent=box.classList.contains('minimized')?'＋':'−';
  };
  promptField.addEventListener('keydown',(e)=>{
    if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)&&!sendButton.disabled)sendButton.click();
  });

  async function bootstrap(){
    try{
      const res=await fetch('/api/status',{credentials:'same-origin',cache:'no-store'});
      if(!res.ok)throw new Error('Local bridge unavailable.');
      const info=await res.json();
      token=info.token;
      if(info.cwd)cwdField.value=info.cwd;
      if(info.threadId){
        threadId=info.threadId;promptField.disabled=false;
        status('Codex 已连接 · 只读',true);
        setTurn(info.turnId);
      }
      window.NeonUI?.stop?.();
      window.NeonUI?.reset?.();
      source=new EventSource('/api/events?token='+encodeURIComponent(token));
      source.onmessage=(event)=>{
        try{handleEvent(JSON.parse(event.data));}
        catch(err){add('事件解析错误：'+err.message,'error');}
      };
      source.onerror=()=>add('本地事件流正在重连…','error');
      add('本地服务已就绪。选择项目路径并连接 Codex。');
    }catch(err){status('本地连接失败');add(err.message,'error');}
  }

  bootstrap();
})();