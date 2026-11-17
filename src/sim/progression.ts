import type { CombatStats, UnitDef } from '../data/types';
import { UNITS } from '../data/units';
import { FINAL_STAGE, SIDE_STAGES, STAGES, legacyOrder, v2Order, type StageDef } from '../data/stages';

/** 0.8(7챕터×6)에는 없던, 챕터 사이에 새로 생긴 스테이지 */
const v2Gap = (s: StageDef): boolean => s.chapter <= 7 && [2, 4, 6, 8].includes(s.index);
import { FACILITIES, SKILLS, facilityCost, type FacilityId, type SkillDef } from '../data/upgrades';

/** 2: 7챕터 캠페인 (0.8.0) */
export const SAVE_VERSION = 4;

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
  /** 무한 모드 최고 기록 (클리어한 판 수) */
  endless: number;
  /** 이미 본 스토리 장면 id */
  seen: string[];
  updatedAt: number;
}

export function newSave(): SaveData {
  return {
    v: SAVE_VERSION,
    money: 0,
    stars: {},
    units: {},
    subs: [],
    facilities: { remodel: 0, coffee: 0, tumbler: 0, meditate: 0, planner: 0, printer: 0, printerRange: 0 },
    endless: 0,
    seen: [],
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
  const starOf = (v: unknown): number => Math.min(3, Math.max(0, Math.floor(num(v, 0))));
  if (r.stars && typeof r.stars === 'object') {
    if (num(r.v, 1) < 2) {
      // 예전 4챕터×5 캠페인 → 7챕터×6: 같은 난이도 지점까지 클리어한 것으로 옮긴다.
      let reach = -1;
      const oldStars: number[] = [];
      for (const [id, v] of Object.entries(r.stars)) {
        const o = legacyOrder(id);
        const st = starOf(v);
        if (o === null || st === 0) continue;
        reach = Math.max(reach, o);
        oldStars.push(st);
      }
      if (reach >= 0) {
        const avg = Math.max(1, Math.round(oldStars.reduce((a, b) => a + b, 0) / oldStars.length));
        for (const s of STAGES) if (s.order <= reach) base.stars[s.id] = avg;
        migrationNotes.push(`📚 캠페인이 학부생~포닥 7챕터로 늘어났어요. 예전 진행도에 맞춰 ${STAGES[reach]!.id}까지 클리어로 옮겼어요.`);
      }
    } else if (num(r.v, 1) < 3) {
      // 7챕터×6 → 7챕터×10: 실제로 깬 스테이지만 옮긴다. 사이에 새로 생긴 스테이지는 열리기만 한다.
      let reach = -1;
      for (const [id, v] of Object.entries(r.stars)) {
        const o = v2Order(id);
        const st = starOf(v);
        if (o === null || st === 0) continue;
        reach = Math.max(reach, o);
        base.stars[STAGES[o]!.id] = st;
      }
      if (reach >= 0) migrationNotes.push(`📚 챕터마다 스테이지가 10개로 늘었어요. 깬 스테이지는 그대로 옮겼고, 사이에 새로 생긴 스테이지는 열어 뒀어요.`);
    } else {
      for (const s of [...STAGES, ...SIDE_STAGES]) base.stars[s.id] = starOf(r.stars[s.id]);
      if (num(r.v, 1) < 4) {
        // 0.9.0 이전 버그: 사이 스테이지를 깬 것으로 채웠다. 실제로 들어가 본 기록(장면)이 없으면 되돌린다.
        const seen = new Set(Array.isArray(r.seen) ? r.seen : []);
        let fixed = 0;
        for (const s of STAGES) {
          if (!v2Gap(s) || !base.stars[s.id] || seen.has(`st-${s.id}`)) continue;
          base.stars[s.id] = 0;
          fixed++;
        }
        if (fixed) migrationNotes.push(`🔧 예전 진행도를 옮길 때 안 깬 스테이지 ${fixed}개가 클리어로 잘못 표시됐어요. 바로잡았고, 그 스테이지들은 열려 있어요.`);
      }
    }
  }
  base.endless = Math.max(0, Math.floor(num(r.endless, 0)));
  if (Array.isArray(r.seen)) base.seen = r.seen.filter((x): x is string => typeof x === 'string').slice(0, 200);
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
  // 머그컵 투척기 제거(0.5.0): 강화에 쓴 연구비를 돌려준다.
  const mugLv = Math.min(10, Math.max(0, Math.floor(num((r.facilities as Record<string, unknown> | undefined)?.mug, 0))));
  if (mugLv > 0) {
    let refund = 0;
    for (let lv = 0; lv < mugLv; lv++) refund += Math.round(70 * 1.45 ** lv);
    base.money += refund;
    migrationNotes.push(`🫖 머그컵 투척기가 사라져서 강화 비용 💰${refund.toLocaleString('ko-KR')}을 돌려드렸어요.`);
  }
  base.updatedAt = num(r.updatedAt, 0);
  return base;
}

const migrationNotes: string[] = [];

/** 저장 데이터를 정리하며 생긴 안내(환불 등)를 꺼낸다. */
export function takeMigrationNotes(): string[] {
  return migrationNotes.splice(0);
}

export const isCleared = (save: SaveData, stageId: string): boolean => (save.stars[stageId] ?? 0) > 0;

/** 무한 모드는 처음부터 열려 있다 (0.15.0~) */
export const isEndlessOpen = (_save: SaveData): boolean => true;
/** 외전은 엔딩(최종 보스)을 본 뒤에 열린다 */
export const isSideOpen = (save: SaveData): boolean => isCleared(save, FINAL_STAGE.id);

export function isStageOpen(save: SaveData, stage: StageDef): boolean {
  if (stage.kind === 'endless') return isEndlessOpen(save) && stage.index <= save.endless + 1;
  if (stage.side) {
    // 외전: 엔딩을 본 뒤 외전마다 첫 판부터 차례로
    if (!isCleared(save, FINAL_STAGE.id)) return false;
    if (stage.index === 1 || isCleared(save, stage.id)) return true;
    return isCleared(save, `S${stage.side}-${stage.index - 1}`);
  }
  if (stage.order === 0 || isCleared(save, stage.id)) return true;
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

/** 이미 깬 스테이지를 다시 깰 때 클리어 보상 비율 */
export const REPLAY_MUL = 0.5;

export const levelCap = (tier: number): number => tier * 5;

export function unitProgress(save: SaveData, id: string): UnitProgress {
  return save.units[id] ?? { level: 1, tier: 1 };
}

export const levelUpCost = (def: UnitDef, level: number): number => Math.round(def.cost * 6 * 1.33 ** (level - 1));

export const evolveCost = (def: UnitDef, tier: number): number => def.cost * (tier === 1 ? 45 : 135);

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
  printerAtk: number;
  printerRange: number;
  /** 동료 재소환 대기시간 배율 */
  cooldownMul: number;
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
    printerAtk: 20 * (1 + 0.2 * f.printer),
    printerRange: 300 + 25 * f.printerRange,
    cooldownMul: 1 - 0.04 * f.planner,
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
  if (win && stage.kind === 'endless') {
    // 무한 모드: 별 대신 최고 기록, 처음 넘은 판만 전체 보상
    stars = starsFor(baseHpRatio);
    const first = stage.index > save.endless;
    clearReward = Math.round(stage.reward * (first ? 1 : 0.4));
    save.endless = Math.max(save.endless, stage.index);
    save.money += clearReward + killReward;
    save.updatedAt = Date.now();
    return { win, stars, clearReward, killReward, firstClear: first };
  }
  if (win) {
    stars = starsFor(baseHpRatio);
    const full = stage.reward * (0.6 + 0.2 * stars);
    clearReward = Math.round(prev === 0 ? full : full * REPLAY_MUL);
    save.stars[stage.id] = Math.max(prev, stars);
  }
  save.money += clearReward + killReward;
  save.updatedAt = Date.now();
  return { win, stars, clearReward, killReward, firstClear: win && prev === 0 };
}
