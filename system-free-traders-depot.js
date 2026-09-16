'use strict';

// Missing Manifest finale: a reusable Free Traders Compact orbital freight depot.
// The depot is deliberately a flat-roofed industrial warehouse rather than a
// terrestrial pitched-roof shed.  Its bird mark is generated at runtime from the
// canonical AgentXNetworkLogos.trade SVG path data, preserving the approved logo
// exactly rather than baking a hand-redrawn approximation into this asset.
function buildFreeTradersFreightDepotMesh(){
  const v=[],e=[],faces=[],edgeColors=[];
  const pushV=p=>{v.push([Number(p[0])||0,Number(p[1])||0,Number(p[2])||0]);return v.length-1};
  const edge=(a,b,col=null)=>{e.push([a,b]);edgeColors.push(col)};
  const addBox=(x0,y0,z0,x1,y1,z1,col=C.y)=>{
    const b=v.length;
    v.push([x0,y0,z0],[x1,y0,z0],[x1,y1,z0],[x0,y1,z0],[x0,y0,z1],[x1,y0,z1],[x1,y1,z1],[x0,y1,z1]);
    [[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]].forEach(p=>edge(b+p[0],b+p[1],col));
    faces.push([b,b+1,b+2,b+3],[b+4,b+7,b+6,b+5],[b,b+4,b+5,b+1],[b+3,b+2,b+6,b+7],[b,b+3,b+7,b+4],[b+1,b+5,b+6,b+2]);
  };
  const addLine=(a,b,col=C.y)=>{const ia=pushV(a),ib=pushV(b);edge(ia,ib,col)};
  const addRect=(x0,y0,x1,y1,z,col=C.y,diag=false)=>{
    const b=v.length;v.push([x0,y0,z],[x1,y0,z],[x1,y1,z],[x0,y1,z]);
    edge(b,b+1,col);edge(b+1,b+2,col);edge(b+2,b+3,col);edge(b+3,b,col);if(diag){edge(b,b+2,col);edge(b+1,b+3,col)}
  };
  const addHexPrismZ=(cx,cy,z0,z1,rx,ry,col=C.w)=>{
    const a=[],b=[];
    for(let i=0;i<6;i++){const t=Math.PI*2*i/6;a.push(pushV([cx+Math.cos(t)*rx,cy+Math.sin(t)*ry,z0]));b.push(pushV([cx+Math.cos(t)*rx,cy+Math.sin(t)*ry,z1]))}
    for(let i=0;i<6;i++){edge(a[i],a[(i+1)%6],col);edge(b[i],b[(i+1)%6],col);edge(a[i],b[i],col);faces.push([a[i],a[(i+1)%6],b[(i+1)%6],b[i]])}
    faces.push([...a].reverse(),b)
  };
  const addBeam=(a,b,half=.035,col=C.y)=>{
    // Axis-aligned service/docking arms in this asset only need compact rectangular
    // solids. Choose the dominant axis and build a thin box around the segment.
    const x0=Math.min(a[0],b[0])-half,x1=Math.max(a[0],b[0])+half;
    const y0=Math.min(a[1],b[1])-half,y1=Math.max(a[1],b[1])+half;
    const z0=Math.min(a[2],b[2])-half,z1=Math.max(a[2],b[2])+half;
    addBox(x0,y0,z0,x1,y1,z1,col)
  };
  const addFreighter=(cx,side)=>{
    // Simple large industrial freighter: hexagonal long body, pointed bow, twin
    // engines.  These are background depot traffic, not combat ships.
    const zFront=-.35,zRear=1.70,ring=[];
    for(let i=0;i<6;i++){const t=Math.PI*2*i/6;ring.push(pushV([cx+Math.cos(t)*.48,-.28+Math.sin(t)*.28,zFront]))}
    const rear=[];for(let i=0;i<6;i++){const t=Math.PI*2*i/6;rear.push(pushV([cx+Math.cos(t)*.48,-.28+Math.sin(t)*.28,zRear]))}
    const nose=pushV([cx,-.28,-1.02]);
    for(let i=0;i<6;i++){
      edge(ring[i],ring[(i+1)%6],C.g);edge(rear[i],rear[(i+1)%6],C.g);edge(ring[i],rear[i],C.g);edge(nose,ring[i],C.g);
      faces.push([ring[i],ring[(i+1)%6],rear[(i+1)%6],rear[i]],[nose,ring[(i+1)%6],ring[i]])
    }
    faces.push([...rear].reverse());
    const engX=.25;
    addBox(cx-engX-.12,-.42,1.69,cx-engX+.12,-.14,2.00,C.c);
    addBox(cx+engX-.12,-.42,1.69,cx+engX+.12,-.14,2.00,C.c);
    // A modest dorsal cargo spine distinguishes them from fighters.
    addBox(cx-.24,-.03,.18,cx+.24,.10,1.25,C.g)
  };

  // Main flat-roofed corrugated freight hall.
  addBox(-2.8,-1.0,-1.60,2.8,.70,1.80,C.y);
  // Broad corrugation on the approach wall, physically interrupted around every
  // loading-bay/window frame, the protected logo fascia and the terminal.  These
  // ribs are wall detail, so they must never read as prison bars across glazing or
  // branded/interactive panels.
  const frontProtected=[
    {x0:-2.28,x1:-1.22,y0:-.86,y1:.04},
    {x0:-.94,x1:.18,y0:-.86,y1:.04},
    {x0:.43,x1:1.53,y0:-.86,y1:.04},
    {x0:-.84,x1:.84,y0:.04,y1:.66},
    {x0:1.80,x1:2.52,y0:-.22,y1:.35}
  ];
  const addFrontCorrugation=x=>{
    let spans=[[-.94,.65]];
    for(const r of frontProtected){
      if(x<r.x0||x>r.x1)continue;
      const next=[];
      for(const [a,b] of spans){
        if(r.y1<=a||r.y0>=b){next.push([a,b]);continue}
        if(r.y0>a+.001)next.push([a,Math.min(b,r.y0)]);
        if(r.y1<b-.001)next.push([Math.max(a,r.y1),b])
      }
      spans=next
    }
    for(const [a,b] of spans)if(b-a>.025)addLine([x,a,-1.615],[x,b,-1.615],C.y)
  };
  for(let x=-2.45;x<=2.46;x+=.35)addFrontCorrugation(x);
  // A few roof seams maintain the warehouse language without a pitched roof.
  for(let z=-1.12;z<=1.32;z+=.61)addLine([-2.72,.715,z],[2.72,.715,z],C.y);

  // Three closed loading-bay frames across the lower frontage.
  const bay=(cx,w=.96,h=.78)=>{
    addRect(cx-w/2,-.82,cx+w/2,-.82+h,-1.635,C.w);
    addRect(cx-w/2+.09,-.73,cx+w/2-.09,-.13,-1.646,C.y);
    addLine([cx,-.73,-1.648],[cx,-.13,-1.648],C.y)
  };
  bay(-1.75,1.02,.82);bay(-.38,1.05,.82);bay(.98,1.02,.82);

  // Protected brand fascia: quiet flat panel, no structure crosses it. The exact
  // canonical Free Traders bird is added below from network-logos.js.
  addBox(-.78,.08,-1.705,.78,.63,-1.615,C.w);

  // Exterior terminal: just the established wall-mounted screen language, not a
  // booth or room. Dynamic pseudo-text is drawn by the controller on this face.
  addBox(1.84,-.18,-1.785,2.48,.31,-1.615,C.w);
  addRect(1.93,-.08,2.39,.21,-1.797,C.c);
  addLine([2.16,-.18,-1.80],[2.16,-.43,-1.66],C.w);

  // Restrained orbital hardware. One low service spine replaces the cluttered
  // overhead girders from the previous audition pass.
  addBox(-1.86,.72,.18,1.86,.91,1.10,C.y);
  for(const x of [-1.20,0,1.20])addLine([x,.715,.18],[x,.915,1.10],C.w);

  // Roof utility tanks, deliberately few and compact.
  addHexPrismZ(-1.58,1.00,.45,1.24,.22,.16,C.w);
  addHexPrismZ(-.98,1.00,.52,1.18,.20,.15,C.w);

  // Small radiator wings — enough to say "orbital infrastructure" without taking
  // over the warehouse silhouette.
  addRect(-2.72,.90,-1.96,1.22,.66,C.c,true);
  addRect(1.96,.90,2.72,1.22,.66,C.c,true);

  // Asymmetric communications mast and two differently aimed dishes.
  addLine([1.55,.91,.70],[1.55,1.82,.70],C.w);
  addLine([1.55,1.34,.70],[1.92,1.51,.58],C.w);
  addRect(1.82,1.40,2.08,1.61,.575,C.c,true);
  addLine([1.55,1.61,.70],[1.31,1.83,.87],C.w);
  addRect(1.17,1.74,1.42,1.94,.875,C.c,true);

  // Real side docking arms physically connect the hall to two docked freighters.
  addBeam([-2.80,-.18,.56],[-3.60,-.18,.56],.065,C.w);
  addBeam([ 2.80,-.18,.72],[ 3.60,-.18,.72],.065,C.w);
  addFreighter(-4.12,-1);addFreighter(4.12,1);

  // Exact canonical Free Traders Compact bird. trade.paths contains only straight
  // SVG M/L/Z commands, so no approximation or resampling is needed: every supplied
  // line segment becomes a model edge with the original aspect ratio intact.
  const logo=globalThis.AgentXNetworkLogos?.trade;
  if(logo?.paths?.length){
    const vb=String(logo.viewBox||'0 0 1 1').trim().split(/[ ,]+/).map(Number),vx=vb[0]||0,vy=vb[1]||0,vw=Math.max(.001,vb[2]||1),vh=Math.max(.001,vb[3]||1);
    const logoHeight=.46,sc=logoHeight/vh,cx=0,cy=.355,cz=-1.718;
    for(const d of logo.paths){
      const tokens=String(d).match(/[MLZmlz]|-?\d+(?:\.\d+)?(?:e[-+]?\d+)?/gi)||[];
      let i=0,cmd='',first=null,prev=null;
      while(i<tokens.length){
        const t=tokens[i++];
        if(/^[MLZ]$/i.test(t)){cmd=t.toUpperCase();if(cmd==='Z'){if(prev!=null&&first!=null&&prev!==first)edge(prev,first,C.w);prev=first;continue}}
        else{i--;}
        if(cmd!=='M'&&cmd!=='L')continue;
        if(i+1>=tokens.length)break;
        const x=Number(tokens[i++]),y=Number(tokens[i++]);if(!Number.isFinite(x)||!Number.isFinite(y))continue;
        const idx=pushV([cx+(x-(vx+vw*.5))*sc,cy-(y-(vy+vh*.5))*sc,cz]);
        if(cmd==='M'){first=idx;prev=idx;cmd='L'}else{if(prev!=null)edge(prev,idx,C.w);prev=idx}
      }
    }
  }

  return{name:'Free Traders Freight Depot — Flat Roof 01',v,e,faces,edgeColors};
}

