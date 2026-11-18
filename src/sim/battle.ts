import { RANGED_THRESHOLD, type CombatStats, type HitEffects, type Look, type Side } from '../data/types';
import { tr } from '../i18n';
import { ENEMY_BY_ID } from '../data/enemies';
import type { StageDef } from '../data/stages';
import type { SkillId } from '../data/upgrades';
import type { BattleLoadout } from './progression';
import { makeCourseRules, type CourseRule } from './course-rules';
import { CARDS, DRAFT_FALLBACK, DRAFT_GAP, DRAFT_MIN_T, MAX_DRAWS, RARITY_ODDS, type CardDef, type CardId, type CardRarity } from '../data/cards';

export const WORLD_W = 1800;
/** 피해 숫자를 더 띄우지 않는 화면 효과 수 (난전에서 글자 그리기가 프레임을 잡아먹지 않게) */
const MAX_FX = 140;
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
  /** 방어 깎기 남은 시간과 받는 피해 배율 */
  shredT: number;
  shredMul: number;
  /** 띄우기: 공중에 떠 있는 남은 시간과 처음 길이 (연출용, 움직임은 stunT가 막는다) */
  airT: number;
  airDur: number;
  /** 기절 장판 대기 */
  fieldCd: number;
  /** 성장 배율과 처음 최대 HP·크기 */
  growMul: number;
  baseMaxHp: number;
  baseScale: number;
  /** 재출현을 이미 썼는지 */
  respawned: boolean;
  /** 분열로 생긴 쪽 (다시 갈라지지 않고 카페인을 반만 준다) */
  splitChild: boolean;
  /** 자동 리뷰 AI(외전 5)에게 능력이 막힌 남은 시간 */
  silenceT: number;
  /** 보스 특수 패턴(자동 리뷰) 대기 */
  skillCd: number;
  /** 생성형 복제(외전 5)로 적 편에 생긴 아군 유닛 복제본 */
  copy: boolean;
  /** 무한 모드 화이트보드 전초기지 (제자리 구조물: 넉백·기절·빙결·띄우기 면역) */
  outpost?: boolean;
}

export type ProjectileKind =
  | 'bug' | 'flask' | 'paper' | 'laser'
  // 프린터 포탑 단계별: 잉크 방울 · 토너 출력물 · 복합기 문서 뭉치
  | 'ink' | 'toner' | 'scan' | 'comment' | 'code' | 'bomb' | 'notif' | 'heal' | 'book' | 'bolt' | 'wave' | 'coolant'
  // 장비 22종·버그 군단
  | 'beam' | 'pulse' | 'spark' | 'dot' | 'solder' | 'photon' | 'qubit'
  // 무한 모드 화이트보드 전초기지의 보드마커
  | 'marker';

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
  /** 쏜 유닛 (흡혈·연쇄·대공 배율·카페인 흡수용) */
  src?: Fighter;
  /** 교수님 레이저 출력 단계 (무한 모드, 0~3: 굵기·색 연출용) */
  power?: number;
}

export type FxKind = 'dmg' | 'text' | 'boom' | 'heal' | 'stomp' | 'spawn' | 'poof' | 'zap' | 'arc';

export interface Fx {
  kind: FxKind;
  x: number;
  y: number;
  t: number;
  life: number;
  text?: string;
  color?: string;
  r?: number;
  /** 'arc' (연쇄 번개) 끝점 */
  x2?: number;
  y2?: number;
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
  /** 외전 7 순간 정전 직전 경고와 정전 */
  | { type: 'blipWarn' }
  | { type: 'blip'; vanished: number }
  /** 외전 5 생성형 복제 */
  | { type: 'copy'; unitId: string }
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
  /**
   * 추첨이 열리기 전 연출 시간 (전투 시간 초, 기본 0 = 바로 열림).
   * 이 동안 전투는 그대로 흘러가고, 화면은 이 구간을 슬로우모션으로 보여 준다.
   */
  draftIntro?: number;
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
  /** 외전 5: 최근 소환한 유닛 id (오래된 것부터) */
  recentSummons: string[] = [];
  /** 외전 5: 다음 복제 시각 */
  nextCopy = Infinity;
  /** 외전 4 보스 접속 폭주 대기 (시작 전에는 null) */
  private overloadCd: number | null = null;
  /** 외전 7 순간 정전: 다음·지난 정전 시각, 경고 여부, 화면이 어두운 남은 시간 */
  nextBlip = Infinity;
  private lastBlip = 0;
  private blipWarned = false;
  blipT = 0;
  /** 순간 정전으로 사라진 아군 수 */
  vanished = 0;
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
  /** 전공 과목 규칙 (과목 스테이지만, 없으면 빈 목록) */
  private readonly rules: CourseRule[];
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
  private readonly draftIntroLen: number;
  /** 연출이 끝나면 열릴 추첨 카드 (연출 중이 아니면 null) */
  pendingDraft: CardDef[] | null = null;
  /** 추첨 연출의 남은 시간 (전투 시간 초) */
  draftIntroT = 0;
  private lastDraftT = 0;
  /** 아직 살아 있는 러시 적 uid (다 쓰러뜨리면 러시를 버텨 낸 것) */
  private rushUids = new Set<number>();
  /** 무한 모드 교수님 레이저 출력 단계 (0~3, 전투 1·2·3분에 오른다) */
  laserTier = 0;
  /** 화이트보드 전초기지를 세웠는지 */
  private outpostsPlaced = false;
  /** 철거 연출을 마친 전초기지 uid */
  private outpostsDown = new Set<number>();

