import { tr } from '../i18n';
import { RANGED_THRESHOLD } from '../data/types';
import { ALLY_FRONT, ENEMY_FRONT, WORLD_W, type Battle, type Fighter } from './battle';

/**
 * 전공 과목 규칙: 과목의 핵심 개념이 곧 전투 규칙이다.
 * 과목 스테이지는 아래 규칙 조각을 몇 개 골라 쓰고, 전투(battle.ts)는 정해진 지점에서 훅을 부른다.
 * 과목 규칙이 없는 스테이지에는 아무 영향이 없다 (기존 전투·테스트 그대로).
 *
 * 난수는 꼭 b.ruleRand()만 쓴다 (같은 씨앗이면 같은 전투).
 */
export type RuleSpec =
  /** 스택: 새 적이 적 줄 맨 앞(아군 쪽)에 나온다 — 마지막에 들어온 것이 먼저 나온다 */
  | { kind: 'lifo' }
  /** 큐: 맨 앞 적 말고는 피해를 거의 받지 않는다 (×rest) */
  | { kind: 'queue'; rest: number }
  /** 캐시: 직전과 같은 유닛을 다시 뽑으면 비용 ×(1-off) */
  | { kind: 'cache'; off: number }
  /** 파이프라인: 적은 앞 적을 추월하지 못한다. 맨 앞이 막히면 줄 전체가 선다 */
  | { kind: 'pipeline'; gap: number }
  /** Big-O: 보스 공격력 ×(1 + k·n²), n = 살아 있는 일반 적 수 */
  | { kind: 'bigO'; k: number }
  /** 과적합: 많이 쓴 공격 종류(근접·원거리)에 적이 점점 강해진다 (최대 피해 −max) */
  | { kind: 'overfit'; max: number }
  /** 드롭아웃: every초마다 아군 각각 p 확률로 dur초 쉰다 */
  | { kind: 'dropout'; every: number; p: number; dur: number }
  /** 지연: 소환한 유닛이 delay초 늦게 움직인다 */
  | { kind: 'latency'; delay: number }
  /** 충돌(CSMA/CD): window초 안에 두 번 소환하면 둘 다 stun초 멈춘다 */
  | { kind: 'collision'; window: number; stun: number }
  /** 저역통과 필터: 빠른 적은 cutoff 속도로 깎인다 */
  | { kind: 'lowpass'; cutoff: number }
  /** 잡음: 아군 원거리 공격이 p 확률로 빗나간다 (amp만큼 period초 주기로 출렁) */
  | { kind: 'noise'; p: number; amp?: number; period?: number }
  /** 암호화: 적이 최대 HP×ratio 보호막을 두르고 나온다 */
  | { kind: 'encrypt'; ratio: number }
  /** 압축: every초마다 가까이 붙은 일반 적 둘이 하나로 합쳐진다 */
  | { kind: 'compress'; every: number }
  /** 라운드 로빈: 편성을 slices 묶음으로 나눠 quantum초마다 한 묶음만 공격한다 */
  | { kind: 'roundRobin'; slices: number; quantum: number }
  /** 트랜잭션: 같이 나온 size마리 중 하나가 쓰러진 뒤 timeout초 안에 다 못 잡으면 쓰러진 적이 되살아난다 */
  | { kind: 'rollback'; size: number; timeout: number }
  /** 전치: every초마다 적 줄의 앞뒤가 뒤집힌다 */
  | { kind: 'transpose'; every: number }
  /** 주사위: 모든 피해가 ×(1±spread) 무작위 */
  | { kind: 'dice'; spread: number }
  /** 포아송 도착: 초마다 rate 확률로 적 size마리가 한꺼번에 */
  | { kind: 'poisson'; rate: number; size: number }
  /** 허수: 적이 p 확률로 하늘(허수축)에 나온다 */
  | { kind: 'imaginary'; p: number }
  /** 상속: 적이 쓰러지면 hpRatio 체력의 작은 자식이 하나 나온다 */
  | { kind: 'inherit'; hpRatio: number }
  /** CORS: 적이 화면 x비율 line보다 멀리 있으면 아군 원거리 공격이 막힌다 */
  | { kind: 'cors'; line: number }
  /** 저전력: 최대 카페인 ×cap, 충전 ×regen */
  | { kind: 'lowPower'; cap: number; regen: number }
  /** 무임승차: 소환한 유닛이 p 확률로 공격하지 않는다 (막아 서기는 함) */
  | { kind: 'freeRider'; p: number }
  /** 요구사항 추가: 교수실 체력이 분당 perMin 비율씩 늘어난다 */
  | { kind: 'scopeCreep'; perMin: number }
  /** 학습: 적이 연구실을 때릴 때마다 적 이동 속도 +per (최대 max) */
  | { kind: 'learn'; per: number; max: number }
  /** DDoS: every초마다 id 적 size마리가 몰려온다 */
  | { kind: 'ddos'; every: number; size: number; id: string }
  /** 몬테카를로: 적 체력·공격력이 나올 때마다 ×(1±spread) */
  | { kind: 'montecarlo'; spread: number }
  /** 비트 오류: 아군 피해가 p 확률로 0 또는 2배 */
  | { kind: 'bitError'; p: number }
  /** 기울기 소실: 아군 원거리 피해가 거리 fade마다 줄어든다 (최저 min) */
  | { kind: 'vanishing'; fade: number; min: number }
  /** 홉: every초마다 적 하나가 hop만큼 앞으로 건너뛴다 */
  | { kind: 'hop'; every: number; hop: number }
  /** 인터럽트: every초마다 아군 전원 dur초 멈추고 카페인 +gain */
  | { kind: 'interrupt'; every: number; dur: number; gain: number }
  /** 배터리: 카페인 충전이 시간이 갈수록 줄어 to배까지 (time초에 걸쳐) */
  | { kind: 'battery'; to: number; time: number }
  /** 가비지 컬렉션: every초마다 모든 전투원이 dur초 멈춘다 (적도 같이) */
  | { kind: 'gc'; every: number; dur: number }
  /** 데드락: every초마다 가까이 붙은 적 둘이 서로를 기다리며 dur초 멈춘다(대신 그동안 받는 피해 ×mul) */
  | { kind: 'deadlock'; every: number; dur: number; mul: number }
  /** 인덱스: 체력 비율이 가장 낮은 적이 피해 ×mul (아군이 정렬된 목록에서 찾아 때린다) */
  | { kind: 'index'; mul: number }
  /** 클라우드: 화면에 없는(카메라 밖은 아님) 먼 적은 피해 ×far — 서버가 멀다 */
  | { kind: 'edge'; near: number; far: number };

