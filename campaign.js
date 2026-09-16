'use strict';
class CampaignController {
  constructor(){
    this.storageKey='agentXCampaignV1';
    this.currentMission=null;
    this.open=false;
    this.returnPauseState=false;
    globalThis.AgentXCampaignContent.apply(this);
    this.state=this.load();
    this.state.inventory={...this.emptyInventory(),...(this.state.inventory||{})};
    this.state.ownedFrames=Array.isArray(this.state.ownedFrames)?this.state.ownedFrames.filter(id=>this.frames[id]):['AX-1'];
    if(!this.state.ownedFrames.includes('AX-1'))this.state.ownedFrames.unshift('AX-1');
    if(!this.frames[this.state.drone])this.state.drone='AX-1';
    if(!this.state.ownedFrames.includes(this.state.drone))this.state.ownedFrames.push(this.state.drone);
    this.state.loadout=Array.isArray(this.state.loadout)?this.state.loadout.slice(0,4):[null,null,null,null];
    while(this.state.loadout.length<4)this.state.loadout.push(null);
    this.state.internalLoadout=Array.isArray(this.state.internalLoadout)?this.state.internalLoadout.slice(0,4):[null,null,null,null];
    while(this.state.internalLoadout.length<4)this.state.internalLoadout.push(null);
    this.state.frameLoadouts=(this.state.frameLoadouts&&typeof this.state.frameLoadouts==='object')?this.state.frameLoadouts:{};
    this.state.mail=Array.isArray(this.state.mail)?this.state.mail:[];
    this.state.mail=this.state.mail.map(m=>({...m,priority:this.mailPriority(m)}));
    this.state.mailFlags=(this.state.mailFlags&&typeof this.state.mailFlags==='object')?this.state.mailFlags:{};
    this.state.discounts=(this.state.discounts&&typeof this.state.discounts==='object')?this.state.discounts:{};
    this.state.mailSeq=Math.max(0,Number(this.state.mailSeq)||0);
    this.selectedMailId=null;
    this.mailFilter='all';
    this.pendingMailVoicePriority=null;
    this.deferHubVoiceNotifications=false;
    this.pendingSkillPointVoice=false;
    this.pendingMission=null;
    this.activeLoadout=[null,null,null,null];
    this.activeInternalLoadout=[null,null,null,null];
    for(const f of Object.values(this.factions))f.rep=this.state.reputation[f.id]??0;
    this.currentStageIndex=0;
    this.normalizeLoadout();
    if(!this.state.frameLoadouts[this.state.drone])this.rememberCurrentFrameLoadout();
    this.ensureContractBoard();
    this.ensureWelcomeMail();
    this.evaluateMailTriggers();
  }
  emptyInventory(){return Object.fromEntries(Object.keys(this.items||{}).map(id=>[id,0]))}
  defaultState(){
    return {money:12000,xp:0,drone:'AX-1',ownedFrames:['AX-1'],reputation:{trade:0,security:0,jackals:0,helix:0,quickbite:0},completed:0,failed:0,skills:[],inventory:this.emptyInventory(),loadout:[null,null,null,null],internalLoadout:[null,null,null,null],frameLoadouts:{},boardGeneration:0,contractBoard:null,mail:[],mailSeq:0,mailFlags:{introShown:false},discounts:{},trainingInsuranceBenefit:false};
  }
  tierInfo(tier){return ({1:{name:'White',roman:'I'},2:{name:'Green',roman:'II'},3:{name:'Blue',roman:'III'},4:{name:'Purple',roman:'IV'},5:{name:'Orange',roman:'V'}})[clamp(Number(tier)||1,1,5)]}
  tierClass(tier){return `tier${this.tierInfo(tier).name}`}
  xpThresholds(){return [0,600,1500,2800,4500,6500,9000,12000,15500,19500,24000,29000,34500,40500,47000,54000,61500,69500,78000,87000]}
  xpForLevel(level){const a=this.xpThresholds(),n=clamp(Math.round(Number(level)||1),1,a.length);return a[n-1]}
  normalMarketTier(level=this.levelForXP()){
    if(level>=14)return 5;if(level>=9)return 4;if(level>=5)return 3;if(level>=2)return 2;return 1
  }
  bestReputation(){return Math.max(...Object.values(this.factions).filter(f=>f.id!=='quickbite').map(f=>Number(f.rep)||0))}
  favourTierBoost(){
    const rep=this.bestReputation();let boost=rep>=60?2:(rep>=25?1:0);
    if(this.hasSkill('priorityAccess'))boost++;
    return Math.min(2,boost)
  }
  marketAccessTier(){return clamp(this.normalMarketTier()+this.favourTierBoost(),1,5)}
  productAccess(product){
    if(!product)return {ok:false,reason:'Unavailable'};
    if(product.faction){
      const rep=this.factions[product.faction]?.rep||0,need=product.repReq||25;
      return rep>=need?{ok:true,reason:`Faction access · rep ${rep}` }:{ok:false,reason:`${product.factionName||this.factions[product.faction]?.name||'Faction'} rep ${need} required`}
    }
    const access=this.marketAccessTier();
    return product.tier<=access?{ok:true,reason:product.tier>this.normalMarketTier()?'Early access through favour':'Standard access'}:{ok:false,reason:`Normally opens around level ${product.tier===2?2:(product.tier===3?5:(product.tier===4?9:14))} · favour can open it earlier`}
  }
  activeFrame(){return this.frames[this.state.drone]||this.frames['AX-1']}
  fittedInternalItems(){return (this.fittedInternalIds()||[]).map(id=>this.items[id]).filter(Boolean)}
  internalSum(prop){return this.fittedInternalItems().reduce((n,it)=>n+(Number(it[prop])||0),0)}
  internalProduct(prop){return this.fittedInternalItems().reduce((n,it)=>n*(Number(it[prop])||1),1)}

