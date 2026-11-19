import { describe, expect, it } from 'vitest';
import { Battle, type BattleEvent, type Fighter } from '../src/sim/battle';
import { FINAL_STAGE, SIDE_CHAPTERS, SIDE_STAGES, STAGE_BY_ID, TIME_LIMIT } from '../src/data/stages';
import { ENEMY_BY_ID } from '../src/data/enemies';
import { UNIT_BY_ID } from '../src/data/units';
import { applyOutcome, isStageOpen, makeLoadout, newSave } from '../src/sim/progression';
import { SCENES } from '../src/story/script';
import { STORY_EN } from '../src/story/en';
import { STORY_ORDER, scenesOfStage } from '../src/story/unlock';
import type { CombatStats } from '../src/data/types';

/** 외전 4~7 특수 규칙: 카운트다운 · 생성형 복제 · 자동 리뷰 · 번레이트 · 순간 정전 */
type Priv = {
  addFighter: (side: 'ally' | 'enemy', defId: string, name: string, look: unknown, tier: number, stats: CombatStats, x: number, reward: number) => Fighter;
  spawnEnemy: (id: string, boss: boolean, x: number) => Fighter;
  speedMul: (f: Fighter) => number;
  atkRateMul: (f: Fighter) => number;
  computeAuras: () => void;
};

const LOOK = { kind: 'gear', variant: 'iron', color: '#fff' };
const BASE: CombatStats = { hp: 1e5, atk: 0, range: 22, speed: 0, interval: 1 };

function setup(stageId: string, seed = 1) {
  // 규칙만 보도록 적 출현·러시·보스 등장을 끈다
  const st = { ...STAGE_BY_ID[stageId]!, spawnEvery: 1e9, boss: undefined };
  st.rush = { ...st.rush, first: 1e9 };
  const b = new Battle(st, makeLoadout(newSave()), seed, { cards: false });
  const p = b as unknown as Priv;
  // 전투가 끝나지 않게 건물을 단단하게
  b.ally.hp = b.ally.maxHp = 1e9;
  b.enemy.hp = b.enemy.maxHp = 1e9;
  const ally = (stats: Partial<CombatStats> = {}, x = 400): Fighter => p.addFighter.call(b, 'ally', 'test', 'T', LOOK, 1, { ...BASE, ...stats }, x, 0);
  const events: BattleEvent[] = [];
  const step = (sec: number): void => {
    for (let i = 0; i < Math.round(sec * 60); i++) {
      b.step(1 / 60);
      events.push(...b.drainEvents());
    }
  };
  /** 직접 부른 보스: 제자리에서 소환·발 구르기 없이 특수 패턴만 */
  const boss = (id: string, x: number): Fighter => {
    const f = p.spawnEnemy.call(b, id, true, x);
    f.stats.speed = 0;
    f.stats.atk = 0;
    f.summonCd = f.stompCd = 1e9;
    return f;
  };
  return { b, p, st, ally, step, events, boss };
}

