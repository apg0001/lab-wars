import { it } from 'vitest';
import { runCampaign } from '../src/sim/bot';
import { newSave } from '../src/sim/progression';
import { COURSE_STAGE_BY_COURSE, STAGES } from '../src/data/stages';
import { ICE_COURSES } from '../src/data/major';

// MAJOR_REPORT=1 npx vitest run tests/major-balance.test.ts 로 실행하는 수동 리포트
// 캠페인을 학년에 맞는 지점까지 깬 봇이 그 학년 과목을 차례로 듣는다 (1학년 ← 2장까지, 2학년 ← 4장, 3학년 ← 6장, 4학년 ← 7장)
it.runIf(import.meta.env.MAJOR_REPORT)('전공 모드 밸런스 리포트', () => {
  const upTo = [2, 4, 6, 7];
  for (const seed of [7, 2026]) {
    const save = newSave();
    let done = 0;
    for (const [i, ch] of upTo.entries()) {
      const camp = STAGES.filter((s) => s.chapter > done && s.chapter <= ch);
      done = ch;
      const c = runCampaign(save, 15, seed + ch, camp);
      if (c.stuckAt) console.log(`seed ${seed} 캠페인 막힘 ${c.stuckAt}`);
      const courses = ICE_COURSES.filter((co) => co.year === i + 1).map((co) => COURSE_STAGE_BY_COURSE[co.id]!);
      const r = runCampaign(save, 8, seed * 3 + i, courses);
      console.log(`seed ${seed} ${i + 1}학년 막힘=${r.stuckAt ?? '-'}  ` + r.runs.map((x) => `${x.stage.slice(2)}:${x.attempts}회/${x.stars}★/${x.seconds}s`).join('  '));
    }
  }
}, 1_800_000);
