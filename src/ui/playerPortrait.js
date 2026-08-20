// Portrait alternative to the 3D figure: one consistent frame, background and
// crop for every player, so the card looks uniform whichever player is shown.
//
// A real photo is used when one exists at public/portraits/<slug>.(jpg|png|webp).
// None ship with the app — NBA headshots are copyrighted, so they are opt-in:
// drop in images you have the rights to and they appear automatically.
// Without a photo we draw a styled silhouette in the player's team colours.

const PORTRAIT_W = 170;
const PORTRAIT_H = 210;

export function playerSlug(name) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function shade(hex, amount) {
  const n = parseInt((hex || '#888888').slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255]
    .map((c) => Math.max(0, Math.min(255, Math.round(c + (amount > 0 ? (255 - c) * amount : c * amount)))));
  return `rgb(${ch[0]}, ${ch[1]}, ${ch[2]})`;
}

// Everything shares this frame so portraits sit uniformly in the card.
function drawFrame(ctx, teamColor) {
  const grad = ctx.createLinearGradient(0, 0, 0, PORTRAIT_H);
  grad.addColorStop(0, shade(teamColor, -0.25));
  grad.addColorStop(0.55, shade(teamColor, -0.62));
  grad.addColorStop(1, '#0d0f15');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, PORTRAIT_W, PORTRAIT_H);

  // Soft spotlight behind the subject.
  const spot = ctx.createRadialGradient(PORTRAIT_W / 2, PORTRAIT_H * 0.42, 8, PORTRAIT_W / 2, PORTRAIT_H * 0.42, PORTRAIT_W * 0.72);
  spot.addColorStop(0, 'rgba(255,255,255,0.16)');
  spot.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = spot;
  ctx.fillRect(0, 0, PORTRAIT_W, PORTRAIT_H);
}

function drawNumber(ctx, number, teamColor) {
  if (!number) return;
  ctx.save();
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = shade(teamColor, 0.65);
  ctx.font = 'bold 108px -apple-system, Helvetica, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(number, PORTRAIT_W / 2, PORTRAIT_H * 0.46);
  ctx.restore();
}

// Head-and-shoulders silhouette, used when no photo is supplied.
function drawSilhouette(ctx, teamColor) {
  const cx = PORTRAIT_W / 2;
  ctx.fillStyle = shade(teamColor, -0.72);

  ctx.beginPath();                                   // shoulders / bust
  ctx.moveTo(cx - 62, PORTRAIT_H);
  ctx.quadraticCurveTo(cx - 58, PORTRAIT_H * 0.63, cx - 26, PORTRAIT_H * 0.56);
  ctx.lineTo(cx + 26, PORTRAIT_H * 0.56);
  ctx.quadraticCurveTo(cx + 58, PORTRAIT_H * 0.63, cx + 62, PORTRAIT_H);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();                                   // head
  ctx.ellipse(cx, PORTRAIT_H * 0.40, 27, 32, 0, 0, Math.PI * 2);
  ctx.fill();

  // Jersey flash across the chest in the team colour.
  ctx.fillStyle = shade(teamColor, 0.05);
  ctx.beginPath();
  ctx.moveTo(cx - 30, PORTRAIT_H * 0.60);
  ctx.lineTo(cx + 30, PORTRAIT_H * 0.60);
  ctx.lineTo(cx + 34, PORTRAIT_H);
  ctx.lineTo(cx - 34, PORTRAIT_H);
  ctx.closePath();
  ctx.fill();
}

// Cover-fit a photo into the frame so every portrait crops identically.
function drawPhoto(ctx, img) {
  const scale = Math.max(PORTRAIT_W / img.width, PORTRAIT_H / img.height);
  const w = img.width * scale;
  const h = img.height * scale;
  ctx.drawImage(img, (PORTRAIT_W - w) / 2, (PORTRAIT_H - h) * 0.12, w, h);

  // Fade the bottom into the frame so photos and silhouettes end the same way.
  const fade = ctx.createLinearGradient(0, PORTRAIT_H * 0.62, 0, PORTRAIT_H);
  fade.addColorStop(0, 'rgba(13,15,21,0)');
  fade.addColorStop(1, 'rgba(13,15,21,0.92)');
  ctx.fillStyle = fade;
  ctx.fillRect(0, PORTRAIT_H * 0.62, PORTRAIT_W, PORTRAIT_H * 0.38);
}

export function createPlayerPortrait(parent) {
  const canvas = document.createElement('canvas');
  canvas.className = 'player-portrait';
  const dpr = Math.min(window.devicePixelRatio, 2);
  canvas.width = PORTRAIT_W * dpr;
  canvas.height = PORTRAIT_H * dpr;
  canvas.style.width = `${PORTRAIT_W}px`;
  canvas.style.height = `${PORTRAIT_H}px`;
  parent.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  let token = 0;

  function render({ name, teamColor, number }) {
    const mine = ++token;
    ctx.clearRect(0, 0, PORTRAIT_W, PORTRAIT_H);
    drawFrame(ctx, teamColor);
    drawNumber(ctx, number, teamColor);
    drawSilhouette(ctx, teamColor);

    // Swap in a real photo if the user has supplied one.
    const base = import.meta.env.BASE_URL;
    const slug = playerSlug(name);
    (async () => {
      for (const ext of ['jpg', 'png', 'webp']) {
        const url = `${base}portraits/${slug}.${ext}`;
        try {
          const head = await fetch(url, { method: 'HEAD' });
          if (!head.ok) continue;
          if ((head.headers.get('content-type') ?? '').includes('text/html')) continue;
          const img = new Image();
          img.src = url;
          await img.decode();
          if (mine !== token) return; // player changed while loading
          ctx.clearRect(0, 0, PORTRAIT_W, PORTRAIT_H);
          drawFrame(ctx, teamColor);
          drawPhoto(ctx, img);
          return;
        } catch {
          // keep the generated portrait
        }
      }
    })();
  }

  function setVisible(v) {
    canvas.classList.toggle('hidden', !v);
  }

  return { render, setVisible, el: canvas };
}
