'use strict';
// Shared open-space body integrator. Asteroids and xeno brood cells both use this
// exact movement rule, so turning the drone changes their relative pass geometry
// in precisely the same way instead of maintaining two lookalike implementations.
function advanceArcadeSpaceBody(a,dt,{playerRelative=true}={}){
  const playerVX=playerRelative?spaceMoveX*OPEN_SPACE_CRUISE:0;
  const playerVY=playerRelative?spaceMoveY*OPEN_SPACE_CRUISE:0;
  const playerVZ=playerRelative?spaceMoveZ*OPEN_SPACE_CRUISE:0;
  a.x+=((a.vx||0)-playerVX)*dt;
  a.y+=((a.vy||0)-playerVY)*dt;
  a.z+=((a.vz||0)-playerVZ)*dt;
  if(a.rot&&a.spin){a.rot[0]+=(a.spin[0]||0)*dt;a.rot[1]+=(a.spin[1]||0)*dt;a.rot[2]+=(a.spin[2]||0)*dt}
  return a
}
globalThis.advanceArcadeSpaceBody=advanceArcadeSpaceBody;
class AsteroidFieldController {
  constructor(){
    this.active=false;
    this.state='idle';
    this.goal=0;
    this.difficulty=1;
    this.destroyed=0;
    this.spawnTimer=0;
    this.directorTimer=0;
    this.turnRevealCooldown=0;
    this.dangerCooldown=0;
    this.lastFieldForward=[0,0,1];
    this.completeDelay=0;
    this.exitT=0;
    this.exitStartPitch=0;
    this.exitStartY=0;
    this.ringTilt=-.48;
    this.ringOpening=.62;
    this.dustTravel=0;
    this.courierMode=false;
    this.courierTime=0;
    this.markedTargets=false;
    this.markedLiveCap=0;
    this.spaceBackdrop=false;
    this.ringPlanet={x:-118,y:-13,z:255,r:12.5,spin0:0,ringRadii:[21,25,30,37]};
    this.ringMoons=[];
    this.dust=Array.from({length:260},()=>({
      x:(Math.random()-.5)*175,
      z:14+Math.random()*176,
      off:(Math.random()-.5)*4.6,
      b:.16+Math.random()*.42,
      len:.6+Math.random()*1.8
    }));
  }
  prepare(goal=12,difficulty=1,{markedTargets=false}={}){
    this.active=true;
    this.state='prepared';
    this.goal=goal;
    this.difficulty=clamp(Number(difficulty)||1,1,9);
    this.destroyed=0;
    this.spawnTimer=.04;
    this.directorTimer=.16;
    this.turnRevealCooldown=0;
    this.dangerCooldown=.8;
    this.lastFieldForward=[0,0,1];
    this.completeDelay=0;
    this.exitT=0;
    this.dustTravel=0;
    this.courierMode=false;
    this.courierTime=0;
    this.markedTargets=!!markedTargets;
    // Keep mission hazards visually sparse. The field should read as lots of
    // ordinary rocks with only a few specifically identified hazards at any one
    // time, not as a field where nearly every rock is a quest target.
    this.markedLiveCap=this.markedTargets?clamp(Math.ceil(this.goal/4),2,4):0;
    this.spaceBackdrop=false;
    this.randomizeRingPlanet();

    asteroids.length=0;fighters.length=0;bolts.length=0;
    groundTargets.length=0;hazards.length=0;

    // Compose the actual gameplay field once, at the attitude used after the
    // universal checkpoint transit. It remains completely hidden until hand-off.
    const saved={x:shipX,y:shipY,yaw:viewYaw,pitch:viewPitch,roll:viewRoll};
    shipX=0;shipY=0;viewYaw=0;viewPitch=.035;viewRoll=0;
    this.composeOpeningStream();
    shipX=saved.x;shipY=saved.y;
    viewYaw=saved.yaw;viewPitch=saved.pitch;viewRoll=saved.roll;
  }

  activatePrepared({silentObjective=false}={}){
    if(!this.active)return;
    this.state='active';
    phase='asteroids';mode='play';phaseT=0;modeT=0;eventTimer=999;
    inputX=inputY=aimX=aimY=0;
    surfaceVX=surfaceVY=0;spaceYawVel=spacePitchVel=0;
    shipX=0;shipY=0;viewYaw=0;viewPitch=.035;viewRoll=0;
    resetSpaceMotion();
    this.markFieldHeading();
    this.directorTimer=.16;
    this.dangerCooldown=.8;
    if(!silentObjective){
      if(this.courierMode)say('DELIVERY ROUTE. FOLLOW THE BELT',.85);
      else if(this.markedTargets){
        say(`DESTROY MARKED ASTEROIDS · 0/${this.goal}`,.85);
        audio.playVoice('hazardTargetsIdentified',{once:true,priority:false})
      }else say('DESTROY '+this.goal+' TRACKED ASTEROIDS',.85)
    }
  }

  prepareCourier(duration=12,difficulty=1){
    this.prepare(999,difficulty,{markedTargets:false});
    this.courierMode=true;
    this.courierTime=Math.max(7,Number(duration)||12);
  }
  activatePreparedCourier(){
    if(!this.active)return;
    this.courierMode=true;
    this.activatePrepared();
    courier.beginMineApproach();
  }

