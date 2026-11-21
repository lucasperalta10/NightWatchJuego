import * as THREE from 'three';
import { EnemyBase } from './EnemyBase.js';

export class Intruder extends EnemyBase {
  constructor({ audioManager, house, office, onAttackPlayer }) {
    super('El Intruso', audioManager);
    this.house = house;
    this.office = office;
    this.onAttackPlayer = onAttackPlayer;

    this.stepSoundTimer = 0;

    this._buildMeshes();
    this.resetToIdle();
  }

  _buildMeshes() {
    // 1. Silueta alta al fondo del Pasillo (CAM 04)
    this.meshCam04Far = this._createHumanoidFigure(1.12, 0xff758f);
    this.meshCam04Far.position.set(0.05, 0, -2.5);
    this.house.sectors['CAM 04']?.group.add(this.meshCam04Far);

    // 2. Silueta alta muy cerca de la cámara del Pasillo (CAM 04)
    this.meshCam04Near = this._createHumanoidFigure(1.14, 0xff4d6d);
    this.meshCam04Near.position.set(0.18, 0, 0.6);
    this.house.sectors['CAM 04']?.group.add(this.meshCam04Near);

    // 3. Figura alta inmóvil en el umbral de la Puerta Izquierda de la Oficina
    this.meshDoorway = this._createHumanoidFigure(1.14, 0xffccd5);
    this.meshDoorway.position.set(-2.55, 0, -0.75);
    this.meshDoorway.rotation.y = Math.PI / 2;
    this.office.group.add(this.meshDoorway);
  }

  _updateMeshVisibility() {
    if (this.meshCam04Far) this.meshCam04Far.visible = this.enabled && this.state === 'CAM_04_FAR';
    if (this.meshCam04Near) this.meshCam04Near.visible = this.enabled && this.state === 'CAM_04_NEAR';
    if (this.meshDoorway) this.meshDoorway.visible = this.enabled && this.state === 'DOORWAY';
  }

  /**
   * Devuelve el nivel de estática extra que provoca en CAM 04 (moderada para permitir ver el pasillo)
   */
  getCam04Interference() {
    if (!this.enabled) return 0;
    if (this.state === 'CAM_04_FAR') return 0.18;
    if (this.state === 'CAM_04_NEAR') return 0.38;
    if (this.state === 'DOORWAY') return 0.12;
    return 0;
  }

  resetToIdle() {
    this.state = 'IDLE';
    this.timer = 19 + Math.random() * 12;
    this.repelProgress = 0;
    this.stepSoundTimer = 0;
    this._updateMeshVisibility();
  }

  forceAttackStage() {
    if (!this.enabled) return;
    this.state = 'DOORWAY';
    this.timer = 9.5;
    this.repelProgress = 0;
    this._updateMeshVisibility();
    this.audio?.playHeavyFootstep(1.0);
  }

  update(dt, { hourIndex, elapsedTime = 0, isDoorClosed }) {
    if (!this.enabled) return;

    this._animateHumanoid(this.meshCam04Far, elapsedTime, 0.7, false);
    this._animateHumanoid(this.meshCam04Near, elapsedTime, 2.3, false);
    this._animateHumanoid(this.meshDoorway, elapsedTime, 4.1, true);

    const speedMult = 1 + hourIndex * 0.15;

    if (this.state === 'IDLE') {
      this.timer -= dt * speedMult;
      if (this.timer <= 0) {
        this.state = 'CAM_04_FAR';
        this.timer = 10 + Math.random() * 5;
        this.audio?.playHeavyFootstep(0.45);
        this._updateMeshVisibility();
      }
      return;
    }

    if (this.state === 'CAM_04_FAR') {
      this.timer -= dt * speedMult;
      if (this.timer <= 0) {
        this.state = 'CAM_04_NEAR';
        this.timer = 9 + Math.random() * 4;
        this.audio?.playHeavyFootstep(0.75);
        this._updateMeshVisibility();
      }
      return;
    }

    if (this.state === 'CAM_04_NEAR') {
      this.timer -= dt * speedMult;
      if (this.timer <= 0) {
        this.state = 'DOORWAY';
        this.timer = 9.5; // Segundos en el umbral antes de atacar si no se cierra la puerta
        this.repelProgress = 0;
        this.stepSoundTimer = 2.8;
        this.audio?.playHeavyFootstep(1.0);
        this._updateMeshVisibility();
      }
      return;
    }

    if (this.state === 'DOORWAY') {
      // Defensa: Mantener la puerta electromagnética cerrada durante 2.4 segundos
      if (isDoorClosed) {
        this.repelProgress += dt;
        if (this.repelProgress >= 2.4) {
          this.audio?.playMechanicalSlam(-2.1);
          this.resetToIdle();
          return;
        }
      } else {
        this.repelProgress = Math.max(0, this.repelProgress - dt * 0.5);

        // Crujidos sutiles en la madera del umbral izquierdo
        this.stepSoundTimer -= dt;
        if (this.stepSoundTimer <= 0) {
          this.audio?.playHeavyFootstep(0.85);
          this.stepSoundTimer = 3.2 + Math.random() * 1.2;
        }

        this.timer -= dt;
        if (this.timer <= 0) {
          this.onAttackPlayer?.('EL INTRUSO HA ENTRADO POR LA PUERTA DEL PASILLO', 'DOORWAY');
        }
      }
    }
  }
}

