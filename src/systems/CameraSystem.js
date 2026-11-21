import * as THREE from 'three';
import { CCTVOverlay } from '../ui/CCTVOverlay.js';

export class CameraSystem {
  constructor({ sceneManager, office, environment, house, defenseSystem }) {
    this.sceneManager = sceneManager;
    this.office = office;
    this.environment = environment;
    this.house = house;
    this.defenseSystem = defenseSystem;

    this.cameraIds = ['CAM 01', 'CAM 02', 'CAM 03', 'CAM 04'];
    this.activeCamId = 'CAM 01';

    // Estados: 'OFFICE' | 'ZOOMING_IN' | 'CCTV_ACTIVE' | 'ZOOMING_OUT'
    this.state = 'OFFICE';
    this.transitionProgress = 0;
    this.zoomDuration = 0.22;

    // Coordenadas de zoom frente al monitor CRT central
    this.monitorZoomPos = new THREE.Vector3(0, 1.03, -0.76);
    this.startPos = new THREE.Vector3();
    this.startYaw = 0;
    this.startPitch = 0;

    this.isPorchLightActive = false;

    this.overlay = new CCTVOverlay(
      (camId) => this.selectCamera(camId),
      () => this.toggleCCTV(),
      (isHolding) => this.setPorchLight(isHolding)
    );
  }

  get isActive() {
    return this.state === 'CCTV_ACTIVE';
  }

  get isTransitioning() {
    return this.state === 'ZOOMING_IN' || this.state === 'ZOOMING_OUT';
  }

  toggleCCTV() {
    if (this.isTransitioning) return;

    if (this.state === 'OFFICE') {
      this._startZoomIn();
    } else if (this.state === 'CCTV_ACTIVE') {
      this._startZoomOut();
    }
  }

  /**
   * Cierra inmediatamente el monitor CCTV y devuelve la cámara al asiento (ej. durante un Jumpscare 3D)
   */
  forceCloseImmediately() {
    this.setPorchLight(false);
    this.overlay.hide();
    this.sceneManager.renderer.toneMappingExposure = 0.95;
    this.sceneManager.scene.fog.density = 0.075;
    this.house.hideAllSectors();
    this.office.group.visible = true;
    this.environment.group.visible = true;
    this.state = 'OFFICE';
    this.sceneManager.isOverrideActive = false;
    this.sceneManager.camera.position.copy(this.sceneManager.seatPosition);
  }

  _startZoomIn() {
    // Si el jugador estaba mirando al panel trasero (180°), orientar primero al escritorio
    if (this.sceneManager.isTurnedAround) {
      this.sceneManager.isTurnedAround = false;
      this.sceneManager.targetYaw = 0;
      this.sceneManager.targetPitch = -0.05;
    }

    // Apagar linterna manual al entrar al monitor
    this.defenseSystem.setFlashlightOff();

    this.state = 'ZOOMING_IN';
    this.transitionProgress = 0;
    this.sceneManager.isOverrideActive = true;

    this.startPos.copy(this.sceneManager.camera.position);
    this.startYaw = this.sceneManager.currentYaw;
    this.startPitch = this.sceneManager.currentPitch;
  }

  _enterCCTVFeed() {
    this.state = 'CCTV_ACTIVE';

    // Simular ganancia moderada de sensor IR Night-Vision
    this.sceneManager.renderer.toneMappingExposure = 1.12;
    this.sceneManager.scene.fog.density = 0.055;

    // Regla 6.1: Ocultar oficina y exterior, activar únicamente el sector de la cámara actual
    this.office.group.visible = false;
    this.environment.group.visible = false;
    this.house.showOnlySector(this.activeCamId);

    const sector = this.house.getSector(this.activeCamId);
    this.overlay.show(sector);

    // Liberar cursor para poder hacer clic en el mapa táctico además de usar teclas 1-4
    if (document.pointerLockElement) {
      document.exitPointerLock();
    }
  }