  // Kept for direct/debug use. Campaign play uses prepare() before the shared
  // transit and activatePrepared() when that transit ends.
  start(goal=12,difficulty=1){
    this.prepare(goal,difficulty);
    this.activatePrepared()
  }
  stop(){
    this.active=false;this.state='idle';this.courierMode=false;this.courierTime=0;this.markedTargets=false;this.markedLiveCap=0;this.spaceBackdrop=false;asteroids.length=0
  }
  randomizeRingPlanet(){
    const side=Math.random()<.5?-1:1;
    // Two independent angles are required. ringTilt is the position angle of the
    // ring's major axis on screen. ringOpening tips the plane out of edge-on view.
    // Avoid boring near-horizontal orientations and near-edge-on rings.
    const sign=Math.random()<.5?-1:1;
    this.ringTilt=sign*(.46+Math.random()*.32);       // calmer but still clearly diagonal
    this.ringOpening=.34+Math.random()*.22;          // moderate opening, less logo-like
    const z=220+Math.random()*105;
    const r=11.5+Math.random()*6.5;
    const x=side*(58+Math.random()*94);
    const y=-22+Math.random()*44;
    const ringRadii=[1.75,2.2,2.7].map(f=>r*f);
    this.ringPlanet={x,y,z,r,spin0:Math.random()*Math.PI*2,ringRadii};
    // Moons around a ringed planet share the ring/equatorial plane and always
    // sit beyond the outer ring with a visible gap. Two is the absolute maximum.
    const outerRingFactor=Math.max(...ringRadii)/r;
    this.ringMoons=createMoonSystem({ringOuterFactor:outerRingFactor,oneChance:.48,twoChance:.14});
  }
  ringFrame(){
    // u is the visible major axis. q is its perpendicular in screen space.
    // v tips q into depth, making the rings a true 3D ellipse rather than a line.
    const t=this.ringTilt,o=this.ringOpening;
    const u=v3norm([Math.cos(t),Math.sin(t),0]);
    const q=v3norm([-Math.sin(t),Math.cos(t),0]);
    const v=v3norm(v3add(v3scale(q,Math.sin(o)),[0,0,Math.cos(o)]));
    const n=v3norm(v3cross(u,v));
    return{u,v,n};
  }
  ringSpherePoint(lat,lon){
    const c=this.ringPlanet,R=c.r,lo=lon+c.spin0+time*.055,cl=Math.cos(lat),{u,v,n}=this.ringFrame();
    // True latitude/longitude on a sphere whose equator is exactly the ring plane.
    // Longitude slowly rotates, while latitude remains fixed to the planet's axis.
    const equator=v3add(v3scale(u,Math.cos(lo)*R*cl),v3scale(v,Math.sin(lo)*R*cl));
    const axial=v3scale(n,Math.sin(lat)*R);
    const p=v3add(equator,axial);
    return[c.x+p[0],c.y+p[1],c.z+p[2]];
  }
  ringY(x,off=0){return Math.tan(this.ringTilt)*x+off}
  ringMoonCenter(moon){
    const c=this.ringPlanet,{u,v,n}=this.ringFrame();
    const phase=moon.phase+time*moon.speed,d=c.r*moon.orbitFactor;
    const lat=moon.inclination*Math.sin(phase+moon.node),cl=Math.cos(lat);
    const equator=v3add(v3scale(u,Math.cos(phase)*d*cl),v3scale(v,Math.sin(phase)*d*cl));
    const axial=v3scale(n,Math.sin(lat)*d);
    const q=v3add(equator,axial);
    return[c.x+q[0],c.y+q[1],c.z+q[2]]
  }
  drawRingMoon(moon,center,alphaScale=1){
    renderer.drawCelestialSphere(center,this.ringPlanet.r*moon.radiusFactor,[shipX,shipY,0],proj,{
      col:moon.col,tilt:this.ringTilt+moon.axisOffset,spin:moon.spin0+time*moon.spinSpeed,
      lats:[-.78,0,.78],lonCount:5,gridAlpha:.64*alphaScale,limbAlpha:.92*alphaScale,width:.78
    })
  }

  cameraVectorToWorld(local){
    // Camera-local roll must be applied BEFORE pitch/yaw. That makes roll a
    // rotation around the ship's own forward axis instead of a world-Z turn, so
    // banking can never change the nose/travel direction.
    let q=rz(local,viewRoll);
    q=rx(q,viewPitch);
    q=ry(q,viewYaw);
    return q
  }
  cameraPointToWorld(local){
    const q=this.cameraVectorToWorld(local);
    return[shipX+q[0],shipY+q[1],q[2]]
  }
  asteroidVisible(a,margin=90){
    if(!a||a.dead||a.dying)return false;
    const q=camPoint([a.x,a.y,a.z]);
    if(q[2]<=.22)return false;
    const p=projectCam(q);
    if(!p)return false;
    const r=clamp(a.s*p.k*1.1,8,105);
    return p.x>=-margin-r&&p.x<=W+margin+r&&p.y>=-margin-r&&p.y<=viewH+margin+r
  }
  setPrimaryAttackRun(a,initial=false){
    if(initial){
      // Presentation-only ring approach. Keep it distant and non-synchronised.
      const t=3.3+Math.random()*2.4;
      return this.configureRun(a,'far',false,t)
    }
    return this.configureRun(a,Math.random()<.58?'incoming':'far',false)
  }
  recyclePrimary(a){
    if(!a||a.dead||a.dying||a.objective===false||this.state!=='active')return false;
    return this.configureRun(a,'far',false)
  }