  constructor(readonly stage: StageDef, readonly loadout: BattleLoadout, seed = 1, opts: BattleOptions = {}) {
    this.rng = makeRng(seed);
    this.cardRng = makeRng((seed ^ 0x5eedca7d) + 17);
    this.cardsOn = opts.cards ?? true;
    this.rules = makeCourseRules(stage.mods?.course);
    this.draftIntroLen = Math.max(0, opts.draftIntro ?? 0);
    this.caffeine = loadout.caffeineStart;
    this.ally = { side: 'ally', hp: loadout.baseHp, maxHp: loadout.baseHp, towerCd: 0, hitFlash: 0 };
    this.enemy = { side: 'enemy', hp: stage.enemyBaseHp, maxHp: stage.enemyBaseHp, towerCd: 0, hitFlash: 0 };
    this.nextRush = stage.rush.first;
    this.spawnTimer = stage.spawnEvery * 0.6;
    if (stage.mods?.frenzy) this.nextFrenzy = stage.mods.frenzy.every;
    if (stage.mods?.drain) this.mental = loadout.mentalMax * 0.6;
    if (stage.mods?.copy) this.nextCopy = stage.mods.copy.every;
    if (stage.mods?.blip) this.nextBlip = stage.mods.blip.every;
  }

  // ───────────── 플레이어 조작 ─────────────

  get caffeineMax(): number {
    let mul = 1;
    for (const r of this.rules) if (r.caffeineMax) mul *= r.caffeineMax(this);
    return Math.round(this.loadout.caffeineMax * (1 + 0.25 * (this.brewLevel - 1)) * mul);
  }

  get caffeineRegen(): number {
    let mul = 1;
    for (const r of this.rules) if (r.regen) mul *= r.regen(this);
    return this.loadout.caffeineRegen * (1 + 0.2 * (this.brewLevel - 1)) * (this.stage.caffeineMul ?? 1) * this.cardMods.regen * this.burnMul * mul;
  }

  /** 전투 진행률 0~1 (시간 제한 기준, 없으면 0) */
  get progress(): number {
    const lim = this.stage.timeLimit;
    return lim ? Math.min(1, this.t / lim) : 0;
  }

  /** 외전 6 번레이트: 카페인 충전 배율 (1 → to) */
  get burnMul(): number {
    const br = this.stage.mods?.burnRate;
    return br ? 1 - (1 - br.to) * this.progress : 1;
  }

