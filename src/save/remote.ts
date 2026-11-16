import { normalizeSave, type SaveData } from '../sim/progression';
import { kv, LocalSaveStore, type SaveStore } from './store';

/** 배포 시 VITE_API_URL로 계정 서버 주소를 넣는다. 비어 있으면 로그인 기능을 숨긴다. */
export const API_URL: string = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');

export interface AccountUser {
  id: number;
  username: string;
}

interface Tokens {
  access: string;
  refresh: string;
  user: AccountUser;
}

export class ApiError extends Error {
  status: number;
  body: Record<string, unknown>;
  constructor(status: number, body: Record<string, unknown>) {
    super(typeof body.error === 'string' ? body.error : `요청 실패 (${status})`);
    this.status = status;
    this.body = body;
  }
}

export interface RankRow {
  rank: number;
  name: string;
  endless: number;
  stars: number;
  cleared: number;
  title: string;
}

export interface Leaderboard {
  top: RankRow[];
  me: RankRow | null;
  total: number;
}

/** 계정 서버 클라이언트. 갱신 토큰은 기기에 보관해 자동 로그인에 쓴다. */
export class AccountApi {
  private access = '';

  constructor(private readonly base: string) {}

  get user(): AccountUser | null {
    try {
      return (JSON.parse(kv.get('auth') ?? 'null') as { user: AccountUser } | null)?.user ?? null;
    } catch {
      return null;
    }
  }

  private get refreshToken(): string | null {
    try {
      return (JSON.parse(kv.get('auth') ?? 'null') as { refresh: string } | null)?.refresh ?? null;
    } catch {
      return null;
    }
  }

  private keep(t: Tokens): AccountUser {
    this.access = t.access;
    kv.set('auth', JSON.stringify({ refresh: t.refresh, user: t.user }));
    return t.user;
  }

