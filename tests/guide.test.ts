import { describe, expect, it } from 'vitest';
import { STAGE_BY_ID, endlessStage } from '../src/data/stages';
import { newSave, normalizeSave, takeMigrationNotes, SAVE_VERSION } from '../src/sim/progression';
import { STORY_ORDER } from '../src/story/unlock';
import { GUIDE_SQUAD, GUIDE_TUTORIAL, markSeen, shouldPromptSquad, shouldShowTutorial } from '../src/sim/guide';

describe('첫 안내 (편성 · 튜토리얼)', () => {
  it('막내 하나뿐인 새 저장에는 편성 안내를 띄우지 않는다', () => {
    expect(shouldPromptSquad(newSave())).toBe(false);
  });

  it('동료가 둘 이상이면 한 번만 편성 안내를 띄운다', () => {
    const s = newSave();
    s.stars['1-3'] = 3; // 1-3을 깨면 두 번째 동료가 합류한다
    expect(shouldPromptSquad(s)).toBe(true);
    expect(markSeen(s, GUIDE_SQUAD)).toBe(true);
    expect(markSeen(s, GUIDE_SQUAD)).toBe(false);
    expect(shouldPromptSquad(s)).toBe(false);
  });

  it('튜토리얼은 아직 못 깬 1-1에서만, 한 번만', () => {
    const s = newSave();
    expect(shouldShowTutorial(s, STAGE_BY_ID['1-1']!)).toBe(true);
    expect(shouldShowTutorial(s, STAGE_BY_ID['1-2']!)).toBe(false);
    expect(shouldShowTutorial(s, endlessStage(1))).toBe(false);
    markSeen(s, GUIDE_TUTORIAL);
    expect(shouldShowTutorial(s, STAGE_BY_ID['1-1']!)).toBe(false);
    const veteran = newSave();
    veteran.stars['1-1'] = 1;
    expect(shouldShowTutorial(veteran, STAGE_BY_ID['1-1']!)).toBe(false);
  });

  it('안내 기록은 저장을 다시 읽어도 남고, 옛 저장(안내 기록 없음)은 아직 안 본 것으로 읽힌다', () => {
    const s = newSave();
    s.stars['1-3'] = 3;
    markSeen(s, GUIDE_SQUAD);
    markSeen(s, GUIDE_TUTORIAL);
    const back = normalizeSave(JSON.parse(JSON.stringify(s)));
    expect(back.v).toBe(SAVE_VERSION);
    expect(back.seen).toEqual(expect.arrayContaining([GUIDE_SQUAD, GUIDE_TUTORIAL]));
    expect(shouldPromptSquad(back)).toBe(false);

    // 0.17.0 이전 저장: seen에 스토리 장면만 있다 → 편성 안내 대상
    const old = normalizeSave({ v: 4, money: 0, stars: { '1-1': 3, '1-2': 2, '1-3': 1 }, seen: ['ch1-intro', 'st-1-1'] });
    takeMigrationNotes();
    expect(old.seen).toEqual(['ch1-intro', 'st-1-1']);
    expect(shouldPromptSquad(old)).toBe(true);
    expect(shouldShowTutorial(old, STAGE_BY_ID['1-1']!)).toBe(false);
  });

  it('스토리 장면을 다 봐도 안내 기록이 seen 상한(200)에 잘리지 않는다', () => {
    const s = newSave();
    s.seen = [...STORY_ORDER];
    markSeen(s, GUIDE_SQUAD);
    markSeen(s, GUIDE_TUTORIAL);
    expect(normalizeSave(JSON.parse(JSON.stringify(s))).seen).toEqual(expect.arrayContaining([GUIDE_SQUAD, GUIDE_TUTORIAL]));
  });
});
