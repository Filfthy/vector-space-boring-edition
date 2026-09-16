'use strict';
// ---------- gameplay ----------
function say(t,s=.8){
 statusHold=s;
 // During a simulator objective, keep the teaching subtitle pinned and put normal
 // combat/status announcements on the HUD row underneath it.
 if(typeof showTutorialAnnouncement==='function'&&showTutorialAnnouncement(t,s))messageEl.textContent='';
 else messageEl.textContent=t
}
function hud(){if(statusHold<=0)messageEl.textContent=''}
function planetAimAngles(){return mission.planetAimAngles()}
function resetPlanetBearing(){return mission.resetPlanetBearing()}
function reset(opts){return game.reset(opts)}
function killFighter(f,p){
 if(f.id===spaceLockId)releaseSpaceLock();
 if(f.id===spacePursuitId)releaseSpacePursuit();
 spaceAggressorCooldown=Math.min(spaceAggressorCooldown,.28+Math.random()*.32);
 f.dead=true;score+=1000;explodeMesh(f,f.mesh,p,f.col);
 if(typeof salvageRecovery!=='undefined'&&salvageRecovery.active&&salvageRecovery.stage?.useCombatWrecks)salvageRecovery.recordCombatWreck(f);
 if(typeof xenoNest!=='undefined'&&xenoNest.active&&f.hiveNest){xenoNest.onFighterDestroyed(f);return}
 if(mode==='play'&&phase==='space'){
   if(!freezeObjectives)interceptorsDestroyed=Math.min(interceptorGoal,interceptorsDestroyed+1);
   const liveHostiles=fighters.filter(x=>!x.dead&&!x.dying).length;
   const thin=!freezeObjectives&&fighterReservesRemaining()===0&&liveHostiles<=Math.max(2,Math.ceil(activeFighterCap()*.45));
   if(f.bugKind) say(`XENOFORM DOWN · ${interceptorsDestroyed}/${interceptorGoal}`,.42);
   else say(freezeObjectives?'HOSTILE DOWN · OBJECTIVE FROZEN':(thin?'HOSTILE DOWN · GROUP THINNING':'HOSTILE DOWN'),.42);
   if(interceptorsDestroyed>=interceptorGoal&&!freezeObjectives){
     interceptorClearDelay=.72;
     for(const other of fighters)if(!other.dead){other.shotsLeft=0}
   }
 }
}
const MAX_HOSTILE_BOLTS=6;
function spawnBolt(x,y,z,spread=.42,homing=0,hitBoost=0){
 const boltCap=(mode==='play'&&phase==='surface')?8:Math.round(combatTuning.boltCap);
 if(bolts.filter(b=>!b.dead).length>=boltCap)return false;
 const speed=6.25+level*.10+(homing>0?1.05:0),dx=shipX-x,dy=shipY-y,dz=-z,spawnDistance=Math.max(1,Math.hypot(dx,dy,dz));
 const timeToImpact=Math.max(.22,spawnDistance/speed),hitChance=clamp((.24+level*.018+hitBoost)*campaign.enemyHitIntentMultiplier(),.18,.48),hitIntent=Math.random()<hitChance;
 const bearing=Math.atan2(x-shipX,z),sideX=Math.cos(bearing),sideZ=-Math.sin(bearing);
 let side=0,vert=0;
 if(hitIntent){side=(Math.random()-.5)*(.75+spread*.55);vert=(Math.random()-.5)*(.75+spread*.55)}
 else{const miss=3.4+Math.random()*4.8+spread*.55;side=(Math.random()<.5?-1:1)*miss;vert=(Math.random()-.5)*miss*.75}
 const tx=shipX+sideX*side,ty=shipY+vert,tz=sideZ*side;
 bolts.push({
   x,y,z,spawnDistance,targetX:tx,targetY:ty,targetZ:tz,hitIntent,
   vx:(tx-x)/timeToImpact,vy:(ty-y)/timeToImpact,vz:(tz-z)/timeToImpact,
   homing:hitIntent?homing:homing*.42,
   rot:Math.random()*6.28,dead:false,visibleFor:0,visibleNow:false,
   age:0,maxLife:timeToImpact+1.15
 });
 return true
}
function boltApproach(b,p){const remaining=Math.hypot(b.x-shipX,b.y-shipY,b.z);return clamp(1-remaining/Math.max(1,b.spawnDistance||28),0,1)}
function boltVisualRadius(b,p){const grow=Math.pow(boltApproach(b,p),2.0),scale=b.visualScale||1;return lerp(5,b.hitIntent?76:60,grow)*tuneScale('projectileSize')*scale}
function boltScreenPoint(b){
 const p=proj([b.x,b.y,b.z]);if(!p)return null;
 if(b.hitIntent&&!b.swampSpit){
   // Readability exaggeration: hit-bound fire visually settles toward the cockpit centre
   // as it closes, without changing the collision path used for dodging. Swamp spit is
   // a real ballistic lob, so show its true projected arc instead of visually homing it.
   const t=Math.pow(boltApproach(b,p),1.55)*.58;
   p.x=lerp(p.x,W*.5,t);p.y=lerp(p.y,viewH*.48,t)
 }
 return p
}
function updateBoltVisibility(b,dt){
 const p=boltScreenPoint(b);
 if(!p){b.visibleNow=false;return false}
 const r=boltVisualRadius(b,p);
 const onScreen=p.x+r>=0&&p.x-r<=W&&p.y+r>=0&&p.y-r<=viewH;
 b.visibleNow=onScreen;
 if(onScreen)b.visibleFor=(b.visibleFor||0)+dt;else b.visibleFor=0;
 return onScreen
}
function advanceHostileBolt(b,dt){
 if(b.dead)return;
 const boltDt=dt*tuneScale('projectileSpeed');
 b.age=(b.age||0)+boltDt;

 // Surface emplacements fire guided plasma. It bends visibly toward the player's
 // CURRENT position, but the existing on-screen/visible-for rule still prevents
 // invisible unavoidable hits. Miss-intent bolts home at less than half strength.
 if((b.homing||0)>0&&mode==='play'&&phase==='surface'){
   const speed=Math.max(.1,Math.hypot(b.vx,b.vy,b.vz));
   const dx=shipX-b.x,dy=shipY-b.y,dz=-b.z,d=Math.max(.001,Math.hypot(dx,dy,dz));
   const tvx=dx/d*speed,tvy=dy/d*speed,tvz=dz/d*speed;
   const follow=1-Math.exp(-boltDt*b.homing);
   b.vx=lerp(b.vx,tvx,follow);
   b.vy=lerp(b.vy,tvy,follow);
   b.vz=lerp(b.vz,tvz,follow);
 }

 if(Number.isFinite(b.ballisticGravity))b.vy+=b.ballisticGravity*boltDt;
 b.x+=b.vx*boltDt;b.y+=b.vy*boltDt;b.z+=b.vz*boltDt;b.rot+=boltDt*(b.rotSpeed||4.5)*tuneScale('projectileSpin');
 const visible=updateBoltVisibility(b,dt),dist=Math.hypot(b.x-shipX,b.y-shipY,b.z);
 if(dist<1.55){
   if(visible&&(b.visibleFor||0)>=.16/tuneScale('projectileSpeed'))damage(b.damageLabel||'PLASMA HIT');
   b.dead=true;return
 }
 if(b.age>(b.maxLife||8)||Math.hypot(b.x-shipX,b.y-shipY,b.z)>170)b.dead=true
}
function projectileStorm(){const count=Math.round(combatTuning.boltCap);for(let i=0;i<count;i++){const a=i/Math.max(1,count-1);spawnBolt(lerp(-10,10,a)+(Math.random()-.5)*2,(Math.random()-.5)*7,22+Math.random()*20,1.0)}}
function aimScreen(){return weapons.aimScreen()}
function shoot(){return weapons.shoot()}
function spark(x,y,col,n){for(let i=0;i<n;i++){const a=Math.random()*6.28,sp=35+Math.random()*95;sparks.push({x,y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,t:.25+Math.random()*.3,col})}}
function explodeMesh(obj,mesh,p,col){SoundFX.explosion();const mx=obj.mx||1,my=obj.my||1,mz=obj.mz||1;const pts=mesh.v.map(v=>{let q=rotate([v[0]*obj.s*mx,v[1]*obj.s*my,v[2]*obj.s*mz],obj.rot);return proj([q[0]+obj.x,q[1]+obj.y,q[2]+obj.z])});for(const e of mesh.e){const a=pts[e[0]],b=pts[e[1]];if(!a||!b)continue;const mx=(a.x+b.x)/2,my=(a.y+b.y)/2,ang=Math.atan2(my-viewH*.48,mx-W*.5)+(Math.random()-.5)*.7,sp=55+Math.random()*120;fragments.push({x1:a.x,y1:a.y,x2:b.x,y2:b.y,vx:Math.cos(ang)*sp,vy:Math.sin(ang)*sp,t:.5+Math.random()*.35,col})}}
function blowBunkerDoor(){
 const wall=trenchWall(),halfH=tunnelHalfH(),z=entryBunkerZ(),bx=entryBunkerX;
 const d=[proj([bx-wall,-2.15+halfH,z-.1]),proj([bx+wall,-2.15+halfH,z-.1]),proj([bx+wall,-2.15-halfH,z-.1]),proj([bx-wall,-2.15-halfH,z-.1])];
 if(d.some(p=>!p))return;
 const cx=(d[0].x+d[1].x+d[2].x+d[3].x)/4,cy=(d[0].y+d[1].y+d[2].y+d[3].y)/4;
 const polys=[[d[0],d[1],{x:cx,y:cy}],[d[1],d[2],{x:cx,y:cy}],[d[2],d[3],{x:cx,y:cy}],[d[3],d[0],{x:cx,y:cy}]];
 for(let i=0;i<4;i++){
   const poly=polys[i],pcx=poly.reduce((s,p)=>s+p.x,0)/3,pcy=poly.reduce((s,p)=>s+p.y,0)/3;
   const ang=Math.atan2(pcy-cy,pcx-cx)+(i%2?-.12:.12),sp=150+Math.random()*90;
   doorPieces.push({pts:poly.map(p=>({x:p.x-pcx,y:p.y-pcy})),x:pcx,y:pcy,vx:Math.cos(ang)*sp,vy:Math.sin(ang)*sp,vr:(Math.random()-.5)*5.5,rot:0,age:0,dur:.95+Math.random()*.25});
 }
 spark(cx,cy,C.w,18);spark(cx,cy,C.r,14);spark(cx,cy,C.y,10)
}
function damage(msg){return game.damage(msg)}
function beginApproach(){return mission.beginApproach()}
function updateApproachFighters(dt){return world.updateApproachFighters(dt)}
function beginSurface(){return mission.beginSurface()}
function beginTrenchEntry(){return mission.beginTrenchEntry()}
function beginTrench(){return mission.beginTrench()}
function beginReactorApproach(){return mission.beginReactorApproach()}
function beginReactor(){return mission.beginReactor()}
function failReactor(){return mission.failReactor()}
function beginEscape(success=true){return mission.beginEscape(success)}
function beginExitDoor(){return mission.beginExitDoor()}
function beginSurfaceExit(options={}){return mission.beginSurfaceExit(options)}
function finishLaunchToSpace(){return mission.finishLaunchToSpace()}
function victory(){return mission.victory()}

