'use strict';
const MISSION_END_ZOOM_TIME=2.55;
function missionEndZoomProgress(){
  return mode==='missionExit'?ease(clamp(modeT/MISSION_END_ZOOM_TIME,0,1)):0
}
function planetDescentZoomProgress(){
  if(mode!=='approach')return 0;
  // Descent is a zoom from the instant the planet run starts. The early portion is
  // deliberately gentler while autopilot aligns; the locked run then builds to full speed.
  const align=ease(clamp(modeT/Math.max(.65,approachSteerDelay+1.05),0,1))*.34;
  return approachLocked?lerp(.34,1,ease(approachP)):align
}
function beginSpaceMissionExit(){
  if(!campaign.currentMission)return false;
  mode='missionExit';phase='space';modeT=phaseT=0;
  inputX=inputY=aimX=aimY=0;spaceYawVel=spacePitchVel=0;
  laserBurstRemaining=0;endLaserTrigger();
  fighters.length=0;bolts.length=0;groundTargets.length=0;hazards.length=0;shots.length=0;playerMissiles.length=0;
  resetSpaceMotion();
  audio.playVoice('missionComplete',{once:true,priority:true});
  SoundFX.zoom();
  return true
}

// v215 — scenario composition layer.
// Gameplay controllers implement reusable pieces; this controller alone decides
// whether the next piece is checkpointed, seamless, a planet descent, or a final exit.
class ScenarioFlowController {
  constructor(){
    this.encounterProfile='standard';
    this.simulatorCutNext=null;
    this.developmentRun=null;
    this.registry={
      asteroids:{entry:'checkpoint',terminal:'departed'},
      asteroid_wreck_recovery:{entry:'checkpoint',terminal:'space'},
      free_traders_depot_terminal:{entry:'seamless',terminal:'space'},
      asteroid_mine_delivery:{entry:'checkpoint',terminal:'departed'},
      courier_food:{entry:'checkpoint',terminal:'departed',legacy:true},
      fighters:{entry:'checkpoint',terminal:'space'},
      combat_recovery:{entry:'checkpoint',terminal:'space'},
      customs_drones:{entry:'checkpoint',terminal:'space'},
      planet_descent:{entry:'seamless',terminal:'surface'},
      deep_core_surface:{entry:'seamless',terminal:'surface'},
      surface_destination_approach:{entry:'seamless',terminal:'surface'},
      urban_penthouse_delivery:{entry:'seamless',terminal:'city'},
      jackal_city_delivery:{entry:'seamless',terminal:'city'},
      urban_ground_pickup:{entry:'seamless',terminal:'city'},
      urban_exit:{entry:'seamless',terminal:'city'},
      planet_launch:{entry:'seamless',terminal:'departed'},
      space_transit:{entry:'seamless',terminal:'space'},
      security_checkpoint:{entry:'seamless',terminal:'space'},
      station_cleared_approach:{entry:'seamless',terminal:'space'},
      station_xeno_arrival:{entry:'seamless',terminal:'space'},
      station_defence_recovery:{entry:'seamless',terminal:'space'},
      bunker_recovery_osd:{entry:'seamless',terminal:'departed'},
      station_pad_approach:{entry:'seamless',terminal:'space'},
      station_pad_delivery:{entry:'seamless',terminal:'space'},
      station_pad_departure:{entry:'seamless',terminal:'space'},
      // Enclosed-docking modules remain available for stations designed around a real bay.
      station_approach:{entry:'seamless',terminal:'space'},
      station_entry:{entry:'seamless',terminal:'space'},
      station_interior_delivery:{entry:'seamless',terminal:'space'},
      station_secure_transfer:{entry:'seamless',terminal:'space'},
      station_departure:{entry:'seamless',terminal:'space'},
      station_minefield_approach:{entry:'seamless',terminal:'space'},
      station_terminal_hack:{entry:'seamless',terminal:'space'},
      station_hack_escape:{entry:'seamless',terminal:'space'},
      forest_corridor:{entry:'seamless',terminal:'surface'},
      tutorial_final_run:{entry:'seamless',terminal:'surface'},
      // Legacy adapters keep old saved/private contracts playable.
      deep_core:{entry:'checkpoint',terminal:'surface',legacy:true},
      jackal_party_delivery:{entry:'checkpoint',terminal:'city',legacy:true}
    }
  }
  currentStageAllowsSpaceCombat(){
    // Campaign combat is determined by the authored/composed MODULE, not by a
    // mutable global latch. Random encounters already resolve to explicit combat
    // modules (fighters/customs/etc.); quiet travel/descent modules therefore stay
    // quiet without disabling the encounter system itself.
    if(!campaign.currentMission)return true;
    const stage=campaign.currentStage?.();
    if(!stage)return false;
    if(stage.spaceCombat===false)return false;
    if(stage.spaceCombat===true)return true;
    if(stage.type==='station_xeno_arrival'){
      return stationDelivery?.state==='bugEncounter'||stationDelivery?.state==='combatEncounter'
    }
    if(stage.type==='asteroid_wreck_recovery')return !!(asteroidWreckRun?.active&&asteroidWreckRun.state==='ambush');
    return stage.type==='fighters'||stage.type==='combat_recovery'||
      stage.type==='station_defence_recovery'||stage.type==='customs_drones'||
      stage.type==='jackal_party_delivery'||stage.type==='deep_core'
  }
  startForestDevelopmentMission(){
    if(this.developmentRun)return false;
    const resume={mission:campaign.currentMission||null,stageIndex:campaign.currentStageIndex||0};
    const landingBody=Math.random()<.35?'moon':'planet',hasEncounter=Math.random()<.20;
    const modules=[];
    if(hasEncounter){
      const pirate=Math.random()<.62;
      modules.push({type:'fighters',label:pirate?'Pirate Intercept':'Rogue Drone Intercept',difficulty:2,target:4,fighterHp:12,profile:pirate?'pirate':'rogue',encounterId:pirate?'pirate_ambush':'rogue_drones'})
    }
    modules.push({type:'planet_descent',label:landingBody==='moon'?'Moon Descent':'Planet Descent',difficulty:2});
    modules.push({type:'surface_destination_approach',label:'Forest Approach',difficulty:2,terrain:'plains',destination:'forest',routeLength:360,treeClumps:7,entryRadius:24});
    modules.push({type:'forest_corridor',label:'Forest Cabin Delivery',difficulty:2,length:650,terminalDestination:'cabin_delivery',entryFrom:'surface_destination'});
    const devMission={
      id:'dev_forest_cabin_delivery',title:'Forest Cabin Delivery Development Mission',devTest:'forest',implemented:true,private:true,
      musicMode:'calm',difficulty:2,risk:2,pay:0,xp:0,faction:null,
      planetaryRequirements:{landingBody,landingColour:'green',moonCount:landingBody==='moon'?{min:1,max:2}:{min:0,max:2}},
      modules,encounters:[]
    };
    this.developmentRun={kind:'forest',resume,mission:devMission};
    campaign.currentMission=devMission;campaign.currentStageIndex=0;
    audio.resetMissionVoices();mission.resetPlanetBearing();
    const first=modules[0];this.prepareStage(first);return this.enterStage(first,{via:'development',mission:devMission})
  }
  finishDevelopmentMission(success=true,reason=''){
    const run=this.developmentRun;if(!run)return false;
    this.developmentRun=null;this.encounterProfile='standard';
    if(forest?.active)forest.stopForJump();
    if(surfaceDestination?.active)surfaceDestination.stopForJump();
    asteroidField.stop();fighters.length=0;asteroids.length=0;groundTargets.length=0;bolts.length=0;hazards.length=0;shots.length=0;playerMissiles.length=0;
    audio.stopVoice(true);audio.music.setMode('calm');
    campaign.currentMission=run.resume.mission;campaign.currentStageIndex=run.resume.stageIndex;
    mode='idle';phase='space';phaseT=modeT=0;paused=false;inputX=inputY=aimX=aimY=0;viewYaw=viewPitch=viewRoll=0;
    document.body.classList.remove('playing','paused','cheating');
    campaign.showHub('options');say(success?'FOREST MISSION TEST COMPLETE':(reason||'FOREST MISSION TEST ENDED').toUpperCase(),.65);
    return true
  }
  def(stage){return this.registry[stage?.type]||{entry:'checkpoint',terminal:'space'}}
  prepareStage(stage){
    if(!stage)return;
    if(stage.type==='combat_recovery'||stage.type==='station_defence_recovery')salvageRecovery.prepare(stage);
    if(stage.type==='asteroid_wreck_recovery')asteroidWreckRun.prepare(stage);
    else if(stage.type==='free_traders_depot_terminal')freeTradersDepot.prepare(stage);
    else if(stage.type==='asteroids')asteroidField.prepare(stage.target||12,stage.difficulty||1,{markedTargets:!!stage.markedTargets});
    else if(stage.type==='asteroid_mine_delivery'||stage.type==='courier_food'){
      asteroidField.prepareCourier(stage.routeSeconds||12,stage.difficulty||1);courier.prepare(stage)
    }else if(stage.type==='surface_destination_approach')surfaceDestination.prepare(stage);
    else if(stage.type==='security_checkpoint')securityCheckpoint.prepare(stage);
    else if(stage.type==='station_minefield_approach'){stationDelivery.prepare(stage);stationHack.prepare(stage)}
    else if(stage.type==='station_xeno_arrival'||stage.type==='station_defence_recovery'||stage.type==='station_approach')stationDelivery.prepare(stage);
    else if(stage.type==='station_pad_approach')stationDelivery.preparePadApproach(stage);
    else if(stage.type==='jackal_party_delivery')jackalDelivery.prepare(stage);
    else{
      asteroidField.active=false;asteroidField.state='idle';asteroids.length=0
    }
  }
  pickCustomsDrone(index=0){
    const list=globalThis.AgentXPlanetaryDrones?.list||[];
    return list.length?list[Math.abs(index)%list.length]:pickEnemyFighterMesh()
  }
  startFighterStage(stage,profile='standard'){
    this.encounterProfile=profile;
    phase='space';mode='play';modeT=phaseT=0;
    eventIndex=0;eventTimer=.08;
    interceptorGoal=stage?.target||INTERCEPTOR_GOAL;
    fighterGroupTotal=interceptorGoal;fighterGroupSpawned=0;
    const stagedFighterHP=Math.round(stage?.fighterHp||12);
    currentFighterHP=clamp(stagedFighterHP<=10?stagedFighterHP*2:stagedFighterHP,12,20);
    interceptorsDestroyed=0;interceptorClearDelay=0;
    fighters.length=0;bolts.length=0;groundTargets.length=0;hazards.length=0;
    resetPlanetBearing();resetSpaceMotion();resetSpaceDogfightDirector();
    startEvent(stage?.tutorialConsumables?5:(stage?.tutorialAbandon?4:(stage?.tutorialCombat?1:99)));
    if(stage?.tutorialCombat&&typeof tutorialCombat!=='undefined')tutorialCombat.begin(stage);
    if(stage?.tutorialConsumables&&typeof tutorialConsumables!=='undefined')tutorialConsumables.begin(stage);
    if(stage?.tutorialAbandon&&typeof tutorialAbandon!=='undefined')tutorialAbandon.begin(stage);
    if(!stage?.tutorial){
      if(stage?.combatVoice){
        audio.playVoice(stage.combatVoice,{once:true,priority:false})
      }else if(profile==='customs'){
        audio.playSequence(['customsInterceptDetected','destroyCustomsDrones'])
      }else if(profile==='xeno'){
        audio.music.setMode('violent');
        audio.playSequence(['xenoInfestationDetected','clearHostileXenoforms'])
      }else if(profile==='pirate'){
        audio.playVoice('pirateInterceptDetected',{once:true,priority:false})
      }else if(profile==='rogue'){
        audio.playVoice('rogueDronesDetected',{once:true,priority:false})
      }else if(profile==='hostile'){
        audio.playVoice('eliminateHostileGroup',{once:true,priority:false})
      }else{
        // Legacy fighter stages retain the original planetary/interceptor instruction.
        audio.playVoice('destroyInterceptors',{once:true,priority:false})
      }
    }
  }
  enterStage(stage,{via='direct',mission=null}={}){
    if(!stage)return false;
    this.encounterProfile='standard';
    // Music follows the section actually being played, not merely the contract family.
    // Combat encounters always use the violent playlist; when they hand back to a
    // delivery/travel/surface section, restore the mission's authored base mode.
    const combatMusic=(stage.type==='fighters'||stage.type==='combat_recovery'||stage.type==='station_defence_recovery'||stage.type==='customs_drones'||stage.type==='deep_core'||stage.type==='deep_core_surface');
    audio.music.setMode(combatMusic?'violent':(mission?.musicMode||campaign.currentMission?.musicMode||'calm'));
    if(stage.type==='asteroid_wreck_recovery'){
      asteroidWreckRun.begin(stage);return true
    }
    if(stage.type==='free_traders_depot_terminal'){
      freeTradersDepot.begin(stage);return true
    }
    if(stage.type==='asteroids'){
      asteroidField.activatePrepared({silentObjective:!!stage.tutorial});
      if(stage.tutorial){
        // Simulator teaching is spoken and subtitled. The final objective cue is
        // queued by the player's first shot, so the lesson responds to what they do.
        audio.playSequence(['tutorialWelcome','tutorialMoveAim','tutorialAvoidCollisions','tutorialPrimaryFire'])
      }
      return true
    }
    if(stage.type==='asteroid_mine_delivery'||stage.type==='courier_food'){
      asteroidField.activatePreparedCourier();say(stage.startMessage||'ASTEROID DELIVERY RUN',.85);return true
    }
    if(stage.type==='fighters'){
      this.startFighterStage(stage,stage.profile||'standard');return true
    }
    if(stage.type==='combat_recovery'){
      if(!salvageRecovery.active||salvageRecovery.stage!==stage)salvageRecovery.prepare(stage);
      this.startFighterStage(stage,stage.profile||'standard');return true
    }
    if(stage.type==='station_defence_recovery'){
      if(!salvageRecovery.active||salvageRecovery.stage!==stage)salvageRecovery.prepare(stage);
      if(!stationDelivery.active||stationDelivery.stage!==stage)stationDelivery.prepare(stage);
      stationDelivery.beginArrival(stage);
      this.startFighterStage(stage,stage.profile||'rogue');
      say(String(stage.startMessage||'DEFEND THE STATION').toUpperCase(),.82);
      return true
    }
    if(stage.type==='customs_drones'){
      this.startFighterStage(stage,'customs');return true
    }
    if(stage.type==='planet_descent'){
      // Some authored descents begin in genuinely empty space. Honour that as a
      // stage-content choice rather than allowing stale/default fighter state to
      // bleed into the approach. Other descents keep the established behaviour,
      // including fighters visibly breaking away from a preceding combat stage.
      if(stage.quietApproach){
        fighters.length=0;bolts.length=0;
        if(typeof releaseSpaceLock==='function')releaseSpaceLock();
        if(typeof releaseSpacePursuit==='function')releaseSpacePursuit();
      }
      beginApproach();return true
    }
    if(stage.type==='bunker_recovery_osd'){
      bunkerRaid.begin(stage);return true
    }
    if(stage.type==='deep_core_surface'){
      beginSurface();return true
    }
    if(stage.type==='surface_destination_approach'){
      surfaceDestination.begin(stage);return true
    }
    if(stage.type==='urban_penthouse_delivery'||stage.type==='jackal_city_delivery'){
      jackalDelivery.prepare(stage);jackalDelivery.beginCity();return true
    }
    if(stage.type==='urban_ground_pickup'){
      jackalDelivery.prepareUrbanPickup(stage);jackalDelivery.beginUrbanPickup(stage);return true
    }
    if(stage.type==='urban_exit'){
      jackalDelivery.beginUrbanExit(stage);return true
    }
    if(stage.type==='planet_launch'){
      // Use the established runtime wrapper. The `mission` argument here is the
      // campaign mission data object, so calling mission.beginSurfaceExit would crash.
      beginSurfaceExit({scene:'city',continueMission:true});return true
    }
    if(stage.type==='space_transit'){
      spaceTransfer.begin(stage);return true
    }
    if(stage.type==='security_checkpoint'){
      securityCheckpoint.begin(stage);return true
    }
    if(stage.type==='station_cleared_approach'){
      stationDelivery.beginClearedApproach(stage);return true
    }
    if(stage.type==='station_xeno_arrival'){
      const infestation=stationDelivery.beginArrival(stage);
      if(infestation)this.startFighterStage(stage,'xeno');
      return true
    }
    if(stage.type==='station_pad_approach'){
      stationDelivery.beginPadApproach(stage);return true
    }
    if(stage.type==='station_pad_delivery'){
      stationDelivery.beginPadDelivery(stage);return true
    }
    if(stage.type==='station_pad_departure'){
      stationDelivery.beginPadDeparture(stage);return true
    }
    if(stage.type==='station_minefield_approach'){
      // Initialise the station/camera first, then seed the streaming field in that
      // exact view basis so mines behave like the asteroid-delivery traffic.
      stationDelivery.beginApproach(stage);stationHack.beginApproach(stage);return true
    }
    if(stage.type==='station_terminal_hack'){
      stationDelivery.beginInteriorHack(stage);return true
    }
    if(stage.type==='station_hack_escape'){
      stationDelivery.beginHackDeparture(stage);return true
    }
    if(stage.type==='station_approach'){
      stationDelivery.beginApproach(stage);return true
    }
    if(stage.type==='station_entry'){
      stationDelivery.beginEntry(stage);return true
    }
    if(stage.type==='station_interior_delivery'){
      stationDelivery.beginInteriorDelivery(stage);return true
    }
    if(stage.type==='station_secure_transfer'){
      stationDelivery.beginSecureTransfer(stage);return true
    }
    if(stage.type==='station_departure'){
      stationDelivery.beginDeparture(stage);return true
    }
    if(stage.type==='forest_corridor'){
      forest.begin(stage);return true
    }
    if(stage.type==='tutorial_final_run'){
      tutorialFinalRun.begin(stage);return true
    }
    if(stage.type==='jackal_party_delivery'){
      jackalDelivery.prepare(stage);jackalDelivery.beginCustoms();return true
    }
    if(stage.type==='deep_core'){
      this.startFighterStage(stage,'standard');return true
    }
    phase='space';mode='play';resetSpaceMotion();say((mission?.title||stage.label||'MISSION').toUpperCase(),.85);return true
  }
  transitionKind(fromStage,toStage){
    if(!toStage)return'terminal';
    // A cinematic/environment hand-off is continuous: do not insert an unrelated
    // checkpoint void between combat and descent, or between descent and its destination.
    if(toStage.type==='planet_descent'||fromStage?.type==='planet_descent')return'seamless';
    // An explicit space-transfer module owns the visual travel either side of it;
    // do not inject a checkpoint voice/void between launch, transfer and destination.
    if(toStage?.type==='space_transit'||fromStage?.type==='space_transit')return'seamless';
    // Asteroid/courier pieces have already performed their departure zoom. Reuse
    // that zoom as the inter-stage travel rather than immediately playing a second one.
    if(this.def(fromStage).terminal==='departed')return'departed';
    return this.def(toStage).entry==='seamless'?'seamless':'checkpoint'
  }
  leaveStage(stage,{terminal=false}={}){
    if(!stage)return;
    if(stage.type==='customs_drones'||stage.type==='fighters'||stage.type==='combat_recovery'||stage.type==='station_defence_recovery'||stage.type==='station_xeno_arrival')this.encounterProfile='standard';
    if(stage.type==='combat_recovery'||stage.type==='station_defence_recovery')salvageRecovery.reset();
    if(!terminal&&stage.type==='surface_destination_approach')surfaceDestination.stopForJump();
    if(!terminal&&(stage.type==='urban_penthouse_delivery'||stage.type==='jackal_city_delivery')){
      jackalDelivery.active=false;jackalDelivery.state='complete'
    }
    // Keep the generic city alive across pickup -> outbound -> launch so those
    // modules are genuinely seamless. Retire it only once the launch has completed.
    if(!terminal&&stage.type==='planet_launch'){
      jackalDelivery.active=false;jackalDelivery.state='complete'
    }
    if(stage.type==='asteroid_wreck_recovery'){asteroidWreckRun.reset();asteroidField.stop();fighters.length=0;bolts.length=0}
    if(stage.type==='free_traders_depot_terminal')freeTradersDepot.stop();
    if(stage.type==='security_checkpoint')securityCheckpoint.reset();
    if(terminal&&(stage.type==='station_departure'||stage.type==='station_pad_departure')){if(stationHack?.active)stationHack.reset();stationDelivery.stopForJump()}
    if(terminal&&stage.type==='station_hack_escape'){stationHack.reset();stationDelivery.stopForJump()}
    if(!terminal&&stage.type==='forest_corridor')forest.stopForJump();
  }
  beginSimulatorCut(){
    if(!campaign.currentMission?.training||!campaign.hasMoreStages()||mode==='simulatorCut')return false;
    const from=campaign.currentStage(),next=campaign.currentMission.modules[campaign.currentStageIndex+1];
    campaign.currentStageIndex++;
    this.leaveStage(from,{terminal:false});
    this.simulatorCutNext=next;
    asteroidField.stop();
    fighters.length=0;asteroids.length=0;bolts.length=0;groundTargets.length=0;hazards.length=0;shots.length=0;playerMissiles.length=0;
    inputX=inputY=aimX=aimY=0;spaceYawVel=spacePitchVel=0;shipX=shipY=0;viewYaw=viewPitch=viewRoll=0;
    laserBurstRemaining=0;endLaserTrigger();
    clearTutorialHud();
    messageEl.textContent='';cancelAbandonHold();
    audio.stopVoice(true);audio.flyby?.silence?.();
    mode='simulatorCut';phase='space';modeT=phaseT=0;
    campaign.updateGearHud();
    deathFxStart=performance.now();deathFxSeed=Math.random()*10000;
    SoundFX.disconnect();
    return true
  }
  updateSimulatorCut(){
    if(mode!=='simulatorCut'||modeT<.96)return false;
    const next=this.simulatorCutNext;this.simulatorCutNext=null;
    if(!next)return false;
    modeT=phaseT=0;
    audio.resetMissionVoices();
    if(next.type==='fighters'||next.type==='customs_drones')audio.music.setMode('violent');
    this.prepareStage(next);
    this.enterStage(next,{via:'simulatorCut',mission:campaign.currentMission});
    return true
  }

