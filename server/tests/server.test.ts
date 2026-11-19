import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { createApp, defaultConfig, rankLook, type Config } from '../src/app.ts';
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

  it('순위표: 무한 기록 → 별 순, 로그인하면 내 순위, 저장하면 갱신', async () => {
    const mk = async (name: string, data: object) => {
      const r = await call('POST', '/api/auth/register', { username: name, password: 'password123' });
      await call('PUT', '/api/save', { data, version: 0 }, r.json.access);
      return r.json.access as string;
    };
    const stars = (n: number) => Object.fromEntries(Array.from({ length: n }, (_, i) => [`${Math.floor(i / 10) + 1}-${(i % 10) + 1}`, 3]));
    await mk('학부생1', { v: 3, stars: stars(3), endless: 0 });
    const prof = await mk('교수님', { v: 3, stars: stars(70), endless: 7 });
    await mk('석사생', { v: 3, stars: stars(33), endless: 0 });
    await mk('예전저장', { v: 1, stars: { '4-5': 3 } });
    await mk('영팔저장', { v: 2, stars: { '1-1': 3 } });
    await mk('사기꾼', { v: 3, stars: { '9-9': 3, hack: 99 }, endless: 'lots' });

    const pub = await call('GET', '/api/leaderboard');
    expect(pub.status).toBe(200);
    expect(pub.json.top.map((r: { name: string }) => r.name)).toEqual(['교수님', '예전저장', '석사생', '학부생1', '영팔저장']);
    expect(pub.json.top[0]).toMatchObject({ rank: 1, endless: 7, stars: 210, cleared: 70, title: '교수' });
    expect(pub.json.top[1]).toMatchObject({ title: '교수', cleared: 70, stars: 210 }); // 예전 4챕터 최종 클리어
    expect(pub.json.top[2]).toMatchObject({ title: '석사', cleared: 33 });
    expect(pub.json.top[4]).toMatchObject({ cleared: 1, stars: 3, title: '학부생' }); // 0.8 저장도 환산
    expect(pub.json.top[0].uid).toBeUndefined();
    expect(pub.json.me).toBeNull();

    const mine = await call('GET', '/api/leaderboard', undefined, prof);
    expect(mine.json.me).toMatchObject({ rank: 1, name: '교수님', mine: true });
    expect(mine.json.top[1].mine).toBeUndefined();
  });

  it('전투력 순위: ?by=power면 저장의 power 순, 없거나 이상한 값은 빠지고, 저장하면 갱신', async () => {
    const mk = async (name: string, data: object) => {
      const r = await call('POST', '/api/auth/register', { username: name, password: 'password123' });
      await call('PUT', '/api/save', { data, version: 0 }, r.json.access);
      return r.json.access as string;
    };
    await mk('강한학부생', { v: 3, stars: { '1-1': 3 }, power: 900.7 });
    const weak = await mk('약한교수', { v: 3, stars: { '7-10': 3 }, endless: 50, power: 300 });
    await mk('예전저장', { v: 3, stars: { '1-1': 3 } });
    await mk('조작', { v: 3, stars: { '1-1': 3 }, power: 1e12 });
    await mk('문자', { v: 3, stars: { '1-1': 3 }, power: 'over9000' });

    const pw = await call('GET', '/api/leaderboard?by=power');
    expect(pw.status).toBe(200);
    expect(pw.json.top.map((r: { name: string }) => r.name)).toEqual(['강한학부생', '약한교수']);
    expect(pw.json.top[0]).toMatchObject({ rank: 1, power: 900 });
    expect(pw.json.total).toBe(2);
    // 진행 순위는 그대로 (무한 기록 순), 전투력도 같이 실려 온다
    const pg = await call('GET', '/api/leaderboard');
    expect(pg.json.top[0]).toMatchObject({ name: '약한교수', power: 300 });

    // 저장하면 캐시가 비워져 바로 반영된다
    await call('PUT', '/api/save', { data: { v: 3, stars: { '7-10': 3 }, endless: 50, power: 5000 }, version: 1 }, weak);
    const again = await call('GET', '/api/leaderboard?by=power', undefined, weak);
    expect(again.json.top[0]).toMatchObject({ name: '약한교수', power: 5000, mine: true });
    expect(again.json.me).toMatchObject({ rank: 1 });
  });

  it('닉네임: 기본은 아이디, 바꾸면 응답·순위표에 반영, 잘못된 값은 거절', async () => {
    const reg = await call('POST', '/api/auth/register', { username: 'nick01', password: 'password123' });
    expect(reg.json.user).toMatchObject({ username: 'nick01', nickname: 'nick01' });
    expect(reg.json.user.admin).toBeUndefined();
    const tok = reg.json.access as string;
    await call('PUT', '/api/save', { data: { v: 3, stars: { '1-1': 3 } }, version: 0 }, tok);
    expect((await call('GET', '/api/leaderboard')).json.top[0].name).toBe('nick01');

    expect((await call('PUT', '/api/me/nickname', { nickname: '  김  석사 ' }, tok)).json.user.nickname).toBe('김 석사');
    expect((await call('GET', '/api/me', undefined, tok)).json.user).toMatchObject({ username: 'nick01', nickname: '김 석사' });
    expect((await call('GET', '/api/leaderboard')).json.top[0].name).toBe('김 석사');
    const login = await call('POST', '/api/auth/login', { username: 'nick01', password: 'password123' });
    expect(login.json.user.nickname).toBe('김 석사');

    for (const bad of ['a', 'x'.repeat(13), '{coin}', '<b>hi</b>', 3]) {
      expect((await call('PUT', '/api/me/nickname', { nickname: bad }, tok)).status).toBe(400);
    }
    expect((await call('PUT', '/api/me/nickname', { nickname: '손님' })).status).toBe(401);
    expect((await call('GET', '/api/me')).status).toBe(401);
  });

  it('예전 DB(닉네임 칸 없음)도 열면 칸을 추가한다', async () => {
    const { DatabaseSync } = await import('node:sqlite');
    const { mkdtempSync } = await import('node:fs');
    const { tmpdir } = await import('node:os');
    const { join } = await import('node:path');
    const file = join(mkdtempSync(join(tmpdir(), 'lw-')), 'old.db');
    const old = new DatabaseSync(file);
    old.exec('CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT NOT NULL UNIQUE COLLATE NOCASE, pass_hash TEXT NOT NULL, created_at INTEGER NOT NULL)');
    old.prepare('INSERT INTO users (username, pass_hash, created_at) VALUES (?, ?, ?)').run('oldie', 'x', 1);
    old.close();
    const s = new Store(file);
    expect(s.userByName('oldie')).toMatchObject({ username: 'oldie', nickname: null });
    s.setNickname(s.userByName('oldie')!.id, '고참');
    s.close();
    const again = new Store(file); // 두 번 열어도 문제없다
    expect(again.userByName('oldie')!.nickname).toBe('고참');
    again.close();
  });

  it('관리자: ADMIN_USERS에 있는 계정만 의견함을 보고 처리 표시를 바꾼다', async () => {
    const admin = await call('POST', '/api/auth/register', { username: 'APG0001', password: 'password123' });
    expect(admin.json.user.admin).toBe(true);
    expect((await call('GET', '/api/me', undefined, admin.json.access)).json.user.admin).toBe(true);
    const user = await call('POST', '/api/auth/register', { username: 'normal', password: 'password123' });
    expect(user.json.user.admin).toBeUndefined();

    expect((await call('GET', '/api/admin/feedback')).status).toBe(401);
    expect((await call('GET', '/api/admin/feedback', undefined, user.json.access)).status).toBe(403);
    expect((await call('PATCH', '/api/admin/feedback', { id: 1, done: true }, user.json.access)).status).toBe(403);

    const sent = await call('POST', '/api/feedback', { category: '건의', text: '보스 체력 좀 줄여 주세요', version: '0.13.0' }, user.json.access);
    expect(sent.status).toBe(200);
    clock += 1000;
    await call('POST', '/api/feedback', { category: '문의', text: '  저장이 안 돼요  ', name: '지나가던 학부생' });

    const list = await call('GET', '/api/admin/feedback', undefined, admin.json.access);
    expect(list.status).toBe(200);
    expect(list.json.open).toBe(2);
    expect(list.json.items.map((f: { text: string }) => f.text)).toEqual(['저장이 안 돼요', '보스 체력 좀 줄여 주세요']);
    expect(list.json.items[0]).toMatchObject({ category: '문의', author: '지나가던 학부생', guest: true, done: false });
    expect(list.json.items[1]).toMatchObject({ category: '건의', author: 'normal', guest: false, version: '0.13.0' });

    const id = list.json.items[1].id as number;
    expect((await call('PATCH', '/api/admin/feedback', { id, done: true }, admin.json.access)).status).toBe(200);
    let after = await call('GET', '/api/admin/feedback', undefined, admin.json.access);
    expect(after.json.open).toBe(1);
    expect(after.json.items[1]).toMatchObject({ done: true, doneAt: clock });
    await call('PATCH', '/api/admin/feedback', { id, done: false }, admin.json.access);
    after = await call('GET', '/api/admin/feedback', undefined, admin.json.access);
    expect(after.json.items[1]).toMatchObject({ done: false, doneAt: null });
    expect((await call('PATCH', '/api/admin/feedback', { id: 999, done: true }, admin.json.access)).status).toBe(404);
    expect((await call('PATCH', '/api/admin/feedback', { id, done: 'yes' }, admin.json.access)).status).toBe(400);
  });

  it('의견 보내기: 입력 검사와 10분 5회 한도', async () => {
    expect((await call('POST', '/api/feedback', { category: '잡담', text: '안녕' })).status).toBe(400);
    expect((await call('POST', '/api/feedback', { category: '버그', text: '   ' })).status).toBe(400);
    expect((await call('POST', '/api/feedback', { category: '버그', text: 'x'.repeat(1001) })).status).toBe(400);
    // 위 3번도 한도에 센다 → 2번 더 보내면 6번째부터 막힌다
    expect((await call('POST', '/api/feedback', { category: '버그', text: '한 번' })).status).toBe(200);
    expect((await call('POST', '/api/feedback', { category: '버그', text: '두 번' })).status).toBe(200);
    expect((await call('POST', '/api/feedback', { category: '버그', text: '세 번' })).status).toBe(429);
    // 계정은 IP와 따로 센다
    const reg = await call('POST', '/api/auth/register', { username: 'fbuser', password: 'password123' });
    expect((await call('POST', '/api/feedback', { category: '버그', text: '계정으로' }, reg.json.access)).status).toBe(200);
    clock += 10 * 60 * 1000 + 1;
    expect((await call('POST', '/api/feedback', { category: '버그', text: '다시' })).status).toBe(200);
  });

  it('PATCH도 CORS 허용 메서드에 들어 있다', async () => {
    const res = await fetch(base + '/api/admin/feedback', { method: 'OPTIONS', headers: { Origin: ORIGIN } });
    expect(res.status).toBe(204);
    expect(res.headers.get('access-control-allow-methods')).toContain('PATCH');
  });

  it('순위표 꾸미기: 칭호와 대표 캐릭터·차림을 모양만 검사해 넘긴다', () => {
    const look = rankLook({
      cosmetics: { title: 't-reviewer2', avatar: 'coder', outfits: { coder: { hat: 'h-cap', color: 'c-mint' }, hero: { hat: 'h-crown' } } },
      units: { coder: { level: 5, tier: 2 } },
    });
    expect(look).toEqual({ badge: 't-reviewer2', avatar: 'coder', avatarTier: 2, fit: { hat: 'h-cap', color: 'c-mint' } });
    // 대표 캐릭터가 없으면 주인공 차림
    expect(rankLook({ cosmetics: { outfits: { hero: { hat: 'h-crown' } } } }).fit).toEqual({ hat: 'h-crown' });
    // 이상한 값은 버린다
    const bad = rankLook({ cosmetics: { title: '<script>', avatar: 'x'.repeat(99), outfits: 5 }, units: { x: { tier: 99 } } });
    expect(bad).toEqual({ badge: '', avatar: '', avatarTier: 1, fit: {} });
    expect(rankLook(null).badge).toBe('');
  });
  it('선물: 관리자가 여러 명에게 보내고, 받은 사람은 한 번만 받는다', async () => {
    const admin = await call('POST', '/api/auth/register', { username: 'apg0001', password: 'password123' });
    const kim = await call('POST', '/api/auth/register', { username: 'kim', password: 'password123' });
    const lee = await call('POST', '/api/auth/register', { username: 'lee', password: 'password123' });
    await call('PUT', '/api/save', { data: { v: 5, money: 300, gear: { tickets: 2 } }, version: 0 }, kim.json.access);

    // 관리자만
    expect((await call('GET', '/api/admin/players', undefined, kim.json.access)).status).toBe(403);
    expect((await call('POST', '/api/admin/gifts', { userIds: [kim.json.user.id], money: 1 }, kim.json.access)).status).toBe(403);

    const players = (await call('GET', '/api/admin/players', undefined, admin.json.access)).json.players as { id: number; username: string; money: number; tickets: number }[];
    expect(players).toHaveLength(3);
    expect(players.find((p) => p.username === 'kim')).toMatchObject({ money: 300, tickets: 2 });

    // 잘못된 선물은 거절
    expect((await call('POST', '/api/admin/gifts', { userIds: [], money: 1 }, admin.json.access)).status).toBe(400);
    expect((await call('POST', '/api/admin/gifts', { userIds: [kim.json.user.id] }, admin.json.access)).status).toBe(400);
    expect((await call('POST', '/api/admin/gifts', { userIds: [kim.json.user.id], money: -5 }, admin.json.access)).status).toBe(400);
    expect((await call('POST', '/api/admin/gifts', { userIds: [kim.json.user.id], tickets: 1.5 }, admin.json.access)).status).toBe(400);

    const sent = await call('POST', '/api/admin/gifts', { userIds: [kim.json.user.id, lee.json.user.id, kim.json.user.id, 9999], money: 100000, tickets: 10, message: '개발자의 특권' }, admin.json.access);
    expect(sent.json).toEqual({ ok: true, sent: 2 });
    await call('POST', '/api/admin/gifts', { userIds: [kim.json.user.id], tickets: 3 }, admin.json.access);

    const box = (await call('GET', '/api/gifts', undefined, kim.json.access)).json.items;
    expect(box).toHaveLength(2);
    expect(box[0]).toMatchObject({ money: 100000, tickets: 10, message: '개발자의 특권', sender: 'apg0001' });

    // 하나만 받기 → 나머지 받기 → 다시 받아도 0
    const one = await call('POST', '/api/gifts/claim', { ids: [box[1].id] }, kim.json.access);
    expect(one.json).toMatchObject({ money: 0, tickets: 3 });
    const rest = await call('POST', '/api/gifts/claim', {}, kim.json.access);
    expect(rest.json).toMatchObject({ money: 100000, tickets: 10 });
    const again = await call('POST', '/api/gifts/claim', {}, kim.json.access);
    expect(again.json).toMatchObject({ items: [], money: 0, tickets: 0 });
    // 남의 선물은 받을 수 없다
    const leeBox = (await call('GET', '/api/gifts', undefined, lee.json.access)).json.items;
    expect((await call('POST', '/api/gifts/claim', { ids: [leeBox[0].id] }, kim.json.access)).json.items).toEqual([]);
    expect((await call('GET', '/api/gifts')).status).toBe(401);

    const log = (await call('GET', '/api/admin/gifts', undefined, admin.json.access)).json.items;
    expect(log).toHaveLength(3);
    expect(log.filter((g: { claimedAt: number | null }) => g.claimedAt).length).toBe(2);
  });
});