function updateSteering(dt){return flight.updateSteering(dt)}

function spawnBarrierSet(maxWorldZ=Infinity){return world.spawnBarrierSet(maxWorldZ)}

function updateBoltsOnly(dt){return world.updateBoltsOnly(dt)}
function updateEffects(dt){
 doorFlash=Math.max(0,doorFlash-dt);
 if(doorBreachPending>0){doorBreachPending-=dt;if(doorBreachPending<=0)finishDoorBreach()}
 for(const f of fighters){
   f.hitFx=Math.max(0,(f.hitFx||0)-dt);
   if(f.dying){f.dying-=dt;if(f.dying<=0)finaliseObjectDestruction(f)}
 }
 for(const h of hazards){
   h.hitFx=Math.max(0,(h.hitFx||0)-dt);
   if(h.dying){
     h.dying-=dt;
     if(h.dying<=0){
       h.dead=true;score+=h.maxHp>=24?500:300;
       // Bunker girders already communicate impact/destruction through their own
       // geometry flash. A generic screen-space spark burst lingers as a fuzzy blob
       // in the tunnel after the girder has gone, so suppress that death cloud here.
       if(!h.bunkerObstacle){
         const p=h.deathPoint||{x:W*.5,y:viewH*.48};
         spark(p.x,p.y,h.col||C.c,18)
       }
     }
   }
 }
 for(const g of groundTargets){
   g.hitFx=Math.max(0,(g.hitFx||0)-dt);
   g.capHitFx=Math.max(0,(g.capHitFx||0)-dt);
   if(g.capDying){g.capDying-=dt;if(g.capDying<=0)finalisePylon(g)}
   if(g.dying){g.dying-=dt;if(g.dying<=0)finaliseObjectDestruction(g)}
 }
 for(const s of shots)s.age+=dt;for(let i=shots.length-1;i>=0;i--)if(shots[i].age>=shots[i].dur)shots.splice(i,1);for(const s of sparks){s.x+=s.vx*dt;s.y+=s.vy*dt;s.vx*=.95;s.vy*=.95;s.t-=dt}for(let i=sparks.length-1;i>=0;i--)if(sparks[i].t<=0)sparks.splice(i,1);for(const f of fragments){f.x1+=f.vx*dt;f.y1+=f.vy*dt;f.x2+=f.vx*dt;f.y2+=f.vy*dt;f.vx*=.98;f.vy*=.98;f.t-=dt}for(let i=fragments.length-1;i>=0;i--)if(fragments[i].t<=0)fragments.splice(i,1);for(const d of doorPieces){d.age+=dt;d.x+=d.vx*dt;d.y+=d.vy*dt;d.vx*=.985;d.vy*=.985;d.rot+=d.vr*dt}for(let i=doorPieces.length-1;i>=0;i--)if(doorPieces[i].age>=doorPieces[i].dur)doorPieces.splice(i,1);shake*=Math.pow(.03,dt);hud()}

function update(dt){return game.update(dt)}

// ---------- scenery ----------
const STAR_DEPTH=190,STAR_SPAN=430;

// Near-space dust is an arcade velocity cue, not Newtonian debris.
// The drone has a conceptual cruise direction that rapidly damps toward its nose.
// Dust lives in camera-local flight space, so old sideways drift dies quickly.
const SPACE_MOTE_COUNT=96;
let spaceMotes=[];

