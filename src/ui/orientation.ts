/**
 * 화면 방향. 세로로 들면 <html>에 .portrait를 붙여 CSS가 세로 배치로 바뀌고,
 * 전투·컷신 캔버스는 이 값을 보고 시야를 다시 잡는다.
 */
const query = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(orientation: portrait)') : null;

export function isPortrait(): boolean {
  return !!query?.matches;
}

function apply(): void {
  document.documentElement.classList.toggle('portrait', isPortrait());
}

/** 한 번만 호출: 지금 방향을 반영하고, 돌릴 때마다 다시 반영한다. */
export function installOrientation(): void {
  apply();
  query?.addEventListener('change', apply);
}
