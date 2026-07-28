import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { HOOP_HEIGHT, RIM_Z } from './court.js';

// Optional standalone hoop: if public/models/hoop.glb exists AND no arena
// environment is loaded (arenas bring their own hoops), swap the procedural
// backboard/rim/net for the model. Defaults fit "Basketball Hoop" by
// Alec Huxley (CC-BY-4.0) — a wall-mount unit we hang at regulation height.
const BOARD_WIDTH_FT = 6; // scale target for the model's x extent
const HOOP_POS = { x: 0, y: HOOP_HEIGHT - 2.2, z: 3.9 }; // board back plane anchor; tune
const HOOP_ROTATION_Y = Math.PI; // this model's rim points toward -z by default

const URL = `${import.meta.env.BASE_URL}models/hoop.glb`;

export async function loadHoopModel(hoopGroup) {
  try {
    const head = await fetch(URL, { method: 'HEAD' });
    if (!head.ok) return null;
    const type = head.headers.get('content-type') ?? '';
    if (type.includes('text/html')) return null;

    const gltf = await new GLTFLoader().loadAsync(URL);
    const model = gltf.scene;

    // This model ships with a loose basketball next to the rim — hide it.
    model.traverse((obj) => {
      if (obj.isMesh && /basketball/i.test(obj.material?.name ?? '')) obj.visible = false;
    });

    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const scale = BOARD_WIDTH_FT / (size.x || 1);
    model.scale.setScalar(scale);
    model.rotation.y = HOOP_ROTATION_Y;

    box.setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    model.position.x += HOOP_POS.x - center.x;
    model.position.y += HOOP_POS.y - box.min.y;
    model.position.z += HOOP_POS.z - box.min.z;

    // Keep the stanchion (pole + arm); hide the procedural board, rim and net.
    for (const child of [...hoopGroup.children]) {
      if (child.name === 'backboard' || child.name === 'rim' || child.name === 'net') {
        child.visible = false;
      }
    }
    hoopGroup.add(model);
    return model;
  } catch {
    return null; // keep the procedural hoop
  }
}