  _startZoomOut() {
    this.setPorchLight(false);
    this.overlay.hide();

    // Restaurar exposición y niebla de la oficina
    this.sceneManager.renderer.toneMappingExposure = 0.95;
    this.sceneManager.scene.fog.density = 0.075;

    // Restaurar visibilidad de oficina y ocultar sectores CCTV
    this.house.hideAllSectors();
    this.office.group.visible = true;
    this.environment.group.visible = true;

    this.state = 'ZOOMING_OUT';
    this.transitionProgress = 0;

    // Colocar cámara frente al monitor para interpolar de regreso al asiento
    this.sceneManager.camera.position.copy(this.monitorZoomPos);
    this.sceneManager.camera.rotation.set(-0.02, 0, 0, 'YXZ');

    // Re-activar Pointer Lock para mirar libremente en la oficina
    this.sceneManager.requestPointerLock();
  }

  selectCamera(camId) {
    if (this.state !== 'CCTV_ACTIVE') return;
    if (!this.cameraIds.includes(camId)) return;

    if (this.activeCamId !== camId) {
      this.setPorchLight(false);
      this.activeCamId = camId;
    }

    this.house.showOnlySector(this.activeCamId);
    const sector = this.house.getSector(this.activeCamId);
    this.overlay.setActiveSector(sector);
    this.overlay.triggerStaticBurst(0.95);
  }

  cycleCamera(direction) {
    if (this.state !== 'CCTV_ACTIVE') return;
    const idx = this.cameraIds.indexOf(this.activeCamId);
    const nextIdx = (idx + direction + this.cameraIds.length) % this.cameraIds.length;
    this.selectCamera(this.cameraIds[nextIdx]);
  }

  setPorchLight(active) {
    const canActivate = active && this.state === 'CCTV_ACTIVE' && this.activeCamId === 'CAM 01';
    this.isPorchLightActive = canActivate;
    if (this.house.porchSpotlight) {
      this.house.porchSpotlight.intensity = canActivate ? 45.0 : 0;
    }
  }

  update(dt, elapsedTime) {
    const cam = this.sceneManager.camera;

    if (this.state === 'ZOOMING_IN') {
      this.transitionProgress = Math.min(1, this.transitionProgress + dt / this.zoomDuration);
      const t = this._smoothstep(this.transitionProgress);

      cam.position.lerpVectors(this.startPos, this.monitorZoomPos, t);
      const yaw = THREE.MathUtils.lerp(this.startYaw, 0, t);
      const pitch = THREE.MathUtils.lerp(this.startPitch, -0.02, t);
      cam.rotation.set(pitch, yaw, 0, 'YXZ');

      if (this.transitionProgress >= 1) {
        this._enterCCTVFeed();
      }
      return;
    }

    if (this.state === 'ZOOMING_OUT') {
      this.transitionProgress = Math.min(1, this.transitionProgress + dt / (this.zoomDuration * 0.85));
      const t = this._smoothstep(this.transitionProgress);

      cam.position.lerpVectors(this.monitorZoomPos, this.sceneManager.seatPosition, t);
      const yaw = THREE.MathUtils.lerp(0, this.sceneManager.currentYaw, t);
      const pitch = THREE.MathUtils.lerp(-0.02, this.sceneManager.currentPitch, t);
      cam.rotation.set(pitch, yaw, 0, 'YXZ');

      if (this.transitionProgress >= 1) {
        this.state = 'OFFICE';
        this.sceneManager.isOverrideActive = false;
      }
      return;
    }

    if (this.state === 'CCTV_ACTIVE') {
      const sector = this.house.getSector(this.activeCamId);
      cam.position.copy(sector.camPos);

      // Barrido motorizado lento de cámara de vigilancia
      const autoPan = Math.sin(elapsedTime * sector.panSpeed) * sector.panRange;
      cam.rotation.set(sector.basePitch, sector.baseYaw + autoPan, 0, 'YXZ');

      this.overlay.update(dt, elapsedTime);
    }
  }

  _smoothstep(x) {
    return x * x * (3 - 2 * x);
  }
}

