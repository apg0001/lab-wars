import { describe, expect, it } from 'vitest';
import { UNIT_BY_ID } from '../src/data/units';
import { STAGE_BY_ID, STAGES } from '../src/data/stages';
import {
  applyOutcome, canSubscribe, evolve, evolveCost, isStageOpen, isUnitOwned, levelCap, levelUp, levelUpCost,
  makeLoadout, newSave, normalizeSave, takeMigrationNotes, starsFor, subscribe, unitProgress, unitStats, upgradeFacility,
} from '../src/sim/progression';

describe('성장 시스템', () => {
  it('새 저장 데이터는 막내와 1-1, 야식 배달만 열려 있다', () => {
    const s = newSave();
    const lo = makeLoadout(s);
    expect(lo.deck.map((d) => d.def.id)).toEqual(['grunt']);
    expect(lo.skills.map((k) => k.id)).toEqual(['snack']);
    expect(isStageOpen(s, STAGES[0]!)).toBe(true);
    expect(isStageOpen(s, STAGES[1]!)).toBe(false);
  });

  it('레벨은 진화 단계별 상한까지만 오르고, 진화하면 상한이 늘어난다', () => {
    const s = newSave();
    const g = UNIT_BY_ID.grunt!;
    s.money = 1_000_000;
    while (levelUp(s, g));
    expect(unitProgress(s, g.id)).toEqual({ level: levelCap(1), tier: 1 });
    expect(evolve(s, g)).toBe(true);
    expect(unitProgress(s, g.id).tier).toBe(2);
    while (levelUp(s, g));
    expect(evolve(s, g)).toBe(true);
    while (levelUp(s, g));
    expect(unitProgress(s, g.id)).toEqual({ level: 15, tier: 3 });
    expect(evolve(s, g)).toBe(false);
  });

  it('돈이 모자라면 아무것도 사지 않는다', () => {
    const s = newSave();
    const g = UNIT_BY_ID.grunt!;
    s.money = levelUpCost(g, 1) - 1;
    expect(levelUp(s, g)).toBe(false);
    expect(upgradeFacility(s, 'remodel')).toBe(false);
    expect(s.money).toBe(levelUpCost(g, 1) - 1);
  });

  it('진화하면 능력치가 1.5배가 되고 이름이 학위로 바뀐다', () => {
    const k = UNIT_BY_ID.keyboard!;
    const a = unitStats(k, { level: 5, tier: 1 });
    const b = unitStats(k, { level: 5, tier: 2 });
    expect(b.hp / a.hp).toBeCloseTo(1.5, 1);
    expect(k.names).toEqual(['학부 키보드 워리어', '석사 키보드 워리어', '박사 키보드 워리어']);
    expect(evolveCost(k, 1)).toBe(800);
  });

  it('AI 조수는 해금 스테이지 클리어 후 구독해야 쓸 수 있다', () => {
    const s = newSave();
    const c = UNIT_BY_ID.claudy!;
    s.money = 5000;
    expect(canSubscribe(s, c)).toBe(false);
    s.stars['1-5'] = 1;
    expect(isUnitOwned(s, c)).toBe(false);
    expect(subscribe(s, c)).toBe(true);
    expect(isUnitOwned(s, c)).toBe(true);
    expect(s.money).toBe(4400);
    expect(subscribe(s, c)).toBe(false);
  });

  it('별과 보상: 첫 클리어는 전액, 재클리어는 40%', () => {
    expect([starsFor(0.9), starsFor(0.5), starsFor(0.1)]).toEqual([3, 2, 1]);
    const s = newSave();
    const st = STAGE_BY_ID['1-1']!;
    const first = applyOutcome(s, st, true, 1, 10);
    expect(first.firstClear).toBe(true);
    expect(first.clearReward).toBe(Math.round(st.reward * 1.2));
    const again = applyOutcome(s, st, true, 0.5, 0);
    expect(again.clearReward).toBe(Math.round(st.reward * 1.0 * 0.4));
    expect(s.stars['1-1']).toBe(3);
    const lose = applyOutcome(s, STAGE_BY_ID['1-2']!, false, 0, 25);
    expect(lose.clearReward).toBe(0);
    expect(s.money).toBe(first.clearReward + 10 + again.clearReward + 25);
  });

  it('프린터 사거리 연장은 레벨당 20씩 늘고, 예전 저장 데이터는 0레벨로 시작한다', () => {
    const old = normalizeSave({ money: 1000, facilities: { remodel: 1, printer: 2 } });
    expect(old.facilities.printerRange).toBe(0);
    expect(makeLoadout(old).printerRange).toBe(300);
    old.money = 100_000;
    expect(upgradeFacility(old, 'printerRange')).toBe(true);
    expect(upgradeFacility(old, 'printerRange')).toBe(true);
    expect(makeLoadout(old).printerRange).toBe(340);
  });

  it('머그컵 투척기 강화 비용을 한 번 환불하고 안내를 남긴다', () => {
    takeMigrationNotes();
    const s = normalizeSave({ money: 100, facilities: { mug: 3, printer: 1 } });
    expect(s.money).toBe(100 + 70 + Math.round(70 * 1.45) + Math.round(70 * 1.45 ** 2));
    expect((s.facilities as Record<string, number>).mug).toBeUndefined();
    expect(takeMigrationNotes()).toHaveLength(1);
    // 정리된 데이터를 다시 읽으면 또 환불하지 않는다
    expect(normalizeSave(JSON.parse(JSON.stringify(s))).money).toBe(s.money);
    expect(takeMigrationNotes()).toHaveLength(0);
  });

  it('손상된 저장 데이터를 안전하게 정리한다', () => {
    const s = normalizeSave({ money: -5, stars: { '1-1': 9 }, units: { grunt: { level: 99, tier: 7 }, nope: { level: 1, tier: 1 } }, subs: ['grunt', 'claudy'], facilities: { remodel: 99 } });
    expect(s.money).toBe(0);
    expect(s.stars['1-1']).toBe(3);
    expect(s.units.grunt).toEqual({ level: 15, tier: 3 });
    expect(s.units.nope).toBeUndefined();
    expect(s.subs).toEqual(['claudy']);
    expect(s.facilities.remodel).toBe(10);
    expect(normalizeSave('garbage')).toEqual({ ...newSave(), updatedAt: 0 });
  });
});