let spaceRight=[1,0,0],spaceUp=[0,1,0],spaceForward=[0,0,1],spaceOrientationReady=false;
function spaceFreeOrientationActive(){return (mode==='play'&&(phase==='space'||phase==='asteroids'||phase==='courierMine'||phase==='xenoNest'))||(mode==='courierDock'&&phase==='courierMine')||(mode==='stationEntry'&&phase==='space'&&stationDelivery?.docking)||(mode==='recoveryPickup'&&phase==='space')}
function rotateAroundAxis(v,axis,a){
 const u=v3norm(axis),c=Math.cos(a),sn=Math.sin(a),d=v3dot(u,v),cr=v3cross(u,v);
 return[
   v[0]*c+cr[0]*sn+u[0]*d*(1-c),
   v[1]*c+cr[1]*sn+u[1]*d*(1-c),
   v[2]*c+cr[2]*sn+u[2]*d*(1-c)
 ]
}
function resetSpaceOrientationFromEuler(){
 const cy=Math.cos(viewYaw),sy=Math.sin(viewYaw),cp=Math.cos(viewPitch),sp=Math.sin(viewPitch);
 spaceRight=[cy,0,-sy];
 spaceForward=[sy*cp,-sp,cy*cp];
 spaceUp=[sy*sp,cp,cy*sp];
 spaceOrientationReady=true;
 orthonormaliseSpaceOrientation()
}
function ensureSpaceOrientation(){if(!spaceOrientationReady)resetSpaceOrientationFromEuler()}
function orthonormaliseSpaceOrientation(){
 spaceForward=v3norm(spaceForward);
 spaceRight=v3norm(v3cross(spaceUp,spaceForward));
 spaceUp=v3norm(v3cross(spaceForward,spaceRight))
}
function syncEulerFromSpaceOrientation(){
 const h=Math.hypot(spaceForward[0],spaceForward[2]);
 if(h>.0005)viewYaw=wrapAngle(Math.atan2(spaceForward[0],spaceForward[2]));
 viewPitch=Math.atan2(-spaceForward[1],Math.max(.000001,h))
}
function cameraVectorToWorld(v){
 if(spaceFreeOrientationActive()){
   ensureSpaceOrientation();
   // Apply only the visual bank to camera-local X/Y, then map through the true
   // free-flight basis. Forward remains independent of cosmetic roll.
   const q=rz(v,viewRoll);
   return[
     spaceRight[0]*q[0]+spaceUp[0]*q[1]+spaceForward[0]*q[2],
     spaceRight[1]*q[0]+spaceUp[1]*q[1]+spaceForward[1]*q[2],
     spaceRight[2]*q[0]+spaceUp[2]*q[1]+spaceForward[2]*q[2]
   ]
 }
 let q=rz(v,viewRoll);q=rx(q,viewPitch);q=ry(q,viewYaw);return q
}
function cameraVectorToLocal(v){
 if(spaceFreeOrientationActive()){
   ensureSpaceOrientation();
   let q=[v3dot(v,spaceRight),v3dot(v,spaceUp),v3dot(v,spaceForward)];
   return rz(q,-viewRoll)
 }
 let q=ry(v,-viewYaw);q=rx(q,-viewPitch);q=rz(q,-viewRoll);return q
}
function cameraPointToWorld(v){
 const q=cameraVectorToWorld(v);
 return[shipX+q[0],shipY+q[1],q[2]]
}
function resetSpaceMotion(){
 resetSpaceOrientationFromEuler();
 const f=cameraVectorToWorld([0,0,1]);
 spaceMoveX=f[0];spaceMoveY=f[1];spaceMoveZ=f[2];
 resetSpaceMotes()
}
function spawnSpaceMote(m={},initial=false){
 const nearLane=Math.random()<.52;
 const z=initial?(7+Math.random()*150):(78+Math.random()*105);
 const sx=z*(nearLane?.10:.34),sy=z*(nearLane?.075:.21);
 const local=[(Math.random()-.5)*sx*2,(Math.random()-.5)*sy*2,z];
 const world=cameraPointToWorld(local);

 // Each mote is born in front of the CURRENT nose, but from that instant onward it
 // keeps its own short-lived travel direction. A tiny per-mote angular spread stops
 // the whole field following one mechanically identical path.
 const dir=v3norm(cameraVectorToWorld([
   (Math.random()-.5)*.045,
   (Math.random()-.5)*.032,
   1
 ]));

 m.x=world[0];m.y=world[1];m.z=world[2];
 m.dx=dir[0];m.dy=dir[1];m.dz=dir[2];
 m.b=.42+Math.random()*.46;
 m.col=C.x;
 return m
}
function resetSpaceMotes(){
 spaceMotes.length=0;
 for(let i=0;i<SPACE_MOTE_COUNT;i++)spaceMotes.push(spawnSpaceMote({},true))
}
function updateSpaceMotion(dt){
 if(spaceMotes.length!==SPACE_MOTE_COUNT)resetSpaceMotes();

 // Real objects use the rapidly-damped arcade travel vector.
 const f=cameraVectorToWorld([0,0,1]);
 const follow=1-Math.exp(-dt*8.8);
 spaceMoveX=lerp(spaceMoveX,f[0],follow);
 spaceMoveY=lerp(spaceMoveY,f[1],follow);
 spaceMoveZ=lerp(spaceMoveZ,f[2],follow);
 const n=Math.hypot(spaceMoveX,spaceMoveY,spaceMoveZ)||1;
 spaceMoveX/=n;spaceMoveY/=n;spaceMoveZ/=n;

 // Dust has SHORT PER-PARTICLE turn inertia. It is still only a cockpit speed cue,
 // not ship physics: each mote keeps the heading it was given when spawned, while
 // newly spawned motes immediately use the new nose direction. Old-heading motes
 // therefore sweep across the view for a fraction of a second after a turn, then
 // naturally expire and the field settles onto the new heading.
 const dustSpeed=OPEN_SPACE_CRUISE*4.0;
 for(const m of spaceMotes){
   m.x-=m.dx*dustSpeed*dt;
   m.y-=m.dy*dustSpeed*dt;
   m.z-=m.dz*dustSpeed*dt;

   const q=camPoint([m.x,m.y,m.z]);
   const radial=Math.hypot(q[0],q[1]);
   if(q[2]<.7||q[2]>190||radial>138)spawnSpaceMote(m,false)
 }
}
function drawSpaceMotes(){
 for(const m of spaceMotes){
   const q=camPoint([m.x,m.y,m.z]);
   if(q[2]<=.28||q[2]>180)continue;
   const p=projectCam(q);
   if(!p||p.x<-35||p.x>W+35||p.y<-35||p.y>viewH+35)continue;

   // The dense distant dust around the forward vanishing point should be barely
   // visible. As a mote approaches and spreads away from the centre it becomes both
   // brighter and slightly easier to resolve, compensating for the lower density
   // without turning the particles into streaks.
   const proximity=clamp(1-q[2]/170,0,1);
   const brighten=Math.pow(proximity,1.70);
   const variation=.82+.18*clamp((m.b-.42)/.46,0,1);
   const alpha=(.035+.945*brighten)*variation;
   const pointHalf=.28+.62*Math.pow(proximity,.80); // ~0.6 px far, ~1.8 px near

   ctx.strokeStyle=C.x;
   ctx.globalAlpha=alpha;
   ctx.lineWidth=VECTOR_LINE_WIDTH;
   const oldCap=ctx.lineCap;
   ctx.lineCap='round';
   ctx.beginPath();
   ctx.moveTo(p.x-pointHalf,p.y);
   ctx.lineTo(p.x+pointHalf,p.y);
   ctx.stroke();
   ctx.lineCap=oldCap;
 }
 ctx.globalAlpha=1
}

// Wide stars preserve coverage when the player turns almost 180 degrees.
// The additional forward-volume stars prevent the forward axis looking hollow.
const stars=Array.from({length:1900},(_,i)=>{
 const core=i<760;
 return{
   x:(Math.random()-.5)*(core?145:STAR_SPAN),
   y:(Math.random()-.5)*(core?86:240),
   z:(Math.random()-.5)*STAR_DEPTH*2,
   b:.25+Math.random()*.75
 }
});
function starSpeedNow(){
 if(mode==='recoveryPickup')return 0;
 if(typeof xenoNest!=='undefined'&&xenoNest.active&&xenoNest.state==='departure')return lerp(12,225,ease(clamp(xenoNest.departureT/3.15,0,1)))
 if(mode==='abandonExit')return lerp(8,235,ease(clamp(modeT/ABANDON_EXIT_SECONDS,0,1)))
 if(mode==='surfaceExit')return lerp(2,220,surfaceExitZoomProgress())
 if(mode==='jackalExitZoom'&&jackalDelivery?.state==='departure'){
   const z=ease(clamp((jackalDelivery.departureT-SURFACE_EXIT_PITCH_TIME)/SURFACE_EXIT_ZOOM_TIME,0,1));
   // Pitch-up is a camera rotation, not forward acceleration. Hold the world sky
   // stationary until the nose is vertical; star travel begins with the real zoom.
   return z>0?lerp(6,220,z):0
 }
 if(mode==='missionExit')return lerp(8,210,missionEndZoomProgress())
 if(mode==='missionTransit'){
   const t=missionTransit.progress();
   return lerp(3.6,165,ease(t))
 }
 if(mode==='asteroidExit')return lerp(2,185,asteroidExitZoomProgress())
 if(mode==='courierExitZoom')return lerp(5,210,ease(clamp(modeT/2.55,0,1)))
 if(mode==='approach'){return lerp(4,58,planetDescentZoomProgress())}

 // In ordinary play the stars are the fixed sky/reference. Forward travel is shown
 // by real object closure plus the dust optic-flow cue; stars should move only when
 // the camera turns. Only the explicit zoom/transit modes above advance starTravel.
 return 0
}
function drawStars(){return renderer.drawStars()}
function localProj(p){return renderer.localProj(p)}
function sphereLimb(center,R,camPos,projectFn){return renderer.sphereLimb(center,R,camPos,projectFn)}
function drawSphereCurve(gen,steps,center,R,camPos,projectFn,col=C.gd,alpha=.7,width=.75){return renderer.drawSphereCurve(gen,steps,center,R,camPos,projectFn,col,alpha,width)}
function sphereGridPoint(center,R,lat,lon,tilt,spin){return renderer.sphereGridPoint(center,R,lat,lon,tilt,spin)}
function drawSphere(center,R,camPos,projectFn){return renderer.drawSphere(center,R,camPos,projectFn)}
function drawWorldPlanet(){return renderer.drawWorldPlanet()}
function approachSphereState(t){return renderer.approachSphereState(t)}
function drawApproach(){return renderer.drawApproach()}function surfaceMask(floor=-3.5,far=180){
 // Cover the visible ground with a radial fan around the ship. Panels that cross
 // the camera near-plane must be clipped, not discarded: dropping one panel leaves
 // a black-mask hole through which the already-drawn starfield becomes visible.
 const inner=.55,steps=96;
 for(let i=0;i<steps;i++){
   const a1=-Math.PI+i*Math.PI*2/steps,a2=-Math.PI+(i+1)*Math.PI*2/steps;
   const world=[
     [shipX+Math.sin(a1)*inner,floor,Math.cos(a1)*inner],
     [shipX+Math.sin(a2)*inner,floor,Math.cos(a2)*inner],
     [shipX+Math.sin(a2)*far,floor,Math.cos(a2)*far],
     [shipX+Math.sin(a1)*far,floor,Math.cos(a1)*far]
   ];
   const clipped=camera.clipWorldPolyNear(world,.20);
   if(clipped.length>=3)fillPoly(clipped);
 }
}
function drawDistantBunker(z,alpha=.55,bx=0){return renderer.drawDistantBunker(z,alpha,bx)}
function mountainHeight(a,layer=0){return renderer.mountainHeight(a,layer)}
function drawSurfaceHorizon(floor=-3.5,far=178,alpha=1){return renderer.drawSurfaceHorizon(floor,far,alpha)}
function drawSurface(fade=0){return renderer.drawSurface(fade)}
function fillPoly(pts){
 const q=pts.filter(Boolean);
 if(q.length<3)return;
 ctx.fillStyle='#000';
 ctx.beginPath();ctx.moveTo(q[0].x,q[0].y);
 for(let i=1;i<q.length;i++)ctx.lineTo(q[i].x,q[i].y);
 ctx.closePath();ctx.fill();
}
function fillPortalExterior(p1,p2,p3,p4){return renderer.fillPortalExterior(p1,p2,p3,p4)}
function clipPoly(pts,drawFn){return renderer.clipPoly(pts,drawFn)}
function trenchOcclusion(wall,top,floor,near,far){return renderer.trenchOcclusion(wall,top,floor,near,far)}
function tunnelPortalAt(z){return renderer.tunnelPortalAt(z)}
function maskOutsidePortal(p){return renderer.maskOutsidePortal(p)}
function clipTunnelToDepth(z,drawFn){return renderer.clipTunnelToDepth(z,drawFn)}
function tunnelColorsAt(z){return renderer.tunnelColorsAt(z)}
function drawTunnelBoundary(z,col){return renderer.drawTunnelBoundary(z,col)}
function drawTrench(nearOverride=.72,farOverride=54){return renderer.drawTrench(nearOverride,farOverride)}
function drawTrenchEntry(drawBase=true){return renderer.drawTrenchEntry(drawBase)}
function drawReactorApproach(){return renderer.drawReactorApproach()}
function drawReactorExit(){return renderer.drawReactorExit()}
function drawHazard(h){return renderer.drawHazard(h)}
function drawGroundTarget(g){return renderer.drawGroundTarget(g)}
function drawBolt(b){return renderer.drawBolt(b)}

