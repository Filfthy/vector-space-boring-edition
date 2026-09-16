'use strict';
// ---------- directed arcade dogfight ----------
// Catmull-Rom curves remain useful, but paths are now choreography fragments in a
// persistent battle rather than spawn/loop scripts. A visible ship is never moved.
function cr1(p0,p1,p2,p3,t){const t2=t*t,t3=t2*t;return .5*((2*p1)+(-p0+p2)*t+(2*p0-5*p1+4*p2-p3)*t2+(-p0+3*p1-3*p2+p3)*t3)}
function samplePath(points,t){const n=points.length;if(n<4)return points[0];const max=n-3;const u=clamp(t,0,.999999)*max;const i=Math.floor(u),lt=u-i;const A=points[i],B=points[i+1],C1=points[i+2],D=points[i+3];return[cr1(A[0],B[0],C1[0],D[0],lt),cr1(A[1],B[1],C1[1],D[1],lt),cr1(A[2],B[2],C1[2],D[2],lt)]}
function mirror(points,sx=1,sy=1){return points.map(p=>[p[0]*sx,p[1]*sy,p[2]])}
function pathAtBearing(points,bearing){const c=Math.cos(bearing),sn=Math.sin(bearing);return points.map(p=>[shipX+p[0]*c+p[2]*sn,p[1],-p[0]*sn+p[2]*c])}

const DOGFIGHT_STYLES={
 // v150: hulls are visual identity only. Every fighter uses the same flight/combat
 // capability; attack geometry is selected independently by the director.
 standard:{bgZ:[24,50],attackDur:[1.75,2.20],missX:[2.8,5.2],missY:[2.6,5.0],shots:[3,4],entry:'any',speed:25.5,turn:48}
};
function chooseDogfightStyle(){return 'standard'}
function dogfightStyle(f){return DOGFIGHT_STYLES.standard}
function randRange(r){return r[0]+Math.random()*(r[1]-r[0])}
function signRand(){return Math.random()<.5?-1:1}

// v156: hostile fire is intentionally a scarce arcade interruption while the
// player is pursuing a target. Fighters may still make overlapping attack passes,
// but the fireballs themselves share one global pressure budget.
let spaceHostileFireGate=0;
function effectiveHostileBoltCap(){
 const pressure=enemyAttackPressure(),configured=Math.max(1,Math.round(combatTuning.boltCap||1));
 const arcadeCap=spacePursuitId?(pressure<.67?1:(pressure<.95?2:3)):(pressure<.35?1:(pressure<.85?2:3));
 return Math.min(configured,arcadeCap)
}
function hostileFireGap(){
 const pressure=enemyAttackPressure();
 return spacePursuitId?lerp(1.65,.55,pressure):lerp(1.25,.45,pressure)
}

// v154: attack geometry is shared by every hull, but individual passes vary in
// pace and closest-approach distance. Most attacks are readable/catchable; a
// minority retain the dramatic fast close-rush feel.
function chooseAttackProfile(){
 const r=Math.random();
 if(r<.18)return{name:'rush',speedScale:1.18,passZ:7.5+Math.random()*4.0};
 if(r<.78)return{name:'normal',speedScale:.99,passZ:13+Math.random()*9};
 return{name:'broad',speedScale:.88,passZ:23+Math.random()*11};
}



// Runtime bridge for the procedural close-pass synth. The audition lab uses a
// normalised distance scale; in the current dogfight geometry a genuinely close
// pass is roughly eight world units, so 8 units maps to the lab's tuned 0.28.
// That puts the tuned 0.60 close-pass gate at about 17 world units. A fighter must
// also have meaningful radial or screen-space motion, preventing a nearby craft
// from turning into a permanent engine drone.
const FLYBY_CLOSE_GAME_DISTANCE=8;
const FLYBY_NORMAL_SPEED=25.5;
function updateFighterFlybyAudio(dt){
 if(!audio?.flyby)return;
 const safeDt=Math.max(.001,dt||.016);
 if(paused||campaign.isOpen()||gateVisible()||!fullscreenActive()){
   audio.flyby.silence();return
 }
 // v206: city civilian traffic shares the close-pass synth. Using the same
 // continuous source gives each overtake/oncoming pass real stereo motion and
 // Doppler rather than a one-shot whoosh.
 if(jackalDelivery?.active&&phase==='jackalCity'){
   audio.flyby.update(jackalDelivery.trafficFlybyStates(safeDt));return
 }
 if(mode!=='play'||phase!=='space'){
   audio.flyby.silence();return
 }
 const flybyParams=audio.flyby.params,states=[];
 const audibleRangeScale=Math.max(.50,tuneScale('flybyRange'));
 const distanceScale=flybyParams.closestDistance/(FLYBY_CLOSE_GAME_DISTANCE*audibleRangeScale);
 for(const f of fighters){
   if(!f||f.dead||f.dying||f.t<0)continue;
   const q=fighterCam(f);if(!q||q[2]<=.15)continue;
   const p=projectCam(q);if(!p)continue;
   const dist=Math.hypot(q[0],q[1],q[2]),normDistance=dist*distanceScale;
   const speed=Math.hypot(f.vx||0,f.vy||0,f.vz||0);
   const prev=f.flybyAudioPrev;
   let radial=0,screenMotion=0;
   if(prev){
     radial=(prev.dist-dist)/safeDt;
     screenMotion=Math.hypot((p.x-prev.x)/Math.max(1,W),(p.y-prev.y)/Math.max(1,viewH))/safeDt
   }
   f.flybyAudioPrev={x:p.x,y:p.y,dist};
   const radialMotion=Math.abs(radial)/FLYBY_NORMAL_SPEED;
   const motion=Math.max(radialMotion,screenMotion*.72);
   if(normDistance>flybyParams.closeGate+.12||speed<7||motion<.08)continue;
   const relSpeed=clamp((speed/FLYBY_NORMAL_SPEED)*flybyParams.relativeSpeedReference,0,2);
   const approach=clamp(radial/FLYBY_NORMAL_SPEED,-1,1);
   const pan=clamp(p.x/Math.max(1,W)*2-1,-1,1);
   const closeness=clamp(1-normDistance/(flybyParams.closeGate+.12),0,1);
   states.push({id:f.id,distance:normDistance,pan,relSpeed,approach,motion,score:closeness*(.7+motion)*(1+relSpeed*.15)})
 }
 audio.flyby.update(states)
}

function resetSpaceDogfightDirector(){
 spaceAggressorCooldown=.34+Math.random()*.34;spaceNoAggressorT=0;spaceHostileFireGate=0;
 spacePursuitId=0;spacePursuitLostT=0;spaceLockId=0;spaceLockAcquireId=0;spaceLockAcquireT=0;spaceLockAcquireGrace=0;spaceLockLostT=0;spaceLockHeld=false;
 for(const f of fighters){f.pursuitAcquireT=0;f.pursuitStrength=0;f.pursuitAge=0;f.pursuitReturnFireCD=0;f.pursuitReelLastRange=NaN;f.pursuitBreakUsed=false;f.pursuitBreakStart=0;f.pursuitBreakDuration=0;f.counterattackCooldown=0;f.counterattackDecision=false;f.pursuitCounterattack=false;f.counterattackVisibleT=0;f.counterattackSeen=false;f.attackQueued=false;f.attackKind='';f.attackProfile='';f.attackSpeedScale=1;f.attackPassZ=0;f.incomingEdge='';f.edgeAngle=null;f.lastCueDx=0;f.lastCueDy=0;f.attackEscape=false;f.attackEscapeReason='';f.attackExitDeadline=0;f.escapeNX=0;f.escapeNY=0;f.quarryReturnKind='';f.quarryReentryGrace=0}
}
function fighterVisible(f,margin=70){
 if(!f||f.dead||f.dying||f.t<0)return false;
 const q=camPoint([f.x,f.y,f.z]);
 if(!q||q[2]<=.18)return false;
 const p=projectCam(q);
 return !!(p&&p.x>=-margin&&p.x<=W+margin&&p.y>=-margin&&p.y<=viewH+margin)
}
function fighterInsideViewport(f,margin=0){
 if(!f||f.dead||f.dying||f.t<0)return false;
 const q=fighterCam(f);if(!q||q[2]<=.18)return false;
 const p=projectCam(q);
 return !!(p&&p.x>=-margin&&p.x<=W+margin&&p.y>=-margin&&p.y<=viewH+margin)
}


// ---------- VOX simulator: pirate combat lesson ----------
// Stage 2 is deliberately choreographed rather than left to the normal dogfight
// director. Each skill is isolated so the player learns the control before the
// pirate is allowed to move on to the next behaviour.
const tutorialCombat={
 active:false,step:'idle',targetId:0,projectilesDestroyed:0,
 reminderKey:null,reminderT:0,reminderArmed:false,projectileFireT:0,escapeT:0,trackingAge:0,motionT:0,completionT:0,
 escapeStart:null,escapeEnd:null,frozenWorld:null,
 isActive(){
   return !!(this.active&&campaign.currentMission?.training&&campaign.currentStage?.()?.tutorialCombat&&mode==='play'&&phase==='space')
 },
 target(){return fighters.find(f=>f.id===this.targetId)||null},
 reset(){
   this.active=false;this.step='idle';this.targetId=0;this.projectilesDestroyed=0;
   this.reminderKey=null;this.reminderT=0;this.reminderArmed=false;this.projectileFireT=0;this.escapeT=0;this.trackingAge=0;this.motionT=0;this.completionT=0;this.escapeStart=null;this.escapeEnd=null;this.frozenWorld=null
 },
 begin(stage){
   this.reset();
   if(!stage?.tutorialCombat)return;
   const f=fighters.find(x=>!x.dead&&!x.dying);
   if(!f)return;
   this.active=true;this.targetId=f.id;this.projectilesDestroyed=0;this.projectileFireT=1.15;
   this.prepareTarget(f);
   this.setStep('projectiles','tutorialShootProjectiles')
 },
 prepareTarget(f){
   if(!f)return;
   f.t=0;f.dying=false;f.dead=false;f.exiting=false;f.egressT=0;f.offscreenT=0;
   f.dogfightState='tutorial';f.attackKind='';f.attackProfile='';f.attackEscape=false;
   f.shotsLeft=0;f.fireBurstShots=0;f.fireShotCD=0;f.nextShot=99;
   // The lesson is about controls, not destroying this particular pirate.
   f.maxHp=Math.max(1,Math.min(20,f.maxHp||12));f.hp=f.maxHp;f.pursuitCounterattack=false;f.counterattackDecision=false;
 },
 setStep(step,voiceKey=null){
   this.step=step;this.reminderKey=voiceKey;this.reminderT=10;this.reminderArmed=false;
   if(voiceKey)audio.playVoice(voiceKey,{once:false,priority:false})
 },
 updateReminder(dt){
   if(!this.reminderKey)return;
   // The first ten-second interval starts only AFTER the initial instruction (and
   // any objective-complete cue before it) has actually finished.
   if(!this.reminderArmed){
     if(audio.voicePlaying||audio.voiceQueue?.length||audio.voiceDelayTimer||audio.objectiveCuePendingOrBusy?.())return;
     this.reminderArmed=true;this.reminderT=10;return
   }
   this.reminderT-=dt;
   if(this.reminderT>0)return;
   if(audio.voicePlaying||audio.voiceQueue?.length||audio.voiceDelayTimer||audio.objectiveCuePendingOrBusy?.())return;
   audio.playVoice(this.reminderKey,{once:false,priority:false});this.reminderT=10;this.reminderArmed=false
 },
 anchorTarget(f,dt,camX=5.8,camY=.8,camZ=36,localVel=null,bank=0){
   const old=[f.x,f.y,f.z],w=cameraPointToWorld([camX,camY,camZ]);
   f.x=w[0];f.y=w[1];f.z=w[2];
   const d=Math.max(.001,dt||.016);f.vx=(f.x-old[0])/d;f.vy=(f.y-old[1])/d;f.vz=(f.z-old[2])/d;
   if(localVel&&Math.hypot(localVel[0]||0,localVel[1]||0,localVel[2]||0)>.001){
     const dir=norm3(cameraVectorToWorld(norm3(localVel))),yaw=Math.atan2(-dir[0],-dir[2]),pitch=Math.atan2(dir[1],Math.hypot(dir[0],dir[2]));
     f.rot[0]=pitch;f.rot[1]=yaw;f.rot[2]=bank
   }else{
     f.rot[0]=0;f.rot[1]=Math.PI;f.rot[2]=bank
   }
 },
 flyTrainingPattern(f,dt){
   // Camera-relative choreography keeps the teaching fighter available to the learner,
   // but it should still look like a fighter rather than a suspended target dummy.
   // The combined waves give it broad sweeps, climbs/dives, diagonal crosses and a
   // gentle approach/recede cycle while remaining comfortably inside the viewport.
   this.motionT+=dt;
   const t=this.motionT;
   const z=31.5+5.5*Math.sin(t*.53+1.05)+1.8*Math.sin(t*1.31+.25);
   const h=screenHalfAtDepth(z);
   let nx=.40*Math.sin(t*.71)+.12*Math.sin(t*1.79+.85);
   let ny=.27*Math.sin(t*.94+.62)+.105*Math.sin(t*1.67-.35);
   nx=clamp(nx,-.52,.52);ny=clamp(ny,-.40,.40);
   const x=h.x*nx,y=h.y*ny;

   // A short finite-difference tangent is used for pose only. It gives visible pitch,
   // yaw and banking through the same path without allowing ordinary dogfight AI to
   // take ownership of the tutorial craft.
   const e=.035,t2=t+e;
   const z2=31.5+5.5*Math.sin(t2*.53+1.05)+1.8*Math.sin(t2*1.31+.25),h2=screenHalfAtDepth(z2);
   let nx2=.40*Math.sin(t2*.71)+.12*Math.sin(t2*1.79+.85);
   let ny2=.27*Math.sin(t2*.94+.62)+.105*Math.sin(t2*1.67-.35);
   nx2=clamp(nx2,-.52,.52);ny2=clamp(ny2,-.40,.40);
   const x2=h2.x*nx2,y2=h2.y*ny2;
   const localVel=[(x2-x)/e,(y2-y)/e,(z2-z)/e];
   const bank=clamp(-(nx2-nx)/e*1.05,-.82,.82);
   this.anchorTarget(f,dt,x,y,z,localVel,bank)
 },
 update(dt){
   if(!this.isActive()){if(this.active)this.reset();return}
   // Give the kill a brief readable beat, then use the simulator's established
   // static/beep hard cut into the consumables exercise.
   if(this.step==='destroyComplete'){
     this.completionT=Math.max(0,this.completionT-dt);
     if(this.completionT<=0&&!audio.objectiveCuePendingOrBusy?.())scenarioFlow.beginSimulatorCut();
     return
   }
   const f=this.target();
   if(!f){
     // Dead fighters are removed from the world array in the same frame their
     // explosion finalises. Treat disappearance of the destroy-step target as the
     // successful kill rather than resetting the tutorial controller.
     if(this.step==='destroy'){
       this.reminderKey=null;this.reminderT=0;this.reminderArmed=false;this.step='destroyComplete';this.targetId=0;this.completionT=.70;
       completeTutorialObjective('tutorialDestroyEnemy');say('TARGET DESTROYED',.65);return
     }
     this.reset();return
   }
   if(this.step==='destroy'){
     // Normal destruction is allowed to finish its regular hit flash/explosion before
     // we mark the exercise complete.
     if(f.dead){
       this.reminderKey=null;this.reminderT=0;this.reminderArmed=false;this.step='destroyComplete';this.targetId=0;this.completionT=.70;
       completeTutorialObjective('tutorialDestroyEnemy');say('TARGET DESTROYED',.65);
       return
     }
     if(f.dying){this.updateReminder(dt);return}
   }else{
     if(f.dead||f.dying){this.reset();return}
     this.prepareTarget(f)
   }

   if(this.step==='projectiles'){
     // Keep the teaching pirate in a readable part of the display while it sends
     // one interceptable fireball at a time.
     this.flyTrainingPattern(f,dt);
     if(spaceLockId===f.id)releaseSpaceLock();
     this.projectileFireT-=dt;
     if(this.projectilesDestroyed<3&&!bolts.some(b=>!b.dead)&&this.projectileFireT<=0){
       spaceHostileFireGate=0;
       if(spawnFighterBolt(f))this.projectileFireT=2.15;
       else this.projectileFireT=.18
     }
   }else if(this.step==='lock'){
     // It keeps flying a compact, varied combat pattern while the player learns the
     // sustained RMB acquisition gesture. The path is camera-relative only to stop
     // the tutorial target from accidentally disappearing before the lesson is done.
     this.flyTrainingPattern(f,dt)
   }else if(this.step==='trackingEscape'){
     // Continue from the exact point and heading where the lock was earned, then make
     // one committed run through the nearest sensible screen edge. Once safely beyond
     // that edge the same craft becomes world-fixed so following the chevrons is real.
     this.escapeT=Math.min(1,this.escapeT+dt/1.35);
     const a=this.escapeStart||[5.8,.8,36],b=this.escapeEnd||[screenHalfAtDepth(36).x*1.48,.8,36],u=ease(this.escapeT);
     const camX=lerp(a[0],b[0],u),camY=lerp(a[1],b[1],u),camZ=lerp(a[2],b[2],u);
     this.anchorTarget(f,dt,camX,camY,camZ,[b[0]-a[0],b[1]-a[1],b[2]-a[2]],clamp(-(b[0]-a[0])*.035,-.85,.85));
     if(this.escapeT>=1){
       this.frozenWorld=[f.x,f.y,f.z];this.trackingAge=0;
       this.setStep('tracking','tutorialFollowTarget')
     }
   }else if(this.step==='tracking'){
     this.trackingAge+=dt;
     if(this.frozenWorld){f.x=this.frozenWorld[0];f.y=this.frozenWorld[1];f.z=this.frozenWorld[2];f.vx=f.vy=f.vz=0}
     if(this.trackingAge>.20&&fighterInsideViewport(f,0)){
       this.reminderKey=null;this.reminderT=0;this.reminderArmed=false;this.frozenWorld=null;
       completeTutorialObjective('tutorialFollowTarget');say('TARGET REACQUIRED',.55);
       // Tracking has now been taught. From this exact position the same pirate is
       // handed back to the real dogfight machinery and becomes a normal hostile:
       // ordinary routes, pursuit behaviour, egress/counterattack and return fire.
       this.setStep('destroy','tutorialDestroyEnemy');
       f.pursuitReturnFireCD=.35;f.counterattackCooldown=0;f.counterattackDecision=false;
       beginAggressorPass(f,false,0)
     }
   }
   this.updateReminder(dt)
 },
 updateFighter(f,dt){
   if(!this.isActive()||!f||f.id!==this.targetId)return false;
   // Once tracking is complete the choreography is over. Let this same fighter run
   // through the ordinary gameplay update, including manoeuvres, firing, egress and
   // pursuit/counterattack behaviour, until the player destroys it.
   if(this.step==='destroy')return false;
   // Earlier teaching steps remain fully scripted.
   return true
 },
 onProjectileDestroyed(_bolt){
   if(!this.isActive()||this.step!=='projectiles')return;
   this.projectilesDestroyed++;
   if(this.projectilesDestroyed<3)return;
   for(const b of bolts)b.dead=true;
   releaseSpaceLock();releaseSpacePursuit();
   completeTutorialObjective('tutorialShootProjectiles');
   this.setStep('lock','tutorialAcquireLock')
 },
 onLockEstablished(f){
   if(!this.isActive()||this.step!=='lock'||!f||f.id!==this.targetId)return;
   this.reminderKey=null;this.reminderT=0;this.reminderArmed=false;this.escapeT=0;this.frozenWorld=null;
   completeTutorialObjective('tutorialAcquireLock');
   const q=fighterCam(f)||[5.8,.8,36],depth=Math.max(12,q[2]),h=screenHalfAtDepth(depth);
   const localDir=cameraVectorToLocal(fighterMotionTangent(f));
   // Prefer the direction it was already travelling; if nearly vertical, use the
   // nearer side. This avoids a tutorial-looking snap or reversal at lock-on.
   let sx=Math.abs(localDir[0])>.12?Math.sign(localDir[0]):Math.sign(q[0]||1);
   if(!sx)sx=1;
   const sy=clamp(q[1]+Math.sign(localDir[1]||1)*h.y*.22,-h.y*.72,h.y*.72);
   this.escapeStart=[q[0],q[1],depth];this.escapeEnd=[sx*h.x*1.48,sy,depth+1.5];
   this.step='trackingEscape'
 },
 keepLock(f){
   return !!(this.isActive()&&f&&f.id===this.targetId&&(this.step==='trackingEscape'||this.step==='tracking'))
 }
};


