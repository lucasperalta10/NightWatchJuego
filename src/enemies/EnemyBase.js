import * as THREE from 'three';

export class EnemyBase {
  constructor(name, audioManager) {
    this.name = name;
    this.audio = audioManager;
    this.enabled = true;

    this.state = 'IDLE';
    this.timer = 0;
    this.repelProgress = 0;
  }

  setEnabled(active) {
    this.enabled = active;
    if (!active) {
      this.resetToIdle();
    }
  }

  resetToIdle() {
    this.state = 'IDLE';
    this.timer = 0;
    this.repelProgress = 0;
    this._updateMeshVisibility();
  }

  /**
   * Construye una silueta humanoide extraterrestre estilizada (inspirada en Signs / Terror Analógico)
   * y guarda referencias en userData.parts para micro-animaciones procedurales sin costo de GPU.
   */
  _createHumanoidFigure(scale = 1.0, eyeColor = 0xcceeff) {
    const group = new THREE.Group();

    const skinMat = new THREE.MeshStandardMaterial({
      color: 0x262e2a,
      roughness: 0.72,
      metalness: 0.12
    });

    const eyeMat = new THREE.MeshBasicMaterial({
      color: eyeColor
    });

    // Torso delgado y alargado
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.72, 6, 8), skinMat);
    torso.position.y = 1.25;
    torso.castShadow = true;
    group.add(torso);

    // Cuello largo
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.07, 0.22, 8), skinMat);
    neck.position.y = 1.72;
    group.add(neck);

    // Grupo de cabeza + ojos para poder ladear el cráneo de forma inquietante
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 1.94, 0);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 10), skinMat);
    head.scale.set(0.88, 1.32, 1.08);
    head.castShadow = true;
    headGroup.add(head);

    // Ojos pálidos reflectantes en la oscuridad
    const leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 8), eyeMat);
    leftEye.scale.set(1.3, 0.7, 0.6);
    leftEye.position.set(-0.052, -0.01, 0.135);
    headGroup.add(leftEye);

    const rightEye = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 8), eyeMat);
    rightEye.scale.set(1.3, 0.7, 0.6);
    rightEye.position.set(0.052, -0.01, 0.135);
    headGroup.add(rightEye);

    group.add(headGroup);

    // Extremidades largas y dedos alargados
    const limbGeo = new THREE.CylinderGeometry(0.04, 0.028, 0.94, 7);
    const leftArm = new THREE.Mesh(limbGeo, skinMat);
    leftArm.position.set(-0.24, 1.12, 0);
    leftArm.rotation.z = 0.08;
    group.add(leftArm);

    const rightArm = new THREE.Mesh(limbGeo, skinMat);
    rightArm.position.set(0.24, 1.12, 0);
    rightArm.rotation.z = -0.08;
    group.add(rightArm);

    const legGeo = new THREE.CylinderGeometry(0.055, 0.04, 0.92, 7);
    const leftLeg = new THREE.Mesh(legGeo, skinMat);
    leftLeg.position.set(-0.1, 0.46, 0);
    group.add(leftLeg);

    const rightLeg = new THREE.Mesh(legGeo, skinMat);
    rightLeg.position.set(0.1, 0.46, 0);
    group.add(rightLeg);

    group.scale.setScalar(scale);
    group.userData.parts = {
      torso,
      headGroup,
      leftArm,
      rightArm
    };

    return group;
  }

  /**
   * Aplica micro-animaciones procedurales inquietantes (respiración, ladeo de cabeza, espasmo)
   */
  _animateHumanoid(figureGroup, elapsedTime, phaseOffset = 0, isAggressive = false) {
    if (!figureGroup || !figureGroup.visible || !figureGroup.userData.parts) return;
    const { torso, headGroup, leftArm, rightArm } = figureGroup.userData.parts;
    const t = elapsedTime + phaseOffset;

    // Respiración sutil en el torso
    const breath = Math.sin(t * 2.2) * 0.018;
    torso.position.y = 1.25 + breath;

    // Ladeo antinatural de cabeza + micro-espasmo ocasional
    const twitch = Math.sin(t * 19.3) * Math.sin(t * 7.1) > 0.92 ? 0.22 : 0;
    headGroup.rotation.z = Math.sin(t * 1.1) * 0.16 + twitch;
    headGroup.rotation.y = Math.cos(t * 0.85) * 0.14;

    if (isAggressive) {
      // Brazos semi-levantados de forma amenazante en el umbral o ventana
      leftArm.rotation.x = -0.45 + Math.sin(t * 4.5) * 0.12;
      rightArm.rotation.x = -0.52 + Math.cos(t * 4.5) * 0.12;
      leftArm.rotation.z = 0.18;
      rightArm.rotation.z = -0.18;
    } else {
      leftArm.rotation.x = Math.sin(t * 1.4) * 0.06;
      rightArm.rotation.x = -Math.sin(t * 1.4) * 0.06;
      leftArm.rotation.z = 0.08;
      rightArm.rotation.z = -0.08;
    }
  }

  _updateMeshVisibility() {}
}
