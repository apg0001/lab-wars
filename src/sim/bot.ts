import { STAGES, type StageDef } from '../data/stages';
import { UNITS } from '../data/units';
import { FACILITIES, facilityCost } from '../data/upgrades';
import { ALLY_FRONT, Battle, makeRng, type BattleOptions } from './battle';
import { RANGED_THRESHOLD } from '../data/types';
import type { CardDef, CardRarity } from '../data/cards';
import {
  applyOutcome, canEvolve, canLevelUp, evolve, evolveCost, levelUp, levelUpCost, makeLoadout, subscribe,
  canSubscribe, unitProgress, upgradeFacility, ownedUnits, LOADOUT_MAX, type SaveData,
} from './progression';

/**
 * 밸런스 검증용 자동 플레이어. 사람 수준으로 플레이하도록 판단 주기를 0.4초로 두고,
 * 폭격 스킬은 조준 오차를 둔다. 기본 판 길이 상한은 스테이지 시간 제한.
 */
export function playBot(battle: Battle, limit = battle.stage.timeLimit ?? 300, seed = 4242): void {
  const rng = makeRng(seed);
  let think = 0;
  while (!battle.result && battle.t < limit) {
    if (battle.draft) battle.pickCard(botPickCard(battle.draft));
    battle.step(1 / 60);
    think += 1 / 60;
    if (think < 0.4) continue;
    think = 0;
    botThink(battle, rng);
  }
}

const RARITY_RANK: Record<CardRarity, number> = { legend: 3, rare: 2, common: 1, curse: 0 };

/** 봇의 카드 선택: 가장 높은 등급 (저주는 피한다), 같으면 앞의 카드 */
export function botPickCard(hand: CardDef[]): number {
  let best = 0;
  for (let i = 1; i < hand.length; i++) if (RARITY_RANK[hand[i]!.rarity] > RARITY_RANK[hand[best]!.rarity]) best = i;
  return best;
}

function botThink(b: Battle, rng: () => number): void {
  const enemies = b.alive('enemy');
  const allies = b.alive('ally');
  // 적이 연구실 가까이 없으면 커피머신에 투자한다.
  const nearest = enemies.reduce((m, e) => Math.min(m, e.x), Infinity);
  if (b.canBrew() && (nearest - ALLY_FRONT > 450 || b.caffeine >= b.caffeineMax - 1)) {
    b.brew();
    return;
  }
  // 가장 비싼 유닛을 우선 소환하되, 카페인이 넘칠 때만 고급 유닛을 기다린다.
  // 공중 적이 쌓이면 대공 가능한 유닛(원거리)을 먼저 뽑는다.
  const air = enemies.filter((e) => e.stats.flying).length;
  const antiAir = (d: { def: { range: number } }) => d.def.range >= RANGED_THRESHOLD;
  const deck = [...b.loadout.deck].sort((x, y) => (air >= 2 ? Number(antiAir(y)) - Number(antiAir(x)) : 0) || y.def.cost - x.def.cost);
  // 적이 연구실 코앞이면 급한 대로 아무거나, 아니면 좋은 유닛을 위해 카페인을 모은다.
  const emergency = nearest - ALLY_FRONT < 260;
  for (const d of deck) {
    if ((b.unitCd[d.def.id] ?? 0) > 0) continue;
    if (b.canSummon(d.def.id)) {
      b.summon(d.def.id);
      break;
    }
    // 3초 안에 모을 수 있으면 기다리고, 아니면 다음(더 싼) 유닛을 본다
    const wait = (d.def.cost - b.caffeine) / b.caffeineRegen;
    if (!emergency && d.def.cost <= b.caffeineMax * 0.9 && wait <= 3) break;
  }
  for (const s of b.loadout.skills) {
    if (!b.canCast(s.id)) continue;
    if (s.id === 'snack' && allies.filter((a) => a.hp < a.maxHp * 0.5).length >= 3) b.cast('snack');
    else if (s.id === 'allnight' && allies.length >= 5) b.cast('allnight');
    else if (s.id === 'aircon' && enemies.length >= 6) b.cast('aircon');
    else if (s.id === 'bombard' && enemies.length >= 4) {
      const front = enemies.reduce((m, e) => (e.x < m.x ? e : m));
      b.cast('bombard', front.x + 30 + (rng() - 0.5) * 70);
    }
  }
}

