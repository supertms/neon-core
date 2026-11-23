/* Neon Core v0.8 · synchronized spawn and recall resonance.
   Task panels originate inside the holographic space. A signal may connect
   the core to a panel, but nothing is visually "launched" from the cube. */
(function(){
  'use strict';
  const NS='http://www.w3.org/2000/svg';
  const scene=document.getElementById('scene');
  const core=scene&&scene.querySelector('.core-prism');
  if(!scene||!core){return;}

  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
  const overlay=document.createElementNS(NS,'svg');
  overlay.setAttribute('class','core-motion-paths');
  overlay.setAttribute('aria-hidden','true');
  overlay.setAttribute('focusable','false');
  overlay.setAttribute('preserveAspectRatio','none');
  scene.appendChild(overlay);

  const pulses=new Map();
  const routes=new Set();
  const MAX_ROUTES=3;

  function size(){
    const rect=scene.getBoundingClientRect();
    overlay.setAttribute('viewBox','0 0 '+Math.max(1,rect.width)+' '+Math.max(1,rect.height));
    return rect;
  }
  function point(element,corePoint=false){
    const base=scene.getBoundingClientRect();
    const r=element.getBoundingClientRect();
    return {
      x:r.left-base.left+r.width*.5,
      y:r.top-base.top+r.height*(corePoint?.54:.5)
    };
  }
  function pulse(name,duration){
    if(reduced.matches){return;}
    if(pulses.has(name)){clearTimeout(pulses.get(name));}
    core.classList.remove(name);
    // Restart only the relevant motion; existing panels remain untouched.
    void core.offsetWidth;
    core.classList.add(name);
    pulses.set(name,setTimeout(()=>{
      core.classList.remove(name);
      pulses.delete(name);
    },duration+70));
  }
  function curve(a,b){
    const dx=b.x-a.x,dy=b.y-a.y;
    const length=Math.max(1,Math.hypot(dx,dy));
    const nx=-dy/length,ny=dx/length;
    const bend=Math.min(40,length*.095)*(dy>0?-1:1);
    const c1={x:a.x+dx*.34+nx*bend,y:a.y+dy*.34+ny*bend};
    const c2={x:a.x+dx*.68+nx*bend*.70,y:a.y+dy*.68+ny*bend*.70};
    function at(t){
      const s=1-t;
      return {
        x:s*s*s*a.x+3*s*s*t*c1.x+3*s*t*t*c2.x+t*t*t*b.x,
        y:s*s*s*a.y+3*s*s*t*c1.y+3*s*t*t*c2.y+t*t*t*b.y
      };
    }
    return {
      path:'M '+a.x.toFixed(1)+' '+a.y.toFixed(1)+
        ' C '+c1.x.toFixed(1)+' '+c1.y.toFixed(1)+
        ' '+c2.x.toFixed(1)+' '+c2.y.toFixed(1)+
        ' '+b.x.toFixed(1)+' '+b.y.toFixed(1),
      at
    };
  }
  function node(tag,attrs){
    const item=document.createElementNS(NS,tag);
    Object.entries(attrs).forEach(([key,value])=>item.setAttribute(key,String(value)));
    return item;
  }
  function drawRoute(panel,recall){
    if(reduced.matches||routes.size>=MAX_ROUTES||!panel||!panel.isConnected){return;}
    size();
    const a=recall?point(panel):point(core,true);
    const b=recall?point(core,true):point(panel);
    if(Math.hypot(b.x-a.x,b.y-a.y)<95){return;}
    const shape=curve(a,b);
    const duration=recall?1640:780;
    const group=node('g',{'class':'signal-group'});
    const line=node('path',{
      'class':'signal-route'+(recall?' recall':''),
      d:shape.path,
      stroke:recall?'#a48bff':'#4ddfff'
    });
    const head=node('circle',{
      'class':'signal-head'+(recall?' recall':''),
      cx:a.x,cy:a.y,r:recall?'3.4':'2.6',
      fill:recall?'#c2a8ff':'#8ff4ff'
    });
    const anchor=node('circle',{
      'class':'signal-anchor'+(recall?' recall':''),
      cx:b.x,cy:b.y,r:recall?16:11
    });
    group.append(line,anchor,head);
    overlay.appendChild(group);

    const length=line.getTotalLength();
    line.style.strokeDasharray=String(length);
    const animation=line.animate([
      {strokeDashoffset:length,opacity:0,offset:0},
      {strokeDashoffset:length*.48,opacity:recall?.62:.36,offset:.42},
      {strokeDashoffset:0,opacity:recall?.82:.51,offset:.80},
      {strokeDashoffset:0,opacity:0,offset:1}
    ],{duration,easing:'ease-in-out',fill:'forwards'});
    anchor.animate([
      {opacity:0,offset:0},
      {opacity:0,offset:.76},
      {opacity:.82,offset:.89},
      {opacity:0,offset:1}
    ],{duration,fill:'forwards'});

    const entry={group,frame:0,cleanup:null};
    function cleanup(){
      cancelAnimationFrame(entry.frame);
      animation.cancel();
      group.remove();
      routes.delete(entry);
    }
    entry.cleanup=cleanup;
    routes.add(entry);

    let begun=null;
    function move(now){
      if(!group.isConnected){cleanup();return;}
      if(begun===null)begun=now;
      const progress=Math.min(1,(now-begun)/duration);
      const eased=recall
        ?(progress<.5?2*progress*progress:1-Math.pow(-2*progress+2,2)/2)
        :1-Math.pow(1-progress,2);
      const loc=shape.at(eased);
      head.setAttribute('cx',loc.x.toFixed(1));
      head.setAttribute('cy',loc.y.toFixed(1));
      head.style.opacity=String(Math.min(1,progress*7,(1-progress)*6));
      if(progress<1){entry.frame=requestAnimationFrame(move);}
      else{cleanup();}
    }
    entry.frame=requestAnimationFrame(move);
    // Always free DOM and compositor resources, even in background tabs.
    setTimeout(()=>{if(routes.has(entry)){cleanup();}},duration+240);
  }

  function spawn(panel){
    if(reduced.matches){return;}
    pulse('core-spawn',810);
    drawRoute(panel,false);
  }
  function recall(panel){
    if(reduced.matches){return;}
    pulse('core-recall',1510);
    // Capture the old panel location before the CSS retreat transform begins.
    drawRoute(panel,true);
  }
  function resize(){
    size();
    for(const entry of Array.from(routes)){entry.cleanup();}
  }
  window.addEventListener('resize',resize,{passive:true});
  reduced.addEventListener?.('change',()=>{
    if(reduced.matches){
      for(const entry of Array.from(routes)){entry.cleanup();}
      for(const key of pulses.keys()){clearTimeout(pulses.get(key));core.classList.remove(key);}
      pulses.clear();
    }
  });

  size();
  window.NeonCoreMotion={
    spawn,
    recall,
    getState:()=>({activeRoutes:routes.size,reducedMotion:reduced.matches})
  };
})();