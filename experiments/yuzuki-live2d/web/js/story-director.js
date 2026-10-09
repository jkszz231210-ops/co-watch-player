/** Declarative emotion choreography; independent of speech backend and Cubism renderer. */
export const CHOREOGRAPHIES=Object.freeze([
 {id:'compliment',label:'被夸可爱',steps:[
  {emotion:'focus',holdMs:360,caption:'先认真听，视线微微聚焦'},
  {emotion:'surprise',holdMs:370,caption:'短暂惊讶，眉眼抬升'},
  {emotion:'shy',holdMs:870,caption:'回避目光，腮红慢慢出现'},
  {emotion:'smile',holdMs:870,caption:'害羞之后，露出轻轻的微笑'}]},
 {id:'comfort',label:'倾听你的疲惫',steps:[
  {emotion:'focus',holdMs:530,caption:'安静倾听，不打断'},
  {emotion:'tender',holdMs:910,caption:'眉眼缓和，认真回应'},
  {emotion:'comfort',holdMs:1100,caption:'保持注视与温柔的表情'}]},
 {id:'success',label:'分享你的喜悦',steps:[
  {emotion:'curious',holdMs:390,caption:'好奇地等待好消息'},
  {emotion:'surprise',holdMs:390,caption:'惊喜瞬间涌现'},
  {emotion:'joy',holdMs:1080,caption:'忍不住和你一起开心'},
  {emotion:'warm',holdMs:970,caption:'情绪缓缓落回温暖'}]}
]);
export const getStory=(id)=>CHOREOGRAPHIES.find(s=>s.id===id)||null;
export function validateStories(stories,validEmotions){return stories.every(s=>s.steps.length>=2&&s.steps.every(x=>validEmotions.has(x.emotion)&&Number.isInteger(x.holdMs)&&x.holdMs>=150&&typeof x.caption==='string'&&x.caption.length>0));}
