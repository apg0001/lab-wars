/**
 * 학회 경품 추첨 카드. 전투 중 잡무 러시를 버텨 내면 뒤집힌 봉투 3장 중 하나를 고른다.
 * 효과는 그 판에만 적용된다 (성장·순위표에는 영향 없음). 실제 효과는 Battle.pickCard에서 적용한다.
 */

export type CardRarity = 'common' | 'rare' | 'legend' | 'curse';

/**
 * instant: 고르는 즉시 한 번 / battle: 이번 판 끝까지 / timed: dur초 동안
 */
export type CardKind = 'instant' | 'battle' | 'timed';

export type CardId =
  | 'refill' | 'cooldown' | 'toner' | 'walk' | 'beans' | 'cleanup'
  | 'megaphone' | 'payroll' | 'repair' | 'deadline' | 'allnighter'
  | 'meeting' | 'afterparty' | 'bestpaper'
  | 'reviewer2' | 'weekend';

export interface CardDef {
  id: CardId;
  name: string;
  rarity: CardRarity;
  kind: CardKind;
  /** timed 카드의 지속 시간(초) */
  dur?: number;
  /** 낙서 아이콘 이름 (src/render/doodle.ts) */
  icon: string;
  /** 효과 설명 (아이콘 토큰 가능) */
  desc: string;
  /** HUD 칩에 쓰는 짧은 효과 */
  chip: string;
  /** 한 줄 소개 글 */
  flavor: string;
}

export const CARDS: CardDef[] = [
  // ── 일반 ──
  { id: 'refill', name: '아이스 아메리카노 리필', rarity: 'common', kind: 'instant', icon: 'coffee', desc: '카페인 +40 즉시', chip: '카페인 +40', flavor: '학회장 커피는 무한 리필. 오늘만큼은 사양하지 않는다.' },
  { id: 'cooldown', name: '조교 대타 투입', rarity: 'common', kind: 'instant', icon: 'hourglass', desc: '모든 동료의 재소환 대기시간 초기화', chip: '대기 초기화', flavor: '"제가 대신 갈게요." 세상에서 가장 듣기 좋은 말.' },
  { id: 'toner', name: '토너 새로 갈기', rarity: 'common', kind: 'battle', icon: 'printer', desc: '이번 판 프린터 포탑 피해 +25%', chip: '포탑 +25%', flavor: '정품 토너는 출력물의 기세부터 다르다.' },
  { id: 'walk', name: '산책 10분', rarity: 'common', kind: 'instant', icon: 'meditate', desc: '멘탈 +30 즉시', chip: '멘탈 +30', flavor: '포스터 세션을 빠져나와 호텔 정원을 한 바퀴.' },
  { id: 'beans', name: '탕비실 원두 입고', rarity: 'common', kind: 'battle', icon: 'tumbler', desc: '이번 판 카페인 충전 속도 +10%', chip: '충전 +10%', flavor: '경품 상자 안에 원두 1kg. 연구실의 평화가 일주일 늘었다.' },
  { id: 'cleanup', name: '연구실 대청소', rarity: 'common', kind: 'instant', icon: 'lab', desc: '연구실 HP를 최대치의 15% 회복', chip: '연구실 회복', flavor: '책상 밑에서 3년 전 영수증과 잃어버린 USB가 나왔다.' },
  // ── 희귀 ──
  { id: 'megaphone', name: '랩장의 확성기', rarity: 'rare', kind: 'battle', icon: 'megaphone', desc: '이번 판 랩장 오라 범위 2배', chip: '오라 범위 ×2', flavor: '이제 복도 끝에서도 잔소리가 들린다.' },
  { id: 'payroll', name: '인건비 정산', rarity: 'rare', kind: 'battle', icon: 'coin', desc: '이번 판 처치 보상 +30%', chip: '처치 보상 +30%', flavor: '석 달 밀린 인건비가 한꺼번에 들어왔다.' },
  { id: 'repair', name: '커피머신 무상 수리', rarity: 'rare', kind: 'instant', icon: 'coffeeMachine', desc: '커피머신 1단계 무료 업그레이드', chip: '커피머신 +1', flavor: '협찬사 부스에서 기사님이 직접 오셨다.' },
  { id: 'deadline', name: '마감 연장 공지', rarity: 'rare', kind: 'battle', icon: 'sword', desc: '이번 판 아군 공격력 +10%', chip: '공격력 +10%', flavor: '"제출 기한이 일주일 연장되었습니다." 갑자기 힘이 솟는다.' },
  { id: 'allnighter', name: '에너지 드링크 한 박스', rarity: 'rare', kind: 'timed', dur: 12, icon: 'moon', desc: '12초간 밤샘 모드 (공격 속도 ×1.4, 이동 ×1.15)', chip: '밤샘 모드', flavor: '심장이 박자를 잃었지만 손은 빨라졌다.' },
  // ── 전설 ──
  { id: 'meeting', name: '교수님 회의 중', rarity: 'legend', kind: 'timed', dur: 15, icon: 'meeting', desc: '15초간 적이 새로 나오지 않는다', chip: '회의 중', flavor: '"교수님 지금 학과 회의 들어가셨어요." 복도에 평화가 깃든다.' },
  { id: 'afterparty', name: '학회 뒤풀이', rarity: 'legend', kind: 'timed', dur: 3, icon: 'party', desc: '아군 전원 HP 완전 회복 + 3초 무적', chip: '무적', flavor: '법인카드는 교수님 것. 다들 눈빛이 달라졌다.' },
  { id: 'bestpaper', name: '베스트 페이퍼상', rarity: 'legend', kind: 'instant', icon: 'trophy', desc: '교수실에 최대 HP 10% 피해', chip: '교수실 피해', flavor: '수상 소식에 교수실 문이 덜컹거린다.' },
  // ── 저주 (고위험·고보상) ──
  { id: 'reviewer2', name: '리뷰어 2의 선물', rarity: 'curse', kind: 'battle', icon: 'redbook', desc: '이번 판 처치 보상 +50%, 대신 적 공격력 +15%', chip: '보상 +50% / 적 +15%', flavor: '"전반적으로 흥미롭지만 실험을 전부 다시 하길 권합니다."' },
  { id: 'weekend', name: '주말 출근', rarity: 'curse', kind: 'battle', icon: 'planner', desc: '이번 판 카페인 충전 +30%, 대신 적이 20% 더 자주 나온다', chip: '충전 +30% / 적 출현 +20%', flavor: '토요일 아침 9시, 단톡방에 "다들 나와 있죠?"' },
];

export const CARD_BY_ID: Record<string, CardDef> = Object.fromEntries(CARDS.map((c) => [c.id, c]));

/** 등급이 나올 확률 (합 1). 저주는 가끔만 섞인다. */
export const RARITY_ODDS: Record<CardRarity, number> = { common: 0.61, rare: 0.26, legend: 0.08, curse: 0.05 };

export const RARITY_LABEL: Record<CardRarity, string> = { common: '일반', rare: '희귀', legend: '전설', curse: '저주' };

/** 한 판에 추첨할 수 있는 최대 횟수 */
export const MAX_DRAWS = 3;
/** 전투 시작 후 이 시간 전에는 추첨하지 않는다 */
export const DRAFT_MIN_T = 30;
/** 추첨 사이 최소 간격(초) */
export const DRAFT_GAP = 45;
/** 러시를 못 버텨도 이 시간이 지나면 추첨 (마지막 추첨 또는 시작부터) */
export const DRAFT_FALLBACK = 80;
