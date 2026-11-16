import { normalizeSave, type SaveData } from '../sim/progression';

/**
 * 저장소 추상화. 지금은 기기 내 저장(localStorage)만 있고,
 * 로그인 기능(#6)에서 서버 계정 저장소를 같은 인터페이스로 추가한다.
 */
export interface SaveStore {
  load(profileId: string): Promise<SaveData | null>;
  save(profileId: string, data: SaveData): Promise<void>;
  remove(profileId: string): Promise<void>;
}

export interface Profile {
  id: string;
  name: string;
  /** guest: 이 기기에만 저장 / account: 서버 계정 (후속) */
  kind: 'guest' | 'account';
  createdAt: number;
}

const PREFIX = 'mw:';

/** localStorage가 막힌 환경(사생활 보호 모드 등)에서도 죽지 않도록 감싼다. */
const memory = new Map<string, string>();
export const kv = {
  get(key: string): string | null {
    try {
      return localStorage.getItem(PREFIX + key);
    } catch {
      return memory.get(key) ?? null;
    }
  },
  set(key: string, value: string): void {
    try {
      localStorage.setItem(PREFIX + key, value);
    } catch {
      memory.set(key, value);
    }
  },
  del(key: string): void {
    try {
      localStorage.removeItem(PREFIX + key);
    } catch {
      memory.delete(key);
    }
  },
};

export class LocalSaveStore implements SaveStore {
  async load(profileId: string): Promise<SaveData | null> {
    const raw = kv.get(`save:${profileId}`);
    if (!raw) return null;
    try {
      return normalizeSave(JSON.parse(raw));
    } catch {
      return null;
    }
  }

  async save(profileId: string, data: SaveData): Promise<void> {
    kv.set(`save:${profileId}`, JSON.stringify(data));
  }

  async remove(profileId: string): Promise<void> {
    kv.del(`save:${profileId}`);
  }
}

/** 기기에 등록된 프로필 목록과 자동 접속(마지막 프로필 기억)을 관리한다. */
export class ProfileManager {
  constructor(private readonly store: SaveStore) {}

  list(): Profile[] {
    try {
      const arr = JSON.parse(kv.get('profiles') ?? '[]') as Profile[];
      return Array.isArray(arr) ? arr.filter((p) => p && typeof p.id === 'string' && typeof p.name === 'string') : [];
    } catch {
      return [];
    }
  }

  private write(list: Profile[]): void {
    kv.set('profiles', JSON.stringify(list));
  }

  /** 자동 접속 대상: 마지막으로 쓴 프로필 */
  lastUsed(): Profile | null {
    const id = kv.get('session');
    return this.list().find((p) => p.id === id) ?? null;
  }

  remember(p: Profile): void {
    kv.set('session', p.id);
  }

  forget(): void {
    kv.del('session');
  }

  create(name: string): Profile {
    const clean = sanitizeName(name);
    const p: Profile = { id: makeId(), name: clean, kind: 'guest', createdAt: Date.now() };
    this.write([...this.list(), p]);
    return p;
  }

  rename(id: string, name: string): void {
    this.write(this.list().map((p) => (p.id === id ? { ...p, name: sanitizeName(name) } : p)));
  }

  async remove(id: string): Promise<void> {
    this.write(this.list().filter((p) => p.id !== id));
    await this.store.remove(id);
    if (kv.get('session') === id) this.forget();
  }
}

export function sanitizeName(name: string): string {
  const s = name.replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 12);
  return s || '대학원생';
}

function makeId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  }
}
