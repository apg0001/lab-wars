import { FINAL_STAGE, SIDE_STAGES, STAGES, type StageDef } from '../data/stages';
import { SCENES } from './script';

/** 이 스테이지 앞뒤로 나오는 장면 id들 */
export function scenesOfStage(stage: StageDef): { before: string[]; after: string[] } {
  if (stage.kind === 'endless') return { before: [], after: [] };
  if (stage.side) {
    const n = stage.side;
    const before = [
      stage.index === 1 ? `side${n}-intro` : '',
      stage.kind === 'boss' ? `side${n}-boss` : `st-${stage.id}`,
    ].filter((id) => id && SCENES[id]);
    return { before, after: stage.kind === 'boss' ? [`side${n}-clear`].filter((id) => SCENES[id]) : [] };
  }
  const before = [
    stage.index === 1 ? `ch${stage.chapter}-intro` : '',
    stage.kind !== 'boss' ? `st-${stage.id}` : '',
    stage.kind === 'boss' ? `ch${stage.chapter}-boss` : '',
  ].filter((id) => id && SCENES[id]);
  const after = stage.kind === 'boss' ? [stage.id === FINAL_STAGE.id ? 'ending' : `ch${stage.chapter}-clear`].filter((id) => SCENES[id]) : [];
  return { before, after };
}

/** 이야기 순서대로 늘어놓은 모든 장면 id */
export const STORY_ORDER: string[] = [...STAGES, ...SIDE_STAGES].flatMap((st) => {
  const { before, after } = scenesOfStage(st);
  return [...before, ...after];
});

/**
 * 다시 보기에 열 장면: 직접 본 장면 + 이미 클리어한 스테이지의 장면.
 * (예전 진행도를 옮겨 온 계정도 깬 만큼 스토리를 볼 수 있게)
 */
export function unlockedScenes(save: { seen: string[]; stars: Record<string, number> }): string[] {
  const open = new Set(save.seen);
  for (const st of [...STAGES, ...SIDE_STAGES]) {
    if (!(save.stars[st.id] ?? 0)) continue;
    const { before, after } = scenesOfStage(st);
    for (const id of [...before, ...after]) open.add(id);
  }
  return STORY_ORDER.filter((id) => open.has(id));
}
