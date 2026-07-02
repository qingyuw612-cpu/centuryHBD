/* ============================================
   Century Birthday - Haircut Game JS
   Scissors oscillate, player stops to cut
   ============================================ */

(function() {
  const { BGM, STORE, SoundEngine } = window.CenturyApp;

  // ===========================================
  // DOM
  // ===========================================
  const canvas = document.getElementById('haircut-canvas');
  const ctx = canvas.getContext('2d');
  const hudRound = document.getElementById('hud-round');
  const hudScore = document.getElementById('hud-score');
  const targetHint = document.getElementById('target-hint');
  const speechBubble = document.getElementById('speech-bubble');
  const cutBtn = document.getElementById('cut-btn');
  const roundPopup = document.getElementById('round-popup');
  const roundPopupText = document.getElementById('round-popup-text');
  const resultsEl = document.getElementById('results');
  const storyDialog = document.getElementById('story-dialog');
  const storyStart = document.getElementById('story-start');

  // ===========================================
  // Constants
  // ===========================================
  const TOTAL_ROUNDS = 4;
  const ROUND_CONFIG = [
    { speed: 120, targetWidth: 50, label: '第一轮' },   // px/s scissors speed
    { speed: 180, targetWidth: 35, label: '第二轮' },
    { speed: 260, targetWidth: 22, label: '第三轮' },
    { speed: 350, targetWidth: 14, label: '最后一轮' },
  ];

  const PERFECT_RANGE = 10;
  const GOOD_RANGE = 25;
  const OK_RANGE = 45;

  const INSULTS = [
    '会不会剪啊！',
    '我明天还要见人！',
    '你把我当草坪修剪呢？',
    '这发型……很有个性',
    '我要退钱！',
    '你是故意找茬是吧？',
    '我邻居家的狗剪得都比你好！',
    '请问你是盲人理发师吗？',
    '你这是在给我剃度吗？！',
  ];

  // ===========================================
  // State
  // ===========================================
  const State = { IDLE: 'idle', PLAYING: 'playing', RESULT: 'result', ENDED: 'ended' };
  let state = State.IDLE;

  let currentRound = 0;
  let totalScore = 0;
  let perfects = 0;
  let insultCount = 0;

  // Hair & scissors
  let hairHeight = 0;         // current hair top (y position, smaller = taller hair)
  const HAIR_MAX = 0;         // top of head reference
  let hairBaseY = 0;          // scalp y position
  let hairCurrentTop = 0;     // current visible hair top
  let targetY = 0;            // target line y
  let targetHalfW = 25;       // half width of target zone

  // Scissors animation
  let scissorY = 0;           // current scissors y
  let scissorDir = 1;         // 1=down, -1=up
  let scissorSpeed = 120;
  let scissorMinY = 0;
  let scissorMaxY = 0;
  let scissorStopped = false;

  // Cut animation
  let cutEffectTimer = 0;
  let fallenParticles = [];

  // Timing
  let animId = null;

  let width, height;
  let charX, charHeadY, charScalpY;

  // Round transition
  let stateTimer = 0;

  // ===========================================
  // Canvas Setup
  // ===========================================
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

  function updateLayout() {
    charX = width / 2;
    charHeadY = height * 0.72;
    charScalpY = charHeadY - 35;
    hairBaseY = charScalpY;

    // Scissors range: from just above head to the full hair height
    scissorMinY = charScalpY - height * 0.48;  // top of hair range
    scissorMaxY = charScalpY + 15;             // just below scalp

    // Target in upper-middle of hair
    targetY = charScalpY - height * 0.22;

    // Initial hair is long
    if (state === State.IDLE) {
      hairHeight = charScalpY - scissorMinY; // full length
      hairCurrentTop = scissorMinY;
      scissorY = (scissorMinY + scissorMaxY) / 2;
    }
  }

  resize();
  updateLayout();
  window.addEventListener('resize', () => { resize(); updateLayout(); });

  // ===========================================
  // Round Management
  // ===========================================
  function startRound() {
    if (currentRound >= TOTAL_ROUNDS) { endGame(); return; }

    const cfg = ROUND_CONFIG[currentRound];
    scissorSpeed = cfg.speed;
    targetHalfW = cfg.targetWidth / 2;
    scissorStopped = false;
    cutEffectTimer = 0;
    fallenParticles = [];
    state = State.PLAYING;

    hudRound.textContent = `第 ${currentRound + 1} / ${TOTAL_ROUNDS} 轮`;
    cutBtn.classList.remove('disabled');
    targetHint.classList.add('show');
    if (roundPopup) roundPopup.classList.add('hidden');
    if (speechBubble) speechBubble.classList.add('hidden');

    // Vary target position slightly each round
    const jitter = (Math.random() - 0.5) * height * 0.06;
    targetY = charScalpY - height * 0.22 + jitter;

    // Clamp target within hair range
    targetY = Math.max(scissorMinY + 40, Math.min(charScalpY - 15, targetY));
  }

  function doCut() {
    if (state !== State.PLAYING || scissorStopped) return;

    scissorStopped = true;
    state = State.RESULT;
    cutBtn.classList.add('disabled');
    targetHint.classList.remove('show');

    // Hair above scissors gets cut
    const cutY = scissorY;
    hairCurrentTop = Math.max(scissorMinY, cutY);

    // Score based on distance from target
    const distFromTarget = cutY - targetY;
    const absDist = Math.abs(distFromTarget);
    let judgment, points;
    const tooShort = cutY < targetY - targetHalfW - OK_RANGE; // cut way below target

    if (absDist <= PERFECT_RANGE) {
      judgment = 'perfect'; points = 100; perfects++;
      SoundEngine.playSnip();
    } else if (absDist <= GOOD_RANGE) {
      judgment = 'good'; points = 60;
      SoundEngine.playSnip();
    } else if (absDist <= targetHalfW + OK_RANGE) {
      judgment = 'ok'; points = 30;
      SoundEngine.playSnip();
    } else {
      judgment = 'bad'; points = 5;
      insultCount++;
      SoundEngine.playWahWah();
    }

    totalScore += points;
    hudScore.textContent = totalScore + ' 分';

    // Spawn hair chunk particles
    const hairLeft = charX - 52, hairRight = charX + 52;
    for (let i = 0; i < 50; i++) {
      fallenParticles.push({
        x: hairLeft + Math.random() * (hairRight - hairLeft),
        y: cutY - 5 + Math.random() * 15,
        vx: (Math.random() - 0.5) * 6,
        vy: -1 - Math.random() * 3,  // initial upward bounce
        life: 0.7 + Math.random() * 1.0,
        size: 3 + Math.random() * 8,
        rot: Math.random() * Math.PI * 2,
        rotSpd: (Math.random() - 0.5) * 0.1,
      });
    }
    cutEffectTimer = 0.7;

    // Show result
    showRoundResult(judgment, points);

    // Show insult if too short
    if (tooShort || judgment === 'bad') {
      showInsult();
    }

    // Auto-advance
    setTimeout(() => {
      if (state === State.ENDED) return;
      if (roundPopup) roundPopup.classList.add('hidden');
      if (speechBubble) speechBubble.classList.add('hidden');
      currentRound++;
      startRound();
    }, 2000);
  }

  function showRoundResult(judgment, points) {
    const colors = { perfect: '#f0d78c', good: '#7eb8da', ok: '#b39dda', bad: '#db5a5a' };
    const texts = { perfect: 'Perfect! ✨ +100', good: '不错 👍 +60', ok: '还行 +30', bad: '糟糕 💢 +5' };
    if (roundPopup && roundPopupText) {
      roundPopupText.textContent = texts[judgment];
      roundPopupText.style.color = colors[judgment];
      roundPopup.classList.remove('hidden');
    }
  }

  function showInsult() {
    if (!speechBubble) return;
    const insult = INSULTS[Math.floor(Math.random() * INSULTS.length)];
    speechBubble.textContent = insult;
    speechBubble.classList.remove('hidden');
    clearTimeout(speechBubble._timeout);
    speechBubble._timeout = setTimeout(() => speechBubble.classList.add('hidden'), 1800);
  }

  // ===========================================
  // End Game
  // ===========================================
  function endGame() {
    state = State.ENDED;
    cutBtn.classList.add('disabled');
    showResults();
  }

  function showResults() {
    if (!resultsEl) return;
    resultsEl.classList.remove('hidden');

    const maxScore = TOTAL_ROUNDS * 100;
    const pct = maxScore > 0 ? totalScore / maxScore : 0;

    let grade, comment;
    if (pct >= 0.9 && insultCount === 0) {
      grade = 'S'; comment = 'Tony老师看了都想拜你为师！';
    } else if (pct >= 0.8) {
      grade = 'A'; comment = '顾客表示：下次还找你。';
    } else if (pct >= 0.65) {
      grade = 'B'; comment = '还行，起码没被当场开除。';
    } else if (pct >= 0.45) {
      grade = 'C'; comment = '店长：你明天不用来了……开玩笑的。';
    } else if (pct >= 0.25) {
      grade = 'D'; comment = '顾客已经去隔壁理发店了。';
    } else {
      grade = 'F'; comment = '你确定你拿的是剪刀不是除草机？';
    }

    if (insultCount >= 3) comment += ' 顾客骂了你 ' + insultCount + ' 次。';

    document.getElementById('results-grade').textContent = grade;
    document.getElementById('results-comment').textContent = comment;
    document.getElementById('res-score').textContent = totalScore;
    document.getElementById('res-perfect').textContent = perfects;
    document.getElementById('res-insults').textContent = insultCount;

    STORE.setBool('haircut_complete', true);
    STORE.set('haircut_score', totalScore.toString());
    STORE.set('haircut_rounds', currentRound.toString());
    SoundEngine.playChime();
  }

  // ===========================================
  // Input
  // ===========================================
  if (cutBtn) {
    cutBtn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      if (state === State.PLAYING) doCut();
      else if (state === State.ENDED) { /* restart handled by reload button */ }
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      if (state === State.PLAYING) doCut();
    }
  });

  // Story dialog
  if (storyStart) {
    storyStart.addEventListener('click', () => {
      if (storyDialog) storyDialog.classList.add('hidden');
      SoundEngine._ensure();
      startRound();
    });
  }
  if (storyDialog) {
    storyDialog.addEventListener('click', (e) => {
      if (e.target === storyDialog) {
        storyDialog.classList.add('hidden');
        SoundEngine._ensure();
        startRound();
      }
    });
  }

  // ===========================================
  // Drawing
  // ===========================================
  function drawCharacter(ctx) {
    const cx = charX, cy = charHeadY;

    // Body
    ctx.fillStyle = '#1c1a28';
    ctx.beginPath();
    ctx.moveTo(cx - 50, cy + 20);
    ctx.quadraticCurveTo(cx - 35, cy - 55, cx - 25, cy - 95);
    ctx.lineTo(cx - 25, cy + 85);
    ctx.lineTo(cx + 25, cy + 85);
    ctx.lineTo(cx + 25, cy - 95);
    ctx.quadraticCurveTo(cx + 35, cy - 55, cx + 50, cy + 20);
    ctx.closePath();
    ctx.fill();

    // Collar
    ctx.strokeStyle = '#d4a853';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx - 24, cy - 85);
    ctx.quadraticCurveTo(cx, cy - 72, cx + 24, cy - 85);
    ctx.stroke();

    // Neck
    ctx.fillStyle = '#d8c0a8';
    ctx.fillRect(cx - 9, cy - 110, 18, 22);

    // Head
    const hY = cy - 125;
    ctx.fillStyle = '#e8d5c2';
    ctx.beginPath();
    ctx.ellipse(cx, hY, 34, 42, 0, 0, Math.PI * 2);
    ctx.fill();

    // Eyes (closed, peaceful)
    ctx.strokeStyle = '#3a2a1a';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(cx - 13, hY - 6, 6, 0.15, Math.PI - 0.15);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx + 13, hY - 6, 6, 0.15, Math.PI - 0.15);
    ctx.stroke();

    // Mouth
    ctx.strokeStyle = '#c4956a';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(cx, hY + 14, 7, 0.1, Math.PI - 0.1);
    ctx.stroke();
  }

  function drawHair(ctx, time) {
    const cx = charX;
    const scalpY = charScalpY;
    const topY = hairCurrentTop;
    const sway = Math.sin(time * 0.002) * 3;

    // === Solid hair block ===
    // Main hair mass - filled shape from scalp to current top
    const hairLeft = cx - 52;
    const hairRight = cx + 52;
    const h = scalpY - topY;

    // Hair body gradient (dark, slight sheen)
    const hairGrad = ctx.createLinearGradient(hairLeft, 0, hairRight, 0);
    hairGrad.addColorStop(0, '#120a1e');
    hairGrad.addColorStop(0.3, '#1e1230');
    hairGrad.addColorStop(0.5, '#241838');
    hairGrad.addColorStop(0.7, '#1e1230');
    hairGrad.addColorStop(1, '#120a1e');

    ctx.fillStyle = hairGrad;

    // Draw hair as a solid rounded shape
    ctx.beginPath();
    // Start from left scalp
    ctx.moveTo(hairLeft + 10, scalpY);
    // Left side, slightly curved outward
    ctx.bezierCurveTo(
      hairLeft - 5 + sway, scalpY - h * 0.5,
      hairLeft - 5 + sway, topY + h * 0.3,
      hairLeft + 15, topY + 6
    );
    // Top edge (cut or natural top)
    ctx.lineTo(hairRight - 15, topY + 6);
    // Right side
    ctx.bezierCurveTo(
      hairRight + 5 - sway, topY + h * 0.3,
      hairRight + 5 - sway, scalpY - h * 0.5,
      hairRight - 10, scalpY
    );
    ctx.closePath();
    ctx.fill();

    // Subtle outline
    ctx.strokeStyle = 'rgba(60,40,80,0.3)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Hair texture lines (subtle, inside the solid shape)
    ctx.save();
    ctx.beginPath();
    ctx.rect(hairLeft + 10, topY, hairRight - hairLeft - 20, scalpY - topY);
    ctx.clip();

    for (let i = 0; i < 12; i++) {
      const tx = hairLeft + 20 + i * (hairRight - hairLeft - 40) / 11;
      const offset = Math.sin(time * 0.0015 + i * 0.5) * 2;
      ctx.strokeStyle = 'rgba(255,255,255,0.03)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(tx + offset, topY);
      ctx.quadraticCurveTo(tx + offset * 1.5, scalpY - h * 0.5, tx + offset, scalpY);
      ctx.stroke();
    }
    ctx.restore();

    // Cut edge highlight (if hair was cut)
    if (scissorStopped && cutEffectTimer > 0) {
      ctx.strokeStyle = `rgba(255,255,255,${cutEffectTimer / 0.6 * 0.4})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(hairLeft + 12, topY + 5);
      ctx.lineTo(hairRight - 12, topY + 5);
      ctx.stroke();
    }

    // Bangs (front hair over forehead)
    ctx.fillStyle = '#1a1030';
    ctx.beginPath();
    ctx.moveTo(cx - 30, charHeadY - 115);
    ctx.quadraticCurveTo(cx - 22, charHeadY - 95, cx - 15, charHeadY - 88);
    ctx.lineTo(cx + 15, charHeadY - 88);
    ctx.quadraticCurveTo(cx + 22, charHeadY - 95, cx + 30, charHeadY - 115);
    ctx.quadraticCurveTo(cx, charHeadY - 128, cx - 30, charHeadY - 115);
    ctx.fill();
  }

  function drawTargetLine(ctx, time) {
    const cx = charX;
    const pulse = Math.sin(time * 0.004) * 0.2 + 0.8;
    const bandW = 140;

    // Golden zone
    ctx.fillStyle = `rgba(240,215,140,${0.3 * pulse})`;
    ctx.fillRect(cx - bandW / 2, targetY - targetHalfW, bandW, targetHalfW * 2);

    // Center line
    ctx.strokeStyle = `rgba(240,215,140,${0.5 * pulse})`;
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 8]);
    ctx.beginPath();
    ctx.moveTo(cx - bandW / 2 + 5, targetY);
    ctx.lineTo(cx + bandW / 2 - 5, targetY);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  function drawScissors(ctx) {
    const cx = charX;
    const cy = scissorY;

    ctx.save();
    ctx.translate(cx, cy);

    // Glow
    if (!scissorStopped) {
      const glowGrad = ctx.createRadialGradient(0, 0, 8, 0, 0, 40);
      glowGrad.addColorStop(0, 'rgba(240,215,140,0.3)');
      glowGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(0, 0, 40, 0, Math.PI * 2);
      ctx.fill();
    }

    // Left blade
    ctx.fillStyle = '#d0d5e0';
    ctx.strokeStyle = '#999';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-18, -35);
    ctx.lineTo(8, -5);
    ctx.lineTo(10, 2);
    ctx.lineTo(-16, -28);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Right blade
    ctx.fillStyle = '#c0c5d0';
    ctx.beginPath();
    ctx.moveTo(18, -35);
    ctx.lineTo(-8, -5);
    ctx.lineTo(-10, 2);
    ctx.lineTo(16, -28);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Pivot
    ctx.fillStyle = '#d4a853';
    ctx.beginPath();
    ctx.arc(0, -3, 4, 0, Math.PI * 2);
    ctx.fill();

    // Left handle
    ctx.strokeStyle = '#d4a853';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(-20, 18, 14, 8, -0.3, Math.PI * 0.4, Math.PI * 1.8);
    ctx.stroke();

    // Right handle
    ctx.beginPath();
    ctx.ellipse(20, 18, 14, 8, 0.3, Math.PI * 1.2, Math.PI * 2.6);
    ctx.stroke();

    ctx.restore();
  }

  function drawParticles(ctx, dt) {
    for (let i = fallenParticles.length - 1; i >= 0; i--) {
      const p = fallenParticles[i];
      p.y += p.vy;
      p.x += p.vx;
      p.vy += 0.2; // gravity
      p.rot += p.rotSpd;
      p.life -= dt;
      if (p.life <= 0) { fallenParticles.splice(i, 1); continue; }

      const alpha = Math.min(1, p.life / 0.4);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);

      // Hair chunk - small dark rectangle
      const hairGrad = ctx.createLinearGradient(0, -p.size / 2, 0, p.size / 2);
      hairGrad.addColorStop(0, '#241838');
      hairGrad.addColorStop(0.5, '#1e1230');
      hairGrad.addColorStop(1, '#120a1e');
      ctx.fillStyle = hairGrad;
      ctx.fillRect(-p.size * 0.25, -p.size * 0.6, p.size * 0.5, p.size * 1.2);

      ctx.restore();
    }
  }

  // ===========================================
  // Game Loop
  // ===========================================
  function gameLoop(timestamp) {
    animId = requestAnimationFrame(gameLoop);
    const dt = Math.min(0.05, (timestamp - (gameLoop._lastTs || timestamp)) / 1000);
    gameLoop._lastTs = timestamp;

    // Update scissors
    if (state === State.PLAYING && !scissorStopped) {
      scissorY += scissorDir * scissorSpeed * dt;
      if (scissorY >= scissorMaxY) { scissorY = scissorMaxY; scissorDir = -1; }
      if (scissorY <= scissorMinY) { scissorY = scissorMinY; scissorDir = 1; }
    }

    // Cut effect
    if (cutEffectTimer > 0) cutEffectTimer -= dt;

    // Draw
    ctx.clearRect(0, 0, width, height);

    const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
    bgGrad.addColorStop(0, '#1a1040');
    bgGrad.addColorStop(0.5, '#150d30');
    bgGrad.addColorStop(1, '#0a0820');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Mirror glow
    const mirrorGrad = ctx.createRadialGradient(charX, charHeadY, 20, charX, charHeadY, height * 0.55);
    mirrorGrad.addColorStop(0, 'rgba(179,157,218,0.05)');
    mirrorGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = mirrorGrad;
    ctx.fillRect(0, 0, width, height);

    // Draw scene
    drawTargetLine(ctx, timestamp);
    drawCharacter(ctx);
    drawHair(ctx, timestamp);
    drawScissors(ctx);
    drawParticles(ctx, dt);

    // Cut flash
    if (cutEffectTimer > 0) {
      const alpha = cutEffectTimer / 0.6;
      ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(charX - 80, scissorY);
      ctx.lineTo(charX + 80, scissorY);
      ctx.stroke();
    }

    // Scissor stopped indicator
    if (scissorStopped && state === State.RESULT) {
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.font = 'bold 13px "Microsoft YaHei", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('剪在这里！', charX, scissorY - 40);
    }
  }

  // Start
  hairCurrentTop = scissorMinY;
  gameLoop._lastTs = performance.now();
  animId = requestAnimationFrame(gameLoop);

})();
