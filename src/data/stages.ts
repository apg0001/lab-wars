import { localizeAll, tr } from '../i18n';

export interface Chapter {
  id: number;
  /** 신분 (학부생 ~ 포닥) */
  name: string;
  subtitle: string;
  boss: string;
  /** 영어 (src/i18n) */
  en?: ChapterEn;
}

export interface ChapterEn {
  name: string;
  subtitle: string;
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
  /** 시간 제한(초). 넘기면 패배 (없으면 무제한) */
  timeLimit?: number;
  /** 외전 번호 (1~3). 외전 스테이지는 STAGES에 들어가지 않는다 */
  side?: number;
  /** 전장 배경 테마 (외전) */
  theme?: Theme;
  /** 특수 규칙 (외전) */
  mods?: StageMods;
  /** 영어 (src/i18n) */
  en?: StageEn;
}

export interface StageEn {
  name: string;
  note?: string;
}

/** 외전 전장 배경 */
export type Theme = 'tenure' | 'haunted' | 'gloom';

export interface StageMods {
  /** 평가 시즌: every초마다 dur초 동안 적 이동·공격 속도 ×mul */
  frenzy?: { every: number; dur: number; mul: number };
  /** 정전: 아군 주변만 보인다 (그리기 전용) */
  dark?: boolean;
  /** 멘탈 고갈: 멘탈이 초당 drain씩 줄고 처치하면 회복. 바닥나면 아군 공격력 감소 */
  drain?: number;
}

export const CHAPTERS: Chapter[] = [
  { id: 1, name: '학부생', subtitle: '연구실 문을 두드리다', boss: 'prof1', en: { name: 'Undergrad', subtitle: 'Knocking on the Lab Door' } },
  { id: 2, name: '학연생', subtitle: '인턴이라 쓰고 막내라 읽는다', boss: 'prof2', en: { name: 'Undergrad Researcher', subtitle: 'Intern on Paper, Errand Runner in Practice' } },
  { id: 3, name: '학석사', subtitle: '통합과정의 함정', boss: 'reviewer2', en: { name: 'BS/MS Track', subtitle: 'The Integrated-Program Trap' } },
  { id: 4, name: '석사', subtitle: '첫 디펜스', boss: 'chair', en: { name: "Master's", subtitle: 'The First Defense' } },
  { id: 5, name: '석박', subtitle: '졸업논문의 계절', boss: 'committee', en: { name: 'MS/PhD Track', subtitle: 'Thesis Season' } },
  { id: 6, name: '박사', subtitle: '끝나지 않는 과정', boss: 'dean', en: { name: 'PhD', subtitle: 'The Program That Never Ends' } },
  { id: 7, name: '포닥', subtitle: '임용의 문턱', boss: 'president', en: { name: 'Postdoc', subtitle: 'On the Brink of Faculty' } },
];
localizeAll(CHAPTERS);

type PlanItem = [string, StageKind, string];
const N = (name: string, en: string): PlanItem => [name, 'normal', en];
const V = (name: string, en: string): PlanItem => [name, 'vacation', en];
const C = (name: string, en: string): PlanItem => [name, 'conference', en];
const T = (name: string, en: string): PlanItem => [name, 'thesis', en];
const B = (name: string, en: string): PlanItem => [name, 'boss', en];

