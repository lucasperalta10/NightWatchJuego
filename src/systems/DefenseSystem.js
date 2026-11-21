import * as THREE from 'three';

export class DefenseSystem {
  constructor(sceneManager, office, powerSystem) {
    this.sceneManager = sceneManager;
    this.scene = sceneManager.scene;
    this.camera = sceneManager.camera;
    this.office = office;
    this.powerSystem = powerSystem;

    // 1. Estado de la linterna manual (independiente de la energía de la casa)
    this.isFlashlightOn = false;
    this.flashlightBattery = 100.0;
    this.drainRate = 6.2;    // % por segundo encendida
    this.rechargeRate = 3.4; // % por segundo apagada
    this.maxIntensity = 32.0;

    // 2. Estado de defensas de la oficina conectadas a la red eléctrica
    this.isDoorClosed = false;
    this.isHallwayLightOn = false;
    this.hallwayLightTimer = 0.0;
    this.hallwayPulseDuration = 0.65;

    this.isVentSealed = false;
    this.ventSealTimer = 0.0;
    this.ventMaxDuration = 8.0; // Especificación Sección 5: cede tras 8 seg

    // 3. Raycaster central para interacción con botones, palancas y fusibles
    this.raycaster = new THREE.Raycaster();
    this.raycaster.far = 3.8;
    this.centerNdc = new THREE.Vector2(0, 0);
    this.hoveredInteractId = null;

    this._initFlashlight();
  }

  _initFlashlight() {
    // Regla 6.2: Luz dinámica #1 con sombras proyectadas en tiempo real
    this.flashlight = new THREE.SpotLight(
      0xf4f9ff,
      0,
      22.0,
      THREE.MathUtils.degToRad(40),
      0.68,
      1.1
    );
    this.flashlight.castShadow = true;
    this.flashlight.shadow.mapSize.width = 512;
    this.flashlight.shadow.mapSize.height = 512;
    this.flashlight.shadow.camera.near = 0.15;
    this.flashlight.shadow.camera.far = 22.0;
    this.flashlight.shadow.bias = -0.0006;

    this.flashlightTarget = new THREE.Object3D();
    this.scene.add(this.flashlight);
    this.scene.add(this.flashlightTarget);
    this.flashlight.target = this.flashlightTarget;

    this._forwardVec = new THREE.Vector3();
    this._rightVec = new THREE.Vector3();
  }

  toggleFlashlight() {
    if (!this.isFlashlightOn && this.flashlightBattery < 3.0) {
      return;
    }
    if (this.sceneManager.isOverrideActive) {
      return;
    }

    this.isFlashlightOn = !this.isFlashlightOn;
    this.flashlight.intensity = this.isFlashlightOn ? this.maxIntensity : 0;
  }

  setFlashlightOff() {
    this.isFlashlightOn = false;
    this.flashlight.intensity = 0;
  }

  /**
   * Puerta magnética izquierda (+1.20% / seg mientras esté cerrada)
   */
  toggleSecurityDoor() {
    if (this.powerSystem.isBlackout || this.powerSystem.isBreakerTripped) {
      this.isDoorClosed = false;
      return false;
    }
    this.isDoorClosed = !this.isDoorClosed;
    return true;
  }

  /**
   * Pulso de luz de verificación de pasillo (-0.50% instantáneo)
   */
  triggerHallwayPulse() {
    if (this.isHallwayLightOn) return false;
    if (!this.powerSystem.consumeInstant(this.powerSystem.RATES.HALLWAY_PULSE_COST)) {
      return false;
    }
    this.isHallwayLightOn = true;
    this.hallwayLightTimer = this.hallwayPulseDuration;
    return true;
  }

  /**
   * Compuerta neumática de ventilación (-1.50% por activación, cede tras 8 seg)
   */
  triggerVentSeal() {
    if (this.isVentSealed) return false;
    if (!this.powerSystem.consumeInstant(this.powerSystem.RATES.VENT_SEAL_COST)) {
      return false;
    }
    this.isVentSealed = true;
    this.ventSealTimer = this.ventMaxDuration;
    return true;
  }

  /**
   * Corte forzoso de defensas cuando saltan los fusibles o hay Blackout
   */
  forceReleaseDefenses() {
    this.isDoorClosed = false;
    this.isHallwayLightOn = false;
    this.hallwayLightTimer = 0;
    this.isVentSealed = false;
    this.ventSealTimer = 0;
  }

