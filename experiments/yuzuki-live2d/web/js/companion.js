import {CharacterEngine,localReply,findExpression} from './character-engine.js';
import {RasterFaceRig} from './raster-face-rig.js';

const $=id=>document.getElementById(id);
const rig=new RasterFaceRig($('rigCanvas'));
let activeEmotion='smile';
let motionEnabled=!window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let voiceEnabled=false, aiConnected=false, busy=false, demoGeneration=0, currentlySpeaking=null;
const messages=[];
const engine=new CharacterEngine((parameters, emotion)=>{
  rig.update(parameters,emotion?.id);
  const p=parameters.headTilt;
  $('portrait').style.setProperty('--tilt',`${motionEnabled?Math.max(-1.5,Math.min(1.5,(p-.18)*1.5)) : 0}deg`);
});

function mood(id){
  activeEmotion=findExpression(id).id;
  engine.setEmotion(activeEmotion);
  document.querySelectorAll('.mood').forEach(b=>b.classList.toggle('active',b.dataset.emotion===activeEmotion));
  $('emotionReadout').textContent=`♡ ${findExpression(activeEmotion).name}地陪着你`;
}
function status(text){$('feedback').textContent=text;}
function bubble(role,text){
  const root=document.createElement('div');root.className=`bubble ${role==='assistant'?'bot':'user'}`;
  const title=document.createElement('span');title.className='bubble-head';title.textContent=role==='assistant'?'柚希 · 刚刚':'你';
  const p=document.createElement('p');p.textContent=text;root.append(title,p);
  $('chat').append(root);$('chat').scrollTop=$('chat').scrollHeight;
  return root;
}
function stopSpeaking(){window.speechSynthesis?.cancel();rig.setSpeaking(false);currentlySpeaking=null;}
function speak(text){
  if(!voiceEnabled||!('speechSynthesis' in window))return;
  stopSpeaking();
  const utterance=new SpeechSynthesisUtterance(text);utterance.lang='zh-CN';utterance.rate=.95;utterance.pitch=1.08;
  utterance.onstart=()=>{rig.setSpeaking(true,text);status('柚希正在说话……');};
  utterance.onboundary=event=>rig.setSpeechBoundary(event.charIndex);
  utterance.onend=()=>{rig.setSpeaking(false);status('有想说的，随时告诉我。');};
  utterance.onerror=()=>{rig.setSpeaking(false);status('设备语音不可用，文字聊天仍可正常使用。');};
  currentlySpeaking=utterance;window.speechSynthesis.speak(utterance);
}
async function connectedReply(text){
  const response=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:text,history:messages.slice(-12)}),signal:AbortSignal.timeout(26000)});
  if(!response.ok)throw new Error(`AI 服务响应异常（${response.status}）`);
  const data=await response.json();
  if(typeof data.reply!=='string'||!data.reply.trim())throw Error('收到空回复');
  return {text:data.reply.slice(0,1200),emotion:findExpression(data.emotion).id};
}
async function send(text,{scripted=false}={}){
  const cleaned=String(text).trim().slice(0,400);
  if(!cleaned||busy)return;
  if(!scripted)demoGeneration++;
  stopSpeaking();bubble('user',cleaned);busy=true;$('sendButton').disabled=true;
  mood('thinking');status(aiConnected?'柚希正在认真思考……':'柚希在听……');
  let result;
  try{result=aiConnected?await connectedReply(cleaned):localReply(cleaned);}
  catch(error){result=localReply(cleaned);status(`AI 暂不可用，已切换本地演示。`);}
  messages.push({role:'user',content:cleaned});messages.push({role:'assistant',content:result.text});
  if(messages.length>20)messages.splice(0,messages.length-20);
  bubble('assistant',result.text);mood(result.emotion);
  if(voiceEnabled)speak(result.text);else status(aiConnected?'可继续聊天。':'本地演示回复，接入模型后可以自由交流。');
  busy=false;$('sendButton').disabled=false;$('chatInput').focus();
}
async function fetchStatus(){
  if(location.protocol==='file:'){status('离线单文件体验中：聊天为规则演示。');return;}
  try{
    const r=await fetch('/api/status',{signal:AbortSignal.timeout(2000)});
    if(!r.ok)return;const data=await r.json();
    aiConnected=Boolean(data.ai);
    const label=aiConnected?'AI 对话已连接':'本地陪伴模式';
    $('connectionLabel').textContent=label;$('talkMode').textContent=aiConnected?'实时 AI 对话':'本地规则演示';
    status(aiConnected?`已连接 ${data.model||'模型'}，现在可以自由聊天。`:'演示可直接使用；连接 AI 后支持自由聊天。');
  }catch{aiConnected=false;}
}
function wait(ms){return new Promise(resolve=>setTimeout(resolve,ms));}
async function demo(){
  if(busy)return;
  const token=++demoGeneration;
  $('demoButton').disabled=true;
  const steps=[
    {emotion:'curious',line:'嗯？你今天看起来有什么想跟我分享的。',pause:1850},
    {emotion:'shy',line:'说我可爱……这样突然被夸奖，我会害羞的呀。',pause:2150},
    {emotion:'joy',line:'不过，能见到你，我真的很开心！',pause:2250},
    {emotion:'tender',line:'好啦，我在这里。今天想做什么，我们慢慢来。',pause:2200}
  ];
  status('正在播放四幕互动演出……');
  for(const step of steps){
    if(token!==demoGeneration)break;
    bubble('assistant',step.line);mood(step.emotion);if(voiceEnabled)speak(step.line);
    await wait(step.pause);
  }
  $('demoButton').disabled=false;
  if(token===demoGeneration)status('演出结束，可以直接和柚希聊天。');
}

