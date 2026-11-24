import * as THREE from '../vendor/three.module.js';

function install() {
  const stage=window.BoreStage, container=document.getElementById('volume');
  if(!stage || !container)return;
  const out=document.createElement('canvas');out.className='webgl';out.setAttribute('aria-hidden','true');
  let renderer;
  try {renderer=new THREE.WebGLRenderer({canvas:out,alpha:true,antialias:true,powerPreference:'low-power'});}
  catch{return;}
  container.prepend(out);renderer.setClearColor(0x142322,0);renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));renderer.outputColorSpace=THREE.SRGBColorSpace;
  const scene=new THREE.Scene(), camera=new THREE.OrthographicCamera(-5.3,5.3,2.7,-2.7,.1,80);
  const {pts,spatial:g}=stage;
  const ambient=new THREE.HemisphereLight(0xfff0d4,0x638785,1.77);scene.add(ambient);
  const key=new THREE.DirectionalLight(0xfff2d7,2.25);key.position.set(-3,7,6);scene.add(key);
  const rim=new THREE.DirectionalLight(0x7cc6c2,1.1);rim.position.set(6,3,-4);scene.add(rim);
  const center=new THREE.Vector3(0,0,g.zCenter);
  let randSeed=8193;
  function random(){randSeed=(1664525*randSeed+1013904223)>>>0;return randSeed/4294967296;}
  const lerp=(u,v,r)=>u+(v-u)*r;
  function noise(x,y){
    const hash=(i,j)=>{let h=(Math.imul(i,374761393)+Math.imul(j,668265263))|0;h=Math.imul(h^(h>>>13),1274126177);return ((h^(h>>>16))>>>0)/4294967295;};
    const i=Math.floor(x),j=Math.floor(y);let u=x-i,v=y-j;u=u*u*(3-2*u);v=v*v*(3-2*v);
    return lerp(lerp(hash(i,j),hash(i+1,j),u),lerp(hash(i,j+1),hash(i+1,j+1),u),v);
  }
  function rockTexture(rgb,kind){
    const cv=document.createElement('canvas');cv.width=640;cv.height=200;
    const ctx=cv.getContext('2d'),im=ctx.createImageData(cv.width,cv.height),d=im.data;
    for(let y=0;y<cv.height;y++)for(let x=0;x<cv.width;x++){
      const warp=noise(x/130+kind,y/54),bed=noise(x/76,y/3.0+warp*2),mineral=noise(x/16,y/8);
      const s=(warp-.5)*.22+(bed-.5)*.12+(mineral-.5)*.12+(random()-.5)*.18,ix=4*(y*cv.width+x);
      for(let k=0;k<3;k++)d[ix+k]=Math.min(255,Math.max(0,rgb[k]*(1+s)));d[ix+3]=255;
    }
    ctx.putImageData(im,0,0);
    for(let k=0;k<70;k++){const y=random()*cv.height,x=random()*cv.width;ctx.strokeStyle=kind?'rgba(192,192,142,.11)':'rgba(77,63,48,.12)';ctx.lineWidth=.3+random()*.65;ctx.beginPath();ctx.moveTo(x,y);
      const l=12+random()*140;ctx.bezierCurveTo(x+l*.30,y+2,x+l*.55,y-2,x+l,y+1.5);ctx.stroke();}
    const tex=new THREE.CanvasTexture(cv);tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());return tex;
  }
  function block(bottom,top,color,kind){
    const text=rockTexture(color,kind);
    const material=new THREE.MeshStandardMaterial({map:text,roughness:.93,metalness:0});
    const block=new THREE.Mesh(new THREE.BoxGeometry(g.xLim*2,top-bottom,g.zFront-g.zBack),material);
    block.position.set(0,(bottom+top)/2,(g.zFront+g.zBack)/2);scene.add(block);
  }
  block(0,g.upper,[149,119,85],0);block(g.lower,0,[66,114,107],1);
  const point=(x,y,z)=>new THREE.Vector3(x,y,z);
  function drawLine(points,color,dash=false){
    const mat=dash?new THREE.LineDashedMaterial({color,dashSize:.095,gapSize:.055}):new THREE.LineBasicMaterial({color});
    const l=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),mat);if(dash)l.computeLineDistances();scene.add(l);return l;
  }
  drawLine([point(-g.xLim,0,g.zBack),point(-g.xLim,0,.007),point(g.xLim,0,.007),point(g.xLim,0,g.zBack)],0xffcc8e);
  const start=point(pts[0].x,pts[0].y,pts[0].z),end=point(pts.at(-1).x,pts.at(-1).y,pts.at(-1).z);
  drawLine([start,end],0xe6edda,true);
  const trailMaterial=new THREE.MeshStandardMaterial({color:0x44564e,metalness:.52,roughness:.53});
  const trail=new THREE.Mesh(new THREE.CylinderGeometry(.032,.032,1,8,1),trailMaterial);scene.add(trail);
  const trace=drawLine([start.clone().add(point(0,.018,.026)),start.clone().add(point(.001,.018,.026))],0xffe9ad);
  const connector=drawLine([point(0,1,.14),point(0,0,.14)],0xdffff1,true);
  const tool=new THREE.Group();tool.rotation.z=stage.az();scene.add(tool);
  const mat=(color,metalness,roughness)=>new THREE.MeshStandardMaterial({color,metalness,roughness});
  const steel=mat(0x95a49c,.76,.36), graphite=mat(0x27352f,.48,.46), gold=mat(0xc68c45,.51,.38), turquoise=mat(0x73d8c2,.36,.33);
  const addSleeve=(left,right,ra,rb,material)=>{
    const mesh=new THREE.Mesh(new THREE.CylinderGeometry(rb,ra,right-left,28,1),material);mesh.rotation.z=-Math.PI/2;mesh.position.x=(left+right)/2;tool.add(mesh);return mesh;
  };
  addSleeve(-.69,.62,.079,.079,steel);addSleeve(-.77,-.61,.051,.081,graphite);addSleeve(.51,.66,.1,.095,gold);addSleeve(.66,.74,.095,.032,gold);
  for(const x of [-.53,-.45,-.13,.13,.31])addSleeve(x,x+.034,.083,.083,graphite);
  addSleeve(-.027,.027,.087,.087,turquoise);
  const axis=point(0,1,0);let previous=-1,prevW=0,prevH=0;
  const between=(mesh,a,b)=>{const dir=b.clone().sub(a);mesh.visible=dir.length()>.01;
    if(mesh.visible){mesh.position.copy(a).addScaledVector(dir,.5);mesh.scale.y=dir.length();mesh.quaternion.setFromUnitVectors(axis,dir.normalize());}};
  function draw(state,width,height){
    if(!width||!height)return;
    if(width!==prevW||height!==prevH){renderer.setSize(width,height,false);prevW=width;prevH=height;}
    const k=Math.min(width/10.35,height/5.45)*state.zoom;
    camera.left=-width/2/k;camera.right=width/2/k;camera.top=height*.49/k;camera.bottom=-height*.51/k;
    const at=stage.focus();center.set(at.x,at.y,at.z);
    const co=Math.cos(state.pitch);camera.position.set(center.x+18*co*Math.sin(state.yaw),center.y+18*Math.sin(state.pitch),center.z+18*co*Math.cos(state.yaw));camera.lookAt(center);camera.updateProjectionMatrix();
    if(state.index!==previous){
      const a=pts[state.index],b=point(a.x,a.y,a.z);tool.position.set(a.x,a.y,.17);
      between(trail,start,b);
      const t=trace.geometry.attributes.position;t.setXYZ(1,a.x,a.y+.018,a.z+.026);t.needsUpdate=true;trace.geometry.computeBoundingSphere();
      const arr=connector.geometry.attributes.position;arr.setXYZ(0,a.x,a.y,.16);arr.setXYZ(1,a.x,0,.16);arr.needsUpdate=true;connector.computeLineDistances();connector.geometry.computeBoundingSphere();previous=state.index;
    }
    renderer.render(scene,camera);
  }
  out.addEventListener('webglcontextlost',e=>{e.preventDefault();stage.fallback();out.hidden=true;});
  stage.register({draw});
}
if(window.BoreStage)install();else document.addEventListener('DOMContentLoaded',install,{once:true});
