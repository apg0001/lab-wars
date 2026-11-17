import type { StageDef } from '../data/stages';
import { ENEMY_BY_ID } from '../data/enemies';
import { Battle, WORLD_W } from '../sim/battle';
import type { BattleLoadout } from '../sim/progression';
import { iconEl, preloadIcons } from '../render/doodle';
import { drawBattle, PORTRAIT_TOP, setPortraitAspect, setViewAspect, VIEW_H, VIEW_W } from '../render/scene';
import { h, fmt } from './dom';
import { portrait } from './icons';
import { keyOf } from './keys';
import { fullscreenButton, isFullscreen, isStandalone, toggleFullscreen } from './fullscreen';
import { Juice } from '../render/juice';
import { audio } from '../audio/engine';
import { music } from '../audio/music';
import { playBattleSfx } from '../audio/sfx';
import { showAudioSettings } from './audio-settings';
import { isPortrait } from './orientation';
import { RARITY_LABEL, type CardDef } from '../data/cards';
import { tr } from '../i18n';
import { rarityOf } from '../data/units';

/** 스킬 슬롯 순서대로 쓰는 단축키 (Q는 커피머신, A/D는 시점 이동) */
const SKILL_KEYS = ['w', 'e', 'r', 't'];
/** 유닛 슬롯 단축키: 1~9 (편성 최대 9칸, 남은 키는 예비) */
const UNIT_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', 'minus', 'equal'];
const UNIT_KEY_LABEL: Record<string, string> = { minus: '-', equal: '=' };

export interface BattleEnd {
  win: boolean;
  baseHpRatio: number;
  killReward: number;
  kills: number;
  seconds: number;
  /** 시간 제한을 넘겨 졌다 */
  timeout: boolean;
}

export interface BattleScreenOptions {
  stage: StageDef;
  loadout: BattleLoadout;
  /** 결과 확정 시 호출 (저장 반영). 결과 창의 버튼은 actions로 받는다. */
  onEnd: (end: BattleEnd) => { title: string; lines: string[]; stars: number };
  actions: (win: boolean) => { label: string; primary?: boolean; run: () => void }[];
  onQuit: () => void;
  /** 배속 1~3 */
  speed?: number;
  onSpeedChange?: (speed: number) => void;
}

/** 전투 화면을 root에 그리고, 정리 함수를 돌려준다. */
/** 배속 버튼 순서 */
const SPEEDS = [1, 2, 3];

