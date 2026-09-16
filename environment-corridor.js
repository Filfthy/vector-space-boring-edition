'use strict';
class CorridorEnvironmentController {
  constructor(){this.reset()}
  reset(){
    this.active=false;this.finishing=false;this.finishT=0;this.speed=20.5;this.length=650;
    this.startWorld=0;this.originX=0;this.seed=0x5f3759df;this.trees=[];this.obstacles=[];this.spitters=[];
    this.wallHitCD=0;this.suspendedMission=null;this.scenarioMode=false;this.baseCache=new WeakMap();
    this.terminalDestination=null;this.terminalState='run';this.gladeStartU=0;this.gladeCentreX=0;this.gladeFloor=-3.5;
    this.cabin=null;this.cabinMesh=null;this.cabinYaw=0;this.deliveryLocal=null;this.deliveryWorld=null;this.standOffWorld=null;
    this.relayOutpost=null;this.relayMesh=null;this.relayYaw=0;this.relayConsoleWorld=null;this.relayScreenRect=null;this.relayCalibrateT=0;this.relayCalibrateProgress=0;
    this.monolith=null;this.monolithPlinth=null;this.monolithFocusWorld=null;this.monolithStandOff=null;this.monolithYaw=0;this.monolithSpinRate=.18;this.monolithScanT=0;this.monolithScanSeconds=8;this.monolithStars=[];
    this.wreckage=[];this.recorder=null;this.recorderStandOff=null;this.dataPackets=[];this.dataSpawnT=0;this.dataT=0;this.dataDraining=false;this.dataComplete=false;
    this.deliveryT=0;this.deliveryProgress=0;this.deliveryAnnounced=false;this.deliveryLanded=false;this.devExitPending=false;this.missionSpeechStarted=false;
    this.environmentId='forest_corridor';this.environmentConfig=globalThis.AgentXEnvironments?.get?.('forest_corridor')||null;this.variant='forest';this.hostileFlora=true;
  }
  rand(){this.seed=(Math.imul(this.seed,1664525)+1013904223)>>>0;return this.seed/4294967296}
  bump(u,c,w){const t=clamp(1-Math.abs(u-c)/w,0,1);return ease(t)}
  halfWidthAt(u){
    // v195: keep the route tight over the longer run. A repeating squeeze wave
    // is layered with a handful of stronger pinch points so the second half does
    // not open out after the original v194 course length.
    const repeat=.42*(.5+.5*Math.sin(u*.061+1.2));
    const forestHalf=3.62-repeat
      -0.54*this.bump(u,62,18)
      -0.78*this.bump(u,126,20)
      -0.62*this.bump(u,194,18)
      -0.88*this.bump(u,266,21)
      -0.68*this.bump(u,342,19)
      -0.80*this.bump(u,418,21)
      -0.64*this.bump(u,492,19)
      -0.90*this.bump(u,566,22)
      -0.66*this.bump(u,626,17);
    return forestHalf+(Number(this.environmentConfig?.halfWidthBonus)||0);
  }
  rawPathAtWorld(worldZ){
    const u=worldZ-this.startWorld,gate=ease(clamp(Math.max(0,u)/22,0,1));
    const x=this.originX+(
      Math.sin(u*.041)*3.15+
      Math.sin(u*.083+.72)*1.42+
      Math.sin(u*.137+1.85)*.48
    )*gate;
    const forestFloor=-3.5+(
      Math.sin(u*.043+.2)*.82+
      Math.sin(u*.091+1.1)*.38+
      Math.sin(u*.158+.35)*.18+
      Math.sin(u*.024+2.0)*.24
    )*gate;
    const floor=Number.isFinite(Number(this.environmentConfig?.floorY))?Number(this.environmentConfig.floorY):forestFloor;
    return{x,floor,centerY:floor+1.62,half:this.halfWidthAt(u),u};
  }
  hasGladeDestination(){return this.terminalDestination==='cabin_delivery'||this.terminalDestination==='wreckage_recovery'||this.isRelayDestination()||this.isMonolithDestination()}
  isSwampVariant(){return this.environmentId==='alien_swamp'||this.variant==='alien_swamp'}
  isRelayDestination(){return this.terminalDestination==='swamp_relay_delivery'||this.terminalDestination==='swamp_relay_console'}
  isMonolithDestination(){return this.terminalDestination==='swamp_monolith_scan'}
  relayAction(){return this.terminalDestination==='swamp_relay_console'?'console':(this.terminalDestination==='swamp_relay_delivery'?'delivery':null)}
  sceneGridColor(){const key=this.environmentConfig?.scene?.gridColor;return key&&C[key]?C[key]:(this.isSwampVariant()?C.c:C.gd)}
  sceneRouteLabel(){return this.environmentConfig?.scene?.routeLabel||(this.isSwampVariant()?'ALIEN SWAMP':'FOREST ROUTE')}
  gladeBlend(worldZ){
    if(!this.hasGladeDestination())return 0;
    const u=worldZ-this.startWorld;
    return ease(clamp((u-this.gladeStartU)/Math.max(1,this.length-this.gladeStartU+18),0,1))
  }
  pathAtWorld(worldZ){
    const p=this.rawPathAtWorld(worldZ),g=this.gladeBlend(worldZ);
    if(g<=0){
      if(this.isSwampVariant())return{...p,half:p.half+(Number(this.environmentConfig?.pathHalfWidthBonus)||0)};
      return p
    }
    const targetHalf=this.isRelayDestination()?11.0:(this.isMonolithDestination()?10.2:6.2);
    const x=lerp(p.x,this.gladeCentreX,g),floor=lerp(p.floor,this.gladeFloor,g),half=lerp(p.half,targetHalf,g);
    return{x,floor,centerY:floor+1.62,half,u:p.u}
  }
  floorAt(worldZ,x){
    const p=this.pathAtWorld(worldZ),g=this.gladeBlend(worldZ);
    if(this.isSwampVariant()){
      const wide=this.isRelayDestination()||this.isMonolithDestination();
      const clearHalf=wide?lerp(5.8,9.4,g):5.8;
      const riseSpan=wide?lerp(16.5,17.2,g):16.5;
      const riseHeight=wide?lerp(1.05,.92,g):1.05;
      const dx=Math.abs(x-p.x);
      const riseT=clamp((dx-clearHalf)/riseSpan,0,1);
      const sideRise=ease(riseT)*riseHeight;
      return p.floor+sideRise;
    }
    // The wooded route keeps a little cross-slope; the final glade progressively
    // flattens so the cabin, steps and receiving deck sit on believable ground.
    const ripple=(Math.sin(x*.31+worldZ*.024)*.105+Math.sin(x*.17-worldZ*.013)*.070)*(1-g);
    return p.floor+ripple;
  }
  meshBaseY(mesh){
    if(this.baseCache.has(mesh))return this.baseCache.get(mesh);
    let y=0;if(mesh?.v?.length)y=Math.min(...mesh.v.map(v=>v[1]));
    this.baseCache.set(mesh,y);return y
  }
  treeTrunkSupport(mesh,assetId=null,obstacle=null){
    // Find the actual WOOD vertices that can form the tree's ground contact.
    // New hazard meshes carry their own wood metadata; the older healthy pines use
    // the same hard-coded wood groups as the two-colour renderer.
    if(!mesh?.v?.length)return[[0,0,0]];
    const wood=new Set();
    const layout=(Array.isArray(mesh.woodFaces)||Array.isArray(mesh.woodEdges)||mesh.woodEdges==='all')
      ?mesh:(typeof forestTreeLayerLayout!=='undefined'?forestTreeLayerLayout[assetId]:null);
    if(Array.isArray(layout?.woodFaces))for(const fi of layout.woodFaces){const f=mesh.faces?.[fi];if(f)for(const vi of f)wood.add(vi)}
    if(layout?.woodEdges==='all')for(const e of mesh.e||[]){wood.add(e[0]);wood.add(e[1])}
    else if(Array.isArray(layout?.woodEdges))for(const ei of layout.woodEdges){const e=mesh.e?.[ei];if(e){wood.add(e[0]);wood.add(e[1])}}
    const ids=wood.size?[...wood]:mesh.v.map((_,i)=>i),verts=ids.map(i=>mesh.v[i]);
    const lo=Math.min(...verts.map(v=>v[1])),hi=Math.max(...verts.map(v=>v[1])),span=Math.max(.001,hi-lo);
    const fallen=obstacle?.kind==='fallen'||/horizontal|uprooted/i.test(String(mesh.collisionHint||''));
    if(fallen){
      // A fallen trunk has a long contact strip rather than one foot. Split it along
      // its dominant horizontal axis and keep the locally-low wood from every slice.
      const minX=Math.min(...verts.map(v=>v[0])),maxX=Math.max(...verts.map(v=>v[0]));
      const minZ=Math.min(...verts.map(v=>v[2])),maxZ=Math.max(...verts.map(v=>v[2]));
      const useX=(maxX-minX)>=(maxZ-minZ),amin=useX?minX:minZ,amax=useX?maxX:maxZ,out=[];
      for(let bi=0;bi<9;bi++){
        const a0=amin+(amax-amin)*bi/9,a1=amin+(amax-amin)*(bi+1)/9+.000001;
        const slice=verts.filter(v=>{const a=useX?v[0]:v[2];return a>=a0&&a<=a1});if(!slice.length)continue;
        const localLo=Math.min(...slice.map(v=>v[1])),tol=Math.max(.018,span*.045);
        for(const v of slice)if(v[1]<=localLo+tol)out.push(v)
      }
      return out.length?out:verts.filter(v=>v[1]<=lo+span*.18+.0001)
    }
    // Upright/leaning trees use the complete low trunk foot. Use a narrow band first
    // so low branches or foliage can never be mistaken for ground supports.
    let support=verts.filter(v=>v[1]<=lo+Math.max(.025,span*.075));
    if(support.length<3)support=verts.filter(v=>v[1]<=lo+Math.max(.04,span*.14));
    return support.length?support:[verts.reduce((a,b)=>b[1]<a[1]?b:a)]
  }
  seatedTreeY(mesh,worldZ,x,scale,rotY,assetId=null,obstacle=null){
    const base=this.treeTrunkSupport(mesh,assetId,obstacle);
    // Use exactly the same scale + rotate() transform as drawMesh. This avoids the
    // placement code having its own subtly different interpretation of model space.
    const local=[];
    for(const v of base)local.push([v[0]*scale,v[1]*scale,v[2]*scale]);
    // Also sample halfway from every base vertex to the base centroid. A terrain dip
    // inside the trunk footprint can otherwise be missed when only polygon corners
    // are tested, particularly on the brow of the forest's undulating hills.
    if(local.length>1){
      const c=local.reduce((a,v)=>[a[0]+v[0],a[1]+v[1],a[2]+v[2]],[0,0,0]).map(n=>n/local.length);
      local.push(c);
      for(const v of base){const q=[v[0]*scale,v[1]*scale,v[2]*scale];local.push([(q[0]+c[0])*.5,(q[1]+c[1])*.5,(q[2]+c[2])*.5])}
    }
    let originY=Infinity;
    for(const p of local){
      const q=rotate(p,[0,rotY,0]),wx=x+q[0],wz=worldZ+q[2];
      // Highest origin for which this exact transformed support point is not above
      // the actual continuous floor directly beneath it.
      originY=Math.min(originY,this.floorAt(wz,wx)-q[1])
    }
    if(!Number.isFinite(originY))originY=this.floorAt(worldZ,x)-this.meshBaseY(mesh)*scale;
    return originY-(obstacle?.kind==='fallen'?.08:.055)
  }
  cabinLocalToWorld(local){
    if(!this.cabin)return null;
    const c=Math.cos(this.cabinYaw),s=Math.sin(this.cabinYaw),x=local[0]*c+local[2]*s,z=-local[0]*s+local[2]*c;
    return[this.cabin.x+x,this.cabin.y+local[1],this.cabin.worldZ+z]
  }
  cabinRelativePoint(local){
    const w=this.cabinLocalToWorld(local);return w?[w[0],w[1],w[2]-travel]:null
  }
  relayLocalToWorld(local){
    if(!this.relayOutpost)return null;
    const c=Math.cos(this.relayYaw),s=Math.sin(this.relayYaw),x=local[0]*c+local[2]*s,z=-local[0]*s+local[2]*c;
    return[this.relayOutpost.x+x,this.relayOutpost.y+local[1],this.relayOutpost.worldZ+z]
  }
  relayRelativePoint(local){
    const w=this.relayLocalToWorld(local);return w?[w[0],w[1],w[2]-travel]:null
  }
  setupRelayDestination(){
    this.relayMesh=swampRelayOutpostMesh;this.relayYaw=Math.PI+.04;
    this.gladeStartU=Math.max(60,this.length-44);
    const anchor=this.rawPathAtWorld(this.startWorld+this.length+6);
    this.gladeCentreX=anchor.x;this.gladeFloor=anchor.floor;
    this.relayOutpost={x:this.gladeCentreX,y:this.gladeFloor+.50,worldZ:this.startWorld+this.length+8.4,s:1.0,rot:[0,this.relayYaw,0]};
    this.deliveryLocal=this.relayMesh.deliveryPoint||[-2.30,.68,4.10];
    this.deliveryWorld=this.relayLocalToWorld(this.deliveryLocal);
    this.relayConsoleWorld=this.relayLocalToWorld(this.relayMesh.consolePoint||[2.55,1.68,4.00]);
    this.relayScreenRect=this.relayMesh.screenRect||null;
    const action=this.relayAction();
    const standOffLocal=action==='console'?(this.relayMesh.consoleStandOff||[-5.84,2.62,-10.20]):(this.relayMesh.deliveryStandOff||[2.88,2.60,-10.65]);
    this.standOffWorld=this.relayLocalToWorld(standOffLocal);
    return true
  }
  setupMonolithDestination(){
    const terminal=this.stage?.terminalConfig||{},cfg=terminal.monolith||{},stars=terminal.stars||{};
    this.gladeStartU=Math.max(60,this.length-(Number(terminal.gladeStartBeforeEnd)||52));
    const anchor=this.rawPathAtWorld(this.startWorld+this.length+(Number(terminal.anchorAhead)||7));
    this.gladeCentreX=anchor.x;this.gladeFloor=anchor.floor;
    const worldZ=this.startWorld+this.length+(Number(terminal.worldZAhead)||10.5);
    this.monolithYaw=Number.isFinite(Number(cfg.yaw))?Number(cfg.yaw):.08;this.monolithSpinRate=Number.isFinite(Number(cfg.spinRate))?Number(cfg.spinRate):.18;
    this.monolithPlinth=null;
    this.monolith={
      x:this.gladeCentreX,y:this.gladeFloor+(Number(cfg.yOffset)||5.34),worldZ,
      s:Number(cfg.scale)||.5,mx:Number(cfg.mx)||3.45,my:Number(cfg.my)||7.25,mz:Number(cfg.mz)||1.30,
      rot:[0,this.monolithYaw,0]
    };
    this.monolithFocusWorld=[this.monolith.x,this.monolith.y,this.monolith.worldZ];
    this.monolithStandOff=[this.monolith.x,this.gladeFloor+(Number(cfg.standOffHeight)||1.96),this.monolith.worldZ-(Number(cfg.standOffDistance)||14.8)];
    this.standOffWorld=this.monolithStandOff;
    this.monolithScanT=0;this.monolithScanSeconds=Math.max(5,Number(terminal.scanSeconds??this.stage?.scanSeconds)||8);
    this.monolithStars=[];
    const count=Math.max(0,Math.round(Number(stars.count)||22));
    for(let i=0;i<count;i++){
      const a=this.rand()*Math.PI*2,r=(Number(stars.radiusMin)||.40)+this.rand()*(Number(stars.radiusSpan)||1.65);
      this.monolithStars.push({
        x:Math.cos(a)*r,z:Math.sin(a)*r,phase:this.rand(),
        speed:(Number(stars.speedMin)||.18)+this.rand()*(Number(stars.speedSpan)||.16),rot:this.rand()*Math.PI*2,
        size:(Number(stars.sizeMin)||.13)+this.rand()*(Number(stars.sizeSpan)||.14)
      })
    }
    return true
  }
  setupCabinDestination(){
    const registry=globalThis.AgentXForestCabins;
    this.cabinMesh=registry?.get?.('raisedFieldCabin')||null;
    if(!this.cabinMesh){console.error('[FOREST] Missing raisedFieldCabin model');this.terminalDestination=null;return false}
    // Keep the forest corridor intact until almost the destination. The glade
    // is a compact final clearing, not a long open avenue.
    this.gladeStartU=Math.max(60,this.length-42);
    const anchor=this.rawPathAtWorld(this.startWorld+this.length+6);
    this.gladeCentreX=anchor.x;this.gladeFloor=anchor.floor;
    this.cabinYaw=-.10;
    this.cabin={x:this.gladeCentreX,y:this.gladeFloor,worldZ:this.startWorld+this.length+8,s:1.0,rot:[0,this.cabinYaw,0]};
    this.deliveryLocal=this.cabinMesh.deliveryPoint||[1.55,.93,-2.58];
    this.deliveryWorld=this.cabinLocalToWorld(this.deliveryLocal);
    // The drone stops well out in the clearing. The stand-off is authored from the
    // cabin itself, so moving/rotating the cabin never leaves a stale approach point.
    this.standOffWorld=this.cabinLocalToWorld([this.deliveryLocal[0],1.68,this.deliveryLocal[2]-8.8]);
    return true
  }
  setupWreckageDestination(){
    // Same forest->glade transition as the cabin mission, but the destination is a
    // scattered drone wreck and one surviving recorder.  The player never has to
    // manoeuvre precisely among debris: crossing into the glade hands control to
    // the scripted approach immediately.
    this.gladeStartU=Math.max(60,this.length-48);
    const anchor=this.rawPathAtWorld(this.startWorld+this.length+6);
    this.gladeCentreX=anchor.x;this.gladeFloor=anchor.floor;
    const rz=this.startWorld+this.length+7.0,rx=this.gladeCentreX+.55;
    this.recorder={x:rx,y:this.gladeFloor+.24,worldZ:rz,rot:[.10,-.32,.05]};
    this.recorderStandOff=[rx,this.gladeFloor+1.70,rz-9.4];
    this.standOffWorld=this.recorderStandOff;
    const pieces=[
      {x:-4.7,z:-2.8,s:1.35,rot:[.18,.65,1.02],col:C.w},
      {x:-3.1,z: 1.2,s:.92, rot:[-.10,1.48,-.34],col:C.r},
      {x:-1.7,z:-4.7,s:1.10,rot:[.26,-.38,.72],col:C.w},
      {x: 2.4,z:-3.5,s:1.26,rot:[-.18,.84,-.88],col:C.w},
      {x: 4.1,z: .2,s:.86, rot:[.32,-1.14,.24],col:C.r},
      {x: 5.0,z:-5.8,s:1.02,rot:[-.14,.32,1.18],col:C.w},
      {x: 1.8,z: 2.4,s:.74, rot:[.40,1.70,-.12],col:C.w},
      {x:-5.5,z: 3.1,s:.78, rot:[-.24,-.72,.46],col:C.w}
    ];
    this.wreckage=pieces.map((q,i)=>{
      const worldZ=rz+q.z,x=this.gladeCentreX+q.x,y=this.floorAt(worldZ,x)+.18+q.s*.08;
      return{type:'forestWreckage',id:`wreck-${i}`,x,y,worldZ,s:q.s,rot:q.rot,col:q.col}
    });
    this.dataPackets.length=0;this.dataSpawnT=0;this.dataT=0;this.dataDraining=false;this.dataComplete=false;
    return true
  }
  resetRecorderData(){audio?.hackChirp?.stop?.();this.dataPackets.length=0;this.dataSpawnT=0;this.dataT=0;this.dataDraining=false;this.dataComplete=false}
  resetRelayCalibration(){audio?.hackChirp?.stop?.();this.relayCalibrateT=0;this.relayCalibrateProgress=0;this.dataPackets.length=0;this.dataSpawnT=0;this.dataT=0;this.dataDraining=false;this.dataComplete=false}
  spawnRecorderPacket(initial=false){
    // Use the exact secure-terminal packet generator so recorder recovery has the
    // same cadence, packet sizing and parallel-burst behaviour. Only the endpoints
    // and direction differ when rendered.
    this.dataPackets.push(...stationHack.makeDataPacketGroup(initial))
  }
  startRecorderDownload(){
    this.resetRecorderData();
    for(let i=0;i<5;i++)this.spawnRecorderPacket(true);
    this.dataSpawnT=.10+Math.random()*.18;
    audio?.hackChirp?.start?.()
  }
  startRelayCalibration(){
    this.resetRelayCalibration();
    for(let i=0;i<5;i++)this.spawnRecorderPacket(true);
    this.dataSpawnT=.10+Math.random()*.18;
    audio?.hackChirp?.start?.()
  }
  updateRecorderDownload(dt){
    this.dataT+=dt;
    for(let i=this.dataPackets.length-1;i>=0;i--){const p=this.dataPackets[i];p.u+=p.speed*dt;if(p.u>=1)this.dataPackets.splice(i,1)}
    if(this.dataT>=3.25)this.dataDraining=true;
    if(!this.dataDraining){
      this.dataSpawnT-=dt;
      while(this.dataSpawnT<=0&&this.dataPackets.length<16){this.spawnRecorderPacket(false);this.dataSpawnT+=.14+Math.random()*.31}
    }
    if(this.dataDraining&&!this.dataPackets.length&&!this.dataComplete){
      this.dataComplete=true;audio?.hackChirp?.stop?.();SoundFX.objectiveComplete();say('FLIGHT RECORDER DATA RECOVERED',.95);this.terminalState='dataHold';this.finishT=0
    }
  }
  updateRelayCalibration(dt){
    this.relayCalibrateT+=dt;this.dataT+=dt;
    for(let i=this.dataPackets.length-1;i>=0;i--){const p=this.dataPackets[i];p.u+=p.speed*dt;if(p.u>=1)this.dataPackets.splice(i,1)}
    if(this.dataT>=3.05)this.dataDraining=true;
    if(!this.dataDraining){
      this.dataSpawnT-=dt;
      while(this.dataSpawnT<=0&&this.dataPackets.length<16){this.spawnRecorderPacket(false);this.dataSpawnT+=.14+Math.random()*.31}
    }
    this.relayCalibrateProgress=ease(clamp(this.dataT/3.05,0,1));
    if(this.dataDraining&&!this.dataPackets.length&&!this.dataComplete){
      this.dataComplete=true;audio?.hackChirp?.stop?.();SoundFX.relayCalibrated?.();this.terminalState='consoleHold';this.finishT=0
    }
  }
  autopilotActive(){
    if(!this.active)return false;
    if(this.terminalDestination==='cabin_delivery'||this.isRelayDestination()||this.isMonolithDestination())return this.terminalState!=='run'&&this.terminalState!=='glade';
    if(this.terminalDestination==='wreckage_recovery')return this.terminalState!=='run';
    return false
  }
  forwardSpeed(){
    if(!this.hasGladeDestination())return this.finishing?0:this.speed;
    if(this.terminalState==='run'){
      const g=this.gladeBlend(travel+14);return lerp(this.speed,11.0,g)
    }
    if(this.terminalState==='glade'){
      const remain=Math.max(0,(this.standOffWorld?.[2]??travel)-travel);return clamp(remain*.38,5.2,11.0)
    }
    if(this.terminalState==='approach'){
      const remain=Math.max(0,(this.standOffWorld?.[2]??travel)-travel);return remain<.18?0:clamp(remain*.52,.6,7.4)
    }
    return 0
  }
  addTree(id,worldZ,x,scale,rotY=0,obstacle=null){
    const swamp=this.isSwampVariant();
    const registry=swamp?globalThis.AgentXAlienSwampScenery:globalThis.AgentXForestScenery;
    const fallback=swamp?(typeof alienSwampSceneryMesh==='function'?alienSwampSceneryMesh(id):null):(typeof forestSceneryMesh==='function'?forestSceneryMesh(id):null);
    const baseMesh=registry?.get?.(id)||fallback;
    if(!baseMesh){console.error(`[FOREST] Missing scenery mesh: ${id}`);return null}
    const y=this.seatedTreeY(baseMesh,worldZ,x,scale,rotY,id,obstacle);
    const pineOptimised=!swamp&&!obstacle&&(id==='pineTall'||id==='pineBroad'||id==='pineYoung');
    const mesh=pineOptimised?forestShortTrunkMesh(baseMesh,id):baseMesh;
    let corridorMesh=null;
    if(pineOptimised&&this.gladeBlend(worldZ)<.02){
      const centreX=this.pathAtWorld(worldZ).x,bankSide=x<centreX?-1:1;
      corridorMesh=forestCorridorHalfMesh(mesh,id,rotY,-bankSide)
    }
    const explicit=resolvePaletteColor(baseMesh.singleColorKey)||resolvePaletteColor(baseMesh.colorKey)||null;
    const tree={type:'forestTree',id:`forest-${this.trees.length}`,assetId:id,mesh,corridorMesh,worldZ,x,y,z:worldZ-travel,s:scale,rot:[0,rotY,0],col:explicit||C.g,dead:false,obstacle,passed:false};
    // Fifteen per cent of reeds use one of the approved alien accent colours.
    // Derive this from position/id rather than consuming the course RNG, so the
    // colour experiment does not reshuffle the established swamp layout.
    if(swamp&&String(id).startsWith('swampReed')){
      const idSalt=String(id).split('').reduce((a,c)=>a+c.charCodeAt(0),0);
      const h=Math.abs(Math.sin(worldZ*12.9898+x*78.233+idSalt*37.719)*43758.5453)%1;
      if(h<.15){const accent=[C.o,C.y,C.m];tree.col=accent[Math.min(2,Math.floor(h/.15*3))]}
    }
    this.trees.push(tree);if(obstacle)this.obstacles.push(tree);return tree
  }
  addSwampSpitter(id,worldZ,x,scale,side=1){
    const approachWorldZ=worldZ-20;
    const approach=this.pathAtWorld(approachWorldZ);
    const faceYaw=Math.atan2(approach.x-x,approachWorldZ-worldZ);
    const plant=this.addTree(id,worldZ,x,scale,faceYaw);
    if(!plant)return null;

    const restRoll=-side*(.30+this.rand()*.08);
    const attackRoll=side*(.86+this.rand()*.14);

    plant.rot=[0,faceYaw,restRoll];
    plant.swampSpitter=true;
    plant.spitterSide=side;
    plant.spitterPivotX=x;
    plant.spitterBaseYaw=faceYaw;
    plant.spitterRestRoll=restRoll;
    plant.spitterAttackRoll=attackRoll;
    plant.spitterExtend=0;
    plant.spitterState='retracted';
    plant.spitterStateT=.22+this.rand()*.55;
    plant.spitterNoLosT=0;
    plant.spitterShots=0;
    plant.spitterMaxShots=this.rand()<.42?3:2;
    plant.spitterSeatOffset=plant.y-this.floorAt(worldZ,x);
    plant.spitterSwayPhase=this.rand()*Math.PI*2;
    plant.spitterSwayRate=.9+this.rand()*.8;
    plant.spitterSwayAmp=.035+this.rand()*.02;
    plant.spitterAimOffset=(this.rand()-.5)*.06;
    plant.spitterRecoil=0;
    plant.spitterTempo=.92+this.rand()*.16;

    plant.hp=2;plant.maxHp=2;plant.hitFx=0;
    plant.fireCD=.14+this.rand()*.28;
    plant.firePulse=0;
    this.spitters.push(plant);
    return plant
  }
  spitterShotCandidate(aim,bestDistance=1e9){
    if(!this.active||!this.isSwampVariant())return null;
    let best=null;
    for(const plant of this.spitters){
      if(plant.dead||plant.dying)continue;
      const z=plant.worldZ-travel;if(z<.4||z>110)continue;
      const h=this.swampSpitterHeadWorld(plant),p=proj([h.x,h.y,h.z]);if(!p)continue;
      const d=Math.hypot(aim.x-p.x,aim.y-p.y),r=clamp(plant.s*p.k*.72,18,68);
      if(d<r&&d<bestDistance){best={plant,point:p,distance:d};bestDistance=d}
    }
    return best
  }
  hitSwampSpitter(plant,p){
    if(!plant||plant.dead)return;
    if(oneShotLasers)plant.hp=1;
    plant.hp=Math.max(0,(plant.hp||2)-1);plant.hitFx=HIT_FX_TOTAL;
    spark(p.x,p.y,C.r,9);
    if(plant.hp<=0){
      plant.dead=true;
      if(typeof explodeMesh==='function')explodeMesh(plant,plant.mesh,p,C.r);
      else SoundFX.explosion()
    }else SoundFX.hit()
  }
  swampSpitterHeadWorld(plant){
    const q=rotate([0,plant.s*1.52,0],plant.rot||[0,0,0]);
    return {x:plant.x+q[0],y:plant.y+q[1],worldZ:plant.worldZ+q[2],z:(plant.worldZ+q[2])-travel}
  }
  swampSpitterHasLineOfSight(plant){
    const h=this.swampSpitterHeadWorld(plant),sx=h.x,sy=h.y,sz=h.worldZ;
    const ex=shipX,ey=shipY,ez=travel;
    const vx=ex-sx,vz=ez-sz,len2=vx*vx+vz*vz;
    if(len2<.001)return true;

    // Terrain can hide a low flower when the outer swamp bank rises between it and the drone.
    for(let t=.14;t<.92;t+=.13){
      const x=sx+vx*t,wz=sz+vz*t,y=sy+(ey-sy)*t;
      if(this.floorAt(wz,x)>y-.06)return false
    }

    // Broad reeds and the larger alien flora are real visual cover.
    for(const obj of this.trees){
      if(obj===plant||obj.dead||obj.dying||obj.swampSpitter)continue;
      const ox=obj.x,oz=obj.worldZ;
      const t=((ox-sx)*vx+(oz-sz)*vz)/len2;
      if(t<=.06||t>=.94)continue;
      const px=sx+vx*t,pz=sz+vz*t,dx=ox-px,dz=oz-pz;
      const reed=String(obj.assetId||'').startsWith('swampReed');
      const radius=(reed?.13:.20)*obj.s*(obj.mx||1);
      if(dx*dx+dz*dz>radius*radius)continue;
      let localMin=Infinity,localMax=-Infinity;
      for(const v of obj.mesh?.v||[]){
        localMin=Math.min(localMin,v[1]);localMax=Math.max(localMax,v[1])
      }
      if(!Number.isFinite(localMin)||!Number.isFinite(localMax))continue;
      const scaleY=obj.s*(obj.my||1);
      const minY=obj.y+localMin*scaleY,maxY=obj.y+localMax*scaleY;
      const lineY=sy+(ey-sy)*t;
      if(lineY>=minY-.05&&lineY<=maxY+.05)return false
    }
    return true
  }
  fireSwampSpit(plant){
    if(plant.dead)return false;
    const h=this.swampSpitterHeadWorld(plant),mouthX=h.x,mouthY=h.y,z=h.z;
    if(z<26||z>105)return false;
    if(!this.swampSpitterHasLineOfSight(plant))return false;
    if(bolts.filter(b=>!b.dead&&b.swampSpit).length>=3)return false;
    const currentDx=shipX-mouthX,currentDy=shipY-mouthY,dz=-z,d=Math.max(1,Math.hypot(currentDx,currentDy,dz));
    // Lob the spit rather than firing it down the ordinary forward laser lane.
    // Flight time is intentionally readable, and the target is predicted once at
    // launch from the current steering/path. After launch there is NO homing.
    const flightTime=lerp(1.55,2.35,clamp((d-26)/(105-26),0,1));
    const futureWorld=travel+this.forwardSpeed()*flightTime;
    const futurePath=this.pathAtWorld(futureWorld+1.2);
    const authority=this.hasGladeDestination()?lerp(1,.62,this.gladeBlend(futureWorld+10)):1;
    const tx=futurePath.x+inputX*Math.max(.55,futurePath.half-.62)*authority;
    const futureFloor=this.floorAt(futureWorld+1.2,tx);
    const ty=clamp(futureFloor+1.62-inputY*1.08*authority,futureFloor+.55,futureFloor+2.78);
    const tz=0;
    // Choose gravity from a desired apex above the straight intercept line. The
    // resulting parabola rises cleanly over the bank/reeds, then drops into the
    // corridor.  y(T) still lands exactly on the predicted target height.
    const arcHeight=clamp(4.8+d*.055,5.8,9.4);
    const gravity=-8*arcHeight/(flightTime*flightTime);
    const initialVy=(ty-mouthY-.5*gravity*flightTime*flightTime)/flightTime;
    bolts.push({
      x:mouthX,y:mouthY,z,spawnDistance:d,targetX:tx,targetY:ty,targetZ:tz,hitIntent:true,
      vx:(tx-mouthX)/flightTime,vy:initialVy,vz:(tz-z)/flightTime,homing:0,ballisticGravity:gravity,
      rot:this.rand()*Math.PI*2,rotSpeed:4+this.rand()*2,dead:false,visibleFor:0,visibleNow:false,
      age:0,maxLife:flightTime+1.0,style:'toxicSpit',col:C.m,accentCol:C.y,visualScale:1.85,damageLabel:'TOXIC SPIT',swampSpit:true
    });
    plant.firePulse=.20;
    plant.spitterRecoil=1;
    SoundFX.swampSpit?.();
    return true
  }
  updateSwampSpitters(dt){
    const backEase=t=>{
      t=clamp(t,0,1);
      const c1=1.70158,c3=c1+1;
      return 1+c3*Math.pow(t-1,3)+c1*Math.pow(t-1,2)
    };
    for(const plant of this.spitters){
      if(plant.dead)continue;
      const z=plant.worldZ-travel;
      plant.z=z;
      plant.hitFx=Math.max(0,(plant.hitFx||0)-dt);
      plant.firePulse=Math.max(0,(plant.firePulse||0)-dt);
      plant.fireCD=(plant.fireCD||0)-dt;
      plant.spitterStateT=Math.max(0,(plant.spitterStateT||0)-dt);
      plant.spitterRecoil=Math.max(0,(plant.spitterRecoil||0)-dt*5.5);
      plant.spitterSwayT=(plant.spitterSwayT||0)+dt;

      const inEncounter=z>24&&z<108;
      if(!inEncounter&&plant.spitterState!=='retracted')plant.spitterState='retracting';

      if(plant.spitterState==='retracted'){
        plant.spitterExtend=0;
        if(inEncounter&&plant.spitterStateT<=0){
          plant.spitterState='extending';
          plant.spitterAnimT=0;
          plant.spitterAnimDur=.58+this.rand()*.16;
          plant.spitterStateT=plant.spitterAnimDur;
          plant.spitterShots=0;
          plant.spitterMaxShots=this.rand()<.48?3:2;
          plant.spitterNoLosT=0
        }
      }else if(plant.spitterState==='extending'){
        plant.spitterAnimT=(plant.spitterAnimT||0)+dt;
        plant.spitterExtend=clamp(backEase((plant.spitterAnimT||0)/(plant.spitterAnimDur||.66)),0,1.08);
        if((plant.spitterAnimT||0)>=(plant.spitterAnimDur||.66)){
          plant.spitterExtend=1;
          plant.spitterState='exposed';
          plant.spitterStateT=3.8+this.rand()*.8;
          plant.fireCD=Math.min(plant.fireCD,.12+this.rand()*.16)
        }
      }else if(plant.spitterState==='exposed'){
        const los=this.swampSpitterHasLineOfSight(plant);
        plant.spitterNoLosT=los?0:(plant.spitterNoLosT||0)+dt;

        if(los&&plant.fireCD<=0&&plant.spitterShots<(plant.spitterMaxShots||2)){
          if(this.fireSwampSpit(plant))plant.spitterShots++;
          plant.fireCD=(.95+this.rand()*.38)*(plant.spitterTempo||1)
        }

        if(((plant.spitterShots>=(plant.spitterMaxShots||2)&&plant.fireCD<.50)||plant.spitterNoLosT>.72||plant.spitterStateT<=0)){
          plant.spitterState='retracting';
          plant.spitterAnimT=0;
          plant.spitterAnimDur=.62+this.rand()*.18;
          plant.spitterStateT=plant.spitterAnimDur
        }
      }else if(plant.spitterState==='retracting'){
        plant.spitterAnimT=(plant.spitterAnimT||0)+dt;
        plant.spitterExtend=clamp(1-ease((plant.spitterAnimT||0)/(plant.spitterAnimDur||.70)),0,1);
        if((plant.spitterAnimT||0)>=(plant.spitterAnimDur||.70)){
          plant.spitterExtend=0;
          plant.spitterState='retracted';
          plant.spitterStateT=.55+this.rand()*.95;
          plant.spitterShots=0;
          plant.spitterNoLosT=0
        }
      }

      const q=clamp(plant.spitterExtend||0,0,1.08);
      const sway=Math.sin((plant.spitterSwayT*(plant.spitterSwayRate||1))+(plant.spitterSwayPhase||0))*(plant.spitterSwayAmp||0);
      const baseRoll=lerp(plant.spitterRestRoll,plant.spitterAttackRoll,Math.min(1,q));
      const overshoot=q>1?(q-1)*(plant.spitterSide<0?-1:1)*.22:0;
      const recoil=-(plant.spitterSide<0?-1:1)*.12*(plant.spitterRecoil||0);

      plant.x=plant.spitterPivotX;
      plant.y=this.floorAt(plant.worldZ,plant.x)+(plant.spitterSeatOffset||0);

      // Mild "look alive" behaviour: a little bank sway at rest and a small
      // yaw adjustment while exposed, without abandoning the rigid vector look.
      let targetYaw=plant.spitterBaseYaw+(plant.spitterAimOffset||0);
      if(plant.spitterState==='extending'||plant.spitterState==='exposed'){
        const directYaw=Math.atan2(shipX-plant.x,travel-plant.worldZ);
        targetYaw=plant.spitterBaseYaw+clamp(wrapAngle(directYaw-plant.spitterBaseYaw),-.20,.20)+(plant.spitterAimOffset||0)
      }
      plant.rot[1]=wrapAngle(plant.rot[1]+clamp(wrapAngle(targetYaw-plant.rot[1]),-dt*.90,dt*.90));
      plant.rot[2]=baseRoll+overshoot+recoil+(plant.spitterState==='retracted'?sway:sway*.35)
    }
  }
  buildAlienSwampCourse(){
    const accentIds=['alienBulbPlantConnected','alienUmbrellaPlantConnected','alienEggPodFat','alienEggClusterFat'];
    const spitterIds=['swampSpitterFlower'];
    const reedIds=['swampReedTall','swampReedFan','swampReedWide','swampReedSpike'];
    const addReed=(id,wz,x,s,rot,profile='mid')=>{
      const t=this.addTree(id,wz,x,s,rot);
      if(!t)return null;
      const tall=profile==='inner'?2.50+this.rand()*.95:profile==='outer'?2.25+this.rand()*.90:2.38+this.rand()*.95;
      const fat=profile==='inner'?1.28+this.rand()*.26:profile==='outer'?1.22+this.rand()*.28:1.18+this.rand()*.24;
      const deep=1.05+this.rand()*.20;
      t.my=tall;t.mx=fat;t.mz=deep;
      return t
    };
    // Add a modest extra bank population without consuming the mission RNG and
    // without narrowing the flyable route.  Supplemental reeds always start well
    // outside p.half, so even the widest scaled blade cannot intrude across the
    // main path.
    const reedHash=(a,b,c=0)=>Math.abs(Math.sin(a*12.9898+b*78.233+c*37.719)*43758.5453)%1;
    const addSupplementalReed=(wz,p,side,i)=>{
      const h=reedHash(wz,p.x,side*17+i*.31);if(h>=.42)return;
      const h2=reedHash(wz+11.7,p.x-5.3,side*29+i*.73),h3=reedHash(wz-7.1,p.x+9.2,side*43+i*.19);
      const id=reedIds[Math.min(reedIds.length-1,Math.floor(h2*reedIds.length))];
      const x=p.x+side*(p.half+1.75+h3*2.65);
      const s=1.58+h2*.78,rot=h3*Math.PI*2;
      const t=this.addTree(id,wz+(h2-.5)*1.8,x,s,rot);if(!t)return;
      t.my=2.34+h3*.82;t.mx=1.18+h2*.25;t.mz=1.05+h*.18;
    };
    const step=5.2,max=this.length+70;
    for(let u=8,i=0;u<=max;u+=step,i++){
      const wz=this.startWorld+u,p=this.pathAtWorld(wz);
      const inRelayClearing=(this.isRelayDestination()||this.isMonolithDestination())&&u>this.gladeStartU-8;
      for(const side of [-1,1]){
        // In the clearing, these become the actual foliage boundary: keep the same
        // swamp language but place the inner row just OUTSIDE the widened glade.
        const innerBase=p.x+side*(p.half+(inRelayClearing?.42:.20)+this.rand()*.42);
        const innerCount=inRelayClearing?2:(1+(this.rand()<.46?1:0));
        for(let j=0;j<innerCount;j++){
          const id=reedIds[(this.rand()*reedIds.length)|0];
          const x=innerBase+side*(j*(.92+this.rand()*.70)+this.rand()*.36);
          addReed(id,wz+(this.rand()-.5)*1.9,x,1.50+this.rand()*1.10,this.rand()*Math.PI*2,'inner')
        }
        if(inRelayClearing||this.rand()<.52){
          const id=reedIds[(this.rand()*reedIds.length)|0];
          const x=p.x+side*(p.half+2.8+this.rand()*6.0);
          addReed(id,wz+(this.rand()-.5)*2.8,x,1.78+this.rand()*1.35,this.rand()*Math.PI*2,'mid')
        }
        if(inRelayClearing||this.rand()<.74){
          const id=reedIds[(this.rand()*reedIds.length)|0];
          const x=p.x+side*(p.half+8.5+this.rand()*10.5);
          addReed(id,wz+(this.rand()-.5)*3.2,x,2.05+this.rand()*1.50,this.rand()*Math.PI*2,'outer')
        }
        if(this.rand()<.42){
          const id=reedIds[(this.rand()*reedIds.length)|0];
          const x=p.x+side*(p.half+18.0+this.rand()*10.0);
          addReed(id,wz+(this.rand()-.5)*3.6,x,2.25+this.rand()*1.65,this.rand()*Math.PI*2,'outer')
        }
        if(!inRelayClearing)addSupplementalReed(wz,p,side,i);
        // Keep combat flowers out of the destination clearing. The surrounding
        // foliage remains ordinary scenery while the approach is under autopilot.
        const shooterSide=((Math.floor(i/7)&1)===0?-1:1);
        const mainShooter=(i%7===0&&side===shooterSide);
        const pairedShooter=(i%14===7&&side===-shooterSide&&this.rand()<.32);
        if(this.hostileFlora&&!inRelayClearing&&(mainShooter||pairedShooter)){
          const id=spitterIds[(this.rand()*spitterIds.length)|0];
          const x=p.x+side*(p.half+.30+this.rand()*.42);
          this.addSwampSpitter(id,wz+(this.rand()-.5)*1.6,x,1.38+this.rand()*.60,side)
        }
        if(i%3===0||this.rand()<(inRelayClearing?.32:.20)){
          const id=accentIds[(this.rand()*accentIds.length)|0];
          const x=p.x+side*(p.half+.20+this.rand()*1.75);
          const s=id==='alienEggClusterFat'?(1.05+this.rand()*.34):(1.14+this.rand()*.72);
          this.addTree(id,wz+(this.rand()-.5)*2.6,x,s,(this.rand()-.5)*.65)
        }
      }
    }
    const mouthTarget=this.hasGladeDestination()?((this.isRelayDestination()||this.isMonolithDestination())?7.2:8.3):null;
    for(let u=-34;u<=10;u+=6.0){
      const wz=this.startWorld+u,p=this.pathAtWorld(wz),t=ease(clamp((u+34)/44,0,1)),mouthHalf=lerp(13.0,mouthTarget??(p.half+.30),t);
      for(const side of [-1,1]){
        addReed(reedIds[(this.rand()*reedIds.length)|0],wz+(this.rand()-.5)*1.6,p.x+side*(mouthHalf+this.rand()*.34),1.55+this.rand()*1.00,this.rand()*Math.PI*2,'inner');
        if(this.rand()<.54)addReed(reedIds[(this.rand()*reedIds.length)|0],wz+(this.rand()-.5)*2.0,p.x+side*(mouthHalf+2.4+this.rand()*2.4),1.82+this.rand()*1.20,this.rand()*Math.PI*2,'mid');
        if(this.rand()<.72)addReed(reedIds[(this.rand()*reedIds.length)|0],wz+(this.rand()-.5)*2.6,p.x+side*(mouthHalf+8.0+this.rand()*8.0),2.05+this.rand()*1.30,this.rand()*Math.PI*2,'outer');
        if(this.rand()<.38)addReed(reedIds[(this.rand()*reedIds.length)|0],wz+(this.rand()-.5)*3.1,p.x+side*(mouthHalf+18.0+this.rand()*9.0),2.28+this.rand()*1.45,this.rand()*Math.PI*2,'outer');
      }
    }
  }
  buildSwampRelayClearing(){
    if(!this.isRelayDestination()&&!this.isMonolithDestination())return;
    const base=this.isMonolithDestination()?(this.monolith?.worldZ??(this.startWorld+this.length+10.5)):(this.relayOutpost?.worldZ??(this.startWorld+this.length+8.4));
    const reedIds=['swampReedTall','swampReedFan','swampReedWide','swampReedSpike'];
    const accentIds=['alienBulbPlantConnected','alienUmbrellaPlantConnected','alienEggPodFat','alienEggClusterFat'];
    const add=(x,z,i,outer=false)=>{
      const id=reedIds[i%reedIds.length],s=(outer?2.18:2.40)+this.rand()*.52;
      this.addTree(id,base+z,this.gladeCentreX+x,s,(this.rand()-.5)*.22);
      if(i%4===1){
        const aid=accentIds[(i>>1)%accentIds.length];
        this.addTree(aid,base+z+(this.rand()-.5)*.75,this.gladeCentreX+x+(this.rand()-.5)*1.0,1.22+this.rand()*.38,(this.rand()-.5)*.32)
      }
    };
    // Rear bank just beyond the platform's back edge. This closes the clearing
    // without creating a huge field behind the station.
    let i=0;
    for(let x=-12.6;x<=12.6;x+=1.55,i++)add(x,6.75+(i%2)*.28,i,false);
    i=0;
    for(let x=-11.8;x<=11.8;x+=1.85,i++)add(x,8.45+(i%2)*.24,i+40,true)
  }

