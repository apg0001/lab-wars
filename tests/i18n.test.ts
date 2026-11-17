import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { detectLang, getLang, localizedEntries, setLang, tr } from '../src/i18n';
import { RANK_TITLES_EN, SERVER_ERRORS_EN, rankTitle, serverError } from '../src/i18n/server';
import { STORY_EN, bannersOf } from '../src/story/en';
import { SCENES } from '../src/story/script';
import { UNITS } from '../src/data/units';
import { ENEMIES } from '../src/data/enemies';
import { CHAPTERS, SIDE_CHAPTERS, SIDE_STAGES, STAGES, endlessStage } from '../src/data/stages';
import { FACILITIES, SKILLS } from '../src/data/upgrades';
import { CARDS, RARITY_LABEL } from '../src/data/cards';
import { COSMETICS, GRADE_INFO } from '../src/data/cosmetics';
import { PATCH_NOTES } from '../src/data/patch-notes';

const HANGUL = /[가-힣]/;
/** {name}, {coin} 같은 표시를 정렬해서 모은다 */
const tokens = (s: string): string[] => (s.match(/\{[A-Za-z0-9]+\}/g) ?? []).sort();

afterEach(() => setLang('ko', false));

describe('언어 감지', () => {
  it('첫 선호 언어가 ko로 시작하면 한국어, 아니면 영어', () => {
    expect(detectLang(['ko-KR', 'en-US'])).toBe('ko');
    expect(detectLang(['ko'])).toBe('ko');
    expect(detectLang(['KO-kr'])).toBe('ko');
    expect(detectLang(['en-US', 'ko-KR'])).toBe('en');
    expect(detectLang(['ja-JP'])).toBe('en');
    expect(detectLang(['', 'ko-KR'])).toBe('ko');
    expect(detectLang([])).toBe('en');
    expect(detectLang(undefined)).toBe('en');
  });

  it('테스트(브라우저 밖)는 원문 한국어로 시작하고, 바꾸면 tr과 데이터가 함께 바뀐다', () => {
    expect(getLang()).toBe('ko');
    expect(tr('가', 'A')).toBe('가');
    setLang('en', false);
    expect(tr('가', 'A')).toBe('A');
    expect(UNITS[0]!.names).toEqual(['Undergrad Rookie', "Master's Rookie", 'PhD Rookie']);
    expect(SCENES['ch1-intro']!.lines[0]!.text).not.toMatch(HANGUL);
    setLang('ko', false);
    expect(UNITS[0]!.names[0]).toBe('학부 막내');
    expect(SCENES['ch1-intro']!.lines[0]!.text).toMatch(HANGUL);
  });
});

describe('데이터 영어 번역', () => {
  const strings = (o: unknown): string[] => (typeof o === 'string' ? [o] : Array.isArray(o) ? o.flatMap(strings) : []);

  it('등록된 모든 항목이 영어를 갖고, 아이콘·{name} 표시가 원문과 같다', () => {
    const entries = localizedEntries();
    expect(entries.length).toBeGreaterThan(500);
    for (const e of entries) {
      for (const [k, en] of Object.entries(e.en)) {
        const ko = e.ko[k];
        const ks = strings(ko);
        const es = strings(en);
        expect(es.length, `${k}: ${String(ko)}`).toBe(ks.length);
        es.forEach((s, i) => {
          expect(s, `${k}: ${ks[i]}`).not.toMatch(HANGUL);
          if (ks[i]) expect(s.trim().length, `${k}: ${ks[i]}`).toBeGreaterThan(0);
          expect(tokens(s), `${k}: ${ks[i]} → ${s}`).toEqual(tokens(ks[i] ?? ''));
        });
      }
    }
  });

  it('영어로 바꾸면 화면에 보이는 데이터에 한글이 남지 않는다', () => {
    setLang('en', false);
    const shown: string[] = [
      ...UNITS.flatMap((u) => [...u.names, u.role, u.desc]),
      ...ENEMIES.flatMap((e) => [e.name, e.role]),
      ...CHAPTERS.flatMap((c) => [c.name, c.subtitle]),
      ...SIDE_CHAPTERS.flatMap((c) => [c.name, c.subtitle, c.rule]),
      ...[...STAGES, ...SIDE_STAGES].flatMap((s) => [s.name, s.note ?? '']),
      ...SKILLS.flatMap((s) => [s.name, s.desc, s.lore]),
      ...FACILITIES.flatMap((f) => [f.name, f.desc]),
      ...CARDS.flatMap((c) => [c.name, c.desc, c.chip, c.flavor]),
      ...Object.values(RARITY_LABEL),
      ...COSMETICS.flatMap((c) => [c.name, c.desc]),
      ...Object.values(GRADE_INFO).flatMap((g) => [g.label, g.rarity]),
      ...PATCH_NOTES.flatMap((n) => [n.title, ...n.items]),
      endlessStage(5).name, endlessStage(5).note ?? '',
    ];
    for (const s of shown) expect(s).not.toMatch(HANGUL);
    expect(GRADE_INFO.accept.label).toBe('Accept');
    expect(GRADE_INFO.reject.label).toBe('Reject');
  });

  it('모든 패치노트 항목에 영어가 있다', () => {
    for (const n of PATCH_NOTES) {
      expect(n.en, n.version).toBeTruthy();
      expect(n.en!.items.length, n.version).toBe(n.items.length);
    }
  });
});

