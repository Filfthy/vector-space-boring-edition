'use strict';

// Static campaign content only: factions, contacts, equipment, frames and perk trees.
// CampaignController owns persistence, rules and UI behaviour; it no longer owns these authored tables.
globalThis.AgentXCampaignContent={
  apply(target){
    target.factions={
      trade:{id:'trade',name:'Free Traders Compact',rep:0,description:'Independent freight houses, hauliers and station merchants.',relations:{security:25,jackals:-80,helix:35}},
      security:{id:'security',name:'Orbital Security Directorate',rep:0,description:'System defence, patrol and infrastructure security authority.',relations:{trade:35,jackals:-90,helix:15}},
      jackals:{id:'jackals',name:'Red Jackal Combine',rep:0,description:'Smugglers, raiders and deniable operators outside conventional law.',relations:{trade:-75,security:-95,helix:-10}},
      helix:{id:'helix',name:'Helix Industrial Group',rep:0,description:'Engineering combine operating mines, shipyards and research facilities.',relations:{trade:30,security:10,jackals:-15}},
      quickbite:{id:'quickbite',name:'QuickBite Orbital',rep:0,description:'Low-margin orbital food courier platform serving stations, ships and remote industrial sites.',relations:{trade:20,helix:35,jackals:-5}}
    };
    // Each organisation has one principal named human contact. Routine contract
    // administration is deliberately faceless; these people appear only when a
    // result warrants personal involvement. Keep the shared future slang sparse:
    // fronk/fronking/fronked, drass, skell, grint, clast/clasting, nerk.
    target.mailContacts={
      corvella_pallis:{id:'corvella_pallis',faction:'trade',name:'Corvella Pallis',role:'Route Coordinator',tone:'flirty'},
      kudo_shang:{id:'kudo_shang',faction:'security',name:'Kudo Shang',role:'Operations Control',tone:'hardline'},
      cassian_erivan_snade:{id:'cassian_erivan_snade',faction:'jackals',name:'Cassian Erivan-Snade',role:'Private Contracts',tone:'indirect'},
      navira_derris:{id:'navira_derris',faction:'helix',name:'Navira Derris',role:'Research Liaison',tone:'curious'},
      nyxo_malloc:{id:'nyxo_malloc',faction:'quickbite',name:'Nyxo Malloc',role:'Dispatch',tone:'slacker'}
    };
    target.contactIdsByFaction={};
    for(const c of Object.values(target.mailContacts))(target.contactIdsByFaction[c.faction]??=[]).push(c.id);
    target.missions=[];
    const tierInfo={
      1:{roman:'I',colour:'White'},2:{roman:'II',colour:'Green'},3:{roman:'III',colour:'Blue'},4:{roman:'IV',colour:'Purple'},5:{roman:'V',colour:'Orange'}
    };
    const gear=(id,name,price,slot,tier,note,extra={})=>({id,name,price,slot,tier,kind:`${slot==='consumable'?'Consumable':'Internal'} · Tier ${tierInfo[tier].roman} · ${tierInfo[tier].colour}`,note,...extra});
    target.items={
      // WHITE — cheap starter hardware. The player should replace this quickly.
      shieldBooster:gear('shieldBooster','Shield Boost',400,'consumable',1,'Single-use emergency field capacitor. Restores 2 shields instantly.',{hud:'BOOST',icon:'shieldBooster',effect:'shieldBoost',restore:2}),
      homingMissile:gear('homingMissile','Homing Missile',600,'consumable',1,'Single-use guided missile. Secondary fire launches it at the currently targeted fighter.',{hud:'MISSILE',icon:'homingMissile',effect:'homingMissile',missileDamage:6,missileSpeed:72}),
      shieldExtender:gear('shieldExtender','Shield Extender',1200,'internal',1,'Adds 1 maximum shield while installed.',{hud:'EXTENDER',icon:'shieldExtender',shieldBonus:1}),
      shieldRecharger:gear('shieldRecharger','Shield Recharger',1500,'internal',1,'Rebuilds damaged shields 25% faster once regeneration begins.',{hud:'RECHARGE',icon:'shieldRecharger',regenMult:.75}),
      laserCooler:gear('laserCooler','Laser Cooler',1300,'internal',1,'Allows 2 extra laser pulses in each uninterrupted trigger burst.',{hud:'COOLER',icon:'laserCooler',burstBonus:2}),

      // GREEN — first proper kit.
      shieldBooster2:gear('shieldBooster2','Shield Boost Mk II',1600,'consumable',2,'Improved emergency capacitor. Restores 3 shields.',{hud:'BOOST II',icon:'shieldBooster',effect:'shieldBoost',restore:3}),
      homingMissile2:gear('homingMissile2','Homing Missile Mk II',2400,'consumable',2,'Faster guided missile with a heavier warhead.',{hud:'MISSILE II',icon:'homingMissile',effect:'homingMissile',missileDamage:9,missileSpeed:76}),
      shieldExtender2:gear('shieldExtender2','Shield Extender Mk II',4800,'internal',2,'Adds 2 maximum shields while installed.',{hud:'EXTENDER II',icon:'shieldExtender',shieldBonus:2}),
      shieldRecharger2:gear('shieldRecharger2','Shield Recharger Mk II',6000,'internal',2,'Higher-rate shield reconstruction hardware.',{hud:'RECHARGE II',icon:'shieldRecharger',regenMult:.62}),
      laserCooler2:gear('laserCooler2','Laser Cooler Mk II',5200,'internal',2,'Adds 3 pulses to each uninterrupted laser burst.',{hud:'COOLER II',icon:'laserCooler',burstBonus:3}),
      targetingComputer2:gear('targetingComputer2','Targeting Computer',5600,'internal',2,'Improves marginal fighter and projectile hit tolerance without moving the reticle.',{hud:'TARGET',icon:'targetingComputer',aimMult:1.05}),
      flightStabilizer2:gear('flightStabilizer2','Flight Stabiliser',5200,'internal',2,'Tightens the drone response to commanded turns.',{hud:'STABILISER',icon:'flightStabilizer',steeringMult:1.05}),

      // BLUE — expensive enough that the first purchase should feel important.
      shieldBooster3:gear('shieldBooster3','Shield Boost Mk III',6400,'consumable',3,'High-density emergency capacitor. Restores 4 shields.',{hud:'BOOST III',icon:'shieldBooster',effect:'shieldBoost',restore:4}),
      homingMissile3:gear('homingMissile3','Homing Missile Mk III',9600,'consumable',3,'High-speed seeker with a serious anti-fighter warhead.',{hud:'MISSILE III',icon:'homingMissile',effect:'homingMissile',missileDamage:13,missileSpeed:82}),
      shieldExtender3:gear('shieldExtender3','Shield Extender Mk III',19200,'internal',3,'Adds 3 maximum shields while installed.',{hud:'EXTENDER III',icon:'shieldExtender',shieldBonus:3}),
      shieldRecharger3:gear('shieldRecharger3','Shield Recharger Mk III',24000,'internal',3,'Cuts shield reconstruction time roughly in half.',{hud:'RECHARGE III',icon:'shieldRecharger',regenMult:.50}),
      laserCooler3:gear('laserCooler3','Laser Cooler Mk III',20800,'internal',3,'Adds 4 pulses to each uninterrupted laser burst.',{hud:'COOLER III',icon:'laserCooler',burstBonus:4}),
      targetingComputer3:gear('targetingComputer3','Targeting Computer Mk II',22400,'internal',3,'Substantially improves the useful sight picture against crossing targets.',{hud:'TARGET II',icon:'targetingComputer',aimMult:1.09}),
      flightStabilizer3:gear('flightStabilizer3','Flight Stabiliser Mk II',20800,'internal',3,'Noticeably sharper control-loop response.',{hud:'STABILISER II',icon:'flightStabilizer',steeringMult:1.08}),

      // PURPLE — specialist/high-end hardware.
      shieldBooster4:gear('shieldBooster4','Shield Boost Mk IV',25600,'consumable',4,'Military-grade emergency capacitor. Restores 5 shields.',{hud:'BOOST IV',icon:'shieldBooster',effect:'shieldBoost',restore:5}),
      homingMissile4:gear('homingMissile4','Homing Missile Mk IV',38400,'consumable',4,'Fast, hard-hitting seeker intended for heavy fighters.',{hud:'MISSILE IV',icon:'homingMissile',effect:'homingMissile',missileDamage:18,missileSpeed:88}),
      shieldExtender4:gear('shieldExtender4','Shield Extender Mk IV',76800,'internal',4,'Adds 4 maximum shields while installed.',{hud:'EXTENDER IV',icon:'shieldExtender',shieldBonus:4}),
      shieldRecharger4:gear('shieldRecharger4','Shield Recharger Mk IV',96000,'internal',4,'Aggressive field reconstruction for short combat lulls.',{hud:'RECHARGE IV',icon:'shieldRecharger',regenMult:.40}),
      laserCooler4:gear('laserCooler4','Laser Cooler Mk IV',83200,'internal',4,'Adds 5 pulses to each uninterrupted laser burst.',{hud:'COOLER IV',icon:'laserCooler',burstBonus:5}),
      targetingComputer4:gear('targetingComputer4','Targeting Computer Mk III',89600,'internal',4,'Premium prediction hardware for difficult crossing shots.',{hud:'TARGET III',icon:'targetingComputer',aimMult:1.13}),
      flightStabilizer4:gear('flightStabilizer4','Flight Stabiliser Mk III',83200,'internal',4,'High-end response shaping for violent pursuit corrections.',{hud:'STABILISER III',icon:'flightStabilizer',steeringMult:1.11}),

      // ORANGE — endgame/exotic hardware. Deliberately expensive even when access arrives early.
      shieldBooster5:gear('shieldBooster5','Shield Boost Mk V',102400,'consumable',5,'Exotic field dump. Restores 6 shields in one use.',{hud:'BOOST V',icon:'shieldBooster',effect:'shieldBoost',restore:6}),
      homingMissile5:gear('homingMissile5','Homing Missile Mk V',153600,'consumable',5,'Top-grade seeker with an extreme anti-fighter warhead.',{hud:'MISSILE V',icon:'homingMissile',effect:'homingMissile',missileDamage:25,missileSpeed:96}),
      shieldExtender5:gear('shieldExtender5','Shield Extender Mk V',307200,'internal',5,'Adds 5 maximum shields while installed.',{hud:'EXTENDER V',icon:'shieldExtender',shieldBonus:5}),
      shieldRecharger5:gear('shieldRecharger5','Shield Recharger Mk V',384000,'internal',5,'Exotic reconstruction grid for very rapid shield recovery.',{hud:'RECHARGE V',icon:'shieldRecharger',regenMult:.32}),
      laserCooler5:gear('laserCooler5','Laser Cooler Mk V',332800,'internal',5,'Adds 7 pulses to each uninterrupted laser burst.',{hud:'COOLER V',icon:'laserCooler',burstBonus:7}),
      targetingComputer5:gear('targetingComputer5','Targeting Computer Mk IV',358400,'internal',5,'Endgame fire-control prediction hardware.',{hud:'TARGET IV',icon:'targetingComputer',aimMult:1.18}),
      flightStabilizer5:gear('flightStabilizer5','Flight Stabiliser Mk IV',332800,'internal',5,'Endgame control-loop hardware for the sharpest response.',{hud:'STABILISER IV',icon:'flightStabilizer',steeringMult:1.15})
    };
    target.shop=Object.values(target.items);

    // Frames are choices, not a single linear ladder. Slot layout is the main identity;
    // built-in bonuses are intentionally modest so fitted equipment still matters.
    target.frames={
      'AX-1':{id:'AX-1',name:'AX-1 Standard',tier:1,price:3500,shields:6,consumables:1,internals:1,note:'Disposable starter combat frame. Replacement is always free.',bonusText:'No built-in bonus.'},
      'AX-2I':{id:'AX-2I',name:'AX-2I Integrator',tier:2,price:18000,shields:7,consumables:1,internals:2,regenMult:.95,note:'Green-tier systems frame with room for two passive internals.',bonusText:'Shield rebuild 5% faster.'},
      'AX-2R':{id:'AX-2R',name:'AX-2R Runner',tier:2,price:17000,shields:6,consumables:2,internals:1,steeringMult:1.05,note:'Green-tier attack frame with a second consumable hardpoint.',bonusText:'Steering response +5%.'},
      'OSD-2S':{id:'OSD-2S',name:'OSD-2 Sentinel',tier:2,price:22000,shields:8,consumables:1,internals:2,enemyHitMult:.96,faction:'security',repReq:25,note:'Orbital Security derivative built around survivability.',bonusText:'Enemy hit intent -4%.',factionName:'Orbital Security Directorate'},

      'AX-3B':{id:'AX-3B',name:'AX-3B Bastion',tier:3,price:72000,shields:9,consumables:1,internals:3,regenMult:.95,note:'Blue-tier defensive chassis with extensive internal capacity.',bonusText:'Shield rebuild 5% faster.'},
      'AX-3S':{id:'AX-3S',name:'AX-3S Striker',tier:3,price:68000,shields:8,consumables:2,internals:2,burstBonus:1,note:'Blue-tier balanced combat frame with two active stores.',bonusText:'+1 laser pulse per burst.'},
      'HIG-3V':{id:'HIG-3V',name:'HIG-3 Vector',tier:3,price:84000,shields:8,consumables:1,internals:3,regenMult:.85,faction:'helix',repReq:35,note:'Helix Industrial engineering derivative with an unusually efficient field bus.',bonusText:'Shield rebuild 15% faster.',factionName:'Helix Industrial Group'},

      'AX-4W':{id:'AX-4W',name:'AX-4W Warden',tier:4,price:288000,shields:10,consumables:2,internals:3,enemyHitMult:.94,note:'Purple-tier defensive frame designed to survive sustained hostile attention.',bonusText:'Enemy hit intent -6%.'},
      'AX-4L':{id:'AX-4L',name:'AX-4L Lancer',tier:4,price:272000,shields:9,consumables:3,internals:2,fireIntervalMult:.95,note:'Purple-tier assault frame favouring active stores and sustained firing.',bonusText:'Laser firing cycle 5% faster.'},
      'RJC-4M':{id:'RJC-4M',name:'RJC-4 Marauder',tier:4,price:320000,shields:8,consumables:3,internals:2,burstBonus:2,steeringMult:1.05,faction:'jackals',repReq:45,note:'Red Jackal hot-rod frame: lightly protected, heavily biased toward attack.',bonusText:'+2 laser pulses. Steering +5%.',factionName:'Red Jackal Combine'},

      'AX-5A':{id:'AX-5A',name:'AX-5A Apex',tier:5,price:1080000,shields:11,consumables:3,internals:3,aimMult:1.05,steeringMult:1.05,note:'Orange-tier balanced endgame frame with no obvious weak system.',bonusText:'Aim tolerance +5%. Steering +5%.'},
      'AX-5C':{id:'AX-5C',name:'AX-5C Citadel',tier:5,price:1160000,shields:12,consumables:2,internals:4,regenMult:.88,note:'Orange-tier systems fortress with four internal bays.',bonusText:'Shield rebuild 12% faster.'},
      'FTC-5N':{id:'FTC-5N',name:'FTC-5 Nomad',tier:5,price:1280000,shields:10,consumables:3,internals:3,steeringMult:1.08,faction:'trade',repReq:60,note:'Free Traders premium long-range combat courier derivative.',bonusText:'Steering response +8%.',factionName:'Free Traders Compact'}
    };
    target.marketTierView='accessible';
    target.marketKindView='all';
    target.selectedMissionId=null;
    target.selectedMarketProductId=null;
    target.perkTrees={
      unified:{
        name:'Agent X Skill Tree',tag:'OPERATOR DEVELOPMENT',
        note:'One career tree. Branch where you want, but deeper rows require some total investment across the whole tree.',
        nodes:[
          {id:'coreRoot',name:'Agent X',short:'Independent operator',icon:'agent',x:600,y:55,root:true,branch:'core',desc:'The shared foundation for every Agent X specialisation.'},

          // MERCANTILE — money, cover, reputation and access.
          {id:'negotiator',name:'Negotiator',short:'Improve contract terms',icon:'handshake',x:150,y:165,branch:'mercantile',req:['coreRoot'],live:true,desc:'Better negotiation turns the same work into a more favourable contract.',effect:'+5% contract credit offers.'},
          {id:'insurance',name:'Insurance Broker',short:'Lower equipment excess',icon:'insurance',x:95,y:285,branch:'mercantile',req:['negotiator'],minSpent:2,live:true,desc:'Negotiate a better equipment policy before risking more valuable fittings.',effect:'Permanent-equipment excess falls from 30% to 22%.'},
          {id:'knownQuantity',name:'Known Quantity',short:'Faster reputation gain',icon:'rep',x:205,y:285,branch:'mercantile',req:['negotiator'],minSpent:2,live:true,desc:'Successful work carries more weight because employers already know the Agent X name.',effect:'+25% positive reputation gains.'},
          {id:'lowExcess',name:'Lower Excess',short:'Pay less after a loss',icon:'down',x:55,y:410,branch:'mercantile',req:['insurance'],minSpent:4,live:true,desc:'A stronger policy cuts the recovery cost on destroyed permanent equipment.',effect:'Permanent-equipment excess falls to 15%.'},
          {id:'rewardBonus',name:'Mission Reward Bonus',short:'Higher credit payouts',icon:'credits',x:150,y:410,branch:'mercantile',req:['negotiator'],minSpent:4,live:true,desc:'Raises the credit reward offered for completed contracts.',effect:'Additional +10% contract credit offers.'},
          {id:'brokerNetwork',name:'Broker Network',short:'More contract opportunities',icon:'network',x:245,y:410,branch:'mercantile',req:['knownQuantity'],minSpent:4,live:true,desc:'A wider contact network increases the range of contracts and employers that reach the board.',effect:'Mission board expands from 6 to 7 contracts.'},
          {id:'fullCover',name:'Comprehensive Cover',short:'Minimal equipment excess',icon:'cover',x:55,y:535,branch:'mercantile',req:['lowExcess'],minSpent:7,live:true,desc:'Top-grade cover keeps even expensive fitted hardware affordable to recover after a loss.',effect:'Permanent-equipment excess falls to 10%.'},
          {id:'premiumTerms',name:'Premium Terms',short:'Bigger bonus on hard jobs',icon:'starCoin',x:150,y:535,branch:'mercantile',req:['rewardBonus'],minSpent:7,live:true,desc:'High-risk employers pay a stronger premium when they specifically need a proven agent.',effect:'Additional +15% pay on Risk 5+ contracts.'},
          {id:'priorityAccess',name:'Priority Access',short:'See premium hardware sooner',icon:'priority',x:245,y:535,branch:'mercantile',req:['brokerNetwork'],minSpent:7,live:true,desc:'Faction favour and broker contacts surface higher-tier hardware earlier than normal progression.',effect:'Adds one extra tier of market access, still capped at two tiers ahead of normal level access.'},

          // ENGINEERING — shields, repair and fitting capacity.
          {id:'shieldService',name:'Shield Service',short:'Better shield support',icon:'shield',x:450,y:165,branch:'engineering',req:['coreRoot'],live:true,desc:'Rebalance the field generators and reinforce the stock shield package.',effect:'+1 maximum shield.'},
          {id:'autoRepair',name:'Regenerative Grid',short:'Faster shield regeneration',icon:'repair',x:395,y:285,branch:'engineering',req:['shieldService'],minSpent:2,live:true,desc:'Upgrade the stock self-repair field so damaged shields rebuild much faster once incoming fire stops.',effect:'Cuts shield rebuild time from 10 seconds to 5 seconds per shield.'},
          {id:'systemsBus',name:'Systems Bus',short:'Expand fitting capacity',icon:'bus',x:505,y:285,branch:'engineering',req:['shieldService'],minSpent:2,live:true,desc:'A more capable integration bus opens room for additional active equipment.',effect:'Unlocks the consumable-rack expansion branch.'},
          {id:'rapidRepair',name:'Rapid Regeneration',short:'Faster shield recovery',icon:'repairFast',x:395,y:410,branch:'engineering',req:['autoRepair'],minSpent:4,live:true,desc:'Higher-rate field reconstruction restores shields more quickly once regeneration has started.',effect:'Rebuild time reduced from 5 seconds to 3 seconds per shield.'},
          {id:'extraRack',name:'Extra Consumable Rack',short:'+1 consumable slot',icon:'rack',x:505,y:410,branch:'engineering',req:['systemsBus'],minSpent:4,live:true,desc:'Adds a protected service rack beyond the active frame’s normal consumable capacity.',effect:'+1 consumable slot, up to the four-slot interface limit.'},
          {id:'auxRack',name:'Auxiliary Consumable Rack',short:'+1 consumable slot',icon:'rack',x:450,y:535,branch:'engineering',req:['extraRack'],minSpent:7,live:true,desc:'Adds a second auxiliary rack beyond the active frame’s normal consumable capacity.',effect:'A second +1 consumable slot, still capped at four total.'},
          {id:'advancedFit',name:'Advanced Equipment Fit',short:'Fit specialist hardware',icon:'plug',x:540,y:535,branch:'engineering',req:['extraRack'],minSpent:7,future:true,desc:'Upgraded power, cooling and data interfaces support specialist high-tier equipment.'},

          // PILOTING — the drone still flies the same way, but reacts a little more crisply.
          {id:'pilotControl',name:'Control Familiarity',short:'Sharper response',icon:'joystick',x:750,y:165,branch:'piloting',req:['coreRoot'],live:true,desc:'Better anticipation of the drone control loop makes commanded turns settle a little faster.',effect:'+4% steering response.'},
          {id:'pilotResponse',name:'Fast Hands',short:'Faster control response',icon:'turn',x:695,y:285,branch:'piloting',req:['pilotControl'],minSpent:2,live:true,desc:'Quicker correction and counter-steer improve how rapidly the drone follows the tether command.',effect:'Total steering response bonus becomes +8%.'},
          {id:'pilotThreat',name:'Threat Reading',short:'Harder to predict',icon:'threat',x:805,y:285,branch:'piloting',req:['pilotControl'],minSpent:2,live:true,desc:'Read hostile attack geometry earlier and spoil more firing solutions before the shot is committed.',effect:'Enemy hit-intent chance reduced by 8%.'},
          {id:'pilotFineControl',name:'Fine Control',short:'Crisper pursuit handling',icon:'turn',x:695,y:410,branch:'piloting',req:['pilotResponse'],minSpent:4,live:true,desc:'More precise control inputs make the flight computer settle commanded turns faster without moving the reticle for you.',effect:'Total steering response bonus becomes +12%.'},
          {id:'pilotEvasion',name:'Evasive Reading',short:'Spoil more hostile shots',icon:'threat',x:805,y:410,branch:'piloting',req:['pilotThreat'],minSpent:4,live:true,desc:'Recognise dangerous attack lines sooner and make the drone a less predictable target.',effect:'Enemy hit-intent chance reduced by 15%.'},
          {id:'pilotAce',name:'Veteran Pilot',short:'Peak control discipline',icon:'ace',x:750,y:535,branch:'piloting',req:['pilotFineControl','pilotEvasion'],minSpent:7,live:true,desc:'Combine fast control response with experienced threat anticipation.',effect:'Steering response +15%. Enemy hit-intent chance reduced by 20%.'},

          // COMBAT — modest weapon handling gains; enemy health remains meaningful.
          {id:'combatFireControl',name:'Fire Control',short:'More forgiving sight picture',icon:'crosshair',x:1050,y:165,branch:'combat',req:['coreRoot'],live:true,desc:'Better ranging and trigger timing make marginal shots count without auto-aiming the reticle.',effect:'+6% weapon hit tolerance against fighters and hostile bolts.'},
          {id:'combatCycle',name:'Trigger Discipline',short:'Cycle pulses faster',icon:'cycle',x:995,y:285,branch:'combat',req:['combatFireControl'],minSpent:2,live:true,desc:'Cleaner trigger timing reduces dead time between pulses.',effect:'8% faster laser firing cycle.'},
          {id:'combatBurst',name:'Burst Capacitor',short:'One extra pulse',icon:'burst',x:1105,y:285,branch:'combat',req:['combatFireControl'],minSpent:2,live:true,desc:'A modest capacitor upgrade lets each trigger sequence carry one more pulse.',effect:'+1 shot per trigger burst.'},
          {id:'combatTracking',name:'Tracking Solution',short:'Better marginal hits',icon:'crosshair',x:995,y:410,branch:'combat',req:['combatCycle'],minSpent:4,live:true,desc:'Improved ranging prediction helps the guns connect with crossing targets.',effect:'Total weapon hit tolerance becomes +12%.'},
          {id:'longBurst',name:'Long Burst',short:'Another pulse per burst',icon:'burst',x:1105,y:410,branch:'combat',req:['combatBurst'],minSpent:4,live:true,desc:'Improved capacitors and thermal handling allow a longer firing burst before the system cycles.',effect:'A second extra pulse per trigger burst.'},
          {id:'combatVeteran',name:'Veteran Gunner',short:'Peak weapon handling',icon:'ace',x:1050,y:535,branch:'combat',req:['combatTracking','longBurst'],minSpent:7,live:true,desc:'Experience ties together tracking and trigger rhythm without simply multiplying weapon damage.',effect:'Weapon hit tolerance +14%. Laser firing cycle 15% faster.'}
        ]
      }
    };
  }
};
