import {
  COSMETICS, COSMETIC_BY_ID, DRAW10_PRICE, DRAW_PRICE, GRADE_INFO, GRADES, HERO_SLOT, PITY, type CosmeticDef, type Grade, type Outfit,
} from '../data/cosmetics';
import { UNITS } from '../data/units';
import { drawCosmetics, equip, equipTitle, owns, titleName, type DrawResult } from '../sim/gacha';
import { isUnitOwned, unitProgress, type SaveData } from '../sim/progression';
import { heroLook } from '../story/player';
import { sfx } from '../audio/sfx';
import { h, fmt } from './dom';
import { portrait } from './icons';
import { tr } from '../i18n';

/**
 * "심사 결과" 화면: 논문을 투고(뽑기)하면 심사 결과 메일과 함께 꾸미기 아이템이 온다.
 * 옷장 탭에서 주인공·동료마다 모자와 색을 입히고 칭호를 고른다. 능력치는 바뀌지 않는다.
 */
export interface GachaCtx {
  save: SaveData;
  heroName: string;
  /** 저장하고 옷장을 그림에 반영 */
  persist: () => void;
  /** 화면 다시 그리기 */
  redraw: (tab: 'draw' | 'closet') => void;
  host: () => Element | null;
}

const PREVIEW_LOOK = UNITS[0]!.look;
const preview = (o: Outfit): string => portrait(PREVIEW_LOOK, 1, 'preview', 1, o);

/** 등급 도장 */
const stamp = (g: Grade, cls = ''): HTMLElement => h(`div.stamp.g-${g}${cls}`, {}, GRADE_INFO[g].label);

/** 아이템 그림: 모자·색은 막내에게 입혀 보고, 칭호는 띠 */
function itemPic(item: CosmeticDef | undefined): HTMLElement {
  if (!item) return h('div.item-pic.refund', {}, '{rain}');
  if (item.kind === 'title') return h('div.item-pic.title-pic', {}, h('span.title-chip.big', {}, item.name));
  return h('div.item-pic', {}, h('img', { src: preview(item.kind === 'hat' ? { hat: item.id } : { color: item.id }), alt: '' }));
}

const KIND_LABEL = (k: 'hat' | 'color' | 'title'): string => ({ hat: tr('모자·소품', 'hat'), color: tr('옷 색', 'outfit color'), title: tr('칭호', 'title') })[k];

function resultLine(r: DrawResult): string {
  if (!r.item) return tr(`위로 칭호를 다 모아서 투고료 {coin}${r.refund}을 돌려받았어요.`, `You have every consolation title, so {coin}${r.refund} of the fee was refunded.`);
  if (!r.fresh) return tr(`이미 가진 아이템이라 {coin}${r.refund}으로 돌려받았어요.`, `Duplicate item — refunded as {coin}${r.refund}.`);
  return tr(`새 ${KIND_LABEL(r.item.kind)} 획득!`, `New ${KIND_LABEL(r.item.kind)}!`);
}

let manuscript = 147;

