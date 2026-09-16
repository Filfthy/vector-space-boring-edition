'use strict';

// VOX COURIER RECOVERY — AUTHORED MISSION CONTENT
//
// This file owns the authored facts of Mara Venn's first VOX story mission:
// contract/mail copy, stage composition, wreckage-field layout, scan-result rules,
// VOX-specific speech/HUD wording and station route/pacing. engine.js/campaign.js
// consume this data; they retain the reusable combat, wreck generation, scanner,
// navigation, security-checkpoint, station-entry and transfer mechanisms.
globalThis.AgentXVoxCourierContent = {
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
