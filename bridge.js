(() => {
 if(window.parent===window)return;
 const dest={'tab-lab':'leire','tab-field':'fram','model-tab':'reserveanslag','field-tab':'tartan','to-model':'geostyring','to-field':'ekofisk'};
 const send=o=>parent.postMessage(o,'*');
 document.addEventListener('click',event=>{const id=event.target.closest('button')?.id;if(dest[id])send({type:'deck-scene',id:dest[id]})});
 const local='input,select,textarea,[contenteditable=true],[role=tab],canvas,[role=slider]';
 document.addEventListener('keydown',event=>{
   if(event.defaultPrevented||event.altKey||event.metaKey||event.ctrlKey||event.shiftKey||event.target.closest('dialog[open]')||event.target.closest(local))return;
   if(event.key==='PageDown'||event.key==='PageUp'||event.key==='ArrowRight'||event.key==='ArrowLeft'){
     event.preventDefault();send({type:'deck-navigate',direction:['PageUp','ArrowLeft'].includes(event.key)?-1:1});
   }
 });
 let touch;
 document.addEventListener('touchstart',e=>{touch=null;if(e.touches.length!==1||e.target.closest('canvas,svg,input,select,button,a,dialog'))return;touch=[e.touches[0].clientX,e.touches[0].clientY]},{passive:true});
 document.addEventListener('touchend',e=>{if(!touch)return;const dx=e.changedTouches[0].clientX-touch[0],dy=e.changedTouches[0].clientY-touch[1];touch=null;if(Math.abs(dx)>48&&Math.abs(dx)>Math.abs(dy)*1.45)send({type:'deck-navigate',direction:dx<0?1:-1})},{passive:true});
})();
