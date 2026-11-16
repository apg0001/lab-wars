/**
 * Web Audio 엔진. 음원 파일 없이 모든 소리를 실시간으로 합성한다.
 *
 * 구조: 각 소리 → (musicBus | sfxBus) → master → compressor → 스피커
 * 브라우저 정책상 첫 터치/키 입력 이후에만 소리를 낼 수 있어 unlock()에서 컨텍스트를 만든다.
 */

export interface AudioSettings {
  musicOn: boolean;
  /** 0~1 */
  musicVol: number;
  sfxOn: boolean;
  /** 0~1 */
  sfxVol: number;
}

const KEY = 'mw:audio';
const DEFAULTS: AudioSettings = { musicOn: true, musicVol: 0.5, sfxOn: true, sfxVol: 0.6 };
/** 슬라이더 최대일 때의 실제 버스 음량. 시끄럽지 않게 낮게 잡는다. */
const MUSIC_MAX = 0.55;
const SFX_MAX = 0.8;
/** 동시에 울리는 효과음 수 제한 */
const MAX_VOICES = 18;

const clamp01 = (v: unknown, d: number): number => (typeof v === 'number' && Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : d);

function loadSettings(): AudioSettings {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<AudioSettings>;
    return {
      musicOn: typeof raw.musicOn === 'boolean' ? raw.musicOn : DEFAULTS.musicOn,
      musicVol: clamp01(raw.musicVol, DEFAULTS.musicVol),
      sfxOn: typeof raw.sfxOn === 'boolean' ? raw.sfxOn : DEFAULTS.sfxOn,
      sfxVol: clamp01(raw.sfxVol, DEFAULTS.sfxVol),
    };
  } catch {
    return { ...DEFAULTS };
  }
}

export interface ToneOpts {
  type?: OscillatorType;
  f0: number;
  /** 끝 주파수 (지수 곡선으로 이동) */
  f1?: number;
  dur: number;
  gain: number;
  attack?: number;
  /** 지금부터 몇 초 뒤 */
  at?: number;
  detune?: number;
  /** 저역 통과 필터 */
  lp?: number;
}

export interface NoiseOpts {
  dur: number;
  gain: number;
  filter?: BiquadFilterType;
  freq?: number;
  freqEnd?: number;
  q?: number;
  attack?: number;
  at?: number;
}

export interface VoiceOut {
  /** -1(왼쪽)~1(오른쪽) */
  pan?: number;
  /** 추가 음량 배율 */
  vol?: number;
}

export class AudioEngine {
  ctx: AudioContext | null = null;
  settings = loadSettings();
  private master!: GainNode;
  musicBus!: GainNode;
  private sfxBus!: GainNode;
  private noiseBuf!: AudioBuffer;
  private voices = 0;
  private ducked = false;
  private listeners = new Set<() => void>();

