export const DRUMMERS=['汤','妹','yo','哲','本','项','诺'];
export const MCS=['远','豆','狮','森'];
export const TRUMPETS=['河','宏'];
export const DANCERS=['Gus','彭俊维','其他'];
export const ACTORS=[...DRUMMERS,...MCS,...TRUMPETS,...DANCERS];
const invalid=message=>{throw Object.assign(new Error(message),{status:400});};
export const blankShow=()=>({head:'',tail:'',mc:'',trumpet:'',dancers:['','']});
export const blankSchedule=(count=4)=>({format:2,count,shows:Array.from({length:count},blankShow),rest:{},night:{'彭俊维':'','哲':''}});
export function roles(show,actor){return [show.head===actor?'车头':'',show.tail===actor?'车尾':'',show.mc===actor?'MC':'',show.trumpet===actor?'小号':'',show.dancers.includes(actor)?'Dancer':''].filter(Boolean);}
export function validateSchedule(value){
  if(!value || value.format!==2 || ![4,5,6].includes(value.count))invalid('请选择 4、5 或 6 场');
  if(!Array.isArray(value.shows)||value.shows.length!==value.count)invalid('场次不完整');
  const slot=(v,list)=>{if(typeof v!=='string'||(v!==''&&!list.includes(v)))invalid('演员选项不正确');return v;};
  const shows=value.shows.map(s=>{
    if(!s||!Array.isArray(s.dancers)||s.dancers.length!==2)invalid('Dancer 位置不完整');
    const show={head:slot(s.head,DRUMMERS),tail:slot(s.tail,DRUMMERS),mc:slot(s.mc,MCS),trumpet:slot(s.trumpet,TRUMPETS),dancers:s.dancers.map(v=>slot(v,DANCERS))};
    if(show.head&&show.head===show.tail)invalid('车头和车尾不能重复');
    if(show.dancers[0]&&show.dancers[0]===show.dancers[1])invalid('两名 Dancer 不能重复');
    return show;
  });
  if(!value.rest||typeof value.rest!=='object'||Array.isArray(value.rest)||!value.night||typeof value.night!=='object'||Array.isArray(value.night))invalid('个人记录格式不正确');
  const rest={};
  for(const [actor,marks] of Object.entries(value.rest)){
    if(!ACTORS.includes(actor)||!Array.isArray(marks)||marks.length!==value.count||marks.some(v=>typeof v!=='boolean'))invalid('休息记录不正确');
    if(marks.some((v,i)=>v&&roles(shows[i],actor).length))invalid(actor+'已安排演出，不能同时休息');
    if(marks.some(Boolean))rest[actor]=marks;
  }
  const night={};
  for(const [actor,status] of Object.entries(value.night)){
    if(!['彭俊维','哲'].includes(actor)||!['','鬼','休息'].includes(status))invalid('晚场选项不正确');
    night[actor]=status;
  }
  return {format:2,count:value.count,shows,rest,night};
}
// Original rows remain archived in D1. Unrecognized actor names are never guessed.
export function normalizeSchedule(old){
  if(old?.format===2)return validateSchedule(old);
  if(!old||![4,5,6].includes(old.count))invalid('原排班格式不正确');
  const result=blankSchedule(old.count);
  const aliases={'汤世纪':'汤','妹宝':'妹','yoyo':'yo','小哲':'哲','Ben':'本','大象':'项','阿诺':'诺','欧修远':'远','小河':'河','小宏':'宏','Gus':'Gus','彭俊维':'彭俊维'};
  old.shows?.slice(0,old.count).forEach((s,i)=>{result.shows[i].head=aliases[s.drummers?.[0]]||'';result.shows[i].tail=aliases[s.drummers?.[1]]||'';});
  for(const entry of old.roster||[]){
    const actor=aliases[entry.name];if(!actor)continue;
    if(entry.shift==='鬼屋'){if(actor==='彭俊维')result.night[actor]='鬼';continue;}
    const match=/^(上午|下午)\s*(\d+)(?:\s*场)?$/.exec(entry.shift||'');
    const indices=Array.from({length:old.count},(_,i)=>i).filter(i=>entry.shift==='全天'||entry.shift==='休息'||(match&&(match[1]==='上午'?i<+match[2]:i>=old.count-+match[2])));
    for(const i of indices){
      if(entry.shift==='休息'){(result.rest[actor]??=Array(old.count).fill(false))[i]=true;continue;}
      if(MCS.includes(actor))result.shows[i].mc=actor;
      else if(TRUMPETS.includes(actor))result.shows[i].trumpet=actor;
      else if(DANCERS.includes(actor)){const at=result.shows[i].dancers.indexOf('');if(at>=0)result.shows[i].dancers[at]=actor;}
    }
  }
  for(const [name,status] of Object.entries(old.special||{})){
    const actor=aliases[name];if(!actor)continue;
    if(status==='鬼屋'&&['哲','彭俊维'].includes(actor))result.night[actor]='鬼';
    if(status==='休息')result.rest[actor]=result.shows.map(s=>!roles(s,actor).length);
  }
  return validateSchedule(result);
}
