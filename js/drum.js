/* ============================================
   Century Birthday - Drum Game JS
   Taiko no Tatsujin Style
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
  const BEAT_DURATION = 60 / BPM; // 0.5s per beat
  const SCROLL_SPEED = 350; // px per second
  const LOOKAHEAD = 2.0; // seconds ahead to spawn notes
  const HIT_X = 0.22; // hit zone at 22% of canvas width (left side)
  const MISS_THRESHOLD = 0.08; // seconds past hit zone = miss

  // Judgment windows (seconds)
  const PERFECT_WINDOW = 0.025;
  const GOOD_WINDOW = 0.055;
  const OK_WINDOW = 0.090;

  // ===========================================
  // Happy Birthday Beatmap (120 BPM, 4/4)
  // Melody: G4 G4 A4 G4 C5 B4 (Happy birthday to you)
  //         G4 G4 A4 G4 D5 C5 (Happy birthday to you)
  //         G4 G4 G5 E5 C5 B4 A4 (Happy birthday dear Century)
  //         F5 F5 E5 C5 D5 C5 (Happy birthday to you)
  // Each entry: { beat, type:'don'|'ka', lane:'left'|'right' }
  // Beat 0 = first beat of the song
  // ===========================================
  function generateChart() {
    const chart = [];
    let b = 0; // beat counter

    // Measure 1: pickups + first phrase
    // "Hap-py Birth-day to you"
    // G4   G4    A4     G4   C5   B4
    // beat: 0    1      2     3    4    5
    chart.push({ beat: 0, type: 'don', lane: 'left' });   // G4
    b = 1;
    chart.push({ beat: 1, type: 'don', lane: 'left' });   // G4
    b = 2;
    chart.push({ beat: 2, type: 'don', lane: 'right' });  // A4
    b = 3;
    chart.push({ beat: 3, type: 'don', lane: 'left' });   // G4
    b = 4;
    chart.push({ beat: 4, type: 'ka', lane: 'right' });   // C5
    b = 5;
    chart.push({ beat: 5, type: 'don', lane: 'left' });   // B4
    b = 6;

    // Rest on beat 6-7
    b = 8;

    // Measure 2: "Hap-py Birth-day to you"
    // G4   G4    A4     G4   D5   C5
    chart.push({ beat: 8, type: 'don', lane: 'left' });   // G4
    chart.push({ beat: 9, type: 'don', lane: 'left' });   // G4
    chart.push({ beat: 10, type: 'ka', lane: 'right' });  // A4
    chart.push({ beat: 11, type: 'don', lane: 'left' });  // G4
    chart.push({ beat: 12, type: 'ka', lane: 'right' });  // D5
    chart.push({ beat: 13, type: 'don', lane: 'left' });  // C5
    b = 14;

    // Rest on beat 14-15
    b = 16;

    // Measure 3: "Hap-py Birth-day dear Cen-tu-ry"
    // G4   G4    G5     E5   C5   B4   A4
    chart.push({ beat: 16, type: 'don', lane: 'left' });  // G4
    chart.push({ beat: 17, type: 'don', lane: 'left' });  // G4
    chart.push({ beat: 18, type: 'ka', lane: 'right' });  // G5 (high!)
    chart.push({ beat: 19, type: 'ka', lane: 'left' });   // E5
    chart.push({ beat: 20, type: 'don', lane: 'left' });  // C5
    chart.push({ beat: 20.5, type: 'don', lane: 'right' });// B4 (eighth note)
    chart.push({ beat: 21, type: 'don', lane: 'left' });  // A4
    b = 22;

    // Rest on beat 22-23
    b = 24;

    // Measure 4: "Hap-py Birth-day to you"
    // F5   F5    E5     C5   D5   C5
    chart.push({ beat: 24, type: 'ka', lane: 'left' });   // F5
    chart.push({ beat: 25, type: 'ka', lane: 'left' });   // F5
    chart.push({ beat: 26, type: 'don', lane: 'right' }); // E5
    chart.push({ beat: 27, type: 'don', lane: 'left' });  // C5
    chart.push({ beat: 28, type: 'ka', lane: 'right' });  // D5
    chart.push({ beat: 29, type: 'don', lane: 'left' });  // C5 (final)
    b = 30;

    // Add a flourish section (8 more beats)
    b = 32;
    // "Happy Birthday!" (energetic finish)
    chart.push({ beat: 32, type: 'don', lane: 'left' });
    chart.push({ beat: 32.5, type: 'don', lane: 'right' });
    chart.push({ beat: 33, type: 'ka', lane: 'left' });
    chart.push({ beat: 33.5, type: 'ka', lane: 'right' });
    chart.push({ beat: 34, type: 'don', lane: 'left' });
    chart.push({ beat: 34.5, type: 'don', lane: 'left' });
    chart.push({ beat: 35, type: 'don', lane: 'right' });
    chart.push({ beat: 35.5, type: 'ka', lane: 'right' });

    chart.push({ beat: 36, type: 'don', lane: 'left' });
    chart.push({ beat: 36.5, type: 'don', lane: 'right' });
    chart.push({ beat: 37, type: 'ka', lane: 'left' });
    chart.push({ beat: 37.5, type: 'ka', lane: 'right' });
    chart.push({ beat: 38, type: 'don', lane: 'left' });
    chart.push({ beat: 38.5, type: 'don', lane: 'left' });
    chart.push({ beat: 38.75, type: 'don', lane: 'right' });
    chart.push({ beat: 39, type: 'ka', lane: 'left' });
    chart.push({ beat: 39.25, type: 'ka', lane: 'right' });
    chart.push({ beat: 39.5, type: 'don', lane: 'left' });
    chart.push({ beat: 39.75, type: 'don', lane: 'right' });

    return chart;
  }

  const chart = generateChart();
  const lastBeat = Math.max(...chart.map(n => n.beat));
  const TOTAL_DURATION = (lastBeat + 2) * BEAT_DURATION; // extra 2 beats buffer

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
  let drumX, drumY, drumW, drumH;
  let hitLineX;

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
    drumW = Math.min(140, width * 0.22);
    drumH = drumW * 1.25;
    drumX = width * HIT_X - drumW * 0.6;
    drumY = height * 0.5 - drumH * 0.15;
    hitLineX = width * HIT_X;
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
  class Note {
    constructor(beat, type, lane) {
      this.time = (beat + 1) * BEAT_DURATION; // +1 beat offset for count-in
      this.type = type; // 'don' or 'ka'
      this.lane = lane; // 'left' or 'right'
      this.x = 0;
      this.y = 0;
      this.hit = false;
      this.missed = false;
      this.radius = Math.min(28, width * 0.04);
    }

    update(et) {
      const dt = this.time - et;
      this.x = hitLineX + dt * SCROLL_SPEED;
      // Alternate y based on type for visual clarity
      this.y = height * 0.62 + (this.type === 'ka' ? -25 : 15);
    }

    draw(ctx) {
      if (this.hit || this.missed) return;

      const alpha = this.x > width + 50 ? 0 : (this.x < -50 ? 0 : 1);

      ctx.save();
      ctx.globalAlpha = alpha;

      // Shadow
      ctx.shadowColor = this.type === 'don' ? 'rgba(255,80,60,0.4)' : 'rgba(60,120,255,0.4)';
      ctx.shadowBlur = 12;

      // Note circle
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fillStyle = this.type === 'don' ? '#f04a3a' : '#3a7af0';
      ctx.fill();

      // Inner ring
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius * 0.65, 0, Math.PI * 2);
      ctx.fillStyle = this.type === 'don' ? '#d03020' : '#2050c0';
      ctx.fill();

      // Label
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${this.radius * 0.7}px var(--font-display)`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.type === 'don' ? '咚' : '咔', this.x, this.y);

      ctx.restore();
    }
  }

  // ===========================================
  // Effect Class (hit ring, score popup)
  // ===========================================
  class HitEffect {
    constructor(x, y, judgment, scorePopup) {
      this.x = x;
      this.y = y;
      this.judgment = judgment; // 'perfect', 'good', 'ok', 'miss'
      this.scorePopup = scorePopup;
      this.age = 0;
      this.maxAge = 0.45;
      this.done = false;
    }

    update(dt) {
      this.age += dt;
      if (this.age >= this.maxAge) this.done = true;
    }

    draw(ctx) {
      const progress = this.age / this.maxAge;
      const alpha = 1 - progress;
      const scale = 1 + progress * 1.5;

      ctx.save();
      ctx.globalAlpha = alpha;

      // Expanding ring
      ctx.beginPath();
      ctx.arc(this.x, this.y, 35 * scale, 0, Math.PI * 2);
      const colors = {
        perfect: 'rgba(240,215,140,0.7)',
        good: 'rgba(126,184,218,0.7)',
        ok: 'rgba(179,157,218,0.7)',
        miss: 'rgba(219,90,90,0.7)'
      };
      ctx.strokeStyle = colors[this.judgment] || colors.ok;
      ctx.lineWidth = 4;
      ctx.stroke();

      // Score popup text
      if (this.scorePopup) {
        const popColors = {
          perfect: '#f0d78c',
          good: '#7eb8da',
          ok: '#b39dda',
          miss: '#db5a5a'
        };
        ctx.fillStyle = popColors[this.judgment];
        ctx.font = 'bold 18px var(--font-display)';
        ctx.textAlign = 'center';
        ctx.fillText(this.scorePopup, this.x, this.y - 20 - progress * 40);

        // Judgment text
        const jpText = { perfect: 'Perfect!', good: 'Good', ok: 'OK', miss: 'Miss...' };
        ctx.font = 'bold 22px var(--font-display)';
        ctx.fillText(jpText[this.judgment], this.x, this.y - 45 - progress * 40);
      }

      ctx.restore();
    }
  }

  // ===========================================
  // Input Handling
  // ===========================================
  function hitDon() {
    if (state !== State.PLAYING) return;
    judgeHit('left');
    // Flash touch zone
    if (touchDon) {
      touchDon.classList.add('flash');
      setTimeout(() => touchDon.classList.remove('flash'), 80);
    }
  }

  function hitKa() {
    if (state !== State.PLAYING) return;
    judgeHit('right');
    if (touchKa) {
      touchKa.classList.add('flash');
      setTimeout(() => touchKa.classList.remove('flash'), 80);
    }
  }

  function judgeHit(lane) {
    // Find closest unhit note in the lane
    let bestNote = null;
    let bestDelta = Infinity;

    for (const note of notes) {
      if (note.hit || note.missed) continue;
      if (note.lane !== lane) continue;

      const delta = Math.abs(note.time - elapsedTime);
      if (delta < bestDelta) {
        bestDelta = delta;
        bestNote = note;
      }
    }

    if (!bestNote) return;

    let judgment, baseScore;
    if (bestDelta <= PERFECT_WINDOW) {
      judgment = 'perfect';
      baseScore = 300;
      perfects++;
    } else if (bestDelta <= GOOD_WINDOW) {
      judgment = 'good';
      baseScore = 200;
      goods++;
    } else if (bestDelta <= OK_WINDOW) {
      judgment = 'ok';
      baseScore = 100;
      oks++;
    } else {
      judgment = 'miss';
      baseScore = 0;
      misses++;
    }

    bestNote.hit = true;
    totalHits++;

    if (judgment !== 'miss') {
      combo++;
      if (combo > maxCombo) maxCombo = combo;
      // Combo multiplier
      let mult = 1.0;
      if (combo >= 50) mult = 2.0;
      else if (combo >= 30) mult = 1.5;
      else if (combo >= 10) mult = 1.2;
      score += Math.floor(baseScore * mult);

      // Sound
      if (bestNote.type === 'don') SoundEngine.playDon();
      else SoundEngine.playKa();
    } else {
      combo = 0;
    }

    // Update HUD
    updateHUD();

    // Show judgment popup
    showJudgment(judgment, baseScore);

    // Add hit effect
    const fxY = height * 0.58;
    effects.push(new HitEffect(hitLineX, fxY, judgment, judgment === 'miss' ? null : '+' + score));
  }

  // ===========================================
  // HUD & Judgment Display
  // ===========================================
  function updateHUD() {
    hudScore.textContent = score.toLocaleString();

    if (combo > 0) {
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

  function showJudgment(judgment, points) {
    if (judgmentPopup) {
      const texts = { perfect: 'Perfect!', good: 'Good', ok: 'OK', miss: 'Miss' };
      judgmentPopup.textContent = texts[judgment];
      const colors = { perfect: '#f0d78c', good: '#7eb8da', ok: '#b39dda', miss: '#db5a5a' };
      judgmentPopup.style.color = colors[judgment];
      judgmentPopup.style.opacity = '1';
      judgmentPopup.style.transform = 'translate(-50%, -50%) scale(1.2)';

      setTimeout(() => {
        judgmentPopup.style.transition = 'all 0.4s ease-out';
        judgmentPopup.style.opacity = '0';
        judgmentPopup.style.transform = 'translate(-50%, -50%) scale(0.8)';
      }, 50);

      setTimeout(() => {
        judgmentPopup.style.transition = 'none';
      }, 500);
    }
  }

  // ===========================================
  // Keyboard Input
  // ===========================================
  document.addEventListener('keydown', (e) => {
    if (state === State.IDLE) {
      startGame();
      return;
    }
    if (e.key === 'f' || e.key === 'F') { hitDon(); e.preventDefault(); }
    if (e.key === 'j' || e.key === 'J') { hitKa(); e.preventDefault(); }
    if (e.key === 'd' || e.key === 'D') { hitDon(); e.preventDefault(); }
    if (e.key === 'k' || e.key === 'K') { hitKa(); e.preventDefault(); }
    // Allow space to restart
    if (e.key === ' ' && state === State.ENDED) { restartGame(); e.preventDefault(); }
  });

  // ===========================================
  // Touch Input
  // ===========================================
  if (touchDon) {
    touchDon.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      if (state === State.IDLE) startGame();
      else hitDon();
    });
  }

  if (touchKa) {
    touchKa.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      if (state === State.IDLE) startGame();
      else hitKa();
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
    score = 0;
    combo = 0;
    maxCombo = 0;
    totalHits = 0;
    perfects = 0;
    goods = 0;
    oks = 0;
    misses = 0;
    hudScore.textContent = '0';
    hudCombo.classList.remove('active');
    hudAccuracy.textContent = '--%';
    if (resultsEl) resultsEl.classList.add('hidden');

    if (countdownEl) {
      countdownEl.classList.add('show');
      countdownEl.textContent = '3';
    }

    // Start animation if not running
    if (!animId) animId = requestAnimationFrame(gameLoop);
  }

  function restartGame() {
    state = State.IDLE;
    notes = [];
    effects = [];
    nextNoteIdx = 0;
    score = 0; combo = 0; maxCombo = 0;
    totalHits = 0; perfects = 0; goods = 0; oks = 0; misses = 0;
    hudScore.textContent = '0';
    hudCombo.classList.remove('active');
    hudAccuracy.textContent = '--%';
    if (resultsEl) resultsEl.classList.add('hidden');
    if (countdownEl) countdownEl.classList.remove('show');
    startGame();
  }

  function endGame() {
    state = State.ENDED;
    // Show results
    showResults();
  }

  function showResults() {
    if (!resultsEl) return;
    resultsEl.classList.remove('hidden');

    const totalNotes = chart.length;
    const accuracyPercent = totalHits > 0
      ? ((perfects * 100 + goods * 80 + oks * 50) / (totalNotes * 100) * 100).toFixed(1)
      : '0.0';

    // Calculate grade
    const accNum = parseFloat(accuracyPercent);
    let grade;
    if (accNum >= 95 && misses <= 2) grade = 'S';
    else if (accNum >= 90) grade = 'A';
    else if (accNum >= 75) grade = 'B';
    else if (accNum >= 60) grade = 'C';
    else grade = 'D';

    document.getElementById('results-grade').textContent = grade;
    document.getElementById('res-score').textContent = score.toLocaleString();
    document.getElementById('res-maxcombo').textContent = maxCombo;
    document.getElementById('res-accuracy').textContent = accuracyPercent + '%';
    document.getElementById('res-perfect').textContent = perfects;
    document.getElementById('res-good').textContent = goods;
    document.getElementById('res-ok').textContent = oks;
    document.getElementById('res-miss').textContent = misses;

    // Save to sessionStorage
    STORE.setBool('drum_complete', true);
    STORE.set('drum_score', score.toString());
    STORE.set('drum_grade', grade);

    // Play chime
    SoundEngine.playChime();
  }

  // ===========================================
  // Main Game Loop
  // ===========================================
  function gameLoop(timestamp) {
    animId = requestAnimationFrame(gameLoop);

    const dt = Math.min(0.05, (timestamp - (gameLoop._lastTs || timestamp)) / 1000);
    gameLoop._lastTs = timestamp;

    // --- Clear ---
    ctx.clearRect(0, 0, width, height);

    // Background
    const bgGrad = ctx.createLinearGradient(0, 0, width, 0);
    bgGrad.addColorStop(0, '#0a0820');
    bgGrad.addColorStop(0.3, '#100d2a');
    bgGrad.addColorStop(1, '#0a0820');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Scroll lane line
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    ctx.setLineDash([8, 30]);
    ctx.beginPath();
    ctx.moveTo(0, height * 0.55);
    ctx.lineTo(width, height * 0.55);
    ctx.stroke();
    ctx.setLineDash([]);

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
            // Start playing!
            state = State.PLAYING;
            startTime = performance.now();
            if (countdownEl) {
              countdownEl.classList.remove('show');
            }
          } else {
            if (countdownEl) {
              countdownEl.textContent = countdownValue;
              countdownEl.classList.add('show');
              setTimeout(() => countdownEl.classList.remove('show'), 900);
            }
          }
        }
        break;

      case State.PLAYING:
        elapsedTime = (performance.now() - startTime) / 1000;

        // Spawn notes
        while (nextNoteIdx < chart.length &&
               (chart[nextNoteIdx].beat + 1) * BEAT_DURATION - elapsedTime <= LOOKAHEAD) {
          const c = chart[nextNoteIdx];
          notes.push(new Note(c.beat, c.type, c.lane));
          nextNoteIdx++;
        }

        // Update & check for misses
        for (const note of notes) {
          note.update(elapsedTime);
          // Miss check
          if (!note.hit && !note.missed && note.x < hitLineX - MISS_THRESHOLD * SCROLL_SPEED) {
            note.missed = true;
            misses++;
            combo = 0;
            totalHits++;
            updateHUD();
            showJudgment('miss', 0);
            effects.push(new HitEffect(hitLineX, height * 0.58, 'miss', null));
          }
        }

        // Draw notes
        for (const note of notes) {
          note.draw(ctx);
        }

        // End check
        if (elapsedTime >= TOTAL_DURATION) {
          endGame();
        }
        break;

      case State.ENDED:
        // Still draw any remaining notes faded
        for (const note of notes) {
          if (!note.hit && !note.missed) {
            note.update(elapsedTime || TOTAL_DURATION);
            note.draw(ctx);
          }
        }
        break;
    }

    // --- Update & Draw Effects ---
    for (let i = effects.length - 1; i >= 0; i--) {
      effects[i].update(dt);
      effects[i].draw(ctx);
      if (effects[i].done) effects.splice(i, 1);
    }

    // --- Draw Hit Line ---
    ctx.strokeStyle = 'rgba(240,215,140,0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(hitLineX, height * 0.35);
    ctx.lineTo(hitLineX, height * 0.75);
    ctx.stroke();

    // --- Idle prompt ---
    if (state === State.IDLE) {
      const alpha = 0.5 + Math.sin(timestamp * 0.003) * 0.3;
      ctx.fillStyle = `rgba(240,215,140,${alpha})`;
      ctx.font = '1.2rem var(--font-display)';
      ctx.textAlign = 'center';
      ctx.fillText('按 F/J 或点击屏幕开始', width * 0.5, height * 0.85);
    }
  }

  // Start the render loop immediately (idle animation)
  gameLoop._lastTs = performance.now();
  animId = requestAnimationFrame(gameLoop);

  // ===========================================
  // Draw Drum (on canvas)
  // ===========================================
  function drawDrum(ctx) {
    const cx = drumX + drumW * 0.55;
    const cy = drumY + drumH * 0.5;

    // Glow behind drum
    const glowGrad = ctx.createRadialGradient(cx, cy, drumW * 0.2, cx, cy, drumW * 0.7);
    glowGrad.addColorStop(0, 'rgba(240,215,140,0.08)');
    glowGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, drumW * 0.7, 0, Math.PI * 2);
    ctx.fill();

    const bw = drumW * 0.75;
    const bh = drumW * 0.55;

    // Drum body
    ctx.fillStyle = '#3a2510';
    ctx.strokeStyle = '#d4a853';
    ctx.lineWidth = 2.5;
    const r = 6;
    const rx = cx - bw, ry = cy - bh * 0.4, rw = bw * 2, rh = bh * 0.95;
    ctx.beginPath();
    ctx.moveTo(rx + r, ry);
    ctx.lineTo(rx + rw - r, ry);
    ctx.arcTo(rx + rw, ry, rx + rw, ry + r, r);
    ctx.lineTo(rx + rw, ry + rh - r);
    ctx.arcTo(rx + rw, ry + rh, rx + rw - r, ry + rh, r);
    ctx.lineTo(rx + r, ry + rh);
    ctx.arcTo(rx, ry + rh, rx, ry + rh - r, r);
    ctx.lineTo(rx, ry + r);
    ctx.arcTo(rx, ry, rx + r, ry, r);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Drum head (top ellipse)
    ctx.fillStyle = '#f0e8d8';
    ctx.strokeStyle = '#d4a853';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(cx, cy - bh * 0.35, bw, bh * 0.28, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Inner rings
    ctx.strokeStyle = '#d0c8b8';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(cx, cy - bh * 0.35, bw * 0.85, bh * 0.22, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.ellipse(cx, cy - bh * 0.35, bw * 0.4, bh * 0.1, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Bottom rim
    ctx.fillStyle = '#2a1a08';
    ctx.strokeStyle = '#a67c30';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(cx, cy + bh * 0.5, bw * 0.92, bh * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Left zone indicator (don)
    ctx.fillStyle = 'rgba(240,74,58,0.12)';
    ctx.beginPath();
    ctx.arc(cx - bw * 0.4, cy - bh * 0.1, bw * 0.35, 0, Math.PI * 2);
    ctx.fill();

    // Right zone indicator (ka)
    ctx.fillStyle = 'rgba(58,122,240,0.12)';
    ctx.beginPath();
    ctx.arc(cx + bw * 0.4, cy - bh * 0.1, bw * 0.3, 0, Math.PI * 2);
    ctx.fill();

    // Don label
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.font = `bold ${bw * 0.2}px var(--font-display)`;
    ctx.textAlign = 'center';
    ctx.fillText('咚', cx - bw * 0.4, cy - bh * 0.1 + 5);

    // Ka label
    ctx.fillText('咔', cx + bw * 0.4, cy - bh * 0.1 + 5);

    // Stand legs
    ctx.strokeStyle = '#6a5a3a';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    // Left leg
    ctx.beginPath();
    ctx.moveTo(cx - bw * 0.4, cy + bh * 0.5);
    ctx.lineTo(cx - bw * 0.65, cy + bh * 1.5);
    ctx.stroke();
    // Right leg
    ctx.beginPath();
    ctx.moveTo(cx + bw * 0.2, cy + bh * 0.5);
    ctx.lineTo(cx + bw * 0.5, cy + bh * 1.5);
    ctx.stroke();
  }

})();
