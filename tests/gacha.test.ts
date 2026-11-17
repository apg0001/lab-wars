import { describe, expect, it } from 'vitest';
import { COSMETICS, COSMETIC_BY_ID, DRAW10_PRICE, DRAW_PRICE, GRADE_INFO, PITY } from '../src/data/cosmetics';
import { drawCosmetics, drawOnce, equip, equipTitle, rollGrade, titleName } from '../src/sim/gacha';
import { makeLoadout, newSave, normalizeSave } from '../src/sim/progression';
import { pickBetter, progressScore } from '../src/save/remote';

/** 정해진 값을 차례로 내놓는 난수 */
const seq = (...xs: number[]) => {
  let i = 0;
  return () => xs[i++ % xs.length]!;
};

/** 간단한 결정적 난수 (mulberry32) */
const seeded = (seed: number) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

describe('심사 결과 꾸미기 뽑기', () => {
  it('아이템은 25~35개, id가 겹치지 않고 등급 확률 합은 1', () => {
    expect(COSMETICS.length).toBeGreaterThanOrEqual(25);
    expect(COSMETICS.length).toBeLessThanOrEqual(35);
    expect(new Set(COSMETICS.map((c) => c.id)).size).toBe(COSMETICS.length);
    expect(Object.values(GRADE_INFO).reduce((s, g) => s + g.rate, 0)).toBeCloseTo(1);
    for (const c of COSMETICS) if (c.kind === 'color') expect(c.color).toBeTruthy();
    // 리젝에서는 칭호만 나온다
    expect(COSMETICS.filter((c) => c.grade === 'reject').every((c) => c.kind === 'title')).toBe(true);
  });

  it('등급 확률: 억셉트 5%, 마이너 20%, 메이저 45%, 리젝 30%', () => {
    expect(rollGrade(() => 0.01)).toBe('accept');
    expect(rollGrade(() => 0.1)).toBe('minor');
    expect(rollGrade(() => 0.5)).toBe('major');
    expect(rollGrade(() => 0.9)).toBe('reject');
    expect(rollGrade(() => 0.9, true)).toBe('minor');
    expect(rollGrade(() => 0.1, true)).toBe('accept');
    const rng = seeded(7);
    const n = 20000;
    const count: Record<string, number> = {};
    for (let i = 0; i < n; i++) {
      const g = rollGrade(rng);
      count[g] = (count[g] ?? 0) + 1;
    }
    expect(count.accept! / n).toBeCloseTo(0.05, 1);
    expect(count.reject! / n).toBeCloseTo(0.3, 1);
  });

  it('연구비가 모자라면 뽑지 않고, 10편은 9편 가격', () => {
    const s = newSave();
    s.money = DRAW_PRICE - 1;
    expect(drawCosmetics(s, 1, seeded(1))).toBeNull();
    expect(s.money).toBe(DRAW_PRICE - 1);
    s.money = DRAW10_PRICE;
    expect(DRAW10_PRICE).toBe(DRAW_PRICE * 9);
    const res = drawCosmetics(s, 10, seeded(1))!;
    expect(res).toHaveLength(10);
    expect(s.money).toBe(res.reduce((a, r) => a + r.refund, 0));
    expect(s.cosmetics.draws).toBe(10);
  });

  it('10편마다 희귀 이상이 보장된다', () => {
    const s = newSave();
    s.money = 1e6;
    // 항상 메이저 리비전이 나오는 난수여도 10번째는 희귀 이상
    const res = drawCosmetics(s, 10, () => 0.5)!;
    expect(res.slice(0, 9).every((r) => r.grade === 'major')).toBe(true);
    expect(res[9]!.pity).toBe(true);
    expect(['minor', 'accept']).toContain(res[9]!.grade);
    expect(s.cosmetics.pity).toBe(0);
    // 아무리 운이 나빠도 연속 PITY번 안에는 반드시 나온다
    for (let k = 0; k < 50; k++) {
      const r = drawCosmetics(s, 10, () => 0.95)!;
      expect(r.some((x) => x.grade === 'minor' || x.grade === 'accept')).toBe(true);
    }
    expect(PITY).toBe(10);
  });

  it('중복은 소액 환급, 리젝은 위로 칭호를 먼저 주고 다 모으면 환급', () => {
    const s = newSave();
    // 메이저 첫 아이템을 두 번
    const a = drawOnce(s, seq(0.5, 0));
    const b = drawOnce(s, seq(0.5, 0));
    expect(a.fresh).toBe(true);
    expect(b.fresh).toBe(false);
    expect(b.item?.id).toBe(a.item?.id);
    expect(b.refund).toBe(GRADE_INFO.major.refund);
    const rejects = COSMETICS.filter((c) => c.grade === 'reject');
    for (let i = 0; i < rejects.length; i++) {
      const r = drawOnce(s, seq(0.9, 0));
      expect(r.grade).toBe('reject');
      expect(r.fresh).toBe(true);
      expect(r.item?.kind).toBe('title');
    }
    const last = drawOnce(s, seq(0.9, 0));
    expect(last.item).toBeUndefined();
    expect(last.refund).toBe(GRADE_INFO.reject.refund);
    expect(s.money).toBe(GRADE_INFO.major.refund + GRADE_INFO.reject.refund);
  });

  it('가진 것만 입힐 수 있고, 꾸미기는 능력치를 바꾸지 않는다', () => {
    const s = newSave();
    const before = JSON.stringify(makeLoadout(s));
    expect(equip(s, 'grunt', 'hat', 'crown')).toBe(false);
    s.cosmetics.owned.push('crown', 'c-gold', 't-reviewer2');
    expect(equip(s, 'grunt', 'color', 'crown')).toBe(false);
    expect(equip(s, 'grunt', 'hat', 'crown')).toBe(true);
    expect(equip(s, 'hero', 'color', 'c-gold')).toBe(true);
    expect(s.cosmetics.outfits.grunt).toEqual({ hat: 'crown' });
    expect(equipTitle(s, 't-reviewer2')).toBe(true);
    expect(titleName(s)).toBe('리뷰어 2의 단골');
    expect(JSON.stringify(makeLoadout(s))).toBe(before);
    expect(equip(s, 'grunt', 'hat', null)).toBe(true);
    expect(s.cosmetics.outfits.grunt).toBeUndefined();
  });

  it('예전 저장은 빈 옷장으로, 이상한 꾸미기 기록은 정리한다', () => {
    const old = normalizeSave({ v: 4, money: 500, stars: { '1-1': 3 } });
    expect(old.cosmetics).toEqual({ owned: [], outfits: {}, title: '', pity: 0, draws: 0 });
    const s = normalizeSave({
      v: 4,
      cosmetics: {
        owned: ['crown', 'crown', 'nope', 'c-mint', 't-desk', 5],
        outfits: { grunt: { hat: 'crown', color: 'c-gold' }, hero: { hat: 'c-mint' }, ghost: { hat: 'crown' }, coder: 'x' },
        title: 't-accept',
        pity: 99,
        draws: -3,
      },
    });
    expect(s.cosmetics.owned).toEqual(['crown', 'c-mint', 't-desk']);
    // 가지지 않은 색, 종류가 다른 아이템, 없는 칸은 버린다
    expect(s.cosmetics.outfits).toEqual({ grunt: { hat: 'crown' } });
    expect(s.cosmetics.title).toBe('');
    expect(s.cosmetics.pity).toBe(PITY - 1);
    expect(s.cosmetics.draws).toBe(0);
    // 다시 읽어도 같다
    expect(normalizeSave(JSON.parse(JSON.stringify(s))).cosmetics).toEqual(s.cosmetics);
    expect(COSMETIC_BY_ID.crown!.grade).toBe('accept');
  });

  it('뽑기에 연구비를 쓴 저장이 동기화 충돌에서 밀리지 않는다', () => {
    const before = newSave();
    before.money = 3000;
    const after = normalizeSave(JSON.parse(JSON.stringify(before)));
    drawCosmetics(after, 10, seeded(3));
    expect(after.cosmetics.owned.length).toBeGreaterThan(0);
    expect(progressScore(after)).toBeGreaterThan(progressScore(before));
    expect(pickBetter(before, after)).toBe(after);
  });
});
