import type { StageDef } from '../data/stages';
import { isCleared, ownedUnits, type SaveData } from './progression';

/**
 * 한 번만 보여 주는 안내. 스토리 장면처럼 save.seen에 id를 남긴다.
 * (저장 버전을 올리지 않아도 옛 저장과 그대로 맞는다)
 */
export const GUIDE_SQUAD = 'guide:squad';
export const GUIDE_TUTORIAL = 'guide:tutorial';

export const hasSeen = (save: SaveData, id: string): boolean => save.seen.includes(id);

/** 본 것으로 남긴다. 새로 남겼으면 true */
export function markSeen(save: SaveData, id: string): boolean {
  if (hasSeen(save, id)) return false;
  save.seen.push(id);
  save.updatedAt = Date.now();
  return true;
}

/** 편성(0.17.0) 첫 안내: 아직 편성 화면을 안 봤고, 고를 동료가 둘 이상일 때 */
export const shouldPromptSquad = (save: SaveData): boolean => !hasSeen(save, GUIDE_SQUAD) && ownedUnits(save).length >= 2;

/** 첫 플레이 튜토리얼: 1-1을 아직 못 깬 새 저장의 첫 전투에서만 */
export const shouldShowTutorial = (save: SaveData, stage: StageDef): boolean =>
  stage.id === '1-1' && !stage.side && stage.kind !== 'endless' && !isCleared(save, '1-1') && !hasSeen(save, GUIDE_TUTORIAL);