  /**
   * Ejecuta la interacción contextual según a dónde apunte la retícula o hacia dónde mire el jugador
   */
  handlePrimaryInteract(onOpenCCTV) {
    if (this.sceneManager.isOverrideActive) return;

    // 1. Si apunta directamente a un elemento interactivo con la retícula
    switch (this.hoveredInteractId) {
      case 'DOOR_LOCK_BTN':
        this.toggleSecurityDoor();
        return;
      case 'HALLWAY_LIGHT_BTN':
        this.triggerHallwayPulse();
        return;
      case 'VENT_LEVER':
        this.triggerVentSeal();
        return;
      case 'BREAKER_PANEL':
        this.powerSystem.resetBreaker();
        return;
      case 'CENTER_CRT':
        onOpenCCTV?.();
        return;
    }

    // 2. Atajo direccional ergonómico con tecla E:
    // Si está volteado a 180° (pared trasera) -> Reactivar fusibles
    if (this.sceneManager.isTurnedAround) {
      this.powerSystem.resetBreaker();
      return;
    }

    const yawDeg = THREE.MathUtils.radToDeg(this.sceneManager.currentYaw);
    if (yawDeg > 28) {
      // Mirando al sector izquierdo (Pasillo) -> Alternar puerta magnética
      this.toggleSecurityDoor();
    } else if (yawDeg < -28) {
      // Mirando al sector derecho (Ventana / Ducto) -> Cerrar compuerta neumática
      this.triggerVentSeal();
    }
  }

  getInteractionPrompt() {
    if (this.sceneManager.isOverrideActive) return null;

    if (this.powerSystem.isBlackout) {
      return 'SISTEMA SIN ENERGÍA (APAGÓN TOTAL)';
    }

    switch (this.hoveredInteractId) {
      case 'DOOR_LOCK_BTN':
        if (this.powerSystem.isBreakerTripped) return 'FUSIBLES CAÍDOS — SIN CORRIENTE';
        return this.isDoorClosed
          ? '[CLIC / E] ABRIR PUERTA MAGNÉTICA'
          : '[CLIC / E] CERRAR PUERTA MAGNÉTICA (+1.20%/s)';
      case 'HALLWAY_LIGHT_BTN':
        if (this.powerSystem.isBreakerTripped) return 'FUSIBLES CAÍDOS — SIN CORRIENTE';
        return '[CLIC / Q] PULSO LUZ DE PASILLO (-0.50%)';
      case 'VENT_LEVER':
        if (this.powerSystem.isBreakerTripped) return 'FUSIBLES CAÍDOS — SIN CORRIENTE';
        return this.isVentSealed
          ? `COMPUERTA SELLADA (${this.ventSealTimer.toFixed(1)}s)`
          : '[CLIC / E] CERRAR COMPUERTA DUCTO (-1.50% / 8s)';
      case 'BREAKER_PANEL':
        return this.powerSystem.isBreakerTripped
          ? '[CLIC / E] REACTIVAR LLAVES TÉRMICAS (FUSIBLES)'
          : 'PANEL ELÉCTRICO: FUSIBLES OPERATIVOS [OK]';
      case 'CENTER_CRT':
        if (this.powerSystem.isBreakerTripped) return 'MONITOR SIN SEÑAL — ACTIVE FUSIBLES';
        return '[CLIC / C] ABRIR MONITOR CCTV (+0.15%/s)';
      default:
        return null;
    }
  }

  update(dt, elapsedTime) {
    // 1. Temporizador del pulso de luz de pasillo
    if (this.isHallwayLightOn) {
      this.hallwayLightTimer -= dt;
      if (this.hallwayLightTimer <= 0) {
        this.isHallwayLightOn = false;
        this.hallwayLightTimer = 0;
      }
    }

    // 2. Temporizador de 8s de la compuerta neumática del ducto
    if (this.isVentSealed) {
      this.ventSealTimer -= dt;
      if (this.ventSealTimer <= 0) {
        this.isVentSealed = false;
        this.ventSealTimer = 0;
      }
    }

    // 3. Actualizar batería de linterna manual
    if (this.isFlashlightOn) {
      this.flashlightBattery = Math.max(0, this.flashlightBattery - this.drainRate * dt);
      if (this.flashlightBattery <= 0) {
        this.setFlashlightOff();
      } else if (this.flashlightBattery < 18) {
        const flicker = Math.sin(elapsedTime * 38) > -0.35 ? 1.0 : 0.15;
        this.flashlight.intensity = this.maxIntensity * flicker;
      } else {
        this.flashlight.intensity = this.maxIntensity;
      }
    } else {
      this.flashlightBattery = Math.min(100, this.flashlightBattery + this.rechargeRate * dt);
      this.flashlight.intensity = 0;
    }

    // 4. Sincronizar posición y dirección del SpotLight con la cámara
    this.camera.getWorldDirection(this._forwardVec);
    this._rightVec.crossVectors(this._forwardVec, this.camera.up).normalize();

    this.flashlight.position
      .copy(this.camera.position)
      .addScaledVector(this._rightVec, 0.14)
      .add(new THREE.Vector3(0, -0.08, 0));

    this.flashlightTarget.position
      .copy(this.camera.position)
      .addScaledVector(this._forwardVec, 6.0);

    // 5. Actualizar Raycaster de interacción en oficina
    if (!this.sceneManager.isOverrideActive && this.office?.interactables?.length) {
      this.raycaster.setFromCamera(this.centerNdc, this.camera);
      const hits = this.raycaster.intersectObjects(this.office.interactables, false);
      this.hoveredInteractId = hits.length > 0 ? hits[0].object.userData.interactId : null;
    } else {
      this.hoveredInteractId = null;
    }
  }
}
