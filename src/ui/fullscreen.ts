import { h, setRich } from './dom';
import { isPortrait } from './orientation';
import { tr } from '../i18n';

type FsElement = HTMLElement & { webkitRequestFullscreen?: () => Promise<void> | void };
type FsDocument = Document & { webkitFullscreenElement?: Element | null; webkitExitFullscreen?: () => void };

const doc = document as FsDocument;

/** 홈 화면에 설치해 앱처럼 실행 중이면 이미 전체 화면이다. */
export function isStandalone(): boolean {
  return window.matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches
    || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

export function isFullscreen(): boolean {
  return !!(doc.fullscreenElement ?? doc.webkitFullscreenElement);
}

function apiAvailable(): boolean {
  const el = document.documentElement as FsElement;
  return !!(el.requestFullscreen || el.webkitRequestFullscreen);
}

const isIOS = (): boolean => /iPhone|iPad|iPod/.test(navigator.userAgent)
  || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

/** 전체 화면 버튼을 보여줄지: 이미 설치 실행 중이거나 전체 화면이면 숨긴다. */
export function shouldOfferFullscreen(): boolean {
  if (isStandalone() || isFullscreen()) return false;
  const touch = navigator.maxTouchPoints > 0 || 'ontouchstart' in window;
  return touch || apiAvailable();
}

/**
 * 전체 화면으로 전환하고, 가로로 들고 있으면 가능하면 가로로 고정한다.
 * 지원하지 않는 브라우저(아이폰 Safari 등)는 홈 화면 설치 안내를 띄운다.
 */
export async function toggleFullscreen(host: Element | null): Promise<void> {
  if (isFullscreen()) {
    if (doc.exitFullscreen) await doc.exitFullscreen().catch(() => undefined);
    else doc.webkitExitFullscreen?.();
    return;
  }
  const el = document.documentElement as FsElement;
  try {
    if (el.requestFullscreen) await el.requestFullscreen({ navigationUI: 'hide' });
    else if (el.webkitRequestFullscreen) await el.webkitRequestFullscreen();
    else throw new Error('unsupported');
  } catch {
    showInstallGuide(host);
    return;
  }
  // 가로로 들고 있으면 예전처럼 가로로 고정한다. 세로로 들고 있으면 세로 배치 그대로 둔다.
  if (isPortrait()) return;
  try {
    const o = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> };
    await o.lock?.('landscape');
  } catch {
    /* 가로 고정을 지원하지 않으면 무시 */
  }
}

function showInstallGuide(host: Element | null): void {
  if (!host) return;
  const overlay = h('div.overlay', { onclick: (e: Event) => { if (e.target === overlay) overlay.remove(); } });
  const steps = isIOS()
    ? [tr('Safari 아래(또는 위)의 공유 버튼 ⬆️ 을 누르세요.', 'Tap the Share button ⬆️ at the bottom (or top) of Safari.'), tr('“홈 화면에 추가”를 고르세요.', 'Choose “Add to Home Screen”.'), tr('홈 화면의 랩워즈 아이콘으로 실행하면 주소창 없이 전체 화면으로 열려요.', 'Launch Lab Wars from the home screen icon to play fullscreen without the address bar.')]
    : [tr('브라우저 메뉴(⋮)를 여세요.', 'Open the browser menu (⋮).'), tr('“홈 화면에 추가” 또는 “앱 설치”를 고르세요.', 'Choose “Add to Home screen” or “Install app”.'), tr('설치한 랩워즈 아이콘으로 실행하면 전체 화면으로 열려요.', 'Launch the installed Lab Wars icon to play fullscreen.')];
  overlay.append(h('div.panel.install-guide', {},
    h('h2', {}, tr('{phone} 전체 화면으로 하려면', '{phone} To play fullscreen')),
    h('p.muted', {}, tr('이 브라우저는 웹페이지 전체 화면을 지원하지 않아요. 대신 홈 화면에 설치하면 앱처럼 전체 화면으로 열립니다.', 'This browser doesn\'t support fullscreen for web pages. Install it to your home screen and it opens fullscreen like an app.')),
    h('ol', {}, ...steps.map((s) => h('li', {}, s))),
    h('button.btn.primary', { onclick: () => overlay.remove() }, tr('알겠어요', 'Got it')),
  ));
  host.append(overlay);
}

function fsText(label: boolean): string {
  if (isFullscreen()) return label ? tr('{fullscreen} 전체 화면 끄기', '{fullscreen} Exit fullscreen') : '{fullscreen}';
  return label ? tr('{fullscreen} 전체 화면', '{fullscreen} Fullscreen') : '{fullscreen}';
}

/**
 * 어느 화면에든 붙이는 전체 화면 버튼 (타이틀·메뉴·전투·컷신).
 * 홈 화면에 설치해 실행 중이면 이미 전체 화면이라 null.
 * label이 없으면 아이콘만 보여 준다. 상태가 바뀌면 모든 버튼이 함께 바뀐다.
 */
export function fullscreenButton(host: () => Element | null, opt: { label?: boolean; cls?: string } = {}): HTMLElement | null {
  if (isStandalone()) return null;
  const btn = h(`button.icon-btn.fs-btn${opt.cls ? '.' + opt.cls : ''}`, {
    title: tr('전체 화면', 'Fullscreen'),
    onclick: (e: Event) => { e.stopPropagation(); void toggleFullscreen(host()); },
  });
  if (opt.label) btn.dataset.label = '1';
  setRich(btn, fsText(!!opt.label));
  return btn;
}

onFullscreenChange(() => {
  document.querySelectorAll<HTMLElement>('.fs-btn').forEach((b) => {
    setRich(b, fsText(b.dataset.label === '1'));
    b.title = isFullscreen() ? tr('전체 화면 끄기', 'Exit fullscreen') : tr('전체 화면', 'Fullscreen');
  });
});

/** 전체 화면 상태가 바뀔 때마다 콜백 (버튼 다시 보이기 등) */
export function onFullscreenChange(cb: () => void): () => void {
  document.addEventListener('fullscreenchange', cb);
  document.addEventListener('webkitfullscreenchange', cb);
  return () => {
    document.removeEventListener('fullscreenchange', cb);
    document.removeEventListener('webkitfullscreenchange', cb);
  };
}