class FreeTradersDepotController{
  constructor(){this.reset()}
  reset(){
    this.active=false;this.stage=null;this.state='idle';this.t=0;this.stateT=0;this.depot=null;this.mesh=null;
    this.turnRate=0;this.transferT=0;this.dataPackets=[];this.dataSpawnT=0;this.dataDraining=false;
    this.holdT=0;this.turnT=0;this.turnStart=null;this.clearDistance=0;this.navPulse=0
  }
  prepare(stage){this.reset();this.active=true;this.stage=stage||{};this.mesh=buildFreeTradersFreightDepotMesh();return true}
  begin(stage=this.stage){
    if(!this.active||stage!==this.stage)this.prepare(stage);
    this.active=true;this.stage=stage||{};this.state='approach';this.t=0;this.stateT=0;this.navPulse=0;
    mode='play';phase='space';modeT=phaseT=0;
    fighters.length=0;asteroids.length=0;bolts.length=0;groundTargets.length=0;hazards.length=0;shots.length=0;playerMissiles.length=0;
    shipX=shipY=0;inputX=inputY=aimX=aimY=0;spaceYawVel=spacePitchVel=0;viewYaw=viewPitch=viewRoll=0;
    resetPlanetBearing();resetSpaceDogfightDirector();resetSpaceMotion();
    const distance=Math.max(260,Number(this.stage?.spawnDistance)||430);
    const spawnX=Number(this.stage?.spawnX)||0,spawnY=Number.isFinite(Number(this.stage?.spawnY))?Number(this.stage.spawnY):-4;
    const w=cameraPointToWorld([spawnX,spawnY,distance]);
    this.depot={
      x:w[0],y:w[1],z:w[2],s:Math.max(12,Number(this.stage?.scale)||26),
      rot:[Number(this.stage?.pitch)||0,Number(this.stage?.yaw)||.075,Number(this.stage?.roll)||0]
    };
    audio.music.setMode(campaign.currentMission?.musicMode||'calm');
    say(String(this.stage?.startMessage||'FREE TRADERS FREIGHT DEPOT AHEAD').toUpperCase(),.82);return true
  }
  stop(){this.reset()}
  autopilotActive(){return !!(this.active&&['terminalApproach','terminalTransfer','terminalHold','terminalTurn','terminalClear'].includes(this.state))}
  localToWorld(p){
    if(!this.depot||!p)return null;const q=rotate([p[0]*this.depot.s,p[1]*this.depot.s,p[2]*this.depot.s],this.depot.rot);
    return[this.depot.x+q[0],this.depot.y+q[1],this.depot.z+q[2]]
  }
  terminalPoint(){return this.localToWorld([2.16,.065,-1.815])}
  terminalNormal(){return v3norm(rotate([0,0,-1],this.depot?.rot||[0,0,0]))}
  terminalUp(){return v3norm(rotate([0,1,0],this.depot?.rot||[0,0,0]))}
  terminalStopPoint(){
    const p=this.terminalPoint(),n=this.terminalNormal(),d=Math.max(10,Number(this.stage?.terminalStandOff)||15.5);return p?v3add(p,v3scale(n,d)):null
  }
  terminalStagePoint(){
    const p=this.terminalPoint(),n=this.terminalNormal(),d=Math.max(62,Number(this.stage?.terminalStageDistance)||82);return p?v3add(p,v3scale(n,d)):null
  }
  depotNavPoint(){return this.localToWorld([0,0,-2.40])}
  depotMarkerPoint(){return this.localToWorld([0,1.20,-2.40])}
  distanceTo(p){return p?Math.hypot(p[0]-shipX,p[1]-shipY,p[2]):Infinity}
  shiftDepot(delta){if(!this.depot||!delta)return;this.depot.x-=delta[0];this.depot.y-=delta[1];this.depot.z-=delta[2]}
  moveWithPlayer(dt){
    const speed=OPEN_SPACE_CRUISE;this.shiftDepot([spaceMoveX*speed*dt,spaceMoveY*speed*dt,spaceMoveZ*speed*dt])
  }
  alignTo(point,dt,maxRate=1.25){
    if(!point)return Infinity;ensureSpaceOrientation();const desired=v3norm([point[0]-shipX,point[1]-shipY,point[2]]);if(v3len(desired)<.0001)return 0;
    const angle=Math.acos(clamp(v3dot(spaceForward,desired),-1,1));
    if(angle>.0015){let axis=v3cross(spaceForward,desired);if(v3len(axis)<.001)axis=spaceUp;axis=v3norm(axis);const wanted=Math.min(maxRate,Math.max(.14,angle*2.8)),follow=1-Math.exp(-dt*4.8);this.turnRate=lerp(this.turnRate||0,wanted,follow);if(angle<.04)this.turnRate=Math.min(this.turnRate,Math.max(.09,angle*3.7));const turn=Math.min(angle,this.turnRate*dt);spaceForward=rotateAroundAxis(spaceForward,axis,turn);spaceRight=rotateAroundAxis(spaceRight,axis,turn);spaceUp=rotateAroundAxis(spaceUp,axis,turn);orthonormaliseSpaceOrientation();syncEulerFromSpaceOrientation()}else this.turnRate*=Math.exp(-dt*7);
    viewRoll=moveToward(viewRoll,0,dt*3.1);return angle
  }
  beginTerminalApproach(){
    if(!this.active)return false;this.state='terminalApproach';this.stateT=0;this.turnRate=0;inputX=inputY=aimX=aimY=0;spaceYawVel=spacePitchVel=0;
    laserBurstRemaining=0;endLaserTrigger();say('AUTOPILOT · EXTERIOR TERMINAL',.68);return true
  }
  updateTerminalApproach(dt){
    const stop=this.terminalStopPoint(),terminal=this.terminalPoint();if(!stop||!terminal)return;
    const angle=this.alignTo(terminal,dt,1.20),toStop=v3sub(stop,[shipX,shipY,0]),dist=v3len(toStop);
    if(angle<.16&&dist>.20){const speed=dist>38?22:Math.max(3.0,Math.min(10.5,dist*1.35)),step=Math.min(dist,speed*dt);this.shiftDepot(v3scale(toStop,step/Math.max(.001,dist)))}
    if(dist<.48&&angle<.025&&Math.abs(viewRoll)<.025)this.beginTransfer()
  }
  beginTransfer(){
    this.state='terminalTransfer';this.stateT=0;this.transferT=0;this.dataPackets.length=0;this.dataSpawnT=.08;this.dataDraining=false;
    for(let i=0;i<5;i++)this.dataPackets.push(...stationHack.makeDataPacketGroup(true));
    audio?.hackChirp?.start?.();say('TRANSMITTING FLIGHT RECORDER DATA',.78);return true
  }
  updateTransfer(dt){
    this.transferT+=dt;const seconds=Math.max(1.6,Number(this.stage?.transferSeconds)||3.1);
    for(let i=this.dataPackets.length-1;i>=0;i--){const p=this.dataPackets[i];p.u+=p.speed*dt;if(p.u>=1)this.dataPackets.splice(i,1)}
    if(this.transferT>=seconds)this.dataDraining=true;
    if(!this.dataDraining){this.dataSpawnT-=dt;while(this.dataSpawnT<=0&&this.dataPackets.length<18){this.dataPackets.push(...stationHack.makeDataPacketGroup(false));this.dataSpawnT+=.14+Math.random()*.34}}
    if(!this.dataDraining||this.dataPackets.length)return;
    audio?.hackChirp?.stop?.();SoundFX.relayCalibrated?.();audio.playVoice('dataTransferComplete',{once:false,priority:true});
    this.state='terminalHold';this.holdT=0;this.stateT=0
  }
  beginTurn(){
    ensureSpaceOrientation();this.state='terminalTurn';this.turnT=0;this.stateT=0;this.turnStart={f:[...spaceForward],r:[...spaceRight],u:[...spaceUp]};return true
  }
  updateTurn(dt){
    this.turnT+=dt;const seconds=Math.max(1.25,Number(this.stage?.turnSeconds)||1.75),u=clamp(this.turnT/seconds,0,1),q=ease(u),st=this.turnStart;
    if(st){spaceForward=rotateAroundAxis(st.f,st.u,Math.PI*q);spaceRight=rotateAroundAxis(st.r,st.u,Math.PI*q);spaceUp=[...st.u];orthonormaliseSpaceOrientation();syncEulerFromSpaceOrientation();viewRoll=-Math.sin(u*Math.PI)*.08}
    if(u>=1){viewRoll=0;this.state='terminalClear';this.clearDistance=0;this.stateT=0;this.turnStart=null}
  }
  updateClear(dt){
    const speed=OPEN_SPACE_CRUISE,delta=[spaceForward[0]*speed*dt,spaceForward[1]*speed*dt,spaceForward[2]*speed*dt];this.shiftDepot(delta);this.clearDistance+=speed*dt;
    if(this.clearDistance>=Math.max(34,Number(this.stage?.clearDistance)||52)){this.state='complete';SoundFX.objectiveComplete();scenarioFlow.completeCurrentStage()}
  }
  update(dt){
    if(!this.active||mode!=='play')return;this.t+=dt;this.stateT+=dt;this.navPulse+=dt;
    if(this.state==='approach'){
      this.moveWithPlayer(dt);const centre=this.depotNavPoint(),d=this.distanceTo(centre);
      if(d<Math.max(150,Number(this.stage?.depotRevealRadius)||205)){this.state='terminalNav';this.stateT=0;say('PROCEED TO EXTERIOR TERMINAL',.78);SoundFX.objectiveComplete()}
      return
    }
    if(this.state==='terminalNav'){
      this.moveWithPlayer(dt);const stage=this.terminalStagePoint(),centre=this.depotNavPoint(),d=Math.min(this.distanceTo(stage),this.distanceTo(centre));
      if(d<Math.max(58,Number(this.stage?.terminalCaptureRadius)||86))this.beginTerminalApproach();return
    }
    if(this.state==='terminalApproach'){this.updateTerminalApproach(dt);return}
    if(this.state==='terminalTransfer'){this.updateTransfer(dt);return}
    if(this.state==='terminalHold'){this.holdT+=dt;if(this.holdT>.68&&!audio.voicePlaying&&!audio.voiceQueue?.length)this.beginTurn();return}
    if(this.state==='terminalTurn'){this.updateTurn(dt);return}
    if(this.state==='terminalClear'){this.updateClear(dt);return}
  }
  meshDepth(){
    if(!this.depot||!this.mesh?.v?.length)return null;const d=[];
    for(const p of this.mesh.v){const r=rotate([p[0]*this.depot.s,p[1]*this.depot.s,p[2]*this.depot.s],this.depot.rot),q=camPoint([this.depot.x+r[0],this.depot.y+r[1],this.depot.z+r[2]]);if(q[2]>.18)d.push(q[2])}
    if(!d.length)return null;d.sort((a,b)=>a-b);return d[(d.length/2)|0]
  }
  drawTerminalDisplay(){
    if(!this.depot)return;const z=-1.804,left=1.94,right=2.38,bottom=-.07,top=.20;
    stationHack.drawLineDisplay((x,y)=>proj(this.localToWorld([x,y,z])),{left,right,bottom,top,alarm:false,time:this.t})
  }
  drawTransfer(){
    if(this.state!=='terminalTransfer')return;const p=this.terminalPoint();if(!p)return;const target=camPoint(p);if(target&&target[2]>.2)stationHack.drawDataRamp([0,-.62,.82],target,this.dataPackets,{sourceHalf:.88,targetHalf:.34})
  }
  appendScene(scene){
    if(!this.active||!this.depot||this.state==='complete'||!this.mesh)return;const d=this.meshDepth();if(d==null)return;
    scene.push({z:d,draw:()=>{drawMesh(this.depot,this.mesh,C.y,.96);this.drawTerminalDisplay();this.drawTransfer()}})
  }
  markerTarget(){
    // Keep the depot approach label above the roofline.  The canonical Free
    // Traders bird has a protected fascia and should never have HUD copy written
    // across it as the station fills the screen.
    if(this.state==='approach')return{point:this.depotMarkerPoint(),label:'FREIGHT DEPOT',size:13,grow:true,growRange:230,maxSize:23};
    if(this.state==='terminalNav')return{point:this.terminalStagePoint(),label:'TERMINAL',size:13,grow:true,growRange:120,maxSize:22};
    return null
  }
  drawMarker(){
    if(!this.active||mode!=='play'||this.autopilotActive())return;const t=this.markerTarget();if(!t?.point)return;const q=camPoint(t.point);let r=t.size||13;
    if(t.grow&&q[2]>.15){const d=this.distanceTo(t.point),gr=Math.max(20,t.growRange||120),mx=Math.max(r,t.maxSize||22);r=clamp(r+(gr-d)*(mx-r)/gr,r,mx)}
    let p=null,on=false;if(q[2]>.15){p=projectCam(q);on=!!(p&&p.x>=0&&p.x<=W&&p.y>=0&&p.y<=viewH)}if(!on)p=hudEdgeCue(q,r);if(!p)return;
    const col=C.y,x=p.x,y=p.y;line(x-r,y,x,y-r,col,1.2,.96);line(x,y-r,x+r,y,col,1.2,.96);line(x+r,y,x,y+r,col,1.2,.96);line(x,y+r,x-r,y,col,1.2,.96);drawHudMarkerLabel(t.label,x,y,r,col)
  }
  hudLeft(){return this.active?'FREE TRADERS FREIGHT DEPOT':''}
  hudRight(){
    if(!this.active)return'';
    if(this.state==='terminalApproach')return'AUTOPILOT · TERMINAL';
    if(this.state==='terminalTransfer')return`DATA UPLOAD ${Math.round(clamp(this.transferT/Math.max(1.6,Number(this.stage?.transferSeconds)||3.1),0,1)*100)}%`;
    if(this.state==='terminalHold')return'DATA RECEIVED';
    if(this.state==='terminalTurn')return'TURNAROUND';
    if(this.state==='terminalClear')return'CLEARING DEPOT';
    const t=this.markerTarget();return t?.point?`${t.label} ${Math.round(this.distanceTo(t.point))}`:''
  }
}
