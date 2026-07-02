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

    // Spawn hair particles
    for (let i = 0; i < 40; i++) {
      fallenParticles.push({
        x: charX - 50 + Math.random() * 100,
        y: cutY + Math.random() * 10,
        vx: (Math.random() - 0.5) * 3,
        vy: 1 + Math.random() * 4,
        life: 0.6 + Math.random() * 0.8,
        size: 2 + Math.random() * 4,
      });
    }
    cutEffectTimer = 0.6;

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
    const baseY = charScalpY;
    const topY = hairCurrentTop;
    const numStrands = 50;
    const spread = 110;

    for (let i = 0; i < numStrands; i++) {
      const t = i / (numStrands - 1);
      const bx = cx - spread / 2 + t * spread;
      const length = baseY - topY;
      const tipY = topY;
      const sway = Math.sin(time * 0.002 + i * 0.3) * (3 + (length / 200) * 5);

      ctx.strokeStyle = '#1a1028';
      ctx.lineWidth = 0.8 + Math.random() * 0.1; // subtle variation
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(bx, baseY);
      const cp1x = bx + sway * 0.3;
      const cp1y = baseY - length * 0.45;
      const cp2x = bx + sway * 0.7;
      const cp2y = baseY - length * 0.75;
      ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, bx + sway, tipY);
      ctx.stroke();
    }
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
      p.vy += 0.15;
      p.life -= dt;
      if (p.life <= 0) { fallenParticles.splice(i, 1); continue; }

      const alpha = Math.min(1, p.life / 0.3);
      ctx.fillStyle = `rgba(26,16,40,${alpha})`;
      ctx.fillRect(p.x, p.y, p.size, p.size * 0.4);
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
