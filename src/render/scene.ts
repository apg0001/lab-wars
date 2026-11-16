import { ALLY_FRONT, ENEMY_FRONT, GROUND_Y, WORLD_W, type Battle, type Base, type Fighter, type Projectile } from '../sim/battle';
import { drawCharacter, INK } from './characters';

/** 기준 화면 크기 (16:9). 더 넓은 화면에서는 세로를 고정하고 가로로 더 보여준다. */
export const VIEW_W = 960;
export const VIEW_H = 540;
/** 가장 넓게 보여줄 가로 폭 (약 21.6:9) */
export const VIEW_W_MAX = 1296;

let viewW = VIEW_W;
/** 현재 화면 비율에 맞는 가로 폭 */
export const viewWidth = (): number => viewW;
export function setViewAspect(aspect: number): number {
  viewW = Math.round(Math.min(VIEW_W_MAX, Math.max(viewW, VIEW_H * aspect)));
  return viewW;
}

type Ctx = CanvasRenderingContext2D;

export function drawBattle(ctx: Ctx, b: Battle, camX: number, time: number): void {
  ctx.save();
  drawBackdrop(ctx, camX);
  ctx.translate(-camX, 0);
  drawPrinterRange(ctx, ALLY_FRONT + b.loadout.printerRange);
  drawLab(ctx, b.ally, time);
  drawOffice(ctx, b.enemy, time);

  // 지상 → 공중 순, 같은 층은 깊이(y) 순으로 그린다
  const sorted = [...b.fighters].sort((p, q) => Number(!!p.stats.flying) - Number(!!q.stats.flying) || b.fy(p) - b.fy(q));
  for (const f of sorted) drawFighter(ctx, b, f, time);
  for (const p of b.projectiles) drawProjectile(ctx, p, time);
  drawFx(ctx, b, false);
  ctx.restore();
  drawFx(ctx, b, true);
}

// ─────────────── 배경 ───────────────

function drawBackdrop(ctx: Ctx, camX: number): void {
  // 복도 벽
  const g = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
  g.addColorStop(0, '#f3efe6');
  g.addColorStop(1, '#e4ddcc');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, viewW, GROUND_Y);

  // 원경: 복도 문과 게시판 (시차 0.5)
  ctx.save();
  ctx.translate(-camX * 0.5, 0);
  for (let i = 0; i < 11; i++) {
    const x = 160 + i * 150;
    ctx.fillStyle = '#d7ccb5';
    ctx.fillRect(x, 170, 70, 150);
    ctx.fillStyle = '#c4b79c';
    ctx.fillRect(x + 6, 178, 58, 142);
    ctx.fillStyle = '#8d7b5f';
    ctx.beginPath();
    ctx.arc(x + 56, 255, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.fillRect(x + 18, 190, 34, 12);
    ctx.fillStyle = '#9e9e9e';
    ctx.font = '8px Jua, sans-serif';
    ctx.fillText(`${301 + i}호`, x + 24, 199);
    if (i % 2 === 0) {
      // 게시판
      ctx.fillStyle = '#a1887f';
      ctx.fillRect(x + 85, 200, 50, 40);
      ctx.fillStyle = '#fff59d';
      ctx.fillRect(x + 90, 205, 14, 14);
      ctx.fillStyle = '#e1f5fe';
      ctx.fillRect(x + 108, 208, 20, 26);
    }
  }
  ctx.restore();

  // 걸레받이와 바닥 타일 (시차 1)
  ctx.fillStyle = '#8d7b5f';
  ctx.fillRect(0, GROUND_Y - 8, viewW, 8);
  const fg = ctx.createLinearGradient(0, GROUND_Y, 0, VIEW_H);
  fg.addColorStop(0, '#cfd8dc');
  fg.addColorStop(1, '#b0bec5');
  ctx.fillStyle = fg;
  ctx.fillRect(0, GROUND_Y, viewW, VIEW_H - GROUND_Y);
  ctx.strokeStyle = 'rgba(0,0,0,.08)';
  ctx.lineWidth = 1;
  const off = -(camX % 60);
  for (let x = off; x < viewW; x += 60) {
    ctx.beginPath();
    ctx.moveTo(x, GROUND_Y);
    ctx.lineTo(x - 30, VIEW_H);
    ctx.stroke();
  }
  for (const y of [470, 505]) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(viewW, y);
    ctx.stroke();
  }
}

