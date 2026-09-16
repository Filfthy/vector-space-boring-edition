'use strict';
let sceneRenderSerial=0;
let shieldRestoreFlashIndex=-1,shieldRestoreFlashT=0;
let playerGunKick=0;

let speechSubtitleText='',speechSubtitleT=0;
let tutorialObjectiveSubtitleKey='',tutorialObjectiveSubtitleText='';
let tutorialAnnouncementText='',tutorialAnnouncementT=0;
const TUTORIAL_OBJECTIVE_VOICE_KEYS=new Set([
  'tutorialDestroyFive','tutorialShootProjectiles','tutorialAcquireLock',
  'tutorialFollowTarget','tutorialDestroyEnemy','tutorialUseShieldBooster','tutorialAbandonMission',
  'tutorialFollowNav','tutorialAvoidCorridor','tutorialDestroyReactor'
]);
function speechSubtitleDuration(text,audioDuration=0){
  const words=String(text||'').trim().split(/\s+/).filter(Boolean).length;
  const reading=clamp(1.55+Math.max(0,words-3)*.14,1.55,2.35);
  const spoken=Number.isFinite(audioDuration)&&audioDuration>0?audioDuration+.30:0;
  return Math.max(reading,spoken)
}
function tutorialHudActive(){return !!(campaign?.currentMission?.training&&mode!=='idle'&&mode!=='dead')}
function clearTutorialHud(){
  speechSubtitleText='';speechSubtitleT=0;
  tutorialObjectiveSubtitleKey='';tutorialObjectiveSubtitleText='';
  tutorialAnnouncementText='';tutorialAnnouncementT=0
}
function showSpeechSubtitle(key,text,audioDuration=0){
  if(!text||mode==='idle'||mode==='dead'||gateVisible()||campaign?.isOpen?.()||options?.isOpen?.())return;
  if(tutorialHudActive()&&TUTORIAL_OBJECTIVE_VOICE_KEYS.has(key)){
    tutorialObjectiveSubtitleKey=key;tutorialObjectiveSubtitleText=String(text);
    // If a short status callout is already on screen, move its remaining lifetime
    // under the newly pinned objective instead of leaving two competing HUD messages.
    if(statusHold>0&&messageEl?.textContent){
      tutorialAnnouncementText=messageEl.textContent;tutorialAnnouncementT=statusHold;messageEl.textContent=''
    }
    speechSubtitleText='';speechSubtitleT=0;return
  }
  speechSubtitleText=String(text);
  speechSubtitleT=speechSubtitleDuration(speechSubtitleText,audioDuration)
}
function completeTutorialObjective(key=null){
  if(!tutorialHudActive())return false;
  if(key)audio?.cancelQueuedVoice?.(key);
  // Only clear a pinned objective if it is the one that just completed. This
  // prevents a very fast input from erasing the next instruction after it starts.
  if(!key||!tutorialObjectiveSubtitleKey||tutorialObjectiveSubtitleKey===key){
    tutorialObjectiveSubtitleKey='';tutorialObjectiveSubtitleText=''
  }
  audio?.requestObjectiveCompleteCue?.();
  return true
}
function showTutorialAnnouncement(text,duration=.8){
  if(!tutorialHudActive()||!tutorialObjectiveSubtitleText)return false;
  tutorialAnnouncementText=String(text||'');tutorialAnnouncementT=Math.max(.05,Number(duration)||.8);
  return true
}
window.onSpeechVoiceStarted=(key,text,duration)=>showSpeechSubtitle(key,text,duration);


