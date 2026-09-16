'use strict';

// v243 — reusable high-speed space transfer. This is a mission section in its
// own right rather than a hidden pause between two authored scenes, so generated
// missions can explicitly request a few seconds of fast interplanetary/orbital
// travel before the next destination becomes visible.
class SpaceTransferController {
  constructor(){this.reset()}
  reset(){this.active=false;this.stage=null;this.t=0;this.duration=4.25}
  progress(){return clamp(this.t/Math.max(.1,this.duration),0,1)}
  begin(stage){
    this.reset();this.active=true;this.stage=stage||{};
    this.duration=clamp(Number(stage?.duration)||4.25,2.4,8.0);
    mode='spaceTransfer';phase='space';modeT=phaseT=0;starTravel=0;
    inputX=inputY=aimX=aimY=0;spaceYawVel=spacePitchVel=0;shipX=shipY=0;viewYaw=viewPitch=viewRoll=0;
    fighters.length=0;asteroids.length=0;bolts.length=0;groundTargets.length=0;hazards.length=0;shots.length=0;playerMissiles.length=0;
    resetSpaceMotion();if(stage?.playZoomSound!==false)SoundFX.zoom();
    if(stage?.voice)audio.playVoice(stage.voice,{once:false,priority:true});
    else say(String(stage?.message||'IN TRANSIT'),.72)
  }
  update(dt){
    if(!this.active)return;this.t+=dt;inputX=inputY=aimX=aimY=0;spaceYawVel=spacePitchVel=0;
    viewYaw=viewPitch=viewRoll=0;shipX=shipY=0;
    if(this.t>=this.duration){this.t=this.duration;this.active=false;scenarioFlow.completeCurrentStage()}
  }
}
