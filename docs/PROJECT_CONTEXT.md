# NIGHT WATCH — ESPECIFICACIÓN TÉCNICA Y CONTEXTO MAESTRO

**Versión:** 0.4  
**Estado:** Fase 1 completada / Iniciando Fase 2  
**Tecnología:** Three.js + Vite + JavaScript Modular (Vanilla ES6) + HTML5/CSS3 + Web Audio API  
**Plataforma objetivo:** Navegador Web (PC) — Rendimiento objetivo: 60 FPS constantes  

---

## 1. ROL Y REGLAS DE OPERACIÓN DEL AGENTE

Actúas como **Desarrollador Técnico Principal** de *NIGHT WATCH*. El usuario actúa como **Director Creativo y Supervisor de Código**.

### Reglas obligatorias de desarrollo:
1. **Desarrollo estrictamente incremental:** No intentes programar múltiples sistemas juntos. Implementa una fase o submódulo a la vez, verifícalo en consola/navegador y espera la validación del usuario antes de avanzar.
2. **Zero Bloat / Rendimiento WebGL:** Cada adición debe considerar el impacto en *Draw Calls*, cálculos por fotograma y memoria VRAM.
3. **Código modular y desacoplado:** Toda lógica reside en clases ES6 dentro de `src/`, con responsabilidades únicas y dependencias claras.
4. **Respeto a las decisiones de diseño:** No modifiques las mecánicas, tiempos, consumos ni la disposición espacial sin previa aprobación del usuario.

---

## 2. VISIÓN GENERAL Y CORE LOOP

