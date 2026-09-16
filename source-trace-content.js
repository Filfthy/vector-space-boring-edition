'use strict';

// SOURCE TRACE — AUTHORED MISSION CONTENT
//
// This file owns the authored facts of the Source Trace story mission: contract/mail
// copy, stage composition, locations, layouts, encounter density, bunker route shape,
// room dressing, pacing and OSD delivery presentation. engine.js/campaign.js consume
// this data; they own the reusable mechanisms that fly, render, collide, fire, tractor,
// transition and complete stages.
globalThis.AgentXSourceTraceContent = {
  id:'sourceTrace',

  campaign:{
    contract:{
      id:'story_kudo_bunker_2',storyContractId:'kudo_bunker_2',storyFlag:'kudo2',private:true,
      clientName:'Orbital Security Directorate',agentName:'Kudo Shang',faction:null,
      title:'Source Trace',kind:'story',family:'bunker_recovery_osd',risk:4,minLevel:1,minRep:-100,
      pay:4300,xp:470,difficulty:3,implemented:true,
      planetaryRequirements:{landingBody:'planet',landingColour:'green',moonCount:{min:0,max:2}},
      description:'OSD traced the rogue drones to a fortified planetary installation. Descend to the surface, cross its defences, breach the bunker and investigate the interior. Recover anything that may be important, then deliver the recovered equipment directly to the OSD compound.',
      modules:[
        {type:'planet_descent',label:'Source World Descent',difficulty:3},
        {type:'bunker_recovery_osd',label:'Bunker Investigation and Recovery',difficulty:3,startMessage:'BUNKER ASSAULT'}
      ],
      stages:['Descend to Source World','Cross the Defences','Breach and Investigate Bunker','Recover Equipment','Deliver to OSD Compound']
    },
    offerMail:{
      id:'kudo_offer_2',from:'Kudo Shang · Orbital Security Directorate',subject:'Source trace — planetary installation',category:'story',priority:'high',
      body:[
        'The routing fragment from Relay 10 led somewhere useful. We have a probable source location on a planetary body.',
        'Descend to the site. Cross the defences and breach the bunker.',
        'Investigate the installation. Recover anything that may be important.',
        'Bring whatever you recover directly to the OSD compound. No detours.'
      ],
      action:{type:'story',contractId:'kudo_bunker_2',label:'ACCEPT OSD TASKING'}
    },
    devMailOption:{contractId:'kudo_bunker_2',label:'4 · Source Trace'}
  },

  presentation:{
    messages:{
      start:{text:'BUNKER ASSAULT',hold:.9},
      bunkerApproach:{text:'BUNKER APPROACH',hold:.55},
      accessTunnel:{text:'BUNKER ACCESS TUNNEL',hold:.65},
      recoverEquipment:{text:'RECOVER EQUIPMENT',hold:.75},
      turningForExit:{text:'TURNING FOR EXIT',hold:.7},
      returnThroughBunker:{text:'RETURN THROUGH BUNKER',hold:.65},
      clearOfBunker:{text:'CLEAR OF BUNKER',hold:.45},
      equipmentRecovered:{text:'EQUIPMENT RECOVERED',hold:.8},
      osdDestination:{text:'OSD DESTINATION',hold:.72},
      osdAutopilot:{text:'AUTOPILOT · OSD DELIVERY',hold:.62}
    },
    hud:{
      osdPlanet:'OSD PLANET',osdDescent:'OSD DESCENT',openingHatch:'OPENING DELIVERY HATCH',
      delivering:'DELIVERING EQUIPMENT',closingHatch:'CLOSING DELIVERY HATCH',departingFacility:'DEPARTING OSD FACILITY',
      osdFacility:'OSD FACILITY',deliveryComplete:'DELIVERY COMPLETE',equipmentSecured:'EQUIPMENT SECURED',
      equipmentRecovery:'EQUIPMENT RECOVERY',exitRoute:'EXIT ROUTE',equipmentDistancePrefix:'EQUIPMENT'
    },
    damage:{tesla:'TESLA PERIMETER',surfaceCollision:'COLLISION',tunnelObstacle:'OBSTACLE'}
  },

  speech:{
    surfaceStart:'crossDefences',
    recoverEquipment:'recoverEquipment',
    deliveryComplete:'deliveryComplete'
  },

  surfaceAssault:{
    start:{shipY:-1.55,tunnelStartOffset:.65,terrain:'plains',destination:'bunker',treeClumps:0,musicMode:'violent'},
    bunkerDistance:920,
    bunkerLateral:{min:145,span:30},
    entryRadius:44,
    doorHp:3,
    corridorHalfWidth:{start:84,end:48},

    guns:{
      population:{initial:30,far:28,mid:29,near:30,midDistance:390,nearDistance:210},
      stopSpawningDistance:172,
      breachHandoffDistance:148,
      projectileCap:3,
      initialField:{
        forwardStart:96,forwardSpan:744,forwardJitter:7,
        lanes:[-.72,.18,.66,-.28,.43,-.58,.04,.76,-.12,.54,-.43,.31],laneJitter:.08,
        scaleBase:.82,scaleSpan:.16,minimumUsableHalfWidth:22,edgeInset:10,laneClamp:.84
      },
      replacements:{
        minimumRemaining:78,minForwardBase:34,bunkerClearance:48,nearThreshold:300,
        nearForward:{near:58,far:190},farForward:{near:96,far:245},attempts:18,
        minimumUsableHalfWidth:22,edgeInset:9,edgeEvery:5,edgeMin:.68,edgeSpan:.22,randomWidth:.82
      },
      emplacement:{
        hp:3,floorY:-3.5,pivotHeightFactor:.76,initialFireMin:.35,initialFireSpan:2.15,
        trackingYawRate:3.15,trackingPitchRate:2.25,pitchMin:-.72,pitchMax:.30,
        readablePaddingX:70,readablePaddingY:60,fireDepthMin:6,fireDepthMax:86,yawTolerance:.16,pitchTolerance:.13,
        fireCooldownMin:2.20,fireCooldownSpan:1.10,retryCooldownMin:.52,retryCooldownSpan:.44,
        defaultCooldownMin:.65,defaultCooldownSpan:.65,boltArgs:[.95,1.85,.10],
        collisionRadius:1.65,resetPassedRadius:2.8,retireBehind:82,
        spawnCooldownMin:.12,spawnCooldownSpan:.12,spawnFailureCooldown:.5,
        returnCaptureNear:5,returnCaptureFar:265,returnVisibleNear:.28,returnVisibleFar:235
      },
      ballistics:{
        speedBase:10.4,speedPerLevel:.12,solveMinTime:.04,fallbackTimeCap:2.35,fallbackSpeedFloor:5.5,
        leadScale:.90,leadTimeMin:.10,leadTimeMax:2.85,minimumDistance:.2,minimumFlightTime:.16,
        hitJitter:[.46,.36,.38],missDistanceMin:2.8,missDistanceSpan:3.8,missYScale:.62,lifeMargin:2.0
      }
    },

    tesla:{
      endBeforeBunker:58,spacing:48,sideOffset:14.5,rowStagger:2.2,rearSteps:8,
      warningInset:11,dangerDepth:18,pan:.72,warmup:.55,shieldDrainSeconds:3.05,
      hitIntervalMin:.24,hitIntervalMax:.48,deepIntervalScale:.78,exposureDecay:3.2,
      visual:{
        floorY:-3.5,scale:1.02,mastTop:8.38,ringDrop:.28,ringRadius:.64,
        tipRadius:.54,tipRise:.72,baseRadius:.30,sceneCentreHeight:4.35,
        sceneCullNear:-8,sceneCullFar:430,arcTarget:[0,-.82,1.15]
      }
    },

    breach:{
      cameraY:-2.2,projectNear:.18,minimumDepth:22,
      screenBounds:{left:.18,right:.82,top:.12,bottom:.88}
    }
  },

  bunker:{
    tunnelLength:360,
    roomLength:26,
    pickupStopLocal:342.5,
    equipmentLocal:356.2,

    path:{
      centreY:-2.2,gatePower:.64,straightenDistance:18,
      xWaves:[{frequency:.034,amplitude:3.25,phase:0},{frequency:.073,amplitude:1.28,phase:.72}],
      yWaves:[{frequency:.029,amplitude:.88,phase:.82},{frequency:.061,amplitude:.40,phase:.18}]
    },

    movement:{tunnelSpeedMultiplier:1.42,surfaceClearSpeedMultiplier:.92},

    wallGuns:{
      positions:[34,51,68,85,102,119,136,153],scaleBase:.56,scaleStep:.025,hp:2,
      yOffsets:{left:.08,right:-.06},initialFireMin:.70,initialFireSpan:1.25,returnFireMin:.65,returnFireSpan:1.10,
      maxBolts:2,fireDepthMin:4.5,fireDepthMax:46,yawRate:1.85,pitchRate:1.05,pitchMin:-.72,pitchMax:.52,
      yawTolerance:.26,pitchTolerance:.24,defaultCooldownMin:.8,defaultCooldownSpan:1,
      fireCooldownMin:1.45,fireCooldownSpan:.80,retryCooldownMin:.38,retryCooldownSpan:.42,
      boltArgs:[.92,1.72,.09],boltMaxLife:5.25,boltTunnelDepthMin:.12,boltTunnelDepthMax:72,
      boltWallRadius:.18,boltCullBehind:-2,boltCullAhead:76,
      supportVisibleNear:.18,supportVisibleFar:54,supportPortalNear:.72,supportPortalStep:2.30,mountInset:.05
    },

    obstacles:{
      positions:[160,169,178,187,196,205,214,223,232,241,250,259,268,277,286,295,304,313],
      horizontalLevels:[-.72,.66,-.28,.34,-.58,.52],verticalLevels:[-.92,.88,-.58,.62,-1.02,.98],
      verticalEvery:3,verticalRemainder:1,horizontalThickness:.50,verticalThickness:.46,
      horizontalClearance:.56,verticalClearance:.54,heavyEvery:4,heavyRemainder:3,normalHp:14,heavyHp:18,
      collisionDepthMin:.16,collisionDepthMax:1.42,passScore:100
    },

    recoveryRoom:{
      architecture:{
        widenTransition:7.5,widthFactor:2.65,heightFactor:2.15,fixtureVisibleDistance:55,backWallInset:.10
      },
      statusDisplay:{
        yFraction:.55,halfWidth:2.45,halfHeight:1.05,barCount:9,
        innerLeft:.82,innerRight:.82,bottomFraction:.80,topFraction:.84,minAmount:.08,amountSpan:.88,
        barWidthFraction:.46,phaseStep:.91,baseRate:.72,rateStep:.17
      },
      table:{
        fromEnd:3.8,topFromFloor:1.18,width:2.55,depth:1.10,topThickness:.14,floorOffset:.05,
        legInsetX:.42,legInsetZ:.35,legThickness:.10
      },
      crates:[
        {fromEnd:12.8,x:-3.20,floorOffset:.67,size:[1.05,1.15,1.00]},
        {fromEnd:11.0,x: 3.28,floorOffset:.53,size:[.90,.88,.92]},
        {fromEnd: 8.7,x:-3.42,floorOffset:.50,size:[.82,.82,.78]},
        {fromEnd: 7.9,x:-2.66,floorOffset:.48,size:[.72,.78,.72]},
        {fromEnd: 6.5,x: 3.32,floorOffset:.63,size:[1.18,1.08,.96]},
        {fromEnd: 5.0,x: 2.55,floorOffset:.46,size:[.70,.72,.68]},
        {fromEnd: 3.0,x:-3.15,floorOffset:.48,size:[.82,.78,.76]}
      ],
      equipmentBox:{dimensions:[1.55,.48,.72]},
      pickup:{
        tableHeightFromFloor:1.38,tractorStart:.48,tractorDuration:2.15,shipYOffset:-.78,shipDepth:1.28,
        approachSpeed:4.2,positionEase:5,yawRate:1.4,pitchRate:1.2,rollRate:1.8,arrivalEpsilon:.04,
        securedAt:2.63,turnAt:3.45,triggerBeforeStop:.72,
        tractorVisual:{sourceBottomMin:70,sourceBottomFraction:.18,waves:5,flowRate:.34,easePower:2.05,halfWidthStart:8,halfWidthEnd:34,bowStart:5,bowEnd:16,clipAbove:-40,clipBelow:60,alpha:.70}
      },
      turn:{duration:1.78,completeAt:1.98,rollAmount:.13},
      surfaceClear:{shipY:-1.6,shipYRate:.52,yawRate:2,pitchRate:2,rollRate:2.4,exitAt:1.35,returnExitThreshold:.72},
      render:{
        sectionStep:2.30,visibleDepth:54,fixtureClipNear:.28,fixtureNearPlane:.24,fixtureFarPadding:.06,
        minimumNear:.32,physicalNear:.20,backWallNear:.24,sectionEndEpsilon:.08,sectionStartEpsilon:.16,
        turnClipStep:1.15,turnTunnelStartGap:.65,turnTunnelDepth:34,turnObstacleDepth:30,returnPortalNear:.74
      }
    }
  },

  osdDelivery:{
    planet:{
      worldZ:112,lateralMin:19,lateralSpan:10,verticalSpan:9,radius:6.45,tiltMin:.55,tiltSpan:.72,
      landingAzimuthMin:.28,landingAzimuthSpan:.42,colour:'o',holdSeconds:1.35,musicMode:'calm',
      rollLevelRate:.8,shipYLevelRate:2
    },
    facility:{
      model:'twinTowerFortress',scale:22,routeLength:520,targetWorldZ:520,lateralMin:42,lateralSpan:18,
      rockClumps:12,entryRadius:24,deliveryFrontOffset:24,terrain:'plains',destination:'osd',scenery:'rocks',
      sceneryReservation:{footprintMargin:12,approachLength:150,approachHalfWidth:28},
      visual:{visibleFar:680,crossbarEdges:[[138,139],[140,141]],logoVertexStart:142,logoVertexEnd:182}
    },
    hatch:{
      cargoWidthFraction:.255,recessFloorOffset:.54,frontClearanceMin:.45,frontClearanceWidthFraction:.045,backClearance:.35,
      standOffYOffset:-.20,standOffZOffset:-16,departGroundYOffset:1.90,departZOffset:-36,
      recessCentreYOffsetFraction:.10,recessScale:.88,doorScale:.84,doorLift:1.02,doorFrontOffset:.035,doorDepth:.12
    },
    sequence:{
      approachSpeed:11.5,approachYRate:2.4,approachYawRate:.72,approachPitchRate:.52,approachRollRate:1.3,approachEpsilon:.05,
      settleYawRate:.62,settlePitchRate:1.1,settleRollRate:1.8,settleSeconds:.45,settleYawTolerance:.025,
      doorOpenRate:1.7,doorAimYawRate:.8,doorOpenComplete:.999,
      deliveryDelay:.2,deliveryDuration:2.15,deliveryComplete:.999,
      closeDelay:.28,doorCloseRate:1.8,closeComplete:.001,closeHold:.72,
      turnYawRate:1.75,turnPitchRate:1.35,turnRollRate:2.2,turnHold:.92,turnYawTolerance:.04,
      departFallbackDistance:28,departSpeed:18.5,departYRate:2.2,departYawRate:1.4,departPitchRate:1.2,departRollRate:2.4,departEpsilon:.1
    },
    tractor:{
      cargoOrigin:[0,-.34,1.05],beamOrigin:[0,-.34,.62],arcHeight:.12,waves:7,flowRate:.72,
      startFraction:.10,spanFraction:.82,halfWidthStart:8,halfWidthMax:34,halfWidthBase:10,halfWidthDistanceScale:.055,
      bowStart:5,bowEnd:18
    }
  }
};
