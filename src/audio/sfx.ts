import type { BattleEvent } from '../sim/battle';
import type { SkillId } from '../data/upgrades';
import { audio, mtof, type VoiceOut } from './engine';

/**
 * 합성 효과음 모음. 시끄럽지 않게 짧고 부드러운 소리 위주로,
 * 같은 소리가 몰리면 간격 제한(throttle)으로 걸러낸다.
 */

const last = new Map<string, number>();
/** 같은 이름의 소리를 gap초 안에 다시 내지 않는다. */
function gate(name: string, gap: number): boolean {
  const t = performance.now() / 1000;
  if (t - (last.get(name) ?? -1) < gap) return false;
  last.set(name, t);
  return true;
}

const jitter = (v: number, amt = 0.08): number => v * (1 + (Math.random() * 2 - 1) * amt);

export const sfx = {
  click(): void {
    if (!gate('click', 0.04)) return;
    const o = audio.sfxOut({ vol: 0.7 }, 0.08);
    if (!o) return;
    audio.tone(o, { type: 'triangle', f0: 1400, f1: 900, dur: 0.035, gain: 0.08 });
  },

  hitMelee(v: VoiceOut, heavy: boolean, toAlly: boolean): void {
    if (!gate('hitM', 0.035)) return;
    const o = audio.sfxOut(v, 0.25);
    if (!o) return;
    const base = toAlly ? 0.85 : 1;
    audio.noise(o, { filter: 'bandpass', freq: jitter(1700 * base), q: 1.2, dur: 0.05, gain: 0.32 });
    audio.tone(o, { f0: jitter(200 * base), f1: 70, dur: 0.09, gain: 0.35 });
    if (heavy) audio.tone(o, { f0: 120, f1: 40, dur: 0.18, gain: 0.4 });
  },

  hitRanged(v: VoiceOut): void {
    if (!gate('hitR', 0.05)) return;
    const o = audio.sfxOut({ ...v, vol: (v.vol ?? 1) * 0.7 }, 0.15);
    if (!o) return;
    audio.noise(o, { filter: 'highpass', freq: 2500, dur: 0.035, gain: 0.18 });
    audio.tone(o, { type: 'triangle', f0: jitter(520), f1: 260, dur: 0.05, gain: 0.12 });
  },

  shoot(kind: string, v: VoiceOut, tower: boolean): void {
    if (!gate(tower ? `tw-${kind}` : 'shoot', tower ? 0.2 : 0.07)) return;
    const o = audio.sfxOut({ ...v, vol: (v.vol ?? 1) * 0.6 }, 0.2);
    if (!o) return;
    switch (kind) {
      case 'paper':
        audio.noise(o, { filter: 'highpass', freq: 3500, dur: 0.06, gain: 0.14 });
        audio.tone(o, { type: 'triangle', f0: 1100, f1: 1500, dur: 0.04, gain: 0.05 });
        break;
      case 'laser':
        audio.tone(o, { f0: 1500, f1: 380, dur: 0.12, gain: 0.08 });
        break;
      case 'flask':
      case 'bomb':
        audio.noise(o, { filter: 'bandpass', freq: 500, freqEnd: 1400, q: 2, dur: 0.16, gain: 0.12 });
        break;
      case 'code':
        audio.tone(o, { type: 'square', f0: jitter(1760, 0.15), dur: 0.02, gain: 0.025, lp: 3000 });
        break;
      default:
        audio.tone(o, { type: 'triangle', f0: jitter(880), f1: 1320, dur: 0.05, gain: 0.07 });
    }
  },

  boom(v: VoiceOut, big: boolean): void {
    if (!gate('boom', 0.08)) return;
    const o = audio.sfxOut(v, big ? 0.8 : 0.45);
    if (!o) return;
    const d = big ? 0.6 : 0.3;
    audio.noise(o, { filter: 'lowpass', freq: big ? 1800 : 1300, freqEnd: 150, q: 0.7, dur: d, gain: big ? 0.6 : 0.35 });
    audio.tone(o, { f0: big ? 110 : 140, f1: 35, dur: d, gain: big ? 0.6 : 0.35 });
  },

  stomp(v: VoiceOut): void {
    const o = audio.sfxOut(v, 0.8);
    if (!o) return;
    audio.tone(o, { f0: 75, f1: 28, dur: 0.55, gain: 0.75 });
    audio.noise(o, { filter: 'lowpass', freq: 500, freqEnd: 80, dur: 0.4, gain: 0.45 });
  },

  knockback(v: VoiceOut): void {
    if (!gate('kb', 0.08)) return;
    const o = audio.sfxOut({ ...v, vol: (v.vol ?? 1) * 0.8 }, 0.25);
    if (!o) return;
    audio.noise(o, { filter: 'bandpass', freq: 900, freqEnd: 260, q: 1.5, dur: 0.18, gain: 0.2 });
  },

  kill(v: VoiceOut, enemy: boolean): void {
    if (!gate(enemy ? 'killE' : 'killA', 0.06)) return;
    const o = audio.sfxOut(v, 0.35);
    if (!o) return;
    if (enemy) {
      // 펑 + 동전 띵
      audio.tone(o, { f0: jitter(420), f1: 1000, dur: 0.07, gain: 0.16 });
      audio.tone(o, { type: 'triangle', f0: 1568, dur: 0.06, gain: 0.05, at: 0.05 });
      audio.tone(o, { type: 'triangle', f0: 2093, dur: 0.12, gain: 0.05, at: 0.1 });
    } else {
      audio.tone(o, { type: 'triangle', f0: 480, f1: 220, dur: 0.18, gain: 0.1 });
    }
  },

  bossDown(): void {
    const o = audio.sfxOut({ vol: 1 }, 2);
    if (!o) return;
    audio.noise(o, { filter: 'lowpass', freq: 2000, freqEnd: 100, dur: 1.2, gain: 0.6 });
    audio.tone(o, { f0: 90, f1: 25, dur: 1.2, gain: 0.7 });
    [60, 64, 67, 72].forEach((m, i) => audio.tone(o, { type: 'triangle', f0: mtof(m + 12), dur: 0.9, gain: 0.07, at: 0.35 + i * 0.07, attack: 0.02 }));
  },

  baseHit(v: VoiceOut, ally: boolean): void {
    if (!gate(ally ? 'baseA' : 'baseE', 0.12)) return;
    const o = audio.sfxOut({ ...v, vol: (v.vol ?? 1) * 0.8 }, 0.3);
    if (!o) return;
    if (ally) {
      audio.tone(o, { f0: 110, f1: 55, dur: 0.14, gain: 0.35 });
      audio.noise(o, { filter: 'lowpass', freq: 700, dur: 0.08, gain: 0.2 });
    } else {
      audio.tone(o, { type: 'triangle', f0: jitter(240), f1: 180, dur: 0.07, gain: 0.14, lp: 1200 });
      audio.noise(o, { filter: 'bandpass', freq: 1200, q: 3, dur: 0.04, gain: 0.1 });
    }
  },

  summon(): void {
    if (!gate('summon', 0.05)) return;
    const o = audio.sfxOut({ vol: 0.9 }, 0.3);
    if (!o) return;
    audio.tone(o, { type: 'triangle', f0: mtof(72), dur: 0.07, gain: 0.1 });
    audio.tone(o, { type: 'triangle', f0: mtof(79), dur: 0.12, gain: 0.1, at: 0.06 });
  },

  brew(): void {
    const o = audio.sfxOut({ vol: 1 }, 0.9);
    if (!o) return;
    for (let i = 0; i < 5; i++) audio.tone(o, { f0: 300 + Math.random() * 450, f1: 900, dur: 0.05, gain: 0.06, at: i * 0.06 });
    audio.tone(o, { type: 'triangle', f0: mtof(88), dur: 0.5, gain: 0.07, at: 0.32 });
    audio.tone(o, { f0: mtof(93), dur: 0.6, gain: 0.05, at: 0.36 });
  },

  heal(): void {
    if (!gate('heal', 0.4)) return;
    const o = audio.sfxOut({ vol: 0.6 }, 0.3);
    if (!o) return;
    audio.tone(o, { f0: 1200, f1: 1800, dur: 0.12, gain: 0.04 });
    audio.tone(o, { f0: 1600, f1: 2400, dur: 0.12, gain: 0.03, at: 0.06 });
  },

  skill(id: SkillId): void {
    const o = audio.sfxOut({ vol: 1 }, 1.2);
    if (!o) return;
    switch (id) {
      case 'snack':
        [72, 76, 79, 84].forEach((m, i) => audio.tone(o, { type: 'triangle', f0: mtof(m), dur: 0.25, gain: 0.08, at: i * 0.07 }));
        break;
      case 'allnight':
        audio.tone(o, { type: 'sawtooth', f0: 110, f1: 440, dur: 0.6, gain: 0.07, lp: 1400, attack: 0.05 });
        [69, 76, 81].forEach((m, i) => audio.tone(o, { type: 'triangle', f0: mtof(m), dur: 0.3, gain: 0.06, at: 0.25 + i * 0.08 }));
        break;
      case 'aircon':
        audio.noise(o, { filter: 'highpass', freq: 5000, freqEnd: 1500, dur: 0.9, gain: 0.14, attack: 0.15 });
        audio.tone(o, { f0: mtof(88), dur: 0.5, gain: 0.03, at: 0.1 });
        break;
      case 'bombard':
        audio.tone(o, { f0: 1800, f1: 500, dur: 0.5, gain: 0.06 });
        break;
    }
  },

  bossSpawn(): void {
    const o = audio.sfxOut({ vol: 1 }, 2.4);
    if (!o) return;
    audio.tone(o, { type: 'sawtooth', f0: mtof(38), dur: 1.6, gain: 0.16, lp: 500, attack: 0.25 });
    audio.tone(o, { type: 'sawtooth', f0: mtof(45), dur: 1.6, gain: 0.1, lp: 500, attack: 0.25, detune: 8 });
    audio.noise(o, { filter: 'bandpass', freq: 300, q: 4, dur: 1.8, gain: 0.15, attack: 0.02 });
  },

  rush(): void {
    const o = audio.sfxOut({ vol: 0.9 }, 0.9);
    if (!o) return;
    [0, 0.22].forEach((t) => {
      audio.tone(o, { type: 'triangle', f0: 880, dur: 0.1, gain: 0.07, at: t });
      audio.tone(o, { type: 'triangle', f0: 660, dur: 0.1, gain: 0.07, at: t + 0.11 });
    });
  },

  win(): void {
    const o = audio.sfxOut({ vol: 1 }, 2);
    if (!o) return;
    [[72, 0], [76, 0.12], [79, 0.24], [84, 0.4]].forEach(([m, t]) => {
      audio.tone(o, { type: 'triangle', f0: mtof(m!), dur: t === 0.4 ? 0.9 : 0.14, gain: 0.12, at: t });
      audio.tone(o, { f0: mtof(m! - 12), dur: t === 0.4 ? 0.9 : 0.14, gain: 0.06, at: t });
    });
  },

  lose(): void {
    const o = audio.sfxOut({ vol: 1 }, 2.2);
    if (!o) return;
    [67, 66, 65, 64].forEach((m, i) => audio.tone(o, { type: 'triangle', f0: mtof(m), f1: i === 3 ? mtof(m) * 0.94 : undefined, dur: i === 3 ? 1 : 0.28, gain: 0.1, at: i * 0.32, lp: 1800 }));
  },
};

