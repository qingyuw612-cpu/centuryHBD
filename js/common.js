/* ============================================
   Century Birthday - Common JS
   Namespace: window.CenturyApp
   ============================================ */

window.CenturyApp = window.CenturyApp || {};

// =============================================
// SessionStorage Helpers
// =============================================
const STORE = {
  get(key) {
    try { return sessionStorage.getItem('century_' + key); }
    catch(e) { return null; }
  },
  set(key, val) {
    try { sessionStorage.setItem('century_' + key, val); }
    catch(e) { /* quota exceeded - silently ignore */ }
  },
  getFloat(key) {
    const v = STORE.get(key);
    return v ? parseFloat(v) : null;
  },
  getInt(key) {
    const v = STORE.get(key);
    return v ? parseInt(v, 10) : null;
  },
  getBool(key) {
    return STORE.get(key) === 'true';
  },
  setBool(key, val) {
    STORE.set(key, val ? 'true' : 'false');
  }
};

window.CenturyApp.STORE = STORE;

// =============================================
// BGM Manager
// =============================================
const BGM = {
  audio: null,
  bgmPath: 'assets/bgm/' + encodeURI('世纪末尺度 The Temporal Scale - The 1999.mp3'),
  initialized: false,

  init() {
    if (this.initialized) return;
    try {
      this.audio = new Audio(this.bgmPath);
      this.audio.loop = true;
      this.audio.volume = 0.35;

      // Restore position from previous page
      const savedTime = STORE.getFloat('bgm_time');
      if (savedTime && savedTime > 0) {
        this.audio.currentTime = savedTime;
      }

      // Save position periodically
      setInterval(() => {
        if (this.audio && !this.audio.paused) {
          STORE.set('bgm_time', this.audio.currentTime.toString());
        }
      }, 1000);

      // Handle visibility change
      document.addEventListener('visibilitychange', () => {
        if (!this.audio) return;
        if (document.hidden) {
          if (!this.audio.paused) {
            this.audio.pause();
            STORE.setBool('bgm_playing', false);
          }
        } else {
          if (STORE.getBool('bgm_playing') !== false) {
            this.audio.play().catch(() => {});
          }
        }
      });

      // Save time before navigation
      window.addEventListener('beforeunload', () => {
        if (this.audio && !this.audio.paused) {
          STORE.set('bgm_time', this.audio.currentTime.toString());
          STORE.setBool('bgm_playing', true);
        }
      });

      this.initialized = true;
    } catch(e) {
      console.warn('BGM initialization failed:', e);
    }
  },

  play() {
    if (!this.audio) this.init();
    if (this.audio) {
      this.audio.play().catch(() => {
        // Browser blocked autoplay - will retry on next user gesture
      });
      STORE.setBool('bgm_playing', true);
    }
  },

  pause() {
    if (this.audio) {
      this.audio.pause();
      STORE.setBool('bgm_playing', false);
    }
  },

  toggle() {
    if (this.audio && !this.audio.paused) {
      this.pause();
    } else {
      this.play();
    }
  }
};

window.CenturyApp.BGM = BGM;

// =============================================
// Sound Engine (Web Audio API)
// =============================================
const SoundEngine = {
  ctx: null,

  _ensure() {
    if (!this.ctx) {
      try {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      } catch(e) {
        console.warn('Web Audio API not available');
        return false;
      }
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return true;
  },

  /** Drum game: don sound (low thud) */
  playDon() {
    if (!this._ensure()) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    // Oscillator - low thud
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.1);

    // Noise burst
    const bufferSize = ctx.sampleRate * 0.1;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.setValueAtTime(800, now);

    const oscGain = ctx.createGain();
    oscGain.gain.setValueAtTime(0.5, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.3, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(oscGain).connect(ctx.destination);
    noise.connect(noiseFilter).connect(noiseGain).connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.15);
    noise.start(now);
    noise.stop(now + 0.15);
  },

  /** Drum game: ka sound (sharp rim click) */
  playKa() {
    if (!this._ensure()) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(1200, now);
    osc.frequency.exponentialRampToValueAtTime(600, now + 0.04);

    const oscGain = ctx.createGain();
    oscGain.gain.setValueAtTime(0.25, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

    // Bandpass noise for metallic character
    const bufferSize = ctx.sampleRate * 0.05;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const bpFilter = ctx.createBiquadFilter();
    bpFilter.type = 'bandpass';
    bpFilter.frequency.setValueAtTime(3000, now);
    bpFilter.Q.setValueAtTime(2, now);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.2, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

    osc.connect(oscGain).connect(ctx.destination);
    noise.connect(bpFilter).connect(noiseGain).connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.08);
    noise.start(now);
    noise.stop(now + 0.08);
  },

  /** Phone: snap click */
  playSnap() {
    if (!this._ensure()) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.05);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.1);
  },

  /** Phone: error buzz */
  playError() {
    if (!this._ensure()) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.setValueAtTime(120, now + 0.1);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.25);
  },

  /** Haircut: scissor snip */
  playSnip() {
    if (!this._ensure()) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    // Two quick high-frequency bursts
    for (let i = 0; i < 2; i++) {
      const t = now + i * 0.04;
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(2000 + i * 500, t);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.15, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.03);

      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.04);
    }
  },

  /** Haircut: wah-wah fail */
  playWahWah() {
    if (!this._ensure()) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.4);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.linearRampToValueAtTime(0.1, now + 0.15);
    gain.gain.setValueAtTime(0.15, now + 0.2);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.6);
  },

  /** Celebration chime */
  playChime() {
    if (!this._ensure()) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      const t = now + i * 0.12;
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);

      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.35);
    });
  }
};

window.CenturyApp.SoundEngine = SoundEngine;

// =============================================
// Navigation Helper
// =============================================
window.CenturyApp.navigateTo = function(url) {
  // Save BGM state before navigation
  if (BGM.audio && !BGM.audio.paused) {
    STORE.set('bgm_time', BGM.audio.currentTime.toString());
    STORE.setBool('bgm_playing', true);
  }
  document.body.classList.add('page-exit');
  setTimeout(() => { window.location.href = url; }, 200);
};

// =============================================
// Auto-init on page load
// =============================================
document.addEventListener('DOMContentLoaded', () => {
  document.body.classList.add('page-enter');
  BGM.init();
});
