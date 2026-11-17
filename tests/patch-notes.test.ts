import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { GAME_VERSION, PATCH_NOTES, compareVersions, unseenNotes } from '../src/data/patch-notes';

describe('패치노트', () => {
  it('최신 순으로 정렬돼 있고 버전이 겹치지 않는다', () => {
    for (let i = 1; i < PATCH_NOTES.length; i++) {
      expect(compareVersions(PATCH_NOTES[i - 1]!.version, PATCH_NOTES[i]!.version)).toBeGreaterThan(0);
      expect(PATCH_NOTES[i - 1]!.date >= PATCH_NOTES[i]!.date).toBe(true);
    }
  });

  it('맨 위 버전이 package.json 버전과 같다', () => {
    const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as { version: string };
    expect(PATCH_NOTES[0]!.version).toBe(pkg.version);
    expect(GAME_VERSION).toBe(pkg.version);
  });

  it('항목 형식이 올바르다', () => {
    for (const n of PATCH_NOTES) {
      expect(n.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(n.title.length).toBeGreaterThan(0);
      expect(n.items.length).toBeGreaterThan(0);
      // 이모지 대신 손그림 아이콘 표시({token})를 쓴다
      for (const it of n.items) expect(it).not.toMatch(/\p{Extended_Pictographic}/u);
    }
  });

  it('버전을 숫자로 비교한다', () => {
    expect(compareVersions('0.10.0', '0.9.1')).toBeGreaterThan(0);
    expect(compareVersions('0.9.1', '0.10.0')).toBeLessThan(0);
    expect(compareVersions('1.0', '1.0.0')).toBe(0);
  });

  it('마지막으로 본 버전보다 새 것만 고른다', () => {
    const notes = [
      { version: '0.12.0', date: '2026-11-17', title: 'c', items: ['c'] },
      { version: '0.10.1', date: '2026-11-17', title: 'b', items: ['b'] },
      { version: '0.9.0', date: '2026-11-16', title: 'a', items: ['a'] },
    ];
    expect(unseenNotes('0.9.0', notes).map((n) => n.version)).toEqual(['0.12.0', '0.10.1']);
    expect(unseenNotes('0.10.1', notes).map((n) => n.version)).toEqual(['0.12.0']);
    expect(unseenNotes('0.12.0', notes)).toEqual([]);
    // 처음 온 플레이어는 보여 줄 것이 없다
    expect(unseenNotes(null, notes)).toEqual([]);
    expect(unseenNotes(undefined, notes)).toEqual([]);
  });
});
