import { beforeEach, describe, expect, it } from 'vitest';
import { LocalSaveStore, ProfileManager, sanitizeName } from '../src/save/store';
import { newSave } from '../src/sim/progression';

// Node 환경용 간단한 localStorage 대체
class MemStorage {
  private m = new Map<string, string>();
  getItem(k: string) { return this.m.get(k) ?? null; }
  setItem(k: string, v: string) { this.m.set(k, v); }
  removeItem(k: string) { this.m.delete(k); }
  clear() { this.m.clear(); }
}

describe('프로필과 저장', () => {
  beforeEach(() => {
    (globalThis as unknown as { localStorage: MemStorage }).localStorage = new MemStorage();
  });

  it('프로필별로 따로 저장하고 마지막 프로필로 자동 접속한다', async () => {
    const store = new LocalSaveStore();
    const pm = new ProfileManager(store);
    const a = pm.create('김석사');
    const b = pm.create('박박사');
    const sa = newSave();
    sa.money = 100;
    const sb = newSave();
    sb.money = 999;
    await store.save(a.id, sa);
    await store.save(b.id, sb);
    pm.remember(b);
    expect(pm.lastUsed()?.name).toBe('박박사');
    expect((await store.load(a.id))?.money).toBe(100);
    expect((await store.load(b.id))?.money).toBe(999);
    await pm.remove(b.id);
    expect(pm.lastUsed()).toBeNull();
    expect(await store.load(b.id)).toBeNull();
    expect(pm.list().map((p) => p.name)).toEqual(['김석사']);
  });

  it('깨진 저장 데이터는 무시한다', async () => {
    localStorage.setItem('mw:save:x', '{not json');
    expect(await new LocalSaveStore().load('x')).toBeNull();
  });

  it('이름을 정리한다', () => {
    expect(sanitizeName('  <b>김석사</b>  ')).toBe('b김석사/b');
    expect(sanitizeName('   ')).toBe('대학원생');
    expect(sanitizeName('가'.repeat(30))).toHaveLength(12);
  });
});

describe('계정 저장 충돌 해결', async () => {
  const { pickBetter, progressScore } = await import('../src/save/remote');
  it('별·성장이 더 많은 쪽을 남기고, 같으면 최근 것을 남긴다', () => {
    const a = newSave();
    const b = newSave();
    a.stars['1-1'] = 3;
    b.money = 99_999;
    expect(progressScore(a)).toBeGreaterThan(progressScore(b));
    expect(pickBetter(a, b)).toBe(a);
    expect(pickBetter(b, a)).toBe(a);
    const c = newSave();
    const d = newSave();
    c.updatedAt = 1;
    d.updatedAt = 2;
    expect(pickBetter(c, d)).toBe(d);
  });
});
