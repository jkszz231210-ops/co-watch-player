/** Art-direction review is local-first; no network calls or tracking. */
export const CANDIDATES = Object.freeze([
  {id:'original',title:'雪夜初遇',tag:'第一版主视觉',path:'./assets/yuzuki-portrait.webp',note:'氛围感最强，但倾头、遮挡和非中立表情使绑定返工偏大。',technical:{angle:'轻微侧倾',occlusion:'中高',rig:'应作为风格参考'}},
  {id:'front-a',title:'银花晨光',tag:'正面候选 A',path:'./assets/yuzuki-front-a.webp',note:'正面构图、清爽眼神，方便确定五官；需要减轻耳饰与服装碎饰。',technical:{angle:'近正面',occlusion:'中',rig:'候选基准'}},
  {id:'front-b',title:'蓝缎初雪',tag:'正面候选 B',path:'./assets/yuzuki-front-b.webp',note:'脸部清晰、整体较对称；发束仍有遮挡，手臂和背后仍需专门补画。',technical:{angle:'近正面',occlusion:'中',rig:'候选基准'}}
]);
export const CRITERIA = Object.freeze([
  {id:'face',title:'脸部吸引力',description:'第一眼好看，长时间看也自然'},
  {id:'eyes',title:'眼神表现',description:'有灵气、可爱且适合表达情绪'},
  {id:'identity',title:'辨识度',description:'是不是独特的柚希，而非泛用立绘'},
  {id:'hair',title:'发型协调',description:'轮廓、层次、刘海与脸的关系'},
  {id:'outfit',title:'服装美感',description:'精致与简洁取得平衡'},
  {id:'rig',title:'Live2D 友好度',description:'对称、五官清晰、遮挡较少'}
]);
export const clampRating=(v)=>Math.min(5,Math.max(1,Math.round(Number(v)||3)));
export const makeInitialReview=()=>({version:2,selected:'front-a',scores:Object.fromEntries(CANDIDATES.map(c=>[c.id,Object.fromEntries(CRITERIA.map(x=>[x.id,3]))])),notes:'',decision:'pending'});
export function validateReview(value){const x=makeInitialReview();if(!value||typeof value!=='object')return x;
  if(CANDIDATES.some(c=>c.id===value.selected))x.selected=value.selected;
  for(const c of CANDIDATES){for(const criterion of CRITERIA){x.scores[c.id][criterion.id]=clampRating(value.scores?.[c.id]?.[criterion.id]);}}
  if(typeof value.notes==='string')x.notes=value.notes.slice(0,3000);
  if(['pending','approve','revise'].includes(value.decision))x.decision=value.decision;
  return x;}
export function scoreCandidate(review,id){const v=CRITERIA.map(c=>review.scores[id][c.id]);return v.reduce((a,b)=>a+b,0)/v.length;}
export function buildExport(review){const x=validateReview(review);return {
 schema:'yuzuki.art-review.v2',project:'Yuzuki Character Lab',updatedAt:new Date().toISOString(),decision:x.decision,approvedCandidate:x.selected,
 selectedDesign:CANDIDATES.find(c=>c.id===x.selected)?.title,
 candidates:CANDIDATES.map(c=>({...c,score:scoreCandidate(x,c.id),criteria:x.scores[c.id]})),notes:x.notes,
 gate:'User art approval only; this does not constitute a rigged PSD or Cubism model.'
};}
