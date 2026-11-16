import type { Look } from '../data/types';
import { drawCharacter } from '../render/characters';

const cache = new Map<string, string>();

/** 캐릭터 초상을 작은 이미지(data URL)로 만들어 캐시한다. */
export function portrait(look: Look, tier = 1, defId = '', facing: 1 | -1 = 1): string {
  const key = `${look.kind}|${look.color}|${look.prop}|${tier}|${defId}|${facing}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const size = 96;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;
  const s = look.scale ?? 1;
  // 캐릭터 키에 맞춰 축소해서 칸에 맞춘다
  const fit = 1.7 / Math.max(1, s * 0.75);
  ctx.translate(size / 2, size - 10);
  ctx.scale(fit, fit);
  const lift = look.kind === 'drone' || look.kind === 'plane' || look.kind === 'notif' ? 12 : 0;
  drawCharacter(ctx, look, { walk: 0, swing: 0, tier, time: 0.3, moving: false }, 0, lift, facing, defId);
  const url = c.toDataURL();
  cache.set(key, url);
  return url;
}