/** 챕터별 10개 스테이지: 이름, 종류, 영어 이름 */
const PLAN: PlanItem[][] = [
  [N('개강 첫 주', 'Syllabus Week'), N('수강신청 전쟁', 'Course Registration Wars'), N('조별 과제', 'Group Project'), N('중간고사', 'Midterms'), N('축제 주간', 'Festival Week'), V('여름방학', 'Summer Break'), N('계절학기', 'Summer Session'), N('기말고사 폭탄', 'Finals Bombardment'), N('연구실 문 앞', "At the Lab's Door"), B('전공 교수님 면담', 'Office Hours with the Prof')],
  [N('학부연구생 지원', 'Applying as a Research Intern'), N('첫 랩 미팅', 'First Lab Meeting'), N('장비 세팅', 'Equipment Setup'), C('춘계 학회 짐꾼', 'Spring Conference Pack Mule'), N('실험 노가다', 'Experiment Grind'), N('데이터 정리', 'Data Cleanup'), N('논문 스터디', 'Paper Reading Group'), V('겨울방학 출근', 'Clocking In Over Winter Break'), N('졸업 프로젝트', 'Capstone Project'), B('지도교수님', 'The Advisor')],
  [N('통합과정 입학', 'Joining the BS/MS Track'), N('대학원 수업', 'Grad Courses'), N('주간 보고', 'Weekly Report'), C('하계 학회 포스터', 'Summer Conference Poster'), V('여름방학은 없다', 'There Is No Summer Break'), N('실험 재현 실패', 'Failed Reproduction'), N('첫 논문 초고', 'First Paper Draft'), N('교수님 첨삭', "The Prof's Red Pen"), N('첫 논문 투고', 'First Paper Submission'), B('리뷰어 2의 습격', 'Reviewer 2 Strikes')],
  [N('조교 업무', 'TA Duty'), N('채점 지옥', 'Grading Hell'), N('과제 보고서', 'Grant Report'), C('추계 학회 구두 발표', 'Fall Conference Talk'), N('서류 지옥', 'Paperwork Hell'), N('연구실 이사', 'Lab Move'), V('겨울방학 실험', 'Winter Break Experiments'), N('석사 논문 초안', "Master's Thesis Draft"), N('디펜스 리허설', 'Defense Rehearsal'), B('동계 학회 기조연설', 'Winter Conference Keynote')],
  [N('석박 통합 전환', 'Switching to the PhD Track'), N('랩장 인수인계', 'Lab Chief Handover'), C('춘계 학회 세션장', 'Spring Conference Session'), N('알림 지옥', 'Notification Hell'), V('여름방학 집필', 'Summer Writing Retreat'), N('졸업논문 주제 확정', 'Locking the Thesis Topic'), T('졸업논문 집필', 'Writing the Thesis'), T('졸업논문 수정', 'Revising the Thesis'), T('예비 심사', 'Thesis Proposal'), B('졸업논문 심사', 'Thesis Defense')],
  [N('박사 자격시험', 'PhD Qualifying Exam'), N('후배 사수', 'Mentoring the Juniors'), C('하계 학회 초청', 'Summer Conference Invited Talk'), N('과제 책임자', 'Running the Grant'), N('연구실 정전', 'Lab Blackout'), N('끝없는 리비전', 'Endless Revisions'), C('추계 학회 좌장', 'Fall Conference Session Chair'), V('겨울방학 연구비 정산', 'Winter Break Expense Reports'), N('박사 학위 논문', 'PhD Dissertation'), B('학과장실', "Department Head's Office")],
  [N('포닥 계약', 'Postdoc Contract'), N('해외 연수', 'Research Abroad'), C('동계 국제 학회', 'Winter International Conference'), N('연구비 지옥', 'Funding Hell'), N('강의 대타', 'Substitute Lecturer'), V('방학 없는 포닥', 'Postdocs Get No Breaks'), N('공동연구 미팅', 'Collaboration Meeting'), N('임용 서류 접수', 'Faculty Applications'), N('교수 임용 면접', 'Faculty Job Talk'), B('총장실', "President's Office")],
];

export const STAGES_PER_CHAPTER = 10;
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
  vacation: '{beach} 방학: 카페인 충전 +25%, 대신 방학 과제 러시가 크게 몰려와요. 보상 +30%',
  conference: '{mic} 학회: 심사위원·질문 공세(공중)가 많고 러시가 잦아요. 교수실 포탑 강화',
  thesis: '{paper} 졸업논문: 수정 요청 폭탄이 쏟아지고 교수실이 단단해요. 보상 +30%',
};
const KIND_NOTE_EN: Partial<Record<StageKind, string>> = {
  vacation: '{beach} Break: Caffeine charge +25%, but huge homework rushes pile in. Reward +30%',
  conference: "{mic} Conference: lots of reviewers and flying questions, frequent rushes. Prof's Office turret is stronger",
  thesis: "{paper} Thesis: revision bombs rain down and the Prof's Office is extra sturdy. Reward +30%",
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
      // 초반~중반 학회(c<12, 5-3까지)는 공중 질문 공세를 조금 덜어 대공 유닛이 적을 때의 벽을 낮춘다
      const k = kind === 'conference' && id === 'plane' && c < 12 ? 1 : (mul[id] ?? 1);
      return { id, weight: w * k };
    });
}

