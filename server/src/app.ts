import type { IncomingMessage, ServerResponse } from 'node:http';
import { cleanNickname, hashPassword, newRefreshToken, sha256, signAccess, validateCredentials, verifyAccess, verifyPassword } from './auth.ts';
import type { FeedbackCategory, GiftRow, Store, UserRow } from './db.ts';

export interface Config {
  secret: string;
  allowedOrigins: string[];
  /** 프록시 뒤에서 X-Forwarded-For를 신뢰할지 */
  trustProxy: boolean;
  accessTtlSec: number;
  refreshTtlSec: number;
  maxSaveBytes: number;
  /** 인증 요청 한도: IP당 windowSec 동안 max회 */
  authLimit: { max: number; windowSec: number };
  /** 의견 보내기 한도: 계정(게스트는 IP)당 windowSec 동안 max회 */
  feedbackLimit: { max: number; windowSec: number };
  /** 관리자 아이디 (대소문자 무시) */
  adminUsers: string[];
  now: () => number;
}

export const defaultConfig = (secret: string): Config => ({
  secret,
  allowedOrigins: ['https://apg0001.github.io'],
  trustProxy: false,
  accessTtlSec: 15 * 60,
  refreshTtlSec: 60 * 24 * 3600,
  maxSaveBytes: 64 * 1024,
  authLimit: { max: 10, windowSec: 60 },
  feedbackLimit: { max: 5, windowSec: 10 * 60 },
  adminUsers: ['apg0001'],
  now: () => Date.now(),
});

class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// 비밀번호 확인 시간 차이로 아이디 존재 여부가 드러나지 않게 쓰는 가짜 해시
const DUMMY_HASH = hashPassword('dummy-password-for-timing');

export interface RankRow {
  rank: number;
  /** 닉네임 (없으면 아이디) */
  name: string;
  /** 무한 모드 최고 판 */
  endless: number;
  /** 캠페인 별 합 */
  stars: number;
  /** 클리어한 캠페인 스테이지 수 */
  cleared: number;
  /** 지금 신분 (학부생 ~ 교수) */
  title: string;
  /** 칭호 아이템 id, 대표 캐릭터와 단계·차림 */
  badge: string;
  avatar: string;
  avatarTier: number;
  fit: { hat?: string; color?: string };
}

const FEEDBACK_CATEGORIES: FeedbackCategory[] = ['문의', '건의', '버그'];

/** 선물 한 번에 넣을 수 있는 최대치 */
export const GIFT_MAX = { money: 10_000_000, tickets: 1000 };

const giftOut = (g: GiftRow) => ({ id: g.id, money: g.money, tickets: g.tickets, message: g.message, sender: g.sender, createdAt: g.created_at });

const TITLES =['학부생', '학연생', '학석사', '석사', '석박', '박사', '포닥'];
const CAMPAIGN_ID = /^([1-7])-([1-9]|10)$/;
const PER_CHAPTER = 10;
const CAMPAIGN_SIZE = 7 * PER_CHAPTER;

const starOf = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? Math.min(3, Math.max(0, Math.floor(v))) : 0);

/** 0.8(7챕터×6) 스테이지 → 지금 캠페인의 1부터 센 위치. 클라이언트 v2Order와 같다. */
function v2Pos(c: number, i: number): number {
  const idx = i === 6 ? PER_CHAPTER : Math.round(((i - 1) * (PER_CHAPTER - 2)) / 4) + 1;
  return (c - 1) * PER_CHAPTER + idx;
}

/**
 * 저장 데이터에서 순위 점수를 뽑는다. 이상한 값은 걸러낸다.
 * 아직 새 버전으로 접속하지 않은 예전 저장(v1, v2)도 클라이언트 이전 규칙대로 환산한다.
 */
/** 순위표에 보이는 꾸미기: 칭호와 대표 캐릭터 (모양만 검사하고, 아이템 의미는 게임이 판단) */
export interface RankLook {
  badge: string;
  avatar: string;
  avatarTier: number;
  fit: { hat?: string; color?: string };
}

