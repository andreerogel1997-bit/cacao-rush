let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let sfx: GainNode | null = null;
let music: GainNode | null = null;
let muted = false;
let musicTimer = 0;
let musicStep = 0;

function ac(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const C = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new C({ latencyHint: "interactive" });
    master = ctx.createGain();
    sfx = ctx.createGain();
    music = ctx.createGain();
    sfx.gain.value = 0.7;
    music.gain.value = 0.22;
    master.gain.value = muted ? 0 : 0.85;
    sfx.connect(master);
    music.connect(master);
    master.connect(ctx.destination);
  }
  return ctx;
}

export function unlockAudio() {
  const c = ac();
  if (c && c.state === "suspended") void c.resume();
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.getVoices();
}

export function setMuted(v: boolean) {
  muted = v;
  if (v) stopNarration();
  if (master && ctx) {
    master.gain.setTargetAtTime(v ? 0 : 0.85, ctx.currentTime, 0.02);
  }
}

export function isMuted() {
  return muted;
}

let clip: HTMLAudioElement | null = null;
let ducking = false;
let narrateGen = 0;
let fallbackTimer = 0;
let keepAliveTimer = 0;
const held: SpeechSynthesisUtterance[] = [];

function duckMusic(on: boolean) {
  ducking = on;
  if (!music || !ctx) return;
  music.gain.setTargetAtTime(on ? 0.05 : 0.22, ctx.currentTime, 0.08);
}

function spanishVoice(): SpeechSynthesisVoice | undefined {
  if (typeof window === "undefined" || !window.speechSynthesis) return undefined;
  const list = window.speechSynthesis.getVoices();
  const scored = list
    .map((v) => {
      const n = `${v.name} ${v.lang}`.toLowerCase();
      if (!/es|spanish|español/.test(n)) return { v, s: -1 };
      let s = 1;
      if (/google/.test(n)) s += 10;
      if (/neural|natural|premium|online/.test(n)) s += 6;
      if (/microsoft/.test(n)) s += 3;
      if (/es-mx|es-us|es-419|es-ar|es-co|es-pe|es-cl|es-ec/.test(n)) s += 5;
      if (/es-es/.test(n)) s += 2;
      if (!v.localService) s += 2;
      return { v, s };
    })
    .filter((x) => x.s >= 0)
    .sort((a, b) => b.s - a.s);
  return scored[0]?.v;
}

function sentenceAt(lines: string[], t: number, dur: number) {
  const weights = lines.map((s) => Math.max(12, s.length));
  const total = weights.reduce((a, b) => a + b, 0) || 1;
  const pos = Math.min(0.999, Math.max(0, t / Math.max(0.08, dur))) * total;
  let acc = 0;
  for (let i = 0; i < weights.length; i++) {
    acc += weights[i]!;
    if (pos <= acc) return i;
  }
  return Math.max(0, weights.length - 1);
}

function clearNarrationTimers() {
  if (fallbackTimer) {
    window.clearTimeout(fallbackTimer);
    fallbackTimer = 0;
  }
  if (keepAliveTimer) {
    window.clearInterval(keepAliveTimer);
    keepAliveTimer = 0;
  }
}

export function stopNarration() {
  narrateGen += 1;
  clearNarrationTimers();
  held.length = 0;
  if (clip) {
    clip.onended = null;
    clip.onerror = null;
    clip.pause();
    clip.src = "";
    clip = null;
  }
  if (typeof window !== "undefined" && window.speechSynthesis) {
    if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
      window.speechSynthesis.cancel();
    }
  }
  if (ducking) duckMusic(false);
}

export type NarrateHandlers = {
  onSentence?: (index: number, total: number) => void;
  onEnd?: () => void;
  clipUrl?: string;
};