/** 적 능력치 배율: 곡선을 따라 오르고, 초반(1~2챕터)엔 조금 더 세게 해서 처음부터 긴장감을 준다 (3챕터부터 원래대로) */
/**
 * 전체 난이도 상향 (0.14.0). 1챕터 튜토리얼은 0에서 서서히 오르고,
 * 원래 벽이던 5~6챕터(c≈11~16)는 그대로 두거나 오히려 살짝 낮추고, 쉬웠던 2~4챕터와 7챕터·외전은 더 올린다.
 */
const HARD = (c: number): number => {
  if (c < 3) return 1 + c * 0.027;
  if (c < 8.3) return 1.08;
  if (c < 10.5) return 1.05; // 4챕터: 5챕터 앞에서 성장이 밀리지 않게 완만하게
  if (c < 12.5) return 0.97;
  if (c < 14.5) return 0.94; // 5-7 ~ 6-3: 원래부터 가장 높던 벽을 깎아 곡선을 고르게
  if (c < 16.5) return 1;
  return 1.1;
};
const enemyScale = (c: number): number => (1 + c * 0.1 + (c <= 6 ? c * 0.03 : Math.max(0, 0.18 - (c - 6) * 0.045))) * HARD(c);

/** 곡선 위치 c에서의 기본 수치 (외전·무한 모드도 같이 쓴다) */
export function numbersAt(c: number): Pick<StageDef, 'scale' | 'enemyBaseHp' | 'towerAtk' | 'spawnEvery' | 'rush'> {
  return {
    scale: enemyScale(c),
    enemyBaseHp: Math.round(700 + c * 180),
    towerAtk: Math.round(10 * (1 + c * 0.12)),
    spawnEvery: Math.max(1.75, 2.8 - c * 0.06),
    rush: { first: 35, every: Math.max(22, 40 - c), size: 3 + Math.floor(c / 3) },
  };
}

function makeStage(chapter: number, index: number): StageDef {
  const order = (chapter - 1) * STAGES_PER_CHAPTER + (index - 1);
  const [name, kind, enName] = PLAN[chapter - 1]![index - 1]!;
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
    scale: enemyScale(c),
    enemyBaseHp: Math.round((700 + c * 180) * (thesis ? 1.1 : 1)),
    towerAtk: Math.round(10 * (1 + c * 0.12) * (conference ? 1.08 : 1)),
    spawnEvery: Math.max(1.75, 2.8 - c * 0.06) * (isBoss ? 1.6 : vacation ? 1.3 : 1),
    pool: poolAt(c, kind),
    rush: {
      first: 35,
      every: Math.max(22, 40 - c) * (conference ? 0.9 : 1),
      size: Math.round(baseRush * (isBoss ? 0.5 : vacation ? 1.5 : 1)),
    },
    boss,
    caffeineMul: vacation ? 1.25 : undefined,
    killMul: KILL_MUL,
    note: KIND_NOTE[kind],
    reward: Math.round((60 + c * 30 + (isBoss ? 80 : 0)) * REWARD_MUL * (vacation || thesis ? 1.3 : 1)),
    timeLimit: isBoss ? TIME_LIMIT.boss : TIME_LIMIT.normal,
    en: { name: enName, note: KIND_NOTE_EN[kind] },
  };
}

/** 시간 제한(초): 일반 5분, 보스 6분, 무한 모드 8분 */
export const TIME_LIMIT = { normal: 300, boss: 360, endless: 480 };

/** 스테이지가 두 배 넘게 늘어난 만큼 한 판 보상을 줄인다. */
export const REWARD_MUL = 0.45;
/** 판 수가 늘어난 만큼 처치 연구비도 줄인다. */
export const KILL_MUL = 0.45;

export const STAGES: StageDef[] = localizeAll(CHAPTERS.flatMap((c) => Array.from({ length: STAGES_PER_CHAPTER }, (_, i) => makeStage(c.id, i + 1))));


export const FINAL_STAGE = STAGES[STAGES.length - 1]!;

