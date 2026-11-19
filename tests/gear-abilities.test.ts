import { describe, expect, it } from 'vitest';
import { Battle, ENEMY_FRONT, type Fighter } from '../src/sim/battle';
import { ENDLESS_BUG_BOSSES, ENDLESS_ENEMIES, SIDE_STAGES, STAGES, STAGE_BY_ID, endlessBoss, endlessStage } from '../src/data/stages';
import { ENEMY_BY_ID, ENEMIES } from '../src/data/enemies';
import { UNITS, GACHA_UNITS } from '../src/data/units';
import { makeLoadout, newSave } from '../src/sim/progression';
import { botSquad, playBot } from '../src/sim/bot';
import { drawCharacter } from '../src/render/characters';
import type { CombatStats, HitEffects, Look } from '../src/data/types';

/** 0.17.0 장비 22종·버그 군단 능력 단위 테스트: 전투 안쪽 함수를 직접 불러 조건을 고정한다. */
type Priv = {
  addFighter: (side: 'ally' | 'enemy', defId: string, name: string, look: unknown, tier: number, stats: CombatStats, x: number, reward: number) => Fighter;
  spawnEnemy: (id: string, boss: boolean, x: number) => Fighter;
  damageFighter: (f: Fighter, dmg: number, from: 'ally' | 'enemy') => number;
  hitFrom: (src: Fighter | undefined, o: Fighter, dmg: number, side: 'ally' | 'enemy') => void;
  applyHit: (f: Fighter, e: HitEffects) => void;
};

const LOOK = { kind: 'gear', variant: 'iron', color: '#fff' };
const base: CombatStats = { hp: 1e5, atk: 1, range: 22, speed: 0, interval: 1 };

