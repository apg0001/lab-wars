export type SkillId = 'snack' | 'allnight' | 'aircon' | 'bombard';

export interface SkillDef {
  id: SkillId;
  name: string;
  icon: string;
  cost: number;
  desc: string;
  unlockStage?: string;
  /** 지점을 지정해야 하는 스킬 */
  targeted?: boolean;
  /** 도감 한 줄 설정 */
  lore: string;
}

export const SKILLS: SkillDef[] = [
  { id: 'snack', name: '야식 배달', icon: '🍗', cost: 35, desc: '모든 아군 HP를 최대치의 35% 회복', lore: '치킨 앞에서는 모두가 잠시 평화로워진다.' },
  { id: 'allnight', name: '밤샘 모드', icon: '🌙', cost: 50, desc: '8초간 아군 공격 속도 ×1.6, 이동 속도 ×1.2', unlockStage: '1-10', lore: '내일의 나에게 빚을 지고 오늘의 나를 깨운다.' },
  { id: 'aircon', name: '에어컨 풀가동', icon: '❄️', cost: 45, desc: '6초간 적 이동·공격 속도 ×0.5', unlockStage: '3-10', lore: '18도로 맞추면 잡무도 굳는다. 대신 다들 담요를 찾는다.' },
  { id: 'bombard', name: '논문 투고 폭격', icon: '📚', cost: 60, desc: '탭한 지점에 150 피해 (반경 90)', unlockStage: '5-10', targeted: true, lore: '쌓아 둔 원고를 한꺼번에 던진다. 하나쯤은 억셉트되겠지.' },
];

export type FacilityId = 'remodel' | 'coffee' | 'tumbler' | 'meditate' | 'planner' | 'printer' | 'printerRange';

export interface FacilityDef {
  id: FacilityId;
  name: string;
  icon: string;
  desc: string;
  max: number;
  baseCost: number;
}

export const FACILITIES: FacilityDef[] = [
  { id: 'remodel', name: '연구실 리모델링', icon: '🏗️', desc: '연구실 최대 HP +12%', max: 10, baseCost: 80 },
  { id: 'coffee', name: '커피머신', icon: '☕', desc: '카페인 충전 +0.6/초', max: 10, baseCost: 100 },
  { id: 'tumbler', name: '대용량 텀블러', icon: '🥤', desc: '최대 카페인 +15', max: 8, baseCost: 90 },
  { id: 'meditate', name: '명상 앱', icon: '🧘', desc: '멘탈 충전 +0.25/초 (스킬을 더 자주)', max: 8, baseCost: 110 },
  { id: 'planner', name: '일정 관리 앱', icon: '📅', desc: '동료 재소환 대기시간 −4%', max: 8, baseCost: 120 },
  { id: 'printer', name: '자동 프린터 포탑', icon: '🖨️', desc: '포탑 피해 +20%', max: 10, baseCost: 90 },
  { id: 'printerRange', name: '프린터 사거리 연장', icon: '📏', desc: '포탑 사거리 +25 (기본 300, 최대 600)', max: 12, baseCost: 160 },
];

export const facilityCost = (f: FacilityDef, level: number): number => Math.round(f.baseCost * 1.5 ** level);
