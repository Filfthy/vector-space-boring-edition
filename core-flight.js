'use strict';
class FlightController {
  tunnelPlayerClamp(){
 const c=tunnelCenter(1.0);
 let sz;
 if(courier?.isTunnelPhase())sz=courier.playerSectionSize();
 else if(bunkerRaid?.active&&bunkerRaid.bunkerMode&&(phase==='bunkerTunnel'||phase==='bunkerReturn')){
   const p=bunkerRaid.tunnelProgress(),local=phase==='bunkerReturn'?p-1:p+1;sz=bunkerRaid.roomSectionSize(local)
 }else sz={w:trenchWall(),h:tunnelHalfH()};
 const mx=sz.w-.25,my=sz.h-.20;
 shipX=clamp(shipX,c.x-mx,c.x+mx);shipY=clamp(shipY,c.y-my,c.y+my)
}
  updateSteering(dt){
 let kx=0,ky=0;
 if(keys.has('ArrowLeft')||keys.has('KeyA'))kx--;
 if(keys.has('ArrowRight')||keys.has('KeyD'))kx++;
 if(keys.has('ArrowUp')||keys.has('KeyW'))ky--;
 if(keys.has('ArrowDown')||keys.has('KeyS'))ky++;
 if(mode!=='play'||(phase!=='space'&&phase!=='asteroids'&&phase!=='courierMine'&&phase!=='xenoNest')){
   inputX=clamp(inputX+kx*dt*1.38,-1,1);
   inputY=clamp(inputY+ky*dt*1.38,-1,1);
 }
 let magX=Math.sign(inputX)*Math.pow(Math.abs(inputX),1.06);
 let magY=Math.sign(inputY)*Math.pow(Math.abs(inputY),1.08);

 if(mode==='play'&&(phase==='space'||phase==='asteroids'||phase==='courierMine'||phase==='xenoNest')){
   // STAR-WARS-STYLE SCREEN-SPACE TETHER.
   //
   // inputX/inputY ARE the reticle position. Nothing except mouse/keyboard input
   // moves them. The reticle does not spring, auto-centre or get pulled inward
   // when the ship turns. A reticle held near the edge keeps commanding a turn.
   inputX=clamp(inputX+kx*dt*1.20,-1,1);
   inputY=clamp(inputY+ky*dt*1.20,-1,1);

   // Smooth continuous response from the exact centre to the edge.
   // The linear term guarantees that there is no dead spot or derivative jump.
   // The cubic term keeps fine aiming gentle but gives decisive edge turning.
   const tetherCurve=v=>.18*v+.82*v*v*v;
   const sx=tetherCurve(inputX);
   const sy=tetherCurve(inputY);

   // Yaw is deliberately dominant in open-space pursuit. These are explicit
   // angular-rate controls so the tuning panel describes exactly what the craft
   // can do rather than hiding it behind a percentage of an arbitrary constant.
   const targetYawVel=sx*combatTuning.yawRate*Math.PI/180;
   const targetPitchVel=sy*combatTuning.pitchRate*Math.PI/180;

   // Damp ONLY the spacecraft response. The visible reticle remains raw/direct.
   // Exponential following is frame-rate independent and avoids constant-
   // acceleration "steps" when the target turn rate changes.
   const responseScale=tuneScale('playerResponse')*campaign.pilotingResponseMultiplier();
   const yawFollow=1-Math.exp(-dt*8.5*responseScale);
   const pitchFollow=1-Math.exp(-dt*7.4*responseScale);
   spaceYawVel+= (targetYawVel-spaceYawVel)*yawFollow;
   spacePitchVel+=(targetPitchVel-spacePitchVel)*pitchFollow;

   ensureSpaceOrientation();
   // Rotate about the CURRENT camera-up/right axes, not fixed world Euler axes.
   // Therefore left/right remains a real screen-space yaw even after a steep climb
   // or dive; it can never collapse into a roll-only control at the pitch poles.
   const yawStep=spaceYawVel*dt,pitchStep=spacePitchVel*dt;
   if(Math.abs(yawStep)>1e-9){
     spaceForward=rotateAroundAxis(spaceForward,spaceUp,yawStep);
     spaceRight=rotateAroundAxis(spaceRight,spaceUp,yawStep);
   }
   if(Math.abs(pitchStep)>1e-9){
     spaceForward=rotateAroundAxis(spaceForward,spaceRight,pitchStep);
     spaceUp=rotateAroundAxis(spaceUp,spaceRight,pitchStep);
   }
   orthonormaliseSpaceOrientation();
   syncEulerFromSpaceOrientation();

   // Bank is cosmetic only: it follows the fraction of available yaw being used
   // and is capped in degrees. It never contributes to heading/travel direction.
   const yawMax=Math.max(.001,combatTuning.yawRate*Math.PI/180);
   const bankMax=clamp(combatTuning.bankDegrees,0,45)*Math.PI/180;
   const targetRoll=-Math.sign(spaceYawVel)*bankMax*clamp(Math.abs(spaceYawVel)/yawMax,0,1);
   const rollFollow=1-Math.exp(-dt*6.0*Math.max(.05,combatTuning.bankResponse/100));
   viewRoll+=(targetRoll-viewRoll)*rollFollow;
   shipY=lerp(shipY,0,clamp(dt*2.0,0,1));
   return
 }

 if(mode==='play'&&phase==='jackalCity'){
   jackalDelivery.updateSteering(dt,magX,magY);
   return
 }

 if(mode==='play'&&phase==='forest'){
   forest.updateSteering(dt,magX,magY);
   return
 }

 if(mode==='play'&&phase==='destinationApproach'){
   surfaceDestination.updateSteering(dt,magX,magY);
   return
 }

 if(mode==='play'&&phase==='xenoCore'&&xenoNest.active){
   xenoNest.updateCoreSteering(dt,magX,magY);
   return
 }

 if(mode==='play'&&phase==='surface'){
   // Open low-level flight across a genuine X/Z ground plane.
   viewYaw=wrapAngle(viewYaw+magX*dt*1.34);
   viewPitch=lerp(viewPitch,magY*.34,clamp(dt*4.0,0,1));
   viewRoll=lerp(viewRoll,-magX*.48,clamp(dt*4.6,0,1));
   const vx=Math.sin(viewYaw)*SURFACE_SPEED,vz=Math.cos(viewYaw)*SURFACE_SPEED;
   surfaceVX=vx;
   shipX+=vx*dt;
   travel+=vz*dt;
   surfaceDistance+=SURFACE_SPEED*dt;
   const targetY=-1.55-magY*1.30;
   const targetVY=clamp((targetY-shipY)*2.35,-3.0,3.0);
   surfaceVY=moveToward(surfaceVY,targetVY,dt*4.8);
   shipY+=surfaceVY*dt;
   return
 }

 if(phase==='trench'||phase==='reactor'||phase==='escape'||phase==='courierTunnel'||phase==='courierReturn'||phase==='bunkerTunnel'||phase==='bunkerReturn'||mode==='trenchEntry'){
   const c=tunnelCenter(1.2),wall=trenchWall(),halfH=tunnelHalfH();
   const tx=(mode==='trenchEntry'?entryBunkerX:c.x)+magX*(wall-.56);
   const trenchBase=(mode==='trenchEntry'?-1.72:c.y);
   const tty=trenchBase-magY*(halfH-.28);
   shipX=lerp(shipX,tx,clamp(dt*4.5,0,1));
   shipY=lerp(shipY,tty,clamp(dt*4.5,0,1));
   // Courier entry carries the exterior doorway bank across the threshold and
   // levels it progressively over roughly the first couple of seconds. Ordinary
   // tunnel steering remains unchanged once the carried bank has settled.
   if(phase==='courierTunnel'&&Math.abs(viewRoll)>.0005)viewRoll=lerp(viewRoll,0,1-Math.exp(-dt*1.45));
   tunnelPlayerClamp();
 }else{
   const yawMax=.44,pitchMax=.36;
   viewYaw=lerp(viewYaw,magX*yawMax,clamp(dt*5.4,0,1));
   viewPitch=lerp(viewPitch,magY*pitchMax,clamp(dt*5.0,0,1));
   viewRoll=lerp(viewRoll,-magX*.34,clamp(dt*4.7,0,1));
   shipX=lerp(shipX,magX*1.35,clamp(dt*4.2,0,1));
   shipY=lerp(shipY,-magY*1.0,clamp(dt*4.2,0,1));
 }
}
}

