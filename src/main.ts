import './style.css';
import { STAGE_BY_ID } from './data/stages';
import { makeLoadout, newSave } from './sim/progression';
import { mountBattle } from './ui/battle-screen';

// 전투 코어 확인용 진입점: 1-1을 바로 시작한다. (메뉴·저장은 후속 작업)
const app = document.querySelector<HTMLDivElement>('#app')!;
const stageEl = document.createElement('div');
stageEl.className = 'stage';
app.append(stageEl);

function start(): void {
  mountBattle(stageEl, {
    stage: STAGE_BY_ID['1-1']!,
    loadout: makeLoadout(newSave()),
    onEnd: (e) => ({ title: e.win ? '교수실 함락!' : '연구실이 망가졌다…', lines: [`처치 ${e.kills}`], stars: e.win ? 3 : 0 }),
    actions: () => [{ label: '다시 하기', primary: true, run: start }],
    onQuit: start,
  });
}
start();