  currentFieldForward(){
    return this.cameraVectorToWorld([0,0,1])
  }
  headingAngleFromLastSeed(){
    const f=this.currentFieldForward(),g=this.lastFieldForward||f;
    const dot=clamp(f[0]*g[0]+f[1]*g[1]+f[2]*g[2],-1,1);
    return Math.acos(dot)
  }
  markFieldHeading(){
    this.lastFieldForward=this.currentFieldForward()
  }
  primaryTTC(a){
    if(!a||a.dead||a.dying||a.objective===false||a.awaitingRecycle)return Infinity;
    const rxw=a.x-shipX,ryw=a.y-shipY,rzw=a.z;
    const d=Math.hypot(rxw,ryw,rzw);
    if(d<2)return 0;

    // Relative velocity = asteroid's own motion minus the player's rapidly
    // nose-aligned arcade cruise. This is what actually determines whether a
    // rock is approaching, passing, or being successfully dodged.
    const rvx=(a.vx||0)-spaceMoveX*OPEN_SPACE_CRUISE;
    const rvy=(a.vy||0)-spaceMoveY*OPEN_SPACE_CRUISE;
    const rvz=(a.vz||0)-spaceMoveZ*OPEN_SPACE_CRUISE;
    const closing=-(rxw*rvx+ryw*rvy+rzw*rvz)/Math.max(.001,d);
    if(closing<=1)return Infinity;
    return d/closing
  }
  readableForwardThreat(a,margin=.14){
    if(!a||a.dead||a.dying||a.objective===false||a.awaitingRecycle)return false;
    const q=camPoint([a.x,a.y,a.z]);
    if(q[2]<8||q[2]>430)return false;
    const p=projectCam(q);if(!p)return false;
    const r=clamp(a.s*p.k*1.05,2,110);
    return p.x>-W*margin-r&&p.x<W*(1+margin)+r&&
           p.y>-viewH*margin-r&&p.y<viewH*(1+margin)+r
  }
  threatBands(){
    const out={close:[],incoming:[],far:[],all:[]};
    for(const a of asteroids){
      if(!this.readableForwardThreat(a))continue;
      const t=this.primaryTTC(a);
      out.all.push(a);
      if(t<1.45)out.close.push(a);
      else if(t<2.95)out.incoming.push(a);
      else if(t<8.4)out.far.push(a)
    }
    return out
  }
  chooseRunKind(band,turnReveal=false){
    // Higher-risk contracts create more genuinely dangerous trajectories, while
    // still keeping the majority of the field as readable near-misses/traffic.
    if(band==='close')return'near';
    const r=Math.random(),risk=clamp((this.difficulty-1)*.012,0,.075);
    if(band==='far'){
      if(r<.015+risk*.35)return'collision';
      if(r<.38+risk)return'near';
      return'traffic'
    }
    if(r<.055+risk)return'collision';
    if(r<.78+risk*.65)return'near';
    return'traffic'
  }
  configureRun(a,band='far',turnReveal=false,forcedTTC=null,forcedKind=null,spawnProfile=null){
    if(!a||a.dead||a.dying||a.objective===false)return false;

    // `forcedKind` lets other arcade-space hazards (for example the secure-hub
    // proximity mines) use this exact pass/lock/motion code without inheriting
    // the asteroid director's collision-course probability.
    const kind=forcedKind||this.chooseRunKind(band,turnReveal);
    let ttc;
    if(forcedTTC!=null)ttc=forcedTTC;
    else if(band==='close')ttc=.92+Math.random()*.38;
    else if(band==='incoming')ttc=1.75+Math.random()*.92;
    else ttc=3.25+Math.random()*4.55;

    // Safe traffic is allowed to whip through the field much faster than a
    // genuine collision threat. Visual speed therefore rises without making
    // the dodge window proportionally harder.
    const riskSpeed=1+clamp((this.difficulty-1)*.035,0,.28);
    const speed=(kind==='collision'
      ?(26.0+Math.random()*6.0)
      :(kind==='near'
        ?(30.0+Math.random()*8.0)
        :(39.0+Math.random()*10.0)))*riskSpeed;
    const closure=speed+OPEN_SPACE_CRUISE;
    const normalDepth=clamp(closure*ttc,band==='close'?48:(band==='incoming'?92:125),
                            band==='close'?82:(band==='incoming'?260:410));
    // Specialist fields may need the same configured asteroid pass to begin much
    // farther away than the ordinary 410-unit stream cap. Crossroads uses this so
    // its ONE mine population can occupy the volume around the distant station,
    // rather than adding a static shell or a second station-only population.
    const requestedDepth=Number(spawnProfile?.depth);
    const depth=Number.isFinite(requestedDepth)?Math.max(48,requestedDepth):normalDepth;

    // New-heading close reveals appear toward the peripheral view. That makes
    // them feel like a rock that was already beside the craft, not one spawned
    // directly on the gunsight.
    let localX,localY;
    if(spawnProfile){
      const centreX=Number(spawnProfile.centreX)||0,centreY=Number(spawnProfile.centreY)||0;
      const spreadX=Math.max(0,Number(spawnProfile.spreadX)||0),spreadY=Math.max(0,Number(spawnProfile.spreadY)||0);
      localX=centreX+(Math.random()-.5)*spreadX*2;
      localY=centreY+(Math.random()-.5)*spreadY*2
    }else if(turnReveal&&band==='close'){
      const side=Math.random()<.5?-1:1;
      localX=side*depth*(.19+Math.random()*.09);
      localY=(Math.random()-.5)*depth*.13;
    }else{
      const central=band==='incoming'&&Math.random()<.38;
      const sx=central?.16:.34,sy=central?.11:.22;
      localX=(Math.random()-.5)*depth*sx*2;
      localY=(Math.random()-.5)*depth*sy*2
    }
    const pos=this.cameraPointToWorld([localX,localY,depth]);

    let targetLocal;
    if(kind==='collision'){
      targetLocal=[(Math.random()-.5)*1.55,(Math.random()-.5)*1.25,0]
    }else if(kind==='near'){
      const side=(localX<0?-1:1)||(Math.random()<.5?-1:1);
      const miss=turnReveal&&band==='close'
        ?(6.8+Math.random()*4.2)
        :(band==='incoming'
          ?(2.8+Math.random()*4.0)
          :(4.0+Math.random()*6.0));
      const ySpread=band==='incoming'
        ?(4.5+Math.random()*3.0)
        :(6.5+Math.random()*4.0);
      targetLocal=[side*miss,(Math.random()-.5)*ySpread,0]
    }else{
      const side=localX<0?-1:1;
      targetLocal=[
        side*(9.0+Math.random()*14.0),
        (Math.random()-.5)*(11.0+Math.random()*9.0),
        0
      ]
    }

    const off=this.cameraVectorToWorld(targetLocal);
    const target=[shipX+off[0],shipY+off[1],off[2]];
    const dx=target[0]-pos[0],dy=target[1]-pos[1],dz=target[2]-pos[2];
    const d=Math.max(1,Math.hypot(dx,dy,dz));

    a.x=pos[0];a.y=pos[1];a.z=pos[2];
    a.vx=dx/d*speed;a.vy=dy/d*speed;a.vz=dz/d*speed;
    a.intentX=targetLocal[0];a.intentY=targetLocal[1];
    a.intentSpeed=speed;
    a.intentFollow=kind==='collision'?7.0:(kind==='near'?5.8:4.6);
    // Guidance aims at a fixed world-space pass point. It does not continuously
    // move the goalpost with the player's nose.
    a.aimWorldX=target[0];a.aimWorldY=target[1];a.aimWorldZ=target[2];
    a.guidanceLocked=(ttc<=1.65)||band==='close';
    a.guidanceLockTTC=kind==='collision'?1.75:1.55;
    a.trajectoryKind=kind;
    a.isDanger=false;
    a.offscreenT=0;
    a.holdUntilVisible=!!spawnProfile?.holdUntilVisible;
    a.holdUntilVisibleT=Math.max(0,Number(spawnProfile?.holdUntilVisibleT)||0);
    a.closestD=Infinity;
    a.awaitingRecycle=false;
    a.runBand=band;
    a.recycles=(a.recycles||0)+1;
    return true
  }
  // Shared configured-pass updater. Both normal asteroids and xeno brood
  // prisms call this exact method, so their guided approach, lock-in point and
  // player-relative arcade movement cannot drift into separate implementations.
  advanceConfiguredRunBody(a,dt,{playerRelative=true}={}){
    if(!a||a.dead||a.dying||a.awaitingRecycle)return a;
    if(a.objective!==false&&a.trajectoryKind!=='fragment'&&
       Number.isFinite(a.intentSpeed)&&!a.guidanceLocked){
      const ttc=this.primaryTTC(a);
      if(ttc<=a.guidanceLockTTC){
        a.guidanceLocked=true
      }else{
        const dx=a.aimWorldX-a.x,dy=a.aimWorldY-a.y,dz=a.aimWorldZ-a.z;
        const dd=Math.max(.001,Math.hypot(dx,dy,dz));
        const tvx=dx/dd*a.intentSpeed,tvy=dy/dd*a.intentSpeed,tvz=dz/dd*a.intentSpeed;
        const follow=1-Math.exp(-dt*(a.intentFollow||5.0));
        a.vx=lerp(a.vx,tvx,follow);
        a.vy=lerp(a.vy,tvy,follow);
        a.vz=lerp(a.vz,tvz,follow)
      }
    }
    advanceArcadeSpaceBody(a,dt,{playerRelative});
    return a
  }
  advanceTrackedStreamBody(a,dt,{playerRelative=true,collisionRadius=0,onCollision=null,parkAfterPass=true,sceneDelta=null}={}){
    // Canonical lifecycle for a reusable asteroid-style streaming hazard:
    // guided pass -> motion -> optional scripted-craft scene translation ->
    // closest approach -> visibility tracking -> park after a completed pass.
    // Ordinary asteroids and specialist hazards such as proximity mines use
    // THIS SAME routine. sceneDelta is used only when autopilot, rather than
    // player-relative cruise, owns the craft translation.
    if(!a||a.dead||a.dying||a.awaitingRecycle)return{d:Infinity,parked:!!a?.awaitingRecycle,collision:false};
    this.advanceConfiguredRunBody(a,dt,{playerRelative});
    if(sceneDelta){
      a.x-=sceneDelta[0]||0;a.y-=sceneDelta[1]||0;a.z-=sceneDelta[2]||0
    }
    const dx=a.x-shipX,dy=a.y-shipY,dz=a.z,d=Math.max(.001,Math.hypot(dx,dy,dz));
    a.closestD=Math.min(a.closestD??Infinity,d);
    if(collisionRadius>0&&d<collisionRadius){
      if(typeof onCollision==='function')onCollision(a,d);
      return{d,parked:false,collision:true}
    }
    if(this.asteroidVisible(a,90))a.offscreenT=0;
    else a.offscreenT=(a.offscreenT||0)+dt;
    if(parkAfterPass&&a.offscreenT>.10&&d>38){
      a.isDanger=false;a.awaitingRecycle=true;a.vx=a.vy=a.vz=0;
      return{d,parked:true,collision:false}
    }
    return{d,parked:false,collision:false}
  }

