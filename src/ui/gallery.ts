import { ENEMIES as ALL_ENEMIES } from '../data/enemies';
import { allyLevelTable, enemyStageTable } from './stat-tables';

/** 도감에 싣는 적: 전공 모드 과목 적·교수님은 과목 정보 창에서 본다 */
const ENEMIES = ALL_ENEMIES.filter((e) => !e.id.startsWith('ce-') && !e.id.startsWith('boss-'));
import { ENDLESS_BUG_BOSSES, ENDLESS_ENEMIES, OUTPOST_FROM, SIDE_STAGES, STAGES } from '../data/stages';
import { UNITS, UNIT_RARITIES, isGachaUnit, rarityLabel, rarityOf } from '../data/units';
import { RANGED_THRESHOLD, type CombatStats, type Look, type UnitDef, type UnitRarity } from '../data/types';
import { drawCharacter } from '../render/characters';
import { isEndlessOpen, isSkillOpen, isStageOpen, isUnitOwned, unitStats, type SaveData } from '../sim/progression';
import { SKILLS } from '../data/upgrades';
import { h, fmt } from './dom';
import { portrait } from './icons';
import { iconEl } from '../render/doodle';
import { tr } from '../i18n';
import { RARITY_RANK, loadPref, sortBar, sortByPref, type SortKey } from './sort';

type Tab = 'ally' | 'skill' | 'enemy' | 'boss';

const SKILL_KEYS = ['W', 'E', 'R', 'T'];

/** 열린 스테이지에서 등장하는 적 = 만나 본 적 */
function seenEnemies(save: SaveData): Set<string> {
  const seen = new Set<string>();
  for (const s of [...STAGES, ...SIDE_STAGES]) {
    if (!isStageOpen(save, s)) continue;
    for (const p of s.pool) seen.add(p.id);
    if (s.boss) seen.add(s.boss);
  }
  // 무한 모드 버그 군단: 열린 판(최고 기록 + 1)까지 합류한 적
  if (isEndlessOpen(save)) for (const e of [...ENDLESS_ENEMIES, ...ENDLESS_BUG_BOSSES]) if (e.from <= save.endless + 1) seen.add(e.id);
  // 화이트보드 전초기지: 15판에 도달하면 (최고 기록 + 1 ≥ 15)
  if (isEndlessOpen(save) && OUTPOST_FROM[0]! <= save.endless + 1) seen.add('whiteboard');
  return seen;
}

