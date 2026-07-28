import * as THREE from 'three';

const DEFAULT_PRESET = 'broadcast';

const STATIC_PRESETS = {
  broadcast: { position: [-14, 32, -28], target: [0, 0, 20], label: 'Broadcast' },
  topDown: { position: [0, 85, 23.5], target: [0, 0, 23.5], label: 'Top-Down' },
  coach: { position: [34, 30, 40], target: [0, 0, 20], label: 'Coach' },
  aboveRim: { position: [0, 18, 5.25], target: [0, 0.5, 5.25], label: 'Above Rim' },
  courtside: { position: [27, 4, 10], target: [0, 3, 10], label: 'Courtside' },
  splitOverview: { position: [31, 95, -65], target: [31, 0, 23.5], label: 'Split Overview' },
};

export const PRESET_LIST = [
  ...Object.keys(STATIC_PRESETS),
  'shooterPOV',
  'defenderPOV',
];

export function getPreset(name, { selectedShot } = {}) {
  if (name === 'shooterPOV') {
    if (selectedShot) {
      return { position: [selectedShot.x, 6.2, selectedShot.z], target: [0, 10, 5.25], label: 'Shooter POV' };
    }
    return { position: [0, 6.2, 19], target: [0, 10, 5.25], label: 'Shooter POV' };
  }
  if (name === 'defenderPOV') {
    if (selectedShot) {
      return { position: [0, 9.5, 5.25], target: [selectedShot.x, 6, selectedShot.z], label: 'Defender POV' };
    }
    return { position: [0, 9.5, 5.25], target: [0, 6.2, 19], label: 'Defender POV' };
  }
  return STATIC_PRESETS[name] ?? STATIC_PRESETS[DEFAULT_PRESET];
}

export function createCameraDirector(camera, controls, { reduceMotion } = {}) {
  let tweening = false;
  let tourTimer = null;

  function snap({ position, target }) {
    camera.position.set(...position);
    controls.target.set(...target);
    controls.update();
  }

  function goTo(preset, { duration = 900 } = {}) {
    cancelTour();
    if (reduceMotion() || duration === 0) {
      snap(preset);
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      tweening = true;
      controls.enabled = false;
      const startPos = camera.position.clone();
      const startTarget = controls.target.clone();
      const endPos = new THREE.Vector3(...preset.position);
      const endTarget = new THREE.Vector3(...preset.target);
      const t0 = performance.now();

      function step(now) {
        const t = Math.min((now - t0) / duration, 1);
        const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        camera.position.lerpVectors(startPos, endPos, eased);
        controls.target.lerpVectors(startTarget, endTarget, eased);
        controls.update();
        if (t < 1) {
          requestAnimationFrame(step);
        } else {
          tweening = false;
          controls.enabled = true;
          resolve();
        }
      }
      requestAnimationFrame(step);
    });
  }

  async function runTour(names, { pause = 1400, onStep } = {}) {
    for (const name of names) {
      onStep?.(name);
      await goTo(getPreset(name));
      await new Promise((resolve) => {
        tourTimer = setTimeout(resolve, pause);
      });
    }
    tourTimer = null;
  }

  function cancelTour() {
    if (tourTimer) {
      clearTimeout(tourTimer);
      tourTimer = null;
    }
  }

  function setAxisLock(mode) {
    if (mode === 'x') {
      // Lock vertical: freeze polar angle, allow azimuth (orbit left/right only).
      controls.minPolarAngle = controls.getPolarAngle();
      controls.maxPolarAngle = controls.getPolarAngle();
      controls.minAzimuthAngle = -Infinity;
      controls.maxAzimuthAngle = Infinity;
    } else if (mode === 'y') {
      // Lock horizontal: freeze azimuth, allow polar (orbit up/down only).
      controls.minAzimuthAngle = controls.getAzimuthalAngle();
      controls.maxAzimuthAngle = controls.getAzimuthalAngle();
      controls.minPolarAngle = 0;
      controls.maxPolarAngle = Math.PI / 2 - 0.02;
    } else {
      controls.minPolarAngle = 0;
      controls.maxPolarAngle = Math.PI / 2 - 0.02;
      controls.minAzimuthAngle = -Infinity;
      controls.maxAzimuthAngle = Infinity;
    }
  }

  function setAutoOrbit(enabled) {
    controls.autoRotate = enabled;
    controls.autoRotateSpeed = 0.6;
  }

  return { goTo, snap, runTour, cancelTour, setAxisLock, setAutoOrbit, get tweening() { return tweening; } };
}
