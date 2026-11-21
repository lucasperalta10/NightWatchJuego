import * as THREE from 'three';
import { EnemyBase } from './EnemyBase.js';

export class Observer extends EnemyBase {
  constructor({ audioManager, house, environment, onAttackPlayer }) {
    super('El Observador', audioManager);
    this.house = house;
    this.environment = environment;
    this.onAttackPlayer = onAttackPlayer;

    this.tapSoundTimer = 0;

    this._buildMeshes();
    this.resetToIdle();
  }

  _buildMeshes() {
    // 1. Silueta en CAM 03 (Patio Lateral / Bosque)
    this.meshCam03 = this._createHumanoidFigure(1.05, 0xa8e6cf);
    this.meshCam03.position.set(0.4, 0, -6.6);
    this.meshCam03.rotation.y = 0.25;
    this.house.sectors['CAM 03']?.group.add(this.meshCam03);

    // 2. Silueta en CAM 01 (Porche Delantero, al pie de los escalones)
    this.meshCam01 = this._createHumanoidFigure(1.08, 0xb8ffe0);
    this.meshCam01.position.set(0.3, -0.15, -4.4);
    this.meshCam01.rotation.y = -0.35;
    this.house.sectors['CAM 01']?.group.add(this.meshCam01);

    // 3. Silueta tras la Ventana Derecha de la Oficina
    this.meshWindow = this._createHumanoidFigure(1.06, 0xd8fff0);
    this.meshWindow.position.set(2.58, -0.32, -0.6);
    this.meshWindow.rotation.y = -Math.PI / 2;
    this.environment.group.add(this.meshWindow);
  }

  _updateMeshVisibility() {
    if (this.meshCam03) this.meshCam03.visible = this.enabled && this.state === 'CAM_03';
    if (this.meshCam01) this.meshCam01.visible = this.enabled && this.state === 'CAM_01';
    if (this.meshWindow) this.meshWindow.visible = this.enabled && this.state === 'WINDOW';
  }

  resetToIdle() {
    this.state = 'IDLE';
    this.timer = 14 + Math.random() * 10;
    this.repelProgress = 0;
    this.tapSoundTimer = 0;
    this._updateMeshVisibility();
  }

  forceAttackStage() {
    if (!this.enabled) return;
    this.state = 'WINDOW';
    this.timer = 11.5;
    this.repelProgress = 0;
    this.tapSoundTimer = 0.2;
    this._updateMeshVisibility();
    this.audio?.playWindowTap();
  }

  update(
    dt,
    {
      hourIndex,
      elapsedTime = 0,
      isFlashlightOn,
      cameraYawDeg,
      isCCTVActive,
      isTurnedAround,
      isPorchLightActive
    }
  ) {
    if (!this.enabled) return;

    // Micro-animaciones procedurales del Observador
    this._animateHumanoid(this.meshCam03, elapsedTime, 1.2, false);
    this._animateHumanoid(this.meshCam01, elapsedTime, 3.4, false);
    this._animateHumanoid(this.meshWindow, elapsedTime, 5.1, true);

    const speedMult = 1 + hourIndex * 0.14;

    if (this.state === 'IDLE') {
      this.timer -= dt * speedMult;
      if (this.timer <= 0) {
        this.state = 'CAM_03';
        this.timer = 12 + Math.random() * 6;
        this._updateMeshVisibility();
      }
      return;
    }

    if (this.state === 'CAM_03') {
      this.timer -= dt * speedMult;
      if (this.timer <= 0) {
        this.state = 'CAM_01';
        this.timer = 11 + Math.random() * 5;
        this.repelProgress = 0;
        this._updateMeshVisibility();
      }
      return;
    }

    if (this.state === 'CAM_01') {
      // Defensa temprana: Reflector del Porche activo en CAM 01
      if (isPorchLightActive) {
        this.repelProgress += dt;
        if (this.repelProgress >= 1.1) {
          this.resetToIdle();
          return;
        }
      } else {
        this.repelProgress = Math.max(0, this.repelProgress - dt * 0.5);
      }

      this.timer -= dt * speedMult;
      if (this.timer <= 0) {
        this.state = 'WINDOW';
        this.timer = 11.5; // Segundos antes de romper la ventana si no se alumbra
        this.repelProgress = 0;
        this.tapSoundTimer = 0.4;
        this._updateMeshVisibility();
      }
      return;
    }

    if (this.state === 'WINDOW') {
      // Sonido característico: "tap... tap" en el vidrio de la ventana derecha
      this.tapSoundTimer -= dt;
      if (this.tapSoundTimer <= 0) {
        this.audio?.playWindowTap();
        this.tapSoundTimer = 3.2 + Math.random() * 1.4;
      }

      // Defensa en oficina: Alumbrar la ventana derecha (yaw < -32°) con la linterna encendida
      const isShiningAtWindow =
        !isCCTVActive && !isTurnedAround && isFlashlightOn && cameraYawDeg < -32;

      if (isShiningAtWindow) {
        this.repelProgress += dt;
        if (this.repelProgress >= 1.5) {
          this.resetToIdle();
          return;
        }
      } else {
        this.repelProgress = Math.max(0, this.repelProgress - dt * 0.4);
      }

      this.timer -= dt;
      if (this.timer <= 0) {
        this.onAttackPlayer?.('EL OBSERVADOR HA ROTO LA VENTANA LATERAL', 'WINDOW');
      }
    }
  }
}