/** 능력 요약 한 줄 (도감 상세·연구실 자세히 보기) */
export function statTags(st: CombatStats): string {
  const t: string[] = [];
  if (st.flying) t.push(tr('공중', 'Air'));
  if (st.range >= RANGED_THRESHOLD) t.push(tr('원거리·대공', 'Ranged · Anti-air'));
  else t.push(tr('근접', 'Melee'));
  if (st.splash) t.push(tr('범위', 'Splash'));
  if (st.aura) t.push(tr(`오라 +${Math.round((st.aura.atkMul - 1) * 100)}%`, `Aura +${Math.round((st.aura.atkMul - 1) * 100)}%`));
  if (st.heal) t.push(tr('회복', 'Heal'));
  if (st.buildingMul) t.push(tr(`건물 ×${st.buildingMul}`, `Building ×${st.buildingMul}`));
  if (st.knockback) t.push(tr(`넉백 ${Math.round(st.knockback.chance * 100)}%`, `Knockback ${Math.round(st.knockback.chance * 100)}%`));
  if (st.burn) t.push(tr(`{fire} 화상 ${st.burn.dps}/초`, `{fire} Burn ${st.burn.dps}/s`));
  if (st.slow) t.push(tr(`{snail} 둔화 ${Math.round((1 - st.slow.mul) * 100)}%`, `{snail} Slow ${Math.round((1 - st.slow.mul) * 100)}%`));
  if (st.freeze) t.push(tr(`{snow} 빙결 ${Math.round(st.freeze.chance * 100)}%`, `{snow} Freeze ${Math.round(st.freeze.chance * 100)}%`));
  if (st.pierce) t.push(tr('관통', 'Pierce'));
  if (st.deathBurst) t.push(tr('사망 폭발', 'Death burst'));
  if (st.shield) t.push(tr(`{guard} 보호막 ${st.shield.amount}`, `{guard} Shield ${st.shield.amount}`));
  if (st.healZone) t.push(tr('회복 구역', 'Heal zone'));
  if (st.caffeineGen) t.push(tr(`{coffee} +${st.caffeineGen}/초`, `{coffee} +${st.caffeineGen}/s`));
  if (st.turret) t.push(tr('포탑 설치', 'Turrets'));
  if (st.revive) t.push(tr('1회 부활', 'Revive once'));
  if (st.fieldStrike) t.push(tr(`{bolt} 전장 타격 ${st.fieldStrike.dmg}`, `{bolt} Field strike ${st.fieldStrike.dmg}`));
  if (st.chain) t.push(tr(`{bolt} 연쇄 ${st.chain.jumps}회`, `{bolt} Chain ×${st.chain.jumps}`));
  if (st.armorShred) t.push(tr(`{shred} 방어 깎기 +${Math.round((st.armorShred.mul - 1) * 100)}%`, `{shred} Armor shred +${Math.round((st.armorShred.mul - 1) * 100)}%`));
  if (st.knockup) t.push(tr(`띄우기 ${Math.round(st.knockup.chance * 100)}%`, `Knock-up ${Math.round(st.knockup.chance * 100)}%`));
  if (st.lifesteal) t.push(tr(`{heart} 흡혈 ${Math.round(st.lifesteal * 100)}%`, `{heart} Lifesteal ${Math.round(st.lifesteal * 100)}%`));
  if (st.airMul) t.push(tr(`대공 ×${st.airMul}`, `Anti-air ×${st.airMul}`));
  if (st.stunField) t.push(tr(`{dizzy} 기절 펄스 ${st.stunField.dur}초`, `{dizzy} Stun pulse ${st.stunField.dur}s`));
  if (st.split) t.push(tr(`분열 ×${st.split.count}`, `Splits ×${st.split.count}`));
  if (st.grow) t.push(tr(`성장 ×${st.grow.max}`, `Grows ×${st.grow.max}`));
  if (st.respawn) t.push(tr('재출현', 'Respawns'));
  if (st.blipGuard) t.push(tr(`{bolt} 정전 보호 ${st.blipGuard}`, `{bolt} Blip guard ${st.blipGuard}`));
  if (st.caffeineDrain) t.push(tr(`{coffee} −${st.caffeineDrain}/타`, `{coffee} −${st.caffeineDrain}/hit`));
  return t.join(' · ');
}

/** 동료 탭의 등급 필터 */
let rarityFilter: UnitRarity | 'all' = 'all';

/** 정렬 기준: 동료 / 적·보스 (기기에 기억) */
const ALLY_SORT: SortKey[] = ['default', 'rarity', 'cost', 'atk', 'hp', 'name'];
const ENEMY_SORT: SortKey[] = ['default', 'name', 'hp', 'atk'];

