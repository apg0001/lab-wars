import type { Look } from '../data/types';
import { COSMETIC_BY_ID, type Outfit } from '../data/cosmetics';
import { tr } from '../i18n';
import { drawSideFoe } from './side-looks';

/** 낙서풍 외곽선 색 */
export const INK = '#2b2430';
const SKIN = '#ffe0c2';

type Ctx = CanvasRenderingContext2D;

export interface Pose {
  /** 걷기 위상 */
  walk: number;
  /** 공격 모션 1→0 */
  swing: number;
  /** 진화 단계 1~3 */
  tier: number;
  /** 시간(초) — 프로펠러 등 상시 애니메이션 */
  time: number;
  moving: boolean;
}

/**
 * 좌우 반전된 상태에서도 글자가 뒤집히지 않게 쓴다. x는 왼쪽 기준.
 * en을 주면 영어일 때 그 글자를 원문과 같은 가운데에, 원문 폭에 맞춰 (너무 길면 좁혀) 쓴다.
 */
export function label(ctx: Ctx, text: string, x: number, y: number, en?: string): void {
  const w = ctx.measureText(text).width;
  const cx = x + w / 2;
  const shown = en ? tr(text, en) : text;
  const sw = ctx.measureText(shown).width;
  const squeeze = sw > w * 1.2 ? (w * 1.2) / sw : 1;
  ctx.save();
  ctx.textAlign = 'center';
  text = shown;
  if (squeeze !== 1) {
    ctx.translate(cx, y);
    ctx.scale(squeeze, 1);
    ctx.translate(-cx, -y);
  }
  if (ctx.getTransform().a < 0) {
    ctx.scale(-1, 1);
    ctx.fillText(text, -cx, y);
  } else {
    ctx.fillText(text, cx, y);
  }
  ctx.restore();
}

export function line(ctx: Ctx, w = 2.5): void {
  ctx.strokeStyle = INK;
  ctx.lineWidth = w;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
}

export function blob(ctx: Ctx, x: number, y: number, rx: number, ry: number, fill: string): void {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.stroke();
}

export function rrect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number, fill: string): void {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.stroke();
}

export function eyes(ctx: Ctx, x: number, y: number, gap: number, angry = false, size = 2.2): void {
  ctx.fillStyle = INK;
  for (const dx of [-gap, gap]) {
    ctx.beginPath();
    ctx.arc(x + dx, y, size, 0, Math.PI * 2);
    ctx.fill();
  }
  if (angry) {
    ctx.beginPath();
    ctx.moveTo(x - gap - 4, y - 6);
    ctx.lineTo(x - gap + 3, y - 3);
    ctx.moveTo(x + gap + 4, y - 6);
    ctx.lineTo(x + gap - 3, y - 3);
    ctx.stroke();
  }
}

export function legs(ctx: Ctx, pose: Pose, spread = 6, len = 8, color = '#455a64'): void {
  const k = pose.moving ? Math.sin(pose.walk * 2) * 4 : 0;
  ctx.lineWidth = 4.5;
  ctx.strokeStyle = INK;
  for (const [dx, ph] of [[-spread / 2, k], [spread / 2, -k]] as const) {
    ctx.beginPath();
    ctx.moveTo(dx, -len);
    ctx.lineTo(dx + ph, 0);
    ctx.stroke();
  }
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = color;
}

/** 박사(3단계) 학사모 */
function gradCap(ctx: Ctx, x: number, y: number): void {
  line(ctx, 2);
  ctx.fillStyle = '#212121';
  ctx.beginPath();
  ctx.moveTo(x - 15, y);
  ctx.lineTo(x, y - 6);
  ctx.lineTo(x + 15, y);
  ctx.lineTo(x, y + 6);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = '#ffca28';
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x + 12, y + 2, x + 11, y + 12);
  ctx.stroke();
  line(ctx);
}

function glasses(ctx: Ctx, x: number, y: number): void {
  line(ctx, 1.8);
  ctx.beginPath();
  ctx.arc(x - 5, y, 3.8, 0, Math.PI * 2);
  ctx.moveTo(x + 8.8, y);
  ctx.arc(x + 5, y, 3.8, 0, Math.PI * 2);
  ctx.moveTo(x - 1.2, y);
  ctx.lineTo(x + 1.2, y);
  ctx.stroke();
  line(ctx);
}

