import * as THREE from 'three';
import { SceneManager } from './SceneManager.js';
import { AudioManager } from './AudioManager.js';
import { Office } from '../world/Office.js';
import { Environment } from '../world/Environment.js';
import { House } from '../world/House.js';
import { PowerSystem } from '../systems/PowerSystem.js';
import { NightManager } from '../systems/NightManager.js';
import { DefenseSystem } from '../systems/DefenseSystem.js';
import { CameraSystem } from '../systems/CameraSystem.js';
import { Observer } from '../enemies/Observer.js';
import { Crawler } from '../enemies/Crawler.js';
import { Intruder } from '../enemies/Intruder.js';
import { DebugPanel } from '../systems/DebugPanel.js';
import { HUD } from '../ui/HUD.js';

export class Game {
  constructor() {
    const container = document.getElementById('webgl-container');
    this.sceneManager = new SceneManager(container);
    this.audioManager = new AudioManager();

    // Mundo 3D (Oficina + Exterior + 4 Sectores CCTV de la Casa)
    this.office = new Office(this.sceneManager.scene);
    this.environment = new Environment(this.sceneManager.scene);
    this.house = new House(this.sceneManager.scene);

    // Sistemas de Fase 2
    this.powerSystem = new PowerSystem();
    this.nightManager = new NightManager();
    this.defenseSystem = new DefenseSystem(this.sceneManager, this.office, this.powerSystem);
    this.cameraSystem = new CameraSystem({
      sceneManager: this.sceneManager,
      office: this.office,
      environment: this.environment,
      house: this.house,
      defenseSystem: this.defenseSystem
    });

    // Estado de Pantalla Principal: el juego NO arranca hasta pulsar "Nueva Partida"
    this.isInMainMenu = true;
    this.entitiesEnabled = true;
    this.isGameOver = false;
    this.isPaused = false;
    this.blackoutSiegeTimer = 0;

    // Estado de secuencia Jumpscare 3D (Fase 4 - Módulo 4.1)
    this.isJumpscareActive = false;
    this.jumpscareProgress = 0;
    this.jumpscareDuration = 1.15;
    this.jumpscareVector = 'DOORWAY';
    this.pendingGameOverReason = '';

    this.observer = new Observer({
      audioManager: this.audioManager,
      house: this.house,
      environment: this.environment,
      onAttackPlayer: (reason, vector) => this._triggerGameOver(reason, false, vector)
    });

    this.crawler = new Crawler({
      audioManager: this.audioManager,
      house: this.house,
      office: this.office,
      onAttackPlayer: (reason, vector) => this._triggerGameOver(reason, false, vector)
    });

    this.intruder = new Intruder({
      audioManager: this.audioManager,
      house: this.house,
      office: this.office,
      onAttackPlayer: (reason, vector) => this._triggerGameOver(reason, false, vector)
    });

    this.hud = new HUD();
    this.debugPanel = new DebugPanel(this);

    this.lastClockStr = '';
    this.lastHourIndex = 0;
    this.empFlickerTimer = 0;
    this.lastTelemetryUpdate = 0;
    this.simElapsedTime = 0;
    this.menuBgTime = 0;

    this._setupPowerCallbacks();
    this._setupMenusAndOptionsUI();
    this.clock = new THREE.Clock();
    this._bindInputs();
  }

  toggleEntitiesEnabled(forceValue) {
    this.entitiesEnabled =
      typeof forceValue === 'boolean' ? forceValue : !this.entitiesEnabled;
    this.observer.setEnabled(this.entitiesEnabled);
    this.crawler.setEnabled(this.entitiesEnabled);
    this.intruder.setEnabled(this.entitiesEnabled);
  }