  buildCourse(){
    this.trees.length=0;this.obstacles.length=0;this.spitters.length=0;this.seed=0x5f3759df;
    if(this.isSwampVariant()){this.buildAlienSwampCourse();this.buildSwampRelayClearing();return}
    // v194: denser banks and a tighter cadence. Only nearby trees are rendered,
    // so the extra forest density does not mean the whole course is drawn at once.
    const step=4.35,max=this.length+70;
    for(let u=10,i=0;u<=max;u+=step,i++){
      const wz=this.startWorld+u,p=this.pathAtWorld(wz);
      const glade=this.hasGladeDestination()?this.gladeBlend(wz):0,spread=glade*2.8;
      for(const side of [-1,1]){
        const inner=p.x+side*(p.half+.38+spread+this.rand()*.32);
        const outer=p.x+side*(p.half+1.42+spread*1.18+this.rand()*.62);
        const innerId=this.rand()<.64?'pineTall':'pineBroad';
        const outerId=this.rand()<.22?'pineYoung':(this.rand()<.13?'pineDeadSparse':'pineTall');
        // v195: a visibly broader height range stops the banks looking stamped out.
        // Uniform mesh scale is retained so the assets stay compatible with the
        // existing hidden-line renderer; occasional very tall trees punctuate the skyline.
        const innerScale=(this.rand()<.14?2.95+this.rand()*.55:1.62+this.rand()*1.18);
        const outerScale=(this.rand()<.12?2.80+this.rand()*.52:1.38+this.rand()*1.32);
        this.addTree(innerId,wz+(this.rand()-.5)*1.2,inner,innerScale,this.rand()*Math.PI*2);
        this.addTree(outerId,wz+(this.rand()-.5)*2.0,outer,outerScale,this.rand()*Math.PI*2);
        if(i%2===0){
          const back=p.x+side*(p.half+2.55+spread*1.35+this.rand()*.82);
          const id=this.rand()<.18?'pineDeadSparse':(this.rand()<.32?'pineYoung':'pineBroad');
          const backScale=(this.rand()<.10?2.72+this.rand()*.48:1.18+this.rand()*1.42);
          this.addTree(id,wz+(this.rand()-.5)*2.6,back,backScale,this.rand()*Math.PI*2)
        }
      }
    }
    // v194: the route itself is now populated with trees. These are intentionally
    // frequent and alternate across the centre line, making the player weave almost
    // continuously rather than merely steering around four showcase obstacles.
    const specs=[
      // Preserve the original healthy-tree cadence exactly. Only the old special
      // snapped / leaning / dead / fallen hazard assets are substituted below.
      {u:30, off:-.78,id:'pineBroad',                    s:2.22,r:.78,kind:'upright'},
      {u:48, off: .92,id:'pineTall',                     s:2.56,r:.72,kind:'upright'},
      {u:67, off:-.22,id:'forestHazardJaggedSnapped',   s:2.12,r:.66,kind:'upright'},
      {u:84, off:1.02,id:'pineBroad',                    s:2.48,r:.80,kind:'upright'},
      {u:101,off:-1.05,id:'forestHazardLeaningSpear',   s:2.30,r:.82,kind:'upright'},
      {u:121,off: .18,id:'pineTall',                     s:2.72,r:.72,kind:'upright'},
      {u:139,off:-.96,id:'forestHazardCrookedDeadwood', s:2.12,r:.64,kind:'upright'},
      {u:157,off: .86,id:'pineBroad',                    s:2.66,r:.80,kind:'upright'},
      {u:177,off:-.12,id:'forestHazardHalfFallen',      s:2.24,r:.78,kind:'upright'},
      {u:195,off:1.02,id:'forestHazardBrokenCrown',     s:1.92,r:.68,kind:'upright'},
      {u:214,off:-.98,id:'pineBroad',                    s:2.74,r:.82,kind:'upright'},
      {u:234,off: .08,id:'pineTall',                     s:2.98,r:.74,kind:'upright'},
      {u:252,off: .98,id:'forestHazardWidowmaker',      s:2.18,r:.82,kind:'upright'},
      {u:270,off:-1.02,id:'pineBroad',                   s:2.46,r:.82,kind:'upright'},
      {u:289,off: .12,id:'forestHazardDeadFork',        s:2.02,r:.68,kind:'upright'},
      {u:307,off:-.92,id:'pineTall',                     s:3.02,r:.74,kind:'upright'},
      {u:326,off: .58,id:'forestHazardFallenBarrier',   s:1.68,r:2.22,kind:'fallen'},
      {u:350,off:-.20,id:'pineBroad',                    s:2.54,r:.82,kind:'upright'},
      {u:369,off: .96,id:'pineTall',                     s:2.88,r:.74,kind:'upright'},
      {u:389,off:-1.00,id:'forestHazardLeaningSpear',   s:2.22,r:.80,kind:'upright'},
      {u:409,off: .10,id:'forestHazardSplitStumpCluster',s:2.42,r:.64,kind:'upright'},
      {u:429,off:-.88,id:'pineBroad',                    s:2.80,r:.82,kind:'upright'},
      {u:449,off: .86,id:'forestHazardJaggedSnapped',   s:2.06,r:.68,kind:'upright'},
      {u:470,off:-.08,id:'pineTall',                     s:3.08,r:.74,kind:'upright'},
      {u:490,off:1.00,id:'pineBroad',                    s:2.38,r:.82,kind:'upright'},
      {u:511,off:-.98,id:'forestHazardHalfFallen',      s:2.34,r:.82,kind:'upright'},
      {u:532,off: .18,id:'pineTall',                     s:2.74,r:.74,kind:'upright'},
      {u:553,off:-.84,id:'pineBroad',                    s:2.92,r:.82,kind:'upright'},
      {u:575,off: .92,id:'forestHazardCrookedDeadwood', s:2.20,r:.64,kind:'upright'},
      {u:597,off:-.12,id:'forestHazardBrokenCrown',     s:2.18,r:.68,kind:'upright'},
      {u:618,off: .86,id:'pineTall',                     s:3.16,r:.74,kind:'upright'},
      {u:637,off:-.48,id:'forestHazardUprootedPine',    s:1.72,r:2.25,kind:'fallen'}
    ];
    for(const q of specs){
      if(this.hasGladeDestination()&&q.u>this.gladeStartU-8)continue;
      const wz=this.startWorld+q.u,p=this.pathAtWorld(wz),x=p.x+q.off;
      this.addTree(q.id,wz,x,q.s,q.kind==='fallen'?.10:(q.off<0?.18:-.18),{kind:q.kind,radius:q.r})
    }
    if(this.hasGladeDestination()){
      // Frame the destination with a rear tree line so the glade feels contained
      // rather than opening into a featureless field.
      const backBase=this.terminalDestination==='cabin_delivery'&&this.cabin?this.cabin.worldZ+4.2:(this.recorder?.worldZ??(this.startWorld+this.length+7))+8.0;
      const row=[
        // Dense first bank immediately behind the clearing.
        {x:-12.0,z: 0.2,id:'pineTall',s:3.04,r:.06},{x:-10.1,z:-.7,id:'pineBroad',s:2.66,r:-.08},
        {x:-8.1,z:  .8,id:'pineYoung',s:2.18,r:.03},{x:-6.2,z:-.3,id:'pineTall',s:2.86,r:.11},
        {x:-4.3,z:  .5,id:'pineBroad',s:2.52,r:-.05},{x:-2.45,z:-.5,id:'pineTall',s:2.74,r:.08},
        {x: 2.55,z: .4,id:'pineBroad',s:2.48,r:-.07},{x: 4.45,z:-.6,id:'pineTall',s:2.92,r:.04},
        {x: 6.35,z: .7,id:'pineYoung',s:2.12,r:-.03},{x: 8.25,z:-.4,id:'pineBroad',s:2.70,r:.09},
        {x:10.20,z: .6,id:'pineTall',s:3.08,r:-.06},{x:12.10,z:-.5,id:'pineDeadSparse',s:2.26,r:.12},
        // Staggered second bank closes the gaps so the glade reads as an opening
        // inside continuous woodland, not the end of the forest track.
        {x:-11.0,z:5.0,id:'pineBroad',s:2.42,r:.12},{x:-9.0,z:4.2,id:'pineTall',s:2.76,r:-.04},
        {x:-7.0,z:5.4,id:'pineBroad',s:2.30,r:.02},{x:-5.1,z:4.5,id:'pineYoung',s:2.08,r:-.09},
        {x:-3.25,z:5.2,id:'pineTall',s:2.68,r:.07},{x:0,z:4.6,id:'pineBroad',s:2.34,r:-.03},
        {x: 3.25,z:5.3,id:'pineTall',s:2.72,r:.05},{x:5.15,z:4.4,id:'pineYoung',s:2.04,r:-.07},
        {x: 7.05,z:5.1,id:'pineBroad',s:2.38,r:.09},{x:9.05,z:4.3,id:'pineTall',s:2.80,r:-.02},
        {x:11.05,z:5.2,id:'pineBroad',s:2.46,r:.06}
      ];
      for(const t of row)this.addTree(t.id,backBase+t.z,this.gladeCentreX+t.x,t.s,t.r)
    }
    // Build the approach funnel only AFTER the established corridor and destination
    // scenery have consumed their normal random sequence. This keeps every existing
    // forest-bank position/scale unchanged while adding new geometry solely before u=10.
    for(let u=-40,i=0;u<=8;u+=4.6,i++){
      const wz=this.startWorld+u,p=this.pathAtWorld(wz),t=ease(clamp((u+40)/48,0,1));
      const mouthHalf=lerp(10.8,p.half+.34,t);
      for(const side of [-1,1]){
        const innerId=this.rand()<.58?'pineTall':'pineBroad',outerId=this.rand()<.24?'pineYoung':'pineBroad';
        const inner=p.x+side*(mouthHalf+this.rand()*.42),outer=p.x+side*(mouthHalf+2.05+this.rand()*.72);
        this.addTree(innerId,wz+(this.rand()-.5)*1.1,inner,1.55+this.rand()*1.20,this.rand()*Math.PI*2);
        this.addTree(outerId,wz+(this.rand()-.5)*1.8,outer,1.28+this.rand()*1.18,this.rand()*Math.PI*2)
      }
    }
  }
  begin(stage=null){
    if(this.active)this.stopForJump();
    this.active=true;this.finishing=false;this.finishT=0;this.wallHitCD=0;
    this.scenarioMode=!!(campaign.currentMission&&campaign.currentStage()?.type==='forest_corridor');
    this.environmentId=stage?.environment||(stage?.variant==='alien_swamp'?'alien_swamp':'forest_corridor');
    this.environmentConfig=globalThis.AgentXEnvironments?.get?.(this.environmentId)||null;
    this.variant=stage?.variant||this.environmentConfig?.controllerVariant||'forest';
    this.hostileFlora=stage?.hostileFlora!==undefined?stage.hostileFlora:(this.environmentConfig?.hostileFlora!==false);
    this.length=Math.max(160,Number(stage?.length)||Number(this.environmentConfig?.length)||650);
    this.speed=Number(stage?.speed)||Number(this.environmentConfig?.speed)||(this.isSwampVariant()?26.04:20.5);
    const stageDestination=stage?.terminalDestination;
    const swampDefault=this.isSwampVariant()?(Math.random()<.5?'swamp_relay_delivery':'swamp_relay_console'):null;
    this.terminalDestination=stageDestination!==undefined&&stageDestination!==null?stageDestination:(this.isSwampVariant()?swampDefault:(stageDestination||(this.scenarioMode?null:'cabin_delivery')));
    this.terminalState='run';this.deliveryT=0;this.deliveryProgress=0;this.deliveryAnnounced=false;this.deliveryLanded=false;this.devExitPending=false;this.missionSpeechStarted=false;this.resetRelayCalibration();
    if(this.scenarioMode)this.suspendedMission=null;
    else{this.suspendedMission=campaign.currentMission||null;campaign.currentMission=null}
    const approachHandoff=this.scenarioMode&&stage?.entryFrom==='surface_destination'?surfaceDestination.consumeHandoff():null;
    const entryDistance=approachHandoff?clamp(Number(approachHandoff.distance)||24,8,42):0;
    mode='play';phase='forest';phaseT=0;modeT=0;travel=approachHandoff?-entryDistance:0;this.startWorld=0;this.originX=0;
    fighters.length=0;asteroids.length=0;groundTargets.length=0;bolts.length=0;hazards.length=0;shots.length=0;playerMissiles.length=0;
    asteroidField.stop();courier.reset();resetSpaceDogfightDirector();
    inputX=inputY=aimX=aimY=0;viewYaw=0;viewPitch=approachHandoff?.pitch||0;viewRoll=approachHandoff?.roll||0;spaceYawVel=spacePitchVel=0;surfaceVX=surfaceVY=0;
    if(this.terminalDestination==='cabin_delivery')this.setupCabinDestination();
    else if(this.terminalDestination==='wreckage_recovery')this.setupWreckageDestination();
    else if(this.isRelayDestination())this.setupRelayDestination();
    else if(this.isMonolithDestination())this.setupMonolithDestination();
    const p=this.pathAtWorld(travel);shipX=p.x;shipY=p.centerY;
    this.buildCourse();
    say(this.stage?.presentation?.start||(this.isSwampVariant()?(this.isMonolithDestination()?'FOLLOW SWAMP COORDINATES':(this.relayAction()==='console'?'SWAMP RELAY CALIBRATION':'SWAMP RELAY DELIVERY')):(this.terminalDestination==='cabin_delivery'?'FOREST DELIVERY':(this.terminalDestination==='wreckage_recovery'?'INVESTIGATE WRECKAGE':'FOREST CORRIDOR'))),.9)
  }
  stopForJump(){
    if(!this.active)return;
    this.active=false;this.finishing=false;this.trees.length=0;this.obstacles.length=0;this.spitters.length=0;
    if(!campaign.currentMission&&this.suspendedMission)campaign.currentMission=this.suspendedMission;
    this.suspendedMission=null;this.scenarioMode=false;this.terminalDestination=null;this.cabin=null;this.cabinMesh=null;this.relayOutpost=null;this.relayMesh=null;this.relayConsoleWorld=null;this.relayScreenRect=null;this.monolith=null;this.monolithPlinth=null;this.monolithFocusWorld=null;this.monolithStandOff=null;this.monolithStars.length=0;wreckScannerAudio.stop();this.wreckage.length=0;this.recorder=null;this.recorderStandOff=null;this.resetRecorderData();this.resetRelayCalibration();this.devExitPending=false;this.environmentId='forest_corridor';this.environmentConfig=globalThis.AgentXEnvironments?.get?.('forest_corridor')||null;this.variant='forest';this.hostileFlora=true
  }
  finish(success=true){
    const resume=this.suspendedMission;
    this.active=false;this.finishing=false;this.trees.length=0;this.obstacles.length=0;this.spitters.length=0;this.suspendedMission=null;this.terminalDestination=null;this.cabin=null;this.cabinMesh=null;this.relayOutpost=null;this.relayMesh=null;this.relayConsoleWorld=null;this.relayScreenRect=null;this.monolith=null;this.monolithPlinth=null;this.monolithFocusWorld=null;this.monolithStandOff=null;this.monolithStars.length=0;wreckScannerAudio.stop();this.wreckage.length=0;this.recorder=null;this.recorderStandOff=null;this.resetRecorderData();this.resetRelayCalibration();this.devExitPending=false;const wasSwamp=this.isSwampVariant();this.environmentId='forest_corridor';this.environmentConfig=globalThis.AgentXEnvironments?.get?.('forest_corridor')||null;this.variant='forest';this.hostileFlora=true;
    fighters.length=0;asteroids.length=0;groundTargets.length=0;bolts.length=0;hazards.length=0;shots.length=0;playerMissiles.length=0;
    if(resume)campaign.currentMission=resume;
    mode='idle';phase='space';inputX=inputY=aimX=aimY=0;viewYaw=viewPitch=viewRoll=0;
    campaign.showHub('options');
    say(wasSwamp?(success?'SWAMP TEST COMPLETE':'SWAMP TEST ENDED'):(success?'FOREST TEST COMPLETE':'FOREST TEST ENDED'),.6)
  }
  updateSteering(dt,magX,magY){
    if(this.hasGladeDestination()&&this.terminalState==='approach'){
      const target=this.standOffWorld;if(!target)return;
      inputX=moveToward(inputX,0,dt*5);inputY=moveToward(inputY,0,dt*5);aimX=aimY=0;
      shipX=lerp(shipX,target[0],1-Math.exp(-dt*1.8));
      const floor=this.floorAt(travel+1.2,shipX),targetY=this.gladeFloor+1.68;
      shipY=lerp(shipY,targetY,1-Math.exp(-dt*1.7));
      const focus=this.terminalDestination==='wreckage_recovery'?this.recorder:(this.isMonolithDestination()?this.monolithFocusWorld:(this.relayAction()==='console'?this.relayConsoleWorld:this.deliveryWorld));
      if(focus){const dz=Math.max(.1,focus.worldZ!==undefined?focus.worldZ-travel:focus[2]-travel),fx=focus.x!==undefined?focus.x:focus[0],desiredYaw=Math.atan2(fx-shipX,dz);viewYaw=wrapAngle(viewYaw+clamp(wrapAngle(desiredYaw-viewYaw),-dt*.72,dt*.72))}
      viewPitch=lerp(viewPitch,0,1-Math.exp(-dt*2.4));viewRoll=lerp(viewRoll,0,1-Math.exp(-dt*3.1));
      shipY=clamp(shipY,floor+.7,floor+2.55);return
    }
    if(this.autopilotActive()){
      inputX=moveToward(inputX,0,dt*5);inputY=moveToward(inputY,0,dt*5);aimX=aimY=0;
      viewRoll=lerp(viewRoll,0,1-Math.exp(-dt*3));viewPitch=lerp(viewPitch,0,1-Math.exp(-dt*2.4));return
    }
    const p=this.pathAtWorld(travel+1.2),margin=.62;
    const authority=this.hasGladeDestination()?lerp(1,.62,this.gladeBlend(travel+10)):1;
    const tx=p.x+magX*Math.max(.55,p.half-margin)*authority;
    const floor=this.floorAt(travel+1.2,tx),centre=floor+1.62;
    const ty=centre-magY*1.08*authority;
    shipX=lerp(shipX,tx,clamp(dt*4.35,0,1));
    shipY=lerp(shipY,ty,clamp(dt*4.15,0,1));
    // Do not let the open sky become an escape route over the forest canopy.
    shipY=clamp(shipY,floor+.55,floor+2.78);
    viewRoll=lerp(viewRoll,-magX*.14*authority,clamp(dt*4.2,0,1));
    viewPitch=lerp(viewPitch,magY*.055*authority,clamp(dt*3.8,0,1));
  }
  update(dt){
    if(!this.active)return;
    this.wallHitCD=Math.max(0,this.wallHitCD-dt);
    for(const t of this.trees)t.z=t.worldZ-travel;
    if(this.isSwampVariant()){
      this.updateSwampSpitters(dt);
      updateBoltsOnly(dt);
      if(mode==='dead')return
    }

    if(this.monolith){this.monolithYaw=wrapAngle(this.monolithYaw+dt*this.monolithSpinRate);this.monolith.rot[1]=this.monolithYaw}

    if(this.isMonolithDestination()){
      const remain=(this.monolithStandOff?.[2]??Infinity)-travel;
      if(this.terminalState==='run'&&this.gladeBlend(travel+18)>.16)this.terminalState='glade';
      if(this.terminalState==='glade'&&remain<30){this.terminalState='approach';laserBurstRemaining=0;endLaserTrigger();inputX=inputY=aimX=aimY=0;say('MONOLITH AHEAD',.75)}
      if(this.terminalState==='approach'&&remain<=.24){
        travel=this.monolithStandOff[2];shipX=this.monolithStandOff[0];shipY=this.monolithStandOff[1];
        this.terminalState='settle';this.finishT=0;inputX=inputY=aimX=aimY=0
      }
      if(this.terminalState==='settle'){
        this.finishT+=dt;
        const target=this.monolithFocusWorld,dx=target[0]-shipX,dy=target[1]-shipY,dz=Math.max(.1,target[2]-travel),desiredYaw=Math.atan2(dx,dz),desiredPitch=Math.atan2(-dy,Math.max(.1,Math.hypot(dx,dz)));
        viewYaw=moveTowardAngle(viewYaw,desiredYaw,dt*.78);viewPitch=moveToward(viewPitch,desiredPitch,dt*.52);viewRoll=moveToward(viewRoll,0,dt*.72);
        const bounds=this.monolithProjectedBounds();
        if(bounds&&this.finishT>.45){
          const targetX=W*.5,targetY=viewH*.48,cx=(bounds.minX+bounds.maxX)*.5,cy=(bounds.minY+bounds.maxY)*.5;
          const errX=Math.abs(cx-targetX),errY=Math.abs(cy-targetY),spanX=bounds.maxX-bounds.minX,spanY=bounds.maxY-bounds.minY;
          const marginX=Math.max(44,spanX*.06),marginY=Math.max(38,spanY*.06);
          const fullyVisible=bounds.minX>marginX&&bounds.maxX<W-marginX&&bounds.minY>marginY&&bounds.maxY<viewH-marginY;
          const stable=fullyVisible&&errX<=8&&errY<=8&&Math.abs(viewRoll)<.055;
          const fallbackReady=fullyVisible&&errX<=18&&errY<=18&&this.finishT>1.85;
          if(stable||fallbackReady){
            this.terminalState='scan';this.monolithScanT=0;wreckScannerAudio.start();say(this.stage?.presentation?.scanStart||'SCANNING MONOLITH',.70)
          }
        }
        return
      }
      if(this.terminalState==='scan'){
        this.monolithScanT+=dt;
        if(this.monolithScanT>=this.monolithScanSeconds){
          this.monolithScanT=this.monolithScanSeconds;wreckScannerAudio.stop();SoundFX.objectiveComplete();this.terminalState='scanHold';this.finishT=0;say(this.stage?.presentation?.scanComplete||'SCAN COMPLETE · RETURN DATA TO VOX',1.15)
        }
        return
      }
      if(this.terminalState==='scanHold'){
        this.finishT+=dt;
        if(this.finishT>1.20){this.terminalState='departing';this.devExitPending=!this.scenarioMode;beginSurfaceExit({scene:'forest',continueMission:true})}
        return
      }
    }

    if(this.terminalDestination==='wreckage_recovery'){
      const remain=(this.recorderStandOff?.[2]??Infinity)-travel;
      if(this.terminalState==='run'&&this.gladeBlend(travel+18)>.16){
        // The glade is the hand-off point.  No precision forest flying around the
        // debris: the scripted approach owns the craft from here onward.
        this.terminalState='approach';laserBurstRemaining=0;endLaserTrigger();inputX=inputY=aimX=aimY=0
      }
      if(this.terminalState==='approach'&&remain<=.24){
        travel=this.recorderStandOff[2];shipX=this.recorderStandOff[0];shipY=this.gladeFloor+1.68;
        this.terminalState='settle';this.finishT=0;viewRoll=0;inputX=inputY=aimX=aimY=0
      }
      if(this.terminalState==='settle'){
        this.finishT+=dt;
        const dz=Math.max(.1,this.recorder.worldZ-travel),desiredYaw=Math.atan2(this.recorder.x-shipX,dz);
        viewYaw=wrapAngle(viewYaw+clamp(wrapAngle(desiredYaw-viewYaw),-dt*.62,dt*.62));viewPitch=lerp(viewPitch,0,clamp(dt*2.5,0,1));viewRoll=lerp(viewRoll,0,clamp(dt*3.2,0,1));
        if(this.finishT>.62&&Math.abs(wrapAngle(desiredYaw-viewYaw))<.025){this.terminalState='download';this.finishT=0;this.startRecorderDownload()}
        return
      }
      if(this.terminalState==='download'){this.updateRecorderDownload(dt);return}
      if(this.terminalState==='dataHold'){
        this.finishT+=dt;
        if(this.finishT>.78){this.terminalState='missionSpeech';this.missionSpeechStarted=true;this.finishT=0;audio.playVoice('missionComplete',{once:true,priority:true})}
        return
      }
      if(this.terminalState==='missionSpeech'){
        this.finishT+=dt;
        if(this.finishT>.32&&!audio.voicePlaying&&!audio.voiceQueue?.length&&!audio.voiceDelayTimer){
          this.terminalState='departing';this.devExitPending=!this.scenarioMode;beginSurfaceExit({scene:'forest',continueMission:true})
        }
        return
      }
    }

    if(this.isMonolithDestination()){
      if(this.terminalState==='run')return`${this.sceneRouteLabel()} ${Math.round(clamp((travel-this.startWorld)/this.length,0,1)*100)}%`;
      if(this.terminalState==='glade')return this.stage?.presentation?.hudAhead||'MONOLITH AHEAD';
      if(this.terminalState==='approach'||this.terminalState==='settle')return this.stage?.presentation?.hudAutopilot||'AUTOPILOT · MONOLITH';
      if(this.terminalState==='scan')return`${this.stage?.presentation?.hudScan||'MONOLITH SCAN'} ${Math.round(clamp(this.monolithScanT/Math.max(.01,this.monolithScanSeconds),0,1)*100)}%`;
      if(this.terminalState==='scanHold'||this.terminalState==='departing')return this.stage?.presentation?.hudComplete||'SCAN COMPLETE'
    }
    if(this.isRelayDestination()){
      const remain=(this.standOffWorld?.[2]??Infinity)-travel;
      if(this.terminalState==='run'&&this.gladeBlend(travel+18)>.16)this.terminalState='glade';
      if(this.terminalState==='glade'&&remain<26){
        this.terminalState='approach';laserBurstRemaining=0;endLaserTrigger();inputX=inputY=aimX=aimY=0;say(this.relayAction()==='console'?'AUTOPILOT · RELAY TERMINAL':'AUTOPILOT · RELAY DELIVERY',.58)
      }
      if(this.terminalState==='approach'&&remain<=.24){
        travel=this.standOffWorld[2];shipX=this.standOffWorld[0];shipY=this.standOffWorld[1];
        this.terminalState='settle';this.finishT=0;viewRoll=0;inputX=inputY=aimX=aimY=0
      }
      if(this.terminalState==='settle'){
        this.finishT+=dt;
        const target=this.relayAction()==='console'?this.relayConsoleWorld:this.deliveryWorld;
        const dz=Math.max(.1,target[2]-travel),desiredYaw=Math.atan2(target[0]-shipX,dz);
        viewYaw=wrapAngle(viewYaw+clamp(wrapAngle(desiredYaw-viewYaw),-dt*.62,dt*.62));viewPitch=lerp(viewPitch,0,clamp(dt*2.5,0,1));viewRoll=lerp(viewRoll,0,clamp(dt*3.2,0,1));
        if(this.finishT>.62&&Math.abs(wrapAngle(desiredYaw-viewYaw))<.025){
          this.finishT=0;
          if(this.relayAction()==='console'){this.terminalState='calibrate';this.startRelayCalibration()}
          else{this.terminalState='delivery';this.deliveryT=0;this.deliveryProgress=0}
        }
        return
      }
      if(this.terminalState==='delivery'){
        this.deliveryT+=dt;this.deliveryProgress=ease(clamp((this.deliveryT-.36)/2.65,0,1));
        if(!this.deliveryAnnounced&&this.deliveryProgress>=.999){this.deliveryAnnounced=true;this.deliveryLanded=true;SoundFX.objectiveComplete();audio.playVoice('deliveryComplete',{once:false,priority:true});this.terminalState='deliveryHold';this.finishT=0}
        return
      }
      if(this.terminalState==='calibrate'){this.updateRelayCalibration(dt);return}
      if(this.terminalState==='deliveryHold'||this.terminalState==='consoleHold'){
        this.finishT+=dt;
        const hold=this.terminalState==='consoleHold'?1.35:.72;
        if(this.finishT>hold&&!audio.voicePlaying&&!audio.voiceQueue?.length&&!audio.voiceDelayTimer){
          this.terminalState='missionSpeech';this.missionSpeechStarted=true;this.finishT=0;audio.playVoice('missionComplete',{once:true,priority:true})
        }
        return
      }
      if(this.terminalState==='missionSpeech'){
        this.finishT+=dt;
        if(this.finishT>.32&&!audio.voicePlaying&&!audio.voiceQueue?.length&&!audio.voiceDelayTimer){
          this.terminalState='departing';this.devExitPending=!this.scenarioMode;beginSurfaceExit({scene:'forest',continueMission:true})
        }
        return
      }
    }

    if(this.terminalDestination==='cabin_delivery'){
      const remain=(this.standOffWorld?.[2]??Infinity)-travel;
      if(this.terminalState==='run'&&this.gladeBlend(travel+18)>.16)this.terminalState='glade';
      if(this.terminalState==='glade'&&remain<24){
        this.terminalState='approach';laserBurstRemaining=0;endLaserTrigger();inputX=inputY=aimX=aimY=0;say('AUTOPILOT · CABIN DELIVERY',.58)
      }
      if(this.terminalState==='approach'&&remain<=.24){
        travel=this.standOffWorld[2];shipX=this.standOffWorld[0];shipY=this.gladeFloor+1.68;
        this.terminalState='settle';this.finishT=0;viewRoll=0;inputX=inputY=aimX=aimY=0
      }
      if(this.terminalState==='settle'){
        this.finishT+=dt;
        const dz=Math.max(.1,this.deliveryWorld[2]-travel),desiredYaw=Math.atan2(this.deliveryWorld[0]-shipX,dz);
        viewYaw=wrapAngle(viewYaw+clamp(wrapAngle(desiredYaw-viewYaw),-dt*.62,dt*.62));viewPitch=lerp(viewPitch,0,clamp(dt*2.5,0,1));viewRoll=lerp(viewRoll,0,clamp(dt*3.2,0,1));
        if(this.finishT>.62&&Math.abs(wrapAngle(desiredYaw-viewYaw))<.025){this.terminalState='delivery';this.deliveryT=0;this.deliveryProgress=0;this.finishT=0}
        return
      }
      if(this.terminalState==='delivery'){
        this.deliveryT+=dt;this.deliveryProgress=ease(clamp((this.deliveryT-.36)/2.65,0,1));
        if(!this.deliveryAnnounced&&this.deliveryProgress>=.999){this.deliveryAnnounced=true;this.deliveryLanded=true;SoundFX.objectiveComplete();audio.playVoice('deliveryComplete',{once:false,priority:true});this.terminalState='deliveryHold';this.finishT=0}
        return
      }
      if(this.terminalState==='deliveryHold'){
        this.finishT+=dt;
        if(this.finishT>.72&&!audio.voicePlaying&&!audio.voiceQueue?.length&&!audio.voiceDelayTimer){
          this.terminalState='missionSpeech';this.missionSpeechStarted=true;this.finishT=0;audio.playVoice('missionComplete',{once:true,priority:true})
        }
        return
      }
      if(this.terminalState==='missionSpeech'){
        this.finishT+=dt;
        if(this.finishT>.32&&!audio.voicePlaying&&!audio.voiceQueue?.length&&!audio.voiceDelayTimer){
          this.terminalState='departing';this.devExitPending=!this.scenarioMode;beginSurfaceExit({scene:'forest',continueMission:true})
        }
        return
      }
    }

    if(this.finishing){
      this.finishT+=dt;
      if(this.finishT>=.85){
        if(this.scenarioMode&&campaign.currentMission&&campaign.currentStage()?.type==='forest_corridor'){scenarioFlow.completeCurrentStage();return}
        this.finish(true)
      }
      return
    }
    const p=this.pathAtWorld(travel),floor=this.floorAt(travel,shipX),edge=Math.max(.3,p.half-.28);
    if(Math.abs(shipX-p.x)>edge){
      shipX=clamp(shipX,p.x-edge,p.x+edge);
      if(this.wallHitCD<=0){damage('TREES');this.wallHitCD=.78;if(mode==='dead')return}
    }
    if(shipY<floor+.48){shipY=floor+.48;if(this.wallHitCD<=0){damage('GROUND');this.wallHitCD=.78;if(mode==='dead')return}}
    for(const t of this.obstacles){
      if(t.passed)continue;const z=t.worldZ-travel;if(z<.15){t.passed=true;continue}if(z>1.75)continue;
      const dx=Math.abs(shipX-t.x),of=t.obstacle||{};let hit=false;
      if(of.kind==='fallen')hit=dx<(of.radius||2.3)&&shipY<this.floorAt(t.worldZ,t.x)+1.62;
      else hit=dx<(of.radius||.85);
      if(hit){t.passed=true;damage('TREE');this.wallHitCD=.78;if(mode==='dead')return}
    }
    if(!this.hasGladeDestination()&&travel-this.startWorld>=this.length){this.finishing=true;this.finishT=0;say(this.isSwampVariant()?'SWAMP TEST COMPLETE':'FOREST TEST COMPLETE',.85)}
  }
  drawGround(){
    // Same visual language as the ordinary outdoor grid, but each sample follows
    // the route's gentle height field instead of lying on one perfectly flat plane.
    // A final forest stage uses the same canonical land extraction; do not let the
    // radial mask swing over the sky as that shared exit approaches vertical.
    const extractionPitch=mode==='surfaceExit'?surfaceExitPitchProgress():0;
    if(extractionPitch<.18)surfaceMask(-4.15,125);
    const spacing=4,sampleStep=1,far=this.isSwampVariant()?104:100,span=this.isSwampVariant()?32:18;
    const x0=Math.floor((shipX-span)/spacing)*spacing,x1=shipX+span;
    const wz0=Math.floor((travel+.7)/spacing)*spacing,wz1=travel+far;
    // Keep the same visible 4-unit grid density, but trace each grid line through
    // intermediate terrain samples. Previously each 4-unit span was one straight
    // chord. At a hill brow that chord sat below floorAt(), making correctly seated
    // trees appear to hover above the visible wire ground.
    for(let x=x0;x<=x1;x+=spacing){
      let prev=null;
      for(let wz=wz0;wz<=wz1+.001;wz+=sampleStep){const y=this.floorAt(wz,x),p=proj([x,y,wz-travel]);if(prev&&p)line(prev.x,prev.y,p.x,p.y,this.sceneGridColor(),.72,.58);prev=p||null}
    }
    for(let wz=wz0;wz<=wz1;wz+=spacing){
      let prev=null;
      for(let x=x0;x<=x1+.001;x+=sampleStep){const y=this.floorAt(wz,x),p=proj([x,y,wz-travel]);if(prev&&p)line(prev.x,prev.y,p.x,p.y,this.sceneGridColor(),.78,.62);prev=p||null}
    }
  }
  recorderPoint(){return this.recorder?[this.recorder.x,this.recorder.y,this.recorder.worldZ-travel]:null}
  drawRecorderMarker(){
    if(this.terminalDestination!=='wreckage_recovery'||this.terminalState==='run'||this.terminalState==='departing'||!this.recorder)return;
    const q=camPoint(this.recorderPoint());if(!q||q[2]<=.15)return;const p=projectCam(q);if(!p)return;
    const d=Math.max(1,q[2]),r=clamp(10+(70-d)*.22,10,26),col=C.y;
    line(p.x-r,p.y,p.x,p.y-r,col,1,1);line(p.x,p.y-r,p.x+r,p.y,col,1,1);line(p.x+r,p.y,p.x,p.y+r,col,1,1);line(p.x,p.y+r,p.x-r,p.y,col,1,1);
    ctx.save();ctx.font='400 11px Consolas,monospace';ctx.textAlign='center';ctx.textBaseline='bottom';ctx.strokeStyle=col;ctx.lineWidth=VECTOR_LINE_WIDTH;ctx.strokeText('RECORDER',p.x,p.y-r-5);ctx.restore()
  }
  drawRecorderData(){
    if(this.terminalDestination!=='wreckage_recovery'||this.terminalState!=='download'||!this.recorder)return;
    const source=camPoint(this.recorderPoint());if(!source||source[2]<=.24)return;
    // Exact same secure-terminal ramp/packet renderer, reversed geometrically:
    // narrow end at the recorder, wide end at the drone, packets recorder -> drone.
    stationHack.drawDataRamp(source,[0,-.62,.82],this.dataPackets,{sourceHalf:.43,targetHalf:.90,drawRails:false})
  }
  monolithParts(){
    if(!this.monolith)return[];
    return[{obj:{type:'swampMonolith',x:this.monolith.x,y:this.monolith.y,z:this.monolith.worldZ-travel,s:this.monolith.s,mx:this.monolith.mx,my:this.monolith.my,mz:this.monolith.mz,rot:this.monolith.rot},mesh:courierFixtureBoxMesh,col:C.w,alpha:1}]
  }
  monolithProjectedBounds(){
    const parts=this.monolithParts();
    return parts.length?salvageRecovery.wreckProjectedBounds(parts):null
  }
  monolithLocalPoint(x,y,z){
    if(!this.monolith)return null;
    const q=rotate([x,y,z],[0,this.monolithYaw,0]);return[this.monolith.x+q[0],this.monolith.y+q[1],this.monolith.worldZ-travel+q[2]]
  }
  monolithFontGlyphMap(){
    return globalThis.AgentXVectorFont?.glyphsForRole?.(18,'display')||null
  }
  monolithGlyphLookup(glyphs,ch){
    if(!glyphs)return null;
    return glyphs.get?.(ch)||glyphs.get?.(String(ch).toUpperCase())||glyphs.get?.('?')||null
  }
  monolithTextMetrics(text,glyphs,tracking=.2){
    const s=String(text||'');
    let width=0;
    for(let i=0;i<s.length;i++){
      const g=this.monolithGlyphLookup(glyphs,s[i]);
      width+=g?.w||0;
      if(i<s.length-1&&s[i]!==' '&&s[i+1]!==' ')width+=tracking;
    }
    return {width,height:1}
  }
  monolithGlyphPolylines(text,glyphs,tracking=.2){
    const s=String(text||'');
    const lines=[];
    let cursor=0;
    for(let i=0;i<s.length;i++){
      const g=this.monolithGlyphLookup(glyphs,s[i]);
      if(g?.paths){
        for(const path of g.paths){
          const pts=[];
          for(const cmd of path){
            if(cmd[0]==='M'||cmd[0]==='L')pts.push([cursor+cmd[1],cmd[2]]);
          }
          if(pts.length>=2)lines.push(pts)
        }
      }
      cursor+=g?.w||0;
      if(i<s.length-1&&s[i]!==' '&&s[i+1]!==' ')cursor+=tracking;
    }
    return lines
  }
  drawMonolith42(){
    if(!this.monolith)return;
    const glyphs=this.monolithFontGlyphMap();if(!glyphs)return;
    const text=String(this.stage?.terminalConfig?.monolith?.inscription||'42'),tracking=.2,metrics=this.monolithTextMetrics(text,glyphs,tracking),lines=this.monolithGlyphPolylines(text,glyphs,tracking);
    if(!lines.length)return;
    const halfT=this.monolith.mz*this.monolith.s+0.010;
    const toCam=[shipX-this.monolith.x,shipY-this.monolith.y,travel-this.monolith.worldZ];
    const frontNormal=rotate([0,0,-1],[0,this.monolithYaw,0]);
    const backNormal=rotate([0,0,1],[0,this.monolithYaw,0]);
    const usableW=this.monolith.mx*this.monolith.s*.52;
    const usableH=this.monolith.my*this.monolith.s*.34;
    const scale=Math.min(usableW/Math.max(.001,metrics.width),usableH/Math.max(.001,metrics.height));
    const x0=-(metrics.width*scale)*.5;
    const drawFace=(z,mirror=false)=>{
      const mx=mirror?-1:1;
      for(const poly of lines){
        for(let i=1;i<poly.length;i++){
          const ax=x0+poly[i-1][0]*scale,bx=x0+poly[i][0]*scale;
          const ay=(.5-poly[i-1][1])*scale,by=(.5-poly[i][1])*scale;
          const A=this.monolithLocalPoint(ax*mx,ay,z),B=this.monolithLocalPoint(bx*mx,by,z),pa=A?proj(A):null,pb=B?proj(B):null;
          if(pa&&pb)line(pa.x,pa.y,pb.x,pb.y,C.w,VECTOR_LINE_WIDTH,.98)
        }
      }
    };
    if(v3dot(frontNormal,toCam)>0)drawFace(-halfT,false);
    if(v3dot(backNormal,toCam)>0)drawFace(halfT,true);
  }
  drawMonolithEnergyStars(){
    if(!this.monolith||!this.monolithStars?.length)return;
    const minY=this.gladeFloor+.10,maxY=this.gladeFloor+1.58,span=maxY-minY;
    for(const st of this.monolithStars){
      const q=(st.phase+time*st.speed)%1,y=minY+q*span,a=clamp(Math.sin(q*Math.PI)*1.20,0,.72),cx=this.monolith.x+st.x,cz=this.monolith.worldZ-travel+st.z;
      const pts=[];for(let i=0;i<10;i++){const ang=st.rot-Math.PI*.5+i*Math.PI/5,r=(i&1)?st.size*.42:st.size;pts.push(proj([cx+Math.cos(ang)*r,y,cz+Math.sin(ang)*r]))}
      if(pts.every(Boolean))for(let i=0;i<10;i++){const A=pts[i],B=pts[(i+1)%10];line(A.x,A.y,B.x,B.y,C.c,VECTOR_LINE_WIDTH,a)}
    }
  }
  monolithScannerGeometry(){
    if(this.terminalState!=='scan'||!this.monolith)return null;
    const parts=this.monolithParts(),bounds=this.monolithProjectedBounds();if(!bounds)return null;
    const q=ease(clamp(this.monolithScanT/Math.max(.01,this.monolithScanSeconds),0,1)),scanCol=(Math.floor(this.monolithScanT*12)%2)?C.m:C.c;
    const pad=Math.max(32,(bounds.maxY-bounds.minY)*.12),scanY=lerp(bounds.minY-pad,bounds.maxY+pad,q),scanX=(bounds.minX+bounds.maxX)*.5;

    // Match the established wreck scanner by MATCHING ITS ACTUAL ON-SCREEN ENTRY
    // WIDTH at the bottom edge, not by reusing unrelated internal parameters.
    // Keep the virtual source below the frame, but solve the off-screen source
    // points so the visible rails cross the bottom edge at the same separation as
    // the standard wreck scanner. This preserves the correct emitted look while
    // making the monolith scan read exactly like the normal scanner.
    const emitter=[0,-.82,1.15],ep=projectCam(emitter);if(!ep)return null;
    const farDepth=Math.max(bounds.depth+5,bounds.depth*1.06),f=ep.k*ep.z;
    const unproject=(sx,sy,z)=>[(sx-W*.5)*z/f,(viewH*.48-sy)*z/f,z];
    const farPx=Math.max((bounds.maxX-bounds.minX)*.82,clamp(W*.24,260,480));
    const farLeftX=scanX-farPx,farRightX=scanX+farPx;
    const sourceY=ep.y,bottomY=viewH;
    const refFarPx=clamp(W*.24,260,480);
    const bottomHalf=refFarPx*Math.max(0,sourceY-bottomY)/Math.max(1e-3,sourceY-scanY);
    const bottomLeftX=W*.5-bottomHalf,bottomRightX=W*.5+bottomHalf;
    const solveSourceX=(bottomX,farX)=>{
      const denom=scanY-sourceY;
      if(Math.abs(denom)<1e-5)return bottomX;
      const t=(bottomY-sourceY)/denom;
      return(Math.abs(1-t)<1e-5)?bottomX:(bottomX-farX*t)/(1-t)
    };
    const sourceLeftX=solveSourceX(bottomLeftX,farLeftX),sourceRightX=solveSourceX(bottomRightX,farRightX);
    const nearLeft=unproject(sourceLeftX,sourceY,emitter[2]),nearRight=unproject(sourceRightX,sourceY,emitter[2]);
    const farLeft=unproject(farLeftX,scanY,farDepth),farRight=unproject(farRightX,scanY,farDepth);
    return{parts,scanCol,nearLeft,nearRight,farLeft,farRight}
  }
  drawMonolithScannerContact(){
    const g=this.monolithScannerGeometry();if(!g)return;
    salvageRecovery.drawWreckScanContact(g.parts,g.nearLeft,g.nearRight,g.farLeft,g.farRight,g.scanCol)
  }
  drawMonolithScannerRails(){
    const g=this.monolithScannerGeometry();if(!g)return;
    const nlp=projectCam(g.nearLeft),nrp=projectCam(g.nearRight),flp=projectCam(g.farLeft),frp=projectCam(g.farRight);
    if(nlp&&nrp&&flp&&frp){
      line(nlp.x,nlp.y,flp.x,flp.y,g.scanCol,VECTOR_LINE_WIDTH,.94);
      line(nrp.x,nrp.y,frp.x,frp.y,g.scanCol,VECTOR_LINE_WIDTH,.94)
    }
  }
  drawMonolith(){
    if(!this.monolith)return;
    this.drawMonolithEnergyStars();
    const part=this.monolithParts()[0];drawMesh(part.obj,part.mesh,C.w,1);this.drawMonolith42();this.drawMonolithScannerContact()
  }
  drawScene(){
    // Forest terrain and trees must participate in the SAME painter order. The
    // previous renderer drew every bit of ground first and every tree afterwards,
    // which meant a nearer hill could never occlude a farther trunk. On a brow the
    // fully-visible trunk then appeared to detach from the ground as camera height
    // changed. These one-unit terrain strips are black solid occluders, while only
    // the original 4-unit grid edges are stroked green. No extra visible grid lines.
    const extractionPitch=mode==='surfaceExit'?surfaceExitPitchProgress():0;
    if(extractionPitch<.18)surfaceMask(-4.15,125);

    const grid=4,strip=1,far=this.isSwampVariant()?104:100,span=this.isSwampVariant()?32:18;
    const x0=Math.floor((shipX-span)/grid)*grid,x1=shipX+span;
    const firstWorldZ=Math.floor((travel+.7)/strip)*strip;
    const lastWorldZ=travel+far;
    const items=[];

    const terrainStrip=(wz0,wz1)=>{
      const near=[],farEdge=[];
      for(let x=x0;x<=x1+.001;x+=1){
        const a=proj([x,this.floorAt(wz0,x),wz0-travel]);
        const b=proj([x,this.floorAt(wz1,x),wz1-travel]);
        if(a)near.push(a);if(b)farEdge.push(b)
      }
      if(near.length>=2&&farEdge.length>=2){
        ctx.save();ctx.fillStyle='#000';ctx.globalAlpha=1;ctx.beginPath();
        ctx.moveTo(near[0].x,near[0].y);
        for(let i=1;i<near.length;i++)ctx.lineTo(near[i].x,near[i].y);
        for(let i=farEdge.length-1;i>=0;i--)ctx.lineTo(farEdge[i].x,farEdge[i].y);
        ctx.closePath();ctx.fill();ctx.restore()
      }
      // Preserve exactly the authored 4-unit forest grid. The one-unit strips
      // exist only for black hidden-surface occlusion and are never stroked.
      const isGridZ=wz=>Math.abs(wz/grid-Math.round(wz/grid))<.0001;
      if(isGridZ(wz0)){
        let prev=null;for(let x=x0;x<=x1+.001;x+=1){const q=proj([x,this.floorAt(wz0,x),wz0-travel]);if(prev&&q)line(prev.x,prev.y,q.x,q.y,this.sceneGridColor(),.78,.62);prev=q||null}
      }
      for(let x=Math.ceil(x0/grid)*grid;x<=x1+.001;x+=grid){
        const a=proj([x,this.floorAt(wz0,x),wz0-travel]),b=proj([x,this.floorAt(wz1,x),wz1-travel]);
        if(a&&b)line(a.x,a.y,b.x,b.y,this.sceneGridColor(),.72,.58)
      }
    };

    // Terrain strips are scene geometry with real depth, not a post-process mask.
    for(let wz=firstWorldZ;wz<lastWorldZ-.001;wz+=strip){
      const wz1=Math.min(lastWorldZ,wz+strip),mid=(wz+wz1)*.5;
      const d=camPoint([shipX,this.floorAt(mid,shipX),mid-travel])[2];
      if(d>.18)items.push({d,draw:()=>terrainStrip(wz,wz1)})
    }

    // Trees use their actual camera depth and are interleaved with terrain. A strip
    // nearer than a tree is therefore painted afterwards and hides the part of the
    // trunk that is genuinely behind the hill; terrain behind a tree is painted first.
    for(const t of this.trees){
      if(t.dead)continue;
      t.z=t.worldZ-travel;const drawFar=t.swampSpitter?112:82;if(t.z<.35||t.z>drawFar)continue;
      const q=camPoint([t.x,t.y,t.z]);if(q[2]<=.18)continue;
      // Sort against terrain by the root depth, not the tree's high object origin.
      // Pitch changes camera-space Z as a function of Y; using the canopy/mesh origin
      // could therefore put a rooted tree on the wrong side of its own ground strip.
      const rootDepth=camPoint([t.x,this.floorAt(t.worldZ,t.x),t.z])[2];
      let sortDepth=rootDepth;
      if(t.swampSpitter){
        const h=this.swampSpitterHeadWorld(t),hq=camPoint([h.x,h.y,h.z]);
        sortDepth=Math.min(rootDepth,hq[2])-.38
      }
      items.push({d:sortDepth,draw:()=>drawLayeredForestTree(t,t.corridorMesh||t.mesh,t.assetId,t.obstacle?1:.93)})
    }
    if(this.terminalDestination==='cabin_delivery'&&this.cabin&&this.cabinMesh){
      const z=this.cabin.worldZ-travel,obj={type:'forestCabin',x:this.cabin.x,y:this.cabin.y,z,s:this.cabin.s,rot:this.cabin.rot};
      const centre=camPoint([this.cabin.x,this.cabin.y+1.6,z]);
      if(centre[2]>.18&&centre[2]<145){
        // The cabin projects several units forward because the stairs extend well in
        // front of its body. Sorting the whole model at its centre let a terrain strip
        // between the centre and the stair nose paint over those nearer steps. Sort at
        // the cabin's nearest real vertex instead. The final glade is deliberately flat,
        // so terrain behind the stair nose can no longer truncate the model as we close.
        let nearest=centre[2];
        for(const v of this.cabinMesh.v||[]){const a=rotate([v[0]*obj.s,v[1]*obj.s,v[2]*obj.s],obj.rot),d=camPoint([a[0]+obj.x,a[1]+obj.y,a[2]+obj.z])[2];if(d>.18)nearest=Math.min(nearest,d)}
        items.push({d:nearest,draw:()=>drawMesh(obj,this.cabinMesh,C.o,.96)})
      }
    }
    if(this.terminalDestination==='wreckage_recovery'){
      for(const w of this.wreckage){
        const z=w.worldZ-travel,q=camPoint([w.x,w.y,z]);if(q[2]<=.18||q[2]>145)continue;
        items.push({d:q[2],draw:()=>drawMesh({type:w.type,x:w.x,y:w.y,z:w.worldZ-travel,s:w.s,rot:w.rot},forestWreckagePanelMesh,w.col,1)})
      }
      if(this.recorder){const z=this.recorder.worldZ-travel,q=camPoint([this.recorder.x,this.recorder.y,z]);if(q[2]>.18&&q[2]<145)items.push({d:q[2],draw:()=>drawMesh({type:'flightRecorder',x:this.recorder.x,y:this.recorder.y,z,s:.5,mx:.72,my:.34,mz:.48,rot:this.recorder.rot},courierFixtureBoxMesh,C.o,1)})}
    }
    if(this.isMonolithDestination()&&this.monolith){
      const z=this.monolith.worldZ-travel,q=camPoint([this.monolith.x,this.monolith.y,z]);
      if(q[2]>.18&&q[2]<180)items.push({d:q[2]-.5,draw:()=>this.drawMonolith()})
    }
    if(this.isRelayDestination()&&this.relayOutpost&&this.relayMesh){
      const z=this.relayOutpost.worldZ-travel,obj={type:'swampRelayOutpost',x:this.relayOutpost.x,y:this.relayOutpost.y,z,s:this.relayOutpost.s,rot:this.relayOutpost.rot};
      const centre=camPoint([this.relayOutpost.x,this.relayOutpost.y+2.4,z]);
      if(centre[2]>.18&&centre[2]<165){
        let nearest=centre[2];
        for(const v of this.relayMesh.v||[]){const a=rotate([v[0]*obj.s,v[1]*obj.s,v[2]*obj.s],obj.rot),d=camPoint([a[0]+obj.x,a[1]+obj.y,a[2]+obj.z])[2];if(d>.18)nearest=Math.min(nearest,d)}
        items.push({d:nearest,draw:()=>{drawMesh(obj,swampRelayOutpostBodyMesh,C.w,.96);drawSwampRelayCommsTower(obj)}})
      }
    }
    items.sort((a,b)=>b.d-a.d);for(const item of items)item.draw();
    // The 02E delivery plinth is a solid cuboid. Repaint its exact authored faces
    // after the rest of the facility so rear building/deck lines cannot show
    // through its front or side faces. Screen/cargo effects are layered afterwards.
    if(this.isRelayDestination()&&this.relayOutpost){
      drawMesh({type:'swampRelayDeliveryPlinthOccluder',x:this.relayOutpost.x,y:this.relayOutpost.y,z:this.relayOutpost.worldZ-travel,s:this.relayOutpost.s,rot:this.relayOutpost.rot},swampRelayDeliveryPlinthMesh,C.w,.96)
    }
    this.drawCabinCargo();this.drawRecorderData();this.drawRecorderMarker();this.drawRelayConsoleScreen();this.drawRelayCargo();this.drawRelayCalibration();
    // Scanner rails are an emitted foreground effect from Agent X's drone. Draw
    // them after terrain and foliage so the lower portion remains visible all the
    // way to the bottom-centre of the play area. The actual surface contact marks
    // remain depth-sorted with the monolith itself above.
    this.drawMonolithScannerRails()
  }

