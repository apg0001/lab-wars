import type { UnitDef } from '../data/types';
import { GACHA_UNITS, rarityLabel, rarityOf } from '../data/units';
import { MAX_PASSION, passionOf, isUnitOwned, unitProgress, type SaveData } from '../sim/progression';
import {
  DUP_REFUND, GACHA_RARITIES, SPARK, TICKET10_PRICE, TICKET_PRICE, UNIT_RATES, buyTickets, canClaimSpark, claimSpark, drawUnits,
  unitsOfRarity, type UnitDrawResult,
} from '../sim/unit-gacha';
import { sfx } from '../audio/sfx';
import { h, fmt } from './dom';
import { portrait } from './icons';
import { tr } from '../i18n';

/**
 * "장비 지원" 화면: 연구비로 뽑기권을 사서 ICT·전자공학 장비(뽑기 유닛)를 받는다.
 * 결과는 택배 상자를 뜯는 연출로 보여 준다 (심사 결과 메일과 구분되게).
 */
export interface GearCtx {
  save: SaveData;
  persist: () => void;
  redraw: () => void;
  host: () => Element | null;
}

const pic = (u: UnitDef, owned = true): string => portrait(u.look, 1, u.id, 1, undefined, !owned);

/** 열정 눈금 (0~MAX_PASSION) */
export function passionPips(n: number): HTMLElement {
  return h('span.passion', { title: tr(`열정 ${n}/${MAX_PASSION}`, `Passion ${n}/${MAX_PASSION}`) },
    ...Array.from({ length: MAX_PASSION }, (_, i) => h(`i${i < n ? '.on' : ''}`)));
}

function resultLine(r: UnitDrawResult): string {
  if (r.fresh) return tr('{party} 새 장비 입고! 편성에 빈칸이 있으면 바로 들어가요.', '{party} New gear arrived! It joins your squad if there is a free slot.');
  if (r.refund) return tr(`열정이 가득해서 연구비 {coin}${r.refund}으로 돌려받았어요.`, `Passion is maxed, so you got {coin}${r.refund} funding back.`);
  return tr(`{fire} 열정 +1 (${r.passion}/${MAX_PASSION}) · 최종 단계 레벨 상한 +1`, `{fire} Passion +1 (${r.passion}/${MAX_PASSION}) · final-tier level cap +1`);
}

let waybill = 2026;