  _setupMenusAndOptionsUI() {
    const mainMenuOverlay = document.getElementById('pointer-lock-overlay');
    const menuMainView = document.getElementById('menu-main-view');
    const menuOptionsView = document.getElementById('menu-options-view');

    const startBtn = document.getElementById('start-btn');
    const openOptionsBtn = document.getElementById('open-options-btn');
    const closeOptionsBtn = document.getElementById('close-options-btn');

    const pauseOverlay = document.getElementById('pause-overlay');
    const resumeBtn = document.getElementById('resume-btn');
    const pauseRestartBtn = document.getElementById('pause-restart-btn');
    const pauseMainMenuBtn = document.getElementById('pause-mainmenu-btn');
    const endMainMenuBtn = document.getElementById('end-mainmenu-btn');

    // 1. Botones del Menú Principal (Nueva Partida / Opciones)
    startBtn?.addEventListener('click', () => {
      this.audioManager.init();
      this.audioManager.playClick(760);
      this.startNewGame();
    });

    openOptionsBtn?.addEventListener('click', () => {
      this.audioManager.init();
      this.audioManager.playClick(640);
      menuMainView?.classList.add('hidden');
      menuOptionsView?.classList.remove('hidden');
    });

    closeOptionsBtn?.addEventListener('click', () => {
      this.audioManager.playClick(580);
      menuOptionsView?.classList.add('hidden');
      menuMainView?.classList.remove('hidden');
    });

    // 2. Pérdida de Pointer Lock durante la partida -> Pausar
    this.sceneManager.onPointerLockLost = () => {
      if (
        !this.isInMainMenu &&
        !this.isGameOver &&
        !this.isJumpscareActive &&
        !this.cameraSystem.isActive &&
        !this.cameraSystem.isTransitioning &&
        !this.debugPanel.isVisible
      ) {
        this.setPaused(true);
      }
    };

    // 3. Botones del Menú de Pausa y Fin de Partida
    resumeBtn?.addEventListener('click', () => {
      this.audioManager.playClick(680);
      this.setPaused(false);
    });

    pauseRestartBtn?.addEventListener('click', () => {
      this.audioManager.playClick(720);
      pauseOverlay?.classList.add('hidden');
      this.isPaused = false;
      this.audioManager.setPaused(false);
      this.resetNight();
    });

    pauseMainMenuBtn?.addEventListener('click', () => {
      this.audioManager.playClick(540);
      this.returnToMainMenu();
    });

    endMainMenuBtn?.addEventListener('click', () => {
      this.audioManager.playClick(540);
      this.returnToMainMenu();
    });

    // 4. Sincronizar Sliders de Volumen entre Menú Principal y Menú de Pausa
    const syncVolumeControl = (type, pct) => {
      this.audioManager.setVolume(type, pct / 100);
      const ids = {
        master: [
          ['vol-master', 'vol-master-val'],
          ['menu-vol-master', 'menu-vol-master-val']
        ],
        sfx: [
          ['vol-sfx', 'vol-sfx-val'],
          ['menu-vol-sfx', 'menu-vol-sfx-val']
        ],
        ambient: [
          ['vol-ambient', 'vol-ambient-val'],
          ['menu-vol-ambient', 'menu-vol-ambient-val']
        ]
      };
      for (const [inId, lblId] of ids[type] || []) {
        const inEl = document.getElementById(inId);
        const lblEl = document.getElementById(lblId);
        if (inEl) inEl.value = String(pct);
        if (lblEl) lblEl.textContent = `${pct}%`;
      }
    };

    for (const type of ['master', 'sfx', 'ambient']) {
      const initialPct = Math.round((this.audioManager.volumes[type] ?? 0.8) * 100);
      syncVolumeControl(type, initialPct);
    }

    const bindVolPair = (inputId, type) => {
      const el = document.getElementById(inputId);
      el?.addEventListener('input', () => {
        syncVolumeControl(type, Number(el.value));
      });
    };

    bindVolPair('vol-master', 'master');
    bindVolPair('vol-sfx', 'sfx');
    bindVolPair('vol-ambient', 'ambient');
    bindVolPair('menu-vol-master', 'master');
    bindVolPair('menu-vol-sfx', 'sfx');
    bindVolPair('menu-vol-ambient', 'ambient');

    // 5. Slider de Sensibilidad del Ratón en Opciones
    const sensInput = document.getElementById('menu-mouse-sens');
    const sensVal = document.getElementById('menu-mouse-sens-val');
    const baseSens = 0.0021;
    sensInput?.addEventListener('input', () => {
      const pct = Number(sensInput.value);
      if (sensVal) sensVal.textContent = `${pct}%`;
      this.sceneManager.sensitivity = baseSens * (pct / 100);
    });
  }

