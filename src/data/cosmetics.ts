/**
 * "심사 결과" 꾸미기 뽑기 아이템. 모두 겉모습만 바꾸고 능력치에는 영향이 없다.
 *
 * 등급은 논문 심사 결과로 부른다.
 * - accept  억셉트 (전설)
 * - minor   마이너 리비전 (희귀)
 * - major   메이저 리비전 (일반)
 * - reject  리젝 (위로 칭호 또는 소액 환급)
 */

export type Grade = 'accept' | 'minor' | 'major' | 'reject';
export type CosmeticKind = 'hat' | 'color' | 'title';

export interface CosmeticDef {
  id: string;
  kind: CosmeticKind;
  grade: Grade;
  name: string;
  /** 한 줄 설명 (심사평처럼) */
  desc: string;
  /** 색 팔레트: 주 색상. 'holo'는 시간에 따라 색이 돈다 */
  color?: string;
  /** 모자가 얼굴(눈 높이)에 쓰는 것인지 (안경류) */
  face?: boolean;
}

export const GRADE_INFO: Record<Grade, { label: string; rarity: string; rate: number; refund: number; ink: string }> = {
  accept: { label: '억셉트', rarity: '전설', rate: 0.05, refund: 200, ink: '#f9a825' },
  minor: { label: '마이너 리비전', rarity: '희귀', rate: 0.2, refund: 80, ink: '#8e24aa' },
  major: { label: '메이저 리비전', rarity: '일반', rate: 0.45, refund: 30, ink: '#1e88e5' },
  reject: { label: '리젝', rarity: '위로', rate: 0.3, refund: 50, ink: '#e53935' },
};

/** 높은 등급부터 */
export const GRADES: Grade[] = ['accept', 'minor', 'major', 'reject'];

export const DRAW_PRICE = 300;
/** 10편 동시 투고는 9편 가격 */
export const DRAW10_PRICE = DRAW_PRICE * 9;
/** 이만큼 연속으로 희귀 이상이 안 나오면 다음 한 번은 희귀 이상 */
export const PITY = 10;

export const COSMETICS: CosmeticDef[] = [
  // ── 모자·액세서리 ──
  { id: 'beanie', kind: 'hat', grade: 'major', name: '털 비니', desc: '난방비 아끼는 연구실 필수품.' },
  { id: 'ribbon', kind: 'hat', grade: 'major', name: '리본 머리띠', desc: '발표 날만 하는 머리띠.' },
  { id: 'sprout', kind: 'hat', grade: 'major', name: '아이디어 새싹', desc: '머리에서 연구 주제가 자라는 중.' },
  { id: 'ballcap', kind: 'hat', grade: 'major', name: '학과 체육대회 모자', desc: '팀 이름은 "그래디언트 소실".' },
  { id: 'roundglasses', kind: 'hat', grade: 'major', name: '동그란 뿔테 안경', desc: '논문을 너무 많이 읽었다.', face: true },
  { id: 'headphones', kind: 'hat', grade: 'minor', name: '노이즈캔슬링 헤드폰', desc: '교수님 목소리만 골라서 막아 준다.' },
  { id: 'catears', kind: 'hat', grade: 'minor', name: '고양이 귀', desc: '연구실 고양이에게 받은 선물.' },
  { id: 'partyhat', kind: 'hat', grade: 'minor', name: '학회 뒤풀이 고깔', desc: '포스터 발표 끝나고 쓴 그것.' },
  { id: 'sunglasses', kind: 'hat', grade: 'minor', name: '밤샘 가리개 선글라스', desc: '다크서클을 완벽히 숨긴다.', face: true },
  { id: 'velvet', kind: 'hat', grade: 'minor', name: '박사 벨벳 학위모', desc: '학위수여식 대여품. 반납 필수.' },
  { id: 'crown', kind: 'hat', grade: 'accept', name: '피인용 왕관', desc: '인용 수 1,000을 넘긴 자만이 쓴다.' },
  { id: 'halo', kind: 'hat', grade: 'accept', name: '리뷰어 1의 후광', desc: '"이 논문은 그대로 실려야 합니다."' },
  { id: 'laurel', kind: 'hat', grade: 'accept', name: '표지 논문 월계관', desc: '저널 표지에 실린 영광.' },
  // ── 색 팔레트 ──
  { id: 'c-strawberry', kind: 'color', grade: 'major', name: '딸기우유 후드', desc: '편의점 야식 컬러.', color: '#f8a5c2' },
  { id: 'c-mint', kind: 'color', grade: 'major', name: '민트초코 후드', desc: '호불호가 갈린다.', color: '#7fd3c3' },
  { id: 'c-lemon', kind: 'color', grade: 'major', name: '형광펜 노랑', desc: '중요한 곳에만 칠했는데 전부 칠해짐.', color: '#f4ff81' },
  { id: 'c-gray', kind: 'color', grade: 'major', name: '야근 회색', desc: '사흘째 같은 옷.', color: '#a7a9ac' },
  { id: 'c-navy', kind: 'color', grade: 'minor', name: '새벽 3시 남색', desc: '창밖이 이 색일 때 코드가 돈다.', color: '#3f51b5' },
  { id: 'c-cherry', kind: 'color', grade: 'minor', name: '빨간 펜 체리', desc: '첨삭받은 원고 색.', color: '#e53950' },
  { id: 'c-lavender', kind: 'color', grade: 'minor', name: '라벤더 아로마', desc: '심사 기다릴 때 마음을 달래는 색.', color: '#c3a6f0' },
  { id: 'c-gold', kind: 'color', grade: 'accept', name: '억셉트 골드', desc: '메일 제목에 "Accepted"가 보였다.', color: '#ffc928' },
  { id: 'c-holo', kind: 'color', grade: 'accept', name: '홀로그램 포스터', desc: '보는 각도마다 결과가 달라 보인다.', color: 'holo' },
  // ── 칭호 ──
  { id: 't-reviewer2', kind: 'title', grade: 'reject', name: '리뷰어 2의 단골', desc: '"저자는 실험을 처음부터 다시 해야 합니다."' },
  { id: 't-desk', kind: 'title', grade: 'reject', name: '데스크 리젝 장인', desc: '투고 2시간 만에 답장이 왔다.' },
  { id: 't-format', kind: 'title', grade: 'reject', name: '양식 위반 전문가', desc: '여백이 0.1cm 모자랐다.' },
  { id: 't-english', kind: 'title', grade: 'reject', name: '영문 교정 권유받음', desc: '원어민 교정 영수증을 첨부하세요.' },
  { id: 't-resubmit', kind: 'title', grade: 'reject', name: '재투고의 달인', desc: '같은 논문, 일곱 번째 저널.' },
  { id: 't-major', kind: 'title', grade: 'major', name: '메이저 리비전 생존자', desc: '답변서가 본문보다 길다.' },
  { id: 't-minor', kind: 'title', grade: 'minor', name: '오타만 고치면 됨', desc: '마이너 리비전의 행복.' },
  { id: 't-accept', kind: 'title', grade: 'accept', name: '한 번에 억셉트', desc: '전설로만 전해지는 이야기.' },
];

export const COSMETIC_BY_ID: Record<string, CosmeticDef> = Object.fromEntries(COSMETICS.map((c) => [c.id, c]));

/** 옷장 칸: 주인공 + 동료 유닛 id */
export const HERO_SLOT = 'hero';

export interface Outfit {
  hat?: string;
  color?: string;
}