/** 심사 결과 메일 열기 연출 */
function showResults(ctx: GachaCtx, results: DrawResult[], again: () => void): void {
  const overlay = h('div.overlay.review-overlay');
  const close = (): void => overlay.remove();
  const best = GRADES.find((g) => results.some((r) => r.grade === g))!;
  const refund = results.reduce((s, r) => s + r.refund, 0);
  const fresh = results.filter((r) => r.fresh).length;
  manuscript += results.length;
  const head = h('div.mail-head', {},
    h('b', {}, tr('{mail} 심사 결과 통보', '{mail} Decision on your manuscript')),
    h('small', {}, tr(`From: 편집장 <editor@labwars.journal> · 원고 LW-2026-${String(manuscript).padStart(4, '0')}`, `From: Editor-in-Chief <editor@labwars.journal> · Manuscript LW-2026-${String(manuscript).padStart(4, '0')}`)),
  );
  let body: HTMLElement;
  if (results.length === 1) {
    const r = results[0]!;
    body = h(`div.review-single.g-${r.grade}`, {},
      h('div.envelope', {}, h('div.env-back'), h('div.letter', {},
        h('p.letter-hi', {}, tr(`${ctx.heroName} 님께,`, `Dear ${ctx.heroName},`)),
        h('p.letter-txt', {}, tr('귀하의 원고에 대한 심사 결과를 알려 드립니다.', 'We are writing to inform you of the decision on your manuscript.')),
        stamp(r.grade, '.slam'),
        h('div.letter-item', {},
          itemPic(r.item),
          h('div', {},
            h('b', {}, r.item ? r.item.name : tr('투고료 일부 환급', 'Partial fee refund')),
            h('p.muted', {}, r.item ? `"${r.item.desc}"` : tr('"리뷰어 2: 다음 기회에."', '"Reviewer 2: Maybe next time."')),
            h('p.result-line', {}, (r.pity ? tr('{sparkle} 천장 보장! ', '{sparkle} Pity guarantee! ') : '') + resultLine(r)),
          ),
        ),
      ), h('div.env-front'), h('div.env-flap')),
    );
  } else {
    body = h('div.review-grid', {}, ...results.map((r, i) => h(`div.review-card.g-${r.grade}${r.fresh ? '.fresh' : ''}`, { style: `--d: ${(0.5 + i * 0.22).toFixed(2)}s` },
      h('div.card-cover', {}, '{mail}'),
      stamp(r.grade, '.mini'),
      itemPic(r.item),
      h('span.card-name', {}, r.item ? r.item.name : `{coin}${r.refund}`),
      r.fresh ? h('span.new-tag', {}, 'NEW') : r.item ? h('span.dup-tag', {}, `{coin}${r.refund}`) : null,
    )));
  }
  const summary = h('p.review-sum', {}, results.length > 1
    ? tr(`최고 결과 ${GRADE_INFO[best].label} · 새 아이템 ${fresh}개${refund ? ` · 환급 {coin}${fmt(refund)}` : ''}`, `Best: ${GRADE_INFO[best].label} · ${fresh} new item(s)${refund ? ` · refund {coin}${fmt(refund)}` : ''}`)
    : '');
  const canAgain = ctx.save.money >= (results.length > 1 ? DRAW10_PRICE : DRAW_PRICE);
  const panel = h(`div.panel.review-panel.best-${best}`, { onclick: () => panel.classList.add('skip') },
    head, body, summary,
    h('div.btn-row', {},
      h('button.btn', { onclick: () => { close(); ctx.redraw('closet'); } }, tr('{hanger} 옷장', '{hanger} Wardrobe')),
      h('button.btn', { disabled: canAgain ? undefined : 'true', onclick: () => { close(); again(); } }, results.length > 1 ? tr('10편 더', '10 more') : tr('한 편 더', 'One more')),
      h('button.btn.primary', { onclick: () => { close(); ctx.redraw('draw'); } }, tr('확인', 'OK')),
    ),
  );
  overlay.append(panel);
  ctx.host()?.append(overlay);
  // 도장 찍는 소리
  const delay = results.length > 1 ? 500 + results.length * 220 : 1300;
  setTimeout(() => {
    if (!overlay.isConnected) return;
    if (best === 'accept') sfx.win();
    else if (best === 'reject') sfx.lose();
    else sfx.summon();
  }, delay);
}

