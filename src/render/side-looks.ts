/**
 * 외전 4~7 전용 적·보스 그림 (look.kind === 'sidefoe'). 다른 캐릭터처럼 발 아래 가운데가 원점, 오른쪽을 본다.
 */
import type { Look } from '../data/types';
import { INK, blob, eyes, label, legs, line, rrect, type Pose } from './characters';

type Ctx = CanvasRenderingContext2D;

export function drawSideFoe(ctx: Ctx, look: Look, pose: Pose): void {
  switch (look.variant) {
    case 'pagelimit': pageLimit(ctx, look, pose); break;
    case 'citation': citation(ctx, look, pose); break;
    case 'lowres': lowRes(ctx, look, pose); break;
    case 'submitsys': submitSys(ctx, look, pose); break;
    case 'hallucite': halluCite(ctx, look, pose); break;
    case 'plagiarism': plagiarism(ctx, look, pose); break;
    case 'injection': injection(ctx, look, pose); break;
    case 'autoreview': autoReview(ctx, look, pose); break;
    case 'cloudbill': cloudBill(ctx, look, pose); break;
    case 'pivot': pivot(ctx, look, pose); break;
    case 'bmq': bmq(ctx, look, pose); break;
    case 'powerstrip': powerStrip(ctx, look, pose); break;
    case 'overload': overload(ctx, look, pose); break;
    case 'breaker': breaker(ctx, look, pose); break;
    case 'mainbreaker': mainBreaker(ctx, look, pose); break;
    default: pageLimit(ctx, look, pose);
  }
}

/** 걷는 팔 두 개 */
function arms(ctx: Ctx, pose: Pose, x: number, y: number, reach = 6): void {
  ctx.beginPath();
  ctx.moveTo(-x, y);
  ctx.lineTo(-x - 5 - pose.swing * 3, y + 6);
  ctx.moveTo(x, y);
  ctx.lineTo(x + reach + pose.swing * 7, y + 2 - pose.swing * 3);
  ctx.stroke();
}

// ─────────────── 외전 4: 마감 24시 ───────────────

/** 페이지 초과: 넘쳐 나는 원고 뭉치, 11/8 */
function pageLimit(ctx: Ctx, look: Look, pose: Pose): void {
  line(ctx);
  legs(ctx, pose, 14, 7);
  const sway = Math.sin(pose.time * 3) * 1.5;
  for (let i = 3; i >= 0; i--) rrect(ctx, -16 + i * 3 + sway * (i / 3), -50 - i * 3, 30, 42, 1.5, i ? '#eeeeee' : look.color);
  ctx.strokeStyle = 'rgba(0,0,0,.25)';
  ctx.lineWidth = 1.2;
  for (let k = 0; k < 4; k++) {
    ctx.beginPath();
    ctx.moveTo(-11, -42 + k * 5);
    ctx.lineTo(9, -42 + k * 5);
    ctx.stroke();
  }
  line(ctx);
  ctx.fillStyle = look.accent ?? '#e53935';
  ctx.font = 'bold 9px Jua, sans-serif';
  label(ctx, '11/8', -10, -14);
  eyes(ctx, -1, -24, 5, true, 2);
  arms(ctx, pose, 16, -28);
}

/** 참고문헌 형식 오류: 대괄호 [?] 꼬마 */
function citation(ctx: Ctx, look: Look, pose: Pose): void {
  line(ctx);
  legs(ctx, pose, 7, 6);
  ctx.save();
  ctx.translate(0, -16);
  ctx.rotate(Math.sin(pose.walk * 2) * 0.15);
  rrect(ctx, -10, -11, 20, 20, 3, look.color);
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.moveTo(-5, -7);
  ctx.lineTo(-8, -7);
  ctx.lineTo(-8, 5);
  ctx.lineTo(-5, 5);
  ctx.moveTo(5, -7);
  ctx.lineTo(8, -7);
  ctx.lineTo(8, 5);
  ctx.lineTo(5, 5);
  ctx.stroke();
  ctx.fillStyle = look.accent ?? '#6d4c41';
  ctx.font = 'bold 9px Jua, sans-serif';
  label(ctx, '?', -2.5, 2);
  eyes(ctx, 0, -3, 3.4, true, 1.4);
  ctx.restore();
}

