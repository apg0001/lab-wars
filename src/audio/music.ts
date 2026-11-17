import { audio, mtof } from './engine';

/**
 * 절차적 배경음악. 16분음표 단위 스케줄러가 조금 앞서 음을 예약한다.
 * 몰입감은 살리되 귀가 피곤하지 않게: 부드러운 삼각파·저역 통과, 낮은 드럼.
 */

export type TrackId = 'lobby' | 'battle' | 'boss' | 'spooky' | 'spookyBoss';

interface Track {
  bpm: number;
  /** 마디별 코드 (MIDI 음, 첫 음이 베이스 근음) */
  chords: number[][];
  /** 16스텝 베이스 패턴: 1 = 근음, 2 = 5도, 3 = 옥타브, 0 = 쉼 */
  bass: number[];
  /** 16스텝 킥/스네어/하이햇 */
  kick: number[];
  snare: number[];
  hat: number[];
  /** 아르페지오 스텝 (코드 톤 순번, -1 = 쉼) */
  arp: number[];
  arpOct: number;
  swing: number;
  padGain: number;
  arpGain: number;
  bassGain: number;
  drumGain: number;
  /** 아르페지오 음색 밝기 */
  arpLp: number;
}

const _ = -1;
const TRACKS: Record<TrackId, Track> = {
  // 느긋한 로파이: Fmaj7 – Em7 – Dm7 – Cmaj7
  lobby: {
    bpm: 82,
    chords: [[53, 57, 60, 64], [52, 55, 59, 62], [50, 53, 57, 60], [48, 52, 55, 59]],
    bass: [1, 0, 0, 0, 0, 0, 0, 2, 0, 0, 1, 0, 0, 0, 0, 0],
    kick: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0],
    snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
    hat: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1],
    arp: [_, _, 2, _, 3, _, _, 1, _, _, 3, _, 2, _, _, _],
    arpOct: 12, swing: 0.12,
    padGain: 0.045, arpGain: 0.05, bassGain: 0.13, drumGain: 0.55, arpLp: 2200,
  },
  // 전투: Am – F – C – G, 경쾌하게 전진
  battle: {
    bpm: 112,
    chords: [[45, 57, 60, 64], [41, 57, 60, 65], [48, 55, 60, 64], [43, 55, 59, 62]],
    bass: [1, 0, 1, 0, 3, 0, 1, 0, 1, 0, 1, 0, 3, 0, 2, 0],
    kick: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1],
    snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
    hat: [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0],
    arp: [0, _, 1, _, 2, _, 3, _, 2, _, 1, _, 2, _, 3, _],
    arpOct: 12, swing: 0,
    padGain: 0.035, arpGain: 0.04, bassGain: 0.13, drumGain: 0.6, arpLp: 2600,
  },
  // 보스: Dm – B♭ – Gm – A (화성 단음계 긴장감)
  boss: {
    bpm: 126,
    chords: [[38, 50, 53, 57], [34, 50, 53, 58], [43, 50, 55, 58], [45, 49, 52, 57]],
    bass: [1, 1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 3, 0, 2, 0],
    kick: [1, 0, 0, 1, 1, 0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 0],
    snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0],
    hat: [1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 1],
    arp: [3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 2, 1, 0, 1],
    arpOct: 12, swing: 0,
    padGain: 0.04, arpGain: 0.03, bassGain: 0.14, drumGain: 0.65, arpLp: 1900,
  },
  // 외전: 오르골처럼 높고 드문드문, 시계 초침 같은 하이햇. Am – Fm – Dm – E7(♭9)
  spooky: {
    bpm: 70,
    chords: [[45, 57, 60, 64], [41, 53, 56, 60], [38, 50, 53, 57], [40, 56, 59, 65]],
    bass: [1, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0],
    kick: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    snare: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    hat: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
    arp: [2, _, _, 1, _, _, 3, _, _, _, 0, _, _, 2, _, _],
    arpOct: 24, swing: 0,
    padGain: 0.05, arpGain: 0.035, bassGain: 0.12, drumGain: 0.5, arpLp: 3200,
  },
  // 외전 보스: Dm – E♭ – Dm – C#dim, 낮게 밀어붙인다
  spookyBoss: {
    bpm: 100,
    chords: [[38, 50, 53, 57], [39, 51, 55, 58], [38, 50, 53, 57], [37, 49, 52, 55]],
    bass: [1, 0, 1, 1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 2, 0],
    kick: [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0],
    snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
    hat: [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0],
    arp: [3, _, _, 2, _, _, 1, _, 3, _, _, 2, _, 1, _, 0],
    arpOct: 24, swing: 0,
    padGain: 0.045, arpGain: 0.028, bassGain: 0.14, drumGain: 0.6, arpLp: 2400,
  },
};

class MusicPlayer {
  private current: TrackId | null = null;
  private bus: GainNode | null = null;
  private echo: AudioNode | null = null;
  private timer = 0;
  private step = 0;
  private nextT = 0;
  private wanted: TrackId | null = null;

  constructor() {
    audio.onReady(() => {
      if (this.wanted) {
        const w = this.wanted;
        this.wanted = null;
        this.play(w);
      }
    });
  }

