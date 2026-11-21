const STORAGE_KEY = 'night_watch_audio_settings_v1';

export class AudioManager {
  constructor() {
    this.ctx = null;
    this.isInitialized = false;

    // Volúmenes persistentes en localStorage (Regla 6.3)
    const saved = this._loadSettings();
    this.volumes = {
      master: saved.master ?? 0.8,
      sfx: saved.sfx ?? 0.85,
      ambient: saved.ambient ?? 0.55
    };

    this.masterGain = null;
    this.sfxGain = null;
    this.ambientGain = null;
    this.noiseBuffer = null;
  }

  _loadSettings() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  saveSettings() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.volumes));
    } catch {
      // Ignorar si localStorage está bloqueado
    }
  }

  init() {
    if (this.isInitialized) {
      if (this.ctx?.state === 'suspended') {
        this.ctx.resume();
      }
      return;
    }

    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;

    this.ctx = new AudioCtx();

    this.masterGain = this.ctx.createGain();
    this.sfxGain = this.ctx.createGain();
    this.ambientGain = this.ctx.createGain();

    this.sfxGain.connect(this.masterGain);
    this.ambientGain.connect(this.masterGain);
    this.masterGain.connect(this.ctx.destination);

    this._applyGains();
    this._createNoiseBuffer();
    this._startAmbientDrone();

    this.isInitialized = true;
  }

  _applyGains() {
    if (!this.ctx) return;
    this.masterGain.gain.setValueAtTime(this.volumes.master, this.ctx.currentTime);
    this.sfxGain.gain.setValueAtTime(this.volumes.sfx, this.ctx.currentTime);
    this.ambientGain.gain.setValueAtTime(this.volumes.ambient, this.ctx.currentTime);
  }

  setVolume(type, value) {
    if (!(type in this.volumes)) return;
    this.volumes[type] = Math.max(0, Math.min(1, value));
    this._applyGains();
    this.saveSettings();
  }

  setPaused(isPaused) {
    if (!this.ctx) return;
    if (isPaused && this.ctx.state === 'running') {
      this.ctx.suspend();
    } else if (!isPaused && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  _createNoiseBuffer() {
    const sampleRate = this.ctx.sampleRate;
    const length = sampleRate * 2.0;
    this.noiseBuffer = this.ctx.createBuffer(1, length, sampleRate);
    const data = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
  }

  _startAmbientDrone() {
    const now = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const droneGain = this.ctx.createGain();

    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(46, now);

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(69, now);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(125, now);

    droneGain.gain.setValueAtTime(0.18, now);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(droneGain);
    droneGain.connect(this.ambientGain);

    osc1.start();
    osc2.start();
  }

  /**
   * Crea un nodo espacializado 3D (PannerNode) para situar sonidos a izquierda, derecha o atrás
   */
  _createSpatialNode(x = 0, y = 0, z = -1) {
    const panner = this.ctx.createPanner();
    panner.panningModel = 'equalpower';
    panner.distanceModel = 'inverse';
    panner.refDistance = 1.5;
    panner.maxDistance = 15;
    panner.positionX.setValueAtTime(x, this.ctx.currentTime);
    panner.positionY.setValueAtTime(y, this.ctx.currentTime);
    panner.positionZ.setValueAtTime(z, this.ctx.currentTime);
    panner.connect(this.sfxGain);
    return panner;
  }

  /**
   * El Observador: Toques secos en el cristal de la ventana derecha ("tap... tap")
   */
  playWindowTap() {
    this.init();
    if (!this.ctx) return;

    const dest = this._createSpatialNode(2.2, 0.3, -0.5); // Canal derecho
    const playSingleTap = (delay) => {
      const t = this.ctx.currentTime + delay;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(920, t);
      osc.frequency.exponentialRampToValueAtTime(180, t + 0.045);

      gain.gain.setValueAtTime(0.55, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.055);

      osc.connect(gain);
      gain.connect(dest);
      osc.start(t);
      osc.stop(t + 0.06);
    };

    playSingleTap(0);
    playSingleTap(0.24);
  }

  /**
   * El Reptante: Arañazos metálicos rítmicos en el ducto derecho
   */
  playVentScratch(intensity = 0.7) {
    this.init();
    if (!this.ctx || !this.noiseBuffer) return;

    const dest = this._createSpatialNode(2.4, -0.8, 0.4); // Canal derecho bajo
    const playScrape = (delay, dur) => {
      const t = this.ctx.currentTime + delay;
      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1450, t);
      filter.frequency.linearRampToValueAtTime(2400, t + dur);
      filter.Q.setValueAtTime(6.0, t);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.01, t);
      gain.gain.linearRampToValueAtTime(0.38 * intensity, t + dur * 0.3);
      gain.gain.exponentialRampToValueAtTime(0.005, t + dur);

      src.connect(filter);
      filter.connect(gain);
      gain.connect(dest);

      src.start(t);
      src.stop(t + dur);
    };

    playScrape(0, 0.16);
    playScrape(0.22, 0.19);
    playScrape(0.48, 0.14);
  }

  /**
   * El Intruso: Crujidos pesados de madera y pasos en el pasillo izquierdo
   */
  playHeavyFootstep(closeness = 0.7) {
    this.init();
    if (!this.ctx) return;

    const dest = this._createSpatialNode(-2.3, -0.3, -0.6); // Canal izquierdo
    const t = this.ctx.currentTime;

    // Golpe grave en madera
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(110, t);
    osc.frequency.exponentialRampToValueAtTime(34, t + 0.18);

    gain.gain.setValueAtTime(0.65 * closeness, t);
    gain.gain.exponentialRampToValueAtTime(0.005, t + 0.22);

    osc.connect(gain);
    gain.connect(dest);
    osc.start(t);
    osc.stop(t + 0.24);
  }

  /**
   * Sonido de impacto / bloqueo mecánico (Puerta magnética o Compuerta de ducto)
   */
  playMechanicalSlam(xPos = 0) {
    this.init();
    if (!this.ctx) return;

    const dest = this._createSpatialNode(xPos, 0, -0.5);
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(28, t + 0.22);

    gain.gain.setValueAtTime(0.5, t);
    gain.gain.exponentialRampToValueAtTime(0.005, t + 0.25);

    osc.connect(gain);
    gain.connect(dest);
    osc.start(t);
    osc.stop(t + 0.26);
  }

  /**
   * Clic de conmutación de cámara o linterna
   */
  playClick(pitch = 700) {
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(pitch, t);
    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.005, t + 0.03);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.035);
  }

  /**
   * Alarma / Caída de fusibles o Apagón
   */
  playPowerDown() {
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(320, t);
    osc.frequency.exponentialRampToValueAtTime(38, t + 0.75);

    gain.gain.setValueAtTime(0.45, t);
    gain.gain.exponentialRampToValueAtTime(0.005, t + 0.8);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.82);
  }

  /**
   * Estridencia de ataque final (Jumpscare)
   */
  playJumpscareScream() {
    this.init();
    if (!this.ctx || !this.noiseBuffer) return;

    const t = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;

    const gain = this.ctx.createGain();
    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(580, t);
    osc1.frequency.exponentialRampToValueAtTime(190, t + 0.9);

    osc2.type = 'square';
    osc2.frequency.setValueAtTime(830, t);
    osc2.frequency.linearRampToValueAtTime(1240, t + 0.35);

    gain.gain.setValueAtTime(0.75, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.95);

    osc1.connect(gain);
    osc2.connect(gain);
    noise.connect(gain);
    gain.connect(this.sfxGain);

    osc1.start(t);
    osc2.start(t);
    noise.start(t);
    osc1.stop(t + 0.95);
    osc2.stop(t + 0.95);
    noise.stop(t + 0.95);
  }

  /**
   * Fase 4 (Módulo 4.3): Pulso de cambio de hora (01:00 AM - 05:00 AM)
   */
  playHourChime() {
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, t);
    osc.frequency.setValueAtTime(165, t + 0.18);

    gain.gain.setValueAtTime(0.28, t);
    gain.gain.exponentialRampToValueAtTime(0.005, t + 0.65);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.68);
  }

  /**
   * Fase 4 (Módulo 4.3): Fluctuación electromagnética de las 03:00 AM
   */
  playEMPPulse() {
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(95, t);
    osc.frequency.linearRampToValueAtTime(42, t + 1.4);

    gain.gain.setValueAtTime(0.42, t);
    gain.gain.exponentialRampToValueAtTime(0.005, t + 1.5);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 1.55);
  }

  /**
   * Fase 4 (Módulo 4.3): Alarma digital de las 06:00 AM y acorde de amanecer
   */
  playDawnChime() {
    this.init();
    if (!this.ctx) return;

    const notes = [523.25, 659.25, 783.99, 1046.5]; // Acorde Do Mayor (C5, E5, G5, C6)
    notes.forEach((freq, idx) => {
      const t = this.ctx.currentTime + idx * 0.16;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.32, t);
      gain.gain.exponentialRampToValueAtTime(0.004, t + 1.4);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 1.45);
    });
  }
}

