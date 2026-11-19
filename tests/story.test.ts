import { describe, expect, it } from 'vitest';
import { FINAL_STAGE, SIDE_STAGES, STAGES } from '../src/data/stages';
import { STORY_ORDER, unlockedScenes } from '../src/story/unlock';
import { SCENES } from '../src/story/script';

describe('스토리 다시 보기', () => {
  it('보스가 아닌 모든 스테이지에 장면이 있고, 순서 목록에 빠진 장면이 없다', () => {
    for (const st of STAGES) if (st.kind !== 'boss') expect(SCENES[`st-${st.id}`], st.id).toBeTruthy();
    expect(new Set(STORY_ORDER).size).toBe(Object.keys(SCENES).length);
    expect(STORY_ORDER[0]).toBe('ch1-intro');
    expect(STORY_ORDER.at(-1)).toBe('side8-clear');
    expect(STORY_ORDER.indexOf('ending')).toBeLessThan(STORY_ORDER.indexOf('side1-intro'));
    for (const st of SIDE_STAGES) if (st.kind !== 'boss') expect(SCENES[`st-${st.id}`], st.id).toBeTruthy();
  });

  it('아무것도 안 했으면 비어 있다', () => {
    expect(unlockedScenes({ seen: [], stars: {} })).toEqual([]);
  });

  it('직접 본 장면은 열린다', () => {
    expect(unlockedScenes({ seen: ['ch1-intro'], stars: {} })).toEqual(['ch1-intro']);
  });

  it('클리어한 스테이지의 장면은 본 적 없어도 열린다 (예전 진행도 이전)', () => {
    const stars = Object.fromEntries(STAGES.slice(0, 10).map((s) => [s.id, 3]));
    const open = unlockedScenes({ seen: [], stars });
    expect(open).toEqual(expect.arrayContaining(['ch1-intro', 'st-1-1', 'st-1-6', 'st-1-9', 'ch1-boss', 'ch1-clear']));
    expect(open).not.toContain('ch2-intro');
    expect(open).not.toContain('ending');
  });

  it('캠페인을 다 깼으면 엔딩까지 모든 장면이 열린다', () => {
    const stars = Object.fromEntries(STAGES.map((s) => [s.id, 3]));
    const open = unlockedScenes({ seen: [], stars });
    expect(open).toContain('ending');
    expect(open).toEqual(STORY_ORDER.slice(0, STORY_ORDER.indexOf('ending') + 1));
    // 외전은 깬 만큼 열린다
    const side = unlockedScenes({ seen: [], stars: { ...stars, 'S2-1': 1 } });
    expect(side).toContain('side2-intro');
    expect(side).toContain('st-S2-1');
    expect(side).not.toContain('st-S2-2');
    expect(stars[FINAL_STAGE.id]).toBe(3);
  });
});
