# NIGHT WATCH — ESTADO DEL PROYECTO Y HOJA DE RUTA (STATUS TRACKER)

**Proyecto:** *NIGHT WATCH* (Survival Horror 3D en Cabina Fija)  
**Versión actual:** `v1.0.0`  
**Fase actual:** Fase 4 Completada (Versión `v1.0.0` íntegra y operativa)  
**Rendimiento objetivo:** 60 FPS constantes en navegador (Cumplido: ~8-14 Draw Calls activos por vista)  
**Última actualización:** 06/11/2026  

---

## 1. RESUMEN EJECUTIVO DE FASES

| Fase / Módulo | Descripción | Estado | Versión |
|---|---|---|---|
| **Fase 1** | Cabina 3D procedural (Oficina + Exterior), cámara *pan & tilt* con Pointer Lock, giro 180°, linterna `SpotLight` (`F`) y Panel Debug (`F1`). | ✅ **Completado y Validado** | `v0.4.0` |
| **Ajuste 1.1** | Calibración de potencia, apertura (`40°`) y alcance (`22m`) de linterna táctica y reflectancia de materiales. | ✅ **Completado y Validado** | `v0.4.1` |
| **Fase 2 — Módulo 2.1** | `CameraSystem` de cámara única (sin *Render Targets*), 4 sectores en `House.js` (`CAM 01` a `04`), filtro CRT 2D y mapa táctico interactivo (`C`). | ✅ **Completado y Validado** | `v0.5.0` |
| **Ajuste 2.1.1** | Lámpara de escritorio 3D con iluminación cálida suave en oficina y balance de visión nocturna IR en cámaras. | ✅ **Completado y Validado** | `v0.5.1` |
| **Fase 2 — Módulo 2.2** | `PowerSystem` (consumos exactos y sobrecarga de fusibles Nivel 4 > 6s), `NightManager` (12 AM – 6 AM, 80s/hora) e interacciones 3D por `Raycaster` (`Clic` / `E` / `Q`). | ✅ **Completado y Validado** | `v0.6.0` |
| **Fase 3** | `AudioManager` espacial 3D (`Web Audio API`), IA de las 3 entidades (*Observador*, *Reptante*, *Intruso*), radar en CRT izquierdo y botón `IA Entidades: ON/OFF` en `F1`. | ✅ **Completado y Validado** | `v0.7.0` |
| **Ajuste 3.1** | Menú de Pausa total (`P` / `ESC`) con sliders de volumen persistentes en `localStorage` y reducción de estática de *El Intruso* en `CAM 04`. | ✅ **Completado y Validado** | `v0.7.0` |
| **Fase 4 — Módulos 4.1 y 4.2** | Secuencias de *Jumpscare* 3D en cabina desde el vector de ataque y micro-animaciones procedurales en las 3 criaturas. | ✅ **Completado y Validado** | `v0.8.0` |
| **Fase 4 — Módulos 4.3 y 4.4** | Eventos ambientales progresivos por hora (viento exterior, anomalía EMP a las 3 AM, amanecer 6 AM) y terminal de título CRT `v1.0.0`. | ✅ **Implementado (`v1.0.0`)** | `v1.0.0` |

---

## 2. PUNTO EXACTO DONDE LO DEJAMOS (ESTADO ACTUAL)

El *Core Loop* jugable de principio a fin (`12:00 AM` a `06:00 AM`) ya es **100% funcional y jugable**:

