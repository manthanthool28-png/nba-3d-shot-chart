// One dedicated colour per court zone, used everywhere the zone appears:
// filter buttons, stat chips, overlay bars and every 2D chart. Keeping a
// single source of truth means "3PT is orange" holds across the whole app.
//
// Checked for colour-vision safety on the dark theme: the closest pair
// (Mid-Range vs Paint) stays ~41 apart under deuteranopia/protanopia/
// tritanopia — well clear of the ~8 a teal Mid-Range scored against the
// made-green — and each colour clears 6.4:1 contrast on the panels.
export const ZONE_COLORS = {
  paint: '#4f9bf0', // blue
  mid: '#5ce1e6',   // cyan
  three: '#f0a44f', // orange
};

// Same hues, darkened for use as a filled bar on a light-ink background.
export const ZONE_INK = {
  paint: '#0a1420',
  mid: '#04191b',
  three: '#201404',
};
