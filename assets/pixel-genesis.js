/* Pixel Genesis v0.2 — temporary, recyclable pixel VFX driven by simulated task events. */
(function(){
  'use strict';
  const motion=window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
  let preferred=true;
  const colors=['#32d9ff','#42caff','#56e4ff','#8965ff','#a777ff','#41d6c5','#c9f5ff'];
  function enabled(){return preferred && !(motion && motion.matches)}
  function setEnabled(on){preferred=!!on;return enabled()}
  function attachPanel(panel,kind,sequence){
    if(!enabled())return false;
    const variants=kind==='code'?['slice','scan','voxel']:kind==='command'?['scan','voxel','slice']:['voxel','slice','scan'];
    const variant=variants[(sequence*7+kind.length)%variants.length];
    panel.classList.remove('entering');
    panel.classList.add('materializing','variant-'+variant);
    const vfx=document.createElement('div');
    vfx.className='genesis-vfx';
    vfx.setAttribute('aria-hidden','true');
    const pixels=document.createDocumentFragment();
    const total=variant==='voxel'?65:variant==='slice'?49:45;
    // Every panel forms in place, inside its existing slot, never flying out of the core.
    for(let i=0;i<total;i++){
      const e=document.createElement('i');
      e.className='genesis-pixel';
      const col=i%11, row=Math.floor(i/11);
      const sx=6+col*8.3+(Math.random()*6-3);
      const sy=7+row*12+(Math.random()*10-5);
      const size=2.2+Math.random()*6.2;
      const hue=colors[Math.floor(Math.random()*colors.length)];
      const dx=(Math.random()-.5)*(variant==='voxel'?100:66);
      const dy=(Math.random()-.5)*(variant==='voxel'?80:58);
      e.style.cssText='--px:'+sx.toFixed(1)+'%;--py:'+sy.toFixed(1)+'%;--size:'+size.toFixed(1)+'px;--color:'+hue+';--dx:'+dx.toFixed(0)+'px;--dy:'+dy.toFixed(0)+'px;--delay:'+Math.floor(Math.random()*230)+'ms';
      pixels.appendChild(e);
    }
    vfx.appendChild(pixels);
    const scan=document.createElement('i');
    scan.className='genesis-scan';
    vfx.appendChild(scan);
    if(variant!=='voxel'){
      for(let i=0;i<7;i++){
        const line=document.createElement('i');
        line.className='genesis-slice';
        const h=3+Math.random()*10;
        const top=5+i*13+Math.random()*8;
        line.style.cssText='--left:'+(Math.random()*19)+'%;--top:'+top.toFixed(0)+'%;--width:'+(60+Math.random()*35).toFixed(0)+'%;--height:'+h.toFixed(0)+'px;--shift:'+(Math.random()>.5?16:-16)+'px;--delay:'+(80+Math.random()*240).toFixed(0)+'ms';
        vfx.appendChild(line);
      }
    }
    panel.appendChild(vfx);
    window.setTimeout(()=>{
      vfx.remove();
      panel.classList.remove('materializing','variant-'+variant);
      if(!panel.classList.contains('retreating'))panel.classList.add('active');
    },1120);
    return true;
  }
  function attachMicro(node){
    if(!enabled())return false;
    node.classList.remove('entering');
    node.classList.add('micro-materializing');
    window.setTimeout(()=>node.classList.remove('micro-materializing'),680);
    return true;
  }
  function revealDeck(node){
    if(!enabled())return;
    node.classList.remove('pixel-deck-reveal');
    void node.offsetWidth;
    node.classList.add('pixel-deck-reveal');
    window.setTimeout(()=>node.classList.remove('pixel-deck-reveal'),1120);
  }
  window.NeonPixel={enabled,setEnabled,attachPanel,attachMicro,revealDeck};
})();
