import type { Look } from '../data/types';
import { drawCharacter, outfitKey, type Pose } from './characters';

/**
 * 캐릭터 스프라이트 캐시.
 *
 * 캐릭터는 수백 번의 벡터 명령으로 그려져서, 60~120Hz로 수십 명을 매번 다시 그리면 CPU가 버티지 못한다.
 * 그래서 전투원마다 작은 오프스크린 캔버스를 두고, 자세(팔다리·표정)는 초당 ANIM_FPS번만 다시 그린다.
 * 화면에는 매 프레임 그 그림을 drawImage로 찍고, 위치·찌그러짐·회전은 그대로 매 프레임 부드럽게 움직인다.
 * (손그림 애니메이션의 "2프레임마다 한 장" 방식)
 */

/** 자세를 다시 그리는 횟수 (초당) */
export const ANIM_FPS = 24;
/** 그림 둘레 여백 (캐릭터 단위) */
const PAD = 6;

type Ctx = CanvasRenderingContext2D;

interface Bounds {
  l: number;
  t: number;
  r: number;
  b: number;
}

/** 오른쪽을 보는 캐릭터의 그림 범위 (look.scale 반영, 발 아래 가운데가 원점) */
const boundsCache = new Map<string, Bounds>();
let probe: CanvasRenderingContext2D | null = null;
/** 측정 캔버스: 원점 기준 왼쪽·위로 넉넉히 */
const PROBE_W = 720;
const PROBE_H = 720;
const PROBE_OX = 360;
const PROBE_OY = 520;

const lookKey = (look: Look, defId: string, tier: number): string =>
  `${look.kind}|${look.variant ?? ''}|${look.prop}|${look.scale ?? 1}|${defId}|${tier}|${outfitKey(defId)}`;

/**
 * 여러 자세를 한 캔버스에 겹쳐 그린 뒤 불투명한 픽셀의 범위를 잰다.
 * 유닛 종류·단계마다 한 번만 한다.
 */
function measure(look: Look, defId: string, tier: number): Bounds {
  const key = lookKey(look, defId, tier);
  const hit = boundsCache.get(key);
  if (hit) return hit;
  if (!probe) {
    const c = document.createElement('canvas');
    c.width = PROBE_W;
    c.height = PROBE_H;
    probe = c.getContext('2d', { willReadFrequently: true })!;
  }
  const g = probe;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, PROBE_W, PROBE_H);
  g.setTransform(1, 0, 0, 1, PROBE_OX, PROBE_OY);
  for (let i = 0; i < 12; i++) {
    const pose: Pose = { walk: (i / 12) * Math.PI * 2, swing: i % 3 === 0 ? 1 : i % 3 === 1 ? 0.5 : 0, tier, time: i * 0.37, moving: i % 2 === 0 };
    drawCharacter(g, look, pose, 0, 0, 1, defId);
  }
  const d = g.getImageData(0, 0, PROBE_W, PROBE_H).data;
  let x0 = PROBE_W, y0 = PROBE_H, x1 = -1, y1 = -1;
  for (let y = 0; y < PROBE_H; y++) {
    const row = y * PROBE_W * 4;
    for (let x = 0; x < PROBE_W; x++) {
      if (d[row + x * 4 + 3]! > 8) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        y1 = y;
      }
    }
  }
  const s = look.scale ?? 1;
  // 아무것도 안 그려졌거나 측정 캔버스 끝에 닿았으면 넉넉한 기본 상자를 쓴다
  const touched = x1 < 0 || x0 <= 0 || y0 <= 0 || x1 >= PROBE_W - 1 || y1 >= PROBE_H - 1;
  const out: Bounds = touched
    ? { l: -110 * s, t: -170 * s, r: 110 * s, b: 40 * s }
    : { l: x0 - PROBE_OX - PAD, t: y0 - PROBE_OY - PAD, r: x1 + 1 - PROBE_OX + PAD, b: y1 + 1 - PROBE_OY + PAD };
  boundsCache.set(key, out);
  return out;
}

