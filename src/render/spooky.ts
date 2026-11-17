/**
 * 외전용 으스스한 배경. 전투(바닥 y=440, 가로 스크롤)와 컷신(바닥 y=345)에서 같이 쓴다.
 * 무작위 대신 시간 기반 해시를 써서 프레임마다 깜빡임이 일정하게 이어진다.
 */
import type { Theme } from '../data/stages';
import { getLang, tr } from '../i18n';
import { INK } from './characters';

type Ctx = CanvasRenderingContext2D;

const hash = (n: number): number => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

/** 번개 세기 0~1 (약 9초마다 두 번 번쩍) */
export function lightning(t: number): number {
  const p = t % 9.3;
  if (p < 0.08) return 1;
  if (p > 0.18 && p < 0.26) return 0.6;
  return p < 0.6 ? Math.max(0, 0.25 - (p - 0.26)) : 0;
}

/** 형광등 깜빡임: 대부분 켜져 있다가 가끔 꺼진다 */
export function flicker(t: number, seed = 0): number {
  const k = Math.floor(t * 9 + seed * 13);
  const h = hash(k + seed * 7.7);
  if (h < 0.07) return 0.05;
  if (h < 0.14) return 0.45;
  return 1;
}

/**
 * 테마 배경을 그린다.
 * @param w 화면 너비, @param ground 바닥 y, @param h 화면 높이, @param scroll 원경 스크롤(px), @param t 시간(초)
 */
export function drawThemeBackdrop(ctx: Ctx, theme: Theme, w: number, ground: number, h: number, scroll: number, t: number): void {
  if (theme === 'haunted') haunted(ctx, w, ground, h, scroll, t);
  else if (theme === 'tenure') tenure(ctx, w, ground, h, scroll, t);
  else gloom(ctx, w, ground, h, scroll, t);
}

function sky(ctx: Ctx, w: number, ground: number, c0: string, c1: string): void {
  const g = ctx.createLinearGradient(0, 0, 0, ground);
  g.addColorStop(0, c0);
  g.addColorStop(1, c1);
  ctx.fillStyle = g;
  ctx.fillRect(-20, -20, w + 40, ground + 20);
}

function floor(ctx: Ctx, w: number, ground: number, h: number, scroll: number, top: string, bottom: string, line = 'rgba(255,255,255,.05)'): void {
  const fg = ctx.createLinearGradient(0, ground, 0, h);
  fg.addColorStop(0, top);
  fg.addColorStop(1, bottom);
  ctx.fillStyle = fg;
  ctx.fillRect(-20, ground, w + 40, h - ground + 20);
  ctx.strokeStyle = line;
  ctx.lineWidth = 1;
  const off = -(scroll * 2 % 60);
  for (let x = off; x < w + 60; x += 60) {
    ctx.beginPath();
    ctx.moveTo(x, ground);
    ctx.lineTo(x - 30, h);
    ctx.stroke();
  }
}

// ─────────────── 대학원 괴담: 새벽 3시의 복도 ───────────────