/** 0.8 캠페인(7챕터×6) id → 지금 캠페인에서 같은 위치쯤의 순번. 저장 이전용. */
export function v2Order(oldId: string): number | null {
  const m = /^([1-7])-([1-6])$/.exec(oldId);
  if (!m) return null;
  const c = Number(m[1]);
  const i = Number(m[2]);
  // 보스(6번째)는 보스(10번째)로, 나머지는 챕터 안에서 비율대로
  const idx = i === 6 ? STAGES_PER_CHAPTER : Math.round(((i - 1) * (STAGES_PER_CHAPTER - 2)) / 4) + 1;
  return (c - 1) * STAGES_PER_CHAPTER + idx - 1;
}

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
/** 무한 모드 판당 곡선 상승폭 (캠페인 끝 c=19에서 시작) */
const ENDLESS_STEP = 0.75;
/** 무한 모드 추가 배율: 판이 쌓일수록 성장 속도를 앞지르게 */
const endlessMul = (n: number): number => 1 + n * 0.01;

export function endlessStage(n: number): StageDef {
  const order = LAST_ORDER + n;
  const c = 19 + n * ENDLESS_STEP;
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
    // 무한 모드 판은 그때그때 만들므로 등록하지 않고 만드는 순간의 언어를 쓴다
    name: isBoss ? tr(`무한 ${n}판: 보스 러시`, `Endless Round ${n}: Boss Rush`) : tr(`무한 ${n}판`, `Endless Round ${n}`),
    kind: 'endless',
    scale: enemyScale(c) * endlessMul(n),
    enemyBaseHp: Math.round(700 + c * 180),
    towerAtk: Math.round(10 * (1 + c * 0.12)),
    spawnEvery: Math.max(1.4, 2.8 - c * 0.06) * (isBoss ? 1.5 : 1),
    pool: poolAt(c, kind === 'boss' ? 'normal' : kind),
    rush: { first: 30, every: Math.max(18, 40 - c), size: Math.round((3 + Math.floor(c / 3)) * (isBoss ? 0.5 : 1)) },
    boss: isBoss ? ENDLESS_BOSSES[(n / 5 - 1) % ENDLESS_BOSSES.length] : undefined,
    bossScale: isBoss ? 1 + n * 0.04 : undefined,
    caffeineMul: undefined,
    note: tr('{infinity} 무한 모드: 판이 올라갈수록 끝없이 강해져요. 5판마다 보스.', '{infinity} Endless Mode: enemies keep getting stronger every round. A boss every 5 rounds.'),
    en: {
      name: isBoss ? `Endless Round ${n}: Boss Rush` : `Endless Round ${n}`,
      note: '{infinity} Endless Mode: enemies keep getting stronger every round. A boss every 5 rounds.',
    },
    reward: Math.round(80 + c * 12),
    timeLimit: TIME_LIMIT.endless,
  };
}

// ───────────── 외전 ─────────────

export interface SideChapter {
  id: number;
  name: string;
  subtitle: string;
  /** 스토리 장면에서 주인공 모습 (8 = 교수) */
  heroChapter: number;
  theme: Theme;
  mods: StageMods;
  boss: string;
  /** 시작 곡선 위치 (스테이지마다 +1.2) */
  from: number;
  pool: Record<string, number>;
  rule: string;
  /** 영어 (src/i18n) */
  en?: SideChapterEn;
}

export interface SideChapterEn {
  name: string;
  subtitle: string;
  rule: string;
}

export const SIDE_CHAPTERS: SideChapter[] = [
  {
    id: 1, name: '조교수 생존기', subtitle: '테뉴어라는 이름의 공포', heroChapter: 8, theme: 'tenure',
    mods: { frenzy: { every: 38, dur: 9, mul: 1.35 } }, boss: 'tenure', from: 19,
    pool: { meeting: 3, paperwork: 2.2, evalform: 2.4, grant: 1, ta: 1, notif: 1, revision: 0.8, memo: 2 },
    rule: '{clipboard} 평가 시즌: 주기적으로 적이 빨라지고 공격이 거세져요.',
    en: { name: 'Assistant Prof Survival Guide', subtitle: 'The Horror Called Tenure', rule: '{clipboard} Evaluation Season: enemies periodically speed up and hit harder.' },
  },
  {
    id: 2, name: '대학원 괴담', subtitle: '새벽 3시의 연구실', heroChapter: 5, theme: 'haunted',
    mods: { dark: true }, boss: 'ghost13', from: 17,
    pool: { ghost: 3.2, printer3am: 1.6, memo: 2, deadline: 1.6, notif: 1, revision: 0.8, paperwork: 1 },
    rule: '{candle} 정전: 아군과 연구실 주변만 보여요. 유령은 깜빡이며 다가와요.',
    en: { name: 'Grad School Ghost Stories', subtitle: 'The Lab at 3 AM', rule: '{candle} Blackout: you can only see around your allies and the Lab. Ghosts flicker as they approach.' },
  },
  {
    id: 3, name: '연구자의 고충', subtitle: '아무도 모르는 싸움', heroChapter: 6, theme: 'gloom',
    mods: { drain: 3 }, boss: 'reviewer3', from: 21,
    pool: { imposter: 2.6, scooped: 1.1, revision: 1.4, reviewer: 1.5, deadline: 1.5, notif: 1, meeting: 1.2 },
    rule: '{rain} 멘탈 고갈: 멘탈이 계속 줄고, 적을 처치하면 회복돼요. 바닥나면 아군 공격력 −25%.',
    en: { name: "A Researcher's Struggles", subtitle: 'The Fight No One Sees', rule: '{rain} Sanity Drain: Sanity keeps dropping and recovers when you defeat enemies. At zero, allies deal −25% damage.' },
  },
];