/** 택배 상자 개봉 연출 */
function showShipment(ctx: GearCtx, results: UnitDrawResult[], again: (() => void) | null): void {
  const overlay = h('div.overlay.ship-overlay');
  const close = (): void => {
    overlay.remove();
    ctx.redraw();
  };
  const best = GACHA_RARITIES.find((r) => results.some((x) => x.rarity === r))!;
  waybill += results.length;
  const head = h('div.ship-head', {},
    h('b', {}, tr('{crate} 장비 지원 도착', '{crate} Equipment Grant delivered')),
    h('small', {}, tr(`송장 LW-${waybill} · 받는 곳: 연구실 · 취급 주의`, `Waybill LW-${waybill} · To: The Lab · Handle with care`)),
  );
  let body: HTMLElement;
  if (results.length === 1) {
    const r = results[0]!;
    body = h(`div.ship-single.u-${r.rarity}`, {},
      h('div.crate-stage', {},
        h('div.crate-rays'),
        h('img.crate-unit', { src: pic(r.def), alt: '' }),
        h('div.crate-box', {}, h('div.crate-lid'), h('span.crate-tape'), h('span.crate-label', {}, 'FRAGILE')),
      ),
      h('div.ship-info', {},
        h('span.rarity-chip', {}, rarityLabel(r.rarity)),
        h('b', {}, r.def.names[0]),
        h('p.muted', {}, `${r.def.role} · {coffee}${r.def.cost}`),
        h('p.result-line', {}, (r.forced ? tr('{sparkle} 보장! ', '{sparkle} Guaranteed! ') : '') + resultLine(r)),
      ),
    );
  } else {
    body = h('div.ship-grid', {}, ...results.map((r, i) => h(`div.ship-card.u-${r.rarity}${r.fresh ? '.fresh' : ''}`, { style: `--d: ${(0.35 + i * 0.2).toFixed(2)}s` },
      h('div.ship-cover', {}, '{crate}'),
      h('img', { src: pic(r.def), alt: '' }),
      h('span.rarity-chip.mini', {}, rarityLabel(r.rarity)),
      h('span.card-name', {}, r.def.names[0]),
      r.fresh ? h('span.new-tag', {}, 'NEW') : r.refund ? h('span.dup-tag', {}, `{coin}${r.refund}`) : h('span.dup-tag', {}, `{fire}${r.passion}`),
      r.forced ? h('span.forced-tag', {}, tr('보장', 'Pity')) : null,
    )));
  }
  const fresh = results.filter((r) => r.fresh).length;
  const refund = results.reduce((s, r) => s + r.refund, 0);
  const summary = results.length > 1
    ? h('p.review-sum', {}, tr(`최고 ${rarityLabel(best)} · 새 장비 ${fresh}개${refund ? ` · 환급 {coin}${fmt(refund)}` : ''}`, `Best: ${rarityLabel(best)} · ${fresh} new${refund ? ` · refund {coin}${fmt(refund)}` : ''}`))
    : null;
  const panel = h(`div.panel.ship-panel.best-${best}`, { onclick: () => panel.classList.add('skip') },
    best === 'legend' ? h('div.legend-flash', {}, h('span', {}, tr('{crown} 레전더리!', '{crown} LEGENDARY!'))) : null,
    head, body, summary,
    h('div.btn-row', {},
      again ? h('button.btn', { disabled: ctx.save.gear.tickets >= results.length ? undefined : 'true', onclick: () => { overlay.remove(); again(); } }, results.length > 1 ? tr('10회 더', '10 more') : tr('한 번 더', 'One more')) : null,
      h('button.btn.primary', { onclick: close }, tr('확인', 'OK')),
    ),
  );
  overlay.append(panel);
  ctx.host()?.append(overlay);
  setTimeout(() => {
    if (!overlay.isConnected) return;
    if (best === 'legend') sfx.win();
    else sfx.summon();
  }, results.length > 1 ? 400 + results.length * 200 : 1100);
}

/** 천장: 레전더리 하나 고르기 */
function showSparkPicker(ctx: GearCtx): void {
  const overlay = h('div.overlay');
  const pick = (u: UnitDef): void => {
    const r = claimSpark(ctx.save, u.id);
    overlay.remove();
    if (!r) return;
    ctx.persist();
    showShipment(ctx, [r], null);
  };
  overlay.append(h('div.panel.spark-panel', {},
    h('h2', {}, tr('{crown} 레전더리 고르기', '{crown} Choose a Legendary')),
    h('p.muted', {}, tr(`${SPARK}회 뽑은 보답으로 원하는 레전더리 장비 하나를 보내 드려요.`, `For ${SPARK} draws, we'll ship you any Legendary gear you choose.`)),
    h('div.spark-list', {}, ...unitsOfRarity('legend').map((u) => h('button.spark-pick.u-legend', { onclick: () => pick(u) },
      h('img', { src: pic(u), alt: '' }), h('b', {}, u.names[0]), h('small', {}, u.role)))),
    h('button.btn', { onclick: () => overlay.remove() }, tr('나중에', 'Later')),
  ));
  ctx.host()?.append(overlay);
}

