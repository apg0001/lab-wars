import { RANGED_THRESHOLD, type CombatStats } from '../data/types';
import { ENEMY_BY_ID } from '../data/enemies';
import type { StageDef } from '../data/stages';
import { STAGE_POWER } from '../data/stage-power';
import { makeLoadout, type BattleLoadout, type DeckEntry, type SaveData } from './progression';

/**
 * 전투력: 편성(출전 유닛 능력치) × 연구실 시설을 숫자 하나로 줄인 값.
 * 정확한 승률 예측이 아니라 "성장이 모자란가"를 가늠하는 눈금이다.
 * 스테이지 권장 전투력(STAGE_POWER)은 같은 식으로 봇 진행을 재서 만든다 (tests/stage-power.test.ts).
 */

/** 유닛 하나의 전투력: √(버티는 양 × 초당 기여) */
export function unitPower(st: CombatStats, count = 1): number {
  let dps = st.atk / Math.max(0.2, st.interval);
  if (st.splash) dps *= 1 + Math.min(st.splash / 60, 1) * 0.6;
  if (st.pierce) dps *= 1.4;
  if (st.chain) dps *= 1 + st.chain.jumps * st.chain.falloff * 0.5;
  if (st.burn) dps += st.burn.dps * 0.5;
  if (st.fieldStrike) dps += (st.fieldStrike.dmg / st.fieldStrike.every) * 3;
  if (st.turret) dps += (st.turret.atk / Math.max(0.2, st.turret.interval)) * st.turret.max * 0.6;
  if (st.deathBurst) dps += st.deathBurst.dmg / 20;
  // 지원 능력도 초당 기여로 친다
  if (st.heal) dps += (st.heal.amount / st.heal.every) * 2;
  if (st.healZone) dps += st.healZone.hps * 2;
  if (st.shield) dps += (st.shield.amount / st.shield.every) * 1.5;
  if (st.caffeineGen) dps += st.caffeineGen * 20;
  if (st.aura) dps *= 1 + st.aura.atkMul * 3;
  if (st.slow || st.freeze || st.knockback || st.knockup || st.stunField || st.armorShred) dps *= 1.15;
  let hp = st.hp;
  if (st.revive) hp *= 1 + st.revive.hpRatio;
  if (st.lifesteal) hp *= 1 + st.lifesteal;
  return Math.sqrt(Math.max(0, hp * count) * Math.max(0, dps * count)) * 2;
}

const deckPower = (d: DeckEntry): number => unitPower(d.stats, d.def.count ?? 1);

/** 시설 배율: 카페인 경제·연구실 체력·재소환 대기시간 */
function facilityMul(l: BattleLoadout): number {
  return Math.sqrt(l.caffeineRegen / 5) * (l.caffeineMax / 100) ** 0.3 * (l.baseHp / 1000) ** 0.4 * (1 / l.cooldownMul) ** 0.5;
}

export function loadoutPower(l: BattleLoadout): number {
  const units = l.deck.reduce((sum, d) => sum + deckPower(d), 0);
  const printer = l.printerAtk * (l.printerRange / 300) * 2;
  return Math.round((units + printer) * facilityMul(l));
}

/** 지금 편성의 전투력 */
export const squadPower = (save: SaveData): number => loadoutPower(makeLoadout(save));

/** 스테이지 권장 전투력 (표에 없으면 null: 무한 모드 등) */
export const recommendedPower = (stage: StageDef): number | null => STAGE_POWER[stage.id] ?? null;

export type PowerVerdict = 'easy' | 'fair' | 'hard';

/** 내 전투력 / 권장 전투력으로 여유·적정·도전 */
export function powerVerdict(mine: number, rec: number): PowerVerdict {
  const r = mine / rec;
  if (r >= 1.15) return 'easy';
  if (r >= 0.85) return 'fair';
  return 'hard';
}

export type StageHint = 'air' | 'ranged' | 'tank' | 'swarm';

/** 상성 힌트: 출현 가중치로 본 적 구성의 특징 */
export function stageHints(stage: StageDef): StageHint[] {
  const total = stage.pool.reduce((s, p) => s + p.weight, 0) || 1;
  const share = (f: (e: CombatStats) => boolean): number =>
    stage.pool.reduce((s, p) => s + (ENEMY_BY_ID[p.id] && f(ENEMY_BY_ID[p.id]!) ? p.weight : 0), 0) / total;
  const hints: StageHint[] = [];
  const boss = stage.boss ? ENEMY_BY_ID[stage.boss] : undefined;
  if (share((e) => !!e.flying) >= 0.2 || boss?.flying) hints.push('air');
  if (share((e) => e.range >= RANGED_THRESHOLD && !e.flying) >= 0.35) hints.push('ranged');
  if (share((e) => e.hp >= 400) >= 0.3) hints.push('tank');
  if (stage.spawnEvery <= 1.6 || stage.rush.size >= 8) hints.push('swarm');
  return hints;
}

/** 표에 넣을 때 보기 좋은 숫자로 (유효 숫자 2자리) */
export function roundPower(n: number): number {
  if (n < 100) return Math.round(n);
  const step = 10 ** (Math.floor(Math.log10(n)) - 1);
  return Math.round(n / step) * step;
}