1. **Cabina y Controles Operativos ([`Office.js`](file:///c:/Users/SP/Desktop/juegodemiedo2/src/world/Office.js), [`DefenseSystem.js`](file:///c:/Users/SP/Desktop/juegodemiedo2/src/systems/DefenseSystem.js)):**
   * Rotación suave en primera persona desde el escritorio con giro de `180°` (`Espacio` / `S`) hacia el panel eléctrico trasero.
   * **3 Monitores CRT en escritorio:** Izquierdo (Radar de sensores con alertas rojas por sector), Central (Visor CCTV con estática), Derecho (Telemetría eléctrica % y barras de carga 1–4).
   * **Reloj despertador LED rojo** sincronizado con el tiempo real de la noche (`80s = 1 hora`).
   * **Lámpara de escritorio** que ilumina suavemente la mesa sin inutilizar la linterna táctica (`F`).
   * **Defensas interactivas por retícula (`Clic`) o teclado (`E` / `Q`):** Puerta electromagnética izquierda, pulso de luz de pasillo izquierdo, compuerta neumática del ducto derecho (cede tras 8s) y reactivación de fusibles traseros.

2. **Sistema CCTV ([`CameraSystem.js`](file:///c:/Users/SP/Desktop/juegodemiedo2/src/systems/CameraSystem.js), [`House.js`](file:///c:/Users/SP/Desktop/juegodemiedo2/src/world/House.js), [`CCTVOverlay.js`](file:///c:/Users/SP/Desktop/juegodemiedo2/src/ui/CCTVOverlay.js)):**
   * Conmutación instantánea de cámara única entre `CAM 01` (Porche + Reflector exterior `E`), `CAM 02` (Cocina/Ducto), `CAM 03` (Patio/Bosque) y `CAM 04` (Pasillo Central).
   * Estática analógica calibrada para distinguir claramente cada habitación y a las criaturas.

3. **IA Extraterrestre y Audio Espacial 3D ([`Observer.js`](file:///c:/Users/SP/Desktop/juegodemiedo2/src/enemies/Observer.js), [`Crawler.js`](file:///c:/Users/SP/Desktop/juegodemiedo2/src/enemies/Crawler.js), [`Intruder.js`](file:///c:/Users/SP/Desktop/juegodemiedo2/src/enemies/Intruder.js), [`AudioManager.js`](file:///c:/Users/SP/Desktop/juegodemiedo2/src/core/AudioManager.js)):**
   * Las 3 entidades avanzan por sus rutas específicas, escalan su agresividad según la hora de la noche, emiten señales auditivas espacializadas (canal derecho/izquierdo) y responden a sus respectivas mecánicas de defensa.

4. **Pausa y Herramientas de Desarrollo ([`Game.js`](file:///c:/Users/SP/Desktop/juegodemiedo2/src/core/Game.js), [`DebugPanel.js`](file:///c:/Users/SP/Desktop/juegodemiedo2/src/systems/DebugPanel.js)):**
   * **Menú de Pausa (`P` / `ESC`):** Detiene el 100% de la simulación y el audio, con control de volúmenes (`Master`, `SFX`, `Ambiente`) guardados en `localStorage`.
   * **Panel Debug (`F1`):** Incluye interruptor **`IA Entidades: ON / OFF`**, botones para forzar ataques individuales (`Atq. Obs`, `Atq. Rept`, `Atq. Intr`), saltos de hora (`1 AM`, `3 AM`, `5:59 AM`), energía infinita, salto de fusibles y apagón forzado (`0%`).

---

## 3. SIGUIENTE OBJETIVO (FASE 4 — INMERSIÓN, JUMPSCARES 3D Y PULIDO FINAL)

Cuando retomemos el desarrollo, los objetivos planificados para la **Fase 4** son:

1. **Módulo 4.1 — Secuencias de *Jumpscare* 3D en Cabina:**
   * Antes de mostrar la pantalla de fin de partida (`SEÑAL INTERRUMPIDA`), ejecutar una animación de cámara y aparición 3D dramática de la criatura atacante dentro de la oficina (sacudida de cámara, parpadeo de luces y abalanzamiento desde la ventana, el ducto o la puerta).
2. **Módulo 4.2 — Detalle Visual y Animación Procedural de Entidades:**
   * Añadir micro-animaciones inquietantes a las 3 criaturas (respiración, inclinación de cabeza al observar la cámara, movimiento de extremidades al reptar por el ducto o asomarse al umbral).
3. **Módulo 4.3 — Progresión Atmosférica Nocturna (Eventos Horarios):**
   * Variaciones sutiles de tensión entre las `12:00 AM` y las `06:00 AM` (incremento de viento/lluvia exterior, parpadeos puntuales de tensión eléctrica a las `03:00 AM`, sonido de campanas/amanecer a las `06:00 AM`).
4. **Módulo 4.4 — Pantalla de Título y Cierre de Versión `v1.0`:**
   * Menú principal diegético estilo monitor CRT antiguo antes de iniciar el turno nocturno.

---

## 4. DOCUMENTOS DE REFERENCIA DEL REPOSITORIO

* [`PROJECT_CONTEXT.md`](file:///c:/Users/SP/Desktop/juegodemiedo2/PROJECT_CONTEXT.md) — Especificación técnica maestra y reglas de arquitectura.
* [`PROJECT_STATUS.md`](file:///c:/Users/SP/Desktop/juegodemiedo2/PROJECT_STATUS.md) — Seguimiento de versión, fase actual, punto de control y objetivos (este documento).
* [`CHANGELOG.md`](file:///c:/Users/SP/Desktop/juegodemiedo2/CHANGELOG.md) — Historial detallado de cambios implementados por fase y ajuste.