/** 남은 돈으로 가장 싼 업그레이드부터 산다 (단순 성장 전략). */
export function botShop(save: SaveData): void {
  for (;;) {
    const options: { cost: number; buy: () => boolean }[] = [];
    for (const u of UNITS) {
      if (canSubscribe(save, u)) options.push({ cost: u.unlock.subscribe!, buy: () => subscribe(save, u) });
      const p = unitProgress(save, u.id);
      if (canLevelUp(save, u)) options.push({ cost: levelUpCost(u, p.level), buy: () => levelUp(save, u) });
      if (canEvolve(save, u)) options.push({ cost: evolveCost(u, p.tier), buy: () => evolve(save, u) });
    }
    for (const f of FACILITIES) {
      const lv = save.facilities[f.id];
      if (lv < f.max && save.money >= facilityCost(f, lv)) options.push({ cost: facilityCost(f, lv), buy: () => upgradeFacility(save, f.id) });
    }
    const affordable = options.filter((o) => o.cost <= save.money).sort((a, b) => a.cost - b.cost);
    if (!affordable.length) break;
    affordable[0]!.buy();
  }
  save.loadout = botSquad(save);
}

/**
 * 봇의 편성 9칸: 가장 싼 유닛(급할 때 막을 물량) 하나와 대공 가능한 유닛 하나를 남기고,
 * 나머지는 비싼(= 센) 유닛부터 채운다. 순서는 도감 순서.
 */
export function botSquad(save: SaveData): string[] {
  const owned = ownedUnits(save);
  if (owned.length <= LOADOUT_MAX) return owned.map((u) => u.id);
  const pick = new Set<string>();
  const cheapest = [...owned].sort((a, b) => a.cost - b.cost)[0]!;
  pick.add(cheapest.id);
  const byCost = [...owned].sort((a, b) => b.cost - a.cost);
  const aa = byCost.find((u) => u.range >= RANGED_THRESHOLD);
  if (aa) pick.add(aa.id);
  for (const u of byCost) {
    if (pick.size >= LOADOUT_MAX) break;
    pick.add(u.id);
  }
  return owned.filter((u) => pick.has(u.id)).map((u) => u.id);
}

export interface StageRun {
  stage: string;
  attempts: number;
  stars: number;
  seconds: number;
}

/**
 * 캠페인 전체를 봇으로 진행한다. 지면 직전 스테이지를 한 번 다시 돌아 연구비를 모은 뒤 재도전한다.
 * opts는 매 판 전투에 그대로 넘긴다 (예: { cards: false }로 카드 추첨 없이 기본 난이도만 잰다).
 */
export function runCampaign(save: SaveData, maxAttempts = 12, seed = 7, stages: StageDef[] = STAGES, opts: BattleOptions = {}): { runs: StageRun[]; stuckAt: string | null } {
  const runs: StageRun[] = [];
  let s = seed;
  for (const [i, stage] of stages.entries()) {
    let attempts = 0;
    for (;;) {
      attempts++;
      botShop(save);
      const r = playOnce(save, stage, s++, opts);
      if (r.win) {
        runs.push({ stage: stage.id, attempts, stars: r.stars, seconds: Math.round(r.seconds) });
        break;
      }
      if (attempts >= maxAttempts) return { runs, stuckAt: stage.id };
      const prev = i > 0 ? stages[i - 1] : undefined;
      if (prev) {
        botShop(save);
        playOnce(save, prev, s++, opts);
      }
    }
  }
  return { runs, stuckAt: null };
}

export function playOnce(save: SaveData, stage: StageDef, seed: number, opts: BattleOptions = {}): { win: boolean; stars: number; seconds: number } {
  const battle = new Battle(stage, makeLoadout(save), seed, opts);
  playBot(battle, undefined, seed * 31 + 7);
  const win = battle.result === 'win';
  const out = applyOutcome(save, stage, win, battle.ally.hp / battle.ally.maxHp, battle.killReward);
  return { win, stars: out.stars, seconds: battle.t };
}
