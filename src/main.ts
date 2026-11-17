import './style.css';
import { App } from './ui/app';
import { installAudioUnlock } from './audio/engine';
import { sfx } from './audio/sfx';
import { installOrientation } from './ui/orientation';
import { applyDocument } from './i18n';

// 언어(브라우저 설정 또는 저장된 선택)에 맞춰 문서 언어·제목을 정한다
applyDocument();

installOrientation();

installAudioUnlock();
// 메뉴 버튼 딸깍 소리 (전투 하단 버튼은 각자 소리가 있어 제외)
document.addEventListener('pointerdown', (e) => {
  const t = e.target as Element | null;
  if (t?.closest('button') && !t.closest('.hud-bottom')) sfx.click();
}, { capture: true });

const app = document.querySelector<HTMLDivElement>('#app')!;
const stage = document.createElement('div');
stage.className = 'stage';
app.append(stage);

void new App(stage).start();

// 배포 빌드에서만 오프라인 캐시를 켠다.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => undefined);
  });
}

// 길게 눌렀을 때 뜨는 메뉴와 두 손가락 확대를 막는다.
document.addEventListener('contextmenu', (e) => e.preventDefault());
document.addEventListener('gesturestart', (e) => e.preventDefault());
