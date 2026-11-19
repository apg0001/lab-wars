import { describe, expect, it } from 'vitest';
import { writeFileSync } from 'node:fs';
import { botShop, botSquad, playOnce } from '../src/sim/bot';
import { newSave, unitProgress, type SaveData } from '../src/sim/progression';
import { COURSE_STAGE_BY_COURSE, SIDE_CHAPTERS, SIDE_STAGES, STAGES, STAGE_BY_ID, endlessStage, type StageDef } from '../src/data/stages';
import { ICE_COURSES } from '../src/data/major';
import { STAGE_POWER } from '../src/data/stage-power';
import { UNIT_BY_ID } from '../src/data/units';
import { endlessPowerFit, loadoutPower, powerVerdict, recommendedPower, roundPower, squadPower, stageHints, unitPower } from '../src/sim/power';
import { makeLoadout } from '../src/sim/progression';

/** 봇이 플레이어가 밟을 순서대로 진행: 캠페인 장마다, 학년 과목은 해당 장 뒤에(1학년 ← 2장 … 4학년 ← 7장), 외전은 엔딩 뒤 */
function progressionOrder(): StageDef[] {
  const yearAfter: Record<number, number> = { 2: 1, 4: 2, 6: 3, 7: 4 };
  const out: StageDef[] = [];
  for (let ch = 1; ch <= 7; ch++) {
    out.push(...STAGES.filter((s) => s.chapter === ch));
    const year = yearAfter[ch];
    if (year) out.push(...ICE_COURSES.filter((c) => c.year === year).map((c) => COURSE_STAGE_BY_COURSE[c.id]!));
  }
  for (const sc of SIDE_CHAPTERS) out.push(...SIDE_STAGES.filter((s) => s.side === sc.id));
  return out;
}

/** 한 시드로 끝까지 진행하며 스테이지를 깬 판 직전의 전투력을 잰다. 너무 오래 막히면 깬 셈 치고 넘어간다. */
function measure(seed: number): Record<string, number> {
  const save: SaveData = newSave();
  const out: Record<string, number> = {};
  const order = progressionOrder();
  let s = seed;
  for (const [i, stage] of order.entries()) {
    for (let attempt = 1; ; attempt++) {
      botShop(save);
      save.loadout = botSquad(save);
      const power = squadPower(save);
      const r = playOnce(save, stage, s++);
      if (r.win || attempt >= 25) {
        if (!r.win) {
          save.stars[stage.id] = 1;
          console.log(`seed ${seed} ${stage.id} 막힘 → 넘어감`);
        }
        out[stage.id] = power;
        break;
      }
      // 지면 앞 판을 한 번 더 돌아 연구비를 모은다
      const prev = order[i - 1];
      if (prev) playOnce(save, prev, s++);
    }
  }
  return out;
}

const median = (xs: number[]): number => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)]!;

// STAGE_POWER_GEN=1 npx vitest run tests/stage-power.test.ts 로 src/data/stage-power.ts를 다시 만든다 (밸런스를 바꾼 뒤)
it.runIf(import.meta.env.STAGE_POWER_GEN)('권장 전투력 표 생성', () => {
  const runs = [7, 99, 2026].map(measure);
  const ids = progressionOrder().map((s) => s.id);
  const lines = ids.map((id) => `  '${id}': ${roundPower(median(runs.map((r) => r[id]!)))},`);
  writeFileSync(new URL('../src/data/stage-power.ts', import.meta.url),
    `// 자동 생성: STAGE_POWER_GEN=1 npx vitest run tests/stage-power.test.ts\n`
    + `// 봇이 캠페인 → 학년별 전공 → 외전 순서로 진행하며 스테이지를 깬 시점의 전투력 (시드 3개 중앙값)\n`
    + `export const STAGE_POWER: Record<string, number> = {\n${lines.join('\n')}\n};\n`);
  console.log(lines.join('\n'));
}, 3_000_000);

describe('전투력', () => {
  it('레벨·진화가 오르면 유닛 전투력도 오른다', () => {
    const u = UNIT_BY_ID['grunt']!;
    const save = newSave();
    const base = unitPower(makeLoadout(save).deck.find((d) => d.def.id === u.id)?.stats ?? u);
    const p = unitProgress(save, u.id);
    save.units[u.id] = { ...p, level: p.level + 5 };
    const up = unitPower(makeLoadout(save).deck.find((d) => d.def.id === u.id)!.stats);
    expect(up).toBeGreaterThan(base);
  });

  it('시설 강화도 전투력을 올린다', () => {
    const save = newSave();
    const before = squadPower(save);
    save.facilities.coffee = 5;
    save.facilities.remodel = 3;
    expect(squadPower(save)).toBeGreaterThan(before);
  });

  it('편성이 비어 있지 않으면 전투력은 양수', () => {
    expect(loadoutPower(makeLoadout(newSave()))).toBeGreaterThan(0);
  });

  it('판정: 여유 · 적정 · 도전', () => {
    expect(powerVerdict(1200, 1000)).toBe('easy');
    expect(powerVerdict(1000, 1000)).toBe('fair');
    expect(powerVerdict(700, 1000)).toBe('hard');
  });

  it('권장 전투력 표가 캠페인·외전·전공 스테이지를 모두 덮는다', () => {
    for (const s of progressionOrder()) expect(STAGE_POWER[s.id], s.id).toBeGreaterThan(0);
    expect(recommendedPower(STAGE_BY_ID['1-1']!)).toBe(STAGE_POWER['1-1']);
  });

  it('권장 전투력은 장이 갈수록 대체로 오른다', () => {
    const chapterMax = (ch: number): number => Math.max(...STAGES.filter((s) => s.chapter === ch).map((s) => STAGE_POWER[s.id]!));
    for (let ch = 2; ch <= 7; ch++) expect(chapterMax(ch)).toBeGreaterThanOrEqual(chapterMax(ch - 1));
  });

  it('무한 모드 권장 전투력은 추정값: 캠페인 끝 근처에서 시작해 판마다 오른다', () => {
    expect(endlessPowerFit().b).toBeGreaterThanOrEqual(1);
    const rec = (n: number): number => recommendedPower(endlessStage(n))!;
    expect(rec(1)).toBeGreaterThan(STAGE_POWER['7-1']!);
    for (const n of [1, 5, 10, 20, 30, 50]) expect(rec(n + 5)).toBeGreaterThanOrEqual(rec(n));
    expect(rec(50)).toBeGreaterThan(rec(1) * 2);
  });

  it('상성 힌트는 알려진 값만 낸다', () => {
    for (const s of progressionOrder()) for (const h of stageHints(s)) expect(['air', 'ranged', 'tank', 'swarm']).toContain(h);
  });

  it('roundPower는 유효 숫자 2자리', () => {
    expect(roundPower(12345)).toBe(12000);
    expect(roundPower(987)).toBe(990);
    expect(roundPower(42)).toBe(42);
  });
});
