import { describe, expect, it } from 'vitest';
import { ALLY_FRONT, BREACH, Battle, ENEMY_FRONT, type Fighter } from '../src/sim/battle';
import { STAGE_BY_ID, endlessStage, type StageDef } from '../src/data/stages';
import { makeLoadout, newSave } from '../src/sim/progression';
import type { CombatStats } from '../src/data/types';

type Priv = {
  spawnEnemy: (id: string, boss: boolean, x: number, mul?: number) => Fighter | null;
  addFighter: (side: 'ally' | 'enemy', defId: string, name: string, look: unknown, tier: number, stats: CombatStats, x: number, reward: number) => Fighter;
  damageFighter: (f: Fighter, dmg: number, from: 'ally' | 'enemy') => number;
};
const LOOK = { kind: 'gear', variant: 'iron', color: '#fff' };

function setup(stage: StageDef) {
  const st = { ...stage, spawnEvery: 1e9, rush: { first: 1e9, every: 1e9, size: 0 }, boss: undefined, extraBosses: [] };
  const b = new Battle(st, makeLoadout(newSave()), 1, { cards: false });
  const p = b as unknown as Priv;
  b.ally.hp = b.ally.maxHp = 1e9;
  b.enemy.hp = b.enemy.maxHp = 1e9;
  const step = (sec: number): void => { for (let i = 0; i < Math.round(sec * 60); i++) b.step(1 / 60); };
  const ally = (x: number, stats: Partial<CombatStats> = {}): Fighter =>
    p.addFighter.call(b, 'ally', 'test', 'T', LOOK, 1, { hp: 1e5, atk: 1, range: 22, speed: 40, interval: 1, ...stats }, x, 0);
  return { b, p, step, ally };
}

describe('보스 돌파', () => {
  it('호통(HP 66%) 때 아군을 치고 지나 연구실 앞까지 돌진하고, 연구실을 직접 때린다', () => {
    const { b, p, step, ally } = setup(STAGE_BY_ID['3-10']!);
    const boss = p.spawnEnemy.call(b, 'reviewer2', true, ENEMY_FRONT - 200)!;
    const wall = ally(ENEMY_FRONT - 600, { speed: 0 });
    b.ally.hp = b.ally.maxHp = 5000;
    p.damageFighter.call(b, boss, boss.maxHp * 0.36, 'ally');
    expect(boss.breach).toBe('run');
    step(1.5); // 호통 기절이 풀리고
    step((ENEMY_FRONT - ALLY_FRONT) / BREACH.speed + 1);
    expect(boss.breach).toBe('in');
    expect(boss.x).toBeLessThanOrEqual(ALLY_FRONT + BREACH.stopAt + 1);
    expect(wall.hp).toBeLessThan(1e5); // 지나가며 쳤다
    const hp = b.ally.hp;
    step(5);
    expect(b.ally.hp).toBeLessThan(hp);
  });

  it('앞에 나가 있던 아군은 돌아서서 보스를 막으러 온다', () => {
    const { b, p, step, ally } = setup(STAGE_BY_ID['3-10']!);
    const boss = p.spawnEnemy.call(b, 'reviewer2', true, ALLY_FRONT + 300)!;
    boss.stats.speed = 0;
    boss.breach = 'in';
    const far = ally(ALLY_FRONT + 900);
    step(0.1);
    const x0 = far.x;
    step(3);
    expect(far.x).toBeLessThan(x0);
  });

  it('1장 보스와 무한 모드 동행 교수님은 돌파하지 않는다', () => {
    const one = setup(STAGE_BY_ID['1-10']!);
    const prof1 = one.p.spawnEnemy.call(one.b, 'prof1', true, ENEMY_FRONT - 200)!;
    one.p.damageFighter.call(one.b, prof1, prof1.maxHp * 0.4, 'ally');
    expect(prof1.breach).toBeUndefined();

    const st = endlessStage(30);
    const e = setup(st);
    const xb = st.extraBosses![0]!;
    const prof = e.p.spawnEnemy.call(e.b, xb.id, true, ENEMY_FRONT - 200, xb.mul)!;
    prof.noBreach = true;
    e.p.damageFighter.call(e.b, prof, prof.maxHp * 0.4, 'ally');
    expect(prof.breach).toBeUndefined();
  });
});
