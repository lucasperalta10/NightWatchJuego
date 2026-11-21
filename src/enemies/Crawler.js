import * as THREE from 'three';
import { EnemyBase } from './EnemyBase.js';

export class Crawler extends EnemyBase {
  constructor({ audioManager, house, office, onAttackPlayer }) {
    super('El Reptante', audioManager);
    this.house = house;
    this.office = office;
    this.onAttackPlayer = onAttackPlayer;

    this.scratchTimer = 0;

    this._buildMeshes();
    this.resetToIdle();
  }

  _buildMeshes() {
    // 1. Figura agazapada frente al ducto de la Cocina (CAM 02)
    this.meshCam02 = this._createCrawlerMesh();
    this.meshCam02.position.set(1.85, 0.22, -0.4);
    this.meshCam02.rotation.y = Math.PI / 2;
    this.house.sectors['CAM 02']?.group.add(this.meshCam02);

    // 2. Cabeza y garras asomándose tras los barrotes de la rejilla baja de la Oficina
    this.meshGrille = this._createCrawlerMesh();
    this.meshGrille.position.set(2.22, 0.14, 0.45);
    this.meshGrille.rotation.y = -Math.PI / 2;
    this.office.group.add(this.meshGrille);
  }

  _createCrawlerMesh() {
    const group = new THREE.Group();
    const skinMat = new THREE.MeshStandardMaterial({
      color: 0x2c3631,
      roughness: 0.68
    });
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffd166 });

    // Cuerpo bajo reptante
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.22, 0.55), skinMat);
    body.position.set(0, 0.12, -0.2);
    group.add(body);

    // Grupo de cabeza alargada hacia adelante
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 0.15, 0.12);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 10), skinMat);
    head.scale.set(0.95, 0.85, 1.25);
    headGroup.add(head);

    // Ojos amarillos reflectantes tras la rejilla
    const leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.024, 8, 8), eyeMat);
    leftEye.position.set(-0.045, 0.02, 0.13);
    headGroup.add(leftEye);

    const rightEye = new THREE.Mesh(new THREE.SphereGeometry(0.024, 8, 8), eyeMat);
    rightEye.position.set(0.045, 0.02, 0.13);
    headGroup.add(rightEye);

    group.add(headGroup);

    // Brazos delanteros articulados / garras
    const clawGeo = new THREE.CylinderGeometry(0.028, 0.018, 0.36, 6);
    const leftClaw = new THREE.Mesh(clawGeo, skinMat);
    leftClaw.position.set(-0.16, 0.08, 0.14);
    leftClaw.rotation.x = Math.PI / 2.4;
    group.add(leftClaw);

    const rightClaw = new THREE.Mesh(clawGeo, skinMat);
    rightClaw.position.set(0.16, 0.08, 0.14);
    rightClaw.rotation.x = Math.PI / 2.4;
    group.add(rightClaw);

    group.userData.crawlerParts = { body, headGroup, leftClaw, rightClaw };
    return group;
  }

  _animateCrawler(meshGroup, elapsedTime, isAtGrille = false) {
    if (!meshGroup || !meshGroup.visible || !meshGroup.userData.crawlerParts) return;
    const { body, headGroup, leftClaw, rightClaw } = meshGroup.userData.crawlerParts;
    const speed = isAtGrille ? 8.5 : 3.2;

    body.position.y = 0.12 + Math.sin(elapsedTime * speed) * 0.016;
    headGroup.rotation.z = Math.sin(elapsedTime * (speed * 0.7)) * 0.18;
    headGroup.rotation.y = Math.cos(elapsedTime * (speed * 0.5)) * 0.14;

    // Movimiento alternado de arañazo en garras delanteras
    leftClaw.position.z = 0.14 + Math.sin(elapsedTime * speed) * 0.045;
    rightClaw.position.z = 0.14 - Math.sin(elapsedTime * speed) * 0.045;
  }

  _updateMeshVisibility() {
    if (this.meshCam02) this.meshCam02.visible = this.enabled && this.state === 'CAM_02';
    if (this.meshGrille) this.meshGrille.visible = this.enabled && this.state === 'GRILLE';
  }

  resetToIdle() {
    this.state = 'IDLE';
    this.timer = 17 + Math.random() * 11;
    this.scratchTimer = 0;
    this._updateMeshVisibility();
  }

  forceAttackStage() {
    if (!this.enabled) return;
    this.state = 'GRILLE';
    this.timer = 9.0;
    this.scratchTimer = 0.15;
    this._updateMeshVisibility();
    this.audio?.playVentScratch(1.0);
  }

  update(dt, { hourIndex, elapsedTime = 0, isVentSealed }) {
    if (!this.enabled) return;

    this._animateCrawler(this.meshCam02, elapsedTime, false);
    this._animateCrawler(this.meshGrille, elapsedTime, true);

    const speedMult = 1 + hourIndex * 0.15;

    if (this.state === 'IDLE') {
      this.timer -= dt * speedMult;
      if (this.timer <= 0) {
        this.state = 'CAM_02';
        this.timer = 9 + Math.random() * 5;
        this._updateMeshVisibility();
      }
      return;
    }

    if (this.state === 'CAM_02') {
      this.timer -= dt * speedMult;
      if (this.timer <= 0) {
        this.state = 'DUCT';
        this.timer = 8 + Math.random() * 4;
        this.scratchTimer = 0.5;
        this._updateMeshVisibility();
      }
      return;
    }

    if (this.state === 'DUCT') {
      this.scratchTimer -= dt;
      if (this.scratchTimer <= 0) {
        this.audio?.playVentScratch(0.55);
        this.scratchTimer = 2.6 + Math.random() * 1.2;
      }

      this.timer -= dt * speedMult;
      if (this.timer <= 0) {
        if (isVentSealed) {
          this.audio?.playMechanicalSlam(2.1);
          this.resetToIdle();
        } else {
          this.state = 'GRILLE';
          this.timer = 8.5;
          this.scratchTimer = 0.2;
          this._updateMeshVisibility();
        }
      }
      return;
    }

    if (this.state === 'GRILLE') {
      if (isVentSealed) {
        this.audio?.playMechanicalSlam(2.1);
        this.resetToIdle();
        return;
      }

      this.scratchTimer -= dt;
      if (this.scratchTimer <= 0) {
        this.audio?.playVentScratch(1.0);
        this.scratchTimer = 1.8 + Math.random() * 0.8;
      }

      this.timer -= dt;
      if (this.timer <= 0) {
        this.onAttackPlayer?.('EL REPTANTE HA IRRUMPIDO POR EL DUCTO DE VENTILACIÓN', 'GRILLE');
      }
    }
  }
}
