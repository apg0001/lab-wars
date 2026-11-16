import type { CombatStats, UnitDef } from '../data/types';
import { UNITS } from '../data/units';
import { STAGES, type StageDef } from '../data/stages';
import { FACILITIES, SKILLS, facilityCost, type FacilityId, type SkillDef } from '../data/upgrades';

export const SAVE_VERSION = 1;

export interface UnitProgress {
  level: number;
  /** 진화 단계 1~3 */
  tier: number;
}

export interface SaveData {
  v: number;
  money: number;
  /** 스테이지 id → 최고 별 수 (0이면 미클리어) */
  stars: Record<string, number>;
  units: Record<string, UnitProgress>;
  /** 구독한 AI 조수 id */
  subs: string[];
  facilities: Record<FacilityId, number>;
  updatedAt: number;
}

export function newSave(): SaveData {
  return {
    v: SAVE_VERSION,
    money: 0,
    stars: {},
    units: {},
    subs: [],
    facilities: { remodel: 0, coffee: 0, tumbler: 0, meditate: 0, mug: 0, printer: 0, printerRange: 0 },
    updatedAt: Date.now(),
  };
}

/** 외부에서 읽은 값을 안전한 SaveData로 정리한다. */
export function normalizeSave(raw: unknown): SaveData {
  const base = newSave();
  base.updatedAt = 0;
  if (!raw || typeof raw !== 'object') return base;
  const r = raw as Partial<SaveData>;
  const num = (x: unknown, d: number) => (typeof x === 'number' && Number.isFinite(x) ? x : d);
  base.money = Math.max(0, Math.floor(num(r.money, 0)));
  if (r.stars && typeof r.stars === 'object') {
    for (const s of STAGES) base.stars[s.id] = Math.min(3, Math.max(0, Math.floor(num(r.stars[s.id], 0))));
  }
  if (r.units && typeof r.units === 'object') {
    for (const u of UNITS) {
      const p = r.units[u.id];
      if (!p) continue;
      const tier = Math.min(3, Math.max(1, Math.floor(num(p.tier, 1))));
      const level = Math.min(levelCap(tier), Math.max(1, Math.floor(num(p.level, 1))));
      base.units[u.id] = { level, tier };
    }
  }
  if (Array.isArray(r.subs)) base.subs = r.subs.filter((id) => UNITS.some((u) => u.id === id && u.unlock.subscribe));
  if (r.facilities && typeof r.facilities === 'object') {
    for (const f of FACILITIES) base.facilities[f.id] = Math.min(f.max, Math.max(0, Math.floor(num(r.facilities[f.id], 0))));
  }
  base.updatedAt = num(r.updatedAt, 0);
  return base;
}

export const isCleared = (save: SaveData, stageId: string): boolean => (save.stars[stageId] ?? 0) > 0;

export function isStageOpen(save: SaveData, stage: StageDef): boolean {
  if (stage.order === 0) return true;
  const prev = STAGES[stage.order - 1];
  return !!prev && isCleared(save, prev.id);
}

export function isUnitOwned(save: SaveData, def: UnitDef): boolean {
  if (def.unlock.subscribe) return save.subs.includes(def.id);
  return !def.unlock.stage || isCleared(save, def.unlock.stage);
}

export function canSubscribe(save: SaveData, def: UnitDef): boolean {
  return !!def.unlock.subscribe && !save.subs.includes(def.id) && (!def.unlock.stage || isCleared(save, def.unlock.stage));
}

export function isSkillOpen(save: SaveData, skill: SkillDef): boolean {
  return !skill.unlockStage || isCleared(save, skill.unlockStage);
}

export const levelCap = (tier: number): number => tier * 5;

export function unitProgress(save: SaveData, id: string): UnitProgress {
  return save.units[id] ?? { level: 1, tier: 1 };
}

export const levelUpCost = (def: UnitDef, level: number): number => Math.round(def.cost * 5 * 1.3 ** (level - 1));

export const evolveCost = (def: UnitDef, tier: number): number => def.cost * (tier === 1 ? 40 : 120);

export function canLevelUp(save: SaveData, def: UnitDef): boolean {
  const p = unitProgress(save, def.id);
  return isUnitOwned(save, def) && p.level < levelCap(p.tier) && save.money >= levelUpCost(def, p.level);
}

