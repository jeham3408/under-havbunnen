(() => {
  const canvas = document.querySelector('#rock');
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const slider = document.querySelector('#slice');
  const table = document.querySelector('#sliceValue');
  const wave = t => { const s = Math.PI * 30 * t / 1000; return (1 - 2 * s * s) * Math.exp(-s*s); };
  const wavelets = Array.from({length:141}, (_, i) => wave(i - 70));
  // Impedance steps in relative units. The plotted wavefield is normal incidence
  // reflectivity convolved with a zero-phase 30 Hz Ricker wavelet.
  const impedance = [3.2,4.7,3.8,5.8,4.4,6.3,5.1,7.4,6.1,8.3,6.5,9.4,8.0,10.1,8.4,10.7];
  const reflectivity = impedance.slice(1).map((z,i) => (z-impedance[i])/(z+impedance[i]));
  const n = 160, timeSamples = 224, bottom = 530;
  const horizons = new Float32Array(n*n*reflectivity.length);
  for(let j=0;j<n;j++) for(let i=0;i<n;i++){
    const x = i/(n-1), y = j/(n-1), o=(j*n+i)*reflectivity.length;
    const fault = x > .52 + .16*(y-.5) ? 23 : 0;
    for(let k=0;k<reflectivity.length;k++){
      const fold = (25+k*.45)*Math.sin(2*Math.PI*(x*.60+y*.19)+k*.028) + 20*Math.sin(2*Math.PI*(y*.59-x*.21)) + 11*(y-.5);
      horizons[o+k] = 87+k*29.6 + fold + fault;
    }
  }
  function amplitude(x,y,t) {
    const o=(Math.round(y*(n-1))*n+Math.round(x*(n-1)))*reflectivity.length;
    let v=0;
    for(let k=0;k<reflectivity.length;k++){
      const d=Math.round(t-horizons[o+k]);
      if(d >= -70 && d <=70) v+=reflectivity[k]*wavelets[d+70];
    }
    return v;
  }
  const neutral=[83,103,96], positive=[250,213,154], negative=[16,33,37];
  const palette=Array.from({length:511},(_,p)=>{
    const v=(p-255)/255, f=Math.pow(Math.min(1,Math.abs(v)),.75), from=v<0?negative:positive;
    return neutral.map((a,i)=>Math.round(a+(from[i]-a)*f));
  });
  function texture(w,h,sample) {
    const tile=document.createElement('canvas');tile.width=w;tile.height=h;
    const tc=tile.getContext('2d'), img=tc.createImageData(w,h);
    for(let j=0;j<h;j++) for(let i=0;i<w;i++){
      const a=sample(i/(w-1),j/(h-1));
      const index=Math.round(255+255*Math.max(-1,Math.min(1,a/.26)));
      const p=palette[index], o=4*(j*w+i);
      img.data[o]=p[0];img.data[o+1]=p[1];img.data[o+2]=p[2];img.data[o+3]=255;
    }tc.putImageData(img,0,0);return tile;
  }
  const sides=[(u,t)=>amplitude(u,0,t),(u,t)=>amplitude(1,u,t),(u,t)=>amplitude(1-u,1,t),(u,t)=>amplitude(0,1-u,t)].map(sample =>texture(n,timeSamples,(u,v)=>sample(u,80+v*(bottom-80))));
  let time=+slider.value, topTexture, yaw=-.67,pitch=.49;
  let w=1,h=1,scale=1,cx=0,cy=0;
  function project(x,y,z){
    const across=x*Math.cos(yaw)-y*Math.sin(yaw), back=x*Math.sin(yaw)+y*Math.cos(yaw);
    return [cx+scale*across,cy+scale*(back*Math.sin(pitch)+z*Math.cos(pitch))];
  }
  const corners=[[-1,-.83],[1,-.83],[1,.83],[-1,.83]];
  function flat(tex,a,b,d,shade=0,sy=0){
    const c=[b[0]+d[0]-a[0],b[1]+d[1]-a[1]];
    ctx.save();ctx.beginPath();ctx.moveTo(...a);ctx.lineTo(...b);ctx.lineTo(...c);ctx.lineTo(...d);ctx.closePath();ctx.clip();
    ctx.save();ctx.transform((b[0]-a[0])/tex.width,(b[1]-a[1])/tex.width,(d[0]-a[0])/(tex.height-sy),(d[1]-a[1])/(tex.height-sy),a[0],a[1]);ctx.drawImage(tex,0,-sy);ctx.restore();
    if(shade){ctx.fillStyle='rgba(8,25,23,'+shade+')';ctx.fillRect(0,0,w,h)}ctx.restore();
    ctx.beginPath();ctx.moveTo(...a);ctx.lineTo(...b);ctx.lineTo(...c);ctx.lineTo(...d);ctx.closePath();ctx.strokeStyle='rgba(189,212,189,.36)';ctx.lineWidth=.8;ctx.stroke();
  }
  function paint(){
    if(!w || !h || !topTexture || document.querySelector('#hero').hidden) return;
    ctx.clearRect(0,0,w,h);
    const z=(time-80)/(bottom-80)*1.35, top=-.68+z, bot=.67;
    scale=Math.min(w/3.19,h/2.64);cx=w*.5;cy=h*.55;
    const t=corners.map(([x,y])=>project(x,y,top)),b=corners.map(([x,y])=>project(x,y,bot));
    const order=corners.map(([x,y],i)=>{const [xx,yy]=corners[(i+1)%4];return {i,d:(x+xx)*Math.sin(yaw)+(y+yy)*Math.cos(yaw)}}).filter(e=>e.d>0).sort((a,b)=>a.d-b.d);
    // Shallow guide maintains the original top of the volume as the cut descends.
    ctx.save();ctx.setLineDash([3,6]);ctx.strokeStyle='rgba(182,215,197,.3)';
    const orig=corners.map(([x,y])=>project(x,y,-.68));
    ctx.beginPath();orig.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.closePath();ctx.stroke();
    orig.forEach((p,i)=>{ctx.beginPath();ctx.moveTo(...p);ctx.lineTo(...t[i]);ctx.stroke()});ctx.restore();
    for(const {i} of order){const j=(i+1)%4;flat(sides[i],t[i],t[j],b[i],i%2?.12:.03,(time-80)/(bottom-80)*(timeSamples-1));}
    flat(topTexture,t[0],t[1],t[3]);
    ctx.beginPath();ctx.moveTo(...t[0]);t.slice(1).forEach(p=>ctx.lineTo(...p));ctx.closePath();ctx.strokeStyle='#a7dcbd';ctx.lineWidth=1.4;ctx.stroke();
    // Locate the fault on the exposed inline face. Its apparent offset is
    // 23 ms in this synthetic time section; no depth conversion is assumed.
    const sign=Math.cos(yaw)>=0?1:-1;
    if(Math.abs(Math.cos(yaw))>.4){
      const faultX=2*(.52+.08*sign)-1, markT=Math.max(340,time+55);
      const mid=project(faultX,.83*sign,-.68+1.35*(markT-80)/(bottom-80));
      const size=w<490?10:12, dx=mid[0]>w*.56?-1:1;
      const ax=mid[0]+dx*(w<490?19:32),ay=mid[1]+(w<490?14:23);
      ctx.font='500 '+size+'px Inter, Arial, sans-serif';
      const word='Fault',tw=ctx.measureText(word).width,px=dx<0?ax-tw-10:ax;
      ctx.strokeStyle='#f1d397';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(...mid);ctx.lineTo(ax,ay);ctx.stroke();
      ctx.fillStyle='#fedda0';ctx.beginPath();ctx.arc(...mid,2.2,0,2*Math.PI);ctx.fill();
      ctx.fillStyle='#13231fe8';ctx.fillRect(px,ay-9,tw+10,size+8);ctx.fillStyle='#fae5bf';ctx.textAlign='left';ctx.textBaseline='middle';ctx.fillText(word,px+5,ay-4+(size+3)/2);ctx.textBaseline='alphabetic';
    }
  }
  function refresh(){
    time=+slider.value;table.value=time+' ms';table.textContent=table.value;
    slider.setAttribute('aria-valuetext',time+' milliseconds two-way travel time');
    topTexture=texture(n,n,(u,v)=>amplitude(u,v,time));paint();
  }
  let update=0;slider.addEventListener('input',()=>{cancelAnimationFrame(update);update=requestAnimationFrame(refresh)});
  const size=()=>{const box=canvas.getBoundingClientRect();if(!box.width||!box.height)return;const d=Math.min(2,devicePixelRatio||1);w=box.width;h=box.height;canvas.width=Math.round(w*d);canvas.height=Math.round(h*d);ctx.setTransform(d,0,0,d,0,0);paint()};
  let drag=null;canvas.addEventListener('pointerdown',e=>{drag=[e.clientX,e.clientY];canvas.setPointerCapture(e.pointerId)});
  canvas.addEventListener('pointermove',e=>{if(!drag)return;yaw+=(e.clientX-drag[0])*.008;pitch=Math.max(.15,Math.min(1.04,pitch+(e.clientY-drag[1])*.006));drag=[e.clientX,e.clientY];paint()});
  for(const ev of ['pointercancel','pointerup','lostpointercapture'])canvas.addEventListener(ev,()=>drag=null);
  canvas.addEventListener('keydown',e=>{const delta={ArrowLeft:[-.1,0],ArrowRight:[.1,0],ArrowUp:[0,.07],ArrowDown:[0,-.07]}[e.key];if(delta){e.preventDefault();e.stopPropagation();yaw+=delta[0];pitch=Math.max(.15,Math.min(1.04,pitch+delta[1]));paint()}});
  new ResizeObserver(size).observe(canvas);window.addEventListener('scene-shown',size);refresh();size();
})();