// ---------- VOX simulator: consumables lesson ----------
// The five pirate drones use the ordinary fighter route system from the first frame.
// The tutorial changes only their mesh, weapon permission and player safety floor;
// using the booster does NOT reposition or restart them.
const tutorialConsumables={
 active:false,step:'idle',droneIds:[],reminderKey:null,reminderT:0,reminderArmed:false,attackT:0,marketIdleT:0,
 isActive(){
   return !!(this.active&&campaign.currentMission?.training&&campaign.currentStage?.()?.tutorialConsumables&&mode==='play'&&phase==='space')
 },
 reset(){
   this.active=false;this.step='idle';this.droneIds=[];this.reminderKey=null;this.reminderT=0;this.reminderArmed=false;this.attackT=0;this.marketIdleT=0
 },
 drones(){return this.droneIds.map(id=>fighters.find(f=>f.id===id)).filter(Boolean)},
 begin(stage){
   this.reset();if(!stage?.tutorialConsumables)return;
   this.active=true;this.step='boost';
   releaseSpaceLock();releaseSpacePursuit();
   // A temporary training consumable lives only in the deployed simulator loadout;
   // finishTraining already discards that loadout, so no market inventory is altered.
   campaign.activeLoadout=['shieldBooster',null,null,null];campaign.activeInternalLoadout=[null,null,null,null];
   shield=1;shieldRegenDelay=0;shieldRegenTick=0;shieldRestoreFlashIndex=-1;shieldRestoreFlashT=0;
   const live=fighters.filter(f=>!f.dead&&!f.dying).slice(0,5);
   this.droneIds=live.map(f=>f.id);
   live.forEach((f,i)=>this.prepareDrone(f,i));
   campaign.updateGearHud();hud();
   // The warning establishes the problem; the second line supplies the control.
   audio.playSequence(['tutorialShieldsCritical','tutorialUseShieldBooster']);
   this.reminderKey='tutorialUseShieldBooster';this.reminderT=10;this.reminderArmed=false
 },
 prepareDrone(f,index){
   if(!f)return;
   // Keep the ordinary route/dogfight state created by startEvent(). That is the
   // normal attack choreography the player will see after the booster too.
   f.mesh=scenarioFlow.pickCustomsDrone(index);f.hullName=`Pirate ${f.mesh?.name||'Drone'}`;f.col=C.m;
   f.maxHp=20;f.hp=20;f.dying=false;f.dead=false;
   // Remove only the staggered spawn delay so the whole threat is visible/active
   // immediately; do not reset position, route, velocity or attack state.
   f.t=Math.max(0,f.t||0)
 },
 updateReminder(dt){
   if(!this.reminderKey)return;
   if(!this.reminderArmed){
     if(audio.voicePlaying||audio.voiceQueue?.length||audio.voiceDelayTimer||audio.objectiveCuePendingOrBusy?.())return;
     this.reminderArmed=true;this.reminderT=10;return
   }
   this.reminderT-=dt;if(this.reminderT>0)return;
   if(audio.voicePlaying||audio.voiceQueue?.length||audio.voiceDelayTimer||audio.objectiveCuePendingOrBusy?.())return;
   audio.playVoice(this.reminderKey,{once:false,priority:false});this.reminderT=10;this.reminderArmed=false
 },
 beginAttack(){
   if(this.step!=='boost')return;
   // The drones are already in ordinary gameplay motion. Using the booster merely
   // removes the firing interlock: no formation snap, teleport or route restart.
   this.step='attack';this.reminderKey=null;this.reminderT=0;this.reminderArmed=false;this.attackT=0;spaceHostileFireGate=.20
 },
 finishAttackDemo(){
   if(this.step!=='attack')return;
   this.step='market';this.reminderKey=null;this.reminderT=0;this.reminderArmed=false;this.marketIdleT=0;
   for(const b of bolts)b.dead=true;
   for(const f of this.drones()){f.shotsLeft=0;f.fireBurstShots=0;f.fireShotCD=99;f.nextShot=99}
   audio.playVoice('tutorialConsumablesMarket',{once:false,priority:false})
 },
 update(dt){
   if(!this.isActive()){if(this.active)this.reset();return}
   if(this.step==='boost'){
     // Slot 1 becoming empty means the real Shield Boost was consumed. The normal
     // consumable code performs the +2 restoration; the tutorial does not fake it.
     if(!campaign.activeLoadout?.[0]){
       completeTutorialObjective('tutorialUseShieldBooster');this.beginAttack()
     }else this.updateReminder(dt)
   }
   if(this.step==='attack'){
     this.attackT+=dt;
     // The lesson must not depend on the enemies happening to land enough hits.
     // Reaching the one-shield safety floor ends the demonstration immediately;
     // otherwise six seconds of normal hostile fire is enough to prove the point.
     if(shield<=1||this.attackT>=6)this.finishAttackDemo()
   }
   if(this.step==='market'){
     // Keep the drones harmless while the Market explanation is spoken, then use
     // the same simulator static cut as the earlier lesson transitions.
     for(const b of bolts)b.dead=true;
     if(audio.voicePlaying||audio.voiceQueue?.length||audio.voiceDelayTimer||audio.objectiveCuePendingOrBusy?.())this.marketIdleT=0;
     else this.marketIdleT+=dt;
     if(this.marketIdleT>=.65){this.active=false;scenarioFlow.beginSimulatorCut();return}
   }
 },
 updateFighter(_f,_dt){return false},
 blockHostileFire(){return !!(this.isActive()&&(this.step!=='attack'||shield<=1))},
 protectShieldFloor(){return !!this.isActive()},
 // Keep the ordinary dogfight director running for the whole scene. Before the
 // boost and after the safety floor, only weapon permission changes; manoeuvres do not.
 allowDirector(){return !!this.isActive()}
};


// ---------- VOX simulator: emergency withdrawal lesson ----------
// This stage uses ordinary fighter AI and the real hold-Q abandonment control. The
// simulator only fixes the player's shields at the one-shield survival floor and
// suppresses the real contract-failure/debrief after the escape zoom has completed.
const tutorialAbandon={
 active:false,step:'idle',enemyIds:[],reminderKey:null,reminderT:0,reminderArmed:false,zoomIdleT:0,
 isActive(){
   return !!(this.active&&campaign.currentMission?.training&&campaign.currentStage?.()?.tutorialAbandon&&mode==='play'&&phase==='space')
 },
 reset(){
   this.active=false;this.step='idle';this.enemyIds=[];this.reminderKey=null;this.reminderT=0;this.reminderArmed=false;this.zoomIdleT=0
 },
 begin(stage){
   this.reset();if(!stage?.tutorialAbandon)return;
   this.active=true;this.step='escape';releaseSpaceLock();releaseSpacePursuit();
   campaign.activeLoadout=[null,null,null,null];campaign.activeInternalLoadout=[null,null,null,null];campaign.updateGearHud();
   shield=1;shieldRegenDelay=0;shieldRegenTick=0;shieldRestoreFlashIndex=-1;shieldRestoreFlashT=0;hud();
   const live=fighters.filter(f=>!f.dead&&!f.dying).slice(0,4),elite=(typeof importedEliteHullMeshes!=='undefined'?importedEliteHullMeshes:[]);
   this.enemyIds=live.map(f=>f.id);
   live.forEach((f,i)=>{
     // Elite-inspired raider hulls distinguish this emergency from both the single
     // pirate fighter exercise and the planetary-drone consumables swarm. Their
     // navigation/fire state remains exactly what ordinary startEvent() created.
     const mesh=elite.length?elite[i%elite.length]:pickEnemyFighterMesh();
     f.mesh=mesh;f.hullName=`Raider ${mesh?.name||'Fighter'}`;f.col=C.r;f.t=Math.max(0,f.t||0);f.maxHp=20;f.hp=20;f.dying=false;f.dead=false
   });
   audio.playSequence(['tutorialNoShieldBooster','tutorialAbandonMission']);
   this.reminderKey='tutorialAbandonMission';this.reminderT=10;this.reminderArmed=false
 },
 updateReminder(dt){
   if(!this.reminderKey)return;
   if(!this.reminderArmed){
     if(audio.voicePlaying||audio.voiceQueue?.length||audio.voiceDelayTimer||audio.objectiveCuePendingOrBusy?.())return;
     this.reminderArmed=true;this.reminderT=10;return
   }
   this.reminderT-=dt;if(this.reminderT>0)return;
   if(audio.voicePlaying||audio.voiceQueue?.length||audio.voiceDelayTimer||audio.objectiveCuePendingOrBusy?.())return;
   audio.playVoice(this.reminderKey,{once:false,priority:false});this.reminderT=10;this.reminderArmed=false
 },
 update(dt){if(this.isActive())this.updateReminder(dt)},
 onAbandonConfirmed(){
   if(!this.active||this.step!=='escape')return;
   this.step='zoom';this.reminderKey=null;this.reminderT=0;this.reminderArmed=false;this.zoomIdleT=0;
   // Start the consequence explanation first. Completing the pinned objective then
   // queues its acknowledgement chime behind this speech rather than over it.
   audio.playVoice('tutorialAbandonFails',{once:false,priority:false});
   completeTutorialObjective('tutorialAbandonMission')
 },
 updateZoomHold(dt){
   if(!this.active||this.step!=='zoom'||!campaign.currentMission?.training||!campaign.currentStage?.()?.tutorialAbandon)return false;
   if(modeT<ABANDON_EXIT_SECONDS)return false;
   // Hold the established abandon zoom until the explanation and completion chime
   // have both finished, then use the normal simulator static cut into the final run.
   if(audio.voicePlaying||audio.voiceQueue?.length||audio.voiceDelayTimer||audio.objectiveCuePendingOrBusy?.()){this.zoomIdleT=0;return false}
   this.zoomIdleT+=dt;
   if(this.zoomIdleT<.65)return false;
   this.active=false;return scenarioFlow.beginSimulatorCut()
 },
 protectShieldFloor(){return !!this.isActive()},
 allowDirector(){return !!this.isActive()}
};

