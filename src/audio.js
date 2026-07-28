// Synthesized crowd-murmur bed (filtered noise), so there's no licensed
// audio file to source. Off by default; the settings toggle turns it on.
export function createCrowdAudio() {
  let ctx = null;
  let source = null;
  let gain = null;

  function ensureGraph() {
    if (ctx) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)();

    const bufferSize = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.6;

    source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 400;
    filter.Q.value = 0.6;

    gain = ctx.createGain();
    gain.gain.value = 0;

    source.connect(filter).connect(gain).connect(ctx.destination);
    source.start();
  }

  function setEnabled(enabled) {
    ensureGraph();
    if (ctx.state === 'suspended') ctx.resume();
    gain.gain.linearRampToValueAtTime(enabled ? 0.05 : 0, ctx.currentTime + 0.4);
  }

  return { setEnabled };
}
