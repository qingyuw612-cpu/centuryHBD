/* ============================================
   Century Birthday - Haircut Game JS
   Calibration / Hair Cutting Game
   ============================================ */

(function() {
  const { BGM, STORE, SoundEngine } = window.CenturyApp;

  // ===========================================
  // DOM Elements
  // ===========================================
  const canvas = document.getElementById('haircut-canvas');
  const ctx = canvas.getContext('2d');
  const hudRound = document.getElementById('hud-round');
  const hudScore = document.getElementById('hud-score');
  const zoneHint = document.getElementById('zone-hint');
  const speechBubble = document.getElementById('speech-bubble');
  const scissorsBtn = document.getElementById('scissors-btn');
  const roundResult = document.getElementById('round-result');
  const roundResultText = document.getElementById('round-result-text');
  const resultsEl = document.getElementById('results');

  // ===========================================
  // Constants
  // ===========================================
  const TOTAL_ROUNDS = 8;
  const ROUND_CONFIG = [
    { speed: 35, targetWidth: 45, label: '热身' },       // R1
    { speed: 40, targetWidth: 40, label: '热身' },       // R2
    { speed: 55, targetWidth: 28, label: '进阶' },       // R3
    { speed: 60, targetWidth: 25, label: '进阶' },       // R4
    { speed: 65, targetWidth: 22, label: '进阶' },       // R5
    { speed: 75, targetWidth: 18, label: '困难' },       // R6
    { speed: 85, targetWidth: 15, label: '困难' },       // R7
    { speed: 100, targetWidth: 12, label: 'BOSS!' },     // R8
  ];

  const PERFECT_RANGE = 8;   // pixels from target center
  const GOOD_RANGE = 20;
  const OK_RANGE = 35;

  const INSULTS = [
    '会不会剪啊！',
    '我明天还要见人！',
    '你把我当草坪修剪呢？',
    '这发型……很有个性',
    '我要退钱！',
    '你是故意找茬是吧？',
    '我邻居家的狗剪得都比你好！',
    '请问你是盲人理发师吗？',
  ];

  // ===========================================
  // Game State
  // ===========================================
  const State = {
    IDLE: 'idle', ROUND_INTRO: 'intro',
    GROWING: 'growing', CUT_RESULT: 'result',
    ROUND_END: 'roundEnd', ENDED: 'ended'
  };
  let state = State.IDLE;

  let currentRound = 0;
  let totalScore = 0;
  let perfects = 0;
  let insultCount = 0;
  let currentHairHeight = 0;
  let targetY = 0;
  let targetTop = 0;
  let targetBottom = 0;
  let maxHairHeight = 0;
  let growSpeed = 0;
  let cutFlash = 0;
  let roundIntroTimer = 0;

  let width, height;
  let characterY, scalpY;
  let animId = null;
  let cutAnimTimer = 0;
  let lastRoundResult = '';

  // Strands for hair rendering
  let strands = [];

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
    characterY = height * 0.75;
    scalpY = characterY - 30;
    maxHairHeight = height * 0.55;
  }

  resize();
  updateLayout();

  window.addEventListener('resize', () => {
    resize();
    updateLayout();
  });

  // ===========================================
  // Hair Strand Generation
  // ===========================================
  function createStrands() {
    strands = [];
    const numStrands = 55;
    const spread = Math.min(120, width * 0.3);
    for (let i = 0; i < numStrands; i++) {
      const t = i / (numStrands - 1);
      strands.push({
        baseX: width / 2 - spread / 2 + t * spread,
        swayOffset: Math.random() * Math.PI * 2,
        swayAmp: 3 + Math.random() * 10,
        thickness: 0.8 + Math.random() * 2.2,
        lengthMultiplier: 0.85 + Math.random() * 0.3,
        curve: -0.3 + Math.random() * 0.6,
      });
    }
  }

  createStrands();

  // ===========================================
  // Round Management
  // ===========================================
  function startRound() {
    if (currentRound >= TOTAL_ROUNDS) {
      endGame();
      return;
    }

    const config = ROUND_CONFIG[currentRound];
    growSpeed = config.speed;
    const targetWidth = config.targetWidth;

    // Target zone in the upper portion of the hair area
    targetY = scalpY - height * 0.22 - Math.random() * height * 0.08;
    targetTop = targetY - targetWidth / 2;
    targetBottom = targetY + targetWidth / 2;

    currentHairHeight = 5; // Start short
    state = State.GROWING;
    cutFlash = 0;

    // Update HUD
    hudRound.textContent = `第 ${currentRound + 1} 轮 · ${config.label}`;
    hudScore.textContent = totalScore;

    // Show zone hint briefly
    zoneHint.classList.add('show');
    setTimeout(() => zoneHint.classList.remove('show'), 2000);

    // Enable scissors
    scissorsBtn.classList.remove('disabled');
  }

  function doCut() {
    if (state !== State.GROWING) return;

    state = State.CUT_RESULT;
    cutFlash = 0.25;

    // Determine where the cut was made (top of hair)
    const cutY = scalpY - currentHairHeight;
    const distFromTarget = cutY - targetY; // positive = cut below target (too long), negative = too short

    let judgment;
    const absDist = Math.abs(distFromTarget);

    if (absDist <= PERFECT_RANGE) {
      judgment = 'perfect';
      totalScore += 100;
      perfects++;
      SoundEngine.playSnip();
    } else if (absDist <= GOOD_RANGE) {
      judgment = 'good';
      totalScore += 60;
      SoundEngine.playSnip();
    } else if (absDist <= OK_RANGE) {
      judgment = 'ok';
      totalScore += 30;
      SoundEngine.playSnip();
    } else {
      judgment = 'bad';
      totalScore += 10;
      insultCount++;
      SoundEngine.playWahWah();
    }

    lastRoundResult = judgment;

    // Show result
    showRoundResult(judgment);

    // Disable scissors briefly
    scissorsBtn.classList.add('disabled');

    // Auto-advance after a delay
    setTimeout(() => {
      if (state === State.ENDED) return;
      roundResult.classList.add('hidden');
      if (speechBubble) speechBubble.classList.add('hidden');
      currentRound++;
      if (currentRound >= TOTAL_ROUNDS) {
        endGame();
      } else {
        startRound();
      }
    }, judgment === 'bad' ? 2500 : 1500);

    // If bad, show insult
    if (judgment === 'bad') {
      showInsult();
    }

    hudScore.textContent = totalScore;
  }

  function showRoundResult(judgment) {
    const colors = {
      perfect: '#f0d78c',
      good: '#7eb8da',
      ok: '#b39dda',
      bad: '#db5a5a'
    };
    const texts = {
      perfect: 'Perfect! ✨',
      good: 'Good 👍',
      ok: 'OK...',
      bad: '糟糕! 💢'
    };
    if (roundResult && roundResultText) {
      roundResultText.textContent = texts[judgment];
      roundResultText.style.color = colors[judgment];
      roundResult.classList.remove('hidden');
    }
  }

  function showInsult() {
    if (!speechBubble) return;
    const insult = INSULTS[Math.floor(Math.random() * INSULTS.length)];
    speechBubble.textContent = insult;
    speechBubble.classList.remove('hidden');
    // Auto hide after a bit
    clearTimeout(speechBubble._timeout);
    speechBubble._timeout = setTimeout(() => {
      speechBubble.classList.add('hidden');
    }, 2000);
  }

  function endGame() {
    state = State.ENDED;
    scissorsBtn.classList.add('disabled');
    showFinalResults();
  }

  function showFinalResults() {
    if (!resultsEl) return;
    resultsEl.classList.remove('hidden');

    const maxScore = TOTAL_ROUNDS * 100;
    const pct = maxScore > 0 ? totalScore / maxScore : 0;
    let grade;
    if (pct >= 0.9 && insultCount <= 1) grade = 'S';
    else if (pct >= 0.75) grade = 'A';
    else if (pct >= 0.55) grade = 'B';
    else if (pct >= 0.35) grade = 'C';
    else grade = 'D';

    document.getElementById('results-grade').textContent = grade;
    document.getElementById('res-score').textContent = totalScore;
    document.getElementById('res-rounds').textContent = `${currentRound}/${TOTAL_ROUNDS}`;
    document.getElementById('res-perfect').textContent = perfects;
    document.getElementById('res-insults').textContent = insultCount;

    // Save
    STORE.setBool('haircut_complete', true);
    STORE.set('haircut_score', totalScore.toString());
    STORE.set('haircut_rounds', currentRound.toString());

    SoundEngine.playChime();
  }

  // ===========================================
  // Drawing
  // ===========================================
  function drawCharacter(ctx) {
    const cx = width / 2;
    const cy = characterY;

    // Body (simple robe)
    ctx.fillStyle = '#1c1a28';
    ctx.beginPath();
    ctx.moveTo(cx - 55, cy + 15);
    ctx.quadraticCurveTo(cx - 40, cy - 60, cx - 30, cy - 100);
    ctx.lineTo(cx - 30, cy + 80);
    ctx.lineTo(cx + 30, cy + 80);
    ctx.lineTo(cx + 30, cy - 100);
    ctx.quadraticCurveTo(cx + 40, cy - 60, cx + 55, cy + 15);
    ctx.closePath();
    ctx.fill();

    // Gold collar
    ctx.strokeStyle = '#d4a853';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - 28, cy - 90);
    ctx.quadraticCurveTo(cx, cy - 75, cx + 28, cy - 90);
    ctx.stroke();

    // Neck
    ctx.fillStyle = '#d8c0a8';
    ctx.fillRect(cx - 10, cy - 110, 20, 25);

    // Head
    const headY = cy - 125;
    ctx.fillStyle = '#e8d5c2';
    ctx.beginPath();
    ctx.ellipse(cx, headY, 38, 45, 0, 0, Math.PI * 2);
    ctx.fill();

    // Eyes (closed, peaceful)
    ctx.strokeStyle = '#3a2a1a';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(cx - 14, headY - 8, 7, 0.2, Math.PI - 0.2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx + 14, headY - 8, 7, 0.2, Math.PI - 0.2);
    ctx.stroke();

    // Mouth
    ctx.strokeStyle = '#c4956a';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.arc(cx, headY + 12, 8, 0.1, Math.PI - 0.1);
    ctx.stroke();

    // Ears
    ctx.fillStyle = '#e0c8b0';
    ctx.beginPath();
    ctx.ellipse(cx - 37, headY, 7, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx + 37, headY, 7, 12, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawHair(ctx, time) {
    const cx = width / 2;
    const scalpBaseY = scalpY;

    for (const strand of strands) {
      const bx = strand.baseX;
      const length = currentHairHeight * strand.lengthMultiplier;
      const tipY = scalpBaseY - length;

      // Sway based on time
      const sway = Math.sin(time * 0.002 + strand.swayOffset) * strand.swayAmp * (length / maxHairHeight);

      const cp1x = bx + strand.curve * length * 0.4 + sway * 0.5;
      const cp1y = scalpBaseY - length * 0.4;
      const cp2x = bx + strand.curve * length * 0.6 + sway;
      const cp2y = scalpBaseY - length * 0.7;
      const tipX = bx + strand.curve * length * 0.5 + sway * 1.5;

      ctx.strokeStyle = '#1a1028';
      ctx.lineWidth = strand.thickness;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(bx, scalpBaseY);
      ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, tipX, tipY);
      ctx.stroke();

      // Highlight on some strands
      if (strand.thickness > 1.6) {
        ctx.strokeStyle = 'rgba(50, 30, 60, 0.4)';
        ctx.lineWidth = strand.thickness * 0.4;
        ctx.beginPath();
        ctx.moveTo(bx + 1, scalpBaseY);
        ctx.bezierCurveTo(cp1x + 0.5, cp1y, cp2x + 0.5, cp2y, tipX + 0.5, tipY);
        ctx.stroke();
      }
    }

    // Side hair framing face
    const headY = characterY - 125;
    ctx.strokeStyle = '#1a1028';
    ctx.lineWidth = 1.5;
    // Left sideburn
    ctx.beginPath();
    ctx.moveTo(cx - 35, headY - 15);
    ctx.quadraticCurveTo(cx - 42, headY + 5, cx - 38, headY + 25);
    ctx.stroke();
    // Right sideburn
    ctx.beginPath();
    ctx.moveTo(cx + 35, headY - 15);
    ctx.quadraticCurveTo(cx + 42, headY + 5, cx + 38, headY + 25);
    ctx.stroke();
  }

  function drawTargetZone(ctx, time) {
    const cx = width / 2;
    const pulse = Math.sin(time * 0.004) * 0.3 + 0.7;
    const alpha = 0.5 + pulse * 0.3;

    // Golden target band
    const bandW = Math.min(160, width * 0.4);
    ctx.fillStyle = `rgba(240,215,140,${alpha})`;
    ctx.strokeStyle = `rgba(240,215,140,${alpha + 0.3})`;
    ctx.lineWidth = 2;
    const rr = 4;
    const rrx = cx - bandW / 2, rry = targetTop, rrw = bandW, rrh = targetBottom - targetTop;
    ctx.beginPath();
    ctx.moveTo(rrx + rr, rry);
    ctx.lineTo(rrx + rrw - rr, rry);
    ctx.arcTo(rrx + rrw, rry, rrx + rrw, rry + rr, rr);
    ctx.lineTo(rrx + rrw, rry + rrh - rr);
    ctx.arcTo(rrx + rrw, rry + rrh, rrx + rrw - rr, rry + rrh, rr);
    ctx.lineTo(rrx + rr, rry + rrh);
    ctx.arcTo(rrx, rry + rrh, rrx, rry + rrh - rr, rr);
    ctx.lineTo(rrx, rry + rr);
    ctx.arcTo(rrx, rry, rrx + rr, rry, rr);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Center line
    ctx.strokeStyle = `rgba(255,255,255,${alpha + 0.2})`;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 8]);
    ctx.beginPath();
    ctx.moveTo(cx - bandW / 2 + 5, targetY);
    ctx.lineTo(cx + bandW / 2 - 5, targetY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Perfect zone indicators
    ctx.fillStyle = `rgba(255,255,255,${alpha * 0.5})`;
    ctx.beginPath();
    ctx.arc(cx - bandW / 4, targetY, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx + bandW / 4, targetY, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawCutFlash(ctx) {
    if (cutFlash <= 0) return;
    const alpha = cutFlash / 0.25;
    const cy = scalpY - currentHairHeight;

    // White flash line
    ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(width * 0.15, cy);
    ctx.lineTo(width * 0.85, cy);
    ctx.stroke();

    // Sparkles
    const numSparkles = 8;
    for (let i = 0; i < numSparkles; i++) {
      const sx = width * 0.2 + Math.random() * width * 0.6;
      const sy = cy - 10 + Math.random() * 20;
      const sparkSize = 2 + Math.random() * 3;
      ctx.fillStyle = `rgba(240,215,140,${alpha * (0.5 + Math.random() * 0.5)})`;
      ctx.beginPath();
      ctx.arc(sx, sy, sparkSize, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ===========================================
  // Game Loop
  // ===========================================
  function gameLoop(timestamp) {
    animId = requestAnimationFrame(gameLoop);

    const dt = Math.min(0.05, (timestamp - (gameLoop._lastTs || timestamp)) / 1000);
    gameLoop._lastTs = timestamp;

    // Update
    if (state === State.GROWING) {
      currentHairHeight += growSpeed * dt;
      // Cap at max
      if (currentHairHeight > maxHairHeight) {
        currentHairHeight = maxHairHeight;
        // Auto-miss if hair grows too much
        doCut();
      }
    }

    if (cutFlash > 0) {
      cutFlash -= dt;
    }

    // Draw
    ctx.clearRect(0, 0, width, height);

    // Background
    const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
    bgGrad.addColorStop(0, '#1a1040');
    bgGrad.addColorStop(0.5, '#150d30');
    bgGrad.addColorStop(1, '#0a0820');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Mirror/chair area subtle glow
    const mirrorGrad = ctx.createRadialGradient(width / 2, characterY, 20, width / 2, characterY, height * 0.6);
    mirrorGrad.addColorStop(0, 'rgba(179,157,218,0.06)');
    mirrorGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = mirrorGrad;
    ctx.fillRect(0, 0, width, height);

    // Draw target zone (behind hair for visibility)
    if (state === State.GROWING || state === State.CUT_RESULT) {
      drawTargetZone(ctx, timestamp);
    }

    // Draw character
    drawCharacter(ctx);

    // Draw hair
    drawHair(ctx, timestamp);

    // Draw cut flash
    drawCutFlash(ctx);

    // Draw scissor guide lines (subtle)
    if (state === State.GROWING) {
      const tipY = scalpY - currentHairHeight;
      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 15]);
      ctx.beginPath();
      ctx.moveTo(width * 0.2, tipY);
      ctx.lineTo(width * 0.8, tipY);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  // ===========================================
  // Input
  // ===========================================
  if (scissorsBtn) {
    scissorsBtn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      if (state === State.IDLE) {
        // First click starts the game
        currentRound = 0;
        totalScore = 0;
        perfects = 0;
        insultCount = 0;
        hudScore.textContent = '0';
        if (resultsEl) resultsEl.classList.add('hidden');
        startRound();
      } else if (state === State.GROWING) {
        doCut();
      }
    });
  }

  // Keyboard support
  document.addEventListener('keydown', (e) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      if (state === State.IDLE) {
        currentRound = 0;
        totalScore = 0;
        perfects = 0;
        insultCount = 0;
        hudScore.textContent = '0';
        if (resultsEl) resultsEl.classList.add('hidden');
        startRound();
      } else if (state === State.GROWING) {
        doCut();
      } else if (state === State.ENDED) {
        // Restart
        currentRound = 0;
        totalScore = 0;
        perfects = 0;
        insultCount = 0;
        hudScore.textContent = '0';
        if (resultsEl) resultsEl.classList.add('hidden');
        startRound();
      }
    }
  });

  // ===========================================
  // Start
  // ===========================================
  gameLoop._lastTs = performance.now();
  animId = requestAnimationFrame(gameLoop);

  // Draw initial idle state
  currentHairHeight = 25;

})();