  /**
   * Inicia la Noche 1 desde la Pantalla Principal
   */
  startNewGame() {
    this.isInMainMenu = false;
    this.sceneManager.hasStarted = true;

    document.getElementById('pointer-lock-overlay')?.classList.add('hidden');
    document.getElementById('hud')?.classList.remove('hidden');

    this.audioManager.setPaused(false);
    this.resetNight();
  }

  /**
   * Regresa a la Pantalla Principal y detiene por completo la partida activa
   */
  returnToMainMenu() {
    this.isInMainMenu = true;
    this.isPaused = false;
    this.isGameOver = false;
    this.isJumpscareActive = false;
    this.sceneManager.hasStarted = false;

    if (this.cameraSystem.isActive || this.cameraSystem.isTransitioning) {
      this.cameraSystem.forceCloseImmediately();
    }
    this.office.stopJumpscare();
    this.defenseSystem.setFlashlightOff();
    this.defenseSystem.forceReleaseDefenses();

    this.observer.resetToIdle();
    this.crawler.resetToIdle();
    this.intruder.resetToIdle();

    this.office.crtGlowLight.intensity = 1.05;
    this.office.deskFillLight.intensity = 1.35;
    if (this.office.roomBounceLight) {
      this.office.roomBounceLight.intensity = 0.35;
    }
    if (this.office.lampBulbMesh) {
      this.office.lampBulbMesh.material.color.setHex(0xffe4a0);
    }
    this.environment.setDawnLight(false);

    if (document.pointerLockElement) {
      document.exitPointerLock();
    }

    document.getElementById('hud')?.classList.add('hidden');
    document.getElementById('pause-overlay')?.classList.add('hidden');
    document.getElementById('end-screen-overlay')?.classList.add('hidden');
    document.getElementById('menu-options-view')?.classList.add('hidden');
    document.getElementById('menu-main-view')?.classList.remove('hidden');
    document.getElementById('pointer-lock-overlay')?.classList.remove('hidden');
  }

  setPaused(paused) {
    if (this.isInMainMenu || this.isGameOver || this.isJumpscareActive) return;

    this.isPaused = paused;
    const pauseOverlay = document.getElementById('pause-overlay');
    pauseOverlay?.classList.toggle('hidden', !this.isPaused);

    this.audioManager.setPaused(this.isPaused);

    if (this.isPaused) {
      this.cameraSystem.setPorchLight(false);
      document.getElementById('cctv-porch-light-btn')?.classList.remove('active');
      if (document.pointerLockElement) {
        document.exitPointerLock();
      }
    } else {
      this.clock.getDelta();
      if (!this.cameraSystem.isActive && !this.debugPanel.isVisible) {
        this.sceneManager.requestPointerLock();
      }
    }
  }

  togglePause() {
    this.setPaused(!this.isPaused);
  }

  _setupPowerCallbacks() {
    this.powerSystem.onBreakerTrip = () => {
      this.audioManager.playPowerDown();
      this.defenseSystem.forceReleaseDefenses();
      if (this.cameraSystem.isActive) {
        this.cameraSystem.toggleCCTV();
      }
      this.office.crtGlowLight.intensity = 0.15;
    };

    this.powerSystem.onBreakerReset = () => {
      this.audioManager.playClick(950);
      this.office.crtGlowLight.intensity = 1.05;
    };

    this.powerSystem.onBlackout = () => {
      this.audioManager.playPowerDown();
      this.defenseSystem.forceReleaseDefenses();
      if (this.cameraSystem.isActive) {
        this.cameraSystem.toggleCCTV();
      }
      this.office.crtGlowLight.intensity = 0;
      this.office.deskFillLight.intensity = 0;
      if (this.office.roomBounceLight) {
        this.office.roomBounceLight.intensity = 0;
      }
      if (this.office.lampBulbMesh) {
        this.office.lampBulbMesh.material.color.setHex(0x222222);
      }
      this.blackoutSiegeTimer = 6.5;
    };
  }

