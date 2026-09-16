'use strict';
class World {
  constructor(){
    this.fighters=[];
    this.asteroids=[];
    this.groundTargets=[];
    this.bolts=[];
    this.shots=[];
    this.playerMissiles=[];
    this.sparks=[];
    this.fragments=[];
    this.hazards=[];
    this.doorPieces=[];
  }
  relZ(worldZ){return worldZ-travel}
  entryBunkerZ(){return relZ(entryBunkerWorldZ)}
  syncWorldZ(o){if(!Number.isFinite(o.worldZ))o.worldZ=travel+(Number.isFinite(o.z)?o.z:0);o.z=o.worldZ-travel;return o.z}
  forwardSpeed(){
 const bunkerRaidSpeed=bunkerRaid?.interiorForwardSpeed?.();if(Number.isFinite(bunkerRaidSpeed))return bunkerRaidSpeed;
 if(mode==='surfaceExit'){return lerp(FLIGHT_SPEED,148,surfaceExitZoomProgress())}
 if(stationDelivery?.active&&phase==='stationInterior')return stationDelivery.forwardSpeed();
 if(jackalDelivery?.active&&phase==='jackalCity')return jackalDelivery.forwardSpeed();
 if(forest?.active&&phase==='forest')return forest.forwardSpeed();
 if(surfaceDestination?.active&&phase==='destinationApproach')return 0;
 if(courier?.tunnelTravelling())return 10.6;
 if(mode==='trenchEntry'&&!bunkerDoorOpen&&entryBunkerZ()<=3.0)return 0;
 if(mode==='trenchEntry'||mode==='exitDoor')return FLIGHT_SPEED;
 if(mode==='play'&&phase==='surface')return 0;
 if(mode==='play'&&(phase==='trench'||phase==='reactor'||phase==='escape'))return FLIGHT_SPEED;
 return 0;
}
  trenchWall(){const ar=W/Math.max(1,H);const wide=clamp((ar-1.35)/(.4278),0,1);return lerp(1.95,1.68,wide)}
  tunnelHalfH(){return 1.34}
  tunnelCenter(z){
 if(bunkerRaid?.active&&(phase==='bunkerTunnel'||phase==='bunkerReturn'||mode==='bunkerCircuitryPickup'||mode==='bunkerTurn'))return bunkerRaid.tunnelCenter(z);
 if(courier?.isTunnelPhase())return courier.tunnelCenter(z);
 const world=travel+z,local=world-tunnelStartWorld;
 const u=Math.max(0,local-9),gate=ease(clamp(u/18,0,1));
 // Fixed world-space S-curves. The first substantial bend happens long before the reactor,
 // so there is never a straight sightline all the way down the installation.
 const rawX=Math.sin(u*.047)*3.0+Math.sin(u*.091+.55)*1.15;
 const rawY=Math.sin(u*.039+.8)*1.08+Math.sin(u*.074+.15)*.48;
 return{x:tunnelOriginX+rawX*gate,y:-2.2+rawY*gate}
}
  spawnBarrierSet(maxWorldZ=Infinity){
 const gd=clamp((level-1)/4,0,1);
 const pairChance=lerp(.08,.42,gd);
 const count=Math.random()<pairChance?2:1;

 // Four learnable mounting heights remain fixed. Early missions use generous
 // clearances and almost never stack a pair. Higher-value missions progressively
 // restore the denser, tougher gauntlet.
 const levels=[-.90,-.30,.30,.90];
 let lastIndex=-99;
 const base=42+Math.random()*4;
 for(let i=0;i<count;i++){
   const z=base+i*4.1,worldZ=travel+z;
   if(worldZ>=maxWorldZ)continue;
   let idx=(Math.random()*levels.length)|0,guard=0;
   while(Math.abs(idx-lastIndex)<2&&guard++<10)idx=(Math.random()*levels.length)|0;
   lastIndex=idx;
   const armoured=Math.random()<lerp(.08,.34,gd);
   const lightHp=Math.round(lerp(12,16,gd));
   const heavyHp=Math.round(lerp(18,24,gd));
   hazards.push({
     kind:'hbar',worldZ,z,y:levels[idx],levelIndex:idx,thick:.58,
     clearance:lerp(.98,.82,gd),
     hp:armoured?heavyHp:lightHp,maxHp:armoured?heavyHp:lightHp,
     col:armoured?C.y:C.c,hitFx:0,dying:0,dead:false,passed:false
   });
 }
}
  updateBoltsOnly(dt){for(const b of bolts)advanceHostileBolt(b,dt);for(let i=bolts.length-1;i>=0;i--)if(bolts[i].dead)bolts.splice(i,1)}
  updateApproachFighters(dt){
 for(const f of fighters){
   if(f.dead||f.dying||f.t<0)continue;
   f.x+=(f.vx||0)*dt;f.y+=(f.vy||0)*dt;f.z+=(f.vz||-12)*dt;
   f.vz=(f.vz||-12)-dt*2.8;
   f.rot[1]=Math.atan2(-(f.vx||0),-(f.vz||-1));
   f.rot[0]=Math.atan2(f.vy||0,Math.hypot(f.vx||0,f.vz||1));
   f.rot[2]=lerp(f.rot[2]||0,0,clamp(dt*2.5,0,1));
   if(Math.hypot(f.x-shipX,f.z)>130||Math.abs(f.y-shipY)>78)f.dead=true;
 }
}
}

