/* Pixel Genesis v0.5 — pixels sampled from each panel's real DOM content.
   The effect is a transition, not a texture on top of unrelated graphics. */
(function(){
  'use strict';
  const fx=window.NeonPixel;
  if(!fx){return;}
  const running=new WeakMap();
  const reduced=window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');

  const PROPS=[
    'display','position','box-sizing','width','height','min-width','max-width',
    'top','right','bottom','left','overflow','overflow-x','overflow-y',
    'background','background-color','background-image','background-size',
    'background-position','background-repeat','border','border-top',
    'border-bottom','border-left','border-right','border-radius','box-shadow',
    'color','opacity','font','font-family','font-size','font-weight','font-style',
    'letter-spacing','line-height','text-align','text-transform','text-shadow',
    'white-space','word-break','vertical-align','padding','padding-top',
    'padding-right','padding-bottom','padding-left','margin','margin-top',
    'margin-right','margin-bottom','margin-left','display','flex','flex-direction',
    'flex-wrap','flex-grow','flex-shrink','align-items','justify-content',
    'gap','grid-template-columns','clip-path'
  ];

  function inlineStyles(el){
    const computed=getComputedStyle(el);
    for(const property of PROPS){
      const value=computed.getPropertyValue(property);
      if(value){el.style.setProperty(property,value);}
    }
    // A snapshot should show the final interface, not a half-finished CSS animation.
    el.style.setProperty('transition','none');
    el.style.setProperty('animation','none');
  }

  function makeStage(panel,width,height){
    const host=document.createElement('div');
    host.style.cssText='position:fixed;left:-10000px;top:-10000px;opacity:0;pointer-events:none;z-index:-100;width:'+width+'px;height:'+height+'px;overflow:visible';
    const clone=panel.cloneNode(true);
    clone.className='panel active';
    clone.querySelectorAll('.genesis-vfx,.panel-pixel-canvas').forEach(n=>n.remove());
    clone.style.cssText='position:relative;top:0;left:0;width:'+width+'px;height:'+height+'px;--x:50%;--y:50%;--z:0px;transform:none;transition:none;animation:none;opacity:1;filter:none';
    host.appendChild(clone);
    document.body.appendChild(host);
    return {host,clone};
  }

  function rasterFallback(clone,width,height){
    // Offline fallback: paints the actual panel DOM's rectangles and text glyphs
    // at their measured layout positions, never synthetic random code or charts.
    const canvas=document.createElement('canvas');
    canvas.width=width;canvas.height=height;
    const ctx=canvas.getContext('2d',{willReadFrequently:true});
    if(!ctx){return canvas;}
    const root=clone.getBoundingClientRect();
    ctx.fillStyle='#091b2c';ctx.fillRect(0,0,width,height);
    ctx.strokeStyle='rgba(75,207,255,.95)';ctx.lineWidth=1;
    ctx.strokeRect(.5,.5,width-1,height-1);
    const all=[clone,...clone.querySelectorAll('*')];
    for(const el of all){
      if(el===clone){continue;}
      const style=getComputedStyle(el);
      const rect=el.getBoundingClientRect();
      if(rect.width<1||rect.height<1){continue;}
      const x=rect.left-root.left,y=rect.top-root.top;
      const bg=style.backgroundColor;
      if(bg&&bg!=='transparent'&&!bg.match(/rgba?\(0,\s*0,\s*0,\s*0\)/)){
        ctx.fillStyle=bg;
        ctx.fillRect(x,y,Math.min(rect.width,width-x),Math.min(rect.height,height-y));
      }
      if(style.borderBottomWidth!=='0px'){
        ctx.strokeStyle=style.borderBottomColor||'#16445c';
        ctx.beginPath();ctx.moveTo(x,y+rect.height-.5);
        ctx.lineTo(x+rect.width,y+rect.height-.5);ctx.stroke();
      }
      const children=Array.from(el.childNodes).filter(n=>n.nodeType===Node.TEXT_NODE&&n.textContent.trim());
      if(children.length){
        ctx.font=style.font||'8px monospace';
        ctx.fillStyle=style.color||'#d6f2ff';
        ctx.textBaseline='alphabetic';
        for(const node of children){
          const range=document.createRange();
          range.selectNodeContents(node);
          const boxes=Array.from(range.getClientRects());
          const txt=node.textContent.replace(/\s+/g,' ').trim();
          if(!txt){continue;}
          for(const box of boxes){
            ctx.fillText(txt,box.left-root.left,box.bottom-root.top-2,Math.max(1,width-(box.left-root.left)-5));
          }
          range.detach?.();
        }
      }
    }
    return canvas;
  }

  function snapshot(panel,width,height){
    return new Promise(resolve=>{
      let stage;
      let finished=false;
      function done(canvas){
        if(finished){return;}
        finished=true;
        if(stage){stage.host.remove();}
        resolve(canvas);
      }
      const timeout=setTimeout(()=>{
        if(stage){done(rasterFallback(stage.clone,width,height));}
      },700);
      try{
        stage=makeStage(panel,width,height);
        const original=stage.clone;
        const nodes=[original,...original.querySelectorAll('*')];
        nodes.forEach(inlineStyles);
        original.style.setProperty('position','relative');
        original.style.setProperty('top','0px');
        original.style.setProperty('left','0px');
        original.style.setProperty('transform','none');
        original.style.setProperty('filter','none');
        original.style.setProperty('opacity','1');
        original.style.setProperty('width',width+'px');
        original.style.setProperty('height',height+'px');
        original.setAttribute('xmlns','http://www.w3.org/1999/xhtml');
        const markup=new XMLSerializer().serializeToString(original);
        const svg='<svg xmlns="http://www.w3.org/2000/svg" width="'+width+'" height="'+height+'"><foreignObject x="0" y="0" width="100%" height="100%">'+markup+'</foreignObject></svg>';
        const uri='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
        const image=new Image();
        image.onload=()=>{
          if(finished){return;}
          try{
            const canvas=document.createElement('canvas');
            canvas.width=width;canvas.height=height;
            const ctx=canvas.getContext('2d',{willReadFrequently:true});
            ctx.drawImage(image,0,0,width,height);
            const pixels=ctx.getImageData(0,0,width,height).data;
            // Some browsers silently render foreignObject as a blank image.
            let colored=0;
            for(let i=0;i<pixels.length;i+=Math.max(4,Math.floor(pixels.length/5000)/4|0)*4){
              if(pixels[i+3]>70){colored++;}
            }
            if(colored<30){throw new Error('Blank foreignObject render');}
            clearTimeout(timeout);done(canvas);
          }catch(e){
            clearTimeout(timeout);done(rasterFallback(original,width,height));
          }
        };
        image.onerror=()=>{
          if(finished){return;}
          clearTimeout(timeout);done(rasterFallback(original,width,height));
        };
        image.src=uri;
      }catch(e){
        clearTimeout(timeout);
        done(stage?rasterFallback(stage.clone,width,height):document.createElement('canvas'));
      }
    });
  }

  // Six genuinely different reveal geometries, with type preference and anti-repeat.
  const MODES=['mosaic','scan','slice','voxel','glitch','lattice'];
  const MODE_LABELS={
    mosaic:'Pixel Mosaic',
    scan:'Scan Decode',
    slice:'Slice Assembly',
    voxel:'Voxel Bloom',
    glitch:'Glitch Rebuild',
    lattice:'Node Lattice'
  };
  const PREFERRED={
    task:['mosaic','lattice','scan'],
    command:['scan','glitch','slice'],
    code:['slice','mosaic','glitch'],
    files:['slice','voxel','mosaic'],
    test:['mosaic','lattice','scan'],
    analysis:['lattice','voxel','slice'],
    plan:['lattice','slice','mosaic'],
    metrics:['scan','voxel','glitch']
  };
  const NEON=[
    [57,231,255],  // electric cyan
    [58,141,255],  // vivid blue
    [143,99,255],  // violet
    [255,79,216], // pink
    [255,90,139], // rose
    [216,107,255],// orchid
    [255,122,79], // ember
    [255,198,109] // gold
  ];
  const snapshotCache=new Map();
  const lastModes=[];
  let paletteMode='hybrid';
  // Speed is a multiplier of playback rate, not task-event frequency.
  // 0.5x is the new default: the same formation takes twice as long.
  let spawnSpeed=0.5;
  function setSpawnSpeed(value){
    const next=Number(value);
    if(Number.isFinite(next))spawnSpeed=clamp(next,.25,2);
    return spawnSpeed;
  }
  function getSpawnSpeed(){return spawnSpeed;}
  let lastMode='mosaic';
  let autoIndex=0;

  function hash(x,y,seed){
    let v=(x*374761393+y*668265263+seed*2147483647)|0;
    v=Math.imul(v^(v>>>13),1274126177);
    return ((v^(v>>>16))>>>0)/4294967295;
  }
  function clamp(v,min=0,max=1){return Math.max(min,Math.min(max,v));}
  function chooseMode(kind){
    autoIndex++;
    let choices=(PREFERRED[kind]||MODES).filter(m=>!lastModes.includes(m));
    // Every fourth spawn draws from the entire library to avoid type monotony.
    if(autoIndex%4===0){
      const wide=MODES.filter(m=>!lastModes.includes(m));
      if(wide.length)choices=wide;
    }
    if(!choices.length)choices=MODES.filter(m=>m!==lastModes[lastModes.length-1]);
    const mode=choices[Math.floor(Math.random()*choices.length)];
    lastModes.push(mode);
    if(lastModes.length>2)lastModes.shift();
    lastMode=mode;
    return mode;
  }
  function setPalette(mode){
    if(['classic','neon','hybrid'].includes(mode))paletteMode=mode;
    return paletteMode;
  }
  function getPalette(){return paletteMode;}
  function cachedSnapshot(panel,width,height){
    // Repeated demo panels have the same actual DOM; reuse the exact capture.
    const key=width+'x'+height+':'+panel.innerHTML;
    if(snapshotCache.has(key))return snapshotCache.get(key);
    const promise=snapshot(panel,width,height).catch(e=>{
      snapshotCache.delete(key);throw e;
    });
    snapshotCache.set(key,promise);
    if(snapshotCache.size>18)snapshotCache.delete(snapshotCache.keys().next().value);
    return promise;
  }

  function cellsFor(source,width,height,unit,cache,seed){
    let cells=cache[unit];
    if(cells)return cells;
    const cols=Math.ceil(width/unit), rows=Math.ceil(height/unit);
    const temp=document.createElement('canvas');
    temp.width=cols;temp.height=rows;
    const ctx=temp.getContext('2d',{willReadFrequently:true});
    if(!ctx)return {cols,rows,rgba:new Uint8ClampedArray(cols*rows*4)};
    ctx.imageSmoothingEnabled=true;
    ctx.drawImage(source,0,0,cols,rows);
    cells={cols,rows,rgba:ctx.getImageData(0,0,cols,rows).data};
    cache[unit]=cells;
    return cells;
  }
  function revealRank(mode,x,y,cols,rows,seed){
    const nx=x/Math.max(1,cols-1),ny=y/Math.max(1,rows-1);
    const jitter=hash(x,y,seed);
    switch(mode){
      case 'mosaic':
        return .06+.75*jitter+.10*Math.abs(nx-.5);
      case 'scan':
        return .09+(.36*ny+.31*nx)+.15*jitter;
      case 'slice':
        return .04+.17*(Math.floor(y/Math.max(1,Math.ceil(rows/7)))%4)
            +.22*nx+.13*jitter;
      case 'voxel':{
        const cx=.47+.2*(hash(seed,3,9)-.5);
        const cy=.51+.24*(hash(seed,7,21)-.5);
        return .06+.58*Math.hypot((nx-cx)*1.1,(ny-cy)*1.35)+.12*jitter;
      }
      case 'glitch':
        return .05+.16*(Math.floor(y/Math.max(1,Math.ceil(rows/9)))%4)
            +.54*jitter;
      case 'lattice':{
        const grid=Math.min(nx%(.15),ny%(.16));
        return .06+(grid<.035?.12:.42)+.30*jitter;
      }
      default:return jitter*.8;
    }
  }
  function paletteFor(x,y,seed){
    // Smooth clusters of saturated color, not frame-to-frame random RGB noise.
    const tileX=Math.floor(x/3),tileY=Math.floor(y/3);
    const i=Math.floor(hash(tileX,tileY,seed)*NEON.length);
    return NEON[i];
  }
  function pixelColor(sr,sg,sb,x,y,seed,progress,pal){
    const bright=Math.max(sr,sg,sb);
    const tint=paletteFor(x,y,seed);
    let paletteStrength=pal==='classic'?.05:pal==='neon'?.96:.78;
    paletteStrength*=1-.94*clamp((progress-.57)/.38);
    // Preserve the semantics of red deleted lines and green test results.
    if(sg>sr*1.26&&sg>sb*.87&&sg>75){
      paletteStrength*=.28;
    }else if(sr>sg*1.25&&sr>sb*.85&&sr>80){
      paletteStrength*=.34;
    }
    // Dark glass regions get luminous pixel tiles rather than an all-black mosaic.
    const shadow=bright<58;
    const base=shadow
      ?(pal==='classic'?[13,43,61]:[33,39,72])
      :[Math.min(255,sr*1.18+11),Math.min(255,sg*1.18+9),Math.min(255,sb*1.18+11)];
    const intensity=shadow?(pal==='neon'?.77:pal==='hybrid'?.59:.15):1;
    const w=paletteStrength*intensity;
    const r=Math.round(base[0]*(1-w)+tint[0]*w);
    const g=Math.round(base[1]*(1-w)+tint[1]*w);
    const b=Math.round(base[2]*(1-w)+tint[2]*w);
    return [r,g,b];
  }
  function drawCells(ctx,source,width,height,progress,mode,seed,cache,palette,alpha){
    const unit=progress<.25?16:progress<.48?11:progress<.70?7:progress<.86?4:2;
    const {cols,rows,rgba}=cellsFor(source,width,height,unit,cache,seed);
    const reach=clamp(progress/.84);
    const shiftEnergy=clamp((.80-progress)/.80);
    const flash=mode==='glitch'&&progress<.64?(.86+.14*Math.sin(progress*58)):1;
    for(let y=0;y<rows;y++){
      for(let x=0;x<cols;x++){
        const offset=(y*cols+x)*4;
        const a=rgba[offset+3];
        if(a<18)continue;
        const rank=revealRank(mode,x,y,cols,rows,seed);
        if(reach<rank)continue;
        const [sr,sg,sb]=[rgba[offset],rgba[offset+1],rgba[offset+2]];
        const lum=Math.max(sr,sg,sb);
        const h=hash(x,y,seed+19);
        const lit=lum>70||h>.82;
        const color=pixelColor(sr,sg,sb,x,y,seed,progress,palette);
        const localFade=clamp((reach-rank)*11+.08);
        const opacity=(a/255)*localFade*alpha*flash*(lum<58?.83:1);
        let px=x*unit,py=y*unit;
        let offsetX=0,offsetY=0;
        if(mode==='slice'){
          const band=Math.floor(y/Math.max(1,Math.ceil(rows/7)));
          offsetX=(band%2?-1:1)*(10+band%3*4)*shiftEnergy;
        }else if(mode==='glitch'){
          const band=Math.floor(y/Math.max(1,Math.ceil(rows/9)));
          offsetX=(band%3-1)*(5+12*h)*shiftEnergy;
        }else if(mode==='voxel'){
          offsetX=(x-cols/2)/cols*9*shiftEnergy;
          offsetY=(y-rows/2)/rows*9*shiftEnergy;
        }
        px+=offsetX;py+=offsetY;
        const r=color[0],g=color[1],b=color[2];
        ctx.fillStyle='rgba('+r+','+g+','+b+','+opacity.toFixed(3)+')';
        const size=mode==='voxel'&&progress<.58?unit*1.06:unit;
        if(mode==='voxel'&&lit&&progress<.66&&unit>=7){
          ctx.fillStyle='rgba(133,80,255,'+(opacity*.29).toFixed(3)+')';
          ctx.fillRect(px+3,py-3,size,size);
          ctx.fillStyle='rgba('+r+','+g+','+b+','+opacity.toFixed(3)+')';
        }
        if(mode==='lattice'&&progress<.56&&lit&&unit>=7){
          ctx.strokeStyle='rgba(255,96,225,'+(opacity*.76).toFixed(3)+')';
          ctx.lineWidth=.8;ctx.strokeRect(px+.5,py+.5,Math.max(1,size-1),Math.max(1,size-1));
        }
        ctx.fillRect(px,py,size,size);
        if(mode==='mosaic'&&progress<.47&&lit&&unit>=9){
          ctx.fillStyle='rgba(245,155,255,'+(opacity*.22).toFixed(3)+')';
          ctx.fillRect(px+1,py+1,Math.max(1,size-2),Math.max(1,size-2));
        }
      }
    }
    if(mode==='scan'){
      const scanY=height*(progress*1.25-.18);
      const grad=ctx.createLinearGradient(0,scanY-20,0,scanY+13);
      grad.addColorStop(0,'rgba(55,229,255,0)');
      grad.addColorStop(.46,'rgba(255,83,223,.24)');
      grad.addColorStop(.65,'rgba(255,166,102,.38)');
      grad.addColorStop(1,'rgba(55,229,255,0)');
      ctx.fillStyle=grad;ctx.fillRect(0,scanY-20,width,33);
    }
    if(mode==='glitch'&&progress<.70){
      const yy=(Math.floor(progress*13)*17+seed*7)%height;
      ctx.fillStyle='rgba(255,72,215,.25)';
      ctx.fillRect(0,yy,width*.45,2);
      ctx.fillStyle='rgba(55,229,255,.36)';
      ctx.fillRect(width*.36,yy+4,width*.45,1);
    }
    if(mode==='lattice'&&progress<.56){
      ctx.strokeStyle='rgba(119,92,255,.22)';
      ctx.lineWidth=.7;
      const step=unit*5;
      for(let x=step;x<width;x+=step){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,height);ctx.stroke();}
      for(let y=step;y<height;y+=step){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(width,y);ctx.stroke();}
    }
  }

  function cancelPanel(panel){
    const current=running.get(panel);
    if(current){
      current.cancelled=true;
      cancelAnimationFrame(current.frame);
      current.canvas.remove();
      running.delete(panel);
    }
    panel.classList.remove('pixel-assembling','pixel-resolved','entering');
    if(!panel.classList.contains('retreating'))panel.classList.add('active');
  }

  function attachPanel(panel,kind,sequence){
    if(!fx.enabled()||(reduced&&reduced.matches)){return false;}
    const width=Math.round(panel.offsetWidth),height=Math.round(panel.offsetHeight);
    if(!width||!height)return false;
    const mode=chooseMode(kind);
    panel.dataset.spawnMode=mode;
    panel.classList.remove('entering','active');
    panel.classList.add('pixel-assembling');
    const canvas=document.createElement('canvas');
    canvas.width=width;canvas.height=height;
    canvas.className='panel-pixel-canvas';
    canvas.setAttribute('aria-hidden','true');
    panel.appendChild(canvas);
    const ctx=canvas.getContext('2d',{alpha:true});
    if(!ctx){canvas.remove();panel.classList.remove('pixel-assembling');return false;}
    const state={canvas,cancelled:false,frame:0};
    running.set(panel,state);
    const durations={mosaic:1030,scan:960,slice:1100,voxel:1160,glitch:920,lattice:1070};
    const duration=durations[mode]+Math.floor(hash(sequence,kind.length,18)*130);
    const chosenPalette=paletteMode;
    cachedSnapshot(panel,width,height).then(source=>{
      if(state.cancelled||!panel.isConnected)return;
      let previousTime=null;
      let elapsed=0;
      let lastRendered=-Infinity;
      const cache=Object.create(null);
      function tick(now){
        if(state.cancelled||!panel.isConnected)return;
        if(previousTime===null)previousTime=now;
        // Apply speed on every frame so adjustments also affect panels mid-formation.
        // Cap long gaps (e.g. background tab) to avoid sudden completion.
        const delta=Math.max(0,Math.min(100,now-previousTime));
        previousTime=now;
        elapsed+=delta*spawnSpeed;
        const t=clamp(elapsed/duration);
        const alpha=t<.86?1:clamp((1-t)/.14);
        // The sample renderer is CPU-heavy; ~30 fps keeps simultaneous panels smooth.
        if(now-lastRendered>=32||t===1){
          lastRendered=now;
          ctx.clearRect(0,0,width,height);
          if(alpha>0)drawCells(ctx,source,width,height,t,mode,sequence,cache,chosenPalette,alpha);
        }
        if(t>=.78){
          panel.classList.add('pixel-resolved');
          canvas.style.opacity=String(clamp((1-t)/.22));
        }
        if(t<1){state.frame=requestAnimationFrame(tick);}
        else{cancelPanel(panel);}
      }
      state.frame=requestAnimationFrame(tick);
    }).catch(()=>cancelPanel(panel));
    return true;
  }

  fx.attachPanel=attachPanel;
  fx.cancelPanel=cancelPanel;
  fx.setPalette=setPalette;
  fx.getPalette=getPalette;
  fx.getLastSpawnMode=()=>lastMode;
  fx.getLastSpawnLabel=()=>MODE_LABELS[lastMode];
  fx.getAvailableSpawnModes=()=>MODES.slice();
  fx.setSpawnSpeed=setSpawnSpeed;
  fx.getSpawnSpeed=getSpawnSpeed;
  window.NeonPixelRasterVersion='0.5';
})();