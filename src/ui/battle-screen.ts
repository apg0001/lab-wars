import type { StageDef } from '../data/stages';
import { ENEMY_BY_ID } from '../data/enemies';
import { Battle, WORLD_W } from '../sim/battle';
import type { BattleLoadout } from '../sim/progression';
import { drawBattle, setViewAspect, VIEW_H, VIEW_W } from '../render/scene';
import { h, fmt } from './dom';
import { portrait } from './icons';
import { keyOf } from './keys';
import { isFullscreen, isStandalone, toggleFullscreen } from './fullscreen';
import { Juice } from '../render/juice';
import { audio } from '../audio/engine';
import { music } from '../audio/music';
import { playBattleSfx } from '../audio/sfx';
import { showAudioSettings } from './audio-settings';

/** 스킬 슬롯 순서대로 쓰는 단축키 (Q는 커피머신, A/D는 시점 이동) */
const SKILL_KEYS = ['w', 'e', 'r', 't'];
/** 유닛 슬롯 단축키: 1~9, 0, -, = (최대 12칸) */
const UNIT_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', 'minus', 'equal'];
const UNIT_KEY_LABEL: Record<string, string> = { minus: '-', equal: '=' };

export interface BattleEnd {
  win: boolean;
  baseHpRatio: number;
  killReward: number;
  kills: number;
  seconds: number;
}

export interface BattleScreenOptions {
  stage: StageDef;
  loadout: BattleLoadout;
  /** 결과 확정 시 호출 (저장 반영). 결과 창의 버튼은 actions로 받는다. */
  onEnd: (end: BattleEnd) => { title: string; lines: string[]; stars: number };
  actions: (win: boolean) => { label: string; primary?: boolean; run: () => void }[];
  onQuit: () => void;
  speed2x?: boolean;
  onSpeedChange?: (on: boolean) => void;
}

