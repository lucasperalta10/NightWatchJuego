# NIGHT WATCH — REGISTRO DE CAMBIOS E IMPLEMENTACIÓN (CHANGELOG)

Este documento registra de forma cronológica e incremental cada fase, submódulo y ajuste técnico implementado en el proyecto. Para consultar el estado actual, versión y hoja de ruta, revisa [`PROJECT_STATUS.md`](file:///c:/Users/SP/Desktop/juegodemiedo2/PROJECT_STATUS.md).

---

## [Fase 1] — Arquitectura Base, Escena 3D de Cabina, Linterna y Debug
**Estado:** Completado y Validado

### 1. Configuración e Infraestructura Inicial
* **[`package.json`](file:///c:/Users/SP/Desktop/juegodemiedo2/package.json):** Configuración del entorno con **Vite** y **Three.js** (`ES6 Modules`).
* **[`index.html`](file:///c:/Users/SP/Desktop/juegodemiedo2/index.html) y [`src/style.css`](file:///c:/Users/SP/Desktop/juegodemiedo2/src/style.css):** Maquetación del contenedor WebGL, retícula central, indicadores HUD de reloj/energía/batería, pantalla de inicio con captura de *Pointer Lock* y ventana flotante de depuración (`F1`).

### 2. Núcleo WebGL y Control de Cámara en Primera Persona
* **[`src/core/SceneManager.js`](file:///c:/Users/SP/Desktop/juegodemiedo2/src/core/SceneManager.js):**
  * Configuración de una **única cámara Three.js** (`PerspectiveCamera`), `WebGLRenderer` con `ACESFilmicToneMapping` y sombras suaves (`PCFSoftShadowMap`).
  * Control de rotación con *Pointer Lock* desde el asiento del jugador: paneo frontal limitado (`±85°`) para cubrir puerta izquierda, escritorio central y ventana/ducto derecho, más inclinación vertical (`-52°` a `+36°`).
  * Giro rápido de `180°` (`Espacio` o `S`) hacia la pared trasera para operar el panel eléctrico.

### 3. Construcción Procedural de la Oficina y Exterior
* **[`src/world/Office.js`](file:///c:/Users/SP/Desktop/juegodemiedo2/src/world/Office.js):**
  * Habitación a escala exacta (`4.2m × 2.6m × 3.6m`).
  * **Centro de Mando (Frente):** Escritorio de madera con 3 monitores CRT con texturas dinámicas Canvas 2D (CCTV central con estática, mapa esquemático izquierdo y telemetría eléctrica derecha) y reloj despertador digital LED rojo.
  * **Sector Pasillo (Izquierda):** Marco de puerta abierta hacia el pasillo oscuro, puerta electromagnética superior y caja de control con botones de bloqueo y luz.
  * **Sector Exterior y Ventilación (Derecha):** Ventana con cristal semitraslúcido y persianas entreabiertas; rejilla baja de ventilación a ras del suelo con compuerta neumática y palanca.
  * **Pared Trasera (`180°`):** Gabinete industrial de llaves térmicas (fusibles) e indicador luminoso.
* **[`src/world/Environment.js`](file:///c:/Users/SP/Desktop/juegodemiedo2/src/world/Environment.js):** Terreno exterior, pinos entre la niebla y resplandor lunar frío visibles a través de la ventana derecha.

### 4. Linterna Táctica y Panel Debug
* **[`src/systems/DefenseSystem.js`](file:///c:/Users/SP/Desktop/juegodemiedo2/src/systems/DefenseSystem.js):** Implementación del `SpotLight` dinámico con sombras proyectadas (Tecla `F`), descarga continua (`6.2%/s`), recarga pasiva (`3.4%/s`) y parpadeo de batería crítica (`<18%`).
* **[`src/systems/DebugPanel.js`](file:///c:/Users/SP/Desktop/juegodemiedo2/src/systems/DebugPanel.js):** Menú `F1` con contador de FPS en tiempo real, *Draw Calls*, geometrías en VRAM y ángulos de cámara.

### 5. Ajuste 1.1 — Calibración del Haz de Linterna Táctica
* Incremento de intensidad máxima de la linterna (`4.2` → `32.0`, alcance `22m`, ángulo `40°` y `penumbra: 0.68`) y ajuste de reflectancia de materiales de la oficina para iluminar claramente el cuarto al encenderla.

---

## [Fase 2 - Módulo 2.1] — Sistema de Cámaras CCTV y Sectores de la Casa
**Estado:** Completado y Validado

### 1. Sectores 3D Remotos de la Casa
* **[`src/world/House.js`](file:///c:/Users/SP/Desktop/juegodemiedo2/src/world/House.js):** Creación de los 4 sectores independientes (ocultos por defecto para mantener `0 Draw Calls` adicionales cuando no se observan):
  * **`CAM 01` (Porche Delantero):** Deck de madera, columnas, escalones hacia el bosque y **Reflector del Porche** (`SpotLight` dinámico #2 con sombras, activable con `E` o clic).
  * **`CAM 02` (Cocina / Ducto Sur):** Mesada, refrigerador, mesa de comedor y boca del ducto metálico de ventilación.
  * **`CAM 03` (Patio Lateral / Bosque):** Cerca perimetral, cobertizo de madera y pinos densos.
  * **`CAM 04` (Pasillo Central):** Corredor de madera con zócalos, cuadros, reloj de péndulo y puerta de acceso hacia la oficina.

### 2. Conmutación de Cámara Única y Filtro CRT 2D
* **[`src/systems/CameraSystem.js`](file:///c:/Users/SP/Desktop/juegodemiedo2/src/systems/CameraSystem.js):** Transición suave de zoom hacia el monitor central al pulsar `C`, ocultando el grupo de la oficina y mostrando exclusivamente el sector activo con barrido motorizado automático.
* **[`src/ui/CCTVOverlay.js`](file:///c:/Users/SP/Desktop/juegodemiedo2/src/ui/CCTVOverlay.js):** Capa superpuesta DOM/Canvas 2D con buffers pre-calculados de ruido estático analógico (`320×180` pixelado), *scanlines* CRT, indicador `REC` y **Mapa Táctico (Blueprint)** interactivo mediante clic o teclas `1`–`4` / `A`–`D` / flechas.

### 3. Ajuste 2.1.1 — Lámpara de Escritorio y Balance de Iluminación IR
* Adición de una **lámpara de escritorio 3D** en el lado izquierdo de la mesa ([`Office.js`](file:///c:/Users/SP/Desktop/juegodemiedo2/src/world/Office.js)) con luz cálida suave de corto alcance (`intensidad 1.35`, radio `3.8m`) para perfilar el escritorio sin reemplazar la necesidad de la linterna táctica.
* Calibración de las luces infrarrojas (`PointLight` `7.5–9.0`), contraste de materiales y exposición (`1.12`) en las 4 cámaras CCTV para distinguir el entorno sin brillo exagerado.

---

## [Fase 2 - Módulo 2.2] — Sistema Eléctrico, Reloj Nocturno y Defensas Interactivas
**Estado:** Completado y Validado

### 1. Reloj de Tiempo Real (`12:00 AM` a `06:00 AM`)
* **[`src/systems/NightManager.js`](file:///c:/Users/SP/Desktop/juegodemiedo2/src/systems/NightManager.js):**
  * Progresión exacta de **480 segundos (8 minutos)** para toda la noche (**80 segundos reales por cada hora virtual**).
  * Sincronización en tiempo real con el reloj despertador LED 3D del escritorio y el HUD, más saltos de prueba desde el panel `F1` (`1:00 AM`, `3:00 AM`, `5:59 AM`) y detección de victoria a las `06:00 AM`.

### 2. Gestión de Energía, Consumos y Fusibles
* **[`src/systems/PowerSystem.js`](file:///c:/Users/SP/Desktop/juegodemiedo2/src/systems/PowerSystem.js):**
  * Implementación exacta de la tabla de consumos de la especificación:
    * Consumo base de oficina: `0.08% / seg`.
    * Monitor CCTV activo: `+0.15% / seg`.
    * Reflector exterior del porche (`CAM 01`): `+0.40% / seg`.
    * Pulso de luz de verificación de pasillo: `0.50%` instantáneo.
    * Puerta electromagnética cerrada: `+1.20% / seg`.
    * Compuerta neumática del ducto: `1.50%` por activación (cede tras `8 seg`).
  * **Sobrecarga de Fusibles:** Si el consumo se mantiene en **Nivel 4 (4 barras)** durante más de **6 segundos**, saltan los fusibles térmicos, desactivando el monitor y abriendo las defensas hasta que el jugador gire `180°` y reactive el panel trasero.
  * **Apagón Total (*Blackout*):** Al llegar a `0%`, se cortan definitivamente todas las luces, pantallas y defensas de la casa.

### 3. Interacciones 3D en Oficina (`Raycaster` y Atajos)
* **[`src/systems/DefenseSystem.js`](file:///c:/Users/SP/Desktop/juegodemiedo2/src/systems/DefenseSystem.js) y [`src/world/Office.js`](file:///c:/Users/SP/Desktop/juegodemiedo2/src/world/Office.js):**
  * Detección por `THREE.Raycaster` desde la retícula central hacia los controles 3D de la cabina (con resaltado de retícula e indicador contextual en pantalla `#interaction-prompt`), operable tanto con **Clic Izquierdo** como con las teclas **`E`** y **`Q`**:
    * **Puerta Magnética Izquierda (`Clic` en botón superior o `E` mirando a la izquierda):** Animación vertical de cierre/apertura de la compuerta blindada y cambio de color del botón (`Rojo` ↔ `Verde`).
    * **Luz de Pasillo Izquierdo (`Clic` en botón ámbar o `Q`):** Pulso de iluminación intensa (`0.65s`) dentro del umbral oscuro del pasillo.
    * **Compuerta Neumática del Ducto (`Clic` en palanca roja o `E` mirando a la derecha):** Animación de la palanca y cierre de la compuerta metálica durante `8 segundos` antes de ceder automáticamente.
    * **Panel Eléctrico Trasero (`Clic` o `E` al girar `180°`):** Reactivación de fusibles caídos con luz piloto roja de alerta cuando hay sobrecarga.

---

## [Fase 3] — Audio Espacial 3D, IA de las 3 Entidades Extraterrestres y Control Debug
**Estado:** Implementado (En validación)

### 1. Sistema de Audio Espacial Procedural (`Web Audio API`)
* **[`src/core/AudioManager.js`](file:///c:/Users/SP/Desktop/juegodemiedo2/src/core/AudioManager.js):**
  * Síntesis procedural 100% libre de archivos pesados con nodos `PannerNode` para espacialización 3D y persistencia de volúmenes en `localStorage`:
    * **Canal Derecho (`X > 0`):** Toques secos en el cristal de la ventana (*tap... tap*) para *El Observador* y arañazos metálicos rítmicos en el conducto bajo para *El Reptante*.
    * **Canal Izquierdo (`X < 0`):** Crujidos y pasos pesados sobre madera para *El Intruso*.
    * **Efectos de Cabina:** Cierre mecánico de puerta/compuerta, clics de botones/cámaras, caída de tensión por fusibles, dron ambiental nocturno y estridencia de *Jumpscare*.

### 2. Las Tres Entidades Extraterrestres
* **[`src/enemies/EnemyBase.js`](file:///c:/Users/SP/Desktop/juegodemiedo2/src/enemies/EnemyBase.js):** Clase base con generador procedural de siluetas humanoides extraterrestres (cráneo alargado, ojos reflectantes, extremidades delgadas).
* **[`src/enemies/Observer.js`](file:///c:/Users/SP/Desktop/juegodemiedo2/src/enemies/Observer.js) (*El Observador*):**
  * Ruta: `IDLE` → `CAM_03` (Bosque) → `CAM_01` (Porche) → `WINDOW` (Ventana derecha de la oficina).
  * Señal en oficina: Silueta tras las persianas y sonido *tap... tap* en el vidrio.
  * Defensa: Activar el reflector del porche en `CAM 01` (`E`) o alumbrar la ventana derecha con la linterna (`F`) durante `1.5s`.
* **[`src/enemies/Crawler.js`](file:///c:/Users/SP/Desktop/juegodemiedo2/src/enemies/Crawler.js) (*El Reptante*):**
  * Ruta: `IDLE` → `CAM_02` (Boca del ducto en cocina) → `DUCT` (Avance oculto con arañazos metálicos en canal derecho) → `GRILLE` (Ojos amarillos asomándose tras la rejilla baja derecha de la oficina).
  * Defensa: Cerrar la compuerta neumática (`E` o clic en palanca roja) para que choque contra el metal y retroceda.
* **[`src/enemies/Intruder.js`](file:///c:/Users/SP/Desktop/juegodemiedo2/src/enemies/Intruder.js) (*El Intruso*):**
  * Ruta: `IDLE` → `CAM_04_FAR` → `CAM_04_NEAR` (Provoca fuerte interferencia estática en `CAM 04` y pasos pesados a la izquierda) → `DOORWAY` (Figura alta inmóvil en el umbral de la puerta izquierda, visible con el pulso de luz `Q` o linterna `F`).
  * Defensa: Cerrar la puerta electromagnética (`E` o clic en botón superior) durante `2.4s` hasta escuchar el golpe de retirada.

### 3. Radar en Monitor CRT Izquierdo y Controles Debug de Entidades (`F1`)
* **[`src/world/Office.js`](file:///c:/Users/SP/Desktop/juegodemiedo2/src/world/Office.js):** El monitor CRT izquierdo (`RADAR SENSORES CASA`) ahora resalta en rojo los sectores donde las entidades están activas.
* **[`src/systems/DebugPanel.js`](file:///c:/Users/SP/Desktop/juegodemiedo2/src/systems/DebugPanel.js):**
  * Botón principal **`IA Entidades: ON / OFF`** para activar o desactivar por completo a las tres criaturas en cualquier momento.
  * Telemetría en vivo del estado y temporizador de cada entidad (`Observador`, `Reptante`, `Intruso`).
  * Botones de prueba rápida (**`Atq. Obs`**, **`Atq. Rept`**, **`Atq. Intr`**) para forzar a cualquiera de las tres criaturas directamente a su fase de ataque en la oficina.
  * Al abrir `F1`, se libera automáticamente el cursor para hacer clic cómodamente en los botones del menú.

### 4. Ajuste 3.1 — Menú de Pausa Total, Ajustes de Volumen y Calibración de Estática
* **Menú de Pausa (`[P]` / `[ESC]`) — [`index.html`](file:///c:/Users/SP/Desktop/juegodemiedo2/index.html), [`src/style.css`](file:///c:/Users/SP/Desktop/juegodemiedo2/src/style.css) y [`src/core/Game.js`](file:///c:/Users/SP/Desktop/juegodemiedo2/src/core/Game.js):**
  * Congela el 100% de la simulación (reloj nocturno `NightManager`, drenaje de energía y sobrecargas de `PowerSystem`, descarga/recarga de linterna y compuertas de `DefenseSystem`, barrido de cámaras y temporizadores de IA de las 3 entidades).
  * Suspende el `AudioContext` de `Web Audio API` mientras la pausa está activa y lo reanuda al volver.
  * Incluye controles deslizantes persistentes en `localStorage` para **Volumen Maestro**, **Efectos (SFX 3D)** y **Ambiente Nocturno**, además de botones para **Reanudar Partida** o **Reiniciar Noche (`12:00 AM`)**.
* **Reducción de Estática de *El Intruso* (`CAM 04`) — [`src/enemies/Intruder.js`](file:///c:/Users/SP/Desktop/juegodemiedo2/src/enemies/Intruder.js):**
  * Se redujo la interferencia adicional de estática en `CAM 04` (`CAM_04_FAR`: `0.35` → `0.18`, `CAM_04_NEAR`: `0.72` → `0.38`, `DOORWAY`: `0.25` → `0.12`) para mantener visible el corredor y la silueta de la entidad sin ocultar la escena.

---

## [Fase 4 - Módulos 4.1 y 4.2] — Secuencias de Jumpscare 3D en Cabina y Micro-animaciones de Criaturas
**Estado:** Completado y Validado

### 1. Secuencias de *Jumpscare* 3D en Cabina (`Módulo 4.1`)
* **[`src/world/Office.js`](file:///c:/Users/SP/Desktop/juegodemiedo2/src/world/Office.js), [`src/systems/CameraSystem.js`](file:///c:/Users/SP/Desktop/juegodemiedo2/src/systems/CameraSystem.js) y [`src/core/Game.js`](file:///c:/Users/SP/Desktop/juegodemiedo2/src/core/Game.js):**
  * Rig 3D dedicado para secuencias de ataque final dentro de la oficina (`_buildJumpscareRig`), oculto en juego normal (`0 Draw Calls`).
  * Cuando una criatura rompe el perímetro (`WINDOW`, `GRILLE`, `DOORWAY`) o finaliza el tiempo tras un *Blackout*:
    1. Si el jugador tiene abierto el monitor CCTV, este se cierra de golpe devolviendo la vista a la oficina.
    2. La cámara gira bruscamente hacia el vector exacto del ataque (derecha para ventana, abajo-derecha para rejilla, izquierda para puerta o al frente para apagón) con sacudida de cámara de alta frecuencia.
    3. La criatura 3D se abalanza desde ese vector hasta quedar a `0.56m` de la lente de la cámara durante `1.15s`, agitando el cráneo y las garras bajo un destello estroboscópico de emergencia y el grito sintetizado antes de cortar a la pantalla de `SEÑAL INTERRUMPIDA`.

### 2. Micro-animaciones Procedurales Inquietantes (`Módulo 4.2`)
* **[`src/enemies/EnemyBase.js`](file:///c:/Users/SP/Desktop/juegodemiedo2/src/enemies/EnemyBase.js), [`src/enemies/Observer.js`](file:///c:/Users/SP/Desktop/juegodemiedo2/src/enemies/Observer.js), [`src/enemies/Crawler.js`](file:///c:/Users/SP/Desktop/juegodemiedo2/src/enemies/Crawler.js) y [`src/enemies/Intruder.js`](file:///c:/Users/SP/Desktop/juegodemiedo2/src/enemies/Intruder.js):**
  * Articulación del cráneo (`headGroup`), torso y extremidades de las figuras alienígenas.
  * Animación continua de respiración, ladeo antinatural de cabeza observando el lente de las cámaras, micro-espasmos ocasionales y postura agresiva de brazos al llegar a la ventana o al umbral de la puerta.
  * Adición de garras delanteras animadas con movimiento de arañazo en *El Reptante* (`Crawler.js`) tanto frente al ducto de la cocina (`CAM 02`) como tras la rejilla de la oficina.

---

## [Fase 4 - Módulos 4.3 y 4.4] — Eventos Horarios, Ambiente Exterior y Terminal de Título CRT (`v1.0.0`)
**Estado:** Implementado (Cierre de Versión `v1.0.0`)

### 1. Progresión Atmosférica Nocturna y Eventos Horarios (`Módulo 4.3`)
* **[`src/core/AudioManager.js`](file:///c:/Users/SP/Desktop/juegodemiedo2/src/core/AudioManager.js), [`src/world/Environment.js`](file:///c:/Users/SP/Desktop/juegodemiedo2/src/world/Environment.js), [`src/ui/HUD.js`](file:///c:/Users/SP/Desktop/juegodemiedo2/src/ui/HUD.js) y [`src/core/Game.js`](file:///c:/Users/SP/Desktop/juegodemiedo2/src/core/Game.js):**
  * **Avisos Horarios (`01:00 AM` a `05:00 AM`):** Al marcar cada nueva hora en punto, suena un pulso electrónico de telemetría (`playHourChime`) y se despliega un banner superior en el HUD (`ACTIVIDAD PERIMETRAL EN AUMENTO`).
  * **Evento de las `03:00 AM` (Anomalía Electromagnética):** Dispara un pulso electromagnético grave (`playEMPPulse`), hace parpadear la lámpara de escritorio durante `1.8s` y provoca una ráfaga de estática en el monitor CCTV.
  * **Viento Nocturno en el Bosque Exterior:** Los pinos visibles por la ventana derecha se mecen con el viento, aumentando su frecuencia y amplitud conforme avanza la madrugada.
  * **Amanecer a las `06:00 AM`:** Reproduce el acorde de alarma de salvación (`playDawnChime`) e ilumina el bosque exterior con luz cálida de amanecer (`setDawnLight`).

### 2. Terminal de Título Diegética CRT (`Módulo 4.4`)
* **[`index.html`](file:///c:/Users/SP/Desktop/juegodemiedo2/index.html), [`src/style.css`](file:///c:/Users/SP/Desktop/juegodemiedo2/src/style.css) y [`src/core/Game.js`](file:///c:/Users/SP/Desktop/juegodemiedo2/src/core/Game.js):**
  * **Estado de espera en Pantalla Principal (`isInMainMenu = true`):** El juego **no arranca** (el reloj nocturno, el drenaje de energía y la IA de las 3 criaturas permanecen totalmente detenidos en `12:00 AM` / `100%`) hasta que el jugador selecciona explícitamente **`▶ NUEVA PARTIDA (NOCHE 1)`**.
  * **Opciones en Pantalla Principal (`⚙ OPCIONES Y CONTROLES`):** Submenú integrado para ajustar **Volumen Maestro**, **Efectos (SFX 3D)**, **Ambiente Nocturno** y **Sensibilidad del Ratón** antes de comenzar la noche, además de consultar la guía de controles.
  * **Retorno al Menú Principal:** Se añadió la opción **`VOLVER AL MENÚ PRINCIPAL`** tanto en el menú de pausa (`P`/`ESC`) como en la pantalla de fin de partida.






