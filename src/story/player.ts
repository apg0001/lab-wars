import type { Look } from '../data/types';
import { UNIT_BY_ID } from '../data/units';
import { ENEMY_BY_ID } from '../data/enemies';
import { drawCharacter, INK } from '../render/characters';
import { drawThemeBackdrop } from '../render/spooky';
import { iconImg } from '../render/doodle';
import type { Theme } from '../data/stages';
import { audio } from '../audio/engine';
import { music } from '../audio/music';
import { h } from '../ui/dom';
import type { Action, ActorId, Bg, Line, Scene } from './script';

/**
 * 애니메이션 컷신 재생기.
 * 캔버스에 배경과 인물을 그리고(걷기·점프·감정 표현·흔들림), 아래 대화창에 대사를 한 글자씩 띄운다.
 */

const H = 540;
/** 대화창(아래 약 30%)에 가리지 않도록 바닥선을 높게 둔다 */
const GROUND = 345;
const ACTOR_SCALE = 1.9;

interface ActorDef {
  name: string;
  look: Look;
  tier: number;
  defId: string;
  /** 대사 소리 높이 */
  voice: number;
}

/** 주인공은 챕터(신분)에 따라 모습이 바뀐다. */
export function heroLook(chapter: number): { look: Look; tier: number } {
  const tier = chapter >= 5 ? 3 : chapter >= 3 ? 2 : 1;
  return { look: { kind: 'student', color: '#7cc4ff', prop: chapter >= 6 ? 'clipboard' : 'laptop' }, tier };
}

function actorDef(id: ActorId, heroName: string, chapter: number, heroIsProf: boolean): ActorDef {
  const unit = (uid: string, tier: number, name: string, voice: number): ActorDef => ({ name, look: UNIT_BY_ID[uid]!.look, tier, defId: uid, voice });
  const boss = (eid: string, voice: number): ActorDef => ({ name: ENEMY_BY_ID[eid]!.name, look: { ...ENEMY_BY_ID[eid]!.look, scale: 1.25 }, tier: 1, defId: eid, voice });
  switch (id) {
    case 'hero': {
      if (heroIsProf) return { name: `${heroName} 교수`, look: { kind: 'professor', color: '#1565c0', accent: '#7cc4ff', scale: 1.25 }, tier: 1, defId: 'hero-prof', voice: 0.85 };
      const hl = heroLook(chapter);
      return { name: heroName, look: hl.look, tier: hl.tier, defId: 'hero', voice: 1.1 };
    }
    case 'senior': return unit('labchief', 3, '랩장 선배', 1);
    case 'claudy': return unit('claudy', 2, '클로디', 1.3);
    case 'codexy': return unit('codexy', 2, '코덱시', 1.2);
    case 'jaeminai': return unit('jaeminai', 2, '재미나이', 1.35);
    case 'newbie': return unit('grunt', 1, '신입 학부생', 1.25);
    case 'mom': return { name: '엄마', look: { kind: 'student', color: '#f48fb1', prop: 'none' }, tier: 3, defId: 'mom', voice: 1.15 };
    default: return boss(id, id === 'president' ? 0.6 : 0.75);
  }
}

interface Actor {
  id: ActorId;
  def: ActorDef;
  x: number;
  tx: number;
  face: 1 | -1;
  walk: number;
  jumpT: number;
  emote: string;
  emoteT: number;
  /** 퇴장 중이면 도착 후 사라진다 */
  leaving: boolean;
  alpha: number;
}

export interface CutsceneOptions {
  heroName: string;
  chapter: number;
  /** 건너뛰기 허용 (처음 보는 엔딩은 false) */
  skippable: boolean;
  onDone: () => void;
  /** 몰아보기: '그만 보기' 버튼을 띄우고 누르면 호출 */
  onStop?: () => void;
  /** 몰아보기 진행 표시 (예: 3 / 40) */
  progress?: string;
}

