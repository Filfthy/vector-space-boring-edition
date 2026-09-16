'use strict';
class AudioMixer {
  static storageKey='agentx.audioMixer.v1';
  static defaults=Object.freeze({
    enabled:{master:true,music:true,fx:true,speech:true},
    volume:{master:1,music:1,fx:1,speech:1},
    trims:{laser:1,hit:1,explosion:1,damageTaken:1,projectileDestroyed:1,objectiveComplete:1,zoom:.45,disconnect:1,uiClick:1,swampSpit:1,relayCalibrated:1,droneApproval:1},
    trackTrims:{mozart:1,pachelbel:1,satie:1,mars:1,baldmountain:1,diesirae:1,valkyries:1}
  });
  static state=null;
  static fxDuckGain=1;
  static cloneDefaults(){return JSON.parse(JSON.stringify(this.defaults))}
  static load(){
    const next=this.cloneDefaults();
    try{
      const saved=JSON.parse(localStorage.getItem(this.storageKey)||'null');
      if(saved&&typeof saved==='object'){
        for(const k of Object.keys(next.enabled))if(typeof saved.enabled?.[k]==='boolean')next.enabled[k]=saved.enabled[k];
        for(const k of Object.keys(next.volume))if(Number.isFinite(saved.volume?.[k]))next.volume[k]=clamp(saved.volume[k],0,1);
        for(const k of Object.keys(next.trims))if(Number.isFinite(saved.trims?.[k]))next.trims[k]=clamp(saved.trims[k],0,1);
        for(const k of Object.keys(next.trackTrims))if(Number.isFinite(saved.trackTrims?.[k]))next.trackTrims[k]=clamp(saved.trackTrims[k],0,1.5);
      }
    }catch(_){}
    this.state=next;return next
  }
  static ensure(){return this.state||this.load()}
  static save(){try{localStorage.setItem(this.storageKey,JSON.stringify(this.ensure()))}catch(_){}}
  static isEnabled(channel){const s=this.ensure();return !!s.enabled.master&&!!s.enabled[channel]}
  static channelVolume(channel){
    const s=this.ensure();
    if(!s.enabled.master||!s.enabled[channel])return 0;
    const duck=channel==='fx'?this.fxDuckGain:1;
    return clamp(s.volume.master*s.volume[channel]*duck,0,1)
  }
  static setFxDuckGain(value){
    this.fxDuckGain=clamp(Number(value)||0,0,1);
    // Update one-shots already in flight as well as sounds started after the duck.
    if(typeof SoundFX!=='undefined')SoundFX.applyDuckToActive?.()
  }
  static effectVolume(name){return this.channelVolume('fx')*clamp(this.ensure().trims[name]??1,0,1)}
  static musicTrackTrim(name){return clamp(this.ensure().trackTrims[name]??1,0,1.5)}
  static setTrackTrim(name,value){const s=this.ensure();if(name in s.trackTrims){s.trackTrims[name]=clamp(Number(value)||0,0,1.5);this.save()}}
  static setEnabled(channel,value){const s=this.ensure();if(channel in s.enabled){s.enabled[channel]=!!value;this.save()}}
  static setVolume(channel,value){const s=this.ensure();if(channel in s.volume){s.volume[channel]=clamp(Number(value)||0,0,1);this.save()}}
  static setTrim(name,value){const s=this.ensure();if(name in s.trims){s.trims[name]=clamp(Number(value)||0,0,1);this.save()}}
}