// 아군은 연구실 포탑(사거리 ~480) 밖, 적은 교수실 포탑(1360~) 밖에서 싸운다
function setup() {
  const b = new Battle(STAGE_BY_ID['1-1']!, makeLoadout(newSave()), 1, { cards: false });
  const p = b as unknown as Priv;
  const ally = (stats: Partial<CombatStats>, x = 800): Fighter => p.addFighter.call(b, 'ally', 'test', 'T', LOOK, 1, { ...base, ...stats }, x, 0);
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

describe('새 장비 능력', () => {
  it('연쇄 번개: 맞힌 적에서 range 안의 가장 가까운 적으로 jumps번, 튈 때마다 falloff배', () => {
    const { b, foe, ally, step } = setup();
    const first = foe(820);
    const second = foe(880);
    const third = foe(960);
    const far = foe(1300);
    ally({ atk: 20, chain: { jumps: 3, range: 100, falloff: 0.5 } });
    step(0.35);
    expect([first.hp, second.hp, third.hp, far.hp]).toEqual([980, 990, 995, 1000]);
    expect(b.fx.some((e) => e.kind === 'arc')).toBe(true);
  });

  it('방어 깎기: 걸린 동안 받는 피해가 mul배, 시간이 지나면 풀린다', () => {
    const { b, p, foe, step } = setup();
    const e = foe(900);
    p.applyHit.call(b, e, { armorShred: { mul: 1.5, dur: 2 } });
    p.damageFighter.call(b, e, 10, 'ally');
    expect(e.hp).toBe(985);
    step(2.1);
    expect(e.shredT).toBe(0);
    p.damageFighter.call(b, e, 10, 'ally');
    expect(e.hp).toBe(975);
  });

  it('띄우기: 확률로 공중에 띄워 기절시키고, 보스는 면역이다', () => {
    const { b, p, foe } = setup();
    const e = foe(900);
    p.applyHit.call(b, e, { knockup: { chance: 1, dur: 1 } });
    expect([e.stunT, e.airT, e.airDur]).toEqual([1, 1, 1]);
    const boss = foe(1000, 'prof1', true);
    p.applyHit.call(b, boss, { knockup: { chance: 1, dur: 1 } });
    expect([boss.stunT, boss.airT]).toEqual([0, 0]);
  });

  it('흡혈: 준 피해의 ratio만큼 자기 HP를 회복한다 (최대 HP까지)', () => {
    const { foe, ally, step } = setup();
    foe(820);
    const u = ally({ hp: 100, atk: 20, lifesteal: 0.5 });
    u.hp = 50;
    step(0.35);
    expect(u.hp).toBe(60);
  });

  it('대공 배율: 공중 적에게만 피해가 airMul배', () => {
    const { b, p, foe, ally } = setup();
    const src = ally({ range: 200, airMul: 3 });
    const air = foe(900, 'plane');
    const ground = foe(900);
    p.hitFrom.call(b, src, air, 10, 'ally');
    p.hitFrom.call(b, src, ground, 10, 'ally');
    expect([air.hp, ground.hp]).toEqual([970, 990]);
  });

  it('기절 장판: 주기마다 반경 안 상대만 기절 (보스는 40%), 상대가 없으면 기다린다', () => {
    const { foe, ally, step } = setup();
    const src = ally({ stunField: { every: 5, radius: 100, dur: 1 } });
    step(3);
    expect(src.fieldCd).toBeLessThanOrEqual(0); // 아무도 없어서 기다리는 중
    const near = foe(860);
    const far = foe(1100);
    const boss = foe(870, 'prof1', true);
    step(1 / 60);
    expect(near.stunT).toBeGreaterThan(0.9);
    expect(far.stunT).toBe(0);
    expect(boss.stunT).toBeCloseTo(0.4, 1);
    expect(src.fieldCd).toBeCloseTo(5, 1);
  });

  it('걸어가는 소환물: speed가 있는 포탑 스펙은 앞으로 걸어가는 패킷이 된다', () => {
    const { b, ally, step } = setup();
    const look = { kind: 'gear', variant: 'packet', color: '#fff' } as const;
    const owner = ally({ turret: { every: 1, max: 3, life: 5, hp: 40, atk: 5, range: 20, interval: 1, speed: 60, look } }, 600);
    step(1.05);
    const mine = b.fighters.filter((f) => !f.dead && f.ownerUid === owner.uid);
    expect(mine).toHaveLength(1);
    expect(mine[0]!.name).toBe('패킷');
    const x0 = mine[0]!.x;
    step(1);
    expect(mine[0]!.x - x0).toBeGreaterThan(50);
  });
});

describe('무한 모드 버그 군단 능력', () => {
  it('분열: 쓰러지면 HP·크기가 줄어든 같은 적 둘로 갈라지고, 갈라진 쪽은 다시 갈라지지 않는다', () => {
    const { b, p, foe } = setup();
    const c = foe(900, 'conflict');
    p.damageFighter.call(b, c, 5000, 'ally');
    expect(c.dead).toBe(true);
    const kids = b.fighters.filter((f) => !f.dead && f.defId === 'conflict');
    expect(kids).toHaveLength(2);
    expect(kids.map((k) => k.maxHp)).toEqual([450, 450]);
    expect(kids.every((k) => k.splitChild && k.look.scale === 0.75 && !k.stats.split)).toBe(true);
    p.damageFighter.call(b, kids[0]!, 5000, 'ally');
    expect(b.fighters.filter((f) => !f.dead && f.defId === 'conflict')).toHaveLength(1);
    expect(b.kills).toBe(2);
  });

  it('성장: 최대 HP와 몸집이 초당 rate만큼 커지다 max배에서 멈춘다', () => {
    const { b, p, step } = setup();
    const leak = p.spawnEnemy.call(b, 'leak', false, 1200);
    leak.stats.speed = 0;
    leak.stats.atk = 0;
    const max0 = leak.maxHp;
    step(10);
    expect(leak.maxHp / max0).toBeCloseTo(1.6, 1);
    expect(leak.hp).toBeCloseTo(leak.maxHp, 5);
    expect(leak.look.scale!).toBeGreaterThan(1.2);
    // 데이터의 그림은 그대로 (다른 적과 겉모습을 나눠 쓰지 않는다)
    expect(ENEMY_BY_ID.leak!.look.scale).toBeUndefined();
    step(30);
    expect(leak.maxHp / max0).toBeCloseTo(2.5, 5);
  });

  it('재출현: 처음 쓰러지면 보상 없이 출발점으로 돌아가 HP 일부로 다시 오고, 두 번째는 쓰러진다', () => {
    const { b, p, foe } = setup();
    const l = foe(900, 'loop');
    p.damageFighter.call(b, l, 5000, 'ally');
    expect(l.dead).toBe(false);
    expect(l.x).toBe(ENEMY_FRONT + 20);
    expect(l.hp).toBe(700);
    expect([b.kills, b.killReward]).toEqual([0, 0]);
    p.damageFighter.call(b, l, 5000, 'ally');
    expect(l.dead).toBe(true);
    expect(b.kills).toBe(1);
  });

  it('카페인 흡수: 적이 맞힐 때마다 연구실 카페인을 빼앗는다 (0 아래로는 안 내려간다)', () => {
    const { b, p, ally } = setup();
    const out = p.spawnEnemy.call(b, 'outage', false, 900);
    const victim = ally({ hp: 500 });
    b.caffeine = 50;
    p.hitFrom.call(b, out, victim, 5, 'enemy');
    expect(b.caffeine).toBe(47);
    b.caffeine = 1;
    p.hitFrom.call(b, out, victim, 5, 'enemy');
    expect(b.caffeine).toBe(0);
  });

  it('무한 모드에만, 판이 오를수록 하나씩 합류한다', () => {
    const ids = ENDLESS_ENEMIES.map((e) => e.id);
    const poolIds = (n: number) => endlessStage(n).pool.map((p) => p.id);
    expect(ids.filter((id) => poolIds(2).includes(id))).toEqual([]);
    expect(ids.filter((id) => poolIds(3).includes(id))).toEqual(['segfault']);
    expect(ids.filter((id) => poolIds(15).includes(id))).toEqual(['segfault', 'leak', 'loop', 'conflict']);
    expect(ids.filter((id) => poolIds(25).includes(id))).toEqual(ids);
    expect(ENDLESS_ENEMIES.map((e) => e.from)).toEqual([3, 6, 10, 15, 20, 25]);
    // 캠페인·외전에는 나오지 않는다
    const bugIds = new Set([...ids, ...ENDLESS_BUG_BOSSES.map((x) => x.id)]);
    for (const s of [...STAGES, ...SIDE_STAGES]) {
      expect(s.pool.some((p) => bugIds.has(p.id)), s.id).toBe(false);
      expect(bugIds.has(s.boss ?? ''), s.id).toBe(false);
    }
    // 모두 영어 이름·역할·도감 설명이 있다
    for (const id of bugIds) expect(ENEMY_BY_ID[id]!.en?.desc, id).toBeTruthy();
  });

  it('버그 보스: 30판부터 10판마다 커널 패닉·레거시 코드가 번갈아, 사이 보스 판은 원래 순환', () => {
    expect([5, 10, 25].map(endlessBoss)).toEqual(['prof2', 'reviewer2', 'dean']);
    expect([30, 35, 40, 45, 50, 60].map(endlessBoss)).toEqual(['kernelpanic', 'president', 'legacy', 'tenure', 'kernelpanic', 'legacy']);
    expect(endlessBoss(31)).toBeUndefined();
    expect(endlessStage(40).boss).toBe('legacy');
    expect(ENEMY_BY_ID.kernelpanic!.boss && ENEMY_BY_ID.legacy!.boss).toBeTruthy();
  });

  it('버그 보스가 나오는 무한 모드 판도 같은 시드면 같은 결과가 나온다', () => {
    const run = () => {
      const s = newSave();
      for (const u of GACHA_UNITS) s.gear.owned[u.id] = 1;
      s.loadout = botSquad(s);
      const b = new Battle(endlessStage(30), makeLoadout(s), 5, { cards: false });
      playBot(b, 60, 11);
      return [b.result, b.kills, Math.round(b.enemy.hp), Math.round(b.ally.hp)];
    };
    expect(run()).toEqual(run());
  });
});

describe('봇 편성과 그림', () => {
  it('모든 유닛을 가지면 봇은 9칸을 서로 다르게, 대공 유닛을 넣고 경제 유닛은 하나까지만 쓴다', () => {
    const s = newSave();
    for (const u of GACHA_UNITS) s.gear.owned[u.id] = 1;
    for (const st of STAGES) s.stars[st.id] = 1;
    s.subs = UNITS.filter((u) => u.unlock.subscribe).map((u) => u.id);
    const squad = botSquad(s);
    expect(new Set(squad).size).toBe(9);
    const defs = squad.map((id) => UNITS.find((u) => u.id === id)!);
    expect(defs.some((u) => u.range >= 100)).toBe(true);
    expect(defs.filter((u) => u.caffeineGen && !u.aura).length).toBeLessThanOrEqual(1);
  });

  it('모든 장비·버그 그림이 Mk.I~III에서 오류 없이 그려진다', () => {
    const calls: string[] = [];
    const store: Record<string | symbol, unknown> = {};
    const ctx = new Proxy(store, {
      get: (o, k) => {
        if (k in o) return o[k];
        if (k === 'measureText') return () => ({ width: 10 });
        if (k === 'getTransform') return () => ({ a: 1 });
        return (...args: unknown[]) => {
          if (args.some((a) => typeof a === 'number' && !Number.isFinite(a))) calls.push(String(k));
        };
      },
      set: (o, k, v) => {
        o[k] = v;
        return true;
      },
    }) as unknown as CanvasRenderingContext2D;
    const looks: Look[] = [
      ...GACHA_UNITS.map((u) => u.look),
      ...GACHA_UNITS.flatMap((u) => (u.turret ? [u.turret.look] : [])),
      ...ENEMIES.filter((e) => e.look.kind === 'glitch').map((e) => e.look),
    ];
    for (const look of looks) {
      for (const tier of [1, 2, 3]) {
        for (const swing of [0, 1]) drawCharacter(ctx, look, { walk: 1.3, swing, tier, time: 2.7, moving: swing === 0 }, 0, 0, 1);
      }
    }
    expect(calls).toEqual([]);
  });
});
