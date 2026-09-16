'use strict';
// Presentation-only development gate. The code is deliberately still present in
// release builds; ordinary web/itch players simply are not shown the developer UI.
const DEV_MODE=new URLSearchParams(location.search).get('dev')==='1';
// Behavioural reference for this refactor: v50.
// New mechanics should enter through the owning system objects rather than
// adding further cross-cutting globals.
const canvas=document.getElementById('game'),ctx=canvas.getContext('2d',{alpha:false}),bloomCanvas=document.getElementById('bloom');
const stage=document.getElementById('stage'),messageEl=document.getElementById('message'),abandonBoxEl=document.getElementById('abandonBox'),abandonTitleEl=document.getElementById('abandonTitle'),abandonHintEl=document.getElementById('abandonHint'),abandonProgressFillEl=document.getElementById('abandonProgressFill'),cheatPanel=document.getElementById('cheats'),invulnEl=document.getElementById('invuln'),oneShotLasersEl=document.getElementById('oneShotLasers'),glowSlider=document.getElementById('glow'),glowValueEl=document.getElementById('glowValue'),gateGlowSlider=document.getElementById('gateGlow'),gateGlowValueEl=document.getElementById('gateGlowValue'),campaignGlowSlider=document.getElementById('campaignGlow'),campaignGlowValueEl=document.getElementById('campaignGlowValue'),aboutGlowSlider=document.getElementById('aboutGlow'),aboutGlowValueEl=document.getElementById('aboutGlowValue'),campaignBodyEl=document.getElementById('campaignBody'),gearHudEl=document.getElementById('gearHud'),aboutPanelEl=document.getElementById('aboutScrollBody'),campaignScrollbarEl=document.getElementById('campaignScrollbar'),aboutScrollbarEl=document.getElementById('aboutScrollbar');
const fullscreenGate=document.getElementById('fullscreenGate'),enterFullscreenBtn=document.getElementById('enterFullscreen'),enterFullscreenLabel=document.getElementById('enterFullscreenLabel'),optionsOpenGateBtn=document.getElementById('optionsOpenGate'),optionsModal=document.getElementById('optionsModal'),optionsCloseBtn=document.getElementById('optionsClose'),optionsPanelRoot=document.getElementById('optionsPanel'),campaignOptionsHost=document.getElementById('campaignOptionsHost'),optionsPanelEl=document.getElementById('optionsScrollBody'),optionsScrollbarEl=document.getElementById('optionsScrollbar'),aboutOpenBtn=document.getElementById('aboutOpen'),aboutModal=document.getElementById('aboutModal'),aboutCloseBtn=document.getElementById('aboutClose');
const campaignShell=document.getElementById('campaignShell'),missionBoardEl=document.getElementById('missionBoard'),factionGridEl=document.getElementById('factionGrid'),shopGridEl=document.getElementById('shopGrid'),workshopGridEl=document.getElementById('workshopGrid'),perkGridEl=document.getElementById('perkGrid'),debriefBoxEl=document.getElementById('debriefBox');
const agentLevelEl=document.getElementById('agentLevel'),agentXPEl=document.getElementById('agentXP'),agentMoneyEl=document.getElementById('agentMoney'),agentDroneEl=document.getElementById('agentDrone'),campaignResetBtn=document.getElementById('campaignReset'),campaignResumeBtn=document.getElementById('campaignResume');
// Created later in runtime.js. Declare the handles up front because constructors in
// earlier split files may schedule requestAnimationFrame callbacks before runtime.js runs.
let campaignScrollbar=null,aboutScrollbar=null,optionsScrollbar=null;
const C=Object.freeze({k:'#000000',w:'#FFFFFF',r:'#FF0000',g:'#00FF00',y:'#FFFF00',c:'#00FFFF',m:'#FF00FF',u:'#0080FF',o:'#FF8000',x:'#606060',gd:'#00FF00',b:'#000000'});
let W=1280,H=720,DPR=1,viewH=655,last=performance.now();
let mode='idle',phase='space',level=1,score=0,shield=6,time=0,phaseT=0,modeT=0,paused=false;
let shieldRegenDelay=0,shieldRegenTick=0;
let inputX=0,inputY=0,aimX=0,aimY=0,viewYaw=0,viewPitch=0,viewRoll=0,shipX=0,shipY=0;
let spaceYawVel=0,spacePitchVel=0;
// Arcade cruise vector. It is not inertial physics: it rapidly bends toward the
// ship's current nose so open-space travel always feels like "go where I point".
let spaceMoveX=0,spaceMoveY=0,spaceMoveZ=1;
// Conceptual forward travel used by open-space optic flow and asteroid relative
// motion. This is arcade kinematics, not conserved Newtonian momentum.
let OPEN_SPACE_CRUISE=45.0;
let surfaceNeutralYaw=0,surfaceNeutralPitch=0,starTravel=0;
let fireHeld=false,shotCD=0,shake=0,flash=0,statusHold=0;
let deathFxStart=0,deathFxSeed=0,deathDebriefTimer=0;
let eventIndex=0,eventTimer=.15,surfaceSpawn=.2,trenchSpawn=.5,trenchHaz=.8,reactorTimeout=0,reactorHits=0;
let interceptorsDestroyed=0,interceptorClearDelay=0;
let fighterGroupTotal=8,fighterGroupSpawned=0;
// Space combat is directed like an arcade dogfight: a small persistent cast,
// multiple physical attack runs, stronger pressure during pursuit, and no visible repositioning.
let spaceAggressorCooldown=.45,spaceNoAggressorT=0,spacePursuitId=0,spacePursuitLostT=0;
let spaceLockId=0,spaceLockAcquireId=0,spaceLockAcquireT=0,spaceLockAcquireGrace=0,spaceLockLostT=0,spaceLockHeld=false;
let actorId=1,invulnerable=false,oneShotLasers=false,cheatRestorePaused=false;
let freezeObjectives=false,cheatStageJump=false;
function objectiveAdvanceAllowed(){return !freezeObjectives||cheatStageJump}
const ABANDON_HOLD_SECONDS=1.65;
const ABANDON_EXIT_SECONDS=1.45;
let abandonHoldActive=false,abandonHoldT=0,abandonBlockedTimer=0;
function abandonInTunnel(){return phase==='trench'||phase==='reactor'||phase==='escape'||phase==='courierTunnel'||phase==='courierReturn'||phase==='stationInterior'||mode==='exitDoor'||mode==='courierDock'||mode==='courierDelivery'||mode==='courierTurn'||mode==='stationEntry'||mode==='stationDeparture'}
function abandonMissionAvailable(){
  if(!campaign?.currentMission||paused||campaign.isOpen()||options.isOpen()||gateVisible()||!fullscreenActive())return false;
  if(mode==='dead'||mode==='victory'||mode==='missionTransit'||mode==='surfaceExit'||mode==='asteroidExit'||mode==='courierExitZoom'||mode==='abandonExit')return false;
  return !abandonInTunnel();
}
function setAbandonBox(progress=0,blocked=false,title='HOLD Q TO ABANDON MISSION',hint='Release Q to cancel · drone will be recovered'){
  if(!abandonBoxEl)return;
  abandonBoxEl.classList.add('show');abandonBoxEl.classList.toggle('blocked',!!blocked);abandonBoxEl.setAttribute('aria-hidden','false');
  abandonTitleEl.textContent=title;abandonHintEl.textContent=hint;
  abandonProgressFillEl.style.width=`${Math.round(clamp(progress,0,1)*100)}%`;
}
function hideAbandonBox(){
  if(!abandonBoxEl)return;abandonBoxEl.classList.remove('show','blocked');abandonBoxEl.setAttribute('aria-hidden','true');abandonProgressFillEl.style.width='0%';
}
function cancelAbandonHold(){abandonHoldActive=false;abandonHoldT=0;if(mode!=='abandonExit')hideAbandonBox()}
function showAbandonUnavailable(){
  if(!campaign?.currentMission)return;
  if(abandonBlockedTimer)clearTimeout(abandonBlockedTimer);
  setAbandonBox(0,true,'ABANDON UNAVAILABLE','No extraction route while inside the tunnel');
  abandonBlockedTimer=setTimeout(()=>{abandonBlockedTimer=0;if(!abandonHoldActive&&mode!=='abandonExit')hideAbandonBox()},1100);
}
function beginAbandonHold(){
  if(abandonInTunnel()){showAbandonUnavailable();return false}
  if(!abandonMissionAvailable())return false;
  if(abandonBlockedTimer){clearTimeout(abandonBlockedTimer);abandonBlockedTimer=0}
  abandonHoldActive=true;abandonHoldT=0;setAbandonBox(0,false);return true
}
function beginAbandonExit(){
  if(!campaign?.currentMission||abandonInTunnel())return false;
  const tutorialAbort=typeof tutorialAbandon!=='undefined'&&tutorialAbandon.isActive();
  abandonHoldActive=false;abandonHoldT=0;hideAbandonBox();
  fireHeld=false;laserBurstRemaining=0;laserTriggerLatched=false;shotCD=0;keys.clear();
  asteroidField.stop();fighters.length=0;asteroids.length=0;groundTargets.length=0;bolts.length=0;hazards.length=0;shots.length=0;playerMissiles.length=0;
  phase='space';mode='abandonExit';modeT=0;phaseT=0;inputX=inputY=aimX=aimY=0;spaceYawVel=spacePitchVel=0;viewRoll=0;
  resetSpaceMotion();SoundFX.zoom();
  if(tutorialAbort)tutorialAbandon.onAbandonConfirmed();
  else say('ABORTING MISSION',.8);
  return true
}
function updateAbandonHold(dt){
  if(!abandonHoldActive)return false;
  if(abandonInTunnel()){cancelAbandonHold();showAbandonUnavailable();return false}
  if(!abandonMissionAvailable()){cancelAbandonHold();return false}
  abandonHoldT+=dt;const p=clamp(abandonHoldT/ABANDON_HOLD_SECONDS,0,1);setAbandonBox(p,false);
  if(p>=1){beginAbandonExit();return true}
  return false
}
const COMBAT_TUNING_DEFAULTS=Object.freeze({
  // v129 baseline: values established in the live tuning screen.
  cruiseSpeed:45,yawRate:125,pitchRate:65,playerResponse:125,bankDegrees:9,bankResponse:70,
  attackLevel:5,fighterCount:5,enemySpeed:100,aggression:220,passClearance:100,
  pursuitHold:2.0,pursuitBoost:320,pursuitBurstDuration:1.15,pursuitBreakRange:16,pursuitReel:12,closePassChance:60,flybyRange:100,
  projectileSize:250,projectileSpeed:195,projectileSpin:50,firingRange:62,firingCone:37,
  accuracy:135,fireRate:220,burstLength:1,boltCap:6,
  evasionReactionMs:320,trackingThreatTime:0.60,nearMissSensitivity:100,hitBreakStrength:100,
  breakDuration:1.15,evasionCooldown:1.35,verticalBias:100,damagedAgility:78,structuralDamage:200
});
const combatTuning={...COMBAT_TUNING_DEFAULTS};
const tuneScale=k=>{const n=Number(combatTuning[k]);return Number.isFinite(n)?Math.max(0,n/100):1};
function tunedSpaceFighterTarget(){return clamp(Math.round(combatTuning.fighterCount||5),1,8)}
function activeFighterCap(){return Math.max(1,Math.min(tunedSpaceFighterTarget(),freezeObjectives?8:Math.max(1,fighterGroupTotal||interceptorGoal||1)))}
function fighterReservesRemaining(){return freezeObjectives?999:Math.max(0,(fighterGroupTotal||0)-(fighterGroupSpawned||0))}
function enemyAttackLevel(){return clamp(Math.round(combatTuning.attackLevel||5),1,10)}
function enemyAttackPressure(){return (enemyAttackLevel()-1)/9}

