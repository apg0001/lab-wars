/** 사거리가 이 값 이상이면 원거리로 보고 공중 공격이 가능하다. */
export const RANGED_THRESHOLD = 100;

export type Side = 'ally' | 'enemy';

/** 그리기용 외형 키. 렌더러가 이 값으로 캐릭터를 그린다. */
export type LookKind =
  | 'student'
  | 'drone'
  | 'gpu'
  | 'claudy'
  | 'codexy'
  | 'jaeminai'
  | 'memo'
  | 'envelope'
  | 'clock'
  | 'plane'
  | 'reviewer'
  | 'ta'
  | 'paperwork'
  | 'binder'
  | 'revision'
  | 'notif'
  | 'professor'
  | 'ghost'
  | 'printer';

export interface Look {
  kind: LookKind;
  /** 주 색상 (옷·몸통) */
  color: string;
  /** 보조 색상 */
  accent?: string;
  /** 사람형 유닛의 소품 */
  prop?: 'none' | 'keyboard' | 'laptop' | 'shield' | 'flask' | 'headband' | 'clipboard';
  /** 크기 배율 (기본 1) */
  scale?: number;
}

export interface CombatStats {
  hp: number;
  atk: number;
  /** 사거리(px). 근접은 20~30 */
  range: number;
  /** 이동 속도(px/초) */
  speed: number;
  /** 공격 간격(초) */
  interval: number;
  flying?: boolean;
  /** 범위 피해 반경 */
  splash?: number;
  /** 건물 피해 배율 */
  buildingMul?: number;
  /** 주변 같은 편 공격력 증가 */
  aura?: { atkMul: number; radius: number };
  /** 주기적 주변 회복 */
  heal?: { amount: number; every: number; radius: number };
  /** 확률 넉백: chance(0~1) 확률로 dist만큼 밀어내고 잠깐 경직시킨다 */
  knockback?: { chance: number; dist: number };
}

export interface UnitDef extends CombatStats {
  id: string;
  /** 진화 단계별 이름 */
  names: [string, string, string];
  role: string;
  desc: string;
  cost: number;
  cooldown: number;
  /** 한 번에 소환되는 수 */
  count?: number;
  /** 해금 조건: 스테이지 클리어 또는 구독 */
  unlock: { stage?: string; subscribe?: number };
  look: Look;
}

export interface BossPattern {
  summon?: { id: string; every: number; count: number };
  stomp?: { dmg: number; radius: number; every: number };
  /** 호통: HP 비율이 at 아래로 처음 떨어질 때마다 모든 아군을 stun초 기절시키고 push만큼 밀어낸다 (없으면 기본값) */
  rage?: { at: number[]; stun: number; push: number };
}

export interface EnemyDef extends CombatStats {
  id: string;
  name: string;
  role: string;
  reward: number;
  boss?: BossPattern;
  look: Look;
}
