import type { IncomingMessage, ServerResponse } from 'node:http';
import { hashPassword, newRefreshToken, sha256, signAccess, validateCredentials, verifyAccess, verifyPassword } from './auth.ts';
import type { Store } from './db.ts';

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

export function createApp(store: Store, cfg: Config) {
  const hits = new Map<string, { count: number; reset: number }>();

  const limit = (ip: string): void => {
    const now = cfg.now();
    const h = hits.get(ip);
    if (!h || h.reset <= now) {
      hits.set(ip, { count: 1, reset: now + cfg.authLimit.windowSec * 1000 });
      if (hits.size > 10_000) for (const [k, v] of hits) if (v.reset <= now) hits.delete(k);
      return;
    }
    h.count++;
    if (h.count > cfg.authLimit.max) throw new HttpError(429, '요청이 너무 많아요. 잠시 후 다시 시도해 주세요.');
  };

  const issue = (userId: number, username: string) => {
    const now = cfg.now();
    const refresh = newRefreshToken();
    store.addRefresh(sha256(refresh), userId, now + cfg.refreshTtlSec * 1000);
    return { access: signAccess(cfg.secret, userId, cfg.accessTtlSec, now), refresh, user: { id: userId, username } };
  };

  const authed = (req: IncomingMessage): number => {
    const m = /^Bearer (.+)$/.exec(req.headers.authorization ?? '');
    const uid = m ? verifyAccess(cfg.secret, m[1]!, cfg.now()) : null;
    if (uid === null || !store.userById(uid)) throw new HttpError(401, '다시 로그인해 주세요.');
    return uid;
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
      return issue(user.id, user.username);
    },

    'POST /api/auth/login': (_req, b, ip) => {
      limit(ip);
      const user = typeof b.username === 'string' ? store.userByName(b.username) : undefined;
      const ok = verifyPassword(typeof b.password === 'string' ? b.password : '', user?.pass_hash ?? DUMMY_HASH);
      if (!user || !ok) throw new HttpError(401, '아이디 또는 비밀번호가 맞지 않아요.');
      return issue(user.id, user.username);
    },

    // 갱신 토큰은 쓸 때마다 새것으로 바뀐다 (자동 로그인)
    'POST /api/auth/refresh': (_req, b, ip) => {
      limit(ip);
      if (typeof b.refresh !== 'string') throw new HttpError(400, '잘못된 요청이에요.');
      const uid = store.takeRefresh(sha256(b.refresh), cfg.now());
      const user = uid === null ? undefined : store.userById(uid);
      if (!user) throw new HttpError(401, '로그인이 만료됐어요. 다시 로그인해 주세요.');
      return issue(user.id, user.username);
    },

    'POST /api/auth/logout': (_req, b) => {
      if (typeof b.refresh === 'string') store.dropRefresh(sha256(b.refresh));
      return { ok: true };
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
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
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