// V70 GPU bloom. The game is drawn once, crisply, by Canvas2D. A second
// low-resolution WebGL canvas receives the completed frame, applies a separable
// Gaussian blur on the GPU and screen-composites the result over the crisp image.
// There is deliberately no temporal accumulation here: this is bloom, not phosphor fade.
let glowStrength=clamp(parseFloat(localStorage.getItem('agentXGlow')||'20')||0,0,100);
function applyGlow(v,save=true){
  glowStrength=clamp(Number(v)||0,0,100);
  const value=String(Math.round(glowStrength)),label=`${value}%`;
  for(const el of [glowSlider,gateGlowSlider,campaignGlowSlider,aboutGlowSlider])if(el)el.value=value;
  for(const el of [glowValueEl,gateGlowValueEl,campaignGlowValueEl,aboutGlowValueEl])if(el)el.textContent=label;
  if(save)localStorage.setItem('agentXGlow',value);
}

class GPUBloom {
  constructor(canvas){
    this.canvas=canvas;this.scale=.36;this.ready=false;this.srcW=0;this.srcH=0;
    const gl=canvas.getContext('webgl',{alpha:false,antialias:false,depth:false,stencil:false,preserveDrawingBuffer:false,premultipliedAlpha:false});
    if(!gl){canvas.style.display='none';return}
    this.gl=gl;
    const vs=`attribute vec2 aPos;varying vec2 vUV;void main(){vUV=aPos*.5+.5;gl_Position=vec4(aPos,0.0,1.0);}`;
    const fs=`precision mediump float;uniform sampler2D uTex;uniform vec2 uStep;uniform float uGain;varying vec2 vUV;
      void main(){
        vec3 c=texture2D(uTex,vUV).rgb*0.2270270270;
        c+=texture2D(uTex,vUV+uStep*1.3846153846).rgb*0.3162162162;
        c+=texture2D(uTex,vUV-uStep*1.3846153846).rgb*0.3162162162;
        c+=texture2D(uTex,vUV+uStep*3.2307692308).rgb*0.0702702703;
        c+=texture2D(uTex,vUV-uStep*3.2307692308).rgb*0.0702702703;
        gl_FragColor=vec4(c*uGain,1.0);
      }`;
    const compile=(type,source)=>{const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s)||'shader compile failed');return s};
    try{
      const p=gl.createProgram();gl.attachShader(p,compile(gl.VERTEX_SHADER,vs));gl.attachShader(p,compile(gl.FRAGMENT_SHADER,fs));gl.linkProgram(p);
      if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(p)||'shader link failed');
      this.program=p;gl.useProgram(p);
      this.aPos=gl.getAttribLocation(p,'aPos');this.uTex=gl.getUniformLocation(p,'uTex');this.uStep=gl.getUniformLocation(p,'uStep');this.uGain=gl.getUniformLocation(p,'uGain');
      const quad=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,quad);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);gl.enableVertexAttribArray(this.aPos);gl.vertexAttribPointer(this.aPos,2,gl.FLOAT,false,0,0);
      this.sourceTex=this.makeTexture();this.blurTex=this.makeTexture();this.fbo=gl.createFramebuffer();
      gl.disable(gl.DEPTH_TEST);gl.disable(gl.BLEND);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.uniform1i(this.uTex,0);
      this.ready=true;
    }catch(err){console.warn('GPU bloom unavailable:',err);canvas.style.display='none'}
  }
  makeTexture(){
    const gl=this.gl,t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);return t
  }
  resize(cssW,cssH,dpr){
    if(!this.ready)return;
    const bw=Math.max(160,Math.round(cssW*dpr*this.scale)),bh=Math.max(90,Math.round(cssH*dpr*this.scale));
    if(this.canvas.width===bw&&this.canvas.height===bh)return;
    this.canvas.width=bw;this.canvas.height=bh;
    const gl=this.gl;gl.bindTexture(gl.TEXTURE_2D,this.blurTex);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,bw,bh,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
  }
  clear(){
    if(!this.ready)return;const gl=this.gl;gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,this.canvas.width,this.canvas.height);gl.clearColor(0,0,0,1);gl.clear(gl.COLOR_BUFFER_BIT)
  }
  render(source,strength){
    if(!this.ready)return;
    if(strength<=.001){this.clear();return}
    const gl=this.gl,bw=this.canvas.width,bh=this.canvas.height;if(!bw||!bh)return;
    gl.useProgram(this.program);gl.activeTexture(gl.TEXTURE0);

    // Upload the completed crisp frame once. Reuse the allocation while the
    // source backing-store dimensions remain unchanged.
    gl.bindTexture(gl.TEXTURE_2D,this.sourceTex);
    if(this.srcW!==source.width||this.srcH!==source.height){
      this.srcW=source.width;this.srcH=source.height;
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,this.srcW,this.srcH,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
    }
    gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,gl.RGBA,gl.UNSIGNED_BYTE,source);

    // Horizontal blur while downsampling into the small framebuffer.
    gl.bindFramebuffer(gl.FRAMEBUFFER,this.fbo);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,this.blurTex,0);gl.viewport(0,0,bw,bh);
    gl.uniform2f(this.uStep,2.2/this.srcW,0);gl.uniform1f(this.uGain,1.0);gl.drawArrays(gl.TRIANGLES,0,6);

    // Vertical blur to the visible bloom canvas. The CSS screen blend keeps
    // black neutral and adds only the coloured halo to the crisp game canvas.
    gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,bw,bh);gl.bindTexture(gl.TEXTURE_2D,this.blurTex);
    gl.uniform2f(this.uStep,0,1.45/bh);gl.uniform1f(this.uGain,Math.min(.78,strength*.72));gl.drawArrays(gl.TRIANGLES,0,6);
  }
}
const gpuBloom=new GPUBloom(bloomCanvas);
applyGlow(glowStrength,false);
let gameStarted=false,fullscreenForcedPause=false,fullscreenRestorePaused=false,pendingFullscreenStart=false;
let approachP=0,approachLocked=false,approachAlignT=0,approachLockT=0,approachBiasYaw=0,approachBiasPitch=0,approachLockYaw=0,approachLockPitch=0;
let approachTurnTargetYaw=0,approachTurnTargetPitch=0,approachSteerDelay=0,landingAzimuth=0;
let approachStartCamCenter=[0,0,112];
let planetWorld=[0,0,112],planetRadius=6.1,planetTilt=.22,planetSpin0=0,planetMoons=[];
let planetLandingBody='planet',planetLandingMoonIndex=-1,planetLandingColour=C.g;
let approachTargetRadius=planetRadius,approachTargetTilt=planetTilt,approachTargetCol=C.g,approachTargetSpin0=0,approachSystemLock=[];
// Celestial scenery stays inside the cabinet palette. Moon colours are deliberately
// restricted to the six approved choices below; white/red/grey are not moon colours.
const MOON_PALETTE=Object.freeze([C.g,C.y,C.c,C.m,C.u,C.o]);
function createMoonSystem({ringOuterFactor=0,landingTarget=false,landingColour=null,oneChance=.40,twoChance=.10,minCount=0,maxCount=2}={}){
  const roll=Math.random();
  let count=roll<twoChance?2:(roll<twoChance+oneChance?1:0);
  const min=Math.max(0,Math.min(2,Math.round(Number(minCount)||0))),max=Math.max(min,Math.min(2,Math.round(Number(maxCount)||2)));
  count=clamp(count,min,max);
  if(!count)return[];
  const moons=[];
  let lastOrbit=Math.max(0,Number(ringOuterFactor)||0);
  for(let i=0;i<count;i++){
    const radiusFactor=(i===0?.15:.11)+Math.random()*(i===0?.12:.10);
    const isLandingTarget=!!landingTarget&&i===0;
    const colour=isLandingTarget&&landingColour?landingColour:(isLandingTarget&&Math.random()<.78?C.g:MOON_PALETTE[(Math.random()*MOON_PALETTE.length)|0]);
    const minimum=i===0
      // Keep moons visually separate from the parent body. The old 2.02 baseline
      // could make a small moon look glued to the planet at common orbital phases.
      // Ringed systems also get a more obvious black gap beyond the outer ring.
      ?(lastOrbit>0?lastOrbit+.55+radiusFactor:2.58+radiusFactor)
      :lastOrbit+.86+radiusFactor+(moons[i-1]?.radiusFactor||.16);
    const orbitFactor=minimum+Math.random()*(i===0?.78:.86);
    moons.push({
      radiusFactor,orbitFactor,col:colour,
      phase:Math.random()*Math.PI*2,
      speed:(Math.random()<.5?-1:1)*(.0022+Math.random()*.0042),
      inclination:(Math.random()<.5?-1:1)*(.012+Math.random()*.050),
      node:Math.random()*Math.PI*2,
      spin0:Math.random()*Math.PI*2,
      spinSpeed:(Math.random()<.5?-1:1)*(.018+Math.random()*.032),
      axisOffset:(Math.random()-.5)*.22,
      landingTarget:isLandingTarget
    });
    lastOrbit=orbitFactor;
  }
  return moons
}
function moonOrbitCenter(parentCenter,parentRadius,parentTilt,moon,atTime=time){
  const phase=moon.phase+atTime*moon.speed,d=parentRadius*moon.orbitFactor;
  // Tiny latitude oscillation keeps moons close to the parent's equatorial plane
  // without stamping every orbit onto exactly the same mathematical line.
  const lat=moon.inclination*Math.sin(phase+moon.node),cl=Math.cos(lat);
  const x=d*cl*Math.sin(phase),y=d*Math.sin(lat),z=-d*cl*Math.cos(phase);
  const ct=Math.cos(parentTilt),st=Math.sin(parentTilt);
  return[parentCenter[0]+x*ct-y*st,parentCenter[1]+x*st+y*ct,parentCenter[2]+z]
}
let entryAutoVX=0,entryAutoVY=0,surfaceVX=0,surfaceVY=0;
let entryAutoStartTravel=0,entryAutoStartX=0,entryAutoStartY=0,entryAutoStartVX=0,entryAutoStartVY=0,entryAutoDistance=1;
let bunkerDoorHp=0,bunkerDoorOpen=false,doorFlash=0,doorBreachAt=-1,doorBreachPending=0,doorPylonsDestroyed=0,escapeSpawn=.55,lastSurfaceX=999,entryBunkerX=0;
let surfaceBunkerActive=false,surfaceDistance=0,surfacePylonVoicePlayed=false;
let exitDoorOpen=false;
let laserBurstRemaining=0,laserTriggerLatched=false;
const LASER_BURST_SIZE=4;
const BASE_LASER_INTERVAL=.135;
const HIT_FX_TOTAL=.22;
const HIT_FX_WHITE_END=.14;
const ASTEROID_EXIT_PITCH_TIME=1.85;
const ASTEROID_EXIT_ZOOM_TIME=2.75;
const SURFACE_EXIT_PITCH_TIME=2.35;
const SURFACE_EXIT_ZOOM_TIME=3.65;
const EXIT_VERTICAL_PITCH=-1.48;
const FLIGHT_SPEED=12.4;
const INTERCEPTOR_GOAL=8;
let interceptorGoal=INTERCEPTOR_GOAL,currentFighterHP=12;
const SPACE_FIGHTER_TARGET=5;
const BUNKER_PYLON_GOAL=5;
const SURFACE_PYLON_COUNT=7;
const SURFACE_SPEED=14.4;
const BUNKER_DOOR_BASE_HP=15;
const REACTOR_CLEAR_RUN=64;      // no tunnel obstacles this close to the reactor boundary
const EXIT_SPAWN_CUTOFF=120;     // stop creating escape obstacles well before the exit
const EXIT_AUTOPILOT_DIST=42;    // autopilot only takes over after a long clear run
let travel=0,entryBunkerWorldZ=Infinity,tunnelStartWorld=0,tunnelOriginX=0;
let reactorBoundaryWorld=Infinity,escapeBoundaryWorld=Infinity,exitDoorWorld=Infinity,reactorAnnounced=false;
const keys=new Set();
function relZ(worldZ){return world.relZ(worldZ)}
function entryBunkerZ(){return world.entryBunkerZ()}
function surfaceBunkerDistance(){return surfaceBunkerActive?Math.hypot(entryBunkerX-shipX,entryBunkerWorldZ-travel):Infinity}
function syncWorldZ(o){return world.syncWorldZ(o)}
function forwardSpeed(){return world.forwardSpeed()}

