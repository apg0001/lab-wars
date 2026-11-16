export interface Chapter {
  id: number;
  /** 신분 (학부생 ~ 포닥) */
  name: string;
  subtitle: string;
  boss: string;
}

/** 스테이지 종류: 일반 / 방학 / 학회 / 졸업논문 / 보스 / 무한 */
export type StageKind = 'normal' | 'vacation' | 'conference' | 'thesis' | 'boss' | 'endless';

export interface StageDef {
  id: string;
  chapter: number;
  index: number;
  /** 0부터 시작하는 전체 순번 (무한 모드는 캠페인 뒤로 이어진다) */
  order: number;
  name: string;
  kind: StageKind;
  /** 적 능력치 배율 */
  scale: number;
  enemyBaseHp: number;
  /** 교수실 포탑 공격력 */
  towerAtk: number;
  /** 기본 출현 간격(초) */
  spawnEvery: number;
  /** 출현 후보와 가중치 */
  pool: { id: string; weight: number }[];
  /** 러시: 지정 시각부터 주기적으로 몰려온다 */
  rush: { first: number; every: number; size: number };
  boss?: string;
  /** 보스 능력치 배율 (무한 모드에서 커진다) */
  bossScale?: number;
  /** 카페인 충전 배율 (방학엔 조금 여유) */
  caffeineMul?: number;
  /** 적 처치 연구비 배율 */
  killMul?: number;
  /** 스테이지 특징 한 줄 설명 */
  note?: string;
  reward: number;
}

export const CHAPTERS: Chapter[] = [
  { id: 1, name: '학부생', subtitle: '연구실 문을 두드리다', boss: 'prof1' },
  { id: 2, name: '학연생', subtitle: '인턴이라 쓰고 막내라 읽는다', boss: 'prof2' },
  { id: 3, name: '학석사', subtitle: '통합과정의 함정', boss: 'reviewer2' },
  { id: 4, name: '석사', subtitle: '첫 디펜스', boss: 'chair' },
  { id: 5, name: '석박', subtitle: '졸업논문의 계절', boss: 'committee' },
  { id: 6, name: '박사', subtitle: '끝나지 않는 과정', boss: 'dean' },
  { id: 7, name: '포닥', subtitle: '임용의 문턱', boss: 'president' },
];

const N = (name: string): [string, StageKind] => [name, 'normal'];
const V = (name: string): [string, StageKind] => [name, 'vacation'];
const C = (name: string): [string, StageKind] => [name, 'conference'];
const T = (name: string): [string, StageKind] => [name, 'thesis'];
const B = (name: string): [string, StageKind] => [name, 'boss'];

/** 챕터별 6개 스테이지: 이름과 종류 */
const PLAN: [string, StageKind][][] = [
  [N('개강 첫 주'), N('조별 과제'), N('중간고사'), V('여름방학'), N('기말고사 폭탄'), B('전공 교수님 면담')],
  [N('학부연구생 지원'), N('첫 랩 미팅'), C('춘계 학회 짐꾼'), N('실험 노가다'), V('겨울방학 출근'), B('지도교수님')],
  [N('통합과정 입학'), N('주간 보고'), C('하계 학회 포스터'), V('여름방학은 없다'), N('첫 논문 투고'), B('리뷰어 2의 습격')],
  [N('조교 업무'), N('과제 보고서'), C('추계 학회 구두 발표'), N('서류 지옥'), V('겨울방학 실험'), B('동계 학회 기조연설')],
  [N('석박 통합 전환'), C('춘계 학회 세션장'), N('알림 지옥'), T('졸업논문 집필'), T('졸업논문 수정'), B('졸업논문 심사')],
  [N('박사 자격시험'), C('하계 학회 초청'), N('과제 책임자'), N('끝없는 리비전'), C('추계 학회 좌장'), B('학과장실')],
  [N('포닥 계약'), C('동계 국제 학회'), N('연구비 지옥'), V('방학 없는 포닥'), N('교수 임용 면접'), B('총장실')],
];

export const STAGES_PER_CHAPTER = 6;
const LAST_ORDER = CHAPTERS.length * STAGES_PER_CHAPTER - 1;
/**
 * 난이도 곡선 좌표. 예전 20스테이지 캠페인(0~19)의 곡선을 그대로 늘려 쓴다.
 * 무한 모드는 캠페인 끝(19) 뒤로 계속 이어진다.
 */
const curve = (order: number): number => (order <= LAST_ORDER ? (order * 19) / LAST_ORDER : 19 + (order - LAST_ORDER) * 0.6);

/** 적 id → 처음 등장하는 곡선 위치 */
const ENEMY_FROM: Record<string, number> = {
  memo: 0, meeting: 0, deadline: 2, plane: 3,
  reviewer: 5, ta: 6, paperwork: 6, grant: 7,
  revision: 10, notif: 11,
};

const WEIGHTS: Record<string, number> = {
  memo: 5, meeting: 4, deadline: 2, plane: 1.2, reviewer: 2,
  ta: 1, paperwork: 1.5, grant: 0.6, revision: 1.0, notif: 0.8,
};

/** 이벤트 스테이지별 적 비중 변화 */
const KIND_WEIGHT: Partial<Record<StageKind, Record<string, number>>> = {
  // 학회: 질문 공세(종이비행기), 심사위원, 알림
  conference: { reviewer: 1.8, plane: 1.3, notif: 1.2, meeting: 0.7 },
  // 졸업논문: 수정 요청과 서류
  thesis: { revision: 1.8, paperwork: 1.5, deadline: 1.5, memo: 0.7 },
  // 방학: 과제와 마감 위주
  vacation: { deadline: 1.8, grant: 1.5, meeting: 0.4 },
};

