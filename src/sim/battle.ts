import { RANGED_THRESHOLD, type CombatStats, type Look, type Side } from '../data/types';
import { ENEMY_BY_ID } from '../data/enemies';
import type { StageDef } from '../data/stages';
import type { SkillId } from '../data/upgrades';
import type { BattleLoadout } from './progression';

export const WORLD_W = 1800;
export const GROUND_Y = 440;
export const AIR_Y = 300;
export const BASE_W = 150;
/** 각 건물의 전면(유닛이 공격하는 지점) */
export const ALLY_FRONT = 30 + BASE_W;
export const ENEMY_FRONT = WORLD_W - 30 - BASE_W;
const STEP = 1 / 60;
const MAX_ENEMIES = 45;
const ENEMY_TOWER_RANGE = 260;
/** 일반 적 HP 배율 (머그컵 제거 후 화력 보정) */
const ENEMY_HP_MUL = 0.85;
/** 처치 보상 배율 */
const KILL_REWARD_MUL = 1.3;
export const BREW_MAX = 6;
/** 단계 n → n+1 비용 */
export const BREW_COST = [30, 50, 75, 105, 140];

export interface Fighter {
  uid: number;
  side: Side;
  defId: string;
  name: string;
  look: Look;
  tier: number;
  stats: CombatStats;
  hp: number;
  maxHp: number;
  x: number;
  /** 깊이 오프셋(겹침 방지용 연출) */
  depth: number;
  cd: number;
  healCd: number;
  summonCd: number;
  stompCd: number;
  attacking: boolean;
  /** 공격 모션 진행 (0이면 대기) */
  swing: number;
  hitFlash: number;
  /** 넉백 경직 남은 시간과 밀려나는 속도 */
  kbT: number;
  kbV: number;
  auraMul: number;
  dead: boolean;
  deathT: number;
  reward: number;
  isBoss: boolean;
  walk: number;
}

export type ProjectileKind = 'bug' | 'flask' | 'paper' | 'laser' | 'comment' | 'code' | 'bomb' | 'notif' | 'heal' | 'book' | 'bolt';

export interface Projectile {
  kind: ProjectileKind;
  side: Side;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  t: number;
  dur: number;
  dmg: number;
  splash: number;
  buildingMul: number;
  targetUid: number | null;
  /** 건물을 노린 공격 */
  hitsBase: boolean;
  arc: number;
  knockback?: { chance: number; dist: number };
}

export type FxKind = 'dmg' | 'text' | 'boom' | 'heal' | 'stomp' | 'spawn' | 'poof';

export interface Fx {
  kind: FxKind;
  x: number;
  y: number;
  t: number;
  life: number;
  text?: string;
  color?: string;
  r?: number;
}

/**
 * 연출·소리용 이벤트. 게임 로직에는 영향이 없고, 화면이 매 프레임 drainEvents()로 가져간다.
 */
export type BattleEvent =
  | { type: 'summon'; x: number }
  | { type: 'hit'; x: number; y: number; dmg: number; melee: boolean; to: Side }
  | { type: 'kill'; x: number; y: number; side: Side; boss: boolean }
  | { type: 'boom'; x: number; y: number; r: number; side: Side; big: boolean }
  | { type: 'stomp'; x: number; r: number }
  | { type: 'knockback'; x: number; y: number }
  | { type: 'baseHit'; side: Side; x: number; dmg: number }
  | { type: 'shoot'; kind: ProjectileKind; x: number; side: Side; tower: boolean }
  | { type: 'brew'; level: number }
  | { type: 'skill'; id: SkillId }
  | { type: 'heal' }
  | { type: 'bossSpawn' }
  | { type: 'rush' }
  | { type: 'end'; result: 'win' | 'lose' };

const MAX_EVENTS = 256;

export interface Base {
  side: Side;
  hp: number;
  maxHp: number;
  towerCd: number;
  hitFlash: number;
}

export type BattleResult = 'win' | 'lose' | null;