/** 프린터 포탑 사거리: 바닥을 옅게 칠하고 끝에 점선 표시 */
function drawPrinterRange(ctx: Ctx, edge: number): void {
  ctx.save();
  ctx.fillStyle = 'rgba(66,165,245,.08)';
  ctx.fillRect(ALLY_FRONT, GROUND_Y, edge - ALLY_FRONT, VIEW_H - GROUND_Y);
  ctx.strokeStyle = 'rgba(30,136,229,.55)';
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 6]);
  ctx.beginPath();
  ctx.moveTo(edge, GROUND_Y);
  ctx.lineTo(edge - 20, VIEW_H);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.font = '12px Jua, sans-serif';
  ctx.fillStyle = 'rgba(30,136,229,.8)';
  ctx.fillText('🖨️', edge - 8, GROUND_Y + 18);
  ctx.restore();
}

function crack(ctx: Ctx, base: Base, x: number, w: number): void {
  const ratio = base.hp / base.maxHp;
  if (ratio > 0.66) return;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + w * 0.3, GROUND_Y - 200);
  ctx.lineTo(x + w * 0.4, GROUND_Y - 170);
  ctx.lineTo(x + w * 0.32, GROUND_Y - 150);
  if (ratio < 0.33) {
    ctx.moveTo(x + w * 0.7, GROUND_Y - 120);
    ctx.lineTo(x + w * 0.6, GROUND_Y - 90);
    ctx.lineTo(x + w * 0.72, GROUND_Y - 60);
  }
  ctx.stroke();
}

function drawLab(ctx: Ctx, base: Base, time: number): void {
  const x = 30;
  const w = ALLY_FRONT - x;
  const top = GROUND_Y - 230;
  const shake = base.hitFlash > 0 ? Math.sin(time * 80) * 2 : 0;
  ctx.save();
  ctx.translate(shake, 0);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.lineJoin = 'round';
  // 건물
  ctx.fillStyle = '#90caf9';
  ctx.beginPath();
  ctx.roundRect(x, top, w, 230, 8);
  ctx.fill();
  ctx.stroke();
  // 창문: 모니터 불빛
  ctx.fillStyle = '#263238';
  ctx.fillRect(x + 18, top + 30, 52, 40);
  ctx.strokeRect(x + 18, top + 30, 52, 40);
  ctx.fillStyle = Math.sin(time * 3) > -0.8 ? '#80deea' : '#4dd0e1';
  ctx.fillRect(x + 24, top + 36, 18, 12);
  ctx.fillRect(x + 46, top + 36, 18, 12);
  ctx.fillStyle = '#ffcc80';
  ctx.fillRect(x + 24, top + 52, 40, 12);
  // 문
  ctx.fillStyle = '#5c6bc0';
  ctx.fillRect(x + 82, top + 120, 52, 110);
  ctx.strokeRect(x + 82, top + 120, 52, 110);
  // 간판
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.roundRect(x + 14, top + 90, 62, 22, 4);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = INK;
  ctx.font = 'bold 13px Jua, sans-serif';
  ctx.fillText('연구실', x + 25, top + 106);
  // 지붕의 프린터 포탑
  ctx.fillStyle = '#eceff1';
  ctx.beginPath();
  ctx.roundRect(x + 45, top - 30, 60, 30, 5);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.fillRect(x + 58, top - 40, 34, 12);
  ctx.strokeRect(x + 58, top - 40, 34, 12);
  ctx.fillStyle = '#66bb6a';
  ctx.beginPath();
  ctx.arc(x + 95, top - 15, 3, 0, Math.PI * 2);
  ctx.fill();
  crack(ctx, base, x, w);
  ctx.restore();
}

