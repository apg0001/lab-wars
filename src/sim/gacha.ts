import {
  COSMETICS, COSMETIC_BY_ID, DRAW10_PRICE, DRAW_PRICE, GRADES, GRADE_INFO, HERO_SLOT, PITY, type CosmeticDef, type CosmeticKind, type Grade,
} from '../data/cosmetics';
import type { SaveData } from './progression';

/** 0 이상 1 미만 난수 (테스트에서 바꿔 끼운다) */
export type Rng = () => number;

export interface DrawResult {
  grade: Grade;
  /** 받은(또는 이미 있던) 아이템. 리젝에서 위로 칭호를 다 모았으면 없다 */
  item?: CosmeticDef;
  /** 새로 얻었는지 */
  fresh: boolean;
  /** 중복·리젝으로 돌려받은 연구비 */
  refund: number;
  /** 천장으로 희귀 이상이 보장된 뽑기 */
  pity: boolean;
}

const itemsOf = (grade: Grade): CosmeticDef[] => COSMETICS.filter((c) => c.grade === grade);

/** 등급 하나 뽑기. forceRare면 희귀 이상만 (확률 비율 유지). */
export function rollGrade(rng: Rng, forceRare = false): Grade {
  const pool = forceRare ? GRADES.filter((g) => g === 'accept' || g === 'minor') : GRADES;
  const total = pool.reduce((s, g) => s + GRADE_INFO[g].rate, 0);
  let x = rng() * total;
  for (const g of pool) {
    x -= GRADE_INFO[g].rate;
    if (x < 0) return g;
  }
  return pool[pool.length - 1]!;
}

const pick = <T>(arr: T[], rng: Rng): T => arr[Math.min(arr.length - 1, Math.floor(rng() * arr.length))]!;

/** 한 편 투고: 등급 → 아이템 → 중복이면 환급. 저장 데이터를 고친다(연구비는 빼지 않는다). */
export function drawOnce(save: SaveData, rng: Rng): DrawResult {
  const c = save.cosmetics;
  const forced = c.pity >= PITY - 1;
  const grade = rollGrade(rng, forced);
  c.draws++;
  c.pity = grade === 'accept' || grade === 'minor' ? 0 : c.pity + 1;
  let item: CosmeticDef | undefined;
  if (grade === 'reject') {
    // 리젝: 아직 없는 위로 칭호를 주고, 다 모았으면 소액 환급만
    const left = itemsOf('reject').filter((i) => !c.owned.includes(i.id));
    if (left.length) item = pick(left, rng);
  } else {
    item = pick(itemsOf(grade), rng);
  }
  const fresh = !!item && !c.owned.includes(item.id);
  if (item && fresh) c.owned.push(item.id);
  const refund = fresh ? 0 : GRADE_INFO[grade].refund;
  save.money += refund;
  return { grade, item, fresh, refund, pity: forced };
}

export const drawPrice = (count: number): number => (count >= 10 ? DRAW10_PRICE : DRAW_PRICE * count);

/** 1편 또는 10편 투고. 연구비가 모자라면 null. */
export function drawCosmetics(save: SaveData, count: 1 | 10, rng: Rng = Math.random): DrawResult[] | null {
  const price = drawPrice(count);
  if (save.money < price) return null;
  save.money -= price;
  const out: DrawResult[] = [];
  for (let i = 0; i < count; i++) out.push(drawOnce(save, rng));
  save.updatedAt = Date.now();
  return out;
}

export const owns = (save: SaveData, id: string): boolean => save.cosmetics.owned.includes(id);

/** 옷장: 칸(주인공·유닛)에 모자나 색을 입히거나(id) 벗긴다(null). 가진 것만 입힐 수 있다. */
export function equip(save: SaveData, slot: string, kind: Exclude<CosmeticKind, 'title'>, id: string | null): boolean {
  if (id !== null && (!owns(save, id) || COSMETIC_BY_ID[id]?.kind !== kind)) return false;
  const fits = save.cosmetics.outfits;
  const next = { ...fits[slot] };
  if (id === null) delete next[kind];
  else next[kind] = id;
  if (next.hat || next.color) fits[slot] = next;
  else delete fits[slot];
  save.updatedAt = Date.now();
  return true;
}

export function equipTitle(save: SaveData, id: string | null): boolean {
  if (id !== null && (!owns(save, id) || COSMETIC_BY_ID[id]?.kind !== 'title')) return false;
  save.cosmetics.title = id ?? '';
  save.updatedAt = Date.now();
  return true;
}

/** 지금 칭호 이름 ('' = 없음) */
export const titleName = (save: SaveData): string => COSMETIC_BY_ID[save.cosmetics.title]?.name ?? '';

export { HERO_SLOT };
