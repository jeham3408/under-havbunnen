'use strict';
function initialiseReserve() {
  const $ = id => document.getElementById(id);
  const numbers = [0, 1, 2].map(digits => new Intl.NumberFormat('en-GB', {maximumFractionDigits: digits}));
  const format = (value, digits = 1) => numbers[digits].format(value);
  const volumeUnit = field => field.unit === 'tonn' ? 'million tonnes' : 'million barrels';
  const clamp = (val, lo, hi) => Math.max(lo, Math.min(hi, val));
  const sliders = {h: $('thickness'), p: $('porosity'), r: $('recovery')};
  const canvas = $('block'), ctx = canvas.getContext('2d');
  const curve = $('curve');
  const fields = OIL_FIELDS;
  const selected = $('field-name');
  const modelTab = $('model-tab'), fieldTab = $('field-tab');
  let azimuth = -0.57, elevation = 0.45;
  let drag = null, frame = 0, timer = 0, mode = 'model', field, cumulative = [];
  let blockW = 0, blockH = 0;
  const svgNS='http://www.w3.org/2000/svg';
  function svg(type, attr, content) {
    const elem=document.createElementNS(svgNS,type);
    for (const [name,value] of Object.entries(attr || {})) elem.setAttribute(name,value);
    if(content !== undefined) elem.textContent=content;
    return elem;
  }
  function rescaleCanvas() {
    const box=canvas.getBoundingClientRect();
    if (!box.width || !box.height || !ctx) return;
    blockW=box.width; blockH=box.height;
    const ratio=Math.min(window.devicePixelRatio || 1,2);
    canvas.width=Math.round(box.width*ratio); canvas.height=Math.round(box.height*ratio);
    ctx.setTransform(ratio,0,0,ratio,0,0);
    drawBlock();
  }
  function requestRedraw() {
    if (!frame) frame=requestAnimationFrame(() => {frame=0; drawBlock();});
  }
  function drawBlock() {
    if (!ctx || !blockW || !blockH || mode!=='model') return;
    const width=blockW, height=blockH;
    const compact=width < 560;
    const ca=Math.cos(azimuth), sa=Math.sin(azimuth);
    const se=Math.sin(elevation), ce=Math.cos(elevation);
    const base=-.60, top=.30, h=Number(sliders.h.value)*.012;
    const topRes=-.045, baseRes=topRes-h;
    // Identical drape at each interface preserves the specified gross thickness.
    const drape=(x,y)=>.075*Math.cos(2.5*x+.4*y)+.024*Math.sin(3*y-.8*x)+.04*x;
    // Fit the projected rock volume as it turns, leaving the labels outside its silhouette.
    let topEdge=Infinity, bottomEdge=-Infinity;
    for (let ix=0; ix<=10; ix++) {
      for (let iy=0; iy<=10; iy++) {
        const x=ix/5-1, y=iy/5-1;
        const folded=drape(x,y), depth=(x*sa+y*ca)*se;
        topEdge=Math.min(topEdge,depth-(top+folded)*ce);
        bottomEdge=Math.max(bottomEdge,depth-(base+folded)*ce);
      }
    }
    const topMargin=compact ? Math.min(106,height*.29) : 12;
    const usableHeight=Math.max(45,height-topMargin-32);
    const s=Math.min(width*(compact ? .30 : .254),usableHeight/(bottomEdge-topEdge));
    const cx=width*(compact ? .525 : .58);
    const cy=topMargin+(usableHeight-s*(bottomEdge-topEdge))*.5-s*topEdge;
    function pt(x,y,z) {
      return [cx+s*(x*ca-y*sa),cy+s*((x*sa+y*ca)*se-z*ce)];
    }
    const rock=(x,y,z)=>pt(x,y,z+drape(x,y));
    function path(points,close=false) {
      ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));
      if(close)ctx.closePath();
    }
    function stroke(points,color,w=1,dash=[]) {
      path(points);ctx.strokeStyle=color;ctx.lineWidth=w;ctx.setLineDash(dash);ctx.stroke();ctx.setLineDash([]);
    }
    function poly(points,fill,edge) {
      path(points,true);ctx.fillStyle=fill;ctx.fill();
      if(edge){ctx.strokeStyle=edge;ctx.lineWidth=.7;ctx.stroke()}
    }
    function sidePoints(side,level,from=-1,to=1,segments=40) {
      const out=[];
      for(let i=0;i<=segments;i++){
        const t=from+(to-from)*i/segments;
        out.push(rock(side.axis==='x'?side.sign:t,side.axis==='y'?side.sign:t,level));
      }
      return out;
    }
    ctx.clearRect(0,0,width,height);
    // A projected construction plane gives the object a stable reference on rotation.
    const floor=-.75;
    for(let t=-1.5;t<=1.55;t+=.25){
      stroke([pt(t,-1.55,floor),pt(t,1.55,floor)],'rgba(142,188,166,.095)',.65);
      stroke([pt(-1.55,t,floor),pt(1.55,t,floor)],'rgba(142,188,166,.095)',.65);
    }
    const sideX={axis:'x',sign:Math.sign(sa)||1},sideY={axis:'y',sign:Math.sign(ca)||1};
    const layers=[
      [base,baseRes,'#52645a','#3f514d'],
      [baseRes,topRes,'#c59358','#a47649'],
      [topRes,top,'#657970','#53675f']
    ];
    for(const side of [sideX,sideY]){
      const tone=side.axis==='x'?2:3;
      for(const layer of layers) {
        poly([...sidePoints(side,layer[1]),...sidePoints(side,layer[0]).reverse()],layer[tone]);
        stroke(sidePoints(side,layer[0]),'rgba(202,218,194,.48)',.7);
      }
      // Detrital bedding is illustrative; colours do not encode a measured facies log.
      for(let i=1;i<23;i++){
        const z=base+i*(top-base)/24;
        if(z>baseRes-.008&&z<topRes+.008)continue;
        stroke(sidePoints(side,z),i%3===0?'rgba(19,39,35,.27)':'rgba(222,225,191,.17)',i%3===0?1.15:.7);
      }
      for(let i=1;i<=5;i++){
        const z=baseRes+(topRes-baseRes)*i/6;
        stroke(sidePoints(side,z),i%2?'rgba(72,48,32,.19)':'rgba(255,221,151,.23)',.8);
      }
      stroke(sidePoints(side,topRes),'rgba(255,217,146,.91)',1.1);
      stroke(sidePoints(side,baseRes),'rgba(249,199,123,.69)',.8);
      stroke(sidePoints(side,top),'#92a79a',1);
    }
    // The top is a smooth surface, tessellated for curvature rather than as a flat rhombus.
    const n=17;
    for(let ix=0;ix<n;ix++){
      for(let iy=0;iy<n;iy++){
        const x=-1+2*ix/n,y=-1+2*iy/n,dd=2/n;
        const d=drape(x+dd/2,y+dd/2);
        const r=Math.round(74+28*d),g=Math.round(98+35*d),b=Math.round(89+35*d);
        const color='rgb('+r+','+g+','+b+')';
        path([rock(x,y,top),rock(x+dd,y,top),rock(x+dd,y+dd,top),rock(x,y+dd,top)],true);
        ctx.fillStyle=color;ctx.fill();ctx.strokeStyle=color;ctx.lineWidth=.8;ctx.stroke();
      }
    }
    for(let j=-1;j<=1.01;j+=.25){
      const xx=[],yy=[];
      for(let i=0;i<=30;i++){const t=-1+2*i/30;xx.push(rock(j,t,top));yy.push(rock(t,j,top));}
      stroke(xx,'rgba(181,209,190,.22)',.7);stroke(yy,'rgba(181,209,190,.19)',.65);
    }
    for(const side of [{axis:'x',sign:-1},{axis:'x',sign:1},{axis:'y',sign:-1},{axis:'y',sign:1}])stroke(sidePoints(side,top),'rgba(180,203,179,.66)',.85);
    // Gross thickness measured along the local vertical of the nearest exposed corner.
    const markerSide=Math.abs(ca)>=Math.abs(sa)?sideY:sideX;
    const at = markerSide.axis==='x' ? [markerSide.sign, -.30] : [.25, markerSide.sign];
    const high=rock(at[0],at[1],topRes), low=rock(at[0],at[1],baseRes);
    const x=high[0];ctx.lineCap='round';
    stroke([high,low],'#ffdf95',2.1);
    for(const p of [high,low])stroke([[x-4,p[1]],[x+4,p[1]]],'#ffdf95',1.6);
    const label=$('thick-out').value;
    ctx.font='600 '+(compact?10:12)+'px Arial,sans-serif';
    const tw=ctx.measureText(label).width,mid=(high[1]+low[1])/2;
    const lx=clamp(x+13,4,width-tw-14);
    ctx.fillStyle='#1f2b24';ctx.fillRect(lx-4,mid-8,tw+8,16);
    ctx.fillStyle='#ffdda8';ctx.fillText(label,lx,mid+4);
    ctx.lineCap='butt';
  }
  const modelAssumptions = {
    areaKm2: 20, netToGross: 0.65, oilSaturation: 0.75, formationVolumeFactor: 1.25,
    barrelsPerStandardM3: 6.2898
  };
  const stageDefinitions = [
    {key: 'gross', name: 'Gross rock', colour: '#98a99b'},
    {key: 'net', name: 'Net reservoir rock', colour: '#a9ba9b'},
    {key: 'pores', name: 'Pore space', short: 'Pore space', colour: '#79c6c0'},
    {key: 'oil', name: 'Oil in the pores', short: 'Oil at depth', colour: '#e4af72'},
    {key: 'stock', name: 'Oil in place', colour: '#e2a866'},
    {key: 'recovered', name: 'Recoverable oil', short: 'Recoverable', colour: '#eed19b'}
  ];
  const detailedNumber = new Intl.NumberFormat('en-GB', {maximumFractionDigits: 7});
  let selectedStep = 0, tracing = false, budget;
  const traceRows = [], traceShortcuts = [];
  const barMaximum = modelAssumptions.areaKm2 * Number(sliders.h.max);

  function calculateVolumes(h, p, recovery) {
    const constants = modelAssumptions;
    // km² × m is already in millions of cubic metres. Convert to stock-tank volume before barrels.
    const gross = constants.areaKm2 * h;
    const net = gross * constants.netToGross;
    const pores = net * p;
    const oil = pores * constants.oilSaturation;
    const stock = oil / constants.formationVolumeFactor;
    const recovered = stock * recovery;
    return {h, p, recovery, gross, net, pores, oil, stock, recovered,
      stockBarrels: stock * constants.barrelsPerStandardM3,
      recoveredBarrels: recovered * constants.barrelsPerStandardM3};
  }
  function updateTrace() {
    const v = budget, c = modelAssumptions, n = value => detailedNumber.format(value);
    const computations = [
      [n(c.areaKm2)+' km² × '+n(v.h)+' m = '+n(v.gross)+' million m³',
       'The mapped area and gross thickness give the volume of the whole rock layer.'],
      [n(v.gross)+' × '+n(c.netToGross)+' = '+n(v.net)+' million m³',
       'The net-to-gross ratio counts '+format(c.netToGross*100)+'% of the gross rock as reservoir rock.'],
      [n(v.net)+' × '+n(v.p)+' = '+n(v.pores)+' million m³',
       'At '+format(v.p*100)+'% porosity, this much of the net reservoir is pore space. Solid grains occupy the rest.'],
      [n(v.pores)+' × '+n(c.oilSaturation)+' = '+n(v.oil)+' million m³',
       'Oil fills '+format(c.oilSaturation*100)+'% of the pores at depth. Water fills the remaining '+format((1-c.oilSaturation)*100)+'% in this example.'],
      [n(v.oil)+' ÷ '+n(c.formationVolumeFactor)+' = '+n(v.stock)+' million standard m³',
       'Gas separates at the surface. Each standard m³ of stock-tank oil occupied '+n(c.formationVolumeFactor)+' m³ at reservoir conditions.'],
      [n(v.stock)+' × '+n(v.recovery)+' = '+n(v.recovered)+' million standard m³',
       'The recovery factor is '+format(v.recovery*100)+'%. At '+n(c.barrelsPerStandardM3)+' barrels per standard m³, this yields '+format(v.recoveredBarrels)+' million barrels.']
    ];
    stageDefinitions.forEach((d, i) => {
      const value = v[d.key], text = format(value, 2), chosen = selectedStep === i;
      const {button, number, fill} = traceRows[i];
      number.textContent = text;
      fill.style.width = value / barMaximum * 100 + '%';
      button.setAttribute('aria-pressed', String(chosen));
      button.setAttribute('aria-label', d.name+', '+text+(i < 4 ? ' million reservoir cubic metres' : ' million standard cubic metres')+'. Show calculation');
      const shortcut = traceShortcuts[i];
      if (shortcut) {
        shortcut.number.textContent = text;
        shortcut.button.setAttribute('aria-label', 'Trace '+d.name.toLowerCase()+', '+text+(i < 4 ? ' million reservoir cubic metres' : ' million standard cubic metres'));
      }
    });
    $('trace-equation').textContent = computations[selectedStep][0];
    $('trace-explanation').textContent = computations[selectedStep][1];
  }
  function showTrace(step, focusStep) {
    selectedStep = step; tracing = true;
    $('model-stage').hidden = true;
    $('trace-launch').hidden = true;
    $('volume-trace').hidden = false;
    updateTrace();
    if (focusStep) traceRows[step].button.focus({preventScroll:true});
  }
  const traceLinks = document.querySelector('.trace-links');
  stageDefinitions.forEach((d, i) => {
    const button = document.createElement('button');
    button.type='button';button.className='trace-row';button.dataset.step=d.key;
    button.style.setProperty('--stage-colour', d.colour);
    const name = document.createElement('span'); name.className='trace-name';name.textContent=d.name;
    const track = document.createElement('span');track.className='trace-track';track.setAttribute('aria-hidden','true');
    const fill=document.createElement('i');track.append(fill);
    const number=document.createElement('span');number.className='trace-number';
    button.append(name,track,number);
    button.addEventListener('click',()=>{selectedStep=i;updateTrace()});
    $(i<4?'reservoir-rows':'surface-rows').append(button);
    traceRows[i]={button,number,fill};
    if ([0,2,3,5].includes(i)) {
      const shortcut = document.createElement('button');
      shortcut.type='button';shortcut.className='trace-shortcut';shortcut.dataset.step=d.key;
      shortcut.style.setProperty('--stage-colour',d.colour);
      const label=document.createElement('span');label.textContent=d.short || d.name;
      const value=document.createElement('b');shortcut.append(label,value);
      shortcut.addEventListener('click',()=>showTrace(i,true));traceLinks.append(shortcut);
      traceShortcuts[i]={button:shortcut,number:value};
    }
  });
  $('back-to-block').addEventListener('click',()=>{
    tracing=false;$('volume-trace').hidden=true;$('trace-launch').hidden=false;
    $('model-stage').hidden=false;rescaleCanvas();
    (traceShortcuts[selectedStep] || traceShortcuts[0]).button.focus({preventScroll:true});
  });
  function updateModel() {
    const h=Number(sliders.h.value),p=Number(sliders.p.value)/100,r=Number(sliders.r.value)/100;
    budget=calculateVolumes(h,p,r);
    $('thick-out').value=format(h)+' m';$('poro-out').value=format(p*100)+'%';$('recovery-out').value=format(r*100)+'%';
    $('volume').textContent=format(budget.recoveredBarrels);
    $('in-place').textContent='Of '+format(budget.stockBarrels)+' million barrels in place';
    $('share-fill').style.width=r*100+'%';
    sliders.h.setAttribute('aria-valuetext',format(h)+' metres');
    sliders.p.setAttribute('aria-valuetext',format(p*100)+' per cent');
    sliders.r.setAttribute('aria-valuetext',format(r*100)+' per cent');
    updateTrace();
    if (!tracing) requestRedraw();
  }
  canvas.addEventListener('pointerdown',e=>{
    if(e.button!==0 && e.pointerType==='mouse')return;
    drag={x:e.clientX,y:e.clientY,angle:azimuth,elev:elevation,id:e.pointerId};
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove',e=>{
    if(!drag||drag.id!==e.pointerId)return;
    azimuth=drag.angle+(e.clientX-drag.x)*.009;
    elevation=clamp(drag.elev+(e.clientY-drag.y)*.006,.19,.87);
    requestRedraw();
  });
  const endDrag=()=>{drag=null};
  canvas.addEventListener('pointerup',endDrag);canvas.addEventListener('lostpointercapture',endDrag);
  canvas.addEventListener('keydown',e=>{
    if(!['ArrowRight','ArrowLeft','ArrowDown','ArrowUp','Home'].includes(e.key))return;
    e.preventDefault();e.stopPropagation();
    if(e.key==='Home'){azimuth=-.57;elevation=.45;}
    if(e.key==='ArrowRight')azimuth+=Math.PI/12;if(e.key==='ArrowLeft')azimuth-=Math.PI/12;
    if(e.key==='ArrowDown')elevation=clamp(elevation+.08,.19,.87);
    if(e.key==='ArrowUp')elevation=clamp(elevation-.08,.19,.87);
    requestRedraw();
  });
  $('rotate').addEventListener('click',()=>{azimuth+=Math.PI/6;requestRedraw()});
  Object.values(sliders).forEach(s=>s.addEventListener('input',updateModel));

  const yearSlider = $('year');
  let guess = null;
  let chartRange = null;
  let chartDrag = null;
  let stageActive = true;
  function niceInterval(value) {
    const exponent = 10 ** Math.floor(Math.log10(value || 1));
    const factor = [1, 2, 2.5, 5, 10].find(candidate => candidate >= value / exponent);
    return (factor || 10) * exponent;
  }
  function drawChart() {
    if (mode !== 'field' || !field) return;
    const rect = curve.getBoundingClientRect();
    const w = rect.width, h = rect.height;
    if (w < 20 || h < 28) return;
    const small = w < 510;
    const margin = {l: small ? 41 : 62, r: small ? 20 : 36, t: small ? 22 : 30, b: 31};
    const bottom = h - margin.b, right = w - margin.r;
    const start = field.start, last = start + cumulative.length - 1;
    const idx = Number(yearSlider.value) - start;
    const max = Math.max(field.estimate, field.total, guess?.volume || 0);
    const yStep = niceInterval(max / 4.5);
    const yMax = yStep * Math.ceil(max / yStep);
    const x = year => margin.l + (right - margin.l) * (year - start) / Math.max(1, last - start);
    const y = value => bottom - (bottom - margin.t) * value / yMax;
    chartRange = {l: margin.l, r: right, start, last};
    curve.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
    const group = svg('g', {'font-family': 'Arial, sans-serif', 'font-size': small ? 10 : 12});
    curve.replaceChildren(
      svg('title', {}, field.name + ' · reported oil production'),
      svg('desc', {}, 'The turquoise curve shows cumulative oil production. The dashed gold line shows the early estimate of lifetime production.'),
      group
    );
    for (let i = 0; i <= Math.round(yMax / yStep); i++) {
      const level = i * yStep;
      group.append(
        svg('line', {x1: margin.l, y1: y(level), x2: right, y2: y(level), stroke: '#73887f', 'stroke-opacity': i ? .24 : .6, 'stroke-width': 1}),
        svg('text', {x: margin.l - 7, y: y(level) + 4, 'text-anchor': 'end', fill: '#afc0b7'}, format(level, 2))
      );
    }
    const yearTicks = new Set([start, last]);
    const rough = (last - start) / (small ? 3 : 5);
    const yearStep = Math.max(1, Math.ceil(niceInterval(rough)));
    for (let tick = Math.ceil(start / yearStep) * yearStep; tick < last; tick += yearStep) {
      if (x(tick) - x(start) > (small ? 36 : 46) && x(last) - x(tick) > (small ? 36 : 46)) yearTicks.add(tick);
    }
    for (const year of [...yearTicks].sort((a, b) => a - b)) {
      group.append(
        svg('line', {x1: x(year), x2: x(year), y1: bottom, y2: bottom + 4, stroke: '#8da69a', 'stroke-width': 1}),
        svg('text', {x: x(year), y: bottom + 19, 'text-anchor': 'middle', fill: '#afc0b7'}, String(year))
      );
    }
    const symbols = svg('defs');
    const gradient = svg('linearGradient', {id: 'production-shading', x1: '0%', x2: '0%', y1: '0%', y2: '100%'});
    gradient.append(svg('stop', {offset: 0, 'stop-color': '#75cec1', 'stop-opacity': .32}), svg('stop', {offset: 1, 'stop-color': '#75cec1', 'stop-opacity': .035}));
    symbols.append(gradient); group.append(symbols);
    const line = cumulative.slice(0, idx + 1)
      .map((val, k) => (k === 0 ? 'M' : 'L') + x(start + k).toFixed(2) + ',' + y(val).toFixed(2)).join(' ');
    const lastX = x(start + idx), lastY = y(cumulative[idx]);
    group.append(
      svg('path', {d: line + ' L' + lastX + ',' + bottom + ' L' + x(start) + ',' + bottom + ' Z', fill: 'url(#production-shading)'}),
      svg('line', {x1: margin.l, x2: right, y1: y(field.estimate), y2: y(field.estimate), stroke: '#edb978', 'stroke-width': 1.8, 'stroke-dasharray': '6 5'}),
      svg('line', {x1: lastX, x2: lastX, y1: lastY, y2: bottom, stroke: '#90d8cb', 'stroke-opacity': .45, 'stroke-dasharray': '2 5'}),
      svg('path', {d: line, class: 'production-line', stroke: '#82ded2', fill: 'none', 'stroke-width': small ? 2.6 : 3.2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round'}),
      svg('circle', {cx: lastX, cy: lastY, r: 7, fill: '#7edbd0', 'fill-opacity': .15}),
      svg('circle', {cx: lastX, cy: lastY, r: 3.4, fill: '#d2fff0', stroke: '#70cfc4', 'stroke-width': 1.4})
    );
    if (guess) group.append(svg('line', {
      class: 'guess-line', x1: margin.l, x2: right, y1: y(guess.volume), y2: y(guess.volume),
      stroke: '#f7e9cd', 'stroke-linecap': 'round', 'stroke-width': 2, 'stroke-dasharray': '1 6'
    }));
  }
  function updateYear() {
    const year = Number(yearSlider.value), index = year - field.start;
    const volume = cumulative[index], atEnd = index === cumulative.length - 1;
    $('year-out').value = year;
    $('produced').textContent = format(volume, volume < 5 ? 2 : 1);
    $('produced-caption').textContent = year === 2026 ? 'Produced by Aug 2026' : 'Produced by end of ' + year;
    yearSlider.setAttribute('aria-valuetext', String(year));
    const reference = guess ? guess.volume : field.estimate;
    const percentage = (atEnd ? volume / reference - 1 : volume / reference) * 100;
    const sign = atEnd ? percentage < 0 ? '−' : percentage > 0 ? '+' : '' : '';
    $('delta').textContent = sign + format(Math.abs(percentage)) + '%';
    $('delta-note').textContent = (atEnd ? 'vs ' : 'of ') + (guess ? 'your estimate' : 'early estimate');
    $('guess-key').textContent = guess ? 'Yours ' + format(guess.volume, 2) : 'Your estimate';
    $('try-estimate').setAttribute('aria-label', guess ? 'Change your estimate of ' + format(guess.volume, 2) + ' ' + volumeUnit(field) : 'Try your own estimate');
    $('try-estimate').classList.toggle('has-guess', Boolean(guess));
    drawChart();
  }
  function selectField(name) {
    stopPlayback();
    guess = null;
    field = fields.find(row => row.name === name) || fields[0];
    selected.value = field.name;
    let sum = 0;
    cumulative = field.annual.map(volume => (sum += volume));
    // Whole-life totals retain source precision independently of annual display rounding.
    cumulative[cumulative.length - 1] = field.total;
    yearSlider.min = field.start;
    yearSlider.max = field.start + cumulative.length - 1;
    yearSlider.step = '1';
    yearSlider.value = yearSlider.max;
    $('field-unit').textContent = volumeUnit(field);
    $('estimate').textContent = format(field.estimate, 2);
    const original = format(field.estimate, 2) + ' ' + volumeUnit(field);
    const source = field.source.startsWith('Watkins')
      ? 'Watkins (2000) gives ' + original + ' as the estimate for ' + field.name + ' when production began in ' + field.estimateYear + '.'
      : 'The DTI Brown Book gives ' + original + ' as the estimate for ' + field.name + ' at the end of ' + field.estimateYear + '.';
    const end = Number(yearSlider.max) === 2026 ? 'The records run through August 2026.' : 'The last year of reported oil production was ' + yearSlider.max + '.';
    $('field-source').textContent = source + ' ' + end;
    const archive = $('brownbook-link');
    archive.href = field.archiveUrl || 'https://web.archive.org/web/20030430104345/http://www.dbd-data.co.uk/bb1998/index.htm';
    archive.textContent = field.archiveUrl ? 'DTI Brown Book, field record for ' + field.name : 'DTI Brown Book, 1998 edition';
    $('watkins-link').hash = field.name === 'Tartan' ? 'page=96' : 'page=93';
    updateYear();
  }
  const guessDialog = $('guess');
  function proposedVolume() {
    return field.estimate * Number($('guess-slider').value) / 100;
  }
  function updateGuessLabel() {
    const label = format(proposedVolume(), 2) + ' ' + volumeUnit(field);
    $('guess-out').value = label;
    $('guess-slider').setAttribute('aria-valuetext', label);
  }
  $('try-estimate').addEventListener('click', () => {
    stopPlayback();
    $('guess-prompt').textContent = 'The early estimate for ' + field.name + ' was ' + format(field.estimate, 2) + ' ' + volumeUnit(field) + '. What would you have estimated?';
    $('guess-slider').value = guess ? guess.percent : 100;
    $('reset-guess').hidden = !guess;
    updateGuessLabel();
    guessDialog.showModal();
  });
  $('guess-slider').addEventListener('input', updateGuessLabel);
  $('apply-guess').addEventListener('click', () => {
    guess = {percent: Number($('guess-slider').value), volume: proposedVolume()};
    yearSlider.value = yearSlider.max;
    guessDialog.close(); updateYear();
  });
  $('reset-guess').addEventListener('click', () => {
    guess = null; guessDialog.close(); updateYear();
  });
  $('close-guess').addEventListener('click', () => guessDialog.close());
  function playbackLabel() {
    const label = timer ? 'Pause playback' : 'Play the production history';
    $('play').setAttribute('aria-label', label);
    $('play').title = label;
    $('play').firstElementChild.textContent = timer ? 'Ⅱ' : '▶';
  }
  function stopPlayback() {
    if (timer) window.clearInterval(timer);
    timer = 0;
    playbackLabel();
  }
  $('play').addEventListener('click', () => {
    if (timer) { stopPlayback(); return; }
    if (!stageActive || document.hidden) return;
    if (yearSlider.value === yearSlider.max) yearSlider.value = yearSlider.min;
    updateYear();
    timer = window.setInterval(() => {
      if (!stageActive || document.hidden || mode !== 'field') { stopPlayback(); return; }
      yearSlider.value = Number(yearSlider.value) + 1;
      updateYear();
      if (yearSlider.value === yearSlider.max) stopPlayback();
    }, 260);
    playbackLabel();
  });
  yearSlider.addEventListener('input', () => { stopPlayback(); updateYear(); });
  selected.replaceChildren(...fields.map(row => new Option(row.name, row.name)));
  selected.addEventListener('change', () => selectField(selected.value));
  function scrub(clientX) {
    if (!chartRange) return;
    const px = clientX - curve.getBoundingClientRect().left;
    const t = clamp((px - chartRange.l) / (chartRange.r - chartRange.l), 0, 1);
    yearSlider.value = Math.round(chartRange.start + t * (chartRange.last - chartRange.start));
    updateYear();
  }
  curve.addEventListener('pointerdown', e => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    chartDrag = e.pointerId; curve.setPointerCapture(e.pointerId);
    stopPlayback(); scrub(e.clientX);
  });
  curve.addEventListener('pointermove', e => { if (e.pointerId === chartDrag) scrub(e.clientX); });
  curve.addEventListener('lostpointercapture', () => { chartDrag = null; });
  function setMode(name) {
    stopPlayback();
    mode = name;
    const modelActive = mode === 'model';
    $('model').hidden = !modelActive; $('field').hidden = modelActive;
    $('model-method').hidden = !modelActive; $('field-method').hidden = modelActive;
    modelTab.setAttribute('aria-selected', String(modelActive));
    fieldTab.setAttribute('aria-selected', String(!modelActive));
    modelTab.tabIndex = modelActive ? 0 : -1;
    fieldTab.tabIndex = modelActive ? -1 : 0;
    if (modelActive) rescaleCanvas(); else drawChart();
  }
  modelTab.addEventListener('click', () => setMode('model'));
  fieldTab.addEventListener('click', () => setMode('field'));
  for (const tab of [fieldTab, modelTab]) tab.addEventListener('keydown', e => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
    e.preventDefault(); e.stopPropagation();
    const target = e.key === 'Home' ? modelTab : e.key === 'End' ? fieldTab : tab === fieldTab ? modelTab : fieldTab;
    target.click(); target.focus();
  });
  const dialog = $('method');
  $('open-method').addEventListener('click', () => { stopPlayback(); dialog.showModal(); });
  $('close-method').addEventListener('click', () => dialog.close());
  document.addEventListener('visibilitychange', () => { if (document.hidden) stopPlayback(); });
  window.addEventListener('pagehide', stopPlayback);
  window.addEventListener('message', e => {
    if (e.source !== parent || e.data?.type !== 'stage-active') return;
    stageActive = Boolean(e.data.active);
    if (!stageActive) stopPlayback();
  });
  if (typeof ResizeObserver === 'function') {
    new ResizeObserver(rescaleCanvas).observe($('model-stage'));
    new ResizeObserver(drawChart).observe(curve);
  } else {
    window.addEventListener('resize', () => { rescaleCanvas(); drawChart(); });
  }
  updateModel();
  selectField('Tartan');
  const entry = location.hash.toLowerCase();
  setMode(entry === '#tartan' ? 'field' : 'model');
  if (entry === '#volumes') showTrace(4, false);
}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialiseReserve, {once: true});
} else {
  initialiseReserve();
}