rig.load().then(()=>{
  rig.setMotion(motionEnabled);rig.start();
  $('rigCanvas').classList.remove('hidden');$('portraitFallback').classList.add('hidden');
  mood('smile');
}).catch(error=>{console.warn('脸部分层未能加载，使用审核通过的原画。',error);status('动画图层未加载，已显示原画；文字聊天仍可使用。');});
$('chatForm').addEventListener('submit',event=>{event.preventDefault();const text=$('chatInput').value.trim();if(!text)return;$('chatInput').value='';void send(text);});
$('moodButtons').addEventListener('click',event=>{const btn=event.target.closest('[data-emotion]');if(btn)mood(btn.dataset.emotion);});
$('demoButton').addEventListener('click',()=>{void demo();});
$('voiceButton').addEventListener('click',()=>{
  voiceEnabled=!voiceEnabled;$('voiceButton').setAttribute('aria-pressed',String(voiceEnabled));
  $('voiceText').textContent=voiceEnabled?'关闭朗读':'开启朗读';if(!voiceEnabled)stopSpeaking();
  status(voiceEnabled?'下次回复将尝试使用系统中文语音朗读。':'已关闭朗读。');
});
function motionToggle(){motionEnabled=!motionEnabled;rig.setMotion(motionEnabled);$('motionButton').setAttribute('aria-pressed',String(motionEnabled));$('motionText').textContent=motionEnabled?'动态开启':'动态关闭';document.body.classList.toggle('reduced-motion',!motionEnabled);if(!motionEnabled)rig.resumeIdleGaze();}
$('motionButton').addEventListener('click',motionToggle);
if(!motionEnabled){document.body.classList.add('reduced-motion');$('motionButton').setAttribute('aria-pressed','false');$('motionText').textContent='动态关闭';}
$('visual').addEventListener('pointermove',event=>{
  if(!motionEnabled)return;const r=$('visual').getBoundingClientRect();
  rig.setGaze((event.clientX-r.left)/r.width*2-1,(event.clientY-r.top)/r.height*2-1);
});
$('visual').addEventListener('pointerleave',()=>rig.resumeIdleGaze());
const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;
if(Recognition){$('recognitionButton').addEventListener('click',()=>{
  const recog=new Recognition();recog.lang='zh-CN';recog.interimResults=false;
  recog.onresult=e=>{$('chatInput').value=e.results[0][0].transcript;$('chatInput').focus();status('识别完成，确认文字后即可发送。');};
  recog.onerror=e=>status(`语音输入不可用：${e.error}`);recog.start();status('正在聆听……');
});}else{$('recognitionButton').disabled=true;$('recognitionButton').title='当前浏览器不支持语音识别';}
$('helpButton').addEventListener('click',()=>$('aboutDialog').showModal());
$('aboutClose').addEventListener('click',()=>$('aboutDialog').close());
$('aboutDialog').addEventListener('click',e=>{if(e.target===$('aboutDialog'))$('aboutDialog').close();});
window.addEventListener('beforeunload',()=>{stopSpeaking();rig.stop();engine.destroy();});
void fetchStatus();
