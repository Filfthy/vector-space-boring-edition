'use strict';
const wreckScannerAudio={
  ctx:null,buffer:null,source:null,gain:null,
  params:Object.freeze({
    oldParams:true,wave_type:0,p_env_attack:0.42200480979246335,
    p_env_sustain:0.7606216608476005,p_env_punch:0.575544664314179,
    p_env_decay:0.7948158277289094,p_base_freq:0.19255692561524382,
    p_freq_limit:0,p_freq_ramp:0,p_freq_dramp:0,p_vib_strength:0,p_vib_speed:0,
    p_arp_mod:-0.3162,p_arp_speed:0.7589450066595225,p_duty:0.8446670026743648,
    p_duty_ramp:0,p_repeat_speed:0,p_pha_offset:0,p_pha_ramp:0,
    p_lpf_freq:0.3216333719577871,p_lpf_ramp:-0.2876127091165299,
    p_lpf_resonance:0.4597912059509449,p_hpf_freq:0,p_hpf_ramp:0,
    sound_vol:0.25,sample_rate:44100,sample_size:8
  }),
  makeBuffer(ctx){
    const raw=SoundFX.renderSfxr(this.params);if(!raw?.length)return null;

    // Keep the complete audible pulse. The generated reference has a long, essentially
    // silent tail; looping that tail made the scanner sound seem absent. Find the end
    // of the real audible body, retain a short natural tail, and fade only the final
    // milliseconds so the repeat boundary cannot produce the unwanted click.
    let last=raw.length-1;
    for(;last>0;last--)if(Math.abs(raw[last])>.00035)break;
    const tail=Math.floor(ctx.sampleRate*.085);
    const end=Math.min(raw.length,last+tail);
    const out=raw.slice(0,end),n=out.length;
    const fade=Math.max(32,Math.min(Math.floor(ctx.sampleRate*.014),Math.floor(n*.02)));
    for(let i=0;i<fade;i++){
      const k=n-fade+i;
      out[k]*=(fade-1-i)/Math.max(1,fade-1)
    }

    // The reference waveform is intrinsically quiet. Normalise the actual pulse
    // itself to just under digital full-scale; turning up a quiet buffer afterwards
    // was why the scanner still sounded weak.
    let peak=0;
    for(let i=0;i<n;i++)peak=Math.max(peak,Math.abs(out[i]));
    const normalise=peak>.000001?.98/peak:1;
    for(let i=0;i<n;i++)out[i]*=normalise;

    const b=ctx.createBuffer(1,n,ctx.sampleRate);
    b.copyToChannel(out,0);
    return b
  },
  start(){
    const ctx=SoundFX.ensureContext();if(!ctx)return;
    this.stop();
    this.ctx=ctx;
    if(!this.buffer)this.buffer=this.makeBuffer(ctx);
    if(!this.buffer)return;
    const source=ctx.createBufferSource(),gain=ctx.createGain();
    source.buffer=this.buffer;source.loop=true;source.loopStart=0;source.loopEnd=this.buffer.duration;
    gain.gain.value=1.75*AudioMixer.channelVolume('fx');
    source.connect(gain).connect(ctx.destination);
    this.source=source;this.gain=gain;source.start()
  },
  stop(){
    if(this.source){try{this.source.stop()}catch(_){}}
    try{this.source?.disconnect?.();this.gain?.disconnect?.()}catch(_){}
    this.source=null;this.gain=null
  }
};