function drawOffice(ctx: Ctx, base: Base, time: number): void {
  const x = ENEMY_FRONT;
  const w = WORLD_W - 30 - x;
  const top = GROUND_Y - 240;
  const shake = base.hitFlash > 0 ? Math.sin(time * 80) * 2 : 0;
  ctx.save();
  ctx.translate(shake, 0);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.lineJoin = 'round';
  ctx.fillStyle = '#6d4c41';
  ctx.beginPath();
  ctx.roundRect(x, top, w, 240, 8);
  ctx.fill();
  ctx.stroke();
  // 나무 결
  ctx.strokeStyle = 'rgba(0,0,0,.18)';
  ctx.lineWidth = 2;
  for (let i = 1; i < 6; i++) {
    ctx.beginPath();
    ctx.moveTo(x + 6, top + i * 40);
    ctx.lineTo(x + w - 6, top + i * 40 + 6);
    ctx.stroke();
  }
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  // 문
  ctx.fillStyle = '#4e342e';
  ctx.fillRect(x + 16, top + 120, 56, 120);
  ctx.strokeRect(x + 16, top + 120, 56, 120);
  ctx.fillStyle = '#ffd54f';
  ctx.beginPath();
  ctx.arc(x + 24, top + 185, 4, 0, Math.PI * 2);
  ctx.fill();
  // 명패
  ctx.fillStyle = '#ffd54f';
  ctx.beginPath();
  ctx.roundRect(x + 30, top + 80, 90, 24, 3);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = INK;
  ctx.font = 'bold 14px Jua, sans-serif';
  ctx.fillText('교수실', x + 53, top + 98);
  // 창문: 의심스러운 눈빛
  ctx.fillStyle = '#ffecb3';
  ctx.fillRect(x + 82, top + 20, 50, 40);
  ctx.strokeRect(x + 82, top + 20, 50, 40);
  ctx.fillStyle = INK;
  const look = Math.sin(time * 0.8) * 4;
  ctx.fillRect(x + 96 + look, top + 38, 5, 5);
  ctx.fillRect(x + 112 + look, top + 38, 5, 5);
  // 레이저 포인터 포탑
  ctx.fillStyle = '#37474f';
  ctx.beginPath();
  ctx.roundRect(x + 45, top - 26, 60, 26, 5);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#90a4ae';
  ctx.fillRect(x + 25, top - 18, 30, 8);
  ctx.strokeRect(x + 25, top - 18, 30, 8);
  ctx.fillStyle = '#ff1744';
  ctx.beginPath();
  ctx.arc(x + 25, top - 14, 3, 0, Math.PI * 2);
  ctx.fill();
  crack(ctx, base, x, w);
  ctx.restore();
}

// ─────────────── 캐릭터 ───────────────

function drawFighter(ctx: Ctx, b: Battle, f: Fighter, time: number): void {
  const y = b.fy(f);
  const facing = f.side === 'ally' ? 1 : -1;
  ctx.save();
  if (f.dead) {
    ctx.globalAlpha = Math.max(0, 1 - f.deathT / 0.6);
    ctx.translate(0, -f.deathT * 30);
  }
  // 그림자
  ctx.fillStyle = 'rgba(0,0,0,.15)';
  ctx.beginPath();
  ctx.ellipse(f.x, (f.stats.flying ? GROUND_Y : y) + 2, 14 * (f.look.scale ?? 1), 4, 0, 0, Math.PI * 2);
  ctx.fill();
  const shakeX = f.hitFlash > 0 ? (Math.random() - 0.5) * 3 : 0;
  drawCharacter(ctx, f.look, { walk: f.walk, swing: f.swing, tier: f.tier, time, moving: !f.attacking && !f.dead }, f.x + shakeX, y, facing as 1 | -1, f.defId);
  ctx.restore();

  // 체력바 (다쳤을 때만, 보스는 상단 HUD에서 표시)
  if (!f.dead && !f.isBoss && f.hp < f.maxHp) {
    const s = f.look.scale ?? 1;
    const w = 26 * s;
    const top = y - 62 * s - (f.tier >= 3 ? 8 : 0);
    ctx.fillStyle = 'rgba(0,0,0,.45)';
    ctx.fillRect(f.x - w / 2, top, w, 4);
    ctx.fillStyle = f.side === 'ally' ? '#66bb6a' : '#ef5350';
    ctx.fillRect(f.x - w / 2, top, w * (f.hp / f.maxHp), 4);
  }
}

// ─────────────── 투사체 ───────────────

