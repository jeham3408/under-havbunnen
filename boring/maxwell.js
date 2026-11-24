/* Exact homogeneous axial-dipole reference from the project's em_forward.py.
   The two-bed values are direct samples of the original empymod forward table. */
(() => {
  'use strict';
  const $=id=>document.getElementById(id), lib=window.BoreStage.library, stage=window.BoreStage.state;
  const R=[[.6,1],[1.5,2.1]], mu=1.25663706212e-6, eps=8.8541878128e-12*10;
  const teal='#8bdcd1',gold='#edbd80',muted='#b8cbc1',grid='#3d534b',ink='#142322';
  const svg=$('em-figure'),ns='http://www.w3.org/2000/svg';
  let uniform=false, animation=0, schedule=0, previous=0, cycle=0, target=svg;
  const fmt=(n,d=2)=>Number(n).toFixed(d);
  const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
  function gamma(f,rho){
    const w=2*Math.PI*f, a=-w*w*mu*eps, b=w*mu/rho, m=Math.hypot(a,b);
    const beta=Math.sqrt((m-a)/2);
    return {alpha:b/(2*beta),beta};
  }
  // Complex H divided by the static axial field of a unit magnetic dipole.
  function normalisedField(r,g){
    const ar=g.alpha*r,br=g.beta*r,decay=Math.exp(-ar),c=Math.cos(br),s=Math.sin(br);
    return {re:decay*((1+ar)*c+br*s),im:decay*(br*c-(1+ar)*s),magnitude:decay*Math.hypot(1+ar,br)};
  }
  function homogeneous(f,rho,pair){
    const g=gamma(f,rho),near=normalisedField(R[pair][0],g),far=normalisedField(R[pair][1],g);
    const phase=-Math.atan2(far.im*near.re-far.re*near.im,far.re*near.re+far.im*near.im)*180/Math.PI;
    return {phase,loss:-20*Math.log10(far.magnitude/near.magnitude),g};
  }
  function element(tag,attrs,content){
    const node=document.createElementNS(ns,tag);for(const [key,value] of Object.entries(attrs))node.setAttribute(key,value);
    if(content!==undefined)node.textContent=content;target.append(node);return node;
  }
  const rect=(x,y,w,h,fill,opacity=1)=>element('rect',{x,y,width:w,height:h,fill,opacity});
  const line=(x1,y1,x2,y2,stroke,width=1,dash='')=>element('line',{x1,y1,x2,y2,stroke,'stroke-width':width,'stroke-dasharray':dash});
  const label=(x,y,content,colour=muted,size=11,anchor='start')=>element('text',{x,y,fill:colour,'font-size':size,'font-family':'Arial,sans-serif','text-anchor':anchor},content);
  const path=(points,stroke,width=1.7,dash='',fill='none')=>element('path',{d:points,fill,stroke,'stroke-width':width,'stroke-dasharray':dash,'stroke-linejoin':'round'});
  const curve=points=>points.map(([x,y],j)=>(j?'L':'M')+fmt(x,2)+' '+fmt(y,2)).join(' ');
  const dot=(x,y,colour,r=3.4)=>element('circle',{cx:x,cy:y,r,fill:colour,stroke:ink,'stroke-width':1.1});
  function channelIndices(f,pair){const offset=(f===2000000?4:0)+2*pair;return [offset,offset+1];}
  function layeredRows(upper,lower,f,pair){
    const row=lib.pairs.findIndex(([a,b])=>a===upper&&b===lower),ids=channelIndices(f,pair);
    return lib.grid.map((distance,i)=>{const k=(row*lib.grid.length+i)*lib.channels.length;return {distance,phase:lib.fields[k+ids[0]],loss:lib.fields[k+ids[1]]};});
  }
  function group(id,dx,dy,draw){
    const parent=target,node=element('g',{id,transform:`translate(${dx} ${dy})`});
    target=node;try{draw();}finally{target=parent;}
  }
  function toolSection(w,h,above,below,d,pair,sideBySide){
    const pad=7,top=sideBySide?29:17,bottom=h-4,centre=(top+bottom)/2,windowM=.8;
    const depthScale=(bottom-top)/(2*windowM),tx=w*.79,axialScale=(tx-w*.16)/2.1;
    const y=r=>centre-r*Math.sin(2*Math.PI/180)*depthScale, x=r=>tx-r*Math.cos(2*Math.PI/180)*axialScale;
    const [near,far]=R[pair],contrast=above!==below,contactY=centre+d*depthScale;
    const bounded=clamp(contactY,top,bottom),within=contactY>=top&&contactY<=bottom;
    const fill=rho=>rho>=6?'#504536':'#274744';
    label(pad,sideBySide?16:11,'Tool cross-section',muted,sideBySide?12:10);label(w-pad,sideBySide?16:11,'Schematic',muted,9,'end');
    rect(0,top,w,bottom-top,fill(contrast?below:above));
    if(contrast&&bounded>top)rect(0,top,w,bounded-top,fill(above));
    if(contrast&&within){line(0,contactY,w,contactY,'#edcb92',1.8);element('circle',{id:'em-schematic-contact',cx:w-4,cy:contactY,r:2.2,fill:gold});if(sideBySide)label(w-6,clamp(contactY-4,top+12,bottom-4),'Bed boundary',gold,9,'end');}
    if(contrast&&!within){const towards=d>0?'↓':'↑';label(w-pad,d>0?bottom-4:top+10,towards+' Boundary outside view',gold,9,'end');}
    if(!contrast)label(pad,bottom-4,'Uniform '+above+' Ω·m · no contrast','#e3d5b3',9);
    if(contrast&&sideBySide){
      const fits=(a,b)=>b-a>26;
      if(fits(top,bounded))label(pad,top+13,above+' Ω·m',muted,10);
      if(fits(bounded,bottom))label(pad,bottom-8,below+' Ω·m',muted,10);
    }
    const beamEnd=x(-.21),beamStart=x(2.38);
    line(beamStart,y(2.38),beamEnd,y(-.21),'#162a26',sideBySide?9:6);
    line(beamStart,y(2.38),beamEnd,y(-.21),'#bac2ad',sideBySide?4:3);
    const coil=(r,colour,id)=>{const cx=x(r),cy=y(r),ry=sideBySide?6:4.3;const g=element('g',{id,'data-spacing-m':r});
      for(const off of [-2,0,2]){const ring=document.createElementNS(ns,'ellipse');for(const [name,val] of Object.entries({cx:cx+off,cy,rx:1.15,ry,fill:'none',stroke:colour,'stroke-width':1.3}))ring.setAttribute(name,val);g.append(ring);}
      return [cx,cy];};
    for(const [r,name,colour,id] of [[far,'Far receiver',teal,'em-coil-far'],[near,'Near receiver',teal,'em-coil-near'],[0,'Transmitter',gold,'em-coil-tx']]){
      const [cx,cy]=coil(r,colour,id),belowCoil=r===near&&(pair===0||sideBySide),labelY=cy+(belowCoil?(sideBySide?21:11):-(sideBySide?16:8.5));
      if(sideBySide)line(cx,cy+(belowCoil?6:-6),cx,labelY+(belowCoil?-8:2),colour,.8);
      label(cx,labelY,name,colour,sideBySide?10:9,'middle');
    }
    for(const text of target.querySelectorAll('text')){text.setAttribute('paint-order','stroke');text.setAttribute('stroke','#20332c');text.setAttribute('stroke-width','1.8');text.setAttribute('stroke-linejoin','round');}
    if(sideBySide){label(pad,h+12,'Near '+near+' m · far '+far+' m behind Tx',muted,10);label(pad,h+26,'Depth window ±0.8 m around Tx',muted,10);}
  }
  function layeredPlot(w,h,rows,index,contrast){
    const left=w<440?38:45,right=w-8,top=24,bottom=h-28,mid=(left+right)/2;
    const x=d=>left+(d+8)/16*(right-left),selected=x(rows[index].distance),strip=(bottom-top)/2;
    if(contrast){
      rect(left,top,mid-left,bottom-top,'#264642',.55);rect(mid,top,right-mid,bottom-top,'#453c2c',.43);
      label((left+mid)/2,15,'Transmitter in lower bed','#a9cfc8',w<430?9:11,'middle');label((mid+right)/2,15,'Transmitter in upper bed','#d2bf9e',w<430?9:11,'middle');
    }else{rect(left,top,right-left,bottom-top,'#33413a',.55);label(mid,15,'Equal resistivities · no boundary response',muted,w<430?10:12,'middle');}
    for(const d of [-8,-4,0,4,8]){line(x(d),top,x(d),bottom,d===0&&contrast?'#bba47d':grid,d===0&&contrast?1.3:1,d===0&&contrast?'4 3':'');label(x(d),bottom+12,d>0?'+'+d:d,muted,10,d===-8?'start':d===8?'end':'middle');}
    line(selected,top,selected,bottom,'#eaf2d9',1.2,'2 3');
    for(const [j,key,title,colour] of [[0,'phase','Phase lag (°)',teal],[1,'loss','Formation loss (dB)',gold]]){
      const y0=top+j*strip+14,y1=top+(j+1)*strip-6,values=rows.map(r=>r[key]);
      let min=Math.min(...values),max=Math.max(...values);const margin=Math.max((max-min)*.08,Math.max(.01,Math.abs(max)*.025));min-=margin;max+=margin;
      const y=v=>y1-(v-min)/(max-min)*(y1-y0),points=rows.map(r=>[x(r.distance),y(r[key])]);
      line(left,y0,right,y0,grid);line(left,y1,right,y1,grid);label(left-3,y0+4,fmt(max,max>10?0:1),muted,9,'end');label(left-3,y1+2,fmt(min,max>10?0:1),muted,9,'end');
      label(left+5,y0-3,title,colour,10);path(curve(points),colour,2);dot(selected,y(values[index]),colour,4);
    }
    label((left+right)/2,h-2,contrast?'Vertical boundary offset from transmitter (m)':'Signed reference-plane offset (m)',muted,w<430?9:11,'middle');
    svg.setAttribute('aria-label','Two-bed Maxwell model. The graph plots phase lag and formation loss against signed vertical distance from transmitter to boundary. Positive means the boundary is below the transmitter.');
  }
  function uniformPlot(w,h,g,ranges,phase){
    const left=w<440?29:43,right=w-12,top=43,bottom=h-27,mid=(top+bottom)/2,amp=(bottom-top)*.46;
    const maxR=4,x=r=>left+r/maxR*(right-left),y=v=>mid-v*amp,angle=phase*Math.PI/180;
    label(left,12,'Axial magnetic field divided by static field',muted,w<430?10:12);
    for(const r of [0,1,2,3,4]){line(x(r),top,x(r),bottom,grid);label(x(r),bottom+12,r,muted,10,'middle');}
    for(const level of [-1,0,1]){line(left,y(level),right,y(level),level===0?'#89a497':grid);label(left-4,y(level)+3,level,muted,9,'end');}
    const upper=[],lower=[],wave=[];
    for(let i=0;i<=200;i++){const r=maxR*i/200,q=normalisedField(r,g);upper.push([x(r),y(q.magnitude)]);lower.push([x(r),y(-q.magnitude)]);wave.push([x(r),y(q.re*Math.cos(angle)-q.im*Math.sin(angle))]);}
    const fill=curve(upper)+' '+curve(lower.reverse()).replace(/^M/,'L')+' Z';path(fill,'none',0,'','#284742');
    path(curve(upper),gold,1.2,'4 3');path(curve(lower),gold,1.2,'4 3');path(curve(wave),teal,2.1);
    for(const [j,r] of ranges.entries()){
      const q=normalisedField(r,g);line(x(r),top-3,x(r),bottom,'#abbeb2',1,'2 4');dot(x(r),y(q.re*Math.cos(angle)-q.im*Math.sin(angle)),teal);
      const anchor=j===0?'end':'start';label(x(r)+(j?2:-2),top-7,(j?'Far ':'Near ')+r+' m',muted,w<430?9:10,anchor);
    }
    label((left+right)/2,h-2,'Distance from transmitter along the tool axis (m)',muted,w<430?9:11,'middle');
    svg.setAttribute('aria-label','Exact homogeneous axial dipole field normalised by the static 1/r³ field. The teal signal oscillates inside the dashed magnitude envelope. Near and far receivers sample the field at their labelled positions.');
  }
  function render(){
    schedule=0;if(stage.page!=='physics')return;
    const b=$('em-instrument').getBoundingClientRect(),w=b.width,h=b.height;if(w<100||h<60)return;
    svg.replaceChildren();svg.setAttribute('viewBox',`0 0 ${w} ${h}`);
    const frequency=Number($('em-frequency').value),pair=Number($('em-pair').value),rs=R[pair];let phase,loss;
    if(uniform){const calc=homogeneous(frequency,Number($('em-rho').value),pair);phase=calc.phase;loss=calc.loss;
      $('em-read-note').textContent='Plane-wave skin depth: '+fmt(1/calc.g.alpha)+' m';
      $('em-time-label').textContent=Math.round(cycle)+'° source phase';uniformPlot(w,h,calc.g,rs,cycle);
    }else{
      const [upper,lower]=$('em-rockpair').value.split(',').map(Number),index=Number($('em-distance').value)+80,rows=layeredRows(upper,lower,frequency,pair),row=rows[index];phase=row.phase;loss=row.loss;
      const distance=Math.abs(row.distance)<1e-9?'At transmitter':fmt(Math.abs(row.distance),1)+' m '+(row.distance>0?'below':'above')+' Tx';
      const contrast=upper!==lower;
      $('em-depth-row').querySelector('label').firstChild.textContent=contrast?'Move the boundary ':'Move the reference plane ';
      $('em-distance').setAttribute('aria-label',contrast?'Signed vertical distance from transmitter to boundary':'Signed vertical distance from transmitter to a reference plane in uniform rock');
      $('em-distance-label').textContent=distance;$('em-distance').setAttribute('aria-valuetext',distance.replace('Tx','transmitter'));
      $('em-read-note').textContent='Receivers '+rs[0]+' m and '+rs[1]+' m behind Tx';
      const wide=w>=560,sectionW=wide?Math.min(w*.33,265):w,sectionH=wide?h-39:clamp(h*.30,58,84);
      group('em-schematic',0,0,()=>toolSection(sectionW,sectionH,upper,lower,row.distance,pair,wide));
      const plotX=wide?sectionW+8:0,plotY=wide?0:sectionH;
      group('em-response-curves',plotX,plotY,()=>layeredPlot(w-plotX,h-plotY,rows,index,contrast));
      svg.setAttribute('aria-label',contrast?`Tool cross-section. The boundary is ${distance.replace('Tx','the transmitter')}. Near and far receivers are ${rs[0]} and ${rs[1]} metres behind the transmitter. The curves show phase lag and formation loss as boundary depth changes.`:`Uniform ${upper} ohm metre rock; no electrical contrast. The near and far receivers have a finite response that stays constant as the reference plane moves.`);
    }
    $('em-phase-value').textContent=fmt(phase)+'°';$('em-loss-value').textContent=fmt(loss)+' dB';
  }
  function redraw(){if(!schedule)schedule=requestAnimationFrame(render);}
  function stop(){if(animation){cancelAnimationFrame(animation);animation=0;}previous=0;$('em-run').textContent='▶';$('em-run').setAttribute('aria-label','Play one slowed wave cycle repeatedly');}
  function tick(now){if(document.hidden||stage.page!=='physics'||!stage.active||!uniform){stop();return;}if(previous)cycle=(cycle+(now-previous)*.12)%360;previous=now;$('em-time').value=Math.round(cycle);render();animation=requestAnimationFrame(tick);}
  function setUniform(on){stop();uniform=on;$('em-layered').setAttribute('aria-pressed',!on);$('em-uniform').setAttribute('aria-pressed',on);
    $('em-rho-label').hidden=!on;$('em-time-row').hidden=!on;$('em-rockpair-label').hidden=on;$('em-depth-row').hidden=on;redraw();}
  $('em-layered').onclick=()=>setUniform(false);$('em-uniform').onclick=()=>setUniform(true);
  ['em-frequency','em-pair','em-rockpair','em-rho'].forEach(id=>$(id).addEventListener('change',redraw));$('em-distance').oninput=redraw;
  $('em-run').onclick=()=>{if(animation){stop();return;}if(document.hidden||!stage.active)return;$('em-run').textContent='Ⅱ';$('em-run').setAttribute('aria-label','Pause the slowed wave');animation=requestAnimationFrame(tick);};
  $('em-time').oninput=()=>{stop();cycle=Number($('em-time').value);redraw();};
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
  new ResizeObserver(redraw).observe($('em-instrument'));
  function notes(container){
    container.replaceChildren();const wrapper=document.createElement('div');wrapper.className='em-method';container.append(wrapper);
    const para=text=>{const p=document.createElement('p');p.textContent=text;wrapper.append(p);return p;};
    const law=(heading,equation,explanation)=>{const p=document.createElement('p'),strong=document.createElement('strong'),code=document.createElement('code');strong.textContent=heading;code.textContent=equation;p.append(strong,document.createElement('br'),code,document.createElement('br'),explanation);wrapper.append(p);};
    law('Faraday’s law','∇ × E = −∂B/∂t','The transmitter’s changing magnetic field induces electric fields in the rock. At a receiver coil, changing magnetic flux produces the measured voltage.');
    law('Ampère–Maxwell law','∇ × H = Jₛ + σE + ∂D/∂t','The transmitter current Jₛ drives the field. Conductive current σE and displacement current ∂D/∂t in the formation contribute to the magnetic field sampled by each receiver.');
    para('We assume a linear, isotropic medium with B = μH, D = εE and σ = 1/ρ. The complex propagation constant follows from these laws and the harmonic source.');
    para('The synthetic well uses a magnetic transmitter with four receivers behind it. A receiver pair compares the field at 0.6 and 1.0 m (short) or 1.5 and 2.1 m (long). Measuring phase and amplitude at two frequencies gives eight channels. Tx means transmitter.');
    para('Two-bed solver. Each plotted sample comes directly from the empymod 2.6.1 frequency-domain Maxwell calculation used for the synthetic well. The horizontal boundary separates two isotropic half-spaces. The tool dips 2°. The library has 60 resistivity pairs, 161 signed offsets from −8 to +8 m and eight channels. The slider selects the original 0.1 m grid points. The schematic shows a depth window of ±0.8 m around the transmitter. Coil symbols are enlarged. Rx means receiver. Layers with equal resistivity have no electrical contrast.');
    para('Uniform-rock signal. The continuous trace uses the exact axial magnetic-dipole solution in a homogeneous medium. Its teal line is the instantaneous, signed field and its dashed envelope is the field magnitude. Both are divided by the static dipole field so conductive attenuation is visible. The source-phase control slows one cycle for inspection.');
    const formula=para('');const code=document.createElement('code');code.textContent='γ = √[iωμ(σ + iωε)], σ = 1/ρ, H(r) = (1 + γr)e^(−γr)/(2πr³).';formula.append(code);
    para('H is in A/m for a unit 1 A·m² magnetic moment. We use relative permittivity 10, relative permeability 1 and the exp(+iωt) convention. The plotted trace is Re[(1 + γr)e^(−γr)e^(iωt)]. The material skin depth 1/Re(γ) describes plane-wave amplitude decay. The dipole field also has geometric spreading and a near-field term.');
    para('The tool forms Q = (Hfar / Hnear)(rfar / rnear)³. Phase lag is −arg(Q) in degrees and formation loss is −20 log₁₀|Q| in dB. This ratio removes static geometric spreading. Values at r = 0 on the normalised curve use its finite analytical limit.');
    para('Numerical check. In 6 Ω·m rock at 2 MHz, the long pair gives 36.6191° and 3.70096 dB. The original layered solver matched the exact complex homogeneous field within 5.8 × 10⁻¹⁰ relative error at the three validation resistivities (0.8, 6 and 30 Ω·m). The models omit the borehole fluid, casing, invasion, anisotropy and tool electronics. The Ekofisk instrument uses a different channel geometry.');
    const citation=para('Project implementation: em_forward.py and resultater/fysikkontroll.json. Solver reference: '),a=document.createElement('a');a.href='https://doi.org/10.1190/GEO2016-0626.1';a.target='_blank';a.rel='noopener noreferrer';a.textContent='Werthmüller (2017), Geophysics';citation.append(a);
  }
  window.BorePhysics={redraw,stop,notes,homogeneous,normalisedField,gamma,layeredRows};redraw();
})();
