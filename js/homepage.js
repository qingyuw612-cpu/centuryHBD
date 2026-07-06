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
    BGM.init();
    BGM.play();
  }

  function onFirstInteraction(e) {
    hideOverlay();
    STORE.setBool('first_visit', true);
    BGM.play();
    SoundEngine._ensure();
    document.removeEventListener('click', onFirstInteraction);
    document.removeEventListener('touchstart', onFirstInteraction);
    document.removeEventListener('keydown', onFirstInteraction);
  }

  if (overlay && !alreadyVisited) {
    document.addEventListener('click', onFirstInteraction);
    document.addEventListener('touchstart', onFirstInteraction);
    document.addEventListener('keydown', onFirstInteraction);
  }

  // Sidebar toggle
  const sidebar = document.getElementById('sidebar');
  const sidebarToggle = document.getElementById('sidebar-toggle');
  if (sidebarToggle && sidebar) {
    sidebarToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      sidebar.classList.toggle('sidebar-hidden');
    });
    // Close sidebar on outside click
    document.addEventListener('click', (e) => {
      if (!sidebar.classList.contains('sidebar-hidden') &&
          !sidebar.contains(e.target) && e.target !== sidebarToggle) {
        sidebar.classList.add('sidebar-hidden');
      }
    });
  }

  // Hide loading hint after a moment
  setTimeout(function() {
    var lh = document.getElementById('loading-hint');
    if (lh) lh.classList.add('gone');
  }, 3000);

  // BGM Toggle + Label
  const bgmLabel = document.getElementById('bgm-label');
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
      // Show BGM label briefly
      if (bgmLabel) {
        bgmLabel.classList.add('show');
        clearTimeout(bgmLabel._timer);
        bgmLabel._timer = setTimeout(() => bgmLabel.classList.remove('show'), 2500);
      }
    });
  }

  // ===========================================
  // Century lights up + Rose portal
  // ===========================================
  const charContainer = document.getElementById('character-container');
  const rosePortal = document.getElementById('rose-portal');

  // Century click: requires all 4 games complete
  const charLink = document.getElementById('character-link');
  if (charLink) {
    charLink.addEventListener('click', function(e) {
      if (!(STORE.getBool('drum_complete') && STORE.getBool('phone_complete') &&
            STORE.getBool('haircut_complete') && STORE.getBool('bodyguard_complete'))) {
        e.preventDefault();
        e.stopPropagation();
      }
    });
  }

  function checkProgress() {
    const drum = STORE.getBool('drum_complete');
    const phone = STORE.getBool('phone_complete');
    const haircut = STORE.getBool('haircut_complete');
    const story = STORE.getBool('story_complete');

    // Century lights up when all 3 games done
    if (charContainer) {
      if (drum && phone && haircut && STORE.getBool('bodyguard_complete')) {
        charContainer.classList.add('lit');
      } else {
        charContainer.classList.remove('lit');
      }
    }

    // Rose appears when story is done
    if (rosePortal) {
      if (story) {
        rosePortal.classList.add('visible');
      } else {
        rosePortal.classList.remove('visible');
      }
    }

    // Homepage fireworks + text when story done
    var fwCanvas = document.getElementById('home-fireworks');
    var bdayText = document.getElementById('home-birthday-text');
    if (story) {
      if (fwCanvas) fwCanvas.style.display = '';
      if (bdayText) bdayText.style.display = '';
      if (!window._homeFWStarted) startHomeFireworks();
    }
  }

  function startHomeFireworks() {
    window._homeFWStarted = true;
    var c = document.getElementById('home-fireworks');
    if (!c) return;
    var ctx = c.getContext('2d');
    var fw = [];
    var COL = ['#f0d78c','#e8c060','#ff6b5b','#ffb3ba','#a8e6cf','#7eb8da','#b39dda','#ffd700'];
    function rz() { c.width = window.innerWidth; c.height = window.innerHeight; }
    rz(); window.addEventListener('resize', rz);
    function spawn() {
      var x = Math.random()*c.width, y = Math.random()*c.height*0.35;
      var col = COL[Math.floor(Math.random()*COL.length)];
      for (var i=0;i<40;i++) {
        var a=Math.random()*Math.PI*2, s=2+Math.random()*4;
        fw.push({x:x,y:y,c:col,vx:Math.cos(a)*s,vy:Math.sin(a)*s,age:0,life:0.7+Math.random()*1,sz:2+Math.random()*2.5});
      }
    }
    function loop() {
      if (Math.random()<0.025) spawn();
      ctx.clearRect(0,0,c.width,c.height);
      for (var i=fw.length-1;i>=0;i--) {
        var p=fw[i]; p.age+=0.016; p.x+=p.vx; p.y+=p.vy; p.vy+=0.025;
        var alpha=Math.max(0,1-p.age/p.life);
        ctx.fillStyle=p.c; ctx.globalAlpha=alpha;
        ctx.beginPath(); ctx.arc(p.x,p.y,p.sz,0,Math.PI*2); ctx.fill();
        if (p.age>=p.life) fw.splice(i,1);
      }
      ctx.globalAlpha=1; requestAnimationFrame(loop);
    }
    loop();
  }

  checkProgress();
  setInterval(checkProgress, 2000);

  // ===========================================
  // Click text ring effect
  // ===========================================
  var textRings = [];
  var ringWord = 'CENTURYROOM';
  document.addEventListener('click', function(e) {
    textRings.push({ x: e.clientX, y: e.clientY, life: 1.2, age: 0 });
    STORE.setBool('click_ring_triggered', true);
  });

  var ringCtx = document.getElementById('starfield').getContext('2d');
  function drawTextRings(dt) {
    ringCtx.textAlign = 'center';
    ringCtx.textBaseline = 'middle';
    for (var i = textRings.length - 1; i >= 0; i--) {
      var r = textRings[i];
      r.age += dt;
      if (r.age >= r.life) { textRings.splice(i, 1); continue; }
      var progress = r.age / r.life;
      var alpha = 1 - progress;
      var radius = 20 + progress * 30;
      ringCtx.globalAlpha = alpha * 0.5;
      for (var j = 0; j < ringWord.length; j++) {
        var angle = (j / ringWord.length) * Math.PI * 2 - progress * 2;
        var lx = r.x + Math.cos(angle) * radius;
        var ly = r.y + Math.sin(angle) * radius;
        ringCtx.fillStyle = '#f0d78c';
        ringCtx.font = 'bold 10px "Cinzel", serif';
        ringCtx.fillText(ringWord[j], lx, ly);
      }
    }
    ringCtx.globalAlpha = 1;
  }

  var origAnimate = animate;
  animate = function(time) {
    origAnimate(time);
    drawTextRings(0.016);
  };

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