  cabinCargoState(){
    if(this.terminalDestination!=='cabin_delivery'||!this.deliveryWorld)return null;
    const target=[this.deliveryWorld[0],this.deliveryWorld[1],this.deliveryWorld[2]-travel];
    if(this.deliveryLanded||this.terminalState==='deliveryHold'||this.terminalState==='missionSpeech'||this.terminalState==='departing')return{point:target,beam:false,landed:true};
    if(this.terminalState!=='delivery')return null;
    const origin=cameraPointToWorld([0,-.34,1.05]),q=this.deliveryProgress;
    return{point:[lerp(origin[0],target[0],q),lerp(origin[1],target[1],q),lerp(origin[2],target[2],q)],beam:q>.01&&q<.995,landed:false}
  }
  drawCabinCargo(){
    const state=this.cabinCargoState();if(!state)return;
    const cp=proj(state.point);
    if(state.beam&&cp){
      // Reuse the established outward-delivery tractor language: cargo and bowed
      // fronts both travel from the bay toward the receiving table.
      const origin=proj(cameraPointToWorld([0,-.34,.62]));if(origin){
        const dx=cp.x-origin.x,dy=cp.y-origin.y,len=Math.hypot(dx,dy)||1,ux=dx/len,uy=dy/len,px=-uy,py=ux,waves=7,flow=(this.deliveryT*.72)%1;
        ctx.save();ctx.strokeStyle=C.c;ctx.lineWidth=VECTOR_LINE_WIDTH;ctx.globalAlpha=.68;
        for(let i=0;i<waves;i++){const t=.10+(((i/waves)+flow)%1)*.82,cx=lerp(origin.x,cp.x,t),cy=lerp(origin.y,cp.y,t),half=lerp(8,Math.min(34,10+len*.055),t),bow=lerp(5,18,t);ctx.beginPath();ctx.moveTo(cx+px*half,cy+py*half);ctx.quadraticCurveTo(cx+ux*bow,cy+uy*bow,cx-px*half,cy-py*half);ctx.stroke()}
        ctx.restore()
      }
    }
    drawMesh({type:'cabinParcel',x:state.point[0],y:state.point[1],z:state.point[2],s:.5,mx:1.02,my:.22,mz:.70,rot:[0,0,0]},courierFixtureBoxMesh,state.landed?C.y:C.c,.98)
  }
  drawRelayConsoleScreen(){
    if(!this.isRelayDestination()||!this.relayScreenRect)return;
    const sr=this.relayScreenRect,col=C.c;
    const corners=[[sr.x0,sr.y0,sr.z],[sr.x1,sr.y0,sr.z],[sr.x1,sr.y1,sr.z],[sr.x0,sr.y1,sr.z]]
      .map(v=>this.relayRelativePoint(v)).map(v=>v?proj(v):null);
    if(corners.every(Boolean))for(let i=0;i<4;i++)line(corners[i].x,corners[i].y,corners[(i+1)%4].x,corners[(i+1)%4].y,col,1,.98);
    const left=sr.x0,right=sr.x1,bottom=sr.y0,top=sr.y1,rowTime=this.relayCalibrateT*.48;
    for(let row=0;row<7;row++){
      const y=bottom+.10+((row*.137+rowTime)%(top-bottom-.16)),phase0=(row*.173+this.relayCalibrateT*.09)%1;
      for(let seg=0;seg<4;seg++){
        const x=left+.09+((phase0+seg*.245)%1)*(right-left-.28),len=.09+.11*(.5+.5*Math.sin(row*2.7+seg*4.1));
        const A=this.relayRelativePoint([x,y,sr.z-.015]),B=this.relayRelativePoint([Math.min(right-.07,x+len),y,sr.z-.015]);
        const a=A?proj(A):null,b=B?proj(B):null;if(a&&b)line(a.x,a.y,b.x,b.y,seg%2?C.g:C.c,.82,.90)
      }
    }
  }
  relayCargoState(){
    if(this.terminalDestination!=='swamp_relay_delivery'||!this.deliveryWorld)return null;
    const target=[this.deliveryWorld[0],this.deliveryWorld[1],this.deliveryWorld[2]-travel];
    if(this.deliveryLanded||this.terminalState==='deliveryHold'||this.terminalState==='missionSpeech'||this.terminalState==='departing')return{point:target,beam:false,landed:true};
    if(this.terminalState!=='delivery')return null;
    const origin=cameraPointToWorld([0,-.34,1.05]),q=this.deliveryProgress;
    return{point:[lerp(origin[0],target[0],q),lerp(origin[1],target[1],q),lerp(origin[2],target[2],q)],beam:q>.01&&q<.995,landed:false}
  }
  drawRelayCargo(){
    const state=this.relayCargoState();if(!state)return;
    const cp=proj(state.point);
    if(state.beam&&cp){
      const origin=proj(cameraPointToWorld([0,-.34,.62]));if(origin){
        const dx=cp.x-origin.x,dy=cp.y-origin.y,len=Math.hypot(dx,dy)||1,ux=dx/len,uy=dy/len,px=-uy,py=ux,waves=7,flow=(this.deliveryT*.72)%1;
        ctx.save();ctx.strokeStyle=C.c;ctx.lineWidth=VECTOR_LINE_WIDTH;ctx.globalAlpha=.68;
        for(let i=0;i<waves;i++){const t=.10+(((i/waves)+flow)%1)*.82,cx=lerp(origin.x,cp.x,t),cy=lerp(origin.y,cp.y,t),half=lerp(8,Math.min(34,10+len*.055),t),bow=lerp(5,18,t);ctx.beginPath();ctx.moveTo(cx+px*half,cy+py*half);ctx.quadraticCurveTo(cx+ux*bow,cy+uy*bow,cx-px*half,cy-py*half);ctx.stroke()}
        ctx.restore()
      }
    }
    // Tractor arcs are drawn after the environment, so repaint the same exact solid
    // cuboid once more before the parcel while a delivery is actually in progress.
    // This second pass is only for the late tractor effect; the normal facility pass
    // above already keeps building/deck lines out of the plinth at all other times.
    if(this.relayOutpost){
      drawMesh({type:'swampRelayDeliveryPlinthTractorOccluder',x:this.relayOutpost.x,y:this.relayOutpost.y,z:this.relayOutpost.worldZ-travel,s:this.relayOutpost.s,rot:this.relayOutpost.rot},swampRelayDeliveryPlinthMesh,C.w,.96)
    }
    drawMesh({type:'relayParcel',x:state.point[0],y:state.point[1],z:state.point[2],s:.5,mx:1.02,my:.22,mz:.70,rot:[0,0,0]},courierFixtureBoxMesh,state.landed?C.y:C.c,.98)
  }
  drawRelayCalibration(){
    if(this.terminalDestination!=='swamp_relay_console'||this.terminalState!=='calibrate'||!this.relayScreenRect)return;
    const sr=this.relayScreenRect,world=this.relayRelativePoint([(sr.x0+sr.x1)*.5,(sr.y0+sr.y1)*.5,sr.z-.10]);
    if(!world)return;const target=camPoint(world);if(!target||target[2]<=.24)return;
    stationHack.drawDataRamp([0,-.62,.82],target,this.dataPackets,{sourceHalf:.90,targetHalf:.43,drawRails:false})
  }
  drawTrees(){
    const visible=[];
    for(const t of this.trees){
      t.z=t.worldZ-travel;if(t.z<.35||t.z>82)continue;
      const q=camPoint([t.x,t.y,t.z]);if(q[2]<=.18)continue;
      visible.push({d:q[2],draw:()=>drawLayeredForestTree(t,t.corridorMesh||t.mesh,t.assetId,t.obstacle?1:.93)})
    }
    if(this.terminalDestination==='cabin_delivery'&&this.cabin&&this.cabinMesh){
      const z=this.cabin.worldZ-travel,q=camPoint([this.cabin.x,this.cabin.y+1.6,z]);
      if(q[2]>.18&&q[2]<145)visible.push({d:q[2],draw:()=>drawMesh({type:'forestCabin',x:this.cabin.x,y:this.cabin.y,z,s:this.cabin.s,rot:this.cabin.rot},this.cabinMesh,C.o,.96)})
    }
    visible.sort((a,b)=>b.d-a.d);for(const item of visible)item.draw();
    this.drawCabinCargo()
  }
  hudRight(){
    if(!this.active)return'';
    if(this.terminalDestination==='cabin_delivery'){
      if(this.terminalState==='run')return`${this.sceneRouteLabel()} ${Math.round(clamp((travel-this.startWorld)/this.length,0,1)*100)}%`;
      if(this.terminalState==='glade')return'CABIN AHEAD';
      if(this.terminalState==='approach'||this.terminalState==='settle')return'AUTOPILOT · DELIVERY';
      if(this.terminalState==='delivery')return'DELIVERING PARCEL';
      if(this.terminalState==='deliveryHold')return'DELIVERY COMPLETE';
      if(this.terminalState==='missionSpeech'||this.terminalState==='departing')return'MISSION COMPLETE'
    }
    if(this.isRelayDestination()){
      if(this.terminalState==='run')return`${this.sceneRouteLabel()} ${Math.round(clamp((travel-this.startWorld)/this.length,0,1)*100)}%`;
      if(this.terminalState==='glade')return'RELAY POST AHEAD';
      if(this.terminalState==='approach'||this.terminalState==='settle')return this.relayAction()==='console'?'AUTOPILOT · TERMINAL':'AUTOPILOT · DELIVERY';
      if(this.terminalState==='delivery')return'DELIVERING PARCEL';
      if(this.terminalState==='deliveryHold')return'DELIVERY COMPLETE';
      if(this.terminalState==='calibrate')return'RECALIBRATING TERMINAL';
      if(this.terminalState==='consoleHold')return'TERMINAL CALIBRATED';
      if(this.terminalState==='missionSpeech'||this.terminalState==='departing')return'MISSION COMPLETE'
    }
    if(this.terminalDestination==='wreckage_recovery'){
      if(this.terminalState==='run')return`${this.sceneRouteLabel()} ${Math.round(clamp((travel-this.startWorld)/this.length,0,1)*100)}%`;
      if(this.terminalState==='approach'||this.terminalState==='settle')return'AUTOPILOT · RECORDER';
      if(this.terminalState==='download')return'RECOVERING DATA';
      if(this.terminalState==='dataHold')return'DATA RECOVERED';
      if(this.terminalState==='missionSpeech'||this.terminalState==='departing')return'MISSION COMPLETE'
    }
    const p=clamp((travel-this.startWorld)/this.length,0,1);
    return this.finishing?'ROUTE COMPLETE':`${this.sceneRouteLabel()} ${Math.round(p*100)}%`
  }
}



