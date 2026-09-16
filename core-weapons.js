'use strict';
class WeaponController {
  autopilotAimLock(){return !!forest?.autopilotActive?.()||!!asteroidWreckRun?.autopilotActive?.()||!!freeTradersDepot?.autopilotActive?.()||mode==='approach'||mode==='exitDoor'||mode==='surfaceExit'||mode==='missionTransit'||mode==='asteroidExit'||mode==='missionExit'||mode==='courierDock'||mode==='courierDelivery'||mode==='courierTurn'||mode==='courierExitZoom'||mode==='osdDelivery'||mode==='jackalPenthouse'||mode==='jackalDelivery'||mode==='jackalExitZoom'||mode==='stationEntry'||mode==='stationInterior'||mode==='stationDeparture'||mode==='stationPad'||mode==='stationPadDeparture'}
  freeAutopilotWeaponAim(){return mode==='trenchEntry'}
  aimScreen(){
 if(autopilotAimLock())return{x:W*.5,y:viewH*.48};
 if(mode==='play'&&(phase==='space'||phase==='asteroids'||phase==='courierMine'||phase==='xenoNest')){
   // Direct tether cursor. At +/-1 the vector reticle is only a small margin
   // from the edge of the playable viewport.
   return{
     x:W*.5+inputX*(W*.5-22),
     y:viewH*.48+inputY*(viewH*.46-18)
   }
 }
 const ax=freeAutopilotWeaponAim()?aimX:inputX;
 const ay=freeAutopilotWeaponAim()?aimY:inputY;
 return{x:W*.5+ax*W*.155,y:viewH*.48+ay*viewH*.155}
}
  shoot(){
 if((mode!=='play'&&mode!=='trenchEntry')||forest?.autopilotActive?.()||asteroidWreckRun?.autopilotActive?.()||freeTradersDepot?.autopilotActive?.()||paused||gateVisible()||campaign.isOpen()||!fullscreenActive()||shotCD>0||laserBurstRemaining<=0)return;
 laserBurstRemaining--;
 shotCD=BASE_LASER_INTERVAL*campaign.laserIntervalMultiplier();
 playerGunKick=.12;
 SoundFX.laser();
 if(campaign.currentMission?.training&&campaign.currentStage?.()?.type==='asteroids')audio.playVoice('tutorialDestroyFive',{once:true,priority:false});
 const a=aimScreen();
 registerPlayerShotThreat(a);
 const gg=gunGeometry(a);
 // One visual pulse-pair is created by the exact same firing event as the laser
 // sound. Keep it alive long enough for the eye to follow it travelling away from
 // the muzzles; hit resolution remains immediate arcade logic.
 shots.push({x:a.x,y:a.y,age:0,dur:.34,pulsePx:16,lx:gg.left.muzzle.x,ly:gg.left.muzzle.y,rx:gg.right.muzzle.x,ry:gg.right.muzzle.y});
 let best=null,bp=null,bd=1e9,isBolt=false,hitPart='body';
 for(const b of bolts){
   if(b.dead)continue;
   const p=boltScreenPoint(b);if(!p)continue;
   const d=Math.hypot(a.x-p.x,a.y-p.y),r=clamp(boltVisualRadius(b,p)*.90+12,34,82);
   if(d<r&&d<bd){best=b;bp=p;bd=d;isBolt=true}
 }
 if(!best){
   if(stationHack?.active&&phase==='space'){
     const mineHit=stationHack.shotCandidate(a,bd);
     if(mineHit&&mineHit.distance<bd){best=mineHit.mine;bp=mineHit.point;bd=mineHit.distance;isBolt=false;hitPart='stationMine'}
   }
   if(asteroidWreckRun?.active){
     const bulkheadHit=asteroidWreckRun.bulkheadShotCandidate(a,bd);
     if(bulkheadHit&&bulkheadHit.distance<bd){best=bulkheadHit.target;bp=bulkheadHit.point;bd=bulkheadHit.distance;isBolt=false;hitPart='wreckBulkhead'}
   }
   for(const aster of asteroids){
     if(aster.dead||aster.dying)continue;
     const p=proj([aster.x,aster.y,aster.z]);if(!p)continue;
     const d=Math.hypot(a.x-p.x,a.y-p.y),r=clamp(aster.s*p.k*1.05,13,104);
     if(d<r&&d<bd){best=aster;bp=p;bd=d;isBolt=false;hitPart='asteroid'}
   }
   if(xenoNest.active&&phase==='xenoNest'){
     for(const egg of xenoNest.brood){
       if(egg.dead||egg.dying||egg.awaitingRecycle)continue;
       const p=proj([egg.x,egg.y,egg.z]);if(!p)continue;
       const d=Math.hypot(a.x-p.x,a.y-p.y),r=clamp(egg.s*p.k*1.05,13,96);
       if(d<r&&d<bd){best=egg;bp=p;bd=d;isBolt=false;hitPart='brood'}
     }
   }
   for(const f of fighters){
     if(f.dead||f.t<0)continue;
     const p=proj([f.x,f.y,f.z]);if(!p)continue;
     const d=Math.hypot(a.x-p.x,a.y-p.y),r=clamp(f.s*p.k*1.0*campaign.weaponAimMultiplier(),15,98);
     if(d<r&&d<bd){best=f;bp=p;bd=d;isBolt=false;hitPart='body'}
   }
   if(forest?.active&&forest.isSwampVariant?.()){
     const spitterHit=forest.spitterShotCandidate(a,bd);
     if(spitterHit&&spitterHit.distance<bd){best=spitterHit.plant;bp=spitterHit.point;bd=spitterHit.distance;isBolt=false;hitPart='swampSpitter'}
   }
   for(const g of groundTargets){
     if(g.dead||g.dying)continue;
     if(g.type==='reactor'&&!g.active)continue;
     if(g.type==='tower'){
       if(g.capDead||g.capDying)continue;
       const p=proj([g.x,towerCapY(g),g.z]);if(!p)continue;
       const d=Math.hypot(a.x-p.x,a.y-p.y),r=clamp(.68*g.s*p.k,12,48);
       if(d<r&&d<bd){best=g;bp=p;bd=d;isBolt=false;hitPart='cap'}
     }else if(g.type==='landgun'){
       if(g.wallMount&&!bunkerRaid.wallGunSupportVisible(g))continue;
       const centre=g.wallMount?bunkerRaid.pivotWorld(g):[g.x,g.y+.38*g.s,g.z],p=proj(centre);if(!p)continue;
       const d=Math.hypot(a.x-p.x,a.y-p.y),r=clamp((g.wallMount?1.22:1.45)*g.s*p.k,16,82);
       if(d<r&&d<bd){best=g;bp=p;bd=d;isBolt=false;hitPart='body'}
     }else{
       let tx,ty;
       if(g.type==='wallgun'){
         const c=tunnelCenter(g.z);tx=c.x+g.side*(trenchWall()-.08);ty=c.y+(g.yOff||0);
       }else{tx=g.x;ty=g.y}
       const p=proj([tx,ty,g.z]);if(!p)continue;
       const d=Math.hypot(a.x-p.x,a.y-p.y),r=clamp(g.s*p.k*(g.type==='wallgun'?.82:1),13,66);
       if(d<r&&d<bd){best=g;bp=p;bd=d;isBolt=false;hitPart='body'}
     }
   }
   for(const h of hazards){
     if(h.dead||h.dying||h.type==='courierGirder')continue;
     syncWorldZ(h);
     const c=tunnelCenter(h.z);
     if(h.bunkerObstacle){
       const vertical=h.axis==='v',p1=vertical?proj([c.x+h.xOff,c.y-tunnelHalfH()*1.03,h.z+.18]):proj([c.x-trenchWall()*1.03,c.y+h.y,h.z+.18]);
       const p2=vertical?proj([c.x+h.xOff,c.y+tunnelHalfH()*1.03,h.z+.18]):proj([c.x+trenchWall()*1.03,c.y+h.y,h.z+.18]);
       if(!p1||!p2)continue;
       const d=pointSegmentDistance(a.x,a.y,p1.x,p1.y,p2.x,p2.y),r=clamp((h.thick||.5)*((p1.k+p2.k)*.5)*.45+5,8,34);
       if(d<r&&d<bd){best=h;bp={x:(p1.x+p2.x)*.5,y:(p1.y+p2.y)*.5};bd=d;isBolt=false;hitPart='hazard'}
       continue
     }
     const yy=c.y+h.y,ww=trenchWall()*1.03;
     const p1=proj([c.x-ww,yy,h.z+.18]),p2=proj([c.x+ww,yy,h.z+.18]);
     if(!p1||!p2)continue;
     const d=pointSegmentDistance(a.x,a.y,p1.x,p1.y,p2.x,p2.y);
     const r=clamp((h.thick||.58)*((p1.k+p2.k)*.5)*.45+5,8,36);
     if(d<r&&d<bd){best=h;bp={x:(p1.x+p2.x)*.5,y:(p1.y+p2.y)*.5};bd=d;isBolt=false;hitPart='hazard'}
   }
   if(mode==='trenchEntry'&&!bunkerDoorOpen){
     const dz=entryBunkerZ();
     const p=proj([entryBunkerX,-2.2,dz]);
     if(p){
       const d=Math.hypot(a.x-p.x,a.y-p.y),r=clamp(1.35*p.k,18,120);
       if(d<r&&d<bd){best={type:'door'};bp=p;bd=d;isBolt=false;hitPart='door'}
     }
   }
 }
 if(jackalDelivery?.active&&phase==='jackalCity'&&jackalDelivery.state==='city'){
   const civilian=jackalDelivery.civilianShotCandidate(a,bd);
   if(civilian&&civilian.distance<bd){best=civilian.vehicle;bp=civilian.point;bd=civilian.distance;isBolt=false;hitPart='civilian'}
 }
 if(!best)return;
 if(isBolt){
   best.dead=true;score+=33;spark(bp.x,bp.y,C.c,12);SoundFX.projectileDestroyed();
   if(typeof tutorialCombat!=='undefined')tutorialCombat.onProjectileDestroyed(best);
   // Remove a shot-down projectile immediately.  Do not leave it in the shared
   // bolt array until a later controller-specific cleanup pass; scripted/tunnel
   // state changes can otherwise preserve stale projectile state unnecessarily.
   const bi=bolts.indexOf(best);if(bi>=0)bolts.splice(bi,1);
   return
 }
 if(hitPart==='stationMine'){stationHack.hitMine(best,bp);return}
 // Debug aid: direct player laser hits become lethal without changing missiles,
 // hostile weapons, objective counts, destruction FX or the normal hit pipeline.
 if(oneShotLasers){
   if(hitPart==='asteroid'&&Number.isFinite(best.hp))best.hp=1;
   else if(hitPart==='door')bunkerDoorHp=1;
   else if(hitPart==='wreckBulkhead')asteroidWreckRun.bulkheadHp=1;
   else if(hitPart==='cap'&&Number.isFinite(best.capHp))best.capHp=1;
   else if(hitPart!=='civilian'&&Number.isFinite(best.hp))best.hp=1
 }
 if(hitPart==='wreckBulkhead'){asteroidWreckRun.hitBulkhead(bp);return}
 if(hitPart==='swampSpitter'){forest.hitSwampSpitter(best,bp);return}
 if(hitPart==='asteroid'){asteroidField.hit(best,bp);return}
 if(hitPart==='brood'){xenoNest.hitBrood(best,bp);return}
 if(hitPart==='civilian'){jackalDelivery.hitCivilian(best,bp);return}
 if(hitPart==='door'){
   if(doorBreachPending>0)return;
   bunkerDoorHp--;doorFlash=HIT_FX_TOTAL;spark(bp.x,bp.y,C.c,8);
   if(bunkerDoorHp<=0)doorBreachPending=.18;else SoundFX.hit();
   return
 }
 if(hitPart==='cap'){
   best.capHp--;best.capHitFx=HIT_FX_TOTAL;spark(bp.x,bp.y,C.c,4);
   if(best.capHp<=0&&!best.capDying){best.capDying=.18;best.capDeathPoint={x:bp.x,y:bp.y}}else if(best.capHp>0)SoundFX.hit();
   return
 }
 if(hitPart==='hazard'){
   best.hp--;best.hitFx=HIT_FX_TOTAL;
   // Bunker girders use geometry flash only. Screen-space spark particles are the
   // wrong coordinate system for a moving tunnel: they stay pinned to the display
   // while the world moves and read as a fuzzy blob hanging in mid-air. Remove any
   // nearby residual generic sparks as well, so an intercepted bolt at the same
   // screen position cannot leave a false 'girder hit' cloud behind.
   if(best.bunkerObstacle){
     for(let i=sparks.length-1;i>=0;i--)if(Math.hypot(sparks[i].x-bp.x,sparks[i].y-bp.y)<96)sparks.splice(i,1)
   }else spark(bp.x,bp.y,C.c,4);
   if(best.hp<=0&&!best.dying){best.dying=.18;best.deathPoint={x:bp.x,y:bp.y}}else if(best.hp>0)SoundFX.hit();
   return
 }
 best.hp--;best.hitFx=HIT_FX_TOTAL;spark(bp.x,bp.y,C.c,4);
 if(best.type==='fighter'){
   if(xenoNest.active&&best.hiveNest)xenoNest.onFighterHit(best);
   else registerFighterHit(best,a,bp)
 }
 if(best.hp<=0)queueObjectDestruction(best,bp);else SoundFX.hit()
}
  gunGeometry(target=aimScreen()){
 const tx=clamp((target.x-W*.5)/(W*.5),-1,1);
 const mountY=viewH*.865;
 const visibleLen=clamp(W*.105,138,188);
 const make=(side)=>{
   // The gimbal itself is outside the camera frame. When the player aims hard
   // across the screen, the opposite-side weapon swings further away and can
   // disappear completely rather than looking bolted to a visible dashboard.
   const away=side<0?Math.max(0,-tx):Math.max(0,tx);
   const pivotX=side<0?(-34-away*150):(W+34+away*150);
   const pivotY=mountY+away*10;
   const dx=target.x-pivotX,dy=target.y-pivotY,n=Math.hypot(dx,dy)||1,ux=dx/n,uy=dy/n,nx=-uy,ny=ux;
   const muzzle={x:pivotX+ux*visibleLen,y:pivotY+uy*visibleLen};
   return{side,pivot:{x:pivotX,y:pivotY},muzzle,ux,uy,nx,ny,away};
 };
 return{left:make(-1),right:make(1)};
}
  drawGun(g){
 const p=g.pivot,m=g.muzzle,nx=g.nx,ny=g.ny,ux=g.ux,uy=g.uy;
 const kick=playerGunKick>0?Math.sin((1-clamp(playerGunKick/.12,0,1))*Math.PI)*12:0;
 // Lean 1980s-vector cannon: all strokes use the same weight. The fixed outer
 // sleeve stays put; only the exposed forward barrel section recoils.
 const sleeveBack={x:p.x+ux*18,y:p.y+uy*18};
 const sleeveFront={x:p.x+ux*66,y:p.y+uy*66};
 const barrelStart={x:sleeveFront.x+ux*2,y:sleeveFront.y+uy*2};
 const barrelFront={x:m.x-ux*kick,y:m.y-uy*kick};
 const sw=8.0,bw=5.0;
 // The cannon is solid hardware. Black-fill both the fixed sleeve and the exposed
 // barrel before drawing their vector edges so world scenery can never show through.
 const fillGunQuad=(a,b,half)=>{
   ctx.save();ctx.fillStyle='#000';ctx.globalAlpha=1;ctx.beginPath();
   ctx.moveTo(a.x+nx*half,a.y+ny*half);ctx.lineTo(b.x+nx*half,b.y+ny*half);
   ctx.lineTo(b.x-nx*half,b.y-ny*half);ctx.lineTo(a.x-nx*half,a.y-ny*half);
   ctx.closePath();ctx.fill();ctx.restore()
 };
 fillGunQuad(sleeveBack,sleeveFront,sw);
 fillGunQuad(barrelStart,barrelFront,bw);
 // Fixed rear sleeve / shroud.
 line(sleeveBack.x+nx*sw,sleeveBack.y+ny*sw,sleeveFront.x+nx*sw,sleeveFront.y+ny*sw,C.c,1,.96);
 line(sleeveBack.x-nx*sw,sleeveBack.y-ny*sw,sleeveFront.x-nx*sw,sleeveFront.y-ny*sw,C.c,1,.96);
 line(sleeveBack.x+nx*sw,sleeveBack.y+ny*sw,sleeveBack.x-nx*sw,sleeveBack.y-ny*sw,C.g,1,.78);
 line(sleeveFront.x+nx*sw,sleeveFront.y+ny*sw,sleeveFront.x-nx*sw,sleeveFront.y-ny*sw,C.w,1,.92);
 // Exposed barrel only: start it at the sleeve mouth so it never shows through
 // the sleeve itself. Recoil shortens the exposed length and pulls the muzzle back.
 line(barrelStart.x+nx*bw,barrelStart.y+ny*bw,barrelFront.x+nx*bw,barrelFront.y+ny*bw,C.w,1,.98);
 line(barrelStart.x-nx*bw,barrelStart.y-ny*bw,barrelFront.x-nx*bw,barrelFront.y-ny*bw,C.c,1,.96);
 // Collars on the exposed barrel make the cycling motion readable.
 for(const u of [.42,.72]){
   const x=lerp(barrelStart.x,barrelFront.x,u),y=lerp(barrelStart.y,barrelFront.y,u),w=6.3;
   line(x+nx*w,y+ny*w,x-nx*w,y-ny*w,u>.6?C.y:C.g,1,.78);
 }
 line(barrelFront.x+nx*6.6,barrelFront.y+ny*6.6,barrelFront.x-nx*6.6,barrelFront.y-ny*6.6,C.y,1,.9);
}
  reticle(){const a=aimScreen(),s=8;line(a.x-s-6,a.y-s,a.x-s,a.y-s,C.y,1.2);line(a.x-s,a.y-s,a.x-s,a.y-s-6,C.y,1.2);line(a.x+s+6,a.y-s,a.x+s,a.y-s,C.y,1.2);line(a.x+s,a.y-s,a.x+s,a.y-s-6,C.y,1.2);line(a.x-s-6,a.y+s,a.x-s,a.y+s,C.y,1.2);line(a.x-s,a.y+s,a.x-s,a.y+s+6,C.y,1.2);line(a.x+s+6,a.y+s,a.x+s,a.y+s,C.y,1.2);line(a.x+s,a.y+s,a.x+s,a.y+s+6,C.y,1.2)}
  pointer(e){
 if(gateVisible()||!fullscreenActive())return;
 const r=canvas.getBoundingClientRect();
 const aimOnly=freeAutopilotWeaponAim();
 const steering=typeof playerReticleSteeringActive==='function'&&playerReticleSteeringActive();

 // The browser pointer and the vector reticle are separate things. Pointer Lock is
 // retained as a full-screen safety measure; only these explicit gameplay states
 // are allowed to move the virtual reticle. Autopilot therefore cannot accidentally
 // steal/release mouse control, and control resumes immediately on the next steerable
 // phase without reacquiring the pointer.
 if(!aimOnly&&!steering)return;

 const playFrac=clamp(viewH/H,.1,1);
 const openSpace=steering&&(phase==='space'||phase==='asteroids'||phase==='courierMine'||phase==='xenoNest');
 const xScale=openSpace?.485:.42,yScale=openSpace?.46:.40;

 if(document.pointerLockElement===canvas){
   const dx=(e.movementX||0)/(Math.max(1,r.width)*xScale);
   const dy=(e.movementY||0)/(Math.max(1,r.height)*playFrac*yScale);
   if(aimOnly){aimX=clamp(aimX+dx,-1,1);aimY=clamp(aimY+dy,-1,1)}
   else{inputX=clamp(inputX+dx,-1,1);inputY=clamp(inputY+dy,-1,1)}
   return
 }

 // Absolute position is only a fallback if the browser has not granted Pointer Lock.
 // It still updates the SAME virtual reticle state rather than making the system
 // cursor itself the reticle.
 const x=clamp((e.clientX-r.left)/r.width,0,1);
 const y=clamp((e.clientY-r.top)/r.height,0,1);
 const vy=clamp(y/playFrac,.02,.98);
 const px=clamp((x-.5)/xScale,-1,1),py=clamp((vy-.48)/yScale,-1,1);
 if(aimOnly){aimX=px;aimY=py}else{inputX=px;inputY=py}
}
}

