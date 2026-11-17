import { describe, expect, it } from 'vitest';
import { BOSS_RAGE, Battle, ENEMY_FRONT, GROUND_Y, killCaffeine } from '../src/sim/battle';
import { STAGE_BY_ID, STAGES, TIME_LIMIT, endlessStage } from '../src/data/stages';
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

  it('커피머신을 올리면 카페인 최대치와 충전 속도가 오른다', () => {
    const b = fresh();
    expect(b.caffeineMax).toBe(100);
    expect(b.brewCost()).toBe(30);
    expect(b.brew()).toBe(true);
    expect(b.brewLevel).toBe(2);
    expect(b.caffeine).toBeCloseTo(0);
    expect(b.caffeineMax).toBe(125);
    expect(b.caffeineRegen).toBeCloseTo(6);
    expect(b.brew()).toBe(false); // 카페인 부족
    b.caffeine = 10_000;
    while (b.brew());
    expect(b.brewLevel).toBe(6);
    expect(b.brewCost()).toBeNull();
    expect(b.caffeineMax).toBe(225);
  });

  it('넉백을 맞으면 뒤로 밀리고 잠깐 움직이지 못하며, 보스는 면역이다', () => {
    const b = fresh();
    type Priv = { spawnEnemy: (id: string, boss: boolean, x: number) => { x: number; kbT: number; isBoss: boolean }; knockback: (f: unknown, d: number) => void };
    const p = b as unknown as Priv;
    const e = p.spawnEnemy.call(b, 'paperwork', false, 900);
    p.knockback.call(b, e, 60);
    expect(e.kbT).toBeGreaterThan(0);
    for (let i = 0; i < 30; i++) b.step(1 / 60);
    expect(e.x).toBeGreaterThan(940); // 적은 교수실 쪽(오른쪽)으로 밀린다
    const boss = p.spawnEnemy.call(b, 'prof1', true, 1200);
    p.knockback.call(b, boss, 60);
    expect(boss.kbT).toBe(0);
  });

  it('교수실 HP가 75/50/25%를 처음 넘을 때마다 비상 소집: 앞에 몰린 아군을 밀어내고 지원군을 부른다', () => {
    const b = fresh();
    b.caffeine = 999;
    b.summon('grunt');
    const ally = b.fighters.find((f) => f.side === 'ally')!;
    ally.x = ENEMY_FRONT - 40;
    type Priv = { damageBase: (base: unknown, dmg: number, x: number) => void; queue: unknown[] };
    const p = b as unknown as Priv;
    const alarms = (): number => b.drainEvents().filter((e) => e.type === 'alarm').length;
    b.drainEvents();
    p.damageBase.call(b, b.enemy, b.enemy.maxHp * 0.2, ENEMY_FRONT);
    expect(alarms()).toBe(0);
    p.damageBase.call(b, b.enemy, b.enemy.maxHp * 0.1, ENEMY_FRONT); // 70%: 첫 소집
    expect(alarms()).toBe(1);
    expect(ally.kbT).toBeGreaterThan(0);
    expect(ally.hp).toBeLessThan(ally.maxHp);
    expect(p.queue.length).toBeGreaterThan(0);
    p.damageBase.call(b, b.enemy, b.enemy.maxHp * 0.05, ENEMY_FRONT); // 65%: 다시 안 함
    expect(alarms()).toBe(0);
    p.damageBase.call(b, b.enemy, b.enemy.maxHp * 0.5, ENEMY_FRONT); // 15%: 50%·25% 두 번
    expect(alarms()).toBe(2);
  });

  it('적을 처치하면 세기에 비례해 카페인을 얻는다', () => {
    expect(killCaffeine('memo')).toBe(2);
    expect(killCaffeine('grant')).toBe(15);
    expect(killCaffeine('prof1')).toBe(50);
    const b = fresh();
    b.caffeine = 0;
    const spawn = (b as unknown as { spawnEnemy: (id: string, boss: boolean, x: number) => { hp: number } }).spawnEnemy;
    const e = spawn.call(b, 'meeting', false, 900);
    (b as unknown as { damageFighter: (f: unknown, d: number, s: string) => void }).damageFighter(e, 99999, 'ally');
    expect(b.caffeine).toBe(killCaffeine('meeting'));
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

  it('스테이지마다 시간 제한이 있다: 일반 5분, 보스 6분, 무한 모드는 넉넉하게', () => {
    expect(STAGE_BY_ID['1-1']!.timeLimit).toBe(300);
    expect(STAGE_BY_ID['1-10']!.timeLimit).toBe(360);
    expect(STAGE_BY_ID['S1-5']!.timeLimit).toBe(360);
    for (const st of STAGES) expect(st.timeLimit).toBe(st.kind === 'boss' ? TIME_LIMIT.boss : TIME_LIMIT.normal);
    expect(endlessStage(3).timeLimit).toBe(TIME_LIMIT.endless);
  });

  it('시간이 다 되면 시간 초과로 패배하고, 1분 전에 한 번 경고한다', () => {
    const b = new Battle({ ...STAGE_BY_ID['1-1']!, timeLimit: 70 }, makeLoadout(newSave()), 1);
    b.ally.hp = b.ally.maxHp = 1e9; // 연구실이 먼저 무너지지 않게
    b.enemy.hp = b.enemy.maxHp = 1e9;
    expect(b.timeLeft).toBe(70);
    const events: string[] = [];
    while (!b.result) {
      b.step(1 / 60);
      for (const e of b.drainEvents()) events.push(e.type);
    }
    expect(b.result).toBe('lose');
    expect(b.timedOut).toBe(true);
    expect(b.t).toBeCloseTo(70, 1);
    expect(b.timeLeft).toBe(0);
    expect(events.filter((t) => t === 'timeWarn')).toHaveLength(1);
    expect(events.indexOf('timeWarn')).toBeLessThan(events.indexOf('end'));
  });

  it('연구실이 무너져 지면 시간 초과가 아니다', () => {
    const b = fresh();
    b.ally.hp = 0;
    b.step(1 / 60);
    expect(b.result).toBe('lose');
    expect(b.timedOut).toBe(false);
  });

  it('보스 HP가 기준선 아래로 처음 떨어질 때마다 호통: 모든 아군을 기절시키고 밀어낸다', () => {
    const b = new Battle(STAGE_BY_ID['1-10']!, makeLoadout(newSave()), 1);
    type Priv = { spawnEnemy: (id: string, boss: boolean, x: number) => { hp: number; maxHp: number; rageN: number }; damageFighter: (f: unknown, d: number, s: string) => void };
    const p = b as unknown as Priv;
    const boss = p.spawnEnemy.call(b, 'prof1', true, 1200);
    b.caffeine = 999;
    b.summon('grunt');
    const ally = b.fighters.find((f) => f.side === 'ally')!;
    ally.x = 900;
    const rages = (): number => b.drainEvents().filter((e) => e.type === 'rage').length;
    b.drainEvents();
    p.damageFighter.call(b, boss, boss.maxHp * 0.2, 'ally'); // 80%
    expect(rages()).toBe(0);
    expect(ally.stunT).toBe(0);
    p.damageFighter.call(b, boss, boss.maxHp * 0.2, 'ally'); // 60%: 첫 호통
    expect(rages()).toBe(1);
    expect(ally.stunT).toBeCloseTo(BOSS_RAGE.stun);
    expect(ally.kbT).toBeGreaterThan(0);
    expect(ally.hp).toBe(ally.maxHp); // 피해는 없다
    expect(b.fx.some((e) => e.x < 0 && e.text?.includes('호통'))).toBe(true);
    // 기절이 풀릴 때까지 지켜본다: 밀려나고, 그동안 아무것도 못 한다
    for (let i = 0; i < 60; i++) b.step(1 / 60);
    expect(ally.x).toBeLessThan(900 - BOSS_RAGE.push * 0.8);
    expect(ally.stunT).toBeGreaterThan(0);
    for (let i = 0; i < 60; i++) b.step(1 / 60);
    expect(ally.stunT).toBe(0);
    b.drainEvents();
    p.damageFighter.call(b, boss, boss.maxHp * 0.05, 'ally'); // 55%: 다시 안 함
    expect(rages()).toBe(0);
    p.damageFighter.call(b, boss, boss.maxHp * 0.3, 'ally'); // 25%: 두 번째
    expect(rages()).toBe(1);
    expect(boss.rageN).toBe(2);
    p.damageFighter.call(b, boss, boss.maxHp * 0.2, 'ally'); // 5%: 기준선 끝
    expect(rages()).toBe(0);
  });

  it('최종 보스는 호통이 더 잦고 길다', () => {
    const b = new Battle(STAGE_BY_ID['7-10']!, makeLoadout(newSave()), 1);
    type Priv = { spawnEnemy: (id: string, boss: boolean, x: number) => { maxHp: number }; damageFighter: (f: unknown, d: number, s: string) => void };
    const p = b as unknown as Priv;
    const boss = p.spawnEnemy.call(b, 'president', true, 1200);
    b.caffeine = 999;
    b.summon('grunt');
    b.drainEvents();
    for (let i = 0; i < 9; i++) p.damageFighter.call(b, boss, boss.maxHp * 0.1, 'ally');
    expect(b.drainEvents().filter((e) => e.type === 'rage')).toHaveLength(3);
    expect(b.fighters.find((f) => f.side === 'ally')!.stunT).toBeGreaterThan(BOSS_RAGE.stun);
  });

  it('기절한 유닛은 이동도 공격도 하지 않는다', () => {
    const b = fresh();
    const spawn = (b as unknown as { spawnEnemy: (id: string, boss: boolean, x: number) => { hp: number; maxHp: number } }).spawnEnemy;
    b.summon('grunt');
    const ally = b.fighters.find((f) => f.side === 'ally')!;
    ally.x = 600;
    const foe = spawn.call(b, 'paperwork', false, 615);
    foe.hp = foe.maxHp = 1e6;
    ally.stunT = 1.5;
    ally.cd = 0;
    const hits = (): number => b.drainEvents().filter((e) => e.type === 'hit' && e.to === 'enemy').length;
    b.drainEvents();
    for (let i = 0; i < 80; i++) b.step(1 / 60);
    expect(hits()).toBe(0);
    expect(foe.hp).toBe(foe.maxHp);
    expect(ally.attacking).toBe(false);
    expect(ally.x).toBeLessThanOrEqual(600);
    for (let i = 0; i < 60; i++) b.step(1 / 60);
    expect(ally.stunT).toBe(0);
    expect(foe.hp).toBeLessThan(foe.maxHp); // 풀리면 다시 싸운다
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
