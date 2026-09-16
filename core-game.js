'use strict';
class Game {
  reset({deferMissionStart=false}={}){
    cancelAbandonHold();if(abandonBlockedTimer){clearTimeout(abandonBlockedTimer);abandonBlockedTimer=0}
    if(deathDebriefTimer){clearTimeout(deathDebriefTimer);deathDebriefTimer=0}
    deathFxStart=0;last=performance.now();
    document.body.classList.add('playing');
    document.body.classList.remove('paused','cheating');
    level=Math.max(1,Number(level)||1);
    mode='play';phase='space';time=phaseT=modeT=0;score=0;shield=campaign.maxShield();shieldRegenDelay=0;shieldRegenTick=0;shieldRestoreFlashIndex=-1;shieldRestoreFlashT=0;clearTutorialHud();paused=false;
    inputX=inputY=aimX=aimY=viewYaw=viewPitch=viewRoll=shipX=shipY=0;
    spaceYawVel=spacePitchVel=0;surfaceVX=surfaceVY=0;
    surfaceNeutralYaw=surfaceNeutralPitch=0;
    surfaceBunkerActive=false;surfaceDistance=0;surfacePylonVoicePlayed=false;
    starTravel=0;resetSpaceMotion();
    fireHeld=false;laserBurstRemaining=0;laserTriggerLatched=false;shotCD=0;
    shake=flash=0;eventIndex=0;eventTimer=.08;
    interceptorsDestroyed=0;interceptorClearDelay=0;
    fighterGroupTotal=interceptorGoal||INTERCEPTOR_GOAL;fighterGroupSpawned=0;
    surfaceSpawn=.2;trenchSpawn=.5;trenchHaz=.8;
    reactorHits=0;reactorTimeout=0;
    fighters.length=asteroids.length=groundTargets.length=bolts.length=
      shots.length=playerMissiles.length=sparks.length=fragments.length=hazards.length=0;
    asteroidField.active=false;asteroidField.state='idle';
    bunkerDoorHp=0;bunkerDoorOpen=false;doorFlash=0;
    doorBreachAt=-1;doorBreachPending=0;doorPylonsDestroyed=0;
    doorPieces.length=0;exitDoorOpen=false;escapeSpawn=.55;lastSurfaceX=999;
    entryBunkerX=(Math.random()<.5?-1:1)*(2.2+Math.random()*2.6);
    travel=0;entryBunkerWorldZ=Infinity;tunnelStartWorld=0;tunnelOriginX=0;
    reactorBoundaryWorld=escapeBoundaryWorld=exitDoorWorld=Infinity;
    reactorAnnounced=false;
    resetPlanetBearing();resetSpaceMotion();
    resetSpaceDogfightDirector();
    forest.reset();
    surfaceDestination.reset();
    tutorialFinalRun.reset();
    courier.reset();
    jackalDelivery.reset();
    stationDelivery.reset();
    stationHack.reset();
    securityCheckpoint.reset();
    salvageRecovery.reset();
    spaceTransfer.reset();
    bunkerRaid.reset();

    if(!deferMissionStart){
      startEvent();
      say('FIGHTERS INBOUND',.7)
    }

    canvas.focus()
  }
  damage(msg){
 // Wreck entry/download/turn is forced autopilot. No gameplay collision source
 // (wreck shell, debris, asteroid stream, projectile, etc.) may drain shields while
 // the player has no steering authority. This is deliberately central rather than
 // relying on every individual hazard system to remember to suppress its own hit.
 if(typeof asteroidWreckRun!=='undefined'&&asteroidWreckRun?.damageSuppressed?.())return;
 if(invulnerable){say('HIT BLOCKED',.25);return}
 // Simulator consumables lesson has a hard one-shield safety floor. Once the
 // exercise has demonstrated critical shields, further incoming hits cannot destroy
 // Tutorial safety floors teach recovery/withdrawal without allowing the
 // exercise itself to destroy the training drone.
 const consumablesFloor=typeof tutorialConsumables!=='undefined'&&tutorialConsumables.protectShieldFloor();
 const abandonFloor=typeof tutorialAbandon!=='undefined'&&tutorialAbandon.protectShieldFloor();
 const finalRunFloor=typeof tutorialFinalRun!=='undefined'&&tutorialFinalRun.protectShieldFloor();
 if((consumablesFloor||abandonFloor||finalRunFloor)&&shield<=1)return;
 SoundFX.damageTaken();
 const regen=campaign.shieldRegeneration();shieldRegenDelay=regen?.delay||0;shieldRegenTick=0;shieldRestoreFlashIndex=-1;shieldRestoreFlashT=0; // every hit wipes all partial regeneration
 shield--;
 if(shield===2&&!(typeof tutorialConsumables!=='undefined'&&tutorialConsumables.isActive()))audio.playVoice('shieldsLow',{once:true,priority:true});
 if(shield===0)audio.playVoice('shieldsDepleted',{once:true,priority:true});
 if(shield<0){
   cancelAbandonHold();shield=0;shake=0;flash=0;mode='dead';deathFxStart=performance.now();deathFxSeed=Math.random()*10000;
   // Procedural Tesla audio is owned by AudioManager, not SoundFX.disconnect().
   // Tear it down synchronously on death so a latched perimeter buzz cannot survive
   // into the death/debrief screen.
   audio?.teslaBuzz?.destroy?.();
   SoundFX.disconnect();
   document.body.classList.remove('playing','paused');
   statusHold=0;messageEl.textContent='';clearTutorialHud();campaign.updateGearHud();
   if(deathDebriefTimer)clearTimeout(deathDebriefTimer);
   deathDebriefTimer=setTimeout(()=>{
     deathDebriefTimer=0;
     if(mode!=='dead')return;
     if(campaign.currentMission?.devTest&&scenarioFlow?.developmentRun){scenarioFlow.finishDevelopmentMission(false,'Drone destroyed');return}
     if(surfaceDestination?.freeFlight){surfaceDestination.stopForJump();mode='idle';phase='space';campaign.showHub('dev');return}
     if(xenoNest.active){xenoNest.finish(false);return}
     if(forest?.active){forest.finish(false);return}
     if(campaign.currentMission)campaign.failCurrentMission('Drone destroyed');
     else campaign.showHub('missions');
   },960);
   return
 }
 flash=.12;say(msg,.45);shake=5
}
  update(dt){
 if(paused)return;if(statusHold>0){statusHold-=dt;if(statusHold<=0)hud()}if(mode==='idle'||mode==='dead')return;
 updatePlayerMissiles(dt);
 time+=dt;modeT+=dt;shotCD=Math.max(0,shotCD-dt);playerGunKick=Math.max(0,playerGunKick-dt);flash=Math.max(0,flash-dt);
 speechSubtitleT=Math.max(0,speechSubtitleT-dt);if(speechSubtitleT<=0)speechSubtitleText='';
 tutorialAnnouncementT=Math.max(0,tutorialAnnouncementT-dt);if(tutorialAnnouncementT<=0)tutorialAnnouncementText='';
 shieldRestoreFlashT=Math.max(0,shieldRestoreFlashT-dt);if(shieldRestoreFlashT<=0)shieldRestoreFlashIndex=-1;
 if(mode==='simulatorCut'){scenarioFlow.updateSimulatorCut();updateEffects(dt);return}
 if(updateAbandonHold(dt))return;
 const regen=campaign.shieldRegeneration();
 if(regen&&shield<campaign.maxShield()){
   if(shieldRegenDelay>0)shieldRegenDelay=Math.max(0,shieldRegenDelay-dt);
   else{
     shieldRegenTick+=dt;
     if(shieldRegenTick>=regen.interval){shieldRegenTick=0;shield=Math.min(campaign.maxShield(),shield+1);shieldRestoreFlashIndex=shield-1;shieldRestoreFlashT=.18;say('SHIELD REPAIRED',.32);hud()}
   }
 }else shieldRegenTick=0;
 starTravel+=starSpeedNow()*dt;
 const fwd=forwardSpeed();travel+=fwd*dt;
 if(tutorialFinalRun.isActive())tutorialFinalRun.update(dt);

 if(mode==='abandonExit'){
   // Simulator abandonment lesson uses the genuine escape zoom but deliberately
   // holds at full streak speed instead of returning to base / recording a failure.
   if(campaign.currentMission?.training&&campaign.currentStage?.()?.tutorialAbandon){
     if(modeT>=ABANDON_EXIT_SECONDS)modeT=ABANDON_EXIT_SECONDS;
     tutorialAbandon.updateZoomHold(dt);
     updateEffects(dt);return
   }
   if(modeT>=ABANDON_EXIT_SECONDS){campaign.abandonCurrentMission('Contract abandoned');return}
   updateEffects(dt);return
 }
 if(mode==='missionTransit'){
   missionTransit.update(dt);
   updateEffects(dt);
   return
 }
 if(mode==='spaceTransfer'){
   spaceTransfer.update(dt);
   updateEffects(dt);
   return
 }
 if(mode==='missionExit'){
   const z=missionEndZoomProgress();
   inputX=moveToward(inputX,0,dt*7);inputY=moveToward(inputY,0,dt*7);
   viewYaw=moveToward(viewYaw,0,dt*3.8);viewPitch=moveToward(viewPitch,0,dt*3.8);viewRoll=moveToward(viewRoll,0,dt*4.6);
   if(modeT>=MISSION_END_ZOOM_TIME){scenarioFlow.finishAfterDeparture();updateEffects(dt);return}
   updateEffects(dt);return
 }
 if(salvageRecovery.active&&salvageRecovery.state==='pickup'){
   salvageRecovery.update(dt);updateEffects(dt);return
 }
 if(bunkerRaid?.active&&bunkerRaid.raidState==='osdSpace'&&phase==='space'&&mode==='play'){
   phaseT+=dt;bunkerRaid.updateOsdSpace(dt);updateEffects(dt);return
 }
 if(bunkerRaid?.active&&bunkerRaid.raidState==='osdDelivery'&&mode==='osdDelivery'){
   phaseT+=dt;bunkerRaid.updateOsdDelivery(dt);updateEffects(dt);return
 }

 if(mode!=='approach'&&mode!=='trenchEntry'&&mode!=='surfaceExit'&&mode!=='exitDoor'&&mode!=='asteroidExit'&&mode!=='missionExit'&&mode!=='spaceTransfer'&&mode!=='securityCheckpoint'&&mode!=='recoveryPickup'&&mode!=='courierDock'&&mode!=='courierDelivery'&&mode!=='courierTurn'&&mode!=='courierExitZoom'&&mode!=='bunkerCircuitryPickup'&&mode!=='bunkerTurn'&&mode!=='bunkerSurfaceClear'&&mode!=='osdDelivery'&&mode!=='jackalPenthouse'&&mode!=='jackalDelivery'&&mode!=='jackalExitZoom'&&mode!=='urbanPickupAuto'&&mode!=='urbanTurn'&&mode!=='stationEntry'&&mode!=='stationInterior'&&mode!=='stationDeparture'&&!(xenoNest.active&&xenoNest.state==='doorApproach')&&!asteroidWreckRun?.autopilotActive?.()&&!freeTradersDepot?.autopilotActive?.())updateSteering(dt);
 if(mode==='play'&&(phase==='space'||phase==='asteroids'||phase==='courierMine'||phase==='xenoNest')&&!asteroidWreckRun?.autopilotActive?.()&&!freeTradersDepot?.autopilotActive?.())updateSpaceMotion(dt);
 if(salvageRecovery.active&&salvageRecovery.state==='search'){
   salvageRecovery.update(dt);if(mode==='recoveryPickup'){updateEffects(dt);return}
 }
 // After station-defence wreckage recovery, the same controller owns the entire
 // terminal return sequence.  Previously the main loop only dispatched it while
 // state==='search', so changing to terminalNav froze the physical station in place:
 // the player could point at Relay 10 forever but never close the distance.
 const salvageTerminalFlow=salvageRecovery.active&&(
   salvageRecovery.state==='terminalNav'||
   salvageRecovery.state==='terminalApproach'||
   salvageRecovery.state==='terminalTransfer'||
   salvageRecovery.state==='terminalHold'||
   salvageRecovery.state==='terminalTurn'||
   salvageRecovery.state==='terminalClear'
 );
 if(salvageTerminalFlow){salvageRecovery.update(dt);updateEffects(dt);return}
 if(laserBurstRemaining>0)shoot();
 if(salvageRecovery.active&&salvageRecovery.state==='search'){updateEffects(dt);return}
 if(xenoNest.active){
   phaseT+=dt;xenoNest.update(dt);updateEffects(dt);return
 }
 if(phase==='asteroids'&&(mode==='play'||mode==='asteroidExit')){
   phaseT+=dt;
   if(asteroidWreckRun?.active){
     // Missing Manifest composes the EXISTING asteroid-field mechanism. Let its
     // sequencing controller run here rather than swallowing the asteroid update.
     asteroidWreckRun.update(dt)
   }else asteroidField.update(dt);
   updateEffects(dt);
   return
 }
 if(courier.active&&(phase==='courierMine'||phase==='courierTunnel'||phase==='courierReturn'||mode==='courierDock'||mode==='courierDelivery'||mode==='courierTurn'||mode==='courierExitZoom')){
   phaseT+=dt;courier.update(dt);updateEffects(dt);return
 }
 if(forest.active&&phase==='forest'&&mode!=='surfaceExit'){
   // Once a forest mission hands off to the canonical surface-exit sequence,
   // keep rendering the forest but stop letting CorridorEnvironmentController consume
   // the update frame. Otherwise modeT advances into the zoom while the actual
   // pitch-up code below never runs.
   phaseT+=dt;forest.update(dt);updateEffects(dt);return
 }
 if(surfaceDestination.active&&phase==='destinationApproach'){
   phaseT+=dt;surfaceDestination.update(dt);
   if(bunkerRaid?.active&&bunkerRaid.raidState==='osdApproach'&&surfaceDestination.manualComplete)bunkerRaid.beginOsdDelivery();
   updateEffects(dt);return
 }
 if(securityCheckpoint.active&&mode==='securityCheckpoint'&&phase==='space'){
   phaseT+=dt;securityCheckpoint.update(dt);updateEffects(dt);return
 }
 if(jackalDelivery.active&&phase==='jackalCity'){
   phaseT+=dt;jackalDelivery.update(dt);updateEffects(dt);return
 }
 if(stationDelivery.active&&(phase==='space'||phase==='stationInterior')){
   if(phase==='space'&&(stationDelivery.state==='bugEncounter'||stationDelivery.state==='combatEncounter')){
     stationDelivery.update(dt);if(stationHack?.active)stationHack.update(dt)
   }else{
     phaseT+=dt;stationDelivery.update(dt);if(stationHack?.active)stationHack.update(dt);updateEffects(dt);return
   }
 }
 if(freeTradersDepot?.active&&phase==='space'){
   phaseT+=dt;freeTradersDepot.update(dt);updateEffects(dt);return
 }
 if(bunkerRaid.ownsInteriorUpdate()){
   phaseT+=dt;bunkerRaid.updateInterior(dt);updateEffects(dt);return
 }
 if(mode==='trenchEntry'){
   inputX=moveToward(inputX,0,dt*3.0);inputY=moveToward(inputY,0,dt*3.0);

   const bz=Math.max(.22,entryBunkerZ());
   const D=Math.max(1,entryAutoDistance);
   const u=clamp((travel-entryAutoStartTravel)/D,0,1);
   const m0x=clamp(entryAutoStartVX/FLIGHT_SPEED,-.95,.95)*D;
   const m0y=clamp(entryAutoStartVY/FLIGHT_SPEED,-.32,.32)*D;

   shipX=hermite(entryAutoStartX,entryBunkerX,m0x,0,u);
   shipY=hermite(entryAutoStartY,-2.15,m0y,0,u);

   const dxdu=hermiteD(entryAutoStartX,entryBunkerX,m0x,0,u);
   const dydu=hermiteD(entryAutoStartY,-2.15,m0y,0,u);
   entryAutoVX=dxdu/D*FLIGHT_SPEED;
   entryAutoVY=dydu/D*FLIGHT_SPEED;

   // Look along the actual curve rather than straight at the door. This produces
   // a sweeping intercept. Near the end the spline derivative naturally reaches
   // zero, making the bunker facade front-on and the tunnel attitude level.
   const pathYaw=Math.atan2(dxdu/D,1);
   const pathPitch=Math.atan2(-(dydu/D),Math.hypot(dxdu/D,1));
   const doorDx=entryBunkerX-shipX,doorDy=-2.15-shipY;
   const directYaw=Math.atan2(doorDx,bz);
   const directPitch=Math.atan2(-doorDy,Math.hypot(doorDx,bz));

   // The ship still flies the same smooth intercept curve, but it begins bringing
   // the nose toward the actual doorway almost as soon as autopilot starts.
   // This keeps the door in a useful firing sector for most of the approach.
   const doorLook=ease(clamp((150-bz)/100,0,1));
   const targetYaw=lerp(pathYaw,directYaw,doorLook);
   const targetPitch=lerp(pathPitch,directPitch,doorLook);

   const oldYaw=viewYaw;
   viewYaw=moveToward(viewYaw,targetYaw,dt*.68);
   viewPitch=moveToward(viewPitch,targetPitch,dt*.46);
   const yawRate=(viewYaw-oldYaw)/Math.max(dt,.001);
   const desiredRoll=doorLook>.72?0:clamp(-yawRate*.46,-.31,.31);
   viewRoll=moveToward(viewRoll,desiredRoll,dt*(.78+doorLook*.85));

   // The last few metres are geometrically straight. Do not teleport or snap the
   // ship, just progressively tighten tiny residual attitude error.
   if(bz<9){
     viewYaw=moveToward(viewYaw,0,dt*1.05);
     viewPitch=moveToward(viewPitch,0,dt*.85);
     viewRoll=moveToward(viewRoll,0,dt*1.35);
   }
 }
 if(mode==='approach'){
   updateApproachFighters(dt);
   inputX=moveToward(inputX,0,dt*3.0);inputY=moveToward(inputY,0,dt*3.0);
   if(!approachLocked){
     if(modeT<approachSteerDelay){
       // Deliberately leave the planet off-centre for a moment. Only level excessive
       // combat bank; do not change heading or drag the ship back to world centre.
       viewRoll=moveToward(viewRoll,0,dt*.48);
     }else{
       const a=planetAimAngles();approachTurnTargetYaw=a.yaw;approachTurnTargetPitch=a.pitch;
       const yawErr=wrapAngle(approachTurnTargetYaw-viewYaw),pitchErr=approachTurnTargetPitch-viewPitch;
       const oldYaw=viewYaw;
       viewYaw=moveTowardAngle(viewYaw,approachTurnTargetYaw,dt*.48);
       viewPitch=moveToward(viewPitch,approachTurnTargetPitch,dt*.36);
       const yawRate=(viewYaw-oldYaw)/Math.max(dt,.001);
       viewRoll=moveToward(viewRoll,clamp(-yawRate*.52,-.34,.34),dt*.72);
       const landingTarget=mission.landingBodyState(),pp=proj(landingTarget.center),cx=W*.5,cy=viewH*.48,pixelError=pp?Math.hypot(pp.x-cx,pp.y-cy):9999;
       if(pixelError<3.5&&Math.abs(yawErr)<.012&&Math.abs(pitchErr)<.012&&Math.abs(viewRoll)<.028){
         viewYaw=approachTurnTargetYaw;viewPitch=approachTurnTargetPitch;viewRoll=0;
         approachStartCamCenter=camPoint(landingTarget.center);approachTargetRadius=landingTarget.radius;approachTargetTilt=landingTarget.tilt;approachTargetCol=landingTarget.col;approachTargetSpin0=landingTarget.spin;approachSystemLock=mission.captureApproachSystem(time);
         approachLocked=true;approachLockT=0;say(landingTarget.kind==='moon'?'MOON AHEAD':'PLANET AHEAD',.3)
       }
     }
   }else{
     viewRoll=moveToward(viewRoll,0,dt*.9);
     const accel=lerp(.085,.225,ease(approachP));approachP=clamp(approachP+dt*accel,0,1);
     if(approachP>=1){beginSurface();updateBoltsOnly(dt);updateEffects(dt);return}
   }
   updateBoltsOnly(dt);updateEffects(dt);return;
 }
 if(mode==='trenchEntry'){
   for(const g of groundTargets){
     if(g.dead||g.dying)continue;syncWorldZ(g);if(g.type==='tower')g.rot[1]+=dt*.15;
     // Preserve the bunker-assault surface battery while the player breaches the
     // door.  These guns are behind the camera here, but they must still exist so
     // beginTunnel() can snapshot them for the physically continuous return view.
     if(g.z<.25&&!(bunkerRaid.active&&bunkerRaid.bunkerMode&&g.type==='landgun'))g.dead=true
   }
   const bz=entryBunkerZ();
   if(bunkerRaid.active&&bunkerRaid.bunkerMode&&!bunkerRaid.doorReminderPlayed&&!bunkerDoorOpen&&bunkerDoorHp===3&&bz<45){
     bunkerRaid.doorReminderPlayed=true;audio.playVoice('shootBunkerDoors',{once:false,priority:true})
   }
   if(!bunkerDoorOpen&&bz<=3.0){if(modeT>1.0){damage('DOOR IMPACT');modeT=0;say('BLAST THE DOOR',.8)}}
   if(bunkerDoorOpen&&bz<=.55){
     if(bunkerRaid.active&&bunkerRaid.bunkerMode)bunkerRaid.beginTunnel();else beginTrench();
     updateEffects(dt);return
   }
   updateEffects(dt);return;
 }
 if(mode==='exitDoor'){
   inputX=lerp(inputX,0,clamp(dt*4.1,0,1));inputY=lerp(inputY,0,clamp(dt*4.1,0,1));viewYaw=lerp(viewYaw,0,clamp(dt*3.0,0,1));viewRoll=lerp(viewRoll,0,clamp(dt*3.6,0,1));viewPitch=lerp(viewPitch,0,clamp(dt*2.6,0,1));
   const c=tunnelCenter(1.0);shipX=lerp(shipX,c.x,clamp(dt*3.0,0,1));shipY=lerp(shipY,c.y,clamp(dt*3.0,0,1));tunnelPlayerClamp();
   // Existing escape obstacles keep travelling right through the exit approach.
   for(const h of hazards){if(h.dead||h.dying)continue;syncWorldZ(h);const hc=tunnelCenter(h.z);if(!h.passed&&h.z<1.45){const ok=Math.abs((shipY-hc.y)-h.y)>h.clearance;if(!ok)damage('OBSTACLE');else score+=120;h.passed=true}if(h.z<.22)h.dead=true}
   for(const b of bolts)advanceHostileBolt(b,dt)
   for(let i=hazards.length-1;i>=0;i--)if(hazards[i].dead)hazards.splice(i,1);for(let i=bolts.length-1;i>=0;i--)if(bolts[i].dead)bolts.splice(i,1);
   if(relZ(exitDoorWorld)<=.45){
     if(campaign.currentMission&&campaign.currentStage()?.type==='deep_core_surface')scenarioFlow.completeCurrentStage();
     else beginSurfaceExit();
     updateEffects(dt);return
   }updateEffects(dt);return;
 }
 if(mode==='surfaceExit'){
   if(modeT-dt<SURFACE_EXIT_PITCH_TIME&&modeT>=SURFACE_EXIT_PITCH_TIME){
     SoundFX.zoom();
     if(bunkerRaid.active&&bunkerRaid.raidState==='surfaceClear'&&!bunkerRaid.osdInstructionPlayed){
       bunkerRaid.osdInstructionPlayed=true;audio.playVoice('proceedToOsdCompound',{once:false,priority:true})
     }
   }
   const pitchT=surfaceExitPitchProgress(),zoomT=surfaceExitZoomProgress();
   if(tutorialFinalRun.isActive()&&zoomT>0)tutorialFinalRun.beginCompletionZoom();
   inputX=moveToward(inputX,0,dt*6.0);inputY=moveToward(inputY,0,dt*6.0);

   // Stage 1: climb and pitch essentially vertical at normal flight speed. The
   // starting pose belongs to the scene that just completed (plain/forest/etc.).
   viewPitch=lerp(mission.surfaceExitStartPitch,EXIT_VERTICAL_PITCH,pitchT);
   const exitYaw=mission.surfaceExitScene==='osd'?mission.surfaceExitStartYaw:0;
   viewYaw=lerp(mission.surfaceExitStartYaw,exitYaw,ease(clamp((pitchT-.45)/.55,0,1)));viewRoll=moveToward(viewRoll,0,dt*5.0);
   shipY=lerp(mission.surfaceExitStartY,mission.surfaceExitStartY+7.2,pitchT);shipX=moveToward(shipX,mission.surfaceExitTargetX,dt*3.8);
   if(pitchT>=.999){viewPitch=EXIT_VERTICAL_PITCH;viewYaw=exitYaw;viewRoll=0}

   // Stage 2: hold vertical and only now accelerate straight into the stars.
   // OSD departure keeps the heading established by the physical turn-away instead
   // of rotating back towards the compound just before launch.
   if(zoomT>0){
     viewPitch=EXIT_VERTICAL_PITCH;viewYaw=exitYaw;viewRoll=0;
     shipY=lerp(mission.surfaceExitStartY+7.2,mission.surfaceExitStartY+12.1,zoomT)
   }
   if(modeT>=SURFACE_EXIT_PITCH_TIME+SURFACE_EXIT_ZOOM_TIME){finishLaunchToSpace();updateEffects(dt);return}
   updateEffects(dt);return;
 }
 if(mode==='reactorApproach'){beginReactorApproach();updateEffects(dt);return}
 if(mode==='reactorExit'){beginEscape(false);updateEffects(dt);return}
 if(mode==='victory'){if(modeT>4.8){level++;phase='space';mode='play';phaseT=0;eventTimer=.2;eventIndex=0;shield=Math.min(campaign.maxShield(),shield+1);inputX=inputY=viewYaw=viewPitch=viewRoll=shipX=shipY=0;spaceYawVel=spacePitchVel=0;resetPlanetBearing();resetSpaceDogfightDirector();startEvent()}updateEffects(dt);return}
 if(mode!=='play')return;phaseT+=dt;
 if(asteroidWreckRun?.active){
   asteroidWreckRun.update(dt);
   if(mode!=='play'){updateEffects(dt);return}
 }
 if(phase==='space'){
   const tutorialCombatActive=typeof tutorialCombat!=='undefined'&&tutorialCombat.isActive();
   const tutorialConsumablesActive=typeof tutorialConsumables!=='undefined'&&tutorialConsumables.isActive();
   const tutorialAbandonActive=typeof tutorialAbandon!=='undefined'&&tutorialAbandon.isActive();
   const tutorialControlled=tutorialCombatActive||tutorialConsumablesActive||tutorialAbandonActive;
   const stageAllowsSpaceCombat=scenarioFlow.currentStageAllowsSpaceCombat();
   if(stageAllowsSpaceCombat&&!tutorialControlled&&(interceptorsDestroyed<interceptorGoal||freezeObjectives)){
     eventTimer-=dt;
     const live=fighters.filter(f=>!f.dead&&!f.dying).length;
     if(eventTimer<=0&&live<activeFighterCap()&&(freezeObjectives||fighterReservesRemaining()>0)){
       startEvent(activeFighterCap()-live);
       eventTimer=.70+Math.random()*.55;
     }
   }else{
     interceptorClearDelay-=dt;
   }

   if(tutorialCombatActive)tutorialCombat.update(dt);
   if(tutorialConsumablesActive)tutorialConsumables.update(dt);
   if(tutorialAbandonActive)tutorialAbandon.update(dt);
   updateSpaceTargetLock(dt);
   updateSpacePursuit(dt);

   for(const f of fighters){
     if(f.dead||f.dying)continue;
     if(tutorialCombatActive&&tutorialCombat.updateFighter(f,dt))continue;
     if(tutorialConsumablesActive&&tutorialConsumables.updateFighter(f,dt))continue;
     tickFighterEvasion(f,dt);

     // Egress is genuine continuous motion. A fighter may only be reframed onto a
     // new route after it has been completely out of view for a little while.
     if(f.exiting){
       f.egressT=(f.egressT||0)+dt;
       applyUnpursuedEgressEscape(f,dt);
       applyPursuitEgressAssist(f,dt);
       const enemyMoveDt=dt*tuneScale('enemySpeed');
       f.x+=f.vx*enemyMoveDt;f.y+=f.vy*enemyMoveDt;f.z+=f.vz*enemyMoveDt;
       applyPursuitReel(f,dt);
       orientFighter(f);
       const vis=fighterVisible(f,65);
       if(vis)f.offscreenT=0;else f.offscreenT=(f.offscreenT||0)+dt;

       // A deliberately locked target is not merely a fleeing victim. Once it has
       // genuinely escaped the display it may use the hidden hemisphere to turn
       // around and come back at the player. The lock/chevrons remain continuous.
       if(!vis&&(f.id===spaceLockId||f.id===spacePursuitId)&&maybeBeginLockedCounterattack(f))continue;
       // Pursuit is not a cease-fire state. A chased fighter may shoot back during
       // ordinary visible egress; a hidden turnaround uses its stronger barrage path.
       updatePursuedReturnFire(f,dt);

       if(f.offscreenT>.48&&f.id!==spacePursuitId&&f.id!==spaceLockId&&(interceptorsDestroyed<interceptorGoal||freezeObjectives)){
         // Same surviving fighter, new deliberate pass. Hidden repositioning is
         // permitted only after it has genuinely left view; there is no wander phase.
         beginAggressorPass(f,true,.32+Math.random()*.82);
       }
       continue;
     }

     if(f.t<0){f.t+=dt/Math.max(.1,f.dur);continue}
     const routeDone=advanceFighterRoute(f,dt);
     applyPursuitReel(f,dt);
     orientFighter(f);
     if(routeDone){startFighterEgress(f);continue}
     if(fighterVisible(f,65))f.offscreenT=0;
     else f.offscreenT=(f.offscreenT||0)+dt;
     updateFighterTrackingThreat(f,dt);
     updatePursuedReturnFire(f,dt);

     // v144: attack fire is deliberately arcade-magic rather than hull-aimed.
     // If a fighter is on a committed attack pass and inside the readable firing
     // band, it may throw fireballs at the player regardless of where its nose is
     // pointing. That frees the hull to bank/pitch out of view instead of lingering.
     if(f.dogfightState==='attack'){
       f.attackAge=(f.attackAge||0)+dt;
       // Counterattacks spend their turnaround out of sight, so their exit clock
       // starts only once the same locked fighter has actually re-entered the view.
       // Ordinary attack passes keep the existing hard no-linger deadline.
       if(f.pursuitCounterattack){
         if(fighterVisible(f,18)){f.counterattackSeen=true;f.counterattackVisibleT=(f.counterattackVisibleT||0)+dt}
         if(f.counterattackSeen&&!f.attackEscape&&(f.counterattackVisibleT||0)>.92)beginFighterAttackEscape(f,'counter-pass-complete')
       }else if(!f.attackEscape&&f.attackAge>=(f.attackExitDeadline||.72))beginFighterAttackEscape(f,'pass-complete');
       // A pursued target already has its own return-fire cadence above. Suppress the
       // ordinary attack-pass burst for that same craft so pursuit does not double-fire;
       // a deliberate off-screen counterattack still gets its stronger barrage here.
       const primary=!f.pursuitCounterattack&&((f.id===spaceLockId)||(f.id===spacePursuitId&&(f.pursuitStrength||0)>.22));
       if(primary){f.shotsLeft=0;f.fireBurstShots=0}
       const solution=primary?null:fighterFiringSolution(f);
       f.fireShotCD=Math.max(0,(f.fireShotCD||0)-dt);

       // The route itself is the firing permission. There is no gun-alignment
       // requirement: the VR battle fiction simply gives attack craft magic/gimballed
       // fire. A close-range dead zone prevents unfair fireballs spawning in your face.
       if(solution&&f.shotsLeft>0&&(f.fireBurstShots||0)<=0&&
          (f.fireBurstsFired||0)<(f.maxFireBursts||4)&&
          f.attackAge>=(f.nextFireOpportunity||0)){
         const wanted=Math.min(Math.max(1,Math.round(combatTuning.burstLength)),f.shotsLeft);
         f.fireBurstShots=wanted;f.fireBurstsFired=(f.fireBurstsFired||0)+1;f.fireShotCD=0;
         f.nextFireOpportunity=f.attackAge+(lerp(.34,.15,enemyAttackPressure())+Math.random()*.08)/tuneScale('fireRate');
       }

       if(solution&&(f.fireBurstShots||0)>0&&f.fireShotCD<=0){
         if(spawnFighterBolt(f)){
           // The first actual shot immediately turns the pass into an escape. Further
           // shots may happen opportunistically while banking out, but the fighter's
           // navigation objective is now unambiguously "leave the screen".
           if(!f.attackEscape)beginFighterAttackEscape(f,'fired');
           f.fireBurstShots--;f.shotsLeft--;
           f.fireShotCD=(lerp(.15,.085,enemyAttackPressure())+Math.random()*.05)/tuneScale('fireRate');
         }else f.fireShotCD=.08/tuneScale('fireRate');
       }
       if(!solution)f.fireBurstShots=0;
     }
   }

   if(stageAllowsSpaceCombat&&!tutorialCombatActive&&(!tutorialConsumablesActive||tutorialConsumables.allowDirector())&&(!tutorialAbandonActive||tutorialAbandon.allowDirector()))updateSpaceDogfightDirector(dt);

   const tutorialPreview=!!(campaign.currentMission?.training&&campaign.currentStage()?.tutorialPreview);
   if(!freezeObjectives&&!tutorialPreview&&interceptorsDestroyed>=interceptorGoal&&interceptorClearDelay<=0){
     const activeStage=campaign.currentStage();
     if(campaign.currentMission&&activeStage?.type==='station_xeno_arrival'){
       stationDelivery.preserveNextPadApproach=true;scenarioFlow.completeCurrentStage()
     }else if(campaign.currentMission&&activeStage?.type==='station_defence_recovery'){
       stationDelivery.state='recoverySearch';salvageRecovery.beginSearch()
     }else if(campaign.currentMission&&activeStage?.type==='combat_recovery'){
       salvageRecovery.beginSearch()
     }else if(campaign.currentMission&&activeStage?.type==='asteroid_wreck_recovery'&&asteroidWreckRun?.state==='ambush'){
       asteroidWreckRun.onPiratesCleared()
    }else if(campaign.currentMission&&(activeStage?.type==='fighters'||activeStage?.type==='customs_drones')){
       scenarioFlow.completeCurrentStage()
     }else if(campaign.currentMission&&activeStage?.type==='jackal_party_delivery')jackalDelivery.beginPlanetRun();
     else beginApproach()
   }
 }
 if(phase==='surface'&&bunkerRaid.active){
   bunkerRaid.update(dt)
 }
 if(phase==='surface'&&!bunkerRaid.active){
   if(tutorialFinalRun.isSurfaceActive()){
     tutorialFinalRun.updateSurface(dt);updateEffects(dt);return
   }
   // Fire the spoken objective after the transition has fully settled. Calling it
   // on the exact beginSurface frame proved unreliable in real play.
   if(!surfacePylonVoicePlayed&&phaseT>=.55){
     surfacePylonVoicePlayed=true;
     audio.playVoice('destroyPylons',{once:false,priority:true});
   }

   surfaceSpawn-=dt;
   const liveLoose=groundTargets.filter(g=>!g.dead&&!g.dying&&!g.doorPylon).length;
   if(surfaceSpawn<=0&&liveLoose<46){
     const count=Math.random()<.58?2:(Math.random()<.22?3:1);
     for(let i=0;i<count;i++){
       // Mostly populate the current hemisphere, with some installations elsewhere so
       // a 180-degree turn still reveals a living battlefield.
       const a=(Math.random()<.72?viewYaw+(Math.random()-.5)*Math.PI*1.55:Math.random()*Math.PI*2);
       const dist=76+Math.random()*105+i*9;
       const gx=shipX+Math.sin(a)*dist,gwz=travel+Math.cos(a)*dist,kind=Math.random();
       let g;
       if(kind<.07)g={type:'tower',worldZ:gwz,x:gx,y:-3.45,z:gwz-travel,s:.76+Math.random()*.12,my:1.58,hp:999,capHp:3,capHitFx:0,capDead:false,capDying:0,doorPylon:false,capCol:C.y,rot:[0,Math.random()*3.14,0],col:C.g,mesh:towerBodyMesh,dead:false,shot:false,passed:false};
       else if(kind<.87)g={type:'surfacegun',worldZ:gwz,x:gx,y:-3.45,z:gwz-travel,s:.65+Math.random()*.13,hp:3,hitFx:0,rot:[0,Math.random()*3.14,0],col:C.r,mesh:turretMesh,dead:false,shot:false,passed:false};
       else g={type:'bunker',worldZ:gwz,x:gx,y:-3.45,z:gwz-travel,s:.78+Math.random()*.11,hp:4,hitFx:0,rot:[0,Math.random()*3.14,0],col:C.r,mesh:bunkerMesh,dead:false,shot:false,passed:false};
       groundTargets.push(g)
     }
     surfaceSpawn=.30+Math.random()*.26
   }

   for(const g of groundTargets){
     if(g.dead||g.dying)continue;syncWorldZ(g);
     if(g.type==='tower')g.rot[1]+=dt*.12;
     if(g.type==='surfacegun')g.rot[1]+=dt*.34;
     const q=camPoint([g.x,g.y,g.z]),depth=q[2],sp=depth>.18?projectCam(q):null;
     const readable=!!(sp&&sp.x>-60&&sp.x<W+60&&sp.y>-50&&sp.y<viewH+50);
     if(g.type==='tower'&&!g.capDead&&readable&&depth<38&&depth>5){
       g.fireCD=(g.fireCD??(1.05+Math.random()*.85))-dt;
       if(g.fireCD<=0){spawnBolt(g.x,towerCapY(g),g.z,.75,2.15,.12);g.fireCD=1.18+Math.random()*.56}
     }
     if(g.type==='surfacegun'&&readable&&depth<34&&depth>5){
       g.fireCD=(g.fireCD??(.85+Math.random()*.80))-dt;
       if(g.fireCD<=0){spawnBolt(g.x,g.y+1.25*g.s,g.z,.95,1.85,.10);g.fireCD=.88+Math.random()*.48}
     }
     if(g.type==='bunker'&&readable&&depth<30&&depth>5){
       g.fireCD=(g.fireCD??(1.10+Math.random()*.85))-dt;
       if(g.fireCD<=0){spawnBolt(g.x,g.y+0.8*g.s,g.z,.90,1.45,.07);g.fireCD=1.18+Math.random()*.58}
     }
     const planar=Math.hypot(g.x-shipX,g.worldZ-travel);
     if(planar<1.45&&!g.passed){damage('COLLISION');g.passed=true}
     if(planar>285&&!g.persistent&&!g.doorPylon)g.dead=true;
     if(planar>2.4)g.passed=false
   }

   if(surfaceBunkerActive){
     // The bunker deliberately appears distant when the shield objective completes,
     // but do not force a long empty cruise. Quietly collapse that remaining range
     // until normal approach distance is reached. This is the old "surface timer"
     // beat in arcade terms, accelerated once the fifth pylon is down.
     let dist=surfaceBunkerDistance();
     if(dist>158){
       const closeBy=Math.min(dist-158,dt*92);
       const dx=entryBunkerX-shipX,dz=entryBunkerWorldZ-travel;
       const nextDist=Math.max(158,dist-closeBy);
       const s=nextDist/Math.max(.001,dist);
       entryBunkerX=shipX+dx*s;
       entryBunkerWorldZ=travel+dz*s;
       tunnelOriginX=entryBunkerX;
       tunnelStartWorld=entryBunkerWorldZ+.65;
       dist=nextDist;
     }

     const bz=entryBunkerZ(),q=camPoint([entryBunkerX,-2.2,bz]);
     const bp=q[2]>.18?projectCam(q):null;
     const lined=bp&&bp.x>W*.18&&bp.x<W*.82&&bp.y>viewH*.12&&bp.y<viewH*.88;
     if(dist<148&&q[2]>22&&lined)beginTrenchEntry()
   }
 }
 if(phase==='trench'){
   const tutorialRun=tutorialFinalRun.isActive();
   const rb=relZ(reactorBoundaryWorld);trenchSpawn-=dt;trenchHaz-=dt;
   if(!tutorialRun&&rb>REACTOR_CLEAR_RUN&&trenchSpawn<=0){
     const side=Math.random()<.5?-1:1,yOff=-1.0+Math.random()*2.0,z=38+Math.random()*10,wz=travel+z;
     if(wz<reactorBoundaryWorld-18)groundTargets.push({type:'wallgun',worldZ:wz,x:0,y:0,yOff,z,s:.82,hp:3,hitFx:0,rot:[0,0,0],col:C.r,mesh:wallGunMesh,dead:false,shot:false,side,mx:-side});
     trenchSpawn=1.15+Math.random()*.62
   }
   if(rb>REACTOR_CLEAR_RUN&&trenchHaz<=0){
     spawnBarrierSet(reactorBoundaryWorld-18);
     const gd=clamp((level-1)/4,0,1);
     trenchHaz=tutorialRun?(2.7+Math.random()*.8):(lerp(3.15,1.85,gd)+Math.random()*lerp(.82,.55,gd))
   }
   for(const g of groundTargets){if(g.dead||g.dying)continue;syncWorldZ(g);if(g.type==='reactor'){const c=tunnelCenter(g.z);g.x=c.x;g.y=c.y-.1;g.rot[1]+=dt*.65;continue}const c=tunnelCenter(g.z);g.x=c.x+g.side*(trenchWall()-.03);g.y=c.y+(g.yOff||0);if(g.z<31&&g.z>4){g.fireCD=(g.fireCD??(.55+Math.random()*.55))-dt;if(g.fireCD<=0){spawnBolt(g.x-g.side*1.25,g.y,g.z);g.fireCD=.82+Math.random()*.42}}if(g.z<.12)g.dead=true}
   for(const h of hazards){if(h.dead||h.dying)continue;syncWorldZ(h);const c=tunnelCenter(h.z);if(!h.passed&&h.z<1.45){const ok=Math.abs((shipY-c.y)-h.y)>h.clearance;if(!ok)damage('BARRIER');else score+=100;h.passed=true}if(h.z<.22)h.dead=true}
   if(rb<=.7){
     phase='reactor';phaseT=0;
     for(const g of groundTargets){if(g.type==='reactor')g.active=true;else g.dead=true}
     hazards.length=0;bolts.length=0;trenchHaz=999;trenchSpawn=999;
     if(!reactorAnnounced){reactorAnnounced=true;if(tutorialRun)tutorialFinalRun.onReactorReached();else audio.playVoice('destroyReactorAhead',{once:true,priority:true})}
     updateEffects(dt);return
   }
 }
 if(phase==='reactor'){
   for(const g of groundTargets){if(g.dead||g.type!=='reactor')continue;syncWorldZ(g);const c=tunnelCenter(g.z);g.x=c.x;g.y=c.y-.1;g.rot[1]+=dt*.8}
   if(reactorHits>=1){if(tutorialFinalRun.isActive())tutorialFinalRun.onReactorDestroyed();beginEscape(true);updateEffects(dt);return}
   const reactor=groundTargets.find(g=>g.type==='reactor'&&!g.dead&&g.z<2.25);
   if(reactor){
     if(tutorialFinalRun.isActive()){
       // In training, reaching the core physically is also a successful destruction:
       // explode it exactly as a shot would and continue the normal escape route.
       tutorialFinalRun.onReactorDestroyed();reactor.hp=0;reactor.dying=0;finaliseObjectDestruction(reactor);beginEscape(true)
     }else failReactor();
     updateEffects(dt);return
   }
 }
 if(phase==='escape'){
   const exitDist=relZ(exitDoorWorld);
   trenchHaz-=dt;
   // Obstacles end a long way before the door. Anything spawned must also finish
   // at least 34 world units before the exit plane, giving the levelling autopilot
   // a genuinely empty corridor rather than merely hoping the last girder has passed.
   if(trenchHaz<=0&&exitDist>EXIT_SPAWN_CUTOFF){
     spawnBarrierSet(exitDoorWorld-34);
     const gd=clamp((level-1)/4,0,1);
     trenchHaz=lerp(2.45,1.2,gd)+Math.random()*lerp(.72,.42,gd)
   }
   for(const h of hazards){if(h.dead||h.dying)continue;syncWorldZ(h);const c=tunnelCenter(h.z);if(!h.passed&&h.z<1.45){const ok=Math.abs((shipY-c.y)-h.y)>h.clearance;if(!ok)damage('OBSTACLE');else score+=120;h.passed=true}if(h.z<.22)h.dead=true}
   if(exitDist<=EXIT_AUTOPILOT_DIST){beginExitDoor();updateEffects(dt);return}
 }
 for(const b of bolts)advanceHostileBolt(b,dt)
 for(let i=bolts.length-1;i>=0;i--)if(bolts[i].dead)bolts.splice(i,1);for(let i=fighters.length-1;i>=0;i--)if(fighters[i].dead)fighters.splice(i,1);for(let i=groundTargets.length-1;i>=0;i--)if(groundTargets[i].dead)groundTargets.splice(i,1);for(let i=hazards.length-1;i>=0;i--)if(hazards[i].dead)hazards.splice(i,1);updateEffects(dt)
}
  togglePause(){if(mode==='idle'||mode==='dead'||gateVisible()||campaign.isOpen()||options.isOpen()||!fullscreenActive())return;paused=!paused;if(paused){laserBurstRemaining=0;endLaserTrigger()}document.body.classList.toggle('paused',paused);if(!paused)canvas.focus()}
}