class SoundFX {
  static ctx=null;
  static buffers=new Map();
  static activeGains=new Set();
  static definitions={
    laser:{
      oldParams:true,wave_type:1,p_env_attack:0,p_env_sustain:0.2822434152090946,
      p_env_punch:0.12835195470149124,p_env_decay:0.3366855830679689,
      p_base_freq:0.6232942248169966,p_freq_limit:0.2,p_freq_ramp:-0.22636248239758244,
      p_freq_dramp:0,p_vib_strength:0,p_vib_speed:0,p_arp_mod:0,p_arp_speed:0,
      p_duty:0.6617071868972462,p_duty_ramp:-0.3060154629708691,p_repeat_speed:0,
      p_pha_offset:0.09457121181166817,p_pha_ramp:-0.13335891297662508,
      p_lpf_freq:1,p_lpf_ramp:0,p_lpf_resonance:0,p_hpf_freq:0.17030933796983944,
      p_hpf_ramp:0,sound_vol:0.25,sample_rate:44100,sample_size:8
    },
    explosion:{
      oldParams:true,wave_type:3,p_env_attack:0,p_env_sustain:0.3000320810772538,
      p_env_punch:0.77319970666226,p_env_decay:0.3461502494774915,
      p_base_freq:0.06625025730312657,p_freq_limit:0,p_freq_ramp:-0.06365312382012553,
      p_freq_dramp:0,p_vib_strength:0.11889569289213758,p_vib_speed:0.022197214690132003,
      p_arp_mod:0,p_arp_speed:0,p_duty:0,p_duty_ramp:0,p_repeat_speed:0.5099983341597087,
      p_pha_offset:0,p_pha_ramp:0,p_lpf_freq:1,p_lpf_ramp:0,p_lpf_resonance:0,
      p_hpf_freq:0,p_hpf_ramp:0,sound_vol:0.25,sample_rate:44100,sample_size:8
    },
    hit:{
      oldParams:true,wave_type:3,p_env_attack:0,p_env_sustain:0.061690589004034194,
      p_env_punch:0,p_env_decay:0.24745045303629304,p_base_freq:0.4599637412152175,
      p_freq_limit:0,p_freq_ramp:-0.5354499739596064,p_freq_dramp:0,
      p_vib_strength:0,p_vib_speed:0,p_arp_mod:0,p_arp_speed:0,p_duty:0,p_duty_ramp:0,
      p_repeat_speed:0,p_pha_offset:0,p_pha_ramp:0,p_lpf_freq:1,p_lpf_ramp:0,
      p_lpf_resonance:0,p_hpf_freq:0,p_hpf_ramp:0,sound_vol:0.25,
      sample_rate:44100,sample_size:8
    },
    damageTaken:{
      oldParams:true,wave_type:0,p_env_attack:0,p_env_sustain:0.54,
      p_env_punch:0.361,p_env_decay:0.07868604246643628,p_base_freq:0.281,
      p_freq_limit:0.155,p_freq_ramp:-0.212,p_freq_dramp:0.132,
      p_vib_strength:0.036,p_vib_speed:0,p_arp_mod:0,p_arp_speed:0,
      p_duty:0.10814031988707107,p_duty_ramp:0.10604714644629827,p_repeat_speed:0,
      p_pha_offset:0,p_pha_ramp:0,p_lpf_freq:1,p_lpf_ramp:0,p_lpf_resonance:0,
      p_hpf_freq:0.20961081637700488,p_hpf_ramp:0,sound_vol:0.25,
      sample_rate:44100,sample_size:8
    },
    projectileDestroyed:{
      oldParams:true,wave_type:3,p_env_attack:0,p_env_sustain:0.19843878292823924,
      p_env_punch:0.7346916569636881,p_env_decay:0.013646621308142077,
      p_base_freq:0.843553886021889,p_freq_limit:0,p_freq_ramp:-0.06647332109598869,
      p_freq_dramp:0,p_vib_strength:0.01336983310490416,p_vib_speed:0.48678187349491475,
      p_arp_mod:0.6432943392447635,p_arp_speed:0.7740654619989626,p_duty:0,p_duty_ramp:0,
      p_repeat_speed:0,p_pha_offset:0,p_pha_ramp:0,p_lpf_freq:1,p_lpf_ramp:0,
      p_lpf_resonance:0,p_hpf_freq:0.9748173931426597,p_hpf_ramp:0,sound_vol:0.25,
      sample_rate:44100,sample_size:8
    },
    objectiveComplete:{
      oldParams:true,wave_type:1,p_env_attack:0,p_env_sustain:0.07855743150157861,
      p_env_punch:0.4399709139203936,p_env_decay:0.20745551760641323,
      p_base_freq:0.6076418022752685,p_freq_limit:0,p_freq_ramp:0,p_freq_dramp:0,
      p_vib_strength:0,p_vib_speed:0,p_arp_mod:0.5060446188325483,
      p_arp_speed:0.6727002344559301,p_duty:0,p_duty_ramp:0,p_repeat_speed:0,
      p_pha_offset:0,p_pha_ramp:0,p_lpf_freq:1,p_lpf_ramp:0,p_lpf_resonance:0,
      p_hpf_freq:0,p_hpf_ramp:0,sound_vol:0.25,sample_rate:44100,sample_size:8
    },
    zoom:{
      oldParams:true,wave_type:3,p_env_attack:-0.15230178288334018,
      p_env_sustain:0.5250494835599484,p_env_punch:0.30378079023331356,
      p_env_decay:0.7711178560076295,p_base_freq:0.46390414642142436,
      p_freq_limit:0,p_freq_ramp:-0.012996986152607802,p_freq_dramp:-0.0000176938086179177,
      p_vib_strength:0.30158235126590144,p_vib_speed:0.5386564541330348,
      p_arp_mod:-0.06728331288475164,p_arp_speed:-0.9567938788196284,
      p_duty:-0.9956131555636349,p_duty_ramp:0.0002675006200145363,
      p_repeat_speed:0.18136835742482527,p_pha_offset:0.006893674433480798,
      p_pha_ramp:0.0009522752976609043,p_lpf_freq:0.7165847008205332,
      p_lpf_ramp:0.0002034885717715907,p_lpf_resonance:0.187073790929708,
      p_hpf_freq:0.01032624492711583,p_hpf_ramp:0.00009871679468908324,
      sound_vol:0.25,sample_rate:44100,sample_size:8
    },
    disconnectStatic:{
      oldParams:true,wave_type:3,p_env_attack:0,p_env_sustain:0.18,
      p_env_punch:0.15,p_env_decay:0.28,p_base_freq:0.35,
      p_freq_limit:0,p_freq_ramp:-0.08,p_freq_dramp:0,p_vib_strength:0,p_vib_speed:0,
      p_arp_mod:0,p_arp_speed:0,p_duty:0,p_duty_ramp:0,p_repeat_speed:0.18,
      p_pha_offset:0,p_pha_ramp:0,p_lpf_freq:0.55,p_lpf_ramp:-0.12,
      p_lpf_resonance:0.25,p_hpf_freq:0.18,p_hpf_ramp:0.08,
      sound_vol:0.25,sample_rate:44100,sample_size:8
    },
    disconnectBlip:{
      oldParams:true,wave_type:0,p_env_attack:0,p_env_sustain:0.1921153471527901,
      p_env_punch:0,p_env_decay:0.0033858611604440816,p_base_freq:0.5858640224725784,
      p_freq_limit:0,p_freq_ramp:0,p_freq_dramp:0,p_vib_strength:0,p_vib_speed:0,
      p_arp_mod:0,p_arp_speed:0,p_duty:0.2504389733964411,p_duty_ramp:0,
      p_repeat_speed:0,p_pha_offset:0,p_pha_ramp:0,p_lpf_freq:1,p_lpf_ramp:0,
      p_lpf_resonance:0,p_hpf_freq:0.1,p_hpf_ramp:0,sound_vol:0.25,
      sample_rate:44100,sample_size:8
    },
    uiClick:{
      oldParams:true,wave_type:1,p_env_attack:0,p_env_sustain:0.083,
      p_env_punch:0,p_env_decay:0.04233833753845082,p_base_freq:0.434,
      p_freq_limit:0,p_freq_ramp:0,p_freq_dramp:0,p_vib_strength:0,p_vib_speed:0,
      p_arp_mod:0,p_arp_speed:0,p_duty:1,p_duty_ramp:0,p_repeat_speed:0,
      p_pha_offset:0.344,p_pha_ramp:0.106,p_lpf_freq:1,p_lpf_ramp:0,
      p_lpf_resonance:0,p_hpf_freq:0.1,p_hpf_ramp:0,sound_vol:0.25,
      sample_rate:44100,sample_size:8
    },
    swampSpit:{
      oldParams:true,wave_type:3,p_env_attack:0,p_env_sustain:0.030762831638899358,
      p_env_punch:0,p_env_decay:0.22580529418166762,p_base_freq:0.5922194778303246,
      p_freq_limit:0,p_freq_ramp:-0.3845827862770596,p_freq_dramp:0,
      p_vib_strength:0,p_vib_speed:0,p_arp_mod:0,p_arp_speed:0,
      p_duty:0,p_duty_ramp:0,p_repeat_speed:0,p_pha_offset:0,p_pha_ramp:0,
      p_lpf_freq:1,p_lpf_ramp:0,p_lpf_resonance:0,p_hpf_freq:0.2762097881417527,
      p_hpf_ramp:0,sound_vol:0.25,sample_rate:44100,sample_size:8
    },
    relayCalibrated:{
      oldParams:true,wave_type:1,p_env_attack:0,p_env_sustain:0.8735809241124654,
      p_env_punch:0.9577782185833931,p_env_decay:0.12748998885448234,
      p_base_freq:0.13615778746815113,p_freq_limit:0,p_freq_ramp:0.026,
      p_freq_dramp:-0.013,p_vib_strength:0,p_vib_speed:0,p_arp_mod:0.146,
      p_arp_speed:0.613,p_duty:0.54,p_duty_ramp:0.172,p_repeat_speed:0,
      p_pha_offset:0,p_pha_ramp:0,p_lpf_freq:1,p_lpf_ramp:0.066,
      p_lpf_resonance:0.46,p_hpf_freq:0.089,p_hpf_ramp:0.212,
      sound_vol:0.295,sample_rate:44100,sample_size:8
    },
    droneApproval:{
      // User-approved drone/security confirmation sound (pickupCoin.json).
      oldParams:true,wave_type:1,p_env_attack:0,p_env_sustain:0.03927660787805455,
      p_env_punch:0.5339074862570341,p_env_decay:0.48818737933842604,
      p_base_freq:0.5430972150483827,p_freq_limit:0,p_freq_ramp:0,p_freq_dramp:0,
      p_vib_strength:0,p_vib_speed:0,p_arp_mod:0.4438957201768087,
      p_arp_speed:0.6598473228054721,p_duty:0,p_duty_ramp:0,p_repeat_speed:0,
      p_pha_offset:0,p_pha_ramp:0,p_lpf_freq:1,p_lpf_ramp:0,p_lpf_resonance:0,
      p_hpf_freq:0,p_hpf_ramp:0,sound_vol:0.25,sample_rate:44100,sample_size:8
    },
    terminalRed:{
      oldParams:true,wave_type:0,p_env_attack:0.0721557995362945,
      p_env_sustain:0.28877278388084193,p_env_punch:0.01429332382029539,
      p_env_decay:0.25232655747934496,p_base_freq:0.3824492543987325,
      p_freq_limit:0,p_freq_ramp:0.16913801365923561,p_freq_dramp:0.702,
      p_vib_strength:0,p_vib_speed:0,p_arp_mod:0.0015389248952657891,
      p_arp_speed:0.008307598908819137,p_duty:0.5086932949027746,
      p_duty_ramp:0.003856927398619543,p_repeat_speed:0.5702569876574459,
      p_pha_offset:0.066,p_pha_ramp:-0.07284623820992256,
      p_lpf_freq:0.9510758431300554,p_lpf_ramp:0.06268493006745789,
      p_lpf_resonance:0,p_hpf_freq:0.04327256105207437,
      p_hpf_ramp:-0.09334648112250928,sound_vol:0.25,
      sample_rate:44100,sample_size:8,p_vib_delay:null
    }
  };
  static ensureContext(){
    if(!this.ctx){
      const AC=window.AudioContext||window.webkitAudioContext;
      if(!AC)return null;
      this.ctx=new AC();
    }
    if(this.ctx.state==='suspended')this.ctx.resume().catch(()=>{});
    return this.ctx
  }
  static play(name,volume=1,trimName=name){
    const mixed=AudioMixer.effectVolume(trimName)*volume;
    if(mixed<=0)return;
    const def=this.definitions[name],ctx=this.ensureContext();
    if(!def||!ctx)return;
    let buffer=this.buffers.get(name);
    if(!buffer){buffer=this.makeBuffer(ctx,def);this.buffers.set(name,buffer)}
    const source=ctx.createBufferSource(),gain=ctx.createGain();
    const duck=Math.max(.0001,AudioMixer.fxDuckGain),entry={gain,base:mixed/duck};
    source.buffer=buffer;gain.gain.value=mixed;
    source.connect(gain);gain.connect(ctx.destination);this.activeGains.add(entry);
    source.onended=()=>this.activeGains.delete(entry);source.start()
  }
  static applyDuckToActive(){
    const duck=AudioMixer.fxDuckGain,ctx=this.ctx;
    if(!ctx)return;
    for(const entry of this.activeGains){
      try{entry.gain.gain.setTargetAtTime(entry.base*duck,ctx.currentTime,.025)}catch(_){entry.gain.gain.value=entry.base*duck}
    }
  }
  static laser(){this.play('laser')}
  static explosion(){this.play('explosion')}
  static hit(){this.play('hit')}
  static damageTaken(){this.play('damageTaken')}
  static projectileDestroyed(){this.play('projectileDestroyed')}
  static objectiveComplete(){this.play('objectiveComplete')}
  static zoom(){this.play('zoom')}
  static uiClick(){this.play('uiClick')}
  static swampSpit(){this.play('swampSpit')}
  static relayCalibrated(){this.play('relayCalibrated')}
  static droneApproval(){this.play('droneApproval')}
  static terminalRed(){this.play('terminalRed')}

