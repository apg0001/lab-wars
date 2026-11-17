import { describe, expect, it } from 'vitest';
import { Battle, type Fighter } from '../src/sim/battle';
import { CARDS, CARD_BY_ID, DRAFT_FALLBACK, DRAFT_MIN_T, MAX_DRAWS, RARITY_ODDS, type CardRarity } from '../src/data/cards';
import { ICON_NAMES } from '../src/render/doodle';
import { STAGE_BY_ID } from '../src/data/stages';
import { makeLoadout, newSave } from '../src/sim/progression';
import { botPickCard, playBot } from '../src/sim/bot';

const stage = STAGE_BY_ID['1-1']!;
const make = (seed = 1, over: Partial<typeof stage> = {}) => {
  const b = new Battle({ ...stage, ...over }, makeLoadout(newSave()), seed);
  b.ally.hp = b.ally.maxHp = 1e9; // 연구실이 먼저 무너지지 않게
  b.enemy.hp = b.enemy.maxHp = 1e9;
  return b;
};
const steps = (b: Battle, sec: number) => {
  for (let i = 0; i < sec * 60 && !b.draft; i++) b.step(1 / 60);
};
type Priv = { spawnEnemy: (id: string, boss?: boolean, x?: number) => Fighter | null; damageFighter: (f: Fighter, d: number, s: string) => void };
const priv = (b: Battle) => b as unknown as Priv;

describe('학회 경품 추첨 카드 데이터', () => {
  it('14~16장, 등급마다 1장 이상, 아이콘은 낙서 아이콘이고 이모지가 없다', () => {
    expect(CARDS.length).toBeGreaterThanOrEqual(14);
    expect(CARDS.length).toBeLessThanOrEqual(16);
    expect(new Set(CARDS.map((c) => c.id)).size).toBe(CARDS.length);
    for (const r of ['common', 'rare', 'legend', 'curse'] as CardRarity[]) expect(CARDS.some((c) => c.rarity === r)).toBe(true);
    const emoji = /\p{Extended_Pictographic}/u;
    for (const c of CARDS) {
      expect(ICON_NAMES).toContain(c.icon);
      for (const t of [c.name, c.desc, c.chip, c.flavor]) expect(emoji.test(t)).toBe(false);
      if (c.kind === 'timed') expect(c.dur).toBeGreaterThan(0);
    }
    expect(Object.values(RARITY_ODDS).reduce((a, b) => a + b, 0)).toBeCloseTo(1);
  });
});

describe('추첨 시점', () => {
  it('잡무 러시를 버텨 내면 추첨이 열린다 (30초 이후)', () => {
    const b = make();
    let rushed = false;
    while (!rushed) {
      b.step(1 / 60);
      rushed = b.drainEvents().some((e) => e.type === 'rush');
    }
    expect(b.t).toBeGreaterThanOrEqual(DRAFT_MIN_T);
    steps(b, 3); // 러시 적이 다 나올 때까지
    expect(b.draft).toBeNull();
    for (const f of b.alive('enemy')) priv(b).damageFighter.call(b, f, 1e9, 'ally');
    b.step(1 / 60);
    expect(b.draft).toHaveLength(3);
    expect(b.draws).toBe(1);
    expect(b.drainEvents().some((e) => e.type === 'draft')).toBe(true);
  });

  it('러시가 없어도 일정 시간이 지나면 추첨한다', () => {
    const b = make(1, { rush: { first: 1e9, every: 1e9, size: 0 } });
    steps(b, DRAFT_FALLBACK - 1);
    expect(b.draft).toBeNull();
    steps(b, 2);
    expect(b.draft).not.toBeNull();
    expect(b.t).toBeCloseTo(DRAFT_FALLBACK, 1);
  });

  it('한 판에 최대 3번까지만 추첨한다', () => {
    const b = make(3, { rush: { first: 1e9, every: 1e9, size: 0 } });
    for (let i = 0; i < 8; i++) {
      steps(b, 200);
      if (b.draft) b.pickCard(0);
    }
    expect(b.draws).toBe(MAX_DRAWS);
    expect(b.picked).toHaveLength(MAX_DRAWS);
  });

  it('카드를 끄면 추첨하지 않는다', () => {
    const b = new Battle({ ...stage, rush: { first: 1e9, every: 1e9, size: 0 } }, makeLoadout(newSave()), 1, { cards: false });
    b.ally.hp = b.ally.maxHp = 1e9;
    b.enemy.hp = b.enemy.maxHp = 1e9;
    steps(b, 200);
    expect(b.draft).toBeNull();
    expect(b.t).toBeGreaterThan(199);
  });
});