export function drawTab(ctx: GachaCtx): HTMLElement {
  const s = ctx.save;
  const c = s.cosmetics;
  const run = (count: 1 | 10): void => {
    const res = drawCosmetics(s, count);
    if (!res) return;
    ctx.persist();
    ctx.redraw('draw');
    showResults(ctx, res, () => run(count));
  };
  const total = COSMETICS.length;
  const have = c.owned.length;
  return h('div.gacha-draw', {},
    h('div.journal', {},
      h('div.journal-cover', {},
        h('small', {}, tr('VOL. 26 · 연구비로 투고하는 저널', 'VOL. 26 · The journal you pay to submit to')),
        h('b', {}, 'Journal of Lab Wars'),
        h('img', { src: portrait(heroLook(1).look, 1, HERO_SLOT), alt: '' }),
      ),
      h('div.journal-info', {},
        h('p', {}, tr('논문을 투고하면 심사 결과와 함께 꾸미기 아이템이 와요. {sparkle} 겉모습만 바뀌고 능력치는 그대로예요.', 'Submit a paper and the decision comes with a cosmetic item. {sparkle} Looks only — stats stay the same.')),
        h('div.rate-list', {}, ...GRADES.map((g) => h(`div.rate.g-${g}`, {},
          h('b', {}, GRADE_INFO[g].label),
          h('span', {}, `${Math.round(GRADE_INFO[g].rate * 100)}%`),
          h('small', {}, g === 'reject' ? tr('위로 칭호 / 환급', 'Consolation title / refund') : GRADE_INFO[g].rarity),
        ))),
        h('p.muted', {}, tr(`중복은 연구비로 돌려받아요 (일반 ${GRADE_INFO.major.refund} · 희귀 ${GRADE_INFO.minor.refund} · 전설 ${GRADE_INFO.accept.refund}).`, `Duplicates are refunded as funding (Common ${GRADE_INFO.major.refund} · Rare ${GRADE_INFO.minor.refund} · Legendary ${GRADE_INFO.accept.refund}).`)),
      ),
    ),
    h('div.submit-box', {},
      h('div.pity', {}, tr(`{star} 희귀 이상 보장까지 ${PITY - c.pity}편`, `{star} Rare+ guaranteed in ${PITY - c.pity}`)),
      h('div.collect', {}, tr(`모은 아이템 ${have}/${total}`, `Collected ${have}/${total}`), h('div.lv-track', {}, h('div.lv-fill', { style: { width: `${(have / total) * 100}%` } }))),
      h('button.btn.primary.submit-1', { disabled: s.money >= DRAW_PRICE ? undefined : 'true', onclick: () => run(1) }, tr(`{paper} 1편 투고 {coin}${fmt(DRAW_PRICE)}`, `{paper} Submit 1 {coin}${fmt(DRAW_PRICE)}`)),
      h('button.btn.submit-10', { disabled: s.money >= DRAW10_PRICE ? undefined : 'true', onclick: () => run(10) },
        tr(`{books} 10편 투고 {coin}${fmt(DRAW10_PRICE)}`, `{books} Submit 10 {coin}${fmt(DRAW10_PRICE)}`), h('small', {}, tr(' 1편 무료', ' 1 free'))),
      h('p.muted', {}, tr(`지금까지 ${fmt(c.draws)}편 투고`, `${fmt(c.draws)} submitted so far`)),
    ),
  );
}

let slot = HERO_SLOT;