// ---------- minimal cockpit / maximum view ----------
function strokePoly(pts,col=C.c,w=VECTOR_LINE_WIDTH,a=1){ctx.globalAlpha=a;ctx.strokeStyle=col;ctx.lineWidth=VECTOR_LINE_WIDTH;ctx.beginPath();ctx.moveTo(pts[0][0],pts[0][1]);for(let i=1;i<pts.length;i++)ctx.lineTo(pts[i][0],pts[i][1]);ctx.closePath();ctx.stroke();ctx.globalAlpha=1}
function fillScreenPoly(pts){ctx.fillStyle='#000';ctx.beginPath();ctx.moveTo(pts[0][0],pts[0][1]);for(let i=1;i<pts.length;i++)ctx.lineTo(pts[i][0],pts[i][1]);ctx.closePath();ctx.fill()}
function gunGeometry(target=aimScreen()){return weapons.gunGeometry(target)}
function drawGun(g){return weapons.drawGun(g)}
function cockpit(){return renderer.cockpit()}
function reticle(){return weapons.reticle()}
function drawShots(){return renderer.drawShots()}
function drawFX(){return renderer.drawFX()}
function topHud(){return renderer.topHud()}
function idle(){return renderer.idle()}
function hyperspace(){return renderer.hyperspace()}
function drawExitDoorStructure(){return renderer.drawExitDoorStructure()}
function drawExitDoor(){return renderer.drawExitDoor()}

function updateTreeSceneryAudio(){
 const mgr=audio?.treeRush;if(!mgr)return;
 // Ambient free flight deliberately has no object-reactive whoosh/rush audio.
 // In this scene surfaceDestination.trees contains rocks and geological landmarks,
 // so feeding that list into the forest tree-rush synth made rocks audibly 'pass'.
 if(surfaceDestination?.active&&surfaceDestination.freeFlight){mgr.silence(true);return}
 if(paused||gateVisible()||campaign.isOpen()||mode==='dead'||mode==='simulatorCut'){mgr.silence();return}
 let lists=null,speed=0;
 if(forest.active&&phase==='forest'){
   lists=[forest.trees];speed=forest.forwardSpeed()
 }else if(surfaceDestination.active&&phase==='destinationApproach'){
   lists=[surfaceDestination.trees];
   if(surfaceDestination.destination==='forest'&&surfaceDestination.forestFront?.length)lists.push(surfaceDestination.forestFront);
   speed=surfaceDestination.speed
 }else{mgr.silence();return}
 const p=mgr.params,range=Math.max(2,Number(p.range)||12.5),r2=range*range;
 let left=0,right=0,leftPan=0,rightPan=0;
 const scan=list=>{
   if(!list)return;
   for(const t of list){
     if(!t||t.dead)continue;
     const dx=t.x-shipX,dz=t.worldZ-travel;
     if(Math.abs(dx)>range||Math.abs(dz)>range)continue;
     const d2=dx*dx+dz*dz;if(d2>=r2)continue;
     const d=Math.sqrt(d2),near=1-d/range;if(near<=0)continue;
     const q=camPoint([t.x,t.y??shipY,dz]);
     const pan=clamp(q[0]/Math.max(1,range*.60),-1,1);
     const scale=clamp(.72+(Number(t.s)||1)*.12,.78,1.18);
     const w=Math.pow(near,Math.max(.45,Number(p.falloff)||1.85))*scale;
     const lw=w*(1-pan)*.5,rw=w*(1+pan)*.5;
     left+=lw;right+=rw;leftPan+=lw*pan;rightPan+=rw*pan
   }
 };
 for(const list of lists)scan(list);
 const states=[];
 if(left>.002)states.push({level:1-Math.exp(-left*.92),pan:leftPan/left,speed});
 if(right>.002)states.push({level:1-Math.exp(-right*.92),pan:rightPan/right,speed});
 if(states.length===2&&states[0].pan>states[1].pan)states.reverse();
 mgr.update(states)
}

function render(now){updateTreeSceneryAudio();return renderer.render(now)}


function jumpTo(where){return mission.jumpTo(where)}
function skipToNextStage(){return mission.skipToNextStage()}
function toggleCheats(){
 if(!DEV_MODE)return false;
 const opening=!document.body.classList.contains('cheating');
 if(opening){cheatRestorePaused=paused;paused=true;document.body.classList.add('cheating','paused')}
 else{document.body.classList.remove('cheating');paused=cheatRestorePaused;document.body.classList.toggle('paused',paused);if(!paused&&mode!=='idle'&&mode!=='dead')canvas.focus()}
}
cheatPanel.addEventListener('click',e=>{const b=e.target.closest('button[data-jump]');if(b){jumpTo(b.dataset.jump);return}});
const nextStageCheat=document.getElementById('nextStageCheat');
if(nextStageCheat)nextStageCheat.addEventListener('click',()=>skipToNextStage());

