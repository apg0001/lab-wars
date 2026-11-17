import { describe, expect, it } from 'vitest';
import { Battle, type Fighter } from '../src/sim/battle';
import { STAGE_BY_ID } from '../src/data/stages';
import { UNIT_BY_ID, GACHA_UNITS } from '../src/data/units';
import { makeLoadout, newSave, unitStats } from '../src/sim/progression';
import type { CombatStats, HitEffects } from '../src/data/types';

/** 장비 능력 단위 테스트: 전투 안쪽 함수를 직접 불러 조건을 고정한다. */
type Priv = {
  addFighter: (side: 'ally' | 'enemy', defId: string, name: string, look: unknown, tier: number, stats: CombatStats, x: number, reward: number) => Fighter;
  spawnEnemy: (id: string, boss: boolean, x: number) => Fighter;
  damageFighter: (f: Fighter, dmg: number, from: 'ally' | 'enemy') => void;
  applyHit: (f: Fighter, e: HitEffects) => void;
};

const LOOK = { kind: 'gear', variant: 'iron', color: '#fff' };
const base: CombatStats = { hp: 1e5, atk: 1, range: 22, speed: 0, interval: 1 };

function setup() {
  const b = new Battle(STAGE_BY_ID['1-1']!, makeLoadout(newSave()), 1, { cards: false });
  const p = b as unknown as Priv;
  const ally = (stats: Partial<CombatStats>, x = 400): Fighter => p.addFighter.call(b, 'ally', 'test', 'T', LOOK, 1, { ...base, ...stats }, x, 0);
  const foe = (x: number, id = 'paperwork', boss = false): Fighter => {
    const f = p.spawnEnemy.call(b, id, boss, x);
    f.stats.speed = 0;
    f.stats.atk = 0;
    f.hp = f.maxHp = 1000;
    return f;
  };
  const step = (sec: number): void => {
    for (let i = 0; i < Math.round(sec * 60); i++) b.step(1 / 60);
  };
  return { b, p, ally, foe, step };
}