  /** 사용자 입력 안에서 호출해야 한다. */
  unlock(): void {
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      const ctx = new Ctor();
      this.ctx = ctx;
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -18;
      comp.knee.value = 12;
      comp.ratio.value = 4;
      comp.attack.value = 0.003;
      comp.release.value = 0.2;
      comp.connect(ctx.destination);
      this.master = ctx.createGain();
      this.master.gain.value = 0.9;
      this.master.connect(comp);
      this.musicBus = ctx.createGain();
      this.sfxBus = ctx.createGain();
      this.musicBus.connect(this.master);
      this.sfxBus.connect(this.master);
      // 1초짜리 백색 소음을 만들어 두고 재사용한다.
      this.noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      this.applyVolumes(true);
      // iOS: 무음 버퍼를 한 번 재생해야 소리가 풀린다.
      const src = ctx.createBufferSource();
      src.buffer = ctx.createBuffer(1, 1, 22050);
      src.connect(ctx.destination);
      src.start();
      for (const cb of this.listeners) cb();
    }
    if (this.ctx.state === 'suspended' && !document.hidden) void this.ctx.resume().catch(() => undefined);
  }

  /** 컨텍스트가 처음 만들어질 때 (음악 시작용) */
  onReady(cb: () => void): void {
    this.listeners.add(cb);
    if (this.ctx) cb();
  }

  get ready(): boolean {
    return !!this.ctx && this.ctx.state === 'running';
  }

  get now(): number {
    return this.ctx?.currentTime ?? 0;
  }

  update(patch: Partial<AudioSettings>): void {
    this.settings = { ...this.settings, ...patch };
    try {
      localStorage.setItem(KEY, JSON.stringify(this.settings));
    } catch {
      /* 저장 실패는 무시 */
    }
    this.applyVolumes();
  }

  /** 일시정지 등에서 배경음악을 낮춘다. */
  duck(on: boolean): void {
    this.ducked = on;
    this.applyVolumes();
  }

  get sfxEnabled(): boolean {
    return this.settings.sfxOn && this.settings.sfxVol > 0;
  }

  private applyVolumes(immediate = false): void {
    if (!this.ctx) return;
    const s = this.settings;
    // 사람 귀는 로그 감각이라 제곱 곡선으로 매핑한다.
    const m = s.musicOn ? s.musicVol ** 2 * MUSIC_MAX * (this.ducked ? 0.35 : 1) : 0;
    const f = s.sfxOn ? s.sfxVol ** 2 * SFX_MAX : 0;
    const t = this.ctx.currentTime;
    for (const [bus, v] of [[this.musicBus, m], [this.sfxBus, f]] as const) {
      bus.gain.cancelScheduledValues(t);
      if (immediate) bus.gain.setValueAtTime(v, t);
      else bus.gain.setTargetAtTime(v, t, 0.08);
    }
  }

  // ───────────── 효과음용 기본 소리 ─────────────

  /** 효과음 출력 노드 (패닝·음량). 동시 재생이 너무 많으면 null. */
  sfxOut(o: VoiceOut = {}, life = 0.5): AudioNode | null {
    const ctx = this.ctx;
    if (!ctx || !this.sfxEnabled || ctx.state !== 'running') return null;
    if (this.voices >= MAX_VOICES) return null;
    this.voices++;
    window.setTimeout(() => this.voices--, life * 1000 + 50);
    const g = ctx.createGain();
    g.gain.value = o.vol ?? 1;
    let head: AudioNode = g;
    if (o.pan && ctx.createStereoPanner) {
      const p = ctx.createStereoPanner();
      p.pan.value = Math.max(-1, Math.min(1, o.pan));
      g.connect(p);
      p.connect(this.sfxBus);
    } else g.connect(this.sfxBus);
    return head;
  }

  tone(dest: AudioNode, o: ToneOpts): void {
    const ctx = this.ctx!;
    const t = ctx.currentTime + (o.at ?? 0);
    const osc = ctx.createOscillator();
    osc.type = o.type ?? 'sine';
    osc.frequency.setValueAtTime(o.f0, t);
    if (o.f1 && o.f1 !== o.f0) osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.f1), t + o.dur);
    if (o.detune) osc.detune.value = o.detune;
    const g = ctx.createGain();
    const a = o.attack ?? 0.004;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(o.gain, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + o.dur);
    let node: AudioNode = osc;
    if (o.lp) {
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = o.lp;
      osc.connect(f);
      node = f;
    }
    node.connect(g);
    g.connect(dest);
    osc.start(t);
    osc.stop(t + a + o.dur + 0.05);
  }

  noise(dest: AudioNode, o: NoiseOpts): void {
    const ctx = this.ctx!;
    const t = ctx.currentTime + (o.at ?? 0);
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = o.filter ?? 'bandpass';
    f.frequency.setValueAtTime(o.freq ?? 1000, t);
    if (o.freqEnd) f.frequency.exponentialRampToValueAtTime(o.freqEnd, t + o.dur);
    f.Q.value = o.q ?? 1;
    const g = ctx.createGain();
    const a = o.attack ?? 0.003;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(o.gain, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + o.dur);
    src.connect(f);
    f.connect(g);
    g.connect(dest);
    src.start(t, Math.random() * 0.5);
    src.stop(t + a + o.dur + 0.05);
  }

  /** 음악용: 지정 시각에 노이즈 타격 (드럼) */
  noiseAt(dest: AudioNode, t: number, o: Omit<NoiseOpts, 'at'>): void {
    this.noise(dest, { ...o, at: t - this.now });
  }

  toneAt(dest: AudioNode, t: number, o: Omit<ToneOpts, 'at'>): void {
    this.tone(dest, { ...o, at: t - this.now });
  }
}

export const audio = new AudioEngine();

/** 첫 입력에서 오디오를 깨우고, 화면이 숨겨지면 멈춘다. */
export function installAudioUnlock(): void {
  const wake = (): void => audio.unlock();
  window.addEventListener('pointerdown', wake, { capture: true });
  window.addEventListener('keydown', wake, { capture: true });
  document.addEventListener('visibilitychange', () => {
    const ctx = audio.ctx;
    if (!ctx) return;
    if (document.hidden) void ctx.suspend().catch(() => undefined);
    else void ctx.resume().catch(() => undefined);
  });
}

export const mtof = (m: number): number => 440 * 2 ** ((m - 69) / 12);