/** 전투 화면을 root에 그리고, 정리 함수를 돌려준다. */
export function mountBattle(root: HTMLElement, opt: BattleScreenOptions): () => void {
  const battle = new Battle(opt.stage, opt.loadout, (Date.now() & 0xffff) + 1);
  const canvas = document.createElement('canvas');
  canvas.className = 'battle-canvas';
  const ctx = canvas.getContext('2d')!;
  let camX = 0;
  /** 화면 비율에 따라 바뀌는 가로 시야 (resize에서 갱신) */
  let viewW = VIEW_W;
  let maxCam = WORLD_W - viewW;
  let speed = opt.speed2x ? 2 : 1;
  let paused = false;
  let armed: 'bombard' | null = null;
  let ended = false;
  let raf = 0;
  let last = performance.now();
  const juice = new Juice();
  music.play(opt.stage.theme ? 'spooky' : 'battle');

  // ── HUD ──
  const allyBar = h('div.hp-fill.ally');
  const enemyBar = h('div.hp-fill.enemy');
  const allyTxt = h('span.hp-txt');
  const enemyTxt = h('span.hp-txt');
  const timeTxt = h('span.time');
  const speedBtn = h('button.icon-btn', { title: '배속', onclick: () => setSpeed(speed === 1 ? 2 : 1) }, '');
  const pauseBtn = h('button.icon-btn', { title: '일시정지', onclick: () => setPaused(true) }, '⏸');
  const mini = h('div.minimap');
  const miniDots = h('div.mini-dots');
  const miniView = h('div.mini-view');
  mini.append(miniDots, miniView);
  const bossBox = h('div.boss-bar', {}, h('span.boss-name'), h('div.boss-track', {}, h('div.boss-fill')));
  bossBox.hidden = true;

  const top = h('div.hud-top', {},
    h('div.hp-box', {}, h('span.hp-label', {}, '🏫 연구실'), h('div.hp-track', {}, allyBar), allyTxt),
    h('div.hud-mid', {}, h('div.stage-tag', {}, `${opt.stage.id} ${opt.stage.name}`), timeTxt),
    h('div.hp-box.right', {}, h('span.hp-label', {}, '교수실 👨‍🏫'), h('div.hp-track', {}, enemyBar), enemyTxt),
    h('div.hud-btns', {}, speedBtn, pauseBtn),
  );

  const cafFill = h('div.res-fill.caf');
  const cafTxt = h('span.res-txt');
  const menFill = h('div.res-fill.men');
  const menTxt = h('span.res-txt');
  const brewLv = h('span.brew-lv');
  const brewCost = h('span.brew-cost');
  const brewBtn = h('button.brew-btn', { title: '커피머신 업그레이드 (Q): 카페인 최대치·충전 속도 증가', onclick: () => battle.brew() }, '☕', brewLv, brewCost, h('span.hotkey', {}, 'Q'));

  const unitBtns = opt.loadout.deck.map((d, i) => {
    const cd = h('div.cd-mask');
    const btn = h('button.unit-btn', { onclick: () => battle.summon(d.def.id), title: d.def.names[d.tier - 1] },
      h('img', { src: portrait(d.def.look, d.tier, d.def.id), alt: '', draggable: 'false' }),
      h('span.cost', {}, `☕${d.def.cost}`),
      h('span.hotkey', {}, UNIT_KEYS[i] ? UNIT_KEY_LABEL[UNIT_KEYS[i]!] ?? UNIT_KEYS[i]! : ''),
      cd,
    );
    return { btn, cd, entry: d };
  });

  const useSkill = (s: (typeof opt.loadout.skills)[number]): void => {
    if (s.targeted) {
      if (!battle.canCast(s.id)) return;
      armed = armed ? null : 'bombard';
    } else battle.cast(s.id);
  };
  const skillBtns = opt.loadout.skills.map((s, i) => {
    const key = SKILL_KEYS[i] ?? '';
    const btn = h('button.skill-btn', { title: `${s.name} (${key.toUpperCase()}): ${s.desc}`, onclick: () => useSkill(s) },
      h('span.skill-icon', {}, s.icon), h('span.cost', {}, `🧠${s.cost}`), h('span.hotkey', {}, key.toUpperCase()));
    return { btn, skill: s };
  });

  const bottom = h('div.hud-bottom', {},
    h('div.res-col', {},
      h('div.res', {}, h('div.res-track', {}, cafFill), cafTxt),
      h('div.res', {}, h('div.res-track', {}, menFill), menTxt),
      brewBtn,
    ),
    h('div.unit-row', {}, ...unitBtns.map((u) => u.btn)),
    h(`div.skill-row${skillBtns.length > 2 ? '.grid' : ''}`, {}, ...skillBtns.map((s) => s.btn)),
  );

  const aimHint = h('div.aim-hint', {}, '📚 폭격할 지점을 탭하세요');
  const overlay = h('div.overlay');
  overlay.hidden = true;

  const screen = h('div.screen.battle', {}, canvas, top, mini, bossBox, bottom, aimHint, overlay);
  root.replaceChildren(screen);

  function setSpeed(s: number): void {
    speed = s;
    speedBtn.textContent = s === 2 ? '⏩2x' : '▶1x';
    opt.onSpeedChange?.(s === 2);
  }
  setSpeed(speed);

  function setPaused(p: boolean): void {
    if (ended) return;
    paused = p;
    overlay.hidden = !p;
    audio.duck(p);
    if (p) {
      overlay.replaceChildren(h('div.panel', {},
        h('h2', {}, '일시정지'),
        h('p.muted', {}, '전장 드래그: 시점 이동 · 1~0 - =: 소환 · Q: 커피머신 · W/E/R/T: 스킬'),
        h('div.btn-col', {},
          h('button.btn.primary', { onclick: () => setPaused(false) }, '계속하기'),
          h('button.btn', { onclick: () => showAudioSettings(screen) }, '🔊 소리 설정'),
          isStandalone() ? null : h('button.btn', { onclick: () => void toggleFullscreen(screen) }, isFullscreen() ? '✕ 전체 화면 끄기' : '⛶ 전체 화면'),
          h('button.btn', { onclick: () => { cleanup(); opt.onQuit(); } }, '후퇴하기'),
        ),
      ));
    }
  }

  // ── 입력: 드래그로 시점 이동, 탭으로 투척 ──
  let drag: { x: number; cam: number; moved: boolean; id: number } | null = null;
  const toView = (clientX: number): number => {
    const r = canvas.getBoundingClientRect();
    return ((clientX - r.left) / r.width) * viewW;
  };
  canvas.addEventListener('pointerdown', (e) => {
    drag = { x: e.clientX, cam: camX, moved: false, id: e.pointerId };
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag || drag.id !== e.pointerId) return;
    const r = canvas.getBoundingClientRect();
    const dx = ((e.clientX - drag.x) / r.width) * viewW;
    if (Math.abs(dx) > 10) drag.moved = true;
    if (drag.moved) camX = clamp(drag.cam - dx, 0, maxCam);
  });
  canvas.addEventListener('pointerup', (e) => {
    if (!drag || drag.id !== e.pointerId) return;
    const tap = !drag.moved;
    drag = null;
    if (!tap || paused) return;
    const wx = camX + toView(e.clientX);
    if (armed) {
      battle.cast(armed, wx);
      armed = null;
    }
  });
  canvas.addEventListener('pointercancel', () => (drag = null));
  canvas.addEventListener('wheel', (e) => {
    camX = clamp(camX + (Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY), 0, maxCam);
    e.preventDefault();
  }, { passive: false });
  // 미니맵 탭으로 시점 이동
  mini.addEventListener('pointerdown', (e) => {
    const r = mini.getBoundingClientRect();
    camX = clamp(((e.clientX - r.left) / r.width) * WORLD_W - viewW / 2, 0, maxCam);
  });

  const onKey = (e: KeyboardEvent): void => {
    // 한글 입력 상태에서도 동작하도록 글자(e.key)가 아니라 물리 키 위치(e.code)로 판정한다.
    const k = keyOf(e);
    if (k === 'escape' || k === 'p') return setPaused(!paused);
    if (paused) return;
    if (k === 'q') battle.brew();
    const si = SKILL_KEYS.indexOf(k);
    if (si >= 0 && skillBtns[si]) useSkill(skillBtns[si].skill);
    const ui = UNIT_KEYS.indexOf(k);
    if (ui >= 0 && unitBtns[ui]) battle.summon(unitBtns[ui].entry.def.id);
    if (k === 'arrowleft' || k === 'a') camX = clamp(camX - 60, 0, maxCam);
    if (k === 'arrowright' || k === 'd') camX = clamp(camX + 60, 0, maxCam);
  };
  window.addEventListener('keydown', onKey);

  // ── 캔버스 해상도 ──
  const resize = (): void => {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const r = canvas.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) {
      viewW = setViewAspect(r.width / r.height);
      maxCam = WORLD_W - viewW;
      camX = clamp(camX, 0, maxCam);
    }
    const scale = Math.max(1, (r.width / viewW) * dpr);
    canvas.width = Math.round(viewW * Math.min(scale, 2));
    canvas.height = Math.round(VIEW_H * Math.min(scale, 2));
  };
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  resize();

  // ── 루프 ──
  const bossDef = opt.stage.boss ? ENEMY_BY_ID[opt.stage.boss] : undefined;
  if (bossDef) (bossBox.querySelector('.boss-name') as HTMLElement).textContent = bossDef.name;
  const bossFill = bossBox.querySelector('.boss-fill') as HTMLElement;

  function frame(now: number): void {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    if (!paused) {
      // 히트스톱: 큰 타격 순간 아주 잠깐 시간을 느리게
      const slow = juice.hitStop > 0 ? 0.08 : 1;
      juice.hitStop = Math.max(0, juice.hitStop - dt);
      battle.update(dt * speed * slow);
      juice.update(dt * slow);
    }
    for (const e of battle.drainEvents()) {
      juice.onEvent(e);
      playBattleSfx(e, camX, viewW);
      if (e.type === 'bossSpawn') music.play(opt.stage.theme ? 'spookyBoss' : 'boss');
      if (e.type === 'end') music.stop(0.4);
    }
    const k = canvas.width / viewW;
    ctx.setTransform(k, 0, 0, k, 0, 0);
    drawBattle(ctx, battle, camX, now / 1000, juice);
    if (armed) {
      ctx.fillStyle = 'rgba(30,136,229,.12)';
      ctx.fillRect(0, 0, viewW, VIEW_H);
    }
    updateHud();
    if (battle.result && !ended) endBattle();
    raf = requestAnimationFrame(frame);
  }

  function updateHud(): void {
    const L = opt.loadout;
    allyBar.style.width = `${(battle.ally.hp / battle.ally.maxHp) * 100}%`;
    enemyBar.style.width = `${(battle.enemy.hp / battle.enemy.maxHp) * 100}%`;
    allyTxt.textContent = fmt(battle.ally.hp);
    enemyTxt.textContent = fmt(battle.enemy.hp);
    const sec = Math.floor(battle.t);
    timeTxt.textContent = `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
    cafFill.style.width = `${(battle.caffeine / battle.caffeineMax) * 100}%`;
    cafTxt.textContent = `☕ ${Math.floor(battle.caffeine)}/${battle.caffeineMax}`;
    const bc = battle.brewCost();
    brewLv.textContent = `Lv${battle.brewLevel}`;
    brewCost.textContent = bc === null ? 'MAX' : `☕${bc}`;
    brewBtn.classList.toggle('off', !battle.canBrew());
    menFill.style.width = `${(battle.mental / L.mentalMax) * 100}%`;
    menTxt.textContent = `🧠 ${Math.floor(battle.mental)}`;
    for (const u of unitBtns) {
      const cdLeft = battle.unitCd[u.entry.def.id] ?? 0;
      u.cd.style.height = `${Math.min(1, cdLeft / (u.entry.def.cooldown * battle.loadout.cooldownMul)) * 100}%`;
      u.btn.classList.toggle('off', battle.caffeine < u.entry.def.cost);
    }
    for (const s of skillBtns) {
      s.btn.classList.toggle('off', !battle.canCast(s.skill.id));
      s.btn.classList.toggle('armed', armed === s.skill.id);
    }
    aimHint.hidden = !armed;
    // 미니맵
    const dots = battle.fighters.filter((f) => !f.dead).map((f) => `<i class="${f.side}${f.isBoss ? ' boss' : ''}${f.stats.flying ? ' air' : ''}" style="left:${(f.x / WORLD_W) * 100}%"></i>`).join('');
    miniDots.innerHTML = dots;
    miniView.style.left = `${(camX / WORLD_W) * 100}%`;
    miniView.style.width = `${(viewW / WORLD_W) * 100}%`;
    const boss = battle.fighters.find((f) => f.isBoss && !f.dead);
    bossBox.hidden = !boss;
    if (boss) bossFill.style.width = `${(boss.hp / boss.maxHp) * 100}%`;
  }

  function endBattle(): void {
    ended = true;
    const win = battle.result === 'win';
    const res = opt.onEnd({ win, baseHpRatio: battle.ally.hp / battle.ally.maxHp, killReward: battle.killReward, kills: battle.kills, seconds: battle.t });
    window.setTimeout(() => {
      overlay.hidden = false;
      overlay.replaceChildren(h(`div.panel.result.${win ? 'win' : 'lose'}`, {},
        h('h2', {}, res.title),
        win ? h('div.stars', {}, ...[1, 2, 3].map((i) => h(`span.star${i <= res.stars ? '.on' : ''}`, {}, '★'))) : null,
        ...res.lines.map((l) => h('p', {}, l)),
        h('div.btn-col', {}, ...opt.actions(win).map((a) => h(`button.btn${a.primary ? '.primary' : ''}`, { onclick: () => { cleanup(); a.run(); } }, a.label))),
      ));
    }, 1200);
  }

  raf = requestAnimationFrame(frame);

  // 탭을 떠나면 자동 일시정지
  const onVis = (): void => {
    if (document.hidden && !paused && !ended) setPaused(true);
  };
  document.addEventListener('visibilitychange', onVis);

  function cleanup(): void {
    cancelAnimationFrame(raf);
    ro.disconnect();
    window.removeEventListener('keydown', onKey);
    document.removeEventListener('visibilitychange', onVis);
    audio.duck(false);
  }
  return cleanup;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}
