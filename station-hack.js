'use strict';
// Crossroads secure-terminal mission support.
// Crossroads Outpost is keeper audition model 07. The model remains ordinary
// hidden-line mesh data; gameplay adds only the docking aperture and minefield.
const crossroadsOutpostMesh={"name":"Crossroads Outpost","v":[[0.572805,0.237264,-0.72],[0.237264,0.572805,-0.72],[-0.237264,0.572805,-0.72],[-0.572805,0.237264,-0.72],[-0.572805,-0.237264,-0.72],[-0.237264,-0.572805,-0.72],[0.237264,-0.572805,-0.72],[0.572805,-0.237264,-0.72],[0.572805,0.237264,0.72],[0.237264,0.572805,0.72],[-0.237264,0.572805,0.72],[-0.572805,0.237264,0.72],[-0.572805,-0.237264,0.72],[-0.237264,-0.572805,0.72],[0.237264,-0.572805,0.72],[0.572805,-0.237264,0.72],[0.702148,0.290839,-0.35],[0.290839,0.702148,-0.35],[-0.290839,0.702148,-0.35],[-0.702148,0.290839,-0.35],[-0.702148,-0.290839,-0.35],[-0.290839,-0.702148,-0.35],[0.290839,-0.702148,-0.35],[0.702148,-0.290839,-0.35],[0.702148,0.290839,0.35],[0.290839,0.702148,0.35],[-0.290839,0.702148,0.35],[-0.702148,0.290839,0.35],[-0.702148,-0.290839,0.35],[-0.290839,-0.702148,0.35],[0.290839,-0.702148,0.35],[0.702148,-0.290839,0.35],[0.277164,0.114805,0.72],[0.114805,0.277164,0.72],[-0.114805,0.277164,0.72],[-0.277164,0.114805,0.72],[-0.277164,-0.114805,0.72],[-0.114805,-0.277164,0.72],[0.114805,-0.277164,0.72],[0.277164,-0.114805,0.72],[0.277164,0.114805,1.18],[0.114805,0.277164,1.18],[-0.114805,0.277164,1.18],[-0.277164,0.114805,1.18],[-0.277164,-0.114805,1.18],[-0.114805,-0.277164,1.18],[0.114805,-0.277164,1.18],[0.277164,-0.114805,1.18],[0.258686,0.107151,-1.12],[0.107151,0.258686,-1.12],[-0.107151,0.258686,-1.12],[-0.258686,0.107151,-1.12],[-0.258686,-0.107151,-1.12],[-0.107151,-0.258686,-1.12],[0.107151,-0.258686,-1.12],[0.258686,-0.107151,-1.12],[0.258686,0.107151,-0.72],[0.107151,0.258686,-0.72],[-0.107151,0.258686,-0.72],[-0.258686,0.107151,-0.72],[-0.258686,-0.107151,-0.72],[-0.107151,-0.258686,-0.72],[0.107151,-0.258686,-0.72],[0.258686,-0.107151,-0.72],[0.58,-0.09,0.04],[1.62,-0.09,0.04],[0.58,0.09,0.04],[1.62,0.09,0.04],[0.58,-0.09,0.2],[1.62,-0.09,0.2],[0.58,0.09,0.2],[1.62,0.09,0.2],[2.772474,0.239407,0.07],[2.349258,0.577979,0.07],[1.750742,0.577979,0.07],[1.327526,0.239407,0.07],[1.327526,-0.239407,0.07],[1.750742,-0.577979,0.07],[2.349258,-0.577979,0.07],[2.772474,-0.239407,0.07],[2.772474,0.239407,0.17],[2.349258,0.577979,0.17],[1.750742,0.577979,0.17],[1.327526,0.239407,0.17],[1.327526,-0.239407,0.17],[1.750742,-0.577979,0.17],[2.349258,-0.577979,0.17],[2.772474,-0.239407,0.17],[1.5,-0.21,0.07],[1.72,-0.21,0.07],[1.5,0.21,0.07],[1.72,0.21,0.07],[1.5,-0.21,0.17],[1.72,-0.21,0.17],[1.5,0.21,0.17],[1.72,0.21,0.17],[0.09,0.58,-0.13],[0.09,1.62,-0.13],[-0.09,0.58,-0.13],[-0.09,1.62,-0.13],[0.09,0.58,0.03],[0.09,1.62,0.03],[-0.09,0.58,0.03],[-0.09,1.62,0.03],[0.722474,2.289407,-0.1],[0.299258,2.627979,-0.1],[-0.299258,2.627979,-0.1],[-0.722474,2.289407,-0.1],[-0.722474,1.810593,-0.1],[-0.299258,1.472021,-0.1],[0.299258,1.472021,-0.1],[0.722474,1.810593,-0.1],[0.722474,2.289407,0.0],[0.299258,2.627979,0.0],[-0.299258,2.627979,0.0],[-0.722474,2.289407,0.0],[-0.722474,1.810593,0.0],[-0.299258,1.472021,0.0],[0.299258,1.472021,0.0],[0.722474,1.810593,0.0],[0.21,1.5,-0.1],[0.21,1.72,-0.1],[-0.21,1.5,-0.1],[-0.21,1.72,-0.1],[0.21,1.5,0.0],[0.21,1.72,0.0],[-0.21,1.5,0.0],[-0.21,1.72,0.0],[-0.58,0.09,0.08],[-1.62,0.09,0.08],[-0.58,-0.09,0.08],[-1.62,-0.09,0.08],[-0.58,0.09,0.24],[-1.62,0.09,0.24],[-0.58,-0.09,0.24],[-1.62,-0.09,0.24],[-1.327526,0.239407,0.11],[-1.750742,0.577979,0.11],[-2.349258,0.577979,0.11],[-2.772474,0.239407,0.11],[-2.772474,-0.239407,0.11],[-2.349258,-0.577979,0.11],[-1.750742,-0.577979,0.11],[-1.327526,-0.239407,0.11],[-1.327526,0.239407,0.21],[-1.750742,0.577979,0.21],[-2.349258,0.577979,0.21],[-2.772474,0.239407,0.21],[-2.772474,-0.239407,0.21],[-2.349258,-0.577979,0.21],[-1.750742,-0.577979,0.21],[-1.327526,-0.239407,0.21],[-1.5,0.21,0.11],[-1.72,0.21,0.11],[-1.5,-0.21,0.11],[-1.72,-0.21,0.11],[-1.5,0.21,0.21],[-1.72,0.21,0.21],[-1.5,-0.21,0.21],[-1.72,-0.21,0.21],[-0.09,-0.58,-0.22],[-0.09,-1.62,-0.22],[0.09,-0.58,-0.22],[0.09,-1.62,-0.22],[-0.09,-0.58,-0.06],[-0.09,-1.62,-0.06],[0.09,-0.58,-0.06],[0.09,-1.62,-0.06],[0.722474,-1.810593,-0.19],[0.299258,-1.472021,-0.19],[-0.299258,-1.472021,-0.19],[-0.722474,-1.810593,-0.19],[-0.722474,-2.289407,-0.19],[-0.299258,-2.627979,-0.19],[0.299258,-2.627979,-0.19],[0.722474,-2.289407,-0.19],[0.722474,-1.810593,-0.09],[0.299258,-1.472021,-0.09],[-0.299258,-1.472021,-0.09],[-0.722474,-1.810593,-0.09],[-0.722474,-2.289407,-0.09],[-0.299258,-2.627979,-0.09],[0.299258,-2.627979,-0.09],[0.722474,-2.289407,-0.09],[-0.21,-1.5,-0.19],[-0.21,-1.72,-0.19],[0.21,-1.5,-0.19],[0.21,-1.72,-0.19],[-0.21,-1.5,-0.09],[-0.21,-1.72,-0.09],[0.21,-1.5,-0.09],[0.21,-1.72,-0.09],[0.78,-0.11,-0.15],[0.83,-0.11,-0.15],[0.78,0.11,-0.15],[0.83,0.11,-0.15],[0.78,-0.11,0.15],[0.83,-0.11,0.15],[0.78,0.11,0.15],[0.83,0.11,0.15]],"e":[[0,1],[0,7],[0,8],[1,2],[1,9],[2,3],[2,10],[3,4],[3,11],[4,5],[4,12],[5,6],[5,13],[6,7],[6,14],[7,15],[8,9],[8,15],[9,10],[10,11],[11,12],[12,13],[13,14],[14,15],[16,17],[16,23],[16,24],[17,18],[17,25],[18,19],[18,26],[19,20],[19,27],[20,21],[20,28],[21,22],[21,29],[22,23],[22,30],[23,31],[24,25],[24,31],[25,26],[26,27],[27,28],[28,29],[29,30],[30,31],[32,33],[32,39],[32,40],[33,34],[33,41],[34,35],[34,42],[35,36],[35,43],[36,37],[36,44],[37,38],[37,45],[38,39],[38,46],[39,47],[40,41],[40,47],[41,42],[42,43],[43,44],[44,45],[45,46],[46,47],[48,49],[48,55],[48,56],[49,50],[49,57],[50,51],[50,58],[51,52],[51,59],[52,53],[52,60],[53,54],[53,61],[54,55],[54,62],[55,63],[56,57],[56,63],[57,58],[58,59],[59,60],[60,61],[61,62],[62,63],[64,65],[64,66],[64,68],[65,67],[65,69],[66,67],[66,70],[67,71],[68,69],[68,70],[69,71],[70,71],[72,73],[72,79],[72,80],[73,74],[73,81],[74,75],[74,82],[75,76],[75,83],[76,77],[76,84],[77,78],[77,85],[78,79],[78,86],[79,87],[80,81],[80,87],[81,82],[82,83],[83,84],[84,85],[85,86],[86,87],[88,89],[88,90],[88,92],[89,91],[89,93],[90,91],[90,94],[91,95],[92,93],[92,94],[93,95],[94,95],[96,97],[96,98],[96,100],[97,99],[97,101],[98,99],[98,102],[99,103],[100,101],[100,102],[101,103],[102,103],[104,105],[104,111],[104,112],[105,106],[105,113],[106,107],[106,114],[107,108],[107,115],[108,109],[108,116],[109,110],[109,117],[110,111],[110,118],[111,119],[112,113],[112,119],[113,114],[114,115],[115,116],[116,117],[117,118],[118,119],[120,121],[120,122],[120,124],[121,123],[121,125],[122,123],[122,126],[123,127],[124,125],[124,126],[125,127],[126,127],[128,129],[128,130],[128,132],[129,131],[129,133],[130,131],[130,134],[131,135],[132,133],[132,134],[133,135],[134,135],[136,137],[136,143],[136,144],[137,138],[137,145],[138,139],[138,146],[139,140],[139,147],[140,141],[140,148],[141,142],[141,149],[142,143],[142,150],[143,151],[144,145],[144,151],[145,146],[146,147],[147,148],[148,149],[149,150],[150,151],[152,153],[152,154],[152,156],[153,155],[153,157],[154,155],[154,158],[155,159],[156,157],[156,158],[157,159],[158,159],[160,161],[160,162],[160,164],[161,163],[161,165],[162,163],[162,166],[163,167],[164,165],[164,166],[165,167],[166,167],[168,169],[168,175],[168,176],[169,170],[169,177],[170,171],[170,178],[171,172],[171,179],[172,173],[172,180],[173,174],[173,181],[174,175],[174,182],[175,183],[176,177],[176,183],[177,178],[178,179],[179,180],[180,181],[181,182],[182,183],[184,185],[184,186],[184,188],[185,187],[185,189],[186,187],[186,190],[187,191],[188,189],[188,190],[189,191],[190,191],[192,193],[192,194],[192,196],[193,195],[193,197],[194,195],[194,198],[195,199],[196,197],[196,198],[197,199],[198,199]],"faces":[[0,1,9,8],[1,2,10,9],[2,3,11,10],[3,4,12,11],[4,5,13,12],[5,6,14,13],[6,7,15,14],[7,0,8,15],[7,6,5,4,3,2,1,0],[8,9,10,11,12,13,14,15],[16,17,25,24],[17,18,26,25],[18,19,27,26],[19,20,28,27],[20,21,29,28],[21,22,30,29],[22,23,31,30],[23,16,24,31],[23,22,21,20,19,18,17,16],[24,25,26,27,28,29,30,31],[32,33,41,40],[33,34,42,41],[34,35,43,42],[35,36,44,43],[36,37,45,44],[37,38,46,45],[38,39,47,46],[39,32,40,47],[39,38,37,36,35,34,33,32],[40,41,42,43,44,45,46,47],[48,49,57,56],[49,50,58,57],[50,51,59,58],[51,52,60,59],[52,53,61,60],[53,54,62,61],[54,55,63,62],[55,48,56,63],[55,54,53,52,51,50,49,48],[56,57,58,59,60,61,62,63],[64,65,67,66],[68,70,71,69],[64,68,69,65],[66,67,71,70],[64,66,70,68],[65,69,71,67],[72,73,81,80],[73,74,82,81],[74,75,83,82],[75,76,84,83],[76,77,85,84],[77,78,86,85],[78,79,87,86],[79,72,80,87],[79,78,77,76,75,74,73,72],[80,81,82,83,84,85,86,87],[88,89,91,90],[92,94,95,93],[88,92,93,89],[90,91,95,94],[88,90,94,92],[89,93,95,91],[96,97,99,98],[100,102,103,101],[96,100,101,97],[98,99,103,102],[96,98,102,100],[97,101,103,99],[104,105,113,112],[105,106,114,113],[106,107,115,114],[107,108,116,115],[108,109,117,116],[109,110,118,117],[110,111,119,118],[111,104,112,119],[111,110,109,108,107,106,105,104],[112,113,114,115,116,117,118,119],[120,121,123,122],[124,126,127,125],[120,124,125,121],[122,123,127,126],[120,122,126,124],[121,125,127,123],[128,129,131,130],[132,134,135,133],[128,132,133,129],[130,131,135,134],[128,130,134,132],[129,133,135,131],[136,137,145,144],[137,138,146,145],[138,139,147,146],[139,140,148,147],[140,141,149,148],[141,142,150,149],[142,143,151,150],[143,136,144,151],[143,142,141,140,139,138,137,136],[144,145,146,147,148,149,150,151],[152,153,155,154],[156,158,159,157],[152,156,157,153],[154,155,159,158],[152,154,158,156],[153,157,159,155],[160,161,163,162],[164,166,167,165],[160,164,165,161],[162,163,167,166],[160,162,166,164],[161,165,167,163],[168,169,177,176],[169,170,178,177],[170,171,179,178],[171,172,180,179],[172,173,181,180],[173,174,182,181],[174,175,183,182],[175,168,176,183],[175,174,173,172,171,170,169,168],[176,177,178,179,180,181,182,183],[184,185,187,186],[188,190,191,189],[184,188,189,185],[186,187,191,190],[184,186,190,188],[185,189,191,187],[192,193,195,194],[196,198,199,197],[192,196,197,193],[194,195,199,198],[192,194,198,196],[193,197,199,195]]};

