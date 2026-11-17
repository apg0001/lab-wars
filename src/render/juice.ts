import { GROUND_Y, type BattleEvent } from '../sim/battle';

/**
 * 타격감 연출: 파티클, 화면 흔들림, 히트스톱, 화면 번쩍임.
 * 시뮬레이션 이벤트만 보고 그리므로 게임 결과에는 영향이 없다.
 */

interface Particle {
  kind: 'spark' | 'scrap' | 'dust' | 'ring' | 'star';
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vr: number;
  life: number;
  t: number;
  size: number;
  color: string;
  /** 중력 배율 */
  g: number;
}

const MAX_PARTICLES = 260;
const rnd = (a: number, b: number): number => a + Math.random() * (b - a);

export class Juice {
  private ps: Particle[] = [];
  /** 남은 히트스톱(실제 시간 초) */
  hitStop = 0;
  /** 화면 전체 번쩍임 0~1 */
  flash = 0;
  private time = 0;

  private add(p: Omit<Particle, 't' | 'rot' | 'vr' | 'g'> & Partial<Pick<Particle, 'rot' | 'vr' | 'g'>>): void {
    if (this.ps.length >= MAX_PARTICLES) this.ps.shift();
    this.ps.push({ t: 0, rot: 0, vr: 0, g: 0, ...p });
  }

  stop(sec: number): void {
    this.hitStop = Math.max(this.hitStop, sec);
  }

  onEvent(e: BattleEvent): void {
    switch (e.type) {
      case 'hit': {
        const heavy = e.dmg >= 45;
        const n = e.melee ? (heavy ? 7 : 4) : 2;
        for (let i = 0; i < n; i++) {
          const a = rnd(0, Math.PI * 2);
          const sp = rnd(120, heavy ? 320 : 220);
          this.add({ kind: 'spark', x: e.x, y: e.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: rnd(0.12, 0.22), size: heavy ? 3 : 2, color: e.to === 'enemy' ? '#fff59d' : '#ff8a80' });
        }
        if (e.melee && heavy) {
          this.add({ kind: 'ring', x: e.x, y: e.y, vx: 0, vy: 0, life: 0.18, size: 22, color: '#fff' });
          this.stop(0.035);
        }
        break;
      }
      case 'kill': {
        const n = e.boss ? 40 : 7;
        const cols = e.side === 'enemy' ? ['#ffffff', '#fff9c4', '#ffe0b2'] : ['#b0bec5', '#cfd8dc'];
        for (let i = 0; i < n; i++) {
          this.add({
            kind: 'scrap', x: e.x + rnd(-8, 8), y: e.y, vx: rnd(-160, 160) * (e.boss ? 2 : 1), vy: rnd(-320, -120) * (e.boss ? 1.4 : 1),
            life: rnd(0.6, 1.1) * (e.boss ? 1.6 : 1), size: rnd(4, 8), color: cols[i % cols.length]!, rot: rnd(0, 6), vr: rnd(-12, 12), g: 900,
          });
        }
        if (e.side === 'enemy') for (let i = 0; i < 3; i++) this.add({ kind: 'star', x: e.x, y: e.y - 10, vx: rnd(-60, 60), vy: rnd(-180, -100), life: 0.6, size: 5, color: '#ffd54f', g: 300 });
        if (e.boss) {
          this.stop(0.3);
          this.flash = 1;
        }
        break;
      }
      case 'boom': {
        const n = e.big ? 22 : 10;
        for (let i = 0; i < n; i++) {
          const a = rnd(Math.PI, Math.PI * 2);
          const sp = rnd(40, e.big ? 260 : 160);
          this.add({ kind: 'dust', x: e.x + rnd(-e.r, e.r) * 0.3, y: e.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.6, life: rnd(0.4, 0.8), size: rnd(8, e.big ? 22 : 14), color: e.big ? '#e3f2fd' : '#eceff1' });
        }
        this.add({ kind: 'ring', x: e.x, y: e.y, vx: 0, vy: 0, life: 0.3, size: e.r * 1.1, color: e.big ? '#90caf9' : '#ffcc80' });
        if (e.big) this.stop(0.07);
        break;
      }
      case 'stomp': {
        for (let i = 0; i < 18; i++) {
          const dir = i % 2 ? 1 : -1;
          this.add({ kind: 'dust', x: e.x + dir * rnd(10, e.r), y: GROUND_Y - 4, vx: dir * rnd(60, 200), vy: rnd(-80, -20), life: rnd(0.5, 0.9), size: rnd(10, 20), color: '#d7ccc8' });
        }
        this.stop(0.08);
        break;
      }
      case 'knockback':
        for (let i = 0; i < 4; i++) this.add({ kind: 'dust', x: e.x, y: GROUND_Y - 4, vx: rnd(-60, 60), vy: rnd(-40, -10), life: 0.4, size: rnd(6, 10), color: '#eceff1' });
        break;
      case 'summon':
        for (let i = 0; i < 6; i++) this.add({ kind: 'star', x: e.x + rnd(-10, 20), y: GROUND_Y - rnd(10, 50), vx: rnd(-30, 60), vy: rnd(-90, -30), life: 0.5, size: 4, color: '#80d8ff', g: 100 });
        break;
      case 'baseHit':
        for (let i = 0; i < 2; i++) this.add({ kind: 'scrap', x: e.x, y: GROUND_Y - rnd(80, 180), vx: rnd(-80, 80), vy: rnd(-160, -60), life: 0.6, size: 4, color: e.side === 'ally' ? '#90caf9' : '#bcaaa4', rot: rnd(0, 6), vr: rnd(-10, 10), g: 800 });
        break;
      case 'brew':
        for (let i = 0; i < 10; i++) this.add({ kind: 'star', x: 105 + rnd(-30, 30), y: GROUND_Y - rnd(180, 260), vx: rnd(-50, 50), vy: rnd(-120, -40), life: 0.8, size: 5, color: '#ffcc80', g: 150 });
        break;
      case 'bossSpawn':
        break;
      case 'end':
        break;
      default:
        break;
    }
  }

