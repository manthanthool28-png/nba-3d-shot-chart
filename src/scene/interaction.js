import * as THREE from 'three';
import { periodLabel } from '../data/stats.js';

const DIM_FACTOR = 0.18;

// Hover/select for shot markers. Holds up to two fields so split-compare mode
// stays interactive on BOTH courts: index 0 is the primary player, index 1 is
// the compared player's offset court. Selections are keyed "fieldIndex:shotId".
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

  // fields[i] = { mesh, shots, baseColors, tops, label }
  const fields = [null, null];
  let hovered = null; // { fi, id }
  const selected = new Set(); // "fi:id"

  const key = (fi, id) => `${fi}:${id}`;
  const parseKey = (k) => {
    const [fi, id] = k.split(':').map(Number);
    return { fi, id };
  };

  const listeners = { select: [], hover: [], burst: [] };
  function on(event, fn) {
    listeners[event].push(fn);
  }
  function emit(event, payload) {
    listeners[event].forEach((fn) => fn(payload));
  }

  function applyDim() {
    const color = new THREE.Color();
    const dimming = selected.size > 0;
    fields.forEach((f, fi) => {
      if (!f) return;
      f.baseColors.forEach((base, i) => {
        if (!dimming || selected.has(key(fi, i))) {
          f.mesh.setColorAt(i, base);
        } else {
          color.copy(base).multiplyScalar(DIM_FACTOR);
          f.mesh.setColorAt(i, color);
        }
      });
      f.mesh.instanceColor.needsUpdate = true;
    });
  }

  function refreshSelectionRings() {
    selectRings.clear();
    selected.forEach((k) => {
      const { fi, id } = parseKey(k);
      const top = fields[fi]?.tops[id];
      if (!top) return;
      const ring = new THREE.Mesh(ringGeometry, selectMaterial);
      ring.position.set(top.x, top.y + 0.05, top.z);
      selectRings.add(ring);
    });
  }

  function selectedShots() {
    return [...selected].map((k) => {
      const { fi, id } = parseKey(k);
      const shot = fields[fi]?.shots[id];
      // Tag with the court's label so the sidebar can say whose shot it is.
      return shot ? { ...shot, sourceLabel: fields[fi].label, sourceOffsetX: fields[fi].offsetX ?? 0 } : null;
    }).filter(Boolean);
  }

  function setField(newField) {
    fields[0] = newField ? { ...newField, label: newField.label ?? null } : null;
    selected.clear();
    hovered = null;
    hoverRing.visible = false;
    refreshSelectionRings();
    emit('select', []);
  }

  // Second court in split-compare mode; pass null to clear it.
  function setCompareField(newField) {
    fields[1] = newField ? { ...newField, label: newField.label ?? null } : null;
    // Drop any selection that pointed into the old compare field.
    [...selected].forEach((k) => {
      if (parseKey(k).fi === 1) selected.delete(k);
    });
    if (hovered?.fi === 1) {
      hovered = null;
      hoverRing.visible = false;
    }
    refreshSelectionRings();
  }

  // Raycast every live field; return the nearest hit across both courts.
  function pointerToHit(clientX, clientY) {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);

    let best = null;
    fields.forEach((f, fi) => {
      if (!f) return;
      const hits = raycaster.intersectObject(f.mesh);
      if (hits.length && (!best || hits[0].distance < best.distance)) {
        best = { fi, id: hits[0].instanceId, distance: hits[0].distance };
      }
    });
    return best;
  }

  function onPointerMove(event) {
    const hit = pointerToHit(event.clientX, event.clientY);
    const same = hit && hovered && hit.fi === hovered.fi && hit.id === hovered.id;
    if (same) {
      tooltipEl.style.left = `${event.clientX}px`;
      tooltipEl.style.top = `${event.clientY}px`;
      return;
    }
    hovered = hit ? { fi: hit.fi, id: hit.id } : null;

    if (!hovered) {
      hoverRing.visible = false;
      tooltipEl.classList.add('hidden');
      emit('hover', null);
      return;
    }

    const f = fields[hovered.fi];
    const top = f.tops[hovered.id];
    hoverRing.position.set(top.x, top.y + 0.05, top.z);
    hoverRing.visible = true;

    const shot = f.shots[hovered.id];
    tooltipEl.classList.remove('hidden');
    tooltipEl.style.left = `${event.clientX}px`;
    tooltipEl.style.top = `${event.clientY}px`;
    tooltipEl.innerHTML = tooltipHtml(shot, f.label);
    emit('hover', shot);
  }

  function onClick(event) {
    const hit = pointerToHit(event.clientX, event.clientY);
    const additive = event.ctrlKey || event.metaKey;

    if (hit) {
      const f = fields[hit.fi];
      if (f.shots[hit.id].made && !additive) emit('burst', f.tops[hit.id]);
    }

    if (!hit) {
      selected.clear();
    } else {
      const k = key(hit.fi, hit.id);
      if (additive) {
        if (selected.has(k)) selected.delete(k);
        else selected.add(k);
      } else {
        selected.clear();
        selected.add(k);
      }
    }
    applyDim();
    refreshSelectionRings();
    emit('select', selectedShots());
  }

  function clearSelection() {
    selected.clear();
    applyDim();
    refreshSelectionRings();
    emit('select', []);
  }

  // Selects by index into the PRIMARY field (used by the pinned-shot tray).
  function selectShotById(id) {
    if (id == null || id < 0 || !fields[0]?.shots[id]) return;
    selected.clear();
    selected.add(key(0, id));
    applyDim();
    refreshSelectionRings();
    emit('select', selectedShots());
  }

  function onPointerLeave() {
    hovered = null;
    hoverRing.visible = false;
    tooltipEl.classList.add('hidden');
  }

  renderer.domElement.addEventListener('pointermove', onPointerMove);
  renderer.domElement.addEventListener('pointerleave', onPointerLeave);
  renderer.domElement.addEventListener('click', onClick);

  return { setField, setCompareField, on, clearSelection, selectShotById, get selectedIds() { return selected; } };
}

function tooltipHtml(shot, label) {
  const clock = `${shot.minutesRemaining}:${String(shot.secondsRemaining).padStart(2, '0')}`;
  return `
    ${label ? `<strong style="color:#9fb8ff">${label}</strong><br/>` : ''}
    <strong>${shot.made ? 'Made' : 'Missed'}</strong> · ${shot.zone}<br/>
    ${shot.distanceFt} ft · ${shot.actionType}<br/>
    ${periodLabel(shot.period)} ${clock} · vs ${shot.opponent}${shot.isHome ? '' : ' (away)'}
  `;
}
