'use strict';
// ---------- Reusable bunker assault / recovery environment ----------
// Mission-authored layout/tuning is supplied through the story-content registry.
// This controller owns only the mechanisms: spawning/updating guns, Tesla behaviour,
// tunnel traversal, recovery, OSD-style physical delivery, etc.
const defaultBunkerContent=globalThis.AgentXSourceTraceContent;
if(!defaultBunkerContent)throw new Error('Default bunker content was not loaded');
const bunkerRaid={
  content:defaultBunkerContent,
  active:false,desired:defaultBunkerContent.surfaceAssault.guns.population.initial,spawnCooldown:0,bunkerMode:false,bunkerReached:false,navPulse:0,doorReminderPlayed:false,osdInstructionPlayed:false,
  raidState:'surface',tunnelLength:defaultBunkerContent.bunker.tunnelLength,roomLength:defaultBunkerContent.bunker.roomLength,outStartTravel:0,returnStartTravel:0,returnStartLocal:0,
  pickupStopLocal:defaultBunkerContent.bunker.pickupStopLocal,circuitryLocal:defaultBunkerContent.bunker.equipmentLocal,pickupT:0,circuitSecured:false,turnT:0,turnDir:1,devExitPending:false,
  surfaceGuns:[],teslaPylons:[],corridorStartX:0,corridorStartWorldZ:0,teslaWarning:0,teslaSide:0,teslaExposure:0,teslaDamageCD:0,
  osdT:0,osdState:'idle',osdFacility:null,osdFacilityScale:defaultBunkerContent.osdDelivery.facility.scale,osdDeliveryWorld:null,osdStandOffWorld:null,
  osdHatchWorld:null,osdHatchInnerWorld:null,osdHatchDoorT:0,osdCargoDims:null,osdDeliveryT:0,osdDeliveryProgress:0,
  osdDeliveryAnnounced:false,osdCargoLanded:false,osdFinishT:0,osdDepartClearWorld:null,
  configure(content){
    this.content=content||defaultBunkerContent;
    this.desired=this.content.surfaceAssault.guns.population.initial;
    this.tunnelLength=this.content.bunker.tunnelLength;this.roomLength=this.content.bunker.roomLength;
    this.pickupStopLocal=this.content.bunker.pickupStopLocal;this.circuitryLocal=this.content.bunker.equipmentLocal;
    this.osdFacilityScale=this.content.osdDelivery.facility.scale;
    return this
  },
  reset(){
    this.configure(this.content||defaultBunkerContent);
    this.active=false;this.spawnCooldown=0;this.bunkerMode=false;this.bunkerReached=false;this.navPulse=0;this.doorReminderPlayed=false;this.osdInstructionPlayed=false;
    this.raidState='surface';this.outStartTravel=0;this.returnStartTravel=0;this.returnStartLocal=0;this.pickupT=0;
    this.circuitSecured=false;this.turnT=0;this.turnDir=1;this.devExitPending=false;this.surfaceGuns=[];this.teslaPylons=[];
    this.corridorStartX=0;this.corridorStartWorldZ=0;this.teslaWarning=0;this.teslaSide=0;this.teslaExposure=0;this.teslaDamageCD=0;
    this.osdT=0;this.osdState='idle';this.osdFacility=null;this.osdDeliveryWorld=null;this.osdStandOffWorld=null;
    this.osdHatchWorld=null;this.osdHatchInnerWorld=null;this.osdHatchDoorT=0;this.osdCargoDims=null;this.osdDeliveryT=0;this.osdDeliveryProgress=0;
    this.osdDeliveryAnnounced=false;this.osdCargoLanded=false;this.osdFinishT=0;this.osdDepartClearWorld=null;
    audio?.teslaBuzz?.destroy?.()
  },
  begin(stage={}){
    const authored=globalThis.AgentXStoryContent?.sectionContent?.(stage?.contentId)||defaultBunkerContent;
    this.configure(authored);this.reset();this.active=true;this.bunkerMode=true;
    mode='play';phase='surface';phaseT=modeT=0;travel=0;score=0;
    fighters.length=0;asteroids.length=0;groundTargets.length=0;bolts.length=0;hazards.length=0;shots.length=0;playerMissiles.length=0;
    const startContent=this.content.surfaceAssault.start;
    inputX=inputY=aimX=aimY=viewYaw=viewPitch=viewRoll=shipX=0;shipY=startContent.shipY;surfaceVX=surfaceVY=0;surfaceDistance=0;
    surfaceNeutralYaw=surfaceNeutralPitch=0;surfacePylonVoicePlayed=true;surfaceSpawn=999;
    // A real approach rather than a shooting gallery: the fortress is a substantial
    // flight away and starts modestly off the nose, so BUNKER NAV matters without
    // turning the objective into a search exercise.
    const surfaceContent=this.content.surfaceAssault,side=Math.random()<.5?-1:1;
    entryBunkerWorldZ=surfaceContent.bunkerDistance;
    entryBunkerX=side*(surfaceContent.bunkerLateral.min+Math.random()*surfaceContent.bunkerLateral.span);surfaceBunkerActive=true;
    this.corridorStartX=shipX;this.corridorStartWorldZ=travel;
    tunnelOriginX=entryBunkerX;tunnelStartWorld=entryBunkerWorldZ+startContent.tunnelStartOffset;
    // This installation has no shield pylons. The physical blast gate is a simple
    // three-hit breach before the long interior run.
    bunkerDoorHp=surfaceContent.doorHp;bunkerDoorOpen=false;doorFlash=0;doorBreachAt=-1;doorBreachPending=0;doorPylonsDestroyed=0;
    resetPlanetBearing();resetSpaceMotion();resetSpaceDogfightDirector();spaceOrientationReady=false;
    // Reuse the established navigation marker/HUD, but keep the surface combat
    // movement model and red-gun field rather than SurfaceDestination's own flight.
    surfaceDestination.prepare({terrain:startContent.terrain,destination:startContent.destination,routeLength:entryBunkerWorldZ,treeClumps:startContent.treeClumps,entryRadius:surfaceContent.entryRadius});
    surfaceDestination.targetX=entryBunkerX;surfaceDestination.targetWorldZ=entryBunkerWorldZ;surfaceDestination.destination=startContent.destination;surfaceDestination.navPulse=0;
    this.seedTeslaPerimeter();
    for(let i=0;i<this.desired;i++)this.spawnGun(i,true);
    const startMessage=this.content.presentation.messages.start;
    audio.resetMissionVoices();audio.music.setMode(startContent.musicMode);audio.playVoice(this.content.speech.surfaceStart,{once:false,priority:true});say(stage.startMessage||startMessage.text,startMessage.hold)
  },
  corridorTAt(worldZ){
    return clamp((worldZ-this.corridorStartWorldZ)/Math.max(1,entryBunkerWorldZ-this.corridorStartWorldZ),0,1)
  },
  corridorCenterAt(worldZ){
    const t=this.corridorTAt(worldZ);return lerp(this.corridorStartX,entryBunkerX,t)
  },
  corridorHalfWidthAt(worldZ){
    const t=ease(this.corridorTAt(worldZ)),w=this.content.surfaceAssault.corridorHalfWidth;return lerp(w.start,w.end,t)
  },
  teslaRearRadius(){return this.corridorHalfWidthAt(this.corridorStartWorldZ)+this.content.surfaceAssault.tesla.sideOffset},
  seedTeslaPerimeter(){
    this.teslaPylons=[];this.teslaWarning=0;this.teslaSide=0;this.teslaExposure=0;this.teslaDamageCD=0;this.teslaBoundary='side';
    // The perimeter is a finite U, not two rows stretching backwards forever.
    // Side rows begin at the insertion line and run toward the bunker. A shallow
    // semicircular rear battery closes the insertion end so turning around cannot
    // be used to fly around the ends of the side rows.
    const tesla=this.content.surfaceAssault.tesla,start=this.corridorStartWorldZ,end=entryBunkerWorldZ-tesla.endBeforeBunker,spacing=tesla.spacing;
    let row=0;
    for(let wz=start;wz<=end+.01;wz+=spacing,row++){
      const centre=this.corridorCenterAt(wz),half=this.corridorHalfWidthAt(wz),stagger=(row&1)*tesla.rowStagger;
      for(const side of [-1,1])this.teslaPylons.push({kind:'side',side,worldZ:wz,x:centre+side*(half+tesla.sideOffset+stagger),phase:Math.random()*10})
    }
    const r=this.teslaRearRadius(),cx=this.corridorStartX,cz=this.corridorStartWorldZ,rearSteps=tesla.rearSteps;
    for(let i=1;i<rearSteps;i++){
      const a=Math.PI+i*Math.PI/rearSteps,x=cx+Math.cos(a)*r,wz=cz+Math.sin(a)*r;
      this.teslaPylons.push({kind:'rear',side:x<cx?-1:(x>cx?1:0),worldZ:wz,x,phase:Math.random()*10})
    }
  },
  updateTeslaPerimeter(dt){
    if(!this.teslaPylons.length||this.raidState!=='surface'){audio?.teslaBuzz?.silence?.();return}
    let lethal=false,depth=0,pan=0;
    const startZ=this.corridorStartWorldZ;
    if(travel<startZ){
      // Behind the insertion line the safe area is the inside of the rear semicircle.
      // This closes the U without any invisible straight wall across the player's back.
      const dx=shipX-this.corridorStartX,dz=travel-startZ,r=this.teslaRearRadius(),dist=Math.hypot(dx,dz);
      this.teslaBoundary='rear';this.teslaSide=dx<0?-1:(dx>0?1:0);
      const tesla=this.content.surfaceAssault.tesla;
      this.teslaWarning=clamp((dist-(r-tesla.warningInset))/tesla.warningInset,0,1);lethal=dist>r;depth=clamp((dist-r)/tesla.dangerDepth,0,1);pan=clamp(dx/r,-1,1)*tesla.pan;
    }else{
      const centre=this.corridorCenterAt(travel),half=this.corridorHalfWidthAt(travel),offset=shipX-centre,abs=Math.abs(offset);
      const tesla=this.content.surfaceAssault.tesla;
      this.teslaBoundary='side';this.teslaSide=offset<0?-1:1;this.teslaWarning=clamp((abs-(half-tesla.warningInset))/tesla.warningInset,0,1);
      lethal=abs>half;depth=clamp((abs-half)/tesla.dangerDepth,0,1);pan=this.teslaSide*tesla.pan;
    }
    if(lethal){
      this.teslaExposure+=dt;this.teslaDamageCD-=dt;
      // Crossing the line should be an unmistakable warning, not an instant kill.
      // Give the player roughly half a second to correct, then pace shield hits so a
      // full-health drone lasts about 3-4 seconds at the boundary. Penetrating
      // deeper into the forbidden side accelerates the discharge modestly.
      const tesla=this.content.surfaceAssault.tesla,warmup=tesla.warmup,shieldSteps=Math.max(2,(campaign?.maxShield?.()||6)+1);
      const hitInterval=clamp(tesla.shieldDrainSeconds/shieldSteps,tesla.hitIntervalMin,tesla.hitIntervalMax)*lerp(1,tesla.deepIntervalScale,depth);
      if(this.teslaExposure>warmup&&this.teslaDamageCD<=0){
        damage(this.content.presentation.damage.tesla);this.teslaDamageCD=hitInterval;
        if(mode==='dead'){audio?.teslaBuzz?.destroy?.();return}
      }
    }else{
      this.teslaExposure=Math.max(0,this.teslaExposure-dt*this.content.surfaceAssault.tesla.exposureDecay);this.teslaDamageCD=0
    }
    audio?.teslaBuzz?.update?.({intensity:lethal?1:this.teslaWarning,lethal,pan})
  },
  drawTeslaWorldSegmentClipped(a,b,col=C.c,w=VECTOR_LINE_WIDTH,alpha=.98,near=.20){
    let A=camPoint(a),B=camPoint(b),ain=A[2]>near,bin=B[2]>near;
    if(!ain&&!bin)return false;
    if(ain!==bin){
      const t=(near-A[2])/(B[2]-A[2]),q=[lerp(A[0],B[0],t),lerp(A[1],B[1],t),near];
      if(!ain)A=q;else B=q
    }
    const p0=projectCam(A),p1=projectCam(B);if(!p0||!p1)return false;
    line(p0.x,p0.y,p1.x,p1.y,col,w,alpha);return true
  },
  drawTeslaPylonAt(p,z,xOverride=null){
    // Draw the skeletal mast as clipped WORLD segments instead of handing the whole
    // object to a raw-world-Z cull. A mast behind or beside the player remains valid
    // whenever turning the camera brings any of it in front of the near plane.
    const visual=this.content.surfaceAssault.tesla.visual,x=xOverride==null?p.x:xOverride,floor=visual.floorY,s=visual.scale;
    const world=teslaPylonMastMesh.v.map(v=>[x+v[0]*s,floor+v[1]*s,z+v[2]*s]);
    for(const [ia,ib] of teslaPylonMastMesh.e)this.drawTeslaWorldSegmentClipped(world[ia],world[ib],C.y,VECTOR_LINE_WIDTH,.98);

    const topY=floor+visual.mastTop*s,ringY=topY-visual.ringDrop,rad=visual.ringRadius;
    const ring=[[x-rad,ringY,z],[x,ringY,z-rad],[x+rad,ringY,z],[x,ringY,z+rad]];
    for(let i=0;i<4;i++)this.drawTeslaWorldSegmentClipped(ring[i],ring[(i+1)%4],C.y,VECTOR_LINE_WIDTH,.96);
    const tr=visual.tipRadius,br=visual.baseRadius,tipY=topY+visual.tipRise,tips=[[x-tr,tipY,z],[x+tr,tipY,z],[x,tipY,z-tr],[x,tipY,z+tr]],base=[[x-br,topY,z],[x+br,topY,z],[x,topY,z-br],[x,topY,z+br]];
    for(let i=0;i<4;i++)this.drawTeslaWorldSegmentClipped(base[i],tips[i],C.y,VECTOR_LINE_WIDTH,.98);
    if(((time*2.4+p.phase)|0)%3===0){
      const A=camPoint(tips[0]),B=camPoint(tips[1]);
      if(A[2]>.20&&B[2]>.20){const a=projectCam(A),b=projectCam(B);if(a&&b){const mx=(a.x+b.x)*.5,my=(a.y+b.y)*.5-4;line(a.x,a.y,mx,my,C.c,.9,.7);line(mx,my,b.x,b.y,C.c,.9,.7)}}
    }
  },
  appendTeslaScene(scene){
    if(!this.active||!this.bunkerMode||!this.teslaPylons.length)return;
    for(const p of this.teslaPylons){
      const z=p.worldZ-travel;
      // Cull in CAMERA space using the middle of the tall mast and a generous near
      // overlap. Never use raw world Z here: that made towers disappear when the
      // player looked sideways/back towards a pylon that was physically behind them.
      const visual=this.content.surfaceAssault.tesla.visual,d=camPoint([p.x,visual.floorY+visual.sceneCentreHeight,z])[2];
      if(d>visual.sceneCullNear&&d<visual.sceneCullFar)scene.push({z:Math.max(.18,d),draw:()=>this.drawTeslaPylonAt(p,z)})
    }
  },
  nearestTeslaPylons(side=this.teslaSide){
    const pool=this.teslaBoundary==='rear'?this.teslaPylons.filter(p=>p.kind==='rear'):
      this.teslaPylons.filter(p=>p.kind!=='rear'&&p.side===side);
    return pool.sort((a,b)=>Math.hypot(a.x-shipX,a.worldZ-travel)-Math.hypot(b.x-shipX,b.worldZ-travel)).slice(0,2)
  },
  drawTeslaArcs(){
    if(!this.active||this.raidState!=='surface'||this.teslaWarning<=.02)return;
    // In first-person flight the drone itself sits below the camera. Aim the arc at
    // that real camera-local drone position (bottom centre of the view), not at a
    // world point in front of the camera which made the electricity miss visually.
    const targetWorld=cameraPointToWorld(this.content.surfaceAssault.tesla.visual.arcTarget),target=proj(targetWorld);if(!target)return;
    const lethal=this.teslaExposure>0,srcs=this.nearestTeslaPylons();
    for(let n=0;n<srcs.length;n++){
      if(!lethal&&n>0)break;
      const p=srcs[n],z=p.worldZ-travel,visual=this.content.surfaceAssault.tesla.visual,head=proj([p.x,visual.floorY+visual.mastTop*visual.scale+visual.tipRise,z]);if(!head)continue;
      // One discharge path only. Keep it visibly electrical: many short, irregular
      // bends rather than a nearly-straight polyline. On a live hit the SAME jagged
      // channel flickers rapidly between white and cyan; there is never a second
      // cyan guide/beam underneath it.
      const count=18,pts=[];
      const dx=target.x-head.x,dy=target.y-head.y,L=Math.max(1,Math.hypot(dx,dy)),px=-dy/L,py=dx/L;
      const flicker=(Math.floor(time*22+n*3+p.phase*1.7)&1)===0;
      for(let i=0;i<=count;i++){
        const t=i/count,x=lerp(head.x,target.x,t),y=lerp(head.y,target.y,t);
        // Taper jitter to zero at both ends so the arc remains attached to the
        // emitter and the player's drone while the middle dances violently.
        const envelope=Math.sin(t*Math.PI),amp=envelope*(lethal?18:10);
        const j1=Math.sin(i*12.73+time*47+p.phase*2.1+n*5.3);
        const j2=Math.sin(i*29.41-time*33+p.phase*5.7+n*11.2)*.52;
        const j3=Math.cos(i*7.19+time*61+p.phase*1.3)*.28;
        const jitter=(j1+j2+j3)*amp;
        pts.push({x:x+px*jitter,y:y+py*jitter})
      }
      const col=lethal?(flicker?C.w:C.c):C.c,alpha=lethal?.99:.52*this.teslaWarning;
      for(let i=0;i<count;i++)line(pts[i].x,pts[i].y,pts[i+1].x,pts[i+1].y,col,VECTOR_LINE_WIDTH,alpha)
    }
  },
  drawReturnTeslaPylons(doorDepth=0,outwardTravel=0){
    if(!this.teslaPylons.length)return;
    const items=[];
    for(const p of this.teslaPylons){
      const outside=Math.max(0,entryBunkerWorldZ-p.worldZ),z=doorDepth+outside-outwardTravel;
      const visual=this.content.surfaceAssault.tesla.visual,x=entryBunkerX-(p.x-entryBunkerX),d=camPoint([x,visual.floorY+visual.sceneCentreHeight,z])[2];
      if(d>visual.sceneCullNear&&d<visual.sceneCullFar)items.push({d:Math.max(.18,d),p,z,x})
    }
    items.sort((a,b)=>b.d-a.d);for(const it of items)this.drawTeslaPylonAt(it.p,it.z,it.x)
  },
  spawnGun(index=0,initial=false){
    // Build the defensive field ALONG the actual line to the fortress, not along
    // global +Z. The bunker begins off-axis, so every successive belt follows the
    // route the player is being asked to penetrate.
    let x,worldZ;
    const bx=Number.isFinite(entryBunkerX)?entryBunkerX:shipX,bz=Number.isFinite(entryBunkerWorldZ)?entryBunkerWorldZ:travel+900;
    const vx=bx-shipX,vz=bz-travel,len=Math.max(.001,Math.hypot(vx,vz)),fx=vx/len,fz=vz/len,rx=fz,rz=-fx;
    if(initial){
      // Keep the same overall defensive density, but do NOT front-load the field.
      // The first belt is deliberately sparse; each later belt becomes denser as
      // the player closes on the bunker, culminating in the heavy inner defence.
      // Stratify the thirty emplacements across many shallow belts instead of
      // five chunky rows.  Pressure still rises toward the fortress, but the field
      // reads as a continuous defended plain rather than clumps followed by holes.
      // Spread the authored battery continuously along the whole approach instead
      // of placing guns in visible clumps/rows. Longitudinal spacing is nearly even,
      // while a low-discrepancy lane sequence keeps left/right/centre coverage varied.
      const count=Math.max(1,this.desired),t=count<=1?0:index/(count-1);
      const authored=this.content.surfaceAssault.guns.initialField;
      const forward=authored.forwardStart+authored.forwardSpan*t+(Math.random()-.5)*authored.forwardJitter;
      const laneSeq=authored.lanes;
      const laneNorm=laneSeq[index%laneSeq.length]+(Math.random()-.5)*authored.laneJitter;
      const wz=travel+fz*forward,usable=Math.max(authored.minimumUsableHalfWidth,this.corridorHalfWidthAt(wz)-authored.edgeInset);
      const lane=clamp(laneNorm,-authored.laneClamp,authored.laneClamp)*usable;
      x=shipX+fx*forward+rx*lane;worldZ=travel+fz*forward+rz*lane;
    }else{
      const remaining=Math.hypot(bx-shipX,bz-travel),replacement=this.content.surfaceAssault.guns.replacements;
      if(remaining<replacement.minimumRemaining)return false;
      // Replacements use a small best-of-N spacing pass rather than pure random
      // placement. This preserves the organic field while preventing several guns
      // from appearing in one knot with a large empty patch beside them.
      const close=remaining<replacement.nearThreshold,range=close?replacement.nearForward:replacement.farForward;
      const maxForward=Math.max(replacement.minForwardBase,remaining-replacement.bunkerClearance),near=range.near,far=Math.min(maxForward,range.far);
      const existing=groundTargets.filter(g=>g.type==='landgun'&&!g.dead&&!g.dying&&!g.wallMount&&Number.isFinite(g.worldZ));
      let best=null,bestClear=-1;
      for(let attempt=0;attempt<replacement.attempts;attempt++){
        const forward=near+Math.random()*Math.max(1,far-near),wz=travel+fz*forward;
        const cc=this.corridorCenterAt(wz),usable=Math.max(replacement.minimumUsableHalfWidth,this.corridorHalfWidthAt(wz)-replacement.edgeInset);
        // Alternate broad left/right coverage but retain some central guns.
        const side=(attempt&1)?1:-1,edge=attempt%replacement.edgeEvery===0;
        let lateral=edge?side*usable*(replacement.edgeMin+Math.random()*replacement.edgeSpan):(Math.random()*2-1)*usable*replacement.randomWidth;
        const cx=shipX+fx*forward+rx*lateral,cz=travel+fz*forward+rz*lateral;
        const clear=existing.length?Math.min(...existing.map(g=>Math.hypot(cx-g.x,cz-g.worldZ))):999;
        if(clear>bestClear){bestClear=clear;best={x:cx,worldZ:cz}}
      }
      if(!best)return false;x=best.x;worldZ=best.worldZ;
    }
    const placement=this.content.surfaceAssault.guns.replacements,cc=this.corridorCenterAt(worldZ),usable=Math.max(placement.minimumUsableHalfWidth,this.corridorHalfWidthAt(worldZ)-placement.edgeInset);
    x=cc+clamp(x-cc,-usable,usable);
    const gunContent=this.content.surfaceAssault.guns,gunScale=gunContent.initialField,emplacement=gunContent.emplacement,s=gunScale.scaleBase+Math.random()*gunScale.scaleSpan;
    const dx=shipX-x,dz=travel-worldZ;
    groundTargets.push({
      type:'landgun',landGunTest:true,worldZ,x,y:emplacement.floorY+emplacement.pivotHeightFactor*s,z:worldZ-travel,s,hp:emplacement.hp,hitFx:0,
      yaw:Math.atan2(dx,dz),pitch:0,rot:[0,0,0],col:C.r,mesh:landGunDevPlinthMesh,
      // Stagger the batteries so the field produces rolling crossfire instead of
      // one synchronised volley followed by a long quiet gap.
      fireCD:emplacement.initialFireMin+Math.random()*emplacement.initialFireSpan,dead:false,shot:false,passed:false
    });return true
  },
  captureSurfaceGuns(){
    // Preserve the surviving exterior battery before the tunnel takes over the
    // shared ground-target list.  The same physical guns are then visible again
    // through the open entrance on the return run and after crossing the threshold.
    this.surfaceGuns=groundTargets.filter(g=>g.type==='landgun'&&!g.dead&&!g.dying&&Number.isFinite(g.worldZ))
      .filter(g=>{const d=entryBunkerWorldZ-g.worldZ,emplacement=this.content.surfaceAssault.guns.emplacement;return d>emplacement.returnCaptureNear&&d<emplacement.returnCaptureFar})
      .map(g=>({x:g.x,y:g.y,worldZ:g.worldZ,s:g.s,hp:g.hp,yaw:g.yaw||0,pitch:g.pitch||0,hitFx:0,dead:false}))
      .sort((a,b)=>(entryBunkerWorldZ-a.worldZ)-(entryBunkerWorldZ-b.worldZ));
  },
  mountRoll(g){return g?.wallMount?-(g.mountSide||1)*Math.PI*.5:0},
  mountVector(g,v){
    if(!g?.wallMount)return v;
    // The floor emplacement's local +Y is its plinth 'up' and local +Z is the
    // barrel's forward direction.  A 180-degree X flip first points the barrel
    // back toward the approaching player and reverses the plinth top; the existing
    // +/-90-degree Z roll then plants that top into the appropriate side wall.
    let q=rotate(v,[Math.PI,0,0]),r=this.mountRoll(g);
    return r?rotate(q,[0,0,r]):q
  },
  unmountVector(g,v){
    if(!g?.wallMount)return v;
    // Exact inverse of mountVector(): undo the wall roll, then the X flip, before
    // solving yaw/pitch in the gun's own local frame.
    const r=this.mountRoll(g);let q=r?rotate(v,[0,0,-r]):v;
    return rotate(q,[-Math.PI,0,0])
  },
  pivotWorld(g){
    let q=rotate([0,.48*g.s,.205*g.s],[0,g.yaw||0,0]);q=this.mountVector(g,q);
    return[g.x+q[0],g.y+q[1],g.z+q[2]]
  },
  muzzleWorld(g){
    const p=this.pivotWorld(g);let q=rotate([0,0,2.45*g.s],[g.pitch||0,g.yaw||0,0]);q=this.mountVector(g,q);
    return[p[0]+q[0],p[1]+q[1],p[2]+q[2]]
  },
  leadTarget(g,origin=null){
    // Hostile surface bolts are simulated in camera-relative surface space: the
    // player is always at local Z=0 while X/Y move with the craft.  Predicting the
    // player's WORLD-Z travel here made the gun aim short of the cockpit and could
    // let a bolt reach its false intercept/lifetime before ever crossing Z=0.
    // Solve the intercept in the SAME coordinate system as advanceHostileBolt().
    const o=origin||this.pivotWorld(g),shooter=[o[0],o[1],o[2]];
    const player=[shipX,shipY,0],vel=[surfaceVX,surfaceVY,0];
    // Keep the faster bunker-gun bolt speed as the single source of truth for both
    // visible gun lead and the projectile velocity created by aimBoltAtLead().
    const ballistics=this.content.surfaceAssault.guns.ballistics,speed=ballistics.speedBase+level*ballistics.speedPerLevel;
    const r=[player[0]-shooter[0],player[1]-shooter[1],player[2]-shooter[2]];
    const vv=vel[0]*vel[0]+vel[1]*vel[1]+vel[2]*vel[2],rv=r[0]*vel[0]+r[1]*vel[1]+r[2]*vel[2],rr=r[0]*r[0]+r[1]*r[1]+r[2]*r[2];
    const a=vv-speed*speed,b=2*rv,c=rr;
    let t=0;
    if(Math.abs(a)<1e-5){if(Math.abs(b)>1e-5)t=-c/b}
    else{
      const disc=b*b-4*a*c;
      if(disc>=0){
        const root=Math.sqrt(disc),t0=(-b-root)/(2*a),t1=(-b+root)/(2*a);
        const good=[t0,t1].filter(v=>v>ballistics.solveMinTime&&Number.isFinite(v));
        if(good.length)t=Math.min(...good)
      }
    }
    // If an exact intercept is impossible (usually after the player has passed a
    // gun), still lead strongly in the current direction rather than reverting to
    // dead-centre pursuit.  Cap prediction so a sudden turn can still beat it.
    if(!(t>ballistics.solveMinTime))t=Math.min(ballistics.fallbackTimeCap,Math.sqrt(rr)/Math.max(ballistics.fallbackSpeedFloor,speed));
    t=clamp(t*ballistics.leadScale,ballistics.leadTimeMin,ballistics.leadTimeMax);
    return{
      x:player[0]+vel[0]*t,
      y:player[1]+vel[1]*t,
      z:0,
      t,speed
    }
  },
  aimBoltAtLead(b,m,lead){
    if(!b||!lead)return;
    // Keep the normal projectile's hit/miss intent, visual behaviour and homing,
    // but centre that intent on the predicted intercept point rather than the
    // player's present position.
    const ballistics=this.content.surfaceAssault.guns.ballistics,dx=lead.x-m[0],dy=lead.y-m[1],dz=lead.z-m[2],dist=Math.max(ballistics.minimumDistance,Math.hypot(dx,dy,dz));
    const flight=Math.max(ballistics.minimumFlightTime,dist/lead.speed);
    let tx=lead.x,ty=lead.y,tz=lead.z;
    if(b.hitIntent){
      const [jx,jy,jz]=ballistics.hitJitter;tx+=(Math.random()-.5)*jx;ty+=(Math.random()-.5)*jy;tz+=(Math.random()-.5)*jz
    }else{
      const miss=ballistics.missDistanceMin+Math.random()*ballistics.missDistanceSpan,ang=Math.random()*Math.PI*2;
      tx+=Math.cos(ang)*miss;ty+=(Math.random()-.5)*miss*ballistics.missYScale;tz+=Math.sin(ang)*miss
    }
    b.targetX=tx;b.targetY=ty;b.targetZ=tz;
    b.vx=(tx-m[0])/flight;b.vy=(ty-m[1])/flight;b.vz=(tz-m[2])/flight;
    // A small safety margin covers homing curvature and evasive X/Y movement, but
    // the projectile is still range/lifetime bounded by the normal bolt updater.
    b.spawnDistance=dist;b.maxLife=flight+ballistics.lifeMargin;b.landGunShot=true
  },
  compositeMesh(g){
    const v=[],e=[],faces=[],mount=v=>this.mountVector(g,v);
    const add=(mesh,xf)=>{
      const off=v.length;
      for(const p of mesh.v)v.push(xf(p));
      for(const ed of mesh.e)e.push([off+ed[0],off+ed[1]]);
      for(const f of mesh.faces||[])faces.push(f.map(i=>off+i))
    };
    // Static plinth.  Wall guns reuse this exact model, simply reduced in scale and
    // rolled ninety degrees so the truncated hexagonal housing is planted in a wall.
    add(landGunDevPlinthMesh,p=>mount([p[0]*g.s,p[1]*g.s,p[2]*g.s]));
    // Traversing cradle.
    add(landGunDevYawMesh,p=>mount(rotate([p[0]*g.s,p[1]*g.s,p[2]*g.s],[0,g.yaw||0,0])));
    // Elevating barrel: pitch around its rear centre, then carry that whole local
    // assembly through the cradle yaw and finally through the fixed wall mounting.
    const pivot=[0,.48,.205],pivotYaw=rotate([0,pivot[1]*g.s,pivot[2]*g.s],[0,g.yaw||0,0]);
    add(landGunDevBarrelMesh,p=>{
      const rel=[(p[0]-pivot[0])*g.s,(p[1]-pivot[1])*g.s,(p[2]-pivot[2])*g.s];
      const r=rotate(rel,[g.pitch||0,g.yaw||0,0]);
      return mount([pivotYaw[0]+r[0],pivotYaw[1]+r[1],pivotYaw[2]+r[2]])
    });
    return{v,e,faces}
  },
  draw(g){
    const mesh=this.compositeMesh(g),obj={x:g.x,y:g.y,z:g.z,s:1,rot:[0,0,0],hitFx:g.hitFx||0};
    drawMesh(obj,mesh,objectHitColor(g,C.r))
  },
  seedTunnelDefences(){
    const wall=trenchWall();
    // Early tunnel: smaller versions of the same red surface emplacement, physically
    // rolled onto alternating side walls.  The plinth stays fixed to the wall while
    // its cradle and barrel retain their normal two-axis tracking.
    const wallGunContent=this.content.bunker.wallGuns,gunLocals=wallGunContent.positions;
    for(let i=0;i<gunLocals.length;i++){
      const local=gunLocals[i],side=(i&1)?1:-1,c=this.path(local),s=wallGunContent.scaleBase+(i%3)*wallGunContent.scaleStep;
      const yOff=i%2?wallGunContent.yOffsets.right:wallGunContent.yOffsets.left;
      groundTargets.push({
        type:'landgun',landGunTest:true,wallMount:true,mountSide:side,bunkerLocal:local,
        worldZ:this.outStartTravel+local,x:c.x+side*(wall-wallGunContent.mountInset),yOff,y:c.y+yOff,z:local,s,hp:wallGunContent.hp,hitFx:0,
        yaw:0,pitch:0,rot:[0,0,0],col:C.r,mesh:landGunDevPlinthMesh,
        fireCD:wallGunContent.initialFireMin+Math.random()*wallGunContent.initialFireSpan,dead:false,shot:false,passed:false
      })
    }

    // Later tunnel: a dense physical obstacle run rather than more guns.  Horizontal
    // and vertical armoured members alternate so the player has to move in both axes.
    const obstacleContent=this.content.bunker.obstacles,obstacleLocals=obstacleContent.positions;
    const hLevels=obstacleContent.horizontalLevels,vLevels=obstacleContent.verticalLevels;
    for(let i=0;i<obstacleLocals.length;i++){
      const local=obstacleLocals[i],vertical=(i%obstacleContent.verticalEvery===obstacleContent.verticalRemainder),heavy=(i%obstacleContent.heavyEvery===obstacleContent.heavyRemainder),z=local;
      const hp=heavy?obstacleContent.heavyHp:obstacleContent.normalHp;
      hazards.push({
        kind:'bunkerObstacle',bunkerObstacle:true,bunkerLocal:local,axis:vertical?'v':'h',
        worldZ:this.outStartTravel+local,z,
        y:vertical?0:hLevels[i%hLevels.length],xOff:vertical?vLevels[i%vLevels.length]:0,
        thick:vertical?obstacleContent.verticalThickness:obstacleContent.horizontalThickness,clearance:vertical?obstacleContent.verticalClearance:obstacleContent.horizontalClearance,
        hp,maxHp:hp,col:heavy?C.y:C.c,
        hitFx:0,dying:0,dead:false,passed:false
      })
    }
  },
  remapTunnelDefencesForReturn(){
    // travel always increases, even though the return path runs toward decreasing
    // tunnel-local coordinates.  Give every fixed defence a mirrored worldZ so the
    // ordinary sync/render/hit code sees the exact same physical object on the way out.
    for(const g of groundTargets){
      if(!g.wallMount||!Number.isFinite(g.bunkerLocal))continue;
      const wallGunContent=this.content.bunker.wallGuns;
      g.worldZ=this.returnStartTravel+this.returnStartLocal-g.bunkerLocal;g.fireCD=wallGunContent.returnFireMin+Math.random()*wallGunContent.returnFireSpan;g.passed=false
    }
    for(const h of hazards){
      if(!h.bunkerObstacle||!Number.isFinite(h.bunkerLocal))continue;
      h.worldZ=this.returnStartTravel+this.returnStartLocal-h.bunkerLocal;h.passed=false
    }
    bolts.length=0
  },
  updateTunnelDefences(dt){
    const wallGunContent=this.content.bunker.wallGuns,obstacleContent=this.content.bunker.obstacles;
    let active=bolts.reduce((n,b)=>n+(!b.dead&&b.landGunShot?1:0),0),maxBolts=wallGunContent.maxBolts;
    const wall=trenchWall();
    for(const g of groundTargets){
      if(!g.wallMount||g.dead||g.dying)continue;
      syncWorldZ(g);const c=this.path(g.bunkerLocal);g.x=c.x+g.mountSide*(wall-wallGunContent.mountInset);g.y=c.y+(g.yOff||0);
      const pivot=this.pivotWorld(g),target={x:shipX,y:shipY,z:0},dv=this.unmountVector(g,[target.x-pivot[0],target.y-pivot[1],target.z-pivot[2]]);
      const h=Math.max(.001,Math.hypot(dv[0],dv[2])),targetYaw=Math.atan2(dv[0],dv[2]),targetPitch=clamp(-Math.atan2(dv[1],h),wallGunContent.pitchMin,wallGunContent.pitchMax);
      const yawErr=wrapAngle(targetYaw-(g.yaw||0)),pitchErr=targetPitch-(g.pitch||0);
      g.yaw=wrapAngle((g.yaw||0)+clamp(yawErr,-dt*wallGunContent.yawRate,dt*wallGunContent.yawRate));g.pitch=moveToward(g.pitch||0,targetPitch,dt*wallGunContent.pitchRate);
      g.fireCD=(g.fireCD??(wallGunContent.defaultCooldownMin+Math.random()*wallGunContent.defaultCooldownSpan))-dt;
      if(g.z>wallGunContent.fireDepthMin&&g.z<wallGunContent.fireDepthMax&&this.wallGunSupportVisible(g)&&Math.abs(yawErr)<wallGunContent.yawTolerance&&Math.abs(pitchErr)<wallGunContent.pitchTolerance&&g.fireCD<=0){
        if(active<maxBolts){
          const m=this.muzzleWorld(g),lead=this.leadTarget(g,m),before=bolts.length;
          if(spawnBolt(m[0],m[1],m[2],...wallGunContent.boltArgs)&&bolts.length>before){
            const shot=bolts[bolts.length-1];
            this.aimBoltAtLead(shot,m,lead);
            // Tunnel bolts need a physical relationship with the tunnel itself.
            // Previously they could leave the curved corridor, stay alive off-wall,
            // and then be repeatedly portal-clipped into a cyan blob that appeared
            // to travel with the camera. Tag them for tunnel-boundary collision and
            // also impose a finite stale-shot ceiling independent of generic plasma.
            shot.bunkerTunnelShot=true;
            shot.maxLife=Math.min(Number.isFinite(shot.maxLife)?shot.maxLife:wallGunContent.boltMaxLife,wallGunContent.boltMaxLife);
            active++
          }
          g.fireCD=wallGunContent.fireCooldownMin+Math.random()*wallGunContent.fireCooldownSpan
        }else g.fireCD=wallGunContent.retryCooldownMin+Math.random()*wallGunContent.retryCooldownSpan
      }
    }
    for(const h of hazards){
      if(!h.bunkerObstacle||h.dead||h.dying)continue;syncWorldZ(h);
      if(!h.passed&&h.z>obstacleContent.collisionDepthMin&&h.z<obstacleContent.collisionDepthMax){
        const c=this.path(h.bunkerLocal),hit=h.axis==='v'?Math.abs(shipX-(c.x+h.xOff))<h.clearance:Math.abs(shipY-(c.y+h.y))<h.clearance;
        if(hit)damage(this.content.presentation.damage.tunnelObstacle);else score+=obstacleContent.passScore;h.passed=true
      }
    }
    for(const b of bolts){
      advanceHostileBolt(b,dt);
      if(b.dead||!b.bunkerTunnelShot)continue;

      // A tunnel projectile is only valid while it is physically inside the same
      // curved corridor as the player.  This was previously missing entirely: a
      // bolt could intersect a bend/side wall yet continue living outside the
      // tunnel, while clipTunnelToDepth() kept showing fragments of it through the
      // portal stack.  Test against the real centreline at the bolt's current depth.
      if(b.z>wallGunContent.boltTunnelDepthMin&&b.z<wallGunContent.boltTunnelDepthMax){
        const c=this.tunnelCenter(b.z),wall=trenchWall(),halfH=tunnelHalfH();
        const radius=wallGunContent.boltWallRadius;
        if(Math.abs(b.x-c.x)>=wall-radius||Math.abs(b.y-c.y)>=halfH-radius)b.dead=true
      }
      if((b.age||0)>wallGunContent.boltMaxLife||b.z<wallGunContent.boltCullBehind||b.z>wallGunContent.boltCullAhead)b.dead=true
    }
    for(let i=bolts.length-1;i>=0;i--)if(bolts[i].dead)bolts.splice(i,1)
  },
  drawBunkerObstacle(h){
    const c=this.path(h.bunkerLocal),col=hitFxColor(h.hitFx,h.col||C.c),z=h.z+.46;
    if(h.axis==='v'){
      drawMesh({type:'bunkerVObstacle',x:c.x+h.xOff,y:c.y,z,s:.5,mx:h.thick,my:tunnelHalfH()*2.06,mz:.82,rot:[0,0,0]},courierFixtureBoxMesh,col,.96)
    }else{
      drawMesh({type:'bunkerHObstacle',x:c.x,y:c.y+h.y,z,s:.5,mx:trenchWall()*2.06,my:h.thick,mz:.82,rot:[0,0,0]},courierFixtureBoxMesh,col,.96)
    }
  },
  returnSurfaceGunPose(src,z){
    const x=entryBunkerX-(src.x-entryBunkerX),g={...src,x,y:src.y,z,s:src.s,wallMount:false,mountSide:0,hitFx:0};
    const pivot=this.pivotWorld(g),dx=shipX-pivot[0],dy=shipY-pivot[1],dz=-pivot[2],hh=Math.max(.001,Math.hypot(dx,dz));
    g.yaw=Math.atan2(dx,dz);g.pitch=clamp(-Math.atan2(dy,hh),-.72,.30);return g
  },
  drawReturnSurfaceGuns(doorDepth=0,outwardTravel=0){
    if(!this.surfaceGuns.length)return;
    const visible=[];
    for(const src of this.surfaceGuns){
      const outside=Math.max(0,entryBunkerWorldZ-src.worldZ),z=doorDepth+outside-outwardTravel;
      const emplacement=this.content.surfaceAssault.guns.emplacement;
      if(z>emplacement.returnVisibleNear&&z<emplacement.returnVisibleFar)visible.push(this.returnSurfaceGunPose(src,z))
    }
    visible.sort((a,b)=>b.z-a.z);for(const g of visible)this.draw(g)
  },
  update(dt){
    if(!this.active)return;
    this.navPulse+=dt;surfaceDestination.navPulse=this.navPulse;
    this.updateTeslaPerimeter(dt);
    const bunkerDist=surfaceBunkerActive?surfaceBunkerDistance():Infinity;
    // The final defensive belt is intentionally thicker, but replacements stop as
    // the player reaches the actual fortress. Once the doorway is sensibly on-screen
    // hand over to the established breach autopilot instead of ending the DEV run.
    // Keep reinforcement pressure gradual. A sudden jump from 30 to 36 near the
    // bunker spawned a visible knot of emplacements and made the distribution lumpy.
    const gunContent=this.content.surfaceAssault.guns,pop=gunContent.population;
    this.desired=bunkerDist<pop.nearDistance?pop.near:bunkerDist<pop.midDistance?pop.mid:pop.far;
    if(!this.bunkerReached&&bunkerDist<gunContent.stopSpawningDistance){this.desired=0;this.spawnCooldown=999}
    if(!this.bunkerReached&&bunkerDist<gunContent.breachHandoffDistance){
      const breach=this.content.surfaceAssault.breach,bounds=breach.screenBounds;
      const bz=entryBunkerZ(),q=camPoint([entryBunkerX,breach.cameraY,bz]),bp=q[2]>breach.projectNear?projectCam(q):null;
      const lined=bp&&bp.x>W*bounds.left&&bp.x<W*bounds.right&&bp.y>viewH*bounds.top&&bp.y<viewH*bounds.bottom;
      if(q[2]>breach.minimumDepth&&lined){
        this.bunkerReached=true;this.desired=0;this.spawnCooldown=999;
        audio?.teslaBuzz?.silence?.();
        const message=this.content.presentation.messages.bunkerApproach;say(message.text,message.hold);beginTrenchEntry();return
      }
    }
    let live=0;
    // The emplacement field can contain thirty-plus guns, but that should not mean
    // thirty-plus simultaneous plasma bolts. Keep the danger in the crossfire and
    // predictive aim while limiting the amount of projectile clutter the player has
    // to read at once.
    // Restore the last balanced approach setting: three simultaneous red-gun bolts.
    // The later one-bolt cap made the defended corridor much too easy.
    const emplacement=gunContent.emplacement,maxLandGunBolts=gunContent.projectileCap;
    let activeLandGunBolts=bolts.reduce((n,b)=>n+(!b.dead&&b.landGunShot?1:0),0);
    for(const g of groundTargets){
      if(g.type!=='landgun'||g.dead||g.dying)continue;live++;syncWorldZ(g);
      // Every live surface emplacement tracks the drone continuously. The turret
      // points at the player's current position; predictive lead remains confined to
      // the projectile solution when a gun is actually allowed to fire.
      const pivot=this.pivotWorld(g),dx=shipX-pivot[0],dz=-pivot[2],h=Math.max(.001,Math.hypot(dx,dz));
      const targetYaw=Math.atan2(dx,dz),dy=shipY-pivot[1];
      const targetPitch=clamp(-Math.atan2(dy,h),emplacement.pitchMin,emplacement.pitchMax);
      const yawErr=wrapAngle(targetYaw-(g.yaw||0)),pitchErr=targetPitch-(g.pitch||0);
      g.yaw=wrapAngle((g.yaw||0)+clamp(yawErr,-dt*emplacement.trackingYawRate,dt*emplacement.trackingYawRate));
      g.pitch=moveToward(g.pitch||0,targetPitch,dt*emplacement.trackingPitchRate);

      const q=camPoint([g.x,g.y+.34*g.s,g.z]),depth=q[2],sp=depth>.18?projectCam(q):null;
      const readable=!!(sp&&sp.x>-emplacement.readablePaddingX&&sp.x<W+emplacement.readablePaddingX&&sp.y>-emplacement.readablePaddingY&&sp.y<viewH+emplacement.readablePaddingY);
      g.fireCD=(g.fireCD??(emplacement.defaultCooldownMin+Math.random()*emplacement.defaultCooldownSpan))-dt;
      if(readable&&depth>emplacement.fireDepthMin&&depth<emplacement.fireDepthMax&&Math.abs(yawErr)<emplacement.yawTolerance&&Math.abs(pitchErr)<emplacement.pitchTolerance&&g.fireCD<=0){
        if(activeLandGunBolts<maxLandGunBolts){
          const m=this.muzzleWorld(g),shotLead=this.leadTarget(g,m),before=bolts.length;
          // Use the standard hostile surface projectile; only its initial targeting is
          // replaced with the emplacement's predicted intercept solution.
          if(spawnBolt(m[0],m[1],m[2],...emplacement.boltArgs)&&bolts.length>before){
            this.aimBoltAtLead(bolts[bolts.length-1],m,shotLead);activeLandGunBolts++
          }
          g.fireCD=emplacement.fireCooldownMin+Math.random()*emplacement.fireCooldownSpan
        }else{
          // Do not let every waiting emplacement discharge on the same frame when a
          // projectile slot becomes free; a small random retry preserves rolling fire.
          g.fireCD=emplacement.retryCooldownMin+Math.random()*emplacement.retryCooldownSpan
        }
      }
      const planar=Math.hypot(g.x-shipX,g.worldZ-travel);
      if(planar<emplacement.collisionRadius&&!g.passed){damage(this.content.presentation.damage.surfaceCollision);g.passed=true}
      // Do not delete deliberately distant batteries. The old planar >270 cull
      // erased most of the authored mid/late field on frame one, then replacements
      // respawned near the player and caused the front-loaded clump. Retire only a
      // gun that has actually been passed and is well behind the flight position.
      if(g.worldZ<travel-emplacement.retireBehind)g.dead=true;
      if(planar>emplacement.resetPassedRadius)g.passed=false
    }
    this.spawnCooldown-=dt;
    if(!this.bunkerReached&&live<this.desired&&this.spawnCooldown<=0){
      if(this.spawnGun(0,false))this.spawnCooldown=emplacement.spawnCooldownMin+Math.random()*emplacement.spawnCooldownSpan;else this.spawnCooldown=emplacement.spawnFailureCooldown
    }
  },
  roomStart(){return this.tunnelLength-this.roomLength},
  path(local){
    const authored=this.content.bunker.path,u=clamp(local,0,this.tunnelLength),roomStart=this.roomStart();
    const gate=Math.pow(Math.max(0,Math.sin(Math.PI*u/this.tunnelLength)),authored.gatePower);
    const straighten=1-ease(clamp((u-roomStart)/authored.straightenDistance,0,1));
    const wave=(entry)=>Math.sin(u*entry.frequency+entry.phase)*entry.amplitude;
    const rawX=authored.xWaves.reduce((sum,entry)=>sum+wave(entry),0),rawY=authored.yWaves.reduce((sum,entry)=>sum+wave(entry),0);
    return{x:tunnelOriginX+rawX*gate*straighten,y:authored.centreY+rawY*gate*straighten}
  },
  tunnelProgress(){
    if(this.raidState==='return'||this.raidState==='turn')return clamp(this.returnStartLocal-(travel-this.returnStartTravel),0,this.returnStartLocal);
    return clamp(travel-this.outStartTravel,0,this.tunnelLength)
  },
  tunnelCenter(z){
    if(this.raidState==='return'){
      const p=this.tunnelProgress();return this.path(p-z)
    }
    const p=this.tunnelProgress();return this.path(p+z)
  },
  pointInsideTunnelPortal(point,portal){
    if(!point||!portal||portal.some(q=>!q))return false;
    let sign=0;
    for(let i=0;i<portal.length;i++){
      const a=portal[i],b=portal[(i+1)%portal.length];
      const cross=(b.x-a.x)*(point.y-a.y)-(b.y-a.y)*(point.x-a.x);
      if(Math.abs(cross)<.35)continue;
      const next=Math.sign(cross);
      if(sign&&next!==sign)return false;
      sign=next
    }
    return true
  },
  wallGunSupportVisible(g){
    // Wall-mounted objects must not appear before the piece of tunnel wall that
    // physically supports them. The room/tunnel renderer only constructs walls to
    // 54 units, and bends are represented by a stack of nearer portal apertures.
    // Test the gun's actual mount point against that same geometry rather than
    // clipping protruding pieces of the gun into view through an unseen wall.
    const authored=this.content.bunker.wallGuns;
    if(!g?.wallMount||!Number.isFinite(g.z)||g.z<=authored.supportVisibleNear||g.z>authored.supportVisibleFar)return false;
    const mount=proj([g.x,g.y,g.z]);if(!mount)return false;
    const step=authored.supportPortalStep,near=authored.supportPortalNear,scroll=travel%step,limit=Math.min(g.z,authored.supportVisibleFar);
    const depths=[near];
    for(let z=near+(step-scroll);z<limit;z+=step)depths.push(z);
    for(const z of depths){
      const local=this.sectionLocalAtDepth(z),c=this.tunnelCenter(z),sz=this.sectionSize(local);
      const portal=[proj([c.x-sz.w,c.y-sz.h,z]),proj([c.x+sz.w,c.y-sz.h,z]),proj([c.x+sz.w,c.y+sz.h,z]),proj([c.x-sz.w,c.y+sz.h,z])];
      if(!this.pointInsideTunnelPortal(mount,portal))return false
    }
    return true
  },
  ownsInteriorUpdate(){return this.active&&this.bunkerMode&&(phase==='bunkerTunnel'||phase==='bunkerReturn'||mode==='bunkerCircuitryPickup'||mode==='bunkerTurn'||mode==='bunkerSurfaceClear')},
  interiorForwardSpeed(){
    if(!this.active||!this.bunkerMode)return null;
    if(mode==='bunkerCircuitryPickup'||mode==='bunkerTurn')return 0;
    const movement=this.content.bunker.movement;
    if(mode==='bunkerSurfaceClear')return FLIGHT_SPEED*movement.surfaceClearSpeedMultiplier;
    if(mode==='play'&&(phase==='bunkerTunnel'||phase==='bunkerReturn'))return FLIGHT_SPEED*movement.tunnelSpeedMultiplier;
    return null
  },
  beginTunnel(){
    audio?.teslaBuzz?.silence?.();
    // Keep the surviving exterior battery before the shared target arrays are
    // repurposed for the interior.  Those same guns reappear through the doorway
    // when the player physically flies back out.
    this.captureSurfaceGuns();
    this.raidState='outbound';this.outStartTravel=travel;this.pickupT=0;this.circuitSecured=false;
    phase='bunkerTunnel';mode='play';phaseT=modeT=0;tunnelStartWorld=travel;tunnelOriginX=entryBunkerX;
    surfaceBunkerActive=false;surfaceDestination.reset();
    shipX=tunnelOriginX;shipY=this.content.bunker.path.centreY;viewYaw=viewPitch=viewRoll=0;inputX=inputY=aimX=aimY=0;surfaceVX=surfaceVY=0;
    groundTargets.length=0;bolts.length=0;hazards.length=0;shots.length=0;playerMissiles.length=0;
    this.seedTunnelDefences();
    reactorBoundaryWorld=escapeBoundaryWorld=exitDoorWorld=Infinity;
    const message=this.content.presentation.messages.accessTunnel;say(message.text,message.hold)
  },
  beginCircuitryPickup(){
    if(mode==='bunkerCircuitryPickup')return;
    mode='bunkerCircuitryPickup';phase='bunkerTunnel';modeT=0;this.raidState='pickup';this.pickupT=0;
    inputX=inputY=aimX=aimY=0;laserBurstRemaining=0;endLaserTrigger();
    // Once the recovery-room autopilot takes over, any surviving hostile tunnel bolts
    // should be gone. Otherwise they stop advancing in the special pickup/turn modes
    // and can appear as a cyan fuzzy blob stuck in front of the camera.
    bolts.length=0;
    const message=this.content.presentation.messages.recoverEquipment;
    audio.playVoice(this.content.speech.recoverEquipment,{once:false,priority:true});say(message.text,message.hold)
  },
  beginTurn(){
    mode='bunkerTurn';phase='bunkerReturn';modeT=0;this.raidState='turn';this.turnT=0;this.turnDir=Math.random()<.5?-1:1;
    this.returnStartLocal=this.pickupStopLocal;this.returnStartTravel=travel;
    const c=this.path(this.pickupStopLocal);shipX=c.x;shipY=c.y;viewYaw=viewPitch=viewRoll=0;inputX=inputY=aimX=aimY=0;
    // The turnaround is also a no-hostile-control phase, so clear any stray plasma
    // rather than letting it freeze in camera space during the scripted rotation.
    bolts.length=0;
    const message=this.content.presentation.messages.turningForExit;say(message.text,message.hold)
  },
  beginReturn(){
    mode='play';phase='bunkerReturn';modeT=phaseT=0;this.raidState='return';
    this.returnStartLocal=this.pickupStopLocal;this.returnStartTravel=travel;
    this.remapTunnelDefencesForReturn();
    const c=this.path(this.pickupStopLocal);shipX=c.x;shipY=c.y;viewYaw=viewPitch=viewRoll=0;inputX=inputY=aimX=aimY=0;
    const message=this.content.presentation.messages.returnThroughBunker;say(message.text,message.hold)
  },
  beginSurfaceClear(){
    this.raidState='surfaceClear';mode='bunkerSurfaceClear';phase='surface';modeT=phaseT=0;
    surfaceBunkerActive=false;groundTargets.length=0;bolts.length=0;hazards.length=0;shots.length=0;playerMissiles.length=0;
    inputX=inputY=aimX=aimY=0;viewYaw=viewPitch=viewRoll=0;travel=0;
    const message=this.content.presentation.messages.clearOfBunker;say(message.text,message.hold)
  },
  beginOsdSpace(){
    this.raidState='osdSpace';this.osdState='planetHold';this.osdT=0;this.devExitPending=false;this.bunkerMode=false;
    this.surfaceGuns=[];this.teslaPylons=[];surfaceDestination.reset();surfaceBunkerActive=false;
    fighters.length=0;asteroids.length=0;groundTargets.length=0;bolts.length=0;hazards.length=0;shots.length=0;playerMissiles.length=0;
    mode='play';phase='space';phaseT=modeT=0;travel=0;shipX=0;shipY=0;inputX=inputY=aimX=aimY=0;viewYaw=viewPitch=viewRoll=0;
    spaceYawVel=spacePitchVel=0;spaceOrientationReady=false;resetSpaceMotion();resetSpaceDogfightDirector();
    // The recovered circuitry is carried to a different OSD world.  Establish the
    // destination planet explicitly here so the post-bunker zoom resolves beside a
    // large orange globe before the ordinary planetary descent machinery takes over.
    const osdPlanet=this.content.osdDelivery.planet,side=Math.random()<.5?-1:1;
    planetWorld=[side*(osdPlanet.lateralMin+Math.random()*osdPlanet.lateralSpan),(Math.random()-.5)*osdPlanet.verticalSpan,osdPlanet.worldZ];planetRadius=osdPlanet.radius;
    planetTilt=(Math.random()<.5?-1:1)*(osdPlanet.tiltMin+Math.random()*osdPlanet.tiltSpan);planetSpin0=Math.random()*Math.PI*2;
    planetLandingBody='planet';planetLandingMoonIndex=-1;planetLandingColour=C[osdPlanet.colour]||C.o;planetMoons=[];
    const ls=Math.random()<.5?-1:1;landingAzimuth=ls*(osdPlanet.landingAzimuthMin+Math.random()*osdPlanet.landingAzimuthSpan);
    approachP=0;approachLocked=false;approachAlignT=0;approachLockT=0;approachStartCamCenter=camPoint(planetWorld);
    approachTargetRadius=planetRadius;approachTargetTilt=planetTilt;approachTargetCol=planetLandingColour;approachTargetSpin0=planetSpin0;approachSystemLock=[];
    const a=mission.planetAimAngles();approachTurnTargetYaw=a.yaw;approachTurnTargetPitch=a.pitch;
    const message=this.content.presentation.messages.osdDestination;
    audio.music.setMode(osdPlanet.musicMode);say(message.text,message.hold)
  },
  handleSurfaceExitComplete(){
    if(!this.active)return false;
    if(this.raidState==='surfaceClear'){this.beginOsdSpace();return true}
    if(this.raidState==='osdDeparture'){this.finish(true);return true}
    return false
  },
  updateOsdSpace(dt){
    if(!this.active||this.raidState!=='osdSpace'||phase!=='space'||mode!=='play')return false;
    const planetContent=this.content.osdDelivery.planet;
    this.osdT+=dt;viewRoll=moveToward(viewRoll,0,dt*planetContent.rollLevelRate);shipY=lerp(shipY,0,clamp(dt*planetContent.shipYLevelRate,0,1));
    if(this.osdT>=this.content.osdDelivery.planet.holdSeconds){this.raidState='osdDescent';mission.beginApproach()}
    return true
  },
  setupOsdFacility(){
    const osdContent=this.content.osdDelivery,facilityContent=osdContent.facility,hatchContent=osdContent.hatch;
    const mesh=globalThis.AgentXOSDFacility?.[facilityContent.model]||null;if(!mesh){console.error(`[OSD] Missing ${facilityContent.model} model`);return false}
    const s=this.osdFacilityScale,ground=surfaceDestination.groundY,h=mesh.deliveryHatch||{x:1.30,y:.21,z:-1.726,width:.56,height:.36,innerZ:-1.30};
    const minY=Math.min(...(mesh.v||[[0,0,0]]).map(v=>v[1]));
    // Key the compound to the actual cut-out front-wall hatch, not to an invented
    // point behind the wall. This keeps the visible door, nav point and tractor target
    // in one physical place.
    const deliveryZ=surfaceDestination.targetWorldZ+facilityContent.deliveryFrontOffset;
    const ox=surfaceDestination.targetX-h.x*s,oy=ground-minY*s,oz=deliveryZ-h.z*s;
    const wx=(lx)=>ox+lx*s,wz=(lz)=>oz+lz*s,wy=(ly)=>oy+ly*s;
    this.osdFacility={x:ox,y:oy,worldZ:oz,s,rot:[0,0,0],mesh};
    this.osdHatchWorld=[wx(h.x),wy(h.y),wz(h.z)];
    this.osdHatchInnerWorld=[wx(h.x),wy(h.y),wz(h.innerZ)];
    // Place the box on the visible recess floor and stop it short of the back wall.
    // The previous target used the recess' full inner-Z and sat a little too high.
    const openingW=h.width*s,openingH=h.height*s;
    // It is the SAME circuitry crate seen in the bunker. Keep the exact authored
    // width:height:depth ratio and scale all three axes together for the larger OSD
    // presentation. Never tune X/Y/Z independently again.
    const bunkerCargoDims=this.content.bunker.recoveryRoom.equipmentBox.dimensions;
    const cargoScale=(openingW*hatchContent.cargoWidthFraction)/bunkerCargoDims[0];
    const [cargoW,cargoH,cargoD]=bunkerCargoDims.map(v=>v*cargoScale);
    this.osdCargoDims=[cargoW,cargoH,cargoD];
    // Exact recess floor from drawOsdHatchRecess(): centre is -0.10H from hatch
    // centre and its half-height is 0.44H, hence floor = hatchY - 0.54H.
    const recessFloorY=this.osdHatchWorld[1]-openingH*hatchContent.recessFloorOffset;
    const recessDepth=Math.max(.5,this.osdHatchInnerWorld[2]-this.osdHatchWorld[2]);
    // Keep the parcel close to the mouth: its front face sits visibly inside the
    // opening rather than travelling to the back of the recess.
    const frontClearance=Math.max(hatchContent.frontClearanceMin,openingW*hatchContent.frontClearanceWidthFraction);
    const cargoInset=Math.min(recessDepth-cargoD*.5-hatchContent.backClearance,cargoD*.5+frontClearance);
    const cargoZ=this.osdHatchWorld[2]+cargoInset;
    this.osdDeliveryWorld=[wx(h.x),recessFloorY+cargoH*.5,cargoZ];
    this.osdStandOffWorld=[this.osdHatchWorld[0],this.osdHatchWorld[1]+hatchContent.standOffYOffset,deliveryZ+hatchContent.standOffZOffset];
    this.osdDepartClearWorld=[this.osdHatchWorld[0],ground+hatchContent.departGroundYOffset,deliveryZ+hatchContent.departZOffset];
    return true
  },
  beginOsdPlains(){
    if(!this.active)return false;
    this.raidState='osdApproach';this.osdState='approach';this.osdT=0;this.osdHatchDoorT=0;this.osdDeliveryT=0;this.osdDeliveryProgress=0;
    this.osdDeliveryAnnounced=false;this.osdCargoLanded=false;this.osdFinishT=0;this.devExitPending=false;
    const facilityContent=this.content.osdDelivery.facility,reserve=facilityContent.sceneryReservation||{};
    const side=Math.random()<.5?-1:1,targetX=side*(facilityContent.lateralMin+Math.random()*facilityContent.lateralSpan),targetWorldZ=facilityContent.targetWorldZ;
    const facilityMesh=globalThis.AgentXOSDFacility?.[facilityContent.model],hatch=facilityMesh?.deliveryHatch||{x:1.30,z:-1.726};
    if(!facilityMesh){console.error(`[OSD] Missing ${facilityContent.model} model`);return false}
    // Compute the actual fortress footprint before the plains scenery is generated.
    // The environment then simply never creates rocks inside that physical space.
    const fs=this.osdFacilityScale,deliveryZ=targetWorldZ+facilityContent.deliveryFrontOffset;
    const ox=targetX-hatch.x*fs,oz=deliveryZ-hatch.z*fs,verts=facilityMesh.v||[[0,0,0]];
    let minX=Infinity,maxX=-Infinity,minZ=Infinity,maxZ=-Infinity;
    for(const v of verts){const x=ox+v[0]*fs,z=oz+v[2]*fs;minX=Math.min(minX,x);maxX=Math.max(maxX,x);minZ=Math.min(minZ,z);maxZ=Math.max(maxZ,z)}
    const margin=Math.max(0,Number(reserve.footprintMargin)||0),approachLength=Math.max(0,Number(reserve.approachLength)||0),approachHalfWidth=Math.max(0,Number(reserve.approachHalfWidth)||0);
    const reservedSceneryZones=[{
      type:'box',centerX:(minX+maxX)*.5,centerZ:(minZ+maxZ)*.5,
      halfWidth:(maxX-minX)*.5+margin,halfDepth:(maxZ-minZ)*.5+margin
    }];
    if(approachLength>0&&approachHalfWidth>0)reservedSceneryZones.push({
      type:'corridor',x0:targetX,z0:Math.max(0,deliveryZ-approachLength),x1:targetX,z1:deliveryZ+margin,halfWidth:approachHalfWidth
    });
    const stage={
      terrain:facilityContent.terrain,destination:facilityContent.destination,scenery:facilityContent.scenery,routeLength:facilityContent.routeLength,targetWorldZ,targetX,
      rockClumps:facilityContent.rockClumps,entryRadius:facilityContent.entryRadius,manualCompletion:true,reservedSceneryZones
    };
    surfaceDestination.prepare(stage);
    if(!this.setupOsdFacility())return false;
    surfaceDestination.begin(stage);return true
  },
  beginOsdDelivery(){
    if(!this.active||this.raidState!=='osdApproach'||!this.osdStandOffWorld)return;
    this.raidState='osdDelivery';this.osdState='approach';this.osdDeliveryT=0;this.osdDeliveryProgress=0;this.osdFinishT=0;
    surfaceDestination.active=false;surfaceDestination.manualComplete=false;
    mode='osdDelivery';phase='osdSurface';modeT=phaseT=0;laserBurstRemaining=0;endLaserTrigger();inputX=inputY=aimX=aimY=0;
    const message=this.content.presentation.messages.osdAutopilot;say(message.text,message.hold)
  },
  updateOsdDelivery(dt){
    if(!this.active||this.raidState!=='osdDelivery'||mode!=='osdDelivery')return false;
    const sequence=this.content.osdDelivery.sequence,stand=this.osdStandOffWorld,target=this.osdDeliveryWorld,hatch=this.osdHatchWorld,depart=this.osdDepartClearWorld;
    if(!stand||!target||!hatch)return false;
    if(this.osdState==='approach'){
      const dx=stand[0]-shipX,dz=stand[2]-travel,d=Math.hypot(dx,dz),step=Math.min(d,sequence.approachSpeed*dt),ux=d>.001?dx/d:0,uz=d>.001?dz/d:1;
      shipX+=ux*step;travel+=uz*step;shipY=lerp(shipY,stand[1],clamp(dt*sequence.approachYRate,0,1));
      const desiredYaw=Math.atan2(dx,dz);viewYaw=moveTowardAngle(viewYaw,desiredYaw,dt*sequence.approachYawRate);viewPitch=moveToward(viewPitch,0,dt*sequence.approachPitchRate);viewRoll=moveToward(viewRoll,0,dt*sequence.approachRollRate);
      if(d<=sequence.approachEpsilon){shipX=stand[0];travel=stand[2];this.osdState='settle';this.osdFinishT=0}
      return true
    }
    if(this.osdState==='settle'){
      this.osdFinishT+=dt;const dz=Math.max(.1,hatch[2]-travel),desiredYaw=Math.atan2(hatch[0]-shipX,dz);
      viewYaw=moveTowardAngle(viewYaw,desiredYaw,dt*sequence.settleYawRate);viewPitch=moveToward(viewPitch,0,dt*sequence.settlePitchRate);viewRoll=moveToward(viewRoll,0,dt*sequence.settleRollRate);
      if(this.osdFinishT>sequence.settleSeconds&&Math.abs(wrapAngle(desiredYaw-viewYaw))<sequence.settleYawTolerance){this.osdState='open';this.osdFinishT=0;this.osdHatchDoorT=0}
      return true
    }
    if(this.osdState==='open'){
      this.osdHatchDoorT=clamp(this.osdHatchDoorT+dt*sequence.doorOpenRate,0,1);viewPitch=moveToward(viewPitch,0,dt*sequence.settlePitchRate);viewRoll=moveToward(viewRoll,0,dt*sequence.settleRollRate);
      const dz=Math.max(.1,hatch[2]-travel),desiredYaw=Math.atan2(hatch[0]-shipX,dz);viewYaw=moveTowardAngle(viewYaw,desiredYaw,dt*sequence.doorAimYawRate);
      if(this.osdHatchDoorT>=sequence.doorOpenComplete){this.osdState='delivery';this.osdDeliveryT=0;this.osdDeliveryProgress=0;this.osdFinishT=0}
      return true
    }
    if(this.osdState==='delivery'){
      this.osdDeliveryT+=dt;this.osdDeliveryProgress=ease(clamp((this.osdDeliveryT-sequence.deliveryDelay)/sequence.deliveryDuration,0,1));
      if(!this.osdDeliveryAnnounced&&this.osdDeliveryProgress>=sequence.deliveryComplete){
        this.osdDeliveryAnnounced=true;this.osdCargoLanded=true;SoundFX.objectiveComplete?.();audio.playVoice(this.content.speech.deliveryComplete,{once:false,priority:true});this.osdState='close';this.osdFinishT=0
      }
      return true
    }
    if(this.osdState==='close'){
      this.osdFinishT+=dt;
      if(this.osdFinishT>sequence.closeDelay)this.osdHatchDoorT=clamp(this.osdHatchDoorT-dt*sequence.doorCloseRate,0,1);
      if(this.osdHatchDoorT<=sequence.closeComplete&&this.osdFinishT>sequence.closeHold){this.osdCargoLanded=false;this.osdState='turn';this.osdFinishT=0}
      return true
    }
    if(this.osdState==='turn'){
      this.osdFinishT+=dt;const awayYaw=Math.atan2(shipX-hatch[0],travel-hatch[2])||Math.PI;
      viewYaw=moveTowardAngle(viewYaw,awayYaw,dt*sequence.turnYawRate);viewPitch=moveToward(viewPitch,0,dt*sequence.turnPitchRate);viewRoll=moveToward(viewRoll,0,dt*sequence.turnRollRate);
      if(this.osdFinishT>sequence.turnHold&&Math.abs(wrapAngle(awayYaw-viewYaw))<sequence.turnYawTolerance){this.osdState='depart';this.osdFinishT=0}
      return true
    }
    if(this.osdState==='depart'){
      const goal=depart||[shipX,shipY,travel-sequence.departFallbackDistance];
      const dx=goal[0]-shipX,dz=goal[2]-travel,d=Math.hypot(dx,dz),step=Math.min(d,sequence.departSpeed*dt),ux=d>.001?dx/d:0,uz=d>.001?dz/d:-1;
      shipX+=ux*step;travel+=uz*step;shipY=lerp(shipY,goal[1],clamp(dt*sequence.departYRate,0,1));
      const desiredYaw=Math.atan2(dx||0,dz||-1);viewYaw=moveTowardAngle(viewYaw,desiredYaw,dt*sequence.departYawRate);viewPitch=moveToward(viewPitch,0,dt*sequence.departPitchRate);viewRoll=moveToward(viewRoll,0,dt*sequence.departRollRate);
      if(d<=sequence.departEpsilon){this.raidState='osdDeparture';this.osdState='departing';this.devExitPending=true;beginSurfaceExit({scene:'osd'})}
      return true
    }
    return true
  },
  osdCargoState(){
    if(!this.osdHatchWorld||!this.osdDeliveryWorld)return null;
    const hatchOuter=[this.osdHatchWorld[0],this.osdHatchWorld[1],this.osdHatchWorld[2]-travel];
    const hatchInner=[this.osdDeliveryWorld[0],this.osdDeliveryWorld[1],this.osdDeliveryWorld[2]-travel];
    if(this.osdState==='delivery'){
      const tractor=this.content.osdDelivery.tractor,origin=cameraPointToWorld(tractor.cargoOrigin),q=this.osdDeliveryProgress;
      const arc=tractor.arcHeight*Math.sin(q*Math.PI),point=[lerp(origin[0],hatchInner[0],q),lerp(origin[1],hatchInner[1],q)+arc,lerp(origin[2],hatchInner[2],q)];
      return{point,beam:true,landed:false}
    }
    if(this.osdState==='open')return null;
    if(this.osdState==='close')return{point:hatchInner,beam:false,landed:true};
    return null
  },
  drawOsdCargo(state=this.osdCargoState()){
    if(!state)return;const cp=proj(state.point);
    if(state.beam&&cp){
      const tractor=this.content.osdDelivery.tractor,origin=proj(cameraPointToWorld(tractor.beamOrigin));if(origin){
        const dx=cp.x-origin.x,dy=cp.y-origin.y,len=Math.hypot(dx,dy)||1,ux=dx/len,uy=dy/len,px=-uy,py=ux,waves=tractor.waves,flow=(this.osdDeliveryT*tractor.flowRate)%1;
        ctx.save();ctx.strokeStyle=C.c;ctx.lineWidth=VECTOR_LINE_WIDTH;ctx.globalAlpha=.68;
        for(let i=0;i<waves;i++){const t=tractor.startFraction+(((i/waves)+flow)%1)*tractor.spanFraction,cx=lerp(origin.x,cp.x,t),cy=lerp(origin.y,cp.y,t),half=lerp(tractor.halfWidthStart,Math.min(tractor.halfWidthMax,tractor.halfWidthBase+len*tractor.halfWidthDistanceScale),t),bow=lerp(tractor.bowStart,tractor.bowEnd,t);ctx.beginPath();ctx.moveTo(cx+px*half,cy+py*half);ctx.quadraticCurveTo(cx+ux*bow,cy+uy*bow,cx-px*half,cy-py*half);ctx.stroke()}
        ctx.restore()
      }
    }
    const dims=this.osdCargoDims||this.content.bunker.recoveryRoom.equipmentBox.dimensions;
    drawMesh({type:'osdCircuitryBox',x:state.point[0],y:state.point[1],z:state.point[2],s:.5,mx:dims[0],my:dims[1],mz:dims[2],rot:[0,0,0]},courierFixtureBoxMesh,state.landed?C.y:C.c,.98)
  },
  drawOsdFacility(){
    const f=this.osdFacility,visual=this.content.osdDelivery.facility.visual;if(!f?.mesh)return;const z=f.worldZ-travel,d=camPoint([f.x,f.y+f.s*.75,z])[2];if(d<=.25||d>visual.visibleFar)return;
    const obj={type:'osdTwinTowerFortress',x:f.x,y:f.y,z,s:f.s,rot:f.rot};
    // The authored roof feature used three crossing strokes at vertices 136..141,
    // which reads as a church cross at distance. Keep only the vertical mast 136-137.
    let facilityMesh=f.mesh._straightAntennaMesh;
    if(!facilityMesh){
      const crossbars=visual.crossbarEdges,isCrossbar=ed=>crossbars.some(([a,b])=>(ed[0]===a&&ed[1]===b)||(ed[0]===b&&ed[1]===a));
      facilityMesh={...f.mesh,e:(f.mesh.e||[]).filter(ed=>!isCrossbar(ed))};
      f.mesh._straightAntennaMesh=facilityMesh;
    }
    // Keep the structure itself subdued/readable on the bright desert world. The
    // actual OSD emblem stays white as a separate overlay so only the badge pops.
    drawMesh(obj,facilityMesh,C.y,.94);
    let logo=f.mesh._osdLogoMesh;
    if(!logo){
      const start=visual.logoVertexStart,end=visual.logoVertexEnd,edges=(f.mesh.e||[]).filter(ed=>ed[0]>=start&&ed[0]<=end&&ed[1]>=start&&ed[1]<=end);
      const used=[...new Set(edges.flat())].sort((a,b)=>a-b),index=new Map(used.map((v,i)=>[v,i]));
      logo={v:used.map(v=>f.mesh.v[v]),e:edges.map(ed=>[index.get(ed[0]),index.get(ed[1])])};
      f.mesh._osdLogoMesh=logo;
    }
    if(logo?.e?.length)drawMesh(obj,logo,C.w,.98)
  },
  drawOsdHatchRecess(){
    const f=this.osdFacility,hatch=this.osdHatchWorld,inner=this.osdHatchInnerWorld;if(!f||!hatch||!inner)return;
    const h=f.mesh.deliveryHatch||{width:.58,height:.58};
    const frontZ=hatch[2]-travel,innerZ=inner[2]-travel;
    const openingW=h.width*f.s,openingH=h.height*f.s,depth=Math.max(.5,innerZ-frontZ);
    const recess=globalThis.AgentXOSDFacility?.deliveryHatchRecess;
    const hatchContent=this.content.osdDelivery.hatch,recessCentreY=hatch[1]-openingH*hatchContent.recessCentreYOffsetFraction;
    if(recess)drawMesh({type:'osdHatchRecess',x:hatch[0],y:recessCentreY,z:frontZ+depth*.5,s:.5,mx:openingW*hatchContent.recessScale,my:openingH*hatchContent.recessScale,mz:depth,rot:[0,0,0]},recess,C.y,.74)
  },
  drawOsdHatchDoor(){
    const f=this.osdFacility,hatch=this.osdHatchWorld;if(!f||!hatch)return;
    const h=f.mesh.deliveryHatch||{width:.58,height:.58},doorT=this.osdHatchDoorT;
    const hatchContent=this.content.osdDelivery.hatch,openingW=h.width*f.s,openingH=h.height*f.s,frontZ=hatch[2]-travel;
    const panelW=openingW*hatchContent.doorScale,panelH=openingH*hatchContent.doorScale,lift=openingH*hatchContent.doorLift*doorT;
    drawMesh({type:'osdHatchDoor',x:hatch[0],y:hatch[1]+lift,z:frontZ-hatchContent.doorFrontOffset,s:.5,mx:panelW,my:panelH,mz:hatchContent.doorDepth,rot:[0,0,0]},courierFixtureBoxMesh,C.y,.98)
  },
  drawOsdDeliveryHatch(){
    this.drawOsdHatchRecess();this.drawOsdHatchDoor()
  },
  drawOsdDeliveryGuide(){
    return
  },
  appendOsdSurfaceObjects(scene){
    const f=this.osdFacility;if(!f)return scene;
    surfaceDestination.appendWorldObject(scene,{
      x:f.x,y:f.y+f.s*.75,worldZ:f.worldZ,maxDepth:this.content.osdDelivery.facility.visual.visibleFar,
      draw:()=>{
        this.drawOsdFacility();
        // Keep the hatch assembly internally ordered as one physical landmark. The
        // common surface compositor then sorts that landmark against every rock/tree.
        this.drawOsdHatchRecess();
        const state=this.osdCargoState();if(state)this.drawOsdCargo(state);
        this.drawOsdHatchDoor()
      }
    });
    return scene
  },
  drawOsdSurfaceScene(){
    // Once the launch zoom starts the craft is already pointing vertically away from
    // the planet. Do not keep projecting the compound behind/through the near plane.
    if(mode==='surfaceExit'&&(surfaceExitPitchProgress()>.82||surfaceExitZoomProgress()>.001))return;
    surfaceDestination.drawGround();const scene=[];
    surfaceDestination.appendScenery(scene);this.appendOsdSurfaceObjects(scene);surfaceDestination.drawObjectScene(scene)
  },
  finish(success=true){
    if(!this.active)return;
    const storyStage=campaign.currentStage?.()?.type==='bunker_recovery_osd';
    audio?.teslaBuzz?.destroy?.();
    this.active=false;this.bunkerMode=false;this.raidState='done';this.devExitPending=false;this.surfaceGuns=[];this.teslaPylons=[];
    groundTargets.length=0;bolts.length=0;hazards.length=0;shots.length=0;playerMissiles.length=0;
    if(success&&storyStage){scenarioFlow.completeCurrentStage();return}
    paused=false;document.body.classList.remove('paused','playing');
    if(!success)audio.playVoice('missionFailed',{once:false,priority:true});
    campaign.showHub('options')
  },
  circuitryPoint(){
    if(this.circuitSecured)return null;
    const p=this.tunnelProgress(),c=this.path(this.circuitryLocal),room=this.sectionSize(this.tunnelLength),pickup=this.content.bunker.recoveryRoom.pickup;
    const tableY=-room.h+pickup.tableHeightFromFloor,start=[c.x,c.y+tableY,this.circuitryLocal-p];
    if(mode!=='bunkerCircuitryPickup'||this.pickupT<pickup.tractorStart)return start;
    const q=ease(clamp((this.pickupT-pickup.tractorStart)/pickup.tractorDuration,0,1)),end=[shipX,shipY+pickup.shipYOffset,pickup.shipDepth];
    return[lerp(start[0],end[0],q),lerp(start[1],end[1],q),lerp(start[2],end[2],q)]
  },
  drawCircuitry(){
    const w=this.circuitryPoint();if(!w)return;
    const pickup=this.content.bunker.recoveryRoom.pickup,tractor=mode==='bunkerCircuitryPickup'&&this.pickupT>=pickup.tractorStart&&!this.circuitSecured;
    if(tractor){
      const pp=proj(w);if(pp){
        const visual=pickup.tractorVisual,sourceX=W*.5,sourceY=viewH+Math.max(visual.sourceBottomMin,viewH*visual.sourceBottomFraction),waves=visual.waves,flow=((this.pickupT-pickup.tractorStart)*visual.flowRate)%1;
        ctx.save();ctx.strokeStyle=C.c;ctx.lineWidth=VECTOR_LINE_WIDTH;ctx.globalAlpha=visual.alpha;
        for(let i=0;i<waves;i++){
          const t=((((i/waves)-flow)%1+1)%1),tp=1-Math.pow(1-t,visual.easePower),half=lerp(visual.halfWidthStart,visual.halfWidthEnd,tp);
          const cx=lerp(sourceX,pp.x,tp),y=lerp(sourceY,pp.y,tp),bow=lerp(visual.bowStart,visual.bowEnd,tp);
          if(y<visual.clipAbove||y>viewH+visual.clipBelow)continue;
          ctx.beginPath();ctx.moveTo(cx-half,y);ctx.quadraticCurveTo(cx,y-bow,cx+half,y);ctx.stroke()
        }
        ctx.restore()
      }
    }
    // The recovered circuitry is deliberately carried in an anonymous equipment
    // box.  Its significance is revealed by OSD analysis later; the player should
    // not be looking at a literal circuit-board diagram on the package itself.
    const dims=this.content.bunker.recoveryRoom.equipmentBox.dimensions;
    drawMesh({type:'bunkerCircuitry',x:w[0],y:w[1],z:w[2],s:.5,mx:dims[0],my:dims[1],mz:dims[2],rot:[0,0,0]},courierFixtureBoxMesh,tractor?C.c:C.y,.98);
  },
  sectionLocalAtDepth(z){
    const p=this.tunnelProgress();
    return clamp((phase==='bunkerReturn'||mode==='bunkerTurn')?p-z:p+z,0,this.tunnelLength)
  },
  sectionSize(local){
    // The mechanism widens the tunnel into a room; Source Trace owns this room's
    // authored proportions and transition distance.
    const layout=this.content.bunker.recoveryRoom.architecture,baseW=trenchWall(),baseH=tunnelHalfH(),roomStart=this.tunnelLength-this.roomLength;
    const room=ease(clamp((local-roomStart)/layout.widenTransition,0,1));
    return{w:lerp(baseW,baseW*layout.widthFactor,room),h:lerp(baseH,baseH*layout.heightFactor,room)}
  },
  roomSectionSize(local){return this.sectionSize(local)},
  fixturePoint(local,xOff=0,yOff=0,progress=this.tunnelProgress()){
    const c=this.path(local);return[c.x+xOff,c.y+yOff,local-progress]
  },
  withTunnelFixtureClip(local,progress,draw){
    if(mode==='bunkerTurn'){draw();return}
    const render=this.content.bunker.recoveryRoom.render,depth=local-progress;if(depth<=render.fixtureNearPlane)return;
    ctx.save();
    const near=render.fixtureClipNear,far=Math.max(near,depth-render.fixtureFarPadding),step=render.sectionStep;
    for(let z=near;z<far;z+=step){
      const localAt=this.sectionLocalAtDepth(z),c=this.tunnelCenter(z),sz=this.sectionSize(localAt);
      const poly=[proj([c.x-sz.w,c.y-sz.h,z]),proj([c.x+sz.w,c.y-sz.h,z]),proj([c.x+sz.w,c.y+sz.h,z]),proj([c.x-sz.w,c.y+sz.h,z])];
      if(poly.every(Boolean)){ctx.beginPath();ctx.moveTo(poly[0].x,poly[0].y);for(let i=1;i<4;i++)ctx.lineTo(poly[i].x,poly[i].y);ctx.closePath();ctx.clip()}
    }
    draw();ctx.restore()
  },
  drawWireBox(local,xOff,yOff,sx,sy,sz,col=C.gd,alpha=.78,progress=this.tunnelProgress()){
    const p=this.fixturePoint(local,xOff,yOff,progress);
    this.withTunnelFixtureClip(local,progress,()=>drawMesh({x:p[0],y:p[1],z:p[2],s:.5,mx:sx,my:sy,mz:sz,rot:[0,0,0]},courierFixtureBoxMesh,col,alpha))
  },
  drawDeliveryRoomInterior(nearOverride=null,farOverride=null){
    const render=this.content.bunker.recoveryRoom.render,p=this.tunnelProgress(),returning=phase==='bunkerReturn'||mode==='bunkerTurn';
    const physical=returning?p:this.tunnelLength-p;if(physical<=render.physicalNear)return;
    const nearRequest=nearOverride??this.content.bunker.wallGuns.supportPortalNear,farRequest=farOverride??render.visibleDepth;
    const requestedNear=Math.max(render.minimumNear,nearRequest),near=Math.max(render.fixtureNearPlane,Math.min(requestedNear,physical));
    const far=Math.max(near,Math.min(farRequest,physical)),step=render.sectionStep;
    const secs=[near];
    let first=near+((step-((travel+near)%step))%step);if(first<near+render.sectionStartEpsilon)first+=step;
    for(let z=first;z<=far;z+=step)secs.push(z);
    if(secs[secs.length-1]<far-render.sectionEndEpsilon)secs.push(far);
    const portal=z=>{
      const local=this.sectionLocalAtDepth(z),c=this.tunnelCenter(z),sz=this.sectionSize(local);
      return[proj([c.x-sz.w,c.y-sz.h,z]),proj([c.x+sz.w,c.y-sz.h,z]),proj([c.x+sz.w,c.y+sz.h,z]),proj([c.x-sz.w,c.y+sz.h,z])]
    };
    const portals=secs.map(portal),last=portals[portals.length-1];
    if(last&&last.every(Boolean))for(let k=0;k<4;k++){const A=last[k],B=last[(k+1)%4];line(A.x,A.y,B.x,B.y,C.gd,.82,.74)}
    if(!returning&&physical<=render.visibleDepth){
      const z=Math.max(render.backWallNear,physical),c=this.tunnelCenter(z),sz=this.sectionSize(this.tunnelLength);
      const back=[proj([c.x-sz.w,c.y-sz.h,z]),proj([c.x+sz.w,c.y-sz.h,z]),proj([c.x+sz.w,c.y+sz.h,z]),proj([c.x-sz.w,c.y+sz.h,z])];
      if(back.every(Boolean)){
        for(let k=0;k<4;k++){const A=back[k],B=back[(k+1)%4];line(A.x,A.y,B.x,B.y,C.g,1.18,.96)}
        for(const fx of [-.48,0,.48]){const A=proj([c.x+sz.w*fx,c.y-sz.h,z]),B=proj([c.x+sz.w*fx,c.y+sz.h,z]);if(A&&B)line(A.x,A.y,B.x,B.y,C.gd,.68,.58)}
        for(const fy of [-.42,.42]){const A=proj([c.x-sz.w,c.y+sz.h*fy,z]),B=proj([c.x+sz.w,c.y+sz.h*fy,z]);if(A&&B)line(A.x,A.y,B.x,B.y,C.gd,.68,.58)}
      }
    }
    for(let i=secs.length-2;i>=0;i--){
      const pa=portals[i],pb=portals[i+1];if(!pa.every(Boolean)||!pb.every(Boolean))continue;
      renderer.maskOutsidePortal(pa);
      for(let k=0;k<4;k++)line(pa[k].x,pa[k].y,pb[k].x,pb[k].y,C.g,1.02,.94);
      for(let k=0;k<4;k++){const A=pa[k],B=pa[(k+1)%4];line(A.x,A.y,B.x,B.y,C.gd,.86,.78)}
    }
  },
  drawExactDeliveryRoomFixtures(progress=this.tunnelProgress(),showCircuitry=true){
    const content=this.content.bunker.recoveryRoom,architecture=content.architecture,display=content.statusDisplay,table=content.table;
    const backDistance=this.tunnelLength-progress;
    if(mode!=='bunkerTurn'&&(backDistance<=.18||backDistance>architecture.fixtureVisibleDistance))return;
    const room=this.sectionSize(this.tunnelLength),backLocal=this.tunnelLength-architecture.backWallInset;
    // The rendering mechanism draws a decorative status display; Source Trace owns
    // its placement and dimensions so this room layout is no longer engine data.
    const sc=this.path(backLocal),screenY=room.h*display.yFraction,sw=display.halfWidth,sh=display.halfHeight,z=backLocal-progress;
    this.withTunnelFixtureClip(backLocal,progress,()=>{
      const screen=[proj([sc.x-sw,sc.y+screenY-sh,z]),proj([sc.x+sw,sc.y+screenY-sh,z]),proj([sc.x+sw,sc.y+screenY+sh,z]),proj([sc.x-sw,sc.y+screenY+sh,z])];
      if(screen.every(Boolean)){
        const poly=screen.map(q=>[q.x,q.y]);
        // This is a proper screen/panel, not just a line frame. fillPoly() consumes
        // projected {x,y} points (strokePoly uses [x,y] pairs), so fill the actual
        // projected screen quad before drawing the frame and histogram.
        fillPoly(screen);strokePoly(poly,C.g,1.0,.88);
        const t=performance.now()*.001,barCount=display.barCount,left=-sw*display.innerLeft,right=sw*display.innerRight,bottom=screenY-sh*display.bottomFraction,top=screenY+sh*display.topFraction;
        const baseA=proj([sc.x+left,sc.y+bottom,z-.012]),baseB=proj([sc.x+right,sc.y+bottom,z-.012]);
        if(baseA&&baseB)line(baseA.x,baseA.y,baseB.x,baseB.y,C.gd,.72,.62);
        for(let i=0;i<barCount;i++){
          const x=lerp(left,right,(i+.5)/barCount),phase=i*display.phaseStep,rate=display.baseRate+(i%4)*display.rateStep;
          // Keep short bars short, but allow the active display to reach much higher.
          const amount=display.minAmount+display.amountSpan*(.5+.5*Math.sin(t*rate+phase));
          const y1=bottom,y2=lerp(bottom,top,amount),bw=(right-left)/barCount*display.barWidthFraction;
          const a=proj([sc.x+x-bw*.5,sc.y+y1,z-.018]),b=proj([sc.x+x-bw*.5,sc.y+y2,z-.018]);
          const c=proj([sc.x+x+bw*.5,sc.y+y2,z-.018]),d=proj([sc.x+x+bw*.5,sc.y+y1,z-.018]);
          if(a&&b&&c&&d){line(a.x,a.y,b.x,b.y,C.c,.78,.78);line(b.x,b.y,c.x,c.y,C.c,.78,.78);line(c.x,c.y,d.x,d.y,C.c,.78,.78)}
        }
      }
    });
    const tableLocal=this.tunnelLength-table.fromEnd,tableTopY=-room.h+table.topFromFloor,tableW=table.width,tableD=table.depth;
    const floorY=-room.h+table.floorOffset,legY=(tableTopY+floorY)*.5,legH=Math.max(.18,tableTopY-floorY);
    // Draw the legs first and the solid tabletop last.  Each wire box supplies its
    // own black occlusion faces, so the top now masks the portions of the legs that
    // physically sit behind it instead of letting yellow leg lines show through.
    for(const x of [-tableW*table.legInsetX,tableW*table.legInsetX])for(const dz of [-tableD*table.legInsetZ,tableD*table.legInsetZ])this.drawWireBox(tableLocal+dz,x,legY,table.legThickness,legH,table.legThickness,C.y,.74,progress);
    this.drawWireBox(tableLocal,0,tableTopY,tableW,table.topThickness,tableD,C.y,.90,progress);
    const crates=content.crates.map(crate=>[this.tunnelLength-crate.fromEnd,crate.x,-room.h+crate.floorOffset,...crate.size]);
    for(const [local,x,y,sx,sy,sz] of crates.sort((a,b)=>b[0]-a[0]))this.drawWireBox(local,x,y,sx,sy,sz,C.w,.72,progress);
    if(showCircuitry)this.drawCircuitry()
  },
  drawWorldSegmentClipped(a,b,col=C.g,w=1,alpha=.85,near=.24){
    let A=camPoint(a),B=camPoint(b),ain=A[2]>near,bin=B[2]>near;if(!ain&&!bin)return;
    // During the bunker turnaround, a wall edge crossing the camera near plane can
    // project as a bogus line across the entire screen. It is not visible in the
    // room before the turn or in the return scene afterwards, so suppress that
    // transient near-plane edge rather than manufacturing a horizon-like stroke.
    if(mode==='bunkerTurn'&&ain!==bin)return;
    if(ain!==bin){const t=(near-A[2])/(B[2]-A[2]),q=[lerp(A[0],B[0],t),lerp(A[1],B[1],t),near];if(!ain)A=q;else B=q}
    const p0=projectCam(A),p1=projectCam(B);
    if(p0&&p1){
      if(mode==='bunkerTurn'&&Math.hypot(p1.x-p0.x,p1.y-p0.y)>W*.82)return;
      line(p0.x,p0.y,p1.x,p1.y,col,w,alpha)
    }
  },
  drawSolidRoomQuad(points,col=C.gd,w=.82,alpha=.72){
    const clipped=camera.clipWorldPolyNear(points,.24);if(clipped.length>=3)fillPoly(clipped);
    for(let i=0;i<points.length;i++)this.drawWorldSegmentClipped(points[i],points[(i+1)%points.length],col,w,alpha)
  },
  drawTurnRoomShell(progress=this.pickupStopLocal){
    const roomStart=this.tunnelLength-this.roomLength,locals=[];
    for(let local=roomStart;local<=this.tunnelLength+.01;local+=this.content.bunker.recoveryRoom.render.sectionStep)locals.push(Math.min(local,this.tunnelLength));
    if(locals[locals.length-1]<this.tunnelLength-.05)locals.push(this.tunnelLength);
    const sections=locals.map(local=>{const c=this.path(local),sz=this.sectionSize(local),z=local-progress;return{local,c,sz,p:[[c.x-sz.w,c.y-sz.h,z],[c.x+sz.w,c.y-sz.h,z],[c.x+sz.w,c.y+sz.h,z],[c.x-sz.w,c.y+sz.h,z]]}});
    const panels=[];
    for(let i=0;i<sections.length-1;i++){
      const a=sections[i],b=sections[i+1];
      const add=(pts,detail=[])=>{const depth=pts.reduce((n,p)=>n+camPoint(p)[2],0)/pts.length;panels.push({pts,detail,depth})};
      add([a.p[0],a.p[1],b.p[1],b.p[0]],[[[lerp(a.p[0][0],a.p[1][0],.33),lerp(a.p[0][1],a.p[1][1],.33),a.p[0][2]],[lerp(b.p[0][0],b.p[1][0],.33),lerp(b.p[0][1],b.p[1][1],.33),b.p[0][2]]],[[lerp(a.p[0][0],a.p[1][0],.67),lerp(a.p[0][1],a.p[1][1],.67),a.p[0][2]],[lerp(b.p[0][0],b.p[1][0],.67),lerp(b.p[0][1],b.p[1][1],.67),b.p[0][2]]]]);
      add([a.p[1],a.p[2],b.p[2],b.p[1]],[[[lerp(a.p[1][0],a.p[2][0],.5),lerp(a.p[1][1],a.p[2][1],.5),a.p[1][2]],[lerp(b.p[1][0],b.p[2][0],.5),lerp(b.p[1][1],b.p[2][1],.5),b.p[1][2]]]]);
      add([a.p[2],a.p[3],b.p[3],b.p[2]],[ [[lerp(a.p[2][0],a.p[3][0],.33),lerp(a.p[2][1],a.p[3][1],.33),a.p[2][2]],[lerp(b.p[2][0],b.p[3][0],.33),lerp(b.p[2][1],b.p[3][1],.33),b.p[2][2]]],[[lerp(a.p[2][0],a.p[3][0],.67),lerp(a.p[2][1],a.p[3][1],.67),a.p[2][2]],[lerp(b.p[2][0],b.p[3][0],.67),lerp(b.p[2][1],b.p[3][1],.67),b.p[2][2]]]]);
      add([a.p[3],a.p[0],b.p[0],b.p[3]],[[[lerp(a.p[3][0],a.p[0][0],.5),lerp(a.p[3][1],a.p[0][1],.5),a.p[3][2]],[lerp(b.p[3][0],b.p[0][0],.5),lerp(b.p[3][1],b.p[0][1],.5),b.p[3][2]]]])
    }
    panels.sort((a,b)=>b.depth-a.depth);
    // Draw only the same structural room surfaces during the turn. In particular,
    // do NOT draw the turn-only side-wall 50%-height detail: at 90 degrees it lies
    // at camera height and projects as the spurious line straight through screen centre.
    for(const panel of panels)this.drawSolidRoomQuad(panel.pts,C.gd,.78,.68);
    const back=sections[sections.length-1];
    if(back){
      this.drawSolidRoomQuad(back.p,C.g,1.02,.86);
      for(const f of [.25,.5,.75])this.drawWorldSegmentClipped([lerp(back.p[0][0],back.p[1][0],f),lerp(back.p[0][1],back.p[1][1],f),back.p[0][2]],[lerp(back.p[3][0],back.p[2][0],f),lerp(back.p[3][1],back.p[2][1],f),back.p[3][2]],C.gd,.62,.54);
      for(const f of [.33,.66])this.drawWorldSegmentClipped([lerp(back.p[0][0],back.p[3][0],f),lerp(back.p[0][1],back.p[3][1],f),back.p[0][2]],[lerp(back.p[1][0],back.p[2][0],f),lerp(back.p[1][1],back.p[2][1],f),back.p[1][2]],C.gd,.62,.54)
    }
  },
  drawOutboundRoomScene(){this.drawDeliveryRoomInterior();this.drawExactDeliveryRoomFixtures(this.tunnelProgress(),true)},
  withTurnTunnelClip(local,progress,draw){
    // While turning, the return tunnel is behind the camera in outbound world
    // coordinates. Clip anything in it through the real room mouth and every
    // intervening curved tunnel section so a distant girder cannot paint through a wall.
    const mouth=this.roomStart();if(local>=mouth||local>=progress)return;
    ctx.save();
    const step=this.content.bunker.recoveryRoom.render.turnClipStep;
    for(let s=mouth;s>=local;s-=step){
      const c=this.path(s),sz=this.sectionSize(s),z=s-progress;
      const poly=[proj([c.x-sz.w,c.y-sz.h,z]),proj([c.x+sz.w,c.y-sz.h,z]),proj([c.x+sz.w,c.y+sz.h,z]),proj([c.x-sz.w,c.y+sz.h,z])];
      if(!poly.every(Boolean))continue;
      ctx.beginPath();ctx.moveTo(poly[0].x,poly[0].y);for(let i=1;i<4;i++)ctx.lineTo(poly[i].x,poly[i].y);ctx.closePath();ctx.clip()
    }
    draw();ctx.restore()
  },
  drawTurnBunkerObstacle(h,progress=this.pickupStopLocal){
    // During the scripted 180-degree turn the obstacle is physically behind the
    // stopped drone in its original outbound coordinates. Keep it continuous, but
    // only through the actual curved return corridor.
    const local=h.bunkerLocal,z=local-progress;if(z>=-.18)return;
    this.withTurnTunnelClip(local,progress,()=>this.drawBunkerObstacle({...h,z}))
  },
  drawTurnScene(){
    const render=this.content.bunker.recoveryRoom.render,progress=this.pickupStopLocal,step=render.sectionStep;
    // Keep the physical room present throughout the turn, but draw its shell before
    // the furniture.  The previous bunker ordering painted black wall/floor panels
    // over the already-drawn crates and table as the camera yawed, making the room
    // contents appear to vanish part-way through the 180-degree turn.  This matches
    // the established enclosed-room renderer: shell first, then solid fixtures whose
    // own faces mask the wall/grid lines behind them.
    this.drawTurnRoomShell(progress);this.drawExactDeliveryRoomFixtures(progress,true);
    // Keep the real access tunnel visible throughout the 180-degree turn. The bogus
    // centre-screen line came from the room shell's side-wall midpoint detail, not
    // from these tunnel sections, so restore the normal tunnel wireframe here.
    const secs=[];
    for(let local=Math.min(this.roomStart(),progress-render.turnTunnelStartGap);local>=Math.max(0,progress-render.turnTunnelDepth);local-=step){
      const c=this.path(local),sz=this.sectionSize(local);
      secs.push({local,x:c.x,y:c.y,z:local-progress,w:sz.w,h:sz.h})
    }
    for(let i=0;i<secs.length;i++){
      const a=secs[i],pp=[[a.x-a.w,a.y-a.h,a.z],[a.x+a.w,a.y-a.h,a.z],[a.x+a.w,a.y+a.h,a.z],[a.x-a.w,a.y+a.h,a.z]];
      // Restore the tunnel cross-section at each visible section. drawWorldSegmentClipped
      // already suppresses only pathological turn near-plane spans, not ordinary lines.
      for(let k=0;k<4;k++)this.drawWorldSegmentClipped(pp[k],pp[(k+1)%4],C.gd,.82,.72);
      if(i+1<secs.length){
        const b=secs[i+1],qq=[[b.x-b.w,b.y-b.h,b.z],[b.x+b.w,b.y-b.h,b.z],[b.x+b.w,b.y+b.h,b.z],[b.x-b.w,b.y+b.h,b.z]];
        for(let k=0;k<4;k++)this.drawWorldSegmentClipped(pp[k],qq[k],C.g,1.0,.88)
      }
    }
    // Girders belong to that same continuous corridor.  Their normal scene path
    // rejects the negative outbound h.z values while the drone is turning; render
    // them here in physical coordinates so there is no state-change pop.
    for(const h of hazards)if(!h.dead&&h.bunkerObstacle&&Number.isFinite(h.bunkerLocal)&&progress-h.bunkerLocal<=render.turnObstacleDepth)this.drawTurnBunkerObstacle(h,progress)
  },
  drawReturnScene(){
    const render=this.content.bunker.recoveryRoom.render,p=this.tunnelProgress();
    if(p>render.visibleDepth){this.drawDeliveryRoomInterior();return}
    const z=Math.max(render.returnPortalNear,p),c=this.tunnelCenter(z),sz=this.sectionSize(0);
    const portal=[proj([c.x-sz.w,c.y-sz.h,z]),proj([c.x+sz.w,c.y-sz.h,z]),proj([c.x+sz.w,c.y+sz.h,z]),proj([c.x-sz.w,c.y+sz.h,z])];
    if(portal.every(Boolean))renderer.clipPoly(portal,()=>{renderer.drawStars();renderer.drawSurface();this.drawReturnTeslaPylons(p,0);this.drawReturnSurfaceGuns(p,0)});
    this.drawDeliveryRoomInterior(this.content.bunker.wallGuns.supportPortalNear,Math.max(render.returnPortalNear,p));
    if(portal.every(Boolean))for(let k=0;k<4;k++){const A=portal[k],B=portal[(k+1)%4];line(A.x,A.y,B.x,B.y,C.g,1.4,.98)}
  },
  drawInteriorScene(){
    if(mode==='bunkerTurn'){this.drawTurnScene();return}
    if(phase==='bunkerReturn'){this.drawReturnScene();return}
    this.drawOutboundRoomScene()
  },
  updateInterior(dt){
    if(mode==='bunkerCircuitryPickup'){
      const pickup=this.content.bunker.recoveryRoom.pickup,p=this.tunnelProgress(),rem=Math.max(0,this.pickupStopLocal-p),step=Math.min(rem,pickup.approachSpeed*dt);
      if(step>0)travel+=step;
      const now=this.tunnelProgress(),c=this.path(now);shipX=lerp(shipX,c.x,clamp(dt*pickup.positionEase,0,1));shipY=lerp(shipY,c.y,clamp(dt*pickup.positionEase,0,1));
      viewYaw=moveToward(viewYaw,0,dt*pickup.yawRate);viewPitch=moveToward(viewPitch,0,dt*pickup.pitchRate);viewRoll=moveToward(viewRoll,0,dt*pickup.rollRate);
      if(rem<=pickup.arrivalEpsilon){
        this.pickupT+=dt;
        if(!this.circuitSecured&&this.pickupT>=pickup.securedAt){const message=this.content.presentation.messages.equipmentRecovered;this.circuitSecured=true;SoundFX.objectiveComplete?.();say(message.text,message.hold)}
        if(this.circuitSecured&&this.pickupT>=pickup.turnAt)this.beginTurn()
      }
      return
    }
    if(mode==='bunkerTurn'){
      const turn=this.content.bunker.recoveryRoom.turn;
      this.turnT+=dt;const u=clamp(this.turnT/turn.duration,0,1),q=ease(u);
      viewYaw=this.turnDir*q*Math.PI;viewRoll=-this.turnDir*Math.sin(u*Math.PI)*turn.rollAmount;
      if(this.turnT>=turn.completeAt)this.beginReturn();return
    }
    if(mode==='bunkerSurfaceClear'){
      const clear=this.content.bunker.recoveryRoom.surfaceClear;
      shipY=moveToward(shipY,clear.shipY,dt*clear.shipYRate);viewYaw=moveToward(viewYaw,0,dt*clear.yawRate);viewPitch=moveToward(viewPitch,0,dt*clear.pitchRate);viewRoll=moveToward(viewRoll,0,dt*clear.rollRate);
      if(modeT>=clear.exitAt){this.devExitPending=true;beginSurfaceExit({continueMission:true})}return
    }
    if(mode==='play'&&phase==='bunkerTunnel'){
      this.updateTunnelDefences(dt);tunnelPlayerClamp();
      // Let the player genuinely cross the widening bulkheads and enter the room
      // before autopilot owns the last short recovery approach.
      if(this.tunnelProgress()>=this.pickupStopLocal-this.content.bunker.recoveryRoom.pickup.triggerBeforeStop)this.beginCircuitryPickup();
      return
    }
    if(mode==='play'&&phase==='bunkerReturn'){
      this.updateTunnelDefences(dt);tunnelPlayerClamp();
      if(this.tunnelProgress()<=this.content.bunker.recoveryRoom.surfaceClear.returnExitThreshold)this.beginSurfaceClear()
    }
  },
  hudRight(){
    if(!this.active)return'';
    const hud=this.content.presentation.hud;
    if(this.raidState==='osdSpace')return hud.osdPlanet;
    if(this.raidState==='osdDescent')return hud.osdDescent;
    if(this.raidState==='osdDelivery'){
      if(this.osdState==='open')return hud.openingHatch;
      if(this.osdState==='delivery')return hud.delivering;
      if(this.osdState==='close')return hud.closingHatch;
      if(this.osdState==='turn'||this.osdState==='depart')return hud.departingFacility;
      return hud.osdFacility
    }
    if(this.raidState==='osdDeparture')return hud.deliveryComplete;
    if(mode==='bunkerCircuitryPickup')return this.circuitSecured?hud.equipmentSecured:hud.equipmentRecovery;
    if(mode==='bunkerTurn'||phase==='bunkerReturn')return hud.exitRoute;
    if(phase==='bunkerTunnel')return`${hud.equipmentDistancePrefix} ${Math.max(0,Math.round(this.circuitryLocal-this.tunnelProgress()))}`;
    return''
  },
  drawNavigation(){if(this.active&&this.bunkerMode&&!this.bunkerReached&&this.raidState==='surface')surfaceDestination.drawNavigation()}
};

// ---------- development xeno-nest mission ----------
// This replaces the old isolated bug-combat test. It is deliberately kept out of
// the public contract board while the encounter is being refined, but the entire
// mission loop is playable: pheromone-masked approach, hive-core penetration,
// regulator destruction, swarm frenzy, observation proof and departure.

// Temporary compatibility name used by older shared renderer/runtime code.
// New code should refer to bunkerRaid.
const landGunTest=bunkerRaid;
