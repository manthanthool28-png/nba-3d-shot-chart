import * as THREE from 'three';

export function createShotLabels(container) {
  const elements = [];

  function setSamples(samples) {
    elements.forEach((el) => el.remove());
    elements.length = 0;
    for (const sample of samples) {
      const el = document.createElement('div');
      el.className = 'shot-label';
      el.textContent = sample.text;
      container.appendChild(el);
      elements.push(el);
    }
    elements._samples = samples;
  }

  function clear() {
    setSamples([]);
  }

  function update(camera, renderer) {
    const samples = elements._samples;
    if (!samples) return;
    const rect = renderer.domElement.getBoundingClientRect();
    const projected = new THREE.Vector3();
    samples.forEach((sample, i) => {
      projected.copy(sample.position).project(camera);
      const x = (projected.x * 0.5 + 0.5) * rect.width;
      const y = (-projected.y * 0.5 + 0.5) * rect.height;
      const behind = projected.z > 1;
      elements[i].style.left = `${x}px`;
      elements[i].style.top = `${y}px`;
      elements[i].style.display = behind ? 'none' : 'block';
    });
  }

  return { setSamples, clear, update };
}