/** 화면 연출만 바꾸는 규칙 (시뮬레이션과 무관) */
export type ViewRule =
  /** 샘플링: 적이 일정 간격으로만 또렷이 보인다 */
  | 'strobe'
  /** 윤곽선: 적이 실루엣으로만 보인다 */
  | 'silhouette'
  /** 결측치: 적 체력바 대신 NaN */
  | 'nan';

export interface CourseMods {
  rules: RuleSpec[];
  view?: ViewRule;
}

/** 전투가 부르는 훅. 모두 선택 */
export interface CourseRule {
  step?(b: Battle, dt: number): void;
  enemySpawned?(b: Battle, f: Fighter): void;
  /** 소환 비용 */
  cost?(b: Battle, unitId: string, cost: number): number;
  summoned?(b: Battle, unitId: string, fs: Fighter[]): void;
  /** 맞은 쪽 f가 받을 피해 (src: 때린 쪽, 없을 수 있음) */
  damage?(b: Battle, f: Fighter, dmg: number, src: Fighter | undefined, melee: boolean): number;
  died?(b: Battle, f: Fighter): void;
  speed?(b: Battle, f: Fighter): number;
  /** false면 이번에는 공격하지 않는다 (앞을 막아 서기는 한다) */
  canAttack?(b: Battle, f: Fighter): boolean;
  caffeineMax?(b: Battle): number;
  regen?(b: Battle): number;
  /** 연구실이 맞았을 때 */
  baseHit?(b: Battle, side: 'ally' | 'enemy'): void;
}