/** host 위에 컷신을 띄운다. 끝나면 onDone. */
export function playCutscene(host: Element, scene: Scene, opt: CutsceneOptions): void {
  const root = h('div.cutscene');
  const canvas = document.createElement('canvas');
  canvas.className = 'cut-canvas';
  const ctx = canvas.getContext('2d')!;
  const nameTag = h('div.cut-name');
  const text = h('div.cut-text');
  const next = h('div.cut-next', {}, '▼');
  const box = h('div.cut-box', {}, nameTag, text, next);
  const title = scene.title ? h('div.cut-title', {}, scene.title) : null;
  const skip = opt.skippable ? h('button.btn.small.cut-skip', { onclick: (e: Event) => { e.stopPropagation(); finish(); } }, '건너뛰기 ⏭') : null;
  const stop = opt.onStop ? h('button.btn.small.cut-stop', { onclick: (e: Event) => { e.stopPropagation(); finish(true); } }, '그만 보기 ✕') : null;
  const prog = opt.progress ? h('div.cut-progress', {}, opt.progress) : null;
  root.append(canvas, box, ...[title, skip, stop, prog].filter((x): x is HTMLElement => !!x));
  host.append(root);
  if (scene.music) music.play(scene.music);

  const fill = (s: string): string => s.replaceAll('{name}', opt.heroName);
  // 외전 1(조교수)은 처음부터 교수 모습
  let heroIsProf = opt.chapter >= 8;
  let bg: Bg = scene.bg;
  let viewW = 960;
  const actors = new Map<ActorId, Actor>();
  const spawn = (id: ActorId, x: number, face: 1 | -1 = 1): Actor => {
    const a: Actor = { id, def: actorDef(id, opt.heroName, opt.chapter, heroIsProf), x, tx: x, face, walk: 0, jumpT: 0, emote: '', emoteT: 0, leaving: false, alpha: 1 };
    actors.set(id, a);
    return a;
  };
  for (const c of scene.cast ?? []) spawn(c.id, c.x, c.face ?? 1);

  let lineIdx = -1;
  let shown = 0;
  let typing = false;
  let flashT = 0;
  let banner = '';
  let bannerT = 0;
  let done = false;
  let speaker: ActorId | undefined;
  let last = performance.now();
  let raf = 0;

  function apply(act: Action): void {
    switch (act.a) {
      case 'enter': {
        const a = actors.get(act.id) ?? spawn(act.id, act.from === 'left' ? -0.15 : 1.15);
        a.x = act.from === 'left' ? -0.15 : 1.15;
        a.tx = act.to;
        a.leaving = false;
        a.alpha = 1;
        a.face = act.from === 'left' ? 1 : -1;
        break;
      }
      case 'move': {
        const a = actors.get(act.id);
        if (a) a.tx = act.to;
        break;
      }
      case 'exit': {
        const a = actors.get(act.id);
        if (a) {
          a.tx = act.to === 'left' ? -0.2 : 1.2;
          a.face = act.to === 'left' ? -1 : 1;
          a.leaving = true;
        }
        break;
      }
      case 'jump': {
        const a = actors.get(act.id);
        if (a) a.jumpT = 0.45;
        break;
      }
      case 'face': {
        const a = actors.get(act.id);
        if (a) a.face = act.dir;
        break;
      }
      case 'shake': thud(); break; // 화면 흔들림은 끄고 쿵 소리만
      case 'flash': flashT = 0.6; chime(); break;
      case 'becomeProf': {
        heroIsProf = true;
        const a = actors.get('hero');
        if (a) a.def = actorDef('hero', opt.heroName, opt.chapter, true);
        break;
      }
      case 'banner': banner = act.text; bannerT = 2.2; break;
      case 'bg': bg = act.bg; break;
    }
  }

  function showLine(i: number): void {
    const line: Line | undefined = scene.lines[i];
    if (!line) return finish();
    lineIdx = i;
    shown = 0;
    typing = true;
    speaker = line.who;
    for (const act of line.do ?? []) apply(act);
    if (line.who) {
      const a = actors.get(line.who);
      // 말하는 사람이 화면에 없으면 오른쪽에서 들어온다
      if (!a) apply({ a: 'enter', id: line.who, from: 'right', to: 0.72 });
      if (line.emote) {
        const b = actors.get(line.who)!;
        b.emote = line.emote;
        b.emoteT = 1.6;
      }
    }
    const def = line.who ? actors.get(line.who)?.def : undefined;
    nameTag.textContent = def ? def.name : '';
    nameTag.hidden = !def;
    box.classList.toggle('narration', !def);
    text.textContent = '';
    next.hidden = true;
  }

  function advance(): void {
    if (done) return;
    const full = fill(scene.lines[lineIdx]?.text ?? '');
    if (typing && shown < full.length) {
      // 타이핑 중 탭: 이 줄을 바로 다 보여준다
      shown = full.length;
      return;
    }
    showLine(lineIdx + 1);
  }

  function finish(stopAll = false): void {
    if (done) return;
    done = true;
    cancelAnimationFrame(raf);
    root.classList.add('out');
    window.removeEventListener('keydown', onKey);
    window.setTimeout(() => { root.remove(); (stopAll && opt.onStop ? opt.onStop : opt.onDone)(); }, 250);
  }

  // ── 소리: 대사 블립, 쿵, 반짝 ──
  let blipT = 0;
  function blip(voice: number): void {
    const o = audio.sfxOut({ vol: 0.5 }, 0.06);
    if (!o) return;
    audio.tone(o, { type: 'triangle', f0: 520 * voice * (0.92 + Math.random() * 0.16), dur: 0.035, gain: 0.05 });
  }
  function thud(): void {
    const o = audio.sfxOut({ vol: 0.8 }, 0.4);
    if (o) audio.tone(o, { f0: 90, f1: 40, dur: 0.3, gain: 0.4 });
  }
  function chime(): void {
    const o = audio.sfxOut({ vol: 0.8 }, 1);
    if (o) [76, 79, 84].forEach((m, i) => audio.tone(o, { type: 'triangle', f0: 440 * 2 ** ((m - 69) / 12), dur: 0.5, gain: 0.06, at: i * 0.06 }));
  }

  // ── 그리기 ──
  function frame(now: number): void {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const line = scene.lines[lineIdx];
    const full = fill(line?.text ?? '');
    if (typing) {
      const before = Math.floor(shown);
      shown = Math.min(full.length, shown + dt * 32);
      if (Math.floor(shown) > before && speaker) {
        blipT -= 1;
        if (blipT <= 0) {
          blip(actors.get(speaker)?.def.voice ?? 1);
          blipT = 2;
        }
      }
      text.textContent = full.slice(0, Math.floor(shown));
      if (shown >= full.length) {
        typing = false;
        next.hidden = false;
      }
    }
    for (const a of actors.values()) {
      const d = a.tx - a.x;
      if (Math.abs(d) > 0.002) {
        const step = Math.sign(d) * Math.min(Math.abs(d), dt * 0.32);
        a.x += step;
        a.walk += Math.abs(step) * 40;
        a.face = d > 0 ? 1 : -1;
      } else if (a.leaving) a.alpha = Math.max(0, a.alpha - dt * 4);
      a.jumpT = Math.max(0, a.jumpT - dt);
      a.emoteT = Math.max(0, a.emoteT - dt);
    }
    // 걸음이 끝나면 말하는 사람 쪽을 바라본다
    if (speaker) {
      const sp = actors.get(speaker);
      if (sp) for (const a of actors.values()) if (a !== sp && Math.abs(a.tx - a.x) < 0.002 && !a.leaving) a.face = sp.x > a.x ? 1 : -1;
    }
    flashT = Math.max(0, flashT - dt);
    bannerT = Math.max(0, bannerT - dt);
    draw(now / 1000);
    raf = requestAnimationFrame(frame);
  }

  function draw(t: number): void {
    const k = canvas.width / viewW;
    ctx.setTransform(k, 0, 0, k, 0, 0);
    drawBg(ctx, bg, viewW, t, scene.sign);
    const list = [...actors.values()].filter((a) => a.alpha > 0).sort((p, q) => p.x - q.x);
    for (const a of list) {
      const x = a.x * viewW;
      const talking = a.id === speaker && typing;
      const jump = a.jumpT > 0 ? Math.sin((a.jumpT / 0.45) * Math.PI) * 34 : 0;
      const bob = talking ? Math.abs(Math.sin(t * 14)) * 5 : Math.sin(t * 2.4 + x) * 1.2;
      const moving = Math.abs(a.tx - a.x) > 0.002;
      const s = (a.def.look.scale ?? 1) * ACTOR_SCALE;
      ctx.save();
      ctx.globalAlpha = a.alpha;
      // 그림자
      ctx.fillStyle = 'rgba(0,0,0,.18)';
      ctx.beginPath();
      ctx.ellipse(x, GROUND + 4, 16 * s, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.translate(x, GROUND - jump - bob);
      ctx.scale(ACTOR_SCALE, ACTOR_SCALE);
      drawCharacter(ctx, { ...a.def.look }, { walk: a.walk, swing: talking ? Math.abs(Math.sin(t * 7)) * 0.4 : 0, tier: a.def.tier, time: t, moving }, 0, 0, a.face, a.def.defId);
      ctx.restore();
      if (a.emoteT > 0) drawEmote(ctx, x, GROUND - 150 * (a.def.look.scale ?? 1) - jump, a.emote, a.emoteT, t);
    }
    if (bannerT > 0) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, bannerT * 2, (2.2 - bannerT) * 4);
      ctx.fillStyle = 'rgba(43,36,48,.75)';
      ctx.fillRect(0, 110, viewW, 90);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 48px Jua, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(banner, viewW / 2, 172);
      ctx.restore();
    }
    if (flashT > 0) {
      ctx.fillStyle = `rgba(255,255,255,${flashT / 0.6})`;
      ctx.fillRect(-20, -20, viewW + 40, H + 40);
    }
  }

  const resize = (): void => {
    const r = canvas.getBoundingClientRect();
    if (!r.width || !r.height) return;
    viewW = Math.max(960, Math.round((H * r.width) / r.height));
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const scale = Math.min(2, Math.max(1, (r.width / viewW) * dpr));
    canvas.width = Math.round(viewW * scale);
    canvas.height = Math.round(H * scale);
  };
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  resize();

  const onKey = (e: KeyboardEvent): void => {
    if (e.code === 'Space' || e.code === 'Enter') {
      e.preventDefault();
      advance();
    } else if (e.code === 'Escape' && skip) finish();
  };
  window.addEventListener('keydown', onKey);
  root.addEventListener('click', () => advance());
  showLine(0);
  raf = requestAnimationFrame(frame);
  // 정리: DOM에서 빠지면 관찰도 멈춘다
  const stopObs = new MutationObserver(() => {
    if (!root.isConnected) {
      ro.disconnect();
      stopObs.disconnect();
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onKey);
    }
  });
  stopObs.observe(host, { childList: true });
}

