'use strict';
class RedJackalDeliveryController {
  constructor(){this.reset()}
  reset(){
    this.active=false;this.stage=null;this.state='idle';this.buildings=[];this.traffic=[];this.seed=0x4a41434b;
    // v210: city rendering caches are mission-local and rebuilt only when a new
    // city is generated. The detailed building meshes are static, so measuring
    // their bounds / classifying their faces every frame was pure overhead.
    this.cityMeshCache=new WeakMap();this.visibleBuildings=[];
    this.cityLength=620;this.targetWorldZ=620;this.groundY=-3.45;this.hatchY=10.2;this.streetHalf=4.2;
    this.hatchOpen=0;this.deliveryT=0;this.deliveryAnnounced=false;this.cargoProgress=0;
    this.roomEntryStartTravel=0;this.roomEntryTargetTravel=0;this.turnT=0;this.turnDir=1;this.exitTargetTravel=0;this.exitT=0;
    this.departureT=0;this.departureStartYaw=0;this.departureStartY=0;
    this.autoStartTravel=0;this.autoStartX=0;this.autoStartY=0;this.navPulse=0;
    this.trafficHitCD=0;this.trafficSerial=1;this.civilianIncidents=0;this.civilianShots=0;this.civilianCollisions=0;this.civilianRebukeCD=0;this.civilianIncidentCD=0;
    // v209: a cheat-stage jump can start the cinematic planet descent while
    // Freeze objectives is enabled. Carry that bypass until the descent really
    // hands off to the city, rather than losing it when the button handler returns.
    this.forceDescentAdvance=false;
    // Generic urban-courier state. The same city/traffic renderer now supports
    // ground pickups and outbound traversal without knowing anything about the
    // Red Jackal penthouse mission.
    this.cityPurpose='penthouse';this.pickupWorldZ=365;this.pickupSide=-1;this.pickupX=-3.12;this.pickupY=this.groundY+.78;
    this.pickupStopWorldZ=0;this.pickupT=0;this.pickupCargoProgress=0;this.pickupSecured=false;
    this.outboundEnd=-118;this.cityEdgeWorldZ=0;this.exitTrees=[];this.sideStreets=[];this.exitTreeHitCD=0;
    this.outboundMergeStartTravel=0;this.outboundMergeEndTravel=0;this.outboundMergeStartX=0;this.outboundRoadX=0
  }
  rand(){this.seed=(Math.imul(this.seed,1664525)+1013904223)>>>0;return this.seed/4294967296}
  prepare(stage){
    this.reset();this.active=true;this.stage=stage||{};this.cityPurpose='penthouse';this.cityLength=Math.max(500,Number(stage?.cityLength)||620);this.targetWorldZ=this.cityLength
  }
  prepareUrbanPickup(stage){
    this.reset();this.active=true;this.stage=stage||{};this.cityPurpose='pickup';
    this.cityLength=Math.max(460,Number(stage?.cityLength)||540);
    this.pickupWorldZ=clamp(Number(stage?.pickupWorldZ)||365,240,this.cityLength-55);
    this.pickupSide=Number(stage?.pickupSide)<0?-1:1;
    this.pickupX=this.pickupSide*3.12;this.pickupY=this.groundY+.82;
    this.pickupStopWorldZ=this.pickupWorldZ-1.55;this.targetWorldZ=this.pickupWorldZ
  }
  manualCityState(){return this.state==='city'||this.state==='cityPickup'||this.state==='cityOutbound'}
  customsActive(){return this.active&&this.state==='customs'}
  pickDroneMesh(index=0){
    const list=globalThis.AgentXPlanetaryDrones?.list||[];
    return list.length?list[Math.abs(index)%list.length]:pickEnemyFighterMesh()
  }
  flatPenthouseMesh(raw){
    // v213: purpose-built destination tower. The v205 audition mesh had a side
    // delivery pod; v212 removed it by deleting a broad vertex region, which also
    // amputated parts of the real upper floor. Build a conventional closed tower
    // instead, with a full-width penthouse wall and no protruding bay.
    const v=[],e=[],faces=[],edgeSet=new Set();
    const V=(x,y,z)=>{v.push([x,y,z]);return v.length-1};
    const E=(a,b)=>{const k=a<b?a+':'+b:b+':'+a;if(!edgeSet.has(k)){edgeSet.add(k);e.push([a,b])}};
    const box=(x0,x1,y0,y1,z0,z1)=>{
      const b=v.length;[[x0,y0,z0],[x1,y0,z0],[x1,y1,z0],[x0,y1,z0],[x0,y0,z1],[x1,y0,z1],[x1,y1,z1],[x0,y1,z1]].forEach(q=>v.push(q));
      [[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]].forEach(q=>E(b+q[0],b+q[1]));
      faces.push([b,b+1,b+2,b+3],[b+4,b+7,b+6,b+5],[b,b+4,b+5,b+1],[b+3,b+2,b+6,b+7],[b+1,b+5,b+6,b+2],[b,b+3,b+7,b+4]);
    };
    const windows=(x0,x1,y0,y1,z,cols=4)=>{
      const a=V(x0,y0,z),b=V(x1,y0,z),c=V(x1,y1,z),d=V(x0,y1,z);E(a,b);E(b,c);E(c,d);E(d,a);
      for(let i=1;i<cols;i++){const x=lerp(x0,x1,i/cols),q0=V(x,y0,z),q1=V(x,y1,z);E(q0,q1)}
    };
    box(-1.10,1.10,0,5.80,-.88,.88);
    box(-.92,.92,5.80,7.00,-.82,.82);
    // Deliberately broad/deep penthouse floor: the delivery door is now simply
    // a rectangular opening in this normal wall, with plenty of wall around it.
    box(-.88,.88,7.00,8.25,-.82,.82);
    box(-.34,.34,8.25,8.62,-.30,.30);
    const mast0=V(0,8.62,0),mast1=V(0,9.25,0);E(mast0,mast1);
    for(const yy of [[.72,1.05],[1.78,2.11],[2.84,3.17],[3.90,4.23],[4.96,5.29]]){
      windows(-.82,.82,yy[0],yy[1],-.882,4);windows(-.82,.82,yy[0],yy[1],.882,4)
    }
    windows(-.67,.67,6.08,6.42,-.822,3);windows(-.67,.67,6.08,6.42,.822,3);
    return{name:'Penthouse Tower',id:'penthouseflat',family:'cityBuilding',v,e,faces,
      cityWidth:2.20,cityHeight:9.25,cityDepth:1.764,penthouseDoorY:7.625,penthouseDoorFrontZ:-.82,
      penthouseDoorHalfW:.54,penthouseDoorHalfH:.46}
  }
  beginCustoms(){
    if(!this.active)this.prepare(campaign.currentStage());
    this.state='customs';scenarioFlow.startFighterStage(this.stage||campaign.currentStage(),'customs')
  }
  beginPlanetRun(){
    if(!this.active||this.state!=='customs')return;
    this.state='descent';
    fighters.length=0;bolts.length=0;resetSpaceDogfightDirector();
    say('CUSTOMS CLEAR',.75);beginApproach()
  }
  buildCity(){
    this.buildings.length=0;this.seed=0x4a41434b;
    const all=globalThis.AgentXCityBuildings?.list||[];
    const penthouseSource=globalThis.AgentXCityBuildings?.get?.('penthousehatchtower')||all.find(m=>m.name==='Penthouse Hatch Tower')||null;
    const penthouse=this.flatPenthouseMesh(penthouseSource);
    const street=all.filter(m=>m!==penthouseSource);
    const pick=()=>street.length?street[Math.floor(this.rand()*street.length)]:null;
    const make=(wz,h,col=C.g,mesh=pick())=>{
      if(!mesh)return{worldZ:wz,w:4,d:6,h,col,mesh:null,scale:1};
      const scale=h/Math.max(.001,mesh.cityHeight||6);
      return{worldZ:wz,h,col,mesh,scale,w:(mesh.cityWidth||3)*scale,d:(mesh.cityDepth||2)*scale}
    };
    const addSide=(side,wz,h,col=C.g,mesh=pick(),depthRow=0)=>{
      const b=make(wz,h,col,mesh),gap=.55+depthRow*(1.4+this.rand()*2.0);
      b.x=side*(this.streetHalf+gap+b.w*.5+depthRow*(b.w*.45+1.0));
      this.buildings.push(b);return b
    };

    // v208: treat the city as a broad metropolis rather than a narrow strip of
    // towers painted onto a finite grid. Continue it far behind the penthouse and
    // populate several lateral depth rows so climbing never exposes an empty edge.
    for(let wz=30;wz<this.targetWorldZ+520;wz+=13+this.rand()*5){
      if(Math.abs(wz-this.targetWorldZ)<34)continue;
      const downtown=clamp((Math.min(wz,this.targetWorldZ)-85)/355,0,1);
      for(let side=-1;side<=1;side+=2){
        const h=lerp(7.5,16.5,downtown)+this.rand()*8.5;
        const roll=this.rand(),col=roll>.94?C.y:(roll>.79?C.w:C.g);
        addSide(side,wz+(this.rand()-.5)*3.2,h,col,pick(),0);
        if(this.rand()<(downtown>.30?.78:.55))
          addSide(side,wz+2+(this.rand()-.5)*4,9+this.rand()*15,C.gd,pick(),1);
        if(this.rand()<(downtown>.46?.54:.32))
          addSide(side,wz-2+(this.rand()-.5)*5,8+this.rand()*16,C.gd,pick(),2);
        if(downtown>.58&&this.rand()<.24)
          addSide(side,wz+4+(this.rand()-.5)*6,10+this.rand()*18,C.gd,pick(),3)
      }
    }

    // v246: cheap city depth. The player still flies the authored main avenue, but
    // regular cross-street mouths and simple outer blocks make it read as one road
    // through a larger grid rather than the entire city being a single corridor.
    // The extra blocks are intentionally plain closed cuboids: silhouette/depth for
    // very little hidden-line cost.
    this.sideStreets.length=0;
    this.sideStreets.push({worldZ:8,halfWidth:4.4,exit:true});
    const crossLimit=Math.max(90,this.targetWorldZ-58);
    for(let cz=78;cz<crossLimit;cz+=82){
      const z=cz+(this.rand()-.5)*8;if(Math.abs(z-this.targetWorldZ)<50)continue;
      const halfWidth=4.2;this.sideStreets.push({worldZ:z,halfWidth,exit:false});
      // Open a genuine gap in the near frontage on both sides.
      this.buildings=this.buildings.filter(b=>!(Math.abs(b.worldZ-z)<halfWidth+2.5&&Math.abs(b.x)<this.streetHalf+14));
      for(let side=-1;side<=1;side+=2){
        for(let j=0;j<3;j++){
          const x=side*(this.streetHalf+11+j*9.2+this.rand()*2.0);
          for(let bank=-1;bank<=1;bank+=2){
            const h=8.5+this.rand()*15.5,w=5.0+this.rand()*3.8,d=5.5+this.rand()*4.5;
            const roll=this.rand(),col=roll>.93?C.w:(roll>.82?C.y:C.gd);
            this.buildings.push({x,worldZ:z+bank*(halfWidth+3.6+d*.5)+(this.rand()-.5)*1.8,h,w,d,col,mesh:null,scale:1})
          }
        }
      }
    }

    // v247: inexpensive metropolitan depth. Two parallel avenues sit well outside
    // the playable main road, with simple cuboid blocks beyond them. They are not
    // collision scenery and therefore add almost no gameplay complexity, but from
    // either direction the player now sees a CITY extending sideways instead of a
    // single row of buildings lining one corridor. Gaps are kept at the authored
    // cross streets so the road network reads as connected.
    const districtZMax=(this.cityPurpose==='pickup'?this.pickupWorldZ:this.targetWorldZ)+72;
    const nearCross=z=>this.sideStreets.some(r=>Math.abs(z-r.worldZ)<(r.halfWidth||4.2)+5.5);
    for(let z=24;z<districtZMax;z+=25+this.rand()*7){
      if(nearCross(z))continue;
      for(const side of [-1,1]){
        for(let row=0;row<2;row++){
          const x=side*(30+row*15+(this.rand()-.5)*3.0);
          const w=7.0+this.rand()*6.5,d=9.0+this.rand()*7.0,h=8.0+this.rand()*19.0;
          const roll=this.rand(),col=roll>.95?C.w:(roll>.86?C.y:C.gd);
          this.buildings.push({x,worldZ:z+(this.rand()-.5)*5.0,h,w,d,col,mesh:null,scale:1})
        }
      }
    }

    if(this.cityPurpose==='penthouse'){
      // The delivery tower is now part of the block rather than standing alone in
      // the middle of the road. Its front-facing hatch remains easy for the final
      // autopilot to read, but neighbouring towers continue around it.
      const targetH=24.5,targetScale=penthouse?targetH/Math.max(.001,penthouse.cityHeight||9.25):1;
      const targetW=penthouse?(penthouse.cityWidth||2.44)*targetScale:8.2;
      const targetD=penthouse?(penthouse.cityDepth||1.7)*targetScale:7.0;
      const targetSide=1;
      this.targetTower={x:targetSide*(this.streetHalf+.72+targetW*.5),worldZ:this.targetWorldZ,h:targetH,col:C.y,mesh:penthouse,scale:targetScale,w:targetW,d:targetD};
      const doorY=penthouse?.penthouseDoorY??7.625,doorZ=penthouse?.penthouseDoorFrontZ??-.82;
      this.targetTower.hatchFrontOffset=doorZ*targetScale;
      this.targetTower.hatchHalfW=(penthouse?.penthouseDoorHalfW??.54)*targetScale;
      this.targetTower.hatchHalfH=(penthouse?.penthouseDoorHalfH??.46)*targetScale;
      this.hatchY=this.groundY+doorY*targetScale;
      this.buildings.push(this.targetTower);

      addSide(-1,this.targetWorldZ-22,15.5,C.g,pick(),1);
      addSide(-1,this.targetWorldZ-4,18.5,C.w,pick(),0);
      addSide(-1,this.targetWorldZ+12,22,C.g,pick(),1);
      addSide(-1,this.targetWorldZ+29,17.5,C.w,pick(),0);
      addSide(1,this.targetWorldZ-19,14.5,C.g,pick(),1);
      addSide(1,this.targetWorldZ+15,19.5,C.gd,pick(),1);
      addSide(1,this.targetWorldZ+32,25.5,C.g,pick(),1);
    }else{
      // Reusable ground-level collection building. This is deliberately a real
      // room in a city building, not a kerbside pad: the drone leaves the road,
      // enters the open bay, collects the cargo, turns around inside, then flies
      // back out to the same street for the outbound city traversal.
      const side=this.pickupSide||-1,w=10.8,d=13.4,h=9.6;
      this.targetTower={
        x:side*(this.streetHalf+.70+w*.5),worldZ:this.pickupWorldZ,h,w,d,col:C.w,mesh:null,scale:1,
        hatchFrontOffset:-d*.5-.02,hatchHalfW:2.55,hatchHalfH:2.05
      };
      this.hatchY=this.groundY+2.11;
      this.pickupX=this.targetTower.x;this.pickupY=this.hatchY;
      this.buildings.push(this.targetTower);
      addSide(-side,this.pickupWorldZ-24,15.0,C.g,pick(),1);
      addSide(-side,this.pickupWorldZ-7,18.5,C.w,pick(),0);
      addSide(-side,this.pickupWorldZ+19,20.5,C.gd,pick(),1);
      addSide(side,this.pickupWorldZ+28,16.0,C.g,pick(),1);
    }
    if(this.cityPurpose==='pickup')this.buildOutboundScenery();
    this.buildTraffic()
  }
  buildOutboundScenery(){
    this.exitTrees.length=0;
    const registry=globalThis.AgentXForestScenery,ids=['pineTall','pineBroad','pineYoung','pineDeadSparse'];
    for(let c=0;c<12;c++){
      // A few clumps sit close enough to the city boundary to be visible from deep
      // inside the outbound street, with progressively more across the plains.
      const centreZ=-8-c*16-this.rand()*8,side=this.rand()<.5?-1:1,centreX=side*(11+this.rand()*30),count=3+Math.floor(this.rand()*4);
      for(let i=0;i<count;i++){
        const id=ids[Math.floor(this.rand()*ids.length)],baseMesh=registry?.get?.(id)||(typeof forestSceneryMesh==='function'?forestSceneryMesh(id):null);if(!baseMesh)continue;
        // Healthy plains pines use the same clean trunk termination as healthy forest
        // trees: orange wood remains visible below the canopy, but never continues as
        // linework through the green foliage. Dead/special trees retain authored meshes.
        const mesh=forestShortTrunkMesh(baseMesh,id);
        const scale=.90+this.rand()*1.22,minY=Math.min(...baseMesh.v.map(v=>v[1]));
        this.exitTrees.push({assetId:id,mesh,x:centreX+(this.rand()-.5)*8,y:this.groundY-minY*scale,worldZ:centreZ+(this.rand()-.5)*8,s:scale,rot:[0,this.rand()*Math.PI*2,0],col:C.g,hit:false})
      }
    }
  }
  seedOutboundTraffic(){
    // Reuse the city's traffic on the return journey, but keep every vehicle
    // physically inside the city. The plains beyond world Z=0 are deliberately
    // traffic-free; otherwise cars looked as though they continued indefinitely
    // across open country after the player had left the streets.
    const edge=this.cityEdgeWorldZ+10;
    const available=Math.max(1,travel-42-edge);let i=0;
    for(const v of this.traffic){
      const t=(i+.35+this.rand()*.55)/Math.max(1,this.traffic.length);i++;
      v.dead=false;v.flybyPrev=null;v.incidentCounted=false;v.turningOut=false;v.turnT=0;
      v.worldZ=Math.max(edge,travel-32-t*available)
    }
  }
  buildTraffic(){
    this.traffic.length=0;this.trafficSerial=1;this.trafficHitCD=0;this.civilianRebukeCD=0;this.civilianIncidentCD=0;
    const lanes=[-2.35,-.78,.78,2.35];
    const manualEnd=this.cityPurpose==='pickup'?Math.max(220,this.pickupWorldZ-24):Math.max(160,this.targetWorldZ-132),count=this.cityPurpose==='pickup'?42:36;
    const minHover=.90,maxHover=9.25;
    for(let i=0;i<count;i++){
      const lane=i%lanes.length,sameDirection=lane<2;
      const worldZ=18+(manualEnd-26)*(i+.22+this.rand()*.56)/count;
      // Traffic stays brisk but is much less saturated than v207. The challenge
      // should come from reading 3-D crossing gaps, not from an unavoidable wall.
      const speed=sameDirection?(14.5+this.rand()*8.0):-(21.0+this.rand()*11.0);
      // v279 review cars keep their authored proportions. The old traffic system
      // independently randomised width / height / length, which would turn these
      // deliberately different silhouettes back into stretched variants of one another.
      const palette=[C.w,C.g,C.y,C.o];
      const carMeshes=globalThis.AgentXCivilianTraffic?.list||[];
      const mesh=carMeshes.length?carMeshes[Math.floor(this.rand()*carMeshes.length)]:null;
      let w,h,d,meshScale=1;
      if(mesh){
        // v280: keep each shortlisted car uniformly scaled, but never let its
        // authored width exceed the old traffic system's 1.16-unit maximum.
        // This preserves the silhouette without letting wide designs invade
        // neighbouring lanes or create false collision/placement problems.
        const authoredW=Math.max(.001,mesh.trafficWidth||1),authoredH=Math.max(.001,mesh.trafficHeight||.5),authoredD=Math.max(.001,mesh.trafficDepth||2);
        const targetD=1.85+this.rand()*.55,maxTrafficW=1.16;
        meshScale=targetD/authoredD;
        if(authoredW*meshScale>maxTrafficW)meshScale=maxTrafficW/authoredW;
        w=authoredW*meshScale;h=Math.max(.22,authoredH*meshScale);d=authoredD*meshScale;
      }else{
        w=.82+this.rand()*.34;h=.48+this.rand()*.26;d=1.75+this.rand()*1.15
      }
      // Uniform continuous altitude across the full manual flight envelope. No
      // discrete lanes/bands in Y: any height can contain traffic, and empty gaps remain.
      const hover=lerp(minHover,maxHover,this.rand());
      this.traffic.push({
        id:'civilian-'+(this.trafficSerial++),x:lanes[lane]+(this.rand()-.5)*.18,y:this.groundY+hover,
        worldZ,speed,w,h,d,meshScale,col:palette[Math.floor(this.rand()*palette.length)],sameDirection,mesh,
        flybyPrev:null,dead:false,incidentCounted:false,turningOut:false,turnT:0
      })
    }
  }
  registerCivilianIncident(kind,vehicle,screenPoint=null){
    if(!vehicle||vehicle.incidentCounted)return false;
    vehicle.incidentCounted=true;
    // A dense near-miss can touch more than one provisional cuboid almost at once.
    // Treat that as one incident rather than turning a single scrape into several fines.
    if(this.civilianIncidentCD>0)return false;
    this.civilianIncidents++;
    if(kind==='shot')this.civilianShots++;else if(kind==='collision')this.civilianCollisions++;
    this.civilianIncidentCD=1.25;
    if(this.civilianRebukeCD<=0){
      audio.playVoice('doNotAttackCivilians',{once:false,priority:true});
      this.civilianRebukeCD=1.15
    }
    if(screenPoint)spark(screenPoint.x,screenPoint.y,C.y,7);
    return true
  }
  civilianShotCandidate(a,maxDistance=1e9){
    if(!this.active||!(this.state==='city'||this.state==='cityPickup'||this.state==='cityOutbound'))return null;
    let hit=null,bd=maxDistance;
    for(const v of this.traffic){
      if(v.dead)continue;
      const z=v.worldZ-travel;if(z<=.25||z>120)continue;
      const p=proj([v.x,v.y,z]);if(!p)continue;
      const d=Math.hypot(a.x-p.x,a.y-p.y);
      const radius=clamp(Math.max(v.w,v.h)*p.k*.72+7,9,58);
      if(d<radius&&d<bd){bd=d;hit={vehicle:v,point:p,distance:d}}
    }
    return hit
  }
  hitCivilian(vehicle,screenPoint){
    if(!vehicle||vehicle.dead)return;
    this.registerCivilianIncident('shot',vehicle,screenPoint);
    // A laser hit knocks the civilian vehicle out of the active stream for now.
    // We still avoid adding a bespoke civilian-car explosion until that art is designed.
    vehicle.worldZ=travel-28;vehicle.flybyPrev=null
  }
  settlement(){
    const n=Math.max(0,this.civilianIncidents|0),shots=Math.max(0,this.civilianShots|0),collisions=Math.max(0,this.civilianCollisions|0);
    if(n<=0)return{incidents:0,shots,collisions,payMultiplier:1,repMultiplier:1,allowGift:true};
    if(n===1)return{incidents:n,shots,collisions,payMultiplier:.75,repMultiplier:.5,allowGift:false};
    if(n===2)return{incidents:n,shots,collisions,payMultiplier:.40,repMultiplier:0,allowGift:false};
    return{incidents:n,shots,collisions,payMultiplier:0,repMultiplier:0,allowGift:false}
  }
  updateTraffic(dt){
    this.trafficHitCD=Math.max(0,this.trafficHitCD-dt);this.civilianRebukeCD=Math.max(0,this.civilianRebukeCD-dt);this.civilianIncidentCD=Math.max(0,this.civilianIncidentCD-dt);
    if(!(this.state==='city'||this.state==='cityPickup'||this.state==='pickupApproach'||this.state==='cityOutbound'))return;
    const r=this.remaining(),outbound=this.state==='cityOutbound';
    for(const v of this.traffic){
      if(v.dead)continue;
      if(outbound&&v.turningOut){
        // At the city boundary cars take the visible cross street to the player's
        // left (+world X while looking outbound) instead of popping out of existence.
        v.turnT+=dt;const u=ease(clamp(v.turnT/.90,0,1));
        v.x+=lerp(5.0,13.5,u)*dt;v.worldZ-=lerp(.6,2.6,u)*dt;v.flybyPrev=null;
        if(v.turnT>1.65||v.x>this.streetHalf+18){v.dead=true;continue}
      }else v.worldZ+=v.speed*dt;
      let z=v.worldZ-travel;
      if(z<-22&&!outbound){
        if(r>150){
          const maxAhead=Math.max(52,Math.min(155,r-122));
          v.worldZ=travel+70+this.rand()*maxAhead;v.flybyPrev=null;v.incidentCounted=false;z=v.worldZ-travel
        }else{v.dead=true;continue}
      }else if(outbound&&z>22){
        // Once a returning vehicle passes the player, recycle it only if there is
        // still genuine city ahead. Never seed traffic beyond the city boundary.
        const remainingCity=travel-this.cityEdgeWorldZ;
        if(remainingCity>82){
          const maxAhead=Math.max(26,Math.min(130,remainingCity-42));
          const candidate=travel-58-this.rand()*maxAhead;
          if(candidate>this.cityEdgeWorldZ+8){
            v.worldZ=candidate;v.flybyPrev=null;v.incidentCounted=false;z=v.worldZ-travel
          }else{v.dead=true;continue}
        }else{v.dead=true;continue}
      }
      if(outbound&&!v.turningOut&&v.worldZ<=this.cityEdgeWorldZ+7){
        v.turningOut=true;v.turnT=0;v.worldZ=this.cityEdgeWorldZ+7;v.flybyPrev=null;continue
      }
      // Use a tighter collision core than the visible placeholder cuboid. v207's
      // generous bounds made careful threading register contacts that did not feel earned.
      const collisionEnabled=this.state==='city'||this.state==='cityPickup'||this.state==='cityOutbound';
      if(collisionEnabled&&z>-1.05&&z<1.10&&Math.abs(v.x-shipX)<(v.w*.5+.34)&&Math.abs(v.y-shipY)<(v.h*.5+.40)){
        if(this.trafficHitCD<=0){
          damage('CIVILIAN VEHICLE');this.registerCivilianIncident('collision',v);this.trafficHitCD=.92;
          if(mode==='dead')return
        }
        v.worldZ=travel-7;v.flybyPrev=null
      }
    }
  }
  trafficFlybyStates(dt){
    if(!this.active||!(this.state==='city'||this.state==='autopilot'||this.state==='entry'||this.state==='exit'||this.state==='cityPickup'||this.state==='pickupApproach'||this.state==='pickupEntry'||this.state==='pickupExit'||this.state==='outboundMerge'||this.state==='cityOutbound'))return[];
    const pms=audio?.flyby?.params;if(!pms)return[];
    const states=[],safeDt=Math.max(.001,dt||.016),distanceScale=pms.closestDistance/7.2;
    for(const v of this.traffic){
      if(v.dead)continue;
      const q=camPoint([v.x,v.y,v.worldZ-travel]);if(!q||q[2]<=.15)continue;
      const p=projectCam(q);if(!p)continue;
      const dist=Math.hypot(q[0],q[1],q[2]),normDistance=dist*distanceScale;
      const prev=v.flybyPrev;let radial=0,screenMotion=0;
      if(prev){radial=(prev.dist-dist)/safeDt;screenMotion=Math.hypot((p.x-prev.x)/Math.max(1,W),(p.y-prev.y)/Math.max(1,viewH))/safeDt}
      v.flybyPrev={x:p.x,y:p.y,dist};
      const relativeZ=Math.abs(forwardSpeed()-(v.speed||0));
      const relSpeed=clamp(relativeZ/22.5*pms.relativeSpeedReference,0,2);
      const motion=Math.max(Math.abs(radial)/22.5,screenMotion*.72);
      if(normDistance>pms.closeGate+.12||motion<.08)continue;
      const approach=clamp(radial/22.5,-1,1),pan=clamp(p.x/Math.max(1,W)*2-1,-1,1);
      const closeness=clamp(1-normDistance/(pms.closeGate+.12),0,1);
      states.push({id:v.id,distance:normDistance,pan,relSpeed,approach,motion,score:closeness*(.78+motion)*(1+relSpeed*.2)})
    }
    return states
  }
  drawCivilianCarFast(v,z){
    const mesh=v.mesh,baseYaw=v.sameDirection?Math.PI:0;
    const turnYaw=v.turningOut?lerp(baseYaw,Math.PI/2,ease(clamp((v.turnT||0)/.90,0,1))):baseYaw;
    if(!mesh){drawMesh({type:'civilianVehicle',x:v.x,y:v.y,z,s:.5,mx:v.w,my:v.h,mz:v.d,rot:[0,turnYaw,0]},courierFixtureBoxMesh,v.col,.96);return}
    // v211: traffic needs complete occlusion from above/below, but using the full
    // generic segmented hidden-line tester on dozens of small cars is unnecessary.
    // Render closed faces far-to-near as black masks, stroking each visible face
    // boundary as it is painted. Nearer faces naturally erase hidden rear edges.
    const uniform=v.meshScale>0?v.meshScale:null;
    const sx=uniform||v.w/Math.max(.001,mesh.trafficWidth||1),sy=uniform||v.h/Math.max(.001,mesh.trafficHeight||1),sz=uniform||v.d/Math.max(.001,mesh.trafficDepth||1);
    const rot=[0,turnYaw,0];
    const cam=mesh.v.map(q=>{const a=rotate([q[0]*sx,q[1]*sy,q[2]*sz],rot);return camPoint([a[0]+v.x,a[1]+v.y,a[2]+z])});
    const pts=cam.map(projectCam);
    const faces=(mesh.faces||[]).map(face=>{
      let depth=0,ok=true;const pp=[];
      for(const i of face){const c=cam[i],p=pts[i];if(!c||!p||c[2]<=.18){ok=false;break}depth+=c[2];pp.push(p)}
      return ok?{pp,depth:depth/face.length}:null
    }).filter(Boolean).sort((a,b)=>b.depth-a.depth);
    const alpha=clamp(1.12-z/92,.48,.96);
    ctx.save();ctx.lineJoin='round';ctx.lineCap='round';ctx.lineWidth=VECTOR_LINE_WIDTH;ctx.strokeStyle=v.col;ctx.fillStyle='#000';ctx.globalAlpha=alpha;
    for(const item of faces){
      const pp=item.pp;ctx.beginPath();ctx.moveTo(pp[0].x,pp[0].y);for(let i=1;i<pp.length;i++)ctx.lineTo(pp[i].x,pp[i].y);ctx.closePath();ctx.fill();ctx.stroke()
    }
    const faceEdge=new Set();
    for(const face of mesh.faces||[])for(let i=0;i<face.length;i++){const a=face[i],b=face[(i+1)%face.length];faceEdge.add(a<b?a+':'+b:b+':'+a)}
    ctx.globalAlpha=alpha*.92;
    for(const edge of mesh.e||[]){
      const key=edge[0]<edge[1]?edge[0]+':'+edge[1]:edge[1]+':'+edge[0];if(faceEdge.has(key))continue;
      const a=pts[edge[0]],b=pts[edge[1]];if(a&&b){ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke()}
    }
    ctx.restore()
  }
  drawTraffic(){
    const vis=[];for(const v of this.traffic){if(v.dead)continue;const z=v.worldZ-travel,d=camPoint([v.x,v.y,z])[2];if(d>.25&&d<125){v._cityDrawDepth=d;vis.push(v)}}
    vis.sort((a,b)=>b._cityDrawDepth-a._cityDrawDepth);for(const v of vis)this.drawCivilianCarFast(v,v.worldZ-travel)
  }
  beginUrbanPickup(stage=this.stage){
    if(!this.active||this.cityPurpose!=='pickup')this.prepareUrbanPickup(stage);
    const handoff=surfaceDestination?.consumeHandoff?.()||null;
    this.state='cityPickup';mode='play';phase='jackalCity';modeT=phaseT=0;travel=0;
    inputX=inputY=aimX=aimY=0;spaceYawVel=spacePitchVel=0;surfaceVX=surfaceVY=0;
    shipX=handoff?clamp(handoff.x,-2.6,2.6):0;shipY=handoff?clamp(handoff.y,this.groundY+.76,this.groundY+4.8):-.75;
    viewYaw=handoff?clamp(handoff.yaw,-.16,.16):0;viewPitch=handoff?clamp(handoff.pitch,-.10,.10):0;viewRoll=handoff?clamp(handoff.roll,-.12,.12):0;
    fighters.length=0;asteroids.length=0;groundTargets.length=0;bolts.length=0;hazards.length=0;shots.length=0;playerMissiles.length=0;
    this.pickupT=0;this.pickupCargoProgress=0;this.pickupSecured=false;this.navPulse=0;this.buildCity();
    audio.music.setMode('calm');audio.playVoice('avoidCivilianVehicles',{once:false,priority:true});say('GROUND PICKUP MARKED',.78)
  }
  beginPickupApproach(){
    if(!this.active||this.state!=='cityPickup')return;
    this.state='pickupApproach';mode='urbanPickupAuto';modeT=0;
    this.autoStartTravel=travel;this.autoStartX=shipX;this.autoStartY=shipY;
    // First settle onto the kerb-side lane; only cross the pavement/frontage in
    // the final clear approach zone. This prevents the old long diagonal spline
    // from cutting through an unrelated building on its way to the pickup door.
    this.pickupApproachLaneX=(this.pickupSide||-1)*2.55;
    inputX=inputY=aimX=aimY=0;viewRoll=0;say('PICKUP BAY AUTOPILOT',.65)
  }
  beginPickupRoomEntry(){
    if(!this.active||this.state!=='pickupApproach')return;
    const room=this.roomSpec();if(!room)return;
    this.state='pickupEntry';mode='urbanPickupAuto';modeT=0;this.hatchOpen=1;
    this.roomEntryStartTravel=travel;
    // Stop just inside the threshold rather than flying deep into the collection
    // room. The cargo now has a long, unobstructed tractor run like the asteroid
    // delivery and the player can still read the room as a real interior.
    this.roomEntryTargetTravel=room.frontZ+.62;
    inputX=inputY=aimX=aimY=0;viewYaw=viewPitch=viewRoll=0
  }
  beginPickupHold(){
    if(!this.active)return;const room=this.roomSpec();if(!room)return;
    this.state='pickupHold';mode='urbanPickupAuto';modeT=0;this.pickupT=0;this.pickupCargoProgress=0;this.hatchOpen=1;
    travel=this.roomEntryTargetTravel;shipX=room.x;shipY=this.hatchY;viewYaw=viewPitch=viewRoll=0
  }
  beginPickupTurn(){
    if(!this.active||this.state!=='pickupHold')return;
    this.state='pickupTurn';mode='urbanTurn';phase='jackalCity';modeT=0;this.turnT=0;this.hatchOpen=1;inputX=inputY=aimX=aimY=0
  }
  beginPickupRoomExit(){
    if(!this.active||this.state!=='pickupTurn')return;
    const room=this.roomSpec();if(!room)return;
    this.state='pickupExit';mode='urbanPickupAuto';phase='jackalCity';modeT=0;this.exitT=0;this.hatchOpen=1;
    this.exitTargetTravel=room.frontZ-7.2;viewYaw=Math.PI;viewPitch=0;viewRoll=0;inputX=inputY=aimX=aimY=0
  }
  beginUrbanExit(){
    if(!this.active||this.cityPurpose!=='pickup')return false;
    // Leaving the room puts the drone outside the doorway, not magically back in
    // the traffic lane. Use a short protected merge first, then return control on
    // the same road facing back towards the city edge.
    this.state='outboundMerge';mode='urbanPickupAuto';phase='jackalCity';modeT=0;
    this.seedOutboundTraffic();
    this.outboundMergeStartTravel=travel;this.outboundMergeEndTravel=travel-24;
    this.outboundMergeStartX=shipX;this.outboundRoadX=(this.pickupSide||-1)*2.30;
    inputX=inputY=aimX=aimY=0;viewYaw=Math.PI;viewPitch=0;viewRoll=0;say('CLEAR THE CITY',.72);return true
  }
  beginCity(){
    if(!this.active)return;
    if(this.stage?.cityLength){this.cityLength=Math.max(500,Number(this.stage.cityLength)||620);this.targetWorldZ=this.cityLength}
    const handoff=surfaceDestination?.consumeHandoff?.()||null;
    this.state='city';mode='play';phase='jackalCity';modeT=phaseT=0;travel=0;
    inputX=inputY=aimX=aimY=0;spaceYawVel=spacePitchVel=0;
    // Preserve the arrival attitude from a reusable destination-approach module.
    // Its final convergence already points down the city axis, so this hand-off is
    // continuous rather than a snap to a canned street pose.
    shipX=handoff?clamp(handoff.x,-2.6,2.6):0;
    shipY=handoff?clamp(handoff.y,this.groundY+.76,this.groundY+4.8):-.75;
    viewYaw=handoff?clamp(handoff.yaw,-.16,.16):0;
    viewPitch=handoff?clamp(handoff.pitch,-.10,.10):0;
    viewRoll=handoff?clamp(handoff.roll,-.12,.12):0;
    surfaceVX=surfaceVY=0;
    fighters.length=0;asteroids.length=0;groundTargets.length=0;bolts.length=0;hazards.length=0;shots.length=0;playerMissiles.length=0;
    this.hatchOpen=0;this.deliveryT=0;this.deliveryAnnounced=false;this.cargoProgress=0;this.navPulse=0;
    this.roomEntryStartTravel=0;this.roomEntryTargetTravel=0;this.turnT=0;this.exitTargetTravel=0;this.exitT=0;
    this.buildCity();audio.music.setMode('calm');audio.playVoice('avoidCivilianVehicles',{once:false,priority:true})
  }
  updateSteering(dt,magX,magY){
    if(!this.active||!this.manualCityState())return;
    // With the camera turned through 180 degrees the fixed world-X road coordinate
    // is mirrored on screen. Mirror only the positional target on the outbound leg
    // so reticle-right still moves the drone right on screen. Camera yaw itself
    // remains screen-relative and therefore keeps the normal sign.
    const outbound=this.state==='cityOutbound';
    const tx=(outbound?-magX:magX)*3.55,flightMin=this.groundY+.72,flightMax=this.groundY+9.45;
    const ty=(flightMin+flightMax)*.5-magY*(flightMax-flightMin)*.5;
    shipX=lerp(shipX,tx,clamp(dt*3.4,0,1));shipY=lerp(shipY,ty,clamp(dt*3.1,0,1));
    shipY=clamp(shipY,flightMin,flightMax);
    const baseYaw=outbound?Math.PI:0,targetYaw=wrapAngle(baseYaw+magX*.16);
    viewYaw=wrapAngle(viewYaw+wrapAngle(targetYaw-viewYaw)*clamp(dt*3.0,0,1));
    viewPitch=lerp(viewPitch,magY*.08,clamp(dt*3.0,0,1));
    // Reverse-road traversal is intentionally kept level. Banking a camera that is
    // already facing backwards produced the large persistent diagonal city view in
    // v243 and made traffic threading unnecessarily disorienting.
    viewRoll=lerp(viewRoll,outbound?0:-magX*.22,clamp(dt*3.8,0,1))
  }
  beginPenthouseApproach(){
    if(!this.active||this.state!=='city')return;
    this.state='autopilot';mode='jackalPenthouse';modeT=0;
    this.autoStartTravel=travel;this.autoStartX=shipX;this.autoStartY=shipY;
    inputX=inputY=aimX=aimY=0;shots.length=0;playerMissiles.length=0;
    say('PENTHOUSE AUTOPILOT',1.0)
  }
  remaining(){return Math.max(0,this.targetWorldZ-travel)}
  roomSpec(){
    const tower=this.targetTower;if(!tower)return null;
    const frontZ=tower.worldZ+(tower.hatchFrontOffset??-tower.d*.5)-.025;
    if(this.cityPurpose==='pickup'){
      const halfW=Math.max(2.55,tower.hatchHalfW||2.55),halfH=Math.max(2.05,tower.hatchHalfH||2.05),depth=7.55;
      const floorY=this.groundY+.06,ceilY=floorY+halfH*2;
      this.hatchY=(floorY+ceilY)*.5;
      return{x:tower.x,frontZ,backZ:frontZ+depth,halfW,halfH,floorY,ceilY,
        tableZ:frontZ+6.35,tableY:floorY+.86}
    }
    const halfW=1.78,halfH=Math.max(1.20,tower.hatchHalfH||1.20),depth=3.54;
    const floorY=this.hatchY-halfH,ceilY=this.hatchY+halfH;
    return{x:tower.x,frontZ,backZ:frontZ+depth,halfW,halfH,floorY,ceilY,
      tableZ:frontZ+2.78,tableY:floorY+.80}
  }
  forwardSpeed(){
    if(!this.active)return 0;
    if(this.state==='city'||this.state==='cityPickup')return 30.5;
    if(this.state==='pickupApproach'){
      const room=this.roomSpec();if(!room)return 0;
      const d=room.frontZ-travel;if(d<=2.35)return 0;
      return clamp((d-1.60)*.28,3.2,22.0)
    }
    if(this.state==='pickupEntry')return travel<this.roomEntryTargetTravel-.04?4.4:0;
    if(this.state==='pickupExit')return travel>this.exitTargetTravel+.04?-7.8:0;
    if(this.state==='outboundMerge')return travel>this.outboundMergeEndTravel+.04?-15.0:0;
    if(this.state==='cityOutbound')return-30.5;
    if(this.state==='autopilot'){
      const room=this.roomSpec();if(!room)return 0;
      const d=room.frontZ-travel;if(d<=2.35)return 0;
      return clamp((d-1.65)*.24,4.2,25.0)
    }
    if(this.state==='entry')return travel<this.roomEntryTargetTravel-.04?4.4:0;
    if(this.state==='exit')return travel>this.exitTargetTravel+.04?-7.8:0;
    if(this.state==='departure')return 0;
    return 0
  }
  beginRoomEntry(){
    if(!this.active||this.state!=='autopilot')return;
    const room=this.roomSpec();if(!room)return;
    this.state='entry';mode='jackalDelivery';modeT=0;this.hatchOpen=1;
    this.roomEntryStartTravel=travel;this.roomEntryTargetTravel=room.frontZ+1.06;
    inputX=inputY=aimX=aimY=0;viewYaw=viewPitch=viewRoll=0;
    say('DELIVERY HATCH',.75)
  }
  beginDelivery(){
    if(!this.active||this.state==='delivery')return;
    this.state='delivery';mode='jackalDelivery';modeT=0;this.deliveryT=0;this.hatchOpen=1;this.cargoProgress=0;this.deliveryAnnounced=false;
    inputX=inputY=aimX=aimY=0;viewYaw=viewPitch=viewRoll=0
  }
  beginPenthouseTurn(){
    if(!this.active||this.state!=='delivery')return;
    this.state='turn';mode='jackalDelivery';modeT=0;this.turnT=0;this.turnDir=Math.random()<.5?-1:1;this.hatchOpen=1;
    inputX=inputY=aimX=aimY=0
  }
  beginPenthouseExit(){
    if(!this.active||this.state!=='turn')return;
    const room=this.roomSpec();if(!room)return;
    this.state='exit';mode='jackalDelivery';modeT=0;this.exitT=0;this.hatchOpen=1;
    this.exitTargetTravel=room.frontZ-5.6;viewYaw=this.turnDir*Math.PI;viewPitch=0;viewRoll=0
  }
  finishPenthouseDelivery(){
    if(!this.active||this.state==='departure')return;
    // Gameplay piece is finished; ScenarioFlow chooses the terminal transition.
    if(campaign.currentMission){scenarioFlow.completeCurrentStage();return}
    this.beginMissionDeparture()
  }
  beginMissionDeparture(){
    if(!this.active||this.state==='departure')return false;
    // Common city/surface departure profile: announce completion in the live city,
    // pitch up in that same scene, then zoom only once the nose is vertical.
    this.state='departure';mode='jackalExitZoom';phase='jackalCity';modeT=0;this.departureT=0;
    this.departureStartYaw=viewYaw;this.departureStartPitch=viewPitch;this.departureStartX=shipX;this.departureStartY=shipY;
    // Keep the doorway open on the hand-off frame. It closes behind the drone while
    // the live-city pitch begins, so there is no stationary hatch-closing pause.
    this.hatchOpen=1;
    inputX=inputY=aimX=aimY=0;spaceYawVel=spacePitchVel=0;
    shots.length=0;playerMissiles.length=0;bolts.length=0;
    audio.playVoice('missionComplete',{once:true,priority:true});return true
  }
  update(dt){
    if(!this.active)return;
    this.navPulse+=dt;
    if(this.state==='cityPickup'){
      this.updateTraffic(dt);
      if(this.remaining()<=64)this.beginPickupApproach();
      return
    }
    if(this.state==='pickupApproach'){
      this.updateTraffic(dt);const room=this.roomSpec();if(!room)return;
      const toDoor=room.frontZ-travel;
      // Stage 1: remain on the street and settle into the pickup-side lane.
      // Stage 2: once inside the deliberately cleared frontage, move laterally
      // across to the door. No long diagonal path through the preceding block.
      const laneU=ease(clamp((travel-this.autoStartTravel)/20,0,1));
      const laneX=lerp(this.autoStartX,this.pickupApproachLaneX??((this.pickupSide||-1)*2.55),laneU);
      const doorU=ease(clamp((22-toDoor)/18,0,1));
      shipX=lerp(laneX,room.x,doorU);shipY=lerp(this.autoStartY,this.hatchY,ease(clamp((28-toDoor)/24,0,1)));
      viewYaw=lerp(viewYaw,0,clamp(dt*3.5,0,1));viewPitch=lerp(viewPitch,0,clamp(dt*3.5,0,1));viewRoll=lerp(viewRoll,0,clamp(dt*4,0,1));
      this.hatchOpen=clamp((24-toDoor)/15,0,1);
      if(toDoor<=2.35)this.beginPickupRoomEntry();return
    }
    if(this.state==='pickupEntry'){
      for(const v of this.traffic)if(!v.dead)v.worldZ+=v.speed*dt;
      const room=this.roomSpec();if(!room)return;
      shipX=lerp(shipX,room.x,clamp(dt*5,0,1));shipY=lerp(shipY,this.hatchY,clamp(dt*5,0,1));
      viewYaw=lerp(viewYaw,0,clamp(dt*5,0,1));viewPitch=lerp(viewPitch,0,clamp(dt*4,0,1));viewRoll=lerp(viewRoll,0,clamp(dt*5,0,1));this.hatchOpen=1;
      if(travel>=this.roomEntryTargetTravel-.04){travel=this.roomEntryTargetTravel;this.beginPickupHold()}return
    }
    if(this.state==='pickupHold'){
      for(const v of this.traffic)if(!v.dead)v.worldZ+=v.speed*dt;
      this.pickupT+=dt;this.hatchOpen=1;this.pickupCargoProgress=ease(clamp((this.pickupT-.45)/2.65,0,1));
      if(!this.pickupSecured&&this.pickupCargoProgress>=.999){this.pickupSecured=true;say('CARGO SECURED',.72)}
      if(this.pickupT>=3.85)this.beginPickupTurn();return
    }
    if(this.state==='pickupTurn'){
      for(const v of this.traffic)if(!v.dead)v.worldZ+=v.speed*dt;
      this.turnT+=dt;this.hatchOpen=1;const u=clamp(this.turnT/1.55,0,1),q=ease(u);viewYaw=q*Math.PI;viewRoll=-Math.sin(u*Math.PI)*.12;viewPitch=0;
      if(this.turnT>=1.75){viewYaw=Math.PI;viewRoll=0;this.beginPickupRoomExit()}return
    }
    if(this.state==='pickupExit'){
      for(const v of this.traffic)if(!v.dead)v.worldZ+=v.speed*dt;
      const room=this.roomSpec();if(!room)return;
      shipX=lerp(shipX,room.x,clamp(dt*5,0,1));shipY=lerp(shipY,this.hatchY,clamp(dt*5,0,1));
      viewYaw=lerp(viewYaw,Math.PI,clamp(dt*5,0,1));viewPitch=lerp(viewPitch,0,clamp(dt*4,0,1));viewRoll=lerp(viewRoll,0,clamp(dt*5,0,1));this.hatchOpen=1;
      if(travel<=this.exitTargetTravel+.04){travel=this.exitTargetTravel;scenarioFlow.completeCurrentStage()}return
    }
    if(this.state==='outboundMerge'){
      // Protected rejoin: keep the road level, move backwards away from the pickup
      // facade and slide onto the near lane before handing steering back to player.
      for(const v of this.traffic)if(!v.dead)v.worldZ+=v.speed*dt;
      const span=Math.max(.001,this.outboundMergeStartTravel-this.outboundMergeEndTravel);
      const u=ease(clamp((this.outboundMergeStartTravel-travel)/span,0,1));
      shipX=lerp(this.outboundMergeStartX,this.outboundRoadX,u);
      shipY=lerp(shipY,this.groundY+2.15,clamp(dt*2.8,0,1));
      viewYaw=Math.PI;viewPitch=lerp(viewPitch,0,clamp(dt*5,0,1));viewRoll=lerp(viewRoll,0,clamp(dt*6,0,1));
      this.hatchOpen=clamp(1-u*1.25,0,1);
      if(travel<=this.outboundMergeEndTravel){
        travel=this.outboundMergeEndTravel;shipX=this.outboundRoadX;viewYaw=Math.PI;viewPitch=viewRoll=0;
        this.state='cityOutbound';mode='play';modeT=0;inputX=inputY=aimX=aimY=0
      }
      return
    }
    if(this.state==='cityOutbound'){
      this.updateTraffic(dt);this.exitTreeHitCD=Math.max(0,this.exitTreeHitCD-dt);
      if(this.exitTreeHitCD<=0){
        for(const t of this.exitTrees){
          if(t.hit)continue;const dz=t.worldZ-travel,dx=t.x-shipX;
          const radius=.34+.34*t.s,top=this.groundY+4.8*t.s;
          if(Math.abs(dz)<1.15&&Math.abs(dx)<radius&&shipY<top){t.hit=true;this.exitTreeHitCD=.82;damage('TREE');if(mode==='dead')return;break}
        }
      }
      if(travel<=this.outboundEnd){travel=this.outboundEnd;scenarioFlow.completeCurrentStage()}return
    }
    if(this.state==='city'){
      this.updateTraffic(dt);
      if(this.remaining()<=138)this.beginPenthouseApproach();
      return
    }
    if(this.state==='autopilot'){
      for(const v of this.traffic)if(!v.dead)v.worldZ+=v.speed*dt;
      const room=this.roomSpec();if(!room)return;
      const d=Math.max(.001,room.frontZ-this.autoStartTravel),u=ease(clamp((travel-this.autoStartTravel)/Math.max(1,d-2.15),0,1));
      shipX=lerp(this.autoStartX,this.targetTower?.x||0,u);
      shipY=lerp(this.autoStartY,this.hatchY,u);
      viewYaw=lerp(viewYaw,0,clamp(dt*2.8,0,1));viewRoll=lerp(viewRoll,0,clamp(dt*3.2,0,1));
      viewPitch=lerp(viewPitch,-.025,clamp(dt*2.2,0,1));
      const toDoor=room.frontZ-travel;this.hatchOpen=clamp((24-toDoor)/15,0,1);
      if(toDoor<=2.35)this.beginRoomEntry();
      return
    }
    if(this.state==='entry'){
      for(const v of this.traffic)if(!v.dead)v.worldZ+=v.speed*dt;
      const room=this.roomSpec();if(!room)return;
      shipX=lerp(shipX,room.x,clamp(dt*5,0,1));shipY=lerp(shipY,this.hatchY,clamp(dt*5,0,1));
      viewYaw=lerp(viewYaw,0,clamp(dt*5,0,1));viewPitch=lerp(viewPitch,0,clamp(dt*4,0,1));viewRoll=lerp(viewRoll,0,clamp(dt*5,0,1));
      this.hatchOpen=1;
      if(travel>=this.roomEntryTargetTravel-.04){travel=this.roomEntryTargetTravel;this.beginDelivery()}
      return
    }
    if(this.state==='delivery'){
      this.deliveryT+=dt;this.hatchOpen=1;
      this.cargoProgress=ease(clamp((this.deliveryT-.55)/2.25,0,1));
      if(!this.deliveryAnnounced&&this.cargoProgress>=.999){
        this.deliveryAnnounced=true;audio.playVoice('deliveryComplete',{once:false,priority:true})
      }
      if(this.deliveryT>=4.05)this.beginPenthouseTurn();
      return
    }
    if(this.state==='turn'){
      this.turnT+=dt;this.hatchOpen=1;
      const u=clamp(this.turnT/1.78,0,1),q=ease(u);
      viewYaw=this.turnDir*q*Math.PI;viewRoll=-this.turnDir*Math.sin(u*Math.PI)*.12;viewPitch=0;
      if(this.turnT>=1.98)this.beginPenthouseExit();
      return
    }
    if(this.state==='exit'){
      for(const v of this.traffic)if(!v.dead)v.worldZ+=v.speed*dt;
      const room=this.roomSpec();if(!room)return;
      shipX=lerp(shipX,room.x,clamp(dt*3.4,0,1));shipY=lerp(shipY,this.hatchY,clamp(dt*3.4,0,1));
      viewYaw=this.turnDir*Math.PI;viewRoll=lerp(viewRoll,0,clamp(dt*4,0,1));viewPitch=0;
      if(travel<=this.exitTargetTravel+.04){
        // Once the drone is visibly clear of the facade, hand straight to the
        // canonical departure. Do not park outside the tower for a hatch-close beat.
        travel=this.exitTargetTravel;this.exitT=0;this.hatchOpen=1;this.finishPenthouseDelivery()
      }
      return
    }
    if(this.state==='departure'){
      for(const v of this.traffic)if(!v.dead)v.worldZ+=v.speed*dt;
      const pitchTime=SURFACE_EXIT_PITCH_TIME,zoomTime=SURFACE_EXIT_ZOOM_TIME;
      const before=this.departureT;this.departureT+=dt;
      const pitchT=ease(clamp(this.departureT/pitchTime,0,1));
      // Close the penthouse hatch during the opening part of the climb instead of
      // making the player wait outside for it. The tower/city remain fully live.
      this.hatchOpen=clamp(1-this.departureT/.78,0,1);
      const zoomT=ease(clamp((this.departureT-pitchTime)/zoomTime,0,1));
      // Keep the live city composition stable while the nose comes up. The previous
      // version climbed almost ten world units during the pitch, which made the
      // skyline vanish and exposed the street/ground before the rotation read clearly.
      // Rotate first; translate only a fraction of a unit until the ship is vertical.
      const yawSettle=ease(clamp((pitchT-.90)/.10,0,1));
      viewPitch=lerp(this.departureStartPitch,EXIT_VERTICAL_PITCH,pitchT);
      viewYaw=lerp(this.departureStartYaw,0,yawSettle);
      viewRoll=lerp(viewRoll,0,clamp(dt*4.8,0,1));
      shipX=this.departureStartX;
      shipY=lerp(this.departureStartY,this.departureStartY+.65,pitchT);
      if(before<pitchTime&&this.departureT>=pitchTime)SoundFX.zoom();
      if(zoomT>0){
        viewPitch=EXIT_VERTICAL_PITCH;viewYaw=0;viewRoll=0;
        shipX=lerp(this.departureStartX,0,zoomT);
        shipY=lerp(this.departureStartY+.65,this.departureStartY+10.5,zoomT)
      }
      if(this.departureT>=pitchTime+zoomTime){
        this.active=false;this.state='complete';scenarioFlow.finishAfterDeparture()
      }
      return
    }
  }
  cityMeshInfo(mesh,side=1,reverse=false){
    let root=this.cityMeshCache.get(mesh);if(!root){root={};this.cityMeshCache.set(mesh,root)}
    const key=(side<0?'left':'right')+(reverse?':rear':':front');if(root[key])return root[key];
    const faces=mesh.faces||[],faceVerts=new Set();for(const face of faces)for(const i of face)faceVerts.add(i);
    const structural=[...faceVerts].map(i=>mesh.v[i]),source=structural.length?structural:mesh.v;
    let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity,minZ=Infinity,maxZ=-Infinity;
    for(const v of source){minX=Math.min(minX,v[0]);maxX=Math.max(maxX,v[0]);minY=Math.min(minY,v[1]);maxY=Math.max(maxY,v[1]);minZ=Math.min(minZ,v[2]);maxZ=Math.max(maxZ,v[2])}
    if(!Number.isFinite(minY)){minX=minY=minZ=-1;maxX=maxY=maxZ=1}
    const spanX=Math.max(.01,maxX-minX),spanZ=Math.max(.01,maxZ-minZ),tolX=.025+spanX*.012,tolZ=.025+spanZ*.012;
    const edgeLen=ed=>{const a=mesh.v[ed[0]],b=mesh.v[ed[1]];return Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2])};
    const edgeClass=ed=>{
      const a=mesh.v[ed[0]],b=mesh.v[ed[1]],bothFace=faceVerts.has(ed[0])&&faceVerts.has(ed[1]);if(bothFace)return'structure';
      const ax=(a[0]+b[0])*.5,az=(a[2]+b[2])*.5;
      const nearFacade=Math.abs(az-(reverse?maxZ:minZ))<=tolZ,farFacade=Math.abs(az-(reverse?minZ:maxZ))<=tolZ;
      const inner=side<0?Math.abs(ax-maxX)<=tolX:Math.abs(ax-minX)<=tolX;
      const outer=side<0?Math.abs(ax-minX)<=tolX:Math.abs(ax-maxX)<=tolX;
      if(farFacade)return'farFacade';if(outer)return'outer';if(nearFacade||inner)return'nearDetail';return'freeDetail'
    };
    const nearEdges=[],midEdges=[],farEdges=[];
    for(const ed of mesh.e){const cls=edgeClass(ed),len=edgeLen(ed);if(cls!=='farFacade'&&cls!=='outer')nearEdges.push(ed);if(cls==='structure'||cls==='freeDetail'||(cls==='nearDetail'&&len>.66))midEdges.push(ed);if(cls==='structure'||cls==='freeDetail')farEdges.push(ed)}
    const usefulFaces=[];
    for(const face of faces){if(face.length<3)continue;const vs=face.map(i=>mesh.v[i]);let cx=0,cy=0,cz=0;for(const v of vs){cx+=v[0];cy+=v[1];cz+=v[2]}cx/=vs.length;cy/=vs.length;cz/=vs.length;
      const a=vs[0],b=vs[1],c=vs[2],ab=[b[0]-a[0],b[1]-a[1],b[2]-a[2]],ac=[c[0]-a[0],c[1]-a[1],c[2]-a[2]];
      const nx=ab[1]*ac[2]-ab[2]*ac[1],ny=ab[2]*ac[0]-ab[0]*ac[2],nz=ab[0]*ac[1]-ab[1]*ac[0],ax=Math.abs(nx),ay=Math.abs(ny),az=Math.abs(nz);
      const facade=(reverse?cz>=(maxZ-spanZ*.48):cz<=(minZ+spanZ*.48))&&az>=ax*.62&&az>=ay*.62;
      const inner=(cx*side)<0&&ax>=az*.62&&ax>=ay*.62;
      const roof=cy>minY+.05&&ay>=ax*.62&&ay>=az*.62;
      if(facade||inner||roof)usefulFaces.push(face)
    }
    // Skybridge Tower has two opposed upper masses plus the bridge between them.
    // Treating it like a single street-facing slab can discard the opposite-facing
    // upper faces and lets rear wire detail show through. Its authored faces are all
    // closed structural surfaces, so keep all of them as occluders near/mid range.
    const fullShellOcclusion=mesh.id==='skybridgetower'||mesh.id==='penthouseflat';
    const occlusionFaces=fullShellOcclusion?faces:usefulFaces;
    const make=(edges,faceList)=>({name:mesh.name,id:mesh.id,v:mesh.v,e:edges,faces:faceList});
    return root[key]={minY,maxY,minX,maxX,minZ,maxZ,near:make(nearEdges,occlusionFaces),mid:make(midEdges,occlusionFaces),far:make(farEdges,[])}
  }
  buildingVisible(b,z){
    const p=proj([b.x,this.groundY+b.h*.5,z]);if(!p)return false;
    // Conservative projected bounds: cull only when the entire approximate
    // building sphere is comfortably beyond one screen edge.
    const rx=Math.max(b.w,b.d)*.68*p.k+30,ry=b.h*.58*p.k+30;
    return !(p.x+rx<-40||p.x-rx>W+40||p.y+ry<-40||p.y-ry>viewH+40)
  }
  drawCityFarWire(obj,mesh,col,alphaScale=1,camDepth=null){
    // At long range there is no useful sub-pixel hidden-line information to gain.
    // Project each structural edge once and stroke it in one path, retaining the
    // exact same distance-based line width/alpha as drawMesh.
    const pts=mesh.v.map(v=>proj([v[0]*obj.s+obj.x,v[1]*obj.s+obj.y,v[2]*obj.s+obj.z]));
    const d=Math.max(.3,camDepth??camPoint([obj.x,obj.y,obj.z])[2]),alpha=clamp(1.15-d/75,.22,1)*alphaScale,width=clamp(22/Math.max(9,d),1,2.1);
    ctx.save();ctx.globalAlpha=alpha;ctx.strokeStyle=col;ctx.lineWidth=VECTOR_LINE_WIDTH;ctx.beginPath();let any=false;
    for(const ed of mesh.e){const a=pts[ed[0]],b=pts[ed[1]];if(!a||!b)continue;ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);any=true}
    if(any)ctx.stroke();ctx.restore()
  }
  drawGround(){
    // v210: keep the horizon-sized grid from v208, but submit it as one Canvas path
    // rather than several thousand independent beginPath/stroke calls per frame.
    // During the canonical city extraction, the old radial ground mask becomes
    // degenerate as the camera approaches vertical and can cover the sky. Keep the
    // real grid/buildings visible, but retire only that black mask once pitch-up is underway.
    const extractionPitch=this.state==='departure'?ease(clamp(this.departureT/SURFACE_EXIT_PITCH_TIME,0,1)):(mode==='surfaceExit'&&mission.surfaceExitScene==='city'?surfaceExitPitchProgress():0);
    if(extractionPitch<.18&&mode!=='surfaceExit')surfaceMask(this.groundY,620);
    const spacing=8,far=520,span=360;
    // Ground coverage follows where the camera is actually looking. Previously the
    // grid switched back to the forward (+Z) half as soon as state changed from
    // `exit` to `departure`, even though the camera was still facing back at the
    // penthouse. That made the city floor disappear on the launch hand-off.
    const turning=this.state==='turn'||this.state==='pickupTurn',reverse=Math.cos(viewYaw)<-.15;
    const raw0=turning?travel-far:(reverse?travel-far:travel+1),raw1=turning?travel+far:(reverse?travel+32:travel+far);
    const wz0=Math.floor(raw0/spacing)*spacing,wz1=raw1;
    ctx.save();ctx.strokeStyle=C.gd;ctx.lineWidth=VECTOR_LINE_WIDTH;ctx.globalAlpha=.42;ctx.beginPath();let any=false;
    for(let x=-span;x<=span;x+=spacing){
      let prev=null;for(let wz=wz0;wz<=wz1;wz+=spacing){const p=proj([x,this.groundY,wz-travel]);if(prev&&p){ctx.moveTo(prev.x,prev.y);ctx.lineTo(p.x,p.y);any=true}prev=p||null}
    }
    for(let wz=wz0;wz<=wz1;wz+=spacing){const a=proj([-span,this.groundY,wz-travel]),b=proj([span,this.groundY,wz-travel]);if(a&&b){ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);any=true}}
    if(any)ctx.stroke();ctx.restore();
    // Cross streets are only a few extra projected strokes, but they expose gaps
    // between blocks and make the city read as a wider road network.
    ctx.save();ctx.strokeStyle=C.g;ctx.lineWidth=VECTOR_LINE_WIDTH;ctx.globalAlpha=.48;
    for(const road of this.sideStreets){
      const rz=road.worldZ-travel;if(Math.abs(rz)>250)continue;const hw=road.halfWidth||4.2,extent=road.exit?74:58;
      for(const dz of [-hw,hw]){const a=proj([-extent,this.groundY+.018,rz+dz]),b=proj([extent,this.groundY+.018,rz+dz]);if(a&&b)line(a.x,a.y,b.x,b.y,C.g,.76,.52)}
      // broken centre guide along the lateral road
      for(let x=-extent;x<extent;x+=10){const a=proj([x,this.groundY+.022,rz]),b=proj([Math.min(extent,x+4.2),this.groundY+.022,rz]);if(a&&b)line(a.x,a.y,b.x,b.y,C.gd,.62,.38)}
    }
    // Parallel avenues complete the cheap city grid. They are simply stronger
    // ground-edge lines between the new outer blocks; no extra road simulation.
    const avenue0=Math.max(-18,raw0),avenue1=Math.min(this.cityLength+90,raw1);
    for(const x of [-23,-16,16,23]){
      let prev=null;for(let wz=Math.floor(avenue0/12)*12;wz<=avenue1;wz+=12){
        const p=proj([x,this.groundY+.020,wz-travel]);if(prev&&p)line(prev.x,prev.y,p.x,p.y,C.g,.72,.46);prev=p||null
      }
    }
    ctx.restore();
    // Once the reverse run clears the city edge, the same open-world mountain
    // horizon used on arrival becomes visible ahead across the plains.
    if(this.state==='cityOutbound'||this.state==='outboundMerge')drawSharedSurfaceHorizon(this.groundY,340,1)
  }
  drawBuilding(b,camDepth=null){
    const z=b.worldZ-travel,depth=camDepth??camPoint([b.x,this.groundY+b.h*.5,z])[2];if(depth<.3||depth>320)return;
    if(b.mesh){
      const s=b.scale||1;
      // Near side must follow the actual camera position, not the street side. This
      // matters during the penthouse climb, where the drone moves right up beside
      // buildings that were previously only ever seen from the centre of the road.
      const side=shipX<b.x?1:-1,reverse=Math.cos(viewYaw)<0;
      const info=this.cityMeshInfo(b.mesh,side,reverse),obj={type:'cityBuilding',x:b.x,y:this.groundY-info.minY*s,z,s,rot:[0,0,0]};
      if(depth<82)drawMesh(obj,info.near,b.col,.94);
      else if(depth<155)drawMesh(obj,info.mid,b.col,.94);
      else if(b.mesh.id==='skybridgetower'&&depth<225)drawMesh(obj,info.mid,b.col,.94);
      else this.drawCityFarWire(obj,info.far,b.col,.94,depth);
      return
    }
    const obj={type:'cityBuilding',x:b.x,y:this.groundY+b.h*.5,z,s:.5,mx:b.w,my:b.h,mz:b.d,rot:[0,0,0]};drawMesh(obj,courierFixtureBoxMesh,b.col,.92)
  }
  hatchCorners(open=this.hatchOpen){
    const room=this.roomSpec();if(!room)return null;
    const z=room.frontZ-travel,x=room.x,y=this.hatchY,hw=this.targetTower?.hatchHalfW||1.42,hh=this.targetTower?.hatchHalfH||1.22;
    const outer=[[x-hw,y-hh,z],[x+hw,y-hh,z],[x+hw,y+hh,z],[x-hw,y+hh,z]];
    const gap=hw*clamp(open,0,1),left=[[x-hw,y-hh,z-.02],[x-gap,y-hh,z-.02],[x-gap,y+hh,z-.02],[x-hw,y+hh,z-.02]],right=[[x+gap,y-hh,z-.02],[x+hw,y-hh,z-.02],[x+hw,y+hh,z-.02],[x+gap,y+hh,z-.02]];
    return{outer,left,right,z,x,y,hw,hh}
  }
  drawRoomQuad(points,col=C.gd,w=.9,alpha=.82){
    const clipped=camera.clipWorldPolyNear(points,.24);if(clipped.length>=3)fillPoly(clipped);
    for(let i=0;i<points.length;i++)this.drawRoomSegment(points[i],points[(i+1)%points.length],col,w,alpha)
  }
  drawRoomSegment(a,b,col=C.g,w=1,alpha=.85,near=.24){
    let A=camPoint(a),B=camPoint(b),ain=A[2]>near,bin=B[2]>near;if(!ain&&!bin)return;
    if(ain!==bin){const t=(near-A[2])/(B[2]-A[2]),q=[lerp(A[0],B[0],t),lerp(A[1],B[1],t),near];if(!ain)A=q;else B=q}
    const p0=projectCam(A),p1=projectCam(B);if(p0&&p1)line(p0.x,p0.y,p1.x,p1.y,col,w,alpha)
  }
  drawRoomBox(x,y,worldZ,w,h,d,col=C.w,alpha=.88){
    drawMesh({type:'penthouseFixture',x,y,z:worldZ-travel,s:.5,mx:w,my:h,mz:d,rot:[0,0,0]},courierFixtureBoxMesh,col,alpha)
  }
  drawPickupRoomGeometry(){
    const r=this.roomSpec();if(!r)return;
    const z0=r.frontZ-travel,z1=r.backZ-travel,x0=r.x-r.halfW,x1=r.x+r.halfW,y0=r.floorY,y1=r.ceilY;
    const panels=[
      {p:[[x0,y0,z0],[x1,y0,z0],[x1,y0,z1],[x0,y0,z1]],c:C.gd},
      {p:[[x0,y1,z1],[x1,y1,z1],[x1,y1,z0],[x0,y1,z0]],c:C.gd},
      {p:[[x0,y0,z1],[x0,y1,z1],[x0,y1,z0],[x0,y0,z0]],c:C.g},
      {p:[[x1,y0,z0],[x1,y1,z0],[x1,y1,z1],[x1,y0,z1]],c:C.g},
      {p:[[x0,y0,z1],[x1,y0,z1],[x1,y1,z1],[x0,y1,z1]],c:C.w}
    ];
    panels.sort((a,b)=>b.p.reduce((n,q)=>n+camPoint(q)[2],0)-a.p.reduce((n,q)=>n+camPoint(q)[2],0));
    for(const q of panels)this.drawRoomQuad(q.p,q.c,.92,.82);
    // Industrial collection room: cargo bench at the back and a few low crates
    // against the walls, leaving the central turnaround/flight path unobstructed.
    this.drawRoomBox(r.x,r.tableY,r.tableZ,1.86,.16,.86,C.y,.94);
    this.drawRoomBox(r.x-r.halfW+.30,r.floorY+.25,r.backZ-.58,.48,.44,.78,C.g,.70);
    this.drawRoomBox(r.x+r.halfW-.30,r.floorY+.25,r.backZ-.58,.48,.44,.78,C.g,.70);
    this.drawRoomBox(r.x-r.halfW+.34,r.floorY+.18,r.frontZ+1.20,.54,.32,.60,C.w,.62)
  }
  drawPenthouseRoomGeometry(){
    if(this.cityPurpose==='pickup'){this.drawPickupRoomGeometry();return}
    const r=this.roomSpec();if(!r)return;
    const z0=r.frontZ-travel,z1=r.backZ-travel,x0=r.x-r.halfW,x1=r.x+r.halfW,y0=r.floorY,y1=r.ceilY;
    const panels=[
      {p:[[x0,y0,z0],[x1,y0,z0],[x1,y0,z1],[x0,y0,z1]],c:C.gd},
      {p:[[x0,y1,z1],[x1,y1,z1],[x1,y1,z0],[x0,y1,z0]],c:C.gd},
      {p:[[x0,y0,z1],[x0,y1,z1],[x0,y1,z0],[x0,y0,z0]],c:C.g},
      {p:[[x1,y0,z0],[x1,y1,z0],[x1,y1,z1],[x1,y0,z1]],c:C.g},
      {p:[[x0,y0,z1],[x1,y0,z1],[x1,y1,z1],[x0,y1,z1]],c:C.w}
    ];
    panels.sort((a,b)=>b.p.reduce((n,q)=>n+camPoint(q)[2],0)-a.p.reduce((n,q)=>n+camPoint(q)[2],0));
    for(const q of panels)this.drawRoomQuad(q.p,q.c,.92,.82);
    // v213: keep the delivery axis completely clear. The v212 side furniture and
    // rear console overlapped in perspective and made it look as though something
    // was sitting in front of the delivery table. Two low benches now hug the back
    // corners; nothing occupies the central path between drone and table.
    this.drawRoomBox(r.x,r.tableY,r.tableZ,1.72,.16,.82,C.y,.92);
    this.drawRoomBox(r.x-r.halfW+.28,r.floorY+.24,r.backZ-.55,.44,.42,.72,C.w,.66);
    this.drawRoomBox(r.x+r.halfW-.28,r.floorY+.24,r.backZ-.55,.44,.42,.72,C.w,.66);
    // Large abstract wall panel: enough to say "penthouse" without filling the room
    // with tiny domestic linework.
    const az=r.backZ-travel-.035,ay=this.hatchY+.38,aw=.72,ah=.46;
    const art=[[r.x-aw,ay-ah,az],[r.x+aw,ay-ah,az],[r.x+aw,ay+ah,az],[r.x-aw,ay+ah,az]].map(proj);
    if(art.every(Boolean)){for(let i=0;i<4;i++){const a=art[i],b=art[(i+1)%4];line(a.x,a.y,b.x,b.y,C.y,.9,.76)}line(art[0].x,art[0].y,art[2].x,art[2].y,C.y,.7,.55)}
  }
  drawPenthouseRoomPreview(h){
    if(!h||this.hatchOpen<=.08)return;
    const poly=h.outer.map(proj);if(!poly.every(Boolean))return;
    ctx.save();ctx.beginPath();ctx.moveTo(poly[0].x,poly[0].y);for(let i=1;i<4;i++)ctx.lineTo(poly[i].x,poly[i].y);ctx.closePath();ctx.clip();
    this.drawPenthouseRoomGeometry();
    // Pickup cargo belongs to the room. While outside it is drawn only through
    // the opened doorway clip, never over the closed facade/building.
    if(this.cityPurpose==='pickup')this.drawPickupBay();
    ctx.restore()
  }
  drawHatch(){
    if(!this.targetTower)return;
    const h=this.hatchCorners();if(!h)return;const outer=h.outer.map(proj);if(!outer.every(Boolean))return;
    // Outside, black-mask the normal wall inside the door rectangle and reveal the
    // lounge through it. Once the drone has turned to face back out, do NOT paint
    // black over the opening: the already-rendered city must remain visible through it.
    const facingOut=((this.state==='turn'||this.state==='pickupTurn')&&Math.cos(viewYaw)<-.15)||this.state==='exit'||this.state==='pickupExit';
    if(!facingOut){fillPoly(outer);this.drawPenthouseRoomPreview(h)}
    for(let i=0;i<4;i++){const a=outer[i],b=outer[(i+1)%4];line(a.x,a.y,b.x,b.y,C.y,1.25,.98)}
    if(this.hatchOpen<.995)for(const polyW of [h.left,h.right]){const poly=polyW.map(proj);if(!poly.every(Boolean))continue;fillPoly(poly);for(let i=0;i<4;i++){const a=poly[i],b=poly[(i+1)%4];line(a.x,a.y,b.x,b.y,C.g,1.0,.90)}}
    if(this.state==='city'||this.state==='autopilot'||this.state==='entry'||this.state==='cityPickup'||this.state==='pickupApproach'||this.state==='pickupEntry'){
      const label=proj([h.x,h.y+h.hh+.52,h.z]);if(label){ctx.textAlign='center';ctx.font='400 8px Consolas,monospace';ctx.strokeStyle=C.y;ctx.strokeText(this.cityPurpose==='pickup'?'GROUND PICKUP':'PENTHOUSE DELIVERY',label.x,label.y);ctx.textAlign='left'}
    }
  }
  penthouseCargoState(){
    const r=this.roomSpec();if(!r)return null;const t=this.deliveryT;
    if(t<.55){const q=ease(clamp(t/.55,0,1));return{x:lerp(shipX,r.x,q*.18),y:lerp(shipY-.50,shipY-.34,q),z:lerp(.58,1.30,q),beam:false,landed:false}}
    const q=ease(clamp((t-.55)/2.25,0,1));
    return{x:lerp(shipX,r.x,q),y:lerp(shipY-.34,r.tableY+.13,q),z:lerp(1.30,r.tableZ-travel,q),beam:q<.995,landed:q>=.995}
  }
  drawCargo(){
    if(this.state!=='delivery'&&this.state!=='turn')return;
    const r=this.roomSpec();if(!r)return;
    const state=this.state==='turn'?{x:r.x,y:r.tableY+.13,z:r.tableZ-travel,beam:false,landed:true}:this.penthouseCargoState();if(!state)return;
    const cp=proj([state.x,state.y,state.z]);
    if(state.beam&&cp){
      // Same cyan bowed-wave tractor language as the asteroid food-delivery bay.
      const origin=proj([shipX,shipY-.52,.52]);if(origin){
        const dx=cp.x-origin.x,dy=cp.y-origin.y,len=Math.hypot(dx,dy)||1,ux=dx/len,uy=dy/len,px=-uy,py=ux,waves=7,flow=(this.deliveryT*.72)%1;
        ctx.save();ctx.strokeStyle=C.c;ctx.lineWidth=VECTOR_LINE_WIDTH;ctx.globalAlpha=.68;
        for(let i=0;i<waves;i++){const t=.10+(((i/waves)+flow)%1)*.82,cx=lerp(origin.x,cp.x,t),cy=lerp(origin.y,cp.y,t),half=lerp(8,Math.min(34,10+len*.055),t),bow=lerp(5,18,t);ctx.beginPath();ctx.moveTo(cx+px*half,cy+py*half);ctx.quadraticCurveTo(cx+ux*bow,cy+uy*bow,cx-px*half,cy-py*half);ctx.stroke()}
        ctx.restore()
      }
    }
    drawMesh({type:'jackalCargo',x:state.x,y:state.y,z:state.z,s:.5,mx:1.02,my:.20,mz:.70,rot:[0,0,0]},courierFixtureBoxMesh,state.landed?C.y:C.c,.98)
  }
  drawPickupBay(){
    if(this.cityPurpose!=='pickup'||this.pickupSecured)return;
    const r=this.roomSpec();if(!r)return;
    const q=this.state==='pickupHold'?this.pickupCargoProgress:0;
    const start=[r.x,r.tableY+.14,r.tableZ-travel],end=[shipX,shipY-.34,1.05];
    const x=lerp(start[0],end[0],q),y=lerp(start[1],end[1],q),zz=lerp(start[2],end[2],q),cp=proj([x,y,zz]);
    if(this.state==='pickupHold'&&q>0&&q<.995&&cp){
      // Pickup is the exact inverse of delivery: bowed cyan wavefronts originate at
      // the moving cargo and run TOWARDS dashboard/player height.
      const receiver=proj([shipX,shipY-.34,.62]);if(receiver){
        const dx=receiver.x-cp.x,dy=receiver.y-cp.y,len=Math.hypot(dx,dy)||1,ux=dx/len,uy=dy/len,px=-uy,py=ux,flow=(this.pickupT*.72)%1;
        ctx.save();ctx.strokeStyle=C.c;ctx.lineWidth=VECTOR_LINE_WIDTH;ctx.globalAlpha=.68;
        for(let i=0;i<7;i++){const t=.10+(((i/7)+flow)%1)*.82,cx=lerp(cp.x,receiver.x,t),cy=lerp(cp.y,receiver.y,t),half=lerp(8,Math.min(34,10+len*.055),t),bow=lerp(5,18,t);ctx.beginPath();ctx.moveTo(cx+px*half,cy+py*half);ctx.quadraticCurveTo(cx+ux*bow,cy+uy*bow,cx-px*half,cy-py*half);ctx.stroke()}
        ctx.restore()
      }
    }
    drawMesh({type:'pickupCargo',x,y,z:zz,s:.5,mx:1.02,my:.22,mz:.70,rot:[0,0,0]},courierFixtureBoxMesh,q>=.995?C.c:C.y,.96)
  }
  drawNavigation(){
    if(!this.active)return;
    if(this.cityPurpose==='pickup'){
      if(!(this.state==='cityPickup'||this.state==='pickupApproach'))return;
      const room=this.roomSpec(),p=room?proj([room.x,this.hatchY,room.frontZ-travel]):null;if(!p)return;const pulse=9+Math.sin(this.navPulse*4)*2;
      line(p.x-pulse,p.y,p.x-3,p.y,C.y,1,.8);line(p.x+3,p.y,p.x+pulse,p.y,C.y,1,.8);line(p.x,p.y-pulse,p.x,p.y-3,C.y,1,.8);line(p.x,p.y+3,p.x,p.y+pulse,C.y,1,.8);
      ctx.textAlign='center';ctx.font='400 8px Consolas,monospace';ctx.strokeStyle=C.y;ctx.strokeText('PICKUP',p.x,p.y-pulse-7);ctx.textAlign='left';return
    }
    if(this.state!=='city')return;
    const z=this.targetWorldZ-travel,p=proj([this.targetTower?.x||0,this.hatchY,z]);if(!p)return;
    const pulse=9+Math.sin(this.navPulse*4)*2;
    line(p.x-pulse,p.y,p.x-3,p.y,C.y,1,.8);line(p.x+3,p.y,p.x+pulse,p.y,C.y,1,.8);line(p.x,p.y-pulse,p.x,p.y-3,C.y,1,.8);line(p.x,p.y+3,p.x,p.y+pulse,C.y,1,.8)
  }
  drawCity(){
    this.drawGround();

    // Buildings and civilian vehicles share one painter queue. Previously every
    // building was drawn first and every car afterwards, so a car behind the
    // penthouse was guaranteed to paint through its walls. Far-to-near camera depth
    // restores the normal rule: cars in front occlude towers, towers in front occlude cars.
    const scene=[];let targetQueued=false;
    const vis=this.visibleBuildings;vis.length=0;
    for(const b of this.buildings){
      const z=b.worldZ-travel,d=camPoint([b.x,this.groundY+b.h*.5,z])[2];
      if(d>.3&&d<320&&this.buildingVisible(b,z)){
        b._cityDrawDepth=d;vis.push(b);
        scene.push({depth:d,draw:()=>{
          if((this.state==='cityOutbound'||this.state==='outboundMerge')&&d>82)drawMesh({type:'outboundCityOccluder',x:b.x,y:this.groundY+b.h*.5,z,s:.5,mx:b.w,my:b.h,mz:b.d,rot:[0,0,0]},courierFixtureBoxMesh,'#000',1);
          this.drawBuilding(b,d);
          if(b===this.targetTower&&this.targetWorldZ-travel<118){this.drawHatch();targetQueued=true}
        }})
      }
    }
    if(this.state==='cityOutbound'||this.state==='outboundMerge')for(const t of this.exitTrees){
      const z=t.worldZ-travel,d=camPoint([t.x,t.y,z])[2];
      if(d>.3&&d<430)scene.push({depth:d,draw:()=>drawLayeredForestTree({type:'cityExitTree',assetId:t.assetId,x:t.x,y:t.y,z,s:t.s,rot:t.rot},t.mesh,t.assetId,.88)})
    }
    for(const v of this.traffic){
      if(v.dead)continue;
      const z=v.worldZ-travel,d=camPoint([v.x,v.y,z])[2];
      if(d>.25&&d<125)scene.push({depth:d,draw:()=>this.drawCivilianCarFast(v,z)})
    }
    scene.sort((a,b)=>b.depth-a.depth);
    for(const item of scene)item.draw();

    const room=this.targetTower?this.roomSpec():null;
    const inRoom=this.state==='entry'||this.state==='delivery'||this.state==='turn'||this.state==='exit'||this.state==='pickupEntry'||this.state==='pickupHold'||this.state==='pickupTurn'||this.state==='pickupExit';
    if(room&&travel>=room.frontZ-.22&&inRoom){
      this.drawPenthouseRoomGeometry();
      if(this.cityPurpose==='pickup')this.drawPickupBay();
    }
    if(this.targetTower&&!targetQueued&&this.targetWorldZ-travel<118)this.drawHatch();
    this.drawCargo();this.drawNavigation()
  }
  hudRight(){
    if(!this.active)return'';
    if(this.state==='customs')return'CUSTOMS DRONES';
    if(this.state==='descent')return'PLANET DESCENT';
    if(this.state==='city')return`CITY ${Math.ceil(this.remaining())}`;
    if(this.state==='cityPickup')return`PICKUP ${Math.ceil(this.remaining())}`;
    if(this.state==='pickupApproach')return'PICKUP APPROACH';
    if(this.state==='pickupEntry')return'ENTERING PICKUP';
    if(this.state==='pickupHold')return'COLLECTING CARGO';
    if(this.state==='pickupTurn')return'TURNING';
    if(this.state==='pickupExit')return'LEAVING PICKUP';
    if(this.state==='outboundMerge')return'REJOINING CITY ROAD';
    if(this.state==='cityOutbound')return`CITY EXIT ${Math.max(0,Math.ceil(travel-this.outboundEnd))}`;
    if(this.state==='autopilot')return'PENTHOUSE AUTOPILOT';
    if(this.state==='entry')return'ENTERING PENTHOUSE';
    if(this.state==='delivery')return'DELIVERING';
    if(this.state==='turn')return'TURNING';
    if(this.state==='exit')return'LEAVING PENTHOUSE';
    if(this.state==='departure')return'RETURNING TO BASE';
    return''
  }
}


// v235 — reusable open-surface destination approach.
// This is intentionally NOT a Red Jackal-specific controller. A scenario can drop
// the player onto open terrain, place any destination somewhere ahead, give it a
// world-space nav marker, scatter non-blocking scenery, and hand off to the next
// module only when the destination is physically reached.
// Shared open-surface mountain horizon renderer.
// Kept independent of MissionController/SceneRenderer so reusable surface sections
// can draw the established mountain backdrop without reaching across controller instances.
