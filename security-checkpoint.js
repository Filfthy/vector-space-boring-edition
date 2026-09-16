'use strict';

// VOX perimeter security for story mission 1. The player has reached the
// station's outer perimeter, but the station is still distant and off-axis. A
// security drone visibly swoops in, turns to face Agent X, closes to credential
// range, approves the exchange, then turns away and flies clear before docking.
class SecurityCheckpointController{
  constructor(){this.reset()}
  reset(){
    if(this.active)audio?.hackChirp?.stop?.();
    this.active=false;this.stage=null;this.state='idle';this.t=0;this.stateT=0;
    this.transferT=0;this.transferDuration=3.25;this.dataPackets=[];this.dataSpawnT=0;this.draining=false;this.holdT=0;this.approvalQueued=false;
    this.guardPos=[0,0,30];this.entryPoint=[0,0,60];this.turnPoint=[0,0,28];this.holdPoint=[0,0,11];this.exitPoint=[0,0,80];
    this.guardRot=[0,0,0];this.turnFrom=[0,0,0];this.turnTo=[0,0,0];this.side=1
  }
  prepare(stage){this.reset();this.active=true;this.stage=stage||{};this.transferDuration=Math.max(2.2,Number(stage?.transferSeconds)||3.25)}
  pointFacing(from,to){
    const dx=to[0]-from[0],dy=to[1]-from[1],dz=to[2]-from[2],rr=Math.hypot(dx,dy,dz)||1;
    return[Math.asin(-dy/rr),Math.atan2(dx,dz),0]
  }
  angleLerp(a,b,t){
    let d=wrapAngle(b-a);return wrapAngle(a+d*t)
  }
  rotLerp(a,b,t){
    return[this.angleLerp(a[0],b[0],t),this.angleLerp(a[1],b[1],t),lerp(a[2],b[2],t)]
  }
  displayRot(rot){
    // haloGuard is authored nose-forward along local -Z, while pointFacing() uses
    // the game's usual +Z-forward convention. Convert the logical flight rotation
    // to the mesh's authored axis so it visibly flies and turns nose-first.
    return[-rot[0],wrapAngle(rot[1]+Math.PI),rot[2]]
  }
  setState(name){this.state=name;this.stateT=0}
  begin(stage=this.stage){
    if(!this.active||stage!==this.stage)this.prepare(stage);
    if(!stationDelivery?.active||stationDelivery.stationStyle!=='vox'){
      stationDelivery?.prepare?.({stationModel:'vox_comms',approachDistance:520,difficulty:stage?.difficulty||2})
    }
    if(stationDelivery?.active)stationDelivery.state='securityHold';

    // Build the intercept in the CURRENT camera frame so it is immediately visible.
    // The drone first crosses in from one side, turns in front of the player, then
    // drives up to credential range.  The distant station never teleports or rotates.
    this.side=Math.random()<.5?-1:1;
    this.entryPoint=cameraPointToWorld([this.side*38,-7+Math.random()*10,72]);
    this.turnPoint=cameraPointToWorld([this.side*15,-1.8+Math.random()*3.6,29]);
    // Credential presentation should not shove the guard's back end into the
    // player's face. Hold a little farther off so the whole front of the drone reads.
    this.holdPoint=cameraPointToWorld([this.side*4.2,-.25,14.2]);
    // After approval the drone turns sideways and leaves the frame at roughly the
    // same depth. It must visibly fly off-screen, never recede into the distance.
    this.exitPoint=cameraPointToWorld([this.side*98,1.5,14.6]);
    this.guardPos=this.entryPoint.slice();
    this.guardRot=this.pointFacing(this.entryPoint,this.turnPoint);
    this.setState('incoming');

    mode='securityCheckpoint';phase='space';modeT=phaseT=0;
    inputX=inputY=aimX=aimY=0;spaceYawVel=spacePitchVel=0;
    audio.music.setMode('calm');
    say('VOX PERIMETER SECURITY',.72);return true
  }
  startTransfer(){
    this.setState('transfer');this.transferT=0;this.dataPackets.length=0;this.dataSpawnT=.08;this.draining=false;
    for(let i=0;i<5;i++)this.dataPackets.push(...stationHack.makeDataPacketGroup(true));
    audio?.hackChirp?.start?.();say('TRANSMITTING SECURITY CREDENTIALS',.82)
  }
  updatePackets(dt){
    for(let i=this.dataPackets.length-1;i>=0;i--){const p=this.dataPackets[i];p.u+=p.speed*dt;if(p.u>=1)this.dataPackets.splice(i,1)}
    if(!this.draining){
      this.dataSpawnT-=dt;
      while(this.dataSpawnT<=0&&this.dataPackets.length<18){this.dataPackets.push(...stationHack.makeDataPacketGroup(false));this.dataSpawnT+=.14+Math.random()*.34}
    }
  }
  update(dt){
    if(!this.active)return;
    this.t+=dt;this.stateT+=dt;

    if(this.state==='incoming'){
      const u=ease(clamp(this.stateT/.48,0,1));
      this.guardPos=[
        lerp(this.entryPoint[0],this.turnPoint[0],u),
        lerp(this.entryPoint[1],this.turnPoint[1],u),
        lerp(this.entryPoint[2],this.turnPoint[2],u)
      ];
      this.guardRot=this.pointFacing(this.guardPos,this.turnPoint);
      if(u>=1){
        this.turnFrom=this.guardRot.slice();
        this.turnTo=this.pointFacing(this.turnPoint,[shipX,shipY,0]);
        this.setState('turnToPlayer')
      }
      return
    }

    if(this.state==='turnToPlayer'){
      const u=ease(clamp(this.stateT/.52,0,1));
      this.guardPos=this.turnPoint.slice();this.guardRot=this.rotLerp(this.turnFrom,this.turnTo,u);
      if(u>=1)this.setState('close')
      return
    }

    if(this.state==='close'){
      const u=ease(clamp(this.stateT/.62,0,1));
      this.guardPos=[
        lerp(this.turnPoint[0],this.holdPoint[0],u),
        lerp(this.turnPoint[1],this.holdPoint[1],u),
        lerp(this.turnPoint[2],this.holdPoint[2],u)
      ];
      this.guardRot=this.pointFacing(this.guardPos,[shipX,shipY,0]);
      if(u>=1){
        this.setState('settle');
        audio.playVoice('presentCredentialsToSecurityDrone',{once:false,priority:true})
      }
      return
    }

    if(this.state==='settle'){
      this.guardPos=this.holdPoint.slice();this.guardRot=this.pointFacing(this.guardPos,[shipX,shipY,0]);
      if(this.stateT>=.34&&!audio.voicePlaying&&!audio.voiceQueue.length)this.startTransfer();
      return
    }

    if(this.state==='transfer'){
      this.guardPos=this.holdPoint.slice();this.guardRot=this.pointFacing(this.guardPos,[shipX,shipY,0]);
      this.transferT+=dt;this.updatePackets(dt);
      const progress=clamp(this.transferT/this.transferDuration,0,1);
      if(progress>=1&&!this.draining)this.draining=true;
      if(this.draining&&!this.dataPackets.length&&!this.approvalQueued){
        // End the credential datastream first, then give a short quiet beat so the
        // approval chirp feels like a separate acknowledgement rather than just more
        // of the same transfer beeping.
        audio?.hackChirp?.stop?.();
        this.approvalQueued=true;
        this.setState('approvalPause')
      }
      return
    }

    if(this.state==='approvalPause'){
      this.guardPos=this.holdPoint.slice();this.guardRot=this.pointFacing(this.guardPos,[shipX,shipY,0]);
      if(this.stateT>=.28){
        SoundFX.droneApproval();
        this.approvalQueued=false;
        this.setState('approved');
        audio.playVoice('stationAccessGranted',{once:false,priority:true})
      }
      return
    }

    if(this.state==='approved'){
      this.guardPos=this.holdPoint.slice();this.guardRot=this.pointFacing(this.guardPos,[shipX,shipY,0]);
      // Hold position until the clearance sentence has genuinely finished.  The
      // stage transition resets mission speech, so beginning the departure on a
      // fixed timer could cut a longer TTS recording off before "access granted".
      if(this.stateT>=.62&&!audio.voicePlaying&&!audio.voiceQueue.length){
        this.turnFrom=this.guardRot.slice();
        this.turnTo=this.pointFacing(this.holdPoint,this.exitPoint);
        this.setState('turnAway')
      }
      return
    }

    if(this.state==='turnAway'){
      const u=ease(clamp(this.stateT/.52,0,1));
      this.guardPos=this.holdPoint.slice();this.guardRot=this.rotLerp(this.turnFrom,this.turnTo,u);
      if(u>=1)this.setState('depart')
      return
    }

    if(this.state==='depart'){
      const u=ease(clamp(this.stateT/.82,0,1));
      this.guardPos=[
        lerp(this.holdPoint[0],this.exitPoint[0],u),
        lerp(this.holdPoint[1],this.exitPoint[1],u),
        lerp(this.holdPoint[2],this.exitPoint[2],u)
      ];
      this.guardRot=this.pointFacing(this.guardPos,this.exitPoint);
      if(u>=1)scenarioFlow.completeCurrentStage();
      return
    }
  }
  draw(){
    if(!this.active||phase!=='space'||mode!=='securityCheckpoint')return;
    const mesh=globalThis.AgentXPlanetaryDrones?.get?.('haloGuard')||globalThis.AgentXPlanetaryDrones?.list?.[0]||fighterMesh;
    drawMesh({type:'voxPerimeterSecurityDrone',x:this.guardPos[0],y:this.guardPos[1],z:this.guardPos[2],s:2.25,rot:this.displayRot(this.guardRot)},mesh,C.c,.99);
    if(this.state==='transfer'){
      const target=camPoint(this.guardPos);
      if(target&&target[2]>.2)stationHack.drawDataRamp([0,-.62,.82],target,this.dataPackets,{sourceHalf:.90,targetHalf:.43})
    }
  }
  hudRight(){
    if(!this.active)return'';
    if(this.state==='incoming'||this.state==='turnToPlayer'||this.state==='close'||this.state==='settle')return'VOX PERIMETER SECURITY';
    if(this.state==='transfer')return`CREDENTIALS ${Math.round(clamp(this.transferT/this.transferDuration,0,1)*100)}%`;
    if(this.state==='approvalPause')return'CREDENTIALS VERIFIED';
    if(this.state==='approved'||this.state==='turnAway'||this.state==='depart')return'DOCKING CLEARED';return''
  }
}
const securityCheckpoint=new SecurityCheckpointController();