export interface SpriteState {
  /** 원본 생김새 (커지기 등으로 바뀌면 다시 잰다) */
  look: Look;
  defId: string;
  tier: number;
  facing: 1 | -1;
  walk: number;
  swing: number;
  moving: boolean;
  /** 맞아서 하얗게 번쩍이는 중 */
  flash: boolean;
  /** 서로 다른 순간에 다시 그리도록 흩뜨리는 값 (0~1) */
  phase: number;
}

interface Sprite {
  canvas: HTMLCanvasElement;
  g: Ctx;
  key: string;
  bounds: Bounds;
  /** 마지막으로 쓴 시각 (정리용) */
  used: number;
}

/** 전투원 하나의 스프라이트를 관리한다. 전투마다 하나 만든다. */
export class SpriteCache {
  private readonly map = new Map<number, Sprite>();
  private readonly free: Sprite[] = [];
  private frame = 0;

  /**
   * 전투원을 현재 변환(발 아래 가운데가 원점) 위치에 찍는다.
   * pixelRatio는 캐릭터 단위 1당 화면 픽셀 수 (보통 캔버스 배율).
   */
  draw(ctx: Ctx, uid: number, st: SpriteState, time: number, pixelRatio: number): void {
    const bounds = measure(st.look, st.defId, st.tier);
    // 0.25 단위로 끊어 창 크기가 조금 바뀔 때마다 캔버스를 다시 만들지 않게
    const pr = Math.max(0.5, Math.ceil(pixelRatio * 4) / 4);
    const bucket = Math.floor(time * ANIM_FPS + st.phase);
    const key = `${bucket}|${st.flash ? 1 : 0}|${st.facing}|${pr}|${lookKey(st.look, st.defId, st.tier)}|${st.look.color}`;
    let sp = this.map.get(uid);
    if (!sp) {
      sp = this.free.pop() ?? newSprite();
      sp.key = '';
      this.map.set(uid, sp);
    }
    sp.used = this.frame;
    if (sp.key !== key) {
      sp.key = key;
      sp.bounds = bounds;
      render(sp, st, (bucket - st.phase) / ANIM_FPS, pr);
    }
    const bx = sp.bounds;
    const l = st.facing === 1 ? bx.l : -bx.r;
    ctx.drawImage(sp.canvas, l, bx.t, bx.r - bx.l, bx.b - bx.t);
  }

  /** 프레임 끝: 이번 프레임에 쓰지 않은 전투원(죽어 사라짐·화면 밖)의 캔버스를 돌려 쓴다 */
  endFrame(): void {
    for (const [uid, sp] of this.map) {
      if (this.frame - sp.used > 30) {
        this.map.delete(uid);
        if (this.free.length < 64) this.free.push(sp);
      }
    }
    this.frame++;
  }
}

function newSprite(): Sprite {
  const canvas = document.createElement('canvas');
  return { canvas, g: canvas.getContext('2d')!, key: '', bounds: { l: 0, t: 0, r: 1, b: 1 }, used: 0 };
}

function render(sp: Sprite, st: SpriteState, time: number, pr: number): void {
  const { l, t, r, b } = sp.bounds;
  const w = Math.max(1, Math.ceil((r - l) * pr));
  const h = Math.max(1, Math.ceil((b - t) * pr));
  const g = sp.g;
  if (sp.canvas.width !== w || sp.canvas.height !== h) {
    sp.canvas.width = w;
    sp.canvas.height = h;
  } else {
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, w, h);
  }
  // 왼쪽을 보면 그림 범위도 좌우로 뒤집힌다
  const left = st.facing === 1 ? l : -r;
  g.setTransform(pr, 0, 0, pr, -left * pr, -t * pr);
  drawCharacter(g, st.look, { walk: st.walk, swing: st.swing, tier: st.tier, time, moving: st.moving }, 0, 0, st.facing, st.defId);
  if (st.flash) {
    // 맞은 순간: 그림 위에만 흰빛을 덧칠한다 (ctx.filter보다 훨씬 싸다)
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalCompositeOperation = 'source-atop';
    g.fillStyle = 'rgba(255,255,255,.55)';
    g.fillRect(0, 0, w, h);
    g.globalCompositeOperation = 'source-over';
  }
}