const ITEM_ID = /^[a-z0-9-]{1,40}$/;

export function rankLook(raw: unknown): RankLook {
  const out: RankLook = { badge: '', avatar: '', avatarTier: 1, fit: {} };
  const r = (raw && typeof raw === 'object' ? raw : {}) as { cosmetics?: unknown; units?: unknown };
  const c = (r.cosmetics && typeof r.cosmetics === 'object' ? r.cosmetics : {}) as { title?: unknown; avatar?: unknown; outfits?: unknown };
  if (typeof c.title === 'string' && ITEM_ID.test(c.title)) out.badge = c.title;
  if (typeof c.avatar === 'string' && ITEM_ID.test(c.avatar)) out.avatar = c.avatar;
  const slot = out.avatar || 'hero';
  const outfits = (c.outfits && typeof c.outfits === 'object' ? c.outfits : {}) as Record<string, unknown>;
  const fit = outfits[slot];
  if (fit && typeof fit === 'object') {
    const f = fit as { hat?: unknown; color?: unknown };
    if (typeof f.hat === 'string' && ITEM_ID.test(f.hat)) out.fit.hat = f.hat;
    if (typeof f.color === 'string' && ITEM_ID.test(f.color)) out.fit.color = f.color;
  }
  const units = (r.units && typeof r.units === 'object' ? r.units : {}) as Record<string, unknown>;
  const u = out.avatar ? units[out.avatar] : undefined;
  const tier = u && typeof u === 'object' ? (u as { tier?: unknown }).tier : undefined;
  if (typeof tier === 'number' && Number.isFinite(tier)) out.avatarTier = Math.min(3, Math.max(1, Math.floor(tier)));
  return out;
}

export function rankStats(raw: unknown): { endless: number; stars: number; cleared: number; title: string } {
  const r = (raw && typeof raw === 'object' ? raw : {}) as { v?: unknown; stars?: unknown; endless?: unknown };
  const v = typeof r.v === 'number' && Number.isFinite(r.v) ? r.v : 1;
  const entries = r.stars && typeof r.stars === 'object' ? Object.entries(r.stars as Record<string, unknown>) : [];
  let stars = 0;
  let cleared = 0;
  let top = 0;
  if (v >= 3) {
    for (const [id, val] of entries) {
      const m = CAMPAIGN_ID.exec(id);
      const n = starOf(val);
      if (!m || n === 0) continue;
      stars += n;
      cleared++;
      top = Math.max(top, (Number(m[1]) - 1) * PER_CHAPTER + Number(m[2]));
    }
  } else if (v >= 2) {
    // 7챕터×6: 깬 스테이지만 같은 자리로 옮긴다
    for (const [id, val] of entries) {
      const m = /^([1-7])-([1-6])$/.exec(id);
      const n = starOf(val);
      if (!m || n === 0) continue;
      stars += n;
      cleared++;
      top = Math.max(top, v2Pos(Number(m[1]), Number(m[2])));
    }
  } else {
    // 4챕터×5: 같은 난이도 지점까지 평균 별로 클리어
    let reach = -1;
    const got: number[] = [];
    for (const [id, val] of entries) {
      const m = /^([1-4])-([1-5])$/.exec(id);
      const n = starOf(val);
      if (!m || n === 0) continue;
      const o = (Number(m[1]) - 1) * 5 + (Number(m[2]) - 1);
      reach = Math.max(reach, Math.min(CAMPAIGN_SIZE - 1, Math.round((o * (CAMPAIGN_SIZE - 1)) / 19)));
      got.push(n);
    }
    if (reach >= 0) {
      const avg = Math.max(1, Math.round(got.reduce((x, y) => x + y, 0) / got.length));
      cleared = reach + 1;
      stars = avg * cleared;
      top = cleared;
    }
  }
  const endless = typeof r.endless === 'number' && Number.isFinite(r.endless) ? Math.min(100_000, Math.max(0, Math.floor(r.endless))) : 0;
  const title = cleared >= CAMPAIGN_SIZE ? '교수' : TITLES[Math.min(6, Math.floor(top / PER_CHAPTER))]!;
  return { endless, stars, cleared, title };
}

