(() => {
  const $=s=>document.querySelector(s);
  const scenes=[
    {id:'start',k:'FORCE VibeCode Hackathon · Stavanger',h:['Under','havbotnen'],l:'Kan leirstein tette rundt eit røyr? Kor mykje olje får vi opp? Og kor nær er boret neste berglag? Prøv dei tre prosjekta våre frå Stavanger.',by:true,where:'19.–20. november 2026',toc:'Under havbotnen'},
    {id:'leire',k:'Nature’s Plug · Laboratoriet',h:['Når leirstein','kryp'],l:'Rundt eit brønnrøyr kan det stå att ein open spalte. Nokre leirsteinar deformerer seg sakte under trykk og kan lukke spalten.',d:'Flytt tida og sjå når modellen av laboratorieprøva får kontakt med røret. Forskarane observerte kontakt tidlegare i sjølve forsøket.',url:'leire/index.html',where:'Nature’s Plug',toc:'Sjå spalten lukke seg'},
    {id:'fram',k:'Nature’s Plug · Fram',h:['Kvar ville','du leite?'],l:'Vi bygde eit kart med loggar frå 117 brønnar. Det viser kvar vi ville leita etter leirstein som kan tette rundt røret.',d:'I den avslutta leitebrønnen 35/11-7 på Fram peika verktøyet ut 150 meter. Flytt markøren frå utsida til innsida av det grøne feltet og sjå korleis målingane endrar seg. Ein trykktest må til for å vise om det held tett.',url:'leire/index.html#fram',where:'Nature’s Plug',toc:'Les loggen frå Fram'},
    {id:'reserveanslag',k:'Reserveanslag · Volummodellen',h:['Kor mykje','kan vi hente ut?'],l:'Kor tjukt er reservoaret, og kor mykje av olja kan vi hente ut? Eit tidleg anslag må byggje på føresetnader om begge delar.',d:'Endre ein verdi medan du held dei andre faste. Då ser du kva nett den føresetnaden har å seie for anslaget i dette tenkte feltet.',url:'reservar/index.html',where:'Spørsmål frå Christian Hermanrud',toc:'Endre eit reserveanslag'},
    {id:'tartan',k:'Reserveanslag · Britisk sokkel',h:['Kva skjedde','på Tartan?'],l:'Det tidlege anslaget for Tartan var 202 millionar fat olje. Då produksjonen var over, hadde feltet gitt om lag 116 millionar fat.',d:'Vi følgde norske reserveanslag år for år. På britisk sokkel samanlikna vi dei tidlege anslaga med det som kom opp frå 35 felt. Vel eit anna felt og sjå om feilen gjekk same vegen der.',url:'reservar/index.html#tartan',where:'Spørsmål frå Christian Hermanrud',toc:'Samanlikn 35 felt'},
    {id:'geostyring',k:'Geostyring · Simulert borebane',h:['Kor nær er','neste lag?'],l:'På veg gjennom eit reservoar må ein tolke kva som ligg rundt boret. Sonden måler kor vanskeleg det er for elektrisk straum å gå gjennom bergarten.',d:'Flytt sonden eller byt målekanalar. I simuleringa kjenner vi den verkelege laggrensa og kan sjekke avstanden modellen foreslår.',url:'boring/index.html',where:'Spørsmål frå Morten Jakobsen',toc:'Flytt sonden langs borebana'},
    {id:'ekofisk',k:'Geostyring · Ekofisk Z-26',h:['Kva målte','instrumentet?'],l:'På Ekofisk heldt vi tilbake målingar frå instrumentet. Så lét vi modellen anslå dei frå andre kanalar i same brønn.',d:'På 18 274 fot får du velje mellom fysikkmodellen og eit enkelt anslag frå nabokanalane før du ser kva instrumentet målte. Avstanden til den verkelege laggrensa er ukjend.',url:'boring/index.html#ekofisk',where:'Spørsmål frå Morten Jakobsen',toc:'Opne blindtesten på Ekofisk'},
    {id:'stavanger',k:'FORCE VibeCode Hackathon · Stavanger',h:['To dagar','i Stavanger'],l:'Her sit vi framfor seismikkskjermen i Stavanger. Det var utruleg gøy og lærerikt å få bruke to dagar på å byggje og teste idear saman.',d:'Takk til FORCE, Christian Hermanrud og Morten Jakobsen. Etter samlinga arbeidde vi vidare med modellane og laga denne framvisinga.',by:true,where:'19.–20. november 2026',toc:'Frå arbeidsbordet vårt'}
  ];
  const sources=[
    ['Frå hackathonet','FORCE sitt originalinnlegg og bilete','https://www.linkedin.com/feed/update/urn:li:activity:7530928332482232320/','Programmet i Stavanger','https://www.sodir.no/force/events/vibecode-hackathon/','Felles prosjektarkiv frå hackathonet','https://github.com/frheg/hackathon-force'],
    ['Nature’s Plug','Laboratoriet og modellkurva vi har digitalisert · Liu, Xie, Fjær, Bakheim og Stenebråten','https://doi.org/10.1007/s00603-025-04973-z','Lisens for den tilpassa kurva · CC BY 4.0','https://creativecommons.org/licenses/by/4.0/','Brønn 35/11-7 · Sokkeldirektoratet','https://factpages.sodir.no/en/wellbore/PageView/With/WellLogs/1979','Nature’s Plug · kode, data og screeningmetode','https://github.com/jeham3408/natures-plug'],
    ['Reserveanslag','Datagrunnlag, feltutval og metode · Reserve Growth','https://github.com/jeham3408/reserve-growth','Tidlege feltanslag · Watkins, tabell D-1','https://ceepr.mit.edu/wp-content/uploads/2023/02/2000-008.pdf'],
    ['Geostyring','Ekofisk · instrumentdata frå Dylan Loss og ConocoPhillips, NLOD 2.0','https://zenodo.org/records/24133398','Norsk lisens for offentlege data 2.0','https://data.norge.no/nlod/no/2.0']
  ];
  let current=-1,modalOpener=null;
  const aliases={'reserve':'reserveanslag','boring':'geostyring','opning':'start','nature':'leire'};
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
    const projectLinks={fram:['Sjå brønnkartet og kjeldekoden ↗','https://github.com/jeham3408/natures-plug#natures-plug'],tartan:['Sjå analysen av dei norske felta ↗','https://github.com/jeham3408/reserve-growth#what-we-found']};
    const project=projectLinks[scene.id],link=$('#projectLink');if(link){link.hidden=!project;if(project){link.textContent=project[0];link.href=project[1]}}
    if(scene.by){$('#signature').textContent='Fredric Hegland og Jesper Uhre Hammersvik';const sm=document.createElement('small');sm.textContent='19.–20. november 2026';$('#signature').append(sm)}
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
    document.title=index===0?'Under havbotnen · FORCE VibeCode Hackathon':scene.toc+' · Under havbotnen';$('#announcement').textContent='Lysbilete '+(index+1)+' av '+scenes.length+'. '+scene.toc;
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
    $('#dialogtitle').textContent=kind==='toc'?'Innhald':'Kjelder';
    if(kind==='toc'){scenes.forEach((s,i)=>{const button=document.createElement('button');button.className='toc';const n=document.createElement('small');n.textContent=String(i+1).padStart(2,'0');button.append(n,document.createTextNode(s.toc));if(i===current)button.setAttribute('aria-current','step');button.onclick=()=>{dialog.close();navigate(i)};body.append(button)})}
    else{for(const [head,...links] of sources){const h=document.createElement('h3');h.textContent=head;body.append(h);const ul=document.createElement('ul');for(let i=0;i<links.length;i+=2){const a=document.createElement('a'),li=document.createElement('li');a.textContent=links[i];a.href=links[i+1];a.target='_blank';a.rel='noopener';li.append(a);ul.append(li)}body.append(ul)}}
    if(kind==='sources'){const h=document.createElement('h3'),p=document.createElement('p');h.textContent='Det seismiske snittet i opninga';p.textContent='Opningsfiguren er ein syntetisk modell. Laga har ulike akustiske impedansar, og ei forkasting forskyv laga. Refleksjonane er rekna ved normalt innfall med ei 30 Hz Ricker-bølgje. Tidssnittet viser tovegs gangtid i millisekund.';body.append(h,p)}
    if(!dialog.open)dialog.showModal();$('#close').focus();
  }
  $('#dialog').addEventListener('close',()=>{if(modalOpener?.isConnected)modalOpener.focus({preventScroll:true})});
  $('#close').onclick=()=>$('#dialog').close();$('#menu').onclick=()=>openMenu('toc');$('#refs').onclick=()=>openMenu('sources');
  $('#dialog').addEventListener('click',e=>{if(e.target!==$('#dialog'))return;const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close()});
  $('#start').onclick=()=>navigate(1);$('#word').onclick=()=>navigate(0);$('#prev').onclick=()=>navigate(current-1);$('#next').onclick=()=>navigate(current+1);
  async function full(){try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen()}catch{}}
  if(!document.fullscreenEnabled)$('#fs').hidden=true;$('#fs').onclick=full;
  document.addEventListener('fullscreenchange',()=>$('#fs').setAttribute('aria-label',document.fullscreenElement?'Avslutt fullskjerm':'Fullskjerm'));
  window.addEventListener('keydown',e=>{if($('#dialog').open||e.defaultPrevented||e.altKey||e.metaKey||e.ctrlKey||e.shiftKey||e.target.matches('input,select,textarea,[contenteditable=true]'))return;if(['ArrowRight','PageDown','ArrowLeft','PageUp','Home','End'].includes(e.key)){e.preventDefault();navigate(e.key==='Home'?0:e.key==='End'?scenes.length-1:current+(['ArrowRight','PageDown'].includes(e.key)?1:-1))}if(e.key.toLowerCase()==='f')full()});
  // Within a model, sliders and figure rotation keep their own keyboard gestures.
  window.addEventListener('message',e=>{if(e.source!==$('#embedded iframe')?.contentWindow)return;if(e.data?.type==='deck-navigate')navigate(current+(e.data.direction<0?-1:1));if(e.data?.type==='deck-scene'){const index=scenes.findIndex(s=>s.id===e.data.id);if(index!==current&&index>0)navigate(index)}});
  let touch=null;document.addEventListener('touchstart',e=>{if(e.target.closest('canvas,button,a,input,dialog')||e.touches.length!==1)return;const p=e.touches[0];touch=[p.clientX,p.clientY]},{passive:true});
  document.addEventListener('touchend',e=>{if(!touch)return;const p=e.changedTouches[0],dx=p.clientX-touch[0],dy=p.clientY-touch[1];touch=null;if(Math.abs(dx)>45 && Math.abs(dx)>Math.abs(dy)*1.35)navigate(current+(dx<0?1:-1))},{passive:true});document.addEventListener('touchcancel',()=>touch=null);
  window.addEventListener('popstate',route);window.addEventListener('hashchange',route);route();
})();