  static disconnect(){
    if(AudioMixer.effectVolume('disconnect')<=0)return;
    this.play('disconnectStatic',1,'disconnect');
    setTimeout(()=>this.play('disconnectBlip',1,'disconnect'),210)
  }
  static makeBuffer(ctx,p){
    const samples=this.renderSfxr(p);
    const buffer=ctx.createBuffer(1,samples.length,p.sample_rate||44100);
    buffer.copyToChannel(samples,0);
    return buffer
  }
  // Compact browser implementation of the original sfxr synthesis model used by sfxr.me.
  static renderSfxr(p){
    const OVERSAMPLING=8;
    const waveShape=p.wave_type|0;
    let period,periodMax,periodMult,periodMultSlide,dutyCycle,dutyCycleSlide;
    let arpeggioMultiplier,arpeggioTime,elapsedSinceRepeat=0;
    const resetRepeat=()=>{
      elapsedSinceRepeat=0;
      period=100/(p.p_base_freq*p.p_base_freq+.001);
      periodMax=100/(p.p_freq_limit*p.p_freq_limit+.001);
      periodMult=1-Math.pow(p.p_freq_ramp,3)*.01;
      periodMultSlide=-Math.pow(p.p_freq_dramp,3)*.000001;
      dutyCycle=.5-p.p_duty*.5;
      dutyCycleSlide=-p.p_duty_ramp*.00005;
      arpeggioMultiplier=p.p_arp_mod>=0?1-Math.pow(p.p_arp_mod,2)*.9:1+Math.pow(p.p_arp_mod,2)*10;
      arpeggioTime=Math.floor(Math.pow(1-p.p_arp_speed,2)*20000+32);
      if(p.p_arp_speed===1)arpeggioTime=0
    };
    resetRepeat();
    const enableFrequencyCutoff=p.p_freq_limit>0;
    let fltw=Math.pow(p.p_lpf_freq,3)*.1;
    const enableLowPassFilter=p.p_lpf_freq!==1;
    const fltwD=1+p.p_lpf_ramp*.0001;
    let fltdmp=5/(1+Math.pow(p.p_lpf_resonance,2)*20)*(.01+fltw);
    if(fltdmp>.8)fltdmp=.8;
    let flthp=Math.pow(p.p_hpf_freq,2)*.1;
    const flthpD=1+p.p_hpf_ramp*.0003;
    const vibratoSpeed=Math.pow(p.p_vib_speed,2)*.01;
    const vibratoAmplitude=p.p_vib_strength*.5;
    const envelopeLength=[
      Math.floor(p.p_env_attack*p.p_env_attack*100000),
      Math.floor(p.p_env_sustain*p.p_env_sustain*100000),
      Math.floor(p.p_env_decay*p.p_env_decay*100000)
    ];
    const envelopePunch=p.p_env_punch;
    let flangerOffset=Math.pow(p.p_pha_offset,2)*1020;
    if(p.p_pha_offset<0)flangerOffset=-flangerOffset;
    let flangerOffsetSlide=Math.pow(p.p_pha_ramp,2);
    if(p.p_pha_ramp<0)flangerOffsetSlide=-flangerOffsetSlide;
    let repeatTime=Math.floor(Math.pow(1-p.p_repeat_speed,2)*20000+32);
    if(p.p_repeat_speed===0)repeatTime=0;
    const gain=Math.exp(p.sound_vol)-1;
    const sampleRate=p.sample_rate||44100;
    let fltp=0,fltdp=0,fltphp=0,envelopeStage=0,envelopeElapsed=0,vibratoPhase=0,phase=0,ipp=0;
    const noiseBuffer=new Float32Array(32),flangerBuffer=new Float32Array(1024);
    const refillNoise=()=>{for(let i=0;i<32;i++)noiseBuffer[i]=Math.random()*2-1};
    refillNoise();
    const output=[];
    let sampleSum=0,numSummed=0;
    const summands=Math.max(1,Math.floor(44100/sampleRate));
    const maxTicks=envelopeLength[0]+envelopeLength[1]+envelopeLength[2]+100000;
    for(let t=0;t<maxTicks;t++){
      if(repeatTime!==0&&++elapsedSinceRepeat>=repeatTime)resetRepeat();
      if(arpeggioTime!==0&&t>=arpeggioTime){arpeggioTime=0;period*=arpeggioMultiplier}
      periodMult+=periodMultSlide;period*=periodMult;
      if(period>periodMax){period=periodMax;if(enableFrequencyCutoff)break}
      let rfperiod=period;
      if(vibratoAmplitude>0){vibratoPhase+=vibratoSpeed;rfperiod=period*(1+Math.sin(vibratoPhase)*vibratoAmplitude)}
      let iperiod=Math.floor(rfperiod);if(iperiod<OVERSAMPLING)iperiod=OVERSAMPLING;
      dutyCycle+=dutyCycleSlide;dutyCycle=Math.max(0,Math.min(.5,dutyCycle));
      if(++envelopeElapsed>envelopeLength[envelopeStage]){
        envelopeElapsed=0;
        if(++envelopeStage>2)break
      }
      const envLen=Math.max(1,envelopeLength[envelopeStage]);
      const envf=envelopeElapsed/envLen;
      const envVol=envelopeStage===0?envf:(envelopeStage===1?1+(1-envf)*2*envelopePunch:1-envf);
      flangerOffset+=flangerOffsetSlide;
      let iphase=Math.abs(Math.floor(flangerOffset));if(iphase>1023)iphase=1023;
      flthp*=flthpD;flthp=Math.max(.00001,Math.min(.1,flthp));
      let sample=0;
      for(let si=0;si<OVERSAMPLING;si++){
        phase++;
        if(phase>=iperiod){phase%=iperiod;if(waveShape===3)refillNoise()}
        const fp=phase/iperiod;
        let sub=0;
        if(waveShape===0)sub=fp<dutyCycle?.5:-.5;
        else if(waveShape===1)sub=fp<dutyCycle?(-1+2*fp/Math.max(.000001,dutyCycle)):(1-2*(fp-dutyCycle)/Math.max(.000001,1-dutyCycle));
        else if(waveShape===2)sub=Math.sin(fp*Math.PI*2);
        else sub=noiseBuffer[Math.min(31,Math.floor(phase*32/iperiod))];
        const pp=fltp;
        fltw*=fltwD;fltw=Math.max(0,Math.min(.1,fltw));
        if(enableLowPassFilter){fltdp+=(sub-fltp)*fltw;fltdp-=fltdp*fltdmp}else{fltp=sub;fltdp=0}
        fltp+=fltdp;
        fltphp+=fltp-pp;fltphp-=fltphp*flthp;sub=fltphp;
        flangerBuffer[ipp&1023]=sub;sub+=flangerBuffer[(ipp-iphase+1024)&1023];ipp=(ipp+1)&1023;
        sample+=sub*envVol
      }
      sampleSum+=sample;
      if(++numSummed<summands)continue;
      sample=sampleSum/summands;sampleSum=0;numSummed=0;
      output.push(sample/OVERSAMPLING*gain)
    }
    return Float32Array.from(output)
  }
}


// Continuous procedural close-fighter fly-by synthesis. This follows the tuned
// starstrike_flyby_sound_lab graph: filtered looping noise, dry/wet flanged path,
// feedback, sawtooth whine, stereo pan and a modest Doppler-style pitch shift.
class FlybySoundVoice {
  constructor(ctx,noiseBuffer,params){
    this.ctx=ctx;this.params=params;this.fighterId=0;this.lastUsed=performance.now();
    this.source=ctx.createBufferSource();this.source.buffer=noiseBuffer;this.source.loop=true;
    this.noiseGain=ctx.createGain();
    this.hp=ctx.createBiquadFilter();this.hp.type='highpass';
    this.lp=ctx.createBiquadFilter();this.lp.type='lowpass';
    this.dryGain=ctx.createGain();this.delay=ctx.createDelay(.05);this.wetGain=ctx.createGain();this.feedbackGain=ctx.createGain();
    this.lfo=ctx.createOscillator();this.lfoGain=ctx.createGain();this.lfo.connect(this.lfoGain).connect(this.delay.delayTime);
    this.osc=ctx.createOscillator();this.osc.type='sawtooth';this.toneGain=ctx.createGain();
    this.mixGain=ctx.createGain();this.panner=ctx.createStereoPanner();this.masterGain=ctx.createGain();

    this.source.connect(this.noiseGain).connect(this.hp).connect(this.lp);
    this.lp.connect(this.dryGain).connect(this.mixGain);
    this.lp.connect(this.delay).connect(this.wetGain).connect(this.mixGain);
    this.delay.connect(this.feedbackGain).connect(this.delay);
    this.osc.connect(this.toneGain).connect(this.mixGain);
    this.mixGain.connect(this.panner).connect(this.masterGain).connect(ctx.destination);

    const p=params;
    this.noiseGain.gain.value=p.noiseLevel;
    this.hp.frequency.value=p.highpass;this.hp.Q.value=p.q;
    this.lp.frequency.value=p.lowpass;this.lp.Q.value=p.q;
    this.dryGain.gain.value=1-p.flangeMix*.35;
    this.wetGain.gain.value=p.flangeMix;
    this.feedbackGain.gain.value=p.feedback;
    this.delay.delayTime.value=p.delayBase;
    this.lfo.frequency.value=p.flangeRate;this.lfoGain.gain.value=p.delayDepth;
    this.toneGain.gain.value=p.toneLevel;this.osc.frequency.value=p.toneFreq;
    this.masterGain.gain.value=0;this.panner.pan.value=0;

    this.source.start(0,Math.random()*Math.max(.01,noiseBuffer.duration-.01));
    this.lfo.start();this.osc.start()
  }
  update(s,mixerVolume){
    const p=this.params,t=this.ctx.currentTime,smooth=p.smoothing;
    const d=Math.max(.001,s.distance);
    let proximity=Math.max(0,(p.closeGate-d)/Math.max(.001,p.closeGate));
    proximity=Math.pow(proximity,p.falloff);
    const speedBoost=1+s.relSpeed*p.speedIntensity;
    const m=clamp((s.motion-.08)/.38,0,1),motionGain=m*m*(3-2*m);
    const gain=Math.min(1.5,p.master*mixerVolume*proximity*speedBoost*motionGain);
    const df=clamp(1+s.approach*p.doppler*s.relSpeed,.55,1.50);
    const brightness=1+s.relSpeed*p.motionBrightening;

    this.noiseGain.gain.setTargetAtTime(p.noiseLevel,t,smooth);
    this.hp.frequency.setTargetAtTime(p.highpass,t,smooth);this.hp.Q.setTargetAtTime(p.q,t,smooth);
    this.lp.frequency.setTargetAtTime(Math.min(18000,p.lowpass*brightness*df),t,smooth);this.lp.Q.setTargetAtTime(p.q,t,smooth);
    this.dryGain.gain.setTargetAtTime(1-p.flangeMix*.35,t,smooth);
    this.wetGain.gain.setTargetAtTime(p.flangeMix,t,smooth);
    this.feedbackGain.gain.setTargetAtTime(p.feedback,t,smooth);
    this.delay.delayTime.setTargetAtTime(p.delayBase,t,smooth);
    this.lfo.frequency.setTargetAtTime(p.flangeRate*(.7+s.relSpeed*.45),t,smooth);
    this.lfoGain.gain.setTargetAtTime(p.delayDepth,t,smooth);
    this.toneGain.gain.setTargetAtTime(p.toneLevel,t,smooth);
    this.osc.frequency.setTargetAtTime(p.toneFreq*df*(1+s.relSpeed*p.speedPitch),t,smooth);
    this.panner.pan.setTargetAtTime(clamp(s.pan,-1,1),t,smooth);
    this.masterGain.gain.setTargetAtTime(gain,t,smooth);
    this.fighterId=s.id;this.lastUsed=performance.now()
  }
  silence(){
    if(!this.ctx)return;
    this.masterGain.gain.setTargetAtTime(0,this.ctx.currentTime,this.params.smoothing)
  }
  destroy(){
    try{this.source.stop()}catch(_){}try{this.lfo.stop()}catch(_){}try{this.osc.stop()}catch(_){}
    try{this.source.disconnect();this.lfo.disconnect();this.osc.disconnect();this.masterGain.disconnect()}catch(_){}
  }
}