function setFighterEscapeVector(f,nx,ny){
 const n=Math.hypot(nx||0,ny||0)||1;
 f.escapeNX=(nx||0)/n;f.escapeNY=(ny||0)/n;
 // Keep the old fields populated for compatibility/debug views.
 if(Math.abs(f.escapeNX)>=Math.abs(f.escapeNY)){f.escapeAxis='x';f.escapeSign=Math.sign(f.escapeNX||1)}
 else{f.escapeAxis='y';f.escapeSign=Math.sign(f.escapeNY||1)}
}
function rememberFighterExitBias(f,route){
 if(!f||!route?.length)return false;
 const q=camPoint(route[route.length-1]);
 if(!q||q[2]<=.2)return false;
 const h=screenHalfAtDepth(Math.max(3,q[2]));
 let nx=q[0]/Math.max(.001,h.x),ny=q[1]/Math.max(.001,h.y);
 // An exit point near a corner should retain both pitch and bank. Even a cardinal
 // exit keeps a modest secondary component so the craft does not flatten into a
 // left/right carousel.
 if(Math.abs(nx)<.18)nx=signRand()*(.24+Math.random()*.22);
 if(Math.abs(ny)<.18)ny=signRand()*(.24+Math.random()*.22);
 setFighterEscapeVector(f,nx,ny);return true
}
function chooseFighterEscapeEdge(f){
 // Prefer the authored final gate. It encodes the intended bank/pitch direction.
 if(rememberFighterExitBias(f,f.route))return;
 const q=fighterCam(f),dir=cameraVectorToLocal(fighterMotionTangent(f));
 if(!q||q[2]<=.2){setFighterEscapeVector(f,signRand(),signRand()*.65);return}
 const h=screenHalfAtDepth(Math.max(3,q[2]));
 const nx=q[0]/Math.max(.001,h.x),ny=q[1]/Math.max(.001,h.y);
 let ex=dir[0]+nx*.42,ey=dir[1]+ny*.42;
 if(Math.hypot(ex,ey)<.20){ex=signRand();ey=signRand()*(.45+Math.random()*.45)}
 // Avoid almost perfectly horizontal/vertical escapes: visible attack craft should
 // bank and/or pitch through a genuinely oblique screen-space course.
 if(Math.abs(ex)<Math.abs(ey)*.20)ex=signRand()*(.28+Math.random()*.22);
 if(Math.abs(ey)<Math.abs(ex)*.20)ey=signRand()*(.28+Math.random()*.22);
 setFighterEscapeVector(f,ex,ey)
}
function beginFighterAttackEscape(f,reason='pass'){
 if(!f||f.dead||f.dying||f.attackEscape)return false;
 f.attackEscape=true;f.attackEscapeReason=reason;
 chooseFighterEscapeEdge(f);
 f.routeLastDist=Infinity;
 return true
}
// Pursuit keeps v165's visible dogfight choreography. The quarry still tries to leave
// through a screen edge and gets one committed break. The only new cheat is PLAYER-
// relative closure: when the nose is actually pointed toward the quarry, we translate
// that one fighter toward the camera without reducing any of its own lateral velocity.
function pursuitEscapeDelay(){return clamp(Number(combatTuning.pursuitHold)||2.0,.25,8)}
function pursuitEscapeBoost(){return clamp(Number(combatTuning.pursuitBoost)||320,110,450)/100}
function pursuitEscapeDuration(){return clamp(Number(combatTuning.pursuitBurstDuration)||1.15,.30,2.50)}
function pursuitBreakRange(){return clamp(Number(combatTuning.pursuitBreakRange)||16,10,26)}
function pursuitReelRate(){return clamp(Number(combatTuning.pursuitReel)||0,0,30)}
function closePassFrequency(){return clamp(Number(combatTuning.closePassChance)||60,0,100)/100}
function fighterTrueRange(f){return f?Math.hypot((f.x||0)-shipX,(f.y||0)-shipY,f.z||0):Infinity}
function resetPursuitBreak(f){
 if(!f)return;
 f.pursuitBreakUsed=false;f.pursuitBreakStart=0;f.pursuitBreakDuration=0
}
function maybeStartPursuitBreak(f){
 if(!f||f.id!==spacePursuitId||f.pursuitBreakUsed)return false;
 const age=f.pursuitAge||0,range=fighterTrueRange(f);
 // v173: earn the break by getting genuinely CLOSE. v172's 20-unit trigger
 // could fire while the quarry still felt mid-distance. The default is now 16 and
 // is live-tunable. A long chase gets only a narrow fallback band; it never gets a
 // free far-range escape just because a timer elapsed.
 if(age<.55)return false;
 const trigger=pursuitBreakRange();
 if(range>trigger){
   if(age<pursuitEscapeDelay()+1.0||range>trigger+4.0)return false
 }
 let ex=f.escapeNX||0,ey=f.escapeNY||0;
 if(Math.hypot(ex,ey)<.1){chooseFighterEscapeEdge(f);ex=f.escapeNX||1;ey=f.escapeNY||.45}
 // One obvious committed break: rotate the previous escape direction by roughly
 // ninety degrees, choosing the sign which carries the fighter farther outward.
 const side=Math.random()<.5?-1:1;
 let nx=-ey*side,ny=ex*side;
 const q=fighterCam(f);
 if(q&&q[2]>2){
   const h=screenHalfAtDepth(Math.max(3,q[2])),sx=q[0]/Math.max(.001,h.x),sy=q[1]/Math.max(.001,h.y);
   if(nx*sx+ny*sy<0){nx=-nx;ny=-ny}
 }
 setFighterEscapeVector(f,nx,ny);
 f.pursuitBreakUsed=true;f.pursuitBreakStart=f.pursuitAge||0;f.pursuitBreakDuration=pursuitEscapeDuration();
 // Make the quarry dangerous during the break rather than turning it into prey.
 f.pursuitReturnFireCD=Math.min(f.pursuitReturnFireCD||.18,.18);
 return true
}
function pursuitBreakActive(f){
 maybeStartPursuitBreak(f);
 return !!(f?.pursuitBreakUsed&&((f.pursuitAge||0)-(f.pursuitBreakStart||0))<(f.pursuitBreakDuration||1.1))
}
function pursuitSpeedMultiplier(f){return pursuitBreakActive(f)?pursuitEscapeBoost():1}
function pursuedEscapeDirection(f,dir,dt){
 if(!f||f.id!==spacePursuitId)return dir;
 const q=fighterCam(f);if(!q||q[2]<=2.2)return dir;
 let ex=f.escapeNX||0,ey=f.escapeNY||0;
 if(Math.hypot(ex,ey)<.1){chooseFighterEscapeEdge(f);ex=f.escapeNX||1;ey=f.escapeNY||.45}
 const breaking=pursuitBreakActive(f);

 // v169: remove v165's unconditional long-range depth leash. That leash was what
 // could hold a pursued fighter in a permanently convenient firing position. The
 // quarry now keeps a small genuine away component; closing distance is supplied
 // separately by applyPursuitReel(), and only while the PLAYER points toward it.
 const depth=q[2];
 let zBias=.075;
 if(depth<14)zBias=lerp(.42,.10,clamp((depth-7)/7,0,1));
 const lateral=breaking?1.42:(depth>42?1.30:1.10);
 if(breaking)zBias=.055;
 const wantedLocal=norm3([ex*lateral,ey*lateral,zBias]);
 const wanted=norm3(cameraVectorToWorld(wantedLocal));
 const baseTurn=f.routeTurnRate||routeTurnFor(f,'attack');
 const turnRate=breaking?Math.max(baseTurn*3.15,230*Math.PI/180):Math.max(baseTurn*1.58,108*Math.PI/180);
 return turnTowardDir(dir,wanted,turnRate*dt)
}
function fighterAttackEscapeDirection(f,dir,dt){
 if(!f?.attackEscape)return dir;
 if(f.id===spacePursuitId||f.id===spaceLockId)return pursuedEscapeDirection(f,dir,dt);
 if(f.attackKind==='throughRush'){
   // Keep a committed near-miss travelling THROUGH the player's plane instead of
   // converting its first shot into the usual edge peel. The slight lateral carry
   // prevents it from becoming a collision-course missile.
   const local=cameraVectorToLocal(dir),wantedLocal=norm3([local[0]*1.18,local[1]*1.18,-.72]);
   const wanted=norm3(cameraVectorToWorld(wantedLocal));
   const baseTurn=f.routeTurnRate||routeTurnFor(f,'attack');
   return turnTowardDir(dir,wanted,Math.max(baseTurn*1.32,88*Math.PI/180)*dt)
 }
 const q=fighterCam(f);if(!q||q[2]<=.2)return dir;
 const h=screenHalfAtDepth(Math.max(3,q[2]));
 const nx=q[0]/Math.max(.001,h.x),ny=q[1]/Math.max(.001,h.y);
 const depth=clamp((q[2]-10)/34,0,1);
 let ex=f.escapeNX||0,ey=f.escapeNY||0;
 if(Math.hypot(ex,ey)<.1){chooseFighterEscapeEdge(f);ex=f.escapeNX||1;ey=f.escapeNY||.45}
 const towardEdge=Math.max(Math.abs(nx),Math.abs(ny));
 const transverse=lerp(.82,1.42,depth)*(1-.08*clamp(towardEdge,0,1));
 let c=cameraVectorToLocal(dir);
 c[0]=lerp(c[0],ex*transverse,.76);c[1]=lerp(c[1],ey*transverse,.76);
 const maxAway=lerp(.34,.06,depth);if(c[2]>maxAway)c[2]=maxAway;
 const wanted=norm3(cameraVectorToWorld(norm3(c)));
 const baseTurn=(f.routeTurnRate||routeTurnFor(f,'attack'));
 return turnTowardDir(dir,wanted,baseTurn*1.34*dt)
}
function fighterCam(f){return camPoint([f.x,f.y,f.z])}
function norm3(v){const n=Math.hypot(v[0]||0,v[1]||0,v[2]||0)||1;return[(v[0]||0)/n,(v[1]||0)/n,(v[2]||0)/n]}
function fighterPathTangent(f){
 const speed=Math.hypot(f?.vx||0,f?.vy||0,f?.vz||0);
 if(speed>.05)return[(f.vx||0)/speed,(f.vy||0)/speed,(f.vz||0)/speed];
 if(!f?.pts?.length)return[0,0,1];
 const t=clamp(f.t||0,0,.994),a=samplePath(f.pts,t),b=samplePath(f.pts,Math.min(.999,t+.018));
 return norm3([b[0]-a[0],b[1]-a[1],b[2]-a[2]])
}
function fighterMotionTangent(f){return fighterPathTangent(f)}
function cleanRoute(points){
 const out=[];
 for(const p of points||[]){
   if(!p)continue;
   const q=[p[0],p[1],p[2]],last=out[out.length-1];
   if(!last||Math.hypot(q[0]-last[0],q[1]-last[1],q[2]-last[2])>.25)out.push(q)
 }
 return out
}
// v149: visible attack passes are deliberately readable. Fighters escape by banking
// toward an edge early, not by crossing the cockpit at missile speed.
function routeSpeedFor(f,state){
 const base=dogfightStyle(f).speed||25;
 if(state==='background')return base*.90;
 if(state==='evade')return base*1.12;
 if(state==='rejoin')return base*.90;
 if(state==='attack')return base*(f.attackSpeedScale||.99); // v154 per-pass pace: mostly readable, occasional fast rush
 return base
}
function routeTurnFor(f,state){
 const base=(dogfightStyle(f).turn||46)*Math.PI/180;
 if(state==='evade')return Math.max(base,72*Math.PI/180);
 if(state==='background')return base*.82;
 if(state==='rejoin')return base*.78;
 if(state==='attack')return Math.max(base*1.28,66*Math.PI/180);
 return base
}
function setFighterRoute(f,points,state,{preserve=false,delay=0,duration=null}={}){
 const route=cleanRoute(points);if(route.length<2)return false;
 f.route=route;f.routeIndex=1;f.routeState=state;f.routeAge=0;f.routeLastDist=Infinity;
 f.routeSpeed=routeSpeedFor(f,state);f.routeTurnRate=routeTurnFor(f,state);
 f.dur=duration||f.dur||3;f.t=delay>0?-delay/Math.max(.1,f.dur):0;
 if(!preserve){f.x=route[0][0];f.y=route[0][1];f.z=route[0][2]}
 const curSpeed=Math.hypot(f.vx||0,f.vy||0,f.vz||0);
 if(!preserve||curSpeed<1){
   const target=route[Math.min(1,route.length-1)],d=norm3([target[0]-f.x,target[1]-f.y,target[2]-f.z]);
   f.vx=d[0]*f.routeSpeed;f.vy=d[1]*f.routeSpeed;f.vz=d[2]*f.routeSpeed
 }
 return true
}
// v149: while an attacker is still visible, do NOT solve escape by making the
// whole craft absurdly fast. Perspective compensation is primarily directional:
// hold depth roughly steady and spend the available velocity on crossing an edge.
// Only a very small speed allowance remains at long range.
function fighterEscapeDepth(f){
 const q=fighterCam(f);
 if(!q||q[2]<=0)return 0;
 return clamp((q[2]-9)/48,0,1)
}
function fighterEscapeBoost(f){
 const d=fighterEscapeDepth(f),smooth=d*d*(3-2*d);
 return lerp(1.0,1.06,smooth)
}
function unpursuedEscapeDirection(f,dir,dt){
 if(!f||f.id===spacePursuitId||f.id===spaceLockId)return dir;
 const depth=fighterEscapeDepth(f);if(depth<=0)return dir;
 const q=fighterCam(f);if(!q||q[2]<=2)return dir;
 let ex=f.escapeNX||0,ey=f.escapeNY||0;
 if(Math.hypot(ex,ey)<.1){chooseFighterEscapeEdge(f);ex=f.escapeNX||1;ey=f.escapeNY||.45}
 let c=cameraVectorToLocal(dir);
 const floor=lerp(.16,.72,depth),boost=1+depth*1.32;
 const tx=ex*floor*boost,ty=ey*floor*boost;
 const blend=lerp(.30,.72,depth);
 c[0]=lerp(c[0],tx,blend);c[1]=lerp(c[1],ty,blend);
 c[2]*=lerp(1,.54,depth);
 const wanted=cameraVectorToWorld(norm3(c));
 return turnTowardDir(dir,wanted,lerp(.32,.92,depth)*dt)
}
function turnTowardDir(current,desired,maxAngle){
 const a=norm3(current),b=norm3(desired),dot=clamp(a[0]*b[0]+a[1]*b[1]+a[2]*b[2],-1,1),ang=Math.acos(dot);
 if(ang<1e-5||maxAngle>=ang)return b;
 const t=clamp(maxAngle/ang,0,1);
 return norm3([lerp(a[0],b[0],t),lerp(a[1],b[1],t),lerp(a[2],b[2],t)])
}
function advanceFighterRoute(f,dt){
 if(!f?.route?.length||f.routeIndex>=f.route.length)return true;
 const enemyScale=tuneScale('enemySpeed');
 const forcedAttackExit=f.routeState==='attack'&&!!f.attackEscape;
 const escapeLeg=forcedAttackExit||(f.routeState==='attack'&&f.routeIndex>=(f.attackExitIndex??Infinity)&&f.id!==spacePursuitId&&f.id!==spaceLockId);
 const depthBoost=forcedAttackExit?(f.id===spacePursuitId||f.id===spaceLockId?1.0:lerp(1.0,1.06,fighterEscapeDepth(f))):fighterEscapeBoost(f);
 // Pursued craft get only one explicit boost, after the escape delay. Otherwise
 // their speed is ordinary; the edgeward course itself creates the chase.
 const pursuitSpeed=(f.id===spacePursuitId&&fighterInsideViewport(f,40))?pursuitSpeedMultiplier(f):1;
 const speed=(f.routeSpeed||25)*enemyScale*(escapeLeg?depthBoost:1)*pursuitSpeed;
 let target=f.route[f.routeIndex];
 let dist=Math.hypot(target[0]-f.x,target[1]-f.y,target[2]-f.z);
 // Waypoints are gates, not pin-heads. A real craft must not orbit a mathematical
 // point because its finite turn radius prevented an exact intersection.
 const reach=Math.max(5.5,speed*dt*2.0);
 const passed=(dist>(f.routeLastDist??Infinity)&&(f.routeLastDist??Infinity)<12);
 if(!forcedAttackExit&&(dist<reach||passed)&&f.routeIndex<f.route.length-1){
   f.routeIndex++;f.routeLastDist=Infinity;target=f.route[f.routeIndex];
   dist=Math.hypot(target[0]-f.x,target[1]-f.y,target[2]-f.z)
 }
 if(!forcedAttackExit&&(dist<reach||passed)&&f.routeIndex>=f.route.length-1)return true;
 f.routeLastDist=dist;
 let desired=forcedAttackExit?fighterMotionTangent(f):norm3([target[0]-f.x,target[1]-f.y,target[2]-f.z]);
 if(forcedAttackExit)desired=fighterAttackEscapeDirection(f,desired,dt);
 else if(escapeLeg)desired=unpursuedEscapeDirection(f,desired,dt);
 // A chased craft never gets to solve the engagement by simply flying straight
 // downrange. It keeps attempting a real bank/pitch escape even on ordinary routes.
 if(f.id===spacePursuitId&&!forcedAttackExit)desired=pursuedEscapeDirection(f,desired,dt);
 const oldDir=fighterMotionTangent(f),newDir=turnTowardDir(oldDir,desired,(f.routeTurnRate||.8)*enemyScale*dt);
 const oldSpeed=Math.hypot(f.vx||0,f.vy||0,f.vz||0)||speed;
 const actualSpeed=lerp(oldSpeed,speed,1-Math.exp(-dt*(forcedAttackExit?4.6:2.6)));
 f.vx=newDir[0]*actualSpeed;f.vy=newDir[1]*actualSpeed;f.vz=newDir[2]*actualSpeed;
 f.x+=f.vx*dt;f.y+=f.vy*dt;f.z+=f.vz*dt;
 f.routeAge=(f.routeAge||0)+dt*enemyScale;f.t=clamp(f.routeAge/Math.max(.1,f.dur||3),0,.999);
 const cross=oldDir[2]*newDir[0]-oldDir[0]*newDir[2];
 const pitchTurn=oldDir[1]-newDir[1];
 const targetBank=clamp(-cross*10-pitchTurn*2.2,-1.05,1.05);
 f.bank=lerp(f.bank||0,targetBank,1-Math.exp(-dt*(forcedAttackExit?5.2:4.0)));
 // A completed attack is defined by actually clearing the viewport, not by reaching
 // some far-away waypoint. Visible escape uses course/edge bias rather than huge speed.
 if(forcedAttackExit&&!fighterInsideViewport(f,28))return true;
 return false
}
function applyUnpursuedEgressEscape(f,dt){
 if(!f||f.id===spacePursuitId||f.id===spaceLockId)return;
 const dir=fighterMotionTangent(f),want=unpursuedEscapeDirection(f,dir,dt);
 const depth=fighterEscapeDepth(f);
 const base=routeSpeedFor(f,'attack');
 const onScreen=fighterInsideViewport(f,28);
 // While visible, keep the pass readable: only a tiny depth-related speed lift is
 // allowed. Once genuinely off-screen we may accelerate repositioning because the
 // player cannot see the cheat.
 const targetSpeed=base*(onScreen?lerp(1.0,1.08,depth):lerp(1.12,1.70,depth));
 const current=Math.hypot(f.vx||0,f.vy||0,f.vz||0)||base;
 const speed=lerp(current,targetSpeed,1-Math.exp(-dt*(onScreen?2.6:4.0)));
 f.vx=want[0]*speed;f.vy=want[1]*speed;f.vz=want[2]*speed
}
function applyPursuitEgressAssist(f,dt){
 if(!f||f.id!==spacePursuitId||(f.pursuitStrength||0)<=0)return;
 const dir=fighterMotionTangent(f),newDir=pursuedEscapeDirection(f,dir,dt);
 const base=routeSpeedFor(f,'attack'),current=Math.hypot(f.vx||0,f.vy||0,f.vz||0)||base;
 const target=base*pursuitSpeedMultiplier(f),speed=lerp(current,target,1-Math.exp(-dt*5.5));
 f.vx=newDir[0]*speed;f.vy=newDir[1]*speed;f.vz=newDir[2]*speed
}