export function gearTab(ctx: GearCtx): HTMLElement {
  const s = ctx.save;
  const g = s.gear;
  const run = (count: 1 | 10): void => {
    const res = drawUnits(s, count);
    if (!res) return;
    ctx.persist();
    showShipment(ctx, res, () => run(count));
  };
  const buy = (count: 1 | 10): void => {
    if (buyTickets(s, count)) {
      ctx.persist();
      ctx.redraw();
    }
  };
  const have = GACHA_UNITS.filter((u) => isUnitOwned(s, u)).length;
  return h('div.gacha-draw.gear-draw', {},
    h('div.grant', {},
      h('div.grant-head', {},
        h('b', {}, tr('{crate} 장비 지원', '{crate} Equipment Grant')),
        h('small', {}, tr('뽑기권으로 ICT·전자 장비를 지원받아요. 장비는 전투에 나가는 동료예요.', 'Spend tickets to get ICT & electronics gear. Gear fights alongside your labmates.')),
      ),
      h('div.rate-list.gear-rates', {}, ...GACHA_RARITIES.slice().reverse().map((r) => h(`div.rate.u-${r}`, {},
        h('b', {}, rarityLabel(r)),
        h('span', {}, `${Math.round(UNIT_RATES[r] * 100)}%`),
        h('small', {}, tr(`중복: 열정 +1 · 열정 ${MAX_PASSION} 뒤엔 {coin}${DUP_REFUND[r]}`, `Dupe: Passion +1 · after ${MAX_PASSION}, {coin}${DUP_REFUND[r]}`)),
      ))),
      h('div.gear-lineup', {}, ...GACHA_UNITS.map((u) => {
        const owned = isUnitOwned(s, u);
        return h(`div.lineup-cell.u-${rarityOf(u)}${owned ? '' : '.unowned'}`, { title: owned ? u.names[unitProgress(s, u.id).tier - 1]! : '?' },
          h('img', { src: pic(u, owned), alt: '' }),
          owned ? passionPips(passionOf(s, u.id)) : h('span.q', {}, '?'));
      })),
      h('p.grant-note.passion-help', {}, tr(`{fire} 열정이란? 이미 가진 장비가 또 나오면 그 장비의 열정이 1 올라요. 열정 1마다 마지막 단계(Mk.III)의 레벨 상한이 1 올라가요 (15 → 최대 ${15 + MAX_PASSION}). 열정 ${MAX_PASSION}을 다 채운 뒤 또 나오면 연구비로 돌려받아요. 장비 아래 점이 지금 열정이에요.`, `{fire} What's Passion? Pulling gear you already own gives it +1 Passion. Each Passion raises its final-tier (Mk.III) level cap by 1 (15 → up to ${15 + MAX_PASSION}). Once Passion hits ${MAX_PASSION}, further dupes refund funding. The dots under each gear show its Passion.`)),
      h('p.muted.grant-note', {}, tr('{sparkle} 10회 뽑기는 에픽 이상 1개 보장 · {ticket} 무료 뽑기권: 보스 첫 클리어마다 1장, 무한 모드 10판마다 1장', '{sparkle} A 10-draw guarantees Epic or better · {ticket} Free tickets: 1 per first boss clear, 1 per 10 Endless rounds')),
    ),
    h('div.submit-box.gear-box', {},
      h('div.ticket-count', {}, '{ticket}', h('b', {}, `× ${fmt(g.tickets)}`)),
      h('div.btn-row.tight', {},
        h('button.btn.small', { disabled: s.money >= TICKET_PRICE ? undefined : 'true', onclick: () => buy(1) }, tr(`+1장 {coin}${fmt(TICKET_PRICE)}`, `+1 {coin}${fmt(TICKET_PRICE)}`)),
        h('button.btn.small', { disabled: s.money >= TICKET10_PRICE ? undefined : 'true', onclick: () => buy(10) }, tr(`+10장 {coin}${fmt(TICKET10_PRICE)}`, `+10 {coin}${fmt(TICKET10_PRICE)}`)),
      ),
      h('button.btn.primary.submit-1', { disabled: g.tickets >= 1 ? undefined : 'true', onclick: () => run(1) }, tr('{crate} 1회 뽑기 {ticket}1', '{crate} Draw 1 {ticket}1')),
      h('button.btn.submit-10', { disabled: g.tickets >= 10 ? undefined : 'true', onclick: () => run(10) }, tr('{crate} 10회 뽑기 {ticket}10', '{crate} Draw 10 {ticket}10')),
      h('div.collect', {},
        h('span', {}, tr(`{crown} 천장 ${Math.min(g.spark, SPARK)}/${SPARK} · 다 차면 레전더리 선택`, `{crown} Spark ${Math.min(g.spark, SPARK)}/${SPARK} · pick any Legendary when full`)),
        h('div.lv-track', {}, h('div.lv-fill.spark-fill', { style: { width: `${(Math.min(g.spark, SPARK) / SPARK) * 100}%` } }))),
      canClaimSpark(s) ? h('button.btn.spark-btn', { onclick: () => showSparkPicker(ctx) }, tr('{crown} 레전더리 고르기', '{crown} Choose a Legendary')) : null,
      h('p.muted', {}, tr(`모은 장비 ${have}/${GACHA_UNITS.length} · 지금까지 ${fmt(g.draws)}회`, `Gear ${have}/${GACHA_UNITS.length} · ${fmt(g.draws)} draws so far`)),
    ),
  );
}
