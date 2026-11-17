import { describe, expect, it } from 'vitest';
import { RARITY_RANK, parsePref, sortByPref, sortList, type ListPref, type SortKey } from '../src/ui/sort';

interface Row { id: string; lv: number | null; name: string }
const rows: Row[] = [
  { id: 'a', lv: 3, name: '다' },
  { id: 'b', lv: null, name: '가' },
  { id: 'c', lv: 5, name: '나' },
  { id: 'd', lv: 3, name: '라' },
];
const ids = (r: Row[]): string[] => r.map((x) => x.id);

describe('목록 정렬', () => {
  it('오름·내림차순, 값이 같으면 원래 순서를 지키고 null은 늘 맨 뒤', () => {
    expect(ids(sortList(rows, (r) => r.lv, false))).toEqual(['a', 'd', 'c', 'b']);
    expect(ids(sortList(rows, (r) => r.lv, true))).toEqual(['c', 'a', 'd', 'b']);
  });

  it('글자는 가나다 순으로 비교하고 원본 배열은 그대로 둔다', () => {
    expect(ids(sortList(rows, (r) => r.name, false))).toEqual(['b', 'c', 'a', 'd']);
    expect(ids(rows)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('기본 순은 내림차순이 켜져 있어도 원래 순서', () => {
    const pref: ListPref = { key: 'default', desc: true, compact: false };
    expect(ids(sortByPref(rows, pref, () => 0))).toEqual(['a', 'b', 'c', 'd']);
    expect(ids(sortByPref(rows, { ...pref, key: 'level' }, (r) => r.lv))).toEqual(['c', 'a', 'd', 'b']);
  });

  it('등급 순위는 기본 < 레어 < 에픽 < 레전더리', () => {
    expect(RARITY_RANK.basic).toBeLessThan(RARITY_RANK.rare);
    expect(RARITY_RANK.rare).toBeLessThan(RARITY_RANK.epic);
    expect(RARITY_RANK.epic).toBeLessThan(RARITY_RANK.legend);
  });
});

describe('보기 설정 읽기', () => {
  const keys: SortKey[] = ['default', 'name', 'hp'];
  const fallback: ListPref = { key: 'default', desc: false, compact: false };

  it('저장된 값을 읽고, 없거나 깨지면 기본값', () => {
    expect(parsePref('{"key":"hp","desc":true,"compact":true}', keys, fallback)).toEqual({ key: 'hp', desc: true, compact: true });
    expect(parsePref(null, keys, fallback)).toEqual(fallback);
    expect(parsePref('{not json', keys, fallback)).toEqual(fallback);
  });

  it('이 화면에 없는 기준이나 잘못된 형식은 무시한다', () => {
    expect(parsePref('{"key":"level","desc":"yes","compact":1}', keys, fallback)).toEqual(fallback);
  });
});
