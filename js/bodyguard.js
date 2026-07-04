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
  const toastEl = document.getElementById('toast');
  const storyDialog = document.getElementById('story-dialog');
  const storyStart = document.getElementById('story-start');

  // ===== Toast =====
  let toastTimer = null;
  function toast(msg, duration) {
    if (!toastEl) return;
    clearTimeout(toastTimer);
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), duration || 2000);
  }

  // Floating commentary pool
  const FLOAT_TEXTS = [
    '一个比格晃过来了。它对你是真爱。',
    '专心找比格。摄像机什么的，假装没看到。',
    '比格在人群中闪闪发光——那是冲你来的。',
    '红色闪烁 = 镜头。别对视，别对视，别对视。',
    '又有粉丝来了。假装不经意地看一眼。',
    '保持专注。一个合格的i人不需要看镜头。',
    '比格冲你眨了眨眼。它喜欢你。',
    '镜头正在寻找你的脸。不给它机会。',
    '那个举着手机晃来晃去的…准没好事。',
    '深呼吸。比格需要你，镜头不配拥有你。',
  ];
  const BIG_LOCK_TEXTS = [
    '接住了。粉丝心满意足。',
    '又一个比格被你收入视线。你今天很受欢迎。',
    '比格在你眼中停留了片刻——它感受到了。',
    '好的，这个粉丝今天值了。',
    '粉丝+1。Century嘴角微微上扬。',
  ];
  const CAM_LOCK_TEXTS = [
    '咔嚓。你下意识别开了脸——但晚了。',
    '被拍到了。照片将在三秒内传遍小红书。',
    '一台摄像机捕捉到了你的表情。',
    '你又和镜头对视了。作为一个i人，这是工伤。',
    '镜头+1。今天的小红书素材有了。',
  ];
  const COUNTDOWN_PROMPTS = { 10: '快下班了，再撑一下。', 5: '最后五秒。比格还在等你，镜头就别管了。' };

  let width, height, animId;
  let mx = 0, my = 0; // mouse position
  const SIGHT_R = 46; // sight circle radius
  const LOCK_TIME = 0.15; // seconds to lock

  let targets = [];
  let score = 0, combo = 0;
  let timeLeft = 25; // seconds
  let cameraHits = 0;
  let totalCaught = 0;
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
  const BIG_IMAGES = [];
  const CAMERA_EMOJIS = ['📸','📷','🎥','📹'];

  // Preload Big images — auto-scan: 比格1~20 .png/.jpg/.jpeg/.webp
  let imagesLoaded = 0;
  for (let i = 1; i <= 20; i++) {
    ['png', 'jpg', 'jpeg', 'webp'].forEach(ext => {
      const img = new Image();
      img.onload = () => { imagesLoaded++; BIG_IMAGES.push(img); };
      img.onerror = () => {};
      img.src = `assets/bodyguard/比格${i}.${ext}`;
    });
  }

  class Target {
    constructor(type) {
      this.type = type; // 'big' or 'camera'
      this.r = 28 + Math.random() * 20;
      this.emoji = type === 'big' ? null : CAMERA_EMOJIS[Math.floor(Math.random() * CAMERA_EMOJIS.length)];
      this.image = (type === 'big' && BIG_IMAGES.length > 0)
        ? BIG_IMAGES[Math.floor(Math.random() * BIG_IMAGES.length)] : null;

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
      this.vx = ((Math.random() - 0.5) * 2) * (140 + Math.random() * 120);
      this.vy = ((Math.random() - 0.5) * 2) * (140 + Math.random() * 120);
      this.vx += (width/2 - this.x) * 0.1;
      this.vy += (height/2 - this.y) * 0.1;

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
      if (this.type === 'big' && this.image && this.image.complete && this.image.naturalWidth > 0) {
        ctx.save();
        ctx.beginPath(); ctx.arc(0, 0, this.r, 0, Math.PI * 2); ctx.clip();
        ctx.drawImage(this.image, -this.r, -this.r, this.r * 2, this.r * 2);
        ctx.restore();
      } else {
        // Fallback: use emoji or styled circle
        var fallbackEmoji = this.type === 'big' ? '🐻' : (this.emoji || '📸');
        ctx.fillStyle = this.type === 'big' ? 'rgba(40,30,20,0.8)' : 'rgba(60,20,20,0.85)';
        ctx.beginPath(); ctx.arc(0, 0, this.r, 0, Math.PI * 2); ctx.fill();
        ctx.font = `${this.r * 0.8}px serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(fallbackEmoji, 0, 0);
      }
      ctx.strokeStyle = inSight
        ? (this.type === 'big' ? '#f0d78c' : '#ff6060')
        : 'rgba(255,255,255,0.2)';
      ctx.lineWidth = inSight ? 3 : 1.5;
      ctx.beginPath(); ctx.arc(0, 0, this.r, 0, Math.PI * 2); ctx.stroke();

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
  let floatTimer = 0;
  function spawnTarget(forceType) {
    const r = Math.random();
    const type = forceType || (r < 0.55 ? 'big' : 'camera');
    targets.push(new Target(type));
  }

  // ===== Game Loop =====
  function updateHUD() {
    hudScore.textContent = score;
    if (combo > 1) { hudCombo.textContent = combo + 'x Combo'; hudCombo.classList.add('active'); }
    else hudCombo.classList.remove('active');
    var timerEl = document.getElementById('hud-timer');
    if (timerEl) timerEl.textContent = Math.ceil(timeLeft) + 's';
  }

  function endGame() {
    state = 'over';
    document.getElementById('game-container').style.cursor = '';
    showResults();
  }

  function showResults() {
    resultsEl.classList.remove('hidden');
    const title = '演出结束';
    let grade, comment;
    const pct = totalCaught / Math.max(1, totalCaught + cameraHits);

    if (pct >= 0.9 && cameraHits <= 1) { grade = '完美上班'; comment = '无比格漏接，零镜头事故。今天是一场完美的上班。'; }
    else if (pct >= 0.7) { grade = '基本稳了'; comment = '有几个镜头拍到了你，但问题不大——照片P一下还能用。'; }
    else if (pct >= 0.5) { grade = '勉强及格'; comment = '被拍得有点多。你在小红书上看到了自己的表情包，心情复杂。'; }
    else if (cameraHits >= 5) {
      grade = '被拍麻了';
      comment = '小红书上的路人都在问：「这个被拍了一百次的鼓手是谁？」';
    }
    else { grade = '不太在状态'; comment = '今天镜头有点多。下次上班请集中注意力。'; }

    document.getElementById('results-title').textContent = title;
    document.getElementById('results-grade').textContent = grade;
    document.getElementById('results-comment').textContent = comment;
    document.getElementById('res-score').textContent = score;
    document.getElementById('res-caught').textContent = totalCaught;
    document.getElementById('res-camera').textContent = cameraHits;

    STORE.setBool('bodyguard_complete', true);
    STORE.set('bodyguard_score', score.toString());
    STORE.set('bodyguard_caught', totalCaught.toString());
    STORE.set('bodyguard_camera', cameraHits.toString());
    var plays = (STORE.getInt('bodyguard_plays') || 0) + 1;
    STORE.set('bodyguard_plays', plays.toString());
    SoundEngine.playChime();
  }

  function gameLoop(ts) {
    animId = requestAnimationFrame(gameLoop);
    const dt = Math.min(0.05, (ts - (gameLoop._lastTs || ts)) / 1000);
    gameLoop._lastTs = ts;
    if (state === 'over') return;

    // Countdown
    timeLeft -= dt;
    if (timeLeft <= 0) { endGame(); return; }
    // Countdown prompts
    var sec = Math.ceil(timeLeft);
    if (COUNTDOWN_PROMPTS[sec] && !window['_prompted' + sec]) {
      window['_prompted' + sec] = true;
      toast(COUNTDOWN_PROMPTS[sec], 2000);
    }
    updateHUD();

    // Floating commentary
    floatTimer += dt;
    if (floatTimer > 5 + Math.random() * 5) {
      floatTimer = 0;
      toast(FLOAT_TEXTS[Math.floor(Math.random() * FLOAT_TEXTS.length)], 2500);
    }

    // Spawn
    spawnTimer += dt;
    const maxTargets = 22;
    // Force Big if none on screen
    const bigCount = targets.filter(t => t.type === 'big' && !t.locked).length;
    if (bigCount < 2) spawnTarget('big');
    if (targets.length < maxTargets && spawnTimer > 0.55) {
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
            if (Math.random() < 0.5) toast(BIG_LOCK_TEXTS[Math.floor(Math.random() * BIG_LOCK_TEXTS.length)], 1500);
          } else {
            score = Math.max(0, score - 50);
            cameraHits++; combo = 0;
            SoundEngine.playWahWah();
            toast(CAM_LOCK_TEXTS[Math.floor(Math.random() * CAM_LOCK_TEXTS.length)], 2000);
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
  // Story dialog
  if (storyStart) storyStart.addEventListener('click', () => {
    if (storyDialog) storyDialog.classList.add('hidden');
    SoundEngine._ensure();
  });
  if (storyDialog) storyDialog.addEventListener('click', e => {
    if (e.target === storyDialog) { storyDialog.classList.add('hidden'); SoundEngine._ensure(); }
  });

  updateHUD();
  gameLoop._lastTs = performance.now();
  animId = requestAnimationFrame(gameLoop);
})();
