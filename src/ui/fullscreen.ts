import { h } from './dom';

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
 * 전체 화면으로 전환하고 가능하면 가로로 고정한다.
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
    ? ['Safari 아래(또는 위)의 공유 버튼 ⬆️ 을 누르세요.', '“홈 화면에 추가”를 고르세요.', '홈 화면의 랩워즈 아이콘으로 실행하면 주소창 없이 전체 화면으로 열려요.']
    : ['브라우저 메뉴(⋮)를 여세요.', '“홈 화면에 추가” 또는 “앱 설치”를 고르세요.', '설치한 랩워즈 아이콘으로 실행하면 전체 화면으로 열려요.'];
  overlay.append(h('div.panel.install-guide', {},
    h('h2', {}, '📱 전체 화면으로 하려면'),
    h('p.muted', {}, '이 브라우저는 웹페이지 전체 화면을 지원하지 않아요. 대신 홈 화면에 설치하면 앱처럼 전체 화면으로 열립니다.'),
    h('ol', {}, ...steps.map((s) => h('li', {}, s))),
    h('button.btn.primary', { onclick: () => overlay.remove() }, '알겠어요'),
  ));
  host.append(overlay);
}

/** 전체 화면 상태가 바뀔 때마다 콜백 (버튼 다시 보이기 등) */
export function onFullscreenChange(cb: () => void): () => void {
  document.addEventListener('fullscreenchange', cb);
  document.addEventListener('webkitfullscreenchange', cb);
  return () => {
    document.removeEventListener('fullscreenchange', cb);
    document.removeEventListener('webkitfullscreenchange', cb);
  };
}
