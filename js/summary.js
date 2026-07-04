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
    icon:'·', name:'打鼓', title: drumTitles[drumGrade]||'鼓手', grade: drumGrade,
    sub: `${drumScore}分 · 最大连击 ${drumMaxCombo}${drumPlays>1?' · 共 '+drumPlays+' 次':''}`,
  });
  if (haircutPlays > 0) games.push({
    icon:'·', name:'理发', title: haircutTitles[getHaircutGrade()]||'理发师', grade: getHaircutGrade(),
    sub: `${haircutScore}分 · Perfect ${haircutPerfects} 次 · 被骂 ${haircutInsults} 次${haircutPlays>1?' · 共 '+haircutPlays+' 次':''}`,
  });
  if (phonePlays > 0) games.push({
    icon:'·', name:'贴膜', title: phoneTitles[getPhoneGrade()]||'贴膜工', grade: getPhoneGrade(),
    sub: `${phoneScore}分${phoneBestTime?' · 最快 '+phoneBestTime+' 秒':''}${phonePlays>1?' · 共 '+phonePlays+' 次':''}`,
  });
  var bgPlays = STORE.getInt('bodyguard_plays') || 0;
  var bgScore = STORE.getInt('bodyguard_score') || 0;
  var bgCaught = STORE.getInt('bodyguard_caught') || 0;
  var bgCamera = STORE.getInt('bodyguard_camera') || 0;
  if (bgPlays > 0) {
    var bgPct = bgCaught / Math.max(1, bgCaught + bgCamera);
    var bgGrade = bgPct >= 0.9 ? 'S' : bgPct >= 0.7 ? 'A' : bgPct >= 0.5 ? 'B' : 'C';
    var bgTitles = { S:'鹰眼', A:'火眼金睛', B:'合格保安', C:'不太在状态' };
    games.push({
      icon:'·', name:'上班', title: bgTitles[bgGrade]||'保安', grade: bgGrade,
      sub: `${bgScore}分 · 接住 ${bgCaught} · 被拍 ${bgCamera}${bgPlays>1?' · 共 '+bgPlays+' 次':''}`,
    });
  }

  if (storyComplete) {
    var endingType = STORE.get('story_ending') || '未知';
    games.push({
      icon:'·', name:'故事', title:'探索者', grade:'✓',
      sub:'结局：' + endingType,
    });
  }

  if (games.length === 0) {
    ach.innerHTML = '<p style="color:rgba(200,190,210,0.4);font-size:0.8rem;text-align:center;padding:20px 0;">还没有冒险记录<br>去首页玩玩小游戏吧</p>';
  } else {
    ach.innerHTML = games.map(g => `
      <div class="ach-row">
        <div class="ach-header"><span class="ach-icon">${g.icon}</span><span class="ach-title">${g.title}</span><span class="ach-grade">${g.grade}</span></div>
        <div class="ach-detail">${g.sub}</div>
      </div>
    `).join('');
  }

  // Fun stats
  const funEl = document.getElementById('fun-stats');
  const funs = [];
  if (haircutInsults > 0) funs.push(`累计被骂 <span>${haircutInsults}</span> 次`);
  if (phoneBestTime > 0) funs.push(`最快贴膜 <span>${phoneBestTime}</span> 秒`);
  if (drumMaxCombo > 0) funs.push(`最高连击 <span>${drumMaxCombo}</span>`);
  if (haircutPerfects > 0) funs.push(`Perfect <span>${haircutPerfects}</span> 次`);
  if (drumPlays > 1) funs.push(`打鼓 <span>${drumPlays}</span> 次`);
  if (haircutPlays > 1) funs.push(`理发 <span>${haircutPlays}</span> 次`);
  if (phonePlays > 1) funs.push(`贴膜 <span>${phonePlays}</span> 次`);
  if (bgPlays > 0) funs.push(`接住比格 <span>${bgCaught}</span> 次 · 被拍 <span>${bgCamera}</span> 次`);
  if (storyComplete) funs.push('结局：' + (STORE.get('story_ending')||'未知'));
  if (funs.length === 0) funs.push('暂无数据');
  funEl.innerHTML = funs.map(f => `<div class="stat-item">${f}</div>`).join('');

  // Generate comprehensive humorous evaluation
  var parts = [], dg = drumGrade, hg = getHaircutGrade(), pg = getPhoneGrade();
  var totalPlays = drumPlays + haircutPlays + phonePlays;

  if (drumPlays > 0) {
    var dt = drumTitles[dg]||'鼓手';
    if (dg==='S') parts.push('鼓技已入化境，荣膺「'+dt+'」');
    else if (dg==='A') parts.push('节奏感出众，拿下「'+dt+'」称号');
    else if (dg==='D') parts.push('打鼓的路还很长，但勇气可嘉');
    else parts.push('以「'+dt+'」之姿完成了伴奏');
  }
  if (haircutPlays > 0) {
    var ht = haircutTitles[hg]||'理发师';
    if (hg==='S') parts.push('剪刀功夫炉火纯青，无愧「'+ht+'」之名');
    else if (hg==='D') parts.push('理发店差点被顾客砸了——「'+ht+'」名副其实');
    else if (haircutInsults>=3) parts.push('虽被骂 '+haircutInsults+' 次，但「'+ht+'」的头衔保住了');
    else parts.push('「'+ht+'」——顾客情绪基本稳定');
  }
  if (phonePlays > 0) {
    var pt = phoneTitles[pg]||'贴膜工';
    if (pg==='S') parts.push('贴膜技艺堪称完美，「'+pt+'」当之无愧');
    else if (phoneBestTime&&phoneBestTime<10) parts.push('手速惊人，'+phoneBestTime+'秒清空气泡');
    else parts.push('「'+pt+'」——贴膜之路仍在继续');
  }
  if (bgPlays > 0) {
    var bgGrade2 = bgPct >= 0.9 ? 'S' : bgPct >= 0.7 ? 'A' : bgPct >= 0.5 ? 'B' : 'C';
    var bgt = { S:'鹰眼', A:'火眼金睛', B:'合格保安', C:'不太在状态' }[bgGrade2]||'保安';
    if (bgGrade2==='S') parts.push('眼神锐利如鹰，上班零失误');
    else if (bgCamera>=5) parts.push('上班时被拍了 '+bgCamera+' 次，小红书都传遍了');
    else parts.push('作为「'+bgt+'」，完成了今天的上班');
  }
  if (storyComplete) {
    parts.push('在猫与蘑菇的故事中抵达了「'+(STORE.get('story_ending')||'未知')+'」');
  }

  var comment = parts.length>0 ? parts.join('。\n')+'。' : '还没有冒险记录。';
  if (totalPlays>0) {
    comment += '\n\n';
    if (totalPlays>=12) comment += '来来回回折腾了 '+totalPlays+' 次——这份执着，日月可鉴。';
    else if (totalPlays>6) comment += '前前后后尝试了 '+totalPlays+' 次，越战越勇。';
    else comment += '一共经历了 '+totalPlays+' 次冒险。';
    if (drumMaxCombo>=30) comment += ' 最高连击 '+drumMaxCombo+'，鼓都为你颤抖。';
    if (haircutInsults>=5) comment += ' 被骂了 '+haircutInsults+' 次，顾客已在写投诉信。';
  }
  document.getElementById('final-comment').innerHTML = comment.replace(/\n/g,'<br>');
};
// Auto-run if standalone page
if (!document.getElementById('section-home')) { window.CenturyApp.loadSummary(); }