function applyPursuitReel(f,dt){
 // v171: the pursuit cheat operates on TRUE fighter-to-player range, not camera Z.
 // v170 could be defeated by camera rotation: a target might remain under the reticle
 // while its camera-depth still grew. Here, once the quarry is being pursued and the
 // weapon sight is on/near it, its real 3D range is guaranteed to fall by at least
 // pursuitReelRate() units per second. X/Y manoeuvring velocity is never slowed.
 if(!f||f.id!==spacePursuitId||(f.pursuitStrength||0)<=.03)return;
 // v174: fresh quarry re-entry geometry must be allowed to play out before
 // the tail-chase assistance resumes.
 if(f.pursuitCounterattack||(f.quarryReentryGrace||0)>0){f.pursuitReelLastRange=NaN;return}
 // v172: once the close-range break begins, stop fighting the escape with the
 // reel cheat. The fighter keeps its full lateral manoeuvre and boosted speed for
 // a short burst, so it can actually leave the player's firing window.
 if(pursuitBreakActive(f)){f.pursuitReelLastRange=NaN;return}
 const rel=[f.x-shipX,f.y-shipY,f.z];
 const range=Math.hypot(rel[0],rel[1],rel[2]);
 if(!Number.isFinite(range)||range<=10.5)return;
 const rate=pursuitReelRate();
 if(rate<=0){f.pursuitReelLastRange=range;return}
 const q=fighterCam(f);
 if(!q||q[2]<=2.5||q[2]>190){f.pursuitReelLastRange=range;return}
 const p=projectCam(q);
 if(!p){f.pursuitReelLastRange=range;return}
 const a=aimScreen();
 const radius=clamp((f.s||1)*p.k,15,86);
 const d=Math.hypot(a.x-p.x,a.y-p.y);
 const full=clamp(radius*.72+18,30,76),zero=full+105;
 let align=clamp((zero-d)/Math.max(1,zero-full),0,1);
 align=align*align*(3-2*align);
 // No sight contact means no reel. Reset the baseline so reacquiring a target does
 // not teleport away range accumulated while the player was not tracking it.
 if(align<=.001){f.pursuitReelLastRange=range;return}
 const prev=Number.isFinite(f.pursuitReelLastRange)?f.pursuitReelLastRange:range;
 const nearFade=clamp((range-11)/15,0,1);
 const targetRange=Math.max(10.5,prev-rate*align*nearFade*dt);
 // If the fighter naturally closed faster than the cheat requires, leave it alone.
 // Otherwise pull only enough distance out of the radial vector to guarantee closure.
 const desiredRange=Math.min(range,targetRange);
 const delta=range-desiredRange;
 if(delta>1e-6){
   const inv=1/Math.max(.001,range);
   const shift=[-rel[0]*inv*delta,-rel[1]*inv*delta,-rel[2]*inv*delta];
   f.x+=shift[0];f.y+=shift[1];f.z+=shift[2];
   // Keep future route gates in the same translated frame. This changes only range;
   // the fighter's own lateral course and speed remain exactly as v165 chose them.
   if(Array.isArray(f.route)){
     const start=Math.max(0,Math.min(f.route.length,f.routeIndex||0));
     for(let i=start;i<f.route.length;i++){const rp=f.route[i];if(!rp)continue;rp[0]+=shift[0];rp[1]+=shift[1];rp[2]+=shift[2]}
   }
 }
 f.pursuitReelLastRange=desiredRange;
}

function fighterDamageAgility(f){
 const damage=clamp(((f.maxHp||3)-(f.hp||0))/Math.max(1,f.maxHp||3),0,1);
 return lerp(1,tuneScale('damagedAgility'),damage)
}
function queueFighterEvasion(f,kind='track',strength=1){
 if(kind==='track')return false; // Being looked at is not an excuse to twitch. Only actual fire provokes a break.
 if(!f||f.dead||f.dying||mode!=='play'||phase!=='space'||f.dogfightState==='evade')return false;
 // A committed hit/near-miss may upgrade a pending mild tracking reaction, but
 // fighters cannot twitch continuously: every real reaction earns a cooldown.
 const priority={track:1,near:2,hit:3},old=priority[f.evadePendingKind]||0,next=priority[kind]||1;
 if((f.evasionCD||0)>0)return false;
 if((f.evadePendingT||0)>0&&old>next)return false;
 f.evadePendingKind=kind;
 f.evadePendingStrength=Math.max(f.evadePendingStrength||0,strength);
 const base=Math.max(.04,(combatTuning.evasionReactionMs||320)/1000);
 f.evadePendingT=base*(kind==='hit'?.62:kind==='near'?.82:1);
 return true
}
function startTrackingJink(f,strength=.55){
 if(!f||f.dead||f.dying)return false;
 const vb=tuneScale('verticalBias'),agility=fighterDamageAgility(f);
 f.jinkAge=0;f.jinkDur=Math.max(.25,(combatTuning.breakDuration||1.15)*.58/agility);
 f.jinkAmp=(1.7+Math.random()*1.4)*strength*agility;
 f.jinkSide=signRand();
 // Climbers favour pitch, flankers favour lateral breaks; everybody can use both.
 const baseVert=.78;
 f.jinkVert=signRand()*baseVert*vb;
 f.jinkRight=cameraVectorToWorld([1,0,0]);f.jinkUp=cameraVectorToWorld([0,1,0]);
 f.evasionCD=Math.max(f.evasionCD||0,(combatTuning.evasionCooldown||1.35)*.72);
 f.threatT=0;
 return true
}
function fighterJinkOffset(f,secondsAhead=0){
 if(!f?.jinkDur||!f.jinkRight||!f.jinkUp)return[0,0,0];
 const u=clamp(((f.jinkAge||0)+secondsAhead)/f.jinkDur,0,1),e=Math.sin(Math.PI*u);
 const amp=(f.jinkAmp||0)*e;
 return[
   f.jinkRight[0]*(f.jinkSide||1)*amp+f.jinkUp[0]*(f.jinkVert||0)*amp,
   f.jinkRight[1]*(f.jinkSide||1)*amp+f.jinkUp[1]*(f.jinkVert||0)*amp,
   f.jinkRight[2]*(f.jinkSide||1)*amp+f.jinkUp[2]*(f.jinkVert||0)*amp
 ]
}
function beginEvasiveBreak(f,strength=1,reason='near'){
 if(!f||f.dead||f.dying)return false;
 const t=fighterMotionTangent(f),cur=[f.x,f.y,f.z];
 const right=cameraVectorToWorld([1,0,0]),up=cameraVectorToWorld([0,1,0]);
 const agility=fighterDamageAgility(f),vb=tuneScale('verticalBias');
 // Keep the previous break direction more often than not. Under fire a pilot banks
 // onto a new course and commits to it; it does not alternate left/right every hit.
 const side=(Math.random()<.78&&f.lastBreakSide)?f.lastBreakSide:signRand(),vert=(Math.random()<.74&&f.lastBreakVert)?f.lastBreakVert:signRand();
 f.lastBreakSide=side;f.lastBreakVert=vert;
 const lateral=6.8*strength*agility;
 const vertical=5.8*strength*agility*vb;
 const duration=Math.max(1.15,(combatTuning.breakDuration||1.15)*1.05/Math.max(.55,agility));
 const add=(base,fs,rs,us)=>[
   base[0]+t[0]*fs+right[0]*side*rs+up[0]*vert*us,
   base[1]+t[1]*fs+right[1]*side*rs+up[1]*vert*us,
   base[2]+t[2]*fs+right[2]*side*rs+up[2]*vert*us
 ];
 const p1=add(cur,10,lateral*.35,vertical*.28),p2=add(cur,22,lateral*.82,vertical*.72),p3=add(cur,38,lateral*1.25,vertical),p4=add(cur,56,lateral*1.45,vertical*.92);
 setFighterRoute(f,[cur,p1,p2,p3,p4],'evade',{preserve:true,duration:duration*2.1});f.pts=f.route;
 f.exiting=false;f.egressT=0;f.offscreenT=0;f.dogfightState='evade';
 f.shotsLeft=0;f.fireBurstShots=0;f.fireShotCD=0;f.threatT=0;
 f.jinkAge=0;f.jinkDur=0;f.jinkRight=f.jinkUp=null;
 f.evasionCD=Math.max(2.35,(combatTuning.evasionCooldown||1.35)*1.8);
 spaceAggressorCooldown=Math.min(spaceAggressorCooldown,.24+Math.random()*.28);
 orientFighter(f);return true
}

