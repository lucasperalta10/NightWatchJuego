import * as THREE from 'three';

export class House {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.name = 'HouseCCTVSectors';

    this.sectors = {};
    this.porchSpotlight = null;

    this._initSharedMaterials();
    this._buildCam01Porch();
    this._buildCam02KitchenVent();
    this._buildCam03SideYard();
    this._buildCam04Hallway();

    // Por defecto todos los sectores remotos están ocultos (Regla 6.1: Cero Draw Calls extra en oficina)
    this.hideAllSectors();
    this.scene.add(this.group);
  }

  _initSharedMaterials() {
    this.mats = {
      darkWood: new THREE.MeshStandardMaterial({ color: 0x3b2c22, roughness: 0.84 }),
      weatheredWood: new THREE.MeshStandardMaterial({ color: 0x36332d, roughness: 0.88 }),
      plasterWall: new THREE.MeshStandardMaterial({ color: 0x3f4b46, roughness: 0.85 }),
      kitchenTile: new THREE.MeshStandardMaterial({ color: 0x313b38, roughness: 0.65, metalness: 0.1 }),
      metalDuct: new THREE.MeshStandardMaterial({ color: 0x525e68, roughness: 0.4, metalness: 0.7 }),
      appliance: new THREE.MeshStandardMaterial({ color: 0x56615c, roughness: 0.48, metalness: 0.25 }),
      forestGround: new THREE.MeshStandardMaterial({ color: 0x17211c, roughness: 0.96 }),
      pineTree: new THREE.MeshStandardMaterial({ color: 0x13241a, roughness: 0.92 }),
      trimDark: new THREE.MeshStandardMaterial({ color: 0x201813, roughness: 0.88 }),
      darkVoid: new THREE.MeshBasicMaterial({ color: 0x030506 })
    };
  }

  /**
   * CAM 01 — Porche Delantero (Vector del Observador + Reflector exterior)
   */
  _buildCam01Porch() {
    const group = new THREE.Group();
    group.name = 'CAM_01_PORCH';
    const offset = new THREE.Vector3(0, 0, -28);
    group.position.copy(offset);

    // Piso de madera del porche
    const deck = new THREE.Mesh(new THREE.BoxGeometry(7.5, 0.2, 4.2), this.mats.darkWood);
    deck.position.set(0, 0.1, 0);
    deck.receiveShadow = true;
    group.add(deck);

    // Techo del porche
    const roof = new THREE.Mesh(new THREE.BoxGeometry(7.8, 0.2, 4.5), this.mats.trimDark);
    roof.position.set(0, 3.1, 0);
    group.add(roof);

    // Columnas de madera y baranda frontal
    const pillarGeo = new THREE.BoxGeometry(0.22, 3.0, 0.22);
    for (const x of [-3.2, -1.1, 1.1, 3.2]) {
      const pillar = new THREE.Mesh(pillarGeo, this.mats.weatheredWood);
      pillar.position.set(x, 1.6, -1.9);
      pillar.castShadow = true;
      pillar.receiveShadow = true;
      group.add(pillar);
    }

    // Barandas del porche
    const railLeft = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.9, 0.12), this.mats.weatheredWood);
    railLeft.position.set(-2.15, 0.65, -1.9);
    group.add(railLeft);

    const railRight = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.9, 0.12), this.mats.weatheredWood);
    railRight.position.set(2.15, 0.65, -1.9);
    group.add(railRight);

    // Suelo exterior y bosque frente al porche
    const yard = new THREE.Mesh(new THREE.PlaneGeometry(26, 22), this.mats.forestGround);
    yard.rotation.x = -Math.PI / 2;
    yard.position.set(0, -0.15, -10);
    yard.receiveShadow = true;
    group.add(yard);

    // Escalones de entrada
    for (let i = 0; i < 3; i++) {
      const step = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.12, 0.35), this.mats.weatheredWood);
      step.position.set(0, 0.05 - i * 0.08, -2.1 - i * 0.32);
      group.add(step);
    }

    // Árboles entre la niebla
    const trunkGeo = new THREE.CylinderGeometry(0.18, 0.26, 5.5, 7);
    const coneGeo = new THREE.ConeGeometry(1.35, 4.2, 7);
    const treeCoords = [
      [-4.5, -6.5], [3.8, -7.2], [-1.8, -9.5], [1.6, -11.0],
      [-6.2, -11.5], [5.4, -10.2], [0.2, -13.5]
    ];
    for (const [tx, tz] of treeCoords) {
      const tree = new THREE.Group();
      const trunk = new THREE.Mesh(trunkGeo, this.mats.darkWood);
      trunk.position.y = 2.6;
      trunk.castShadow = true;
      tree.add(trunk);

      const crown = new THREE.Mesh(coneGeo, this.mats.pineTree);
      crown.position.y = 4.6;
      tree.add(crown);

      tree.position.set(tx, -0.15, tz);
      group.add(tree);
    }

    // Iluminación IR de visión nocturna moderada (sin sombras, regla 6.2)
    const irLightNear = new THREE.PointLight(0x6eb59c, 8.5, 18, 1.35);
    irLightNear.position.set(-2.2, 2.7, 0.8);
    irLightNear.castShadow = false;
    group.add(irLightNear);

    const irLightYard = new THREE.PointLight(0x4d8576, 4.2, 18, 1.4);
    irLightYard.position.set(0, 3.4, -7.2);
    irLightYard.castShadow = false;
    group.add(irLightYard);

    // Reflector del Porche (Regla 6.2: Luz dinámica #2 con sombras proyectadas, apagada por defecto)
    this.porchSpotlight = new THREE.SpotLight(
      0xfff4d6,
      0,
      28,
      THREE.MathUtils.degToRad(50),
      0.45,
      1.0
    );
    this.porchSpotlight.position.set(0, 2.9, -1.7);
    this.porchSpotlight.castShadow = true;
    this.porchSpotlight.shadow.mapSize.width = 512;
    this.porchSpotlight.shadow.mapSize.height = 512;
    const porchTarget = new THREE.Object3D();
    porchTarget.position.set(0, 0.3, -9.5);
    group.add(this.porchSpotlight);
    group.add(porchTarget);
    this.porchSpotlight.target = porchTarget;

    this.group.add(group);

    this.sectors['CAM 01'] = {
      id: 'CAM 01',
      name: 'PORCHE DELANTERO',
      group,
      camPos: new THREE.Vector3(-2.6, 2.65, 1.4).add(offset),
      baseYaw: THREE.MathUtils.degToRad(-16),
      basePitch: THREE.MathUtils.degToRad(-14),
      panRange: THREE.MathUtils.degToRad(14),
      panSpeed: 0.42
    };
  }

  /**
   * CAM 02 — Cocina y Ducto de Ventilación (Vector del Reptante)
   */
  _buildCam02KitchenVent() {
    const group = new THREE.Group();
    group.name = 'CAM_02_KITCHEN';
    const offset = new THREE.Vector3(28, 0, 0);
    group.position.copy(offset);

    const w = 5.2, h = 2.8, d = 5.0;

    // Piso y techo
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(w, d), this.mats.kitchenTile);
    floor.rotation.x = -Math.PI / 2;
    group.add(floor);

    const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(w, d), this.mats.trimDark);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = h;
    group.add(ceiling);

    // Paredes
    const backWall = new THREE.Mesh(new THREE.PlaneGeometry(w, h), this.mats.plasterWall);
    backWall.position.set(0, h / 2, -d / 2);
    group.add(backWall);

    const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(d, h), this.mats.plasterWall);
    leftWall.rotation.y = Math.PI / 2;
    leftWall.position.set(-w / 2, h / 2, 0);
    group.add(leftWall);

    const rightWall = new THREE.Mesh(new THREE.PlaneGeometry(d, h), this.mats.plasterWall);
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.position.set(w / 2, h / 2, 0);
    group.add(rightWall);

    // Mesada de cocina y alacena superior
    const counter = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.9, 0.75), this.mats.darkWood);
    counter.position.set(-0.8, 0.45, -2.05);
    group.add(counter);

    const counterTop = new THREE.Mesh(new THREE.BoxGeometry(3.26, 0.06, 0.8), this.mats.appliance);
    counterTop.position.set(-0.8, 0.92, -2.05);
    group.add(counterTop);

    // Refrigerador antiguo
    const fridge = new THREE.Mesh(new THREE.BoxGeometry(0.85, 1.85, 0.8), this.mats.appliance);
    fridge.position.set(1.5, 0.925, -2.0);
    group.add(fridge);

    // Mesa central de madera
    const tableTop = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.08, 1.1), this.mats.darkWood);
    tableTop.position.set(-0.3, 0.78, 0.2);
    group.add(tableTop);

    for (const [lx, lz] of [[-0.9, -0.25], [0.3, -0.25], [-0.9, 0.65], [0.3, 0.65]]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.76, 0.08), this.mats.trimDark);
      leg.position.set(lx, 0.38, lz);
      group.add(leg);
    }

    // Boca del Ducto de Ventilación Principal en pared derecha baja (acceso hacia la oficina)
    const ventFrame = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.68, 0.88), this.mats.metalDuct);
    ventFrame.position.set(w / 2 - 0.06, 0.42, -0.4);
    group.add(ventFrame);

    const ventHole = new THREE.Mesh(new THREE.PlaneGeometry(0.76, 0.54), this.mats.darkVoid);
    ventHole.rotation.y = -Math.PI / 2;
    ventHole.position.set(w / 2 - 0.16, 0.42, -0.4);
    group.add(ventHole);

    // Tubo extractor metálico subiendo desde el ducto
    const ductPipe = new THREE.Mesh(new THREE.BoxGeometry(0.45, 1.8, 0.6), this.mats.metalDuct);
    ductPipe.position.set(w / 2 - 0.25, 1.65, -0.4);
    group.add(ductPipe);

    // Luces IR de cámara en cocina moderadas (sin sombras)
    const camLight = new THREE.PointLight(0x6eb898, 8.0, 14, 1.35);
    camLight.position.set(-1.6, 2.45, 1.6);
    camLight.castShadow = false;
    group.add(camLight);

    const ventFillLight = new THREE.PointLight(0x4e8f75, 3.2, 8, 1.4);
    ventFillLight.position.set(1.4, 1.4, -0.4);
    ventFillLight.castShadow = false;
    group.add(ventFillLight);

    this.group.add(group);

    this.sectors['CAM 02'] = {
      id: 'CAM 02',
      name: 'COCINA / DUCTO SUR',
      group,
      camPos: new THREE.Vector3(-2.1, 2.45, 2.0).add(offset),
      baseYaw: THREE.MathUtils.degToRad(-32),
      basePitch: THREE.MathUtils.degToRad(-22),
      panRange: THREE.MathUtils.degToRad(12),
      panSpeed: 0.38
    };
  }

  /**
   * CAM 03 — Patio Lateral y Linde del Bosque (Vector exterior del Observador)
   */
  _buildCam03SideYard() {
    const group = new THREE.Group();
    group.name = 'CAM_03_SIDEYARD';
    const offset = new THREE.Vector3(56, 0, 0);
    group.position.copy(offset);

    // Terreno exterior
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(24, 24), this.mats.forestGround);
    ground.rotation.x = -Math.PI / 2;
    group.add(ground);

    // Pared exterior de la cabaña a la izquierda
    const houseWall = new THREE.Mesh(new THREE.BoxGeometry(0.3, 3.6, 10), this.mats.weatheredWood);
    houseWall.position.set(-3.4, 1.8, -1.5);
    group.add(houseWall);

    // Cobertizo viejo de madera al fondo
    const shed = new THREE.Mesh(new THREE.BoxGeometry(2.8, 2.5, 2.6), this.mats.darkWood);
    shed.position.set(2.8, 1.25, -6.2);
    group.add(shed);

    const shedRoof = new THREE.Mesh(new THREE.BoxGeometry(3.1, 0.25, 2.9), this.mats.metalDuct);
    shedRoof.position.set(2.8, 2.6, -6.2);
    group.add(shedRoof);

    // Postes de cerca perimetral
    const postGeo = new THREE.BoxGeometry(0.14, 1.35, 0.14);
    const railGeo = new THREE.BoxGeometry(10.0, 0.08, 0.06);
    for (let i = 0; i < 6; i++) {
      const post = new THREE.Mesh(postGeo, this.mats.weatheredWood);
      post.position.set(-2.5 + i * 1.8, 0.675, -4.2);
      group.add(post);
    }
    const fenceRailTop = new THREE.Mesh(railGeo, this.mats.weatheredWood);
    fenceRailTop.position.set(2.0, 1.1, -4.2);
    group.add(fenceRailTop);

    const fenceRailMid = new THREE.Mesh(railGeo, this.mats.weatheredWood);
    fenceRailMid.position.set(2.0, 0.6, -4.2);
    group.add(fenceRailMid);

    // Pinos densos en el perímetro
    const trunkGeo = new THREE.CylinderGeometry(0.18, 0.25, 5.5, 7);
    const coneGeo = new THREE.ConeGeometry(1.4, 4.4, 7);
    const trees = [
      [-1.2, -8.5], [0.8, -10.2], [4.5, -9.0], [5.8, -5.5],
      [-2.2, -12.0], [2.4, -12.8], [6.5, -8.2]
    ];
    for (const [tx, tz] of trees) {
      const tree = new THREE.Group();
      const trunk = new THREE.Mesh(trunkGeo, this.mats.darkWood);
      trunk.position.y = 2.7;
      tree.add(trunk);
      const crown = new THREE.Mesh(coneGeo, this.mats.pineTree);
      crown.position.y = 4.7;
      tree.add(crown);
      tree.position.set(tx, 0, tz);
      group.add(tree);
    }

    // Luces IR de cámara exterior moderadas
    const yardLightNear = new THREE.PointLight(0x68b0a6, 9.0, 18, 1.35);
    yardLightNear.position.set(-2.5, 3.0, 1.2);
    yardLightNear.castShadow = false;
    group.add(yardLightNear);

    const yardLightFar = new THREE.PointLight(0x4a827a, 4.5, 18, 1.4);
    yardLightFar.position.set(1.5, 3.5, -6.5);
    yardLightFar.castShadow = false;
    group.add(yardLightFar);

    this.group.add(group);

    this.sectors['CAM 03'] = {
      id: 'CAM 03',
      name: 'PATIO LATERAL / BOSQUE',
      group,
      camPos: new THREE.Vector3(-2.9, 2.85, 2.2).add(offset),
      baseYaw: THREE.MathUtils.degToRad(-24),
      basePitch: THREE.MathUtils.degToRad(-12),
      panRange: THREE.MathUtils.degToRad(16),
      panSpeed: 0.35
    };
  }

  /**
   * CAM 04 — Pasillo Interior (Vector del Intruso hacia la puerta izquierda)
   */
  _buildCam04Hallway() {
    const group = new THREE.Group();
    group.name = 'CAM_04_HALLWAY';
    const offset = new THREE.Vector3(-28, 0, 0);
    group.position.copy(offset);

    const w = 2.4, h = 2.7, d = 8.5;

    // Piso de tablones de madera
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(w, d), this.mats.darkWood);
    floor.rotation.x = -Math.PI / 2;
    group.add(floor);

    const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(w, d), this.mats.trimDark);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = h;
    group.add(ceiling);

    // Paredes laterales del pasillo
    const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(d, h), this.mats.plasterWall);
    leftWall.rotation.y = Math.PI / 2;
    leftWall.position.set(-w / 2, h / 2, 0);
    group.add(leftWall);

    const rightWall = new THREE.Mesh(new THREE.PlaneGeometry(d, h), this.mats.plasterWall);
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.position.set(w / 2, h / 2, 0);
    group.add(rightWall);

    const endWall = new THREE.Mesh(new THREE.PlaneGeometry(w, h), this.mats.plasterWall);
    endWall.position.set(0, h / 2, -d / 2);
    group.add(endWall);

    // Zócalos de madera a lo largo del pasillo
    const wainscotLeft = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.9, d), this.mats.trimDark);
    wainscotLeft.position.set(-w / 2 + 0.03, 0.45, 0);
    group.add(wainscotLeft);

    const wainscotRight = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.9, d), this.mats.trimDark);
    wainscotRight.position.set(w / 2 - 0.03, 0.45, 0);
    group.add(wainscotRight);

    // Puerta al fondo del pasillo y marcos de cuadros en las paredes
    const farDoor = new THREE.Mesh(new THREE.BoxGeometry(1.1, 2.15, 0.08), this.mats.weatheredWood);
    farDoor.position.set(0, 1.075, -d / 2 + 0.05);
    group.add(farDoor);

    // Reloj de péndulo antiguo / mueble en el pasillo
    const grandfatherClock = new THREE.Mesh(new THREE.BoxGeometry(0.48, 2.05, 0.36), this.mats.trimDark);
    grandfatherClock.position.set(-0.88, 1.025, -1.8);
    group.add(grandfatherClock);

    const clockDial = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.14, 0.02, 12),
      this.mats.appliance
    );
    clockDial.rotation.z = Math.PI / 2;
    clockDial.position.set(-0.63, 1.68, -1.8);
    group.add(clockDial);

    // Cuadros decorativos en pared derecha
    for (const zPos of [-0.6, -2.4]) {
      const frame = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.65, 0.5), this.mats.weatheredWood);
      frame.position.set(w / 2 - 0.04, 1.55, zPos);
      group.add(frame);
    }

    // Luces IR del pasillo moderadas (cercana y al fondo, sin sombras)
    this.hallwayLight = new THREE.PointLight(0x6db39d, 7.5, 13, 1.35);
    this.hallwayLight.position.set(0, 2.45, 1.2);
    this.hallwayLight.castShadow = false;
    group.add(this.hallwayLight);

    const farHallwayLight = new THREE.PointLight(0x4d8774, 3.6, 11, 1.4);
    farHallwayLight.position.set(0, 2.35, -2.6);
    farHallwayLight.castShadow = false;
    group.add(farHallwayLight);

    this.group.add(group);

    this.sectors['CAM 04'] = {
      id: 'CAM 04',
      name: 'PASILLO CENTRAL (ACCESO OFICINA)',
      group,
      camPos: new THREE.Vector3(0.75, 2.38, 3.4).add(offset),
      baseYaw: THREE.MathUtils.degToRad(8),
      basePitch: THREE.MathUtils.degToRad(-14),
      panRange: THREE.MathUtils.degToRad(9),
      panSpeed: 0.32
    };
  }

  showOnlySector(camId) {
    Object.values(this.sectors).forEach((sec) => {
      sec.group.visible = sec.id === camId;
    });
  }

  hideAllSectors() {
    Object.values(this.sectors).forEach((sec) => {
      sec.group.visible = false;
    });
  }

  getSector(camId) {
    return this.sectors[camId] || this.sectors['CAM 01'];
  }
}
