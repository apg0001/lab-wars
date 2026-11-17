import { describe, expect, it } from 'vitest';
import { UNIT_BY_ID } from '../src/data/units';
import { STAGE_BY_ID, STAGES, FINAL_STAGE, endlessStage } from '../src/data/stages';
import {
  applyOutcome, canSubscribe, evolve, evolveCost, isStageOpen, isSideOpen, isUnitOwned, levelCap, levelUp, levelUpCost,
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
    expect(evolveCost(k, 1)).toBe(900);
  });

  it('AI 조수는 해금 스테이지 클리어 후 구독해야 쓸 수 있다', () => {
    const s = newSave();
    const c = UNIT_BY_ID.claudy!;
    s.money = 5000;
    expect(canSubscribe(s, c)).toBe(false);
    s.stars['1-10'] = 1;
    expect(isUnitOwned(s, c)).toBe(false);
    expect(subscribe(s, c)).toBe(true);
    expect(isUnitOwned(s, c)).toBe(true);
    expect(s.money).toBe(4400);
    expect(subscribe(s, c)).toBe(false);
  });

  it('별과 보상: 첫 클리어는 전액, 재클리어는 50%', () => {
    expect([starsFor(0.9), starsFor(0.5), starsFor(0.1)]).toEqual([3, 2, 1]);
    const s = newSave();
    const st = STAGE_BY_ID['1-1']!;
    const first = applyOutcome(s, st, true, 1, 10);
    expect(first.firstClear).toBe(true);
    expect(first.clearReward).toBe(Math.round(st.reward * 1.2));
    const again = applyOutcome(s, st, true, 0.5, 0);
    expect(again.clearReward).toBe(Math.round(st.reward * 1.0 * 0.5));
    expect(s.stars['1-1']).toBe(3);
    const lose = applyOutcome(s, STAGE_BY_ID['1-2']!, false, 0, 25);
    expect(lose.clearReward).toBe(0);
    expect(s.money).toBe(first.clearReward + 10 + again.clearReward + 25);
  });

  it('프린터 사거리 연장은 레벨당 25씩 늘고, 예전 저장 데이터는 0레벨로 시작한다', () => {
    const old = normalizeSave({ money: 1000, facilities: { remodel: 1, printer: 2 } });
    expect(old.facilities.printerRange).toBe(0);
    expect(makeLoadout(old).printerRange).toBe(300);
    old.money = 100_000;
    expect(upgradeFacility(old, 'printerRange')).toBe(true);
    expect(upgradeFacility(old, 'printerRange')).toBe(true);
    expect(makeLoadout(old).printerRange).toBe(350);
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
    const s = normalizeSave({ v: 4, money: -5, stars: { '1-1': 9 }, units: { grunt: { level: 99, tier: 7 }, nope: { level: 1, tier: 1 } }, subs: ['grunt', 'claudy'], facilities: { remodel: 99 } });
    expect(s.money).toBe(0);
    expect(s.stars['1-1']).toBe(3);
    expect(s.units.grunt).toEqual({ level: 15, tier: 3 });
    expect(s.units.nope).toBeUndefined();
    expect(s.subs).toEqual(['claudy']);
    expect(s.facilities.remodel).toBe(10);
    expect(normalizeSave('garbage')).toEqual({ ...newSave(), updatedAt: 0 });
  });

  it('예전 4챕터 저장은 같은 난이도 지점까지 클리어로 옮긴다', () => {
    takeMigrationNotes();
    const all = normalizeSave({ v: 1, stars: { '1-1': 3, '4-5': 3 } });
    expect(STAGES.every((s) => all.stars[s.id] === 3)).toBe(true);
    const mid = normalizeSave({ v: 1, stars: { '1-1': 2, '2-5': 2 } });
    expect(mid.stars['4-4']).toBe(2);
    expect(mid.stars['4-5'] ?? 0).toBe(0);
    expect(takeMigrationNotes()).toHaveLength(2);
    const fresh = normalizeSave({ v: 1, stars: {} });
    expect(Object.values(fresh.stars).every((v) => v === 0)).toBe(true);
  });

  it('7챕터×6 저장은 깬 스테이지만 옮기고, 사이에 생긴 스테이지는 열어만 둔다', () => {
    takeMigrationNotes();
    const old = normalizeSave({ v: 2, stars: { '1-1': 3, '1-2': 2, '1-3': 3, '1-4': 1, '1-5': 3, '1-6': 2, '2-1': 3 }, seen: ['ch1-intro'], endless: 0 });
    expect(old.stars['1-10']).toBe(2); // 보스 → 보스
    expect(old.stars['1-1']).toBe(3);
    expect(old.stars['1-3']).toBe(2); // 예전 1-2 자리
    expect(old.stars['1-2'] ?? 0).toBe(0); // 새로 생긴 칸은 안 깬 상태
    expect(isStageOpen(old, STAGE_BY_ID['1-2']!)).toBe(true);
    expect(isStageOpen(old, STAGE_BY_ID['1-3']!)).toBe(true); // 깬 곳은 앞 칸과 상관없이 열림
    expect(old.stars['2-1']).toBe(3);
    expect(isStageOpen(old, STAGE_BY_ID['2-3']!)).toBe(false);
    expect(old.seen).toEqual(['ch1-intro']);
    expect(takeMigrationNotes()).toHaveLength(1);
    expect(STAGES).toHaveLength(70);
  });

  it('0.9.0에서 잘못 채운 사이 스테이지는 플레이 기록이 없으면 되돌린다', () => {
    takeMigrationNotes();
    const stars = Object.fromEntries(STAGES.map((s) => [s.id, 3]));
    const s = normalizeSave({ v: 3, stars, seen: ['st-1-2'] });
    expect(s.stars['1-2']).toBe(3); // 직접 들어가 본 곳은 유지
    expect(s.stars['1-4']).toBe(0);
    expect(s.stars['7-8']).toBe(0);
    expect(s.stars['7-10']).toBe(3);
    expect(STAGES.filter((x) => !s.stars[x.id])).toHaveLength(27);
    expect(takeMigrationNotes()).toHaveLength(1);
    // 한 번 고친 저장(v4)은 다시 건드리지 않는다
    expect(normalizeSave({ ...s, v: 4 }).stars['1-4']).toBe(0);
    expect(normalizeSave({ v: 4, stars }).stars['1-4']).toBe(3);
  });

  it('일정 관리 앱은 재소환 대기시간을 레벨당 4% 줄인다', () => {
    const s = newSave();
    expect(makeLoadout(s).cooldownMul).toBe(1);
    s.money = 1_000_000;
    for (let i = 0; i < 10; i++) upgradeFacility(s, 'planner');
    expect(s.facilities.planner).toBe(8);
    expect(makeLoadout(s).cooldownMul).toBeCloseTo(0.68);
  });

  it('외전은 엔딩 뒤에 열리고 외전마다 차례로 진행한다', () => {
    const s = newSave();
    const s21 = STAGE_BY_ID['S2-1']!;
    expect(s21.side).toBe(2);
    expect(isStageOpen(s, s21)).toBe(false);
    s.stars[FINAL_STAGE.id] = 1;
    expect(isStageOpen(s, s21)).toBe(true);
    expect(isStageOpen(s, STAGE_BY_ID['S3-1']!)).toBe(true);
    expect(isStageOpen(s, STAGE_BY_ID['S2-2']!)).toBe(false);
    applyOutcome(s, s21, true, 0.9, 0);
    expect(isStageOpen(s, STAGE_BY_ID['S2-2']!)).toBe(true);
    // 저장했다 읽어도 외전 별이 남는다
    expect(normalizeSave(JSON.parse(JSON.stringify(s))).stars['S2-1']).toBe(3);
  });

  it('무한 모드는 처음부터 한 판씩 열리고 최고 기록을 남긴다 (외전은 엔딩 후)', () => {
    const s = newSave();
    const e1 = endlessStage(1);
    expect(isStageOpen(s, e1)).toBe(true);
    expect(isSideOpen(s)).toBe(false);
    s.stars[FINAL_STAGE.id] = 1;
    expect(isSideOpen(s)).toBe(true);
    expect(isStageOpen(s, endlessStage(2))).toBe(false);
    const out = applyOutcome(s, e1, true, 0.9, 10);
    expect(out.firstClear).toBe(true);
    expect(s.endless).toBe(1);
    expect(isStageOpen(s, endlessStage(2))).toBe(true);
    expect(endlessStage(10).boss).toBeTruthy();
    expect(endlessStage(20).scale).toBeGreaterThan(endlessStage(10).scale);
  });
});