  /** 트랙 전환 (같은 트랙이면 무시). 오디오가 아직 잠겨 있으면 풀릴 때 시작한다. */
  play(id: TrackId): void {
    if (!audio.ctx) {
      this.wanted = id;
      return;
    }
    if (this.current === id) return;
    this.fadeOut(0.8);
    const ctx = audio.ctx;
    this.current = id;
    const bus = ctx.createGain();
    bus.gain.setValueAtTime(0.0001, ctx.currentTime);
    bus.gain.exponentialRampToValueAtTime(1, ctx.currentTime + 1.2);
    bus.connect(audio.musicBus);
    // 아르페지오에 거는 은은한 에코
    const delay = ctx.createDelay(1);
    delay.delayTime.value = (60 / TRACKS[id].bpm) * 0.75;
    const fb = ctx.createGain();
    fb.gain.value = 0.28;
    const wet = ctx.createGain();
    wet.gain.value = 0.35;
    const tone = ctx.createBiquadFilter();
    tone.type = 'lowpass';
    tone.frequency.value = 1800;
    delay.connect(tone);
    tone.connect(fb);
    fb.connect(delay);
    delay.connect(wet);
    wet.connect(bus);
    this.bus = bus;
    this.echo = delay;
    this.step = 0;
    this.nextT = ctx.currentTime + 0.1;
    window.clearInterval(this.timer);
    this.timer = window.setInterval(() => this.schedule(), 25);
  }

  stop(fade = 0.8): void {
    this.wanted = null;
    this.fadeOut(fade);
    this.current = null;
    window.clearInterval(this.timer);
  }

  private fadeOut(sec: number): void {
    const bus = this.bus;
    if (!bus || !audio.ctx) return;
    const t = audio.ctx.currentTime;
    bus.gain.cancelScheduledValues(t);
    bus.gain.setValueAtTime(Math.max(0.0001, bus.gain.value), t);
    bus.gain.exponentialRampToValueAtTime(0.0001, t + sec);
    window.setTimeout(() => bus.disconnect(), sec * 1000 + 200);
    this.bus = null;
    this.echo = null;
  }

  private schedule(): void {
    const ctx = audio.ctx;
    const id = this.current;
    if (!ctx || !id || !this.bus) return;
    // 탭이 숨겨졌다 돌아오면 밀린 음을 몰아 치지 않도록 건너뛴다.
    if (this.nextT < ctx.currentTime - 0.2) this.nextT = ctx.currentTime + 0.05;
    const tr = TRACKS[id];
    const sixteenth = 60 / tr.bpm / 4;
    while (this.nextT < ctx.currentTime + 0.15) {
      const s = this.step % 16;
      const bar = Math.floor(this.step / 16);
      const t = this.nextT + (s % 2 === 1 ? tr.swing * sixteenth : 0);
      this.playStep(tr, s, bar, t, sixteenth);
      this.step++;
      this.nextT += sixteenth;
    }
  }

  private playStep(tr: Track, s: number, bar: number, t: number, six: number): void {
    const bus = this.bus!;
    const chord = tr.chords[bar % tr.chords.length]!;
    const root = chord[0]!;
    // 8마디마다 아르페지오를 한 마디 쉬어 숨 쉴 틈을 준다.
    const breathe = bar % 8 === 7;

    if (s === 0) {
      // 패드: 코드 위 세 음을 은은하게
      for (const m of chord.slice(1)) {
        audio.toneAt(bus, t, { type: 'triangle', f0: mtof(m), dur: six * 15, gain: tr.padGain, attack: six * 3, lp: 1200, detune: (Math.random() - 0.5) * 10 });
      }
    }
    const b = tr.bass[s]!;
    if (b) {
      const m = b === 1 ? root : b === 2 ? root + 7 : root + 12;
      const bm = m >= 48 ? m - 12 : m;
      audio.toneAt(bus, t, { type: 'triangle', f0: mtof(bm), dur: six * 1.6, gain: tr.bassGain, lp: 600 });
    }
    const a = tr.arp[s]!;
    if (a >= 0 && !breathe) {
      const tones = chord.slice(1);
      const m = tones[a % tones.length]! + tr.arpOct;
      audio.toneAt(bus, t, { type: 'triangle', f0: mtof(m), dur: six * 1.4, gain: tr.arpGain, lp: tr.arpLp });
      if (this.echo) audio.toneAt(this.echo, t, { type: 'triangle', f0: mtof(m), dur: six * 1.4, gain: tr.arpGain * 0.8, lp: tr.arpLp });
    }
    const dg = tr.drumGain;
    if (tr.kick[s]) audio.toneAt(bus, t, { f0: 130, f1: 42, dur: 0.16, gain: 0.32 * dg });
    if (tr.snare[s]) audio.noiseAt(bus, t, { filter: 'bandpass', freq: 1900, q: 0.8, dur: 0.1, gain: 0.07 * dg });
    if (tr.hat[s]) audio.noiseAt(bus, t, { filter: 'highpass', freq: 7500, dur: 0.025, gain: (s % 4 === 2 ? 0.035 : 0.022) * dg });
  }
}

export const music = new MusicPlayer();
