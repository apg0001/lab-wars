import './style.css';
import { App } from './ui/app';

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
