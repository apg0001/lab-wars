import { h, setRich } from './dom';
import { tr } from '../i18n';

/** 말풍선이 가리킬 전투 화면 요소 */
export interface CoachTargets {
  goal: HTMLElement;
  units: HTMLElement;
  caffeine: HTMLElement;
  skills: HTMLElement;
  camera: HTMLElement;
}

interface Step {
  target: keyof CoachTargets;
  text: string;
}

/** 첫 전투 안내 순서: 목표 → 소환 → 카페인·커피머신 → 스킬 → 시점 이동 */
export function coachSteps(hasSkills: boolean): Step[] {
  return [
    { target: 'goal', text: tr('{prof} 오른쪽 교수실을 무너뜨리면 승리! {lab} 왼쪽 연구실이 무너지면 패배예요.', '{prof} Wreck the Prof\'s Office on the right to win! {lab} If your Lab on the left falls, you lose.') },
    { target: 'units', text: tr('{student} 동료 버튼(키보드 1~9)을 누르면 {coffee} 카페인을 써서 출동해요.', '{student} Tap a labmate (keys 1–9) to spend {coffee} Caffeine and send them out.') },
    { target: 'caffeine', text: tr('{coffee} 카페인은 저절로 차요. {coffeeMachine} 커피머신(Q)을 올리면 더 많이, 더 빨리 차요.', '{coffee} Caffeine refills on its own. Upgrade the {coffeeMachine} Coffee Machine (Q) to hold more and refill faster.') },
    {
      target: 'skills',
      text: hasSkills
        ? tr('{brain} 멘탈이 차면 스킬(W/E/R/T)을 쓸 수 있어요. 급할 때 아껴 두세요!', '{brain} When Mental fills up, use skills (W/E/R/T). Save them for emergencies!')
        : tr('{brain} 멘탈이 차면 스킬을 쓸 수 있어요. 스킬은 스테이지를 깨면 열려요.', '{brain} When Mental fills up you can use skills. Skills unlock as you clear stages.'),
    },
    { target: 'camera', text: tr('{map} 전장을 끌거나 미니맵을 눌러 시점을 옮겨요 (A/D 키도 돼요). 그럼 출동!', '{map} Drag the field or tap the minimap to move the camera (A/D keys too). Now, go!') },
  ];
}

/**
 * 첫 전투 튜토리얼: 화면을 살짝 어둡게 하고 요소를 동그라미 친 뒤 말풍선으로 설명한다.
 * 전투를 멈추는 건 부르는 쪽 몫이고, 끝내거나 건너뛰면 onDone.
 */
export function runTutorial(screen: HTMLElement, targets: CoachTargets, hasSkills: boolean, onDone: () => void): void {
  const steps = coachSteps(hasSkills);
  let i = 0;
  const ring = h('div.coach-ring');
  const text = h('p.coach-text');
  const count = h('span.coach-count');
  const nextBtn = h('button.btn.small.primary', { onclick: () => next() });
  const bubble = h('div.coach-bubble', {}, text,
    h('div.coach-btns', {}, count, h('button.btn.small', { onclick: () => finish() }, tr('건너뛰기', 'Skip')), nextBtn));
  const layer = h('div.coach', {}, ring, bubble);
  screen.append(layer);

  /** 대상 위치에 동그라미를 맞추고, 말풍선은 화면의 반대쪽 절반에 띄운다 */
  const place = (): void => {
    if (!layer.isConnected) return;
    const sr = screen.getBoundingClientRect();
    const r = targets[steps[i]!.target].getBoundingClientRect();
    const pad = 6;
    Object.assign(ring.style, { left: `${r.left - sr.left - pad}px`, top: `${r.top - sr.top - pad}px`, width: `${r.width + pad * 2}px`, height: `${r.height + pad * 2}px` });
    const below = r.top + r.height / 2 < sr.top + sr.height / 2;
    bubble.style.top = below ? `${r.bottom - sr.top + pad * 2}px` : '';
    bubble.style.bottom = below ? '' : `${sr.bottom - r.top + pad * 2}px`;
    const w = bubble.offsetWidth;
    const cx = r.left - sr.left + r.width / 2;
    bubble.style.left = `${Math.max(8, Math.min(sr.width - w - 8, cx - w / 2))}px`;
  };
  const show = (): void => {
    const last = i === steps.length - 1;
    setRich(text, steps[i]!.text);
    count.textContent = `${i + 1}/${steps.length}`;
    nextBtn.textContent = last ? tr('시작!', 'Start!') : tr('다음', 'Next');
    requestAnimationFrame(place);
    // 세로 화면은 버튼 격자 배치가 한 박자 늦게 끝나서 한 번 더 맞춘다
    window.setTimeout(place, 250);
  };
  const next = (): void => {
    if (i >= steps.length - 1) return finish();
    i++;
    show();
  };
  // 보는 동안 단축키(소환·일시정지)가 전투로 새지 않게 먼저 가로챈다
  const onKey = (e: KeyboardEvent): void => {
    // 전투 화면이 먼저 사라졌으면 정리만 한다
    if (!layer.isConnected) return unlisten();
    e.stopImmediatePropagation();
    e.preventDefault();
    if (e.key === 'Escape') finish();
    else if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowRight') next();
  };
  const unlisten = (): void => {
    window.removeEventListener('keydown', onKey, true);
    window.removeEventListener('resize', place);
  };
  const finish = (): void => {
    layer.remove();
    unlisten();
    onDone();
  };
  window.addEventListener('keydown', onKey, true);
  window.addEventListener('resize', place);
  show();
}