const storyMailCheat=document.getElementById('storyMailCheat');
const sendStoryMailCheat=document.getElementById('sendStoryMailCheat');
const storyMailCheatStatus=document.getElementById('storyMailCheatStatus');
function refreshStoryMailCheat(){
  if(!storyMailCheat||!sendStoryMailCheat)return;
  const options=campaign.devStoryMailOptions?.()||[];
  storyMailCheat.innerHTML='';
  for(const item of options){
    const o=document.createElement('option');o.value=item.contractId;o.textContent=item.label;storyMailCheat.appendChild(o)
  }
  const blocked=!!campaign.currentMission||!!campaign.pendingMission||!options.length;
  storyMailCheat.disabled=!options.length;sendStoryMailCheat.disabled=blocked;
  if(storyMailCheatStatus){
    storyMailCheatStatus.textContent=blocked&&options.length
      ?'Finish or abandon the active/prepared mission before resetting a story offer.'
      :'Adds the selected story offer to the VOX inbox for testing.'
  }
}
sendStoryMailCheat?.addEventListener('click',()=>{
  const id=storyMailCheat?.value,result=campaign.devSendStoryMail?.(id);
  if(!result?.ok){
    if(storyMailCheatStatus)storyMailCheatStatus.textContent=result?.reason||'Could not send story mission email.';
    return
  }
  paused=false;cheatRestorePaused=false;document.body.classList.remove('paused','cheating');
  campaign.setPanel('mail');
  last=performance.now()
});
document.getElementById('rain').addEventListener('click',()=>projectileStorm());
document.getElementById('shieldUp').addEventListener('click',()=>{shield=campaign.maxShield();shieldRegenDelay=shieldRegenTick=0;hud()});
document.getElementById('clearBolts').addEventListener('click',()=>{bolts.length=0});
document.getElementById('killAllShips')?.addEventListener('click',()=>{
  const live=fighters.filter(f=>f&&!f.dead);
  if(!live.length){say('NO HOSTILE SHIPS',.45);return}
  for(const f of live){
    if(f.dying)f.dying=0;
    const q=camPoint([f.x,f.y,f.z]),p=q&&q[2]>.18?projectCam(q):null;
    killFighter(f,p||{x:-120,y:-120})
  }
  // For ordinary space-combat stages this is explicitly a skip-the-fight cheat,
  // not merely a way to kill the currently visible wave and wait for reserves.
  if(mode==='play'&&phase==='space'&&!freezeObjectives){
    interceptorsDestroyed=interceptorGoal;
    interceptorClearDelay=.08
  }
  bolts.length=0;
  say('ALL HOSTILE SHIPS DESTROYED',.55)
});
const freezeObjectivesEl=document.getElementById('freezeObjectives');
freezeObjectivesEl.addEventListener('change',()=>{freezeObjectives=freezeObjectivesEl.checked});
document.getElementById('closeCheats').addEventListener('click',()=>toggleCheats());
const tuneInputs=[...cheatPanel.querySelectorAll('input[data-tune]')];
function tuneOutput(input){
 const out=input.parentElement?.querySelector('output'),v=Number(input.value),fmt=input.dataset.format||'plain';
 if(!out)return;
 out.textContent=fmt==='percent'?`${Math.round(v)}%`:fmt==='degrees'?`${Math.round(v)}°`:fmt==='degps'?`${Math.round(v)}°/s`:fmt==='ms'?`${Math.round(v)} ms`:fmt==='seconds'?`${v.toFixed(2)} s`:fmt==='units1'?v.toFixed(1):fmt==='decimal2'?v.toFixed(2):fmt==='hz'?`${Math.round(v)} Hz`:String(Math.round(v));
}
function applyCombatTuneInput(input){
 const key=input.dataset.tune;if(!(key in combatTuning))return;
 combatTuning[key]=Number(input.value);
 if(key==='cruiseSpeed')OPEN_SPACE_CRUISE=combatTuning.cruiseSpeed;
 tuneOutput(input);
}
for(const input of tuneInputs){input.addEventListener('input',()=>applyCombatTuneInput(input));applyCombatTuneInput(input)}
const treeAudioInputs=[...cheatPanel.querySelectorAll('input[data-tree-audio]')];
function applyTreeAudioInput(input){
 const mgr=audio?.treeRush,key=input.dataset.treeAudio;if(!mgr||!key)return;
 const scale=Number(input.dataset.treeScale)||1,value=Number(input.value)/scale;
 mgr.setParam(key,value);tuneOutput(input)
}
for(const input of treeAudioInputs){input.addEventListener('input',()=>applyTreeAudioInput(input));applyTreeAudioInput(input)}
const previewTreeRush=document.getElementById('previewTreeRush');
if(previewTreeRush)previewTreeRush.addEventListener('click',()=>audio?.treeRush?.preview?.());
const hackAudioInputs=[...cheatPanel.querySelectorAll('input[data-hack-audio]')];
function applyHackAudioInput(input){
 const mgr=audio?.hackChirp,key=input.dataset.hackAudio;if(!mgr||!key)return;
 const scale=Number(input.dataset.hackScale)||1,value=Number(input.value)/scale;
 mgr.setParam(key,value);tuneOutput(input)
}
for(const input of hackAudioInputs){input.addEventListener('input',()=>applyHackAudioInput(input));applyHackAudioInput(input)}
const previewHackChirp=document.getElementById('previewHackChirp');
if(previewHackChirp)previewHackChirp.addEventListener('click',()=>audio?.hackChirp?.preview?.());
document.getElementById('resetCombatTuning').addEventListener('click',()=>{
 Object.assign(combatTuning,COMBAT_TUNING_DEFAULTS);
 OPEN_SPACE_CRUISE=combatTuning.cruiseSpeed;
 for(const input of tuneInputs){input.value=String(combatTuning[input.dataset.tune]);tuneOutput(input)}
 audio?.treeRush?.reset?.();
 for(const input of treeAudioInputs){const scale=Number(input.dataset.treeScale)||1,key=input.dataset.treeAudio;if(key in (audio?.treeRush?.params||{}))input.value=String(audio.treeRush.params[key]*scale);tuneOutput(input)}
 audio?.hackChirp?.reset?.();
 for(const input of hackAudioInputs){const scale=Number(input.dataset.hackScale)||1,key=input.dataset.hackAudio;if(key in (audio?.hackChirp?.params||{}))input.value=String(audio.hackChirp.params[key]*scale);tuneOutput(input)}
});
const vectorDepthFadeEl=document.getElementById('vectorDepthFade');
if(vectorDepthFadeEl){vectorDepthFadeEl.checked=VECTOR_DEPTH_FADE;vectorDepthFadeEl.addEventListener('change',()=>{VECTOR_DEPTH_FADE=vectorDepthFadeEl.checked})}
invulnEl.addEventListener('change',()=>{invulnerable=invulnEl.checked});
oneShotLasersEl.addEventListener('change',()=>{oneShotLasers=oneShotLasersEl.checked});
glowSlider.addEventListener('input',()=>applyGlow(glowSlider.value));
if(gateGlowSlider)gateGlowSlider.addEventListener('input',()=>applyGlow(gateGlowSlider.value));
if(campaignGlowSlider)campaignGlowSlider.addEventListener('input',()=>applyGlow(campaignGlowSlider.value));
if(aboutGlowSlider)aboutGlowSlider.addEventListener('input',()=>applyGlow(aboutGlowSlider.value));

class CabinetScrollbar{
  constructor(scroller,track){
    this.scroller=scroller;this.track=track;this.thumb=track?.querySelector('.cabinetScrollThumb');this.drag=null;
    if(!scroller||!track||!this.thumb)return;
    this.update=this.update.bind(this);
    scroller.addEventListener('scroll',this.update,{passive:true});
    track.addEventListener('pointerdown',e=>this.trackPointer(e));
    this.thumb.addEventListener('pointerdown',e=>this.beginDrag(e));
    this.thumb.addEventListener('pointermove',e=>this.dragMove(e));
    this.thumb.addEventListener('pointerup',e=>this.endDrag(e));
    this.thumb.addEventListener('pointercancel',e=>this.endDrag(e));
    if(window.ResizeObserver)new ResizeObserver(this.update).observe(scroller);
    if(window.MutationObserver)new MutationObserver(this.update).observe(scroller,{subtree:true,childList:true,characterData:true,attributes:true});
    requestAnimationFrame(this.update);
  }
  metrics(){
    const max=Math.max(0,this.scroller.scrollHeight-this.scroller.clientHeight),h=this.track.clientHeight-4;
    const thumbH=max<=0?h:Math.max(22,h*(this.scroller.clientHeight/this.scroller.scrollHeight));
    return{max,h,thumbH,travel:Math.max(0,h-thumbH)}
  }
  update(){
    if(!this.thumb)return;const m=this.metrics();this.track.classList.toggle('hidden',m.max<=1);
    const top=m.max>0?(this.scroller.scrollTop/m.max)*m.travel:0;
    this.thumb.style.height=`${Math.round(m.thumbH)}px`;this.thumb.style.transform=`translateY(${Math.round(top)}px)`
  }
  trackPointer(e){
    if(e.target===this.thumb)return;const m=this.metrics();if(m.max<=0)return;
    const r=this.track.getBoundingClientRect(),y=clamp(e.clientY-r.top-2-m.thumbH*.5,0,m.travel);
    this.scroller.scrollTop=m.travel>0?(y/m.travel)*m.max:0
  }
  beginDrag(e){
    e.preventDefault();e.stopPropagation();const m=this.metrics();this.drag={y:e.clientY,scroll:this.scroller.scrollTop,max:m.max,travel:m.travel};
    this.thumb.setPointerCapture(e.pointerId)
  }
  dragMove(e){
    if(!this.drag)return;e.preventDefault();const d=this.drag;if(d.max<=0||d.travel<=0)return;
    this.scroller.scrollTop=clamp(d.scroll+(e.clientY-d.y)*(d.max/d.travel),0,d.max)
  }
  endDrag(e){if(!this.drag)return;this.drag=null;try{this.thumb.releasePointerCapture(e.pointerId)}catch(_){}}
}
campaignScrollbar=new CabinetScrollbar(campaignBodyEl,campaignScrollbarEl);
aboutScrollbar=new CabinetScrollbar(aboutPanelEl,aboutScrollbarEl);
optionsScrollbar=new CabinetScrollbar(optionsPanelEl,optionsScrollbarEl);