function drawProjectile(ctx: Ctx, p: Projectile, time: number): void {
  const k = Math.min(1, p.t / p.dur);
  const x = p.x0 + (p.x1 - p.x0) * k;
  const y = p.y0 + (p.y1 - p.y0) * k - Math.sin(k * Math.PI) * p.arc;
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  switch (p.kind) {
    case 'laser': {
      ctx.restore();
      ctx.save();
      ctx.strokeStyle = 'rgba(255,23,68,.85)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(p.x0 - 75, p.y0 + 14);
      ctx.lineTo(x, y);
      ctx.stroke();
      break;
    }
    case 'flask':
    case 'bomb':
      ctx.rotate(time * 10);
      ctx.fillStyle = p.kind === 'flask' ? '#69f0ae' : '#212121';
      ctx.beginPath();
      ctx.arc(0, 0, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      break;
    case 'paper':
      ctx.rotate(k * 6);
      ctx.fillStyle = '#fff';
      ctx.fillRect(-6, -4, 12, 8);
      ctx.strokeRect(-6, -4, 12, 8);
      break;
    case 'bug':
      ctx.fillStyle = '#7cb342';
      ctx.beginPath();
      ctx.ellipse(0, 0, 5, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-3, -4);
      ctx.lineTo(-5, -8);
      ctx.moveTo(3, -4);
      ctx.lineTo(5, -8);
      ctx.stroke();
      break;
    case 'code':
      ctx.fillStyle = '#69f0ae';
      ctx.font = 'bold 12px monospace';
      ctx.fillText(['{}', '()', ';', '=>'][Math.floor(p.x0) % 4]!, -6, 4);
      break;
    case 'comment':
      ctx.fillStyle = '#ff5252';
      ctx.font = 'bold 16px Jua, sans-serif';
      ctx.fillText('?!', -6, 5);
      break;
    case 'notif':
      ctx.fillStyle = '#ffeb3b';
      ctx.beginPath();
      ctx.arc(0, 0, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      break;
    case 'book':
      ctx.rotate(k * 4);
      ctx.fillStyle = '#1e88e5';
      ctx.fillRect(-14, -10, 28, 20);
      ctx.strokeRect(-14, -10, 28, 20);
      ctx.fillStyle = '#fff';
      ctx.fillRect(-10, -6, 20, 4);
      break;
    default:
      ctx.fillStyle = p.side === 'ally' ? '#4fc3f7' : '#ff8a80';
      ctx.beginPath();
      ctx.arc(0, 0, 4, 0, Math.PI * 2);
      ctx.fill();
  }
  ctx.restore();
}

// ─────────────── 이펙트 ───────────────

function drawFx(ctx: Ctx, b: Battle, screenSpace: boolean): void {
  let bannerIdx = 0;
  for (const e of b.fx) {
    const k = e.t / e.life;
    const isBanner = e.kind === 'text' && e.x < 0;
    if (isBanner !== screenSpace) continue;
    ctx.save();
    ctx.globalAlpha = Math.max(0, 1 - k * k);
    switch (e.kind) {
      case 'dmg':
        ctx.font = 'bold 15px Jua, sans-serif';
        ctx.lineWidth = 3;
        ctx.strokeStyle = INK;
        ctx.strokeText(e.text ?? '', e.x - 8, e.y - k * 26);
        ctx.fillStyle = e.color ?? '#fff';
        ctx.fillText(e.text ?? '', e.x - 8, e.y - k * 26);
        break;
      case 'text':
        if (isBanner) {
          ctx.font = 'bold 30px Jua, sans-serif';
          ctx.textAlign = 'center';
          const y = 120 + bannerIdx++ * 40 - Math.min(k, 0.15) * 40;
          ctx.lineWidth = 6;
          ctx.strokeStyle = INK;
          ctx.strokeText(e.text ?? '', viewW / 2, y);
          ctx.fillStyle = '#fff';
          ctx.fillText(e.text ?? '', viewW / 2, y);
        } else {
          ctx.font = 'bold 15px Jua, sans-serif';
          ctx.textAlign = 'center';
          ctx.lineWidth = 3;
          ctx.strokeStyle = INK;
          ctx.strokeText(e.text ?? '', e.x, e.y - k * 20);
          ctx.fillStyle = e.color ?? '#fff';
          ctx.fillText(e.text ?? '', e.x, e.y - k * 20);
        }
        break;
      case 'boom':
        ctx.fillStyle = e.color ?? '#ffb74d';
        ctx.globalAlpha *= 0.6;
        ctx.beginPath();
        ctx.arc(e.x, e.y, (e.r ?? 30) * (0.4 + k * 0.6), 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'stomp':
        ctx.strokeStyle = '#ff5252';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.ellipse(e.x, e.y, (e.r ?? 100) * k, 18 * k, 0, 0, Math.PI * 2);
        ctx.stroke();
        break;
      case 'heal':
        ctx.fillStyle = '#69f0ae';
        ctx.font = 'bold 16px Jua, sans-serif';
        ctx.fillText('+', e.x - 4, e.y - k * 20);
        break;
      case 'spawn':
      case 'poof':
        ctx.fillStyle = '#eceff1';
        for (let i = 0; i < 4; i++) {
          ctx.beginPath();
          ctx.arc(e.x + Math.cos(i * 1.6) * 14 * k, e.y + Math.sin(i * 1.6) * 8 * k, 7 * (1 - k * 0.5), 0, Math.PI * 2);
          ctx.fill();
        }
        break;
    }
    ctx.restore();
  }
}
