import * as THREE from 'three';
import { periodLabel } from '../data/stats.js';

const DIM_FACTOR = 0.18;

export function createShotInteraction({ scene, camera, renderer, tooltipEl }) {
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

  const ringGeometry = new THREE.RingGeometry(0.32, 0.42, 24);
  ringGeometry.rotateX(-Math.PI / 2);
  const hoverRing = new THREE.Mesh(ringGeometry, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false }));
  hoverRing.visible = false;
  scene.add(hoverRing);

  const selectMaterial = new THREE.MeshBasicMaterial({ color: 0xffd166, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false });
  const selectRings = new THREE.Group();
  scene.add(selectRings);

  let field = null; // current { mesh, shots, baseColors, tops }
  let hoveredId = -1;
  const selectedIds = new Set();

  const listeners = { select: [], hover: [], burst: [] };
  function on(event, fn) {
    listeners[event].push(fn);
  }
  function emit(event, payload) {
    listeners[event].forEach((fn) => fn(payload));
  }

  function applyDim() {
    if (!field) return;
    const { mesh, baseColors } = field;
    const color = new THREE.Color();
    const dimming = selectedIds.size > 0;
    baseColors.forEach((base, i) => {
      if (!dimming || selectedIds.has(i)) {
        mesh.setColorAt(i, base);
      } else {
        color.copy(base).multiplyScalar(DIM_FACTOR);
        mesh.setColorAt(i, color);
      }
    });
    mesh.instanceColor.needsUpdate = true;
  }

  function refreshSelectionRings() {
    selectRings.clear();
    if (!field) return;
    selectedIds.forEach((id) => {
      const top = field.tops[id];
      if (!top) return;
      const ring = new THREE.Mesh(ringGeometry, selectMaterial);
      ring.position.set(top.x, top.y + 0.05, top.z);
      selectRings.add(ring);
    });
  }

  function setField(newField) {
    field = newField;
    selectedIds.clear();
    hoveredId = -1;
    hoverRing.visible = false;
    refreshSelectionRings();
    emit('select', []);
  }

  function pointerToShotId(clientX, clientY) {
    if (!field) return -1;
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObject(field.mesh);
    return hits.length > 0 ? hits[0].instanceId : -1;
  }

  function onPointerMove(event) {
    const id = pointerToShotId(event.clientX, event.clientY);
    if (id === hoveredId) {
      if (id !== -1) {
        tooltipEl.style.left = `${event.clientX}px`;
        tooltipEl.style.top = `${event.clientY}px`;
      }
      return;
    }
    hoveredId = id;

    if (id === -1) {
      hoverRing.visible = false;
      tooltipEl.classList.add('hidden');
      emit('hover', null);
      return;
    }

    const top = field.tops[id];
    hoverRing.position.set(top.x, top.y + 0.05, top.z);
    hoverRing.visible = true;

    const shot = field.shots[id];
    tooltipEl.classList.remove('hidden');
    tooltipEl.style.left = `${event.clientX}px`;
    tooltipEl.style.top = `${event.clientY}px`;
    tooltipEl.innerHTML = tooltipHtml(shot);
    emit('hover', shot);
  }

  function onClick(event) {
    const id = pointerToShotId(event.clientX, event.clientY);
    if (id !== -1 && field.shots[id].made && !(event.ctrlKey || event.metaKey)) {
      emit('burst', field.tops[id]);
    }
    if (id === -1) {
      selectedIds.clear();
    } else if (event.ctrlKey || event.metaKey) {
      if (selectedIds.has(id)) selectedIds.delete(id);
      else selectedIds.add(id);
    } else {
      selectedIds.clear();
      selectedIds.add(id);
    }
    applyDim();
    refreshSelectionRings();
    emit('select', [...selectedIds].map((i) => field.shots[i]));
  }

  function clearSelection() {
    selectedIds.clear();
    applyDim();
    refreshSelectionRings();
    emit('select', []);
  }

  function selectShotById(id) {
    if (id == null || id < 0 || !field || !field.shots[id]) return;
    selectedIds.clear();
    selectedIds.add(id);
    applyDim();
    refreshSelectionRings();
    emit('select', [...selectedIds].map((i) => field.shots[i]));
  }

  function onPointerLeave() {
    hoveredId = -1;
    hoverRing.visible = false;
    tooltipEl.classList.add('hidden');
  }

  renderer.domElement.addEventListener('pointermove', onPointerMove);
  renderer.domElement.addEventListener('pointerleave', onPointerLeave);
  renderer.domElement.addEventListener('click', onClick);

  return { setField, on, clearSelection, selectShotById, get selectedIds() { return selectedIds; } };
}

function tooltipHtml(shot) {
  const clock = `${shot.minutesRemaining}:${String(shot.secondsRemaining).padStart(2, '0')}`;
  return `
    <strong>${shot.made ? 'Made' : 'Missed'}</strong> · ${shot.zone}<br/>
    ${shot.distanceFt} ft · ${shot.actionType}<br/>
    ${periodLabel(shot.period)} ${clock} · vs ${shot.opponent}${shot.isHome ? '' : ' (away)'}
  `;
}
