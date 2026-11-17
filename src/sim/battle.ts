import { RANGED_THRESHOLD, type CombatStats, type HitEffects, type Look, type Side } from '../data/types';
import { tr } from '../i18n';
import { ENEMY_BY_ID } from '../data/enemies';
import type { StageDef } from '../data/stages';
import type { SkillId } from '../data/upgrades';
import type { BattleLoadout } from './progression';
import { CARDS, DRAFT_FALLBACK, DRAFT_GAP, DRAFT_MIN_T, MAX_DRAWS, RARITY_ODDS, type CardDef, type CardId, type CardRarity } from '../data/cards';

export const WORLD_W = 1800;
export const GROUND_Y = 400;
export const AIR_Y = 265;
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
/** 교수실 HP가 이 비율 아래로 처음 떨어질 때마다 비상 소집 */
const ALARM_AT = [0.75, 0.5, 0.25];
/** 비상 소집 충격파 범위 (교수실 앞에서) */
export const ALARM_RADIUS = 300;
/** 보스 호통 기본값: HP 66%·33% 아래로 처음 떨어질 때 모든 아군을 1.2초 기절, 70 밀어내기 */
export const BOSS_RAGE = { at: [0.66, 0.33], stun: 1.2, push: 70 };
/** 남은 시간이 이만큼이면 경고 배너 */
const TIME_WARN = 60;
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
  /** 기절 남은 시간 (이동·공격 불가) */
  stunT: number;
  /** 보스: 지금까지 일으킨 호통 횟수 */
  rageN: number;
  auraMul: number;
  dead: boolean;
  deathT: number;
  reward: number;
  isBoss: boolean;
  walk: number;
  // ── 상태 이상·장비 능력 ──
  /** 화상 남은 시간·초당 피해·틱 누적 */
  burnT: number;
  burnDps: number;
  burnAcc: number;
  /** 둔화 남은 시간과 속도 배율 */
  slowT: number;
  slowMul: number;
  /** 빙결 연출 남은 시간 (움직임은 stunT가 막는다) */
  frozenT: number;
  /** 보호막 (피해를 먼저 막는다) */
  shield: number;
  shieldCd: number;
  /** 1회 부활을 이미 썼는지 */
  revived: boolean;
  turretCd: number;
  strikeCd: number;
  /** 포탑: 세운 유닛 uid (아니면 0) */
  ownerUid: number;
  /** 남은 수명 (포탑만 유한) */
  lifeT: number;
}

export type ProjectileKind = 'bug' | 'flask' | 'paper' | 'laser' | 'comment' | 'code' | 'bomb' | 'notif' | 'heal' | 'book' | 'bolt' | 'wave' | 'coolant';

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
  /** 맞힌 적에게 거는 상태 이상 */
  hit?: HitEffects;
  /** 관통: 쏜 자리부터 대상 뒤 pierce까지 줄 위의 적을 모두 맞힌다 */
  pierce?: number;
  /** 관통 판정: 쏜 쪽이 공중을 맞힐 수 있는지 */
  antiAir?: boolean;
}

export type FxKind = 'dmg' | 'text' | 'boom' | 'heal' | 'stomp' | 'spawn' | 'poof' | 'zap';

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
  | { type: 'strike'; n: number }
  | { type: 'revive'; x: number }
  | { type: 'bossSpawn' }
  | { type: 'alarm' }
  | { type: 'rage'; x: number }
  | { type: 'timeWarn' }
  | { type: 'rush' }
  | { type: 'draft' }
  | { type: 'card'; id: CardId; rarity: CardRarity }
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

export interface BattleOptions {
  /** 학회 경품 추첨 카드 (기본 켜짐) */
  cards?: boolean;
}

/** 이번 판에 쌓인 카드 효과 배율 */
export interface CardMods {
  allyAtk: number;
  enemyAtk: number;
  printerAtk: number;
  auraRadius: number;
  reward: number;
  regen: number;
  /** 적 출현 간격 배율 (작을수록 자주) */
  spawnEvery: number;
}