export function mountGallery(root: HTMLElement, save: SaveData, onBack: () => void, initial: Tab = 'ally'): () => void {
  let stopPreview: (() => void) | null = null;
  const seen = seenEnemies(save);
  const allyPref = loadPref('dex-ally', ALLY_SORT);
  const enemyPref = loadPref('dex-enemy', ENEMY_SORT);

  const render = (tab: Tab): void => {
    stopPreview?.();
    const grid = h('div.dex-grid');
    if (tab === 'ally') {
      if (allyPref.compact) grid.classList.add('compact');
      grid.append(h('div.rarity-filter', {}, ...(['all', ...UNIT_RARITIES] as const).map((r) => h(`button.chapter-tab${r === 'all' ? '' : `.u-${r}`}${rarityFilter === r ? '.on' : ''}`, {
        onclick: () => { rarityFilter = r; render('ally'); },
      }, r === 'all' ? tr('전체', 'All') : rarityLabel(r)))), sortBar('dex-ally', allyPref, ALLY_SORT, () => render('ally')));
      // 못 얻은 뽑기 장비(실루엣)는 정렬 값을 숨기고 맨 뒤로
      const hiddenOf = (u: UnitDef): boolean => isGachaUnit(u) && !isUnitOwned(save, u);
      const list = sortByPref(UNITS.filter((u) => rarityFilter === 'all' || rarityFilter === rarityOf(u)), allyPref, (u, key) => (hiddenOf(u) ? null
        : key === 'rarity' ? RARITY_RANK[rarityOf(u)] : key === 'name' ? u.names[0] : key === 'cost' ? u.cost : key === 'atk' ? u.atk : key === 'hp' ? u.hp : 0));
      for (const u of list) {
        const r = rarityOf(u);
        const owned = isUnitOwned(save, u);
        // 아직 못 얻은 뽑기 장비는 실루엣과 '?'로만
        const hidden = hiddenOf(u);
        const show = (tier: number): void => { if (!hidden) preview({ look: u.look, tier, defId: u.id, facing: 1, name: u.names[tier - 1]!, role: u.role, desc: [u.desc, u.lore ? `"${u.lore}"` : ''].filter(Boolean).join(' '), stats: unitStats(u, { level: tier * 5, tier }), extra: tr(`{coffee}${u.cost} · 재소환 ${u.cooldown}초${u.count ? ` · ${u.count}명 소환` : ''}`, `{coffee}${u.cost} · cooldown ${u.cooldown}s${u.count ? ` · deploys ${u.count}` : ''}`), table: allyLevelTable(save, u) }); };
        if (allyPref.compact) {
          // 간단히: 1단계 그림과 이름만, 누르면 미리보기
          grid.append(h(`button.dex-cell.dex-mini.u-${r}${hidden ? '.hidden' : ''}${owned ? '' : '.unowned'}`, { onclick: () => show(1) },
            h('img', { src: portrait(u.look, 1, u.id, 1, undefined, hidden), alt: '' }), h('span', {}, hidden ? '???' : u.names[0])));
          continue;
        }
        const lock = owned ? null : h('span.dex-lock', {}, hidden ? tr('{crate} 장비 지원에서 획득', '{crate} From Equipment Grant') : u.unlock.subscribe ? tr('구독 필요', 'Subscription') : tr(`${u.unlock.stage} 클리어 시 합류`, `Joins after ${u.unlock.stage}`));
        grid.append(h(`div.dex-ally.u-${r}${hidden ? '.hidden' : ''}`, {},
          h('div.dex-ally-head', {}, r !== 'basic' ? h('span.rarity-chip.mini', {}, rarityLabel(r)) : null, h('b', {}, hidden ? '???' : u.names[0]), hidden ? null : h('span.muted', {}, ` ${u.role}`), lock),
          h('div.dex-tiers', {}, ...[1, 2, 3].map((tier) => h('button.dex-cell', { onclick: () => show(tier) },
            h('img', { src: portrait(u.look, tier, u.id, 1, undefined, hidden), alt: '' }), h('span', {}, hidden ? '?' : u.names[tier - 1]!)))),
          // 자세히: 기본 능력치·능력·설명
          hidden ? null : h('div.stats.dex-more', {}, `{heart}${fmt(u.hp)} {sword}${Math.round(u.atk)} {coffee}${u.cost}${u.count ? ` ×${u.count}` : ''} {clock}${u.cooldown}${tr('초', 's')}`),
          hidden ? null : h('p.muted.dex-tags', {}, statTags(u)),
          hidden ? null : h('p.desc', {}, u.desc),
        ));
      }
    } else if (tab === 'skill') {
      grid.classList.add('skills');
      SKILLS.forEach((sk, i) => {
        const open = isSkillOpen(save, sk);
        grid.append(h(`div.dex-ally.dex-skill${open ? '' : '.locked'}`, {},
          h('div.dex-ally-head', {}, h('span.dex-skill-icon', {}, iconEl(sk.icon)), h('b', {}, sk.name), open ? null : h('span.dex-lock', {}, tr(`${sk.unlockStage} 클리어 시 사용`, `Unlocks after ${sk.unlockStage}`))),
          h('p.dex-skill-desc', {}, sk.desc),
          h('div.stats', {}, tr(`{brain} 멘탈 ${sk.cost} · 단축키 ${SKILL_KEYS[i] ?? '-'}${sk.targeted ? ' · 전장을 탭해 위치 지정' : ''}`, `{brain} Sanity ${sk.cost} · key ${(SKILL_KEYS[i] ?? '-').toUpperCase()}${sk.targeted ? ' · tap the field to aim' : ''}`)),
          h('p.muted.dex-skill-lore', {}, sk.lore),
        ));
      });
      grid.append(h('p.muted.dex-skill-tip', {}, tr('스킬은 멘탈을 써요. {remodel} 시설의 {meditate} 명상 앱으로 멘탈 충전을 늘리면 스킬을 더 자주 쓸 수 있어요.', 'Skills cost Sanity. Upgrade the {meditate} Meditation App in {remodel} Facilities to charge Sanity faster and use skills more often.')));
    } else {
      if (enemyPref.compact) grid.classList.add('compact');
      grid.append(sortBar('dex-enemy', enemyPref, ENEMY_SORT, () => render(tab)));
      const list = sortByPref(ENEMIES.filter((e) => (tab === 'boss') === !!e.boss), enemyPref, (e, key) => (!seen.has(e.id) ? null
        : key === 'name' ? e.name : key === 'hp' ? e.hp : key === 'atk' ? e.atk : 0));
      for (const e of list) {
        const known = seen.has(e.id);
        grid.append(h(`button.dex-cell.enemy${known ? '' : '.unknown'}${e.boss ? '.boss' : ''}`, {
          onclick: () => known && preview({ look: e.look, tier: 1, defId: e.id, facing: -1, name: e.name, role: e.role, desc: [e.desc, bossDesc(e.boss)].filter(Boolean).join(' '), stats: e, extra: tr(`처치 연구비 {coin}${e.reward}`, `Kill funding {coin}${e.reward}`), table: enemyStageTable(save, e) }),
        }, h('img', { src: portrait(e.look, 1, e.id, -1), alt: '' }), h('span', {}, known ? e.name : '???'),
        enemyPref.compact ? null : h('small.muted', {}, known ? e.role : tr('아직 만나지 않음', 'Not met yet')),
        // 자세히: 능력치와 능력
        known && !enemyPref.compact ? h('small.stats', {}, `{heart}${fmt(e.hp)} {sword}${Math.round(e.atk)}`) : null,
        known && !enemyPref.compact ? h('small.muted.dex-tags', {}, statTags(e)) : null));
      }
    }
    const owned = UNITS.filter((u) => isUnitOwned(save, u)).length;
    root.replaceChildren(h('div.screen.dex', {},
      h('div.topbar', {},
        h('button.btn.small', { onclick: () => { stopPreview?.(); onBack(); } }, tr('← 뒤로', '← Back')),
        h('h2.top-title', {}, tr('캐릭터 도감', 'Codex')),
        h('div.money', {}, tr(`동료 ${owned}/${UNITS.length} · 적 ${[...seen].length}/${ENEMIES.length}`, `Labmates ${owned}/${UNITS.length} · Enemies ${[...seen].length}/${ENEMIES.length}`)),
      ),
      h('div.lab-tabs', {},
        ...(['ally', 'skill', 'enemy', 'boss'] as Tab[]).map((t) => h(`button.chapter-tab${t === tab ? '.on' : ''}`, { onclick: () => render(t) }, { ally: tr('{student} 연구실 동료', '{student} Labmates'), skill: tr('{sparkle} 스킬', '{sparkle} Skills'), enemy: tr('{paper} 잡무 군단', '{paper} Busywork Army'), boss: tr('{prof} 보스', '{prof} Bosses') }[t])),
      ),
      grid,
    ));
  };

  interface PreviewInfo { look: Look; tier: number; defId: string; facing: 1 | -1; name: string; role: string; desc: string; stats: CombatStats; extra: string; table?: HTMLElement }

  /** 큰 캔버스에서 걷기·공격 동작을 반복 재생한다. */
  const preview = (p: PreviewInfo): void => {
    stopPreview?.();
    const canvas = document.createElement('canvas');
    canvas.className = 'dex-canvas';
    canvas.width = 480;
    canvas.height = 360;
    const ctx = canvas.getContext('2d')!;
    let raf = 0;
    const t0 = performance.now();
    const loop = (now: number): void => {
      const t = (now - t0) / 1000;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#cfd8dc';
      ctx.fillRect(0, 290, 480, 70);
      ctx.fillStyle = 'rgba(0,0,0,.15)';
      ctx.beginPath();
      ctx.ellipse(240, 292, 60, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      // 3초 걷기 → 1.5초 공격 반복
      const cycle = t % 4.5;
      const attacking = cycle > 3;
      const swing = attacking ? Math.max(0, 1 - ((cycle - 3) % 0.75) / 0.25) : 0;
      const s = p.look.scale ?? 1;
      const zoom = Math.min(3.2, 230 / ((p.look.kind === 'professor' || p.look.kind === 'lecturer' ? 90 : p.look.kind === 'gear' ? 74 : 58) * s));
      ctx.translate(240, 290);
      ctx.scale(zoom, zoom);
      const lift = p.stats.flying ? -40 : 0;
      drawCharacter(ctx, p.look, { walk: t * 6, swing, tier: p.tier, time: t, moving: !attacking }, 0, lift, p.facing, p.defId);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    const overlay = h('div.overlay', { onclick: (e: Event) => { if (e.target === overlay) close(); } });
    const close = (): void => {
      cancelAnimationFrame(raf);
      overlay.remove();
      stopPreview = null;
    };
    stopPreview = close;
    overlay.append(h('div.panel.dex-detail', {},
      canvas,
      h('div.dex-info', {},
        h('h2', {}, p.name),
        h('p.muted', {}, `${p.role} · ${statTags(p.stats)}`),
        h('div.stats', {}, `{heart} ${fmt(p.stats.hp)}  {sword} ${Math.round(p.stats.atk)}  {target} ${p.stats.range}  {boot} ${p.stats.speed}  {clock} ${p.stats.interval}${tr('초', 's')}`),
        h('p.muted', {}, p.extra),
        p.desc ? h('p', {}, p.desc) : null,
        p.table ?? null,
        h('button.btn', { onclick: close }, tr('닫기', 'Close')),
      ),
    ));
    root.firstElementChild?.append(overlay);
  };

  render(initial);
  return () => stopPreview?.();
}

function bossDesc(b?: { summon?: { id: string; every: number; count: number }; stomp?: { dmg: number; radius: number; every: number } }): string {
  if (!b) return '';
  const parts: string[] = [];
  if (b.summon) {
    const name = ENEMIES.find((e) => e.id === b.summon!.id)?.name ?? b.summon.id;
    parts.push(tr(`${b.summon.every}초마다 ${name} ${b.summon.count}마리 소환`, `Summons ${b.summon.count} ${name} every ${b.summon.every}s`));
  }
  if (b.stomp) parts.push(tr(`${b.stomp.every}초마다 버럭 (주변 ${b.stomp.dmg} 피해)`, `Yells every ${b.stomp.every}s (${b.stomp.dmg} area damage)`));
  return parts.join(', ');
}