/** 시드 기반 난수 (재현 가능한 테스트용) */
export function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class Battle {
  t = 0;
  caffeine: number;
  mental = 0;
  readonly ally: Base;
  readonly enemy: Base;
  fighters: Fighter[] = [];
  projectiles: Projectile[] = [];
  fx: Fx[] = [];
  /** 연출·소리 이벤트 (화면이 가져가지 않으면 MAX_EVENTS까지만 쌓인다) */
  events: BattleEvent[] = [];
  unitCd: Record<string, number> = {};
  /** 전투 중 커피머신 단계 (1~BREW_MAX) */
  brewLevel = 1;
  hasteT = 0;
  freezeT = 0;
  result: BattleResult = null;
  killReward = 0;
  kills = 0;
  private spawnTimer = 0;
  private nextRush: number;
  private queue: { at: number; id: string }[] = [];
  private bossSpawned = false;
  private uidSeq = 1;
  private acc = 0;
  private readonly rng: () => number;

  constructor(readonly stage: StageDef, readonly loadout: BattleLoadout, seed = 1) {
    this.rng = makeRng(seed);
    this.caffeine = loadout.caffeineStart;
    this.ally = { side: 'ally', hp: loadout.baseHp, maxHp: loadout.baseHp, towerCd: 0, hitFlash: 0 };
    this.enemy = { side: 'enemy', hp: stage.enemyBaseHp, maxHp: stage.enemyBaseHp, towerCd: 0, hitFlash: 0 };
    this.nextRush = stage.rush.first;
    this.spawnTimer = stage.spawnEvery * 0.6;
  }

  // ───────────── 플레이어 조작 ─────────────

  get caffeineMax(): number {
    return Math.round(this.loadout.caffeineMax * (1 + 0.25 * (this.brewLevel - 1)));
  }

  get caffeineRegen(): number {
    return this.loadout.caffeineRegen * (1 + 0.2 * (this.brewLevel - 1));
  }

  /** 다음 단계 비용 (최고 단계면 null) */
  brewCost(): number | null {
    return this.brewLevel < BREW_MAX ? BREW_COST[this.brewLevel - 1]! : null;
  }

  canBrew(): boolean {
    const c = this.brewCost();
    return !this.result && c !== null && this.caffeine >= c;
  }

  /** 카페인을 써서 커피머신 단계를 올린다: 최대치 +25%, 충전 +20% */
  brew(): boolean {
    if (!this.canBrew()) return false;
    this.caffeine -= this.brewCost()!;
    this.brewLevel++;
    this.emit({ type: 'brew', level: this.brewLevel });
    this.fx.push({ kind: 'text', x: 105, y: GROUND_Y - 280, t: 0, life: 1.2, text: `☕ 커피머신 Lv${this.brewLevel}!`, color: '#ffe0b2' });
    return true;
  }

  canSummon(unitId: string): boolean {
    const entry = this.loadout.deck.find((d) => d.def.id === unitId);
    return !!entry && !this.result && (this.unitCd[unitId] ?? 0) <= 0 && this.caffeine >= entry.def.cost;
  }

  summon(unitId: string): boolean {
    if (!this.canSummon(unitId)) return false;
    const entry = this.loadout.deck.find((d) => d.def.id === unitId)!;
    this.caffeine -= entry.def.cost;
    this.unitCd[unitId] = entry.def.cooldown;
    const count = entry.def.count ?? 1;
    for (let i = 0; i < count; i++) {
      const f = this.addFighter('ally', entry.def.id, entry.def.names[entry.tier - 1]!, entry.def.look, entry.tier, entry.stats, ALLY_FRONT - 20 - i * 14, 0);
      f.depth = i * 10 + this.rng() * 6;
    }
    this.fx.push({ kind: 'spawn', x: ALLY_FRONT - 10, y: GROUND_Y, t: 0, life: 0.4 });
    this.emit({ type: 'summon', x: ALLY_FRONT - 10 });
    return true;
  }

  canCast(id: SkillId): boolean {
    const s = this.loadout.skills.find((k) => k.id === id);
    return !!s && !this.result && this.mental >= s.cost;
  }

  cast(id: SkillId, x?: number): boolean {
    if (!this.canCast(id)) return false;
    const s = this.loadout.skills.find((k) => k.id === id)!;
    if (s.targeted && x === undefined) return false;
    this.mental -= s.cost;
    this.emit({ type: 'skill', id });
    switch (id) {
      case 'snack':
        for (const f of this.alive('ally')) {
          f.hp = Math.min(f.maxHp, f.hp + f.maxHp * 0.35);
          this.fx.push({ kind: 'heal', x: f.x, y: this.fy(f) - 30, t: 0, life: 0.8 });
        }
        this.banner('🍗 야식 도착!');
        break;
      case 'allnight':
        this.hasteT = 8;
        this.banner('🌙 밤샘 모드!');
        break;
      case 'aircon':
        this.freezeT = 6;
        this.banner('❄️ 에어컨 풀가동!');
        break;
      case 'bombard': {
        const tx = clamp(x!, ALLY_FRONT, WORLD_W);
        this.projectiles.push({
          kind: 'book', side: 'ally', x0: tx - 60, y0: 0, x1: tx, y1: GROUND_Y - 6,
          t: 0, dur: 0.5, dmg: 150, splash: 90, buildingMul: 0.5, targetUid: null, hitsBase: false, arc: 0,
          knockback: { chance: 1, dist: 60 },
        });
        break;
      }
    }
    return true;
  }

  // ───────────── 진행 ─────────────

  /** 실제 경과 시간을 받아 고정 간격으로 시뮬레이션한다. */
  update(dt: number): void {
    this.acc += Math.min(dt, 0.25);
    while (this.acc >= STEP) {
      this.acc -= STEP;
      this.step(STEP);
    }
  }

  step(dt: number): void {
    if (this.result) {
      this.tickFx(dt);
      return;
    }
    this.t += dt;
    const L = this.loadout;
    this.caffeine = Math.min(this.caffeineMax, this.caffeine + this.caffeineRegen * dt);
    this.mental = Math.min(L.mentalMax, this.mental + L.mentalRegen * dt);
    for (const k of Object.keys(this.unitCd)) this.unitCd[k] = Math.max(0, this.unitCd[k]! - dt);
    this.hasteT = Math.max(0, this.hasteT - dt);
    this.freezeT = Math.max(0, this.freezeT - dt);
    this.ally.hitFlash = Math.max(0, this.ally.hitFlash - dt);
    this.enemy.hitFlash = Math.max(0, this.enemy.hitFlash - dt);

    this.spawnEnemies(dt);
    this.computeAuras();
    for (const f of this.fighters) if (!f.dead) this.tickFighter(f, dt);
    this.tickTower(this.ally, dt);
    this.tickTower(this.enemy, dt);
    this.tickProjectiles(dt);
    this.tickFx(dt);

    for (const f of this.fighters) if (f.dead) f.deathT += dt;
    this.fighters = this.fighters.filter((f) => !f.dead || f.deathT < 0.6);

    if (this.enemy.hp <= 0) this.finish('win');
    else if (this.ally.hp <= 0) this.finish('lose');
  }

  private finish(r: BattleResult): void {
    this.result = r;
    if (r) this.emit({ type: 'end', result: r });
    this.banner(r === 'win' ? '교수실 함락!' : '연구실이 망가졌다…');
  }

  // ───────────── 적 출현 ─────────────

  private spawnEnemies(dt: number): void {
    const st = this.stage;
    if (st.boss && !this.bossSpawned && this.t >= 3) {
      this.bossSpawned = true;
      this.spawnEnemy(st.boss, true);
      this.banner(`⚠️ ${ENEMY_BY_ID[st.boss]!.name} 등장!`);
      this.emit({ type: 'bossSpawn' });
    }
    // 장기전 방지: 3분이 지나면 출현 간격이 점점 짧아진다 (최대 절반).
    const overtime = this.t > 180 ? Math.max(0.5, 1 - (this.t - 180) / 240) : 1;
    const every = st.spawnEvery * overtime;
    this.spawnTimer += dt;
    if (this.spawnTimer >= every) {
      this.spawnTimer -= every * (0.8 + this.rng() * 0.4);
      this.spawnEnemy(this.pickEnemy());
    }
    if (this.t >= this.nextRush) {
      this.nextRush += st.rush.every;
      for (let i = 0; i < st.rush.size; i++) this.queue.push({ at: this.t + i * 0.45, id: this.pickEnemy() });
      this.banner('📢 잡무 러시!');
      this.emit({ type: 'rush' });
    }
    while (this.queue.length && this.queue[0]!.at <= this.t) this.spawnEnemy(this.queue.shift()!.id);
  }

  private pickEnemy(): string {
    const pool = this.stage.pool;
    const total = pool.reduce((s, p) => s + p.weight, 0);
    let r = this.rng() * total;
    for (const p of pool) {
      r -= p.weight;
      if (r <= 0) return p.id;
    }
    return pool[pool.length - 1]!.id;
  }

  private spawnEnemy(id: string, boss = false, x = ENEMY_FRONT + 20): Fighter | null {
    const def = ENEMY_BY_ID[id];
    if (!def) return null;
    if (!boss && this.alive('enemy').length >= MAX_ENEMIES) return null;
    const scale = def.boss ? 1 : this.stage.scale;
    const atkScale = 1 + (scale - 1) * 0.7;
    const stats: CombatStats = { ...def, hp: Math.round(def.hp * scale * (def.boss ? 1 : ENEMY_HP_MUL)), atk: def.atk * atkScale };
    const f = this.addFighter('enemy', id, def.name, def.look, 1, stats, x, Math.round(def.reward * KILL_REWARD_MUL));
    f.isBoss = !!def.boss;
    f.summonCd = def.boss?.summon?.every ?? 0;
    f.stompCd = def.boss?.stomp?.every ?? 0;
    return f;
  }

  private addFighter(side: Side, defId: string, name: string, look: Look, tier: number, stats: CombatStats, x: number, reward: number): Fighter {
    const f: Fighter = {
      uid: this.uidSeq++, side, defId, name, look, tier, stats,
      hp: stats.hp, maxHp: stats.hp, x, depth: this.rng() * 14,
      cd: 0.3, healCd: stats.heal?.every ?? 0, summonCd: 0, stompCd: 0,
      attacking: false, swing: 0, hitFlash: 0, kbT: 0, kbV: 0, auraMul: 1, dead: false, deathT: 0,
      reward, isBoss: false, walk: this.rng() * 10,
    };
    this.fighters.push(f);
    return f;
  }

  // ───────────── 전투 ─────────────

  alive(side: Side): Fighter[] {
    return this.fighters.filter((f) => !f.dead && f.side === side);
  }

  /** 화면상 발 위치 y */
  fy(f: Fighter): number {
    return (f.stats.flying ? AIR_Y : GROUND_Y) + f.depth;
  }

  private computeAuras(): void {
    const auras = this.fighters.filter((f) => !f.dead && f.stats.aura);
    for (const f of this.fighters) {
      f.auraMul = 1;
      for (const a of auras) {
        if (a.side === f.side && a !== f && Math.abs(a.x - f.x) <= a.stats.aura!.radius) f.auraMul = Math.max(f.auraMul, a.stats.aura!.atkMul);
      }
    }
  }

  private speedMul(f: Fighter): number {
    if (f.side === 'ally') return this.hasteT > 0 ? 1.2 : 1;
    return this.freezeT > 0 ? 0.5 : 1;
  }

  private atkRateMul(f: Fighter): number {
    if (f.side === 'ally') return this.hasteT > 0 ? 1.6 : 1;
    return this.freezeT > 0 ? 0.5 : 1;
  }

  private canHit(attacker: CombatStats, target: Fighter): boolean {
    return !target.stats.flying || attacker.range >= RANGED_THRESHOLD;
  }

  private findTarget(f: Fighter): Fighter | null {
    const dir = f.side === 'ally' ? 1 : -1;
    let best: Fighter | null = null;
    let bestD = Infinity;
    for (const o of this.fighters) {
      if (o.dead || o.side === f.side || !this.canHit(f.stats, o)) continue;
      const d = (o.x - f.x) * dir;
      if (d < -12 || d > f.stats.range + bodyR(o)) continue;
      if (d < bestD) {
        bestD = d;
        best = o;
      }
    }
    return best;
  }

  private baseInRange(f: Fighter): boolean {
    return f.side === 'ally' ? ENEMY_FRONT - f.x <= f.stats.range : f.x - ALLY_FRONT <= f.stats.range;
  }

  private tickFighter(f: Fighter, dt: number): void {
    const s = f.stats;
    f.cd -= dt * this.atkRateMul(f);
    f.hitFlash = Math.max(0, f.hitFlash - dt);
    f.swing = Math.max(0, f.swing - dt * 3);

    // 넉백 중: 뒤로 밀리며 이동·공격을 못 한다
    if (f.kbT > 0) {
      f.kbT -= dt;
      f.x = clamp(f.x + f.kbV * dt, ALLY_FRONT - 40, ENEMY_FRONT + 40);
      f.kbV *= Math.exp(-6 * dt);
      f.attacking = false;
      return;
    }

    if (s.heal) {
      f.healCd -= dt;
      if (f.healCd <= 0) {
        f.healCd = s.heal.every;
        let healed = false;
        for (const o of this.alive(f.side)) {
          if (Math.abs(o.x - f.x) <= s.heal.radius && o.hp < o.maxHp) {
            o.hp = Math.min(o.maxHp, o.hp + s.heal.amount);
            this.fx.push({ kind: 'heal', x: o.x, y: this.fy(o) - 34, t: 0, life: 0.7 });
            healed = true;
          }
        }
        if (healed) this.emit({ type: 'heal' });
      }
    }

    const def = f.side === 'enemy' ? ENEMY_BY_ID[f.defId] : undefined;
    if (def?.boss) this.tickBoss(f, def.boss, dt);

    const target = this.findTarget(f);
    const hitBase = !target && this.baseInRange(f);
    f.attacking = !!target || hitBase;
    if (!f.attacking) {
      const dir = f.side === 'ally' ? 1 : -1;
      const v = s.speed * this.speedMul(f) * dt;
      f.x += dir * v;
      f.walk += v * 0.08;
      f.x = clamp(f.x, ALLY_FRONT - 40, ENEMY_FRONT + 40);
      return;
    }
    if (f.cd > 0) return;
    f.cd = s.interval;
    f.swing = 1;
    const atk = s.atk * f.auraMul;
    const ranged = s.range >= RANGED_THRESHOLD;
    if (target) {
      if (ranged) this.shoot(f, atk, target.x, this.fy(target) - 18, target.uid, false);
      else this.damageFighter(target, atk, f.side, s.knockback, true);
    } else {
      const bx = f.side === 'ally' ? ENEMY_FRONT + 20 : ALLY_FRONT - 20;
      if (ranged) this.shoot(f, atk, bx, GROUND_Y - 80, null, true);
      else this.damageBase(f.side === 'ally' ? this.enemy : this.ally, atk * (s.buildingMul ?? 1), f.x + (f.side === 'ally' ? 16 : -16));
    }
  }

  private tickBoss(f: Fighter, b: NonNullable<typeof ENEMY_BY_ID[string]['boss']>, dt: number): void {
    if (b.summon) {
      f.summonCd -= dt;
      if (f.summonCd <= 0) {
        f.summonCd = b.summon.every;
        for (let i = 0; i < b.summon.count; i++) this.spawnEnemy(b.summon.id, false, f.x + 20 + i * 12);
        this.fx.push({ kind: 'text', x: f.x, y: GROUND_Y - 150, t: 0, life: 1, text: '이것 좀 해와!', color: '#fff' });
      }
    }
    if (b.stomp) {
      f.stompCd -= dt;
      if (f.stompCd <= 0) {
        f.stompCd = b.stomp.every;
        for (const o of this.alive('ally')) {
          if (!o.stats.flying && Math.abs(o.x - f.x) <= b.stomp.radius) this.damageFighter(o, b.stomp.dmg, 'enemy', { chance: 0.5, dist: 45 });
        }
        this.fx.push({ kind: 'stomp', x: f.x, y: GROUND_Y, t: 0, life: 0.6, r: b.stomp.radius });
        this.emit({ type: 'stomp', x: f.x, r: b.stomp.radius });
        this.fx.push({ kind: 'text', x: f.x, y: GROUND_Y - 160, t: 0, life: 1, text: '버럭!', color: '#ff5252' });
      }
    }
  }

  private shoot(f: Fighter, dmg: number, tx: number, ty: number, targetUid: number | null, hitsBase: boolean): void {
    const y0 = this.fy(f) - 24;
    const dist = Math.abs(tx - f.x);
    const kind = projectileKind(f.defId);
    this.emit({ type: 'shoot', kind, x: f.x, side: f.side, tower: false });
    this.projectiles.push({
      kind, side: f.side, x0: f.x, y0, x1: tx, y1: ty, t: 0, dur: 0.12 + dist / 520,
      dmg, splash: f.stats.splash ?? 0, buildingMul: f.stats.buildingMul ?? 1,
      targetUid, hitsBase, arc: kind === 'flask' || kind === 'bomb' ? 40 + dist * 0.15 : 0,
      knockback: f.stats.knockback,
    });
  }

  private tickTower(b: Base, dt: number): void {
    b.towerCd -= dt;
    if (b.towerCd > 0) return;
    const ally = b.side === 'ally';
    const front = ally ? ALLY_FRONT : ENEMY_FRONT;
    let best: Fighter | null = null;
    let bestD = Infinity;
    for (const o of this.fighters) {
      if (o.dead || o.side === b.side) continue;
      const d = Math.abs(o.x - front);
      if (d <= (ally ? this.loadout.printerRange : ENEMY_TOWER_RANGE) && d < bestD) {
        bestD = d;
        best = o;
      }
    }
    if (!best) return;
    b.towerCd = ally ? 0.8 : 1.2;
    const x0 = ally ? 105 : WORLD_W - 105;
    this.emit({ type: 'shoot', kind: ally ? 'paper' : 'laser', x: x0, side: b.side, tower: true });
    this.projectiles.push({
      kind: ally ? 'paper' : 'laser', side: b.side, x0, y0: GROUND_Y - 250, x1: best.x, y1: this.fy(best) - 18,
      t: 0, dur: 0.1 + bestD / 900, dmg: ally ? this.loadout.printerAtk : this.stage.towerAtk,
      splash: 0, buildingMul: 1, targetUid: best.uid, hitsBase: false, arc: 0,
    });
  }

  private tickProjectiles(dt: number): void {
    for (const p of this.projectiles) {
      p.t += dt;
      if (p.targetUid !== null) {
        const tgt = this.fighters.find((f) => f.uid === p.targetUid && !f.dead);
        if (tgt) {
          p.x1 = tgt.x;
          p.y1 = this.fy(tgt) - 18;
        }
      }
      if (p.t < p.dur) continue;
      this.impact(p);
    }
    this.projectiles = this.projectiles.filter((p) => p.t < p.dur);
  }

  private impact(p: Projectile): void {
    const foe: Side = p.side === 'ally' ? 'enemy' : 'ally';
    if (p.hitsBase) {
      this.damageBase(p.side === 'ally' ? this.enemy : this.ally, p.dmg * p.buildingMul, p.x1);
      return;
    }
    if (p.splash > 0) {
      for (const o of this.alive(foe)) {
        const dy = Math.abs(this.fy(o) - p.y1);
        if (Math.abs(o.x - p.x1) <= p.splash + bodyR(o) && dy < 170) this.damageFighter(o, p.dmg, p.side, p.knockback);
      }
      // 범위 공격이 건물 앞에서 터지면 건물도 맞는다.
      const base = p.side === 'ally' ? this.enemy : this.ally;
      const front = p.side === 'ally' ? ENEMY_FRONT : ALLY_FRONT;
      if (Math.abs(p.x1 - front) <= p.splash) this.damageBase(base, p.dmg * p.buildingMul, p.x1);
      this.fx.push({ kind: 'boom', x: p.x1, y: p.y1, t: 0, life: 0.45, r: p.splash });
      this.emit({ type: 'boom', x: p.x1, y: p.y1, r: p.splash, side: p.side, big: p.kind === 'book' });
      return;
    }
    const tgt = this.fighters.find((f) => f.uid === p.targetUid && !f.dead);
    if (tgt) this.damageFighter(tgt, p.dmg, p.side, p.knockback);
  }

  private damageFighter(f: Fighter, dmg: number, from: Side, kb?: { chance: number; dist: number }, melee = false): void {
    if (f.dead) return;
    this.emit({ type: 'hit', x: f.x, y: this.fy(f) - 20 * (f.look.scale ?? 1), dmg, melee, to: f.side });
    if (kb && !f.isBoss && f.hp > dmg && this.rng() < kb.chance) this.knockback(f, kb.dist);
    f.hp -= dmg;
    f.hitFlash = 0.12;
    this.fx.push({ kind: 'dmg', x: f.x + (this.rng() - 0.5) * 16, y: this.fy(f) - 40 - (f.look.scale ?? 1) * 20, t: 0, life: 0.6, text: String(Math.round(dmg)), color: from === 'ally' ? '#fff' : '#ff8a80' });
    if (f.hp <= 0) {
      f.dead = true;
      f.hp = 0;
      this.fx.push({ kind: 'poof', x: f.x, y: this.fy(f) - 16, t: 0, life: 0.5 });
      this.emit({ type: 'kill', x: f.x, y: this.fy(f) - 16, side: f.side, boss: f.isBoss });
      if (f.side === 'enemy') {
        this.kills++;
        this.killReward += f.reward;
        // 적 세기(기본 처치 보상)에 비례해 카페인을 얻는다
        const caf = killCaffeine(f.defId);
        this.caffeine = Math.min(this.caffeineMax, this.caffeine + caf);
        this.fx.push({ kind: 'text', x: f.x, y: this.fy(f) - 60, t: 0, life: 0.9, text: `+${f.reward}💰 +${caf}☕`, color: '#ffd54f' });
      }
    }
  }

  /** 뒤(자기 진영 쪽)로 밀어내고 잠깐 경직시킨다. 보스는 면역. */
  private knockback(f: Fighter, dist: number): void {
    if (f.isBoss) return;
    f.kbT = 0.4;
    f.kbV = (f.side === 'ally' ? -1 : 1) * dist * 6;
    f.swing = 0;
    this.fx.push({ kind: 'text', x: f.x, y: this.fy(f) - 70, t: 0, life: 0.6, text: '넉백!', color: '#80d8ff' });
    this.emit({ type: 'knockback', x: f.x, y: this.fy(f) - 20 });
  }

  private damageBase(b: Base, dmg: number, x: number): void {
    b.hp = Math.max(0, b.hp - dmg);
    b.hitFlash = 0.1;
    this.emit({ type: 'baseHit', side: b.side, x, dmg });
    this.fx.push({ kind: 'dmg', x, y: GROUND_Y - 120 - this.rng() * 60, t: 0, life: 0.6, text: String(Math.round(dmg)), color: b.side === 'enemy' ? '#ffe082' : '#ff8a80' });
  }

  private emit(e: BattleEvent): void {
    if (this.events.length < MAX_EVENTS) this.events.push(e);
  }

  /** 쌓인 이벤트를 꺼내고 비운다. */
  drainEvents(): BattleEvent[] {
    const out = this.events;
    this.events = [];
    return out;
  }

  private banner(text: string): void {
    this.fx.push({ kind: 'text', x: -1, y: -1, t: 0, life: 1.8, text });
  }

  private tickFx(dt: number): void {
    for (const e of this.fx) e.t += dt;
    this.fx = this.fx.filter((e) => e.t < e.life);
  }
}

/** 처치 시 얻는 카페인: 기본 처치 보상 × 0.6 (1~50) */
export function killCaffeine(defId: string): number {
  const base = ENEMY_BY_ID[defId]?.reward ?? 0;
  return Math.min(50, Math.max(1, Math.round(base * 0.6)));
}

function bodyR(f: Fighter): number {
  return 12 * (f.look.scale ?? 1);
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function projectileKind(defId: string): ProjectileKind {
  switch (defId) {
    case 'coder': return 'bug';
    case 'chemist': return 'flask';
    case 'drone': return 'bolt';
    case 'claudy': return 'paper';
    case 'codexy': return 'code';
    case 'reviewer': return 'comment';
    case 'revision': return 'bomb';
    case 'notif': return 'notif';
    case 'plane': return 'paper';
    default: return 'bolt';
  }
}