// Corridor-only tree LOD. The normal plains renderer continues to use the complete
// meshes. Healthy forest-bank pines get one of a small set of compact inward-facing
// meshes, chosen from their authored yaw and bank side once when the course is built.
// The compact meshes retain the original black face occlusion while painting only
// the inward face set instead of the complete 360-degree tree.
const forestCorridorHalfMeshCache=new WeakMap();
const FOREST_CORRIDOR_HALF_SECTORS=16;
function forestTreeLayer(mesh,assetId){
  return (mesh&&('woodFaces' in mesh||'foliageFaces' in mesh))?mesh:forestTreeLayerLayout[assetId]
}
const forestTreeFaceEdgeCache=new WeakMap();
function forestTreeFaceEdges(mesh){
  let set=forestTreeFaceEdgeCache.get(mesh);if(set)return set;set=new Set();
  for(const face of mesh?.faces||[])for(let i=0;i<face.length;i++){const a=face[i],b=face[(i+1)%face.length];set.add(a<b?`${a}:${b}`:`${b}:${a}`)}
  forestTreeFaceEdgeCache.set(mesh,set);return set
}

const forestShortTrunkMeshCache=new WeakMap();
function buildForestShortTrunkMesh(mesh,assetId){
  const layout=forestTreeLayer(mesh,assetId);if(!layout||!mesh?.v?.length)return mesh;
  if(assetId!=='pineTall'&&assetId!=='pineBroad'&&assetId!=='pineYoung')return mesh;
  const foliageFaceSrc=new Set(Array.isArray(layout.foliageFaces)?layout.foliageFaces:[]);
  let canopyBase=Infinity;
  for(const fi of foliageFaceSrc){
    const face=mesh.faces?.[fi];if(!face)continue;
    for(const vi of face)canopyBase=Math.min(canopyBase,mesh.v[vi][1])
  }
  const trunkCapY=Number.isFinite(canopyBase)?canopyBase-.035:null;
  if(!Number.isFinite(trunkCapY))return mesh;
  const woodFaceSrc=new Set(Array.isArray(layout.woodFaces)?layout.woodFaces:[]),folFaceSrc=foliageFaceSrc;
  const woodEdgeSrc=layout.woodEdges==='all'?new Set((mesh.e||[]).map((_,i)=>i)):new Set(Array.isArray(layout.woodEdges)?layout.woodEdges:[]);
  const folEdgeSrc=new Set(Array.isArray(layout.foliageEdges)?layout.foliageEdges:[]);
  const outVerts=[],vertexMap=new Map();
  const addVertex=v=>{
    const key=`${v[0].toFixed(7)},${v[1].toFixed(7)},${v[2].toFixed(7)}`;
    let idx=vertexMap.get(key);if(idx!=null)return idx;
    idx=outVerts.length;outVerts.push([v[0],v[1],v[2]]);vertexMap.set(key,idx);return idx
  };
  const clipWoodPoly=poly=>{
    const out=[];for(let i=0;i<poly.length;i++){
      const a=poly[i],b=poly[(i+1)%poly.length],ain=a[1]<=trunkCapY+.000001,bin=b[1]<=trunkCapY+.000001;
      if(ain)out.push([...a]);
      if(ain!==bin){
        const dy=b[1]-a[1],t=Math.abs(dy)<1e-9?0:(trunkCapY-a[1])/dy;
        out.push([a[0]+(b[0]-a[0])*t,trunkCapY,a[2]+(b[2]-a[2])*t])
      }
    }
    return out
  };
  const faces=[],woodFaces=[],foliageFaces=[];
  for(let fi=0;fi<(mesh.faces||[]).length;fi++){
    if(!woodFaceSrc.has(fi)&&!folFaceSrc.has(fi))continue;
    const isWood=woodFaceSrc.has(fi),srcPoly=mesh.faces[fi].map(vi=>mesh.v[vi]);
    if(isWood&&srcPoly.every(v=>v[1]>trunkCapY+.001))continue;
    const poly=isWood?clipWoodPoly(srcPoly):srcPoly.map(v=>[...v]);
    if(poly.length<3)continue;
    const ni=faces.length;faces.push(poly.map(addVertex));if(isWood)woodFaces.push(ni);if(folFaceSrc.has(fi))foliageFaces.push(ni)
  }
  const e=[],woodEdges=[],foliageEdges=[];
  for(let ei=0;ei<(mesh.e||[]).length;ei++){
    if(!woodEdgeSrc.has(ei)&&!folEdgeSrc.has(ei))continue;
    const src=mesh.e[ei],isWood=woodEdgeSrc.has(ei),v0=[...mesh.v[src[0]]],v1=[...mesh.v[src[1]]];
    let a0=v0,a1=v1;
    if(isWood){
      const in0=v0[1]<=trunkCapY+.000001,in1=v1[1]<=trunkCapY+.000001;if(!in0&&!in1)continue;
      if(in0!==in1){
        const lo=in0?v0:v1,hi=in0?v1:v0,dy=hi[1]-lo[1],t=Math.abs(dy)<1e-9?0:(trunkCapY-lo[1])/dy,cut=[lo[0]+(hi[0]-lo[0])*t,trunkCapY,lo[2]+(hi[2]-lo[2])*t];
        if(in0)a1=cut;else a0=cut
      }
    }
    const ni=e.length;e.push([addVertex(a0),addVertex(a1)]);if(isWood)woodEdges.push(ni);if(folEdgeSrc.has(ei))foliageEdges.push(ni)
  }
  if(!faces.length&&!e.length)return mesh;
  return{name:`${mesh.name||assetId} short-trunk`,v:outVerts,e,faces,woodFaces,woodEdges,foliageFaces,foliageEdges,_openWoodTopY:trunkCapY}
}
function forestShortTrunkMesh(mesh,assetId){
  if(assetId!=='pineTall'&&assetId!=='pineBroad'&&assetId!=='pineYoung')return mesh;
  let mapped=forestShortTrunkMeshCache.get(mesh);if(!mapped){mapped=new Map();forestShortTrunkMeshCache.set(mesh,mapped)}
  if(mapped.has(assetId))return mapped.get(assetId);
  const built=buildForestShortTrunkMesh(mesh,assetId);mapped.set(assetId,built);return built
}
function buildForestCorridorHalfMesh(mesh,assetId,sector){
  const layout=forestTreeLayer(mesh,assetId);if(!layout||!mesh?.v?.length)return mesh;
  // Healthy corridor trunks terminate just BELOW the first authored foliage tier.
  // Derive the cut from the actual foliage geometry rather than guessed constants.
  // This ensures no orange trunk geometry survives inside the canopy.
  const foliageFaceSrc=new Set(Array.isArray(layout.foliageFaces)?layout.foliageFaces:[]);
  let trunkCapY=null;
  if(assetId==='pineTall'||assetId==='pineBroad'||assetId==='pineYoung'){
    let canopyBase=Infinity;
    for(const fi of foliageFaceSrc){
      const face=mesh.faces?.[fi];if(!face)continue;
      for(const vi of face)canopyBase=Math.min(canopyBase,mesh.v[vi][1])
    }
    if(Number.isFinite(canopyBase))trunkCapY=canopyBase-.035
  }
  const a=sector*Math.PI*2/FOREST_CORRIDOR_HALF_SECTORS,ix=Math.cos(a),iz=Math.sin(a);
  let radius=.001;for(const v of mesh.v)radius=Math.max(radius,Math.hypot(v[0],v[2]));
  const keepPoint=(x,z)=>{const r=Math.hypot(x,z);return r<radius*.075||(x*ix+z*iz)/r>=-.22};
  const woodFaceSrc=new Set(Array.isArray(layout.woodFaces)?layout.woodFaces:[]),folFaceSrc=foliageFaceSrc;
  const selectedFaces=[];
  for(let fi=0;fi<(mesh.faces||[]).length;fi++){
    if(!woodFaceSrc.has(fi)&&!folFaceSrc.has(fi))continue;
    const face=mesh.faces[fi];if(!face?.length)continue;
    // The authored trunk lid is above the corridor cut and must never survive.
    if(Number.isFinite(trunkCapY)&&woodFaceSrc.has(fi)&&face.every(vi=>mesh.v[vi][1]>trunkCapY+.001))continue;
    let cx=0,cz=0;for(const vi of face){cx+=mesh.v[vi][0];cz+=mesh.v[vi][2]}cx/=face.length;cz/=face.length;
    if(keepPoint(cx,cz))selectedFaces.push(fi)
  }

  const woodEdgeSrc=layout.woodEdges==='all'?new Set((mesh.e||[]).map((_,i)=>i)):new Set(Array.isArray(layout.woodEdges)?layout.woodEdges:[]);
  const folEdgeSrc=new Set(Array.isArray(layout.foliageEdges)?layout.foliageEdges:[]),selectedEdges=[];
  const selectedFaceEdgeKeys=new Set();for(const fi of selectedFaces){const face=mesh.faces[fi];for(let i=0;i<face.length;i++){const a0=face[i],a1=face[(i+1)%face.length];selectedFaceEdgeKeys.add(a0<a1?`${a0}:${a1}`:`${a1}:${a0}`)}}
  for(let ei=0;ei<(mesh.e||[]).length;ei++){
    if(!woodEdgeSrc.has(ei)&&!folEdgeSrc.has(ei))continue;
    const edge=mesh.e[ei],key=edge[0]<edge[1]?`${edge[0]}:${edge[1]}`:`${edge[1]}:${edge[0]}`;
    if(selectedFaceEdgeKeys.has(key))continue;
    const v0=mesh.v[edge[0]],v1=mesh.v[edge[1]],mx=(v0[0]+v1[0])*.5,mz=(v0[2]+v1[2])*.5;
    if(keepPoint(mx,mz))selectedEdges.push(ei)
  }

  // Build the compact mesh from geometry, clipping WOOD polygons at trunkCapY.
  // This is a real geometric clip: no original trunk vertex above the canopy entry
  // is retained or merely squashed down. Foliage remains completely untouched.
  const outVerts=[],vertexMap=new Map();
  const addVertex=v=>{
    const key=`${v[0].toFixed(7)},${v[1].toFixed(7)},${v[2].toFixed(7)}`;
    let idx=vertexMap.get(key);if(idx!=null)return idx;
    idx=outVerts.length;outVerts.push([v[0],v[1],v[2]]);vertexMap.set(key,idx);return idx
  };
  const clipWoodPoly=poly=>{
    if(!Number.isFinite(trunkCapY))return poly.map(v=>[...v]);
    const out=[];for(let i=0;i<poly.length;i++){
      const a=poly[i],b=poly[(i+1)%poly.length],ain=a[1]<=trunkCapY+.000001,bin=b[1]<=trunkCapY+.000001;
      if(ain)out.push([...a]);
      if(ain!==bin){
        const dy=b[1]-a[1],t=Math.abs(dy)<1e-9?0:(trunkCapY-a[1])/dy;
        out.push([a[0]+(b[0]-a[0])*t,trunkCapY,a[2]+(b[2]-a[2])*t])
      }
    }
    return out
  };
  const faces=[],woodFaces=[],foliageFaces=[];
  for(const fi of selectedFaces){
    const isWood=woodFaceSrc.has(fi),srcPoly=mesh.faces[fi].map(vi=>mesh.v[vi]);
    const poly=isWood?clipWoodPoly(srcPoly):srcPoly.map(v=>[...v]);
    if(poly.length<3)continue;
    const ni=faces.length;faces.push(poly.map(addVertex));if(isWood)woodFaces.push(ni);if(folFaceSrc.has(fi))foliageFaces.push(ni)
  }

  const e=[],woodEdges=[],foliageEdges=[];
  for(const ei of selectedEdges){
    const src=mesh.e[ei],isWood=woodEdgeSrc.has(ei),v0=[...mesh.v[src[0]]],v1=[...mesh.v[src[1]]];
    let a0=v0,a1=v1;
    if(isWood&&Number.isFinite(trunkCapY)){
      const in0=v0[1]<=trunkCapY+.000001,in1=v1[1]<=trunkCapY+.000001;if(!in0&&!in1)continue;
      if(in0!==in1){const lo=in0?v0:v1,hi=in0?v1:v0,dy=hi[1]-lo[1],t=Math.abs(dy)<1e-9?0:(trunkCapY-lo[1])/dy,cut=[lo[0]+(hi[0]-lo[0])*t,trunkCapY,lo[2]+(hi[2]-lo[2])*t];if(in0)a1=cut;else a0=cut}
    }
    const ni=e.length;e.push([addVertex(a0),addVertex(a1)]);if(isWood)woodEdges.push(ni);if(folEdgeSrc.has(ei))foliageEdges.push(ni)
  }
  if(!faces.length&&!e.length)return mesh;
  return{name:`${mesh.name||assetId} corridor-half`,v:outVerts,e,faces,woodFaces,woodEdges,foliageFaces,foliageEdges,_corridorHalf:true,_openWoodTopY:Number.isFinite(trunkCapY)?trunkCapY:null}
}
function forestCorridorHalfMesh(mesh,assetId,rotY,inwardWorldX){
  let sectors=forestCorridorHalfMeshCache.get(mesh);if(!sectors){sectors=new Array(FOREST_CORRIDOR_HALF_SECTORS);forestCorridorHalfMeshCache.set(mesh,sectors)}
  // ry(): worldX=localX*c+localZ*s. Invert that rotation to express the corridor's
  // inward world-X direction in the authored model's local X/Z plane.
  const c=Math.cos(rotY),sn=Math.sin(rotY),lx=inwardWorldX*c,lz=inwardWorldX*sn;
  let sector=Math.round(Math.atan2(lz,lx)/(Math.PI*2)*FOREST_CORRIDOR_HALF_SECTORS)%FOREST_CORRIDOR_HALF_SECTORS;if(sector<0)sector+=FOREST_CORRIDOR_HALF_SECTORS;
  return sectors[sector]||(sectors[sector]=buildForestCorridorHalfMesh(mesh,assetId,sector))
}