export function closetTab(ctx: GachaCtx): HTMLElement {
  const s = ctx.save;
  const fits = s.cosmetics.outfits;
  const units = UNITS.filter((u) => isUnitOwned(s, u));
  if (slot !== HERO_SLOT && !units.some((u) => u.id === slot)) slot = HERO_SLOT;
  const slots = [
    { id: HERO_SLOT, name: tr(`${ctx.heroName} (나)`, `${ctx.heroName} (you)`), look: heroLook(1).look, tier: 1 },
    ...units.map((u) => ({ id: u.id, name: u.names[unitProgress(s, u.id).tier - 1]!, look: u.look, tier: unitProgress(s, u.id).tier })),
  ];
  const cur = slots.find((x) => x.id === slot)!;
  const fit = fits[slot] ?? {};
  const change = (fn: () => boolean): void => {
    if (fn()) {
      ctx.persist();
      ctx.redraw('closet');
    }
  };
  const chip = (item: CosmeticDef, on: boolean, pic: HTMLElement): HTMLElement => {
    const have = owns(s, item.id);
    return h(`button.wear-chip.g-${item.grade}${on ? '.on' : ''}${have ? '' : '.locked'}`, {
      title: have ? `${item.name}: ${item.desc}` : tr(`${GRADE_INFO[item.grade].label}에서 나와요`, `Drops from ${GRADE_INFO[item.grade].label}`),
      disabled: have ? undefined : 'true',
      onclick: () => change(() => equip(s, slot, item.kind as 'hat' | 'color', on ? null : item.id)),
    }, have ? pic : h('span.q', {}, '?'), h('small', {}, have ? item.name : GRADE_INFO[item.grade].rarity));
  };
  const hats = COSMETICS.filter((c) => c.kind === 'hat');
  const colors = COSMETICS.filter((c) => c.kind === 'color');
  const titles = COSMETICS.filter((c) => c.kind === 'title');
  const swatch = (c: CosmeticDef): HTMLElement => h(`span.swatch${c.color === 'holo' ? '.holo' : ''}`, { style: c.color === 'holo' ? {} : { background: c.color } });
  return h('div.closet', {},
    h('div.slot-strip', {}, ...slots.map((x) => h(`button.slot-btn${x.id === slot ? '.on' : ''}`, { onclick: () => { slot = x.id; ctx.redraw('closet'); } },
      h('img', { src: portrait(x.look, x.tier, x.id), alt: '' }),
      h('small', {}, x.name),
    ))),
    h('div.closet-main', {},
      h('div.closet-preview', {},
        h('img', { src: portrait(cur.look, cur.tier, cur.id), alt: '' }),
        h('b', {}, cur.name),
        h('small.muted', {}, [fit.hat && COSMETIC_BY_ID[fit.hat]!.name, fit.color && COSMETIC_BY_ID[fit.color]!.name].filter(Boolean).join(' · ') || tr('기본 차림', 'Default outfit')),
        h('button.btn.small', {
          disabled: fit.hat || fit.color ? undefined : 'true',
          onclick: () => change(() => {
            for (const x of slots) {
              if (x.id === slot) continue;
              equip(s, x.id, 'hat', fit.hat ?? null);
              equip(s, x.id, 'color', fit.color ?? null);
            }
            return true;
          }),
        }, tr('{party} 모두에게 입히기', '{party} Apply to everyone')),
      ),
      h('div.closet-items', {},
        h('div.closet-head', {}, tr('{crown} 모자·소품', '{crown} Hats & props')),
        h('div.wear-grid', {}, ...hats.map((it) => chip(it, fit.hat === it.id, h('img', { src: portrait(cur.look, cur.tier, cur.id, 1, { hat: it.id, color: fit.color }), alt: '' })))),
        h('div.closet-head', {}, tr('{pencil} 옷 색', '{pencil} Outfit color')),
        h('div.wear-grid.colors', {}, ...colors.map((it) => chip(it, fit.color === it.id, swatch(it)))),
        h('div.closet-head', {}, tr(`{scroll} 칭호 · 지금: ${titleName(s) || '없음'}`, `{scroll} Title · now: ${titleName(s) || 'none'}`)),
        h('div.title-grid', {}, ...titles.map((it) => {
          const have = owns(s, it.id);
          const on = s.cosmetics.title === it.id;
          return h(`button.title-chip.g-${it.grade}${on ? '.on' : ''}${have ? '' : '.locked'}`, {
            title: have ? it.desc : tr(`${GRADE_INFO[it.grade].label}에서 나와요`, `Drops from ${GRADE_INFO[it.grade].label}`),
            disabled: have ? undefined : 'true',
            onclick: () => change(() => equipTitle(s, on ? null : it.id)),
          }, have ? it.name : `? ${GRADE_INFO[it.grade].label}`);
        })),
      ),
    ),
  );
}
