import { STAGES, type StageDef } from '../data/stages';
import { UNITS } from '../data/units';
import { FACILITIES, facilityCost } from '../data/upgrades';
import { ALLY_FRONT, Battle, makeRng } from './battle';
import { RANGED_THRESHOLD } from '../data/types';
import {
  applyOutcome, canEvolve, canLevelUp, evolve, evolveCost, levelUp, levelUpCost, makeLoadout, subscribe,
  canSubscribe, unitProgress, upgradeFacility, type SaveData,
} from './progression';

/**
 * 밸런스 검증용 자동 플레이어. 사람 수준으로 플레이하도록 판단 주기를 0.4초로 두고,
 * 폭격 스킬은 조준 오차를 둔다.
 */
export function playBot(battle: Battle, limit = 300, seed = 4242): void {
  const rng = makeRng(seed);
  let think = 0;
  while (!battle.result && battle.t < limit) {
    battle.step(1 / 60);
    think += 1 / 60;
    if (think < 0.4) continue;
    think = 0;
    botThink(battle, rng);
  }
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
    if (!affordable.length) return;
    affordable[0]!.buy();
  }
}

export interface StageRun {
  stage: string;
  attempts: number;
  stars: number;
  seconds: number;
}

/**
 * 캠페인 전체를 봇으로 진행한다. 지면 직전 스테이지를 한 번 다시 돌아 연구비를 모은 뒤 재도전한다.
 */
export function runCampaign(save: SaveData, maxAttempts = 12, seed = 7): { runs: StageRun[]; stuckAt: string | null } {
  const runs: StageRun[] = [];
  let s = seed;
  for (const stage of STAGES) {
    let attempts = 0;
    for (;;) {
      attempts++;
      botShop(save);
      const r = playOnce(save, stage, s++);
      if (r.win) {
        runs.push({ stage: stage.id, attempts, stars: r.stars, seconds: Math.round(r.seconds) });
        break;
      }
      if (attempts >= maxAttempts) return { runs, stuckAt: stage.id };
      const prev = STAGES[stage.order - 1];
      if (prev) {
        botShop(save);
        playOnce(save, prev, s++);
      }
    }
  }
  return { runs, stuckAt: null };
}

export function playOnce(save: SaveData, stage: StageDef, seed: number): { win: boolean; stars: number; seconds: number } {
  const battle = new Battle(stage, makeLoadout(save), seed);
  playBot(battle, 300, seed * 31 + 7);
  const win = battle.result === 'win';
  const out = applyOutcome(save, stage, win, battle.ally.hp / battle.ally.maxHp, battle.killReward);
  return { win, stars: out.stars, seconds: battle.t };
}
