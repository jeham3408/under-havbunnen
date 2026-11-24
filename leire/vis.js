(() => {
  'use strict';
  const $ = selector => document.querySelector(selector);
  const evidence = window.ClayEvidence;
  const numberFormats=[0,1,2,3].map(digits=>new Intl.NumberFormat('en-GB',{minimumFractionDigits:digits,maximumFractionDigits:digits}));
  const nf=(value,digits=0)=>numberFormats[digits].format(value);
  const clamp = (n,lo,hi) => Math.min(hi, Math.max(lo,n));
  const sweep = $('#sweep'), play = $('#run'), core = $('#core'), trace = $('#traces');
  const nav = {lab:$('#tab-lab'),field:$('#tab-field')};
  const source = {lab:'https://doi.org/10.1007/s00603-025-04973-z',field:'https://github.com/jeham3408/natures-plug#how-the-screen-works'};
  const notes = {
    lab:['How the shale moves','The cutaway shows the bore in a Pierre II shale sample, 100 mm in diameter and 100 mm high. The initial radial gap was 1 mm. The motion follows a digitised model curve from Liu et al. (figure 9). The model predicts contact around day 30.5. The experiment detected local contact almost ten days earlier. These times apply to this lab test.','Read the lab study ↗'],
    field:['Fram 35/11-7','This exploration well on the Fram field was drilled in 1992 and has since been plugged. The atlas uses FORCE 2020 logs sampled every metre. Its default screen looks for gamma ray above 40 API, deep resistivity below 1.3 Ω·m and sonic slowness above 135 µs/ft. The interval at 1,120–1,270 m also passed a pressure screen using leak-off tests and pore pressure estimated from mud weight. Confirming a seal would require evidence of pipe contact and a pressure test in the well.','See the data and method ↗']
  };
  const state = {mode:location.hash==='#fram'?'field':'lab',showLimits:false,day:19,index:165,azimuth:.17,elevation:.42,playing:false,active:true,last:0,frame:0,renderer:null};
  let paint3D = null, drawPending = false;
  function aperture(day) {
    const a=evidence.curve, i=clamp(Math.floor((day-a[0][0])*4),0,a.length-1);
    const L=a[i], R=a[Math.min(i+1,a.length-1)];
    const fraction=R[0]===L[0]?0:clamp((day-L[0])/(R[0]-L[0]),0,1);
    return Math.max(0,1-L[1]-(R[1]-L[1])*fraction);
  }
  function refresh() {
    const lab=state.mode==='lab';
    for(const key in nav) nav[key].setAttribute('aria-pressed',String(key===state.mode));
    $('#lab').hidden=!lab; $('#field').hidden=lab;
    const range=lab?{min:17,max:31,step:.1,value:state.day}:{min:0,max:evidence.log.length-1,step:1,value:state.index};
    for(const [k,v] of Object.entries(range))sweep[k]=v;
    sweep.style.setProperty('--progress',((range.value-range.min)/(range.max-range.min)*100)+'%');
    sweep.setAttribute('aria-valuetext',lab?'Experiment day '+nf(state.day,1):nf(evidence.log[state.index][0],1)+' metres measured along the well');
    $('.sr').textContent=lab?'Time in the laboratory model':'Sample location along the Fram well';
    $('#axis-label').textContent=lab?'Lab time':'Measured depth';
    $('#position').textContent=lab?nf(state.day,1)+' days':nf(evidence.log[state.index][0],1)+' m';
    $('#end-label').textContent=lab?'31 days':'1,330 m';
    $('#summary').textContent=lab?'Laboratory model':'Archived logs · FORCE 2020';
    if(lab){
      const gap=aperture(state.day);$('#gap').textContent=nf(gap,2);$('#moving-clay').setAttribute('x',22+40*gap);
      $('#caption').textContent=gap<.001?'The model reaches the pipe. In the lab, fluid could still pass after contact.':'Initial bore diameter 10 mm · pipe diameter 8 mm · radial gap 1 mm.';
    } else {
      const z=evidence.log[state.index][0]; const inside=z>=1120&&z<=1270;
      const row=evidence.log[state.index]; trace.setAttribute('aria-label','At '+nf(z,1)+' m, gamma ray is '+nf(row[1],1)+' API, deep resistivity is '+nf(row[2],3)+' ohm metres and sonic slowness is '+nf(row[3],1)+' microseconds per foot.');
      $('#caption').textContent=inside?'Inside the flagged 150 m interval. Its ability to seal remains unknown.':'Outside the flagged interval at 1,120–1,270 m measured depth.';
    }
    if(!$('#notes').hidden)fillNotes();
    scheduleDraw();
  }
  const holdTime=$('#hold-time');
  function permeability(t){return 38+(518-38)/(1+t/20.4);}
  window.clayLabPhysics={permeability};
  function holdPoint(t){return [3+294*t/50,38-(permeability(t)/525)*35];}
  const holdPath=Array.from({length:101},(_,i)=>holdPoint(i/2).map(x=>x.toFixed(2)).join(' ')).join(' L');
  $('#hold-line').setAttribute('d','M'+holdPath);
  function updateHold(){
    const t=Number(holdTime.value),k=permeability(t),[x,y]=holdPoint(t);
    $('#hold-day').textContent=nf(t,1)+' days';$('#hold-k').textContent=nf(k,1)+' µD';
    $('#hold-dot').setAttribute('cx',x);$('#hold-dot').setAttribute('cy',y);
    holdTime.style.setProperty('--progress',(2*t)+'%');
    holdTime.setAttribute('aria-valuetext',nf(t,1)+' days into the pressure hold, '+nf(k,1)+' microdarcies');
  }
  holdTime.addEventListener('input',updateHold);updateHold();
  function fillNotes(){$('#hold-study').hidden=state.mode!=='lab';const t=notes[state.mode];$('#note-title').textContent=t[0];$('#note-copy').textContent=t[1];$('#source').textContent=t[2];$('#source').href=source[state.mode];}
  function showNotes(open) { const box=$('#notes');box.hidden=!open;$('.info').setAttribute('aria-expanded',String(open));if(open){setPlaying(false);fillNotes();box.scrollTop=0;$('#close-notes').focus({preventScroll:true});}else $('.info').focus({preventScroll:true}); }
  $('#notes').addEventListener('keydown',e=>{
    if(['PageUp','PageDown','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Home','End'].includes(e.key))e.stopPropagation();
  });
  $('.info').addEventListener('click',()=>showNotes($('#notes').hidden));
  $('#close-notes').addEventListener('click',()=>showNotes(false));
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('#notes').hidden){showNotes(false);e.stopPropagation();}});
  function choose(mode) {state.mode=mode;setPlaying(false);$('#notes').hidden=true;$('.info').setAttribute('aria-expanded','false');refresh();}
  nav.lab.onclick=()=>choose('lab');nav.field.onclick=()=>choose('field');
  function stopFrame(){if(state.frame)cancelAnimationFrame(state.frame);state.frame=0;state.last=0;}
  function setPlaying(next) {
    stopFrame();state.playing=next;play.classList.toggle('playing',next);
    const label=next?'Pause':state.mode==='lab'?'Play the lab simulation':'Play through the well logs';play.title=label;play.setAttribute('aria-label',label);
    if(next&&state.active&&!document.hidden)state.frame=requestAnimationFrame(advance);
  }
  let fraction=0;
  function advance(t) {
    if(!state.playing||!state.active||document.hidden)return setPlaying(false);
    const delta=state.last?Math.min(.08,(t-state.last)/1000):0;state.last=t;
    let atEnd;
    if(state.mode==='lab'){state.day=Math.min(31,state.day+delta*1.45);atEnd=state.day>=31;}
    else {fraction+=delta*23;const n=Math.floor(fraction);fraction-=n;state.index=Math.min(evidence.log.length-1,state.index+n);atEnd=state.index>=evidence.log.length-1;}
    refresh();
    if(atEnd)setPlaying(false);else state.frame=requestAnimationFrame(advance);
  }
  play.onclick=()=>{if(!state.playing){if(state.mode==='lab'&&state.day>=31)state.day=17;if(state.mode==='field'&&state.index===evidence.log.length-1)state.index=0;fraction=0;refresh();}setPlaying(!state.playing);};
  sweep.addEventListener('input',()=>{setPlaying(false);if(state.mode==='lab')state.day=+sweep.value;else state.index=+sweep.value;refresh();});
  window.addEventListener('hashchange',()=>choose(location.hash==='#fram'?'field':'lab'));
  document.addEventListener('visibilitychange',()=>{if(document.hidden)setPlaying(false);});
  addEventListener('message',e=>{if(e.source===parent&&e.data?.type==='stage-active'){state.active=e.data.active!==false;if(!state.active)setPlaying(false);else scheduleDraw();}});
  function scheduleDraw(){if(drawPending)return;drawPending=true;requestAnimationFrame(()=>{drawPending=false;if(state.mode==='field')drawField();else if(paint3D)paint3D();else drawFallback();});}
  const observed=new ResizeObserver(scheduleDraw);observed.observe($('#stage'));
  function setCamera(a,e){state.azimuth=a;state.elevation=clamp(e,.10,1.38);scheduleDraw();}
  $('#left').onclick=()=>setCamera(state.azimuth-.24,state.elevation);$('#right').onclick=()=>setCamera(state.azimuth+.24,state.elevation);
  $('#resetcam').onclick=()=>setCamera(.17,.42);
  let drag=null;
  core.addEventListener('pointerdown',e=>{if(!e.isPrimary)return;drag={x:e.clientX,y:e.clientY,a:state.azimuth,h:state.elevation};core.setPointerCapture(e.pointerId);core.classList.add('dragging');});
  core.addEventListener('pointermove',e=>{if(drag&&e.isPrimary)setCamera(drag.a-(e.clientX-drag.x)*.009,drag.h+(e.clientY-drag.y)*.008);});
  function finish(){drag=null;core.classList.remove('dragging');}
  core.addEventListener('pointerup',finish);core.addEventListener('pointercancel',finish);core.addEventListener('lostpointercapture',finish);
  core.addEventListener('keydown',e=>{const a={ArrowLeft:-.17,ArrowRight:.17}[e.key],h={ArrowDown:-.13,ArrowUp:.13}[e.key];if(a!==undefined||h!==undefined){e.preventDefault();e.stopPropagation();setCamera(state.azimuth+(a||0),state.elevation+(h||0));}if(e.key==='Home'){e.preventDefault();setCamera(.17,.42);}});
  function sizeCanvas(el){const r=el.getBoundingClientRect();if(r.width<10||r.height<10)return null;const dpi=Math.min(devicePixelRatio||1,2);const w=Math.round(r.width*dpi),h=Math.round(r.height*dpi);if(el.width!==w||el.height!==h){el.width=w;el.height=h;}const ctx=el.getContext('2d');if(!ctx)return null;ctx.setTransform(dpi,0,0,dpi,0,0);return {ctx,w:r.width,h:r.height};}
  const tracks=[{name:'Gamma ray',unit:'API',index:1,min:30,max:110,limit:40,c:'#ebbf82',digits:1},{name:'Deep resistivity',unit:'Ω·m',index:2,min:.6,max:1.7,limit:1.3,c:'#8bd8cf',digits:3},{name:'Sonic slowness',unit:'µs/ft',index:3,min:110,max:170,limit:135,c:'#c5c6a3',digits:1}];
  $('#toggle-limits').onclick=()=>{
    state.showLimits=!state.showLimits;
    $('#toggle-limits').setAttribute('aria-pressed',String(state.showLimits));
    $('#toggle-limits').textContent=state.showLimits?'Hide cut-offs':'Show cut-offs';scheduleDraw();
  };
  const leftMargin=w=>w<450?76:88;
  function drawField() {
    const sized=sizeCanvas(trace);if(!sized)return;
    const {ctx,w,h}=sized, rows=evidence.log, left=leftMargin(w),right=w-25,top=11,bottom=h-24;
    ctx.clearRect(0,0,w,h);
    const span=right-left,md0=rows[0][0],md1=rows.at(-1)[0],X=m=>left+span*(m-md0)/(md1-md0),rowH=(bottom-top)/3;
    ctx.fillStyle='#325749';ctx.fillRect(X(1120),top,X(1270)-X(1120),bottom-top);
    for(const m of [1050,1100,1150,1200,1250,1300]){
      ctx.strokeStyle='#8eb4a535';ctx.lineWidth=.7;ctx.beginPath();ctx.moveTo(X(m),top);ctx.lineTo(X(m),bottom);ctx.stroke();
    }
    for(const [i,t] of tracks.entries()){
      const base=top+i*rowH, upper=base+4, lower=base+rowH-7;
      const Y=v=>lower-clamp((v-t.min)/(t.max-t.min),0,1)*(lower-upper);
      ctx.font=(w<440?'600 9px':'600 11px')+' Arial, sans-serif';ctx.textAlign='left';ctx.textBaseline='alphabetic';ctx.fillStyle=t.c;ctx.fillText(t.name,1,base+rowH*.35);
      ctx.font=(w<440?'9px':'11px')+' Arial, sans-serif';ctx.fillStyle='#dce6df';
      const value=rows[state.index][t.index];ctx.fillText(value==null?'No data':nf(value,t.digits),1,base+rowH*.35+14);
      ctx.fillStyle='#b5c9bc';ctx.font='9px Arial,sans-serif';if(rowH>38)ctx.fillText(t.unit,1,base+rowH*.35+26);
      ctx.fillStyle='#abc0b2';ctx.font=(w<450?'8px':'9px')+' Arial,sans-serif';ctx.fillText(nf(t.max,t.index===2?1:0),right+3,upper+5);ctx.fillText(nf(t.min,t.index===2?1:0),right+3,lower);
      if(state.showLimits){
        const v=Y(t.limit);
        ctx.beginPath();ctx.moveTo(left,v);ctx.lineTo(right,v);ctx.strokeStyle='#e7dec6bb';ctx.lineWidth=.85;ctx.setLineDash([4,4]);ctx.stroke();ctx.setLineDash([]);
        const label=(t.index===2?'< ':'> ')+nf(t.limit,t.index===2?1:0);
        ctx.font='bold '+(w<450?'8px':'10px')+' Arial,sans-serif';const sw=ctx.measureText(label).width;ctx.fillStyle='#283a30';ctx.fillRect(right-sw-6,v-13,sw+6,12);ctx.fillStyle='#f0e9ca';ctx.fillText(label,right-sw-3,v-3);
      }
      ctx.beginPath();let on=false;
      for(const row of rows){const v=row[t.index];if(!Number.isFinite(v)){on=false;continue;}if(on)ctx.lineTo(X(row[0]),Y(v));else {ctx.moveTo(X(row[0]),Y(v));on=true;}}
      ctx.lineWidth=w>600?1.65:1.25;ctx.lineJoin='round';ctx.strokeStyle=t.c;ctx.stroke();
      if(Number.isFinite(value)){ctx.beginPath();ctx.arc(X(rows[state.index][0]),Y(value),3,0,Math.PI*2);ctx.fillStyle=t.c;ctx.fill();ctx.lineWidth=1;ctx.strokeStyle='#182722';ctx.stroke();}
      ctx.strokeStyle='#75948466';ctx.lineWidth=.75;ctx.beginPath();ctx.moveTo(0,base+rowH);ctx.lineTo(right,base+rowH);ctx.stroke();
    }
    for(const md of [1120,1270]){ctx.strokeStyle='#90b8a0';ctx.lineWidth=.8;ctx.setLineDash([2,3]);ctx.beginPath();ctx.moveTo(X(md),top);ctx.lineTo(X(md),bottom);ctx.stroke();ctx.setLineDash([]);}
    const at=X(rows[state.index][0]);ctx.strokeStyle='#fff1cbbe';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(at,top);ctx.lineTo(at,bottom);ctx.stroke();
    ctx.font=(w<450?'9px':'11px')+' Arial,sans-serif';ctx.fillStyle='#c0d2c6';ctx.textAlign='center';
    for(const v of (w<450?[1050,1120,1200,1270,1320]:[1050,1100,1150,1200,1250,1300]))ctx.fillText(nf(v),X(v),bottom+15);
    ctx.textAlign='left';
  }
  function pointField(e){const b=trace.getBoundingClientRect(),left=leftMargin(b.width);const index=Math.round(clamp((e.clientX-b.left-left)/(b.width-25-left),0,1)*(evidence.log.length-1));state.index=index;setPlaying(false);refresh();}
  trace.addEventListener('pointerdown',e=>{if(!e.isPrimary)return;trace.setPointerCapture(e.pointerId);pointField(e);});
  trace.addEventListener('pointermove',e=>{if(trace.hasPointerCapture(e.pointerId))pointField(e);});
  addEventListener('message',e=>{if(e.source===parent&&e.data?.type==='clay-mode')choose(e.data.mode==='field'?'field':'lab');});
  const TAU=2*Math.PI, slit=.95, rockRadius=12.3, rockY=7.1, pipeY=8.1;
  const surfaces=[];
  function addAnnulus(group,angle0,angle1,spanR,height,part){
    const angle=(s)=>angle0+(angle1-angle0)*s,xy=(r,y,a)=>[r*Math.sin(a),y,r*Math.cos(a)];
    const add=(name,nu,nv,locate,normal,kind=group)=>surfaces.push({name,nu,nv,locate,normal,kind});
    const surfaceRadius=(u,g)=>spanR(u,g);
    add(part+'-outer',72,group==='shale'?10:2,(s,t,g)=>xy(surfaceRadius(1,g),height*(2*t-1),angle(s)),s=>[Math.sin(angle(s)),0,Math.cos(angle(s))]);
    add(part+'-inner',72,2,(s,t,g)=>xy(surfaceRadius(0,g),height*(1-2*t),angle(s)),s=>[-Math.sin(angle(s)),0,-Math.cos(angle(s))],group==='shale'?'bore':group);
    add(part+'-top',72,4,(s,t,g)=>xy(surfaceRadius(1-t,g),height,angle(s)),()=>[0,1,0],group==='shale'?'bed':group);
    add(part+'-bottom',72,3,(s,t,g)=>xy(surfaceRadius(t,g),-height,angle(s)),()=>[0,-1,0],group==='shale'?'bed':group);
    if(angle1-angle0<TAU-.001){
      add(part+'-cut-a',5,14,(s,t,g)=>xy(surfaceRadius(s,g),height*(2*t-1),angle0),()=>[-Math.cos(angle0),0,Math.sin(angle0)],'section');
      add(part+'-cut-b',5,14,(s,t,g)=>xy(surfaceRadius(1-s,g),height*(2*t-1),angle1),()=>[Math.cos(angle1),0,-Math.sin(angle1)],'section');
    }
  }
  addAnnulus('shale',slit,TAU-slit,(u,g)=>(4+g)+(rockRadius-4-g)*u,rockY,'sample');
  addAnnulus('metal',0,TAU,(u)=>3.5+.5*u,pipeY,'casing');
  function makeProject(w,h){
    const a=state.azimuth,e=state.elevation, s=Math.min(h/31.5,w/(w<460?38.5:34.8)),cx=w*(w>480?.54:.55),cy=h*(w<460?.565:.51);
    const sin=Math.sin(a),cos=Math.cos(a),ce=Math.cos(e),se=Math.sin(e);
    return v=>{const f=v[0]*sin+v[2]*cos,r=v[0]*cos-v[2]*sin;return [cx+s*r,cy-s*(v[1]*ce-f*se),f*ce+v[1]*se];};
  }
  let markerCanvas;
  function labels(w,h){
    if(!markerCanvas){markerCanvas=document.createElement('canvas');markerCanvas.setAttribute('aria-hidden','true');Object.assign(markerCanvas.style,{position:'absolute',inset:'0',width:'100%',height:'100%',pointerEvents:'none'});$('#lab').insertBefore(markerCanvas,$('.lab-meta'));}
    const sized=sizeCanvas(markerCanvas);if(!sized)return;const ctx=sized.ctx;ctx.clearRect(0,0,w,h);const proj=makeProject(w,h),sm=w<460;
    ctx.font=(sm?'10px':'12px')+' Arial,sans-serif';ctx.lineWidth=.85;
    const annotation=(point,dir,txt)=>{const [x,y]=proj(point);const endX=dir===1?Math.min(w-9,x+(sm?53:101)):Math.max(9,x-(sm?45:77));
      if(Math.abs(endX-x)<25)return;const textY=dir===1?Math.max(17,y-25):Math.min(h-42,y+23);const midX=endX-dir*Math.min(28,Math.abs(endX-x)*.42);
      ctx.strokeStyle='#c0d5c3aa';ctx.fillStyle='#dce5d7';ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(midX,textY);ctx.lineTo(endX,textY);ctx.stroke();ctx.beginPath();ctx.arc(x,y,1.8,0,TAU);ctx.fill();ctx.textAlign=dir===1?'right':'left';const tx=endX+(dir===1?0:1);ctx.fillText(txt,tx,textY-4);
    };
    const tubeAngle=state.azimuth+.72;
    annotation([4*Math.sin(tubeAngle),-2,4*Math.cos(tubeAngle)],1,'Aluminium pipe');
    let theta=state.azimuth-1.35;theta=((theta%TAU)+TAU)%TAU;theta=clamp(theta,slit+.02,TAU-slit-.02);
    annotation([rockRadius*Math.sin(theta),-.8,rockRadius*Math.cos(theta)],-1,'Shale');
  }
  const palette={shale:[112,118,104],bed:[143,148,132],bore:[91,99,87],section:[144,143,122],metal:[165,185,184]};
  function drawFallback(){
    const sized=sizeCanvas(core);if(!sized)return;const {ctx,w,h}=sized;ctx.clearRect(0,0,w,h);
    const gap=aperture(state.day),proj=makeProject(w,h),tri=[];
    const a=state.azimuth,e=state.elevation,view=[Math.sin(a)*Math.cos(e),Math.sin(e),Math.cos(a)*Math.cos(e)];
    for(const sf of surfaces){const nu=Math.min(sf.nu,48), nv=sf.nu>20?(sf.kind==='shale'?9:1):sf.nv;
      for(let j=0;j<nv;j++)for(let i=0;i<nu;i++){
        const s=i/nu,t=j/nv,u=(i+1)/nu,v=(j+1)/nv,n=sf.normal((s+u)/2);
        if(n.reduce((acc,q,k)=>acc+q*view[k],0)<.002)continue;
        const q=[sf.locate(s,t,gap),sf.locate(u,t,gap),sf.locate(u,v,gap),sf.locate(s,v,gap)].map(proj);
        const depth=q.reduce((acc,p)=>acc+p[2],0)/4;
        const light=.67+.35*(n[0]*-.4+n[1]*.72+n[2]*.55);
        const wave=sf.kind==='section'||sf.kind==='shale'?.94+.09*Math.sin((j+.3)*5.74):1;
        const spec=sf.kind==='metal'?.78+.32*Math.abs(Math.sin(s*TAU*2+1.4)):1,c=palette[sf.kind];
        const color='rgb('+c.map(z=>Math.round(clamp(z*light*wave*spec,0,255))).join(',')+')';tri.push({q,depth,color});
      }
    }
    tri.sort((a,b)=>a.depth-b.depth);
    for(const {q,color} of tri){ctx.beginPath();ctx.moveTo(q[0][0],q[0][1]);for(let k=1;k<4;k++)ctx.lineTo(q[k][0],q[k][1]);ctx.closePath();ctx.fillStyle=color;ctx.fill();ctx.lineWidth=.45;ctx.strokeStyle=color;ctx.stroke();}
    labels(w,h);
  }
  function sampleRaster(THREE,top){
    const size=384,cn=document.createElement('canvas');cn.width=cn.height=size;
    const c=cn.getContext('2d'),im=c.createImageData(size,size);
    let seed=top?941:797;function rand(){seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;}
    const bands=Array.from({length:112},()=>rand()),coarse=Array.from({length:289},()=>rand());
    function n2(x,y){const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy;return(1-fy)*((1-fx)*coarse[(iy%17)*17+ix%17]+fx*coarse[(iy%17)*17+(ix+1)%17])+fy*((1-fx)*coarse[((iy+1)%17)*17+ix%17]+fx*coarse[((iy+1)%17)*17+(ix+1)%17]);}
    for(let y=0;y<size;y++)for(let x=0;x<size;x++){
      const X=x/size,Y=y/size,rough=n2(X*12,Y*12);
      const layer=Y+.007*Math.sin(X*12+.8)+.005*Math.sin(X*5+Y*7)+.005*(rough-.5);
      const k=(Math.floor((layer+2)*112))%112;const line=Math.min(1,Math.abs(Math.sin((layer*112)*Math.PI))*3);
      const grain=(rand()-.5)*(top?15:17);const fleck=rand()>.996?17:0;
      const v=top?(rough-.5)*18+Math.sin((Y*.42+X)*45+rough*3)*2.8:(bands[k]-.5)*14+line*4+(rough-.5)*18;
      const color=top?[132,137,129]:[128,130,114];const px=4*(y*size+x);
      for(let j=0;j<3;j++)im.data[px+j]=Math.round(color[j]+v+grain+fleck);
      im.data[px+3]=255;
    }
    c.putImageData(im,0,0);const tex=new THREE.CanvasTexture(cn);tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=4;tex.wrapS=tex.wrapT=THREE.RepeatWrapping;return tex;
  }
  function environment(THREE){
    const w=192,h=96,data=new Uint8Array(w*h*4);
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){
      const a=x/w,t=y/h;const key=Math.pow(Math.max(0,Math.cos((a-.78)*TAU)),25)*185,fill=Math.pow(Math.max(0,Math.cos((a-.27)*TAU)),9)*105,sky=20+33*(1-t);
      const i=(y*w+x)*4;data[i]=clamp(sky+key+fill,0,255);data[i+1]=clamp(sky+key*.93+fill*1.08,0,255);data[i+2]=clamp(sky+key*.75+fill*1.1,0,255);data[i+3]=255;
    }
    const t=new THREE.DataTexture(data,w,h);t.mapping=THREE.EquirectangularReflectionMapping;t.colorSpace=THREE.SRGBColorSpace;t.needsUpdate=true;return t;
  }
  async function initWebgl(){
    let gl,draw;
    try{
      const THREE=await import('../vendor/three.module.js');
      gl=document.createElement('canvas');gl.setAttribute('aria-hidden','true');
      Object.assign(gl.style,{position:'absolute',inset:'0',width:'100%',height:'100%',pointerEvents:'none'});
      const renderer=new THREE.WebGLRenderer({canvas:gl,antialias:true,alpha:true,powerPreference:'low-power'});
      renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));renderer.setClearColor('#14241f',0);renderer.outputColorSpace=THREE.SRGBColorSpace;
      renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;
      const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-18,18,18,-18,.1,180);
      const ambient=new THREE.HemisphereLight('#f0f7e9','#61573a',1.48);scene.add(ambient);
      const sun=new THREE.DirectionalLight('#fff0d8',2.1);sun.position.set(-19,31,21);scene.add(sun);
      const rim=new THREE.DirectionalLight('#b6e0da',1.7);rim.position.set(18,15,-20);scene.add(rim);
      const forward=new THREE.DirectionalLight('#c9dad6',.45);forward.position.set(11,7,25);scene.add(forward);
      const env=environment(THREE),map=sampleRaster(THREE,false),topMap=sampleRaster(THREE,true);
      scene.environment=env;
      const params={
        shale:{map,roughness:.93,color:'#c5c8bd'},bed:{map:topMap,roughness:.91,color:'#edeee2'},section:{map,roughness:.88,color:'#dddcc9'},bore:{map,roughness:.84,color:'#a1ab9f'},
        metal:{color:'#a6bcc2',metalness:.82,roughness:.27,envMapIntensity:1.25}
      };
      const materials=Object.fromEntries(Object.entries(params).map(([key,p])=>[key,new THREE.MeshStandardMaterial({...p,side:THREE.DoubleSide})]));
      const meshes=surfaces.map(sf=>{
        const g=new THREE.BufferGeometry(),num=(sf.nu+1)*(sf.nv+1),pos=new Float32Array(num*3),uv=[],norm=[],indices=[];
        for(let j=0;j<=sf.nv;j++)for(let i=0;i<=sf.nu;i++){const s=i/sf.nu,t=j/sf.nv,v=sf.locate(s,t,1),n=sf.normal(s);norm.push(...n);if(sf.kind==='bed')uv.push(v[0]/(2*rockRadius)+.5,v[2]/(2*rockRadius)+.5);else uv.push(s*(sf.kind==='shale'?2:1),t);
          if(i<sf.nu&&j<sf.nv){const v0=j*(sf.nu+1)+i,v1=v0+1,v2=v1+sf.nu+1,v3=v0+sf.nu+1;indices.push(v0,v1,v2,v0,v2,v3);}
        }
        g.setAttribute('position',new THREE.BufferAttribute(pos,3).setUsage(THREE.DynamicDrawUsage));g.setAttribute('normal',new THREE.Float32BufferAttribute(norm,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);
        const mesh=new THREE.Mesh(g,materials[sf.kind]);mesh.frustumCulled=false;scene.add(mesh);
        return {sf,pos,g};
      });
      const shadowTex=document.createElement('canvas');shadowTex.width=shadowTex.height=128;const sc=shadowTex.getContext('2d'),gradient=sc.createRadialGradient(64,64,15,64,64,64);gradient.addColorStop(0,'rgba(6,13,9,.76)');gradient.addColorStop(.55,'rgba(6,13,9,.38)');gradient.addColorStop(1,'rgba(6,13,9,0)');sc.fillStyle=gradient;sc.fillRect(0,0,128,128);
      const shadow=new THREE.Mesh(new THREE.PlaneGeometry(37,37),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(shadowTex),transparent:true,depthWrite:false}));shadow.rotation.x=-Math.PI/2;shadow.position.y=-8.28;scene.add(shadow);
      const grid=new THREE.GridHelper(41,8,'#859486','#798878');grid.position.y=-8.35;grid.material.transparent=true;grid.material.opacity=.16;scene.add(grid);
      const target=new THREE.Vector3();
      let prevGap=-1,prevW=0,prevH=0;
      draw=()=>{
        const {width:w,height:h}=core.getBoundingClientRect();if(w<10||h<10)return;
        const gap=aperture(state.day);
        if(Math.abs(gap-prevGap)>1e-7){for(const {sf,pos,g} of meshes){let k=0;for(let j=0;j<=sf.nv;j++)for(let i=0;i<=sf.nu;i++){const v=sf.locate(i/sf.nu,j/sf.nv,gap);pos[k++]=v[0];pos[k++]=v[1];pos[k++]=v[2];}g.attributes.position.needsUpdate=true;}prevGap=gap;}
        if(w!==prevW||h!==prevH){renderer.setSize(w,h,false);prevW=w;prevH=h;}
        const scale=Math.min(h/31.5,w/(w<460?38.5:34.8)),dx=(w*(w>480?.54:.55)-w/2)/scale,dy=(h*(w<460?.565:.51)-h/2)/scale;
        camera.left=-w/(2*scale)-dx;camera.right=w/(2*scale)-dx;camera.top=h/(2*scale)+dy;camera.bottom=-h/(2*scale)+dy;camera.updateProjectionMatrix();
        const a=state.azimuth,e=state.elevation;camera.position.set(Math.sin(a)*Math.cos(e)*65,Math.sin(e)*65,Math.cos(a)*Math.cos(e)*65);camera.lookAt(target);
        renderer.render(scene,camera);labels(w,h);
      };
      core.after(gl);core.style.opacity='0';paint3D=draw;$('#lab').dataset.renderer='webgl';draw();
      gl.addEventListener('webglcontextlost',e=>{e.preventDefault();paint3D=null;gl.style.display='none';core.style.opacity='1';$('#lab').dataset.renderer='canvas';scheduleDraw();});
    }catch(err){if(gl)gl.remove();paint3D=null;core.style.opacity='1';$('#lab').dataset.renderer='canvas';scheduleDraw();}
  }
  $('#lab').dataset.renderer='canvas';setPlaying(false);refresh();initWebgl();
})();
