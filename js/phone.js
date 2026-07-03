/* ============================================
   Century Birthday - Phone Screen Protector JS
   3 mini-games: Align → Peel → Bubbles
   ============================================ */

(function() {
  const { BGM, STORE, SoundEngine } = window.CenturyApp;

  const canvas = document.getElementById('phone-canvas');
  const ctx = canvas.getContext('2d');
  const hudLevel = document.getElementById('hud-level');
  const hudScore = document.getElementById('hud-score');
  const resultsEl = document.getElementById('results');
  const storyDialog = document.getElementById('story-dialog');
  const storyStart = document.getElementById('story-start');

  // State
  const State = { IDLE: 'idle', ALIGN: 'align', BUBBLES: 'bubbles', DONE: 'done' };
  let state = State.IDLE;
  let totalScore = 0;
  let alignScore = 0, bubbleScore = 0;
  let width, height;
  let animId;

  // ===== Canvas =====
  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
  }
  resize();
  window.addEventListener('resize', resize);

  // ================================================================
  // LEVEL 1: FREE-FALL ALIGNMENT
  // ================================================================
  const align = {
    phoneX: 0, phoneY: 0, phoneW: 160, phoneH: 310,
    filmX: 0, filmY: 0, filmW: 0, filmH: 0,
    filmSpeed: 0,       // horizontal speed
    filmDir: 1,         // 1=right, -1=left
    dropping: false,
    dropVy: 0,
    landed: false,
    landTimer: 0,

    init() {
      this.phoneW = Math.min(180, width * 0.55);
      this.phoneH = 12; // phone is flat, viewed from side = thin bar
      this.phoneX = width / 2;
      this.phoneY = height * 0.78; // phone sits on table

      this.filmW = this.phoneW + 6;
      this.filmH = 10;

      // Film high above
      this.filmY = height * 0.15;
      this.filmX = this.phoneX + (Math.random() - 0.5) * this.phoneW * 1.0;
      this.filmSpeed = 200 + Math.random() * 120;
      this.filmDir = Math.random() > 0.5 ? 1 : -1;
      this.dropping = false;
      this.dropVy = 0;
      this.landed = false;
      this.landTimer = 0;
    },

    update(dt) {
      if (this.dropping) {
        this.dropVy += 800 * dt;
        this.filmY += this.dropVy * dt;
        const landY = this.phoneY - 6; // film sits ON phone
        if (this.filmY >= landY) {
          this.filmY = landY;
          this.dropping = false;
          this.landed = true;
          this.landTimer = 0;
          SoundEngine.playSnap();
        }
      } else if (!this.landed) {
        this.filmX += this.filmSpeed * this.filmDir * dt;
        const range = this.phoneW * 0.6;
        if (this.filmX > this.phoneX + range) { this.filmX = this.phoneX + range; this.filmDir = -1; }
        if (this.filmX < this.phoneX - range) { this.filmX = this.phoneX - range; this.filmDir = 1; }
      }
      if (this.landed) this.landTimer += dt;
    },

    draw(ctx, time) {
      const px = this.phoneX, py = this.phoneY;
      const pw = this.phoneW;

      // === Table ===
      const tableY = py + 8;
      ctx.fillStyle = '#3a2a1a';
      ctx.fillRect(0, tableY, width, height - tableY);
      // Table edge highlight
      ctx.strokeStyle = '#5a4a3a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, tableY);
      ctx.lineTo(width, tableY);
      ctx.stroke();
      // Table surface top
      const tableGrad = ctx.createLinearGradient(0, tableY, 0, tableY + 20);
      tableGrad.addColorStop(0, '#5a4530');
      tableGrad.addColorStop(1, '#3a2a1a');
      ctx.fillStyle = tableGrad;
      ctx.fillRect(0, tableY, width, 20);

      // === Phone (flat on table, seen from side/low angle) ===
      // Phone body - thin rectangle on table
      const phoneBodyH = 14;
      const phoneTopY = py - phoneBodyH;
      ctx.fillStyle = '#1c1c2e';
      ctx.strokeStyle = '#555';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(px - pw/2, phoneTopY, pw, phoneBodyH, 4);
      ctx.fill();
      ctx.stroke();

      // Screen (top surface, slightly lighter)
      ctx.fillStyle = '#0a0a1e';
      ctx.fillRect(px - pw/2 + 6, phoneTopY + 3, pw - 12, 5);

      // Home button indicator on the side edge
      ctx.fillStyle = '#333';
      ctx.beginPath();
      ctx.arc(px, phoneTopY + phoneBodyH/2, 3, 0, Math.PI*2);
      ctx.fill();

      // === Film (thin bar above, oscillating) ===
      const fx = this.filmX, fy = this.filmY;
      const fw = this.filmW, fh = this.filmH;

      ctx.fillStyle = 'rgba(126,184,218,0.7)';
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.lineWidth = 2;
      ctx.setLineDash([3, 2]);
      ctx.beginPath();
      ctx.roundRect(fx - fw/2, fy - fh/2, fw, fh, 4);
      ctx.fill();
      ctx.stroke();
      ctx.setLineDash([]);

      // Drop line hint
      if (!this.dropping && !this.landed) {
        ctx.strokeStyle = 'rgba(255,255,255,0.08)';
        ctx.setLineDash([2, 8]);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(fx, fy + fh/2);
        ctx.lineTo(fx, phoneTopY);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Hint / result
      if (this.landed) {
        const offset = Math.abs(this.filmX - this.phoneX);
        let r = '', rc = '#db5a5a';
        if (offset < 5) { r = '完美对齐！✨'; rc = '#f0d78c'; }
        else if (offset < 15) { r = '还不错！👍'; rc = '#7eb8da'; }
        else if (offset < 35) { r = '有点歪...😅'; rc = '#b39dda'; }
        else { r = '偏太多了！💦'; rc = '#db5a5a'; }
        ctx.fillStyle = rc;
        ctx.font = 'bold 1.3rem "Microsoft YaHei", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(r, width/2, tableY + 50);
      } else if (!this.dropping) {
        const pulse = 0.5 + Math.sin(time * 0.004) * 0.3;
        ctx.fillStyle = `rgba(240,215,140,${pulse})`;
        ctx.font = '1rem "Microsoft YaHei", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('看准时机，点击放下贴膜！', width/2, height * 0.32);
      }
    },

    drop() {
      if (this.dropping || this.landed) return;
      this.dropping = true;
      this.dropVy = 0;
    },

    getScore() {
      const offset = Math.abs(this.filmX - this.phoneX);
      if (offset < 5) return 100;
      if (offset < 15) return 75;
      if (offset < 35) return 45;
      return 15;
    },
  };

  // ================================================================
  // LEVEL 2: BUBBLES
  // ================================================================
  const bubbles = {
    list: [],
    screenX: 0, screenY: 0, screenW: 0, screenH: 0,
    dragging: false,
    totalGenerated: 5,
    cleared: 0,
    startTime: 0,

    init() {
      this.list = [];
      this.cleared = 0;
      this.startTime = Date.now();
      this.dragging = false;

      const pw = Math.min(160, width * 0.42);
      const ph = pw * 1.94;
      this.screenX = width/2 - pw/2 + 10;
      this.screenY = height * 0.45 - ph/2 + 16;
      this.screenW = pw - 20;
      this.screenH = ph - 48;

      for (let i = 0; i < this.totalGenerated; i++) {
        this.list.push({
          x: this.screenX + 30 + Math.random() * (this.screenW - 60),
          y: this.screenY + 30 + Math.random() * (this.screenH - 60),
          r: 8 + Math.random() * 12,
          alive: true,
          vx: 0, vy: 0,
        });
      }
    },

    update(dt) {
      for (const b of this.list) {
        if (!b.alive) continue;
        // Move toward edge
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        b.vx *= 0.92;
        b.vy *= 0.92;

        // Check if off screen area
        if (b.x < this.screenX - 30 || b.x > this.screenX + this.screenW + 30 ||
            b.y < this.screenY - 30 || b.y > this.screenY + this.screenH + 30) {
          b.alive = false;
          this.cleared++;
          SoundEngine.playSnap();
        }
      }
    },

    draw(ctx) {
      const sx = this.screenX, sy = this.screenY, sw = this.screenW, sh = this.screenH;

      // Phone outline (simplified)
      ctx.fillStyle = '#1c1c2e';
      const pr = 14;
      const pw = sw + 20, ph = sh + 48;
      const px = sx - 10, py = sy - 16;
      ctx.beginPath();
      ctx.moveTo(px + pr, py); ctx.lineTo(px + pw - pr, py);
      ctx.arcTo(px + pw, py, px + pw, py + pr, pr);
      ctx.lineTo(px + pw, py + ph - pr);
      ctx.arcTo(px + pw, py + ph, px + pw - pr, py + ph, pr);
      ctx.lineTo(px + pr, py + ph);
      ctx.arcTo(px, py + ph, px, py + ph - pr, pr);
      ctx.lineTo(px, py + pr);
      ctx.arcTo(px, py, px + pr, py, pr);
      ctx.closePath();
      ctx.fill();

      // Screen
      ctx.fillStyle = '#0a0a1e';
      ctx.fillRect(sx, sy, sw, sh);

      // Bubbles
      for (const b of this.list) {
        if (!b.alive) continue;
        ctx.fillStyle = 'rgba(180,200,230,0.35)';
        ctx.strokeStyle = 'rgba(200,220,255,0.5)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // Shine
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.beginPath();
        ctx.arc(b.x - b.r*0.25, b.y - b.r*0.25, b.r*0.25, 0, Math.PI*2);
        ctx.fill();
      }

      // Timer display
      const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(1);
      const remaining = this.list.filter(b => b.alive).length;
      ctx.textAlign = 'center';
      ctx.font = 'italic 1rem "Cormorant Garamond", serif';
      ctx.fillStyle = '#c8b8a0';
      ctx.fillText('在屏幕上滑动，把气泡推向边缘', width/2, sy - 38);
      ctx.fillText(`剩余气泡: ${remaining}  ·  用时: ${elapsed}s`, width/2, sy - 20);
    },

    onPointerMove(ex, ey) {
      for (const b of this.list) {
        if (!b.alive) continue;
        const dx = ex - b.x, dy = ey - b.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < b.r + 25) {
          // Push bubble away from finger (higher resistance)
          const nx = dx / dist, ny = dy / dist;
          b.vx += nx * 35;
          b.vy += ny * 35;
        }
      }
    },

    getScore() {
      const elapsed = (Date.now() - this.startTime) / 1000;
      const ratio = this.cleared / this.totalGenerated;
      if (ratio < 1) return Math.round(ratio * 50);
      if (elapsed < 7) return 100;
      if (elapsed < 14) return 80;
      if (elapsed < 22) return 55;
      return 35;
    },
  };

  // ================================================================
  // Level Management
  // ================================================================
  function startLevel(levelName) {
    state = levelName;
    hudLevel.textContent = {
      align: '① 对齐贴膜', bubbles: '② 排除气泡'
    }[levelName] || '';

    if (levelName === State.ALIGN) align.init();
    else if (levelName === State.BUBBLES) bubbles.init();
  }

  function finishLevel(score) {
    totalScore += score;

    if (state === State.ALIGN) { alignScore = score; startLevel(State.BUBBLES); }
    else if (state === State.BUBBLES) { bubbleScore = score; finishGame(); }

    hudScore.textContent = totalScore + ' 分';
  }

  function finishGame() {
    state = State.DONE;
    showResults();
  }

  function showResults() {
    if (!resultsEl) return;
    resultsEl.classList.remove('hidden');

    const maxScore = 200;
    const pct = totalScore / maxScore;
    let grade, title;
    if (pct >= 0.9) { grade = 'S'; title = '完美无痕 · 贴膜仙人 ✨'; }
    else if (pct >= 0.75) { grade = 'A'; title = '略有瑕疵 · 贴膜达人 👍'; }
    else if (pct >= 0.55) { grade = 'B'; title = '马马虎虎 · 勉强能看 🤔'; }
    else if (pct >= 0.35) { grade = 'C'; title = '满屏气泡 · 手残党认证 💦'; }
    else { grade = 'D'; title = '手机：我到底做错了什么 😭'; }

    document.getElementById('results-grade').textContent = grade;
    document.getElementById('results-title-text').textContent = title;
    document.getElementById('res-align').textContent = alignScore + ' 分';
    document.getElementById('res-bubble').textContent = bubbleScore + ' 分';
    document.getElementById('res-total').textContent = totalScore + ' 分';

    STORE.setBool('phone_complete', true);
    STORE.set('phone_score', totalScore.toString());
    const plays = (STORE.getInt('phone_plays') || 0) + 1;
    STORE.set('phone_plays', plays.toString());
    const bestTime = STORE.getInt('phone_best_time');
    if (!bestTime || elapsed < bestTime) STORE.set('phone_best_time', elapsed.toString());
    SoundEngine.playChime();
  }

  // ================================================================
  // Input
  // ================================================================
  // Click/tap: drop film or interact with bubbles
  canvas.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    if (state === State.ALIGN) { align.drop(); return; }
    if (state === State.BUBBLES) { /* handled in move */ }
  });

  canvas.addEventListener('pointermove', (e) => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const ex = e.clientX - rect.left, ey = e.clientY - rect.top;
    if (state === State.BUBBLES) bubbles.onPointerMove(ex, ey);
  });

  // Keyboard
  document.addEventListener('keydown', (e) => {
    if (e.key === ' ' && state === State.ALIGN) { e.preventDefault(); align.drop(); }
    if (e.key === ' ' && state === State.DONE) { location.reload(); e.preventDefault(); }
  });

  // Auto-advance after landing
  // Handled in game loop

  // ================================================================
  // Game Loop
  // ================================================================
  const confirmBtn = { x: 0, y: 0, w: 0, h: 0, visible: false };

  function gameLoop(timestamp) {
    animId = requestAnimationFrame(gameLoop);
    const dt = Math.min(0.05, (timestamp - (gameLoop._lastTs || timestamp)) / 1000);
    gameLoop._lastTs = timestamp;

    ctx.clearRect(0, 0, width, height);
    const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
    bgGrad.addColorStop(0, '#1a1640'); bgGrad.addColorStop(1, '#0f0d28');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    switch (state) {
      case State.IDLE: break;
      case State.ALIGN:
        align.update(dt);
        align.draw(ctx, timestamp);
        if (align.landed && align.landTimer > 1.8) {
          finishLevel(align.getScore());
        }
        break;
      case State.BUBBLES:
        bubbles.update(dt);
        bubbles.draw(ctx);
        if (bubbles.list.every(b => !b.alive)) finishLevel(bubbles.getScore());
        break;
      case State.DONE: break;
    }
  }

  // Random Apple model for intro
  const APPLE_MODELS = [
    'iPhone 15 Pro Max 原色钛金属',
    'iPhone 14 Pro 深紫色',
    'iPhone 13 mini 星光色',
    'iPhone SE (第三代) 午夜色',
    'iPhone 12 Pro 海蓝色',
    'iPhone 11 Pro 暗夜绿色',
    'iPhone XS Max 金色',
    'iPhone 8 Plus (PRODUCT)RED 特别版',
    'iPhone 7 亮黑色',
    'iPhone 5s 香槟金',
  ];
  const introEl = document.getElementById('phone-intro');
  if (introEl) {
    const model = APPLE_MODELS[Math.floor(Math.random() * APPLE_MODELS.length)];
    introEl.innerHTML = '修好了一个 ' + model + '，<br>可以贴膜了！';
  }

  // Story
  if (storyStart) {
    storyStart.addEventListener('click', () => {
      if (storyDialog) storyDialog.classList.add('hidden');
      SoundEngine._ensure();
      startLevel(State.ALIGN);
    });
  }
  if (storyDialog) {
    storyDialog.addEventListener('click', (e) => {
      if (e.target === storyDialog) {
        storyDialog.classList.add('hidden');
        SoundEngine._ensure();
        startLevel(State.ALIGN);
      }
    });
  }

  gameLoop._lastTs = performance.now();
  animId = requestAnimationFrame(gameLoop);

})();
