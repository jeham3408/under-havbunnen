(() => {
  const $=s=>document.querySelector(s);
  const scenes=[
    {id:'start',k:'FORCE VibeCode Hackathon · Stavanger',h:['Beneath','the seabed'],l:'Can shale seal a well? How much oil will a field produce? And how close is the drill bit to the next layer of rock? Try the three projects we built in Stavanger.',by:true,where:'19–20 November 2026',toc:'Beneath the seabed'},
    {id:'leire',k:'Nature’s Plug · Lab experiment',h:['When shale','creeps'],l:'There can be a gap between a well’s steel casing and the surrounding rock. Under pressure, some shales slowly deform and can close that gap.',d:'Run the lab clock until the model gap closes. The researchers observed contact almost ten days earlier. Open Physics to see how readily fluid could still pass after contact.',url:'leire/index.html?v=42b6ce793b',where:'Nature’s Plug',toc:'Watch the gap close'},
    {id:'fram',k:'Nature’s Plug · Fram field',h:['Where would','you look?'],l:'We built a map using logs from 117 wells to look for places where shale might seal against the casing.',d:'The map flagged a 150-metre interval in well 35/11-7. Move into the green band and open Physics to explore the pressure estimate. A well test would be needed to establish whether this interval held pressure.',url:'leire/index.html?v=42b6ce793b#fram',where:'Nature’s Plug',toc:'Explore the Fram well logs'},
    {id:'reserveanslag',k:'Reserve estimates · Volumetric model',h:['How much oil','can we recover?'],l:'An early reserve estimate depends on how much oil is in the rock and how much of it we can bring to the surface.',d:'Select a volume beneath the block to follow the oil from pore space to stock tank. Now raise the recovery factor. Which step changes?',url:'reservar/index.html?v=8e75daf701',where:'A question from Christian Hermanrud',toc:'Build a reserve estimate'},
    {id:'tartan',k:'Reserve estimates · UK Continental Shelf',h:['What happened','at Tartan?'],l:'The early estimate for Tartan was 202 million barrels of oil. By the time production ended, the field had produced about 116 million.',d:'We tracked Norwegian reserve estimates year by year. For 35 UK fields, we could also compare early estimates with final production. Pick another field to see whether its estimate was high or low.',url:'reservar/index.html?v=8e75daf701#tartan',where:'A question from Christian Hermanrud',toc:'Compare 35 UK oil fields'},
    {id:'maxwell',k:'Geosteering · Maxwell’s equations',h:['Why does the','signal fade?'],l:'The transmitter coil creates a changing magnetic field that drives electric currents in the rock. Two receiver coils measure how much the signal changes in strength and timing between them.',d:'Move the rock boundary past the tool. Watch the phase lag in degrees and the signal loss in decibels. Under Uniform-rock signal, press play and compare 400 kHz with 2 MHz.',url:'boring/index.html?v=0b4935cec0#physics',where:'Electromagnetic induction',toc:'See the physics of the resistivity tool'},
    {id:'geostyring',k:'Geosteering · Simulated well',h:['How close is','the next layer?'],l:'Two rock layers can conduct electricity differently. Can we use the signals at the receivers to tell how far the tool is from the boundary?',d:'Move the tool along the well or change the measurement frequency. We know where the layer boundary is in the simulation, so we can check the distance the model estimates.',url:'boring/index.html?v=0b4935cec0',where:'A question from Morten Jakobsen',toc:'Move the tool along the well'},
    {id:'ekofisk',k:'Geosteering · Ekofisk Z-26',h:['What did the','tool measure?'],l:'We hid a set of readings from an Ekofisk well and asked the model to estimate them from other channels on the same tool.',d:'At 18,274 ft along the well, choose between the physics model and a simple estimate from neighbouring channels. Then reveal the reading. The actual distance to the layer boundary at this depth is unknown.',url:'boring/index.html?v=0b4935cec0#ekofisk',where:'A question from Morten Jakobsen',toc:'Try the Ekofisk blind test'},
    {id:'stavanger',k:'FORCE VibeCode Hackathon · Stavanger',h:['Two days','in Stavanger'],l:'That’s us at our table in Stavanger, with a seismic section on the screen behind us. We had a great time building together and testing our ideas against well data.',d:'Thanks to FORCE for bringing us together, and to Christian Hermanrud and Morten Jakobsen for their questions. After the hackathon we continued working on the models so you could try them here.',by:true,where:'19–20 November 2026',toc:'Our workbench in Stavanger'}
  ];
  const sources=[
    ['The hackathon','FORCE’s original post and photographs','https://www.linkedin.com/feed/update/urn:li:activity:7530928332482232320/','Event programme','https://www.sodir.no/force/events/vibecode-hackathon/','Projects from the hackathon','https://github.com/frheg/hackathon-force'],
    ['Nature’s Plug','Shale experiment and digitised model curve · Liu, Xie, Fjær, Bakheim and Stenebråten','https://doi.org/10.1007/s00603-025-04973-z','Licence for the adapted curve · CC BY 4.0','https://creativecommons.org/licenses/by/4.0/','Well 35/11-7 · Norwegian Offshore Directorate','https://factpages.sodir.no/en/wellbore/PageView/With/WellLogs/1979','Nature’s Plug · source code, data and screening method','https://github.com/jeham3408/natures-plug'],
    ['Reserve estimates','Data, field selection and method · Reserve Growth','https://github.com/jeham3408/reserve-growth','Early field estimates · Watkins, Table D-1','https://ceepr.mit.edu/wp-content/uploads/2023/02/2000-008.pdf#page=96'],
    ['Geosteering','The electromagnetic forward solver · empymod','https://empymod.emsig.xyz/en/stable/','Why a field attenuates in conductive rock · Electromagnetic Geophysics','https://em.geosci.xyz/content/maxwell1_fundamentals/harmonic_planewaves_homogeneous/skindepth.html','Ekofisk tool measurements · Dylan Loss and ConocoPhillips, NLOD 2.0','https://zenodo.org/records/24133398','Norwegian Licence for Open Government Data 2.0','https://data.norge.no/nlod/no/2.0']
  ];
  let current=-1,modalOpener=null;
  const aliases={'reserve':'reserveanslag','boring':'geostyring','opning':'start','nature':'leire','physics':'maxwell'};
  const offline=new Map;
  function stageURL(url){
    if(!window.OFFLINE_MODULES)return url;
    const [path,hash]=url.split('#'),key=path.split('/')[0];
    if(!offline.has(key)){
      const bytes=Uint8Array.from(atob(window.OFFLINE_MODULES[key]),c=>c.charCodeAt(0));
      offline.set(key,URL.createObjectURL(new Blob([bytes],{type:'text/html;charset=utf-8'})));
    }
    return offline.get(key)+(hash?'#'+hash:'');
  }
  function show(index,focus=false) {
    if(index<0||index>=scenes.length||index===current)return;
    const scene=scenes[index],old=$('#embedded iframe');
    if(old){old.contentWindow?.postMessage({type:'stage-active',active:false},'*');old.remove()}
    current=index;document.body.className=index===0?'cover':index===scenes.length-1?'closing':'chapter';
    $('#kicker').textContent=scene.k;$('#title').replaceChildren(...scene.h.map(t=>{const el=document.createElement('span');el.textContent=t;return el}));
    $('#lead').textContent=scene.l;$('#detail').textContent=scene.d||'';
    $('#signature').replaceChildren();
    const projectLinks={fram:['View the well map and source code ↗','https://github.com/jeham3408/natures-plug#natures-plug'],tartan:['Explore the Norwegian field analysis ↗','https://github.com/jeham3408/reserve-growth#what-we-found']};
    const project=projectLinks[scene.id],link=$('#projectLink');if(link){link.hidden=!project;if(project){link.textContent=project[0];link.href=project[1]}}
    if(scene.by){$('#signature').textContent='Fredric Hegland and Jesper Uhre Hammersvik';const sm=document.createElement('small');sm.textContent='19–20 November 2026';$('#signature').append(sm)}
    $('#start').hidden=index!==0;$('#hero').hidden=index!==0;$('#credits').hidden=index!==scenes.length-1;$('#embedded').hidden=!scene.url;if($('#loading'))$('#loading').hidden=!scene.url;$('#embedded').setAttribute('aria-busy',String(Boolean(scene.url)));
    if(scene.url){
      const f=document.createElement('iframe');f.title=scene.toc;f.style.visibility='hidden';f.addEventListener('load',()=>{if(f!==document.querySelector('#embedded iframe'))return;f.style.visibility='visible';$('#embedded').setAttribute('aria-busy','false');if($('#loading'))$('#loading').hidden=true;});f.src=stageURL(scene.url);
      $('#embedded').append(f);
    }
    $('#footerlabel').textContent=scene.where;$('#number').textContent=(index+1)+' / '+scenes.length;
    $('#rail').replaceChildren(...scenes.map((_,i)=>{const e=document.createElement('i');e.className=i===index?'current':i<index?'seen':'';return e}));
    $('#prev').disabled=index===0;$('#next').disabled=index===scenes.length-1;
    const art=$('article');art.classList.remove('changed');void art.offsetWidth;art.classList.add('changed');
    if(focus){$('#title').focus({preventScroll:true});window.scrollTo({top:0,behavior:'instant'})}
    document.title=index===0?'Beneath the seabed · FORCE VibeCode Hackathon':scene.toc+' · Beneath the seabed';$('#announcement').textContent='Slide '+(index+1)+' of '+scenes.length+'. '+scene.toc;
    window.dispatchEvent(new Event('scene-shown'));
  }
  function navigate(index){
    if(index<0||index>=scenes.length)return;
    if(location.hash!=='#'+scenes[index].id)history.pushState(null,'','#'+scenes[index].id);
    show(index,true);
  }
  function route(){const h=decodeURIComponent(location.hash.slice(1));const i=scenes.findIndex(s=>s.id===(aliases[h]||h));show(i<0?0:i);if(h==='kjelder')openMenu('sources')}
  function openMenu(kind){
    modalOpener=document.activeElement;const dialog=$('#dialog'),body=$('#dialogbody');body.replaceChildren();
    $('#dialogtitle').textContent=kind==='toc'?'Contents':'Sources';
    if(kind==='toc'){scenes.forEach((s,i)=>{const button=document.createElement('button');button.className='toc';const n=document.createElement('small');n.textContent=String(i+1).padStart(2,'0');button.append(n,document.createTextNode(s.toc));if(i===current)button.setAttribute('aria-current','step');button.onclick=()=>{dialog.close();navigate(i)};body.append(button)})}
    else{for(const [head,...links] of sources){const h=document.createElement('h3');h.textContent=head;body.append(h);const ul=document.createElement('ul');for(let i=0;i<links.length;i+=2){const a=document.createElement('a'),li=document.createElement('li');a.textContent=links[i];a.href=links[i+1];a.target='_blank';a.rel='noopener';li.append(a);ul.append(li)}body.append(ul)}}
    if(kind==='sources'){const h=document.createElement('h3'),p=document.createElement('p');h.textContent='The opening seismic model';p.textContent='The opening figure is synthetic. A fault offsets layers with different acoustic impedances. At each interface the normal-incidence reflection coefficient is R = (Z₂ − Z₁)/(Z₂ + Z₁), where Z is acoustic impedance. Each coefficient scales a 30 Hz Ricker wavelet. Their sum gives the synthetic trace at that position. The time slice shows two-way travel time in milliseconds.';body.append(h,p)}
    if(!dialog.open)dialog.showModal();$('#close').focus();
  }
  $('#dialog').addEventListener('close',()=>{if(modalOpener?.isConnected)modalOpener.focus({preventScroll:true})});
  $('#close').onclick=()=>$('#dialog').close();$('#menu').onclick=()=>openMenu('toc');$('#refs').onclick=()=>openMenu('sources');
  $('#dialog').addEventListener('click',e=>{if(e.target!==$('#dialog'))return;const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close()});
  $('#start').onclick=()=>navigate(1);$('#word').onclick=()=>navigate(0);$('#prev').onclick=()=>navigate(current-1);$('#next').onclick=()=>navigate(current+1);
  async function full(){try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen()}catch{}}
  if(!document.fullscreenEnabled)$('#fs').hidden=true;$('#fs').onclick=full;
  document.addEventListener('fullscreenchange',()=>$('#fs').setAttribute('aria-label',document.fullscreenElement?'Exit full screen':'Full screen'));
  window.addEventListener('keydown',e=>{if($('#dialog').open||e.defaultPrevented||e.altKey||e.metaKey||e.ctrlKey||e.shiftKey||e.target.matches('input,select,textarea,[contenteditable=true]'))return;if(['ArrowRight','PageDown','ArrowLeft','PageUp','Home','End'].includes(e.key)){e.preventDefault();navigate(e.key==='Home'?0:e.key==='End'?scenes.length-1:current+(['ArrowRight','PageDown'].includes(e.key)?1:-1))}if(e.key.toLowerCase()==='f')full()});
  // Within a model, sliders and figure rotation keep their own keyboard gestures.
  window.addEventListener('message',e=>{if(e.source!==$('#embedded iframe')?.contentWindow)return;if(e.data?.type==='deck-navigate')navigate(current+(e.data.direction<0?-1:1));if(e.data?.type==='deck-scene'){const index=scenes.findIndex(s=>s.id===e.data.id);if(index!==current&&index>0)navigate(index)}});
  let touch=null;document.addEventListener('touchstart',e=>{if(e.target.closest('canvas,button,a,input,dialog')||e.touches.length!==1)return;const p=e.touches[0];touch=[p.clientX,p.clientY]},{passive:true});
  document.addEventListener('touchend',e=>{if(!touch)return;const p=e.changedTouches[0],dx=p.clientX-touch[0],dy=p.clientY-touch[1];touch=null;if(Math.abs(dx)>45 && Math.abs(dx)>Math.abs(dy)*1.35)navigate(current+(dx<0?1:-1))},{passive:true});document.addEventListener('touchcancel',()=>touch=null);
  window.addEventListener('popstate',route);window.addEventListener('hashchange',route);route();
})();
