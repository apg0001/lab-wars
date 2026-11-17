import type { UnitDef, UnitRarity } from '../data/types';
import { GACHA_UNITS, rarityOf } from '../data/units';
import { MAX_PASSION, autoSlot, passionOf, type SaveData } from './progression';

/**
 * "장비 지원" 유닛 뽑기. 연구비로 뽑기권을 사서 쓰고, 보스 첫 클리어·무한 10판마다 무료로도 받는다.
 * 난수는 바꿔 끼울 수 있다 (테스트).
 */
export type Rng = () => number;
export type GachaRarity = Exclude<UnitRarity, 'basic'>;

export const TICKET_PRICE = 300;
export const TICKET10_PRICE = 2700;
/** 등급 확률 (합 1) */
export const UNIT_RATES: Record<GachaRarity, number> = { rare: 0.7, epic: 0.25, legend: 0.05 };
export const GACHA_RARITIES: GachaRarity[] = ['legend', 'epic', 'rare'];
/** 이만큼 뽑으면 레전더리 하나를 골라 받는다 */
export const SPARK = 100;
/** 열정이 가득 찬 뒤 중복은 연구비로 돌려받는다 */
export const DUP_REFUND: Record<GachaRarity, number> = { rare: 100, epic: 300, legend: 1000 };

export interface UnitDrawResult {
  def: UnitDef;
  rarity: GachaRarity;
  /** 처음 얻었는지 */
  fresh: boolean;
  /** 중복으로 오른 열정 (오른 뒤 값, 안 올랐으면 0) */
  passion: number;
  /** 열정이 가득 차서 돌려받은 연구비 */
  refund: number;
  /** 10연 보장으로 에픽 이상이 된 뽑기 */
  forced: boolean;
}

export function buyTickets(save: SaveData, count: 1 | 10): boolean {
  const price = count === 10 ? TICKET10_PRICE : TICKET_PRICE;
  if (save.money < price) return false;
  save.money -= price;
  save.gear.tickets += count;
  save.updatedAt = Date.now();
  return true;
}

/** 등급 하나. forceEpic이면 에픽 이상만 (확률 비율 유지). */
export function rollUnitRarity(rng: Rng, forceEpic = false): GachaRarity {
  const pool = GACHA_RARITIES.filter((r) => !forceEpic || r !== 'rare');
  const total = pool.reduce((s, r) => s + UNIT_RATES[r], 0);
  let x = rng() * total;
  for (const r of pool) {
    x -= UNIT_RATES[r];
    if (x < 0) return r;
  }
  return pool[pool.length - 1]!;
}

export const unitsOfRarity = (r: GachaRarity): UnitDef[] => GACHA_UNITS.filter((u) => rarityOf(u) === r);

/** 유닛 하나를 받는다: 처음이면 보유, 중복이면 열정 +1, 열정이 가득이면 연구비 환급 */
export function grantUnit(save: SaveData, def: UnitDef): { fresh: boolean; passion: number; refund: number } {
  const n = save.gear.owned[def.id] ?? 0;
  if (n === 0) {
    save.gear.owned[def.id] = 1;
    autoSlot(save, def.id);
    return { fresh: true, passion: 0, refund: 0 };
  }
  if (passionOf(save, def.id) < MAX_PASSION) {
    save.gear.owned[def.id] = n + 1;
    return { fresh: false, passion: passionOf(save, def.id), refund: 0 };
  }
  const refund = DUP_REFUND[rarityOf(def) as GachaRarity] ?? 0;
  save.money += refund;
  return { fresh: false, passion: 0, refund };
}

export function drawUnitOnce(save: SaveData, rng: Rng, forceEpic = false): UnitDrawResult {
  let rarity = rollUnitRarity(rng, forceEpic);
  let pool = unitsOfRarity(rarity);
  // 그 등급 유닛이 아직 없으면 (콘텐츠 추가 전) 있는 등급으로
  if (!pool.length) {
    rarity = GACHA_RARITIES.find((r) => unitsOfRarity(r).length)!;
    pool = unitsOfRarity(rarity);
  }
  const def = pool[Math.min(pool.length - 1, Math.floor(rng() * pool.length))]!;
  save.gear.draws++;
  save.gear.spark++;
  return { def, rarity, forced: forceEpic, ...grantUnit(save, def) };
}

/** 뽑기권 1장 또는 10장을 쓴다. 10연은 에픽 이상 1개를 보장한다. 뽑기권이 모자라면 null. */
export function drawUnits(save: SaveData, count: 1 | 10, rng: Rng = Math.random): UnitDrawResult[] | null {
  if (save.gear.tickets < count) return null;
  save.gear.tickets -= count;
  const out: UnitDrawResult[] = [];
  for (let i = 0; i < count; i++) {
    const force = count === 10 && i === count - 1 && !out.some((r) => r.rarity !== 'rare');
    out.push(drawUnitOnce(save, rng, force));
  }
  save.updatedAt = Date.now();
  return out;
}

export const canClaimSpark = (save: SaveData): boolean => save.gear.spark >= SPARK;

/** 천장: SPARK회 뽑았으면 레전더리 하나를 골라 받는다 */
export function claimSpark(save: SaveData, id: string): UnitDrawResult | null {
  const def = unitsOfRarity('legend').find((u) => u.id === id);
  if (!def || !canClaimSpark(save)) return null;
  save.gear.spark -= SPARK;
  save.updatedAt = Date.now();
  return { def, rarity: 'legend', forced: false, ...grantUnit(save, def) };
}
