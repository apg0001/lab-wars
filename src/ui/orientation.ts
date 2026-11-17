/**
 * 화면 방향. 세로로 들면 <html>에 .portrait를 붙여 CSS가 세로 배치로 바뀌고,
 * 전투·컷신 캔버스는 이 값을 보고 시야를 다시 잡는다.
 */
/**
 * 세로 배치를 쓸 화면: 세로로 든 화면, 그리고 가로라도 16:9보다 꽤 덜 넓은 터치 기기
 * (아이패드·갤럭시 탭 가로 4:3~16:10, 폴드 안쪽 화면). 이런 화면은 가로 배치를 쓰면 위아래가 비므로
 * 위 전장·아래 큰 버튼의 세로 배치로 꽉 채운다. 마우스를 쓰는 데스크톱은 그대로 가로 배치.
 */
const query = typeof window !== 'undefined' && window.matchMedia
  ? window.matchMedia('(orientation: portrait), (pointer: coarse) and (max-aspect-ratio: 33/20)')
  : null;
/** 실제로 세로로 들었는지 (아이폰 홈 화면 앱 높이 보정용) */
const upright = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(orientation: portrait)') : null;

export function isPortrait(): boolean {
  return !!query?.matches;
}

/** 세로 화면 위아래(상태 표시줄·홈 바·사파리 주소창 영역) 색: 게임 배경과 같은 밝은 색 */
export const PORTRAIT_EDGE = '#fdf3ec';
const LANDSCAPE_EDGE = '#1d1a22';

const isIPhone = (): boolean => /iPhone|iPod/.test(navigator.userAgent);
const isStandalone = (): boolean => window.matchMedia('(display-mode: standalone), (display-mode: fullscreen)').matches
  || (navigator as Navigator & { standalone?: boolean }).standalone === true;

/**
 * 아이폰 홈 화면 앱(세로)은 고정 영역 높이를 '화면 − 상태 표시줄'로 잡으면서 화면 맨 위부터 그린다.
 * 그대로 두면 아래에 상태 표시줄 높이만큼 빈 띠가 생기므로, 실제 화면 높이를 재서 --app-h로 넘긴다.
 */
function fitHeight(): void {
  const root = document.documentElement;
  if (upright?.matches && isIPhone() && isStandalone()) {
    // 아이폰의 screen 크기는 늘 세로 기준이다
    const full = Math.max(window.innerHeight, window.screen.height, window.screen.width);
    root.style.setProperty('--app-h', `${full}px`);
  } else {
    root.style.removeProperty('--app-h');
  }
}

function apply(): void {
  const portrait = isPortrait();
  document.documentElement.classList.toggle('portrait', portrait);
  // 세로 배치이지만 실제로는 가로로 든 태블릿·폴더블
  document.documentElement.classList.toggle('wide', portrait && !upright?.matches);
  fitHeight();
  // 아이폰 사파리는 theme-color로 위아래 막대를 칠한다. 가로(검은 여백)와 세로(밝은 화면)를 맞춰 준다.
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (meta) meta.content = portrait ? PORTRAIT_EDGE : LANDSCAPE_EDGE;
}

/** 한 번만 호출: 지금 방향을 반영하고, 돌릴 때마다 다시 반영한다. */
export function installOrientation(): void {
  apply();
  query?.addEventListener('change', apply);
  upright?.addEventListener('change', apply);
  window.addEventListener('resize', fitHeight);
}
