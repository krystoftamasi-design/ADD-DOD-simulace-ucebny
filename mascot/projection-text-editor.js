import {projectionPromptLayout,projectionListeningLayout,drawProjectionPrompt,drawProjectionListening,loadWorkFonts} from './work-presentation.js?v=text-editor-r1';
import {defaultProjectionText,projectionTextSettings,setProjectionText} from './projection-text.js?v=text-editor-r1';

export function setupProjectionTextEditor(){
  if(!['localhost','127.0.0.1'].includes(location.hostname)||window.DodProjectionTextEditor)return;
  window.DodProjectionTextEditor=true;
  const endpoint='http://127.0.0.1:8000/api/projection-text';
  const style=document.createElement('style');
  style.textContent=`
  .projection-text-editor{width:min(1000px,calc(100vw - 32px));max-width:none;max-height:94dvh;padding:20px;border:1px solid #dbe2d9;border-radius:16px;background:#f6f8f2;color:#24342b;font:14px system-ui;overflow:auto}
  .projection-text-editor::backdrop{background:#13231bbb;backdrop-filter:blur(5px)}
  .projection-text-editor header,.projection-text-editor footer,.projection-text-tools{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
  .projection-text-editor header{justify-content:space-between}.projection-text-editor h2{margin:0;font-size:20px}.projection-text-editor p{color:#607262;font-size:12px}
  .projection-text-editor button{padding:8px 12px;border:1px solid #ccd7c5;border-radius:8px;background:white;color:#24342b;font:inherit;cursor:pointer}
  .projection-text-editor button[aria-pressed=true]{background:#d6e94d;border-color:#b7ca22}.projection-text-editor button:focus-visible,.projection-text-editor input:focus-visible{outline:3px solid #809800;outline-offset:3px}
  .projection-text-stage{position:relative;aspect-ratio:1180/640;width:100%;margin:16px 0;touch-action:none;user-select:none}
  .projection-text-stage canvas{display:block;width:100%;height:100%;border-radius:8px;background:#bfa071}
  .projection-text-box{position:absolute;box-sizing:border-box;border:1px dashed #ffffffaa;cursor:move;touch-action:none}
  .projection-text-box.selected{border:2px solid #203d32;box-shadow:0 0 0 1px #fff9}
  .projection-text-box>span{position:absolute;left:0;bottom:100%;padding:3px 6px;background:#203d32;color:white;font:11px system-ui;white-space:nowrap;border-radius:4px 4px 0 0}
  .projection-text-handle{position:absolute;right:-7px;bottom:-7px;width:14px;height:14px;background:white;border:2px solid #203d32;border-radius:3px;cursor:nwse-resize}
  .projection-text-tools label{display:flex;align-items:center;gap:10px;margin:0;font:12px system-ui;color:#435a48}.projection-text-tools input{width:160px;margin:0;accent-color:#91a900}.projection-text-editor footer{justify-content:space-between;margin-top:16px}.projection-text-editor output{font-size:12px;color:#52664d}
  `;
  document.head.append(style);
  const dialog=document.createElement('dialog');dialog.className='projection-text-editor';dialog.setAttribute('aria-label','Úprava textů projekce');
  dialog.innerHTML=`<header><h2>Texty na projekci</h2><button data-close>Hotovo · B</button></header>
    <p>Přetáhni text myší. Za pravý dolní roh změň velikost. Klávesou B úpravy zapneš nebo vypneš.</p>
    <div class="projection-text-stage"><canvas width="1180" height="640" aria-label="Náhled textů na projekci"></canvas>
      <div class="projection-text-box" data-text="prompt"><span>Našeptávání</span><div class="projection-text-handle"></div></div>
      <div class="projection-text-box" data-text="listening"><span>Poslouchám</span><div class="projection-text-handle"></div></div>
    </div>
    <div class="projection-text-tools"><button data-select="prompt">Našeptávání</button><button data-select="listening">Poslouchám</button>
    <label>Velikost <input type="range" min="2" max="20" step="0.1" aria-label="Velikost vybraného textu"><output data-size></output></label></div>
    <footer><output data-status role="status">Změny se ukládají automaticky.</output><button data-reset>Výchozí umístění</button></footer>`;
  document.body.append(dialog);
  const stage=dialog.querySelector('.projection-text-stage'),canvas=stage.querySelector('canvas'),ctx=canvas.getContext('2d');
  const slider=dialog.querySelector('input'),status=dialog.querySelector('[data-status]');
  const boxes=[...stage.querySelectorAll('[data-text]')];
  let settings=projectionTextSettings(),selected='prompt',drag=null,frame=null,edits=0,opened=0,saves=Promise.resolve();
  const layouts=()=>({prompt:projectionPromptLayout(ctx,canvas.width,canvas.height,settings),listening:projectionListeningLayout(ctx,canvas.width,canvas.height,settings)});
  function controls(){
    slider.value=String(settings[selected].size*100);
    dialog.querySelector('[data-size]').textContent=(settings[selected].size*100).toFixed(1)+' %';
    for(const button of dialog.querySelectorAll('[data-select]'))button.setAttribute('aria-pressed',String(button.dataset.select===selected));
    for(const box of boxes)box.classList.toggle('selected',box.dataset.text===selected);
  }
  function apply(next){settings=setProjectionText(next);edits++;controls();}
  function paint(now){
    if(!dialog.open)return;
    const layout=layouts();ctx.clearRect(0,0,canvas.width,canvas.height);
    drawProjectionPrompt(ctx,canvas.width,canvas.height,now,1,layout.prompt);
    drawProjectionListening(ctx,canvas.width,canvas.height,layout.listening);
    for(const box of boxes){const b=layout[box.dataset.text];Object.assign(box.style,{left:b.left/canvas.width*100+'%',top:b.top/canvas.height*100+'%',width:(b.right-b.left)/canvas.width*100+'%',height:(b.bottom-b.top)/canvas.height*100+'%'});}
    frame=requestAnimationFrame(paint);
  }
  async function readSettings(){
    const response=await fetch(endpoint,{cache:'no-store',signal:AbortSignal.timeout(3000)});
    if(!response.ok)throw new Error('Server nastavení není dostupný.');
    return (await response.json()).settings;
  }
  function save(){
    const snapshot=settings;status.textContent='Ukládám…';
    saves=saves.catch(()=>{}).then(async()=>{
      const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(snapshot),signal:AbortSignal.timeout(5000)});
      if(!response.ok)throw new Error('Nastavení se nepodařilo uložit na server.');
      if(settings===snapshot)status.textContent='Uloženo pro všechny obrazovky.';
    }).catch(error=>{status.textContent=error.message+' Změna zůstává uložená v tomto prohlížeči.';});
  }
  function finish(){if(!drag)return;drag=null;save();}
  stage.onpointerdown=event=>{
    const box=event.target.closest('[data-text]');if(!box)return;
    event.preventDefault();selected=box.dataset.text;controls();
    drag={id:event.pointerId,resize:!!event.target.closest('.projection-text-handle'),x:event.clientX,y:event.clientY,settings,layout:layouts()[selected],rect:stage.getBoundingClientRect()};
    stage.setPointerCapture(event.pointerId);
  };
  stage.onpointermove=event=>{
    if(!drag||event.pointerId!==drag.id)return;
    const {layout,rect}=drag,dx=(event.clientX-drag.x)/rect.width*canvas.width,dy=(event.clientY-drag.y)/rect.height*canvas.height;
    let value;
    if(drag.resize){
      const w=layout.right-layout.left,h=layout.bottom-layout.top;
      value={...drag.settings[selected],size:layout.size/canvas.height*(1+(dx*w+dy*h)/(w*w+h*h))};
    }else value={...drag.settings[selected],x:(layout.x+dx)/canvas.width,y:(layout.y+dy)/canvas.height};
    apply({...settings,[selected]:value});
  };
  stage.onpointerup=stage.onpointercancel=finish;
  for(const button of dialog.querySelectorAll('[data-select]'))button.onclick=()=>{selected=button.dataset.select;controls();};
  slider.oninput=()=>apply({...settings,[selected]:{...settings[selected],size:Number(slider.value)/100}});
  slider.onchange=save;
  dialog.querySelector('[data-reset]').onclick=()=>{apply(defaultProjectionText);save();};
  dialog.querySelector('[data-close]').onclick=()=>dialog.close();
  dialog.addEventListener('close',()=>{finish();cancelAnimationFrame(frame);frame=null;save();});
  async function open(){
    settings=projectionTextSettings();controls();dialog.showModal();
    const session=++opened,version=edits;frame=requestAnimationFrame(paint);
    loadWorkFonts();
    try{const latest=await readSettings();if(dialog.open&&session===opened&&edits===version)apply(latest);}
    catch{status.textContent='Úpravy se ukládají místně; server je nyní nedostupný.';}
  }
  document.addEventListener('keydown',event=>{
    if(event.key.toLowerCase()!=='b'||event.repeat||event.ctrlKey||event.metaKey||event.altKey)return;
    if(event.target.closest?.('textarea,[contenteditable="true"],input:not([type="range"]):not([type="checkbox"]):not([type="button"])'))return;
    event.preventDefault();if(dialog.open)dialog.close();else open();
  });
  readSettings().then(latest=>{if(!dialog.open)setProjectionText(latest);}).catch(()=>{});
}