// Put genuinely off-screen HUD cues on the real CANVAS edge. Projection uses
// viewH*.48 as its optical centre, but viewH deliberately ends above the physical
// bottom of the canvas (legacy cockpit/gameplay viewport). HUD guidance must use H.
// `inset` is the marker radius, so the diamond/chevron outer tip touches the edge.
function hudEdgeCue(q,inset=0){
  // World projection still uses the gameplay optical centre (viewH*.48), but HUD
  // off-screen cues belong to the FULL canvas. viewH is only 91% of H, which is why
  // bottom markers were stopping at the old cockpit boundary instead of the screen edge.
  const cx=W*.5,cy=viewH*.48,left=inset,right=W-inset,top=inset,bottom=H-inset;
  let dx=0,dy=-1;
  if(q?.[2]>.15){
    const p=projectCam(q);
    if(p){dx=p.x-cx;dy=p.y-cy}
  }else{
    // Behind-camera targets must still indicate the SHORTEST turn towards the
    // target. Camera X/Y already give that steering direction. Reversing both
    // components here made a target behind-right point left (and behind-above
    // point down), so following the marker could never bring it into view.
    dx=q?.[0]||0;dy=-(q?.[1]||0);
  }
  // A target exactly astern has no unique screen-space side. Pick right rather
  // than an arbitrary top cue; as soon as the player starts turning the real
  // bearing takes over continuously.
  if(Math.hypot(dx,dy)<.001){dx=1;dy=0}
  const n=Math.hypot(dx,dy)||1;dx/=n;dy/=n;
  const tx=dx>0?(right-cx)/dx:dx<0?(left-cx)/dx:Infinity;
  const ty=dy>0?(bottom-cy)/dy:dy<0?(top-cy)/dy:Infinity;
  const t=Math.max(0,Math.min(tx,ty));
  return{x:cx+dx*t,y:cy+dy*t,dx,dy}
}
function drawHudMarkerLabel(text,x,y,r,col,font='400 10px Consolas,monospace'){
  ctx.save();ctx.font=font;ctx.strokeStyle=col;ctx.lineWidth=VECTOR_LINE_WIDTH;
  const e=1.5;
  if(y-r<=e){ctx.textAlign='center';ctx.textBaseline='top';ctx.strokeText(text,x,y+r+5)}
  else if(x-r<=e){ctx.textAlign='left';ctx.textBaseline='middle';ctx.strokeText(text,x+r+5,y)}
  else if(x+r>=W-e){ctx.textAlign='right';ctx.textBaseline='middle';ctx.strokeText(text,x-r-5,y)}
  else{ctx.textAlign='center';ctx.textBaseline='bottom';ctx.strokeText(text,x,y-r-5)}
  ctx.restore()
}

