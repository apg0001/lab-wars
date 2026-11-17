import { describe, expect, it } from 'vitest';
import { FINAL_STAGE, STAGES } from '../src/data/stages';
import { unlockedScenes } from '../src/story/unlock';
import { SCENE_ORDER } from '../src/story/script';

describe('스토리 다시 보기', () => {
  it('아무것도 안 했으면 비어 있다', () => {
    expect(unlockedScenes({ seen: [], stars: {} })).toEqual([]);
  });

  it('직접 본 장면은 열린다', () => {
    expect(unlockedScenes({ seen: ['ch1-intro'], stars: {} })).toEqual(['ch1-intro']);
  });

  it('클리어한 스테이지의 장면은 본 적 없어도 열린다 (예전 진행도 이전)', () => {
    const stars = Object.fromEntries(STAGES.slice(0, 6).map((s) => [s.id, 3]));
    const open = unlockedScenes({ seen: [], stars });
    expect(open).toEqual(expect.arrayContaining(['ch1-intro', 'ev-vacation', 'ch1-boss', 'ch1-clear']));
    expect(open).not.toContain('ch2-intro');
    expect(open).not.toContain('ending');
  });

  it('캠페인을 다 깼으면 엔딩까지 모든 장면이 열린다', () => {
    const stars = Object.fromEntries(STAGES.map((s) => [s.id, 3]));
    const open = unlockedScenes({ seen: [], stars });
    expect(open).toContain('ending');
    expect(open).toEqual(SCENE_ORDER);
    expect(stars[FINAL_STAGE.id]).toBe(3);
  });
});
