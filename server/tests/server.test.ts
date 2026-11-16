import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { createApp, defaultConfig, type Config } from '../src/app.ts';
import { Store } from '../src/db.ts';
import { hashPassword, verifyAccess, verifyPassword } from '../src/auth.ts';

const ORIGIN = 'https://apg0001.github.io';
let server: Server;
let base = '';
let clock = 1_800_000_000_000;
let cfg: Config;

async function call(method: string, path: string, body?: unknown, token?: string, origin = ORIGIN) {
  const res = await fetch(base + path, {
    method,
    headers: { 'Content-Type': 'application/json', Origin: origin, ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, json: (await res.json().catch(() => ({}))) as Record<string, any>, headers: res.headers };
}

beforeEach(async () => {
  cfg = { ...defaultConfig('x'.repeat(40)), now: () => clock };
  server = createServer(createApp(new Store(':memory:'), cfg));
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterEach(() => new Promise<void>((r) => server.close(() => r())));

describe('계정 서버', () => {
  it('비밀번호 해시와 접근 토큰', () => {
    const h = hashPassword('correct horse');
    expect(verifyPassword('correct horse', h)).toBe(true);
    expect(verifyPassword('wrong', h)).toBe(false);
    expect(verifyAccess('s', 'garbage', 0)).toBeNull();
  });

  it('가입 → 저장 → 다른 기기 로그인 → 불러오기', async () => {
    const reg = await call('POST', '/api/auth/register', { username: '김석사', password: 'password123' });
    expect(reg.status).toBe(200);
    expect(reg.headers.get('access-control-allow-origin')).toBe(ORIGIN);
    const empty = await call('GET', '/api/save', undefined, reg.json.access);
    expect(empty.json).toMatchObject({ data: null, version: 0 });
    const put = await call('PUT', '/api/save', { data: { money: 500 }, version: 0 }, reg.json.access);
    expect(put.json.version).toBe(1);

    const login = await call('POST', '/api/auth/login', { username: '김석사', password: 'password123' });
    expect(login.status).toBe(200);
    const got = await call('GET', '/api/save', undefined, login.json.access);
    expect(got.json).toMatchObject({ data: { money: 500 }, version: 1 });
  });

  it('같은 아이디는 다시 만들 수 없고, 잘못된 입력은 거절한다', async () => {
    await call('POST', '/api/auth/register', { username: 'kim', password: 'password123' });
    expect((await call('POST', '/api/auth/register', { username: 'KIM', password: 'password123' })).status).toBe(409);
    expect((await call('POST', '/api/auth/register', { username: 'a', password: 'password123' })).status).toBe(400);
    expect((await call('POST', '/api/auth/register', { username: 'lee', password: 'short' })).status).toBe(400);
    expect((await call('POST', '/api/auth/login', { username: 'kim', password: 'nope-nope' })).status).toBe(401);
    expect((await call('POST', '/api/auth/login', { username: 'ghost', password: 'nope-nope' })).status).toBe(401);
  });

  it('갱신 토큰은 한 번만 쓸 수 있고 쓰면 새것으로 바뀐다', async () => {
    const reg = await call('POST', '/api/auth/register', { username: 'park', password: 'password123' });
    const r1 = await call('POST', '/api/auth/refresh', { refresh: reg.json.refresh });
    expect(r1.status).toBe(200);
    expect(r1.json.refresh).not.toBe(reg.json.refresh);
    expect((await call('POST', '/api/auth/refresh', { refresh: reg.json.refresh })).status).toBe(401);
    await call('POST', '/api/auth/logout', { refresh: r1.json.refresh });
    expect((await call('POST', '/api/auth/refresh', { refresh: r1.json.refresh })).status).toBe(401);
  });

  it('접근 토큰이 만료되면 401, 갱신 토큰도 기한이 지나면 401', async () => {
    const reg = await call('POST', '/api/auth/register', { username: 'choi', password: 'password123' });
    clock += 16 * 60 * 1000;
    expect((await call('GET', '/api/save', undefined, reg.json.access)).status).toBe(401);
    clock += 61 * 24 * 3600 * 1000;
    expect((await call('POST', '/api/auth/refresh', { refresh: reg.json.refresh })).status).toBe(401);
  });

  it('버전이 어긋나면 409와 서버 데이터를 돌려준다', async () => {
    const reg = await call('POST', '/api/auth/register', { username: 'jung', password: 'password123' });
    await call('PUT', '/api/save', { data: { money: 1 }, version: 0 }, reg.json.access);
    const stale = await call('PUT', '/api/save', { data: { money: 2 }, version: 0 }, reg.json.access);
    expect(stale.status).toBe(409);
    expect(stale.json).toMatchObject({ data: { money: 1 }, version: 1 });
    expect((await call('PUT', '/api/save', { data: 'x', version: 1 }, reg.json.access)).status).toBe(400);
    const big = { blob: 'x'.repeat(70 * 1024) };
    expect((await call('PUT', '/api/save', { data: big, version: 1 }, reg.json.access)).status).toBe(413);
  });

  it('허용되지 않은 출처와 과도한 로그인 시도를 막는다', async () => {
    expect((await call('GET', '/api/health', undefined, undefined, 'https://evil.example')).status).toBe(403);
    let last = 0;
    for (let i = 0; i < 12; i++) last = (await call('POST', '/api/auth/login', { username: 'x', password: 'yyyyyyyy' })).status;
    expect(last).toBe(429);
  });
});
