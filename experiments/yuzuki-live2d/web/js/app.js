import {RasterFaceRig} from './raster-face-rig.js';
import {MicrophoneMouth} from './audio-mouth.js';
import {CHOREOGRAPHIES, getStory} from './story-director.js';
import {approvedPortraitPath} from './art-direction.js';
import {EXPRESSIONS,PARAM_LABELS,CharacterEngine,localReply,findExpression,clamp} from './character-engine.js';
const $=id=>document.getElementById(id);
const grid=$('expressionGrid'),detailImage=$('detailThumbnail'),detailName=$('detailName'),detailStory=$('detailStory'),detailChips=$('detailChips'),stageMood=$('stageMood'),bars=$('paramBars'),art=$('artHolder');
const barElements=new Map();let selected='calm',sequenceToken=0;
$('characterArt').src=approvedPortraitPath(); // User-approved direction, never replaced by stale localStorage
const rig=new RasterFaceRig($('faceRigCanvas'));
const mic=new MicrophoneMouth();rig.setMicrophone(mic);
rig.load().then(()=>{rig.start();$('faceRigCanvas').classList.remove('hidden');$('characterArt').classList.add('hidden');}).catch(error=>{console.warn('独立五官素材加载失败，保留原图。',error);});
const engine=new CharacterEngine((parameters,emotion)=>{rig.update(parameters,emotion?.id);for(const [name,value]of Object.entries(parameters)){const control=barElements.get(name);if(!control)continue;const minimum=name==='smile'?-1:0;const max=name==='headTilt'?1:1;const normalized=clamp((value-minimum)/(max-minimum),0,1);control.bar.style.width=`${Math.round(normalized*100)}%`;control.value.textContent=value.toFixed(2);}});
for(const [key,label]of Object.entries(PARAM_LABELS)){const element=document.createElement('div');element.className='param-line';const head=document.createElement('div'),name=document.createElement('span'),value=document.createElement('span'),background=document.createElement('div'),fill=document.createElement('div');name.textContent=label;value.textContent='0.00';head.append(name,value);background.className='bar-bg';fill.className='bar-fill';background.append(fill);element.append(head,background);bars.append(element);barElements.set(key,{bar:fill,value});}
for(const emotion of EXPRESSIONS){const button=document.createElement('button');button.type='button';button.className='expression-option';button.dataset.emotion=emotion.id;button.setAttribute('aria-label',`选择${emotion.name}表情`);const img=document.createElement('img');img.src=`./assets/expressions/${String(emotion.index+1).padStart(2,'0')}.webp`;img.loading='lazy';img.alt='';const label=document.createElement('span');label.textContent=emotion.name;button.append(img,label);button.addEventListener('click',()=>selectEmotion(emotion.id));grid.append(button);}
function selectEmotion(id){selected=id;const emotion=engine.setEmotion(id);for(const b of grid.children){const isSelected=b.dataset.emotion===id;b.classList.toggle('selected',isSelected);b.setAttribute('aria-pressed',String(isSelected));}detailImage.src=`./assets/expressions/${String(emotion.index+1).padStart(2,'0')}.webp`;detailImage.alt=`${emotion.name}表情的静态概念图`;detailName.textContent=emotion.name;detailStory.textContent=emotion.story;detailChips.replaceChildren(...emotion.tags.map(t=>{const e=document.createElement('span');e.textContent=t;return e;}));stageMood.textContent=`现在的心情 · ${emotion.name}`;/* V0.9: art-holder tilt is interpolated by rig.onFrame instead of jumping on selection. */}
selectEmotion('calm');
for(const tab of document.querySelectorAll('[data-tab]')){tab.addEventListener('click',()=>{for(const other of document.querySelectorAll('[data-tab]')){const active=other===tab;other.classList.toggle('active',active);other.setAttribute('aria-selected',String(active));$('pane-'+other.dataset.tab).classList.toggle('hidden',!active);}});}
const dialog=$('sheetDialog');$('sheetButton').addEventListener('click',()=>dialog.showModal());$('closeDialog').addEventListener('click',()=>dialog.close());dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});
const prefersMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;let motionEnabled=!prefersMotion;rig.onFrame=(breath,params)=>{const angle=motionEnabled?clamp((params.headTilt-.2)*1.9+breath,-1.35,1.35):0;const snapped=(Math.round(angle*20)/20).toFixed(2);if(art.dataset.lastAngle!==snapped){art.style.setProperty('--emotion-tilt',snapped+'deg');art.dataset.lastAngle=snapped;}};function applyMotion(){rig.setMotion(motionEnabled);document.body.classList.toggle('reduced-motion',!motionEnabled);$('motionToggle').setAttribute('aria-pressed',String(motionEnabled));$('motionToggle').title=motionEnabled?'关闭动态效果':'开启动画效果';}applyMotion();$('motionToggle').addEventListener('click',()=>{motionEnabled=!motionEnabled;applyMotion();});
$('footerYear').textContent=new Date().getFullYear();
let storyTimer=0;
function cancelStory(){sequenceToken++;if(storyTimer)clearTimeout(storyTimer);storyTimer=0;document.querySelectorAll('[data-story]').forEach(b=>b.classList.remove('playing'));}
function runStory(id){cancelStory();const story=getStory(id);if(!story)return;const token=sequenceToken;let cursor=0;
 document.querySelectorAll('[data-story]').forEach(b=>b.classList.toggle('playing',b.dataset.story===id));
 const advance=()=>{if(token!==sequenceToken)return;if(cursor>=story.steps.length){$('storyReadout').textContent=`${story.label} · 演出完成`;document.querySelectorAll('[data-story]').forEach(b=>b.classList.remove('playing'));return;}
 const part=story.steps[cursor++];selectEmotion(part.emotion);$('storyReadout').textContent=`${story.label} · ${cursor}/${story.steps.length} · ${part.caption}`;storyTimer=setTimeout(advance,part.holdMs);};advance();}
