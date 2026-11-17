/**
 * 화면 방향. 세로로 들면 <html>에 .portrait를 붙여 CSS가 세로 배치로 바뀌고,
 * 전투·컷신 캔버스는 이 값을 보고 시야를 다시 잡는다.
 */
const query = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(orientation: portrait)') : null;

export function isPortrait(): boolean {
  return !!query?.matches;
}

/** 세로 화면 위아래(상태 표시줄·홈 바·사파리 주소창 영역) 색: 게임 배경과 같은 밝은 색 */
export const PORTRAIT_EDGE = '#fdf3ec';
const LANDSCAPE_EDGE = '#1d1a22';

function apply(): void {
  const portrait = isPortrait();
  document.documentElement.classList.toggle('portrait', portrait);
  // 아이폰 사파리는 theme-color로 위아래 막대를 칠한다. 가로(검은 여백)와 세로(밝은 화면)를 맞춰 준다.
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (meta) meta.content = portrait ? PORTRAIT_EDGE : LANDSCAPE_EDGE;
}

/** 한 번만 호출: 지금 방향을 반영하고, 돌릴 때마다 다시 반영한다. */
export function installOrientation(): void {
  apply();
  query?.addEventListener('change', apply);
}