class FlybySoundManager {
  constructor(){
    this.params=Object.freeze({
      lowpass:4200,highpass:250,q:7.50,noiseLevel:1.19,toneLevel:.57,toneFreq:450,
      flangeMix:.47,delayBase:.00280,delayDepth:.00180,flangeRate:2.60,feedback:.51,
      doppler:.27,speedPitch:.11,motionBrightening:1.01,
      relativeSpeedReference:1.75,closestDistance:.28,passWidth:.59,falloff:2.30,
      speedIntensity:.88,closeGate:.60,smoothing:.07,master:.65
    });
    this.ctx=null;this.noiseBuffer=null;this.voices=new Map();this.releaseMs=260
  }
  makeNoiseBuffer(ctx,seconds=2){
    const b=ctx.createBuffer(1,Math.floor(ctx.sampleRate*seconds),ctx.sampleRate),d=b.getChannelData(0);
    let prev=0;
    for(let i=0;i<d.length;i++){
      const white=Math.random()*2-1;prev=prev*.85+white*.15;d[i]=white*.72+prev*.28
    }
    return b
  }
  ensure(){
    const ctx=SoundFX.ensureContext();if(!ctx)return null;
    if(this.ctx!==ctx){
      for(const v of this.voices.values())v.destroy();
      this.voices.clear();this.ctx=ctx;this.noiseBuffer=this.makeNoiseBuffer(ctx)
    }
    return ctx
  }
  update(candidates=[]){
    const selected=(candidates||[]).filter(Boolean).sort((a,b)=>b.score-a.score).slice(0,2);
    const selectedIds=new Set(selected.map(s=>s.id)),now=performance.now();
    if(!selected.length){
      for(const [id,v] of this.voices){v.silence();if(!v.releaseAt)v.releaseAt=now;else if(now-v.releaseAt>this.releaseMs){v.destroy();this.voices.delete(id)}}
      return
    }
    const ctx=this.ensure();if(!ctx)return;
    const mix=AudioMixer.channelVolume('fx');
    for(const [id,v] of this.voices){
      if(selectedIds.has(id)){v.releaseAt=0;continue}
      v.silence();if(!v.releaseAt)v.releaseAt=now;else if(now-v.releaseAt>this.releaseMs){v.destroy();this.voices.delete(id)}
    }
    for(const s of selected){
      let v=this.voices.get(s.id);
      if(!v){v=new FlybySoundVoice(ctx,this.noiseBuffer,this.params);this.voices.set(s.id,v)}
      v.releaseAt=0;v.update(s,mix)
    }
  }
  silence(){this.update([])}
  destroy(){for(const v of this.voices.values())v.destroy();this.voices.clear();this.noiseBuffer=null;this.ctx=null}
}


// Subtle procedural foliage / airflow for close trees. Unlike fighter fly-bys this
// deliberately has no flange, whine or dramatic Doppler sweep. Nearby trees are
// aggregated into left/right washes by runtime.js, so a dense forest sounds like a
// moving bed of foliage rather than dozens of individual object whooshes.
class TreeRushSoundVoice {
  constructor(ctx,noiseBuffer,params){
    this.ctx=ctx;this.params=params;
    this.source=ctx.createBufferSource();this.source.buffer=noiseBuffer;this.source.loop=true;
    this.hp=ctx.createBiquadFilter();this.hp.type='highpass';
    this.lp=ctx.createBiquadFilter();this.lp.type='lowpass';
    this.bodyGain=ctx.createGain();
    this.crisp=ctx.createBiquadFilter();this.crisp.type='bandpass';
    this.crispGain=ctx.createGain();
    this.mix=ctx.createGain();this.panner=ctx.createStereoPanner();this.master=ctx.createGain();
    this.flutter=ctx.createOscillator();this.flutter.type='sine';this.flutterGain=ctx.createGain();

    this.source.connect(this.hp).connect(this.lp).connect(this.bodyGain).connect(this.mix);
    this.source.connect(this.crisp).connect(this.crispGain).connect(this.mix);
    this.mix.connect(this.panner).connect(this.master).connect(ctx.destination);
    this.flutter.connect(this.flutterGain).connect(this.bodyGain.gain);

    const p=params;
    this.hp.frequency.value=p.highpass;this.hp.Q.value=.55;
    this.lp.frequency.value=p.lowpass;this.lp.Q.value=.45;
    this.crisp.frequency.value=p.crispFreq;this.crisp.Q.value=.75;
    this.bodyGain.gain.value=.78;this.crispGain.gain.value=p.crispLevel;
    this.flutter.frequency.value=p.flutterRate;this.flutterGain.gain.value=p.flutterDepth;
    this.master.gain.value=0;this.panner.pan.value=0;
    this.source.start(0,Math.random()*Math.max(.01,noiseBuffer.duration-.01));
    this.flutter.start()
  }
  update(state,mixerVolume){
    const p=this.params,t=this.ctx.currentTime,smooth=p.smoothing;
    const motion=clamp((Number(state.speed)||0)/Math.max(.1,p.speedReference),0,1.6);
    const speedGain=motion<=0?0:motion*(1+p.speedInfluence*(motion-1));
    const level=clamp(Number(state.level)||0,0,1.35);
    const gain=Math.min(.75,p.master*mixerVolume*level*speedGain);
    const brightness=.82+motion*.22;
    this.hp.frequency.setTargetAtTime(p.highpass,t,smooth);
    this.lp.frequency.setTargetAtTime(Math.min(12000,p.lowpass*brightness),t,smooth);
    this.crisp.frequency.setTargetAtTime(Math.min(9000,p.crispFreq*brightness),t,smooth);
    this.crispGain.gain.setTargetAtTime(p.crispLevel,t,smooth);
    this.flutter.frequency.setTargetAtTime(p.flutterRate*(.86+motion*.18),t,smooth);
    this.flutterGain.gain.setTargetAtTime(p.flutterDepth,t,smooth);
    this.panner.pan.setTargetAtTime(clamp((Number(state.pan)||0)*p.stereoWidth,-1,1),t,smooth);
    this.master.gain.setTargetAtTime(gain,t,smooth)
  }
  silence(){this.master.gain.setTargetAtTime(0,this.ctx.currentTime,this.params.smoothing)}
  destroy(){
    try{this.source.stop()}catch(_){}try{this.flutter.stop()}catch(_){}
    try{this.source.disconnect();this.flutter.disconnect();this.master.disconnect()}catch(_){}
  }
}

class TreeRushSoundManager {
  constructor(){
    this.defaults=Object.freeze({
      master:.23,range:7.5,falloff:3.20,lowpass:5200,highpass:170,
      crispFreq:2050,crispLevel:.20,flutterRate:5.2,flutterDepth:0,
      stereoWidth:.90,speedReference:20.5,speedInfluence:.30,smoothing:.075
    });
    this.params={...this.defaults};this.ctx=null;this.noiseBuffer=null;this.voices=[];this.previewUntil=0
  }
  makeNoiseBuffer(ctx,seconds=2.4){
    const b=ctx.createBuffer(1,Math.floor(ctx.sampleRate*seconds),ctx.sampleRate),d=b.getChannelData(0);
    let smooth=0,slow=0;
    for(let i=0;i<d.length;i++){
      const white=Math.random()*2-1;smooth=smooth*.72+white*.28;slow=slow*.96+white*.04;
      d[i]=white*.28+smooth*.58+slow*.14
    }
    return b
  }
  ensure(){
    const ctx=SoundFX.ensureContext();if(!ctx)return null;
    if(this.ctx!==ctx){
      for(const v of this.voices)v.destroy();this.voices.length=0;
      this.ctx=ctx;this.noiseBuffer=this.makeNoiseBuffer(ctx);
      this.voices=[new TreeRushSoundVoice(ctx,this.noiseBuffer,this.params),new TreeRushSoundVoice(ctx,this.noiseBuffer,this.params)]
    }
    return ctx
  }
  update(states=[]){
    if(performance.now()<this.previewUntil)return;
    const ctx=this.ensure();if(!ctx)return;
    const mix=AudioMixer.channelVolume('fx');
    for(let i=0;i<this.voices.length;i++){
      const state=states?.[i];if(state&&mix>0)this.voices[i].update(state,mix);else this.voices[i].silence()
    }
  }
  silence(force=false){
    if(!force&&performance.now()<this.previewUntil)return;
    for(const v of this.voices)v.silence()
  }
  setParam(name,value){
    if(!(name in this.params))return;
    const v=Number(value);if(Number.isFinite(v))this.params[name]=v
  }
  reset(){Object.assign(this.params,this.defaults)}
  preview(){
    const ctx=this.ensure();if(!ctx)return;
    this.previewUntil=performance.now()+1050;
    const mix=AudioMixer.channelVolume('fx');
    this.voices[0].update({level:.78,pan:-.72,speed:this.params.speedReference},mix);
    this.voices[1].update({level:.52,pan:.58,speed:this.params.speedReference},mix);
    setTimeout(()=>{if(performance.now()>=this.previewUntil)this.silence(true)},1100)
  }
  destroy(){for(const v of this.voices)v.destroy();this.voices.length=0;this.noiseBuffer=null;this.ctx=null}
}


