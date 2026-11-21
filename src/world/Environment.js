import * as THREE from 'three';

export class Environment {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.name = 'ExteriorEnvironment';

    this.trees = [];
    this.moonlight = null;

    this._buildExteriorRightWoods();
    this.scene.add(this.group);
  }

  _buildExteriorRightWoods() {
    // Suelo exterior más allá de la ventana derecha (X > 2.1)
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x070a09,
      roughness: 0.98
    });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(18, 18), groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(10, -0.05, -1);
    ground.receiveShadow = true;
    this.group.add(ground);

    // Árboles muertos / pinos entre la niebla visibles desde la ventana derecha
    const trunkGeo = new THREE.CylinderGeometry(0.14, 0.22, 4.8, 7);
    const foliageGeo = new THREE.ConeGeometry(1.1, 3.4, 7);
    const treeMat = new THREE.MeshStandardMaterial({
      color: 0x090d0c,
      roughness: 0.95
    });

    const treePositions = [
      [4.8, -1.8],
      [6.2, 0.4],
      [5.5, -3.5],
      [7.8, -1.1],
      [8.6, 1.8],
      [9.5, -2.7],
      [11.2, -0.3]
    ];

    treePositions.forEach(([x, z], idx) => {
      const tree = new THREE.Group();
      const trunk = new THREE.Mesh(trunkGeo, treeMat);
      trunk.position.y = 2.4;
      trunk.castShadow = true;
      tree.add(trunk);

      const foliage = new THREE.Mesh(foliageGeo, treeMat);
      foliage.position.y = 4.2;
      tree.add(foliage);

      tree.position.set(x, 0, z);
      tree.userData.windPhase = idx * 1.35;
      this.trees.push(tree);
      this.group.add(tree);
    });

    // Resplandor lunar frío muy tenue desde el bosque (PointLight sin sombras)
    this.moonlight = new THREE.PointLight(0x284b63, 0.65, 16, 1.5);
    this.moonlight.position.set(9.5, 5.5, -1.2);
    this.moonlight.castShadow = false;
    this.group.add(this.moonlight);
  }

  setDawnLight(isDawn) {
    if (!this.moonlight) return;
    if (isDawn) {
      this.moonlight.color.setHex(0xffb56b);
      this.moonlight.intensity = 3.8;
    } else {
      this.moonlight.color.setHex(0x284b63);
      this.moonlight.intensity = 0.65;
    }
  }

  update(elapsedTime, hourIndex = 0) {
    if (!this.group.visible) return;

    // Oscilación progresiva de los pinos por el viento nocturno
    const windStrength = 0.014 + hourIndex * 0.005;
    const windFreq = 1.4 + hourIndex * 0.25;

    for (const tree of this.trees) {
      const phase = tree.userData.windPhase || 0;
      tree.rotation.z = Math.sin(elapsedTime * windFreq + phase) * windStrength;
      tree.rotation.x = Math.cos(elapsedTime * (windFreq * 0.7) + phase) * (windStrength * 0.6);
    }
  }
}