export function canEvolve(save: SaveData, def: UnitDef): boolean {
  const p = unitProgress(save, def.id);
  return isUnitOwned(save, def) && p.tier < 3 && p.level >= levelCap(p.tier) && save.money >= evolveCost(def, p.tier);
}

export function levelUp(save: SaveData, def: UnitDef): boolean {
  if (!canLevelUp(save, def)) return false;
  const p = unitProgress(save, def.id);
  save.money -= levelUpCost(def, p.level);
  save.units[def.id] = { ...p, level: p.level + 1 };
  return true;
}

export function evolve(save: SaveData, def: UnitDef): boolean {
  if (!canEvolve(save, def)) return false;
  const p = unitProgress(save, def.id);
  save.money -= evolveCost(def, p.tier);
  save.units[def.id] = { ...p, tier: p.tier + 1 };
  return true;
}

export function subscribe(save: SaveData, def: UnitDef): boolean {
  if (!canSubscribe(save, def) || save.money < (def.unlock.subscribe ?? 0)) return false;
  save.money -= def.unlock.subscribe ?? 0;
  save.subs.push(def.id);
  return true;
}

export function upgradeFacility(save: SaveData, id: FacilityId): boolean {
  const f = FACILITIES.find((x) => x.id === id);
  if (!f) return false;
  const lv = save.facilities[id];
  if (lv >= f.max) return false;
  const cost = facilityCost(f, lv);
  if (save.money < cost) return false;
  save.money -= cost;
  save.facilities[id] = lv + 1;
  return true;
}

/** 레벨·진화를 반영한 전투 능력치 */
export function unitStats(def: UnitDef, p: UnitProgress): CombatStats {
  const mul = 1.08 ** (p.level - 1) * 1.5 ** (p.tier - 1);
  const stats: CombatStats = { ...def, hp: Math.round(def.hp * mul), atk: Math.round(def.atk * mul * 10) / 10 };
  if (def.heal) stats.heal = { ...def.heal, amount: Math.round(def.heal.amount * mul) };
  return stats;
}

export interface DeckEntry {
  def: UnitDef;
  stats: CombatStats;
  tier: number;
  level: number;
}

export interface BattleLoadout {
  baseHp: number;
  caffeineStart: number;
  caffeineMax: number;
  caffeineRegen: number;
  mentalMax: number;
  mentalRegen: number;
  mugDmg: number;
  printerAtk: number;
  printerRange: number;
  deck: DeckEntry[];
  skills: SkillDef[];
}

export function makeLoadout(save: SaveData): BattleLoadout {
  const f = save.facilities;
  return {
    baseHp: Math.round(1000 * (1 + 0.12 * f.remodel)),
    caffeineStart: 30,
    caffeineMax: 100 + 15 * f.tumbler,
    caffeineRegen: 5 + 0.6 * f.coffee,
    mentalMax: 100,
    mentalRegen: 1.5 + 0.25 * f.meditate,
    mugDmg: 30 * (1 + 0.2 * f.mug),
    printerAtk: 12 * (1 + 0.2 * f.printer),
    printerRange: 280 + 20 * f.printerRange,
    deck: UNITS.filter((u) => isUnitOwned(save, u)).map((def) => {
      const p = unitProgress(save, def.id);
      return { def, stats: unitStats(def, p), tier: p.tier, level: p.level };
    }),
    skills: SKILLS.filter((s) => isSkillOpen(save, s)),
  };
}

export function starsFor(hpRatio: number): number {
  if (hpRatio >= 0.7) return 3;
  if (hpRatio >= 0.35) return 2;
  return 1;
}

export interface BattleOutcome {
  win: boolean;
  stars: number;
  clearReward: number;
  killReward: number;
  firstClear: boolean;
}

/** 전투 결과를 저장 데이터에 반영한다. */
export function applyOutcome(save: SaveData, stage: StageDef, win: boolean, baseHpRatio: number, killReward: number): BattleOutcome {
  const prev = save.stars[stage.id] ?? 0;
  let stars = 0;
  let clearReward = 0;
  if (win) {
    stars = starsFor(baseHpRatio);
    const full = stage.reward * (0.6 + 0.2 * stars);
    clearReward = Math.round(prev === 0 ? full : full * 0.4);
    save.stars[stage.id] = Math.max(prev, stars);
  }
  save.money += clearReward + killReward;
  save.updatedAt = Date.now();
  return { win, stars, clearReward, killReward, firstClear: win && prev === 0 };
}