  update(dt: number): void {
    this.time += dt;
    this.flash = Math.max(0, this.flash - dt * 3);
    for (const p of this.ps) {
      p.t += dt;
      p.vy += p.g * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
      if (p.kind === 'dust' || p.kind === 'spark') {
        p.vx *= Math.exp(-5 * dt);
        p.vy *= Math.exp(-5 * dt);
      }
      // 바닥에 닿으면 튕기고 멈춘다
      if (p.g > 0 && p.y > GROUND_Y + 30) {
        p.y = GROUND_Y + 30;
        p.vy *= -0.3;
        p.vx *= 0.6;
        p.vr *= 0.5;
      }
    }
    this.ps = this.ps.filter((p) => p.t < p.life);
  }

  /** 월드 좌표계에서 파티클을 그린다. */
  draw(ctx: CanvasRenderingContext2D): void {
    for (const p of this.ps) {
      const k = p.t / p.life;
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - k * k);
      switch (p.kind) {
        case 'spark': {
          ctx.strokeStyle = p.color;
          ctx.lineWidth = p.size;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - p.vx * 0.04, p.y - p.vy * 0.04);
          ctx.stroke();
          break;
        }
        case 'scrap':
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.fillStyle = p.color;
          ctx.strokeStyle = 'rgba(43,36,48,.6)';
          ctx.lineWidth = 1;
          ctx.fillRect(-p.size / 2, -p.size * 0.35, p.size, p.size * 0.7);
          ctx.strokeRect(-p.size / 2, -p.size * 0.35, p.size, p.size * 0.7);
          break;
        case 'dust':
          ctx.globalAlpha *= 0.7;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * (0.6 + k * 0.6), 0, Math.PI * 2);
          ctx.fill();
          break;
        case 'ring':
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 4 * (1 - k) + 1;
          ctx.beginPath();
          ctx.ellipse(p.x, p.y, p.size * (0.3 + k), p.size * (0.3 + k) * 0.55, 0, 0, Math.PI * 2);
          ctx.stroke();
          break;
        case 'star': {
          ctx.translate(p.x, p.y);
          ctx.rotate(this.time * 6);
          ctx.fillStyle = p.color;
          ctx.beginPath();
          for (let i = 0; i < 8; i++) {
            const r = i % 2 ? p.size * 0.4 : p.size;
            const a = (i / 8) * Math.PI * 2;
            ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
          }
          ctx.closePath();
          ctx.fill();
          break;
        }
      }
      ctx.restore();
    }
  }
}