/**
 * 전투 이벤트 → 효과음. 카메라 밖 소리는 작게, 좌우로 패닝한다.
 * @param camX 카메라 왼쪽 월드 좌표, viewW 시야 폭
 */
export function playBattleSfx(e: BattleEvent, camX: number, viewW: number): void {
  if (!audio.sfxEnabled) return;
  const at = (x: number): VoiceOut => {
    const c = camX + viewW / 2;
    const off = (x - c) / (viewW / 2);
    const outside = Math.max(0, Math.abs(off) - 1);
    return { pan: Math.max(-0.7, Math.min(0.7, off * 0.6)), vol: Math.max(0.15, 1 - outside * 1.2) };
  };
  switch (e.type) {
    case 'hit':
      if (e.melee) sfx.hitMelee(at(e.x), e.dmg >= 45, e.to === 'ally');
      else sfx.hitRanged(at(e.x));
      break;
    case 'shoot': sfx.shoot(e.kind, at(e.x), e.tower); break;
    case 'boom': sfx.boom(at(e.x), e.big); break;
    case 'stomp': sfx.stomp(at(e.x)); break;
    case 'knockback': sfx.knockback(at(e.x)); break;
    case 'kill':
      if (e.boss) sfx.bossDown();
      else sfx.kill(at(e.x), e.side === 'enemy');
      break;
    case 'baseHit': sfx.baseHit(at(e.x), e.side === 'ally'); break;
    case 'summon': sfx.summon(); break;
    case 'brew': sfx.brew(); break;
    case 'heal': sfx.heal(); break;
    case 'skill': sfx.skill(e.id); break;
    case 'bossSpawn': case 'alarm': sfx.bossSpawn(); break;
    case 'rush': sfx.rush(); break;
    case 'end': if (e.result === 'win') sfx.win(); else sfx.lose(); break;
  }
}
