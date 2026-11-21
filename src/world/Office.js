import * as THREE from 'three';

export class Office {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.name = 'OfficeSector';

    // Dimensiones exactas de especificación: 4.2m ancho x 2.6m alto x 3.6m profundo
    this.width = 4.2;
    this.height = 2.6;
    this.depth = 3.6;

    // Referencias para animaciones / estados futuros
    this.interactables = [];
    this.securityDoorMesh = null;
    this.ventDamperMesh = null;
    this.clockCanvas = null;
    this.clockCtx = null;
    this.clockTexture = null;
    this.telemetryCanvas = null;
    this.telemetryCtx = null;
    this.telemetryTexture = null;
    this.cctvScreenCanvas = null;
    this.cctvScreenCtx = null;
    this.cctvScreenTexture = null;

    this._buildMaterials();
    this._buildRoomShell();
    this._buildCommandDesk();
    this._buildLeftHallwaySector();
    this._buildRightWindowAndVentSector();
    this._buildRearElectricalPanel();
    this._buildOfficeLighting();
    this._buildJumpscareRig();

    this.scene.add(this.group);
  }

  _buildMaterials() {
    this.mats = {
      wall: new THREE.MeshStandardMaterial({
        color: 0x333c38,
        roughness: 0.85,
        metalness: 0.05
      }),
      wainscoting: new THREE.MeshStandardMaterial({
        color: 0x2e231a,
        roughness: 0.78,
        metalness: 0.06
      }),
      floor: new THREE.MeshStandardMaterial({
        color: 0x261d15,
        roughness: 0.82,
        metalness: 0.05
      }),
      ceiling: new THREE.MeshStandardMaterial({
        color: 0x1c2022,
        roughness: 0.9
      }),
      woodDesk: new THREE.MeshStandardMaterial({
        color: 0x422b1d,
        roughness: 0.68,
        metalness: 0.08
      }),
      crtPlastic: new THREE.MeshStandardMaterial({
        color: 0x2a2d2c,
        roughness: 0.55,
        metalness: 0.2
      }),
      darkMetal: new THREE.MeshStandardMaterial({
        color: 0x2b3238,
        roughness: 0.42,
        metalness: 0.7
      }),
      hazardMetal: new THREE.MeshStandardMaterial({
        color: 0x434950,
        roughness: 0.45,
        metalness: 0.65
      }),
      glassWindow: new THREE.MeshStandardMaterial({
        color: 0x0a1316,
        roughness: 0.2,
        metalness: 0.1,
        transparent: true,
        opacity: 0.42
      }),
      blindSlat: new THREE.MeshStandardMaterial({
        color: 0x3a423f,
        roughness: 0.65,
        metalness: 0.1
      })
    };
  }

  _buildRoomShell() {
    const halfW = this.width / 2; // 2.1
    const halfD = this.depth / 2; // 1.8
    const h = this.height;        // 2.6

    // Piso y techo
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(this.width, this.depth), this.mats.floor);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.group.add(floor);

    const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(this.width, this.depth), this.mats.ceiling);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = h;
    this.group.add(ceiling);

    // Pared Frontal (Z = -1.8)
    const frontWall = new THREE.Mesh(new THREE.PlaneGeometry(this.width, h), this.mats.wall);
    frontWall.position.set(0, h / 2, -halfD);
    frontWall.receiveShadow = true;
    this.group.add(frontWall);

    // Zócalo frontal
    const frontWainscot = new THREE.Mesh(new THREE.BoxGeometry(this.width, 0.85, 0.04), this.mats.wainscoting);
    frontWainscot.position.set(0, 0.425, -halfD + 0.02);
    frontWainscot.receiveShadow = true;
    this.group.add(frontWainscot);

    // Pared Trasera (Z = +1.8)
    const backWall = new THREE.Mesh(new THREE.PlaneGeometry(this.width, h), this.mats.wall);
    backWall.rotation.y = Math.PI;
    backWall.position.set(0, h / 2, halfD);
    backWall.receiveShadow = true;
    this.group.add(backWall);

    // Pared Izquierda (X = -2.1) con abertura para puerta de pasillo (Z entre -1.25 y -0.25, alto 2.1m)
    // Segmento trasero izquierdo (Z: -0.25 a +1.8 -> largo 2.05m)
    const leftWallBack = new THREE.Mesh(new THREE.BoxGeometry(0.12, h, 2.05), this.mats.wall);
    leftWallBack.position.set(-halfW, h / 2, 0.775);
    leftWallBack.receiveShadow = true;
    leftWallBack.castShadow = true;
    this.group.add(leftWallBack);

    // Segmento frontal izquierdo (Z: -1.8 a -1.25 -> largo 0.55m)
    const leftWallFront = new THREE.Mesh(new THREE.BoxGeometry(0.12, h, 0.55), this.mats.wall);
    leftWallFront.position.set(-halfW, h / 2, -1.525);
    leftWallFront.receiveShadow = true;
    leftWallFront.castShadow = true;
    this.group.add(leftWallFront);

    // Dintel superior sobre puerta izquierda (Z: -1.25 a -0.25 -> largo 1.0m, Y: 2.1 a 2.6 -> alto 0.5m)
    const leftWallTop = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.5, 1.0), this.mats.wall);
    leftWallTop.position.set(-halfW, 2.35, -0.75);
    leftWallTop.receiveShadow = true;
    this.group.add(leftWallTop);

    // Pared Derecha (X = +2.1) con abertura para ventana (Z: -1.15 a -0.05, Y: 0.95 a 2.05)
    // y abertura para rejilla baja de ventilación (Z: 0.15 a 0.75, Y: 0.08 a 0.48)
    // Construimos paneles alrededor para dejar el hueco real de la ventana hacia el bosque
    // Inferior bajo ventana (Z: -1.8 a +0.15, Y: 0 a 0.95)
    const rightBottomFront = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.95, 1.95), this.mats.wall);
    rightBottomFront.position.set(halfW, 0.475, -0.825);
    rightBottomFront.receiveShadow = true;
    this.group.add(rightBottomFront);

    // Superior sobre ventana (Z: -1.8 a +1.8, Y: 2.05 a 2.6)
    const rightTop = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.55, this.depth), this.mats.wall);
    rightTop.position.set(halfW, 2.325, 0);
    rightTop.receiveShadow = true;
    this.group.add(rightTop);

    // Pilar frontal derecho (Z: -1.8 a -1.15, Y: 0.95 a 2.05)
    const rightPillarFront = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.1, 0.65), this.mats.wall);
    rightPillarFront.position.set(halfW, 1.5, -1.475);
    rightPillarFront.receiveShadow = true;
    this.group.add(rightPillarFront);

    // Panel derecho medio-trasero (Z: -0.05 a +1.8, Y: 0.48 a 2.05)
    const rightMidBack = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.57, 1.85), this.mats.wall);
    rightMidBack.position.set(halfW, 1.265, 0.875);
    rightMidBack.receiveShadow = true;
    this.group.add(rightMidBack);

    // Panel bajo trasero después del ducto (Z: 0.75 a +1.8, Y: 0 a 0.48)
    const rightLowBack = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.48, 1.05), this.mats.wall);
    rightLowBack.position.set(halfW, 0.24, 1.275);
    rightLowBack.receiveShadow = true;
    this.group.add(rightLowBack);
  }

  _buildCommandDesk() {
    const deskGroup = new THREE.Group();
    deskGroup.position.set(0, 0, -1.12);

    // Tablero principal de madera (1.85m ancho x 0.78m profundo)
    const topMesh = new THREE.Mesh(new THREE.BoxGeometry(1.86, 0.06, 0.82), this.mats.woodDesk);
    topMesh.position.set(0, 0.76, 0);
    topMesh.castShadow = true;
    topMesh.receiveShadow = true;
    deskGroup.add(topMesh);

    // Laterales del escritorio
    const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.74, 0.76), this.mats.woodDesk);
    leftLeg.position.set(-0.86, 0.37, 0);
    leftLeg.castShadow = true;
    deskGroup.add(leftLeg);

    const rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.74, 0.76), this.mats.woodDesk);
    rightLeg.position.set(0.86, 0.37, 0);
    rightLeg.castShadow = true;
    deskGroup.add(rightLeg);

    // 1. Monitor CRT Central (Visor CCTV de 4 cámaras)
    this.cctvScreenCanvas = document.createElement('canvas');
    this.cctvScreenCanvas.width = 256;
    this.cctvScreenCanvas.height = 192;
    this.cctvScreenCtx = this.cctvScreenCanvas.getContext('2d');
    this.cctvScreenTexture = new THREE.CanvasTexture(this.cctvScreenCanvas);
    this._drawCCTVPreviewStatic(0);

    const centerCRT = this._createCRTMonitor(0.54, 0.44, 0.42, this.cctvScreenTexture);
    centerCRT.position.set(0, 1.02, -0.06);
    centerCRT.traverse((child) => {
      if (child.isMesh) {
        child.userData.interactId = 'CENTER_CRT';
        this.interactables.push(child);
      }
    });
    deskGroup.add(centerCRT);

    // 2. Monitor CRT Izquierdo (Mapa esquemático de la casa con alertas de señal)
    this.mapCanvas = document.createElement('canvas');
    this.mapCanvas.width = 256;
    this.mapCanvas.height = 192;
    this.mapCtx = this.mapCanvas.getContext('2d');
    this.mapTexture = new THREE.CanvasTexture(this.mapCanvas);
    this.updateSchematicScreen({});

    const leftCRT = this._createCRTMonitor(0.42, 0.36, 0.36, this.mapTexture);
    leftCRT.position.set(-0.56, 0.98, 0.02);
    leftCRT.rotation.y = 0.28;
    deskGroup.add(leftCRT);

    // 3. Monitor CRT Derecho (Telemetría de energía)
    this.telemetryCanvas = document.createElement('canvas');
    this.telemetryCanvas.width = 256;
    this.telemetryCanvas.height = 192;
    this.telemetryCtx = this.telemetryCanvas.getContext('2d');
    this.telemetryTexture = new THREE.CanvasTexture(this.telemetryCanvas);
    this.updateTelemetryScreen(100.0, 1);

    const rightCRT = this._createCRTMonitor(0.42, 0.36, 0.36, this.telemetryTexture);
    rightCRT.position.set(0.56, 0.98, 0.02);
    rightCRT.rotation.y = -0.28;
    deskGroup.add(rightCRT);

    // 4. Reloj despertador digital LED rojo en la mesa
    this.clockCanvas = document.createElement('canvas');
    this.clockCanvas.width = 128;
    this.clockCanvas.height = 64;
    this.clockCtx = this.clockCanvas.getContext('2d');
    this.clockTexture = new THREE.CanvasTexture(this.clockCanvas);
    this.updateClockDisplay('12:00 AM');

    const clockBody = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.08, 0.09), this.mats.crtPlastic);
    clockBody.position.set(-0.32, 0.83, 0.24);
    clockBody.rotation.y = 0.18;
    const clockFace = new THREE.Mesh(
      new THREE.PlaneGeometry(0.15, 0.055),
      new THREE.MeshBasicMaterial({ map: this.clockTexture })
    );
    clockFace.position.set(0, 0, 0.046);
    clockBody.add(clockFace);
    deskGroup.add(clockBody);

    // 5. Pequeña lámpara de escritorio (lado izquierdo de la mesa)
    const lampGroup = new THREE.Group();
    lampGroup.position.set(-0.78, 0.79, 0.22);

    const lampBase = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.1, 0.03, 12),
      this.mats.darkMetal
    );
    lampBase.position.y = 0.015;
    lampGroup.add(lampBase);

    const lampStem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.014, 0.018, 0.34, 8),
      this.mats.darkMetal
    );
    lampStem.position.set(-0.02, 0.18, 0);
    lampStem.rotation.z = -0.15;
    lampGroup.add(lampStem);

    const lampShadeMat = new THREE.MeshStandardMaterial({
      color: 0x244232,
      roughness: 0.4,
      metalness: 0.3,
      emissive: 0x33220a,
      emissiveIntensity: 0.5
    });
    const lampShade = new THREE.Mesh(
      new THREE.ConeGeometry(0.12, 0.14, 12, 1, true),
      lampShadeMat
    );
    lampShade.position.set(0.02, 0.34, 0.02);
    lampShade.rotation.z = -0.25;
    lampGroup.add(lampShade);

    this.lampBulbMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.038, 10, 10),
      new THREE.MeshBasicMaterial({ color: 0xffe4a0 })
    );
    this.lampBulbMesh.position.set(0.02, 0.3, 0.02);
    lampGroup.add(this.lampBulbMesh);

    deskGroup.add(lampGroup);

    this.group.add(deskGroup);
  }

  _createCRTMonitor(w, h, d, screenTexture) {
    const crt = new THREE.Group();

    const casing = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), this.mats.crtPlastic);
    casing.castShadow = true;
    casing.receiveShadow = true;
    crt.add(casing);

    const backTube = new THREE.Mesh(
      new THREE.BoxGeometry(w * 0.65, h * 0.65, d * 0.45),
      this.mats.crtPlastic
    );
    backTube.position.set(0, 0, -d * 0.6);
    crt.add(backTube);

    const screenMat = new THREE.MeshBasicMaterial({
      map: screenTexture
    });
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.82, h * 0.78), screenMat);
    screen.position.set(0, 0.01, d / 2 + 0.002);
    crt.add(screen);

    // LED encendido en carcasa
    const powerLed = new THREE.Mesh(
      new THREE.BoxGeometry(0.014, 0.014, 0.01),
      new THREE.MeshBasicMaterial({ color: 0x38e54d })
    );
    powerLed.position.set(w * 0.34, -h * 0.43, d / 2 + 0.003);
    crt.add(powerLed);

    return crt;
  }

  updateSchematicScreen(alerts = {}) {
    if (!this.mapCtx) return;
    const ctx = this.mapCtx;

    ctx.fillStyle = '#04120b';
    ctx.fillRect(0, 0, 256, 192);

    ctx.strokeStyle = '#1f5e3b';
    ctx.lineWidth = 1;
    for (let x = 0; x < 256; x += 16) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 192);
      ctx.stroke();
    }
    for (let y = 0; y < 192; y += 16) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(256, y);
      ctx.stroke();
    }

    const drawBox = (x, y, w, h, label, isAlert) => {
      if (isAlert) {
        ctx.fillStyle = 'rgba(255, 46, 46, 0.35)';
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = '#ff2e2e';
      } else {
        ctx.strokeStyle = '#48ff91';
      }
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, w, h);
      ctx.fillStyle = isAlert ? '#ff4d4d' : '#48ff91';
      ctx.font = '10px monospace';
      ctx.fillText(label, x + 8, y + h / 2 + 4);
    };

    ctx.fillStyle = '#48ff91';
    ctx.font = 'bold 11px monospace';
    ctx.fillText('RADAR SENSORES CASA', 14, 15);

    drawBox(85, 118, 86, 56, 'OFICINA [TÚ]', alerts.officeDanger);
    drawBox(20, 56, 65, 95, 'CAM04 PAS', alerts.cam04);
    drawBox(85, 22, 82, 46, 'CAM01 POR', alerts.cam01);
    drawBox(171, 22, 70, 46, 'CAM03 BOS', alerts.cam03);
    drawBox(171, 78, 70, 68, 'CAM02 DUC', alerts.cam02);

    this.mapTexture.needsUpdate = true;
  }

  updateClockDisplay(timeStr) {
    if (!this.clockCtx) return;
    const ctx = this.clockCtx;
    ctx.fillStyle = '#120202';
    ctx.fillRect(0, 0, 128, 64);

    ctx.fillStyle = '#ff2a1f';
    ctx.font = 'bold 22px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(timeStr, 64, 34);
    this.clockTexture.needsUpdate = true;
  }

  updateTelemetryScreen(powerPct, usageLevel, isBreakerTripped = false) {
    if (!this.telemetryCtx) return;
    const ctx = this.telemetryCtx;
    ctx.fillStyle = '#06110c';
    ctx.fillRect(0, 0, 256, 192);

    ctx.fillStyle = '#52ff9a';
    ctx.font = 'bold 14px monospace';
    ctx.fillText('TELEMETRÍA ELÉCTRICA', 16, 26);

    ctx.font = 'bold 34px monospace';
    ctx.fillStyle = powerPct > 25 ? '#52ff9a' : '#ff3b30';
    ctx.fillText(`${powerPct.toFixed(1)}%`, 16, 72);

    if (isBreakerTripped) {
      ctx.fillStyle = '#ff2e2e';
      ctx.font = 'bold 13px monospace';
      ctx.fillText('¡SOBRECARGA TÉRMICA!', 16, 110);
      ctx.fillStyle = '#ffb703';
      ctx.font = '11px monospace';
      ctx.fillText('GIRE 180° Y ACTIVE FUSIBLES', 16, 134);
    } else {
      ctx.font = '12px monospace';
      ctx.fillStyle = '#8aa399';
      ctx.fillText('CARGA DE RED:', 16, 110);

      const colors = ['#38e54d', '#b8e538', '#ff9f1c', '#ff2e2e'];
      for (let i = 0; i < 4; i++) {
        ctx.fillStyle = i < usageLevel ? colors[i] : '#14261d';
        ctx.fillRect(16 + i * 54, 124, 44, 24);
        ctx.strokeStyle = '#365947';
        ctx.strokeRect(16 + i * 54, 124, 44, 24);
      }
    }

    this.telemetryTexture.needsUpdate = true;
  }

  _drawCCTVPreviewStatic(time) {
    if (!this.cctvScreenCtx) return;
    const ctx = this.cctvScreenCtx;
    const w = 256;
    const h = 192;

    ctx.fillStyle = '#090d0c';
    ctx.fillRect(0, 0, w, h);

    // Barras de ruido analógico ligeras (bajo costo CPU)
    ctx.fillStyle = 'rgba(130, 180, 155, 0.09)';
    for (let i = 0; i < 28; i++) {
      const y = ((Math.sin(time * 7 + i * 13.7) + 1) * 0.5) * h;
      ctx.fillRect(0, y, w, 2);
    }

    ctx.strokeStyle = '#38e54d';
    ctx.strokeRect(8, 8, w - 16, h - 16);

    ctx.fillStyle = '#52ff9a';
    ctx.font = 'bold 15px monospace';
    ctx.fillText('CCTV MONITOR [C]', 48, 92);
    ctx.font = '11px monospace';
    ctx.fillStyle = '#8aa399';
    ctx.fillText('4 CANALES ACTIVOS', 66, 114);

    this.cctvScreenTexture.needsUpdate = true;
  }

  _buildLeftHallwaySector() {
    const doorwayGroup = new THREE.Group();
    // Centro de la puerta en X = -2.04, Z = -0.75
    doorwayGroup.position.set(-2.04, 0, -0.75);

    // Marco metálico de la puerta (ancho 1.0m, alto 2.1m)
    const frameLeft = new THREE.Mesh(new THREE.BoxGeometry(0.16, 2.15, 0.08), this.mats.darkMetal);
    frameLeft.position.set(0, 1.075, -0.5);
    doorwayGroup.add(frameLeft);

    const frameRight = new THREE.Mesh(new THREE.BoxGeometry(0.16, 2.15, 0.08), this.mats.darkMetal);
    frameRight.position.set(0, 1.075, 0.5);
    doorwayGroup.add(frameRight);

    const frameTop = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.14, 1.12), this.mats.darkMetal);
    frameTop.position.set(0, 2.12, 0);
    doorwayGroup.add(frameTop);

    // Puerta electromagnética pesada (inicialmente abierta arriba en Y = 2.95)
    this.securityDoorMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 2.1, 0.96),
      this.mats.hazardMetal
    );
    this.securityDoorMesh.position.set(0, 2.95, 0);
    this.securityDoorMesh.castShadow = true;
    doorwayGroup.add(this.securityDoorMesh);

    // Pasillo interior oscuro detrás de la puerta (para dar profundidad espacial 3D)
    const hallwayTunnel = new THREE.Mesh(
      new THREE.BoxGeometry(2.8, 2.3, 1.25),
      new THREE.MeshStandardMaterial({
        color: 0x241d18,
        roughness: 0.9,
        side: THREE.BackSide
      })
    );
    hallwayTunnel.position.set(-1.4, 1.15, 0);
    doorwayGroup.add(hallwayTunnel);

    // Luz de pulso de verificación dentro del umbral del pasillo izquierdo (sin sombras, regla 6.2)
    this.hallwayPulseLight = new THREE.PointLight(0xffe6b8, 0, 5.5, 1.2);
    this.hallwayPulseLight.position.set(-1.1, 1.85, 0);
    this.hallwayPulseLight.castShadow = false;
    doorwayGroup.add(this.hallwayPulseLight);

    // Caja de control junto a la puerta (en Z = -0.07, accesible desde el escritorio)
    const controlBox = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.38, 0.22), this.mats.darkMetal);
    controlBox.position.set(0.05, 1.22, 0.68);
    doorwayGroup.add(controlBox);

    // Botón superior: Bloqueo magnético (Rojo = Abierto / Verde = Cerrado)
    this.doorBtnMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 0.11, 0.12),
      new THREE.MeshBasicMaterial({ color: 0xff2e2e })
    );
    this.doorBtnMesh.position.set(0.08, 1.30, 0.68);
    this.doorBtnMesh.userData.interactId = 'DOOR_LOCK_BTN';
    this.interactables.push(this.doorBtnMesh);
    doorwayGroup.add(this.doorBtnMesh);

    // Botón inferior: Pulso de luz de pasillo (Ámbar)
    this.lightBtnMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 0.11, 0.12),
      new THREE.MeshBasicMaterial({ color: 0xffb703 })
    );
    this.lightBtnMesh.position.set(0.08, 1.14, 0.68);
    this.lightBtnMesh.userData.interactId = 'HALLWAY_LIGHT_BTN';
    this.interactables.push(this.lightBtnMesh);
    doorwayGroup.add(this.lightBtnMesh);

    this.group.add(doorwayGroup);
  }

  _buildRightWindowAndVentSector() {
    // 1. Ventana lateral derecha (X = +2.04, Z = -0.60, Y = 1.50, ancho 1.1m, alto 1.1m)
    const windowGroup = new THREE.Group();
    windowGroup.position.set(2.04, 1.5, -0.6);

    // Marco de ventana
    const winTop = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.08, 1.16), this.mats.woodDesk);
    winTop.position.set(0, 0.55, 0);
    windowGroup.add(winTop);

    const winBottom = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.08, 1.2), this.mats.woodDesk);
    winBottom.position.set(0, -0.55, 0);
    windowGroup.add(winBottom);

    const winLeft = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.1, 0.08), this.mats.woodDesk);
    winLeft.position.set(0, 0, -0.55);
    windowGroup.add(winLeft);

    const winRight = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.1, 0.08), this.mats.woodDesk);
    winRight.position.set(0, 0, 0.55);
    windowGroup.add(winRight);

    // Cristal semitraslúcido
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(1.06, 1.04), this.mats.glassWindow);
    glass.rotation.y = -Math.PI / 2;
    windowGroup.add(glass);

    // Persianas horizontales entreabiertas (permiten ver el bosque exterior y proyectar sombras)
    for (let i = -4; i <= 4; i++) {
      const slat = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.015, 1.02), this.mats.blindSlat);
      slat.position.set(-0.03, i * 0.1, 0);
      slat.rotation.z = 0.25;
      slat.castShadow = true;
      windowGroup.add(slat);
    }

    this.group.add(windowGroup);

    // 2. Rejilla baja de ventilación (pegada al suelo en X = +2.04, Z = +0.45, Y = 0.28)
    const ventGroup = new THREE.Group();
    ventGroup.position.set(2.04, 0.28, 0.45);

    const ventFrame = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.44, 0.64), this.mats.darkMetal);
    ventFrame.userData.interactId = 'VENT_LEVER';
    this.interactables.push(ventFrame);
    ventGroup.add(ventFrame);

    // Interior oscuro del ducto
    const ventInterior = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 0.38, 0.56),
      new THREE.MeshStandardMaterial({
        color: 0x050708,
        roughness: 0.9,
        side: THREE.BackSide
      })
    );
    ventInterior.position.set(0.42, 0, 0);
    ventGroup.add(ventInterior);

    // Compuerta neumática móvil
    this.ventDamperMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, 0.38, 0.56),
      this.mats.hazardMetal
    );
    this.ventDamperMesh.position.set(-0.04, 0.34, 0); // Abierta hacia arriba por defecto
    ventGroup.add(this.ventDamperMesh);

    // Barrotes de la rejilla
    for (let i = -2; i <= 2; i++) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.025, 0.56), this.mats.darkMetal);
      bar.position.set(-0.07, i * 0.07, 0);
      ventGroup.add(bar);
    }

    // Palanca neumática junto al ducto
    const leverBase = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.26, 0.16), this.mats.darkMetal);
    leverBase.position.set(-0.05, 0.32, -0.42);
    leverBase.userData.interactId = 'VENT_LEVER';
    this.interactables.push(leverBase);
    ventGroup.add(leverBase);

    this.ventLeverHandle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.018, 0.018, 0.26, 8),
      new THREE.MeshStandardMaterial({ color: 0xe63928, roughness: 0.35 })
    );
    this.ventLeverHandle.position.set(-0.1, 0.38, -0.42);
    this.ventLeverHandle.rotation.z = Math.PI / 3;
    this.ventLeverHandle.userData.interactId = 'VENT_LEVER';
    this.interactables.push(this.ventLeverHandle);
    ventGroup.add(this.ventLeverHandle);

    this.group.add(ventGroup);
  }

  _buildRearElectricalPanel() {
    const panelGroup = new THREE.Group();
    // Pared trasera en Z = +1.75
    panelGroup.position.set(0, 1.32, 1.75);
    panelGroup.rotation.y = Math.PI;

    // Gabinete industrial metálico
    const cabinet = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.88, 0.14), this.mats.hazardMetal);
    cabinet.castShadow = true;
    cabinet.receiveShadow = true;
    cabinet.userData.interactId = 'BREAKER_PANEL';
    this.interactables.push(cabinet);
    panelGroup.add(cabinet);

    // Placa interior de llaves térmicas
    const innerPlate = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.74, 0.04), this.mats.darkMetal);
    innerPlate.position.set(0, 0, 0.06);
    innerPlate.userData.interactId = 'BREAKER_PANEL';
    this.interactables.push(innerPlate);
    panelGroup.add(innerPlate);

    // 4 Llaves térmicas (breakers) + Palanca maestra
    this.breakerSwitches = [];
    for (let i = 0; i < 4; i++) {
      const breaker = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.12, 0.05),
        this.mats.crtPlastic
      );
      breaker.position.set(-0.16 + i * 0.11, 0.12, 0.08);
      breaker.userData.interactId = 'BREAKER_PANEL';
      this.interactables.push(breaker);
      this.breakerSwitches.push(breaker);
      panelGroup.add(breaker);
    }

    // Indicador luminoso de estado de fusibles (Verde = OK, Rojo parpadeante = Caídos)
    this.breakerStatusLight = new THREE.Mesh(
      new THREE.SphereGeometry(0.032, 12, 12),
      new THREE.MeshBasicMaterial({ color: 0x38e54d })
    );
    this.breakerStatusLight.position.set(0, 0.31, 0.08);
    panelGroup.add(this.breakerStatusLight);

    // Luz piloto sobre el panel trasero (sin sombras para respetar regla 6.2)
    this.panelPilotLight = new THREE.PointLight(0xff7b29, 0.55, 2.8, 2);
    this.panelPilotLight.position.set(0, 0.55, 0.35);
    this.panelPilotLight.castShadow = false;
    panelGroup.add(this.panelPilotLight);

    this.group.add(panelGroup);
  }

  _buildOfficeLighting() {
    // Regla 6.2: Iluminación ambiental tenue + PointLights sin sombras
    const ambientLight = new THREE.AmbientLight(0x182226, 0.62);
    this.scene.add(ambientLight);

    // Resplandor verde frío de los monitores CRT (PointLight sin sombras)
    this.crtGlowLight = new THREE.PointLight(0x38e575, 1.05, 3.4, 1.6);
    this.crtGlowLight.position.set(0, 1.15, -0.78);
    this.crtGlowLight.castShadow = false;
    this.group.add(this.crtGlowLight);

    // Luz cálida suave de la lámpara de escritorio (ilumina la mesa y penumbra cercana sin sustituir la linterna)
    this.deskFillLight = new THREE.PointLight(0xffb05c, 1.35, 3.8, 1.45);
    this.deskFillLight.position.set(-0.76, 1.12, -0.88);
    this.deskFillLight.castShadow = false;
    this.group.add(this.deskFillLight);

    // Rebote ambiental muy sutil para perfilar apenas la habitación en la oscuridad
    this.roomBounceLight = new THREE.PointLight(0xc88a55, 0.35, 4.8, 1.5);
    this.roomBounceLight.position.set(0, 2.0, -0.2);
    this.roomBounceLight.castShadow = false;
    this.group.add(this.roomBounceLight);
  }

  /**
   * Fase 4 (Módulo 4.1): Rig 3D dedicado para secuencias de Jumpscare dentro de la cabina.
   * Permanece oculto (0 Draw Calls) hasta que una criatura irrumpe en la oficina.
   */
  _buildJumpscareRig() {
    this.jumpscareGroup = new THREE.Group();
    this.jumpscareGroup.visible = false;

    const skinMat = new THREE.MeshStandardMaterial({
      color: 0x202724,
      roughness: 0.55,
      metalness: 0.2
    });
    this.jumpscareEyeMat = new THREE.MeshBasicMaterial({ color: 0xff3b30 });

    // Torso amenazante
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 0.65, 6, 8), skinMat);
    torso.position.y = -0.35;
    this.jumpscareGroup.add(torso);

    // Cabeza alienígena detallada en primer plano
    this.jumpscareHead = new THREE.Group();
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.17, 12, 12), skinMat);
    skull.scale.set(0.86, 1.35, 1.15);
    this.jumpscareHead.add(skull);

    // Mandíbula / hendidura bucal abierta en el ataque
    const maw = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.09, 0.06),
      new THREE.MeshBasicMaterial({ color: 0x050202 })
    );
    maw.position.set(0, -0.11, 0.16);
    this.jumpscareHead.add(maw);

    const leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.032, 8, 8), this.jumpscareEyeMat);
    leftEye.scale.set(1.35, 0.65, 0.6);
    leftEye.position.set(-0.062, 0.02, 0.165);
    this.jumpscareHead.add(leftEye);

    const rightEye = new THREE.Mesh(new THREE.SphereGeometry(0.032, 8, 8), this.jumpscareEyeMat);
    rightEye.scale.set(1.35, 0.65, 0.6);
    rightEye.position.set(0.062, 0.02, 0.165);
    this.jumpscareHead.add(rightEye);

    this.jumpscareGroup.add(this.jumpscareHead);

    // Brazos y garras extendidas hacia la cara del jugador
    const armGeo = new THREE.CylinderGeometry(0.042, 0.028, 0.78, 7);
    this.jumpscareLeftArm = new THREE.Mesh(armGeo, skinMat);
    this.jumpscareLeftArm.position.set(-0.26, -0.12, 0.35);
    this.jumpscareLeftArm.rotation.x = Math.PI / 2.1;
    this.jumpscareLeftArm.rotation.z = -0.25;
    this.jumpscareGroup.add(this.jumpscareLeftArm);

    this.jumpscareRightArm = new THREE.Mesh(armGeo, skinMat);
    this.jumpscareRightArm.position.set(0.26, -0.12, 0.35);
    this.jumpscareRightArm.rotation.x = Math.PI / 2.1;
    this.jumpscareRightArm.rotation.z = 0.25;
    this.jumpscareGroup.add(this.jumpscareRightArm);

    // Luz estroboscópica de ataque en primer plano (sin sombras, regla 6.2)
    this.jumpscareLight = new THREE.PointLight(0xff4d30, 0, 4.0, 1.2);
    this.jumpscareLight.position.set(0, 0.15, 0.45);
    this.jumpscareLight.castShadow = false;
    this.jumpscareGroup.add(this.jumpscareLight);

    this.group.add(this.jumpscareGroup);
  }

  startJumpscare(vector = 'DOORWAY') {
    if (!this.jumpscareGroup) return;
    this.jumpscareGroup.visible = true;

    // Color de ojos según la entidad atacante
    if (vector === 'WINDOW') {
      this.jumpscareEyeMat.color.setHex(0xb8ffe0); // Observador
    } else if (vector === 'GRILLE') {
      this.jumpscareEyeMat.color.setHex(0xffd166); // Reptante
    } else {
      this.jumpscareEyeMat.color.setHex(0xff3b30); // Intruso / Blackout
    }
  }

  updateJumpscare(progress, vector, camera, elapsedTime) {
    if (!this.jumpscareGroup || !this.jumpscareGroup.visible) return;

    // Punto de partida según el vector por donde irrumpe la criatura
    let startPos;
    let targetYaw = 0;
    let targetPitch = 0;

    if (vector === 'WINDOW') {
      startPos = new THREE.Vector3(1.75, 1.28, -0.45);
      targetYaw = THREE.MathUtils.degToRad(-68);
      targetPitch = THREE.MathUtils.degToRad(4);
    } else if (vector === 'GRILLE') {
      startPos = new THREE.Vector3(1.65, 0.35, 0.42);
      targetYaw = THREE.MathUtils.degToRad(-58);
      targetPitch = THREE.MathUtils.degToRad(-16);
    } else if (vector === 'DOORWAY') {
      startPos = new THREE.Vector3(-1.75, 1.28, -0.55);
      targetYaw = THREE.MathUtils.degToRad(62);
      targetPitch = THREE.MathUtils.degToRad(5);
    } else {
      // BLACKOUT: Irrumpe desde el frente sobre el escritorio
      startPos = new THREE.Vector3(0, 1.25, -1.05);
      targetYaw = 0;
      targetPitch = THREE.MathUtils.degToRad(4);
    }

    // Giro brusco de la cámara hacia el atacante + sacudida violenta
    const snapT = Math.min(1, progress * 3.8);
    const shakeYaw = Math.sin(elapsedTime * 68) * 0.075;
    const shakePitch = Math.cos(elapsedTime * 74) * 0.065;
    camera.rotation.set(
      THREE.MathUtils.lerp(camera.rotation.x, targetPitch, snapT) + shakePitch,
      THREE.MathUtils.lerp(camera.rotation.y, targetYaw, snapT) + shakeYaw,
      Math.sin(elapsedTime * 55) * 0.06,
      'YXZ'
    );

    // Posición final a 0.56m frente a la lente de la cámara
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    const endPos = camera.position.clone().addScaledVector(forward, 0.56);
    endPos.y -= 0.04;

    const lungeT = Math.min(1, Math.pow(progress, 0.55));
    this.jumpscareGroup.position.lerpVectors(startPos, endPos, lungeT);
    this.jumpscareGroup.lookAt(camera.position);

    // Sacudida frenética de cráneo y garras
    this.jumpscareHead.rotation.z = Math.sin(elapsedTime * 52) * 0.35;
    this.jumpscareHead.rotation.x = Math.cos(elapsedTime * 44) * 0.22;
    this.jumpscareLeftArm.position.z = 0.35 + Math.sin(elapsedTime * 48) * 0.12;
    this.jumpscareRightArm.position.z = 0.35 - Math.sin(elapsedTime * 48) * 0.12;

    // Parpadeo estroboscópico de emergencia
    const strobe = Math.sin(elapsedTime * 60) > -0.2 ? 9.5 : 1.2;
    this.jumpscareLight.intensity = strobe;
  }

  stopJumpscare() {
    if (!this.jumpscareGroup) return;
    this.jumpscareGroup.visible = false;
    this.jumpscareLight.intensity = 0;
  }

  update(dt, elapsedTime, defenseState = {}, powerState = {}) {
    if (!this.group.visible) return;

    this._drawCCTVPreviewStatic(elapsedTime);

    const {
      isDoorClosed = false,
      isVentSealed = false,
      isHallwayLightOn = false
    } = defenseState;

    const {
      isBreakerTripped = false,
      isBlackout = false
    } = powerState;

    // 1. Animar Puerta Electromagnética Izquierda (Y = 1.05 cerrada, Y = 2.95 abierta)
    if (this.securityDoorMesh) {
      const targetDoorY = isDoorClosed ? 1.05 : 2.95;
      this.securityDoorMesh.position.y = THREE.MathUtils.lerp(
        this.securityDoorMesh.position.y,
        targetDoorY,
        Math.min(1, dt * 12.0)
      );
    }
    if (this.doorBtnMesh) {
      this.doorBtnMesh.material.color.setHex(
        isBlackout ? 0x222222 : isDoorClosed ? 0x38e54d : 0xff2e2e
      );
    }

    // 2. Luz de Verificación de Pasillo Izquierdo
    if (this.hallwayPulseLight) {
      this.hallwayPulseLight.intensity = isHallwayLightOn ? 14.0 : 0.0;
    }

    // 3. Animar Compuerta Neumática del Ducto Derecho (Y = 0.0 cerrada, Y = 0.34 abierta)
    if (this.ventDamperMesh) {
      const targetVentY = isVentSealed ? 0.0 : 0.34;
      this.ventDamperMesh.position.y = THREE.MathUtils.lerp(
        this.ventDamperMesh.position.y,
        targetVentY,
        Math.min(1, dt * 16.0)
      );
    }
    if (this.ventLeverHandle) {
      const targetRotZ = isVentSealed ? (Math.PI * 2) / 3 : Math.PI / 3;
      this.ventLeverHandle.rotation.z = THREE.MathUtils.lerp(
        this.ventLeverHandle.rotation.z,
        targetRotZ,
        Math.min(1, dt * 14.0)
      );
    }

    // 4. Estado visual del Panel Eléctrico Trasero (Fusibles)
    if (this.breakerStatusLight && this.panelPilotLight) {
      if (isBlackout) {
        this.breakerStatusLight.material.color.setHex(0x1a1a1a);
        this.panelPilotLight.intensity = 0;
      } else if (isBreakerTripped) {
        const blink = Math.sin(elapsedTime * 16) > 0;
        this.breakerStatusLight.material.color.setHex(blink ? 0xff2e2e : 0x3a0808);
        this.panelPilotLight.color.setHex(0xff2e2e);
        this.panelPilotLight.intensity = blink ? 1.8 : 0.25;
      } else {
        this.breakerStatusLight.material.color.setHex(0x38e54d);
        this.panelPilotLight.color.setHex(0xff7b29);
        this.panelPilotLight.intensity = 0.55;
      }
    }
  }
}

