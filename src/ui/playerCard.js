import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// Small self-contained viewport on the right edge showing a 3D player.
// If a GLB model exists in public/models/ (per-player slug or player.glb),
// it is shown; otherwise falls back to a procedural stylized figure in the
// dataset's team color. Purely decorative: no interaction, own renderer,
// updated from the main loop.

const VIEW_W = 170;
const VIEW_H = 210;

const SKIN = 0xc08a5f; // neutral warm tan — not a likeness of any player
const HAIR = 0x2a1d14;
const BALL = 0xc9702e;

const JERSEY_NUMBERS = {
  'Luka Dončić': '77',
  'Anthony Edwards': '5',
  'Stephen Curry': '30',
  'LeBron James': '23',
  'Nikola Jokić': '15',
  'Shai Gilgeous-Alexander': '2',
  'Giannis Antetokounmpo': '34',
  'Jayson Tatum': '0',
  'Kevin Durant': '35',
  'Victor Wembanyama': '1',
  'Devin Booker': '1',
};

function numberTexture(number, textColor) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 128, 128);
  ctx.fillStyle = textColor;
  ctx.font = 'bold 72px -apple-system, Helvetica, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(number, 64, 68);
  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 4;
  return tex;
}

// Capsule oriented between two points — gives natural elbows/knees.
function limb(a, b, radius, material) {
  const va = new THREE.Vector3(...a);
  const vb = new THREE.Vector3(...b);
  const dir = vb.clone().sub(va);
  const len = dir.length();
  const mesh = new THREE.Mesh(new THREE.CapsuleGeometry(radius, len, 6, 16), material);
  mesh.position.copy(va.clone().add(vb).multiplyScalar(0.5));
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  return mesh;
}

function joint(position, radius, material) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 16, 12), material);
  mesh.position.set(...position);
  return mesh;
}