describe('추첨 진행', () => {
  it('추첨 대기 중에는 전투가 멈추고 조작도 막힌다', () => {
    const b = make();
    b.caffeine = 999;
    b.openDraft();
    const t = b.t;
    b.step(1 / 60);
    b.update(1);
    expect(b.t).toBe(t);
    expect(b.canSummon('grunt')).toBe(false);
    expect(b.summon('grunt')).toBe(false);
    expect(b.brew()).toBe(false);
    expect(b.pickCard(5)).toBe(false);
    expect(b.pickCard(1)).toBe(true);
    expect(b.draft).toBeNull();
    b.step(1 / 60);
    expect(b.t).toBeGreaterThan(t);
    expect(b.summon('grunt')).toBe(true);
  });

  it('같은 시드면 같은 카드가 나오고, 시드가 다르면 달라진다', () => {
    const hands = (seed: number) => {
      const b = make(seed);
      const out: string[][] = [];
      for (let i = 0; i < 3; i++) {
        b.openDraft();
        out.push(b.draft!.map((c) => c.id));
        b.pickCard(0);
      }
      return out;
    };
    expect(hands(42)).toEqual(hands(42));
    const all = new Set([1, 2, 3, 4, 5, 6].map((s) => JSON.stringify(hands(s))));
    expect(all.size).toBeGreaterThan(1);
  });

  it('한 번에 뽑히는 3장은 서로 다르고 등급 비율이 대략 맞다', () => {
    const count: Record<CardRarity, number> = { common: 0, rare: 0, legend: 0, curse: 0 };
    for (let seed = 1; seed <= 1500; seed++) {
      const b = make(seed);
      b.openDraft();
      const hand = b.draft!;
      expect(new Set(hand.map((c) => c.id)).size).toBe(3);
      for (const c of hand) count[c.rarity]++;
    }
    const n = 4500;
    expect(count.common / n).toBeGreaterThan(0.55);
    expect(count.rare / n).toBeGreaterThan(0.2);
    expect(count.legend / n).toBeGreaterThan(0.05);
    expect(count.legend / n).toBeLessThan(0.11);
    expect(count.curse / n).toBeGreaterThan(0.02);
    expect(count.curse / n).toBeLessThan(0.08);
  });

  it('쓸모없는 카드는 나오지 않는다: 랩장이 없으면 확성기, 커피머신 최고 단계면 무상 수리', () => {
    for (let seed = 1; seed <= 300; seed++) {
      const b = make(seed);
      b.brewLevel = 6;
      b.openDraft();
      expect(b.draft!.some((c) => c.id === 'megaphone' || c.id === 'repair')).toBe(false);
    }
  });

  it('봇은 가장 높은 등급을 고르고 저주는 피한다', () => {
    const C = CARD_BY_ID;
    expect(botPickCard([C.refill!, C.payroll!, C.meeting!])).toBe(2);
    expect(botPickCard([C.reviewer2!, C.refill!, C.walk!])).toBe(1);
    expect(botPickCard([C.cooldown!, C.deadline!, C.weekend!])).toBe(1);
  });

  it('봇 전투도 추첨을 처리하며 끝까지 진행되고 결과가 재현된다', () => {
    const run = () => {
      const b = new Battle(STAGE_BY_ID['2-3']!, makeLoadout(newSave()), 9);
      playBot(b);
      return { r: b.result, t: Math.round(b.t), draws: b.draws, picked: b.picked.map((p) => p.card.id) };
    };
    const a = run();
    expect(a.r).not.toBeNull();
    expect(a.draws).toBeGreaterThan(0);
    expect(a).toEqual(run());
  });
});

