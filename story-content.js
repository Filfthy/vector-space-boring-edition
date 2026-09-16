'use strict';

// AUTHORED STORY MISSIONS
// Missions compose reusable environment presets and reusable gameplay systems.
// Environment recipes live in environment-presets.js; mechanics live in the system/environment controller files.

const sourceTrace = {
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
        {type:'bunker_recovery_osd',label:'Bunker Investigation and Recovery',difficulty:3,startMessage:'BUNKER ASSAULT',contentId:'kudo_bunker_2'}
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
    completionMail:{
      id:'kudo_wait_2',from:'Kudo Shang · Orbital Security Directorate',subject:'Analysis complete',category:'story',priority:'high',
      body:[
        'OSD analysis is complete. The recovered assembly is based on Partition War military architecture.',
        'It is not surviving Partition War hardware. Several components are of recent manufacture.',
        'We can identify the materials and fabrication processes involved. We cannot identify their source. The supply chain is civilian, fragmented and largely outside OSD visibility.',
        'Corvella Pallis has better access to that information than we do. I forwarded the relevant material profile. She will contact you.'
      ]
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
    start:{...globalThis.AgentXEnvironments.get('fortified_plains'),shipY:-1.55,tunnelStartOffset:.65,musicMode:'violent'},
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
      ...globalThis.AgentXEnvironments.get('rocky_osd_plains'),rockClumps:12,entryRadius:24,deliveryFrontOffset:24,
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


const voxCourier = {
  id:'voxCourierRecovery',

  campaign:{
    contract:{
      id:'story_mara_signal_1',storyContractId:'mara_signal_1',storyFlag:'mara1',private:true,
      clientName:'Vector Operations Exchange',agentName:'Mara Venn',faction:null,
      title:'Courier Recovery',kind:'story',family:'combat_recovery',risk:2,minLevel:1,minRep:-100,
      pay:2400,xp:280,difficulty:2,implemented:true,
      description:"A VOX courier failed to make its hand-off. Clear the recovery area, scan its scattered wreckage for recoverable navigation data, reach the VOX communications centre, authenticate with its perimeter security drone, then close on the station and dock for the secure upload.",
      modules:[
        {
          type:'combat_recovery',label:'Clear and Scan Wreckage',target:5,fighterHp:12,difficulty:2,profile:'hostile',
          recoveryLabel:'recoverable VOX navigation data',wreckageSearch:true,wreckageCount:6,inspectSeconds:1.70,
          markerGrowRange:125,captureRadius:24,foundHold:.72,

          // The VOX courier's debris field is deliberately a broad 360-degree search,
          // with long travel legs between contacts rather than a local cluster.
          wreckageField:{
            ranges:[175,275,375,495,615,755,895,1040],
            azimuths:[.30,1.28,2.20,3.15,4.15,5.28,.78,3.72],
            elevations:[-.12,.17,.11,-.16,.13,-.19,.08,.16],
            fieldYawSpan:.34,distanceScaleMin:.94,distanceScaleSpan:.12,
            azimuthJitterSpan:.14,elevationJitterSpan:.08,
            scaleMin:1.90,scaleSpan:1.00
          },

          wreckageSearchFlow:{
            firstResultAlwaysMiss:true,
            clearSideChance:.5,clearanceMin:12,clearanceScale:5.6,
            clearForwardMin:19,clearForwardOffset:2.5,clearDuration:.34
          },

          wreckagePresentation:{
            searchPromptVoice:'searchWreckageForNavigationData',
            missVoice:'noRecoverableNavigationData',
            foundVoice:'navigationDataRecovered',
            searchingText:'SEARCHING WRECKAGE',searchingHold:.58,
            markerLabel:'WRECKAGE',contactsPrefix:'WRECKAGE CONTACTS',
            foundHud:'DATA RECOVERED'
          }
        },
        {type:'space_transit',label:'Proceed to Comms Centre',duration:3.4,message:'VOX COMMS CENTRE',voice:'proceedToVoxCommsCentre'},
        {type:'station_approach',label:'VOX Comms Centre Approach',stationModel:'vox_comms',approachDistance:340,difficulty:2},
        {type:'security_checkpoint',label:'Perimeter Security',transferSeconds:3.25,difficulty:2},
        {type:'station_cleared_approach',label:'Close on Comms Centre',stationModel:'vox_comms',difficulty:2},
        {type:'station_entry',label:'Autopilot Docking',stationModel:'vox_comms',difficulty:2},
        {type:'station_secure_transfer',label:'Secure Courier Upload',stationModel:'vox_comms',transferSeconds:4.5,difficulty:2},
        {type:'station_departure',label:'Depart VOX Comms Centre',stationModel:'vox_comms',difficulty:2}
      ],
      stages:['Clear and Scan Wreckage','Proceed to Comms Centre','VOX Comms Centre Approach','Perimeter Security','Close on Comms Centre','Autopilot Docking','Secure Courier Upload','Depart']
    },

    offerMail:{
      id:'mara_offer_1',from:'Mara Venn · Contractor Services, VOX',subject:'Courier recovery',category:'story',priority:'high',
      body:[
        'A VOX courier failed to make its last hand-off. The recovery area is full of scattered wreckage, and an armed group is still sitting on it.',
        'Clear them out and scan the wreckage for recoverable navigation data. Once you have it, proceed to the VOX communications centre. Its perimeter security drone will authenticate your credentials before docking clearance is granted.',
        'Once inside, upload the recovered navigation data to the secure terminal and leave.',
        'Simple job. Keep it that way.'
      ],
      action:{type:'story',contractId:'mara_signal_1',label:'OPEN VOX CONTRACT'}
    },

    completionMail:{
      id:'mara_wait_1',from:'Mara Venn · Contractor Services, VOX',subject:'One loose end',category:'story',priority:'high',
      body:[
        'Courier navigation data reached the secure comms node intact. Thanks.',
        'There is one thing I do not understand. Shortly before it dropped off the network, the courier changed course toward a set of coordinates in a remote swamp region. That destination does not appear anywhere in the filed route.',
        'VOX has no registered site there. I want to know why the courier was heading for it.',
        'Follow the coordinates, investigate whatever you find, make a full scan and bring the data back to VOX.'
      ],
      action:{type:'story',contractId:'mara_signal_2',label:'OPEN VOX CONTRACT'}
    },

    devMailOption:{contractId:'mara_signal_1',label:'1 · Courier Recovery'}
  }
};



const envStage=(id,overrides={})=>globalThis.AgentXEnvironments.stage(id,overrides);

const node42={
  id:'node42',
  campaign:{
    contract:{
      id:'story_mara_signal_2',storyContractId:'mara_signal_2',storyFlag:'mara2',private:true,
      clientName:'Vector Operations Exchange',agentName:'Mara Venn',faction:null,
      title:'Loose End',kind:'story',family:'investigation',risk:2,minLevel:1,minRep:-100,
      pay:2800,xp:320,difficulty:2,implemented:true,musicMode:'calm',
      planetaryRequirements:{landingBody:'either',landingColour:'cyan',moonCount:{min:1,max:2}},
      description:'The courier navigation log contains one unexplained destination in a remote swamp region. Follow the coordinates, investigate whatever is there, scan it in detail, then return the scan data to a VOX communications centre for secure analysis.',
      modules:[
        {type:'planet_descent',label:'Cyan World Descent',difficulty:2},
        envStage('swamp_approach',{type:'surface_destination_approach',label:'Swamp Approach',difficulty:2}),
        envStage('alien_swamp',{
          type:'forest_corridor',label:'Deep Swamp Coordinates',difficulty:2,
          terminalDestination:'swamp_monolith_scan',entryFrom:'surface_destination',
          terminalConfig:{
            gladeStartBeforeEnd:52,anchorAhead:7,worldZAhead:10.5,
            monolith:{yaw:.08,spinRate:.18,inscription:'42',yOffset:5.34,scale:.5,mx:3.45,my:7.25,mz:1.30,standOffDistance:14.8,standOffHeight:1.96},
            stars:{count:22,radiusMin:.40,radiusSpan:1.65,speedMin:.18,speedSpan:.16,sizeMin:.13,sizeSpan:.14},
            scanSeconds:8.0
          },
          presentation:{
            start:'FOLLOW SWAMP COORDINATES',scanStart:'SCANNING MONOLITH',scanComplete:'SCAN COMPLETE · RETURN DATA TO VOX',
            hudAhead:'MONOLITH AHEAD',hudAutopilot:'AUTOPILOT · MONOLITH',hudScan:'MONOLITH SCAN',hudComplete:'SCAN COMPLETE'
          }
        }),
        {type:'space_transit',label:'Return to VOX',duration:3.4,message:'VOX COMMS CENTRE',voice:'proceedToVoxCommsCentre'},
        {type:'station_approach',label:'VOX Comms Centre Approach',stationModel:'vox_comms',approachDistance:340,difficulty:2},
        {type:'security_checkpoint',label:'Perimeter Security',transferSeconds:3.25,difficulty:2},
        {type:'station_cleared_approach',label:'Close on Comms Centre',stationModel:'vox_comms',difficulty:2},
        {type:'station_entry',label:'Autopilot Docking',stationModel:'vox_comms',difficulty:2},
        {type:'station_secure_transfer',label:'Upload Monolith Scan',stationModel:'vox_comms',transferSeconds:4.5,difficulty:2},
        {type:'station_departure',label:'Depart VOX Comms Centre',stationModel:'vox_comms',difficulty:2}
      ],
      stages:['Descend to Cyan World','Cross the Plains','Follow Deep Swamp Trail','Return to VOX','VOX Comms Centre Approach','Perimeter Security','Close on Comms Centre','Autopilot Docking','Upload Monolith Scan','Depart']
    },
    offerMail:{
      id:'mara_offer_2',from:'Mara Venn · Contractor Services, VOX',subject:'Loose end',category:'story',priority:'high',
      body:[
        'The courier navigation log has one destination that does not belong on its route: a set of coordinates in a remote swamp region.',
        'VOX has no registered site at those coordinates. I want to know why the courier was heading there.',
        'Follow the coordinates, investigate whatever you find, and make a full scan. Bring the scan data back to a VOX communications centre for secure analysis.',
        'Do not improvise a theory. Bring me evidence.'
      ],
      action:{type:'story',contractId:'mara_signal_2',label:'OPEN VOX CONTRACT'}
    },
    completionMail:{
      id:'mara_wait_2',from:'Mara Venn · Contractor Services, VOX',subject:'Node 42',category:'story',priority:'high',
      body:[
        'The scan is conclusive. The object is a genuine military relay from the Partition War. Its network designation is Node 42.',
        'That network was decommissioned after the armistice. Node 42 should have been dead for decades. It is not. The relay was active when you scanned it.',
        'I forwarded the military traffic data to Kudo Shang at OSD. He says it may be relevant to a problem they are already dealing with.',
        'He has asked for you directly. Apparently it is urgent.'
      ]
    },
    devMailOption:{contractId:'mara_signal_2',label:'2 · Loose End'}
  }
};

const relay10={
  id:'relay10Defence',
  campaign:{
    contract:{
      id:'story_kudo_defence_1',storyContractId:'kudo_defence_1',storyFlag:'kudo1',private:true,
      clientName:'Orbital Security Directorate',agentName:'Kudo Shang',faction:null,
      title:'Emergency Defence',kind:'story',family:'station_defence_recovery',risk:3,minLevel:1,minRep:-100,
      pay:3400,xp:390,difficulty:3,implemented:true,
      description:'Relay 10 is under immediate attack by rogue Partition War-pattern military drones. Defend the station, search the destroyed attackers for recoverable routing data, then upload anything useful through the station terminal before returning to base.',
      modules:[{
        type:'station_defence_recovery',label:'Defend Station, Search Wreckage and Upload Data',stationModel:'relay',approachDistance:275,
        encounterChance:1,target:6,fighterHp:13,difficulty:3,profile:'rogue',startMessage:'Defend the station',
        wreckageSearch:true,useCombatWrecks:true,stationAnchor:true,wreckageCount:6,inspectSeconds:1.70,markerGrowRange:110,captureRadius:26,
        searchPromptText:'Search the drone wreckage for anything useful',missText:'No useful data recovered',foundText:'Partial routing record recovered',
        foundHud:'Routing record recovered',foundHold:1.15,wreckageSearchFlow:{firstResultAlwaysMiss:true},
        wreckagePresentation:{searchingText:'SEARCHING WRECKAGE',searchingHold:.58,markerLabel:'WRECKAGE',contactsPrefix:'WRECKAGE CONTACTS'},
        externalDataTerminal:true,terminalCaptureRadius:30,terminalStandOff:13,transferSeconds:3.2
      }],
      stages:['Defend Relay 10','Search Drone Wreckage','Upload Recovered Data','Clear Station and Return']
    },
    offerMail:{
      id:'kudo_offer_1',from:'Kudo Shang · Orbital Security Directorate',subject:'Immediate tasking — station under attack',category:'story',priority:'high',
      body:[
        'Venn forwarded your relay scan. We have seen Partition War-pattern drones making appearances recently. I will explain what we know when there is time.',
        'There is not time now. Relay 10 is under attack by those drones.',
        'Defend the station. Destroy every hostile. Then search the wreckage for anything that tells us where they came from.',
        'No quarter. Move.'
      ],
      action:{type:'story',contractId:'kudo_defence_1',label:'ACCEPT OSD TASKING'}
    },
    devMailOption:{contractId:'kudo_defence_1',label:'3 · Emergency Defence'}
  }
};

const corvellaManifest={
  id:'corvellaManifest',
  campaign:{
    contract:{
      id:'story_corvella_manifest_1',storyContractId:'corvella_manifest_1',storyFlag:'corvella1',private:true,
      clientName:'Free Traders Compact',agentName:'Corvella Pallis',faction:'trade',
      title:'Missing Manifest',kind:'story',family:'asteroid_wreck_recovery',risk:3,minLevel:1,minRep:-100,
      pay:3600,xp:400,difficulty:3,implemented:true,musicMode:'calm',
      description:'Follow an old Free Trader survey nav through an asteroid field to the last known position of a missing carrier. Enter the wreck, download its flight recorder data, then return the recovered records to a Free Traders freight depot exterior terminal.',
      modules:[{
        type:'asteroid_wreck_recovery',label:'Missing Manifest',difficulty:3,target:5,fighterHp:12,profile:'pirate',
        combatVoice:'pirateAmbushDestroyPirates',ambushMessage:'Pirate ambush! Destroy the pirates.',
        route:{navDistance:540,navX:18,navY:-4,ambushDelay:4.2,navCaptureRadius:68,
          startMessage:'Proceed to the wreck',
          resumeMessage:'Wreck located. Continue through the field',
          thinMessage:'Wreck ahead. Continue through the asteroid belt'},
        wreck:{asset:'leviathanTrueSeparation04',scale:22,spawnDistance:1050,spawnX:8,spawnY:-1,
          rot:[.08,.16,-.07],revealDistance:700,
          gapLocal:[0,-.12,2.75],gapCaptureRadius:20,
          entryLocal:[0,-.15,-.18],entryAutopilotSpeed:16.5,entryAutopilotStop:1.55,
          blackBoxLocal:[0,-.13,-2.64],recorderStopLocal:[0,-.15,-2.10],recorderStopRadius:.65,
          transferSeconds:3.0,turnSeconds:1.75,interiorAutopilotSpeed:12.5,
          exitLocal:[0,-.15,.92],exitRevealRadius:54,exitCaptureRadius:3.5},
        returnTransit:{duration:3.15,message:'RETURNING TO FREE TRADERS FREIGHT DEPOT',hud:'TO FREIGHT DEPOT'}
      },{
        type:'free_traders_depot_terminal',label:'Upload Recorder Data',difficulty:1,scale:26,
        // Deliberately arrive on a clear three-quarter view rather than presenting the
        // warehouse facade square-on.  The lateral spawn is opposite the depot yaw so
        // the camera does not accidentally line back up with the rotated front face.
        spawnDistance:475,spawnX:-36,spawnY:-12,pitch:-.085,yaw:.58,roll:.05,
        startMessage:'Free Traders freight depot ahead',depotRevealRadius:205,terminalStageDistance:82,terminalCaptureRadius:86,
        terminalStandOff:15.5,transferSeconds:3.1,turnSeconds:1.75,clearDistance:52
      }],
      stages:['Cross the Asteroid Field','Destroy the Pirates','Continue to the Wreck','Reach the Wreck','Autopilot Into the Freighter','Download Flight Recorder Data','Exit the Wreck','Return to Free Traders Depot','Upload Recorder Data']
    },
    offerMail:{
      id:'corvella_offer_1',from:'Corvella Pallis · Free Traders Compact',subject:'Well, this is interesting',category:'story',priority:'high',
      body:[
        'Sweetie, your friend Shang sent me a shopping list with all the warmth of a search warrant.',
        'One of the materials in that equipment is specialised enough to follow. Not unique, unfortunately, but it moves in small quantities and the people moving it tend to remember who paid for it.',
        'I found a shipment that should not be where it ended up. A Free Traders carrier moved it off the books six months ago. The carrier never reached its declared destination.',
        'I have its last transponder position. It is inside an asteroid field. Follow the old survey nav in, find the wreck and download its flight recorder. If the carrier kept a local copy of the cargo manifest, it should be in there. Bring the recovered data back to our freight depot terminal. Six months out there means anything obvious was probably stripped long ago, but the recorder may still have what I need.',
        'Try not to shoot the paperwork.'
      ],
      action:{type:'story',contractId:'corvella_manifest_1',label:'OPEN FREE TRADERS CONTRACT'}
    },
    completionMail:{
      id:'corvella_wait_1',from:'Corvella Pallis · Free Traders Compact',subject:'Got it',category:'story',priority:'normal',
      body:[
        'Sweetie, I get a little dizzy just thinking about you and that big muscly drone of yours kicking those nasty pirates\' asses. Then you went crawling through that wreck for me. You really do know how to make an impression.',
        'The recorder transfer is complete and I have already got my hands all over the manifest. Give me a little time to work out what it actually tells us.',
        'The carrier was not making the run shown on its filed route. That much is already obvious. Naughty thing.'
      ]
    },
    devMailOption:{contractId:'corvella_manifest_1',label:'5 · Missing Manifest'}
  }
};


const cassianFavour={
  id:'cassianFavour',
  campaign:{
    contract:{
      id:'story_cassian_favour_1',storyContractId:'cassian_favour_1',storyFlag:'cassian1',private:true,
      clientName:'Red Jackal Combine',agentName:'Cassian Erivan-Snade',faction:'jackals',
      title:'A Small Favour',kind:'story',family:'urban_penthouse_delivery',risk:3,minLevel:1,minRep:-100,
      pay:1800,xp:380,difficulty:3,implemented:true,musicMode:'calm',
      description:'Cassian will trace the freight missing from the Free Traders manifest, but first he wants a sealed case delivered to a private Aurelia City penthouse. Customs must not inspect it. Clear the interception, descend to the city and make the handoff in the penthouse receiving room.',
      modules:[
        {type:'customs_drones',label:'Customs Intercept',difficulty:3,target:7,fighterHp:12},
        {type:'planet_descent',label:'Planet Descent',difficulty:3},
        {type:'surface_destination_approach',label:'Aurelia City Approach',difficulty:3,terrain:'plains',destination:'city',routeLength:430,treeClumps:9},
        {type:'jackal_city_delivery',label:'Penthouse Delivery',difficulty:3,cityLength:620}
      ],
      stages:['Customs Intercept','Planet Descent','Cross the Plains','Aurelia City','Penthouse Delivery']
    },
    offerMail:{
      id:'cassian_offer_1',from:'Cassian Erivan-Snade · Red Jackal Combine',subject:'A modest consideration',category:'story',priority:'high',
      body:[
        'X. Mara Venn has asked me to pursue a trail that sensible people have taken considerable trouble to erase. Naturally, I am intrigued.',
        'I can find out who bought your missing cargo. Before I begin pulling on that thread, I require a small consideration.',
        'A sealed case must reach a private penthouse in Aurelia City. It is not to be opened, scanned or surrendered. The Customs Authority may exhibit an unhelpful interest in it.',
        'Place it in the penthouse receiving room and leave. Do that, and I shall discover where your freighter\'s cargo went.'
      ],
      action:{type:'story',contractId:'cassian_favour_1',label:'ACCEPT RED JACKAL FAVOUR'}
    },
    completionMail:{
      id:'cassian_wait_1',from:'Cassian Erivan-Snade · Red Jackal Combine',subject:'The Custodian',category:'story',priority:'high',
      body:[
        'Your parcel arrived. The Customs Authority\'s objections, I gather, did not. A pleasingly concise performance.',
        'I have kept my side of the bargain. Your missing cargo was split across shell carriers after the rendezvous: fabrication feedstock, power-control hardware and several pieces of obsolete Partition War command equipment.',
        'The purchases converge on a buyer known in less reputable ledgers as the Custodian. I had assumed an obsessive collector. Collectors accumulate relics. This individual is assembling capability.',
        'One consignment is odder still: specialist biological containment equipment. Its destination sits on the edge of known xeno territory.',
        'I suggest you give that last detail back to Ms Venn. Biology is not my preferred form of ugliness.'
      ]
    },
    devMailOption:{contractId:'cassian_favour_1',label:'6 · A Small Favour'}
  }
};

const cloneStory=value=>value==null?null:JSON.parse(JSON.stringify(value));
const stories={
  mara_signal_1:voxCourier,
  mara_signal_2:node42,
  kudo_defence_1:relay10,
  kudo_bunker_2:sourceTrace,
  corvella_manifest_1:corvellaManifest,
  cassian_favour_1:cassianFavour
};

globalThis.AgentXStoryContent={
  stories,
  contract(id){return cloneStory(stories[id]?.campaign?.contract)},
  offerMail(id){return cloneStory(stories[id]?.campaign?.offerMail)},
  completionMail(id){return cloneStory(stories[id]?.campaign?.completionMail)},
  sectionContent(id){return cloneStory(stories[id])},
  devMailOptions(){return Object.values(stories).map(s=>cloneStory(s.campaign?.devMailOption)).filter(Boolean)}
};

// Compatibility aliases while the remaining mechanics are migrated to the registry.
globalThis.AgentXSourceTraceContent=sourceTrace;
globalThis.AgentXVoxCourierContent=voxCourier;
