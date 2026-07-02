/* ============================================
   Century Birthday - Drum Game JS
   Single Track, Red/Blue Notes
   ============================================ */

(function() {
  const { BGM, STORE, SoundEngine } = window.CenturyApp;

  // ===========================================
  // DOM Elements
  // ===========================================
  const canvas = document.getElementById('drum-canvas');
  const ctx = canvas.getContext('2d');
  const touchDon = document.getElementById('touch-don');
  const touchKa = document.getElementById('touch-ka');
  const hudScore = document.getElementById('hud-score');
  const hudCombo = document.getElementById('hud-combo');
  const hudAccuracy = document.getElementById('hud-accuracy');
  const countdownEl = document.getElementById('countdown');
  const judgmentPopup = document.getElementById('judgment-popup');
  const resultsEl = document.getElementById('results');

  // ===========================================
  // Constants
  // ===========================================
  const BPM = 120;
  const BEAT_DURATION = 60 / BPM;
  const SCROLL_SPEED = 280; // slower for easier play
  const LOOKAHEAD = 2.5;
  const HIT_X = 0.2;
  const MISS_THRESHOLD = 0.10;

  // Wider judgment windows (seconds)
  const PERFECT_WINDOW = 0.050;
  const GOOD_WINDOW = 0.100;
  const OK_WINDOW = 0.150;

  // ===========================================
  // Beatmap - Happy Birthday (simplified, single track)
  // type: 'don'(red→F/left touch) | 'ka'(blue→J/right touch)
  // ===========================================
  function generateChart() {
    const c = [];

    // Phrase 1: Happy birthday to you (beats 0-7)
    c.push({ beat: 0, type: 'don' });  // Hap-
    c.push({ beat: 1, type: 'don' });  // -py
    c.push({ beat: 2, type: 'ka'  });  // Birth-
    c.push({ beat: 3, type: 'don' });  // -day
    c.push({ beat: 4, type: 'ka'  });  // to
    c.push({ beat: 5, type: 'don' });  // you
    // beat 6-7 rest

    // Phrase 2: Happy birthday to you (beats 8-15)
    c.push({ beat: 8,  type: 'don' });
    c.push({ beat: 9,  type: 'don' });
    c.push({ beat: 10, type: 'ka'  });
    c.push({ beat: 11, type: 'don' });
    c.push({ beat: 12, type: 'ka'  });
    c.push({ beat: 13, type: 'don' });
    // beat 14-15 rest

    // Phrase 3: Happy birthday dear Century (beats 16-23)
    c.push({ beat: 16, type: 'don' });
    c.push({ beat: 17, type: 'don' });
    c.push({ beat: 18, type: 'ka'  });  // high note
    c.push({ beat: 19, type: 'ka'  });
    c.push({ beat: 20, type: 'don' });
    c.push({ beat: 21, type: 'don' });
    // beat 22-23 rest

    // Phrase 4: Happy birthday to you (beats 24-31)
    c.push({ beat: 24, type: 'ka'  });
    c.push({ beat: 25, type: 'ka'  });
    c.push({ beat: 26, type: 'don' });
    c.push({ beat: 27, type: 'don' });
    c.push({ beat: 28, type: 'ka'  });
    c.push({ beat: 29, type: 'don' });  // final note
    // beat 30-31 rest (hold)

    return c;
  }

  const chart = generateChart();
  const lastBeat = Math.max(...chart.map(n => n.beat));
  const TOTAL_DURATION = (lastBeat + 3) * BEAT_DURATION;

  // ===========================================
  // Game State
  // ===========================================
  const State = { IDLE: 'idle', COUNTDOWN: 'countdown', PLAYING: 'playing', ENDED: 'ended' };
  let state = State.IDLE;
  let notes = [];
  let effects = [];
  let nextNoteIdx = 0;

  let score = 0;
  let combo = 0;
  let maxCombo = 0;
  let totalHits = 0;
  let perfects = 0, goods = 0, oks = 0, misses = 0;

  let startTime = 0;
  let elapsedTime = 0;
  let animId = null;

  let width, height;
  let trackY, hitLineX;
  let drumShake = 0; // screen shake on hit

  // Countdown
  let countdownValue = 0;
  let countdownTimer = 0;

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
    hitLineX = width * HIT_X;
    trackY = height * 0.52;
  }

  resize();
  updateLayout();

  window.addEventListener('resize', () => {
    resize();
    updateLayout();
  });

  // ===========================================
  // Note Class
  // ===========================================
  const NOTE_RADIUS = 32;

  class Note {
    constructor(beat, type) {
      this.time = (beat + 1) * BEAT_DURATION;
      this.type = type; // 'don' (red) or 'ka' (blue)
      this.x = 0;
      this.y = trackY;
      this.hit = false;
      this.missed = false;
    }

    update(et) {
      const dt = this.time - et;
      this.x = hitLineX + dt * SCROLL_SPEED;
    }

    draw(ctx) {
      if (this.hit || this.missed) return;
      if (this.x < -60 || this.x > width + 60) return;

      const isRed = this.type === 'don';

      ctx.save();

      // Glow
      const glowGrad = ctx.createRadialGradient(this.x, this.y, NOTE_RADIUS * 0.5, this.x, this.y, NOTE_RADIUS * 1.4);
      glowGrad.addColorStop(0, isRed ? 'rgba(255,100,70,0.5)' : 'rgba(70,140,255,0.5)');
      glowGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(this.x, this.y, NOTE_RADIUS * 1.4, 0, Math.PI * 2);
      ctx.fill();

      // Main circle
      const bodyGrad = ctx.createRadialGradient(this.x - 6, this.y - 6, NOTE_RADIUS * 0.1, this.x, this.y, NOTE_RADIUS);
      bodyGrad.addColorStop(0, isRed ? '#ff6b5b' : '#6ba0ff');
      bodyGrad.addColorStop(0.6, isRed ? '#d04030' : '#3060d0');
      bodyGrad.addColorStop(1, isRed ? '#902020' : '#204090');
      ctx.fillStyle = bodyGrad;
      ctx.beginPath();
      ctx.arc(this.x, this.y, NOTE_RADIUS, 0, Math.PI * 2);
      ctx.fill();

      // Border
      ctx.strokeStyle = isRed ? '#ffaaa0' : '#a0c0ff';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Label
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 20px "Microsoft YaHei", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(isRed ? '咚' : '咔', this.x, this.y);

      ctx.restore();
    }
  }

  // ===========================================
  // Hit Effect
  // ===========================================
  class HitEffect {
    constructor(x, y, judgment) {
      this.x = x;
      this.y = y;
      this.judgment = judgment;
      this.age = 0;
      this.maxAge = 0.6;
      this.done = false;
    }

    update(dt) {
      this.age += dt;
      if (this.age >= this.maxAge) this.done = true;
    }

    draw(ctx) {
      const progress = this.age / this.maxAge;
      const alpha = 1 - progress;

      ctx.save();
      ctx.globalAlpha = alpha;

      // Expanding ring
      const ringColors = {
        perfect: '#f0d78c',
        good: '#7eb8da',
        ok: '#b39dda',
        miss: '#db5a5a'
      };

      ctx.strokeStyle = ringColors[this.judgment];
      ctx.lineWidth = 4 + (1 - progress) * 4;
      ctx.beginPath();
      ctx.arc(this.x, this.y, NOTE_RADIUS + progress * 50, 0, Math.PI * 2);
      ctx.stroke();

      // Judgment text (big!)
      const texts = { perfect: 'Perfect!', good: 'Good', ok: 'OK', miss: 'Miss' };
      const fontSize = 28 + (1 - progress) * 20;
      ctx.font = `bold ${fontSize}px "Cinzel", serif`;
      ctx.fillStyle = ringColors[this.judgment];
      ctx.textAlign = 'center';
      ctx.fillText(texts[this.judgment], this.x, this.y - NOTE_RADIUS - 20 - progress * 30);

      ctx.restore();
    }
  }

  // ===========================================
  // Input Handling
  // ===========================================
  function hitDon() {
    if (state !== State.PLAYING) return;
    judgeHit('don');
    flashZone(touchDon);
  }

  function hitKa() {
    if (state !== State.PLAYING) return;
    judgeHit('ka');
    flashZone(touchKa);
  }

  function flashZone(el) {
    if (!el) return;
    el.classList.add('flash');
    setTimeout(() => el.classList.remove('flash'), 100);
  }

  function judgeHit(type) {
    let bestNote = null;
    let bestDelta = Infinity;

    for (const note of notes) {
      if (note.hit || note.missed) continue;
      if (note.type !== type) continue;

      const delta = Math.abs(note.time - elapsedTime);
      if (delta < bestDelta) {
        bestDelta = delta;
        bestNote = note;
      }
    }

    if (!bestNote) return;

    let judgment, baseScore;
    if (bestDelta <= PERFECT_WINDOW) {
      judgment = 'perfect'; baseScore = 300; perfects++;
    } else if (bestDelta <= GOOD_WINDOW) {
      judgment = 'good'; baseScore = 200; goods++;
    } else if (bestDelta <= OK_WINDOW) {
      judgment = 'ok'; baseScore = 100; oks++;
    } else {
      judgment = 'miss'; baseScore = 0; misses++;
    }

    bestNote.hit = true;
    totalHits++;

    if (judgment !== 'miss') {
      combo++;
      if (combo > maxCombo) maxCombo = combo;
      let mult = 1.0;
      if (combo >= 40) mult = 2.0;
      else if (combo >= 20) mult = 1.5;
      else if (combo >= 8) mult = 1.2;
      score += Math.floor(baseScore * mult);

      if (bestNote.type === 'don') SoundEngine.playDon();
      else SoundEngine.playKa();

      drumShake = 0.08;
    } else {
      combo = 0;
    }

    updateHUD();
    showJudgment(judgment);
    effects.push(new HitEffect(hitLineX, trackY, judgment));
  }

  // ===========================================
  // HUD
  // ===========================================
  function updateHUD() {
    hudScore.textContent = score.toLocaleString();

    if (combo >= 4) {
      hudCombo.textContent = combo + ' 连击';
      hudCombo.classList.add('active');
    } else {
      hudCombo.classList.remove('active');
    }

    if (totalHits > 0) {
      const acc = ((perfects * 100 + goods * 80 + oks * 50) / (totalHits * 100) * 100).toFixed(0);
      hudAccuracy.textContent = acc + '%';
    }
  }

  function showJudgment(judgment) {
    if (!judgmentPopup) return;
    const texts = { perfect: 'Perfect!', good: 'Good', ok: 'OK', miss: 'Miss' };
    const colors = { perfect: '#f0d78c', good: '#7eb8da', ok: '#b39dda', miss: '#db5a5a' };
    judgmentPopup.textContent = texts[judgment];
    judgmentPopup.style.color = colors[judgment];
    judgmentPopup.style.fontSize = judgment === 'perfect' ? '3rem' : '2.2rem';
    judgmentPopup.style.opacity = '1';
    judgmentPopup.style.transform = 'translate(-50%, -50%) scale(1.3)';

    setTimeout(() => {
      judgmentPopup.style.transition = 'all 0.5s ease-out';
      judgmentPopup.style.opacity = '0';
      judgmentPopup.style.transform = 'translate(-50%, -50%) scale(0.6)';
    }, 80);

    setTimeout(() => {
      judgmentPopup.style.transition = 'none';
      judgmentPopup.style.fontSize = '2rem';
    }, 600);
  }

  // ===========================================
  // Keyboard
  // ===========================================
  document.addEventListener('keydown', (e) => {
    if (state === State.IDLE) { startGame(); return; }
    if (e.key === 'f' || e.key === 'F' || e.key === 'd' || e.key === 'D') { hitDon(); e.preventDefault(); }
    if (e.key === 'j' || e.key === 'J' || e.key === 'k' || e.key === 'K') { hitKa(); e.preventDefault(); }
    if (e.key === ' ' && state === State.ENDED) { restartGame(); e.preventDefault(); }
  });

  // ===========================================
  // Touch
  // ===========================================
  if (touchDon) {
    touchDon.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      if (state === State.IDLE) startGame(); else hitDon();
    });
  }
  if (touchKa) {
    touchKa.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      if (state === State.IDLE) startGame(); else hitKa();
    });
  }

  // ===========================================
  // Game Flow
  // ===========================================
  function startGame() {
    if (state === State.PLAYING) return;
    state = State.COUNTDOWN;
    countdownValue = 3;
    countdownTimer = 0;
    nextNoteIdx = 0;
    notes = [];
    effects = [];
    score = 0; combo = 0; maxCombo = 0;
    totalHits = 0; perfects = 0; goods = 0; oks = 0; misses = 0;
    drumShake = 0;
    hudScore.textContent = '0';
    hudCombo.classList.remove('active');
    hudAccuracy.textContent = '--%';
    if (resultsEl) resultsEl.classList.add('hidden');

    if (countdownEl) {
      countdownEl.classList.add('show');
      countdownEl.textContent = '3';
    }

    if (!animId) animId = requestAnimationFrame(gameLoop);
  }

  function restartGame() {
    state = State.IDLE;
    notes = []; effects = []; nextNoteIdx = 0;
    score = 0; combo = 0; maxCombo = 0;
    totalHits = 0; perfects = 0; goods = 0; oks = 0; misses = 0;
    drumShake = 0;
    hudScore.textContent = '0';
    hudCombo.classList.remove('active');
    hudAccuracy.textContent = '--%';
    if (resultsEl) resultsEl.classList.add('hidden');
    if (countdownEl) countdownEl.classList.remove('show');
    startGame();
  }

  function endGame() {
    state = State.ENDED;
    showResults();
  }

  function showResults() {
    if (!resultsEl) return;
    resultsEl.classList.remove('hidden');

    const totalNotes = chart.length;
    const accNum = totalHits > 0
      ? (perfects * 100 + goods * 80 + oks * 50) / (totalNotes * 100) * 100
      : 0;

    let grade;
    if (accNum >= 95 && misses <= 1) grade = 'S';
    else if (accNum >= 85) grade = 'A';
    else if (accNum >= 70) grade = 'B';
    else if (accNum >= 50) grade = 'C';
    else grade = 'D';

    document.getElementById('results-grade').textContent = grade;
    document.getElementById('res-score').textContent = score.toLocaleString();
    document.getElementById('res-maxcombo').textContent = maxCombo;
    document.getElementById('res-accuracy').textContent = accNum.toFixed(1) + '%';
    document.getElementById('res-perfect').textContent = perfects;
    document.getElementById('res-good').textContent = goods;
    document.getElementById('res-ok').textContent = oks;
    document.getElementById('res-miss').textContent = misses;

    STORE.setBool('drum_complete', true);
    STORE.set('drum_score', score.toString());
    STORE.set('drum_grade', grade);

    SoundEngine.playChime();
  }

  // ===========================================
  // Draw Drum
  // ===========================================
  function drawDrum(ctx) {
    const cx = hitLineX;
    const cy = trackY;
    const r = NOTE_RADIUS + 8;

    // Apply drum shake
    let shakeX = 0, shakeY = 0;
    if (drumShake > 0) {
      shakeX = (Math.random() - 0.5) * drumShake * 30;
      shakeY = (Math.random() - 0.5) * drumShake * 30;
    }
    const dx = cx + shakeX;
    const dy = cy + shakeY;

    // Combo glow
    if (combo >= 8) {
      const glowAlpha = Math.min(0.6, combo * 0.02);
      const glowGrad = ctx.createRadialGradient(dx, dy, r * 0.6, dx, dy, r * 2.5);
      glowGrad.addColorStop(0, `rgba(240,215,140,${glowAlpha})`);
      glowGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(dx, dy, r * 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Outer ring
    ctx.strokeStyle = '#d4a853';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(dx, dy, r, 0, Math.PI * 2);
    ctx.stroke();

    // Inner drum face
    const faceGrad = ctx.createRadialGradient(dx - 3, dy - 3, r * 0.1, dx, dy, r * 0.9);
    faceGrad.addColorStop(0, '#f5f0e8');
    faceGrad.addColorStop(1, '#d8d0c0');
    ctx.fillStyle = faceGrad;
    ctx.beginPath();
    ctx.arc(dx, dy, r - 5, 0, Math.PI * 2);
    ctx.fill();

    // Cross pattern (snare)
    ctx.strokeStyle = 'rgba(200,190,170,0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(dx - r + 12, dy); ctx.lineTo(dx + r - 12, dy);
    ctx.moveTo(dx, dy - r + 12); ctx.lineTo(dx, dy + r - 12);
    ctx.stroke();

    // Labels
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.font = 'bold 12px "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('F 咚', dx, dy - r - 22);
    ctx.fillText('J 咔', dx, dy - r - 6);
  }

  // ===========================================
  // Main Game Loop
  // ===========================================
  function gameLoop(timestamp) {
    animId = requestAnimationFrame(gameLoop);

    const dt = Math.min(0.05, (timestamp - (gameLoop._lastTs || timestamp)) / 1000);
    gameLoop._lastTs = timestamp;

    // Update shake
    if (drumShake > 0) drumShake = Math.max(0, drumShake - dt);

    // --- Clear & Background ---
    ctx.clearRect(0, 0, width, height);

    const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
    bgGrad.addColorStop(0, '#0c0a20');
    bgGrad.addColorStop(0.5, '#100d28');
    bgGrad.addColorStop(1, '#0a0818');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Subtle track lane
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, trackY);
    ctx.lineTo(width, trackY);
    ctx.stroke();

    // --- Draw Drum ---
    drawDrum(ctx);

    // --- State Machine ---
    switch (state) {
      case State.COUNTDOWN:
        countdownTimer += dt;
        if (countdownTimer >= 1.0) {
          countdownValue--;
          countdownTimer = 0;
          if (countdownValue <= 0) {
            state = State.PLAYING;
            startTime = performance.now();
            if (countdownEl) countdownEl.classList.remove('show');
          } else {
            if (countdownEl) {
              countdownEl.textContent = countdownValue;
              countdownEl.classList.add('show');
              setTimeout(() => countdownEl.classList.remove('show'), 850);
            }
          }
        }
        break;

      case State.PLAYING:
        elapsedTime = (performance.now() - startTime) / 1000;

        // Spawn notes
        while (nextNoteIdx < chart.length &&
               (chart[nextNoteIdx].beat + 1) * BEAT_DURATION - elapsedTime <= LOOKAHEAD) {
          notes.push(new Note(chart[nextNoteIdx].beat, chart[nextNoteIdx].type));
          nextNoteIdx++;
        }

        // Update notes & miss check
        for (const note of notes) {
          note.update(elapsedTime);
          if (!note.hit && !note.missed && note.x < hitLineX - MISS_THRESHOLD * SCROLL_SPEED) {
            note.missed = true;
            misses++;
            combo = 0;
            totalHits++;
            updateHUD();
            showJudgment('miss');
            effects.push(new HitEffect(hitLineX, trackY, 'miss'));
          }
        }

        // Draw notes
        for (const note of notes) note.draw(ctx);

        // Check end
        if (elapsedTime >= TOTAL_DURATION) endGame();
        break;

      case State.ENDED:
        for (const note of notes) {
          if (!note.hit && !note.missed) {
            note.update(elapsedTime || TOTAL_DURATION);
            note.draw(ctx);
          }
        }
        break;
    }

    // --- Effects ---
    for (let i = effects.length - 1; i >= 0; i--) {
      effects[i].update(dt);
      effects[i].draw(ctx);
      if (effects[i].done) effects.splice(i, 1);
    }

    // --- Idle prompt ---
    if (state === State.IDLE) {
      const alpha = 0.5 + Math.sin(timestamp * 0.003) * 0.3;
      ctx.fillStyle = `rgba(240,215,140,${alpha})`;
      ctx.font = '1.1rem "Cinzel", serif';
      ctx.textAlign = 'center';
      ctx.fillText('按 F / J 或点击屏幕开始', width * 0.5, height * 0.85);
    }
  }

  // Start
  gameLoop._lastTs = performance.now();
  animId = requestAnimationFrame(gameLoop);

})();