const KIND_NOTE: Partial<Record<StageKind, string>> = {
  vacation: '🏖️ 방학: 카페인 충전 +25%, 대신 방학 과제 러시가 크게 몰려와요. 보상 +30%',
  conference: '🎤 학회: 심사위원·질문 공세(공중)가 많고 러시가 잦아요. 교수실 포탑 강화',
  thesis: '📝 졸업논문: 수정 요청 폭탄이 쏟아지고 교수실이 단단해요. 보상 +30%',
};

function poolAt(c: number, kind: StageKind): { id: string; weight: number }[] {
  const mul = KIND_WEIGHT[kind] ?? {};
  return Object.entries(ENEMY_FROM)
    .filter(([, from]) => from <= c)
    .map(([id, from]) => {
      // 오래된 약한 적은 후반으로 갈수록 비중을 줄인다.
      const age = c - from;
      const base = WEIGHTS[id] ?? 1;
      const w = id === 'memo' ? Math.max(1.5, base - age * 0.25) : base;
      return { id, weight: w * (mul[id] ?? 1) };
    });
}

function makeStage(chapter: number, index: number): StageDef {
  const order = (chapter - 1) * STAGES_PER_CHAPTER + (index - 1);
  const [name, kind] = PLAN[chapter - 1]![index - 1]!;
  const c = curve(order);
  const isBoss = kind === 'boss';
  const boss = isBoss ? CHAPTERS[chapter - 1]!.boss : undefined;
  const vacation = kind === 'vacation';
  const conference = kind === 'conference';
  const thesis = kind === 'thesis';
  const baseRush = 3 + Math.floor(c / 3);
  return {
    id: `${chapter}-${index}`,
    chapter,
    index,
    order,
    name,
    kind,
    scale: 1 + c * 0.1,
    enemyBaseHp: Math.round((700 + c * 180) * (thesis ? 1.15 : 1)),
    towerAtk: Math.round(10 * (1 + c * 0.12) * (conference ? 1.15 : 1)),
    spawnEvery: Math.max(1.75, 2.8 - c * 0.06) * (isBoss ? 1.6 : vacation ? 1.3 : 1),
    pool: poolAt(c, kind),
    rush: {
      first: 35,
      every: Math.max(22, 40 - c) * (conference ? 0.85 : 1),
      size: Math.round(baseRush * (isBoss ? 0.5 : vacation ? 1.5 : 1)),
    },
    boss,
    caffeineMul: vacation ? 1.25 : undefined,
    killMul: KILL_MUL,
    note: KIND_NOTE[kind],
    reward: Math.round((60 + c * 30 + (isBoss ? 80 : 0)) * REWARD_MUL * (vacation || thesis ? 1.3 : 1)),
  };
}

/** 스테이지가 두 배 넘게 늘어난 만큼 한 판 보상을 줄인다. */
const REWARD_MUL = 0.45;
/** 판 수가 늘어난 만큼 처치 연구비도 줄인다. */
const KILL_MUL = 0.5;

export const STAGES: StageDef[] = CHAPTERS.flatMap((c) => Array.from({ length: STAGES_PER_CHAPTER }, (_, i) => makeStage(c.id, i + 1)));

export const STAGE_BY_ID: Record<string, StageDef> = Object.fromEntries(STAGES.map((s) => [s.id, s]));

export const FINAL_STAGE = STAGES[STAGES.length - 1]!;

/** 예전 캠페인(4챕터×5) id → 새 캠페인에서 같은 난이도쯤의 순번. 저장 이전용. */
export function legacyOrder(oldId: string): number | null {
  const m = /^([1-4])-([1-5])$/.exec(oldId);
  if (!m) return null;
  const o = (Number(m[1]) - 1) * 5 + (Number(m[2]) - 1);
  return Math.min(LAST_ORDER, Math.round((o * LAST_ORDER) / 19));
}

// ───────────── 무한 모드 ─────────────

const ENDLESS_BOSSES = ['prof2', 'reviewer2', 'chair', 'committee', 'dean', 'president'];

/** 무한 모드 n번째 판 (1부터). 판마다 조금씩 강해지고 5판마다 보스가 나온다. */
export function endlessStage(n: number): StageDef {
  const order = LAST_ORDER + n;
  const c = curve(order);
  const isBoss = n % 5 === 0;
  const kinds: StageKind[] = ['normal', 'conference', 'normal', 'thesis'];
  const kind = isBoss ? 'boss' : kinds[n % kinds.length]!;
  const base = makeStage(7, 1);
  return {
    ...base,
    id: `E-${n}`,
    chapter: 8,
    index: n,
    order,
    name: isBoss ? `무한 ${n}판: 보스 러시` : `무한 ${n}판`,
    kind: 'endless',
    scale: 1 + c * 0.1,
    enemyBaseHp: Math.round(700 + c * 180),
    towerAtk: Math.round(10 * (1 + c * 0.12)),
    spawnEvery: Math.max(1.4, 2.8 - c * 0.06) * (isBoss ? 1.5 : 1),
    pool: poolAt(c, kind === 'boss' ? 'normal' : kind),
    rush: { first: 30, every: Math.max(18, 40 - c), size: Math.round((3 + Math.floor(c / 3)) * (isBoss ? 0.5 : 1)) },
    boss: isBoss ? ENDLESS_BOSSES[(n / 5 - 1) % ENDLESS_BOSSES.length] : undefined,
    bossScale: isBoss ? 1 + n * 0.04 : undefined,
    caffeineMul: undefined,
    note: '♾️ 무한 모드: 판이 올라갈수록 끝없이 강해져요. 5판마다 보스.',
    reward: Math.round(80 + c * 12),
  };
}
