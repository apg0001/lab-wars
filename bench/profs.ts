/** 전공 모드 교수님 16명을 한 장에 그려 확인한다 (개발용) */
import { PROFESSORS } from '../src/data/major';
import { drawCharacter } from '../src/render/characters';

const canvas = document.getElementById('c') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
const cols = 8;
PROFESSORS.forEach((p, i) => {
  const x = 120 + (i % cols) * 230;
  const y = 440 + Math.floor(i / cols) * 520;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.strokeStyle = '#ddd';
  ctx.strokeRect(x - 100, y - 400, 200, 440);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(4, 4);
  drawCharacter(ctx, p.look, { walk: 0, swing: i % 2 ? 0.6 : 0, tier: 1, time: 0.4, moving: false }, 0, 0, 1, '');
  ctx.restore();
  ctx.fillStyle = '#2b2430';
  ctx.font = '20px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`${p.name} (${p.id})`, x, y + 30);
});
document.getElementById('out')!.textContent = 'done';