/** 여러 장면을 이어서 재생 */
export function playScenes(host: Element, scenes: Scene[], opt: Omit<CutsceneOptions, 'onDone'>, onDone: () => void): void {
  const [first, ...rest] = scenes;
  if (!first) return onDone();
  playCutscene(host, first, { ...opt, onDone: () => playScenes(host, rest, opt, onDone) });
}

export interface MarathonOptions {
  heroName: string;
  /** 장면별 챕터 (주인공 외형) */
  chapterOf: (sc: Scene) => number;
  /** 처음 보는 건너뛰기 금지 장면인가 */
  locked: (sc: Scene) => boolean;
  /** 한 장면을 다 봤을 때 (이어보기 위치 저장) */
  onSeen: (sc: Scene, index: number) => void;
  onEnd: () => void;
}

/** 몰아보기: start번째 장면부터 끝까지 차례로 보여준다. 장면마다 건너뛰기, 언제든 그만 보기. */
export function playMarathon(host: Element, scenes: Scene[], start: number, opt: MarathonOptions): void {
  const step = (i: number): void => {
    const sc = scenes[i];
    if (!sc) return opt.onEnd();
    playCutscene(host, sc, {
      heroName: opt.heroName,
      chapter: opt.chapterOf(sc),
      skippable: !opt.locked(sc),
      progress: `${i + 1} / ${scenes.length}`,
      onStop: opt.onEnd,
      onDone: () => { opt.onSeen(sc, i); step(i + 1); },
    });
  };
  step(Math.max(0, Math.min(start, scenes.length - 1)));
}