// Procedural secure-terminal chatter. The source reference is the short square-wave
// sfxr bleep supplied for the hack: immediate attack, short sustain/decay and a light
// high-pass. Ordinary hack traffic is intentionally NOT quantised to a musical scale;
// only successful completion resolves into a tuned four-note major arpeggio.
class HackChirpSoundManager {
  constructor(){
    this.defaults=Object.freeze({volume:.18,minFreq:420,maxFreq:1600,meanGapMs:80,durationMs:78,highpass:170});
    this.params={...this.defaults};this.active=false;this.timer=null;this.previewTimer=null;this.cadenceTimers=[];this.lastFreq=0;this.token=0
  }
  ensure(){return SoundFX.ensureContext()}
  stop({cancelCadence=true}={}){
    this.active=false;this.token++;
    if(this.timer){clearTimeout(this.timer);this.timer=null}
    if(this.previewTimer){clearTimeout(this.previewTimer);this.previewTimer=null}
    if(cancelCadence){for(const id of this.cadenceTimers)clearTimeout(id);this.cadenceTimers.length=0}
  }
  setParam(name,value){
    if(!(name in this.params))return;
    const v=Number(value);if(Number.isFinite(v))this.params[name]=v
  }
  reset(){Object.assign(this.params,this.defaults)}
  randomFrequency(){
    const a=Math.max(80,Math.min(this.params.minFreq,this.params.maxFreq));
    const b=Math.max(a+20,Math.max(this.params.minFreq,this.params.maxFreq));
    // Log-uniform continuous pitch: no equal-tempered note grid, so the chatter
    // never acquires an accidental tune. Avoid nearly repeating the previous pitch.
    let f=a;
    for(let tries=0;tries<5;tries++){
      f=a*Math.pow(b/a,Math.random());
      if(!this.lastFreq||Math.abs(Math.log2(f/this.lastFreq))>.075)break
    }
    this.lastFreq=f;return f
  }
  bleep(freq,durationMs=this.params.durationMs,level=1){
    const ctx=this.ensure();if(!ctx)return;
    const mixed=clamp(this.params.volume*AudioMixer.channelVolume('fx')*level,0,.55);if(mixed<=0)return;
    const osc=ctx.createOscillator(),hp=ctx.createBiquadFilter(),gain=ctx.createGain();
    osc.type='square';osc.frequency.value=Math.max(60,Number(freq)||440);
    hp.type='highpass';hp.frequency.value=Math.max(20,this.params.highpass);hp.Q.value=.45;
    const t=ctx.currentTime,dur=Math.max(.028,(Number(durationMs)||70)/1000),attack=Math.min(.003,dur*.08),hold=dur*.62;
    gain.gain.setValueAtTime(.0001,t);
    gain.gain.linearRampToValueAtTime(mixed,t+attack);
    gain.gain.setValueAtTime(mixed,t+hold);
    gain.gain.exponentialRampToValueAtTime(.0001,t+dur);
    osc.connect(hp).connect(gain).connect(ctx.destination);
    osc.onended=()=>{try{osc.disconnect();hp.disconnect();gain.disconnect()}catch(_){}};
    osc.start(t);osc.stop(t+dur+.01)
  }
  scheduleNext(token){
    if(!this.active||token!==this.token)return;
    const duration=this.params.durationMs*(.68+Math.random()*.68);
    this.bleep(this.randomFrequency(),duration,.82+Math.random()*.28);
    // Irregular single bleeps with occasional tight pairs/triplets. The pitches
    // remain independently random even inside a cluster, so rhythm does not imply melody.
    const clustered=Math.random()<.24;
    const gap=clustered
      ?this.params.meanGapMs*(.24+Math.random()*.30)
      :this.params.meanGapMs*(.72+Math.random()*1.45);
    this.timer=setTimeout(()=>this.scheduleNext(token),Math.max(18,gap))
  }
  start(){
    this.stop();this.active=true;this.lastFreq=0;const token=this.token;this.scheduleNext(token)
  }
  complete(){
    if(this.timer){clearTimeout(this.timer);this.timer=null}
    this.active=false;const token=++this.token;
    // The only tonal phrase in the sequence: root, M3, 5, octave root.
    const lo=Math.max(80,Math.min(this.params.minFreq,this.params.maxFreq)),hi=Math.max(lo+20,Math.max(this.params.minFreq,this.params.maxFreq));
    const root=Math.max(lo,Math.min(hi/2,Math.sqrt(lo*hi)*.80));
    const notes=[root,root*Math.pow(2,4/12),root*Math.pow(2,7/12),root*2];
    const starts=[35,132,229,326],dur=[62,62,70,145];
    this.cadenceTimers.length=0;
    for(let i=0;i<notes.length;i++){
      const id=setTimeout(()=>{if(token===this.token)this.bleep(notes[i],dur[i],i===3?1.22:1.05)},starts[i]);
      this.cadenceTimers.push(id)
    }
    const clearId=setTimeout(()=>{if(token===this.token)this.cadenceTimers.length=0},540);this.cadenceTimers.push(clearId)
  }
  preview(){
    this.start();const token=this.token;
    this.previewTimer=setTimeout(()=>{if(this.active&&token===this.token)this.complete()},1250)
  }
}

