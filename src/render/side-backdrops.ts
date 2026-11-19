/**
 * 외전 4~8 배경: 마감 직전의 연구실(밤 → 새벽), 네온 서버실, 공유 오피스, 형광등이 깜빡이는 연구실, 협력사 회의실.
 * 전투와 컷신에서 같이 쓴다. progress(0~1)는 전투 진행률 (마감 24시의 하늘색).
 */
import type { Theme } from '../data/stages';
import { getLang, tr } from '../i18n';
import { INK } from './characters';
import { flicker, floor, hash, sky } from './spooky';

type Ctx = CanvasRenderingContext2D;

export function drawSideBackdrop(ctx: Ctx, theme: Theme, w: number, ground: number, h: number, scroll: number, t: number, progress: number): void {
  if (theme === 'deadline') deadline(ctx, w, ground, h, scroll, t, progress);
  else if (theme === 'ai') neon(ctx, w, ground, h, scroll, t);
  else if (theme === 'startup') startup(ctx, w, ground, h, scroll, t);
  else if (theme === 'industry') industry(ctx, w, ground, h, scroll, t, progress);
  else blackout(ctx, w, ground, h, scroll, t);
}

/** 두 색 (#rrggbb) 사이를 k(0~1)만큼 섞는다 */
export function mix(a: string, b: string, k: number): string {
  const p = (c: string, i: number): number => parseInt(c.slice(1 + i * 2, 3 + i * 2), 16);
  const ch = (i: number): string => Math.round(p(a, i) + (p(b, i) - p(a, i)) * k).toString(16).padStart(2, '0');
  return `#${ch(0)}${ch(1)}${ch(2)}`;
}

/** 반복 무늬 칸: 스크롤을 반영한 첫 칸 번호와 칸 수 */
function tiles(scroll: number, w: number, size: number): number[] {
  const first = Math.floor(scroll / size) - 1;
  return Array.from({ length: Math.ceil(w / size) + 3 }, (_, k) => first + k);
}

// ─────────────── 외전 4 마감 24시: 창밖이 밤에서 새벽으로 ───────────────