  _bindInputs() {
    const restartBtn = document.getElementById('restart-btn');
    restartBtn?.addEventListener('click', () => {
      this.audioManager.playClick(720);
      this.resetNight();
    });

    window.addEventListener('mousedown', (e) => {
      if (e.button !== 0 || this.isInMainMenu || this.isGameOver || this.isPaused) return;
      this.audioManager.init();
      if (!this.sceneManager.isPointerLocked || this.cameraSystem.isActive) return;

      const prevDoor = this.defenseSystem.isDoorClosed;
      const prevVent = this.defenseSystem.isVentSealed;
      this.defenseSystem.handlePrimaryInteract(() => this._tryToggleCCTV());
      if (prevDoor !== this.defenseSystem.isDoorClosed) {
        this.audioManager.playMechanicalSlam(-2.0);
      } else if (!prevVent && this.defenseSystem.isVentSealed) {
        this.audioManager.playMechanicalSlam(2.0);
      }
    });

    window.addEventListener('keydown', (e) => {
      if (e.code === 'F1') {
        e.preventDefault();
        this.debugPanel.toggle();
        return;
      }

      // No procesar controles de juego mientras se está en la Pantalla Principal
      if (this.isInMainMenu || e.repeat || this.isGameOver || this.isJumpscareActive) return;

      if (e.code === 'KeyP' || e.code === 'Escape') {
        if (this.sceneManager.hasStarted) {
          e.preventDefault();
          this.togglePause();
        }
        return;
      }

      if (this.isPaused) return;
      this.audioManager.init();

      switch (e.code) {
        case 'KeyC':
          this._tryToggleCCTV();
          break;
        case 'Digit1':
        case 'Numpad1':
          this.audioManager.playClick(620);
          this.cameraSystem.selectCamera('CAM 01');
          break;
        case 'Digit2':
        case 'Numpad2':
          this.audioManager.playClick(660);
          this.cameraSystem.selectCamera('CAM 02');
          break;
        case 'Digit3':
        case 'Numpad3':
          this.audioManager.playClick(700);
          this.cameraSystem.selectCamera('CAM 03');
          break;
        case 'Digit4':
        case 'Numpad4':
          this.audioManager.playClick(740);
          this.cameraSystem.selectCamera('CAM 04');
          break;
        case 'ArrowLeft':
        case 'KeyA':
          if (this.cameraSystem.isActive) {
            this.audioManager.playClick(640);
            this.cameraSystem.cycleCamera(-1);
          }
          break;
        case 'ArrowRight':
        case 'KeyD':
          if (this.cameraSystem.isActive) {
            this.audioManager.playClick(680);
            this.cameraSystem.cycleCamera(1);
          }
          break;
        case 'KeyE':
          if (this.cameraSystem.isActive) {
            if (this.cameraSystem.activeCamId === 'CAM 01') {
              this.cameraSystem.setPorchLight(true);
              document.getElementById('cctv-porch-light-btn')?.classList.add('active');
            }
          } else {
            const prevDoor = this.defenseSystem.isDoorClosed;
            const prevVent = this.defenseSystem.isVentSealed;
            this.defenseSystem.handlePrimaryInteract(() => this._tryToggleCCTV());
            if (prevDoor !== this.defenseSystem.isDoorClosed) {
              this.audioManager.playMechanicalSlam(-2.0);
            } else if (!prevVent && this.defenseSystem.isVentSealed) {
              this.audioManager.playMechanicalSlam(2.0);
            }
          }
          break;
        case 'KeyQ':
          if (!this.cameraSystem.isActive && !this.sceneManager.isTurnedAround) {
            if (this.defenseSystem.triggerHallwayPulse()) {
              this.audioManager.playClick(880);
            }
          }
          break;
        case 'KeyF':
          this.audioManager.playClick(520);
          this.defenseSystem.toggleFlashlight();
          break;
        case 'KeyS':
        case 'Space':
          if (!this.cameraSystem.isActive) {
            e.preventDefault();
            this.sceneManager.toggleTurnAround();
          }
          break;
      }
    });

    window.addEventListener('keyup', (e) => {
      if (e.code === 'KeyE') {
        this.cameraSystem.setPorchLight(false);
        document.getElementById('cctv-porch-light-btn')?.classList.remove('active');
      }
    });
  }

  _tryToggleCCTV() {
    if (
      !this.cameraSystem.isActive &&
      (this.powerSystem.isBlackout || this.powerSystem.isBreakerTripped)
    ) {
      return;
    }
    this.audioManager.playClick(580);
    this.cameraSystem.toggleCCTV();
  }

