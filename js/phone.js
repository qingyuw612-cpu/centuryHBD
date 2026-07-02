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
  const levelPopup = document.getElementById('level-popup');
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
  // LEVEL 1: ALIGNMENT
  // ================================================================
  const align = {
    phoneX: 0, phoneY: 0, phoneW: 160, phoneH: 310,
    filmX: 0, filmY: 0, filmW: 164, filmH: 314, filmRot: 0,
    drag: false, dragOX: 0, dragOY: 0,
    initOffsetX: 0, initOffsetY: 0, initRot: 0,
    rotateSpeed: 0,

    init() {
      this.phoneX = width / 2;
      this.phoneY = height * 0.45;
      this.phoneW = Math.min(160, width * 0.42);
      this.phoneH = this.phoneW * 1.94;

      this.filmW = this.phoneW + 6;
      this.filmH = this.phoneH + 6;

      // Random offset
      this.initOffsetX = (Math.random() - 0.5) * 60;
      this.initOffsetY = (Math.random() - 0.5) * 50;
      this.initRot = (Math.random() - 0.5) * 0.3; // radians
      this.rotateSpeed = 0;

      this.filmX = this.phoneX + this.initOffsetX;
      this.filmY = this.phoneY + this.initOffsetY;
      this.filmRot = this.initRot;
      this.drag = false;
    },

    update(dt) {
      // no gravity
    },

    draw(ctx, time) {
      const px = this.phoneX, py = this.phoneY;
      const pw = this.phoneW, ph = this.phoneH;

      // Phone body
      ctx.fillStyle = '#1c1c2e';
      ctx.strokeStyle = '#555';
      ctx.lineWidth = 2;
      const pr = 14;
      ctx.beginPath();
      ctx.moveTo(px - pw/2 + pr, py - ph/2);
      ctx.lineTo(px + pw/2 - pr, py - ph/2);
      ctx.arcTo(px + pw/2, py - ph/2, px + pw/2, py - ph/2 + pr, pr);
      ctx.lineTo(px + pw/2, py + ph/2 - pr);
      ctx.arcTo(px + pw/2, py + ph/2, px + pw/2 - pr, py + ph/2, pr);
      ctx.lineTo(px - pw/2 + pr, py + ph/2);
      ctx.arcTo(px - pw/2, py + ph/2, px - pw/2, py + ph/2 - pr, pr);
      ctx.lineTo(px - pw/2, py - ph/2 + pr);
      ctx.arcTo(px - pw/2, py - ph/2, px - pw/2 + pr, py - ph/2, pr);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Screen area
      ctx.fillStyle = '#0a0a1e';
      ctx.fillRect(px - pw/2 + 10, py - ph/2 + 16, pw - 20, ph - 48);
      // Camera dot
      ctx.fillStyle = '#333';
      ctx.beginPath(); ctx.arc(px, py - ph/2 + 8, 4, 0, Math.PI*2); ctx.fill();
      // Home indicator
      ctx.strokeStyle = '#444';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(px, py + ph/2 - 20, 14, 0, Math.PI); ctx.stroke();

      // === Film (draggable, semi-transparent) ===
      ctx.save();
      ctx.translate(this.filmX, this.filmY);
      ctx.rotate(this.filmRot);
      ctx.globalAlpha = 0.6;
      ctx.fillStyle = '#7eb8da';
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      const fr = 16;
      const fw = this.filmW, fh = this.filmH;
      ctx.beginPath();
      ctx.moveTo(-fw/2 + fr, -fh/2);
      ctx.lineTo(fw/2 - fr, -fh/2);
      ctx.arcTo(fw/2, -fh/2, fw/2, -fh/2 + fr, fr);
      ctx.lineTo(fw/2, fh/2 - fr);
      ctx.arcTo(fw/2, fh/2, fw/2 - fr, fh/2, fr);
      ctx.lineTo(-fw/2 + fr, fh/2);
      ctx.arcTo(-fw/2, fh/2, -fw/2, fh/2 - fr, fr);
      ctx.lineTo(-fw/2, -fh/2 + fr);
      ctx.arcTo(-fw/2, -fh/2, -fw/2 + fr, -fh/2, fr);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;

      // Corner markers
      const cm = 12;
      ctx.fillStyle = '#f0d78c';
      [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([sx,sy]) => {
        ctx.fillRect(sx*fw/2 - cm/2, sy*fh/2 - cm/2, cm, cm);
      });

      ctx.restore();

      // Hint
      const pulse = 0.5 + Math.sin(time * 0.003) * 0.3;
      ctx.fillStyle = `rgba(240,215,140,${pulse})`;
      ctx.font = '0.9rem "Microsoft YaHei", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('拖拽移动 · 滚轮或 Q/E 旋转', width/2, py + ph/2 + 50);
    },

    onPointerDown(ex, ey) {
      this.drag = true;
      this.dragOX = ex - this.filmX;
      this.dragOY = ey - this.filmY;
    },
    onPointerMove(ex, ey) {
      if (!this.drag) return;
      this.filmX = ex - this.dragOX;
      this.filmY = ey - this.dragOY;
    },
    onPointerUp() {
      this.drag = false;
    },

    // Check alignment: 4 corners distance
    checkAlignment() {
      const pw = this.phoneW, ph = this.phoneH;
      const phoneCorners = [
        { x: this.phoneX - pw/2, y: this.phoneY - ph/2 },
        { x: this.phoneX + pw/2, y: this.phoneY - ph/2 },
        { x: this.phoneX - pw/2, y: this.phoneY + ph/2 },
        { x: this.phoneX + pw/2, y: this.phoneY + ph/2 },
      ];

      const fw = this.filmW, fh = this.filmH;
      const cos = Math.cos(this.filmRot), sin = Math.sin(this.filmRot);
      const filmLocal = [
        { x: -fw/2, y: -fh/2 }, { x: fw/2, y: -fh/2 },
        { x: -fw/2, y: fh/2 }, { x: fw/2, y: fh/2 },
      ];
      const filmCorners = filmLocal.map(c => ({
        x: this.filmX + c.x * cos - c.y * sin,
        y: this.filmY + c.x * sin + c.y * cos,
      }));

      let maxDist = 0;
      for (let i = 0; i < 4; i++) {
        const dx = phoneCorners[i].x - filmCorners[i].x;
        const dy = phoneCorners[i].y - filmCorners[i].y;
        maxDist = Math.max(maxDist, Math.sqrt(dx*dx + dy*dy));
      }

      if (maxDist < 10) return 100; // Perfect
      if (maxDist < 25) return 70;
      if (maxDist < 45) return 40;
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
        if (b.x < this.screenX - 10 || b.x > this.screenX + this.screenW + 10 ||
            b.y < this.screenY - 10 || b.y > this.screenY + this.screenH + 10) {
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

      // Instruction
      ctx.fillStyle = '#e8e0f0';
      ctx.font = '0.9rem "Microsoft YaHei", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('在屏幕上滑动，把气泡推向边缘', width/2, sy + sh + 36);
      ctx.fillText(`剩余气泡: ${this.list.filter(b => b.alive).length}`, width/2, sy + sh + 58);
    },

    onPointerMove(ex, ey) {
      for (const b of this.list) {
        if (!b.alive) continue;
        const dx = ex - b.x, dy = ey - b.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < b.r + 25) {
          // Push bubble away from finger (higher resistance)
          const nx = dx / dist, ny = dy / dist;
          b.vx += nx * 60;
          b.vy += ny * 60;
        }
      }
    },

    getScore() {
      const elapsed = (Date.now() - this.startTime) / 1000;
      const ratio = this.cleared / this.totalGenerated;
      if (ratio >= 1 && elapsed < 8) return 100;
      if (ratio >= 1) return 85;
      return Math.round(ratio * 70);
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

    const titles = {
      align: '① 对齐贴膜\n拖拽+旋转对齐手机边框',
      bubbles: '② 排除气泡\n滑动推开所有气泡',
    };
    if (levelPopup) {
      levelPopup.innerHTML = titles[levelName].replace(/\n/g, '<br>');
      levelPopup.classList.remove('hidden');
      setTimeout(() => levelPopup.classList.add('hidden'), 2000);
    }

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
    document.getElementById('res-peel').textContent = '--';
    document.getElementById('res-bubble').textContent = bubbleScore + ' 分';
    document.getElementById('res-total').textContent = totalScore + ' 分';

    STORE.setBool('phone_complete', true);
    STORE.set('phone_score', totalScore.toString());
    SoundEngine.playChime();
  }

  // ================================================================
  // Input
  // ================================================================
  canvas.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const ex = e.clientX - rect.left, ey = e.clientY - rect.top;

    // Check confirm button
    if (state === State.ALIGN && confirmBtn.visible &&
        ex >= confirmBtn.x && ex <= confirmBtn.x + confirmBtn.w &&
        ey >= confirmBtn.y && ey <= confirmBtn.y + confirmBtn.h) {
      finishLevel(align.checkAlignment());
      return;
    }

    if (state === State.ALIGN) align.onPointerDown(ex, ey);
  });

  canvas.addEventListener('pointermove', (e) => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const ex = e.clientX - rect.left, ey = e.clientY - rect.top;

    if (state === State.ALIGN) align.onPointerMove(ex, ey);
    else if (state === State.BUBBLES) bubbles.onPointerMove(ex, ey);
  });

  canvas.addEventListener('pointerup', (e) => {
    e.preventDefault();
    if (state === State.ALIGN) align.onPointerUp();
  });

  // Rotate: mouse wheel or two-finger
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    if (state === State.ALIGN) {
      align.filmRot += e.deltaY > 0 ? 0.03 : -0.03;
    }
  });

  // Keyboard: rotate with Q/E, confirm with Space
  document.addEventListener('keydown', (e) => {
    if (state === State.ALIGN) {
      if (e.key === 'q') align.filmRot -= 0.05;
      if (e.key === 'e') align.filmRot += 0.05;
      if (e.key === ' ') { e.preventDefault(); finishLevel(align.checkAlignment()); }
    }
    if (e.key === ' ' && state === State.DONE) { location.reload(); e.preventDefault(); }
  });

  // Confirm button for align (double-tap or button)
  // We'll add a confirm button drawn on canvas for level 1

  // ================================================================
  // Game Loop
  // ================================================================
  let confirmBtn = { x: 0, y: 0, w: 140, h: 44, visible: false };

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
        // Confirm button
        confirmBtn.x = width/2 - 70;
        confirmBtn.y = height * 0.82;
        confirmBtn.w = 140; confirmBtn.h = 44;
        confirmBtn.visible = true;
        ctx.fillStyle = 'rgba(212,168,83,0.85)';
        const br = 10;
        const bx = confirmBtn.x, by = confirmBtn.y, bw = confirmBtn.w, bh = confirmBtn.h;
        ctx.beginPath();
        ctx.moveTo(bx + br, by); ctx.lineTo(bx + bw - br, by);
        ctx.arcTo(bx + bw, by, bx + bw, by + br, br);
        ctx.lineTo(bx + bw, by + bh - br);
        ctx.arcTo(bx + bw, by + bh, bx + bw - br, by + bh, br);
        ctx.lineTo(bx + br, by + bh);
        ctx.arcTo(bx, by + bh, bx, by + bh - br, br);
        ctx.lineTo(bx, by + br);
        ctx.arcTo(bx, by, bx + br, by, br);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#1a1a2e';
        ctx.font = 'bold 1rem "Cinzel", serif';
        ctx.textAlign = 'center';
        ctx.fillText('确认对齐 ✔', width/2, by + bh/2 + 5);
        break;
      case State.BUBBLES:
        bubbles.update(dt);
        bubbles.draw(ctx);
        if (bubbles.list.every(b => !b.alive)) finishLevel(bubbles.getScore());
        break;
      case State.DONE: break;
    }
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
