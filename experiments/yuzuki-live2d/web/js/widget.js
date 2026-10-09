import {CharacterEngine,findExpression,localReply} from './character-engine.js';
import {RasterFaceRig} from './raster-face-rig.js';
import {normalizeWidgetCommand,widgetEvent} from './widget-protocol.js';

const $=id=>document.getElementById(id);
const rig=new RasterFaceRig($('widgetRig'));
const motionPreference=!matchMedia('(prefers-reduced-motion: reduce)').matches;
let motion=motionPreference,blinkTimer=0,bubbleTimer=0;
const engine=new CharacterEngine((params,emotion)=>{
 rig.update(params,emotion?.id);
 $('character').style.setProperty('--tilt',`${motion?(params.headTilt-.18)*1.35:0}deg`);
});
const parentFrame=window.parent!==window?window.parent:null;
function notify(event,data={}){if(parentFrame)parentFrame.postMessage(widgetEvent(event,data),'*');}
function mood(emotion){const resolved=findExpression(emotion).id;engine.setEmotion(resolved);notify('emotion',{emotion:resolved});}
function say(text,emotion='smile'){
 $('widgetBubble').textContent=text;
 $('widgetBubble').classList.add('show');
 clearTimeout(bubbleTimer);bubbleTimer=setTimeout(()=>$('widgetBubble').classList.remove('show'),Math.max(2800,Math.min(6600,text.length*115)));
 mood(emotion);notify('say',{text,emotion});
}
function setMotion(enabled){motion=Boolean(enabled)&&motionPreference;rig.setMotion(motion);if(!motion)rig.resumeIdleGaze();}
rig.load().then(()=>{rig.setMotion(motion);rig.start();$('widgetFallback').classList.add('hidden');notify('ready',{version:'1.2.0'});}).catch(()=>{ $('widgetRig').hidden=true;notify('fallback'); });
$('widgetHello').addEventListener('click',()=>{const answer=localReply('你好');say(answer.text,answer.emotion);});
$('widgetWink').addEventListener('click',()=>{if(rig.ready)rig.winkEye('eye_left');notify('wink');});
$('character').addEventListener('click',()=>{say('我一直都在这里呀。♡','shy');});
$('widget').addEventListener('pointermove',event=>{if(!motion||!rig.ready)return;const r=$('widget').getBoundingClientRect();rig.setGaze((event.clientX-r.left)/r.width*2-1,(event.clientY-r.top)/r.height*2-1);});
$('widget').addEventListener('pointerleave',()=>rig.resumeIdleGaze());
if(new URLSearchParams(location.search).get('transparent')==='1')$('widget').classList.add('transparent');
window.addEventListener('message',event=>{
 if(!parentFrame||event.source!==parentFrame)return;
 const command=normalizeWidgetCommand(event.data);
 if(!command)return;
 switch(command.command){
  case 'emotion':mood(command.emotion);break;
  case 'say':say(command.text,command.emotion);break;
  case 'gaze':rig.setGaze(command.x,command.y);break;
  case 'motion':setMotion(command.enabled);break;
  case 'ping':notify('pong',{version:'1.2.0'});break;
 }
});
window.addEventListener('beforeunload',()=>{clearTimeout(blinkTimer);clearTimeout(bubbleTimer);rig.stop();engine.destroy();});
