import type { EnemyDef, UnitDef } from '../data/types';
import { ENEMY_BY_ID } from '../data/enemies';
import { isGachaUnit } from '../data/units';
import { SIDE_STAGES, STAGES, endlessStage, type StageDef } from '../data/stages';
import { enemyStatsAt } from '../sim/enemy-stats';
import { unitPower } from '../sim/power';
import { MAX_PASSION, isStageOpen, isUnitOwned, levelCap, unitProgress, unitStats, type SaveData } from '../sim/progression';
import { fmt, h } from './dom';
import { tr } from '../i18n';

/** 숫자 표: 동료는 레벨·진화별 능력치, 적은 스테이지별 능력치. 실제 전투와 같은 식(unitStats·enemyStatsAt)으로 계산한다. */

const num = (n: number): string => (n >= 100 ? fmt(Math.round(n)) : String(Math.round(n * 10) / 10));

function table(head: string[], rows: { cells: (string | number)[]; cls?: string }[]): HTMLElement {
  return h('div.stat-table-wrap', {},
    h('table.stat-table', {},
      h('thead', {}, h('tr', {}, ...head.map((x) => h('th', {}, x)))),
      h('tbody', {}, ...rows.map((r) => h(`tr${r.cls ?? ''}`, {}, ...r.cells.map((c) => h('td', {}, typeof c === 'number' ? num(c) : c))))),
    ));
}

/** 동료: 1단계 Lv1~5 → 진화 → Lv5~10 → 진화 → Lv10~15 (뽑기 장비는 열정으로 Lv20까지) */
export function allyLevelTable(save: SaveData, u: UnitDef): HTMLElement {
  const me = unitProgress(save, u.id);
  const owned = isUnitOwned(save, u);
  const rows: { cells: (string | number)[]; cls?: string }[] = [];
  for (let tier = 1; tier <= 3; tier++) {
    const from = tier === 1 ? 1 : levelCap(tier - 1);
    const to = levelCap(tier) + (tier === 3 && isGachaUnit(u) ? MAX_PASSION : 0);
    for (let level = from; level <= to; level++) {
      const st = unitStats(u, { level, tier });
      const mine = owned && me.tier === tier && me.level === level;
      const passion = tier === 3 && level > levelCap(3);
      rows.push({
        cls: `${mine ? '.mine' : ''}${level === from && tier > 1 ? '.evolve' : ''}`,
        cells: [`${u.names[tier - 1]}${passion ? tr(' (열정)', ' (passion)') : ''}`, level, st.hp, st.atk, st.atk / st.interval, Math.round(unitPower(st, u.count ?? 1))],
      });
    }
  }
  return h('div.stat-block', {},
    h('p.muted.stat-note', {}, tr('레벨 +1마다 체력·공격력 ×1.08, 진화마다 ×1.5. 진하게 칠한 줄이 지금 내 동료예요.', 'Each level: HP & ATK ×1.08. Each evolution: ×1.5. The highlighted row is yours now.')),
    table([tr('단계', 'Stage'), 'Lv', tr('{heart} 체력', '{heart} HP'), tr('{sword} 공격력', '{sword} ATK'), tr('초당 피해', 'DPS'), tr('{bolt} 전투력', '{bolt} Power')], rows),
  );
}

/** 이 적이 나오는 스테이지 (출현 후보·보스·보스 소환) */
function stagesWith(e: EnemyDef): { stage: StageDef; how: 'pool' | 'boss' | 'summon' }[] {
  const out: { stage: StageDef; how: 'pool' | 'boss' | 'summon' }[] = [];
  // 무한 모드는 몇 판만 골라 보여 준다
  const endless = [1, 5, 10, 15, 20, 30, 40, 50, 75, 100].map((n) => endlessStage(n));
  for (const s of [...STAGES, ...SIDE_STAGES, ...endless]) {
    if (s.boss === e.id) out.push({ stage: s, how: 'boss' });
    else if (s.pool.some((p) => p.id === e.id)) out.push({ stage: s, how: 'pool' });
    else if (s.boss && ENEMY_BY_ID[s.boss]?.boss?.summon?.id === e.id) out.push({ stage: s, how: 'summon' });
  }
  return out;
}

/** 적: 등장 스테이지마다 실제 체력·공격력 (아직 못 연 스테이지는 이름을 가린다) */
export function enemyStageTable(save: SaveData, e: EnemyDef): HTMLElement {
  const list = stagesWith(e);
  if (!list.length) return h('p.muted.stat-note', {}, tr('일반 스테이지에는 나오지 않아요.', 'Doesn\'t appear in regular stages.'));
  const rows = list.map(({ stage, how }) => {
    const st = enemyStatsAt(e, stage);
    const open = isStageOpen(save, stage);
    return {
      cls: open ? '' : '.locked',
      cells: [stage.kind === 'endless' ? tr(`무한 ${stage.index}판`, `Endless ${stage.index}`) : stage.id, open || stage.kind === 'endless' ? (stage.kind === 'endless' ? '' : stage.name) : '???', how === 'boss' ? tr('보스', 'Boss') : how === 'summon' ? tr('소환', 'Summoned') : '', st.hp, st.atk],
    };
  });
  return h('div.stat-block', {},
    h('p.muted.stat-note', {}, tr('스테이지마다 능력치 배율이 달라요. 외전·전공의 특수 규칙 효과는 빠져 있어요.', 'Stats scale per stage. Special Side Story / course rules aren\'t included.')),
    table([tr('스테이지', 'Stage'), '', '', tr('{heart} 체력', '{heart} HP'), tr('{sword} 공격력', '{sword} ATK')], rows),
  );
}

/** 스테이지 정보의 적 초상 아래: 이 판에서의 체력·공격력 */
export const enemyStatLine = (id: string, stage: StageDef): HTMLElement | null => {
  const def = ENEMY_BY_ID[id];
  if (!def) return null;
  const st = enemyStatsAt(def, stage);
  return h('small.enemy-stat', {}, `{heart}${num(st.hp)} {sword}${num(st.atk)}`);
};