function tickFighterEvasion(f,dt){
 f.evasionCD=Math.max(0,(f.evasionCD||0)-dt);
 if((f.jinkDur||0)>0){f.jinkAge=(f.jinkAge||0)+dt;if(f.jinkAge>=f.jinkDur){f.jinkAge=0;f.jinkDur=0;f.jinkRight=f.jinkUp=null}}
 if((f.evadePendingT||0)>0){
   f.evadePendingT-=dt;
   if(f.evadePendingT<=0){
     const kind=f.evadePendingKind||'track',strength=f.evadePendingStrength||.55;
     f.evadePendingT=0;f.evadePendingStrength=0;f.evadePendingKind='';
     if(kind==='track')startTrackingJink(f,strength);
     else beginEvasiveBreak(f,strength,kind)
   }
 }
}
function updateFighterTrackingThreat(f,dt){
 // v140: remove the old "wasp" behaviour. A fighter does NOT jink merely because
 // the reticle is near it. Near-misses and hits can still trigger one committed
 // break turn through queueFighterEvasion().
 if(!f)return;
 f.threatT=Math.max(0,(f.threatT||0)-dt*3);
}

function pursuitCandidate(f,a){
 if(!f||f.dead||f.dying||f.t<0)return null;
 const q=fighterCam(f);if(!q||q[2]<=2.5)return null;
 const p=projectCam(q);if(!p||p.x<-75||p.x>W+75||p.y<-70||p.y>viewH+70)return null;
 const r=clamp(f.s*p.k*1.0,15,86),d=Math.hypot(a.x-p.x,a.y-p.y);
 return{f,q,p,r,d};
}
function lockCandidateAtAim(a){
 let best=null,bestScore=1e9;
 const cone=Math.max(52,Math.min(W,viewH)*.065);
 for(const f of fighters){
   if(f.dead||f.dying||f.t<0)continue;
   const q=fighterCam(f);if(!q||q[2]<=3||q[2]>105)continue;
   const p=projectCam(q);if(!p||p.x<0||p.x>W||p.y<0||p.y>viewH)continue;
   const r=clamp(f.s*p.k,15,86),d=Math.hypot(a.x-p.x,a.y-p.y),limit=cone+r*.45;
   if(d>limit)continue;
   const score=d/Math.max(1,limit)+q[2]/420;
   if(score<bestScore){best={f,q,p,r,d,limit};bestScore=score}
 }
 return best
}
function releaseSpaceLock(){
 spaceLockId=0;spaceLockAcquireId=0;spaceLockAcquireT=0;spaceLockAcquireGrace=0;spaceLockLostT=0
}
function establishSpaceLock(f){
 if(!f)return;
 spaceLockId=f.id;spaceLockAcquireId=0;spaceLockAcquireT=0;spaceLockAcquireGrace=0;spaceLockLostT=0;
 if(spacePursuitId&&spacePursuitId!==f.id){const old=fighters.find(x=>x.id===spacePursuitId);if(old)old.pursuitStrength=0}
 spacePursuitId=f.id;spacePursuitLostT=0;f.pursuitStrength=Math.max(.30,f.pursuitStrength||0);f.pursuitAge=0;f.pursuitReelLastRange=NaN;resetPursuitBreak(f);f.pursuitReturnFireCD=.55+Math.random()*.45;f.counterattackDecision=false;f.pursuitCounterattack=false;f.counterattackVisibleT=0;f.counterattackSeen=false;
 const q=fighterCam(f),r=q?Math.hypot(q[0],q[1],q[2]):1;
 f.edgeAngle=q?Math.acos(clamp(q[2]/Math.max(.001,r),-1,1)):null;
 say('TARGET LOCKED',.32);
 if(typeof audio!=='undefined'){
   audio.cancelQueuedVoice?.('targetLocked');
   audio.playVoice?.('targetLocked',{once:false,priority:false})
 }
 if(typeof tutorialCombat!=='undefined')tutorialCombat.onLockEstablished(f)
}
function updateSpaceTargetLock(dt){
 if(mode!=='play'||phase!=='space'){spaceLockHeld=false;return}
 const a=aimScreen();
 let locked=fighters.find(f=>f.id===spaceLockId&&!f.dead&&!f.dying);
 if(spaceLockId&&!locked){releaseSpaceLock();locked=null}
 if(locked){
   const q=fighterCam(locked),range=q?Math.hypot(q[0],q[1],q[2]):999;
   const angle=q?Math.acos(clamp(q[2]/Math.max(.001,range),-1,1)):Math.PI;
   const old=Number.isFinite(locked.lockEdgeAngle)?locked.lockEdgeAngle:angle;
   const keepingUp=angle<=old+.014;
   locked.lockEdgeAngle=angle;
   const turnRate=Math.hypot(spaceYawVel,spacePitchVel);
   const visible=fighterVisible(locked,4);
   const tutorialHeld=typeof tutorialCombat!=='undefined'&&tutorialCombat.keepLock(locked);
   // If the contact is actually visible, the VR station has no excuse to lose it.
   // Lock decay only begins after the ship has genuinely left the display. During
   // the simulator tracking exercise the acquired lock is retained indefinitely so
   // a learner can take longer than the normal combat timeout and still follow it.
   if(visible||tutorialHeld)spaceLockLostT=0;
   else if(range<170&&turnRate>.10&&keepingUp)spaceLockLostT=Math.max(0,spaceLockLostT-dt*.48);
   else spaceLockLostT+=dt*(range>175?1.00:.34);
   // Explicit tracking is intentionally much stickier than inferred pursuit. Range
   // can only break a lock while off-screen; a visible locked ship always stays held.
   if(!tutorialHeld&&!visible&&(range>230||spaceLockLostT>7.2)){releaseSpaceLock();locked=null}
   else{
     if(spacePursuitId!==locked.id){spacePursuitId=locked.id;spacePursuitLostT=0;locked.pursuitAge=0;resetPursuitBreak(locked)}
     locked.pursuitStrength=Math.max(locked.pursuitStrength||0,.24)
   }
 }
 if(!spaceLockHeld){spaceLockAcquireId=0;spaceLockAcquireT=Math.max(0,spaceLockAcquireT-dt*3.5);spaceLockAcquireGrace=0;return}
 const c=lockCandidateAtAim(a);
 if(!c){
   // A fast readable pass can momentarily slip outside the cone. Keep the same
   // acquisition alive for a fraction of a second instead of throwing away all
   // progress on a single missed frame. This is grace, not target magnetism.
   if(spaceLockAcquireId&&spaceLockAcquireGrace<.18){spaceLockAcquireGrace+=dt;spaceLockAcquireT=Math.max(0,spaceLockAcquireT-dt*.45);return}
   spaceLockAcquireId=0;spaceLockAcquireT=Math.max(0,spaceLockAcquireT-dt*3.6);spaceLockAcquireGrace=0;return
 }
 spaceLockAcquireGrace=0;
 // Holding right on an already locked craft simply maintains intent; holding on a
 // different craft deliberately transfers lock only after a short acquisition dwell.
 if(c.f.id===spaceLockId){spaceLockAcquireId=c.f.id;spaceLockAcquireT=.48;return}
 if(spaceLockAcquireId!==c.f.id){spaceLockAcquireId=c.f.id;spaceLockAcquireT=0}
 spaceLockAcquireT+=dt;
 if(spaceLockAcquireT>=.48)establishSpaceLock(c.f)
}
function releaseSpacePursuit(){
 if(spacePursuitId){const old=fighters.find(f=>f.id===spacePursuitId);if(old){old.pursuitStrength=0;old.pursuitAge=0;old.pursuitReturnFireCD=0;old.pursuitReelLastRange=NaN;resetPursuitBreak(old)}}
 spacePursuitId=0;spacePursuitLostT=0
}
function updateSpacePursuit(dt){
 // Pursuit remains an arcade cheat, but off-screen tracking is now earned by
 // continuing to turn with the target. If its angular separation is falling (or
 // barely growing) the lock confidence decays slowly; turn away and it collapses.
 const a=aimScreen();
 const steer=Math.hypot(inputX,inputY);
 const turnRate=Math.hypot(spaceYawVel,spacePitchVel);
 const explicit=fighters.find(f=>f.id===spaceLockId&&!f.dead&&!f.dying);
 if(explicit&&spacePursuitId!==explicit.id){spacePursuitId=explicit.id;spacePursuitLostT=0;explicit.pursuitStrength=Math.max(.28,explicit.pursuitStrength||0);explicit.pursuitReelLastRange=NaN;resetPursuitBreak(explicit);explicit.pursuitReturnFireCD=.55+Math.random()*.45}
 const current=fighters.find(f=>f.id===spacePursuitId&&!f.dead&&!f.dying);
 if(current){
   const locked=current.id===spaceLockId;
   current.pursuitAge=(current.pursuitAge||0)+dt;
   current.counterattackCooldown=Math.max(0,(current.counterattackCooldown||0)-dt);
   current.quarryReentryGrace=Math.max(0,(current.quarryReentryGrace||0)-dt);
   // v174: the hidden reset changes manoeuvre geometry, not target identity. Keep
   // pursuit continuity while the same fighter performs its fresh return attack.
   if(current.pursuitCounterattack){
     spacePursuitLostT=0;
     current.pursuitStrength=Math.max(current.pursuitStrength||0,.72);
     current.pursuitReelLastRange=NaN;
     for(const f of fighters)if(f!==current){f.pursuitAcquireT=Math.max(0,(f.pursuitAcquireT||0)-dt*2.5);f.pursuitStrength=Math.max(0,(f.pursuitStrength||0)-dt*3)}
     return
   }
   const c=pursuitCandidate(current,a),q=fighterCam(current);
   const range=q?Math.hypot(q[0],q[1],q[2]):999;
   const angle=q?Math.acos(clamp(q[2]/Math.max(.001,range),-1,1)):Math.PI;
   const oldAngle=Number.isFinite(current.edgeAngle)?current.edgeAngle:angle;
   const closingAngle=angle<=oldAngle+.012;
   current.edgeAngle=angle;
   const visibleKeep=!!(c&&c.d<c.r+115);
   const offscreenKeep=!visibleKeep&&range<125&&turnRate>.12&&closingAngle;
   if(visibleKeep||offscreenKeep){
     spacePursuitLostT=Math.max(0,spacePursuitLostT-dt*(offscreenKeep?.65:2.2));
     current.pursuitStrength=clamp((current.pursuitStrength||0)+dt*(offscreenKeep?(locked?1.05:.85):(locked?3.8:3.2)),0,1);
   }else{
     // If the pilot is at least still manoeuvring toward roughly the right place,
     // give a little more time than the old half-second hard loss.
     const soft=range<105&&(steer>.13||turnRate>.13);
     spacePursuitLostT+=dt*(soft?.58:1.35);
     current.pursuitStrength=Math.max(locked?.18:0,(current.pursuitStrength||0)-dt*(locked?(soft?.16:.34):(soft?.48:1.55)));
     if(!locked&&spacePursuitLostT>(soft?1.75:.72)){releaseSpacePursuit()}
   }
   for(const f of fighters)if(f!==current){f.pursuitAcquireT=Math.max(0,(f.pursuitAcquireT||0)-dt*2.5);f.pursuitStrength=Math.max(0,(f.pursuitStrength||0)-dt*3)}
   return
 }
 if(spaceLockId)return;
 let best=null,bestScore=1e9;
 const steeringEnough=steer>.15||turnRate>.22;
 for(const f of fighters){
   const c=pursuitCandidate(f,a);
   if(!c){f.pursuitAcquireT=Math.max(0,(f.pursuitAcquireT||0)-dt*2.5);continue}
   const acquireRadius=c.r+52;
   const score=c.d/acquireRadius + Math.max(0,c.q[2]-58)/150;
   if((steeringEnough||fireHeld||spaceLockHeld)&&c.d<acquireRadius&&score<bestScore){best=c;bestScore=score}
 }
 for(const f of fighters){
   if(best&&f===best.f)f.pursuitAcquireT=(f.pursuitAcquireT||0)+dt;
   else f.pursuitAcquireT=Math.max(0,(f.pursuitAcquireT||0)-dt*2.8);
   f.pursuitStrength=Math.max(0,(f.pursuitStrength||0)-dt*3)
 }
 if(best&&(best.f.pursuitAcquireT||0)>=.30){
   spacePursuitId=best.f.id;spacePursuitLostT=0;best.f.pursuitStrength=.12;best.f.pursuitAge=0;best.f.pursuitReelLastRange=NaN;resetPursuitBreak(best.f);best.f.pursuitReturnFireCD=.70+Math.random()*.55;
   const q=fighterCam(best.f),r=q?Math.hypot(q[0],q[1],q[2]):1;
   best.f.edgeAngle=q?Math.acos(clamp(q[2]/Math.max(.001,r),-1,1)):null
 }
}
function registerPlayerShotThreat(a){
 if(mode!=='play'||phase!=='space')return;
 const sensitivity=tuneScale('nearMissSensitivity');if(sensitivity<=.01)return;
 let nearest=null,nearestMargin=1e9;
 for(const f of fighters){
   if(f.dead||f.dying||f.t<0||(f.evasionCD||0)>0)continue;
   const p=proj([f.x,f.y,f.z]);if(!p)continue;
   const r=clamp(f.s*p.k*1.0,15,86),d=Math.hypot(a.x-p.x,a.y-p.y),margin=d-r;
   if(margin>0&&margin<(34+36*sensitivity)&&margin<nearestMargin){nearest=f;nearestMargin=margin}
 }
 if(nearest){const closeness=1-clamp(nearestMargin/(34+36*sensitivity),0,1);queueFighterEvasion(nearest,'near',.72+closeness*.34)}
}
function registerFighterHit(f,a,p){
 if(!f)return;
 const dx=(a?.x??p.x)-p.x,dy=(a?.y??p.y)-p.y;
 if(!Array.isArray(f.damageHits))f.damageHits=[];
 f.damageHits.push({side:dx<0?-1:1,vertical:dy<0?1:-1});
 if(f.damageHits.length>3)f.damageHits.shift();
 // A few tiny wire fragments break away on impact; persistent damage itself is
 // represented by cracks/gaps in the wing structure, never by red health paint.
 for(let i=0;i<3;i++){
   const ang=Math.random()*Math.PI*2,sp=22+Math.random()*42,len=3+Math.random()*6;
   fragments.push({x1:p.x-len*.5,y1:p.y,x2:p.x+len*.5,y2:p.y,vx:Math.cos(ang)*sp,vy:Math.sin(ang)*sp,t:.24+Math.random()*.20,col:C.w})
 }
 if(f.hp>0)queueFighterEvasion(f,'hit',tuneScale('hitBreakStrength'))
}