export function narrateScript(sentences: string[], handlers: NarrateHandlers = {}) {
  stopNarration();
  const lines = sentences.map((s) => s.trim()).filter(Boolean);
  if (muted || typeof window === "undefined" || lines.length === 0) {
    handlers.onEnd?.();
    return;
  }
  unlockAudio();
  duckMusic(true);
  const my = narrateGen;
  const total = lines.length;
  handlers.onSentence?.(0, total);

  const finish = () => {
    if (my !== narrateGen) return;
    clearNarrationTimers();
    duckMusic(false);
    handlers.onEnd?.();
  };

  const tickFrom = (getT: () => number, getDur: () => number) => {
    const step = () => {
      if (my !== narrateGen) return;
      handlers.onSentence?.(sentenceAt(lines, getT(), getDur()), total);
    };
    step();
    keepAliveTimer = window.setInterval(step, 120);
  };

  const speakWhole = () => {
    const full = lines.join(" ");
    const est = Math.min(90000, Math.max(2500, Math.round(full.length * 75)));
    const t0 = performance.now();
    tickFrom(() => (performance.now() - t0) / 1000, () => est / 1000);
    const synth = window.speechSynthesis;
    if (!synth) {
      fallbackTimer = window.setTimeout(finish, est);
      return;
    }
    const u = new SpeechSynthesisUtterance(full);
    u.rate = 0.92;
    u.pitch = 1;
    u.lang = "es-MX";
    const voice = spanishVoice();
    if (voice) {
      u.voice = voice;
      if (voice.lang) u.lang = voice.lang;
    }
    u.onend = () => finish();
    u.onerror = (ev) => {
      const err = (ev as SpeechSynthesisErrorEvent).error;
      if (err === "interrupted" || err === "canceled") return;
      finish();
    };
    held.push(u);
    try {
      synth.resume();
    } catch {
      /* ignore */
    }
    synth.speak(u);
    fallbackTimer = window.setTimeout(() => {
      if (synth.speaking) {
        fallbackTimer = window.setTimeout(finish, 8000);
        return;
      }
      finish();
    }, est + 1500);
  };

  if (!handlers.clipUrl) {
    speakWhole();
    return;
  }

  const audio = new Audio(handlers.clipUrl);
  clip = audio;
  audio.preload = "auto";
  let usedFallback = false;
  const toVoice = () => {
    if (my !== narrateGen || usedFallback) return;
    usedFallback = true;
    audio.onerror = null;
    audio.onended = null;
    if (clip === audio) clip = null;
    speakWhole();
  };
  tickFrom(
    () => audio.currentTime || 0,
    () => (audio.duration && Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : 42),
  );
  audio.onended = () => finish();
  audio.onerror = () => toVoice();
  void audio.play().catch(() => toVoice());
}

export function narrate(text: string, mp3?: string, onEnd?: () => void, onSentence?: (i: number) => void) {
  const parts = text
    .split(/(?<=[.!?…])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  narrateScript(parts, {
    clipUrl: mp3,
    onEnd,
    onSentence: onSentence ? (i) => onSentence(i) : undefined,
  });
}

function beep(freq: number, dur: number, type: OscillatorType, gain: number, bus: GainNode | null, slide = 0) {
  const c = ac();
  if (!c || !bus) return;
  const t = c.currentTime;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t + dur);
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g);
  g.connect(bus);
  o.start(t);
  o.stop(t + dur + 0.02);
}

export function sfxJump() {
  beep(420 + Math.random() * 40, 0.12, "square", 0.12, sfx, -180);
}
export function sfxDouble() {
  beep(520, 0.1, "square", 0.1, sfx, 120);
}
export function sfxLand() {
  beep(90, 0.08, "triangle", 0.16, sfx, -30);
}
export function sfxCoin() {
  beep(880, 0.08, "square", 0.1, sfx, 200);
  beep(1320, 0.12, "square", 0.06, sfx, 80);
}
export function sfxDash() {
  beep(180, 0.16, "sawtooth", 0.1, sfx, 400);
}
export function sfxPound() {
  beep(70, 0.18, "triangle", 0.22, sfx, -20);
}
export function sfxHurt() {
  beep(160, 0.22, "sawtooth", 0.14, sfx, -90);
}
export function sfxCheck() {
  beep(520, 0.12, "triangle", 0.1, sfx, 80);
  beep(780, 0.18, "triangle", 0.08, sfx, 120);
}
export function sfxSave() {
  beep(392, 0.1, "sine", 0.08, sfx, 80);
  beep(784, 0.22, "triangle", 0.12, sfx, 220);
  beep(1175, 0.28, "sine", 0.08, sfx, 80);
}
export function sfxWin() {
  beep(523, 0.16, "square", 0.12, sfx, 0);
  beep(659, 0.18, "square", 0.1, sfx, 0);
  beep(784, 0.28, "square", 0.12, sfx, 40);
}
export function sfxGoal() {
  beep(392, 0.2, "triangle", 0.12, sfx, 80);
  beep(587, 0.3, "triangle", 0.1, sfx, 160);
}

const THEME = [392, 494, 523, 587, 523, 494, 440, 392, 349, 392, 440, 494, 523, 587, 659, 587];

export function tickMusic(dt: number) {
  if (muted) return;
  const c = ac();
  if (!c || !music) return;
  if (c.state !== "running") return;
  musicTimer += dt;
  const stepDur = 0.28;
  if (musicTimer >= stepDur) {
    musicTimer -= stepDur;
    const note = THEME[musicStep % THEME.length]!;
    musicStep++;
    beep(note / 2, 0.22, "triangle", 0.07, music, 0);
    if (musicStep % 4 === 0) beep(note, 0.12, "sine", 0.04, music, 0);
  }
}

export function resetMusic() {
  musicStep = 0;
  musicTimer = 0;
}