function resize(){const r=stage.getBoundingClientRect();W=Math.max(320,Math.floor(r.width));H=Math.max(260,Math.floor(r.height));DPR=Math.min(2,window.devicePixelRatio||1);canvas.width=Math.floor(W*DPR);canvas.height=Math.floor(H*DPR);ctx.setTransform(DPR,0,0,DPR,0,0);viewH=Math.floor(H*.91);gpuBloom.resize(W,H,DPR)}
window.addEventListener('resize',resize);resize();

function fullscreenActive(){return !!document.fullscreenElement}
function gateVisible(){return !fullscreenGate.classList.contains('hidden')}
function showFullscreenGate(label='Click here for full screen'){
 const returning=/RETURN/i.test(label);
 enterFullscreenLabel.textContent=returning?'Return to full screen':'Enter full screen';
 fullscreenGate.classList.remove('hidden');
 keys.clear();fireHeld=false;
}
function hideFullscreenGate(){fullscreenGate.classList.add('hidden')}
async function requestRequiredFullscreen(){
 if(fullscreenActive())return true;
 try{
   await document.documentElement.requestFullscreen();
   return !!document.fullscreenElement;
 }catch(_){
   showFullscreenGate('Click here for full screen');
   return false;
 }
}
function settleAfterFullscreen(fn){
 resize();
 last=performance.now();
 requestAnimationFrame(()=>{
   resize();
   last=performance.now();
   requestAnimationFrame(()=>{
     last=performance.now();
     fn();
   });
 });
}

