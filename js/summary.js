/* ============================================
   Century Birthday - Summary Page JS
   ============================================ */

window.CenturyApp.loadSummary = function() {
  const { STORE } = window.CenturyApp;

  const drumScore = STORE.getInt('drum_score') || 0;
  const drumGrade = STORE.get('drum_grade') || '?';
  const drumPlays = STORE.getInt('drum_plays') || 0;
  const drumMaxCombo = STORE.getInt('drum_max_combo') || 0;

  const haircutScore = STORE.getInt('haircut_score') || 0;
  const haircutPlays = STORE.getInt('haircut_plays') || 0;
  const haircutInsults = STORE.getInt('haircut_insults') || 0;
  const haircutPerfects = STORE.getInt('haircut_perfects') || 0;

  const phoneScore = STORE.getInt('phone_score') || 0;
  const phonePlays = STORE.getInt('phone_plays') || 0;
  const phoneBestTime = STORE.getInt('phone_best_time') || 0;

  const storyComplete = STORE.getBool('story_complete');

  const drumTitles = { S:'灵魂鼓手', A:'节奏大师', B:'合格伴奏', C:'新手鼓手', D:'节拍迷失' };
  const haircutTitles = { S:'Tony亲传', A:'高级理发师', B:'合格托尼', C:'剪刀手爱德华', D:'除草机' };
  const phoneTitles = { S:'贴膜仙人', A:'贴膜达人', B:'勉强能看', C:'手残党认证', D:'气泡收藏家' };

  function getPhoneGrade() {
    const pct = phoneScore / 200;
    if (pct >= 0.9) return 'S'; if (pct >= 0.75) return 'A';
    if (pct >= 0.55) return 'B'; if (pct >= 0.35) return 'C'; return 'D';
  }
  function getHaircutGrade() {
    const pct = haircutScore / 400;
    if (pct >= 0.9 && haircutInsults <= 1) return 'S';
    if (pct >= 0.75) return 'A'; if (pct >= 0.55) return 'B';
    if (pct >= 0.35) return 'C'; return 'D';
  }

  // Achievements
  const ach = document.getElementById('achievements');
  const games = [];
  if (drumPlays > 0) games.push({
    icon:'🥁', name:'打鼓', title: drumTitles[drumGrade]||'鼓手', grade: drumGrade,
    sub: `${drumScore}分 · 最大连击${drumMaxCombo}${drumPlays>1?' · 玩了'+drumPlays+'次':''}`,
  });
  if (haircutPlays > 0) games.push({
    icon:'✂️', name:'理发', title: haircutTitles[getHaircutGrade()]||'理发师', grade: getHaircutGrade(),
    sub: `${haircutScore}分 · Perfect×${haircutPerfects} · 被骂${haircutInsults}次${haircutPlays>1?' · 上了'+haircutPlays+'次班':''}`,
  });
  if (phonePlays > 0) games.push({
    icon:'📱', name:'贴膜', title: phoneTitles[getPhoneGrade()]||'贴膜工', grade: getPhoneGrade(),
    sub: `${phoneScore}分${phoneBestTime?' · 最快'+phoneBestTime+'秒':''}${phonePlays>1?' · 贴了'+phonePlays+'次':''}`,
  });
  if (storyComplete) {
    var endingType = STORE.get('story_ending') || '未知';
    games.push({
      icon:'🍄', name:'故事', title:'探索者', grade:'✓',
      sub:'结局：《' + endingType + '》',
    });
  }

  if (games.length === 0) {
    ach.innerHTML = '<p style="color:#9990b0;font-size:0.8rem;">还没有冒险记录…<br>去首页玩玩小游戏吧！</p>';
  } else {
    ach.innerHTML = games.map(g => `
      <div class="ach-row">
        <div><span class="ach-icon">${g.icon}</span><span class="ach-title">${g.title}</span></div>
        <span class="ach-grade">${g.grade}</span>
        <div class="ach-sub">${g.sub}</div>
      </div>
    `).join('');
  }

  // Fun stats
  const funEl = document.getElementById('fun-stats');
  const funs = [];
  if (haircutInsults > 0) funs.push(`共计被骂 <span>${haircutInsults}</span> 次（顾客已报警）`);
  if (phoneBestTime > 0) funs.push(`最快贴膜 <span>${phoneBestTime}</span> 秒（手速堪比电竞选手）`);
  if (drumMaxCombo > 0) funs.push(`打鼓连击最高 <span>${drumMaxCombo}</span>（鼓都快敲穿了）`);
  if (haircutPerfects > 0) funs.push(`理发 Perfect <span>${haircutPerfects}</span> 次（顾客欣慰地笑了）`);
  if (drumPlays > 1) funs.push(`打了 <span>${drumPlays}</span> 次鼓（鼓手の执着）`);
  if (haircutPlays > 1) funs.push(`上了 <span>${haircutPlays}</span> 次理发班（敬业精神可嘉）`);
  if (phonePlays > 1) funs.push(`贴了 <span>${phonePlays}</span> 次膜（贴膜熟练工）`);
  if (storyComplete) funs.push('达成结局：《' + (STORE.get('story_ending')||'未知') + '》🍄');
  if (funs.length === 0) funs.push('还没有数据…去玩点游戏吧！');
  funEl.innerHTML = funs.map(f => `<div class="stat-item">${f}</div>`).join('');

  // Weighted comment
  const wDrum = drumPlays > 0 ? (drumGrade==='S'?100:drumGrade==='A'?85:drumGrade==='B'?65:drumGrade==='C'?40:15) : 0;
  const wHair = haircutPlays > 0 ? (getHaircutGrade()==='S'?100:getHaircutGrade()==='A'?85:getHaircutGrade()==='B'?65:getHaircutGrade()==='C'?40:15) : 0;
  const wPhone = phonePlays > 0 ? (getPhoneGrade()==='S'?100:getPhoneGrade()==='A'?85:getPhoneGrade()==='B'?65:getPhoneGrade()==='C'?40:15) : 0;
  const wStory = storyComplete ? 100 : 0;
  const weighted = (wDrum*0.3 + wHair*0.3 + wPhone*0.2 + wStory*0.2).toFixed(0);
  const totalPlays = drumPlays + haircutPlays + phonePlays;
  const dg = drumGrade, hg = getHaircutGrade(), pg = getPhoneGrade();

  let comment;
  if (weighted >= 90) comment = 'Century 看了这份成绩单，连夜给你定制了奖杯。🏆';
  else if (dg==='S' && (hg==='D'||pg==='D')) comment = '鼓打得震天响，理发剪得顾客哭爹喊娘——但你是个好鼓手。🥁';
  else if (hg==='S' && dg==='D') comment = 'Tony老师想收你为徒，但邻居已经在投诉你打鼓扰民了。✂️';
  else if (weighted >= 70) comment = '相当不错的成绩！Century 满意地点了点头。👍';
  else if (weighted >= 50) comment = '有高有低，有笑有泪——这才是人生啊。😌';
  else if (weighted >= 30) comment = 'Century 看完沉默了。然后笑了。然后笑哭了。😂';
  else comment = '你确定你玩的不是"如何激怒 Century"模拟器？💀';

  if (totalPlays > 8) comment += ` 前前后后折腾了 <b>${totalPlays}</b> 次，这份执着感动了所有人。`;
  else if (totalPlays > 4) comment += ` 尝试了 <b>${totalPlays}</b> 次，越战越勇。`;
  if (haircutInsults >= 5) comment += ` 被骂了 <b>${haircutInsults}</b> 次——顾客已经在写投诉信了。`;
  if (drumMaxCombo >= 30) comment += ` 最高连击 <b>${drumMaxCombo}</b>，鼓都为你颤抖。`;

  document.getElementById('final-comment').innerHTML = comment;
};
// Auto-run if standalone page
if (!document.getElementById('section-home')) { window.CenturyApp.loadSummary(); }
