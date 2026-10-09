/**
 * Tiny, deterministic acting cues. No model/vendor dependency.
 * These are deliberately short so the avatar never delays a conversation for long.
 */
export const ACTING_CUES=Object.freeze({
  shy:[{emotion:'surprise',duration:160},{emotion:'shy',duration:210}],
  joy:[{emotion:'surprise',duration:120},{emotion:'joy',duration:180}],
  comfort:[{emotion:'focus',duration:180},{emotion:'comfort',duration:160}],
  curious:[{emotion:'curious',duration:200}],
  thinking:[{emotion:'focus',duration:140},{emotion:'thinking',duration:130}],
  surprise:[{emotion:'surprise',duration:170}],
  sad:[{emotion:'focus',duration:130},{emotion:'sad',duration:160}],
});
export function planReaction(emotion,{reduceMotion=false}={}){
  if(reduceMotion)return [{emotion,duration:0}];
  return (ACTING_CUES[emotion]||[{emotion,duration:160}]).map(cue=>({...cue}));
}

export function clampHistory(items,limit=30){
  return (Array.isArray(items)?items:[])
    .filter(item=>item&&['user','assistant'].includes(item.role)&&typeof item.content==='string')
    .map(item=>({role:item.role,content:item.content.trim().slice(0,1200)}))
    .filter(item=>item.content)
    .slice(-Math.max(0,Math.min(100,limit)));
}
