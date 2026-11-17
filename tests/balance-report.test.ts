import { it } from 'vitest';
import { runCampaign } from '../src/sim/bot';
import { newSave } from '../src/sim/progression';
import { SIDE_CHAPTERS, SIDE_STAGES } from '../src/data/stages';

// BALANCE_REPORT=1 npx vitest run tests/balance-report.test.ts 로 실행하는 수동 리포트
it.runIf(import.meta.env.BALANCE_REPORT)('캠페인 밸런스 리포트', () => {
  for (const seed of [7, 99, 2026]) {
    const save = newSave();
    const { runs, stuckAt } = runCampaign(save, Number(process.env.BALANCE_TRIES ?? 12), seed);
    console.log(`seed ${seed} stuck=${stuckAt} money=${save.money}`);
    console.log(runs.map((r) => `${r.stage}:${r.attempts}회/${r.stars}★/${r.seconds}s`).join('  '));
    console.log(JSON.stringify(save.units), JSON.stringify(save.facilities));
    for (const sc of SIDE_CHAPTERS) {
      const side = runCampaign(save, Number(process.env.BALANCE_TRIES ?? 12), seed + sc.id, SIDE_STAGES.filter((x) => x.side === sc.id));
      console.log(`side ${sc.id} stuck=${side.stuckAt} ` + side.runs.map((r) => `${r.stage}:${r.attempts}회/${r.stars}★/${r.seconds}s`).join('  '));
    }
  }
}, 600_000);