class MusicManager {
  static tracks={
    calm:[
      {id:'mozart',title:'Mozart — Piano Concerto No. 21: II. Andante',src:'./music/calm/mozart.ogg'},
      {id:'pachelbel',title:'Pachelbel — Canon',src:'./music/calm/pachelbel.ogg'},
      {id:'satie',title:'Satie — Gymnopédie No. 1',src:'./music/calm/satie.ogg'}
    ],
    violent:[
      {id:'mars',title:'Holst — Mars, the Bringer of War',src:'./music/violent/mars.ogg'},
      {id:'baldmountain',title:'Mussorgsky — Night on Bald Mountain',src:'./music/violent/baldmountain.ogg'},
      {id:'diesirae',title:'Verdi — Dies irae',src:'./music/violent/diesirae.ogg'},
      {id:'valkyries',title:'Wagner — Ride of the Valkyries',src:'./music/violent/valkyries.ogg'}
    ]
  };
  static allTracks(){return [...this.tracks.calm,...this.tracks.violent]}
  static trackById(id){return this.allTracks().find(t=>t.id===id)||null}
  constructor(){
    this.mode='calm';
    this.current=null;
    this.lastTrack={calm:null,violent:null};
    this.baseVolume=.34;
    this.fadeToken=0;
    this.previewing=false;
    this.previewTrackId=null;
    this.previewPendingFraction=0;
    this.trackDurations={};
    this.speechDuckGain=1;
    this.crossfadeActive=false;
    this.decks=[new Audio(),new Audio()];
    for(const deck of this.decks){
      deck.preload='metadata';
      deck.loop=false;
      deck.volume=0;
      deck.addEventListener('ended',()=>{
        if(!this.previewing&&this.current===deck&&this.mode)this.startRandom(this.mode,false)
      });
      deck.addEventListener('error',()=>{
        if(!this.previewing&&this.current===deck&&this.mode)setTimeout(()=>this.startRandom(this.mode,false),250)
      });
    }
    this.previewDeck=new Audio();
    this.previewDeck.preload='metadata';
    this.previewDeck.loop=false;
    this.previewDeck.volume=0;
    this.previewDeck.addEventListener('loadedmetadata',()=>{
      const id=this.previewDeck.dataset.trackId;
      if(id&&Number.isFinite(this.previewDeck.duration))this.trackDurations[id]=this.previewDeck.duration;
      if(this.previewing&&id===this.previewTrackId&&Number.isFinite(this.previewDeck.duration)&&this.previewDeck.duration>0){
        try{this.previewDeck.currentTime=clamp(this.previewPendingFraction,0,1)*this.previewDeck.duration}catch(_){ }
        this.previewDeck.volume=this.mixedVolume(id)
      }
    });
    this.previewDeck.addEventListener('ended',()=>this.stopPreview(true));
    const unlock=()=>this.ensureStarted();
    document.addEventListener('pointerdown',unlock,{once:true,capture:true});
    document.addEventListener('keydown',unlock,{once:true,capture:true});
  }
  mixedVolume(trackId=null){return clamp(this.baseVolume*AudioMixer.channelVolume('music')*AudioMixer.musicTrackTrim(trackId||'')*this.speechDuckGain,0,1)}
  setSpeechDuckGain(value){
    this.speechDuckGain=clamp(Number(value)||0,0,1);
    // During an active crossfade the frame loop already reads mixedVolume(), so
    // do not flatten the fade by forcing either deck straight to full target.
    if(this.crossfadeActive)return;
    if(this.previewing){if(!this.previewDeck.paused)this.previewDeck.volume=this.mixedVolume(this.previewTrackId);return}
    if(this.current&&this.current.src&&!this.current.paused)this.current.volume=this.mixedVolume(this.current.dataset.trackId)
  }
  choose(mode){
    const list=MusicManager.tracks[mode]||[];
    if(!list.length)return null;
    const previous=this.lastTrack[mode];
    const choices=list.length>1?list.filter(t=>t.id!==previous):list;
    return choices[Math.floor(Math.random()*choices.length)]||list[0]
  }
  ensureStarted(){
    if(this.previewing)return;
    if(!this.mode||AudioMixer.channelVolume('music')<=0)return;
    if(!this.current||!this.current.src)this.startRandom(this.mode,false);
    else if(this.current.paused)this.current.play().catch(()=>{})
  }
  setMode(mode){
    if(!MusicManager.tracks[mode])return;
    const changed=this.mode!==mode;
    this.mode=mode;
    if(this.previewing||AudioMixer.channelVolume('music')<=0)return;
    if(changed||!this.current||!this.current.src)this.startRandom(mode,changed);
    else if(this.current.paused)this.current.play().catch(()=>{})
  }
  cycleTrack(){
    if(this.previewing||AudioMixer.channelVolume('music')<=0)return false;
    const mode=this.mode||'calm',list=MusicManager.tracks[mode]||[];
    if(!list.length)return false;
    const currentId=this.current?.dataset.trackId||null;
    let index=list.findIndex(t=>t.id===currentId);
    index=(index+1+list.length)%list.length;
    const track=list[index];
    this.lastTrack[mode]=track.id;
    const old=this.current;
    const next=old===this.decks[0]?this.decks[1]:this.decks[0];
    this.fadeToken++;
    try{next.pause();next.currentTime=0}catch(_){ }
    if(old&&old!==next){try{old.pause()}catch(_){ } old.volume=0}
    next.src=track.src;
    next.dataset.trackId=track.id;
    next.dataset.trackMode=mode;
    next.volume=this.mixedVolume(track.id);
    this.current=next;
    const p=next.play();
    if(p&&typeof p.catch==='function')p.catch(()=>{});
    return true
  }
  startRandom(mode,crossfade=true){
    if(this.previewing)return;
    const track=this.choose(mode);if(!track)return;
    this.lastTrack[mode]=track.id;
    const old=this.current;
    const next=old===this.decks[0]?this.decks[1]:this.decks[0];
    this.fadeToken++;
    try{next.pause();next.currentTime=0}catch(_){ }
    next.src=track.src;
    next.dataset.trackId=track.id;
    next.dataset.trackMode=mode;
    next.volume=crossfade?0:this.mixedVolume(track.id);
    this.current=next;
    const token=this.fadeToken;
    const p=next.play();
    if(p&&typeof p.then==='function')p.then(()=>{
      if(token!==this.fadeToken||this.previewing)return;
      if(crossfade&&old&&!old.paused)this.crossfade(old,next,1200,token);
      else{
        if(old&&old!==next){old.pause();old.volume=0}
        next.volume=this.mixedVolume(track.id)
      }
    }).catch(()=>{});
  }
  crossfade(old,next,duration,token){
    const start=performance.now(),oldStart=old.volume,duckAtStart=Math.max(.0001,this.speechDuckGain);
    this.crossfadeActive=true;
    const step=now=>{
      if(token!==this.fadeToken||this.previewing){this.crossfadeActive=false;return}
      const t=clamp((now-start)/duration,0,1),target=this.mixedVolume(next.dataset.trackId);
      old.volume=clamp(oldStart*(1-t)*(this.speechDuckGain/duckAtStart),0,1);
      next.volume=clamp(target*t,0,1);
      if(t<1)requestAnimationFrame(step);
      else{this.crossfadeActive=false;old.pause();old.volume=0;next.volume=target}
    };
    requestAnimationFrame(step)
  }
  startPreview(trackId,fraction=0){
    const track=MusicManager.trackById(trackId);if(!track)return false;
    this.fadeToken++;
    for(const deck of this.decks)deck.pause();
    this.previewing=true;
    this.previewTrackId=trackId;
    this.previewPendingFraction=clamp(Number(fraction)||0,0,1);
    const deck=this.previewDeck;
    const same=deck.dataset.trackId===trackId&&deck.src;
    if(!same){
      try{deck.pause();deck.currentTime=0}catch(_){ }
      deck.volume=0;
      deck.src=track.src;
      deck.dataset.trackId=trackId;
      deck.load()
    }else if(Number.isFinite(deck.duration)&&deck.duration>0){
      try{deck.currentTime=this.previewPendingFraction*deck.duration}catch(_){ }
      this.trackDurations[trackId]=deck.duration;
      deck.volume=this.mixedVolume(trackId)
    }
    const p=deck.play();
    if(p&&typeof p.then==='function')p.then(()=>{
      if(this.previewing&&this.previewTrackId===trackId&&Number.isFinite(deck.duration)&&deck.duration>0){
        try{deck.currentTime=this.previewPendingFraction*deck.duration}catch(_){ }
        deck.volume=this.mixedVolume(trackId)
      }
    }).catch(()=>{});
    return true
  }
  stopPreview(resumeNormal=true){
    if(!this.previewing&&!this.previewDeck.src)return;
    try{this.previewDeck.pause()}catch(_){ }
    this.previewDeck.volume=0;
    this.previewing=false;
    this.previewTrackId=null;
    this.fadeToken++;
    if(resumeNormal&&AudioMixer.channelVolume('music')>0){
      if(this.current&&this.current.src){
        this.current.volume=this.mixedVolume(this.current.dataset.trackId);
        this.current.play().catch(()=>{})
      }else this.startRandom(this.mode||'calm',false)
    }
  }
  seekPreview(trackId,fraction){
    this.previewPendingFraction=clamp(Number(fraction)||0,0,1);
    if(!this.previewing||this.previewTrackId!==trackId)return;
    const d=this.previewDeck.duration;
    if(Number.isFinite(d)&&d>0){try{this.previewDeck.currentTime=this.previewPendingFraction*d}catch(_){ }}
  }
  applyMixer(){
    if(this.previewing){
      const target=this.mixedVolume(this.previewTrackId);
      this.previewDeck.volume=target;
      if(target<=0)this.previewDeck.pause();
      else if(this.previewDeck.src&&this.previewDeck.paused)this.previewDeck.play().catch(()=>{});
      return
    }
    const target=this.current?.src?this.mixedVolume(this.current.dataset.trackId):0;
    if(AudioMixer.channelVolume('music')<=0){for(const deck of this.decks)deck.pause();return}
    if(this.current&&this.current.src){
      this.current.volume=target;
      if(this.current.paused)this.current.play().catch(()=>{})
    }else this.startRandom(this.mode||'calm',false)
  }
}


// Continuous procedural electrical field for the bunker Tesla perimeter. The sound
// is intentionally not a one-shot zap: it fades in as the player approaches the
// lethal boundary, pans toward that side of the corridor, and becomes harsher once
// the pylons actually latch on. Filtered noise supplies the crackle while two low
// oscillators provide the transformer-like electrical buzz.
class TeslaBuzzSoundManager {
  constructor(){
    this.ctx=null;this.source=null;this.noiseGain=null;this.hp=null;this.bp=null;
    this.osc=null;this.osc2=null;this.oscGain=null;this.osc2Gain=null;this.mix=null;this.panner=null;this.master=null
  }
  makeNoiseBuffer(ctx,seconds=1.8){
    const b=ctx.createBuffer(1,Math.floor(ctx.sampleRate*seconds),ctx.sampleRate),d=b.getChannelData(0);
    let slow=0;
    for(let i=0;i<d.length;i++){
      const white=Math.random()*2-1;slow=slow*.91+white*.09;d[i]=white*.78+slow*.22
    }
    return b
  }
  ensure(){
    const ctx=SoundFX.ensureContext();if(!ctx)return null;
    if(this.ctx===ctx&&this.source)return ctx;
    this.destroy();this.ctx=ctx;
    const noise=this.makeNoiseBuffer(ctx);
    this.source=ctx.createBufferSource();this.source.buffer=noise;this.source.loop=true;
    this.hp=ctx.createBiquadFilter();this.hp.type='lowpass';this.hp.frequency.value=3200;this.hp.Q.value=.35;
    this.bp=ctx.createBiquadFilter();this.bp.type='bandpass';this.bp.frequency.value=820;this.bp.Q.value=.55;
    // Noise is only the crackle texture. The audible identity is the strong low
    // transformer-like saw/square pair below, so this reads as a BUZZ rather than hiss.
    this.noiseGain=ctx.createGain();this.noiseGain.gain.value=.16;
    this.osc=ctx.createOscillator();this.osc.type='sawtooth';this.osc.frequency.value=74;
    this.osc2=ctx.createOscillator();this.osc2.type='square';this.osc2.frequency.value=148;
    this.oscGain=ctx.createGain();this.oscGain.gain.value=.27;
    this.osc2Gain=ctx.createGain();this.osc2Gain.gain.value=.11;
    this.mix=ctx.createGain();this.panner=ctx.createStereoPanner();this.master=ctx.createGain();this.master.gain.value=0;
    this.source.connect(this.hp).connect(this.bp).connect(this.noiseGain).connect(this.mix);
    this.osc.connect(this.oscGain).connect(this.mix);this.osc2.connect(this.osc2Gain).connect(this.mix);
    this.mix.connect(this.panner).connect(this.master).connect(ctx.destination);
    this.source.start(0,Math.random()*Math.max(.01,noise.duration-.01));this.osc.start();this.osc2.start();
    return ctx
  }
  update(state={}){
    // Never allow a perimeter update later in the same frame to resurrect the
    // procedural sound after the damage path has killed the player.
    if(typeof mode!=='undefined'&&mode==='dead'){this.destroy();return}
    const intensity=clamp(Number(state.intensity)||0,0,1),lethal=!!state.lethal;
    if(intensity<=.005){this.silence();return}
    const ctx=this.ensure();if(!ctx)return;
    const now=ctx.currentTime,mix=AudioMixer.channelVolume('fx'),smooth=.035;
    const base=70+intensity*12,warble=Math.sin(now*31)*2.2+Math.sin(now*17)*1.1;
    const level=mix*intensity*(lethal?.95:.13);
    this.master.gain.cancelScheduledValues(now);
    if(lethal){
      // Live lightning is full-strength immediately. The low oscillators dominate,
      // giving a loud electrical BUZZ; noise is only a small crackling component.
      this.master.gain.setValueAtTime(mix*.95,now)
    }else this.master.gain.setTargetAtTime(level,now,smooth);
    this.panner.pan.setTargetAtTime(clamp(Number(state.pan)||0,-1,1),now,.045);
    this.hp.frequency.setTargetAtTime(lethal?3000:2400,now,.05);
    this.bp.frequency.setTargetAtTime(lethal?980:760,now,.05);
    this.noiseGain.gain.setTargetAtTime(lethal?.20:.10+intensity*.05,now,.02);
    this.osc.frequency.setTargetAtTime(base+warble,now,.025);
    this.osc2.frequency.setTargetAtTime((base+warble)*2.005,now,.025);
    this.oscGain.gain.setTargetAtTime(lethal?.38:.18,now,.02);
    this.osc2Gain.gain.setTargetAtTime(lethal?.16:.065,now,.02)
  }
  silence(){
    if(this.master&&this.ctx)this.master.gain.setTargetAtTime(0,this.ctx.currentTime,.055)
  }
  destroy(){
    try{this.source?.stop()}catch(_){}try{this.osc?.stop()}catch(_){}try{this.osc2?.stop()}catch(_){}
    try{this.source?.disconnect();this.osc?.disconnect();this.osc2?.disconnect();this.master?.disconnect()}catch(_){}
    this.source=this.noiseGain=this.hp=this.bp=this.osc=this.osc2=this.oscGain=this.osc2Gain=this.mix=this.panner=this.master=null;this.ctx=null
  }
}