describe('외전 4~7 스테이지', () => {
  it('외전은 8개, 외전 4~8은 스테이지 5개씩이고 기존 외전보다 곡선 뒤쪽에 있다', () => {
    expect(SIDE_CHAPTERS.map((c) => c.id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(SIDE_STAGES).toHaveLength(40);
    for (const n of [4, 5, 6, 7, 8]) {
      const ss = SIDE_STAGES.filter((s) => s.side === n);
      expect(ss.map((s) => s.id)).toEqual([1, 2, 3, 4, 5].map((i) => `S${n}-${i}`));
      expect(ss[4]!.boss).toBe(SIDE_CHAPTERS[n - 1]!.boss);
      expect(ENEMY_BY_ID[ss[4]!.boss!]).toBeTruthy();
      for (const s of ss) for (const p of s.pool) expect(ENEMY_BY_ID[p.id], `${s.id} ${p.id}`).toBeTruthy();
    }
    const from = (n: number): number => SIDE_CHAPTERS[n - 1]!.from;
    expect(from(4)).toBeGreaterThan(from(3));
    expect(from(5)).toBeGreaterThan(from(4));
    expect(from(6)).toBeGreaterThan(from(5));
    expect(from(7)).toBeGreaterThan(from(6));
    expect(from(8)).toBeGreaterThan(from(7));
    // 카운트다운은 시간 제한이 짧다
    expect(STAGE_BY_ID['S4-1']!.timeLimit).toBeLessThan(TIME_LIMIT.normal);
    expect(STAGE_BY_ID['S4-5']!.timeLimit).toBeLessThan(TIME_LIMIT.boss);
    expect(STAGE_BY_ID['S5-1']!.timeLimit).toBe(TIME_LIMIT.normal);
  });

  it('엔딩 뒤에 열리고, 외전 안에서는 차례로 연다', () => {
    const s = newSave();
    for (const n of [4, 5, 6, 7, 8]) expect(isStageOpen(s, STAGE_BY_ID[`S${n}-1`]!)).toBe(false);
    s.stars[FINAL_STAGE.id] = 1;
    for (const n of [4, 5, 6, 7, 8]) {
      expect(isStageOpen(s, STAGE_BY_ID[`S${n}-1`]!)).toBe(true);
      expect(isStageOpen(s, STAGE_BY_ID[`S${n}-2`]!)).toBe(false);
    }
    applyOutcome(s, STAGE_BY_ID['S7-1']!, true, 0.9, 0);
    expect(isStageOpen(s, STAGE_BY_ID['S7-2']!)).toBe(true);
    expect(isStageOpen(s, STAGE_BY_ID['S7-3']!)).toBe(false);
  });

  it('스테이지마다 장면이 있고 (도입·보스·클리어 포함) 영어 대본도 있다', () => {
    for (const n of [4, 5, 6, 7, 8]) {
      for (const id of [`side${n}-intro`, `side${n}-boss`, `side${n}-clear`, ...[1, 2, 3, 4].map((i) => `st-S${n}-${i}`)]) {
        expect(SCENES[id], id).toBeTruthy();
        expect(STORY_EN[id]!.lines.length, id).toBe(SCENES[id]!.lines.length);
        expect(STORY_ORDER).toContain(id);
      }
      expect(scenesOfStage(STAGE_BY_ID[`S${n}-1`]!).before).toEqual([`side${n}-intro`, `st-S${n}-1`]);
      expect(scenesOfStage(STAGE_BY_ID[`S${n}-5`]!)).toEqual({ before: [`side${n}-boss`], after: [`side${n}-clear`] });
    }
  });

  it('UPS는 순간 정전 보호 반경을 데이터로 가진다', () => {
    expect(UNIT_BY_ID['ups']!.blipGuard).toBe(140);
  });
});

describe('카운트다운 (외전 4)', () => {
  it('적 이동·공격 속도가 시간 제한에 걸쳐 1 → 1.5로 오른다 (아군은 그대로)', () => {
    const { b, p, st, ally, step } = setup('S4-1');
    const foe = p.spawnEnemy.call(b, 'citation', false, 1200);
    const me = ally();
    expect(b.countdownMul).toBe(1);
    expect(p.speedMul.call(b, foe)).toBeCloseTo(1);
    step(st.timeLimit! / 2);
    expect(b.countdownMul).toBeCloseTo(1.25, 2);
    expect(p.speedMul.call(b, foe)).toBeCloseTo(1.25, 2);
    expect(p.atkRateMul.call(b, foe)).toBeCloseTo(1.25, 2);
    expect(p.speedMul.call(b, me)).toBe(1);
    (b as { t: number }).t = st.timeLimit! - 0.01;
    expect(b.countdownMul).toBeCloseTo(1.5, 2);
  });

  it('제출 시스템은 시간이 절반을 넘으면 접속 폭주로 모든 아군을 멈춘다', () => {
    const { b, st, ally, step, boss } = setup('S4-5');
    boss('submitsys', 1500);
    const far = ally({}, 300);
    step(10);
    expect(far.stunT).toBe(0);
    (b as { t: number }).t = st.timeLimit! * 0.5;
    step(3.1);
    expect(far.stunT).toBeGreaterThan(1);
    const ov = ENEMY_BY_ID['submitsys']!.boss!.overload!;
    step(ov.every - 1);
    expect(far.stunT).toBe(0);
    step(1.1);
    expect(far.stunT).toBeGreaterThan(1);
  });
});

describe('생성형 복제 (외전 5)', () => {
  it('주기마다 최근 소환한 유닛을 능력치 60%로 적 편에 복제한다', () => {
    const { b, st, step } = setup('S5-1');
    const cp = st.mods!.copy!;
    const entry = b.loadout.deck[0]!;
    b.caffeine = 1000;
    expect(b.summon(entry.def.id)).toBe(true);
    expect(b.recentSummons).toEqual([entry.def.id]);
    step(cp.every + 0.05);
    const copies = b.fighters.filter((f) => f.copy);
    expect(copies.length).toBe(entry.def.count ?? 1);
    for (const c of copies) {
      expect(c.side).toBe('enemy');
      expect(c.defId).toBe(entry.def.id);
      expect(c.look.kind).toBe(entry.def.look.kind);
      expect(c.maxHp).toBe(Math.round(entry.stats.hp * cp.mul));
      expect(c.stats.atk).toBeCloseTo(entry.stats.atk * cp.mul);
      expect(c.maxHp).toBeLessThan(entry.stats.hp);
    }
  });

  it('최근 recent번만 기억하고, 같은 시드면 같은 유닛을 고른다', () => {
    const pick = (seed: number): string[] => {
      const { b, st, step } = setup('S5-1', seed);
      const ids = b.loadout.deck.map((d) => d.def.id);
      for (let i = 0; i < 9; i++) {
        b.caffeine = 1000;
        for (const k of Object.keys(b.unitCd)) b.unitCd[k] = 0;
        b.summon(ids[i % ids.length]!);
      }
      expect(b.recentSummons.length).toBe(st.mods!.copy!.recent);
      const out: string[] = [];
      for (let k = 0; k < 4; k++) {
        step(st.mods!.copy!.every);
        for (const f of b.fighters) if (f.copy && !out.includes(`${f.uid}`)) out.push(`${f.uid}`, f.defId);
      }
      return out.filter((_, i) => i % 2 === 1);
    };
    const a = pick(5);
    expect(a.length).toBeGreaterThan(0);
    expect(pick(5)).toEqual(a);
  });

  it('소환한 적이 없으면 복제하지 않는다', () => {
    const { b, st, step } = setup('S5-2');
    step(st.mods!.copy!.every * 2 + 0.1);
    expect(b.fighters.some((f) => f.copy)).toBe(false);
  });
});

describe('자동 리뷰 AI (외전 5 보스)', () => {
  it('주기마다 주변 아군의 능력(보호막·회복·오라)을 막고 피해를 준다', () => {
    const { b, p, ally, step, boss } = setup('S5-5');
    boss('autoreview', 700);
    const sp = ENEMY_BY_ID['autoreview']!.boss!.silence!;
    const shielded = ally({ hp: 1000 }, 600);
    shielded.shield = 50;
    const auraUnit = ally({ aura: { atkMul: 1.5, radius: 200 } }, 620);
    const buddy = ally({}, 640);
    const healer = ally({ heal: { amount: 30, every: 1, radius: 200 } }, 630);
    const far = ally({}, 100);
    p.computeAuras.call(b);
    expect(buddy.auraMul).toBe(1.5);
    step(sp.every * 0.6 + 0.05);
    for (const f of [shielded, auraUnit, buddy, healer]) expect(f.silenceT).toBeGreaterThan(sp.dur - 0.2);
    expect(far.silenceT).toBe(0);
    expect(shielded.shield).toBe(0);
    expect(shielded.hp).toBeLessThan(1000);
    // 막힌 동안 오라·회복이 꺼진다
    const hurt = shielded.hp;
    step(1.5);
    expect(buddy.auraMul).toBe(1);
    expect(shielded.hp).toBe(hurt);
    // 풀리면 돌아온다
    step(sp.dur);
    expect(buddy.auraMul).toBe(1.5);
    expect(shielded.hp).toBeGreaterThan(hurt);
  });
});

describe('번레이트 (외전 6)', () => {
  it('카페인 충전이 시간 제한에 걸쳐 1 → to배로 줄고, 처치 보상 배율은 그대로다', () => {
    const { b, st } = setup('S6-1');
    const to = st.mods!.burnRate!.to;
    expect(to).toBeLessThan(0.5);
    const r0 = b.caffeineRegen;
    expect(b.burnMul).toBe(1);
    (b as { t: number }).t = st.timeLimit! / 2;
    expect(b.burnMul).toBeCloseTo((1 + to) / 2);
    expect(b.caffeineRegen).toBeCloseTo(r0 * (1 + to) / 2);
    (b as { t: number }).t = st.timeLimit!;
    expect(b.caffeineRegen).toBeCloseTo(r0 * to);
    expect(st.killMul).toBe(STAGE_BY_ID['S5-1']!.killMul);
  });
});

describe('순간 정전 (외전 7)', () => {
  it('주기마다 2초 전에 경고하고, 정전 때 아군을 기절시킨다', () => {
    const { st, ally, step, events } = setup('S7-1');
    const bl = st.mods!.blip!;
    const a = ally();
    step(bl.every - bl.warn - 0.1);
    expect(events.some((e) => e.type === 'blipWarn')).toBe(false);
    step(0.2);
    expect(events.filter((e) => e.type === 'blipWarn')).toHaveLength(1);
    expect(events.some((e) => e.type === 'blip')).toBe(false);
    step(bl.warn);
    expect(events.filter((e) => e.type === 'blip')).toHaveLength(1);
    if (!a.dead) expect(a.stunT).toBeGreaterThan(bl.stun - 0.2);
    step(bl.every);
    expect(events.filter((e) => e.type === 'blip')).toHaveLength(2);
    expect(events.filter((e) => e.type === 'blipWarn')).toHaveLength(2);
  });

  it('사라지는 아군은 시드에 따라 정해지고, 보상이 없다', () => {
    const run = (seed: number): number[] => {
      const { b, st, ally, step } = setup('S7-1', seed);
      const list = Array.from({ length: 30 }, (_, i) => ally({}, 250 + i * 10));
      step(st.mods!.blip!.every + 0.05);
      expect(b.killReward).toBe(0);
      return list.filter((f) => f.dead).map((f) => f.uid);
    };
    const a = run(3);
    expect(a.length).toBeGreaterThan(0);
    expect(a.length).toBeLessThan(30);
    expect(run(3)).toEqual(a);
  });

  it('UPS 보호 반경 안 아군은 기절도 증발도 하지 않는다', () => {
    const { st, ally, step } = setup('S7-1', 3);
    const ups = ally({ blipGuard: 140 }, 500);
    const near = Array.from({ length: 10 }, (_, i) => ally({}, 380 + i * 25));
    const far = Array.from({ length: 20 }, (_, i) => ally({}, 900 + i * 10));
    step(st.mods!.blip!.every + 0.05);
    for (const f of [ups, ...near]) {
      expect(f.dead).toBe(false);
      expect(f.stunT).toBe(0);
    }
    expect(far.every((f) => f.dead || f.stunT > 0)).toBe(true);
  });

  it('메인 차단기는 HP가 줄수록 정전 간격을 20 → 14 → 10초로 줄인다', () => {
    const { b, step, events, boss: spawnBoss } = setup('S7-5');
    expect(b.blipEvery()).toBe(20);
    const boss = spawnBoss('mainbreaker', 1500);
    expect(b.blipEvery()).toBe(20);
    boss.hp = boss.maxHp * 0.5;
    expect(b.blipEvery()).toBe(14);
    boss.hp = boss.maxHp * 0.2;
    expect(b.blipEvery()).toBe(10);
    // 간격이 줄면 다음 정전도 당겨진다
    step(10.05);
    expect(events.filter((e) => e.type === 'blip')).toHaveLength(1);
  });
});

describe('데이터 대기 (외전 8)', () => {
  it('아군 공격력이 70%에서 시작해 외장하드 택배를 잡을수록 오른다', () => {
    const { b, p, step } = setup('S8-1');
    expect(b.dataMul).toBeCloseTo(0.7);
    // 맞는 쪽이 받은 피해로 공격력 배율을 잰다
    const hit = (): number => {
      const foe = p.spawnEnemy.call(b, 'nda', false, 500);
      foe.stats.speed = 0;
      foe.stats.atk = 0;
      foe.hp = foe.maxHp = 1e6;
      const a = p.addFighter.call(b, 'ally', 'test', 'T', LOOK, 1, { ...BASE, atk: 100, range: 200 }, 450, 0);
      step(1.05);
      const dealt = 1e6 - foe.hp;
      a.dead = true;
      foe.dead = true;
      step(0.1);
      return dealt;
    };
    const before = hit();
    for (let i = 0; i < 5; i++) {
      const d = p.spawnEnemy.call(b, 'datadrive', false, 600);
      (b as unknown as { damageFighter: (f: Fighter, dmg: number, by: string) => void }).damageFighter.call(b, d, 1e6, 'ally');
    }
    expect(b.data).toBeGreaterThan(0.45);
    expect(b.data).toBeLessThanOrEqual(1);
    const after = hit();
    expect(after / before).toBeCloseTo(b.dataMul / 0.7, 1);
  });

  it('50초마다 중간보고: 데이터가 모자라면 적이 몰려오고, 넘으면 카페인을 준다', () => {
    const { b, step, events } = setup('S8-1');
    const dw = STAGE_BY_ID['S8-1']!.mods!.dataWait!;
    step(dw.every - 1);
    const n0 = b.alive('enemy').length;
    step(1.1);
    expect(b.reports).toBe(1);
    expect(b.alive('enemy').length - n0).toBe(dw.rush);
    expect(b.alive('enemy').filter((f) => f.defId === 'reqchange').length).toBeGreaterThanOrEqual(2);
    expect(events.some((e) => e.type === 'report' && !e.pass)).toBe(true);
    // 두 번째 보고는 need×2가 필요하다
    expect(b.reportNeed()).toBeCloseTo(dw.need * 2);
    b.data = 0.6;
    b.caffeine = 0;
    step(dw.every);
    expect(b.reports).toBe(2);
    expect(events.some((e) => e.type === 'report' && e.pass)).toBe(true);
    expect(b.caffeine).toBeGreaterThanOrEqual(dw.bonus);
  });

  it('협력사 상무님이 나와 있으면 중간보고가 35초마다로 당겨진다', () => {
    const { b, step, boss } = setup('S8-5');
    expect(b.reportEvery()).toBe(50);
    boss('exec', 1400);
    expect(b.reportEvery()).toBe(35);
    step(36);
    expect(b.reports).toBe(1);
    step(35);
    expect(b.reports).toBe(2);
  });

  it('다른 스테이지에는 영향이 없다', () => {
    const { b } = setup('S7-1');
    expect(b.dataMul).toBe(1);
    expect(b.nextReport).toBe(Infinity);
  });
});