document.querySelectorAll('[data-story]').forEach(b=>b.addEventListener('click',()=>runStory(b.dataset.story)));
$('demoSequence').addEventListener('click',()=>runStory('compliment'));
function addMessage(text,role){const wrapper=document.createElement('div');wrapper.className=`message ${role}`;const label=document.createElement('span');label.className='message-author';label.textContent=role==='user'?'你':'柚希';const paragraph=document.createElement('p');paragraph.textContent=text;wrapper.append(label,paragraph);$('chatMessages').append(wrapper);$('chatMessages').scrollTop=$('chatMessages').scrollHeight;}
let utterance=null;function speak(text){if(!$('voiceEnabled').checked||!('speechSynthesis' in window))return;window.speechSynthesis.cancel();utterance=new SpeechSynthesisUtterance(text);utterance.lang='zh-CN';utterance.rate=.95;utterance.pitch=1.12;utterance.addEventListener('start',()=>{rig.setSpeaking(true,text);art.classList.add('speaking');});utterance.addEventListener('end',()=>{rig.setSpeaking(false);art.classList.remove('speaking');});utterance.addEventListener('error',()=>{rig.setSpeaking(false);art.classList.remove('speaking');});utterance.addEventListener('boundary',event=>rig.setSpeechBoundary(event.charIndex));window.speechSynthesis.speak(utterance);}
$('chatForm').addEventListener('submit',event=>{event.preventDefault();const input=$('chatInput'),message=input.value.trim();if(!message)return;input.value='';addMessage(message,'user');const reply=localReply(message);selectEmotion(reply.emotion);addMessage(reply.text,'assistant');speak(reply.text);});
const SpeechRecognition=window.SpeechRecognition||window.webkitSpeechRecognition;const listen=$('listenButton');if(!SpeechRecognition){listen.disabled=true;listen.title='此浏览器暂不支持语音识别';listen.textContent='🎙️ 浏览器暂不支持';}else{listen.addEventListener('click',()=>{const recognition=new SpeechRecognition();recognition.lang='zh-CN';recognition.interimResults=false;recognition.maxAlternatives=1;recognition.onresult=e=>{$('chatInput').value=e.results[0][0].transcript;$('chatInput').focus();};recognition.onerror=e=>{listen.textContent=`语音识别失败：${e.error}`;};recognition.onend=()=>{if(!listen.textContent.startsWith('语音识别失败'))listen.textContent='🎙️ 语音输入';};listen.textContent='🎙️ 正在听…';recognition.start();});}
let trialTimer;
function trial(pose,hold=540){if(trialTimer)clearTimeout(trialTimer);rig.setTestPose(pose);trialTimer=setTimeout(()=>rig.setTestPose({eye:null,mouth:null}),hold);}
$('blinkTest').addEventListener('click',()=>trial({eye:.08},320));
$('mouthTest').addEventListener('click',()=>trial({mouth:.8,viseme:'a'},700));
$('winkLeftTest').addEventListener('click',()=>{clearTimeout(trialTimer);rig.setTestPose({eye:null,mouth:null});rig.winkEye('eye_left');});
$('winkRightTest').addEventListener('click',()=>{clearTimeout(trialTimer);rig.setTestPose({eye:null,mouth:null});rig.winkEye('eye_right');});
for(const button of document.querySelectorAll('[data-viseme]'))button.addEventListener('click',()=>trial({mouth:.85,viseme:button.dataset.viseme},900));
const eyelidSlider=$('lidSlider'),eyelidValue=$('lidValue');
eyelidSlider.addEventListener('input',()=>{
 clearTimeout(trialTimer);const value=Number(eyelidSlider.value)/100;
 eyelidValue.textContent=`${Math.round(value*100)}%`;
 rig.setTestPose({eye:value,mouth:null});
});
$('restorePose').addEventListener('click',()=>{
 clearTimeout(trialTimer);eyelidSlider.value='100';eyelidValue.textContent='100%';
 rig.setTestPose({eye:null,mouth:null});
});
const microphoneButton=$('microphoneMouth'),audioStatus=$('audioStatus');
microphoneButton.addEventListener('click',async()=>{
 microphoneButton.disabled=true;
 try{
   if(mic.active){await mic.stop();microphoneButton.textContent='🎤 麦克风驱动嘴型';audioStatus.textContent='已停止收音。';}
   else{window.speechSynthesis?.cancel();rig.setSpeaking(false);await mic.start();microphoneButton.textContent='◼ 停止麦克风';audioStatus.textContent='本地音量驱动中。声音只在浏览器内处理，不会上传。';}
 }catch(error){audioStatus.textContent='麦克风启动失败：'+error.message;}
 finally{microphoneButton.disabled=false;}
});
$('faceSnapshot').addEventListener('click',()=>{
 if(!rig.ready){audioStatus.textContent='正在加载角色素材，稍后再试。';return;}
 const link=document.createElement('a');link.download='Yuzuki-v0.9-frame.png';link.href=rig.canvas.toDataURL('image/png');document.body.append(link);link.click();link.remove();
});
// Pointer-follow is subtle and can be switched off through the motion control.
$('stage').addEventListener('pointermove',event=>{
 if(!motionEnabled)return;const box=$('stage').getBoundingClientRect();rig.setGaze(((event.clientX-box.left)/box.width-.5)*2,((event.clientY-box.top)/box.height-.5)*2);
});
$('stage').addEventListener('pointerleave',()=>rig.resumeIdleGaze());
for(const button of document.querySelectorAll('[data-look]'))button.addEventListener('click',()=>{const value=button.dataset.look;rig.setGaze(value==='left'?-1:value==='right'?1:0,0);});
window.addEventListener('beforeunload',()=>{rig.stop();cancelStory();engine.destroy();void mic.stop();window.speechSynthesis?.cancel();});