// Main terminal DEV tab. This is presentation gating, not a security boundary.
// It appears only when the page was explicitly launched with ?dev=1 (normally by
// the VS Code Agent X — DEV launch configuration). Plain index.html is release UI.
const campaignDevTabBtn=document.getElementById('campaignDevTab');
const campaignDevPanel=document.getElementById('campaignDevPanel');
const openLiveTuningBtn=document.getElementById('openLiveTuning');
if(DEV_MODE){
  if(campaignDevTabBtn)campaignDevTabBtn.hidden=false;
  if(campaignDevPanel)campaignDevPanel.hidden=false;
  refreshStoryMailCheat();
  campaignDevTabBtn?.addEventListener('click',refreshStoryMailCheat);
}else{
  if(campaignDevTabBtn)campaignDevTabBtn.hidden=true;
  if(campaignDevPanel)campaignDevPanel.hidden=true;
}
openLiveTuningBtn?.addEventListener('click',()=>{
  if(!DEV_MODE)return;
  if(campaign.isOpen()){campaign.open=false;campaignShell.classList.remove('open')}else options.close?.();
  toggleCheats()
});

// Data-driven template test launcher. It deliberately uses the real template generator
// and scenario flow, but the DEV completion path leaves campaign economy/progression alone.
const devTemplateSelect=document.getElementById('devTemplateSelect');
const devFactionSelect=document.getElementById('devFactionSelect');
const devForceFollowup=document.getElementById('devForceFollowup');
const devMissionCheat=document.getElementById('devMissionCheat');
const devLaunchTemplate=document.getElementById('devLaunchTemplate');
const devRegenerateTemplate=document.getElementById('devRegenerateTemplate');
const devContractPreview=document.getElementById('devContractPreview');
const devTemplateStatus=document.getElementById('devTemplateStatus');
let devGeneratedMission=null;
const devTemplateLabel=t=>String(t?.name||t?.label||t?.id||'template').replace(/_/g,' ').replace(/\b\w/g,ch=>ch.toUpperCase());
const devRiskText=r=>r>=7?'Extreme':(r>=5?'High':(r>=3?'Moderate':'Routine'));
const renderDevContractPreview=()=>{
  if(!devContractPreview)return;
  const m=devGeneratedMission;
  if(!m){devContractPreview.innerHTML='<div class="catalogEmptyDetail">No job generated.</div>';return}
  const f=campaign.factions?.[m.faction];
  devContractPreview.innerHTML=`<div class="catalogDetailKicker">JOB BOARD PREVIEW</div><h3>${m.title}</h3><div class="missionFaction">${f?.name||m.faction} · Rep ${f?.rep??0} ${f?campaign.repLabel(f.rep):''}</div><div class="catalogDetailDesc">${m.description}</div><div class="missionMeta"><span>Pay <b>CR ${m.pay.toLocaleString()}</b></span><span>XP <b>${m.xp}</b></span><span>Risk <b>${devRiskText(m.risk)} ${m.risk}</b></span></div><div class="stageLine">${m.stages.join(' → ')}</div><div class="missionStatus">Available · DEV preview</div>`
};
const generateDevTemplatePreview=()=>{
  devGeneratedMission=null;
  if(!DEV_MODE||!devTemplateSelect||!devFactionSelect){renderDevContractPreview();return}
  const templateId=devTemplateSelect.value||'',factionId=devFactionSelect.value||'';
  if(!templateId||!factionId){renderDevContractPreview();return}
  devGeneratedMission=campaign.makeDevTemplatePreview(templateId,factionId);
  renderDevContractPreview();
  if(devTemplateStatus)devTemplateStatus.textContent=devGeneratedMission?'':'Could not generate selected template.'
};
const populateDevFactions=()=>{
  if(!DEV_MODE||!devTemplateSelect||!devFactionSelect)return;
  const template=globalThis.AgentXMissionData?.templates?.[devTemplateSelect.value];
  const allowed=Array.isArray(template?.allowedFactions)?template.allowedFactions:Object.keys(template?.presentation||{});
  const ids=allowed.filter(id=>campaign.factions?.[id]&&template?.presentation?.[id]);
  const previous=devFactionSelect.value;devFactionSelect.innerHTML='';
  for(const id of ids){const o=document.createElement('option');o.value=id;o.textContent=campaign.factions[id].name||id;devFactionSelect.appendChild(o)}
  if(ids.includes(previous))devFactionSelect.value=previous;
  if(devTemplateStatus)devTemplateStatus.textContent=ids.length?'':'No supported faction wrapper for this template.';
  generateDevTemplatePreview()
};
const populateDevTemplates=()=>{
  if(!DEV_MODE||!devTemplateSelect)return;
  const templates=Object.values(globalThis.AgentXMissionData?.templates||{}).filter(t=>t&&Array.isArray(t.sections)&&t.sections.length);
  templates.sort((a,b)=>devTemplateLabel(a).localeCompare(devTemplateLabel(b)));
  devTemplateSelect.innerHTML='';
  for(const t of templates){const o=document.createElement('option');o.value=t.id;o.textContent=devTemplateLabel(t);devTemplateSelect.appendChild(o)}
  if(templates.some(t=>t.id==='forest_cabin_delivery'))devTemplateSelect.value='forest_cabin_delivery';
  populateDevFactions()
};
if(DEV_MODE){
  populateDevTemplates();
  devTemplateSelect?.addEventListener('change',populateDevFactions);
  devFactionSelect?.addEventListener('change',generateDevTemplatePreview);
  devRegenerateTemplate?.addEventListener('click',generateDevTemplatePreview);
  devLaunchTemplate?.addEventListener('click',()=>{
    if(campaign.currentMission||campaign.pendingMission){if(devTemplateStatus)devTemplateStatus.textContent='Finish or abandon the active/prepared mission first.';return}
    const templateId=devTemplateSelect?.value||'',factionId=devFactionSelect?.value||'';
    if(!templateId||!factionId||!devGeneratedMission){if(devTemplateStatus)devTemplateStatus.textContent='Generate a template and faction preview first.';return}
    const cheat=!!devMissionCheat?.checked;invulnerable=cheat;oneShotLasers=cheat;
    if(invulnEl)invulnEl.checked=cheat;if(oneShotLasersEl)oneShotLasersEl.checked=cheat;
    const preview=devGeneratedMission;
    const ok=campaign.launchDevTemplateTest(templateId,factionId,{mission:preview,forceFollowUp:!!devForceFollowup?.checked});
    if(!ok){if(devTemplateStatus)devTemplateStatus.textContent='Could not launch previewed template.';return}
    devGeneratedMission=null;
    if(devTemplateStatus)devTemplateStatus.textContent='';
    paused=false;document.body.classList.remove('paused','cheating');last=performance.now();canvas.focus()
  })
}