export function mountBattle(root: HTMLElement, opt: BattleScreenOptions): () => void {
  preloadIcons();
  const battle = new Battle(opt.stage, opt.loadout, (Date.now() & 0xffff) + 1);
  const canvas = document.createElement('canvas');
  canvas.className = 'battle-canvas';
  const ctx = canvas.getContext('2d')!;
  let camX = 0;
  /** 화면 비율에 따라 바뀌는 가로 시야 (resize에서 갱신) */
  let viewW = VIEW_W;
  let maxCam = WORLD_W - viewW;
  /** 세로 화면에서 잘라 낸 위쪽 높이 (가로 화면은 0) */
  let viewTop = 0;
  let wasTall: boolean | null = null;
  let speed = SPEEDS.includes(opt.speed ?? 1) ? (opt.speed ?? 1) : 1;
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
  const speedBtn = h('button.icon-btn', { title: tr('배속', 'Speed'), onclick: () => setSpeed(SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length]!) }, '');
  const pauseBtn = h('button.icon-btn', { title: tr('일시정지', 'Pause'), onclick: () => setPaused(true) }, '{pause}');
  const mini = h('div.minimap');
  const miniDots = h('div.mini-dots');
  const miniView = h('div.mini-view');
  mini.append(miniDots, miniView);
  const bossBox = h('div.boss-bar', {}, h('span.boss-name'), h('div.boss-track', {}, h('div.boss-fill')));
  bossBox.hidden = true;

  const top = h('div.hud-top', {},
    h('div.hp-box', {}, h('span.hp-label', {}, iconEl('lab'), tr('연구실', 'Lab')), h('div.hp-track', {}, allyBar), allyTxt),
    h('div.hud-mid', {}, h('div.stage-tag', {}, `${opt.stage.id} ${opt.stage.name}`), timeTxt),
    h('div.hp-box.right', {}, h('span.hp-label', {}, tr('교수실', 'Prof'), iconEl('prof')), h('div.hp-track', {}, enemyBar), enemyTxt),
    h('div.hud-btns', {}, speedBtn, pauseBtn, fullscreenButton(() => screen)),
  );

  const cafFill = h('div.res-fill.caf');
  const cafNum = h('span');
  const cafTxt = h('span.res-txt', {}, iconEl('coffee'), cafNum);
  const menFill = h('div.res-fill.men');
  const menNum = h('span');
  const menTxt = h('span.res-txt', {}, iconEl('brain'), menNum);
  const brewLv = h('span.brew-lv');
  const brewCostNum = h('span');
  const brewCost = h('span.brew-cost', {}, iconEl('coffee'), brewCostNum);
  const brewBtn = h('button.brew-btn', { title: tr('커피머신 업그레이드 (Q): 카페인 최대치·충전 속도 증가', 'Upgrade Coffee Machine (Q): more max Caffeine and faster charge'), onclick: () => battle.brew() }, iconEl('coffeeMachine', 'brew-ico'), brewLv, brewCost, h('span.hotkey', {}, 'Q'));

  const unitBtns = opt.loadout.deck.map((d, i) => {
    const cd = h('div.cd-mask');
    const btn = h(`button.unit-btn.u-${rarityOf(d.def)}`, { onclick: () => battle.summon(d.def.id), title: d.def.names[d.tier - 1] },
      h('img', { src: portrait(d.def.look, d.tier, d.def.id), alt: '', draggable: 'false' }),
      h('span.cost', {}, iconEl('coffee'), String(d.def.cost)),
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
      h('span.skill-icon', {}, iconEl(s.icon)), h('span.cost', {}, iconEl('brain'), String(s.cost)), h('span.hotkey', {}, key.toUpperCase()));
    return { btn, skill: s };
  });

  const unitRow = h('div.unit-row', {}, ...unitBtns.map((u) => u.btn));
  const bottom = h('div.hud-bottom', {},
    h('div.res-col', {},
      h('div.res', {}, h('div.res-track', {}, cafFill), cafTxt),
      h('div.res', {}, h('div.res-track', {}, menFill), menTxt),
      brewBtn,
    ),
    unitRow,
    h(`div.skill-row${skillBtns.length > 2 ? '.grid' : ''}`, {}, ...skillBtns.map((s) => s.btn)),
  );

  const aimHint = h('div.aim-hint', {}, tr('{books} 폭격할 지점을 탭하세요', '{books} Tap where to drop the barrage'));
  // 적용 중인 카드 효과 칩 (학회 경품 추첨)
  const chips = h('div.card-chips');
  let chipKey = '';
  // 추첨 창: 일시정지 창(overlay)보다 아래에 깔린다
  const draftLayer = h('div.draft-layer');
  draftLayer.hidden = true;
  let draftCards: HTMLElement[] = [];
  let draftReady = false;
  let draftTimer = 0;
  const overlay = h('div.overlay');
  overlay.hidden = true;

  // 전장(캔버스와 그 위에 뜨는 보스 체력·조준 안내). 가로 화면에서는 화면 전체, 세로 화면에서는 위쪽 띠.
  const field = h('div.battle-field', {}, canvas, bossBox, aimHint, chips);
  const screen = h('div.screen.battle', {}, field, top, mini, bottom, draftLayer, overlay);
  root.replaceChildren(screen);

  function setSpeed(s: number): void {
    speed = s;
    speedBtn.textContent = `${s}x`;
    speedBtn.classList.toggle('fast', s > 1);
    opt.onSpeedChange?.(s);
  }
  setSpeed(speed);

  function setPaused(p: boolean): void {
    if (ended) return;
    paused = p;
    overlay.hidden = !p;
    audio.duck(p);
    if (p) {
      overlay.replaceChildren(h('div.panel', {},
        h('h2', {}, tr('일시정지', 'Paused')),
        h('p.muted', {}, tr('전장 드래그: 시점 이동 · 1~9: 소환 · Q: 커피머신 · W/E/R/T: 스킬', 'Drag field: move camera · 1–9: deploy · Q: coffee machine · W/E/R/T: skills')),
        h('div.btn-col', {},
          h('button.btn.primary', { onclick: () => setPaused(false) }, tr('계속하기', 'Resume')),
          h('button.btn', { onclick: () => showAudioSettings(screen) }, tr('{sound} 소리 설정', '{sound} Sound')),
          isStandalone() ? null : h('button.btn', { onclick: () => void toggleFullscreen(screen) }, isFullscreen() ? tr('{fullscreen} 전체 화면 끄기', '{fullscreen} Exit fullscreen') : tr('{fullscreen} 전체 화면', '{fullscreen} Fullscreen')),
          h('button.btn', { onclick: () => { cleanup(); opt.onQuit(); } }, tr('후퇴하기', 'Retreat')),
        ),
      ));
    }
  }

  // ── 학회 경품 추첨 ──
  /** 뒤집힌 봉투 3장을 깔고, 차례로 뒤집어 공개한다. 전투는 고를 때까지 멈춰 있다. */
  function showDraft(hand: CardDef[]): void {
    armed = null;
    draftReady = false;
    draftCards = hand.map((c, i) => h(`button.draft-card.r-${c.rarity}`, { style: `--i:${i}`, onclick: () => tapCard(i), title: c.name },
      h('div.card-inner', {},
        h('div.card-back', {}, h('span.card-seal', {}, '{envelope}'), h('span.card-q', {}, '?')),
        h('div.card-front', {},
          h('span.card-rarity', {}, RARITY_LABEL[c.rarity]),
          h('span.card-icon', {}, `{${c.icon}}`),
          h('b.card-name', {}, c.name),
          h('span.card-desc', {}, c.desc),
          h('i.card-flavor', {}, c.flavor),
          c.rarity === 'legend' ? h('span.card-sparkle', {}, '{sparkle}', '{sparkle}', '{sparkle}') : null,
        ),
      ),
      h('span.hotkey', {}, String(i + 1)),
    ));
    draftLayer.replaceChildren(h('div.draft-box', {},
      h('h2', {}, tr('{envelope} 학회 경품 추첨!', '{envelope} Conference Raffle!')),
      h('p.muted', {}, tr(`봉투 하나를 고르세요 · 이번 판에만 적용 (${battle.draws}/3)`, `Pick an envelope · this battle only (${battle.draws}/3)`)),
      h('div.draft-row', {}, ...draftCards),
    ));
    draftLayer.hidden = false;
    draftLayer.classList.remove('done');
    window.clearTimeout(draftTimer);
    draftTimer = window.setTimeout(revealAll, 1300);
  }

  function revealAll(): void {
    window.clearTimeout(draftTimer);
    draftReady = true;
    draftLayer.classList.add('ready');
  }

  function tapCard(i: number): void {
    if (paused || !battle.draft) return;
    // 공개 연출 중에 누르면 바로 다 뒤집는다
    if (!draftReady) return revealAll();
    if (!battle.pickCard(i)) return;
    draftCards.forEach((c, j) => c.classList.add(j === i ? 'chosen' : 'gone'));
    draftLayer.classList.add('done');
    draftTimer = window.setTimeout(() => {
      draftLayer.hidden = true;
      draftLayer.classList.remove('ready', 'done');
    }, 650);
  }

  function updateChips(): void {
    const act = battle.activeCards();
    const key = act.map((a) => `${a.card.id}:${a.left === null ? '' : Math.ceil(a.left)}`).join(',');
    if (key === chipKey) return;
    chipKey = key;
    chips.replaceChildren(...act.map((a) => h(`span.card-chip.r-${a.card.rarity}`, { title: `${a.card.name}: ${a.card.desc}` },
      `{${a.card.icon}} ${a.card.chip}${a.left === null ? '' : ` ${Math.ceil(a.left)}s`}`)));
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
    if (battle.draft && !draftLayer.hidden) {
      const di = ['1', '2', '3'].indexOf(k);
      if (di >= 0) tapCard(di);
      return;
    }
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
    // 세로 화면: 하늘·바닥을 잘라 낸 띠를 보여 준다. 화면을 돌려도 전투는 그대로이고 시야만 다시 잡는다.
    const tall = isPortrait();
    let viewH = VIEW_H;
    if (r.width > 0 && r.height > 0) {
      const aspect = r.width / r.height;
      const mid = camX + viewW / 2;
      viewW = tall ? setPortraitAspect(aspect) : setViewAspect(aspect);
      viewH = tall ? viewW / aspect : VIEW_H;
      maxCam = WORLD_W - viewW;
      // 화면을 돌렸으면 보던 곳의 가운데를 지킨다 (왼쪽 끝에 붙어 있었으면 그대로 왼쪽 끝)
      const rotated = wasTall !== null && wasTall !== tall && camX > 0;
      camX = clamp(rotated ? mid - viewW / 2 : camX, 0, maxCam);
      wasTall = tall;
    }
    viewTop = tall ? PORTRAIT_TOP : 0;
    const scale = Math.min(2, Math.max(1, (r.width / viewW) * dpr));
    canvas.width = Math.round(viewW * scale);
    canvas.height = Math.round(viewH * scale);
  };
  /** 세로 화면: 남은 공간에 유닛 버튼이 가장 크게 들어가는 칸 수(4~6)를 고른다 */
  const layoutUnits = (): void => {
    if (!isPortrait()) return;
    const r = unitRow.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const gap = parseFloat(getComputedStyle(unitRow).columnGap) || 0;
    const n = Math.max(1, unitBtns.length);
    let best = { cols: 4, cell: 0 };
    for (let cols = 4; cols <= 6; cols++) {
      const rows = Math.ceil(n / cols);
      const cell = Math.min((r.width - gap * (cols - 1)) / cols, (r.height - gap * (rows - 1)) / rows);
      if (cell > best.cell + 1) best = { cols, cell };
      if (rows === 1) break;
    }
    unitRow.style.setProperty('--cols', String(best.cols));
    unitRow.style.setProperty('--cell', `${Math.floor(best.cell)}px`);
  };
  const ro = new ResizeObserver(() => { resize(); layoutUnits(); });
  ro.observe(canvas);
  ro.observe(unitRow);
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
    ctx.setTransform(k, 0, 0, k, 0, -viewTop * k);
    drawBattle(ctx, battle, camX, now / 1000, juice);
    if (armed) {
      ctx.fillStyle = 'rgba(30,136,229,.12)';
      ctx.fillRect(0, 0, viewW, VIEW_H);
    }
    if (battle.draft && draftLayer.hidden && !ended) showDraft(battle.draft);
    updateHud();
    updateChips();
    if (battle.result && !ended) endBattle();
    raf = requestAnimationFrame(frame);
  }

  function updateHud(): void {
    const L = opt.loadout;
    allyBar.style.width = `${(battle.ally.hp / battle.ally.maxHp) * 100}%`;
    enemyBar.style.width = `${(battle.enemy.hp / battle.enemy.maxHp) * 100}%`;
    allyTxt.textContent = fmt(battle.ally.hp);
    enemyTxt.textContent = fmt(battle.enemy.hp);
    // 시간 제한이 있으면 남은 시간을, 없으면 경과 시간을 보여 준다
    const left = battle.timeLeft;
    const sec = left === null ? Math.floor(battle.t) : Math.ceil(left);
    timeTxt.textContent = `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
    timeTxt.classList.toggle('low', left !== null && left <= 30 && !battle.result);
    cafFill.style.width = `${(battle.caffeine / battle.caffeineMax) * 100}%`;
    cafNum.textContent = ` ${Math.floor(battle.caffeine)}/${battle.caffeineMax}`;
    const bc = battle.brewCost();
    brewLv.textContent = `Lv${battle.brewLevel}`;
    brewCostNum.textContent = bc === null ? 'MAX' : String(bc);
    brewCost.classList.toggle('max', bc === null);
    brewBtn.classList.toggle('off', !battle.canBrew());
    menFill.style.width = `${(battle.mental / L.mentalMax) * 100}%`;
    menNum.textContent = ` ${Math.floor(battle.mental)}`;
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
    draftLayer.hidden = true;
    const win = battle.result === 'win';
    const res = opt.onEnd({ win, baseHpRatio: battle.ally.hp / battle.ally.maxHp, killReward: battle.killReward, kills: battle.kills, seconds: battle.t, timeout: battle.timedOut });
    window.setTimeout(() => {
      overlay.hidden = false;
      overlay.replaceChildren(h(`div.panel.result.${win ? 'win' : 'lose'}`, {},
        h('h2', {}, res.title),
        win ? h('div.stars', {}, ...[1, 2, 3].map((i) => h(`span.star${i <= res.stars ? '.on' : ''}`, {}, i <= res.stars ? '{star}' : '{starOff}'))) : null,
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
    window.clearTimeout(draftTimer);
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
