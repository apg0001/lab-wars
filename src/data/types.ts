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
  | 'printer'
  /** 뽑기 장비 (ICT·전자공학 장비). 어떤 장비인지는 look.variant */
  | 'gear';

/** 장비 그림 종류 (look.kind === 'gear') */
export type GearVariant = 'iron' | 'scope' | 'firewall' | 'cooler' | 'printer3d' | 'turret' | 'cluster';

/** 유닛 등급: 기본(스토리 해금) · 레어 · 에픽 · 레전더리(뽑기) */
export type UnitRarity = 'basic' | 'rare' | 'epic' | 'legend';

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
  /** 장비 그림 종류 */
  variant?: GearVariant;
}

/** 맞힌 상대에게 거는 상태 이상 */
export interface HitEffects {
  /** 화상: 초당 dps 피해를 dur초 (다시 맞으면 시간 갱신, 더 센 화상으로) */
  burn?: { dps: number; dur: number };
  /** 둔화: 이동·공격 속도 ×mul 을 dur초 */
  slow?: { mul: number; dur: number };
  /** 빙결: chance 확률로 dur초 기절 (보스는 40%만) */
  freeze?: { chance: number; dur: number };
}

/** 설치형 도우미 (포탑): 제자리에서 공격하다 life초 뒤 사라진다 */
export interface TurretSpec {
  every: number;
  /** 한 유닛이 동시에 세울 수 있는 수 */
  max: number;
  life: number;
  hp: number;
  atk: number;
  range: number;
  interval: number;
  look: Look;
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
  // ── 뽑기 유닛 능력 (모두 데이터로 지정, 레벨·진화 배율은 unitStats가 피해·회복량에 곱한다) ──
  /** 화상 (지속 피해) */
  burn?: HitEffects['burn'];
  /** 둔화 */
  slow?: HitEffects['slow'];
  /** 빙결 (확률 기절) */
  freeze?: HitEffects['freeze'];
  /** 관통: 공격이 대상 뒤로 이만큼(px) 더 뻗으며 줄 위의 적을 모두 맞힌다 */
  pierce?: number;
  /** 쓰러질 때 폭발: 반경 안 적에게 피해 + 자기 상태 이상 */
  deathBurst?: { dmg: number; radius: number };
  /** 보호막: every초마다 반경 안 아군(반경 0이면 자신만)에게 amount만큼 피해를 막는 막 (최대 amount) */
  shield?: { amount: number; every: number; radius: number };
  /** 회복 구역: 반경 안 아군을 초당 hps씩 회복 */
  healZone?: { hps: number; radius: number };
  /** 카페인 생산: 살아 있는 동안 초당 카페인 */
  caffeineGen?: number;
  /** 포탑 설치 */
  turret?: TurretSpec;
  /** 1회 부활: 처음 쓰러질 때 최대 HP×hpRatio로 일어난다 */
  revive?: { hpRatio: number };
  /** 전장 연산 타격: every초마다 전장의 모든 적에게 dmg 피해 */
  fieldStrike?: { dmg: number; every: number };
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
  /** 해금 조건: 스테이지 클리어 또는 구독 (뽑기 유닛은 비워 둔다) */
  unlock: { stage?: string; subscribe?: number };
  /** 등급 (없으면 기본). 기본이 아니면 뽑기로만 얻는다 */
  rarity?: UnitRarity;
  /** 도감 설정 글 (뽑기 유닛) */
  lore?: string;
  look: Look;
  /** 영어 (src/i18n) */
  en?: UnitEn;
}

export interface UnitEn {
  names: [string, string, string];
  role: string;
  desc: string;
  lore?: string;
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
  /** 영어 (src/i18n) */
  en?: EnemyEn;
}

export interface EnemyEn {
  name: string;
  role: string;
}