function pointer(e){return weapons.pointer(e)}
function playerReticleSteeringActive(){
 // This is a GAME-CONTROL decision only. The yellow in-game reticle is virtual
 // state; it is not the browser mouse pointer and must not gain/lose control just
 // because Pointer Lock is held or released.
 if(mode!=='play')return false;
 return phase==='space'||phase==='asteroids'||phase==='courierMine'||phase==='xenoNest'||
        phase==='jackalCity'||phase==='forest'||phase==='destinationApproach'||phase==='xenoCore'||
        phase==='surface'||phase==='trench'||phase==='reactor'||phase==='escape'||
        phase==='courierTunnel'||phase==='courierReturn'||phase==='bunkerTunnel'||phase==='bunkerReturn';
}
function gameplayPointerLockHoldAllowed(){
 // Pointer Lock is a browser/UI guard, not a flight-control state. Keep the real
 // pointer captured throughout active full-screen gameplay — including autopilot,
 // scripted turns, pitch-up and zoom — so moving the mouse cannot expose Chrome's
 // full-screen exit control. Release only when gameplay itself yields to UI/pause.
 return !!gameStarted&&!paused&&!campaign.isOpen()&&!options.isOpen()&&!gateVisible()&&fullscreenActive();
}
function requestFlightPointerLock(_fromMissionLaunch=false){
 if(!gameplayPointerLockHoldAllowed()||document.pointerLockElement===canvas)return;
 try{
   const pending=canvas.requestPointerLock();
   if(pending&&typeof pending.catch==='function')pending.catch(()=>{});
 }catch(_){}
}
function releaseFlightPointerLock(){
 if(document.pointerLockElement!==canvas)return;
 try{document.exitPointerLock()}catch(_){}
}
function syncFlightPointerLock(){
 if(document.pointerLockElement===canvas&&!gameplayPointerLockHoldAllowed())releaseFlightPointerLock();
}
function syncCombatMouseButtons(buttons){
 const left=(buttons&1)!==0,right=(buttons&2)!==0;
 // Pointer Events only guarantee pointerdown for the first button in a chord. Read
 // the buttons bitmask on every pointer event so RMB tracking and LMB firing can be
 // held, pressed and released in either order without suppressing one another.
 if(right&&!spaceLockHeld){spaceLockHeld=true;spaceLockAcquireId=0;spaceLockAcquireT=0;spaceLockAcquireGrace=0}
 else if(!right&&spaceLockHeld){spaceLockHeld=false;spaceLockAcquireId=0;spaceLockAcquireT=0;spaceLockAcquireGrace=0}
 if(left&&!fireHeld){fireHeld=true;beginLaserBurst()}
 else if(!left&&fireHeld){fireHeld=false;endLaserTrigger()}
}
canvas.addEventListener('contextmenu',e=>e.preventDefault());
canvas.addEventListener('auxclick',e=>{if(e.button===1)e.preventDefault()});
canvas.addEventListener('pointermove',e=>{pointer(e);if(!gateVisible()&&!campaign.isOpen()&&!options.isOpen()&&fullscreenActive()&&!surfaceDestination?.freeFlight)syncCombatMouseButtons(e.buttons||0)});
canvas.addEventListener('pointerdown',e=>{
 if(gateVisible()||campaign.isOpen()||options.isOpen()||!fullscreenActive())return;
 const shouldHoldPointer=gameplayPointerLockHoldAllowed();
 if(shouldHoldPointer)requestFlightPointerLock();
 // The click grants/recovers browser Pointer Lock; it does not define the in-game
 // reticle position. Avoid snapping the virtual reticle to clientX/clientY while
 // the lock request is in flight.
 if(!shouldHoldPointer||document.pointerLockElement===canvas)pointer(e);
 canvas.focus();
 if(surfaceDestination?.freeFlight){if(e.button===2)e.preventDefault();return}
 if(e.button===1){e.preventDefault();campaign.useSecondaryFire();syncCombatMouseButtons(e.buttons||0);return}
 if(e.button===2)e.preventDefault();syncCombatMouseButtons(e.buttons||0)
});
window.addEventListener('pointerup',e=>{syncCombatMouseButtons(e.buttons||0)});
canvas.addEventListener('pointerleave',()=>{fireHeld=false;spaceLockHeld=false;spaceLockAcquireId=0;spaceLockAcquireT=0;spaceLockAcquireGrace=0;endLaserTrigger()});
canvas.addEventListener('keydown',e=>{
 if(gateVisible()||campaign.isOpen()||options.isOpen()||!fullscreenActive())return;
 if(surfaceDestination?.active&&surfaceDestination.freeFlight){
   // Boring Edition is intentionally hands-off once launched. Settings live on
   // the fullscreen gate; Escape is left to the browser to leave fullscreen.
   if(e.code!=='Escape')e.preventDefault();return
 }
 if(DEV_MODE&&e.code==='Backquote'){e.preventDefault();toggleCheats();return}
 if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','KeyW','KeyA','KeyS','KeyD'].includes(e.code)){e.preventDefault();keys.add(e.code)}
 if(e.code==='Space'){e.preventDefault();if(!e.repeat)beginLaserBurst()}
});
document.addEventListener('keydown',e=>{
 if(options.isOpen()){if(e.code==='Escape'){e.preventDefault();options.close()}return}
 const equipKey={Digit1:0,Numpad1:0,Digit2:1,Numpad2:1,Digit3:2,Numpad3:2,Digit4:3,Numpad4:3}[e.code];
 if(equipKey!==undefined&&!e.repeat&&campaign.currentMission&&!campaign.isOpen()&&!paused&&fullscreenActive()&&!gateVisible()){e.preventDefault();campaign.useActiveSlot(equipKey);return}
 if(surfaceDestination?.active&&surfaceDestination.freeFlight&&fullscreenActive()&&!gateVisible()){
   // Escape is deliberately left to the browser so it can leave fullscreen and
   // reveal the launch/settings screen. Everything else is ignored.
   if(e.code!=='Escape')e.preventDefault();
   return
 }
 if(e.code==='KeyQ'&&!e.repeat&&!campaign.isOpen()){
   if(campaign.currentMission&&fullscreenActive()&&!gateVisible()){e.preventDefault();beginAbandonHold()}
   return
 }
 if(e.code==='KeyP'&&!e.repeat){e.preventDefault();audio.music.cycleTrack();return}
 if(gateVisible()||!fullscreenActive())return;
 if(DEV_MODE&&e.code==='Backquote'&&document.activeElement!==canvas){e.preventDefault();toggleCheats()}
});
canvas.addEventListener('keyup',e=>{keys.delete(e.code);if(e.code==='Space')endLaserTrigger()});
window.addEventListener('keyup',e=>{if(e.code==='KeyQ')cancelAbandonHold()});
window.addEventListener('blur',()=>cancelAbandonHold());
canvas.addEventListener('blur',()=>{keys.clear();fireHeld=false;spaceLockHeld=false;spaceLockAcquireId=0;spaceLockAcquireT=0;spaceLockAcquireGrace=0;endLaserTrigger()});
// One consistent UI sound for every real button activation. Capture phase keeps
// Options/About buttons audible even when their own handlers stop propagation.
document.addEventListener('click',e=>{
 const button=e.target.closest&&e.target.closest('button');
 if(!button||button.disabled||!e.isTrusted)return;
 SoundFX.uiClick();
},true);

if(optionsOpenGateBtn)optionsOpenGateBtn.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();options.open()});
optionsCloseBtn.addEventListener('click',()=>options.close());
optionsModal.addEventListener('click',e=>{if(e.target===optionsModal)options.close()});
if(aboutOpenBtn)aboutOpenBtn.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();options.close();aboutModal.classList.add('open')});
aboutCloseBtn.addEventListener('click',()=>aboutModal.classList.remove('open'));
aboutModal.addEventListener('click',e=>{if(e.target===aboutModal)aboutModal.classList.remove('open')});
document.querySelectorAll('.campaignTab').forEach(btn=>btn.addEventListener('click',()=>campaign.setPanel(btn.dataset.tab)));
campaignResetBtn.addEventListener('click',()=>{
 if(confirm('Reset Agent X campaign progress, money, XP and reputation?'))campaign.resetCampaign()
});
campaignResumeBtn.addEventListener('click',()=>campaign.hideHub());

const wreckageInvestigationMissionBtn=document.getElementById('wreckageInvestigationMission');
if(wreckageInvestigationMissionBtn)wreckageInvestigationMissionBtn.addEventListener('click',()=>{
  if(campaign.currentMission||campaign.pendingMission){alert('Finish or abandon the active/prepared mission before launching the wreckage investigation.');return}
  campaign.open=false;campaignShell.classList.remove('open');
  options.close?.();
  game.reset({deferMissionStart:true});
  forest.begin({length:650,terminalDestination:'wreckage_recovery'});
  paused=false;document.body.classList.remove('paused','cheating');
  audio.music.setMode('calm');last=performance.now();canvas.focus();
});


function launchAlienSwampRelayTest(terminalDestination){
  if(campaign.currentMission||campaign.pendingMission){alert('Finish or abandon the active/prepared mission before launching a swamp relay test.');return}
  campaign.open=false;campaignShell.classList.remove('open');
  options.close?.();
  game.reset({deferMissionStart:true});
  forest.begin({length:620,variant:'alien_swamp',terminalDestination});
  paused=false;document.body.classList.remove('paused','cheating');
  audio.music.setMode('calm');last=performance.now();canvas.focus();
}

const alienSwampDeliveryMissionBtn=document.getElementById('alienSwampDeliveryMission');
if(alienSwampDeliveryMissionBtn)alienSwampDeliveryMissionBtn.addEventListener('click',()=>launchAlienSwampRelayTest('swamp_relay_delivery'));