class OptionsController {
  constructor(){
    this.wasPaused=true;
    this.channelNames=['master','music','fx','speech'];
    this.effectNames=['laser','hit','explosion','damageTaken','projectileDestroyed','zoom','disconnect','uiClick'];
    this.trackNames=MusicManager.allTracks().map(t=>t.id);
    this.trackPositions=Object.fromEntries(this.trackNames.map(id=>[id,0]));
    this.bind();
    this.render();
  }
  isOpen(){return optionsModal.classList.contains('open')}
  bind(){
    optionsPanelRoot.querySelectorAll('[data-mixer-toggle]').forEach(btn=>btn.addEventListener('click',()=>{
      const name=btn.dataset.mixerToggle,s=AudioMixer.ensure();
      AudioMixer.setEnabled(name,!s.enabled[name]);
      audio.applyMixer();this.render()
    }));
    optionsPanelRoot.querySelectorAll('[data-mixer-slider]').forEach(input=>input.addEventListener('input',()=>{
      AudioMixer.setVolume(input.dataset.mixerSlider,Number(input.value)/100);
      audio.applyMixer();this.render(false)
    }));
    optionsPanelRoot.querySelectorAll('[data-sfx-slider]').forEach(input=>input.addEventListener('input',()=>{
      AudioMixer.setTrim(input.dataset.sfxSlider,Number(input.value)/100);this.render(false)
    }));
    optionsPanelRoot.querySelectorAll('[data-sfx-play]').forEach(btn=>btn.addEventListener('click',()=>this.preview(btn.dataset.sfxPlay)));
    optionsPanelRoot.querySelectorAll('[data-track-level]').forEach(input=>input.addEventListener('input',()=>{
      const id=input.dataset.trackLevel;
      AudioMixer.setTrackTrim(id,Number(input.value)/100);
      audio.music.applyMixer();this.renderTrackLevel(id,false)
    }));
    optionsPanelRoot.querySelectorAll('[data-track-position]').forEach(input=>input.addEventListener('input',()=>{
      const id=input.dataset.trackPosition,f=clamp(Number(input.value)/1000,0,1);
      this.trackPositions[id]=f;
      audio.music.seekPreview(id,f);
      this.renderTrackTime(id)
    }));
    optionsPanelRoot.querySelectorAll('[data-track-play]').forEach(btn=>btn.addEventListener('click',()=>{
      const id=btn.dataset.trackPlay;
      if(audio.music.previewing&&audio.music.previewTrackId===id)audio.music.stopPreview(true);
      else audio.music.startPreview(id,this.trackPositions[id]||0);
      this.renderTrackButtons();this.renderTrackTime(id)
    }));
    const previewDeck=audio.music.previewDeck;
    for(const ev of ['loadedmetadata','durationchange','timeupdate','play','pause','ended'])previewDeck.addEventListener(ev,()=>this.syncPreviewUi());
  }
  preview(name){
    if(name==='uiClick')return; // The Play button itself produces the UI click via the global button handler.
    if(name==='disconnect')SoundFX.disconnect();
    else if(typeof SoundFX[name]==='function')SoundFX[name]();
    else SoundFX.play(name)
  }
  formatTime(seconds){
    if(!Number.isFinite(seconds)||seconds<0)return '--:--';
    const whole=Math.floor(seconds),m=Math.floor(whole/60),s=whole%60;
    return `${m}:${String(s).padStart(2,'0')}`
  }
  syncPreviewUi(){
    const music=audio.music,id=music.previewTrackId||music.previewDeck.dataset.trackId;
    if(id&&music.previewing){
      const d=music.previewDeck.duration,t=music.previewDeck.currentTime;
      if(Number.isFinite(d)&&d>0){
        const f=clamp(t/d,0,1);this.trackPositions[id]=f;
        const input=optionsPanelRoot.querySelector(`[data-track-position="${id}"]`);
        if(input)input.value=String(Math.round(f*1000));
      }
      this.renderTrackTime(id)
    }
    this.renderTrackButtons()
  }
  renderTrackLevel(id,setSlider=true){
    const trim=AudioMixer.musicTrackTrim(id);
    const input=optionsPanelRoot.querySelector(`[data-track-level="${id}"]`),out=optionsPanelRoot.querySelector(`[data-track-level-value="${id}"]`);
    if(input&&setSlider)input.value=String(Math.round(trim*100));
    if(out)out.textContent=`${Math.round(trim*100)}%`
  }
  renderTrackTime(id){
    const music=audio.music,out=optionsPanelRoot.querySelector(`[data-track-time="${id}"]`);
    if(!out)return;
    let duration=music.trackDurations[id];
    let current=(this.trackPositions[id]||0)*(Number.isFinite(duration)?duration:0);
    if(music.previewing&&music.previewTrackId===id){
      duration=music.previewDeck.duration;
      current=music.previewDeck.currentTime
    }
    out.textContent=`${this.formatTime(current)} / ${this.formatTime(duration)}`
  }
  renderTrackButtons(){
    optionsPanelRoot.querySelectorAll('[data-track-play]').forEach(btn=>{
      const active=audio.music.previewing&&audio.music.previewTrackId===btn.dataset.trackPlay&&!audio.music.previewDeck.paused;
      btn.textContent=active?'Stop':'Play';btn.classList.toggle('active',active)
    })
  }
  render(setSliders=true){
    const s=AudioMixer.ensure();
    for(const name of this.channelNames){
      const btn=optionsPanelRoot.querySelector(`[data-mixer-toggle="${name}"]`);
      const input=optionsPanelRoot.querySelector(`[data-mixer-slider="${name}"]`);
      const out=optionsPanelRoot.querySelector(`[data-mixer-value="${name}"]`);
      if(btn){btn.textContent=s.enabled[name]?'On':'Off';btn.classList.toggle('off',!s.enabled[name])}
      if(input&&setSliders)input.value=String(Math.round(s.volume[name]*100));
      if(out)out.textContent=`${Math.round(s.volume[name]*100)}%`
    }
    for(const name of this.effectNames){
      const input=optionsPanelRoot.querySelector(`[data-sfx-slider="${name}"]`);
      const out=optionsPanelRoot.querySelector(`[data-sfx-value="${name}"]`);
      if(input&&setSliders)input.value=String(Math.round(s.trims[name]*100));
      if(out)out.textContent=`${Math.round(s.trims[name]*100)}%`
    }
    for(const id of this.trackNames){
      this.renderTrackLevel(id,setSliders);
      if(setSliders){
        const pos=optionsPanelRoot.querySelector(`[data-track-position="${id}"]`);
        if(pos)pos.value=String(Math.round((this.trackPositions[id]||0)*1000))
      }
      this.renderTrackTime(id)
    }
    this.renderTrackButtons();
    requestAnimationFrame(()=>optionsScrollbar?.update())
  }
  open(){
    if(this.isOpen())return;
    this.wasPaused=paused;
    if(mode!=='idle'&&mode!=='dead'){paused=true;document.body.classList.add('paused');laserBurstRemaining=0;endLaserTrigger()}
    aboutModal.classList.remove('open');
    // Options lives as a normal campaign tab. Gate/in-flight Options temporarily
    // borrows the same panel so there is only one set of controls and state.
    if(optionsPanelRoot&&optionsPanelRoot.parentElement!==optionsModal)optionsModal.appendChild(optionsPanelRoot);
    this.render();optionsModal.classList.add('open');
    requestAnimationFrame(()=>optionsScrollbar?.update())
  }
  close(){
    if(!this.isOpen())return;
    audio.music.stopPreview(true);
    optionsModal.classList.remove('open');
    if(campaignOptionsHost&&optionsPanelRoot&&optionsPanelRoot.parentElement!==campaignOptionsHost)campaignOptionsHost.appendChild(optionsPanelRoot);
    requestAnimationFrame(()=>campaignScrollbar?.update());
    if(!campaign.isOpen()&&!gateVisible()&&!this.wasPaused&&mode!=='idle'&&mode!=='dead'){
      paused=false;document.body.classList.remove('paused');last=performance.now();canvas.focus()
    }
  }
}