export function createApp(store: Store, cfg: Config) {
  // 순위표는 30초 동안 캐시한다.
  let board: { at: number; rows: (RankRow & { uid: number })[] } | null = null;
  const leaderboard = (): (RankRow & { uid: number })[] => {
    const now = cfg.now();
    if (board && now - board.at < 30_000) return board.rows;
    const rows = store.allSaves().map((s) => {
      let data: unknown = null;
      try {
        data = JSON.parse(s.data);
      } catch {
        /* 깨진 저장은 0점 */
      }
      return { uid: s.user_id, name: s.nickname || s.username, at: s.updated_at, ...rankStats(data), ...rankLook(data) };
    }).filter((r) => r.cleared > 0 || r.endless > 0)
      // 무한 기록 → 별 → 먼저 달성한 사람
      .sort((a, b) => b.endless - a.endless || b.stars - a.stars || b.cleared - a.cleared || a.at - b.at)
      .map((r, i) => ({ rank: i + 1, uid: r.uid, name: r.name, endless: r.endless, stars: r.stars, cleared: r.cleared, title: r.title, badge: r.badge, avatar: r.avatar, avatarTier: r.avatarTier, fit: r.fit }));
    board = { at: now, rows };
    return rows;
  };

  const hits = new Map<string, { count: number; reset: number }>();

  const limit = (key: string, rule = cfg.authLimit, msg = '요청이 너무 많아요. 잠시 후 다시 시도해 주세요.'): void => {
    const now = cfg.now();
    const h = hits.get(key);
    if (!h || h.reset <= now) {
      hits.set(key, { count: 1, reset: now + rule.windowSec * 1000 });
      if (hits.size > 10_000) for (const [k, v] of hits) if (v.reset <= now) hits.delete(k);
      return;
    }
    h.count++;
    if (h.count > rule.max) throw new HttpError(429, msg);
  };

  const admins = new Set(cfg.adminUsers.map((u) => u.toLowerCase()));
  const isAdmin = (u: UserRow): boolean => admins.has(u.username.toLowerCase());
  const publicUser = (u: UserRow) => ({ id: u.id, username: u.username, nickname: u.nickname || u.username, ...(isAdmin(u) ? { admin: true } : {}) });

  const issue = (user: UserRow) => {
    const now = cfg.now();
    const refresh = newRefreshToken();
    store.addRefresh(sha256(refresh), user.id, now + cfg.refreshTtlSec * 1000);
    return { access: signAccess(cfg.secret, user.id, cfg.accessTtlSec, now), refresh, user: publicUser(user) };
  };

  /** Bearer 토큰이 맞으면 그 사용자, 없거나 틀리면 undefined (선택 인증) */
  const maybeUser = (req: IncomingMessage): UserRow | undefined => {
    const m = /^Bearer (.+)$/.exec(req.headers.authorization ?? '');
    const uid = m ? verifyAccess(cfg.secret, m[1]!, cfg.now()) : null;
    return uid === null ? undefined : store.userById(uid);
  };

  const authed = (req: IncomingMessage): number => {
    const m = /^Bearer (.+)$/.exec(req.headers.authorization ?? '');
    const uid = m ? verifyAccess(cfg.secret, m[1]!, cfg.now()) : null;
    if (uid === null || !store.userById(uid)) throw new HttpError(401, '다시 로그인해 주세요.');
    return uid;
  };

  const adminOnly = (req: IncomingMessage): UserRow => {
    const user = store.userById(authed(req))!;
    if (!isAdmin(user)) throw new HttpError(403, '관리자만 볼 수 있어요.');
    return user;
  };

  type Handler = (req: IncomingMessage, body: Record<string, unknown>, ip: string) => unknown;
  const routes: Record<string, Handler> = {
    'GET /api/health': () => ({ ok: true }),

    'POST /api/auth/register': (_req, b, ip) => {
      limit(ip);
      const err = validateCredentials(b.username, b.password);
      if (err) throw new HttpError(400, err);
      const user = store.createUser(b.username as string, hashPassword(b.password as string), cfg.now());
      if (!user) throw new HttpError(409, '이미 사용 중인 아이디예요.');
      return issue(user);
    },

    'POST /api/auth/login': (_req, b, ip) => {
      limit(ip);
      const user = typeof b.username === 'string' ? store.userByName(b.username) : undefined;
      const ok = verifyPassword(typeof b.password === 'string' ? b.password : '', user?.pass_hash ?? DUMMY_HASH);
      if (!user || !ok) throw new HttpError(401, '아이디 또는 비밀번호가 맞지 않아요.');
      return issue(user);
    },

    // 갱신 토큰은 쓸 때마다 새것으로 바뀐다 (자동 로그인)
    'POST /api/auth/refresh': (_req, b, ip) => {
      limit(ip);
      if (typeof b.refresh !== 'string') throw new HttpError(400, '잘못된 요청이에요.');
      const uid = store.takeRefresh(sha256(b.refresh), cfg.now());
      const user = uid === null ? undefined : store.userById(uid);
      if (!user) throw new HttpError(401, '로그인이 만료됐어요. 다시 로그인해 주세요.');
      return issue(user);
    },

    'POST /api/auth/logout': (_req, b) => {
      if (typeof b.refresh === 'string') store.dropRefresh(sha256(b.refresh));
      return { ok: true };
    },

    // 내 정보 (닉네임·관리자 여부)
    'GET /api/me': (req) => ({ user: publicUser(store.userById(authed(req))!) }),

    'PUT /api/me/nickname': (req, b) => {
      const uid = authed(req);
      const nick = cleanNickname(b.nickname);
      if (!nick) throw new HttpError(400, '닉네임은 2~12자의 한글·영문·숫자·밑줄·띄어쓰기만 쓸 수 있어요.');
      store.setNickname(uid, nick);
      board = null;
      return { user: publicUser(store.userById(uid)!) };
    },

    // 의견 보내기: 로그인했으면 계정으로, 아니면 게스트(이름 선택)로 남는다
    'POST /api/feedback': (req, b, ip) => {
      const user = maybeUser(req);
      limit(user ? `fb:u:${user.id}` : `fb:ip:${ip}`, cfg.feedbackLimit, '의견을 너무 자주 보냈어요. 10분쯤 뒤에 다시 보내 주세요.');
      const category = FEEDBACK_CATEGORIES.find((c) => c === b.category);
      if (!category) throw new HttpError(400, '분류를 골라 주세요.');
      const text = typeof b.text === 'string' ? b.text.trim() : '';
      if (text.length < 1 || text.length > 1000) throw new HttpError(400, '내용은 1~1000자로 적어 주세요.');
      const guestName = typeof b.name === 'string' ? b.name.trim().slice(0, 20) : '';
      const author = user
        ? (user.nickname && user.nickname !== user.username ? `${user.nickname} (${user.username})` : user.username)
        : guestName || '게스트';
      const version = typeof b.version === 'string' ? b.version.slice(0, 32) : '';
      const id = store.addFeedback({ category, text, userId: user?.id ?? null, author, guest: !user, version, now: cfg.now() });
      return { ok: true, id };
    },

    // 의견함: 관리자만, 최신순
    'GET /api/admin/feedback': (req) => {
      adminOnly(req);
      const items = store.listFeedback(300).map((f) => ({
        id: f.id, category: f.category, text: f.text, author: f.author, guest: f.guest === 1,
        version: f.version, createdAt: f.created_at, done: f.done === 1, doneAt: f.done_at,
      }));
      return { items, open: items.filter((f) => !f.done).length };
    },

    // 처리됨 표시 / 다시 열기: {id, done}
    'PATCH /api/admin/feedback': (req, b) => {
      adminOnly(req);
      if (typeof b.id !== 'number' || typeof b.done !== 'boolean') throw new HttpError(400, '잘못된 요청이에요.');
      if (!store.markFeedback(b.id, b.done, cfg.now())) throw new HttpError(404, '없는 의견이에요.');
      return { ok: true, id: b.id, done: b.done };
    },

    // 선물 보낼 플레이어 목록: 관리자만, 최근에 저장한 순
    'GET /api/admin/players': (req) => {
      adminOnly(req);
      const players = store.listPlayers().map((p) => {
        let data: Record<string, unknown> = {};
        try {
          const v = p.data ? JSON.parse(p.data) : null;
          if (v && typeof v === 'object') data = v;
        } catch {
          /* 깨진 저장 */
        }
        const gear = (data.gear && typeof data.gear === 'object' ? data.gear : {}) as { tickets?: unknown };
        const num = (x: unknown): number => (typeof x === 'number' && Number.isFinite(x) ? Math.max(0, Math.floor(x)) : 0);
        const st = rankStats(data);
        return {
          id: p.id, username: p.username, nickname: p.nickname || p.username, createdAt: p.created_at, lastSave: p.updated_at ?? null,
          money: num(data.money), tickets: num(gear.tickets), cleared: st.cleared, endless: st.endless, title: st.title,
        };
      });
      return { players };
    },

    // 선물 보내기: {userIds, money, tickets, message?}. 받는 사람이 선물함에서 받는다 (거절 없음)
    'POST /api/admin/gifts': (req, b) => {
      const admin = adminOnly(req);
      const ids = Array.isArray(b.userIds) ? b.userIds.filter((x): x is number => Number.isInteger(x)) : [];
      if (!ids.length || ids.length > 1000) throw new HttpError(400, '받는 사람을 골라 주세요.');
      const amount = (x: unknown, max: number): number => (Number.isInteger(x) && (x as number) >= 0 && (x as number) <= max ? x as number : -1);
      const money = amount(b.money ?? 0, GIFT_MAX.money);
      const tickets = amount(b.tickets ?? 0, GIFT_MAX.tickets);
      if (money < 0 || tickets < 0 || money + tickets === 0) throw new HttpError(400, `선물은 연구비 0~${GIFT_MAX.money}, 뽑기권 0~${GIFT_MAX.tickets} 사이로, 하나 이상 넣어 주세요.`);
      const message = typeof b.message === 'string' ? b.message.trim().slice(0, 100) : '';
      const sent = store.addGifts(ids, { money, tickets, message, sender: admin.nickname || admin.username, now: cfg.now() });
      return { ok: true, sent };
    },

    // 보낸 선물 기록: 관리자만, 최신순 100건
    'GET /api/admin/gifts': (req) => {
      adminOnly(req);
      return {
        items: store.recentGifts(100).map((g) => ({
          id: g.id, to: g.nickname || g.username, money: g.money, tickets: g.tickets, message: g.message, createdAt: g.created_at, claimedAt: g.claimed_at,
        })),
      };
    },

    // 내 선물함: 아직 받지 않은 선물
    'GET /api/gifts': (req) => ({ items: store.pendingGifts(authed(req)).map(giftOut) }),

    // 선물 받기: {ids?} (없으면 전부). 받은 선물과 합계를 돌려주고, 게임이 저장에 더한다
    'POST /api/gifts/claim': (req, b) => {
      const uid = authed(req);
      const ids = Array.isArray(b.ids) ? b.ids.filter((x): x is number => Number.isInteger(x)) : null;
      const got = store.claimGifts(uid, ids, cfg.now());
      return {
        items: got.map(giftOut),
        money: got.reduce((a, g) => a + g.money, 0),
        tickets: got.reduce((a, g) => a + g.tickets, 0),
      };
    },

    // 순위표: 누구나 볼 수 있고, 로그인했으면 내 순위도 준다.
    'GET /api/leaderboard': (req) => {
      const rows = leaderboard();
      const m = /^Bearer (.+)$/.exec(req.headers.authorization ?? '');
      const uid = m ? verifyAccess(cfg.secret, m[1]!, cfg.now()) : null;
      // 닉네임은 겹칠 수 있으니 내 줄은 서버가 표시해 준다
      const strip = ({ uid: u, ...r }: RankRow & { uid: number }): RankRow & { mine?: true } => (u === uid ? { ...r, mine: true } : r);
      const mine = uid === null ? undefined : rows.find((r) => r.uid === uid);
      return { top: rows.slice(0, 50).map(strip), me: mine ? strip(mine) : null, total: rows.length };
    },

    'GET /api/save': (req) => {
      const uid = authed(req);
      const row = store.getSave(uid);
      return row ? { data: JSON.parse(row.data), version: row.version, updatedAt: row.updated_at } : { data: null, version: 0, updatedAt: 0 };
    },

    'PUT /api/save': (req, b) => {
      const uid = authed(req);
      if (!b.data || typeof b.data !== 'object' || Array.isArray(b.data) || typeof b.version !== 'number') throw new HttpError(400, '잘못된 저장 데이터예요.');
      const json = JSON.stringify(b.data);
      if (json.length > cfg.maxSaveBytes) throw new HttpError(413, '저장 데이터가 너무 커요.');
      const next = store.putSave(uid, json, b.version, cfg.now());
      if (next !== null) board = null;
      if (next === null) {
        const cur = store.getSave(uid)!;
        throw Object.assign(new HttpError(409, '다른 기기에서 먼저 저장했어요.'), { extra: { data: JSON.parse(cur.data), version: cur.version, updatedAt: cur.updated_at } });
      }
      return { version: next };
    },
  };

  return async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    const origin = req.headers.origin;
    const allowed = origin && cfg.allowedOrigins.includes(origin);
    if (allowed) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, OPTIONS');
      res.setHeader('Access-Control-Max-Age', '600');
    }
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'no-store');
    if (req.method === 'OPTIONS') {
      res.writeHead(allowed ? 204 : 403).end();
      return;
    }
    const send = (status: number, payload: unknown): void => {
      res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' }).end(JSON.stringify(payload));
    };
    try {
      if (origin && !allowed) throw new HttpError(403, '허용되지 않은 출처예요.');
      const path = (req.url ?? '/').split('?')[0];
      const route = routes[`${req.method} ${path}`];
      if (!route) throw new HttpError(404, '없는 주소예요.');
      const body = req.method === 'GET' ? {} : await readJson(req, cfg.maxSaveBytes * 2);
      const fwd = cfg.trustProxy ? String(req.headers['x-forwarded-for'] ?? '').split(',')[0]!.trim() : '';
      const ip = fwd || req.socket.remoteAddress || 'unknown';
      send(200, await route(req, body, ip));
    } catch (e) {
      if (e instanceof HttpError) send(e.status, { error: e.message, ...((e as HttpError & { extra?: object }).extra ?? {}) });
      else {
        console.error(e);
        send(500, { error: '서버 오류가 났어요.' });
      }
    }
  };
}

function readJson(req: IncomingMessage, max: number): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => {
      size += c.length;
      if (size > max) {
        reject(new HttpError(413, '요청이 너무 커요.'));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => {
      try {
        const v = JSON.parse(Buffer.concat(chunks).toString() || '{}');
        resolve(v && typeof v === 'object' && !Array.isArray(v) ? v : {});
      } catch {
        reject(new HttpError(400, 'JSON 형식이 아니에요.'));
      }
    });
    req.on('error', reject);
  });
}
