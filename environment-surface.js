'use strict';
function sharedSurfaceMountainHeight(a,layer=0){
  const p=layer*.73;
  const broad=6.8*Math.pow(Math.abs(Math.sin(a*4+p+.35)),2.0);
  const peaks=11.5*Math.pow(Math.abs(Math.sin(a*9-p*.7+1.15)),5.0);
  const teeth=6.2*Math.pow(Math.abs(Math.sin(a*19+p*.45+.55)),7.5);
  const crags=3.4*Math.pow(Math.abs(Math.sin(a*33-p*.3+2.1)),10);
  return 4.8+broad+peaks+teeth+crags;
}
let sharedSurfaceHorizonCache=null;
function sharedSurfaceHorizonSamples(){
  if(sharedSurfaceHorizonCache)return sharedSurfaceHorizonCache;
  const steps=300;
  sharedSurfaceHorizonCache=[0,1].map(layer=>{
    const samples=[];
    for(let i=0;i<=steps;i++){
      const a=-Math.PI+i*Math.PI*2/steps;
      samples.push({sa:Math.sin(a),ca:Math.cos(a),h:sharedSurfaceMountainHeight(a,layer)})
    }
    return samples
  });
  return sharedSurfaceHorizonCache
}
function drawSharedSurfaceHorizon(floor=-3.5,far=380,alpha=1,ridgeCol=C.gd,baseCol=C.g,floorAt=null,heightScale=1){
  const cached=sharedSurfaceHorizonSamples();
  const drawLayer=(layer)=>{
    const radius=far*(layer?1.10:1),scale=layer?.70:1,samples=cached[layer];
    let peaks=[],bases=[];
    const flush=()=>{
      if(peaks.length<2){peaks=[];bases=[];return}
      const poly=peaks.concat([...bases].reverse());
      fillPoly(poly);
      for(let j=1;j<peaks.length;j++){
        line(peaks[j-1].x,peaks[j-1].y,peaks[j].x,peaks[j].y,ridgeCol,layer?.72:.98,layer?.42*alpha:.82*alpha);
      }
      if(!layer){
        for(let j=1;j<bases.length;j++){
          line(bases[j-1].x,bases[j-1].y,bases[j].x,bases[j].y,baseCol,.82,.34*alpha);
        }
      }
      peaks=[];bases=[];
    };
    for(const s of samples){
      const x=shipX+s.sa*radius,z=s.ca*radius,h=s.h*scale*heightScale;
      // Free-flight terrain can supply the actual ground height beneath each
      // horizon sample.  This makes the mountain foot join the rolling land
      // instead of sitting on a separate flat datum.
      const baseY=typeof floorAt==='function'?floorAt(x,travel+z):floor;
      const b=proj([x,baseY,z]),pk=proj([x,baseY+h,z]);
      if(!(b&&pk)){flush();continue}
      peaks.push(pk);bases.push(b);
    }
    flush();
  };
  drawLayer(1);
  drawLayer(0);
}

function drawFreeFlightMountainSkyline(floor=-3.5,far=780,ridgeCol=C.o,heightScale=1.58){
  // Ambient mode uses one unbroken mountain silhouette as the permanent boundary
  // between sky and land.  Fill everything beneath that screen-space silhouette
  // black so stars can never leak through canyon floors, terrain gaps or LOD edges.
  const focal=Math.min(W,viewH)*1.09;
  const halfSpan=Math.min(1.40,Math.atan((W*.78)/Math.max(1,focal))+.20);
  const steps=240,peaks=[];
  for(let i=0;i<=steps;i++){
    const a=viewYaw-halfSpan+(halfSpan*2*i/steps);
    const x=shipX+Math.sin(a)*far,z=Math.cos(a)*far;
    const h=sharedSurfaceMountainHeight(a,0)*heightScale;
    const pk=proj([x,floor+h,z]);
    if(pk)peaks.push(pk)
  }
  if(peaks.length<2)return;

  // The sampled span intentionally projects beyond both screen edges.  Extend the
  // mask even farther down so bank/pitch cannot expose a corner of the starfield.
  ctx.save();
  ctx.globalAlpha=1;ctx.fillStyle='#000';ctx.beginPath();
  ctx.moveTo(peaks[0].x,peaks[0].y);
  for(let i=1;i<peaks.length;i++)ctx.lineTo(peaks[i].x,peaks[i].y);
  ctx.lineTo(peaks[peaks.length-1].x,viewH+80);
  ctx.lineTo(peaks[0].x,viewH+80);
  ctx.closePath();ctx.fill();

  // Only the actual mountain crest is visible: no second mountain layer and no
  // separate base/horizon line to break across canyons.
  ctx.globalAlpha=.86;ctx.strokeStyle=ridgeCol;ctx.lineWidth=VECTOR_LINE_WIDTH;
  ctx.lineJoin='round';ctx.lineCap='round';ctx.beginPath();
  ctx.moveTo(peaks[0].x,peaks[0].y);
  for(let i=1;i<peaks.length;i++)ctx.lineTo(peaks[i].x,peaks[i].y);
  ctx.stroke();ctx.restore()
}

// Draw a straight, evenly sampled line on the flat plains using exactly the same
// first/last near-plane samples as the old per-point loop. Perspective preserves a
// 3-D straight line as a screen-space straight line, so projecting the two surviving
// endpoints produces the same visible grid geometry without projecting every 8-unit
// intermediate sample.
function drawFlatSampledGridLine(a,b,segments,near=.18){
  if(segments<1)return false;
  const qa=camPoint(a),qb=camPoint(b),dz=(qb[2]-qa[2])/segments;
  let first=0,last=segments;
  if(Math.abs(dz)<1e-12){
    if(qa[2]<=near)return false
  }else if(dz>0){
    if(qb[2]<=near)return false;
    if(qa[2]<=near)first=Math.max(0,Math.floor((near-qa[2])/dz)+1)
  }else{
    if(qa[2]<=near)return false;
    if(qb[2]<=near)last=Math.min(segments,Math.ceil((near-qa[2])/dz)-1)
  }
  if(last<=first)return false;
  const inv=1/segments;
  const q0=[
    qa[0]+(qb[0]-qa[0])*(first*inv),
    qa[1]+(qb[1]-qa[1])*(first*inv),
    qa[2]+(qb[2]-qa[2])*(first*inv)
  ];
  const q1=[
    qa[0]+(qb[0]-qa[0])*(last*inv),
    qa[1]+(qb[1]-qa[1])*(last*inv),
    qa[2]+(qb[2]-qa[2])*(last*inv)
  ];
  const p0=projectCam(q0),p1=projectCam(q1);if(!(p0&&p1))return false;
  ctx.moveTo(p0.x,p0.y);ctx.lineTo(p1.x,p1.y);return true
}