/** 진화 단계 표식: 2단계 은색, 3단계 금색 외곽 후광 */
function tierGlow(ctx: Ctx, tier: number, x: number, y: number, r: number): void {
  if (tier < 2) return;
  ctx.save();
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = tier === 3 ? '#ffd54f' : '#cfd8dc';
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// ─────────────────────────── 아군 ───────────────────────────

function student(ctx: Ctx, look: Look, pose: Pose): void {
  const sw = pose.swing;
  tierGlow(ctx, pose.tier, 0, -26, 26);
  line(ctx);
  legs(ctx, pose);
  // 몸통 (후드티 / 실험 가운)
  rrect(ctx, -10, -27, 20, 20, 7, look.color);
  if (look.prop === 'flask') {
    ctx.beginPath();
    ctx.moveTo(0, -27);
    ctx.lineTo(0, -8);
    ctx.stroke();
  }
  // 머리
  const hy = -40;
  blob(ctx, 0, hy, 13, 12.5, SKIN);
  // 머리카락
  ctx.fillStyle = '#3e2723';
  ctx.beginPath();
  ctx.ellipse(-1, hy - 6, 13, 7.5, 0, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  eyes(ctx, 3, hy + 1, 4.5, false, 1.9);
  // 볼터치
  ctx.fillStyle = 'rgba(255,120,120,.45)';
  ctx.beginPath();
  ctx.arc(9.5, hy + 5, 2.4, 0, Math.PI * 2);
  ctx.fill();
  if (pose.tier >= 2) glasses(ctx, 3, hy + 1);
  if (look.prop === 'headband') {
    ctx.fillStyle = '#e53935';
    ctx.fillRect(-13, hy - 6, 26, 4.5);
    ctx.strokeRect(-13, hy - 6, 26, 4.5);
    ctx.beginPath();
    ctx.moveTo(-13, hy - 4);
    ctx.lineTo(-20, hy - 1);
    ctx.stroke();
  }
  if (pose.tier >= 3 && !capHidden) gradCap(ctx, 0, hy - 12);

  // 소품 (공격 시 앞으로 휘두름)
  const px = 11 + sw * 7;
  const py = -20 - sw * 6;
  switch (look.prop) {
    case 'keyboard':
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(-0.9 * sw);
      rrect(ctx, -2, -4, 22, 8, 2, '#eceff1');
      ctx.fillStyle = INK;
      for (let i = 0; i < 4; i++) ctx.fillRect(1 + i * 4.5, -1.5, 2.5, 2.5);
      ctx.restore();
      break;
    case 'laptop':
      rrect(ctx, 6, -22, 15, 10, 2, '#cfd8dc');
      ctx.fillStyle = '#80deea';
      ctx.fillRect(8, -20, 11, 6);
      break;
    case 'shield':
      ctx.save();
      ctx.translate(13, -24);
      for (let i = 0; i < 4; i++) rrect(ctx, -3 + (i % 2), -2 + i * 5.5, 12, 6, 1, i % 2 ? '#fff8e1' : '#ffffff');
      ctx.restore();
      break;
    case 'flask':
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(-1.4 * sw);
      ctx.beginPath();
      ctx.moveTo(-2, -10);
      ctx.lineTo(2, -10);
      ctx.lineTo(7, 2);
      ctx.lineTo(-7, 2);
      ctx.closePath();
      ctx.fillStyle = look.accent ?? '#69f0ae';
      ctx.fill();
      ctx.stroke();
      ctx.restore();
      break;
    case 'clipboard':
      rrect(ctx, 8, -26, 12, 15, 2, '#a1887f');
      ctx.fillStyle = '#fff';
      ctx.fillRect(10, -23, 8, 10);
      break;
    case 'headband':
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(-0.6 * sw);
      blob(ctx, 4, 0, 6, 6, SKIN);
      ctx.restore();
      break;
    default:
      blob(ctx, 11 + sw * 6, -17, 4, 4, SKIN);
  }
}

function drone(ctx: Ctx, look: Look, pose: Pose): void {
  tierGlow(ctx, pose.tier, 0, -18, 26);
  line(ctx);
  const bob = Math.sin(pose.time * 6) * 2;
  ctx.translate(0, bob);
  const arms = pose.tier >= 2 ? [-20, -7, 7, 20] : [-16, 16];
  for (const ax of arms) {
    ctx.beginPath();
    ctx.moveTo(0, -18);
    ctx.lineTo(ax, -24);
    ctx.stroke();
    const spin = Math.abs(Math.sin(pose.time * 40 + ax));
    ctx.fillStyle = 'rgba(200,230,255,.8)';
    ctx.beginPath();
    ctx.ellipse(ax, -26, 9 * spin + 2, 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  rrect(ctx, -12, -24, 24, 12, 5, look.color);
  blob(ctx, 4, -15, 4.5, 4.5, look.accent ?? '#4fc3f7');
  if (pose.tier >= 3) {
    ctx.fillStyle = '#ffd54f';
    ctx.fillRect(-10, -22, 6, 3);
  }
}

function gpu(ctx: Ctx, look: Look, pose: Pose): void {
  tierGlow(ctx, pose.tier, 0, -30, 36);
  line(ctx);
  const w = 34 + (pose.tier - 1) * 6;
  const h = 40 + (pose.tier - 1) * 6;
  rrect(ctx, -w / 2, -h - 6, w, h, 4, look.color);
  // 팬
  for (let i = 0; i < 2; i++) {
    const cy = -h + 6 + i * 16;
    blob(ctx, -4, cy, 6, 6, '#263238');
    ctx.save();
    ctx.translate(-4, cy);
    ctx.rotate(pose.time * 20);
    ctx.strokeStyle = '#90a4ae';
    ctx.beginPath();
    ctx.moveTo(-5, 0);
    ctx.lineTo(5, 0);
    ctx.moveTo(0, -5);
    ctx.lineTo(0, 5);
    ctx.stroke();
    ctx.restore();
    line(ctx);
  }
  // LED
  ctx.fillStyle = Math.sin(pose.time * 8) > 0 ? look.accent ?? '#76ff03' : '#33691e';
  for (let i = 0; i < 3; i++) ctx.fillRect(w / 2 - 9, -h + 2 + i * 7, 4, 3);
  // 바퀴
  for (const wx of [-w / 2 + 6, w / 2 - 6]) blob(ctx, wx, -4, 5, 5, '#424242');
  if (pose.tier >= 3) {
    ctx.fillStyle = '#ffd54f';
    ctx.font = 'bold 9px Jua, sans-serif';
    label(ctx, 'SUPER', -w / 2 + 3, -h - 9);
  }
}

function claudy(ctx: Ctx, look: Look, pose: Pose): void {
  tierGlow(ctx, pose.tier, 0, -28, 28);
  line(ctx);
  const bob = Math.sin(pose.time * 3) * 3;
  ctx.translate(0, bob - 4);
  // 구름 같은 둥근 몸
  ctx.fillStyle = look.color;
  ctx.beginPath();
  ctx.arc(-8, -22, 10, 0, Math.PI * 2);
  ctx.arc(8, -22, 10, 0, Math.PI * 2);
  ctx.arc(0, -32, 12, 0, Math.PI * 2);
  ctx.arc(0, -16, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = look.color;
  ctx.beginPath();
  ctx.ellipse(0, -24, 13, 11, 0, 0, Math.PI * 2);
  ctx.fill();
  // 얼굴
  ctx.fillStyle = look.accent ?? '#fff3e0';
  ctx.beginPath();
  ctx.ellipse(2, -26, 9, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  eyes(ctx, 2, -27, 3.5, false, 1.7);
  ctx.beginPath();
  ctx.arc(2, -24, 2.5, 0.2, Math.PI - 0.2);
  ctx.stroke();
  // 빨간 펜
  ctx.save();
  ctx.translate(14, -18);
  ctx.rotate(0.6 - pose.swing);
  rrect(ctx, -1.5, -10, 3, 12, 1, '#e53935');
  ctx.restore();
  if (pose.tier >= 2) {
    ctx.fillStyle = pose.tier === 3 ? '#ffd54f' : '#fff';
    ctx.font = 'bold 8px Jua, sans-serif';
    label(ctx, pose.tier === 3 ? 'MAX' : 'PRO', -8, -42);
  }
}

function codexy(ctx: Ctx, look: Look, pose: Pose): void {
  tierGlow(ctx, pose.tier, 0, -26, 26);
  line(ctx);
  legs(ctx, pose, 8, 7);
  rrect(ctx, -9, -16, 18, 10, 3, '#455a64');
  rrect(ctx, -14, -40, 28, 24, 4, look.color);
  ctx.fillStyle = look.accent ?? '#69f0ae';
  ctx.font = 'bold 11px monospace';
  label(ctx, Math.floor(pose.time * 3) % 2 ? '>_' : '> ', -9, -24);
  if (pose.tier >= 2) {
    ctx.fillStyle = pose.tier === 3 ? '#ffd54f' : '#b0bec5';
    ctx.fillRect(-14, -44, 28, 3);
  }
}

function jaeminai(ctx: Ctx, look: Look, pose: Pose): void {
  tierGlow(ctx, pose.tier, 0, -24, 24);
  line(ctx);
  const bob = Math.sin(pose.time * 5 + pose.walk) * 2;
  ctx.translate(0, bob);
  legs(ctx, pose, 6, 7);
  blob(ctx, 0, -20, 12, 13, look.color);
  // 반짝이 더듬이
  ctx.beginPath();
  ctx.moveTo(0, -33);
  ctx.lineTo(0, -40);
  ctx.stroke();
  ctx.fillStyle = look.accent ?? '#b39ddb';
  ctx.beginPath();
  ctx.moveTo(0, -48);
  ctx.lineTo(3, -42);
  ctx.lineTo(0, -36);
  ctx.lineTo(-3, -42);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  eyes(ctx, 2, -22, 4, false, 2);
  ctx.beginPath();
  ctx.arc(2, -17, 3, 0.1, Math.PI - 0.1);
  ctx.stroke();
  blob(ctx, 12 + pose.swing * 6, -14, 3.5, 3.5, look.color);
  if (pose.tier >= 3 && !capHidden) gradCap(ctx, 0, -33);
}

// ─────────────────────────── 적 ───────────────────────────

function memo(ctx: Ctx, look: Look, pose: Pose): void {
  line(ctx);
  legs(ctx, pose, 8, 6);
  ctx.save();
  ctx.translate(0, -18);
  ctx.rotate(Math.sin(pose.walk * 2) * 0.12);
  rrect(ctx, -12, -12, 24, 24, 2, look.color);
  ctx.strokeStyle = 'rgba(0,0,0,.25)';
  ctx.beginPath();
  ctx.moveTo(-7, 6);
  ctx.lineTo(7, 6);
  ctx.stroke();
  line(ctx);
  eyes(ctx, -2, -2, 4, true, 1.8);
  ctx.restore();
}

function envelope(ctx: Ctx, look: Look, pose: Pose): void {
  line(ctx);
  legs(ctx, pose, 10, 7);
  rrect(ctx, -15, -32, 30, 24, 2, look.color);
  ctx.beginPath();
  ctx.moveTo(-15, -32);
  ctx.lineTo(0, -19);
  ctx.lineTo(15, -32);
  ctx.stroke();
  blob(ctx, 0, -20, 4, 4, look.accent ?? '#e53935');
  eyes(ctx, -3, -27, 5, true, 1.8);
  // 팔
  ctx.beginPath();
  ctx.moveTo(-15, -18);
  ctx.lineTo(-20 - pose.swing * 4, -12);
  ctx.moveTo(15, -18);
  ctx.lineTo(21 + pose.swing * 7, -16);
  ctx.stroke();
}

function clock(ctx: Ctx, look: Look, pose: Pose): void {
  line(ctx);
  legs(ctx, pose, 8, 6);
  blob(ctx, -8, -36, 5, 5, '#ffca28');
  blob(ctx, 8, -36, 5, 5, '#ffca28');
  blob(ctx, 0, -22, 14, 14, look.color);
  blob(ctx, 0, -22, 10, 10, '#fff');
  ctx.beginPath();
  ctx.moveTo(0, -22);
  ctx.lineTo(Math.cos(pose.time * 8) * 7, -22 + Math.sin(pose.time * 8) * 7);
  ctx.moveTo(0, -22);
  ctx.lineTo(0, -28);
  ctx.stroke();
  eyes(ctx, 0, -18, 4, true, 1.5);
}

function plane(ctx: Ctx, look: Look, pose: Pose): void {
  line(ctx, 2);
  const bob = Math.sin(pose.time * 4 + pose.walk) * 3;
  ctx.translate(0, bob - 20);
  ctx.beginPath();
  ctx.moveTo(-18, 0);
  ctx.lineTo(16, -8);
  ctx.lineTo(-10, -4);
  ctx.closePath();
  ctx.fillStyle = look.color;
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-18, 0);
  ctx.lineTo(16, -8);
  ctx.lineTo(-6, 6);
  ctx.closePath();
  ctx.fillStyle = '#e3f2fd';
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = look.accent ?? '#1e88e5';
  ctx.font = 'bold 7px Jua, sans-serif';
  label(ctx, '공문', -8, 2, 'MEMO');
  eyes(ctx, -12, -2, 2.5, true, 1.3);
}

function reviewer(ctx: Ctx, look: Look, pose: Pose): void {
  line(ctx);
  legs(ctx, pose);
  // 후드 망토
  ctx.beginPath();
  ctx.moveTo(0, -50);
  ctx.quadraticCurveTo(-18, -30, -14, -8);
  ctx.lineTo(14, -8);
  ctx.quadraticCurveTo(18, -30, 0, -50);
  ctx.fillStyle = look.color;
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#1c1c1c';
  ctx.beginPath();
  ctx.ellipse(0, -34, 8, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ff5252';
  ctx.fillRect(-5, -36, 3, 2);
  ctx.fillRect(2, -36, 3, 2);
  // #2 배지
  blob(ctx, -6, -18, 6, 6, '#fff');
  ctx.fillStyle = INK;
  ctx.font = 'bold 8px Jua, sans-serif';
  label(ctx, '#2', -10, -15);
  ctx.save();
  ctx.translate(-13, -22);
  ctx.rotate(-0.5 + pose.swing);
  rrect(ctx, -1.5, -12, 3, 14, 1, look.accent ?? '#e53935');
  ctx.restore();
}

function ta(ctx: Ctx, look: Look, pose: Pose): void {
  line(ctx);
  legs(ctx, pose);
  rrect(ctx, -10, -27, 20, 20, 6, look.color);
  ctx.strokeStyle = look.accent ?? '#1565c0';
  ctx.beginPath();
  ctx.moveTo(-5, -27);
  ctx.lineTo(0, -16);
  ctx.lineTo(5, -27);
  ctx.stroke();
  line(ctx);
  rrect(ctx, -3, -17, 6, 7, 1, '#fff');
  blob(ctx, 0, -40, 13, 12.5, SKIN);
  ctx.fillStyle = '#263238';
  ctx.beginPath();
  ctx.ellipse(1, -46, 13, 7.5, 0, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  eyes(ctx, -3, -39, 4.5, true, 1.8);
  glasses(ctx, -3, -39);
  rrect(ctx, -22 - pose.swing * 4, -26, 12, 15, 2, '#a1887f');
}

function paperwork(ctx: Ctx, look: Look, pose: Pose): void {
  line(ctx);
  legs(ctx, pose, 14, 6);
  for (let i = 0; i < 7; i++) {
    const off = Math.sin(i * 1.7) * 2;
    rrect(ctx, -17 + off, -14 - i * 6.5, 34, 7, 1, i % 2 ? '#fffde7' : look.color);
  }
  eyes(ctx, -3, -34, 6, true, 2);
  ctx.save();
  ctx.translate(-6, -22);
  ctx.rotate(-0.2);
  ctx.strokeStyle = look.accent ?? '#c62828';
  ctx.lineWidth = 2;
  ctx.strokeRect(-9, -6, 18, 10);
  ctx.fillStyle = look.accent ?? '#c62828';
  ctx.font = 'bold 7px Jua, sans-serif';
  label(ctx, '반려', -7, 2, 'NO');
  ctx.restore();
}

function binder(ctx: Ctx, look: Look, pose: Pose): void {
  line(ctx);
  legs(ctx, pose, 12, 7);
  rrect(ctx, -16, -48, 32, 40, 3, look.color);
  rrect(ctx, -11, -40, 22, 12, 1, '#fff');
  ctx.fillStyle = INK;
  ctx.font = 'bold 7px Jua, sans-serif';
  label(ctx, '보고서', -10, -31, 'REPORT');
  eyes(ctx, -2, -20, 6, true, 2.2);
  ctx.beginPath();
  ctx.moveTo(16, -30);
  ctx.lineTo(24 + pose.swing * 8, -26 - pose.swing * 6);
  ctx.stroke();
}

function revision(ctx: Ctx, look: Look, pose: Pose): void {
  line(ctx);
  legs(ctx, pose, 8, 6);
  blob(ctx, 0, -22, 14, 14, look.color);
  ctx.beginPath();
  ctx.moveTo(6, -34);
  ctx.quadraticCurveTo(12, -44, 8, -48);
  ctx.stroke();
  ctx.fillStyle = Math.sin(pose.time * 20) > 0 ? '#ffeb3b' : '#ff7043';
  ctx.beginPath();
  ctx.arc(8, -49, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = look.accent ?? '#e53935';
  ctx.font = 'bold 8px Jua, sans-serif';
  label(ctx, '수정', -8, -19, 'FIX');
  eyes(ctx, -1, -27, 4, true, 1.6);
}

function notif(ctx: Ctx, look: Look, pose: Pose): void {
  line(ctx);
  const bob = Math.sin(pose.time * 5 + pose.walk) * 3;
  ctx.translate(0, bob - 16);
  ctx.beginPath();
  ctx.ellipse(0, -8, 16, 12, 0, 0, Math.PI * 2);
  ctx.moveTo(-6, 2);
  ctx.lineTo(-10, 10);
  ctx.lineTo(0, 3);
  ctx.fillStyle = look.color;
  ctx.fill();
  ctx.stroke();
  eyes(ctx, -2, -8, 4.5, true, 1.8);
  blob(ctx, 13, -18, 7, 6, look.accent ?? '#f44336');
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 7px Jua, sans-serif';
  label(ctx, '99+', 7, -15.5);
}

function professor(ctx: Ctx, look: Look, pose: Pose, variant: string): void {
  const isDean = variant === 'dean';
  const isPresident = variant === 'president';
  const isChair = variant === 'chair';
  line(ctx);
  legs(ctx, pose, 10, 12, '#212121');
  // 정장
  if (isPresident) {
    // 총장 학위 가운: 넓은 망토와 금색 줄
    ctx.beginPath();
    ctx.moveTo(-14, -50);
    ctx.lineTo(-24, -6);
    ctx.lineTo(24, -6);
    ctx.lineTo(14, -50);
    ctx.closePath();
    ctx.fillStyle = look.color;
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = look.accent ?? '#ffd54f';
    ctx.lineWidth = 3;
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(sx * 9, -48);
      ctx.lineTo(sx * 15, -8);
      ctx.stroke();
    }
    line(ctx);
  }
  rrect(ctx, -16, -48, 32, 38, 8, look.color);
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.moveTo(-6, -48);
  ctx.lineTo(0, -34);
  ctx.lineTo(6, -48);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#c62828';
  ctx.fillRect(-1.5, -44, 3, 10);
  if (isDean) {
    // 학과장 금목걸이 메달
    ctx.strokeStyle = '#ffd54f';
    ctx.beginPath();
    ctx.moveTo(-10, -48);
    ctx.quadraticCurveTo(0, -28, 10, -48);
    ctx.stroke();
    line(ctx);
    blob(ctx, 0, -31, 4.5, 4.5, '#ffd54f');
  }
  // 머리 (대머리 + 옆머리)
  const hy = -62;
  blob(ctx, 0, hy, 15, 15, SKIN);
  ctx.fillStyle = '#9e9e9e';
  ctx.beginPath();
  ctx.ellipse(-13, hy, 4, 7, 0, 0, Math.PI * 2);
  ctx.ellipse(13, hy, 4, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  glasses(ctx, 2, hy - 1);
  eyes(ctx, 2, hy - 1, 5, true, 1.5);
  // 콧수염
  ctx.fillStyle = '#5d4037';
  ctx.beginPath();
  ctx.ellipse(2, hy + 7, 7, 2.5, 0, 0, Math.PI * 2);
  ctx.fill();
  // 손가락질
  ctx.save();
  ctx.translate(-16, -40);
  ctx.rotate(-0.4 - pose.swing * 0.8);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-14, 6);
  ctx.stroke();
  blob(ctx, -15, 6, 3.5, 3.5, SKIN);
  ctx.restore();
  if (isChair) {
    // 학회 명찰과 마이크
    ctx.strokeStyle = '#4db6ac';
    ctx.beginPath();
    ctx.moveTo(-8, -48);
    ctx.lineTo(-3, -30);
    ctx.lineTo(3, -48);
    ctx.stroke();
    line(ctx);
    rrect(ctx, -9, -32, 12, 9, 1, '#fff');
    ctx.fillStyle = '#00695c';
    ctx.font = 'bold 5px Jua, sans-serif';
    label(ctx, '학회', -7, -26, 'CONF');
    ctx.save();
    ctx.translate(15, -36);
    ctx.rotate(0.3 - pose.swing * 0.5);
    rrect(ctx, -2, -2, 4, 14, 1, '#424242');
    blob(ctx, 0, -5, 5, 5, '#9e9e9e');
    ctx.restore();
  }
  if (variant === 'tenure') {
    // 테뉴어 심사: 두꺼운 업적 평가 파일과 빛나는 안경
    ctx.save();
    ctx.translate(17, -34);
    ctx.rotate(0.15 - pose.swing * 0.7);
    rrect(ctx, -8, -12, 16, 20, 2, '#212121');
    ctx.fillStyle = '#ffd54f';
    ctx.font = 'bold 5px Jua, sans-serif';
    label(ctx, '업적', -5, -1, 'CV');
    ctx.restore();
    ctx.fillStyle = `rgba(255,235,59,${0.5 + 0.4 * Math.sin(pose.time * 4)})`;
    ctx.beginPath();
    ctx.arc(-3, -63, 3.2, 0, Math.PI * 2);
    ctx.arc(7, -63, 3.2, 0, Math.PI * 2);
    ctx.fill();
  }
  if (variant === 'committee') {
    // 심사위원장: 빨간 '불합격' 도장
    ctx.save();
    ctx.translate(16, -38);
    ctx.rotate(0.2 - pose.swing * 0.9);
    rrect(ctx, -2.5, -14, 5, 14, 1, '#6d4c41');
    rrect(ctx, -7, 0, 14, 7, 2, '#e53935');
    ctx.restore();
  }
  if (isPresident) {
    ctx.fillStyle = '#ffd54f';
    ctx.beginPath();
    ctx.moveTo(-10, hy - 13);
    ctx.lineTo(-6, hy - 22);
    ctx.lineTo(0, hy - 15);
    ctx.lineTo(6, hy - 22);
    ctx.lineTo(10, hy - 13);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
}

/** 유령: 둥둥 떠다니고 깜빡인다. 가면 증후군은 하얀 가면, 13년 차 선배는 안경과 학번 명찰. */
function ghost(ctx: Ctx, look: Look, pose: Pose, defId: string): void {
  const t = pose.time;
  const bob = Math.sin(t * 3 + pose.walk) * 3;
  const flicker = defId === 'imposter' ? 0.92 : 0.62 + 0.3 * Math.abs(Math.sin(t * 2.3 + pose.walk * 0.7)) * (Math.sin(t * 17) > -0.85 ? 1 : 0.3);
  ctx.save();
  ctx.globalAlpha *= flicker;
  ctx.translate(0, -8 + bob);
  line(ctx);
  // 몸통: 위는 둥글고 아래는 물결
  ctx.beginPath();
  ctx.moveTo(-16, -6);
  ctx.bezierCurveTo(-18, -52, 18, -52, 16, -6);
  for (let i = 0; i < 4; i++) {
    const x0 = 16 - i * 8;
    ctx.quadraticCurveTo(x0 - 4, 2 + Math.sin(t * 6 + i) * 3, x0 - 8, -6);
  }
  ctx.closePath();
  ctx.fillStyle = look.color;
  ctx.fill();
  ctx.stroke();
  // 팔 (흐느적)
  ctx.beginPath();
  ctx.moveTo(10, -26);
  ctx.quadraticCurveTo(22, -24 - pose.swing * 8, 24, -14 + Math.sin(t * 4) * 3);
  ctx.stroke();
  if (defId === 'imposter') {
    // 하얀 가면과 웃는 입
    blob(ctx, 3, -32, 9, 11, look.accent ?? '#fff');
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.ellipse(0, -35, 1.6, 2.4, 0, 0, Math.PI * 2);
    ctx.ellipse(7, -35, 1.6, 2.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(3.5, -29, 4, 0.2, Math.PI - 0.2);
    ctx.stroke();
  } else {
    // 퀭한 눈
    ctx.fillStyle = look.accent ?? '#3949ab';
    ctx.beginPath();
    ctx.ellipse(-1, -32, 3.2, 4.5, 0, 0, Math.PI * 2);
    ctx.ellipse(9, -32, 3.2, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(4, -21, 3, 4 + Math.sin(t * 5) * 1.2, 0, 0, Math.PI * 2);
    ctx.fillStyle = INK;
    ctx.fill();
    if (defId === 'ghost13' || defId === 'ghost') {
      // 다 깨진 안경
      ctx.lineWidth = 1.6;
      ctx.strokeRect(-6, -37, 10, 9);
      ctx.strokeRect(5, -37, 10, 9);
      ctx.beginPath();
      ctx.moveTo(-4, -36);
      ctx.lineTo(1, -30);
      ctx.stroke();
      line(ctx);
    }
    if (defId === 'ghost13') {
      ctx.lineWidth = 1.5;
      rrect(ctx, -12, -16, 14, 8, 1, '#fff');
      ctx.fillStyle = '#c62828';
      ctx.font = 'bold 5px Jua, sans-serif';
      label(ctx, '13년차', -11.5, -10.5, 'YR 13');
      line(ctx);
    }
  }
  ctx.restore();
  // 바닥 그림자
  ctx.save();
  ctx.globalAlpha *= 0.25;
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.ellipse(0, 0, 12 - bob, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** 새벽 3시에 혼자 켜지는 프린터: 빨간 눈, 혀처럼 나오는 종이 */
function printer(ctx: Ctx, look: Look, pose: Pose): void {
  const t = pose.time;
  line(ctx);
  legs(ctx, pose, 18, 6, '#37474f');
  ctx.save();
  ctx.translate(0, -6 + (pose.moving ? Math.abs(Math.sin(pose.walk * 2)) * -2 : 0));
  rrect(ctx, -20, -34, 40, 28, 4, look.color);
  rrect(ctx, -14, -42, 28, 9, 2, '#90a4ae');
  // 빨간 눈 (깜빡)
  const on = Math.sin(t * 3) > -0.7;
  ctx.fillStyle = on ? (look.accent ?? '#ff1744') : '#5d4037';
  ctx.beginPath();
  ctx.arc(-7, -24, 3, 0, Math.PI * 2);
  ctx.arc(7, -24, 3, 0, Math.PI * 2);
  ctx.fill();
  // 종이 혀
  const out = 6 + Math.abs(Math.sin(t * 2.5)) * 8 + pose.swing * 6;
  rrect(ctx, -9, -12, 18, out, 1, '#fafafa');
  ctx.strokeStyle = 'rgba(0,0,0,.3)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-5, -8);
  ctx.lineTo(5, -8);
  ctx.moveTo(-5, -4);
  ctx.lineTo(3, -4);
  ctx.stroke();
  ctx.restore();
}

/** 무한 모드 화이트보드 전초기지: 바퀴 달린 화이트보드, 휘갈긴 수식, 마커 받침, 화난 눈썹 (발 아래 가운데가 원점, 높이 약 58) */
function whiteboard(ctx: Ctx, look: Look, pose: Pose): void {
  const t = pose.time;
  line(ctx);
  // 바퀴 달린 다리
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(-17, -6);
  ctx.lineTo(-15, -26);
  ctx.moveTo(17, -6);
  ctx.lineTo(15, -26);
  ctx.moveTo(-17, -10);
  ctx.lineTo(17, -10);
  ctx.stroke();
  line(ctx, 2);
  for (const x of [-17, 17]) blob(ctx, x, -3.5, 3.5, 3.5, '#455a64');
  // 던질 때 판이 뒤로 젖혀졌다 돌아온다
  ctx.save();
  ctx.translate(0, -26);
  ctx.rotate(-pose.swing * 0.12 + Math.sin(t * 1.7) * 0.015);
  line(ctx);
  rrect(ctx, -25, -34, 50, 34, 3, '#90a4ae');
  ctx.fillStyle = look.color;
  ctx.fillRect(-22, -31, 44, 28);
  // 휘갈긴 수식
  ctx.save();
  ctx.fillStyle = look.accent ?? '#1e88e5';
  ctx.font = 'bold 7px Jua, sans-serif';
  label(ctx, 'E=mc²', -20, -23);
  ctx.fillStyle = '#e53935';
  label(ctx, '∫dx=?', 3, -6);
  ctx.strokeStyle = look.accent ?? '#1e88e5';
  ctx.lineWidth = 1;
  ctx.beginPath();
  // 화살표와 동그라미
  ctx.moveTo(-19, -10);
  ctx.quadraticCurveTo(-12, -16, -4, -10);
  ctx.moveTo(-6, -12);
  ctx.lineTo(-4, -10);
  ctx.lineTo(-7, -9);
  ctx.moveTo(-17, -7);
  ctx.lineTo(-9, -5);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(13, -24, 7, 4.5, -0.2, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
  // 화난 눈썹과 눈 (보드에 그려진 낙서)
  ctx.save();
  ctx.lineWidth = 2;
  ctx.strokeStyle = INK;
  eyes(ctx, 0, -15, 6, true, 1.8);
  ctx.restore();
  // 마커 받침과 마커 (던지면 하나씩 비었다 다시 찬다)
  line(ctx, 2);
  rrect(ctx, -20, -1, 40, 4, 1.5, '#b0bec5');
  const missing = pose.swing > 0.2 ? 1 : -1;
  ['#212121', '#e53935', '#1e88e5'].forEach((c, i) => {
    if (i === missing) return;
    line(ctx, 1.2);
    rrect(ctx, -15 + i * 11, -3, 9, 2.6, 1, c);
  });
  ctx.restore();
}

// ─────────────────────────── 뽑기 장비 (ICT·전자공학 장비) ───────────────────────────

/** 장비용 짧은 다리 (작은 고무발) */
function stubs(ctx: Ctx, pose: Pose, xs: number[], len = 6): void {
  const k = pose.moving ? Math.sin(pose.walk * 2) * 2.5 : 0;
  ctx.lineWidth = 4;
  ctx.strokeStyle = INK;
  xs.forEach((x, i) => {
    const ph = i % 2 ? -k : k;
    ctx.beginPath();
    ctx.moveTo(x, -len);
    ctx.lineTo(x + ph, 0);
    ctx.stroke();
  });
  line(ctx);
}

/** 모델 버전 표식: Mk.II 은색 · Mk.III 금색 나사 */
function mkBadge(ctx: Ctx, tier: number, x: number, y: number): void {
  if (tier < 2) return;
  ctx.save();
  line(ctx, 1.5);
  for (let i = 0; i < tier - 1; i++) blob(ctx, x + i * 6, y, 2.2, 2.2, tier === 3 ? '#ffd54f' : '#cfd8dc');
  ctx.restore();
}

/** 장비 얼굴: 동그란 눈 두 개와 작은 입 */
function gearFace(ctx: Ctx, x: number, y: number, gap = 4, blink = 0): void {
  ctx.fillStyle = INK;
  for (const dx of [-gap, gap]) {
    ctx.beginPath();
    if (Math.sin(blink * 1.7) > 0.97) ctx.fillRect(x + dx - 2, y - 0.5, 4, 1.4);
    else ctx.arc(x + dx, y, 1.8, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.lineWidth = 1.5;
  ctx.arc(x, y + 3, 2, 0.2, Math.PI - 0.2);
  ctx.stroke();
  line(ctx);
}

function gearIron(ctx: Ctx, look: Look, pose: Pose): void {
  const t = pose.time;
  tierGlow(ctx, pose.tier, 0, -18, 24);
  line(ctx);
  stubs(ctx, pose, [-8, 8]);
  // 납땜 스테이션 본체
  rrect(ctx, -14, -26, 26, 20, 4, look.accent ?? '#90a4ae');
  rrect(ctx, -10, -23, 12, 7, 2, '#263238');
  ctx.fillStyle = '#ff7043';
  ctx.font = 'bold 6px monospace';
  ctx.fillText(`${330 + pose.tier * 10}`, -9, -17.5);
  blob(ctx, 7, -19, 3, 3, '#eceff1');
  gearFace(ctx, -3, -11, 4, t);
  mkBadge(ctx, pose.tier, -10, -29);
  // 꼬인 선
  ctx.strokeStyle = '#37474f';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(12, -12);
  for (let i = 0; i < 4; i++) ctx.quadraticCurveTo(15 + i * 2, -18 - (i % 2) * 6, 16 + i * 2, -22 - i);
  ctx.stroke();
  line(ctx);
  // 인두 (공격하면 앞으로 찌른다)
  const sw = pose.swing;
  ctx.save();
  ctx.translate(20 + sw * 8, -28 + sw * 4);
  ctx.rotate(0.5 + sw * 0.4);
  rrect(ctx, -3, -10, 6, 12, 2, look.color);
  ctx.fillStyle = '#b0bec5';
  ctx.fillRect(-1.5, 2, 3, 8);
  ctx.strokeRect(-1.5, 2, 3, 8);
  // 달아오른 끝
  const glow = 0.6 + Math.sin(t * 8) * 0.25 + sw * 0.3;
  ctx.fillStyle = `rgba(255,${Math.round(120 + 80 * (1 - glow))},40,${Math.min(1, glow)})`;
  ctx.beginPath();
  ctx.moveTo(-1.5, 10);
  ctx.lineTo(0, 15);
  ctx.lineTo(1.5, 10);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  // 연기
  ctx.save();
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = '#eceff1';
  const k = (t * 0.8) % 1;
  ctx.beginPath();
  ctx.arc(26 + Math.sin(t * 3) * 2, -22 - k * 16, 2.5 + k * 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function gearScope(ctx: Ctx, look: Look, pose: Pose): void {
  const t = pose.time;
  tierGlow(ctx, pose.tier, 0, -22, 26);
  line(ctx);
  stubs(ctx, pose, [-10, 10]);
  rrect(ctx, -17, -38, 34, 32, 4, look.color);
  // 화면 (파형)
  rrect(ctx, -14, -35, 20, 15, 2, '#102027');
  ctx.save();
  ctx.beginPath();
  ctx.rect(-13, -34, 18, 13);
  ctx.clip();
  ctx.strokeStyle = 'rgba(118,255,3,.25)';
  ctx.lineWidth = 0.8;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(-13 + i * 6, -34);
    ctx.lineTo(-13 + i * 6, -21);
    ctx.stroke();
  }
  ctx.strokeStyle = look.accent ?? '#76ff03';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  const amp = 3.5 + pose.swing * 2;
  for (let x = -13; x <= 5; x += 1) {
    const y = -27.5 + Math.sin(x * 0.7 + t * 9) * amp * (pose.tier >= 2 ? 1 : 0.8);
    if (x === -13) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.restore();
  line(ctx);
  // 손잡이 노브
  blob(ctx, 11, -31, 3, 3, '#ffca28');
  blob(ctx, 11, -23, 2.5, 2.5, '#4fc3f7');
  gearFace(ctx, -4, -13, 5, t + 1);
  mkBadge(ctx, pose.tier, 6, -16);
  // 프로브 (앞으로 겨눈다)
  ctx.strokeStyle = '#212121';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(17, -18);
  ctx.quadraticCurveTo(24, -12, 24 + pose.swing * 4, -24);
  ctx.stroke();
  line(ctx);
  rrect(ctx, 21 + pose.swing * 4, -32, 6, 9, 2, '#455a64');
  if (pose.tier >= 3) {
    ctx.fillStyle = '#ffd54f';
    ctx.font = 'bold 6px Jua, sans-serif';
    label(ctx, '4CH', -16, -40);
  }
}

function gearFirewall(ctx: Ctx, look: Look, pose: Pose): void {
  const t = pose.time;
  tierGlow(ctx, pose.tier, 0, -24, 28);
  line(ctx);
  stubs(ctx, pose, [-11, 0, 11]);
  // 벽돌 벽
  const w = 34 + (pose.tier - 1) * 2;
  const top = -42;
  rrect(ctx, -w / 2, top, w, 36, 3, look.color);
  ctx.strokeStyle = 'rgba(43,36,48,.55)';
  ctx.lineWidth = 1.4;
  for (let r = 0; r < 4; r++) {
    const y = top + 9 * (r + 1);
    if (r < 3) {
      ctx.beginPath();
      ctx.moveTo(-w / 2, y);
      ctx.lineTo(w / 2, y);
      ctx.stroke();
    }
    for (let c = 0; c < 3; c++) {
      const x = -w / 2 + (r % 2 ? 6 : 11) + c * 11;
      if (x >= w / 2 - 2) continue;
      ctx.beginPath();
      ctx.moveTo(x, y - 9);
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  }
  line(ctx);
  // 위에서 일렁이는 불꽃
  for (let i = 0; i < 3; i++) {
    const fx = -10 + i * 10;
    const fh = 7 + Math.sin(t * 7 + i * 2) * 2.5;
    ctx.fillStyle = i === 1 ? '#ffca28' : (look.accent ?? '#ffcc80');
    ctx.beginPath();
    ctx.moveTo(fx - 4, top + 1);
    ctx.quadraticCurveTo(fx - 3, top - fh * 0.6, fx, top - fh);
    ctx.quadraticCurveTo(fx + 3, top - fh * 0.6, fx + 4, top + 1);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  // 방패 문장과 얼굴
  ctx.fillStyle = '#e0f7fa';
  ctx.beginPath();
  ctx.moveTo(0, -34);
  ctx.lineTo(9, -31);
  ctx.lineTo(8, -21);
  ctx.quadraticCurveTo(4, -15, 0, -13);
  ctx.quadraticCurveTo(-4, -15, -8, -21);
  ctx.lineTo(-9, -31);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  gearFace(ctx, 0, -25, 3.5, t + 2);
  mkBadge(ctx, pose.tier, -w / 2 + 4, -10);
}

function fan(ctx: Ctx, x: number, y: number, r: number, spin: number): void {
  blob(ctx, x, y, r, r, '#263238');
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(spin);
  ctx.fillStyle = '#90a4ae';
  for (let i = 0; i < 4; i++) {
    ctx.rotate(Math.PI / 2);
    ctx.beginPath();
    ctx.ellipse(r * 0.45, 0, r * 0.45, r * 0.22, 0.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  line(ctx);
}

function gearCooler(ctx: Ctx, look: Look, pose: Pose): void {
  const t = pose.time;
  tierGlow(ctx, pose.tier, 0, -24, 28);
  line(ctx);
  stubs(ctx, pose, [-9, 9]);
  // 펌프·물탱크 (파란 냉각수가 출렁)
  rrect(ctx, -16, -24, 14, 18, 4, '#e1f5fe');
  const lv = -14 + Math.sin(t * 4) * 1.5;
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(-15, -23, 12, 16, 3);
  ctx.clip();
  ctx.fillStyle = look.color;
  ctx.fillRect(-15, lv, 12, 20);
  ctx.restore();
  ctx.beginPath();
  ctx.roundRect(-16, -24, 14, 18, 4);
  ctx.stroke();
  // 라디에이터와 팬
  const fans = pose.tier >= 2 ? 2 : 1;
  const rw = 14;
  rrect(ctx, 0, -18 - fans * 14, rw + 4, fans * 14 + 12, 3, '#cfd8dc');
  for (let i = 0; i < fans; i++) fan(ctx, 9, -24 - i * 14 - 2, 6, t * 18 + i);
  // 호스
  ctx.strokeStyle = look.color;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-9, -24);
  ctx.quadraticCurveTo(-8, -40, 2, -18 - fans * 14 + 2);
  ctx.stroke();
  line(ctx);
  gearFace(ctx, -9, -13, 3, t + 3);
  mkBadge(ctx, pose.tier, 2, -10);
  // 서리 김
  ctx.save();
  ctx.globalAlpha = 0.4;
  ctx.fillStyle = look.accent ?? '#e1f5fe';
  const k = (t * 0.7) % 1;
  ctx.beginPath();
  ctx.arc(14 + k * 6, -18 - fans * 14 - k * 8, 2 + k * 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function gearPrinter3d(ctx: Ctx, look: Look, pose: Pose): void {
  const t = pose.time;
  tierGlow(ctx, pose.tier, 0, -26, 28);
  line(ctx);
  stubs(ctx, pose, [-12, 12], 5);
  // 프레임
  rrect(ctx, -17, -46, 34, 6, 2, '#455a64');
  rrect(ctx, -17, -10, 34, 5, 2, '#455a64');
  ctx.fillStyle = look.color;
  ctx.fillRect(-17, -40, 4, 30);
  ctx.strokeRect(-17, -40, 4, 30);
  ctx.fillRect(13, -40, 4, 30);
  ctx.strokeRect(13, -40, 4, 30);
  // 출력물 (자란다)
  const grow = 3 + ((t * 0.35) % 1) * 10;
  rrect(ctx, -6, -10 - grow, 12, grow, 2, look.accent ?? '#ff7043');
  // 노즐 (좌우로)
  const nx = Math.sin(t * 5) * 8 + pose.swing * 3;
  ctx.strokeStyle = INK;
  ctx.beginPath();
  ctx.moveTo(-13, -30);
  ctx.lineTo(13, -30);
  ctx.stroke();
  rrect(ctx, nx - 4, -33, 8, 7, 1.5, '#ffca28');
  ctx.beginPath();
  ctx.moveTo(nx - 1.5, -26);
  ctx.lineTo(nx, -23);
  ctx.lineTo(nx + 1.5, -26);
  ctx.stroke();
  // 위 막대에 얼굴
  ctx.fillStyle = '#fff';
  gearFace(ctx, 0, -43, 4, t + 4);
  mkBadge(ctx, pose.tier, 8, -49);
}

function gearTurret(ctx: Ctx, look: Look, pose: Pose): void {
  const t = pose.time;
  line(ctx);
  // 세 발 받침
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-9, 0);
  ctx.lineTo(0, -8);
  ctx.lineTo(9, 0);
  ctx.moveTo(0, -8);
  ctx.lineTo(0, 0);
  ctx.stroke();
  line(ctx);
  // 층층이 뽑힌 몸통
  rrect(ctx, -10, -20, 20, 12, 3, look.color);
  ctx.strokeStyle = 'rgba(43,36,48,.35)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(-9, -17 + i * 3);
    ctx.lineTo(9, -17 + i * 3);
    ctx.stroke();
  }
  line(ctx);
  // 포신
  const recoil = pose.swing * 3;
  rrect(ctx, 6 - recoil, -18, 12, 5, 1.5, look.accent ?? '#5d4037');
  blob(ctx, -1, -24, 6, 5, look.color);
  ctx.fillStyle = Math.sin(t * 6) > 0 ? '#ff1744' : '#b71c1c';
  ctx.beginPath();
  ctx.arc(1, -24, 1.8, 0, Math.PI * 2);
  ctx.fill();
}

function gearCluster(ctx: Ctx, look: Look, pose: Pose): void {
  const t = pose.time;
  tierGlow(ctx, pose.tier, 0, -32, 36);
  line(ctx);
  // 바퀴 달린 랙
  for (const wx of [-13, 13]) blob(ctx, wx, -3, 4, 4, '#424242');
  const units = 3 + (pose.tier >= 3 ? 1 : 0);
  const uh = 12;
  const top = -6 - units * uh - 6;
  rrect(ctx, -18, top, 36, units * uh + 6, 3, look.color);
  for (let i = 0; i < units; i++) {
    const y = top + 3 + i * uh;
    rrect(ctx, -15, y, 30, uh - 2, 2, '#37474f');
    // 깜빡이는 LED
    for (let j = 0; j < 4; j++) {
      const on = Math.sin(t * (7 + j) + i * 1.9 + j) > 0.1;
      ctx.fillStyle = on ? (look.accent ?? '#40c4ff') : '#1c313a';
      ctx.fillRect(-12 + j * 4, y + 3.5, 2.5, 2.5);
    }
    ctx.strokeStyle = '#78909c';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(4, y + 3);
    ctx.lineTo(12, y + 3);
    ctx.moveTo(4, y + 6.5);
    ctx.lineTo(12, y + 6.5);
    ctx.stroke();
    line(ctx);
  }
  // 맨 위 칸에 얼굴 (화면)
  rrect(ctx, -11, top - 13, 22, 12, 3, '#102027');
  ctx.fillStyle = look.accent ?? '#40c4ff';
  const blink = Math.sin(t * 1.3) > 0.96;
  for (const dx of [-4, 4]) {
    if (blink) ctx.fillRect(dx - 2, top - 7.5, 4, 1.4);
    else ctx.fillRect(dx - 1.5, top - 9.5, 3, 4);
  }
  // 공격(연산) 중이면 위로 빛 기둥
  if (pose.swing > 0) {
    ctx.save();
    ctx.globalAlpha = pose.swing * 0.6;
    ctx.fillStyle = look.accent ?? '#40c4ff';
    ctx.fillRect(-2, top - 30, 4, 17);
    ctx.restore();
  }
  mkBadge(ctx, pose.tier, -14, top + units * uh + 1);
}

// ── 장비 22종 (0.17.0) ──

/** 꼬불꼬불한 전선 (from → to, 처짐 sag) */
function wire(ctx: Ctx, x0: number, y0: number, x1: number, y1: number, color: string, sag = 6, w = 2): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = w;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.quadraticCurveTo((x0 + x1) / 2, Math.max(y0, y1) + sag, x1, y1);
  ctx.stroke();
  line(ctx);
}

/** 깜빡이는 LED 한 줄 */
function leds(ctx: Ctx, x: number, y: number, n: number, t: number, on: string, gap = 4, seed = 0): void {
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = Math.sin(t * (5 + i) + i * 2.3 + seed) > 0 ? on : '#1c313a';
    ctx.fillRect(x + i * gap, y, 2.4, 2.4);
  }
}

function gearBreadboard(ctx: Ctx, look: Look, pose: Pose): void {
  const t = pose.time;
  tierGlow(ctx, pose.tier, 0, -14, 18);
  line(ctx);
  stubs(ctx, pose, [-7, 7], 5);
  rrect(ctx, -13, -21, 26, 16, 2, look.color);
  // 전원 레일 (빨강·파랑)
  ctx.fillStyle = look.accent ?? '#e53935';
  ctx.fillRect(-12, -20, 24, 1.6);
  ctx.fillStyle = '#1e88e5';
  ctx.fillRect(-12, -7.6, 24, 1.6);
  // 구멍
  ctx.fillStyle = '#9e9e9e';
  for (let r = 0; r < 3; r++) for (let c = 0; c < 7; c++) ctx.fillRect(-10.5 + c * 3.4, -17 + r * 3, 1.2, 1.2);
  // 점퍼선 (Mk가 오를수록 늘어난다)
  const cols = ['#ff7043', '#66bb6a', '#ffd54f'];
  for (let i = 0; i < pose.tier; i++) {
    ctx.strokeStyle = cols[i]!;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    const x0 = -9 + i * 5;
    ctx.moveTo(x0, -17);
    ctx.quadraticCurveTo(x0 + 5, -28 - i * 2 + Math.sin(t * 4 + i) * 1.5, x0 + 10, -14);
    ctx.stroke();
  }
  line(ctx);
  // LED 하나 (공격하면 반짝)
  blob(ctx, 9, -23, 2, 2, pose.swing > 0 || Math.sin(t * 3) > 0.6 ? '#ff1744' : '#b71c1c');
  gearFace(ctx, -2, -12, 3.5, t);
  mkBadge(ctx, pose.tier, -11, -24);
}

function gearMultimeter(ctx: Ctx, look: Look, pose: Pose): void {
  const t = pose.time;
  const sw = pose.swing;
  tierGlow(ctx, pose.tier, 0, -22, 26);
  line(ctx);
  stubs(ctx, pose, [-7, 7]);
  rrect(ctx, -11, -40, 22, 34, 5, look.color);
  rrect(ctx, -8, -37, 16, 9, 1.5, '#c5e1a5');
  ctx.fillStyle = INK;
  ctx.font = 'bold 7px monospace';
  ctx.fillText(pose.tier >= 3 ? '9.99' : sw > 0 ? 'OL' : '5.0V', -7, -30);
  // 다이얼
  blob(ctx, 0, -21, 5, 5, look.accent ?? '#212121');
  ctx.strokeStyle = '#fff';
  ctx.beginPath();
  ctx.moveTo(0, -21);
  ctx.lineTo(Math.cos(t * 0.8) * 4, -21 + Math.sin(t * 0.8) * 4);
  ctx.stroke();
  line(ctx);
  gearFace(ctx, 0, -12, 4, t + 5);
  mkBadge(ctx, pose.tier, -9, -43);
  // 탐침 두 개 (빨강·검정, 공격하면 찌른다)
  wire(ctx, 6, -8, 22 + sw * 6, -22, '#e53935', 8);
  wire(ctx, 3, -8, 18 + sw * 3, -12, '#212121', 6);
  for (const [px, py, c] of [[22 + sw * 6, -22, '#e53935'], [18 + sw * 3, -12, '#424242']] as const) {
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(-0.5);
    rrect(ctx, -2, -2, 4, 9, 1.5, c);
    ctx.fillStyle = '#cfd8dc';
    ctx.fillRect(-0.7, -7, 1.4, 5);
    ctx.restore();
  }
}

function gearArduino(ctx: Ctx, look: Look, pose: Pose): void {
  const t = pose.time;
  tierGlow(ctx, pose.tier, 0, -18, 24);
  line(ctx);
  ctx.translate(0, Math.sin(t * 6) * 2);
  // 프로펠러 팔 (Mk.III는 6개)
  const arms = pose.tier >= 3 ? [-19, -10, 10, 19, -4, 4] : [-17, 17];
  for (const ax of arms) {
    ctx.beginPath();
    ctx.moveTo(0, -17);
    ctx.lineTo(ax, -24);
    ctx.stroke();
    const spin = Math.abs(Math.sin(t * 42 + ax));
    ctx.fillStyle = 'rgba(200,230,255,.8)';
    ctx.beginPath();
    ctx.ellipse(ax, -26, 7 * spin + 2, 1.8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  // 기판
  rrect(ctx, -13, -22, 26, 12, 2, look.color);
  rrect(ctx, -4, -20, 9, 6, 1, '#212121');
  ctx.fillStyle = '#cfd8dc';
  ctx.fillRect(-13, -19, 4, 5);
  ctx.strokeRect(-13, -19, 4, 5);
  ctx.fillStyle = '#ffd54f';
  for (let i = 0; i < 6; i++) ctx.fillRect(-8 + i * 3, -21.6, 1.5, 1.5);
  leds(ctx, 7, -20, 2, t, '#76ff03', 3);
  // 아래 매달린 얼굴 카메라
  blob(ctx, 0, -7, 5, 4.5, '#eceff1');
  gearFace(ctx, 0, -8, 2.5, t + 6);
  mkBadge(ctx, pose.tier, 8, -13);
}

function gearLogic(ctx: Ctx, look: Look, pose: Pose): void {
  const t = pose.time;
  tierGlow(ctx, pose.tier, 0, -20, 26);
  line(ctx);
  stubs(ctx, pose, [-10, 10]);
  rrect(ctx, -16, -32, 30, 26, 4, look.color);
  rrect(ctx, -13, -29, 18, 12, 2, '#102027');
  // 사각파 화면
  ctx.strokeStyle = look.accent ?? '#ffd54f';
  ctx.lineWidth = 1.2;
  for (let r = 0; r < 2 + (pose.tier >= 2 ? 1 : 0); r++) {
    ctx.beginPath();
    const y0 = -26 + r * 3.5;
    for (let x = -12; x <= 4; x += 2) {
      const hi = Math.sin(x * 0.9 + t * 8 + r * 2) > 0 ? -1.2 : 0;
      if (x === -12) ctx.moveTo(x, y0 + hi);
      else ctx.lineTo(x, y0 + hi);
    }
    ctx.stroke();
  }
  line(ctx);
  gearFace(ctx, -4, -11, 4, t + 7);
  mkBadge(ctx, pose.tier, 8, -29);
  // 무지개 프로브 다발
  const cols = ['#e53935', '#fb8c00', '#fdd835', '#43a047', '#1e88e5', '#8e24aa'];
  const n = 3 + pose.tier;
  for (let i = 0; i < n; i++) {
    const c = cols[i % cols.length]!;
    const ex = 22 + pose.swing * 5 + (i % 2) * 3;
    const ey = -28 + i * 3;
    wire(ctx, 14, -22 + i * 1.5, ex, ey, c, 3 + i, 1.4);
    ctx.fillStyle = c;
    ctx.fillRect(ex - 1, ey - 1.5, 3, 3);
  }
}

function gearUps(ctx: Ctx, look: Look, pose: Pose): void {
  const t = pose.time;
  tierGlow(ctx, pose.tier, 0, -26, 28);
  line(ctx);
  stubs(ctx, pose, [-8, 8]);
  // 전원 플러그 꼬리
  wire(ctx, -12, -12, -22, -6, '#212121', 4, 2.4);
  rrect(ctx, -25, -9, 5, 5, 1, '#424242');
  rrect(ctx, -13, -50, 26, 44, 4, look.color);
  rrect(ctx, -9, -46, 18, 11, 2, '#102027');
  // 배터리 칸 (출렁)
  const bars = 2 + pose.tier;
  const lit = 1 + Math.floor(((t * 0.8) % 1) * bars);
  for (let i = 0; i < bars; i++) {
    ctx.fillStyle = i < lit ? (look.accent ?? '#76ff03') : '#33691e';
    ctx.fillRect(-7 + i * (15 / bars), -43, 15 / bars - 1.5, 6);
  }
  // 전원 버튼
  blob(ctx, 0, -29, 3.2, 3.2, '#eceff1');
  ctx.beginPath();
  ctx.moveTo(0, -31);
  ctx.lineTo(0, -29);
  ctx.stroke();
  gearFace(ctx, 0, -18, 4, t + 8);
  mkBadge(ctx, pose.tier, -10, -53);
}

function gearPi(ctx: Ctx, look: Look, pose: Pose): void {
  const t = pose.time;
  tierGlow(ctx, pose.tier, 0, -16, 22);
  line(ctx);
  stubs(ctx, pose, [-9, 9], 5);
  rrect(ctx, -15, -24, 30, 18, 3, look.color);
  // 핀 헤더
  ctx.fillStyle = '#212121';
  ctx.fillRect(-12, -23, 20, 3);
  ctx.fillStyle = '#ffd54f';
  for (let i = 0; i < 10; i++) ctx.fillRect(-11.5 + i * 2, -22.4, 1, 1.8);
  // 칩·포트
  rrect(ctx, -10, -17, 8, 7, 1, '#263238');
  rrect(ctx, 10, -19, 7, 6, 1, '#b0bec5');
  rrect(ctx, 10, -12, 7, 5, 1, '#b0bec5');
  // 산딸기색 LED
  blob(ctx, 4, -15, 2.2, 2.2, Math.sin(t * 2) > 0 ? (look.accent ?? '#e91e63') : '#880e4f');
  gearFace(ctx, -6, -13.5, 3, t + 9);
  // 커피 김 (카페인 생산)
  ctx.save();
  ctx.globalAlpha = 0.5;
  ctx.strokeStyle = '#8d6e63';
  const k = (t * 0.6) % 1;
  ctx.beginPath();
  ctx.moveTo(0, -27 - k * 10);
  ctx.quadraticCurveTo(3, -31 - k * 10, 0, -35 - k * 10);
  ctx.stroke();
  ctx.restore();
  line(ctx);
  // Mk.III는 위에 한 장 더 겹친다 (클러스터)
  if (pose.tier >= 3) rrect(ctx, -12, -30, 24, 5, 2, look.color);
  mkBadge(ctx, pose.tier, -13, -9);
}

function gearSiggen(ctx: Ctx, look: Look, pose: Pose): void {
  const t = pose.time;
  tierGlow(ctx, pose.tier, 0, -20, 26);
  line(ctx);
  stubs(ctx, pose, [-10, 10]);
  // 클럭 고리 (오라)
  ctx.save();
  ctx.globalAlpha = 0.3;
  ctx.strokeStyle = look.accent ?? '#ff7043';
  for (let i = 0; i < 2; i++) {
    const k = (t * 0.7 + i * 0.5) % 1;
    ctx.beginPath();
    ctx.ellipse(0, -4, 14 + k * 26, 3 + k * 5, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
  line(ctx);
  rrect(ctx, -16, -32, 32, 26, 4, look.color);
  rrect(ctx, -13, -29, 17, 10, 2, '#102027');
  ctx.strokeStyle = '#69f0ae';
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  for (let x = -12; x <= 3; x++) {
    const y = -24 + Math.sin(x * (0.6 + pose.tier * 0.2) + t * 7) * 3;
    if (x === -12) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  line(ctx);
  blob(ctx, 10, -26, 3.5, 3.5, '#eceff1');
  ctx.beginPath();
  ctx.moveTo(10, -26);
  ctx.lineTo(10 + Math.cos(t) * 3, -26 + Math.sin(t) * 3);
  ctx.stroke();
  ctx.fillStyle = '#ffd54f';
  ctx.font = 'bold 5px monospace';
  ctx.fillText(['1k', '10M', '1G'][pose.tier - 1]!, 7, -16);
  gearFace(ctx, -4, -12, 4, t + 10);
  mkBadge(ctx, pose.tier, -14, -35);
  // BNC 단자와 동축 케이블
  wire(ctx, 16, -14, 24 + pose.swing * 3, -22, '#263238', 4, 2.4);
  blob(ctx, 24 + pose.swing * 3, -22, 2.5, 2.5, '#cfd8dc');
}

function gearRouter(ctx: Ctx, look: Look, pose: Pose): void {
  const t = pose.time;
  tierGlow(ctx, pose.tier, 0, -16, 24);
  line(ctx);
  stubs(ctx, pose, [-11, 11], 5);
  // 안테나 (Mk가 오를수록 늘어난다)
  const ants = pose.tier + 1;
  for (let i = 0; i < ants; i++) {
    const ax = -12 + (i * 24) / Math.max(1, ants - 1);
    ctx.save();
    ctx.translate(ax, -18);
    ctx.rotate((i - (ants - 1) / 2) * 0.25 + Math.sin(t * 3 + i) * 0.05);
    rrect(ctx, -1.8, -18, 3.6, 18, 1.8, '#37474f');
    ctx.restore();
  }
  rrect(ctx, -17, -20, 34, 13, 4, look.color);
  leds(ctx, -12, -16, 5, t * 1.5, look.accent ?? '#00e676', 4);
  gearFace(ctx, 6, -12, 3.5, t + 11);
  mkBadge(ctx, pose.tier, -15, -10);
  // 와이파이 물결
  ctx.save();
  ctx.globalAlpha = 0.45;
  ctx.strokeStyle = '#4fc3f7';
  const k = (t * 0.9) % 1;
  ctx.beginPath();
  ctx.arc(0, -38, 4 + k * 8, Math.PI * 1.2, Math.PI * 1.8);
  ctx.stroke();
  ctx.restore();
  line(ctx);
}

function gearPacket(ctx: Ctx, look: Look, pose: Pose): void {
  line(ctx);
  stubs(ctx, pose, [-5, 5], 5);
  ctx.save();
  ctx.translate(0, -13);
  ctx.rotate(Math.sin(pose.walk * 2) * 0.1 + pose.swing * 0.3);
  rrect(ctx, -9, -8, 18, 15, 2, look.color);
  ctx.fillStyle = look.accent ?? '#01579b';
  ctx.fillRect(-9, -8, 18, 4);
  ctx.strokeRect(-9, -8, 18, 4);
  ctx.fillStyle = '#e1f5fe';
  ctx.font = 'bold 5px monospace';
  ctx.fillText('0101', -6, 6);
  gearFace(ctx, 0, 0, 3, pose.time + 12);
  ctx.restore();
}

function gearWafer(ctx: Ctx, look: Look, pose: Pose): void {
  const t = pose.time;
  tierGlow(ctx, pose.tier, 0, -16, 22);
  line(ctx);
  const r = 15;
  ctx.save();
  ctx.translate(0, -r - 1);
  // 굴러간다
  ctx.rotate(pose.walk * 0.9 + pose.swing * 0.8);
  ctx.beginPath();
  ctx.arc(0, 0, r, 0.2, Math.PI * 2 - 0.2);
  ctx.closePath();
  ctx.fillStyle = look.color;
  ctx.fill();
  ctx.save();
  ctx.clip();
  // 칩 격자와 무지개빛
  const hue = (t * 40) % 360;
  for (let x = -12; x < 12; x += 4) {
    for (let y = -12; y < 12; y += 4) {
      ctx.fillStyle = `hsla(${(hue + x * 6 + y * 4) % 360},70%,70%,.55)`;
      ctx.fillRect(x + 0.4, y + 0.4, 3.2, 3.2);
    }
  }
  ctx.restore();
  ctx.stroke();
  ctx.restore();
  // 얼굴은 돌지 않는다
  blob(ctx, 0, -r - 1, 6.5, 6, '#eceff1');
  gearFace(ctx, 0, -r - 2, 2.8, t + 13);
  if (pose.tier >= 2) {
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = look.accent ?? '#7e57c2';
    ctx.beginPath();
    ctx.moveTo(-r - 4, -6);
    ctx.lineTo(-r - 14, -6);
    ctx.moveTo(-r - 3, -14);
    ctx.lineTo(-r - 11, -14);
    ctx.stroke();
    ctx.restore();
    line(ctx);
  }
  mkBadge(ctx, pose.tier, -4, -2 * r - 4);
}

function gearDebugger(ctx: Ctx, look: Look, pose: Pose): void {
  const t = pose.time;
  tierGlow(ctx, pose.tier, 0, -18, 24);
  line(ctx);
  stubs(ctx, pose, [-8, 8]);
  rrect(ctx, -13, -28, 24, 22, 4, look.color);
  ctx.fillStyle = '#e8eaf6';
  ctx.font = 'bold 6px monospace';
  label(ctx, 'JTAG', -10, -21);
  // 중단점 (깜빡)
  blob(ctx, 6, -31, 4, 4, Math.sin(t * 4) > -0.3 ? (look.accent ?? '#ff1744') : '#b71c1c');
  gearFace(ctx, -2, -14, 4, t + 14);
  mkBadge(ctx, pose.tier, -11, -31);
  // 납작 케이블과 집게
  ctx.fillStyle = '#9e9e9e';
  ctx.beginPath();
  ctx.moveTo(11, -18);
  ctx.quadraticCurveTo(20, -8, 22 + pose.swing * 4, -20);
  ctx.lineTo(24 + pose.swing * 4, -18);
  ctx.quadraticCurveTo(21, -4, 11, -14);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  rrect(ctx, 21 + pose.swing * 4, -25, 6, 7, 1.5, '#212121');
  if (pose.tier >= 3) {
    // 작은 벌레가 갇힌 돋보기
    ctx.beginPath();
    ctx.arc(-15, -36, 4.5, 0, Math.PI * 2);
    ctx.moveTo(-12, -33);
    ctx.lineTo(-9, -30);
    ctx.stroke();
    ctx.fillStyle = '#7cb342';
    ctx.fillRect(-16.5, -37.5, 3, 3);
  }
}

function gearDish(ctx: Ctx, look: Look, pose: Pose): void {
  const t = pose.time;
  tierGlow(ctx, pose.tier, 0, -22, 26);
  line(ctx);
  // 삼각대
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-10, 0);
  ctx.lineTo(0, -16);
  ctx.lineTo(10, 0);
  ctx.moveTo(0, -16);
  ctx.lineTo(0 + (pose.moving ? Math.sin(pose.walk * 2) * 2 : 0), 0);
  ctx.stroke();
  line(ctx);
  rrect(ctx, -6, -22, 12, 8, 3, '#78909c');
  gearFace(ctx, 0, -18, 3, t + 15);
  // 접시 (위·앞을 본다, 흔들흔들 탐색)
  const r = 13 + pose.tier * 1.5;
  ctx.save();
  ctx.translate(2, -30);
  ctx.rotate(-0.7 + Math.sin(t * 0.9) * 0.12 - pose.swing * 0.15);
  ctx.beginPath();
  ctx.ellipse(0, 0, r, r * 0.45, 0, 0, Math.PI);
  ctx.closePath();
  ctx.fillStyle = look.color;
  ctx.fill();
  ctx.stroke();
  // 급전부
  ctx.beginPath();
  ctx.moveTo(-r * 0.6, 2);
  ctx.lineTo(0, -12);
  ctx.lineTo(r * 0.6, 2);
  ctx.stroke();
  blob(ctx, 0, -12, 2.6, 2.6, look.accent ?? '#ff7043');
  ctx.restore();
  mkBadge(ctx, pose.tier, -5, -10);
}

function gearTesla(ctx: Ctx, look: Look, pose: Pose): void {
  const t = pose.time;
  tierGlow(ctx, pose.tier, 0, -30, 32);
  line(ctx);
  stubs(ctx, pose, [-9, 9], 5);
  rrect(ctx, -12, -14, 24, 9, 3, '#455a64');
  gearFace(ctx, 0, -9.5, 4, t + 16);
  // 코일 기둥
  const h = 26 + pose.tier * 3;
  rrect(ctx, -5, -14 - h, 10, h, 2, look.color);
  ctx.strokeStyle = '#d84315';
  ctx.lineWidth = 1;
  for (let y = -16; y > -12 - h; y -= 2.2) {
    ctx.beginPath();
    ctx.moveTo(-5, y);
    ctx.lineTo(5, y - 1);
    ctx.stroke();
  }
  line(ctx);
  // 토러스
  const ty = -14 - h - 3;
  blob(ctx, 0, ty, 13, 5, '#cfd8dc');
  ctx.fillStyle = '#90a4ae';
  ctx.beginPath();
  ctx.ellipse(0, ty - 1, 5, 1.6, 0, 0, Math.PI * 2);
  ctx.fill();
  // 번쩍이는 방전
  ctx.strokeStyle = look.accent ?? '#80d8ff';
  ctx.lineWidth = 1.8;
  const arcs = 2 + (pose.swing > 0 ? 3 : 0) + (pose.tier >= 3 ? 1 : 0);
  for (let i = 0; i < arcs; i++) {
    const a = Math.floor(t * 12 + i * 3.7) * 1.7 + i;
    const ex = Math.cos(a) * (18 + i * 2);
    const ey = ty + Math.sin(a) * 9 - 4;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * 11, ty);
    ctx.lineTo((ex + Math.cos(a) * 11) / 2 + 3, (ey + ty) / 2 - 3);
    ctx.lineTo(ex, ey);
    ctx.stroke();
  }
  line(ctx);
  mkBadge(ctx, pose.tier, 8, -17);
}

function gearTower(ctx: Ctx, look: Look, pose: Pose): void {
  const t = pose.time;
  tierGlow(ctx, pose.tier, 0, -34, 34);
  line(ctx);
  stubs(ctx, pose, [-10, 10], 5);
  rrect(ctx, -13, -14, 26, 9, 3, '#546e7a');
  gearFace(ctx, 0, -9.5, 4, t + 17);
  // 격자 탑
  const top = -56 - pose.tier * 4;
  ctx.strokeStyle = look.color === '#b0bec5' ? '#78909c' : look.color;
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(-9, -14);
  ctx.lineTo(-2, top);
  ctx.moveTo(9, -14);
  ctx.lineTo(2, top);
  for (let i = 0; i < 4; i++) {
    const y0 = -14 + ((top + 14) * i) / 4;
    const y1 = -14 + ((top + 14) * (i + 1)) / 4;
    const w0 = 9 - (7 * i) / 4;
    const w1 = 9 - (7 * (i + 1)) / 4;
    ctx.moveTo(-w0, y0);
    ctx.lineTo(w1, y1);
    ctx.moveTo(w0, y0);
    ctx.lineTo(-w1, y1);
  }
  ctx.stroke();
  line(ctx);
  // 안테나 판넬
  for (const [px, ang] of [[-6, -0.15], [6, 0.15]] as const) {
    ctx.save();
    ctx.translate(px, top + 12);
    ctx.rotate(ang);
    rrect(ctx, -2.5, -7, 5, 14, 1.5, '#eceff1');
    ctx.restore();
  }
  // 꼭대기 경고등
  blob(ctx, 0, top - 2, 2.6, 2.6, Math.sin(t * 3) > 0 ? (look.accent ?? '#ff5252') : '#7f0000');
  // 신호 막대
  for (let i = 0; i < pose.tier + 1; i++) {
    ctx.fillStyle = '#69f0ae';
    ctx.fillRect(10 + i * 3, top + 6 - i * 3, 2, 3 + i * 3);
  }
  mkBadge(ctx, pose.tier, -11, -3);
}

function gearRobotArm(ctx: Ctx, look: Look, pose: Pose): void {
  const t = pose.time;
  tierGlow(ctx, pose.tier, 0, -26, 30);
  line(ctx);
  stubs(ctx, pose, [-10, 10], 5);
  rrect(ctx, -15, -16, 30, 11, 3, look.accent ?? '#455a64');
  gearFace(ctx, -4, -10.5, 4, t + 18);
  mkBadge(ctx, pose.tier, 6, -12);
  // 관절 (공격하면 위로 올려친다)
  const sw = pose.swing;
  const a1 = -1.15 + Math.sin(t * 1.5) * 0.05 + sw * 0.25;
  const a2 = 0.9 - sw * 1.4;
  ctx.save();
  ctx.translate(0, -17);
  blob(ctx, 0, 0, 6, 6, '#90a4ae');
  ctx.rotate(a1);
  rrect(ctx, 0, -4, 24, 8, 4, look.color);
  ctx.translate(24, 0);
  blob(ctx, 0, 0, 4.5, 4.5, '#90a4ae');
  ctx.rotate(a2);
  rrect(ctx, 0, -3.5, 18 + pose.tier * 2, 7, 3.5, look.color);
  ctx.translate(18 + pose.tier * 2, 0);
  // 집게
  const open = 0.4 + sw * 0.4;
  for (const s of [-1, 1]) {
    ctx.save();
    ctx.rotate(s * open);
    rrect(ctx, 0, -1.5, 8, 3, 1.5, '#37474f');
    ctx.restore();
  }
  ctx.restore();
  // 경고 줄무늬
  ctx.fillStyle = '#ffd54f';
  for (let i = 0; i < 4; i++) ctx.fillRect(-14 + i * 7, -7.5, 3, 2);
}

function gearRack(ctx: Ctx, look: Look, pose: Pose): void {
  const t = pose.time;
  tierGlow(ctx, pose.tier, 0, -32, 36);
  line(ctx);
  stubs(ctx, pose, [-11, 11], 4);
  // 회복 구역 김
  ctx.save();
  ctx.globalAlpha = 0.3;
  ctx.fillStyle = '#69f0ae';
  const k = (t * 0.5) % 1;
  ctx.beginPath();
  ctx.ellipse(0, -2, 20 + k * 20, 4 + k * 3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  line(ctx);
  rrect(ctx, -17, -60, 34, 56, 3, look.color);
  // 장비 칸
  const slots = 4 + pose.tier;
  const sh = 44 / slots;
  for (let i = 0; i < slots; i++) {
    const y = -50 + i * sh;
    rrect(ctx, -14, y, 28, sh - 1.5, 1.5, i % 3 === 1 ? '#eceff1' : '#455a64');
    leds(ctx, -12, y + sh / 2 - 2, 3, t + i, look.accent ?? '#00e5ff', 3.5, i);
  }
  // 유리문 반사
  ctx.save();
  ctx.globalAlpha = 0.25;
  ctx.fillStyle = '#e1f5fe';
  ctx.beginPath();
  ctx.moveTo(4, -50);
  ctx.lineTo(12, -50);
  ctx.lineTo(2, -8);
  ctx.lineTo(-6, -8);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  line(ctx);
  // 위 패널 얼굴
  rrect(ctx, -11, -58, 22, 7, 2, '#263238');
  ctx.fillStyle = look.accent ?? '#00e5ff';
  for (const dx of [-4, 4]) ctx.fillRect(dx - 1.5, -56.5, 3, 3);
  // 엉킨 케이블
  ctx.strokeStyle = '#ff7043';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-17, -40);
  ctx.bezierCurveTo(-26, -36, -20, -26, -27, -20);
  ctx.moveTo(-17, -30);
  ctx.bezierCurveTo(-24, -28, -28, -12, -21, -8);
  ctx.stroke();
  line(ctx);
  mkBadge(ctx, pose.tier, 6, -6);
}

function gearReflow(ctx: Ctx, look: Look, pose: Pose): void {
  const t = pose.time;
  tierGlow(ctx, pose.tier, 0, -22, 30);
  line(ctx);
  // 컨베이어 바퀴
  for (const x of [-14, -5, 5, 14]) {
    ctx.save();
    ctx.translate(x, -4);
    ctx.rotate(pose.walk);
    blob(ctx, 0, 0, 3.5, 3.5, '#424242');
    ctx.beginPath();
    ctx.moveTo(-3, 0);
    ctx.lineTo(3, 0);
    ctx.stroke();
    ctx.restore();
  }
  rrect(ctx, -19, -34, 38, 27, 4, look.color);
  // 달아오른 창
  const glow = 0.55 + Math.sin(t * 5) * 0.15 + pose.swing * 0.3;
  ctx.fillStyle = `rgba(255,${Math.round(110 + 60 * (1 - glow))},0,${Math.min(1, glow)})`;
  ctx.beginPath();
  ctx.roundRect(-15, -30, 20, 13, 2);
  ctx.fill();
  ctx.stroke();
  // 안에서 구워지는 기판
  ctx.fillStyle = '#2e7d32';
  ctx.fillRect(-12, -22, 14, 3);
  // 온도 표시
  ctx.fillStyle = '#102027';
  ctx.fillRect(8, -30, 9, 6);
  ctx.fillStyle = '#ff6d00';
  ctx.font = 'bold 5px monospace';
  ctx.fillText(`${200 + pose.tier * 15}`, 8.5, -25.5);
  gearFace(ctx, 12, -16, 2.8, t + 19);
  mkBadge(ctx, pose.tier, -16, -37);
  // 굴뚝 연기
  rrect(ctx, 10, -42, 5, 8, 1, '#546e7a');
  ctx.save();
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = '#eceff1';
  const k = (t * 0.7) % 1;
  ctx.beginPath();
  ctx.arc(12.5 + k * 4, -45 - k * 12, 2 + k * 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function gearEmp(ctx: Ctx, look: Look, pose: Pose): void {
  const t = pose.time;
  tierGlow(ctx, pose.tier, 0, -24, 30);
  line(ctx);
  // 펄스 고리
  ctx.save();
  ctx.strokeStyle = look.accent ?? '#40c4ff';
  for (let i = 0; i < 2 + (pose.tier >= 3 ? 1 : 0); i++) {
    const k = (t * 0.6 + i * 0.33) % 1;
    ctx.globalAlpha = (1 - k) * 0.6;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, -34, 10 + k * 30, 4 + k * 12, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
  line(ctx);
  stubs(ctx, pose, [-10, 10]);
  rrect(ctx, -15, -22, 30, 16, 4, look.color);
  gearFace(ctx, 0, -14, 4, t + 20);
  // 코일 감긴 기둥과 돔
  for (const cx of [-9, 9]) {
    rrect(ctx, cx - 3, -32, 6, 10, 2, '#b87333');
    ctx.strokeStyle = '#6d4c41';
    ctx.lineWidth = 1;
    for (let y = -31; y < -22; y += 2) {
      ctx.beginPath();
      ctx.moveTo(cx - 3, y);
      ctx.lineTo(cx + 3, y);
      ctx.stroke();
    }
    line(ctx);
  }
  ctx.beginPath();
  ctx.arc(0, -30, 10, Math.PI, 0);
  ctx.closePath();
  ctx.fillStyle = '#b0bec5';
  ctx.fill();
  ctx.stroke();
  blob(ctx, 0, -38, 3, 3, Math.sin(t * 6) > 0 ? (look.accent ?? '#40c4ff') : '#01579b');
  mkBadge(ctx, pose.tier, -13, -9);
}

function gearFiber(ctx: Ctx, look: Look, pose: Pose): void {
  const t = pose.time;
  tierGlow(ctx, pose.tier, 0, -18, 24);
  line(ctx);
  // 굴러가는 릴
  const r = 15;
  ctx.save();
  ctx.translate(-2, -r);
  ctx.rotate(pose.walk * 0.8);
  blob(ctx, 0, 0, r, r, '#eceff1');
  ctx.strokeStyle = look.color;
  ctx.lineWidth = 2.2;
  for (let i = 0; i < 3 + pose.tier; i++) {
    ctx.beginPath();
    ctx.arc(0, 0, 5 + i * 2, 0, Math.PI * 2);
    ctx.stroke();
  }
  line(ctx);
  ctx.beginPath();
  for (let i = 0; i < 3; i++) {
    const a = (i * Math.PI * 2) / 3;
    ctx.moveTo(Math.cos(a) * 3, Math.sin(a) * 3);
    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.stroke();
  ctx.restore();
  blob(ctx, -2, -r, 5.5, 5.5, '#fff');
  gearFace(ctx, -2, -r - 1, 2.4, t + 21);
  // 풀려 나온 광섬유와 빛나는 끝
  ctx.strokeStyle = look.color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(10, -24);
  ctx.quadraticCurveTo(20, -36, 24 + pose.swing * 3, -26);
  ctx.stroke();
  line(ctx);
  ctx.save();
  ctx.globalAlpha = 0.6 + Math.sin(t * 12) * 0.3;
  ctx.fillStyle = look.accent ?? '#ea80fc';
  ctx.beginPath();
  ctx.arc(24 + pose.swing * 3, -26, 3 + pose.swing * 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  mkBadge(ctx, pose.tier, -6, -2 * r - 4);
}

function gearQuantum(ctx: Ctx, look: Look, pose: Pose): void {
  const t = pose.time;
  tierGlow(ctx, pose.tier, 0, -34, 38);
  line(ctx);
  // 받침 틀
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-17, 0);
  ctx.lineTo(-17, -66);
  ctx.lineTo(17, -66);
  ctx.lineTo(17, 0);
  ctx.stroke();
  line(ctx);
  const plates = 3 + pose.tier;
  const step = 52 / plates;
  // 동축선 (금색 상들리에)
  ctx.strokeStyle = '#ffb300';
  ctx.lineWidth = 1.4;
  for (const dx of [-5, -1.5, 2, 5.5]) {
    ctx.beginPath();
    ctx.moveTo(dx, -64);
    ctx.lineTo(dx * 0.6, -64 + plates * step);
    ctx.stroke();
  }
  line(ctx);
  for (let i = 0; i < plates; i++) {
    const w = 14 - i * (8 / plates);
    blob(ctx, 0, -62 + i * step, w, 2.4, look.color);
  }
  // 바닥의 큐비트 칩 (반짝이는 두 상태)
  const qy = -62 + plates * step + 2;
  ctx.save();
  ctx.globalAlpha = 0.5 + Math.sin(t * 6) * 0.3;
  ctx.fillStyle = look.accent ?? '#80d8ff';
  ctx.beginPath();
  ctx.arc(0, qy, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  rrect(ctx, -5, qy - 3, 10, 6, 1.5, '#263238');
  // 얼굴: 위 판에서 두 눈이 겹쳤다 갈라졌다 (중첩)
  const sp = 2.5 + Math.sin(t * 2) * 1.5;
  ctx.fillStyle = INK;
  for (const dx of [-sp, sp]) {
    ctx.beginPath();
    ctx.arc(dx, -51, 1.8, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 0.4;
  for (const dx of [-sp - 2, sp + 2]) {
    ctx.beginPath();
    ctx.arc(dx, -51, 1.8, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  // 얼음 김 (희석 냉동기)
  ctx.save();
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = '#e1f5fe';
  const k = (t * 0.5) % 1;
  ctx.beginPath();
  ctx.arc(-10 + k * 4, qy + 6 - k * 6, 2 + k * 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  mkBadge(ctx, pose.tier, -14, -70);
}

function gearAccelerator(ctx: Ctx, look: Look, pose: Pose): void {
  const t = pose.time;
  tierGlow(ctx, pose.tier, 0, -34, 40);
  line(ctx);
  stubs(ctx, pose, [-12, 12], 5);
  rrect(ctx, -6, -18, 12, 13, 2, '#546e7a');
  // 고리
  const R = 22 + pose.tier * 1.5;
  const cy = -18 - R;
  ctx.lineWidth = 9;
  ctx.strokeStyle = INK;
  ctx.beginPath();
  ctx.arc(0, cy, R, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = 6;
  ctx.strokeStyle = look.color;
  ctx.stroke();
  line(ctx);
  // 자석 마디
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    ctx.save();
    ctx.translate(Math.cos(a) * R, cy + Math.sin(a) * R);
    ctx.rotate(a);
    rrect(ctx, -2.5, -5, 5, 10, 1.2, i % 2 ? '#1e88e5' : '#e53935');
    ctx.restore();
  }
  // 도는 입자와 꼬리
  for (let i = 0; i < 4; i++) {
    const a = t * (6 + pose.swing * 10) - i * 0.18;
    ctx.save();
    ctx.globalAlpha = 1 - i * 0.25;
    ctx.fillStyle = look.accent ?? '#ff4081';
    ctx.beginPath();
    ctx.arc(Math.cos(a) * R, cy + Math.sin(a) * R, 3 - i * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  // 안쪽 얼굴판
  blob(ctx, 0, cy, 10, 9, '#eceff1');
  gearFace(ctx, 0, cy - 1, 3.5, t + 22);
  // 빔 출구
  rrect(ctx, R - 2, cy - 3, 10, 6, 1.5, '#37474f');
  if (pose.swing > 0) {
    ctx.save();
    ctx.globalAlpha = pose.swing;
    ctx.fillStyle = look.accent ?? '#ff4081';
    ctx.fillRect(R + 8, cy - 2, 14, 4);
    ctx.restore();
  }
  mkBadge(ctx, pose.tier, -4, -8);
}

function gearNpu(ctx: Ctx, look: Look, pose: Pose): void {
  const t = pose.time;
  tierGlow(ctx, pose.tier, 0, -26, 34);
  line(ctx);
  // 핀 다리 여러 개
  stubs(ctx, pose, [-12, -6, 0, 6, 12], 6);
  rrect(ctx, -17, -32, 34, 26, 3, look.color);
  // 다이 위 신경망
  rrect(ctx, -12, -28, 24, 18, 2, '#1a1a2e');
  const nodes: [number, number][] = [[-8, -24], [-8, -15], [0, -26], [0, -19], [0, -12], [8, -22], [8, -15]];
  ctx.strokeStyle = look.accent ?? '#b388ff';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  for (const [ax, ay] of nodes.slice(0, 2)) for (const [bx, by] of nodes.slice(2, 5)) {
    ctx.moveTo(ax, ay);
    ctx.lineTo(bx, by);
  }
  for (const [ax, ay] of nodes.slice(2, 5)) for (const [bx, by] of nodes.slice(5)) {
    ctx.moveTo(ax, ay);
    ctx.lineTo(bx, by);
  }
  ctx.stroke();
  nodes.forEach(([x, y], i) => {
    ctx.fillStyle = Math.sin(t * 6 - x * 0.4 + i) > 0 ? '#e1bee7' : (look.accent ?? '#b388ff');
    ctx.beginPath();
    ctx.arc(x, y, 1.5, 0, Math.PI * 2);
    ctx.fill();
  });
  line(ctx);
  // 방열판 지느러미 (Mk가 오를수록 높다)
  const fh = 6 + pose.tier * 3;
  ctx.fillStyle = '#90a4ae';
  for (let i = 0; i < 7; i++) {
    ctx.fillRect(-15 + i * 5, -32 - fh, 3, fh);
    ctx.strokeRect(-15 + i * 5, -32 - fh, 3, fh);
  }
  // 얼굴: 이마(방열판 위)의 눈 두 개
  blob(ctx, 0, -36 - fh, 8, 5, '#eceff1');
  gearFace(ctx, 0, -37 - fh, 3, t + 23);
  // 오라 별빛
  ctx.save();
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = look.accent ?? '#b388ff';
  for (let i = 0; i < 3; i++) {
    const a = t * 1.5 + (i * Math.PI * 2) / 3;
    ctx.beginPath();
    ctx.arc(Math.cos(a) * 26, -24 + Math.sin(a) * 10, 2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  mkBadge(ctx, pose.tier, 9, -5);
}

function gearTokamak(ctx: Ctx, look: Look, pose: Pose): void {
  const t = pose.time;
  tierGlow(ctx, pose.tier, 0, -32, 42);
  line(ctx);
  stubs(ctx, pose, [-16, -6, 6, 16], 6);
  // 회복 구역 빛
  ctx.save();
  ctx.globalAlpha = 0.25;
  ctx.fillStyle = '#69f0ae';
  const k = (t * 0.45) % 1;
  ctx.beginPath();
  ctx.ellipse(0, -2, 24 + k * 26, 5 + k * 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  line(ctx);
  // 도넛 몸통
  const cy = -32;
  blob(ctx, 0, cy, 26, 22, look.color);
  // 자석 코일
  const coils = 5 + pose.tier;
  for (let i = 0; i < coils; i++) {
    const x = -22 + (44 * i) / (coils - 1);
    const hh = Math.sqrt(Math.max(0, 1 - (x / 26) ** 2)) * 22;
    rrect(ctx, x - 2, cy - hh, 4, hh * 2, 2, '#b87333');
  }
  // 플라스마 고리
  const pulse = 0.6 + Math.sin(t * 7) * 0.25;
  ctx.save();
  ctx.globalAlpha = pulse;
  ctx.strokeStyle = look.accent ?? '#ff4081';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.ellipse(0, cy, 17, 8, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();
  line(ctx);
  // 가운데 얼굴창
  blob(ctx, 0, cy, 8, 6.5, '#263238');
  ctx.fillStyle = look.accent ?? '#ff4081';
  for (const dx of [-3, 3]) ctx.fillRect(dx - 1.2, cy - 2.5, 2.4, 3.5);
  mkBadge(ctx, pose.tier, -6, cy - 26);
}

// ─────────────────────────── 무한 모드 버그 군단 ───────────────────────────

/** 버그 얼굴: 화난 X자 눈 또는 점눈 */
function glitchEyes(ctx: Ctx, x: number, y: number, gap: number, cross = false): void {
  if (!cross) {
    eyes(ctx, x, y, gap, true, 1.9);
    return;
  }
  ctx.lineWidth = 1.8;
  for (const dx of [-gap, gap]) {
    ctx.beginPath();
    ctx.moveTo(x + dx - 2, y - 2);
    ctx.lineTo(x + dx + 2, y + 2);
    ctx.moveTo(x + dx + 2, y - 2);
    ctx.lineTo(x + dx - 2, y + 2);
    ctx.stroke();
  }
  line(ctx);
}

/** 글리치 띠: 몸 위로 가끔 지나가는 어긋난 줄 */
function glitchBand(ctx: Ctx, t: number, x: number, y: number, w: number, h: number): void {
  if (Math.sin(t * 13) < 0.7) return;
  ctx.save();
  ctx.globalAlpha = 0.6;
  const k = (t * 3) % 1;
  ctx.fillStyle = '#00e5ff';
  ctx.fillRect(x + 2, y + k * h, w, 2);
  ctx.fillStyle = '#ff1744';
  ctx.fillRect(x - 2, y + ((k + 0.4) % 1) * h, w, 1.5);
  ctx.restore();
}

function glitchSegfault(ctx: Ctx, look: Look, pose: Pose): void {
  const t = pose.time;
  line(ctx);
  legs(ctx, pose, 8, 7);
  ctx.save();
  ctx.translate(0, -18);
  ctx.rotate(0.15 + Math.sin(pose.walk * 2) * 0.1);
  // 깨진 포인터 화살표
  ctx.fillStyle = look.color;
  ctx.beginPath();
  ctx.moveTo(-13, -6);
  ctx.lineTo(4, -6);
  ctx.lineTo(4, -12);
  ctx.lineTo(16, 0);
  ctx.lineTo(4, 12);
  ctx.lineTo(4, 6);
  ctx.lineTo(-13, 6);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // 금
  ctx.beginPath();
  ctx.moveTo(-2, -6);
  ctx.lineTo(0, -1);
  ctx.lineTo(-3, 2);
  ctx.lineTo(-1, 6);
  ctx.stroke();
  glitchEyes(ctx, 6, -1, 3);
  ctx.fillStyle = look.accent ?? '#ffcdd2';
  ctx.font = 'bold 5px monospace';
  label(ctx, '0x0', -12, 3);
  ctx.restore();
  glitchBand(ctx, t, -14, -32, 28, 26);
}

function glitchLeak(ctx: Ctx, look: Look, pose: Pose): void {
  const t = pose.time;
  line(ctx);
  // 질척한 몸
  const wob = Math.sin(t * 4) * 1.5;
  ctx.fillStyle = look.color;
  ctx.beginPath();
  ctx.moveTo(-18, 0);
  ctx.quadraticCurveTo(-22 - wob, -20, -6, -30 + wob);
  ctx.quadraticCurveTo(6, -36, 14, -24);
  ctx.quadraticCurveTo(22 + wob, -10, 18, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // 박힌 RAM 막대
  ctx.save();
  ctx.translate(-4, -30);
  ctx.rotate(-0.3);
  rrect(ctx, -10, -5, 20, 7, 1, '#2e7d32');
  ctx.fillStyle = '#212121';
  for (let i = 0; i < 4; i++) ctx.fillRect(-8 + i * 4.5, -4, 3, 4);
  ctx.fillStyle = '#ffd54f';
  for (let i = 0; i < 6; i++) ctx.fillRect(-9 + i * 3.4, 1, 1.5, 1.5);
  ctx.restore();
  // 뚝뚝 떨어지는 방울
  ctx.fillStyle = look.accent ?? '#d1c4e9';
  for (let i = 0; i < 2; i++) {
    const k = (t * 0.8 + i * 0.5) % 1;
    ctx.beginPath();
    ctx.arc(-10 + i * 20, -6 + k * 6, 2 * (1 - k * 0.5), 0, Math.PI * 2);
    ctx.fill();
  }
  glitchEyes(ctx, 2, -16, 5);
  ctx.beginPath();
  ctx.arc(2, -9, 3, Math.PI + 0.3, -0.3);
  ctx.stroke();
}

function glitchLoop(ctx: Ctx, look: Look, pose: Pose): void {
  const t = pose.time;
  line(ctx);
  const cy = -17;
  ctx.save();
  ctx.translate(0, cy);
  ctx.rotate(-pose.walk * 0.9 - t * 1.5);
  ctx.lineWidth = 9;
  ctx.strokeStyle = INK;
  ctx.beginPath();
  ctx.arc(0, 0, 13, 0.4, Math.PI * 2 - 0.2);
  ctx.stroke();
  ctx.lineWidth = 6;
  ctx.strokeStyle = look.color;
  ctx.stroke();
  // 화살촉
  line(ctx);
  ctx.fillStyle = look.accent ?? '#e65100';
  ctx.beginPath();
  ctx.moveTo(13 * Math.cos(0.4) + 6, 13 * Math.sin(0.4) - 2);
  ctx.lineTo(13 * Math.cos(0.4) - 6, 13 * Math.sin(0.4) - 2);
  ctx.lineTo(13 * Math.cos(0.4), 13 * Math.sin(0.4) + 7);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  // 가운데 얼굴 (돌지 않는다, 어지러운 눈)
  blob(ctx, 0, cy, 7, 7, '#fff8e1');
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.3;
  for (const dx of [-2.6, 2.6]) {
    ctx.beginPath();
    ctx.arc(dx, cy - 1, 1.6, t * 6, t * 6 + Math.PI * 1.5);
    ctx.stroke();
  }
  line(ctx);
  ctx.fillStyle = INK;
  ctx.font = 'bold 4px monospace';
  label(ctx, 'while(1)', -8, cy + 5);
}

function glitchConflict(ctx: Ctx, look: Look, pose: Pose): void {
  const t = pose.time;
  line(ctx);
  legs(ctx, pose, 12, 7);
  const jit = Math.sin(t * 20) > 0.8 ? 1.5 : 0;
  // 왼쪽 반 (내 변경)
  ctx.save();
  ctx.translate(-jit, 0);
  ctx.fillStyle = look.color;
  ctx.beginPath();
  ctx.moveTo(1, -40);
  ctx.lineTo(-15, -40);
  ctx.lineTo(-15, -7);
  ctx.lineTo(1, -7);
  ctx.lineTo(-2, -15);
  ctx.lineTo(2, -23);
  ctx.lineTo(-2, -31);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = INK;
  ctx.font = 'bold 5px monospace';
  label(ctx, '<<<<', -14, -34);
  eyes(ctx, -7, -24, 2.5, true, 1.6);
  ctx.restore();
  // 오른쪽 반 (남의 변경)
  ctx.save();
  ctx.translate(jit, 0);
  ctx.fillStyle = look.accent ?? '#ef5350';
  ctx.beginPath();
  ctx.moveTo(3, -40);
  ctx.lineTo(16, -40);
  ctx.lineTo(16, -7);
  ctx.lineTo(3, -7);
  ctx.lineTo(0, -15);
  ctx.lineTo(4, -23);
  ctx.lineTo(0, -31);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = INK;
  ctx.font = 'bold 5px monospace';
  label(ctx, '>>>>', 4, -11);
  eyes(ctx, 9, -24, 2.5, true, 1.6);
  ctx.restore();
  // 가운데 =====
  ctx.fillStyle = '#fff';
  ctx.fillRect(-4, -26, 9, 1.5);
  ctx.fillRect(-4, -23, 9, 1.5);
}

function glitchBsod(ctx: Ctx, look: Look, pose: Pose): void {
  const t = pose.time;
  line(ctx);
  legs(ctx, pose, 10, 6);
  rrect(ctx, -4, -12, 8, 6, 1, '#455a64');
  rrect(ctx, -19, -42, 38, 30, 3, '#cfd8dc');
  rrect(ctx, -16, -39, 32, 23, 2, look.color);
  ctx.fillStyle = look.accent ?? '#fff';
  ctx.font = 'bold 12px Jua, sans-serif';
  label(ctx, ':(', -13, -26);
  ctx.fillStyle = 'rgba(255,255,255,.7)';
  for (let i = 0; i < 3; i++) ctx.fillRect(-13, -22 + i * 2.5, 18 - i * 5, 1.2);
  // 진행률 0%
  ctx.font = 'bold 4px monospace';
  ctx.fillStyle = '#fff';
  label(ctx, `${Math.floor((t * 3) % 2)}%`, 6, -19);
  // 멈춤 장판 물결
  ctx.save();
  ctx.globalAlpha = 0.35;
  ctx.strokeStyle = look.color;
  const k = (t * 0.5) % 1;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(0, -2, 14 + k * 30, 3 + k * 5, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
  line(ctx);
}

function glitchOutage(ctx: Ctx, look: Look, pose: Pose): void {
  const t = pose.time;
  line(ctx);
  legs(ctx, pose, 8, 6);
  // 뽑힌 전선 꼬리
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-10, -18);
  ctx.quadraticCurveTo(-24, -10, -20, -2);
  ctx.stroke();
  line(ctx);
  // 플러그 몸통 (깜빡깜빡)
  const flick = Math.sin(t * 17) > 0.85 ? 0.55 : 1;
  ctx.save();
  ctx.globalAlpha = flick;
  rrect(ctx, -12, -34, 24, 24, 6, look.color);
  // 핀 두 개
  ctx.fillStyle = '#b0bec5';
  ctx.fillRect(-6, -42, 3.5, 8);
  ctx.strokeRect(-6, -42, 3.5, 8);
  ctx.fillRect(3, -42, 3.5, 8);
  ctx.strokeRect(3, -42, 3.5, 8);
  // 노란 눈
  ctx.fillStyle = look.accent ?? '#ffee58';
  for (const dx of [-4.5, 4.5]) {
    ctx.beginPath();
    ctx.arc(dx, -24, 2.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = look.accent ?? '#ffee58';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-4, -16);
  ctx.lineTo(-1, -18);
  ctx.lineTo(2, -16);
  ctx.lineTo(5, -18);
  ctx.stroke();
  ctx.restore();
  line(ctx);
  // 튀는 불꽃
  if (Math.sin(t * 9) > 0.3) {
    ctx.strokeStyle = '#ffee58';
    ctx.beginPath();
    ctx.moveTo(-20, -2);
    ctx.lineTo(-24, -6);
    ctx.lineTo(-21, -7);
    ctx.lineTo(-26, -12);
    ctx.stroke();
    line(ctx);
  }
}

function glitchPanic(ctx: Ctx, look: Look, pose: Pose): void {
  const t = pose.time;
  line(ctx);
  legs(ctx, pose, 14, 9);
  // 휘두르는 케이블 팔
  const sw = pose.swing;
  for (const s of [-1, 1]) {
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(s * 18, -30);
    ctx.bezierCurveTo(s * 28, -40 - sw * 8, s * 24 + Math.sin(t * 8 + s) * 4, -50, s * 30, -54 - sw * 6);
    ctx.stroke();
    blob(ctx, s * 30, -54 - sw * 6, 3, 3, '#ff1744');
  }
  line(ctx);
  // 터미널 몸통
  rrect(ctx, -20, -54, 40, 46, 4, look.color);
  rrect(ctx, -17, -51, 34, 30, 2, '#000');
  // 흐르는 16진수
  ctx.save();
  ctx.beginPath();
  ctx.rect(-16, -50, 32, 28);
  ctx.clip();
  ctx.fillStyle = look.accent ?? '#ff1744';
  ctx.font = 'bold 4px monospace';
  const off = (t * 14) % 6;
  for (let i = 0; i < 6; i++) {
    const n = Math.floor(t * 3 + i * 7) % 4096;
    ctx.fillText(`0x${(n * 2654435761 >>> 20).toString(16).padStart(3, '0')}`, -15, -45 + i * 6 - off);
  }
  ctx.restore();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 7px monospace';
  label(ctx, 'PANIC', -12, -30);
  // 얼굴 (아래판)
  glitchEyes(ctx, 0, -15, 7, Math.sin(t * 2) > 0.5);
  ctx.beginPath();
  ctx.moveTo(-5, -10);
  ctx.lineTo(-2, -12);
  ctx.lineTo(1, -10);
  ctx.lineTo(4, -12);
  ctx.stroke();
  glitchBand(ctx, t, -22, -56, 44, 48);
}

function glitchLegacy(ctx: Ctx, look: Look, pose: Pose): void {
  const t = pose.time;
  line(ctx);
  legs(ctx, pose, 16, 9);
  // 낡은 CRT 모니터
  rrect(ctx, -12, -18, 24, 10, 2, '#bcaaa4');
  rrect(ctx, -22, -52, 44, 36, 5, look.color);
  rrect(ctx, -18, -48, 30, 26, 6, '#102010');
  ctx.save();
  ctx.beginPath();
  ctx.rect(-17, -47, 28, 24);
  ctx.clip();
  ctx.fillStyle = look.accent === '#33691e' ? '#76ff03' : (look.accent ?? '#76ff03');
  ctx.font = 'bold 4px monospace';
  const lines = ['GOTO 10', 'IF X=1', '// TODO', 'DO NOT', ' TOUCH', 'PERFORM'];
  lines.forEach((s, i) => ctx.fillText(s, -16, -42 + i * 4.5));
  ctx.restore();
  // 노브와 플로피 슬롯
  blob(ctx, 16, -42, 2.5, 2.5, '#8d6e63');
  blob(ctx, 16, -35, 2.5, 2.5, '#8d6e63');
  ctx.fillStyle = INK;
  ctx.fillRect(13, -27, 7, 1.5);
  // 콧수염 같은 얼굴 (모니터 아래 테)
  eyes(ctx, -3, -20.5, 6, true, 1.6);
  // 거미줄
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,.75)';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 6;
    ctx.moveTo(-22, -52);
    ctx.lineTo(-22 + Math.cos(a) * 12, -52 + Math.sin(a) * 12);
  }
  for (const r of [5, 9]) ctx.arc(-22, -52, r, 0, Math.PI / 2);
  ctx.stroke();
  ctx.restore();
  // 먼지
  ctx.save();
  ctx.globalAlpha = 0.4;
  ctx.fillStyle = '#d7ccc8';
  const k = (t * 0.4) % 1;
  ctx.beginPath();
  ctx.arc(20 - k * 6, -54 - k * 10, 2 + k * 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // 호환성 래퍼 표시 (플로피 디스크 방패)
  rrect(ctx, -30, -34, 10, 10, 1, '#37474f');
  ctx.fillStyle = '#cfd8dc';
  ctx.fillRect(-28, -34, 6, 3.5);
  line(ctx);
}

function glitch(ctx: Ctx, look: Look, pose: Pose): void {
  switch (look.variant) {
    case 'segfault': glitchSegfault(ctx, look, pose); break;
    case 'leak': glitchLeak(ctx, look, pose); break;
    case 'loop': glitchLoop(ctx, look, pose); break;
    case 'conflict': glitchConflict(ctx, look, pose); break;
    case 'bsod': glitchBsod(ctx, look, pose); break;
    case 'outage': glitchOutage(ctx, look, pose); break;
    case 'panic': glitchPanic(ctx, look, pose); break;
    case 'legacy': glitchLegacy(ctx, look, pose); break;
    default: glitchSegfault(ctx, look, pose);
  }
}

/** 전투에서 장비가 학생 유닛(키 약 53)보다 작아 보이지 않게 그림 전체를 키운다 (발 기준) */
export const GEAR_DRAW_SCALE = 1.2;

function gear(ctx: Ctx, look: Look, pose: Pose): void {
  ctx.scale(GEAR_DRAW_SCALE, GEAR_DRAW_SCALE);
  switch (look.variant) {
    case 'iron': gearIron(ctx, look, pose); break;
    case 'scope': gearScope(ctx, look, pose); break;
    case 'firewall': gearFirewall(ctx, look, pose); break;
    case 'cooler': gearCooler(ctx, look, pose); break;
    case 'printer3d': gearPrinter3d(ctx, look, pose); break;
    case 'turret': gearTurret(ctx, look, pose); break;
    case 'cluster': gearCluster(ctx, look, pose); break;
    case 'breadboard': gearBreadboard(ctx, look, pose); break;
    case 'multimeter': gearMultimeter(ctx, look, pose); break;
    case 'arduino': gearArduino(ctx, look, pose); break;
    case 'logic': gearLogic(ctx, look, pose); break;
    case 'ups': gearUps(ctx, look, pose); break;
    case 'pi': gearPi(ctx, look, pose); break;
    case 'siggen': gearSiggen(ctx, look, pose); break;
    case 'router': gearRouter(ctx, look, pose); break;
    case 'packet': gearPacket(ctx, look, pose); break;
    case 'wafer': gearWafer(ctx, look, pose); break;
    case 'debugger': gearDebugger(ctx, look, pose); break;
    case 'dish': gearDish(ctx, look, pose); break;
    case 'tesla': gearTesla(ctx, look, pose); break;
    case 'tower': gearTower(ctx, look, pose); break;
    case 'robotarm': gearRobotArm(ctx, look, pose); break;
    case 'rack': gearRack(ctx, look, pose); break;
    case 'reflow': gearReflow(ctx, look, pose); break;
    case 'emp': gearEmp(ctx, look, pose); break;
    case 'fiber': gearFiber(ctx, look, pose); break;
    case 'quantum': gearQuantum(ctx, look, pose); break;
    case 'accelerator': gearAccelerator(ctx, look, pose); break;
    case 'npu': gearNpu(ctx, look, pose); break;
    case 'tokamak': gearTokamak(ctx, look, pose); break;
    default: gearScope(ctx, look, pose);
  }
}

// ─────────────────────────── 꾸미기 (심사 결과 뽑기) ───────────────────────────

/** 옷장: defId(유닛 id, 주인공 'hero') → 입힌 모자·색. 겉모습만 바꾼다. */
let wardrobe: Record<string, Outfit> = {};
/** 모자를 썼으면 3단계 학사모를 숨긴다 */
let capHidden = false;

export function setWardrobe(w: Record<string, Outfit>): void {
  wardrobe = w;
}

/** 초상 캐시 키에 넣을 꾸미기 표시 */
export function outfitKey(defId: string, outfit?: Outfit): string {
  const o = outfit ?? wardrobe[defId];
  return o ? `${o.hat ?? ''}/${o.color ?? ''}` : '';
}

/** 팔레트 색 (홀로그램은 시간에 따라 돈다) */
function paletteColor(id: string, time: number): string | undefined {
  const c = COSMETIC_BY_ID[id]?.color;
  if (c === 'holo') return `hsl(${Math.round((time * 70 + 190) % 360)}, 80%, 72%)`;
  return c;
}

/** 머리 기준점: 정수리 (x, top), 머리 반폭 w, 눈 위치 (ex, ey). 그리기 함수가 옮긴 좌표계 안에서 쓴다. */
interface HeadAnchor { x: number; top: number; w: number; ex: number; ey: number }

function headAnchor(kind: Look['kind'], tier: number): HeadAnchor | null {
  switch (kind) {
    case 'student': return { x: 0, top: -53, w: 13, ex: 3, ey: -39 };
    case 'drone': return { x: 0, top: -27, w: 11, ex: 4, ey: -15 };
    case 'gpu': {
      const w = 34 + (tier - 1) * 6;
      const h = 40 + (tier - 1) * 6;
      return { x: 0, top: -h - 6, w: w * 0.42, ex: -4, ey: -h + 6 };
    }
    case 'claudy': return { x: 0, top: -44, w: 12, ex: 2, ey: -27 };
    case 'codexy': return { x: 0, top: tier >= 2 ? -44 : -40, w: 13, ex: 0, ey: -29 };
    case 'jaeminai': return { x: 0, top: -34, w: 12, ex: 2, ey: -22 };
    default: return null;
  }
}

/** 모자·액세서리. 원점은 정수리(안경류는 눈), 크기는 학생 머리(반폭 13) 기준. */
function drawHat(ctx: Ctx, id: string, a: HeadAnchor, time: number): void {
  const def = COSMETIC_BY_ID[id];
  if (!def) return;
  ctx.save();
  const k = a.w / 13;
  if (def.face) ctx.translate(a.ex, a.ey);
  else ctx.translate(a.x, a.top);
  ctx.scale(k, k);
  line(ctx, 2.2);
  switch (id) {
    case 'beanie':
      ctx.fillStyle = '#ef5350';
      ctx.beginPath();
      ctx.moveTo(-14, 7);
      ctx.bezierCurveTo(-14, -10, 14, -10, 14, 7);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      rrect(ctx, -15, 3, 30, 6, 3, '#c62828');
      blob(ctx, 0, -8, 4.2, 4.2, '#fff');
      break;
    case 'ribbon':
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(0, 13, 14, Math.PI * 1.08, Math.PI * 1.92);
      ctx.stroke();
      ctx.lineWidth = 2.6;
      ctx.strokeStyle = '#ff6fa8';
      ctx.stroke();
      line(ctx, 2);
      ctx.fillStyle = '#ff6fa8';
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(6, 1);
        ctx.lineTo(6 + s * 8, -5);
        ctx.lineTo(6 + s * 8, 6);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
      blob(ctx, 6, 1, 2.6, 2.6, '#ff4081');
      break;
    case 'sprout':
      ctx.rotate(Math.sin(time * 2.5) * 0.15);
      ctx.beginPath();
      ctx.moveTo(0, 3);
      ctx.lineTo(0, -10);
      ctx.stroke();
      ctx.fillStyle = '#7cb342';
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.ellipse(s * 5, -11, 6, 3.2, s * -0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      break;
    case 'ballcap':
      ctx.fillStyle = '#1e88e5';
      ctx.beginPath();
      ctx.moveTo(-14, 6);
      ctx.bezierCurveTo(-14, -9, 14, -9, 14, 6);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(10, 4);
      ctx.quadraticCurveTo(24, 2, 26, 7);
      ctx.lineTo(11, 7);
      ctx.closePath();
      ctx.fillStyle = '#1565c0';
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 8px Jua, sans-serif';
      label(ctx, 'LW', -6, 3);
      break;
    case 'roundglasses':
      ctx.fillStyle = 'rgba(255,255,255,.35)';
      ctx.lineWidth = 2.4;
      for (const dx of [-5, 6]) {
        ctx.beginPath();
        ctx.arc(dx, 0, 5.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.moveTo(-10, -1);
      ctx.lineTo(-14, -3);
      ctx.stroke();
      break;
    case 'sunglasses':
      for (const dx of [-5, 6]) rrect(ctx, dx - 5, -3.5, 10, 7, 3, '#212121');
      ctx.beginPath();
      ctx.moveTo(-10, -1);
      ctx.lineTo(-14, -3);
      ctx.stroke();
      ctx.strokeStyle = '#90caf9';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(-7, -1.5);
      ctx.lineTo(-4, -1.5);
      ctx.moveTo(4, -1.5);
      ctx.lineTo(7, -1.5);
      ctx.stroke();
      break;
    case 'headphones':
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(0, 13, 15.5, Math.PI * 1.05, Math.PI * 1.95);
      ctx.stroke();
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#424242';
      ctx.stroke();
      line(ctx, 2.2);
      rrect(ctx, -19, 8, 7, 13, 3, '#26c6da');
      rrect(ctx, 12, 8, 7, 13, 3, '#26c6da');
      break;
    case 'catears':
      for (const s of [-1, 1]) {
        ctx.fillStyle = '#ffb74d';
        ctx.beginPath();
        ctx.moveTo(s * 3, 4);
        ctx.lineTo(s * 9, -9);
        ctx.lineTo(s * 14, 6);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#f8bbd0';
        ctx.beginPath();
        ctx.moveTo(s * 6, 3);
        ctx.lineTo(s * 9, -4);
        ctx.lineTo(s * 11.5, 4);
        ctx.closePath();
        ctx.fill();
      }
      break;
    case 'partyhat': {
      ctx.rotate(0.22);
      const cone = (): void => {
        ctx.beginPath();
        ctx.moveTo(-9, 5);
        ctx.lineTo(0, -20);
        ctx.lineTo(9, 5);
        ctx.closePath();
      };
      cone();
      ctx.fillStyle = '#ab47bc';
      ctx.fill();
      ctx.save();
      ctx.clip();
      ctx.strokeStyle = '#ffeb3b';
      ctx.lineWidth = 3;
      for (let i = -3; i <= 3; i++) {
        ctx.beginPath();
        ctx.moveTo(-12, i * 7);
        ctx.lineTo(12, i * 7 - 8);
        ctx.stroke();
      }
      ctx.restore();
      line(ctx, 2.2);
      cone();
      ctx.stroke();
      blob(ctx, 0, -21, 3.4, 3.4, '#ff7043');
      break;
    }
    case 'velvet':
      blob(ctx, 0, -1, 11, 7, '#7b1fa2');
      ctx.beginPath();
      ctx.ellipse(0, 4, 15, 4, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#4a148c';
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = '#ffca28';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, -7);
      ctx.quadraticCurveTo(13, -6, 14, 8);
      ctx.stroke();
      line(ctx, 2);
      blob(ctx, 14, 10, 2.4, 3.2, '#ffca28');
      break;
    case 'crown':
      ctx.beginPath();
      ctx.moveTo(-12, 6);
      ctx.lineTo(-13, -9);
      ctx.lineTo(-6, -2);
      ctx.lineTo(0, -12);
      ctx.lineTo(6, -2);
      ctx.lineTo(13, -9);
      ctx.lineTo(12, 6);
      ctx.closePath();
      ctx.fillStyle = '#ffd54f';
      ctx.fill();
      ctx.stroke();
      blob(ctx, 0, 1, 2.6, 2.6, '#e53935');
      blob(ctx, -7, 2, 1.8, 1.8, '#42a5f5');
      blob(ctx, 7, 2, 1.8, 1.8, '#66bb6a');
      ctx.globalAlpha = 0.5 + 0.5 * Math.sin(time * 5);
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(-9, -4, 1.4, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'halo':
      ctx.translate(0, -9 + Math.sin(time * 3) * 1.5);
      ctx.shadowColor = '#fff59d';
      ctx.shadowBlur = 8;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.ellipse(0, 0, 12, 3.6, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#ffe082';
      ctx.stroke();
      break;
    case 'laurel':
      for (const s of [-1, 1]) {
        for (let i = 0; i < 4; i++) {
          const ang = Math.PI * 1.5 + s * (0.35 + i * 0.32);
          ctx.fillStyle = i % 2 ? '#9ccc65' : '#c0ca33';
          ctx.beginPath();
          ctx.ellipse(Math.cos(ang) * 15, 13 + Math.sin(ang) * 15, 5, 2.4, ang + Math.PI / 2 + s * 0.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
      }
      blob(ctx, 0, -1, 2, 2, '#ffca28');
      break;
  }
  ctx.restore();
}

/**
 * 캐릭터 하나를 (x, y) 발 위치에 그린다. facing 1이면 오른쪽(아군), -1이면 왼쪽(적)을 본다.
 * 그림은 오른쪽을 보는 기준으로 작성되어 있고, 적은 좌우 반전한다.
 * 옷장(setWardrobe)에 defId가 있으면 그 모자·색을 입힌다. outfit을 주면 그것을 대신 쓴다.
 */
export function drawCharacter(ctx: Ctx, look: Look, pose: Pose, x: number, y: number, facing: 1 | -1, defId = '', outfit?: Outfit): void {
  const fit = outfit ?? wardrobe[defId];
  if (fit?.color) {
    const c = paletteColor(fit.color, pose.time);
    if (c) look = { ...look, color: c };
  }
  const hat = fit?.hat ? COSMETIC_BY_ID[fit.hat] : undefined;
  capHidden = !!hat && !hat.face;
  const s = look.scale ?? 1;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(facing * s, s);
  switch (look.kind) {
    case 'student': student(ctx, look, pose); break;
    case 'drone': drone(ctx, look, pose); break;
    case 'gpu': gpu(ctx, look, pose); break;
    case 'claudy': claudy(ctx, look, pose); break;
    case 'codexy': codexy(ctx, look, pose); break;
    case 'jaeminai': jaeminai(ctx, look, pose); break;
    case 'memo': memo(ctx, look, pose); break;
    case 'envelope': envelope(ctx, look, pose); break;
    case 'clock': clock(ctx, look, pose); break;
    case 'plane': plane(ctx, look, pose); break;
    case 'reviewer': reviewer(ctx, look, pose); break;
    case 'ta': ta(ctx, look, pose); break;
    case 'paperwork': paperwork(ctx, look, pose); break;
    case 'binder': binder(ctx, look, pose); break;
    case 'revision': revision(ctx, look, pose); break;
    case 'notif': notif(ctx, look, pose); break;
    case 'professor': professor(ctx, look, pose, defId); break;
    case 'ghost': ghost(ctx, look, pose, defId); break;
    case 'printer': printer(ctx, look, pose); break;
    case 'whiteboard': whiteboard(ctx, look, pose); break;
    case 'gear': gear(ctx, look, pose); break;
    case 'glitch': glitch(ctx, look, pose); break;
    case 'sidefoe': drawSideFoe(ctx, look, pose); break;
  }
  if (hat) {
    const a = headAnchor(look.kind, pose.tier);
    if (a) drawHat(ctx, hat.id, a, pose.time);
  }
  capHidden = false;
  ctx.restore();
}
