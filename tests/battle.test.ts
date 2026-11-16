import { describe, expect, it } from 'vitest';
import { Battle, ENEMY_FRONT, GROUND_Y } from '../src/sim/battle';
import { STAGE_BY_ID } from '../src/data/stages';
import { makeLoadout, newSave } from '../src/sim/progression';
import { playBot } from '../src/sim/bot';

const fresh = () => new Battle(STAGE_BY_ID['1-1']!, makeLoadout(newSave()), 1);

describe('전투 시뮬레이션', () => {
  it('카페인이 충전되고 소환하면 비용과 재소환 대기가 적용된다', () => {
    const b = fresh();
    expect(b.summon('grunt')).toBe(true);
    expect(b.caffeine).toBeCloseTo(20);
    expect(b.summon('grunt')).toBe(false); // 재소환 대기
    for (let i = 0; i < 60; i++) b.step(1 / 60);
    expect(b.caffeine).toBeCloseTo(25, 0);
    expect(b.summon('grunt')).toBe(true);
    expect(b.summon('keyboard')).toBe(false); // 미해금
  });

  it('근접 유닛은 공중 적에게 막히지 않고 지나친다', () => {
    const b = fresh();
    const spawn = (b as unknown as { spawnEnemy: (id: string, boss: boolean, x: number) => unknown }).spawnEnemy;
    spawn.call(b, 'plane', false, 260);
    b.summon('grunt');
    const grunt = b.fighters.find((f) => f.defId === 'grunt')!;
    for (let i = 0; i < 60 * 2; i++) b.step(1 / 60);
    expect(grunt.dead).toBe(false);
    expect(grunt.attacking).toBe(false);
    expect(grunt.x).toBeGreaterThan(260);
  });

  it('머그컵은 대기 시간이 있고 범위 안의 적에게 피해를 준다', () => {
    const b = fresh();
    const spawn = (b as unknown as { spawnEnemy: (id: string, boss: boolean, x: number) => { hp: number } }).spawnEnemy;
    const e = spawn.call(b, 'paperwork', false, 900);
    const hp0 = e.hp;
    expect(b.throwMug(900)).toBe(true);
    expect(b.throwMug(900)).toBe(false);
    for (let i = 0; i < 60; i++) b.step(1 / 60);
    expect(e.hp).toBeLessThan(hp0);
  });

  it('스킬은 멘탈이 부족하면 쓸 수 없다', () => {
    const b = fresh();
    expect(b.cast('snack')).toBe(false);
    b.mental = 100;
    expect(b.cast('snack')).toBe(true);
    expect(b.mental).toBe(65);
    expect(b.cast('aircon')).toBe(false); // 미해금
  });

  it('교수실 HP가 0이 되면 승리한다', () => {
    const b = fresh();
    b.enemy.hp = 1;
    (b as unknown as { damageBase: (base: unknown, d: number, x: number) => void }).damageBase(b.enemy, 5, ENEMY_FRONT);
    b.step(1 / 60);
    expect(b.result).toBe('win');
    expect(GROUND_Y).toBeGreaterThan(0);
  });

  it('같은 시드면 같은 결과가 나온다', () => {
    const run = () => {
      const b = fresh();
      playBot(b);
      return [b.result, Math.round(b.t * 10), b.kills];
    };
    expect(run()).toEqual(run());
  });
});
