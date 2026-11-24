(() => {
  'use strict';
  const $ = selector => document.querySelector(selector);
  const panel = $('#phys-panel'), open = $('#physics-open'), modelTime = $('#hold-time'), depth = $('#phys-depth');
  const originalHoldParent = $('#hold-study').parentNode, originalNext = $('#hold-study').nextSibling;
  const {holdReadings, pressure, log} = window.ClayEvidence;
  const {permeability} = window.clayLabPhysics;
  const number = (value,digits=0) => value.toLocaleString('en-GB',{minimumFractionDigits:digits,maximumFractionDigits:digits});
  const clamp = (x,lo,hi) => Math.min(hi,Math.max(lo,x));
  const ink = '#b4c8b9', teal = '#92d8cc', ochre = '#edb978', grid = '#3d574b';
  let mode='lab', firstOpen=true;
  function pressures(z){
    const head = pressure.reservoirDensity * pressure.gravity * pressure.reservoirDepth;
    const gasHead = pressure.gasDensity * pressure.gravity * (pressure.reservoirDepth-z);
    const demand = (head-gasHead)/1e6;
    const limit = pressure.lotDensity * pressure.gravity * z/1e6;
    return {demand,limit,margin:limit-demand};
  }
  const pressureRows=log.map(row=>({md:row[0],z:row[4],...pressures(row[4])}));
  function chart(svg,domain,yDomain,xTicks,yTicks,unit){
    const w=Math.max(270,svg.clientWidth), h=Math.max(100,svg.clientHeight);
    const l=34,r=w-15,t=17,b=h-24;
    const X=v=>l+(v-domain[0])/(domain[1]-domain[0])*(r-l),Y=v=>b-(v-yDomain[0])/(yDomain[1]-yDomain[0])*(b-t);
    const stroke=(x1,y1,x2,y2,c,style='')=>'<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="'+c+'" '+style+'/>';
    const label=(x,y,txt,anchor)=>'<text x="'+x+'" y="'+y+'" text-anchor="'+anchor+'" font-size="9" font-family="Arial,sans-serif" fill="'+ink+'">'+txt+'</text>';
    let marks=label(l,10,unit,'start');
    for(const y of yTicks)marks+=stroke(l,Y(y),r,Y(y),grid)+label(l-5,Y(y)+3,number(y),'end');
    for(const x of xTicks)marks+=stroke(X(x),b,X(x),b+3,ink)+label(X(x),b+14,number(x),'middle');
    function series(points,c){
      const d=points.map(([x,y],i)=>(i===0?'M':'L')+X(x).toFixed(1)+' '+Y(y).toFixed(1)).join(' ');
      return '<path d="'+d+'" stroke="'+c+'" stroke-width="2" fill="none" stroke-linejoin="round"/>';
    }
    function dot(x,y,radius,colour,filled){
      return '<circle cx="'+X(x)+'" cy="'+Y(y)+'" r="'+radius+'" stroke="'+colour+'" stroke-width="1.4" fill="'+(filled?colour:'#152822')+'"/>';
    }
    function cursor(x){return stroke(X(x),t,X(x),b,'#cee0cd','stroke-dasharray="3 3" stroke-opacity=".8"');}
    function finish(content){svg.setAttribute('viewBox','0 0 '+w+' '+h);svg.innerHTML=marks+content;}
    return {finish,series,dot,cursor,l,r,w};
  }
  function lab(){
    const day=Number(modelTime.value), fit=permeability(day), percent=100*fit/permeability(0);
    const nearest=holdReadings.reduce((a,b)=>Math.abs(b[0]-day)<Math.abs(a[0]-day)?b:a);
    $('#point-label').textContent='Nearest reading · day '+number(nearest[0],2);
    $('#point-read').textContent='≈ '+number(nearest[1],1)+' µD';
    $('#flux-ratio').textContent=number(percent,1)+'%';
    const difference=nearest[1]-permeability(nearest[0]);
    $('#flux-copy').textContent='At day '+number(nearest[0],2)+', the nearest reading is about '+number(Math.abs(difference))+' µD '+(difference<0?'below':'above')+' the fit. The flow ratio assumes the same fluid and pressure gradient.';
    const svg=$('#lab-graph'), c=chart(svg,[0,50],[0,550],[0,10,20,30,40,50],[0,250,500],'Permeability (µD) · time at constant pressure (days)');
    const fitLine=Array.from({length:101},(_,i)=>[i/2,permeability(i/2)]);
    c.finish(c.series(fitLine,ochre)+c.cursor(day)+holdReadings.map(([x,y])=>c.dot(x,y,2.7,teal,false)).join('')+c.dot(nearest[0],nearest[1],4.1,teal,true)+c.dot(day,fit,3.5,ochre,true));
  }
  function field(){
    const i=Number(depth.value),p=pressureRows[i];
    $('#depth-val').textContent=number(p.z,1)+' m TVD';
    depth.style.setProperty('--progress',(100*i/(pressureRows.length-1))+'%');
    depth.setAttribute('aria-valuetext',number(p.z,1)+' metres true vertical depth. Pressure margin '+number(p.margin,2)+' megapascals.');
    $('#required').textContent=number(p.demand,2)+' MPa';
    $('#capacity').textContent=number(p.limit,2)+' MPa';
    $('#margin').textContent=(p.margin>0?'+':'')+number(p.margin,2)+' MPa';
    $('#margin-copy').textContent=p.margin>=0?'The formation proxy exceeds demand here. The atlas also checks the logs and the length of the interval.':'Demand exceeds the formation proxy here. This depth fails the pressure screen.';
    const svg=$('#field-graph'), ticks=svg.clientWidth<450?[1050,1150,1250,1300]:[1050,1100,1150,1200,1250,1300];
    const c=chart(svg,[pressureRows[0].z,pressureRows.at(-1).z],[17,24],ticks,[18,20,22,24],'Pressure (MPa) · true vertical depth (m)');
    c.finish(c.series(pressureRows.map(v=>[v.z,v.demand]),ochre)+c.series(pressureRows.map(v=>[v.z,v.limit]),teal)+c.cursor(p.z)+c.dot(p.z,p.demand,3.4,ochre,true)+c.dot(p.z,p.limit,3.4,teal,true));
  }
  function draw(){if(!panel.open)return;if(mode==='lab')lab();else field();}
  function enter(){
    if(panel.open)return;
    mode=$('#lab').hidden?'field':'lab';
    if($('#run').classList.contains('playing'))$('#run').click();
    if(!$('#notes').hidden)$('#close-notes').click();
    $('#phys-kicker').textContent=mode==='lab'?'Pierre II shale · laboratory':'Fram 35/11-7 · archive screen';
    $('#phys-heading').textContent=mode==='lab'?'Does contact stop flow?':'Will the rock hold the pressure?';
    $('#phys-lab').hidden=mode!=='lab';$('#phys-field').hidden=mode!=='field';
    if(mode==='lab'){
      $('#hold-slot').append($('#hold-study'));$('#hold-study').hidden=false;
      if(firstOpen&&Number(modelTime.value)===0){modelTime.value='20.4';modelTime.dispatchEvent(new Event('input'));}
      firstOpen=false;
    }else{depth.max=String(log.length-1);depth.value=$('#sweep').value;}
    panel.showModal();panel.querySelector('.phys-body').scrollTop=0;$('#phys-close').focus({preventScroll:true});draw();
  }
  panel.addEventListener('close',()=>{
    if($('#hold-study').parentNode!==originalHoldParent)originalHoldParent.insertBefore($('#hold-study'),originalNext);
    if(document.activeElement===document.body)open.focus({preventScroll:true});
  });
  open.addEventListener('click',enter);
  $('#phys-close').addEventListener('click',()=>panel.close());
  modelTime.addEventListener('input',draw);
  depth.addEventListener('input',()=>{const s=$('#sweep');s.value=depth.value;s.dispatchEvent(new Event('input'));draw();});
  for(const svg of [$('#lab-graph'),$('#field-graph')]){
    svg.addEventListener('pointerdown',e=>{
      const r=svg.getBoundingClientRect(),fraction=clamp((e.clientX-r.left-34)/(r.width-49),0,1);
      if(mode==='lab'){
        const t=50*fraction,near=holdReadings.reduce((a,b)=>Math.abs(b[0]-t)<Math.abs(a[0]-t)?b:a);
        modelTime.value=String(Math.round(near[0]*10)/10);modelTime.dispatchEvent(new Event('input'));
      }else{depth.value=String(Math.round(fraction*(log.length-1)));depth.dispatchEvent(new Event('input'));}
    });
  }
  new ResizeObserver(draw).observe(panel);
  addEventListener('message',e=>{if(e.source===parent&&e.data?.type==='stage-active'&&e.data.active===false&&panel.open)panel.close();});
})();
