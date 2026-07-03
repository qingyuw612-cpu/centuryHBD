/* ============================================
   Century Birthday - Homepage JS
   ============================================ */

(function() {
  const { BGM, STORE, SoundEngine } = window.CenturyApp;

  // ===========================================
  // Starfield Canvas
  // ===========================================
  const canvas = document.getElementById('starfield');
  const ctx = canvas.getContext('2d');

  let stars = [];
  let shootingStars = [];
  let width, height;
  let animId;

  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width * window.devicePixelRatio;
    canvas.height = height * window.devicePixelRatio;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
  }

  function createStars() {
    stars = [];
    // Far layer: many small dim stars
    for (let i = 0; i < 180; i++) {
      stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        r: 0.5 + Math.random() * 1.2,
        baseOpacity: 0.2 + Math.random() * 0.4,
        twinkleSpeed: 0.5 + Math.random() * 1.5,
        twinkleOffset: Math.random() * Math.PI * 2,
        layer: 'far'
      });
    }
    // Mid layer: medium stars
    for (let i = 0; i < 80; i++) {
      stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        r: 1.0 + Math.random() * 1.5,
        baseOpacity: 0.4 + Math.random() * 0.4,
        twinkleSpeed: 0.8 + Math.random() * 2.0,
        twinkleOffset: Math.random() * Math.PI * 2,
        layer: 'mid'
      });
    }
    // Near layer: few bright stars
    for (let i = 0; i < 20; i++) {
      stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        r: 1.5 + Math.random() * 2.0,
        baseOpacity: 0.6 + Math.random() * 0.4,
        twinkleSpeed: 1.0 + Math.random() * 3.0,
        twinkleOffset: Math.random() * Math.PI * 2,
        layer: 'near'
      });
    }
  }

  function drawStars(time) {
    const t = time * 0.001; // seconds

    ctx.clearRect(0, 0, width, height);

    // Background gradient
    const grad = ctx.createRadialGradient(width * 0.4, height * 0.35, 0, width * 0.5, height * 0.5, Math.max(width, height) * 0.7);
    grad.addColorStop(0, '#1a1540');
    grad.addColorStop(0.5, '#0f0d28');
    grad.addColorStop(1, '#080818');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Draw stars
    for (const star of stars) {
      const opacity = star.baseOpacity + Math.sin(t * star.twinkleSpeed + star.twinkleOffset) * 0.25;
      const alpha = Math.max(0.1, Math.min(1, opacity));

      ctx.beginPath();

      if (star.layer === 'near' && star.r > 2.5) {
        // 4-point star sparkle
        const cx = star.x, cy = star.y, s = star.r * 2.5;
        ctx.moveTo(cx, cy - s);
        ctx.lineTo(cx + star.r * 0.5, cy - star.r * 0.5);
        ctx.lineTo(cx + s, cy);
        ctx.lineTo(cx + star.r * 0.5, cy + star.r * 0.5);
        ctx.lineTo(cx, cy + s);
        ctx.lineTo(cx - star.r * 0.5, cy + star.r * 0.5);
        ctx.lineTo(cx - s, cy);
        ctx.lineTo(cx - star.r * 0.5, cy - star.r * 0.5);
        ctx.closePath();
      } else {
        ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
      }

      const color = star.layer === 'near'
        ? `rgba(240,215,140,${alpha})`
        : star.layer === 'mid'
        ? `rgba(200,190,230,${alpha})`
        : `rgba(180,200,230,${alpha * 0.7})`;

      ctx.fillStyle = color;
      ctx.fill();
    }

    // Shooting stars
    for (let i = shootingStars.length - 1; i >= 0; i--) {
      const ss = shootingStars[i];
      ss.age += 0.016;
      const progress = ss.age / ss.lifetime;
      const alpha = progress < 0.1 ? progress / 0.1 : (1 - progress);

      const tailLen = 80 * (1 - progress);
      const sx = ss.x - Math.cos(ss.angle) * tailLen;
      const sy = ss.y - Math.sin(ss.angle) * tailLen;

      const grad2 = ctx.createLinearGradient(sx, sy, ss.x, ss.y);
      grad2.addColorStop(0, 'rgba(240,215,140,0)');
      grad2.addColorStop(0.6, `rgba(240,215,140,${alpha * 0.3})`);
      grad2.addColorStop(1, `rgba(255,255,255,${alpha})`);

      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(ss.x, ss.y);
      ctx.strokeStyle = grad2;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ss.x += Math.cos(ss.angle) * ss.speed;
      ss.y += Math.sin(ss.angle) * ss.speed;

      if (progress >= 1) shootingStars.splice(i, 1);
    }

    // Spawn shooting stars randomly
    if (Math.random() < 0.003) {
      shootingStars.push({
        x: Math.random() * width,
        y: Math.random() * height * 0.4,
        angle: Math.PI * 0.25 + Math.random() * Math.PI * 0.5,
        speed: 4 + Math.random() * 6,
        lifetime: 0.8 + Math.random() * 1.2,
        age: 0
      });
    }
  }

  function animate(time) {
    drawStars(time);
    animId = requestAnimationFrame(animate);
  }

  resize();
  createStars();
  animId = requestAnimationFrame(animate);

  window.addEventListener('resize', () => {
    resize();
    createStars();
  });

  // ===========================================
  // BGM Overlay
  // ===========================================
  const overlay = document.getElementById('bgm-overlay');
  const bgmToggle = document.getElementById('bgm-toggle');
  const bgmIcon = document.getElementById('bgm-icon');

  function hideOverlay() {
    if (overlay && !overlay.classList.contains('hidden')) {
      overlay.classList.add('hidden');
      // Remove overlay after transition
      setTimeout(() => {
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      }, 1000);
    }
  }

  // First interaction handler — only show overlay on first visit
  const alreadyVisited = STORE.getBool('first_visit');
  if (alreadyVisited) {
    hideOverlay();
    BGM.play();
    // Show game hint if no games completed yet
    const noGamesDone = !STORE.getBool('drum_complete') && !STORE.getBool('phone_complete') && !STORE.getBool('haircut_complete');
    if (hintGame && !hintGameShown && noGamesDone) {
      setTimeout(() => {
        hintGame.classList.add('show');
        hintGameShown = true;
        setTimeout(() => { if (hintGame.classList.contains('show')) hintGame.classList.add('gone'); }, 8000);
      }, 500);
    }
  }

  function onFirstInteraction(e) {
    hideOverlay();
    STORE.setBool('first_visit', true);
    BGM.play();
    SoundEngine._ensure();
    // Show game hint after overlay dismissed
    setTimeout(() => {
      if (hintGame && !hintGameShown) {
        hintGame.classList.add('show');
        hintGameShown = true;
        setTimeout(() => { if (hintGame.classList.contains('show')) hintGame.classList.add('gone'); }, 8000);
      }
    }, 500);
    document.removeEventListener('click', onFirstInteraction);
    document.removeEventListener('touchstart', onFirstInteraction);
    document.removeEventListener('keydown', onFirstInteraction);
  }

  if (overlay && !alreadyVisited) {
    document.addEventListener('click', onFirstInteraction);
    document.addEventListener('touchstart', onFirstInteraction);
    document.addEventListener('keydown', onFirstInteraction);
  }

  // BGM Toggle
  if (bgmToggle) {
    bgmToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      if (BGM.audio && !BGM.audio.paused) {
        BGM.pause();
        bgmToggle.classList.add('muted');
      } else {
        BGM.play();
        bgmToggle.classList.remove('muted');
      }
    });
  }

  // ===========================================
  // Century lights up + Rose portal + Hints
  // ===========================================
  const charContainer = document.getElementById('character-container');
  const rosePortal = document.getElementById('rose-portal');
  const hintGame = document.getElementById('hint-game');
  let hintGameShown = false;

  // Hide hint on click
  document.addEventListener('click', () => {
    if (hintGame && hintGame.classList.contains('show')) {
      hintGame.classList.remove('show');
      hintGame.classList.add('gone');
    }
    if (hintCentury && hintCentury.classList.contains('show')) {
      hintCentury.classList.remove('show');
      hintCentury.classList.add('gone');
    }
    if (hintRose && hintRose.classList.contains('show')) {
      hintRose.classList.remove('show');
      hintRose.classList.add('gone');
    }
  });

  function checkProgress() {
    const drum = STORE.getBool('drum_complete');
    const phone = STORE.getBool('phone_complete');
    const haircut = STORE.getBool('haircut_complete');
    const story = STORE.getBool('story_complete');

    // Always clickable — no conditions
    if (charContainer && !charContainer._clickReady) {
      charContainer._clickReady = true;
      charContainer.classList.add('lit');
      charContainer.style.cursor = 'pointer';
      charContainer.onclick = function(e) {
        e.preventDefault();
        CenturyApp.navigateTo('story.html');
      };
    }

    // Rose always visible
    if (rosePortal) {
      rosePortal.classList.add('visible');
    }
  }

  checkProgress();
  setInterval(checkProgress, 2000);

  // ===========================================
  // Floating object hover sound hint
  // ===========================================
  const floatingObjects = document.querySelectorAll('.floating-object');
  floatingObjects.forEach(obj => {
    obj.addEventListener('mouseenter', () => {
      // Subtle visual-only feedback, no sound to avoid annoyance
    });
  });

})();