  acquirePrimary(preferSmall=false){
    let candidates=asteroids.filter(a=>
      !a.dead&&!a.dying&&a.objective!==false&&
      (a.awaitingRecycle||!this.asteroidVisible(a,20))
    );
    if(preferSmall)candidates.sort((a,b)=>a.s-b.s);
    if(candidates.length){
      if(this.markedTargets&&this.destroyed<this.goal){
        const liveMarked=asteroids.filter(a=>
          !a.dead&&!a.dying&&!a.awaitingRecycle&&a.missionTarget===true
        ).length;
        const wanted=Math.min(this.markedLiveCap,Math.max(0,this.goal-this.destroyed));
        if(liveMarked<wanted){
          // Prefer recycling an already-identified hazard. If none is waiting, a
          // previously unmarked distant rock can be promoted as its trajectory is
          // resolved by sensors. Never promote something currently in the player's
          // face just to fill the quota.
          const marked=candidates.find(a=>a.missionTarget===true);
          const chosen=marked||candidates[0];
          chosen.missionTarget=true;
          return chosen
        }
      }
      return candidates[0]
    }

    const live=asteroids.filter(a=>!a.dead&&!a.dying&&a.objective!==false).length;
    if(live>=26||this.destroyed>=this.goal)return null;
    const before=asteroids.length;
    this.spawn(false);
    if(asteroids.length===before)return null;
    return asteroids[asteroids.length-1]
  }
  placeThreat(band,turnReveal=false,forcedTTC=null){
    const a=this.acquirePrimary(turnReveal&&band==='close');
    if(!a)return false;
    return this.configureRun(a,band,turnReveal,forcedTTC)
  }

  activeDanger(){
    return asteroids.find(a=>
      !a.dead&&!a.dying&&!a.awaitingRecycle&&a.objective!==false&&
      a.isDanger===true&&this.primaryTTC(a)<3.4
    )||null
  }

