export class NightManager {
  constructor() {
    // Especificación Sección 2:
    // 12:00 AM a 06:00 AM (6 horas virtuales)
    // Duración total: 480 segundos (8 minutos) -> 80 segundos reales por hora virtual
    this.totalNightSeconds = 480;
    this.secondsPerHour = 80;
    this.elapsedSeconds = 0;
    this.isNightComplete = false;
  }

  update(dt) {
    if (this.isNightComplete) return;

    this.elapsedSeconds += dt;
    if (this.elapsedSeconds >= this.totalNightSeconds) {
      this.elapsedSeconds = this.totalNightSeconds;
      this.isNightComplete = true;
    }
  }

  /**
   * Devuelve la hora actual de la noche (0 = 12 AM, 1 = 1 AM, ..., 6 = 6 AM)
   */
  getCurrentHourIndex() {
    return Math.min(6, Math.floor(this.elapsedSeconds / this.secondsPerHour));
  }

  /**
   * Formato digital para el reloj LED de mesa y el HUD (ej. "12:00 AM", "02:34 AM")
   */
  getFormattedTime() {
    if (this.isNightComplete) return '06:00 AM';

    const totalVirtualMinutes = Math.floor((this.elapsedSeconds / this.secondsPerHour) * 60);
    const hourOffset = Math.floor(totalVirtualMinutes / 60);
    const minute = totalVirtualMinutes % 60;

    const displayHour = hourOffset === 0 ? 12 : hourOffset;
    const hStr = String(displayHour).padStart(2, '0');
    const mStr = String(minute).padStart(2, '0');
    return `${hStr}:${mStr} AM`;
  }

  /**
   * Permite saltar a una hora específica desde el DebugPanel (F1)
   */
  setDebugTime(timeLabel) {
    this.isNightComplete = false;
    switch (timeLabel) {
      case '01:00 AM':
        this.elapsedSeconds = 1 * this.secondsPerHour;
        break;
      case '03:00 AM':
        this.elapsedSeconds = 3 * this.secondsPerHour;
        break;
      case '05:59 AM':
        // A ~2 segundos reales de las 06:00 AM para probar victoria rápidamente
        this.elapsedSeconds = this.totalNightSeconds - 2.0;
        break;
      default:
        this.elapsedSeconds = 0;
    }
  }
}