class AudioManager {
  constructor(){
    AudioMixer.ensure();
    this.music=new MusicManager();
    this.flyby=new FlybySoundManager();
    this.treeRush=new TreeRushSoundManager();
    this.teslaBuzz=new TeslaBuzzSoundManager();
    this.hackChirp=new HackChirpSoundManager();
    this.voiceFiles={
      checkpoint:'./voices/1checkpoint.mp3',
      destroyInterceptors:'./voices/2destroyinterceptors.mp3',
      eliminateHostileGroup:'./voices/eliminatethehostiles.mp3',
      searchWreckageForNavigationData:'./voices/searchwreckagefornavigationdata.mp3',
      noRecoverableNavigationData:'./voices/norecoverablenavigationdata.mp3',
      navigationDataRecovered:'./voices/navigationdatarecovered.mp3',
      proceedToVoxCommsCentre:'./voices/proceedtovoxcommscentre.mp3',
      presentCredentialsToSecurityDrone:'./voices/presentcredentialstosecuritydrone.mp3',
      stationAccessGranted:'./voices/stationaccessgranted.mp3',
      dataTransferComplete:'./voices/datatransfercomplete.mp3',
      proceedToWreck:'./voices/proceedtothewreck.mp3',
      pirateAmbushDestroyPirates:'./voices/pirateambushdestroythepirates.mp3',
      downloadingFlightRecorderData:'./voices/downloadingflightrecorderdata.mp3',
      headingToFreeTradersDepot:'./voices/headingtofreetradersdepot.mp3',
      targetLocked:'./voices/targetlocked.mp3',
      hazardTargetsIdentified:'./voices/hazardtargetsidentified.mp3',
      customsInterceptDetected:'./voices/customsinterceptdetected.mp3',
      destroyCustomsDrones:'./voices/destroycustomsdrones.mp3',
      pirateInterceptDetected:'./voices/pirateinterceptdetected.mp3',
      rogueDronesDetected:'./voices/roguedronesdetected.mp3',
      descending:'./voices/3descendingtoplanet.mp3',
      descendingToMoon:'./voices/descendingtomoon.mp3',
      destroyPylons:'./voices/4destroypylons.mp3',
      bunkerShieldWeakened:'./voices/5bunkershieldweakened.mp3',
      crossDefences:'./voices/crossthedefences.mp3',
      breachTheBunker:'./voices/breachthebunker.mp3',
      shootBunkerDoors:'./voices/shootthebunkerdoors.mp3',
      recoverEquipment:'./voices/recovertheequipment.mp3',
      proceedToOsdCompound:'./voices/proceedtotheosdcompound.mp3',
      breachBunker:'./voices/6breachbunkerentrance.mp3',
      destroyReactorAhead:'./voices/7destroythereactorahead.mp3',
      missionComplete:'./voices/8missioncompletereturningtobase.mp3',
      missionFailed:'./voices/9contactlostmissionfailed.mp3',
      shieldsLow:'./voices/10warningshieldsarelow.mp3',
      shieldsDepleted:'./voices/11warningshieldsdepleted.mp3',
      deliveryComplete:'./voices/deliverycomplete.mp3',
      recoveryComplete:'./voices/recoverycomplete.mp3',
      deliveryApproachClear:'./voices/deliveryapproachclear.mp3',
      xenoInfestationDetected:'./voices/xenoinfestationdetected.mp3',
      clearHostileXenoforms:'./voices/clearhostilexenoforms.mp3',
      xenoPheromoneActive:'./voices/pheromonemaskactive.mp3',
      xenoProceedNestCore:'./voices/proceedtonestcore.mp3',
      xenoPheromoneCompromised:'./voices/pheromonemaskcompromised.mp3',
      xenoCoreEntry:'./voices/hivecoreentryahead.mp3',
      xenoDestroyRegulator:'./voices/destroyswarmregulator.mp3',
      xenoSwarmFrenzy:'./voices/swarmcohesionlost.mp3',
      xenoHiveDestroyed:'./voices/hivedestructionconfirmed.mp3',
      proceedToCity:'./voices/proceedtothecity.mp3',
      proceedToForest:'./voices/proceedtotheforest.mp3',
      avoidCivilianVehicles:'./voices/avoidcivilianvehcles.mp3',
      doNotAttackCivilians:'./voices/donoattackcivilians.mp3',
      mailNormal:'./voices/youhavemail.mp3',
      mailImportant:'./voices/youhaveimportantmail.mp3',
      unspentSkillPoints:'./voices/youhaveunspentskillpoints.mp3',
      tutorialWelcome:'./voices/welcomevoxtraining.mp3',
      tutorialMoveAim:'./voices/movemousetoaimandsteer.mp3',
      tutorialAvoidCollisions:'./voices/avoidcollisionssim.mp3',
      tutorialPrimaryFire:'./voices/presstheleftmousebuttontofire..mp3',
      tutorialDestroyFive:'./voices/destroyfiveasteroids.mp3',
      tutorialShootProjectiles:'./voices/shootincomingprojectiles.mp3',
      tutorialAcquireLock:'./voices/holdrightmousebuttontolock.mp3',
      tutorialFollowTarget:'./voices/followtargetindicator.mp3',
      tutorialDestroyEnemy:'./voices/destroyenemyship.mp3',
      tutorialShieldsCritical:'./voices/shieldscriticallylow.mp3',
      tutorialUseShieldBooster:'./voices/press1touseshieldbooster.mp3',
      tutorialConsumablesMarket:'./voices/consumablesavailablefrommarket.mp3',
      tutorialNoShieldBooster:'./voices/noshieldboosteravailable.mp3',
      tutorialAbandonMission:'./voices/pressandholdqtoabandonmission.mp3',
      tutorialAbandonFails:'./voices/abandonmissionfails.mp3',
      tutorialFollowNav:'./voices/follownavigationmarkertotarget.mp3',
      tutorialAvoidCorridor:'./voices/avoidcorridorobstacles.mp3',
      // Reuse the established reactor instruction recording for the simulator objective.
      tutorialDestroyReactor:'./voices/7destroythereactorahead.mp3',
      tutorialTrainingComplete:'./voices/voxtrainingcomplete.mp3'
    };
    // Canonical transcript for every speech asset. Gameplay subtitles are
    // driven from the speech queue itself, so stage authors never have to
    // duplicate subtitle timing or remember a second call site.
    this.voiceText={
      checkpoint:'Checkpoint reached',
      destroyInterceptors:'Destroy the interceptors',
      eliminateHostileGroup:'Eliminate the hostiles.',
      searchWreckageForNavigationData:'Search the wreckage for recoverable navigation data.',
      noRecoverableNavigationData:'Scan complete. No recoverable navigation data.',
      navigationDataRecovered:'Scan complete. Navigation data recovered.',
      proceedToVoxCommsCentre:'Proceed to the VOX communications centre.',
      presentCredentialsToSecurityDrone:'Present credentials to the security drone.',
      stationAccessGranted:'Credentials verified. Station access granted.',
      dataTransferComplete:'Data transfer complete.',
      proceedToWreck:'Proceed to the wreck.',
      pirateAmbushDestroyPirates:'Pirate ambush! Destroy the pirates.',
      downloadingFlightRecorderData:'Downloading flight recorder data.',
      headingToFreeTradersDepot:'Heading to Free Traders depot.',
      targetLocked:'Target locked.',
      hazardTargetsIdentified:'Hazard targets identified.',
      customsInterceptDetected:'Customs Authority interceptors detected.',
      destroyCustomsDrones:'Destroy the Customs Authority drones.',
      pirateInterceptDetected:'Pirate interceptors detected. Clear the route.',
      rogueDronesDetected:'Rogue drones detected. Clear the route.',
      descending:'Descending to planet',
      descendingToMoon:'Descending to moon.',
      destroyPylons:'Destroy the pylons',
      bunkerShieldWeakened:'Bunker shield weakened',
      crossDefences:'Cross the defences. Avoid Tesla towers.',
      breachTheBunker:'Breach the bunker.',
      shootBunkerDoors:'Shoot the bunker doors.',
      recoverEquipment:'Recover the equipment.',
      proceedToOsdCompound:'Proceed to the OSD compound.',
      breachBunker:'Breach bunker entrance',
      destroyReactorAhead:'Destroy the reactor ahead',
      missionComplete:'Mission complete — returning to base',
      missionFailed:'Contact lost — mission failed',
      shieldsLow:'Warning — shields are low',
      shieldsDepleted:'Warning — shields depleted',
      deliveryComplete:'Delivery complete',
      recoveryComplete:'Recovery complete.',
      deliveryApproachClear:'Delivery approach clear. Proceed to the landing pad.',
      xenoInfestationDetected:'Xeno infestation detected.',
      clearHostileXenoforms:'Clear hostile xenoforms.',
      xenoPheromoneActive:'Pheromone masking activated. Avoid disturbing xenoforms or xeno egg prisms.',
      xenoProceedNestCore:'Proceed to the nest core.',
      xenoPheromoneCompromised:'Pheromone mask compromised. Swarm response escalating.',
      xenoCoreEntry:'Hive core entry ahead.',
      xenoDestroyRegulator:'Destroy the swarm regulator.',
      xenoSwarmFrenzy:'Swarm cohesion lost. Proceed immediately to the observation point.',
      xenoHiveDestroyed:'Hive destruction confirmed. Recorded evidence shows xenoforms destroying their own nest.',
      proceedToCity:'Proceed to the city — follow City Nav.',
      proceedToForest:'Proceed to the forest — follow Forest Nav.',
      avoidCivilianVehicles:'Avoid civilian vehicles',
      doNotAttackCivilians:'Do not attack civilians',
      mailNormal:'You have mail',
      mailImportant:'You have important mail',
      unspentSkillPoints:'You have unspent skill points',
      tutorialWelcome:'Welcome to the VOX training simulator',
      tutorialMoveAim:'Move the mouse to aim and steer.',
      tutorialAvoidCollisions:'Avoid collisions. Your shields will protect you while you train.',
      tutorialPrimaryFire:'Press the left mouse button to fire.',
      tutorialDestroyFive:'Destroy five asteroids.',
      tutorialShootProjectiles:'Enemy fire can be intercepted. Shoot incoming projectiles.',
      tutorialAcquireLock:'Hold the right mouse button on an enemy to acquire a tracking lock.',
      tutorialFollowTarget:'Follow the double-chevron target-indicator, at the edge of the screen, to bring the locked ship back into view.',
      tutorialDestroyEnemy:'Destroy the enemy ship.',
      tutorialShieldsCritical:'You are surrounded, and your shields are critically low.',
      tutorialUseShieldBooster:'Press 1 to use the shield booster in your consumables slot.',
      tutorialConsumablesMarket:'Consumables are available from the Market tab of the portal.',
      tutorialNoShieldBooster:'Your shields are critical, and no shield booster is available.',
      tutorialAbandonMission:'Press and hold Q to abandon the mission and escape.',
      tutorialAbandonFails:'Abandoning a mission saves your drone, but the mission is failed.',
      tutorialFollowNav:'Follow the navigation marker to reach your target.',
      tutorialAvoidCorridor:'Avoid obstacles in the corridors.',
      tutorialDestroyReactor:'Destroy the reactor ahead.',
      tutorialTrainingComplete:'Congratulations. You have completed the VOX drone training simulation.'
    };
    this.voices={};
    for(const [key,src] of Object.entries(this.voiceFiles)){
      const a=new Audio(src);
      a.preload='auto';
      a.volume=clamp(.92*AudioMixer.channelVolume('speech'),0,1);
      this.voices[key]=a;
    }
    this.voiceQueue=[];
    this.voicePlaying=null;
    this.voiceDelayTimer=null;
    this.spoken=new Set();
    this.voiceDuckFrame=0;
    this.voiceDuckToken=0;
    this.pendingObjectiveCue=false;
    this.objectiveCueBusy=false;
    this.objectiveCueTimer=null;
  }
  setSpeechDucking(active){
    const target=active?Math.pow(10,-3/20):1; // soft 3 dB reduction after voice mastering
    const start=AudioMixer.fxDuckGain,duration=active?120:260,token=++this.voiceDuckToken,started=performance.now();
    if(this.voiceDuckFrame)cancelAnimationFrame(this.voiceDuckFrame);
    const step=now=>{
      if(token!==this.voiceDuckToken)return;
      const t=clamp((now-started)/duration,0,1),ease=t*t*(3-2*t),gain=start+(target-start)*ease;
      AudioMixer.setFxDuckGain(gain);this.music.setSpeechDuckGain(gain);
      if(t<1)this.voiceDuckFrame=requestAnimationFrame(step);
      else this.voiceDuckFrame=0
    };
    this.voiceDuckFrame=requestAnimationFrame(step)
  }
  applyMixer(){
    const v=clamp(.92*AudioMixer.channelVolume('speech'),0,1);
    for(const a of Object.values(this.voices))a.volume=v;
    if(v<=0)this.stopVoice(true);
    this.music.applyMixer();
  }
  resetMissionVoices(){
    this.stopVoice(true);
    this.hackChirp?.stop?.();
    this.spoken.clear();
  }
  stopVoice(clearQueue=false){
    if(this.voiceDelayTimer){clearTimeout(this.voiceDelayTimer);this.voiceDelayTimer=null}
    if(this.voicePlaying){
      this.voicePlaying.pause();
      try{this.voicePlaying.currentTime=0}catch(_){}
      this.voicePlaying=null;
    }
    if(clearQueue)this.voiceQueue.length=0;
    if(!this.voicePlaying&&!this.voiceQueue.length)this.setSpeechDucking(false)
  }
  cancelQueuedVoice(key){
    if(!key)return;
    this.voiceQueue=this.voiceQueue.filter(item=>(typeof item==='string'?item:item?.key)!==key)
  }
  objectiveCuePendingOrBusy(){return !!(this.pendingObjectiveCue||this.objectiveCueBusy)}
  requestObjectiveCompleteCue(){
    this.pendingObjectiveCue=true;
    this.tryObjectiveCompleteCue()
  }
  tryObjectiveCompleteCue(){
    if(!this.pendingObjectiveCue||this.objectiveCueBusy)return false;
    // Objective acknowledgement always gets a clean slot: never over speech and,
    // once it starts, queued VOX waits for the short chime to finish.
    if(this.voicePlaying||this.voiceDelayTimer)return false;
    this.pendingObjectiveCue=false;this.objectiveCueBusy=true;
    SoundFX.objectiveComplete();
    if(this.objectiveCueTimer)clearTimeout(this.objectiveCueTimer);
    this.objectiveCueTimer=setTimeout(()=>{
      this.objectiveCueTimer=null;this.objectiveCueBusy=false;
      this.pumpVoice();
      // A second completion cannot normally arrive this quickly, but keep the
      // queue semantics deterministic if it ever does.
      this.tryObjectiveCompleteCue()
    },360);
    return true
  }
  playVoice(key,{once=true,priority=false,delayBeforeMs=0}={}){
    if(!this.voiceFiles[key])return;
    if(once&&this.spoken.has(key))return;
    if(once)this.spoken.add(key);
    if(AudioMixer.channelVolume('speech')<=0)return;
    const item={key,delayBeforeMs:Math.max(0,Number(delayBeforeMs)||0)};
    if(priority){
      this.stopVoice(false);
      this.voiceQueue.unshift(item);
    }else{
      this.voiceQueue.push(item);
    }
    this.pumpVoice();
  }
  playSequence(keys){
    for(const key of keys)this.playVoice(key,{once:true,priority:false});
  }
  playFreshVoice(key,{priority=true}={}){
    if(!this.voiceFiles[key])return;
    // Stage transitions own their cue. Never let stale one-shot bookkeeping from
    // another route through the mission suppress the checkpoint announcement.
    this.spoken.delete(key);
    this.playVoice(key,{once:false,priority});
  }
  pumpVoice(){
    if(AudioMixer.channelVolume('speech')<=0||this.voicePlaying||this.voiceDelayTimer||this.objectiveCueBusy||!this.voiceQueue.length)return;
    const queued=this.voiceQueue[0],peek=typeof queued==='string'?{key:queued,delayBeforeMs:0}:queued;
    if(peek?.delayBeforeMs>0){
      const wait=peek.delayBeforeMs;
      this.voiceDelayTimer=setTimeout(()=>{
        this.voiceDelayTimer=null;
        const first=this.voiceQueue[0];
        if(first&&typeof first==='object')first.delayBeforeMs=0;
        this.pumpVoice()
      },wait);
      return
    }
    const raw=this.voiceQueue.shift(),item=typeof raw==='string'?{key:raw,delayBeforeMs:0}:raw,key=item?.key;
    const clip=this.voices[key];
    if(!clip){this.pumpVoice();return}
    this.voicePlaying=clip;
    this.setSpeechDucking(true);
    try{clip.currentTime=0}catch(_){}
    // Start the subtitle from the media playback event/promise, not synchronously
    // before clip.play(). Some mission transitions clear HUD state later in the same
    // tick; the old ordering therefore erased a subtitle while the speech still played.
    let subtitleStarted=false;
    const startSubtitle=()=>{
      if(subtitleStarted)return;subtitleStarted=true;
      if(typeof window.onSpeechVoiceStarted==='function'){
        const duration=Number.isFinite(clip.duration)?clip.duration:0;
        try{window.onSpeechVoiceStarted(key,this.voiceText[key]||key,duration)}catch(_){ }
      }
    };
    clip.onplaying=startSubtitle;
    const finish=()=>{
      clip.onended=null;clip.onerror=null;clip.onplaying=null;
      if(this.voicePlaying===clip)this.voicePlaying=null;
      if(this.pendingObjectiveCue){
        this.tryObjectiveCompleteCue();
        if(!this.voicePlaying&&!this.voiceQueue.length)this.setSpeechDucking(false)
      }else if(this.voiceQueue.length)this.pumpVoice();
      else this.setSpeechDucking(false);
    };
    clip.onended=finish;
    clip.onerror=finish;
    const p=clip.play();
    if(p&&typeof p.then==='function')p.then(startSubtitle).catch(()=>finish());
    else setTimeout(startSubtitle,0);
  }
}

