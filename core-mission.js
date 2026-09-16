'use strict';
class MissionController {
  planetaryRequirements(){
 const missionReq=campaign.currentMission?.planetaryRequirements,stageReq=campaign.currentStage?.()?.planetaryRequirements;
 return{...(missionReq&&typeof missionReq==='object'?missionReq:{}),...(stageReq&&typeof stageReq==='object'?stageReq:{})}
}
  moonColourToken(value){
 const key=String(value||'').toLowerCase();
 return({green:C.g,yellow:C.y,cyan:C.c,magenta:C.m,blue:C.u,orange:C.o})[key]||null
}
  landingBodyState(atTime=time){
 if(planetLandingBody==='moon'&&planetLandingMoonIndex>=0&&planetMoons[planetLandingMoonIndex]){
   const moon=planetMoons[planetLandingMoonIndex];
   return{
     kind:'moon',moon,index:planetLandingMoonIndex,center:moonOrbitCenter(planetWorld,planetRadius,planetTilt,moon,atTime),
     radius:planetRadius*moon.radiusFactor,tilt:planetTilt+moon.axisOffset,col:moon.col,spin:moon.spin0+atTime*moon.spinSpeed
   }
 }
 return{kind:'planet',center:[...planetWorld],radius:planetRadius,tilt:planetTilt,col:planetLandingColour,spin:planetSpin0+atTime*.075}
}
  captureApproachSystem(atTime=time){
 const bodies=[{kind:'planet',center:camPoint(planetWorld),radius:planetRadius,tilt:planetTilt,col:planetLandingColour,spin:planetSpin0+atTime*.075,target:planetLandingBody==='planet'}];
 for(let i=0;i<planetMoons.length;i++){
   const m=planetMoons[i],worldCenter=moonOrbitCenter(planetWorld,planetRadius,planetTilt,m,atTime);
   bodies.push({kind:'moon',center:camPoint(worldCenter),radius:planetRadius*m.radiusFactor,tilt:planetTilt+m.axisOffset,col:m.col,spin:m.spin0+atTime*m.spinSpeed,target:planetLandingBody==='moon'&&i===planetLandingMoonIndex})
 }
 return bodies
}
  planetAimAngles(){
 const target=this.landingBodyState(),dx=target.center[0]-shipX,dy=target.center[1]-shipY,dz=target.center[2];
 const yaw=Math.atan2(dx,dz);
 const flat=Math.hypot(dx,dz);
 const pitch=Math.atan2(-dy,flat);
 return{yaw,pitch};
}
  resetPlanetBearing(){
 approachP=0;approachLocked=false;approachAlignT=0;approachLockT=0;approachStartCamCenter=[0,0,112];
 // Keep the planet naturally off-axis during combat and the opening part of the approach.
 // Autopilot does not immediately drag it into the centre of the screen.
 const side=Math.random()<.5?-1:1;
 planetWorld=[side*(20+Math.random()*13),(Math.random()-.5)*22,112];
 planetRadius=6.1;
 // A much wider axis orientation means the eventual contact point is not visually
 // the same pole on every run.
 planetTilt=(Math.random()<.5?-1:1)*(.48+Math.random()*.92);
 planetSpin0=Math.random()*Math.PI*2;
 const req=this.planetaryRequirements(),landingBody=String(req.landingBody||'planet').toLowerCase();
 planetLandingBody=landingBody==='moon'?'moon':(landingBody==='either'?(Math.random()<.5?'moon':'planet'):'planet');planetLandingMoonIndex=-1;
 const requiredLandingColour=this.moonColourToken(req.landingColour);planetLandingColour=planetLandingBody==='planet'?(requiredLandingColour||C.g):C.g;
 const moonCount=req.moonCount&&typeof req.moonCount==='object'?req.moonCount:{};
 const minMoons=planetLandingBody==='moon'?Math.max(1,Math.round(Number(moonCount.min)||1)):Math.max(0,Math.round(Number(moonCount.min)||0));
 const maxMoons=Math.max(minMoons,Math.min(2,Math.round(Number(moonCount.max)||2)));
 const requiredMoonColour=planetLandingBody==='moon'?requiredLandingColour:null;
 // Ordinary space backdrops may have zero, one or (rarely) two moons. A mission
 // may instead require a moon destination; in that case at least one moon exists
 // and its authored colour is exact rather than a random visual preference.
 planetMoons=createMoonSystem({oneChance:.42,twoChance:.10,minCount:minMoons,maxCount:maxMoons,landingTarget:planetLandingBody==='moon',landingColour:requiredMoonColour});
 if(planetLandingBody==='moon'&&planetMoons.length){
   planetLandingMoonIndex=0;
   const targetMoon=planetMoons[0];
   targetMoon.landingTarget=true;if(requiredMoonColour)targetMoon.col=requiredMoonColour;
   // Start a destination moon clearly beside its parent rather than hidden directly
   // in front of/behind the planetary disc. Bias it toward screen centre so both
   // bodies read as one system during the orbital combat stage.
   const inward=planetWorld[0]>0?-1:1;
   targetMoon.phase=inward*Math.PI*.5+(Math.random()-.5)*.18;
   targetMoon.radiusFactor=Math.max(.19,targetMoon.radiusFactor);
 }
 // Pick which part of the limb the ship will descend toward. Zero is the old
 // straight-over-the-pole path; keep well away from zero most of the time.
 const ls=Math.random()<.5?-1:1;
 landingAzimuth=ls*(.22+Math.random()*.52);
 approachSteerDelay=1.15+Math.random()*1.35;
 const target=this.landingBodyState();
 approachTargetRadius=target.radius;approachTargetTilt=target.tilt;approachTargetCol=target.col;approachTargetSpin0=target.spin;approachSystemLock=[];
 const a=planetAimAngles();
 approachTurnTargetYaw=a.yaw;
 approachTurnTargetPitch=a.pitch;
}
  startEvent(limit=99){
    if(!scenarioFlow.currentStageAllowsSpaceCombat())return;
 if(phase==='space'&&interceptorsDestroyed>=interceptorGoal&&!freezeObjectives)return;
 const live=fighters.filter(f=>!f.dead&&!f.dying).length;
 const need=Math.max(0,activeFighterCap()-live);
 const allowed=freezeObjectives?need:Math.min(need,fighterReservesRemaining());
 const count=Math.min(allowed,limit===99?allowed:Math.max(0,limit));
 const reserveWave=(fighterGroupSpawned||0)>0;
 const customsDrones=scenarioFlow?.encounterProfile==='customs'||jackalDelivery?.customsActive?.()||false;
 const rogueDrones=scenarioFlow?.encounterProfile==='rogue';
 const droneEncounter=customsDrones||rogueDrones;
 const xenoforms=scenarioFlow?.encounterProfile==='xeno';
 const bugMeshes=globalThis.AgentXSpaceBugs?.meshes||{};
 for(let i=0;i<count;i++){
   const style=chooseDogfightStyle();
   const rosterIndex=fighterGroupSpawned+i;
   const bugKind=xenoforms?((rosterIndex%3===2)?'larva':'hornet'):'';
   const bugMesh=bugKind?bugMeshes[bugKind]:null;
   const hp=bugKind==='hornet'?10:(bugKind==='larva'?14:currentFighterHP);
   const f={
     id:actorId++,type:'fighter',bugKind,bugAnimPhase:bugKind?Math.random()*Math.PI*2:0,pts:[],t:0,dur:6,s:bugKind==='hornet'?1.68:(bugKind==='larva'?2.12:1.0+Math.random()*.10),rot:[0,0,0],
     x:0,y:0,z:60,hp,maxHp:hp,damageSeed:Math.random()*10000,hitFx:0,col:bugKind==='hornet'?C.y:(bugKind==='larva'?C.g:(customsDrones?C.u:(rogueDrones?C.m:((eventIndex+i)%6===0?C.y:C.g)))),
     nextShot:.28,shotsLeft:0,pursuitReturnFireCD:0,
     mesh:bugMesh||(droneEncounter?scenarioFlow.pickCustomsDrone(rosterIndex):pickEnemyFighterMesh()),
     hullName:'',
     bank:0,dead:false,offscreenT:0,recycles:0,exiting:false,
     dogfightStyle:style,dogfightState:'background',egressT:0,
     threatT:0,evasionCD:0,evadePendingT:0,evadePendingStrength:0,evadePendingKind:'',
     jinkAge:0,jinkDur:0,jinkAmp:0,jinkSide:1,jinkVert:0,jinkRight:null,jinkUp:null,damageHits:[],
     pursuitAcquireT:0,pursuitStrength:0,pursuitBreakUsed:false,pursuitBreakStart:0,pursuitBreakDuration:0,lastBreakSide:0,lastBreakVert:0,
     route:[],routeIndex:0,routeState:'',routeAge:0,routeSpeed:0,routeTurnRate:0,attackAge:0
   };
   f.hullName=f.mesh?.name||'Legacy Fighter';
   fighters.push(f);fighterGroupSpawned++;
   // The opening cast establishes the battle visually. Later reserves join as
   // purposeful attack entries rather than spending a pass meandering in front.
   if(reserveWave)beginAggressorPass(f,true,.24+i*.18+Math.random()*.55);
   else prepareBackgroundPass(f,.12+i*.24+Math.random()*.38);
 }
 eventIndex+=count;
}
  beginApproach(){
 if(!objectiveAdvanceAllowed())return;
 if(spaceFreeOrientationActive()){ensureSpaceOrientation();syncEulerFromSpaceOrientation()}
 spaceOrientationReady=false;
 resetSpaceDogfightDirector();
 spaceYawVel=spacePitchVel=0;
 // First coast with the planet wherever it naturally is in the view. Autopilot only
 // begins its turn after a short random delay, so the approach does not start by
 // snapping the planet dead-centre.
 mode='approach';modeT=0;shots.length=0;playerMissiles.length=0;approachSteerDelay=1.15+Math.random()*1.35;
 for(const f of fighters){
   if(f.dead||f.dying)continue;
   if(f.t<0){f.dead=true;continue}
   if(!f.exiting){
     // Preserve the actual physical heading from combat. The old spline sampler
     // could point somewhere unrelated once v140 stopped pinning fighters to it.
     const t=fighterMotionTangent(f),speed=Math.max(18,Math.hypot(f.vx||0,f.vy||0,f.vz||0));
     f.vx=t[0]*speed;f.vy=t[1]*speed;f.vz=t[2]*speed;orientFighter(f);
   }
   const rdx=f.x-shipX,rdz=f.z,rl=Math.hypot(rdx,rdz)||1,boost=12+Math.random()*5;
   f.vx=(f.vx||0)+rdx/rl*boost;f.vz=(f.vz||0)+rdz/rl*boost;
   f.exiting=true;f.approachPass=true;f.shotsLeft=0;
 }
 approachP=0;approachLocked=false;approachAlignT=0;approachLockT=0;
 const target=this.landingBodyState();
 approachStartCamCenter=camPoint(target.center);approachTargetRadius=target.radius;approachTargetTilt=target.tilt;approachTargetCol=target.col;approachTargetSpin0=target.spin;approachSystemLock=[];
 const a=planetAimAngles();
 approachTurnTargetYaw=a.yaw;
 approachTurnTargetPitch=a.pitch;
 SoundFX.zoom();
 // Planet and moon descents use separate recordings so the spoken destination is exact.
 if(planetLandingBody==='moon')audio.playVoice('descendingToMoon',{once:true,priority:true});else audio.playVoice('descending')
}
  beginSurface(){
 // The bunker recovery operation continues after extraction: the first
 // surface-to-space zoom resolves beside the orange OSD destination planet and
 // the normal approach then hands into the OSD plains rather than the legacy
 // deep-core surface battle.
 if(bunkerRaid?.active&&bunkerRaid.raidState==='osdDescent'){
   bunkerRaid.beginOsdPlains();return
 }
 // The simulator's final run is a single continuous stage: the normal approach
 // hands directly to its stripped-down navigation surface rather than completing a module.
 if(campaign.currentMission?.training&&campaign.currentStage?.()?.tutorialFinalRun&&tutorialFinalRun.isActive()){
   tutorialFinalRun.beginSurface();return
 }
 // v209: Red Jackal's planet descent is a cinematic hand-off inside one mission
 // stage. If the player reached it via Skip to next stage, preserve that one-shot
 // cheat permission until this delayed hand-off actually occurs. Otherwise a
 // checked Freeze objectives box strands the ship at the end of the approach.
 if(campaign.currentMission&&campaign.currentStage()?.type==='planet_descent'){
   if(!objectiveAdvanceAllowed())return;
   scenarioFlow.completeCurrentStage();
   return
 }
 // Legacy v204-v214 cached Red Jackal stage adapter.
 if(jackalDelivery?.active&&campaign.currentStage()?.type==='jackal_party_delivery'&&jackalDelivery.state==='descent'){
   if(!objectiveAdvanceAllowed()&&!jackalDelivery.forceDescentAdvance)return;
   jackalDelivery.forceDescentAdvance=false;jackalDelivery.beginCity();return
 }
 if(!objectiveAdvanceAllowed())return;
 spaceOrientationReady=false;
 spaceYawVel=spacePitchVel=0;
 // Open surface flight begins in a genuine ground-plane world. The approach attitude
 // is preserved, but yaw is now an unrestricted heading rather than a corridor offset.
 mode='play';phase='surface';phaseT=0;modeT=0;travel=0;
 surfaceNeutralYaw=viewYaw;surfaceNeutralPitch=viewPitch;
 inputX=inputY=aimX=aimY=0;surfaceVX=0;surfaceVY=0;surfaceDistance=0;
 surfaceSpawn=.2;shots.length=0;playerMissiles.length=0;fighters.length=0;groundTargets.length=0;bolts.length=0;hazards.length=0;

 // The destination bunker does not exist as a reachable foreground object while the
 // player is hunting pylons. It is activated later, after the shield objective.
 surfaceBunkerActive=false;entryBunkerWorldZ=Infinity;entryBunkerX=0;
 tunnelOriginX=0;tunnelStartWorld=Infinity;

 // Seven shield pylons give the player some choice, but five still provide maximum
 // bunker weakening. Each pylon has a nearby red gun so attacking one is a short
 // gauntlet rather than an undefended two-hit pickup.
 for(let i=0;i<SURFACE_PYLON_COUNT;i++){
   const a=viewYaw+i*Math.PI*2/SURFACE_PYLON_COUNT+(Math.random()-.5)*.16;
   const dist=70+(i%3)*18+Math.random()*12;
   const gx=shipX+Math.sin(a)*dist,gwz=travel+Math.cos(a)*dist;
   groundTargets.push({
     type:'tower',worldZ:gwz,x:gx,y:-3.45,z:gwz-travel,
     s:.82+Math.random()*.08,my:1.62,hp:999,capHp:2,capHitFx:0,
     capDead:false,capDying:0,doorPylon:true,persistent:true,capCol:C.y,
     rot:[0,Math.random()*3.14,0],col:C.g,mesh:towerBodyMesh,
     dead:false,shot:false,passed:false
   });

   const escortA=a+(Math.random()<.5?-1:1)*(.10+Math.random()*.08);
   const escortDist=dist+10+Math.random()*8;
   const ex=shipX+Math.sin(escortA)*escortDist,ewz=travel+Math.cos(escortA)*escortDist;
   groundTargets.push({
     type:'surfacegun',worldZ:ewz,x:ex,y:-3.45,z:ewz-travel,
     s:.66+Math.random()*.10,hp:3,hitFx:0,rot:[0,Math.random()*3.14,0],
     col:C.r,mesh:turretMesh,dead:false,shot:false,passed:false,pylonEscort:true
   });
 }

 // Seed the open plain with plenty of activity. Red guns dominate, bunkers are less
 // common, and ordinary towers remain the rarest installation class.
 for(let i=0;i<40;i++){
   const a=Math.random()*Math.PI*2,dist=58+Math.random()*125;
   const gx=shipX+Math.sin(a)*dist,gwz=travel+Math.cos(a)*dist,kind=Math.random();
   let g;
   if(kind<.07)g={type:'tower',worldZ:gwz,x:gx,y:-3.45,z:gwz-travel,s:.78+Math.random()*.10,my:1.58,hp:999,capHp:3,capHitFx:0,capDead:false,capDying:0,doorPylon:false,capCol:C.y,rot:[0,Math.random()*3.14,0],col:C.g,mesh:towerBodyMesh,dead:false,shot:false,passed:false};
   else if(kind<.86)g={type:'surfacegun',worldZ:gwz,x:gx,y:-3.45,z:gwz-travel,s:.65+Math.random()*.13,hp:3,hitFx:0,rot:[0,Math.random()*3.14,0],col:C.r,mesh:turretMesh,dead:false,shot:false,passed:false};
   else g={type:'bunker',worldZ:gwz,x:gx,y:-3.45,z:gwz-travel,s:.78+Math.random()*.11,hp:4,hitFx:0,rot:[0,Math.random()*3.14,0],col:C.r,mesh:bunkerMesh,dead:false,shot:false,passed:false};
   groundTargets.push(g)
 }

 bunkerDoorHp=BUNKER_DOOR_BASE_HP;bunkerDoorOpen=false;doorFlash=0;doorBreachAt=-1;doorBreachPending=0;doorPylonsDestroyed=0;reactorBoundaryWorld=escapeBoundaryWorld=exitDoorWorld=Infinity;reactorAnnounced=false;
 surfacePylonVoicePlayed=false;
}
  activateSurfaceBunker(){
 if(surfaceBunkerActive)return;
 surfaceBunkerActive=true;
 // Put the eventual tunnel axis safely ahead in global +Z. The player can turn toward
 // it freely; once close and lined up, the existing smooth bunker autopilot takes over.
 entryBunkerWorldZ=travel+260;
 entryBunkerX=shipX+(Math.random()-.5)*70;
 tunnelOriginX=entryBunkerX;tunnelStartWorld=entryBunkerWorldZ+.65;
 say('HEAD FOR BUNKER',1.0)
}
  beginTrenchEntry(){
 if(!objectiveAdvanceAllowed())return;
 aimX=inputX;aimY=inputY;
 mode='trenchEntry';modeT=0;bolts.length=0;hazards.length=0;doorPieces.length=0;inputX=inputY=0;shots.length=0;playerMissiles.length=0;

 // Never move an already-existing bunker when autopilot starts. v46 still had an
 // old <=50-unit fallback here, which teleported a bunker from 118 to 44 units.
 if(!Number.isFinite(entryBunkerWorldZ)){
   entryBunkerWorldZ=travel+150;
   entryBunkerX=shipX;
   tunnelOriginX=entryBunkerX;
   tunnelStartWorld=entryBunkerWorldZ+.65;
 }

 // Capture one continuous intercept curve. Position comes from this path rather
 // than repeatedly lerping toward the doorway, so there is no elastic/rubber-band
 // correction and no late sideways snap.
 entryAutoStartTravel=travel;
 entryAutoStartX=shipX;entryAutoStartY=shipY;
 entryAutoStartVX=surfaceVX;entryAutoStartVY=surfaceVY;
 entryAutoDistance=Math.max(1,entryBunkerWorldZ-travel);
 entryAutoVX=entryAutoStartVX;entryAutoVY=entryAutoStartVY;

 if(tutorialFinalRun.isActive()){
   // Training demonstrates destination autopilot, not bunker-door combat. Open the
   // simulator door as autopilot takes control and fly through the real doorway.
   bunkerDoorOpen=true;bunkerDoorHp=0;doorBreachPending=0;doorBreachAt=modeT;
 }else{
   if(bunkerDoorHp<=0&&!bunkerDoorOpen)bunkerDoorHp=BUNKER_DOOR_BASE_HP;
   if(bunkerRaid.active&&bunkerRaid.bunkerMode)audio.playVoice('breachTheBunker',{once:false,priority:true});else audio.playVoice('breachBunker')
 }
}
  beginTrench(){
 if(!objectiveAdvanceAllowed())return;
 const tutorialRun=tutorialFinalRun.isActive();
 mode='play';phase='trench';phaseT=0;modeT=0;trenchSpawn=tutorialRun?999:.45;trenchHaz=tutorialRun?2.35:lerp(2.45,.7,clamp((level-1)/4,0,1));groundTargets.length=0;bolts.length=0;hazards.length=0;inputX=inputY=aimX=aimY=0;viewYaw=viewPitch=viewRoll=0;shipX=tunnelOriginX;shipY=-2.2;shots.length=0;playerMissiles.length=0;reactorHits=0;reactorAnnounced=false;
 reactorBoundaryWorld=travel+188;escapeBoundaryWorld=reactorBoundaryWorld+86;exitDoorWorld=escapeBoundaryWorld+105;
 const rw=reactorBoundaryWorld+38;groundTargets.push({type:'reactor',worldZ:rw,x:tunnelOriginX,y:-2.2,z:rw-travel,s:1.0,hp:tutorialRun?1:4,rot:[0,0,0],col:C.r,mesh:cubeMesh,mx:.55,my:2.7,mz:.55,dead:false,flash:0,active:false});
 if(tutorialRun)tutorialFinalRun.onTunnelBegin();else say('TUNNEL RUN',.6)
}
  beginReactorApproach(){
 if(!objectiveAdvanceAllowed())return;
 mode='play';phase='trench';phaseT=0;modeT=0;groundTargets.length=0;bolts.length=0;hazards.length=0;reactorHits=0;reactorAnnounced=false;
 if(!Number.isFinite(tunnelStartWorld))tunnelStartWorld=travel;tunnelOriginX=shipX;
 reactorBoundaryWorld=travel+48;escapeBoundaryWorld=reactorBoundaryWorld+92;exitDoorWorld=escapeBoundaryWorld+105;const rw=reactorBoundaryWorld+38;
 groundTargets.push({type:'reactor',worldZ:rw,x:tunnelOriginX,y:-2.2,z:rw-travel,s:1.0,hp:4,rot:[0,0,0],col:C.r,mesh:cubeMesh,mx:.55,my:2.7,mz:.55,dead:false,flash:0,active:false});say('REACTOR SECTION AHEAD',.7)
}
  beginReactor(){
 if(!objectiveAdvanceAllowed())return;
 mode='play';phase='reactor';phaseT=0;modeT=0;reactorHits=0;groundTargets.length=0;bolts.length=0;hazards.length=0;reactorBoundaryWorld=travel-1;escapeBoundaryWorld=travel+50;exitDoorWorld=escapeBoundaryWorld+105;
 const tutorialRun=tutorialFinalRun.isActive();
 const rw=travel+26;groundTargets.push({type:'reactor',worldZ:rw,x:tunnelOriginX,y:-2.2,z:26,s:1.0,hp:tutorialRun?1:4,rot:[0,0,0],col:C.r,mesh:cubeMesh,mx:.55,my:2.7,mz:.55,dead:false,flash:0,active:true});reactorAnnounced=true;if(tutorialRun)tutorialFinalRun.onReactorReached();else audio.playVoice('destroyReactorAhead',{once:true,priority:true})
}
  failReactor(){say('REACTOR INTACT',.7);beginEscape(false)
}
  beginEscape(success=true){
 if(!objectiveAdvanceAllowed())return;
 mode='play';phase='escape';phaseT=0;modeT=0;trenchHaz=lerp(1.95,.65,clamp((level-1)/4,0,1));groundTargets.length=0;bolts.length=0;hazards.length=0;shots.length=0;playerMissiles.length=0;if(!Number.isFinite(escapeBoundaryWorld)||relZ(escapeBoundaryWorld)<8)escapeBoundaryWorld=travel+50;if(!Number.isFinite(exitDoorWorld)||relZ(exitDoorWorld)<60)exitDoorWorld=escapeBoundaryWorld+105;exitDoorOpen=false;say(success?'ESCAPE!':'EMERGENCY EXIT',.7)
}
  beginExitDoor(){
 if(!objectiveAdvanceAllowed())return;
 mode='exitDoor';modeT=0;shots.length=0;playerMissiles.length=0;if(!Number.isFinite(exitDoorWorld))exitDoorWorld=travel+46;exitDoorOpen=false;
 // This should normally already be empty because of EXIT_SPAWN_CUTOFF. The filter
 // is a safety net for cheat-jumps or unusually timed legacy hazards: autopilot must
 // never inherit an obstacle between the ship and the exit door.
 for(const h of hazards){syncWorldZ(h);if(h.worldZ<=exitDoorWorld&&h.z>0)h.dead=true}
 for(let i=hazards.length-1;i>=0;i--)if(hazards[i].dead)hazards.splice(i,1);
 bolts.length=0;
 say('EXIT AHEAD',.5)
}
  beginSurfaceExit(options={}){
 if(!objectiveAdvanceAllowed())return;
 const forestScene=options.scene==='forest'&&forest?.active,cityScene=options.scene==='city'&&jackalDelivery?.active,osdScene=options.scene==='osd'&&bunkerRaid?.active;
 const keepScene=forestScene||cityScene||osdScene;
 this.surfaceExitScene=forestScene?'forest':(cityScene?'city':(osdScene?'osd':'surface'));
 this.surfaceExitContinueMission=!!options.continueMission;
 this.surfaceExitStartX=keepScene?shipX:tunnelOriginX;this.surfaceExitStartY=keepScene?shipY:-1.6;
 this.surfaceExitStartYaw=keepScene?viewYaw:0;this.surfaceExitStartPitch=keepScene?viewPitch:0;this.surfaceExitTargetX=this.surfaceExitStartX;
 mode='surfaceExit';phase=this.surfaceExitScene==='forest'?'forest':'surface';phaseT=0;modeT=0;groundTargets.length=0;bolts.length=0;hazards.length=0;shots.length=0;playerMissiles.length=0;
 shipX=this.surfaceExitStartX;shipY=this.surfaceExitStartY;inputX=inputY=0;viewYaw=this.surfaceExitStartYaw;viewPitch=this.surfaceExitStartPitch;viewRoll=0;
 if(!this.surfaceExitContinueMission&&!tutorialFinalRun.isActive())audio.playVoice('missionComplete',{once:true,priority:true})
}
  finishLaunchToSpace(){
 if(!objectiveAdvanceAllowed())return;
 if(bunkerRaid?.active&&bunkerRaid.devExitPending&&bunkerRaid.handleSurfaceExitComplete?.())return;
 if(forest?.active&&forest.devExitPending){forest.finish(true);return}
 if(campaign.currentMission){
   if(campaign.currentStage()?.type==='planet_launch'){scenarioFlow.completeCurrentStage();return}
   // A surface stage can deliberately use the canonical pitch-up/zoom as an
   // inter-stage launch. Mission 2 does this after the monolith scan before the
   // existing VOX return sequence; do not mistake that launch for mission end.
   if(this.surfaceExitContinueMission&&campaign.hasMoreStages()){
     this.surfaceExitContinueMission=false;
     scenarioFlow.completeCurrentStage();
     return
   }
   // The final simulator debrief follows the congratulatory VOX line, never cuts it off.
   if(tutorialFinalRun.isActive()&&tutorialFinalRun.completionSpeechBusy())return;
   score+=10000;
   scenarioFlow.finishAfterDeparture();
   return;
 }
 score+=10000;level++;phase='space';mode='play';phaseT=0;modeT=0;eventTimer=1.2;eventIndex=0;shield=Math.min(campaign.maxShield(),shield+1);inputX=inputY=0;spaceYawVel=spacePitchVel=0;shipX=0;shipY=.55;viewYaw=0;viewPitch=0;viewRoll=0;resetPlanetBearing();resetSpaceDogfightDirector()
}
  victory(){if(!objectiveAdvanceAllowed())return;mode='victory';modeT=0;score+=10000;groundTargets.length=bolts.length=hazards.length=shots.length=playerMissiles.length=0;say('BASE DESTROYED',1)}
  skipToNextStage(){
    cheatStageJump=true;
    try{
      if(jackalDelivery?.active){
        if(jackalDelivery.state==='customs'){
          // The descent itself takes several seconds, so keep the cheat bypass alive
          // until beginSurface() completes the city hand-off.
          jackalDelivery.forceDescentAdvance=true;
          jackalDelivery.beginPlanetRun();return true
        }
        if(jackalDelivery.state==='descent'){
          jackalDelivery.forceDescentAdvance=false;
          jackalDelivery.beginCity();return true
        }
        if(jackalDelivery.state==='city'){jackalDelivery.beginPenthouseApproach();return true}
        if(jackalDelivery.state==='autopilot'){const room=jackalDelivery.roomSpec();if(room){travel=room.frontZ-1.85;shipX=room.x;shipY=jackalDelivery.hatchY}jackalDelivery.beginRoomEntry();return true}
        if(jackalDelivery.state==='entry'){jackalDelivery.roomEntryTargetTravel=travel;jackalDelivery.update(0);return true}
        if(jackalDelivery.state==='delivery'){jackalDelivery.deliveryT=4.06;jackalDelivery.update(0);return true}
        if(jackalDelivery.state==='turn'){jackalDelivery.turnT=2.0;jackalDelivery.update(0);return true}
        if(jackalDelivery.state==='exit'){jackalDelivery.exitTargetTravel=travel;jackalDelivery.exitT=1.16;jackalDelivery.update(0);return true}
      }
      if(surfaceDestination?.active){scenarioFlow.completeCurrentStage();return true}
      if(spaceTransfer?.active){scenarioFlow.completeCurrentStage();return true}
      if(stationDelivery?.active){scenarioFlow.completeCurrentStage();return true}
      if(campaign.currentMission&&(campaign.currentStage()?.type==='urban_ground_pickup'||campaign.currentStage()?.type==='urban_exit')){scenarioFlow.completeCurrentStage();return true}
      if(campaign.currentMission){campaign.advanceCurrentMissionStage();return true}
      // Fall back to the canonical deep-core sequence when running without a campaign job.
      if(phase==='space'){beginApproach();return true}
      if(mode==='approach'){beginSurface();return true}
      if(phase==='surface'){beginTrenchEntry();return true}
      if(mode==='trenchEntry'){beginTrench();return true}
      if(phase==='trench'){beginReactorApproach();return true}
      if(mode==='reactorApproach'){beginReactor();return true}
      if(phase==='reactor'){beginEscape(true);return true}
      if(phase==='escape'){beginExitDoor();return true}
      if(mode==='exitDoor'){beginSurfaceExit();return true}
      return false
    }finally{cheatStageJump=false}
  }
  jumpTo(where){
 cheatStageJump=true;
 try{
   if(forest?.active&&where!=='forest')forest.stopForJump();
   if(surfaceDestination?.active&&where!=='destinationApproach')surfaceDestination.stopForJump();
   fighters.length=0;groundTargets.length=0;bolts.length=0;hazards.length=0;shots.length=0;playerMissiles.length=0;
   phaseT=0;modeT=0;shipX=shipY=inputX=inputY=viewYaw=viewPitch=viewRoll=0;spaceYawVel=spacePitchVel=0;
   if(where==='space'){mode='play';phase='space';eventIndex=0;eventTimer=.05;inputX=inputY=viewYaw=viewPitch=viewRoll=0;resetPlanetBearing();resetSpaceDogfightDirector();startEvent()}
   else if(where==='approach'){phase='space';if(!Number.isFinite(approachBiasYaw))resetPlanetBearing();beginApproach()}
   else if(where==='surface'){beginSurface()}
   else if(where==='forest'){forest.begin()}
   else if(where==='recovery'){salvageRecovery.beginTest()}
   else if(where==='trenchEntry'){phase='surface';beginTrenchEntry()}
   else if(where==='escape'){phase='escape';beginEscape()}
   else if(where==='exitDoor'){beginExitDoor()}
   else if(where==='surfaceExit'){beginSurfaceExit()}
   else if(where==='trench'){beginTrench()}
   else if(where==='reactorApproach'){beginReactorApproach()}
   else if(where==='reactor'){phase='reactor';beginReactor()}
   document.body.classList.add('playing');
 }finally{cheatStageJump=false}
}
}

