'use strict';
class Camera {
  rx(p,a){const c=Math.cos(a),s=Math.sin(a);return[p[0],p[1]*c-p[2]*s,p[1]*s+p[2]*c]}
  ry(p,a){const c=Math.cos(a),s=Math.sin(a);return[p[0]*c+p[2]*s,p[1],-p[0]*s+p[2]*c]}
  rz(p,a){const c=Math.cos(a),s=Math.sin(a);return[p[0]*c-p[1]*s,p[0]*s+p[1]*c,p[2]]}
  rotate(p,r){p=rx(p,r[0]);p=ry(p,r[1]);return rz(p,r[2])}
  camPoint(p){
    const d=[p[0]-shipX,p[1]-shipY,p[2]];
    if(spaceFreeOrientationActive()){
      // Open-space steering uses an orthonormal camera basis rather than Euler
      // yaw/pitch. This prevents yaw degenerating into apparent roll near +/-90°
      // pitch when following vertical attacks. Cosmetic bank is applied only after
      // the true local axes have been resolved.
      let q=[v3dot(d,spaceRight),v3dot(d,spaceUp),v3dot(d,spaceForward)];
      q=rz(q,-viewRoll);
      return q
    }
    // Scripted/surface phases retain their established Euler camera behaviour.
    let q=d;
    q=ry(q,-viewYaw);
    q=rx(q,-viewPitch);
    q=rz(q,-viewRoll);
    return q
  }
  proj(p){const q=camPoint(p);if(q[2]<=.18)return null;const f=Math.min(W,viewH)*1.09;return{x:W*.5+q[0]*f/q[2],y:viewH*.48-q[1]*f/q[2],z:q[2],k:f/q[2]}}
  projectCam(q){if(q[2]<=.18)return null;const f=Math.min(W,viewH)*1.09;return{x:W*.5+q[0]*f/q[2],y:viewH*.48-q[1]*f/q[2],z:q[2],k:f/q[2]}}
  clipWorldPolyNear(worldPts,near=.42){
 // Sutherland-Hodgman clip in camera space. This is used for large fixed
 // architectural faces that can legitimately straddle the camera near plane.
 // Projecting first and merely dropping null corners produces huge skewed polygons.
 let q=worldPts.map(camPoint),out=[];
 for(let i=0;i<q.length;i++){
   const a=q[i],b=q[(i+1)%q.length],ain=a[2]>near,bin=b[2]>near;
   if(ain)out.push(a);
   if(ain!==bin){
     const t=(near-a[2])/(b[2]-a[2]);
     out.push([lerp(a[0],b[0],t),lerp(a[1],b[1],t),near]);
   }
 }
 return out.map(projectCam).filter(Boolean)
}
}