const PLAYER_MISSILE_DAMAGE=6;
const PLAYER_MISSILE_SPEED=72;
function launchHomingMissile(target,damage=PLAYER_MISSILE_DAMAGE,missileSpeed=PLAYER_MISSILE_SPEED){
 if(!target||target.dead||target.dying||mode!=='play'||phase!=='space')return false;
 const nose=cameraVectorToWorld([0,-.10,1.55]);
 const tx=target.x-shipX,ty=target.y-shipY,tz=target.z,n=Math.hypot(tx,ty,tz)||1,speed=Math.max(20,Number(missileSpeed)||PLAYER_MISSILE_SPEED);
 playerMissiles.push({
   targetId:target.id,x:shipX+nose[0],y:shipY+nose[1],z:nose[2],
   vx:tx/n*speed,vy:ty/n*speed,vz:tz/n*speed,speed,damage:Math.max(1,Number(damage)||PLAYER_MISSILE_DAMAGE),
   age:0,maxAge:5.0,dead:false
 });
 return true
}
function updatePlayerMissiles(dt){
 if(!playerMissiles?.length)return;
 for(let i=playerMissiles.length-1;i>=0;i--){
   const m=playerMissiles[i];if(m.dead){playerMissiles.splice(i,1);continue}
   m.age+=dt;if(m.age>m.maxAge){playerMissiles.splice(i,1);continue}
   const f=fighters.find(x=>x.id===m.targetId&&!x.dead&&!x.dying);
   if(!f){playerMissiles.splice(i,1);continue}
   const dx=f.x-m.x,dy=f.y-m.y,dz=f.z-m.z,d=Math.hypot(dx,dy,dz)||.001;
   const missileSpeed=m.speed||PLAYER_MISSILE_SPEED,desired=[dx/d*missileSpeed,dy/d*missileSpeed,dz/d*missileSpeed];
   const steer=1-Math.exp(-8.5*dt);
   m.vx=lerp(m.vx,desired[0],steer);m.vy=lerp(m.vy,desired[1],steer);m.vz=lerp(m.vz,desired[2],steer);
   const speed=Math.hypot(m.vx,m.vy,m.vz)||1;m.vx=m.vx/speed*missileSpeed;m.vy=m.vy/speed*missileSpeed;m.vz=m.vz/speed*missileSpeed;
   m.x+=m.vx*dt;m.y+=m.vy*dt;m.z+=m.vz*dt;
   const impactDistance=Math.hypot(f.x-m.x,f.y-m.y,f.z-m.z);
   if(impactDistance<Math.max(2.15,(f.s||1)*1.8)){
     const p=proj([f.x,f.y,f.z])||proj([m.x,m.y,m.z]);
     f.hp-=m.damage||PLAYER_MISSILE_DAMAGE;f.hitFx=HIT_FX_TOTAL;
     if(p){spark(p.x,p.y,C.y,18);registerFighterHit(f,p,p)}
     if(f.hp<=0)queueObjectDestruction(f,p);else SoundFX.hit();
     say(`MISSILE HIT · ${Math.max(0,f.hp)} HP`,.45);playerMissiles.splice(i,1)
   }
 }
}
function drawPlayerMissiles(){
 if(!playerMissiles?.length)return;
 for(const m of playerMissiles){
   const p=proj([m.x,m.y,m.z]);if(!p)continue;
   const tail=proj([m.x-m.vx*.055,m.y-m.vy*.055,m.z-m.vz*.055]);
   if(tail)line(tail.x,tail.y,p.x,p.y,C.y,1.2,.95);
   const r=clamp(2.5+p.k*.08,2.5,7);
   ctx.strokeStyle=C.w;ctx.lineWidth=1.1;ctx.beginPath();ctx.moveTo(p.x,p.y-r);ctx.lineTo(p.x+r,p.y);ctx.lineTo(p.x,p.y+r);ctx.lineTo(p.x-r,p.y);ctx.closePath();ctx.stroke()
 }
}

function fighterFiringSolution(f){
 // Arcade-magic weapons: ATTACK state supplies the intent, not the hull nose.
 // Fighters can fire while crossing or banking away as long as they are in front
 // of the player and within a readable distance band. Very close ships do not fire.
 const q=fighterCam(f);if(!q||q[2]<=1.0)return null;
 const p=projectCam(q);if(!p||p.x<-120||p.x>W+120||p.y<-105||p.y>viewH+105)return null;
 const dx=shipX-f.x,dy=shipY-f.y,dz=-f.z,d=Math.hypot(dx,dy,dz)||1;
 const minRange=(f.attackKind==='rearRush'||f.attackKind==='throughRush')?8.5:(f.attackKind==='counter'?8.0:7.0);
 const passRange=f.attackKind==='counter'?44:((f.attackKind==='rearRush'||f.attackKind==='throughRush')?34:(f.attackKind==='vertical'?40:(f.attackKind==='diagonal'?40:42)));
 if(d<minRange||d>Math.min(combatTuning.firingRange,passRange))return null;
 return{distance:d,screen:p,cam:q}
}

function spawnFighterBolt(f){
 if(typeof tutorialConsumables!=='undefined'&&tutorialConsumables.blockHostileFire())return false;
 // Fighter fire remains arcade-magic, but a pursued/locked craft now LEADS the
 // player's current turn rather than throwing the same present-position shot.
 // In this rotational flight model the lead is deliberately modest and stays close
 // enough to the cockpit line to remain a real threat rather than a decorative miss.
 const x=f.x,y=f.y,z=f.z;
 const boltCap=effectiveHostileBoltCap();
 if(spaceHostileFireGate>0||bolts.filter(b=>!b.dead).length>=boltCap)return false;
 const bugMesh=f?.mesh?.bugKind?f.mesh:null,bugKind=bugMesh?.bugKind||'';
 const speed=(bugKind==='hornet')?7.05:((bugKind==='larva')?5.45:(6.35+level*.11));
 const distance=Math.max(1,Math.hypot(shipX-x,shipY-y,z));
 const timeToImpact=Math.max(.22,distance/speed);
 const skill=clamp((level-1)/12,0,1);
 const pursued=f.id===spacePursuitId||f.id===spaceLockId;
 const maxYaw=Math.max(.01,(combatTuning.yawRate||125)*Math.PI/180),maxPitch=Math.max(.01,(combatTuning.pitchRate||65)*Math.PI/180);
 const yawFrac=clamp(spaceYawVel/maxYaw,-1,1),pitchFrac=clamp(spacePitchVel/maxPitch,-1,1);
 const leadAmount=pursued?clamp(timeToImpact*.55,.25,.88):0;
 const leadLocal=[yawFrac*1.12*leadAmount,-pitchFrac*.92*leadAmount,0];
 const leadWorld=cameraVectorToWorld(leadLocal);
 const errRadius=((bugKind==='hornet')?lerp(1.15,.62,skill):((bugKind==='larva')?lerp(2.55,1.22,skill):(pursued?lerp(.72,.38,skill):lerp(3.15,1.45,skill))))/tuneScale('accuracy');
 const angle=Math.random()*Math.PI*2;
 const mag=errRadius*Math.pow(Math.random(),.72);
 const tx=shipX+leadWorld[0]+Math.cos(angle)*mag;
 const ty=shipY+leadWorld[1]+Math.sin(angle)*mag*.78;
 const tz=leadWorld[2];
 const hitIntent=Math.hypot(tx-shipX,ty-shipY,tz)<1.55;
 bolts.push({
   x,y,z,spawnDistance:distance,targetX:tx,targetY:ty,targetZ:tz,hitIntent,leadShot:pursued,
   vx:(tx-x)/timeToImpact,vy:(ty-y)/timeToImpact,vz:(tz-z)/timeToImpact,
   homing:0,rot:Math.random()*6.28,rotSpeed:bugKind==='hornet'?7.2:(bugKind==='larva'?2.9:4.5),dead:false,visibleFor:0,visibleNow:false,
   age:0,maxLife:timeToImpact+1.15,
   style:bugMesh?.projectileStyle||'plasma',col:bugMesh?.projectileCol||C.c,accentCol:bugMesh?.projectileAccent||C.w,visualScale:bugMesh?.projectileScale||1
 });
 const fireGapBase=(bugKind==='hornet') ? 0.70 : ((bugKind==='larva') ? 0.95 : 0.82), fireGapJitter=(bugKind==='hornet') ? 0.24 : ((bugKind==='larva') ? 0.28 : 0.36);
 spaceHostileFireGate=hostileFireGap()*(fireGapBase+Math.random()*fireGapJitter);
 return true
}

function fighterPursuitFiringSolution(f){
 // Pursuit never makes a fighter pacifist. Magic/gimballed fire may be thrown back
 // during the chase whenever the craft is visibly in front and not absurdly close.
 const q=fighterCam(f);if(!q||q[2]<=1.0)return null;
 const p=projectCam(q);if(!p||p.x<-120||p.x>W+120||p.y<-105||p.y>viewH+105)return null;
 const dx=shipX-f.x,dy=shipY-f.y,dz=-f.z,d=Math.hypot(dx,dy,dz)||1;
 if(d<8||d>Math.min(combatTuning.firingRange,54))return null;
 return{distance:d,screen:p,cam:q}
}
function updatePursuedReturnFire(f,dt){
 // Hard gameplay rule: chased ships fire back whether or not other fighters remain.
 // This is deliberately independent of dogfightState so a pursued craft cannot become
 // a harmless fleeing target just because the director no longer assigns it attack passes.
 if(!f||f.dead||f.dying||f.id!==spacePursuitId||f.pursuitCounterattack)return false;
 f.pursuitReturnFireCD=Math.max(0,(f.pursuitReturnFireCD||0)-dt);
 if(f.pursuitReturnFireCD>0)return false;
 const solution=fighterPursuitFiringSolution(f);
 if(!solution){f.pursuitReturnFireCD=.12;return false}
 if(spawnFighterBolt(f)){
   const pressure=enemyAttackPressure();
   f.pursuitReturnFireCD=lerp(2.45,1.20,pressure)*(.86+Math.random()*.30);
   return true
 }
 // The global hostile-fire budget still applies. Retry soon rather than abandoning
 // the target's return shot for an entire attack cycle.
 f.pursuitReturnFireCD=.14;
 return false
}
function screenHalfAtDepth(z){
 const focal=Math.min(W,viewH)*1.09;
 return{x:(W*.5/focal)*z,y:(viewH*.50/focal)*z}
}
function edgeCamPointAt(edge,z,outside=1.20,bias=null){
 const h=screenHalfAtDepth(z),b=bias===null?(Math.random()*1.2-.6):clamp(bias,-.92,.92);
 if(edge==='left')return[-h.x*outside,h.y*b,z];
 if(edge==='right')return[h.x*outside,h.y*b,z];
 if(edge==='top')return[h.x*b,h.y*outside,z];
 return[h.x*b,-h.y*outside,z]
}
function edgeCamPoint(edge,z,outside=1.20){return edgeCamPointAt(edge,z,outside,null)}
function chooseEntryEdge(){return ['left','right','top','bottom'][(Math.random()*4)|0]}
function differentExitEdge(entry){
 // Perpendicular exits are deliberately common. A left-entry craft is more likely
 // to peel through the top/bottom than simply perform another left-to-right pass.
 const perpendicular={left:['top','bottom'],right:['top','bottom'],top:['left','right'],bottom:['left','right']}[entry]||['left','right'];
 const opposite={left:'right',right:'left',top:'bottom',bottom:'top'}[entry];
 return Math.random()<.70?perpendicular[(Math.random()*perpendicular.length)|0]:opposite
}
function camPathToWorld(points){return points.map(cameraPointToWorld)}

function makeBackgroundPass(f){
 const style=dogfightStyle(f),entry=chooseEntryEdge(),exit=differentExitEdge(entry);
 const z0=clamp(Math.max(46,randRange(style.bgZ)+18+Math.random()*12),46,88);
 const z1=clamp(z0-(20+Math.random()*26),20,58);
 const entryBias=signRand()*(.18+Math.random()*.50),exitBias=signRand()*(.18+Math.random()*.52);
 const start=edgeCamPointAt(entry,z0,1.30,entryBias),enter=edgeCamPointAt(entry,z0*.94,.72,entryBias*.72);
 const leave=edgeCamPointAt(exit,z1*.98,.72,exitBias*.72),finish=edgeCamPointAt(exit,z1,1.34,exitBias);
 const hx=screenHalfAtDepth((z0+z1)*.5).x,hy=screenHalfAtDepth((z0+z1)*.5).y;
 let mx=(Math.random()-.5)*hx*1.05,my=(Math.random()-.5)*hy*1.05;
 if(Math.abs(mx)<hx*.16)mx=signRand()*hx*(.20+Math.random()*.22);
 if(Math.abs(my)<hy*.16)my=signRand()*hy*(.20+Math.random()*.22);
 const midA=[mx,my,lerp(z0,z1,.38)+(Math.random()-.5)*8];
 const midB=[mx*(.55+Math.random()*.45),my*(.55+Math.random()*.45),lerp(z0,z1,.66)+(Math.random()-.5)*8];
 return camPathToWorld([start,enter,midA,midB,leave,finish])
}
function prepareBackgroundPass(f,delay=0){
 if(!f||f.dead||f.dying)return false;
 const route=makeBackgroundPass(f);
 f.dogfightState='background';f.attackKind='';f.attackProfile='';f.attackSpeedScale=1;f.attackPassZ=0;f.incomingEdge='';f.exiting=false;f.egressT=0;f.attackExitIndex=Infinity;f.pursuitCounterattack=false;f.counterattackSeen=false;f.counterattackVisibleT=0;f.escapeAxis='';f.escapeSign=0;f.escapeNX=0;f.escapeNY=0;f.vx=f.vy=f.vz=0;
 f.offscreenT=0;f.shotsLeft=0;f.fireBurstShots=0;f.fireShotCD=0;f.nextShot=.3;f.bank=0;
 f.attackAge=0;
 setFighterRoute(f,route,'background',{preserve:false,delay,duration:4.0+Math.random()*1.25});
 f.pts=f.route;
 if(f.t>=0)orientFighter(f);
 return true
}

function nearestScreenEdgeForFighter(f){
 const q=fighterCam(f);if(!q||q[2]<=.2)return chooseEntryEdge();
 const h=screenHalfAtDepth(q[2]),nx=q[0]/Math.max(.001,h.x),ny=q[1]/Math.max(.001,h.y);
 return Math.abs(nx)>=Math.abs(ny)?(nx>=0?'right':'left'):(ny>=0?'top':'bottom')
}
function makeAttackFromCurrent(f,profile){
 const q=fighterCam(f),tangent=fighterMotionTangent(f),cur=[f.x,f.y,f.z];
 const carry=[cur[0]+tangent[0]*10,cur[1]+tangent[1]*10,cur[2]+tangent[2]*10];
 const clearance=tuneScale('passClearance'),sx=signRand(),sy=signRand();
 // No hull/style preference: every fighter can slash in any plane. Give both axes
 // meaningful displacement so visible promotions do not become side-on rails.
 const missX=sx*(2.7+Math.random()*2.8)*clearance;
 const missY=sy*(2.5+Math.random()*2.9)*clearance;
 const z0=clamp(q?.[2]||52,24,86);
 // A promoted visible fighter cannot suddenly move farther away to satisfy a broad
 // profile, so clamp its requested pass depth below its current range.
 const passZ=Math.min(profile?.passZ||16,Math.max(9,z0-7));
 f.attackPassZ=passZ;
 const entryEdge=nearestScreenEdgeForFighter(f),exitEdge=differentExitEdge(entryEdge);
 const exitBias=(exitEdge==='left'||exitEdge==='right')?sy*(.38+Math.random()*.38):sx*(.38+Math.random()*.38);
 const turn1=cameraPointToWorld([lerp(q?.[0]||0,missX*1.8,.42),lerp(q?.[1]||0,missY*1.65,.42),Math.max(passZ+10,z0-15)]);
 const turn2=cameraPointToWorld([missX*1.5,missY*1.40,Math.max(passZ+5,z0*.50)]);
 const exit1=edgeCamPointAt(exitEdge,passZ+3+Math.random()*4,1.24,exitBias*.78);
 const exit2=edgeCamPointAt(exitEdge,passZ+14+Math.random()*8,1.70,exitBias);
 const attack=camPathToWorld([[missX*1.24,missY*1.18,passZ+5],[missX,missY,passZ],exit1,exit2]);
 return[cur,carry,turn1,turn2,...attack]
}

