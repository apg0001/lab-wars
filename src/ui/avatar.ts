import { UNITS } from '../data/units';
import { COSMETIC_BY_ID, HERO_SLOT, type Outfit } from '../data/cosmetics';
import { heroLook } from '../story/player';
import { isUnitOwned, unitProgress, type SaveData } from '../sim/progression';
import { portrait } from './icons';

/** 내 대표 캐릭터 초상 (가진 유닛이 아니면 주인공) */
export function myAvatar(save: SaveData): string {
  const id = save.cosmetics.avatar;
  const def = id ? UNITS.find((u) => u.id === id) : undefined;
  if (def && isUnitOwned(save, def)) return portrait(def.look, unitProgress(save, def.id).tier, def.id);
  return portrait(heroLook(1).look, 1, HERO_SLOT);
}

/** 순위표 줄의 대표 캐릭터 (서버가 넘겨준 값은 알려진 것만 쓴다) */
export function rankAvatar(avatar: string | undefined, tier: number | undefined, fit: { hat?: string; color?: string } | undefined): string {
  const outfit: Outfit = {};
  if (fit?.hat && COSMETIC_BY_ID[fit.hat]?.kind === 'hat') outfit.hat = fit.hat;
  if (fit?.color && COSMETIC_BY_ID[fit.color]?.kind === 'color') outfit.color = fit.color;
  const def = avatar ? UNITS.find((u) => u.id === avatar) : undefined;
  const t = Math.min(3, Math.max(1, Math.floor(tier ?? 1)));
  if (def) return portrait(def.look, Math.min(t, def.names.length), def.id, 1, outfit);
  return portrait(heroLook(1).look, 1, HERO_SLOT, 1, outfit);
}
