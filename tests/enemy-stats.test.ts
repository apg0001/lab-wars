import { describe, expect, it } from 'vitest';
import { Battle } from '../src/sim/battle';
import { enemyStatsAt } from '../src/sim/enemy-stats';
import { makeLoadout, newSave, unitStats } from '../src/sim/progression';
import { ENEMY_BY_ID } from '../src/data/enemies';
import { STAGE_BY_ID, endlessStage } from '../src/data/stages';
import { UNIT_BY_ID } from '../src/data/units';

describe('능력치 표', () => {
  it('전투에 나온 적 능력치가 표 계산과 같다', () => {
    for (const id of ['1-5', '4-3', '7-9']) {
      const stage = STAGE_BY_ID[id]!;
      const b = new Battle(stage, makeLoadout(newSave()), 3, { cards: false });
      while (!b.alive('enemy').length && b.t < 60) b.step(1 / 60);
      const f = b.alive('enemy')[0]!;
      const want = enemyStatsAt(ENEMY_BY_ID[f.defId]!, stage);
      expect(f.maxHp, id).toBe(want.hp);
      expect(f.stats.atk, id).toBeCloseTo(want.atk, 5);
    }
  });

  it('스테이지가 뒤로 갈수록 같은 적이 강해진다', () => {
    const e = ENEMY_BY_ID[STAGE_BY_ID['1-1']!.pool[0]!.id]!;
    expect(enemyStatsAt(e, STAGE_BY_ID['7-1']!).hp).toBeGreaterThan(enemyStatsAt(e, STAGE_BY_ID['1-1']!).hp);
  });

  it('보스는 스테이지 배율 대신 bossScale (무한 모드)', () => {
    const st = endlessStage(10);
    const boss = ENEMY_BY_ID[st.boss!]!;
    expect(enemyStatsAt(boss, st).hp).toBe(Math.round(boss.hp * (st.bossScale ?? 1)));
  });

  it('동료 레벨 +1은 ×1.08, 진화는 ×1.5', () => {
    const u = UNIT_BY_ID['grunt']!;
    expect(unitStats(u, { level: 2, tier: 1 }).hp).toBe(Math.round(u.hp * 1.08));
    expect(unitStats(u, { level: 1, tier: 2 }).hp).toBe(Math.round(u.hp * 1.5));
  });
});
