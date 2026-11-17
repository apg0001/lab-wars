import { describe, expect, it } from 'vitest';
import { Battle, ENEMY_FRONT, type Fighter } from '../src/sim/battle';
import {
  ENDLESS_LASER_STEP, ENDLESS_TOWER_RAMP, OUTPOST_DIST, SIDE_STAGES, STAGES, STAGE_BY_ID, endlessStage, type StageDef,
} from '../src/data/stages';
import { ENEMY_BY_ID } from '../src/data/enemies';
import { makeLoadout, newSave } from '../src/sim/progression';

/** 적이 새로 나오지 않는 무한 n판 (전초기지·레이저만 확인) */
function quiet(n: number): StageDef {
  const s = endlessStage(n);
  return { ...s, spawnEvery: 1e9, rush: { first: 1e9, every: 1e9, size: 0 }, boss: undefined };
}

const run = (b: Battle, sec: number) => {
  for (let i = 0; i < Math.round(sec * 60); i++) b.step(1 / 60);
};

/** 죽지 않는 근접 아군 하나를 소환한다 */
function tankyGrunt(b: Battle): Fighter {
  b.caffeine = 1000;
  expect(b.summon('grunt')).toBe(true);
  const g = b.fighters.find((f) => f.side === 'ally')!;
  g.hp = g.maxHp = 1e9;
  return g;
}

type Priv = {
  applyHit: (f: Fighter, e: object) => void;
  knockback: (f: Fighter, d: number) => void;
  damageFighter: (f: Fighter, dmg: number, from: 'ally' | 'enemy') => number;
};

describe('무한 모드 화이트보드 전초기지', () => {
  it('15판부터 1개, 30판부터 2개, 교수실 앞 300·600에 선다', () => {
    for (const n of [1, 10, 14]) expect(endlessStage(n).outposts ?? [], `E-${n}`).toHaveLength(0);
    for (const n of [15, 20, 29]) expect(endlessStage(n).outposts, `E-${n}`).toHaveLength(1);
    for (const n of [30, 45, 80]) expect(endlessStage(n).outposts, `E-${n}`).toHaveLength(2);
    expect(endlessStage(30).outposts!.map((o) => o.dist)).toEqual(OUTPOST_DIST);
    // 판이 오를수록 HP·공격력·보상이 오른다
    const a = endlessStage(15).outposts![0]!;
    const z = endlessStage(40).outposts![0]!;
    expect(z.hp).toBeGreaterThan(a.hp);
    expect(z.atk).toBeGreaterThan(a.atk);
    expect(z.reward).toBeGreaterThan(a.reward);

    const b = new Battle(quiet(30), makeLoadout(newSave()), 1, { cards: false });
    b.step(1 / 60);
    expect(b.outposts().map((f) => f.x).sort((p, q) => p - q)).toEqual(OUTPOST_DIST.map((d) => ENEMY_FRONT - d).sort((p, q) => p - q));
    expect(b.outposts().every((f) => f.hp === endlessStage(30).outposts![0]!.hp)).toBe(true);
  });

  it('캠페인·외전에는 전초기지도 레이저 강화도 없다', () => {
    for (const s of [...STAGES, ...SIDE_STAGES]) {
      expect(s.outposts, s.id).toBeUndefined();
      expect(s.towerRamp, s.id).toBeUndefined();
    }
    const st = STAGE_BY_ID['1-1']!;
    const b = new Battle({ ...st, timeLimit: undefined }, makeLoadout(newSave()), 1, { cards: false });
    run(b, 200);
    expect(b.outposts()).toHaveLength(0);
    expect(b.fighters.some((f) => f.defId === 'whiteboard')).toBe(false);
    expect(b.laserTier).toBe(0);
    expect(b.towerDmg()).toBe(st.towerAtk);
  });

  it('아군은 전초기지를 부수기 전에는 지나가지 못하고, 적은 그냥 통과한다', () => {
    const b = new Battle(quiet(15), makeLoadout(newSave()), 1, { cards: false });
    b.step(1 / 60);
    const wb = b.outposts()[0]!;
    const g = tankyGrunt(b);
    wb.hp = wb.maxHp = 1e9;
    run(b, 40);
    expect(g.x).toBeLessThan(wb.x);
    expect(g.attacking).toBe(true);
    expect(wb.hp).toBeLessThan(1e9);
    expect(wb.x).toBe(ENEMY_FRONT - OUTPOST_DIST[0]!); // 제자리

    // 적은 전초기지에 막히지 않는다
    const spawn = (b as unknown as { spawnEnemy: (id: string, boss: boolean, x: number) => Fighter }).spawnEnemy;
    const memo = spawn.call(b, 'memo', false, wb.x + 40);
    run(b, 1);
    expect(memo.x).toBeLessThan(wb.x);

    // 부수면 지나간다
    (b as unknown as Priv).damageFighter.call(b, memo, 1e6, 'ally');
    wb.hp = 1;
    run(b, 15);
    expect(wb.dead).toBe(true);
    expect(g.x).toBeGreaterThan(wb.x);
  });

  it('가까운 지상 아군 발밑에 보드마커를 포물선으로 던진다 (작은 범위 피해)', () => {
    const b = new Battle(quiet(15), makeLoadout(newSave()), 1, { cards: false });
    b.step(1 / 60);
    const wb = b.outposts()[0]!;
    const g = tankyGrunt(b);
    g.x = wb.x - 150;
    let marker = null as null | (typeof b.projectiles)[number];
    for (let i = 0; i < 60 * 3 && !marker; i++) {
      b.step(1 / 60);
      marker = b.projectiles.find((p) => p.kind === 'marker') ?? null;
    }
    expect(marker).not.toBeNull();
    expect(marker!.side).toBe('enemy');
    expect(marker!.targetUid).toBeNull(); // 땅을 노린다
    expect(marker!.arc).toBeGreaterThan(0);
    expect(marker!.splash).toBe(endlessStage(15).outposts![0]!.splash);
    expect(marker!.dmg).toBeCloseTo(endlessStage(15).outposts![0]!.atk);
    run(b, 2);
    expect(g.hp).toBeLessThan(g.maxHp);
  });

  it('넉백·기절·빙결·띄우기 면역, 화상·둔화는 받는다', () => {
    const b = new Battle(quiet(15), makeLoadout(newSave()), 1, { cards: false });
    b.step(1 / 60);
    const wb = b.outposts()[0]!;
    const p = b as unknown as Priv;
    const x = wb.x;
    p.knockback.call(b, wb, 80);
    p.applyHit.call(b, wb, { freeze: { chance: 1, dur: 3 }, knockup: { chance: 1, dur: 2 }, burn: { dps: 20, dur: 3 }, slow: { mul: 0.5, dur: 3 } });
    expect(wb.kbT).toBe(0);
    expect(wb.frozenT).toBe(0);
    expect(wb.airT).toBe(0);
    expect(wb.burnT).toBeGreaterThan(0);
    expect(wb.slowT).toBeGreaterThan(0);
    wb.stunT = 5; // 기절 장판 등으로 걸려도 다음 틱에 풀린다
    run(b, 1);
    expect(wb.stunT).toBe(0);
    expect(wb.x).toBe(x);
    expect(wb.hp).toBeLessThan(wb.maxHp);
  });

  it('철거하면 배너·보상·카페인과 마커 파편이 나온다', () => {
    const b = new Battle(quiet(20), makeLoadout(newSave()), 1, { cards: false });
    b.step(1 / 60);
    const wb = b.outposts()[0]!;
    const caf = (b.caffeine = 0);
    (b as unknown as Priv).damageFighter.call(b, wb, wb.hp + 1, 'ally');
    expect(wb.dead).toBe(true);
    expect(b.killReward).toBe(endlessStage(20).outposts![0]!.reward);
    expect(b.kills).toBe(1);
    b.step(1 / 60);
    expect(b.caffeine).toBeGreaterThan(caf + Math.round(ENEMY_BY_ID.whiteboard!.reward * 0.6) - 1);
    expect(b.fx.some((e) => e.x === -1 && e.text?.includes('{megaphone}'))).toBe(true);
    expect(b.projectiles.filter((p) => p.kind === 'marker' && p.dmg === 0).length).toBeGreaterThanOrEqual(5);
    // 배너는 한 번만
    run(b, 0.3);
    expect(b.fx.filter((e) => e.x === -1 && e.text?.includes('{megaphone}'))).toHaveLength(1);
  });
});