const VECTOR_LINE_WIDTH=1;
let VECTOR_DEPTH_FADE=false;
function line(x1,y1,x2,y2,c=C.g,w=VECTOR_LINE_WIDTH,a=1){ctx.globalAlpha=a;ctx.strokeStyle=c;ctx.lineWidth=VECTOR_LINE_WIDTH;ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();ctx.globalAlpha=1}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function wrapAngle(a){while(a>Math.PI)a-=Math.PI*2;while(a<-Math.PI)a+=Math.PI*2;return a}
function moveTowardAngle(a,b,maxDelta){const d=wrapAngle(b-a);return wrapAngle(a+clamp(d,-maxDelta,maxDelta))}
function lerp(a,b,t){return a+(b-a)*t}
function ease(t){return t*t*(3-2*t)}
function moveToward(v,target,maxDelta){return v+clamp(target-v,-maxDelta,maxDelta)}
function asteroidExitPitchProgress(){return asteroidField?.state==='exit'?ease(clamp(asteroidField.exitT/ASTEROID_EXIT_PITCH_TIME,0,1)):0}
function asteroidExitZoomProgress(){return asteroidField?.state==='exit'?ease(clamp((asteroidField.exitT-ASTEROID_EXIT_PITCH_TIME)/ASTEROID_EXIT_ZOOM_TIME,0,1)):0}
function surfaceExitPitchProgress(){return mode==='surfaceExit'?ease(clamp(modeT/SURFACE_EXIT_PITCH_TIME,0,1)):0}
function surfaceExitZoomProgress(){return mode==='surfaceExit'?ease(clamp((modeT-SURFACE_EXIT_PITCH_TIME)/SURFACE_EXIT_ZOOM_TIME,0,1)):0}

