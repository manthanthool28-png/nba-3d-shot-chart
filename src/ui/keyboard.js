import * as THREE from 'three';

const ROTATE_STEP = 0.06;
const ZOOM_FACTOR = 0.92;

export function initKeyboardNav({ camera, controls, onReset, onEscape, onToggleHelp }) {
  function rotate(deltaTheta, deltaPhi) {
    const offset = camera.position.clone().sub(controls.target);
    const spherical = new THREE.Spherical().setFromVector3(offset);
    spherical.theta += deltaTheta;
    spherical.phi = THREE.MathUtils.clamp(spherical.phi + deltaPhi, 0.05, controls.maxPolarAngle);
    offset.setFromSpherical(spherical);
    camera.position.copy(controls.target).add(offset);
    controls.update();
  }

  function zoom(factor) {
    const offset = camera.position.clone().sub(controls.target);
    const dist = THREE.MathUtils.clamp(offset.length() * factor, controls.minDistance, controls.maxDistance);
    offset.setLength(dist);
    camera.position.copy(controls.target).add(offset);
    controls.update();
  }

  function onKeyDown(event) {
    const tag = document.activeElement?.tagName;
    const inFormField = tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA';

    if (event.key === '?' && !inFormField) {
      onToggleHelp();
      return;
    }
    if (event.key === 'Escape') {
      onEscape();
      return;
    }
    if (inFormField) return; // let arrow keys work normally inside selects/sliders

    switch (event.key) {
      case 'ArrowLeft': rotate(-ROTATE_STEP, 0); event.preventDefault(); break;
      case 'ArrowRight': rotate(ROTATE_STEP, 0); event.preventDefault(); break;
      case 'ArrowUp': rotate(0, -ROTATE_STEP); event.preventDefault(); break;
      case 'ArrowDown': rotate(0, ROTATE_STEP); event.preventDefault(); break;
      case '+':
      case '=': zoom(ZOOM_FACTOR); event.preventDefault(); break;
      case '-': zoom(1 / ZOOM_FACTOR); event.preventDefault(); break;
      case 'r':
      case 'R': onReset(); break;
      default: break;
    }
  }

  window.addEventListener('keydown', onKeyDown);
  return () => window.removeEventListener('keydown', onKeyDown);
}
