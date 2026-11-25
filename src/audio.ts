// 効果音（設計書 1.9）。素材ファイルは使わず Web Audio で合成する（前作の audio.ts を流用）。
// iOS は利用者が触ったときに AudioContext を作る・再開する必要がある。
// 同じ音は 0.05 秒に1回まで（合体が続いても重ねすぎない）

import { settings } from './settings';

let ctx: AudioContext | null = null;
let noise: AudioBuffer | null = null;

/** 最初のタッチ・クリックで呼ぶ。以後は鳴らせるようになる */
export function unlockAudio(): void {
  try {
    if (!ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      ctx = new Ctor();
    }
    if (ctx.state === 'suspended') void ctx.resume();
  } catch {
    ctx = null;
  }
}

type Tone = {
  freq: number;
  /** 終わりの周波数（音の高さを動かすとき） */
  to?: number;
  type?: OscillatorType;
  /** 開始までの遅れ（秒） */
  at?: number;
  dur: number;
  gain?: number;
};

/** ザッという音（紙・ぶつかる音・割れる音） */
type Noise = {
  at?: number;
  dur: number;
  gain?: number;
  /** 通す周波数の帯 */
  filter: BiquadFilterType;
  freq: number;
  q?: number;
};

function ready(): AudioContext | null {
  if (!settings.sound || !ctx || ctx.state !== 'running') return null;
  return ctx;
}

function envelope(c: AudioContext, t0: number, dur: number, peak: number): GainNode {
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(peak, t0 + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  return g;
}

function tones(list: Tone[]): void {
  const c = ready();
  if (!c) return;
  const now = c.currentTime;
  for (const tone of list) {
    const t0 = now + (tone.at ?? 0);
    const osc = c.createOscillator();
    osc.type = tone.type ?? 'sine';
    osc.frequency.setValueAtTime(tone.freq, t0);
    if (tone.to) osc.frequency.exponentialRampToValueAtTime(tone.to, t0 + tone.dur);
    osc.connect(envelope(c, t0, tone.dur, tone.gain ?? 0.12)).connect(c.destination);
    osc.start(t0);
    osc.stop(t0 + tone.dur + 0.02);
  }
}

function noises(list: Noise[]): void {
  const c = ready();
  if (!c) return;
  if (!noise) {
    noise = c.createBuffer(1, c.sampleRate, c.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const now = c.currentTime;
  for (const n of list) {
    const t0 = now + (n.at ?? 0);
    const src = c.createBufferSource();
    src.buffer = noise;
    const f = c.createBiquadFilter();
    f.type = n.filter;
    f.frequency.value = n.freq;
    f.Q.value = n.q ?? 1;
    src.connect(f).connect(envelope(c, t0, n.dur, n.gain ?? 0.2)).connect(c.destination);
    src.start(t0, Math.random() * 0.5);
    src.stop(t0 + n.dur + 0.02);
  }
}

const last = new Map<string, number>();
const THROTTLE_MS = 50;
/** 同じ音は THROTTLE_MS に1回まで */
function once(name: string, fn: () => void): void {
  const now = performance.now();
  if (now - (last.get(name) ?? -Infinity) < THROTTLE_MS) return;
  last.set(name, now);
  fn();
}

/** 音の名前（config.json の sounds の値）→ 鳴らし方。pitch は 0（小さい）〜1（大きい） */
export const sfx: Record<string, (pitch?: number) => void> = {
  /** 硬貨：チャリン（小さい硬貨ほど高い） */
  chalin: (pitch = 0.5) =>
    once('chalin', () => {
      const base = 3400 - pitch * 1600;
      tones([
        { freq: base, type: 'triangle', dur: 0.14, gain: 0.07 },
        { freq: base * 1.5, dur: 0.1, gain: 0.04 },
        { freq: base * 1.02, type: 'triangle', at: 0.06, dur: 0.18, gain: 0.05 },
      ]);
    }),
  /** お札：ペラッ */
  pera: () =>
    once('pera', () =>
      noises([
        { filter: 'bandpass', freq: 3200, q: 1.2, dur: 0.06, gain: 0.25 },
        { filter: 'bandpass', freq: 2200, q: 1.2, at: 0.05, dur: 0.1, gain: 0.18 },
      ]),
    ),
  /** 束：ドサッ */
  dosa: () =>
    once('dosa', () => {
      noises([{ filter: 'lowpass', freq: 500, dur: 0.22, gain: 0.5 }]);
      tones([{ freq: 120, to: 60, dur: 0.18, gain: 0.18 }]);
    }),
  /** 1億円のケース：ガチャッ */
  gacha: () =>
    once('gacha', () => {
      noises([
        { filter: 'highpass', freq: 2500, dur: 0.04, gain: 0.3 },
        { filter: 'bandpass', freq: 1800, q: 3, at: 0.08, dur: 0.06, gain: 0.35 },
      ]);
      tones([
        { freq: 1200, type: 'square', dur: 0.03, gain: 0.04 },
        { freq: 900, type: 'square', at: 0.08, dur: 0.05, gain: 0.05 },
      ]);
    }),
  /** かぶを買った：ポン */
  pon: () => once('pon', () => tones([{ freq: 660, to: 990, dur: 0.12, gain: 0.15 }])),
  /** 暴落：ヒュー…ドン */
  hyuDon: () =>
    once('hyuDon', () => {
      tones([
        { freq: 1500, to: 220, type: 'sine', dur: 0.6, gain: 0.08 },
        { freq: 90, to: 40, at: 0.62, dur: 0.35, gain: 0.3 },
      ]);
      noises([{ filter: 'lowpass', freq: 300, at: 0.62, dur: 0.3, gain: 0.5 }]);
    }),
  /** 億り人：ファンファーレ */
  fanfare: () =>
    once('fanfare', () =>
      tones([
        { freq: 523.25, type: 'triangle', dur: 0.14, gain: 0.12 },
        { freq: 659.25, type: 'triangle', at: 0.12, dur: 0.14, gain: 0.12 },
        { freq: 783.99, type: 'triangle', at: 0.24, dur: 0.14, gain: 0.12 },
        { freq: 1046.5, type: 'triangle', at: 0.36, dur: 0.7, gain: 0.14 },
        { freq: 783.99, type: 'triangle', at: 0.36, dur: 0.7, gain: 0.08 },
        { freq: 659.25, type: 'triangle', at: 0.36, dur: 0.7, gain: 0.08 },
      ]),
    ),
  /** 貯金箱が割れた：パリーン */
  parin: () =>
    once('parin', () => {
      noises([{ filter: 'highpass', freq: 3000, dur: 0.35, gain: 0.35 }]);
      tones(
        [2900, 4100, 3500, 5200, 4600].map((freq, i) => ({ freq, type: 'triangle' as const, at: i * 0.035, dur: 0.25, gain: 0.05 })),
      );
    }),
};

/** config.json の sounds のキー（coin・bill など）で鳴らす */
export function playSound(name: string | undefined, pitch?: number): void {
  if (name) sfx[name]?.(pitch);
}