  _triggerGameOver(reason, isVictory = false, attackVector = 'DOORWAY') {
    if (this.isGameOver || this.isJumpscareActive) return;

    this.isPaused = false;
    document.getElementById('pause-overlay')?.classList.add('hidden');

    if (isVictory) {
      this.isGameOver = true;
      if (this.cameraSystem.isActive || this.cameraSystem.isTransitioning) {
        this.cameraSystem.forceCloseImmediately();
      }
      this.environment.setDawnLight(true);
      this.audioManager.playDawnChime();
      this._showEndScreenOverlay(reason, true);
      return;
    }

    this.isGameOver = true;
    this.isJumpscareActive = true;
    this.jumpscareProgress = 0;
    this.jumpscareVector = attackVector;
    this.pendingGameOverReason = reason;

    this.cameraSystem.forceCloseImmediately();
    this.sceneManager.isTurnedAround = false;
    this.sceneManager.isOverrideActive = true;
    this.defenseSystem.setFlashlightOff();

    this.observer.resetToIdle();
    this.crawler.resetToIdle();
    this.intruder.resetToIdle();

    this.office.startJumpscare(attackVector);
    this.audioManager.playJumpscareScream();
  }

  _showEndScreenOverlay(reason, isVictory) {
    if (document.pointerLockElement) {
      document.exitPointerLock();
    }

    const endOverlay = document.getElementById('end-screen-overlay');
    const titleEl = document.getElementById('end-screen-title');
    const reasonEl = document.getElementById('end-screen-reason');

    if (titleEl) {
      titleEl.textContent = isVictory ? '06:00 AM — AMANECER' : 'SEÑAL INTERRUMPIDA';
      titleEl.style.color = isVictory ? '#52ff9a' : '#ff3b30';
    }
    if (reasonEl) {
      reasonEl.textContent = reason;
    }
    endOverlay?.classList.remove('hidden');
  }

  resetNight() {
    this.isGameOver = false;
    this.isPaused = false;
    this.isJumpscareActive = false;
    this.jumpscareProgress = 0;
    this.blackoutSiegeTimer = 0;

    this.office.stopJumpscare();
    this.sceneManager.isOverrideActive = false;
    this.sceneManager.isTurnedAround = false;
    this.sceneManager.targetYaw = 0;
    this.sceneManager.targetPitch = -0.05;
    this.sceneManager.currentYaw = 0;
    this.sceneManager.currentPitch = -0.05;

    this.nightManager.elapsedSeconds = 0;
    this.nightManager.isNightComplete = false;
    this.lastHourIndex = 0;
    this.empFlickerTimer = 0;
    this.environment.setDawnLight(false);

    this.powerSystem.powerPct = 100.0;
    this.powerSystem.isBlackout = false;
    this.powerSystem.isBreakerTripped = false;
    this.powerSystem.overloadTimer = 0;

    this.defenseSystem.flashlightBattery = 100.0;
    this.defenseSystem.forceReleaseDefenses();

    this.office.crtGlowLight.intensity = 1.05;
    this.office.deskFillLight.intensity = 1.35;
    if (this.office.roomBounceLight) {
      this.office.roomBounceLight.intensity = 0.35;
    }
    if (this.office.lampBulbMesh) {
      this.office.lampBulbMesh.material.color.setHex(0xffe4a0);
    }

    this.observer.resetToIdle();
    this.crawler.resetToIdle();
    this.intruder.resetToIdle();

    this.office.updateClockDisplay('12:00 AM');
    this.office.updateTelemetryScreen(100.0, 1, false);
    this.office.updateSchematicScreen({});

    document.getElementById('end-screen-overlay')?.classList.add('hidden');
    document.getElementById('pause-overlay')?.classList.add('hidden');
    this.clock.getDelta();
    this.sceneManager.requestPointerLock();
  }

  debugSetHour(hourStr) {
    this.nightManager.setDebugTime(hourStr);
  }

  debugForceBlackout() {
    this.powerSystem.forceBlackout();
  }

  start() {
    this.clock.start();
    this._loop();
  }

