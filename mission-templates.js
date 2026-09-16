'use strict';
// Agent X ordinary contracts are moving toward data-driven composition.
// Engine code owns reusable gameplay sections; this file owns how those sections
// are assembled, scaled and presented by the client faction.
//
// Live templates are deliberately built from proven reusable sections. Presentation
// follows the mission/contact style guide: routine administration is organisational;
// each faction has one canonical named contact for exceptional personal follow-up.
// asteroid_delivery proves a single substantial reusable section; station_delivery
// proves a longer composition; penthouse_delivery proves a faction-weighted hidden
// encounter slot; fighters proves a pure combat template whose target and motive are
// selected from faction-specific authored briefs rather than one global enemy pool;
// asteroids proves identified-target clearance inside a much larger destructible field;
// deep_core proves a major bespoke gameplay sequence can still be template-driven for
// campaign rules, presentation and exact planetary/destination requirements.
(function(){
  const asteroidDelivery={
    id:'asteroid_delivery',
    version:5,
    family:'asteroid_delivery',
    musicMode:'calm',
    minLevel:1,
    maxLevel:null,
    allowedFactions:['trade','security','jackals','helix','quickbite'],
    board:{category:'delivery',weight:1.15,maxPerBoard:2},
    risk:{base:1,levelsPerStep:2,max:9,jitter:1},
    reward:{
      basePay:300,payPerRisk:185,payRiskSquare:32,randomPay:150,roundPay:50,
      baseXp:55,xpPerRisk:23,xpRiskSquare:2
    },
    sections:[
      {
        type:'asteroid_mine_delivery',
        label:'Asteroid Mine Delivery',
        params:{
          difficulty:'$risk',
          routeSeconds:{base:20.5,perRisk:.65,random:3.5},
          startMessage:'ASTEROID DELIVERY RUN'
        }
      }
    ],
    presentation:{
      trade:{
        contactId:'corvella_pallis',
        cargoStyle:'case',
        titles:['Belt Supply Run','Mine Consignment','Asteroid Freight'],
        cargo:['replacement drill parts','sealed supply case','machine spares','shift stores'],
        descriptions:[
          'Sweetie, I have {cargo} that needs taking through the belt to {destination}. Try not to scratch that gorgeous drone of yours. I want the cargo and my favourite pilot back in one piece.',
          'Take {cargo} through the belt for me, babe. Nasty rocks, simple handoff, and another excuse for you to make that big drone look unfairly good.',
          'A remote mining crew needs {cargo}. Get it to {destination}, sweetie. Clean handoff, no drama, and I will think very fond thoughts about you.'
        ],
        completionSubjects:['MINE DELIVERY CONFIRMED','CONSIGNMENT DELIVERED'],
        completionBodies:[
          'Receiving has confirmed delivery at {destination}. Payment: CR {credits}. Standing: +{rep}.',
          'The consignment was accepted at {destination}. CR {credits} has been released through VOX. Standing: +{rep}.'
        ],
        failureMail:{
          contactId:'corvella_pallis',
          subjects:['SWEETIE, WHAT HAPPENED?','RE: THAT MINE RUN','NOT YOUR BEST, BABE'],
          bodies:[
            'Oh, Sweetie. All that beautiful hardware and the mine still never got {cargo}. You have completely spoiled the heroic picture I had in my head.',
            'Babe, I was expecting a dangerous belt run and a smug little success message. Instead I have an angry receiving crew and no parcel. Not your sexiest performance.',
            'Sweetie, the cargo did not arrive and the client is shouting at me. I like boasting about you. Please stop making that difficult.'
          ]
        },
        abandonMail:{
          contactId:'corvella_pallis',
          subjects:['YOU WALKED AWAY, SWEETIE','RE: ABANDONED RUN','BABE. SERIOUSLY?'],
          bodies:[
            'Sweetie, you accepted my freight and then turned around before it got there. I can forgive bad luck. Walking away from me is much harder to make charming.',
            'Babe, the mine is still waiting because you walked away. I was promised a big dangerous drone doing heroic things, not a retreat. I am properly pissed off with you.',
            'Sweetie, if the route is too much, tell me before you take the contract. Abandoning it halfway through is a very effective way to become less attractive.'
          ]
        },
        personalFollowUp:{
          contactId:'corvella_pallis',minRisk:5,chance:.20,
          subjects:['RE: BELT RUN','NICE WORK, BABE'],
          bodies:[
            'Babe, that belt was ugly and you still put the consignment exactly where it belonged. Big drone, tight gaps, perfect finish. You are showing off for me now.',
            'Sweetie, receiving says {cargo} arrived intact. I do enjoy it when you make something horrible look that easy.',
            'Difficult route, clean handoff, not a scratch worth complaining about. Gorgeous work, X.'
          ]
        }
      },
      security:{
        contactId:'kudo_shang',
        cargoStyle:'case',
        titles:['Secure Mine Transfer','Directorate Stores Run','Belt Supply Detail'],
        cargo:['sealed evidence case','sensor package','security stores','replacement beacon module'],
        descriptions:[
          'Move {cargo} to {destination}. Maintain custody. Finish the run.',
          'Get Directorate property to {destination}. The belt is a hazard. Strong operators go through hazards.',
          'Secure transfer to {destination}. Deliver {cargo} intact. No excuses.'
        ],
        completionSubjects:['TRANSFER CONFIRMED','DIRECTORATE DELIVERY CLOSED'],
        completionBodies:[
          'Custody transfer confirmed at {destination}. Contract payment: CR {credits}. Standing: +{rep}.',
          'Directorate property was received intact. CR {credits} released. Standing: +{rep}.'
        ],
        failureMail:{
          contactId:'kudo_shang',
          subjects:['MISSION FAILURE RECORDED','UNACCEPTABLE OUTCOME','RE: SECURE TRANSFER'],
          bodies:[
            'The transfer failed. Directorate property did not reach {destination}. You had the objective and the machine to complete it. Correct the weakness.',
            'Objective not completed. You did not finish. Unacceptable.',
            'Terrain does not defeat disciplined operators. You failed the transfer. Do not repeat it.'
          ]
        },
        abandonMail:{
          contactId:'kudo_shang',
          subjects:['UNAUTHORISED WITHDRAWAL','CONTRACT ABANDONED','RE: WITHDRAWAL'],
          bodies:[
            'You withdrew without completing the transfer. No withdrawal was ordered. You chose weakness over the objective.',
            'Contract abandoned. The objective remained viable. Choosing not to complete it is not an operational complication.',
            'You accepted custody and then terminated the run before handoff. That is unacceptable, X.'
          ]
        },
        personalFollowUp:{
          contactId:'kudo_shang',minRisk:5,chance:.16,
          subjects:['RE: SECURE TRANSFER','BELT TRANSFER'],
          bodies:[
            'Transfer complete. No loss. Decisive work.',
            'Receiving confirmed intact custody. Efficiently handled.',
            'Delivery record is clean. Good work.'
          ]
        }
      },
      jackals:{
        contactId:'cassian_erivan_snade',
        cargoStyle:'case',
        titles:['A Small Favour','Rockside Consignment','Private Delivery'],
        cargo:['sealed private case','unmarked equipment case','private stores','sealed package'],
        descriptions:[
          'A private consignment requires conveyance to {destination}. Questions are neither necessary nor useful.',
          'Certain associates among the rocks require {cargo}. Deliver it, discreetly and intact.',
          'Carry {cargo} to {destination}. The fewer people who remember the journey, the better.'
        ],
        completionSubjects:['CONSIGNMENT RECEIVED','PRIVATE DELIVERY ACKNOWLEDGED'],
        completionBodies:[
          'Receipt has been acknowledged at {destination}. Agreed payment: CR {credits}. Standing: +{rep}.',
          'The consignment reached its intended hands. CR {credits} released through VOX. Standing: +{rep}.'
        ],
        failureMail:{
          contactId:'cassian_erivan_snade',
          subjects:['A DISAPPOINTING LITTLE CATASTROPHE','RE: OUR MISSING CONSIGNMENT','THE PARCEL, X'],
          bodies:[
            'I entrusted you with a parcel, X, not the Charge of the Light Brigade. The parcel is gone and the mine remains empty. A most disappointing little catastrophe.',
            'Our consignment has failed to arrive. One is reminded that fortune favours the bold, but apparently not the fronking careless.',
            'The Greeks had tragedy, the Romans had decline, and I have your delivery report. I confess I preferred their versions.'
          ]
        },
        abandonMail:{
          contactId:'cassian_erivan_snade',
          subjects:['YOU ABANDONED MY CONTRACT','A FAILURE OF NERVE','RE: YOUR RETREAT'],
          bodies:[
            'You accepted a commission and then abandoned it. Even Falstaff had the decency to invent a better excuse. Do not make a habit of wasting my time.',
            'Retreat can be strategically elegant, X. Walking away from my parcel because the road became unpleasant is merely irritating.',
            'There is a Latin phrase for this sort of performance. I shall spare you the conjugation and give you the translation: do not do it again.'
          ]
        },
        personalFollowUp:{
          contactId:'cassian_erivan_snade',minRisk:5,chance:.22,
          subjects:['A SATISFYING CONCLUSION','RE: PRIVATE CONSIGNMENT'],
          bodies:[
            'A most satisfactory conclusion, X. The belt attempted the role of Scylla and Charybdis, yet our parcel arrived without becoming a cautionary tale.',
            'Veni, vidi, delivered. Caesar would perhaps have found the logistics disappointingly efficient.',
            'The miners have their parcel and no chorus of aggrieved officials has reached my ears. A consummation devoutly to be wished. Fronking marvellous.'
          ]
        }
      },
      helix:{
        contactId:'navira_derris',
        cargoStyle:'case',
        titles:['Mine Component Transfer','Field Equipment Delivery','Extraction Site Supply'],
        cargo:['calibration assembly','survey instrument','sealed assay unit','replacement field controller'],
        descriptions:[
          'Transfer {cargo} to the marked Helix extraction site at {destination}. Container integrity is required.',
          'A mining team requires {cargo}. Deliver it to {destination} through the active asteroid field.',
          'Field equipment transfer to {destination}. Avoid unnecessary impact loading.'
        ],
        completionSubjects:['MATERIAL RECEIVED','FIELD TRANSFER COMPLETE'],
        completionBodies:[
          'Helix receiving confirmed intact delivery at {destination}. Payment: CR {credits}. Standing: +{rep}.',
          'The field team logged receipt of the consignment. CR {credits} released. Standing: +{rep}.'
        ],
        failureMail:{
          contactId:'navira_derris',
          subjects:['DELIVERY OUTCOME: FAILURE','TRANSIT RESULT','OPERATOR VARIANCE'],
          bodies:[
            'The expected outcome was successful delivery of {cargo}. The observed outcome was failure. The discrepancy is attributable primarily to operator performance.',
            'The consignment did not reach {destination}. The route model allowed for environmental loss. It did not allocate this much probability to you.',
            'Delivery failed. Project delay is now measurable, avoidable, and therefore irritating.'
          ]
        },
        abandonMail:{
          contactId:'navira_derris',
          subjects:['VOLUNTARY TERMINATION','RE: ABANDONED TRANSFER','INEFFICIENT OUTCOME'],
          bodies:[
            'You terminated a viable contract before delivery. That converted a difficult route into a guaranteed failure. This is not an optimisation.',
            'The transfer was abandoned by the operator. I have updated the model to include voluntary non-completion as a human hazard.',
            'You chose not to deliver the component. The resulting project delay is less interesting than the decision that caused it.'
          ]
        },
        personalFollowUp:{
          contactId:'navira_derris',minRisk:5,chance:.18,
          subjects:['TRANSIT RESULT','RE: MATERIAL TRANSFER'],
          bodies:[
            'The component arrived inside tolerance despite the transit environment. That is statistically irritating. Well done.',
            'Receiving logged no significant shock damage. The route model assigned that outcome a lower probability than I did.',
            'The mine has the equipment. Projected downtime has fallen by 11.4 percent. Useful.'
          ]
        }
      },
      quickbite:{
        contactId:'nyxo_malloc',
        cargoStyle:'food',
        titles:["Miner's Lunch",'Hot Food Run','Belt Lunch Delivery','Shift Order'],
        cargo:['shift meal order','twelve pizzas and two coolers','catering crate','late-shift order'],
        descriptions:[
          'Get {cargo} to {destination}. Customer has already paid.',
          'Take {cargo} through the rocks to the mine. Yeah, it is still supposed to be hot.',
          'Delivery to {destination}. Please do not lose the food or the drone.'
        ],
        completionSubjects:['ORDER DELIVERED','DELIVERY CLOSED'],
        completionBodies:[
          'Order accepted at {destination}. Payment: CR {credits}. Standing: +{rep}.',
          'The mine confirmed delivery. CR {credits} released through VOX. Standing: +{rep}.'
        ],
        failureMail:{
          contactId:'nyxo_malloc',
          subjects:['DUDE. WHAT THE SHIZ?','THEY KNEW THE RISKS. YOU STILL HAD ONE JOB.','THIS IS A MESS'],
          bodies:[
            'Dude, the food is gone, the drone is gone, the customer is losing their shit, and Dispatch made it my problem. Great.',
            'Freaking hell, X. They took jobs at an asteroid mine, so yes, this is where the contractor-risk argument applies. It still does not explain how you lost the pizza.',
            'What the shiz was that? Receiving is screaming about the order, Accounts is screaming about the loss, and I am stuck between them. Awesome shift, dude.',
            'Dude. They chose to work on a rock inside an asteroid belt. They knew the risks. Corporate says that does not cover missing dinner. Annoyingly, they have a point.'
          ]
        },
        abandonMail:{
          contactId:'nyxo_malloc',
          subjects:['YOU BAILED?','DUDE. NO.','WHERE IS THEIR FOOD?'],
          bodies:[
            'Dude. You bailed with somebody\'s dinner? I cannot even make the contractor-risk argument here. They took a job in an asteroid mine. They did not sign up for the courier to leave.',
            'What the shiz, X? The customer lives on a rock in an asteroid belt. Of course they knew the risks. They did not know the courier might just leave.',
            'You abandoned the order. Now I have to apologise, refund it and find another driver. This is shiz, dude.',
            'Freaking hell. The mine crews chose to work inside an asteroid belt. That is where “they knew the risks” applies. “Agent X went home” is not one of the risks.'
          ]
        },
        personalFollowUp:{
          // Nyxo is the frequency exception to the project's restrained profanity rule:
          // casual and deadpan, but never stronger than 'shit'.
          contactId:'nyxo_malloc',minRisk:5,chance:.24,
          subjects:['DUDE','FREAKING NICE, DUDE','THEY KNEW THE RISKS','RE: THAT BELT'],
          bodies:[
            'Dude, that belt was freaking murderous. Receiving says the route should have been safer. They run a mine inside an asteroid field. They knew the risks. You got the food in. Awesome.',
            'That mine ordered hot food through an asteroid belt and then acted surprised the route was dangerous. What did they expect? Anyway, you nailed it. Freaking beautiful.',
            'Receiving asked if QuickBite has a safer delivery option. Dude, no. They chose to work on a rock in a field of other rocks. That is the contractor-risk bit. Food is there. Money is there. Awesome.',
            'Freaking hell, X. The route looked like shit, the customer was whining, and Dispatch had already marked the order late. Then you actually delivered it. I almost respect this job.',
            'Nobody lost the pizza. Nobody lost the drone. Receiving still wants to argue. Dude, they chose to work in a mine inside an asteroid belt. They knew the risks. Successful freaking shift.'
          ]
        }
      }
    },
    defaults:{
      destination:'Belt Mine 7',
      cargo:'sealed delivery case'
    }
  };


  const stationDelivery={
    id:'station_delivery',
    version:2,
    family:'city_station_delivery',
    musicMode:'calm',
    minLevel:1,
    maxLevel:null,
    allowedFactions:['trade','security','jackals','helix','quickbite'],
    board:{category:'delivery',weight:.85,maxPerBoard:2},
    risk:{base:2,min:2,levelsPerStep:2,max:4,jitter:1},
    reward:{
      basePay:2700,payPerRisk:2050,payRiskSquare:0,randomPay:350,roundPay:50,
      baseXp:360,xpPerRisk:80,xpRiskSquare:8
    },
    // Civilian traffic is part of the urban environment, not target dressing.
    // Collisions count as incidents; deliberately shooting traffic is weighted
    // more heavily and must change settlement, reputation and correspondence.
    civilianTrafficPolicy:{
      collisionWeight:1,assaultWeight:2,
      tiers:[
        {min:1,max:1,payMultiplier:.75,repMultiplier:.5,allowGift:false,failureRepPenalty:2},
        {min:2,max:2,payMultiplier:.40,repMultiplier:0,allowGift:false,failureRepPenalty:4},
        {min:3,payMultiplier:0,repMultiplier:0,allowGift:false,failureRepPenalty:8}
      ]
    },
    sections:[
      {type:'planet_descent',label:'Planet Descent',params:{difficulty:'$risk'}},
      {type:'surface_destination_approach',label:'City Approach',params:{difficulty:'$risk',terrain:'plains',destination:'city',routeLength:390,treeClumps:7}},
      {type:'urban_ground_pickup',label:'Groundside Collection Room',params:{difficulty:'$risk',cityLength:540,pickupWorldZ:365,pickupSide:-1}},
      {type:'urban_exit',label:'City Exit',params:{difficulty:'$risk'}},
      {type:'planet_launch',label:'Planet Launch',params:{difficulty:'$risk'}},
      {type:'space_transit',label:'Orbital Transfer',params:{difficulty:'$risk',duration:4.25,message:'TRANSIT TO STATION',playZoomSound:false}},
      {
        type:'station_xeno_arrival',label:'Relay 10 Arrival',
        params:{difficulty:'$risk',stationModel:'Relay Truck Stop',approachDistance:460,pad:'03',encounterChance:.42,target:{base:4,perRisk:1,min:6,max:8,round:true}}
      },
      {type:'station_pad_approach',label:'Relay 10 Pad Approach',params:{difficulty:'$risk',stationModel:'Relay Truck Stop',approachDistance:460,pad:'03'}},
      {type:'station_pad_delivery',label:'Pad 03 Delivery',params:{difficulty:'$risk',pad:'03'}},
      {type:'station_pad_departure',label:'Station Departure',params:{difficulty:'$risk',pad:'03'}}
    ],
    presentation:{
      trade:{
        contactId:'corvella_pallis',cargoStyle:'case',
        titles:['Groundside Relay','City to Station','Orbital Collection Run','Relay 10 Freight'],
        cargo:['sealed freight case','station machine spares','merchant consignment','replacement service parts'],
        descriptions:[
          'Sweetie, pick up {cargo} groundside, get that gorgeous machine into orbit and put the case on the pad at {destination}. Try not to make me worry.',
          'Groundside collection is ready, babe. City, launch, station handoff. Long way to carry a parcel, but I do like giving you reasons to show off.',
          'Pick up {cargo} from {origin} and take it to {destination}. Nice clean run for my favourite over-armed courier, please.'
        ],
        completionSubjects:['RELAY DELIVERY CONFIRMED','STATION HANDOFF COMPLETE','PAD 03 RECEIPT'],
        completionBodies:[
          'Relay 10 confirmed receipt of {cargo}. Payment: CR {credits}. Standing: +{rep}.',
          'The groundside consignment was accepted at {destination}. CR {credits} has been released through VOX. Standing: +{rep}.'
        ],
        encounterAcknowledgements:{station_xeno:[
          'Relay 10 also recorded your clearance of the xeno infestation on approach. That action was outside the freight brief and has been noted.',
          'Station traffic control logged an unplanned xeno infestation during your approach. The route was cleared before delivery.'
        ]},
        civilianTrafficMail:{
          contactId:'corvella_pallis',
          assaultSubjects:['SWEETIE. THE TRAFFIC.','BABE, WHAT WERE YOU THINKING?','RE: CIVILIAN TRAFFIC'],
          incidentSubjects:['SWEETIE, WATCH THE TRAFFIC','RE: CITY INCIDENT'],
          assaultBodies:[
            'Sweetie, you know I like a dangerous pilot. Shooting commuters is not the kind of dangerous I meant. Settlement cut from CR {fullCredits} to CR {credits}. Do not make me regret finding you attractive.',
            'Babe, I can explain a late handoff. I cannot flirt my way through “my favourite courier shot civilian traffic”. Your settlement is CR {credits}, and I am properly pissed off with you.'
          ],
          incidentBodies:[
            'Sweetie, the freight made Relay 10, but city control logged civilian traffic trouble. I have smoothed it over and cut the settlement to CR {credits}. Be gorgeous somewhere that is not full of commuters next time.'
          ],
          failureAddenda:['And yes, Sweetie, I saw the civilian-traffic report too. Failing the job was bad enough. Involving civilians made it much worse.'],
          abandonAddenda:['Babe, abandoning my contract after causing civilian traffic trouble is not a combination I ever want to see from you again.']
        },
        failureMail:{
          contactId:'corvella_pallis',subjects:['SWEETIE, THAT WAS A MESS','RE: RELAY 10','BABE, WE HAVE A PROBLEM'],
          bodies:[
            'Sweetie, one room, one launch, one station pad. Somehow my terrifyingly capable favourite courier turned that into a missing parcel. I am not impressed.',
            'Babe, Relay 10 never got {cargo}. All those engines, all those guns, and I am still the one smiling at Accounts with nothing to show for it.',
            'Sweetie, I put my name behind you and now both ends of the job are shouting at me. You owe me a much prettier performance next time.'
          ]
        },
        abandonMail:{
          contactId:'corvella_pallis',subjects:['YOU LEFT THEM WAITING, SWEETIE','BABE. YOU WALKED AWAY.','RE: ABANDONED RELAY RUN'],
          bodies:[
            'Sweetie, you picked up my job and then walked away from it. Relay 10 is still waiting and I am the one explaining why. I am not remotely charmed.',
            'Babe, if the run is impossible, tell me before you take it. I can forgive a wreck. I am much less forgiving about being stood up by my own courier.',
            'Sweetie, the customer was expecting that package on Pad 03. You chose not to finish the run. Very dramatic. Very disappointing.'
          ]
        },
        personalFollowUp:{
          contactId:'corvella_pallis',minRisk:3,chance:.18,encounterMinRisk:2,encounterChance:.52,
          subjects:['RE: RELAY 10','NICE WORK, SWEETIE','THAT STATION RUN'],
          bodies:[
            'Sweetie, clean pickup, clean launch, clean handoff. Very competent. Very attractive. Do keep doing that.',
            'Babe, Relay 10 says the parcel landed exactly where it should. I knew that big shiny brute of yours would behave for me.'
          ],
          encounterBodies:{station_xeno:[
            'Sweetie, you were hired to move a parcel, not flatten a xeno infestation. You did both and still made Pad 03. I am getting a little dizzy thinking about it.',
            'Babe, Relay 10 says you cleared the xenos and then calmly delivered the freight. Big guns, perfect handoff. This is exactly why I keep finding jobs for you.'
          ]}
        }
      },
      security:{
        contactId:'kudo_shang',cargoStyle:'case',
        titles:['Secure Relay Transfer','Directorate Station Supply','Orbital Custody Run','Relay 10 Secure Handoff'],
        cargo:['sealed evidence container','encrypted sensor module','Directorate security stores','authorised comms package'],
        descriptions:[
          'Collect {cargo} from the authorised groundside room and maintain custody through delivery to {destination}.',
          'Secure transfer required from the city to {destination}. Deliver {cargo} intact.',
          'Retrieve Directorate property groundside, launch and complete the authorised handoff at {destination}.'
        ],
        completionSubjects:['SECURE TRANSFER CLOSED','CUSTODY HANDOFF CONFIRMED','RELAY DELIVERY COMPLETE'],
        completionBodies:[
          'Custody transfer at {destination} is confirmed. Payment: CR {credits}. Standing: +{rep}.',
          'Directorate property was received intact at Relay 10. CR {credits} released. Standing: +{rep}.'
        ],
        encounterAcknowledgements:{station_xeno:[
          'Station control additionally confirmed that the xeno infestation was cleared before final approach. That action was outside tasking.',
          'Unplanned hostile xeno contact at Relay 10 was resolved without loss of the consignment. Additional action recorded.'
        ]},
        civilianTrafficMail:{
          contactId:'kudo_shang',
          assaultSubjects:['CIVILIAN ASSAULT RECORDED','UNAUTHORISED FIRE ON CIVIL TRAFFIC','DISCIPLINARY NOTE'],
          incidentSubjects:['CIVIL TRAFFIC INCIDENT','OPERATOR CONDUCT NOTE'],
          assaultBodies:[
            'You fired on civilian traffic during an authorised transfer. The delivery does not excuse the conduct. Settlement reduced to CR {credits}. Positive standing withheld. Do not repeat it.',
            'Directorate logs show deliberate weapons fire against civilian vehicles. That is unacceptable. The cargo arrived. Your conduct did not meet the same standard.'
          ],
          incidentBodies:['Civil traffic was involved during the transfer. The incident has been recorded and the settlement reduced to CR {credits}. Maintain separation from non-hostile traffic.'],
          failureAddenda:['The civilian-traffic incident is recorded separately. Mission failure does not cancel the conduct review.'],
          abandonAddenda:['You also left a civilian-traffic incident on the record before withdrawing. That compounds the decision to abandon the transfer.']
        },
        failureMail:{
          contactId:'kudo_shang',subjects:['TRANSFER FAILURE RECORDED','CUSTODY FAILURE','UNACCEPTABLE OUTCOME'],
          bodies:[
            'The secure transfer failed. {cargo} did not reach {destination}. That result is below Directorate standard.',
            'Custody was accepted and the authorised handoff did not occur. Your performance on this contract was unacceptable.',
            'The mission record shows a failed ground-to-orbit transfer. Correct the deficiency before accepting comparable work.'
          ]
        },
        abandonMail:{
          contactId:'kudo_shang',subjects:['UNAUTHORISED WITHDRAWAL','SECURE CONTRACT ABANDONED','RE: RELAY TRANSFER'],
          bodies:[
            'You withdrew before completing the authorised handoff. No withdrawal was requested or approved.',
            'Contract abandoned after acceptance. The destination remained active. Your decision is now part of the Directorate record.',
            'You accepted a custody transfer and chose not to complete it. That is unacceptable, X.'
          ]
        },
        personalFollowUp:{
          contactId:'kudo_shang',minRisk:3,chance:.14,encounterMinRisk:2,encounterChance:.44,
          subjects:['RE: RELAY TRANSFER','ADDITIONAL ACTION RECORDED'],
          bodies:['Transfer completed efficiently. No custody discrepancy. Good work.','Relay 10 logged an intact handoff. Acceptable work, X.'],
          encounterBodies:{station_xeno:[
            'The xeno contact was not part of your tasking. You cleared it, retained the consignment and completed the transfer. Good work.',
            'Additional action at Relay 10 was efficient and proportionate. Delivery remained intact. Noted.'
          ]}
        }
      },
      jackals:{
        contactId:'cassian_erivan_snade',cargoStyle:'case',
        titles:['A Change of Scenery','Ground to Orbit, Quietly','The Relay Arrangement','A Modest Conveyance'],
        cargo:['sealed private case','unregistered components','a discreet equipment package','private station stores'],
        descriptions:[
          'Collect {cargo} from the city and convey it to {destination}. Discretion remains preferable to explanation.',
          'A parcel waits groundside and certain associates await it at {destination}. See that the two are introduced.',
          'Move {cargo} from {origin} to {destination}. Its biography is none of our concern.'
        ],
        completionSubjects:['THE PARCEL HAS ARRIVED','A SATISFACTORY HANDOFF','RELAY 10 ACKNOWLEDGES RECEIPT'],
        completionBodies:[
          'Our associates at Relay 10 acknowledge receipt. CR {credits} released. Standing: +{rep}.',
          'The parcel completed its little ascent from groundside obscurity to orbital usefulness. Payment: CR {credits}. Standing: +{rep}.'
        ],
        encounterAcknowledgements:{station_xeno:[
          'The station also records that you removed an inconvenient xeno infestation before making the handoff. An unscheduled but useful embellishment.',
          'Relay 10 notes that the local fauna attempted to complicate matters. You corrected the matter before delivery.'
        ]},
        civilianTrafficMail:{
          contactId:'cassian_erivan_snade',
          assaultSubjects:['THE ART OF DISCRETION','A PUBLIC PERFORMANCE','ON SHOOTING COMMUTERS'],
          incidentSubjects:['AN AVOIDABLE DISTURBANCE','A NOTE ON TRAFFIC'],
          assaultBodies:[
            'The parcel arrived, yes. You also shot at civilian traffic in broad view of the city. Machiavelli wrote extensively on power. Nowhere did he recommend announcing a discreet courier job by firing upon commuters. Your settlement is CR {credits}.',
            'X, discretion is the art of not becoming the story. Shooting civilian vehicles made you very much the story. The delivery stands. The full payment does not.'
          ],
          incidentBodies:['Our little conveyance succeeded, but your encounter with civilian traffic generated precisely the attention we sought to avoid. The reduced CR {credits} settlement reflects the inconvenience.'],
          failureAddenda:['As if failure lacked ornament, the civilian-traffic report gives it a particularly vulgar flourish.'],
          abandonAddenda:['And then, having attracted civilian attention, you abandoned the undertaking. Even retreat should possess some elegance.']
        },
        failureMail:{
          contactId:'cassian_erivan_snade',subjects:['A VERY SHORT ODYSSEY','THE PARCEL DID NOT ARRIVE','AN INELEGANT CONCLUSION'],
          bodies:[
            'Odysseus at least reached Ithaca eventually. You had one city, one launch and one station, X, and still contrived not to deliver the parcel.',
            'Our package has not arrived at Relay 10. I commissioned a transfer, not an allegory for imperial decline.',
            'The enterprise has ended without cargo, payment or dignity. Of the three, I confess the last irritates me most.'
          ]
        },
        abandonMail:{
          contactId:'cassian_erivan_snade',subjects:['YOU ABANDONED MY PARCEL','A RETREAT WITHOUT GRANDEUR','RE: YOUR DEPARTURE'],
          bodies:[
            'You accepted my commission and then abandoned it. Retreat may be strategic. This was merely tedious.',
            'Hannibal crossed the Alps with elephants. You were asked to cross a city and a little empty space. Perspective is a cruel thing, X.',
            'One expects betrayal to possess at least a little theatre. Walking away from a delivery is simply bad manners.'
          ]
        },
        personalFollowUp:{
          contactId:'cassian_erivan_snade',minRisk:3,chance:.20,encounterMinRisk:2,encounterChance:.50,
          subjects:['A SATISFYING ASCENT','RE: RELAY 10','AN UNPLANNED DIVERSION'],
          bodies:[
            'Groundside to orbit, parcel to pad, and scarcely a scandal in between. Almost disappointingly competent.',
            'The package is aboard Relay 10 and no official has yet asked me an interesting question. Excellent.'
          ],
          encounterBodies:{station_xeno:[
            'A delivery interrupted by ravenous xenoforms has a pleasingly classical shape: danger, struggle, catharsis, then someone signs for the parcel. Splendid work, X.',
            'Relay 10 acquired an infestation. You supplied the deus ex machina and then, admirably, remembered the package. Fronking efficient.'
          ]}
        }
      },
      helix:{
        contactId:'navira_derris',cargoStyle:'case',
        titles:['Orbital Instrument Transfer','Relay Calibration Run','Groundside Sample Transfer','Station Systems Delivery'],
        cargo:['calibration assembly','sealed assay instrument','prototype control module','environmental sample package'],
        descriptions:[
          'Collect {cargo} from the groundside facility and transfer it to {destination}. Maintain container integrity.',
          'A Helix station team requires {cargo}. Retrieve it in the city and complete orbital delivery to {destination}.',
          'Transfer {cargo} from {origin} to Relay 10. Avoid unnecessary mechanical shock.'
        ],
        completionSubjects:['TRANSFER DATA CLOSED','RELAY MATERIAL RECEIVED','HANDOFF CONFIRMED'],
        completionBodies:[
          'Relay 10 logged intact receipt of {cargo}. Payment: CR {credits}. Standing: +{rep}.',
          'The ground-to-orbit transfer completed within acceptable handling tolerances. CR {credits} released. Standing: +{rep}.'
        ],
        encounterAcknowledgements:{station_xeno:[
          'The xeno infestation encountered on approach was also cleared. The resulting combat telemetry has been retained for analysis.',
          'Relay 10 logged hostile xeno activity before handoff. Clearance prevented contamination of the receiving area.'
        ]},
        civilianTrafficMail:{
          contactId:'navira_derris',
          assaultSubjects:['TARGET CLASSIFICATION FAILURE','CIVILIAN VEHICLE FIRE EVENT','OPERATOR ERROR'],
          incidentSubjects:['TRAFFIC INTERACTION OUTLIER','TRANSFER CONDUCT DATA'],
          assaultBodies:[
            'You fired on civilian vehicles during the transfer. They were not hostile contacts. The classification error is sufficiently fundamental that I do not require additional telemetry. Settlement reduced to CR {credits}.',
            'The cargo arrived. Your weapons discipline did not. Civilian traffic has a distinct visual and behavioural signature. Treating it as a target is not an interesting ambiguity.'
          ],
          incidentBodies:['The transfer completed, but civilian-traffic contact exceeded acceptable operating tolerance. The reduced settlement is CR {credits}.'],
          failureAddenda:['Civilian traffic was also involved. That removes several external explanations for the failed outcome and leaves operator judgement as the dominant variable.'],
          abandonAddenda:['The traffic incident occurred before voluntary non-completion. Neither event improves the optimisation model.']
        },
        failureMail:{
          contactId:'navira_derris',subjects:['TRANSFER OUTCOME: FAILURE','LOGISTICS VARIANCE','RELAY DELIVERY RESULT'],
          bodies:[
            'The required state was {cargo} present at {destination}. The observed state was not. Operator performance remains the dominant variable.',
            'The transfer failed. Project delay is now measurable and avoidable, which makes it substantially less interesting.',
            'Relay 10 did not receive the package. I have removed several environmental explanations from the model.'
          ]
        },
        abandonMail:{
          contactId:'navira_derris',subjects:['VOLUNTARY NON-COMPLETION','RE: ABANDONED TRANSFER','OPERATOR TERMINATION EVENT'],
          bodies:[
            'You terminated a viable transfer before delivery. That converted uncertain risk into certain failure. It is not an optimisation.',
            'The contract was abandoned by the operator. I have added voluntary non-completion to the logistics model. I would prefer not to need the variable.',
            'You chose not to complete the relay transfer. The decision is less defensible than the route.'
          ]
        },
        personalFollowUp:{
          contactId:'navira_derris',minRisk:3,chance:.16,encounterMinRisk:2,encounterChance:.48,
          subjects:['RE: TRANSFER DATA','RELAY 10 TELEMETRY'],
          bodies:['Container shock remained below tolerance throughout transfer. Useful.','Relay 10 received the apparatus without measurable handling damage. Good.'],
          encounterBodies:{station_xeno:[
            'The xeno encounter produced useful approach telemetry and you still delivered the package intact. The combination is unexpectedly efficient.',
            'You cleared the infestation before handoff. Relay 10 recovered biological residue from the pad perimeter. That may be more interesting than the delivery.'
          ]}
        }
      },
      quickbite:{
        contactId:'nyxo_malloc',cargoStyle:'food',
        titles:['Groundside to Pad 03','Relay 10 Catering Run','Orbital Lunch Transfer','Station Order'],
        cargo:['franchise catering crate','late-shift pizza order','two hot-food carriers and drinks','Relay 10 crew order'],
        descriptions:[
          'Pick up {cargo} groundside and get it to {destination}. Dude, yes, they actually ordered from orbit.',
          'Collect {cargo} in the city, launch, and deliver to Pad 03. Customer has already started asking where it is.',
          'Groundside pickup for Relay 10. Get {cargo} onto the station before some grint requests a refund.'
        ],
        completionSubjects:['ORDER DELIVERED','PAD 03 GOT THE FOOD','RELAY 10 CLOSED'],
        completionBodies:[
          'Relay 10 accepted the order. Payment: CR {credits}. Standing: +{rep}.',
          'Pad 03 confirmed receipt. CR {credits} released through VOX. Standing: +{rep}.'
        ],
        encounterAcknowledgements:{station_xeno:[
          'Station control also logged a xeno infestation on approach. The order still reached Pad 03 after the area was cleared.',
          'Relay 10 recorded hostile xeno activity before delivery. QuickBite has classified this as an external route disruption.'
        ]},
        civilianTrafficMail:{
          contactId:'nyxo_malloc',
          assaultSubjects:['DUDE. THOSE WERE CIVILIANS.','WHAT THE ACTUAL SHIZ?','YOU SHOT THE COMMUTERS'],
          incidentSubjects:['DUDE. THE TRAFFIC.','CITY CONTROL IS LOSING ITS SHIT'],
          assaultBodies:[
            'Dude. You shot civilian traffic on a food run. What the actual shiz? And no, “they knew the risks” does not work here. They were commuters. They were going to work. Your CR {fullCredits} job is down to CR {credits}.',
            'Dude. Xenos? Fine. Pirates? Fine. Random commuter going home from work? NOT THE TARGET. The food got there. Most of your payment did not.',
            'You delivered the order and also shot the customers. Freaking brilliant, dude. Corporate docked the run to CR {credits}, and I had to explain that sentence.'
          ],
          incidentBodies:['Dude, the food arrived, but city control says you bounced off civilian traffic on the way out. That is not what “contactless delivery” means. Settlement is CR {credits}. Try not to hit the customers.'],
          failureAddenda:['Also: civilians? Freaking seriously? You cannot use the contractor-risk argument on commuters, dude. They were just going to work.'],
          abandonAddenda:['And you messed with civilian traffic before bailing? Dude. Now I have an abandoned order and an incident report. Awesome.']
        },
        failureMail:{
          contactId:'nyxo_malloc',subjects:['DUDE. HOW?','WHAT THE SHIZ HAPPENED?','PAD 03 HAS NO FOOD'],
          bodies:[
            'Dude, you had the food, a spaceship and a station marker. Pad 03 still has no food. That is almost impressive.',
            'What the shiz, X? Groundside says you collected it. Relay 10 says it never arrived. Accounts wants me to explain the missing bit in the middle.',
            'Shit, dude. The customer wants a refund, Dispatch says the route was fine, and I am apparently the adult here. Think about that.'
          ]
        },
        abandonMail:{
          contactId:'nyxo_malloc',subjects:['YOU JUST BAILED?','DUDE. THE FOOD.','WHERE DID YOU GO?'],
          bodies:[
            'Dude, you picked up their order and then bailed. I cannot blame pirates, xenos or route conditions. The route condition was you leaving.',
            'What the shiz? Pad 03 is still waiting, the food is still your problem, and now I have to call the customer. This is shit.',
            'You abandoned a food order halfway between a city and a space station. Dude. There are easier ways to get a one-star review.'
          ]
        },
        personalFollowUp:{
          // Nyxo swears more often than the rest of the cast, but keeps it mild.
          contactId:'nyxo_malloc',minRisk:3,chance:.26,encounterMinRisk:2,encounterChance:.62,
          subjects:['DUDE','FREAKING NICE','RE: PAD 03','THEY KNEW THE RISKS'],
          bodies:[
            'Dude, groundside to orbital pad and nobody called me screaming. Freaking beautiful. I am going to enjoy this for at least six minutes.',
            'Pad 03 has the food, Accounts has the money, and no grint has opened a complaint ticket. Awesome. This is basically a perfect shift.'
          ],
          encounterBodies:{station_xeno:[
            'Dude, Relay 10 is complaining that we sent you through xenos. They run a truck stop in deep space. They knew the risks. You cleared the things and delivered the food anyway. Freaking awesome.',
            'Relay 10 says the pad crew were “not contracted for xeno exposure”. Okay, fair. But they work on an orbital truck stop where xenos literally showed up. Contractor argument. Bugs dead, food delivered. Awesome.',
            'Freaking hell, dude. Xenos on approach and Pad 03 still asked about delivery time. The station staff took jobs on a deep-space relay. I have a view. You got the order in. Good enough.'
          ]}
        }
      }
    },
    defaults:{
      origin:'Groundside Collection Room',
      destination:'Relay 10 · Pad 03',
      station:'Relay 10',
      pad:'03',
      cargo:'sealed delivery case'
    }
  };

  const penthouseDelivery={
    id:'penthouse_delivery',
    version:1,
    family:'urban_penthouse_delivery',
    musicMode:'calm',
    minLevel:1,
    maxLevel:null,
    allowedFactions:['trade','security','jackals','helix','quickbite'],
    board:{category:'delivery',weight:.85,maxPerBoard:2},
    risk:{base:2,min:2,levelsPerStep:2,max:5,jitter:1},
    reward:{
      basePay:4200,payPerRisk:2500,payRiskSquare:80,randomPay:500,roundPay:50,
      baseXp:500,xpPerRisk:115,xpRiskSquare:10
    },
    civilianTrafficPolicy:{
      collisionWeight:1,assaultWeight:2,
      tiers:[
        {min:1,max:1,payMultiplier:.75,repMultiplier:.5,allowGift:false,failureRepPenalty:2},
        {min:2,max:2,payMultiplier:.40,repMultiplier:0,allowGift:false,failureRepPenalty:4},
        {min:3,payMultiplier:0,repMultiplier:0,allowGift:false,failureRepPenalty:8}
      ]
    },
    // The encounter is selected when the contract is generated, but remains hidden
    // from the board. "none" is a real result: most runs are eventful, not all.
    encounterTable:{
      entries:{
        pirate_ambush:{type:'fighters',profile:'pirate',params:{target:{base:4,perRisk:1,min:6,max:9,round:true},fighterHp:{base:10,perRisk:1,min:12,max:16,round:true}}},
        rogue_drones:{type:'fighters',profile:'rogue',params:{target:{base:4,perRisk:1,min:6,max:9,round:true},fighterHp:{base:10,perRisk:1,min:12,max:16,round:true}}},
        xeno_swarm:{type:'fighters',profile:'xeno',params:{target:{base:4,perRisk:1,min:6,max:9,round:true}}},
        customs_intercept:{type:'customs_drones',profile:'customs',params:{target:{base:4,perRisk:1,min:7,max:10,round:true},fighterHp:{base:10,perRisk:1,min:12,max:16,round:true}}}
      },
      weightsByFaction:{
        trade:{none:18,pirate_ambush:48,rogue_drones:20,xeno_swarm:14},
        security:{none:15,rogue_drones:45,pirate_ambush:25,xeno_swarm:15},
        jackals:{none:12,customs_intercept:50,pirate_ambush:22,rogue_drones:10,xeno_swarm:6},
        helix:{none:16,rogue_drones:40,xeno_swarm:32,pirate_ambush:12},
        quickbite:{none:12,xeno_swarm:55,pirate_ambush:23,rogue_drones:10}
      }
    },
    sections:[
      {type:'template_encounter',label:'Orbital Approach',none:{type:'space_transit',params:{duration:2.1,message:'ORBITAL APPROACH',playZoomSound:false}}},
      {type:'planet_descent',label:'Planet Descent',params:{difficulty:'$risk'}},
      {type:'surface_destination_approach',label:'City Approach',params:{difficulty:'$risk',terrain:'plains',destination:'city',routeLength:430,treeClumps:9}},
      {type:'urban_penthouse_delivery',label:'Penthouse Delivery',params:{difficulty:'$risk',cityLength:620}}
    ],
    presentation:{
      trade:{
        contactId:'corvella_pallis',cargoStyle:'case',
        titles:['Penthouse Freight','Private Address Delivery','City High-Rise Run'],
        cargo:['sealed merchant case','replacement avionics package','private trade consignment'],
        descriptions:[
          'Babe, I have a private penthouse delivery with your name all over it. Take {cargo} into Aurelia City and make the handoff upstairs. Try to behave where the cameras can see you.',
          'Sweetie, carry {cargo} to the marked penthouse and put it in the receiving room. Very discreet, very expensive, and exactly the sort of thing I like trusting you with.'
        ],
        completionSubjects:['PENTHOUSE RECEIPT CONFIRMED','CITY DELIVERY COMPLETE'],
        completionBodies:['The penthouse recipient confirmed receipt of {cargo}. Payment: CR {credits}. Standing: +{rep}.'],
        encounterAcknowledgements:{
          pirate_ambush:['The route record also shows you cleared a pirate intercept before descent. That was outside the freight brief and has been noted.'],
          rogue_drones:['A rogue-drone contact complicated the approach. You cleared it and still completed the handoff.'],
          xeno_swarm:['The approach was complicated by hostile xenoforms. The consignment still reached the recipient intact.']
        },
        civilianTrafficMail:{
          contactId:'corvella_pallis',
          assaultSubjects:['SWEETIE. THE TRAFFIC.','BABE, SERIOUSLY?'],incidentSubjects:['SWEETIE, WATCH THE TRAFFIC'],
          assaultBodies:['Sweetie, the package arrived, but you opened fire on civilian traffic. I like dangerous. I do not like explaining to city control why my favourite pilot shot commuters. Your settlement is CR {credits}.'],
          incidentBodies:['Babe, the parcel made the penthouse, but city control logged a traffic incident. I have smoothed it over and cut your settlement to CR {credits}. Please keep the sexy flying away from civilians.'],
          failureAddenda:['And yes, Sweetie, I saw the civilian-traffic report too. Failing the job was bad enough.'],
          abandonAddenda:['Babe, abandoning my contract after involving civilian traffic is a truly awful combination.']
        },
        failureMail:{contactId:'corvella_pallis',subjects:['SWEETIE, THAT WENT BADLY','BABE, WE HAVE A PROBLEM'],bodies:['Sweetie, the penthouse is still waiting for {cargo}. I was imagining a slick private handoff. What I got was two angry clients and no excuse to brag about you.','Babe, I can forgive bad luck. I cannot make a missing delivery appear, and “but the drone looked gorgeous” is apparently not acceptable to Accounts.']},
        abandonMail:{contactId:'corvella_pallis',subjects:['YOU WALKED AWAY, SWEETIE','BABE. NO.'],bodies:['Sweetie, you accepted a private delivery from me and then walked away. I am the one explaining that to the client. Do not leave me hanging like that again.','Babe, if you cannot finish a run, tell me before you take it. Walking away halfway through is not mysterious and alluring. It is just annoying.']},
        personalFollowUp:{contactId:'corvella_pallis',minRisk:3,chance:.18,encounterMinRisk:2,encounterChance:.58,subjects:['NICE WORK, SWEETIE','THAT PENTHOUSE RUN'],bodies:['Sweetie, clean delivery, private handoff, no fuss. Slick, expensive-looking and just a little bit indecent. Exactly what I wanted.'],encounterBodies:{pirate_ambush:['Babe, pirates before descent and you still made the penthouse. Big muscly drone kicking pirate arse, then a perfect private handoff. You are spoiling me.'],rogue_drones:['Sweetie, rogue drones and a city run in the same job? You made it look disgustingly easy.'],xeno_swarm:['Babe, xenos before descent and you still delivered the parcel. I am trying very hard to remain respectable about this.']}}
      },
      security:{
        contactId:'kudo_shang',cargoStyle:'case',
        titles:['Secure Penthouse Transfer','Authorised City Handoff','Protected Address Delivery'],
        cargo:['sealed evidence case','encrypted Directorate package','authorised security module'],
        descriptions:['Maintain custody of {cargo} through descent and deliver it to the authorised penthouse receiving room.','Complete a secure direct handoff of {cargo} at the marked high-rise address.'],
        completionSubjects:['SECURE HANDOFF CONFIRMED','CITY TRANSFER CLOSED'],
        completionBodies:['Authorised receipt of {cargo} is confirmed. Payment: CR {credits}. Standing: +{rep}.'],
        encounterAcknowledgements:{pirate_ambush:['Pirate contact on approach was outside tasking. Threat removal is recorded.'],rogue_drones:['Rogue drone contact was resolved before descent. Additional action recorded.'],xeno_swarm:['Hostile xeno contact was cleared without loss of custody.']},
        civilianTrafficMail:{contactId:'kudo_shang',assaultSubjects:['CIVILIAN ASSAULT RECORDED'],incidentSubjects:['CIVILIAN TRAFFIC INCIDENT'],assaultBodies:['You fired on civilian traffic during an authorised transfer. The delivery does not excuse the conduct. Settlement reduced to CR {credits}. Positive standing withheld.'],incidentBodies:['A civilian traffic collision was logged during the transfer. Settlement reduced to CR {credits}. Exercise better control.'],failureAddenda:['The civilian-traffic incident is recorded separately.'],abandonAddenda:['The civilian-traffic incident remains on record despite withdrawal.']},
        failureMail:{contactId:'kudo_shang',subjects:['TRANSFER FAILED','CUSTODY FAILURE'],bodies:['The authorised transfer failed. {cargo} did not reach the receiving address. This performance is unacceptable.','Custody was not maintained through completion. The contract is closed as failed.']},
        abandonMail:{contactId:'kudo_shang',subjects:['UNAUTHORISED WITHDRAWAL','TRANSFER ABANDONED'],bodies:['You accepted an authorised transfer and withdrew before completion. That decision is recorded.','The penthouse handoff was abandoned after tasking. Do not accept Directorate work you do not intend to finish.']},
        personalFollowUp:{contactId:'kudo_shang',minRisk:4,chance:.12,encounterMinRisk:2,encounterChance:.48,subjects:['RE: CITY TRANSFER','ADDITIONAL ACTION RECORDED'],bodies:['Transfer completed to standard. Good work.'],encounterBodies:{pirate_ambush:['Additional hostile contacts were not in the tasking. They are now in the incident record. Good work.'],rogue_drones:['The rogue-drone group was not part of the assignment. Clearing it without losing custody was noted.'],xeno_swarm:['Xeno contact was incidental. Maintaining custody through it was not. Good work.']}}
      },
      jackals:{
        contactId:'cassian_erivan_snade',cargoStyle:'case',
        titles:['Penthouse Drop','After Hours Delivery','A Discreet Parcel'],
        cargo:['sealed party-supplies case','unmanifested luxury parcel','private client package'],
        descriptions:['A private client requires {cargo} delivered directly to a city penthouse. Discretion is expected.','Deliver {cargo} to the marked penthouse receiving room. The contents are none of your concern.'],
        completionSubjects:['THE PARCEL ARRIVED','A SATISFACTORY CONCLUSION'],
        completionBodies:['Our client confirms receipt of {cargo}. CR {credits} has been released. Standing: +{rep}.'],
        encounterAcknowledgements:{customs_intercept:['Customs attempted an intervention before descent. Their interest proved temporary.'],pirate_ambush:['A pirate interruption was disposed of before descent. An inelegant complication, efficiently concluded.'],rogue_drones:['The rogue machines on approach have been reduced to a footnote. The parcel remained the main event.'],xeno_swarm:['Xenoforms intruded upon the overture. You removed them and proceeded to the actual performance.']},
        civilianTrafficMail:{contactId:'cassian_erivan_snade',assaultSubjects:['DISCRETION, X.','THE COMMUTERS WERE NOT THE ENEMY'],incidentSubjects:['AN UNFORTUNATE CITY INCIDENT'],assaultBodies:['X, discretion is the art of not becoming the story. Shooting civilian vehicles made you very much the story. The parcel arrived. The full settlement did not. CR {credits}.'],incidentBodies:['The delivery succeeded, though your encounter with civilian traffic generated precisely the attention we sought to avoid. Settlement: CR {credits}.'],failureAddenda:['As if failure lacked ornament, the civilian-traffic report gives it a particularly vulgar flourish.'],abandonAddenda:['And then, having attracted civilian attention, you abandoned the undertaking. Even retreat should possess some elegance.']},
        failureMail:{contactId:'cassian_erivan_snade',subjects:['A MOST UNSATISFACTORY ENDING','THE CURTAIN FELL EARLY'],bodies:['The parcel did not arrive. One is reminded that tragedy requires inevitability. This merely required better flying. A disappointing performance, X.','Our client has no package, I have an irritated household to placate, and you have converted a simple errand into farce.']},
        abandonMail:{contactId:'cassian_erivan_snade',subjects:['YOU LEFT THE STAGE','AN INCOMPLETE PERFORMANCE'],bodies:['To accept the role and depart before the final act is not tragedy, X. It is poor theatre. The client remains without the parcel.','You withdrew from a discreet undertaking after accepting it. Even Falstaff knew when an exit required style. This one had none.']},
        personalFollowUp:{contactId:'cassian_erivan_snade',minRisk:3,chance:.22,encounterMinRisk:2,encounterChance:.66,subjects:['BRAVO, X','THE PENTHOUSE AFFAIR'],bodies:['A discreet parcel, a private room, an invisible exit. There is beauty in a plot that refuses unnecessary complications.'],encounterBodies:{customs_intercept:['The customs authorities arrived like Banquo’s ghost: uninvited, tiresome and impossible to ignore. You handled the apparition admirably.'],pirate_ambush:['Pirates attempted to insert themselves into our little drama. Their scene was mercifully brief.'],rogue_drones:['A chorus of malfunctioning machines is a poor substitute for wit, but you silenced them efficiently.'],xeno_swarm:['Xenoforms before a penthouse delivery: grotesque theatre, but theatre nonetheless. You brought the parcel through.']}}
      },
      helix:{
        contactId:'navira_derris',cargoStyle:'case',
        titles:['Research Handoff','Private Lab Delivery','High-Rise Sample Transfer'],
        cargo:['stabilised research sample','sealed prototype component','temperature-controlled assay case'],
        descriptions:['Deliver {cargo} to the marked private research suite. Maintain package integrity through descent and city transit.','Transport {cargo} to the penthouse laboratory receiving room and complete the direct handoff.'],
        completionSubjects:['SAMPLE HANDOFF CONFIRMED','RESEARCH TRANSFER COMPLETE'],
        completionBodies:['The receiving suite confirms {cargo} arrived within tolerance. Payment: CR {credits}. Standing: +{rep}.'],
        encounterAcknowledgements:{pirate_ambush:['Pirate contact occurred before descent. The sample remained within transport tolerance.'],rogue_drones:['The rogue-drone contact produced useful telemetry. More importantly, the package remained intact.'],xeno_swarm:['Xeno contact was recorded before descent. Combat telemetry has been retained for analysis.']},
        civilianTrafficMail:{contactId:'navira_derris',assaultSubjects:['CIVILIAN TARGET CLASSIFICATION ERROR'],incidentSubjects:['CITY CONTACT OUTSIDE TOLERANCE'],assaultBodies:['You fired on civilian vehicles during the transfer. They were not hostile contacts. The classification error is fundamental. Settlement reduced to CR {credits}.'],incidentBodies:['The package arrived, but the civilian collision exceeded acceptable transport tolerance. Settlement reduced to CR {credits}.'],failureAddenda:['The civilian incident is a separate negative result in the run data.'],abandonAddenda:['Withdrawal did not erase the civilian incident from the telemetry.']},
        failureMail:{contactId:'navira_derris',subjects:['TRANSFER DATA: FAILURE','SAMPLE NOT DELIVERED'],bodies:['The receiving suite did not receive {cargo}. The experiment can be repeated. Your transport performance requires more immediate correction.','The delivery failed before handoff. The missing result is operational, not scientifically interesting.']},
        abandonMail:{contactId:'navira_derris',subjects:['TRANSFER TERMINATED BY OPERATOR','UNSCHEDULED WITHDRAWAL'],bodies:['You terminated the transfer before handoff. There was no experimental requirement for that outcome.','The package remained undelivered because you withdrew. This is an avoidable variable.']},
        personalFollowUp:{contactId:'navira_derris',minRisk:4,chance:.16,encounterMinRisk:2,encounterChance:.62,subjects:['RE: TRANSFER TELEMETRY','USEFUL RUN DATA'],bodies:['The delivery was uneventful. In transport work that is a compliment, not an absence of data.'],encounterBodies:{pirate_ambush:['The pirate interception produced several useful evasive-control traces. The package also arrived intact. Efficient.'],rogue_drones:['The rogue-drone telemetry is unusually useful. Their control faults were more interesting than their weapons. The package arrived within tolerance.'],xeno_swarm:['Your xeno contact telemetry has been retained. The combat was incidental. The data were not.']}}
      },
      quickbite:{
        contactId:'nyxo_malloc',cargoStyle:'food',
        titles:['Penthouse Order','High-Rise Catering Run','Very Expensive Lunch'],
        cargo:['freaking expensive catering order','stack of hot-food carriers','private penthouse dinner order'],
        descriptions:['Somebody in a penthouse ordered {cargo}. Get it through the city and into the receiving room while it is still food.','Deliver {cargo} directly to the marked penthouse. Yes, apparently we do room service from orbit now.'],
        completionSubjects:['FOOD GOT THERE','PENTHOUSE FED','ORDER CLOSED'],
        completionBodies:['Penthouse confirms the order arrived. CR {credits}. Standing: +{rep}. Nobody has complained yet.'],
        encounterAcknowledgements:{pirate_ambush:['Pirates tried to hijack the route. The food still arrived. Dispatch has filed this under “somehow normal”.'],rogue_drones:['Rogue drones got into the route before descent. The order still arrived hot enough to count.'],xeno_swarm:['Xenos intercepted the route before descent. QuickBite has recorded this as an external delivery obstruction.']},
        civilianTrafficMail:{contactId:'nyxo_malloc',assaultSubjects:['DUDE. THE COMMUTERS.','WHAT THE ACTUAL SHIZ?'],incidentSubjects:['CONTACTLESS, DUDE'],assaultBodies:['Dude. You shot civilian traffic on a food run. What the actual shiz? Xenos, pirates, rogue drones: targets. Person driving home from work: NOT A TARGET. Your CR {fullCredits} job is down to CR {credits}.'],incidentBodies:['Dude, the food arrived, but you bounced off civilian traffic. That is not what contactless delivery means. Settlement: CR {credits}.'],failureAddenda:['Also, civilians? Freaking seriously? That is a whole separate pile of shit.'],abandonAddenda:['And you messed with civilian traffic before bailing? Dude. I now have an abandoned order and an incident report.']},
        failureMail:{contactId:'nyxo_malloc',subjects:['DUDE. HOW?','WHERE IS THE FOOD?'],bodies:['Dude, this was a penthouse. Giant building. Does not move. Somehow the food still did not get there. Freaking incredible.','What the shiz happened? The customer has no food, Corporate has a refund ticket, and it is somehow my problem. Great shift.']},
        abandonMail:{contactId:'nyxo_malloc',subjects:['YOU BAILED ON DINNER?','DUDE. THE FOOD.'],bodies:['Dude, you accepted a penthouse order and just bailed. The building was not going anywhere. The customer was not going anywhere. Apparently you were.','What the shiz, X? You left somebody waiting for dinner in a penthouse and now I have to call them. This is shit.']},
        personalFollowUp:{contactId:'nyxo_malloc',minRisk:2,chance:.28,encounterMinRisk:2,encounterChance:.78,subjects:['DUDE','HOLY SHIZ','THEY SMELLED THE FOOD'],bodies:['Dude, rich people got their food, nobody opened a ticket, and I did not have to talk to management. Freaking perfect.'],encounterBodies:{pirate_ambush:['Pirates again? Dude. If they wanted lunch they could have ordered. You shot the grints and still delivered the food. Awesome.'],rogue_drones:['Rogue drones tried to eat the delivery route. I do not know what their plan was. Maybe they wanted the fries. Whatever. Food delivered.'],xeno_swarm:['Dude, I swear the xenos can smell the food. Sealed carriers, vacuum, kilometres away. Does not matter. They smelled dinner. You killed the things and the penthouse still got fed. Freaking awesome.','Corporate asked why xenos attacked a catering run. I said probably the food. They asked for evidence. I said giant bugs chasing a pizza box is pretty good evidence. Anyway, order delivered.']}}
      }
    },
    defaults:{destination:'Aurelia City · Penthouse 18',cargo:'sealed delivery case'}
  };


  // Fifth live ordinary template: a marked-hazard asteroid clearance contract.
  // The field remains full of ordinary rocks; only the pre-identified hazard set is
  // mission-marked and counts toward completion.
  const asteroidClearance={
    id:'asteroids',
    version:3,
    family:'asteroids',
    musicMode:'calm',
    minLevel:1,
    maxLevel:null,
    intelStyle:'markedHazards',
    allowedFactions:['trade','security','jackals','helix','quickbite'],
    board:{category:'combat',weight:1.15,maxPerBoard:2},
    risk:{base:1,min:1,levelsPerStep:2,max:9,jitter:1},
    reward:{
      basePay:650,payPerRisk:430,payRiskSquare:115,payPerAsteroidWork:72,randomPay:220,roundPay:50,
      baseXp:55,xpPerRisk:25,xpRiskSquare:3,xpPerAsteroidWork:6
    },
    sections:[
      {
        type:'asteroids',label:'Marked Hazard Clearance',
        params:{
          target:{base:5,perRisk:.75,random:3,min:6,max:14,round:true},
          markedTargets:true
        }
      }
    ],
    presentation:{
      trade:{
        contactId:'corvella_pallis',
        descriptions:[
          '{situation} Sweetie, traffic control has tagged the dangerous rocks. Go flex those guns for me and make the lane pretty again before my haulers move.',
          '{situation} The nasty ones are already marked on your HUD, babe. Blow them apart and I will try not to enjoy watching quite so much.'
        ],
        briefs:[
          {target:'marked collision hazards',motive:'route security',situation:'Tracking predicts a cluster of tumbling bodies will cross a busy Free Trader shipping lane.',titles:['Shipping lane clearance','Marked hazard removal']},
          {target:'marked mining fragments',motive:'convoy protection',situation:'A recent mining blast scattered large fragments across a corridor used by independent haulers.',titles:['Convoy corridor clearance','Blast debris sweep']},
          {target:'marked approach hazards',motive:'traffic safety',situation:'Several large bodies have drifted into the approach used by merchant transfer craft.',titles:['Merchant approach clearance','Safe passage']}
        ],
        completionSubjects:['Route hazards cleared','Shipping lane reopened'],
        completionBodies:['The marked hazards have been removed and traffic control has reopened the route. Payment: CR {credits}. Standing: +{rep}.','Clearance is confirmed. The tagged rocks are gone and merchant traffic is moving again. CR {credits} released. Standing: +{rep}.'],
        failureMail:{contactId:'corvella_pallis',subjects:['Sweetie, the rocks are still there','Babe, that lane is still closed'],bodies:['Sweetie, the marked rocks are still there. I sent my favourite heavily armed problem-solver to remove rocks and somehow the rocks won. Hmm.','Babe, traffic control still has the lane shut. All those guns and I am staring at the same hazard list I started with. Not exactly making me swoon.']},
        abandonMail:{contactId:'corvella_pallis',subjects:['You left the lane blocked, sweetie','Babe. You walked away from the rocks.'],bodies:['Sweetie, you took my clearance job and left the marked hazards exactly where they were. I was promised gratuitous displays of firepower. I feel cheated.','Babe, if you are going to leave a hazard-clearing job half done, tell me before you accept it. The lane is still closed and I am properly pissed off with you.']},
        personalFollowUp:{contactId:'corvella_pallis',minRisk:4,chance:.20,subjects:['Nice clearance, sweetie','That lane is usable again'],bodies:['Sweetie, every marked rock is gone and the haulers are moving. Watching that big drone smash a path open for me is becoming a guilty pleasure.','Babe, clean sweep. Nothing left on the hazard board except me being embarrassingly pleased with you.']}
      },
      security:{
        contactId:'kudo_shang',
        descriptions:[
          '{situation} OSD tracking has designated the relevant bodies as navigation hazards. Destroy the marked asteroids.',
          '{situation} Remove the tagged hazards before authorised traffic is released into the corridor.'
        ],
        briefs:[
          {target:'designated navigation hazards',motive:'public safety',situation:'Predictive tracking shows several bodies entering a controlled traffic corridor.',titles:['Navigation hazard clearance','Traffic corridor sweep']},
          {target:'marked exclusion-zone debris',motive:'approach security',situation:'Uncontrolled debris is crossing an exclusion-zone approach used by authorised service craft.',titles:['Exclusion-zone clearance','Approach hazard removal']},
          {target:'marked fragmentation debris',motive:'collision prevention',situation:'A recent fragmentation event has produced large tracked bodies on intercept courses with orbital traffic.',titles:['Fragmentation response','Orbital debris clearance']}
        ],
        completionSubjects:['Hazard clearance confirmed','Traffic corridor released'],
        completionBodies:['All designated hazards are confirmed destroyed. Payment: CR {credits}. Standing: +{rep}.','The marked bodies have been removed and the corridor is released for traffic. CR {credits} authorised. Standing: +{rep}.'],
        failureMail:{contactId:'kudo_shang',subjects:['Hazard list remains active','Clearance objective failed'],bodies:['The designated bodies remain on the hazard list. The clearance objective was not completed.','Authorised traffic remains restricted because the marked hazards were not removed. Mission failure recorded.']},
        abandonMail:{contactId:'kudo_shang',subjects:['Hazard-clearance contract abandoned','Unauthorised withdrawal'],bodies:['You withdrew with designated hazards still active. The traffic restriction remains in force.','The clearance task remained viable when you left it. That decision is recorded.']},
        personalFollowUp:{contactId:'kudo_shang',minRisk:4,chance:.15,subjects:['Clearance note','Operational clearance'],bodies:['The designated hazard list was cleared efficiently. Good work.','All tagged bodies removed. Traffic release proceeded without delay. Acceptable execution.']}
      },
      jackals:{
        contactId:'cassian_erivan_snade',
        descriptions:[
          '{situation} The troublesome bodies are making themselves conspicuous on a route I prefer unobstructed. I imagine that can be corrected.',
          '{situation} The route would look considerably better without the marked geology. I leave the aesthetic correction to you.'
        ],
        briefs:[
          {target:'marked route obstructions',motive:'commercial access',situation:'A discreet transit route has become inconveniently obstructed by a recent debris shift.',titles:['A clearer passage','Geological inconvenience']},
          {target:'marked blast fragments',motive:'competition',situation:'Someone has rather pointedly scattered demolition debris across a route used by Combine traffic.',titles:['Debris diplomacy','A commercial obstruction']},
          {target:'marked pursuit-lane hazards',motive:'secure passage',situation:'Large tracked bodies are compromising an escape corridor that certain associates prefer to keep available.',titles:['Quiet passage','Clear the way']}
        ],
        completionSubjects:['A passage restored','Geology corrected'],
        completionBodies:['The marked obstructions have ceased to obstruct. CR {credits} has been released. Standing: +{rep}.','Our route is once again blessedly free of inconvenient geology. Payment: CR {credits}. Standing: +{rep}.'],
        failureMail:{contactId:'cassian_erivan_snade',subjects:['The rocks remain, X','An unfinished geological argument'],bodies:['The marked rocks remain exactly where they were, X. Sisyphus at least had the courtesy to move his stone before failing.','The marked rocks remain exactly where they were. I had rather assumed their tenancy was about to expire.']},
        abandonMail:{contactId:'cassian_erivan_snade',subjects:['You abandoned the passage','A retreat from geology'],bodies:['You left the route in the possession of several labelled rocks. I had expected their claim to be much less durable.','One may retreat from armies with dignity. Retreating from labelled asteroids is harder to romanticise. Do not repeat it.']},
        personalFollowUp:{contactId:'cassian_erivan_snade',minRisk:4,chance:.22,subjects:['A satisfyingly empty route','The stones have lost'],bodies:['Every marked obstruction is gone. David required one stone. You, rather extravagantly, required several. The result is nevertheless pleasing.','The route is clear and geology has been reminded of its proper place in commercial affairs. Fronking splendid.']}
      },
      helix:{
        contactId:'navira_derris',
        descriptions:[
          '{situation} Survey control has tagged the bodies that exceed the acceptable collision envelope. Destroy the marked asteroids.',
          '{situation} Remove the designated bodies so Helix operations can resume inside the required safety margin.'
        ],
        briefs:[
          {target:'marked survey hazards',motive:'survey access',situation:'Tracked bodies are repeatedly crossing a survey corridor and corrupting safe approach windows.',titles:['Survey corridor clearance','Tracked-body removal']},
          {target:'marked mining fragments',motive:'industrial safety',situation:'Recent extraction work produced several unstable fragments within an equipment transit zone.',titles:['Extraction debris clearance','Industrial hazard sweep']},
          {target:'marked volatile bodies',motive:'asset protection',situation:'Spectral analysis has identified volatile-rich bodies whose projected paths intersect Helix field equipment.',titles:['Volatile-body clearance','Equipment safety margin']}
        ],
        completionSubjects:['Hazard set removed','Survey corridor normalised'],
        completionBodies:['The designated body set is no longer present in the operating volume. Payment: CR {credits}. Standing: +{rep}.','Tracking confirms removal of the marked hazards. The corridor has returned to acceptable operating parameters. CR {credits} released. Standing: +{rep}.'],
        failureMail:{contactId:'navira_derris',subjects:['Hazard set remains unresolved','Clearance result: incomplete'],bodies:['The designated hazard set remains above the acceptable collision threshold. Operations are still suspended.','The marked bodies were not fully removed. The resulting safety envelope is functionally unchanged.']},
        abandonMail:{contactId:'navira_derris',subjects:['Clearance process terminated early','Unresolved hazard set'],bodies:['You terminated the clearance process while designated bodies remained. There is no useful analytical distinction between an uncleared corridor and a partially uncleared one.','The marked set remains operationally significant because you left before completing removal. This has been recorded.']},
        personalFollowUp:{contactId:'navira_derris',minRisk:4,chance:.18,subjects:['Useful clearance data','Collision envelope restored'],bodies:['The clearance telemetry was unusually clean. All tagged bodies were removed with less secondary fragmentation than projected. Useful.','The marked set is gone and the safety envelope has normalised. Your execution reduced the number of uncontrolled variables.']}
      },
      quickbite:{
        contactId:'nyxo_malloc',
        descriptions:[
          '{situation} The bad ones are marked. Go break them.',
          '{situation} People need food. Rocks do not. I think morally we are fine here. Shoot the marked ones.'
        ],
        briefs:[
          {target:'marked courier-lane hazards',motive:'courier safety',situation:'Dude, there are rocks all over one of our delivery lanes. Big ones.',titles:['Courier lane clearance','Rocks versus dinner']},
          {target:'marked delivery-route debris',motive:'route reopening',situation:'Dispatch says nobody is flying this lane until the rocks are gone.',titles:['Delivery route reopening','Clear the freaking lane']},
          {target:'marked impact hazards',motive:'loss prevention',situation:'Insurance noticed couriers cost more than rocks. Weird how fast that became our problem.',titles:['Insurance says shoot rocks','Courier hazard sweep']}
        ],
        completionSubjects:['THE ROCKS ARE GONE','DUDE, THE LANE IS OPEN'],
        completionBodies:['Dude, the rocks are gone and couriers are moving again. CR {credits}. Standing: +{rep}. We solved a problem by shooting it. Awesome.','Lane is open. Nobody hit a rock. Nobody called me. CR {credits}. Standing: +{rep}. Best shift all week.'],
        failureMail:{contactId:'nyxo_malloc',subjects:['DUDE. THE ROCKS ARE STILL THERE.','WHAT THE SHIZ HAPPENED?'],bodies:['Dude, the dangerous rocks had little marks on them. You shoot those ones. They are still there. Dispatch is losing its shit.','What the shiz, X? They labelled the rocks. You had one job. The rocks won.']},
        abandonMail:{contactId:'nyxo_malloc',subjects:['You bailed on the rocks?','Dude. They were labelled.'],bodies:['Dude. You abandoned a rock-shooting job. Marked rocks. They were not even shooting back. What the actual shiz?','You left? They literally put brackets around the rocks for you. Now I have to explain this to Insurance. I hate this job a little right now.']},
        personalFollowUp:{contactId:'nyxo_malloc',minRisk:3,chance:.26,subjects:['DUDE, NICE ROCK MURDER','THE LANE IS ACTUALLY CLEAR'],bodies:['Dude, you killed every marked rock and somehow that counts as logistics now. Freaking awesome.','Dispatch reopened the lane. Couriers are delivering noodles instead of becoming impact statistics. Beautiful work, dude.']}
      }
    }
  };

  // Fourth live ordinary template: a pure hostile-group destruction contract.
  // The mechanical job is intentionally simple. Variety comes from faction-specific
  // target relationships and motives, not from pretending every faction hates everyone.
  const fighterDestroy={
    id:'fighters',
    version:2,
    family:'fighters',
    musicMode:'violent',
    minLevel:1,
    maxLevel:null,
    allowedFactions:['trade','security','jackals','helix','quickbite'],
    board:{category:'combat',weight:1.15,maxPerBoard:2},
    risk:{base:1,min:1,levelsPerStep:2,max:9,jitter:1},
    reward:{
      basePay:700,payPerRisk:700,payRiskSquare:220,payPerFighterWork:70,randomPay:350,roundPay:50,
      baseXp:80,xpPerRisk:60,xpRiskSquare:8,xpPerFighterWork:7
    },
    sections:[
      {type:'fighters',label:'Hostile Group',params:{target:{base:4,perRisk:1,random:2,min:5,max:18,round:true},fighterHp:{base:11,perRisk:.65,min:12,max:18,round:true},profile:'$profile'}}
    ],
    presentation:{
      trade:{
        contactId:'corvella_pallis',
        descriptions:[
          '{situation} Sweetie, the {target} are making my haulers nervous. Go make them disappear for me. I get a bit dizzy thinking about that big muscly drone of yours kicking nasty grints around.',
          '{situation} Clear the {target}, babe, and reopen the route. Big guns, bad people, grateful traders. I know which part I am looking forward to.'
        ],
        briefs:[
          {target:'pirate raiders',profile:'pirate',motive:'route security',situation:'A pirate group has been hitting Free Trader haulers along this corridor.',titles:['Pirate Suppression','Route Defence']},
          {target:'armed extortion crews',profile:'pirate',motive:'free passage',situation:'An armed crew has started demanding passage money from independent haulers.',titles:['Toll Breaker','Free Passage']},
          {target:'cargo raiders',profile:'pirate',motive:'retaliation',situation:'The same raiders have stripped two disabled merchant craft and returned for more.',titles:['Raider Retaliation','Merchant Defence']},
          {target:'hired mercenaries',profile:'hostile',motive:'convoy protection',situation:'A mercenary group is blocking a commercial lane shortly before a scheduled convoy.',titles:['Convoy Route Sweep','Contracted Route Defence']}
        ],
        completionSubjects:['ROUTE THREAT REMOVED','HOSTILE GROUP CLEARED','TRAFFIC ROUTE REOPENED'],
        completionBodies:['The {target} have been removed from the route. Payment: CR {credits}. Standing: +{rep}.','Traffic control confirms the threat group is gone and the route is open again. CR {credits} released. Standing: +{rep}.'],
        failureMail:{contactId:'corvella_pallis',subjects:['SWEETIE, THEY ARE STILL OUT THERE','BABE, THAT DID NOT FIX THE ROUTE'],bodies:['Oh, Sweetie. The {target} are still out there. I had this lovely image of your big dangerous drone kicking their arses and now you have ruined it for me.','Babe, I needed that group gone, not mildly annoyed. All those guns and they are still holding up my traffic. Bit embarrassing, isn\'t it?']},
        abandonMail:{contactId:'corvella_pallis',subjects:['YOU LEFT THEM THERE, SWEETIE','BABE. YOU WALKED AWAY.'],bodies:['Sweetie, you accepted my clearance job and left the {target} sitting on the route. I had expectations involving you, that big drone and a lot fewer pirates. Deeply disappointing.','Babe, if you do not intend to clear the route, do not take the contract. Walking away is not the sort of bad behaviour I enjoy from you.']},
        personalFollowUp:{contactId:'corvella_pallis',minRisk:3,chance:.24,subjects:['NICE WORK, SWEETIE','THAT ROUTE IS QUIET AGAIN'],bodies:['Sweetie, the {target} are gone and the haulers are moving again. I get a bit dizzy thinking about your big muscly drone doing that for me.','Babe, bad people gone, ordinary traffic moving, and you looking magnificent in the middle of it. Exactly what I wanted.']}
      },
      security:{
        contactId:'kudo_shang',
        descriptions:['{situation} OSD has classified the {target} as hostile. Hit them hard. Leave no combat capability.','{situation} The {target} threaten authorised traffic. End the threat with decisive force.'],
        briefs:[
          {target:'wanted pirate craft',profile:'pirate',motive:'law enforcement',situation:'The group is wanted for repeated armed attacks on civilian shipping.',titles:['Wanted Raider Group','Outer Patrol Clearance']},
          {target:'armed smuggler escorts',profile:'hostile',motive:'law enforcement',situation:'The escorts opened fire on an inspection patrol and refused orders to stand down.',titles:['Armed Smuggler Intercept','Enforcement Sweep']},
          {target:'rogue security drones',profile:'rogue',motive:'containment',situation:'A drone group has lost command authority and is moving toward controlled traffic lanes.',titles:['Rogue Drone Suppression','Control Failure']},
          {target:'outlaw militia fighters',profile:'hostile',motive:'public safety',situation:'An unauthorised armed group is assembling inside a restricted exclusion zone.',titles:['Exclusion Zone Sweep','Unauthorised Armed Group']},
          {target:'hostile xenoforms',profile:'xeno',motive:'containment',situation:'Hostile xeno contacts are moving toward inhabited orbital traffic.',titles:['Xeno Containment','Hostile Xeno Contact']}
        ],
        completionSubjects:['HOSTILE GROUP NEUTRALISED','THREAT REMOVAL CONFIRMED','OPERATION CLOSED'],
        completionBodies:['The {target} are confirmed neutralised. Payment: CR {credits}. Standing: +{rep}.','Threat group removed. CR {credits} released. Standing: +{rep}.'],
        failureMail:{contactId:'kudo_shang',subjects:['THREAT REMAINS ACTIVE','OPERATION FAILED'],bodies:['The {target} remain operational. You had the force to end the threat and did not use it decisively enough.','The order was simple. Finish the {target}. They are still active. Failure.']},
        abandonMail:{contactId:'kudo_shang',subjects:['UNAUTHORISED WITHDRAWAL','THREAT-REMOVAL CONTRACT ABANDONED'],bodies:['You withdrew while the {target} remained active. No withdrawal was ordered. Weakness is not initiative.','You accepted the fight and left it unfinished. I do not reward half-measures.']},
        personalFollowUp:{contactId:'kudo_shang',minRisk:4,chance:.16,subjects:['RE: THREAT REMOVAL','OPERATIONAL NOTE'],bodies:['The {target} were removed efficiently. Good work.','Threat group neutralised. Clean kill. Noted.']}
      },
      jackals:{
        contactId:'cassian_erivan_snade',
        descriptions:['{situation} The {target} have become terribly comfortable. It would be a shame if that confidence proved temporary.','{situation} I see no compelling reason for the {target} to remain part of our future arrangements.'],
        briefs:[
          {target:'bounty hunters',profile:'hostile',motive:'protection',situation:'A bounty crew has been persistently tracking Red Jackal personnel and clients.',titles:['Pursuit Breaker','An Irritating Pursuit']},
          {target:'rival syndicate fighters',profile:'hostile',motive:'competition',situation:'A rival outfit has begun treating a profitable Jackal route as if it were communal property.',titles:['Market Correction','Rival Sweep']},
          {target:'hostile mercenaries',profile:'hostile',motive:'retaliation',situation:'A mercenary group accepted a contract against Combine interests and survived the first exchange.',titles:['Contract Dispute','Outside Contractors']},
          {target:'breakaway crew',profile:'hostile',motive:'betrayal',situation:'A former associate departed with Combine property, armed friends and an unfortunate misunderstanding of discretion.',titles:['Breach of Confidence','Professional Consequences']}
        ],
        completionSubjects:['A MATTER CONCLUDED','THE BOARD IS CLEAR','A SATISFACTORY CORRECTION'],
        completionBodies:['The {target} have ceased to trouble our affairs. CR {credits} has been released. Standing: +{rep}.','Our commercial difficulty has been resolved. Payment: CR {credits}. Standing: +{rep}.'],
        failureMail:{contactId:'cassian_erivan_snade',subjects:['AN UNFINISHED SENTENCE','THE PROBLEM PERSISTS'],bodies:['How unfortunate. The {target} remain active and apparently feel vindicated. That was not the impression I hoped to leave them with.','I had rather assumed the {target} were approaching the end of their relevance. They appear not to have received the message.']},
        abandonMail:{contactId:'cassian_erivan_snade',subjects:['EXIT, PURSUED BY RESPONSIBILITY','A CURIOUS WITHDRAWAL'],bodies:['You left while the {target} were still enjoying their arrangements. I had hoped those arrangements would prove much less permanent.','Discretion is admirable. Leaving the inconvenience entirely intact is something else.']},
        personalFollowUp:{contactId:'cassian_erivan_snade',minRisk:3,chance:.25,subjects:['A CLEANER BOARD','SIC TRANSIT'],bodies:['The {target} are gone. Competition, like tragedy, is greatly improved by a disciplined final act. Nicely done.','A concise resolution to an untidy problem. Cicero would have demanded a speech. I shall settle for saying well done.']}
      },
      helix:{
        contactId:'navira_derris',
        descriptions:['{situation} Remove the {target}. I also want the engagement telemetry. Their behaviour is not matching the previous model.','{situation} Remove the {target}. If they do anything unexpected before they die, make sure the sensors are running.'],
        briefs:[
          {target:'rogue industrial drones',profile:'rogue',motive:'containment',situation:'A Helix autonomous work group has entered an unrecoverable hostile control state.',titles:['Autonomous Asset Containment','Control-State Failure']},
          {target:'research thieves',profile:'hostile',motive:'proprietary security',situation:'An armed group involved in theft of Helix research data has been located before it can leave the region.',titles:['Proprietary Asset Security','Research Theft Response']},
          {target:'scavenger raiders',profile:'pirate',motive:'asset protection',situation:'Armed scavengers are stripping equipment from a Helix recovery site and attacking service craft.',titles:['Salvage Denial','Recovery Site Security']},
          {target:'competitor-hired mercenaries',profile:'hostile',motive:'industrial security',situation:'A mercenary screen is repeatedly interfering with survey operations around a Helix site.',titles:['Perimeter Interference','Survey Security']},
          {target:'hostile xenoforms',profile:'xeno',motive:'site protection',situation:'A hostile xeno group has established itself inside the operating envelope of an active research site.',titles:['Research Perimeter Clearance','Xeno Site Suppression']}
        ],
        completionSubjects:['OPERATING ENVELOPE RESTORED','HOSTILE VARIABLE REMOVED','CLEARANCE CONFIRMED'],
        completionBodies:['The {target} have been removed from the operating area. Payment: CR {credits}. Standing: +{rep}.','The hostile variable is no longer present. Operations can resume. CR {credits} released. Standing: +{rep}.'],
        failureMail:{contactId:'navira_derris',subjects:['HOSTILE VARIABLE PERSISTS','CLEARANCE FAILURE'],bodies:['The {target} remain active, so the site is still unusable. Worse, the incomplete engagement left us with an irritatingly ambiguous dataset.','The task required removal of the {target}. Telemetry indicates that condition was not achieved.']},
        abandonMail:{contactId:'navira_derris',subjects:['INTERVENTION TERMINATED EARLY','UNRESOLVED OPERATING RISK'],bodies:['You terminated the intervention while the {target} remained active. That preserves every condition the contract was intended to remove.','Abandoning the clearance left the original hazard unchanged and added contractor unreliability as a second variable. This is not an improvement.']},
        personalFollowUp:{contactId:'navira_derris',minRisk:3,chance:.22,subjects:['USEFUL RESULT','RE: CLEARANCE TELEMETRY'],bodies:['The {target} are gone. The low-noise engagement profile is not what I predicted. That is interesting.','Your engagement telemetry is unusually clean. The fact that the {target} are also gone is, operationally, the more important outcome.']}
      },
      quickbite:{
        contactId:'nyxo_malloc',
        descriptions:['{situation} I am not super into murdering people, dude, but people die if they do not get food. The {target} are stopping the food. I think that makes us the good guys.','{situation} Get the {target} off the route. People need dinner. They do not. That is about as much ethics as I can do before lunch.'],
        briefs:[
          {target:'pirate raiders',profile:'pirate',motive:'courier security',situation:'Pirates keep jumping our couriers for the food.',titles:['Courier Route Cleanup','Pirate Problem']},
          {target:'delivery hijackers',profile:'pirate',motive:'retaliation',situation:'Same hijackers. Three stolen orders this week. I am getting bored of them.',titles:['Stop Stealing Lunch','Courier Hijacker Sweep']},
          {target:'rogue delivery drones',profile:'rogue',motive:'containment',situation:'Some delivery drones stopped listening to Dispatch and started shooting the replacements.',titles:['Dispatch Fault','Rogue Courier Drones']},
          {target:'hostile xenoforms',profile:'xeno',motive:'route security',situation:'Xenos keep following our couriers. I think they like the food. Great.',titles:['Food Chain Problem','Courier Xeno Clearance']}
        ],
        completionSubjects:['ROUTE IS FIXED','THEY ARE GONE, APPARENTLY','COURIERS CAN WORK AGAIN'],
        completionBodies:['Dude, the {target} are gone. CR {credits}. Standing: +{rep}. Enjoy the five minutes before something else breaks.','The {target} are gone. Couriers are moving. CR {credits}. Standing: +{rep}. Freaking miracle.'],
        failureMail:{contactId:'nyxo_malloc',subjects:['DUDE. THEY ARE STILL THERE.','WHAT THE SHIZ WAS THAT?'],bodies:['Dude, the {target} are still there. Couriers are still yelling at Dispatch. Now I have your failed job too. Awesome.','What the shiz, X? We wanted zero {target}. We have “still a problem”. Not the same thing.']},
        abandonMail:{contactId:'nyxo_malloc',subjects:['YOU JUST LEFT?','DUDE. THE TARGETS.'],bodies:['Dude. You went out to kill the {target}, looked at them and left. They are still there. The couriers are still calling. Guess who gets the calls?','Shiz, X. If you are going to bail, do it before Dispatch tells everyone the route is clear. Now I look like an idiot and the {target} still own the place.']},
        personalFollowUp:{contactId:'nyxo_malloc',minRisk:2,chance:.38,subjects:['DUDE, NICE','FREAKING NICE','THE ROUTE IS QUIET'],bodies:['Dude, the {target} are gone. Like, actually gone. Dispatch got through a whole shift change without somebody yelling “incoming”. Freaking beautiful.','Dude, you killed the {target}, the couriers are moving, and people get dinner. I think that means we saved lives. Do not think about it too hard.']}
      }
    },
    defaults:{target:'hostile group'}
  };


  // Live ordinary combat-recovery template: destroy a hostile group, then recover one
  // physical package from a fixed nearby point in space. This is deliberately one
  // campaign stage: the recovery controller takes over only after the combat target
  // count reaches zero. The same recovery machinery can later be chained into longer
  // contracts, but this template ends after the package is tractored aboard.
  const combatRecovery={
    id:'combat_recovery',
    version:1,
    family:'combat_recovery',
    musicMode:'violent',
    minLevel:1,
    maxLevel:null,
    allowedFactions:['trade','security','jackals','helix','quickbite'],
    board:{category:'combat',weight:.72,maxPerBoard:2},
    risk:{base:1,min:1,levelsPerStep:2,max:9,jitter:1},
    reward:{
      basePay:900,payPerRisk:780,payRiskSquare:230,payPerFighterWork:72,randomPay:400,roundPay:50,
      baseXp:95,xpPerRisk:64,xpRiskSquare:8,xpPerFighterWork:7
    },
    sections:[
      {type:'combat_recovery',label:'Destroy and Recover',params:{
        target:{base:4,perRisk:1,random:2,min:5,max:18,round:true},
        fighterHp:{base:11,perRisk:.65,min:12,max:18,round:true},
        profile:'$profile',recoveryLabel:'$cargo',markerGrowRange:105,captureRadius:18,tractorSeconds:2.15
      }}
    ],
    presentation:{
      trade:{
        contactId:'corvella_pallis',
        cargo:['encrypted cargo ledger','sealed evidence package','stolen account core'],
        descriptions:['{situation} Sweetie, break the {target} for me, then bring back the {cargo}. Big guns first, careful hands second. Show-off.','{situation} Clear the hostile group, babe, then recover the {cargo} from the wreckage. I want the package back and I want you looking good doing it.'],
        briefs:[
          {target:'pirate raiders',profile:'pirate',motive:'route security',situation:'A pirate crew carrying records from several attacks has been located off the trade lane.',titles:['Raiders and Records','Wreckage Recovery']},
          {target:'cargo hijackers',profile:'pirate',motive:'evidence recovery',situation:'The crew that hit two merchant consignments is moving with evidence linking them to the thefts.',titles:['Recover the Ledger','Hijacker Intercept']},
          {target:'hired raiders',profile:'hostile',motive:'commercial intelligence',situation:'An armed contract group has been carrying route information taken from Free Trader traffic.',titles:['Route Data Recovery','Contract Group Intercept']}
        ],
        completionSubjects:['RECOVERY CONFIRMED','PACKAGE SECURED'],
        completionBodies:['The {target} are gone and the {cargo} is safely recovered. CR {credits} released. Standing: +{rep}.','Recovery confirmed. The hostile group is gone and {cargo} is secure. CR {credits} released. Standing: +{rep}.'],
        failureMail:{contactId:'corvella_pallis',subjects:['RECOVERY FAILED','BABE, WE NEEDED THE PACKAGE'],bodies:['Sweetie, the {target} are still a problem and the {cargo} is still missing. That is two chances to impress me and somehow you missed both.','Babe, the point was not just to make wreckage. We needed the {cargo} back as well. Big dramatic entrance, no useful ending. Hmm.']},
        abandonMail:{contactId:'corvella_pallis',subjects:['YOU LEFT THE RECOVERY','PACKAGE STILL OUT THERE'],bodies:['Sweetie, you left before the {cargo} was secured. You do not get to tease me with half a job and call it finished.','Babe, the recovery point was marked and you walked away from it. The {cargo} is still out there and I am deeply unimpressed with your commitment issues.']},
        personalFollowUp:{contactId:'corvella_pallis',minRisk:3,chance:.24,subjects:['VERY NICE, SWEETIE','GUNS AND GENTLE HANDS'],bodies:['Sweetie, you broke the bad people, found the package and brought it home. Big guns and delicate recovery work. That combination does things to me.','Babe, hostile group gone and {cargo} tucked safely aboard. Brutal first half, gentle finish. Fronking gorgeous.']}
      },
      security:{
        contactId:'kudo_shang',
        cargo:['encrypted command module','flight recorder','contraband manifest core'],
        descriptions:['{situation} Eliminate the {target}. Recover the {cargo} from the debris field.','{situation} Neutralise the hostile group, then secure the {cargo}. No quarter. No unsecured evidence.'],
        briefs:[
          {target:'armed smugglers',profile:'hostile',motive:'intelligence recovery',situation:'An armed smuggling group is carrying material required for an active Directorate investigation.',titles:['Intercept and Recover','Evidence Recovery']},
          {target:'wanted pirate craft',profile:'pirate',motive:'law enforcement',situation:'A wanted raider group is believed to be carrying a hardened recorder from a previous attack.',titles:['Hard Evidence','Raider Recovery']},
          {target:'rogue security drones',profile:'rogue',motive:'technical intelligence',situation:'A rogue drone group contains a command module required to identify the control compromise.',titles:['Command Module Recovery','Rogue Drone Intercept']}
        ],
        completionSubjects:['OBJECTIVE SECURED','RECOVERY COMPLETE'],
        completionBodies:['Hostile group neutralised. The {cargo} is secured. CR {credits}. Standing: +{rep}.','The {target} are destroyed and the {cargo} is in Directorate custody. Operation complete. CR {credits}. Standing: +{rep}.'],
        failureMail:{contactId:'kudo_shang',subjects:['OBJECTIVE NOT SECURED','OPERATION FAILED'],bodies:['You had two objectives. Destroy the threat. Secure the {cargo}. You completed neither. Failure.','The {cargo} is still unsecured. A half-finished operation is a failed operation.']},
        abandonMail:{contactId:'kudo_shang',subjects:['UNAUTHORISED WITHDRAWAL','RECOVERY ABANDONED'],bodies:['You withdrew before the {cargo} was secured. No withdrawal was authorised.','Killing the threat and abandoning the objective is weakness dressed as progress. Finish the job.']}
      },
      jackals:{
        contactId:'cassian_erivan_snade',
        cargo:['encrypted data case','sealed valuables package','private account core'],
        descriptions:['{situation} I suspect the {target} are nearing the end of their usefulness. The {cargo}, on the other hand, would look much better in our possession.','{situation} It would be satisfying if the {target} ceased troubling us and the {cargo} subsequently found its way home.'],
        briefs:[
          {target:'rival syndicate fighters',profile:'hostile',motive:'proprietary recovery',situation:'A rival crew is transporting something that was ours before it became, briefly, theirs.',titles:['Property Reclamation','An Ending and an Epilogue']},
          {target:'bounty hunters',profile:'hostile',motive:'discretion',situation:'A bounty crew has acquired records whose continued circulation would be tiresome.',titles:['A Discreet Recovery','Loose Ends']},
          {target:'armed thieves',profile:'pirate',motive:'restitution',situation:'A small misunderstanding of ownership has persisted rather longer than I find charming.',titles:['Restitution','Recover the Case']}
        ],
        completionSubjects:['THE EPILOGUE IS OURS','PROPERTY RESTORED'],
        completionBodies:['The {target} are history and the {cargo} has returned to the correct hands. CR {credits}. Standing: +{rep}.','A clean ending, followed by the recovery of the {cargo}. Admirably complete. Payment: CR {credits}. Standing: +{rep}.'],
        failureMail:{contactId:'cassian_erivan_snade',subjects:['AN INCOMPLETE ENDING','THE OBJECT REMAINS ABROAD'],bodies:['The troublesome people remain troublesome and the desirable object remains elsewhere. An impressively complete lack of progress.','The {cargo} remains uncollected. One does not leave the MacGuffin floating in the final reel, X.']},
        abandonMail:{contactId:'cassian_erivan_snade',subjects:['EXIT BEFORE THE EPILOGUE','A CURIOUS DEPARTURE'],bodies:['You left while the {cargo} remained in somebody else\'s future. I had expected that future to be shorter.','The object was marked, the field was yours, and yet you departed. A strangely incomplete performance.']}
      },
      helix:{
        contactId:'navira_derris',
        cargo:['sensor memory core','biological sample package','research data module'],
        descriptions:['{situation} Remove the {target}, then recover the {cargo}. I want to know why it survived when the rest did not.','{situation} Destroy the hostile group and recover the {cargo}. Please do not damage the interesting part.'],
        briefs:[
          {target:'research thieves',profile:'hostile',motive:'data recovery',situation:'An armed group has removed proprietary material from a Helix survey operation.',titles:['Data Recovery Intercept','Proprietary Retrieval']},
          {target:'hostile xenoforms',profile:'xeno',motive:'specimen recovery',situation:'A xeno contact group includes material Helix requires intact after the engagement.',titles:['Xeno Sample Recovery','Biological Retrieval']},
          {target:'rogue industrial drones',profile:'rogue',motive:'fault analysis',situation:'A rogue drone group contains a hardened memory module useful for reconstructing the control failure.',titles:['Failure-State Recovery','Memory Core Retrieval']}
        ],
        completionSubjects:['SAMPLE RECOVERED','RECOVERY DATA RECEIVED'],
        completionBodies:['The {cargo} is intact and the hostile variable has been removed. CR {credits}. Standing: +{rep}.','Recovery confirmed. The {cargo} is already more analytically useful than the engagement telemetry. Payment: CR {credits}. Standing: +{rep}.'],
        failureMail:{contactId:'navira_derris',subjects:['RECOVERY CONDITION NOT MET','OBJECTIVE LOSS'],bodies:['The {cargo} was the part I actually needed. Naturally, that is the part we do not have.','The hostile group is gone, but the useful evidence is still floating in space. That is scientifically irritating.']},
        abandonMail:{contactId:'navira_derris',subjects:['RECOVERY TERMINATED','SAMPLE LEFT UNCOLLECTED'],bodies:['You terminated the operation before the {cargo} was recovered. That outcome is not analytically useful.','The marked recovery object remained in the field when you withdrew.']}
      },
      quickbite:{
        contactId:'nyxo_malloc',
        cargo:['courier black box','stolen route-data module','payment terminal core'],
        descriptions:['{situation} Shoot the {target}, then grab the {cargo}. I know stealing is bad, but they stole our shit first, so this is basically ethics with lasers.','{situation} Kill the problem, grab the {cargo}. People need deliveries. People die without food. So I think we are saving lives. Probably.'],
        briefs:[
          {target:'delivery hijackers',profile:'pirate',motive:'loss investigation',situation:'Hijackers keep hitting our couriers. One of them has a stolen courier recorder.',titles:['Shoot Them, Grab the Box','Courier Black Box']},
          {target:'pirate raiders',profile:'pirate',motive:'route intelligence',situation:'Pirates copied our courier routes. Dispatch finally noticed.',titles:['Get the Route Data Back','Pirates and Paperwork']},
          {target:'rogue delivery drones',profile:'rogue',motive:'fault analysis',situation:'Rogue couriers. Engineering wants one terminal core and swears it will explain everything.',titles:['Grab the Freaking Core','Dispatch Recovery']}
        ],
        completionSubjects:['DUDE, WE GOT THE THING','PACKAGE RECOVERED'],
        completionBodies:['Dude, targets gone, {cargo} recovered, nobody from Insurance has called yet. CR {credits}. Standing: +{rep}. Awesome.','We got the {cargo}. Corporate says that makes the shooting a successful logistics operation. I say we saved future lunches. CR {credits}. Standing: +{rep}.'],
        failureMail:{contactId:'nyxo_malloc',subjects:['DUDE. WHERE IS THE THING?','THAT WAS TWO OBJECTIVES'],bodies:['Dude, we needed the {target} dead and the {cargo} recovered. That was two things. We somehow got to zero.','What the shiz, X? The recovery ticket still says NOT RECOVERED in huge letters.']},
        abandonMail:{contactId:'nyxo_malloc',subjects:['YOU LEFT THE BOX?','DUDE. IT HAD A MARKER.'],bodies:['Dude. The {cargo} had a giant navigation marker on it and you still left it there. I have no defence for this.','You killed stuff and then bailed before collecting the thing we needed. That is not logistics, dude. That is recreational violence with paperwork.']}
      }
    },
    defaults:{target:'hostile group',cargo:'recovery package'}
  };


  // Sixth live ordinary template: a rare major strike against a fortified installation.
  // The gameplay sequence remains bespoke, but campaign eligibility, rewards, faction
  // presentation and celestial requirements are data driven. Deep-core strikes land on
  // a remote moon, never the parent planet; the destination moon is always green so the
  // established green ground-grid language carries cleanly into the surface assault.
  const deepCore={
    id:'deep_core',
    version:1,
    family:'deep_core',
    musicMode:'violent',
    minLevel:4,
    maxLevel:null,
    allowedFactions:['trade','security','jackals','helix'],
    board:{category:'major',weight:.15,maxPerBoard:1,major:true},
    risk:{base:3,min:3,levelsPerStep:2,max:9,jitter:1},
    planetaryRequirements:{
      landingBody:'moon',
      landingColour:'green',
      moonCount:{min:1,max:2}
    },
    reward:{
      basePay:3600,payPerRisk:410,payRiskSquare:95,payPerFighterWork:82,randomPay:500,roundPay:50,
      baseXp:320,xpPerRisk:58,xpRiskSquare:7,xpPerFighterWork:7
    },
    sections:[
      {type:'fighters',label:'Orbital Defenders',params:{target:{base:7,perRisk:1,random:3,min:8,max:18,round:true},fighterHp:{base:11.5,perRisk:.7,min:12,max:18,round:true}}},
      {type:'planet_descent',label:'Moon Descent',params:{difficulty:'$risk'}},
      {type:'deep_core_surface',label:'Surface / Reactor Strike',params:{difficulty:'$risk',terrain:'moon'}}
    ],
    presentation:{
      trade:{
        contactId:'corvella_pallis',
        descriptions:[
          '{situation} Sweetie, this one is enormous. Break the orbital screen, get down to the moon and kill the reactor. I get a bit dizzy just thinking about your big armed drone doing all that damage for me.',
          '{situation} Babe, I need that lunar facility dead. Fighters, surface guns, bunker, reactor. Go be terrifying and try not to make me worry too much.'
        ],
        briefs:[
          {target:'pirate moon base',motive:'route security',situation:'A fortified pirate facility is coordinating attacks on independent shipping across the sector.',titles:['Moonbase Suppression','Pirate Reactor Strike']},
          {target:'extortion hub',motive:'free passage',situation:'An armed syndicate has turned a remote lunar installation into the command centre for a protection racket on merchant traffic.',titles:['Break the Toll','Lunar Hard Target']},
          {target:'raider logistics base',motive:'retaliation',situation:'Free Trader losses have been traced to a hardened logistics base on an otherwise unimportant moon.',titles:['Raider Base Strike','Remote Facility Removal']}
        ],
        completionSubjects:['LUNAR FACILITY DESTROYED','REACTOR STRIKE CONFIRMED'],
        completionBodies:['The lunar installation is off the board and the route is already reopening. Payment: CR {credits}. Standing: +{rep}.','Reactor destruction confirmed. The facility is finished. CR {credits} released. Standing: +{rep}.'],
        failureMail:{contactId:'corvella_pallis',subjects:['BABE, THAT BASE IS STILL THERE','SWEETIE, WE NEEDED THE REACTOR GONE'],bodies:['Babe, I sent my favourite terrifying machine after a moon base and the moon base is still there. Do you understand how badly that ruins the fantasy? Also, we have a serious operational problem.','Sweetie, I know that moon was a nightmare, but the reactor survived. All those guns, all that dramatic flying, and no enormous explosion at the end. Properly disappointing.']},
        abandonMail:{contactId:'corvella_pallis',subjects:['YOU WALKED AWAY FROM THE STRIKE','BABE. SERIOUSLY?'],bodies:['Babe, you do not accept a reactor strike from me and then wander off halfway through it. That is an outrageous amount of build-up for absolutely no finish.','Sweetie, if a hard target is beyond you, tell me before the operation starts. Walking away after the orbital fight is not brave, mysterious or attractive. It is a fronking awful problem.']},
        personalFollowUp:{contactId:'corvella_pallis',minRisk:5,chance:.28,subjects:['THAT WAS A HELL OF A RUN','RE: THE MOON'],bodies:['Babe, that was monstrous and you still got all the way into the base and killed the reactor. Big guns, impossible odds, enormous explosion. Fronking beautiful.','Sweetie, the traders watching that moon just saw the whole installation go dark. I am going to need a minute. That was indecently impressive.']}
      },
      security:{
        contactId:'kudo_shang',
        descriptions:[
          '{situation} OSD authorises destruction of the lunar installation. Break the orbital defence, penetrate the facility and destroy the reactor. No quarter.',
          '{situation} The moon base is a declared hard target. Engage defenders with extreme prejudice and leave the reactor non-functional.'
        ],
        briefs:[
          {target:'hostile command facility',motive:'strategic denial',situation:'A fortified lunar command site is directing armed operations inside a Directorate exclusion zone.',titles:['Deep Core Strike','Strategic Denial']},
          {target:'outlaw military base',motive:'threat removal',situation:'An unauthorised armed force has established a hardened base on a remote moon and rejected every order to disarm.',titles:['Lunar Pacification','Hard Target']},
          {target:'weapons-support facility',motive:'force protection',situation:'Intelligence confirms that a remote lunar reactor complex is sustaining attacks on authorised patrols.',titles:['Extreme Prejudice','Reactor Denial']}
        ],
        completionSubjects:['HARD TARGET DESTROYED','REACTOR DESTRUCTION CONFIRMED','OPERATION CLOSED'],
        completionBodies:['Reactor destruction confirmed. The installation is combat ineffective. Payment: CR {credits}. Standing: +{rep}.','Hard target neutralised. No further action required. CR {credits} released. Standing: +{rep}.'],
        failureMail:{contactId:'kudo_shang',subjects:['HARD TARGET REMAINS ACTIVE','STRIKE FAILURE','OBJECTIVE NOT DESTROYED'],bodies:['The installation remains operational. The assigned objective was destruction, not damage. Mission failure recorded.','You were authorised to eliminate the facility with extreme prejudice. The reactor is still active. That result is unacceptable.']},
        abandonMail:{contactId:'kudo_shang',subjects:['UNAUTHORISED WITHDRAWAL','STRIKE ABANDONED'],bodies:['You withdrew from an authorised hard-target strike while the objective remained viable. No quarter was requested and no withdrawal was authorised.','The reactor remained active when you left the operation. Timidity is not an operational constraint. Do not repeat it.']},
        personalFollowUp:{contactId:'kudo_shang',minRisk:5,chance:.18,subjects:['RE: HARD TARGET','OPERATIONAL NOTE'],bodies:['Orbital screen destroyed. Facility penetrated. Reactor eliminated. Good work, X.','The target was treated with the required prejudice. Clean result. Noted.']}
      },
      jackals:{
        contactId:'cassian_erivan_snade',
        descriptions:[
          '{situation} The offending establishment occupies a remote moon, which is considerate of it. I suspect its defenders and reactor are both approaching retirement.',
          '{situation} It would be delightful if the lunar installation became a historical rather than operational concern.'
        ],
        briefs:[
          {target:'rival syndicate stronghold',motive:'competition',situation:'A rival organisation has mistaken a fortified moon base for a permanent argument in its favour.',titles:['Hard Target','A Lunar Correction']},
          {target:'black-site facility',motive:'discretion',situation:'A remote facility contains people and records whose continued institutional existence has become inconvenient.',titles:['Black Site Raid','The Quiet Moon']},
          {target:'mercenary base',motive:'retaliation',situation:'A mercenary company has used a lunar stronghold to conduct repeated operations against Combine interests.',titles:['Contract Termination','Sic Transit']}
        ],
        completionSubjects:['SIC TRANSIT','A MOST SATISFACTORY RUIN','THE MOON IS QUIETER'],
        completionBodies:['The facility has gone the way of Carthage, though with considerably less paperwork. CR {credits} released. Standing: +{rep}.','The reactor is destroyed and our difficulty has acquired the serenity of the permanently inanimate. Payment: CR {credits}. Standing: +{rep}.'],
        failureMail:{contactId:'cassian_erivan_snade',subjects:['THE FORTRESS ENDURES','AN EXPENSIVE INTERMISSION'],bodies:['How unfortunate. The moon base remains entirely present and operational. I had hoped its future would be considerably shorter.','The reactor survives. Our little suggestion that the installation become obsolete appears to have been ignored.']},
        abandonMail:{contactId:'cassian_erivan_snade',subjects:['A FAILURE OF NERVE','EXIT BEFORE THE FINAL ACT'],bodies:['You departed while the reactor remained perfectly healthy. That was not the sequence of departures I had in mind.','The virtue of attacking a remote moon is that there are so few innocent reasons to stop halfway. You stopped anyway. Fronking disappointing.']},
        personalFollowUp:{contactId:'cassian_erivan_snade',minRisk:5,chance:.30,subjects:['CETERUM CENSEO','A FINE PIECE OF VANDALISM'],bodies:['Carthago delenda est, as the old gentleman kept insisting. You have demonstrated the advantage of eventually acting on the sentiment. Splendid work.','A fortress, an orbital screen and a reactor, all converted into past tense. There is an elegance to decisive grammar.']}
      },
      helix:{
        contactId:'navira_derris',
        descriptions:[
          '{situation} The relevant infrastructure is isolated on a remote moon. Remove the orbital defence, enter the complex and terminate reactor operation.',
          '{situation} Helix requires irreversible shutdown of the lunar facility. Surface access is protected. Reactor destruction is the reliable solution.'
        ],
        briefs:[
          {target:'unauthorised research complex',motive:'containment',situation:'Telemetry from a remote lunar laboratory indicates an uncontrolled programme with unacceptable propagation risk.',titles:['Containment Strike','Lunar Research Denial']},
          {target:'stolen Helix facility',motive:'asset denial',situation:'A captured industrial complex is using Helix reactor technology to support armed operations.',titles:['Asset Denial','Facility Strike']},
          {target:'contaminated processing base',motive:'containment',situation:'A remote processing installation has crossed the point at which recovery remains statistically preferable to destruction.',titles:['Irreversible Shutdown','Containment Threshold']}
        ],
        completionSubjects:['REACTOR STATE: TERMINATED','FACILITY DENIAL CONFIRMED','CONTAINMENT ACHIEVED'],
        completionBodies:['Reactor output has fallen to zero and the facility is no longer operationally recoverable. Payment: CR {credits}. Standing: +{rep}.','The lunar site has been reduced below the threshold for continued operation. CR {credits} released. Standing: +{rep}.'],
        failureMail:{contactId:'navira_derris',subjects:['REACTOR OUTPUT PERSISTS','CONTAINMENT FAILURE'],bodies:['The reactor remains active. Consequently every condition that justified destructive intervention still exists. The mission did not achieve containment.','Telemetry confirms that the facility survived the strike in an operational state. That is the specific outcome the contract was designed to prevent.']},
        abandonMail:{contactId:'navira_derris',subjects:['INTERVENTION TERMINATED EARLY','FACILITY REMAINS ACTIVE'],bodies:['You terminated the intervention while reactor output remained above zero. From a containment perspective this is indistinguishable from not solving the problem.','The lunar facility remains operational because the strike was abandoned before the decisive stage. I cannot identify a useful scientific interpretation of that choice.']},
        personalFollowUp:{contactId:'navira_derris',minRisk:5,chance:.24,subjects:['RE: LUNAR TELEMETRY','USEFULLY FINAL RESULT'],bodies:['The reactor-collapse telemetry is unusually complete. The destruction itself was also operationally satisfactory.','There is very little ambiguity in the post-strike data. I appreciate outcomes that remove the need for confidence intervals.']}
      }
    },
    defaults:{target:'fortified lunar installation'}
  };


  // Reusable secure-terminal intrusion. Crossroads Outpost is only the internal
  // station asset/model name; player-facing contracts describe the installation by
  // function (data centre, communications post, relay, archive facility, etc.).
  // The physical flow is shared: cross the live minefield, dock through the central
  // aperture, hack the secure terminal, turn around, retrace the corridor and leave
  // through the same deactivated minefield.
  const secureTerminalIntrusion={
    id:'secure_terminal_intrusion',
    version:3,
    family:'secure_terminal_intrusion',
    musicMode:'calm',
    minLevel:2,
    maxLevel:null,
    allowedFactions:['trade','security','jackals','helix','quickbite'],
    board:{enabled:true,category:'intrusion',weight:.8,maxPerBoard:1},
    risk:{base:2,min:2,levelsPerStep:2,max:6,jitter:1},
    reward:{
      basePay:1350,payPerRisk:760,payRiskSquare:55,randomPay:350,roundPay:50,
      baseXp:170,xpPerRisk:58,xpRiskSquare:6
    },
    sections:[
      {
        type:'station_minefield_approach',
        label:'Minefield Approach',
        params:{
          difficulty:'$risk',
          stationModel:'Crossroads Outpost',
          // Same journey-length model as the asteroid mining-base delivery: the
          // station remains a genuinely distant fixed destination behind the stream.
          routeSeconds:{base:20.5,perRisk:.65,random:3.5},
          mineCount:{base:30,perRisk:3,min:34,max:46,round:true},
          mineTriggerRadius:15.5,
          mineBlastRadius:22
        }
      },
      {
        type:'station_terminal_hack',
        label:'Secure Terminal',
        params:{hackSeconds:{base:3.7,perRisk:.22,min:4.1,max:5.1}}
      },
      {
        type:'station_hack_escape',
        label:'Minefield Withdrawal',
        params:{escapeDistance:{base:205,perRisk:15,min:235,max:295}}
      }
    ],
    presentation:{
      trade:{
        contactId:'corvella_pallis',cargoStyle:'data',
        destinations:['fortified data centre','secure freight relay','remote customs archive'],
        titles:['Manifest Extraction','Freight Ledger Copy','Customs Record Lift'],
        cargo:['shipping manifests','route-pricing records','customs movement logs','private freight ledgers'],
        descriptions:[
          'Sweetie, I need {cargo} out of a fortified data centre. Get through the mines, slip into the secure terminal and steal me a copy. Careful with that beautiful machine of yours.',
          'Babe, {destination} has {cargo} somebody would rather keep private. Get in, copy it and get out without turning the minefield into fireworks. I would like my favourite drone back intact.'
        ],
        completionSubjects:['DATA COPY RECEIVED','ARCHIVE EXTRACTION CONFIRMED'],
        completionBodies:['The copied {cargo} arrived intact. CR {credits} released. Standing: +{rep}.','We have the archive from {destination}. Payment: CR {credits}. Standing: +{rep}.'],
        failureMail:{contactId:'corvella_pallis',subjects:['SWEETIE, WE NEEDED THAT DATA','RE: TERMINAL JOB'],bodies:['Sweetie, we still do not have {cargo}, and the owners know somebody came knocking. I sent a gorgeous armed drone into a minefield and got no data back. That is a terrible waste of drama.','Babe, the terminal job failed. The data stayed where it was and now I have to explain why my favourite show-off came home empty-handed.']},
        abandonMail:{contactId:'corvella_pallis',subjects:['YOU LEFT THE HUB, SWEETIE','RE: ABANDONED EXTRACTION'],bodies:['Sweetie, you took my intrusion job and walked away before the data came out. All that tense minefield foreplay for half an extraction. I am offended on several levels.','Babe, if the minefield looks impossible, decide that before accepting the job. Leaving halfway through makes everybody look like a nerk and you considerably less impressive.']},
        personalFollowUp:{contactId:'corvella_pallis',minRisk:3,chance:.20,subjects:['NICE WORK, SWEETIE','RE: THE DATA CENTRE'],bodies:['Sweetie, through the mines, into the facility, data copied and back out again. Big dangerous drone, tiny doorway, perfect theft. I am embarrassingly pleased with you.']}
      },
      security:{
        contactId:'kudo_shang',cargoStyle:'data',
        destinations:['remote communications post','hardened command relay','fortified signal station'],
        titles:['Communications Denial','Relay Compromise','Secure Node Intrusion'],
        cargo:['hostile relay operations','forward command traffic','targeting coordination traffic','encrypted tactical communications'],
        descriptions:[
          'A remote communications post is supporting hostile operations. Penetrate the minefield. Break the secure terminal. End {cargo}. Withdraw when the relay is down.',
          '{destination} is carrying {cargo}. Get through the mines. Kill the operation at the terminal. Use force where it matters.'
        ],
        completionSubjects:['COMMUNICATIONS DENIAL CONFIRMED','RELAY OPERATION TERMINATED'],
        completionBodies:['Interruption of {cargo} is confirmed. CR {credits} authorised. Standing: +{rep}.','The secure node is offline and hostile use of {destination} has ceased. Payment: CR {credits}. Standing: +{rep}.'],
        failureMail:{contactId:'kudo_shang',subjects:['INTRUSION FAILED','OBJECTIVE NOT ACHIEVED'],bodies:['The hostile operation is still active. You reached the fight and did not finish it. Failure.','You were tasked to enter, break the operation and get out. You did not finish the job.']},
        abandonMail:{contactId:'kudo_shang',subjects:['UNAUTHORISED WITHDRAWAL','MISSION ABANDONED'],bodies:['You withdrew before completing the terminal compromise. No withdrawal order was issued.','The minefield was known before tasking. It did not change the order. Walking away did.']},
        personalFollowUp:{contactId:'kudo_shang',minRisk:4,chance:.14,subjects:['RE: RELAY DENIAL','OPERATIONAL NOTE'],bodies:['Relay broken. Withdrawal clean. Decisive work.']}
      },
      jackals:{
        contactId:'cassian_erivan_snade',cargoStyle:'data',
        destinations:['hardened archive facility','private communications vault','fortified data brokerage node'],
        titles:['A Private Archive','Correspondence Acquisition','An Editorial Correction'],
        cargo:['private communications archive','account records','blackmail correspondence','restricted traffic logs'],
        descriptions:[
          '{destination} contains {cargo}. It would be such a shame if its owners were to lose the privilege of exclusive possession.',
          'A secure terminal inside {destination} retains {cargo}. I suspect that information is about to become considerably less private. Try not to make the mines part of the conversation.'
        ],
        completionSubjects:['THE ARCHIVE IS OURS','A MOST USEFUL COPY'],
        completionBodies:['The requested {cargo} has been received. CR {credits} released. Standing: +{rep}.','The facility has retained its terminal and lost the exclusivity of its information. An elegant result. Payment: CR {credits}. Standing: +{rep}.'],
        failureMail:{contactId:'cassian_erivan_snade',subjects:['THE SECRET REMAINS SECRET','A MOST UNPRODUCTIVE VISIT'],bodies:['How unfortunate. The archive remains exactly where it was, which rather defeats the purpose of our little arrangement.','A fortified facility, a terminal and an exit. Yet somehow the only information extracted was that our plan required a better pilot.']},
        abandonMail:{contactId:'cassian_erivan_snade',subjects:['A PREMATURE RETREAT','YOU LEFT EMPTY-HANDED'],bodies:['You went to considerable trouble to visit the facility and then left its secrets entirely untroubled. Curious.','The information remains exactly where its owners prefer it. I had rather hoped their preference would prove temporary.']},
        personalFollowUp:{contactId:'cassian_erivan_snade',minRisk:3,chance:.23,subjects:['A NEAT INTRUSION','RE: THE ARCHIVE'],bodies:['The minefield remained largely intact, the archive did not, and our hosts are furious. A pleasing balance of outcomes.']}
      },
      helix:{
        contactId:'navira_derris',cargoStyle:'data',
        destinations:['remote research data centre','fortified telemetry relay','isolated sensor archive'],
        titles:['Telemetry Extraction','Remote Dataset Access','Research Archive Copy'],
        cargo:['experimental telemetry','restricted sensor history','research exchange logs','anomaly observation data'],
        descriptions:[
          'The secure terminal at {destination} contains {cargo}. Recover a complete copy. The minefield is useful context, not the experiment.',
          'Acquire {cargo} from {destination}. The minefield is an environmental constraint. If it behaves unexpectedly, record that. Do not provoke it merely to make the dataset more exciting.'
        ],
        completionSubjects:['DATASET RECEIVED','RESEARCH EXTRACTION COMPLETE'],
        completionBodies:['The requested {cargo} is complete and readable. CR {credits} released. Standing: +{rep}.','Extraction from {destination} succeeded. Data integrity is within expected limits. Payment: CR {credits}. Standing: +{rep}.'],
        failureMail:{contactId:'navira_derris',subjects:['DATA EXTRACTION FAILED','DATASET UNAVAILABLE'],bodies:['The required dataset was not extracted. The research branch remains blocked on missing input.','The terminal operation ended without {cargo}. We learned nothing except that incomplete observations remain incomplete.']},
        abandonMail:{contactId:'navira_derris',subjects:['EXTRACTION TERMINATED','TERMINAL ACCESS ABANDONED'],bodies:['You terminated the operation before the dataset was secured. The original access problem therefore remains unchanged.','The minefield was a known constraint. It does not explain abandoning the required terminal access.']},
        personalFollowUp:{contactId:'navira_derris',minRisk:4,chance:.17,subjects:['USEFUL EXTRACTION','RE: RESEARCH DATA'],bodies:['The dataset is intact. More interestingly, the minefield deflection telemetry is cleaner than expected. I have kept both.']}
      },
      quickbite:{
        contactId:'nyxo_malloc',cargoStyle:'data',
        destinations:['remote logistics data centre','fortified dispatch relay','secure franchise communications post'],
        titles:['Franchise Data Retrieval','Dispatch Database Job','Routing System Break-In'],
        cargo:['franchise routing data','locked dispatch records','customer delivery history','warehouse allocation tables'],
        descriptions:[
          'Dude, Corporate locked us out of {cargo}. It is at {destination}, behind a minefield. Apparently reset password was too easy. Go get it.',
          'We need {cargo}. It is behind mines. This is now somehow your problem. Awesome.'
        ],
        completionSubjects:['DUDE, WE HAVE THE DATA','DATABASE PROBLEM FIXED. SORT OF.'],
        completionBodies:['Dude, the {cargo} copied cleanly. CR {credits}. Standing: +{rep}. Dispatch has already started arguing about what it means.','Data received from {destination}. Payment: CR {credits}. Standing: +{rep}. Nobody has asked why a food company needed a combat drone yet.'],
        failureMail:{contactId:'nyxo_malloc',subjects:['DUDE. NO DATA.','THE DATABASE IS STILL A PROBLEM'],bodies:['Dude, we still do not have {cargo}. Corporate says this is now an IT incident, which is impressive because they sent an armed drone into a minefield.','What the shiz happened? Terminal is still locked, Dispatch is yelling, and I have three support tickets with my name on them.']},
        abandonMail:{contactId:'nyxo_malloc',subjects:['YOU BAILED ON THE DATABASE','DUDE. COME ON.'],bodies:['Dude, you went all the way to the minefield and then bailed before copying the data. I could have achieved that outcome from my desk.','You abandoned the terminal job. Database is still locked and Corporate has learned the phrase operational withdrawal. This day is shit.']},
        personalFollowUp:{contactId:'nyxo_malloc',minRisk:3,chance:.24,subjects:['THAT WAS ACTUALLY AWESOME','RE: THE DATA JOB'],bodies:['Dude. Minefield, illegal-looking data stream, red alarm, clean escape. That was freaking awesome.']}
      }
    },
    defaults:{destination:'remote secure installation',cargo:'secure data archive'}
  };


  // Reusable remote forest-cabin delivery. This is the completed development route:
  // optional light orbital trouble -> green planet/moon descent -> plains Forest Nav
  // -> committed forest corridor -> Raised Field Cabin tractor delivery -> canonical
  // surface pitch-up and forward extraction. The environment is shared; faction
  // wrappers change why the parcel is going somewhere this remote.
  const forestCabinDelivery={
    id:'forest_cabin_delivery',
    version:1,
    family:'forest_cabin_delivery',
    musicMode:'calm',
    minLevel:1,
    maxLevel:null,
    allowedFactions:['trade','security','jackals','helix','quickbite'],
    // Premise weighting is intentionally strong here. QuickBite has the most obvious
    // routine reason to serve an isolated address; Red Jackal has nearly as much reason
    // to use one for discreet hand-offs. The others remain possible rather than excluded.
    factionWeights:{quickbite:6,jackals:5,trade:3,helix:2,security:1},
    board:{category:'delivery',weight:1.0,maxPerBoard:2},
    risk:{base:2,min:1,levelsPerStep:2,max:5,jitter:1},
    reward:{
      basePay:1050,payPerRisk:720,payRiskSquare:45,randomPay:300,roundPay:50,
      baseXp:145,xpPerRisk:52,xpRiskSquare:5
    },
    planetaryRequirements:{
      landingBody:{choices:['planet','moon'],weights:[65,35]},
      landingColour:'green',
      moonCount:{min:0,max:2}
    },
    // Keep the complication genuinely occasional. A quiet delivery is the normal run;
    // faction only changes which low-probability orbital nuisance is most plausible.
    encounterTable:{
      entries:{
        pirate_ambush:{type:'fighters',profile:'pirate',params:{target:{base:2,perRisk:1,min:4,max:7,round:true},fighterHp:{base:10,perRisk:.5,min:12,max:15,round:true}}},
        rogue_drones:{type:'fighters',profile:'rogue',params:{target:{base:2,perRisk:1,min:4,max:7,round:true},fighterHp:{base:10,perRisk:.5,min:12,max:15,round:true}}},
        customs_intercept:{type:'customs_drones',profile:'customs',params:{target:{base:3,perRisk:1,min:5,max:8,round:true},fighterHp:{base:10,perRisk:.5,min:12,max:15,round:true}}}
      },
      weightsByFaction:{
        trade:{none:80,pirate_ambush:14,rogue_drones:6},
        security:{none:80,rogue_drones:14,pirate_ambush:6},
        jackals:{none:78,customs_intercept:12,pirate_ambush:6,rogue_drones:4},
        helix:{none:80,rogue_drones:12,pirate_ambush:8},
        quickbite:{none:80,pirate_ambush:12,rogue_drones:8}
      }
    },
    sections:[
      {type:'template_encounter',label:'Orbital Approach'},
      {type:'planet_descent',label:'Planetary Descent',params:{difficulty:'$risk'}},
      {type:'surface_destination_approach',label:'Forest Approach',params:{difficulty:'$risk',terrain:'plains',destination:'forest',routeLength:360,treeClumps:7,entryRadius:24}},
      {type:'forest_corridor',label:'Forest Cabin Delivery',params:{difficulty:'$risk',length:650,terminalDestination:'cabin_delivery',entryFrom:'surface_destination'}}
    ],
    presentation:{
      trade:{
        contactId:'corvella_pallis',cargoStyle:'case',
        titles:['Remote Cabin Delivery','Forest Consignment','Woodland Supply Run'],
        cargo:['sealed supply case','replacement machine parts','merchant parcel','remote-site stores'],
        descriptions:[
          'Sweetie, take {cargo} to the cabin beyond the forest. Try not to leave pieces of my favourite drone on the trees. I am rather attached to it.',
          'Babe, remote customer, forest route, direct handoff at {destination}. You make dangerous deliveries look far too good.',
          'Carry {cargo} to {destination}, sweetie. Tight trees on the final run, so show me how graceful that big machine can be.'
        ],
        completionSubjects:['FOREST DELIVERY CONFIRMED','REMOTE HANDOFF COMPLETE'],
        completionBodies:['The recipient at {destination} confirmed receipt of {cargo}. Payment: CR {credits}. Standing: +{rep}.','Delivery is confirmed at the remote cabin. CR {credits} has been released through VOX. Standing: +{rep}.'],
        encounterAcknowledgements:{pirate_ambush:['The route record also shows a pirate intercept before descent. You cleared it and still made the handoff.'],rogue_drones:['Rogue drones complicated the orbital approach. The parcel still reached the cabin.']},
        failureMail:{contactId:'corvella_pallis',subjects:['SWEETIE, THE CABIN IS STILL WAITING','RE: FOREST DELIVERY'],bodies:['Sweetie, the cabin never got {cargo}. I know those trees are tight, but I was expecting graceful, dangerous competence. Instead I have an empty table and a sulk.','Babe, the forest run ended without the parcel reaching the cabin. All that beautiful machinery and the customer is still waiting. Not your finest look.']},
        abandonMail:{contactId:'corvella_pallis',subjects:['YOU LEFT THEM WAITING, SWEETIE','BABE, YOU WALKED AWAY'],bodies:['Sweetie, you accepted my remote delivery and left the cabin waiting. I can defend bad luck. I cannot make walking away look sexy, however hard I try.','Babe, if the forest route is too much, tell me before you accept it. I would rather worry about you before the run than be disappointed in you afterwards.']},
        personalFollowUp:{contactId:'corvella_pallis',minRisk:3,chance:.16,encounterMinRisk:2,encounterChance:.48,subjects:['NICE FOREST RUN, SWEETIE','RE: REMOTE DELIVERY'],bodies:['Sweetie, clean through the trees and the parcel exactly where it belonged. Big machine, tiny gaps. I may have watched that replay twice.'],encounterBodies:{pirate_ambush:['Babe, pirates above the planet and that forest below it, and you still made the delivery. You really do know how to make an entrance.'],rogue_drones:['Sweetie, rogue drones before descent and then that forest route? That is an unreasonable amount of showing off in one contract.']}}
      },
      security:{
        contactId:'kudo_shang',cargoStyle:'case',
        titles:['Remote Field Transfer','Forest Observer Supply','Secure Cabin Handoff'],
        cargo:['sealed field stores','encrypted sensor package','authorised surveillance module','secure evidence case'],
        descriptions:['Deliver {cargo} to the authorised remote cabin. Follow the marked forest route and maintain custody through handoff.','A remote Directorate position requires {cargo}. Complete the surface approach and direct transfer at {destination}.'],
        completionSubjects:['REMOTE TRANSFER CONFIRMED','FIELD HANDOFF CLOSED'],
        completionBodies:['Custody transfer at {destination} is confirmed. Payment: CR {credits}. Standing: +{rep}.'],
        encounterAcknowledgements:{pirate_ambush:['Pirate contact before descent was outside tasking. Threat removal is recorded.'],rogue_drones:['Rogue drone contact was resolved before descent. Additional action recorded.']},
        failureMail:{contactId:'kudo_shang',subjects:['REMOTE TRANSFER FAILED','OBJECTIVE NOT COMPLETED'],bodies:['The remote transfer failed. The forest did not defeat the mission. You did. Correct it.','Objective incomplete. The route was hard. The order was simple. Finish what you accept.']},
        abandonMail:{contactId:'kudo_shang',subjects:['UNAUTHORISED WITHDRAWAL','REMOTE TRANSFER ABANDONED'],bodies:['You withdrew before completing the authorised handoff. No withdrawal was ordered.','The forest route remained the route. You chose to stop. I do not reward weakness.']},
        personalFollowUp:{contactId:'kudo_shang',minRisk:4,chance:.10,encounterMinRisk:2,encounterChance:.38,subjects:['RE: REMOTE TRANSFER','ADDITIONAL ACTION RECORDED'],bodies:['Remote transfer complete. You held the line through the route. Good.'],encounterBodies:{pirate_ambush:['Additional hostile contact was not in the tasking. It was removed without loss of custody. Good work.'],rogue_drones:['Rogue drone contact was incidental. Maintaining custody through it was not. Acceptable work.']}}
      },
      jackals:{
        contactId:'cassian_erivan_snade',cargoStyle:'case',
        titles:['Woodland Drop','A Quiet Cabin','Remote Hand-Off'],
        // Drug cargo is deliberately common for this wrapper: an isolated cabin is a
        // natural Red Jackal destination, not merely a generic parcel address.
        cargo:['sealed narcotics package','restricted stimulants','unregistered pharmaceuticals','private chemical consignment','unmarked private case'],
        descriptions:['A discreet client has an isolated forest cabin and, presently, an unfortunate absence of {cargo}. I imagine that imbalance can be corrected.','{destination} is expecting {cargo}. I would be delighted if the parcel simply appeared on the receiving table without inspiring unnecessary curiosity.','A small woodland address awaits {cargo}. The journey is inconvenient. The discretion is the point.'],
        completionSubjects:['THE CABIN HAS ITS PARCEL','A QUIET DELIVERY CONCLUDED'],
        completionBodies:['Our client confirms receipt of {cargo}. CR {credits} released. Standing: +{rep}.','The woodland handoff is complete. The parcel is where it belongs and, better still, nowhere interesting. Payment: CR {credits}. Standing: +{rep}.'],
        encounterAcknowledgements:{customs_intercept:['Customs displayed an unfortunate curiosity before descent. You corrected it before proceeding to the cabin.'],pirate_ambush:['Pirates attempted to turn a discreet delivery into public entertainment. They failed.'],rogue_drones:['A collection of obsolete machines briefly complicated the approach. They are now considerably more obsolete.']},
        failureMail:{contactId:'cassian_erivan_snade',subjects:['THE CABIN REMAINS EMPTY','A MOST INCONVENIENT NON-DELIVERY'],bodies:['A secluded cabin, a marked route and one parcel, X. Somehow we have arrived at the only ending in which the parcel is not there. Disappointing.','Our client remains without {cargo}. Privacy is of limited value when the goods themselves fail to appear.']},
        abandonMail:{contactId:'cassian_erivan_snade',subjects:['YOU ABANDONED THE HAND-OFF','A FAILURE OF FOLLOW-THROUGH'],bodies:['You accepted a discreet commission and then abandoned it before the handoff. Even smugglers are entitled to expect the second half of a transaction.','The Romans built roads across continents. I asked you to follow one forest route. Your retreat lacks their sense of scale.']},
        personalFollowUp:{contactId:'cassian_erivan_snade',minRisk:3,chance:.22,encounterMinRisk:2,encounterChance:.52,subjects:['A SATISFYINGLY QUIET ENDING','RE: THE CABIN'],bodies:['A remote parcel, a quiet handoff and no unnecessary theatre. Restraint becomes you.'],encounterBodies:{customs_intercept:['Customs objected, naturally. Yet the parcel reached its destination and their objection did not. A neat little triumph.'],pirate_ambush:['Pirates before descent, trees afterwards, and still the handoff concluded. Odysseus had a longer journey, but substantially worse navigation.'],rogue_drones:['The machines objected to your passage. History records their objection poorly. The parcel, however, arrived.']}}
      },
      helix:{
        contactId:'navira_derris',cargoStyle:'case',
        titles:['Remote Sample Transfer','Forest Field Delivery','Isolated Site Supply'],
        cargo:['sealed research sample','environmental sensor package','field-analysis module','replacement monitoring equipment'],
        descriptions:['A remote field site requires {cargo}. Deliver it beyond the forest route. The local growth pattern is unusual, so keep the route telemetry.','Transport {cargo} to {destination}. The isolation is intentional. Do not contaminate the package. If the forest reacts to your passage, I want the data.'],
        completionSubjects:['FIELD DELIVERY CONFIRMED','REMOTE SAMPLE RECEIVED'],
        completionBodies:['The remote site confirms receipt of {cargo}. CR {credits} released. Standing: +{rep}.','Delivery telemetry is complete and the package is at {destination}. Payment: CR {credits}. Standing: +{rep}.'],
        encounterAcknowledgements:{pirate_ambush:['An unplanned pirate contact was resolved before descent. The delivery dataset remains complete.'],rogue_drones:['Rogue drone contact added an uncontrolled variable to the approach. It did not alter the delivery outcome.']},
        failureMail:{contactId:'navira_derris',subjects:['FIELD DELIVERY FAILED','REMOTE SITE DID NOT RECEIVE PACKAGE'],bodies:['The remote site did not receive {cargo}. The intended field work therefore cannot proceed.','The delivery condition was not met. The cabin receiving point remained empty at mission termination.']},
        abandonMail:{contactId:'navira_derris',subjects:['FIELD TRANSFER TERMINATED','PACKAGE LEFT UNDELIVERED'],bodies:['You terminated the transfer before {cargo} reached the receiving point. That outcome is not operationally useful.','The route ended before the experiment could begin. The package remains undelivered.']},
        personalFollowUp:{contactId:'navira_derris',minRisk:4,chance:.14,encounterMinRisk:2,encounterChance:.44,subjects:['RE: FIELD DELIVERY','USEFUL ROUTE DATA'],bodies:['The package arrived intact. The route telemetry contains a lateral growth response I was not expecting. Both are useful.'],encounterBodies:{pirate_ambush:['The pirate contact was not part of the planned dataset. Your completion of the delivery despite it is statistically reassuring.'],rogue_drones:['The rogue contact increased route variance without changing the outcome. Efficiently handled.']}}
      },
      quickbite:{
        contactId:'nyxo_malloc',cargoStyle:'case',
        titles:['Cabin Food Run','Forest Delivery','Remote Order'],
        cargo:['hot meal order','sealed takeaway crate','catering package','emergency rations order','franchise food supplies'],
        descriptions:['Dude, somebody ordered {cargo} to a cabin in the middle of a forest because apparently roads are old technology. Get it there.','Remote order at {destination}. Follow Forest Nav, survive the trees, put {cargo} on the table. Normal delivery shiz.','Dispatch has {cargo} for a forest cabin. Yes, really. No, I do not know why they live there.'],
        completionSubjects:['DUDE, FOOD DELIVERED','CABIN ORDER COMPLETE'],
        completionBodies:['Dude, cabin says they got {cargo}. CR {credits}. Standing: +{rep}. Nobody has complained about temperature yet, which is basically a miracle.','Order delivered to {destination}. CR {credits} released. Standing: +{rep}. Awesome.'],
        encounterAcknowledgements:{pirate_ambush:['Also, pirates tried to turn the food run into a combat zone before descent. Dispatch has somehow logged this as a delivery delay.'],rogue_drones:['Rogue drones showed up before descent. The food still got there, which apparently means everything is fine.']},
        failureMail:{contactId:'nyxo_malloc',subjects:['DUDE. THEY STILL WANT THEIR FOOD.','FOREST ORDER FAILED'],bodies:['Dude, the cabin did not get {cargo}. They live in a forest and somehow this is still our service-level failure. Awesome.','What the shiz, X? Route was marked. Table was there. Dispatch still says ORDER NOT DELIVERED in enormous letters.']},
        abandonMail:{contactId:'nyxo_malloc',subjects:['YOU ABANDONED A FOOD ORDER','DUDE. THE CABIN.'],bodies:['Dude, you accepted somebody\'s food and then bailed in the middle of the run. I now have to explain that to a person who lives far enough out to need a combat drone for takeaway.','You left the order undelivered. The customer is hungry, Dispatch is shouting, and some grint has opened a refund ticket. Great.']},
        personalFollowUp:{contactId:'nyxo_malloc',minRisk:2,chance:.22,encounterMinRisk:2,encounterChance:.56,subjects:['NICE RUN, DUDE','THAT FOREST ORDER'],bodies:['Dude, you threaded that forest and put the food straight on the table. That was actually awesome.'],encounterBodies:{pirate_ambush:['Dude. Pirates, atmospheric entry, forest obstacle course, hot food still delivered. I am putting that in the next argument I have with Customer Support.'],rogue_drones:['Rogue drones before descent and the order still arrived. Customer says nothing, which is the highest QuickBite rating available.']}}
      }
    },
    defaults:{destination:'remote forest cabin',cargo:'sealed delivery package'}
  };


  // Generic discretionary reward correspondence lives beside the mission templates
  // because it is faction/contact presentation, even when the reward itself is not
  // tied to one particular mission family. Campaign owns the reward mechanics; these
  // packs own the human voice used to present them.
  const rewardMail={
    trade:{
      contactId:'corvella_pallis',
      credits:{
        subjects:['A LITTLE EXTRA, SWEETIE','FOR ONCE, ACCOUNTS LISTENED'],
        bodies:[
          ['Sweetie, you have been making me look very good lately, so I bullied Accounts until they coughed up something extra.','CR {amount} is waiting on your VOX account. Buy that gorgeous drone something nice for me.'],
          ['Babe, I keep bragging about you and unfortunately you keep giving me evidence. I leaned on the numbers people until they surrendered.','There is an extra CR {amount} attached. Consider it encouragement.']
        ]
      },
      item:{
        subjects:['FOUND YOU SOMETHING, BABE','A LITTLE SOMETHING FROM STORES'],
        bodies:[
          ['Sweetie, Stores had a {item} and I immediately thought of you. Possibly because I spend too much time thinking about how to make that ridiculous drone even more dangerous.','It is waiting in your VOX workshop account. No invoice. Try not to fronking lose it.'],
          ['Babe, I called in a favour and got a {item} released to you.','Consider it a thank-you for making my life easier and my correspondence increasingly inappropriate.']
        ]
      },
      discount:{
        subjects:['SUPPLIER FAVOUR, SWEETIE','I GOT YOU A BETTER PRICE'],
        bodies:[
          ['Sweetie, one of my suppliers owes me a favour, so naturally I spent it on you.','You have {percent}% off one {item}. I expect the resulting upgrade to be suitably indecent.'],
          ['Babe, I got the price knocked down on a {item}.','Your next one is {percent}% off. Make that big brute prettier for me.']
        ]
      }
    },
    security:{
      contactId:'kudo_shang',
      credits:{
        subjects:['DISCRETIONARY PAYMENT AUTHORISED','PERFORMANCE PAYMENT'],
        bodies:[
          ['You keep finishing hard jobs. CR {amount} authorised.','Keep performing.'],
          ['Your recent operations were decisive enough to justify additional funding.','CR {amount} has been released to your VOX account.']
        ]
      },
      item:{
        subjects:['EQUIPMENT ISSUE AUTHORISED','DIRECTORATE STORES RELEASE'],
        bodies:[
          ['You have earned better hardware. {item} authorised.','Use it. Finish the next job faster.'],
          ['Directorate Stores released one {item}. Strong operators get strong equipment.','No reimbursement action is required.']
        ]
      },
      discount:{
        subjects:['PROCUREMENT RATE AUTHORISED','SUPPLIER CONCESSION'],
        bodies:[
          ['You have earned preferred access to one {item}.','The reduction is {percent}%. Use it to increase combat readiness.'],
          ['A supplier concession has been attached to your account.','One {item}: {percent}% reduction.']
        ]
      }
    },
    jackals:{
      contactId:'cassian_erivan_snade',
      credits:{
        subjects:['A MODEST TOKEN','PECUNIA NON OLET'],
        bodies:[
          ['Competence is so frequently its own punishment that I occasionally prefer to reward it instead.','I have arranged an additional CR {amount}. Try not to spend it with anyone tedious.'],
          ['Pecunia non olet, as Vespasian observed: money does not stink. A useful principle when one is being paid.','CR {amount} awaits you. A modest token of my continued satisfaction.']
        ]
      },
      item:{
        subjects:['A SMALL MATERIAL COURTESY','SOMETHING USEFUL'],
        bodies:[
          ['Words are charming, X, but hardware has the advantage of stopping bullets. I have therefore arranged something more tangible.','One {item} has been released to your workshop account, with my compliments.'],
          ['Consider this the modern equivalent of a patron placing a serviceable sword in the hands of a promising retainer.','The sword, regrettably, is a {item}. Progress has its indignities.']
        ]
      },
      discount:{
        subjects:['A FAVOUR IN THE MARKET','COMMERCE REWARDS THE WELL-CONNECTED'],
        bodies:[
          ['Even commerce occasionally rewards merit, particularly when one knows whom to telephone.','I have secured {percent}% off one {item} for you.'],
          ['A supplier of my acquaintance has been persuaded to view you with unusual generosity.','One {item}, reduced by {percent}%. Do try to look appropriately grateful.']
        ]
      }
    },
    helix:{
      contactId:'navira_derris',
      credits:{
        subjects:['PERFORMANCE ADJUSTMENT','DISCRETIONARY CREDIT ALLOCATION'],
        bodies:[
          ['Your recent field work produced unusually clean data under conditions that should have produced noise.','I requested CR {amount} so I can keep putting you near interesting problems. It was approved.'],
          ['Your recent telemetry contains several results I was not expecting. That is useful.','Finance accepted that as justification for an additional CR {amount}.']
        ]
      },
      item:{
        subjects:['EQUIPMENT RELEASE','FIELD HARDWARE ALLOCATION'],
        bodies:[
          ['I requested a {item} be allocated to you. Your recent telemetry suggests you are statistically more likely to make useful use of it than the current stores pool.','It has been transferred to your VOX workshop account.'],
          ['A {item} has been released from Helix field stock. Your telemetry suggests you will produce more interesting results with it.','This is not generosity. Better-equipped operators let me ask harder questions.']
        ]
      },
      discount:{
        subjects:['ACQUISITION COST REDUCTION','SUPPLIER CONCESSION'],
        bodies:[
          ['I asked Procurement to reduce the acquisition cost of one {item}. They eventually agreed that administrative resistance was not a scientifically useful variable.','The concession is {percent}%.'],
          ['Your current performance data justified preferential supplier terms.','One {item} can be purchased at {percent}% below standard market price.']
        ]
      }
    },
    quickbite:{
      contactId:'nyxo_malloc',
      credits:{
        subjects:['BONUS, DUDE','HOLY SHIZ, THEY PAID EXTRA'],
        bodies:[
          ['Dude, Corporate approved an actual bonus without seventeen pages of shit. I think somebody in Finance is ill.','CR {amount}. Take it before they notice.'],
          ['Holy shiz, X. Extra money. Real money. From QuickBite. On purpose.','CR {amount} is attached. Move fast before somebody calls it a payroll anomaly.']
        ]
      },
      item:{
        subjects:['FREE GEAR. SOMEHOW.','DUDE, STORES COUGHED UP HARDWARE'],
        bodies:[
          ['Dude, Stores actually released a {item}. No invoice, no deposit, none of that shit.','It is in your VOX workshop account. I genuinely have no idea how I pulled that off.'],
          ['So apparently if you swear at the Stores queue long enough, eventually a {item} falls out. Useful information.','It is yours. Try not to explode it immediately, dude.']
        ]
      },
      discount:{
        subjects:['I FOUND A DISCOUNT CODE','CHEAPER GEAR, DUDE'],
        bodies:[
          ['Dude, I found a supplier code that still works. Procurement forgot to kill it or nobody knows what day it is. Both work for me.','You get {percent}% off one {item}. Use the freaking thing before they wake up.'],
          ['Some grint in Procurement owed Dispatch a favour, so congratulations: your next {item} is {percent}% cheaper.','This is probably the most useful thing QuickBite has emailed anyone all week.']
        ]
      }
    }
  };

  const boardRules={
    // The board is generated from eligible templates rather than fixed slots.
    // Keep at least one straightforward delivery and one straightforward combat
    // contract visible whenever both categories are available. Individual
    // templates control their own frequency and per-board duplication cap.
    requiredCategories:['delivery','combat'],
    defaultWeight:1,
    defaultMaxPerTemplate:2
  };

  globalThis.AgentXMissionData={
    schemaVersion:2,
    boardRules,
    templates:{asteroid_delivery:asteroidDelivery,station_delivery:stationDelivery,penthouse_delivery:penthouseDelivery,forest_cabin_delivery:forestCabinDelivery,secure_terminal_intrusion:secureTerminalIntrusion,asteroids:asteroidClearance,fighters:fighterDestroy,combat_recovery:combatRecovery,deep_core:deepCore},
    rewardMail
  };
})();
