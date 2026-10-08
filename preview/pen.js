// Trusted app overlay, injected by Vite, never included in exported websites.
import {pickSelection,selectionRects} from '/__builder_selection.js';
const capability=new URL(location.href).searchParams.get('__builder');
let bridge=window.magicPen;
if(!bridge&&capability){
  const listeners=new Set();let version=-1,inFlight;
  function readState(){if(inFlight)return inFlight;inFlight=(async()=>{const response=await fetch(`/__builder_bridge/state?token=${encodeURIComponent(capability)}`,{cache:'no-store'});if(!response.ok)throw new Error('Preview connection expired. Reopen it from the bot.');const state=await response.json();if(state.version!==version){version=state.version;for(const listener of listeners)listener(state);}return state;})().finally(()=>{inFlight=undefined;});return inFlight;}
  const timer=setInterval(()=>readState().catch(()=>{}),250);addEventListener('pagehide',()=>clearInterval(timer));
  const post=async(route,payload)=>{const response=await fetch(`/__builder_bridge/${route}?token=${encodeURIComponent(capability)}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});if(!response.ok)throw new Error((await response.json()).error||'Preview connection expired. Reopen it from the bot.');};
  bridge={state:async()=>{await inFlight?.catch(()=>{});return readState();},onState:callback=>{listeners.add(callback);return()=>listeners.delete(callback);},select:selection=>post('select',selection||{id:null}),action:payload=>post('voice-action',payload)};
}
if (bridge) {
  const host = document.createElement('div');
  host.id = '__magic_pen_host';
  Object.assign(host.style, { position: 'fixed', inset: '0', zIndex: '2147483647', pointerEvents: 'none' });
  document.body.append(host);
  const shadow = host.attachShadow({ mode: 'open' });
  shadow.innerHTML = `<link rel="stylesheet" href="/__builder_pen.css"><canvas></canvas><div class="marks"></div><div class="tip" role="status" hidden></div>`;
  const canvas = shadow.querySelector('canvas'), marks = shadow.querySelector('.marks'), tip = shadow.querySelector('.tip');
  const ctx = canvas.getContext('2d'); let enabled = false, drawing = false, points = [],current={},mode='auto';
  function showError(error){tip.hidden=false;tip.textContent=error.message;}
  function action(name,text){Promise.resolve(bridge.action?.({action:name,...(text===undefined?{}:{text})})).catch(showError);}
  function select(selection){Promise.resolve(bridge.select(selection)).catch(error=>{marks.replaceChildren();current.selection=null;current.selectedId=null;showError(error);});}
  function cancelDrawing(){drawing=false;points=[];ctx.clearRect(0,0,innerWidth,innerHeight);}
  function resize() { cancelDrawing();canvas.width = innerWidth * devicePixelRatio; canvas.height = innerHeight * devicePixelRatio; ctx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0);marks.replaceChildren(); }
  function setEnabled(value) {
    if(value===undefined)return;current=typeof value==='boolean'?{enabled:value}:value;
    const changed=enabled!==!!current.enabled;enabled=!!current.enabled;
    const nextMode=current.sourceMode&&!current.textSource?'element':current.selectionMode||'auto';
    if(mode!==nextMode){mode=nextMode;if(!drawing)cancelDrawing();}
    host.style.display=enabled?'block':'none';tip.hidden=true;
    canvas.style.pointerEvents=enabled&&!current.busy?'auto':'none';
    if(changed)resize();if(current.busy&&drawing)cancelDrawing();highlight();
  }
  function highlight(){if(drawing)return;marks.replaceChildren();for(const r of selectionRects(current.selection||(current.selectedId?{id:current.selectedId}:null))){const box=document.createElement('div');box.className='box';Object.assign(box.style,{left:`${r.left}px`,top:`${r.top}px`,width:`${r.width}px`,height:`${r.height}px`});marks.append(box);}}
  bridge.onState(setEnabled); bridge.state().then(setEnabled).catch(showError);
  addEventListener('resize',()=>{resize();highlight();});addEventListener('scroll',()=>{cancelDrawing();highlight();},true);
  addEventListener('keydown',event=>{if(event.key==='Escape'){cancelDrawing();action('browse');canvas.style.pointerEvents='none';marks.replaceChildren();}});
  // Preserve the viewing position across completed edits and undo/redo reloads.
  const scrollKey='easy-web-ai-preview-scroll';
  try{const position=JSON.parse(sessionStorage.getItem(scrollKey)||'null');if(position)requestAnimationFrame(()=>requestAnimationFrame(()=>scrollTo(position.x,position.y)));}catch{}
  addEventListener('pagehide',()=>{try{sessionStorage.setItem(scrollKey,JSON.stringify({x:scrollX,y:scrollY}));}catch{}});
  canvas.addEventListener('wheel', event => { window.scrollBy({ top: event.deltaY, left: event.deltaX }); event.preventDefault(); }, { passive: false });
  canvas.addEventListener('pointerdown', event => {
    if (!enabled||current.busy||event.button!==0) return; drawing = true; points = [{x:event.clientX,y:event.clientY}]; canvas.setPointerCapture(event.pointerId);
    ctx.clearRect(0,0,innerWidth,innerHeight); ctx.beginPath(); ctx.moveTo(event.clientX,event.clientY); ctx.strokeStyle = '#769c5a'; ctx.lineWidth = 3; ctx.lineCap = 'round';marks.replaceChildren();
  });
  canvas.addEventListener('pointermove', event => {
    if (!drawing) return;if(points.length>=1200){cancelDrawing();tip.hidden=false;tip.textContent='Draw a shorter mark, then try again.';return;}points.push({x:event.clientX,y:event.clientY}); ctx.lineTo(event.clientX,event.clientY); ctx.stroke();
  });
  canvas.addEventListener('pointerup', async event => {
    if (!drawing) return;
    points.push({x:event.clientX,y:event.clientY});
    const gesture=points.slice(),revision=current.history?.cursor;
    cancelDrawing();
    // Read the current companion mode before resolving the mark. A browser
    // poll can lag behind an immediately preceding Auto/Text/Element click.
    try{setEnabled(await bridge.state());}catch(error){showError(error);return;}
    if(!enabled||current.busy)return;
    let selection;
    const display=host.style.display;host.style.display='none';
    try{
      selection=pickSelection(gesture,mode);
      if(current.sourceMode&&selection&&!selection.error){
        const xs=gesture.map(p=>p.x),ys=gesture.map(p=>p.y),hit=document.elementFromPoint((Math.min(...xs)+Math.max(...xs))/2,(Math.min(...ys)+Math.max(...ys))/2),control=hit?.closest('button,a,input,select,textarea');
        if(control&&!control.hasAttribute('data-builder-id'))selection={error:'This control has no mapped JSX/TSX source. Select an element in your own component.'};
      }
    }catch{selection={error:'Unable to read that mark. Try selecting a smaller part.'};}finally{host.style.display=display;}
    if(selection?.error){select(null);tip.hidden=false;tip.textContent=selection.error;return;}
    if(selection){selection.revision=revision;current.selection=selection;current.selectedId=selection.id;highlight();tip.textContent=selection.textSelection?'Only the marked text is selected. Say or type your change.':'Whole element selected. Say or type your change.';}
    else {current.selection=null;current.selectedId=null;marks.replaceChildren();tip.textContent='No text in that mark. Try again, or choose Element.';}
    if(selection){
      const target=document.querySelector(`[data-builder-id="${selection.id}"]`),style=getComputedStyle(target),rect=target.getBoundingClientRect();
      selection.visualContext={instances:document.querySelectorAll(`[data-builder-id="${selection.id}"]`).length,tag:target.tagName.toLowerCase(),text:target.textContent.slice(0,2000),rect:{x:rect.x,y:rect.y,width:rect.width,height:rect.height},viewport:{width:innerWidth,height:innerHeight},styles:Object.fromEntries(['color','backgroundColor','fontFamily','fontSize','fontWeight','lineHeight','letterSpacing','padding','margin','borderRadius','display','gap','gridTemplateColumns','width','height','maxWidth','textAlign'].map(key=>[key,style[key]])),nearby:(target.closest('section')||target.parentElement).textContent.slice(0,3000)};
    }
    select(selection);
  });
  canvas.addEventListener('pointercancel', () => {cancelDrawing();highlight();});
}
