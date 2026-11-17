import type { CombatStats, UnitDef } from '../data/types';
import { tr } from '../i18n';
import { UNITS, UNIT_BY_ID, isGachaUnit } from '../data/units';
import { FINAL_STAGE, SIDE_STAGES, STAGES, legacyOrder, v2Order, type StageDef } from '../data/stages';

/** 0.8(7챕터×6)에는 없던, 챕터 사이에 새로 생긴 스테이지 */
const v2Gap = (s: StageDef): boolean => s.chapter <= 7 && [2, 4, 6, 8].includes(s.index);
import { FACILITIES, SKILLS, facilityCost, type FacilityId, type SkillDef } from '../data/upgrades';
import { COSMETIC_BY_ID, HERO_SLOT, PITY, type Outfit } from '../data/cosmetics';

/** 2: 7챕터 캠페인 (0.8.0) · 5: 유닛 뽑기·편성 9칸 (0.17.0) */
export const SAVE_VERSION = 5;

/** 전투에 데려가는 편성 칸 수 (단축키 1~9) */
export const LOADOUT_MAX = 9;
/** 편성 프리셋 수 */
export const PRESET_COUNT = 3;
/** 중복으로 오르는 열정 최대치 (열정 1 = 최종 단계 레벨 상한 +1) */
export const MAX_PASSION = 5;

export interface UnitProgress {
  level: number;
  /** 진화 단계 1~3 */
  tier: number;
}

/** "심사 결과" 꾸미기 뽑기 기록. 겉모습만 바꾼다. */
export interface CosmeticSave {
  /** 가진 아이템 id */
  owned: string[];
  /** 옷장 칸(주인공 'hero' 또는 유닛 id) → 입힌 모자·색 */
  outfits: Record<string, Outfit>;
  /** 이름 옆에 붙이는 칭호 id ('' = 없음) */
  title: string;
  /** 마지막 희귀 이상 뒤로 이어진 뽑기 수 */
  pity: number;
  /** 지금까지 투고(뽑기)한 수 */
  draws: number;
}

/** 뽑기 장비(유닛) 기록 */
export interface GearSave {
  /** 유닛 id → 받은 장수 (1 = 보유, 2부터 중복 → 열정) */
  owned: Record<string, number>;
  /** 뽑기권 */
  tickets: number;
  /** 천장 카운터: 100이 차면 레전더리 하나를 골라 받는다 */
  spark: number;
  /** 지금까지 뽑은 수 */
  draws: number;
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
  cosmetics: CosmeticSave;
  gear: GearSave;
  /** 전투 편성 (유닛 id, 최대 LOADOUT_MAX, 순서 = 단축키) */
  loadout: string[];
  /** 편성 프리셋 (PRESET_COUNT개) */
  presets: string[][];
  updatedAt: number;
}

export const newGear = (): GearSave => ({ owned: {}, tickets: 0, spark: 0, draws: 0 });

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
    cosmetics: newCosmetics(),
    gear: newGear(),
    loadout: ['grunt'],
    presets: Array.from({ length: PRESET_COUNT }, () => []),
    updatedAt: Date.now(),
  };
}

/** 뽑기 기록 정리: 모르는 유닛·이상한 값은 버린다 */
export function normalizeGear(raw: unknown): GearSave {
  const out = newGear();
  if (!raw || typeof raw !== 'object') return out;
  const r = raw as Partial<Record<keyof GearSave, unknown>>;
  const int = (x: unknown, max: number): number => (typeof x === 'number' && Number.isFinite(x) ? Math.min(max, Math.max(0, Math.floor(x))) : 0);
  if (r.owned && typeof r.owned === 'object') {
    for (const [id, n] of Object.entries(r.owned as Record<string, unknown>)) {
      const def = UNIT_BY_ID[id];
      const c = int(n, 1 + MAX_PASSION);
      if (def && isGachaUnit(def) && c > 0) out.owned[id] = c;
    }
  }
  out.tickets = int(r.tickets, 99999);
  out.spark = int(r.spark, 1e6);
  out.draws = int(r.draws, 1e7);
  return out;
}

export const newCosmetics = (): CosmeticSave => ({ owned: [], outfits: {}, title: '', pity: 0, draws: 0 });