function chooseHiddenAttackKind(){
 const p=enemyAttackPressure(),pursuit=!!spacePursuitId,r=Math.random(),close=closePassFrequency();
 // v172: preserve the v165 director, but spend a larger share of HIDDEN attack
 // slots on ships that genuinely arrive from the rear or pass through to the rear.
 // This creates cockpit fly-bys without changing ordinary background traffic.
 const rear=clamp(lerp(.20,.32,p)+close*.28+(pursuit?.08:0),.20,.66);
 const through=clamp(.05+close*.20,.05,.25);
 const vertical=.18,diagonal=.18;
 if(r<rear)return Math.random()<.5?'rearOver':'rearUnder';
 if(r<rear+through)return'throughRush';
 if(r<rear+through+vertical)return Math.random()<.5?'topDown':'bottomUp';
 if(r<rear+through+vertical+diagonal)return'diagonal';
 return'sideSlash'
}
function makeHiddenAttackEntry(f,kind=chooseHiddenAttackKind(),profile=null){
 const p=enemyAttackPressure(),close=closePassFrequency();
 let passZ=profile?.passZ||16;
 if(kind==='rearOver'||kind==='rearUnder'||kind==='throughRush'){
   // Close-pass tuning affects only deliberate hidden rushes. Broad/normal visible
   // traffic retains v165 geometry. At the default 60%, rear passes live mostly in
   // the 8-13 unit band where the procedural fly-by synth is naturally audible.
   const closeTarget=lerp(13.5,7.5,close)+Math.random()*3.8;
   passZ=Math.min(passZ,closeTarget)
 }
 const closeZ=passZ+8+Math.random()*8;
 f.attackPassZ=passZ;
 if(kind==='rearOver'||kind==='rearUnder'){
   const over=kind==='rearOver',entry=over?'top':'bottom';
   const nearZ=Math.max(5.5,passZ*.68),side=signRand(),entryBias=side*(.18+Math.random()*.34);
   const ep=edgeCamPointAt(entry,nearZ,1.10,entryBias);
   const exit=(Math.random()<.72?(over?'bottom':'top'):(Math.random()<.5?'left':'right'));
   const exitBias=exit==='top'||exit==='bottom'?-entryBias*.72:side*(.48+Math.random()*.26);
   const exit1=edgeCamPointAt(exit,passZ+3+Math.random()*4,1.26,exitBias*.78);
   const exit2=edgeCamPointAt(exit,passZ+14+Math.random()*8,1.72,exitBias);
   const route=camPathToWorld([
     [ep[0]*.38,ep[1]*1.58,-34-Math.random()*12],
     [ep[0]*.58,ep[1]*1.34,-15-Math.random()*6],
     ep,
     [-ep[0]*.30,-ep[1]*.20,passZ],
     exit1,exit2
   ]);
   return{route,kind:'rearRush',edge:entry}
 }
 if(kind==='throughRush'){
   // Front-to-back near miss: the fighter appears on a normal screen edge, cuts
   // past the cockpit and physically leaves through the rear hemisphere. This is
   // deliberately a hidden/director attack only; background choreography is untouched.
   const entry=chooseEntryEdge(),side=signRand(),bias=side*(.28+Math.random()*.48);
   const z=24+Math.random()*14,start=edgeCamPointAt(entry,z,1.22,bias),enter=edgeCamPointAt(entry,Math.max(12,z*.70),.72,bias*.72);
   const missX=signRand()*(2.4+Math.random()*2.4),missY=signRand()*(2.0+Math.random()*2.3);
   const pass=[missX,missY,passZ];
   const rear1=[missX*1.16,missY*1.12,-8-Math.random()*5],rear2=[missX*1.42,missY*1.36,-28-Math.random()*12];
   return{route:camPathToWorld([start,enter,pass,rear1,rear2]),kind:'throughRush',edge:entry}
 }
 if(kind==='topDown'||kind==='bottomUp'){
   const entry=kind==='topDown'?'top':'bottom',exit=entry==='top'?'bottom':'top',side=signRand();
   const bias=side*(.25+Math.random()*.45),z=closeZ+3+Math.random()*8;
   const start=edgeCamPointAt(entry,z,1.22,bias),enter=edgeCamPointAt(entry,Math.max(12,z*.78),.78,bias*.72);
   const pass=[-bias*2.5,(entry==='top'?1:-1)*(1.4+Math.random()*2.2),passZ];
   const exit1=edgeCamPointAt(exit,passZ+3+Math.random()*4,1.22,-bias*.72),exit2=edgeCamPointAt(exit,passZ+14+Math.random()*8,1.68,-bias);
   return{route:camPathToWorld([start,enter,pass,exit1,exit2]),kind:'vertical',edge:entry}
 }
 if(kind==='diagonal'){
   const fromSide=Math.random()<.5,side=signRand(),vert=signRand();
   const entry=fromSide?(side>0?'right':'left'):(vert>0?'top':'bottom');
   const exit=fromSide?(vert>0?'bottom':'top'):(side>0?'left':'right');
   const z=closeZ+Math.random()*8;
   const entryBias=fromSide?vert*(.55+Math.random()*.25):side*(.55+Math.random()*.25);
   const exitBias=fromSide?-side*(.48+Math.random()*.30):-vert*(.48+Math.random()*.30);
   const start=edgeCamPointAt(entry,z,1.18,entryBias),enter=edgeCamPointAt(entry,Math.max(11,z*.76),.76,entryBias*.72);
   const pass=[-side*(2.3+Math.random()*2.2),-vert*(2.0+Math.random()*2.3),passZ];
   const exit1=edgeCamPointAt(exit,passZ+3+Math.random()*4,1.24,exitBias*.75),exit2=edgeCamPointAt(exit,passZ+14+Math.random()*8,1.70,exitBias);
   return{route:camPathToWorld([start,enter,pass,exit1,exit2]),kind:'diagonal',edge:entry}
 }
 // Side slashes remain in the vocabulary, but they deliberately peel vertically
 // rather than travelling left-to-right/right-to-left as a complete pass.
 const entry=Math.random()<.5?'left':'right',exit=Math.random()<.5?'top':'bottom',vert=exit==='top'?1:-1;
 const z=closeZ+Math.random()*7,entryBias=vert*(.18+Math.random()*.38),exitBias=(entry==='left'?1:-1)*(.42+Math.random()*.32);
 const start=edgeCamPointAt(entry,z,1.18,entryBias),enter=edgeCamPointAt(entry,Math.max(11,z*.78),.76,entryBias*.70);
 const pass=[(entry==='left'?1:-1)*(2.6+Math.random()*2.4),vert*(2.1+Math.random()*2.4),passZ];
 const exit1=edgeCamPointAt(exit,passZ+3+Math.random()*4,1.24,exitBias*.75),exit2=edgeCamPointAt(exit,passZ+14+Math.random()*8,1.70,exitBias);
 return{route:camPathToWorld([start,enter,pass,exit1,exit2]),kind:'sideSlash',edge:entry}
}

function beginLockedCounterattack(f){
 // v173: after the quarry has been fully off-screen for about a second, stop
 // pretending the player can simply keep following its old line. The SAME fighter
 // (same id, hull, HP and damage) is reseeded while hidden onto a fresh attack.
 // This is deliberate arcade cheating: the same target can reappear head-on,
 // obliquely, or from the rear instead of merely resuming the old tail chase.
 if(!f||f.dead||f.dying||(f.id!==spaceLockId&&f.id!==spacePursuitId))return false;
 const pressure=enemyAttackPressure(),roll=Math.random();
 let route,entry='',kind='counter',returnKind='headOn';
 if(roll<.46){
   // Head-on / quartering return. Start outside a random edge, then cut toward a
   // near-centre firing gate before peeling through a different edge.
   entry=chooseEntryEdge();
   const exit=differentExitEdge(entry),side=signRand(),bias=side*(.22+Math.random()*.34);
   const start=edgeCamPointAt(entry,46+Math.random()*12,1.46,bias);
   const enter=edgeCamPointAt(entry,31+Math.random()*7,.88,bias*.55);
   const pass=[signRand()*(.7+Math.random()*1.7),signRand()*(.55+Math.random()*1.55),10.5+Math.random()*4.0];
   const exitBias=-bias*(.65+Math.random()*.30);
   const exit1=edgeCamPointAt(exit,15+Math.random()*5,1.22,exitBias*.72);
   const exit2=edgeCamPointAt(exit,29+Math.random()*10,1.72,exitBias);
   route=camPathToWorld([start,enter,pass,exit1,exit2]);
   returnKind='headOn'
 }else if(roll<.76){
   // A fresh oblique slash gives a very different bearing from the escape line.
   const made=makeHiddenAttackEntry(f,Math.random()<.5?'diagonal':(Math.random()<.5?'topDown':'bottomUp'),{passZ:12+Math.random()*5});
   route=made.route;entry=made.edge;returnKind='oblique'
 }else{
   // Sometimes the escaped quarry uses the hidden rear hemisphere and comes back
   // over/under the cockpit. This also creates another strong fly-by opportunity.
   const made=makeHiddenAttackEntry(f,Math.random()<.5?'rearOver':'rearUnder',{passZ:9+Math.random()*4});
   route=made.route;entry=made.edge;returnKind='rear'
 }

 f.attackProfile='counter';f.attackSpeedScale=1.02;f.attackPassZ=12;
 // preserve:false is intentional: the fighter has been unseen long enough for a
 // hidden reposition. A short hidden delay prevents an immediate pop-in.
 f.vx=f.vy=f.vz=0;
 setFighterRoute(f,route,'attack',{preserve:false,delay:.20+Math.random()*.50,duration:2.35+Math.random()*.50});
 f.pts=f.route;f.dogfightState='attack';f.attackKind=kind;f.incomingEdge=entry;f.exiting=false;f.egressT=0;f.offscreenT=0;
 f.attackEscape=false;f.attackEscapeReason='';f.attackExitIndex=Math.max(1,f.route.length-2);rememberFighterExitBias(f,f.route);
 f.attackAge=0;f.attackExitDeadline=999;f.pursuitCounterattack=true;f.counterattackSeen=false;f.counterattackVisibleT=0;f.counterattackDecision=true;f.quarryReturnKind=returnKind;
 // v174: preserve target identity. The hidden reset changes only where/how the same
 // damaged ship attacks from. Explicit lock and inferred pursuit stay attached.
 if(spacePursuitId!==f.id)spacePursuitId=f.id;
 spacePursuitLostT=0;spaceLockLostT=0;
 f.pursuitStrength=Math.max(f.pursuitStrength||0,.72);f.pursuitReelLastRange=NaN;
 // Give the return enough ammunition to be threatening. The global hostile-bolt cap
 // and close-range dead-zone still apply.
 f.shotsLeft=3+Math.round(pressure*2);f.fireBurstShots=0;f.fireShotCD=0;f.fireBurstsFired=0;f.maxFireBursts=pressure<.72?2:3;
 f.nextFireOpportunity=.08+Math.random()*.08;f.nextShot=0;f.counterattackCooldown=5.5+Math.random()*3.5;
 orientFighter(f);return true
}
function maybeBeginLockedCounterattack(f){
 if(!f||(f.id!==spaceLockId&&f.id!==spacePursuitId)||f.dead||f.dying||!f.exiting||fighterVisible(f,4)||(f.counterattackCooldown||0)>0)return false;
 if((f.offscreenT||0)<1.05||f.counterattackDecision)return false;
 // After about a second completely out of view, the old bearing is intentionally
 // discarded. The hidden reset changes the same opponent's attack geometry while
 // preserving its lock/health continuity.
 f.counterattackDecision=true;
 return beginLockedCounterattack(f)
}
function beginAggressorPass(f,hiddenEntry=false,delay=0){
 if(!f||f.dead||f.dying)return false;
 const profile=chooseAttackProfile();
 f.attackProfile=profile.name;f.attackSpeedScale=profile.speedScale;f.attackPassZ=profile.passZ;
 let route,kind='visible',edge='';
 if(hiddenEntry){const made=makeHiddenAttackEntry(f,undefined,profile);route=made.route;kind=made.kind;edge=made.edge}
 else route=makeAttackFromCurrent(f,profile);
 const pressure=enemyAttackPressure();
 const duration=randRange(dogfightStyle(f).attackDur)*lerp(1.16,1.00,pressure);
 if(hiddenEntry){f.vx=f.vy=f.vz=0;setFighterRoute(f,route,'attack',{preserve:false,delay,duration})}
 else{
   setFighterRoute(f,route,'attack',{preserve:true,duration});
   // Attack commitment includes acceleration, not a direction snap. Preserve the
   // craft's current heading but get it up to slashing-pass speed immediately.
   const t=fighterMotionTangent(f),sp=Math.max(Math.hypot(f.vx||0,f.vy||0,f.vz||0),f.routeSpeed*.92);
   f.vx=t[0]*sp;f.vy=t[1]*sp;f.vz=t[2]*sp
 }
 f.pts=f.route;f.dogfightState='attack';f.attackKind=kind;f.incomingEdge=edge;f.exiting=false;f.egressT=0;f.offscreenT=0;f.attackEscape=false;f.attackEscapeReason='';
 // The pass gets only a brief opportunity to do its business. Rear/close rushes
 // peel away sooner; a wide pass gets slightly longer, but none may loiter because
 // a shot was blocked by range, projectile cap, cooldown or anything else.
 const profileTime=profile.name==='rush'?.88:(profile.name==='broad'?1.16:1.0);
 f.attackExitDeadline=((kind==='rearRush'?.52:kind==='throughRush'?.54:kind==='vertical'?.62:kind==='diagonal'?.60:kind==='sideSlash'?.60:.64)+Math.random()*.12)*profileTime;
 // The final two gates are explicit screen exits. Once reached, perspective-speed
 // compensation takes over for unpursued craft so they clear the view instead of
 // shrinking into easy distant targets.
 f.attackExitIndex=Math.max(1,(f.route?.length||2)-2);rememberFighterExitBias(f,f.route);
 f.attackAge=0;
 const shots=dogfightStyle(f).shots;
 f.shotsLeft=Math.floor(shots[0]+Math.random()*(shots[1]-shots[0]+1))+Math.floor(pressure*1.2);
 f.fireBurstShots=0;f.fireShotCD=0;f.fireBurstsFired=0;f.maxFireBursts=pressure<.68?1:(pressure<.95?2:3);
 f.nextFireOpportunity=lerp(.22,.08,pressure)+Math.random()*.10;f.nextShot=0;spaceNoAggressorT=0;
 spaceAggressorCooldown=lerp(1.10,.42,pressure)+Math.random()*lerp(.58,.24,pressure);
 orientFighter(f);return true
}
function startFighterEgress(f){
 const tangent=fighterMotionTangent(f),speed=routeSpeedFor(f,'attack'),wasCounter=!!f.pursuitCounterattack;
 f.vx=tangent[0]*speed;f.vy=tangent[1]*speed;f.vz=tangent[2]*speed;
 f.route=[];f.routeIndex=0;f.routeState='';f.attackExitIndex=Infinity;
 f.exiting=true;f.egressT=0;f.offscreenT=0;f.dogfightState='egress';f.attackKind='';f.incomingEdge='';f.shotsLeft=0;f.fireBurstShots=0;f.fireShotCD=0;f.attackEscape=false;f.attackEscapeReason='';f.attackExitDeadline=0;f.pursuitCounterattack=false;f.counterattackSeen=false;f.counterattackVisibleT=0;
 if(wasCounter)f.quarryReentryGrace=.80;
 // After a counterattack, allow another decision only after the cooldown. Ordinary
 // pursuit egress may make its one escape/counterattack decision when off-screen.
 f.counterattackDecision=wasCounter?false:f.counterattackDecision;
 spaceAggressorCooldown=Math.max(spaceAggressorCooldown,.52+Math.random()*.42);
}

