import * as THREE from 'three';

const PARTICLES_PER_BURST = 18;
const LIFETIME = 0.7;

export function createParticleSystem(scene) {
  const geometry = new THREE.BufferGeometry();
  const maxParticles = PARTICLES_PER_BURST * 6;
  const positions = new Float32Array(maxParticles * 3);
  const velocities = new Float32Array(maxParticles * 3);
  const ages = new Float32Array(maxParticles).fill(Infinity);
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const material = new THREE.PointsMaterial({ color: 0xffd166, size: 0.14, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  scene.add(points);

  let cursor = 0;

  function spawnBurst(position) {
    for (let i = 0; i < PARTICLES_PER_BURST; i++) {
      const idx = cursor;
      cursor = (cursor + 1) % maxParticles;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const speed = 1.5 + Math.random() * 2;
      velocities[idx * 3] = Math.sin(phi) * Math.cos(theta) * speed;
      velocities[idx * 3 + 1] = Math.abs(Math.cos(phi)) * speed;
      velocities[idx * 3 + 2] = Math.sin(phi) * Math.sin(theta) * speed;
      positions[idx * 3] = position.x;
      positions[idx * 3 + 1] = position.y;
      positions[idx * 3 + 2] = position.z;
      ages[idx] = 0;
    }
  }

  function update(dt) {
    let anyAlive = false;
    for (let i = 0; i < maxParticles; i++) {
      if (ages[i] > LIFETIME) continue;
      ages[i] += dt;
      anyAlive = true;
      positions[i * 3] += velocities[i * 3] * dt;
      positions[i * 3 + 1] += (velocities[i * 3 + 1] - 4 * ages[i]) * dt;
      positions[i * 3 + 2] += velocities[i * 3 + 2] * dt;
    }
    if (anyAlive) geometry.attributes.position.needsUpdate = true;
  }

  return { spawnBurst, update };
}
