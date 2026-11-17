import { describe, expect, it } from 'vitest';
import { playOnce, runCampaign } from '../src/sim/bot';
import { newSave } from '../src/sim/progression';
import { STAGES, STAGE_BY_ID } from '../src/data/stages';

// 밸런스 회귀 테스트: 자동 플레이 봇 기준의 난이도 곡선을 지킨다.
describe('밸런스', () => {
  it('업그레이드 없이 1-1은 클리어할 수 있다', () => {
    expect(playOnce(newSave(), STAGE_BY_ID['1-1']!, 1).win).toBe(true);
  });

  it('성장 없이 2챕터 보스는 이길 수 없다', () => {
    const s = newSave();
    for (const st of STAGES.filter((x) => x.order < STAGE_BY_ID['2-10']!.order)) s.stars[st.id] = 1;
    expect(playOnce(s, STAGE_BY_ID['2-10']!, 1).win).toBe(false);
  });

  it('성장하며 진행하면 캠페인을 끝까지 깰 수 있다', () => {
    const { runs, stuckAt } = runCampaign(newSave(), 15, 7);
    expect(stuckAt).toBeNull();
    expect(runs).toHaveLength(STAGES.length);
    // 1챕터는 튜토리얼 구간: 스테이지마다 2회 안에 깬다
    for (const r of runs.slice(0, 10)) expect(r.attempts).toBeLessThanOrEqual(2);
    // 판 길이는 대체로 1~5분
    for (const r of runs) expect(r.seconds).toBeLessThan(300);
  }, 300_000);
});