  /** 외전 4 카운트다운: 적 이동·공격 속도 배율 (1 → mul) */
  get countdownMul(): number {
    const cd = this.stage.mods?.countdown;
    return cd ? 1 + (cd.mul - 1) * this.progress : 1;
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

  /** 소환 비용 (과목 규칙이 바꿀 수 있다) */
  unitCost(unitId: string): number {
    const entry = this.loadout.deck.find((d) => d.def.id === unitId);
    let cost = entry?.def.cost ?? 0;
    for (const r of this.rules) if (r.cost) cost = r.cost(this, unitId, cost);
    return cost;
  }

  canSummon(unitId: string): boolean {
    const entry = this.loadout.deck.find((d) => d.def.id === unitId);
    return !!entry && !this.result && !this.draft && (this.unitCd[unitId] ?? 0) <= 0 && this.caffeine >= this.unitCost(unitId);
  }

  summon(unitId: string): boolean {
    if (!this.canSummon(unitId)) return false;
    const entry = this.loadout.deck.find((d) => d.def.id === unitId)!;
    this.caffeine -= this.unitCost(unitId);
    this.unitCd[unitId] = entry.def.cooldown * this.loadout.cooldownMul;
    const count = entry.def.count ?? 1;
    const made: Fighter[] = [];
    for (let i = 0; i < count; i++) {
      const f = this.addFighter('ally', entry.def.id, entry.def.names[entry.tier - 1]!, entry.def.look, entry.tier, entry.stats, ALLY_FRONT - 20 - i * 14, 0);
      f.depth = i * 10 + this.rng() * 6;
      made.push(f);
    }
    for (const r of this.rules) r.summoned?.(this, unitId, made);
    const cp = this.stage.mods?.copy;
    if (cp) {
      this.recentSummons.push(unitId);
      if (this.recentSummons.length > cp.recent) this.recentSummons.shift();
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
      this.pendingDraft = null;
      this.tickFx(dt);
      return;
    }
    if (this.pendingDraft) {
      this.draftIntroT -= dt;
      if (this.draftIntroT <= 0) {
        this.draft = this.pendingDraft;
        this.pendingDraft = null;
        this.draftIntroT = 0;
        this.acc = 0;
        return;
      }
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
    this.tickCopy();
    this.tickBlip(dt);
    for (const r of this.rules) r.step?.(this, dt);
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
    this.tickEndless();
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
    if (!this.cardsOn || this.result || this.draft || this.pendingDraft || this.draws >= MAX_DRAWS) return;
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
    if (this.result || this.draft || this.pendingDraft) return;
    const hand: CardDef[] = [];
    for (let i = 0; i < 3; i++) {
      const rarity = this.rollRarity();
      let pool = CARDS.filter((c) => c.rarity === rarity && !hand.includes(c) && this.cardUsable(c));
      if (!pool.length) pool = CARDS.filter((c) => c.rarity === 'common' && !hand.includes(c) && this.cardUsable(c));
      hand.push(pool[Math.floor(this.cardRng() * pool.length)]!);
    }
    if (this.draftIntroLen > 0) {
      // 연출 먼저: 끝나면 step()이 카드를 연다
      this.pendingDraft = hand;
      this.draftIntroT = this.draftIntroLen;
    } else this.draft = hand;
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
    f.skillCd = (def.boss?.silence?.every ?? 0) * 0.6;
    for (const r of this.rules) r.enemySpawned?.(this, f);
    return f;
  }

  // ───────────── 외전 4~7 특수 규칙 ─────────────

  /** 외전 4 보스 접속 폭주: 전투 시간이 after를 넘으면 every초마다 모든 아군을 dur초 멈춘다 */
  private tickOverload(f: Fighter, o: { after: number; every: number; dur: number }, dt: number): void {
    if (this.progress < o.after) return;
    if (this.overloadCd === null) {
      // 처음엔 예고하고 3초 뒤에
      this.overloadCd = 3;
      this.banner(tr('{warn} 제출 마감 임박! 접속자 폭주 중…', '{warn} Deadline rush! Server traffic spiking…'));
    }
    this.overloadCd -= dt;
    if (this.overloadCd > 0) return;
    this.overloadCd = o.every;
    for (const a of this.alive('ally')) {
      a.stunT = Math.max(a.stunT, o.dur);
      a.attacking = false;
      a.swing = 0;
    }
    this.fx.push({ kind: 'stomp', x: f.x, y: GROUND_Y, t: 0, life: 0.8, r: 420, color: '#1565c0' });
    this.fx.push({ kind: 'text', x: f.x, y: GROUND_Y - 170, t: 0, life: 1.2, text: tr('503 Service Unavailable', '503 Service Unavailable'), color: '#90caf9' });
    this.emit({ type: 'rage', x: f.x });
    this.banner(tr('{dizzy} 접속 폭주! 아군 전원 응답 없음', '{dizzy} Server Overload! All allies frozen'));
  }

  /** 외전 5 보스 자동 리뷰: 반경 안 아군의 능력을 막고 (보호막도 벗긴다) 피해를 준다 */
  private tickSilence(f: Fighter, sp: { every: number; radius: number; dur: number; dmg: number }, dt: number): void {
    f.skillCd -= dt;
    if (f.skillCd > 0) return;
    const hit = this.alive('ally').filter((o) => Math.abs(o.x - f.x) <= sp.radius + bodyR(o));
    if (!hit.length) return;
    f.skillCd = sp.every;
    for (const o of hit) {
      o.silenceT = Math.max(o.silenceT, sp.dur);
      o.shield = 0;
      this.fx.push({ kind: 'zap', x: o.x, y: this.fy(o) - 20, t: 0, life: 0.5, color: '#00e5ff' });
      this.damageFighter(o, sp.dmg, 'enemy');
    }
    this.fx.push({ kind: 'stomp', x: f.x, y: GROUND_Y, t: 0, life: 0.7, r: sp.radius, color: '#00e5ff' });
    this.fx.push({ kind: 'text', x: f.x, y: GROUND_Y - 170, t: 0, life: 1.2, text: tr('{mute} 리뷰: 기여도 불분명', '{mute} Review: unclear contribution'), color: '#80deea' });
    this.emit({ type: 'stomp', x: f.x, r: sp.radius });
  }

  /** 외전 5 생성형 복제: 최근 소환 중 하나를 골라 적 편에 약하게 복제한다 */
  private tickCopy(): void {
    const cp = this.stage.mods?.copy;
    if (!cp || this.t < this.nextCopy) return;
    this.nextCopy += cp.every;
    if (!this.recentSummons.length) return;
    const id = this.recentSummons[Math.floor(this.rng() * this.recentSummons.length)]!;
    this.spawnCopy(id, cp.mul);
  }

  /** 아군 유닛 unitId를 능력치 ×mul로 적 편에 만든다 (소환 수만큼). 만든 복제본을 돌려준다. */
  spawnCopy(unitId: string, mul: number): Fighter[] {
    const entry = this.loadout.deck.find((d) => d.def.id === unitId);
    if (!entry) return [];
    const st = entry.stats;
    const stats: CombatStats = {
      ...st,
      hp: Math.max(1, Math.round(st.hp * mul)),
      atk: st.atk * mul,
      heal: st.heal && { ...st.heal, amount: st.heal.amount * mul },
      healZone: st.healZone && { ...st.healZone, hps: st.healZone.hps * mul },
      shield: st.shield && { ...st.shield, amount: st.shield.amount * mul },
      fieldStrike: st.fieldStrike && { ...st.fieldStrike, dmg: st.fieldStrike.dmg * mul },
      deathBurst: st.deathBurst && { ...st.deathBurst, dmg: st.deathBurst.dmg * mul },
      burn: st.burn && { ...st.burn, dps: st.burn.dps * mul },
      turret: st.turret && { ...st.turret, hp: Math.round(st.turret.hp * mul), atk: st.turret.atk * mul },
      // 플레이어에게만 의미 있는 능력은 빼고, 부활은 복제하지 않는다
      caffeineGen: undefined, blipGuard: undefined, revive: undefined,
    };
    const reward = Math.round(entry.def.cost * 0.15 * KILL_REWARD_MUL * (this.stage.killMul ?? 1));
    const out: Fighter[] = [];
    for (let i = 0; i < (entry.def.count ?? 1); i++) {
      if (this.alive('enemy').length >= MAX_ENEMIES) break;
      const name = tr(`복제된 ${entry.def.names[entry.tier - 1]}`, `Copied ${entry.def.names[entry.tier - 1]}`);
      const f = this.addFighter('enemy', entry.def.id, name, entry.def.look, entry.tier, stats, ENEMY_FRONT + 20 + i * 14, reward);
      f.copy = true;
      f.depth = i * 10 + this.rng() * 6;
      out.push(f);
    }
    if (out.length) {
      this.fx.push({ kind: 'spawn', x: ENEMY_FRONT + 10, y: GROUND_Y, t: 0, life: 0.4 });
      this.banner(tr(`{robot} 생성형 복제: ${out[0]!.name}!`, `{robot} Generative Copy: ${out[0]!.name}!`));
      this.emit({ type: 'copy', unitId });
    }
    return out;
  }

  /** 외전 7 순간 정전 간격: 메인 차단기 HP가 줄수록 짧아진다 */
  blipEvery(): number {
    const base = this.stage.mods?.blip?.every ?? Infinity;
    for (const f of this.fighters) {
      const bf = !f.dead && f.isBoss ? ENEMY_BY_ID[f.defId]?.boss?.blipFaster : undefined;
      if (!bf) continue;
      const r = f.hp / f.maxHp;
      let e = base;
      bf.at.forEach((a, i) => { if (r <= a) e = Math.min(e, bf.every[i]!); });
      return e;
    }
    return base;
  }

  private tickBlip(dt: number): void {
    const bl = this.stage.mods?.blip;
    if (!bl) return;
    this.blipT = Math.max(0, this.blipT - dt);
    // 간격이 짧아졌으면 (경고 전이라면) 다음 정전을 당긴다
    const due = this.lastBlip + this.blipEvery();
    if (!this.blipWarned && due < this.nextBlip) this.nextBlip = Math.max(this.t + bl.warn, due);
    if (!this.blipWarned && this.t >= this.nextBlip - bl.warn) {
      this.blipWarned = true;
      this.banner(tr('{warn} 전력 불안정! 곧 정전돼요', '{warn} Power unstable! Blackout incoming'));
      this.emit({ type: 'blipWarn' });
    }
    if (this.t < this.nextBlip) return;
    this.powerBlip(bl);
    this.lastBlip = this.t;
    this.nextBlip = this.t + this.blipEvery();
    this.blipWarned = false;
  }

  /** 아군이 UPS 비상 전원 반경 안에 있는지 */
  private guarded(o: Fighter, guards: Fighter[]): boolean {
    return guards.some((g) => Math.abs(g.x - o.x) <= g.stats.blipGuard!);
  }

  /** 순간 정전: UPS 주변이 아닌 아군은 기절하고, 각자 vanish 확률로 사라진다 (보상 없음) */
  private powerBlip(bl: { stun: number; vanish: number }): void {
    const allies = this.alive('ally');
    const guards = allies.filter((g) => g.stats.blipGuard);
    let lost = 0;
    for (const o of allies) {
      if (this.guarded(o, guards)) continue;
      o.stunT = Math.max(o.stunT, bl.stun);
      o.attacking = false;
      o.swing = 0;
      if (this.rng() < bl.vanish) {
        o.dead = true;
        o.hp = 0;
        lost++;
        this.fx.push({ kind: 'poof', x: o.x, y: this.fy(o) - 16, t: 0, life: 0.5 });
        this.fx.push({ kind: 'text', x: o.x, y: this.fy(o) - 70, t: 0, life: 1.3, text: tr('{warn} 저장 안 한 데이터가 날아갔다!', '{warn} Unsaved data lost!'), color: '#ffab40' });
      }
    }
    this.vanished += lost;
    this.blipT = bl.stun;
    this.emit({ type: 'blip', vanished: lost });
    this.banner(tr('{bolt} 순간 정전!', '{bolt} Power Blip!'));
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
      shredT: 0, shredMul: 1, airT: 0, airDur: 0, fieldCd: stats.stunField ? stats.stunField.every * 0.5 : 0,
      growMul: 1, baseMaxHp: stats.hp, baseScale: look.scale ?? 1, respawned: false, splitChild: false,
      silenceT: 0, skillCd: 0, copy: false,
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
    const auras = this.fighters.filter((f) => !f.dead && f.stats.aura && f.silenceT <= 0);
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
    let rule = 1;
    for (const r of this.rules) if (r.speed) rule *= r.speed(this, f);
    return (this.freezeT > 0 ? 0.5 : 1) * this.enemyFrenzy() * this.countdownMul * slow * rule;
  }

  private atkRateMul(f: Fighter): number {
    const slow = f.slowT > 0 ? f.slowMul : 1;
    if (f.side === 'ally') return (this.hasteT > 0 ? 1.4 : 1) * slow;
    return (this.freezeT > 0 ? 0.5 : 1) * this.enemyFrenzy() * this.countdownMul * slow;
  }

  /** 맞힌 적에게 거는 상태 이상만 골라낸다 (없으면 undefined) */
  private hitEffects(s: CombatStats): HitEffects | undefined {
    return s.burn || s.slow || s.freeze || s.armorShred || s.knockup
      ? { burn: s.burn, slow: s.slow, freeze: s.freeze, armorShred: s.armorShred, knockup: s.knockup }
      : undefined;
  }

  /** 화상·둔화·빙결·방어 깎기·띄우기 걸기. 빙결·띄우기 확률만 전투 난수를 쓴다. */
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
    if (e.freeze && !f.outpost && this.rng() < e.freeze.chance) {
      const d = e.freeze.dur * (f.isBoss ? 0.4 : 1);
      f.stunT = Math.max(f.stunT, d);
      f.frozenT = Math.max(f.frozenT, d);
      f.attacking = false;
      f.swing = 0;
    }
    if (e.armorShred) {
      f.shredMul = f.shredT > 0 ? Math.max(f.shredMul, e.armorShred.mul) : e.armorShred.mul;
      f.shredT = Math.max(f.shredT, e.armorShred.dur);
    }
    // 띄우기: 보스는 면역 (확률도 굴리지 않는다)
    if (e.knockup && !f.isBoss && !f.outpost && this.rng() < e.knockup.chance) {
      f.stunT = Math.max(f.stunT, e.knockup.dur);
      if (f.airT <= 0) f.airDur = e.knockup.dur;
      f.airT = Math.max(f.airT, e.knockup.dur);
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
    f.shredT = Math.max(0, f.shredT - dt);
    f.airT = Math.max(0, f.airT - dt);
    // 자동 리뷰 AI에게 능력이 막힌 동안은 회복 구역·보호막이 멈춘다
    const silenced = f.silenceT > 0;
    f.silenceT = Math.max(0, f.silenceT - dt);
    if (s.grow && f.growMul < s.grow.max) {
      // 메모리 누수: 최대 HP가 늘어난 만큼 HP도 차고 몸도 커진다
      f.growMul = Math.min(s.grow.max, f.growMul + s.grow.rate * dt);
      const max = f.baseMaxHp * f.growMul;
      f.hp += max - f.maxHp;
      f.maxHp = max;
      f.look = { ...f.look, scale: f.baseScale * (1 + (f.growMul - 1) * 0.45) };
    }
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
    if (s.healZone && !silenced) {
      const pulse = Math.floor(this.t) !== Math.floor(this.t - dt);
      for (const o of this.alive(f.side)) {
        if (Math.abs(o.x - f.x) > s.healZone.radius || o.hp >= o.maxHp) continue;
        o.hp = Math.min(o.maxHp, o.hp + s.healZone.hps * dt);
        if (pulse) this.fx.push({ kind: 'heal', x: o.x, y: this.fy(o) - 34, t: 0, life: 0.7 });
      }
    }
    if (s.shield && !silenced) {
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

  /** 3D 프린터 등: 제자리에서 쏘는 포탑을 세운다 (speed가 있으면 라우터의 패킷처럼 걸어가는 졸개) */
  private tickTurret(f: Fighter, dt: number): void {
    const spec = f.stats.turret!;
    f.turretCd -= dt;
    if (f.turretCd > 0) return;
    const mine = this.fighters.filter((o) => !o.dead && o.ownerUid === f.uid).length;
    if (mine >= spec.max) return;
    f.turretCd = spec.every;
    const walker = (spec.speed ?? 0) > 0;
    const stats: CombatStats = { hp: spec.hp, atk: spec.atk, range: spec.range, speed: spec.speed ?? 0, interval: spec.interval };
    const name = walker ? tr('패킷', 'Packet') : tr('포탑', 'Turret');
    const t = this.addFighter(f.side, `${f.defId}:turret`, name, spec.look, f.tier, stats, f.x + (walker ? 10 : -8) * (f.side === 'ally' ? 1 : -1), 0);
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

  /** 블루스크린·EMP: 주기마다 반경 안 상대를 잠깐 기절시킨다 (상대가 없으면 기다린다) */
  private tickStunField(f: Fighter, dt: number): void {
    const sf = f.stats.stunField!;
    f.fieldCd -= dt;
    if (f.fieldCd > 0) return;
    const foes = this.alive(f.side === 'ally' ? 'enemy' : 'ally').filter((o) => Math.abs(o.x - f.x) <= sf.radius + bodyR(o));
    if (!foes.length) return;
    f.fieldCd = sf.every;
    for (const o of foes) {
      const d = sf.dur * (o.isBoss ? 0.4 : 1);
      o.stunT = Math.max(o.stunT, d);
      o.attacking = false;
      o.swing = 0;
    }
    this.fx.push({ kind: 'stomp', x: f.x, y: GROUND_Y, t: 0, life: 0.6, r: sf.radius, color: f.side === 'ally' ? '#40c4ff' : '#2979ff' });
    this.fx.push({ kind: 'text', x: f.x, y: this.fy(f) - 80, t: 0, life: 1, text: f.side === 'ally' ? tr('{bolt} 펄스!', '{bolt} Pulse!') : tr('{dizzy} 멈춤!', '{dizzy} Halted!'), color: '#82b1ff' });
    this.emit({ type: 'stomp', x: f.x, r: sf.radius });
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
    if (f.outpost) return this.tickOutpost(f, dt);
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

    const silenced = f.silenceT > 0;
    if (s.stunField && !silenced) this.tickStunField(f, dt);

    if (s.heal && !silenced) {
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
    if (s.turret && !silenced) this.tickTurret(f, dt);
    if (s.fieldStrike && !silenced) this.tickStrike(f, dt);

    const target = this.findTarget(f);
    const hitBase = !target && this.baseInRange(f);
    // 과목 규칙(라운드 로빈·무임승차): 공격하지 않는 차례면 앞을 막아 서기만 한다
    if ((target || hitBase) && this.rules.some((r) => r.canAttack && !r.canAttack(this, f))) {
      f.attacking = false;
      return;
    }
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
      else {
        this.hitFrom(f, target, atk, f.side, s.knockback, true, this.hitEffects(s));
        this.chainFrom(f, target, atk);
      }
    } else {
      const bx = f.side === 'ally' ? ENEMY_FRONT + 20 : ALLY_FRONT - 20;
      if (ranged) this.shoot(f, atk, bx, GROUND_Y - 80, null, true);
      else {
        this.damageBase(f.side === 'ally' ? this.enemy : this.ally, atk * (s.buildingMul ?? 1), f.x + (f.side === 'ally' ? 16 : -16));
        this.drainCaffeine(f);
      }
    }
  }

  private tickBoss(f: Fighter, b: NonNullable<typeof ENEMY_BY_ID[string]['boss']>, dt: number): void {
    if (b.summon && this.meetingT <= 0) {
      f.summonCd -= dt;
      if (f.summonCd <= 0) {
        f.summonCd = b.summon.every;
        for (let i = 0; i < b.summon.count; i++) this.spawnEnemy(b.summon.id, false, f.x + 20 + i * 12);
        this.fx.push({ kind: 'text', x: f.x, y: GROUND_Y - 150, t: 0, life: 1, text: b.say ? tr(b.say[0], b.say[1]) : tr('이것 좀 해와!', 'Do this for me!'), color: '#fff' });
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
    if (b.overload) this.tickOverload(f, b.overload, dt);
    if (b.silence) this.tickSilence(f, b.silence, dt);
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
      src: f,
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
    // 프린터는 강화 단계마다 외형과 투사체가 바뀐다 (피해량은 그대로, 복합기만 작은 범위 피해)
    const tier = this.loadout.printerTier ?? 1;
    const shot: ProjectileKind = ally ? (tier === 3 ? 'scan' : tier === 2 ? 'toner' : 'ink') : 'laser';
    this.emit({ type: 'shoot', kind: shot, x: x0, side: b.side, tower: true });
    this.projectiles.push({
      kind: shot, side: b.side, x0, y0: GROUND_Y - 250, x1: best.x, y1: this.fy(best) - 18,
      t: 0, dur: (ally && tier === 2 ? 0.05 : 0.1) + bestD / (ally && tier === 2 ? 1300 : 900), dmg: ally ? this.loadout.printerAtk * this.cardMods.printerAtk : this.towerDmg(),
      splash: ally && tier === 3 ? 40 : 0, buildingMul: 1, targetUid: best.uid, hitsBase: false, arc: 0,
      power: ally ? undefined : this.laserTier,
    });
  }

  // ───────────── 무한 모드: 화이트보드 전초기지·교수님 레이저 강화 ─────────────

  /** 교수님 레이저 한 발 피해: 무한 모드는 전투 1분마다 +towerRamp배 (전투 시간 기준, 결정적) */
  towerDmg(): number {
    return this.stage.towerAtk * (1 + (this.stage.towerRamp ?? 0) * (this.t / 60));
  }

  /** 살아 있는 화이트보드 전초기지 */
  outposts(): Fighter[] {
    return this.fighters.filter((f) => f.outpost && !f.dead);
  }

  /** 무한 모드 규칙: 전초기지 세우기·철거 연출, 레이저 출력 단계 */
  private tickEndless(): void {
    if (!this.outpostsPlaced) {
      this.outpostsPlaced = true;
      for (const o of this.stage.outposts ?? []) this.placeOutpost(o);
    }
    for (const f of this.fighters) {
      if (!f.outpost) continue;
      // 제자리 구조물: 기절·빙결·띄우기·넉백이 남지 않는다
      f.stunT = f.frozenT = f.airT = f.kbT = f.kbV = 0;
      if (f.dead && !this.outpostsDown.has(f.uid)) {
        this.outpostsDown.add(f.uid);
        this.outpostDown(f);
      }
    }
    if (this.stage.towerRamp) {
      const tier = Math.min(3, Math.floor(this.t / 60));
      if (tier > this.laserTier) {
        this.laserTier = tier;
        this.banner(tr('{anger} 교수님 레이저 출력 상승!', '{anger} Laser power rising!'));
      }
    }
  }

  private placeOutpost(o: NonNullable<StageDef['outposts']>[number]): void {
    const def = ENEMY_BY_ID.whiteboard!;
    const stats: CombatStats = { hp: o.hp, atk: o.atk, range: o.range, speed: 0, interval: o.interval, splash: o.splash };
    const f = this.addFighter('enemy', def.id, def.name, def.look, 1, stats, ENEMY_FRONT - o.dist, o.reward);
    f.outpost = true;
    f.depth = 4;
    f.cd = o.interval * 0.5;
  }

  /** 전초기지: 제자리에서 가장 가까운 지상 아군 발밑에 보드마커를 포물선으로 던진다 (작은 범위 피해) */
  private tickOutpost(f: Fighter, dt: number): void {
    const s = f.stats;
    f.hitFlash = Math.max(0, f.hitFlash - dt);
    f.swing = Math.max(0, f.swing - dt * 3);
    // 둔화·에어컨은 던지는 속도를 늦춘다
    f.cd -= dt * this.atkRateMul(f);
    let target: Fighter | null = null;
    let bestD = Infinity;
    for (const o of this.fighters) {
      if (o.dead || o.side !== 'ally' || o.stats.flying) continue;
      const d = f.x - o.x;
      if (d < -12 || d > s.range + bodyR(o)) continue;
      if (d < bestD) {
        bestD = d;
        target = o;
      }
    }
    f.attacking = !!target;
    if (!target || f.cd > 0) return;
    f.cd = s.interval;
    f.swing = 1;
    const dist = Math.abs(target.x - f.x);
    const y0 = this.fy(f) - 80;
    this.emit({ type: 'shoot', kind: 'marker', x: f.x, side: 'enemy', tower: false });
    // 땅을 노린다: 던진 순간의 발밑으로 떨어지므로 그새 움직이면 피할 수 있다
    this.projectiles.push({
      kind: 'marker', side: 'enemy', x0: f.x - 8, y0, x1: target.x, y1: this.fy(target) - 4,
      t: 0, dur: 0.35 + dist / 500, dmg: s.atk * f.auraMul * this.cardMods.enemyAtk, splash: s.splash ?? 0, buildingMul: 0,
      targetUid: null, hitsBase: false, arc: 50 + dist * 0.3, src: f,
    });
  }

  /** 철거: 배너, 흩어지는 보드마커와 파편 (보상은 일반 처치처럼 damageFighter가 준다) */
  private outpostDown(f: Fighter): void {
    const y = this.fy(f) - 50;
    for (let i = 0; i < 7; i++) {
      const dx = (i - 3) * 26 + (i % 2 ? 9 : -9);
      this.projectiles.push({
        kind: 'marker', side: 'enemy', x0: f.x, y0: y, x1: f.x + dx, y1: GROUND_Y + (i % 3) * 5,
        t: 0, dur: 0.45 + i * 0.04, dmg: 0, splash: 0, buildingMul: 0, targetUid: null, hitsBase: false, arc: 40 + (i % 3) * 22,
      });
    }
    this.fx.push({ kind: 'boom', x: f.x, y, t: 0, life: 0.6, r: 70, color: '#90caf9' });
    this.emit({ type: 'boom', x: f.x, y, r: 70, side: 'enemy', big: true });
    this.banner(tr('{megaphone} 화이트보드 철거!', '{megaphone} Whiteboard down!'));
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
        if (d >= -12 && d <= end + bodyR(o)) this.hitFrom(p.src, o, p.dmg, p.side, p.knockback, false, p.hit);
      }
      if (p.hitsBase) this.damageBase(p.side === 'ally' ? this.enemy : this.ally, p.dmg * p.buildingMul, p.x1);
      return;
    }
    if (p.hitsBase) {
      this.damageBase(p.side === 'ally' ? this.enemy : this.ally, p.dmg * p.buildingMul, p.x1);
      if (p.src) this.drainCaffeine(p.src);
      return;
    }
    if (p.splash > 0) {
      for (const o of this.alive(foe)) {
        const dy = Math.abs(this.fy(o) - p.y1);
        if (Math.abs(o.x - p.x1) <= p.splash + bodyR(o) && dy < 170) this.hitFrom(p.src, o, p.dmg, p.side, p.knockback, false, p.hit);
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
    if (tgt) {
      this.hitFrom(p.src, tgt, p.dmg, p.side, p.knockback, false, p.hit);
      if (p.src) this.chainFrom(p.src, tgt, p.dmg);
    }
  }

  /**
   * 유닛이 직접 준 피해: 대공 배율을 곱하고, 흡혈·카페인 흡수를 처리한다.
   * (화상 틱·폭발·연산 타격처럼 주인이 없는 피해는 damageFighter를 바로 부른다)
   */
  private hitFrom(src: Fighter | undefined, o: Fighter, dmg: number, side: Side, kb?: { chance: number; dist: number }, melee = false, eff?: HitEffects): void {
    const s = src?.stats;
    if (s?.airMul && o.stats.flying) dmg *= s.airMul;
    for (const r of this.rules) if (r.damage) dmg = r.damage(this, o, dmg, src, melee);
    const dealt = this.damageFighter(o, dmg, side, kb, melee, eff);
    if (src && s?.lifesteal && dealt > 0 && !src.dead && src.hp < src.maxHp) {
      src.hp = Math.min(src.maxHp, src.hp + dealt * s.lifesteal);
      if (this.rng() < 0.35) this.fx.push({ kind: 'heal', x: src.x, y: this.fy(src) - 34, t: 0, life: 0.6 });
    }
    if (src) this.drainCaffeine(src);
  }

  /** 정전: 맞힐 때마다 상대 연구실의 카페인을 빼앗는다 (지금은 적 → 플레이어만 의미가 있다) */
  private drainCaffeine(src: Fighter): void {
    const n = src.stats.caffeineDrain;
    if (!n || src.side !== 'enemy' || this.caffeine <= 0) return;
    this.caffeine = Math.max(0, this.caffeine - n);
    this.fx.push({ kind: 'text', x: src.x, y: this.fy(src) - 70, t: 0, life: 0.7, text: `-${n}{coffee}`, color: '#b388ff' });
  }

  /** 테슬라 코일 등: 맞힌 적에서 가까운 다른 적으로 번개가 튄다 */
  private chainFrom(src: Fighter, first: Fighter, dmg: number): void {
    const c = src.stats.chain;
    if (!c) return;
    const foe: Side = src.side === 'ally' ? 'enemy' : 'ally';
    const hit = new Set<number>([first.uid]);
    const eff = this.hitEffects(src.stats);
    let from = first;
    for (let j = 0; j < c.jumps; j++) {
      dmg *= c.falloff;
      let next: Fighter | null = null;
      let best = Infinity;
      for (const o of this.alive(foe)) {
        if (hit.has(o.uid) || !this.canHit(src.stats, o)) continue;
        const d = Math.abs(o.x - from.x);
        if (d <= c.range && d < best) {
          best = d;
          next = o;
        }
      }
      if (!next) break;
      hit.add(next.uid);
      this.fx.push({ kind: 'arc', x: from.x, y: this.fy(from) - 22, x2: next.x, y2: this.fy(next) - 22, t: 0, life: 0.3, color: src.stats.freeze ? '#b388ff' : '#80d8ff' });
      this.hitFrom(src, next, dmg, src.side, undefined, false, eff);
      from = next;
    }
  }

  /** 피해를 주고 실제로 깎인 HP를 돌려준다 (보호막이 막은 만큼은 빼고) */
  private damageFighter(f: Fighter, dmg: number, from: Side, kb?: { chance: number; dist: number }, melee = false, eff?: HitEffects, burn = false): number {
    if (f.dead) return 0;
    // 학회 뒤풀이: 아군 무적
    if (f.side === 'ally' && this.invulnT > 0) return 0;
    // 방어 깎기: 받는 피해가 늘어난다
    if (f.shredT > 0) dmg *= f.shredMul;
    // 보호막이 먼저 막는다
    if (f.shield > 0) {
      const absorbed = Math.min(f.shield, dmg);
      f.shield -= absorbed;
      dmg -= absorbed;
      if (dmg <= 0) {
        f.hitFlash = 0.06;
        if (eff) this.applyHit(f, eff);
        return 0;
      }
    }
    const dealt = Math.min(dmg, Math.max(0, f.hp));
    this.emit({ type: 'hit', x: f.x, y: this.fy(f) - 20 * (f.look.scale ?? 1), dmg, melee, to: f.side });
    if (kb && !f.isBoss && f.hp > dmg && this.rng() < kb.chance) this.knockback(f, kb.dist);
    f.hp -= dmg;
    f.hitFlash = 0.12;
    if (f.isBoss && f.hp > 0) this.checkRage(f);
    // 피해 숫자: 난수는 늘 같은 순서로 쓰고(재현성), 화면 효과가 너무 많으면 숫자만 생략한다
    const dmgX = f.x + (this.rng() - 0.5) * 16;
    if (this.fx.length < MAX_FX) this.fx.push({ kind: 'dmg', x: dmgX, y: this.fy(f) - 40 - (f.look.scale ?? 1) * 20, t: 0, life: 0.6, text: String(Math.round(dmg)), color: burn ? '#ffab40' : from === 'ally' ? '#fff' : '#ff8a80' });
    if (f.hp > 0 && eff) this.applyHit(f, eff);
    if (f.hp <= 0 && f.stats.revive && !f.revived) {
      // 1회 부활 (재부팅)
      f.revived = true;
      f.hp = Math.max(1, f.maxHp * f.stats.revive.hpRatio);
      f.burnT = 0;
      f.burnAcc = 0;
      this.fx.push({ kind: 'text', x: f.x, y: this.fy(f) - 80, t: 0, life: 1.2, text: tr('{retry} 재부팅!', '{retry} Rebooting!'), color: '#80d8ff' });
      this.emit({ type: 'revive', x: f.x });
      return dealt;
    }
    if (f.hp <= 0 && f.stats.respawn && !f.respawned) {
      // 무한 루프: 보상 없이 출발점으로 돌아가 다시 온다
      f.respawned = true;
      this.fx.push({ kind: 'poof', x: f.x, y: this.fy(f) - 16, t: 0, life: 0.5 });
      f.hp = Math.max(1, f.maxHp * f.stats.respawn.hpRatio);
      f.x = f.side === 'enemy' ? ENEMY_FRONT + 20 : ALLY_FRONT - 20;
      f.burnT = f.burnAcc = f.slowT = f.shredT = f.stunT = f.frozenT = f.airT = f.kbT = 0;
      f.attacking = false;
      f.swing = 0;
      this.fx.push({ kind: 'spawn', x: f.x, y: this.fy(f), t: 0, life: 0.4 });
      this.fx.push({ kind: 'text', x: f.x, y: this.fy(f) - 80, t: 0, life: 1.2, text: tr('{retry} 처음부터 다시!', '{retry} Back to the top!'), color: '#ffab40' });
      this.emit({ type: 'revive', x: f.x });
      return dealt;
    }
    if (f.hp <= 0) {
      f.dead = true;
      f.hp = 0;
      if (f.stats.deathBurst) this.deathBurst(f);
      if (f.stats.split && !f.splitChild) this.splitApart(f);
      for (const r of this.rules) r.died?.(this, f);
      this.fx.push({ kind: 'poof', x: f.x, y: this.fy(f) - 16, t: 0, life: 0.5 });
      this.emit({ type: 'kill', x: f.x, y: this.fy(f) - 16, side: f.side, boss: f.isBoss });
      if (f.side === 'enemy') {
        this.kills++;
        const reward = Math.round(f.reward * this.cardMods.reward);
        this.killReward += reward;
        // 적 세기(기본 처치 보상)에 비례해 카페인을 얻는다
        const caf = f.copy ? Math.max(1, Math.round(f.reward * 0.6)) : Math.max(1, Math.round(killCaffeine(f.defId) * (f.splitChild ? 0.5 : 1)));
        // 멘탈 고갈 외전: 처치하면 멘탈이 조금 돌아온다
        if (this.stage.mods?.drain) this.mental = Math.min(this.loadout.mentalMax, this.mental + 3 + caf * 0.5);
        this.caffeine = Math.min(this.caffeineMax, this.caffeine + caf);
        this.fx.push({ kind: 'text', x: f.x, y: this.fy(f) - 60, t: 0, life: 0.9, text: `+${reward}{coin} +${caf}{coffee}`, color: '#ffd54f' });
      }
    }
    return dealt;
  }

  /** 머지 컨플릭트: 쓰러지면 작은 둘로 갈라진다 (적은 최대 수를 넘지 않는다) */
  private splitApart(f: Fighter): void {
    const sp = f.stats.split!;
    const dir = f.side === 'ally' ? 1 : -1;
    for (let i = 0; i < sp.count; i++) {
      if (f.side === 'enemy' && this.alive('enemy').length >= MAX_ENEMIES) break;
      const stats: CombatStats = { ...f.stats, split: undefined, hp: Math.max(1, Math.round(f.maxHp * sp.hpRatio)), atk: f.stats.atk * sp.scale };
      const look: Look = { ...f.look, scale: (f.look.scale ?? 1) * sp.scale };
      const c = this.addFighter(f.side, f.defId, f.name, look, f.tier, stats, f.x + dir * (i * 22 - 6), Math.round(f.reward * 0.4));
      c.splitChild = true;
      c.depth = f.depth + (i ? 8 : -4);
      c.cd = 0.6;
    }
    this.fx.push({ kind: 'text', x: f.x, y: this.fy(f) - 70, t: 0, life: 1, text: tr('{swords} 충돌!', '{swords} Conflict!'), color: '#ff8a65' });
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
    if (f.isBoss || f.outpost) return;
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
    for (const r of this.rules) r.baseHit?.(this, b.side);
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

  // ───────────── 과목 규칙이 쓰는 도구 (src/sim/course-rules.ts) ─────────────

  /** 전투 난수 (같은 씨앗이면 같은 결과) */
  ruleRand(): number {
    return this.rng();
  }

  /** 출현 후보에서 적 하나를 고른다 */
  rulePick(): string {
    return this.pickEnemy();
  }

  ruleSpawn(id: string, x = ENEMY_FRONT + 20): Fighter | null {
    return this.spawnEnemy(id, false, x);
  }

  ruleBanner(text: string): void {
    this.banner(text);
  }

  ruleText(f: Fighter, text: string, color: string): void {
    if (this.fx.length < MAX_FX) this.fx.push({ kind: 'text', x: f.x, y: this.fy(f) - 70, t: 0, life: 1, text, color });
  }

  /** 보상 없이 조용히 없앤다 (압축으로 합쳐질 때) */
  ruleRemove(f: Fighter): void {
    f.dead = true;
    f.hp = 0;
    f.deathT = 1;
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
    case 'logic':
    case 'siggen':
    case 'dish':
      return 'pulse';
    case 'debugger': return 'dot';
    case 'tesla': return 'spark';
    case 'tower':
    case 'accelerator':
      return 'beam';
    case 'reflow': return 'solder';
    case 'fiber': return 'photon';
    case 'quantum': return 'qubit';
    case 'npu':
    case 'pi':
    case 'router':
      return 'code';
    default: return 'bolt';
  }
}
