/* ============================================
   Century Birthday - Haircut Game JS
   Hair hangs down, scissors move, cut from below
   ============================================ */

(function() {
  const { BGM, STORE, SoundEngine } = window.CenturyApp;

  // DOM
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

  // Constants
  const TOTAL_ROUNDS = 4;
  const ROUND_CONFIG = [
    { speed: 100, targetHalfW: 40 },
    { speed: 160, targetHalfW: 28 },
    { speed: 240, targetHalfW: 18 },
    { speed: 340, targetHalfW: 10 },
  ];

  const PERFECT_RANGE = 12;
  const GOOD_RANGE = 28;
  const OK_RANGE = 50;

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

  // State
  const State = { IDLE: 'idle', PLAYING: 'playing', RESULT: 'result', ENDED: 'ended' };
  let state = State.IDLE;
  let currentRound = 0;
  let totalScore = 0, perfects = 0, insultCount = 0;

  // Layout (computed in updateLayout)
  let width, height;
  let headX, headY;          // center of character's head
  let hairTopY = 200;              // where hair starts (scalp)
  let hairBottomY = 500;           // full length hair bottom (waist)
  let hairCurrentBottom = 500;     // current hair bottom (after cuts)
  let targetY;               // target line position
  let targetHalfW;           // half-width of target zone in px

  // Scissors
  let scissorY;
  let scissorDir = -1;
  let scissorSpeed = 100;
  let scissorMinY, scissorMaxY;
  let scissorStopped = false;

  // Effects
  let cutEffectTimer = 0;
  let fallenParticles = [];
  let animId = null;

  // ===========================================
  // Canvas
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
    // Head near top of screen
    headX = width / 2;
    headY = height * 0.22;

    // Hair: covers entire crown, flowing down to waist
    hairTopY = headY - 42;

    // Initial full hair length: down to ~80% of screen
    hairBottomY = height * 0.78;
    if (state === State.IDLE) {
      hairCurrentBottom = hairBottomY;
    }

    // Scissors range: lower portion of hair (not cutting near scalp)
    scissorMinY = headY + 30;
    scissorMaxY = hairBottomY - 15;

    if (state === State.IDLE || scissorY < scissorMinY || scissorY > scissorMaxY) {
      scissorY = (scissorMinY + scissorMaxY) / 2;
    }

    // Target: default mid-hair (will be refined in startRound)
    const cfg = ROUND_CONFIG[currentRound] || ROUND_CONFIG[0];
    targetHalfW = cfg.targetHalfW;
    targetY = headY + 45 + (hairBottomY - headY - 45) * 0.5;
  }

  resize();
  updateLayout();
  window.addEventListener('resize', () => { resize(); updateLayout(); });

  // ===========================================
  // Round
  // ===========================================
  function startRound() {
    if (currentRound >= TOTAL_ROUNDS) { endGame(); return; }

    const cfg = ROUND_CONFIG[currentRound];
    scissorSpeed = cfg.speed;
    targetHalfW = cfg.targetHalfW;
    scissorStopped = false;
    cutEffectTimer = 0;
    fallenParticles = [];
    state = State.PLAYING;

    hudRound.textContent = `第 ${currentRound + 1} / ${TOTAL_ROUNDS} 轮`;
    cutBtn.classList.remove('disabled');
    targetHint.classList.add('show');
    if (roundPopup) roundPopup.classList.add('hidden');
    if (speechBubble) speechBubble.classList.add('hidden');

    // Target per round: R1 lowest → R4 highest (never above chin)
    const chinY = headY + 45;
    const hairRange = hairCurrentBottom - chinY;
    let tMin, tMax;
    switch (currentRound) {
      case 0: // R1: lower third
        tMin = chinY + hairRange * 0.55;
        tMax = hairCurrentBottom - 25;
        break;
      case 1: // R2: mid
        tMin = chinY + hairRange * 0.3;
        tMax = chinY + hairRange * 0.6;
        break;
      default: // R3-4: upper, just below chin
        tMin = chinY + 5;
        tMax = chinY + hairRange * 0.35;
        break;
    }
    targetY = tMin + Math.random() * (tMax - tMin);
    targetY = Math.max(chinY + 5, Math.min(hairCurrentBottom - 10, targetY));

    // Scissors start from above
    scissorY = hairTopY + 20;
    scissorDir = 1;
  }

  function doCut() {
    if (state !== State.PLAYING || scissorStopped) return;

    scissorStopped = true;
    state = State.RESULT;
    cutBtn.classList.add('disabled');
    targetHint.classList.remove('show');

    const cutY = scissorY;

    // Cut off hair BELOW the scissors
    const trimmed = hairCurrentBottom - cutY;
    hairCurrentBottom = Math.max(hairTopY + 5, cutY);

    // Score: distance from target
    const distFromTarget = cutY - targetY;
    const absDist = Math.abs(distFromTarget);
    let judgment, points;
    const tooShort = cutY < targetY - targetHalfW - OK_RANGE;

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

    // Hair particles (falling from cut point)
    const hairLeft = headX - 48, hairRight = headX + 48;
    for (let i = 0; i < 40; i++) {
      fallenParticles.push({
        x: hairLeft + Math.random() * (hairRight - hairLeft),
        y: cutY,
        vx: (Math.random() - 0.5) * 4,
        vy: 1 + Math.random() * 3,
        life: 0.6 + Math.random() * 1.0,
        size: 3 + Math.random() * 7,
        rot: Math.random() * Math.PI * 2,
        rotSpd: (Math.random() - 0.5) * 0.12,
      });
    }
    cutEffectTimer = 0.6;

    showRoundResult(judgment, points);
    if (tooShort || judgment === 'bad') showInsult();

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
    speechBubble.textContent = INSULTS[Math.floor(Math.random() * INSULTS.length)];
    speechBubble.classList.remove('hidden');
    clearTimeout(speechBubble._timeout);
    speechBubble._timeout = setTimeout(() => speechBubble.classList.add('hidden'), 1800);
  }

  // ===========================================
  // End
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
    if (pct >= 0.9 && insultCount === 0) { grade = 'S'; comment = 'Tony老师看了都想拜你为师！'; }
    else if (pct >= 0.8) { grade = 'A'; comment = '顾客表示：下次还找你。'; }
    else if (pct >= 0.65) { grade = 'B'; comment = '还行，起码没被当场开除。'; }
    else if (pct >= 0.45) { grade = 'C'; comment = '店长：你明天不用来了……开玩笑的。'; }
    else if (pct >= 0.25) { grade = 'D'; comment = '顾客已经去隔壁理发店了。'; }
    else { grade = 'F'; comment = '你确定你拿的是剪刀不是除草机？'; }
    if (insultCount >= 3) comment += ' 顾客骂了你 ' + insultCount + ' 次。';

    document.getElementById('results-grade').textContent = grade;
    document.getElementById('results-comment').textContent = comment;
    document.getElementById('res-score').textContent = totalScore;
    document.getElementById('res-perfect').textContent = perfects;
    document.getElementById('res-insults').textContent = insultCount;

    STORE.setBool('haircut_complete', true);
    STORE.set('haircut_score', totalScore.toString());
    SoundEngine.playChime();
  }

  // ===========================================
  // Input
  // ===========================================
  if (cutBtn) {
    cutBtn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      if (state === State.PLAYING) doCut();
    });
  }
  document.addEventListener('keydown', (e) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      if (state === State.PLAYING) doCut();
    }
  });

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
    const cx = headX, hy = headY;

    // === Body/shoulders ===
    const shoulderY = hy + 50;
    ctx.fillStyle = '#4a3a62';
    ctx.beginPath();
    ctx.moveTo(cx - 70, shoulderY + 30);
    ctx.quadraticCurveTo(cx - 55, shoulderY - 5, cx - 22, shoulderY - 20);
    ctx.lineTo(cx + 22, shoulderY - 20);
    ctx.quadraticCurveTo(cx + 55, shoulderY - 5, cx + 70, shoulderY + 30);
    ctx.closePath();
    ctx.fill();

    // Collar
    ctx.strokeStyle = '#d4a853';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - 20, shoulderY - 18);
    ctx.quadraticCurveTo(cx, shoulderY - 5, cx + 20, shoulderY - 18);
    ctx.stroke();

    // Neck
    ctx.fillStyle = '#d8c0a8';
    ctx.fillRect(cx - 9, hy + 6, 18, 20);

    // Head
    ctx.fillStyle = '#e8d5c2';
    ctx.beginPath();
    ctx.ellipse(cx, hy, 35, 43, 0, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    ctx.strokeStyle = '#3a2a1a';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(cx - 13, hy - 5, 6, 0.15, Math.PI - 0.15);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx + 13, hy - 5, 6, 0.15, Math.PI - 0.15);
    ctx.stroke();

    // Mouth
    ctx.strokeStyle = '#c4956a';
    ctx.beginPath();
    ctx.arc(cx, hy + 15, 7, 0.1, Math.PI - 0.1);
    ctx.stroke();

    // Ears
    ctx.fillStyle = '#e0c8b0';
    ctx.beginPath(); ctx.ellipse(cx - 34, hy, 6, 11, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx + 34, hy, 6, 11, 0, 0, Math.PI * 2); ctx.fill();

    // === 八字刘海 (center part, covers forehead down to eye level) ===
    ctx.fillStyle = '#1a1032';

    // Left bang: from hairline → sweep left and curl down
    ctx.beginPath();
    ctx.moveTo(cx, hy - 44);                          // center hairline at crown
    ctx.bezierCurveTo(
      cx - 12, hy - 44,                                // across top of forehead
      cx - 34, hy - 28,                                // sweep left
      cx - 32, hy + 2                                  // curl down near cheek
    );
    ctx.bezierCurveTo(
      cx - 26, hy - 4,                                 // curl inward
      cx - 14, hy - 8,                                 // back toward face
      cx - 3, hy - 4                                   // near eye level
    );
    ctx.quadraticCurveTo(cx - 1, hy - 18, cx, hy - 44); // return to hairline
    ctx.fill();

    // Right bang
    ctx.beginPath();
    ctx.moveTo(cx, hy - 44);
    ctx.bezierCurveTo(
      cx + 12, hy - 44,
      cx + 34, hy - 28,
      cx + 32, hy + 2
    );
    ctx.bezierCurveTo(
      cx + 26, hy - 4,
      cx + 14, hy - 8,
      cx + 3, hy - 4
    );
    ctx.quadraticCurveTo(cx + 1, hy - 18, cx, hy - 44);
    ctx.fill();
  }

  function drawHair(ctx, time) {
    const bottomY = hairCurrentBottom || hairBottomY; // safety fallback
    const topY = hairTopY;
    const cx = headX;

    if (bottomY <= topY + 5) return;

    const hw = 50;
    const sway = Math.sin(time * 0.0015) * 2;

    // Main hair block
    const hairGrad = ctx.createLinearGradient(cx - hw, 0, cx + hw, 0);
    hairGrad.addColorStop(0, '#120a1e');
    hairGrad.addColorStop(0.35, '#1e1232');
    hairGrad.addColorStop(0.5, '#261840');
    hairGrad.addColorStop(0.65, '#1e1232');
    hairGrad.addColorStop(1, '#120a1e');
    ctx.fillStyle = hairGrad;

    ctx.beginPath();
    ctx.moveTo(cx - 28, topY);
    ctx.bezierCurveTo(
      cx - hw - 8, topY + (bottomY - topY) * 0.3,
      cx - hw - 3 + sway, topY + (bottomY - topY) * 0.7,
      cx - hw + 8 + sway, bottomY
    );
    ctx.lineTo(cx + hw - 8 - sway, bottomY);
    ctx.bezierCurveTo(
      cx + hw + 3 - sway, topY + (bottomY - topY) * 0.7,
      cx + hw + 8, topY + (bottomY - topY) * 0.3,
      cx + 28, topY
    );
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = 'rgba(80,50,120,0.2)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Hair texture lines
    ctx.save();
    ctx.beginPath();
    ctx.rect(cx - hw, topY, hw * 2, bottomY - topY);
    ctx.clip();
    for (let i = 0; i < 10; i++) {
      const tx = cx - hw + 15 + i * (hw * 2 - 30) / 9;
      const off = Math.sin(time * 0.001 + i * 0.4) * 1.5;
      ctx.strokeStyle = 'rgba(255,255,255,0.025)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(tx + off, topY);
      ctx.quadraticCurveTo(tx + off * 2, topY + (bottomY - topY) * 0.5, tx + off, bottomY);
      ctx.stroke();
    }
    ctx.restore();

    // Cut edge highlight
    if (scissorStopped && cutEffectTimer > 0) {
      ctx.strokeStyle = `rgba(255,255,255,${cutEffectTimer / 0.6 * 0.3})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx - hw + 8, bottomY);
      ctx.lineTo(cx + hw - 8, bottomY);
      ctx.stroke();
    }
  }

  function drawTargetLine(ctx, time) {
    const cx = headX;
    const bandW = 140;
    const pulse = Math.sin(time * 0.004) * 0.15 + 0.85;

    // Target zone
    ctx.fillStyle = `rgba(240,215,140,${0.25 * pulse})`;
    ctx.fillRect(cx - bandW / 2, targetY - targetHalfW, bandW, targetHalfW * 2);

    // Line
    ctx.strokeStyle = `rgba(240,215,140,${0.45 * pulse})`;
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 7]);
    ctx.beginPath();
    ctx.moveTo(cx - bandW / 2 + 5, targetY);
    ctx.lineTo(cx + bandW / 2 - 5, targetY);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  function drawScissors(ctx) {
    const cx = headX + 60;
    const cy = scissorY;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-0.15); // slight angle for visual interest

    if (!scissorStopped) {
      const glowGrad = ctx.createRadialGradient(0, 0, 5, 0, 0, 35);
      glowGrad.addColorStop(0, 'rgba(240,215,140,0.25)');
      glowGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = glowGrad;
      ctx.beginPath(); ctx.arc(0, 0, 35, 0, Math.PI * 2); ctx.fill();
    }

    // Blades
    ctx.fillStyle = '#d5d8e0';
    ctx.strokeStyle = '#999';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-20, -38); ctx.lineTo(6, -6); ctx.lineTo(8, 1); ctx.lineTo(-18, -30);
    ctx.closePath(); ctx.fill(); ctx.stroke();

    ctx.fillStyle = '#c5c8d0';
    ctx.beginPath();
    ctx.moveTo(20, -38); ctx.lineTo(-6, -6); ctx.lineTo(-8, 1); ctx.lineTo(18, -30);
    ctx.closePath(); ctx.fill(); ctx.stroke();

    // Pivot
    ctx.fillStyle = '#d4a853';
    ctx.beginPath(); ctx.arc(0, -4, 4, 0, Math.PI * 2); ctx.fill();

    // Handles
    ctx.strokeStyle = '#d4a853';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(-22, 20, 16, 9, -0.3, Math.PI * 0.35, Math.PI * 1.75);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(22, 20, 16, 9, 0.3, Math.PI * 1.25, Math.PI * 2.65);
    ctx.stroke();

    ctx.restore();
  }

  function drawParticles(ctx, dt) {
    for (let i = fallenParticles.length - 1; i >= 0; i--) {
      const p = fallenParticles[i];
      p.y += p.vy;
      p.x += p.vx;
      p.vy += 0.18;
      p.rot += p.rotSpd;
      p.life -= dt;
      if (p.life <= 0) { fallenParticles.splice(i, 1); continue; }

      const alpha = Math.min(1, p.life / 0.35);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      const grad = ctx.createLinearGradient(0, -p.size / 2, 0, p.size / 2);
      grad.addColorStop(0, '#241838');
      grad.addColorStop(1, '#120a1e');
      ctx.fillStyle = grad;
      ctx.fillRect(-p.size * 0.2, -p.size * 0.55, p.size * 0.4, p.size * 1.1);
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
    if (cutEffectTimer > 0) cutEffectTimer -= dt;

    // Draw
    ctx.clearRect(0, 0, width, height);
    const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
    bgGrad.addColorStop(0, '#1a1640');
    bgGrad.addColorStop(0.5, '#150d30');
    bgGrad.addColorStop(1, '#0d0a20');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Light backdrop panel behind character + hair (for contrast)
    const panelW = Math.min(280, width * 0.6);
    const panelH = hairBottomY - headY + 100;
    const panelX = headX - panelW / 2;
    const panelY = headY - 50;
    const panelGrad = ctx.createLinearGradient(0, panelY, 0, panelY + panelH);
    panelGrad.addColorStop(0, 'rgba(180,170,210,0.12)');
    panelGrad.addColorStop(0.5, 'rgba(200,190,220,0.08)');
    panelGrad.addColorStop(1, 'rgba(160,150,190,0.04)');
    ctx.fillStyle = panelGrad;
    ctx.beginPath();
    const pr = 20;
    ctx.moveTo(panelX + pr, panelY);
    ctx.lineTo(panelX + panelW - pr, panelY);
    ctx.arcTo(panelX + panelW, panelY, panelX + panelW, panelY + pr, pr);
    ctx.lineTo(panelX + panelW, panelY + panelH - pr);
    ctx.arcTo(panelX + panelW, panelY + panelH, panelX + panelW - pr, panelY + panelH, pr);
    ctx.lineTo(panelX + pr, panelY + panelH);
    ctx.arcTo(panelX, panelY + panelH, panelX, panelY + panelH - pr, pr);
    ctx.lineTo(panelX, panelY + pr);
    ctx.arcTo(panelX, panelY, panelX + pr, panelY, pr);
    ctx.closePath();
    ctx.fill();

    // Layer order: hair → character → target line (gold line always on top)
    drawHair(ctx, timestamp);
    drawCharacter(ctx);
    drawTargetLine(ctx, timestamp);
    drawScissors(ctx);
    drawParticles(ctx, dt);

    // Cut flash
    if (cutEffectTimer > 0) {
      const alpha = cutEffectTimer / 0.6;
      ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(headX - 60, scissorY);
      ctx.lineTo(headX + 60, scissorY);
      ctx.stroke();
    }
  }

  // Start
  gameLoop._lastTs = performance.now();
  animId = requestAnimationFrame(gameLoop);

})();