  private async raw(method: string, path: string, body?: unknown, auth = false): Promise<Record<string, unknown>> {
    const res = await fetch(this.base + path, {
      method,
      headers: { 'Content-Type': 'application/json', ...(auth && this.access ? { Authorization: `Bearer ${this.access}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) throw new ApiError(res.status, json);
    return json;
  }

  async register(username: string, password: string): Promise<AccountUser> {
    return this.keep((await this.raw('POST', '/api/auth/register', { username, password })) as unknown as Tokens);
  }

  async login(username: string, password: string): Promise<AccountUser> {
    return this.keep((await this.raw('POST', '/api/auth/login', { username, password })) as unknown as Tokens);
  }

  /** 저장된 갱신 토큰으로 다시 접속한다 (자동 로그인). 만료되면 로그아웃 상태가 된다. */
  async resume(): Promise<AccountUser | null> {
    const refresh = this.refreshToken;
    if (!refresh) return null;
    try {
      return this.keep((await this.raw('POST', '/api/auth/refresh', { refresh })) as unknown as Tokens);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) kv.del('auth');
      throw e;
    }
  }

  async logout(): Promise<void> {
    const refresh = this.refreshToken;
    kv.del('auth');
    this.access = '';
    if (refresh) await this.raw('POST', '/api/auth/logout', { refresh }).catch(() => undefined);
  }

  /** 접근 토큰이 만료됐으면 한 번 갱신하고 다시 시도한다. */
  private async authed(method: string, path: string, body?: unknown): Promise<Record<string, unknown>> {
    if (!this.access) await this.resume();
    try {
      return await this.raw(method, path, body, true);
    } catch (e) {
      if (!(e instanceof ApiError) || e.status !== 401) throw e;
      await this.resume();
      return this.raw(method, path, body, true);
    }
  }

  async getSave(): Promise<{ data: unknown; version: number }> {
    const r = await this.authed('GET', '/api/save');
    return { data: r.data, version: Number(r.version) || 0 };
  }

  /** 순위표. 로그인 상태면 내 순위도 받는다. */
  async leaderboard(): Promise<Leaderboard> {
    const r = this.user ? await this.authed('GET', '/api/leaderboard').catch(() => this.raw('GET', '/api/leaderboard')) : await this.raw('GET', '/api/leaderboard');
    return r as unknown as Leaderboard;
  }

  async putSave(data: SaveData, version: number): Promise<number> {
    const r = await this.authed('PUT', '/api/save', { data, version });
    return Number(r.version);
  }
}

/** 진행도 점수: 충돌 시 더 많이 진행한 쪽을 남긴다. */
export function progressScore(s: SaveData): number {
  const stars = Object.values(s.stars).reduce((a, b) => a + b, 0);
  const growth = Object.values(s.units).reduce((a, u) => a + u.level + (u.tier - 1) * 15, 0)
    + Object.values(s.facilities).reduce((a, b) => a + b, 0) + s.subs.length * 5;
  return (stars + s.endless * 2) * 1e6 + growth * 1e3 + Math.min(999, Math.floor(s.money / 100));
}

export function pickBetter(a: SaveData, b: SaveData): SaveData {
  const d = progressScore(a) - progressScore(b);
  if (d !== 0) return d > 0 ? a : b;
  return a.updatedAt >= b.updatedAt ? a : b;
}

export type SyncState = 'synced' | 'pending' | 'offline' | 'error';

/**
 * 계정 저장소: 기기에 먼저 저장(오프라인 대비)하고 서버로 동기화한다.
 * 다른 기기가 먼저 저장했으면(409) 진행도가 더 높은 쪽을 남긴다.
 */
export class AccountSaveStore implements SaveStore {
  private readonly local = new LocalSaveStore();
  private timer: number | undefined;
  private pushing = false;
  onSync: (s: SyncState) => void = () => undefined;
  /** 서버 쪽 진행이 더 앞서 있어 기기 데이터를 바꿨을 때 */
  onReplaced: (data: SaveData) => void = () => undefined;

  constructor(private readonly api: AccountApi) {}

  private versionKey(id: string): string {
    return `ver:${id}`;
  }

  private version(id: string): number {
    return Number(kv.get(this.versionKey(id)) ?? 0) || 0;
  }

  async load(profileId: string): Promise<SaveData | null> {
    const cached = await this.local.load(profileId);
    try {
      const remote = await this.api.getSave();
      kv.set(this.versionKey(profileId), String(remote.version));
      if (remote.data === null) {
        if (cached) this.schedule(profileId, cached);
        this.onSync(cached ? 'pending' : 'synced');
        return cached;
      }
      const server = normalizeSave(remote.data);
      const best = cached ? pickBetter(cached, server) : server;
      await this.local.save(profileId, best);
      if (best !== server) this.schedule(profileId, best);
      else this.onSync('synced');
      return best;
    } catch {
      this.onSync('offline');
      return cached;
    }
  }

  async save(profileId: string, data: SaveData): Promise<void> {
    await this.local.save(profileId, data);
    this.schedule(profileId, data);
  }

  async remove(profileId: string): Promise<void> {
    await this.local.remove(profileId);
    kv.del(this.versionKey(profileId));
  }

  /** 저장이 몰려도 서버에는 1.5초에 한 번만 보낸다. */
  private schedule(profileId: string, data: SaveData): void {
    this.onSync('pending');
    window.clearTimeout(this.timer);
    this.timer = window.setTimeout(() => void this.push(profileId, data), 1500);
  }

  async push(profileId: string, data: SaveData): Promise<void> {
    if (this.pushing) return this.schedule(profileId, data);
    this.pushing = true;
    try {
      kv.set(this.versionKey(profileId), String(await this.api.putSave(data, this.version(profileId))));
      this.onSync('synced');
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        const server = normalizeSave(e.body.data);
        kv.set(this.versionKey(profileId), String(Number(e.body.version) || 0));
        const best = pickBetter(data, server);
        await this.local.save(profileId, best);
        this.pushing = false;
        if (best === data) return this.push(profileId, data);
        this.onReplaced(best);
        this.onSync('synced');
        return;
      }
      this.onSync(e instanceof ApiError ? 'error' : 'offline');
    } finally {
      this.pushing = false;
    }
  }
}