  allSkillNodes(){return Object.values(this.perkTrees).flatMap(t=>t.nodes)}
  skillNode(id){return this.allSkillNodes().find(n=>n.id===id)||null}
  hasSkill(id){return id==='coreRoot'||id==='engRoot'||id==='merRoot'||this.state.skills.includes(id)}
  skillPointsTotal(){return Math.max(1,this.levelForXP())}
  skillPointsSpent(){return this.state.skills.length}
  skillPointsAvailable(){return Math.max(0,this.skillPointsTotal()-this.skillPointsSpent())}
  skillCanBuy(node){
    if(!node||node.root||node.future||this.hasSkill(node.id)||this.skillPointsAvailable()<1)return false;
    if(this.skillPointsSpent()<(node.minSpent||0))return false;
    return (node.req||[]).every(id=>this.hasSkill(id))
  }
  maxContractRisk(){
    // Risk rises mainly with experience; strong favour can surface harder work early.
    const lvl=this.levelForXP(),rep=this.bestReputation();
    let cap=clamp(3+Math.floor((lvl-1)/2),3,9);
    if(rep>=25)cap++;if(rep>=60)cap++;
    return clamp(cap,3,9)
  }
  fittedInternalIds(){return this.currentMission?this.activeInternalLoadout:this.state.internalLoadout}
  hasInternal(id){return (this.fittedInternalIds()||[]).includes(id)}
  maxShield(){return this.activeFrame().shields+(this.hasSkill('shieldService')?1:0)+this.internalSum('shieldBonus')}
  shieldRegeneration(){
    // The consumables lesson deliberately demonstrates shield loss and recovery, so
    // automatic repair is disabled for that simulator stage. Earlier training keeps
    // the forgiving fast recharge used for movement/aim practice.
    if(this.currentMission?.training&&(this.currentStage?.()?.tutorialConsumables||this.currentStage?.()?.tutorialAbandon))return null;
    if(this.currentMission?.training)return {delay:.28,interval:.42};
    let interval=this.hasSkill('rapidRepair')?3:(this.hasSkill('autoRepair')?5:10);
    interval*=Number(this.activeFrame().regenMult)||1;
    interval*=this.internalProduct('regenMult');
    return {delay:4,interval:Math.max(1.2,interval)}
  }
  pilotingResponseMultiplier(){
    let m=this.hasSkill('pilotAce')?1.15:(this.hasSkill('pilotFineControl')?1.12:(this.hasSkill('pilotResponse')?1.08:(this.hasSkill('pilotControl')?1.04:1)));
    m*=Number(this.activeFrame().steeringMult)||1;m*=this.internalProduct('steeringMult');return m
  }
  enemyHitIntentMultiplier(){
    let m=this.hasSkill('pilotAce')?0.80:(this.hasSkill('pilotEvasion')?0.85:(this.hasSkill('pilotThreat')?0.92:1));
    m*=Number(this.activeFrame().enemyHitMult)||1;return m
  }
  weaponAimMultiplier(){
    let m=this.hasSkill('combatVeteran')?1.14:(this.hasSkill('combatTracking')?1.12:(this.hasSkill('combatFireControl')?1.06:1));
    m*=Number(this.activeFrame().aimMult)||1;m*=this.internalProduct('aimMult');return m
  }
  laserIntervalMultiplier(){
    let m=this.hasSkill('combatVeteran')?0.85:(this.hasSkill('combatCycle')?0.92:1);
    m*=Number(this.activeFrame().fireIntervalMult)||1;return m
  }
  laserBurstSize(){return 4+(this.hasSkill('combatBurst')?1:0)+(this.hasSkill('longBurst')?1:0)+(Number(this.activeFrame().burstBonus)||0)+this.internalSum('burstBonus')}
  activeSlotCount(){
    const base=this.activeFrame().consumables||1,extra=(this.hasSkill('extraRack')?1:0)+(this.hasSkill('auxRack')?1:0);
    return clamp(base+extra,1,4)
  }
  internalSlotCount(){return clamp(this.activeFrame().internals||1,1,4)}
  blankFrameProfile(){return {consumables:[null,null,null,null],internals:[null,null,null,null]}}
  normaliseFrameProfile(profile){
    const p=profile&&typeof profile==='object'?profile:{};
    const consumables=Array.isArray(p.consumables)?p.consumables.slice(0,4):[null,null,null,null];
    const internals=Array.isArray(p.internals)?p.internals.slice(0,4):[null,null,null,null];
    while(consumables.length<4)consumables.push(null);while(internals.length<4)internals.push(null);
    return {consumables,internals}
  }
  rememberCurrentFrameLoadout(){
    if(!this.state.frameLoadouts||typeof this.state.frameLoadouts!=='object')this.state.frameLoadouts={};
    this.state.frameLoadouts[this.state.drone]={consumables:this.state.loadout.slice(0,4),internals:this.state.internalLoadout.slice(0,4)};
  }
  unloadBaseLoadoutToInventory(){
    for(const id of this.state.loadout)if(id)this.state.inventory[id]=(this.state.inventory[id]||0)+1;
    for(const id of this.state.internalLoadout)if(id)this.state.inventory[id]=(this.state.inventory[id]||0)+1;
    this.state.loadout=[null,null,null,null];this.state.internalLoadout=[null,null,null,null];
  }
  restoreFrameLoadout(frameId=this.state.drone){
    if(this.equipmentLocked()||frameId!==this.state.drone)return false;
    this.normalizeLoadout();
    const profile=this.normaliseFrameProfile(this.state.frameLoadouts?.[frameId]);
    const cap=this.activeSlotCount(),internalCap=this.internalSlotCount();
    const fit=(wanted,target,slotType,limit)=>{
      for(let i=0;i<limit;i++){
        if(target[i])continue;
        const id=wanted[i],item=id?this.items[id]:null;
        if(!id||!item||item.slot!==slotType||(this.state.inventory[id]||0)<1)continue;
        this.state.inventory[id]--;target[i]=id;
      }
    };
    fit(profile.consumables,this.state.loadout,'consumable',cap);
    fit(profile.internals,this.state.internalLoadout,'internal',internalCap);
    return true
  }
  normalizeLoadout(){
    const cap=this.activeSlotCount(),internalCap=this.internalSlotCount();
    this.state.inventory={...this.emptyInventory(),...(this.state.inventory||{})};
    this.state.loadout=Array.isArray(this.state.loadout)?this.state.loadout.slice(0,4):[null,null,null,null];
    while(this.state.loadout.length<4)this.state.loadout.push(null);
    this.state.internalLoadout=Array.isArray(this.state.internalLoadout)?this.state.internalLoadout.slice(0,4):[null,null,null,null];
    while(this.state.internalLoadout.length<4)this.state.internalLoadout.push(null);
    for(let i=0;i<4;i++){
      const id=this.state.loadout[i],item=id?this.items[id]:null;
      if(id&&(!item||item.slot!=='consumable'||i>=cap)){this.state.inventory[id]=(this.state.inventory[id]||0)+1;this.state.loadout[i]=null}
    }
    for(let i=0;i<4;i++){
      const id=this.state.internalLoadout[i],item=id?this.items[id]:null;
      if(id&&(!item||item.slot!=='internal'||i>=internalCap)){this.state.inventory[id]=(this.state.inventory[id]||0)+1;this.state.internalLoadout[i]=null}
    }
  }
  equipmentLocked(){return !!this.currentMission}
  buyItem(id){
    const item=this.items[id],access=this.productAccess(item),price=this.marketPrice(item);if(!item||!access.ok||this.state.money<price)return false;
    this.state.money-=price;this.consumeMarketDiscount(id);this.state.inventory[id]=(this.state.inventory[id]||0)+1;this.save();this.renderHeader();this.renderShop();this.renderWorkshop();this.renderProgressionSandbox();this.renderMail();return true
  }
  buyFrame(id){
    const frame=this.frames[id],access=this.productAccess(frame);if(!frame||id==='AX-1'||!access.ok||this.state.ownedFrames.includes(id)||this.state.money<frame.price)return false;
    this.state.money-=frame.price;this.state.ownedFrames.push(id);if(!this.state.frameLoadouts[id])this.state.frameLoadouts[id]=this.blankFrameProfile();this.save();this.renderHeader();this.renderShop();this.renderWorkshop();this.renderProgressionSandbox();return true
  }
  selectFrame(id){
    if(this.equipmentLocked()||!this.frames[id]||!this.state.ownedFrames.includes(id)||this.state.drone===id)return false;
    this.normalizeLoadout();this.rememberCurrentFrameLoadout();this.unloadBaseLoadoutToInventory();
    this.state.drone=id;this.restoreFrameLoadout(id);this.save();this.renderHeader();this.renderWorkshop();this.renderShop();return true
  }
  equipItem(id){
    if(this.equipmentLocked()||!(this.state.inventory[id]>0))return false;
    this.normalizeLoadout();const item=this.items[id];if(!item)return false;
    let slot=-1,target=null;
    if(item.slot==='internal'){
      target=this.state.internalLoadout;
      for(let i=0;i<this.internalSlotCount();i++)if(!target[i]){slot=i;break}
    }else{
      target=this.state.loadout;
      for(let i=0;i<this.activeSlotCount();i++)if(!target[i]){slot=i;break}
    }
    if(slot<0)return false;
    this.state.inventory[id]--;target[slot]=id;this.rememberCurrentFrameLoadout();this.save();this.renderWorkshop();this.renderShop();return true
  }
  unloadSlot(i,slotType='consumable'){
    const limit=slotType==='internal'?this.internalSlotCount():this.activeSlotCount();
    if(this.equipmentLocked()||i<0||i>=limit)return false;
    const target=slotType==='internal'?this.state.internalLoadout:this.state.loadout,id=target[i];if(!id)return false;
    this.state.inventory[id]=(this.state.inventory[id]||0)+1;target[i]=null;this.rememberCurrentFrameLoadout();this.save();this.renderWorkshop();this.renderShop();return true
  }
  deployLoadout(){
    this.normalizeLoadout();this.rememberCurrentFrameLoadout();
    this.activeLoadout=this.state.loadout.slice(0,4);this.state.loadout=[null,null,null,null];
    this.activeInternalLoadout=this.state.internalLoadout.slice(0,4);this.state.internalLoadout=[null,null,null,null];this.save()
  }
  recoverUnusedLoadout(recover=true){
    if(recover){
      for(const id of this.activeLoadout)if(id)this.state.inventory[id]=(this.state.inventory[id]||0)+1;
      for(const id of this.activeInternalLoadout)if(id)this.state.inventory[id]=(this.state.inventory[id]||0)+1;
    }
    this.activeLoadout=[null,null,null,null];this.activeInternalLoadout=[null,null,null,null]
  }
  updateGearHud(){
    if(!gearHudEl)return;
    // Training hides consumables until the dedicated consumables lesson. That stage
    // deliberately exposes slot 1 so the player learns the numbered-slot control.
    const tutorialConsumables=!!(this.currentMission?.training&&this.currentStage?.()?.tutorialConsumables);
    const active=!!this.currentMission&&!this.open&&mode!=='simulatorCut'&&mode!=='dead'&&(!this.currentMission.training||tutorialConsumables);
    gearHudEl.classList.toggle('show',active);gearHudEl.innerHTML='';if(!active)return;
    const cap=this.activeSlotCount();
    for(let i=0;i<cap;i++){
      const id=this.activeLoadout[i],item=id?this.items[id]:null,el=document.createElement('div');
      el.className='gearHudSlot'+(item?' ready':' empty used');
      el.setAttribute('aria-label',`Consumable ${i+1}: ${item?item.name:'empty'}`);
      const key=tutorialConsumables?String(i+1):(i===0?'MMB':String(i+1));
      el.innerHTML=`<span class="gearHudKey">${key}</span><span class="gearHudIcon">${item?this.itemIcon(item.id):this.itemIcon(null)}</span><span class="gearHudLabel">${item?item.hud:'EMPTY'}</span>`;
      gearHudEl.appendChild(el)
    }
  }
  currentMissileTarget(){
    if(mode!=='play'||phase!=='space')return null;
    const id=spaceLockId||spacePursuitId;
    return id?fighters.find(f=>f.id===id&&!f.dead&&!f.dying)||null:null
  }
  useActiveSlot(i){
    if(!this.currentMission||this.open||i<0||i>=this.activeSlotCount())return false;
    const id=this.activeLoadout[i],item=id?this.items[id]:null;if(!item)return false;
    if(item.effect==='shieldBoost'){
      if(shield>=this.maxShield()){say('SHIELDS FULL',.45);return false}
      const before=shield;shield=Math.min(this.maxShield(),shield+(item.restore||2));shieldRegenDelay=shieldRegenTick=0;
      this.activeLoadout[i]=null;this.updateGearHud();say(`SHIELD BOOST +${shield-before}`,.6);hud();return true
    }
    if(item.effect==='homingMissile'){
      const target=this.currentMissileTarget();if(!target){say('NO MISSILE TARGET',.45);return false}
      if(!launchHomingMissile(target,item.missileDamage||6,item.missileSpeed||72)){say('MISSILE NOT AVAILABLE',.45);return false}
      this.activeLoadout[i]=null;this.updateGearHud();say(`${item.name.toUpperCase()} AWAY`,.55);return true
    }
    return false
  }
  useSecondaryFire(){
    for(let i=0;i<this.activeSlotCount();i++)if(this.activeLoadout[i])return this.useActiveSlot(i);
    say('SECONDARY EMPTY',.35);return false
  }
  insuranceExcessRate(){
    if(this.hasSkill('fullCover'))return .10;
    if(this.hasSkill('lowExcess'))return .15;
    if(this.hasSkill('insurance'))return .22;
    return .30
  }
  trainingInsuranceDiscount(){return this.state.trainingInsuranceBenefit?.01:0}
  insuredLiability(base){
    const excess=Math.max(0,Number(base)||0)*this.insuranceExcessRate();
    return Math.round(excess*(1-this.trainingInsuranceDiscount()))
  }
  frameReplacementExcess(frameId=this.state.drone){const f=this.frames[frameId]||this.frames['AX-1'];return f.id==='AX-1'?0:this.insuredLiability(f.price)}
  contractPayMultiplier(risk=1){
    let m=1;
    if(this.hasSkill('negotiator'))m+=.05;
    if(this.hasSkill('rewardBonus'))m+=.10;
    if(this.hasSkill('premiumTerms')&&risk>=5)m+=.15;
    return m
  }
  positiveRepMultiplier(){return this.hasSkill('knownQuantity')?1.25:1}
  contractSlotCount(){return this.hasSkill('brokerNetwork')?7:6}
  purchaseSkill(id){
    const node=this.skillNode(id);
    if(!this.skillCanBuy(node))return false;
    this.state.skills.push(id);this.normalizeLoadout();this.save();
    if(id==='brokerNetwork'||id==='insurance'||id==='autoRepair'||id==='lowExcess'||id==='rapidRepair'||id==='fullCover'){
      this.generateContractBoard();this.save();
    }
    this.render();this.setPanel('perks');
    return true
  }
  contractRiskForSlot(slot){
    const lvl=this.levelForXP(),centre=1+Math.floor((lvl-1)*.55);
    const offsets=[-2,-1,0,0,1,2,1];
    return clamp(centre+(offsets[slot%offsets.length]||0),1,this.maxContractRisk())
  }
  pickFaction(allowed=null,templateWeights=null){
    const ids=Array.isArray(allowed)&&allowed.length?allowed.filter(id=>this.factions[id]):Object.keys(this.factions).filter(id=>id!=='quickbite');
    if(!ids.length)return'trade';
    // Most templates keep the original reputation-weighted faction draw. A template
    // may additionally express that its premise is naturally more common for some
    // clients; multiply that authored weight by the existing reputation weight rather
    // than replacing reputation as a campaign influence.
    if(templateWeights&&typeof templateWeights==='object'){
      const weighted=ids.map(id=>{
        const rep=this.factions[id].rep||0,repWeight=rep>=60?5:(rep>=25?4:(rep>=-20?3:(rep>=-55?2:1)));
        return{id,weight:repWeight*Math.max(0,Number(templateWeights[id]??1)||0)}
      }).filter(x=>x.weight>0);
      if(weighted.length){
        const total=weighted.reduce((n,x)=>n+x.weight,0),roll=Math.random()*total;let acc=0;
        for(const x of weighted){acc+=x.weight;if(roll<=acc)return x.id}
        return weighted[weighted.length-1].id
      }
    }
    const weighted=[];
    for(const id of ids){
      const rep=this.factions[id].rep||0;
      const weight=rep>=60?5:(rep>=25?4:(rep>=-20?3:(rep>=-55?2:1)));
      for(let i=0;i<weight;i++)weighted.push(id)
    }
    return weighted[(Math.random()*weighted.length)|0]||ids[0]||'trade'
  }
  missionTemplate(id){return globalThis.AgentXMissionData?.templates?.[id]||null}
  templateChoice(values,fallback=''){
    const a=Array.isArray(values)?values:[];return a.length?a[(Math.random()*a.length)|0]:fallback
  }
  formatTemplateText(text,vars={}){
    return String(text??'').replace(/\{([A-Za-z0-9_]+)\}/g,(all,key)=>Object.prototype.hasOwnProperty.call(vars,key)?String(vars[key]):all)
  }
  templateRisk(template){
    const cfg=template?.risk||{},level=this.levelForXP(),minLevel=Math.max(1,Number(template?.minLevel)||1),step=Math.max(1,Math.round(Number(cfg.levelsPerStep)||2));
    const floorRisk=Math.max(1,Math.round(Number(cfg.min)||1));
    let risk=(Number(cfg.base)||1)+Math.floor(Math.max(0,level-minLevel)/step);
    const jitter=Math.max(0,Math.round(Number(cfg.jitter)||0));
    if(jitter)risk+=((Math.random()*(jitter*2+1))|0)-jitter;
    const cap=Math.max(floorRisk,Math.min(Math.max(1,Number(cfg.max)||9),this.maxContractRisk()));
    return clamp(Math.round(risk),floorRisk,cap)
  }
  resolveTemplateValue(value,vars={}){
    if(typeof value==='string'&&value.charAt(0)==='$')return vars[value.slice(1)]??value;
    if(Array.isArray(value))return value.map(v=>this.resolveTemplateValue(v,vars));
    if(value&&typeof value==='object'){
      // Resolve a data-authored random choice once when the contract is generated.
      // This is useful for true mission requirements such as planet-vs-moon landing,
      // where the runtime must receive one stable answer rather than reroll per frame.
      if(Array.isArray(value.choices)&&value.choices.length){
        const choices=value.choices,weights=Array.isArray(value.weights)?value.weights:[];
        const weighted=choices.map((choice,i)=>({choice,weight:Math.max(0,Number(weights[i]??1)||0)})).filter(x=>x.weight>0);
        if(weighted.length){
          const total=weighted.reduce((n,x)=>n+x.weight,0),roll=Math.random()*total;let acc=0;
          for(const x of weighted){acc+=x.weight;if(roll<=acc)return this.resolveTemplateValue(x.choice,vars)}
          return this.resolveTemplateValue(weighted[weighted.length-1].choice,vars)
        }
        return this.resolveTemplateValue(choices[0],vars)
      }
      if(Object.prototype.hasOwnProperty.call(value,'base')&&(Object.prototype.hasOwnProperty.call(value,'perRisk')||Object.prototype.hasOwnProperty.call(value,'random'))){
        const base=Number(value.base)||0,perRisk=Number(value.perRisk)||0,random=Math.max(0,Number(value.random)||0);
        let result=base+perRisk*(Number(vars.risk)||0)+Math.random()*random;
        if(value.round)result=Math.round(result);
        if(Number.isFinite(Number(value.min)))result=Math.max(Number(value.min),result);
        if(Number.isFinite(Number(value.max)))result=Math.min(Number(value.max),result);
        return result
      }
      return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,this.resolveTemplateValue(v,vars)]))
    }
    return value
  }
  templateEncounterChoice(template,faction){
    const table=template?.encounterTable,weights=table?.weightsByFaction?.[faction]||table?.weights||{},entries=table?.entries||{};
    const choices=[];
    for(const [id,rawWeight] of Object.entries(weights)){
      const weight=Math.max(0,Number(rawWeight)||0);
      if(!weight)continue;
      const entry=id==='none'?{id:'none'}:entries[id];
      if(!entry)continue;
      choices.push({id,weight,entry})
    }
    if(!choices.length)return null;
    const total=choices.reduce((n,x)=>n+x.weight,0),roll=Math.random()*total;
    let acc=0;
    for(const choice of choices){acc+=choice.weight;if(roll<=acc)return{id:choice.id,...choice.entry}}
    const last=choices[choices.length-1];return{id:last.id,...last.entry}
  }
  makeTemplateContract(template,slot=0,options={}){
    if(!template)return null;
    const allowed=Array.isArray(template.allowedFactions)?template.allowedFactions.filter(id=>this.factions[id]):[];
    const requestedFaction=String(options?.faction||'');
    const faction=(requestedFaction&&this.factions[requestedFaction]&&(!allowed.length||allowed.includes(requestedFaction))&&template.presentation?.[requestedFaction])
      ?requestedFaction
      :this.pickFaction(template.allowedFactions,template.factionWeights);
    const risk=this.templateRisk(template),pack=template.presentation?.[faction]||{},defaults=template.defaults||{},encounter=this.templateEncounterChoice(template,faction),brief=this.templateChoice(pack.briefs,null);
    const destination=String(brief?.destination||this.templateChoice(pack.destinations,defaults.destination||'Contract Destination')||defaults.destination||'Contract Destination'),cargo=this.templateChoice(pack.cargo,defaults.cargo||'sealed cargo'),targetGroup=String(brief?.target||defaults.target||'hostile group'),motive=String(brief?.motive||''),situation=String(brief?.situation||''),targetProfile=String(brief?.profile||'standard'),title=this.templateChoice(brief?.titles||pack.titles,template.id||'Contract');
    const textVars={...defaults,cargo,destination,target:targetGroup,motive,situation,profile:targetProfile,faction:this.factions[faction]?.name||faction,risk};
    const description=this.formatTemplateText(this.templateChoice(brief?.descriptions||pack.descriptions,'Complete the assigned contract.'),textVars);
    const sectionVars={...defaults,risk,cargo,destination,target:targetGroup,motive,situation,profile:targetProfile,faction};
    const planetaryRequirements=this.resolveTemplateValue(template.planetaryRequirements||{},sectionVars);
    const modules=(template.sections||[]).filter(section=>{
      const only=Array.isArray(section?.onlyFactions)?section.onlyFactions:null,exclude=Array.isArray(section?.excludeFactions)?section.excludeFactions:null;
      return (!only||only.includes(faction))&&(!exclude||!exclude.includes(faction))
    }).flatMap(section=>{
      if(section.type==='template_encounter'){
        if(!encounter)return[];
        const selected=encounter.id==='none'?(section.none||null):encounter;
        if(!selected)return[];
        const params=this.resolveTemplateValue(selected.params||{},sectionVars);
        const module={type:selected.type||'fighters',label:section.label||selected.label||'Approach Encounter',difficulty:risk,...params};
        if(encounter.id!=='none')module.encounterId=encounter.id;
        if(selected.profile)module.profile=selected.profile;
        if(pack.cargoStyle)module.cargoStyle=pack.cargoStyle;
        return[module]
      }
      const params=this.resolveTemplateValue(section.params||{},sectionVars);
      const module={type:section.type,label:section.label||section.type,difficulty:risk,...params};
      if(pack.cargoStyle)module.cargoStyle=pack.cargoStyle;
      return[module]
    });
    const reward=template.reward||{},roundPay=Math.max(1,Math.round(Number(reward.roundPay)||50)),fighterModule=modules.find(x=>x.type==='fighters'||x.type==='customs_drones'),asteroidModule=modules.find(x=>x.type==='asteroids');
    const fighterWork=fighterModule?Math.max(0,Number(fighterModule.target)||0)*(1.45+Math.max(0,Number(fighterModule.fighterHp)||12)*.36):0;
    const asteroidWork=asteroidModule?Math.max(0,Number(asteroidModule.target)||0):0;
    const rawPay=(Number(reward.basePay)||0)+(Number(reward.payPerRisk)||0)*risk+(Number(reward.payRiskSquare)||0)*risk*risk+(Number(reward.payPerFighterWork)||0)*fighterWork+(Number(reward.payPerAsteroidWork)||0)*asteroidWork+Math.random()*Math.max(0,Number(reward.randomPay)||0);
    const pay=Math.round((rawPay*this.contractPayMultiplier(risk))/roundPay)*roundPay;
    const xp=Math.round((Number(reward.baseXp)||0)+(Number(reward.xpPerRisk)||0)*risk+(Number(reward.xpRiskSquare)||0)*risk*risk+(Number(reward.xpPerFighterWork)||0)*fighterWork+(Number(reward.xpPerAsteroidWork)||0)*asteroidWork);
    const difficulty=risk<=1?1:(risk<=3?2:(risk<=5?3:5)),serial=(this.state.boardGeneration||0)*10+slot;
    return{
      id:`proc_${Date.now().toString(36)}_${serial}_${((Math.random()*0xffffff)|0).toString(36)}`,
      faction,title,kind:'procedural',family:template.family||template.id,templateId:template.id,templateVersion:template.version||1,
      cargo,destination,cargoStyle:pack.cargoStyle||'',targetGroup,motive,situation,targetProfile,musicMode:template.musicMode||null,
      planetaryRequirements,
      risk,minLevel:template.minLevel||1,minRep:-100,pay,xp,difficulty,implemented:true,intelStyle:template.intelStyle||'hiddenGroup',scenarioVersion:11,boardSchemaVersion:this.contractBoardSchemaVersion(),
      description,modules,stages:modules.map(x=>x.label)
    }
  }
  contractBoardSchemaVersion(){return 3}
  boardRules(){return globalThis.AgentXMissionData?.boardRules||{}}
  eligibleMissionTemplates(){
    const lvl=this.levelForXP(),templates=Object.values(globalThis.AgentXMissionData?.templates||{});
    return templates.filter(template=>{
      if(!template||template.board?.enabled===false)return false;
      const minLevel=Math.max(1,Number(template.minLevel)||1);
      if(lvl<minLevel)return false;
      if(template.maxLevel!=null&&lvl>Number(template.maxLevel))return false;
      const allowed=Array.isArray(template.allowedFactions)?template.allowedFactions:[];
      return !allowed.length||allowed.some(id=>this.factions[id]);
    })
  }
  templateBoardCategory(template){return String(template?.board?.category||template?.family||template?.id||'other')}
  templateBoardWeight(template){
    const fallback=Math.max(0,Number(this.boardRules().defaultWeight)||1);
    return Math.max(0,Number(template?.board?.weight??fallback)||0)
  }
  templateBoardMaxPerBoard(template){
    const fallback=Math.max(1,Math.round(Number(this.boardRules().defaultMaxPerTemplate)||2));
    return Math.max(1,Math.round(Number(template?.board?.maxPerBoard)||fallback))
  }
  requiredBoardCategories(eligible=this.eligibleMissionTemplates()){
    const available=new Set(eligible.map(t=>this.templateBoardCategory(t)));
    return (Array.isArray(this.boardRules().requiredCategories)?this.boardRules().requiredCategories:[]).filter(category=>available.has(String(category))).map(String)
  }
  weightedMissionTemplate(candidates){
    const weighted=(candidates||[]).map(template=>({template,weight:this.templateBoardWeight(template)})).filter(x=>x.weight>0);
    if(!weighted.length)return null;
    const total=weighted.reduce((sum,x)=>sum+x.weight,0),roll=Math.random()*total;
    let acc=0;
    for(const x of weighted){acc+=x.weight;if(roll<=acc)return x.template}
    return weighted[weighted.length-1].template
  }
  pickMissionTemplate(existingContracts=[],options={}){
    const eligible=this.eligibleMissionTemplates();
    if(!eligible.length)return null;
    const counts=new Map(),categories=new Set();
    for(const mission of existingContracts||[]){
      const id=String(mission?.templateId||'');
      if(id)counts.set(id,(counts.get(id)||0)+1);
      const template=id?this.missionTemplate(id):null;
      if(template)categories.add(this.templateBoardCategory(template))
    }
    let candidates=eligible.filter(template=>(counts.get(template.id)||0)<this.templateBoardMaxPerBoard(template));
    if(!candidates.length)candidates=eligible.slice();

    // Do not let pure RNG produce a one-note board. When the final open slots
    // are needed to preserve one of the configured core categories, reserve
    // those slots for the missing categories. The order is shuffled afterwards,
    // so this does not create visible fixed-category positions.
    const missing=this.requiredBoardCategories(eligible).filter(category=>!categories.has(category));
    const remaining=Math.max(1,Math.round(Number(options.remainingSlots)||1));
    if(missing.length&&remaining<=missing.length){
      const required=candidates.filter(template=>missing.includes(this.templateBoardCategory(template)));
      if(required.length)candidates=required
    }

    const avoidId=String(options.avoidTemplateId||'');
    if(avoidId){
      const alternatives=candidates.filter(template=>template.id!==avoidId);
      if(alternatives.length)candidates=alternatives
    }
    return this.weightedMissionTemplate(candidates)
  }
  shuffleContractBoard(board){
    for(let i=board.length-1;i>0;i--){const j=(Math.random()*(i+1))|0;[board[i],board[j]]=[board[j],board[i]]}
    return board
  }
  boardTemplateSignature(board){
    return (Array.isArray(board)?board:[]).map(m=>String(m?.templateId||m?.family||'')).sort().join('|')
  }
  proceduralTitle(faction,family){
    const titles={
      trade:{
        asteroids:['Lane Clearance','Hazard Removal','Shipping Lane Sweep'],
        fighters:['Pirate Suppression','Escort Route Sweep','Free Trader Defence'],
        combo:['Route Sanitisation','Dangerous Passage','Priority Corridor'],
        deep_core:['Contracted Strike','Hostile Facility Removal']
      },
      security:{
        asteroids:['Orbital Debris Sweep','Navigation Hazard Clearance','Approach Lane Security'],
        fighters:['Interceptor Sweep','Outer Patrol','Hostile Contact Sweep'],
        combo:['Corridor Pacification','Security Route Clearance','Threat Suppression'],
        deep_core:['Deep Core Strike','Strategic Denial']
      },
      jackals:{
        asteroids:['Breakout Lane','Quiet Passage','Smuggler Route Clearance'],
        fighters:['Pursuit Breaker','No Questions Asked','Rival Sweep'],
        combo:['Escape Corridor','Hot Route','Clear the Way'],
        deep_core:['Black Site Raid','Hard Target'],
        jackal_party_delivery:['Party Supplies','After Hours Delivery','Penthouse Drop']
      },
      helix:{
        asteroids:['Survey Corridor Clearance','Mining Approach Sweep','Debris Suppression'],
        fighters:['Asset Defence','Perimeter Sweep','Security Clearance'],
        combo:['Prospecting Route','Industrial Corridor','Survey Route Security'],
        deep_core:['Asset Denial','Facility Strike']
      },
      quickbite:{
        food_delivery:["Miner's Lunch",'Hot Food Run','Belt Lunch Delivery']
      }
    };
    const a=titles[faction]?.[family]||['Contract'];
    return a[(Math.random()*a.length)|0]
  }
  makeProceduralContract(slot=0,forcedFamily=null,boardContext=[]){
    const template=forcedFamily?this.missionTemplate(forcedFamily):this.pickMissionTemplate(boardContext,{remainingSlots:1});
    if(template)return this.makeTemplateContract(template,slot);
    const family=forcedFamily||'fighters';
    const risk=family==='food_delivery'?1:(family==='jackal_party_delivery'?clamp(this.contractRiskForSlot(slot),2,5):this.contractRiskForSlot(slot));
    const faction=family==='food_delivery'?'quickbite':(family==='jackal_party_delivery'?'jackals':this.pickFaction());
    const asteroidTarget=clamp(7+risk*3+((Math.random()*6)|0),8,42);
    // The contract knows the real size and toughness of the hostile group, but the
    // operator is not given a game-like kill quota. Pay is the practical clue.
    const fighterTarget=clamp(4+risk+((Math.random()*3)|0),5,18);
    const fighterHp=clamp(12+Math.floor((risk-1)/3)*2,12,18);
    const modules=[];
    if(family==='food_delivery'){
      modules.push({type:'courier_food',label:'Food Delivery',difficulty:1,routeSeconds:21+Math.random()*4})
    }else if(family==='jackal_party_delivery'){
      const customsTarget=clamp(5+risk,7,10);
      const customsHp=clamp(12+Math.floor(Math.max(0,risk-2)/2)*2,12,16);
      // v215 scenario engine: the old monolithic customs/descent/city mission is
      // expressed as reusable pieces. The flow controller owns the hand-offs.
      modules.push({type:'customs_drones',label:'Customs Intercept',difficulty:risk,target:customsTarget,fighterHp:customsHp});
      modules.push({type:'planet_descent',label:'Planet Descent',difficulty:risk});
      // Reusable surface destination approach: land on open terrain, acquire a
      // world-space destination marker, and physically travel to the city before
      // the urban traffic module takes over. This is deliberately a generic piece
      // rather than bespoke party-delivery choreography.
      modules.push({type:'surface_destination_approach',label:'Plains Approach',difficulty:risk,terrain:'plains',destination:'city',routeLength:430,treeClumps:9});
      modules.push({type:'jackal_city_delivery',label:'Penthouse Delivery',difficulty:risk,cityLength:620})
    }else if(family==='asteroids'){
      modules.push({type:'asteroids',label:'Asteroid Clearance',target:asteroidTarget,difficulty:risk})
    }else if(family==='fighters'){
      modules.push({type:'fighters',label:'Interceptor Sweep',target:fighterTarget,fighterHp,difficulty:risk})
    }else if(family==='combo'){
      modules.push({type:'asteroids',label:'Marked Hazard Clearance',target:asteroidTarget,difficulty:risk,markedTargets:true});
      modules.push({type:'fighters',label:'Pirate Defence',target:fighterTarget,fighterHp,difficulty:risk})
    }else{
      // Deep-core contracts are also composed: ordinary fighter combat can now
      // be reused independently from the descent and the surface/base assault.
      modules.push({type:'fighters',label:'Orbital Defenders',target:clamp(fighterTarget+2,8,18),fighterHp,difficulty:risk});
      modules.push({type:'planet_descent',label:'Planet Descent',difficulty:risk});
      modules.push({type:'deep_core_surface',label:'Surface / Reactor Strike',difficulty:risk})
    }

    const asteroid=modules.find(x=>x.type==='asteroids');
    const fighters=modules.find(x=>x.type==='fighters');
    let description='';
    if(family==='food_delivery'){
      description='A miner at a remote belt site has ordered lunch. Get the sandwich through the rocks and into the mine while it is still recognisably food.'
    }else if(family==='jackal_party_delivery'){
      description='A Red Jackal client wants a sealed case of “party supplies” delivered directly to a city penthouse. Customs are expected to object. Fight through the customs drones, descend to the plains, navigate to the city and make the hatch delivery.'
    }else if(family==='asteroids'){
      const where=faction==='helix'?'industrial approach':(faction==='trade'?'commercial lane':(faction==='security'?'navigation corridor':'covert route'));
      description=`Clear ${asteroid.target} hazardous asteroids from a ${where}.`
    }else if(family==='fighters'){
      const who=faction==='jackals'?'pursuit craft':'hostile raiders';
      description=`A group of ${who} is threatening operations in the sector. Clear them out.`
    }else if(family==='combo'){
      description='Clear the marked hazards from the route, then deal with the hostile group operating beyond it.'
    }else{
      description='Break through orbital defenders, descend to the surface, breach the installation and destroy its reactor.'
    }

    // Fighter pay derives from the hidden real group: more hulls and tougher hulls
    // both push the offer upward, so the reward itself becomes useful intelligence.
    const fighterWork=fighters?fighters.target*(1.45+fighters.fighterHp*.36):0;
    const customs=modules.find(x=>x.type==='customs_drones'||x.type==='jackal_party_delivery');
    const customsWork=customs?customs.target*(1.55+customs.fighterHp*.38)+28:0;
    const workload=(asteroid?.target||0)*1.0+fighterWork+customsWork+(family==='deep_core'?38+risk*5:0);
    const basePay=family==='food_delivery'?(250+((Math.random()*3)|0)*50):(family==='jackal_party_delivery'?Math.round((1400+workload*78+risk*risk*110)/50)*50:Math.round((500+workload*82+risk*risk*95)/50)*50);
    // Costs rise about x4 per equipment tier; ordinary earnings rise more gently.
    // The workload/risk formula already grows naturally, so these modest tier multipliers
    // bring the overall result close to the intended ~x2 money / ~x1.5-1.7 XP rhythm.
    const rewardTier=clamp(1+Math.floor((risk-1)/2),1,5),payScale=[0,1,1.35,1.8,2.5,3.5][rewardTier],xpScale=[0,1,1.15,1.35,1.60,1.90][rewardTier];
    const pay=family==='food_delivery'?basePay:Math.round((basePay*payScale*this.contractPayMultiplier(risk))/50)*50;
    const xp=family==='food_delivery'?55:Math.round((55+workload*(family==='jackal_party_delivery'?6.2:7)+risk*18)*xpScale);
    const difficulty=family==='food_delivery'?1:(risk<=1?1:(risk<=3?2:(risk<=5?3:5)));
    const serial=(this.state.boardGeneration||0)*10+slot;
    return{
      id:`proc_${Date.now().toString(36)}_${serial}_${((Math.random()*0xffffff)|0).toString(36)}`,
      faction,title:this.proceduralTitle(faction,family),kind:'procedural',
      family,risk,minLevel:1,minRep:-100,pay,xp,difficulty,implemented:true,intelStyle:'hiddenGroup',scenarioVersion:11,boardSchemaVersion:this.contractBoardSchemaVersion(),
      description,modules,stages:modules.map(x=>x.label)
    }
  }
  generateContractBoardCandidate(){
    const board=[],slots=this.contractSlotCount();
    for(let i=0;i<slots;i++){
      const template=this.pickMissionTemplate(board,{remainingSlots:slots-i});
      if(!template)break;
      board.push(this.makeTemplateContract(template,i))
    }
    return this.shuffleContractBoard(board)
  }
  generateContractBoard(){
    this.state.boardGeneration=(this.state.boardGeneration||0)+1;
    const previous=this.boardTemplateSignature(this.state.contractBoard),slots=this.contractSlotCount();
    let board=[];
    // Refresh should normally change the actual mix of mission families, not just
    // reroll titles and payouts. A few retries are enough while still allowing an
    // identical mix when the eligible catalogue is temporarily very small.
    for(let attempt=0;attempt<8;attempt++){
      const candidate=this.generateContractBoardCandidate();
      board=candidate;
      if(candidate.length!==slots||!previous||this.boardTemplateSignature(candidate)!==previous)break
    }
    // Defensive fallback: all current ordinary mission families are templates,
    // but never leave the board short if malformed future data removes them all.
    while(board.length<slots)board.push(this.makeProceduralContract(board.length,'fighters',board));
    this.missions=board;
    this.state.contractBoard=JSON.parse(JSON.stringify(board));
    return board
  }
  ensureContractBoard(){
    const b=this.state.contractBoard,lvl=this.levelForXP(),schema=this.contractBoardSchemaVersion(),templates=Object.values(globalThis.AgentXMissionData?.templates||{});
    const templatedFamilies=new Map(templates.map(t=>[String(t?.family||t?.id||''),t]));
    const templateCoverageOk=Array.isArray(b)&&b.every(m=>{
      const t=templatedFamilies.get(String(m?.family||''));
      return !t||(m?.templateId===t.id&&m?.templateVersion===(t.version||1))
    });
    const eligibilityOk=Array.isArray(b)&&b.every(m=>{
      const t=m?.templateId?this.missionTemplate(m.templateId):null;
      if(!t)return false;
      return lvl>=(Number(t.minLevel)||1)&&(t.maxLevel==null||lvl<=Number(t.maxLevel))
    });
    if(Array.isArray(b)&&b.length===this.contractSlotCount()&&templateCoverageOk&&eligibilityOk&&b.every(m=>m&&m.boardSchemaVersion===schema&&m.implemented&&m.intelStyle&&m.scenarioVersion===11&&Array.isArray(m.modules)&&m.modules.length&&(m.risk||1)<=this.maxContractRisk())){
      this.missions=b;
      return
    }
    this.generateContractBoard();
    this.save()
  }
  refreshContracts(){
    this.generateContractBoard();
    this.save();
    if(this.open)this.renderMissions()
  }
  replaceContract(id){
    const i=this.missions.findIndex(m=>m.id===id);
    if(i<0)return;
    const old=this.missions[i],context=this.missions.filter((_,index)=>index!==i);
    this.state.boardGeneration=(this.state.boardGeneration||0)+1;
    const template=this.pickMissionTemplate(context,{remainingSlots:1,avoidTemplateId:old?.templateId});
    this.missions[i]=template?this.makeTemplateContract(template,i):this.makeProceduralContract(i,'fighters',context);
    this.state.contractBoard=JSON.parse(JSON.stringify(this.missions))
  }
  currentStage(){
    return this.currentMission?.modules?.[this.currentStageIndex]||null
  }
  hasMoreStages(){
    return !!this.currentMission&&this.currentStageIndex<(this.currentMission.modules?.length||1)-1
  }
  advanceCurrentMissionStage(){
    if(!this.currentMission)return false;
    // v215: Campaign records progress/rewards; ScenarioFlow owns how one piece
    // hands off to the next and how a terminal piece leaves the mission area.
    return scenarioFlow.completeCurrentStage()
  }

  escapeHtml(value){
    return String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]))
  }
  hashText(value){
    let h=2166136261>>>0;for(const ch of String(value??'')){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)>>>0}return h>>>0
  }
  contactForMission(m){
    const template=m?.templateId?this.missionTemplate(m.templateId):null,pack=template?.presentation?.[m?.faction]||null;
    const explicit=this.contactFromId(pack?.contactId);if(explicit)return explicit;
    const ids=this.contactIdsByFaction?.[m?.faction]||[];if(!ids.length)return null;
    return this.mailContacts[ids[0]]||null
  }
  contactFromId(id){return this.mailContacts?.[id]||null}
  missionEncounterTag(m){
    const a=Array.isArray(m?.encounters)?m.encounters:[];
    const preferred=['customs_intercept','pirate_ambush','rogue_drones','xeno_swarm','station_xeno'];
    return preferred.find(id=>a.includes(id))||a[0]||''
  }
  templateCivilianSettlement(m){
    const template=m?.templateId?this.missionTemplate(m.templateId):null,policy=template?.civilianTrafficPolicy;
    if(!policy||typeof jackalDelivery==='undefined'||!jackalDelivery?.settlement)return null;
    const raw=jackalDelivery.settlement(),incidents=Math.max(0,Number(raw?.incidents)||0),assaults=Math.max(0,Number(raw?.shots)||0),collisions=Math.max(0,Number(raw?.collisions)||0);
    if(!incidents)return{incidents:0,assaults,collisions,severity:0,payMultiplier:1,repMultiplier:1,allowGift:true,failureRepPenalty:0};
    const severity=Math.max(1,collisions*Math.max(0,Number(policy.collisionWeight)||1)+assaults*Math.max(0,Number(policy.assaultWeight)||2));
    const tiers=Array.isArray(policy.tiers)?policy.tiers:[];
    const tier=tiers.filter(t=>severity>=(Number(t.min)||1)&&(t.max==null||severity<=Number(t.max))).sort((a,b)=>(Number(b.min)||0)-(Number(a.min)||0))[0]||{};
    return{incidents,assaults,collisions,severity,payMultiplier:Number.isFinite(Number(tier.payMultiplier))?Number(tier.payMultiplier):1,repMultiplier:Number.isFinite(Number(tier.repMultiplier))?Number(tier.repMultiplier):1,allowGift:tier.allowGift!==false,failureRepPenalty:Math.max(0,Math.round(Number(tier.failureRepPenalty)||0))}
  }
  routineMailText(templateId,vars={}){
    if(templateId==='mission_template_complete_v1'){
      const template=this.missionTemplate(vars.missionTemplateId),f=this.factions[vars.faction],pack=template?.presentation?.[vars.faction]||{};
      const subjects=Array.isArray(pack.completionSubjects)?pack.completionSubjects:[],bodies=Array.isArray(pack.completionBodies)?pack.completionBodies:[];
      const subject=subjects.length?subjects[Math.abs(Number(vars.subjectVariant)||0)%subjects.length]:`Contract complete: ${vars.title||'Contract'}`;
      const bodyTemplate=bodies.length?bodies[Math.abs(Number(vars.bodyVariant)||0)%bodies.length]:'Contract completion confirmed. Payment: CR {credits}. Standing: +{rep}.';
      const textVars={cargo:vars.cargo||'',destination:vars.destination||'',target:vars.target||'',motive:vars.motive||'',situation:vars.situation||'',credits:Number(vars.credits||0).toLocaleString(),rep:Math.max(0,Number(vars.repGain)||0),faction:f?.name||vars.faction||''};
      const body=[this.formatTemplateText(bodyTemplate,textVars)],encounter=String(vars.encounter||'');
      const encounterPool=Array.isArray(pack.encounterAcknowledgements?.[encounter])?pack.encounterAcknowledgements[encounter]:[];
      if(encounterPool.length){
        const line=encounterPool[Math.abs(Number(vars.encounterVariant)||0)%encounterPool.length];
        body.splice(Math.min(1,body.length),0,this.formatTemplateText(line,textVars))
      }
      return{from:`${f?.name||'Client Network'} · Contract Desk`,subject,body}
    }
    if(templateId==='mission_template_failure_v1'){
      const template=this.missionTemplate(vars.missionTemplateId),pack=template?.presentation?.[vars.faction]||{},outcome=vars.outcome==='abandoned'?'abandoned':'failed';
      const reaction=outcome==='abandoned'?(pack.abandonMail||{}):(pack.failureMail||{}),contact=this.contactFromId(vars.contactId||reaction.contactId||pack.contactId),f=this.factions[vars.faction];
      const subjects=Array.isArray(reaction.subjects)?reaction.subjects:[],bodies=Array.isArray(reaction.bodies)?reaction.bodies:[];
      const subject=subjects.length?subjects[Math.abs(Number(vars.subjectVariant)||0)%subjects.length]:(outcome==='abandoned'?'CONTRACT ABANDONED':'MISSION FAILED');
      const bodyTemplate=bodies.length?bodies[Math.abs(Number(vars.bodyVariant)||0)%bodies.length]:(outcome==='abandoned'?'You abandoned the contract. Do not repeat that performance.':'The contract failed. Your performance was unacceptable.');
      const textVars={cargo:vars.cargo||'',destination:vars.destination||'',target:vars.target||'',motive:vars.motive||'',situation:vars.situation||'',reason:vars.reason||'',faction:f?.name||vars.faction||'',incidents:Math.max(0,Number(vars.civilianIncidents)||0),assaults:Math.max(0,Number(vars.civilianAssaults)||0),collisions:Math.max(0,Number(vars.civilianCollisions)||0)};
      const body=this.formatTemplateText(bodyTemplate,textVars),mailBody=[body],civil=reaction===pack.abandonMail?(pack.civilianTrafficMail?.abandonAddenda||[]):(pack.civilianTrafficMail?.failureAddenda||[]);
      if(textVars.incidents>0&&Array.isArray(civil)&&civil.length)mailBody.push(this.formatTemplateText(civil[Math.abs(Number(vars.civilianVariant)||0)%civil.length],textVars));
      const from=contact?`${contact.name} · ${contact.role}, ${f?.name||''}`.replace(/, $/,''):`${f?.name||'Client Network'} · Contract Liaison`;
      return{from,subject,body:mailBody}
    }
    if(templateId==='mission_template_civilian_v1'){
      const template=this.missionTemplate(vars.missionTemplateId),pack=template?.presentation?.[vars.faction]||{},reaction=pack.civilianTrafficMail||{},contact=this.contactFromId(vars.contactId||reaction.contactId||pack.contactId),f=this.factions[vars.faction];
      const assaults=Math.max(0,Number(vars.assaults)||0),collisions=Math.max(0,Number(vars.collisions)||0),incidents=Math.max(0,Number(vars.incidents)||0),assault=assaults>0;
      const subjects=assault?(reaction.assaultSubjects||reaction.subjects||[]):(reaction.incidentSubjects||reaction.subjects||[]),bodies=assault?(reaction.assaultBodies||reaction.bodies||[]):(reaction.incidentBodies||reaction.bodies||[]);
      const subject=subjects.length?subjects[Math.abs(Number(vars.subjectVariant)||0)%subjects.length]:(assault?'CIVILIAN TRAFFIC ASSAULT':'CIVILIAN TRAFFIC INCIDENT');
      const bodyTemplate=bodies.length?bodies[Math.abs(Number(vars.bodyVariant)||0)%bodies.length]:'Civilian traffic was involved during the contract. The settlement has been reduced.';
      const textVars={cargo:vars.cargo||'',destination:vars.destination||'',credits:Number(vars.credits||0).toLocaleString(),fullCredits:Number(vars.fullCredits||0).toLocaleString(),incidents,assaults,collisions,incidentWord:incidents===1?'incident':'incidents',assaultWord:assaults===1?'assault':'assaults',collisionWord:collisions===1?'collision':'collisions',faction:f?.name||vars.faction||''};
      const body=this.formatTemplateText(bodyTemplate,textVars),from=contact?`${contact.name} · ${contact.role}, ${f?.name||''}`.replace(/, $/,''):`${f?.name||'Client Network'} · Contract Liaison`;
      return{from,subject,body:[body]}
    }
    if(templateId==='mission_template_personal_v1'){
      const template=this.missionTemplate(vars.missionTemplateId),pack=template?.presentation?.[vars.faction]||{},personal=pack.personalFollowUp||{},contact=this.contactFromId(vars.contactId||personal.contactId||pack.contactId),f=this.factions[vars.faction],encounter=String(vars.encounter||'');
      const encounterFollowups=Array.isArray(personal.encounterBodies?.[encounter])?personal.encounterBodies[encounter]:[];
      const followups=encounterFollowups.length?encounterFollowups:(Array.isArray(personal.bodies)?personal.bodies:(Array.isArray(pack.personalFollowups)?pack.personalFollowups:[])),subjects=Array.isArray(personal.subjects)?personal.subjects:[];
      const bodyTemplate=followups.length?followups[Math.abs(Number(vars.bodyVariant)||0)%followups.length]:'Good work, X.',subject=subjects.length?subjects[Math.abs(Number(vars.subjectVariant)||0)%subjects.length]:`Re: ${vars.title||'Contract'}`;
      const body=this.formatTemplateText(bodyTemplate,{cargo:vars.cargo||'',destination:vars.destination||'',target:vars.target||'',motive:vars.motive||'',situation:vars.situation||'',credits:Number(vars.credits||0).toLocaleString(),rep:Math.max(0,Number(vars.repGain)||0),faction:f?.name||vars.faction||''});
      const from=contact?`${contact.name} · ${contact.role}, ${f?.name||''}`.replace(/, $/,''):`${f?.name||'Client Network'} · Contract Liaison`;
      return{from,subject,body:[body]}
    }
    const rewardPack=globalThis.AgentXMissionData?.rewardMail?.[vars.faction]||null,isRewardMail=templateId==='gift_credits_v1'||templateId==='gift_item_v1'||templateId==='gift_discount_v1';
    const contact=this.contactFromId((isRewardMail?rewardPack?.contactId:null)||vars.contactId||rewardPack?.contactId),f=this.factions[vars.faction],name=contact?.name||(f?.name||'Contract Desk'),role=contact?.role||'Contract Desk';
    const from=contact?`${name} · ${role}, ${f?.name||''}`.replace(/, $/,''):`${f?.name||'Client Network'} · Contract Desk`;
    const title=String(vars.title||'Contract'),rep=Math.max(0,Number(vars.repGain)||0),encounter=vars.encounter||'',tone=contact?.tone||'formal',variantRaw=Math.abs(Number(vars.variant)||0),variant=variantRaw%3;
    const renderRewardMail=(kind,textVars,fallbackSubject,fallbackBody)=>{
      const spec=rewardPack?.[kind]||null,subjects=Array.isArray(spec?.subjects)?spec.subjects:[],variants=Array.isArray(spec?.bodies)?spec.bodies:[];
      if(!spec)return{from,subject:fallbackSubject,body:fallbackBody};
      const subject=subjects.length?subjects[variantRaw%subjects.length]:fallbackSubject,selected=variants.length?variants[variantRaw%variants.length]:fallbackBody;
      const lines=(Array.isArray(selected)?selected:[selected]).filter(v=>v!=null&&String(v)!=='').map(v=>this.formatTemplateText(v,textVars));
      return{from,subject,body:lines.length?lines:fallbackBody}
    };
    const encounterLine=encounter==='station_xeno'
      ?({flirty:'Sweetie, Relay 10 says you cleared a whole xeno infestation on the way in. Big guns, nasty xenos, parcel still delivered. You do know how to show off for me.',warm:'Babe, Relay 10 also logged the xeno infestation. You were hired to move freight, not clear a swarm, but you handled it anyway.',terse:'Relay 10 also logged the xeno infestation. That was outside the delivery brief. Noted.',polished:'Relay 10 reported the xeno infestation on your approach. Clearing it was beyond the contracted delivery scope, and it has been noted.',clipped:'Additional action recorded: xeno infestation cleared at Relay 10. Outside tasking. Good work.',rough:'Those xeno grints at Relay 10 were not in the brief. You cleared them anyway. Fronking good work.',formal:'Relay 10 recorded an unplanned xeno infestation during your approach. Your successful clearance action has been added to the completion record.',warmrough:'Sweetie, Relay 10 says you cleared a whole xeno mess on the way in. That was not the job, but it was fronking appreciated.',dry:'Relay 10 appended “xeno infestation” to an otherwise routine delivery record. Apparently routine was too much to ask.',casual:'Relay 10 says you had xenos all over the approach. Nice work clearing the drass before you landed.'}[tone]||'An unplanned xeno infestation was cleared during the contract. The additional action has been noted.')
      :'';
    if(templateId==='contract_complete_v1'){
      let subject=`Contract complete: ${title}`,body=[];
      if(tone==='flirty')body=[variant===0?`Sweetie, ${title} is signed off. I do enjoy watching you make dangerous work look attractive.`:(variant===1?`Babe, that one is closed. You and that big armed drone are becoming terribly good at making me happy.`:`${title} is done, gorgeous. Try not to look too pleased with yourself.`),`VOX has released the contract payment. Standing change: +${rep}.`];
      else if(tone==='warm')body=[variant===0?`Sweetie, ${title} is signed off.`:(variant===1?`Babe, that one is closed.`:`${title} is done and dusted, sweetie.`),`VOX has released the contract payment. Standing change: +${rep}.`];
      else if(tone==='terse')body=[`${title}: closed.`,`Payment released through VOX. Standing +${rep}.`];
      else if(tone==='polished')body=[`Completion of “${title}” has been confirmed.`,`Payment has been released through VOX. Standing change: +${rep}.`];
      else if(tone==='clipped')body=[`Confirmed complete: ${title}.`,`Settlement released. Standing +${rep}.`];
      else if(tone==='rough')body=[variant===0?`That was fronking solid work on ${title}.`:`${title} is closed. No drass left for us to clean up.`,`VOX has the settlement moving. Standing +${rep}.`];
      else if(tone==='formal')body=[`Completion of “${title}” is confirmed.`,`The agreed settlement has been released through VOX. Standing change: +${rep}.`];
      else if(tone==='warmrough')body=[variant===0?`Babe, that was fronking nice work.`:`Sweetie, ${title} is closed and nobody important is shouting at me. Perfect.`,`Payment is released. Standing +${rep}.`];
      else if(tone==='dry')body=[variant===0?`Against several reasonable expectations, ${title} is complete.`:`${title} has reached the unlikely state of being finished.`,`VOX has released payment. Standing +${rep}.`];
      else body=[variant===0?`Nice one, X. ${title} is closed.`:`All sorted on ${title}.`,`Payment is through VOX. Standing +${rep}.`];
      if(encounterLine)body.splice(1,0,encounterLine);
      return{from,subject,body}
    }
    if(templateId==='quickbite_complete_v1'){
      const body=[`Dude, ${title} is done.`,encounterLine||'Nobody is yelling at me right now. Awesome.','Payment is through.'].filter(Boolean);
      return{from,subject:`DONE: ${title}`,body}
    }
    if(templateId==='gift_credits_v1'){
      const amount=Math.max(0,Number(vars.amount)||0),amountText=amount.toLocaleString();
      return renderRewardMail('credits',{amount:amountText,faction:f?.name||vars.faction||''},'Small discretionary bonus',[`CR ${amountText} has been attached to your VOX account. This is separate from the contract settlement.`])
    }
    if(templateId==='gift_item_v1'){
      const item=this.items[vars.itemId],itemName=item?.name||'equipment';
      return renderRewardMail('item',{item:itemName,faction:f?.name||vars.faction||''},`Courtesy issue: ${itemName}`,[`One ${itemName} has been released to your VOX workshop account. No invoice.`])
    }
    if(templateId==='gift_discount_v1'){
      const item=this.items[vars.itemId],itemName=item?.name||'equipment',pct=Math.round((Number(vars.percent)||.10)*100);
      return renderRewardMail('discount',{item:itemName,percent:pct,faction:f?.name||vars.faction||''},`Supplier concession: ${itemName}`,[`${pct}% off one purchase of ${itemName}.`])
    }
    return{from:vars.from||'VOX SYSTEM',subject:vars.subject||'Message',body:['Message template unavailable.']}
  }
  naturalMailSubject(subject){
    const raw=String(subject||'Message').trim();
    const letters=raw.match(/[A-Za-z]/g)||[];
    if(!letters.length||letters.some(ch=>ch>='a'&&ch<='z'))return raw;
    let out=raw.toLowerCase();
    out=out.replace(/\b(vox|osd|xp|cr|ai|rmb|lmb)\b/g,token=>token.toUpperCase());
    out=out.replace(/\bax-1\b/g,'AX-1');
    return out.replace(/[a-z]/,ch=>ch.toUpperCase())
  }
  resolveMail(message){
    if(!message)return message;
    if(!message.templateId)return{...message,subject:this.naturalMailSubject(message.subject)};
    const r=this.routineMailText(message.templateId,message.vars||{});
    return{...message,...r,subject:this.naturalMailSubject(r.subject),body:Array.isArray(r.body)?r.body:[String(r.body||'')]}
  }
  mailPriority(message){
    const p=String(message?.priority||'').toLowerCase();
    if(p==='medium')return 'normal';
    if(p==='low'||p==='normal'||p==='high')return p;
    if(message?.category==='story'||message?.action?.type==='story')return 'high';
    if(message?.reward||message?.category==='gift'||message?.category==='network'||message?.category==='system')return 'normal';
    if(message?.category==='faction')return 'low';
    return 'normal'
  }
  mailPriorityLabel(message){const p=this.mailPriority(message);return p==='high'?'HIGH':(p==='low'?'LOW':'NORMAL')}
  unreadMailCount(){return this.state.mail.reduce((n,m)=>n+(!m.read&&this.mailPriority(m)!=='low'?1:0),0)}
  unreadMailHasHigh(){return this.state.mail.some(m=>!m.read&&this.mailPriority(m)==='high')}
  noteMailVoice(priority){
    const p=String(priority||'').toLowerCase();
    if(p==='low')return;
    if(p==='high'||this.pendingMailVoicePriority!=='high')this.pendingMailVoicePriority=p==='high'?'high':'normal'
  }
  beginPostMissionVoiceHold(){this.deferHubVoiceNotifications=true}
  queueSkillPointReminder(){if(this.skillPointsAvailable()>0)this.pendingSkillPointVoice=true}
  flushHubVoiceNotifications(){
    if(this.deferHubVoiceNotifications)return;
    const mailPriority=this.pendingMailVoicePriority,skill=!!this.pendingSkillPointVoice&&this.skillPointsAvailable()>0;
    this.pendingMailVoicePriority=null;this.pendingSkillPointVoice=false;
    if(mailPriority){audio.playVoice(mailPriority==='high'?'mailImportant':'mailNormal',{once:false,priority:false})}
    if(skill)audio.playVoice('unspentSkillPoints',{once:false,priority:false,delayBeforeMs:mailPriority?1000:350})
  }
  closeMissionDebrief(returnPanel){
    this.deferHubVoiceNotifications=false;
    this.render();this.setPanel(returnPanel||'missions');
    this.flushHubVoiceNotifications()
  }
  enqueueMail(message){
    if(!message||!message.id)return false;
    if(this.state.mail.some(m=>m.id===message.id))return false;
    const compact=!!message.templateId;
    const entry={
      id:message.id,seq:++this.state.mailSeq,
      ...(compact?{templateId:message.templateId,vars:(message.vars&&typeof message.vars==='object')?message.vars:{}}:{from:message.from||'VOX SYSTEM',subject:message.subject||'Message',body:Array.isArray(message.body)?message.body:[String(message.body||'')]}),
      category:message.category||'general',priority:this.mailPriority(message),
      read:!!message.read,action:message.action||null,actions:Array.isArray(message.actions)?message.actions:null,reward:message.reward||null,claimed:!!message.claimed
    };
    this.state.mail.push(entry);
    this.noteMailVoice(entry.priority);
    if(this.state.mail.length>100){
      const removable=[...this.state.mail].sort((a,b)=>a.seq-b.seq).find(m=>m.read&&m.category!=='story'&&!m.reward&&!m.action);
      if(removable)this.state.mail=this.state.mail.filter(m=>m.id!==removable.id)
    }
    this.save();this.updateMailBadge();return true
  }
  ensureWelcomeMail(){
    const body=[
      'Your Vector Operations Exchange remote-combat contractor account is now active.',
      'VOX brokers work between independent operators and client networks, holds contract payments, records reputation and provides access to approved equipment suppliers.',
      'You have been allocated one AX-1 general-purpose drone under the basic replacement scheme. The AX-1 frame is replaced free if destroyed. Consumables are expendable and permanent fitted hardware is subject to your current insurance excess.',
      'Complete ordinary work to build experience, credits and standing. Better relationships can expose equipment before your operator level would normally bring it to market.',
      'Try not to destroy anything the client did not ask you to destroy.'
    ];
    const actions=[
      {type:'tutorial',tutorialId:'movement_shooting',label:'START SIMULATOR'},
      {type:'panel',panel:'missions',label:'VIEW AVAILABLE CONTRACTS'}
    ];
    const existing=this.state.mail.find(m=>m.id==='welcome_vox');
    if(existing){
      // Upgrade old saves as well as fresh accounts, otherwise Dave's existing
      // welcome message would never gain the simulator button because mail IDs are unique.
      let changed=false;
      if(JSON.stringify(existing.body)!==JSON.stringify(body)){existing.body=body;changed=true}
      if(JSON.stringify(existing.actions)!==JSON.stringify(actions)){existing.actions=actions;changed=true}
      if(existing.action){existing.action=null;changed=true}
      if(changed)this.save();
      return false
    }
    return this.enqueueMail({
      id:'welcome_vox',from:'Mara Venn · Contractor Services, VOX',subject:'Welcome to VOX / AX-1 allocation',category:'system',priority:'normal',
      body,actions
    })
  }
  tutorialMission(id='movement_shooting'){
    if(id!=='movement_shooting')return null;
    return{
      id:'tutorial_movement_shooting',title:'VOX Simulator',kind:'tutorial',family:'tutorial',training:true,private:true,
      faction:null,risk:0,minLevel:1,minRep:-100,pay:0,xp:0,difficulty:3,implemented:true,
      description:'VOX contractor simulator.',
      modules:[
        {type:'asteroids',label:'Movement & Shooting',target:5,difficulty:3,tutorial:true,tutorialStaticCut:true},
        // Stage 2 teaches hostile-projectile interception, sustained RMB target lock,
        // and using the locked target's double-chevron off-screen direction cue.
        {type:'fighters',label:'Pirate Combat',target:999,fighterHp:12,difficulty:2,tutorial:true,tutorialPreview:true,tutorialCombat:true},
        // Stage 3 teaches numbered consumable use under pressure. Pirate drones use
        // the planetary-drone meshes for visual variety while retaining space-combat AI.
        {type:'fighters',label:'Consumables',target:999,fighterHp:20,difficulty:2,tutorial:true,tutorialPreview:true,tutorialConsumables:true,tutorialDroneSwarm:true},
        // Stage 4 demonstrates mission abandonment as the survival option when the
        // operator is already at critical shields and has no recovery consumable.
        {type:'fighters',label:'Emergency Withdrawal',target:999,fighterHp:20,difficulty:3,tutorial:true,tutorialPreview:true,tutorialAbandon:true},
        // Stage 5 is one continuous final exercise: normal planet descent, open-plains
        // navigation to a bunker, autopilot entry, tunnel obstacle run, reactor and escape.
        {type:'tutorial_final_run',label:'Navigation / Reactor Run',difficulty:2,tutorial:true,tutorialFinalRun:true}
      ],
      stages:['Movement & Shooting','Pirate Combat','Consumables','Emergency Withdrawal','Navigation / Reactor Run']
    }
  }
  launchTutorial(id='movement_shooting'){
    if(this.currentMission||this.pendingMission)return false;
    const m=this.tutorialMission(id);if(!m)return false;
    this.currentMission=m;this.pendingMission=null;this.currentStageIndex=0;
    this.activeLoadout=[null,null,null,null];this.activeInternalLoadout=[null,null,null,null];
    this.open=false;campaignShell.classList.remove('open');this.updateGearHud();
    level=1;
    audio.music.setMode('calm');audio.resetMissionVoices();
    reset({deferMissionStart:true});paused=false;document.body.classList.remove('paused');last=performance.now();
    const stage=m.modules[0];scenarioFlow.prepareStage(stage);scenarioFlow.enterStage(stage,{via:'simulator',mission:m});
    return true
  }
  finishTraining(success=true,reason=''){
    const m=this.currentMission;if(!m?.training)return false;
    asteroidField.stop();
    this.activeLoadout=[null,null,null,null];this.activeInternalLoadout=[null,null,null,null];
    this.currentMission=null;this.currentStageIndex=0;this.updateGearHud();

    // The VOX training insurance benefit is awarded exactly once. Re-running the
    // simulator must never stack additional discounts or generate duplicate mail.
    if(success&&!this.state.trainingInsuranceBenefit){
      this.state.trainingInsuranceBenefit=true;
      this.beginPostMissionVoiceHold();
      this.enqueueMail({
        id:'vox_training_insurance_benefit',
        from:'VOX Insurance Services',
        subject:'Training completion / insurance benefit applied',
        category:'system',
        priority:'high',
        body:[
          'Congratulations on completing the VOX Drone Training Simulation.',
          'VOX Insurance Services has applied a training-completion benefit to your contractor account.',
          'Future insurance excess payments are reduced by 1%.',
          'TRAINING BENEFIT: INSURANCE EXCESS PAYMENTS -1%'
        ]
      });
      this.save();
    }

    paused=true;document.body.classList.add('paused');
    this.showDebrief({training:true,success,heading:success?'SIMULATOR COMPLETE':'SIMULATION ENDED',title:m.title,pay:0,xp:0,liability:0,reason,returnPanel:'mail'});
    return true
  }
  updateMailBadge(){
    const badge=document.getElementById('mailUnreadBadge'),tab=document.querySelector('.campaignTab[data-tab="mail"]'),n=this.unreadMailCount(),high=this.unreadMailHasHigh();
    if(badge){badge.textContent=String(n);badge.hidden=n<1;badge.classList.toggle('high',high);badge.classList.toggle('normal',n>0&&!high)}
    if(tab){tab.classList.toggle('hasUnread',n>0);tab.classList.toggle('hasHighUnread',high);tab.classList.toggle('hasNormalUnread',n>0&&!high)}
  }
  markMailRead(id){
    const m=this.state.mail.find(x=>x.id===id);if(!m||m.read)return false;
    m.read=true;this.save();this.updateMailBadge();return true
  }
  missionClientName(m){return m?.clientName||this.factions[m?.faction]?.name||'Private client'}
  storyContract(id){return globalThis.AgentXStoryContent.contract(id)}
  storyOfferMail(id){return globalThis.AgentXStoryContent.offerMail(id)}
  devStoryMailOptions(){return globalThis.AgentXStoryContent.devMailOptions()}
  devSendStoryMail(contractId){
    if(this.currentMission||this.pendingMission)return{ok:false,reason:'Finish or abandon the active/prepared mission first.'};
    const offer=this.storyOfferMail(contractId),contract=this.storyContract(contractId);
    if(!offer||!contract)return{ok:false,reason:'That story mission is not implemented yet.'};

    // Reset only this story contract's mail/progression so the offer can be tested
    // repeatedly without disturbing ordinary faction reputation, money or contracts.
    if(contractId==='mara_signal_1'){
      const ids=new Set(['mara_offer_1','mara_wait_1']);
      this.state.mail=this.state.mail.filter(m=>!ids.has(m.id));
      delete this.state.mailFlags.maraOffer1;
      delete this.state.mailFlags.mara1Done;
      delete this.state.mailFlags.mara1CompletedAt;
      this.state.mailFlags.maraOffer1=true;
    }else if(contractId==='mara_signal_2'){
      const ids=new Set(['mara_offer_2','mara_wait_2']);
      this.state.mail=this.state.mail.filter(m=>!ids.has(m.id));
      delete this.state.mailFlags.maraOffer2;
      delete this.state.mailFlags.mara2Done;
      delete this.state.mailFlags.mara2CompletedAt;
      this.state.mailFlags.maraOffer2=true;
    }
    else if(contractId==='kudo_defence_1'){
      const ids=new Set(['kudo_offer_1','kudo_wait_1']);
      this.state.mail=this.state.mail.filter(m=>!ids.has(m.id));
      delete this.state.mailFlags.kudoOffer1;
      delete this.state.mailFlags.kudo1Done;
      delete this.state.mailFlags.kudo1CompletedAt;
      this.state.mailFlags.kudoOffer1=true;
    }
    else if(contractId==='kudo_bunker_2'){
      const ids=new Set(['kudo_offer_2','kudo_wait_2']);
      this.state.mail=this.state.mail.filter(m=>!ids.has(m.id));
      delete this.state.mailFlags.kudoOffer2;
      delete this.state.mailFlags.kudo2Done;
      delete this.state.mailFlags.kudo2CompletedAt;
      this.state.mailFlags.kudoOffer2=true;
    }
    else if(contractId==='corvella_manifest_1'){
      const ids=new Set(['corvella_offer_1','corvella_wait_1']);
      this.state.mail=this.state.mail.filter(m=>!ids.has(m.id));
      delete this.state.mailFlags.corvellaOffer1;
      delete this.state.mailFlags.corvella1Done;
      delete this.state.mailFlags.corvella1CompletedAt;
      this.state.mailFlags.corvellaOffer1=true;
    }
    else if(contractId==='cassian_favour_1'){
      const ids=new Set(['mara_manifest_1','cassian_offer_1','cassian_wait_1']);
      this.state.mail=this.state.mail.filter(m=>!ids.has(m.id));
      delete this.state.mailFlags.cassianOffer1;
      delete this.state.mailFlags.cassian1Done;
      delete this.state.mailFlags.cassian1CompletedAt;
      this.state.mailFlags.cassianOffer1=true;
    }

    if(!this.enqueueMail(offer))return{ok:false,reason:'Could not enqueue story email.'};
    this.selectedMailId=offer.id;
    this.mailFilter='all';
    this.save();
    this.renderMail();
    return{ok:true,mailId:offer.id,label:offer.subject}
  }
  prepareStoryContract(id){
    if(this.currentMission||this.pendingMission)return false;
    const m=this.storyContract(id);if(!m)return false;
    this.pendingMission=m;this.save();this.render();this.setPanel('workshop');return true
  }
  evaluateMailTriggers(){
    this.ensureWelcomeMail();
    const flags=this.state.mailFlags,lvl=this.levelForXP();
    // Retire the two placeholder VOX story missions from earlier development saves.
    // Story mission 1 has now been replaced by the real courier-recovery opener, so
    // stale prototype mail/flags must not hide it or launch the discarded follow-up.
    if(!flags.voxStoryRecoveryRevision){
      const legacyStoryMail=new Set(['mara_offer_1','mara_offer_2','mara_wait_1','mara_wait_2']);
      this.state.mail=this.state.mail.filter(m=>!legacyStoryMail.has(m.id));
      delete flags.maraOffer1;delete flags.mara1Done;delete flags.mara1CompletedAt;
      delete flags.maraOffer2;delete flags.mara2Done;delete flags.mara2CompletedAt;
      flags.voxStoryRecoveryRevision=1;
    }
    // Mission 2 now has a real authored implementation. Remove only stale prototype
    // mission-2 mail from saves that passed the earlier recovery migration before this
    // version existed; mission 1 completion will enqueue the new concrete follow-up.
    if(!flags.voxStoryMonolithRevision){
      if(!flags.mara2Done){
        const staleM2=new Set(['mara_offer_2','mara_wait_2']);
        this.state.mail=this.state.mail.filter(m=>!staleM2.has(m.id));
        delete flags.maraOffer2;delete flags.mara2CompletedAt;
      }
      flags.voxStoryMonolithRevision=1;
    }
    // Replace the superseded mission-2 reveal on existing saves. Node 42 is
    // genuine Partition War hardware; the mystery is that it is active. Completing
    // that mission now hands the thread to Kudo for an immediate station defence.
    if(!flags.voxStoryKudoHandoffRevision){
      if(flags.mara2Done&&!flags.kudo1Done){
        this.state.mail=this.state.mail.filter(m=>m.id!=='mara_wait_2'&&m.id!=='kudo_offer_1');
        this.enqueueMail(globalThis.AgentXStoryContent.completionMail('mara_signal_2'));
        flags.kudoOffer1=true;
        this.enqueueMail(this.storyOfferMail('kudo_defence_1'))
      }
      flags.voxStoryKudoHandoffRevision=1;
    }
    if(!flags.voxStoryKudoBunkerRevision){
      if(flags.kudo1Done&&!flags.kudo2Done&&!this.state.mail.some(m=>m.id==='kudo_offer_2')){
        flags.kudoOffer2=true;
        this.enqueueMail(this.storyOfferMail('kudo_bunker_2'))
      }
      flags.voxStoryKudoBunkerRevision=1;
    }
    // Existing saves that already completed Source Trace should receive the new
    // OSD analysis and Free Traders hand-off once, just like a newly completed run.
    if(!flags.freeTraderManifestRevision){
      if(flags.kudo2Done&&!flags.corvella1Done){
        if(!this.state.mail.some(m=>m.id==='kudo_wait_2'))this.enqueueMail(globalThis.AgentXStoryContent.completionMail('kudo_bunker_2'));
        if(!this.state.mail.some(m=>m.id==='corvella_offer_1')){
          flags.corvellaOffer1=true;this.enqueueMail(this.storyOfferMail('corvella_manifest_1'))
        }
      }
      flags.freeTraderManifestRevision=1;
    }
    // Continue the VOX story after Missing Manifest. Existing saves that already
    // completed Corvella's recovery receive Mara's referral and Cassian's favour once.
    if(!flags.cassianFavourRevision){
      if(flags.corvella1Done&&!flags.cassian1Done){
        if(!this.state.mail.some(m=>m.id==='mara_manifest_1'))this.enqueueMail({
          id:'mara_manifest_1',from:'Mara Venn · Contractor Services, VOX',subject:'Off the books',category:'story',priority:'high',
          body:[
            'Corvella sent me the recorder extract. The carrier made an undeclared transfer during the diversion. Part of the cargo left the ship there and vanished from the legitimate freight system.',
            'VOX can follow paperwork. There is no paperwork after that point.',
            'I need someone who works comfortably without it. Cassian Erivan-Snade has agreed to look. “Agreed” may be generous. He knows you are coming and will almost certainly want something first.',
            'Do the minimum necessary. I want his information, not a Red Jackal apprenticeship.'
          ]
        });
        if(!this.state.mail.some(m=>m.id==='cassian_offer_1')){
          flags.cassianOffer1=true;this.enqueueMail(this.storyOfferMail('cassian_favour_1'))
        }
      }
      flags.cassianFavourRevision=1;
    }
    if(this.state.completed>=2&&lvl>=2&&!flags.maraOffer1&&!flags.mara1Done){
      flags.maraOffer1=true;
      this.enqueueMail(this.storyOfferMail('mara_signal_1'))
    }
    // Story mission 2 is handed out directly by Mara's completion mail for mission 1.
    // It deliberately does not also auto-enqueue here, which would duplicate the offer.
  }
  handleStoryCompletion(m){
    if(!m?.storyFlag)return;
    const flags=this.state.mailFlags;
    if(m.storyFlag==='mara1'&&!flags.mara1Done){
      flags.mara1Done=true;flags.mara1CompletedAt=this.state.completed;
      flags.maraOffer2=true;
      const authored=globalThis.AgentXStoryContent.completionMail('mara_signal_1');
      if(authored)this.enqueueMail(authored)
    }
    if(m.storyFlag==='mara2'&&!flags.mara2Done){
      flags.mara2Done=true;flags.mara2CompletedAt=this.state.completed;flags.kudoOffer1=true;flags.voxStoryKudoHandoffRevision=1;
      this.enqueueMail(globalThis.AgentXStoryContent.completionMail('mara_signal_2'));
      this.enqueueMail(this.storyOfferMail('kudo_defence_1'))
    }
    if(m.storyFlag==='kudo1'&&!flags.kudo1Done){
      flags.kudo1Done=true;flags.kudo1CompletedAt=this.state.completed;flags.kudoOffer2=true;flags.voxStoryKudoBunkerRevision=1;
      this.enqueueMail(this.storyOfferMail('kudo_bunker_2'))
    }
    if(m.storyFlag==='kudo2'&&!flags.kudo2Done){
      flags.kudo2Done=true;flags.kudo2CompletedAt=this.state.completed;flags.corvellaOffer1=true;flags.freeTraderManifestRevision=1;
      this.enqueueMail(globalThis.AgentXStoryContent.completionMail('kudo_bunker_2'));
      this.enqueueMail(this.storyOfferMail('corvella_manifest_1'))
    }
    if(m.storyFlag==='corvella1'&&!flags.corvella1Done){
      flags.corvella1Done=true;flags.corvella1CompletedAt=this.state.completed;flags.cassianOffer1=true;flags.cassianFavourRevision=1;
      const authored=globalThis.AgentXStoryContent.completionMail('corvella_manifest_1');
      if(authored)this.enqueueMail(authored);
      this.enqueueMail({
        id:'mara_manifest_1',from:'Mara Venn · Contractor Services, VOX',subject:'Off the books',category:'story',priority:'high',
        body:[
          'Corvella sent me the recorder extract. The carrier made an undeclared transfer during the diversion. Part of the cargo left the ship there and vanished from the legitimate freight system.',
          'VOX can follow paperwork. There is no paperwork after that point.',
          'I need someone who works comfortably without it. Cassian Erivan-Snade has agreed to look. “Agreed” may be generous. He knows you are coming and will almost certainly want something first.',
          'Do the minimum necessary. I want his information, not a Red Jackal apprenticeship.'
        ]
      });
      this.enqueueMail(this.storyOfferMail('cassian_favour_1'))
    }
    if(m.storyFlag==='cassian1'&&!flags.cassian1Done){
      flags.cassian1Done=true;flags.cassian1CompletedAt=this.state.completed;
      const authored=globalThis.AgentXStoryContent.completionMail('cassian_favour_1');
      if(authored)this.enqueueMail(authored)
    }
  }
  queueContractMail(m,repGain){
    const f=this.factions[m?.faction];if(!f||m.private)return;
    const template=m?.templateId?this.missionTemplate(m.templateId):null,pack=template?.presentation?.[m.faction]||null;
    if(template&&pack){
      const encounter=this.missionEncounterTag(m),completionSeed=this.hashText(`${m.id}|template-complete`),subjectCount=Math.max(1,pack.completionSubjects?.length||0),bodyCount=Math.max(1,pack.completionBodies?.length||0),encounterCount=Math.max(1,pack.encounterAcknowledgements?.[encounter]?.length||0);
      this.enqueueMail({
        id:`complete_${this.state.completed}_${m.id}`,templateId:'mission_template_complete_v1',
        vars:{missionTemplateId:m.templateId,faction:m.faction,title:m.title,cargo:m.cargo||'',destination:m.destination||'',target:m.targetGroup||'',motive:m.motive||'',situation:m.situation||'',credits:m.pay,repGain,encounter,subjectVariant:completionSeed%subjectCount,bodyVariant:Math.floor(completionSeed/7)%bodyCount,encounterVariant:Math.floor(completionSeed/13)%encounterCount},
        category:'faction',priority:encounter?'normal':'low'
      });
      const personal=pack.personalFollowUp||{},encounterFollowups=Array.isArray(personal.encounterBodies?.[encounter])?personal.encounterBodies[encounter]:[],followups=encounterFollowups.length?encounterFollowups:(Array.isArray(personal.bodies)?personal.bodies:(Array.isArray(pack.personalFollowups)?pack.personalFollowups:[]));
      const baseChance=Math.max(0,Math.min(1,Number(personal.chance??pack.personalChance)||0)),personalChance=encounter?Math.max(baseChance,Math.max(0,Math.min(1,Number(personal.encounterChance)||0))):baseChance,minRisk=Math.max(1,Number(personal.minRisk)||5),encounterMinRisk=Math.max(1,Number(personal.encounterMinRisk)||1);
      const forceFollowUp=!!m.devForceFollowUp;
      if(followups.length&&(forceFollowUp||((m.risk||1)>=(encounter?encounterMinRisk:minRisk)&&Math.random()<personalChance))){
        const contact=this.contactFromId(personal.contactId||pack.contactId)||this.contactForMission(m),personalSeed=this.hashText(`${m.id}|template-personal|${encounter}`),subjectCount=Math.max(1,personal.subjects?.length||0);
        this.enqueueMail({
          id:`personal_${this.state.completed}_${m.id}`,templateId:'mission_template_personal_v1',
          vars:{missionTemplateId:m.templateId,contactId:contact?.id||'',faction:m.faction,title:m.title,cargo:m.cargo||'',destination:m.destination||'',target:m.targetGroup||'',motive:m.motive||'',situation:m.situation||'',credits:m.pay,repGain,encounter,subjectVariant:personalSeed%subjectCount,bodyVariant:Math.floor(personalSeed/7)%followups.length},
          category:'faction',priority:'normal'
        })
      }
      return
    }
    const contact=this.contactForMission(m),encounter=this.missionEncounterTag(m),variant=this.hashText(`${m.id}|complete`)%3;
    this.enqueueMail({
      id:`complete_${this.state.completed}_${m.id}`,
      templateId:m.faction==='quickbite'?'quickbite_complete_v1':'contract_complete_v1',
      vars:{contactId:contact?.id||'',faction:m.faction,title:m.title,repGain,encounter,variant},
      category:'faction',priority:encounter?'normal':'low'
    })
  }
  queueContractFailureMail(m,outcome='failed',reason=''){
    const f=this.factions[m?.faction];if(!f||m.private)return;
    const template=m?.templateId?this.missionTemplate(m.templateId):null,pack=template?.presentation?.[m.faction]||null;
    if(!template||!pack)return;
    const abandoned=outcome==='abandoned',reaction=abandoned?(pack.abandonMail||{}):(pack.failureMail||{}),bodies=Array.isArray(reaction.bodies)?reaction.bodies:[],civilian=this.templateCivilianSettlement(m);
    if(!bodies.length)return;
    const contact=this.contactFromId(reaction.contactId||pack.contactId)||this.contactForMission(m),seed=this.hashText(`${m.id}|template-${abandoned?'abandoned':'failed'}`),subjects=Array.isArray(reaction.subjects)?reaction.subjects:[];
    this.enqueueMail({
      id:`${abandoned?'abandon':'failed'}_${this.state.failed}_${m.id}`,
      templateId:'mission_template_failure_v1',
      vars:{missionTemplateId:m.templateId,contactId:contact?.id||'',faction:m.faction,title:m.title,cargo:m.cargo||'',destination:m.destination||'',target:m.targetGroup||'',motive:m.motive||'',situation:m.situation||'',reason:String(reason||''),outcome:abandoned?'abandoned':'failed',subjectVariant:seed%Math.max(1,subjects.length),bodyVariant:Math.floor(seed/7)%bodies.length,civilianIncidents:civilian?.incidents||0,civilianAssaults:civilian?.assaults||0,civilianCollisions:civilian?.collisions||0,civilianVariant:Math.floor(seed/13)},
      category:'faction',priority:'normal'
    })
  }
  queueTemplateCivilianIncidentMail(m,settlement,actualPay){
    const template=m?.templateId?this.missionTemplate(m.templateId):null,pack=template?.presentation?.[m?.faction]||null,reaction=pack?.civilianTrafficMail||null;
    if(!template||!pack||!reaction||!(settlement?.incidents>0))return false;
    const contact=this.contactFromId(reaction.contactId||pack.contactId)||this.contactForMission(m),assault=settlement.assaults>0,subjects=assault?(reaction.assaultSubjects||reaction.subjects||[]):(reaction.incidentSubjects||reaction.subjects||[]),bodies=assault?(reaction.assaultBodies||reaction.bodies||[]):(reaction.incidentBodies||reaction.bodies||[]);
    if(!bodies.length)return false;
    const seed=this.hashText(`${m.id}|civilian-traffic|${settlement.assaults}|${settlement.collisions}`);
    this.enqueueMail({
      id:`civilian_${this.state.completed}_${m.id}`,templateId:'mission_template_civilian_v1',
      vars:{missionTemplateId:m.templateId,contactId:contact?.id||'',faction:m.faction,cargo:m.cargo||'',destination:m.destination||'',credits:actualPay,fullCredits:m.pay,incidents:settlement.incidents,assaults:settlement.assaults,collisions:settlement.collisions,subjectVariant:seed%Math.max(1,subjects.length),bodyVariant:Math.floor(seed/7)%bodies.length},
      category:'faction',priority:'high'
    });
    return true
  }
  queueJackalCivilianIncidentMail(m,settlement,actualPay){
    const n=Math.max(1,settlement?.incidents|0),full=Number(m?.pay)||0;
    let subject='Keep it quiet',body=[];
    if(n===1){
      subject='You brought heat onto the route';
      body=[
        'One civilian incident on a quiet delivery is one too many. That kind of attention gets routes watched and doors closed.',
        `We cut the settlement from CR ${full.toLocaleString()} to CR ${actualPay.toLocaleString()}. Do cleaner work next time.`,
        'There will be no courtesy bonus on this run.'
      ]
    }else if(n===2){
      subject='Too much heat';
      body=[
        'Two civilian incidents on one delivery is not subtle. We had to spend contacts cooling the route down after you left.',
        `Your CR ${full.toLocaleString()} contract has been cut to CR ${actualPay.toLocaleString()}.`,
        'No bonus. No gift. Next time keep the traffic out of your guns and your flight path.'
      ]
    }else{
      subject='No payment. You made a mess.';
      body=[
        `${n} civilian incidents turned a discreet delivery into exactly the sort of public spectacle we paid you to avoid.`,
        `The CR ${full.toLocaleString()} settlement has been cancelled. We are not paying for a job that brings that much heat onto a Jackal route.`,
        'If you want future work, learn the difference between customs and civilians.'
      ]
    }
    this.enqueueMail({id:`jackal_heat_${this.state.completed}_${m.id}`,from:'Red Jackal Combine · Route Handler',subject,category:'network',priority:'normal',body})
  }
  maybeQueueFactionGift(m){
    const f=this.factions[m?.faction];if(!f||m.private)return;
    const encounter=this.missionEncounterTag(m),chance=encounter?0.58:0.28;
    if(Math.random()>=chance)return;
    const contact=this.contactForMission(m),roll=Math.random(),id=`gift_${this.state.completed}_${m.id}`,variant=this.hashText(id);
    if(roll<.40){
      const amount=Math.round((125+Math.min(6,m.risk||1)*55+Math.random()*150+(encounter?175:0))/25)*25;
      this.enqueueMail({id,templateId:'gift_credits_v1',vars:{contactId:contact?.id||'',faction:m.faction,title:m.title,encounter,amount,variant},category:'gift',priority:'normal',reward:{type:'credits',amount}})
    }else if(roll<.75){
      const tier=this.marketAccessTier()>=2&&Math.random()>.55?2:1;
      const choices=tier===2?['shieldBooster2','homingMissile2']:['shieldBooster','homingMissile'];
      const itemId=choices[(Math.random()*choices.length)|0];
      this.enqueueMail({id,templateId:'gift_item_v1',vars:{contactId:contact?.id||'',faction:m.faction,title:m.title,encounter,itemId,variant},category:'gift',priority:'normal',reward:{type:'item',itemId,count:1}})
    }else{
      const candidates=this.shop.filter(it=>it.slot==='internal'&&this.productAccess(it).ok&&it.tier<=Math.max(1,this.normalMarketTier()));
      const item=candidates[(Math.random()*candidates.length)|0]||this.items.shieldExtender;
      this.enqueueMail({id,templateId:'gift_discount_v1',vars:{contactId:contact?.id||'',faction:m.faction,title:m.title,encounter,itemId:item.id,percent:.10,variant},category:'gift',priority:'normal',reward:{type:'discount',itemId:item.id,percent:.10,uses:1}})
    }
  }
  claimMailReward(mailId){
    const m=this.state.mail.find(x=>x.id===mailId),r=m?.reward;if(!m||!r||m.claimed)return false;
    if(r.type==='credits')this.state.money+=Math.max(0,Math.round(Number(r.amount)||0));
    else if(r.type==='item'&&this.items[r.itemId])this.state.inventory[r.itemId]=(this.state.inventory[r.itemId]||0)+Math.max(1,Math.round(Number(r.count)||1));
    else if(r.type==='discount'&&this.items[r.itemId]){
      const old=this.state.discounts[r.itemId]||{percent:0,uses:0};
      this.state.discounts[r.itemId]={percent:Math.max(Number(old.percent)||0,Number(r.percent)||.10),uses:(Number(old.uses)||0)+Math.max(1,Math.round(Number(r.uses)||1))}
    }else return false;
    m.claimed=true;m.read=true;this.save();this.renderHeader();this.renderShop();this.renderWorkshop();this.renderProgressionSandbox();this.renderMail();return true
  }
  marketPrice(product){
    if(!product||product.productType==='frame')return Number(product?.price)||0;
    const d=this.state.discounts?.[product.id];if(!d||!(d.uses>0)||!(d.percent>0))return Number(product.price)||0;
    return Math.max(0,Math.round((product.price*(1-d.percent))/10)*10)
  }
  consumeMarketDiscount(id){
    const d=this.state.discounts?.[id];if(!d||!(d.uses>0))return;
    d.uses--;if(d.uses<=0)delete this.state.discounts[id]
  }
  renderMail(){
    const host=document.getElementById('mailGrid');if(!host)return;
    this.updateMailBadge();host.innerHTML='';
    const all=[...this.state.mail].sort((a,b)=>(b.seq||0)-(a.seq||0));
    if(!all.length){host.innerHTML='<div class="catalogEmptyDetail">No mail.</div>';return}
    const filters=[['all','ALL'],['high','HIGH'],['normal','NORMAL'],['low','LOW'],['unread','UNREAD']];
    const bar=document.createElement('div');bar.className='mailFilters';
    for(const [id,label] of filters){
      const b=document.createElement('button');b.type='button';b.className=`mailFilter${this.mailFilter===id?' active':''}`;b.textContent=label;
      b.addEventListener('click',()=>{this.mailFilter=id;this.renderMail()});bar.appendChild(b)
    }
    const matches=m=>{const p=this.mailPriority(m);if(this.mailFilter==='all')return true;if(this.mailFilter==='unread')return !m.read||m.id===this.selectedMailId;return p===this.mailFilter};
    const mails=all.filter(matches);
    if(!mails.some(m=>m.id===this.selectedMailId))this.selectedMailId=(mails.find(m=>!m.read)||mails[0]||null)?.id||null;
    const layout=document.createElement('div');layout.className='mailLayout';
    const list=document.createElement('div');list.className='mailList cabinetScrollBody';list.setAttribute('aria-label','Mail inbox');list.tabIndex=0;
    const detail=document.createElement('section');detail.className='mailDetail cabinetScrollBody';detail.tabIndex=0;
    const wrapMailScroller=(body,kind)=>{
      const shell=document.createElement('div');shell.className=`mailScrollHost ${kind} cabinetScrollHost`;
      const track=document.createElement('div');track.className='cabinetScrollbar';track.setAttribute('aria-hidden','true');track.innerHTML='<div class="cabinetScrollThumb" tabindex="-1"></div>';
      shell.append(body,track);return{shell,track}
    };
    if(!mails.length){list.innerHTML='<div class="mailEmpty">No messages in this filter.</div>';detail.innerHTML='<div class="catalogEmptyDetail">Choose another mail filter.</div>'}
    for(const m of mails){
      const view=this.resolveMail(m),p=this.mailPriority(m),label=this.mailPriorityLabel(m);
      const row=document.createElement('button');row.type='button';row.className=`mailRow priority-${p}${m.id===this.selectedMailId?' selected':''}${m.read?'':' unread'}`;
      row.innerHTML=`<span class="mailRowSubject">${this.escapeHtml(view.subject)}</span><span class="mailRowFrom">${this.escapeHtml(view.from)}</span><span class="mailPriority">${label}</span>${m.read?'':'<span class="mailNew">NEW</span>'}`;
      row.addEventListener('click',()=>{this.selectedMailId=m.id;this.markMailRead(m.id);this.renderMail()});list.appendChild(row)
    }
    const m=mails.find(x=>x.id===this.selectedMailId);
    if(m){
      const view=this.resolveMail(m),body=view.body.map(p=>`<p>${this.escapeHtml(p)}</p>`).join(''),priority=this.mailPriorityLabel(m);
      const welcomeSimulator=m.id==='welcome_vox'&&Array.isArray(m.actions)&&m.actions.some(a=>a?.type==='tutorial');
      detail.innerHTML=`<div class="mailDetailKicker priority-${this.mailPriority(m)}">${this.escapeHtml(m.category.toUpperCase())} · ${priority} PRIORITY</div><h2>${this.escapeHtml(view.subject)}</h2><div class="mailFrom">FROM ${this.escapeHtml(view.from)}</div><div class="mailBody">${body}</div><div class="mailActions${welcomeSimulator?' welcomeSimulatorActions':''}"></div>`;
      const actions=detail.querySelector('.mailActions');
      if(welcomeSimulator){
        const recommendation=document.createElement('div');
        recommendation.className='mailSimulatorRecommendation';
        recommendation.textContent='New pilots: simulator training strongly recommended';
        actions.appendChild(recommendation);
      }
      if(m.reward){
        const r=m.reward;let label='CLAIM';
        if(r.type==='credits')label=`CLAIM CR ${Number(r.amount||0).toLocaleString()}`;
        else if(r.type==='item')label=`CLAIM ${this.items[r.itemId]?.name||'ITEM'}`;
        else if(r.type==='discount')label=`CLAIM ${Math.round((r.percent||.10)*100)}% DISCOUNT`;
        const b=document.createElement('button');b.type='button';b.className='mailPrimaryAction';b.textContent=m.claimed?'CLAIMED':label;b.disabled=!!m.claimed;b.addEventListener('click',()=>this.claimMailReward(m.id));actions.appendChild(b)
      }
      const mailActions=Array.isArray(m.actions)&&m.actions.length?m.actions:(m.action?[m.action]:[]);
      for(const action of mailActions){
        if(action?.type==='panel'){
          const b=document.createElement('button');b.type='button';b.className=`mailPrimaryAction${welcomeSimulator?' mailSecondaryAction':''}`;b.textContent=action.label||'OPEN';b.addEventListener('click',()=>this.setPanel(action.panel||'missions'));actions.appendChild(b)
        }else if(action?.type==='tutorial'){
          const active=!!this.currentMission,prepared=!!this.pendingMission;
          const b=document.createElement('button');b.type='button';b.className=`mailPrimaryAction${welcomeSimulator?' mailSimulatorAction':''}`;b.textContent=active?'SIMULATOR UNAVAILABLE':(action.label||'START SIMULATOR');b.disabled=active||prepared;b.addEventListener('click',()=>this.launchTutorial(action.tutorialId||'movement_shooting'));actions.appendChild(b)
          if(welcomeSimulator){
            const skipNote=document.createElement('div');
            skipNote.className='mailBody mailSimulatorSkipNote';
            skipNote.textContent='Or if you are experienced with the drone controls, you may go straight to available contracts.';
            actions.appendChild(skipNote);
          }
        }else if(action?.type==='story'){
          const contract=this.storyContract(action.contractId),done=contract&&this.state.mailFlags[`${contract.storyFlag}Done`],active=this.currentMission?.storyContractId===action.contractId,prepared=this.pendingMission?.storyContractId===action.contractId;
          const b=document.createElement('button');b.type='button';b.className='mailPrimaryAction';b.textContent=done?'ASSIGNMENT COMPLETE':(active?'ASSIGNMENT IN FLIGHT':(prepared?'ASSIGNMENT PREPARED':(action.label||'OPEN PRIVATE CONTRACT')));b.disabled=!!done||!!active||!!prepared||!!this.currentMission||!!this.pendingMission;b.addEventListener('click',()=>this.prepareStoryContract(action.contractId));actions.appendChild(b)
        }
      }
    }
    const listScroll=wrapMailScroller(list,'mailListScrollHost'),detailScroll=wrapMailScroller(detail,'mailDetailScrollHost');
    layout.append(listScroll.shell,detailScroll.shell);host.append(bar,layout);
    // Use the exact same draggable outline scrollbar component as the rest of the
    // cabinet UI. The inbox/detail panes are dynamic, so initialise after insertion.
    requestAnimationFrame(()=>{
      if(typeof CabinetScrollbar==='function'){
        new CabinetScrollbar(list,listScroll.track);new CabinetScrollbar(detail,detailScroll.track)
      }
    });
    this.updateMailBadge()
  }


  load(){
    try{
      const raw=localStorage.getItem(this.storageKey);
      if(!raw)return this.defaultState();
      const saved=JSON.parse(raw),base=this.defaultState();
      return {...base,...saved,skills:Array.isArray(saved.skills)?saved.skills:[],ownedFrames:Array.isArray(saved.ownedFrames)?saved.ownedFrames:['AX-1'],inventory:{...base.inventory,...(saved.inventory||{})},frameLoadouts:(saved.frameLoadouts&&typeof saved.frameLoadouts==='object')?saved.frameLoadouts:{},reputation:{...base.reputation,...(saved.reputation||{})},mail:Array.isArray(saved.mail)?saved.mail:base.mail,mailFlags:{...base.mailFlags,...(saved.mailFlags||{})},discounts:{...base.discounts,...(saved.discounts||{})}};
    }catch(_){return this.defaultState()}
  }
  save(){
    for(const f of Object.values(this.factions))this.state.reputation[f.id]=f.rep;
    try{localStorage.setItem(this.storageKey,JSON.stringify(this.state))}catch(_){}
  }
  levelForXP(xp=this.state.xp){
    const thresholds=this.xpThresholds(),value=Math.max(0,Number(xp)||0);
    let n=1;while(n<thresholds.length&&value>=thresholds[n])n++;
    if(n===thresholds.length&&value>=thresholds[thresholds.length-1])n+=Math.floor((value-thresholds[thresholds.length-1])/10000);
    return n
  }
  repLabel(rep){
    if(rep>=60)return 'Trusted';
    if(rep>=25)return 'Favoured';
    if(rep>=-20)return 'Neutral';
    if(rep>=-55)return 'Distrusted';
    return 'Hostile';
  }
  missionEligibility(m){
    const lvl=this.levelForXP(),rep=this.factions[m.faction].rep;
    if(lvl<m.minLevel)return {ok:false,reason:`Experience level ${m.minLevel} required`};
    if(rep<m.minRep)return {ok:false,reason:`Reputation ${m.minRep} required for this contract tier`};
    return {ok:true,reason:m.implemented?'Available':'Available · stage module not yet built'};
  }
  isOpen(){return this.open}
  setPanel(name){
    document.querySelectorAll('.campaignTab').forEach(b=>b.classList.toggle('active',b.dataset.tab===name));
    document.querySelectorAll('.campaignPanel').forEach(p=>p.classList.toggle('active',p.dataset.panel===name));
    if(name==='mail'){
      this.mailFilter='all';
      const rank=m=>this.mailPriority(m)==='high'?2:(this.mailPriority(m)==='normal'?1:0);
      const unread=[...this.state.mail].filter(m=>!m.read).sort((a,b)=>rank(b)-rank(a)||(b.seq||0)-(a.seq||0))[0];
      if(unread)this.selectedMailId=unread.id;this.renderMail();if(this.selectedMailId&&this.markMailRead(this.selectedMailId))this.renderMail()
    }
    if(campaignBodyEl){campaignBodyEl.scrollTop=0;requestAnimationFrame(()=>campaignScrollbar?.update())}
  }
  showHub(panel='missions'){
    // The hub itself is calm, but remember the exact mission music mode so closing
    // it does not incorrectly force every active contract into the violent playlist.
    this.returnMusicMode=audio.music.mode||this.currentMission?.musicMode||'calm';
    audio.music.setMode('calm');
    this.evaluateMailTriggers();
    if(panel==='missions'&&!this.state.mailFlags.introShown){panel='mail';this.state.mailFlags.introShown=true;this.save()}
    this.open=true;campaignShell.classList.add('open');keys.clear();fireHeld=false;
    this.returnPauseState=paused;paused=true;document.body.classList.add('paused');
    campaignResumeBtn.style.display=this.currentMission?'inline-block':'none';
    this.render();this.setPanel(panel);this.updateGearHud();
    if(panel!=='debrief')this.flushHubVoiceNotifications();
  }
  hideHub(){
    this.open=false;campaignShell.classList.remove('open');
    if(this.currentMission){audio.music.setMode(this.returnMusicMode||this.currentMission.musicMode||'calm');paused=false;document.body.classList.remove('paused');last=performance.now();canvas.focus()}
    else audio.music.setMode('calm');
    this.returnMusicMode=null;
    this.updateGearHud();
  }
  renderHeader(){
    agentLevelEl.textContent=this.levelForXP();
    agentXPEl.textContent=`${this.state.xp.toLocaleString()} XP`;
    agentMoneyEl.textContent=`CR ${this.state.money.toLocaleString()}`;
    agentDroneEl.textContent=this.state.drone;
  }
  wrapCatalogScroller(body,kind='catalogScrollHost'){
    body.classList.add('cabinetScrollBody');body.tabIndex=0;
    const shell=document.createElement('div');shell.className=`${kind} cabinetScrollHost`;
    const track=document.createElement('div');track.className='cabinetScrollbar';track.setAttribute('aria-hidden','true');track.innerHTML='<div class="cabinetScrollThumb" tabindex="-1"></div>';
    shell.append(body,track);
    requestAnimationFrame(()=>{
      if(typeof CabinetScrollbar==='function'){
        const bar=new CabinetScrollbar(body,track);
        if(String(kind).includes('contractScrollHost'))this.contractScrollbar=bar
      }
    });
    return shell
  }
  renderMissions(){
    missionBoardEl.innerHTML='';
    const toolbar=document.createElement('div');
    toolbar.className='contractBoardToolbar';
    toolbar.innerHTML=`<button type="button">Request new contracts</button>`;
    toolbar.querySelector('button').addEventListener('click',()=>{this.selectedMissionId=null;this.refreshContracts()});
    missionBoardEl.appendChild(toolbar);

    if(!this.missions.some(m=>m.id===this.selectedMissionId))this.selectedMissionId=this.missions[0]?.id||null;
    const layout=document.createElement('div');layout.className='catalogLayout contractCatalog';
    const list=document.createElement('div');list.className='catalogList contractList';list.setAttribute('aria-label','Contracts');
    const detail=document.createElement('section');detail.className='catalogDetail contractDetail';

    // Contracts are a catalogue, not seven elastic rows squeezed into whatever
    // height happens to remain.  Give each job enough room to read and let the
    // existing cabinet/vector scrollbar do the navigation.
    list.style.display='block';
    list.style.overflowY='auto';
    list.style.overflowX='hidden';
    list.style.minHeight='0';

    for(const m of this.missions){
      const f=this.factions[m.faction],riskText=m.risk>=7?'Extreme':(m.risk>=5?'High':(m.risk>=3?'Moderate':'Routine'));
      const row=document.createElement('button');row.type='button';row.className=`catalogRow contractRow${m.id===this.selectedMissionId?' selected':''}`;
      row.style.minHeight='96px';row.style.height='auto';row.style.width='100%';
      row.innerHTML=`<span class="catalogRowTitle">${m.title}</span><span class="catalogRowSub">${f.name}</span><span class="catalogRowBlurb">${m.description}</span><span class="catalogRowFacts"><b>CR ${m.pay.toLocaleString()}</b><b>${m.xp} XP</b><b>${riskText} ${m.risk}</b></span>`;
      row.addEventListener('click',()=>{this.selectedMissionId=m.id;this.renderMissions()});list.appendChild(row)
    }

    const m=this.missions.find(x=>x.id===this.selectedMissionId);
    if(m){
      const f=this.factions[m.faction],riskText=m.risk>=7?'Extreme':(m.risk>=5?'High':(m.risk>=3?'Moderate':'Routine'));
      detail.innerHTML=`<div class="catalogDetailKicker">CONTRACT DETAILS</div><h3>${m.title}</h3><div class="missionFaction">${f.name} · Rep ${f.rep} ${this.repLabel(f.rep)}</div><div class="catalogDetailDesc">${m.description}</div><div class="missionMeta"><span>Pay <b>CR ${m.pay.toLocaleString()}</b></span><span>XP <b>${m.xp}</b></span><span>Risk <b>${riskText} ${m.risk}</b></span></div><div class="stageLine">${m.stages.join(' → ')}</div><div class="missionStatus">Available</div><button class="missionLaunch" type="button">Accept contract</button>`;
      detail.querySelector('.missionLaunch').addEventListener('click',()=>this.prepareMission(m.id));
    }else detail.innerHTML='<div class="catalogEmptyDetail">No contract selected.</div>';
    const listHost=this.wrapCatalogScroller(list,'catalogScrollHost contractScrollHost');
    listHost.style.minHeight='0';listHost.style.overflow='hidden';
    list.style.height='100%';
    layout.append(listHost,detail);missionBoardEl.appendChild(layout);
    requestAnimationFrame(()=>this.contractScrollbar?.update?.())
  }
  renderFactions(){
    factionGridEl.innerHTML='';
    for(const f of Object.values(this.factions)){
      const rep=clamp(f.rep,-100,100),left=(rep+100)/2;
      const relations=Object.entries(f.relations).map(([id,v])=>`${this.factions[id].name}: ${v>0?'+':''}${v}`).join(' · ');
      const card=document.createElement('article');card.className='factionCard';
      card.innerHTML=`<h3>${f.name}</h3><div class="missionDesc">${f.description}</div>
        <div class="repTrack"><span style="left:${(rep+100)/2}%"></span></div>
        <div class="repValue">Reputation ${rep>0?'+':''}${rep} · ${this.repLabel(rep)}</div>
        <div class="relationLine">Relations: ${relations}</div>`;
      factionGridEl.appendChild(card);
    }
  }
  itemIcon(id){
    const common='viewBox="0 0 48 48" aria-hidden="true" focusable="false"';
    const key=this.items[id]?.icon||id;
    const paths={
      shieldBooster:'<path d="M24 3 40 9v12c0 11-6 18-16 24C14 39 8 32 8 21V9Z"/><path d="M17 20h14v12H17Z"/><path d="M20 17v3M28 17v3M20 32v3M28 32v3"/><path d="M24 22v8M20 26h8"/><path d="M12 13h5M31 13h5"/>',
      homingMissile:'<path d="M8 25 35 11l5 5-14 27-5-13Z"/><path d="m21 30-9 8 4-12M27 22l8 8"/><circle cx="35" cy="16" r="2"/>',
      shieldExtender:'<path d="M24 3 40 9v12c0 11-6 18-16 24C14 39 8 32 8 21V9Z"/><path d="M24 13v16M16 21h16"/><path d="M8 10 3 8v12M40 10l5-2v12"/>',
      shieldRecharger:'<path d="M24 4 39 10v11c0 10-6 17-15 22C15 38 9 31 9 21V10Z"/><path d="M16 26a9 9 0 1 1 4 5"/><path d="m14 29 6 2-2 6"/>',
      laserCooler:'<path d="M8 14h32v20H8Z"/><path d="M14 20h20M14 28h20"/><path d="M16 9v5M24 7v7M32 9v5M16 34v5M24 34v7M32 34v5"/>',
      targetingComputer:'<circle cx="24" cy="24" r="13"/><circle cx="24" cy="24" r="4"/><path d="M24 4v8M24 36v8M4 24h8M36 24h8"/>',
      flightStabilizer:'<path d="M6 24h36M24 6v36"/><path d="m10 17 14-8 14 8-14 5Z"/><path d="m12 31 12 8 12-8"/>'
    };
    const body=paths[key]||'<path d="M8 8h32v32H8Z"/><path d="M13 24h22"/>';
    return `<svg ${common}>${body}</svg>`
  }
  frameIcon(frame){
    const c=frame?.consumables||1,i=frame?.internals||1;
    return `<svg viewBox="0 0 48 48" aria-hidden="true" focusable="false"><path d="M5 30 24 8l19 22-19-7Z"/><path d="M11 30h26M24 23v14"/><text x="5" y="44">${c}/${i}</text></svg>`
  }
  marketProducts(){const order={frame:0,consumable:1,internal:2};return [...Object.values(this.frames).filter(f=>f.id!=='AX-1').map(f=>({...f,productType:'frame'})),...this.shop.map(it=>({...it,productType:it.slot}))].sort((a,b)=>a.tier-b.tier+(a.tier===b.tier?((order[a.productType]??9)-(order[b.productType]??9)||a.price-b.price):0))}
  renderShop(){
    shopGridEl.innerHTML='';
    const toolbar=document.createElement('div');toolbar.className='marketToolbar';
    const tierButtons=[['accessible','Accessible'],['1','White'],['2','Green'],['3','Blue'],['4','Purple'],['5','Orange'],['all','All']];
    const kindButtons=[['all','All gear'],['frame','Frames'],['consumable','Consumables'],['internal','Internals']];
    toolbar.innerHTML=`<div class="marketAccessSummary">MARKET ACCESS <b>${this.tierInfo(this.marketAccessTier()).name.toUpperCase()}</b> · NORMAL LEVEL BAND ${this.tierInfo(this.normalMarketTier()).name.toUpperCase()}${this.favourTierBoost()?` · FAVOUR +${this.favourTierBoost()} TIER${this.favourTierBoost()===1?'':'S'}`:''}</div><div class="marketFilterRow tierFilters">${tierButtons.map(([v,l])=>`<button type="button" data-market-tier="${v}" class="${this.marketTierView===v?'active':''}">${l}</button>`).join('')}</div><div class="marketFilterRow kindFilters">${kindButtons.map(([v,l])=>`<button type="button" data-market-kind="${v}" class="${this.marketKindView===v?'active':''}">${l}</button>`).join('')}</div>`;
    toolbar.querySelectorAll('[data-market-tier]').forEach(btn=>btn.addEventListener('click',()=>{this.marketTierView=btn.dataset.marketTier;this.selectedMarketProductId=null;this.renderShop()}));
    toolbar.querySelectorAll('[data-market-kind]').forEach(btn=>btn.addEventListener('click',()=>{this.marketKindView=btn.dataset.marketKind;this.selectedMarketProductId=null;this.renderShop()}));
    shopGridEl.appendChild(toolbar);

    const products=this.marketProducts().filter(p=>{
      if(this.marketKindView!=='all'&&p.productType!==this.marketKindView)return false;
      if(this.marketTierView==='accessible')return this.productAccess(p).ok;
      if(this.marketTierView!=='all'&&Number(this.marketTierView)!==p.tier)return false;
      return true
    });
    if(!products.length){const empty=document.createElement('div');empty.className='marketEmpty';empty.textContent='No products match this view.';shopGridEl.appendChild(empty);return}
    if(!products.some(p=>p.id===this.selectedMarketProductId))this.selectedMarketProductId=products[0].id;

    const layout=document.createElement('div');layout.className='catalogLayout marketCatalog';
    const list=document.createElement('div');list.className='catalogList marketList';list.setAttribute('aria-label','Market products');
    const detail=document.createElement('section');detail.className='catalogDetail marketDetail';

    for(const p of products){
      const access=this.productAccess(p),isFrame=p.productType==='frame',tier=this.tierInfo(p.tier);
      const price=this.marketPrice(p),discounted=price<p.price;
      const row=document.createElement('button');row.type='button';row.className=`catalogRow marketRow ${this.tierClass(p.tier)}${access.ok?'':' locked'}${p.id===this.selectedMarketProductId?' selected':''}`;
      row.innerHTML=`<span class="catalogRowTitle">${p.name}</span><span class="catalogRowSub">${isFrame?'Frame':(p.slot==='consumable'?'Consumable':'Internal')} · Tier ${tier.roman} · ${tier.name}</span><span class="catalogRowBlurb">${p.note}</span><span class="catalogRowFacts"><b>CR ${price.toLocaleString()}${discounted?' · DISCOUNT':''}</b><b class="${access.ok?'':'bad'}">${access.ok?'AVAILABLE':'LOCKED'}</b></span>`;
      row.addEventListener('click',()=>{this.selectedMarketProductId=p.id;this.renderShop()});list.appendChild(row)
    }

    const p=products.find(x=>x.id===this.selectedMarketProductId);
    if(p){
      const access=this.productAccess(p),isFrame=p.productType==='frame',owned=isFrame?this.state.ownedFrames.includes(p.id):(this.state.inventory[p.id]||0),active=isFrame&&this.state.drone===p.id;
      const tier=this.tierInfo(p.tier),icon=isFrame?this.frameIcon(p):this.itemIcon(p.id),meta=isFrame?`Frame · Tier ${tier.roman} · ${tier.name}`:p.kind;
      const specs=isFrame?`<div class="frameSpecs"><span>${p.shields} shields</span><span>${p.consumables} consumable</span><span>${p.internals} internal</span></div><div class="frameBonus">${p.bonusText}</div>`:'';
      const faction=p.faction?`<div class="factionAccess">${p.factionName} · REP ${p.repReq}</div>`:'';
      const price=this.marketPrice(p),discounted=price<p.price;
      detail.className=`catalogDetail marketDetail ${this.tierClass(p.tier)}${access.ok?'':' locked'}`;
      detail.innerHTML=`<div class="catalogDetailKicker">MARKET ITEM</div><div class="shopItemHead"><div class="itemIconFrame"><div class="shopItemIcon">${icon}</div></div><div><h3>${p.name}</h3><div class="missionFaction">${meta}</div></div></div>${faction}<div class="catalogDetailDesc">${p.note}</div>${specs}<div class="shopAccess ${access.ok?'':'bad'}">${access.reason}</div><div class="shopPrice">CR ${price.toLocaleString()}${discounted?` <span class="mailDiscount">MAIL DISCOUNT · WAS CR ${p.price.toLocaleString()}</span>`:''}</div><div class="shopOwned">${isFrame?(active?'ACTIVE FRAME':(owned?'OWNED · SELECT IN DRONE BAY':'NOT OWNED')):`Workshop stock X${owned}`}</div><button class="marketBuyPrimary" type="button" ${(!access.ok||active||owned&&isFrame||this.state.money<price)?'disabled':''}>${isFrame?'Buy frame':'Buy one'}</button>`;
      detail.querySelector('.marketBuyPrimary').addEventListener('click',()=>isFrame?this.buyFrame(p.id):this.buyItem(p.id));
    }
    layout.append(this.wrapCatalogScroller(list,'catalogScrollHost marketScrollHost'),detail);shopGridEl.appendChild(layout)
  }
  renderWorkshop(){
    if(!workshopGridEl)return;this.normalizeLoadout();workshopGridEl.innerHTML='';
    const locked=this.equipmentLocked(),cap=this.activeSlotCount(),internalCap=this.internalSlotCount(),frame=this.activeFrame();
    const leftColumn=document.createElement('div');leftColumn.className='workshopColumn workshopColumnLeft';
    const rightColumn=document.createElement('div');rightColumn.className='workshopColumn workshopColumnRight';
    workshopGridEl.append(leftColumn,rightColumn);
    if(this.pendingMission&&!this.currentMission){
      const m=this.pendingMission,card=document.createElement('article');card.className='workshopCard workshopMission';
      card.innerHTML=`<h3>Contract prepared</h3><div class="missionFaction">${this.missionClientName(m)} · ${m.title}</div><div class="missionDesc">${m.description}</div><div class="stageLine">${m.stages.join(' → ')}</div><div class="missionMeta"><span>Pay <b>CR ${m.pay.toLocaleString()}</b></span><span>XP <b>${m.xp}</b></span><span>Risk <b>${m.risk}</b></span></div><div class="workshopActions"><button type="button" data-cancel>Cancel contract</button></div>`;
      card.querySelector('[data-cancel]').addEventListener('click',()=>{const back=m.private?'mail':'missions';this.pendingMission=null;this.render();this.setPanel(back)});leftColumn.appendChild(card);
    }
    const drone=document.createElement('article');drone.className=`workshopCard ${this.tierClass(frame.tier)}`;
    const ownedFrames=this.state.ownedFrames.map(id=>this.frames[id]).filter(Boolean).sort((a,b)=>a.tier-b.tier||a.price-b.price);
    drone.innerHTML=`<h3>${frame.name} loadout</h3><div class="missionFaction">${locked?'DRONE DEPLOYED · WORKSHOP LOCKED':'DRONE AT BASE · READY FOR FITTING'}</div><div class="workshopDroneStats"><div><b>${this.maxShield()}</b>SHIELDS</div><div><b>${cap}</b>CONSUMABLE SLOT${cap===1?'':'S'}</div><div><b>${internalCap}</b>INTERNAL SLOT${internalCap===1?'':'S'}</div></div><div class="frameTrait">${frame.bonusText}</div><div class="ownedFramePicker"><span>OWNED FRAMES</span><div>${ownedFrames.map(f=>`<button type="button" data-frame-select="${f.id}" class="${f.id===frame.id?'active':''}" ${locked||f.id===frame.id?'disabled':''}>${f.id}</button>`).join('')}</div></div><div class="loadoutGroup"><div class="loadoutGroupLabel">CONSUMABLE · SECONDARY FIRE</div><div class="loadoutSlots consumableSlots"></div></div><div class="loadoutGroup"><div class="loadoutGroupLabel">INTERNAL · PASSIVE HARDWARE</div><div class="loadoutSlots internalSlots"></div></div>`;
    drone.querySelectorAll('[data-frame-select]').forEach(b=>b.addEventListener('click',()=>this.selectFrame(b.dataset.frameSelect)));
    const consumableSlots=drone.querySelector('.consumableSlots');
    for(let i=0;i<cap;i++){
      const id=(locked?this.activeLoadout:this.state.loadout)[i],item=id?this.items[id]:null,b=document.createElement('button');
      b.type='button';b.className='loadoutSlot'+(!item?' empty':'');b.disabled=locked;
      b.setAttribute('aria-label',item?`Consumable slot ${i+1}: ${item.name}. Click to unload.`:`Consumable slot ${i+1}: empty.`);
      const key=i===0?'MMB':String(i+1);
      b.innerHTML=`<span class="loadoutKey">${key}</span><span class="loadoutIcon ${item?this.tierClass(item.tier):''}">${item?this.itemIcon(item.id):this.itemIcon(null)}</span><span class="loadoutName">${item?item.name:'EMPTY CONSUMABLE'}</span><span class="loadoutState">${item?'CLICK TO UNLOAD':'READY'}</span>`;
      if(item)b.addEventListener('click',()=>this.unloadSlot(i,'consumable'));consumableSlots.appendChild(b)
    }
    const internalSlots=drone.querySelector('.internalSlots');
    for(let i=0;i<internalCap;i++){
      const id=(locked?this.activeInternalLoadout:this.state.internalLoadout)[i],item=id?this.items[id]:null,b=document.createElement('button');
      b.type='button';b.className='loadoutSlot internal'+(!item?' empty':'');b.disabled=locked;
      b.setAttribute('aria-label',item?`Internal slot ${i+1}: ${item.name}. Click to unload.`:`Internal slot ${i+1}: empty.`);
      b.innerHTML=`<span class="loadoutKey">I${i+1}</span><span class="loadoutIcon ${item?this.tierClass(item.tier):''}">${item?this.itemIcon(item.id):this.itemIcon(null)}</span><span class="loadoutName">${item?item.name:'EMPTY INTERNAL'}</span><span class="loadoutState">${item?'CLICK TO UNLOAD':'READY'}</span>`;
      if(item)b.addEventListener('click',()=>this.unloadSlot(i,'internal'));internalSlots.appendChild(b)
    }
    rightColumn.appendChild(drone);
    const inv=document.createElement('article');inv.className='workshopCard';
    const stockTotal=Object.values(this.state.inventory||{}).reduce((a,n)=>a+(Number(n)||0),0);
    inv.innerHTML=`<div class="inventoryHeader"><div><h3>Workshop inventory</h3><div class="missionFaction">STORED AT BASE · ITEMS AUTO-FIT TO THEIR MATCHING SLOT TYPE</div></div><div class="inventoryCount">${stockTotal} ITEM${stockTotal===1?'':'S'}</div></div><div class="inventorySlotGrid"></div>`;
    const grid=inv.querySelector('.inventorySlotGrid');let slotIndex=1;
    for(const item of this.shop){
      const count=this.state.inventory[item.id]||0;
      const noRoom=item.slot==='internal'?this.state.internalLoadout.slice(0,internalCap).every(Boolean):this.state.loadout.slice(0,cap).every(Boolean);
      for(let n=0;n<count;n++){
        const b=document.createElement('button');b.type='button';b.className=`inventorySlot ${this.tierClass(item.tier)}`;b.disabled=locked||noRoom;
        b.setAttribute('aria-label',`${item.name}. Fit to first available ${item.slot} slot.`);
        b.innerHTML=`<span class="inventorySlotIndex">${String(slotIndex).padStart(2,'0')}</span><span class="inventorySlotIcon">${this.itemIcon(item.id)}</span><span class="inventorySlotName">${item.name}</span><span class="inventorySlotType">${item.slot.toUpperCase()}</span>`;
        b.addEventListener('click',()=>this.equipItem(item.id));grid.appendChild(b);slotIndex++
      }
    }
    const minimumSlots=8;
    while(slotIndex<=Math.max(minimumSlots,stockTotal)){
      const e=document.createElement('div');e.className='inventorySlot empty';e.innerHTML=`<span class="inventorySlotIndex">${String(slotIndex).padStart(2,'0')}</span><span class="inventorySlotIcon">${this.itemIcon(null)}</span><span class="inventorySlotName">EMPTY</span>`;grid.appendChild(e);slotIndex++
    }
    leftColumn.appendChild(inv);
    if(this.pendingMission&&!this.currentMission){
      const launchDock=document.createElement('div');launchDock.className='workshopLaunchDock';
      launchDock.innerHTML='<button type="button" class="workshopLaunchPrimary" data-workshop-launch>LAUNCH MISSION</button>';
      launchDock.querySelector('[data-workshop-launch]').addEventListener('click',()=>this.launchMission(this.pendingMission.id));workshopGridEl.appendChild(launchDock)
    }
  }
  skillIcon(kind){
    const common='viewBox="0 0 32 32" aria-hidden="true"';
    const paths={
      wrench:'<path d="M20 4a7 7 0 0 0-7 9L4 22l6 6 9-9a7 7 0 0 0 9-7l-5 3-4-4 3-5a7 7 0 0 0-2-2Z"/><path d="M7 22l3 3"/>',
      power:'<path d="M18 2 7 18h8l-2 12 12-17h-8Z"/>',
      coil:'<path d="M4 9h5c5 0 5 14 10 14h9"/><path d="M4 23h5c5 0 5-14 10-14h9"/><path d="M8 5v22M24 5v22"/>',
      burst:'<path d="M3 8h16M3 16h22M3 24h16"/><path d="m20 5 7 3-7 3M26 13l4 3-4 3M20 21l7 3-7 3"/>',
      shield:'<path d="M16 3 27 7v8c0 7-4 11-11 14C9 26 5 22 5 15V7Z"/><path d="M10 12h12"/>',
      repair:'<path d="M16 3 27 7v8c0 7-4 11-11 14C9 26 5 22 5 15V7Z"/><path d="M16 10v11M10.5 15.5h11"/>',
      repairFast:'<path d="M16 4a11 11 0 1 1-8 3"/><path d="M4 4v7h7"/><path d="M16 10v12M10 16h12"/>',
      bus:'<path d="M6 6h20v20H6Z"/><path d="M10 2v4M16 2v4M22 2v4M10 26v4M16 26v4M22 26v4M2 10h4M2 16h4M2 22h4M26 10h4M26 16h4M26 22h4"/>',
      rack:'<path d="M5 8h22v18H5Z"/><path d="M5 14h22M16 17v7M12.5 20.5h7"/><path d="M10 5h12"/>',
      plug:'<path d="M10 3v8M22 3v8M7 10h18v5a9 9 0 0 1-18 0Z"/><path d="M16 24v6"/>',
      drone:'<path d="M4 22 16 6l12 16-12-5Z"/><path d="M8 22h16M16 17v10"/>',
      dronePlus:'<path d="M3 22 14 7l11 15-11-5Z"/><path d="M7 22h14M14 17v10M25 6v8M21 10h8"/>',
      briefcase:'<path d="M4 10h24v17H4Z"/><path d="M11 10V6h10v4M4 17h24M13 17v3h6v-3"/>',
      insurance:'<path d="M16 3 27 7v8c0 7-4 11-11 14C9 26 5 22 5 15V7Z"/><path d="M11 16h10M16 10v12"/>',
      down:'<path d="M6 8h20M8 14h16M11 20h10"/><path d="m12 24 4 4 4-4"/>',
      cover:'<path d="M16 3 27 7v8c0 7-4 11-11 14C9 26 5 22 5 15V7Z"/><path d="m10 16 4 4 8-9"/>',
      handshake:'<path d="m3 13 7-6 6 4 6-2 7 6"/><path d="m7 17 7 7c2 2 4 1 5-1l2 1c2 1 4-1 3-3l2-1c2-1 1-4-1-5l-7-5"/><path d="m10 7-6 10"/>',
      credits:'<circle cx="16" cy="16" r="11"/><path d="M21 11c-2-2-8-2-8 1 0 4 8 2 8 6 0 3-6 4-10 1M16 7v18"/>',
      starCoin:'<circle cx="16" cy="16" r="12"/><path d="m16 8 2.2 5 5.5.5-4.2 3.6 1.3 5.4-4.8-2.9-4.8 2.9 1.3-5.4-4.2-3.6 5.5-.5Z"/>',
      rep:'<path d="M5 25h22M7 21l6-6 4 3 8-10"/><path d="M20 8h5v5"/>',
      network:'<circle cx="6" cy="16" r="3"/><circle cx="16" cy="7" r="3"/><circle cx="26" cy="16" r="3"/><circle cx="16" cy="25" r="3"/><path d="m8 14 6-5M18 9l6 5M24 18l-6 5M14 23l-6-5"/>',
      dossier:'<path d="M7 4h18v24H7Z"/><path d="M11 9h10M11 14h7M11 23l3-3 3 3 5-6"/>',
      priority:'<path d="M6 5h20v22H6Z"/><path d="M10 10h12M10 15h8"/><path d="m20 20 2 4 4 .5-3 2.5"/>',
      agent:'<circle cx="16" cy="9" r="5"/><path d="M7 28c1-8 4-12 9-12s8 4 9 12M4 28h24"/>',
      joystick:'<circle cx="16" cy="7" r="3"/><path d="M16 10v11M8 27h16M11 21h10l3 6H8Z"/>',
      turn:'<path d="M5 23c3-10 9-15 19-14"/><path d="m20 5 5 4-4 5"/><circle cx="8" cy="23" r="2"/>',
      threat:'<path d="M16 3 29 25H3Z"/><path d="M16 10v8M16 22v1"/>',
      ace:'<path d="m16 3 3.4 8.2 8.9.7-6.8 5.8 2.1 8.7-7.6-4.6-7.6 4.6 2.1-8.7-6.8-5.8 8.9-.7Z"/>',
      crosshair:'<circle cx="16" cy="16" r="8"/><path d="M16 2v8M16 22v8M2 16h8M22 16h8"/>',
      cycle:'<path d="M7 10a11 11 0 0 1 18-2"/><path d="m25 3 1 7-7-1"/><path d="M25 22a11 11 0 0 1-18 2"/><path d="m7 29-1-7 7 1"/>'
    };
    return `<svg ${common}>${paths[kind]||paths.wrench}</svg>`
  }
  renderPerks(){
    perkGridEl.innerHTML=`<div class="skillTreeStatus"><span>SKILL POINTS <b>${this.skillPointsAvailable()}</b> / ${this.skillPointsTotal()}</span><span>SPENT <b>${this.skillPointsSpent()}</b></span><span>CONTRACT RISK CEILING <b>${this.maxContractRisk()}</b></span><span>DEPTH GATES <b>2 · 4 · 7 SP</b></span></div>`;
    for(const tree of Object.values(this.perkTrees)){
      const panel=document.createElement('article');panel.className='skillTreePanel unified';
      const byId=Object.fromEntries(tree.nodes.map(n=>[n.id,n]));
      const lineClass=n=>{
        if(this.hasSkill(n.id))return'owned';
        if(!n.future&&this.skillPointsSpent()>=(n.minSpent||0)&&(n.req||[]).every(id=>this.hasSkill(id)))return'live';
        return''
      };
      const edgePath=(a,n)=>{
        const box=27,sx=a.x,sy=a.y+(n.y>=a.y?box:-box),ex=n.x,ey=n.y+(n.y>=a.y?-box:box);
        if(Math.abs(sx-ex)<2)return `M ${sx} ${sy} V ${ey}`;
        const midY=Math.round((sy+ey)/2);return `M ${sx} ${sy} V ${midY} H ${ex} V ${ey}`
      };
      const lines=[];
      for(const n of tree.nodes)for(const req of (n.req||[])){const a=byId[req];if(a)lines.push(`<path class="${lineClass(n)}" d="${edgePath(a,n)}"/>`)}
      const nodeMarkup=tree.nodes.map(n=>{
        const owned=this.hasSkill(n.id),available=this.skillCanBuy(n);
        const state=n.root?'root':(owned?'owned':(n.future?'future':(available?'available':'locked')));
        return `<button type="button" class="skillNode ${state}" data-skill-node="${n.id}" style="left:${n.x/12}%;top:${n.y/6.2}%" aria-label="${n.name}"><span class="skillNodeIcon">${this.skillIcon(n.icon)}</span></button>`
      }).join('');
      const branchLabels=[['MERCANTILE',12.5],['ENGINEERING',37.5],['PILOTING',62.5],['COMBAT',87.5]].map(([name,x])=>`<div class="skillBranchLabel" style="left:${x}%">${name}</div>`).join('');
      panel.innerHTML=`<div class="skillTreeHead"><div><h3>${tree.name}</h3><div class="skillTreeNote">${tree.note}</div></div><div class="skillTreeTag">${tree.tag}</div></div>
        <div class="skillTreeViewport"><div class="skillTreeGraph unifiedGraph">
          ${branchLabels}
          <svg class="skillEdges" viewBox="0 0 1200 620" preserveAspectRatio="none" aria-hidden="true">${lines.join('')}</svg>
          ${nodeMarkup}
          <div class="skillTooltip" aria-hidden="true"><div class="skillTooltipTitle"></div><div class="skillTooltipBody"></div><div class="skillTooltipMeta"></div><div class="skillTooltipAction"></div></div>
        </div></div>`;
      const graph=panel.querySelector('.skillTreeGraph'),tip=panel.querySelector('.skillTooltip');
      const showTip=(button,node)=>{
        const owned=this.hasSkill(node.id),available=this.skillCanBuy(node),req=(node.req||[]).map(id=>byId[id]?.name||id);
        tip.querySelector('.skillTooltipTitle').textContent=node.name;
        tip.querySelector('.skillTooltipBody').textContent=node.effect?`${node.desc} ${node.effect}`:node.desc;
        const gate=node.minSpent||0,gateMissing=this.skillPointsSpent()<gate;
        let meta=node.root?'FOUNDATION · OWNED':(owned?'INSTALLED':(node.future?'SYSTEM NOT YET IMPLEMENTED':(req.length?`REQUIRES ${req.join(' + ')}`:'AVAILABLE')));
        if(!owned&&!node.root&&gate)meta+=`${gateMissing?' · LOCKED':' · OPEN'} AT ${gate} TOTAL SP SPENT`;
        tip.querySelector('.skillTooltipMeta').textContent=meta;
        tip.querySelector('.skillTooltipAction').textContent=available?'CLICK TO INSTALL · COST 1 SP':(!owned&&!node.future&&this.skillPointsAvailable()<1?'NO SKILL POINTS AVAILABLE':(gateMissing?`SPEND ${gate-this.skillPointsSpent()} MORE POINT${gate-this.skillPointsSpent()===1?'':'S'} TO OPEN THIS DEPTH`:''));
        const left=clamp(button.offsetLeft+34,8,Math.max(8,graph.clientWidth-264));
        const top=clamp(button.offsetTop-18,8,Math.max(8,graph.clientHeight-132));
        tip.style.left=`${left}px`;tip.style.top=`${top}px`;tip.classList.add('show')
      };
      const hideTip=()=>tip.classList.remove('show');
      panel.querySelectorAll('[data-skill-node]').forEach(button=>{
        const node=byId[button.dataset.skillNode];
        button.addEventListener('pointerenter',()=>showTip(button,node));button.addEventListener('pointerleave',hideTip);
        button.addEventListener('focus',()=>showTip(button,node));button.addEventListener('blur',hideTip);
        button.addEventListener('click',()=>{if(this.skillCanBuy(node))this.purchaseSkill(node.id);else showTip(button,node)})
      });
      perkGridEl.appendChild(panel)
    }
  }
  renderProgressionSandbox(){
    const host=document.getElementById('progressionSandbox');if(!host)return;
    const lvl=this.levelForXP(),normal=this.normalMarketTier(),access=this.marketAccessTier(),reps=Object.values(this.factions);
    host.innerHTML=`<div class="sandboxSummary"><span>LEVEL <b>${lvl}</b></span><span>XP <b>${this.state.xp.toLocaleString()}</b></span><span>MARKET <b>${this.tierInfo(access).name.toUpperCase()}</b></span><span>RISK CEILING <b>${this.maxContractRisk()}</b></span></div>
      <div class="sandboxRow"><label>Level <input type="range" min="1" max="20" step="1" value="${clamp(lvl,1,20)}" data-sandbox-level><output data-sandbox-level-value>${lvl}</output></label><button type="button" data-sandbox-level-apply>Set level</button></div>
      <div class="sandboxRow"><label>XP <input type="number" min="0" step="100" value="${Math.round(this.state.xp)}" data-sandbox-xp></label><button type="button" data-sandbox-xp-apply>Apply XP</button></div>
      <div class="sandboxRow"><label>Credits <input type="number" min="0" step="1000" value="${Math.round(this.state.money)}" data-sandbox-money></label><button type="button" data-sandbox-money-apply>Apply credits</button></div>
      <div class="sandboxPresets"><span>JUMP TO TEST BAND</span>${[[1,'White',12000],[3,'Green',40000],[6,'Blue',140000],[10,'Purple',480000],[15,'Orange',1600000]].map(([l,n,c])=>`<button type="button" data-sandbox-preset="${l}" data-cash="${c}">${n}</button>`).join('')}</div>
      <div class="sandboxRepGrid">${reps.map(f=>`<label><span>${f.name}</span><input type="range" min="-100" max="100" step="5" value="${f.rep}" data-sandbox-rep="${f.id}"><output>${f.rep>0?'+':''}${f.rep}</output></label>`).join('')}</div>
      <div class="sandboxNote">TEMPORARY TEST CONTROLS · normal market band ${this.tierInfo(normal).name}; favour/skills currently lift access by ${this.favourTierBoost()} tier${this.favourTierBoost()===1?'':'s'}.</div>`;
    const levelSlider=host.querySelector('[data-sandbox-level]'),levelOut=host.querySelector('[data-sandbox-level-value]');
    levelSlider.addEventListener('input',()=>levelOut.textContent=levelSlider.value);
    const refresh=()=>{this.generateContractBoard();this.normalizeLoadout();this.save();this.render()};
    host.querySelector('[data-sandbox-level-apply]').addEventListener('click',()=>{this.state.xp=this.xpForLevel(levelSlider.value);refresh()});
    host.querySelector('[data-sandbox-xp-apply]').addEventListener('click',()=>{this.state.xp=Math.max(0,Number(host.querySelector('[data-sandbox-xp]').value)||0);refresh()});
    host.querySelector('[data-sandbox-money-apply]').addEventListener('click',()=>{this.state.money=Math.max(0,Math.round(Number(host.querySelector('[data-sandbox-money]').value)||0));this.save();this.render()});
    host.querySelectorAll('[data-sandbox-preset]').forEach(b=>b.addEventListener('click',()=>{this.state.xp=this.xpForLevel(Number(b.dataset.sandboxPreset));this.state.money=Number(b.dataset.cash)||this.state.money;refresh()}));
    host.querySelectorAll('[data-sandbox-rep]').forEach(sl=>{const out=sl.parentElement.querySelector('output');sl.addEventListener('input',()=>out.textContent=`${Number(sl.value)>0?'+':''}${sl.value}`);sl.addEventListener('change',()=>{const f=this.factions[sl.dataset.sandboxRep];if(f)f.rep=Number(sl.value)||0;refresh()})})
  }
  render(){this.evaluateMailTriggers();this.renderHeader();this.renderMissions();this.renderFactions();this.renderMail();this.renderShop();this.renderWorkshop();this.renderPerks();this.renderProgressionSandbox();this.updateMailBadge()}
  prepareMission(id){
    if(this.currentMission)return false;const m=this.missions.find(x=>x.id===id);if(!m||!m.implemented)return false;
    this.pendingMission=m;this.render();this.setPanel('workshop');return true
  }
  launchMission(id){
    const m=this.pendingMission?.id===id?this.pendingMission:this.missions.find(x=>x.id===id);if(!m||!m.implemented||this.currentMission)return;
    this.currentMission=m;this.pendingMission=null;this.currentStageIndex=0;this.deployLoadout();this.open=false;campaignShell.classList.remove('open');this.updateGearHud();
    level=Math.max(1,Number(m.difficulty)||1);

    // Every contract and every composed stage enters through one shared checkpoint transit.
    audio.music.setMode(m.musicMode||(m.family==='food_delivery'?'calm':'violent'));
    audio.resetMissionVoices();
    reset({deferMissionStart:true});
    paused=false;document.body.classList.remove('paused');last=performance.now();
    // launchMission is entered from the player's launch click, so this is the
    // reliable browser user gesture for Pointer Lock. The lock is retained across
    // transit/autopilot but only direct flight consumes relative mouse movement.
    if(typeof requestFlightPointerLock==='function')requestFlightPointerLock(true);
    missionTransit.start(m);
  }
  applyRep(factionId,delta){
    const f=this.factions[factionId];if(!f)return;
    const before=f.rep,oldLabel=this.repLabel(before);f.rep=clamp(f.rep+delta,-100,100);const newLabel=this.repLabel(f.rep);
    if(oldLabel!==newLabel){
      const direction=f.rep>before?'improved':'dropped';
      this.enqueueMail({id:`rep_${f.id}_${this.state.completed}_${f.rep}_${Date.now().toString(36)}`,from:`${f.name} · Network Office`,subject:`Standing ${direction}: ${newLabel}`,category:'network',priority:'normal',body:[`Your standing with ${f.name} has ${direction}.`,`Current status: ${newLabel} (${f.rep>0?'+':''}${f.rep}).`]})
    }
  }
  makeDevTemplatePreview(templateId,factionId){
    const template=this.missionTemplate(templateId);if(!template)return null;
    const m=this.makeTemplateContract(template,999,{faction:factionId});if(!m)return null;
    // A DEV preview is a real generated contract, but it is not put on the public
    // board or made pending until the tester explicitly accepts it.
    m.id=`dev_template_${template.id}_${Date.now().toString(36)}_${((Math.random()*0xffff)|0).toString(36)}`;
    m.devTemplateTest=true;
    return m
  }
  launchDevTemplateTest(templateId,factionId,options={}){
    if(this.currentMission||this.pendingMission)return false;
    const template=this.missionTemplate(templateId);if(!template)return false;
    let m=options?.mission||null;
    // Only accept a supplied preview if it still matches the selected template/faction.
    if(!m||m.templateId!==templateId||m.faction!==factionId)m=this.makeDevTemplatePreview(templateId,factionId);
    if(!m)return false;
    m.devTemplateTest=true;m.devForceFollowUp=!!options.forceFollowUp;
    this.pendingMission=m;
    this.launchMission(m.id);
    return true
  }
  finishDevTemplateTest(success,reason='',abandoned=false){
    const m=this.currentMission;if(!m?.devTemplateTest)return false;
    this.beginPostMissionVoiceHold();asteroidField.stop();
    if(success)this.queueContractMail(m,0);
    else this.queueContractFailureMail(m,abandoned?'abandoned':'failed',reason||'DEV template test ended.');
    this.recoverUnusedLoadout(true);
    this.currentMission=null;this.pendingMission=null;this.currentStageIndex=0;this.restoreFrameLoadout();this.updateGearHud();
    this.save();
    if(!success)audio.playVoice('missionFailed',{once:true,priority:true});
    mode=success?'victory':'idle';paused=true;document.body.classList.add('paused');
    this.showDebrief({success,heading:success?'DEV TEMPLATE TEST COMPLETE':(abandoned?'DEV TEMPLATE TEST ABANDONED':'DEV TEMPLATE TEST ENDED'),title:m.title,pay:0,xp:0,liability:0,reason:'DEV test. Campaign rewards, reputation, equipment and contract board unchanged.',returnPanel:'dev'});
    return true
  }
  completeCurrentMission(){
    if(!this.currentMission)return false;
    if(this.currentMission.devTest&&typeof scenarioFlow!=='undefined')return scenarioFlow.finishDevelopmentMission(true);
    if(this.currentMission.devTemplateTest)return this.finishDevTemplateTest(true);
    if(this.currentMission.training)return this.finishTraining(true,'Exercise objectives completed.');
    this.beginPostMissionVoiceHold();
    const m=this.currentMission,faction=this.factions[m.faction]||null;
    const jackalSettlement=(m.family==='jackal_party_delivery'&&typeof jackalDelivery!=='undefined'&&jackalDelivery?.settlement)?jackalDelivery.settlement():null;
    const templateCivilian=this.templateCivilianSettlement(m),settlement=jackalSettlement||templateCivilian;
    const actualPay=settlement?Math.max(0,Math.round((m.pay*settlement.payMultiplier)/50)*50):m.pay;
    asteroidField.stop();
    this.state.money+=actualPay;this.state.xp+=m.xp;this.state.completed++;this.queueSkillPointReminder();
    let repGain=0;
    if(faction){
      const normalRepGain=Math.max(1,Math.round(8*this.positiveRepMultiplier()));
      repGain=settlement?Math.max(0,Math.round(normalRepGain*settlement.repMultiplier)):normalRepGain;
      if(repGain){
        this.applyRep(m.faction,repGain);
        // Relationship propagation is intentionally mild in the skeleton.
        for(const [otherId,affinity] of Object.entries(faction.relations))this.applyRep(otherId,Math.round(repGain*affinity/200));
      }
      if(templateCivilian?.incidents>0)this.queueTemplateCivilianIncidentMail(m,templateCivilian,actualPay);
      else if(jackalSettlement?.incidents>0)this.queueJackalCivilianIncidentMail(m,jackalSettlement,actualPay);
      else this.queueContractMail(m,repGain);
      if(!settlement||settlement.allowGift)this.maybeQueueFactionGift(m)
    }
    if(m.private)this.handleStoryCompletion(m);
    this.recoverUnusedLoadout(true);
    this.currentMission=null;this.currentStageIndex=0;this.restoreFrameLoadout();this.updateGearHud();
    if(!m.private)this.replaceContract(m.id);
    this.evaluateMailTriggers();this.save();
    mode='victory';paused=true;document.body.classList.add('paused');
    const penalty=templateCivilian?.incidents>0
      ?(templateCivilian.assaults>0?`${templateCivilian.assaults} civilian traffic assault${templateCivilian.assaults===1?'':'s'} · settlement penalised`:`${templateCivilian.collisions} civilian traffic incident${templateCivilian.collisions===1?'':'s'} · settlement penalised`)
      :(jackalSettlement?.incidents>0?(jackalSettlement.incidents>=3?`${jackalSettlement.incidents} civilian incidents · Red Jackal refused payment`:`${jackalSettlement.incidents} civilian incident${jackalSettlement.incidents===1?'':'s'} · Red Jackal cut the settlement`):'');
    this.showDebrief({success:true,title:m.title,pay:actualPay,xp:m.xp,liability:0,reason:penalty,returnPanel:m.private?'mail':'missions'});
    return true;
  }
  failCurrentMission(reason='Mission failed'){
    if(!this.currentMission)return false;
    if(this.currentMission.devTest&&typeof scenarioFlow!=='undefined')return scenarioFlow.finishDevelopmentMission(false,reason);
    if(this.currentMission.devTemplateTest)return this.finishDevTemplateTest(false,reason,false);
    if(this.currentMission.training)return this.finishTraining(false,reason||'Simulation ended.');
    this.beginPostMissionVoiceHold();this.queueSkillPointReminder();
    const m=this.currentMission,destroyedFrameId=this.state.drone,frameExcess=this.frameReplacementExcess(destroyedFrameId);
    const lostConsumables=this.activeLoadout.filter(Boolean),insuredItems=this.activeInternalLoadout.filter(Boolean);
    asteroidField.stop();this.state.failed++;const civilian=this.templateCivilianSettlement(m);if(this.factions[m.faction])this.applyRep(m.faction,-2-(civilian?.failureRepPenalty||0));this.queueContractFailureMail(m,'failed',reason);
    // AX-1 is always supplied free. A destroyed premium frame must be claimed at
    // the same excess rate as permanent hardware or the operator falls back to AX-1.
    if(destroyedFrameId!=='AX-1'){
      this.state.ownedFrames=this.state.ownedFrames.filter(id=>id!==destroyedFrameId);
      if(!this.state.ownedFrames.includes('AX-1'))this.state.ownedFrames.unshift('AX-1');
      this.state.drone='AX-1';
    }
    this.activeLoadout=[null,null,null,null];this.activeInternalLoadout=[null,null,null,null];
    this.currentMission=null;this.currentStageIndex=0;this.normalizeLoadout();this.updateGearHud();if(!m.private)this.replaceContract(m.id);this.save();
    audio.playVoice('missionFailed',{once:true,priority:true});paused=true;document.body.classList.add('paused');
    this.showInsuranceRecovery({title:m.title,reason,destroyedFrameId,frameExcess,lostConsumables,insuredItems,returnPanel:m.private?'mail':'missions'});return true
  }
  abandonCurrentMission(reason='Contract abandoned'){
    if(!this.currentMission)return false;
    if(this.currentMission.devTest&&typeof scenarioFlow!=='undefined')return scenarioFlow.finishDevelopmentMission(false,reason);
    if(this.currentMission.devTemplateTest)return this.finishDevTemplateTest(false,reason,true);
    if(this.currentMission.training)return this.finishTraining(false,'Simulator exited.');
    this.beginPostMissionVoiceHold();this.queueSkillPointReminder();
    const m=this.currentMission;
    asteroidField.stop();
    this.state.failed++;
    const civilian=this.templateCivilianSettlement(m);
    if(this.factions[m.faction])this.applyRep(m.faction,-2-(civilian?.failureRepPenalty||0));
    this.queueContractFailureMail(m,'abandoned',reason);
    this.recoverUnusedLoadout(true);
    this.currentMission=null;this.currentStageIndex=0;this.restoreFrameLoadout();this.updateGearHud();
    if(!m.private)this.replaceContract(m.id);
    this.save();
    audio.playVoice('missionFailed',{once:true,priority:true});
    paused=true;document.body.classList.add('paused');
    this.showDebrief({success:false,heading:'Mission abandoned',title:m.title,pay:0,xp:0,liability:0,reason:`${reason} · drone recovered`,returnPanel:m.private?'mail':'missions'});
    return true
  }
  showInsuranceRecovery(d){
    audio.music.setMode('calm');this.open=true;campaignShell.classList.add('open');campaignResumeBtn.style.display='none';this.updateGearHud();this.renderHeader();this.setPanel('debrief');
    const rate=this.insuranceExcessRate(),trainingDiscount=this.trainingInsuranceDiscount(),destroyedFrame=this.frames[d.destroyedFrameId]||this.frames['AX-1'];
    const claims=(d.insuredItems||[]).map((id,index)=>({index,type:'item',id,item:this.items[id],excess:this.insuredLiability(this.items[id]?.price||0),status:null}));
    if(destroyedFrame.id!=='AX-1')claims.unshift({index:-1,type:'frame',id:destroyedFrame.id,item:destroyedFrame,excess:d.frameExcess,status:null});
    const lostNames=(d.lostConsumables||[]).map(id=>this.items[id]?.name||id);
    const claimRows=claims.length?claims.map(c=>`<div class="insuranceItem" data-claim="${c.index}"><div><b>${c.item.name}</b><span>${c.type==='frame'?'Frame':'Replacement'} CR ${c.item.price.toLocaleString()} · excess ${Math.round(rate*100)}%${trainingDiscount?' · training benefit -1%':''}</span></div><strong>CR ${c.excess.toLocaleString()}</strong><div class="insuranceActions"><button type="button" data-recover="${c.index}">Pay excess</button><button type="button" data-decline="${c.index}">Decline</button></div></div>`).join(''):'<div class="insuranceNone">No premium frame or permanent fitted equipment was lost.</div>';
    debriefBoxEl.innerHTML=`<h2>Insurance / recovery</h2><div class="missionFaction">${d.title}</div><div class="missionStatus bad">${d.reason||'Drone destroyed'}</div>
      <div class="insuranceFrame"><span>Fallback AX-1 frame</span><b>ALWAYS AVAILABLE · CR 0</b></div>
      <div class="insuranceConsumables"><span>Consumables</span><b>${lostNames.length?`${lostNames.join(' · ')} · LOST`:'NONE FITTED'}</b></div>
      <div class="insuranceHeading">FRAME / PERMANENT EQUIPMENT CLAIMS</div>${claimRows}
      <div class="debriefRow debriefTotal"><span>Current funds</span><span data-insurance-funds>CR ${this.state.money.toLocaleString()}</span></div>
      <div class="insuranceFooter"><span data-insurance-status>${claims.length?'Resolve each claim to continue.':'No claims to resolve.'}</span><button type="button" id="insuranceContinue" ${claims.length?'disabled':''}>${d.returnPanel==='mail'?'Return to mail':'Return to mission board'}</button></div>`;
    const fundsEl=debriefBoxEl.querySelector('[data-insurance-funds]'),statusEl=debriefBoxEl.querySelector('[data-insurance-status]'),continueBtn=debriefBoxEl.querySelector('#insuranceContinue');
    const refresh=()=>{
      fundsEl.textContent=`CR ${this.state.money.toLocaleString()}`;this.renderHeader();
      const unresolved=claims.filter(c=>!c.status).length;continueBtn.disabled=unresolved>0;
      statusEl.textContent=unresolved?`${unresolved} claim${unresolved===1?'':'s'} still to resolve.`:'Claim complete.'
    };
    const resolve=(index,recover)=>{
      const c=claims.find(x=>x.index===index);if(!c||c.status)return;
      const row=debriefBoxEl.querySelector(`[data-claim="${index}"]`);
      if(recover){
        if(this.state.money<c.excess){statusEl.textContent=`Not enough credits to recover ${c.item.name}.`;return}
        this.state.money-=c.excess;
        if(c.type==='frame'){if(!this.state.ownedFrames.includes(c.id))this.state.ownedFrames.push(c.id);this.state.drone=c.id}else this.state.inventory[c.id]=(this.state.inventory[c.id]||0)+1;
        c.status='recovered'
      }else c.status='declined';
      row.classList.add(c.status);row.querySelector('.insuranceActions').innerHTML=`<span>${c.status==='recovered'?'RECOVERED':'DECLINED'}</span>`;this.normalizeLoadout();this.save();refresh()
    };
    debriefBoxEl.querySelectorAll('[data-recover]').forEach(b=>b.addEventListener('click',()=>resolve(Number(b.dataset.recover),true)));
    debriefBoxEl.querySelectorAll('[data-decline]').forEach(b=>b.addEventListener('click',()=>resolve(Number(b.dataset.decline),false)));
    continueBtn.addEventListener('click',()=>{this.restoreFrameLoadout();this.save();this.closeMissionDebrief(d.returnPanel||'missions')});refresh()
  }
  showDebrief(d){
    audio.music.setMode('calm');
    this.open=true;campaignShell.classList.add('open');campaignResumeBtn.style.display='none';this.updateGearHud();this.renderHeader();this.setPanel('debrief');
    if(d.training){
      debriefBoxEl.innerHTML=`<h2>${d.heading||(d.success?'SIMULATOR COMPLETE':'SIMULATION ENDED')}</h2>
        <div class="missionFaction">${d.title}</div>
        <div class="missionStatus ${d.success?'good':'bad'}">${d.reason||'Training session complete.'}</div>
        <div class="catalogDetailDesc">Simulator sessions do not affect credits, experience, reputation, equipment or contract history.</div>
        <div style="margin-top:16px"><button id="debriefReturn" type="button">Return to mail</button></div>`;
      debriefBoxEl.querySelector('#debriefReturn').addEventListener('click',()=>this.closeMissionDebrief('mail'));return
    }
    debriefBoxEl.innerHTML=`<h2>${d.heading||(d.success?'Contract complete':'Drone lost')}</h2>
      <div class="missionFaction">${d.title}</div>
      ${d.reason?`<div class="missionStatus bad">${d.reason}</div>`:''}
      <div class="debriefRow"><span>Contract payment</span><span>CR ${d.pay.toLocaleString()}</span></div>
      <div class="debriefRow"><span>Experience</span><span>${d.xp} XP</span></div>
      <div class="debriefRow"><span>Drone liability</span><span>${d.liability?'- CR '+d.liability.toLocaleString():'CR 0'}</span></div>
      <div class="debriefRow debriefTotal"><span>Current funds</span><span>CR ${this.state.money.toLocaleString()}</span></div>
      <div style="margin-top:16px"><button id="debriefReturn" type="button">${d.returnPanel==='mail'?'Return to mail':(d.returnPanel==='dev'?'Return to DEV':'Return to mission board')}</button></div>`;
    debriefBoxEl.querySelector('#debriefReturn').addEventListener('click',()=>this.closeMissionDebrief(d.returnPanel||'missions'));
  }
  resetCampaign(){
    this.state=this.defaultState();
    for(const f of Object.values(this.factions))f.rep=this.state.reputation[f.id]||0;
    this.currentMission=null;this.pendingMission=null;this.activeLoadout=[null,null,null,null];this.activeInternalLoadout=[null,null,null,null];this.currentStageIndex=0;this.updateGearHud();
    this.generateContractBoard();this.ensureWelcomeMail();this.state.mailFlags.introShown=false;this.save();this.render();this.setPanel('mail');
  }
}


