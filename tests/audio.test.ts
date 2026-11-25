// 効果音（設計書 1.9）：8つの音がどれもエラーなく鳴らせる。同じ音は 0.05 秒に1回まで。音なしなら鳴らさない
import { beforeAll, describe, expect, it, vi } from 'vitest';

/** Web Audio の代わり（鳴らした回数だけ数える） */
let started = 0;
class FakeParam {
  value = 0;
  setValueAtTime() {}
  exponentialRampToValueAtTime() {}
}
class FakeNode {
  frequency = new FakeParam();
  gain = new FakeParam();
  Q = new FakeParam();
  type = '';
  buffer: unknown = null;
  connect(n: unknown) {
    return n;
  }
  start() {
    started++;
  }
  stop() {}
}
class FakeContext {
  state = 'running';
  currentTime = 0;
  sampleRate = 8000;
  destination = new FakeNode();
  createOscillator = () => new FakeNode();
  createGain = () => new FakeNode();
  createBiquadFilter = () => new FakeNode();
  createBufferSource = () => new FakeNode();
  createBuffer = (_c: number, len: number) => ({ getChannelData: () => new Float32Array(len) });
  resume() {}
}

const store = new Map<string, string>();
beforeAll(() => {
  vi.stubGlobal('window', { AudioContext: FakeContext });
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
  });
});

describe('効果音', () => {
  it('config.json の8つの音がどれもエラーなく鳴る', async () => {
    const { unlockAudio, playSound } = await import('../src/audio');
    const { config } = await import('../src/data');
    unlockAudio();
    const names = Object.values(config.sounds);
    expect(names).toHaveLength(8);
    let now = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => (now += 1000));
    for (const name of names) {
      const before = started;
      expect(() => playSound(name, 0.5)).not.toThrow();
      expect(started, name).toBeGreaterThan(before);
    }
  });

  it('同じ音は 0.05 秒に1回まで', async () => {
    const { playSound } = await import('../src/audio');
    let now = 100_000;
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    const before = started;
    playSound('pon');
    const once = started;
    now += 20;
    playSound('pon');
    expect(started).toBe(once);
    now += 60;
    playSound('pon');
    expect(started).toBeGreaterThan(once);
    expect(once).toBeGreaterThan(before);
  });

  it('音なしにすると鳴らさない。設定は端末に保存される', async () => {
    const { playSound } = await import('../src/audio');
    const { settings } = await import('../src/settings');
    settings.sound = false;
    expect([...store.values()]).toContain('off');
    let now = 200_000;
    vi.spyOn(performance, 'now').mockImplementation(() => (now += 1000));
    const before = started;
    playSound('fanfare');
    expect(started).toBe(before);
    settings.sound = true;
  });
});