describe('스토리 영어 대본', () => {
  it('모든 장면·대사·현수막에 영어가 있고 {name}·아이콘 표시가 같다', () => {
    const ids = Object.keys(SCENES);
    expect(ids.length).toBeGreaterThan(80);
    expect(Object.keys(STORY_EN).sort()).toEqual([...ids].sort());
    let lines = 0;
    for (const id of ids) {
      const sc = SCENES[id]!;
      const en = STORY_EN[id]!;
      expect(en.lines.length, id).toBe(sc.lines.length);
      expect(en.title !== undefined, `${id} title`).toBe(sc.title !== undefined);
      expect(en.sign !== undefined, `${id} sign`).toBe(sc.sign !== undefined);
      expect((en.banners ?? []).length, `${id} banners`).toBe(bannersOf(sc).length);
      sc.lines.forEach((l, i) => {
        const e = en.lines[i]!;
        expect(e.trim().length, `${id}#${i}`).toBeGreaterThan(0);
        expect(e, `${id}#${i}`).not.toMatch(HANGUL);
        expect(tokens(e), `${id}#${i}: ${l.text} → ${e}`).toEqual(tokens(l.text));
        lines++;
      });
      for (const s of [en.title, en.sign, ...(en.banners ?? [])]) if (s) expect(s, id).not.toMatch(HANGUL);
    }
    expect(lines).toBeGreaterThan(400);
  });
});

describe('서버 글자', () => {
  const server = readFileSync(join(__dirname, '../server/src/app.ts'), 'utf8');

  it('서버가 보내는 오류 메시지는 모두 영어 번역이 있다', () => {
    const msgs = [...server.matchAll(/HttpError\(\d+, '([^']+)'\)/g), ...server.matchAll(/msg = '([^']+)'/g), ...server.matchAll(/error: '([^']+)'/g)].map((m) => m[1]!);
    expect(msgs.length).toBeGreaterThan(10);
    for (const m of msgs) expect(SERVER_ERRORS_EN[m], m).toBeTruthy();
    setLang('en', false);
    expect(serverError(401, '아이디 또는 비밀번호가 맞지 않아요.')).toBe('Wrong username or password.');
    expect(serverError(429, '처음 보는 메시지')).toMatch(/Too many requests/);
    expect(serverError(500, undefined)).toBe('Request failed (500)');
  });

  it('순위 칭호는 모두 영어 번역이 있다', () => {
    const titles = /TITLES\s*=\s*\[([^\]]+)\]/.exec(server)![1]!.match(/'([^']+)'/g)!.map((s) => s.slice(1, -1));
    for (const t of [...titles, '교수']) expect(RANK_TITLES_EN[t], t).toBeTruthy();
    setLang('en', false);
    expect(rankTitle('교수')).toBe('Professor');
  });
});

describe('UI 코드', () => {
  /** 화면에 나가는 글자 중 한글이 tr()을 거치지 않은 줄을 찾는다 (주석·허용 목록 제외) */
  it('UI·그리기 코드의 한글 글자는 tr()로 영어와 함께 적는다', () => {
    const root = join(__dirname, '../src');
    const files = [
      ...readdirSync(join(root, 'ui')).map((f) => `ui/${f}`),
      ...readdirSync(join(root, 'render')).map((f) => `render/${f}`),
      'sim/battle.ts', 'sim/progression.ts', 'story/player.ts', 'save/store.ts', 'save/remote.ts',
    ].filter((f) => f.endsWith('.ts'));
    const allowed = [
      /'한국어'/, // 언어 선택 버튼은 그 언어 이름 그대로
      /FeedbackCategory/, // 서버 값 (화면에는 feedbackLabel)
      /label\(ctx, '[^']+', [-\d.]+, [-\d.]+, '[^']+'\)/, // 캐릭터 그림 글자: 영어를 함께 넘긴다
      /getLang\(\) === 'en' \?/,
    ];
    const bad: string[] = [];
    for (const f of files) {
      readFileSync(join(root, f), 'utf8').split('\n').forEach((raw, i) => {
        const line = raw.replace(/\/\/.*$/, '').trim();
        if (!HANGUL.test(line) || /^(\*|\/\*)/.test(line)) return;
        if (!/['"`][^'"`]*[가-힣]/.test(line)) return;
        if (line.includes('tr(') || allowed.some((re) => re.test(line))) return;
        bad.push(`${f}:${i + 1}: ${line}`);
      });
    }
    expect(bad).toEqual([]);
  });
});