function buildFigure(teamColorHex, jerseyNumber) {
  const group = new THREE.Group();

  const teamColor = new THREE.Color(teamColorHex || '#888888');
  const trimColor = teamColor.clone().multiplyScalar(0.5);

  const jerseyMat = new THREE.MeshStandardMaterial({ color: teamColor, roughness: 0.85 });
  const shortsMat = new THREE.MeshStandardMaterial({ color: teamColor, roughness: 0.85 });
  const trimMat = new THREE.MeshStandardMaterial({ color: trimColor, roughness: 0.85 });
  const skinMat = new THREE.MeshStandardMaterial({ color: SKIN, roughness: 0.55 });
  const hairMat = new THREE.MeshStandardMaterial({ color: HAIR, roughness: 0.9 });
  const sockMat = new THREE.MeshStandardMaterial({ color: 0xf0f0f0, roughness: 0.9 });
  const shoeMat = new THREE.MeshStandardMaterial({ color: 0xf5f5f5, roughness: 0.4 });
  const shoeSoleMat = new THREE.MeshStandardMaterial({ color: 0x1c1e24, roughness: 0.6 });
  const ballMat = new THREE.MeshStandardMaterial({ color: BALL, roughness: 0.95 });

  // ---- Torso: capsule flattened front-to-back reads as chest/back. ----
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.52, 1.0, 8, 20), jerseyMat);
  torso.scale.set(1, 1, 0.62);
  torso.position.y = 3.15;
  group.add(torso);

  // Jersey side trim.
  for (const side of [-1, 1]) {
    const stripe = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 1.0, 4, 10), trimMat);
    stripe.position.set(side * 0.5, 3.15, 0);
    stripe.scale.z = 0.62;
    group.add(stripe);
  }

  // Jersey number decals (front and back).
  if (jerseyNumber) {
    const numTex = numberTexture(jerseyNumber, '#ffffff');
    const numMat = new THREE.MeshBasicMaterial({ map: numTex, transparent: true });
    const front = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.62), numMat);
    front.position.set(0, 3.25, 0.36);
    group.add(front);
    const back = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.62), numMat);
    back.position.set(0, 3.35, -0.36);
    back.rotation.y = Math.PI;
    group.add(back);
  }

  // ---- Shorts with two legs. ----
  const shorts = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.56, 0.55, 20), shortsMat);
  shorts.scale.z = 0.72;
  shorts.position.y = 2.35;
  group.add(shorts);
  for (const side of [-1, 1]) {
    const shortLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.29, 0.45, 14), shortsMat);
    shortLeg.position.set(side * 0.27, 2.0, 0);
    group.add(shortLeg);
    const hem = new THREE.Mesh(new THREE.CylinderGeometry(0.295, 0.295, 0.08, 14), trimMat);
    hem.position.set(side * 0.27, 1.79, 0);
    group.add(hem);
  }

  // ---- Head, neck, hair. ----
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.18, 0.28, 12), skinMat);
  neck.position.y = 3.95;
  group.add(neck);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.32, 20, 16), skinMat);
  head.scale.set(0.92, 1.08, 0.95);
  head.position.y = 4.42;
  group.add(head);

  // Hair: upper hemisphere shell, nudged back so the face stays clear.
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.345, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), hairMat);
  hair.scale.set(0.94, 1.05, 0.97);
  hair.position.set(0, 4.46, -0.03);
  group.add(hair);

  // ---- Legs: thigh → knee → ankle, with socks and shoes. ----
  for (const side of [-1, 1]) {
    const hip = [side * 0.27, 1.85, 0];
    const knee = [side * 0.29, 1.05, 0.04];
    const ankle = [side * 0.29, 0.3, -0.04];
    group.add(limb(hip, knee, 0.185, skinMat));
    group.add(joint(knee, 0.17, skinMat));
    group.add(limb(knee, ankle, 0.14, skinMat));

    const sock = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.16, 0.28, 12), sockMat);
    sock.position.set(side * 0.29, 0.42, -0.045);
    group.add(sock);

    const shoe = new THREE.Mesh(new THREE.SphereGeometry(0.19, 14, 10), shoeMat);
    shoe.scale.set(1, 0.62, 1.85);
    shoe.position.set(side * 0.29, 0.14, 0.08);
    group.add(shoe);
    const sole = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.07, 0.72), shoeSoleMat);
    sole.position.set(side * 0.29, 0.035, 0.08);
    group.add(sole);
  }

  // ---- Arms. Right arm bent, palming the ball in front; left relaxed. ----
  const rShoulder = [0.58, 3.62, 0];
  const rElbow = [0.82, 2.95, 0.28];
  const rWrist = [0.68, 3.1, 0.72];
  group.add(joint(rShoulder, 0.17, skinMat));
  group.add(limb(rShoulder, rElbow, 0.13, skinMat));
  group.add(joint(rElbow, 0.115, skinMat));
  group.add(limb(rElbow, rWrist, 0.11, skinMat));
  group.add(joint(rWrist, 0.12, skinMat));

  const lShoulder = [-0.58, 3.62, 0];
  const lElbow = [-0.74, 2.92, 0.06];
  const lWrist = [-0.66, 2.28, 0.14];
  group.add(joint(lShoulder, 0.17, skinMat));
  group.add(limb(lShoulder, lElbow, 0.13, skinMat));
  group.add(joint(lElbow, 0.115, skinMat));
  group.add(limb(lElbow, lWrist, 0.11, skinMat));
  group.add(joint(lWrist, 0.12, skinMat));

  // ---- Ball resting on the right palm, with seam rings. Tagged so a real
  // ball model (models/ball.glb) can replace it after it loads. ----
  const ballCenter = new THREE.Vector3(0.68, 3.52, 0.82);
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.38, 20, 16), ballMat);
  ball.name = 'ball-proc';
  ball.position.copy(ballCenter);
  group.add(ball);
  const seamMat = new THREE.MeshBasicMaterial({ color: 0x35231a });
  for (const rot of [[0, 0, 0], [Math.PI / 2, 0, 0.4], [0.4, 0, Math.PI / 2]]) {
    const seam = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.011, 6, 32), seamMat);
    seam.name = 'ball-proc';
    seam.position.copy(ballCenter);
    seam.rotation.set(...rot);
    group.add(seam);
  }
  group.userData.ballCenter = ballCenter;

  // Soft ground shadow.
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.95, 24),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35 }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.01;
  group.add(shadow);

  return group;
}

