import { DatabaseSync } from 'node:sqlite';

export interface UserRow {
  id: number;
  username: string;
  pass_hash: string;
  created_at: number;
  /** 화면에 보이는 이름. 비어 있으면 아이디를 쓴다. */
  nickname: string | null;
}

export type FeedbackCategory = '문의' | '건의' | '버그';

export interface FeedbackRow {
  id: number;
  category: FeedbackCategory;
  text: string;
  user_id: number | null;
  /** 보낸 사람: 계정이면 아이디(닉네임), 게스트면 적은 이름 */
  author: string;
  guest: number;
  version: string;
  created_at: number;
  done: number;
  done_at: number | null;
}

export interface SaveRow {
  data: string;
  version: number;
  updated_at: number;
}

/** SQLite 저장소. 파일 경로에 ':memory:'를 주면 테스트용 메모리 DB가 된다. */
export class Store {
  readonly db: DatabaseSync;

  constructor(path: string) {
    this.db = new DatabaseSync(path);
    this.db.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA foreign_keys = ON;
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE COLLATE NOCASE,
        pass_hash TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        token_hash TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        expires_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS refresh_user ON refresh_tokens(user_id);
      CREATE TABLE IF NOT EXISTS saves (
        user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        data TEXT NOT NULL,
        version INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS feedback (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category TEXT NOT NULL,
        text TEXT NOT NULL,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        author TEXT NOT NULL,
        guest INTEGER NOT NULL DEFAULT 0,
        version TEXT NOT NULL DEFAULT '',
        created_at INTEGER NOT NULL,
        done INTEGER NOT NULL DEFAULT 0,
        done_at INTEGER
      );
      CREATE INDEX IF NOT EXISTS feedback_created ON feedback(created_at);
    `);
    // 예전 DB에는 닉네임 칸이 없다: 있을 때만 건너뛰고 없으면 추가한다
    const cols = this.db.prepare('PRAGMA table_info(users)').all() as { name: string }[];
    if (!cols.some((c) => c.name === 'nickname')) this.db.exec('ALTER TABLE users ADD COLUMN nickname TEXT');
  }

  createUser(username: string, passHash: string, now: number): UserRow | null {
    try {
      const r = this.db.prepare('INSERT INTO users (username, pass_hash, created_at) VALUES (?, ?, ?)').run(username, passHash, now);
      return { id: Number(r.lastInsertRowid), username, pass_hash: passHash, created_at: now, nickname: null };
    } catch {
      return null; // 이미 있는 이름
    }
  }

  userByName(username: string): UserRow | undefined {
    return this.db.prepare('SELECT * FROM users WHERE username = ?').get(username) as UserRow | undefined;
  }

  userById(id: number): UserRow | undefined {
    return this.db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow | undefined;
  }

  setNickname(id: number, nickname: string): void {
    this.db.prepare('UPDATE users SET nickname = ? WHERE id = ?').run(nickname, id);
  }

  addRefresh(tokenHash: string, userId: number, expiresAt: number): void {
    this.db.prepare('INSERT INTO refresh_tokens (token_hash, user_id, expires_at) VALUES (?, ?, ?)').run(tokenHash, userId, expiresAt);
  }

  /** 갱신 토큰을 꺼내면서 지운다(1회용). 만료됐으면 null. */
  takeRefresh(tokenHash: string, now: number): number | null {
    const row = this.db.prepare('SELECT user_id, expires_at FROM refresh_tokens WHERE token_hash = ?').get(tokenHash) as { user_id: number; expires_at: number } | undefined;
    if (!row) return null;
    this.db.prepare('DELETE FROM refresh_tokens WHERE token_hash = ?').run(tokenHash);
    return row.expires_at > now ? row.user_id : null;
  }

  dropRefresh(tokenHash: string): void {
    this.db.prepare('DELETE FROM refresh_tokens WHERE token_hash = ?').run(tokenHash);
  }

  pruneRefresh(now: number): void {
    this.db.prepare('DELETE FROM refresh_tokens WHERE expires_at <= ?').run(now);
  }

  getSave(userId: number): SaveRow | undefined {
    return this.db.prepare('SELECT data, version, updated_at FROM saves WHERE user_id = ?').get(userId) as SaveRow | undefined;
  }

  /** 기대 버전이 맞을 때만 저장한다. 성공 시 새 버전, 충돌 시 null. */
  putSave(userId: number, data: string, expected: number, now: number): number | null {
    const cur = this.getSave(userId);
    const curVersion = cur?.version ?? 0;
    if (curVersion !== expected) return null;
    const next = curVersion + 1;
    this.db.prepare(`INSERT INTO saves (user_id, data, version, updated_at) VALUES (?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET data = excluded.data, version = excluded.version, updated_at = excluded.updated_at`).run(userId, data, next, now);
    return next;
  }

  /** 순위 계산용: 저장이 있는 모든 사용자 */
  allSaves(): { user_id: number; username: string; nickname: string | null; data: string; updated_at: number }[] {
    return this.db.prepare('SELECT s.user_id, u.username, u.nickname, s.data, s.updated_at FROM saves s JOIN users u ON u.id = s.user_id').all() as { user_id: number; username: string; nickname: string | null; data: string; updated_at: number }[];
  }

  addFeedback(f: { category: FeedbackCategory; text: string; userId: number | null; author: string; guest: boolean; version: string; now: number }): number {
    const r = this.db.prepare('INSERT INTO feedback (category, text, user_id, author, guest, version, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(f.category, f.text, f.userId, f.author, f.guest ? 1 : 0, f.version, f.now);
    return Number(r.lastInsertRowid);
  }

  /** 최신순 의견 목록 */
  listFeedback(limit: number): FeedbackRow[] {
    return this.db.prepare('SELECT * FROM feedback ORDER BY created_at DESC, id DESC LIMIT ?').all(limit) as unknown as FeedbackRow[];
  }

  /** 처리됨 표시를 바꾼다. 없는 번호면 false. */
  markFeedback(id: number, done: boolean, now: number): boolean {
    const r = this.db.prepare('UPDATE feedback SET done = ?, done_at = ? WHERE id = ?').run(done ? 1 : 0, done ? now : null, id);
    return Number(r.changes) > 0;
  }

  close(): void {
    this.db.close();
  }
}
