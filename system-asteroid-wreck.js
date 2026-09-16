'use strict';

// Reusable space-route mechanism for missions that cross a streamed asteroid field,
// suffer an in-field combat interruption, then continue to a persistent large wreck.
// The Missing Manifest wreck is now a single hollow wreck assembly.  Its torn mouth,
// cargo-spine walls, structural diamond ribs and recorder bulkhead all live in the
// same model/coordinate system; gameplay state no longer swaps exterior for interior.
class AsteroidWreckMissionController {
  constructor(){this.reset()}
  reset(){
    this.active=false;this.stage=null;this.state='idle';this.t=0;this.stateT=0;
    this.nav=null;this.wreck=null;this.recovered=false;this.ambushStarted=false;this.insideWreck=false;
    this.fieldWasPrepared=false;this.thinCleanupT=0;
    this.bulkheadHp=0;this.bulkheadHitFx=0;this.bulkheadOpen=true;
    this.entryAutoT=0;this.entryAutoTurnRate=0;this.entryAutoLeg='idle';
    this.recorderTransferT=0;this.recorderDataPackets=[];this.recorderDataSpawnT=0;this.recorderDataDraining=false;
    this.recorderTurnT=0;this.recorderTurnStart=null;this.junkCollisionCooldown=0;this.wreckCollisionCooldown=0;
    this.exitPitchT=0;this.exitPitchStart=null
  }
  prepare(stage){
    this.reset();this.active=true;this.stage=stage||{};this.state='prepared';this.fieldWasPrepared=true;
    asteroidField.prepare(999,this.stage.difficulty||2,{markedTargets:false});
    return true
  }
  begin(stage=this.stage){
    if(stage)this.stage=stage;
    if(!this.fieldWasPrepared)asteroidField.prepare(999,this.stage?.difficulty||2,{markedTargets:false});
    this.active=true;this.state='route';this.t=0;this.stateT=0;this.recovered=false;this.ambushStarted=false;this.insideWreck=false;
    this.bulkheadHp=0;this.bulkheadOpen=true;this.bulkheadHitFx=0;this.entryAutoT=0;this.entryAutoTurnRate=0;this.entryAutoLeg='idle';
    this.recorderTransferT=0;this.recorderDataPackets.length=0;this.recorderDataSpawnT=0;this.recorderDataDraining=false;this.recorderTurnT=0;this.recorderTurnStart=null;
    asteroidField.activatePrepared({silentObjective:true});
    asteroidField.spaceBackdrop=false;
    asteroidField.courierMode=false;asteroidField.markedTargets=false;asteroidField.goal=999;asteroidField.destroyed=0;
    const route=this.stage?.route||{},side=Number(route.navX)||18,vertical=Number(route.navY)||-4,forward=Number(route.navDistance)||520;
    const w=asteroidField.cameraPointToWorld([side,vertical,forward]);
    this.nav={x:w[0],y:w[1],z:w[2],vx:0,vy:0,vz:0};
    say(String(route.startMessage||'PROCEED TO THE WRECK').toUpperCase(),.9);
    audio.playVoice('proceedToWreck',{once:false,priority:true});
    return true
  }
  distanceTo(p){return p?Math.hypot((p.x||0)-shipX,(p.y||0)-shipY,p.z||0):Infinity}
  advanceFixedPoint(p,dt){if(p)advanceArcadeSpaceBody(p,dt,{playerRelative:true})}
  cfg(){return this.stage?.wreck||{}}
  localToWorld(local){
    if(!this.wreck||!local)return null;
    const q=rotate([local[0]*this.wreck.s,local[1]*this.wreck.s,local[2]*this.wreck.s],this.wreck.rot);
    return{x:this.wreck.x+q[0],y:this.wreck.y+q[1],z:this.wreck.z+q[2]}
  }
  gapPoint(){return this.localToWorld(this.cfg().gapLocal||[.30,.10,2.95])}
  mouthPoint(){return this.localToWorld(this.cfg().mouthLocal||[0,-.15,.68])}
  bulkheadPoint(){return null}
  entryPoint(){return this.localToWorld(this.cfg().entryLocal||[0,-.15,-.18])}
  blackBoxPoint(){return this.localToWorld(this.cfg().blackBoxLocal||[0,-.13,-2.64])}
  recorderStopPoint(){return this.localToWorld(this.cfg().recorderStopLocal||[0,-.15,-2.10])}
  exitPoint(){return this.localToWorld(this.cfg().exitLocal||[0,-.15,.92])}
  autopilotActive(){return !!(this.active&&(this.state==='entryAutopilot'||this.state==='recorderTransfer'||this.state==='recorderTurn'||this.state==='exitPitch'))}
  damageSuppressed(){
    // Forced entry/download/turn are always safe. After the recorder turn, keep
    // the player damage-safe while manually threading back through the interior;
    // physical hull collision still blocks movement. Normal damage resumes only
    // after the craft has actually crossed the torn mouth into open belt space.
    return !!(this.active&&(this.autopilotActive()||(this.state==='exitNav'&&this.insideWreck)))
  }
  isInterior(){
    // Physical hull state only. Do NOT use this as a scene/background switch:
    // Missing Manifest remains one continuous asteroid-field space all the way
    // through the torn opening. The hull faces themselves provide occlusion.
    return !!(this.active&&this.insideWreck)
  }
  fieldVisible(){
    // Keep the same field/planet/asteroids alive for the entire wreck sequence.
    // Entering the hull must not feel like crossing a portal into a black scene.
    return this.active&&this.state!=='idle'&&this.state!=='prepared'&&this.state!=='complete'
  }
  startAmbush(){
    if(!this.active||this.ambushStarted)return false;
    this.ambushStarted=true;this.state='ambush';this.stateT=0;
    audio.music.setMode('violent');
    scenarioFlow.startFighterStage(this.stage,this.stage?.profile||'pirate');
    asteroidField.spaceBackdrop=true;
    phase='space';mode='play';
    say(String(this.stage?.ambushMessage||'PIRATE AMBUSH · DESTROY THE PIRATES').toUpperCase(),.9);
    return true
  }
  spawnWreck(forward){
    if(this.wreck)return this.wreck;
    const cfg=this.cfg(),x=Number(cfg.spawnX)||8,y=Number(cfg.spawnY)||-1;
    const world=asteroidField.cameraPointToWorld([x,y,Math.max(40,Number(forward)||Number(cfg.spawnDistance)||410)]);
    this.wreck={x:world[0],y:world[1],z:world[2],s:Number(cfg.scale)||22,rot:Array.isArray(cfg.rot)?cfg.rot.slice():[.08,.16,-.07],hitFx:0,dead:false};
    return this.wreck
  }
  onPiratesCleared(){
    if(!this.active||this.state!=='ambush')return false;
    fighters.length=0;bolts.length=0;playerMissiles.length=0;
    scenarioFlow.encounterProfile='standard';
    audio.music.setMode(campaign.currentMission?.musicMode||'calm');
    this.state='routeAfterCombat';this.stateT=0;asteroidField.spaceBackdrop=false;phase='asteroids';mode='play';
    resetSpaceDogfightDirector();
    // Put the ACTUAL wreck into the world as soon as the pirate interruption is over,
    // rather than waiting until the intermediate field-nav capture.  The extra range
    // is exactly the remaining distance to that old checkpoint, so the player sees a
    // much smaller wreck sooner without adding another stretch of travel to the mission.
    const route=this.stage?.route||{},capture=Math.max(35,Number(route.navCaptureRadius)||65);
    const normalSpawn=Math.max(40,Number(this.cfg().spawnDistance)||410);
    const remaining=Math.max(0,this.distanceTo(this.nav)-capture);
    this.spawnWreck(normalSpawn+remaining);
    say(String(route.resumeMessage||'WRECK AHEAD · CONTINUE THROUGH FIELD').toUpperCase(),.88);
    return true
  }
  beginThinning(){
    if(!this.active||this.state==='thinning'||this.state==='gapApproach')return false;
    this.state='thinning';this.stateT=0;this.thinCleanupT=0;this.insideWreck=false;asteroidField.spaceBackdrop=false;
    // Normally the wreck was already spawned farther out when the pirates were
    // cleared.  Retain this fallback for direct-stage/dev starts.  Crucially, do not
    // respawn it here: that would make the distant wreck jump closer/larger.
    this.spawnWreck(Number(this.cfg().spawnDistance)||410);
    say(String(this.stage?.route?.thinMessage||'WRECK AHEAD · CONTINUE THROUGH THE ASTEROID BELT').toUpperCase(),.9);
    return true
  }
  reachGap(){
    if(!this.active||!this.wreck)return false;
    this.state='entryAutopilot';this.stateT=0;this.entryAutoT=0;this.entryAutoTurnRate=0;this.entryAutoLeg='hold';this.insideWreck=false;
    this.bulkheadOpen=true;inputX=inputY=aimX=aimY=0;spaceYawVel=spacePitchVel=0;
    laserBurstRemaining=0;endLaserTrigger();SoundFX.objectiveComplete();
    say('AUTOPILOT · WRECK ENTRY',.72);return true
  }
  hitBulkhead(){return false}
  bulkheadShotCandidate(){return null}
  alignAutopilotTo(point,dt){
    if(!point)return Infinity;
    ensureSpaceOrientation();
    const desired=v3norm([point.x-shipX,point.y-shipY,point.z]);
    if(v3len(desired)<.0001)return 0;
    const angle=Math.acos(clamp(v3dot(spaceForward,desired),-1,1));
    if(angle>.0015){
      let axis=v3cross(spaceForward,desired);if(v3len(axis)<.001)axis=spaceUp;axis=v3norm(axis);
      const wanted=Math.min(1.20,Math.max(.14,angle*2.7)),follow=1-Math.exp(-dt*4.7);
      this.entryAutoTurnRate=lerp(this.entryAutoTurnRate||0,wanted,follow);
      if(angle<.04)this.entryAutoTurnRate=Math.min(this.entryAutoTurnRate,Math.max(.09,angle*3.5));
      const turn=Math.min(angle,Math.max(0,this.entryAutoTurnRate)*dt);
      spaceForward=rotateAroundAxis(spaceForward,axis,turn);spaceRight=rotateAroundAxis(spaceRight,axis,turn);spaceUp=rotateAroundAxis(spaceUp,axis,turn);
      orthonormaliseSpaceOrientation();syncEulerFromSpaceOrientation()
    }else this.entryAutoTurnRate*=Math.exp(-dt*7);
    viewRoll=moveToward(viewRoll,0,dt*2.8);return angle
  }
  shiftAutopilotWorld(delta){
    if(!delta||!this.wreck)return;
    this.wreck.x-=delta[0];this.wreck.y-=delta[1];this.wreck.z-=delta[2];
    for(const a of asteroids){if(!a.dead){a.x-=delta[0];a.y-=delta[1];a.z-=delta[2]}}
  }
  updateEntryAutopilot(dt){
    if(this.state!=='entryAutopilot'||!this.wreck)return false;
    this.entryAutoT+=dt;inputX=inputY=aimX=aimY=0;spaceYawVel=spacePitchVel=0;
    // Pause in the gap, enter the torn mouth, then continue seamlessly down the
    // same diamond-section hull to the recorder chamber. There is no second room.
    if(this.entryAutoLeg==='hold'&&this.entryAutoT<.62){
      this.alignAutopilotTo(this.entryPoint(),dt);return true
    }
    if(this.entryAutoLeg==='hold')this.entryAutoLeg='inbound';
    const deep=this.entryAutoLeg==='deep',target=deep?this.recorderStopPoint():this.entryPoint();if(!target)return false;
    const angle=this.alignAutopilotTo(target,dt),dx=target.x-shipX,dy=target.y-shipY,dz=target.z,dist=Math.hypot(dx,dy,dz);
    const stop=deep?Math.max(.35,Number(this.cfg().recorderStopRadius)||.65):Math.max(1.35,Number(this.cfg().entryAutopilotStop)||1.8);
    if(dist>stop){
      const base=Math.max(6,Number(this.cfg().entryAutopilotSpeed)||15.5),speed=deep?Math.max(5.5,Math.min(base,Number(this.cfg().interiorAutopilotSpeed)||12.5)):base;
      const step=Math.min(dist-stop,speed*dt),inv=dist>1e-6?step/dist:0;this.shiftAutopilotWorld([dx*inv,dy*inv,dz*inv])
    }
    const remain=this.distanceTo(target);
    if(!deep&&!this.insideWreck){
      // Track the physical mouth crossing for controls/collision only.  Rendering no
      // longer changes here; the same hollow wreck is already on screen either side.
      const mouth=this.mouthPoint(),entry=this.entryPoint();
      if(mouth&&entry){
        const mouthToEntry=Math.hypot(mouth.x-entry.x,mouth.y-entry.y,mouth.z-entry.z);
        if(remain<=mouthToEntry+.45)this.insideWreck=true
      }
    }
    if(remain<=stop+.18&&angle<.030){
      if(!deep){
        this.insideWreck=true;this.entryAutoLeg='deep';this.entryAutoTurnRate=0;
        say('DOWNLOADING FLIGHT RECORDER DATA',.78);
        audio.playVoice('downloadingFlightRecorderData',{once:false,priority:true})
      }else this.beginRecorderTransfer()
    }
    return true
  }
  beginRecorderTransfer(){
    if(this.state!=='entryAutopilot')return false;
    this.state='recorderTransfer';this.stateT=0;this.insideWreck=true;this.entryAutoLeg='done';this.entryAutoTurnRate=0;this.recorderTransferT=0;
    this.recorderDataPackets.length=0;this.recorderDataSpawnT=.08;this.recorderDataDraining=false;
    for(let i=0;i<5;i++)this.recorderDataPackets.push(...stationHack.makeDataPacketGroup(true));
    inputX=inputY=aimX=aimY=0;spaceYawVel=spacePitchVel=0;audio?.hackChirp?.start?.();return true
  }
  updateRecorderTransfer(dt){
    this.recorderTransferT+=dt;const seconds=Math.max(1.5,Number(this.cfg().transferSeconds)||3.0);
    for(let i=this.recorderDataPackets.length-1;i>=0;i--){const p=this.recorderDataPackets[i];p.u+=p.speed*dt;if(p.u>=1)this.recorderDataPackets.splice(i,1)}
    if(this.recorderTransferT>=seconds)this.recorderDataDraining=true;
    if(!this.recorderDataDraining){
      this.recorderDataSpawnT-=dt;
      while(this.recorderDataSpawnT<=0&&this.recorderDataPackets.length<18){this.recorderDataPackets.push(...stationHack.makeDataPacketGroup(false));this.recorderDataSpawnT+=.14+Math.random()*.34}
    }
    if(!this.recorderDataDraining||this.recorderDataPackets.length)return;
    audio?.hackChirp?.stop?.();this.recovered=true;
    this.beginRecorderTurn()
  }
  beginRecorderTurn(){
    ensureSpaceOrientation();this.state='recorderTurn';this.stateT=0;this.recorderTurnT=0;
    this.recorderTurnStart={f:[...spaceForward],r:[...spaceRight],u:[...spaceUp]};return true
  }
  updateRecorderTurn(dt){
    this.recorderTurnT+=dt;const seconds=Math.max(1.2,Number(this.cfg().turnSeconds)||1.75),u=clamp(this.recorderTurnT/seconds,0,1),q=ease(u),st=this.recorderTurnStart;
    if(st){spaceForward=rotateAroundAxis(st.f,st.u,Math.PI*q);spaceRight=rotateAroundAxis(st.r,st.u,Math.PI*q);spaceUp=[...st.u];orthonormaliseSpaceOrientation();syncEulerFromSpaceOrientation();viewRoll=-Math.sin(u*Math.PI)*.07}
    if(u>=1){
      viewRoll=0;
      // updateSpaceMotion() normally damps the actual arcade travel vector toward
      // the nose direction.  A mathematically exact 180-degree turn is a special
      // case for the normalised lerp used there: the old and new vectors are
      // collinear opposites, so normalising each small interpolation step can leave
      // the movement vector pointing the OLD way indefinitely.  That made the craft
      // appear frozen after the recorder turn because it was continually trying to
      // drive deeper into the sealed bulkhead and wreck collision cancelled it.
      // Snap travel to the already-completed visual heading at this one hand-off.
      const f=v3norm(spaceForward);
      spaceMoveX=f[0];spaceMoveY=f[1];spaceMoveZ=f[2];
      spaceYawVel=spacePitchVel=0;
      this.state='exitNav';this.stateT=0;this.insideWreck=true;this.recorderTurnStart=null;
      mode='play';phase='asteroids';modeT=phaseT=0
    }
  }
  beginExitPitch(){
    if(!this.active||this.state!=='exitNav')return false;
    // Clear the wreck physically first, then visibly pitch the nose up before any
    // high-speed transfer begins.  This prevents the depot jump from reading as if
    // the drone simply accelerated straight through the detached half of the wreck.
    this.insideWreck=false;asteroidField.spaceBackdrop=false;this.state='exitPitch';this.stateT=0;this.exitPitchT=0;
    ensureSpaceOrientation();this.exitPitchStart={f:[...spaceForward],r:[...spaceRight],u:[...spaceUp],roll:viewRoll};
    inputX=inputY=aimX=aimY=0;spaceYawVel=spacePitchVel=0;laserBurstRemaining=0;endLaserTrigger();
    return true
  }
  updateExitPitch(dt){
    if(this.state!=='exitPitch')return false;
    this.exitPitchT+=dt;
    const seconds=Math.max(1.15,Number(this.cfg().exitPitchSeconds)||1.85),u=ease(clamp(this.exitPitchT/seconds,0,1)),st=this.exitPitchStart;
    // Open-space rendering uses the orthonormal flight basis, not the Euler pitch
    // value. Rotate the actual camera basis about its current right axis so the wreck
    // visibly drops away beneath the nose instead of merely changing a dormant number.
    if(st){
      const angle=-Math.max(1.15,Math.min(1.52,Number(this.cfg().exitPitchAngle)||1.44))*u;
      spaceForward=rotateAroundAxis(st.f,st.r,angle);spaceRight=[...st.r];spaceUp=rotateAroundAxis(st.u,st.r,angle);
      orthonormaliseSpaceOrientation();syncEulerFromSpaceOrientation();viewRoll=lerp(st.roll,0,ease(clamp(u/.72,0,1)))
    }
    if(u>=.999){viewRoll=0;this.startReturnTransit()}
    return true
  }
  startReturnTransit(){
    if(!this.active||this.state!=='exitPitch')return false;
    this.state='complete';SoundFX.objectiveComplete();
    const transit=this.stage?.returnTransit||{};
    // Retire wreck rendering/HUD only after the pitch manoeuvre is complete. The
    // zoom sound belongs to SpaceTransfer, so acceleration cannot begin early.
    this.active=false;
    audio.playVoice('headingToFreeTradersDepot',{once:false,priority:true});
    spaceTransfer.begin({
      duration:Number(transit.duration)||3.15,
      message:transit.message||'RETURNING TO FREE TRADERS FREIGHT DEPOT',
      hud:transit.hud||'TO FREIGHT DEPOT',
      playZoomSound:transit.playZoomSound!==false
    });
    return true
  }
  updateField(dt){
    if(!asteroidField.active)return;
    // Missing Manifest never leaves the asteroid belt near the wreck.  The old
    // 'thinning' code deliberately killed/recycled rocks until only a handful were
    // left, which made the wreck feel as though it sat in an artificial clear zone.
    // Keep the normal director running whenever the player is flying manually.
    if(!this.autopilotActive()&&!this.insideWreck){asteroidField.update(dt);return}

    // During automatic entry / download / turnaround keep the SAME field alive but
    // suppress asteroid-vs-player damage.  Once manual EXIT WRECK control returns,
    // player-relative drift resumes so the belt still behaves as one physical scene.
    asteroidField.updateThreatDirector?.(dt);
    asteroidField.dustTravel+=dt*18;
    const playerRelative=!this.autopilotActive()&&mode==='play';
    for(const a of asteroids){
      if(a.dead||a.dying||a.awaitingRecycle)continue;
      a.hitFx=Math.max(0,(a.hitFx||0)-dt);
      advanceArcadeSpaceBody(a,dt,{playerRelative})
    }
  }
  worldToWreckLocal(p){
    if(!this.wreck||!p)return null;
    // localToWorld() adds the wreck translation on all three axes, so the
    // inverse must remove all three axes too. Z used to omit -this.wreck.z;
    // that made player/asteroid collision tests use the wrong longitudinal
    // position and could pin the craft in place during EXIT WRECK.
    let q=[(p.x||0)-this.wreck.x,(p.y||0)-this.wreck.y,(p.z||0)-this.wreck.z];
    const r=this.wreck.rot||[0,0,0];
    // Inverse of Camera.rotate(): forward is X then Y then Z, so undo Z/Y/X.
    q=rz(q,-(r[2]||0));q=ry(q,-(r[1]||0));q=rx(q,-(r[0]||0));
    const inv=1/Math.max(.001,this.wreck.s||1);return[q[0]*inv,q[1]*inv,q[2]*inv]
  }
  wreckCorridorSection(z){
    // Exact diamond ribs used by story-wreck-assets.js.  y is centred on -.15;
    // top/bottom remain separate because the recorder-end taper is asymmetric.
    const k=[
      {z:.75,w:1.189,t:.36,b:.36},{z:-.55,w:1.131,t:.34,b:.34},
      {z:-.95,w:1.025,t:.36,b:.36},{z:-2.25,w:.975,t:.34,b:.34},
      {z:-2.48,w:.84,t:.31,b:.28},{z:-2.72,w:.72,t:.28,b:.21}
    ];
    if(z>k[0].z||z<k[k.length-1].z)return null;
    for(let i=0;i<k.length-1;i++){
      const a=k[i],b=k[i+1];if(z<=a.z&&z>=b.z){const u=(a.z-z)/(a.z-b.z);return{w:lerp(a.w,b.w,u),t:lerp(a.t,b.t,u),b:lerp(a.b,b.b,u)}}
    }
    return null
  }
  wreckDiamondMetric(p,section){
    if(!p||!section)return Infinity;const vy=p[1]+.15,h=vy>=0?section.t:section.b;
    return Math.abs(p[0])/Math.max(.001,section.w)+Math.abs(vy)/Math.max(.001,h)
  }
  asteroidTouchesWreck(a,prev,cur){
    if(!a||!cur||!this.wreck)return false;
    const r=Math.max(.018,Math.min(.24,(Number(a.s)||.8)/Math.max(1,this.wreck.s||22)*1.06));
    const sample=(p)=>{const sec=this.wreckCorridorSection(p[2]);if(!sec)return null;const m=this.wreckDiamondMetric(p,sec),pad=r*Math.hypot(1/sec.w,1/Math.min(sec.t,sec.b));return{m,pad}};

    // Side-wall collision. Sample the travelled segment too, so a fast rock cannot
    // tunnel through one sloping panel between frames.  The mouth itself has no cap,
    // therefore a rock on the centreline can genuinely fly into the wreck.
    const points=[];
    if(prev&&Math.hypot(cur[0]-prev[0],cur[1]-prev[1],cur[2]-prev[2])<2.2){
      points.push(prev);
      for(const u of [.25,.5,.75])points.push([lerp(prev[0],cur[0],u),lerp(prev[1],cur[1],u),lerp(prev[2],cur[2],u)])
    }
    points.push(cur);
    let last=null;
    for(const p of points){
      const q=sample(p);if(!q){last=null;continue}
      if(Math.abs(q.m-1)<=q.pad)return true;
      if(last&&(last.m-1)*(q.m-1)<0)return true;
      last=q
    }

    // The far end IS a real sealed bulkhead.  An asteroid that legitimately entered
    // through the torn mouth can travel inside, but it must stop here rather than pass
    // through the recorder wall.
    const bz=-2.72,bulk=this.wreckCorridorSection(bz);
    if(bulk){
      if(prev&&Math.hypot(cur[0]-prev[0],cur[1]-prev[1],cur[2]-prev[2])<2.2&&((prev[2]-bz)*(cur[2]-bz)<=0)){
        const dz=cur[2]-prev[2],u=Math.abs(dz)>.00001?(bz-prev[2])/dz:0;
        if(u>=0&&u<=1){const p=[lerp(prev[0],cur[0],u),lerp(prev[1],cur[1],u),bz],pad=r*Math.hypot(1/bulk.w,1/Math.min(bulk.t,bulk.b));if(this.wreckDiamondMetric(p,bulk)<=1+pad)return true}
      }else if(Math.abs(cur[2]-bz)<=r){
        const pad=r*Math.hypot(1/bulk.w,1/Math.min(bulk.t,bulk.b));if(this.wreckDiamondMetric(cur,bulk)<=1+pad)return true
      }
    }

    // Coarse solid-volume tests for the tail behind the recorder and the detached
    // forward half.  These parts are never fly-through spaces, so an ellipsoid is a
    // good inexpensive collision proxy and prevents rocks ghosting through them.
    const ellipsoid=(p,c,rad)=>{
      const dx=(p[0]-c[0])/(rad[0]+r),dy=(p[1]-c[1])/(rad[1]+r),dz=(p[2]-c[2])/(rad[2]+r);return dx*dx+dy*dy+dz*dz<=1
    };
    if(ellipsoid(cur,[0,-.04,-3.42],[.78,.52,1.18]))return true;
    if(ellipsoid(cur,[.65,.13,5.88],[1.42,.72,1.55]))return true;
    return false
  }
  blockAsteroidAtWreck(a){
    if(!a)return;
    a.isDanger=false;a._wreckPrevLocal=null;
    if(a.objective!==false){a.awaitingRecycle=true;a.vx=a.vy=a.vz=0;a.offscreenT=.2}
    else a.dead=true
  }
  updateAsteroidWreckCollisions(){
    if(!this.wreck)return;
    for(const a of asteroids){
      if(!a||a.dead||a.dying||a.awaitingRecycle)continue;
      const cur=this.worldToWreckLocal(a);if(!cur)continue;
      const recycle=a.recycles||0,teleported=a._wreckRecycleKey!==recycle;
      const prev=teleported?null:a._wreckPrevLocal;
      if(this.asteroidTouchesWreck(a,prev,cur)){this.blockAsteroidAtWreck(a);a._wreckRecycleKey=recycle;continue}
      a._wreckPrevLocal=cur;a._wreckRecycleKey=recycle
    }
  }
  updatePlayerWreckCollision(dt,previousLocal,previousWorld){
    if(!this.wreck||!previousLocal||!previousWorld||this.autopilotActive()||mode!=='play')return false;
    // The visible WRECK marker is the real entry target in every post-combat
    // approach state.  If the player has reached that capture volume, entry
    // autopilot will engage later in this same update tick.  Do not let hull
    // collision cancel the movement on that frame and prevent the trigger.
    if(this.state==='routeAfterCombat'||this.state==='thinning'||this.state==='gapApproach'){
      const gap=this.gapPoint(),capture=Math.max(20,Number(this.cfg().gapCaptureRadius)||34);
      if(gap&&this.distanceTo(gap)<=capture+.75)return false
    }
    // The wreck used to be scenery as far as the player craft was concerned, so it
    // was possible to fly directly through intact hull. Reuse the same continuous
    // diamond-shell/solid-section test that protects the wreck from asteroids, but
    // give the drone a modest physical radius. If the travelled segment touches
    // hull, put the wreck back at its previous relative position: in this arcade
    // space model that is equivalent to cancelling the player's forward translation
    // for the frame, so holding the controls presses against the hull instead of
    // tunnelling through it. The genuine torn mouth remains open.
    const cur=this.worldToWreckLocal({x:shipX,y:shipY,z:0});if(!cur)return false;
    const craft={s:2.05};
    if(!this.asteroidTouchesWreck(craft,previousLocal,cur))return false;
    this.wreck.x=previousWorld.x;this.wreck.y=previousWorld.y;this.wreck.z=previousWorld.z;
    this.wreckCollisionCooldown=Math.max(0,(this.wreckCollisionCooldown||0)-dt);
    if(this.wreckCollisionCooldown<=0){this.wreckCollisionCooldown=.72;damage('COLLISION')}
    return true
  }
  junkSpecs(){
    // Collision proxies match the interior props in story-wreck-assets.js. Every
    // centre is deliberately inset from the diamond walls; exterior fracture debris
    // is scenery only and therefore omitted from this interior collision list.
    return[
      {kind:'box',p:[-.36,-.27,.02],rad:2.15},{kind:'box',p:[.42,-.25,-.42],rad:1.95},
      {kind:'torn',p:[-.34,.00,-.68],rad:1.65},{kind:'beam',p:[.33,-.16,-.92],rad:1.55},
      {kind:'box',p:[-.31,-.27,-1.22],rad:1.95},{kind:'torn',p:[.32,-.03,-1.48],rad:1.55},
      {kind:'beam',p:[-.28,-.17,-1.78],rad:1.35},{kind:'box',p:[-.27,-.27,-2.08],rad:1.55},
      {kind:'torn',p:[.28,-.12,-2.30],rad:1.25},{kind:'beam',p:[-.23,-.18,-2.44],rad:1.10},
      {kind:'box',p:[.24,-.25,-2.50],rad:1.25}
    ]
  }
  updateJunkCollision(dt){
    if(!this.isInterior()||this.autopilotActive()||mode!=='play')return;
    this.junkCollisionCooldown=Math.max(0,this.junkCollisionCooldown-dt);if(this.junkCollisionCooldown>0)return;
    for(const j of this.junkSpecs()){
      const p=this.localToWorld(j.p);if(!p)continue;
      if(this.distanceTo(p)<(j.rad||2.5)){
        this.junkCollisionCooldown=.8;damage('COLLISION');break
      }
    }
  }
  update(dt){
    if(!this.active||mode!=='play')return;
    this.t+=dt;this.stateT+=dt;this.bulkheadHitFx=Math.max(0,this.bulkheadHitFx-dt);
    this.updateField(dt);
    if(this.nav&&!this.autopilotActive())this.advanceFixedPoint(this.nav,dt);
    let playerWreckPrev=null,wreckBefore=null;
    if(this.wreck&&!this.autopilotActive()){
      playerWreckPrev=this.worldToWreckLocal({x:shipX,y:shipY,z:0});
      wreckBefore={x:this.wreck.x,y:this.wreck.y,z:this.wreck.z};
      this.advanceFixedPoint(this.wreck,dt)
    }
    // The wreck is physical for BOTH the field and the player craft. The open torn
    // mouth remains a real opening, but intact side walls, the recorder bulkhead,
    // tail and detached half can no longer be flown through.
    this.updatePlayerWreckCollision(dt,playerWreckPrev,wreckBefore);
    this.updateAsteroidWreckCollisions();
    this.updateJunkCollision(dt);

    if(this.state==='route'){
      const trigger=Math.max(.8,Number(this.stage?.route?.ambushDelay)||4.2);
      if(this.stateT>=trigger)this.startAmbush();return
    }
    if(this.state==='ambush')return;
    if(this.state==='routeAfterCombat'||this.state==='thinning'||this.state==='gapApproach'){
      // The HUD points at the physical wreck gap, so that point must always be a
      // valid capture target.  Previously routeAfterCombat still waited for the
      // old invisible survey-nav checkpoint before permitting gapApproach; after
      // the distant-wreck presentation change it was therefore possible to fly
      // straight onto the visible WRECK marker and get no autopilot response.
      const gap=this.gapPoint(),gapCapture=Math.max(20,Number(this.cfg().gapCaptureRadius)||34);
      if(gap&&this.distanceTo(gap)<=gapCapture){this.reachGap();return}

      // Keep the old states only for presentation/pacing while farther away. They
      // must never gate the visible WRECK target itself.
      if(this.state==='routeAfterCombat'){
        const navCapture=Math.max(35,Number(this.stage?.route?.navCaptureRadius)||65);
        if(this.distanceTo(this.nav)<=navCapture)this.beginThinning();
        return
      }
      if(this.state==='thinning'){
        if(gap&&this.distanceTo(gap)<Math.max(180,Number(this.cfg().revealDistance)||360)){this.state='gapApproach';this.stateT=0}
        return
      }
      return
    }
    if(this.state==='entryAutopilot'){this.updateEntryAutopilot(dt);return}
    if(this.state==='recorderTransfer'){this.updateRecorderTransfer(dt);return}
    if(this.state==='recorderTurn'){this.updateRecorderTurn(dt);return}
    if(this.state==='exitPitch'){this.updateExitPitch(dt);return}
    if(this.state==='exitNav'){
      // EXIT WRECK is a physical gate, not a pin-point nav capture.  Once the craft
      // has crossed the torn mouth and moved a small distance into open space, start
      // the return zoom regardless of lateral offset.  The old 3.5-unit spherical
      // capture could be missed even after a perfectly good exit, forcing the player
      // to turn around and hunt for the marker behind them.
      const local=this.worldToWreckLocal({x:shipX,y:shipY,z:0});
      const mouthLocal=this.cfg().mouthLocal||[0,-.15,.68];
      const clearLocal=Math.max(.10,Number(this.cfg().exitClearLocal)||.16);
      if(local&&local[2]>=Number(mouthLocal[2]||0)+.02)this.insideWreck=false;
      if(local&&local[2]>=Number(mouthLocal[2]||0)+clearLocal){this.beginExitPitch();return}
      return
    }
  }
  wreckPresentationScale(){
    // The wreck is physically at its final size and position from the moment it is
    // spawned.  Only its DISTANT rendering is reduced so first sighting reads as a
    // genuinely remote object without adding extra travel time.  It is back at exact
    // physical scale well before collision/entry matters.
    if(!this.wreck)return 1;
    const gap=this.gapPoint(),d=gap?this.distanceTo(gap):Math.abs(this.wreck.z||0);
    const farD=Math.max(650,Number(this.cfg().visualScaleFarDistance)||1100);
    const fullD=Math.min(farD-80,Math.max(260,Number(this.cfg().visualScaleFullDistance)||480));
    const farScale=clamp(Number(this.cfg().visualScaleFar)||.38,.2,1);
    if(d>=farD)return farScale;
    if(d<=fullD)return 1;
    let t=clamp((farD-d)/(farD-fullD),0,1);
    t=t*t*(3-2*t); // smoothstep: no visible change of rate at either end
    return lerp(farScale,1,t)
  }
  wreckPresentationPose(){
    if(!this.wreck)return null;
    const f=this.wreckPresentationScale();
    if(f>=.9999)return this.wreck;
    // Scale visually ABOUT THE PHYSICAL GAP rather than about the model origin.  The
    // WRECK marker therefore continues to sit on the same real approach point while
    // the distant silhouette grows smoothly around it.
    const gapLocal=this.cfg().gapLocal||[.30,.10,2.95];
    const gap=this.gapPoint();if(!gap)return this.wreck;
    const s=this.wreck.s*f;
    const off=rotate([gapLocal[0]*s,gapLocal[1]*s,gapLocal[2]*s],this.wreck.rot);
    return{x:gap.x-off[0],y:gap.y-off[1],z:gap.z-off[2],s,rot:this.wreck.rot,hitFx:this.wreck.hitFx,dead:this.wreck.dead}
  }
  wreckMeshDepth(mesh,pose=this.wreck){
    if(!pose||!mesh?.v?.length)return null;
    const depths=[];
    for(const v of mesh.v){
      const r=rotate([v[0]*pose.s,v[1]*pose.s,v[2]*pose.s],pose.rot);
      const q=camPoint([pose.x+r[0],pose.y+r[1],pose.z+r[2]]);
      if(q[2]>.18)depths.push(q[2])
    }
    if(!depths.length)return null;depths.sort((a,b)=>a-b);return depths[(depths.length/2)|0]
  }
  drawRecorderDataTransfer(){
    const p=this.blackBoxPoint();if(!p)return;const source=camPoint([p.x,p.y,p.z]);if(!source||source[2]<=.2)return;
    stationHack.drawDataRamp(source,[0,-.62,.82],this.recorderDataPackets,{sourceHalf:.40,targetHalf:.88})
  }
  appendScene(scene){
    if(!this.active||!this.wreck||this.state==='complete')return;
    // One physical mesh now contains hull, braces, static debris and recorder.
    // Hidden-line removal therefore decides visibility from actual geometry rather
    // than scene state or object-centre distance: no leaking outside and no popping.
    const requested=this.cfg().asset||'leviathanTrueSeparation04';
    const key=requested==='leviathanTrueSeparation04'?'leviathanContinuousInterior06':requested;
    const mesh=globalThis.AgentXStoryWreckAssets?.[key];
    if(mesh){
      const pose=this.wreckPresentationPose(),d=this.wreckMeshDepth(mesh,pose);
      if(d!=null)scene.push({z:d,draw:()=>drawMesh(pose,mesh,C.c)})
    }
    if(this.state==='recorderTransfer')scene.push({z:.19,draw:()=>this.drawRecorderDataTransfer()})
  }
  markerTarget(){
    if(this.state==='route')return{point:this.nav,label:'FIELD NAV',size:13};
    // Once the pirates are gone, the player is looking for one thing: the wreck.
    // Keep that wording stable all the way to entry.  During routeAfterCombat the
    // wreck itself is already visible at long range, while the old survey-nav point
    // remains only an internal pacing checkpoint.
    if(this.state==='routeAfterCombat')return{point:this.gapPoint()||this.nav,label:'WRECK',size:10,grow:true,growRange:240,maxSize:24};
    if(this.state==='thinning'||this.state==='gapApproach')return{point:this.gapPoint(),label:'WRECK',size:10,grow:true,growRange:240,maxSize:24};
    // No EXIT WRECK nav diamond.  After the recorder turn the corridor and torn
    // mouth are the player's spatial guide; crossing the mouth itself triggers exit.
    if(this.state==='entryAutopilot'||this.state==='recorderTransfer'||this.state==='recorderTurn'||this.state==='exitNav'||this.state==='exitPitch')return null;
    return null
  }
  drawMarker(){
    if(!this.active||this.state==='ambush'||this.state==='recorderTransfer'||this.state==='recorderTurn'||mode!=='play')return;
    const target=this.markerTarget();if(!target?.point)return;
    const q=camPoint([target.point.x,target.point.y,target.point.z]);
    let r=target.size||13;if(target.grow&&q[2]>.15){
      const d=this.distanceTo(target.point),growRange=Math.max(20,Number(target.growRange)||120),maxSize=Math.max(r,Number(target.maxSize)||r*2.15);
      r=clamp(r+(growRange-d)*(maxSize-r)/growRange,r,maxSize)
    }
    let p=null,on=false;if(q[2]>.15){p=projectCam(q);on=!!(p&&p.x>=0&&p.x<=W&&p.y>=0&&p.y<=H)}if(!on)p=hudEdgeCue(q,r);if(!p)return;
    const col=C.y,x=p.x,y=p.y;
    line(x-r,y,x,y-r,col,1.2,.96);line(x,y-r,x+r,y,col,1.2,.96);line(x+r,y,x,y+r,col,1.2,.96);line(x,y+r,x-r,y,col,1.2,.96);
    drawHudMarkerLabel(target.label,x,y,r,col)
  }
  hudLeft(){
    if(!this.active)return'';
    if(this.state==='ambush')return'PIRATE INTERCEPT';
    if(this.state==='entryAutopilot')return this.entryAutoLeg==='deep'?'FREIGHTER INTERIOR':'WRECK ENTRY AUTOPILOT';
    if(this.state==='exitPitch')return'WRECK DEPARTURE';
    if(this.isInterior()||this.state==='recorderTransfer'||this.state==='recorderTurn'||this.state==='exitNav')return'FREIGHTER INTERIOR';
    if(this.state==='gapApproach'||this.state==='thinning')return'WRECK SITE';
    return'ASTEROID FIELD'
  }
  hudRight(){
    if(!this.active)return'';
    if(this.state==='ambush')return`PIRATES ${Math.min(interceptorsDestroyed,interceptorGoal)}/${interceptorGoal}`;
    if(this.state==='entryAutopilot')return this.entryAutoLeg==='hold'?'AUTOPILOT HOLD':(this.entryAutoLeg==='deep'?'AUTOPILOT · RECORDER':'AUTOPILOT ENTRY');
    if(this.state==='recorderTransfer')return`DATA TRANSFER ${Math.round(clamp(this.recorderTransferT/Math.max(1.5,Number(this.cfg().transferSeconds)||3.0),0,1)*100)}%`;
    if(this.state==='recorderTurn')return'TURNAROUND';
    if(this.state==='exitNav')return'EXIT WRECK';
    if(this.state==='exitPitch')return'PITCHING CLEAR';
    const t=this.markerTarget()?.point;if(t){const d=Math.round(this.distanceTo(t));return`${this.markerTarget().label} ${d}`}
    return''
  }
}