  _loop() {
    requestAnimationFrame(() => this._loop());

    const rawDt = Math.min(this.clock.getDelta(), 0.1);

    // 0. Si estamos en la Pantalla Principal, NO arrancar el juego (ni reloj, ni energía, ni IA)
    if (this.isInMainMenu) {
      this.menuBgTime += rawDt;
      // Paneo lento de fondo en la oficina mientras espera en el menú principal
      const bgYaw = Math.sin(this.menuBgTime * 0.28) * 0.32;
      const bgPitch = -0.06 + Math.cos(this.menuBgTime * 0.2) * 0.04;
      this.sceneManager.camera.position.copy(this.sceneManager.seatPosition);
      this.sceneManager.camera.rotation.set(bgPitch, bgYaw, 0, 'YXZ');
      this.office.update(rawDt, this.menuBgTime);
      this.environment.update(this.menuBgTime, 0);
      this.sceneManager.render();
      this.debugPanel.update(rawDt);
      return;
    }

    if (this.isPaused) {
      this.sceneManager.render();
      this.debugPanel.update(rawDt);
      return;
    }

    const dt = rawDt;
    this.simElapsedTime += dt;
    const elapsedTime = this.simElapsedTime;

    // Si hay una secuencia de Jumpscare 3D activa, animar el ataque en cabina
    if (this.isJumpscareActive) {
      this.jumpscareProgress += dt / this.jumpscareDuration;
      this.office.updateJumpscare(
        Math.min(1, this.jumpscareProgress),
        this.jumpscareVector,
        this.sceneManager.camera,
        elapsedTime
      );
      this.sceneManager.render();
      this.debugPanel.update(dt);

      if (this.jumpscareProgress >= 1.0) {
        this.isJumpscareActive = false;
        this.office.stopJumpscare();
        this._showEndScreenOverlay(this.pendingGameOverReason, false);
      }
      return;
    }

    if (!this.isGameOver) {
      // 1. Reloj de la noche (12:00 AM -> 06:00 AM) y Eventos Horarios (Módulo 4.3)
      this.nightManager.update(dt);
      const currentHour = this.nightManager.getCurrentHourIndex();

      if (currentHour !== this.lastHourIndex && currentHour < 6) {
        this.lastHourIndex = currentHour;
        const hLabel = `0${currentHour}:00 AM`;
        if (currentHour === 3) {
          this.audioManager.playEMPPulse();
          this.empFlickerTimer = 1.8;
          this.hud.showHourBanner(`${hLabel} — ANOMALÍA ELECTROMAGNÉTICA DETECTADA`, 4.2);
          if (this.cameraSystem.isActive) {
            this.cameraSystem.overlay.triggerStaticBurst(0.95);
          }
        } else {
          this.audioManager.playHourChime();
          this.hud.showHourBanner(`${hLabel} — ACTIVIDAD PERIMETRAL EN AUMENTO`, 3.6);
        }
      }

      if (this.empFlickerTimer > 0 && !this.powerSystem.isBlackout) {
        this.empFlickerTimer -= dt;
        const flicker = Math.sin(elapsedTime * 48) > 0 ? 1.35 : 0.12;
        this.office.deskFillLight.intensity = this.empFlickerTimer > 0 ? flicker : 1.35;
      }

      this.environment.update(elapsedTime, currentHour);

      if (this.nightManager.isNightComplete) {
        this._triggerGameOver('HAS SOBREVIVIDO AL ASEDIO HASTA LAS 06:00 AM', true);
      }
    }

    const clockText = this.nightManager.getFormattedTime();
    if (clockText !== this.lastClockStr) {
      this.lastClockStr = clockText;
      this.office.updateClockDisplay(clockText);
    }

    // 2. Actualizar cámara, CCTV y defensas
    this.sceneManager.update(dt);
    this.cameraSystem.update(dt, elapsedTime);
    this.defenseSystem.update(dt, elapsedTime);

    // 3. Actualizar sistema eléctrico
    if (!this.isGameOver) {
      this.powerSystem.update(dt, {
        isCCTVActive: this.cameraSystem.isActive,
        isPorchLightActive: this.cameraSystem.isPorchLightActive,
        isDoorClosed: this.defenseSystem.isDoorClosed,
        isVentSealed: this.defenseSystem.isVentSealed,
        isHallwayLightOn: this.defenseSystem.isHallwayLightOn
      });

      if (this.powerSystem.isBlackout && this.entitiesEnabled) {
        this.blackoutSiegeTimer -= dt;
        if (this.blackoutSiegeTimer <= 0) {
          this._triggerGameOver(
            'APAGÓN TOTAL — LAS CRIATURAS HAN TOMADO LA CASA',
            false,
            'BLACKOUT'
          );
        }
      }
    }

    // 4. Actualizar IA y micro-animaciones de las 3 Entidades Extraterrestres
    if (!this.isGameOver) {
      const hourIndex = this.nightManager.getCurrentHourIndex();
      const cameraYawDeg = THREE.MathUtils.radToDeg(this.sceneManager.currentYaw);

      this.observer.update(dt, {
        hourIndex,
        elapsedTime,
        isFlashlightOn: this.defenseSystem.isFlashlightOn,
        cameraYawDeg,
        isCCTVActive: this.cameraSystem.isActive,
        isTurnedAround: this.sceneManager.isTurnedAround,
        isPorchLightActive: this.cameraSystem.isPorchLightActive
      });

      this.crawler.update(dt, {
        hourIndex,
        elapsedTime,
        isVentSealed: this.defenseSystem.isVentSealed
      });

      this.intruder.update(dt, {
        hourIndex,
        elapsedTime,
        isDoorClosed: this.defenseSystem.isDoorClosed
      });
    }

    // Interferencia de estática adicional en CAM 04 provocada por El Intruso
    if (this.cameraSystem.isActive && this.cameraSystem.activeCamId === 'CAM 04') {
      this.cameraSystem.overlay.extraInterference = this.intruder.getCam04Interference();
    } else {
      this.cameraSystem.overlay.extraInterference = 0.0;
    }

    // 5. Actualizar pantallas CRT izquierda (Radar) y derecha (Telemetría) 5 veces/seg
    if (elapsedTime - this.lastTelemetryUpdate > 0.2) {
      this.lastTelemetryUpdate = elapsedTime;
      this.office.updateTelemetryScreen(
        this.powerSystem.powerPct,
        this.powerSystem.usageLevel,
        this.powerSystem.isBreakerTripped
      );

      this.office.updateSchematicScreen({
        cam01: this.observer.enabled && this.observer.state === 'CAM_01',
        cam03: this.observer.enabled && this.observer.state === 'CAM_03',
        cam02: this.crawler.enabled && (this.crawler.state === 'CAM_02' || this.crawler.state === 'DUCT'),
        cam04: this.intruder.enabled && (this.intruder.state === 'CAM_04_FAR' || this.intruder.state === 'CAM_04_NEAR'),
        officeDanger:
          (this.observer.enabled && this.observer.state === 'WINDOW') ||
          (this.crawler.enabled && this.crawler.state === 'GRILLE') ||
          (this.intruder.enabled && this.intruder.state === 'DOORWAY')
      });
    }

    // 6. Actualizar animaciones mecánicas de la oficina
    this.office.update(
      dt,
      elapsedTime,
      {
        isDoorClosed: this.defenseSystem.isDoorClosed,
        isVentSealed: this.defenseSystem.isVentSealed,
        isHallwayLightOn: this.defenseSystem.isHallwayLightOn
      },
      {
        isBreakerTripped: this.powerSystem.isBreakerTripped,
        isBlackout: this.powerSystem.isBlackout
      }
    );

    // 7. Actualizar HUD 2D
    this.hud.update({
      dt,
      batteryPct: this.defenseSystem.flashlightBattery,
      isTurnedAround: this.sceneManager.isTurnedAround,
      isCCTVActive: this.cameraSystem.isActive,
      activeCamId: this.cameraSystem.activeCamId,
      powerPct: this.powerSystem.powerPct,
      usageLevel: this.powerSystem.usageLevel,
      clockText,
      interactionPrompt: this.defenseSystem.getInteractionPrompt(),
      isHoveredInteractive: Boolean(this.defenseSystem.hoveredInteractId),
      isBreakerTripped: this.powerSystem.isBreakerTripped,
      isBlackout: this.powerSystem.isBlackout,
      isNightComplete: this.nightManager.isNightComplete
    });

    this.sceneManager.render();
    this.debugPanel.update(dt);
  }
}
