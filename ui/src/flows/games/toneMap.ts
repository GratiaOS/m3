let ctx: AudioContext | null = null;
let master: GainNode | null = null;

const VOL_KEY = 'garden.weave.volume';
const readVolume = () => {
  if (typeof localStorage === 'undefined') return 0.15;
  const stored = Number(localStorage.getItem(VOL_KEY));
  return Number.isFinite(stored) ? stored : 0.15;
};
let volume = readVolume();

export function setWeaveVolume(v: number) {
  volume = Math.max(0, Math.min(1, v));
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(VOL_KEY, String(volume));
  }
  if (master) master.gain.value = volume;
}

export function getWeaveVolume() {
  return volume;
}

export async function ensureAudio() {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = volume;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') {
    await ctx.resume();
  }
  return ctx;
}

export async function suspendAudio() {
  if (typeof window === 'undefined') return;
  if (ctx && ctx.state === 'running') {
    await ctx.suspend();
  }
}

const SCALE = [220, 247, 294, 330, 392, 440];
const hueToFreq = (hue: number) => {
  const idx = Math.round(((hue % 360) / 360) * (SCALE.length - 1));
  return SCALE[Math.max(0, Math.min(SCALE.length - 1, idx))];
};

type ToneKind = 'hum' | 'breathe' | 'echo' | 'silence';

export async function playTone(kind: ToneKind, hue: number, together = false) {
  if (kind === 'silence') return;
  const ac = await ensureAudio();
  if (!master) return;

  const gain = ac.createGain();
  gain.gain.value = 0;
  gain.connect(master);

  const osc = ac.createOscillator();
  osc.type = kind === 'echo' ? 'triangle' : 'sine';
  osc.frequency.value = hueToFreq(hue);

  let harmony: OscillatorNode | null = null;
  let harmonyGain: GainNode | null = null;
  if (together) {
    harmony = ac.createOscillator();
    harmony.type = 'sine';
    harmony.frequency.value = osc.frequency.value * 1.5;
    harmonyGain = ac.createGain();
    harmonyGain.gain.value = 0.35;
    harmony.connect(harmonyGain).connect(gain);
  }

  const now = ac.currentTime;
  const ATTACK = 0.02;
  const DECAY = 0.12;
  const SUSTAIN = 0.25;
  const RELEASE = 0.25;
  const peak = kind === 'hum' ? 0.55 : kind === 'breathe' ? 0.45 : 0.35;

  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(peak, now + ATTACK);
  gain.gain.linearRampToValueAtTime(peak * SUSTAIN, now + ATTACK + DECAY);
  gain.gain.linearRampToValueAtTime(0.0001, now + ATTACK + DECAY + RELEASE);

  osc.connect(gain);
  osc.start(now);
  osc.stop(now + ATTACK + DECAY + RELEASE + 0.02);

  if (harmony && harmonyGain) {
    harmonyGain.gain.setValueAtTime(0, now);
    harmonyGain.gain.linearRampToValueAtTime(peak * 0.35, now + ATTACK);
    harmonyGain.gain.linearRampToValueAtTime(peak * 0.2, now + ATTACK + DECAY);
    harmonyGain.gain.linearRampToValueAtTime(0.0001, now + ATTACK + DECAY + RELEASE);
    harmony.start(now);
    harmony.stop(now + ATTACK + DECAY + RELEASE + 0.02);
  }
}