const salvageRecovery={
  active:false,stage:null,state:'idle',package:null,captureStart:null,navPulse:0,tractorT:0,secured:false,pickupPhase:'idle',alignT:0,alignTurnRate:0,testMode:false,suspendedMission:null,embeddedCompletion:null,embeddedRestorePhase:'space',
  wrecks:[],combatWreckSeeds:[],inspecting:null,inspectT:0,inspectPhase:'idle',inspectFrameT:0,inspectClearT:0,inspectClearStart:null,inspectClearTarget:null,searchCount:0,dataWreckId:null,dataFound:false,dataFoundT:0,terminalT:0,terminalTransferT:0,terminalTurnT:0,terminalClearDistance:0,terminalTurnStart:null,terminalDataPackets:[],terminalDataSpawnT:0,terminalDataDraining:false,terminalRoute:[],terminalRouteLeg:0,terminalApproachPhase:'idle',
  reset(){
    wreckScannerAudio.stop();
    this.active=false;this.stage=null;this.state='idle';this.package=null;this.captureStart=null;
    this.navPulse=0;this.tractorT=0;this.secured=false;this.pickupPhase='idle';this.alignT=0;this.alignTurnRate=0;this.testMode=false;this.suspendedMission=null;this.embeddedCompletion=null;this.embeddedRestorePhase='space';
    this.wrecks.length=0;this.combatWreckSeeds.length=0;this.inspecting=null;this.inspectT=0;this.inspectPhase='idle';this.inspectFrameT=0;this.inspectClearT=0;this.inspectClearStart=null;this.inspectClearTarget=null;this.searchCount=0;this.dataWreckId=null;this.dataFound=false;this.dataFoundT=0;this.terminalT=0;this.terminalTransferT=0;this.terminalTurnT=0;this.terminalClearDistance=0;this.terminalTurnStart=null;this.terminalDataPackets.length=0;this.terminalDataSpawnT=0;this.terminalDataDraining=false;this.terminalRoute.length=0;this.terminalRouteLeg=0;this.terminalApproachPhase='idle'
  },
  prepare(stage){
    this.reset();this.active=true;this.stage=stage||{};this.state='combat';return true
  },
  beginTest(){
    // Isolated development shortcut: skip combat and place one package close enough
    // to reach in a few seconds, while still exercising marker growth, manual
    // approach, auto-alignment and the real tractor renderer/controller.
    const resume=campaign.currentMission||null;
    this.reset();this.active=true;this.testMode=true;this.suspendedMission=resume;
    if(resume)campaign.currentMission=null;
    this.stage={type:'combat_recovery',recoveryLabel:'test package',captureRadius:16,markerGrowRange:70,tractorSeconds:2.15,testOnly:true};
    this.state='search';this.navPulse=0;this.tractorT=0;this.secured=false;
    mode='play';phase='space';modeT=phaseT=0;shipX=shipY=0;inputX=inputY=aimX=aimY=0;viewYaw=viewPitch=viewRoll=0;spaceYawVel=spacePitchVel=0;
    fighters.length=0;asteroids.length=0;bolts.length=0;groundTargets.length=0;hazards.length=0;shots.length=0;playerMissiles.length=0;
    asteroidField.stop();courier.reset();resetPlanetBearing();resetSpaceMotion();resetSpaceDogfightDirector();spaceOrientationReady=false;ensureSpaceOrientation();
    const w=cameraPointToWorld([8,2.5,30]);
    this.package={x:w[0],y:w[1],z:w[2],rot:[.08,.55,-.06]};
    say('RECOVERY TEST',.65);return true
  },

  beginEmbeddedPickup({package:pkg,stage={},onComplete=null,restorePhase='space'}={}){
    if(!pkg)return false;
    this.reset();this.active=true;this.stage={type:'embedded_recovery',recoveryLabel:'recovery package',tractorSeconds:2.15,...stage};
    this.state='search';this.package={...pkg};this.embeddedCompletion=typeof onComplete==='function'?onComplete:null;this.embeddedRestorePhase=restorePhase||'space';
    return this.beginPickup()
  },
  finishTest(){
    const resume=this.suspendedMission;
    this.active=false;this.stage=null;this.state='idle';this.package=null;this.captureStart=null;this.secured=false;this.pickupPhase='idle';this.testMode=false;this.suspendedMission=null;
    if(resume)campaign.currentMission=resume;
    mode='idle';phase='space';modeT=phaseT=0;inputX=inputY=aimX=aimY=0;viewYaw=viewPitch=viewRoll=0;spaceYawVel=spacePitchVel=0;resetSpaceMotion();
    campaign.showHub('options');say('RECOVERY TEST COMPLETE',.6);return true
  },
  label(){return String(this.stage?.recoveryLabel||'recovery package')},
  distance(point=this.package){return point?Math.hypot(point.x-shipX,point.y-shipY,point.z):Infinity},
  randomReadableWreckRot(){
    // Full pitch/yaw/roll variation, but reject both edge-on and dead-flat views.
    // Each wreck should present as a readable manufactured three-quarter structure.
    for(let tries=0;tries<28;tries++){
      const rot=[(Math.random()-.5)*1.18,Math.random()*Math.PI*2,(Math.random()-.5)*1.22];
      const normal=rotate([0,0,1],rot),facing=Math.abs(normal[2]);
      if(facing>.42&&facing<.91)return rot
    }
    return[.34,.62+Math.random()*.60,-.28]
  },
  makeProceduralWreckSpec(){
    const spec={parts:[]},rr=(a,b)=>a+Math.random()*(b-a),ri=(a,b)=>Math.floor(rr(a,b+1)),pick=a=>a[(Math.random()*a.length)|0];
    const add=(mesh,s,rot,off,alpha=.97)=>spec.parts.push({mesh,s,rot,off,alpha});
    const style=ri(0,2),hand=Math.random()<.5?-1:1;

    // Main manufactured spine / open frame members.
    add('beam',rr(1.08,1.34),[rr(-.10,.10),rr(-.08,.08),rr(-.82,-.26)],[rr(-.52,-.16),rr(-.56,-.18),rr(-.24,.10)]);
    add('beam',rr(.98,1.28),[rr(-.10,.10),rr(-.08,.08),rr(2.02,2.78)],[rr(.28,.78),rr(.18,.56),rr(-.12,.22)]);

    const extraBeams=style===1?ri(2,3):ri(1,2);
    for(let i=0;i<extraBeams;i++){
      const side=(i&1)?1:-1;
      add('beam',rr(.62,1.02),[rr(-.16,.16),rr(-.18,.18),pick([-.24,.16,.72,1.08,1.36])],[side*rr(.36,1.05),rr(-.30,.54),rr(-.18,.26)],.96)
    }

    // Hull skins / torn panels. These are sparse and separated so the structure reads
    // as broken craft, not a single closed blob.
    const plateCount=style===0?ri(2,3):ri(1,2);
    for(let i=0;i<plateCount;i++){
      const mesh=(Math.random()<.55||style===0)?'hull':'torn';
      const side=i===0?-1:(i===1?1:hand);
      add(
        mesh,
        mesh==='hull'?rr(.76,1.16):rr(.60,.92),
        [rr(-.28,.28),rr(-.24,.24),rr(-.55,.75)],
        [side*rr(.22,1.14),rr(-.42,.44),rr(-.22,.20)],
        .98
      )
    }

    // Optional extra torn fin / dangling remnant to increase variety.
    if(Math.random()<.72){
      add('torn',rr(.42,.72),[rr(-.42,.42),rr(-.36,.36),rr(-1.10,1.10)],[hand*rr(.40,1.22),rr(-.66,.66),rr(-.22,.30)],.95)
    }

    // Small chance of a more equipment-like split piece near the centre.
    if(style===2||Math.random()<.34){
      add('hull',rr(.46,.72),[rr(-.18,.18),rr(-.18,.18),rr(-.18,.18)],[rr(-.22,.22),rr(-.20,.20),rr(-.16,.18)],.96)
    }

    return spec
  },
  recordCombatWreck(f){
    if(!this.active||!this.stage?.useCombatWrecks||!f)return false;
    const max=Math.max(4,Math.round(Number(this.stage?.wreckageCount)||6));
    this.combatWreckSeeds.push({x:Number(f.x)||0,y:Number(f.y)||0,z:Number(f.z)||0,rot:Array.isArray(f.rot)?[...f.rot]:null});
    if(this.combatWreckSeeds.length>max)this.combatWreckSeeds.shift();
    return true
  },
  wreckagePresentation(){return this.stage?.wreckagePresentation||{}},
  wreckageSearchFlow(){return this.stage?.wreckageSearchFlow||{}},
  announceWreckSearch(){
    const presentation=this.wreckagePresentation();
    const voice=this.stage?.searchPromptVoice||presentation.searchPromptVoice,text=this.stage?.searchPromptText||presentation.searchPromptText;
    SoundFX.objectiveComplete();
    if(voice)audio.playVoice(voice,{once:false,priority:true});
    else if(text)say(String(text).toUpperCase(),.95)
  },
  announceWreckResult(found){
    const presentation=this.wreckagePresentation();
    const voice=found?(this.stage?.foundVoice||presentation.foundVoice):(this.stage?.missVoice||presentation.missVoice);
    const text=found?(this.stage?.foundText||presentation.foundText):(this.stage?.missText||presentation.missText);
    if(found)SoundFX.objectiveComplete();
    if(voice)audio.playVoice(voice,{once:false,priority:true});
    else if(text)say(String(text).toUpperCase(),.90)
  },
  beginSearch(){
    if(!this.active)this.prepare(campaign.currentStage()||{});
    this.state='search';this.navPulse=0;this.tractorT=0;this.secured=false;
    if(this.stage?.stationAnchor&&stationDelivery?.active){stationDelivery.state='recoverySearch';audio.music.setMode('calm')}
    fighters.length=0;bolts.length=0;playerMissiles.length=0;resetSpaceDogfightDirector();

    if(this.stage?.wreckageSearch)return this.beginWreckageSearch();

    // Legacy single-package recovery remains available for ordinary contracts/tests.
    const side=Math.random()<.24?(Math.random()-.5)*24:(Math.random()<.5?-1:1)*(28+Math.random()*58);
    const vertical=(Math.random()-.5)*44,forward=92+Math.random()*68;
    const w=cameraPointToWorld([side,vertical,forward]);
    this.package={x:w[0],y:w[1],z:w[2],rot:[(Math.random()-.5)*.20,Math.random()*Math.PI*2,(Math.random()-.5)*.20]};
    SoundFX.objectiveComplete();say(`RECOVER ${this.label().toUpperCase()}`,.82);
    return true
  },
  beginWreckageSearch(){
    this.package=null;this.wrecks.length=0;this.inspecting=null;this.inspectT=0;this.searchCount=0;this.dataWreckId=null;this.dataFound=false;this.dataFoundT=0;
    const count=clamp(Math.round(Number(this.stage?.wreckageCount)||6),4,8);

    if(this.stage?.useCombatWrecks&&this.combatWreckSeeds.length){
      // Station defence wreckage needs room to breathe. The old version preserved
      // every kill position too literally, which left a tight knot of markers after
      // close-range combat. Keep the field around the same battle/station volume,
      // but spread the searchable hulks into well-separated recovery contacts.
      const seeds=this.combatWreckSeeds.slice(-count),centre=stationDelivery?.active?[stationDelivery.station.x,stationDelivery.station.y,stationDelivery.station.z]:[0,0,210];
      const base=Math.atan2((seeds[0]?.x||0)-centre[0],(seeds[0]?.z||1)-centre[2]);
      const radii=[105,150,200,255,315,380,450,520];
      for(let i=0;i<count;i++){
        const seed=seeds[i%Math.max(1,seeds.length)]||{y:0};
        const a=base+i*(Math.PI*2/count)+(Math.random()-.5)*.20,r=radii[i]||radii[radii.length-1]+(i-radii.length+1)*70;
        const yOff=clamp((Number(seed.y)||0)-centre[1],-42,42)+(i%2?24:-24);
        const w=[centre[0]+Math.sin(a)*r,centre[1]+yOff,centre[2]+Math.cos(a)*r];
        this.wrecks.push({id:`wreck-${i}`,x:w[0],y:w[1],z:w[2],searched:false,rot:this.randomReadableWreckRot(),s:1.35+Math.random()*.75,spec:this.makeProceduralWreckSpec()})
      }
    }else{
      // Authored debris-field shape belongs to the mission. The recovery mechanism
      // only interprets that layout into fixed world-space wreck contacts.
      const field=this.stage?.wreckageField||{};
      // If a future mission omits an authored field, use a neutral generated spread;
      // do not silently inherit the VOX courier's particular search pattern.
      const ranges=Array.isArray(field.ranges)&&field.ranges.length?field.ranges:Array.from({length:count},(_,i)=>180+i*120);
      const azimuths=Array.isArray(field.azimuths)&&field.azimuths.length?field.azimuths:Array.from({length:count},(_,i)=>i*Math.PI*2/Math.max(1,count));
      const elevations=Array.isArray(field.elevations)&&field.elevations.length?field.elevations:Array.from({length:count},(_,i)=>(i%2?.12:-.12));
      const fieldYaw=(Math.random()-.5)*(Number(field.fieldYawSpan)||.34);
      const distanceScaleMin=Number(field.distanceScaleMin)||.94,distanceScaleSpan=Number(field.distanceScaleSpan)||.12;
      const azimuthJitterSpan=Number(field.azimuthJitterSpan)||.14,elevationJitterSpan=Number(field.elevationJitterSpan)||.08;
      const scaleMin=Number(field.scaleMin)||1.90,scaleSpan=Number(field.scaleSpan)||1.00;
      for(let i=0;i<count;i++){
        const range=ranges[i%ranges.length],baseAz=azimuths[i%azimuths.length],baseEl=elevations[i%elevations.length];
        const dist=range*(distanceScaleMin+Math.random()*distanceScaleSpan),az=baseAz+fieldYaw+(Math.random()-.5)*azimuthJitterSpan,el=baseEl+(Math.random()-.5)*elevationJitterSpan,cosEl=Math.cos(el);
        const local=[Math.sin(az)*dist*cosEl,Math.sin(el)*dist,Math.cos(az)*dist*cosEl],w=cameraPointToWorld(local);
        this.wrecks.push({id:`wreck-${i}`,x:w[0],y:w[1],z:w[2],searched:false,rot:this.randomReadableWreckRot(),s:scaleMin+Math.random()*scaleSpan,spec:this.makeProceduralWreckSpec()})
      }
    }
    // A forced-first-miss story defers assignment until that miss has completed.
    // Other wreckage searches can nominate useful evidence immediately.
    if(this.wreckageSearchFlow().firstResultAlwaysMiss!==true&&this.wrecks.length){
      this.dataWreckId=this.wrecks[Math.floor(Math.random()*this.wrecks.length)].id
    }
    this.announceWreckSearch();return true
  },
  beginWreckInspect(wreck){
    if(!wreck||wreck.searched||this.inspecting||this.dataFound)return false;
    this.inspecting=wreck;this.inspectT=0;this.inspectPhase='framing';this.inspectFrameT=0;mode='recoveryPickup';modeT=0;phase='space';
    inputX=inputY=aimX=aimY=0;spaceYawVel=spacePitchVel=0;laserBurstRemaining=0;endLaserTrigger();
    const presentation=this.wreckagePresentation();
    say(String(presentation.searchingText||'SEARCHING').toUpperCase(),Number(presentation.searchingHold)||.58);return true
  },
  finishWreckInspect(){
    const wreck=this.inspecting;if(!wreck)return;
    wreckScannerAudio.stop();
    wreck.searched=true;this.searchCount++;

    // The approach naturally leaves the drone pointing directly at the inspected
    // wreck. Before releasing control, slide that wreck a short distance sideways
    // relative to the current cockpit view so resuming forward flight does not send
    // the player straight through it.
    const q=camPoint([wreck.x,wreck.y,wreck.z]);
    const flow=this.wreckageSearchFlow(),sideChance=Number.isFinite(Number(flow.clearSideChance))?Number(flow.clearSideChance):.5;
    const side=wreck.clearSide||(wreck.clearSide=Math.random()<sideChance?-1:1);
    const clearance=Math.max(Number(flow.clearanceMin)||12,wreck.s*(Number(flow.clearanceScale)||5.6));
    const targetLocal=[
      side*clearance,
      q?.[1]||0,
      Math.max(Number(flow.clearForwardMin)||19,(q?.[2]||20)+(Number(flow.clearForwardOffset)||2.5))
    ];
    this.inspectClearStart=[wreck.x,wreck.y,wreck.z];
    this.inspectClearTarget=cameraPointToWorld(targetLocal);
    this.inspectClearT=0;this.inspectPhase='clearing'
  },
  updateWreckClear(dt){
    const wreck=this.inspecting;if(!wreck)return;
    this.inspectClearT+=dt;
    const flow=this.wreckageSearchFlow(),q=ease(clamp(this.inspectClearT/Math.max(.05,Number(flow.clearDuration)||.34),0,1));
    const a=this.inspectClearStart,b=this.inspectClearTarget;
    wreck.x=lerp(a[0],b[0],q);wreck.y=lerp(a[1],b[1],q);wreck.z=lerp(a[2],b[2],q);
    if(q<1)return;

    this.inspecting=null;this.inspectT=0;this.inspectPhase='idle';this.inspectFrameT=0;
    this.inspectClearT=0;this.inspectClearStart=null;this.inspectClearTarget=null;

    // Some authored searches require the first result to be a miss before the
    // useful evidence is assigned to one of the remaining contacts.
    if(flow.firstResultAlwaysMiss===true&&this.searchCount===1){
      const remaining=this.wrecks.filter(w=>!w.searched);
      this.dataWreckId=remaining.length?remaining[Math.floor(Math.random()*remaining.length)].id:null;
      mode='play';this.announceWreckResult(false);return
    }

    if(wreck.id===this.dataWreckId){
      this.dataFound=true;this.dataFoundT=0;this.secured=true;mode='play';
      this.announceWreckResult(true);return
    }

    mode='play';this.announceWreckResult(false)
  },
  shiftStationRecoveryField(delta){
    if(stationDelivery?.active){stationDelivery.station.x-=delta[0];stationDelivery.station.y-=delta[1];stationDelivery.station.z-=delta[2]}
    for(const w of this.wrecks){w.x-=delta[0];w.y-=delta[1];w.z-=delta[2]}
  },
  beginTerminalReturn(){
    if(!stationDelivery?.active||!this.stage?.externalDataTerminal){this.state='done';scenarioFlow.completeCurrentStage();return false}
    this.state='terminalNav';this.terminalT=0;this.terminalTransferT=0;this.terminalTurnT=0;this.terminalClearDistance=0;this.terminalTurnStart=null;this.terminalDataPackets.length=0;this.terminalDataSpawnT=0;this.terminalDataDraining=false;this.terminalRoute.length=0;this.terminalRouteLeg=0;this.terminalApproachPhase='idle';
    inputX=inputY=aimX=aimY=0;spaceYawVel=spacePitchVel=0;
    say('TRANSFER RECOVERED DATA AT STATION TERMINAL',1.05);SoundFX.objectiveComplete();return true
  },
  buildTerminalApproachRoute(){
    const centre=[stationDelivery.station.x,stationDelivery.station.y,stationDelivery.station.z],stage=stationDelivery.externalTerminalStagePoint();
    const protectedRadius=stationDelivery.hostClearanceRadius(),planned=planLargeObjectApproach([shipX,shipY,0],centre,stage,protectedRadius,stationDelivery.externalTerminalUp());
    this.terminalRoute=planned.map(p=>v3sub(p,centre));this.terminalRouteLeg=0;this.terminalApproachPhase='route'
  },
  updateTerminalNav(dt){
    this.terminalT+=dt;
    const speed=OPEN_SPACE_CRUISE,delta=[spaceMoveX*speed*dt,spaceMoveY*speed*dt,spaceMoveZ*speed*dt];
    this.shiftStationRecoveryField(delta);
    const stage=stationDelivery.externalTerminalStagePoint(),sq=camPoint(stage),cq=camPoint([stationDelivery.station.x,stationDelivery.station.y,stationDelivery.station.z]);if(!sq||!cq)return;
    const stageRange=Math.hypot(sq[0],sq[1],sq[2]),centreRange=Math.hypot(cq[0],cq[1],cq[2]);
    const capture=Math.max(72,Number(this.stage?.terminalCaptureRadius)||96),hostCapture=stationDelivery.hostClearanceRadius()+88;
    // Hand off before the player is forced to skim around the host manually.  The
    // autopilot route planner then owns the safe path to the exposed terminal face.
    if(stageRange<capture||centreRange<hostCapture){
      this.state='terminalApproach';this.terminalT=0;mode='recoveryPickup';inputX=inputY=aimX=aimY=0;spaceYawVel=spacePitchVel=0;
      this.buildTerminalApproachRoute();say('AUTOPILOT · DATA TERMINAL',.62)
    }
  },
  updateTerminalApproach(dt){
    if(this.terminalApproachPhase==='route'){
      const centre=[stationDelivery.station.x,stationDelivery.station.y,stationDelivery.station.z],off=this.terminalRoute[this.terminalRouteLeg];
      if(!off)this.terminalApproachPhase='final';
      else{
        const target=v3add(centre,off),toTarget=v3sub(target,[shipX,shipY,0]),dist=v3len(toTarget),angle=stationDelivery.faceDockMovement(target,dt,1.40);
        // Start levelling with the terminal during the outer route so the bank is
        // visibly removed over the whole approach instead of at the parking point.
        stationDelivery.alignExternalTerminalRoll(dt,.62);
        if(angle>.16)return;
        const speed=dist>55?28:lerp(11,22,clamp(dist/55,0,1)),step=Math.min(dist,speed*dt),delta=dist>.0001?v3scale(toTarget,step/dist):[0,0,0];
        this.shiftStationRecoveryField(delta);
        if(dist<=1.15||step>=dist-.02){this.terminalRouteLeg++;if(this.terminalRouteLeg>=this.terminalRoute.length)this.terminalApproachPhase='final'}
        return
      }
    }
    const stop=stationDelivery.externalTerminalStopPoint(),terminal=stationDelivery.externalTerminalPoint();
    const toStop=v3sub(stop,[shipX,shipY,0]),dist=v3len(toStop),angle=stationDelivery.faceDockDirection(v3sub(terminal,[shipX,shipY,0]),dt,1.18);
    const rollError=stationDelivery.alignExternalTerminalRoll(dt,.72);
    // The final leg begins only after the safe outer staging point has been reached.
    // It is therefore a straight radial move down the terminal wall normal, never a
    // diagonal shortcut through the station body.
    if(angle<=.16&&dist>.22){const step=Math.min(dist,Math.max(2.8,Math.min(10,dist*1.35))*dt),delta=v3scale(toStop,step/Math.max(.001,dist));this.shiftStationRecoveryField(delta)}
    if(dist<.48&&angle<.025&&rollError<.025){
      this.state='terminalTransfer';this.terminalTransferT=0;this.terminalDataPackets.length=0;this.terminalDataSpawnT=.08;this.terminalDataDraining=false;
      // Use the canonical secure-terminal stream: identical packet generator,
      // cadence, direction and drain behaviour used by the other data terminals.
      for(let i=0;i<5;i++)this.terminalDataPackets.push(...stationHack.makeDataPacketGroup(true));
      audio?.hackChirp?.start?.();say('TRANSFERRING ROUTING DATA',.72)
    }
  },
  updateTerminalTransfer(dt){
    this.terminalTransferT+=dt;
    const seconds=Math.max(1.6,Number(this.stage?.transferSeconds)||3.2);
    for(let i=this.terminalDataPackets.length-1;i>=0;i--){const p=this.terminalDataPackets[i];p.u+=p.speed*dt;if(p.u>=1)this.terminalDataPackets.splice(i,1)}
    if(this.terminalTransferT>=seconds)this.terminalDataDraining=true;
    if(!this.terminalDataDraining){
      this.terminalDataSpawnT-=dt;
      while(this.terminalDataSpawnT<=0&&this.terminalDataPackets.length<18){this.terminalDataPackets.push(...stationHack.makeDataPacketGroup(false));this.terminalDataSpawnT+=.14+Math.random()*.34}
    }
    if(!this.terminalDataDraining||this.terminalDataPackets.length)return;
    audio?.hackChirp?.stop?.();SoundFX.relayCalibrated?.();audio.playVoice('dataTransferComplete',{once:false,priority:true});
    this.state='terminalHold';this.terminalT=0
  },
  beginTerminalTurn(){
    ensureSpaceOrientation();
    this.state='terminalTurn';this.terminalTurnT=0;this.terminalTurnStart={f:[...spaceForward],r:[...spaceRight],u:[...spaceUp]};
  },
  updateTerminalTurn(dt){
    this.terminalTurnT+=dt;const seconds=1.75,u=clamp(this.terminalTurnT/seconds,0,1),q=ease(u),st=this.terminalTurnStart;
    if(st){spaceForward=rotateAroundAxis(st.f,st.u,Math.PI*q);spaceRight=rotateAroundAxis(st.r,st.u,Math.PI*q);spaceUp=[...st.u];orthonormaliseSpaceOrientation();syncEulerFromSpaceOrientation();viewRoll=-Math.sin(u*Math.PI)*.09}
    if(u>=1){viewRoll=0;this.state='terminalClear';this.terminalClearDistance=0;mode='stationDeparture';say('CLEAR THE STATION',.58)}
  },
  updateTerminalClear(dt){
    const speed=OPEN_SPACE_CRUISE,delta=[spaceForward[0]*speed*dt,spaceForward[1]*speed*dt,spaceForward[2]*speed*dt];
    this.shiftStationRecoveryField(delta);this.terminalClearDistance+=speed*dt;
    if(this.terminalClearDistance>=72){this.state='done';scenarioFlow.completeCurrentStage()}
  },
  beginPickup(){
    if(!this.package||this.state!=='search')return false;
    this.state='pickup';this.captureStart=null;this.tractorT=0;this.secured=false;this.pickupPhase='align';this.alignT=0;this.alignTurnRate=0;
    mode='recoveryPickup';modeT=0;phase='space';inputX=inputY=aimX=aimY=0;spaceYawVel=spacePitchVel=0;
    laserBurstRemaining=0;endLaserTrigger();bolts.length=0;playerMissiles.length=0;
    say('AUTOPILOT · RECOVERY',.55);return true
  },
  cargoIntakeCam(){
    // Recovery cargo enters a bay just below the pilot/camera rather than flying
    // into the exact centre of the view. Keep this in camera space so the intake
    // follows the craft naturally during any future reuse of the recovery stage.
    return[0,-.95,1.55]
  },
  packagePoint(){
    if(!this.package)return null;
    // During the alignment hold the package is a fixed world object. Only once the
    // craft has levelled and faced it does the tractor animation move the package.
    if(this.state!=='pickup'||this.pickupPhase!=='tractor'||!this.captureStart)return[this.package.x,this.package.y,this.package.z];
    const seconds=Math.max(.8,Number(this.stage?.tractorSeconds)||2.15),q=ease(clamp(this.tractorT/seconds,0,1));
    const end=cameraPointToWorld(this.cargoIntakeCam());
    return[lerp(this.captureStart[0],end[0],q),lerp(this.captureStart[1],end[1],q),lerp(this.captureStart[2],end[2],q)]
  },
  alignToPackage(dt){
    if(!this.package)return false;
    ensureSpaceOrientation();this.alignT+=dt;
    const desired=v3norm([this.package.x-shipX,this.package.y-shipY,this.package.z]);
    if(v3len(desired)<.0001)return false;
    const angle=Math.acos(clamp(v3dot(spaceForward,desired),-1,1));
    if(angle>.0018){
      let axis=v3cross(spaceForward,desired);if(v3len(axis)<.001)axis=spaceUp;axis=v3norm(axis);
      const wanted=Math.min(1.38,Math.max(.16,angle*3.0)),follow=1-Math.exp(-dt*5.0);
      this.alignTurnRate=lerp(this.alignTurnRate||0,wanted,follow);
      if(angle<.035)this.alignTurnRate=Math.min(this.alignTurnRate,Math.max(.10,angle*4));
      const turn=Math.min(angle,Math.max(0,this.alignTurnRate)*dt);
      spaceForward=rotateAroundAxis(spaceForward,axis,turn);spaceRight=rotateAroundAxis(spaceRight,axis,turn);spaceUp=rotateAroundAxis(spaceUp,axis,turn);
      orthonormaliseSpaceOrientation();syncEulerFromSpaceOrientation()
    }else this.alignTurnRate*=Math.exp(-dt*7);
    // 'Level with the package' also means remove the cosmetic bank before the
    // tractor starts, so the package comes aboard on a clean, centred presentation.
    viewRoll=moveToward(viewRoll,0,dt*2.8);
    if(angle<.012&&Math.abs(viewRoll)<.012&&this.alignT>.22){
      this.pickupPhase='tractor';this.captureStart=[this.package.x,this.package.y,this.package.z];this.tractorT=0;this.alignTurnRate=0;
      return true
    }
    return false
  },
  alignToInspectWreck(dt){
    const wreck=this.inspecting;if(!wreck)return true;
    const parts=this.wreckageComponents(wreck),bounds=this.wreckProjectedBounds(parts);if(!bounds)return false;
    ensureSpaceOrientation();this.inspectFrameT+=dt;

    // "Centred on screen" means the visual centre of the complete wreck geometry,
    // not its world origin and not merely somewhere inside the viewport.
    const targetX=W*.5,targetY=viewH*.5;
    const centreX=(bounds.minX+bounds.maxX)*.5,centreY=(bounds.minY+bounds.maxY)*.5;
    const depth=Math.max(.5,bounds.depth),f=Math.min(W,viewH)*1.09;
    const desiredCam=[(centreX-targetX)*depth/f,(targetY-centreY)*depth/f,depth];
    const desired=v3norm(cameraVectorToWorld(desiredCam));
    const angle=Math.acos(clamp(v3dot(spaceForward,desired),-1,1));

    if(angle>.0005){
      let axis=v3cross(spaceForward,desired);if(v3len(axis)<.001)axis=spaceUp;axis=v3norm(axis);
      const turn=Math.min(angle,Math.min(2.05,Math.max(.20,angle*5.2))*dt);
      spaceForward=rotateAroundAxis(spaceForward,axis,turn);
      spaceRight=rotateAroundAxis(spaceRight,axis,turn);
      spaceUp=rotateAroundAxis(spaceUp,axis,turn);
      orthonormaliseSpaceOrientation();syncEulerFromSpaceOrientation()
    }
    viewRoll=moveToward(viewRoll,0,dt*3.2);

    const framed=this.wreckProjectedBounds(this.wreckageComponents(wreck));if(!framed)return false;
    const fx=(framed.minX+framed.maxX)*.5,fy=(framed.minY+framed.maxY)*.5;
    const errX=Math.abs(fx-targetX),errY=Math.abs(fy-targetY);
    const marginX=Math.max(54,(framed.maxX-framed.minX)*.08),marginY=Math.max(48,(framed.maxY-framed.minY)*.08);
    const fullyVisible=framed.minX>marginX&&framed.maxX<W-marginX&&framed.minY>marginY&&framed.maxY<viewH-marginY;

    // Do not start scanning on a timeout. Wait until the wreck really is centred.
    if(fullyVisible&&errX<=5&&errY<=5&&Math.abs(viewRoll)<.025&&this.inspectFrameT>.20){
      this.inspectPhase='scan';this.inspectT=0;wreckScannerAudio.start();return true
    }
    return false
  },
  updateSearch(dt){
    this.navPulse+=dt;

    if(this.stage?.wreckageSearch){
      if(this.dataFound){
        this.dataFoundT+=dt;
        if(this.dataFoundT>=Math.max(.72,Number(this.stage?.foundHold)||.72)&&!audio.voicePlaying&&!audio.voiceQueue.length){
          if(this.stage?.externalDataTerminal)this.beginTerminalReturn();
          else{this.state='done';scenarioFlow.completeCurrentStage()}
        }
        return
      }

      if(this.inspecting){
        if(this.inspectPhase==='framing'){
          this.alignToInspectWreck(dt);
          return
        }
        if(this.inspectPhase==='clearing'){
          this.updateWreckClear(dt);
          return
        }
        this.inspectT+=dt;
        if(this.inspectT>=Math.max(.45,Number(this.stage?.inspectSeconds)||.85))this.finishWreckInspect();
        return
      }

      // The field is fixed in world space. Normal open-space flight translates all
      // pieces together, so the wreckage remains scattered instead of following aim.
      const speed=OPEN_SPACE_CRUISE;
      if(this.stage?.stationAnchor&&stationDelivery?.active){
        stationDelivery.station.x-=spaceMoveX*speed*dt;
        stationDelivery.station.y-=spaceMoveY*speed*dt;
        stationDelivery.station.z-=spaceMoveZ*speed*dt
      }
      for(const w of this.wrecks){
        w.x-=spaceMoveX*speed*dt;w.y-=spaceMoveY*speed*dt;w.z-=spaceMoveZ*speed*dt
      }

      const capture=Math.max(10,Number(this.stage?.captureRadius)||18);
      let candidate=null,best=Infinity;
      for(const w of this.wrecks){
        if(w.searched)continue;
        const q=camPoint([w.x,w.y,w.z]),d=Math.hypot(w.x-shipX,w.y-shipY,w.z);
        if(q[2]>1.4&&d<capture&&d<best){candidate=w;best=d}
      }
      if(candidate)this.beginWreckInspect(candidate);
      return
    }

    if(!this.package)return;
    // Open-space flight keeps the craft near the origin and translates persistent
    // objects by the damped cruise vector. This is the same world-motion convention
    // used by other fixed destinations such as the asteroid mine.
    this.package.x-=spaceMoveX*OPEN_SPACE_CRUISE*dt;
    this.package.y-=spaceMoveY*OPEN_SPACE_CRUISE*dt;
    this.package.z-=spaceMoveZ*OPEN_SPACE_CRUISE*dt;
    const q=camPoint([this.package.x,this.package.y,this.package.z]);
    const capture=Math.max(10,Number(this.stage?.captureRadius)||18);
    if(this.distance()<capture&&q[2]>1.4)this.beginPickup()
  },
  updatePickup(dt){
    if(this.pickupPhase==='align'){
      this.alignToPackage(dt);return
    }
    if(this.pickupPhase!=='tractor')return;
    this.tractorT+=dt;
    const seconds=Math.max(.8,Number(this.stage?.tractorSeconds)||2.15);
    if(!this.secured&&this.tractorT>=seconds){
      this.secured=true;this.package=null;SoundFX.objectiveComplete();
      if(this.stage?.recoveredVoice)audio.playVoice(this.stage.recoveredVoice,{once:false,priority:true});
      else if(this.stage?.recoveredMessage)say(String(this.stage.recoveredMessage).toUpperCase(),.9);
      else audio.playVoice('recoveryComplete',{once:false,priority:true})
    }
    // Do not let the generic mission-complete announcement cut off the recovery
    // acknowledgement. With speech disabled/missing, the minimum hold still gives
    // the tractor action a readable finish before scenarioFlow starts the canonical
    // forward missionExit zoom for this terminal space stage.
    if(this.secured&&this.tractorT>=seconds+.55&&!audio.voicePlaying&&!audio.voiceQueue.length){
      if(this.embeddedCompletion){
        const done=this.embeddedCompletion,restorePhase=this.embeddedRestorePhase||'space';
        this.reset();mode='play';phase=restorePhase;modeT=phaseT=0;done();return
      }
      this.state='done';
      if(this.testMode)this.finishTest();
      else scenarioFlow.completeCurrentStage()
    }
  },
  update(dt){
    if(!this.active)return;
    if(this.state==='search')this.updateSearch(dt);
    else if(this.state==='pickup')this.updatePickup(dt);
    else if(this.state==='terminalNav')this.updateTerminalNav(dt);
    else if(this.state==='terminalApproach')this.updateTerminalApproach(dt);
    else if(this.state==='terminalTransfer')this.updateTerminalTransfer(dt);
    else if(this.state==='terminalHold'){
      this.terminalT+=dt;if(this.terminalT>.72&&!audio.voicePlaying&&!audio.voiceQueue.length)this.beginTerminalTurn()
    }else if(this.state==='terminalTurn')this.updateTerminalTurn(dt);
    else if(this.state==='terminalClear')this.updateTerminalClear(dt)
  },
  drawPackage(){
    const w=this.packagePoint();if(!w||this.secured)return;
    const cp=proj(w);if(!cp)return;
    if(this.state==='pickup'&&this.pickupPhase==='tractor'&&this.captureStart){
      const seconds=Math.max(.8,Number(this.stage?.tractorSeconds)||2.15),q=ease(clamp(this.tractorT/seconds,0,1));
      if(q<.995){
        // Recovery tractor presentation: a sparse, slower set of bowed wavefronts
        // inside a truncated torch-beam envelope. The implied beam sides should be
        // straight if imagined between wave endpoints; only the individual fronts
        // themselves are bowed.
        const cargoCam=camPoint(w);
        if(cargoCam&&cargoCam[2]>.78){
          const waves=5,flow=(this.tractorT*.34)%1;
          const pp=projectCam(cargoCam);if(pp){
            const sourceX=W*.5;
            const sourceY=viewH+Math.max(70,viewH*.18);
            const destX=pp.x,destY=pp.y;
            const nearHalf=8,farHalf=34;
            ctx.save();ctx.strokeStyle=C.c;ctx.lineWidth=VECTOR_LINE_WIDTH;ctx.globalAlpha=.70;
            for(let i=0;i<waves;i++){
              // Pickup travels inward; wavefronts do the same. Their on-screen
              // spacing compresses with distance toward the package.
              const t=((((i/waves)-flow)%1+1)%1);
              const tp=1-Math.pow(1-t,2.05);
              const leftX=lerp(sourceX-nearHalf,destX-farHalf,tp);
              const rightX=lerp(sourceX+nearHalf,destX+farHalf,tp);
              const y=lerp(sourceY,destY,tp);
              if(y<-40||y>viewH+60)continue;
              const x=(leftX+rightX)*.5;
              const half=(rightX-leftX)*.5;
              // Keep the bow shallow so the fronts read as slices through a beam,
              // not as beam sides curving inward.
              const bow=lerp(4,10,tp);
              ctx.beginPath();
              ctx.moveTo(leftX,y);
              ctx.quadraticCurveTo(x,y-bow,rightX,y);
              ctx.stroke()
            }
            ctx.restore()
          }
        }
      }
    }
    // Keep the package orientation stable. If the recovery geometry is correct,
    // the viewer will naturally see more of the top face as the cargo drops below
    // the camera toward the bay; we should not fake that by pitching the box over.
    const rot=this.package?.rot||[0,.25,0];
    drawMesh({type:'recoveryCargo',x:w[0],y:w[1],z:w[2],s:.5,mx:1.02,my:.22,mz:.70,rot},courierFixtureBoxMesh,this.state==='pickup'?C.c:C.y,.98)
  },
  wreckScanTriangles(parts){
    const tris=[];
    for(const part of parts){
      const obj=part.obj,mesh=part.mesh,mx=obj.mx||1,my=obj.my||1,mz=obj.mz||1;
      const verts=mesh.v.map(v=>{
        const p=rotate([v[0]*obj.s*mx,v[1]*obj.s*my,v[2]*obj.s*mz],obj.rot);
        return camPoint([p[0]+obj.x,p[1]+obj.y,p[2]+obj.z])
      });
      for(const face of mesh.faces||[]){
        if(face.length<3)continue;
        for(let i=1;i<face.length-1;i++){
          const a=verts[face[0]],b=verts[face[i]],c=verts[face[i+1]];
          if(a&&b&&c&&a[2]>.18&&b[2]>.18&&c[2]>.18)tris.push([a,b,c])
        }
      }
    }
    return tris
  },
  wreckScanRayTriangle(origin,dir,a,b,c){
    // Moller-Trumbore, deliberately two-sided. The nearest hit across all wreck
    // triangles is used, so rear surfaces cannot shine through nearer structure.
    const e1=[b[0]-a[0],b[1]-a[1],b[2]-a[2]],e2=[c[0]-a[0],c[1]-a[1],c[2]-a[2]];
    const h=v3cross(dir,e2),det=v3dot(e1,h);if(Math.abs(det)<1e-7)return null;
    const inv=1/det,s=[origin[0]-a[0],origin[1]-a[1],origin[2]-a[2]];
    const u=inv*v3dot(s,h);if(u<0||u>1)return null;
    const q=v3cross(s,e1),v=inv*v3dot(dir,q);if(v<0||u+v>1)return null;
    const t=inv*v3dot(e2,q);return t>1e-5?t:null
  },
  wreckProjectedBounds(parts){
    let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity,depth=0,count=0;
    for(const part of parts){
      const obj=part.obj,mesh=part.mesh,mx=obj.mx||1,my=obj.my||1,mz=obj.mz||1;
      for(const v of mesh.v){
        const r=rotate([v[0]*obj.s*mx,v[1]*obj.s*my,v[2]*obj.s*mz],obj.rot);
        const q=camPoint([r[0]+obj.x,r[1]+obj.y,r[2]+obj.z]);if(!q||q[2]<=.18)continue;
        const p=projectCam(q);if(!p)continue;
        minX=Math.min(minX,p.x);maxX=Math.max(maxX,p.x);minY=Math.min(minY,p.y);maxY=Math.max(maxY,p.y);
        depth+=q[2];count++
      }
    }
    return count?{minX,maxX,minY,maxY,depth:depth/count}:null
  },
  drawWreckScanContact(parts,nearLeft,nearRight,farLeft,farRight,col){
    const tris=this.wreckScanTriangles(parts),samples=97;
    let previous=null;
    for(let i=0;i<samples;i++){
      const u=i/(samples-1);
      const origin=[lerp(nearLeft[0],nearRight[0],u),lerp(nearLeft[1],nearRight[1],u),lerp(nearLeft[2],nearRight[2],u)];
      const far=[lerp(farLeft[0],farRight[0],u),lerp(farLeft[1],farRight[1],u),lerp(farLeft[2],farRight[2],u)];
      const delta=[far[0]-origin[0],far[1]-origin[1],far[2]-origin[2]],maxDist=v3len(delta);
      if(maxDist<.001){previous=null;continue}
      const dir=[delta[0]/maxDist,delta[1]/maxDist,delta[2]/maxDist];
      let best=Infinity;
      for(const tr of tris){
        const t=this.wreckScanRayTriangle(origin,dir,tr[0],tr[1],tr[2]);
        if(t!==null&&t<=maxDist&&t<best)best=t
      }
      if(!Number.isFinite(best)){previous=null;continue}
      const hit=[origin[0]+dir[0]*best,origin[1]+dir[1]*best,origin[2]+dir[2]*best],p=projectCam(hit);
      if(!p){previous=null;continue}
      if(previous){
        const gap=Math.hypot(p.x-previous.p.x,p.y-previous.p.y),depthJump=Math.abs(hit[2]-previous.hit[2]);
        if(gap<42&&depthJump<Math.max(.85,hit[2]*.055))line(previous.p.x,previous.p.y,p.x,p.y,col,VECTOR_LINE_WIDTH,.99)
      }
      previous={p,hit}
    }
  },
  wreckageComponents(w){
    const spec=w.spec||(w.spec=this.makeProceduralWreckSpec()),parts=[];
    const meshMap={hull:courierWreckHullPlateMesh,torn:courierWreckTornPlateMesh,beam:courierWreckAngleBeamMesh};
    for(const part of spec.parts){
      const mesh=meshMap[part.mesh];if(!mesh)continue;
      const local=rotate([part.off[0]*w.s,part.off[1]*w.s,part.off[2]*w.s],w.rot);
      const rot=[w.rot[0]+part.rot[0],w.rot[1]+part.rot[1],w.rot[2]+part.rot[2]];
      parts.push({
        obj:{type:'proceduralCourierWreck',x:w.x+local[0],y:w.y+local[1],z:w.z+local[2],s:w.s*part.s,mx:1,my:1,mz:1,rot},
        mesh,col:C.g,alpha:part.alpha
      })
    }
    return parts
  },
  drawWreckScan(w,parts){
    if(this.inspecting!==w||this.state!=='search'||this.inspectPhase!=='scan')return;
    const bounds=this.wreckProjectedBounds(parts);if(!bounds)return;
    const seconds=Math.max(.45,Number(this.stage?.inspectSeconds)||.85),q=ease(clamp(this.inspectT/seconds,0,1));

    // The scan blade is one real 3D fan. It pivots from a virtually point-like
    // emitter below the camera, opens very wide at the wreck, and sweeps over the
    // wreck's actual projected height. The same four rail endpoints drive the
    // surface ray-cast below, so the rails and contact line can no longer disagree.
    const scanCol=(Math.floor(this.inspectT*12)%2)?C.m:C.c;
    const pad=Math.max(34,(bounds.maxY-bounds.minY)*.18),scanY=lerp(bounds.minY-pad,bounds.maxY+pad,q);
    const scanX=(bounds.minX+bounds.maxX)*.5;
    const emitter=[0,-.82,1.15],ep=projectCam(emitter);if(!ep)return;
    const farDepth=Math.max(bounds.depth+5.2*w.s,bounds.depth*1.08),f=ep.k*ep.z;
    const unproject=(sx,sy,z)=>[(sx-W*.5)*z/f,(viewH*.48-sy)*z/f,z];

    const nearPx=1.5,farPx=Math.max((bounds.maxX-bounds.minX)*.82,clamp(W*.24,260,480));
    const nearLeft=unproject(ep.x-nearPx,ep.y,emitter[2]),nearRight=unproject(ep.x+nearPx,ep.y,emitter[2]);
    const farLeft=unproject(scanX-farPx,scanY,farDepth),farRight=unproject(scanX+farPx,scanY,farDepth);
    const nlp=projectCam(nearLeft),nrp=projectCam(nearRight),flp=projectCam(farLeft),frp=projectCam(farRight);
    if(nlp&&nrp&&flp&&frp){
      line(nlp.x,nlp.y,flp.x,flp.y,scanCol,VECTOR_LINE_WIDTH,.94);
      line(nrp.x,nrp.y,frp.x,frp.y,scanCol,VECTOR_LINE_WIDTH,.94)
    }

    // Do not paint a horizontal bar over the object. Sample rays across the fan and
    // draw only their nearest real surface hits. Tilted planes bend/slant the line;
    // gaps in the wreck produce gaps in the scanner reflection.
    this.drawWreckScanContact(parts,nearLeft,nearRight,farLeft,farRight,scanCol)
  },
  drawWreckagePiece(w){
    const parts=this.wreckageComponents(w);
    for(const part of parts)drawMesh(part.obj,part.mesh,part.col,part.alpha);

    // Scanner reflection is drawn last so the live contour is readable on the
    // surface currently being hit. There is no beam, rectangle, trail or empty-space line.
    this.drawWreckScan(w,parts)
  },
  appendScene(scene){
    if(!this.active||(mode!=='play'&&mode!=='recoveryPickup')||this.state==='combat'||this.state==='done')return;
    if(this.stage?.wreckageSearch){
      for(const w of this.wrecks){
        const q=camPoint([w.x,w.y,w.z]);if(q[2]>.18)scene.push({z:q[2],draw:()=>this.drawWreckagePiece(w)})
      }
      return
    }
    if(this.secured)return;
    const w=this.packagePoint();if(!w)return;const q=camPoint(w);if(q[2]>.18)scene.push({z:q[2],draw:()=>this.drawPackage()})
  },
  drawMarker(){
    if(!this.active)return;
    if(this.state==='terminalNav'){
      const target=stationDelivery?.externalTerminalStopPoint?.();if(!target)return;
      const q=camPoint(target),col=C.y,p=q[2]>.15?projectCam(q):null;
      const on=!!(p&&p.x>=0&&p.x<=W&&p.y>=0&&p.y<=viewH);
      if(on){const x=p.x,y=p.y,r=11+Math.sin(this.terminalT*4.2)*1.5;line(x-r,y,x,y-r,col,1.2,.95);line(x,y-r,x+r,y,col,1.2,.95);line(x+r,y,x,y+r,col,1.2,.95);line(x,y+r,x-r,y,col,1.2,.95);drawHudMarkerLabel('DATA TERMINAL',x,y,r,col)}
      else{const edge=hudEdgeCue(q,0),px=edge.x,py=edge.y,dx=edge.dx,dy=edge.dy,tx=-dy,ty=dx;line(px,py,px-dx*10+tx*7,py-dy*10+ty*7,col,1.25,.9);line(px,py,px-dx*10-tx*7,py-dy*10-ty*7,col,1.25,.9)}
      return
    }
    if(this.state!=='search')return;

    if(this.stage?.wreckageSearch){
      // Once inspection starts, remove every wreckage marker immediately. The scan
      // should be read from the wreck itself, not through a HUD diamond.
      if(this.dataFound||this.inspecting||mode==='recoveryPickup')return;
      const growRange=Math.max(40,Number(this.stage?.markerGrowRange)||105),col=C.y;
      for(const w of this.wrecks){
        if(w.searched)continue;
        const q=camPoint([w.x,w.y,w.z]),projected=q[2]>.15?projectCam(q):null;
        const on=!!(projected&&projected.x>=0&&projected.x<=W&&projected.y>=0&&projected.y<=viewH);
        const d=Math.max(1,Math.hypot(w.x-shipX,w.y-shipY,w.z));
        const markerR=on?(d>=growRange?9:clamp(9+(growRange-d)*.38,9,43)):13;
        const cue=on?{x:projected.x,y:projected.y}:hudEdgeCue(q,markerR),x=cue.x,y=cue.y,s=markerR;
        line(x-s,y,x,y-s,col,1.2,.95);line(x,y-s,x+s,y,col,1.2,.95);line(x+s,y,x,y+s,col,1.2,.95);line(x,y+s,x-s,y,col,1.2,.95);
        drawHudMarkerLabel(String(this.wreckagePresentation().markerLabel||'TARGET').toUpperCase(),x,y,s,col)
      }
      return
    }

    if(mode!=='play'||!this.package)return;
    const q=camPoint([this.package.x,this.package.y,this.package.z]),projected=q[2]>.15?projectCam(q):null;
    const on=!!(projected&&projected.x>=0&&projected.x<=W&&projected.y>=0&&projected.y<=viewH);
    const d=Math.max(1,Math.hypot(q[0],q[1],q[2])),growRange=Math.max(40,Number(this.stage?.markerGrowRange)||105);
    const markerR=on?(d>=growRange?10:clamp(10+(growRange-d)*.40,10,46)):14,col=C.y;
    const cue=on?{x:projected.x,y:projected.y}:hudEdgeCue(q,markerR),x=cue.x,y=cue.y,s=markerR;
    line(x-s,y,x,y-s,col,1.2,.95);line(x,y-s,x+s,y,col,1.2,.95);line(x+s,y,x,y+s,col,1.2,.95);line(x,y+s,x-s,y,col,1.2,.95);
    drawHudMarkerLabel('RECOVERY',x,y,s,col,'400 11px Consolas,monospace')
  },
  hudRight(){
    if(!this.active)return'';
    if(this.state==='terminalNav')return'PROCEED TO DATA TERMINAL';
    if(this.state==='terminalApproach')return'AUTOPILOT · DATA TERMINAL';
    if(this.state==='terminalTransfer')return`DATA TRANSFER ${Math.round(clamp(this.terminalTransferT/Math.max(1.6,Number(this.stage?.transferSeconds)||3.2),0,1)*100)}%`;
    if(this.state==='terminalHold')return'DATA TRANSFER COMPLETE';
    if(this.state==='terminalTurn'||this.state==='terminalClear')return'CLEARING RELAY 10';
    if(this.state==='search'&&this.stage?.wreckageSearch){
      const presentation=this.wreckagePresentation();
      if(this.dataFound)return String(this.stage?.foundHud||presentation.foundHud||'DATA RECOVERED').toUpperCase();
      if(this.inspecting)return String(presentation.searchingText||'SEARCHING').toUpperCase();
      const left=this.wrecks.filter(w=>!w.searched).length;
      return`${String(presentation.contactsPrefix||'CONTACTS').toUpperCase()} ${left}`
    }
    if(this.state==='search')return`RECOVERY ${Math.max(0,Math.round(this.distance()))}`;
    if(this.state==='pickup')return this.pickupPhase==='align'?'AUTOPILOT ALIGN':'RECOVERING';return''
  }
};

