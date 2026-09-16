'use strict';

// REUSABLE ENVIRONMENT RECIPES
// Missions choose an environment and supply only objective/story overrides.
// Controllers own movement/rendering/physics; these presets own the authored
// character of a place (terrain/scenery/population defaults), not mission story.
const environmentClone=value=>JSON.parse(JSON.stringify(value));

globalThis.AgentXEnvironments={
  definitions:{
    fortified_plains:{
      id:'fortified_plains',family:'surface',terrain:'plains',destination:'bunker',treeClumps:0,
      defaultShipY:-1.55,tunnelStartOffset:.65
    },
    rocky_osd_plains:{
      id:'rocky_osd_plains',family:'surface',terrain:'plains',destination:'osd',scenery:'rocks'
    },
    swamp_approach:{
      id:'swamp_approach',family:'surface',terrain:'plains',destination:'swamp',scenery:'swamp',
      routeLength:365,treeClumps:10,entryRadius:26
    },
    forest_corridor:{
      id:'forest_corridor',family:'corridor',controllerVariant:'forest',length:650,speed:20.5,
      floorY:-3.5,hostileFlora:false
    },
    alien_swamp:{
      id:'alien_swamp',family:'corridor',controllerVariant:'alien_swamp',length:620,speed:26.04,
      floorY:-3.62,halfWidthBonus:1.10,pathHalfWidthBonus:1.20,hostileFlora:true,
      scene:{gridColor:'c',routeLabel:'ALIEN SWAMP',visibleFar:104,gridSpan:32},
      course:{
        step:5.2,extraLength:70,
        accentIds:['alienBulbPlantConnected','alienUmbrellaPlantConnected','alienEggPodFat','alienEggClusterFat'],
        spitterIds:['swampSpitterFlower'],
        reedIds:['swampReedTall','swampReedFan','swampReedWide','swampReedSpike'],
        supplementalChance:.42,
        shooterEvery:7,pairedShooterEvery:14,pairedShooterChance:.32,
        accentEvery:3,accentChance:.20,clearingAccentChance:.32,
        mouthStart:-34,mouthEnd:10,mouthStep:6,mouthOuterHalf:13
      }
    }
  },
  get(id){const value=this.definitions[id];return value?environmentClone(value):null},
  stage(id,overrides={}){return {...environmentClone(overrides),environment:id}},
  resolve(stage={}){
    const id=stage?.environment,base=id?this.get(id):null;
    return base?{...base,...environmentClone(stage),environment:id}:environmentClone(stage)
  }
};