  placeDanger(){
    if(this.activeDanger()||this.dangerCooldown>0||this.destroyed>=this.goal)return false;
    const a=this.acquirePrimary(false);
    if(!a)return false;

    // One deliberately readable collision-course rock. It begins far enough out
    // to be seen, then guidance locks before the final dodge window.
    const ttc=2.35+Math.random()*.40;
    const speed=27.0+Math.random()*5.0;
    const closure=speed+OPEN_SPACE_CRUISE;
    const depth=clamp(closure*ttc,115,175);

    // Keep it somewhere in the central half of the view, but not always dead-centre.
    const localX=(Math.random()-.5)*depth*.26;
    const localY=(Math.random()-.5)*depth*.18;
    const pos=this.cameraPointToWorld([localX,localY,depth]);

    // Aim very close to the craft's current path. Once guidance locks, the player
    // can genuinely dodge because this target point no longer follows them.
    const targetLocal=[
      (Math.random()-.5)*.70,
      (Math.random()-.5)*.55,
      0
    ];
    const off=this.cameraVectorToWorld(targetLocal);
    const target=[shipX+off[0],shipY+off[1],off[2]];
    const dx=target[0]-pos[0],dy=target[1]-pos[1],dz=target[2]-pos[2];
    const d=Math.max(1,Math.hypot(dx,dy,dz));

    a.x=pos[0];a.y=pos[1];a.z=pos[2];
    a.vx=dx/d*speed;a.vy=dy/d*speed;a.vz=dz/d*speed;
    a.intentX=targetLocal[0];a.intentY=targetLocal[1];
    a.intentSpeed=speed;
    a.intentFollow=6.8;
    a.aimWorldX=target[0];a.aimWorldY=target[1];a.aimWorldZ=target[2];
    a.guidanceLocked=false;
    a.guidanceLockTTC=1.85;
    a.trajectoryKind='collision';
    a.isDanger=true;
    a.runBand='incoming';
    a.offscreenT=0;a.closestD=Infinity;a.awaitingRecycle=false;
    a.recycles=(a.recycles||0)+1;
    this.dangerCooldown=999;
    return true
  }
  composeOpeningStream(){
    // Build a genuinely busy field at hand-off. Only three objects are in the
    // near-term workload; the remaining seventeen are long-lead visual traffic.
    const primaries=asteroids.filter(a=>!a.dead&&!a.dying&&a.objective!==false);
    const plan=[
      ['close',false,1.22],
      ['incoming',false,2.05],
      ['incoming',false,2.72],
      ['far',false,3.25],
      ['far',false,3.48],
      ['far',false,3.72],
      ['far',false,3.98],
      ['far',false,4.26],
      ['far',false,4.55],
      ['far',false,4.86],
      ['far',false,5.18],
      ['far',false,5.52],
      ['far',false,5.88],
      ['far',false,6.25],
      ['far',false,6.63],
      ['far',false,7.02],
      ['far',false,7.40],
      ['far',false,7.72],
      ['far',false,8.00],
      ['far',false,8.28]
    ];
    while(primaries.length<plan.length&&this.destroyed<this.goal){
      const before=asteroids.length;this.spawn(false);
      if(asteroids.length===before)break;
      primaries.push(asteroids[asteroids.length-1])
    }
    primaries.slice(0,plan.length).forEach((a,i)=>this.configureRun(a,...plan[i]));
    for(const a of primaries.slice(plan.length))a.awaitingRecycle=true;
    this.markFieldHeading();
    this.directorTimer=.12
  }
  composeTurnReveal(){
    const bands=this.threatBands();
    const targetVisible=18;

    // A turn should reveal that the field was already around the player:
    // one close peripheral pass, a couple of developing rocks, then lots of
    // distant traffic. Only the missing layers are created.
    if(bands.close.length===0)this.placeThreat('close',true,1.05+Math.random()*.24);

    let incoming=bands.incoming.length;
    while(incoming<2){
      if(!this.placeThreat('incoming',true,1.75+incoming*.62+Math.random()*.20))break;
      incoming++
    }

    let visible=this.threatBands().all.length;
    let i=0;
    while(visible<targetVisible&&i<20){
      const ttc=3.20+(i%12)*.38+Math.random()*.18;
      if(!this.placeThreat('far',true,Math.min(8.15,ttc)))break;
      visible++;
      i++
    }

    this.markFieldHeading();
    this.turnRevealCooldown=.34;
    this.directorTimer=.10
  }
  updateThreatDirector(dt){
    if(this.state!=='active'||this.destroyed>=this.goal)return;
    this.directorTimer=Math.max(0,this.directorTimer-dt);
    this.turnRevealCooldown=Math.max(0,this.turnRevealCooldown-dt);

    // Real danger is paced independently from visual density. There is normally
    // only one genuine collision-course rock at a time.
    const danger=this.activeDanger();
    if(danger){
      this.dangerCooldown=999
    }else{
      if(this.dangerCooldown>20)this.dangerCooldown=1.15+Math.random()*1.10;
      else this.dangerCooldown=Math.max(0,this.dangerCooldown-dt);

      if(this.dangerCooldown<=0){
        if(this.placeDanger()){
          // Keep the normal field director running too, but don't stack another
          // urgent event on the same frame.
          this.directorTimer=Math.max(this.directorTimer,.10)
        }
      }
    }

    if(this.turnRevealCooldown<=0&&this.headingAngleFromLastSeed()>.48){
      this.composeTurnReveal();
      return
    }

    if(this.directorTimer>0)return;
    let b=this.threatBands();

    // Maintain the genuine gameplay workload separately from visual density.
    // Do not create close collision threats. Incoming additions are staggered.
    if(b.incoming.length<1){
      if(this.placeThreat('incoming',false,2.05+Math.random()*.45)){
        this.directorTimer=.12;
        return
      }
    }
    if(b.incoming.length<2&&b.all.length>12&&Math.random()<.32){
      if(this.placeThreat('incoming',false,2.55+Math.random()*.30)){
        this.directorTimer=.14;
        return
      }
    }

    // Visual field target: 18-22, centred on 20. When badly depleted, add two
    // long-lead rocks per tick so a turn/passing wave does not leave empty sky.
    b=this.threatBands();
    if(b.all.length<18){
      const missing=Math.min(2,18-b.all.length);
      for(let i=0;i<missing;i++){
        this.placeThreat('far',false,3.3+Math.random()*4.7)
      }
      this.directorTimer=.08;
      return
    }

    if(b.all.length<20){
      if(this.placeThreat('far',false,4.0+Math.random()*4.0)){
        this.directorTimer=.12;
        return
      }
    }

    // Allow natural variation up to about 22 rather than mechanically pinning
    // the exact count to twenty every frame.
    if(b.all.length<22&&Math.random()<.22){
      if(this.placeThreat('far',false,5.0+Math.random()*3.0)){
        this.directorTimer=.20;
        return
      }
    }

    this.directorTimer=.12
  }

