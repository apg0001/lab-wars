import type { StageDef } from '../data/stages';
import type { SaveData } from '../sim/progression';
import { powerVerdict, recommendedPower, squadPower, stageHints, type PowerVerdict, type StageHint } from '../sim/power';
import { fmt, h } from './dom';
import { tr } from '../i18n';

/** 전투력 표시: 편성·연구실 화면의 배지, 스테이지·과목 정보의 권장 전투력 비교 */

const VERDICT: Record<PowerVerdict, () => string> = {
  easy: () => tr('여유', 'Comfortable'),
  fair: () => tr('적정', 'Fair'),
  hard: () => tr('도전', 'Tough'),
};

const VERDICT_TIP: Record<PowerVerdict, () => string> = {
  easy: () => tr('충분히 강해요.', 'You\'re well prepared.'),
  fair: () => tr('해볼 만해요. 지면 편성을 바꿔 보세요.', 'Doable. If you lose, try a different squad.'),
  hard: () => tr('지면 연구실 강화를 하고 와도 좋아요.', 'If you lose, upgrading the Lab first may help.'),
};

const HINT: Record<StageHint, () => string> = {
  air: () => tr('{cloud} 공중 적 · 원거리 동료 필요', '{cloud} Flyers · bring ranged labmates'),
  ranged: () => tr('{target} 원거리 적 · 튼튼한 앞줄', '{target} Ranged foes · bring a sturdy front line'),
  tank: () => tr('{guard} 맷집 센 적 · 화력 집중', '{guard} Tanky foes · stack damage'),
  swarm: () => tr('{alarm} 물량 공세 · 범위 공격', '{alarm} Swarms · bring splash damage'),
};

/** "{bolt} 전투력 12,000" 배지 */
export const powerBadge = (save: SaveData): HTMLElement =>
  h('span.power-badge', { title: tr('편성한 동료의 능력치와 연구실 시설로 계산해요.', 'Based on your squad\'s stats and Lab facilities.') }, tr(`{bolt} 전투력 ${fmt(squadPower(save))}`, `{bolt} Power ${fmt(squadPower(save))}`));

/** 스테이지 정보용: 내 전투력 대 권장 전투력 + 판정 + 상성 힌트 */
export function powerCompare(save: SaveData, stage: StageDef): HTMLElement {
  const mine = squadPower(save);
  const rec = recommendedPower(stage);
  const hints = stageHints(stage);
  const verdict = rec ? powerVerdict(mine, rec) : null;
  return h('div.power-compare', {},
    h('div.power-line', {},
      h('span', {}, tr(`{bolt} 내 전투력 `, `{bolt} Your power `), h('b', {}, fmt(mine))),
      rec ? h('span.muted', {}, stage.kind === 'endless' ? tr(` / 권장 ${fmt(rec)} (추정)`, ` / recommended ${fmt(rec)} (est.)`) : tr(` / 권장 ${fmt(rec)}`, ` / recommended ${fmt(rec)}`)) : null,
      verdict ? h(`span.power-verdict.v-${verdict}`, { title: VERDICT_TIP[verdict]() }, VERDICT[verdict]()) : null,
    ),
    verdict === 'hard' ? h('p.muted.power-tip', {}, VERDICT_TIP.hard()) : null,
    hints.length ? h('div.power-hints', {}, ...hints.map((x) => h('span.power-hint', {}, HINT[x]()))) : null,
  );
}
