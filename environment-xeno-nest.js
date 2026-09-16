'use strict';
const xenoNest={
  active:false,state:'',maskActive:false,maskDeployed:false,hostile:false,zoneActive:false,inboundAngered:false,
  zoneOuter:1400,broodOuter:1950,zoneInner:145,core:null,brood:[],nav:null,objective:null,corridorTravel:0,escapeT:0,spawnT:0,broodSpawnT:0,doorOpen:1,doorT:0,doorOffset:null,
  hatchCooldown:0,ambientSpawnT:0,observationT:0,observationTurnT:0,detonationT:0,departureT:0,crossfire:[],explosionBursts:0,
  surfaceMouthOffsets:[],surfaceMouthSeeded:false,safeZone:false,swarmPunishT:0,
  observationTurnStart:null,observationTurnAxis:null,observationTurnAngle:Math.PI,observationHoldOrientation:null,coreExploded:false,lastCoreScreen:null,
  destructionLarvae:[],destructionShells:[],destructionImpacts:[],hiveChunks:[],destructionInitialized:false,destructionSoundTick:0,
  destructionConfirmStarted:false,destructionConfirmAt:0,
  coreLength:520,coreRadius:9.25,coreMouthRadius:1.55,coreMouthThroat:36,coreMouthThickness:2.8,coreObstacles:[],coreImpactCD:0,chaosVolleyT:0,coreExitT:0,
  doorRight:null,doorUp:null,doorForward:null,dockRoute:[],dockRouteLeg:0,dockState:'',dockStageDistance:58,dockTurnRate:0,
  exitBroodLocal:[],exitPreviewShift:0,
  begin(){
    this.active=true;this.state='approach';this.maskActive=false;this.maskDeployed=false;this.zoneActive=false;this.inboundAngered=false;
    this.hostile=false;this.objective=null;this.nav=null;this.doorOpen=1;this.doorT=0;this.doorOffset=null;this.coreObstacles.length=0;this.coreImpactCD=0;this.chaosVolleyT=0;this.coreExitT=0;
    this.doorRight=this.doorUp=this.doorForward=null;this.dockRoute.length=0;this.dockRouteLeg=0;this.dockState='';this.dockTurnRate=0;
    this.exitBroodLocal.length=0;this.exitPreviewShift=0;
    this.surfaceMouthOffsets.length=0;this.surfaceMouthSeeded=false;this.safeZone=false;this.swarmPunishT=0;this.observationHoldOrientation=null;
    this.destructionLarvae.length=0;this.destructionShells.length=0;this.destructionImpacts.length=0;this.hiveChunks.length=0;this.destructionInitialized=false;this.destructionSoundTick=0;this.destructionConfirmStarted=false;this.destructionConfirmAt=0;
    this.corridorTravel=this.escapeT=this.observationT=this.observationTurnT=this.detonationT=this.departureT=0;
    this.spawnT=.35;this.broodSpawnT=0;this.hatchCooldown=2.5;this.ambientSpawnT=.25;this.crossfire.length=0;this.explosionBursts=0;this.coreExploded=false;this.lastCoreScreen=null;
    phase='xenoNest';mode='play';phaseT=modeT=0;travel=0;score=0;
    fighters.length=0;bolts.length=0;groundTargets.length=0;hazards.length=0;asteroids.length=0;shots.length=0;playerMissiles.length=0;
    inputX=inputY=aimX=aimY=viewYaw=viewPitch=viewRoll=shipX=shipY=0;spaceYawVel=spacePitchVel=0;
    resetPlanetBearing();resetSpaceMotion();resetSpaceDogfightDirector();spaceOrientationReady=false;ensureSpaceOrientation();
    this.buildOuterField('approach');
    audio.resetMissionVoices();audio.music.setMode('calm');
    // The pheromone equipment belongs to this whole biological encounter, not a
    // late invisible radius. Announce/activate it as the FIRST mission message so
    // the player knows the behavioural rule before any egg prism can be disturbed.
    this.deployMask();
    // The behavioural warning is the first thing heard on arrival. Once it has
    // finished, give the simple navigation instruction as a separate speech cue.
    audio.playVoice('xenoProceedNestCore',{once:false,priority:false,delayBeforeMs:320});
    say('XENO NEST · APPROACH',.75)
  },
  finish(success=true){
    if(!this.active)return;
    this.active=false;this.state='';this.maskActive=this.maskDeployed=this.hostile=this.zoneActive=this.inboundAngered=false;
    fighters.length=0;bolts.length=0;groundTargets.length=0;hazards.length=0;shots.length=0;playerMissiles.length=0;
    this.brood.length=0;this.crossfire.length=0;this.destructionLarvae.length=0;this.destructionShells.length=0;this.destructionImpacts.length=0;this.hiveChunks.length=0;this.core=null;this.nav=null;this.objective=null;
    releaseSpaceLock();releaseSpacePursuit();resetSpaceDogfightDirector();
    paused=false;document.body.classList.remove('paused','playing');
    if(!success)audio.playVoice('missionFailed',{once:false,priority:true});
    campaign.showHub('options')
  },
  isInterior(){return this.active&&phase==='xenoCore'},
  coreDistance(){return this.core?Math.hypot(this.core.x-shipX,this.core.y-shipY,this.core.z):Infinity},
  hudLeft(){
    if(!this.active)return'';
    if(this.state==='approach')return'XENO NEST · APPROACH';
    if(this.state==='doorApproach')return'XENO HIVE · ENTRY';
    if(this.state==='coreInbound')return'XENO CORE · INFILTRATION';
    if(this.state==='coreEscape')return'XENO CORE · ESCAPE';
    if(this.state==='coreExit')return'XENO CORE · EXIT';
    if(this.state==='observationRun')return'XENO NEST · OBSERVATION RUN';
    if(this.state==='observationTurn')return'XENO NEST · TURN TO HIVE';
    if(this.state==='observationHold'||this.state==='detonation')return'XENO NEST · OBSERVATION';
    if(this.state==='departure')return'XENO NEST · DEPARTURE';
    return'XENO NEST'
  },
  hudRight(){
    if(!this.active)return'';
    if(this.state==='approach'){
      const d=Math.round(this.coreDistance());
      if(this.hostile)return`SWARM ALERT · CORE ${d}`;
      if(this.maskActive)return`MASK ACTIVE · CORE ${d}`;
      return d>this.zoneOuter?`OUTSIDE HIVE ZONE · CORE ${d}`:`APPROACHING HIVE · CORE ${d}`
    }
    if(this.state==='doorApproach')return'ENTRY AUTOPILOT';
    if(this.state==='coreInbound')return this.objective&&!this.objective.dead?`REGULATOR ${Math.max(0,this.objective.hp)}/${this.objective.maxHp}`:'ADVANCE TO REGULATOR';
    if(this.state==='coreEscape')return'ESCAPE THE CORE';
    if(this.state==='coreExit')return'OPEN HIVE MOUTH';
    if(this.state==='observationRun')return this.nav?`OBSERVATION NAV ${Math.round(this.navDistance())}`:'OBSERVATION NAV';
    if(this.state==='observationTurn')return'TURNING TO HIVE';
    if(this.state==='observationHold')return'OBSERVATION LOCK';
    if(this.state==='detonation')return this.detonationT<2.0?'SWARM CONVERGENCE':'HIVE STRUCTURE FAILING';
    if(this.state==='departure')return'RETURN TO BASE';
    return''
  },
  deployMask(){
    if(!this.active||this.hostile||this.maskActive||this.maskDeployed)return;
    this.maskDeployed=true;this.maskActive=true;
    audio.playVoice('xenoPheromoneActive',{once:false,priority:true})
  },
  breakMask(reason='SWARM RESPONSE'){
    if(this.hostile)return;
    this.hostile=true;this.maskActive=false;this.maskDeployed=true;
    if(this.state==='approach'||this.state==='doorApproach')this.inboundAngered=true;
    audio.music.setMode('violent');
    audio.playVoice('xenoPheromoneCompromised',{once:false,priority:true});
    // Breaking the peace before the regulator is destroyed is meant to be almost
    // suicidal. Existing peaceful traffic is immediately re-armed and recommitted
    // to nest-only attack passes; this does not touch the shared combat director.
    for(const f of fighters){
      if(!f||f.dead||f.dying||!f.hiveNest)continue;
      f.nestHostile=true;f.shotsLeft=8+((Math.random()*5)|0);f.maxFireBursts=6;f.fireBurstsFired=0;f.fireBurstShots=0;f.fireShotCD=0;f.nextFireOpportunity=0;
      const hidden=!fighterVisible(f,85);beginAggressorPass(f,hidden,Math.random()*.18);this.tuneNestBugPass(f,{fromEgg:!hidden,hostile:true,panic:true})
    }
    say(reason,.8);this.spawnT=.02;this.ambientSpawnT=0;this.swarmPunishT=.02
  },
  onFighterHit(f){
    if(!this.active||!f?.bugKind)return;
    if(!this.hostile)this.breakMask('XENOFORM ATTACKED · MASK COMPROMISED')
  },
  onFighterDestroyed(){
    if(!this.active)return;
    say(this.hostile?'XENOFORM DOWN':'XENOFORM DOWN · SWARM ALERT',.35)
  },
  makeBrood(x=0,y=0,z=80,s=1.4,mz=1,rot=[0,0,0]){
    return{
      type:'xenoBrood',x,y,z,s,mx:1,my:1,mz,rot,
      col:Math.random()<.48?C.y:C.o,mesh:globalThis.AgentXXenoNest?.brood,
      hp:1,maxHp:1,hitFx:0,dying:0,dead:false,objective:true,missionTarget:false,broodNest:true,
      vx:0,vy:0,vz:0,
      spin:[(Math.random()-.5)*.9,(Math.random()-.5)*.9,(Math.random()-.5)*.9],
      hatchable:Math.random()<.24,hatched:false,
      offscreenT:0,closestD:Infinity,recycles:0,trajectoryKind:'traffic',awaitingRecycle:false,runBand:null,
      aimWorldX:0,aimWorldY:0,aimWorldZ:0,guidanceLocked:true,guidanceLockTTC:0,isDanger:false
    }
  },
  hitBrood(b,p){
    if(!b||b.dead||b.dying)return false;
    b.hp=0;b.dead=true;b.awaitingRecycle=true;b.vx=b.vy=b.vz=0;
    if(p)explodeMesh(b,b.mesh,p,b.col||C.o);else SoundFX.explosion();
    if((this.state==='approach'||this.state==='doorApproach')&&!this.hostile){
      this.inboundAngered=true;
      this.breakMask('BROOD CELL DESTROYED · SWARM ALERT')
    }else if(this.state==='approach'||this.state==='doorApproach'){
      this.inboundAngered=true
    }
    return true
  },
  hiveZoneProgress(){
    if(!this.core)return 0;
    return clamp((this.zoneOuter-this.coreDistance())/Math.max(1,this.zoneOuter-this.zoneInner),0,1)
  },
  broodFieldProgress(){
    if(!this.core)return 0;
    return clamp((this.broodOuter-this.coreDistance())/Math.max(1,this.broodOuter-this.zoneInner),0,1)
  },
  desiredBroodCount(){
    if(this.state==='observationRun')return 22;
    if(this.state==='observationHold'||this.state==='detonation')return 18;
    if(this.state!=='approach'&&this.state!=='doorApproach')return 24;
    // The visible brood field begins WELL outside the biological influence zone.
    // Entering the zone should change pheromone/xeno behaviour, not suddenly make
    // large eggs pop into existence. Density therefore ramps from a few distant
    // cells far out to a crowded nest approach near Hive L.
    const p=this.broodFieldProgress();
    if(p<=0)return 0;
    return Math.round(2+p*6+Math.pow(p,1.7)*42)
  },
  activateHiveZone(){
    if(this.zoneActive)return;
    this.zoneActive=true;
    // The brood field is already physically present. Crossing the influence
    // boundary changes pheromone/xeno behaviour only; it never spawns or reseeds eggs.
    this.broodSpawnT=Math.max(this.broodSpawnT,.12);
    fighters.length=0;this.ambientSpawnT=0;
    for(let i=0;i<6;i++)this.spawnBug(false,{ambientRun:true,delay:i*.12})
  },
  configureBroodRun(b,band='far',forcedTTC=null){
    if(!b)return false;
    b.dead=false;b.dying=0;b.awaitingRecycle=false;b.offscreenT=0;b.closestD=Infinity;
    // This is the exact normal asteroid run composer. Only the mesh/colour differ.
    return asteroidField.configureRun(b,band,false,forcedTTC)
  },
  seedBroodField(kind='approach'){
    this.brood.length=0;this.broodSpawnT=0;
    const desired=kind==='approach'?this.desiredBroodCount():(kind==='outbound'?22:18);
    // Same long-lead opening stream as the asteroid field, but stretched even
    // farther for the hive so brood cells are already tiny specks before the zone.
    const plan=kind==='approach'
      ?[11.5,12.4,13.3,14.3,15.3,16.4,17.5,18.7,19.9,21.1,22.3,23.5,24.7,25.9,27.1,28.3]
      :[3.30,3.58,3.86,4.16,4.48,4.82,5.18,5.56,5.95,6.36,6.78,7.20,7.62,8.02,8.38,8.74];
    for(let i=0;i<desired;i++){
      const s=.9+Math.random()*1.65,mz=.72+Math.random()*1.9;
      const b=this.makeBrood(0,0,80,s,mz,[Math.random()*.55-.275,Math.random()*Math.PI*2,Math.random()*.55-.275]);
      this.configureBroodRun(b,'far',plan[i%plan.length]+Math.floor(i/plan.length)*.28+Math.random()*.10);
      this.brood.push(b)
    }
  },
  broodOnScreen(b,margin=18){
    const q=camPoint([b.x,b.y,b.z]);if(q[2]<18||q[2]>160)return false;
    const p=projectCam(q);if(!p)return false;
    return p.x>-margin&&p.x<W+margin&&p.y>-margin&&p.y<viewH+margin
  },
  hatchBroodEgg(b){
    if(!b||b.dead||b.hatched||b.awaitingRecycle)return false;
    const f=this.spawnBug(this.hostile,{fromEgg:b,forceKind:'larva'});if(!f)return false;
    b.hatched=true;b.dead=true;this.hatchCooldown=4.5+Math.random()*4.5;this.ambientSpawnT=Math.max(this.ambientSpawnT,1.4);
    const p=proj([b.x,b.y,b.z]);if(p)spark(p.x,p.y,b.col||C.o,7);
    return true
  },
  maintainBroodDensity(dt){
    this.broodSpawnT=Math.max(0,this.broodSpawnT-dt);
    if(this.broodSpawnT>0)return;
    const desired=this.desiredBroodCount();
    let active=this.brood.filter(b=>!b.dead&&!b.awaitingRecycle).length;
    let changed=0;
    const p=this.broodFieldProgress(),q=this.hiveZoneProgress();
    // Distance to Hive L drives density, but every newly required egg still joins
    // as distant asteroid-style traffic. Far out, additions take many seconds to
    // reach X; only deep in the nest can the traffic cadence become genuinely dense.
    const band=p>.90?'incoming':'far';
    const nextTTC=()=>p>.90?(3.2+Math.random()*2.8):
      (p>.72?(4.8+Math.random()*3.6):
      (p>.48?(6.8+Math.random()*4.8):(10.0+Math.random()*6.5)));
    const batch=p>.82?3:(p>.50?2:1);
    for(const b of this.brood){
      if(active>=desired||changed>=batch)break;
      if(!b.dead&&!b.awaitingRecycle)continue;
      b.dead=false;b.hatched=false;b.hatchable=Math.random()<.24;b.col=Math.random()<.46?C.y:C.o;
      b.s=.9+Math.random()*1.7;b.mz=.72+Math.random()*2.0;
      this.configureBroodRun(b,band,nextTTC());active++;changed++
    }
    while(active<desired&&this.brood.length<58&&changed<batch){
      const b=this.makeBrood(0,0,80,.9+Math.random()*1.7,.72+Math.random()*2.0,[Math.random()*.45-.225,Math.random()*Math.PI*2,Math.random()*.45-.225]);
      this.configureBroodRun(b,band,nextTTC());this.brood.push(b);active++;changed++
    }
    this.broodSpawnT=.18-p*.08
  },
  updateBroodField(dt,{allowHatch=true}={}){
    this.hatchCooldown=Math.max(0,this.hatchCooldown-dt);
    let hatchCandidate=null;
    for(const b of this.brood){
      if(!b||b.dead||b.awaitingRecycle)continue;
      b.hitFx=Math.max(0,(b.hitFx||0)-dt);
      // Exact shared asteroid guidance/lock/player-relative pass update.
      // Keep this defensive because nest patches may be applied over a build whose
      // asteroid controller predates the shared helper. The packaged asteroids.js
      // supplies advanceConfiguredRunBody(), but an older controller must not make
      // the mission crash at the hive-zone boundary.
      if(asteroidField&&typeof asteroidField.advanceConfiguredRunBody==='function'){
        asteroidField.advanceConfiguredRunBody(b,dt,{playerRelative:true});
      }else if(typeof globalThis.advanceArcadeSpaceBody==='function'){
        globalThis.advanceArcadeSpaceBody(b,dt,{playerRelative:true});
      }else{
        b.x+=((b.vx||0)-spaceMoveX*OPEN_SPACE_CRUISE)*dt;
        b.y+=((b.vy||0)-spaceMoveY*OPEN_SPACE_CRUISE)*dt;
        b.z+=((b.vz||0)-spaceMoveZ*OPEN_SPACE_CRUISE)*dt;
      }
      const dx=b.x-shipX,dy=b.y-shipY,dz=b.z,d=Math.max(.001,Math.hypot(dx,dy,dz));
      b.closestD=Math.min(b.closestD??Infinity,d);
      const radius=b.s*1.05;
      if(d<radius+.58){
        damage('BROOD IMPACT');
        this.hitBrood(b);
        if((this.state==='approach'||this.state==='doorApproach')&&!this.hostile)this.breakMask('BROOD COLLISION · SWARM ALERT');
        continue
      }
      if(asteroidField.asteroidVisible(b,90))b.offscreenT=0;else b.offscreenT=(b.offscreenT||0)+dt;
      if(b.offscreenT>.10&&d>38){
        b.awaitingRecycle=true;b.vx=b.vy=b.vz=0;continue
      }
      if(allowHatch&&this.hatchCooldown<=0&&b.hatchable&&!b.hatched&&this.broodOnScreen(b))hatchCandidate=b
    }
    if(hatchCandidate&&Math.random()<dt*.72)this.hatchBroodEgg(hatchCandidate);
    if(this.state==='approach'||this.state==='observationRun'||this.state==='observationHold'||this.state==='detonation')this.maintainBroodDensity(dt)
  },
  tuneNestBugPass(f,{fromEgg=false,hostile=this.hostile,panic=false}={}){
    if(!f?.route?.length)return f;
    // Nest traffic borrows the normal attack choreography, but it is intentionally
    // slower and staged farther from the camera so the player can WATCH xenos cross
    // the scene. This is actor-local tuning; ordinary combat missions are unchanged.
    if(!fromEgg){
      const scale=panic?(1.14+Math.random()*.28):(1.55+Math.random()*.82);
      f.route=f.route.map(w=>{
        const q=camPoint(w);if(!q||q[2]<=.2)return w;
        return cameraPointToWorld([q[0]*scale,q[1]*scale,q[2]*scale])
      });
      f.pts=f.route;
      if(f.route.length>1){
        f.x=f.route[0][0];f.y=f.route[0][1];f.z=f.route[0][2];
        const d=v3norm([f.route[1][0]-f.x,f.route[1][1]-f.y,f.route[1][2]-f.z]);
        f.routeSpeed=Math.max(7,(f.routeSpeed||25)*(panic?.54:.42));
        f.vx=d[0]*f.routeSpeed;f.vy=d[1]*f.routeSpeed;f.vz=d[2]*f.routeSpeed
      }
    }else f.routeSpeed=Math.max(7,(f.routeSpeed||25)*(panic?.52:.50));
    f.routeTurnRate=(f.routeTurnRate||1)*(panic?.78:.72);
    f.dur=(f.dur||3)*(panic?1.42:1.88);
    f.attackExitDeadline=Math.max(f.attackExitDeadline||0,panic?(1.35+Math.random()*.55):(1.85+Math.random()*.90));
    if(hostile){f.shotsLeft=Math.max(f.shotsLeft||0,panic?9:5);f.maxFireBursts=Math.max(f.maxFireBursts||0,panic?6:4);f.nextFireOpportunity=Math.min(f.nextFireOpportunity||.1,.08)}
    return f
  },
  buildOuterField(kind='approach'){
    this.brood.length=0;this.broodSpawnT=0;
    if(kind==='approach'){
      const side=Math.random()<.5?-1:1;
      // Start genuinely outside the hive influence zone, then spend a long time
      // inside it before reaching the core. The nest encounter is staged entirely
      // from distanceToHive, not from a fully simulated world volume.
      const routeSeconds=42+Math.random()*4;
      this.core={
        type:'xenoHiveCore',x:side*(28+Math.random()*26),y:-12+Math.random()*24,
        z:180+routeSeconds*OPEN_SPACE_CRUISE+Math.random()*65,s:38,mx:1,my:1,mz:1,
        rot:[.10,.22,.02],col:C.o,mesh:globalThis.AgentXXenoNest?.core
      };
      this.seedBroodField('approach')
    }else if(kind==='observe'){
      this.core={type:'xenoHiveCore',x:-18,y:4,z:315,s:36,mx:1,my:1,mz:1,rot:[.10,.22,.02],col:C.o,mesh:globalThis.AgentXXenoNest?.core};
      this.seedBroodField('observe')
    }else if(kind==='outbound'){
      this.core=null;this.seedBroodField('outbound')
    }
  },
  spawnBug(hostile=this.hostile,{ambientRun=false,fromEgg=null,forceKind='',delay=0}={}){
    const meshes=globalThis.AgentXSpaceBugs?.meshes;if(!meshes)return null;
    const kind=forceKind||((Math.random()<.30)?'larva':'hornet'),mesh=meshes[kind];
    const hp=kind==='hornet'?10:14;
    // Use the ordinary combat-fighter schema so these creatures can run through
    // the exact same attack/pass route machinery as normal dogfight enemies.
    const f={
      id:actorId++,type:'fighter',bugKind:kind,bugAnimPhase:Math.random()*Math.PI*2,pts:[],t:0,dur:6,
      s:kind==='hornet'?1.95:2.38,rot:[0,0,0],x:0,y:0,z:60,hp,maxHp:hp,damageSeed:Math.random()*10000,
      hitFx:0,col:kind==='hornet'?C.y:C.g,nextShot:.28,shotsLeft:0,pursuitReturnFireCD:0,mesh,hullName:mesh?.name||'Xenoform',
      bank:0,dead:false,dying:0,deathPoint:null,offscreenT:0,recycles:0,exiting:false,
      dogfightStyle:chooseDogfightStyle(),dogfightState:'background',egressT:0,
      threatT:0,evasionCD:0,evadePendingT:0,evadePendingStrength:0,evadePendingKind:'',
      jinkAge:0,jinkDur:0,jinkAmp:0,jinkSide:1,jinkVert:0,jinkRight:null,jinkUp:null,damageHits:[],
      pursuitAcquireT:0,pursuitStrength:0,pursuitBreakUsed:false,pursuitBreakStart:0,pursuitBreakDuration:0,lastBreakSide:0,lastBreakVert:0,
      route:[],routeIndex:0,routeState:'',routeAge:0,routeSpeed:0,routeTurnRate:0,attackAge:0,
      vx:0,vy:0,vz:0,hiveNest:true,nestHostile:!!hostile,ambientRun:!hostile||!!ambientRun
    };
    fighters.push(f);
    if(fromEgg){
      f.x=fromEgg.x;f.y=fromEgg.y;f.z=fromEgg.z;
      // Hatching substitutes for a normal fly-in: the new larva immediately joins
      // an ordinary visible aggressor-style crossing route from the egg position.
      beginAggressorPass(f,false,0);this.tuneNestBugPass(f,{fromEgg:true,hostile:!!hostile,panic:this.inboundAngered})
    }else{
      // This is literally the same hidden attack-entry choreography used by combat.
      // Pheromone-safe creatures use the route but have their weapons suppressed.
      beginAggressorPass(f,true,Math.max(0,delay)+Math.random()*.10);this.tuneNestBugPass(f,{fromEgg:false,hostile:!!hostile,panic:this.inboundAngered})
    }
    return f
  },
  moveOuter(dt,speed=OPEN_SPACE_CRUISE){
    // Hive/nav use the same player-relative cruise as other fixed destinations.
    // Xenoforms are deliberately NOT translated here: their motion is controlled
    // by the real combat-route code below, exactly as it is in a dogfight.
    const dx=-spaceMoveX*speed*dt,dy=-spaceMoveY*speed*dt,dz=-spaceMoveZ*speed*dt;
    if(this.core){this.core.x+=dx;this.core.y+=dy;this.core.z+=dz}
    if(this.nav){this.nav.x+=dx;this.nav.y+=dy;this.nav.z+=dz}
    if(this.state==='observationRun')for(const b of this.brood)if(b&&!b.dead&&b.nestFixed){b.x+=dx;b.y+=dy;b.z+=dz}
  },
  updateBugs(dt){
    const live=fighters.filter(f=>!f.dead&&!f.dying&&f.hiveNest);
    for(const f of live){
      if(this.hostile)f.nestHostile=true;
      const safe=!f.nestHostile&&!this.hostile;
      if(f.t<0){f.t+=dt/Math.max(.1,f.dur);continue}

      // Exact combat egress movement/re-entry. Once a creature has genuinely left
      // view it is assigned another normal attack-entry route, creating continual
      // purposeful crossings without teleporting visible objects.
      if(f.exiting){
        f.egressT=(f.egressT||0)+dt;
        applyUnpursuedEgressEscape(f,dt);
        const enemyMoveDt=dt*tuneScale('enemySpeed');
        f.x+=(f.vx||0)*enemyMoveDt;f.y+=(f.vy||0)*enemyMoveDt;f.z+=(f.vz||0)*enemyMoveDt;
        orientFighter(f);
        const vis=fighterVisible(f,65);
        if(vis)f.offscreenT=0;else f.offscreenT=(f.offscreenT||0)+dt;
        if(f.offscreenT>.42){
          f.nestHostile=!!this.hostile;
          beginAggressorPass(f,true,.05+Math.random()*.20);this.tuneNestBugPass(f,{fromEgg:false,hostile:!!this.hostile,panic:this.inboundAngered})
        }
        continue
      }

      const routeDone=advanceFighterRoute(f,dt);
      orientFighter(f);
      if(routeDone){startFighterEgress(f);continue}
      if(fighterVisible(f,65))f.offscreenT=0;else f.offscreenT=(f.offscreenT||0)+dt;

      if(f.dogfightState==='attack'){
        f.attackAge=(f.attackAge||0)+dt;
        if(!f.attackEscape&&f.attackAge>=(f.attackExitDeadline||.72))beginFighterAttackEscape(f,'pass-complete');

        if(safe){
          // Pheromone mask: use the complete attack/pass choreography, but never
          // permit a firing opportunity. They visibly behave like busy traffic.
          f.shotsLeft=0;f.fireBurstShots=0;f.fireShotCD=0
        }else{
          // After the regulator breaks, the same combat-pass code becomes lethal.
          const solution=fighterFiringSolution(f);
          f.fireShotCD=Math.max(0,(f.fireShotCD||0)-dt);
          if(solution&&f.shotsLeft>0&&(f.fireBurstShots||0)<=0&&
             (f.fireBurstsFired||0)<(f.maxFireBursts||4)&&
             f.attackAge>=(f.nextFireOpportunity||0)){
            const wanted=Math.min(Math.max(1,Math.round(combatTuning.burstLength)),f.shotsLeft);
            f.fireBurstShots=wanted;f.fireBurstsFired=(f.fireBurstsFired||0)+1;f.fireShotCD=0;
            f.nextFireOpportunity=f.attackAge+(.18+Math.random()*.10)/tuneScale('fireRate')
          }
          if(solution&&(f.fireBurstShots||0)>0&&f.fireShotCD<=0){
            const postFrenzyCapped=!this.inboundAngered&&this.state==='observationRun'&&this.activeNestProjectileCount()>=5;
            if(postFrenzyCapped){f.fireBurstShots=0;f.fireShotCD=.10;continue}
            const before=bolts.length;
            if(spawnFighterBolt(f)){
              if(!f.attackEscape)beginFighterAttackEscape(f,'fired');
              f.fireBurstShots--;f.shotsLeft--;
              f.fireShotCD=(.10+Math.random()*.05)/tuneScale('fireRate');
              if(bolts.length>before){const b=bolts[bolts.length-1];b.style='toxicSpit';b.col=C.y;b.accentCol=C.g;b.scale=1.1}
            }else f.fireShotCD=.08/tuneScale('fireRate')
          }
          if(!solution)f.fireBurstShots=0
        }
      }
    }

    this.ambientSpawnT=Math.max(0,this.ambientSpawnT-dt);
    const current=fighters.filter(f=>!f.dead&&!f.dying&&f.hiveNest).length;
    const q=this.hiveZoneProgress();
    let desired=0,spawnGap=.35;
    if(this.inboundAngered&&(this.state==='approach'||this.state==='doorApproach')){
      // A broken inbound mask is a near-certain-death state. Keep many nest-only
      // attack passes cycling, but their route tuning holds them at readable depth.
      desired=Math.round(17+q*7);spawnGap=.055+Math.random()*.075
    }else if(this.hostile&&this.state==='observationRun'){
      // Post-regulator frenzy should be dangerous but not a solid wall of point-
      // blank attackers. Keep activity visible at mixed depths and let projectiles
      // do much of the pressure.
      const influence=clamp(1-this.coreDistance()/this.zoneOuter,0,1);
      desired=this.safeZone?0:Math.round(3+influence*5);spawnGap=.34+(1-influence)*.34+Math.random()*.22
    }else if(this.hostile){desired=8;spawnGap=.24+Math.random()*.24}
    else if(this.zoneActive){desired=Math.round(6+q*7);spawnGap=Math.max(.18,.44-q*.22)+Math.random()*.20}
    if(current<desired&&this.ambientSpawnT<=0){
      this.spawnBug(this.hostile,{ambientRun:!this.hostile,delay:0});
      // Keep purposeful attack-style crossings coming. The pheromone changes only
      // whether those passes may fire, not their arcade flight choreography.
      this.ambientSpawnT=spawnGap
    }
    for(let i=fighters.length-1;i>=0;i--)if(fighters[i].dead&&!fighters[i].dying)fighters.splice(i,1)
  },
  coreMeshWorld(local){
    if(!this.core)return null;
    const q=rotate([local[0]*this.core.s*(this.core.mx||1),local[1]*this.core.s*(this.core.my||1),local[2]*this.core.s*(this.core.mz||1)],this.core.rot||[0,0,0]);
    return[this.core.x+q[0],this.core.y+q[1],this.core.z+q[2]]
  },
  ensureHiveSurfaceMouths(){
    if(this.surfaceMouthSeeded||!this.core?.mesh?.faces?.length)return;
    const mesh=this.core.mesh,cp=proj([this.core.x,this.core.y,this.core.z])||{x:W*.5,y:viewH*.48},candidates=[];
    for(let fi=0;fi<mesh.faces.length;fi++){
      const face=mesh.faces[fi];if(!face||face.length<3)continue;
      let lx=0,ly=0,lz=0;for(const id of face){const v=mesh.v[id];lx+=v[0];ly+=v[1];lz+=v[2]}
      lx/=face.length;ly/=face.length;lz/=face.length;
      const w=this.coreMeshWorld([lx,ly,lz]),q=camPoint(w);if(!q||q[2]<=.2)continue;
      const pp=projectCam(q);if(!pp)continue;
      const sd=Math.hypot(pp.x-cp.x,pp.y-cp.y);
      if(sd>Math.min(W,viewH)*.34)continue;
      candidates.push({off:[w[0]-this.core.x,w[1]-this.core.y,w[2]-this.core.z],p:pp,z:q[2],sd,fi})
    }
    candidates.sort((a,b)=>a.z-b.z||a.sd-b.sd);
    const chosen=[];const minGap=Math.max(17,Math.min(W,viewH)*.025);
    for(const c of candidates){
      if(chosen.some(x=>Math.hypot(x.p.x-c.p.x,x.p.y-c.p.y)<minGap))continue;
      chosen.push(c);if(chosen.length>=18)break
    }
    if(!chosen.length)return;
    // One of many permanent mouths is our route; it is not a special human-style
    // hatch. Pick the most central visible cell and keep the others as ordinary
    // dark openings across the hive surface.
    chosen.sort((a,b)=>a.sd-b.sd);this.doorOffset=[...chosen[0].off];
    this.surfaceMouthOffsets=chosen.map((c,i)=>({off:[...c.off],r:i===0?this.coreMouthRadius:(.46+((c.fi*37)%9)*.055),entry:i===0,col:(c.fi&1)?C.y:C.o}));
    this.surfaceMouthSeeded=true
  },
  hiveMouthWorldPoint(mouth,localX,localY,depth=0){
    if(!this.core||!mouth)return null;
    const c=[this.core.x+mouth.off[0],this.core.y+mouth.off[1],this.core.z+mouth.off[2]];
    const off=asteroidField.cameraVectorToWorld([localX,localY,depth]);
    return[c[0]+off[0],c[1]+off[1],c[2]+off[2]]
  },
  drawHiveSurfaceMouths(){
    if(!this.core)return;this.ensureHiveSurfaceMouths();
    for(const mouth of this.surfaceMouthOffsets){
      if(mouth.entry&&this.state==='doorApproach')continue;
      const c=[this.core.x+mouth.off[0],this.core.y+mouth.off[1],this.core.z+mouth.off[2]],q=camPoint(c);if(!q||q[2]<=.2||q[2]>260)continue;
      const ring=[];for(let i=0;i<6;i++){const a=Math.PI/6+i*Math.PI/3,w=this.hiveMouthWorldPoint(mouth,Math.cos(a)*mouth.r,Math.sin(a)*mouth.r,0);ring.push(w?proj(w):null)}
      if(!ring.every(Boolean))continue;
      fillScreenPoly(ring.map(p=>[p.x,p.y]));
      for(let i=0;i<6;i++){const a=ring[i],b=ring[(i+1)%6];line(a.x,a.y,b.x,b.y,mouth.col,1,.90)}
      const inner=[];for(let i=0;i<6;i++){const a=Math.PI/6+i*Math.PI/3,w=this.hiveMouthWorldPoint(mouth,Math.cos(a)*mouth.r*.62,Math.sin(a)*mouth.r*.62,.16);inner.push(w?proj(w):null)}
      if(inner.every(Boolean))for(let i=0;i<6;i++)line(inner[i].x,inner[i].y,inner[(i+1)%6].x,inner[(i+1)%6].y,mouth.col,1,.54)
    }
  },
  chooseDoorSurfaceOffset(){
    this.ensureHiveSurfaceMouths();
    if(this.doorOffset)return[...this.doorOffset];
    if(!this.core)return[0,0,-27];
    return asteroidField.cameraVectorToWorld([0,0,-this.core.s*.72])
  },
  doorCentre(){
    if(!this.core)return null;
    const off=this.doorOffset||[0,0,-(this.core?.s||38)*.72];
    return[this.core.x+off[0],this.core.y+off[1],this.core.z+off[2]]
  },
  entryLaneClear(){
    if(!this.core)return false;
    if(!this.doorOffset)this.doorOffset=this.chooseDoorSurfaceOffset();
    const door=this.doorCentre();if(!door)return false;
    const dq=camPoint(door),dd=v3dot(dq,dq);if(dd<.001)return true;
    for(const b of this.brood){
      if(!b||b.dead||b.awaitingRecycle)continue;
      const q=camPoint([b.x,b.y,b.z]);if(!q||q[2]<=.3||q[2]>dq[2]+12)continue;
      const t=clamp(v3dot(q,dq)/dd,0,1);
      if(t<=.05||t>=1.08)continue;
      const px=dq[0]*t,py=dq[1]*t,pz=dq[2]*t;
      const clearance=6.0+b.s*1.25;
      if(Math.hypot(q[0]-px,q[1]-py,q[2]-pz)<clearance)return false
    }
    return true
  },
  lockHiveDoorBasis(){
    if(!this.core)return false;
    if(!this.doorOffset)this.doorOffset=this.chooseDoorSurfaceOffset();
    const door=this.doorCentre();if(!door)return false;
    // The mouth is part of the fixed hive. Its inward direction is radial toward
    // Hive L's body; unlike the old implementation this basis does NOT swivel to
    // face the player as they steer around the brood field.
    this.doorForward=v3norm([this.core.x-door[0],this.core.y-door[1],this.core.z-door[2]]);
    let seed=asteroidField.cameraVectorToWorld([1,0,0]);
    seed=v3sub(seed,v3scale(this.doorForward,v3dot(seed,this.doorForward)));
    if(v3len(seed)<.05)seed=v3cross([0,1,0],this.doorForward);
    this.doorRight=v3norm(seed);
    this.doorUp=v3norm(v3cross(this.doorForward,this.doorRight));
    return true
  },
  hiveClearanceRadius(){
    if(!this.core?.mesh?.v?.length)return(this.core?.s||38)+7;
    let r=0;
    for(const q of this.core.mesh.v)r=Math.max(r,Math.hypot(q[0],q[1],q[2]));
    return r*this.core.s+7
  },
  hiveStagingPoint(distance=this.dockStageDistance||58){
    const d=this.doorCentre();if(!d||!this.doorForward)return null;
    return v3sub(d,v3scale(this.doorForward,distance))
  },
  buildHiveDockRoute(){
    if(!this.core||!this.doorForward)return false;
    const centre=[this.core.x,this.core.y,this.core.z],protectedRadius=this.hiveClearanceRadius();
    let stageDistance=Math.max(52,protectedRadius*.76),stage=this.hiveStagingPoint(stageDistance);
    for(let i=0;i<7&&stage&&v3len(v3sub(stage,centre))<protectedRadius+11;i++){
      stageDistance+=9;stage=this.hiveStagingPoint(stageDistance)
    }
    this.dockStageDistance=stageDistance;
    stage=this.hiveStagingPoint(stageDistance);if(!stage)return false;
    const route=planLargeObjectApproach([0,0,0],centre,stage,protectedRadius,this.doorUp);
    this.dockRoute=route.map(p=>v3sub(p,centre));
    this.dockRouteLeg=0;this.dockState='route';return true
  },
  dockTurnStep(angle,dt,maxRate=1.35){
    const wanted=Math.min(maxRate,Math.max(.16,angle*3.0));
    const follow=1-Math.exp(-dt*5.0);
    this.dockTurnRate=lerp(this.dockTurnRate||0,wanted,follow);
    if(angle<.035)this.dockTurnRate=Math.min(this.dockTurnRate,Math.max(.10,angle*4));
    return Math.min(angle,Math.max(0,this.dockTurnRate)*dt)
  },
  faceHiveDirection(direction,dt,maxRate=1.35){
    ensureSpaceOrientation();
    const desired=v3norm(direction);if(v3len(desired)<.0001)return 0;
    const angle=Math.acos(clamp(v3dot(spaceForward,desired),-1,1));
    if(angle>.0025){
      let axis=v3cross(spaceForward,desired);
      if(v3len(axis)<.001)axis=this.doorUp||spaceUp;
      axis=v3norm(axis);
      const turn=this.dockTurnStep(angle,dt,maxRate);
      spaceForward=rotateAroundAxis(spaceForward,axis,turn);
      spaceRight=rotateAroundAxis(spaceRight,axis,turn);
      spaceUp=rotateAroundAxis(spaceUp,axis,turn);
      orthonormaliseSpaceOrientation();syncEulerFromSpaceOrientation()
    }else this.dockTurnRate*=Math.exp(-dt*7);
    viewRoll=lerp(viewRoll,0,clamp(dt*4.8,0,1));
    return angle
  },
  shiftHiveDockScene(delta,dt=0){
    if(this.core){
      this.core.x-=delta[0];this.core.y-=delta[1];this.core.z-=delta[2]
    }
    // During the short docking manoeuvre the ordinary asteroid-style brood
    // director is paused. Existing eggs remain the same physical objects, drifting
    // gently while the player moves through them.
    for(const b of this.brood){
      if(!b||b.dead||b.awaitingRecycle)continue;
      b.x+=(b.vx||0)*dt*.32-delta[0];
      b.y+=(b.vy||0)*dt*.32-delta[1];
      b.z+=(b.vz||0)*dt*.32-delta[2];
      if(b.rot&&b.spin){b.rot[0]+=b.spin[0]*dt;b.rot[1]+=b.spin[1]*dt;b.rot[2]+=b.spin[2]*dt}
    }
  },
  nudgeBroodFromDockLane(dt,target,width=9.5){
    if(!target)return;
    const dd=v3dot(target,target);if(dd<.01)return;
    for(const b of this.brood){
      if(!b||b.dead||b.awaitingRecycle)continue;
      const p=[b.x,b.y,b.z],t=clamp(v3dot(p,target)/dd,0,1);
      if(t<.025||t>.995)continue;
      const closest=v3scale(target,t),away=v3sub(p,closest);
      let dist=v3len(away),clear=width+b.s*1.20;
      if(dist>=clear)continue;
      let dir=dist>.05?v3scale(away,1/dist):(this.doorRight||[1,0,0]);
      // Smoothly bias the brood material sideways instead of teleporting it. Also
      // remove most inward radial velocity so an egg cannot immediately drift back
      // across the protected autopilot corridor.
      const need=clear-dist,push=Math.min(need,(2.2+need*1.65)*dt);
      b.x+=dir[0]*push;b.y+=dir[1]*push;b.z+=dir[2]*push;
      const rv=(b.vx||0)*dir[0]+(b.vy||0)*dir[1]+(b.vz||0)*dir[2];
      if(rv<0){b.vx-=dir[0]*rv*.80;b.vy-=dir[1]*rv*.80;b.vz-=dir[2]*rv*.80}
    }
  },
  dockLaneClear(target,width=7.3){
    if(!target)return true;
    const dd=v3dot(target,target);if(dd<.01)return true;
    for(const b of this.brood){
      if(!b||b.dead||b.awaitingRecycle)continue;
      const p=[b.x,b.y,b.z],t=clamp(v3dot(p,target)/dd,0,1);
      if(t<.035||t>.985)continue;
      const closest=v3scale(target,t);
      if(v3len(v3sub(p,closest))<width+b.s*1.05)return false
    }
    return true
  },
  beginDoorApproach(){
    if(this.state==='doorApproach'||!this.core)return;
    this.doorOffset=this.chooseDoorSurfaceOffset();
    if(!this.lockHiveDoorBasis()||!this.buildHiveDockRoute())return;
    this.state='doorApproach';this.doorT=0;this.doorOpen=1;this.dockTurnRate=0;
    inputX=inputY=aimX=aimY=0;spaceYawVel=spacePitchVel=0;laserBurstRemaining=0;endLaserTrigger();
    resetSpaceMotion();
    audio.playVoice('xenoCoreEntry',{once:false,priority:true});
    say('HIVE ENTRY AUTOPILOT',.65)
  },
  updateDoorApproach(dt){
    inputX=inputY=aimX=aimY=0;spaceYawVel=spacePitchVel=0;
    // Peaceful traffic can remain visible, but the final scripted entry is never
    // allowed to create the player's hostility state. Egg collision is therefore
    // prevented geometrically here rather than being tested after the fact.
    if(this.zoneActive)this.updateBugs(dt);
    if(this.inboundAngered)this.updateChaosVolley(dt);
    updateBoltsOnly(dt);
    if(!this.core){this.beginCore();return}

    if(this.dockState==='route'){
      let centre=[this.core.x,this.core.y,this.core.z],off=this.dockRoute[this.dockRouteLeg];
      if(!off)this.dockState='align';
      else{
        let target=v3add(centre,off),dist=v3len(target);
        const angle=this.faceHiveDirection(target,dt,1.35);
        this.nudgeBroodFromDockLane(dt,target,10.5);
        if(angle>.16)return;
        // Never ram an egg while autopilot owns the craft. If the route is briefly
        // occupied, hold the line for a moment while the subtle brood bias clears it.
        if(!this.dockLaneClear(target,8.1))return;
        const speed=dist>55?30:lerp(12,24,clamp(dist/55,0,1));
        const step=Math.min(dist,speed*dt),delta=dist>.0001?v3scale(target,step/dist):[0,0,0];
        this.shiftHiveDockScene(delta,dt);
        if(dist<=1.15||step>=dist-.02){
          this.dockRouteLeg++;
          if(this.dockRouteLeg>=this.dockRoute.length)this.dockState='align'
        }
        return
      }
    }

    if(this.dockState==='align'){
      const angle=this.faceHiveDirection(this.doorForward,dt,1.24);
      const stageToDoor=this.doorCentre();
      this.nudgeBroodFromDockLane(dt,stageToDoor,11.0);
      if(angle>.006)return;
      this.dockState='final'
    }

    if(this.dockState==='final'){
      const door=this.doorCentre();if(!door)return;
      this.nudgeBroodFromDockLane(dt,door,12.0);
      if(!this.dockLaneClear(door,9.0))return;
      // Like the mine base, the final leg is straight through the already-fixed
      // doorway after staging and alignment. The hive itself never slides sideways
      // to make the entry convenient.
      const forwardDist=Math.max(0,v3dot(door,this.doorForward)-.70);
      const parallel=v3scale(this.doorForward,v3dot(door,this.doorForward));
      const lateral=v3sub(door,parallel),latLen=v3len(lateral);
      const latStep=Math.min(latLen,2.8*dt),latDelta=latLen>.0001?v3scale(lateral,latStep/latLen):[0,0,0];
      const step=Math.min(forwardDist,16.5*dt);
      const delta=v3add(v3scale(this.doorForward,step),latDelta);
      this.shiftHiveDockScene(delta,dt);
      const now=this.doorCentre(),q=now?camPoint(now):null;
      if(q&&q[2]<=.88&&Math.hypot(q[0],q[1])<.48)this.beginCore()
    }
  },
  hiveDoorWorldPoint(localX,localY,depth=0){
    const c=this.doorCentre();if(!c)return null;
    if(this.doorRight&&this.doorUp&&this.doorForward){
      return[
        c[0]+this.doorRight[0]*localX+this.doorUp[0]*localY+this.doorForward[0]*depth,
        c[1]+this.doorRight[1]*localX+this.doorUp[1]*localY+this.doorForward[1]*depth,
        c[2]+this.doorRight[2]*localX+this.doorUp[2]*localY+this.doorForward[2]*depth
      ]
    }
    const off=asteroidField.cameraVectorToWorld([localX,localY,depth]);
    return[c[0]+off[0],c[1]+off[1],c[2]+off[2]]
  },
  throatRadiusAt(distance){
    return lerp(this.coreMouthRadius,this.coreRadius,ease(clamp(distance/this.coreMouthThroat,0,1)))
  },
  coreRadiusAt(z){
    let inward=this.coreMouthThroat;
    if(this.state==='coreInbound')inward=Math.max(0,this.corridorTravel+z);
    else if(this.state==='coreEscape'||this.state==='coreExit'){
      const remaining=Math.max(0,this.coreLength-this.corridorTravel);
      inward=Math.max(0,remaining-z)
    }
    return this.throatRadiusAt(inward)
  },
  drawHiveTunnelPreview(portal){
    if(!portal||portal.some(p=>!p))return;
    // The exterior mouth and the interior tunnel now share one literal throat.
    // Only the first throat/first bend is rendered from outside, through the same
    // aperture masks used by the live interior.
    const startDepth=this.coreMouthThickness,far=46,step=4.6,secs=[];
    for(let z=startDepth;z<far;z+=step)secs.push(z);secs.push(far);
    const rings=secs.map(z=>{
      const r=this.throatRadiusAt(z),c=this.corridorCenter(z);
      return Array.from({length:6},(_,i)=>{
        const a=Math.PI/6+i*Math.PI/3;
        const w=this.hiveDoorWorldPoint(c.x+Math.cos(a)*r,c.y+Math.sin(a)*r,z);
        return w?proj(w):null
      })
    });
    ctx.save();ctx.beginPath();ctx.moveTo(portal[0].x,portal[0].y);for(let i=1;i<portal.length;i++)ctx.lineTo(portal[i].x,portal[i].y);ctx.closePath();ctx.clip();
    const last=rings[rings.length-1];
    if(last&&last.every(Boolean))for(let i=0;i<6;i++){const a=last[i],b=last[(i+1)%6];line(a.x,a.y,b.x,b.y,(i&1)?C.y:C.o,.85,.64)}
    for(let j=rings.length-2;j>=0;j--){
      const ring=rings[j],next=rings[j+1];if(!ring.every(Boolean)||!next.every(Boolean))continue;
      this.maskOutsideCorePortal(ring);
      for(let i=0;i<6;i++)line(ring[i].x,ring[i].y,next[i].x,next[i].y,C.o,.85,.52);
      for(let i=0;i<6;i++){const a=ring[i],b=ring[(i+1)%6];line(a.x,a.y,b.x,b.y,(i&1)?C.y:C.o,.95,.80)}
    }
    ctx.restore()
  },
  drawHiveDoor(){
    if(this.state!=='doorApproach'||!this.core)return;
    const centre=this.doorCentre();if(!centre)return;const q=camPoint(centre);if(q[2]<=.2||q[2]>115)return;
    const r=this.coreMouthRadius,outer=[],inner=[];
    for(let i=0;i<6;i++){
      const a=Math.PI/6+i*Math.PI/3;
      const ow=this.hiveDoorWorldPoint(Math.cos(a)*r,Math.sin(a)*r,0);
      const iw=this.hiveDoorWorldPoint(Math.cos(a)*r*.94,Math.sin(a)*r*.94,this.coreMouthThickness);
      outer.push(ow?proj(ow):null);inner.push(iw?proj(iw):null)
    }
    if(!outer.every(Boolean)||!inner.every(Boolean))return;
    // Physical biological mouth: a short, solid-walled hex throat. There is a real
    // surface plane and an inner lip, not a single decorative ring.
    fillScreenPoly(outer.map(p=>[p.x,p.y]));
    this.drawHiveTunnelPreview(inner);
    ctx.save();ctx.fillStyle='#000';ctx.globalAlpha=1;
    for(let i=0;i<6;i++){
      const j=(i+1)%6;ctx.beginPath();ctx.moveTo(outer[i].x,outer[i].y);ctx.lineTo(outer[j].x,outer[j].y);ctx.lineTo(inner[j].x,inner[j].y);ctx.lineTo(inner[i].x,inner[i].y);ctx.closePath();ctx.fill()
    }
    ctx.restore();
    for(let i=0;i<6;i++){
      const j=(i+1)%6,col=(i&1)?C.y:C.o;
      line(outer[i].x,outer[i].y,outer[j].x,outer[j].y,col,1.15,.98);
      line(inner[i].x,inner[i].y,inner[j].x,inner[j].y,col,1.0,.86);
      line(outer[i].x,outer[i].y,inner[i].x,inner[i].y,col,.95,.70)
    }
  },
  beginCore(){
    this.state='coreInbound';phase='xenoCore';mode='play';phaseT=modeT=0;this.corridorTravel=0;this.hostile=!!this.inboundAngered;this.coreImpactCD=0;
    fighters.length=0;bolts.length=0;this.crossfire.length=0;this.brood.length=0;this.core=null;this.nav=null;
    spaceOrientationReady=false;spaceYawVel=spacePitchVel=0;viewYaw=viewPitch=viewRoll=0;inputX=inputY=aimX=aimY=0;shipX=shipY=0;
    this.coreObstacles=[
      {d:92,a:-2.35,openR:4.55},{d:166,a:.55,openR:4.70},{d:248,a:2.45,openR:4.45},
      {d:332,a:-.75,openR:4.65},{d:418,a:1.65,openR:4.55}
    ];
    this.objective={type:'xenoRegulator',x:0,y:0,z:this.coreLength,s:3.35,mx:1,my:1,mz:1,rot:[0,0,0],col:C.m,mesh:globalThis.AgentXXenoNest?.regulator,hp:14,maxHp:14,hitFx:0,dead:false,dying:0};
    groundTargets.length=0;groundTargets.push(this.objective);
    // Once X commits to the core there is no time for calm music: this is the
    // high-speed hive run. It only slows physically near the regulator chamber.
    audio.music.setMode('violent');audio.playVoice('xenoDestroyRegulator',{once:false,priority:true});
    say('HIVE CORE ENTRY',.7)
  },
  clampCorePoint(x,y,margin=.72){
    // Exact pointy-top regular-hex containment, using the radius of the tunnel at
    // X's actual current longitudinal position. The throat therefore narrows
    // physically around X at entry/exit instead of only changing on screen.
    const r=Math.max(.82,this.coreRadiusAt(0)-margin),apothem=r*Math.cos(Math.PI/6),s60=Math.sin(Math.PI/3);
    const m=Math.max(Math.abs(x),Math.abs(.5*x+s60*y),Math.abs(-.5*x+s60*y));
    if(m<=apothem)return{x,y,clamped:false};
    const k=apothem/Math.max(.0001,m);return{x:x*k,y:y*k,clamped:true}
  },
  updateCoreSteering(dt,magX,magY){
    const wanted=this.clampCorePoint(magX*7.7,-magY*6.55,.78);
    shipX=lerp(shipX,wanted.x,clamp(dt*5.1,0,1));shipY=lerp(shipY,wanted.y,clamp(dt*5.1,0,1));
    const held=this.clampCorePoint(shipX,shipY,.72);shipX=held.x;shipY=held.y;
    viewYaw=lerp(viewYaw,magX*.12,clamp(dt*5.0,0,1));viewPitch=lerp(viewPitch,magY*.105,clamp(dt*5.0,0,1));viewRoll=lerp(viewRoll,-magX*.13,clamp(dt*5.0,0,1))
  },
  corridorCenter(z){
    // The passage is expressed relative to the point X is currently passing.
    // Previously rawCurve(0) was already several units off-centre, so the mouth,
    // player clamp and tunnel were three different spaces. Subtracting the current
    // curve position makes the near tunnel exactly share the mouth/player origin.
    const raw=t=>{const k=t*.0245;return{x:Math.sin(k)*4.7+Math.sin(k*.43+1.1)*2.25,y:Math.cos(k*.69)*3.25+Math.sin(k*.31+.4)*1.75}};
    const a=raw(this.corridorTravel),b=raw(this.corridorTravel+Math.max(0,z));
    const throat=ease(clamp((z-1.5)/20,0,1));
    return{x:(b.x-a.x)*throat,y:(b.y-a.y)*throat}
  },
  obstacleZ(o){
    return this.state==='coreEscape'?(this.coreLength-o.d-this.corridorTravel):(o.d-this.corridorTravel)
  },
  checkCoreObstacles(dt){
    this.coreImpactCD=Math.max(0,this.coreImpactCD-dt);
    for(const o of this.coreObstacles){
      const key=this.state==='coreEscape'?'passedOut':'passedIn';if(o[key])continue;
      const z=this.obstacleZ(o);if(z>1.35||z<-.55)continue;
      o[key]=true;
      const c=this.corridorCenter(1.0),ox=c.x+Math.cos(o.a)*3.45,oy=c.y+Math.sin(o.a)*2.95;
      if(Math.hypot(shipX-ox,shipY-oy)>o.openR&&this.coreImpactCD<=0){
        this.coreImpactCD=.8;damage('HIVE BULKHEAD');shake=Math.max(shake,3.2)
      }
    }
  },
  spawnCoreProjectile(){
    const a=Math.random()*Math.PI*2,z=lerp(28,88,Math.random()),c=this.corridorCenter(z),r=4.2;
    const x=c.x+Math.cos(a)*r,y=c.y+Math.sin(a)*r;
    const before=bolts.length;
    if(spawnBolt(x,y,z,1.0,1.7,.18)&&bolts.length>before){const b=bolts[bolts.length-1];b.style='toxicSpit';b.col=C.y;b.accentCol=C.g;b.scale=1.15}
  },
  spawnCrossfire(){
    if(this.crossfire.length>16)return;
    const a=fighters.filter(f=>!f.dead&&!f.dying&&f.hiveNest&&f.t>=0&&fighterVisible(f,110));
    if(a.length<2)return;
    const from=a[(Math.random()*a.length)|0],to=a[(Math.random()*a.length)|0];if(from===to)return;
    const dx=to.x-from.x,dy=to.y-from.y,dz=to.z-from.z,n=Math.hypot(dx,dy,dz)||1,sp=28+Math.random()*16;
    this.crossfire.push({x:from.x,y:from.y,z:from.z,vx:dx/n*sp,vy:dy/n*sp,vz:dz/n*sp,age:0,dur:Math.min(1.6,n/sp),col:Math.random()<.5?C.y:C.g,target:to,lethal:this.state==='observationRun'&&Math.random()<.34})
  },
  disintegrateHiveBug(f){
    if(!f||f.dead||f.dying)return;
    const p=proj([f.x,f.y,f.z]);f.dead=true;
    if(p)explodeMesh(f,f.mesh,p,f.col||C.y);else SoundFX.explosion()
  },
  updateCrossfire(dt){
    for(const b of this.crossfire){b.x+=b.vx*dt;b.y+=b.vy*dt;b.z+=b.vz*dt;b.age+=dt}
    for(let i=this.crossfire.length-1;i>=0;i--){
      const b=this.crossfire[i];if(b.age<b.dur)continue;
      if(b.lethal&&b.target&&!b.target.dead)this.disintegrateHiveBug(b.target);
      this.crossfire.splice(i,1)
    }
  },
  activeNestProjectileCount(){return bolts.reduce((n,b)=>n+(!b.dead?1:0),0)},
  spawnNestPunishmentBolt(f,{panic=false}={}){
    const cap=panic?54:5;
    if(!f||f.dead||f.dying||this.activeNestProjectileCount()>=cap)return false;
    const x=f.x,y=f.y,z=f.z,dx=shipX-x,dy=shipY-y,dz=-z,d=Math.hypot(dx,dy,dz)||1;
    if(d<7||d>115)return false;
    const speed=panic?(15+Math.random()*7):(10+Math.random()*5),time=Math.max(.32,d/speed);
    const err=panic?(.20+Math.random()*.85):(.55+Math.random()*1.45),a=Math.random()*Math.PI*2;
    const tx=shipX+Math.cos(a)*err,ty=shipY+Math.sin(a)*err*.76,tz=0;
    bolts.push({x,y,z,spawnDistance:d,targetX:tx,targetY:ty,targetZ:tz,hitIntent:err<.72,leadShot:false,
      vx:(tx-x)/time,vy:(ty-y)/time,vz:(tz-z)/time,homing:0,rot:Math.random()*6.28,rotSpeed:4+Math.random()*4,
      dead:false,visibleFor:0,visibleNow:false,age:0,maxLife:time+1.1,style:'toxicSpit',col:C.y,accentCol:C.g,visualScale:1.12});
    return true
  },
  maybeSwarmCollision(dt){
    if(this.state!=='observationRun'||Math.random()>dt*.75)return;
    const a=fighters.filter(f=>!f.dead&&!f.dying&&f.hiveNest&&f.t>=0&&fighterVisible(f,120));
    for(let i=0;i<a.length;i++)for(let j=i+1;j<a.length;j++){
      const p=a[i],q=a[j];if(Math.hypot(p.x-q.x,p.y-q.y,p.z-q.z)>3.0)continue;
      this.disintegrateHiveBug(Math.random()<.5?p:q);return
    }
  },
  updateChaosVolley(dt){
    this.chaosVolleyT=Math.max(0,this.chaosVolleyT-dt);if(this.chaosVolleyT>0)return;
    const candidates=fighters.filter(f=>!f.dead&&!f.dying&&f.hiveNest&&f.t>=0&&(()=>{const q=camPoint([f.x,f.y,f.z]);return q&&q[2]>7&&q[2]<118})());
    if(!candidates.length){this.chaosVolleyT=this.inboundAngered?.06:.18;return}
    if(this.inboundAngered&&(this.state==='approach'||this.state==='doorApproach')){
      // Deliberately overwhelming. Breaking pheromone cover is not an alternate
      // combat route; it is a near-certain-death mistake with visible, shootable fire.
      const count=Math.min(8,Math.max(5,candidates.length));
      for(let i=0;i<count;i++)this.spawnNestPunishmentBolt(candidates[(Math.random()*candidates.length)|0],{panic:true});
      this.chaosVolleyT=.11+Math.random()*.08;return
    }
    const influence=clamp(1-this.coreDistance()/this.zoneOuter,0,1);
    const count=Math.min(candidates.length,1+Math.floor(influence*1.35)+((Math.random()<.18)?1:0));
    for(let i=0;i<count;i++)this.spawnNestPunishmentBolt(candidates[(Math.random()*candidates.length)|0],{panic:false});
    this.chaosVolleyT=.66+(1-influence)*.46+Math.random()*.34
  },
  triggerFrenzy(){
    if(this.state!=='coreInbound')return;
    this.state='coreEscape';this.escapeT=0;this.corridorTravel=0;this.maskActive=false;this.hostile=true;
    groundTargets.length=0;this.objective=null;bolts.length=0;this.spawnT=.12;
    audio.music.setMode('violent');audio.playVoice('xenoSwarmFrenzy',{once:false,priority:true});
    SoundFX.explosion();say('SWARM COHESION LOST · PROCEED TO OBSERVATION',.8)
  },
  prepareExitExterior(){
    if(this.exitBroodLocal.length)return;
    this.exitBroodLocal=[];
    // These are fixed exterior brood cells, seeded once. The same cells are first
    // seen through the exit mouth and then materialised into open space after X
    // crosses it, so there is no preview -> new-scene pop.
    for(let i=0;i<42;i++){
      const t=i/41,z=58+t*1300+Math.random()*42;
      const spread=lerp(.13,.32,t),ang=Math.random()*Math.PI*2;
      const radial=z*(.08+Math.random()*spread);
      this.exitBroodLocal.push({
        x:Math.cos(ang)*radial,
        y:Math.sin(ang)*radial*.72,
        z,s:.90+Math.random()*1.55,mz:.75+Math.random()*1.75,
        col:Math.random()<.48?C.y:C.o,
        rot:[Math.random()*.5-.25,Math.random()*Math.PI*2,Math.random()*.5-.25]
      })
    }
  },
  materializeExitBroodField(){
    this.brood.length=0;this.broodSpawnT=0;
    for(const e of this.exitBroodLocal){
      const q=[e.x,e.y,e.z],w=cameraPointToWorld(q);
      const b=this.makeBrood(w[0],w[1],w[2],e.s,e.mz,[...e.rot]);
      b.col=e.col;b.nestFixed=true;b.vx=b.vy=b.vz=0;b.guidanceLocked=true;b.awaitingRecycle=false;b.offscreenT=0;
      this.brood.push(b)
    }
    // A second halo stays physically around Hive L. It is mostly behind X during
    // the escape, but becomes visible when observation autopilot turns back to the
    // hive. This prevents the nest from becoming a lonely hive with no eggs.
    if(this.core){
      for(let i=0;i<28;i++){
        const a=Math.random()*Math.PI*2,b=(Math.random()-.5)*1.15,r=90+Math.random()*520;
        const rr=r*Math.sqrt(Math.max(.08,1-b*b)),off=[Math.cos(a)*rr,b*r*.78,Math.sin(a)*rr];
        const w=[this.core.x+off[0],this.core.y+off[1],this.core.z+off[2]];
        const egg=this.makeBrood(w[0],w[1],w[2],.9+Math.random()*1.8,.72+Math.random()*1.9,[Math.random()*.45-.225,Math.random()*Math.PI*2,Math.random()*.45-.225]);
        egg.nestFixed=true;egg.vx=egg.vy=egg.vz=0;egg.guidanceLocked=true;egg.awaitingRecycle=false;egg.offscreenT=0;this.brood.push(egg)
      }
    }
  },
  beginCoreExit(){
    if(this.state==='coreExit')return;
    this.state='coreExit';this.coreExitT=0;this.corridorTravel=this.coreLength;this.exitPreviewShift=0;this.prepareExitExterior();
    bolts.length=0;inputX=inputY=aimX=aimY=0;
    say('HIVE MOUTH AHEAD',.55)
  },
  beginObservationRun(){
    this.state='observationRun';phase='xenoNest';mode='play';phaseT=modeT=0;this.hostile=true;this.safeZone=false;this.corridorTravel=0;bolts.length=0;groundTargets.length=0;
    inputX=inputY=aimX=aimY=viewYaw=viewPitch=viewRoll=shipX=shipY=0;spaceYawVel=spacePitchVel=0;spaceOrientationReady=false;ensureSpaceOrientation();resetSpaceMotion();
    // Exit heading points AWAY from the hive. Hive L begins just behind the player;
    // the observation waypoint is a fixed point beyond the same influence radius
    // used on approach, so the player must genuinely clear nest control before proof.
    const hp=cameraPointToWorld([0,0,-72]);
    this.core={type:'xenoHiveCore',x:hp[0],y:hp[1],z:hp[2],s:38,mx:1,my:1,mz:1,rot:[.10,.22,.02],col:C.o,mesh:globalThis.AgentXXenoNest?.core};
    this.surfaceMouthOffsets.length=0;this.surfaceMouthSeeded=false;this.materializeExitBroodField();
    const safeDist=this.zoneOuter+70;
    this.nav=(()=>{const p=cameraPointToWorld([0,0,safeDist]);return{x:p[0],y:p[1],z:p[2],fixed:true,safe:true}})();fighters.length=0;
    // Staggered, deeper nest-only passes: a few close threats, lots of activity at
    // mid/far range, with projectiles making the lane dangerous rather than every
    // xenoform sitting two inches from the camera.
    for(let i=0;i<12;i++)this.spawnBug(true,{delay:i<3?i*.18:(.8+(i-3)*.48)});
    this.spawnT=.2;this.chaosVolleyT=.16;audio.music.setMode('violent');
    // No second leisurely instruction here: the regulator-break message already
    // gave the urgent order. The growing nav diamond now carries the guidance.
    say('PROCEED IMMEDIATELY TO OBSERVATION POINT',.9)
  },
  navDistance(){return this.nav?Math.hypot(this.nav.x-shipX,this.nav.y-shipY,this.nav.z):Infinity},
  beginObservationHold(){
    // First capture the fixed observation point, then autopilot turns the drone
    // around to the actual hive that has remained behind throughout the escape.
    this.state='observationTurn';this.observationTurnT=0;this.observationT=0;this.nav=null;this.safeZone=true;
    fighters.length=0;bolts.length=0;this.crossfire.length=0;inputX=inputY=aimX=aimY=0;spaceYawVel=spacePitchVel=0;viewRoll=0;
    resetSpaceMotion();ensureSpaceOrientation();
    const target=this.core?v3norm([this.core.x-shipX,this.core.y-shipY,this.core.z]):[-spaceForward[0],-spaceForward[1],-spaceForward[2]];
    const startF=[...spaceForward],startR=[...spaceRight],startU=[...spaceUp];
    let axis=v3cross(startF,target),angle=Math.acos(clamp(v3dot(startF,target),-1,1));
    if(v3len(axis)<.001)axis=[...startU];else axis=v3norm(axis);
    this.observationTurnStart={f:startF,r:startR,u:startU};this.observationTurnAxis=axis;this.observationTurnAngle=Math.max(.01,angle);
    say('OBSERVATION POINT REACHED · TURNING TO HIVE',.75)
  },
  buildHiveDestructionChunks(){
    this.hiveChunks.length=0;
    if(!this.core?.mesh?.faces?.length||!this.core?.mesh?.v?.length)return;
    const mesh=this.core.mesh,faces=mesh.faces,verts=mesh.v,centres=[];
    for(let fi=0;fi<faces.length;fi++){
      const f=faces[fi];if(!f?.length){centres.push([0,0,0]);continue}
      let x=0,y=0,z=0;for(const id of f){const v=verts[id];x+=v[0];y+=v[1];z+=v[2]}
      centres.push([x/f.length,y/f.length,z/f.length])
    }
    // Farthest-point seeds give spatially coherent pieces without requiring the
    // authored Hive L mesh to contain pre-cut destruction groups.
    const seedIds=[];
    let first=0,best=-Infinity;
    for(let i=0;i<centres.length;i++){const c=centres[i],d=c[0]*c[0]+c[1]*c[1]+c[2]*c[2];if(d>best){best=d;first=i}}
    seedIds.push(first);
    const wanted=Math.min(10,Math.max(6,Math.round(faces.length/180)));
    while(seedIds.length<wanted){
      let pick=-1,pickD=-1;
      for(let i=0;i<centres.length;i++){
        let md=Infinity;for(const si of seedIds){const a=centres[i],b=centres[si],dx=a[0]-b[0],dy=a[1]-b[1],dz=a[2]-b[2];md=Math.min(md,dx*dx+dy*dy+dz*dz)}
        if(md>pickD){pickD=md;pick=i}
      }
      if(pick<0)break;seedIds.push(pick)
    }
    const groups=Array.from({length:seedIds.length},()=>[]);
    for(let fi=0;fi<faces.length;fi++){
      const c=centres[fi];let bi=0,bd=Infinity;
      for(let k=0;k<seedIds.length;k++){const q=centres[seedIds[k]],dx=c[0]-q[0],dy=c[1]-q[1],dz=c[2]-q[2],d=dx*dx+dy*dy+dz*dz;if(d<bd){bd=d;bi=k}}
      groups[bi].push(fi)
    }
    const corePos=[this.core.x,this.core.y,this.core.z],baseRot=[...(this.core.rot||[0,0,0])];
    groups.forEach((faceIds,gi)=>{
      if(!faceIds.length)return;
      const used=new Set();for(const fi of faceIds)for(const id of faces[fi])used.add(id);
      const ids=[...used];let cx=0,cy=0,cz=0;for(const id of ids){const v=verts[id];cx+=v[0];cy+=v[1];cz+=v[2]}
      cx/=ids.length;cy/=ids.length;cz/=ids.length;const centroid=[cx,cy,cz];
      const map=new Map(),vv=[];ids.forEach((oldId,newId)=>{map.set(oldId,newId);const v=verts[oldId];vv.push([v[0]-cx,v[1]-cy,v[2]-cz])});
      const ff=faceIds.map(fi=>faces[fi].map(id=>map.get(id)));
      // explodeMesh(), used by ordinary ships, disintegrates the mesh's explicit
      // edge list. The first hive-chunk version accidentally supplied e:[], so the
      // chunks simply vanished at their disintegration time. Preserve Hive L's
      // real wire edges that lie wholly inside this spatial chunk. Fracture-boundary
      // edges are intentionally omitted: that makes the torn seam look broken.
      const ee=[];
      for(const edge of (mesh.e||[])){
        if(!edge||edge.length<2||!used.has(edge[0])||!used.has(edge[1]))continue;
        ee.push([map.get(edge[0]),map.get(edge[1])])
      }
      // Safety fallback for a future hive mesh with faces but no explicit edges.
      if(!ee.length){
        const seen=new Set();
        for(const face of ff)for(let ei=0;ei<face.length;ei++){
          const a=face[ei],b=face[(ei+1)%face.length],lo=Math.min(a,b),hi=Math.max(a,b),key=lo+':'+hi;
          if(!seen.has(key)){seen.add(key);ee.push([a,b])}
        }
      }
      const wp=this.coreMeshWorld(centroid)||corePos,away=v3norm(v3sub(wp,corePos));
      const wobble=v3add(v3scale(spaceRight,Math.sin(gi*2.17)*.34),v3scale(spaceUp,Math.cos(gi*1.71)*.28));
      const dir=v3norm(v3add(away,wobble)),speed=10+((gi*37)%9)*1.45;
      const releaseAt=2.95+gi*.34+((gi*23)%5)*.07;
      const accel=1.25+((gi*29)%7)*.18;
      this.hiveChunks.push({mesh:{v:vv,faces:ff,e:ee},x:wp[0],y:wp[1],z:wp[2],s:this.core.s,mx:1,my:1,mz:1,rot:[...baseRot],
        vx:dir[0]*speed,vy:dir[1]*speed,vz:dir[2]*speed,ax:dir[0]*accel,ay:dir[1]*accel,az:dir[2]*accel,
        spin:[.08+((gi*13)%7)*.025,.06+((gi*17)%9)*.021,.07+((gi*19)%8)*.024],
        releaseAt,disintegrateAt:7.35+gi*.17+((gi*11)%4)*.09,released:false,disintegrated:false,flash:0,col:(gi%4===0)?C.y:C.o})
    })
  },
  initialiseHiveDestruction(){
    if(this.destructionInitialized||!this.core)return;
    this.destructionInitialized=true;this.destructionLarvae.length=0;this.destructionShells.length=0;this.destructionImpacts.length=0;
    this.buildHiveDestructionChunks();
    const mesh=this.core.mesh,visible=[];
    for(const b of this.brood){
      if(!b||b.dead||b.awaitingRecycle)continue;
      const q=camPoint([b.x,b.y,b.z]);if(!q||q[2]<=1||q[2]>2700)continue;
      const pp=projectCam(q);if(!pp||pp.x<-30||pp.x>W+30||pp.y<-30||pp.y>viewH+30)continue;
      visible.push({b,q,pp,score:(b.s||1.4)/Math.max(1,q[2])})
    }
    // A handful of the visually nearest eggs hatch real larvae. They are selected
    // by apparent size rather than array order so the player actually sees the
    // biological event instead of a distant particle effect.
    const nearest=[...visible].sort((a,b)=>b.score-a.score),modelCount=Math.min(10,nearest.length);
    const modelEggs=new Set(nearest.slice(0,modelCount).map(x=>x.b));
    const cap=Math.min(84,visible.length);
    for(let i=0;i<cap;i++){
      const b=visible[i].b,start=[b.x,b.y,b.z],model=modelEggs.has(b);
      let target=[this.core.x,this.core.y,this.core.z];
      if(mesh?.v?.length){
        // Use genuine points from Hive L rather than a common centre. This spreads
        // the attack over the nest surface and makes the swarm look as though it is
        // tearing at the structure rather than firing at one target point.
        const vi=(i*83+17+(i%7)*29)%mesh.v.length;target=this.coreMeshWorld(mesh.v[vi])||target
      }
      let chunk=0,best=Infinity;
      for(let ci=0;ci<this.hiveChunks.length;ci++){
        const ch=this.hiveChunks[ci],dx=target[0]-ch.x,dy=target[1]-ch.y,dz=target[2]-ch.z,d=dx*dx+dy*dy+dz*dz;
        if(d<best){best=d;chunk=ci}
      }
      const ch=this.hiveChunks[chunk],targetOffset=ch?[target[0]-ch.x,target[1]-ch.y,target[2]-ch.z]:[0,0,0];
      const side=v3add(v3scale(spaceRight,Math.sin(i*1.91)*12),v3scale(spaceUp,Math.cos(i*1.37)*9));
      const side2=v3add(v3scale(spaceRight,Math.cos(i*.73)*4.5),v3scale(spaceUp,Math.sin(i*.91)*4.0));
      const startT=(i%11)*.055+Math.floor(i/11)*.035,distance=v3len(v3sub(target,start));
      // Close larvae spend their first ~half-second visibly crawling out of the egg
      // before accelerating. Distant larvae remain quicker background movement.
      const dur=model?clamp(distance/(118+((i*17)%38)),2.75,5.15):clamp(distance/(150+((i*31)%65)),2.0,4.9);
      const modelScale=model?clamp(2.45+(visible[i].score*900),2.45,3.6):1;
      this.destructionLarvae.push({
        start,target,targetOffset,startT,dur,col:(i&1)?C.y:C.g,curve:side,curve2:side2,hit:false,chunk,model,modelScale,
        phase:i*.73,attachUntil:startT+dur+(model?.95:.16),nextBite:startT+dur+.18,
        egg:{x:b.x,y:b.y,z:b.z,s:b.s,mx:b.mx||1,my:b.my||1,mz:b.mz||1,rot:[...(b.rot||[0,0,0])],col:b.col||C.o,mesh:b.mesh}
      });
      // Pure vector shell fragments: a few short line segments fly away from each
      // rupturing cell. No coloured fills, sprites or particle blobs.
      for(let k=0;k<3;k++){
        const a=(i*2.11+k*2.094),up=(k-1)*.42,dir=v3norm(v3add(v3scale(spaceRight,Math.cos(a)),v3add(v3scale(spaceUp,Math.sin(a)*.72+up),v3scale(spaceForward,-.12))));
        const sp=2.4+((i+k*7)%6)*.55;
        this.destructionShells.push({p:[...start],v:v3scale(dir,sp),axis:v3norm(v3add(spaceRight,v3scale(spaceUp,(k-1)*.45))),len:.65+b.s*.42,age:-startT,dur:1.5+((i+k)%5)*.18,col:b.col||C.o})
      }
      b.dead=true;b.awaitingRecycle=true;b.vx=b.vy=b.vz=0
    }
  },
  destructionLarvaTarget(l){
    const ch=this.hiveChunks[l.chunk];
    if(ch&&l.targetOffset)return[ch.x+l.targetOffset[0],ch.y+l.targetOffset[1],ch.z+l.targetOffset[2]];
    return l.target
  },
  destructionLarvaPose(l,t){
    const target=this.destructionLarvaTarget(l),raw=clamp((t-l.startT)/Math.max(.01,l.dur),0,1);
    // The first fifth of the flight covers only a tiny fraction of the distance.
    // This makes the close larvae visibly emerge and paddle clear of the shell;
    // only after that do they accelerate hard toward the hive.
    let e;if(raw<.20){const a=raw/.20;e=.055*a*a}else e=.055+.945*ease((raw-.20)/.80);
    const arc=Math.sin(Math.PI*e),arc2=Math.sin(Math.PI*2*e),base=[lerp(l.start[0],target[0],e),lerp(l.start[1],target[1],e),lerp(l.start[2],target[2],e)];
    return{raw,e,target,pos:v3add(base,v3add(v3scale(l.curve,arc),v3scale(l.curve2||[0,0,0],arc2*.45)))}
  },
  updateHiveDestruction(dt){
    this.initialiseHiveDestruction();
    const t=this.detonationT;
    for(const l of this.destructionLarvae){
      if(!l.hit&&t>=l.startT+l.dur){
        l.hit=true;l.attachUntil=Math.max(l.attachUntil,t+(l.model?.95:.14));l.nextBite=t+.16;
        const target=this.destructionLarvaTarget(l),impact={p:[...target],age:0,dur:.34,col:(l.chunk&1)?C.m:C.o,chunk:l.chunk};this.destructionImpacts.push(impact);
        const ch=this.hiveChunks[l.chunk];if(ch)ch.flash=Math.max(ch.flash,.22);
        if(this.destructionSoundTick<=0){SoundFX.hit();this.destructionSoundTick=.13}
      }
      // Close larvae remain attached for a beat, visibly worrying at the chunk.
      // Small repeated line flashes make their physical contact cause the failure,
      // rather than making the nest appear to be struck by invisible weapons.
      if(l.model&&l.hit&&t<l.attachUntil&&t>=l.nextBite){
        const target=this.destructionLarvaTarget(l),ch=this.hiveChunks[l.chunk];
        this.destructionImpacts.push({p:[...target],age:0,dur:.22,col:(l.chunk&1)?C.o:C.m,chunk:l.chunk});
        if(ch)ch.flash=Math.max(ch.flash,.12);l.nextBite=t+.27+((l.chunk%3)*.04)
      }
    }
    this.destructionSoundTick=Math.max(0,this.destructionSoundTick-dt);
    for(const f of this.destructionShells){f.age+=dt;if(f.age<0||f.age>f.dur)continue;f.p[0]+=f.v[0]*dt;f.p[1]+=f.v[1]*dt;f.p[2]+=f.v[2]*dt}
    for(const im of this.destructionImpacts)im.age+=dt;
    for(let i=this.destructionImpacts.length-1;i>=0;i--)if(this.destructionImpacts[i].age>this.destructionImpacts[i].dur)this.destructionImpacts.splice(i,1);
    for(const ch of this.hiveChunks){
      ch.flash=Math.max(0,(ch.flash||0)-dt);
      if(t<ch.releaseAt||ch.disintegrated)continue;
      if(!ch.released){ch.released=true;ch.flash=.34;SoundFX.hit()}
      ch.vx+=(ch.ax||0)*dt;ch.vy+=(ch.ay||0)*dt;ch.vz+=(ch.az||0)*dt;
      ch.x+=ch.vx*dt;ch.y+=ch.vy*dt;ch.z+=ch.vz*dt;
      ch.rot[0]+=ch.spin[0]*dt;ch.rot[1]+=ch.spin[1]*dt;ch.rot[2]+=ch.spin[2]*dt;
      if(t>=(ch.disintegrateAt||8.2)){
        const pp=proj([ch.x,ch.y,ch.z]);
        if(pp)explodeMesh(ch,ch.mesh,pp,ch.col||C.o);
        ch.disintegrated=true
      }
    }
  },
  beginDetonation(){
    this.state='detonation';this.detonationT=0;this.explosionBursts=0;this.coreExploded=false;this.destructionInitialized=false;this.destructionConfirmStarted=false;this.destructionConfirmAt=0;
    this.destructionLarvae.length=0;this.destructionShells.length=0;this.destructionImpacts.length=0;this.hiveChunks.length=0;
    bolts.length=0;fighters.length=0;this.crossfire.length=0;
    say('BROOD RUPTURE · SWARM CONVERGENCE',.8)
  },
  beginDeparture(){
    if(this.state==='departure')return;
    // Confirmation has already played to completion while the camera remained
    // locked on the destroyed nest. Only now clear the scene and perform the
    // canonical forward mission-end zoom.
    this.state='departure';this.departureT=0;this.departureZoomStarted=false;fighters.length=0;bolts.length=0;this.crossfire.length=0;this.brood.length=0;this.core=null;
    inputX=inputY=0;SoundFX.zoom();this.departureZoomStarted=true;
    say('RETURNING TO BASE',.7)
  },
  departureZoomProgress(){
    return ease(clamp(this.departureT/2.55,0,1))
  },
  update(dt){
    if(!this.active)return;
    if(this.state==='approach'){
      const beforeD=this.coreDistance();
      // Keep player control through the nest field. Close to the hive, ease the
      // forward closing rate a little if the biological entry lane is not yet clear;
      // autopilot never commits through a brood cell.
      if(beforeD<420&&!this.doorOffset)this.doorOffset=this.chooseDoorSurfaceOffset();
      if(beforeD<420&&this.doorOffset&&!this.doorForward)this.lockHiveDoorBasis();
      this.moveOuter(dt,OPEN_SPACE_CRUISE);
      const d=this.coreDistance();
      // Brood traffic begins outside the influence zone and grows continuously.
      // Pheromone/xeno behaviour begins only at the inner biological boundary.
      if(d<=this.broodOuter||this.brood.length)this.updateBroodField(dt,{allowHatch:this.zoneActive&&!this.hostile});
      if(!this.zoneActive&&d<=this.zoneOuter)this.activateHiveZone();
      if(this.zoneActive){this.updateBugs(dt);if(this.inboundAngered)this.updateChaosVolley(dt)}
      updateBoltsOnly(dt);
      if(d<185){this.beginDoorApproach();return}
    }else if(this.state==='doorApproach'){
      this.updateDoorApproach(dt);return
    }else if(this.state==='coreInbound'){
      // Fast, winding tunnel run. Only the final regulator chamber eases off so the
      // player has a readable moment to acquire the pulsing target.
      const remain=Math.max(0,this.coreLength-this.corridorTravel);
      const speed=lerp(18,60,ease(clamp((remain-38)/105,0,1)));
      this.corridorTravel+=dt*speed;this.checkCoreObstacles(dt);
      bolts.length=0;
      if(this.objective&&!this.objective.dead){
        this.objective.z=Math.max(38,this.coreLength-this.corridorTravel);const c=this.corridorCenter(this.objective.z);this.objective.x=c.x;this.objective.y=c.y;
        this.objective.rot[0]+=dt*.31;this.objective.rot[1]+=dt*.48;this.objective.rot[2]+=dt*.67
      }
      if(this.objective?.dead)this.triggerFrenzy()
    }else if(this.state==='coreEscape'){
      this.escapeT+=dt;this.corridorTravel+=dt*70.0;this.checkCoreObstacles(dt);
      // The exit is a literal fixed threshold at the end of this same corridor.
      // In the final throat the tunnel narrows and X is gently centred so the
      // player visibly crosses the mouth plane rather than entering a pause state.
      bolts.length=0;
      const exitRemaining=this.coreLength-this.corridorTravel;
      if(exitRemaining<30){
        const pull=ease(clamp((30-exitRemaining)/30,0,1));
        inputX=moveToward(inputX,0,dt*(2+pull*7));inputY=moveToward(inputY,0,dt*(2+pull*7));
        shipX=lerp(shipX,0,clamp(dt*(1.0+pull*4.4),0,1));shipY=lerp(shipY,0,clamp(dt*(1.0+pull*4.4),0,1));
        const held=this.clampCorePoint(shipX,shipY,.34);shipX=held.x;shipY=held.y;
        viewYaw=lerp(viewYaw,0,clamp(dt*(1.4+pull*4),0,1));viewPitch=lerp(viewPitch,0,clamp(dt*(1.4+pull*4),0,1));viewRoll=lerp(viewRoll,0,clamp(dt*(1.8+pull*5),0,1))
      }
      if(exitRemaining<=0){this.beginObservationRun();return}
      if(this.escapeT>10.2){this.corridorTravel=Math.max(this.corridorTravel,this.coreLength-0.01)}
    }else if(this.state==='coreExit'){
      // Legacy fallback only. Normal play now crosses the real threshold directly.
      this.beginObservationRun();return
    }else if(this.state==='observationRun'){
      this.moveOuter(dt,OPEN_SPACE_CRUISE);
      const frenzyOuter=Math.min(this.zoneOuter*.84,1180);
      const insideInfluence=this.coreDistance()<frenzyOuter;
      if(insideInfluence){
        this.safeZone=false;this.updateBugs(dt);this.updateCrossfire(dt);updateBoltsOnly(dt);
        if(Math.random()<dt*3.2)this.spawnCrossfire();
        this.maybeSwarmCollision(dt);this.updateChaosVolley(dt)
      }else if(!this.safeZone){
        // Crossing the influence boundary is meaningful: swarm traffic and hostile
        // fire stop being staged around X. The fixed eggs remain physically behind
        // with the hive, so they are still visible when observation turns us around.
        this.safeZone=true;fighters.length=0;bolts.length=0;this.crossfire.length=0;
        say('CLEAR OF SWARM PRESSURE',.65)
      }
      const nq=this.nav?camPoint([this.nav.x,this.nav.y,this.nav.z]):null;
      if(this.navDistance()<34||(nq&&nq[2]>0&&nq[2]<4.5&&Math.hypot(nq[0],nq[1])<25)){this.beginObservationHold();return}
    }else if(this.state==='observationTurn'){
      this.observationTurnT+=dt;inputX=inputY=aimX=aimY=0;spaceYawVel=spacePitchVel=0;
      const u=ease(clamp(this.observationTurnT/2.25,0,1)),st=this.observationTurnStart,axis=this.observationTurnAxis||spaceUp,ang=(this.observationTurnAngle||Math.PI)*u;
      if(st){spaceForward=rotateAroundAxis(st.f,axis,ang);spaceRight=rotateAroundAxis(st.r,axis,ang);spaceUp=rotateAroundAxis(st.u,axis,ang);orthonormaliseSpaceOrientation();syncEulerFromSpaceOrientation();viewRoll=0}
      if(this.observationTurnT>=2.25){this.state='observationHold';this.observationT=0;this.observationHoldOrientation={f:[...spaceForward],r:[...spaceRight],u:[...spaceUp]};say('HIVE IN VIEW · HOLD',.6)}
    }else if(this.state==='observationHold'){
      this.observationT+=dt;bolts.length=0;inputX=inputY=aimX=aimY=0;spaceYawVel=spacePitchVel=0;
      const hold=this.observationHoldOrientation;if(hold){spaceForward=[...hold.f];spaceRight=[...hold.r];spaceUp=[...hold.u];syncEulerFromSpaceOrientation();viewRoll=0}
      if(this.observationT>1.45){this.beginDetonation();return}
    }else if(this.state==='detonation'){
      this.detonationT+=dt;inputX=inputY=aimX=aimY=0;spaceYawVel=spacePitchVel=0;bolts.length=0;
      const hold=this.observationHoldOrientation;if(hold){spaceForward=[...hold.f];spaceRight=[...hold.r];spaceUp=[...hold.u];syncEulerFromSpaceOrientation();viewRoll=0}
      this.updateHiveDestruction(dt);
      // First finish WATCHING the swarm destroy its own nest. Then keep exactly
      // this observation view on screen while the evidence-confirmation recording
      // plays. The mission-end zoom is forbidden to start until speech is finished.
      if(this.detonationT>9.4&&!this.destructionConfirmStarted){
        this.coreExploded=true;this.destructionConfirmStarted=true;this.destructionConfirmAt=this.detonationT;
        audio.playVoice('xenoHiveDestroyed',{once:false,priority:true});
        say('HIVE DESTRUCTION CONFIRMED · RECORD SECURED',.9)
      }
      if(this.destructionConfirmStarted){
        const speechBusy=!!(audio.voicePlaying||audio.voiceQueue?.length||audio.voiceDelayTimer||audio.objectiveCuePendingOrBusy?.());
        if(!speechBusy&&this.detonationT>this.destructionConfirmAt+.40){this.beginDeparture();return}
      }
    }else if(this.state==='departure'){
      this.departureT+=dt;inputX=moveToward(inputX,0,dt*6);inputY=moveToward(inputY,0,dt*6);
      viewYaw=moveToward(viewYaw,0,dt*3.8);viewPitch=moveToward(viewPitch,0,dt*3.8);viewRoll=moveToward(viewRoll,0,dt*5);
      if(this.departureT>3.05){this.finish(true);return}
    }
  },
  drawFastHiveMesh(obj,mesh,col,alphaScale=1){
    if(!obj||!mesh)return;
    const mx=obj.mx||1,my=obj.my||1,mz=obj.mz||1;
    const world=mesh.v.map(v=>{const q=rotate([v[0]*obj.s*mx,v[1]*obj.s*my,v[2]*obj.s*mz],obj.rot);return[q[0]+obj.x,q[1]+obj.y,q[2]+obj.z]});
    const cam=world.map(camPoint),pts=cam.map(projectCam),faces=mesh.faces||[];
    const depth=camPoint([obj.x,obj.y,obj.z])[2];
    const alpha=clamp(1.12-depth/310,.28,.92)*alphaScale;
    const width=1;
    // Painter-order solid black faces give us hidden-line removal in roughly O(F)
    // work. Do NOT use drawMesh here: that fighter renderer performs segment x
    // triangle visibility tests and turns Hive L into millions of tests per frame.
    const ordered=[];
    for(const face of faces){
      let z=0,ok=true,minx=Infinity,miny=Infinity,maxx=-Infinity,maxy=-Infinity;
      const pp=[];
      for(const id of face){const c=cam[id],p=pts[id];if(!c||c[2]<=.18||!p){ok=false;break}z+=c[2];pp.push(p);minx=Math.min(minx,p.x);maxx=Math.max(maxx,p.x);miny=Math.min(miny,p.y);maxy=Math.max(maxy,p.y)}
      if(!ok)continue;
      // Tiny far-away cell facets add cost but no visible information.
      if(depth>92&&Math.max(maxx-minx,maxy-miny)<.75)continue;
      ordered.push({z:z/face.length,p:pp})
    }
    ordered.sort((a,b)=>b.z-a.z);
    ctx.save();ctx.lineJoin='round';ctx.lineCap='round';
    for(const f of ordered){
      ctx.beginPath();ctx.moveTo(f.p[0].x,f.p[0].y);for(let i=1;i<f.p.length;i++)ctx.lineTo(f.p[i].x,f.p[i].y);ctx.closePath();
      ctx.globalAlpha=1;ctx.fillStyle='#000';ctx.fill();
      ctx.globalAlpha=alpha;ctx.strokeStyle=col;ctx.lineWidth=VECTOR_LINE_WIDTH;ctx.stroke()
    }
    ctx.restore()
  },
  drawHiveCore(obj){
    if(!obj)return;const q=camPoint([obj.x,obj.y,obj.z]);if(q[2]<=.18)return;
    // Always render Hive L itself. The hive is the focal point of the approach, so
    // never substitute an invented far-distance silhouette. drawFastHiveMesh already
    // drops facets that are too small to contribute, preserving the real silhouette
    // while keeping distant rendering inexpensive.
    this.drawFastHiveMesh(obj,obj.mesh,C.o,.95);
    const depth=camPoint([obj.x,obj.y,obj.z])[2];
    if(depth<260)this.drawHiveSurfaceMouths();
    if(this.state==='doorApproach')this.drawHiveDoor()
  },
  appendScene(scene){
    if(!this.active||phase!=='xenoNest')return;
    if(this.state!=='detonation'&&this.core&&!this.coreExploded){const d=camPoint([this.core.x,this.core.y,this.core.z])[2];if(d>.18&&d<3200)scene.push({z:d,draw:()=>this.drawHiveCore(this.core)})}
    const broodFar=(this.state==='observationRun'||this.state==='observationTurn'||this.state==='observationHold')?2600:1150;
    if(this.state!=='detonation')for(const b of this.brood){if(b.dead||b.awaitingRecycle)continue;const d=camPoint([b.x,b.y,b.z])[2];if(d>.18&&d<broodFar)scene.push({z:d,draw:()=>this.drawFastHiveMesh(b,b.mesh,b.col,.76)})}
  },
  corePortalAt(z,radius=null,centerOverride=null){
    const c=centerOverride||this.corridorCenter(z),ring=[];radius=radius??this.coreRadiusAt(z);
    for(let i=0;i<6;i++){
      const a=Math.PI/6+i*Math.PI/3;
      ring.push(proj([c.x+Math.cos(a)*radius,c.y+Math.sin(a)*radius,z]))
    }
    return ring
  },
  maskOutsideCorePortal(p){
    if(!p||p.some(q=>!q))return;
    ctx.save();ctx.fillStyle='#000';ctx.beginPath();ctx.rect(-80,-80,W+160,H+160);ctx.moveTo(p[0].x,p[0].y);
    for(let i=1;i<p.length;i++)ctx.lineTo(p[i].x,p[i].y);
    ctx.closePath();ctx.fill('evenodd');ctx.restore()
  },
  clipCorePortals(portals,drawFn){
    ctx.save();
    for(const p of portals){
      if(!p||p.some(q=>!q))continue;
      ctx.beginPath();ctx.moveTo(p[0].x,p[0].y);
      for(let i=1;i<p.length;i++)ctx.lineTo(p[i].x,p[i].y);
      ctx.closePath();ctx.clip()
    }
    drawFn();ctx.restore()
  },
  coreClipsToDepth(z){
    const near=1.2,exitRemaining=(this.state==='coreEscape')?Math.max(.18,this.coreLength-this.corridorTravel):Infinity,far=Math.min(z,145,exitRemaining),step=13.0,clips=[];
    if(!(far>near))return clips;
    clips.push(this.corePortalAt(near));
    let first=near+((step-((this.corridorTravel+near)%step))%step);if(first<near+.18)first+=step;
    for(let zz=first;zz<far;zz+=step)clips.push(this.corePortalAt(zz));
    const innerObs=[];
    for(const o of this.coreObstacles){
      const oz=this.obstacleZ(o);
      if(oz>near&&oz<far)innerObs.push({z:oz,p:this.coreObstaclePortals(o,oz).inner})
    }
    innerObs.sort((a,b)=>a.z-b.z);
    for(const it of innerObs)clips.push(it.p);
    return clips
  },
  clipCoreToDepth(z,drawFn){
    this.clipCorePortals(this.coreClipsToDepth(z),drawFn)
  },
  coreObstaclePortals(o,z){
    const c=this.corridorCenter(z),outer=[],inner=[];
    const ox=c.x+Math.cos(o.a)*3.45,oy=c.y+Math.sin(o.a)*2.95;
    for(let i=0;i<6;i++){
      const a=Math.PI/6+i*Math.PI/3;
      outer.push(proj([c.x+Math.cos(a)*this.coreRadiusAt(z),c.y+Math.sin(a)*this.coreRadiusAt(z),z]));
      inner.push(proj([ox+Math.cos(a)*o.openR,oy+Math.sin(a)*o.openR,z-.04]))
    }
    return{outer,inner}
  },
  drawCoreObstacle(o,z){
    if(z<.35||z>145)return;
    const {outer,inner}=this.coreObstaclePortals(o,z);
    if(!outer.every(Boolean)||!inner.every(Boolean))return;
    // This is a real partially closed diaphragm, not just a wire overlay. Each
    // outer-to-inner wedge is black-filled first so corridor geometry behind the
    // blocked material is genuinely occluded. Only the offset hex opening remains
    // transparent, making the high-speed dodge gap readable at a glance.
    ctx.save();ctx.globalAlpha=1;ctx.fillStyle='#000';
    for(let i=0;i<6;i++){
      const j=(i+1)%6;
      ctx.beginPath();ctx.moveTo(outer[i].x,outer[i].y);ctx.lineTo(outer[j].x,outer[j].y);
      ctx.lineTo(inner[j].x,inner[j].y);ctx.lineTo(inner[i].x,inner[i].y);ctx.closePath();ctx.fill()
    }
    ctx.restore();
    for(let i=0;i<6;i++){
      const j=(i+1)%6;
      const col=(i&1)?C.y:C.o;
      line(inner[i].x,inner[i].y,inner[j].x,inner[j].y,col,1,.98);
      line(outer[i].x,outer[i].y,outer[j].x,outer[j].y,col,1,.88);
      line(outer[i].x,outer[i].y,inner[i].x,inner[i].y,col,1,.84)
    }
  },
  drawExitExteriorThroughPortal(portal,planeZ){
    if(!portal||portal.some(p=>!p))return;
    this.prepareExitExterior();
    ctx.save();ctx.beginPath();ctx.moveTo(portal[0].x,portal[0].y);for(let i=1;i<portal.length;i++)ctx.lineTo(portal[i].x,portal[i].y);ctx.closePath();ctx.clip();
    ctx.fillStyle='#000';ctx.fillRect(0,0,W,viewH);renderer.drawStars();
    const items=[];
    for(const e of this.exitBroodLocal){const q=[e.x,e.y,planeZ+e.z];if(q[2]<=3)continue;items.push({e,q})}
    items.sort((a,b)=>b.q[2]-a.q[2]);
    for(const {e,q} of items){
      const p=projectCam(q);if(!p)continue;
      const f=Math.min(W,viewH)*1.09,rad=clamp(e.s*f/q[2]*.82,1.2,26),depth=Math.max(1.0,rad*.34*e.mz),front=[],back=[];
      for(let k=0;k<6;k++){const a=Math.PI/6+k*Math.PI/3;front.push({x:p.x+Math.cos(a)*rad,y:p.y+Math.sin(a)*rad});back.push({x:p.x+Math.cos(a)*rad*.82+depth*.26,y:p.y+Math.sin(a)*rad*.82-depth*.15})}
      for(let k=0;k<6;k++){const j=(k+1)%6;line(back[k].x,back[k].y,back[j].x,back[j].y,e.col,.8,.60);line(front[k].x,front[k].y,front[j].x,front[j].y,e.col,1,.86);line(front[k].x,front[k].y,back[k].x,back[k].y,e.col,.8,.58)}
    }
    ctx.restore();ctx.globalAlpha=1
  },
  drawCoreExitAperture(){
    if(this.state!=='coreEscape')return;
    const remaining=this.coreLength-this.corridorTravel;if(remaining>120||remaining<=.16)return;
    const farZ=remaining,nearZ=Math.max(.18,remaining-this.coreMouthThickness),r=this.coreMouthRadius;
    const cFar=this.corridorCenter(farZ),cNear=this.corridorCenter(nearZ);
    const farRing=[],nearRing=[];
    for(let i=0;i<6;i++){
      const a=Math.PI/6+i*Math.PI/3;
      farRing.push(proj([cFar.x+Math.cos(a)*r,cFar.y+Math.sin(a)*r,farZ]));
      nearRing.push(proj([cNear.x+Math.cos(a)*r*1.06,cNear.y+Math.sin(a)*r*1.06,nearZ]))
    }
    if(!farRing.every(Boolean)||!nearRing.every(Boolean))return;
    // Exterior is rendered first through the FAR lip only. The mouth sidewalls are
    // then black-filled between the two lips, producing real wall thickness and an
    // unmistakable plane that X physically crosses.
    this.drawExitExteriorThroughPortal(farRing,farZ);
    ctx.save();ctx.fillStyle='#000';ctx.globalAlpha=1;
    for(let i=0;i<6;i++){
      const j=(i+1)%6;ctx.beginPath();ctx.moveTo(nearRing[i].x,nearRing[i].y);ctx.lineTo(nearRing[j].x,nearRing[j].y);ctx.lineTo(farRing[j].x,farRing[j].y);ctx.lineTo(farRing[i].x,farRing[i].y);ctx.closePath();ctx.fill()
    }
    ctx.restore();
    for(let i=0;i<6;i++){
      const j=(i+1)%6,col=(i&1)?C.y:C.o;
      line(nearRing[i].x,nearRing[i].y,nearRing[j].x,nearRing[j].y,col,1.15,.98);
      line(farRing[i].x,farRing[i].y,farRing[j].x,farRing[j].y,col,1.05,.90);
      line(nearRing[i].x,nearRing[i].y,farRing[i].x,farRing[i].y,col,.95,.72)
    }
  },
  drawCoreCorridor(){
    if(!this.active||phase!=='xenoCore')return;
    const near=1.2,step=13.0;
    const exitRemaining=(this.state==='coreEscape')?Math.max(.18,this.coreLength-this.corridorTravel):Infinity;
    const far=Math.min(145,exitRemaining);
    // Draw the real threshold/exterior FIRST. Nearer tunnel sections are then
    // painted over it and aperture-mask it correctly around bends.
    this.drawCoreExitAperture();
    if(far<=near+.12)return;
    const secs=[{z:near,...this.corridorCenter(near)}];
    let first=near+((step-((this.corridorTravel+near)%step))%step);if(first<near+.18)first+=step;
    for(let z=first;z<far-.18;z+=step){const c=this.corridorCenter(z);secs.push({z,x:c.x,y:c.y})}
    if(secs[secs.length-1].z<far-.08){const c=this.corridorCenter(far);secs.push({z:far,x:c.x,y:c.y})}
    const portals=secs.map(s=>this.corePortalAt(s.z,null,s));
    const obstacles=[];
    for(const o of this.coreObstacles){const z=this.obstacleZ(o);if(z>near&&z<far)obstacles.push({o,z})}
    obstacles.sort((a,b)=>b.z-a.z);
    let obsIndex=0;
    const drawFartherObstacles=minZ=>{while(obsIndex<obstacles.length&&obstacles[obsIndex].z>minZ){this.drawCoreObstacle(obstacles[obsIndex].o,obstacles[obsIndex].z);obsIndex++}};
    const last=secs.length-1,lastP=portals[last];
    if(lastP.every(Boolean))for(let k=0;k<6;k++){const a=lastP[k],b=lastP[(k+1)%6],col=(k&1)?C.y:C.o;line(a.x,a.y,b.x,b.y,col,.95,.78)}
    for(let i=secs.length-2;i>=0;i--){
      const a=secs[i],b=secs[i+1],pa=portals[i],pb=portals[i+1];if(!pa.every(Boolean)||!pb.every(Boolean))continue;
      drawFartherObstacles(a.z);this.maskOutsideCorePortal(pa);
      for(let k=0;k<6;k++)line(pa[k].x,pa[k].y,pb[k].x,pb[k].y,C.o,1.0,.74);
      for(let k=0;k<6;k++){const p=pa[k],q=pa[(k+1)%6],col=(k&1)?C.y:C.o;line(p.x,p.y,q.x,q.y,col,1.0,.90)}
    }
    drawFartherObstacles(-Infinity)
  },
  drawCrossfire(){
    for(const b of this.crossfire){const p=proj([b.x,b.y,b.z]);if(!p)continue;const q=proj([b.x-b.vx*.06,b.y-b.vy*.06,b.z-b.vz*.06]);if(q)line(q.x,q.y,p.x,p.y,b.col,1.2,.88)}
  },
  drawNavMarker(point,label,col=C.y){
    if(!point)return;const q=camPoint([point.x,point.y,point.z]),projected=q[2]>.15?projectCam(q):null;
    const on=!!(projected&&projected.x>=0&&projected.x<=W&&projected.y>=0&&projected.y<=viewH);
    let s=on?10:14;
    if(on&&this.state==='observationRun'&&point===this.nav){
      // Keep the observation marker exactly the same simple diamond, but let its
      // apparent size provide the missing sense of closing distance. It remains
      // tiny across most of the escape and grows strongly only on the final run-in.
      const d=Math.max(1,Math.hypot(q[0],q[1],q[2]));
      s=clamp(10+1700/d,10,46)
    }
    const cue=on?{x:projected.x,y:projected.y}:hudEdgeCue(q,s),x=cue.x,y=cue.y;
    line(x-s,y,x,y-s,col,1.2,.95);line(x,y-s,x+s,y,col,1.2,.95);line(x+s,y,x,y+s,col,1.2,.95);line(x,y+s,x-s,y,col,1.2,.95);
    drawHudMarkerLabel(label,x,y,s,col,'400 11px Consolas,monospace')
  },
  drawHiveDestruction(){
    if(!this.active||this.state!=='detonation'||!this.core)return;
    this.initialiseHiveDestruction();const t=this.detonationT;
    // Keep Hive L coherent long enough for the player to see creatures actually
    // arrive and attack it. The chunk meshes occupy the same original positions
    // when they first take over, so this change is purely a structural tear-away.
    if(t<2.75)this.drawFastHiveMesh(this.core,this.core.mesh,C.o,.96);
    else{
      const chunks=[...this.hiveChunks].sort((a,b)=>camPoint([b.x,b.y,b.z])[2]-camPoint([a.x,a.y,a.z])[2]);
      for(const ch of chunks){if(ch.disintegrated)continue;const col=(ch.flash||0)>0?C.w:ch.col;this.drawFastHiveMesh(ch,ch.mesh,col,.96)}
    }
    // Eggs do not vanish at the start of the cinematic. Each remains a complete
    // wireframe prism until its own rupture time, making egg -> larva explicit.
    for(const l of this.destructionLarvae){
      if(t>=l.startT||!l.egg)continue;
      this.drawFastHiveMesh(l.egg,l.egg.mesh,l.egg.col,.82)
    }
    // Egg shells break into short travelling line fragments. Nothing is filled.
    for(const f of this.destructionShells){
      if(f.age<0||f.age>f.dur)continue;const q=proj(f.p);if(!q)continue;
      const a=clamp(1-f.age/f.dur,0,1),end=[f.p[0]+f.axis[0]*f.len,f.p[1]+f.axis[1]*f.len,f.p[2]+f.axis[2]*f.len],r=proj(end);
      if(r)line(q.x,q.y,r.x,r.y,f.col,.9,a*.88)
    }
    for(const l of this.destructionLarvae){
      if(t<l.startT)continue;
      let pos=null,dir=[0,0,1],attached=false;
      if(!l.hit&&t<l.startT+l.dur){
        const pose=this.destructionLarvaPose(l,t);pos=pose.pos;
        const prev=this.destructionLarvaPose(l,Math.max(l.startT,t-.035));dir=v3norm(v3sub(pos,prev.pos))
      }else if(l.model&&l.hit&&t<l.attachUntil){
        attached=true;const target=this.destructionLarvaTarget(l),ch=this.hiveChunks[l.chunk];
        const wiggle=Math.sin((t-l.startT)*10+l.phase),scrape=Math.cos((t-l.startT)*7.3+l.phase*.7);
        const r=ch?v3norm(v3sub(target,[ch.x,ch.y,ch.z])):spaceRight;
        const tangent=v3norm(v3cross(r,spaceForward));
        pos=v3add(target,v3add(v3scale(tangent,wiggle*.72),v3scale(r,.45+scrape*.20)));dir=v3norm(v3add(v3scale(tangent,wiggle*.35),v3scale(r,-1)))
      }else continue;
      if(!pos)continue;
      if(l.model){
        const mesh=globalThis.AgentXSpaceBugs?.meshes?.larva;if(!mesh)continue;
        const yaw=Math.atan2(dir[0],dir[2]),pitch=-Math.atan2(dir[1],Math.max(.001,Math.hypot(dir[0],dir[2]))),emerge=clamp((t-l.startT)/.60,0,1);
        const obj={x:pos[0],y:pos[1],z:pos[2],s:l.modelScale*(.55+.45*ease(emerge)),mx:1,my:1,mz:1,rot:[pitch,yaw,Math.sin(t*7+l.phase)*(attached?.28:.12)],mesh,bugKind:'larva',bugAnimPhase:l.phase};
        // Draw the animated biological mesh without its normal propulsion rings;
        // the body itself must be what the eye follows during this sequence.
        const animated=(typeof agentXAnimatedBugMesh==='function')?agentXAnimatedBugMesh(obj):mesh;
        drawMesh(obj,animated,l.col)
      }else{
        // Distant larvae are tiny moving organisms, not travelling streaks. A short
        // bent three-segment glyph provides movement/scale without reading as laser fire.
        const p=proj(pos);if(!p)continue;const q=camPoint(pos),r=clamp((q[2]>0?420/q[2]:1.2),1.1,2.8),a=Math.atan2(dir[1],dir[0]);
        const dx=Math.cos(a)*r,dy=-Math.sin(a)*r,nx=-dy*.55,ny=dx*.55;
        line(p.x-dx,p.y-dy,p.x,p.y,l.col,.9,.88);line(p.x,p.y,p.x+dx*.72+nx,p.y+dy*.72+ny,l.col,.9,.88);line(p.x,p.y,p.x+dx*.72-nx,p.y+dy*.72-ny,l.col,.82,.76)
      }
    }
    for(const im of this.destructionImpacts){
      const p=proj(im.p);if(!p)continue;const u=clamp(im.age/im.dur,0,1),r=1.5+u*7,a=1-u,col=u<.28?C.w:im.col;
      for(let k=0;k<4;k++){const ang=k*Math.PI/2+.18;line(p.x+Math.cos(ang)*r*.15,p.y+Math.sin(ang)*r*.15,p.x+Math.cos(ang)*r,p.y+Math.sin(ang)*r,col,.9,a)}
    }
  },
  drawExplosion(){this.drawHiveDestruction()},
  drawOverlay(){
    if(!this.active)return;
    if(this.state==='approach'&&this.core)this.drawNavMarker(this.core,this.coreDistance()<95?'HIVE ENTRY':'HIVE NAV',C.c);
    if(this.state==='observationRun'&&this.nav)this.drawNavMarker(this.nav,'OBSERVATION',C.y);
    this.drawCrossfire();this.drawExplosion()
  }
};


// Reusable fixed-point space recovery controller.
// A combat_recovery stage stays one campaign stage: ordinary fighter combat runs
// first, then the destroyed group yields one recoverable delivery-style package.
// The package is an actual point in the implied world frame. Player movement changes
// its relative coordinates; turning the camera never drags the marker or cargo with it.

