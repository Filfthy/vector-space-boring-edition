'use strict';
class StationDeliveryController {
  constructor(){this.reset()}
  reset(){
    this.active=false;this.stage=null;this.state='idle';this.mesh=relayTruckStopMesh;this.stationStyle='relay';this.doorAxis='x';
    this.scale=15.5;this.rot=[-Math.PI/2,Math.PI/2,0];
    this.station={x:0,y:0,z:300};this.doorOpen=0;this.navPulse=0;this.entryT=0;
    this.doorX=.665;this.doorY=0;this.doorZ=0;this.doorW=.24;this.doorH=.33;this.approachStandOff=58;
    this.deliveryT=0;this.deliveryAnnounced=false;this.turnT=0;this.clearT=0;
    this.deliveryStop=8.0;this.interiorDoorZ=0;this.cargoProgress=0;
    this.interiorMode='delivery';this.terminalPurpose='delivery';this.hackT=0;this.hackDuration=4.5;this.hackProgress=0;this.hackComplete=false;this.alarmT=0;this.hackEscapeDistance=0;this.hackEscapeTarget=250;
    this.approachLeg='waypoint';this.waypointAnnounced=false;
    this.arrivalT=0;this.arrivalInfestation=false;this.arrivalCombatProfile='xeno';this.preserveNextPadApproach=false;
    // Crossroads uses the same large-object capture -> route -> align -> final
    // docking shape as the asteroid-mine delivery. The player only has to reach
    // the destination volume; autopilot owns the safe route to the real doorway.
    this.docking=false;this.dockRoute=[];this.dockRouteLeg=0;this.dockState='idle';
    this.dockStageDistance=42;this.dockProtectedRadius=0;this.dockTurnRate=0;
    // External-pad toolkit state. Relay Truck Stop's front pad is deliberately
    // selected because it sits clear of the service body and protrusions.
    this.padLocal=[1.50,-1.02,.35];
    this.padApproachLocal=[4.70,-1.02,1.25];
    this.padHoverLocal=[2.30,-1.02,.82];
    this.padDropLocal=[1.50,-1.02,.40];
    this.padCaptureT=0;this.padDeliveryT=0;this.padCargoProgress=0;this.padDelivered=false;this.padClearT=0;
    // The carried parcel is stored in cockpit space. While it is being handed off
    // it keeps the same orientation it had during the ground pickup; once it lands
    // we freeze that basis so it remains physically attached to the pad on departure.
    this.padCargoBasis=null;
    this.padCaptureLeg='approach';
  }
  prepare(stage){
    this.reset();this.active=true;this.stage=stage||{};
    const d=Math.max(220,Number(stage?.approachDistance)||315);
    const stationModel=String(stage?.stationModel||'').toLowerCase();
    if(stationModel.includes('crossroads')){
      // Match the asteroid mining-base delivery as a VISUAL journey, not merely by
      // copying its Z coordinate. Crossroads' old scale made its ~2.79-unit mesh
      // radius about 2.7x larger on screen than the ~24.5-unit mining-base keepers.
      // Scale Crossroads to the same world radius, then use the mine run's exact
      // long-range offset/distance model.
      const routeSeconds=clamp(Math.max(20,Number(stage?.routeSeconds)||22),20,30);
      const side=Math.random()<.5?-1:1;
      // Keep the mining-base journey length, but make Crossroads visibly off-axis
      // at hand-off so HUB NAV genuinely has a job to do rather than sitting over
      // an almost centred station.
      const local=[side*(135+Math.random()*95),-72+Math.random()*144,180+routeSeconds*OPEN_SPACE_CRUISE+Math.random()*90];
      const w=cameraPointToWorld(local);
      this.mesh=crossroadsOutpostMesh;this.stationStyle='crossroads';this.scale=9.0;this.doorAxis='z';
      // The wheel's front projecting central nub occupies local Z -1.12..-.72.
      // Cut the doorway into the OUTER FACE of that nub, dead-centre on the wheel.
      this.doorX=0;this.doorY=0;this.doorZ=-1.12;this.doorW=.30;this.doorH=.30;this.approachStandOff=42;
      // The terminal is deliberately down a real access corridor rather than just
      // behind the hatch. The same layout numbers drive preview, flight and drawing.
      this.deliveryStop=this.hackInteriorLayout().stop;
      this.station={x:w[0],y:w[1],z:w[2]};
      // Aim the nub/door normal back along the initial approach, just as the
      // mining-base keeper is oriented around its authored doorway.
      const sx=w[0]-shipX,sy=w[1]-shipY,sz=w[2],rr=Math.hypot(sx,sy,sz)||1;
      this.rot=[Math.asin(-sy/rr),Math.atan2(sx,sz),0];
    }else if(stationModel.includes('vox')){
      // VOX story destination: keep the approved Signal Cross station well out at
      // the perimeter instead of presenting it close, level and square-on.  The
      // security intercept happens while the station is still a distant object;
      // only after clearance does the normal large-object docking autopilot fly in.
      const side=Math.random()<.5?-1:1;
      // The comms station is a genuinely distant destination.  It is also presented
      // broadside / three-quarter-on rather than with its hatch conveniently facing
      // the player, so clearance is followed by a real curved docking approach.
      const local=[side*(125+Math.random()*55),-90+Math.random()*180,860+Math.random()*140];
      const w=cameraPointToWorld(local);
      this.mesh=voxCommsStationMesh;this.stationStyle='vox';this.scale=4.4;this.doorAxis='z';
      // Deliberate three-quarter presentation: enough yaw to avoid a straight-on
      // docking view, but not so much that the station collapses into a side profile.
      // Stronger pitch/roll expose the parallel solar-panel sets and make the object
      // read as a real structure in space rather than a flat elevation drawing.
      const tilt=Math.random()<.5?-1:1;
      this.rot=[
        tilt*(.20+Math.random()*.12),
        side*(.38+Math.random()*.10),
        -side*tilt*(.16+Math.random()*.10)
      ];
      this.doorX=0;this.doorY=0;this.doorZ=-1.56;this.doorW=1.26;this.doorH=.76;this.approachStandOff=305;
      // Secure upload uses the same authored short access-corridor / terminal stop
      // as before; only the exterior presentation and perimeter intercept change.
      this.deliveryStop=this.hackInteriorLayout().stop;
      this.station={x:w[0],y:w[1],z:w[2]};
    }else{
      // Relay 10's pad faces local +Z, which becomes world +Y after the keeper
      // installation rotation. Put the station below the player's initial flight
      // plane so Pad 03 is approached from ABOVE, never from its underside.
      this.station={x:34,y:-22,z:d};
    }
  }
  preparePadApproach(stage){
    // Arrival and pad approach are one continuous physical location.  Do not
    // teleport Relay 10 after the random encounter/clear branch has resolved.
    if(this.active&&this.preserveNextPadApproach){
      this.stage=stage||{};this.preserveNextPadApproach=false;return
    }
    this.prepare(stage)
  }
  beginArrival(stage=this.stage){
    if(!this.active||stage!==this.stage)this.prepare(stage);
    this.arrivalT=0;this.navPulse=0;this.arrivalCombatProfile=String(stage?.profile||stage?.combatProfile||'xeno').toLowerCase();
    this.arrivalInfestation=Math.random()<clamp(Number(stage?.encounterChance)||0,0,1);
    if(this.arrivalInfestation&&campaign?.currentMission){
      const log=Array.isArray(campaign.currentMission.encounters)?campaign.currentMission.encounters:(campaign.currentMission.encounters=[]);
      const encounterId=this.arrivalCombatProfile==='xeno'?'station_xeno':`station_${this.arrivalCombatProfile}`;
      if(!log.includes(encounterId))log.push(encounterId)
    }
    this.state=this.arrivalInfestation?(this.arrivalCombatProfile==='xeno'?'bugEncounter':'combatEncounter'):'arrivalClear';
    mode='play';phase='space';modeT=phaseT=0;
    fighters.length=0;asteroids.length=0;groundTargets.length=0;bolts.length=0;hazards.length=0;shots.length=0;playerMissiles.length=0;
    shipX=shipY=0;inputX=inputY=aimX=aimY=0;viewYaw=viewPitch=viewRoll=0;spaceYawVel=spacePitchVel=0;
    resetPlanetBearing();resetSpaceDogfightDirector();resetSpaceMotion();
    audio.music.setMode(this.arrivalInfestation?'violent':'calm');
    return this.arrivalInfestation
  }
  stopForJump(){this.active=false;this.state='complete'}
  localToWorld(p){
    const q=rotate(p,this.rot);return[this.station.x+q[0]*this.scale,this.station.y+q[1]*this.scale,this.station.z+q[2]*this.scale]
  }
  padCentre(){return this.localToWorld(this.padLocal)}
  padApproachPoint(){return this.localToWorld(this.padApproachLocal)}
  padHoverPoint(){return this.localToWorld(this.padHoverLocal)}
  padDropPoint(){return this.localToWorld(this.padDropLocal)}
  beginPadApproach(stage=this.stage){
    if(!this.active||stage!==this.stage)this.preparePadApproach(stage);
    this.state='padApproach';this.navPulse=0;this.padCaptureT=0;this.padDeliveryT=0;this.padCargoProgress=0;this.padDelivered=false;this.padCargoBasis=null;
    mode='play';phase='space';modeT=phaseT=0;
    fighters.length=0;asteroids.length=0;groundTargets.length=0;bolts.length=0;hazards.length=0;shots.length=0;playerMissiles.length=0;
    shipX=shipY=0;inputX=inputY=aimX=aimY=0;viewYaw=viewPitch=viewRoll=0;spaceYawVel=spacePitchVel=0;
    resetPlanetBearing();resetSpaceDogfightDirector();resetSpaceMotion();audio.music.setMode('calm');
    audio.playVoice('deliveryApproachClear',{once:false,priority:true})
  }
  beginPadDelivery(stage=this.stage){
    if(!this.active)return false;
    this.state='padCapture';this.padCaptureT=0;this.padDeliveryT=0;this.padCargoProgress=0;this.padDelivered=false;this.padCargoBasis=null;this.padCaptureLeg='approach';
    mode='stationPad';phase='space';modeT=phaseT=0;inputX=inputY=aimX=aimY=0;shots.length=0;playerMissiles.length=0;
    say('AUTOPILOT · PAD 03',.72);return true
  }
  beginPadDeparture(){
    if(!this.active)return false;
    this.state='padDepart';this.padClearT=0;mode='stationPadDeparture';phase='space';modeT=phaseT=0;
    inputX=inputY=aimX=aimY=0;return true
  }
  updateArrival(dt){
    this.navPulse+=dt;this.arrivalT+=dt;
    if(this.state==='arrivalClear'&&this.arrivalT>=.22){
      this.preserveNextPadApproach=true;scenarioFlow.completeCurrentStage()
    }
    // During an infestation Relay 10 remains a distant visual anchor rather than
    // rushing through the player while the dogfight redirects their nose.  The
    // normal approach resumes physical closure only after the xenoforms are clear.
  }
  updatePadApproach(dt){
    this.navPulse+=dt;
    const speed=OPEN_SPACE_CRUISE;
    this.station.x-=spaceMoveX*speed*dt;this.station.y-=spaceMoveY*speed*dt;this.station.z-=spaceMoveZ*speed*dt;
    const q=camPoint(this.padApproachPoint());if(!q)return;
    const range=Math.hypot(q[0],q[1],q[2]),angular=Math.hypot(q[0],q[1])/Math.max(.1,q[2]);
    // External pads should be easy to capture. The player only has to bring the
    // marked pad into the broad forward approach cone; autopilot owns the precise
    // alignment from there. Requiring near-perfect manual alignment defeated the
    // point of a truck-stop landing pad and made PAD 03 effectively unreachable.
    if(q[2]>.2&&((range<78&&angular<.95)||(range<44&&angular<1.65)))scenarioFlow.completeCurrentStage()
  }
  updatePadDelivery(dt){
    if(this.state==='padCapture'){
      this.padCaptureT+=dt;
      // Two-step pad autopilot. First fly to the clear stand-off point outside the
      // pad, then descend/translate along the pad's own approach axis to the hover
      // point. This makes capture tolerant of a rough player arrival without ever
      // taking a diagonal shortcut through the Relay 10 service body.
      const target=this.padCaptureLeg==='approach'?this.padApproachPoint():this.padHoverPoint();
      const dx=target[0]-shipX,dy=target[1]-shipY,dz=target[2];
      const dist=Math.hypot(dx,dy,dz),speed=this.padCaptureLeg==='approach'?18.0:8.2;
      const maxStep=Math.min(dist,speed*dt),inv=dist>1e-5?maxStep/dist:0;
      this.station.x-=dx*inv;this.station.y-=dy*inv;this.station.z-=dz*inv;
      let q=camPoint(this.padCentre());
      if(q){
        const yawErr=Math.atan2(q[0],Math.max(.1,q[2]));
        const pitchErr=-Math.atan2(q[1],Math.max(.1,Math.hypot(q[0],q[2])));
        viewYaw=wrapAngle(viewYaw+clamp(yawErr,-.58*dt,.58*dt));
        viewPitch=clamp(viewPitch+clamp(pitchErr,-.46*dt,.46*dt),-.68,.68);
        viewRoll=moveToward(viewRoll,0,dt*3.4)
      }
      const rem=this.padCaptureLeg==='approach'?this.padApproachPoint():this.padHoverPoint();
      const r=Math.hypot(rem[0]-shipX,rem[1]-shipY,rem[2]);
      if(this.padCaptureLeg==='approach'&&this.padCaptureT>.45&&r<1.35){
        this.padCaptureLeg='final';this.padCaptureT=0;say('PAD 03 CAPTURED',.58);return
      }
      if(this.padCaptureLeg==='final'&&this.padCaptureT>.65&&r<.85){this.state='padDelivery';this.padDeliveryT=0;say('DELIVERY POINT ACQUIRED',.70)}
      return
    }
    if(this.state==='padDelivery'){
      this.padDeliveryT+=dt;this.padCargoProgress=ease(clamp((this.padDeliveryT-.45)/2.15,0,1));
      if(!this.padDelivered&&this.padCargoProgress>=.999){
        this.padDelivered=true;
        this.padCargoBasis=[cameraVectorToWorld([1,0,0]),cameraVectorToWorld([0,1,0]),cameraVectorToWorld([0,0,1])];
        audio.playVoice('deliveryComplete',{once:false,priority:true})
      }
      // Keep the pad stage alive long enough for deliverycomplete.mp3 to finish.
      // Advancing immediately reset mission voices and chopped the line to "delivery...".
      if(this.padDeliveryT>=4.55)scenarioFlow.completeCurrentStage();
      return
    }
    if(this.state==='padDepart'){
      this.padClearT+=dt;
      // Lift clear first, then accelerate away from the truck stop. The station
      // therefore falls below and recedes instead of the player clipping through it.
      const lift=ease(clamp(this.padClearT/.85,0,1));
      this.station.y-=lerp(2.2,6.6,lift)*dt;this.station.z+=lerp(5.0,18.0,lift)*dt;
      viewRoll=moveToward(viewRoll,0,dt*3);viewPitch=moveToward(viewPitch,0,dt*.55);
      if(this.padClearT>=1.65)scenarioFlow.completeCurrentStage()
    }
  }
  doorCentre(){return this.localToWorld([this.doorX,this.doorY,this.doorZ])}
  doorNormalWorld(){
    const localNormal=this.doorAxis==='z'?[0,0,-1]:[1,0,0];
    const n=rotate(localNormal,this.rot),m=Math.hypot(n[0],n[1],n[2])||1;return[n[0]/m,n[1]/m,n[2]/m]
  }
  doorInwardWorld(){const n=this.doorNormalWorld();return[-n[0],-n[1],-n[2]]}
  doorUpWorld(){
    const u=rotate([0,1,0],this.rot),m=Math.hypot(u[0],u[1],u[2])||1;return[u[0]/m,u[1]/m,u[2]/m]
  }
  doorRightWorld(){
    const r=rotate([1,0,0],this.rot),m=Math.hypot(r[0],r[1],r[2])||1;return[r[0]/m,r[1]/m,r[2]/m]
  }
  hackInteriorLayout(){
    // One authoritative physical layout is shared by the exterior doorway preview,
    // the actual corridor/room renderer, terminal position and docking stop.
    // The VOX signal-cross is physically small, so its access tunnel is deliberately
    // short and close to the hatch instead of borrowing the much deeper minefield hub.
    if(this.stationStyle==='vox')return{
      corridorEnd:4.8,roomStart:4.8,roomEnd:9.35,stop:7.65,terminalZ:9.20,
      corridorHalfW:2.48,corridorHalfH:1.46,roomHalfW:2.72,roomHalfH:1.58
    };
    return{
      corridorEnd:18.0,roomStart:18.0,roomEnd:30.55,stop:26.2,terminalZ:30.515,
      corridorHalfW:1.34,corridorHalfH:1.18,roomHalfW:2.22,roomHalfH:1.56
    }
  }
  hackRoomFixtures(){
    // Fixed room-local fixtures: shallow floor cabinets physically anchored to the
    // back wall, but with real depth into the room so they do not read as 2-D
    // rectangles half buried in the wall.
    const L=this.hackInteriorLayout(),floorY=-L.roomHalfH,back=L.roomEnd-.025;
    return[
      {x:-1.64,y:floorY+.34,w:.68,h:.34,z0:back-.68,z1:back,col:C.w},
      {x: 1.64,y:floorY+.34,w:.68,h:.34,z0:back-.68,z1:back,col:C.w}
    ]
  }
  hostClearanceRadius(){
    if(!this.mesh)return 28;
    let r=0;for(const q of this.mesh.v||[])r=Math.max(r,Math.hypot(q[0],q[1],q[2]));
    return r*this.scale+5
  }
  stagingPoint(distance=this.dockStageDistance||42){
    const d=this.doorCentre(),n=this.doorNormalWorld();
    return[d[0]+n[0]*distance,d[1]+n[1]*distance,d[2]+n[2]*distance]
  }
  safeStagePoint(){
    const centre=[this.station.x,this.station.y,this.station.z],protectedRadius=this.hostClearanceRadius();
    let stageDistance=Math.max(38,protectedRadius*.72),stage=this.stagingPoint(stageDistance);
    for(let i=0;i<6&&v3len(v3sub(stage,centre))<protectedRadius+10;i++){stageDistance+=8;stage=this.stagingPoint(stageDistance)}
    return stage
  }
  manualNavigationTarget(){
    if(this.stationStyle!=='crossroads')return this.approachWaypoint();
    const centre=[this.station.x,this.station.y,this.station.z],stage=this.safeStagePoint();
    const route=planLargeObjectApproach([shipX,shipY,0],centre,stage,this.hostClearanceRadius(),this.doorUpWorld());
    return route[0]||stage
  }
  buildDockRoute(){
    const centre=[this.station.x,this.station.y,this.station.z],protectedRadius=this.hostClearanceRadius();
    this.dockProtectedRadius=protectedRadius;
    let stageDistance=Math.max(38,protectedRadius*.72),stage=this.stagingPoint(stageDistance);
    for(let i=0;i<6&&v3len(v3sub(stage,centre))<protectedRadius+10;i++){stageDistance+=8;stage=this.stagingPoint(stageDistance)}
    this.dockStageDistance=stageDistance;stage=this.stagingPoint(stageDistance);
    const planned=planLargeObjectApproach([shipX,shipY,0],centre,stage,protectedRadius,this.doorUpWorld());
    this.dockRoute=planned.map(p=>v3sub(p,centre));this.dockRouteLeg=0;this.dockState='route'
  }
  shiftDockScene(delta){
    this.station.x-=delta[0];this.station.y-=delta[1];this.station.z-=delta[2];
    stationHack?.queueDockTranslation?.(delta)
  }
  dockTurnStep(angle,dt,maxRate=1.45){
    const wanted=Math.min(maxRate,Math.max(.18,angle*3.15));
    const follow=1-Math.exp(-dt*5.2);
    this.dockTurnRate=lerp(this.dockTurnRate||0,wanted,follow);
    if(angle<.035)this.dockTurnRate=Math.min(this.dockTurnRate,Math.max(.12,angle*4.0));
    return Math.min(angle,Math.max(0,this.dockTurnRate)*dt)
  }
  faceDockDirection(direction,dt,rate=1.45){
    ensureSpaceOrientation();
    const desired=v3norm(direction);if(v3len(desired)<.0001)return 0;
    const angle=Math.acos(clamp(v3dot(spaceForward,desired),-1,1));
    if(angle>.0025){
      let axis=v3cross(spaceForward,desired);
      if(v3len(axis)<.001)axis=this.doorUpWorld();
      axis=v3norm(axis);
      const turn=this.dockTurnStep(angle,dt,rate);
      spaceForward=rotateAroundAxis(spaceForward,axis,turn);
      spaceRight=rotateAroundAxis(spaceRight,axis,turn);
      spaceUp=rotateAroundAxis(spaceUp,axis,turn);
      orthonormaliseSpaceOrientation();syncEulerFromSpaceOrientation()
    }else this.dockTurnRate*=Math.exp(-dt*7);
    // Docking owns the attitude now, but do not snap the player's existing bank
    // away as soon as autopilot engages. Bleed it off visibly while the nose turns.
    viewRoll=moveToward(viewRoll,0,dt*.42);
    return angle
  }
  faceDockMovement(target,dt,rate=1.45){return this.faceDockDirection(v3sub(target,[shipX,shipY,0]),dt,rate)}
  alignExternalTerminalRoll(dt,rate=.72){
    // The external terminal has a real authored 'up' direction on its wall.  Once
    // terminal autopilot owns the craft, progressively rotate the true free-flight
    // basis around the current nose so the cockpit becomes level with that panel.
    // This is a real bank manoeuvre, not a last-frame viewRoll snap.
    ensureSpaceOrientation();
    const f=v3norm(spaceForward),up0=this.externalTerminalUp();
    let targetUp=v3sub(up0,v3scale(f,v3dot(up0,f)));
    if(v3len(targetUp)<.001){viewRoll=moveToward(viewRoll,0,dt*.42);return Math.abs(viewRoll)}
    targetUp=v3norm(targetUp);
    const c=clamp(v3dot(spaceUp,targetUp),-1,1);
    const s=v3dot(v3cross(spaceUp,targetUp),spaceForward);
    const error=Math.atan2(s,c),angle=Math.abs(error);
    if(angle>.0025){
      const step=clamp(error,-rate*dt,rate*dt);
      spaceRight=rotateAroundAxis(spaceRight,spaceForward,step);
      spaceUp=rotateAroundAxis(spaceUp,spaceForward,step);
      orthonormaliseSpaceOrientation();syncEulerFromSpaceOrientation()
    }
    viewRoll=moveToward(viewRoll,0,dt*.42);
    return Math.max(angle,Math.abs(viewRoll))
  }
  alignDockFrameRoll(dt,rate=1.05){
    // Matching only the doorway normal is not enough for a seamless coordinate
    // hand-off: the free-flight camera can still be rolled around that normal.
    // Align its real right/up basis to the authored doorway frame before crossing,
    // so switching to the door-local corridor cannot rotate the world for one frame.
    ensureSpaceOrientation();
    const f=v3norm(this.doorInwardWorld()),targetR0=this.doorRightWorld();
    let targetR=v3sub(targetR0,v3scale(f,v3dot(targetR0,f)));
    if(v3len(targetR)<.001)targetR=this.doorRightWorld();
    targetR=v3norm(targetR);
    const c=clamp(v3dot(spaceRight,targetR),-1,1);
    const s=v3dot(v3cross(spaceRight,targetR),spaceForward);
    const error=Math.atan2(s,c),angle=Math.abs(error);
    if(angle>.0025){
      const step=clamp(error,-rate*dt,rate*dt);
      spaceRight=rotateAroundAxis(spaceRight,spaceForward,step);
      spaceUp=rotateAroundAxis(spaceUp,spaceForward,step);
      orthonormaliseSpaceOrientation();syncEulerFromSpaceOrientation()
    }
    // Finish levelling at the same deliberate pace as the real doorway-frame
    // roll, so entry reads as a controlled bank-to-level manoeuvre rather than a cut.
    viewRoll=moveToward(viewRoll,0,dt*.42);
    return Math.max(angle,Math.abs(viewRoll))
  }
  beginDock(){
    if((this.stationStyle!=='crossroads'&&this.stationStyle!=='vox')||this.docking)return false;
    ensureSpaceOrientation();
    spaceYawVel=spacePitchVel=0;inputX=inputY=aimX=aimY=0;
    this.docking=true;this.state='docking';mode='stationEntry';phase='space';modeT=0;this.doorOpen=0;
    const f=v3norm(spaceForward);spaceMoveX=f[0];spaceMoveY=f[1];spaceMoveZ=f[2];
    this.buildDockRoute();
    if(this.stationStyle==='crossroads')stationHack?.beginDocking?.();
    say('AUTOPILOT · DOCKING',.65);return true
  }
  enterHackCorridor(){
    const secure=this.stationStyle==='vox';
    this.doorOpen=1;this.docking=false;this.interiorMode='hack';this.terminalPurpose=secure?'secure':'hack';
    this.state=secure?'secureCorridor':'hackCorridor';
    if(secure){
      // Legitimate VOX docking uses the same corridor/terminal machinery, but no
      // exterior minefield state is manufactured for it.
      stationHack?.prepare?.({difficulty:this.stage?.difficulty||2,secureTransfer:true})
    }else{
      // Snapshot the ACTUAL exterior minefield in the real doorway basis before the
      // canonical interior coordinate hand-off. These exact mines remain outside.
      stationHack?.captureExteriorField?.();
      stationHack?.endDocking?.()
    }
    phase='stationInterior';mode='stationEntry';modeT=phaseT=0;travel=0;
    shipX=shipY=0;viewYaw=viewPitch=viewRoll=0;inputX=inputY=aimX=aimY=0;
    spaceYawVel=spacePitchVel=0
  }
  placeHackExitExterior(){
    // Interior coordinates use +Z inward from the real hub doorway.  On leaving,
    // map that same frame back into open space with outward = world +Z, so the
    // station remains in the same physical relationship to the doorway frame.
    this.rot=[0,Math.PI,0];
    const off=rotate([this.doorX*this.scale,this.doorY*this.scale,this.doorZ*this.scale],this.rot);
    const door=[0,0,-.72];
    this.station={x:door[0]-off[0],y:door[1]-off[1],z:door[2]-off[2]};
    this.doorOpen=1
  }
  updateDocking(dt){
    if(!this.docking)return;
    if(this.dockState==='route'){
      const centre=[this.station.x,this.station.y,this.station.z],off=this.dockRoute[this.dockRouteLeg];
      if(!off)this.dockState='align';
      else{
        const target=v3add(centre,off),toTarget=v3sub(target,[shipX,shipY,0]),dist=v3len(toTarget);
        const angle=this.faceDockMovement(target,dt,1.45);
        if(angle>.16)return;
        const speed=dist>55?30:lerp(12,24,clamp(dist/55,0,1)),step=Math.min(dist,speed*dt);
        const delta=dist>.0001?v3scale(toTarget,step/dist):[0,0,0];
        this.shiftDockScene(delta);
        if(dist<=1.15||step>=dist-.02){
          this.dockRouteLeg++;
          if(this.dockRouteLeg>=this.dockRoute.length)this.dockState='align'
        }
        return
      }
    }
    if(this.dockState==='align'){
      const angle=this.faceDockDirection(this.doorInwardWorld(),dt,1.28);
      if(angle>.006)return;
      // Finish the same visible alignment in roll as well as yaw/pitch.  The
      // corridor renderer is door-local, so this removes the old basis mismatch
      // at the exterior -> interior threshold instead of masking it afterwards.
      if(this.alignDockFrameRoll(dt,.42)>.006)return;
      this.dockState='final'
    }
    if(this.dockState==='final'){
      let q=camPoint(this.doorCentre());if(!q)return;
      const lateral=Math.hypot(q[0],q[1]),align=1-Math.exp(-dt*5.8);
      if(q[2]<64)this.doorOpen=clamp(this.doorOpen+dt*.58,0,1);
      const lined=clamp(1-lateral/8,0,1),dockSpeed=lerp(8.5,18.5,lined);
      const doorBrake=q[2]<11?lerp(.14,1,ease(clamp((this.doorOpen-.42)/.54,0,1))):1;
      const forwardStep=Math.min(dockSpeed*doorBrake*dt,Math.max(0,q[2]-.66));
      const delta=cameraVectorToWorld([q[0]*align,q[1]*align,forwardStep]);
      this.shiftDockScene(delta);
      q=camPoint(this.doorCentre());
      if(q&&q[2]<=.82&&Math.hypot(q[0],q[1])<.34)this.enterHackCorridor()
    }
  }
  approachWaypoint(){
    // VOX has no artificial perimeter marker. The visible station itself is the
    // destination during the arrival leg; security interception is distance-based.
    if(this.stationStyle==='vox')return[this.station.x,this.station.y,this.station.z];
    const d=this.doorCentre(),n=this.doorNormalWorld(),standOff=this.approachStandOff;
    return[d[0]+n[0]*standOff,d[1]+n[1]*standOff,d[2]+n[2]*standOff]
  }
  navigationTarget(){
    if(this.stationStyle==='crossroads')return this.manualNavigationTarget()||this.doorCentre();
    return this.approachLeg==='waypoint'?this.approachWaypoint():this.doorCentre()
  }
  doorCornersLocal(scale=1){
    const x=this.doorX,y=this.doorY,z=this.doorZ,w=this.doorW*scale,h=this.doorH*scale;
    if(this.doorAxis==='z')return[[x-w/2,y-h/2,z],[x+w/2,y-h/2,z],[x+w/2,y+h/2,z],[x-w/2,y+h/2,z]];
    return[[x,y-w/2,z-h/2],[x,y+w/2,z-h/2],[x,y+w/2,z+h/2],[x,y-w/2,z+h/2]]
  }
  beginApproach(stage=this.stage){
    if(!this.active||stage!==this.stage)this.prepare(stage);
    this.state='approach';this.docking=false;this.dockRoute=[];this.dockRouteLeg=0;this.dockState='idle';this.dockTurnRate=0;
    this.approachLeg=this.stationStyle==='crossroads'?'door':'waypoint';this.waypointAnnounced=this.stationStyle==='crossroads';this.doorOpen=0;this.navPulse=0;
    mode='play';phase='space';modeT=phaseT=0;
    fighters.length=0;asteroids.length=0;groundTargets.length=0;bolts.length=0;hazards.length=0;shots.length=0;playerMissiles.length=0;
    shipX=shipY=0;inputX=inputY=aimX=aimY=0;viewYaw=viewPitch=viewRoll=0;spaceYawVel=spacePitchVel=0;
    resetPlanetBearing();resetSpaceDogfightDirector();resetSpaceMotion();audio.music.setMode('calm');
    if(this.stationStyle==='crossroads')audio.playVoice('goToSecureTerminalNav',{once:false,priority:true});
    else say('PROCEED TO STATION',.85)
  }
  beginClearedApproach(stage=this.stage){
    if(!this.active||this.stationStyle!=='vox')return false;
    this.stage=stage||this.stage;this.state='clearedApproach';this.docking=false;this.navPulse=0;
    mode='play';phase='space';modeT=phaseT=0;
    inputX=inputY=aimX=aimY=0;spaceYawVel=spacePitchVel=0;
    audio.music.setMode('calm');
    say('DOCKING CLEARED · PROCEED TO STATION',.76);return true
  }
  beginEntry(){
    if(!this.active)return false;
    if(this.stationStyle==='crossroads'){this.interiorMode='hack';this.terminalPurpose='hack'}
    else if(this.stationStyle==='vox'){
      this.interiorMode='hack';this.terminalPurpose='secure';
      // VOX now uses the proven minefield/large-object docking autopilot from the
      // perimeter all the way through the physical hatch and into the short tunnel.
      shots.length=0;playerMissiles.length=0;return this.beginDock()
    }
    this.state='entry';this.entryT=0;mode='stationEntry';phase='space';modeT=phaseT=0;
    inputX=inputY=aimX=aimY=0;shots.length=0;playerMissiles.length=0;this.doorOpen=.12;
    say('DOCKING DOOR',.7);return true
  }
  beginInteriorDelivery(){
    if(!this.active)return false;
    this.interiorMode='delivery';this.state='interiorApproach';phase='stationInterior';mode='stationInterior';modeT=phaseT=0;
    travel=1.05;shipX=0;shipY=0;viewYaw=viewPitch=viewRoll=0;inputX=inputY=aimX=aimY=0;
    this.deliveryT=0;this.deliveryAnnounced=false;this.turnT=0;this.cargoProgress=0;return true
  }
  beginInteriorHack(stage=this.stage){
    if(!this.active)return false;
    this.stage=stage||this.stage;this.interiorMode='hack';this.terminalPurpose='hack';phase='stationInterior';mode='stationInterior';modeT=phaseT=0;
    // Normal Crossroads flow reaches this stage after station-entry autopilot has
    // already flown physically through the hub door and along the short corridor.
    // Preserve that exact position; only direct/debug starts use the fallback.
    const continuous=this.state==='hackReady';
    stationHack?.resetDataTransfer?.();
    if(continuous){
      travel=this.deliveryStop;this.state='hack';stationHack?.startDataTransfer?.();audio?.hackChirp?.start?.();say('SECURE TERMINAL ACQUIRED',.68)
    }else{
      travel=1.05;this.state='hackApproach';shipX=0;shipY=0;viewYaw=viewPitch=viewRoll=0;inputX=inputY=aimX=aimY=0
    }
    this.hackT=0;this.hackDuration=Math.max(2.5,Number(stage?.hackSeconds)||4.5);this.hackProgress=0;this.hackComplete=false;this.alarmT=0;this.turnT=0;
    return true
  }
  beginSecureTransfer(stage=this.stage){
    if(!this.active)return false;
    this.stage=stage||this.stage;this.interiorMode='hack';this.terminalPurpose='secure';phase='stationInterior';mode='stationInterior';modeT=phaseT=0;
    if(!stationHack?.active)stationHack?.prepare?.({difficulty:stage?.difficulty||2,secureTransfer:true});
    else stationHack.stage=stage||stationHack.stage;
    stationHack?.resetDataTransfer?.();
    const continuous=this.state==='secureReady';
    if(continuous){
      travel=this.deliveryStop;this.state='secureTransfer';stationHack?.startDataTransfer?.();audio?.hackChirp?.start?.();say('SECURE DATA TERMINAL ACQUIRED',.72)
    }else{
      travel=1.05;this.state='secureApproach';shipX=0;shipY=0;viewYaw=viewPitch=viewRoll=0;inputX=inputY=aimX=aimY=0
    }
    this.hackT=0;this.hackDuration=Math.max(2.5,Number(stage?.transferSeconds)||4.5);this.hackProgress=0;this.hackComplete=false;this.alarmT=0;this.turnT=0;
    return true
  }
  beginHackDeparture(stage=this.stage){
    if(!this.active)return false;
    audio?.hackChirp?.stop?.();
    this.stage=stage||this.stage;this.interiorMode='hack';this.state='hackInteriorExit';phase='stationInterior';mode='stationDeparture';modeT=phaseT=0;
    this.hackEscapeDistance=0;this.hackEscapeTarget=Math.max(150,Number(stage?.escapeDistance)||250);
    viewYaw=Math.PI;viewPitch=0;viewRoll=0;inputX=inputY=aimX=aimY=0;return true
  }
  beginDeparture(){
    if(!this.active)return false;
    this.state='interiorExit';phase='stationInterior';mode='stationDeparture';modeT=phaseT=0;
    // Delivery module finishes after a visible 180-degree turn, so departure can
    // simply move forward toward the same door the player entered.
    viewYaw=Math.PI;viewPitch=0;viewRoll=0;inputX=inputY=aimX=aimY=0;return true
  }
  forwardSpeed(){
    if(!this.active||phase!=='stationInterior')return 0;
    if(this.state==='hackCorridor'||this.state==='secureCorridor')return travel<this.deliveryStop?5.0:0;
    if(this.state==='interiorApproach'||this.state==='hackApproach'||this.state==='secureApproach')return travel<this.deliveryStop?4.4:0;
    if(this.state==='interiorExit'||this.state==='hackInteriorExit')return travel>-.65?-6.6:0;
    return 0
  }
  updateApproach(dt){
    this.navPulse+=dt;
    if(this.stationStyle==='crossroads'){
      if(this.docking)return this.updateDocking(dt);
      // Same hand-off rule as asteroid delivery: the destination is a persistent
      // large object and capture is by its protected volume, not by demanding that
      // the player manually centre a tiny doorway before autopilot will help.
      const beforeQ=camPoint([this.station.x,this.station.y,this.station.z]);
      const speed=OPEN_SPACE_CRUISE;
      this.station.x-=spaceMoveX*speed*dt;this.station.y-=spaceMoveY*speed*dt;this.station.z-=spaceMoveZ*speed*dt;
      const hostQ=camPoint([this.station.x,this.station.y,this.station.z]);
      const hostDistance=Math.hypot(hostQ[0],hostQ[1],hostQ[2]);
      const arrivalRadius=Math.max(175,this.hostClearanceRadius()+105);
      const crossedCapture=!segmentClearsProtectedSphere(beforeQ,hostQ,[0,0,0],arrivalRadius);
      if(hostDistance<arrivalRadius||crossedCapture)this.beginDock();
      return
    }
    // VOX arrival is keyed to the station itself, not to a synthetic perimeter
    // marker.  The security drone intercept begins while the station is still well
    // away, so it happens within seconds of reaching the comms-site area.
    const speed=OPEN_SPACE_CRUISE;
    this.station.x-=spaceMoveX*speed*dt;this.station.y-=spaceMoveY*speed*dt;this.station.z-=spaceMoveZ*speed*dt;
    if(this.stationStyle==='vox'){
      const q=camPoint([this.station.x,this.station.y,this.station.z]);if(!q)return;
      const range=Math.hypot(q[0],q[1],q[2]);
      if(range<610){this.state='securityHold';scenarioFlow.completeCurrentStage()}
      return
    }
    if(this.approachLeg==='waypoint'){
      const q=camPoint(this.approachWaypoint());if(!q)return;
      const range=Math.hypot(q[0],q[1],q[2]);
      if(range<23){
        this.approachLeg='door';this.waypointAnnounced=true;say('DOCKING DOOR MARKED',.72)
      }
      return
    }
    const q=camPoint(this.doorCentre());if(!q)return;
    const range=Math.hypot(q[0],q[1],q[2]),angular=Math.hypot(q[0],q[1])/Math.max(.1,q[2]);
    if(q[2]>.2&&range<36&&angular<.14)scenarioFlow.completeCurrentStage()
  }
  updateClearedApproach(dt){
    this.navPulse+=dt;
    const beforeQ=camPoint([this.station.x,this.station.y,this.station.z]),speed=OPEN_SPACE_CRUISE;
    this.station.x-=spaceMoveX*speed*dt;this.station.y-=spaceMoveY*speed*dt;this.station.z-=spaceMoveZ*speed*dt;
    const q=camPoint([this.station.x,this.station.y,this.station.z]);if(!q)return;
    const range=Math.hypot(q[0],q[1],q[2]),capture=Math.max(178,this.hostClearanceRadius()+92);
    const crossed=!segmentClearsProtectedSphere(beforeQ,q,[0,0,0],capture);
    if(range<capture||crossed)scenarioFlow.completeCurrentStage()
  }
  updateEntry(dt){
    this.entryT+=dt;this.doorOpen=clamp(this.entryT/1.15,0,1);
    let q=camPoint(this.doorCentre());
    if(!q)return;
    // The approach stage has already put the craft outside the docking face. Entry
    // now STEERS onto the door normal and advances forward. It no longer translates
    // the entire station sideways through the camera, which looked like flying
    // straight through the structure.
    const yawErr=Math.atan2(q[0],Math.max(.1,q[2]));
    const pitchErr=-Math.atan2(q[1],Math.max(.1,Math.hypot(q[0],q[2])));
    viewYaw=wrapAngle(viewYaw+clamp(yawErr,-.48*dt,.48*dt));
    viewPitch=clamp(viewPitch+clamp(pitchErr,-.38*dt,.38*dt),-.65,.65);
    viewRoll=moveToward(viewRoll,0,dt*2.8);
    q=camPoint(this.doorCentre());
    const angular=Math.hypot(q[0],q[1])/Math.max(.1,q[2]);
    const gate=clamp(1-angular/.22,0,1),dz=-clamp((q[2]-1.05)*.62,1.5,10.5)*gate*dt;
    if(gate>.02){const w=cameraVectorToWorld([0,0,dz]);this.station.x+=w[0];this.station.y+=w[1];this.station.z+=w[2]}
    const nq=camPoint(this.doorCentre());
    if(this.entryT>1.0&&nq&&nq[2]<=1.25&&Math.hypot(nq[0],nq[1])<.34){
      if(this.stationStyle==='crossroads'){
        // Cross the real nub threshold and remain on autopilot. The exterior gives
        // way to a corridor whose mouth matches the physical aperture, so there is
        // no cut/teleport to a generic terminal room.
        this.doorOpen=1;this.interiorMode='hack';this.terminalPurpose='hack';this.state='hackCorridor';
        stationHack?.captureExteriorField?.();
        phase='stationInterior';mode='stationEntry';modeT=phaseT=0;travel=0;
        shipX=shipY=0;viewYaw=viewPitch=viewRoll=0;inputX=inputY=aimX=aimY=0;
        return
      }
      if(this.stationStyle==='vox'){
        // The approved VOX signal-cross is an unmanned secure data node. Continue
        // the entry autopilot all the way through the hatch to its terminal rather
        // than cutting from the exterior to a generic delivery room.
        this.doorOpen=1;this.interiorMode='hack';this.terminalPurpose='secure';this.state='secureCorridor';
        stationHack?.prepare?.({difficulty:this.stage?.difficulty||2,secureTransfer:true});
        phase='stationInterior';mode='stationEntry';modeT=phaseT=0;travel=0;
        shipX=shipY=0;viewYaw=viewPitch=viewRoll=0;inputX=inputY=aimX=aimY=0;
        return
      }
      scenarioFlow.completeCurrentStage()
    }
  }
  updateInterior(dt){
    if(this.state==='secureCorridor'){
      // VOX station-entry autopilot owns the whole landing: hatch -> corridor ->
      // terminal stop. The next authored stage begins only once the drone is parked.
      if(travel>=this.deliveryStop-.03){travel=this.deliveryStop;this.state='secureReady';scenarioFlow.completeCurrentStage()}
      return
    }
    if(this.state==='hackCorridor'){
      // Continue the docking autopilot through the short access corridor and into
      // the terminal room. Only then hand over to the actual hack stage.
      if(travel>=this.deliveryStop-.03){
        travel=this.deliveryStop;this.state='hackReady';scenarioFlow.completeCurrentStage()
      }
      return
    }
    if(this.state==='interiorApproach'){
      if(travel>=this.deliveryStop-.03){travel=this.deliveryStop;this.state='delivery';this.deliveryT=0}
      return
    }
    if(this.state==='hackApproach'){
      if(travel>=this.deliveryStop-.03){travel=this.deliveryStop;this.state='hack';this.hackT=0;stationHack?.startDataTransfer?.();audio?.hackChirp?.start?.();say('SECURE TERMINAL ACQUIRED',.68)}
      return
    }
    if(this.state==='secureApproach'){
      if(travel>=this.deliveryStop-.03){travel=this.deliveryStop;this.state='secureTransfer';this.hackT=0;stationHack?.startDataTransfer?.();audio?.hackChirp?.start?.();say('SECURE DATA TERMINAL ACQUIRED',.72)}
      return
    }
    if(this.state==='secureTransfer'){
      this.hackT+=dt;this.hackProgress=clamp(this.hackT/this.hackDuration,0,1);
      if(this.hackProgress>=1){this.hackProgress=1;stationHack?.requestDataDrain?.();this.state='secureDrain'}
      return
    }
    if(this.state==='secureDrain'){
      if(stationHack?.dataTransferFinished?.()){
        this.hackComplete=true;audio?.hackChirp?.stop?.();SoundFX.relayCalibrated?.();
        this.state='secureHold';this.alarmT=0;audio.playVoice('dataTransferComplete',{once:false,priority:true})
      }
      return
    }
    if(this.state==='secureHold'){
      this.alarmT+=dt;if(this.alarmT>=1.15){this.state='secureTurn';this.turnT=0}return
    }
    if(this.state==='secureTurn'){
      this.turnT+=dt;const u=clamp(this.turnT/1.72,0,1),q=ease(u);viewYaw=q*Math.PI;viewRoll=-Math.sin(u*Math.PI)*.10;
      if(this.turnT>=1.92){viewYaw=Math.PI;viewRoll=0;scenarioFlow.completeCurrentStage()}
      return
    }
    if(this.state==='hack'){
      this.hackT+=dt;this.hackProgress=clamp(this.hackT/this.hackDuration,0,1);
      if(this.hackProgress>=1){
        this.hackProgress=1;stationHack?.requestDataDrain?.();this.state='hackDrain'
      }
      return
    }
    if(this.state==='hackDrain'){
      // The terminal cannot flip red while a visible packet is still in flight.
      // Stop launching packets at 100%, let the final packet(s) physically reach
      // the terminal, then perform the completion/audio/alarm transition.
      if(stationHack?.dataTransferFinished?.()){
        this.hackComplete=true;audio?.hackChirp?.complete?.();SoundFX.terminalRed();
        stationHack?.deactivateMines?.();
        audio.playVoice('terminalHacked',{once:false,priority:true});
        this.state='hackAlarm';this.alarmT=0;say('ACCESS COMPLETE · SECURITY ALERT',.95)
      }
      return
    }
    if(this.state==='hackAlarm'){
      this.alarmT+=dt;if(this.alarmT>=1.15){this.state='hackTurn';this.turnT=0}return
    }
    if(this.state==='hackTurn'){
      this.turnT+=dt;const u=clamp(this.turnT/1.72,0,1),q=ease(u);viewYaw=q*Math.PI;viewRoll=-Math.sin(u*Math.PI)*.10;
      if(this.turnT>=1.92){viewYaw=Math.PI;viewRoll=0;scenarioFlow.completeCurrentStage()}
      return
    }
    if(this.state==='hackInteriorExit'){
      if(travel<=-.62){
        travel=-.62;this.state='hackEscape';this.clearT=0;
        // Capture the exact outward-facing camera-space mine positions before the
        // coordinate-system switch. The first exterior frame therefore contains the
        // same mines in the same places as the final corridor frame.
        stationHack.beginEscape();
        this.placeHackExitExterior();
        phase='space';mode='play';viewYaw=viewPitch=viewRoll=0;shipX=shipY=0;resetSpaceMotion();
        say('ESCAPE REMOTE HUB',.72)
      }
      return
    }
    if(this.state==='delivery'){
      this.deliveryT+=dt;this.cargoProgress=ease(clamp((this.deliveryT-.45)/2.15,0,1));
      if(!this.deliveryAnnounced&&this.cargoProgress>=.999){this.deliveryAnnounced=true;audio.playVoice('deliveryComplete',{once:false,priority:true})}
      if(this.deliveryT>=3.45){this.state='turn';this.turnT=0}
      return
    }
    if(this.state==='turn'){
      this.turnT+=dt;const u=clamp(this.turnT/1.72,0,1),q=ease(u);viewYaw=q*Math.PI;viewRoll=-Math.sin(u*Math.PI)*.10;
      if(this.turnT>=1.92){viewYaw=Math.PI;viewRoll=0;scenarioFlow.completeCurrentStage()}
      return
    }
    if(this.state==='interiorExit'){
      if(travel<=-.62){
        travel=-.62;this.state='clear';this.clearT=0;phase='space';mode='stationDeparture';viewYaw=viewPitch=viewRoll=0;shipX=shipY=0;resetSpaceMotion()
      }
      return
    }
    if(this.state==='clear'){
      this.clearT+=dt;if(this.clearT>=1.15)scenarioFlow.completeCurrentStage()
    }
  }
  updateHackEscape(dt){
    const speed=OPEN_SPACE_CRUISE;
    this.station.x-=spaceMoveX*speed*dt;this.station.y-=spaceMoveY*speed*dt;this.station.z-=spaceMoveZ*speed*dt;
    this.hackEscapeDistance+=speed*dt;
    if(this.hackEscapeDistance>=this.hackEscapeTarget)scenarioFlow.completeCurrentStage()
  }
  update(dt){
    if(!this.active)return;
    if(this.docking&&phase==='space')return this.updateDocking(dt);
    if(this.state==='arrivalClear'||this.state==='bugEncounter'||this.state==='combatEncounter')return this.updateArrival(dt);
    if(this.state==='recoverySearch')return;
    if(this.state==='padApproach')return this.updatePadApproach(dt);
    if(this.state==='padCapture'||this.state==='padDelivery'||this.state==='padDepart')return this.updatePadDelivery(dt);
    if(this.state==='approach')return this.updateApproach(dt);
    if(this.state==='clearedApproach')return this.updateClearedApproach(dt);
    if(this.state==='entry')return this.updateEntry(dt);
    if(this.state==='hackEscape')return this.updateHackEscape(dt);
    return this.updateInterior(dt)
  }
  stationSurfaceFacing(origin,normal){
    const p=this.localToWorld(origin),n=rotate(normal,this.rot);
    // Fixed station geometry lives in the same pseudo-world convention used by
    // camPoint(): the camera position is [shipX, shipY, 0]. Using a transformed
    // camera helper here could classify the underside of horizontal pads as front
    // facing while the open-space basis was rotating.
    const cam=[shipX,shipY,0];
    return n[0]*(cam[0]-p[0])+n[1]*(cam[1]-p[1])+n[2]*(cam[2]-p[2])>0
  }
  stationSegmentHitsTriangle(a,b,v0,v1,v2){
    // Moller-Trumbore against the finite camera->target segment.  This is used only
    // for a handful of station pad props, so the clarity is worth far more than a
    // fragile centre-depth heuristic.
    const dx=b[0]-a[0],dy=b[1]-a[1],dz=b[2]-a[2];
    const e1x=v1[0]-v0[0],e1y=v1[1]-v0[1],e1z=v1[2]-v0[2];
    const e2x=v2[0]-v0[0],e2y=v2[1]-v0[1],e2z=v2[2]-v0[2];
    const px=dy*e2z-dz*e2y,py=dz*e2x-dx*e2z,pz=dx*e2y-dy*e2x;
    const det=e1x*px+e1y*py+e1z*pz;if(Math.abs(det)<1e-9)return false;
    const inv=1/det,tx=a[0]-v0[0],ty=a[1]-v0[1],tz=a[2]-v0[2];
    const u=(tx*px+ty*py+tz*pz)*inv;if(u<0||u>1)return false;
    const qx=ty*e1z-tz*e1y,qy=tz*e1x-tx*e1z,qz=tx*e1y-ty*e1x;
    const v=(dx*qx+dy*qy+dz*qz)*inv;if(v<0||u+v>1)return false;
    const t=(e2x*qx+e2y*qy+e2z*qz)*inv;
    // t=1 is the target surface itself.  Ignore the last sliver so the pad a ship
    // is sitting on is not mistaken for an obstruction in front of that ship.
    return t>1e-5&&t<.992
  }
  stationPointOccluded(local){
    const a=[shipX,shipY,0],b=this.localToWorld(local),verts=this.mesh.v.map(v=>this.localToWorld(v));
    for(const face of this.mesh.faces||[]){
      if(face.length<3)continue;
      const v0=verts[face[0]];
      for(let i=1;i<face.length-1;i++)if(this.stationSegmentHitsTriangle(a,b,v0,verts[face[i]],verts[face[i+1]]))return true
    }
    return false
  }
  drawStationPanel(points,normal,col=C.gd,alpha=.72){
    if(!points?.length||!this.stationSurfaceFacing(points[0],normal))return;const pp=points.map(q=>proj(this.localToWorld(q)));if(!pp.every(Boolean))return;
    for(let i=0;i<pp.length;i++){const a=pp[i],b=pp[(i+1)%pp.length];line(a.x,a.y,b.x,b.y,col,.78,alpha)}
  }
  drawStationStencil(text,origin,right,down,height,col=C.w,alpha=.82,align='left',normal=null){
    if(normal&&!this.stationSurfaceFacing(origin,normal))return;
    const chars=String(text).toUpperCase().split(''),gap=.16;
    let units=0;for(const ch of chars){const g=STATION_STENCIL[ch]||STATION_STENCIL['0'];units+=g.w+gap}if(chars.length)units-=gap;
    let cursor=align==='center'?-units*.5:align==='right'?-units:0;
    for(const ch of chars){
      const g=STATION_STENCIL[ch]||STATION_STENCIL['0'];
      for(const seg of g.l){
        const a=[origin[0]+right[0]*(cursor+seg[0])*height+down[0]*seg[1]*height,origin[1]+right[1]*(cursor+seg[0])*height+down[1]*seg[1]*height,origin[2]+right[2]*(cursor+seg[0])*height+down[2]*seg[1]*height];
        const b=[origin[0]+right[0]*(cursor+seg[2])*height+down[0]*seg[3]*height,origin[1]+right[1]*(cursor+seg[2])*height+down[1]*seg[3]*height,origin[2]+right[2]*(cursor+seg[2])*height+down[2]*seg[3]*height];
        const A=proj(this.localToWorld(a)),B=proj(this.localToWorld(b));if(A&&B)line(A.x,A.y,B.x,B.y,col,.78,alpha)
      }
      cursor+=g.w+gap
    }
  }
  drawReadablePadStencil(text,origin,height,col=C.w,alpha=.82){
    // Choose signs for the two in-plane axes from their actual screen projection.
    // The marking remains genuine station-surface geometry, but cannot arrive
    // mirrored/upside-down simply because the pad is viewed from the opposite end.
    const o=proj(this.localToWorld(origin));if(!o)return;
    let right=[0,1,0],down=[1,0,0];
    const rp=proj(this.localToWorld([origin[0]+right[0]*.16,origin[1]+right[1]*.16,origin[2]+right[2]*.16]));
    const dp=proj(this.localToWorld([origin[0]+down[0]*.16,origin[1]+down[1]*.16,origin[2]+down[2]*.16]));
    if(rp&&rp.x<o.x)right=right.map(v=>-v);
    if(dp&&dp.y<o.y)down=down.map(v=>-v);
    this.drawStationStencil(text,origin,right,down,height,col,alpha,'center',[0,0,1])
  }
  drawDeliveryPadZone(){
    // Pad markings exist only on the physical TOP surface. If the camera somehow
    // gets beneath the pad, neither the delivery box nor its lettering can bleed
    // through from the underside.  They also obey the station shell: a pad on the
    // far side is not allowed to stencil its writing through the central body.
    if(!this.stationSurfaceFacing([1.50,-1.02,.358],[0,0,1])||this.stationPointOccluded([1.50,-1.02,.362]))return;
    const z=.358,cx=1.50,cy=-1.02,hw=.34,hh=.22,pts=[[cx-hw,cy-hh,z],[cx+hw,cy-hh,z],[cx+hw,cy+hh,z],[cx-hw,cy+hh,z]].map(p=>proj(this.localToWorld(p)));
    if(pts.every(Boolean))for(let i=0;i<4;i++){const a=pts[i],b=pts[(i+1)%4];line(a.x,a.y,b.x,b.y,C.y,1.0,.9)}
    // Keep the lettering attached to the top face but choose its two axis signs
    // from the actual incoming view so PAD 03 / DELIVERIES never reads mirrored.
    this.drawReadablePadStencil('PAD 03',[1.96,-1.02,.360],.092,C.w,.80);
    this.drawReadablePadStencil('DELIVERIES',[1.16,-1.02,.360],.058,C.y,.84)
  }
  stationShipMesh(name,fallbackIndex=0){
    // Parked traffic must use the same approved ship library as live traffic. Do
    // not substitute anonymous boxes just because these ships are scenery.
    try{
      if(typeof importedEnemyMeshByName!=='undefined'&&importedEnemyMeshByName&&importedEnemyMeshByName[name])return importedEnemyMeshByName[name];
      if(typeof importedEnemyFighterRoster!=='undefined'&&importedEnemyFighterRoster?.length)return importedEnemyFighterRoster[Math.abs(fallbackIndex)%importedEnemyFighterRoster.length]
    }catch(_){/* fall through to the canonical fighter mesh */}
    return fighterMesh
  }
  stationPadShipMesh(base,heading=0){
    // Library ships are authored with local +Y as up and -Z as the nose. Relay's
    // landing pads have local +Z as up, so stand the ship onto the pad first, then
    // yaw it around that pad normal. Cache the transformed mesh: parked ships must
    // never randomly change shape or orientation from frame to frame.
    if(!this._padShipMeshCache)this._padShipMeshCache=new Map();
    const key=`${base?.name||'ship'}:${heading.toFixed(4)}`;
    if(this._padShipMeshCache.has(key))return this._padShipMeshCache.get(key);
    const c=Math.cos(heading),sn=Math.sin(heading),verts=(base?.v||fighterMesh.v).map(v=>{
      const x=v[0],y1=-v[2],z1=v[1]; // +90 degrees about local X: +Y -> +Z
      return[x*c-y1*sn,x*sn+y1*c,z1]
    });
    const mesh={name:`Parked ${base?.name||'Ship'}`,v:verts,e:base?.e||fighterMesh.e,faces:base?.faces||fighterMesh.faces||[]};
    this._padShipMeshCache.set(key,mesh);return mesh
  }
  drawParkedShip(local,name,size=1,col=C.w,heading=0,fallbackIndex=0){
    const p=this.localToWorld(local),base=this.stationShipMesh(name,fallbackIndex),mesh=this.stationPadShipMesh(base,heading);
    drawMesh({type:`parkedStationShip:${name}`,x:p[0],y:p[1],z:p[2],s:this.scale*.19*size,rot:this.rot},mesh,col,.88)
  }
  drawStationMarkings(){
    // Put the main identity on the FORWARD service outcrop (local +X face), rather
    // than on the recessed central body where nearer structures could sit between
    // the pilot and the writing. The panel and text share the same exposed face.
    const outcropNormal=[1,0,0],outcropX=2.040;
    this.drawStationPanel([[outcropX,.184,.61],[outcropX,-.184,.61],[outcropX,-.184,-.06],[outcropX,.184,-.06]],outcropNormal,C.gd,.76);
    this.drawStationStencil('RELAY 10',[outcropX,0,.49],[0,-1,0],[0,0,-1],.066,C.w,.92,'center',outcropNormal);
    this.drawStationStencil('FUEL FREIGHT FOOD',[outcropX,0,.08],[0,-1,0],[0,0,-1],.027,C.c,.76,'center',outcropNormal);

    // The occupied pads are secondary scenery.  Draw their labels only when that
    // actual top surface has a clear line of sight.  This avoids the confusing
    // backwards PAD 01 / PAD 02 strokes previously showing through the station.
    const pads=[
      {text:'PAD 01',p:[-1.35,-.82,-.048]},
      {text:'PAD 02',p:[-.95,1.08,.208]}
    ];
    for(const pad of pads){
      if(!this.stationSurfaceFacing(pad.p,[0,0,1])||this.stationPointOccluded([pad.p[0],pad.p[1],pad.p[2]+.004]))continue;
      this.drawReadablePadStencil(pad.text,pad.p,.082,C.w,.62)
    }
    this.drawDeliveryPadZone()
  }
  parkedShipSpecs(){
    return[
      {local:[-1.35,-.82,.055],name:'Mantis',size:.82,col:C.w,heading:.18,fallback:1},
      {local:[-.95,1.08,.275],name:'Cutlass',size:.68,col:C.c,heading:-.62,fallback:5}
    ]
  }
  drawParkedTraffic(pass='near'){
    for(const spec of this.parkedShipSpecs()){
      // A pad can be closer than the station centre and still sit behind a tower or
      // service block.  Classify it with an actual sight-line through the station
      // mesh.  Occluded ships are drawn BEFORE the black-backed station shell so
      // only genuinely protruding parts remain visible; clear ships are drawn after.
      const blocked=this.stationPointOccluded([spec.local[0],spec.local[1],spec.local[2]+.035]);
      if((pass==='far')!==blocked)continue;
      this.drawParkedShip(spec.local,spec.name,spec.size,spec.col,spec.heading,spec.fallback)
    }
  }
  drawPadNavigation(){
    if(this.state!=='padApproach')return;
    const q=camPoint(this.padApproachPoint()),p=q[2]>.2?projectCam(q):null;
    const on=!!(p&&p.x>=0&&p.x<=W&&p.y>=0&&p.y<=viewH);
    if(on){
      const pulse=10+Math.sin(this.navPulse*4.1)*2.2;line(p.x-pulse,p.y,p.x-3,p.y,C.y,1.15,.9);line(p.x+3,p.y,p.x+pulse,p.y,C.y,1.15,.9);line(p.x,p.y-pulse,p.x,p.y-3,C.y,1.15,.9);line(p.x,p.y+3,p.x,p.y+pulse,C.y,1.15,.9);
      ctx.textAlign='center';ctx.font='400 8px Consolas,monospace';ctx.strokeStyle=C.y;ctx.strokeText('PAD 03 APPROACH',p.x,p.y-pulse-7);ctx.textAlign='left';return
    }
    const edge=hudEdgeCue(q,0),x=edge.x,y=edge.y,dx=edge.dx,dy=edge.dy,tx=-dy,ty=dx;
    line(x,y,x-dx*10+tx*7,y-dy*10+ty*7,C.y,1.25,.9);line(x,y,x-dx*10-tx*7,y-dy*10-ty*7,C.y,1.25,.9)
  }
  drawPadCargo(){
    if(this.state!=='padDelivery'&&this.state!=='padDepart')return;
    // This is the SAME parcel that was pulled into the drone in the ground pickup.
    // Start it from that same cockpit-local storage position instead of using the
    // station's coordinate frame; the old station rotation was turning the box on
    // its side and making it look like a different package.
    const q=this.state==='padDelivery'?this.padCargoProgress:1,target=this.padDropPoint(),origin=cameraPointToWorld([0,-.34,1.05]);
    const x=lerp(origin[0],target[0],q),y=lerp(origin[1],target[1],q),z=lerp(origin[2],target[2],q),cp=proj([x,y,z]);
    if(this.state==='padDelivery'&&q>0&&q<.995&&cp){
      // Anchor the tractor field explicitly to bottom-centre of the cockpit/view,
      // matching the established delivery language. A world-space source moved
      // the apparent emitter up the screen whenever the station autopilot pitched.
      const op={x:W*.5,y:viewH-4};
      const dx=cp.x-op.x,dy=cp.y-op.y,len=Math.hypot(dx,dy)||1,ux=dx/len,uy=dy/len,px=-uy,py=ux,flow=(this.padDeliveryT*.75)%1;ctx.save();ctx.strokeStyle=C.c;ctx.lineWidth=VECTOR_LINE_WIDTH;ctx.globalAlpha=.70;for(let i=0;i<7;i++){const t=.10+(((i/7)+flow)%1)*.82,cx=lerp(op.x,cp.x,t),cy=lerp(op.y,cp.y,t),half=lerp(8,Math.min(34,10+len*.055),t),bow=lerp(5,18,t);ctx.beginPath();ctx.moveTo(cx+px*half,cy+py*half);ctx.quadraticCurveTo(cx+ux*bow,cy+uy*bow,cx-px*half,cy-py*half);ctx.stroke()}ctx.restore()
    }
    // Keep the parcel camera/cockpit-aligned during transfer. After touchdown the
    // captured world basis is reused so the parcel stays fixed on Pad 03 instead
    // of billboarding towards the player as the drone departs.
    const basis=this.padCargoBasis||[cameraVectorToWorld([1,0,0]),cameraVectorToWorld([0,1,0]),cameraVectorToWorld([0,0,1])];
    const sx=.5*1.02,sy=.5*.22,sz=.5*.70;
    const cargoMesh={
      v:courierFixtureBoxMesh.v.map(v=>{
        const lx=v[0]*sx,ly=v[1]*sy,lz=v[2]*sz;
        return[
          basis[0][0]*lx+basis[1][0]*ly+basis[2][0]*lz,
          basis[0][1]*lx+basis[1][1]*ly+basis[2][1]*lz,
          basis[0][2]*lx+basis[1][2]*ly+basis[2][2]*lz
        ]
      }),
      e:courierFixtureBoxMesh.e,faces:courierFixtureBoxMesh.faces
    };
    drawMesh({type:'stationPadCargo',x,y,z,s:1,mx:1,my:1,mz:1,rot:[0,0,0]},cargoMesh,q>=.995?C.y:C.c,.98)
  }
  drawNavigation(){
    if((this.state!=='approach'&&this.state!=='clearedApproach')||this.docking)return;
    const q=camPoint(this.navigationTarget()),p=q[2]>.2?projectCam(q):null;
    const on=!!(p&&p.x>=0&&p.x<=W&&p.y>=0&&p.y<=viewH);
    if(on){
      if(this.stationStyle==='crossroads'){
        // Match the asteroid-delivery navigation language: a clear diamond marks
        // the fixed destination from long range, centred on the REAL hub doorway.
        const pulse=1.5+Math.sin(this.navPulse*4.2)*1.5,r=9+pulse;
        line(p.x,p.y-r,p.x+r,p.y,C.y,1.15,.92);line(p.x+r,p.y,p.x,p.y+r,C.y,1.15,.92);
        line(p.x,p.y+r,p.x-r,p.y,C.y,1.15,.92);line(p.x-r,p.y,p.x,p.y-r,C.y,1.15,.92);
        line(p.x-3,p.y,p.x+3,p.y,C.c,1,.9);line(p.x,p.y-3,p.x,p.y+3,C.c,1,.9);
        ctx.textAlign='center';ctx.font='400 8px Consolas,monospace';ctx.strokeStyle=C.y;
        ctx.strokeText(q[2]>150?'HUB NAV':'DOCKING DOOR',p.x,p.y-r-7);ctx.textAlign='left';return
      }
      const pulse=9+Math.sin(this.navPulse*4.1)*2.2;line(p.x-pulse,p.y,p.x-3,p.y,C.y,1.15,.9);line(p.x+3,p.y,p.x+pulse,p.y,C.y,1.15,.9);line(p.x,p.y-pulse,p.x,p.y-3,C.y,1.15,.9);line(p.x,p.y+3,p.x,p.y+pulse,C.y,1.15,.9);
      ctx.textAlign='center';ctx.font='400 8px Consolas,monospace';ctx.strokeStyle=C.y;ctx.strokeText(this.stationStyle==='vox'?'VOX COMMS CENTRE':(this.approachLeg==='waypoint'?'STATION APPROACH':'DOCKING DOOR'),p.x,p.y-pulse-7);ctx.textAlign='left';return
    }
    const edge=hudEdgeCue(q,0),x=edge.x,y=edge.y,dx=edge.dx,dy=edge.dy,tx=-dy,ty=dx;
    line(x,y,x-dx*10+tx*7,y-dy*10+ty*7,C.y,1.25,.9);line(x,y,x-dx*10-tx*7,y-dy*10-ty*7,C.y,1.25,.9)
  }
  drawHackCorridorPreview(doorPoly){
    if((this.stationStyle!=='crossroads'&&this.stationStyle!=='vox')||!doorPoly||doorPoly.some(p=>!p)||this.doorOpen<=.18)return;
    const centre=this.doorCentre(),r=this.doorRightWorld(),u=this.doorUpWorld(),f=this.doorInwardWorld(),L=this.hackInteriorLayout();
    const worldPoint=(x,y,z)=>[
      centre[0]+r[0]*x+u[0]*y+f[0]*z,
      centre[1]+r[1]*x+u[1]*y+f[1]*z,
      centre[2]+r[2]*x+u[2]*y+f[2]*z
    ];
    const edge=(a,b,col=C.g)=>{
      let A=camPoint(a),B=camPoint(b),near=.24,ain=A[2]>near,bin=B[2]>near;if(!ain&&!bin)return;
      if(ain!==bin){const t=(near-A[2])/(B[2]-A[2]),I=[lerp(A[0],B[0],t),lerp(A[1],B[1],t),near+.0001];if(!ain)A=I;else B=I}
      const p0=projectCam(A),p1=projectCam(B);if(p0&&p1)line(p0.x,p0.y,p1.x,p1.y,col,1,1)
    };
    const panel=(pts,col=C.g)=>{
      const clipped=camera.clipWorldPolyNear(pts,.24);if(clipped.length>=3)fillPoly(clipped);
      for(let i=0;i<pts.length;i++)edge(pts[i],pts[(i+1)%pts.length],col)
    };
    const rect=(hw,hh,z)=>[worldPoint(-hw,-hh,z),worldPoint(hw,-hh,z),worldPoint(hw,hh,z),worldPoint(-hw,hh,z)];
    const reveal=ease(clamp((this.doorOpen-.18)/.58,0,1)),far=lerp(4.0,L.roomEnd,reveal);

    ctx.save();ctx.beginPath();ctx.moveTo(doorPoly[0].x,doorPoly[0].y);for(let i=1;i<4;i++)ctx.lineTo(doorPoly[i].x,doorPoly[i].y);ctx.closePath();ctx.clip();

    // Draw the room only through the literal corridor mouth. The exterior view no
    // longer gets a line-only widened preview which could show room geometry through
    // solid corridor walls.
    if(far>L.roomStart+.15){
      const mouth=rect(L.corridorHalfW,L.corridorHalfH,L.roomStart).map(q=>{const c=camPoint(q);return c[2]>.24?projectCam(c):null});
      if(mouth.every(Boolean)){
        ctx.save();ctx.beginPath();ctx.moveTo(mouth[0].x,mouth[0].y);for(let i=1;i<4;i++)ctx.lineTo(mouth[i].x,mouth[i].y);ctx.closePath();ctx.clip();
        const back=rect(L.roomHalfW,L.roomHalfH,L.roomEnd);panel(back,C.g);
        // Terminal and white cabinets are all on the same physical back-wall plane.
        const screen=rect(.86,.63,L.terminalZ),alarm=this.terminalPurpose==='hack'&&this.hackComplete;panel(screen,alarm?C.r:C.c);
        for(const fx of this.hackRoomFixtures()){
          const q=[worldPoint(fx.x0,fx.y0,fx.z),worldPoint(fx.x1,fx.y0,fx.z),worldPoint(fx.x1,fx.y1,fx.z),worldPoint(fx.x0,fx.y1,fx.z)];
          panel(q,fx.col)
        }
        ctx.restore()
      }
    }

    // The corridor itself is a real opaque shell. Draw far-to-near so its black
    // floor/ceiling/walls physically mask anything deeper in the station.
    const depths=(this.stationStyle==='vox'?[.62,2.35,L.roomStart]:[.62,3.2,6.4,9.6,12.8,15.6,L.roomStart]).filter(z=>z<=far+.01);
    if(depths.length<2){ctx.restore();return}
    if(depths[depths.length-1]<Math.min(far,L.roomStart)-.05)depths.push(Math.min(far,L.roomStart));
    const panels=[];
    for(let i=0;i<depths.length-1;i++){
      const a=rect(L.corridorHalfW,L.corridorHalfH,depths[i]),b=rect(L.corridorHalfW,L.corridorHalfH,depths[i+1]);
      panels.push([a[0],a[1],b[1],b[0]],[a[2],a[3],b[3],b[2]],[a[3],a[0],b[0],b[3]],[a[1],a[2],b[2],b[1]])
    }
    panels.sort((A,B)=>B.reduce((n,q)=>n+camPoint(q)[2],0)/B.length-A.reduce((n,q)=>n+camPoint(q)[2],0)/A.length);
    for(const q of panels)panel(q,C.g);
    for(const z of depths){const q=rect(L.corridorHalfW,L.corridorHalfH,z);for(let k=0;k<4;k++)edge(q[k],q[(k+1)%4],z===L.roomStart?C.c:C.g)}
    ctx.restore()
  }
  drawDoor(){
    const cutScale=(this.stationStyle==='crossroads'||this.stationStyle==='vox')?1:1.16;
    const corners=this.doorCornersLocal(cutScale).map(p=>proj(this.localToWorld(p)));if(!corners.every(Boolean))return;
    fillPoly(corners);for(let i=0;i<4;i++){const a=corners[i],b=corners[(i+1)%4];line(a.x,a.y,b.x,b.y,C.y,1.15,.96)}
    this.drawHackCorridorPreview(corners);
    const open=clamp(this.doorOpen,0,1);if(open<.995){
      // Door leaves split left/right in the aperture's own plane. Relay uses its
      // side-face Y axis; face-on Crossroads uses the central hub's X axis.
      const x=this.doorX,y=this.doorY,z=this.doorZ,w=this.doorW,h=this.doorH,gap=w*.5*open;
      const polys=this.doorAxis==='z'
        ?[[[x-w/2,y-h/2,z],[x-gap,y-h/2,z],[x-gap,y+h/2,z],[x-w/2,y+h/2,z]],[[x+gap,y-h/2,z],[x+w/2,y-h/2,z],[x+w/2,y+h/2,z],[x+gap,y+h/2,z]]]
        :[[[x,y-w/2,z-h/2],[x,y-gap,z-h/2],[x,y-gap,z+h/2],[x,y-w/2,z+h/2]],[[x,y+gap,z-h/2],[x,y+w/2,z-h/2],[x,y+w/2,z+h/2],[x,y+gap,z+h/2]]];
      for(const poly of polys){const pp=poly.map(p=>proj(this.localToWorld(p)));if(!pp.every(Boolean))continue;fillPoly(pp);for(let i=0;i<4;i++)line(pp[i].x,pp[i].y,pp[(i+1)%4].x,pp[(i+1)%4].y,C.w,.9,.86)}
    }
  }
  // Relay 10 data terminal: put it on the broad, exposed +Y wall of the main
  // octagonal hub. This face is clear of the service arm, pad machinery and the
  // diagonal utility pods, so the player approaches a real exterior workstation
  // rather than squeezing into an accidental recess between station geometry.
  externalTerminalLocal(){return[0,.598,.08]}
  externalTerminalPoint(){return this.localToWorld(this.externalTerminalLocal())}
  externalTerminalNormal(){return v3norm(rotate([0,1,0],this.rot))}
  externalTerminalUp(){return v3norm(rotate([0,0,1],this.rot))}
  externalTerminalStopPoint(){
    const p=this.externalTerminalPoint(),n=this.externalTerminalNormal(),d=Math.max(10,Number(this.stage?.terminalStandOff)||13);
    return[p[0]+n[0]*d,p[1]+n[1]*d,p[2]+n[2]*d]
  }
  externalTerminalStagePoint(){
    const p=this.externalTerminalPoint(),n=this.externalTerminalNormal(),centre=[this.station.x,this.station.y,this.station.z];
    const along=v3dot(v3sub(p,centre),n),clearance=this.hostClearanceRadius()+14;
    const d=Math.max(38,clearance-along);
    return[p[0]+n[0]*d,p[1]+n[1]*d,p[2]+n[2]*d]
  }
  drawExternalDataTerminal(){
    if(this.stationStyle!=='relay'||!this.stage?.externalDataTerminal)return;
    const c=this.externalTerminalLocal();
    // +Y wall panel: X is horizontal across the wall, Z is vertical on the panel.
    const quad=(hx,hz,y)=>[[c[0]-hx,y,c[2]-hz],[c[0]+hx,y,c[2]-hz],[c[0]+hx,y,c[2]+hz],[c[0]-hx,y,c[2]+hz]];
    const drawPanel=(poly,col,width=1)=>{const pp=poly.map(q=>proj(this.localToWorld(q)));if(!pp.every(Boolean))return null;fillPoly(pp);for(let i=0;i<4;i++)line(pp[i].x,pp[i].y,pp[(i+1)%4].x,pp[(i+1)%4].y,col,width,.98);return pp};
    drawPanel(quad(.175,.125,.590),C.w,.95);const screenHalfX=.128,screenHalfZ=.082,screenY=.602;
    const screen=drawPanel(quad(screenHalfX,screenHalfZ,screenY),C.c,1.05);if(!screen)return;
    // Same seven-row moving line display as the established secure terminals.  The
    // shared renderer is scaled onto this exterior wall panel; this is no longer a
    // bespoke pair of horizontal decoration lines.
    stationHack.drawLineDisplay((x,z)=>proj(this.localToWorld([x,screenY+.002,z])),{
      left:c[0]-screenHalfX,right:c[0]+screenHalfX,bottom:c[2]-screenHalfZ,top:c[2]+screenHalfZ,alarm:false,time:modeT
    });
    if(salvageRecovery?.state==='terminalTransfer'){
      // Exact standard secure-terminal data stream. No bespoke 2-D boxes or
      // alternative effect: the same 3-D packet ramp used everywhere else.
      const target=camPoint(this.externalTerminalPoint());
      if(target&&target[2]>.2)stationHack.drawDataRamp([0,-.62,.82],target,salvageRecovery.terminalDataPackets,{sourceHalf:.90,targetHalf:.43})
    }
  }
  drawExterior(){
    if(!this.active||phase!=='space'||this.state==='clear')return;
    const centre=camPoint([this.station.x,this.station.y,this.station.z]);
    if(centre[2]>.18){
      if(this.stationStyle==='relay')this.drawParkedTraffic('far');
      const exteriorType=this.stationStyle==='crossroads'?'crossroadsOutpost':this.stationStyle==='vox'?'voxCommsStation':'relayTruckStop';
      const exteriorCol=this.stationStyle==='vox'?C.c:C.g;
      drawMesh({type:exteriorType,x:this.station.x,y:this.station.y,z:this.station.z,s:this.scale,rot:this.rot},this.mesh,exteriorCol,.94);
      if(this.stationStyle==='relay')this.drawParkedTraffic('near');
      if(this.stationStyle==='relay')this.drawExternalDataTerminal()
    }
    if(this.stationStyle==='relay')this.drawStationMarkings();
    if(this.state==='approach'||this.docking||this.state==='entry'||this.state==='hackEscape')this.drawDoor();
    this.drawPadCargo();this.drawPadNavigation()
  }
  drawInteriorBox(x,y,w,h,z0,z1,col=C.gd,alpha=.82){
    drawMesh({type:'stationInteriorFixture',x,y,z:(z0+z1)*.5-travel,s:.5,mx:w,my:h,mz:z1-z0,rot:[0,0,0]},courierFixtureBoxMesh,col,alpha)
  }
  drawVoxExitVista(){
    if(this.stationStyle!=='vox'||this.interiorMode!=='hack'||phase!=='stationInterior')return;
    if(!['secureTurn','interiorExit'].includes(this.state))return;
    const L=this.hackInteriorLayout(),z=-travel;
    const pts=[
      [-L.corridorHalfW,-L.corridorHalfH,z],
      [ L.corridorHalfW,-L.corridorHalfH,z],
      [ L.corridorHalfW, L.corridorHalfH,z],
      [-L.corridorHalfW, L.corridorHalfH,z]
    ];
    const pp=pts.map(p=>{const q=camPoint(p);return q[2]>.24?projectCam(q):null});
    if(!pp.every(Boolean))return;
    ctx.save();
    ctx.beginPath();ctx.moveTo(pp[0].x,pp[0].y);for(let i=1;i<4;i++)ctx.lineTo(pp[i].x,pp[i].y);ctx.closePath();ctx.clip();
    // Same continuity rule as the asteroid-delivery exit: the outside scene is
    // visible before the threshold is crossed, rather than appearing after a cut.
    renderer.drawStars();
    ctx.restore()
  }
  drawInterior(){
    if(!this.active||phase!=='stationInterior')return;
    const drawShell=(z0,z1,hw,hh,{back=true,col=C.gd,alpha=.82}={})=>{
      const panels=[
        [[-hw,-hh,z0],[hw,-hh,z0],[hw,-hh,z1],[-hw,-hh,z1]],
        [[-hw,hh,z1],[hw,hh,z1],[hw,hh,z0],[-hw,hh,z0]],
        [[-hw,-hh,z1],[-hw,hh,z1],[-hw,hh,z0],[-hw,-hh,z0]],
        [[hw,-hh,z0],[hw,hh,z0],[hw,hh,z1],[hw,-hh,z1]]
      ];
      if(back)panels.push([[-hw,-hh,z1],[hw,-hh,z1],[hw,hh,z1],[-hw,hh,z1]]);
      for(const p of panels){
        const clipped=camera.clipWorldPolyNear(p,.24);if(clipped.length>=3)fillPoly(clipped);
        for(let i=0;i<4;i++){
          const a=p[i],b=p[(i+1)%4],A=camPoint(a),B=camPoint(b);
          if(A[2]>.24&&B[2]>.24){const q0=projectCam(A),q1=projectCam(B);if(q0&&q1)line(q0.x,q0.y,q1.x,q1.y,col,.9,alpha)}
        }
      }
    };
    if(this.interiorMode==='hack'){
      const L=this.hackInteriorLayout(),chw=L.corridorHalfW,chh=L.corridorHalfH,rhw=L.roomHalfW,rhh=L.roomHalfH;

      // The exterior already exists beyond the physical entrance. Crossroads shows
      // its live minefield; VOX shows the ordinary starfield through the same opening
      // during the turn and outbound run. Tunnel walls remain the only occluders.
      stationHack?.drawInteriorVista?.();
      this.drawVoxExitVista();

      const clipEdge=(a,b,col=C.g,alpha=1)=>{
        const near=.24;let A=camPoint(a),B=camPoint(b),ain=A[2]>near,bin=B[2]>near;
        if(!ain&&!bin)return;
        if(ain!==bin){
          const t=(near-A[2])/(B[2]-A[2]),I=[lerp(A[0],B[0],t),lerp(A[1],B[1],t),near+.0001];
          if(!ain)A=I;else B=I
        }
        const p0=projectCam(A),p1=projectCam(B);if(p0&&p1)line(p0.x,p0.y,p1.x,p1.y,col,VECTOR_LINE_WIDTH,alpha)
      };
      const drawPanel=(pts,col=C.g)=>{
        const clipped=camera.clipWorldPolyNear(pts,.24);if(clipped.length>=3)fillPoly(clipped);
        for(let k=0;k<4;k++)clipEdge(pts[k],pts[(k+1)%4],col,1)
      };
      const rect=(w,h,z)=>[[-w,-h,z-travel],[w,-h,z-travel],[w,h,z-travel],[-w,h,z-travel]];
      const shellSegments=(depths,w,h)=>{
        const out=[];
        for(let i=0;i<depths.length-1;i++){
          const a=rect(w,h,depths[i]),b=rect(w,h,depths[i+1]);
          out.push([a[0],a[1],b[1],b[0]],[a[2],a[3],b[3],b[2]],[a[3],a[0],b[0],b[3]],[a[1],a[2],b[2],b[1]])
        }
        return out
      };
      const corridorDepths=this.stationStyle==='vox'?[-.10,2.35,L.roomStart]:[-.10,3.2,6.4,9.6,12.8,15.6,L.roomStart];
      const roomDepths=this.stationStyle==='vox'?[L.roomStart,6.9,L.roomEnd]:[L.roomStart,21.4,25.4,L.roomEnd];

      // Until the camera physically crosses the room mouth, the complete room cell
      // (walls, furniture, terminal and data) can only be seen through the corridor-
      // sized opening at that exact plane. The clip NEVER widens early.
      const roomPortal=()=>{
        // Keep the room clipped until the camera has ACTUALLY crossed the mouth.
        // The previous .24-unit early release was a near-plane convenience, but at
        // corridor speed it exposed the wide room for several transition frames.
        const dz=L.roomStart-travel;if(dz<=0)return null;
        // When the mouth is inside the camera near plane it already subtends far more
        // than the whole viewport, so a full-screen clip is the physically equivalent
        // continuation until the crossing itself.
        if(dz<=.18)return[{x:0,y:0},{x:W,y:0},{x:W,y:viewH},{x:0,y:viewH}];
        const pp=rect(chw,chh,L.roomStart).map(q=>{const c=camPoint(q);return c[2]>.18?projectCam(c):null});
        return pp.every(Boolean)?pp:null
      };
      const withRoomClip=fn=>{
        const pp=roomPortal();if(!pp){fn();return}
        ctx.save();ctx.beginPath();ctx.moveTo(pp[0].x,pp[0].y);for(let i=1;i<4;i++)ctx.lineTo(pp[i].x,pp[i].y);ctx.closePath();ctx.clip();fn();ctx.restore()
      };

      // One fixed room-local assembly. Furniture is not animated/scenery and is not
      // positioned from screen coordinates; it shares the room's physical Z frame.
      withRoomClip(()=>{
        // Room shell first. All fixtures below are literally on the same back-wall
        // plane as the terminal, so there is no independent furniture depth state to
        // synchronise with the room animation.
        const roomPanels=shellSegments(roomDepths,rhw,rhh);
        roomPanels.sort((a,b)=>{
          const da=a.reduce((n,p)=>n+camPoint(p)[2],0)/4,db=b.reduce((n,p)=>n+camPoint(p)[2],0)/4;return db-da
        });
        for(const p of roomPanels)drawPanel(p,C.g);
        const back=rect(rhw,rhh,L.roomEnd);drawPanel(back,C.g);
        for(const z of roomDepths){const r=rect(rhw,rhh,z);for(let k=0;k<4;k++)clipEdge(r[k],r[(k+1)%4],C.g,1)}
        for(const f of this.hackRoomFixtures()){
          drawMesh({type:'crossroadsRoomFixture',x:f.x,y:f.y,z:((f.z0+f.z1)*.5)-travel,s:.5,mx:f.w,my:f.h,mz:f.z1-f.z0,rot:[0,0,0]},courierFixtureBoxMesh,f.col,.88)
        }
        stationHack.drawTerminal();
      });

      // A literal opaque wall around the corridor-sized room mouth. This is the
      // missing structural join: four black shoulder panels, including a real
      // ceiling segment, separate the narrow corridor from the wider room.
      const z=L.roomStart-travel;
      const mouth=[
        [[-rhw,-rhh,z],[rhw,-rhh,z],[rhw,-chh,z],[-rhw,-chh,z]],
        [[-rhw,chh,z],[rhw,chh,z],[rhw,rhh,z],[-rhw,rhh,z]],
        [[-rhw,-chh,z],[-chw,-chh,z],[-chw,chh,z],[-rhw,chh,z]],
        [[chw,-chh,z],[rhw,-chh,z],[rhw,chh,z],[chw,chh,z]]
      ];
      for(const p of mouth)drawPanel(p,C.c);
      const inner=rect(chw,chh,L.roomStart);for(let k=0;k<4;k++)clipEdge(inner[k],inner[(k+1)%4],C.c,1);

      // Finally draw the nearer corridor shell. Far-to-near opaque panels preserve
      // the portal while approaching, and the same geometry works after the 180° turn.
      const corridorPanels=shellSegments(corridorDepths,chw,chh);
      corridorPanels.sort((a,b)=>{
        const da=a.reduce((n,p)=>n+camPoint(p)[2],0)/4,db=b.reduce((n,p)=>n+camPoint(p)[2],0)/4;return db-da
      });
      for(const p of corridorPanels)drawPanel(p,C.g);
      for(const physical of corridorDepths){const r=rect(chw,chh,physical);for(let k=0;k<4;k++)clipEdge(r[k],r[(k+1)%4],physical===L.roomStart?C.c:C.g,1)}
      return
    }

    const z0=-.10-travel,z1=13.2-travel,hw=2.05,hh=1.48;
    // Receiving corridor/room remains unchanged for ordinary station delivery.
    drawShell(z0,z1,hw,hh,{back:true,col:C.gd,alpha:.82});
    this.drawInteriorBox(0,-.92,1.72,.18,10.35,11.15,C.y,.94);
    this.drawInteriorBox(-1.58,-.95,.55,.46,10.80,11.60,C.w,.68);
    this.drawInteriorBox(1.58,-.95,.55,.46,10.80,11.60,C.w,.68);
    this.drawInteriorCargo()
  }
  drawInteriorCargo(){
    if(this.state!=='delivery'&&this.state!=='turn'&&this.state!=='interiorExit')return;
    const landed=this.state!=='delivery'||this.cargoProgress>=.999,q=this.state==='delivery'?this.cargoProgress:1;
    const sx=0,sy=-.42,sz=.82,targetY=-.78,targetZ=10.72-travel;
    const x=0,y=lerp(sy,targetY,q),z=lerp(sz,targetZ,q),cp=proj([x,y,z]);
    if(this.state==='delivery'&&q<.995&&cp){
      const origin=proj([0,-.48,.52]);if(origin){const dx=cp.x-origin.x,dy=cp.y-origin.y,len=Math.hypot(dx,dy)||1,ux=dx/len,uy=dy/len,px=-uy,py=ux,flow=(this.deliveryT*.75)%1;ctx.save();ctx.strokeStyle=C.c;ctx.lineWidth=VECTOR_LINE_WIDTH;ctx.globalAlpha=.68;for(let i=0;i<7;i++){const t=.12+(((i/7)+flow)%1)*.80,cx=lerp(origin.x,cp.x,t),cy=lerp(origin.y,cp.y,t),half=lerp(7,25,t),bow=lerp(4,15,t);ctx.beginPath();ctx.moveTo(cx+px*half,cy+py*half);ctx.quadraticCurveTo(cx+ux*bow,cy+uy*bow,cx-px*half,cy-py*half);ctx.stroke()}ctx.restore()}
    }
    drawMesh({type:'stationCargo',x,y,z,s:.5,mx:1.02,my:.22,mz:.70,rot:[0,0,0]},courierFixtureBoxMesh,landed?C.y:C.c,.98)
  }
  hudRight(){
    if(!this.active)return'';
    if(this.state==='bugEncounter')return`XENOFORMS ${Math.max(0,interceptorGoal-interceptorsDestroyed)}`;
    if(this.state==='combatEncounter')return`${this.arrivalCombatProfile==='rogue'?'ROGUE DRONES':'HOSTILES'} ${Math.max(0,interceptorGoal-interceptorsDestroyed)}`;
    if(this.state==='recoverySearch')return'SEARCH DRONE WRECKAGE';
    if(this.state==='arrivalClear')return'STATION CONTACT';
    if(this.state==='padApproach'){const q=camPoint(this.padApproachPoint());return`PAD 03 ${Math.max(0,Math.round(Math.hypot(q[0],q[1],q[2])))}`}
    if(this.state==='padCapture')return'PAD 03 AUTOPILOT';
    if(this.state==='padDelivery')return'DELIVERING';
    if(this.state==='padDepart')return'CLEARING STATION';
    if(this.state==='approach'||this.state==='clearedApproach'){const q=camPoint(this.navigationTarget());return`${this.stationStyle==='vox'?'VOX COMMS CENTRE':(this.approachLeg==='waypoint'?'STATION APPROACH':'DOOR')} ${Math.max(0,Math.round(Math.hypot(q[0],q[1],q[2])))}`}
    if(this.state==='entry')return'DOCKING';
    if(this.state==='hackCorridor')return'ACCESS CORRIDOR';
    if(this.state==='secureCorridor')return'AUTOPILOT · COMMS TERMINAL';
    if(this.state==='hackApproach')return'SECURE TERMINAL';
    if(this.state==='secureApproach')return'AUTOPILOT · SECURE TERMINAL';
    if(this.state==='secureTransfer'||this.state==='secureDrain')return`SECURE UPLOAD ${Math.round(this.hackProgress*100)}%`;
    if(this.state==='secureHold'||this.state==='secureTurn')return'UPLOAD COMPLETE';
    if(this.state==='hack'||this.state==='hackDrain')return`HACK ${Math.round(this.hackProgress*100)}%`;
    if(this.state==='hackAlarm'||this.state==='hackTurn')return'SECURITY ALERT';
    if(this.state==='hackInteriorExit')return'EXITING HUB';
    if(this.state==='hackEscape')return`MINEFIELD ${stationHack.liveCount()}`;
    if(this.state==='interiorApproach')return'RECEIVING BAY';
    if(this.state==='delivery'||this.state==='turn')return'DELIVERING';
    if(this.state==='interiorExit'||this.state==='clear')return'LEAVING STATION';return''
  }
}


// v295 — asteroid-base family uses the ACTUAL authored doorway frame from audition models 3, 8 and 10.
// Only the original closed centre slab is omitted so the same opening can animate; the model's
// mounting plate, frame, pipes and rock geometry are all preserved. Canonical local +Z points inward.
