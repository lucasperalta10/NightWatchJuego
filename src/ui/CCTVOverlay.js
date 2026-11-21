export class CCTVOverlay {
  constructor(onSelectCamera, onCloseCCTV, onPorchLightHold) {
    this.onSelectCamera = onSelectCamera;
    this.onCloseCCTV = onCloseCCTV;
    this.onPorchLightHold = onPorchLightHold;

    this.rootEl = document.getElementById('cctv-overlay');
    this.canvas = document.getElementById('cctv-static-canvas');
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
    this.camTitleEl = document.getElementById('cctv-cam-title');
    this.porchBtnEl = document.getElementById('cctv-porch-light-btn');
    this.closeBtnEl = document.getElementById('cctv-close-btn');
    this.camButtons = document.querySelectorAll('.map-cam-btn');

    // Intensidad de estática: 0.95 al conmutar de canal, baja a 0.07 en reposo para visión clara
    this.staticIntensity = 0.07;
    this.baseStatic = 0.07;
    this.extraInterference = 0.0; // Para eventos futuros (ej. Intruso en CAM 04)

    this._initNoisePatterns();
    this._bindEvents();
  }

  _initNoisePatterns() {
    if (!this.canvas) return;
    // Resolución interna baja (320x180) escalada con pixelated para aspecto CRT auténtico y 0 impacto en FPS
    this.canvas.width = 320;
    this.canvas.height = 180;

    // Pre-generar 4 buffers de ruido estático para alternarlos sin alojar memoria por frame
    this.noiseFrames = [];
    for (let f = 0; f < 4; f++) {
      const imgData = this.ctx.createImageData(320, 180);
      const data = imgData.data;
      for (let i = 0; i < data.length; i += 4) {
        const val = (Math.random() * 255) | 0;
        data[i] = val * 0.82;     // R
        data[i + 1] = val;        // G (tono verdoso nocturno)
        data[i + 2] = val * 0.88; // B
        data[i + 3] = 255;
      }
      const offscreen = document.createElement('canvas');
      offscreen.width = 320;
      offscreen.height = 180;
      offscreen.getContext('2d').putImageData(imgData, 0, 0);
      this.noiseFrames.push(offscreen);
    }
    this.currentFrameIdx = 0;
  }

  _bindEvents() {
    this.camButtons.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const camId = btn.dataset.cam;
        if (camId && this.onSelectCamera) {
          this.onSelectCamera(camId);
        }
      });
    });

    this.closeBtnEl?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (this.onCloseCCTV) {
        this.onCloseCCTV();
      }
    });

    if (this.porchBtnEl) {
      const startLight = (e) => {
        e.stopPropagation();
        this.onPorchLightHold?.(true);
        this.porchBtnEl.classList.add('active');
      };
      const stopLight = (e) => {
        e.stopPropagation();
        this.onPorchLightHold?.(false);
        this.porchBtnEl.classList.remove('active');
      };
      this.porchBtnEl.addEventListener('mousedown', startLight);
      this.porchBtnEl.addEventListener('mouseup', stopLight);
      this.porchBtnEl.addEventListener('mouseleave', stopLight);
    }
  }

  show(sector) {
    if (!this.rootEl) return;
    this.rootEl.classList.remove('hidden');
    this.setActiveSector(sector);
    this.triggerStaticBurst(0.95);
  }

  hide() {
    if (!this.rootEl) return;
    this.rootEl.classList.add('hidden');
    this.onPorchLightHold?.(false);
    this.porchBtnEl?.classList.remove('active');
  }

  setActiveSector(sector) {
    if (this.camTitleEl && sector) {
      this.camTitleEl.textContent = `${sector.id} — ${sector.name}`;
    }

    this.camButtons.forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.cam === sector.id);
    });

    // Mostrar control de reflector del porche solo en CAM 01
    if (this.porchBtnEl) {
      this.porchBtnEl.classList.toggle('hidden', sector.id !== 'CAM 01');
    }
  }

  triggerStaticBurst(amount = 0.92) {
    this.staticIntensity = Math.min(1.0, amount);
  }

  update(dt, elapsedTime) {
    if (!this.ctx || this.rootEl?.classList.contains('hidden')) return;

    // Decaimiento suave de la ráfaga de estática tras cambiar de cámara
    const targetStatic = Math.min(1.0, this.baseStatic + this.extraInterference);
    this.staticIntensity += (targetStatic - this.staticIntensity) * Math.min(1, dt * 8.5);

    const w = this.canvas.width;
    const h = this.canvas.height;
    const ctx = this.ctx;

    ctx.clearRect(0, 0, w, h);

    // 1. Ruido de grano analógico pre-calculado
    this.currentFrameIdx = (this.currentFrameIdx + 1) % this.noiseFrames.length;
    ctx.globalAlpha = this.staticIntensity;
    ctx.drawImage(this.noiseFrames[this.currentFrameIdx], 0, 0);

    // 2. Bandas horizontales de tracking VHS
    ctx.globalAlpha = Math.min(1.0, this.staticIntensity * 0.8 + 0.12);
    ctx.fillStyle = '#a8ffd2';
    const barY = ((elapsedTime * 38) % (h + 30)) - 15;
    ctx.fillRect(0, barY, w, 3);

    if (this.staticIntensity > 0.45) {
      const glitchY = (Math.random() * h) | 0;
      ctx.fillRect(0, glitchY, w, 8);
    }

    ctx.globalAlpha = 1.0;
  }
}

