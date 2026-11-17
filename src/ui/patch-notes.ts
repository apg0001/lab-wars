import { GAME_VERSION, PATCH_NOTES, unseenNotes, type PatchNote } from '../data/patch-notes';
import { kv } from '../save/store';
import { h } from './dom';
import { tr } from '../i18n';

/** 마지막으로 본 패치노트 버전을 담는 키 (App 설정과 따로 둬서 서로 덮어쓰지 않게) */
const SEEN_KEY = 'patchSeen';
/** 업데이트 소식 창에 한 번에 보여 줄 최대 버전 수 */
const POPUP_MAX = 3;

function noteCard(n: PatchNote): HTMLElement {
  return h('div.patch-note', {},
    h('div.patch-head', {}, h('b', {}, `v${n.version} · ${n.title}`), h('span.muted', {}, n.date)),
    h('ul', {}, ...n.items.map((it) => h('li', {}, it))),
  );
}

function openPanel(host: Element, title: string, notes: PatchNote[], extra?: HTMLElement | null): HTMLElement {
  const overlay = h('div.overlay', { onclick: (e: Event) => { if (e.target === overlay) overlay.remove(); } });
  overlay.append(h('div.panel.patch-panel', {},
    h('h2', {}, title),
    h('div.patch-list', {}, ...notes.map(noteCard)),
    h('div.btn-row', {}, extra ?? null, h('button.btn.primary', { onclick: () => overlay.remove() }, tr('확인', 'OK'))),
  ));
  host.append(overlay);
  return overlay;
}

/** 모든 버전의 패치노트 */
export function showPatchNotes(host: Element | null): void {
  if (host) openPanel(host, tr('{scroll} 패치노트', '{scroll} Patch notes'), PATCH_NOTES);
}

/**
 * 접속 시 한 번: 마지막으로 본 버전보다 새 소식이 있으면 보여 주고, 지금 버전을 본 것으로 기록한다.
 * 기록이 없으면 처음 온 플레이어라 창 없이 기록만 한다.
 * 다만 이 기능 이전부터 하던 플레이어(returning)라면 최신 소식 하나는 보여 준다.
 */
export function maybeShowUpdates(host: Element | null, returning: boolean): void {
  if (!host) return;
  const last = kv.get(SEEN_KEY);
  if (last === GAME_VERSION) return;
  kv.set(SEEN_KEY, GAME_VERSION);
  const notes = last ? unseenNotes(last) : returning ? PATCH_NOTES.slice(0, 1) : [];
  if (!notes.length) return;
  const more = notes.length > POPUP_MAX || PATCH_NOTES.length > notes.length;
  let overlay: HTMLElement | null = null;
  const all = more ? h('button.btn', { onclick: () => { overlay?.remove(); showPatchNotes(host); } }, tr('전체 보기', 'See all')) : null;
  overlay = openPanel(host, tr('{sparkle} 업데이트 소식', '{sparkle} What\'s new'), notes.slice(0, POPUP_MAX), all);
}
