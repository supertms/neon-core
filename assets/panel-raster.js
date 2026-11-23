/* Pixel Genesis v0.3 — pixels sampled from each panel's real DOM content.
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

  function hash(x,y,seed){
    let v=(x*374761393+y*668265263+seed*2147483647)|0;
    v=Math.imul(v^(v>>>13),1274126177);
    return ((v^(v>>>16))>>>0)/4294967295;
  }

  function renderPixels(ctx,source,width,height,progress,kind,seed,cache){
    ctx.clearRect(0,0,width,height);
    const unit=progress<.26?14:progress<.52?9:progress<.72?5:progress<.88?3:1;
    let data=cache[unit];
    if(!data){
      const cols=Math.ceil(width/unit),rows=Math.ceil(height/unit);
      const temp=document.createElement('canvas');
      temp.width=cols;temp.height=rows;
      const t=temp.getContext('2d',{willReadFrequently:true});
      t.imageSmoothingEnabled=true;
      t.drawImage(source,0,0,cols,rows);
      data={cols,rows,pixels:t.getImageData(0,0,cols,rows).data};
      cache[unit]=data;
    }
    const {cols,rows,pixels}=data;
    const reveal=Math.min(1,progress/.83);
    const pulse=progress<.30?1.16:1;
    for(let y=0;y<rows;y++){
      for(let x=0;x<cols;x++){
        const i=(y*cols+x)*4;
        const a=pixels[i+3];
        if(a<22){continue;}
        const r=pixels[i],g=pixels[i+1],b=pixels[i+2];
        const intensity=Math.max(r,g,b);
        // Coordinate order is driven by the actual panel position and task type.
        // Randomness only changes *when* a real source pixel appears, not its color or location.
        let sweep;
        if(kind==='command'||kind==='task'){sweep=y/Math.max(1,rows-1);}
        else if(kind==='code'||kind==='files'){sweep=x/Math.max(1,cols-1);}
        else if(kind==='test'){sweep=(x/cols+y/rows)/2;}
        else{sweep=Math.abs(x/cols-.5)*.4+y/rows*.6;}
        const brightBoost=intensity>115?-.13:intensity>65?-.04:.13;
        const rank=Math.max(0,Math.min(.92,hash(x,y,seed)*.49+sweep*.38+brightBoost));
        if(reveal<rank){continue;}
        const alpha=(a/255)*Math.min(1,(reveal-rank)*10+.25);
        const glow=intensity>115&&progress<.72;
        ctx.fillStyle='rgba('+Math.min(255,Math.round(r*pulse+(glow?10:0)))+','+Math.min(255,Math.round(g*pulse+(glow?8:0)))+','+Math.min(255,Math.round(b*pulse+(glow?10:0)))+','+alpha.toFixed(3)+')';
        ctx.fillRect(x*unit,y*unit,Math.min(unit,width-x*unit),Math.min(unit,height-y*unit));
      }
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
    if(!width||!height){return false;}
    panel.classList.remove('entering','active');
    panel.classList.add('pixel-assembling');
    const surface=document.createElement('canvas');
    surface.width=width;surface.height=height;
    surface.className='panel-pixel-canvas';
    surface.setAttribute('aria-hidden','true');
    panel.appendChild(surface);
    const state={canvas:surface,cancelled:false,frame:0};
    running.set(panel,state);
    const ctx=surface.getContext('2d',{alpha:true,willReadFrequently:false});
    if(!ctx){cancelPanel(panel);return false;}
    const duration=kind==='code'?1040:kind==='command'?880:kind==='test'?940:980;
    snapshot(panel,width,height).then(source=>{
      if(state.cancelled||!panel.isConnected){return;}
      let startTime=null;
      const cache=Object.create(null);
      function tick(now){
        if(state.cancelled||!panel.isConnected){return;}
        if(startTime===null){startTime=now;}
        const t=Math.min(1,(now-startTime)/duration);
        renderPixels(ctx,source,width,height,t,kind,sequence,cache);
        if(t>=.78){
          panel.classList.add('pixel-resolved');
          surface.style.opacity=String(Math.max(0,1-(t-.78)/.22));
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
  window.NeonPixelRasterVersion='0.3';
})();