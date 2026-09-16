'use strict';

class MissionTransitController {
  constructor(){
    this.active=false;
    this.mission=null;
    this.t=0;
    this.duration=2.65;
  }

  progress(){
    return clamp(this.t/this.duration,0,1)
  }

  start(missionDef){
    this.active=true;
    this.mission=missionDef;
    this.stage=campaign.currentStage()||missionDef.modules?.[0]||{type:'deep_core',target:INTERCEPTOR_GOAL,fighterHp:12,difficulty:1};
    this.t=0;

    // ScenarioFlow owns stage-specific preparation. MissionTransit is now only
    // the reusable empty-space checkpoint/zoom presentation.
    //
    // Crossroads intrusion is deliberately prepared AFTER this zoom, matching the
    // asteroid-delivery destination lifecycle: the remote station must not exist
    // in the rendered scene while the checkpoint stars are streaking past.
    if(this.stage?.type!=='station_minefield_approach')scenarioFlow.prepareStage(this.stage)

    // The common checkpoint transit is deliberately just empty space.
    mode='missionTransit';phase='space';modeT=0;phaseT=0;
    inputX=inputY=aimX=aimY=0;
    spaceYawVel=spacePitchVel=0;
    shipX=shipY=0;viewYaw=viewPitch=viewRoll=0;
    laserBurstRemaining=0;endLaserTrigger();
    fighters.length=0;bolts.length=0;groundTargets.length=0;hazards.length=0;
    starTravel=0;
    resetSpaceMotion();

    // Canonical timing: checkpoint speech starts at the SAME MOMENT as the zoom.
    SoundFX.zoom();
    audio.playFreshVoice('checkpoint',{priority:true})
  }

  cancel(){
    this.active=false;
    this.mission=null;
    this.stage=null;
    this.t=0
  }

  update(dt){
    if(!this.active)return;
    this.t+=dt;
    inputX=inputY=aimX=aimY=0;
    spaceYawVel=spacePitchVel=0;
    shipX=shipY=0;viewYaw=viewPitch=viewRoll=0;
    if(this.t>=this.duration)this.finish()
  }

  finish(){
    if(!this.active)return;
    const m=this.mission;
    this.active=false;
    this.t=this.duration;
    inputX=inputY=aimX=aimY=0;
    spaceYawVel=spacePitchVel=0;
    shipX=shipY=0;viewYaw=viewPitch=viewRoll=0;
    modeT=phaseT=0;
    resetSpaceMotion();

    const stage=this.stage||campaign.currentStage();
    scenarioFlow.enterStage(stage,{via:'checkpoint',mission:m})
  }
}