describe('장비 능력', () => {
  it('화상: 0.5초마다 dps의 절반씩, 지속시간 동안 피해를 준다 (근접 공격이 건다)', () => {
    const { b, p, foe, ally, step } = setup();
    const e = foe(900);
    p.applyHit.call(b, e, { burn: { dps: 10, dur: 2 } });
    step(2.5);
    expect(e.hp).toBeCloseTo(1000 - 20, 5);
    expect(e.burnT).toBe(0);
    // 인두 같은 근접 유닛이 때리면 화상이 걸린다
    const target = foe(520);
    ally({ range: 30, burn: { dps: 6, dur: 3 } }, 500);
    step(0.4);
    expect(target.burnT).toBeGreaterThan(2);
  });

  it('둔화: 이동 속도가 mul배로 줄고 시간이 지나면 풀린다', () => {
    const { b, p, foe, step } = setup();
    const a = foe(1000);
    const c = foe(1000);
    a.stats.speed = c.stats.speed = 60;
    p.applyHit.call(b, a, { slow: { mul: 0.5, dur: 5 } });
    step(1);
    expect(1000 - a.x).toBeCloseTo((1000 - c.x) * 0.5, 0);
    step(5);
    expect(a.slowT).toBe(0);
  });

  it('빙결: 확률로 기절시키고 (보스는 40%만), 확률 0이면 아무 일 없다', () => {
    const { b, p, foe } = setup();
    const e = foe(900);
    p.applyHit.call(b, e, { freeze: { chance: 1, dur: 2 } });
    expect(e.stunT).toBe(2);
    expect(e.frozenT).toBe(2);
    const boss = foe(1000, 'prof1', true);
    p.applyHit.call(b, boss, { freeze: { chance: 1, dur: 2 } });
    expect(boss.stunT).toBeCloseTo(0.8);
    const f = foe(1100);
    p.applyHit.call(b, f, { freeze: { chance: 0, dur: 2 } });
    expect(f.stunT).toBe(0);
  });

  it('관통: 쏜 자리부터 대상 뒤 pierce까지 줄 위의 적을 모두 맞힌다', () => {
    const { foe, ally, step } = setup();
    const near = foe(500);
    const mid = foe(540);
    const far = foe(700);
    ally({ atk: 10, range: 165, pierce: 60 }, 400);
    step(0.8);
    expect(near.hp).toBe(990);
    expect(mid.hp).toBe(990);
    expect(far.hp).toBe(1000);
  });

  it('사망 폭발: 쓰러질 때 반경 안 적에게 피해와 자기 상태 이상을 준다', () => {
    const { b, p, foe, ally } = setup();
    const near = foe(450);
    const far = foe(800);
    const u = ally({ hp: 100, deathBurst: { dmg: 50, radius: 90 }, freeze: { chance: 1, dur: 1 } }, 400);
    p.damageFighter.call(b, u, 1000, 'enemy');
    expect(u.dead).toBe(true);
    expect(near.hp).toBe(950);
    expect(near.frozenT).toBe(1);
    expect(far.hp).toBe(1000);
  });

  it('보호막: 주기마다 반경 안 아군에게 막을 씌우고, 막이 피해를 먼저 막는다', () => {
    const { b, p, ally, step } = setup();
    const src = ally({ shield: { amount: 40, every: 5, radius: 100 } }, 400);
    const near = ally({ hp: 100 }, 450);
    const far = ally({ hp: 100 }, 700);
    step(1 / 60);
    expect([src.shield, near.shield, far.shield]).toEqual([40, 40, 0]);
    p.damageFighter.call(b, near, 30, 'enemy');
    expect(near.hp).toBe(100);
    expect(near.shield).toBe(10);
    p.damageFighter.call(b, near, 30, 'enemy');
    expect(near.hp).toBe(80);
    // 반경 0이면 자기만
    const self = ally({ shield: { amount: 25, every: 5, radius: 0 } }, 1000);
    const buddy = ally({ hp: 100 }, 1010);
    step(1 / 60);
    expect([self.shield, buddy.shield]).toEqual([25, 0]);
  });

  it('회복 구역: 반경 안 아군을 초당 hps씩 회복한다', () => {
    const { ally, step } = setup();
    ally({ healZone: { hps: 10, radius: 100 } }, 400);
    const hurt = ally({ hp: 100 }, 460);
    const out = ally({ hp: 100 }, 700);
    hurt.hp = 50;
    out.hp = 50;
    step(1);
    expect(hurt.hp).toBeCloseTo(60, 0);
    expect(out.hp).toBe(50);
  });

  it('카페인 생산: 살아 있는 동안 초당 카페인을 더 모은다', () => {
    const a = setup();
    const c = setup();
    a.ally({ caffeineGen: 2 });
    a.step(2);
    c.step(2);
    expect(a.b.caffeine - c.b.caffeine).toBeCloseTo(4, 1);
  });

  it('포탑: 주기마다 제자리 포탑을 세우고 (최대 수까지), 수명이 다하면 보상 없이 사라진다', () => {
    const { b, ally, step } = setup();
    const look = { kind: 'gear', variant: 'turret', color: '#fff' } as const;
    const owner = ally({ turret: { every: 1, max: 2, life: 2.5, hp: 50, atk: 5, range: 150, interval: 1, look } }, 400);
    step(1.05);
    const turrets = () => b.fighters.filter((f) => !f.dead && f.ownerUid === owner.uid);
    expect(turrets()).toHaveLength(1);
    const first = turrets()[0]!;
    expect(first.stats.speed).toBe(0);
    expect(first.x).toBeLessThan(owner.x);
    step(1);
    expect(turrets()).toHaveLength(2);
    step(1);
    expect(turrets()).toHaveLength(2); // 최대 2대
    const kills = b.kills;
    step(3);
    expect(turrets().length).toBeLessThanOrEqual(2);
    expect(first.dead).toBe(true);
    expect(b.kills).toBe(kills);
  });

  it('1회 부활: 처음 쓰러지면 HP 일부로 일어나고, 두 번째는 쓰러진다', () => {
    const { b, p, ally } = setup();
    const u = ally({ hp: 200, revive: { hpRatio: 0.5 } });
    p.damageFighter.call(b, u, 500, 'enemy');
    expect(u.dead).toBe(false);
    expect(u.hp).toBe(100);
    expect(b.drainEvents().some((e) => e.type === 'revive')).toBe(true);
    p.damageFighter.call(b, u, 500, 'enemy');
    expect(u.dead).toBe(true);
  });

  it('전장 연산 타격: 주기마다 전장의 모든 적에게 피해를 준다', () => {
    const { b, foe, ally, step } = setup();
    const es = [foe(600), foe(1000), foe(1500)];
    ally({ fieldStrike: { dmg: 30, every: 2 } }, 300);
    step(1.9);
    expect(es.map((e) => e.hp)).toEqual([1000, 1000, 1000]);
    step(0.2);
    expect(es.map((e) => e.hp)).toEqual([970, 970, 970]);
    expect(b.drainEvents().some((e) => e.type === 'strike')).toBe(true);
  });

  it('레벨·진화 배율은 장비 능력의 피해·막는 양에도 곱해진다', () => {
    const c = UNIT_BY_ID.cluster!;
    const s = unitStats(c, { level: 1, tier: 2 });
    expect(s.fieldStrike!.dmg).toBeCloseTo(c.fieldStrike!.dmg * 1.5, 1);
    expect(unitStats(UNIT_BY_ID.firewall!, { level: 1, tier: 3 }).shield!.amount).toBe(Math.round(UNIT_BY_ID.firewall!.shield!.amount * 2.25));
    expect(unitStats(UNIT_BY_ID.iron!, { level: 1, tier: 1 }).burn).toEqual(UNIT_BY_ID.iron!.burn);
  });

  it('뽑기 장비 28종: 등급 구성(레어 14 · 에픽 9 · 레전더리 5)과 능력이 데이터로 지정돼 있다', () => {
    expect(GACHA_UNITS.map((u) => `${u.id}:${u.rarity}`)).toEqual([
      'iron:rare', 'scope:rare', 'firewall:rare',
      'breadboard:rare', 'multimeter:rare', 'arduino:rare', 'logic:rare', 'ups:rare', 'pi:rare',
      'siggen:rare', 'router:rare', 'wafer:rare', 'debugger:rare', 'dish:rare',
      'cooler:epic', 'printer3d:epic',
      'tesla:epic', 'tower:epic', 'robotarm:epic', 'rack:epic', 'reflow:epic', 'emp:epic', 'fiber:epic',
      'cluster:legend', 'quantum:legend', 'accelerator:legend', 'npu:legend', 'tokamak:legend',
    ]);
    const count = (r: string) => GACHA_UNITS.filter((u) => u.rarity === r).length;
    expect([count('rare'), count('epic'), count('legend')]).toEqual([14, 9, 5]);
    // 모두 장비 그림, 서로 다른 그림, 영어 설정 글까지
    const variants = GACHA_UNITS.map((u) => u.look.variant);
    expect(GACHA_UNITS.every((u) => u.look.kind === 'gear' && u.en?.lore && u.lore)).toBe(true);
    expect(new Set(variants).size).toBe(variants.length);
    // 레전더리는 모두 비싸고 대기가 길다
    for (const u of GACHA_UNITS.filter((x) => x.rarity === 'legend')) {
      expect(u.cost, u.id).toBeGreaterThanOrEqual(150);
      expect(u.cooldown, u.id).toBeGreaterThanOrEqual(20);
    }
    // 새 능력도 하나씩은 쓰인다
    expect(UNIT_BY_ID.tesla!.chain && UNIT_BY_ID.logic!.armorShred && UNIT_BY_ID.robotarm!.knockup).toBeTruthy();
    expect(UNIT_BY_ID.multimeter!.lifesteal && UNIT_BY_ID.dish!.airMul && UNIT_BY_ID.emp!.stunField && UNIT_BY_ID.router!.turret?.speed).toBeTruthy();
    expect(UNIT_BY_ID.iron!.burn).toBeTruthy();
    expect(UNIT_BY_ID.scope!.slow && UNIT_BY_ID.scope!.pierce).toBeTruthy();
    expect(UNIT_BY_ID.firewall!.shield).toBeTruthy();
    expect(UNIT_BY_ID.cooler!.freeze && UNIT_BY_ID.cooler!.deathBurst).toBeTruthy();
    expect(UNIT_BY_ID.printer3d!.turret).toBeTruthy();
    expect(UNIT_BY_ID.cluster!.fieldStrike && UNIT_BY_ID.cluster!.revive).toBeTruthy();
    // 레전더리는 비싸고 대기가 길다
    expect(UNIT_BY_ID.cluster!.cost).toBeGreaterThanOrEqual(150);
    expect(UNIT_BY_ID.cluster!.cooldown).toBeGreaterThanOrEqual(20);
  });

  it('장비를 넣은 전투도 같은 시드면 같은 결과가 나온다', () => {
    const run = () => {
      const s = newSave();
      for (const u of GACHA_UNITS) s.gear.owned[u.id] = 1;
      s.loadout = ['grunt', ...GACHA_UNITS.map((u) => u.id)];
      const b = new Battle(STAGE_BY_ID['1-5']!, makeLoadout(s), 3, { cards: false });
      for (let i = 0; i < 60 * 90; i++) {
        b.step(1 / 60);
        if (i % 30 === 0) for (const d of b.loadout.deck) b.summon(d.def.id);
      }
      return [b.result, b.kills, Math.round(b.enemy.hp), Math.round(b.ally.hp)];
    };
    expect(run()).toEqual(run());
  });
});
