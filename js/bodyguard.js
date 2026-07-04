/* ============================================
   Century Birthday - Bodyguard Game JS
   Sight-tracking: lock onto fans, dodge cameras
   ============================================ */

(function() {
  const { STORE, SoundEngine } = window.CenturyApp;

  const canvas = document.getElementById('bodyguard-canvas');
  const ctx = canvas.getContext('2d');
  const hudScore = document.getElementById('hud-score');
  const hudCombo = document.getElementById('hud-combo');
  const hudLives = document.getElementById('hud-lives');
  const resultsEl = document.getElementById('results');

  let width, height, animId;
  let mx = 0, my = 0; // mouse position
  const SIGHT_R = 46; // sight circle radius
  const LOCK_TIME = 0.15; // seconds to lock

  let targets = [];
  let score = 0, combo = 0, lives = 2;
  let totalCaught = 0, totalCameraHits = 0;
  let state = 'playing'; // playing | over

  function resize() {
    width = window.innerWidth; height = window.innerHeight;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr; canvas.height = height * dpr;
    canvas.style.width = width + 'px'; canvas.style.height = height + 'px';
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.scale(dpr, dpr);
  }
  resize(); window.addEventListener('resize', resize);

  // Mouse/touch tracking
  canvas.addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; });
  canvas.addEventListener('touchmove', e => { e.preventDefault(); mx = e.touches[0].clientX; my = e.touches[0].clientY; }, {passive:false});
  canvas.addEventListener('touchstart', e => { e.preventDefault(); mx = e.touches[0].clientX; my = e.touches[0].clientY; }, {passive:false});

  // ===== Target Types =====
  const BIG_EMOJIS = ['🐕','🌟','🎸','🎵','💎','🔥','👑','🎤','💫','✨'];
  const CAMERA_EMOJIS = ['📸','📷','🎥','📹'];

  class Target {
    constructor(type) {
      this.type = type; // 'big' or 'camera'
      this.r = 22 + Math.random() * 18;
      this.emoji = type === 'big'
        ? BIG_EMOJIS[Math.floor(Math.random() * BIG_EMOJIS.length)]
        : CAMERA_EMOJIS[Math.floor(Math.random() * CAMERA_EMOJIS.length)];

      // Spawn from edge OR inside visible area
      if (Math.random() < 0.5) {
        // Inside visible area
        this.x = 60 + Math.random() * (width - 120);
        this.y = 60 + Math.random() * (height - 120);
      } else {
        // From random edge
        const edge = Math.floor(Math.random() * 4);
        switch (edge) {
          case 0: this.x = -40; this.y = Math.random() * height; break;
          case 1: this.x = width + 40; this.y = Math.random() * height; break;
          case 2: this.x = Math.random() * width; this.y = -40; break;
          case 3: this.x = Math.random() * width; this.y = height + 40; break;
        }
      }
      this.vx = ((Math.random() - 0.5) * 2) * (100 + Math.random() * 100);
      this.vy = ((Math.random() - 0.5) * 2) * (100 + Math.random() * 100);
      // Strong bias toward center
      this.vx += (width/2 - this.x) * 0.08;
      this.vy += (height/2 - this.y) * 0.08;

      this.lockProgress = 0;
      this.locked = false;
      this.scale = 1;
      this.flashTimer = 0;
    }

    update(dt) {
      if (this.locked) return;
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      if (this.type === 'camera') this.flashTimer += dt;

      // Check if out of bounds → remove
      if (this.x < -80 || this.x > width + 80 || this.y < -80 || this.y > height + 80) {
        if (this.type === 'big' && !this.locked) {
          combo = 0; updateHUD();
        }
        return true; // signal removal
      }
      return false;
    }

    distTo(mx, my) {
      return Math.hypot(this.x - mx, this.y - my);
    }

    draw(ctx) {
      if (this.locked) return;
      const d = this.distTo(mx, my);
      const inSight = d < SIGHT_R + this.r;

      ctx.save();
      ctx.translate(this.x, this.y);

      // Scale on lock progress
      const s = 1 + this.lockProgress * 0.3;
      ctx.scale(s, s);

      // Glow when in sight
      if (inSight) {
        const glowAlpha = 0.3 + this.lockProgress * 0.5;
        const glowColor = this.type === 'big'
          ? `rgba(240,215,140,${glowAlpha})`
          : `rgba(255,80,80,${glowAlpha})`;
        ctx.fillStyle = glowColor;
        ctx.beginPath(); ctx.arc(0, 0, this.r + 12, 0, Math.PI * 2); ctx.fill();
      }

      // Camera flash
      if (this.type === 'camera' && Math.sin(this.flashTimer * 8) > 0) {
        ctx.fillStyle = 'rgba(255,60,60,0.4)';
        ctx.beginPath(); ctx.arc(0, 0, this.r + 6, 0, Math.PI * 2); ctx.fill();
      }

      // Body
      ctx.fillStyle = this.type === 'big' ? 'rgba(30,20,50,0.85)' : 'rgba(60,20,20,0.85)';
      ctx.strokeStyle = inSight
        ? (this.type === 'big' ? '#f0d78c' : '#ff6060')
        : 'rgba(255,255,255,0.2)';
      ctx.lineWidth = inSight ? 3 : 1.5;
      ctx.beginPath(); ctx.arc(0, 0, this.r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

      // Emoji
      ctx.font = `${this.r}px serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(this.emoji, 0, 0);

      // Progress ring
      if (this.lockProgress > 0) {
        const ringColor = this.type === 'big' ? '#f0d78c' : '#ff6060';
        ctx.strokeStyle = ringColor;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(0, 0, this.r + 8, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * this.lockProgress);
        ctx.stroke();
      }

      ctx.restore();
    }
  }

  // ===== Spawning =====
  let spawnTimer = 0;
  function spawnTarget() {
    // More cameras than bigs (ratio ~3:1)
    const r = Math.random();
    targets.push(new Target(r < 0.55 ? 'big' : 'camera'));
  }

  // ===== Game Loop =====
  function updateHUD() {
    hudScore.textContent = score;
    if (combo > 1) { hudCombo.textContent = combo + 'x Combo'; hudCombo.classList.add('active'); }
    else hudCombo.classList.remove('active');
    hudLives.textContent = '♥'.repeat(Math.max(0, lives));
  }

  function endGame(reason) {
    state = 'over';
    showResults(reason);
  }

  function showResults(reason) {
    resultsEl.classList.remove('hidden');
    let title, grade, comment;

    if (reason === 'camera') {
      const comments = [
        '咔嚓！第二天你登上了八卦杂志的封面。标题：「Century 保镖当众摸鱼，偶像遭围堵」。你的职业生涯…结束了？',
        '摄像机捕捉到了你茫然的眼神。社交媒体上，你的表情包已经病毒式传播。恭喜，你比 Century 还红了。',
        '被拍到了！记者们蜂拥而上。Century 在后台叹了口气：「下次还是我自己来吧。」',
        '闪光灯亮起的瞬间，你知道一切都完了。你的保镖执照被吊销，只能在便利店打工度过余生。',
      ];
      title = '被拍到了！';
      grade = 'GAME OVER';
      comment = comments[Math.floor(Math.random() * comments.length)];
    } else {
      title = '演出结束';
      const pct = totalCaught / Math.max(1, totalCaught + totalCameraHits);
      if (pct >= 0.9) { grade = '鹰眼保镖'; comment = '全场最佳。Century 演出结束后请你吃了顿饭。'; }
      else if (pct >= 0.7) { grade = '火眼金睛'; comment = '大部分威胁都被你挡下了。Century 对你点了点头。'; }
      else if (pct >= 0.5) { grade = '合格保安'; comment = '勉强及格。至少演出没出大乱子。'; }
      else { grade = '眼神不太好'; comment = 'Century 礼貌地问你需不需要配副眼镜。'; }
    }

    document.getElementById('results-title').textContent = title;
    document.getElementById('results-grade').textContent = grade;
    document.getElementById('results-comment').textContent = comment;
    document.getElementById('res-score').textContent = score;
    document.getElementById('res-caught').textContent = totalCaught;
    document.getElementById('res-camera').textContent = totalCameraHits;

    STORE.setBool('bodyguard_complete', true);
    STORE.set('bodyguard_score', score.toString());
    SoundEngine.playChime();
  }

  function gameLoop(ts) {
    animId = requestAnimationFrame(gameLoop);
    const dt = Math.min(0.05, (ts - (gameLoop._lastTs || ts)) / 1000);
    gameLoop._lastTs = ts;
    if (state === 'over') return;

    // Spawn
    spawnTimer += dt;
    const maxTargets = 15;
    if (targets.length < maxTargets && spawnTimer > 0.8) {
      spawnTimer = 0;
      spawnTarget();
    }

    // Update targets
    for (let i = targets.length - 1; i >= 0; i--) {
      const t = targets[i];
      if (t.update(dt)) { targets.splice(i, 1); continue; }

      // Lock-on check
      const d = t.distTo(mx, my);
      if (d < SIGHT_R + t.r) {
        t.lockProgress += dt / LOCK_TIME;
        if (t.lockProgress >= 1 && !t.locked) {
          t.locked = true;
          if (t.type === 'big') {
            score += 100 + combo * 20;
            combo++; totalCaught++;
            SoundEngine.playSnap();
          } else {
            score = Math.max(0, score - 50);
            lives--; totalCameraHits++;
            combo = 0;
            SoundEngine.playWahWah();
            if (lives <= 0) { endGame('camera'); return; }
          }
          updateHUD();
          targets.splice(i, 1);
        }
      } else {
        t.lockProgress = Math.max(0, t.lockProgress - dt * 2);
      }
    }

    // Draw
    ctx.clearRect(0, 0, width, height);
    const bgGrad = ctx.createRadialGradient(width/2, height/2, 0, width/2, height/2, Math.max(width, height)*0.7);
    bgGrad.addColorStop(0, '#1a1030'); bgGrad.addColorStop(1, '#080818');
    ctx.fillStyle = bgGrad; ctx.fillRect(0, 0, width, height);

    // Concert crowd silhouettes
    for (let i = 0; i < 30; i++) {
      const sx = (i * 137 + 50) % width, sy = height * 0.7 + (i * 73) % (height * 0.3);
      ctx.fillStyle = 'rgba(255,255,255,0.015)';
      ctx.beginPath();
      ctx.arc(sx, sy, 15 + (i % 20), 0, Math.PI);
      ctx.fill();
    }

    for (const t of targets) t.draw(ctx);

    // Sight circle
    ctx.strokeStyle = 'rgba(240,215,140,0.7)';
    ctx.lineWidth = 2; ctx.setLineDash([8, 6]);
    ctx.beginPath(); ctx.arc(mx, my, SIGHT_R, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);

    // Inner dot
    ctx.fillStyle = 'rgba(240,215,140,0.5)';
    ctx.beginPath(); ctx.arc(mx, my, 3, 0, Math.PI * 2); ctx.fill();
  }

  // Pre-spawn initial targets
  for (let i = 0; i < 8; i++) spawnTarget();
  updateHUD();
  gameLoop._lastTs = performance.now();
  animId = requestAnimationFrame(gameLoop);
})();
