/**
 * 전투 화면 그리기 벤치마크 (개발용, 빌드에 들어가지 않음).
 * `npm run dev` 후 /bench/render.html 을 열거나, 헤드리스 크롬으로 열어 콘솔 결과를 본다.
 * 무한 모드 40판 + 장비 전부 편성으로 필드를 가득 채운 뒤, 같은 장면을 여러 프레임 그려 평균을 잰다.
 */
import { Battle } from '../src/sim/battle';
import { endlessStage } from '../src/data/stages';
import { GACHA_UNITS } from '../src/data/units';
import { makeLoadout, newSave } from '../src/sim/progression';
import { drawBattle } from '../src/render/scene';
import { Juice } from '../src/render/juice';

const canvas = document.getElementById('c') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
const out = document.getElementById('out')!;

function setup(): Battle {
  const s = newSave();
  for (const u of GACHA_UNITS) s.gear.owned[u.id] = 1;
  s.loadout = ['grunt', ...GACHA_UNITS.slice(0, 8).map((u) => u.id)];
  const b = new Battle(endlessStage(40), makeLoadout(s), 7, { cards: false });
  b.ally.hp = b.ally.maxHp = 1e12;
  b.enemy.hp = b.enemy.maxHp = 1e12;
  for (let i = 0; i < 60 * 25; i++) {
    b.caffeine = b.caffeineMax;
    if (i % 20 === 0) for (const d of b.loadout.deck) b.summon(d.def.id);
    b.step(1 / 60);
  }
  return b;
}

function run(label: string, b: Battle, juice: Juice, camX: number, frames: number, flush: boolean): string {
  const k = canvas.width / 960;
  let t = 1000;
  const times: number[] = [];
  for (let i = 0; i < frames; i++) {
    b.caffeine = b.caffeineMax;
    if (i % 20 === 0) for (const d of b.loadout.deck) b.summon(d.def.id);
    b.step(1 / 60);
    b.drainEvents().forEach((e) => juice.onEvent(e));
    juice.update(1 / 60);
    t += 1 / 60;
    const t0 = performance.now();
    ctx.setTransform(k, 0, 0, k, 0, 0);
    drawBattle(ctx, b, camX, t, juice);
    if (flush) ctx.getImageData(0, 0, 1, 1);
    times.push(performance.now() - t0);
  }
  times.sort((a, z) => a - z);
  const avg = times.reduce((a, z) => a + z, 0) / times.length;
  const p95 = times[Math.floor(times.length * 0.95)]!;
  const alive = b.fighters.filter((f) => !f.dead).length;
  return `${label}: avg ${avg.toFixed(2)}ms p95 ${p95.toFixed(2)}ms (fighters ${alive}, fx ${b.fx.length}, proj ${b.projectiles.length})`;
}

const b = setup();
const juice = new Juice();
const mid = Math.max(0, (b.fighters.reduce((a, f) => a + f.x, 0) / Math.max(1, b.fighters.length)) - 480);
// 데움 (JIT·캐시)
const q = new URLSearchParams(location.search);
if (q.get('shot')) {
  // 화면 비교용: 같은 장면을 한 장만 그리고 끝낸다
  run('shot', b, juice, mid, 3, true);
  out.textContent = 'shot';
  throw new Error('shot done');
}
const N = Number(q.get('frames') ?? 240);
run('warmup', b, juice, mid, Math.min(60, N / 4), true);
// 시뮬레이션만: 3배속(프레임당 3스텝)
const simMs = ((): string => {
  const t0 = performance.now();
  for (let i = 0; i < N; i++) {
    b.caffeine = b.caffeineMax;
    if (i % 20 === 0) for (const d of b.loadout.deck) b.summon(d.def.id);
    for (let k = 0; k < 3; k++) b.step(1 / 60);
  }
  return `sim x3: avg ${((performance.now() - t0) / N).toFixed(2)}ms/frame`;
})();
const lines = [
  run('js-only', b, juice, mid, N, false),
  run('flushed', b, juice, mid, N, true),
  simMs,
];
out.textContent = lines.join('\n');
console.log('BENCH ' + lines.join(' | '));