/** 그림 해상도 경고: 깨진 픽셀 그림이 떠다닌다 */
function lowRes(ctx: Ctx, look: Look, pose: Pose): void {
  line(ctx);
  const bob = Math.sin(pose.time * 4 + pose.walk) * 3;
  ctx.translate(0, bob - 18);
  rrect(ctx, -16, -16, 32, 26, 2, '#fff');
  // 큼직한 픽셀 산
  const px = [look.color, look.accent ?? '#0277bd', '#81c784', '#fff59d'];
  for (let y = 0; y < 3; y++) {
    for (let x = 0; x < 4; x++) {
      ctx.fillStyle = px[(x + y * 2) % px.length]!;
      ctx.fillRect(-13 + x * 6.5, -13 + y * 6.5, 6.5, 6.5);
    }
  }
  ctx.strokeRect(-13, -13, 26, 19.5);
  // 깨짐
  ctx.beginPath();
  ctx.moveTo(4, -16);
  ctx.lineTo(1, -8);
  ctx.lineTo(6, -3);
  ctx.lineTo(3, 10);
  ctx.stroke();
  eyes(ctx, -3, -4, 4.5, true, 1.8);
  ctx.fillStyle = '#d50000';
  ctx.font = 'bold 6px Jua, sans-serif';
  label(ctx, '72dpi', -12, 18);
  // 날개 대신 작은 경고 삼각형
  blob(ctx, 16, -18, 5, 5, '#ffd54f');
  ctx.fillStyle = INK;
  ctx.fillRect(15.3, -21, 1.4, 3.4);
}

/** 학회 제출 시스템: 모래시계 커서가 도는 거대한 모니터 */
function submitSys(ctx: Ctx, look: Look, pose: Pose): void {
  const t = pose.time;
  line(ctx);
  legs(ctx, pose, 16, 8, '#212121');
  rrect(ctx, -6, -16, 12, 8, 1, '#90a4ae');
  rrect(ctx, -26, -58, 52, 42, 4, look.color);
  rrect(ctx, -22, -54, 44, 32, 2, '#fff');
  // 제목 줄
  ctx.fillStyle = look.accent ?? '#1565c0';
  ctx.fillRect(-22, -54, 44, 7);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 5px Jua, sans-serif';
  label(ctx, 'SUBMIT', -10, -49);
  // 진행률 99%
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.2;
  ctx.strokeRect(-17, -30, 34, 5);
  ctx.fillStyle = '#43a047';
  ctx.fillRect(-17, -30, 33.5, 5);
  ctx.fillStyle = INK;
  ctx.font = 'bold 5px monospace';
  label(ctx, '99%', -4, -33);
  // 화난 눈과 돌아가는 모래시계
  line(ctx, 2);
  eyes(ctx, -6, -40, 6, true, 2);
  ctx.save();
  ctx.translate(13, -40);
  ctx.rotate(t * 3);
  ctx.beginPath();
  ctx.moveTo(-3, -4);
  ctx.lineTo(3, -4);
  ctx.lineTo(-3, 4);
  ctx.lineTo(3, 4);
  ctx.closePath();
  ctx.fillStyle = '#ffd54f';
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  // 팔: 마우스 선
  line(ctx);
  arms(ctx, pose, 26, -36, 8);
  blob(ctx, 34 + pose.swing * 7, -34 - pose.swing * 3, 4, 5, '#eceff1');
  // 23:59 시계
  ctx.fillStyle = '#d50000';
  ctx.font = 'bold 7px monospace';
  label(ctx, Math.floor(t * 2) % 2 ? '23:59' : '23 59', -12, -62);
}

// ─────────────── 외전 5: AI 시대의 연구실 ───────────────