const forestTreeLayerLayout={
  pineTall:{woodFaces:[0,1,2,3,4,5],woodEdges:[0,1,2,3,4,5,6,7,8,9,10,11],foliageFaces:[6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30],foliageEdges:[12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51]},
  pineBroad:{woodFaces:[0,1,2,3,4,5],woodEdges:[0,1,2,3,4,5,6,7,8,9,10,11],foliageFaces:[6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30],foliageEdges:[12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51]},
  pineYoung:{woodFaces:[0,1,2,3,4,5],woodEdges:[0,1,2,3,4,5,6,7,8,9,10,11],foliageFaces:[6,7,8,9,10,11,12,13,14,15,16,17,18,19,20],foliageEdges:[12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35]},
  pineDeadSparse:{woodFaces:[0,1,2,3,4,5],woodEdges:'all',foliageFaces:[],foliageEdges:[]},
  pineFallenAcrossPath:{woodFaces:[0,1,2,3,4,5],woodEdges:[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16],foliageFaces:[6,7,8,9,10,11,12,13,14,15,16,17,18,19,20],foliageEdges:[17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41]}
};
function resolvePaletteColor(col){
  if(!col)return null;
  if(typeof col!=='string')return col;
  return C[col]||col
}
function drawLayeredForestTree(obj,mesh,assetId,alphaScale=1){
  if(!obj||!mesh)return false;
  const layout=forestTreeLayer(mesh,assetId);
  if(!layout){drawMesh(obj,mesh,resolvePaletteColor(obj?.col)||resolvePaletteColor(mesh?.singleColorKey)||C.g,alphaScale);return true}
  const woodCol=resolvePaletteColor(layout.woodColorKey||layout.woodColor||mesh.woodColorKey||mesh.woodColor)||C.o;
  const foliageCol=resolvePaletteColor(layout.foliageColorKey||layout.foliageColor||mesh.foliageColorKey||mesh.foliageColor)||C.g;
  const rot=obj.rot||[0,0,0],mx=obj.mx||1,my=obj.my||1,mz=obj.mz||1;
  const cam=mesh.v.map(v=>{const q=rotate([v[0]*obj.s*mx,v[1]*obj.s*my,v[2]*obj.s*mz],rot);return camPoint([q[0]+obj.x,q[1]+obj.y,q[2]+obj.z])});
  const pts=cam.map(projectCam),depth=camPoint([obj.x,obj.y,obj.z])[2],alpha=clamp(1.12-depth/120,.32,.96)*alphaScale;
  const faceItems=[];
  const pushFaces=(indices,col)=>{for(const fi of indices||[]){const face=(mesh.faces||[])[fi];if(!face||face.length<3)continue;let z=0;const pp=[];let ok=true;for(const idx of face){const c=cam[idx],p=pts[idx];if(!c||!p||c[2]<=.18){ok=false;break}z+=c[2];pp.push(p)}if(ok)faceItems.push({pp,face,depth:z/face.length,col})}}
  pushFaces(layout.woodFaces,woodCol);pushFaces(layout.foliageFaces,foliageCol);
  faceItems.sort((a,b)=>b.depth-a.depth);
  const allFaceEdges=forestTreeFaceEdges(mesh);
  ctx.save();ctx.lineJoin='round';ctx.lineCap='round';ctx.lineWidth=VECTOR_LINE_WIDTH;
  for(const f of faceItems){
    ctx.beginPath();ctx.moveTo(f.pp[0].x,f.pp[0].y);for(let i=1;i<f.pp.length;i++)ctx.lineTo(f.pp[i].x,f.pp[i].y);ctx.closePath();
    ctx.globalAlpha=1;ctx.fillStyle='#000';ctx.fill();
    ctx.globalAlpha=alpha;ctx.strokeStyle=f.col;
    if(f.col===C.o&&Number.isFinite(mesh._openWoodTopY)){
      const top=mesh._openWoodTopY,eps=.0005;
      for(let i=0;i<f.face.length;i++){
        const j=(i+1)%f.face.length,a=f.face[i],b=f.face[j];
        if(Math.abs(mesh.v[a][1]-top)<eps&&Math.abs(mesh.v[b][1]-top)<eps)continue;
        ctx.beginPath();ctx.moveTo(f.pp[i].x,f.pp[i].y);ctx.lineTo(f.pp[j].x,f.pp[j].y);ctx.stroke()
      }
    }else ctx.stroke()
  }
  const drawLooseEdges=(edgeIdxs,col)=>{
    const list=edgeIdxs==='all'?(mesh.e||[]).map((_,i)=>i):edgeIdxs||[];
    ctx.strokeStyle=col;ctx.globalAlpha=alpha*.92;
    for(const ei of list){const ed=(mesh.e||[])[ei];if(!ed)continue;const key=ed[0]<ed[1]?`${ed[0]}:${ed[1]}`:`${ed[1]}:${ed[0]}`;if(allFaceEdges.has(key))continue;const a=pts[ed[0]],b=pts[ed[1]];if(a&&b){ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke()}}
  };
  drawLooseEdges(layout.woodEdges,woodCol);drawLooseEdges(layout.foliageEdges,foliageCol);ctx.restore();
  return true
}

