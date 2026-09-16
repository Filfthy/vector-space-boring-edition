/* Agent X v233 — network logos: reliable contract/mail placement + native SVG paths.
   - White network marks throughout.
   - Contract and Mail placement is hooked directly to CampaignController render methods,
     so re-rendering cannot discard the emblems.
   - Logos use the original supplied SVG path geometry rather than normalized polylines.
     Curves in the source SVGs remain curves; straight-line logos remain true SVG paths.
*/
(()=>{
'use strict';

const NETWORK_LOGOS={"trade":{"id":"trade","name":"Free Traders Compact","viewBox":"166.237 116.36 885.368 776.397","paths":["M202.152,147.916L662.336,443.748L820.113,700.136L667.266,772.451L570.299,772.451L604.813,736.294L668.91,713.284","M820.113,693.562L925.298,701.78L958.168,741.224L958.168,693.562L897.358,627L747.798,586.734","M838.683,611.203L931.872,486.48L931.872,460.183L820.113,478.262L976.246,386.225L1015.691,295.832L820.113,432.244L747.798,570.299","M202.152,147.916L243.24,261.318L511.132,432.244L269.536,328.702L300.763,414.165L511.132,494.697L343.494,460.183L373.077,527.567L548.933,562.081L430.6,573.586L481.549,627L585.09,668.91L340.207,833.261L474.975,861.201L609.743,741.224","M849.696,642.613L895.714,655.761L866.131,668.91L849.696,642.613Z"]},"security":{"id":"security","name":"Orbital Security Directorate","viewBox":"298.072 73.453 655.976 977.02","paths":["M631.109,113.034L671.5,136.596L671.5,165.206L626.901,192.133L584.827,167.73L583.986,136.596L631.109,113.034","M652.22,176.847L650.463,348.648","M603.34,176.145L603.34,347.807L497.314,345.282L457.764,395.771L514.985,389.881L580.62,394.088L626.901,427.747L676.549,392.405L744.708,389.039L798.563,398.295L755.648,345.282L603.34,347.807","M572.508,393.568C571.364,410.076 575.571,895.609 575.571,895.609L626.06,968.818L681.597,893.085L677.39,389.881","M626.06,426.906L626.06,968.818","M861.674,451.309L859.149,641.483L745.55,778.644","M392.129,450.467L391.287,640.641L505.729,784.534","M573.888,270.391L325.652,389.881L324.811,754.241L624.377,1010.892L927.309,758.448L927.309,384.832L678.232,267.866"]},"jackals":{"id":"jackals","name":"Red Jackal Combine","viewBox":"146.348 -0.625 284.905 455.943","paths":["M363.011,19.487L389.81,191.272L357.514,222.88L338.961,267.544L303.917,284.723L316.286,255.863L352.2,235.674","M374.693,216.696L365.76,267.544L336.9,303.276L321.096,352.75L306.666,385.733L272.309,386.42L256.505,355.498L242.075,301.214L212.528,268.232L202.908,216.009","M227.645,238.685L242.075,272.354L275.057,286.784L268.186,264.796L233.142,234.562","M264.75,297.779L259.253,361.683","M314.224,299.84L316.286,356.186","M279.867,356.186L299.107,355.498L302.543,361.683L288.113,373.364L273.683,359.621L279.867,356.186Z","M216.65,214.635L187.791,188.523L215.276,18.113L258.566,220.819","M314.224,220.819L362.324,18.113","M240.7,140.424L266.125,176.842L303.917,178.903L333.464,143.172","M349.956,300.527L320.409,436.581L419.357,347.94L380.19,236.623","M196.036,237.31L158.244,352.75L256.505,435.894L224.209,299.153"]},"helix":{"id":"helix","name":"Helix Industrial Group","viewBox":"634.489 557.525 181.055 393.975","paths":["M682.458,576.699L645.146,596.521L646.312,739.354L747.754,791.824L642.231,844.877L643.397,913.67L681.292,934.658L683.624,876.941L765.827,832.634L767.576,935.241L807.219,916.002L807.802,769.67L704.612,717.201L805.47,668.812L807.802,595.355L768.158,573.784L768.741,629.168L684.79,674.059L680.284,577.854","M683.238,640.928L715.754,657.502","M684.207,658.901L697.033,667.063","M759.414,687.468L775.154,698.545L776.903,731.193L765.244,747.516","M785.648,676.391L786.231,755.678","M663.219,749.265L664.385,831.468","M689.454,760.925L677.794,769.087L676.628,811.063L684.207,820.391","M686.539,671.727L642.231,697.379","M797.891,657.735L656.223,728.861","M765.244,688.051L707.527,717.784L762.912,745.767"]},"quickbite":{"id":"quickbite","name":"QuickBite Orbital","viewBox":"43.493 577.777 454.176 300.189","paths":["M272.038,590.285L362.403,643.921L362.986,747.111L273.204,865.459L179.342,749.443L179.342,641.589L272.038,590.285Z","M271.455,628.763L207.909,661.411L208.492,737.2L271.455,768.682L334.419,734.868L335.585,663.743L271.455,628.763Z","M272.038,694.641L271.455,768.682L272.038,694.641Z","M332.67,662.577L272.038,694.641L209.658,664.909","M179.342,659.662L62.16,661.411L93.059,708.633L180.508,708.05L102.386,708.571L123.958,747.694L179.925,746.528L132.116,747.524L153.107,779.176L202.662,778.593","M340.832,775.095L391.552,775.678L411.374,743.613","M364.152,744.196C371.731,744.196 422.451,742.447 422.451,742.447L441.69,708.633L364.152,708.05","M363.569,660.245L479.002,660.245L451.601,706.884L360.071,708.05"]},"vox":{"id":"vox","name":"VOX","viewBox":"990.933 639.306 408.677 234.792","paths":["M1015.705,649.198L1076.803,651.063L1148.161,720.09","M1023.167,707.031L1089.862,707.497L1125.774,741.544","M1007.776,759.267L1146.762,759.734L1171.948,715.426L1220.919,716.359L1245.638,757.868L1221.852,801.71L1171.948,802.642L1149.094,763.931","M1021.302,808.239L1088.463,810.571L1128.106,772.793","M1147.695,793.781L1078.668,864.207L1016.638,864.207","M1244.239,793.781L1314.665,862.807L1376.229,862.807","M1264.76,773.259L1301.139,808.705L1369.7,810.105","M1382.759,758.801L1244.239,756.935","M1265.227,742.477L1303.471,704.699L1370.166,704.699","M1377.162,650.131L1312.799,650.131L1243.773,720.557"]}};
window.AgentXNetworkLogos=NETWORK_LOGOS;
const SVG_NS='http://www.w3.org/2000/svg';
const VOX_DESCRIPTION='Broadcast and communications network.';
let installing=false;

function campaignObject(){
  try{return (typeof campaign!=='undefined'&&campaign)?campaign:null}catch(_){return null}
}

function installVoxModel(){
  const c=campaignObject();
  if(!c||!c.factions)return false;
  let changed=false;
  if(!c.factions.vox){
    const rel={};for(const id of Object.keys(c.factions))rel[id]=0;
    c.factions.vox={id:'vox',name:'VOX',rep:0,description:VOX_DESCRIPTION,relations:rel};
    changed=true;
  }
  for(const f of Object.values(c.factions)){
    if(f&&f.id!=='vox'&&f.relations&&!Object.prototype.hasOwnProperty.call(f.relations,'vox')){f.relations.vox=0;changed=true}
  }
  if(changed&&typeof c.renderFactions==='function'){try{c.renderFactions()}catch(err){console.warn('Agent X network-logo VOX render:',err)}}
  return true;
}

function makeLogo(id){
  const def=NETWORK_LOGOS[id];if(!def)return null;
  const svg=document.createElementNS(SVG_NS,'svg');
  svg.setAttribute('class','networkLogoMark');
  svg.setAttribute('viewBox',def.viewBox);
  svg.setAttribute('preserveAspectRatio','xMidYMid meet');
  svg.setAttribute('shape-rendering','geometricPrecision');
  svg.setAttribute('role','img');
  svg.setAttribute('aria-label',def.name+' logo');
  svg.dataset.vectorIgnore='1';
  for(const d of def.paths){
    const p=document.createElementNS(SVG_NS,'path');
    p.setAttribute('d',d);
    p.setAttribute('fill','none');
    p.setAttribute('stroke','currentColor');
    p.setAttribute('stroke-width','1.15');
    p.setAttribute('stroke-linecap','square');
    p.setAttribute('stroke-linejoin','miter');
    p.setAttribute('vector-effect','non-scaling-stroke');
    svg.appendChild(p);
  }
  return svg;
}

function inferIdFromText(value){
  const t=String(value||'').toLowerCase();
  if(t.includes('free traders compact')||t.includes('free traders'))return 'trade';
  if(t.includes('orbital security directorate')||t.includes('orbital security'))return 'security';
  if(t.includes('red jackal combine')||t.includes('red jackal'))return 'jackals';
  if(t.includes('helix industrial group')||t.includes('helix industrial'))return 'helix';
  if(t.includes('quickbite orbital')||t.includes('quickbite'))return 'quickbite';
  if(/(^|[^a-z])vox([^a-z]|$)/.test(t))return 'vox';
  return '';
}

function setLogoOnHost(host,id,className){
  if(!host||!NETWORK_LOGOS[id])return false;
  const existing=host.querySelector(':scope > .'+className);
  if(existing){
    if(existing.dataset.logoId===id)return true;
    existing.remove();
  }
  const logo=makeLogo(id);if(!logo)return false;
  logo.dataset.logoId=id;logo.classList.add(className);host.insertBefore(logo,host.firstChild);return true;
}

function ensureVoxFallback(grid){
  if(campaignObject())return;
  const cards=[...grid.querySelectorAll('.factionCard')];
  if(cards.some(c=>c.dataset.networkId==='vox'||inferIdFromText(c.textContent)==='vox'))return;
  const card=document.createElement('article');card.className='factionCard';card.dataset.networkId='vox';card.dataset.voxFallback='1';
  card.innerHTML='<h3>VOX</h3><div class="missionDesc">'+VOX_DESCRIPTION+'</div><div class="repTrack"><span style="left:50%"></span></div><div class="repValue">Reputation 0 · Neutral</div><div class="relationLine">Relations: Neutral</div>';
  grid.appendChild(card);
}

function decorateGrid(){
  const grid=document.getElementById('factionGrid');if(!grid)return;
  ensureVoxFallback(grid);
  const c=campaignObject();
  const ids=c&&c.factions?Object.values(c.factions).map(f=>f.id):[];
  const cards=[...grid.querySelectorAll('.factionCard')];
  cards.forEach((card,i)=>{
    let id=card.dataset.networkId||ids[i]||inferIdFromText(card.textContent);
    if(!NETWORK_LOGOS[id])id=inferIdFromText(card.textContent);
    if(!id)return;
    card.dataset.networkId=id;card.classList.add('hasNetworkLogo');setLogoOnHost(card,id,'networkCardLogo');
  });
}

function decorateMissionBoard(){
  const board=document.getElementById('missionBoard');if(!board)return;
  const catalog=board.querySelector('.contractCatalog');if(catalog)catalog.classList.add('agentXLogoContractCatalog');
  for(const row of board.querySelectorAll('.contractRow,.catalogRow')){
    const source=row.querySelector('.catalogRowSub')||row;
    const id=inferIdFromText(source.textContent)||inferIdFromText(row.textContent);
    if(!id)continue;
    row.dataset.networkId=id;row.classList.add('agentXContractLogoHost');setLogoOnHost(row,id,'contractNetworkLogo');
  }
}

function decorateMail(){
  const grid=document.getElementById('mailGrid');if(!grid)return;
  grid.classList.add('agentXLogoMailGrid');
  for(const row of grid.querySelectorAll('.mailRow')){
    const source=row.querySelector('.mailRowFrom')||row;
    // Once inferred from the real mail text, keep the network id on the row. The
    // vector-font renderer later replaces text nodes with stroke SVGs, at which
    // point textContent is no longer a reliable place to rediscover the sender.
    const id=row.dataset.networkId||inferIdFromText(source.textContent)||inferIdFromText(row.textContent);
    const old=row.querySelector(':scope > .mailListNetworkLogo');
    if(!id){if(old&&!row.dataset.networkId)old.remove();continue}
    row.dataset.networkId=id;row.classList.add('agentXMailLogoHost');setLogoOnHost(row,id,'mailListNetworkLogo');
  }
  const detail=grid.querySelector('.mailDetail');
  if(detail){
    const source=detail.querySelector('.mailFrom')||detail;
    const id=detail.dataset.networkId||inferIdFromText(source.textContent);
    const old=detail.querySelector(':scope > .mailDetailNetworkLogo');
    if(id){detail.dataset.networkId=id;detail.classList.add('agentXMailDetailLogoHost');setLogoOnHost(detail,id,'mailDetailNetworkLogo')}
    else if(!detail.dataset.networkId){if(old)old.remove();detail.classList.remove('agentXMailDetailLogoHost')}
  }
}

function decorateAll(){decorateGrid();decorateMissionBoard();decorateMail()}

function hookRenderMethod(name,after){
  try{
    if(typeof CampaignController==='undefined'||!CampaignController.prototype)return false;
    const proto=CampaignController.prototype;const current=proto[name];
    if(typeof current!=='function'||current.__agentXLogoHook)return false;
    function wrapped(...args){const result=current.apply(this,args);try{after()}catch(err){console.warn('Agent X logo '+name+' hook:',err)}return result}
    wrapped.__agentXLogoHook=true;wrapped.__agentXLogoOriginal=current;proto[name]=wrapped;return true;
  }catch(_){return false}
}

function installRenderHooks(){
  hookRenderMethod('renderMissions',decorateMissionBoard);
  hookRenderMethod('renderMail',decorateMail);
  hookRenderMethod('renderFactions',decorateGrid);
}

function injectStyles(){
  let st=document.getElementById('agentXNetworkLogoStyles');
  if(!st){st=document.createElement('style');st.id='agentXNetworkLogoStyles';document.head.appendChild(st)}
  st.textContent=`
    .networkLogoMark{color:#fff!important;overflow:visible;pointer-events:none;flex:0 0 auto}
    .networkLogoMark path{fill:none!important;stroke:currentColor!important}

    .factionCard .networkCardLogo{float:right;width:72px;height:72px;margin:0 0 8px 12px}
    .factionCard .repTrack{clear:both}
    .factionCard::after{content:'';display:block;clear:both}

    #missionBoard .contractCatalog.agentXLogoContractCatalog{grid-template-columns:minmax(470px,.88fr) minmax(0,1fr)!important}
    #missionBoard .agentXContractLogoHost{position:relative!important;padding-left:66px!important;min-height:62px}
    #missionBoard .contractNetworkLogo{position:absolute;left:12px;top:50%;transform:translateY(-50%);width:42px;height:42px;margin:0!important;z-index:2}

    #mailGrid .agentXMailLogoHost{position:relative!important;padding-left:58px!important;min-height:58px}
    #mailGrid .mailListNetworkLogo{position:absolute;left:10px;top:50%;transform:translateY(-50%);width:38px;height:38px;margin:0!important;z-index:2}
    #mailGrid .mailDetail.agentXMailDetailLogoHost{position:relative!important;padding-right:86px!important}
    #mailGrid .mailDetailNetworkLogo{position:absolute;right:14px;top:14px;width:60px;height:60px;margin:0!important;z-index:2}

    @media(max-width:1000px){
      #missionBoard .contractCatalog.agentXLogoContractCatalog{grid-template-columns:minmax(390px,.92fr) minmax(0,1fr)!important}
      #missionBoard .agentXContractLogoHost{padding-left:58px!important}
      #missionBoard .contractNetworkLogo{width:36px;height:36px}
    }
    @media(max-width:760px){
      #missionBoard .contractCatalog.agentXLogoContractCatalog{grid-template-columns:1fr!important}
      .factionCard .networkCardLogo{width:58px;height:58px}
      #mailGrid .mailDetailNetworkLogo{width:48px;height:48px}
      #mailGrid .mailDetail.agentXMailDetailLogoHost{padding-right:68px!important}
    }
  `;
}

function observeRoot(root,fn,key){
  if(!root||root[key])return;
  let queued=false;
  const obs=new MutationObserver(()=>{if(queued)return;queued=true;queueMicrotask(()=>{queued=false;fn()})});
  obs.observe(root,{childList:true,subtree:true,characterData:true});root[key]=obs;
}

function start(){
  if(installing)return;installing=true;
  injectStyles();installRenderHooks();
  let tries=0;
  const timer=setInterval(()=>{installRenderHooks();installVoxModel();decorateAll();if(++tries>60)clearInterval(timer)},100);
  observeRoot(document.getElementById('factionGrid'),decorateGrid,'__agentXLogoObserver');
  observeRoot(document.getElementById('missionBoard'),decorateMissionBoard,'__agentXContractLogoObserver');
  observeRoot(document.getElementById('mailGrid'),decorateMail,'__agentXMailLogoObserver');
  window.addEventListener('resize',()=>{decorateMissionBoard();decorateMail()},{passive:true});
  decorateAll();
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