describe('무한 모드 교수님 레이저 강화', () => {
  it('판마다 기존 곡선에 1 + 0.03n을 더 곱한다', () => {
    for (const n of [1, 15, 30, 60]) {
      const c = 19 + n * 0.75;
      expect(endlessStage(n).towerAtk).toBe(Math.round(10 * (1 + c * 0.12) * (1 + ENDLESS_LASER_STEP * n)));
    }
    expect(endlessStage(30).towerAtk / endlessStage(1).towerAtk).toBeGreaterThan((1 + 41.5 * 0.12) / (1 + 19.75 * 0.12) * 1.5);
    expect(endlessStage(30).towerRamp).toBe(ENDLESS_TOWER_RAMP);
  });

  it('전투 1분마다 +10%, 1·2·3분에 출력 단계가 오르고 배너가 뜬다', () => {
    const st = quiet(10);
    const b = new Battle(st, makeLoadout(newSave()), 1, { cards: false });
    const banners = () => b.fx.filter((e) => e.x === -1 && e.text?.includes('{anger}')).length;
    run(b, 59);
    expect(b.laserTier).toBe(0);
    expect(b.towerDmg()).toBeCloseTo(st.towerAtk * (1 + 0.1 * (b.t / 60)));
    run(b, 1.5);
    expect(b.laserTier).toBe(1);
    expect(banners()).toBe(1);
    run(b, 60);
    expect(b.laserTier).toBe(2);
    run(b, 60);
    expect(b.laserTier).toBe(3);
    expect(b.towerDmg()).toBeCloseTo(st.towerAtk * 1.3, 0);
    run(b, 120);
    expect(b.laserTier).toBe(3); // 단계는 3까지 (피해는 계속 오른다)
    expect(b.towerDmg()).toBeGreaterThan(st.towerAtk * 1.5);

    // 레이저가 실제로 그 피해와 단계로 나간다
    const g = tankyGrunt(b);
    g.x = ENEMY_FRONT - 100;
    let laser = null as null | (typeof b.projectiles)[number];
    for (let i = 0; i < 120 && !laser; i++) {
      b.step(1 / 60);
      laser = b.projectiles.find((p) => p.kind === 'laser') ?? null;
    }
    expect(laser?.power).toBe(3);
    expect(laser!.dmg).toBeCloseTo(b.towerDmg(), 0);
  });
});