const SIDE_PLAN: string[][] = [
  ['임용 첫 학기', '연구비 탈락', '학생 모집 0명', '강의평가 2.1', '테뉴어 심사'],
  ['새벽 3시의 프린터', '9년 차 선배의 자리', '사라진 파일', '끝나지 않는 리비전', '13년 차 유령 선배'],
  ['가면 증후군', '먼저 나온 논문', '안 나오는 결과', '언제 졸업해?', '리뷰어 3'],
];
const SIDE_PLAN_EN: string[][] = [
  ['First Semester as Faculty', 'Grant Rejected', 'Zero Applicants', 'Course Eval 2.1', 'Tenure Review'],
  ['The 3 AM Printer', "The 9th-Year Senior's Desk", 'The Vanishing File', 'The Revision That Never Ends', '13th-Year Ghost Senpai'],
  ['Imposter Syndrome', 'Scooped', 'Results That Won\'t Come', 'When Are You Graduating?', 'Reviewer 3'],
];

function makeSideStage(sc: SideChapter, index: number): StageDef {
  const c = sc.from + (index - 1) * 1.2;
  const isBoss = index === 5;
  const n = numbersAt(c);
  return {
    ...n,
    id: `S${sc.id}-${index}`,
    chapter: 9,
    index,
    order: 1000 + sc.id * 10 + index,
    name: SIDE_PLAN[sc.id - 1]![index - 1]!,
    kind: isBoss ? 'boss' : 'normal',
    // 외전 2는 정전으로 시야가 좁아 사람에게 더 어렵다 (봇은 어둠을 무시) → 상향분을 뺀다
    scale: sc.mods?.dark ? n.scale / 1.1 : n.scale,
    spawnEvery: n.spawnEvery * (isBoss ? 1.6 : 1),
    rush: { ...n.rush, size: Math.round(n.rush.size * (isBoss ? 0.5 : 1)) },
    pool: Object.entries(sc.pool).map(([id, weight]) => ({ id, weight })),
    boss: isBoss ? sc.boss : undefined,
    killMul: KILL_MUL,
    note: sc.rule,
    reward: Math.round((60 + c * 30 + (isBoss ? 120 : 0)) * REWARD_MUL * 1.25),
    timeLimit: isBoss ? TIME_LIMIT.boss : TIME_LIMIT.normal,
    side: sc.id,
    theme: sc.theme,
    mods: sc.mods,
    // sc는 이미 현지화 등록이 끝나 지금 언어일 수 있으니 영어는 sc.en에서 가져온다
    en: { name: SIDE_PLAN_EN[sc.id - 1]![index - 1]!, note: sc.en?.rule },
  };
}

export const SIDE_STAGES: StageDef[] = localizeAll(SIDE_CHAPTERS.flatMap((sc) => Array.from({ length: 5 }, (_, i) => makeSideStage(sc, i + 1))));
// 외전 스테이지가 한국어 규칙(note)을 복사해 간 뒤에 등록한다
localizeAll(SIDE_CHAPTERS);

/** 캠페인과 외전 스테이지 id → 정의 */
export const STAGE_BY_ID: Record<string, StageDef> = Object.fromEntries([...STAGES, ...SIDE_STAGES].map((s) => [s.id, s]));