class SurfaceDestinationApproachController {
  constructor(){this.reset()}
  reset(){
    this.active=false;this.stage=null;this.terrain='plains';this.destination='city';this.scenery='forest';
    this.groundY=-3.50;this.routeLength=430;this.targetWorldZ=430;this.targetX=0;
    this.speed=22.0;this.navPulse=0;this.seed=0x504c4149;this.trees=[];this.skyline=[];this.forestBands=[];this.forestFront=[];this.treeHitCD=0;
    this.visibleTrees=[];this.visibleForestFront=[];
    this.baseCache=new WeakMap();this.finishing=false;this.finishT=0;this.entryRadius=36;
    this.lastHandoff=null;this.manualComplete=false;this.freeFlight=false;
    this.freeFlightChunkSize=96;this.freeFlightChunkRadius=5;this.freeFlightChunkX=NaN;this.freeFlightChunkZ=NaN;this.freeFlightChunks=new Map();this.freeFlightTerrainZero=0;this.freeFlightColourIndex=0;this.freeFlightStarsWhite=true;this.freeFlightSpeedMin=25;this.freeFlightSpeedMax=40;
    this.freeFlightAutoT=0;this.freeFlightAutoYawRate=0;this.freeFlightAutoSpeed=32.5;this.freeFlightAutoClearance=6.5;this.freeFlightAutoSweepSign=1;this.freeFlightTurnBalance=0
  }
  rand(){this.seed=(Math.imul(this.seed,1664525)+1013904223)>>>0;return this.seed/4294967296}
  // Shared surface-object mechanism. Environments and missions submit discrete
  // world objects here; the compositor owns their far-to-near ordering.
  appendWorldObject(scene,{x=0,y=0,worldZ=0,draw,minDepth=.18,maxDepth=Infinity,sortBias=0}={}){
    if(!Array.isArray(scene)||typeof draw!=='function')return false;
    const d=camPoint([x,y,worldZ-travel])[2];
    if(!(d>minDepth&&d<=maxDepth))return false;
    scene.push({z:d+sortBias,draw});return true
  }
  drawObjectScene(scene){
    if(!Array.isArray(scene)||!scene.length)return;
    scene.sort((a,b)=>b.z-a.z);for(const it of scene)it.draw()
  }
  sceneryReserved(x,wz,padding=0){
    const zones=this.stage?.reservedSceneryZones;if(!Array.isArray(zones))return false;
    for(const zone of zones){
      if(!zone)continue;const type=zone.type||'box';
      if(type==='box'){
        const cx=Number(zone.centerX)||0,cz=Number(zone.centerZ)||0,hw=Math.max(0,Number(zone.halfWidth)||0)+padding,hd=Math.max(0,Number(zone.halfDepth)||0)+padding;
        if(Math.abs(x-cx)<=hw&&Math.abs(wz-cz)<=hd)return true
      }else if(type==='circle'){
        const cx=Number(zone.centerX)||0,cz=Number(zone.centerZ)||0,r=Math.max(0,Number(zone.radius)||0)+padding;
        if((x-cx)*(x-cx)+(wz-cz)*(wz-cz)<=r*r)return true
      }else if(type==='corridor'){
        const x0=Number(zone.x0)||0,z0=Number(zone.z0)||0,x1=Number(zone.x1)||0,z1=Number(zone.z1)||0;
        const vx=x1-x0,vz=z1-z0,l2=vx*vx+vz*vz,t=l2>1e-9?clamp(((x-x0)*vx+(wz-z0)*vz)/l2,0,1):0;
        const px=x0+vx*t,pz=z0+vz*t,r=Math.max(0,Number(zone.halfWidth)||0)+padding;
        if((x-px)*(x-px)+(wz-pz)*(wz-pz)<=r*r)return true
      }
    }
    return false
  }
  prepare(stage){
    this.reset();this.active=true;this.stage=globalThis.AgentXEnvironments?.resolve?.(stage||{})||(stage||{});
    const resolved=this.stage;
    this.terrain=resolved?.terrain||'plains';this.destination=resolved?.destination||'city';this.scenery=resolved?.scenery||(this.destination==='swamp'?'swamp':'forest');
    this.freeFlight=!!resolved?.freeFlight;
    this.freeFlightTerrainZero=this.freeFlight?this.freeFlightTerrainShapeRaw(0,0):0;
    this.routeLength=Math.max(240,Number(resolved?.routeLength)||430);
    this.targetWorldZ=Number.isFinite(Number(resolved?.targetWorldZ))?Number(resolved.targetWorldZ):this.routeLength;
    this.targetX=Number.isFinite(Number(resolved?.targetX))?Number(resolved.targetX):0;
    this.entryRadius=clamp(Number(resolved?.entryRadius)||36,24,60);
    this.buildScenery();
    if(this.destination==='forest')this.buildForestBoundary();
    else if(this.destination==='swamp')this.buildSwampBoundary();
    else if(this.destination==='bunker'||this.destination==='osd'){this.skyline.length=0;this.forestBands.length=0;this.forestFront.length=0}
    else this.buildSkyline()
  }
  meshBaseY(mesh){
    if(this.baseCache.has(mesh))return this.baseCache.get(mesh);
    let y=0;if(mesh?.v?.length)y=Math.min(...mesh.v.map(v=>v[1]));this.baseCache.set(mesh,y);return y
  }
  freeFlightHash(ix,iz,salt=0){
    let h=(Math.imul((ix|0)^salt,0x45d9f3b)^Math.imul((iz|0)^0x27d4eb2d,0x119de1f3)^0x9e3779b9)>>>0;
    h=(h^(h>>>16))>>>0;h=Math.imul(h,0x7feb352d)>>>0;
    h=(h^(h>>>15))>>>0;h=Math.imul(h,0x846ca68b)>>>0;
    return ((h^(h>>>16))>>>0)/4294967296
  }
  freeFlightSmooth(t){t=clamp(t,0,1);return t*t*(3-2*t)}
  freeFlightMesa(dx,dz,rx,rz,height){
    const q=Math.sqrt((dx*dx)/(rx*rx)+(dz*dz)/(rz*rz));
    if(q>=1.18)return 0;
    if(q<=.50)return height;
    if(q<=.88){
      // Keep a broad top but make the shoulder substantially steeper than the
      // earlier rounded mesa. This reads much more like eroded high desert.
      const t=this.freeFlightSmooth((q-.50)/.38);
      return height*(1-t)
    }
    const apron=1-(q-.88)/.30;
    return height*.11*Math.max(0,apron)*Math.max(0,apron)
  }
  freeFlightCrater(dx,dz,radius,depth,rimHeight){
    const q=Math.hypot(dx,dz)/radius;
    if(q>=1.16)return 0;
    let h=0;
    if(q<1){
      const bowl=1-q*q;
      h-=depth*Math.pow(bowl,1.65)
    }
    // Narrower, taller rims stop the craters looking like shallow saucers.
    const rim=Math.max(0,1-Math.abs(q-.94)/.15);
    h+=rimHeight*rim*rim*(3-2*rim);
    return h
  }
  freeFlightEscarpment(dx,dz,halfLen,halfWidth,height){
    if(Math.abs(dx)>=halfLen||Math.abs(dz)>=halfWidth*1.55)return 0;
    const lenFade=this.freeFlightSmooth(1-Math.abs(dx)/halfLen);
    let shelf;
    if(dz<=-halfWidth*.50)shelf=1;
    else if(dz<halfWidth*.08)shelf=1-this.freeFlightSmooth((dz+halfWidth*.50)/(halfWidth*.58));
    else shelf=0;
    const foot=Math.max(0,1-Math.max(0,dz-halfWidth*.08)/(halfWidth*.44));
    return height*(shelf*lenFade+.075*foot*lenFade)
  }
  freeFlightBrokenRidge(dx,dz,halfLen,halfWidth,height,phase){
    if(Math.abs(dx)>=halfLen||Math.abs(dz)>=halfWidth*1.40)return 0;
    const along=Math.abs(dx)/halfLen;
    const endFade=this.freeFlightSmooth(1-along);
    const q=Math.abs(dz)/halfWidth;
    if(q>=1.40)return 0;
    const cross=q<.38?1:1-this.freeFlightSmooth((q-.38)/1.02);
    const broken=.68+.32*Math.sin(dx*.055+phase)+.14*Math.sin(dx*.11-phase*.7);
    return height*endFade*cross*clamp(broken,.30,1.05)
  }
  freeFlightCanyon(dx,dz,halfLen,halfWidth,depth,phase){
    // Broad negative landforms with long, slow bends.  The meander wavelength is
    // tied to canyon length so the very long cuts sweep across the landscape rather
    // than turning into a rapid sine-wave trench.  Shelves break up the canyon wall.
    const along=Math.abs(dx)/halfLen;
    if(along>=1.10)return 0;
    const endFade=1-this.freeFlightSmooth(clamp((along-.84)/.26,0,1));
    const u=dx/Math.max(1,halfLen);
    const bend=Math.sin(u*Math.PI*1.55+phase)*halfWidth*.34
              +Math.sin(u*Math.PI*3.35-phase*.57)*halfWidth*.11;
    const q=Math.abs(dz-bend)/halfWidth;
    if(q>=1.22)return 0;
    let cut;
    if(q<=.30)cut=1;
    else if(q<=.48)cut=lerp(1,.86,this.freeFlightSmooth((q-.30)/.18));
    else if(q<=.67)cut=lerp(.86,.61,this.freeFlightSmooth((q-.48)/.19));
    else if(q<1.02)cut=.61*(1-this.freeFlightSmooth((q-.67)/.35));
    else cut=0;
    // Slow floor undulation avoids a ruler-flat bottom without adding noisy detail.
    const floorVariation=.91+.09*Math.sin(u*Math.PI*5.2+phase*1.7);
    return -depth*cut*endFade*floorVariation
  }
  freeFlightTerrainShapeRaw(x,wz){
    // Rugged Mars / Monument-Valley country. The broad terms still give the world
    // coherent regions, but sharper landforms now carry most of the character:
    // steep mesa shoulders, deep crater bowls, scarps and broken rocky ridges.
    const broad=2.30*Math.sin(x*.0038+wz*.0013)+1.85*Math.cos(wz*.0044-x*.0011)+1.20*Math.sin((x-wz)*.0026);
    const subtle=.48*Math.sin(x*.016+wz*.010)+.32*Math.sin(x*.027-wz*.020);
    // Low-amplitude ridged texture gives the open ground fractured shelves without
    // returning to the old all-over "crumpled cloth" noise.
    const ridgeTex=.78*(Math.pow(Math.abs(Math.sin(x*.020+wz*.012)),5)-.34)
                  +.52*(Math.pow(Math.abs(Math.sin(x*.014-wz*.023+1.2)),6)-.31);
    let h=broad+subtle+ridgeTex;
    const cell=158,ix=Math.floor(x/cell),iz=Math.floor(wz/cell);
    for(let cx=ix-1;cx<=ix+1;cx++)for(let cz=iz-1;cz<=iz+1;cz++){
      const type=this.freeFlightHash(cx,cz,11);
      const fx=(cx+.16+this.freeFlightHash(cx,cz,29)*.68)*cell;
      const fz=(cz+.16+this.freeFlightHash(cx,cz,43)*.68)*cell;
      const ang=this.freeFlightHash(cx,cz,59)*Math.PI*2,ca=Math.cos(ang),sa=Math.sin(ang);
      const dx=x-fx,dz=wz-fz,lx=dx*ca+dz*sa,lz=-dx*sa+dz*ca;
      if(type<.30){
        const radius=50+this.freeFlightHash(cx,cz,71)*52;
        const depth=3.4+this.freeFlightHash(cx,cz,83)*3.8;
        const rim=1.6+this.freeFlightHash(cx,cz,97)*2.6;
        h+=this.freeFlightCrater(dx,dz,radius,depth,rim)
      }else if(type<.57){
        const rx=29+this.freeFlightHash(cx,cz,71)*32;
        const rz=25+this.freeFlightHash(cx,cz,83)*30;
        const height=5.4+this.freeFlightHash(cx,cz,97)*6.9;
        h+=this.freeFlightMesa(lx,lz,rx,rz,height)
      }else if(type<.81){
        const halfLen=64+this.freeFlightHash(cx,cz,71)*62;
        const halfWidth=13+this.freeFlightHash(cx,cz,83)*13;
        const height=5.2+this.freeFlightHash(cx,cz,97)*5.4;
        h+=this.freeFlightEscarpment(lx,lz,halfLen,halfWidth,height)
      }else if(type<.96){
        const halfLen=54+this.freeFlightHash(cx,cz,71)*52;
        const halfWidth=8+this.freeFlightHash(cx,cz,83)*10;
        const height=3.8+this.freeFlightHash(cx,cz,97)*5.0;
        const phase=this.freeFlightHash(cx,cz,107)*Math.PI*2;
        h+=this.freeFlightBrokenRidge(lx,lz,halfLen,halfWidth,height,phase)
      }
    }

    // Separate large-scale canyon field.  Canyons are a little more common than
    // before and substantially longer.  Most are broad regional cuts; a minority
    // become rare major canyons with dramatically deeper floors and kilometre-like
    // visual runs in game scale.
    const canyonCell=560,cix=Math.floor(x/canyonCell),ciz=Math.floor(wz/canyonCell);
    for(let cx=cix-1;cx<=cix+1;cx++)for(let cz=ciz-1;cz<=ciz+1;cz++){
      const chance=this.freeFlightHash(cx,cz,211);
      if(chance>.58)continue;
      const fx=(cx+.16+this.freeFlightHash(cx,cz,223)*.68)*canyonCell;
      const fz=(cz+.16+this.freeFlightHash(cx,cz,227)*.68)*canyonCell;
      const ang=this.freeFlightHash(cx,cz,229)*Math.PI*2,ca=Math.cos(ang),sa=Math.sin(ang);
      const dx=x-fx,dz=wz-fz,lx=dx*ca+dz*sa,lz=-dx*sa+dz*ca;
      const major=this.freeFlightHash(cx,cz,257)<.24;
      const halfLen=major
        ?430+this.freeFlightHash(cx,cz,233)*155
        :230+this.freeFlightHash(cx,cz,233)*175;
      const halfWidth=major
        ?52+this.freeFlightHash(cx,cz,239)*34
        :30+this.freeFlightHash(cx,cz,239)*25;
      const depth=major
        ?28+this.freeFlightHash(cx,cz,241)*20
        :12+this.freeFlightHash(cx,cz,241)*11;
      const phase=this.freeFlightHash(cx,cz,251)*Math.PI*2;
      h+=this.freeFlightCanyon(lx,lz,halfLen,halfWidth,depth,phase)
    }
    return h
  }
  freeFlightTerrainOffset(x,wz){return this.freeFlightTerrainShapeRaw(x,wz)-this.freeFlightTerrainZero}
  terrainHeightAt(x,wz){return this.groundY+(this.freeFlight?this.freeFlightTerrainOffset(x,wz):0)}
  freeFlightColour(){
    if(typeof this.freeFlightCustomColour==='string'&&/^#[0-9a-f]{6}$/i.test(this.freeFlightCustomColour))return this.freeFlightCustomColour;
    const palette=[C.o,C.y,C.r,C.g,C.c,C.m,C.u,C.w];
    return palette[((this.freeFlightColourIndex%palette.length)+palette.length)%palette.length]
  }
  freeFlightStarsUseWhite(){return !!this.freeFlightStarsWhite}
  cycleFreeFlightColour(direction=1){
    if(!this.freeFlight)return;
    const count=8,step=direction<0?-1:1;
    this.freeFlightColourIndex=(this.freeFlightColourIndex+step+count)%count
  }
  toggleFreeFlightStarMode(){
    if(!this.freeFlight)return;
    this.freeFlightStarsWhite=!this.freeFlightStarsWhite
  }
  drawFreeFlightTerrain(){
    // Use one stable underlying terrain mesh so formations keep the same shape as
    // they approach. Distance now affects only line intensity, not the geometry
    // itself, which avoids LOD popping where new contour lines redefine ridges.
    const near=.20,landCol=this.freeFlightColour();
    const step=12,far=610,displayFar=570;

    // In ambient mode the mountain crest itself is the only sky/land boundary.
    // Everything below it is masked black before the detailed terrain is painted,
    // so deep canyons cannot reveal stars and there is no separate base horizon
    // line to fragment as the ground drops below the old datum.
    drawFreeFlightMountainSkyline(this.groundY,780,landCol,1.58);

    const items=[],heightCache=new Map(),focal=Math.min(W,viewH)*1.09;
    const sampleHeight=(x,z)=>{
      const key=`${x},${z}`;
      let h=heightCache.get(key);
      if(h===undefined){h=this.terrainHeightAt(x,z);heightCache.set(key,h)}
      return h
    };
    const lineAlphaForDistance=(d)=>{
      // Strong close to the drone, then progressively calmer. The important change
      // is that the underlying mesh does not change; only the line emphasis does.
      if(d>=displayFar)return 0;
      const t=clamp(d/displayFar,0,1);
      return lerp(.60,.16,t*t)
    };
    const x0=Math.floor((shipX-far)/step)*step,x1=Math.ceil((shipX+far)/step)*step;
    const z0=Math.floor((travel-far)/step)*step,z1=Math.ceil((travel+far)/step)*step;
    const far2=(far+step)*(far+step);
    for(let x=x0;x<x1;x+=step){
      for(let wz=z0;wz<z1;wz+=step){
        const cx=x+step*.5,cz=wz+step*.5,dx=cx-shipX,dz=cz-travel,r2=dx*dx+dz*dz;
        if(r2>far2)continue;
        const h00=sampleHeight(x,wz),h10=sampleHeight(x+step,wz),h11=sampleHeight(x+step,wz+step),h01=sampleHeight(x,wz+step);
        const centreCam=camPoint([cx,(h00+h10+h11+h01)*.25,cz-travel]);
        if(centreCam[2]<-step*1.6)continue;
        if(centreCam[2]>near){
          const screenHalfWorld=((W*.5+step*3+70)/focal)*centreCam[2]+step*2;
          if(Math.abs(centreCam[0])>screenHalfWorld)continue
        }
        const world=[
          [x,h00,wz-travel],
          [x+step,h10,wz-travel],
          [x+step,h11,wz+step-travel],
          [x,h01,wz+step-travel]
        ];
        const poly=camera.clipWorldPolyNear(world,near);
        if(poly.length<3)continue;
        const alpha=lineAlphaForDistance(Math.sqrt(r2));
        items.push({kind:'terrain',depth:centreCam[2],poly,alpha})
      }
    }

    // Ordinary loose rocks are deliberately local detail; the tall geological
    // stacks survive much farther out so they work as navigational landmarks.
    for(const t of this.trees){
      if(t.kind!=='rock')continue;
      const z=t.worldZ-travel,q=camPoint([t.x,t.y,z]),d=q[2];
      const rockFar=t.rockForm==='stack'?535:275;
      if(!(d>.3&&d<rockFar&&this.treeWithinTurnMargin(q,t.s*Math.max(t.mx||1,t.mz||1))))continue;
      items.push({kind:'rock',depth:d-.65,rock:t,z})
    }

    items.sort((a,b)=>b.depth-a.depth);
    ctx.save();ctx.lineWidth=VECTOR_LINE_WIDTH;ctx.lineJoin='round';ctx.lineCap='round';
    for(const it of items){
      if(it.kind==='rock'){
        const t=it.rock,d=it.depth+.65;
        drawMesh({type:t.rockForm==='stack'?'desertRockStack':'plainsRock',x:t.x,y:t.y,z:it.z,s:t.s,mx:t.mx||1,my:t.my||1,mz:t.mz||1,rot:t.rot||[0,0,0]},t.mesh,landCol,clamp(1.04-d/650,.24,.86));
        continue
      }
      const p=it.poly;
      ctx.globalAlpha=1;ctx.fillStyle='#000';ctx.beginPath();ctx.moveTo(p[0].x,p[0].y);
      for(let i=1;i<p.length;i++)ctx.lineTo(p[i].x,p[i].y);
      ctx.closePath();ctx.fill();
      if(it.alpha>.015){
        ctx.globalAlpha=it.alpha;ctx.strokeStyle=landCol;ctx.beginPath();ctx.moveTo(p[0].x,p[0].y);
        for(let i=1;i<p.length;i++)ctx.lineTo(p[i].x,p[i].y);
        ctx.closePath();ctx.stroke()
      }
    }
    ctx.restore()
  }
  freeFlightSeed(cx,cz){
    let h=(Math.imul(cx|0,0x45d9f3b)^Math.imul(cz|0,0x119de1f3)^0x4f534450)>>>0;
    h=Math.imul(h^(h>>>16),0x45d9f3b)>>>0;h=Math.imul(h^(h>>>16),0x45d9f3b)>>>0;
    return (h^(h>>>16))>>>0
  }
  makeFreeFlightRockStackMesh(rand){
    // Tall landmark in the same faceted language as the ordinary rocks, but with
    // deliberately sparse linework. Faces still provide proper occlusion; only a
    // handful of structural edges are drawn so the formation reads as a silhouette.
    const sides=7;
    const levels=[
      {y:0.00,r:1.00,x:1.05,z:.94},
      {y:0.18,r:1.10,x:.98,z:1.04},
      {y:0.39,r:.78,x:1.08,z:.91},
      {y:0.60,r:.96,x:.94,z:1.08},
      {y:0.80,r:.68,x:1.07,z:.92},
      {y:1.00,r:.50,x:.96,z:1.03}
    ];
    const sideShape=Array.from({length:sides},()=>.80+rand()*.34);
    const v=[],e=[],faces=[];
    let ox=0,oz=0,leanX=(rand()-.5)*.050,leanZ=(rand()-.5)*.050;
    for(let li=0;li<levels.length;li++){
      const lev=levels[li];
      if(li>0){ox+=leanX+(rand()-.5)*.055;oz+=leanZ+(rand()-.5)*.055}
      const phase=(rand()-.5)*.10;
      for(let i=0;i<sides;i++){
        const a=i*Math.PI*2/sides+phase,local=lev.r*sideShape[i]*(.92+rand()*.15);
        let y=lev.y;
        if(li===levels.length-1){y+=(rand()-.5)*.065;if(i===1||i===2)y+=.035+rand()*.035}
        v.push([ox+Math.cos(a)*local*lev.x,y,oz+Math.sin(a)*local*lev.z])
      }
    }
    // Show only selected horizontal strata and four long structural seams.
    const visibleRings=new Set([0,2,4,5]);
    for(let li=0;li<levels.length;li++){
      const base=li*sides;
      if(visibleRings.has(li))for(let i=0;i<sides;i++)e.push([base+i,base+(i+1)%sides]);
      if(li<levels.length-1){
        const next=(li+1)*sides;
        for(let i=0;i<sides;i++){
          if((i%2)===0)e.push([base+i,next+i]);
          faces.push([base+i,base+(i+1)%sides,next+(i+1)%sides,next+i])
        }
      }
    }
    faces.push(Array.from({length:sides},(_,i)=>sides-1-i));
    const top=(levels.length-1)*sides;
    faces.push(Array.from({length:sides},(_,i)=>top+i));
    return{name:'Tall Desert Outcrop',v,e,faces}
  }
  buildFreeFlightChunk(cx,cz){
    const mesh=asteroidMesh;if(!mesh)return [];
    let seed=this.freeFlightSeed(cx,cz)||1;
    const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
    const size=this.freeFlightChunkSize,minX=cx*size,minZ=cz*size,rocks=[];
    const region=this.freeFlightHash(Math.floor(cx/2),Math.floor(cz/2),131);
    let clumps=0;
    if(region<.22)clumps=rand()<.55?0:1;
    else if(region<.52)clumps=1+Math.floor(rand()*2);
    else if(region<.82)clumps=2+Math.floor(rand()*2);
    else clumps=3+Math.floor(rand()*3);
    for(let c=0;c<clumps;c++){
      const centreX=minX+10+rand()*(size-20),centreZ=minZ+10+rand()*(size-20);
      const countBase=region>.82?3:region>.52?2:1;
      const count=countBase+Math.floor(rand()*(region<.22?2:4));
      const xSpread=10+rand()*18+(region>.82?10:0),zSpread=10+rand()*20+(region>.82?12:0);
      const baseScale=(region<.22?.88:region<.52?1.00:1.14)+(rand()*(region>.82?.95:.65));
      for(let i=0;i<count;i++){
        const x=centreX+(rand()-.5)*xSpread,wz=centreZ+(rand()-.5)*zSpread;
        // Keep the initial spawn comfortably open. Everywhere else the field is
        // completely procedural, including negative world coordinates behind the start.
        if(x*x+wz*wz<18*18)continue;
        const isolated=region<.22&&count===1;
        // Tall outcrops are landmarks, not a repeating prop. Keep them rare enough
        // that spotting one in the distance feels significant.
        const stackChance=isolated?.075:(region<.52?.020:.008);
        const makeStack=rand()<stackChance;
        if(makeStack){
          const stackMesh=this.makeFreeFlightRockStackMesh(rand);
          const ground=this.terrainHeightAt(x,wz);
          const height=10.5+rand()*10.5;
          const width=3.2+rand()*3.0;
          const depth=width*(.72+rand()*.48);
          const rot=[0,rand()*Math.PI*2,0];
          rocks.push({kind:'rock',rockForm:'stack',mesh:stackMesh,x,y:ground,worldZ:wz,s:1,rot,col:C.o,mx:width,my:height,mz:depth,hit:false,stackTopY:ground+height*1.04,stackRadiusScale:Math.max(width,depth)*1.35});
          continue
        }
        const scale=baseScale*(isolated?(1.15+rand()*.70):(.82+rand()*.56));
        const mx=1.05+rand()*1.25,my=.45+rand()*.62,mz=.95+rand()*1.1;
        const bury=.12+rand()*.18,ground=this.terrainHeightAt(x,wz),rot=[(rand()-.5)*.28,rand()*Math.PI*2,(rand()-.5)*.24];
        const y=ground-(this.meshBaseY(mesh)+bury)*scale*my;
        rocks.push({kind:'rock',mesh,x,y,worldZ:wz,s:scale,rot,col:C.o,mx,my,mz,hit:false})
      }
    }
    return rocks
  }
  refreshFreeFlightScenery(force=false){
    if(!this.freeFlight)return;
    const size=this.freeFlightChunkSize,cx=Math.floor(shipX/size),cz=Math.floor(travel/size);
    if(!force&&cx===this.freeFlightChunkX&&cz===this.freeFlightChunkZ)return;
    const r=this.freeFlightChunkRadius;
    for(let x=cx-r;x<=cx+r;x++)for(let z=cz-r;z<=cz+r;z++){
      const key=`${x},${z}`;
      if(!this.freeFlightChunks.has(key))this.freeFlightChunks.set(key,{cx:x,cz:z,rocks:this.buildFreeFlightChunk(x,z)})
    }
    for(const [key,chunk] of this.freeFlightChunks){
      if(Math.abs(chunk.cx-cx)>r||Math.abs(chunk.cz-cz)>r)this.freeFlightChunks.delete(key)
    }
    this.trees.length=0;
    for(const chunk of this.freeFlightChunks.values())this.trees.push(...chunk.rocks);
    this.freeFlightChunkX=cx;this.freeFlightChunkZ=cz
  }
  buildScenery(){
    this.trees.length=0;this.seed=0x504c4149;
    if(this.freeFlight){this.refreshFreeFlightScenery(true);return}
    const rockMode=this.scenery==='rocks';
    const swamp=this.scenery==='swamp';
    const registry=swamp?globalThis.AgentXAlienSwampScenery:globalThis.AgentXForestScenery;
    const ids=swamp
      ?['swampReedTall','swampReedFan','swampReedWide','swampReedSpike','alienBulbPlantConnected','alienUmbrellaPlantConnected','alienEggPodFat','alienEggClusterFat']
      :['pineTall','pineBroad','pineYoung','pineDeadSparse'];
    const addTree=(id,x,wz,scale)=>{
      const fallback=swamp?(typeof alienSwampSceneryMesh==='function'?alienSwampSceneryMesh(id):null):(typeof forestSceneryMesh==='function'?forestSceneryMesh(id):null);
      const baseMesh=registry?.get?.(id)||fallback;if(!baseMesh)return;
      // The swamp approach uses the existing non-hostile alien foliage assets in the
      // same clump generator as the forest plains. No spitter-flower combat actors are
      // created here; this is scenery only.
      const mesh=swamp?baseMesh:forestShortTrunkMesh(baseMesh,id),y=this.groundY-this.meshBaseY(baseMesh)*scale;
      const obj={assetId:id,mesh,x,y,worldZ:wz,s:scale,rot:[0,this.rand()*Math.PI*2,0],col:resolvePaletteColor(baseMesh.singleColorKey)||C.g,hit:false};
      if(swamp&&String(id).startsWith('swampReed')){obj.my=1.55+this.rand()*.65;obj.mx=1.08+this.rand()*.22;obj.mz=1.0+this.rand()*.16}
      this.trees.push(obj)
    };
    const addRock=(x,wz,scale)=>{
      const mesh=asteroidMesh;if(!mesh)return;
      // Landmarks reserve physical space in the environment. Do not generate
      // rocks/trees there and then rely on a render-time hide/mask trick.
      if(this.sceneryReserved(x,wz,Math.max(1.5,scale*1.9)))return;
      const mx=1.05+this.rand()*1.25,my=.45+this.rand()*.62,mz=.95+this.rand()*1.1;
      const bury=.12+this.rand()*.18;
      const y=this.groundY-(this.meshBaseY(mesh)+bury)*scale*my;
      const col=C.o;
      const obj={kind:'rock',mesh,x,y,worldZ:wz,s:scale,rot:[(this.rand()-.5)*.28,this.rand()*Math.PI*2,(this.rand()-.5)*.24],col,mx,my,mz,hit:false};
      this.trees.push(obj)
    };
    const addClump=(centreX,centreWZ,count,xSpread,zSpread,baseScale=1,allowSingles=false)=>{
      for(let i=0;i<count;i++){
        const x=centreX+(this.rand()-.5)*xSpread,wz=centreWZ+(this.rand()-.5)*zSpread;
        if(rockMode)addRock(x,wz,baseScale*(.86+this.rand()*.46));
        else {
          const id=ids[Math.floor(this.rand()*ids.length)];
          addTree(id,x,wz,baseScale*(.88+this.rand()*.34))
        }
      }
      if(allowSingles&&this.rand()<.18){
        const sx=centreX+(this.rand()<.5?-1:1)*(xSpread*.85+2+this.rand()*5),sz=centreWZ+(this.rand()-.5)*(zSpread*1.6),ss=baseScale*(.84+this.rand()*.26);
        if(rockMode)addRock(sx,sz,ss);else addTree(ids[Math.floor(this.rand()*ids.length)],sx,sz,ss)
      }
    };
    const requestedClumps=Number(rockMode?(this.stage?.rockClumps??this.stage?.treeClumps):this.stage?.treeClumps);
    const clumps=clamp(Math.round(Number.isFinite(requestedClumps)?requestedClumps:9),0,18);
    if(clumps<=0)return;
    // Preserve the original route-side clumps. These are the nearer decorative groups
    // that keep the surface from reading as a billiard table.
    for(let c=0;c<clumps;c++){
      const u=38+(this.routeLength-92)*(c+.28+this.rand()*.44)/Math.max(1,clumps);
      const side=this.rand()<.5?-1:1,centreX=side*(12+this.rand()*30),count=rockMode?(2+Math.floor(this.rand()*3)):(3+Math.floor(this.rand()*4));
      addClump(centreX,u,count,rockMode?(12+this.rand()*8):8.0,rockMode?(10+this.rand()*8):9.0,rockMode?(1.12+this.rand()*.52):1.0,false)
    }
    // Fill the *sides* of the plains with grouped scenery rather than lone objects.
    // For the OSD delivery run this becomes desert-like rock clusters instead of trees.
    const sideClumps=Math.max(10,Math.min(18,clumps+6));
    for(const side of[-1,1])for(let c=0;c<sideClumps;c++){
      const centreWZ=-86+(this.routeLength+210)*(c+.12+this.rand()*.76)/sideClumps;
      const lane=(c%3),nearFar=lane===0?34:lane===1?56:82;
      const centreX=side*(nearFar+this.rand()*(lane===2?18:14));
      const count=rockMode?(2+Math.floor(this.rand()*3)+(lane===2?1:0)):(4+Math.floor(this.rand()*5)+(lane===2?1:0));
      const xSpread=rockMode?(10+this.rand()*12+(lane===2?5:0)):(6.5+this.rand()*6.0+(lane===2?4.0:0));
      const zSpread=rockMode?(12+this.rand()*16+(lane===2?10:0)):(10+this.rand()*14+(lane===2?8:0));
      const baseScale=rockMode?(1.02+this.rand()*.48):(.92+this.rand()*.28);
      addClump(centreX,centreWZ,count,xSpread,zSpread,baseScale,true)
    }
    // A few extra distant side masses keep the horizon from feeling empty without
    // creating another planted strip straight ahead.
    const farMasses=4+Math.floor(clumps*.35);
    for(const side of[-1,1])for(let i=0;i<farMasses;i++){
      const centreX=side*(78+this.rand()*48),centreWZ=this.routeLength-12+i*18+this.rand()*42;
      addClump(centreX,centreWZ,rockMode?(4+Math.floor(this.rand()*3)):(6+Math.floor(this.rand()*4)),rockMode?(18+this.rand()*16):(12+this.rand()*10),rockMode?(22+this.rand()*24):(18+this.rand()*20),rockMode?(1.08+this.rand()*.44):(.96+this.rand()*.24),false)
    }
  }
  buildSkyline(){
    this.skyline.length=0;
    const all=globalThis.AgentXCityBuildings?.list||[];
    const usable=all.filter(m=>m?.id!=='penthousehatchtower');
    const pick=()=>usable.length?usable[Math.floor(this.rand()*usable.length)]:null;
    // Broad skyline at the destination boundary. At very long range these are drawn
    // as simple tower boxes; as they approach, the real city meshes take over.
    for(let i=0;i<19;i++){
      const band=(i-9)/9;
      const mesh=pick();
      const h=11+this.rand()*17+(1-Math.abs(band))*7;
      const scale=mesh?h/Math.max(.001,mesh.cityHeight||6):1;
      const w=mesh?(mesh.cityWidth||3)*scale:(4+this.rand()*3);
      const d=mesh?(mesh.cityDepth||2)*scale:(4+this.rand()*4);
      const x=this.targetX+band*48+(this.rand()-.5)*4.5;
      const wz=this.targetWorldZ+22+this.rand()*72;
      const roll=this.rand();
      this.skyline.push({x,worldZ:wz,h,w,d,mesh,scale,col:roll>.90?C.w:(roll>.78?C.y:C.g)})
    }
  }
  buildForestBoundary(){
    this.skyline.length=0;this.forestBands.length=0;this.forestFront.length=0;
    this.seed=0x46525354;
    // The destination forest is made from real pine geometry, not a mountain-like
    // canopy silhouette. Several staggered rows build a readable woodland mass at
    // distance while leaving a genuine opening around Forest Nav for the route in.
    const registry=globalThis.AgentXForestScenery,ids=['pineTall','pineBroad','pineYoung'];
    for(let row=0;row<3;row++)for(const side of [-1,1])for(let i=0;i<10;i++){
      const id=ids[Math.floor(this.rand()*ids.length)],base=registry?.get?.(id)||(typeof forestSceneryMesh==='function'?forestSceneryMesh(id):null);
      if(!base)continue;
      const scale=1.18+this.rand()*1.42+(i%5===0?.48:0),gap=6.8+row*1.15;
      const x=this.targetX+side*(gap+i*4.55+this.rand()*2.15);
      const wz=this.targetWorldZ+4+row*12+this.rand()*13;
      const mesh=forestShortTrunkMesh(base,id),y=this.groundY-this.meshBaseY(base)*scale;
      this.forestFront.push({assetId:id,mesh,x,y,worldZ:wz,s:scale,rot:[0,this.rand()*Math.PI*2,0]})
    }
  }
  buildSwampBoundary(){
    this.skyline.length=0;this.forestBands.length=0;this.forestFront.length=0;
    this.seed=0x5357414d;
    const registry=globalThis.AgentXAlienSwampScenery;
    const reeds=['swampReedTall','swampReedFan','swampReedWide','swampReedSpike'];
    const accents=['alienBulbPlantConnected','alienUmbrellaPlantConnected','alienEggPodFat','alienEggClusterFat'];
    for(let row=0;row<3;row++)for(const side of[-1,1])for(let i=0;i<11;i++){
      const accent=(i+row)%5===2,id=accent?accents[(i+row)%accents.length]:reeds[(i*3+row)%reeds.length];
      const base=registry?.get?.(id)||(typeof alienSwampSceneryMesh==='function'?alienSwampSceneryMesh(id):null);if(!base)continue;
      const scale=(accent?.98:1.18)+this.rand()*(accent?.42:.80),gap=7.4+row*1.4;
      const x=this.targetX+side*(gap+i*3.95+this.rand()*1.8),wz=this.targetWorldZ+3+row*11+this.rand()*12;
      const y=this.groundY-this.meshBaseY(base)*scale,obj={assetId:id,mesh:base,x,y,worldZ:wz,s:scale,rot:[0,this.rand()*Math.PI*2,0],col:resolvePaletteColor(base.singleColorKey)||C.g};
      if(String(id).startsWith('swampReed')){obj.my=1.65+this.rand()*.58;obj.mx=1.12+this.rand()*.20;obj.mz=1.0+this.rand()*.16}
      this.forestFront.push(obj)
    }
  }
  treeWithinTurnMargin(q,scale=1){
    // Reject trees well outside the current view before hidden-line removal. The
    // extra 22% screen-width guard band keeps scenery active ahead of a turn, while
    // avoiding the much larger off-screen workload of the previous 36% margin.
    if(!q||q[2]<=.3)return false;
    const f=Math.min(W,viewH)*1.09,k=f/q[2],px=W*.5+q[0]*k;
    const treePad=Math.min(W*.16,Math.max(16,3.2*scale*k));
    const turnPad=W*.22+treePad;
    return px>=-turnPad&&px<=W+turnPad
  }
  drawForestBoundary(){
    const front=this.visibleForestFront;front.length=0;
    for(const t of this.forestFront){
      const z=t.worldZ-travel,q=camPoint([t.x,t.y,z]),d=q[2];
      if(d>.3&&d<390&&this.treeWithinTurnMargin(q,t.s)){t._plainsDepth=d;t._plainsViewZ=z;front.push(t)}
    }
    front.sort((a,b)=>b._plainsDepth-a._plainsDepth);
    for(const t of front)drawLayeredForestTree({type:'forestApproachTree',assetId:t.assetId,x:t.x,y:t.y,z:t._plainsViewZ,s:t.s,rot:t.rot},t.mesh,t.assetId,.90)
  }
  begin(stage=this.stage){
    if(!this.active)this.prepare(stage);
    this.active=true;this.finishing=false;this.finishT=0;this.navPulse=0;this.lastHandoff=null;this.manualComplete=false;
    mode='play';phase='destinationApproach';modeT=phaseT=0;travel=0;
    fighters.length=0;asteroids.length=0;groundTargets.length=0;bolts.length=0;hazards.length=0;shots.length=0;playerMissiles.length=0;
    inputX=inputY=aimX=aimY=0;spaceYawVel=spacePitchVel=0;surfaceVX=surfaceVY=0;
    if(this.freeFlight){
      // Free flight is not an approach to anything: start neutrally in a clear patch
      // and let the player choose a heading immediately.
      shipX=0;travel=0;surfaceDistance=0;
      const speedMin=Number.isFinite(this.freeFlightSpeedMin)?this.freeFlightSpeedMin:25,speedMax=Number.isFinite(this.freeFlightSpeedMax)?this.freeFlightSpeedMax:40;
      this.freeFlightAutoT=0;this.freeFlightAutoYawRate=0;this.freeFlightAutoSpeed=(speedMin+speedMax)*.5;this.freeFlightAutoClearance=6.5;this.freeFlightAutoSweepSign=Math.random()<.5?-1:1;this.freeFlightTurnBalance=0;this.speed=this.freeFlightAutoSpeed;
      shipY=this.terrainHeightAt(shipX,travel)+6.5;
      viewYaw=0;viewPitch=.01;viewRoll=0;this.refreshFreeFlightScenery(true)
    }else{
      // Do not land neatly opposite the destination. Start laterally displaced and
      // looking farther away from it so the player actually has to acquire the marker.
      const side=this.rand()<.5?-1:1;
      shipX=side*(17+this.rand()*13);shipY=-1.42;
      viewYaw=side*(.28+this.rand()*.28);viewPitch=.015;viewRoll=0
    }
    audio.music.setMode('calm');
    if(this.freeFlight){}
    else if(this.destination==='swamp')say('PROCEED TO SWAMP',.85);
    else if(this.destination==='osd')say('PROCEED TO OSD FACILITY',.85);
    else audio.playVoice(this.destination==='forest'?'proceedToForest':'proceedToCity',{once:false,priority:true})
  }
  stopForJump(){this.active=false;this.finishing=false;this.trees.length=0;this.skyline.length=0;this.forestBands.length=0;this.forestFront.length=0;this.freeFlightChunks.clear()}
  consumeHandoff(){const h=this.lastHandoff;this.lastHandoff=null;return h}
  distance(){return Math.hypot(this.targetX-shipX,this.targetWorldZ-travel)}
  bearing(){return Math.atan2(this.targetX-shipX,this.targetWorldZ-travel)}
  updateSteering(dt,magX,magY){
    if(!this.active||phase!=='destinationApproach')return;
    if(this.freeFlight){
      // Ambient flight is intentionally low-frequency.  Heading, altitude and speed
      // are all driven by long overlapping waves, with acceleration/rate limits so
      // the craft sweeps and swoops rather than choosing abrupt random targets.
      this.freeFlightAutoT+=dt;
      const t=this.freeFlightAutoT;
      const dirX=Math.sin(viewYaw),dirZ=Math.cos(viewYaw);
      const leftYaw=viewYaw-.34,rightYaw=viewYaw+.34;
      const localGround=this.terrainHeightAt(shipX,travel);
      // Deep canyons need a proper forward profile rather than a handful of widely
      // spaced samples. At high user-selected speeds the old 75/115/175/285 probes
      // could straddle a steep canyon wall and the craft simply could not climb out
      // quickly enough. Sample a denser, slightly curved prediction of our path.
      const profileDistances=[32,58,88,122,162,208,262,324];
      const profile=[];
      const profileSpeed=Math.max(18,this.freeFlightAutoSpeed||this.speed||32);
      for(const dist of profileDistances){
        const eta=dist/profileSpeed;
        const predictedYaw=viewYaw+this.freeFlightAutoYawRate*eta*.72;
        const px=shipX+Math.sin(predictedYaw)*dist;
        const pz=travel+Math.cos(predictedYaw)*dist;
        profile.push({dist,ground:this.terrainHeightAt(px,pz)})
      }
      const sampleNear=(distance)=>{
        let best=profile[0];
        for(const s of profile)if(Math.abs(s.dist-distance)<Math.abs(best.dist-distance))best=s;
        return best.ground
      };
      const gMid=sampleNear(122),gAhead=sampleNear(162),gFar=sampleNear(262);
      const gLeft=this.terrainHeightAt(shipX+Math.sin(leftYaw)*195,travel+Math.cos(leftYaw)*195);
      const gRight=this.terrainHeightAt(shipX+Math.sin(rightYaw)*195,travel+Math.cos(rightYaw)*195);

      // Mirror the whole long-wave steering pattern at launch. The previous version
      // accidentally reset the sign to +1 on every launch, making every session
      // start starboard. Ease out the waveform's initial offset as well so the craft
      // begins near neutral instead of immediately committing to either side.
      const rawSweep=.080*Math.sin(t/15.5+.35)+.040*Math.sin(t/31.0+1.7)+.018*Math.sin(t/8.8+2.4);
      const initialSweep=.080*Math.sin(.35)+.040*Math.sin(1.7)+.018*Math.sin(2.4);
      const sweep=this.freeFlightAutoSweepSign*(rawSweep-initialSweep*Math.exp(-t/12));
      const centreRise=Math.max(0,Math.max(gMid,gAhead,gFar)-localGround-2.0);
      let terrainBias=0;
      if(centreRise>1.2){
        const sideDiff=gRight-gLeft;
        // Positive yaw is starboard. If starboard terrain is higher, steer port;
        // if port terrain is higher, steer starboard.
        terrainBias=clamp(-sideDiff*.0075,-.040,.040)
      }
      // Remember actual turning for several minutes and gently favour the opposite
      // direction after a prolonged arc. Strong enough to prevent a persistent orbit,
      // but still slow enough that long graceful one-sided sweeps are allowed.
      const balanceBias=clamp(-this.freeFlightTurnBalance*.0065,-.045,.045);
      const targetYawRate=clamp(sweep+terrainBias+balanceBias,-.125,.125);
      const yawAccel=.020+.010*(.5+.5*Math.sin(t/24));
      this.freeFlightAutoYawRate=moveToward(this.freeFlightAutoYawRate,targetYawRate,dt*yawAccel);
      this.freeFlightTurnBalance=this.freeFlightTurnBalance*Math.exp(-dt/240)+this.freeFlightAutoYawRate*dt;
      viewYaw=wrapAngle(viewYaw+this.freeFlightAutoYawRate*dt);

      // Long altitude cycle, but begin climbing early when a ridge/mesa is still well
      // ahead.  This creates the sweeping crest-and-dive motion instead of last-second
      // terrain following.
      let clearance=7.4+4.0*Math.sin(t/21.5+.55)+2.0*Math.sin(t/39.0+2.1);
      clearance=clamp(clearance,3.4,13.5);
      this.freeFlightAutoClearance=lerp(this.freeFlightAutoClearance,clearance,1-Math.exp(-dt*.42));
      // Work out not only where the terrain is, but how fast we must climb to clear
      // it before arrival. This is essential after adding 30-48 unit major canyons:
      // a fixed 5.8 u/s climb rate cannot escape their walls at 60-80 u/s forward.
      let profileTargetY=localGround+this.freeFlightAutoClearance;
      let requiredClimbRate=0;
      for(const s of profile){
        const margin=lerp(4.8,8.8,clamp(s.dist/324,0,1));
        const safeY=s.ground+margin;
        profileTargetY=Math.max(profileTargetY,safeY);
        const eta=Math.max(.35,s.dist/Math.max(18,this.freeFlightAutoSpeed||this.speed||32));
        requiredClimbRate=Math.max(requiredClimbRate,(safeY-shipY)/eta)
      }
      const targetY=profileTargetY;
      const climbCap=clamp(Math.max(5.8,requiredClimbRate*1.22+1.0),5.8,18.5);
      const targetVY=clamp(Math.max((targetY-shipY)*.78,requiredClimbRate*1.12),-5.2,climbCap);
      const verticalAccel=requiredClimbRate>5.0?3.6:1.55;
      surfaceVY=moveToward(surfaceVY,targetVY,dt*verticalAccel);
      shipY+=surfaceVY*dt;

      // Faster than the old sightseeing pace, but still changing over many seconds.
      // Descents/open ground build speed; substantial terrain ahead gently bleeds it.
      const openness=clamp(1-centreRise/8,0,1);
      const descentBoost=clamp(-surfaceVY*.55,-1.5,2.8);
      const speedMin=clamp(Number(this.freeFlightSpeedMin)||20,10,80);
      const speedMax=clamp(Number(this.freeFlightSpeedMax)||60,speedMin+2,80);
      const speedMid=(speedMin+speedMax)*.5,speedHalf=(speedMax-speedMin)*.5;
      // Preserve the old long, smooth velocity rhythm, but remap it over the user
      // selected range instead of merely clipping an internal 25-40 curve.
      const speedWave=4.7*Math.sin(t/27.0+.8)+2.0*Math.sin(t/12.8+2.6)+descentBoost+openness*1.4-centreRise*.42;
      const baseTargetSpeed=speedMid+speedHalf*clamp(speedWave/7.25,-1,1);
      // If a canyon wall demands an unusually steep climb, bleed toward the user's
      // selected minimum speed. This preserves the relaxed swoop instead of forcing
      // an implausibly violent vertical manoeuvre at 80 u/s.
      const climbSlow=clamp((requiredClimbRate-3.5)/11.5,0,1);
      const targetSpeed=lerp(baseTargetSpeed,speedMin,climbSlow*.82);
      const accel=targetSpeed>this.freeFlightAutoSpeed?.82:1.65;
      this.freeFlightAutoSpeed=moveToward(this.freeFlightAutoSpeed,targetSpeed,dt*accel);
      this.speed=this.freeFlightAutoSpeed;

      const runSpeed=this.speed,vx=Math.sin(viewYaw)*runSpeed,vz=Math.cos(viewYaw)*runSpeed;
      surfaceVX=vx;shipX+=vx*dt;travel+=vz*dt;surfaceDistance+=runSpeed*dt;
      // Last-resort invariant: never let the camera finish a frame beneath the
      // actual terrain. Normally the anticipatory profile prevents this entirely;
      // this guard only catches pathological combinations of a sharp wall + turn.
      const groundAfterMove=this.terrainHeightAt(shipX,travel);
      const absoluteFloor=groundAfterMove+3.15;
      if(shipY<absoluteFloor){
        shipY=absoluteFloor;
        surfaceVY=Math.max(surfaceVY,3.0)
      }
      const bankTarget=clamp(-this.freeFlightAutoYawRate*2.9,-.34,.34);
      const pitchTarget=clamp(-surfaceVY*.030,-.13,.12)+.012*Math.sin(t/16.0);
      viewRoll=lerp(viewRoll,bankTarget,1-Math.exp(-dt*1.65));
      viewPitch=lerp(viewPitch,pitchTarget,1-Math.exp(-dt*1.35));
      // Hidden reticle/input is irrelevant in ambient mode; gently drain any stale
      // values so mouse movement before launch cannot influence a later mode.
      inputX=moveToward(inputX,0,dt*.55);inputY=moveToward(inputY,0,dt*.55);
      return
    }
    if(this.finishing){
      // Final city-limit convergence is gentle autopilot, not a teleport. It makes
      // the modular hand-off into the +Z city street continuous after an arbitrary
      // plains arrival heading.
      const err=wrapAngle(this.bearing()-viewYaw);
      viewYaw=wrapAngle(viewYaw+clamp(err,-.72*dt,.72*dt));
      shipX=lerp(shipX,this.targetX,clamp(dt*.62,0,1));
      inputX=moveToward(inputX,0,dt*3.5);inputY=moveToward(inputY,0,dt*3.5)
    }else{
      viewYaw=wrapAngle(viewYaw+magX*dt*1.24)
    }
    viewPitch=lerp(viewPitch,(this.finishing?0:magY*.30),clamp(dt*4.0,0,1));
    viewRoll=lerp(viewRoll,this.finishing?0:-magX*.42,clamp(dt*4.4,0,1));
    const runSpeed=this.speed*(this.finishing?.90:1),vx=Math.sin(viewYaw)*runSpeed,vz=Math.cos(viewYaw)*runSpeed;
    surfaceVX=vx;shipX+=vx*dt;travel+=vz*dt;surfaceDistance+=runSpeed*dt;
    const finishY=(this.destination==='forest'||this.destination==='swamp')?-1.88:-1.22;
    let cruiseY;
    if(this.freeFlight){
      // Keep the familiar low-level neutral position, but give free flight a real
      // ceiling. Pulling the reticle upward can now lift the drone high enough to
      // clear even the largest procedural rocks; pushing down still hugs the land.
      const yInput=clamp(magY,-1,1);
      const clearance=yInput<0?2.08+(-yInput)*21.5:2.08-yInput*1.12;
      cruiseY=this.terrainHeightAt(shipX,travel)+clearance
    }else cruiseY=-1.48-magY*1.12;
    const targetY=this.finishing?finishY:cruiseY;
    const maxVY=this.freeFlight?7.2:2.8,targetVY=clamp((targetY-shipY)*2.35,-maxVY,maxVY);
    surfaceVY=moveToward(surfaceVY,targetVY,dt*(this.freeFlight?6.0:4.6));shipY+=surfaceVY*dt
  }
  update(dt){
    if(!this.active||phase!=='destinationApproach')return;
    this.navPulse+=dt;this.treeHitCD=Math.max(0,this.treeHitCD-dt);
    if(this.freeFlight)this.refreshFreeFlightScenery();
    if(!this.freeFlight&&this.treeHitCD<=0){
      for(const t of this.trees){
        if(t.hit)continue;const dz=t.worldZ-travel,dx=t.x-shipX,radius=(.34+.34*t.s)*(t.stackRadiusScale||1),top=Number.isFinite(t.stackTopY)?t.stackTopY:(this.terrainHeightAt(t.x,t.worldZ)+4.8*t.s);
        if(Math.abs(dz)<1.15&&Math.abs(dx)<radius&&shipY<top){t.hit=true;this.treeHitCD=.82;damage(t.kind==='rock'?'ROCK':'TREE');if(mode==='dead')return;break}
      }
    }
    if(this.freeFlight)return;
    const d=this.distance();
    if(!this.finishing&&d<78){this.finishing=true;this.finishT=0;say(this.destination==='forest'?'FOREST EDGE':(this.destination==='swamp'?'SWAMP EDGE':(this.destination==='osd'?'OSD FACILITY AHEAD':'CITY LIMITS')),.60)}
    if(this.finishing){
      this.finishT+=dt;
      const headingError=Math.abs(wrapAngle(this.bearing()-viewYaw));
      if(d<=this.entryRadius&&(headingError<.20||this.finishT>2.8)){
        this.lastHandoff={x:shipX,y:shipY,yaw:viewYaw,pitch:viewPitch,roll:viewRoll,distance:d,destination:this.destination};
        if(this.stage?.manualCompletion)this.manualComplete=true;
        else scenarioFlow.completeCurrentStage()
      }
    }
  }
  drawGround(){
    if(this.freeFlight){this.drawFreeFlightTerrain();return}
    surfaceMask(this.groundY,560);
    const spacing=8,far=250,x0=Math.floor((shipX-far)/spacing)*spacing,x1=shipX+far;
    const wz0=Math.floor((travel-far)/spacing)*spacing,wz1=travel+far;
    const nx=Math.floor((x1-x0)/spacing),nz=Math.floor((wz1-wz0)/spacing);
    const xLast=x0+nx*spacing,wzLast=wz0+nz*spacing;
    const gridCol=this.destination==='osd'?C.o:C.gd,baseCol=this.destination==='osd'?C.o:C.g;
    ctx.save();ctx.strokeStyle=gridCol;ctx.lineWidth=VECTOR_LINE_WIDTH;ctx.globalAlpha=.55;ctx.beginPath();let any=false;
    for(let ix=0;ix<=nx;ix++){
      const x=x0+ix*spacing;
      if(drawFlatSampledGridLine([x,this.groundY,wz0-travel],[x,this.groundY,wzLast-travel],nz))any=true
    }
    for(let iz=0;iz<=nz;iz++){
      const wz=wz0+iz*spacing;
      if(drawFlatSampledGridLine([x0,this.groundY,wz-travel],[xLast,this.groundY,wz-travel],nx))any=true
    }
    if(any)ctx.stroke();ctx.restore();
    drawSharedSurfaceHorizon(this.groundY,405,1,gridCol,baseCol)
  }
  appendScenery(scene,{minDepth=-Infinity,maxDepth=Infinity}={}){
    if(!Array.isArray(scene))return scene;
    // Free-flight rocks are already interleaved with terrain faces in
    // drawFreeFlightTerrain(), otherwise they would be drawn on top of hills.
    if(this.freeFlight)return scene;
    for(const t of this.trees){
      const z=t.worldZ-travel,q=camPoint([t.x,t.y,z]),d=q[2];
      if(!(d>.3&&d<205&&d>minDepth&&d<=maxDepth&&this.treeWithinTurnMargin(q,t.s*Math.max(t.mx||1,t.mz||1))))continue;
      // Store the camera depth on the painter entry, not as render order hidden
      // inside drawTrees(). This lets a destination object (the tutorial bunker)
      // and its foreground scenery participate in one far-to-near surface list.
      scene.push({z:d,draw:()=>{
        if(t.kind==='rock'){
          drawMesh({type:'plainsRock',x:t.x,y:t.y,z,s:t.s,mx:t.mx||1,my:t.my||1,mz:t.mz||1,rot:t.rot||[0,0,0]},t.mesh,t.col||C.o,clamp(1.02-d/220,.28,.84));
          return
        }
        drawLayeredForestTree({type:'plainsTree',assetId:t.assetId,x:t.x,y:t.y,z,s:t.s,rot:t.rot},t.mesh,t.assetId,.88)
      }})
    }
    return scene
  }
  appendTrees(scene,options={}){return this.appendScenery(scene,options)} // compatibility
  drawTrees(options={}){
    const scene=[];this.appendScenery(scene,options);this.drawObjectScene(scene)
  }
  appendSkyline(scene){
    if(this.destination==='osd')return scene;
    if(this.destination==='forest'||this.destination==='swamp'){
      for(const t of this.forestFront){
        const z=t.worldZ-travel,q=camPoint([t.x,t.y,z]),d=q[2];
        if(!(d>.3&&d<390&&this.treeWithinTurnMargin(q,t.s)))continue;
        scene.push({z:d,draw:()=>drawLayeredForestTree({type:'forestApproachTree',assetId:t.assetId,x:t.x,y:t.y,z:t.worldZ-travel,s:t.s,rot:t.rot},t.mesh,t.assetId,.90)})
      }
      return scene
    }
    for(const b of this.skyline){
      const z=b.worldZ-travel,d=camPoint([b.x,this.groundY+b.h*.5,z])[2];if(d<=.3||d>560)continue;
      scene.push({z:d,draw:()=>{
        if(d>135)drawMesh({type:'citySkylineOccluder',x:b.x,y:this.groundY+b.h*.5,z,s:.5,mx:b.w,my:b.h,mz:b.d,rot:[0,0,0]},courierFixtureBoxMesh,'#000',1);
        if(d>305||!b.mesh)drawMesh({type:'farCityTower',x:b.x,y:this.groundY+b.h*.5,z,s:.5,mx:b.w,my:b.h,mz:b.d,rot:[0,0,0]},courierFixtureBoxMesh,b.col,clamp(1.05-d/720,.38,.72));
        else jackalDelivery.drawBuilding(b,d)
      }})
    }
    return scene
  }
  drawSkyline(){const scene=[];this.appendSkyline(scene);this.drawObjectScene(scene)}
  appendEnvironmentObjects(scene){this.appendSkyline(scene);this.appendScenery(scene);return scene}
  drawNavigation(){
    if(this.freeFlight)return;
    const q=camPoint([this.targetX,this.groundY+6.8,this.targetWorldZ-travel]);
    const p=q[2]>.2?projectCam(q):null,on=!!(p&&p.x>=0&&p.x<=W&&p.y>=0&&p.y<=viewH);
    if(on){
      const pulse=1.5+Math.sin(this.navPulse*4.2)*1.5,r=9+pulse;
      line(p.x,p.y-r,p.x+r,p.y,C.y,1.15,.92);line(p.x+r,p.y,p.x,p.y+r,C.y,1.15,.92);
      line(p.x,p.y+r,p.x-r,p.y,C.y,1.15,.92);line(p.x-r,p.y,p.x,p.y-r,C.y,1.15,.92);
      line(p.x-3,p.y,p.x+3,p.y,C.c,1,.9);line(p.x,p.y-3,p.x,p.y+3,C.c,1,.9);
      const navLabel=this.destination==='bunker'?'BUNKER NAV':(this.destination==='forest'?'FOREST NAV':(this.destination==='swamp'?'SWAMP NAV':(this.destination==='osd'?'OSD NAV':'CITY NAV')));
      ctx.textAlign='center';ctx.font='400 8px Consolas,monospace';ctx.strokeStyle=C.y;ctx.strokeText(navLabel,p.x,p.y-r-7);ctx.textAlign='left'
    }else{
      const edge=hudEdgeCue(q,0),x=edge.x,y=edge.y,dx=edge.dx,dy=edge.dy,tx=-dy,ty=dx,depth=8,width=12,bx=x-dx*depth;
      line(bx+tx*width*.5,y-dy*depth+ty*width*.5,x,y,C.y,1.3,.88);line(x,y,bx-tx*width*.5,y-dy*depth-ty*width*.5,C.y,1.3,.88)
    }
  }
  draw(){
    this.drawGround();const scene=[];this.appendEnvironmentObjects(scene);
    if(this.destination==='osd'&&bunkerRaid?.active)bunkerRaid.appendOsdSurfaceObjects(scene);
    this.drawObjectScene(scene);this.drawNavigation()
  }
  hudRight(){
    if(this.active&&this.freeFlight)return 'FREE FLIGHT';
    const label=this.destination==='bunker'?'BUNKER':(this.destination==='forest'?'FOREST':(this.destination==='swamp'?'SWAMP':(this.destination==='osd'?'OSD':'CITY')));
    return this.active?`${label} ${Math.max(0,Math.round(this.distance()))}`:''
  }
}



// ---------- VOX simulator: final navigation / bunker / reactor run ----------
// This is one continuous tutorial stage built from the normal deep-core machinery:
// normal planet approach, open-surface flight, the established bunker autopilot,
// tunnel barriers, reactor, exit door and surface-to-space extraction.
const tutorialFinalRun={
  active:false,stage:null,step:'idle',reminderKey:null,reminderT:0,reminderArmed:false,completionVoicePlayed:false,
  isActive(){return !!(this.active&&campaign.currentMission?.training&&campaign.currentStage?.()?.tutorialFinalRun)},
  isSurfaceActive(){return !!(this.isActive()&&phase==='surface'&&mode==='play')},
  reset(){this.active=false;this.stage=null;this.step='idle';this.reminderKey=null;this.reminderT=0;this.reminderArmed=false;this.completionVoicePlayed=false},
  begin(stage){
    this.reset();this.active=true;this.stage=stage||{};this.step='descent';
    campaign.activeLoadout=[null,null,null,null];campaign.activeInternalLoadout=[null,null,null,null];campaign.updateGearHud();
    shield=campaign.maxShield();shieldRegenDelay=0;shieldRegenTick=0;shieldRestoreFlashIndex=-1;shieldRestoreFlashT=0;hud();
    fighters.length=0;bolts.length=0;groundTargets.length=0;hazards.length=0;shots.length=0;playerMissiles.length=0;
    resetPlanetBearing();resetSpaceMotion();
    beginApproach()
  },
  setObjective(key,{repeat=true}={}){
    // Some tutorial instructions benefit from a reminder if the player has not yet
    // demonstrated the action. Purely descriptive corridor guidance does not: once
    // the player is already flying the tunnel, repeating "avoid obstacles" adds
    // nothing and sounds mechanical.
    this.reminderKey=repeat?key:null;this.reminderT=repeat?10:0;this.reminderArmed=false;
    audio.playVoice(key,{once:false,priority:false})
  },
  clearObjective(key){
    this.reminderKey=null;this.reminderT=0;this.reminderArmed=false;
    completeTutorialObjective(key)
  },
  updateReminder(dt){
    if(!this.reminderKey)return;
    if(!this.reminderArmed){
      if(audio.voicePlaying||audio.voiceQueue?.length||audio.voiceDelayTimer||audio.objectiveCuePendingOrBusy?.())return;
      this.reminderArmed=true;this.reminderT=10;return
    }
    this.reminderT-=dt;if(this.reminderT>0)return;
    if(audio.voicePlaying||audio.voiceQueue?.length||audio.voiceDelayTimer||audio.objectiveCuePendingOrBusy?.())return;
    audio.playVoice(this.reminderKey,{once:false,priority:false});this.reminderT=10;this.reminderArmed=false
  },
  beginSurface(){
    if(!this.isActive())return false;
    this.step='navigation';spaceOrientationReady=false;spaceYawVel=spacePitchVel=0;
    mode='play';phase='surface';phaseT=0;modeT=0;travel=0;
    surfaceNeutralYaw=viewYaw;surfaceNeutralPitch=viewPitch;
    inputX=inputY=aimX=aimY=0;surfaceVX=0;surfaceVY=0;surfaceDistance=0;
    surfaceSpawn=999;shots.length=0;playerMissiles.length=0;fighters.length=0;groundTargets.length=0;bolts.length=0;hazards.length=0;
    // Put the target well ahead but noticeably off the initial heading so the nav
    // marker has a real job to do. Unlike the combat surface, no distance collapse occurs.
    const side=Math.random()<.5?-1:1;
    entryBunkerWorldZ=318;entryBunkerX=side*(62+Math.random()*18);
    tunnelOriginX=entryBunkerX;tunnelStartWorld=entryBunkerWorldZ+.65;surfaceBunkerActive=true;
    bunkerDoorHp=BUNKER_DOOR_BASE_HP;bunkerDoorOpen=false;doorFlash=0;doorBreachAt=-1;doorBreachPending=0;doorPylonsDestroyed=BUNKER_PYLON_GOAL;
    reactorBoundaryWorld=escapeBoundaryWorld=exitDoorWorld=Infinity;reactorAnnounced=false;
    // Reuse the established plains/tree/nav renderer, but point it at the bunker.
    surfaceDestination.prepare({terrain:'plains',destination:'bunker',routeLength:318,treeClumps:11,entryRadius:36});
    surfaceDestination.targetX=entryBunkerX;surfaceDestination.targetWorldZ=entryBunkerWorldZ;surfaceDestination.destination='bunker';surfaceDestination.navPulse=0;
    this.setObjective('tutorialFollowNav');hud();return true
  },
  updateSurface(dt){
    if(!this.isSurfaceActive())return false;
    surfaceDestination.navPulse+=dt;
    const dist=surfaceBunkerDistance(),bz=entryBunkerZ(),q=camPoint([entryBunkerX,-2.2,bz]),bp=q[2]>.18?projectCam(q):null;
    const lined=bp&&bp.x>W*.18&&bp.x<W*.82&&bp.y>viewH*.12&&bp.y<viewH*.88;
    if(dist<148&&q[2]>22&&lined){
      this.clearObjective('tutorialFollowNav');this.step='entry';beginTrenchEntry();return true
    }
    return false
  },
  onTunnelBegin(){
    if(!this.isActive())return;
    // The plains helper has finished its job; retire its HUD ownership once the
    // drone is physically inside the bunker so tunnel HUD data is not polluted.
    surfaceDestination.active=false;
    this.step='corridor';this.setObjective('tutorialAvoidCorridor',{repeat:false})
  },
  onReactorReached(){
    if(!this.isActive())return;
    this.clearObjective('tutorialAvoidCorridor');this.step='reactor';this.setObjective('tutorialDestroyReactor')
  },
  onReactorDestroyed(){
    if(!this.isActive()||this.step!=='reactor')return;
    this.clearObjective('tutorialDestroyReactor');this.step='escape'
  },
  update(dt){if(this.isActive())this.updateReminder(dt)},
  drawSurfaceScene(showNav=true,{deferObjects=false}={}){
    if(!this.isActive())return false;
    surfaceDestination.drawGround();
    if(!deferObjects)surfaceDestination.drawTrees();
    if(showNav&&this.step==='navigation')surfaceDestination.drawNavigation();return true
  },
  beginCompletionZoom(){
    if(!this.isActive()||this.completionVoicePlayed)return;
    this.completionVoicePlayed=true;this.step='complete';audio.playVoice('tutorialTrainingComplete',{once:false,priority:true})
  },
  completionSpeechBusy(){return !!(this.isActive()&&(audio.voicePlaying||audio.voiceQueue?.length||audio.voiceDelayTimer||audio.objectiveCuePendingOrBusy?.()))},
  protectShieldFloor(){return !!this.isActive()}
};

// v192 — Forest corridor test stage.
// This is deliberately built as an open-air cousin of the tunnel: forward travel
// follows a fixed bending/undulating route, but the ground is the ordinary vector
// grid and the lateral boundaries are dense tree banks rather than solid walls.