/** 고른 카드 (timed 카드는 until까지) */
export interface PickedCard {
  card: CardDef;
  at: number;
  until?: number;
}

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
  /** 외전 평가 시즌 남은 시간 */
  frenzyT = 0;
  private nextFrenzy = Infinity;
  /** 외전 멘탈 붕괴 상태 */
  broken = false;
  result: BattleResult = null;
  /** 시간 제한을 넘겨 졌는지 */
  timedOut = false;
  private timeWarned = false;
  killReward = 0;
  kills = 0;
  private spawnTimer = 0;
  private nextRush: number;
  private queue: { at: number; id: string; rush?: boolean }[] = [];
  private bossSpawned = false;
  private uidSeq = 1;
  private acc = 0;
  private readonly rng: () => number;
  /** 카드 추첨 전용 난수 (전투 난수 흐름과 분리해 같은 시드면 같은 카드가 나온다) */
  private readonly cardRng: () => number;
  /** 추첨 대기 중인 카드 3장. 있는 동안 전투는 멈춘다 (pickCard로 고른다). */
  draft: CardDef[] | null = null;
  /** 이번 판 추첨 횟수 */
  draws = 0;
  picked: PickedCard[] = [];
  cardMods: CardMods = { allyAtk: 1, enemyAtk: 1, printerAtk: 1, auraRadius: 1, reward: 1, regen: 1, spawnEvery: 1 };
  /** 교수님 회의 중: 적 생산 정지 남은 시간 */
  meetingT = 0;
  /** 아군 무적 남은 시간 */
  invulnT = 0;
  private readonly cardsOn: boolean;
  private lastDraftT = 0;
  /** 아직 살아 있는 러시 적 uid (다 쓰러뜨리면 러시를 버텨 낸 것) */
  private rushUids = new Set<number>();

  constructor(readonly stage: StageDef, readonly loadout: BattleLoadout, seed = 1, opts: BattleOptions = {}) {
    this.rng = makeRng(seed);
    this.cardRng = makeRng((seed ^ 0x5eedca7d) + 17);
    this.cardsOn = opts.cards ?? true;
    this.caffeine = loadout.caffeineStart;
    this.ally = { side: 'ally', hp: loadout.baseHp, maxHp: loadout.baseHp, towerCd: 0, hitFlash: 0 };
    this.enemy = { side: 'enemy', hp: stage.enemyBaseHp, maxHp: stage.enemyBaseHp, towerCd: 0, hitFlash: 0 };
    this.nextRush = stage.rush.first;
    this.spawnTimer = stage.spawnEvery * 0.6;
    if (stage.mods?.frenzy) this.nextFrenzy = stage.mods.frenzy.every;
    if (stage.mods?.drain) this.mental = loadout.mentalMax * 0.6;
  }

  // ───────────── 플레이어 조작 ─────────────

  get caffeineMax(): number {
    return Math.round(this.loadout.caffeineMax * (1 + 0.25 * (this.brewLevel - 1)));
  }

  get caffeineRegen(): number {
    return this.loadout.caffeineRegen * (1 + 0.2 * (this.brewLevel - 1)) * (this.stage.caffeineMul ?? 1) * this.cardMods.regen;
  }

  /** 다음 단계 비용 (최고 단계면 null) */
  brewCost(): number | null {
    return this.brewLevel < BREW_MAX ? BREW_COST[this.brewLevel - 1]! : null;
  }

  canBrew(): boolean {
    const c = this.brewCost();
    return !this.result && !this.draft && c !== null && this.caffeine >= c;
  }

  /** 카페인을 써서 커피머신 단계를 올린다: 최대치 +25%, 충전 +20% */
  brew(): boolean {
    if (!this.canBrew()) return false;
    this.caffeine -= this.brewCost()!;
    this.brewLevel++;
    this.emit({ type: 'brew', level: this.brewLevel });
    this.fx.push({ kind: 'text', x: 105, y: GROUND_Y - 280, t: 0, life: 1.2, text: tr(`{coffee} 커피머신 Lv${this.brewLevel}!`, `{coffee} Coffee Machine Lv${this.brewLevel}!`), color: '#ffe0b2' });
    return true;
  }

  canSummon(unitId: string): boolean {
    const entry = this.loadout.deck.find((d) => d.def.id === unitId);
    return !!entry && !this.result && !this.draft && (this.unitCd[unitId] ?? 0) <= 0 && this.caffeine >= entry.def.cost;
  }

  summon(unitId: string): boolean {
    if (!this.canSummon(unitId)) return false;
    const entry = this.loadout.deck.find((d) => d.def.id === unitId)!;
    this.caffeine -= entry.def.cost;
    this.unitCd[unitId] = entry.def.cooldown * this.loadout.cooldownMul;
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
    return !!s && !this.result && !this.draft && this.mental >= s.cost;
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
        this.banner(tr('{snack} 야식 도착!', '{snack} Snacks are here!'));
        break;
      case 'allnight':
        this.hasteT = 6;
        this.banner(tr('{moon} 밤샘 모드!', '{moon} All-Nighter Mode!'));
        break;
      case 'aircon':
        this.freezeT = 6;
        this.banner(tr('{snow} 에어컨 풀가동!', '{snow} AC at full blast!'));
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

  /** 남은 시간(초). 시간 제한이 없으면 null */
  get timeLeft(): number | null {
    const lim = this.stage.timeLimit;
    return lim ? Math.max(0, lim - this.t) : null;
  }

  // ───────────── 진행 ─────────────

  /** 실제 경과 시간을 받아 고정 간격으로 시뮬레이션한다. 카드 추첨 중에는 멈춘다. */
  update(dt: number): void {
    if (this.draft) {
      this.acc = 0;
      return;
    }
    this.acc += Math.min(dt, 0.25);
    while (this.acc >= STEP && !this.draft) {
      this.acc -= STEP;
      this.step(STEP);
    }
  }

  step(dt: number): void {
    if (this.draft) return;
    if (this.result) {
      this.tickFx(dt);
      return;
    }
    this.t += dt;
    const L = this.loadout;
    this.caffeine = Math.min(this.caffeineMax, this.caffeine + this.caffeineRegen * dt);
    const drain = this.stage.mods?.drain ?? 0;
    this.mental = Math.max(0, Math.min(L.mentalMax, this.mental + (L.mentalRegen - drain) * dt));
    if (drain) {
      const broken = this.mental <= 0.5;
      if (broken && !this.broken) this.banner(tr('{dizzy} 멘탈 붕괴! 아군 공격력 −25%', '{dizzy} Sanity broken! Ally damage −25%'));
      this.broken = broken;
    }
    const fz = this.stage.mods?.frenzy;
    if (fz && this.t >= this.nextFrenzy) {
      this.frenzyT = fz.dur;
      this.nextFrenzy += fz.every;
      this.banner(tr('{clipboard} 평가 시즌! 적이 거세져요', '{clipboard} Evaluation season! Enemies get fierce'));
      this.emit({ type: 'rush' });
    }
    this.frenzyT = Math.max(0, this.frenzyT - dt);
    for (const k of Object.keys(this.unitCd)) this.unitCd[k] = Math.max(0, this.unitCd[k]! - dt);
    this.hasteT = Math.max(0, this.hasteT - dt);
    this.freezeT = Math.max(0, this.freezeT - dt);
    this.meetingT = Math.max(0, this.meetingT - dt);
    this.invulnT = Math.max(0, this.invulnT - dt);
    this.ally.hitFlash = Math.max(0, this.ally.hitFlash - dt);
    this.enemy.hitFlash = Math.max(0, this.enemy.hitFlash - dt);

    this.spawnEnemies(dt);
    this.computeAuras();
    for (const f of this.fighters) {
      if (!f.dead) this.tickStatus(f, dt);
      if (!f.dead) this.tickFighter(f, dt);
    }
    this.tickTower(this.ally, dt);
    this.tickTower(this.enemy, dt);
    this.tickProjectiles(dt);
    this.tickFx(dt);

    for (const f of this.fighters) if (f.dead) f.deathT += dt;
    this.fighters = this.fighters.filter((f) => !f.dead || f.deathT < 0.6);

    const left = this.timeLeft;
    if (this.enemy.hp <= 0) this.finish('win');
    else if (this.ally.hp <= 0) this.finish('lose');
    else if (left !== null && left <= 0) {
      this.timedOut = true;
      this.finish('lose');
    } else if (left !== null && left <= TIME_WARN && !this.timeWarned) {
      this.timeWarned = true;
      this.banner(tr('{clock} 퇴근 1분 전!', '{clock} 1 minute till clock-out!'));
      this.emit({ type: 'timeWarn' });
    }
    this.checkDraft();
  }

  private finish(r: BattleResult): void {
    this.result = r;
    this.draft = null;
    if (r) this.emit({ type: 'end', result: r });
    this.banner(r === 'win' ? tr('교수실 함락!', 'Prof\'s Office taken!') : this.timedOut ? tr('{clock} 야근 확정… 시간 초과', '{clock} Overtime again… time\'s up') : tr('연구실이 망가졌다…', 'The lab is wrecked…'));
  }

  // ───────────── 학회 경품 추첨 ─────────────

  /** 러시를 버텨 냈거나 오래 추첨이 없었으면 추첨을 연다. */
  private checkDraft(): void {
    if (!this.cardsOn || this.result || this.draft || this.draws >= MAX_DRAWS) return;
    let survived = false;
    if (this.rushUids.size && !this.queue.some((q) => q.rush)) {
      for (const uid of this.rushUids) if (!this.fighters.some((f) => f.uid === uid && !f.dead)) this.rushUids.delete(uid);
      survived = !this.rushUids.size;
    }
    if (this.t < DRAFT_MIN_T) return;
    const since = this.t - this.lastDraftT;
    if ((survived && (this.draws === 0 || since >= DRAFT_GAP)) || since >= DRAFT_FALLBACK) this.openDraft(survived);
  }

  /** 카드 3장을 뽑아 추첨을 연다 (전투는 pickCard까지 멈춘다). */
  openDraft(survived = false): void {
    if (this.result || this.draft) return;
    const hand: CardDef[] = [];
    for (let i = 0; i < 3; i++) {
      const rarity = this.rollRarity();
      let pool = CARDS.filter((c) => c.rarity === rarity && !hand.includes(c) && this.cardUsable(c));
      if (!pool.length) pool = CARDS.filter((c) => c.rarity === 'common' && !hand.includes(c) && this.cardUsable(c));
      hand.push(pool[Math.floor(this.cardRng() * pool.length)]!);
    }
    this.draft = hand;
    this.draws++;
    this.lastDraftT = this.t;
    this.acc = 0;
    if (survived) this.banner(tr('{check} 러시를 버텨 냈다!', '{check} Survived the rush!'));
    this.emit({ type: 'draft' });
  }

  private rollRarity(): CardRarity {
    let r = this.cardRng();
    for (const k of ['legend', 'curse', 'rare', 'common'] as CardRarity[]) {
      r -= RARITY_ODDS[k];
      if (r < 0) return k;
    }
    return 'common';
  }

  /** 지금 골라도 의미 있는 카드인지 */
  private cardUsable(c: CardDef): boolean {
    if (c.id === 'megaphone') return this.loadout.deck.some((d) => d.def.aura);
    if (c.id === 'repair') return this.brewLevel < BREW_MAX;
    return true;
  }

  /** 추첨 중인 카드 중 i번째를 고르고 효과를 적용한다. */
  pickCard(i: number): boolean {
    const c = this.draft?.[i];
    if (!c) return false;
    this.draft = null;
    this.applyCard(c);
    return true;
  }

  /** 카드 효과 적용 */
  applyCard(c: CardDef): void {
    const m = this.cardMods;
    switch (c.id as CardId) {
      case 'refill': this.caffeine = Math.min(this.caffeineMax, this.caffeine + 40); break;
      case 'cooldown': for (const k of Object.keys(this.unitCd)) this.unitCd[k] = 0; break;
      case 'toner': m.printerAtk += 0.25; break;
      case 'walk': this.mental = Math.min(this.loadout.mentalMax, this.mental + 30); break;
      case 'beans': m.regen += 0.1; break;
      case 'cleanup': this.ally.hp = Math.min(this.ally.maxHp, this.ally.hp + this.ally.maxHp * 0.15); break;
      case 'megaphone': m.auraRadius *= 2; break;
      case 'payroll': m.reward += 0.3; break;
      case 'repair':
        if (this.brewLevel < BREW_MAX) {
          this.brewLevel++;
          this.emit({ type: 'brew', level: this.brewLevel });
        }
        break;
      case 'deadline': m.allyAtk += 0.1; break;
      case 'allnighter': this.hasteT = Math.max(this.hasteT, c.dur!); break;
      case 'meeting': this.meetingT = Math.max(this.meetingT, c.dur!); break;
      case 'afterparty':
        for (const f of this.alive('ally')) {
          f.hp = f.maxHp;
          this.fx.push({ kind: 'heal', x: f.x, y: this.fy(f) - 30, t: 0, life: 0.8 });
        }
        this.invulnT = Math.max(this.invulnT, c.dur!);
        break;
      case 'bestpaper': this.damageBase(this.enemy, this.enemy.maxHp * 0.1, ENEMY_FRONT); break;
      case 'reviewer2': m.reward += 0.5; m.enemyAtk += 0.15; break;
      case 'weekend': m.regen += 0.3; m.spawnEvery /= 1.2; break;
    }
    this.picked.push({ card: c, at: this.t, until: c.kind === 'timed' ? this.t + c.dur! : undefined });
    this.emit({ type: 'card', id: c.id, rarity: c.rarity });
    this.banner(`{${c.icon}} ${c.name}!`);
  }

  /** HUD에 보여 줄 적용 중인 카드 (즉시 카드와 끝난 timed 카드는 빼고) */
  activeCards(): { card: CardDef; left: number | null }[] {
    return this.picked
      .filter((p) => p.card.kind === 'battle' || (p.until !== undefined && p.until > this.t))
      .map((p) => ({ card: p.card, left: p.until !== undefined ? p.until - this.t : null }));
  }

  // ───────────── 적 출현 ─────────────

  private spawnEnemies(dt: number): void {
    const st = this.stage;
    if (st.boss && !this.bossSpawned && this.t >= 3) {
      this.bossSpawned = true;
      this.spawnEnemy(st.boss, true);
      this.banner(tr(`{warn} ${ENEMY_BY_ID[st.boss]!.name} 등장!`, `{warn} ${ENEMY_BY_ID[st.boss]!.name} appears!`));
      this.emit({ type: 'bossSpawn' });
    }
    // 장기전 방지: 3분이 지나면 출현 간격이 점점 짧아진다 (최대 절반).
    const overtime = this.t > 180 ? Math.max(0.5, 1 - (this.t - 180) / 240) : 1;
    const every = st.spawnEvery * overtime * this.cardMods.spawnEvery;
    // 교수님 회의 중: 새 적이 나오지 않고 러시·대기열도 그만큼 미뤄진다
    if (this.meetingT > 0) {
      this.nextRush += dt;
      for (const q of this.queue) q.at += dt;
      return;
    }
    this.spawnTimer += dt;
    if (this.spawnTimer >= every) {
      this.spawnTimer -= every * (0.8 + this.rng() * 0.4);
      this.spawnEnemy(this.pickEnemy());
    }
    if (this.t >= this.nextRush) {
      this.nextRush += st.rush.every;
      for (let i = 0; i < st.rush.size; i++) this.queue.push({ at: this.t + i * 0.45, id: this.pickEnemy(), rush: true });
      this.banner(tr('{megaphone} 잡무 러시!', '{megaphone} Busywork rush!'));
      this.emit({ type: 'rush' });
    }
    while (this.queue.length && this.queue[0]!.at <= this.t) {
      const q = this.queue.shift()!;
      const f = this.spawnEnemy(q.id);
      if (f && q.rush) this.rushUids.add(f.uid);
    }
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
    const bs = def.boss ? (this.stage.bossScale ?? 1) : 1;
    const stats: CombatStats = { ...def, hp: Math.round(def.hp * scale * bs * (def.boss ? 1 : ENEMY_HP_MUL)), atk: def.atk * atkScale * (1 + (bs - 1) * 0.6) };
    const f = this.addFighter('enemy', id, def.name, def.look, 1, stats, x, Math.round(def.reward * KILL_REWARD_MUL * (this.stage.killMul ?? 1)));
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
      attacking: false, swing: 0, hitFlash: 0, kbT: 0, kbV: 0, stunT: 0, rageN: 0, auraMul: 1, dead: false, deathT: 0,
      reward, isBoss: false, walk: this.rng() * 10,
      burnT: 0, burnDps: 0, burnAcc: 0, slowT: 0, slowMul: 1, frozenT: 0, shield: 0, shieldCd: 0, revived: false,
      turretCd: stats.turret?.every ?? 0, strikeCd: stats.fieldStrike?.every ?? 0, ownerUid: 0, lifeT: Infinity,
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
        const r = a.stats.aura!.radius * (a.side === 'ally' ? this.cardMods.auraRadius : 1);
        if (a.side === f.side && a !== f && Math.abs(a.x - f.x) <= r) f.auraMul = Math.max(f.auraMul, a.stats.aura!.atkMul);
      }
    }
  }

  private enemyFrenzy(): number {
    return this.frenzyT > 0 ? this.stage.mods!.frenzy!.mul : 1;
  }

  private speedMul(f: Fighter): number {
    const slow = f.slowT > 0 ? f.slowMul : 1;
    if (f.side === 'ally') return (this.hasteT > 0 ? 1.15 : 1) * slow;
    return (this.freezeT > 0 ? 0.5 : 1) * this.enemyFrenzy() * slow;
  }

  private atkRateMul(f: Fighter): number {
    const slow = f.slowT > 0 ? f.slowMul : 1;
    if (f.side === 'ally') return (this.hasteT > 0 ? 1.4 : 1) * slow;
    return (this.freezeT > 0 ? 0.5 : 1) * this.enemyFrenzy() * slow;
  }

  /** 맞힌 적에게 거는 상태 이상만 골라낸다 (없으면 undefined) */
  private hitEffects(s: CombatStats): HitEffects | undefined {
    return s.burn || s.slow || s.freeze ? { burn: s.burn, slow: s.slow, freeze: s.freeze } : undefined;
  }

  /** 화상·둔화·빙결 걸기. 빙결 확률만 전투 난수를 쓴다. */
  private applyHit(f: Fighter, e: HitEffects): void {
    if (f.dead) return;
    if (e.burn) {
      f.burnDps = f.burnT > 0 ? Math.max(f.burnDps, e.burn.dps) : e.burn.dps;
      f.burnT = Math.max(f.burnT, e.burn.dur);
    }
    if (e.slow) {
      f.slowMul = f.slowT > 0 ? Math.min(f.slowMul, e.slow.mul) : e.slow.mul;
      f.slowT = Math.max(f.slowT, e.slow.dur);
    }
    if (e.freeze && this.rng() < e.freeze.chance) {
      const d = e.freeze.dur * (f.isBoss ? 0.4 : 1);
      f.stunT = Math.max(f.stunT, d);
      f.frozenT = Math.max(f.frozenT, d);
      f.attacking = false;
      f.swing = 0;
    }
  }

  /** 상태 이상과 상시 능력 (기절·넉백 중에도 흐른다) */
  private tickStatus(f: Fighter, dt: number): void {
    const s = f.stats;
    const foe: Side = f.side === 'ally' ? 'enemy' : 'ally';
    if (f.burnT > 0) {
      f.burnT -= dt;
      f.burnAcc += dt;
      if (f.burnAcc >= 0.5 - 1e-9) {
        f.burnAcc -= 0.5;
        this.damageFighter(f, f.burnDps * 0.5, foe, undefined, false, undefined, true);
      }
      if (f.burnT <= 1e-9) {
        f.burnT = 0;
        f.burnAcc = 0;
      }
      if (f.dead) return;
    }
    f.slowT = Math.max(0, f.slowT - dt);
    f.frozenT = Math.max(0, f.frozenT - dt);
    if (f.lifeT !== Infinity) {
      f.lifeT -= dt;
      if (f.lifeT <= 0) {
        // 포탑 수명 끝: 조용히 사라진다 (처치 보상 없음)
        f.dead = true;
        f.hp = 0;
        this.fx.push({ kind: 'poof', x: f.x, y: this.fy(f) - 16, t: 0, life: 0.5 });
        return;
      }
    }
    if (s.caffeineGen && f.side === 'ally') this.caffeine = Math.min(this.caffeineMax, this.caffeine + s.caffeineGen * dt);
    if (s.healZone) {
      const pulse = Math.floor(this.t) !== Math.floor(this.t - dt);
      for (const o of this.alive(f.side)) {
        if (Math.abs(o.x - f.x) > s.healZone.radius || o.hp >= o.maxHp) continue;
        o.hp = Math.min(o.maxHp, o.hp + s.healZone.hps * dt);
        if (pulse) this.fx.push({ kind: 'heal', x: o.x, y: this.fy(o) - 34, t: 0, life: 0.7 });
      }
    }
    if (s.shield) {
      f.shieldCd -= dt;
      if (f.shieldCd <= 0) {
        f.shieldCd = s.shield.every;
        for (const o of this.alive(f.side)) {
          if (o !== f && (s.shield.radius <= 0 || Math.abs(o.x - f.x) > s.shield.radius)) continue;
          o.shield = Math.max(o.shield, s.shield.amount);
        }
      }
    }
  }

  /** 3D 프린터 등: 제자리에서 쏘는 포탑을 세운다 */
  private tickTurret(f: Fighter, dt: number): void {
    const spec = f.stats.turret!;
    f.turretCd -= dt;
    if (f.turretCd > 0) return;
    const mine = this.fighters.filter((o) => !o.dead && o.ownerUid === f.uid).length;
    if (mine >= spec.max) return;
    f.turretCd = spec.every;
    const stats: CombatStats = { hp: spec.hp, atk: spec.atk, range: spec.range, speed: 0, interval: spec.interval };
    const t = this.addFighter(f.side, `${f.defId}:turret`, tr('포탑', 'Turret'), spec.look, f.tier, stats, f.x - 8 * (f.side === 'ally' ? 1 : -1), 0);
    t.ownerUid = f.uid;
    t.lifeT = spec.life;
    t.depth = f.depth + 6;
    this.fx.push({ kind: 'spawn', x: t.x, y: this.fy(t), t: 0, life: 0.4 });
  }

  /** 슈퍼컴퓨터 클러스터 등: 전장의 모든 적에게 연산 타격 */
  private tickStrike(f: Fighter, dt: number): void {
    const fs = f.stats.fieldStrike!;
    f.strikeCd -= dt;
    if (f.strikeCd > 0) return;
    const foes = this.alive(f.side === 'ally' ? 'enemy' : 'ally');
    if (!foes.length) return;
    f.strikeCd = fs.every;
    const dmg = fs.dmg * (f.side === 'ally' ? this.cardMods.allyAtk * (this.broken ? 0.75 : 1) : 1);
    for (const o of foes) {
      this.fx.push({ kind: 'zap', x: o.x, y: this.fy(o) - 20, t: 0, life: 0.5 });
      this.damageFighter(o, dmg, f.side);
    }
    this.fx.push({ kind: 'text', x: f.x, y: this.fy(f) - 90, t: 0, life: 1.1, text: tr('{sparkle} 연산 완료!', '{sparkle} Compute done!'), color: '#80d8ff' });
    this.emit({ type: 'strike', n: foes.length });
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
    const stunned = f.stunT > 0;
    // 기절 중에는 공격 대기도 흐르지 않는다
    if (stunned) f.stunT = Math.max(0, f.stunT - dt);
    else f.cd -= dt * this.atkRateMul(f);
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
    // 기절: 제자리에서 아무것도 못 한다
    if (stunned) {
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
    if (s.turret) this.tickTurret(f, dt);
    if (s.fieldStrike) this.tickStrike(f, dt);

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
    const atk = s.atk * f.auraMul * (f.side === 'ally' ? (this.broken ? 0.75 : 1) * this.cardMods.allyAtk : this.cardMods.enemyAtk);
    const ranged = s.range >= RANGED_THRESHOLD;
    if (target) {
      if (ranged) this.shoot(f, atk, target.x, this.fy(target) - 18, target.uid, false);
      else this.damageFighter(target, atk, f.side, s.knockback, true, this.hitEffects(s));
    } else {
      const bx = f.side === 'ally' ? ENEMY_FRONT + 20 : ALLY_FRONT - 20;
      if (ranged) this.shoot(f, atk, bx, GROUND_Y - 80, null, true);
      else this.damageBase(f.side === 'ally' ? this.enemy : this.ally, atk * (s.buildingMul ?? 1), f.x + (f.side === 'ally' ? 16 : -16));
    }
  }

  private tickBoss(f: Fighter, b: NonNullable<typeof ENEMY_BY_ID[string]['boss']>, dt: number): void {
    if (b.summon && this.meetingT <= 0) {
      f.summonCd -= dt;
      if (f.summonCd <= 0) {
        f.summonCd = b.summon.every;
        for (let i = 0; i < b.summon.count; i++) this.spawnEnemy(b.summon.id, false, f.x + 20 + i * 12);
        this.fx.push({ kind: 'text', x: f.x, y: GROUND_Y - 150, t: 0, life: 1, text: tr('이것 좀 해와!', 'Do this for me!'), color: '#fff' });
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
        this.fx.push({ kind: 'text', x: f.x, y: GROUND_Y - 160, t: 0, life: 1, text: tr('버럭!', 'HEY!'), color: '#ff5252' });
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
      targetUid, hitsBase, arc: kind === 'flask' || kind === 'bomb' || kind === 'coolant' ? 40 + dist * 0.15 : 0,
      knockback: f.stats.knockback,
      hit: this.hitEffects(f.stats),
      pierce: f.stats.pierce,
      antiAir: f.stats.range >= RANGED_THRESHOLD,
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
      t: 0, dur: 0.1 + bestD / 900, dmg: ally ? this.loadout.printerAtk * this.cardMods.printerAtk : this.stage.towerAtk,
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
    if (p.pierce !== undefined) {
      // 관통: 쏜 자리부터 대상 뒤 pierce까지 줄 위의 적을 모두 맞힌다
      const dir = p.side === 'ally' ? 1 : -1;
      const end = (p.x1 - p.x0) * dir + p.pierce;
      for (const o of this.alive(foe)) {
        if (o.stats.flying && !p.antiAir) continue;
        const d = (o.x - p.x0) * dir;
        if (d >= -12 && d <= end + bodyR(o)) this.damageFighter(o, p.dmg, p.side, p.knockback, false, p.hit);
      }
      if (p.hitsBase) this.damageBase(p.side === 'ally' ? this.enemy : this.ally, p.dmg * p.buildingMul, p.x1);
      return;
    }
    if (p.hitsBase) {
      this.damageBase(p.side === 'ally' ? this.enemy : this.ally, p.dmg * p.buildingMul, p.x1);
      return;
    }
    if (p.splash > 0) {
      for (const o of this.alive(foe)) {
        const dy = Math.abs(this.fy(o) - p.y1);
        if (Math.abs(o.x - p.x1) <= p.splash + bodyR(o) && dy < 170) this.damageFighter(o, p.dmg, p.side, p.knockback, false, p.hit);
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
    if (tgt) this.damageFighter(tgt, p.dmg, p.side, p.knockback, false, p.hit);
  }

  private damageFighter(f: Fighter, dmg: number, from: Side, kb?: { chance: number; dist: number }, melee = false, eff?: HitEffects, burn = false): void {
    if (f.dead) return;
    // 학회 뒤풀이: 아군 무적
    if (f.side === 'ally' && this.invulnT > 0) return;
    // 보호막이 먼저 막는다
    if (f.shield > 0) {
      const absorbed = Math.min(f.shield, dmg);
      f.shield -= absorbed;
      dmg -= absorbed;
      if (dmg <= 0) {
        f.hitFlash = 0.06;
        if (eff) this.applyHit(f, eff);
        return;
      }
    }
    this.emit({ type: 'hit', x: f.x, y: this.fy(f) - 20 * (f.look.scale ?? 1), dmg, melee, to: f.side });
    if (kb && !f.isBoss && f.hp > dmg && this.rng() < kb.chance) this.knockback(f, kb.dist);
    f.hp -= dmg;
    f.hitFlash = 0.12;
    if (f.isBoss && f.hp > 0) this.checkRage(f);
    this.fx.push({ kind: 'dmg', x: f.x + (this.rng() - 0.5) * 16, y: this.fy(f) - 40 - (f.look.scale ?? 1) * 20, t: 0, life: 0.6, text: String(Math.round(dmg)), color: burn ? '#ffab40' : from === 'ally' ? '#fff' : '#ff8a80' });
    if (f.hp > 0 && eff) this.applyHit(f, eff);
    if (f.hp <= 0 && f.stats.revive && !f.revived) {
      // 1회 부활 (재부팅)
      f.revived = true;
      f.hp = Math.max(1, f.maxHp * f.stats.revive.hpRatio);
      f.burnT = 0;
      f.burnAcc = 0;
      this.fx.push({ kind: 'text', x: f.x, y: this.fy(f) - 80, t: 0, life: 1.2, text: tr('{retry} 재부팅!', '{retry} Rebooting!'), color: '#80d8ff' });
      this.emit({ type: 'revive', x: f.x });
      return;
    }
    if (f.hp <= 0) {
      f.dead = true;
      f.hp = 0;
      if (f.stats.deathBurst) this.deathBurst(f);
      this.fx.push({ kind: 'poof', x: f.x, y: this.fy(f) - 16, t: 0, life: 0.5 });
      this.emit({ type: 'kill', x: f.x, y: this.fy(f) - 16, side: f.side, boss: f.isBoss });
      if (f.side === 'enemy') {
        this.kills++;
        const reward = Math.round(f.reward * this.cardMods.reward);
        this.killReward += reward;
        // 적 세기(기본 처치 보상)에 비례해 카페인을 얻는다
        const caf = killCaffeine(f.defId);
        // 멘탈 고갈 외전: 처치하면 멘탈이 조금 돌아온다
        if (this.stage.mods?.drain) this.mental = Math.min(this.loadout.mentalMax, this.mental + 3 + caf * 0.5);
        this.caffeine = Math.min(this.caffeineMax, this.caffeine + caf);
        this.fx.push({ kind: 'text', x: f.x, y: this.fy(f) - 60, t: 0, life: 0.9, text: `+${reward}{coin} +${caf}{coffee}`, color: '#ffd54f' });
      }
    }
  }

  /** 쓰러질 때 폭발: 반경 안 적에게 피해와 자기 상태 이상 */
  private deathBurst(f: Fighter): void {
    const b = f.stats.deathBurst!;
    const foe: Side = f.side === 'ally' ? 'enemy' : 'ally';
    const eff = this.hitEffects(f.stats);
    for (const o of this.alive(foe)) if (Math.abs(o.x - f.x) <= b.radius + bodyR(o)) this.damageFighter(o, b.dmg, f.side, undefined, false, eff);
    this.fx.push({ kind: 'boom', x: f.x, y: this.fy(f) - 16, t: 0, life: 0.5, r: b.radius, color: f.stats.freeze ? '#81d4fa' : undefined });
    this.emit({ type: 'boom', x: f.x, y: this.fy(f) - 16, r: b.radius, side: f.side, big: false });
  }

  /** 뒤(자기 진영 쪽)로 밀어내고 잠깐 경직시킨다. 보스는 면역. */
  private knockback(f: Fighter, dist: number): void {
    if (f.isBoss) return;
    f.kbT = 0.4;
    f.kbV = (f.side === 'ally' ? -1 : 1) * dist * 6;
    f.swing = 0;
    this.fx.push({ kind: 'text', x: f.x, y: this.fy(f) - 70, t: 0, life: 0.6, text: tr('넉백!', 'Knockback!'), color: '#80d8ff' });
    this.emit({ type: 'knockback', x: f.x, y: this.fy(f) - 20 });
  }

  /** 보스 HP가 호통 기준선 아래로 처음 떨어졌으면 (기준선마다 한 번) 호통 */
  private checkRage(f: Fighter): void {
    const rage = ENEMY_BY_ID[f.defId]?.boss?.rage ?? BOSS_RAGE;
    while (f.rageN < rage.at.length && f.hp / f.maxHp <= rage.at[f.rageN]!) {
      f.rageN++;
      this.bossRage(f, rage.stun, rage.push);
    }
  }

  /**
   * 보스 호통: 전장의 모든 아군을 잠깐 기절시키고 뒤로 밀어낸다.
   * 보스에 몰아치던 흐름을 끊어 보스전에 굴곡을 준다.
   */
  private bossRage(f: Fighter, stun: number, push: number): void {
    for (const o of this.alive('ally')) {
      o.stunT = Math.max(o.stunT, stun);
      o.kbT = 0.4;
      o.kbV = -push * 6;
      o.swing = 0;
      o.attacking = false;
    }
    this.fx.push({ kind: 'stomp', x: f.x, y: GROUND_Y, t: 0, life: 0.8, r: 420 });
    this.fx.push({ kind: 'text', x: f.x, y: GROUND_Y - 170, t: 0, life: 1.2, text: tr('{anger} 이게 뭐야!', '{anger} What is THIS?!'), color: '#ff5252' });
    this.emit({ type: 'rage', x: f.x });
    this.banner(tr(`{anger} ${f.name} 호통!`, `{anger} ${f.name} yells!`));
  }

  private damageBase(b: Base, dmg: number, x: number): void {
    const before = b.hp / b.maxHp;
    b.hp = Math.max(0, b.hp - dmg);
    if (b.side === 'enemy' && b.hp > 0) {
      const now = b.hp / b.maxHp;
      for (const th of ALARM_AT) if (before > th && now <= th) this.alarm();
    }
    b.hitFlash = 0.1;
    this.emit({ type: 'baseHit', side: b.side, x, dmg });
    this.fx.push({ kind: 'dmg', x, y: GROUND_Y - 120 - this.rng() * 60, t: 0, life: 0.6, text: String(Math.round(dmg)), color: b.side === 'enemy' ? '#ffe082' : '#ff8a80' });
  }

  /**
   * 교수실 비상 소집: 교수실 앞에 몰린 아군을 충격파로 밀어내고 지원군을 부른다.
   * 물량으로 건물에 붙어 녹이는 전략을 끊는다.
   */
  private alarm(): void {
    const x = ENEMY_FRONT;
    const R = ALARM_RADIUS;
    const dmg = this.stage.towerAtk * 2;
    for (const o of this.alive('ally')) {
      if (x - o.x > R) continue;
      this.damageFighter(o, dmg + o.maxHp * 0.12, 'enemy');
      if (!o.dead) this.knockback(o, 90);
    }
    const n = Math.max(2, Math.round(this.stage.rush.size * 0.5));
    for (let i = 0; i < n; i++) this.queue.push({ at: this.t + 0.3 + i * 0.35, id: this.pickEnemy() });
    this.queue.sort((a, b) => a.at - b.at);
    this.fx.push({ kind: 'stomp', x, y: GROUND_Y, t: 0, life: 0.8, r: R });
    this.emit({ type: 'stomp', x, r: R });
    this.emit({ type: 'alarm' });
    this.banner(tr('{alarm} 교수님 비상 소집! 교수실 앞이 밀려나요', '{alarm} Emergency summons! The front line is pushed back'));
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
    case 'scope': return 'wave';
    case 'cooler': return 'coolant';
    case 'cluster': return 'code';
    default: return 'bolt';
  }
}