export function createPlayerCard(parent) {
  const container = document.createElement('div');
  container.id = 'player-card';
  container.className = 'panel';
  parent.appendChild(container);

  const canvasWrap = document.createElement('div');
  canvasWrap.className = 'player-card-canvas';
  container.appendChild(canvasWrap);

  const nameEl = document.createElement('div');
  nameEl.className = 'player-card-name';
  container.appendChild(nameEl);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(VIEW_W, VIEW_H);
  canvasWrap.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, VIEW_W / VIEW_H, 0.1, 50);
  camera.position.set(0, 3.6, 10.5);
  camera.lookAt(0, 2.6, 0);

  scene.add(new THREE.HemisphereLight(0xbfd0ff, 0x1a1a24, 1.1));
  const key = new THREE.DirectionalLight(0xffffff, 1.4);
  key.position.set(3, 6, 4);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0x8fa4ff, 0.4);
  fill.position.set(-4, 3, -3);
  scene.add(fill);

  let figure = null;
  let mixer = null;
  let loadToken = 0;
  const gltfLoader = new GLTFLoader();

  // Real ball model (models/ball.glb), loaded once and cloned into each
  // procedural figure in place of the primitive-sphere ball.
  let ballModelPromise = null;
  function getBallModel() {
    if (!ballModelPromise) {
      ballModelPromise = (async () => {
        try {
          const head = await fetch(`${import.meta.env.BASE_URL}models/ball.glb`, { method: 'HEAD' });
          if (!head.ok || (head.headers.get('content-type') ?? '').includes('text/html')) return null;
          const gltf = await gltfLoader.loadAsync(`${import.meta.env.BASE_URL}models/ball.glb`);
          return gltf.scene;
        } catch {
          return null;
        }
      })();
    }
    return ballModelPromise;
  }

  async function swapInBallModel(fig) {
    const source = await getBallModel();
    if (!source || figure !== fig || !fig.userData.ballCenter) return;
    const ball = source.clone();
    const box = new THREE.Box3().setFromObject(ball);
    const size = box.getSize(new THREE.Vector3());
    ball.scale.multiplyScalar(0.76 / (Math.max(size.x, size.y, size.z) || 1));
    const center = new THREE.Box3().setFromObject(ball).getCenter(new THREE.Vector3());
    ball.position.add(fig.userData.ballCenter.clone().sub(center));
    fig.children.filter((c) => c.name === 'ball-proc').forEach((c) => { c.visible = false; });
    fig.add(ball);
    renderer.render(scene, camera);
  }

  function clearFigure() {
    if (!figure) return;
    scene.remove(figure);
    figure.traverse((obj) => {
      obj.geometry?.dispose();
      const mats = Array.isArray(obj.material) ? obj.material : obj.material ? [obj.material] : [];
      mats.forEach((m) => { m.map?.dispose(); m.dispose(); });
    });
    figure = null;
    mixer = null;
  }

  function showFigure(object) {
    clearFigure();
    figure = object;
    scene.add(figure);
    renderer.render(scene, camera);
  }

  // Scale/position an arbitrary GLB so it stands on the ground at roughly
  // the same height the procedural figure uses (~4.8 units).
  function normalizeModel(model) {
    const wrapper = new THREE.Group();
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const scale = 4.8 / (size.y || 1);
    model.scale.setScalar(scale);
    box.setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    model.position.x -= center.x;
    model.position.z -= center.z;
    model.position.y -= box.min.y;
    wrapper.add(model);
    return wrapper;
  }

  function playerSlug(name) {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '') // strip diacritics: Dončić -> doncic
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  }

  async function tryLoadGlb(url) {
    // Probe first so a missing file doesn't spam the console with loader errors.
    const head = await fetch(url, { method: 'HEAD' });
    if (!head.ok) return null;
    const type = head.headers.get('content-type') ?? '';
    if (type.includes('text/html')) return null; // dev server SPA fallback page
    const gltf = await gltfLoader.loadAsync(url);
    return gltf;
  }

  function setPlayer({ name, teamColor }) {
    nameEl.textContent = name;
    const token = ++loadToken;

    // Show the procedural figure immediately; swap in a GLB if one exists.
    showFigure(buildFigure(teamColor, JERSEY_NUMBERS[name]));
    swapInBallModel(figure);

    (async () => {
      for (const url of [`${import.meta.env.BASE_URL}models/${playerSlug(name)}.glb`, `${import.meta.env.BASE_URL}models/player.glb`]) {
        try {
          const gltf = await tryLoadGlb(url);
          if (!gltf) continue;
          if (token !== loadToken) return; // player changed while loading
          const wrapped = normalizeModel(gltf.scene);
          showFigure(wrapped);
          if (gltf.animations?.length) {
            mixer = new THREE.AnimationMixer(gltf.scene);
            mixer.clipAction(gltf.animations[0]).play();
          }
          return;
        } catch {
          // Bad/missing file — keep the procedural figure.
        }
      }
    })();
  }

  function update(dt, reduceMotion) {
    if (!figure || container.classList.contains('hidden')) return;
    if (!reduceMotion) {
      figure.rotation.y += dt * 0.6;
      mixer?.update(dt);
    }
    renderer.render(scene, camera);
  }

  function setVisible(visible) {
    container.classList.toggle('hidden', !visible);
  }

  return { setPlayer, update, setVisible };
}
