import { describe, expect, it } from 'vitest';
import { makeRng } from '../src/sim/battle';
import { GACHA_UNITS, UNIT_BY_ID } from '../src/data/units';
import { STAGE_BY_ID, endlessStage } from '../src/data/stages';
import {
  applyOutcome, canLevelUp, isUnitOwned, levelUp, makeLoadout, newSave, passionOf, unitLevelCap, MAX_PASSION, LOADOUT_MAX,
} from '../src/sim/progression';
import {
  DUP_REFUND, SPARK, TICKET10_PRICE, TICKET_PRICE, UNIT_RATES, buyTickets, canClaimSpark, claimSpark, drawUnits, grantUnit,
  rollUnitRarity, unitsOfRarity,
} from '../src/sim/unit-gacha';

const rich = () => {
  const s = newSave();
  s.money = 10_000_000;
  return s;
};

describe('장비 지원 (유닛 뽑기)', () => {
  it('뽑기권은 1장 300, 10장 2,700 연구비이고, 모자라면 사지 않는다', () => {
    const s = newSave();
    s.money = TICKET10_PRICE + TICKET_PRICE - 1;
    expect(TICKET_PRICE).toBe(300);
    expect(TICKET10_PRICE).toBe(2700);
    expect(buyTickets(s, 10)).toBe(true);
    expect(s.gear.tickets).toBe(10);
    expect(buyTickets(s, 1)).toBe(false);
    expect(s.money).toBe(TICKET_PRICE - 1);
  });

  it('뽑기권이 모자라면 뽑지 않는다', () => {
    const s = newSave();
    expect(drawUnits(s, 1)).toBeNull();
    s.gear.tickets = 9;
    expect(drawUnits(s, 10)).toBeNull();
    expect(s.gear.tickets).toBe(9);
  });

  it('등급 확률: 레어 70 / 에픽 25 / 레전더리 5 (많이 뽑으면 비율이 맞는다)', () => {
    expect(UNIT_RATES.rare + UNIT_RATES.epic + UNIT_RATES.legend).toBeCloseTo(1);
    const rng = makeRng(12345);
    const n = 40_000;
    const count = { rare: 0, epic: 0, legend: 0 };
    for (let i = 0; i < n; i++) count[rollUnitRarity(rng)]++;
    expect(count.rare / n).toBeCloseTo(0.7, 1);
    expect(count.epic / n).toBeCloseTo(0.25, 1);
    expect(Math.abs(count.legend / n - 0.05)).toBeLessThan(0.006);
    // 보장 뽑기는 에픽 이상만, 비율 유지 (에픽:레전더리 = 5:1)
    let leg = 0;
    for (let i = 0; i < 12_000; i++) {
      const r = rollUnitRarity(rng, true);
      expect(r).not.toBe('rare');
      if (r === 'legend') leg++;
    }
    expect(leg / 12_000).toBeCloseTo(1 / 6, 1);
  });

  it('10연은 에픽 이상을 1개 보장한다 (레어만 나오는 난수에서도)', () => {
    const s = rich();
    s.gear.tickets = 10;
    const res = drawUnits(s, 10, () => 0.99)!;
    expect(res).toHaveLength(10);
    expect(res.slice(0, 9).every((r) => r.rarity === 'rare')).toBe(true);
    expect(res[9]!.rarity).not.toBe('rare');
    expect(res[9]!.forced).toBe(true);
    // 앞에서 이미 에픽 이상이 나왔으면 보장이 끼어들지 않는다
    s.gear.tickets = 10;
    let i = 0;
    const res2 = drawUnits(s, 10, () => (i++ === 0 ? 0.0 : 0.99))!;
    expect(res2[0]!.rarity).toBe('legend');
    expect(res2.every((r) => !r.forced)).toBe(true);
  });

  it('처음 얻은 유닛은 보유·편성 빈칸에 들어가고, 중복은 열정(최종 레벨 상한 +1, 최대 +5) 뒤 연구비로 바뀐다', () => {
    const s = rich();
    const def = UNIT_BY_ID.iron!;
    expect(isUnitOwned(s, def)).toBe(false);
    expect(grantUnit(s, def)).toEqual({ fresh: true, passion: 0, refund: 0 });
    expect(isUnitOwned(s, def)).toBe(true);
    expect(s.loadout).toContain('iron');
    for (let k = 1; k <= MAX_PASSION; k++) expect(grantUnit(s, def)).toEqual({ fresh: false, passion: k, refund: 0 });
    expect(passionOf(s, 'iron')).toBe(MAX_PASSION);
    const money = s.money;
    expect(grantUnit(s, def)).toEqual({ fresh: false, passion: 0, refund: DUP_REFUND.rare });
    expect(s.money).toBe(money + DUP_REFUND.rare);
    // 열정만큼 최종 단계 레벨 상한이 오른다
    s.units.iron = { level: 15, tier: 3 };
    expect(unitLevelCap(s, def)).toBe(15 + MAX_PASSION);
    expect(canLevelUp(s, def)).toBe(true);
    while (levelUp(s, def));
    expect(s.units.iron!.level).toBe(20);
    // 진화 전 단계 상한은 그대로
    s.units.iron = { level: 1, tier: 1 };
    expect(unitLevelCap(s, def)).toBe(5);
  });

  it(`천장: ${SPARK}회 뽑으면 레전더리 하나를 골라 받는다`, () => {
    const s = rich();
    s.gear.tickets = SPARK;
    const legend = unitsOfRarity('legend')[0]!;
    expect(claimSpark(s, legend.id)).toBeNull();
    for (let i = 0; i < SPARK / 10; i++) drawUnits(s, 10, makeRng(i + 1));
    expect(s.gear.spark).toBe(SPARK);
    expect(s.gear.draws).toBe(SPARK);
    expect(canClaimSpark(s)).toBe(true);
    expect(claimSpark(s, 'iron')).toBeNull(); // 레전더리만
    const before = s.gear.owned[legend.id] ?? 0;
    const r = claimSpark(s, legend.id)!;
    expect(r.def.id).toBe(legend.id);
    expect(s.gear.owned[legend.id]).toBe(before + 1);
    expect(s.gear.spark).toBe(0);
    expect(canClaimSpark(s)).toBe(false);
  });

  it('같은 난수면 같은 결과, 뽑힌 유닛은 모두 뽑기 장비다', () => {
    const run = () => {
      const s = rich();
      s.gear.tickets = 30;
      return [...drawUnits(s, 10, makeRng(7))!, ...drawUnits(s, 10, makeRng(8))!].map((r) => r.def.id);
    };
    const a = run();
    expect(a).toEqual(run());
    for (const id of a) expect(GACHA_UNITS.map((u) => u.id)).toContain(id);
  });

  it('무료 뽑기권: 보스 스테이지 첫 클리어 +1, 무한 모드 10판마다 처음 도달 +1', () => {
    const s = newSave();
    expect(applyOutcome(s, STAGE_BY_ID['1-10']!, true, 1, 0).tickets).toBe(1);
    expect(applyOutcome(s, STAGE_BY_ID['1-10']!, true, 1, 0).tickets).toBe(0); // 재클리어
    expect(applyOutcome(s, STAGE_BY_ID['1-9']!, true, 1, 0).tickets).toBe(0); // 일반 스테이지
    s.endless = 8;
    expect(applyOutcome(s, endlessStage(9), true, 1, 0).tickets).toBe(0);
    expect(applyOutcome(s, endlessStage(10), true, 1, 0).tickets).toBe(1);
    expect(applyOutcome(s, endlessStage(10), true, 1, 0).tickets).toBe(0);
    expect(s.gear.tickets).toBe(2);
  });

  it('편성 9칸: 전투에는 편성한 유닛만 그 순서로 나간다', () => {
    const s = rich();
    for (const u of GACHA_UNITS) s.gear.owned[u.id] = 1;
    s.loadout = ['cluster', 'iron'];
    expect(makeLoadout(s).deck.map((d) => d.def.id)).toEqual(['cluster', 'iron']);
    expect(LOADOUT_MAX).toBe(9);
  });
});
