import * as THREE from 'three';
import { periodLabel } from '../data/stats.js';

const PALETTES = {
  default: { made: 0x35d48a, missed: 0xff5470 },
  // Blue/orange — colorblind-safe (deuteranopia/protanopia) substitute for
  // the default red/green make/miss pairing.
  colorblind: { made: 0x2b83ba, missed: 0xfdae61 },
  // Used for the second dataset in comparison-overlay mode, so it reads as
  // visually distinct from the primary outcome palette.
  compare: { made: 0xffa64d, missed: 0x4d79ff },
};

const TYPE_COLORS = { '2PT Field Goal': 0x35b6d4, '3PT Field Goal': 0xb083f0 };

const QUARTER_COLORS = { 1: 0x4f9dde, 2: 0x4fde8f, 3: 0xdec44f, 4: 0xde4f4f, 5: 0xb84fde };

export const LEGEND_ENTRIES = {
  outcome: (palette) => [
    { label: 'Made', color: PALETTES[palette].made },
    { label: 'Missed', color: PALETTES[palette].missed },
  ],
  type: () => [
    { label: '2PT', color: TYPE_COLORS['2PT Field Goal'] },
    { label: '3PT', color: TYPE_COLORS['3PT Field Goal'] },
  ],
  quarter: () => [
    { label: 'Q1', color: QUARTER_COLORS[1] },
    { label: 'Q2', color: QUARTER_COLORS[2] },
    { label: 'Q3', color: QUARTER_COLORS[3] },
    { label: 'Q4', color: QUARTER_COLORS[4] },
    { label: 'OT', color: QUARTER_COLORS[5] },
  ],
  team: (palette, teamColor) => [
    { label: 'Made', color: teamColor ?? 0x999999 },
    { label: 'Missed', color: 0x3a3f4c },
  ],
};

export function shotColor(shot, { colorMode, palette, teamColor }, target = new THREE.Color()) {
  switch (colorMode) {
    case 'type':
      return target.set(TYPE_COLORS[shot.shotType] ?? 0xffffff);
    case 'quarter':
      return target.set(QUARTER_COLORS[Math.min(shot.period, 5)] ?? 0xffffff);
    case 'team':
      return target.set(shot.made ? (teamColor ?? 0x999999) : 0x3a3f4c);
    case 'outcome':
    default:
      return target.set(shot.made ? PALETTES[palette].made : PALETTES[palette].missed);
  }
}

export function legendFor(colorMode, palette, teamColor) {
  return LEGEND_ENTRIES[colorMode](palette, teamColor);
}

export function quarterLegendLabel(period) {
  return periodLabel(period);
}