// ─────────────── 배경 ───────────────

const THEME_OF: Partial<Record<Bg, Theme>> = { haunted: 'haunted', tenure: 'tenure', rain: 'gloom' };

function drawBg(ctx: CanvasRenderingContext2D, bg: Bg, w: number, t: number, sign?: string): void {
  const theme = THEME_OF[bg];
  if (theme) {
    drawThemeBackdrop(ctx, theme, w, GROUND - 10, H, 0, t);
    return;
  }
  const sky: Record<Exclude<Bg, 'haunted' | 'tenure' | 'rain'>, [string, string]> = {
    classroom: ['#fdf6e3', '#f1e6c8'],
    lab: ['#eef3f7', '#dfe7ee'],
    night: ['#1f2440', '#2e3561'],
    office: ['#f3ebe0', '#e2d3bd'],
    conference: ['#2b2f4a', '#3d4370'],
    hall: ['#f6efe2', '#eadcc0'],
    sunny: ['#bde8ff', '#fff3c4'],
  };
  const [c0, c1] = sky[bg as keyof typeof sky];
  const g = ctx.createLinearGradient(0, 0, 0, GROUND);
  g.addColorStop(0, c0);
  g.addColorStop(1, c1);
  ctx.fillStyle = g;
  ctx.fillRect(-20, -20, w + 40, GROUND + 20);
  ctx.lineWidth = 3;
  ctx.strokeStyle = INK;

  switch (bg) {
    case 'classroom': {
      // 칠판과 시간표
      ctx.fillStyle = '#2e5d4b';
      ctx.fillRect(w * 0.2, 30, w * 0.6, 150);
      ctx.strokeRect(w * 0.2, 30, w * 0.6, 150);
      ctx.fillStyle = 'rgba(255,255,255,.75)';
      ctx.font = '26px Jua, sans-serif';
      ctx.fillText('연구실 인턴 모집 (경력 우대 X)', w * 0.24, 85);
      ctx.fillText('∫ 커피 dt = 졸업', w * 0.24, 135);
      break;
    }
    case 'lab':
    case 'night': {
      const night = bg === 'night';
      // 창문
      for (let i = 0; i < Math.ceil(w / 320); i++) {
        const x = 60 + i * 320;
        ctx.fillStyle = night ? '#0e1230' : '#cdeffd';
        ctx.fillRect(x, 40, 150, 110);
        ctx.strokeRect(x, 40, 150, 110);
        if (night) {
          ctx.fillStyle = '#fff59d';
          ctx.beginPath();
          ctx.arc(x + 110, 75, 14, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.beginPath();
        ctx.moveTo(x + 75, 40);
        ctx.lineTo(x + 75, 150);
        ctx.stroke();
      }
      // 책상과 모니터
      for (let i = 0; i < Math.ceil(w / 260); i++) {
        const x = 30 + i * 260;
        ctx.fillStyle = '#a1887f';
        ctx.fillRect(x, 250, 200, 18);
        ctx.strokeRect(x, 250, 200, 18);
        ctx.fillStyle = '#37474f';
        ctx.fillRect(x + 50, 190, 80, 55);
        ctx.strokeRect(x + 50, 190, 80, 55);
        ctx.fillStyle = night ? '#4fc3f7' : '#80deea';
        ctx.globalAlpha = 0.6 + 0.4 * Math.abs(Math.sin(t * 2 + i));
        ctx.fillRect(x + 56, 196, 68, 43);
        ctx.globalAlpha = 1;
        // 커피컵
        ctx.fillStyle = '#fff';
        ctx.fillRect(x + 150, 232, 16, 18);
        ctx.strokeRect(x + 150, 232, 16, 18);
      }
      if (night) {
        ctx.fillStyle = 'rgba(10,10,40,.25)';
        ctx.fillRect(-20, -20, w + 40, GROUND + 20);
      }
      break;
    }
    case 'office': {
      // 책장
      for (let i = 0; i < Math.ceil(w / 240); i++) {
        const x = 20 + i * 240;
        ctx.fillStyle = '#795548';
        ctx.fillRect(x, 40, 180, 240);
        ctx.strokeRect(x, 40, 180, 240);
        for (let r = 0; r < 4; r++) {
          for (let b = 0; b < 8; b++) {
            ctx.fillStyle = ['#e57373', '#64b5f6', '#81c784', '#ffd54f', '#ba68c8'][(b + r + i) % 5]!;
            ctx.fillRect(x + 10 + b * 20, 48 + r * 58, 15, 46);
          }
        }
      }
      break;
    }
    case 'conference': {
      // 무대와 현수막, 스포트라이트
      ctx.fillStyle = '#c62828';
      ctx.fillRect(w * 0.15, 20, w * 0.7, 66);
      ctx.strokeRect(w * 0.15, 20, w * 0.7, 66);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 40px Jua, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(sign ?? '학술대회', w / 2, 67);
      ctx.textAlign = 'left';
      ctx.fillStyle = 'rgba(255,253,200,.12)';
      for (const sx of [0.3, 0.7]) {
        ctx.beginPath();
        ctx.moveTo(w * sx - 20, 0);
        ctx.lineTo(w * sx + 20, 0);
        ctx.lineTo(w * sx + 160 + Math.sin(t) * 30, GROUND);
        ctx.lineTo(w * sx - 160 + Math.sin(t) * 30, GROUND);
        ctx.fill();
      }
      // 객석 머리들
      ctx.fillStyle = '#1a1c30';
      for (let x = 10; x < w; x += 38) {
        ctx.beginPath();
        ctx.arc(x, GROUND + 40, 18, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'hall': {
      // 학위수여식 강당: 기둥과 현수막
      for (let i = 0; i < Math.ceil(w / 200) + 1; i++) {
        ctx.fillStyle = '#efe6d2';
        ctx.fillRect(i * 200 + 20, 20, 40, GROUND - 25);
        ctx.strokeRect(i * 200 + 20, 20, 40, GROUND - 25);
      }
      ctx.fillStyle = '#1a237e';
      ctx.fillRect(w * 0.25, 30, w * 0.5, 60);
      ctx.strokeRect(w * 0.25, 30, w * 0.5, 60);
      ctx.fillStyle = '#ffd54f';
      ctx.font = 'bold 34px Jua, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('학위 수여식 · 임용식', w / 2, 72);
      ctx.textAlign = 'left';
      break;
    }
    case 'sunny': {
      // 창밖은 여름, 안은 연구실
      ctx.fillStyle = '#ffeb3b';
      ctx.beginPath();
      ctx.arc(w * 0.8, 70, 36 + Math.sin(t * 2) * 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#4fc3f7';
      ctx.fillRect(-20, 190, w + 40, 60);
      ctx.fillStyle = '#ffe0b2';
      ctx.fillRect(-20, 240, w + 40, 40);
      // 창틀 (안에서 바라보는 바다)
      ctx.strokeStyle = '#8d6e63';
      ctx.lineWidth = 16;
      ctx.strokeRect(20, 20, w - 40, 270);
      ctx.lineWidth = 3;
      ctx.strokeStyle = INK;
      break;
    }
  }
  // 바닥
  const dark = bg === 'night' || bg === 'conference';
  ctx.fillStyle = dark ? '#3a3550' : '#cfc3a8';
  ctx.fillRect(-20, GROUND - 10, w + 40, H - GROUND + 30);
  ctx.fillStyle = dark ? '#2a2640' : '#b8aa8b';
  ctx.fillRect(-20, GROUND - 10, w + 40, 8);
}

const EMOTE_ICON: Record<string, string> = { '💦': 'sweat', '💢': 'anger', '♪': 'note' };

function drawEmote(ctx: CanvasRenderingContext2D, x: number, y: number, emote: string, life: number, t: number): void {
  const pop = life > 1.4 ? 1 + (life - 1.4) * 2.5 : 1;
  ctx.save();
  ctx.globalAlpha = Math.min(1, life * 2);
  ctx.translate(x + 28, y + Math.sin(t * 6) * 3);
  ctx.scale(pop, pop);
  ctx.fillStyle = '#fff';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(0, 0, 24, 20, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-10, 16);
  ctx.lineTo(-18, 28);
  ctx.lineTo(-2, 18);
  ctx.fill();
  // 이모지 대신 손그림 아이콘 (!, ?, …는 글자)
  const icon = EMOTE_ICON[emote];
  const img = icon ? iconImg(icon) : null;
  if (img) ctx.drawImage(img, -14, -14, 28, 28);
  else {
    ctx.font = 'bold 22px Jua, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = INK;
    ctx.fillText(icon ? '' : emote, 0, 1);
  }
  ctx.restore();
}
