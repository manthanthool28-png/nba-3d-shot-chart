import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export function createScene(container) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0a0f);
  scene.fog = new THREE.Fog(0x0a0a0f, 60, 140);

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
  container.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.target.set(0, 0, 20);
  controls.minDistance = 15;
  controls.maxDistance = 150;
  controls.maxPolarAngle = Math.PI / 2 - 0.02;
  controls.update();

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
  const spotPositions = [
    [-14, 38, 10],
    [14, 38, 10],
    [0, 42, 26],
  ];
  const spotLights = spotPositions.map(([x, y, z]) => {
    const spot = new THREE.SpotLight(0xdfe8ff, 220, 90, Math.PI / 7, 0.5, 1.4);
    spot.position.set(x, y, z);
    spot.target.position.set(x * 0.3, 0, z);
    scene.add(spot, spot.target);
    return spot;
  });

  function setHighContrast(enabled) {
    scene.fog = enabled ? null : new THREE.Fog(0x0a0a0f, 60, 140);
    hemiLight.intensity = enabled ? 0.85 : 0.6;
    keyLight.intensity = enabled ? 1.8 : 1.4;
  }

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  return { scene, camera, renderer, controls, spotLights, setHighContrast };
}
