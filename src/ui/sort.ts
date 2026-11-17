import type { UnitRarity } from '../data/types';
import { kv } from '../save/store';
import { getLang, tr } from '../i18n';
import { h } from './dom';

/** 정렬 기준. default는 원래(데이터) 순서 */
export type SortKey = 'default' | 'rarity' | 'level' | 'cost' | 'atk' | 'hp' | 'name';
/** 목록 화면 하나의 보기 설정 */
export interface ListPref { key: SortKey; desc: boolean; compact: boolean }

/** 등급 순위 (높을수록 귀함) */
export const RARITY_RANK: Record<UnitRarity, number> = { basic: 0, rare: 1, epic: 2, legend: 3 };

/** 정렬 값. null이면 (못 얻은 유닛 레벨, 아직 모르는 적 등) 방향과 상관없이 맨 뒤 */
export type SortValue = number | string | null;

/**
 * 안정 정렬: 값이 같으면 원래 순서를 지킨다. 원본 배열은 건드리지 않는다.
 * 글자는 지금 언어 기준으로 비교한다.
 */
export function sortList<T>(items: readonly T[], value: (t: T, i: number) => SortValue, desc: boolean): T[] {
  const rows = items.map((t, i) => ({ t, i, v: value(t, i) }));
  rows.sort((a, b) => {
    if (a.v === null || b.v === null) return a.v === b.v ? a.i - b.i : a.v === null ? 1 : -1;
    const c = typeof a.v === 'string' || typeof b.v === 'string' ? String(a.v).localeCompare(String(b.v), getLang()) : a.v - b.v;
    return c ? (desc ? -c : c) : a.i - b.i;
  });
  return rows.map((r) => r.t);
}

/** 보기 설정대로 정렬한다. 기본 순이면 방향과 상관없이 원래 순서 */
export function sortByPref<T>(items: readonly T[], pref: ListPref, value: (t: T, key: Exclude<SortKey, 'default'>) => SortValue): T[] {
  const key = pref.key;
  return key === 'default' ? [...items] : sortList(items, (t) => value(t, key), pref.desc);
}

const KEY_LABEL: Record<SortKey, () => string> = {
  default: () => tr('기본 순', 'Default'),
  rarity: () => tr('등급', 'Rarity'),
  level: () => tr('레벨', 'Level'),
  cost: () => tr('커피 비용', 'Cost'),
  atk: () => tr('공격력', 'Attack'),
  hp: () => tr('체력', 'HP'),
  name: () => tr('이름', 'Name'),
};

/** 저장된 글을 읽어 허용된 값만 남긴다 (깨졌거나 옛 값이면 기본값) */
export function parsePref(raw: string | null, keys: readonly SortKey[], fallback: ListPref): ListPref {
  try {
    const p = JSON.parse(raw ?? '{}') as Partial<ListPref>;
    return {
      key: p.key && keys.includes(p.key) ? p.key : fallback.key,
      desc: typeof p.desc === 'boolean' ? p.desc : fallback.desc,
      compact: typeof p.compact === 'boolean' ? p.compact : fallback.compact,
    };
  } catch {
    return { ...fallback };
  }
}

const DEFAULT_PREF: ListPref = { key: 'default', desc: false, compact: false };

/** 기기에 저장된 보기 설정 (화면별 id) */
export const loadPref = (id: string, keys: readonly SortKey[]): ListPref => parsePref(kv.get(`list:${id}`), keys, DEFAULT_PREF);
export const savePref = (id: string, p: ListPref): void => kv.set(`list:${id}`, JSON.stringify(p));

/**
 * 정렬 고르기 + 오름/내림 + 간단히/자세히 한 줄.
 * 바꾸면 저장하고 onChange로 다시 그리게 한다.
 */
export function sortBar(id: string, pref: ListPref, keys: readonly SortKey[], onChange: () => void): HTMLElement {
  const set = (patch: Partial<ListPref>): void => {
    Object.assign(pref, patch);
    savePref(id, pref);
    onChange();
  };
  const select = h('select.sort-select', { 'aria-label': tr('정렬', 'Sort'), onchange: () => set({ key: (select as HTMLSelectElement).value as SortKey }) },
    ...keys.map((k) => h('option', { value: k, selected: k === pref.key ? 'true' : undefined }, KEY_LABEL[k]())));
  return h('div.sort-bar', {},
    h('span.muted', {}, tr('정렬', 'Sort')),
    select,
    h('button.chapter-tab.sort-dir', {
      disabled: pref.key === 'default' ? 'true' : undefined,
      title: pref.desc ? tr('내림차순', 'Descending') : tr('오름차순', 'Ascending'),
      onclick: () => set({ desc: !pref.desc }),
    }, pref.desc ? tr('▼ 내림', '▼ Desc') : tr('▲ 오름', '▲ Asc')),
    h('div.view-toggle', {},
      h(`button.chapter-tab${pref.compact ? '.on' : ''}`, { onclick: () => set({ compact: true }) }, tr('간단히', 'Compact')),
      h(`button.chapter-tab${pref.compact ? '' : '.on'}`, { onclick: () => set({ compact: false }) }, tr('자세히', 'Detailed')),
    ),
  );
}
