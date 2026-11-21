import * as THREE from 'three';

export class SceneManager {
  constructor(container) {
    this.container = container;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x030507);
    this.scene.fog = new THREE.FogExp2(0x05080b, 0.075);

    // Única cámara Three.js (Regla 6.1: Prohibido usar Render Targets secundarios)
    this.camera = new THREE.PerspectiveCamera(
      62,
      window.innerWidth / window.innerHeight,
      0.08,
      65
    );
    this.camera.rotation.order = 'YXZ';

    // Posición base sentado frente al escritorio
    this.seatPosition = new THREE.Vector3(0, 1.22, 0.65);
    this.camera.position.copy(this.seatPosition);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.95;

    this.container.appendChild(this.renderer.domElement);

    // Estado de control de cámara en cabina
    this.isPointerLocked = false;
    this.isTurnedAround = false; // false = Frente/Laterales, true = Pared Trasera (180°)
    this.isOverrideActive = false; // Para CCTV en Fase 2

    // Ángulos objetivo y actuales (en radianes)
    this.targetYaw = 0;
    this.targetPitch = -0.05;
    this.currentYaw = 0;
    this.currentPitch = -0.05;

    // Límites en radianes (Frente: cubre puerta izq, monitores centro, ventana/ducto der)
    this.frontYawLimit = THREE.MathUtils.degToRad(85);
    this.rearYawLimit = THREE.MathUtils.degToRad(38);
    this.minPitch = THREE.MathUtils.degToRad(-52); // Permite mirar abajo a la rejilla del suelo
    this.maxPitch = THREE.MathUtils.degToRad(36);

    this.sensitivity = 0.0021;
    this.smoothing = 14.0;
    this.hasStarted = false;
    this.onPointerLockLost = null;

    this._bindEvents();
  }

  _bindEvents() {
    window.addEventListener('resize', () => this._onResize());

    document.addEventListener('pointerlockchange', () => {
      this.isPointerLocked = document.pointerLockElement === this.renderer.domElement;
      const overlay = document.getElementById('pointer-lock-overlay');
      if (this.isPointerLocked) {
        this.hasStarted = true;
        overlay?.classList.add('hidden');
      } else if (this.hasStarted) {
        // Si ya inició la partida y se pierde el Pointer Lock (por ej. al pulsar ESC), notificar a Game
        this.onPointerLockLost?.();
      }
    });

    document.addEventListener('mousemove', (e) => {
      if (!this.isPointerLocked || this.isOverrideActive) return;

      this.targetYaw -= e.movementX * this.sensitivity;
      this.targetPitch -= e.movementY * this.sensitivity;

      this._clampTargetAngles();
    });
  }

  _clampTargetAngles() {
    if (!this.isTurnedAround) {
      this.targetYaw = THREE.MathUtils.clamp(
        this.targetYaw,
        -this.frontYawLimit,
        this.frontYawLimit
      );
    } else {
      const centerRear = Math.PI;
      this.targetYaw = THREE.MathUtils.clamp(
        this.targetYaw,
        centerRear - this.rearYawLimit,
        centerRear + this.rearYawLimit
      );
    }

    this.targetPitch = THREE.MathUtils.clamp(
      this.targetPitch,
      this.minPitch,
      this.maxPitch
    );
  }

  toggleTurnAround() {
    if (this.isOverrideActive) return;

    this.isTurnedAround = !this.isTurnedAround;
    if (this.isTurnedAround) {
      // Girar a 180° hacia el panel eléctrico trasero
      this.targetYaw = Math.PI;
      this.targetPitch = -0.05;
    } else {
      // Volver al frente (escritorio)
      this.targetYaw = 0;
      this.targetPitch = -0.05;
    }
  }

  requestPointerLock() {
    if (!this.isPointerLocked) {
      this.renderer.domElement.requestPointerLock();
    }
  }

  update(dt) {
    if (this.isOverrideActive) return;

    const factor = 1 - Math.exp(-this.smoothing * dt);
    this.currentYaw = THREE.MathUtils.lerp(this.currentYaw, this.targetYaw, factor);
    this.currentPitch = THREE.MathUtils.lerp(this.currentPitch, this.targetPitch, factor);

    this.camera.position.copy(this.seatPosition);
    this.camera.rotation.set(this.currentPitch, this.currentYaw, 0, 'YXZ');
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  getCameraAnglesDeg() {
    return {
      yaw: THREE.MathUtils.radToDeg(this.currentYaw).toFixed(1),
      pitch: THREE.MathUtils.radToDeg(this.currentPitch).toFixed(1)
    };
  }

  _onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
}