*NIGHT WATCH* es un videojuego independiente de terror y supervivencia 3D para navegador inspirado en la microgestión en cabina fija (estilo *Five Nights at Freddy's*), pero ambientado en una casa rural aislada bajo asedio extraterrestre (estética y tono inspirados en *Signs* y el terror analógico).

* **Objetivo:** Sobrevivir desde las **12:00 AM hasta las 06:00 AM** en tiempo real.
  * Duración total de la noche: **8 minutos (480 segundos)**.
  * Escala horaria: cada hora virtual dura exactamente **80 segundos reales**.
* **Posición del jugador:** Sentado en el escritorio de la oficina personal. Cámara híbrida: vista rotacional fija (*pan & tilt* limitado) con transiciones a monitor CCTV o interacciones con elementos del cuarto.
* **Recursos críticos:**
  * **Energía eléctrica de la casa:** Inicia al 100%. Sin regeneración pasiva. Si llega a 0%, ocurre un apagón total (*Blackout*), fallan las defensas y las criaturas inician el asedio final.
  * **Batería de linterna:** Independiente de la casa. Se agota con el uso continuo (`F`) y se regenera lentamente al apagarse.

---

## 3. ARQUITECTURA ESPACIAL DE LA OFICINA

La cabina del jugador mide 4.2m de ancho x 2.6m de alto x 3.6m de profundidad y cuenta con tres vectores defensivos:

1. **Frente — Centro de Mando:**
   * Escritorio de madera con **tres pantallas CRT**:
     * *Central:* Visor CCTV de las 4 cámaras.
     * *Izquierda:* Diagrama esquemático/mapa de la casa con alertas de señal.
     * *Derecha:* Monitor de telemetría de energía (% restante, barras de consumo de 1 a 4).
   * Reloj despertador digital LED rojo en la mesa marcando la hora real de la noche.
2. **Lateral Izquierdo — Sector Pasillo (Frente-Izquierda):**
   * Marco de puerta abierta conectado con el pasillo interior.
   * Interruptor de luz de pasillo (pulso rápido de verificación).
   * Botón de bloqueo electromagnético de puerta (consumo continuo alto).
3. **Lateral Derecho — Sector Exterior y Ventilación:**
   * *Ventana:* Con persianas semitraslúcidas hacia el bosque y la niebla. Permite vigilar al Observador y ahuyentarlo con la linterna manual.
   * *Rejilla baja de ventilación:* Pegada al suelo. Acceso del Reptante. Posee compuerta neumática pesada accionable por palanca.
4. **Pared Trasera — Panel Eléctrico:**
   * Giro de cámara a 180° para reactivar llaves térmicas si el consumo excesivo (Nivel 4 sostenido por >6 seg) hace saltar los fusibles.

---

## 4. LAS TRES ENTIDADES EXTRATERRESTRES

| Entidad | Vector en Oficina | Detección / Señales | Mecánica de Defensa |
|---|---|---|---|
| **El Observador** | Ventana lateral derecha y Porche (CAM 01 / CAM 03) | Silueta estática lejana entre la niebla; toques secos en el vidrio (*tap... tap*). | Alumbrarlo de forma sostenida con la linterna (`F`) o activar el reflector exterior del porche. |
| **El Reptante** | Rejilla baja de ventilación (suelo lateral derecho) | Evasivo en cámaras (CAM 02). Detección auditiva: arañazos metálicos rítmicos en el ducto (*canal estéreo derecho*). | Bajar la vista e iluminar; cerrar la compuerta neumática rápida antes de que salte al cuarto. |
| **El Intruso** | Puerta abierta y pasillo (CAM 04 / frente-izquierda) | Estática masiva en CAM 04, crujidos pesados en piso de madera y figura alta inmóvil en el umbral. | Pulso de luz para verificar presencia y cierre inmediato de la puerta magnética. |

---

## 5. SISTEMA ELÉCTRICO Y BALANCE DE CONSUMO

* **Consumo Base (Oficina activa):** 0.08% / seg (~38% acumulado en toda la noche).
* **Uso de Monitor CCTV:** +0.15% / seg mientras la vista esté ampliada en cámaras.
* **Luz exterior / Porche:** +0.40% / seg mientras se mantenga presionada.
* **Luz de verificación de pasillo:** 0.50% por pulso instantáneo.
* **Puerta magnética cerrada:** +1.20% / seg (10 segundos cerrada = 12% de energía).
* **Compuerta de ventilación:** 1.50% por impacto/activación neumática (cede tras 8 seg).

---

## 6. DECISIONES TÉCNICAS CLAVE (ESTRICTO CUMPLIMIENTO)

1. **Arquitectura de Cámaras CCTV:**
   * **PROHIBIDO** usar cámaras secundarias renderizando en texturas en tiempo real (*Render Targets*). Duplica los *draw calls* y satura la GPU.
   * **Solución obligatoria:** Existe una única cámara Three.js. Al pulsar `C` o un botón de cámara (`CAM 01` a `04`), se interpola o conmuta la posición/rotación de la cámara al sector correspondiente y se conmuta la visibilidad (`mesh.visible = false` para la oficina y `true` para la habitación activa).
   * Los efectos de escaneo CRT, ruido estático y el blueprint de la casa se manejan en una **capa DOM/Canvas 2D superpuesta** al WebGL.
2. **Iluminación optimizada:**
   * Máximo 2 luces dinámicas con sombras proyectadas en tiempo real: la **Linterna manual** (`SpotLight`) y el **Reflector del Porche** (`SpotLight`/`DirectionalLight`).
   * El resto del entorno usa iluminación ambiental horneada, materiales emisivos o `PointLight` sin sombras activas.
3. **Audio Espacial:**
   * Se gestionará con `Web Audio API` (nodos `PannerNode` para espacialización 3D: pasos izquierda, ductos derecha).
   * Controles de volumen persistentes en `localStorage` (Master, SFX, Ambiente).
4. **Herramientas de Depuración (Panel Debug - F1):**
   * Menú flotante siempre disponible para desarrollo: selector de hora (1 AM, 3 AM, 5:59 AM), energía infinita, forzar apagón (0%), disparar ataques de prueba y contador de FPS.

---

## 7. ESTRUCTURA DEL PROYECTO

```text
night-watch/
├── index.html
├── package.json
├── PROJECT_CONTEXT.md
└── src/
    ├── main.js
    ├── style.css
    ├── core/
    │   ├── SceneManager.js     # Configuración WebGL, renderer, fog, cámara
    │   ├── AudioManager.js     # Web Audio API, volúmenes, efectos posicionales
    │   └── Game.js             # Bucle principal y orquestador de estado
    ├── world/
    │   ├── Office.js           # Habitación, escritorio, pantallas, ventana, rejilla
    │   ├── House.js            # Pasillo, porche, patio, cocina (sectores CCTV)
    │   └── Environment.js      # Bosque, niebla, luces exteriores
    ├── enemies/
    │   ├── EnemyBase.js        # Máquina de estados base
    │   ├── Observer.js         # IA y eventos del Observador
    │   ├── Crawler.js          # IA y eventos del Reptante
    │   └── Intruder.js         # IA y eventos del Intruso
    ├── systems/
    │   ├── PowerSystem.js      # Gestión de energía, consumos y fusibles
    │   ├── CameraSystem.js     # Lógica CCTV y conmutación de perspectivas
    │   ├── DefenseSystem.js    # Puerta magnética, ducto y linterna
    │   ├── NightManager.js     # Reloj de juego (12 AM - 6 AM), eventos y victoria
    │   └── DebugPanel.js       # Menú F1 para testing rápido
    └── ui/
        ├── CCTVOverlay.js      # Interfaz 2D / CRT / Estática de cámaras
        └── HUD.js              # Indicadores en pantalla, reloj y advertencias
```

---

## 8. ESTADO ACTUAL Y SIGUIENTE TAREA INMEDIATA

* **Estado:** La Fase 1 (escena 3D procedural de la oficina, límites de rotación de cámara en primera persona con Pointer Lock, SpotLight de linterna con tecla `F` y base del panel Debug con tecla `F1`) ha sido diseñada y validada.
* **Siguiente objetivo inmediato (Fase 2 - Módulo 2.1):**
  * Construir el **`CameraSystem`** y la interfaz CCTV del monitor central: permitir presionar la tecla `C` para hacer zoom al monitor central, abrir el mapa táctico y alternar las vistas entre las 4 cámaras (`CAM 01` a `CAM 04`) mediante conmutación de coordenadas de cámara, aplicando el filtro visual CRT de estática analógica.