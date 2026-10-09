import {CANDIDATES,CRITERIA,validateReview,makeInitialReview,scoreCandidate,buildExport} from './review-data.js';
const el=id=>document.getElementById(id);
let state;try{state=validateReview(JSON.parse(localStorage.getItem('yuzuki-review-v2')));}catch{state=makeInitialReview();}
const save=()=>{try{localStorage.setItem('yuzuki-review-v2',JSON.stringify(state));}catch{ /* private browsing */ }};
const cards=el('candidateCards'),criteria=el('criteria'),left=el('compareLeft'),right=el('compareRight');
function renderCards(){cards.replaceChildren();for(const candidate of CANDIDATES){const card=document.createElement('button');card.className='candidate-card'+(candidate.id===state.selected?' active':'');card.type='button';card.setAttribute('aria-pressed',String(candidate.id===state.selected));card.dataset.candidate=candidate.id;
  const image=document.createElement('img');image.src=candidate.path;image.alt=`${candidate.title}，柚希角色半身立绘`;
  const row=document.createElement('div');row.className='candidate-title';const strong=document.createElement('strong');strong.textContent=candidate.title;const tag=document.createElement('span');tag.textContent=candidate.tag;row.append(strong,tag);
  const score=document.createElement('p');score.className='candidate-score';score.textContent=`审美记录 · ${scoreCandidate(state,candidate.id).toFixed(1)} / 5`;
  card.append(image,row,score);card.addEventListener('click',()=>{state.selected=candidate.id;save();refresh();});cards.append(card);}}
function renderScores(){const c=CANDIDATES.find(c=>c.id===state.selected);el('selectedName').textContent=c.title;el('selectedDescription').textContent=c.note;el('selectedImage').src=c.path;el('selectedImage').alt=`${c.title} 当前所选角色`;
  criteria.replaceChildren();for(const criterion of CRITERIA){const row=document.createElement('label');row.className='criterion';const label=document.createElement('span');label.innerHTML=`<strong>${criterion.title}</strong><small>${criterion.description}</small>`;const input=document.createElement('input');input.type='range';input.min='1';input.max='5';input.step='1';input.value=String(state.scores[c.id][criterion.id]);input.setAttribute('aria-label',criterion.title+'评分');const display=document.createElement('b');display.textContent=input.value;input.addEventListener('input',()=>{state.scores[c.id][criterion.id]=Number(input.value);display.textContent=input.value;save();renderCards();});row.append(label,input,display);criteria.append(row);}}
function refresh(){renderCards();renderScores();el('reviewNotes').value=state.notes;document.querySelectorAll('[data-decision]').forEach(b=>b.classList.toggle('chosen',b.dataset.decision===state.decision));}
function setupCompare(){left.replaceChildren();right.replaceChildren();for(const [select,initial] of [[left,'front-a'],[right,'front-b']]){for(const c of CANDIDATES){const o=document.createElement('option');o.value=c.id;o.textContent=c.title;select.append(o);}select.value=initial;select.addEventListener('change',renderCompare);}renderCompare();}
function renderCompare(){const a=CANDIDATES.find(c=>c.id===left.value),b=CANDIDATES.find(c=>c.id===right.value);el('compareA').src=a.path;el('compareB').src=b.path;el('compareLabelA').textContent=a.title;el('compareLabelB').textContent=b.title;}
function getReport(){return JSON.stringify(buildExport(state),null,2);}
function download(){const blob=new Blob([getReport()],{type:'application/json;charset=utf-8'});const a=document.createElement('a');const url=URL.createObjectURL(blob);a.href=url;a.download='yuzuki-art-review-v2.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);el('exportStatus').textContent='审核记录已生成。把 JSON 发回对话就能直接继续迭代。';}
el('reviewNotes').addEventListener('input',e=>{state.notes=e.target.value.slice(0,3000);save();});
document.querySelectorAll('[data-decision]').forEach(b=>b.addEventListener('click',()=>{state.decision=b.dataset.decision;save();refresh();}));
el('exportReview').addEventListener('click',download);
el('copyReview').addEventListener('click',async()=>{const report=getReport();try{await navigator.clipboard.writeText(report);el('exportStatus').textContent='已复制完整审核 JSON，可直接粘贴到对话。';}catch{el('exportStatus').textContent='复制失败，请用「导出审核 JSON」保存。';}});
setupCompare();refresh();
