/**
 * 스토리 영어 대본. 장면 id별로 원문과 같은 순서로 적는다.
 * - lines: 대사 한 줄마다 하나 (원문 lines와 개수·순서가 같아야 한다)
 * - banners: 그 장면의 { a: 'banner' } 연출 글자를 나오는 순서대로
 * - {name}과 {아이콘} 표시는 원문 그대로 둔다 (tests/i18n.test.ts가 확인)
 */
import { localize } from '../../i18n';
import type { Action, Scene } from '../script';
import { EN_MAIN } from './main';
import { EN_STAGES } from './stages';
import { EN_SIDE } from './side';

export interface SceneEn {
  title?: string;
  sign?: string;
  lines: string[];
  banners?: string[];
}

export const STORY_EN: Record<string, SceneEn> = { ...EN_MAIN, ...EN_STAGES, ...EN_SIDE };

/** 장면의 연출 중 현수막(banner)을 나오는 순서대로 */
export function bannersOf(scene: Scene): Extract<Action, { a: 'banner' }>[] {
  return scene.lines.flatMap((l) => (l.do ?? []).filter((a): a is Extract<Action, { a: 'banner' }> => a.a === 'banner'));
}

/** 장면들을 영어 대본에 등록한다 (언어를 바꾸면 그 자리에서 바뀐다) */
export function localizeScenes(scenes: Scene[]): void {
  for (const scene of scenes) {
    const en = STORY_EN[scene.id];
    if (!en) continue;
    const head: Partial<Scene> = {};
    if (scene.title !== undefined && en.title !== undefined) head.title = en.title;
    if (scene.sign !== undefined && en.sign !== undefined) head.sign = en.sign;
    localize(scene, head);
    scene.lines.forEach((line, i) => {
      const text = en.lines[i];
      if (text !== undefined) localize(line, { text });
    });
    bannersOf(scene).forEach((b, i) => {
      const text = en.banners?.[i];
      if (text !== undefined) localize(b, { text });
    });
  }
}
