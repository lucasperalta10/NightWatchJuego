# NIGHT WATCH

Juego de terror y supervivencia en 3D en primera persona desde una cabina fija, desarrollado con **Three.js**, **Vite**, **JavaScript ES6** y **Web Audio API**.

Sobrevive al turno nocturno desde las **12:00 AM** hasta las **06:00 AM** vigilando el perímetro mediante cámaras CCTV y defendiendo los accesos de la cabina mientras administras una batería limitada y un panel eléctrico propenso a sobrecargas.

---

## Características principales

- **Cabina 3D en primera persona:** Vista *pan & tilt* con Pointer Lock, giro rápido de `180°` hacia el panel trasero de fusibles, lámpara de escritorio, reloj LED sincronizado y tres monitores CRT diegéticos.
- **Sistema CCTV de cámara única:** Conmutación instantánea entre 4 sectores (`CAM 01` Porche, `CAM 02` Cocina/Ducto, `CAM 03` Patio/Bosque y `CAM 04` Pasillo Central) con visión nocturna infrarroja y filtro CRT analógico.
- **Gestión eléctrica y sobrecarga térmica:** Consumo en tiempo real por cada sistema activo; mantener una carga de nivel 4 durante más de 6 segundos dispara los fusibles traseros.
- **Tres entidades con IA y audio espacial 3D:**
  - **El Observador:** Se aproxima por el exterior hacia la ventana derecha; se repele con luz directa (linterna o reflector exterior de `CAM 01`).
  - **El Reptante:** Avanza por la cocina y el conducto de ventilación inferior derecho; se bloquea sellando temporalmente la compuerta neumática.
  - **El Intruso:** Acecha desde el pasillo central hacia la puerta izquierda; se detiene cerrando la puerta electromagnética tras detectarlo con el pulso de luz o las cámaras.
- **Menú principal, pausa y herramientas de desarrollo:** Pantalla de título CRT, menú de pausa completo con volúmenes persistentes en `localStorage` y panel de telemetría/debug (`F1`).

---

## Requisitos e instalación

Requiere **Node.js** (v18 o superior recomendado) y **npm**.

```bash
# Clonar el repositorio
git clone https://github.com/lucasperalta10/NightWatchJuego.git
cd NightWatchJuego

# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev
```

### Scripts disponibles

| Comando | Descripción |
|---|---|
| `npm run dev` | Inicia el servidor de desarrollo de Vite (`http://localhost:5173/`). |
| `npm run build` | Genera la build de producción en la carpeta `dist/`. |
| `npm run preview` | Previsualiza localmente la build de producción. |

---

## Controles

| Acción | Tecla / Entrada |
|---|---|
| Mirar alrededor | Ratón (clic en la pantalla para activar Pointer Lock) |
| Girar `180°` (ver panel de fusibles trasero) | `Espacio` o `S` |
| Linterna táctica | `F` |
| Abrir / Cerrar monitor CCTV | `C` |
| Interactuar / Puerta magnética / Compuerta de ducto / Reflector `CAM 01` / Rearmar fusibles | `Clic izquierdo` o `E` |
| Pulso de luz del pasillo izquierdo | `Q` |
| Menú de Pausa | `P` o `ESC` |
| Panel de Debug / Telemetría | `F1` |

---

## Estructura del proyecto

```text
├── index.html
├── package.json
├── docs/
│   ├── CHANGELOG.md         # Historial de cambios por versión y fase
│   ├── PROJECT_CONTEXT.md   # Especificación técnica y arquitectura
│   └── PROJECT_STATUS.md    # Estado actual del proyecto y hoja de ruta
└── src/
    ├── main.js              # Punto de entrada
    ├── style.css            # Estilos de interfaz, HUD y menús
    ├── core/
    │   ├── AudioManager.js  # Síntesis procedural y audio espacial 3D (Web Audio API)
    │   ├── Game.js          # Bucle principal, estados de juego, menús y jumpscares
    │   └── SceneManager.js  # Renderizador WebGL y cámara única
    ├── enemies/
    │   ├── EnemyBase.js     # Clase base de IA y temporizadores
    │   ├── Observer.js      # Lógica y modelo de El Observador
    │   ├── Crawler.js       # Lógica y modelo de El Reptante
    │   └── Intruder.js      # Lógica y modelo de El Intruso
    ├── systems/
    │   ├── CameraSystem.js  # Control de transición y sectores CCTV
    │   ├── DebugPanel.js    # Panel de pruebas y telemetría (F1)
    │   ├── DefenseSystem.js # Linterna, puerta, ducto, luz de pasillo y raycaster
    │   ├── NightManager.js  # Reloj nocturno (12 AM - 6 AM) y progresión horaria
    │   └── PowerSystem.js   # Batería, barras de consumo y fusibles
    ├── ui/
    │   ├── CCTVOverlay.js   # Interfaz 2D del monitor CCTV y plano de sectores
    │   └── HUD.js           # Indicadores de pantalla y avisos contextuales
    └── world/
        ├── Environment.js   # Bosque exterior, cielo nocturno y efectos de viento
        ├── House.js         # Sectores remotos de las 4 cámaras CCTV
        └── Office.js        # Cabina de seguridad, escritorio, monitores y defensas 3D
```

---

## Documentación adicional

- [Especificación técnica (`docs/PROJECT_CONTEXT.md`)](docs/PROJECT_CONTEXT.md)
- [Estado del proyecto (`docs/PROJECT_STATUS.md`)](docs/PROJECT_STATUS.md)
- [Registro de cambios (`docs/CHANGELOG.md`)](docs/CHANGELOG.md)
