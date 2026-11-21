export class DebugPanel {
  constructor(game) {
    this.game = game;
    this.panelEl = document.getElementById('debug-panel');
    this.fpsEl = document.getElementById('debug-fps');
    this.drawCallsEl = document.getElementById('debug-drawcalls');
    this.camAnglesEl = document.getElementById('debug-cam-angles');
    this.viewStateEl = document.getElementById('debug-view-state');
    this.flashlightEl = document.getElementById('debug-flashlight-state');
    this.drainRateEl = document.getElementById('debug-drain-rate');

    this.obsStateEl = document.getElementById('debug-obs-state');
    this.crwStateEl = document.getElementById('debug-crw-state');
    this.intStateEl = document.getElementById('debug-int-state');
    this.toggleEntitiesBtn = document.getElementById('dbg-btn-toggle-entities');

    this.isVisible = false;
    this.frames = 0;
    this.fpsAccumTime = 0;
    this.currentFps = 60;

    this._bindButtons();
  }

  _bindButtons() {
    const btn1am = document.getElementById('dbg-btn-1am');
    const btn3am = document.getElementById('dbg-btn-3am');
    const btn559am = document.getElementById('dbg-btn-559am');
    const btnInfPower = document.getElementById('dbg-btn-inf-power');
    const btnTripBreaker = document.getElementById('dbg-btn-trip-breaker');
    const btnBlackout = document.getElementById('dbg-btn-blackout');

    const btnAtkObs = document.getElementById('dbg-btn-atk-obs');
    const btnAtkCrw = document.getElementById('dbg-btn-atk-crw');
    const btnAtkInt = document.getElementById('dbg-btn-atk-int');

    btn1am?.addEventListener('click', () => this.game.debugSetHour('01:00 AM'));
    btn3am?.addEventListener('click', () => this.game.debugSetHour('03:00 AM'));
    btn559am?.addEventListener('click', () => this.game.debugSetHour('05:59 AM'));

    btnInfPower?.addEventListener('click', () => {
      this.game.powerSystem.infinitePower = !this.game.powerSystem.infinitePower;
      btnInfPower.textContent = `Energía Inf: ${this.game.powerSystem.infinitePower ? 'ON' : 'OFF'}`;
    });

    btnTripBreaker?.addEventListener('click', () => {
      this.game.powerSystem.tripBreaker();
    });

    btnBlackout?.addEventListener('click', () => {
      this.game.debugForceBlackout();
    });

    // Activar / Desactivar todas las entidades extraterrestres
    this.toggleEntitiesBtn?.addEventListener('click', () => {
      this.game.toggleEntitiesEnabled();
      this._syncEntitiesButton();
      this._refreshTelemetry();
    });

    // Disparar ataques de prueba inmediatos
    btnAtkObs?.addEventListener('click', () => {
      if (!this.game.entitiesEnabled) this.game.toggleEntitiesEnabled(true);
      this._syncEntitiesButton();
      this.game.observer?.forceAttackStage();
      this._refreshTelemetry();
    });

    btnAtkCrw?.addEventListener('click', () => {
      if (!this.game.entitiesEnabled) this.game.toggleEntitiesEnabled(true);
      this._syncEntitiesButton();
      this.game.crawler?.forceAttackStage();
      this._refreshTelemetry();
    });

    btnAtkInt?.addEventListener('click', () => {
      if (!this.game.entitiesEnabled) this.game.toggleEntitiesEnabled(true);
      this._syncEntitiesButton();
      this.game.intruder?.forceAttackStage();
      this._refreshTelemetry();
    });
  }

  _syncEntitiesButton() {
    if (!this.toggleEntitiesBtn) return;
    const on = this.game.entitiesEnabled;
    this.toggleEntitiesBtn.textContent = `IA Entidades: ${on ? 'ON' : 'OFF'}`;
    this.toggleEntitiesBtn.classList.toggle('active-toggle', on);
    this.toggleEntitiesBtn.classList.toggle('inactive-toggle', !on);
  }

  toggle() {
    this.isVisible = !this.isVisible;
    if (this.panelEl) {
      this.panelEl.classList.toggle('hidden', !this.isVisible);
    }

    if (this.isVisible) {
      this._syncEntitiesButton();
      this._refreshTelemetry();
      // Liberar el cursor para poder hacer clic en los botones del menú F1 directamente
      if (document.pointerLockElement) {
        document.exitPointerLock();
      }
    } else if (
      !this.game.isInMainMenu &&
      !this.game.cameraSystem.isActive &&
      !this.game.isGameOver &&
      !this.game.isPaused
    ) {
      this.game.sceneManager.requestPointerLock();
    }
  }

  update(dt) {
    this.frames++;
    this.fpsAccumTime += dt;

    if (this.fpsAccumTime >= 0.25) {
      this.currentFps = Math.round(this.frames / this.fpsAccumTime);
      this.frames = 0;
      this.fpsAccumTime = 0;

      if (this.isVisible) {
        this._refreshTelemetry();
      }
    }
  }

  _refreshTelemetry() {
    const { sceneManager, defenseSystem, cameraSystem, powerSystem, observer, crawler, intruder } = this.game;
    const info = sceneManager.renderer.info;

    if (this.fpsEl) {
      this.fpsEl.textContent = `${this.currentFps} FPS`;
      this.fpsEl.style.color = this.currentFps >= 55 ? '#52ff9a' : '#ff3b30';
    }

    if (this.drawCallsEl) {
      this.drawCallsEl.textContent = `${info.render.calls} / ${info.memory.geometries}`;
    }

    if (this.camAnglesEl) {
      const angles = sceneManager.getCameraAnglesDeg();
      this.camAnglesEl.textContent = `${angles.yaw}° / ${angles.pitch}°`;
    }

    if (this.viewStateEl) {
      if (cameraSystem && cameraSystem.isActive) {
        this.viewStateEl.textContent = `CCTV (${cameraSystem.activeCamId})`;
      } else {
        this.viewStateEl.textContent = sceneManager.isTurnedAround
          ? 'REAR_PANEL (180°)'
          : 'FRONT_DESK';
      }
    }

    if (this.flashlightEl) {
      const status = defenseSystem.isFlashlightOn ? 'ON' : 'OFF';
      this.flashlightEl.textContent = `${status} (${defenseSystem.flashlightBattery.toFixed(0)}%)`;
    }

    if (this.drainRateEl && powerSystem) {
      if (powerSystem.isBreakerTripped) {
        this.drainRateEl.textContent = `FUSIBLES CAÍDOS`;
        this.drainRateEl.style.color = '#ff3b30';
      } else {
        this.drainRateEl.style.color = '#e0e6ed';
        this.drainRateEl.textContent = `${powerSystem.currentDrainRate.toFixed(2)}%/s (N${powerSystem.usageLevel})`;
      }
    }

    this._formatEnemyRow(this.obsStateEl, observer);
    this._formatEnemyRow(this.crwStateEl, crawler);
    this._formatEnemyRow(this.intStateEl, intruder);
  }

  _formatEnemyRow(el, enemy) {
    if (!el || !enemy) return;
    if (!enemy.enabled) {
      el.textContent = 'DESACTIVADO';
      el.style.color = '#7a8a82';
      return;
    }
    el.textContent = `${enemy.state} (${enemy.timer.toFixed(0)}s)`;
    const isDanger = ['WINDOW', 'GRILLE', 'DOORWAY'].includes(enemy.state);
    el.style.color = isDanger ? '#ff3b30' : enemy.state === 'IDLE' ? '#8aa399' : '#ffb703';
  }
}