const alienSwampConsoleMissionBtn=document.getElementById('alienSwampConsoleMission');
if(alienSwampConsoleMissionBtn)alienSwampConsoleMissionBtn.addEventListener('click',()=>launchAlienSwampRelayTest('swamp_relay_console'));


const xenoNestMissionBtn=document.getElementById('xenoNestMission');
if(xenoNestMissionBtn)xenoNestMissionBtn.addEventListener('click',()=>{
  if(campaign.currentMission){alert('Finish or abandon the active contract before launching the xeno nest mission.');return}
  campaign.open=false;campaignShell.classList.remove('open');
  options.close?.();
  game.reset({deferMissionStart:true});
  xenoNest.begin();
  paused=false;document.body.classList.remove('paused','cheating');
  last=performance.now();canvas.focus();
});

const recoveryTestMissionBtn=document.getElementById('recoveryTestMission');
if(recoveryTestMissionBtn)recoveryTestMissionBtn.addEventListener('click',()=>{
  // Fast isolated pickup test: suspend any prepared campaign contract, place the
  // package close ahead, and enter the normal reusable recovery controller.
  campaign.open=false;campaignShell.classList.remove('open');
  options.close?.();
  game.reset({deferMissionStart:true});
  mission.jumpTo('recovery');
  paused=false;document.body.classList.remove('paused','cheating');
  audio.music.setMode('calm');last=performance.now();canvas.focus();
});


const landGunTestMissionBtn=document.getElementById('landGunTestMission');
if(landGunTestMissionBtn)landGunTestMissionBtn.addEventListener('click',()=>{
  if(campaign.currentMission||campaign.pendingMission){alert('Finish or abandon the active/prepared mission before launching the bunker assault test.');return}
  campaign.open=false;campaignShell.classList.remove('open');
  options.close?.();
  game.reset({deferMissionStart:true});
  landGunTest.begin();
  paused=false;document.body.classList.remove('paused','cheating');
  last=performance.now();canvas.focus();
});

const orangePlanetFreeFlightBtn=document.getElementById('orangePlanetFreeFlight');
if(orangePlanetFreeFlightBtn)orangePlanetFreeFlightBtn.addEventListener('click',()=>{
  if(campaign.currentMission||campaign.pendingMission){alert('Finish or abandon the active/prepared mission before launching orange planet free flight.');return}
  campaign.open=false;campaignShell.classList.remove('open');
  options.close?.();
  game.reset({deferMissionStart:true});
  const stage={environment:'rocky_osd_plains',freeFlight:true};
  surfaceDestination.prepare(stage);
  surfaceDestination.begin(stage);
  paused=false;document.body.classList.remove('paused','cheating');
  audio.music.setMode('calm');last=performance.now();canvas.focus();
});

const boringMusicEl=document.getElementById('boringMusic');
const boringColourEl=document.getElementById('boringColour');
const boringWhiteStarsEl=document.getElementById('boringWhiteStars');
const boringVelocityMinEl=document.getElementById('boringVelocityMin');
const boringVelocityMaxEl=document.getElementById('boringVelocityMax');
const boringVelocityMinValueEl=document.getElementById('boringVelocityMinValue');
const boringVelocityMaxValueEl=document.getElementById('boringVelocityMaxValue');
const boringMusicLevel=Math.max(.01,Number(AudioMixer.ensure()?.volume?.music)||1);

function boringVelocityRange(changed=null){
 let lo=clamp(Number(boringVelocityMinEl?.value)||20,10,80);
 let hi=clamp(Number(boringVelocityMaxEl?.value)||60,10,80);
 const gap=2;
 if(lo>hi-gap){
   if(changed==='min')hi=Math.min(80,lo+gap);
   else lo=Math.max(10,hi-gap)
 }
 if(boringVelocityMinEl)boringVelocityMinEl.value=String(lo);
 if(boringVelocityMaxEl)boringVelocityMaxEl.value=String(hi);
 if(boringVelocityMinValueEl)boringVelocityMinValueEl.value=String(Math.round(lo));
 if(boringVelocityMaxValueEl)boringVelocityMaxValueEl.value=String(Math.round(hi));
 return{min:lo,max:hi}
}
function applyBoringEditionSettings(changedVelocity=null){
 const colour=(boringColourEl?.value||'#ff8000').toLowerCase();
 const velocity=boringVelocityRange(changedVelocity);
 document.documentElement.style.setProperty('--boring-colour',colour);
 if(surfaceDestination?.active&&surfaceDestination.freeFlight){
   surfaceDestination.freeFlightCustomColour=colour;
   surfaceDestination.freeFlightStarsWhite=boringWhiteStarsEl?.checked!==false;
   surfaceDestination.freeFlightSpeedMin=velocity.min;
   surfaceDestination.freeFlightSpeedMax=velocity.max
 }
 AudioMixer.setVolume('music',boringMusicEl?.checked===false?0:boringMusicLevel);
 audio.music.applyMixer()
}
function launchBoringEdition(){
 campaign.open=false;campaignShell.classList.remove('open');
 options.close?.();
 game.reset({deferMissionStart:true});
 const stage={environment:'rocky_osd_plains',freeFlight:true};
 surfaceDestination.prepare(stage);
 surfaceDestination.begin(stage);
 surfaceDestination.freeFlightCustomColour=(boringColourEl?.value||'#ff8000').toLowerCase();
 surfaceDestination.freeFlightStarsWhite=boringWhiteStarsEl?.checked!==false;
 const velocity=boringVelocityRange();
 surfaceDestination.freeFlightSpeedMin=velocity.min;
 surfaceDestination.freeFlightSpeedMax=velocity.max;
 surfaceDestination.freeFlightAutoSpeed=(velocity.min+velocity.max)*.5;
 surfaceDestination.speed=surfaceDestination.freeFlightAutoSpeed;
 paused=false;document.body.classList.remove('paused','cheating');
 audio.music.setMode('calm');applyBoringEditionSettings();
 last=performance.now();canvas.focus()
}
boringMusicEl?.addEventListener('change',()=>applyBoringEditionSettings());
boringColourEl?.addEventListener('input',()=>applyBoringEditionSettings());
boringWhiteStarsEl?.addEventListener('change',()=>applyBoringEditionSettings());
boringVelocityMinEl?.addEventListener('input',()=>applyBoringEditionSettings('min'));
boringVelocityMaxEl?.addEventListener('input',()=>applyBoringEditionSettings('max'));
applyBoringEditionSettings();

enterFullscreenBtn.addEventListener('click',async()=>{
 pendingFullscreenStart=!gameStarted;
 const ok=await requestRequiredFullscreen();
 if(!ok)return;
 // fullscreenchange performs the actual start/resume after the new viewport settles.
});

document.addEventListener('fullscreenchange',()=>{
 const fs=fullscreenActive();

 if(!fs){
   releaseFlightPointerLock();
   pendingFullscreenStart=false;
   keys.clear();fireHeld=false;laserBurstRemaining=0;endLaserTrigger();
   fullscreenRestorePaused=paused;
   fullscreenForcedPause=true;
   paused=true;
   document.body.classList.add('paused');
   showFullscreenGate(gameStarted?'Click here to return to full screen':'Click here for full screen');
   setTimeout(resize,0);
   return;
 }

 hideFullscreenGate();

 if(!gameStarted){
   settleAfterFullscreen(()=>{
     gameStarted=true;
     pendingFullscreenStart=false;
     fullscreenForcedPause=false;
     launchBoringEdition();
   });
 }else{
   settleAfterFullscreen(()=>{
     if(fullscreenForcedPause){
       paused=fullscreenRestorePaused;
       fullscreenForcedPause=false;
       document.body.classList.toggle('paused',paused);
     }
     audio.music.setMode('calm');
     applyBoringEditionSettings();
     if(!paused&&!campaign.isOpen())canvas.focus();
   });
 }
});


showFullscreenGate('Click here for full screen');

// Keep the old phase-query hook useful for development, but only after the user
// has entered fullscreen. It no longer bypasses the required launch screen.
const startupParams=new URLSearchParams(location.search);
const requestedPhase=startupParams.get('autostart')==='1'?startupParams.get('phase'):null;
if(requestedPhase){
 const originalReset=reset;
 reset=function(opts){
   originalReset(opts);
   if(opts?.deferMissionStart)return;
   if(requestedPhase==='approach')beginApproach();
   if(requestedPhase==='surface')beginSurface();
   if(requestedPhase==='trench')beginTrench();
   if(requestedPhase==='reactor'){phase='reactor';beginReactor()}
 };
}

requestAnimationFrame(render);