  completeCurrentStage(){
    if(!campaign.currentMission)return false;
    const from=campaign.currentStage();
    if(from?.encounterId){
      const log=Array.isArray(campaign.currentMission.encounters)?campaign.currentMission.encounters:(campaign.currentMission.encounters=[]);
      if(!log.includes(from.encounterId))log.push(from.encounterId)
    }
    if(campaign.hasMoreStages()){
      const next=campaign.currentMission.modules[campaign.currentStageIndex+1];
      campaign.currentStageIndex++;
      audio.resetMissionVoices();
      const kind=this.transitionKind(from,next);
      this.leaveStage(from,{terminal:false});
      if(kind==='checkpoint'){
        missionTransit.start(campaign.currentMission);return true
      }
      this.prepareStage(next);
      if(kind==='departed'){
        // The preceding piece already supplied the visual zoom; retain the semantic
        // checkpoint without replaying the same effect back-to-back.
        audio.playFreshVoice('checkpoint',{priority:true})
      }
      return this.enterStage(next,{via:kind,mission:campaign.currentMission})
    }
    this.leaveStage(from,{terminal:true});
    return this.beginTerminalExit(from)
  }
  beginTerminalExit(stage){
    const terminal=this.def(stage).terminal;
    if(terminal==='departed')return this.finishAfterDeparture();
    if(terminal==='city')return jackalDelivery.beginMissionDeparture();
    if(stage?.type==='forest_corridor')return beginSurfaceExit({scene:'forest'});
    if(terminal==='surface')return beginSurfaceExit();
    return beginSpaceMissionExit()
  }
  finishAfterDeparture(){
    this.encounterProfile='standard';
    if(campaign.currentStage?.()?.type==='station_defence_recovery'&&stationDelivery?.active)stationDelivery.stopForJump();
    if(campaign.currentMission?.devTest&&this.developmentRun)return this.finishDevelopmentMission(true);
    if(forest?.active)forest.stopForJump();
    return campaign.completeCurrentMission()
  }
}


// Solid courier-room fixture mesh. Faces are black occluders only; the visible
// object remains a clean monoline wire box. This keeps wall/floor/tunnel lines
// from showing through crates, tables and other delivery-bay furniture.
