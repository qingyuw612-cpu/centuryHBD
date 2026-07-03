/* ============================================
   Century Birthday - Ending Page JS
   Comprehensive stats + humorous summary
   ============================================ */

(function() {
  const { BGM, STORE, SoundEngine } = window.CenturyApp;

  // Canvas for fireworks
  const canvas = document.getElementById('ending-canvas');
  const ctx = canvas.getContext('2d');
  let width, height, animId;

  function resize() {
    width = window.innerWidth; height = window.innerHeight;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr; canvas.height = height * dpr;
    canvas.style.width = width + 'px'; canvas.style.height = height + 'px';
    ctx.setTransform(1,0,0,1,0,0); ctx.scale(dpr, dpr);
  }
  resize();
  window.addEventListener('resize', resize);

  // ===== Fireworks & confetti =====
  let fireworks = [], confettiPieces = [];
  const COLORS = ['#f0d78c','#e8c060','#b39dda','#9a7fc0','#7eb8da','#ffb3ba','#f09098'];

  class FireworkParticle {
    constructor(x,y,c) { this.x=x; this.y=y; this.color=c;
      const a=Math.random()*Math.PI*2, s=1.5+Math.random()*5;
      this.vx=Math.cos(a)*s; this.vy=Math.sin(a)*s;
      this.alpha=1; this.size=1.5+Math.random()*3; this.age=0; this.maxAge=0.8+Math.random()*1.4; }
    update(dt) { this.age+=dt; this.x+=this.vx; this.y+=this.vy; this.vy+=0.04; this.vx*=0.99; this.vy*=0.99; this.alpha=Math.max(0,1-this.age/this.maxAge); }
    draw(ctx) { if(this.alpha<=0)return; ctx.save(); ctx.globalAlpha=this.alpha; ctx.fillStyle=this.color; ctx.shadowColor=this.color; ctx.shadowBlur=4; ctx.beginPath(); ctx.arc(this.x,this.y,this.size,0,Math.PI*2); ctx.fill(); ctx.restore(); }
    get dead() { return this.age>=this.maxAge; }
  }
  function spawnFirework() {
    const x=width*0.15+Math.random()*width*0.7, y=height*0.1+Math.random()*height*0.4;
    const c=COLORS[Math.floor(Math.random()*COLORS.length)];
    const n=50+Math.floor(Math.random()*60);
    for(let i=0;i<n;i++) fireworks.push(new FireworkParticle(x,y,c));
  }

  class Confetti {
    constructor(init) { this.reset(init); }
    reset(init) { this.x=Math.random()*width; this.y=init?Math.random()*height*0.2-30:-20;
      this.size=4+Math.random()*8; this.color=COLORS[Math.floor(Math.random()*COLORS.length)];
      this.vy=1+Math.random()*2.5; this.vx=-1+Math.random()*2;
      this.rotation=Math.random()*Math.PI*2; this.rotSpeed=(Math.random()-0.5)*0.08;
      this.alpha=0.6+Math.random()*0.4; this.wobble=Math.random()*Math.PI*2; this.wobbleSpeed=0.02+Math.random()*0.03; }
    update(dt) { this.y+=this.vy; this.x+=this.vx+Math.sin(this.wobble)*0.8; this.wobble+=this.wobbleSpeed; this.rotation+=this.rotSpeed; if(this.y>height+30)this.reset(false); }
    draw(ctx) { ctx.save(); ctx.globalAlpha=this.alpha; ctx.translate(this.x,this.y); ctx.rotate(this.rotation); ctx.fillStyle=this.color; ctx.fillRect(-this.size/2,-this.size/4,this.size,this.size/2); ctx.restore(); }
  }

  let bgStars=[];
  function createBgStars() { bgStars=[]; for(let i=0;i<60;i++) bgStars.push({x:Math.random()*width,y:Math.random()*height,r:0.5+Math.random()*1.5,ts:0.5+Math.random()*2,to:Math.random()*Math.PI*2}); }
  createBgStars();

  let timeSinceStart=0, fireworkTimer=0, confettiSpawnTimer=0;
  function gameLoop(ts) {
    animId=requestAnimationFrame(gameLoop);
    const dt=Math.min(0.05,(ts-(gameLoop._lastTs||ts))/1000); gameLoop._lastTs=ts; timeSinceStart+=dt;

    fireworkTimer+=dt;
    if(fireworkTimer>0.8+Math.random()*1.2){fireworkTimer=0;spawnFirework();}
    if(timeSinceStart>1&&timeSinceStart<3&&fireworkTimer>0.4){fireworkTimer=0;spawnFirework();}
    confettiSpawnTimer+=dt;
    while(confettiSpawnTimer>0.05&&confettiPieces.length<200){confettiSpawnTimer-=0.05;confettiPieces.push(new Confetti(true));}
    for(const fp of fireworks)fp.update(dt);
    for(const cp of confettiPieces)cp.update(dt);
    fireworks=fireworks.filter(f=>!f.dead);
    ctx.clearRect(0,0,width,height);
    const bgGrad=ctx.createRadialGradient(width*0.5,height*0.4,0,width*0.5,height*0.5,Math.max(width,height));
    bgGrad.addColorStop(0,'#1a1640');bgGrad.addColorStop(0.6,'#0f0d28');bgGrad.addColorStop(1,'#060418');
    ctx.fillStyle=bgGrad;ctx.fillRect(0,0,width,height);
    for(const s of bgStars){const a=0.3+Math.sin(timeSinceStart*s.ts+s.to)*0.3;ctx.fillStyle=`rgba(240,215,140,${Math.max(0.1,a)})`;ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,Math.PI*2);ctx.fill();}
    ctx.globalCompositeOperation='lighter';
    for(const fp of fireworks)fp.draw(ctx);
    ctx.globalCompositeOperation='source-over';
    for(const cp of confettiPieces)cp.draw(ctx);

    // Text reveal
    if(timeSinceStart>=2){document.getElementById('happy-birthday').style.opacity='1';}
    if(timeSinceStart>=3.5){document.getElementById('century-name').style.opacity='1';}
    if(timeSinceStart>=4.5){
      document.getElementById('final-comment').style.opacity='1';
      document.getElementById('panel-left').classList.add('show');
      document.getElementById('panel-right').classList.add('show');
    }
    if(timeSinceStart>=6){document.getElementById('ending-links').style.opacity='1';}
  }

  // ===== Stats Computation =====
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

  // Titles
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

  // ===== Achievements (left panel) =====
  const ach = document.getElementById('achievements');
  const games = [];

  if (drumPlays > 0) games.push({
    icon: '🥁', name: '打鼓',
    title: drumTitles[drumGrade] || '鼓手',
    grade: drumGrade,
    sub: `${drumScore}分 · 最大连击${drumMaxCombo}${drumPlays > 1 ? ' · 玩了'+drumPlays+'次' : ''}`,
  });

  if (haircutPlays > 0) games.push({
    icon: '✂️', name: '理发',
    title: haircutTitles[getHaircutGrade()] || '理发师',
    grade: getHaircutGrade(),
    sub: `${haircutScore}分 · Perfect×${haircutPerfects} · 被骂${haircutInsults}次${haircutPlays > 1 ? ' · 上了'+haircutPlays+'次班' : ''}`,
  });

  if (phonePlays > 0) games.push({
    icon: '📱', name: '贴膜',
    title: phoneTitles[getPhoneGrade()] || '贴膜工',
    grade: getPhoneGrade(),
    sub: `${phoneScore}分${phoneBestTime ? ' · 最快'+phoneBestTime+'秒' : ''}${phonePlays > 1 ? ' · 贴了'+phonePlays+'次' : ''}`,
  });

  if (storyComplete) games.push({
    icon: '🍄', name: '故事', title: '探索者', grade: '✓',
    sub: '达成了猫与蘑菇的结局',
  });

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

  // ===== Fun Stats (right panel) =====
  const funEl = document.getElementById('fun-stats');
  const funs = [];
  if (haircutInsults > 0) funs.push(`共计被骂 <span>${haircutInsults}</span> 次（顾客已报警）`);
  if (phoneBestTime > 0) funs.push(`最快贴膜 <span>${phoneBestTime}</span> 秒（手速堪比电竞选手）`);
  if (drumMaxCombo > 0) funs.push(`打鼓连击最高 <span>${drumMaxCombo}</span>（鼓都快敲穿了）`);
  if (haircutPerfects > 0) funs.push(`理发 Perfect <span>${haircutPerfects}</span> 次（顾客欣慰地笑了）`);
  if (drumPlays > 1) funs.push(`打了 <span>${drumPlays}</span> 次鼓（鼓手の执着）`);
  if (haircutPlays > 1) funs.push(`上了 <span>${haircutPlays}</span> 次理发班（敬业精神可嘉）`);
  if (phonePlays > 1) funs.push(`贴了 <span>${phonePlays}</span> 次膜（贴膜熟练工）`);
  if (storyComplete) funs.push('探索了猫与蘑菇的秘密 🍄');
  if (funs.length === 0) funs.push('还没有数据…去玩点游戏吧！');
  funEl.innerHTML = funs.map(f => `<div class="stat-item">${f}</div>`).join('');

  // ===== Weighted Score & Comment =====
  const wDrum = drumPlays > 0 ? (drumGrade === 'S' ? 100 : drumGrade === 'A' ? 85 : drumGrade === 'B' ? 65 : drumGrade === 'C' ? 40 : 15) : 0;
  const wHair = haircutPlays > 0 ? (getHaircutGrade() === 'S' ? 100 : getHaircutGrade() === 'A' ? 85 : getHaircutGrade() === 'B' ? 65 : getHaircutGrade() === 'C' ? 40 : 15) : 0;
  const wPhone = phonePlays > 0 ? (getPhoneGrade() === 'S' ? 100 : getPhoneGrade() === 'A' ? 85 : getPhoneGrade() === 'B' ? 65 : getPhoneGrade() === 'C' ? 40 : 15) : 0;
  const wStory = storyComplete ? 100 : 0;
  const weighted = (wDrum * 0.3 + wHair * 0.3 + wPhone * 0.2 + wStory * 0.2).toFixed(0);
  const totalPlays = drumPlays + haircutPlays + phonePlays;

  let comment;
  const dg = drumGrade, hg = getHaircutGrade(), pg = getPhoneGrade();

  if (weighted >= 90) {
    comment = 'Century 看了这份成绩单，连夜给你定制了奖杯。🏆';
  } else if (dg === 'S' && (hg === 'D' || pg === 'D')) {
    comment = '鼓打得震天响，理发剪得顾客哭爹喊娘——但你是个好鼓手。🥁';
  } else if (hg === 'S' && dg === 'D') {
    comment = 'Tony老师想收你为徒，但邻居已经在投诉你打鼓扰民了。✂️';
  } else if (weighted >= 70) {
    comment = '相当不错的成绩！Century 满意地点了点头。👍';
  } else if (weighted >= 50) {
    comment = '有高有低，有笑有泪——这才是人生啊。😌';
  } else if (weighted >= 30) {
    comment = 'Century 看完沉默了。然后笑了。然后笑哭了。😂';
  } else {
    comment = '你确定你玩的不是"如何激怒 Century"模拟器？💀';
  }

  if (totalPlays > 8) comment += ` 前前后后折腾了 <b>${totalPlays}</b> 次，这份执着感动了所有人。`;
  else if (totalPlays > 4) comment += ` 尝试了 <b>${totalPlays}</b> 次，越战越勇。`;

  if (haircutInsults >= 5) comment += ` 被骂了 <b>${haircutInsults}</b> 次——顾客已经在写投诉信了。`;
  if (drumMaxCombo >= 30) comment += ` 最高连击 <b>${drumMaxCombo}</b>，鼓都为你颤抖。`;

  document.getElementById('final-comment').innerHTML = comment;

  // ===== Start =====
  BGM.init();
  BGM.play();
  gameLoop._lastTs = performance.now();
  animId = requestAnimationFrame(gameLoop);

})();