  makeAsteroid({x,y,z,s,hp,vx,vy,vz,col,objective=true,missionTarget=null,generation=0,sizeClass='fragment'}){
    return {
      type:'asteroid',x,y,z,s,hp,maxHp:hp,hitFx:0,dying:0,dead:false,
      objective,missionTarget,generation,sizeClass,
      rot:[Math.random()*6.28,Math.random()*6.28,Math.random()*6.28],
      spin:[(Math.random()-.5)*.9,(Math.random()-.5)*.9,(Math.random()-.5)*.9],
      vx,vy,vz,
      mx:.72+Math.random()*.60,my:.72+Math.random()*.60,mz:.72+Math.random()*.60,
      col,offscreenT:0,closestD:Infinity,recycles:0,trajectoryKind:'fragment',awaitingRecycle:false,runBand:null,
      aimWorldX:0,aimWorldY:0,aimWorldZ:0,guidanceLocked:true,guidanceLockTTC:0,isDanger:false
    }
  }
  spawn(initial=false){
    if(!this.active||this.state==='exit'||this.destroyed>=this.goal)return;
    const roll=Math.random();
    // Contract risk shifts the mix toward medium/large rocks instead of merely
    // inflating the objective count.
    const largeShift=clamp((this.difficulty-1)*.028,0,.18);
    const smallCut=.36-largeShift*.55,mediumCut=.76-largeShift;
    const sizeClass=roll<smallCut?'small':(roll<mediumCut?'medium':'large');
    const s=sizeClass==='small'
      ? (.58+Math.random()*.28)
      : (sizeClass==='medium'
          ? (1.35+Math.random()*.48)
          : (2.85+Math.random()*1.15));
    const hp=(sizeClass==='small'?2:(sizeClass==='medium'?3:6))+Math.floor((this.difficulty-1)/4);
    const liveMarked=asteroids.filter(x=>
      !x.dead&&!x.dying&&!x.awaitingRecycle&&x.missionTarget===true
    ).length;
    const remaining=Math.max(0,this.goal-this.destroyed);
    const missionTarget=!this.markedTargets||(remaining>0&&liveMarked<Math.min(this.markedLiveCap,remaining));

    const a=this.makeAsteroid({
      x:0,y:0,z:80,s,hp,vx:0,vy:0,vz:0,
      col:Math.random()<.23?C.y:C.g,
      objective:true,missionTarget,generation:0,sizeClass
    });
    this.setPrimaryAttackRun(a,initial);
    asteroids.push(a)
  }
  spawnChildren(parent){
    if(parent.generation>=1||parent.s<1.72)return;
    const count=parent.s>2.45?(3+((Math.random()*3)|0)):(2+((Math.random()*2)|0));
    for(let i=0;i<count;i++){
      const ang=Math.random()*Math.PI*2;
      const childS=Math.max(.42,parent.s*(.22+Math.random()*.18));
      const hp=childS<1.0?1:2;
      const kick=3.5+Math.random()*7.5;
      asteroids.push(this.makeAsteroid({
        x:parent.x+Math.cos(ang)*parent.s*.20,
        y:parent.y+Math.sin(ang)*parent.s*.20,
        z:parent.z+(Math.random()-.5)*parent.s*.45,
        s:childS,hp,
        vx:parent.vx+Math.cos(ang)*kick,
        vy:parent.vy+Math.sin(ang)*kick*.62,
        vz:parent.vz-(1.5+Math.random()*5.5),
        col:parent.col,
        objective:false,missionTarget:false,generation:parent.generation+1,sizeClass:'fragment'
      }))
    }
  }
  hit(a,p){
    if(!a||a.dead||a.dying||this.state!=='active')return;
    a.hp--;a.hitFx=HIT_FX_TOTAL;spark(p.x,p.y,C.c,5);
    if(a.hp<=0){
      // Brief lethal flash, but the rock remains physically in motion until the
      // explosion. At asteroid-field speed a stationary 0.18 s delay is obvious.
      a.dying=.10;
      a.deathPoint={x:p.x,y:p.y};
    }else SoundFX.hit();
  }
  destroy(a){
    if(a.dead)return;
    a.dead=true;
    const p=proj([a.x,a.y,a.z])||a.deathPoint||{x:W*.5,y:viewH*.5};
    explodeMesh(a,asteroidMesh,p,a.col);
    this.spawnChildren(a);

    if(a.objective!==false){
      if(a.isDanger)this.dangerCooldown=1.25+Math.random()*1.20;
      score+=125+Math.round(a.s*60);
      if(this.courierMode){
        // Courier work is navigation, not clearance. Shooting a rock is allowed,
        // but it never turns the delivery into a hidden destroy quota.
        this.directorTimer=0;
      }else{
        const countsForMission=!this.markedTargets||a.missionTarget===true;
        if(countsForMission){
          if(!freezeObjectives)this.destroyed++;
          const label=this.markedTargets?'MARKED ASTEROIDS':'ASTEROIDS';
          say(freezeObjectives?`${label} ${this.destroyed}/${this.goal} · OBJECTIVE FROZEN`:`${label} ${this.destroyed}/${this.goal}`,.34);
          if(!freezeObjectives&&this.destroyed>=this.goal){
            if(campaign.currentMission?.training)completeTutorialObjective('tutorialDestroyFive');
            this.completeDelay=.42
          }else this.directorTimer=0;
        }else this.directorTimer=0;
      }
    }else{
      score+=45+Math.round(a.s*25);
    }
  }
  beginExit(){
    if(this.state==='exit')return;
    this.state='exit';this.exitT=0;this.exitStartPitch=viewPitch;this.exitStartY=shipY;
    mode='asteroidExit';inputX=inputY=aimX=aimY=0;laserBurstRemaining=0;endLaserTrigger();
    if(campaign.currentMission&&campaign.hasMoreStages()){
      say('CLEAR. NEXT OBJECTIVE',.75)
    }else{
      say('CLEAR. BREAKING OUT',.75);
      audio.playVoice('missionComplete',{once:true,priority:true})
    }
  }
  updateBodies(dt,collisions){
    this.dustTravel+=dt*(this.state==='entry'?24:(this.state==='exit'?lerp(14,92,asteroidExitZoomProgress()):18));

    for(const a of asteroids){
      if(a.dead)continue;
      a.hitFx=Math.max(0,(a.hitFx||0)-dt);
      if(a.dying){
        // Lethal hit does not freeze the rock. Coast on the already-committed
        // trajectory for the flash interval, including player-relative cruise,
        // then explode at the rock's actual new screen position.
        advanceArcadeSpaceBody(a,dt,{playerRelative:this.state==='active'});
        a.dying-=dt;
        if(a.dying<=0)this.destroy(a);
        continue;
      }
      if(a.awaitingRecycle)continue;

      if(a.objective!==false&&this.state==='active'){
        // Tracked primaries use the same complete streaming-hazard lifecycle as
        // Crossroads mines: guided pass, player-relative motion, collision check,
        // visibility accounting and parking for later director reuse.
        const wasDanger=!!a.isDanger;
        const res=this.advanceTrackedStreamBody(a,dt,{
          playerRelative:true,
          collisionRadius:collisions?(a.s*1.10+.58):0,
          onCollision:()=>{
            damage('ASTEROID IMPACT');
            if(wasDanger)this.dangerCooldown=1.35+Math.random()*1.20;
            a.dead=true
          }
        });
        if(res.collision)continue;
        if(res.parked){
          if(wasDanger)this.dangerCooldown=1.10+Math.random()*1.15;
          continue
        }
        continue
      }

      // Split fragments and exit-stage bodies are local one-use hazards rather than
      // reusable stream primaries.
      this.advanceConfiguredRunBody(a,dt,{playerRelative:this.state==='active'});
      const dx=a.x-shipX,dy=a.y-shipY,dz=a.z;
      const d=Math.max(.001,Math.hypot(dx,dy,dz));
      a.closestD=Math.min(a.closestD??Infinity,d);

      if(collisions){
        const radius=a.s*1.10;
        if(d<radius+.58){
          damage('ASTEROID IMPACT');
          if(a.isDanger)this.dangerCooldown=1.35+Math.random()*1.20;
          a.dead=true;
          continue
        }
      }

      if(this.asteroidVisible(a,90))a.offscreenT=0;
      else a.offscreenT=(a.offscreenT||0)+dt;

      // Split fragments remain genuine local hazards and are never teleported.
      if(a.objective===false&&(d>185||((a.offscreenT||0)>2.4&&d>70)))a.dead=true;

      if(this.state==='exit'&&d>340)a.dead=true
    }

    for(let i=asteroids.length-1;i>=0;i--)if(asteroids[i].dead)asteroids.splice(i,1)
  }
  update(dt){
    if(!this.active)return;

    if(this.state==='exit'){
      const prevExitT=this.exitT;
      this.exitT+=dt;
      if(prevExitT<ASTEROID_EXIT_PITCH_TIME&&this.exitT>=ASTEROID_EXIT_PITCH_TIME)SoundFX.zoom();
      const pitchT=asteroidExitPitchProgress(),zoomT=asteroidExitZoomProgress();

      // Stage 1: complete the manoeuvre first. No high-speed zoom yet.
      viewPitch=lerp(this.exitStartPitch,EXIT_VERTICAL_PITCH,pitchT);
      viewYaw=moveToward(viewYaw,0,dt*2.4);
      viewRoll=moveToward(viewRoll,0,dt*3.0);
      shipY=lerp(this.exitStartY,7.2,pitchT);
      if(pitchT>=.999){viewPitch=EXIT_VERTICAL_PITCH;viewYaw=0;viewRoll=0}

      // Stage 2: once vertical, hold the attitude and accelerate out of the field.
      if(zoomT>0){
        viewPitch=EXIT_VERTICAL_PITCH;viewYaw=0;viewRoll=0;
        shipY=lerp(7.2,11.5,zoomT)
      }
      this.updateBodies(dt,false);
      if(this.exitT>=ASTEROID_EXIT_PITCH_TIME+ASTEROID_EXIT_ZOOM_TIME){
        this.active=false;this.state='idle';asteroids.length=0;
        campaign.advanceCurrentMissionStage()
      }
      return
    }

    if(this.courierMode){
      // Courier transit is spatial rather than timer-driven. The mine exists in
      // the same asteroid field from the start; the player must actually steer
      // toward its nav marker until the final entrance autopilot can take over.
      courier.updateRoute(dt);
      if(phase!=='asteroids'||mode!=='play')return
    }

    this.completeDelay=Math.max(0,this.completeDelay-dt);
    if(!this.courierMode&&!freezeObjectives&&this.destroyed>=this.goal&&this.completeDelay<=0){
      const stage=campaign.currentStage?.();
      if(campaign.currentMission?.training&&stage?.tutorialStaticCut){
        // Let the objective-complete cue finish cleanly before the static transition.
        if(!audio.objectiveCuePendingOrBusy?.()){
          scenarioFlow.beginSimulatorCut();return
        }
      }else{
        this.beginExit();return
      }
    }

    this.updateThreatDirector(dt);
    this.updateBodies(dt,true)
  }
  drawRingArc(radius,front,col,alpha,width){
    const c=this.ringPlanet,{u,v}=this.ringFrame(),center=[c.x,c.y,c.z],camera=[shipX,shipY,0],toCamera=v3sub(camera,center),steps=220;
    let prev=null,prevFront=false;
    for(let i=0;i<=steps;i++){
      const a=i/steps*Math.PI*2;
      const offset=v3add(v3scale(u,Math.cos(a)*radius),v3scale(v,Math.sin(a)*radius));
      const world=v3add(center,offset),sp=proj(world);
      // The half whose offset points toward the camera is physically in front
      // of the planet. This is independent of view yaw/pitch/roll and prevents
      // the whole ring system being accidentally treated as a rear layer.
      const isFront=v3dot(offset,toCamera)>0;
      if(prev&&sp&&isFront===front&&prevFront===front)line(prev.x,prev.y,sp.x,sp.y,col,width,alpha);
      prev=sp;prevFront=isFront
    }
  }
  drawPlanetGridCurve(gen,steps,col,alpha,width){
    const c=this.ringPlanet,center=[c.x,c.y,c.z],camPos=[shipX,shipY,0];
    let prev=null,prevVis=0,prevSP=null;
    for(let i=0;i<=steps;i++){
      const world=gen(i/steps),normal=v3sub(world,center),vis=v3dot(normal,v3sub(camPos,world)),sp=proj(world);
      if(prev&&sp&&prevSP){
        if(vis>0&&prevVis>0)line(prevSP.x,prevSP.y,sp.x,sp.y,col,width,alpha);
        else if((vis>0)!=(prevVis>0)){
          const k=prevVis/(prevVis-vis);
          let q=[lerp(prev[0],world[0],k),lerp(prev[1],world[1],k),lerp(prev[2],world[2],k)];
          q=v3add(center,v3scale(v3norm(v3sub(q,center)),c.r));
          const qp=proj(q);
          if(qp){if(prevVis>0)line(prevSP.x,prevSP.y,qp.x,qp.y,col,width,alpha);else line(qp.x,qp.y,sp.x,sp.y,col,width,alpha)}
        }
      }
      prev=world;prevVis=vis;prevSP=sp
    }
  }
  drawRingPlanet(alphaScale=1){
    const c=this.ringPlanet,center=[c.x,c.y,c.z],p=proj(center);if(!p)return;
    if(p.x<-W*.22||p.x>W*1.22||p.y<-viewH*.22||p.y>viewH*1.22)return;
    const ringCol=C.y,planetCol=C.g,ringAlpha=.40*alphaScale,ringWidth=.72,radii=c.ringRadii||[c.r*1.75,c.r*2.2,c.r*2.7];
    const camera=[shipX,shipY,0],planetD=v3len(v3sub(center,camera));
    const moonStates=(this.ringMoons||[]).map(m=>{const mc=this.ringMoonCenter(m);return{moon:m,center:mc,d:v3len(v3sub(mc,camera))}}).sort((a,b)=>b.d-a.d);

    // Anything orbiting on the far side goes behind the complete ring/planet system.
    for(const ms of moonStates)if(ms.d>planetD)this.drawRingMoon(ms.moon,ms.center,alphaScale);

    // Rear ring halves first.
    for(const r of radii)this.drawRingArc(r,false,ringCol,ringAlpha,ringWidth);

    // Planet body/limb in a separate colour from the rings.
    const limb=renderer.sphereLimb(center,c.r,[shipX,shipY,0],proj);
    if(limb.length>2){
      ctx.fillStyle='#000';ctx.beginPath();ctx.moveTo(limb[0].x,limb[0].y);
      for(let i=1;i<limb.length;i++)ctx.lineTo(limb[i].x,limb[i].y);
      ctx.closePath();ctx.globalAlpha=alphaScale;ctx.fill();ctx.strokeStyle=planetCol;ctx.globalAlpha=.66*alphaScale;ctx.lineWidth=.98;ctx.stroke();ctx.globalAlpha=1
    }

    // Simpler sphere grid: fewer lines so the globe reads as a planet rather than a logo.
    const lats=[-.92,-.46,0,.46,.92];
    for(const lat of lats)this.drawPlanetGridCurve(u=>{
      const lon=-Math.PI+u*Math.PI*2;
      return this.ringSpherePoint(lat,lon)
    },170,planetCol,.40*alphaScale,.72);

    // Fewer longitudes, slowly rotating.
    for(let j=0;j<6;j++){
      const lon=-Math.PI+j*Math.PI/3;
      this.drawPlanetGridCurve(u=>{
        const lat=-Math.PI*.5+u*Math.PI;
        return this.ringSpherePoint(lat,lon)
      },150,planetCol,.46*alphaScale,.76)
    }

    // Near-side ring halves last: these visibly cross the globe. Depth comes from occlusion only.
    for(const r of radii)this.drawRingArc(r,true,ringCol,ringAlpha,ringWidth);

    // Near-side moons are beyond the rings and therefore occlude the complete system.
    for(const ms of moonStates)if(ms.d<=planetD)this.drawRingMoon(ms.moon,ms.center,alphaScale)
  }
  drawTargetMarkers(){
    if(!this.active||this.courierMode||!this.markedTargets||this.state!=='active'||phase!=='asteroids')return;
    for(const a of asteroids){
      if(!a||a.dead||a.dying||a.missionTarget!==true)continue;
      const q=camPoint([a.x,a.y,a.z]);
      if(q[2]<3||q[2]>260)continue;
      const p=projectCam(q);if(!p)continue;
      const rockR=clamp(a.s*p.k*1.12,4,72),r=clamp(rockR+9,12,78);
      if(p.x<-r||p.x>W+r||p.y<-r||p.y>viewH+r)continue;
      const len=clamp(r*.28,4,11),alpha=.66+.14*Math.sin(time*4.2+(a.recycles||0));
      const l=p.x-r,rr=p.x+r,t=p.y-r,b=p.y+r;
      line(l,t,l+len,t,C.c,.9,alpha);line(l,t,l,t+len,C.c,.9,alpha);
      line(rr,t,rr-len,t,C.c,.9,alpha);line(rr,t,rr,t+len,C.c,.9,alpha);
      line(l,b,l+len,b,C.c,.9,alpha);line(l,b,l,b-len,C.c,.9,alpha);
      line(rr,b,rr-len,b,C.c,.9,alpha);line(rr,b,rr,b-len,C.c,.9,alpha)
    }
  }
  drawBackdrop(){
    // Missing Manifest keeps the same physical asteroid-field sky during its
    // pirate interruption even though the generic fighter controller temporarily
    // uses phase='space'. The planet must not blink out and reappear around combat.
    const wreckCombatBackdrop=phase==='space'&&this.spaceBackdrop===true;
    if(!this.active||(phase!=='asteroids'&&phase!=='courierMine'&&!wreckCombatBackdrop))return;
    this.drawRingPlanet(1)
  }
}

