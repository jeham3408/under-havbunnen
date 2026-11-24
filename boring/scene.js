'use strict';
(() => {
  const $ = id => document.getElementById(id);
  const source = window.BORE_STUDY, lib = decodeLibrary(source.sim.library);
  const readings = source.sim.measurements, plane = source.geometry.planeTvdM;
  const scaleM = .027, vex = 10, last = readings.length-1;
  const fileNumber = (n,d=2) => {
    return n.toLocaleString('en-GB',{minimumFractionDigits:d,maximumFractionDigits:d});
  };
  const range = (n,a,b) => Math.min(b,Math.max(a,n));
  const pts = [];
  for (let i=0;i<readings.length;i++){
    const row=readings[i];let horizontal=0;
    if(i){
      const dmd=row.md-readings[i-1].md, dz=row.tvd-readings[i-1].tvd;
      horizontal=pts[i-1].horizontal+Math.sqrt(dmd*dmd-dz*dz);
    }
    pts.push({horizontal,x:horizontal*scaleM,y:(plane-row.tvd)*scaleM*vex,z:.10});
  }
  const halfX=pts[last].x/2;
  pts.forEach(p=>p.x-=halfX);
  const state={index:52,mode:'both',page:'model',yaw:.32,pitch:.22,zoom:1,detail:false,active:true,playing:null,answer:null};
  const cache=new Map();
  const cameraDefaults={yaw:.32,pitch:.22,zoom:1};
  const az=()=>Math.atan2(pts[last].y-pts[0].y,pts[last].x-pts[0].x);
  const spatial={halfX,xLim:halfX+.30,upper:2.0,lower:-2.0,zFront:0,zBack:-2.1,zCenter:-.56};
  const canvas=$('bore-canvas'),volume=$('volume');
  let width=0,height=0,raf=0,software=null,enhanced=null;
  function focus(){
    const point=pts[state.index];
    return state.detail?{x:point.x,y:range(point.y*.62,-.95,.95),z:0}:{x:0,y:0,z:spatial.zCenter};
  }
  function project(x,y,z){
    const at=focus();x-=at.x;y-=at.y;
    const sy=Math.sin(state.yaw),cy=Math.cos(state.yaw),sp=Math.sin(state.pitch),cp=Math.cos(state.pitch),depth=z-at.z;
    const k=Math.min(width/10.35,height/5.45)*state.zoom;
    return [width*.5+(x*cy-depth*sy)*k,height*.49+(-y*cp+(x*sy+depth*cy)*sp)*k,(x*sy+depth*cy)*cp+y*sp];
  }
  function draw(){
    raf=0;
    if(state.page!=='model'||!width||!height)return;
    if(enhanced){enhanced.draw(state,width,height);}
    else{software?.draw();}
    const labelPos=(id,x,y,z)=>{const [px,py]=project(x,y,z);$(id).style.left=px+'px';$(id).style.top=py+'px';};
    const at=focus();
    labelPos('layer-upper',state.detail?range(at.x-1.2,-spatial.xLim+.38,spatial.xLim-.38):-spatial.xLim*.68,.68,.025);
    labelPos('layer-lower',state.detail?range(at.x+1.15,-spatial.xLim+.38,spatial.xLim-.38):spatial.xLim*.66,-.85,.025);
    const mark=(id,point,dx,dy)=>{
      const group=$(id),x=point[0],y=point[1],endX=range(x+dx,6,width-80),endY=range(y+dy,17,height-24);
      group.querySelector('path').setAttribute('d','M'+x+' '+y+' L'+endX+' '+endY+' h6');
      const circle=group.querySelector('circle');circle.setAttribute('cx',x);circle.setAttribute('cy',y);
      const label=group.querySelector('text');label.setAttribute('x',endX+9);label.setAttribute('y',endY+3);
    };
    const tool=pts[state.index];
    mark('leader-bed',project(state.detail?range(at.x+1.05,-spatial.xLim+.15,spatial.xLim-.15):spatial.xLim*.47,0,.018),9,-19);
    $('leader-tx').style.display=state.detail?'':'none';
    if(state.detail)mark('leader-tx',project(tool.x,tool.y,.225),12,-38);
    const metres=state.detail?10:50,a=project(0,0,0),b=project(metres*scaleM,0,0);
    $('ruler-value').textContent=metres+' m';$('ruler-line').style.width=Math.hypot(b[0]-a[0],b[1]-a[1])+'px';
  }
  function redraw(){if(!raf) raf=requestAnimationFrame(draw);}
  function resize(){const r=volume.getBoundingClientRect();width=r.width;height=r.height;redraw();if(state.page==='field')drawPlot();}
  const pos=(v)=> v===null?'No estimate':fileNumber(Math.abs(v))+' m '+(v>=0?'below':'above');
  function update(){
    const i=state.index, row=readings[i], key=i+'-'+state.mode;
    if(!cache.has(key)){
      const enabled=lib.channels.map(k=>state.mode==='both'||k.startsWith(state.mode+'kHz_'));
      cache.set(key,estimateBoundary(lib,readings.slice(Math.max(i-4,0),i+1),enabled));
    }
    const fit=cache.get(key),truth=plane-row.tvd;
    $('station').value=i+1;$('estimate').textContent=pos(fit.status==='resolved'?fit.median:null);
    $('estimate').title=fit.status==='resolved'?'90% model interval for signed vertical distance: '+fileNumber(fit.lo)+' to '+fileNumber(fit.hi)+' m. Positive values place the boundary below the transmitter.':'The measurements did not resolve a distance at this station.';
    const compactInterval=(lo,hi)=>lo*hi>=0?fileNumber(Math.min(Math.abs(lo),Math.abs(hi)))+'–'+fileNumber(Math.max(Math.abs(lo),Math.abs(hi)))+' m':fileNumber(lo)+'–'+fileNumber(hi)+' m';
    const reason={homogeneous:'A uniform layer fits',ambiguous_model:'A uniform layer also fits',misfit:'Poor model fit',uncertain:'High uncertainty',insufficient:'Too few channels',missing:'No readings'};
    $('interval').textContent=fit.status==='resolved'?'90% interval: '+compactInterval(fit.lo,fit.hi):reason[fit.status]||'';
    $('truth').textContent=pos(truth);
    $('position').textContent='Station '+(i+1)+' / '+readings.length;
    $('md').textContent=fileNumber(row.md,0)+' m measured depth';
    $('station').setAttribute('aria-valuetext', (i+1)+' of '+readings.length+', '+fileNumber(row.md,0)+' metres along the well');
    redraw();
  }
  function stop(){
    if(state.playing!==null){clearInterval(state.playing);state.playing=null;}
    $('play').textContent='▶';$('play').ariaLabel='Advance along the well';$('play').title='Advance along the well';
  }
  $('play').addEventListener('click',()=>{
    if(state.playing!==null){stop();return;}
    if(!state.active||document.hidden)return;
    if(state.index===last){state.index=0;update();}
    $('play').textContent='Ⅱ';$('play').ariaLabel='Pause playback';$('play').title='Pause playback';
    state.playing=setInterval(()=>{if(!state.active||document.hidden||state.index===last){stop();return;}state.index++;update();},190);
  });
  $('station').addEventListener('input',e=>{stop();state.index=Number(e.target.value)-1;update();});
  $('frequency').addEventListener('change',e=>{state.mode=e.target.value;update();});
  function setDetail(on){state.detail=on;state.zoom=on?2.40:1;$('detail').setAttribute('aria-pressed',on);$('detail').textContent=on?'Overview':'Close-up';redraw();}
  $('detail').onclick=()=>setDetail(!state.detail);
  $('reset').onclick=()=>{Object.assign(state,cameraDefaults);setDetail(false);};
  let pointer=null;
  function orbit(dx,dy){state.yaw=range(state.yaw+dx*.009,-1.13,1.13);state.pitch=range(state.pitch+dy*.009,-.18,.78);redraw();}
  canvas.onpointerdown=e=>{if(pointer!==null||e.button!==0)return;pointer={id:e.pointerId,x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);};
  canvas.onpointermove=e=>{if(!pointer||pointer.id!==e.pointerId)return;orbit(pointer.x-e.clientX,e.clientY-pointer.y);pointer.x=e.clientX;pointer.y=e.clientY;};
  canvas.onpointerup=canvas.onpointercancel=canvas.onlostpointercapture=()=>{pointer=null;};
  canvas.onkeydown=e=>{const delta={ArrowLeft:[-9,0],ArrowRight:[9,0],ArrowUp:[0,8],ArrowDown:[0,-8]}[e.key];if(delta){e.preventDefault();orbit(...delta);}if(e.key==='Home'){e.preventDefault();$('reset').click();}};
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
  window.addEventListener('message',e=>{
    if(e.source!==window.parent)return;
    if(e.data?.type==='stage-view'&&['ekofisk','modell','physics'].includes(e.data.view)){page(e.data.view==='ekofisk'?'field':e.data.view==='physics'?'physics':'model');return;}
    if(e.data?.type==='stage-active'){state.active=Boolean(e.data.active);if(!state.active){stop();window.BorePhysics?.stop();}}
  });
  const ns='http://www.w3.org/2000/svg';
  function svg(tag,attrs,text){
    const node=document.createElementNS(ns,tag);for(const [k,v] of Object.entries(attrs))node.setAttribute(k,v);
    if(text!=null)node.textContent=text;$('plot').append(node);return node;
  }
  function drawPlot(){
    if(state.page!=='field')return;
    const el=$('plot'),b=el.getBoundingClientRect(),w=Math.max(200,b.width),h=Math.max(84,b.height);el.setAttribute('viewBox','0 0 '+w+' '+h);el.replaceChildren();
    const margin={left:w>440?55:40,right:w>440?49:16,top:26,bottom:44};
    const x=n=>margin.left+(n-16)/32*(w-margin.left-margin.right),y=n=>margin.top+(.8-(n-6))/.65*(h-margin.top-margin.bottom);
    const tx=(x1,y1,t,fill,anchor='start',size=12,weight=400)=>svg('text',{x:x1,y:y1,fill,'font-size':size,'font-family':'Arial, sans-serif','text-anchor':anchor,'font-weight':weight},t);
    const line=(x1,y1,x2,y2,col,dash)=>svg('line',{x1,y1,x2,y2,stroke:col,'stroke-width':1.2,...(dash?{'stroke-dasharray':dash}:{})});
    const f=source.field;
    tx(0,15,'Apparent resistivity (Ω·m)','#b3c5bf','start',11);
    for(const v of [6.2,6.4,6.6,6.8]){line(margin.left,y(v),w-margin.right,y(v),'#39504a');tx(margin.left-6,y(v)+3,fileNumber(v,1),'#b3c5bf','end',10);}
    const nodes=[16,32,48];
    nodes.forEach(n=>{line(x(n),margin.top,x(n),h-margin.bottom,'#3f5650',n===32?'3 4':null);tx(x(n),h-22,n+'″','#c3d4cc','middle',12);});
    tx(w-margin.right,h-3,'Channel spacing (inches)','#b3c5bf','end',10);
    line(x(16),y(f.short),x(32),y(f.baseline),'#78b3a9','4 4');line(x(32),y(f.baseline),x(48),y(f.far),'#78b3a9','4 4');
    for(const [n,v] of [[16,f.short],[48,f.far]])svg('circle',{cx:x(n),cy:y(v),r:4.6,fill:'#f5f5e5'});
    const cx=x(32),py=y(f.physical),by=y(f.baseline);
    svg('polygon',{points:[[cx,py-6],[cx+6,py],[cx,py+6],[cx-6,py]].map(p=>p.join(',')).join(' '),fill:'#edb978'});
    tx(cx+10,py-4,fileNumber(f.physical),'#edb978','start',13,600);
    svg('circle',{cx,cy:by,r:6,stroke:'#82dcd2','stroke-width':2.8,fill:'#142322'});
    tx(cx+10,by-6,fileNumber(f.baseline),'#82dcd2','start',13,600);
    if(state.answer){const fy=y(f.measured);svg('circle',{cx,cy:fy,r:4.2,fill:'#ffffe5',stroke:'#142322','stroke-width':1});tx(cx-9,fy+13,fileNumber(f.measured),'#ffffe5','end',14,650);}
  }
  function fieldAnswer(choice){
    state.answer=choice;$('choices').hidden=Boolean(choice);$('answer').hidden=!choice;$('prompt').hidden=Boolean(choice);
    if(choice){$('answer-text').textContent='The tool measured '+fileNumber(source.field.measured)+' Ω·m. The neighbour estimate was closer. The distance to the bed boundary remains unknown.';}
    drawPlot();
  }
  document.querySelectorAll('[data-pick]').forEach(b=>b.onclick=()=>fieldAnswer(b.dataset.pick));$('again').onclick=()=>fieldAnswer(null);
  const method={
    model:"The synthetic well slopes 2° below horizontal towards a flat boundary. The upper layer has a resistivity of 12 Ω·m and the lower layer 2 Ω·m. The cutaway exaggerates height tenfold. The tool is enlarged and the block width is illustrative. Drag or use the arrow keys to rotate the view.\n\nA Maxwell model generates phase and attenuation readings at 400 kHz and 2 MHz. We add noise to these readings. At each station the browser compares the current reading and up to four earlier stations with a library of simulated responses. Switch frequencies to see what each one can resolve.\n\nWith both frequencies, the model reported a distance at 39 of 113 stations. At 36 of those 39, the known distance fell within the model’s 90% interval (5th to 95th percentiles). We used the same idealised layer geometry to generate and interpret the signals.\n\nThe known distance is measured vertically from the transmitter to the boundary. “Below” and “above” describe the boundary relative to the transmitter.",
    field:"In Ekofisk well 2/4-Z-26, we withheld four 32-inch channels. The physics model used eight other channels at the same measured depth. This example shows the apparent resistivity reported by the 2 MHz phase channel.\n\nThe neighbour estimate is the geometric mean of the measured 16- and 48-inch channels. The physics model gave 6.70 Ω·m, the neighbours gave 6.36 Ω·m and the withheld channel measured 6.34 Ω·m. None of the four model grids resolved the distance to the bed boundary at this station.\n\nData from Dylan Loss and ConocoPhillips, Ekofisk measurement-while-drilling dataset, Zenodo record 24133398 (NLOD 2.0)."
  };
  function route(){const mode=location.hash.slice(1)||new URLSearchParams(location.search).get('mode');return mode==='physics'?'physics':mode==='ekofisk'?'field':'model';}
  function page(which,changeHash=false){
    if(!['field','physics'].includes(which))which='model';state.page=which;stop();window.BorePhysics?.stop();
    for(const view of ['model','field','physics']){ $(view).hidden=which!==view;$('to-'+view).setAttribute('aria-pressed',which===view);}
    const info=$('info');info.classList.toggle('em-equations',which==='physics');info.textContent=which==='physics'?'Equations':'i';info.title=which==='physics'?'Equations and method':'About the method';info.setAttribute('aria-label',info.title);$('notes').querySelector('h2').textContent=which==='physics'?'Equations and method':'How it works';
    if(changeHash){try{history.replaceState(null,'',which==='field'?'#ekofisk':which==='physics'?'#physics':'#modell');}catch{}}
    resize();if(which==='model')update();else if(which==='field')drawPlot();else window.BorePhysics?.redraw();
  }
  for(const view of ['model','field','physics'])$('to-'+view).onclick=()=>page(view,true);
  window.addEventListener('hashchange',()=>page(route()));
  $('info').onclick=()=>{stop();window.BorePhysics?.stop();if(state.page==='physics')window.BorePhysics.notes($('method-copy'));else $('method-copy').replaceChildren(...method[state.page].split('\n\n').map(t=>{const p=document.createElement('p');p.textContent=t;return p;}));$('notes').showModal();};$('close').onclick=()=>$('notes').close();
  $('notes').onclick=e=>{if(e.target===$('notes'))$('notes').close();};
  software=createSectionRenderer(canvas,project,pts,spatial,state,source);
  new ResizeObserver(resize).observe($('stage'));new ResizeObserver(resize).observe(volume);
  window.BoreStage={pts,spatial,az,source,state,library:lib,project,focus,register(renderer){enhanced=renderer;canvas.dataset.renderer='webgl';redraw();},fallback(){enhanced=null;canvas.dataset.renderer='canvas';redraw();}};
  canvas.dataset.renderer='canvas';page(route());
})();

