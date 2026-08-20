import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export function createScene(container) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0a0f);
  // Fog is atmosphere only. The old 60–140 range faded the whole scene to
  // background once the camera pulled back (split-compare sits ~130 units
  // out, which washed BOTH courts to black), so it now starts much further.
  const FOG_NEAR = 110;
  const FOG_FAR = 340;
  scene.fog = new THREE.Fog(0x0a0a0f, FOG_NEAR, FOG_FAR);

  const camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.1,
    500,
  );
  camera.position.set(0, 34, -32);

  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  // Three overlapping 220-intensity spots drive the middle of the court well
  // past 1.0. With no tone mapping that clips to flat white, which is what
  // washed the zone tints out to pastel and made the orange 3PT area read as
  // bare floor. ACES rolls the highlights off instead, so the lit pool keeps
  // its colour; the exposure bump keeps overall brightness where it was.
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  container.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.target.set(0, 0, 20);
  controls.minDistance = 15;
  controls.maxDistance = 260; // room to pull back far enough to frame two courts
  controls.maxPolarAngle = Math.PI / 2 - 0.02;
  // Pan (the "hand" tool) drags the court sideways rather than orbiting it.
  // Right-drag / two-finger-drag pans by default; the UI toggle below can put
  // panning on the LEFT button so a plain drag moves the court.
  controls.enablePan = true;
  controls.screenSpacePanning = true;
  controls.panSpeed = 0.9;
  controls.update();

  const ROTATE_BUTTONS = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN };
  const PAN_BUTTONS = { LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE };
  const ROTATE_TOUCH = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
  const PAN_TOUCH = { ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_ROTATE };
  controls.mouseButtons = { ...ROTATE_BUTTONS };
  controls.touches = { ...ROTATE_TOUCH };

  // Swap what a plain drag does: 'rotate' (orbit) or 'pan' (hand tool).
  function setDragMode(mode) {
    const pan = mode === 'pan';
    controls.mouseButtons = { ...(pan ? PAN_BUTTONS : ROTATE_BUTTONS) };
    controls.touches = { ...(pan ? PAN_TOUCH : ROTATE_TOUCH) };
    renderer.domElement.style.cursor = pan ? 'grab' : '';
  }

  // Split-compare frames two courts from far away; keep fog from eating them.
  function setWideView(enabled) {
    if (!scene.fog) return;
    scene.fog.near = enabled ? 260 : FOG_NEAR;
    scene.fog.far = enabled ? 900 : FOG_FAR;
  }

  const hemiLight = new THREE.HemisphereLight(0x9fb8ff, 0x0a0a0f, 0.6);
  scene.add(hemiLight);

  const keyLight = new THREE.DirectionalLight(0xffffff, 1.4);
  keyLight.position.set(-20, 40, -10);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(2048, 2048);
  keyLight.shadow.camera.left = -35;
  keyLight.shadow.camera.right = 35;
  keyLight.shadow.camera.top = 35;
  keyLight.shadow.camera.bottom = -35;
  scene.add(keyLight);

  // Overhead arena-style spot lights over the key and the arc, for a bit of
  // "under the lights" feel beyond the flat hemisphere/directional pair.
  //
  // Three of these overlap over the middle of the court, so the intensity is
  // deliberately well short of what one spot alone would want: any higher and
  // the combined pool saturates the floor, which flattens the zone tints and
  // the shot spikes into the same pale wash.
  const SPOT_INTENSITY = 220;
  const spotPositions = [
    [-14, 38, 10],
    [14, 38, 10],
    [0, 42, 26],
  ];
  const spotLights = spotPositions.map(([x, y, z]) => {
    const spot = new THREE.SpotLight(0xdfe8ff, SPOT_INTENSITY, 90, Math.PI / 7, 0.5, 1.4);
    spot.position.set(x, y, z);
    spot.target.position.set(x * 0.3, 0, z);
    scene.add(spot, spot.target);
    return spot;
  });

  // Split-compare puts a second court at +offsetX. The spotlight rig above
  // only covers the first court, so without a matching rig the compared
  // player's court renders noticeably darker — which would make the two look
  // different for reasons that have nothing to do with the data.
  let secondRig = [];
  function setSecondCourtLights(offsetX) {
    // Always clear the previous rig first.
    for (const spot of secondRig) {
      scene.remove(spot, spot.target);
      spot.dispose?.();
    }
    secondRig = [];

    if (offsetX == null) {
      keyLight.shadow.camera.left = -35;
      keyLight.shadow.camera.right = 35;
      keyLight.shadow.camera.updateProjectionMatrix();
      return;
    }

    secondRig = spotPositions.map(([x, y, z]) => {
      const spot = new THREE.SpotLight(0xdfe8ff, SPOT_INTENSITY, 90, Math.PI / 7, 0.5, 1.4);
      spot.position.set(x + offsetX, y, z);
      spot.target.position.set(x * 0.3 + offsetX, 0, z);
      scene.add(spot, spot.target);
      return spot;
    });

    // Widen the shadow frustum so both courts still cast shadows.
    keyLight.shadow.camera.left = -35;
    keyLight.shadow.camera.right = offsetX + 35;
    keyLight.shadow.camera.updateProjectionMatrix();
  }

  function setHighContrast(enabled) {
    scene.fog = enabled ? null : new THREE.Fog(0x0a0a0f, FOG_NEAR, FOG_FAR);
    hemiLight.intensity = enabled ? 0.85 : 0.6;
    keyLight.intensity = enabled ? 1.8 : 1.4;
  }

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  return { scene, camera, renderer, controls, spotLights, setHighContrast, setDragMode, setWideView, setSecondCourtLights };
}
