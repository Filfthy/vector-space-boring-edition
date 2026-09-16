'use strict';
class SceneRenderer {
  skyStarProj(x,y,z){
    // Stars must behave as an effectively infinite sky. Translate neither by shipX
    // nor shipY: only camera orientation may move them. This removes the layered
    // parallax that became obvious once low-level free-flight started changing
    // altitude over contoured terrain.
    let q=[x,y,z];
    if(spaceFreeOrientationActive()){
      q=[v3dot(q,spaceRight),v3dot(q,spaceUp),v3dot(q,spaceForward)];
      q=rz(q,-viewRoll);
    }else{
      q=ry(q,-viewYaw);
      q=rx(q,-viewPitch);
      q=rz(q,-viewRoll);
    }
    return projectCam(q)
  }
  ambientStarColour(){
    if(surfaceDestination?.active&&surfaceDestination?.freeFlight){
      return surfaceDestination.freeFlightStarsUseWhite?.()?C.w:(surfaceDestination.freeFlightColour?.()||C.w)
    }
    return C.w
  }
  drawStars(){
 let speed=(phase==='space'||phase==='asteroids')?3.6:6.0,trail=.32;
 if(mode==='missionTransit'||mode==='spaceTransfer'){
   const t=mode==='spaceTransfer'?spaceTransfer.progress():missionTransit.progress();
   // SpaceTransfer is a visible acceleration, not an instantaneous cut to long
   // streaks.  Build the canonical forward zoom over the first ~18%, hold it, then
   // ease slightly as the destination is reached.
   const z=mode==='spaceTransfer'
     ? ease(clamp(t/.18,0,1))*(1-ease(clamp((t-.80)/.20,0,1))*.66)
     : ease(clamp((t-.035)/.965,0,1));
   const span=STAR_DEPTH*2,advance=(starTravel+(mode==='spaceTransfer'?t*STAR_DEPTH*7.5:0))%span,cx=W*.5,cy=viewH*.48;
   const f=Math.min(W,viewH)*1.09;
   for(const s of stars){
     let zz=s.z-advance;while(zz<-STAR_DEPTH)zz+=span;while(zz>STAR_DEPTH)zz-=span;
     if(zz<=.25)continue;
     const px=cx+s.x*f/zz,py=cy-s.y*f/zz;
     const dx=px-cx,dy=py-cy,n=Math.hypot(dx,dy)||1;
     // Canonical mission-start zoom: ordinary stars become strong radial streaks.
     const len=lerp(.06,52,z*z)*clamp(1-Math.abs(zz)/STAR_DEPTH,.16,1);
     ctx.strokeStyle=C.w;
     ctx.globalAlpha=s.b*clamp(.30+z*.72,.18,1);
     ctx.lineWidth=VECTOR_LINE_WIDTH;
     ctx.beginPath();
     ctx.moveTo(px-dx/n*len,py-dy/n*len);
     ctx.lineTo(px,py);
     ctx.stroke();
   }
   ctx.globalAlpha=1;return;
 }
 if(mode==='abandonExit'){
   const z=ease(clamp(modeT/ABANDON_EXIT_SECONDS,0,1)),span=STAR_DEPTH*2,advance=starTravel%span,cx=W*.5,cy=viewH*.48,f=Math.min(W,viewH)*1.09;
   for(const s of stars){
     let zz=s.z-advance;while(zz<-STAR_DEPTH)zz+=span;while(zz>STAR_DEPTH)zz-=span;if(zz<=.25)continue;
     const px=cx+s.x*f/zz,py=cy-s.y*f/zz,dx=px-cx,dy=py-cy,n=Math.hypot(dx,dy)||1;
     const len=lerp(2,82,z*z)*clamp(1-Math.abs(zz)/STAR_DEPTH,.18,1);
     ctx.strokeStyle=C.w;ctx.globalAlpha=s.b*clamp(.32+z*.72,.2,1);ctx.lineWidth=VECTOR_LINE_WIDTH;
     ctx.beginPath();ctx.moveTo(px-dx/n*len,py-dy/n*len);ctx.lineTo(px,py);ctx.stroke();
   }
   ctx.globalAlpha=1;return;
 }
 if(xenoNest.active&&xenoNest.state==='departure'){
   const z=xenoNest.departureZoomProgress(),span=STAR_DEPTH*2,advance=(starTravel+z*z*STAR_DEPTH*4.8)%span,cx=W*.5,cy=viewH*.48,f=Math.min(W,viewH)*1.09;
   for(const s of stars){
     let zz=s.z-advance;while(zz<-STAR_DEPTH)zz+=span;while(zz>STAR_DEPTH)zz-=span;if(zz<=.25)continue;
     const px=cx+s.x*f/zz,py=cy-s.y*f/zz,dx=px-cx,dy=py-cy,n=Math.hypot(dx,dy)||1;
     const len=lerp(.5,84,z*z)*clamp(1-Math.abs(zz)/STAR_DEPTH,.18,1);
     ctx.strokeStyle=C.w;ctx.globalAlpha=s.b*clamp(.32+z*.72,.2,1);ctx.lineWidth=VECTOR_LINE_WIDTH;
     ctx.beginPath();if(len>.7){ctx.moveTo(px-dx/n*len,py-dy/n*len);ctx.lineTo(px,py)}else{ctx.moveTo(px-.45,py);ctx.lineTo(px+.45,py)}ctx.stroke();
   }
   ctx.globalAlpha=1;return;
 }
 if(mode==='missionExit'){
   const z=missionEndZoomProgress(),span=STAR_DEPTH*2,advance=starTravel%span,cx=W*.5,cy=viewH*.48,f=Math.min(W,viewH)*1.09;
   for(const s of stars){
     let zz=s.z-advance;while(zz<-STAR_DEPTH)zz+=span;while(zz>STAR_DEPTH)zz-=span;if(zz<=.25)continue;
     const px=cx+s.x*f/zz,py=cy-s.y*f/zz,dx=px-cx,dy=py-cy,n=Math.hypot(dx,dy)||1;
     const len=lerp(2,82,z*z)*clamp(1-Math.abs(zz)/STAR_DEPTH,.18,1);
     ctx.strokeStyle=C.w;ctx.globalAlpha=s.b*clamp(.32+z*.72,.2,1);ctx.lineWidth=VECTOR_LINE_WIDTH;
     ctx.beginPath();ctx.moveTo(px-dx/n*len,py-dy/n*len);ctx.lineTo(px,py);ctx.stroke();
   }
   ctx.globalAlpha=1;return;
 }
 if(mode==='courierExitZoom'){
   // Asteroid-mine delivery ends in the same canonical forward escape language as
   // other space missions: a fixed forward vanishing point and increasingly long
   // radial star streaks, rather than ordinary unstreaked space points.
   const z=ease(clamp(modeT/2.55,0,1)),span=STAR_DEPTH*2,advance=starTravel%span,cx=W*.5,cy=viewH*.48,f=Math.min(W,viewH)*1.09;
   for(const s of stars){
     let zz=s.z-advance;while(zz<-STAR_DEPTH)zz+=span;while(zz>STAR_DEPTH)zz-=span;if(zz<=.25)continue;
     const px=cx+s.x*f/zz,py=cy-s.y*f/zz,dx=px-cx,dy=py-cy,n=Math.hypot(dx,dy)||1;
     const len=lerp(3,88,z*z)*clamp(1-Math.abs(zz)/STAR_DEPTH,.18,1);
     ctx.strokeStyle=C.w;ctx.globalAlpha=s.b*clamp(.34+z*.74,.2,1);ctx.lineWidth=VECTOR_LINE_WIDTH;
     ctx.beginPath();ctx.moveTo(px-dx/n*len,py-dy/n*len);ctx.lineTo(px,py);ctx.stroke();
   }
   ctx.globalAlpha=1;return;
 }
 if(mode==='jackalExitZoom'&&jackalDelivery?.state==='departure'){
   const z=ease(clamp((jackalDelivery.departureT-SURFACE_EXIT_PITCH_TIME)/SURFACE_EXIT_ZOOM_TIME,0,1));
   const blend=ease(clamp(z/.30,0,1)),span=STAR_DEPTH*2,advance=starTravel%span,cx=W*.5,cy=viewH*.48,f=Math.min(W,viewH)*1.09;
   // The city and ground are genuine world geometry, so the surface sky must use
   // that same camera while the drone pitches up. The old departure renderer kept
   // a camera-independent star sheet pinned to the screen; the ground rotated away
   // correctly but the sky did not. Keep the existing world stars through the whole
   // pitch, then cross-fade to the canonical forward radial zoom only after launch.
   let horizonY=viewH+2;
   if(z<.42){
     const hp=proj([shipX,jackalDelivery.groundY??-4.15,360]);
     if(hp)horizonY=clamp(hp.y+3,0,viewH+2)
   }
   ctx.save();
   if(z<.42){ctx.beginPath();ctx.rect(0,0,W,Math.max(0,horizonY));ctx.clip()}
   if(blend<.999){
     for(const s of stars){
       let zz=s.z-advance;while(zz<-STAR_DEPTH)zz+=span;while(zz>STAR_DEPTH)zz-=span;
       const p=this.skyStarProj(s.x,s.y,zz);if(!p||p.y>viewH+20)continue;
       ctx.strokeStyle=C.w;ctx.globalAlpha=s.b*clamp(1-Math.abs(zz)/STAR_DEPTH,.16,1)*(1-blend);ctx.lineWidth=VECTOR_LINE_WIDTH;
       const oldCap=ctx.lineCap;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(p.x-.01,p.y);ctx.lineTo(p.x+.01,p.y);ctx.stroke();ctx.lineCap=oldCap
     }
   }
   if(blend>.001){
     for(const s of stars){
       let zz=s.z-advance;while(zz<-STAR_DEPTH)zz+=span;while(zz>STAR_DEPTH)zz-=span;if(zz<=.25)continue;
       const px=cx+s.x*f/zz,py=cy-s.y*f/zz,dx=px-cx,dy=py-cy,n=Math.hypot(dx,dy)||1;
       const len=lerp(2,92,z)*clamp(1-Math.abs(zz)/STAR_DEPTH,.18,1);
       ctx.strokeStyle=C.w;ctx.globalAlpha=s.b*clamp(.34+z*.72,.2,1)*blend;ctx.lineWidth=VECTOR_LINE_WIDTH;
       ctx.beginPath();ctx.moveTo(px-dx/n*len,py-dy/n*len);ctx.lineTo(px,py);ctx.stroke()
     }
   }
   ctx.restore();ctx.globalAlpha=1;return;
 }
 if(mode==='approach'){
   const e=planetDescentZoomProgress(),span=STAR_DEPTH*2,advance=starTravel%span,cx=W*.5,cy=viewH*.48;
   for(const s of stars){
     let z=s.z-advance;while(z<-STAR_DEPTH)z+=span;while(z>STAR_DEPTH)z-=span;
     const p=this.skyStarProj(s.x,s.y,z);if(!p||p.y>viewH+24)continue;
     const dx=p.x-cx,dy=p.y-cy,n=Math.hypot(dx,dy)||1;
     const len=lerp(1.2,50,e*e)*clamp(1-Math.abs(z)/STAR_DEPTH,.16,1);
     ctx.strokeStyle=C.w;ctx.globalAlpha=s.b*clamp(.30+e*.68,.18,1);ctx.lineWidth=VECTOR_LINE_WIDTH;
     ctx.beginPath();ctx.moveTo(p.x-dx/n*len,p.y-dy/n*len);ctx.lineTo(p.x,p.y);ctx.stroke();
   }
   ctx.globalAlpha=1;return;
 }
 if(mode==='asteroidExit'){const z=asteroidExitZoomProgress();speed=lerp(2,185,z);trail=z>0?lerp(.5,22,z):.12}
 if(mode==='surfaceExit'){const z=surfaceExitZoomProgress();speed=lerp(2,220,z);trail=z>0?lerp(.5,28,z):.12}
 if(mode==='approach'){const e=planetDescentZoomProgress();speed=lerp(4,58,e);trail=lerp(.55,13.5,e)}
 if(mode==='asteroidExit'&&asteroidExitZoomProgress()>0){
   const e=asteroidExitZoomProgress(),span=STAR_DEPTH*2,advance=starTravel%span,cx=W*.5,cy=viewH*.48;
   for(const s of stars){
     let z=s.z-advance;while(z<-STAR_DEPTH)z+=span;while(z>STAR_DEPTH)z-=span;
     // During extraction, ignore camera rotation for the star projection itself.
     // The cockpit/field can pitch out, but the high-speed starfield has one exact
     // forward vanishing point, so every streak travels dead radially toward the viewer.
     if(z<=.25)continue;
     const f=Math.min(W,viewH)*1.09;
     const px=cx+s.x*f/z,py=cy-s.y*f/z;
     const dx=px-cx,dy=py-cy,n=Math.hypot(dx,dy)||1;
     const len=lerp(3,68,e)*clamp(1-Math.abs(z)/STAR_DEPTH,.18,1);
     ctx.strokeStyle=C.w;ctx.globalAlpha=s.b*clamp(.34+e*.76,.2,1);ctx.lineWidth=VECTOR_LINE_WIDTH;
     ctx.beginPath();ctx.moveTo(px-dx/n*len,py-dy/n*len);ctx.lineTo(px,py);ctx.stroke();
   }
   ctx.globalAlpha=1;return;
 }
 if(mode==='surfaceExit'){
   const pitch=surfaceExitPitchProgress(),e=surfaceExitZoomProgress(),blend=ease(clamp(e/.32,0,1));
   const span=STAR_DEPTH*2,advance=starTravel%span,cx=W*.5,cy=viewH*.48,f=Math.min(W,viewH)*1.09;
   // Until acceleration begins, keep using the exact same camera-projected stars
   // that were visible on the planet. This avoids the old instant swap to a denser
   // forward star volume. Over the first part of the zoom, cross-fade those same
   // stars into the radial space projection instead of replacing them in one frame.
   let horizonY=viewH+2;
   if(e<.42){
     const floor=mission.surfaceExitScene==='city'?(jackalDelivery?.groundY??-4.15):-3.5;
     const hp=proj([shipX,floor,360]);
     if(hp)horizonY=clamp(hp.y+3,0,viewH+2)
   }
   ctx.save();
   if(e<.42){ctx.beginPath();ctx.rect(0,0,W,Math.max(0,horizonY));ctx.clip()}
   if(blend<.999){
     for(const s of stars){
       let z=s.z-advance;while(z<-STAR_DEPTH)z+=span;while(z>STAR_DEPTH)z-=span;
       const p=this.skyStarProj(s.x,s.y,z);if(!p||p.y>viewH+20)continue;
       ctx.strokeStyle=C.w;ctx.globalAlpha=s.b*clamp(1-Math.abs(z)/STAR_DEPTH,.16,1)*(1-blend);
       ctx.lineWidth=VECTOR_LINE_WIDTH;const oldCap=ctx.lineCap;ctx.lineCap='round';
       ctx.beginPath();ctx.moveTo(p.x-.01,p.y);ctx.lineTo(p.x+.01,p.y);ctx.stroke();ctx.lineCap=oldCap
     }
   }
   if(blend>.001){
     for(const s of stars){
       let z=s.z-advance;while(z<-STAR_DEPTH)z+=span;while(z>STAR_DEPTH)z-=span;if(z<=.25)continue;
       const px=cx+s.x*f/z,py=cy-s.y*f/z,dx=px-cx,dy=py-cy,n=Math.hypot(dx,dy)||1;
       const len=lerp(2,78,e)*clamp(1-Math.abs(z)/STAR_DEPTH,.18,1);
       ctx.strokeStyle=C.w;ctx.globalAlpha=s.b*clamp(.34+e*.70,.20,1)*blend;ctx.lineWidth=VECTOR_LINE_WIDTH;
       ctx.beginPath();ctx.moveTo(px-dx/n*len,py-dy/n*len);ctx.lineTo(px,py);ctx.stroke()
     }
   }
   ctx.restore();ctx.globalAlpha=1;return;
 }
 const span=STAR_DEPTH*2,advance=starTravel%span;
 const ambientMode=!!(surfaceDestination?.active&&surfaceDestination?.freeFlight&&phase==='destinationApproach');
 const starCol=this.ambientStarColour();
 for(const s of stars){
   let z=s.z-advance;while(z<-STAR_DEPTH)z+=span;while(z>STAR_DEPTH)z-=span;
   const p=this.skyStarProj(s.x,s.y,z);if(!p||p.y>viewH+20)continue;

   // Ambient free-flight uses stylised full-value vector points rather than a
   // realistic spread of faint magnitudes.
   ctx.strokeStyle=starCol;
   ctx.globalAlpha=ambientMode?1:(s.b*clamp(1-Math.abs(z)/STAR_DEPTH,.16,1));
   ctx.lineWidth=VECTOR_LINE_WIDTH;
   const oldCap=ctx.lineCap;
   ctx.lineCap='round';
   ctx.beginPath();
   const half=ambientMode?.33:.01;
   ctx.moveTo(p.x-half,p.y);
   ctx.lineTo(p.x+half,p.y);
   ctx.stroke();
   ctx.lineCap=oldCap;
 }
 ctx.globalAlpha=1
}
  localProj(p){
 if(p[2]<=.12)return null;
 const f=Math.min(W,viewH)*1.09;
 return{x:W*.5+p[0]*f/p[2],y:viewH*.48-p[1]*f/p[2],z:p[2],k:f/p[2]};
}
  sphereLimb(center,R,camPos,projectFn){
 const cv=v3sub(camPos,center),d=v3len(cv);
 if(d<=R+.001)return[];
 const n=v3scale(cv,1/d);
 const q=v3add(center,v3scale(cv,(R*R)/(d*d)));
 const lr=R*Math.sqrt(Math.max(0,1-(R*R)/(d*d)));
 let u=[1,0,0];
 if(Math.abs(v3dot(u,n))>.94)u=[0,1,0];
 u=v3norm(v3sub(u,v3scale(n,v3dot(u,n))));
 const v=v3norm(v3cross(n,u));
 const pts=[];
 for(let i=0;i<=180;i++){
   const a=i*Math.PI*2/180;
   const p=v3add(q,v3add(v3scale(u,Math.cos(a)*lr),v3scale(v,Math.sin(a)*lr)));
   const sp=projectFn(p);
   if(sp)pts.push(sp);
 }
 return pts;
}
  drawSphereCurve(gen,steps,center,R,camPos,projectFn,col=C.gd,alpha=.7,width=.75){
 let prev=null,prevVis=0,prevSP=null;
 for(let i=0;i<=steps;i++){
   const p=gen(i/steps);
   const normal=v3sub(p,center);
   const vis=v3dot(normal,v3sub(camPos,p));
   const sp=projectFn(p);
   if(prev&&sp&&prevSP){
     if(vis>0&&prevVis>0)line(prevSP.x,prevSP.y,sp.x,sp.y,col,width,alpha);
     else if((vis>0)!=(prevVis>0)){
       const k=prevVis/(prevVis-vis);
       let q=[
         lerp(prev[0],p[0],k),
         lerp(prev[1],p[1],k),
         lerp(prev[2],p[2],k)
       ];
       q=v3add(center,v3scale(v3norm(v3sub(q,center)),R));
       const qp=projectFn(q);
       if(qp){
         if(prevVis>0)line(prevSP.x,prevSP.y,qp.x,qp.y,col,width,alpha);
         else line(qp.x,qp.y,sp.x,sp.y,col,width,alpha);
       }
     }
   }
   prev=p;prevVis=vis;prevSP=sp;
 }
}
  sphereGridPoint(center,R,lat,lon,tilt,spin){
 const lo=lon+spin,cl=Math.cos(lat);
 let p=[R*cl*Math.sin(lo),R*Math.sin(lat),-R*cl*Math.cos(lo)];
 // Spin around the planet's own axis first, then tilt that axis in screen/world space.
 p=rz(p,tilt);
 return[center[0]+p[0],center[1]+p[1],center[2]+p[2]];
}
  drawCelestialSphere(center,R,camPos,projectFn,{col=C.g,tilt=0,spin=0,lats=null,lonCount=6,gridAlpha=.66,limbAlpha=.92,width=.82}={}){
 const limb=sphereLimb(center,R,camPos,projectFn);
 // Invisible black body is geometry/occlusion, not a colour fill in the artwork.
 if(limb.length>2){
   ctx.fillStyle='#000';ctx.beginPath();ctx.moveTo(limb[0].x,limb[0].y);
   for(let i=1;i<limb.length;i++)ctx.lineTo(limb[i].x,limb[i].y);
   ctx.closePath();ctx.fill();ctx.strokeStyle=col;ctx.globalAlpha=limbAlpha;ctx.lineWidth=VECTOR_LINE_WIDTH;ctx.stroke();ctx.globalAlpha=1;
 }
 const latitudeSet=lats||[-.92,-.46,0,.46,.92];
 for(const lat of latitudeSet){
   drawSphereCurve(u=>{
     const lon=-Math.PI+u*Math.PI*2;
     return sphereGridPoint(center,R,lat,lon,tilt,spin);
   },150,center,R,camPos,projectFn,col,gridAlpha,width);
 }
 for(let j=0;j<lonCount;j++){
   const lon=-Math.PI+j*Math.PI*2/lonCount;
   drawSphereCurve(u=>{
     const lat=-Math.PI*.5+u*Math.PI;
     return sphereGridPoint(center,R,lat,lon,tilt,spin);
   },130,center,R,camPos,projectFn,col,gridAlpha,width);
 }
}
  drawSphere(center,R,camPos,projectFn){
 const limb=sphereLimb(center,R,camPos,projectFn);
 // Invisible black body provides real occlusion while the visible art remains outlines only.
 if(limb.length>2){
   ctx.fillStyle='#000';
   ctx.beginPath();ctx.moveTo(limb[0].x,limb[0].y);
   for(let i=1;i<limb.length;i++)ctx.lineTo(limb[i].x,limb[i].y);
   ctx.closePath();ctx.fill();
   ctx.strokeStyle=planetLandingColour;ctx.lineWidth=VECTOR_LINE_WIDTH;ctx.stroke();
 }
 const tilt=planetTilt;
 const spin=planetSpin0+time*.075;
 const lats=[-1.28,-1.02,-.76,-.5,-.25,0,.25,.5,.76,1.02,1.28];
 for(const lat of lats){
   drawSphereCurve(u=>{
     const lon=-Math.PI+u*Math.PI*2;
     return sphereGridPoint(center,R,lat,lon,tilt,spin);
   },180,center,R,camPos,projectFn,planetLandingColour,.62,.72);
 }
 for(let j=0;j<12;j++){
   const lon=-Math.PI+j*Math.PI/6;
   drawSphereCurve(u=>{
     const lat=-Math.PI*.5+u*Math.PI;
     return sphereGridPoint(center,R,lat,lon,tilt,spin);
   },150,center,R,camPos,projectFn,planetLandingColour,.72,.76);
 }
}
  drawPlanetMoonSystem(center,R,camPos,projectFn){
 const bodies=(planetMoons||[]).map(m=>{
   const c=moonOrbitCenter(center,R,planetTilt,m,time);
   return{moon:m,center:c,d:v3len(v3sub(c,camPos))}
 });
 bodies.push({planet:true,center,d:v3len(v3sub(center,camPos))});
 // Painter's order plus each body's black occlusion disc gives correct planet/moon
 // overlap in either direction, and also lets one moon pass naturally in front of another.
 bodies.sort((a,b)=>b.d-a.d);
 for(const b of bodies){
   if(b.planet){this.drawSphere(center,R,camPos,projectFn);continue}
   const m=b.moon;
   this.drawCelestialSphere(b.center,R*m.radiusFactor,camPos,projectFn,{
     col:m.col,tilt:planetTilt+m.axisOffset,spin:m.spin0+time*m.spinSpeed,
     lats:[-.78,0,.78],lonCount:5,gridAlpha:.68,limbAlpha:.94,width:.78
   })
 }
}
  drawLockedMoonApproach(s){
 const target=(approachSystemLock||[]).find(b=>b.target);
 if(!target){
   this.drawCelestialSphere(s.center,s.R,[0,0,0],localProj,{col:approachTargetCol,tilt:approachTargetTilt,spin:approachTargetSpin0,lats:[-.78,0,.78],lonCount:5,gridAlpha:.68,limbAlpha:.94,width:.78});
   return
 }
 // The observer is flying toward the moon; every other body keeps the same
 // physical offset from that moon while the camera closes the distance.
 const bodies=approachSystemLock.map(b=>{
   const rel=v3sub(b.center,target.center),center=v3add(s.center,rel);
   return{...b,center,d:v3len(center)}
 }).sort((a,b)=>b.d-a.d);
 for(const b of bodies){
   if(b.kind==='planet'){this.drawSphere(b.center,b.radius,[0,0,0],localProj);continue}
   this.drawCelestialSphere(b.center,b.radius,[0,0,0],localProj,{col:b.col,tilt:b.tilt,spin:b.spin,lats:[-.78,0,.78],lonCount:5,gridAlpha:.68,limbAlpha:.94,width:.78})
 }
}
  drawWorldPlanet(){
 this.drawPlanetMoonSystem(planetWorld,planetRadius,[shipX,shipY,0],proj);
}
  approachSphereState(t){
 // Begin from the exact camera-space position occupied by the real world planet
 // on the locking frame. From there the same sphere moves closer while the
 // flight path bends towards a tangent. No replacement/fade/jump is involved.
 const R=approachTargetRadius;
 const start=approachStartCamCenter;
 const startD=Math.max(R+1,v3len(start));
 const h0=startD-R;
 const tt=clamp(t,0,1);
 const h=.055+(h0-.055)*Math.pow(1-tt,2.48);
 const rho=R+h;
 const alpha=Math.asin(clamp(R/rho,0,.99996));
 const focal=Math.min(W,viewH)*1.09;
 const cy=viewH*.48;
 const targetHorizon=viewH*.505;
 const gamma=Math.atan((targetHorizon-cy)/focal);
 const bend=ease(clamp((tt-.24)/.76,0,1));
 const startDir=v3norm(start);
 const theta=Math.max(0,alpha+gamma);
 // Select a tangent direction around the limb. landingAzimuth rotates that tangent
 // sideways, so different runs descend toward visibly different latitudes/longitudes
 // instead of repeatedly flying at the same apparent pole.
 const finalDir=v3norm([
   Math.sin(theta)*Math.sin(landingAzimuth),
   -Math.sin(theta)*Math.cos(landingAzimuth),
   Math.cos(theta)
 ]);
 const dir=v3norm([
   lerp(startDir[0],finalDir[0],bend),
   lerp(startDir[1],finalDir[1],bend),
   lerp(startDir[2],finalDir[2],bend)
 ]);
 return{center:[dir[0]*rho,dir[1]*rho,dir[2]*rho],R};
}
  drawApproach(){
 if(!approachLocked){
   // While autopilot is turning, the planet remains the normal world object,
   // transformed by exactly the same camera as the starfield.
   drawWorldPlanet();
   return;
 }
 const s=approachSphereState(approachP);
 if(planetLandingBody==='moon')this.drawLockedMoonApproach(s);
 else this.drawPlanetMoonSystem(s.center,s.R,[0,0,0],localProj);
}
  drawFortressBunkerShell(bx,z,alpha=.92){
 const surf=-3.5,scale=1.25,frontOffset=5.7*scale;
 // Bunker Fortress 03 / Buried Citadel. The model's authored front plane is
 // local z=-5.7; offset its origin so that plane remains exactly the tunnel door
 // plane used by the established entry code.
 const obj={type:'bunkerFortress03',x:bx,y:surf,z:z+frontOffset,s:scale,rot:[0,0,0]};
 drawMesh(obj,bunkerFortress03Mesh,C.y,Math.max(1,alpha/.22))
}
  drawDistantBunker(z,alpha=.55,bx=0){
 const surf=-3.5,wall=trenchWall(),halfH=tunnelHalfH();
 const centreCam=camPoint([bx,surf+3.2,z]);
 if(centreCam[2]<=.42)return;
 this.drawFortressBunkerShell(bx,z,alpha);
 const doorBottom=surf+.015,doorTop=doorBottom+halfH*2;
 const doorWorld=[[bx-wall,doorTop,z-.1],[bx+wall,doorTop,z-.1],[bx+wall,doorBottom,z-.1],[bx-wall,doorBottom,z-.1]];
 const door=clipWorldPolyNear(doorWorld,.42);
 if(door.length>=3){fillPoly(door);drawClosedPolyline(door,C.r,1.0,alpha*.95)}
 const rawDoor=doorWorld.map(p=>proj(p));
 if(rawDoor.every(Boolean)){
   line(rawDoor[0].x,rawDoor[0].y,rawDoor[2].x,rawDoor[2].y,C.r,.75,alpha*.42);
   line(rawDoor[1].x,rawDoor[1].y,rawDoor[3].x,rawDoor[3].y,C.r,.75,alpha*.42)
 }
}
  mountainHeight(a,layer=0){return sharedSurfaceMountainHeight(a,layer)}
  drawSurfaceHorizon(floor=-3.5,far=380,alpha=1){drawSharedSurfaceHorizon(floor,far,alpha)}
  drawSurface(fade=0){
 const floor=-3.5,far=215,a=1-fade*.6,spacing=6;
 // Same extraction rule as the city: once the nose is climbing, the radial black
 // floor fan is no longer a valid horizon mask. The surface grid itself continues
 // to render and naturally falls away as the camera pitches toward the sky.
 const extractionPitch=mode==='surfaceExit'?surfaceExitPitchProgress():0;
 if(extractionPitch<.18)surfaceMask(floor,far);
 // Grid lines are fixed in world X/Z and generated around the current ship position.
 const x0=Math.floor((shipX-far)/spacing)*spacing,x1=shipX+far;
 const zWorld0=Math.floor((travel-far)/spacing)*spacing,zWorld1=travel+far;
 for(let x=x0;x<=x1;x+=spacing){
   let prev=null;
   for(let wz=zWorld0;wz<=zWorld1;wz+=6){const p=proj([x,floor,wz-travel]);if(prev&&p)line(prev.x,prev.y,p.x,p.y,C.gd,.72,.56*a);prev=p||null}
 }
 for(let wz=zWorld0;wz<=zWorld1;wz+=spacing){
   const rz=wz-travel;let prev=null;
   for(let x=x0;x<=x1;x+=6){const p=proj([x,floor,rz]);if(prev&&p)line(prev.x,prev.y,p.x,p.y,C.gd,.78,.62*a);prev=p||null}
 }
 this.drawSurfaceHorizon(floor,380,a)
}
  fillPortalExterior(p1,p2,p3,p4){
 if(!(p1&&p2&&p3&&p4))return;
 fillScreenPoly([[0,0],[W,0],[p3.x,p3.y],[p4.x,p4.y]]);
 fillScreenPoly([[0,H],[W,H],[p2.x,p2.y],[p1.x,p1.y]]);
 fillScreenPoly([[0,0],[p4.x,p4.y],[p1.x,p1.y],[0,H]]);
 fillScreenPoly([[W,0],[W,H],[p2.x,p2.y],[p3.x,p3.y]]);
}
  clipPoly(pts,drawFn){
 const q=pts.filter(Boolean);
 if(q.length<3)return;
 ctx.save();
 ctx.beginPath();ctx.moveTo(q[0].x,q[0].y);
 for(let i=1;i<q.length;i++)ctx.lineTo(q[i].x,q[i].y);
 ctx.closePath();ctx.clip();
 drawFn();
 ctx.restore();
}
  trenchOcclusion(wall,top,floor,near,far){
 surfaceMask(floor,far);
 const lnB=proj([-wall,floor,near]),lnT=proj([-wall,top,near]),lfT=proj([-wall,top,far]),lfB=proj([-wall,floor,far]);
 const rnB=proj([wall,floor,near]),rnT=proj([wall,top,near]),rfT=proj([wall,top,far]),rfB=proj([wall,floor,far]);
 fillPoly([lnB,lnT,lfT,lfB]);fillPoly([rnB,rnT,rfT,rfB]);
}
  tunnelPortalAt(z){
 const wall=trenchWall(),halfH=tunnelHalfH(),c=tunnelCenter(z);
 return[proj([c.x-wall,c.y-halfH,z]),proj([c.x+wall,c.y-halfH,z]),proj([c.x+wall,c.y+halfH,z]),proj([c.x-wall,c.y+halfH,z])]
}
  maskOutsidePortal(p){
 if(!p||p.some(q=>!q))return;
 ctx.save();ctx.fillStyle='#000';ctx.beginPath();ctx.rect(-80,-80,W+160,H+160);ctx.moveTo(p[0].x,p[0].y);for(let i=1;i<4;i++)ctx.lineTo(p[i].x,p[i].y);ctx.closePath();ctx.fill('evenodd');ctx.restore()
}
  clipTunnelToDepth(z,drawFn){
 const step=2.30,near=.72,scroll=travel%step;
 ctx.save();
 const clips=[];clips.push(tunnelPortalAt(near));
 for(let zz=near+(step-scroll);zz<Math.min(z,58);zz+=step)clips.push(tunnelPortalAt(zz));
 for(const p of clips){if(!p||p.some(q=>!q))continue;ctx.beginPath();ctx.moveTo(p[0].x,p[0].y);for(let i=1;i<4;i++)ctx.lineTo(p[i].x,p[i].y);ctx.closePath();ctx.clip()}
 drawFn();ctx.restore()
}
  tunnelColorsAt(z){
 const rb=relZ(reactorBoundaryWorld),eb=relZ(escapeBoundaryWorld),reveal=34;
 // Do not render future coloured sections through half the tunnel. They become visible only
 // when their physical boundary has reached the nearby, bend-limited portion of the tunnel.
 if(Number.isFinite(reactorBoundaryWorld)&&rb>reveal)return{main:C.g,detail:C.gd};
 let mag=Number.isFinite(reactorBoundaryWorld)?z>rb:phase==='reactor';
 if(Number.isFinite(escapeBoundaryWorld)&&eb<=reveal&&z>eb)mag=false;
 return mag?{main:C.y,detail:C.o}:{main:C.g,detail:C.gd}
}
  drawTunnelBoundary(z,col){if(!(z>.75&&z<58))return;const wall=trenchWall(),halfH=tunnelHalfH(),c=tunnelCenter(z);const p=[proj([c.x-wall,c.y-halfH,z]),proj([c.x+wall,c.y-halfH,z]),proj([c.x+wall,c.y+halfH,z]),proj([c.x-wall,c.y+halfH,z])];for(let i=0;i<4;i++){const a=p[i],b=p[(i+1)%4];if(a&&b)line(a.x,a.y,b.x,b.y,col,2.0,.98)}}
  drawTrench(nearOverride=.72,farOverride=54){
 const wall=trenchWall(),halfH=tunnelHalfH(),near=Math.max(.32,nearOverride),far=Math.max(near+.18,farOverride),step=2.30;
 const secs=[{z:near,...tunnelCenter(near)}];
 // Ribs are fixed in world space. This also means the entry preview and the proper
 // tunnel are literally the same moving geometry instead of two different animations.
 let first=near+((step-((travel+near)%step))%step);if(first<near+.16)first+=step;
 for(let z=first;z<=far;z+=step){const c=tunnelCenter(z);secs.push({z,x:c.x,y:c.y})}
 if(secs[secs.length-1].z<far-1){const c=tunnelCenter(far);secs.push({z:far,x:c.x,y:c.y})}
 const portal=s=>[proj([s.x-wall,s.y-halfH,s.z]),proj([s.x+wall,s.y-halfH,s.z]),proj([s.x+wall,s.y+halfH,s.z]),proj([s.x-wall,s.y+halfH,s.z])];
 const portals=secs.map(portal);
 const last=secs.length-1,lastP=portals[last],lastCol=tunnelColorsAt(secs[last].z);
 if(lastP.every(Boolean))for(let k=0;k<4;k++){const a=lastP[k],b=lastP[(k+1)%4];line(a.x,a.y,b.x,b.y,lastCol.detail,.82,.72)}
 for(let i=secs.length-2;i>=0;i--){
   const a=secs[i],b=secs[i+1],pa=portals[i],pb=portals[i+1];
   if(!pa.every(Boolean)||!pb.every(Boolean))continue;
   // Each nearer cross-section is an aperture. Anything farther away which falls
   // outside it is physically behind the bend and is blacked out.
   maskOutsidePortal(pa);
   const col=tunnelColorsAt((a.z+b.z)*.5),rib=tunnelColorsAt(a.z);
   for(let k=0;k<4;k++)line(pa[k].x,pa[k].y,pb[k].x,pb[k].y,col.main,1.02,.94);
   for(const frac of [-.34,.34]){
     const af=proj([a.x+wall*frac,a.y-halfH,a.z]),bf=proj([b.x+wall*frac,b.y-halfH,b.z]);
     const ar=proj([a.x+wall*frac,a.y+halfH,a.z]),br=proj([b.x+wall*frac,b.y+halfH,b.z]);
     if(af&&bf)line(af.x,af.y,bf.x,bf.y,col.detail,.62,.48);if(ar&&br)line(ar.x,ar.y,br.x,br.y,col.detail,.62,.48)
   }
   for(let k=0;k<4;k++){const p=pa[k],q=pa[(k+1)%4];line(p.x,p.y,q.x,q.y,rib.detail,.86,.78)}
 }
 const rb=relZ(reactorBoundaryWorld),eb=relZ(escapeBoundaryWorld);if(Number.isFinite(reactorBoundaryWorld)&&rb<34)drawTunnelBoundary(rb,C.y);if(Number.isFinite(escapeBoundaryWorld)&&eb<34)drawTunnelBoundary(eb,C.g)
}
  drawTrenchEntry(drawBase=true){
 const surf=-3.5,wall=trenchWall(),halfH=tunnelHalfH(),bx=entryBunkerX,z=entryBunkerZ();if(drawBase)drawSurface(0);
 this.drawFortressBunkerShell(bx,z,1);
 const doorBottom=surf+.025,doorTop=doorBottom+halfH*2;
 const door=[proj([bx-wall,doorTop,z-.1]),proj([bx+wall,doorTop,z-.1]),proj([bx+wall,doorBottom,z-.1]),proj([bx-wall,doorBottom,z-.1])];
 if(!bunkerDoorOpen)fillPoly(door);
 const dc=hitFxColor(doorFlash,bunkerDoorOpen?C.g:C.r),da=doorFlash>0?.98:.95;
 if(bunkerDoorOpen&&(doorBreachAt<0||modeT-doorBreachAt>.12)){
   // The fortress model has a genuine central aperture. Clip the established tunnel
   // preview to the blast-door rectangle so no interior geometry leaks through its walls.
   clipPoly(door,()=>{fillPoly(door);drawTrench(Math.max(.35,z+.62),Math.max(z+2.5,54))})
 }else if(door[0]&&door[1]&&door[2]&&door[3]){
   const mx=(door[0].x+door[1].x+door[2].x+door[3].x)/4,my=(door[0].y+door[1].y+door[2].y+door[3].y)/4;line(door[0].x,door[0].y,door[2].x,door[2].y,C.r,.95,.62);line(door[1].x,door[1].y,door[3].x,door[3].y,C.r,.95,.62);line(mx-18,my,mx-6,my,C.y,1.2,.9);line(mx+6,my,mx+18,my,C.y,1.2,.9);line(mx,my-18,mx,my-6,C.y,1.2,.9);line(mx,my+6,mx,my+18,C.y,1.2,.9)
 }
 for(let i=0;i<door.length;i++){const a=door[i],b=door[(i+1)%4];if(a&&b)line(a.x,a.y,b.x,b.y,dc,1.35,da)}if(doorFlash>0&&door[0]&&door[1]&&door[2]&&door[3]){line(door[0].x,door[0].y,door[2].x,door[2].y,dc,.8,.68);line(door[1].x,door[1].y,door[3].x,door[3].y,dc,.8,.68)}
}
  drawReactorApproach(){drawTrench()
}
  drawReactorExit(){drawTrench()
}
  drawHazard(h){
 if(h.bunkerObstacle&&bunkerRaid?.active){bunkerRaid.drawBunkerObstacle(h);return}
 const wall=trenchWall(),c=tunnelCenter(h.z),thick=h.thick||.58,y=c.y+h.y,ww=wall*1.03,col=hitFxColor(h.hitFx,h.col||C.c);
 // Courier girders are physical rectangular beams. Render the whole beam through
 // the same hidden-line box mesh used by the solid delivery-bay fixtures so wall,
 // floor and tunnel-grid lines cannot remain visible through it.
 const obj={x:c.x,y,z:h.z+.61,s:.5,mx:ww*2,my:thick,mz:.86,rot:[0,0,0]};
 drawMesh(obj,courierFixtureBoxMesh,col,.96);
 // Keep the simple diagonal bracing on the near face, but draw it after the solid
 // box so it reads as detail on the girder rather than transparent geometry.
 const hh=thick*.5,z=h.z+.18;
 const a=proj([c.x-ww,y-hh,z]),b=proj([c.x+ww,y+hh,z]),d=proj([c.x-ww,y+hh,z]),e=proj([c.x+ww,y-hh,z]);
 if(a&&b)line(a.x,a.y,b.x,b.y,col,.75,.58);if(d&&e)line(d.x,d.y,e.x,e.y,col,.75,.58)
}
  drawGroundTarget(g){
 if(g.type==='landgun'){bunkerRaid.draw(g);return}
 if(g.type==='xenoRegulator'){
   const pulse=1+Math.sin(time*7.2)*.16;
   const obj={...g,s:g.s*pulse,rot:[g.rot?.[0]||0,g.rot?.[1]||0,g.rot?.[2]||0]};
   drawMesh(obj,g.mesh,objectHitColor(g,C.m));
   return
 }
 if(g.type==='tower'){
   drawMesh(g,towerBodyMesh,C.g);
   if(!g.capDead){
     const cap={x:g.x,y:towerCapY(g),z:g.z,s:.78*g.s,rot:[0,g.rot[1],0]};
     drawMesh(cap,towerCapMesh,hitFxColor(g.capHitFx,g.capCol||C.y))
   }
 }else if(g.type==='reactor'){
   const col=objectHitColor(g,C.r);
   drawMesh(g,g.mesh,col);
   for(let i=0;i<3;i++){
     const ry=g.y+Math.sin(time*4.6+i*1.7)*0.92+(i-1)*0.15,rz=g.z+(i-1)*0.22,rx=1.35,rz2=.75;
     const p1=proj([g.x-rx,ry-.16,rz]),p2=proj([g.x+rx,ry-.16,rz]),p3=proj([g.x+rx,ry+.16,rz]),p4=proj([g.x-rx,ry+.16,rz]);
     if(p1&&p2&&p3&&p4){line(p1.x,p1.y,p2.x,p2.y,col,1.0,.88);line(p2.x,p2.y,p3.x,p3.y,col,1.0,.88);line(p3.x,p3.y,p4.x,p4.y,col,1.0,.88);line(p4.x,p4.y,p1.x,p1.y,col,1.0,.88)}
   }
 }else drawMesh(g,g.mesh,objectHitColor(g,g.col));
}
  drawBolt(b){
 const p=boltScreenPoint(b);if(!p)return;
 const r=boltVisualRadius(b,p),inner=r*.30,core=r*.47,col=b.col||C.c,accent=b.accentCol||C.w;
 if(b.style==='toxicSpit'){
   if(b.swampSpit){
     const drawJagged=(radius,notch,turn,col,alpha=.95)=>{
       const pts=[];
       for(let i=0;i<20;i++){
         const a=b.rot+turn+i*Math.PI/10,rr=(i%2===0?radius:radius*notch);
         pts.push({x:p.x+Math.cos(a)*rr,y:p.y+Math.sin(a)*rr})
       }
       for(let i=0;i<20;i++){
         const a=pts[i],c=pts[(i+1)%20];
         line(a.x,a.y,c.x,c.y,col,1,alpha)
       }
     };
     const base=r*.58;
     drawJagged(base,.54,0,col,.96);
     drawJagged(base*.78,.54,.08,accent,.94);
     drawJagged(base*.59,.54,-.06,accent,.93);
     drawJagged(base*.43,.54,.13,accent,.92);
     return
   }
   const pts=[];
   for(let i=0;i<6;i++){
     const a=b.rot+i*Math.PI*2/6,rr=(i%2?0.82:1.0)*r*.52;
     pts.push({x:p.x+Math.cos(a)*rr,y:p.y+Math.sin(a)*rr})
   }
   for(let i=0;i<6;i++){
     const a=pts[i],c=pts[(i+1)%6];
     line(a.x,a.y,c.x,c.y,col,1,.95)
   }
   const inner=[];
   for(let i=0;i<3;i++){
     const a=-b.rot*.72+i*Math.PI*2/3+Math.PI/6,rr=r*.22;
     inner.push({x:p.x+Math.cos(a)*rr,y:p.y+Math.sin(a)*rr})
   }
   for(let i=0;i<3;i++){
     const a=inner[i],c=inner[(i+1)%3];
     line(a.x,a.y,c.x,c.y,accent,.9,.92)
   }
   return
 }
 for(let i=0;i<8;i++){
   const a=b.rot+i*Math.PI/4;
   line(p.x+Math.cos(a)*inner,p.y+Math.sin(a)*inner,p.x+Math.cos(a)*r,p.y+Math.sin(a)*r,C.c,1,.96)
 }
 ctx.strokeStyle=C.w;ctx.lineWidth=VECTOR_LINE_WIDTH;ctx.beginPath();ctx.arc(p.x,p.y,core,0,Math.PI*2);ctx.stroke();
 if(r>20){ctx.strokeStyle=C.c;ctx.beginPath();ctx.arc(p.x,p.y,r*.68,0,Math.PI*2);ctx.stroke()}
}
  cockpit(){
 const gg=gunGeometry();
 // Forward camera: no visible cockpit or dashboard. Only the side-mounted gun
 // barrels protrude into view, with their gimbal structure implied off-screen.
 drawGun(gg.left);drawGun(gg.right);
}
  drawShots(){
 for(const s of shots){
   // A shot is a moving pulse, not a dashed/static beam. Each SoundFX.laser()
   // invocation creates exactly one pair here; age advances continuously between
   // firing sounds so the pulse can be seen travelling downrange.
   const travel=clamp(s.age/s.dur,0,1);
   for(const g of [{x:s.lx,y:s.ly},{x:s.rx,y:s.ry}]){
     const dx=s.x-g.x,dy=s.y-g.y,dist=Math.max(1,Math.hypot(dx,dy));
     const pulsePx=s.pulsePx||16,pulseT=Math.min(.18,pulsePx/dist);
     // During the first pulse-length of travel the dash grows cleanly out of the
     // muzzle. After that the complete short segment travels as one rigid pulse.
     const head=travel,tail=Math.max(0,head-pulseT);
     const x1=lerp(g.x,s.x,tail),y1=lerp(g.y,s.y,tail),x2=lerp(g.x,s.x,head),y2=lerp(g.y,s.y,head);
     const fade=1-Math.pow(travel,5)*.22;
     line(x1,y1,x2,y2,C.c,2.6,fade);
     line(x1,y1,x2,y2,C.w,.72,fade*.98);
     // Tiny bright head makes direction of travel readable without leaving a tail.
     const ux=dx/dist,uy=dy/dist;
     line(x2-ux*2.2,y2-uy*2.2,x2+ux*1.2,y2+uy*1.2,C.w,1.1,fade);
   }
 }
}
  drawFX(){for(const s of sparks){line(s.x-2,s.y,s.x+2,s.y,s.col,.9,clamp(s.t/.5,0,1));line(s.x,s.y-2,s.x,s.y+2,s.col,.9,clamp(s.t/.5,0,1))}for(const f of fragments)line(f.x1,f.y1,f.x2,f.y2,f.col,1,clamp(f.t/.85,0,1));for(const d of doorPieces){const a=1-clamp(d.age/d.dur,0,1),c=Math.cos(d.rot),s=Math.sin(d.rot),pts=d.pts.map(p=>[d.x+p.x*c-p.y*s,d.y+p.x*s+p.y*c]);if(pts.length>2){fillScreenPoly(pts);strokePoly(pts,C.r,1.25,a);line(pts[0][0],pts[0][1],pts[2][0],pts[2][1],C.y,.8,a*.8)}}}
  topHud(){
 if(mode==='idle')return;
 ctx.textBaseline='top';ctx.font='400 12px Consolas,monospace';ctx.lineWidth=VECTOR_LINE_WIDTH;
 const rawLabel=(mode==='play'?phase.toUpperCase():mode.toUpperCase());
 const encounterProfile=scenarioFlow?.encounterProfile||'standard';
 const customsEncounter=encounterProfile==='customs'||jackalDelivery?.customsActive?.();
 const encounterLabel=customsEncounter?'CUSTOMS INTERCEPT':(encounterProfile==='pirate'?'PIRATE INTERCEPT':(encounterProfile==='rogue'?'ROGUE DRONES':(encounterProfile==='xeno'?'XENO SWARM':'')));
 let leftLabel=xenoNest.active?xenoNest.hudLeft():(encounterLabel||rawLabel.replace('TRENCHENTRY','BUNKER APPROACH').replace('BUNKERTUNNEL','BUNKER TUNNEL').replace('BUNKERRETURN','RETURN TUNNEL').replace('BUNKERCIRCUITRYPICKUP','EQUIPMENT RECOVERY').replace('BUNKERTURN','TURNAROUND').replace('BUNKERSURFACECLEAR','BUNKER EXIT').replace('OSDDELIVERY','OSD FACILITY').replace('REACTORAPPROACH','REACTOR APPROACH').replace('SURFACEEXIT','SURFACE ESCAPE').replace('MISSIONTRANSIT','CHECKPOINT TRANSIT').replace('SPACETRANSFER','SPACE TRANSIT').replace('ASTEROIDEXIT','RING ESCAPE').replace('COURIERMINE','MINE APPROACH').replace('COURIERDOCK','DOCKING').replace('COURIERTUNNEL','MINE TUNNEL').replace('COURIERRETURN','RETURN TUNNEL').replace('COURIERDELIVERY','DELIVERY').replace('COURIERTURN','TURNAROUND').replace('COURIEREXITZOOM','DEPARTURE').replace('MISSIONEXIT','RETURN TO BASE').replace('DESTINATIONAPPROACH','PLAINS APPROACH').replace('JACKALCITY','CITY APPROACH').replace('JACKALPENTHOUSE','PENTHOUSE APPROACH').replace('JACKALDELIVERY','DELIVERY').replace('JACKALEXITZOOM','SURFACE ESCAPE').replace('URBANPICKUPAUTO','GROUND PICKUP').replace('URBANTURN','CITY TURNAROUND').replace('STATIONENTRY','STATION ENTRY').replace('STATIONINTERIOR','STATION INTERIOR').replace('STATIONDEPARTURE','STATION DEPARTURE'));
 if(campaign.currentMission?.training)leftLabel=`VOX SIMULATOR · ${(campaign.currentStage()?.label||'TRAINING').toUpperCase()}`;
 else if(asteroidWreckRun?.active)leftLabel=asteroidWreckRun.hudLeft()||leftLabel;
 else if(freeTradersDepot?.active)leftLabel=freeTradersDepot.hudLeft()||leftLabel;
 else if(salvageRecovery.active&&salvageRecovery.state!=='combat')leftLabel='RECOVERY';
 else if(phase==='jackalCity'&&(jackalDelivery.state==='outboundMerge'||jackalDelivery.state==='cityOutbound'))leftLabel='CITY EXIT';
 ctx.textAlign='left';ctx.strokeStyle=C.g;ctx.strokeText(leftLabel,12,10);
 ctx.textAlign='right';
 const destinationHud=surfaceDestination?.hudRight?.()||'',securityHud=securityCheckpoint?.hudRight?.()||'',forestHud=forest?.hudRight?.()||'',courierHud=courier?.hudRight?.()||'',jackalHud=jackalDelivery?.hudRight?.()||'',stationHud=stationDelivery?.hudRight?.()||'',xenoHud=xenoNest?.hudRight?.()||'',recoveryHud=salvageRecovery?.hudRight?.()||'',landGunHud=bunkerRaid?.hudRight?.()||'',asteroidWreckHud=asteroidWreckRun?.hudRight?.()||'',freeTradersDepotHud=freeTradersDepot?.hudRight?.()||'';
 if(freeTradersDepotHud){
   ctx.strokeStyle=C.y;ctx.strokeText(freeTradersDepotHud,W-12,10);
 }else if(asteroidWreckHud){
   ctx.strokeStyle=C.y;ctx.strokeText(asteroidWreckHud,W-12,10);
 }else if(landGunHud){
   ctx.strokeStyle=C.y;ctx.strokeText(landGunHud,W-12,10);
 }else if(xenoHud){
   ctx.strokeStyle=C.y;ctx.strokeText(xenoHud,W-12,10);
 }else if(recoveryHud){
   ctx.strokeStyle=C.y;ctx.strokeText(recoveryHud,W-12,10);
 }else if(mode==='missionTransit'||mode==='spaceTransfer'){
   ctx.strokeStyle=C.g;const stageHud=(mode==='spaceTransfer'?spaceTransfer?.stage?.hud:null)||campaign.currentStage?.()?.hud;ctx.strokeText(stageHud||(mode==='spaceTransfer'?'TO STATION':'IN TRANSIT'),W-12,10);
 }else if(securityHud){
   ctx.strokeStyle=C.y;ctx.strokeText(securityHud,W-12,10);
 }else if(stationHud){
   ctx.strokeStyle=C.y;ctx.strokeText(stationHud,W-12,10);
 }else if(jackalHud){
   ctx.strokeStyle=C.y;ctx.strokeText(jackalHud,W-12,10);
 }else if(destinationHud){
   ctx.strokeStyle=C.y;ctx.strokeText(destinationHud,W-12,10);
 }else if(forestHud){
   ctx.strokeStyle=C.y;ctx.strokeText(forestHud,W-12,10);
 }else if(courierHud){
   ctx.strokeStyle=C.y;ctx.strokeText(courierHud,W-12,10);
 }else if(mode==='play'&&phase==='asteroids'&&asteroidField.active){
   ctx.strokeStyle=C.y;ctx.strokeText(`${asteroidField.markedTargets?'MARKED':'TARGET'} ${asteroidField.destroyed}/${asteroidField.goal}`,W-12,10);
 }else if(mode==='play'&&phase==='space'){
   ctx.strokeStyle=C.y;
   const liveHostiles=fighters.filter(f=>!f.dead&&!f.dying).length;
   const groupThin=!freezeObjectives&&fighterReservesRemaining()===0&&liveHostiles<=Math.max(2,Math.ceil(activeFighterCap()*.45));
   ctx.strokeText(groupThin?'HOSTILE GROUP THINNING':'HOSTILE CONTACTS',W-12,10);
 }else if(mode==='play'&&phase==='surface'&&tutorialFinalRun.isActive()&&surfaceBunkerActive){
   ctx.strokeStyle=C.y;ctx.strokeText(`BUNKER ${Math.round(surfaceBunkerDistance())}`,W-12,10);
 }else if(mode==='play'&&phase==='surface'&&doorPylonsDestroyed<BUNKER_PYLON_GOAL){
   ctx.strokeStyle=C.y;ctx.strokeText(`PYLONS ${Math.min(doorPylonsDestroyed,BUNKER_PYLON_GOAL)}/${BUNKER_PYLON_GOAL}`,W-12,10);
 }else if(mode==='play'&&phase==='surface'&&surfaceBunkerActive){
   ctx.strokeStyle=C.y;ctx.strokeText(`BUNKER ${Math.round(surfaceBunkerDistance())}`,W-12,10);
   const desired=Math.atan2(entryBunkerX-shipX,entryBunkerWorldZ-travel),err=wrapAngle(desired-viewYaw);
   if(Math.abs(err)>.22){ctx.textAlign='center';ctx.strokeText(err<0?'<< BUNKER':'BUNKER >>',W*.5,29);ctx.textAlign='right'}
 }else{
   ctx.strokeStyle=C.g;ctx.strokeText(`BOLTS ${bolts.filter(b=>!b.dead).length}`,W-12,10);
 }
 // One large slanted outline marker now represents one whole shield point.
 // During regeneration the next missing shield remains grey. On every outline edge,
 // two inset cyan points appear at 1/4 and 3/4 of the line and grow inward until
 // they meet. Only then does the integer shield value increase and the whole marker
 // become fully cyan before regeneration moves on to the next missing shield.
 const maxShield=Math.max(1,campaign.maxShield()),segs=maxShield,sw=25,gap=5;
 const total=segs*sw+(segs-1)*gap,x0=W*.5-total*.5,y=10,on=Math.max(0,Math.min(segs,shield));
 const regen=campaign.shieldRegeneration();
 const regenProgress=(regen&&shield<maxShield&&shieldRegenDelay<=0)?clamp(shieldRegenTick/regen.interval,0,.9999):0;
 const rebuilding=shield;
 const pointOnEdge=(a,b,t)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];
 const drawRegenEdge=(a,b,p)=>{
   // Each edge begins with two inset cyan dots at quarter/three-quarter positions.
   // They lengthen only toward the middle until they meet at 50%.
   const edgeLen=Math.max(1,Math.hypot(b[0]-a[0],b[1]-a[1])),dot=Math.min(.045,.55/edgeLen),grow=.25*p;
   const l0=pointOnEdge(a,b,.25-dot),l1=pointOnEdge(a,b,.25+Math.max(dot,grow));
   const r0=pointOnEdge(a,b,.75-Math.max(dot,grow)),r1=pointOnEdge(a,b,.75+dot);
   ctx.beginPath();ctx.moveTo(l0[0],l0[1]);ctx.lineTo(l1[0],l1[1]);ctx.moveTo(r0[0],r0[1]);ctx.lineTo(r1[0],r1[1]);ctx.stroke();
 };
 ctx.textAlign='center';ctx.font='400 9px Consolas,monospace';ctx.strokeStyle=C.w;ctx.strokeText('SHIELD',W*.5,y+14);
 for(let i=0;i<segs;i++){
   const x=x0+i*(sw+gap),lit=i<on,isRebuilding=i===rebuilding&&shield<maxShield;
   const p0=[x,y],p1=[x+sw-3,y],p2=[x+sw,y+7],p3=[x+3,y+7];
   ctx.strokeStyle=(lit&&shieldRestoreFlashT>0&&i===shieldRestoreFlashIndex)?C.w:(lit?(shield<=1?C.r:C.c):C.x);ctx.lineWidth=VECTOR_LINE_WIDTH;
   ctx.beginPath();ctx.moveTo(p0[0],p0[1]);ctx.lineTo(p1[0],p1[1]);ctx.lineTo(p2[0],p2[1]);ctx.lineTo(p3[0],p3[1]);ctx.closePath();ctx.stroke();
   if(isRebuilding&&regenProgress>0){
     ctx.strokeStyle=C.c;
     drawRegenEdge(p0,p1,regenProgress);
     drawRegenEdge(p1,p2,regenProgress);
     drawRegenEdge(p2,p3,regenProgress);
     drawRegenEdge(p3,p0,regenProgress);
   }
 }
 // Simulator objectives stay pinned until the learner actually completes them.
 // Transient VOX and ordinary game announcements occupy rows underneath rather than
 // overwriting the teaching instruction.
 {
   const maxW=Math.max(180,W*.72),subtitleY=y+29;
   const drawHudText=(text,row,baseSize=12,col=C.w)=>{
     if(!text)return;
     let fs=baseSize;
     ctx.textAlign='center';ctx.textBaseline='top';ctx.font=`400 ${fs}px Consolas,monospace`;
     while(fs>9&&ctx.measureText(text).width>maxW){fs--;ctx.font=`400 ${fs}px Consolas,monospace`}
     ctx.strokeStyle=col;ctx.lineWidth=VECTOR_LINE_WIDTH;ctx.strokeText(text,W*.5,subtitleY+row*15,maxW)
   };
   let row=0;
   if(tutorialObjectiveSubtitleText){
     drawHudText(tutorialObjectiveSubtitleText,row++,12,C.w);
     if(speechSubtitleT>0&&speechSubtitleText&&speechSubtitleText!==tutorialObjectiveSubtitleText)drawHudText(speechSubtitleText,row++,11,C.w)
   }else if(speechSubtitleT>0&&speechSubtitleText){
     drawHudText(speechSubtitleText,row++,12,C.w)
   }
   if(tutorialAnnouncementT>0&&tutorialAnnouncementText)drawHudText(tutorialAnnouncementText,row++,10,C.w)
 }
 ctx.textAlign='left';
}
  drawDeathStatic(t){
    const duration=.96,u=clamp(t/duration,0,1),frame=(t*34)|0;
    // Analogue/vector signal breakup: horizontal traces only. Density falls away
    // rather than fading colours, so the source palette remains hard-limited.
    const hash=n=>{const x=Math.sin((n+deathFxSeed)*12.9898+frame*78.233)*43758.5453;return x-Math.floor(x)};
    const count=Math.max(24,Math.floor(470*Math.pow(1-u,.72)));
    ctx.lineWidth=VECTOR_LINE_WIDTH;ctx.lineCap='butt';
    for(let i=0;i<count;i++){
      const band=(hash(i*7.1)*34)|0;
      const y=Math.round((band+hash(i*5.3)*.82)/34*viewH);
      const x=Math.round(hash(i*11.7)*W);
      const longish=hash(i*19.9)>.84;
      const len=Math.round(longish?lerp(W*.045,W*.18,hash(i*23.1)):lerp(3,42,hash(i*17.3)));
      const early=t<.17,roll=hash(i*29.7);
      const col=early&&roll>.89?C.r:(roll>.68?C.w:C.g);
      ctx.strokeStyle=col;ctx.beginPath();ctx.moveTo(x,y+.5);ctx.lineTo(Math.min(W,x+len),y+.5);ctx.stroke();
    }
    // A handful of sparse full-band sync tears make the failure read as a display
    // signal collapse rather than ordinary particle debris.
    const tears=Math.max(0,Math.floor(7*(1-u)));
    for(let i=0;i<tears;i++){
      const y=Math.round(hash(900+i*31)*viewH),x=Math.round(hash(950+i*17)*W*.68);
      const len=Math.round(lerp(W*.10,W*.42,hash(990+i*13)));
      ctx.strokeStyle=(t<.12&&i===0)?C.r:C.g;ctx.beginPath();ctx.moveTo(x,y+.5);ctx.lineTo(Math.min(W,x+len),y+.5);ctx.stroke();
    }
  }
  idle(){ctx.textAlign='center';ctx.strokeStyle=C.g;ctx.lineWidth=VECTOR_LINE_WIDTH;ctx.font=`400 ${clamp(W/34,24,36)}px Consolas,monospace`;ctx.strokeText('VECTOR SPACE',W*.5,viewH*.38);ctx.strokeStyle=C.w;ctx.lineWidth=VECTOR_LINE_WIDTH;ctx.font='400 14px Consolas,monospace';ctx.strokeText('VECTOR ASSAULT',W*.5,viewH*.47);ctx.strokeStyle=C.y;ctx.strokeText('PRESS START',W*.5,viewH*.56);ctx.textAlign='left'}
  hyperspace(){}
  drawExitDoorStructure(){
 const wall=trenchWall(),halfH=tunnelHalfH(),z=relZ(exitDoorWorld);if(!(z>.18&&z<58))return;const c=tunnelCenter(z);
 const frame=[proj([c.x-wall*1.02,c.y-halfH,z]),proj([c.x+wall*1.02,c.y-halfH,z]),proj([c.x+wall*1.02,c.y+halfH,z]),proj([c.x-wall*1.02,c.y+halfH,z])];
 const doorW=wall*.82,doorH=halfH*.82,open=clamp((28-z)/15,0,1),openW=lerp(.04,doorW,open),openH=lerp(.04,doorH,open);
 const closed=[proj([c.x-doorW,c.y-doorH,z-.06]),proj([c.x+doorW,c.y-doorH,z-.06]),proj([c.x+doorW,c.y+doorH,z-.06]),proj([c.x-doorW,c.y+doorH,z-.06])];
 const opening=[proj([c.x-openW,c.y-openH,z-.07]),proj([c.x+openW,c.y-openH,z-.07]),proj([c.x+openW,c.y+openH,z-.07]),proj([c.x-openW,c.y+openH,z-.07])];fillPoly(frame);
 if(open<.02){fillPoly(closed);for(let i=0;i<4;i++){const a=closed[i],b=closed[(i+1)%4];if(a&&b)line(a.x,a.y,b.x,b.y,C.r,1.25,.96)}}else{if(opening.every(Boolean))clipPoly(opening,()=>drawSurface(.04));const left=[closed[0],proj([c.x-openW,c.y-doorH,z-.06]),proj([c.x-openW,c.y+doorH,z-.06]),closed[3]],right=[proj([c.x+openW,c.y-doorH,z-.06]),closed[1],closed[2],proj([c.x+openW,c.y+doorH,z-.06])];fillPoly(left);fillPoly(right);for(const poly of [left,right])for(let i=0;i<4;i++){const a=poly[i],b=poly[(i+1)%4];if(a&&b)line(a.x,a.y,b.x,b.y,C.r,1.05,.9)}for(let i=0;i<4;i++){const a=opening[i],b=opening[(i+1)%4];if(a&&b)line(a.x,a.y,b.x,b.y,C.c,1.25,.96)}}
 if(frame.every(Boolean))for(let i=0;i<4;i++){const a=frame[i],b=frame[(i+1)%4];line(a.x,a.y,b.x,b.y,C.g,1.1,.95)}
}
  drawExitDoor(){drawTrench();drawExitDoorStructure()}
  render(now){
   if(typeof syncFlightPointerLock==='function')syncFlightPointerLock();
 const ambientFreeFlight=!!(surfaceDestination?.active&&surfaceDestination.freeFlight&&phase==='destinationApproach');
 sceneRenderSerial++;
 const dt=Math.min(.04,(now-last)/1000||0);last=now;updateFighterFlybyAudio(dt);ctx.save();if(shake>0&&mode!=='dead')ctx.translate((Math.random()-.5)*shake,(Math.random()-.5)*shake);ctx.fillStyle='#000';ctx.fillRect(-20,-20,W+40,H+40);
 if(mode==='dead'||mode==='simulatorCut'){
   this.drawDeathStatic((performance.now()-deathFxStart)/1000);
   ctx.restore();
   if(!gateVisible()&&!campaign.isOpen())gpuBloom.render(canvas,glowStrength/100);else gpuBloom.clear();
   if(!gateVisible()&&fullscreenActive()&&!campaign.isOpen())update(dt);
   requestAnimationFrame(render);return
 }
 const enclosed=(phase==='trench'||phase==='reactor'||phase==='escape'||phase==='courierTunnel'||phase==='courierReturn'||phase==='bunkerTunnel'||phase==='bunkerReturn'||phase==='stationInterior'||phase==='securityCheckpoint'||phase==='xenoCore'||mode==='courierDelivery'||mode==='courierTurn'||mode==='bunkerCircuitryPickup'||mode==='bunkerTurn'||mode==='reactorApproach'||mode==='reactorExit'||mode==='exitDoor');
 if(!enclosed)drawStars();
 if(phase==='asteroids'||phase==='courierMine'||asteroidWreckRun?.fieldVisible?.())asteroidField.drawBackdrop();
 if((mode==='play'||mode==='recoveryPickup')&&phase==='space'&&!courier.active&&!stationDelivery.active&&!asteroidWreckRun?.active)drawWorldPlanet();
 if((mode==='play'||mode==='recoveryPickup')&&(phase==='space'||phase==='asteroids'||phase==='courierMine'||phase==='xenoNest'))drawSpaceMotes();
 if(stationHack?.active&&phase==='space')stationHack.draw('far');
 // During the station-defence/recovery mission Relay 10 must share the same
 // painter list as wreckage and fighters. Drawing it here, before the scene list,
 // allowed every later wreck to show through the station regardless of depth.
 const recoveryStationPainter=stationDelivery.active&&phase==='space'&&mode!=='missionTransit'&&salvageRecovery?.active&&salvageRecovery.stage?.wreckageSearch;
 if(stationDelivery.active&&phase==='space'&&mode!=='missionTransit'&&!recoveryStationPainter)stationDelivery.drawExterior();
 if(stationHack?.active&&phase==='space')stationHack.draw('near');
 if(securityCheckpoint.active&&mode==='securityCheckpoint'&&phase==='space')securityCheckpoint.draw();
 if(xenoNest.active&&phase==='xenoCore')xenoNest.drawCoreCorridor();
 const entryMode=mode==='trenchEntry';
 if(mode==='approach')drawApproach();
 else if(entryMode){if(tutorialFinalRun.isActive())tutorialFinalRun.drawSurfaceScene(false,{deferObjects:true});else drawSurface();const s=[];if(tutorialFinalRun.isActive())surfaceDestination.appendScenery(s);bunkerRaid.appendTeslaScene(s);for(const g of groundTargets)if(!g.dead){const d=camPoint([g.x,g.y,g.z])[2];if(d>.18)s.push({z:d,draw:()=>drawGroundTarget(g)})}const bz=entryBunkerZ();surfaceDestination.appendWorldObject(s,{x:entryBunkerX,y:-2.2,worldZ:travel+bz,draw:()=>drawTrenchEntry(false)});surfaceDestination.drawObjectScene(s)}
 else if(mode==='reactorApproach'||mode==='reactorExit')drawTrench();
 else if(mode==='exitDoor')drawExitDoor();
 else if(mode==='surfaceExit'){if(mission.surfaceExitScene==='forest'&&forest.active){forest.drawScene()}else if(mission.surfaceExitScene==='city'&&jackalDelivery.active)jackalDelivery.drawCity();else if(mission.surfaceExitScene==='osd'&&bunkerRaid.active)bunkerRaid.drawOsdSurfaceScene();else{drawSurface();if(bunkerRaid.active&&bunkerRaid.devExitPending){bunkerRaid.drawReturnTeslaPylons(0,travel);bunkerRaid.drawReturnSurfaceGuns(0,travel)}}}
 else if(mode==='osdDelivery'&&bunkerRaid.active)bunkerRaid.drawOsdSurfaceScene()
 else if(mode==='courierDelivery'){courier.drawOutboundScene()}
 else if(mode==='courierTurn'){courier.drawTurnScene()}
 else if(bunkerRaid.active&&(phase==='bunkerTunnel'||phase==='bunkerReturn'||mode==='bunkerCircuitryPickup'||mode==='bunkerTurn'))bunkerRaid.drawInteriorScene()
 else{if(phase==='forest'&&forest.active){forest.drawScene()}if(phase==='destinationApproach'&&surfaceDestination.active)surfaceDestination.draw();if(phase==='jackalCity'&&jackalDelivery.active)jackalDelivery.drawCity();if(phase==='stationInterior'&&stationDelivery.active)stationDelivery.drawInterior();if(phase==='surface'){if(tutorialFinalRun.isActive())tutorialFinalRun.drawSurfaceScene(true,{deferObjects:true});else{drawSurface();if(mode==='bunkerSurfaceClear'&&bunkerRaid.active){bunkerRaid.drawReturnTeslaPylons(0,travel);bunkerRaid.drawReturnSurfaceGuns(0,travel)}}}if(phase==='trench'||phase==='reactor'||phase==='escape'){drawTrench();if(phase==='escape'&&relZ(exitDoorWorld)<54)drawExitDoorStructure()}if(phase==='courierTunnel'){courier.drawOutboundScene()}if(phase==='courierReturn'){courier.drawReturnScene()}}
 const tunnelScene=(phase==='trench'||phase==='reactor'||phase==='escape'||phase==='courierTunnel'||phase==='courierReturn'||phase==='bunkerTunnel'||phase==='bunkerReturn'||mode==='courierDelivery'||mode==='courierTurn'||mode==='bunkerCircuitryPickup'||mode==='bunkerTurn'||mode==='reactorApproach'||mode==='reactorExit'||mode==='exitDoor');
 const xenoTunnelScene=(phase==='xenoCore'&&xenoNest.active);const scene=[];
 // Tutorial surface scenery and its bunker must share this painter list. Previously
 // trees were fully drawn first and the bunker was then painted over them regardless
 // of physical depth, making a distant bunker appear in front of foreground trees.
 if(!entryMode&&mode==='play'&&phase==='surface'&&tutorialFinalRun.isActive())surfaceDestination.appendScenery(scene);
 if(xenoNest.active)xenoNest.appendScene(scene);
 if(recoveryStationPainter){
   const sd=camPoint([stationDelivery.station.x,stationDelivery.station.y,stationDelivery.station.z])[2];
   if(sd>.18)scene.push({z:sd,draw:()=>stationDelivery.drawExterior()})
 }
 if(phase==='asteroids'||phase==='courierMine'||mode==='courierExitZoom'||asteroidWreckRun?.fieldVisible?.())for(const a of asteroids)if(!a.dead&&a.type!=='courierMine'&&a.persistentLargeObject!==true&&a.mineBaseVariantId==null){
   const ad=camPoint([a.x,a.y,a.z])[2];
   if(ad>.18)scene.push({z:ad,draw:()=>drawMesh(a,asteroidMesh,objectHitColor(a,a.col))})
 }
 if(courier?.mine&&(phase==='asteroids'||phase==='courierMine')){
   const md=camPoint([courier.mine.x,courier.mine.y,courier.mine.z])[2];
   if(md>.18)scene.push({z:md,draw:()=>courier.drawMine()})
 }
 for(const h of hazards)if(!h.dead&&h.z>.18){
   // The bunker tunnel renderer deliberately stops at ~54 units because bends hide
   // what lies beyond. Do not let a far girder survive that visual horizon and peek
   // through a wall before its section of tunnel is actually visible.
   if(h.bunkerObstacle&&h.z>40)continue;
   // courierTurn draws girders itself in their outbound physical coordinates.
   // The normal scene path uses return-remapped h.z and would double-flip them.
   if(mode==='courierTurn'&&h.type==='courierGirder')continue;
   scene.push({z:h.z,draw:()=>xenoTunnelScene?xenoNest.clipCoreToDepth(h.z,()=>drawHazard(h)):tunnelScene?clipTunnelToDepth(h.z,()=>drawHazard(h)):drawHazard(h)})
 }
 for(const f of fighters)if(!f.dead&&f.t>=0){const fd=camPoint([f.x,f.y,f.z])[2];if(fd>.18)scene.push({z:fd,draw:()=>f.bugKind?drawAgentXSpaceBug(f,objectHitColor(f,f.col)):drawMesh(f,f.mesh,objectHitColor(f,f.col))})}
 if(!entryMode)for(const g of groundTargets){if(g.dead||g.dying)continue;if(g.type==='reactor'&&!g.active&&(relZ(reactorBoundaryWorld)>34||g.z>50))continue;if(tunnelScene&&g.wallMount&&!bunkerRaid.wallGunSupportVisible(g))continue;const gd=(tunnelScene||xenoTunnelScene)?g.z:camPoint([g.x,g.y,g.z])[2];if(gd>.18)scene.push({z:gd,draw:()=>xenoTunnelScene?xenoNest.clipCoreToDepth(g.z,()=>drawGroundTarget(g)):tunnelScene?clipTunnelToDepth(g.z,()=>drawGroundTarget(g)):drawGroundTarget(g)})};
 if(mode==='play'&&phase==='surface'&&bunkerRaid.active)bunkerRaid.appendTeslaScene(scene);
 if(mode==='play'&&phase==='surface'&&surfaceBunkerActive){const bz=entryBunkerZ();surfaceDestination.appendWorldObject(scene,{x:entryBunkerX,y:-2.2,worldZ:travel+bz,draw:()=>drawDistantBunker(bz,clamp(.48+(397-Math.min(397,surfaceBunkerDistance()))/440,.48,.86),entryBunkerX)})}
 asteroidWreckRun?.appendScene?.(scene);
 freeTradersDepot?.appendScene?.(scene);
 salvageRecovery.appendScene(scene);
 scene.sort((a,b)=>b.z-a.z);for(const it of scene)it.draw();asteroidField.drawTargetMarkers?.();courier?.drawNavigationMarker?.();if(stationDelivery?.active&&phase==='space'&&(stationDelivery.state==='approach'||stationDelivery.state==='clearedApproach'))stationDelivery.drawNavigation();for(const b of bolts)if(!b.dead){if(xenoTunnelScene)xenoNest.clipCoreToDepth(b.z,()=>drawBolt(b));else if(tunnelScene)clipTunnelToDepth(b.z,()=>drawBolt(b));else drawBolt(b)}drawPlayerMissiles();drawFX();if(xenoNest.active)xenoNest.drawOverlay();salvageRecovery.drawMarker();asteroidWreckRun?.drawMarker?.();freeTradersDepot?.drawMarker?.();bunkerRaid.drawNavigation();bunkerRaid.drawTeslaArcs();drawShots();drawFighterAimHealth();
 if(!ambientFreeFlight){
   if(mode!=='idle'&&mode!=='dead'&&mode!=='missionTransit'&&mode!=='spaceTransfer'&&mode!=='abandonExit'&&mode!=='missionExit'&&mode!=='recoveryPickup'&&mode!=='securityCheckpoint'&&!forest?.autopilotActive?.()&&!asteroidWreckRun?.autopilotActive?.()&&!freeTradersDepot?.autopilotActive?.()&&mode!=='courierDock'&&mode!=='courierDelivery'&&mode!=='courierTurn'&&mode!=='courierExitZoom'&&mode!=='bunkerCircuitryPickup'&&mode!=='bunkerTurn'&&mode!=='bunkerSurfaceClear'&&mode!=='osdDelivery'&&mode!=='jackalPenthouse'&&mode!=='jackalDelivery'&&mode!=='jackalExitZoom'&&mode!=='urbanPickupAuto'&&mode!=='urbanTurn'&&mode!=='stationEntry'&&mode!=='stationInterior'&&mode!=='stationDeparture'&&mode!=='stationPad'&&mode!=='stationPadDeparture')reticle();
   topHud();cockpit();drawOffscreenFighterChevrons();
   if(mode==='idle')idle();
   if(flash>0){ctx.strokeStyle=C.r;ctx.lineWidth=VECTOR_LINE_WIDTH;ctx.strokeRect(3,3,W-6,viewH-6)}
   if(paused){ctx.strokeStyle=C.w;ctx.lineWidth=VECTOR_LINE_WIDTH;ctx.textAlign='center';ctx.font='400 26px Consolas,monospace';ctx.strokeText('PAUSED',W*.5,viewH*.45);ctx.textAlign='left'}
 }
 ctx.restore();if(!gateVisible()&&!campaign.isOpen())gpuBloom.render(canvas,glowStrength/100);else gpuBloom.clear();if(!gateVisible()&&fullscreenActive()&&!campaign.isOpen())update(dt);requestAnimationFrame(render)
}
}