/** 꾸미기 기록 정리: 모르는 아이템·칸은 버리고, 가지지 않은 아이템은 벗긴다. 예전 저장은 빈 옷장으로 시작한다. */
export function normalizeCosmetics(raw: unknown): CosmeticSave {
  const out = newCosmetics();
  if (!raw || typeof raw !== 'object') return out;
  const r = raw as Partial<Record<keyof CosmeticSave, unknown>>;
  const int = (x: unknown, max: number): number => (typeof x === 'number' && Number.isFinite(x) ? Math.min(max, Math.max(0, Math.floor(x))) : 0);
  if (Array.isArray(r.owned)) out.owned = [...new Set(r.owned.filter((id): id is string => typeof id === 'string' && !!COSMETIC_BY_ID[id]))];
  const has = (id: unknown, kind: string): id is string => typeof id === 'string' && out.owned.includes(id) && COSMETIC_BY_ID[id]!.kind === kind;
  if (r.outfits && typeof r.outfits === 'object') {
    const slots = new Set([HERO_SLOT, ...UNITS.map((u) => u.id)]);
    for (const [slot, v] of Object.entries(r.outfits as Record<string, unknown>)) {
      if (!slots.has(slot) || !v || typeof v !== 'object') continue;
      const o = v as Record<string, unknown>;
      const fit: Outfit = {};
      if (has(o.hat, 'hat')) fit.hat = o.hat;
      if (has(o.color, 'color')) fit.color = o.color;
      if (fit.hat || fit.color) out.outfits[slot] = fit;
    }
  }
  if (has(r.title, 'title')) out.title = r.title;
  out.pity = int(r.pity, PITY - 1);
  out.draws = int(r.draws, 1e7);
  return out;
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
        migrationNotes.push(tr(`📚 캠페인이 학부생~포닥 7챕터로 늘어났어요. 예전 진행도에 맞춰 ${STAGES[reach]!.id}까지 클리어로 옮겼어요.`, `📚 The campaign now has 7 chapters (Undergrad to Postdoc). Based on your old progress, stages up to ${STAGES[reach]!.id} are marked cleared.`));
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
      if (reach >= 0) migrationNotes.push(tr('📚 챕터마다 스테이지가 10개로 늘었어요. 깬 스테이지는 그대로 옮겼고, 사이에 새로 생긴 스테이지는 열어 뒀어요.', '📚 Each chapter now has 10 stages. Your cleared stages carried over, and the new ones in between are unlocked.'));
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
        if (fixed) migrationNotes.push(tr(`🔧 예전 진행도를 옮길 때 안 깬 스테이지 ${fixed}개가 클리어로 잘못 표시됐어요. 바로잡았고, 그 스테이지들은 열려 있어요.`, `🔧 ${fixed} uncleared stage(s) were wrongly marked as cleared during an old migration. Fixed — they're unlocked for you.`));
      }
    }
  }
  base.endless = Math.max(0, Math.floor(num(r.endless, 0)));
  base.cosmetics = normalizeCosmetics(r.cosmetics);
  base.gear = normalizeGear(r.gear);
  if (Array.isArray(r.seen)) base.seen = r.seen.filter((x): x is string => typeof x === 'string').slice(0, 200);
  if (r.units && typeof r.units === 'object') {
    for (const u of UNITS) {
      const p = r.units[u.id];
      if (!p) continue;
      const tier = Math.min(3, Math.max(1, Math.floor(num(p.tier, 1))));
      const level = Math.min(levelCap(tier) + (tier === 3 ? passionOf(base, u.id) : 0), Math.max(1, Math.floor(num(p.level, 1))));
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
    migrationNotes.push(tr(`🫖 머그컵 투척기가 사라져서 강화 비용 💰${refund.toLocaleString('ko-KR')}을 돌려드렸어요.`, `🫖 The Mug Launcher was removed, so we refunded its upgrade cost of 💰${refund.toLocaleString('en-US')}.`));
  }
  if (num(r.v, 1) < 5) {
    // 0.17.0 편성 9칸: 지금 가진 유닛 중 앞의 9명으로 편성하고, 이미 깬 보스·무한 기록만큼 뽑기권을 준다.
    base.loadout = ownedUnits(base).slice(0, LOADOUT_MAX).map((u) => u.id);
    const tickets = ticketsEarnedSoFar(base);
    base.gear.tickets += tickets;
    if (Object.values(base.stars).some((v) => v > 0) || base.endless > 0) {
      migrationNotes.push(tr(`{ticket} 유닛 뽑기와 편성 9칸이 생겼어요. 지금 동료 중 앞의 9명으로 편성했고${tickets ? `, 지금까지 깬 보스·무한 기록만큼 뽑기권 ${tickets}장을 드렸어요` : ''}.`, `{ticket} Unit draws and a 9-slot squad are here. Your first 9 labmates are in the squad${tickets ? `, and you got ${tickets} ticket(s) for the bosses and endless records you've already cleared` : ''}.`));
    }
  } else {
    base.loadout = cleanSquad(base, r.loadout);
    if (!Array.isArray(r.loadout)) base.loadout = ownedUnits(base).slice(0, LOADOUT_MAX).map((u) => u.id);
  }
  if (Array.isArray(r.presets)) base.presets = base.presets.map((_, i) => cleanSquad(base, (r.presets as unknown[])[i]));
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
  if (isGachaUnit(def)) return (save.gear?.owned[def.id] ?? 0) > 0;
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

/** 중복으로 쌓인 열정 (0~MAX_PASSION) */
export const passionOf = (save: SaveData, id: string): number => Math.min(MAX_PASSION, Math.max(0, (save.gear?.owned[id] ?? 0) - 1));

/** 지금 단계의 레벨 상한 (최종 단계는 열정만큼 더) */
export function unitLevelCap(save: SaveData, def: UnitDef): number {
  const p = unitProgress(save, def.id);
  return levelCap(p.tier) + (p.tier === 3 ? passionOf(save, def.id) : 0);
}

// ── 편성 ──

/** 가진 유닛 (도감 순서) */
export const ownedUnits = (save: SaveData): UnitDef[] => UNITS.filter((u) => isUnitOwned(save, u));

/** 편성 목록 정리: 가진 유닛만, 중복 없이, 최대 LOADOUT_MAX */
export function cleanSquad(save: SaveData, raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const id of raw) {
    if (typeof id !== 'string' || out.includes(id)) continue;
    const def = UNIT_BY_ID[id];
    if (def && isUnitOwned(save, def)) out.push(id);
    if (out.length >= LOADOUT_MAX) break;
  }
  return out;
}

/** 새로 얻은 유닛은 편성에 빈칸이 있으면 바로 넣는다 */
export function autoSlot(save: SaveData, id: string): void {
  if (!save.loadout.includes(id) && save.loadout.length < LOADOUT_MAX) save.loadout.push(id);
}

/** 편성에 넣거나 뺀다. 가득 찼거나 가지지 않았으면 false. 마지막 한 명은 뺄 수 없다. */
export function toggleSquad(save: SaveData, id: string): boolean {
  const i = save.loadout.indexOf(id);
  if (i >= 0) {
    if (save.loadout.length <= 1) return false;
    save.loadout.splice(i, 1);
  } else {
    const def = UNIT_BY_ID[id];
    if (!def || !isUnitOwned(save, def) || save.loadout.length >= LOADOUT_MAX) return false;
    save.loadout.push(id);
  }
  save.updatedAt = Date.now();
  return true;
}

/** 편성 안에서 한 칸 앞(-1)이나 뒤(+1)로 옮긴다 */
export function moveSquad(save: SaveData, id: string, dir: -1 | 1): boolean {
  const i = save.loadout.indexOf(id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= save.loadout.length) return false;
  [save.loadout[i], save.loadout[j]] = [save.loadout[j]!, save.loadout[i]!];
  save.updatedAt = Date.now();
  return true;
}

export function savePreset(save: SaveData, i: number): boolean {
  if (i < 0 || i >= PRESET_COUNT) return false;
  save.presets[i] = [...save.loadout];
  save.updatedAt = Date.now();
  return true;
}

/** 프리셋 불러오기 (비어 있거나 가진 유닛이 없으면 false) */
export function loadPreset(save: SaveData, i: number): boolean {
  const ids = cleanSquad(save, save.presets[i]);
  if (!ids.length) return false;
  save.loadout = ids;
  save.updatedAt = Date.now();
  return true;
}

/** 무료 뽑기권: 보스 스테이지 첫 클리어마다 1장, 무한 모드 10판마다 처음 도달 시 1장 */
export function ticketsEarnedSoFar(save: SaveData): number {
  const bosses = [...STAGES, ...SIDE_STAGES].filter((s) => s.boss && isCleared(save, s.id)).length;
  return bosses + Math.floor(save.endless / 10);
}

export function unitProgress(save: SaveData, id: string): UnitProgress {
  return save.units[id] ?? { level: 1, tier: 1 };
}

export const levelUpCost = (def: UnitDef, level: number): number => Math.round(def.cost * 6 * 1.33 ** (level - 1));

export const evolveCost = (def: UnitDef, tier: number): number => def.cost * (tier === 1 ? 45 : 135);

export function canLevelUp(save: SaveData, def: UnitDef): boolean {
  const p = unitProgress(save, def.id);
  return isUnitOwned(save, def) && p.level < unitLevelCap(save, def) && save.money >= levelUpCost(def, p.level);
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
  autoSlot(save, def.id);
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
  const sc = (n: number): number => Math.round(n * mul * 10) / 10;
  if (def.heal) stats.heal = { ...def.heal, amount: Math.round(def.heal.amount * mul) };
  // 장비 능력: 피해·회복·막는 양도 같은 배율로 자란다
  if (def.burn) stats.burn = { ...def.burn, dps: sc(def.burn.dps) };
  if (def.deathBurst) stats.deathBurst = { ...def.deathBurst, dmg: sc(def.deathBurst.dmg) };
  if (def.shield) stats.shield = { ...def.shield, amount: Math.round(def.shield.amount * mul) };
  if (def.healZone) stats.healZone = { ...def.healZone, hps: sc(def.healZone.hps) };
  if (def.fieldStrike) stats.fieldStrike = { ...def.fieldStrike, dmg: sc(def.fieldStrike.dmg) };
  if (def.turret) stats.turret = { ...def.turret, hp: Math.round(def.turret.hp * mul), atk: sc(def.turret.atk) };
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
    deck: squadDefs(save).map((def) => {
      const p = unitProgress(save, def.id);
      return { def, stats: unitStats(def, p), tier: p.tier, level: p.level };
    }),
    skills: SKILLS.filter((s) => isSkillOpen(save, s)),
  };
}

/** 전투에 나갈 유닛: 편성 순서대로 (편성이 비면 가진 유닛 앞 9명) */
export function squadDefs(save: SaveData): UnitDef[] {
  const ids = cleanSquad(save, save.loadout);
  return ids.length ? ids.map((id) => UNIT_BY_ID[id]!) : ownedUnits(save).slice(0, LOADOUT_MAX);
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
  /** 이번 판으로 받은 무료 뽑기권 */
  tickets: number;
}

/** 전투 결과를 저장 데이터에 반영한다. */
export function applyOutcome(save: SaveData, stage: StageDef, win: boolean, baseHpRatio: number, killReward: number): BattleOutcome {
  const prev = save.stars[stage.id] ?? 0;
  const ownedBefore = new Set(ownedUnits(save).map((u) => u.id));
  let stars = 0;
  let clearReward = 0;
  if (win && stage.kind === 'endless') {
    // 무한 모드: 별 대신 최고 기록, 처음 넘은 판만 전체 보상
    stars = starsFor(baseHpRatio);
    const first = stage.index > save.endless;
    clearReward = Math.round(stage.reward * (first ? 1 : 0.4));
    const tickets = first ? Math.floor(stage.index / 10) - Math.floor(save.endless / 10) : 0;
    save.endless = Math.max(save.endless, stage.index);
    save.gear.tickets += tickets;
    save.money += clearReward + killReward;
    save.updatedAt = Date.now();
    return { win, stars, clearReward, killReward, firstClear: first, tickets };
  }
  if (win) {
    stars = starsFor(baseHpRatio);
    const full = stage.reward * (0.6 + 0.2 * stars);
    clearReward = Math.round(prev === 0 ? full : full * REPLAY_MUL);
    save.stars[stage.id] = Math.max(prev, stars);
  }
  const firstClear = win && prev === 0;
  const tickets = firstClear && stage.boss ? 1 : 0;
  save.gear.tickets += tickets;
  // 이번 클리어로 합류한 동료는 편성에 빈칸이 있으면 바로 넣는다
  for (const u of ownedUnits(save)) if (!ownedBefore.has(u.id)) autoSlot(save, u.id);
  save.money += clearReward + killReward;
  save.updatedAt = Date.now();
  return { win, stars, clearReward, killReward, firstClear, tickets };
}
