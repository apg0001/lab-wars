import { describe, expect, it } from 'vitest';
import { Battle, ENEMY_FRONT, LASER, type Fighter } from '../src/sim/battle';
import { STAGE_BY_ID, type StageDef } from '../src/data/stages';
import { makeLoadout, newSave } from '../src/sim/progression';
import type { CombatStats } from '../src/data/types';

type Priv = {
  addFighter: (side: 'ally' | 'enemy', defId: string, name: string, look: unknown, tier: number, stats: CombatStats, x: number, reward: number) => Fighter;
};
const LOOK = { kind: 'gear', variant: 'iron', color: '#fff' };

function setup(stage: StageDef) {
  const st = { ...stage, spawnEvery: 1e9, rush: { first: 1e9, every: 1e9, size: 0 }, boss: undefined, extraBosses: [] };
  const b = new Battle(st, makeLoadout(newSave()), 1, { cards: false });
  b.ally.hp = b.ally.maxHp = 1e9;
  b.enemy.hp = b.enemy.maxHp = 1e9;
  const step = (sec: number): void => { for (let i = 0; i < Math.round(sec * 60); i++) b.step(1 / 60); };
  const ally = (x: number): Fighter =>
    (b as unknown as Priv).addFighter.call(b, 'ally', 'test', 'T', LOOK, 1, { hp: 1e6, atk: 0, range: 22, speed: 0, interval: 1 }, x, 0);
  return { b, step, ally };
}

describe('교수님 레이저 빔', () => {
  it('사거리 밖에 아무도 없으면 꺼져 있다', () => {
    const { b, step, ally } = setup(STAGE_BY_ID['2-5']!);
    ally(ENEMY_FRONT - 400);
    step(2);
    expect(b.beam).toBeNull();
  });

  it('교수실에 가장 가까운 아군을 빔으로 계속 지지고, 초당 피해는 예전 한 발 / 1.2초와 같다', () => {
    const { b, step, ally } = setup(STAGE_BY_ID['2-5']!);
    const far = ally(ENEMY_FRONT - 220);
    const near = ally(ENEMY_FRONT - 80);
    step(6);
    expect(b.beam?.uid).toBe(near.uid);
    expect(far.hp).toBe(1e6);
    const dps = b.towerDmg() / LASER.shotEvery;
    expect(1e6 - near.hp).toBeGreaterThan(dps * 5.5);
    expect(1e6 - near.hp).toBeLessThan(dps * 6.5);
    // 가까운 아군이 쓰러지면 다음 아군으로 빔이 쓸려 간다
    near.hp = 0;
    near.dead = true;
    step(0.5);
    expect(b.beam?.uid).toBe(far.uid);
    expect(Math.abs(b.beam!.x - far.x)).toBeLessThan(5);
  });
});