/** 할루시네이션 인용: 반투명하게 깜빡이는 논문 */
function halluCite(ctx: Ctx, look: Look, pose: Pose): void {
  const t = pose.time;
  line(ctx);
  legs(ctx, pose, 10, 7);
  ctx.save();
  ctx.globalAlpha = Math.sin(t * 7) > 0.6 ? 0.45 : 0.95;
  rrect(ctx, -14, -46, 28, 38, 2, look.color);
  ctx.fillStyle = look.accent ?? '#7b1fa2';
  ctx.font = 'bold 6px Jua, sans-serif';
  label(ctx, 'Kim et al.', -12, -38);
  label(ctx, '(2031)', -8, -31);
  ctx.strokeStyle = 'rgba(0,0,0,.25)';
  ctx.lineWidth = 1;
  for (let k = 0; k < 3; k++) {
    ctx.beginPath();
    ctx.moveTo(-10, -14 - k * 4);
    ctx.lineTo(10, -14 - k * 4);
    ctx.stroke();
  }
  line(ctx);
  eyes(ctx, -1, -24, 5, false, 2);
  // 자신만만한 웃음
  ctx.beginPath();
  ctx.arc(-1, -21, 3.5, 0.2, Math.PI - 0.2);
  ctx.stroke();
  ctx.restore();
  // 어긋난 잔상 줄
  if (Math.sin(t * 11) > 0.5) {
    ctx.fillStyle = 'rgba(0,229,255,.6)';
    ctx.fillRect(-16, -34 + ((t * 40) % 20), 30, 2);
  }
  arms(ctx, pose, 14, -26);
}

