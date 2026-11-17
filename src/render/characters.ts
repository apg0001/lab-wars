import type { Look } from '../data/types';
import { COSMETIC_BY_ID, type Outfit } from '../data/cosmetics';
import { tr } from '../i18n';

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
function label(ctx: Ctx, text: string, x: number, y: number, en?: string): void {
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

function line(ctx: Ctx, w = 2.5): void {
  ctx.strokeStyle = INK;
  ctx.lineWidth = w;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
}

function blob(ctx: Ctx, x: number, y: number, rx: number, ry: number, fill: string): void {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.stroke();
}

function rrect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number, fill: string): void {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.stroke();
}

function eyes(ctx: Ctx, x: number, y: number, gap: number, angry = false, size = 2.2): void {
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

function legs(ctx: Ctx, pose: Pose, spread = 6, len = 8, color = '#455a64'): void {
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
  }
  if (hat) {
    const a = headAnchor(look.kind, pose.tier);
    if (a) drawHat(ctx, hat.id, a, pose.time);
  }
  capHidden = false;
  ctx.restore();
}
