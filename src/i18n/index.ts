/**
 * 다국어 (한국어 / 영어).
 *
 * - UI 글자: `tr('한국어', 'English')` 를 그리는 시점에 부른다.
 * - 데이터(유닛·적·카드 등): 항목 옆에 `en: { ... }` 를 함께 적고 `localizeAll`로 등록하면,
 *   언어를 바꿀 때 원래 필드(name, desc …)가 그 자리에서 바뀐다. 그래서 쓰는 쪽은 `def.name` 그대로 읽으면 된다.
 * - 스토리: src/story/en/*.ts 에 장면 id별 영어 대사가 있다 (script.ts에서 등록).
 *
 * 브라우저 언어가 ko로 시작하면 한국어, 아니면 영어. 설정에서 바꾸면 기기에 기억한다.
 */
export type Lang = 'ko' | 'en';

const STORE_KEY = 'mw:lang';

/** 선호 언어 목록(navigator.languages)에서 언어를 고른다: 첫 언어가 ko로 시작하면 한국어, 아니면 영어 */
export function detectLang(langs: readonly (string | undefined | null)[] | undefined | null): Lang {
  const first = (langs ?? []).find((l) => typeof l === 'string' && l.length > 0);
  return first?.toLowerCase().startsWith('ko') ? 'ko' : 'en';
}

function readStored(): Lang | null {
  try {
    const v = localStorage.getItem(STORE_KEY);
    return v === 'ko' || v === 'en' ? v : null;
  } catch {
    return null;
  }
}

function initialLang(): Lang {
  // 브라우저가 아닌 곳(테스트·서버)은 원문(한국어) 그대로
  if (typeof document === 'undefined' || typeof navigator === 'undefined') return 'ko';
  const stored = readStored();
  if (stored) return stored;
  const nav = navigator as Navigator;
  return detectLang(nav.languages?.length ? nav.languages : [nav.language]);
}

let current: Lang = initialLang();

export function getLang(): Lang {
  return current;
}

export const isEn = (): boolean => current === 'en';

/** 지금 언어에 맞는 글자 */
export function tr(ko: string, en: string): string {
  return current === 'en' ? en : ko;
}

// ── 데이터 현지화: 객체의 필드를 언어에 맞게 그 자리에서 바꾼다 ──

interface Entry {
  obj: Record<string, unknown>;
  ko: Record<string, unknown>;
  en: Record<string, unknown>;
}
const registry: Entry[] = [];

/** obj의 필드 중 en에 적힌 것을 영어로 바꿀 수 있게 등록한다 (지금 영어면 바로 바꾼다). */
export function localize<T extends object>(obj: T, en: Partial<T> | undefined): T {
  if (!en) return obj;
  const o = obj as Record<string, unknown>;
  const e = en as Record<string, unknown>;
  const ko: Record<string, unknown> = {};
  for (const k of Object.keys(e)) ko[k] = o[k];
  registry.push({ obj: o, ko, en: e });
  if (current === 'en') Object.assign(o, e);
  return obj;
}

/** 목록의 각 항목에 붙은 `en` 필드로 등록한다 */
export function localizeAll<T extends { en?: object }>(list: T[]): T[] {
  for (const item of list) localize(item, item.en as Partial<T> | undefined);
  return list;
}

/** 등록된 현지화 항목 (테스트: 모든 영어 글자 확인용) */
export function localizedEntries(): readonly { ko: Record<string, unknown>; en: Record<string, unknown> }[] {
  return registry;
}

const listeners = new Set<(l: Lang) => void>();

/** 언어가 바뀔 때 부른다 (화면 다시 그리기 등) */
export function onLangChange(fn: (l: Lang) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** 언어를 바꾸고 기억한다 (remember=false면 저장하지 않음: 테스트용) */
export function setLang(l: Lang, remember = true): void {
  if (remember) {
    try {
      localStorage.setItem(STORE_KEY, l);
    } catch {
      /* 저장이 막혀도 이번 실행에는 적용 */
    }
  }
  if (l === current) return;
  current = l;
  for (const e of registry) Object.assign(e.obj, l === 'en' ? e.en : e.ko);
  applyDocument();
  for (const fn of listeners) fn(l);
}

/** <html lang>, 문서 제목, 홈 화면 이름 */
export function applyDocument(): void {
  if (typeof document === 'undefined') return;
  const name = tr('랩워즈', 'Lab Wars');
  document.documentElement.lang = current;
  document.title = name;
  document.querySelector('meta[name="apple-mobile-web-app-title"]')?.setAttribute('content', name);
  document.querySelector('meta[name="description"]')?.setAttribute('content', tr(
    '교수님의 끝없는 잡무로부터 연구실을 지켜라! 모바일 웹 라인 디펜스 게임',
    'Defend your lab from the endless busywork of professors! A mobile web lane-defense game',
  ));
  document.querySelector('link[rel="manifest"]')?.setAttribute('href', current === 'en' ? './manifest.en.webmanifest' : './manifest.webmanifest');
}
