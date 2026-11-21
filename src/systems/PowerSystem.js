export class PowerSystem {
  constructor() {
    this.powerPct = 100.0;
    this.infinitePower = false;
    this.isBlackout = false;
    this.isBreakerTripped = false;

    // Tasas exactas de consumo (Sección 5 de PROJECT_CONTEXT.md)
    this.RATES = {
      BASE_OFFICE: 0.08,       // % / seg (~38.4% en 480s)
      CCTV_MONITOR: 0.15,      // % / seg
      PORCH_FLOODLIGHT: 0.40,  // % / seg
      MAG_DOOR_CLOSED: 1.20,   // % / seg
      HALLWAY_PULSE_COST: 0.50,// % instantáneo por pulso
      VENT_SEAL_COST: 1.50     // % instantáneo por impacto neumático (dura 8s)
    };

    // Sobrecarga de fusibles (Sección 3.4: Nivel 4 sostenido por >6 seg)
    this.overloadTimer = 0.0;
    this.overloadThresholdSec = 6.0;

    this.currentDrainRate = this.RATES.BASE_OFFICE;
    this.usageLevel = 1; // Barras de 1 a 4

    // Callbacks para eventos de corte eléctrico
    this.onBreakerTrip = null;
    this.onBreakerReset = null;
    this.onBlackout = null;
  }

  /**
   * Consume un porcentaje instantáneo (ej. pulso de luz de pasillo o impacto de ducto)
   */
  consumeInstant(amount) {
    if (this.isBlackout || this.isBreakerTripped) return false;
    if (!this.infinitePower) {
      this.powerPct = Math.max(0, this.powerPct - amount);
      if (this.powerPct <= 0) {
        this._triggerBlackout();
        return false;
      }
    }
    return true;
  }

  update(dt, activeStates) {
    if (this.isBlackout) {
      this.currentDrainRate = 0;
      this.usageLevel = 0;
      return;
    }

    if (this.isBreakerTripped) {
      // Mientras los fusibles están saltados, solo hay un drenaje parásito mínimo
      this.currentDrainRate = 0.03;
      this.usageLevel = 0;
      if (!this.infinitePower) {
        this.powerPct = Math.max(0, this.powerPct - this.currentDrainRate * dt);
        if (this.powerPct <= 0) {
          this._triggerBlackout();
        }
      }
      return;
    }

    const {
      isCCTVActive = false,
      isPorchLightActive = false,
      isDoorClosed = false,
      isVentSealed = false,
      isHallwayLightOn = false
    } = activeStates;

    // Calcular tasa de consumo por segundo
    let rate = this.RATES.BASE_OFFICE;
    if (isCCTVActive) rate += this.RATES.CCTV_MONITOR;
    if (isPorchLightActive) rate += this.RATES.PORCH_FLOODLIGHT;
    if (isDoorClosed) rate += this.RATES.MAG_DOOR_CLOSED;

    this.currentDrainRate = rate;

    // Determinar nivel de barras de consumo (1 a 4)
    let bars = 1;
    if (isCCTVActive) bars++;
    if (isPorchLightActive || isVentSealed || isHallwayLightOn) bars++;
    if (isDoorClosed) bars += 2; // Puerta magnética es de consumo alto continuo
    this.usageLevel = Math.min(4, bars);

    // Verificar sobrecarga térmica en Nivel 4 (> 6 segundos continuos)
    if (this.usageLevel >= 4) {
      this.overloadTimer += dt;
      if (this.overloadTimer >= this.overloadThresholdSec) {
        this.tripBreaker();
      }
    } else {
      this.overloadTimer = Math.max(0, this.overloadTimer - dt * 1.5);
    }

    // Drenar energía de la casa
    if (!this.infinitePower) {
      this.powerPct = Math.max(0, this.powerPct - this.currentDrainRate * dt);
      if (this.powerPct <= 0) {
        this._triggerBlackout();
      }
    }
  }

  tripBreaker() {
    if (this.isBreakerTripped || this.isBlackout) return;
    this.isBreakerTripped = true;
    this.overloadTimer = 0;
    this.onBreakerTrip?.();
  }

  resetBreaker() {
    if (!this.isBreakerTripped || this.isBlackout) return false;
    this.isBreakerTripped = false;
    this.overloadTimer = 0;
    this.onBreakerReset?.();
    return true;
  }

  forceBlackout() {
    this.powerPct = 0.0;
    this._triggerBlackout();
  }

  _triggerBlackout() {
    if (this.isBlackout) return;
    this.isBlackout = true;
    this.isBreakerTripped = false;
    this.usageLevel = 0;
    this.currentDrainRate = 0;
    this.onBlackout?.();
  }
}