/** 표절 검사기: 돋보기 든 스캐너, 유사도 % */
function plagiarism(ctx: Ctx, look: Look, pose: Pose): void {
  line(ctx);
  legs(ctx, pose, 12, 7);
  rrect(ctx, -15, -40, 30, 32, 4, look.color);
  rrect(ctx, -11, -36, 22, 11, 2, '#263238');
  ctx.fillStyle = look.accent ?? '#ff1744';
  ctx.font = 'bold 8px monospace';
  label(ctx, '87%', -9, -27.5);
  line(ctx);
  eyes(ctx, -1, -17, 5, true, 1.9);
  // 스캔 빛
  const k = (pose.time * 1.5) % 1;
  ctx.fillStyle = 'rgba(255,23,68,.35)';
  ctx.fillRect(-11, -36 + k * 9, 22, 2);
  // 돋보기 팔
  const sx = 22 + pose.swing * 6;
  ctx.beginPath();
  ctx.moveTo(14, -22);
  ctx.lineTo(sx - 4, -26);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(sx, -30, 6, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(179,229,252,.7)';
  ctx.fill();
  ctx.stroke();
}

/** 프롬프트 인젝션: 초록 글자 터미널 창이 달려든다 */
function injection(ctx: Ctx, look: Look, pose: Pose): void {
  line(ctx);
  legs(ctx, pose, 8, 7);
  ctx.save();
  ctx.translate(0, -20);
  ctx.rotate(0.12 + Math.sin(pose.walk * 2) * 0.08);
  rrect(ctx, -14, -12, 28, 22, 2, look.color);
  ctx.fillStyle = look.accent ?? '#00e676';
  ctx.font = 'bold 6px monospace';
  label(ctx, '> ignore', -12, -4);
  label(ctx, 'previous', -12, 3);
  ctx.fillStyle = Math.floor(pose.time * 3) % 2 ? (look.accent ?? '#00e676') : 'transparent';
  ctx.fillRect(9, -1, 3, 5);
  line(ctx, 2);
  // 뾰족한 눈썹과 빨간 눈
  ctx.fillStyle = '#ff1744';
  for (const dx of [-4, 4]) {
    ctx.beginPath();
    ctx.arc(dx, -16, 2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** 자동 리뷰 AI: 눈 하나 달린 서버 로봇, 머리 위 리뷰 말풍선 */
function autoReview(ctx: Ctx, look: Look, pose: Pose): void {
  const t = pose.time;
  line(ctx);
  legs(ctx, pose, 16, 8, '#212121');
  // 몸통 (서버 랙)
  rrect(ctx, -20, -40, 40, 32, 3, look.color);
  for (let k = 0; k < 3; k++) {
    rrect(ctx, -16, -36 + k * 9, 32, 6, 1, '#37474f');
    ctx.fillStyle = (Math.floor(t * 6) + k) % 3 ? (look.accent ?? '#00e5ff') : '#ff1744';
    ctx.fillRect(10, -34 + k * 9, 3, 2);
  }
  // 머리: 커다란 외눈
  rrect(ctx, -15, -62, 30, 22, 8, '#37474f');
  blob(ctx, 0, -51, 8, 8, '#fff');
  ctx.fillStyle = look.accent ?? '#00e5ff';
  ctx.beginPath();
  ctx.arc(Math.sin(t * 1.3) * 3, -51, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.arc(Math.sin(t * 1.3) * 3, -51, 1.8, 0, Math.PI * 2);
  ctx.fill();
  // 안테나
  ctx.beginPath();
  ctx.moveTo(0, -62);
  ctx.lineTo(0, -70);
  ctx.stroke();
  blob(ctx, 0, -72, 2.5, 2.5, Math.sin(t * 6) > 0 ? '#ff1744' : '#ffd54f');
  // 팔: 빨간 펜
  arms(ctx, pose, 20, -30, 7);
  ctx.save();
  ctx.translate(28 + pose.swing * 7, -30 - pose.swing * 3);
  ctx.rotate(-0.6);
  rrect(ctx, -2, -9, 4, 12, 1, '#e53935');
  ctx.restore();
  // 말풍선 "Reject"
  rrect(ctx, -30, -88, 26, 11, 4, '#fff');
  ctx.fillStyle = '#e53935';
  ctx.font = 'bold 6px Jua, sans-serif';
  label(ctx, 'Reject', -27, -80.5);
}

// ─────────────── 외전 6: 랩실 창업기 ───────────────

/** 서버 비용 청구서: 길게 늘어진 영수증, ₩ 표시 */
function cloudBill(ctx: Ctx, look: Look, pose: Pose): void {
  line(ctx);
  legs(ctx, pose, 10, 7);
  ctx.beginPath();
  ctx.moveTo(-13, -48);
  ctx.lineTo(13, -48);
  ctx.lineTo(13, -10);
  for (let i = 0; i < 6; i++) ctx.lineTo(13 - (i + 0.5) * (26 / 6), i % 2 ? -10 : -7);
  ctx.lineTo(-13, -10);
  ctx.closePath();
  ctx.fillStyle = look.color;
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = INK;
  ctx.font = 'bold 6px Jua, sans-serif';
  label(ctx, 'GPU ×8', -10, -40, 'GPU ×8');
  ctx.fillStyle = look.accent ?? '#2e7d32';
  ctx.font = 'bold 8px Jua, sans-serif';
  label(ctx, '$$$', -7, -16);
  eyes(ctx, 0, -28, 5, true, 1.9);
  // 커피를 빨아들이는 빨대
  ctx.beginPath();
  ctx.moveTo(13, -30);
  ctx.lineTo(22 + pose.swing * 6, -36);
  ctx.stroke();
}

/** 경쟁사 피벗: 휙 꺾인 화살표 몸통 */
function pivot(ctx: Ctx, look: Look, pose: Pose): void {
  line(ctx);
  legs(ctx, pose, 10, 7);
  ctx.save();
  ctx.translate(0, -24);
  ctx.rotate(Math.sin(pose.time * 6) * 0.1);
  ctx.beginPath();
  ctx.moveTo(-14, 10);
  ctx.lineTo(-14, -4);
  ctx.quadraticCurveTo(-14, -14, -2, -14);
  ctx.lineTo(4, -14);
  ctx.lineTo(4, -20);
  ctx.lineTo(16, -9);
  ctx.lineTo(4, 2);
  ctx.lineTo(4, -4);
  ctx.lineTo(-2, -4);
  ctx.quadraticCurveTo(-4, -4, -4, -2);
  ctx.lineTo(-4, 10);
  ctx.closePath();
  ctx.fillStyle = look.color;
  ctx.fill();
  ctx.stroke();
  eyes(ctx, -9, 0, 2.6, true, 1.5);
  ctx.restore();
  // 속도선
  ctx.strokeStyle = look.accent ?? '#e65100';
  ctx.lineWidth = 1.5;
  for (let k = 0; k < 3; k++) {
    ctx.beginPath();
    ctx.moveTo(-26 - k * 2, -30 + k * 7);
    ctx.lineTo(-18 - k * 2, -30 + k * 7);
    ctx.stroke();
  }
  line(ctx);
}

/** 그래서 BM이 뭐죠?: 날아다니는 질문 말풍선 */
function bmq(ctx: Ctx, look: Look, pose: Pose): void {
  line(ctx);
  const bob = Math.sin(pose.time * 5 + pose.walk) * 3;
  ctx.translate(0, bob - 16);
  ctx.beginPath();
  ctx.roundRect(-18, -20, 36, 22, 9);
  ctx.moveTo(-4, 2);
  ctx.lineTo(-10, 10);
  ctx.lineTo(4, 2);
  ctx.fillStyle = look.color;
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = look.accent ?? '#d81b60';
  ctx.font = 'bold 10px Jua, sans-serif';
  label(ctx, 'BM?', -12, -5);
  eyes(ctx, 0, -14, 9, true, 1.4);
}

// ─────────────── 외전 7: 연구실 정전의 날 ───────────────

/** 문어발 멀티탭: 플러그가 주렁주렁 꽂힌 멀티탭, 연기 */
function powerStrip(ctx: Ctx, look: Look, pose: Pose): void {
  const t = pose.time;
  line(ctx);
  legs(ctx, pose, 16, 6);
  rrect(ctx, -22, -24, 44, 16, 4, look.color);
  for (let i = 0; i < 4; i++) {
    const x = -16 + i * 10.5;
    ctx.fillStyle = INK;
    ctx.fillRect(x - 1.6, -20, 1.4, 4);
    ctx.fillRect(x + 1.6, -20, 1.4, 4);
    // 꽂힌 플러그와 선
    rrect(ctx, x - 3.5, -34 - (i % 2) * 4, 8, 9, 1.5, i % 2 ? '#424242' : '#eeeeee');
    ctx.beginPath();
    ctx.moveTo(x + 0.5, -34 - (i % 2) * 4);
    ctx.quadraticCurveTo(x + Math.sin(t * 2 + i) * 6, -46, x - 4 + i * 2, -50 - (i % 2) * 4);
    ctx.stroke();
  }
  // 빨간 스위치
  rrect(ctx, 14, -22, 6, 6, 1, look.accent ?? '#ff7043');
  eyes(ctx, -6, -14.5, 5, true, 1.6);
  // 연기
  ctx.fillStyle = 'rgba(120,120,120,.35)';
  const k = (t * 0.8) % 1;
  ctx.beginPath();
  ctx.arc(10, -40 - k * 16, 3 + k * 5, 0, Math.PI * 2);
  ctx.fill();
}

/** 과부하 경고: 번개 무늬 경고 표지판이 떠다닌다 */
function overload(ctx: Ctx, look: Look, pose: Pose): void {
  line(ctx);
  const bob = Math.sin(pose.time * 4.5 + pose.walk) * 3;
  ctx.translate(0, bob - 16);
  ctx.beginPath();
  ctx.moveTo(0, -24);
  ctx.lineTo(18, 6);
  ctx.lineTo(-18, 6);
  ctx.closePath();
  ctx.fillStyle = look.color;
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = look.accent ?? '#212121';
  ctx.beginPath();
  ctx.moveTo(2, -15);
  ctx.lineTo(-5, -3);
  ctx.lineTo(0, -3);
  ctx.lineTo(-3, 4);
  ctx.lineTo(5, -6);
  ctx.lineTo(0, -6);
  ctx.closePath();
  ctx.fill();
  line(ctx, 2);
  eyes(ctx, 0, -6, 8, true, 1.4);
  // 불꽃
  if (Math.sin(pose.time * 9) > 0.2) {
    ctx.strokeStyle = '#ffab00';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(14, -16);
    ctx.lineTo(20, -20);
    ctx.moveTo(-14, -14);
    ctx.lineTo(-21, -17);
    ctx.stroke();
  }
  line(ctx);
}

/** 누전 차단기: 레버가 내려간 차단기 상자 */
function breaker(ctx: Ctx, look: Look, pose: Pose): void {
  const t = pose.time;
  line(ctx);
  legs(ctx, pose, 12, 7);
  rrect(ctx, -15, -46, 30, 38, 3, look.color);
  rrect(ctx, -9, -38, 18, 18, 2, '#cfd8dc');
  // 레버: 가끔 딸깍
  const down = Math.floor(t * 0.8) % 3 !== 0;
  rrect(ctx, -4, down ? -28 : -36, 8, 8, 1.5, look.accent ?? '#d32f2f');
  ctx.fillStyle = INK;
  ctx.font = 'bold 5px Jua, sans-serif';
  label(ctx, down ? 'OFF' : 'ON', -5, -40);
  eyes(ctx, -1, -15, 5, true, 1.8);
  // 기절 장판 물결
  ctx.save();
  ctx.globalAlpha = 0.3;
  ctx.strokeStyle = look.accent ?? '#d32f2f';
  const k = (t * 0.5) % 1;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(0, -2, 12 + k * 26, 3 + k * 4, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
  line(ctx);
}

/** 메인 차단기: 커다란 배전반, 레버 손잡이 팔, 경고 띠 */
function mainBreaker(ctx: Ctx, look: Look, pose: Pose): void {
  const t = pose.time;
  line(ctx);
  legs(ctx, pose, 18, 8, '#212121');
  rrect(ctx, -24, -62, 48, 54, 4, look.color);
  // 노랑·검정 경고 띠
  ctx.save();
  ctx.beginPath();
  ctx.rect(-24, -18, 48, 8);
  ctx.clip();
  for (let i = -4; i < 8; i++) {
    ctx.fillStyle = i % 2 ? '#212121' : (look.accent ?? '#ffd600');
    ctx.beginPath();
    ctx.moveTo(-24 + i * 8, -10);
    ctx.lineTo(-24 + i * 8 + 8, -18);
    ctx.lineTo(-24 + i * 8 + 16, -18);
    ctx.lineTo(-24 + i * 8 + 8, -10);
    ctx.fill();
  }
  ctx.restore();
  ctx.strokeRect(-24, -18, 48, 8);
  // 차단기 줄
  for (let i = 0; i < 4; i++) {
    const lit = (Math.floor(t * 3) + i) % 4 !== 0;
    rrect(ctx, -18 + i * 9.5, -56, 7, 12, 1, '#eceff1');
    ctx.fillStyle = lit ? '#76ff03' : '#d50000';
    ctx.fillRect(-16 + i * 9.5, -54, 3, 3);
  }
  // 얼굴
  ctx.fillStyle = '#37474f';
  ctx.fillRect(-16, -40, 32, 18);
  ctx.strokeRect(-16, -40, 32, 18);
  ctx.fillStyle = look.accent ?? '#ffd600';
  for (const dx of [-7, 7]) {
    ctx.beginPath();
    ctx.moveTo(dx - 4, -34);
    ctx.lineTo(dx + 4, dx < 0 ? -31 : -34);
    ctx.lineTo(dx + 4, -29);
    ctx.lineTo(dx - 4, -29);
    ctx.closePath();
    ctx.fill();
  }
  // 커다란 레버 팔
  const a = -0.9 + pose.swing * 1.2;
  ctx.save();
  ctx.translate(24, -40);
  ctx.rotate(a);
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(16, 0);
  ctx.stroke();
  rrect(ctx, 14, -4, 10, 8, 3, '#d32f2f');
  ctx.restore();
  // 지지직 번개
  if (Math.sin(t * 7) > 0.4) {
    ctx.strokeStyle = '#ffd600';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-26, -58);
    ctx.lineTo(-32, -50);
    ctx.lineTo(-27, -48);
    ctx.lineTo(-33, -40);
    ctx.stroke();
  }
  line(ctx);
}
