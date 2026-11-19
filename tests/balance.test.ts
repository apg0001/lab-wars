import { describe, expect, it } from 'vitest';
import { botSquad, playOnce, runCampaign } from '../src/sim/bot';
import { newSave } from '../src/sim/progression';
import { STAGES, STAGE_BY_ID } from '../src/data/stages';

// 카드 추첨은 운 요소라 끄고, 기본 난이도 곡선만 잰다 (카드는 tests/cards.test.ts에서 따로 검증)
const NO_CARDS = { cards: false };

// 밸런스 회귀 테스트: 자동 플레이 봇 기준의 난이도 곡선을 지킨다.
describe('밸런스', () => {
  it('업그레이드 없이 1-1은 클리어할 수 있다', () => {
    expect(playOnce(newSave(), STAGE_BY_ID['1-1']!, 1, NO_CARDS).win).toBe(true);
  });

  it('성장 없이 2챕터 보스는 이길 수 없다', () => {
    const s = newSave();
    for (const st of STAGES.filter((x) => x.order < STAGE_BY_ID['2-10']!.order)) s.stars[st.id] = 1;
    s.loadout = botSquad(s);
    expect(playOnce(s, STAGE_BY_ID['2-10']!, 1, NO_CARDS).win).toBe(false);
  });

  // 0.27.0부터 장마다 적이 세져서 카드 없이 캠페인만 돌면 5장에서 막힌다 (막히면 다른 모드에서 키워 오는 설계).
  // 사람은 늘 카드를 쓰므로 카드를 켠 채, 앞 판을 다시 돌며 버티면 끝까지 깨지는지 본다.
  it('성장하며 진행하면 캠페인을 끝까지 깰 수 있다', () => {
    const { runs, stuckAt } = runCampaign(newSave(), 20, 7, STAGES);
    expect(stuckAt).toBeNull();
    expect(runs).toHaveLength(STAGES.length);
    // 1챕터는 튜토리얼 구간: 스테이지마다 2회 안에 깬다
    for (const r of runs.slice(0, 10)) expect(r.attempts).toBeLessThanOrEqual(2);
    // 판 길이는 시간 제한(일반 5분, 보스 6분) 안
    for (const r of runs) expect(r.seconds).toBeLessThan(STAGE_BY_ID[r.stage]!.timeLimit!);
  }, 300_000);
});
