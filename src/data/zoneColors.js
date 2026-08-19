// One dedicated colour per court zone, used everywhere the zone appears:
// filter buttons, stat chips, overlay bars and every 2D chart. Keeping a
// single source of truth means "3PT is orange" holds across the whole app.
//
// Chosen for colour-vision safety on the dark theme — every pair stays
// separable under deuteranopia and tritanopia (worst pair ~90 vs ~30 for the
// previous blue/teal pairing), and all three clear 6.4:1 contrast on panels.
export const ZONE_COLORS = {
  paint: '#4f9bf0', // blue
  mid: '#c58bf0',   // purple
  three: '#f0a44f', // orange
};

// Same hues, darkened for use as a filled bar on a light-ink background.
export const ZONE_INK = {
  paint: '#0a1420',
  mid: '#160a20',
  three: '#201404',
};