function hitFxColor(timer,base){
 if((timer||0)>HIT_FX_WHITE_END)return C.w;
 if((timer||0)>0)return C.r;
 return base
}
function objectHitColor(obj,base){return hitFxColor(obj?.hitFx||0,base)}
function towerCapY(g){return g.y+2.84*g.s}
function pointSegmentDistance(px,py,ax,ay,bx,by){
 const vx=bx-ax,vy=by-ay,wx=px-ax,wy=py-ay,d=vx*vx+vy*vy;
 const t=d>1e-9?clamp((wx*vx+wy*vy)/d,0,1):0;
 return Math.hypot(px-(ax+vx*t),py-(ay+vy*t))
}
function beginLaserBurst(){
 if(laserTriggerLatched||laserBurstRemaining>0||paused||campaign.isOpen()||gateVisible()||!fullscreenActive()||(mode!=='play'&&mode!=='trenchEntry'))return;
 laserTriggerLatched=true;
 laserBurstRemaining=campaign.laserBurstSize();
 shoot()
}
function endLaserTrigger(){laserTriggerLatched=false}
function queueObjectDestruction(obj,p){
 if(obj.dying||obj.dead)return;
 obj.dying=.18;
 obj.deathPoint=p?{x:p.x,y:p.y}:null;
}
function finaliseObjectDestruction(obj){
 if(obj.dead)return;
 const p=obj.deathPoint||proj([obj.x,obj.y,obj.z])||{x:W*.5,y:viewH*.5};
 if(fighters.includes(obj)){
   killFighter(obj,p);
   return
 }
 obj.dead=true;
 score+=obj.type==='reactor'?2000:(obj.type==='wallgun'?250:200);
 // Wall-mounted bunker guns are drawn from landGunTest's fully transformed
 // composite mesh.  Their stored mesh is only the unmounted plinth, so feeding it
 // to the generic disintegrator makes the dying gun visibly snap back to the floor
 // orientation.  Disintegrate the exact mounted/yawed/pitched geometry on screen.
 if(obj.type==='landgun'&&obj.wallMount&&typeof landGunTest!=='undefined'&&landGunTest?.compositeMesh){
   const mesh=landGunTest.compositeMesh(obj);
   explodeMesh({...obj,s:1,mx:1,my:1,mz:1,rot:[0,0,0]},mesh,p,obj.col)
 }else explodeMesh(obj,obj.mesh,p,obj.col);
 if(obj.type==='reactor'){reactorHits++;say('REACTOR DESTROYED',.5)}
}
function finalisePylon(g){
 if(g.capDead)return;
 g.capDead=true;g.capDying=0;score+=250;
 const p=g.capDeathPoint||proj([g.x,towerCapY(g),g.z])||{x:W*.5,y:viewH*.5};
 const cap={x:g.x,y:towerCapY(g),z:g.z,s:.78*g.s,rot:[0,g.rot[1],0],mx:1,my:1,mz:1,col:g.capCol||C.y};
 explodeMesh(cap,towerCapMesh,p,g.capCol||C.y);
 if(g.doorPylon){
   doorPylonsDestroyed++;
   const effective=Math.min(doorPylonsDestroyed,BUNKER_PYLON_GOAL);
   bunkerDoorHp=Math.max(5,BUNKER_DOOR_BASE_HP-effective*2);
   say(`PYLONS ${Math.min(doorPylonsDestroyed,BUNKER_PYLON_GOAL)}/${BUNKER_PYLON_GOAL}. SHIELD WEAKENED`,.7);
   if(doorPylonsDestroyed===BUNKER_PYLON_GOAL){
     audio.playVoice('bunkerShieldWeakened',{once:true,priority:true});
     mission.activateSurfaceBunker()
   }
 }
}
function finishDoorBreach(){
 if(bunkerDoorOpen)return;
 bunkerDoorOpen=true;doorBreachPending=0;doorBreachAt=modeT;SoundFX.explosion();blowBunkerDoor();score+=500;say('DOOR BREACHED',.55)
}

/* ================================================================
   v51 structural refactor
   Classes provide cohesion and ownership; there is no inheritance tree.
   v50 function names remain as thin compatibility wrappers so existing
   equations, timings, draw order and cheat paths are unchanged.
   ================================================================ */