function haunted(ctx: Ctx, w: number, ground: number, h: number, scroll: number, t: number): void {
  sky(ctx, w, ground, '#0b0a1a', '#1d1936');
  const top = ground - 340;
  ctx.save();
  ctx.translate(-scroll, 0);
  const first = Math.floor(scroll / 300) - 1;
  for (let i = first; i < first + Math.ceil(w / 300) + 3; i++) {
    const x = i * 300;
    const kind = ((i % 4) + 4) % 4;
    if (kind === 0) {
      // 아치형 창문과 달, 흐르는 구름
      ctx.fillStyle = '#141433';
      ctx.beginPath();
      ctx.moveTo(x + 40, top + 230);
      ctx.lineTo(x + 40, top + 90);
      ctx.arc(x + 110, top + 90, 70, Math.PI, 0);
      ctx.lineTo(x + 180, top + 230);
      ctx.closePath();
      ctx.fill();
      ctx.save();
      ctx.clip();
      ctx.fillStyle = '#fff8e1';
      ctx.shadowColor = '#fff8e1';
      ctx.shadowBlur = 25;
      ctx.beginPath();
      ctx.arc(x + 130, top + 90, 26, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(40,40,70,.85)';
      const cx = x + ((t * 12 + i * 40) % 260) - 40;
      ctx.beginPath();
      ctx.ellipse(cx, top + 100, 40, 9, 0, 0, Math.PI * 2);
      ctx.ellipse(cx + 30, top + 92, 26, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.strokeStyle = '#2b2546';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(x + 110, top + 20);
      ctx.lineTo(x + 110, top + 230);
      ctx.moveTo(x + 40, top + 140);
      ctx.lineTo(x + 180, top + 140);
      ctx.stroke();
      // 바닥에 떨어지는 달빛
      ctx.fillStyle = 'rgba(200,210,255,.05)';
      ctx.beginPath();
      ctx.moveTo(x + 40, top + 230);
      ctx.lineTo(x + 180, top + 230);
      ctx.lineTo(x + 260, ground + 60);
      ctx.lineTo(x + 100, ground + 60);
      ctx.fill();
    } else if (kind === 2) {
      // 살짝 열린 문: 안에서 빨간 빛과 눈
      ctx.fillStyle = '#211c33';
      ctx.fillRect(x + 50, ground - 190, 90, 190);
      ctx.fillStyle = '#4a0d12';
      ctx.fillRect(x + 50, ground - 190, 14, 190);
      const glow = 0.5 + 0.5 * Math.sin(t * 1.7 + i);
      ctx.fillStyle = `rgba(255,23,68,${0.18 + glow * 0.2})`;
      ctx.fillRect(x + 50, ground - 190, 14, 190);
      if (Math.sin(t * 0.9 + i * 2) > -0.2 && hash(Math.floor(t * 2) + i) > 0.08) {
        ctx.fillStyle = '#ff5252';
        ctx.beginPath();
        ctx.arc(x + 55, ground - 130, 2.2, 0, Math.PI * 2);
        ctx.arc(x + 61, ground - 130, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#d7ccc8';
      ctx.fillRect(x + 78, ground - 175, 40, 14);
      ctx.fillStyle = '#4e342e';
      ctx.font = '11px Jua, sans-serif';
      ctx.fillText(tr(['404호', '444호', '4호'][((i % 3) + 3) % 3]!, ['Rm 404', 'Rm 444', 'Rm 4'][((i % 3) + 3) % 3]!), x + 84, ground - 164);
      // 게시판의 찢어진 공지
      ctx.fillStyle = '#e0e0e0';
      ctx.save();
      ctx.translate(x + 175, ground - 170);
      ctx.rotate(Math.sin(t * 2 + i) * 0.05);
      ctx.fillRect(0, 0, 50, 62);
      ctx.fillStyle = '#b71c1c';
      ctx.font = '9px Jua, sans-serif';
      ctx.fillText(tr('야간 출입', 'NO ENTRY'), 6, 18);
      ctx.fillText(tr('금지', 'AT NIGHT'), 6, 32);
      ctx.fillStyle = '#9e9e9e';
      ctx.fillText(tr('…왜?', '…why?'), 6, 50);
      ctx.restore();
    } else {
      // 졸업 예정 액자: 눈동자가 따라온다
      const fx = x + 90;
      const fy = top + 110;
      ctx.fillStyle = '#5d4037';
      ctx.fillRect(fx - 4, fy - 4, 78, 96);
      ctx.fillStyle = '#2d2a3d';
      ctx.fillRect(fx + 4, fy + 4, 62, 72);
      ctx.fillStyle = '#9e9e9e';
      ctx.beginPath();
      ctx.arc(fx + 35, fy + 38, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(fx + 17, fy + 54, 36, 22);
      const look = Math.sin(t * 0.6 + i) * 3;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(fx + 29, fy + 36, 3.4, 0, Math.PI * 2);
      ctx.arc(fx + 41, fy + 36, 3.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#b71c1c';
      ctx.beginPath();
      ctx.arc(fx + 29 + look * 0.5, fy + 36, 1.6, 0, Math.PI * 2);
      ctx.arc(fx + 41 + look * 0.5, fy + 36, 1.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#d7ccc8';
      ctx.font = '9px Jua, sans-serif';
      ctx.fillText(tr(kind === 1 ? '졸업 예정 (2011)' : '졸업 예정 (2009)', kind === 1 ? 'Grad. exp. 2011' : 'Grad. exp. 2009'), fx - 2, fy + 106);
      // 거미줄
      ctx.strokeStyle = 'rgba(220,220,240,.25)';
      ctx.lineWidth = 1;
      for (let r = 10; r <= 40; r += 10) {
        ctx.beginPath();
        ctx.arc(x, top, r, 0, Math.PI / 2);
        ctx.stroke();
      }
      for (let a = 0; a <= 4; a++) {
        ctx.beginPath();
        ctx.moveTo(x, top);
        ctx.lineTo(x + Math.cos((a * Math.PI) / 8) * 44, top + Math.sin((a * Math.PI) / 8) * 44);
        ctx.stroke();
      }
    }
    // 천장 형광등 (깜빡)
    const on = flicker(t, i);
    ctx.fillStyle = `rgba(220,240,255,${0.25 + on * 0.7})`;
    ctx.fillRect(x + 120, top - 40, 80, 6);
    if (on > 0.3) {
      ctx.fillStyle = `rgba(200,230,255,${0.05 * on})`;
      ctx.beginPath();
      ctx.moveTo(x + 120, top - 34);
      ctx.lineTo(x + 200, top - 34);
      ctx.lineTo(x + 260, ground);
      ctx.lineTo(x + 60, ground);
      ctx.fill();
    }
  }
  ctx.restore();
  // 떠다니는 도깨비불
  for (let k = 0; k < 9; k++) {
    const life = (t * 0.12 + hash(k) ) % 1;
    const px = (hash(k + 3) * (w + 200) - scroll * 0.3 % (w + 200) + w + 200) % (w + 200) - 100;
    const py = ground - life * (ground - 40);
    ctx.fillStyle = `rgba(150,170,255,${Math.sin(life * Math.PI) * 0.35})`;
    ctx.beginPath();
    ctx.arc(px + Math.sin(t * 2 + k) * 12, py, 2.5 + hash(k + 9) * 2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#16131f';
  ctx.fillRect(-20, ground - 8, w + 40, 8);
  floor(ctx, w, ground, h, scroll, '#211d30', '#120f1c');
}

// ─────────────── 조교수 생존기: 밤의 심사장 ───────────────

function tenure(ctx: Ctx, w: number, ground: number, h: number, scroll: number, t: number): void {
  sky(ctx, w, ground, '#170d09', '#3a241c');
  const top = ground - 340;
  ctx.save();
  ctx.translate(-scroll, 0);
  const first = Math.floor(scroll / 260) - 1;
  for (let i = first; i < first + Math.ceil(w / 260) + 3; i++) {
    const x = i * 260;
    // 나무 벽 패널
    ctx.fillStyle = '#2b1810';
    ctx.fillRect(x + 6, top + 40, 248, ground - top - 50);
    ctx.strokeStyle = '#4e342e';
    ctx.lineWidth = 3;
    ctx.strokeRect(x + 16, top + 50, 228, ground - top - 70);
    // 역대 교수 초상화: 가끔 눈이 빛난다
    const px = x + 90;
    const py = top + 80;
    ctx.fillStyle = '#c9a227';
    ctx.fillRect(px - 6, py - 6, 82, 102);
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(px, py, 70, 90);
    ctx.fillStyle = '#3e3e3e';
    ctx.beginPath();
    ctx.arc(px + 35, py + 36, 17, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(px + 14, py + 54, 42, 36);
    const glare = Math.sin(t * 0.8 + i * 1.9) > 0.75;
    ctx.fillStyle = glare ? '#ffeb3b' : '#616161';
    ctx.fillRect(px + 25, py + 32, 8, 5);
    ctx.fillRect(px + 38, py + 32, 8, 5);
    ctx.fillStyle = '#c9a227';
    ctx.font = '9px Jua, sans-serif';
    ctx.fillText(tr(`명예교수 ${['김', '이', '박', '최'][((i % 4) + 4) % 4]}`, `Emeritus ${['Kim', 'Lee', 'Park', 'Choi'][((i % 4) + 4) % 4]}`), px + 8, py + 108);
    // 촛대 조명
    const fl = 0.75 + 0.25 * Math.sin(t * 9 + i * 3) * Math.sin(t * 5.3 + i);
    const cx = x + 30;
    ctx.fillStyle = '#8d6e63';
    ctx.fillRect(cx - 3, top + 150, 6, 30);
    const g = ctx.createRadialGradient(cx, top + 140, 2, cx, top + 140, 60 * fl);
    g.addColorStop(0, 'rgba(255,183,77,.55)');
    g.addColorStop(1, 'rgba(255,183,77,0)');
    ctx.fillStyle = g;
    ctx.fillRect(cx - 70, top + 70, 140, 140);
    ctx.fillStyle = '#ffcc80';
    ctx.beginPath();
    ctx.ellipse(cx, top + 142, 3.5, 7 * fl, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  // 흔들리는 샹들리에와 시계 (화면 고정)
  const sw = Math.sin(t * 0.8) * 0.06;
  ctx.save();
  ctx.translate(w * 0.36, -24);
  ctx.rotate(sw);
  ctx.strokeStyle = '#6d4c41';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, 70);
  ctx.stroke();
  ctx.fillStyle = '#c9a227';
  ctx.beginPath();
  ctx.ellipse(0, 78, 46, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  for (let k = -2; k <= 2; k++) {
    ctx.fillStyle = `rgba(255,213,79,${0.55 + 0.3 * Math.sin(t * 7 + k)})`;
    ctx.beginPath();
    ctx.arc(k * 20, 66, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  // 11:59에 멈춘 시계
  const clx = w * 0.82;
  const cly = 70;
  ctx.fillStyle = '#efebe9';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(clx, cly, 26, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(clx, cly);
  ctx.lineTo(clx - 1, cly - 18);
  ctx.moveTo(clx, cly);
  const sec = Math.floor(t) % 2 ? -0.1 : 0;
  ctx.lineTo(clx + Math.sin(-0.1 + sec) * 22, cly - Math.cos(-0.1 + sec) * 22);
  ctx.stroke();
  // 레드카펫 바닥
  ctx.fillStyle = '#120a06';
  ctx.fillRect(-20, ground - 8, w + 40, 8);
  floor(ctx, w, ground, h, scroll, '#2a1a12', '#140b07', 'rgba(255,200,150,.05)');
  ctx.fillStyle = 'rgba(183,28,28,.55)';
  ctx.fillRect(-20, ground + (h - ground) * 0.3, w + 40, (h - ground) * 0.35);
  ctx.fillStyle = 'rgba(255,213,79,.35)';
  ctx.fillRect(-20, ground + (h - ground) * 0.3, w + 40, 2);
  ctx.fillRect(-20, ground + (h - ground) * 0.65, w + 40, 2);
}

// ─────────────── 연구자의 고충: 비 오는 밤의 연구실 ───────────────

function gloom(ctx: Ctx, w: number, ground: number, h: number, scroll: number, t: number): void {
  sky(ctx, w, ground, '#0c141c', '#1f2c38');
  const L = lightning(t);
  const top = ground - 330;
  ctx.save();
  ctx.translate(-scroll, 0);
  const first = Math.floor(scroll / 340) - 1;
  for (let i = first; i < first + Math.ceil(w / 340) + 3; i++) {
    const x = i * 340;
    // 큰 창문: 비와 번개
    ctx.fillStyle = `rgb(${18 + L * 150},${28 + L * 150},${40 + L * 160})`;
    ctx.fillRect(x + 30, top + 30, 170, 170);
    ctx.save();
    ctx.beginPath();
    ctx.rect(x + 30, top + 30, 170, 170);
    ctx.clip();
    if (L > 0.5) {
      ctx.strokeStyle = 'rgba(255,255,255,.9)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      let lx = x + 80 + hash(i) * 60;
      ctx.moveTo(lx, top + 30);
      for (let y = top + 50; y < top + 200; y += 22) {
        lx += (hash(y + i) - 0.5) * 30;
        ctx.lineTo(lx, y);
      }
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(170,200,230,.35)';
    ctx.lineWidth = 1;
    for (let k = 0; k < 22; k++) {
      const rx = x + 30 + hash(k + i * 31) * 170;
      const ry = top + 30 + ((t * 420 + hash(k * 3 + i) * 400) % 200);
      ctx.beginPath();
      ctx.moveTo(rx, ry);
      ctx.lineTo(rx - 3, ry + 12);
      ctx.stroke();
    }
    ctx.restore();
    ctx.strokeStyle = '#2c3e50';
    ctx.lineWidth = 6;
    ctx.strokeRect(x + 30, top + 30, 170, 170);
    ctx.beginPath();
    ctx.moveTo(x + 115, top + 30);
    ctx.lineTo(x + 115, top + 200);
    ctx.stroke();
    // 달력: 빨간 X와 D-???
    const cx = x + 230;
    const cy = top + 60;
    ctx.fillStyle = '#eceff1';
    ctx.fillRect(cx, cy, 80, 76);
    ctx.fillStyle = '#c62828';
    ctx.fillRect(cx, cy, 80, 14);
    ctx.fillStyle = '#fff';
    ctx.font = '9px Jua, sans-serif';
    ctx.fillText(tr('졸업 D-???', 'Grad in ??? d'), cx + 12, cy + 11);
    ctx.strokeStyle = '#e53935';
    ctx.lineWidth = 1.5;
    for (let d = 0; d < 15; d++) {
      const dx = cx + 6 + (d % 5) * 15;
      const dy = cy + 22 + Math.floor(d / 5) * 16;
      ctx.beginPath();
      ctx.moveTo(dx, dy);
      ctx.lineTo(dx + 8, dy + 8);
      ctx.moveTo(dx + 8, dy);
      ctx.lineTo(dx, dy + 8);
      ctx.stroke();
    }
    // 포스트잇
    const notes = getLang() === 'en' ? ['Graduate when?', 'No results', 'Revision #3', 'Just me?'] : ['언제 졸업해?', '결과 안 나옴', '리비전 3차', '나만 못하나'];
    const note = notes[((i % 4) + 4) % 4]!;
    ctx.save();
    ctx.translate(cx + 6, cy + 100);
    ctx.rotate(Math.sin(i * 2.1) * 0.12);
    ctx.fillStyle = '#fff59d';
    ctx.fillRect(0, 0, 70, 34);
    ctx.fillStyle = '#5d4037';
    ctx.font = '10px Jua, sans-serif';
    ctx.fillText(note, 5, 21);
    ctx.restore();
    // 책상 스탠드 불빛
    const lx = x + 120;
    const g = ctx.createRadialGradient(lx, ground - 60, 4, lx, ground - 60, 120);
    g.addColorStop(0, 'rgba(255,224,130,.28)');
    g.addColorStop(1, 'rgba(255,224,130,0)');
    ctx.fillStyle = g;
    ctx.fillRect(lx - 130, ground - 190, 260, 200);
    ctx.fillStyle = '#4e342e';
    ctx.fillRect(lx - 70, ground - 50, 140, 10);
    ctx.fillStyle = '#263238';
    ctx.fillRect(lx + 30, ground - 92, 4, 42);
    ctx.beginPath();
    ctx.moveTo(lx + 16, ground - 92);
    ctx.lineTo(lx + 48, ground - 92);
    ctx.lineTo(lx + 40, ground - 104);
    ctx.lineTo(lx + 24, ground - 104);
    ctx.fill();
  }
  ctx.restore();
  ctx.fillStyle = '#0b1218';
  ctx.fillRect(-20, ground - 8, w + 40, 8);
  floor(ctx, w, ground, h, scroll, '#1c2833', '#0e151c');
  // 바닥 물웅덩이
  ctx.fillStyle = `rgba(150,180,210,${0.08 + L * 0.2})`;
  for (let k = 0; k < 4; k++) {
    const px = ((hash(k + 50) * (w + 300) - scroll) % (w + 300) + w + 300) % (w + 300) - 150;
    ctx.beginPath();
    ctx.ellipse(px, ground + 30 + k * 14, 60, 6, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // 번개 순간 전체 밝기
  if (L > 0) {
    ctx.fillStyle = `rgba(220,235,255,${L * 0.12})`;
    ctx.fillRect(-20, -20, w + 40, h + 40);
  }
}

/** 빛 하나 */
export interface Light { x: number; y: number; r: number }

let darkCanvas: HTMLCanvasElement | null = null;

/** 정전: 화면 전체를 어둡게 덮고 빛이 닿는 곳만 뚫는다 (화면 좌표). */
export function drawDarkness(ctx: Ctx, w: number, h: number, lights: Light[], t: number): void {
  if (typeof document === 'undefined') return;
  if (!darkCanvas) darkCanvas = document.createElement('canvas');
  const k = ctx.getTransform().a || 1;
  const cw = Math.max(1, Math.round(w * k));
  const ch = Math.max(1, Math.round(h * k));
  if (darkCanvas.width !== cw || darkCanvas.height !== ch) {
    darkCanvas.width = cw;
    darkCanvas.height = ch;
  }
  const d = darkCanvas.getContext('2d')!;
  d.setTransform(k, 0, 0, k, 0, 0);
  d.globalCompositeOperation = 'source-over';
  d.clearRect(0, 0, w, h);
  // 가끔 형광등이 완전히 나가 더 깜깜해진다
  const out = flicker(t, 99) < 0.5 ? 0.95 : 0.84;
  d.fillStyle = `rgba(4,3,14,${out})`;
  d.fillRect(0, 0, w, h);
  d.globalCompositeOperation = 'destination-out';
  for (const l of lights) {
    const g = d.createRadialGradient(l.x, l.y, l.r * 0.25, l.x, l.y, l.r);
    g.addColorStop(0, 'rgba(0,0,0,1)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    d.fillStyle = g;
    d.fillRect(l.x - l.r, l.y - l.r, l.r * 2, l.r * 2);
  }
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(darkCanvas, 0, 0);
  ctx.restore();
}
