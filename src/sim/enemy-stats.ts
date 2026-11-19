import type { CombatStats, EnemyDef } from '../data/types';
import type { StageDef } from '../data/stages';

/** 일반 적 HP 배율 (머그컵 제거 후 화력 보정) */
export const ENEMY_HP_MUL = 0.85;
/** 스테이지 배율이 적 공격력에 들어가는 비율: 공격력 ×(1 + (scale−1)×이 값) */
export const ENEMY_ATK_SCALE = 0.7;

/**
 * 스테이지에서 실제로 나오는 적 능력치. 전투(Battle.spawnEnemy)와 도감·스테이지 정보 표가 같이 쓴다.
 * 일반 적: HP ×scale×0.85, 공격력 ×(1 + (scale−1)×0.7). 보스: 스테이지 배율 대신 bossScale (무한 모드에서 커진다).
 * 외전·전공 특수 규칙이 소환 뒤에 바꾸는 값은 들어가지 않는다.
 */
/** bossMul: 이 보스만의 배율 (무한 모드 동행 교수님). 없으면 stage.bossScale */
export function enemyStatsAt(def: EnemyDef, stage: StageDef, bossMul?: number): CombatStats {
  const scale = def.boss ? 1 : stage.scale;
  const atkScale = 1 + (scale - 1) * ENEMY_ATK_SCALE;
  const bs = def.boss ? (bossMul ?? stage.bossScale ?? 1) : 1;
  return { ...def, hp: Math.round(def.hp * scale * bs * (def.boss ? 1 : ENEMY_HP_MUL)), atk: def.atk * atkScale * (1 + (bs - 1) * 0.6) };
}
