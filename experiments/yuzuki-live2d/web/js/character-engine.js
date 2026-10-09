/**
 * Character behavior model. No Cubism renderer or AI vendor dependency here.
 * Replace onParameters() with a renderer adapter after importing a real .model3.json.
 */
export const EXPRESSIONS = [
  ['calm','平静','轻柔注视，嘴角若有若无地上扬。',[.62,.08,.08,0,.08,0],['自然眨眼','轻微呼吸']],
  ['smile','微笑','眼神稍稍柔和，笑意慢慢浮现。',[.55,.44,.22,.03,.12,.06],['眼角柔和','嘴角上扬']],
  ['joy','开心','笑意扩散到眼睛，头部轻轻晃动。',[.4,.9,.47,.12,.15,.22],['弯眼笑','轻微点头']],
  ['warm','暖暖','放松眉眼，安静地把目光放在你身上。',[.61,.4,.22,.08,.1,.06],['柔和注视','缓慢呼吸']],
  ['shy','害羞','视线短暂偏开，脸颊泛起薄薄的红晕。',[.47,.36,.02,.88,.65,.35],['目光闪躲','微微低头']],
  ['curious','疑惑','一侧眉毛抬起，轻轻歪头，等待你的回答。',[.75,.1,.22,.03,.1,.7],['单眉抬起','头部侧倾']],
  ['proud','小得意','嘴角偏向一侧，偷偷露出狡黠的笑容。',[.58,.56,.52,.13,.27,.4],['单侧嘴角','轻挑眉']],
  ['grumpy','小生气','眉心轻收，鼓起脸颊，但并不真的严厉。',[.68,.04,.05,.21,.8,.25],['微鼓脸','轻皱眉']],
  ['focus','认真','视线聚焦，眉眼微收，认真倾听。',[.82,.03,.08,0,.72,.05],['认真倾听','目光聚焦']],
  ['tender','温柔','微笑放得更轻，像是在认真照顾你的感受。',[.5,.5,.12,.09,.14,.09],['柔和眼神','温和回应']],
  ['sad','委屈','眉尾放低，目光里出现细小的犹豫。',[.52,-.35,.06,.26,.28,.2],['眉尾下垂','轻抿嘴']],
  ['surprise','惊讶','眼睛睁大，微张嘴，随后逐渐平静。',[1,.08,.73,.03,.2,.4],['睁大眼睛','轻微后仰']],
  ['sleepy','困倦','眼睑缓缓下垂，动作变得慵懒。',[.19,.08,.04,0,.03,.18],['眼睑低垂','动作放慢']],
  ['daydream','放空','视线飘向远处，留下一点神游的空白。',[.55,.14,.03,0,.04,.43],['视线偏移','轻缓呼吸']],
  ['comfort','安慰','眼神稳定而温柔，给予安静又认真的回应。',[.57,.3,.09,.02,.12,.08],['目光停留','柔和微笑']],
  ['thinking','沉思','短暂停顿，眉毛轻轻移动，仿佛寻找答案。',[.62,.06,.04,0,.35,.32],['眼神向上','轻微侧倾']]
].map(([id,name,story,values,tags],index)=>({id,name,story,tags,index,parameters:Object.fromEntries(['eyeOpen','smile','mouthOpen','blush','browTension','headTilt'].map((key,i)=>[key,values[i]]))}));
export const PARAM_LABELS={eyeOpen:'眼睛睁开',smile:'嘴角微笑',mouthOpen:'嘴部张合',blush:'腮红强度',browTension:'眉毛变化',headTilt:'头部倾斜'};
export const findExpression=(id)=>EXPRESSIONS.find(e=>e.id===id)||EXPRESSIONS[0];
export const clamp=(n,min,max)=>Math.min(max,Math.max(min,n));
export function mixParameters(a,b,t){const f=clamp(t,0,1);return Object.fromEntries(Object.keys(PARAM_LABELS).map(k=>[k,a[k]+(b[k]-a[k])*f]));}
/** Interface consumed by UI. Cubism renderer can implement apply(parameters, meta). */
export class CharacterEngine{
  constructor(onParameters=()=>{}){this.current=findExpression('calm');this.parameters={...this.current.parameters};this.onParameters=onParameters;this.raf=0;this.sequenceId=0;}
  setEmotion(id,duration=520){const next=findExpression(id);this.current=next;const from={...this.parameters},to=next.parameters;const token=++this.sequenceId; if(this.raf)cancelAnimationFrame(this.raf);if(window.matchMedia('(prefers-reduced-motion: reduce)').matches){this.parameters={...to};this.onParameters(this.parameters,next);return next;}
    const start=performance.now();const step=now=>{if(this.sequenceId!==token)return;const raw=clamp((now-start)/duration,0,1);const eased=raw*raw*(3-2*raw);this.parameters=mixParameters(from,to,eased);this.onParameters(this.parameters,next);if(raw<1)this.raf=requestAnimationFrame(step);};this.raf=requestAnimationFrame(step);return next;}
  destroy(){this.sequenceId++;if(this.raf)cancelAnimationFrame(this.raf);}
}
/** Predictable offline test responses; not an actual LLM. */
export function localReply(message){let m=message.trim();if(/累|压力|难受|沮丧|伤心|焦虑|烦/.test(m))return{emotion:'comfort',text:'听起来今天不太轻松。愿意跟我说说发生了什么吗？我会认真听。'};
 if(/可爱|喜欢|漂亮|好看|夸/.test(m))return{emotion:'shy',text:'诶……突然这样夸我，有一点不好意思。不过，谢谢你。♡'};
 if(/开心|高兴|成功|完成|太棒/.test(m))return{emotion:'joy',text:'太好了！我也替你开心。今天值得留一点时间，好好享受这份成就感。'};
 if(/你好|早上好|晚安|嗨|hello/i.test(m))return{emotion:'smile',text:'你好呀，很高兴再次见到你。今天想聊什么？'};
 if(/为什么|怎么|如何|什么|\? |？/.test(m))return{emotion:'thinking',text:'这个问题值得认真想想。现在是本地演示模式，还没有连接知识模型；未来我会好好回答你。'};
 return{emotion:'tender',text:'我在听呢。你刚才说的很有意思，愿意再多告诉我一点吗？'};}
