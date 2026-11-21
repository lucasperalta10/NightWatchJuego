export class HUD {
  constructor() {
    this.clockEl = document.getElementById('hud-clock');
    this.sectorEl = document.getElementById('hud-sector');
    this.powerValEl = document.getElementById('hud-power-val');
    this.usageBarsEl = document.getElementById('hud-usage-bars');
    this.flashlightFillEl = document.getElementById('hud-flashlight-fill');
    this.reticleEl = document.getElementById('reticle');
    this.bottomRightEl = document.getElementById('bottom-right-hud');
    this.promptEl = document.getElementById('interaction-prompt');
    this.hourBannerEl = document.getElementById('hour-banner');
    this.bannerTimer = 0;
  }

  showHourBanner(text, duration = 3.8) {
    if (!this.hourBannerEl) return;
    this.hourBannerEl.textContent = text;
    this.hourBannerEl.classList.remove('hidden');
    this.bannerTimer = duration;
  }

  update({
    dt = 0.016,
    batteryPct,
    isTurnedAround,
    isCCTVActive = false,
    activeCamId = 'CAM 01',
    powerPct = 100.0,
    usageLevel = 1,
    clockText = '12:00 AM',
    interactionPrompt = null,
    isHoveredInteractive = false,
    isBreakerTripped = false,
    isBlackout = false,
    isNightComplete = false
  }) {
    if (this.bannerTimer > 0) {
      this.bannerTimer -= dt;
      if (this.bannerTimer <= 0 && this.hourBannerEl) {
        this.hourBannerEl.classList.add('hidden');
      }
    }
    if (this.flashlightFillEl) {
      this.flashlightFillEl.style.width = `${batteryPct.toFixed(1)}%`;
      if (batteryPct < 20) {
        this.flashlightFillEl.style.backgroundColor = '#ff3b30';
      } else if (batteryPct < 50) {
        this.flashlightFillEl.style.backgroundColor = '#ffb703';
      } else {
        this.flashlightFillEl.style.backgroundColor = '#63e6be';
      }
    }

    if (this.reticleEl) {
      this.reticleEl.classList.toggle('hidden', isCCTVActive);
      if (isHoveredInteractive) {
        this.reticleEl.style.transform = 'translate(-50%, -50%) scale(1.9)';
        this.reticleEl.style.backgroundColor = '#52ff9a';
        this.reticleEl.style.borderColor = '#52ff9a';
      } else {
        this.reticleEl.style.transform = 'translate(-50%, -50%) scale(1.0)';
        this.reticleEl.style.backgroundColor = 'rgba(210, 235, 220, 0.15)';
        this.reticleEl.style.borderColor = 'rgba(210, 235, 220, 0.55)';
      }
    }

    if (this.promptEl) {
      let msg = interactionPrompt;
      if (isNightComplete) {
        msg = '06:00 AM — ¡HAS SOBREVIVIDO LA NOCHE!';
      } else if (!msg && isBreakerTripped && !isTurnedAround) {
        msg = '¡FUSIBLES CAÍDOS! GIRA 180° [ESPACIO / S] Y REACTIVA EL PANEL';
      }

      if (msg && !isCCTVActive) {
        this.promptEl.textContent = msg;
        this.promptEl.classList.remove('hidden');
      } else {
        this.promptEl.classList.add('hidden');
      }
    }

    if (this.bottomRightEl) {
      this.bottomRightEl.classList.toggle('hidden', isCCTVActive);
    }

    if (this.sectorEl) {
      if (isBlackout) {
        this.sectorEl.textContent = 'ESTADO: APAGÓN TOTAL (0% ENERGÍA)';
        this.sectorEl.style.color = '#ff3b30';
      } else if (isBreakerTripped) {
        this.sectorEl.textContent = 'ALERTA: FUSIBLES SALTADOS (SOBRECARGA)';
        this.sectorEl.style.color = '#ffb703';
      } else {
        this.sectorEl.style.color = '#8aa399';
        if (isCCTVActive) {
          this.sectorEl.textContent = `MONITOR CCTV // ${activeCamId}`;
        } else {
          this.sectorEl.textContent = isTurnedAround
            ? 'SECTOR: PANEL ELÉCTRICO TRASERO'
            : 'SECTOR: OFICINA PRINCIPAL';
        }
      }
    }

    if (this.powerValEl) {
      this.powerValEl.textContent = `${powerPct.toFixed(1)}%`;
      this.powerValEl.style.color = powerPct > 25 ? '#52ff9a' : '#ff3b30';
    }

    if (this.clockEl) {
      this.clockEl.textContent = clockText;
      this.clockEl.style.color = isNightComplete ? '#52ff9a' : '#ff3b30';
    }

    if (this.usageBarsEl) {
      const bars = this.usageBarsEl.querySelectorAll('.bar');
      bars.forEach((bar, idx) => {
        bar.classList.toggle('active', idx < usageLevel);
      });
    }
  }
}