const stationProximityMineMesh={
  name:'Spiked Tetra Proximity Mine',
  v:[[.57735,.57735,.57735],[-.57735,-.57735,.57735],[-.57735,.57735,-.57735],[.57735,-.57735,-.57735],[1.155,1.155,1.155],[-1.155,-1.155,1.155],[-1.155,1.155,-1.155],[1.155,-1.155,-1.155]],
  e:[[0,1],[0,2],[0,3],[1,2],[1,3],[2,3],[0,4],[1,5],[2,6],[3,7]],
  faces:[[0,2,1],[0,1,3],[0,3,2],[1,2,3]]
};
const stationMineBodyFaces=[[0,2,1],[0,1,3],[0,3,2],[1,2,3]];

class StationHackController {
  constructor(){this.reset()}
  reset(){
    this.active=false;this.stage=null;this.mines=[];this.shards=[];this.t=0;this.escape=false;
    this.docking=false;this.pendingDockDelta=[0,0,0];this.deactivated=false;this.exitFieldPrepared=false;this.interiorFieldCaptured=false;
    this.triggerRadius=15.5;this.blastRadius=22;this.mineScale=2.15;this.armingDelay=.22;
    this.maxCascadeDepth=2;this.cascadeFanout=4;this.maxShards=360;this.fieldCount=42;this.lastExplosionSound=-999;this.playerMineShots=0;
    // Crossroads sits inside an invisible physical exclusion sphere. Mines are not
    // hidden or deleted at the boundary: their trajectories bend around it.
    this.exclusionMargin=12;this.exclusionInfluence=28;
    this.dataPackets=[];this.dataSpawnT=0;this.dataActive=false;this.dataDraining=false;this.difficulty=2
  }
  prepare(stage){
    this.reset();this.active=true;this.stage=stage||{};
    this.triggerRadius=Math.max(5,Number(stage?.mineTriggerRadius)||15.5);
    this.blastRadius=Math.max(this.triggerRadius+3,Number(stage?.mineBlastRadius)||22);
    this.fieldCount=Math.max(24,Math.min(64,Math.round(Number(stage?.mineCount)||38)));
    this.difficulty=clamp(Number(stage?.difficulty)||Number(campaign?.currentMission?.risk)||2,1,9)
  }
  cameraPointToWorld(local){return asteroidField.cameraPointToWorld(local)}
  beginApproach(stage=this.stage){
    if(!this.active||stage!==this.stage)this.prepare(stage);
    this.stage=stage||this.stage;this.escape=false;this.docking=false;this.deactivated=false;this.exitFieldPrepared=false;this.interiorFieldCaptured=false;
    this.pendingDockDelta=[0,0,0];this.mines.length=0;this.shards.length=0;
    // One continuous asteroid-style stream. Crossroads is a destination embedded in
    // that field; docking does not replace it with a second local mine population.
    this.seedApproachField(this.fieldCount)
  }
  beginDocking(){
    // Do not capture, retire or recolour mines here.  The asteroid-delivery belt
    // remains present while its autopilot docks; the mine version must do the same.
    this.docking=true;this.pendingDockDelta=[0,0,0]
  }
  endDocking(){this.docking=false;this.pendingDockDelta=[0,0,0]}
  queueDockTranslation(delta){
    if(!delta)return;
    this.pendingDockDelta[0]+=delta[0]||0;this.pendingDockDelta[1]+=delta[1]||0;this.pendingDockDelta[2]+=delta[2]||0
  }
  makeMine(){
    const signed=(lo,hi)=>(lo+Math.random()*(hi-lo))*(Math.random()<.5?-1:1);
    return{
      type:'stationMine',objective:true,hitFx:0,dying:0,
      x:0,y:0,z:0,
      rot:[Math.random()*Math.PI*2,Math.random()*Math.PI*2,Math.random()*Math.PI*2],
      spin:[signed(.30,.72),signed(.26,.68),signed(.24,.62)],
      s:this.mineScale*(.88+Math.random()*.24),state:'live',armT:0,cascadeDepth:0,dead:false,retired:false,
      vx:0,vy:0,vz:0,offscreenT:0,closestD:Infinity,awaitingRecycle:false,trajectoryKind:'fragment',
      recycles:0,isDanger:false,deactivated:false,exclusionSide:Math.random()<.5?-1:1,exclusionDeflected:false,
      playerShot:false,retaliationLevel:0,
      exitScenery:false,interiorScenery:false,interiorX:0,interiorY:0,interiorZ:0,interiorVX:0,interiorVY:0,interiorVZ:0
    }
  }
  mineCameraPoint(m){return camPoint([m.x,m.y,m.z])}
  embeddedMineSpawnProfile(){
    if(!stationDelivery?.active||stationDelivery.stationStyle!=='crossroads')return null;
    const q=camPoint([stationDelivery.station.x,stationDelivery.station.y,stationDelivery.station.z]);
    if(!q||q[2]<250)return null;
    // Broad destination-centred VOLUME, not a shell: mines begin both in front of
    // and behind Crossroads and then use the normal asteroid configured-pass motion.
    // The station is therefore physically inside the same moving field from the
    // long approach, even while it is beyond the ordinary asteroid 410-unit cap.
    const depth=q[2]*(.76+Math.random()*.56),scale=depth/Math.max(1,q[2]);
    return{
      depth,
      centreX:q[0]*scale,centreY:q[1]*scale,
      spreadX:Math.max(24,depth*.13),spreadY:Math.max(18,depth*.10),
      holdUntilVisible:true,
      holdUntilVisibleT:Math.max(6,depth/(OPEN_SPACE_CRUISE+28)*1.35)
    }
  }
  configureMineRun(m,band='far',forcedTTC=null,spawnProfile=null){
    asteroidField.difficulty=this.difficulty;
    // The pass types are the asteroid pass types.  Keep a small genuine collision
    // component so manual flight still requires avoidance rather than only scenery.
    const r=Math.random(),kind=r<.035?'collision':(r<.46?'near':'traffic');
    const ok=asteroidField.configureRun(m,band,false,forcedTTC,kind,spawnProfile);
    if(ok){
      m.state='live';m.armT=0;m.cascadeDepth=0;m.retired=false;m.dead=false;m.dying=0;m.hitFx=0;
      m.offscreenT=0;m.closestD=Infinity;m.awaitingRecycle=false;
      m.deactivated=this.deactivated;m.exitScenery=false;m.exclusionDeflected=false;m.playerShot=false;m.retaliationLevel=0
    }
    return ok
  }
  seedApproachField(count){
    for(let i=0;i<count;i++){
      const m=this.makeMine();this.mines.push(m);
      const u=(i+Math.random()*.72)/Math.max(1,count),band=u<.14?'incoming':'far';
      const ttc=band==='incoming'?1.55+u*5.0+Math.random()*.42:2.5+u*5.8+Math.random()*.48;
      // Keep most of the pool in the ordinary player-facing stream, while roughly
      // one quarter starts in a deep volume around the actual destination. They are
      // still the SAME finite mine pool and recycle through the SAME pass code.
      const deep=(i%4===0)?this.embeddedMineSpawnProfile():null;
      this.configureMineRun(m,deep?'far':band,ttc,deep)
    }
  }
  recycleMine(m){
    if(!m||m.dead||m.retired||m.exitScenery)return;
    // Just like asteroid delivery: once a body has genuinely completed its pass
    // off-screen, recycle it onto another far pass.  Docking is NOT a drain point.
    const deep=Math.random()<.24?this.embeddedMineSpawnProfile():null;
    this.configureMineRun(m,'far',2.8+Math.random()*5.0,deep)
  }
  exclusionRadius(){
    if(!stationDelivery?.active||stationDelivery.stationStyle!=='crossroads')return 0;
    return stationDelivery.hostClearanceRadius()+this.exclusionMargin
  }
  interiorExclusionCentre(){
    // Interior coordinates are door-local: +Z points into the station.  Crossroads'
    // centre is therefore this fixed offset inward from the authored nub doorway.
    return[-stationDelivery.doorX*stationDelivery.scale,
           -stationDelivery.doorY*stationDelivery.scale,
           -stationDelivery.doorZ*stationDelivery.scale]
  }
  steerAroundSphere(m,dt,{interior=false}={}){
    const radius=this.exclusionRadius();if(!radius||!m||m.dead||m.retired)return;
    const centre=interior?this.interiorExclusionCentre():[stationDelivery.station.x,stationDelivery.station.y,stationDelivery.station.z];
    const px=interior?'interiorX':'x',py=interior?'interiorY':'y',pz=interior?'interiorZ':'z';
    const vx=interior?'interiorVX':'vx',vy=interior?'interiorVY':'vy',vz=interior?'interiorVZ':'vz';
    let rx=m[px]-centre[0],ry=m[py]-centre[1],rz=m[pz]-centre[2];
    let dist=Math.hypot(rx,ry,rz);if(dist<.001){rx=1;ry=0;rz=0;dist=1}
    const influence=radius+this.exclusionInfluence;
    if(dist>=influence)return;
    const nx=rx/dist,ny=ry/dist,nz=rz/dist;
    let mx=m[vx]||0,my=m[vy]||0,mz=m[vz]||0,speed=Math.hypot(mx,my,mz);
    if(speed<.05)return;
    const radial=mx*nx+my*ny+mz*nz;
    // A mine already moving cleanly away from the protected volume needs no help.
    if(radial>=0&&dist>radius+2)return;

    // Once the mine reaches the influence shell, stop asteroid guidance from trying
    // to drag it back through the station.  It remains the same mine and keeps its
    // ordinary velocity/pass lifecycle after the deflection.
    if(!interior){m.guidanceLocked=true;m.exclusionDeflected=true}

    let tx=mx-radial*nx,ty=my-radial*ny,tz=mz-radial*nz,tl=Math.hypot(tx,ty,tz);
    if(tl<speed*.12){
      // Near-head-on trajectories need a stable side to pass.  Use the station's
      // orientation so the mine curves around the sphere instead of bouncing back.
      let axis=interior?[0,1,0]:stationDelivery.doorUpWorld();
      tx=axis[1]*nz-axis[2]*ny;ty=axis[2]*nx-axis[0]*nz;tz=axis[0]*ny-axis[1]*nx;
      tl=Math.hypot(tx,ty,tz);
      if(tl<.001){axis=interior?[1,0,0]:stationDelivery.doorRightWorld();tx=axis[1]*nz-axis[2]*ny;ty=axis[2]*nx-axis[0]*nz;tz=axis[0]*ny-axis[1]*nx;tl=Math.hypot(tx,ty,tz)||1}
      const side=m.exclusionSide||1;tx*=side;ty*=side;tz*=side
    }
    tx/=tl;ty/=tl;tz/=tl;
    const strength=clamp((influence-dist)/Math.max(1,this.exclusionInfluence),0,1);
    // Mostly tangential flow with a growing outward component as the mine nears the
    // sphere. This produces a curved pass, not a reflection off an invisible wall.
    const outward=.08+.48*strength,dx=tx+nx*outward,dy=ty+ny*outward,dz=tz+nz*outward,dl=Math.hypot(dx,dy,dz)||1;
    const wantX=dx/dl*speed,wantY=dy/dl*speed,wantZ=dz/dl*speed;
    const follow=1-Math.exp(-dt*(2.2+strength*7.5));
    m[vx]=lerp(mx,wantX,follow);m[vy]=lerp(my,wantY,follow);m[vz]=lerp(mz,wantZ,follow);

    // Numerical guard only: if a large frame step penetrates the sphere, put the
    // SAME mine back on the surface and preserve a tangential/outward velocity.
    if(dist<radius){
      const push=radius+.12;m[px]=centre[0]+nx*push;m[py]=centre[1]+ny*push;m[pz]=centre[2]+nz*push;
      mx=m[vx];my=m[vy];mz=m[vz];speed=Math.hypot(mx,my,mz)||speed;
      const inRad=mx*nx+my*ny+mz*nz;
      if(inRad<speed*.12){m[vx]+=nx*(speed*.12-inRad);m[vy]+=ny*(speed*.12-inRad);m[vz]+=nz*(speed*.12-inRad)}
    }
  }
  liveCount(){let n=0;for(const m of this.mines)if(!m.dead&&!m.retired&&!m.awaitingRecycle)n++;return n}
  armMine(m,delay=this.armingDelay,cascadeDepth=0){
    if(!m||m.dead||m.retired||m.deactivated)return false;
    const depth=clamp(Math.round(Number(cascadeDepth)||0),0,this.maxCascadeDepth);
    if(m.state==='armed'){
      m.armT=Math.min(m.armT,Math.max(.01,delay));m.cascadeDepth=Math.min(m.cascadeDepth,depth);return true
    }
    m.state='armed';m.armT=Math.max(.01,delay);m.cascadeDepth=depth;return true
  }
  hitMine(m,p=null){
    if(!m||m.dead||m.retired||m.dying)return false;
    if(m.deactivated){
      // Deactivated mines still take an ordinary weapon hit: use the same shared
      // white -> red hit flash as ships/asteroids, then the standard mesh
      // disintegration. They do NOT explode, cascade or throw mine shrapnel.
      m.hitFx=HIT_FX_TOTAL;m.dying=.10;m.deathPoint=p?{x:p.x,y:p.y}:null;
      if(p)spark(p.x,p.y,C.c,5);
      return true
    }
    if(p)spark(p.x,p.y,C.r,4);
    // Hidden FAFO escalation: clearing the field by shooting becomes progressively
    // more dangerous without advertising a special game rule to the player.
    this.playerMineShots++;
    m.playerShot=true;
    m.retaliationLevel=this.playerMineShots;
    this.explodeMine(m);
    return true
  }
  disintegrateMine(m){
    if(!m||m.dead)return;
    m.dead=true;m.dying=0;m.state='dead';
    const p=proj([m.x,m.y,m.z])||m.deathPoint||{x:W*.5,y:viewH*.5};
    // Reuse the normal ship/asteroid wireframe disintegration path.
    explodeMesh(m,stationProximityMineMesh,p,C.g)
  }
  deactivateMines(){
    // Successful hacking deactivates the SAME field. Nothing is removed or respawned
    // merely because its colour/state changes.
    this.deactivated=true;
    for(const m of this.mines)if(!m.dead&&!m.retired){m.deactivated=true;m.state='live';m.armT=0}
  }
  segmentHitsSphere(a,b,c,r){
    const vx=b[0]-a[0],vy=b[1]-a[1],vz=b[2]-a[2],wx=c[0]-a[0],wy=c[1]-a[1],wz=c[2]-a[2];
    const vv=vx*vx+vy*vy+vz*vz,t=vv>1e-9?clamp((wx*vx+wy*vy+wz*vz)/vv,0,1):0;
    const dx=a[0]+vx*t-c[0],dy=a[1]+vy*t-c[1],dz=a[2]+vz*t-c[2];
    return dx*dx+dy*dy+dz*dz<=r*r
  }
  randomShardDirection(){
    let x=Math.random()*2-1,y=Math.random()*2-1,z=Math.random()*2-1,n=Math.hypot(x,y,z);
    if(n<.001){x=1;y=0;z=0;n=1}
    return[x/n,y/n,z/n]
  }
  aimedShardDirection(from,target,spread=.14){
    const d=v3norm([target[0]-from[0],target[1]-from[1],target[2]-from[2]]),r=this.randomShardDirection();
    return v3norm([d[0]+r[0]*spread,d[1]+r[1]*spread,d[2]+r[2]*spread])
  }
  nearbyShardTargets(source,w,rangeMul=4.6,limit=8){
    // Prefer live mines close to the player. A shot mine therefore has a real chance
    // of throwing fragments into the dangerous part of the field rather than only
    // producing harmless radial scenery around the point of impact.
    return this.mines.filter(o=>o!==source&&!o.dead&&!o.retired&&!o.deactivated&&!o.interiorScenery&&
      Math.hypot(o.x-w[0],o.y-w[1],o.z-w[2])<=this.blastRadius*rangeMul)
      .sort((a,b)=>Math.hypot(a.x-shipX,a.y-shipY,a.z)-Math.hypot(b.x-shipX,b.y-shipY,b.z))
      .slice(0,limit)
  }
  spawnShrapnel(m,w){
    const retaliation=Math.max(0,Math.round(m.retaliationLevel||0)),directShot=!!m.playerShot;
    const player=[shipX,shipY,0],targets=this.nearbyShardTargets(m,w,directShot?5.2:3.6,directShot?8:5);
    // Normal detonations are already substantial. Player-shot mines become denser
    // each time the player tries to use shooting as a substitute for navigation.
    const extra=directShot?Math.min(14,retaliation*2):Math.min(6,retaliation);
    const count=18+extra+Math.floor(Math.random()*4);
    // At least two fragments from a deliberately shot mine are cheated onto a player
    // intercept. Repeated shooting silently increases that guaranteed consequence.
    const forcedPlayer=directShot?Math.min(6,2+Math.floor((retaliation-1)/2)):(retaliation>=4?1:0);
    const mineAimed=Math.min(targets.length,directShot?Math.min(8,3+retaliation):4);
    const sourceDist=Math.hypot(w[0]-player[0],w[1]-player[1],w[2]-player[2]);
    for(let i=0;i<count;i++){
      const face=stationMineBodyFaces[i%stationMineBodyFaces.length];
      const points=face.map(idx=>{const v=stationProximityMineMesh.v[idx];return rotate([v[0]*m.s,v[1]*m.s,v[2]*m.s],m.rot)});
      const c=[(points[0][0]+points[1][0]+points[2][0])/3,(points[0][1]+points[1][1]+points[2][1])/3,(points[0][2]+points[1][2]+points[2][2])/3];
      const shrink=.28+Math.random()*.52,local=points.map(q=>[(q[0]-c[0])*shrink,(q[1]-c[1])*shrink,(q[2]-c[2])*shrink]);
      let dir,speed,forced=false,forceHitT=0,forceSpeed=0;
      if(i<forcedPlayer){
        // These fragments visibly leave the mine towards the player. A small hidden
        // steering correction during flight guarantees the intended consequence even
        // if the player is manoeuvring; they are still rendered as ordinary tumbling
        // ballistic triangles and cannot be shot down.
        dir=this.aimedShardDirection(w,player,.025);
        forceHitT=.38+Math.min(.42,sourceDist/520)+i*.045+Math.random()*.045;
        forceSpeed=Math.max(52,sourceDist/Math.max(.24,forceHitT));
        speed=forceSpeed;forced=true
      }else if(i<forcedPlayer+mineAimed){
        const t=targets[(i-forcedPlayer)%targets.length];
        dir=this.aimedShardDirection(w,[t.x,t.y,t.z],.075);speed=36+Math.random()*24
      }else{
        dir=this.randomShardDirection();speed=22+Math.random()*28
      }
      this.shards.push({
        x:w[0]+c[0],y:w[1]+c[1],z:w[2]+c[2],vx:dir[0]*speed,vy:dir[1]*speed,vz:dir[2]*speed,
        rot:[0,0,0],spin:[(Math.random()-.5)*9,(Math.random()-.5)*9,(Math.random()-.5)*9],life:2.0+Math.random()*1.2,
        cascadeDepth:m.cascadeDepth||0,retaliationLevel:retaliation,sourceMine:m,
        forcedPlayerHit:forced,forceHitT,forceSpeed,
        mesh:{v:local,e:[[0,1],[1,2],[2,0]],faces:[[0,1,2]]}
      })
    }
    if(this.shards.length>this.maxShards)this.shards.splice(0,this.shards.length-this.maxShards)
  }
  guideForcedPlayerShard(shard,dt,sceneVelocity=[0,0,0]){
    if(!shard?.forcedPlayerHit||shard.life<=0)return;
    const dx=shipX-shard.x,dy=shipY-shard.y,dz=-shard.z,d=Math.hypot(dx,dy,dz)||1;
    const speed=Math.max(shard.forceSpeed||52,d/Math.max(.16,shard.forceHitT||.16));
    const wantX=sceneVelocity[0]+dx/d*speed,wantY=sceneVelocity[1]+dy/d*speed,wantZ=sceneVelocity[2]+dz/d*speed;
    const follow=1-Math.exp(-dt*11);
    shard.vx=lerp(shard.vx,wantX,follow);shard.vy=lerp(shard.vy,wantY,follow);shard.vz=lerp(shard.vz,wantZ,follow)
  }
  finishForcedPlayerShard(shard,dt){
    if(!shard?.forcedPlayerHit||shard.life<=0)return false;
    shard.forceHitT-=dt;
    if(shard.forceHitT>0)return false;
    shard.life=0;game.damage('MINE SHRAPNEL');return true
  }
  damageMineBlast(){
    // A mine blast is materially worse than an ordinary projectile hit.
    for(let i=0;i<2&&mode!=='dead';i++)game.damage('MINE BLAST')
  }
  explodeMine(m){
    if(!m||m.dead||m.retired||m.deactivated)return;
    const w=[m.x,m.y,m.z],depth=m.cascadeDepth||0;
    m.dead=true;m.state='dead';this.spawnShrapnel(m,w);
    if(this.t-this.lastExplosionSound>.055){SoundFX.explosion();this.lastExplosionSound=this.t}
    if(Math.hypot(w[0]-shipX,w[1]-shipY,w[2])<=this.blastRadius)this.damageMineBlast();
    if(depth>=this.maxCascadeDepth)return;
    let propagated=0;
    const cascadeLimit=Math.min(6,this.cascadeFanout+Math.floor(Math.max(0,(m.retaliationLevel||0)-1)/2));
    for(const other of this.mines){
      if(propagated>=cascadeLimit)break;
      if(other.dead||other.retired||other.deactivated||other===m||other.exitScenery)continue;
      const d=Math.hypot(other.x-w[0],other.y-w[1],other.z-w[2]);
      if(d<=this.blastRadius){
        other.playerShot=false;other.retaliationLevel=Math.max(other.retaliationLevel||0,m.retaliationLevel||0);
        this.armMine(other,.045+d*.004+Math.random()*.045,depth+1);propagated++
      }
    }
  }
  resolveShardImpact(shard,a,b){
    if(!shard||shard.life<=0)return;
    const player=[shipX,shipY,0];
    if(this.segmentHitsSphere(a,b,player,1.65)){
      shard.life=0;game.damage('MINE SHRAPNEL');return
    }
    if((shard.cascadeDepth||0)>=this.maxCascadeDepth)return;
    for(const other of this.mines){
      if(other===shard.sourceMine||other.dead||other.retired||other.deactivated||other.interiorScenery)continue;
      const r=Math.max(1.5,other.s*.95);
      if(this.segmentHitsSphere(a,b,[other.x,other.y,other.z],r)){
        shard.life=0;other.playerShot=false;
        other.retaliationLevel=Math.max(other.retaliationLevel||0,shard.retaliationLevel||0);
        other.cascadeDepth=Math.min(this.maxCascadeDepth,(shard.cascadeDepth||0)+1);this.explodeMine(other);return
      }
    }
  }
  interiorMineVisible(m,margin=70){
    if(!m||!m.interiorScenery)return false;
    const q=camPoint([m.interiorX,m.interiorY,m.interiorZ-travel]);
    if(q[2]<=.24)return false;
    const p=projectCam(q);if(!p)return false;
    const r=clamp(m.s*p.k*1.15,5,80);
    return p.x>=-margin-r&&p.x<=W+margin+r&&p.y>=-margin-r&&p.y<=viewH+margin+r
  }
  seedInteriorMine(m,{far=false}={}){
    if(!m||m.dead)return;
    // This is still the same mine pool. Recycling happens only after a body has gone
    // out of sight, exactly like the exterior asteroid stream. The doorway is at Z=0;
    // exterior space is negative Z in the canonical station-interior frame.
    const depth=far?(90+Math.random()*155):(10+Math.pow(Math.random(),.72)*235);
    const spreadX=10+depth*.40,spreadY=8+depth*.28;
    let x=(Math.random()-.5)*spreadX*2,y=(Math.random()-.5)*spreadY*2;
    // Do not seed a mine literally inside the physical doorway aperture. This is not
    // a clear radius around Crossroads; it only prevents an impossible mine embedded
    // in the hatch itself.
    if(depth<24&&Math.abs(x)<3.2&&Math.abs(y)<2.8)x+=(x<0?-1:1)*(4.5+Math.random()*4.5);
    const speed=10+Math.random()*14,t=Math.max(.45,depth/speed);
    const a=Math.random()*Math.PI*2,miss=8+Math.random()*22;
    const tx=Math.cos(a)*miss,ty=Math.sin(a)*miss*.78;
    m.interiorX=x;m.interiorY=y;m.interiorZ=-depth;
    // Out-of-sight recycling is allowed, but never seed a replacement inside the
    // station's protected sphere. The mine remains visible immediately beyond it.
    const ec=this.interiorExclusionCentre(),er=this.exclusionRadius()+2;
    const ex=m.interiorX-ec[0],ey=m.interiorY-ec[1],ez=m.interiorZ-ec[2],ed=Math.hypot(ex,ey,ez)||1;
    if(ed<er){const k=er/ed;m.interiorX=ec[0]+ex*k;m.interiorY=ec[1]+ey*k;m.interiorZ=ec[2]+ez*k}
    m.interiorVX=(tx-m.interiorX)/t;m.interiorVY=(ty-m.interiorY)/t;m.interiorVZ=speed;
    m.interiorScenery=true;m.exitScenery=false;m.awaitingRecycle=false;m.retired=false;
    m.guidanceLocked=true;m.intentSpeed=null;m.trajectoryKind='fragment';
    m.offscreenT=0;m.closestD=Infinity;m.state='live';m.armT=0;m.deactivated=this.deactivated
  }
  captureExteriorField(){
    if(this.interiorFieldCaptured)return;
    const centre=stationDelivery?.doorCentre?.();
    const r=stationDelivery?.doorRightWorld?.(),u=stationDelivery?.doorUpWorld?.(),f=stationDelivery?.doorInwardWorld?.();
    if(!centre||!r||!u||!f)return;
    // One field, one set of objects. Do not manufacture an interior/exit population.
    // Convert every still-live exterior mine into the fixed doorway frame exactly once.
    const d=this.pendingDockDelta||[0,0,0];
    for(const m of this.mines){
      m.interiorScenery=false;
      if(m.dead||m.retired||m.awaitingRecycle)continue;
      m.x-=d[0]||0;m.y-=d[1]||0;m.z-=d[2]||0;
      const rel=[m.x-centre[0],m.y-centre[1],m.z-centre[2]],vel=[m.vx||0,m.vy||0,m.vz||0];
      m.interiorX=v3dot(rel,r);m.interiorY=v3dot(rel,u);m.interiorZ=v3dot(rel,f);
      m.interiorVX=v3dot(vel,r);m.interiorVY=v3dot(vel,u);m.interiorVZ=v3dot(vel,f);
      m.interiorScenery=true;m.exitScenery=false;m.awaitingRecycle=false;m.retired=false;
      m.guidanceLocked=true;m.intentSpeed=null;m.trajectoryKind='fragment';
      m.offscreenT=0;m.closestD=Infinity;m.state='live';m.armT=0;m.deactivated=this.deactivated
    }
    this.pendingDockDelta=[0,0,0];
    this.interiorFieldCaptured=true;this.exitFieldPrepared=true
  }
  prepareExitField(force=false){
    // Kept for stage compatibility. There is no separately generated exit field.
    if(!this.interiorFieldCaptured)this.captureExteriorField()
  }
  visibleProximityCrossing(a,b,m,radius=null){
    // Swept segment/sphere test. A fast head-on mine cannot step from outside the
    // proximity radius to behind the player between frames. It only detonates if
    // the point where it ENTERS that radius is actually visible on screen.
    const c=[shipX,shipY,0],r=radius??(this.triggerRadius+m.s*.85);
    const sx=a[0]-c[0],sy=a[1]-c[1],sz=a[2]-c[2];
    const vx=b[0]-a[0],vy=b[1]-a[1],vz=b[2]-a[2],A=vx*vx+vy*vy+vz*vz;
    const C0=sx*sx+sy*sy+sz*sz-r*r;let t=null;
    if(C0<=0)t=0;
    else if(A>1e-9){
      const B=2*(sx*vx+sy*vy+sz*vz),disc=B*B-4*A*C0;
      if(disc>=0){
        const q=Math.sqrt(disc),t0=(-B-q)/(2*A),t1=(-B+q)/(2*A);
        if(t0>=0&&t0<=1)t=t0;else if(t1>=0&&t1<=1)t=t1
      }
    }
    if(t===null)return false;
    const w=[a[0]+vx*t,a[1]+vy*t,a[2]+vz*t],q=camPoint(w);
    if(q[2]<=.24)return false;
    const sp=projectCam(q);if(!sp)return false;
    return sp.x>=0&&sp.x<=W&&sp.y>=0&&sp.y<=viewH
  }
  updateInteriorField(dt){
    if(!this.interiorFieldCaptured)return;
    const recycleZ=this.exclusionRadius()+34;
    for(const m of this.mines){
      if(m.dead||!m.interiorScenery)continue;
      m.hitFx=Math.max(0,(m.hitFx||0)-dt);
      if(m.dying){m.dying-=dt;if(m.dying<=0){m.dead=true;m.state='dead'};continue}
      m.rot[0]+=m.spin[0]*dt;m.rot[1]+=m.spin[1]*dt;m.rot[2]+=m.spin[2]*dt;
      this.steerAroundSphere(m,dt,{interior:true});
      m.interiorX+=m.interiorVX*dt;m.interiorY+=m.interiorVY*dt;m.interiorZ+=m.interiorVZ*dt;
      this.steerAroundSphere(m,dt,{interior:true});
      // Keep the SAME mine pool streaming while inside. Once a mine has genuinely
      // cleared the doorway view volume and the protected station space, recycle it
      // in the same doorway coordinate frame rather than waiting until the player
      // is already outside to see mines again.
      const escaped=m.interiorZ>recycleZ||m.interiorZ<-285||Math.abs(m.interiorX)>185||Math.abs(m.interiorY)>145;
      if(escaped&&!this.interiorMineVisible(m,120))this.seedInteriorMine(m,{far:true});
    }
  }
  beginEscape(){
    this.escape=true;this.docking=false;this.pendingDockDelta=[0,0,0];this.shards.length=0;
    if(!this.interiorFieldCaptured)this.captureExteriorField();
    // This is the asteroid-delivery rule applied literally: the objects visible
    // through the exit already exist before crossing it, and the SAME objects are
    // carried across the threshold. Convert from the current outward-facing camera
    // frame while we are still inside; after view reset these coordinates project
    // identically on the first exterior frame.
    for(const m of this.mines){
      if(m.dead||!m.interiorScenery)continue;
      const p=[m.interiorX,m.interiorY,m.interiorZ-travel],q=camPoint(p);
      const v=cameraVectorToLocal([m.interiorVX,m.interiorVY,m.interiorVZ]);
      m.x=q[0];m.y=q[1];m.z=q[2];m.vx=v[0];m.vy=v[1];m.vz=v[2];
      m.interiorScenery=false;m.exitScenery=false;m.awaitingRecycle=false;m.retired=false;
      m.guidanceLocked=true;m.intentSpeed=null;m.trajectoryKind='fragment';
      m.offscreenT=0;m.closestD=Infinity;m.deactivated=this.deactivated;m.state='live';m.armT=0
    }
    this.interiorFieldCaptured=false;this.exitFieldPrepared=false
  }
  updateShard(shard,dt,moving){
    const before=[shard.x,shard.y,shard.z],sceneVelocity=moving?[spaceMoveX*OPEN_SPACE_CRUISE,spaceMoveY*OPEN_SPACE_CRUISE,spaceMoveZ*OPEN_SPACE_CRUISE]:[0,0,0];
    this.guideForcedPlayerShard(shard,dt,sceneVelocity);
    if(moving){
      shard.x+=(shard.vx-sceneVelocity[0])*dt;shard.y+=(shard.vy-sceneVelocity[1])*dt;shard.z+=(shard.vz-sceneVelocity[2])*dt
    }else{
      shard.x+=shard.vx*dt;shard.y+=shard.vy*dt;shard.z+=shard.vz*dt
    }
    shard.rot[0]+=shard.spin[0]*dt;shard.rot[1]+=shard.spin[1]*dt;shard.rot[2]+=shard.spin[2]*dt;shard.life-=dt;
    if(shard.life>0)this.resolveShardImpact(shard,before,[shard.x,shard.y,shard.z]);
    if(shard.life>0)this.finishForcedPlayerShard(shard,dt)
  }
  resetDataTransfer(){
    this.dataPackets.length=0;this.dataSpawnT=0;this.dataActive=false;this.dataDraining=false
  }
  makeDataPacket(u=0,groupSpeed=null){
    return{
      u:clamp(u,0,.995),x:(Math.random()*2-1)*.74,
      speed:groupSpeed??(.48+Math.random()*.14),
      side:.088+Math.random()*.028,
      col:Math.random()<.5?C.g:C.c
    }
  }
  makeDataPacketGroup(initial=false){
    const out=[],members=1+(Math.random()<.58?1:0)+(Math.random()<.18?1:0),baseSpeed=.49+Math.random()*.12;
    const baseU=initial?Math.random()*.72:0;
    for(let j=0;j<members;j++){
      const p=this.makeDataPacket(clamp(baseU+(Math.random()-.5)*(initial?.10:.025),0,.985),baseSpeed+(Math.random()-.5)*.025);
      // Members of a burst are approximately parallel in time, not locked to a
      // diagonal lane or a mechanically identical size.
      if(members>1)p.x=clamp(p.x+(j-(members-1)*.5)*(.10+Math.random()*.08),-.82,.82);
      out.push(p)
    }
    return out
  }
  spawnDataPacketGroup(initial=false){this.dataPackets.push(...this.makeDataPacketGroup(initial))}
  drawLineDisplay(projectPoint,{left=-.68,right=.68,bottom=-.50,top=.52,alarm=false,time=this.t}={}){
    // Canonical station-terminal pseudo-text display.  This is deliberately shared
    // by interior and exterior terminals so they use one visual language rather
    // than each mission inventing its own screen decoration.
    if(typeof projectPoint!=='function')return;
    const width=right-left,height=top-bottom,sx=width/1.36,sy=height/1.02;
    const rowSpan=Math.max(.001,height-.16*sy),rowTime=alarm?0:time*.48*sy;
    for(let row=0;row<7;row++){
      const y=bottom+.10*sy+((row*.137*sy+rowTime)%rowSpan),phase0=(row*.173+(alarm?0:time*.09))%1;
      for(let seg=0;seg<4;seg++){
        const x=left+.09*sx+((phase0+seg*.245)%1)*(width-.28*sx),len=(.09+.11*(.5+.5*Math.sin(row*2.7+seg*4.1)))*sx;
        const A=projectPoint(x,y),B=projectPoint(Math.min(right-.07*sx,x+len),y);
        if(A&&B)line(A.x,A.y,B.x,B.y,alarm?C.r:(seg%2?C.g:C.c),.82,.90)
      }
    }
  }
  drawDataRamp(source,target,packets,{sourceHalf=.90,targetHalf=.43}={}){
    // Shared secure-terminal transfer visual.  The ramp is a real 3-D plane whose
    // narrow/wide ends are supplied by the caller; square packets lie in that same
    // plane and naturally project as trapezia.  Reversing source/target reverses the
    // transfer without creating a second visual language.
    if(!source||!target)return;
    const dx=target[0]-source[0],dy=target[1]-source[1],dz=target[2]-source[2],dl=Math.hypot(dx,dy,dz)||1;
    const ux=dx/dl,uy=dy/dl,uz=dz/dl;
    // Lateral axis = camera-up cross ramp direction.  For the terminal's original
    // centred ramp this resolves exactly to camera X; angled sources simply rotate
    // the same plane toward the new endpoint.
    let lx=uz,lz=-ux,ll=Math.hypot(lx,lz);
    if(ll<.0001){lx=1;lz=0;ll=1}else{lx/=ll;lz/=ll}
    const rampPoint=(base,side,width)=>[base[0]+lx*side*width,base[1],base[2]+lz*side*width];
    const sL=rampPoint(source,-1,sourceHalf),sR=rampPoint(source,1,sourceHalf),tL=rampPoint(target,-1,targetHalf),tR=rampPoint(target,1,targetHalf);
    for(const packet of packets||[]){
      const e=ease(clamp(packet.u,0,1)),halfWidth=lerp(sourceHalf,targetHalf,e);
      const cx=lerp(source[0],target[0],e)+lx*packet.x*halfWidth;
      const cy=lerp(source[1],target[1],e);
      const cz=lerp(source[2],target[2],e)+lz*packet.x*halfWidth;
      const h=packet.side*.5;
      const pts=[
        [cx-lx*h-ux*h,cy-uy*h,cz-lz*h-uz*h],
        [cx+lx*h-ux*h,cy-uy*h,cz+lz*h-uz*h],
        [cx+lx*h+ux*h,cy+uy*h,cz+lz*h+uz*h],
        [cx-lx*h+ux*h,cy+uy*h,cz-lz*h+uz*h]
      ].map(projectCam);
      if(pts.every(Boolean))for(let i=0;i<4;i++)line(pts[i].x,pts[i].y,pts[(i+1)%4].x,pts[(i+1)%4].y,packet.col,1,1)
    }
  }
  startDataTransfer(){
    this.resetDataTransfer();this.dataActive=true;
    for(let i=0;i<5;i++)this.spawnDataPacketGroup(true);
    this.dataSpawnT=.10+Math.random()*.20
  }
  requestDataDrain(){this.dataDraining=true}
  dataTransferFinished(){return !!(this.dataActive&&this.dataDraining&&this.dataPackets.length===0)}
  updateDataTransfer(dt){
    if(!this.dataActive)return;
    for(let i=this.dataPackets.length-1;i>=0;i--){
      const p=this.dataPackets[i];p.u+=p.speed*dt;
      if(p.u>=1)this.dataPackets.splice(i,1)
    }
    const canSpawn=!this.dataDraining&&(stationDelivery?.state==='hack'||stationDelivery?.state==='secureTransfer')&&(stationDelivery.hackProgress||0)<.82;
    if(canSpawn){
      this.dataSpawnT-=dt;
      while(this.dataSpawnT<=0&&this.dataPackets.length<18){
        this.spawnDataPacketGroup(false);
        this.dataSpawnT+=.14+Math.random()*.34
      }
    }
  }
  update(dt){
    if(!this.active)return;this.t+=dt;
    const manualMoving=phase==='space'&&(stationDelivery.state==='approach'||stationDelivery.state==='hackEscape');
    const dockingMoving=phase==='space'&&this.docking&&stationDelivery.docking;
    const dockDelta=dockingMoving?this.pendingDockDelta:[0,0,0];
    this.pendingDockDelta=[0,0,0];

    if(phase!=='space'){
      this.updateInteriorField(dt);this.updateDataTransfer(dt);return
    }

    const shardCount=this.shards.length;
    for(let si=0;si<shardCount;si++){
      const shard=this.shards[si];
      if(dockingMoving){
        const before=[shard.x,shard.y,shard.z],sceneVelocity=dt>1e-6?[dockDelta[0]/dt,dockDelta[1]/dt,dockDelta[2]/dt]:[0,0,0];
        this.guideForcedPlayerShard(shard,dt,sceneVelocity);
        shard.x+=shard.vx*dt-dockDelta[0];shard.y+=shard.vy*dt-dockDelta[1];shard.z+=shard.vz*dt-dockDelta[2];
        shard.rot[0]+=shard.spin[0]*dt;shard.rot[1]+=shard.spin[1]*dt;shard.rot[2]+=shard.spin[2]*dt;shard.life-=dt;
        if(shard.life>0)this.resolveShardImpact(shard,before,[shard.x,shard.y,shard.z]);
        if(shard.life>0)this.finishForcedPlayerShard(shard,dt)
      }else this.updateShard(shard,dt,manualMoving)
    }
    for(let i=this.shards.length-1;i>=0;i--)if(this.shards[i].life<=0)this.shards.splice(i,1);

    for(const m of this.mines){
      if(m.dead||m.retired||m.exitScenery||m.interiorScenery)continue;
      m.hitFx=Math.max(0,(m.hitFx||0)-dt);
      // Deactivated mine destruction follows the normal lethal-hit cadence used by
      // asteroids: flash while it keeps moving, then disintegrate at its new position.
      if(m.dying){
        const before=[m.x,m.y,m.z];
        if(manualMoving)asteroidField.advanceTrackedStreamBody(m,dt,{playerRelative:true,parkAfterPass:false});
        else if(dockingMoving)asteroidField.advanceTrackedStreamBody(m,dt,{playerRelative:false,parkAfterPass:false,sceneDelta:dockDelta});
        else{m.x+=(m.vx||0)*dt;m.y+=(m.vy||0)*dt;m.z+=(m.vz||0)*dt}
        m.rot[0]+=m.spin[0]*dt;m.rot[1]+=m.spin[1]*dt;m.rot[2]+=m.spin[2]*dt;
        m.dying-=dt;if(m.dying<=0)this.disintegrateMine(m);continue
      }
      // Independent rotation remains visible during manual flight, autopilot and exit.
      m.rot[0]+=m.spin[0]*dt;m.rot[1]+=m.spin[1]*dt;m.rot[2]+=m.spin[2]*dt;
      // A destination-volume mine is allowed to remain off-screen while the player
      // turns toward distant Crossroads. Once it has appeared (or has clearly passed
      // its useful lifetime) it returns to the ordinary asteroid recycle rule.
      if(m.holdUntilVisible){
        m.holdUntilVisibleT=Math.max(0,(m.holdUntilVisibleT||0)-dt);
        const q=this.mineCameraPoint(m);
        if(asteroidField.asteroidVisible(m,90)||q[2]<38||m.holdUntilVisibleT<=0)m.holdUntilVisible=false
      }
      this.steerAroundSphere(m,dt);
      const before=[m.x,m.y,m.z];
      let parked=false;
      if(manualMoving){
        const res=asteroidField.advanceTrackedStreamBody(m,dt,{playerRelative:true,parkAfterPass:!m.holdUntilVisible});parked=res.parked
      }else if(dockingMoving){
        const res=asteroidField.advanceTrackedStreamBody(m,dt,{playerRelative:false,parkAfterPass:!m.holdUntilVisible,sceneDelta:dockDelta});parked=res.parked
      }else{
        m.x+=(m.vx||0)*dt;m.y+=(m.vy||0)*dt;m.z+=(m.vz||0)*dt
      }
      this.steerAroundSphere(m,dt);

      // Cascades use a very short stagger so a chain visibly propagates rather than
      // all detonating in one frame. Direct player proximity still detonates at once.
      if(m.state==='armed'){
        m.armT-=dt;if(m.armT<=0){this.explodeMine(m);continue}
      }
      // Direct proximity detonation: no warning state, no arming delay. The swept
      // test preserves the user's out-of-sight/out-of-mind rule while making a mine
      // on a visible collision course impossible to fly through harmlessly.
      if(!m.deactivated&&m.state==='live'&&this.visibleProximityCrossing(before,[m.x,m.y,m.z],m)){
        this.explodeMine(m);continue
      }
      if(m.deactivated&&m.state==='live'){
        const collisionRadius=m.s*1.05+1.35;
        if(this.visibleProximityCrossing(before,[m.x,m.y,m.z],m,collisionRadius)){
          game.damage('MINE IMPACT');
          m.hitFx=HIT_FX_TOTAL;m.dying=.10;
          continue
        }
      }
      if(parked)this.recycleMine(m)
    }
  }
  shotCandidate(aim,bestDistance=1e9){
    if(!this.active||phase!=='space')return null;let best=null,bd=bestDistance,bp=null;
    for(const m of this.mines){
      if(m.dead||m.dying||m.retired||m.exitScenery)continue;const p=proj([m.x,m.y,m.z]);if(!p)continue;
      const d=Math.hypot(aim.x-p.x,aim.y-p.y),r=clamp(m.s*p.k*2.05,14,72);if(d<r&&d<bd){best=m;bd=d;bp=p}
    }
    return best?{mine:best,distance:bd,point:bp}:null
  }
  drawShard(shard){
    const q=camPoint([shard.x,shard.y,shard.z]);if(q[2]<=.24)return;
    drawMesh({type:'stationMineShard',x:shard.x,y:shard.y,z:shard.z,s:1,rot:shard.rot},shard.mesh,C.r,clamp(shard.life/.32,0,1))
  }
  mineDrawColour(m){return objectHitColor(m,m.deactivated?C.g:C.r)}
  draw(pass='all'){
    if(!this.active||phase!=='space')return;
    const sc=camPoint([stationDelivery.station.x,stationDelivery.station.y,stationDelivery.station.z]),stationDepth=sc[2];
    for(const m of this.mines){
      if(m.dead||m.retired||m.awaitingRecycle||m.exitScenery||m.interiorScenery)continue;
      const q=this.mineCameraPoint(m);if(q[2]<=.24)continue;
      const far=q[2]>stationDepth;if(pass==='far'&&!far)continue;if(pass==='near'&&far)continue;
      drawMesh({type:'stationMine',x:m.x,y:m.y,z:m.z,s:m.s,rot:m.rot},stationProximityMineMesh,this.mineDrawColour(m),1)
    }
    for(const shard of this.shards){
      const q=camPoint([shard.x,shard.y,shard.z]);if(q[2]<=.24)continue;
      const far=q[2]>stationDepth;if(pass==='far'&&!far)continue;if(pass==='near'&&far)continue;this.drawShard(shard)
    }
  }
  drawInteriorVista(){
    if(!this.active||phase!=='stationInterior'||!this.interiorFieldCaptured)return;
    // These are the live exterior mine objects in the doorway coordinate frame.
    // The corridor's black geometry occludes them naturally; there is no clipped
    // rectangular backdrop and no separately generated return population.
    for(const m of this.mines){
      if(m.dead||!m.interiorScenery)continue;
      const x=m.interiorX,y=m.interiorY,z=m.interiorZ-travel,q=camPoint([x,y,z]);if(q[2]<=.24)continue;
      drawMesh({type:'stationMineVista',x,y,z,s:m.s,rot:m.rot},stationProximityMineMesh,objectHitColor(m,m.deactivated?C.g:C.r),1)
    }
  }
  drawTerminal(){
    if(!this.active||phase!=='stationInterior'||stationDelivery.interiorMode!=='hack')return;
    // Only the hostile Crossroads hack is an alarm/red state. Legitimate VOX
    // credential/data transfers stay in the established cyan/green secure palette.
    const L=stationDelivery.hackInteriorLayout?.()||{terminalZ:30.0},alarm=stationDelivery.terminalPurpose==='hack'&&stationDelivery.hackComplete,col=alarm?C.r:C.c,screenZ=L.terminalZ-travel,left=-.68,right=.68,top=.52,bottom=-.50;
    const corners=[[left,bottom,screenZ],[right,bottom,screenZ],[right,top,screenZ],[left,top,screenZ]],pp=corners.map(p=>proj(p));
    if(pp.every(Boolean)){fillPoly(pp);for(let i=0;i<4;i++)line(pp[i].x,pp[i].y,pp[(i+1)%4].x,pp[(i+1)%4].y,col,1,.98)}
    this.drawLineDisplay((x,y)=>proj([x,y,screenZ-.015]),{left,right,bottom,top,alarm,time:this.t});
    if(alarm&&!['hack','hackDrain'].includes(stationDelivery.state))return;
    if(!['hack','hackDrain','secureTransfer','secureDrain'].includes(stationDelivery.state))return;
    // The terminal and every other data-transfer interaction use this exact ramp
    // renderer.  Here the wide end is at the drone and the narrow end is at the
    // terminal; recorder recovery simply reverses those endpoints.
    this.drawDataRamp([0,-.62,.82],[0,.02,screenZ-.10],this.dataPackets,{sourceHalf:.90,targetHalf:.43})
  }
}
const stationHack=new StationHackController();
