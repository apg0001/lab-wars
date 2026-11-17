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
  | 'gear'
  /** 무한 모드 전용 버그·장애 군단. 어떤 버그인지는 look.variant */
  | 'glitch'
  /** 외전 4~7 전용 적·보스. 어떤 적인지는 look.variant */
  | 'sidefoe';

/** 장비 그림 종류 (look.kind === 'gear') */
export type GearVariant =
  | 'iron' | 'scope' | 'firewall' | 'cooler' | 'printer3d' | 'turret' | 'cluster'
  // 레어
  | 'breadboard' | 'multimeter' | 'arduino' | 'logic' | 'ups' | 'pi' | 'siggen' | 'router' | 'packet' | 'wafer' | 'debugger' | 'dish'
  // 에픽
  | 'tesla' | 'tower' | 'robotarm' | 'rack' | 'reflow' | 'emp' | 'fiber'
  // 레전더리
  | 'quantum' | 'accelerator' | 'npu' | 'tokamak';

/** 버그 군단 그림 종류 (look.kind === 'glitch') */
export type GlitchVariant = 'segfault' | 'leak' | 'loop' | 'conflict' | 'bsod' | 'outage' | 'panic' | 'legacy';

/** 외전 4~7 적 그림 종류 (look.kind === 'sidefoe') */
export type SideVariant =
  // 외전 4 마감 24시
  | 'pagelimit' | 'citation' | 'lowres' | 'submitsys'
  // 외전 5 AI 시대의 연구실
  | 'hallucite' | 'plagiarism' | 'injection' | 'autoreview'
  // 외전 6 랩실 창업기
  | 'cloudbill' | 'pivot' | 'bmq'
  // 외전 7 연구실 정전의 날
  | 'powerstrip' | 'overload' | 'breaker' | 'mainbreaker';

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
  /** 장비·버그 그림 종류 */
  variant?: GearVariant | GlitchVariant | SideVariant;
}

/** 맞힌 상대에게 거는 상태 이상 */
export interface HitEffects {
  /** 화상: 초당 dps 피해를 dur초 (다시 맞으면 시간 갱신, 더 센 화상으로) */
  burn?: { dps: number; dur: number };
  /** 둔화: 이동·공격 속도 ×mul 을 dur초 */
  slow?: { mul: number; dur: number };
  /** 빙결: chance 확률로 dur초 기절 (보스는 40%만) */
  freeze?: { chance: number; dur: number };
  /** 방어 깎기: 받는 피해 ×mul 을 dur초 (다시 맞으면 시간 갱신, 더 센 쪽으로) */
  armorShred?: { mul: number; dur: number };
  /** 띄우기: chance 확률로 dur초 공중에 떠서 아무것도 못 한다 (보스 면역) */
  knockup?: { chance: number; dur: number };
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
  /** 0보다 크면 제자리 포탑 대신 이 속도로 걸어가는 졸개 (라우터의 패킷) */
  speed?: number;
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
  /** 방어 깎기 (맞힌 적이 받는 피해 증가) */
  armorShred?: HitEffects['armorShred'];
  /** 띄우기 (확률 공중 띄움) */
  knockup?: HitEffects['knockup'];
  /** 연쇄 번개: 맞힌 적에서 range 안의 다른 적으로 jumps번 튄다 (튈 때마다 피해 ×falloff) */
  chain?: { jumps: number; range: number; falloff: number };
  /** 흡혈: 준 피해의 ratio만큼 자기 HP 회복 */
  lifesteal?: number;
  /** 대공 배율: 공중 적에게 주는 피해 ×airMul */
  airMul?: number;
  /** 기절 장판: every초마다 반경 안 상대를 dur초 기절 (보스는 40%만) */
  stunField?: { every: number; radius: number; dur: number };
  // ── 무한 모드 버그 군단 능력 (주로 적) ──
  /** 분열: 쓰러지면 HP×hpRatio, 크기×scale인 같은 적 count마리로 갈라진다 (갈라진 쪽은 다시 갈라지지 않는다) */
  split?: { count: number; hpRatio: number; scale: number };
  /** 성장: 초당 최대 HP가 처음의 rate배씩 늘어 max배까지 (늘어난 만큼 HP도 차고 몸도 커진다) */
  grow?: { rate: number; max: number };
  /** 재출현: 처음 쓰러지면 보상 없이 출발점으로 돌아가 HP×hpRatio로 다시 온다 */
  respawn?: { hpRatio: number };
  /** 카페인 흡수: 맞힐 때마다 상대 연구실의 카페인을 이만큼 빼앗는다 */
  caffeineDrain?: number;
  /** 비상 전원: 이 반경 안 아군은 순간 정전(외전 7)의 기절·증발을 피한다 */
  blipGuard?: number;
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
  /** 소환할 때 외치는 말 [한국어, 영어] (없으면 기본 대사) */
  say?: [string, string];
  /** 접속 폭주 (외전 4): 전투 시간이 after 비율을 넘으면 every초마다 모든 아군을 dur초 멈춘다 */
  overload?: { after: number; every: number; dur: number };
  /** 자동 리뷰 (외전 5): every초마다 반경 안 아군의 능력을 dur초 막고 dmg 피해 */
  silence?: { every: number; radius: number; dur: number; dmg: number };
  /** 메인 차단기 (외전 7): HP 비율이 at 아래로 떨어지면 순간 정전 간격이 every로 짧아진다 */
  blipFaster?: { at: number[]; every: number[] };
}

export interface EnemyDef extends CombatStats {
  id: string;
  name: string;
  role: string;
  /** 도감 설명 (무한 모드 버그 군단) */
  desc?: string;
  reward: number;
  boss?: BossPattern;
  look: Look;
  /** 영어 (src/i18n) */
  en?: EnemyEn;
}

export interface EnemyEn {
  name: string;
  role: string;
  desc?: string;
}