function deadline(ctx: Ctx, w: number, ground: number, h: number, scroll: number, t: number, p: number): void {
  const top = ground - 340;
  // 벽
  sky(ctx, w, ground, mix('#1b2238', '#4a4560', p), mix('#2a3150', '#6d6175', p));
  ctx.save();
  ctx.translate(-scroll, 0);
  for (const i of tiles(scroll, w, 320)) {
    const x = i * 320;
    // 큰 창문: 하늘이 밤 → 새벽
    const wx = x + 30;
    const wy = top + 30;
    const ww = 190;
    const wh = 160;
    const g = ctx.createLinearGradient(0, wy, 0, wy + wh);
    g.addColorStop(0, mix('#070b24', '#5c6bc0', p));
    g.addColorStop(0.6, mix('#141a40', '#ff8a65', p));
    g.addColorStop(1, mix('#1d2450', '#ffe0b2', p));
    ctx.fillStyle = g;
    ctx.fillRect(wx, wy, ww, wh);
    ctx.save();
    ctx.beginPath();
    ctx.rect(wx, wy, ww, wh);
    ctx.clip();
    // 별은 날이 밝으면 사라진다
    ctx.fillStyle = `rgba(255,255,255,${Math.max(0, 0.9 - p * 1.4)})`;
    for (let k = 0; k < 10; k++) {
      const sx = wx + hash(k + i * 17) * ww;
      const sy = wy + hash(k * 3 + i) * wh * 0.6;
      ctx.fillRect(sx, sy, 2, 2);
    }
    // 해가 뜬다
    if (p > 0.55) {
      const sun = (p - 0.55) / 0.45;
      ctx.fillStyle = '#ffcc80';
      ctx.shadowColor = '#ffab40';
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.arc(wx + ww * 0.65, wy + wh + 10 - sun * 60, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
    // 건너편 건물 실루엣과 불 켜진 창
    ctx.fillStyle = mix('#0a0e1f', '#5d4e60', p);
    for (let b = 0; b < 4; b++) {
      const bh = 40 + hash(b + i * 5) * 60;
      ctx.fillRect(wx + b * 48, wy + wh - bh, 44, bh);
      ctx.fillStyle = `rgba(255,236,179,${0.7 - p * 0.5})`;
      for (let k = 0; k < 3; k++) if (hash(b * 7 + k + i) > 0.4) ctx.fillRect(wx + b * 48 + 6 + k * 12, wy + wh - bh + 10, 6, 6);
      ctx.fillStyle = mix('#0a0e1f', '#5d4e60', p);
    }
    ctx.restore();
    ctx.strokeStyle = '#37474f';
    ctx.lineWidth = 6;
    ctx.strokeRect(wx, wy, ww, wh);
    ctx.beginPath();
    ctx.moveTo(wx + ww / 2, wy);
    ctx.lineTo(wx + ww / 2, wy + wh);
    ctx.stroke();
    // 책상: 모니터 두 대와 컵라면, 에너지 드링크
    const dx = x + 230;
    ctx.fillStyle = '#5d4037';
    ctx.fillRect(dx - 10, ground - 70, 100, 8);
    ctx.fillRect(dx - 4, ground - 62, 6, 62);
    ctx.fillRect(dx + 78, ground - 62, 6, 62);
    for (let m = 0; m < 2; m++) {
      const mx = dx + m * 42;
      ctx.fillStyle = '#263238';
      ctx.fillRect(mx, ground - 118, 38, 30);
      ctx.fillStyle = m ? '#b3e5fc' : '#e8f5e9';
      ctx.fillRect(mx + 3, ground - 115, 32, 22);
      ctx.fillStyle = '#90a4ae';
      ctx.fillRect(mx + 16, ground - 88, 6, 18);
      ctx.fillStyle = m ? '#0277bd' : '#c62828';
      ctx.font = 'bold 8px Jua, sans-serif';
      ctx.fillText(m ? 'paper_v37' : tr('D-0', 'DUE'), mx + 6, ground - 100);
    }
    ctx.fillStyle = '#ef5350';
    ctx.fillRect(dx + 60, ground - 82, 8, 12);
    ctx.fillStyle = '#fff3e0';
    ctx.beginPath();
    ctx.moveTo(dx - 6, ground - 82);
    ctx.lineTo(dx + 8, ground - 82);
    ctx.lineTo(dx + 5, ground - 70);
    ctx.lineTo(dx - 3, ground - 70);
    ctx.fill();
  }
  ctx.restore();
  // 벽시계 (화면 고정): 새벽 2시 → 6시
  const mins = 120 + p * 240;
  const clx = w * 0.84;
  const cly = ground - 280;
  ctx.fillStyle = '#212121';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(clx - 46, cly - 20, 92, 40, 6);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = p > 0.8 && Math.floor(t * 2) % 2 ? '#ff5252' : '#ff1744';
  ctx.font = 'bold 22px monospace';
  ctx.textAlign = 'center';
  const hh = String(Math.floor(mins / 60)).padStart(2, '0');
  const mm = String(Math.floor(mins % 60)).padStart(2, '0');
  ctx.fillText(`${hh}${Math.floor(t * 2) % 2 ? ':' : ' '}${mm}`, clx, cly + 8);
  ctx.textAlign = 'left';
  // 마감 포스트잇
  ctx.save();
  ctx.translate(w * 0.06, ground - 300);
  ctx.rotate(-0.08);
  ctx.fillStyle = '#fff59d';
  ctx.fillRect(0, 0, 78, 38);
  ctx.fillStyle = '#c62828';
  ctx.font = '11px Jua, sans-serif';
  ctx.fillText(tr('제출 마감', 'Deadline'), 8, 16);
  ctx.fillText(tr('오전 9:00!!', '9:00 AM!!'), 8, 31);
  ctx.restore();
  ctx.fillStyle = '#1a1d29';
  ctx.fillRect(-20, ground - 8, w + 40, 8);
  floor(ctx, w, ground, h, scroll, mix('#2c3245', '#5f5867', p), mix('#171a26', '#3b3542', p));
}

// ─────────────── 외전 5 AI 시대의 연구실: 네온 서버실 ───────────────

function neon(ctx: Ctx, w: number, ground: number, h: number, scroll: number, t: number): void {
  const top = ground - 340;
  sky(ctx, w, ground, '#05060f', '#120a2a');
  ctx.save();
  ctx.translate(-scroll, 0);
  for (const i of tiles(scroll, w, 150)) {
    const x = i * 150;
    // 서버 랙
    ctx.fillStyle = '#0d1022';
    ctx.fillRect(x + 20, top + 60, 96, ground - top - 60);
    ctx.strokeStyle = i % 2 ? '#00e5ff' : '#ff4081';
    ctx.lineWidth = 2;
    ctx.shadowColor = ctx.strokeStyle;
    ctx.shadowBlur = 10;
    ctx.strokeRect(x + 20, top + 60, 96, ground - top - 60);
    ctx.shadowBlur = 0;
    for (let k = 0; k < 11; k++) {
      const y = top + 74 + k * 24;
      if (y > ground - 20) break;
      ctx.fillStyle = '#161a33';
      ctx.fillRect(x + 28, y, 80, 16);
      for (let l = 0; l < 4; l++) {
        const on = hash(Math.floor(t * (3 + l)) + k * 7 + l * 13 + i * 31) > 0.35;
        ctx.fillStyle = on ? (l % 2 ? '#00e5ff' : '#76ff03') : '#263238';
        ctx.fillRect(x + 84 + l * 5, y + 6, 3, 3);
      }
      ctx.fillStyle = 'rgba(0,229,255,.15)';
      ctx.fillRect(x + 32, y + 5, 40, 5);
    }
  }
  ctx.restore();
  // 흐르는 숫자 비 (원경, 화면 고정)
  ctx.font = '10px monospace';
  for (let k = 0; k < 22; k++) {
    const x = hash(k + 5) * w;
    const y = ((t * (30 + hash(k) * 40) + hash(k * 7) * 400) % (ground + 40)) - 20;
    ctx.fillStyle = `rgba(118,255,3,${0.15 + hash(k + 2) * 0.25})`;
    ctx.fillText(hash(Math.floor(t * 4) + k) > 0.5 ? '1' : '0', x, y);
  }
  // 천장 네온 간판
  ctx.save();
  ctx.shadowColor = '#ff4081';
  ctx.shadowBlur = 18;
  ctx.fillStyle = flicker(t, 3) > 0.5 ? '#ff80ab' : '#5c2240';
  ctx.font = 'bold 26px Jua, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(tr('GPU 사용 중 · 끄지 마시오', 'GPU IN USE · DO NOT TURN OFF'), w / 2, ground - 290);
  ctx.restore();
  // 바닥: 네온 격자
  ctx.fillStyle = '#05060f';
  ctx.fillRect(-20, ground - 6, w + 40, 6);
  floor(ctx, w, ground, h, scroll, '#0d0b22', '#05040e', 'rgba(0,229,255,.25)');
  ctx.strokeStyle = 'rgba(255,64,129,.25)';
  ctx.lineWidth = 1;
  for (const y of [ground + 25, ground + 60, ground + 100]) {
    ctx.beginPath();
    ctx.moveTo(-20, y);
    ctx.lineTo(w + 20, y);
    ctx.stroke();
  }
}

// ─────────────── 외전 6 랩실 창업기: 공유 오피스 ───────────────

function startup(ctx: Ctx, w: number, ground: number, h: number, scroll: number, t: number): void {
  const top = ground - 340;
  sky(ctx, w, ground, '#f1e4d3', '#e3cfb6');
  ctx.save();
  ctx.translate(-scroll, 0);
  for (const i of tiles(scroll, w, 360)) {
    const x = i * 360;
    // 벽돌 벽
    ctx.fillStyle = '#c4785a';
    ctx.fillRect(x, top + 20, 150, ground - top - 20);
    ctx.strokeStyle = 'rgba(255,255,255,.35)';
    ctx.lineWidth = 1.5;
    for (let r = 0; r * 16 < ground - top - 20; r++) {
      const y = top + 20 + r * 16;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 150, y);
      ctx.stroke();
      for (let c = (r % 2) * 18; c < 150; c += 36) {
        ctx.beginPath();
        ctx.moveTo(x + c, y);
        ctx.lineTo(x + c, y + 16);
        ctx.stroke();
      }
    }
    // 화이트보드: 런웨이 그래프와 BM?
    const bx = x + 170;
    const by = top + 70;
    ctx.fillStyle = '#fafafa';
    ctx.strokeStyle = '#90a4ae';
    ctx.lineWidth = 4;
    ctx.fillRect(bx, by, 160, 110);
    ctx.strokeRect(bx, by, 160, 110);
    ctx.strokeStyle = '#1e88e5';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(bx + 14, by + 20);
    ctx.lineTo(bx + 14, by + 92);
    ctx.lineTo(bx + 90, by + 92);
    ctx.stroke();
    ctx.strokeStyle = '#e53935';
    ctx.beginPath();
    ctx.moveTo(bx + 16, by + 28);
    ctx.lineTo(bx + 50, by + 52);
    ctx.lineTo(bx + 84, by + 88);
    ctx.stroke();
    ctx.fillStyle = '#e53935';
    ctx.font = '11px Jua, sans-serif';
    ctx.fillText(tr('런웨이', 'Runway'), bx + 30, by + 18);
    ctx.fillStyle = '#6a1b9a';
    ctx.font = '16px Jua, sans-serif';
    ctx.fillText('BM?', bx + 104, by + 40);
    ctx.fillText('PMF?', bx + 100, by + 70);
    // 빈백과 화분
    ctx.fillStyle = '#4db6ac';
    ctx.beginPath();
    ctx.ellipse(bx + 60, ground - 18, 36, 20, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#8d6e63';
    ctx.fillRect(x + 120, ground - 34, 22, 26);
    ctx.fillStyle = '#66bb6a';
    for (let k = -1; k <= 1; k++) {
      ctx.beginPath();
      ctx.ellipse(x + 131 + k * 9, ground - 50 + Math.abs(k) * 6, 6, 16, k * 0.4 + Math.sin(t + i) * 0.05, 0, Math.PI * 2);
      ctx.fill();
    }
    // 매달린 전구
    const lx = x + 300;
    ctx.strokeStyle = '#424242';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(lx, top - 40);
    ctx.lineTo(lx, top + 40);
    ctx.stroke();
    const glow = ctx.createRadialGradient(lx, top + 48, 2, lx, top + 48, 50);
    glow.addColorStop(0, 'rgba(255,213,79,.5)');
    glow.addColorStop(1, 'rgba(255,213,79,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(lx - 50, top - 2, 100, 100);
    ctx.fillStyle = '#ffe082';
    ctx.beginPath();
    ctx.arc(lx, top + 48, 8, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  // 벽 문구 (화면 고정)
  ctx.fillStyle = '#5d4037';
  ctx.font = 'bold 20px Jua, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(getLang() === 'en' ? 'MOVE FAST · ANSWER EMAILS' : '빠르게 움직이고 · 메일엔 답장하자', w / 2, ground - 300);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#8d6e63';
  ctx.fillRect(-20, ground - 8, w + 40, 8);
  floor(ctx, w, ground, h, scroll, '#b58b62', '#8a6644', 'rgba(0,0,0,.1)');
}

// ─────────────── 외전 7 연구실 정전의 날: 깜빡이는 형광등 ───────────────

function blackout(ctx: Ctx, w: number, ground: number, h: number, scroll: number, t: number): void {
  const top = ground - 340;
  sky(ctx, w, ground, '#4d5a55', '#36403c');
  ctx.save();
  ctx.translate(-scroll, 0);
  for (const i of tiles(scroll, w, 280)) {
    const x = i * 280;
    // 실험대와 장비
    ctx.fillStyle = '#263238';
    ctx.fillRect(x + 20, ground - 64, 200, 10);
    ctx.fillStyle = '#37474f';
    ctx.fillRect(x + 28, ground - 54, 184, 54);
    ctx.fillStyle = '#455a64';
    for (let k = 0; k < 3; k++) ctx.fillRect(x + 36 + k * 60, ground - 46, 50, 40);
    // 오실로스코프와 비커
    ctx.fillStyle = '#90a4ae';
    ctx.fillRect(x + 40, ground - 104, 60, 40);
    ctx.fillStyle = '#102027';
    ctx.fillRect(x + 46, ground - 98, 40, 28);
    ctx.strokeStyle = '#76ff03';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let k = 0; k <= 40; k += 2) ctx.lineTo(x + 46 + k, ground - 84 + Math.sin(k * 0.5 + t * 6) * 8);
    ctx.stroke();
    ctx.fillStyle = 'rgba(129,212,250,.6)';
    ctx.fillRect(x + 150, ground - 92, 18, 28);
    ctx.fillStyle = 'rgba(105,240,174,.7)';
    ctx.fillRect(x + 150, ground - 78, 18, 14);
    // 벽의 공지
    ctx.fillStyle = '#eceff1';
    ctx.fillRect(x + 160, top + 90, 70, 50);
    ctx.fillStyle = '#c62828';
    ctx.font = '10px Jua, sans-serif';
    ctx.fillText(tr('전기 점검', 'Power work'), x + 166, top + 108);
    ctx.fillStyle = '#455a64';
    ctx.fillText(tr('오늘?', 'today?'), x + 166, top + 128);
    // 천장 형광등: 깜빡임
    const on = flicker(t * 1.3, i + 50);
    ctx.fillStyle = `rgba(230,255,240,${0.25 + on * 0.7})`;
    ctx.fillRect(x + 60, top - 30, 120, 7);
    if (on > 0.3) {
      ctx.fillStyle = `rgba(220,255,230,${0.06 * on})`;
      ctx.beginPath();
      ctx.moveTo(x + 60, top - 23);
      ctx.lineTo(x + 180, top - 23);
      ctx.lineTo(x + 250, ground);
      ctx.lineTo(x - 10, ground);
      ctx.fill();
    }
  }
  ctx.restore();
  // 비상구 표시 (화면 고정)
  exitSign(ctx, w * 0.12, ground - 300, 1);
  exitSign(ctx, w * 0.78, ground - 300, 1);
  ctx.fillStyle = '#263238';
  ctx.fillRect(-20, ground - 8, w + 40, 8);
  floor(ctx, w, ground, h, scroll, '#55605b', '#353d39', 'rgba(255,255,255,.06)');
  // 형광등이 모두 꺼지는 순간 살짝 어두워진다
  const all = flicker(t, 77);
  if (all < 0.5) {
    ctx.fillStyle = 'rgba(10,14,12,.18)';
    ctx.fillRect(-20, -20, w + 40, h + 40);
  }
}

// ─────────────── 외전 8 산학공동연구: 협력사 회의실 ───────────────

function industry(ctx: Ctx, w: number, ground: number, h: number, scroll: number, t: number, p: number): void {
  const top = ground - 340;
  sky(ctx, w, ground, '#dfe6ec', '#c9d3db');
  ctx.save();
  ctx.translate(-scroll, 0);
  for (const i of tiles(scroll, w, 400)) {
    const x = i * 400;
    // 유리 칸막이와 회사 로고 시트지
    ctx.fillStyle = 'rgba(178,235,242,.35)';
    ctx.fillRect(x + 8, top + 10, 120, ground - top - 10);
    ctx.strokeStyle = '#90a4ae';
    ctx.lineWidth = 3;
    ctx.strokeRect(x + 8, top + 10, 120, ground - top - 10);
    ctx.fillStyle = 'rgba(255,255,255,.55)';
    ctx.fillRect(x + 8, top + 150, 120, 16);
    ctx.fillStyle = '#1a237e';
    ctx.font = '11px Jua, sans-serif';
    ctx.fillText(tr('(주)협력사 · 보안구역', 'PartnerCo · Secure Area'), x + 14, top + 162);
    // 프로젝터 화면: 간트 차트, 막대 하나만 빨갛게 멈춰 있다
    const sx = x + 160;
    const sy = top + 40;
    ctx.fillStyle = '#fafafa';
    ctx.strokeStyle = '#78909c';
    ctx.lineWidth = 3;
    ctx.fillRect(sx, sy, 200, 130);
    ctx.strokeRect(sx, sy, 200, 130);
    ctx.fillStyle = '#263238';
    ctx.font = '13px Jua, sans-serif';
    ctx.fillText(tr('산학과제 추진 일정', 'Joint Project Schedule'), sx + 10, sy + 20);
    const rows: [string, number, number, string][] = [
      [tr('데이터 수령', 'Get data'), 0, 0.1, '#e53935'],
      [tr('전처리', 'Preprocess'), 0.1, 0.35, '#90a4ae'],
      [tr('모델 개발', 'Modeling'), 0.35, 0.75, '#90a4ae'],
      [tr('중간보고', 'Interim rpt'), 0.75, 0.8, '#1e88e5'],
    ];
    ctx.font = '10px Jua, sans-serif';
    rows.forEach(([name, a, b, c], k) => {
      const y = sy + 36 + k * 22;
      ctx.fillStyle = '#455a64';
      ctx.fillText(name, sx + 8, y + 9);
      ctx.fillStyle = c;
      ctx.fillRect(sx + 70 + a * 120, y, Math.max(6, (b - a) * 120), 11);
    });
    // 오늘 선: 진행률만큼 오른쪽으로
    const todayX = sx + 70 + Math.min(1, 0.3 + p * 0.5) * 120;
    ctx.strokeStyle = '#e53935';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(todayX, sy + 30);
    ctx.lineTo(todayX, sy + 122);
    ctx.stroke();
    ctx.setLineDash([]);
    // 회의 탁자와 노트북, 생수병, 명패
    ctx.fillStyle = '#5d4037';
    ctx.fillRect(x + 150, ground - 70, 230, 12);
    ctx.fillStyle = '#4e342e';
    ctx.fillRect(x + 165, ground - 58, 10, 58);
    ctx.fillRect(x + 355, ground - 58, 10, 58);
    for (let k = 0; k < 3; k++) {
      const lx = x + 170 + k * 70;
      ctx.fillStyle = '#b0bec5';
      ctx.fillRect(lx, ground - 92, 34, 22);
      ctx.fillStyle = hash(i * 5 + k) < 0.5 ? '#80deea' : '#c5e1a5';
      ctx.fillRect(lx + 3, ground - 89, 28, 16);
      ctx.fillStyle = 'rgba(129,212,250,.75)';
      ctx.fillRect(lx + 44, ground - 92, 7, 22);
    }
    ctx.fillStyle = '#fff';
    ctx.fillRect(x + 300, ground - 84, 44, 14);
    ctx.fillStyle = '#1a237e';
    ctx.font = '9px Jua, sans-serif';
    ctx.fillText(tr('상무', 'Exec.'), x + 312, ground - 74);
    // 천장 매립등
    ctx.fillStyle = 'rgba(255,255,255,.9)';
    ctx.fillRect(x + 220, top - 26, 90, 6);
  }
  ctx.restore();
  // 벽시계와 D-day (화면 위 가운데 고정): 전투가 흐를수록 중간보고가 다가온다
  const d = Math.max(0, 3 - Math.floor(p * 4));
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#37474f';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(w / 2, ground - 300, 22, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.save();
  ctx.translate(w / 2, ground - 300);
  ctx.rotate(t * 0.8);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, -16);
  ctx.stroke();
  ctx.restore();
  ctx.fillStyle = d === 0 ? '#e53935' : '#37474f';
  ctx.font = 'bold 18px Jua, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(d === 0 ? tr('중간보고 D-DAY', 'Interim Report: TODAY') : tr(`중간보고 D-${d}`, `Interim Report D-${d}`), w / 2, ground - 262);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#78909c';
  ctx.fillRect(-20, ground - 8, w + 40, 8);
  floor(ctx, w, ground, h, scroll, '#8a96a0', '#66727c', 'rgba(255,255,255,.07)');
}

/** 초록 비상구 표지 (glow 0~1) */
export function exitSign(ctx: Ctx, x: number, y: number, glow: number): void {
  ctx.save();
  ctx.shadowColor = '#00e676';
  ctx.shadowBlur = 16 * glow;
  ctx.fillStyle = '#00c853';
  ctx.fillRect(x, y, 70, 28);
  ctx.shadowBlur = 0;
  ctx.strokeStyle = '#1b5e20';
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, 70, 28);
  // 달리는 사람
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2.4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(x + 14, y + 7, 2.6, 0, Math.PI * 2);
  ctx.moveTo(x + 13, y + 11);
  ctx.lineTo(x + 11, y + 18);
  ctx.lineTo(x + 7, y + 24);
  ctx.moveTo(x + 11, y + 18);
  ctx.lineTo(x + 16, y + 24);
  ctx.moveTo(x + 7, y + 14);
  ctx.lineTo(x + 18, y + 13);
  ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 11px Jua, sans-serif';
  ctx.fillText('EXIT', x + 28, y + 19);
  ctx.restore();
}
