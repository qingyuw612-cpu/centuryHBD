/* ============================================
   Century Birthday - Drum Game JS
   Rhythm Master Style - 4 Tracks
   ============================================ */

(function() {
  const { BGM, STORE, SoundEngine } = window.CenturyApp;

  // ===========================================
  // DOM Elements
  // ===========================================
  const canvas = document.getElementById('drum-canvas');
  const ctx = canvas.getContext('2d');
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
  const FALL_SPEED = 250; // px per second (slower)
  const LOOKAHEAD = 3.0;  // spawn earlier so notes enter smoothly
  const HIT_Y_RATIO = 0.80;
  const MISS_THRESHOLD = 0.20; // notes linger longer after hit line

  // Judgment windows (seconds)
  const PERFECT_WINDOW = 0.050;
  const GOOD_WINDOW = 0.100;
  const OK_WINDOW = 0.150;

  // Track config: { key, label, color, sound }
  const TRACKS = [
    { id: 0, key: 'd', label: '底鼓', color: '#ff6b5b', glowColor: 'rgba(255,100,80,0.6)', sound: 'kick' },
    { id: 1, key: 'f', label: '军鼓', color: '#f0d78c', glowColor: 'rgba(240,215,140,0.6)', sound: 'snare' },
    { id: 2, key: 'j', label: '踩镲', color: '#7eb8da', glowColor: 'rgba(126,184,218,0.6)', sound: 'hihat' },
    { id: 3, key: 'k', label: '吊镲', color: '#b39dda', glowColor: 'rgba(179,157,218,0.6)', sound: 'crash' },
  ];

  // ===========================================
  // Drum Beatmap - Happy Birthday accompaniment
  // beat 0-31, 4/4 time, 120 BPM
  // A proper drum pattern:
  //   Kick on beats 1, 3 | Snare on beats 2, 4
  //   Hi-hat eighth notes | Crash on phrase endings
  // ===========================================
  function generateChart() {
    const c = [];

    // Helper: add note at beat for a track
    function n(beat, trackId) { c.push({ beat, track: trackId }); }

    // === Phrase 1 (beats 0-7): "Happy birthday to you" ===
    // Kick on 1 & 3
    n(0, 0); n(2, 0); n(4, 0); n(6, 0);
    // Snare on 2 & 4
    n(1, 1); n(3, 1); n(5, 1);
    // Hi-hat quarter notes
    for (let b = 0; b <= 6; b++) n(b, 2);
    // Crash on phrase end
    n(5.5, 3);

    // === Phrase 2 (beats 8-15): "Happy birthday to you" ===
    n(8, 0); n(10, 0); n(12, 0); n(14, 0);
    n(9, 1); n(11, 1); n(13, 1);
    for (let b = 8; b <= 14; b++) n(b, 2);
    n(13.5, 3);

    // === Phrase 3 (beats 16-23): "Happy birthday dear Century" ===
    n(16, 0); n(18, 0); n(20, 0); n(22, 0);
    n(17, 1); n(19, 1); n(21, 1);
    for (let b = 16; b <= 22; b++) n(b, 2);
    n(18.5, 3); n(21.5, 3);

    // === Phrase 4 (beats 24-31): "Happy birthday to you" (final) ===
    n(24, 0); n(26, 0); n(28, 0); n(30, 0);
    n(25, 1); n(27, 1); n(29, 1);
    for (let b = 24; b <= 30; b++) n(b, 2);
    n(29, 3); n(29.5, 3);

    return c;
  }

  const chart = generateChart().sort((a, b) => a.beat - b.beat); // MUST sort by beat!
  const lastBeat = Math.max(...chart.map(n => n.beat));
  const TOTAL_DURATION = (lastBeat + 3) * BEAT_DURATION;

  // ===========================================
  // Melody Player
  // ===========================================
  const MELODY_NOTES = [
    { beat: 0, freq: 392, dur: 0.45 }, { beat: 1, freq: 392, dur: 0.45 },
    { beat: 2, freq: 440, dur: 0.45 }, { beat: 3, freq: 392, dur: 0.45 },
    { beat: 4, freq: 523, dur: 0.45 }, { beat: 5, freq: 494, dur: 0.9 },
    { beat: 8, freq: 392, dur: 0.45 }, { beat: 9, freq: 392, dur: 0.45 },
    { beat: 10, freq: 440, dur: 0.45 }, { beat: 11, freq: 392, dur: 0.45 },
    { beat: 12, freq: 587, dur: 0.45 }, { beat: 13, freq: 523, dur: 0.9 },
    { beat: 16, freq: 392, dur: 0.45 }, { beat: 17, freq: 392, dur: 0.45 },
    { beat: 18, freq: 784, dur: 0.45 }, { beat: 19, freq: 659, dur: 0.45 },
    { beat: 20, freq: 523, dur: 0.45 }, { beat: 21, freq: 494, dur: 0.9 },
    { beat: 24, freq: 698, dur: 0.45 }, { beat: 25, freq: 698, dur: 0.45 },
    { beat: 26, freq: 659, dur: 0.45 }, { beat: 27, freq: 523, dur: 0.45 },
    { beat: 28, freq: 587, dur: 0.45 }, { beat: 29, freq: 523, dur: 1.2 },
  ];

  let melodyNodes = [];

  function startMelody() {
    stopMelody();
    if (!SoundEngine._ensure()) return;
    const ctx = SoundEngine.ctx;
    const now = ctx.currentTime;

    for (const mn of MELODY_NOTES) {
      const t = now + (mn.beat + 1) * BEAT_DURATION;
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(mn.freq, t);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.07, t + 0.03);
      gain.gain.setValueAtTime(0.07, t + mn.dur * 0.6);
      gain.gain.exponentialRampToValueAtTime(0.001, t + mn.dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + mn.dur + 0.1);
      melodyNodes.push(osc, gain);
    }
  }

  function stopMelody() {
    for (const node of melodyNodes) {
      try { node.stop(); } catch(e) {}
    }
    melodyNodes = [];
  }

  // ===========================================
  // Game State
  // ===========================================
  const State = { IDLE: 'idle', COUNTDOWN: 'countdown', PLAYING: 'playing', ENDED: 'ended' };
  let state = State.IDLE;
  let notes = [];
  let effects = [];
  let nextNoteIdx = 0;

  let score = 0, combo = 0, maxCombo = 0;
  let totalHits = 0, perfects = 0, goods = 0, oks = 0, misses = 0;

  let startTime = 0, elapsedTime = 0;
  let animId = null;
  let width, height;
  let hitY, trackXs = [];
  let trackW = 0;

  let countdownValue = 0, countdownTimer = 0;

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
    hitY = height * HIT_Y_RATIO;
    trackW = Math.min(80, width * 0.16);
    const totalW = trackW * 4;
    const startX = (width - totalW) / 2;
    trackXs = [
      startX + trackW * 0.5,
      startX + trackW * 1.5,
      startX + trackW * 2.5,
      startX + trackW * 3.5,
    ];
  }

  resize();
  updateLayout();
  window.addEventListener('resize', () => { resize(); updateLayout(); });

  // ===========================================
  // Note Class
  // ===========================================
  const NOTE_H = 24;

  class Note {
    constructor(beat, trackId) {
      this.time = (beat + 1) * BEAT_DURATION;
      this.trackId = trackId;
      this.track = TRACKS[trackId];
      this.y = -100; // start above screen
      this.hit = false;
      this.missed = false;
    }

    update(et) {
      const dt = this.time - et;
      const rawY = hitY - dt * FALL_SPEED;
      // Cap only future notes: always enter from above the screen
      this.y = (dt > 0) ? Math.min(-NOTE_H, rawY) : rawY;
    }

    draw(ctx) {
      if (this.hit || this.missed) return;
      if (this.y < -60 || this.y > height + 60) return;

      const cx = trackXs[this.trackId];
      const cy = this.y;

      ctx.save();

      // Glow (smaller to reduce overlap flicker)
      const glowGrad = ctx.createRadialGradient(cx, cy, NOTE_H * 0.2, cx, cy, NOTE_H * 1.6);
      glowGrad.addColorStop(0, this.track.glowColor);
      glowGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, NOTE_H * 1.6, 0, Math.PI * 2);
      ctx.fill();

      // Note bar (rounded rect)
      const barW = trackW * 0.75;
      const bx = cx - barW / 2, by = cy - NOTE_H / 2;
      const br = 6;
      ctx.fillStyle = this.track.color;
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(bx + br, by);
      ctx.lineTo(bx + barW - br, by);
      ctx.arcTo(bx + barW, by, bx + barW, by + br, br);
      ctx.lineTo(bx + barW, by + NOTE_H - br);
      ctx.arcTo(bx + barW, by + NOTE_H, bx + barW - br, by + NOTE_H, br);
      ctx.lineTo(bx + br, by + NOTE_H);
      ctx.arcTo(bx, by + NOTE_H, bx, by + NOTE_H - br, br);
      ctx.lineTo(bx, by + br);
      ctx.arcTo(bx, by, bx + br, by, br);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.restore();
    }
  }

  // ===========================================
  // Hit Effect
  // ===========================================
  class HitEffect {
    constructor(x, y, judgment, color) {
      this.x = x; this.y = y;
      this.judgment = judgment;
      this.color = color;
      this.age = 0;
      this.maxAge = 0.55;
      this.done = false;
    }

    update(dt) {
      this.age += dt;
      if (this.age >= this.maxAge) this.done = true;
    }

    draw(ctx) {
      const p = this.age / this.maxAge;
      const alpha = 1 - p;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = this.color;
      ctx.lineWidth = 3 + (1 - p) * 3;
      ctx.beginPath();
      ctx.arc(this.x, this.y, NOTE_H + p * 45, 0, Math.PI * 2);
      ctx.stroke();

      const texts = { perfect: 'Perfect!', good: 'Good', ok: 'OK', miss: 'Miss' };
      const fz = 24 + (1 - p) * 16;
      ctx.font = `bold ${fz}px "Cinzel", serif`;
      ctx.fillStyle = this.color;
      ctx.textAlign = 'center';
      ctx.fillText(texts[this.judgment], this.x, this.y - NOTE_H - 16 - p * 25);
      ctx.restore();
    }
  }

  // ===========================================
  // Input
  // ===========================================
  function hitTrack(trackId) {
    if (state !== State.PLAYING) return;
    judgeHit(trackId);
  }

  function judgeHit(trackId) {
    let bestNote = null;
    let bestDelta = Infinity;

    for (const note of notes) {
      if (note.hit || note.missed) continue;
      if (note.trackId !== trackId) continue;
      const delta = Math.abs(note.time - elapsedTime);
      if (delta < bestDelta) { bestDelta = delta; bestNote = note; }
    }

    if (!bestNote) return;

    let judgment, baseScore;
    if (bestDelta <= PERFECT_WINDOW)      { judgment = 'perfect'; baseScore = 300; perfects++; }
    else if (bestDelta <= GOOD_WINDOW)    { judgment = 'good';    baseScore = 200; goods++; }
    else if (bestDelta <= OK_WINDOW)      { judgment = 'ok';      baseScore = 100; oks++; }
    else                                  { judgment = 'miss';    baseScore = 0;   misses++; }

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

      // Play the appropriate drum sound
      SoundEngine.playDrumSound(bestNote.track.sound);
    } else {
      combo = 0;
    }

    updateHUD();
    showJudgment(judgment);
    effects.push(new HitEffect(trackXs[trackId], hitY, judgment, TRACKS[trackId].color));
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
      hudAccuracy.textContent = ((perfects * 100 + goods * 80 + oks * 50) / (totalHits * 100) * 100).toFixed(0) + '%';
    }
  }

  function showJudgment(judgment) {
    if (!judgmentPopup) return;
    const t = { perfect: 'Perfect!', good: 'Good', ok: 'OK', miss: 'Miss' };
    const cl = { perfect: '#f0d78c', good: '#7eb8da', ok: '#b39dda', miss: '#db5a5a' };
    judgmentPopup.textContent = t[judgment];
    judgmentPopup.style.color = cl[judgment];
    judgmentPopup.style.fontSize = judgment === 'perfect' ? '3rem' : '2.2rem';
    judgmentPopup.style.opacity = '1';
    judgmentPopup.style.transform = 'translate(-50%, -50%) scale(1.3)';
    setTimeout(() => {
      judgmentPopup.style.transition = 'all 0.5s ease-out';
      judgmentPopup.style.opacity = '0';
      judgmentPopup.style.transform = 'translate(-50%, -50%) scale(0.6)';
    }, 80);
    setTimeout(() => { judgmentPopup.style.transition = 'none'; }, 600);
  }

  // ===========================================
  // Keyboard
  // ===========================================
  document.addEventListener('keydown', (e) => {
    if (state === State.IDLE) { startGame(); return; }
    const key = e.key.toLowerCase();
    for (const tr of TRACKS) {
      if (key === tr.key) { hitTrack(tr.id); e.preventDefault(); return; }
    }
    if (e.key === ' ' && state === State.ENDED) { restartGame(); e.preventDefault(); }
  });

  // ===========================================
  // Touch Zones
  // ===========================================
  const touchZones = [
    document.getElementById('touch-don'),
    document.getElementById('touch-ka'),
  ];

  // Reuse touch divs - map to 4 tracks on mobile
  // touch-don covers left half (tracks 0,1), touch-ka covers right half (tracks 2,3)
  // But we need 4 touch zones. Let's use the canvas for 4-zone touch.
  canvas.addEventListener('pointerdown', (e) => {
    if (state === State.IDLE) { startGame(); return; }
    if (state !== State.PLAYING) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    // Find which track was tapped
    let bestDist = Infinity, bestTrack = 0;
    for (let i = 0; i < 4; i++) {
      const dist = Math.abs(x - trackXs[i]);
      if (dist < bestDist) { bestDist = dist; bestTrack = i; }
    }
    if (bestDist < trackW) hitTrack(bestTrack);
    e.preventDefault();
  });

  // ===========================================
  // Game Flow
  // ===========================================
  function startGame() {
    if (state === State.PLAYING) return;
    state = State.COUNTDOWN;
    countdownValue = 3;
    countdownTimer = 0;
    nextNoteIdx = 0;
    notes = []; effects = [];
    score = 0; combo = 0; maxCombo = 0;
    totalHits = 0; perfects = 0; goods = 0; oks = 0; misses = 0;
    hudScore.textContent = '0';
    hudCombo.classList.remove('active');
    hudAccuracy.textContent = '--%';
    if (resultsEl) resultsEl.classList.add('hidden');
    stopMelody();

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
    stopMelody();
    hudScore.textContent = '0';
    hudCombo.classList.remove('active');
    hudAccuracy.textContent = '--%';
    if (resultsEl) resultsEl.classList.add('hidden');
    if (countdownEl) countdownEl.classList.remove('show');
    startGame();
  }

  function endGame() {
    state = State.ENDED;
    stopMelody();
    showResults();
  }

  function showResults() {
    if (!resultsEl) return;
    resultsEl.classList.remove('hidden');
    const totalNotes = chart.length;
    const accNum = totalHits > 0
      ? (perfects * 100 + goods * 80 + oks * 50) / (totalNotes * 100) * 100 : 0;
    let grade;
    if (accNum >= 95 && misses <= 2) grade = 'S';
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
  // Main Game Loop
  // ===========================================
  function gameLoop(timestamp) {
    animId = requestAnimationFrame(gameLoop);
    const dt = Math.min(0.05, (timestamp - (gameLoop._lastTs || timestamp)) / 1000);
    gameLoop._lastTs = timestamp;

    // --- Draw ---
    ctx.clearRect(0, 0, width, height);

    // Background
    const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
    bgGrad.addColorStop(0, '#080818');
    bgGrad.addColorStop(0.5, '#0e0c24');
    bgGrad.addColorStop(1, '#0c0a1e');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Track lanes
    for (let i = 0; i < 4; i++) {
      const tx = trackXs[i];
      const tr = TRACKS[i];
      // Lane background
      ctx.fillStyle = 'rgba(255,255,255,0.015)';
      ctx.fillRect(tx - trackW / 2, 0, trackW, height);

      // Lane borders
      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 20]);
      ctx.beginPath();
      ctx.moveTo(tx - trackW / 2, 0);
      ctx.lineTo(tx - trackW / 2, height);
      ctx.moveTo(tx + trackW / 2, 0);
      ctx.lineTo(tx + trackW / 2, height);
      ctx.stroke();
      ctx.setLineDash([]);

      // Track label at top
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.font = `bold ${Math.min(13, trackW * 0.18)}px "Microsoft YaHei", sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(tr.label, tx, 30);

      // Key hint
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.font = `${Math.min(11, trackW * 0.15)}px "Cinzel", serif`;
      ctx.fillText(tr.key.toUpperCase(), tx, 48);

      // Hit zone indicator
      const hzAlpha = 0.15 + Math.sin(timestamp * 0.003) * 0.05;
      ctx.fillStyle = tr.glowColor.replace('0.6', hzAlpha.toString());
      ctx.fillRect(tx - trackW / 2 + 2, hitY - NOTE_H, trackW - 4, NOTE_H * 2);

      // Hit line
      ctx.strokeStyle = 'rgba(255,255,255,0.25)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(tx - trackW / 2 + 4, hitY);
      ctx.lineTo(tx + trackW / 2 - 4, hitY);
      ctx.stroke();
    }

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
            startMelody(); // <-- melody starts HERE, when playing begins
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

        // Spawn notes (chart sorted by beat, stop at first not-ready)
        while (nextNoteIdx < chart.length) {
          if ((chart[nextNoteIdx].beat + 1) * BEAT_DURATION - elapsedTime <= LOOKAHEAD) {
            notes.push(new Note(chart[nextNoteIdx].beat, chart[nextNoteIdx].track));
            nextNoteIdx++;
          } else {
            break; // sorted: subsequent beats are even later
          }
        }

        // Update & miss check
        for (const note of notes) {
          note.update(elapsedTime);
          if (!note.hit && !note.missed && note.y > hitY + MISS_THRESHOLD * FALL_SPEED) {
            note.missed = true;
            misses++;
            combo = 0;
            totalHits++;
            updateHUD();
            showJudgment('miss');
            effects.push(new HitEffect(trackXs[note.trackId], hitY, 'miss', TRACKS[note.trackId].color));
          }
        }

        // Draw notes
        for (const note of notes) note.draw(ctx);

        if (elapsedTime >= TOTAL_DURATION) endGame();
        break;

      case State.ENDED:
        for (const note of notes) {
          if (!note.hit && !note.missed) { note.update(elapsedTime || TOTAL_DURATION); note.draw(ctx); }
        }
        break;
    }

    // Effects
    for (let i = effects.length - 1; i >= 0; i--) {
      effects[i].update(dt);
      effects[i].draw(ctx);
      if (effects[i].done) effects.splice(i, 1);
    }

    // Idle prompt
    if (state === State.IDLE) {
      const alpha = 0.5 + Math.sin(timestamp * 0.003) * 0.3;
      ctx.fillStyle = `rgba(240,215,140,${alpha})`;
      ctx.font = '1.1rem "Cinzel", serif';
      ctx.textAlign = 'center';
      ctx.fillText('按 D F J K 或点击轨道开始', width * 0.5, height * 0.92);
    }
  }

  gameLoop._lastTs = performance.now();
  animId = requestAnimationFrame(gameLoop);

})();
