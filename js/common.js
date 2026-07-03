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
  _defaultPath: 'assets/bgm/' + encodeURI('世纪末尺度 The Temporal Scale - The 1999.mp3'),
  _unlocked: false,

  setTrack(path) {
    this._defaultPath = path;
    if (this.audio) {
      this.audio.src = path;
    }
  },

  init() {
    if (this.audio) return;
    try {
      // Check for page-specific BGM override (data-bgm on body)
      const override = document.body.getAttribute('data-bgm');
      const trackPath = override ? 'assets/bgm/' + override : this._defaultPath;
      this.audio = new Audio(trackPath);
      this.audio.loop = true;
      // Volume: use page override if set, otherwise default 0.35
      if (!this._volume) this.audio.volume = 0.35;
      else this.audio.volume = this._volume;

      // Try to play on first user interaction
      if (!this._unlocked) {
        const unlock = () => {
          this._unlocked = true;
          this.audio.play().catch(() => {});
          document.removeEventListener('click', unlock);
          document.removeEventListener('touchstart', unlock);
          document.removeEventListener('keydown', unlock);
        };
        document.addEventListener('click', unlock);
        document.addEventListener('touchstart', unlock);
        document.addEventListener('keydown', unlock);
      }

      // Pause when tab hidden, resume when visible
      document.addEventListener('visibilitychange', () => {
        if (!this.audio) return;
        if (document.hidden) {
          this.audio.pause();
        } else if (this._unlocked) {
          this.audio.play().catch(() => {});
        }
      });
    } catch(e) {
      console.warn('BGM init failed:', e);
    }
  },

  play() {
    if (!this.audio) this.init();
    if (this.audio) {
      this._unlocked = true;
      this.audio.play().catch(() => {});
    }
  },

  pause() {
    if (this.audio) this.audio.pause();
  },

  toggle() {
    if (this.audio && !this.audio.paused) this.pause();
    else this.play();
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

  /** Unified drum hit sound */
  playDrum() {
    if (!this._ensure()) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    // Low thud oscillator
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(60, now + 0.12);

    // Noise burst for snare character
    const bufferSize = Math.floor(ctx.sampleRate * 0.1);
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.setValueAtTime(600, now);

    const oscGain = ctx.createGain();
    oscGain.gain.setValueAtTime(0.6, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.35, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.10);

    osc.connect(oscGain).connect(ctx.destination);
    noise.connect(noiseFilter).connect(noiseGain).connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.18);
    noise.start(now);
    noise.stop(now + 0.18);
  },

  /** Rhythm Master: 4 drum sounds */
  playDrumSound(type) {
    if (!this._ensure()) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    switch (type) {
      case 'kick': {
        // Deep low thud
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(30, now + 0.15);
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.8, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc.connect(gain).connect(ctx.destination);
        osc.start(now); osc.stop(now + 0.25);
        break;
      }
      case 'snare': {
        // Sharp crack with noise
        const osc = ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(250, now);
        osc.frequency.exponentialRampToValueAtTime(100, now + 0.08);
        const nBuf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.08), ctx.sampleRate);
        const nd = nBuf.getChannelData(0);
        for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
        const noise = ctx.createBufferSource(); noise.buffer = nBuf;
        const nf = ctx.createBiquadFilter(); nf.type = 'highpass'; nf.frequency.setValueAtTime(1000, now);
        const og = ctx.createGain(); og.gain.setValueAtTime(0.4, now); og.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        const ng = ctx.createGain(); ng.gain.setValueAtTime(0.5, now); ng.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
        osc.connect(og).connect(ctx.destination);
        noise.connect(nf).connect(ng).connect(ctx.destination);
        osc.start(now); osc.stop(now + 0.12);
        noise.start(now); noise.stop(now + 0.12);
        break;
      }
      case 'hihat': {
        // Short high-frequency tsss
        const nBuf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.06), ctx.sampleRate);
        const nd = nBuf.getChannelData(0);
        for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
        const noise = ctx.createBufferSource(); noise.buffer = nBuf;
        const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.setValueAtTime(5000, now);
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        noise.connect(hp).connect(gain).connect(ctx.destination);
        noise.start(now); noise.stop(now + 0.08);
        break;
      }
      case 'crash': {
        // Loud metallic crash
        const nBuf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.3), ctx.sampleRate);
        const nd = nBuf.getChannelData(0);
        for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
        const noise = ctx.createBufferSource(); noise.buffer = nBuf;
        const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.setValueAtTime(3000, now); bp.Q.setValueAtTime(1, now);
        const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.setValueAtTime(2000, now);
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.5, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        noise.connect(bp).connect(hp).connect(gain).connect(ctx.destination);
        noise.start(now); noise.stop(now + 0.35);
        break;
      }
    }
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