// Orthographic software renderer uses the same station positions and camera as WebGL.
function createSectionRenderer(canvas,project,path,g,state,source){
  const ctx=canvas.getContext('2d'),fixed=[],surface=[];
  const backdrop=document.createElement('canvas'),backdropContext=backdrop.getContext('2d');let previousView='';
  const X=g.xLim,T=g.upper,B=g.lower,F=g.zFront,R=g.zBack;
  const planes=(vertices,fill,outline=null)=>fixed.push({vertices,fill,outline});
  for(const [low,high,tone,shadow,top] of [[0,T,'#a78a64','#856e50','#bfa681'],[B,0,'#467f78','#315e58','#6c9e8b']]){
    planes([[-X,low,F],[X,low,F],[X,high,F],[-X,high,F]],tone);
    planes([[-X,low,R],[-X,low,F],[-X,high,F],[-X,high,R]],shadow);
    planes([[X,low,F],[X,low,R],[X,high,R],[X,high,F]],shadow);
    planes([[-X,high,R],[X,high,R],[X,high,F],[-X,high,F]],top);
    planes([[-X,low,R],[X,low,R],[X,low,F],[-X,low,F]],shadow);
  }
  let seed=1683;
  function noise(){seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;}
  for(let i=0;i<125;i++){
    const band=(i%2===0),height=(band?0:B)+noise()*1.995;
    let ax=-X+noise()*.35,prev=height;
    const amp=.005+noise()*.025,phase=noise()*7;
    while(ax<X){const bx=Math.min(X,ax+.42+noise()*.24),nex=height+Math.sin(bx*.78+phase)*amp;
      surface.push([[ax,prev,F+.002],[bx,nex,F+.002],band?'rgba(54,41,25,.12)':'rgba(14,44,43,.18)',.6+noise()*1.25]);ax=bx;prev=nex;}
  }
  for(let i=0;i<670;i++){
    const x=-X+noise()*2*X,y=B+noise()*(T-B),l=.01+noise()*.09;
    surface.push([[x,y,F+.004],[Math.min(X,x+l),y+.003,F+.004],noise()>.45?'rgba(245,238,205,.24)':'rgba(29,38,30,.22)',.6]);
  }
  function draw(){
    const rect=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2),w=rect.width,h=rect.height;
    if(!w||!h||!ctx)return;
    if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);}
    ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
    const face=(vs,fill)=>{const p=vs.map(v=>project(...v));ctx.beginPath();ctx.moveTo(p[0][0],p[0][1]);p.slice(1).forEach(a=>ctx.lineTo(a[0],a[1]));ctx.closePath();ctx.fillStyle=fill;ctx.fill();};
    const line=(va,vb,color,lw=1,dash=[])=>{const a=project(...va),b=project(...vb);ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);ctx.setLineDash(dash);ctx.strokeStyle=color;ctx.lineWidth=lw;ctx.stroke();ctx.setLineDash([]);};
    const viewKey=[canvas.width,canvas.height,state.yaw,state.pitch,state.zoom,state.detail?state.index:'overview'].join('|');
    if(viewKey===previousView){ctx.drawImage(backdrop,0,0,w,h);}
    else{
      fixed.map(f=>({...f,d:f.vertices.reduce((s,v)=>s+project(...v)[2],0)/4})).sort((a,b)=>a.d-b.d).forEach(f=>face(f.vertices,f.fill));
      surface.forEach(l=>line(...l));
      line([-X,0,.01],[X,0,.01],'#e5bb83',1.2);
      if(state.yaw>0)line([X,0,0],[X,0,R],'#b89868');else line([-X,0,0],[-X,0,R],'#b89868');
      backdrop.width=canvas.width;backdrop.height=canvas.height;backdropContext.drawImage(canvas,0,0);previousView=viewKey;
    }
    const a=path[0],b=path[path.length-1],m=path[state.index];
    line([a.x,a.y,a.z],[b.x,b.y,b.z],'#f6eed0',1.1,[3,3]);
    line([a.x,a.y,a.z],[m.x,m.y,m.z],'#273832',4.5);
    line([a.x,a.y,a.z],[m.x,m.y,m.z],'#ffe5a3',1.2);
    line([m.x,m.y,.13],[m.x,0,.13],'#d2f8e6',1.4,[2,2]);
    const [cx,cy]=project(m.x,m.y,.17),[rx,ry]=project(m.x+1,m.y+Math.tan(Math.atan2(b.y-a.y,b.x-a.x)),.17);
    const length=Math.hypot(rx-cx,ry-cy),rad=Math.max(2.7,length*.085);
    ctx.save();ctx.translate(cx,cy);ctx.rotate(Math.atan2(ry-cy,rx-cx));
    const shape=(from,to,thick,base,shade,light)=>{const gr=ctx.createLinearGradient(0,-thick,0,thick);gr.addColorStop(0,base);gr.addColorStop(.26,light);gr.addColorStop(.48,base);gr.addColorStop(1,shade);ctx.fillStyle=gr;ctx.fillRect(from*length,-thick,(to-from)*length,thick*2);};
    shape(-.68,.66,rad,'#83938c','#35453f','#edf5e8');shape(-.73,-.62,rad*.92,'#56635b','#25382c','#bfd2c3');shape(.53,.66,rad*1.1,'#c99443','#654a28','#f6d49e');
    for(const off of [-.54,-.45,-.12,.14,.32])shape(off,off+.038,rad*1.01,'#273930','#15261f','#a3b8a2');
    shape(-.025,.025,rad*1.05,'#8bded0','#335f55','#d6f7ed');
    ctx.restore();
    const center=project(m.x,m.y,.19);ctx.beginPath();ctx.arc(center[0],center[1],Math.max(2.1,rad*.30),0,Math.PI*2);ctx.fillStyle='#ecf9d6';ctx.fill();
  }
  return {draw};
}
