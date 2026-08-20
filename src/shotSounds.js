// Short synthesized sounds for shot clicks — a net swish for makes, a rim
// clank for misses, with a heavier thump for dunks. Everything is generated
// with WebAudio, so there are no audio files to license or ship.
//
// Browsers block audio until the user interacts; these only ever fire from a
// click, so the context is created lazily on that first click.
export function createShotSounds() {
  let ctx = null;
  let master = null;
  let enabled = true;

  function ensure() {
    if (ctx) return ctx;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = 0.35;
    master.connect(ctx.destination);
    return ctx;
  }

  // Filtered noise burst — the body of both the swish and the net snap.
  function noise(duration, { type = 'bandpass', freq = 1200, q = 1, gain = 0.5, sweepTo = null } = {}) {
    const n = Math.floor(ctx.sampleRate * duration);
    const buf = ctx.createBuffer(1, n, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < n; i++) {
      // Fade the tail so bursts don't click when they end.
      data[i] = (Math.random() * 2 - 1) * (1 - i / n);
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;

    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.setValueAtTime(freq, ctx.currentTime);
    if (sweepTo) filter.frequency.exponentialRampToValueAtTime(sweepTo, ctx.currentTime + duration);
    filter.Q.value = q;

    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

    src.connect(filter).connect(g).connect(master);
    src.start();
    src.stop(ctx.currentTime + duration);
  }

  // Struck-metal ping for the rim.
  function tone(freq, duration, { gain = 0.25, type = 'triangle', detune = 0 } = {}) {
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    osc.detune.value = detune;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    osc.connect(g).connect(master);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  }

  // Low thud for a dunk landing.
  function thump() {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(45, ctx.currentTime + 0.28);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.55, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.32);
    osc.connect(g).connect(master);
    osc.start();
    osc.stop(ctx.currentTime + 0.33);
  }

  // `bucket` is the action bucket (dunk / layup / hook / floater / fadeaway / jumper).
  function play(made, bucket) {
    if (!enabled) return;
    try {
      ensure();
      if (ctx.state === 'suspended') ctx.resume();

      if (made && bucket === 'dunk') {
        thump();                                                   // rim shake
        noise(0.22, { freq: 2600, sweepTo: 700, q: 0.7, gain: 0.6 }); // net snap
      } else if (made) {
        // Swish: bright noise sweeping down as the ball passes through.
        noise(0.26, { freq: 4200, sweepTo: 900, q: 0.8, gain: 0.45 });
      } else {
        // Miss: rim clank, two detuned partials, plus a short rattle.
        tone(340, 0.20, { gain: 0.22 });
        tone(510, 0.16, { gain: 0.14, detune: 12 });
        noise(0.12, { type: 'highpass', freq: 1800, gain: 0.22 });
      }
    } catch {
      // Audio is a nicety — never let it break the click handler.
    }
  }

  function setEnabled(on) {
    enabled = on;
  }

  return { play, setEnabled };
}
