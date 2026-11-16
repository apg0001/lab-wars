export interface Chapter {
  id: number;
  name: string;
  subtitle: string;
  boss: string;
}

export interface StageDef {
  id: string;
  chapter: number;
  index: number;
  /** 0부터 시작하는 전체 순번 */
  order: number;
  name: string;
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
  reward: number;
}

export const CHAPTERS: Chapter[] = [
  { id: 1, name: '1학기', subtitle: '랩 미팅의 공포', boss: 'prof1' },
  { id: 2, name: '여름방학', subtitle: '과제 보고서 지옥', boss: 'prof2' },
  { id: 3, name: '학회 시즌', subtitle: '데드라인 대란', boss: 'chair' },
  { id: 4, name: '졸업 심사', subtitle: '최후의 디펜스', boss: 'president' },
];

const STAGE_NAMES: string[] = [
  '첫 랩 미팅', '주간 보고', '마감 임박', '공문 폭탄', '교수님 등장',
  '방학은 없다', '조교의 습격', '중간 보고서', '서류 지옥', '과제 책임자',
  '투고 준비', '알림 지옥', '끝없는 리비전', '카메라 레디', '학회장의 기조연설',
  '심사 준비', '예비 심사', '학과장실', '최종 수정', '총장실',
];

/** 적 id → 처음 등장하는 전체 순번 */
const ENEMY_FROM: Record<string, number> = {
  memo: 0, meeting: 0, deadline: 2, plane: 3,
  reviewer: 5, ta: 6, paperwork: 6, grant: 7,
  revision: 10, notif: 11,
};

/** 보스가 나오는 스테이지 (중간보스 포함) */
const STAGE_BOSS: Record<string, string> = {
  '1-5': 'prof1', '2-5': 'prof2', '3-5': 'chair', '4-3': 'dean', '4-5': 'president',
};

const WEIGHTS: Record<string, number> = {
  memo: 5, meeting: 4, deadline: 2, plane: 2, reviewer: 2,
  ta: 1, paperwork: 1.5, grant: 0.6, revision: 1.5, notif: 1.1,
};

function makeStage(chapter: number, index: number): StageDef {
  const order = (chapter - 1) * 5 + (index - 1);
  const pool = Object.entries(ENEMY_FROM)
    .filter(([, from]) => from <= order)
    .map(([id, from]) => {
      // 오래된 약한 적은 후반으로 갈수록 비중을 줄인다.
      const age = order - from;
      const base = WEIGHTS[id] ?? 1;
      const weight = id === 'memo' ? Math.max(1.5, base - age * 0.25) : base;
      return { id, weight };
    });
  const boss = STAGE_BOSS[`${chapter}-${index}`];
  const isBoss = !!boss;
  return {
    id: `${chapter}-${index}`,
    chapter,
    index,
    order,
    name: STAGE_NAMES[order] ?? `${chapter}-${index}`,
    scale: 1 + order * 0.12,
    enemyBaseHp: Math.round(800 + order * 260),
    towerAtk: Math.round(10 * (1 + order * 0.12)),
    spawnEvery: Math.max(1.75, 2.8 - order * 0.06) * (isBoss ? 1.6 : 1),
    pool,
    rush: { first: 35, every: Math.max(22, 40 - order), size: 3 + Math.floor(order / 3) },
    boss,
    reward: Math.round(60 + order * 30 + (isBoss ? 80 : 0)),
  };
}

export const STAGES: StageDef[] = CHAPTERS.flatMap((c) => [1, 2, 3, 4, 5].map((i) => makeStage(c.id, i)));

export const STAGE_BY_ID: Record<string, StageDef> = Object.fromEntries(STAGES.map((s) => [s.id, s]));
