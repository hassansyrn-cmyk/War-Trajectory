// Minimal synthesized SFX using the Web Audio API — no binary asset files required.

let ctx: AudioContext | null = null;
let unlocked = false;
let muted = false;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor = window.AudioContext || (window as any).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  return ctx;
}

export function unlockAudio() {
  const c = getCtx();
  if (!c) return;
  if (c.state === "suspended") c.resume();
  unlocked = true;
}

export function setMuted(v: boolean) {
  muted = v;
}

export function isMuted() {
  return muted;
}

function tone(freq: number, duration: number, type: OscillatorType, gainValue: number, delay = 0) {
  const c = getCtx();
  if (!c || muted || !unlocked) return;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.value = 0;
  osc.connect(gain);
  gain.connect(c.destination);
  const t0 = c.currentTime + delay;
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(gainValue, t0 + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
  osc.start(t0);
  osc.stop(t0 + duration + 0.02);
}

export function sfxDraw() {
  tone(320, 0.08, "sine", 0.05);
}

export function sfxFire(weightDrag: number) {
  tone(180 + weightDrag * 120, 0.16, "sawtooth", 0.08);
}

export function sfxImpact() {
  tone(90, 0.25, "square", 0.09);
  tone(60, 0.3, "sine", 0.07, 0.03);
}

export function sfxExplosion() {
  tone(70, 0.4, "sawtooth", 0.11);
  tone(40, 0.5, "square", 0.09, 0.04);
}

export function sfxHit() {
  tone(520, 0.12, "triangle", 0.08);
}

export function sfxHeadshot() {
  tone(880, 0.14, "triangle", 0.1);
  tone(1200, 0.1, "sine", 0.08, 0.05);
}

export function sfxSkill() {
  tone(660, 0.12, "sine", 0.08);
  tone(880, 0.12, "sine", 0.07, 0.07);
}

export function sfxTurn() {
  tone(440, 0.09, "sine", 0.05);
}

export function sfxWin() {
  [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.2, "sine", 0.09, i * 0.11));
}

export function sfxLose() {
  [400, 340, 260].forEach((f, i) => tone(f, 0.28, "sawtooth", 0.08, i * 0.13));
}
