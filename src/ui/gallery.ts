import { ENEMIES } from '../data/enemies';
import { STAGES } from '../data/stages';
import { UNITS } from '../data/units';
import { RANGED_THRESHOLD, type CombatStats, type Look } from '../data/types';
import { drawCharacter } from '../render/characters';
import { isStageOpen, isUnitOwned, unitStats, type SaveData } from '../sim/progression';
import { h, fmt } from './dom';
import { portrait } from './icons';

type Tab = 'ally' | 'enemy' | 'boss';

/** 열린 스테이지에서 등장하는 적 = 만나 본 적 */
function seenEnemies(save: SaveData): Set<string> {
  const seen = new Set<string>();
  for (const s of STAGES) {
    if (!isStageOpen(save, s)) continue;
    for (const p of s.pool) seen.add(p.id);
    if (s.boss) seen.add(s.boss);
  }
  return seen;
}

function tags(st: CombatStats): string {
  const t: string[] = [];
  if (st.flying) t.push('공중');
  if (st.range >= RANGED_THRESHOLD) t.push('원거리·대공');
  else t.push('근접');
  if (st.splash) t.push('범위');
  if (st.aura) t.push(`오라 +${Math.round((st.aura.atkMul - 1) * 100)}%`);
  if (st.heal) t.push('회복');
  if (st.buildingMul) t.push(`건물 ×${st.buildingMul}`);
  return t.join(' · ');
}

export function mountGallery(root: HTMLElement, save: SaveData, onBack: () => void, initial: Tab = 'ally'): () => void {
  let stopPreview: (() => void) | null = null;
  const seen = seenEnemies(save);

  const render = (tab: Tab): void => {
    stopPreview?.();
    const grid = h('div.dex-grid');
    if (tab === 'ally') {
      for (const u of UNITS) {
        const owned = isUnitOwned(save, u);
        grid.append(h('div.dex-ally', {},
          h('div.dex-ally-head', {}, h('b', {}, u.names[0]), h('span.muted', {}, ` ${u.role}`), owned ? null : h('span.dex-lock', {}, u.unlock.subscribe ? '구독 필요' : `${u.unlock.stage} 클리어 시 합류`)),
          h('div.dex-tiers', {}, ...[1, 2, 3].map((tier) => h('button.dex-cell', {
            onclick: () => preview({ look: u.look, tier, defId: u.id, facing: 1, name: u.names[tier - 1]!, role: u.role, desc: u.desc, stats: unitStats(u, { level: tier * 5, tier }), extra: `☕${u.cost} · 재소환 ${u.cooldown}초${u.count ? ` · ${u.count}명 소환` : ''}` }),
          }, h('img', { src: portrait(u.look, tier, u.id), alt: '' }), h('span', {}, u.names[tier - 1]!)))),
        ));
      }
    } else {
      const list = ENEMIES.filter((e) => (tab === 'boss') === !!e.boss);
      for (const e of list) {
        const known = seen.has(e.id);
        grid.append(h(`button.dex-cell.enemy${known ? '' : '.unknown'}${e.boss ? '.boss' : ''}`, {
          onclick: () => known && preview({ look: e.look, tier: 1, defId: e.id, facing: -1, name: e.name, role: e.role, desc: bossDesc(e.boss), stats: e, extra: `처치 연구비 💰${e.reward}` }),
        }, h('img', { src: portrait(e.look, 1, e.id, -1), alt: '' }), h('span', {}, known ? e.name : '???'), h('small.muted', {}, known ? e.role : '아직 만나지 않음')));
      }
    }
    const owned = UNITS.filter((u) => isUnitOwned(save, u)).length;
    root.replaceChildren(h('div.screen.dex', {},
      h('div.topbar', {},
        h('button.btn.small', { onclick: () => { stopPreview?.(); onBack(); } }, '← 뒤로'),
        h('h2.top-title', {}, '캐릭터 도감'),
        h('div.money', {}, `동료 ${owned}/${UNITS.length} · 적 ${[...seen].length}/${ENEMIES.length}`),
      ),
      h('div.lab-tabs', {},
        ...(['ally', 'enemy', 'boss'] as Tab[]).map((t) => h(`button.chapter-tab${t === tab ? '.on' : ''}`, { onclick: () => render(t) }, { ally: '🧑‍🎓 연구실 동료', enemy: '📄 잡무 군단', boss: '👨‍🏫 보스' }[t])),
      ),
      grid,
    ));
  };

  interface PreviewInfo { look: Look; tier: number; defId: string; facing: 1 | -1; name: string; role: string; desc: string; stats: CombatStats; extra: string }

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
      const zoom = Math.min(3.2, 230 / ((p.look.kind === 'professor' ? 90 : 58) * s));
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
        h('p.muted', {}, `${p.role} · ${tags(p.stats)}`),
        h('div.stats', {}, `❤️ ${fmt(p.stats.hp)}  ⚔️ ${Math.round(p.stats.atk)}  🎯 ${p.stats.range}  👟 ${p.stats.speed}  ⏱️ ${p.stats.interval}초`),
        h('p.muted', {}, p.extra),
        p.desc ? h('p', {}, p.desc) : null,
        h('button.btn', { onclick: close }, '닫기'),
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
    parts.push(`${b.summon.every}초마다 ${name} ${b.summon.count}마리 소환`);
  }
  if (b.stomp) parts.push(`${b.stomp.every}초마다 버럭 (주변 ${b.stomp.dmg} 피해)`);
  return parts.join(', ');
}