function prepareVisibleRejoin(f){
 // v141: intentionally unused. A pursued fighter keeps extending on its existing
 // velocity instead of performing an on-screen U-turn. If the player follows it,
 // it remains a valid target; if not, it leaves view and can be recycled only then.
 return false
}

function attackCandidateScore(f){
 const q=fighterCam(f);if(!q||q[2]<=9||q[2]>62)return-999;
 const p=projectCam(q);if(!p)return-999;
 const edge=Math.min(p.x,W-p.x,p.y,viewH-p.y);
 const t=fighterMotionTangent(f),to=norm3([shipX-f.x,shipY-f.y,-f.z]);
 const inbound=t[0]*to[0]+t[1]*to[1]+t[2]*to[2];
 // Crossing traffic is valid attack material. Reject only a craft already flying
 // hard away from the player; the kinematic turn-in route handles everything else.
 if(inbound<-.72)return-999;
 const ideal=34;
 let score=2.4-Math.abs(q[2]-ideal)/34 + inbound*1.35;
 score+=clamp((95-Math.abs(p.x-W*.5))/190,-.25,.55);
 if(edge<120)score+=.22;
 if(f.id===spacePursuitId)score-=4; // while chasing one ship, OTHER ships attack.
 score+=Math.random()*.38;
 return score
}

function updateSpaceDogfightDirector(dt){
 const aggressionScale=tuneScale('aggression'),pressure=enemyAttackPressure();
 const pursuitActive=!!spacePursuitId;
 spaceHostileFireGate=Math.max(0,spaceHostileFireGate-dt);
 // Attack Level still increases pressure, but pursuit no longer opens the floodgates.
 // The player should normally be able to service one incoming fireball and return
 // attention to the locked target before the next serious interruption.
 const rate=lerp(.32,.82,pressure)*(pursuitActive?1.02:1);
 spaceAggressorCooldown=Math.max(0,spaceAggressorCooldown-dt*aggressionScale*rate);
 spaceNoAggressorT+=dt*aggressionScale*rate;
 if(interceptorsDestroyed>=interceptorGoal&&!freezeObjectives)return;

 const activeAttackers=fighters.filter(f=>!f.dead&&!f.dying&&f.dogfightState==='attack');
 let desiredAttackers=pressure<.62?1:(pressure<.90?2:3);
 // A pursuit counterattack already occupies an attack slot; supporting ships do
 // not receive a separate bonus just because the player is locked onto somebody.
 if(pursuitActive&&pressure>.88)desiredAttackers=Math.min(3,desiredAttackers+1);
 if(activeAttackers.length>=desiredAttackers||spaceAggressorCooldown>0)return;

 const visible=fighters.filter(f=>!f.dead&&!f.dying&&!f.exiting&&f.t>=0&&f.dogfightState==='background'&&f.id!==spacePursuitId&&fighterVisible(f,125));
 const hidden=fighters.filter(f=>!f.dead&&!f.dying&&!f.exiting&&f.id!==spacePursuitId&&!fighterVisible(f,105)&&f.dogfightState!=='attack');
 const hiddenReady=spaceNoAggressorT>lerp(pursuitActive?1.55:1.75,pursuitActive?.78:.88,pressure);
 // v150: reserve a real share of attack slots for off-screen 3D geometry. Otherwise
 // convenient visible side traffic continually starves rear/top/bottom attacks.
 const hiddenPriority=pursuitActive?lerp(.62,.78,pressure):lerp(.42,.58,pressure);
 if(hiddenReady&&hidden.length&&(Math.random()<hiddenPriority||!visible.length)){
   const f=hidden[(Math.random()*hidden.length)|0];
   beginAggressorPass(f,true);
   spaceAggressorCooldown=lerp(1.45,.50,pressure)+Math.random()*lerp(.82,.32,pressure);
   return
 }

 // Visible traffic may still be promoted, but every hull uses the same oblique attack
 // planner and therefore has the same access to pitch, bank and exit directions.
 if(visible.length&&Math.random()>lerp(.72,.54,pressure)){
   visible.sort((a,b)=>attackCandidateScore(b)-attackCandidateScore(a));
   const candidate=visible.find(f=>attackCandidateScore(f)>lerp(-1.1,-3.0,pressure));
   if(candidate){
     beginAggressorPass(candidate,false);
     spaceAggressorCooldown=lerp(1.45,.52,pressure)+Math.random()*lerp(.84,.34,pressure);
     return
   }
 }

 if(hiddenReady&&hidden.length){
   const f=hidden[(Math.random()*hidden.length)|0];
   beginAggressorPass(f,true);
   spaceAggressorCooldown=lerp(1.52,.54,pressure)+Math.random()*lerp(.86,.36,pressure)
 }
}
function fighterCuePoint(f){
 const q=fighterCam(f);if(!q)return null;
 const dist=Math.hypot(q[0],q[1],q[2]);
 let dx=q[0],dy=-q[1];
 if(q[2]>.18){
   const p=projectCam(q);
   if(p){dx=p.x-W*.5;dy=p.y-viewH*.48}
 }
 if(Math.hypot(dx,dy)<.02){
   if(f.incomingEdge==='top'){dx=0;dy=-1}
   else if(f.incomingEdge==='bottom'){dx=0;dy=1}
   else if(f.incomingEdge==='left'){dx=-1;dy=0}
   else if(f.incomingEdge==='right'){dx=1;dy=0}
   else if(Math.hypot(f.lastCueDx||0,f.lastCueDy||0)>.01){dx=f.lastCueDx;dy=f.lastCueDy}
   else{dx=0;dy=-1}
 }
 const n=Math.hypot(dx,dy)||1;dx/=n;dy/=n;f.lastCueDx=dx;f.lastCueDy=dy;
 const cx=W*.5,cy=viewH*.48;
 // Chevron tip belongs on the actual viewport boundary. Its two arms extend
 // inward, so unlike a diamond marker it does not need an inset radius.
 const tx=dx>0?(W-cx)/dx:dx<0?(0-cx)/dx:1e9;
 const ty=dy>0?(viewH-cy)/dy:dy<0?(0-cy)/dy:1e9;
 const t=Math.max(0,Math.min(tx,ty));
 return{x:cx+dx*t,y:cy+dy*t,dx,dy,dist,q}
}
function drawShallowChevron(cue,col,alpha=1,offset=0){
 if(!cue||alpha<=.02)return;
 const inward=[-cue.dx,-cue.dy],tangent=[-cue.dy,cue.dx];
 const half=11,depth=5.5,cx0=cue.x+inward[0]*offset,cy0=cue.y+inward[1]*offset;
 const ax=cx0+tangent[0]*half+inward[0]*depth,ay=cy0+tangent[1]*half+inward[1]*depth;
 const bx=cx0,by=cy0;
 const cx=cx0-tangent[0]*half+inward[0]*depth,cy=cy0-tangent[1]*half+inward[1]*depth;
 line(ax,ay,bx,by,col,1.2,alpha);line(bx,by,cx,cy,col,1.2,alpha)
}
function drawDoubleChevron(cue,col,alpha=1){drawShallowChevron(cue,col,alpha,0);drawShallowChevron(cue,col,alpha*.86,8)}
function aimingConeTarget(){
 if(mode!=='play'||phase!=='space')return null;
 const a=aimScreen(),cone=Math.max(58,Math.min(W,viewH)*.070);
 let best=null,bestScore=1e9;
 for(const f of fighters){
   if(f.dead||f.dying||f.t<0)continue;
   const q=fighterCam(f);if(!q||q[2]<=2.5||q[2]>105)continue;
   const p=projectCam(q);if(!p||p.x<0||p.x>W||p.y<0||p.y>viewH)continue;
   const r=clamp(f.s*p.k,15,86),d=Math.hypot(a.x-p.x,a.y-p.y),limit=cone+r*.35;
   if(d>limit)continue;
   const lockBias=f.id===spaceLockId?-.35:0,score=d/Math.max(1,limit)+q[2]/500+lockBias;
   if(score<bestScore){best={f,p,r,d,limit};bestScore=score}
 }
 return best
}
function fighterHealthTarget(){
 if(mode!=='play'||phase!=='space')return null;
 // Once a fighter has become the selected/pursued target, its health readout follows
 // that fighter instead of disappearing the instant the reticle leaves the hull.
 const trackedId=spaceLockId||spacePursuitId;
 const f=trackedId?fighters.find(x=>x.id===trackedId&&!x.dead&&!x.dying&&x.t>=0):null;
 if(f){
   const q=fighterCam(f);
   if(q&&q[2]>.18){
     const p=projectCam(q),r=p?clamp(f.s*p.k,15,86):22;
     if(p&&p.x>=0&&p.x<=W&&p.y>=0&&p.y<=viewH)return{f,p,r,edge:false};
     const cue=fighterCuePoint(f);
     if(cue)return{f,p:{x:clamp(cue.x,18,W-18),y:clamp(cue.y,18,viewH-18)},r:18,edge:true}
   }
 }
 return aimingConeTarget()
}
function drawFighterAimHealth(){
 const t=fighterHealthTarget();if(!t)return;
 const f=t.f,max=Math.max(1,Math.round(f.maxHp||1)),hp=clamp(Math.round(f.hp||0),0,max);
 const segW=5,gap=2,total=max*segW+(max-1)*gap;
 let x0=t.p.x-total*.5,y=t.edge?t.p.y-11:t.p.y-clamp(t.r*.72+15,25,58);
 x0=clamp(x0,8,Math.max(8,W-total-8));y=clamp(y,10,viewH-10);
 // A deliberately tiny vector readout: no name, range or tactical data.
 for(let i=0;i<max;i++){
   const x=x0+i*(segW+gap),alive=i<hp,col=alive?C.c:C.g,a=alive?.95:.20;
   line(x,y,x+segW,y,col,1.35,a)
 }
 const acquiring=spaceLockHeld&&spaceLockAcquireId===f.id&&f.id!==spaceLockId;
 if(acquiring){
   const p=clamp(spaceLockAcquireT/.48,0,1);
   line(x0,y+5,x0+total*p,y+5,C.y,1.0,.90)
 }
 if(f.id===spaceLockId){
   const pad=5;
   line(x0-pad,y-3,x0-pad,y+5,C.c,1,.92);line(x0-pad,y-3,x0,y-3,C.c,1,.92);
   line(x0+total+pad,y-3,x0+total+pad,y+5,C.c,1,.92);line(x0+total,y-3,x0+total+pad,y-3,C.c,1,.92)
 }
}
function drawOffscreenFighterChevrons(){
 if(mode!=='play'||phase!=='space')return;
 const cues=[];
 for(const f of fighters){
   if(f.dead||f.dying||f.t<0||fighterVisible(f,4))continue;
   const cue=fighterCuePoint(f);if(!cue)continue;
   if(f.id===spaceLockId&&cue.dist<210){
     // Explicit right-button lock: double chevron. Visible contacts never lose lock;
     // off-screen tracking can survive a long enough arc for an escape or turnaround.
     const rangeFade=1-clamp((cue.dist-145)/65,0,1);
     const lostFade=1-clamp(spaceLockLostT/7.2,0,1);
     const alpha=clamp((.44+.56*(f.pursuitStrength||0))*rangeFade*lostFade,0,1);
     if(alpha>.04)cues.push({cue,col:C.c,alpha,priority:4,double:true})
   }else if(f.id===spacePursuitId&&(f.pursuitStrength||0)>.03&&cue.dist<130){
     // Inferred pursuit retains the original single chevron and shorter memory.
     const rangeFade=1-clamp((cue.dist-72)/58,0,1);
     const lostFade=1-clamp(spacePursuitLostT/1.9,0,1);
     const alpha=clamp((.28+.72*(f.pursuitStrength||0))*rangeFade*lostFade,0,1);
     if(alpha>.04)cues.push({cue,col:C.c,alpha,priority:3,double:false})
   }else if(f.dogfightState==='attack'&&cue.dist<48){
     // Not a scanner: only imminent off-screen attack traffic gets a warning.
     // Rear rushes appear a little earlier because they are deliberately entering
     // from a hemisphere the player cannot inspect directly.
     const max=f.attackKind==='rearRush'?48:38;
     const alpha=clamp(1-cue.dist/max,0,1)*.92;
     if(alpha>.06)cues.push({cue,col:C.y,alpha,priority:f.attackKind==='rearRush'?2:1})
   }
 }
 cues.sort((a,b)=>b.priority-a.priority||b.alpha-a.alpha);
 for(const c of cues.slice(0,3)){if(c.double)drawDoubleChevron(c.cue,c.col,c.alpha);else drawShallowChevron(c.cue,c.col,c.alpha)}
}
function startEvent(limit){return mission.startEvent(limit)}
function orientFighter(f){
 const t=fighterMotionTangent(f),dx=t[0],dy=t[1],dz=t[2];
 const yaw=Math.atan2(-dx,-dz),pitch=Math.atan2(dy,Math.hypot(dx,dz));
 f.rot[0]=pitch;f.rot[1]=yaw;f.rot[2]=f.bank||0
}

