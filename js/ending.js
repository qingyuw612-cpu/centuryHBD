/* ============================================
   Century Birthday - Ending Page JS
   Fireworks, Confetti, Text Reveal
   ============================================ */

(function() {
  const { BGM, STORE, SoundEngine } = window.CenturyApp;

  // ===========================================
  // Canvas Setup
  // ===========================================
  const canvas = document.getElementById('ending-canvas');
  const ctx = canvas.getContext('2d');
  let width, height;
  let animId;

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

  // ===========================================
  // Particle Systems
  // ===========================================
  let fireworks = [];
  let confettiPieces = [];

  const COLORS = [
    '#f0d78c', '#e8c060', // gold
    '#b39dda', '#9a7fc0', // lavender
    '#7eb8da', '#5aa0c8', // light blue
    '#ffb3ba', '#f09098', // warm pink
    '#ffd700', '#ffaa00', // bright gold
    '#a8e6cf', '#7dd4a0', // mint
  ];

  // ---- Fireworks ----
  class FireworkParticle {
    constructor(x, y, color) {
      this.x = x;
      this.y = y;
      this.color = color;
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 5;
      this.vx = Math.cos(angle) * speed;
      this.vy = Math.sin(angle) * speed;
      this.alpha = 1;
      this.size = 1.5 + Math.random() * 3;
      this.age = 0;
      this.maxAge = 0.8 + Math.random() * 1.4;
    }

    update(dt) {
      this.age += dt;
      this.x += this.vx;
      this.y += this.vy;
      this.vy += 0.04; // gravity
      this.vx *= 0.99;
      this.vy *= 0.99;
      this.alpha = Math.max(0, 1 - this.age / this.maxAge);
    }

    draw(ctx) {
      if (this.alpha <= 0) return;
      ctx.save();
      ctx.globalAlpha = this.alpha;
      ctx.fillStyle = this.color;
      ctx.shadowColor = this.color;
      ctx.shadowBlur = 4;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    get dead() { return this.age >= this.maxAge; }
  }

  function spawnFirework() {
    const x = width * 0.15 + Math.random() * width * 0.7;
    const y = height * 0.1 + Math.random() * height * 0.4;
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];

    const count = 50 + Math.floor(Math.random() * 60);
    for (let i = 0; i < count; i++) {
      fireworks.push(new FireworkParticle(x, y, color));
    }
  }

  // ---- Confetti ----
  class ConfettiPiece {
    constructor() {
      this.reset(true);
    }

    reset(initial) {
      this.x = Math.random() * width;
      this.y = initial ? Math.random() * height * 0.2 - 30 : -20;
      this.size = 4 + Math.random() * 8;
      this.color = COLORS[Math.floor(Math.random() * COLORS.length)];
      this.vy = 1 + Math.random() * 2.5;
      this.vx = -1 + Math.random() * 2;
      this.rotation = Math.random() * Math.PI * 2;
      this.rotSpeed = (Math.random() - 0.5) * 0.08;
      this.alpha = 0.6 + Math.random() * 0.4;
      this.wobble = Math.random() * Math.PI * 2;
      this.wobbleSpeed = 0.02 + Math.random() * 0.03;
    }

    update(dt) {
      this.y += this.vy;
      this.x += this.vx + Math.sin(this.wobble) * 0.8;
      this.wobble += this.wobbleSpeed;
      this.rotation += this.rotSpeed;

      if (this.y > height + 30) {
        this.reset(false);
      }
    }

    draw(ctx) {
      ctx.save();
      ctx.globalAlpha = this.alpha;
      ctx.translate(this.x, this.y);
      ctx.rotate(this.rotation);
      ctx.fillStyle = this.color;
      ctx.fillRect(-this.size / 2, -this.size / 4, this.size, this.size / 2);
      ctx.restore();
    }
  }

  // ===========================================
  // Stars (subtle background twinkles)
  // ===========================================
  let bgStars = [];
  function createBgStars() {
    bgStars = [];
    for (let i = 0; i < 60; i++) {
      bgStars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        r: 0.5 + Math.random() * 1.5,
        twinkleSpeed: 0.5 + Math.random() * 2,
        twinkleOffset: Math.random() * Math.PI * 2,
      });
    }
  }
  createBgStars();

  // ===========================================
  // Game Loop
  // ===========================================
  let timeSinceStart = 0;
  let fireworkTimer = 0;
  let confettiSpawnTimer = 0;

  function gameLoop(timestamp) {
    animId = requestAnimationFrame(gameLoop);

    const dt = Math.min(0.05, (timestamp - (gameLoop._lastTs || timestamp)) / 1000);
    gameLoop._lastTs = timestamp;
    timeSinceStart += dt;

    // --- Update ---

    // Spawn fireworks periodically
    fireworkTimer += dt;
    if (fireworkTimer > 0.8 + Math.random() * 1.2) {
      fireworkTimer = 0;
      spawnFirework();
    }

    // First burst on load
    if (timeSinceStart > 1.0 && timeSinceStart < 3.0 && fireworkTimer > 0.4) {
      fireworkTimer = 0;
      spawnFirework();
    }

    // Spawn confetti continuously
    confettiSpawnTimer += dt;
    while (confettiSpawnTimer > 0.05 && confettiPieces.length < 200) {
      confettiSpawnTimer -= 0.05;
      confettiPieces.push(new ConfettiPiece());
    }

    // Update particles
    for (const fp of fireworks) fp.update(dt);
    for (const cp of confettiPieces) cp.update(dt);

    // Clean up dead fireworks
    fireworks = fireworks.filter(f => !f.dead);

    // --- Draw ---
    ctx.clearRect(0, 0, width, height);

    // Background gradient
    const bgGrad = ctx.createRadialGradient(width * 0.5, height * 0.4, 0, width * 0.5, height * 0.5, Math.max(width, height));
    bgGrad.addColorStop(0, '#1a1640');
    bgGrad.addColorStop(0.6, '#0f0d28');
    bgGrad.addColorStop(1, '#060418');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Draw background stars
    for (const star of bgStars) {
      const alpha = 0.3 + Math.sin(timeSinceStart * star.twinkleSpeed + star.twinkleOffset) * 0.3;
      ctx.fillStyle = `rgba(240,215,140,${Math.max(0.1, alpha)})`;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw fireworks with additive blending
    ctx.globalCompositeOperation = 'lighter';
    for (const fp of fireworks) fp.draw(ctx);
    ctx.globalCompositeOperation = 'source-over';

    // Draw confetti
    for (const cp of confettiPieces) cp.draw(ctx);

    // --- Text Reveal Sequence ---
    const hb = document.getElementById('happy-birthday');
    const cn = document.getElementById('century-name');
    const sm = document.getElementById('sub-message');
    const sc = document.getElementById('score-card');
    const el = document.getElementById('ending-links');

    if (timeSinceStart >= 2.0 && hb && hb.style.opacity === '') {
      hb.style.opacity = '1';
      hb.style.transform = 'translateY(0)';
      SoundEngine.playChime();
    }

    if (timeSinceStart >= 3.5 && cn && cn.style.opacity === '') {
      cn.style.opacity = '1';
      cn.style.transform = 'scale(1)';
    }

    if (timeSinceStart >= 4.5 && sm && sm.style.opacity === '') {
      sm.style.opacity = '1';
    }

    if (timeSinceStart >= 5.5 && sc && !sc.classList.contains('show')) {
      sc.classList.add('show');
      populateScoreCard();
    }

    if (timeSinceStart >= 6.5 && el && el.style.opacity === '') {
      el.style.opacity = '1';
    }
  }

  // ===========================================
  // Score Card
  // ===========================================
  function populateScoreCard() {
    const drumScore = STORE.get('drum_score');
    const drumGrade = STORE.get('drum_grade');
    const phoneTime = STORE.get('phone_time');
    const haircutScore = STORE.get('haircut_score');
    const haircutRounds = STORE.get('haircut_rounds');

    const scDrum = document.getElementById('sc-drum');
    const scPhone = document.getElementById('sc-phone');
    const scHaircut = document.getElementById('sc-haircut');

    if (scDrum) scDrum.textContent = drumScore ? `${drumScore}分 (${drumGrade})` : '未挑战';
    if (scPhone) scPhone.textContent = phoneTime ? `${phoneTime}秒完成` : '未挑战';
    if (scHaircut) scHaircut.textContent = haircutScore ? `${haircutScore}分 (${haircutRounds || '?'}轮)` : '未挑战';
  }

  // ===========================================
  // Init text states
  // ===========================================
  function initTexts() {
    const hb = document.getElementById('happy-birthday');
    const cn = document.getElementById('century-name');
    if (hb) { hb.style.opacity = ''; hb.style.transform = 'translateY(20px)'; }
    if (cn) { cn.style.opacity = ''; cn.style.transform = 'scale(0.8)'; }
    const sm = document.getElementById('sub-message');
    const el = document.getElementById('ending-links');
    if (sm) sm.style.opacity = '';
    if (el) el.style.opacity = '';
  }

  initTexts();

  // ===========================================
  // Start
  // ===========================================
  gameLoop._lastTs = performance.now();
  animId = requestAnimationFrame(gameLoop);

  // Ensure BGM is playing
  BGM.play();

})();