describe('카드 효과', () => {
  it('즉시 효과: 카페인·멘탈·재소환 대기·연구실 회복·커피머신·교수실 피해', () => {
    const b = make();
    b.caffeine = 0;
    b.applyCard(CARD_BY_ID.refill!);
    expect(b.caffeine).toBe(40);
    b.mental = 0;
    b.applyCard(CARD_BY_ID.walk!);
    expect(b.mental).toBe(30);
    b.caffeine = 999;
    b.summon('grunt');
    expect(b.unitCd.grunt).toBeGreaterThan(0);
    b.applyCard(CARD_BY_ID.cooldown!);
    expect(b.unitCd.grunt).toBe(0);
    b.ally.hp = b.ally.maxHp * 0.5;
    b.applyCard(CARD_BY_ID.cleanup!);
    expect(b.ally.hp / b.ally.maxHp).toBeCloseTo(0.65);
    b.applyCard(CARD_BY_ID.repair!);
    expect(b.brewLevel).toBe(2);
    const hp = b.enemy.hp;
    b.applyCard(CARD_BY_ID.bestpaper!);
    expect(hp - b.enemy.hp).toBeCloseTo(b.enemy.maxHp * 0.1);
    expect(b.activeCards()).toHaveLength(0); // 즉시 카드는 칩으로 남지 않는다
  });

  it('이번 판 효과: 공격력·처치 보상·충전·포탑, 저주는 적 공격력도 올린다', () => {
    const b = make();
    const regen = b.caffeineRegen;
    b.applyCard(CARD_BY_ID.deadline!);
    b.applyCard(CARD_BY_ID.payroll!);
    b.applyCard(CARD_BY_ID.beans!);
    b.applyCard(CARD_BY_ID.toner!);
    b.applyCard(CARD_BY_ID.reviewer2!);
    expect(b.cardMods.allyAtk).toBeCloseTo(1.1);
    expect(b.cardMods.reward).toBeCloseTo(1.8);
    expect(b.cardMods.enemyAtk).toBeCloseTo(1.15);
    expect(b.cardMods.printerAtk).toBeCloseTo(1.25);
    expect(b.caffeineRegen).toBeCloseTo(regen * 1.1);
    expect(b.activeCards().map((a) => a.card.id)).toEqual(['deadline', 'payroll', 'beans', 'toner', 'reviewer2']);
    // 처치 보상 배율이 실제 보상에 들어간다
    const e = priv(b).spawnEnemy.call(b, 'paperwork', false, 900)!;
    const before = b.killReward;
    priv(b).damageFighter.call(b, e, 1e9, 'ally');
    expect(b.killReward - before).toBe(Math.round(e.reward * 1.8));
    // 아군 공격력 +10%: 근접 한 방 피해
    b.caffeine = 999;
    b.summon('grunt');
    const g = b.alive('ally')[0]!;
    g.x = 600;
    const foe = priv(b).spawnEnemy.call(b, 'paperwork', false, 615)!;
    foe.hp = foe.maxHp = 1e6;
    g.cd = 0;
    b.drainEvents();
    b.step(1 / 60);
    const hit = b.drainEvents().find((ev) => ev.type === 'hit' && ev.to === 'enemy');
    expect(hit && hit.type === 'hit' ? hit.dmg : 0).toBeCloseTo(g.stats.atk * 1.1);
  });

  it('교수님 회의 중: 15초간 적이 나오지 않다가 끝나면 다시 나온다', () => {
    const b = make();
    steps(b, 5);
    for (const f of b.alive('enemy')) f.dead = true;
    b.applyCard(CARD_BY_ID.meeting!);
    expect(b.activeCards()[0]!.left).toBeCloseTo(15);
    const spawned = () => b.alive('enemy').length;
    steps(b, 14.9);
    expect(spawned()).toBe(0);
    expect(b.activeCards()).toHaveLength(1);
    steps(b, 10);
    expect(spawned()).toBeGreaterThan(0);
    expect(b.activeCards()).toHaveLength(0);
  });

  it('학회 뒤풀이: 아군 전원 완전 회복 + 3초 무적 후 다시 피해를 입는다', () => {
    const b = make();
    b.caffeine = 999;
    b.summon('grunt');
    const g = b.alive('ally')[0]!;
    g.hp = 1;
    b.applyCard(CARD_BY_ID.afterparty!);
    expect(g.hp).toBe(g.maxHp);
    priv(b).damageFighter.call(b, g, 50, 'enemy');
    expect(g.hp).toBe(g.maxHp);
    steps(b, 3.1);
    expect(b.invulnT).toBe(0);
    priv(b).damageFighter.call(b, g, 5, 'enemy');
    expect(g.hp).toBe(g.maxHp - 5);
  });

  it('주말 출근: 충전 +30%, 적이 더 자주 나온다', () => {
    const count = (curse: boolean) => {
      const b = make(5, { rush: { first: 1e9, every: 1e9, size: 0 } });
      b.ally.hp = 1e9;
      if (curse) b.applyCard(CARD_BY_ID.weekend!);
      const seen = new Set<number>();
      for (let i = 0; i < 60 * 60; i++) {
        b.step(1 / 60);
        for (const f of b.fighters) if (f.side === 'enemy') seen.add(f.uid);
      }
      return seen.size;
    };
    expect(count(true)).toBeGreaterThan(count(false));
  });
});