const isRanged = (f: Fighter | undefined): boolean => !!f && f.stats.range >= RANGED_THRESHOLD;
const enemies = (b: Battle): Fighter[] => b.fighters.filter((f) => f.side === 'enemy' && !f.dead);
const allies = (b: Battle): Fighter[] => b.fighters.filter((f) => f.side === 'ally' && !f.dead);
/** 맨 앞(아군 연구실에 가장 가까운) 적 */
const frontEnemy = (b: Battle): Fighter | undefined => enemies(b).reduce<Fighter | undefined>((m, f) => (!m || f.x < m.x ? f : m), undefined);
/** 주기마다 한 번: 남은 시간을 줄이다 0 아래가 되면 true */
const timer = (every: number): ((dt: number) => boolean) => {
  let left = every;
  return (dt) => {
    left -= dt;
    if (left > 0) return false;
    left += every;
    return true;
  };
};

/** 과목 규칙 하나를 만든다 (전투마다 새로: 규칙마다 자기 상태를 가진다) */
export function makeRule(r: RuleSpec): CourseRule {
  switch (r.kind) {
    case 'lifo':
      return {
        enemySpawned(b, f) {
          if (f.isBoss) return;
          const front = enemies(b).filter((o) => o !== f && !o.isBoss).reduce((m, o) => Math.min(m, o.x), Infinity);
          if (front < Infinity) f.x = Math.max(ALLY_FRONT + 160, front - 26);
        },
      };
    case 'queue': {
      return {
        damage(b, f, dmg) {
          if (f.side !== 'enemy' || f.isBoss) return dmg;
          return frontEnemy(b) === f ? dmg : dmg * r.rest;
        },
      };
    }
    case 'cache': {
      let last = '';
      return {
        cost: (_b, id, cost) => (id === last ? Math.round(cost * (1 - r.off)) : cost),
        summoned(b, id, fs) {
          if (id === last && fs[0]) b.ruleText(fs[0], tr('{bolt} 캐시 히트!', '{bolt} Cache hit!'), '#80d8ff');
          last = id;
        },
      };
    }
    case 'pipeline':
      return {
        step(b) {
          const line = enemies(b).filter((f) => !f.stats.flying).sort((p, q) => p.x - q.x);
          for (let i = 1; i < line.length; i++) {
            const ahead = line[i - 1]!;
            const f = line[i]!;
            if (f.kbT <= 0 && f.x < ahead.x + r.gap) f.x = ahead.x + r.gap;
          }
        },
      };
    case 'bigO':
      return {
        damage(b, _f, dmg, src) {
          if (!src?.isBoss || src.side !== 'enemy') return dmg;
          const n = Math.min(30, enemies(b).filter((o) => !o.isBoss).length);
          return dmg * (1 + r.k * n * n);
        },
      };
    case 'overfit': {
      const seen = { melee: 1, ranged: 1 };
      return {
        damage(_b, f, dmg, src) {
          if (f.side !== 'enemy' || !src || src.side !== 'ally') return dmg;
          const kind = isRanged(src) ? 'ranged' : 'melee';
          seen[kind] += 1;
          seen.melee *= 0.995;
          seen.ranged *= 0.995;
          const share = seen[kind] / (seen.melee + seen.ranged);
          // 반반이면 그대로, 한쪽만 쓰면 최대 −max
          return dmg * (1 - r.max * Math.max(0, (share - 0.5) / 0.5));
        },
      };
    }
    case 'dropout': {
      const tick = timer(r.every);
      return {
        step(b, dt) {
          if (!tick(dt)) return;
          let n = 0;
          for (const f of allies(b)) {
            if (b.ruleRand() < r.p) {
              f.stunT = Math.max(f.stunT, r.dur);
              n++;
            }
          }
          if (n) b.ruleBanner(tr(`{dizzy} 드롭아웃! 동료 ${n}명이 잠깐 쉬어 가요`, `{dizzy} Dropout! ${n} labmate(s) take a short break`));
        },
      };
    }
    case 'latency':
      return {
        summoned(b, _id, fs) {
          for (const f of fs) f.stunT = Math.max(f.stunT, r.delay);
          if (fs[0]) b.ruleText(fs[0], tr('{hourglass} 지연…', '{hourglass} Lag…'), '#b0bec5');
        },
      };
    case 'collision': {
      let lastT = -Infinity;
      let lastFs: Fighter[] = [];
      return {
        summoned(b, _id, fs) {
          if (b.t - lastT <= r.window) {
            for (const f of [...lastFs, ...fs]) if (!f.dead) f.stunT = Math.max(f.stunT, r.stun);
            if (fs[0]) b.ruleText(fs[0], tr('{warn} 충돌! 잠시 후 재전송', '{warn} Collision! Backing off'), '#ff8a80');
          }
          lastT = b.t;
          lastFs = fs;
        },
      };
    }
    case 'lowpass':
      return { speed: (_b, f) => (f.side === 'enemy' && f.stats.speed > r.cutoff ? r.cutoff / f.stats.speed : 1) };
    case 'noise':
      return {
        damage(b, f, dmg, src) {
          if (f.side !== 'enemy' || src?.side !== 'ally' || !isRanged(src)) return dmg;
          const p = r.p + (r.amp ?? 0) * Math.sin((b.t / (r.period ?? 10)) * Math.PI * 2);
          if (b.ruleRand() < p) {
            if (b.ruleRand() < 0.3) b.ruleText(f, tr('잡음', 'noise'), '#b0bec5');
            return 0;
          }
          return dmg;
        },
      };
    case 'encrypt':
      return {
        enemySpawned(_b, f) {
          if (!f.isBoss) f.shield = Math.max(f.shield, Math.round(f.maxHp * r.ratio));
        },
      };
    case 'compress': {
      const tick = timer(r.every);
      return {
        step(b, dt) {
          if (!tick(dt)) return;
          const es = enemies(b).filter((f) => !f.isBoss && !f.stats.flying).sort((p, q) => p.x - q.x);
          for (let i = 1; i < es.length; i++) {
            const a = es[i - 1]!;
            const c = es[i]!;
            if (c.x - a.x > 40) continue;
            a.maxHp += c.maxHp;
            a.hp += c.hp;
            a.reward += c.reward;
            a.look = { ...a.look, scale: Math.min(2, (a.look.scale ?? 1) * 1.15) };
            b.ruleRemove(c);
            b.ruleText(a, tr('{crate} 압축!', '{crate} Compressed!'), '#ffcc80');
            return;
          }
        },
      };
    }
    case 'roundRobin': {
      let slice = 0;
      const tick = timer(r.quantum);
      return {
        step(b, dt) {
          if (!tick(dt)) return;
          slice = (slice + 1) % r.slices;
          b.ruleBanner(tr(`{clock} 문맥 교환: ${slice + 1}번 묶음 차례`, `{clock} Context switch: group ${slice + 1}'s turn`));
        },
        canAttack(b, f) {
          if (f.side !== 'ally') return true;
          const i = b.loadout.deck.findIndex((d) => d.def.id === f.defId);
          return i < 0 || i % r.slices === slice;
        },
      };
    }
    case 'rollback': {
      let n = 0;
      const group = new Map<number, number>();
      const txns = new Map<number, { left: number; dead: string[]; started: number }>();
      return {
        enemySpawned(_b, f) {
          if (f.isBoss) return;
          group.set(f.uid, Math.floor(n++ / r.size));
        },
        died(b, f) {
          const g = group.get(f.uid);
          if (g === undefined || f.side !== 'enemy') return;
          const t = txns.get(g) ?? { left: r.timeout, dead: [], started: b.t };
          t.dead.push(f.defId);
          txns.set(g, t);
          const alive = enemies(b).some((o) => group.get(o.uid) === g);
          if (!alive && (n > (g + 1) * r.size || t.dead.length >= r.size)) {
            txns.delete(g);
            b.ruleText(f, tr('{check} 커밋!', '{check} Commit!'), '#a5d6a7');
          }
        },
        step(b, dt) {
          for (const [g, t] of txns) {
            t.left -= dt;
            if (t.left > 0) continue;
            txns.delete(g);
            if (!enemies(b).some((o) => group.get(o.uid) === g)) continue;
            for (const id of t.dead) {
              const f = b.ruleSpawn(id);
              if (f) group.set(f.uid, g);
            }
            b.ruleBanner(tr('{retry} 롤백! 쓰러뜨린 적이 되살아났어요', '{retry} Rollback! Defeated enemies are back'));
          }
        },
      };
    }
    case 'transpose': {
      const tick = timer(r.every);
      return {
        step(b, dt) {
          if (!tick(dt)) return;
          const es = enemies(b).filter((f) => !f.isBoss);
          if (es.length < 2) return;
          const lo = Math.min(...es.map((f) => f.x));
          const hi = Math.max(...es.map((f) => f.x));
          for (const f of es) f.x = lo + hi - f.x;
          b.ruleBanner(tr('{retry} 전치! 적 줄의 앞뒤가 뒤집혔어요', '{retry} Transpose! The enemy line flipped'));
        },
      };
    }
    case 'dice':
      return { damage: (b, _f, dmg) => dmg * (1 - r.spread + 2 * r.spread * b.ruleRand()) };
    case 'poisson': {
      const tick = timer(1);
      return {
        step(b, dt) {
          if (!tick(dt) || b.ruleRand() >= r.rate) return;
          for (let i = 0; i < r.size; i++) b.ruleSpawn(b.rulePick(), ENEMY_FRONT + 20 + i * 18);
        },
      };
    }
    case 'imaginary':
      return {
        enemySpawned(b, f) {
          if (f.isBoss || f.stats.flying || b.ruleRand() >= r.p) return;
          f.stats = { ...f.stats, flying: true };
        },
      };
    case 'inherit':
      return {
        died(b, f) {
          if (f.side !== 'enemy' || f.isBoss || f.splitChild) return;
          const c = b.ruleSpawn(f.defId, f.x + 10);
          if (!c) return;
          c.splitChild = true;
          c.hp = c.maxHp = Math.max(1, Math.round(c.maxHp * r.hpRatio));
          c.reward = Math.round(c.reward * 0.3);
          c.look = { ...c.look, scale: (c.look.scale ?? 1) * 0.75 };
          b.ruleText(c, tr('extends', 'extends'), '#ce93d8');
        },
      };
    case 'cors':
      return {
        damage(_b, f, dmg, src) {
          if (f.side !== 'enemy' || src?.side !== 'ally' || !isRanged(src)) return dmg;
          return f.x > WORLD_W * r.line ? 0 : dmg;
        },
      };
    case 'lowPower':
      return { caffeineMax: () => r.cap, regen: () => r.regen };
    case 'freeRider': {
      const riders = new Set<number>();
      return {
        summoned(b, _id, fs) {
          for (const f of fs) {
            if (b.ruleRand() < r.p) {
              riders.add(f.uid);
              b.ruleText(f, tr('(무임승차)', '(free rider)'), '#b0bec5');
            }
          }
        },
        canAttack: (_b, f) => !riders.has(f.uid),
      };
    }
    case 'scopeCreep': {
      const tick = timer(1);
      return {
        step(b, dt) {
          if (!tick(dt)) return;
          const add = Math.round(b.enemy.maxHp * (r.perMin / 60));
          b.enemy.maxHp += add;
          b.enemy.hp += add;
        },
      };
    }
    case 'learn': {
      let mul = 1;
      return {
        baseHit(b, side) {
          if (side !== 'ally' || mul >= 1 + r.max) return;
          mul = Math.min(1 + r.max, mul + r.per);
          if (b.ruleRand() < 0.15) b.ruleBanner(tr('{robot} 잡무가 학습했어요: 더 빨라짐', '{robot} The busywork learned: faster now'));
        },
        speed: (_b, f) => (f.side === 'enemy' ? mul : 1),
      };
    }
    case 'ddos': {
      const tick = timer(r.every);
      return {
        step(b, dt) {
          if (!tick(dt)) return;
          for (let i = 0; i < r.size; i++) b.ruleSpawn(r.id, ENEMY_FRONT + 20 + i * 12);
          b.ruleBanner(tr('{warn} DDoS! 요청이 몰려와요', '{warn} DDoS! Requests flooding in'));
        },
      };
    }
    case 'montecarlo':
      return {
        enemySpawned(b, f) {
          if (f.isBoss) return;
          const m = 1 - r.spread + 2 * r.spread * b.ruleRand();
          f.hp = f.maxHp = Math.max(1, Math.round(f.maxHp * m));
          f.stats = { ...f.stats, atk: f.stats.atk * (1 - r.spread + 2 * r.spread * b.ruleRand()) };
        },
      };
    case 'bitError':
      return {
        damage(b, f, dmg, src) {
          if (f.side !== 'enemy' || src?.side !== 'ally' || b.ruleRand() >= r.p) return dmg;
          return b.ruleRand() < 0.5 ? 0 : dmg * 2;
        },
      };
    case 'vanishing':
      return {
        damage(_b, f, dmg, src) {
          if (f.side !== 'enemy' || src?.side !== 'ally' || !isRanged(src)) return dmg;
          return dmg * Math.max(r.min, 1 - Math.abs(f.x - src.x) / r.fade);
        },
      };
    case 'hop': {
      const tick = timer(r.every);
      return {
        step(b, dt) {
          if (!tick(dt)) return;
          const es = enemies(b).filter((f) => !f.isBoss);
          if (!es.length) return;
          const f = es[Math.floor(b.ruleRand() * es.length)]!;
          f.x = Math.max(ALLY_FRONT + 60, f.x - r.hop);
          b.ruleText(f, tr('{bolt} 홉!', '{bolt} Hop!'), '#80d8ff');
        },
      };
    }
    case 'interrupt': {
      const tick = timer(r.every);
      return {
        step(b, dt) {
          if (!tick(dt)) return;
          for (const f of allies(b)) f.stunT = Math.max(f.stunT, r.dur);
          b.caffeine = Math.min(b.caffeineMax, b.caffeine + r.gain);
          b.ruleBanner(tr(`{bolt} 인터럽트! 동료가 멈추고 카페인 +${r.gain}`, `{bolt} Interrupt! Labmates pause, caffeine +${r.gain}`));
        },
      };
    }
    case 'battery':
      return { regen: (b) => 1 - (1 - r.to) * Math.min(1, b.t / r.time) };
    case 'gc': {
      const tick = timer(r.every);
      return {
        step(b, dt) {
          if (!tick(dt)) return;
          for (const f of b.fighters) if (!f.dead && !f.isBoss) f.stunT = Math.max(f.stunT, r.dur);
          b.ruleBanner(tr('{retry} 가비지 컬렉션! 모두 잠깐 멈춤', '{retry} Garbage collection! Everyone pauses'));
        },
      };
    }
    case 'deadlock': {
      const tick = timer(r.every);
      const locked = new Map<number, number>();
      return {
        step(b, dt) {
          for (const [uid, t] of locked) {
            if (t - dt <= 0) locked.delete(uid);
            else locked.set(uid, t - dt);
          }
          if (!tick(dt)) return;
          const es = enemies(b).filter((f) => !f.isBoss).sort((p, q) => p.x - q.x);
          for (let i = 1; i < es.length; i++) {
            const a = es[i - 1]!;
            const c = es[i]!;
            if (c.x - a.x > 50) continue;
            for (const f of [a, c]) {
              f.stunT = Math.max(f.stunT, r.dur);
              locked.set(f.uid, r.dur);
            }
            b.ruleText(a, tr('{lock} 교착 상태', '{lock} Deadlock'), '#ffab40');
            return;
          }
        },
        damage: (_b, f, dmg) => (locked.has(f.uid) ? dmg * r.mul : dmg),
      };
    }
    case 'index':
      return {
        damage(b, f, dmg, src) {
          if (f.side !== 'enemy' || src?.side !== 'ally') return dmg;
          const low = enemies(b).reduce<Fighter | undefined>((m, o) => (!m || o.hp / o.maxHp < m.hp / m.maxHp ? o : m), undefined);
          return low === f ? dmg * r.mul : dmg;
        },
      };
    case 'edge':
      return {
        damage(_b, f, dmg, src) {
          if (f.side !== 'enemy' || src?.side !== 'ally') return dmg;
          return f.x < WORLD_W / 2 ? dmg * r.near : dmg * r.far;
        },
      };
  }
}

export function makeCourseRules(mods: CourseMods | undefined): CourseRule[] {
  return (mods?.rules ?? []).map(makeRule);
}
