import { describe, expect, it } from 'vitest';
import { newSave, normalizeSave, isStageOpen } from '../src/sim/progression';
import { earnedCredits, gpa, gradeFor, isCourseOpen, isGraduated, lockReason, recordGrade, takeMode } from '../src/sim/grades';
import { COURSE_BY_ID, ICE_COURSES, PROFESSORS } from '../src/data/major';
import { COURSE_CONTENT } from '../src/data/courses';
import { COURSE_STAGES, COURSE_STAGE_BY_COURSE } from '../src/data/stages';
import { ENEMY_BY_ID } from '../src/data/enemies';
import { Battle } from '../src/sim/battle';
import { makeLoadout } from '../src/sim/progression';
import { playBot } from '../src/sim/bot';
import { ICON_NAMES } from '../src/render/doodle';
import { rankGpa } from '../server/src/app';

const opened = () => {
  const s = newSave();
  s.stars['1-10'] = 3;
  return s;
};

describe('전공 모드 학점', () => {
  it('연구실 체력으로 학점, 지면 F', () => {
    expect(gradeFor(true, 0.95)).toBe('A+');
    expect(gradeFor(true, 0.8)).toBe('A0');
    expect(gradeFor(true, 0.55)).toBe('C+');
    expect(gradeFor(true, 0.01)).toBe('D0');
    expect(gradeFor(false, 1)).toBe('F');
  });

  it('F·C+ 이하는 재수강(최고 A0), B0 이상은 복습(학점 그대로)', () => {
    const s = opened();
    expect(takeMode(s, 'ict')).toBe('first');
    expect(recordGrade(s, 'ict', false, 0.5).best).toBe('F');
    expect(takeMode(s, 'ict')).toBe('retake');
    const r = recordGrade(s, 'ict', true, 1);
    expect(r).toMatchObject({ raw: 'A+', got: 'A0', best: 'A0', improved: true });
    expect(takeMode(s, 'ict')).toBe('review');
    // 복습은 더 잘해도 못해도 그대로
    expect(recordGrade(s, 'ict', false, 0).best).toBe('A0');
    // 재수강에서 더 못 받으면 기존 학점 유지
    recordGrade(s, 'progbasic', true, 0.45); // C0
    expect(recordGrade(s, 'progbasic', true, 0.1)).toMatchObject({ got: 'D0', best: 'C0', improved: false });
  });

  it('평점은 F까지 넣어 계산하고, 이수 학점은 F를 뺀다', () => {
    const s = opened();
    recordGrade(s, 'ict', true, 1); // A+ 4.5
    recordGrade(s, 'progbasic', false, 0); // F 0
    expect(gpa(s)).toBe(2.25);
    expect(earnedCredits(s)).toBe(3);
  });

  it('전공 배정(1-10) 뒤에 열리고, 학년 학점과 선수과목을 따진다', () => {
    const s = newSave();
    expect(isCourseOpen(s, 'ict')).toBe(false);
    s.stars['1-10'] = 1;
    expect(isCourseOpen(s, 'ict')).toBe(true);
    expect(isCourseOpen(s, 'iceprog')).toBe(false); // 선수: 프로그래밍기초와실습
    expect(lockReason(s, COURSE_BY_ID.iceprog!)).toEqual({ kind: 'prereq', missing: ['progbasic'] });
    recordGrade(s, 'progbasic', true, 0.3);
    expect(isCourseOpen(s, 'iceprog')).toBe(true);
    expect(lockReason(s, COURSE_BY_ID.ds!)).toEqual({ kind: 'year', need: 12 });
    for (const id of ['ict', 'dataprog', 'adventure']) recordGrade(s, id, true, 1);
    expect(isCourseOpen(s, 'ds')).toBe(true);
    expect(isStageOpen(s, COURSE_STAGE_BY_COURSE.ds!)).toBe(true);
  });

  it('저장: 학점과 과목 별은 남고 모르는 과목·학점은 버린다, 옛 저장은 빈 학점', () => {
    const s = opened();
    recordGrade(s, 'ict', true, 1);
    s.stars['M-ict'] = 3;
    const back = normalizeSave(JSON.parse(JSON.stringify({ ...s, grades: { ...s.grades, nope: 'A+', ds: 'Z' } })));
    expect(back.grades).toEqual({ ict: 'A+' });
    expect(back.stars['M-ict']).toBe(3);
    const old = normalizeSave({ v: 4, money: 10, stars: {} });
    expect(old.grades).toEqual({});
  });

  it('전 과목 이수하면 졸업', () => {
    const s = opened();
    for (const co of ICE_COURSES) recordGrade(s, co.id, true, 0.3);
    expect(isGraduated(s)).toBe(true);
  });

  it('서버 순위표 평점: 모르는 값은 버린다', () => {
    expect(rankGpa({ grades: { ict: 'A+', ds: 'F', bad: 'Q', 'x y': 'A0' } })).toEqual({ gpa: 2.25, credits: 3 });
    expect(rankGpa({})).toEqual({ gpa: null, credits: 0 });
    expect(rankGpa(null)).toEqual({ gpa: null, credits: 0 });
  });
});

describe('전공 과목 내용', () => {
  it('모든 과목에 내용·스테이지·대표 적·교수님 보스가 있다', () => {
    for (const co of ICE_COURSES) {
      expect(COURSE_CONTENT[co.id], co.id).toBeTruthy();
      const st = COURSE_STAGE_BY_COURSE[co.id]!;
      expect(st, co.id).toBeTruthy();
      expect(ENEMY_BY_ID[`ce-${co.id}`], co.id).toBeTruthy();
      expect(ENEMY_BY_ID[`boss-${co.id}`]?.boss, co.id).toBeTruthy();
      for (const p of st.pool) expect(ENEMY_BY_ID[p.id], `${co.id} pool ${p.id}`).toBeTruthy();
    }
    expect(COURSE_STAGES).toHaveLength(ICE_COURSES.length);
    expect(new Set(ICE_COURSES.map((c) => c.prof)).size).toBe(PROFESSORS.length);
  });

  it('글자 속 아이콘 표시는 모두 있는 아이콘이다', () => {
    const known = new Set(ICON_NAMES);
    for (const [id, ct] of Object.entries(COURSE_CONTENT)) {
      for (const text of [ct.rule, ct.desc, ct.quote, ct.en.rule, ct.en.desc, ct.en.quote, ct.foe.desc, ct.foe.en.desc]) {
        for (const m of text.matchAll(/\{([a-zA-Z0-9]+)\}/g)) expect(known.has(m[1]!), `${id}: {${m[1]}}`).toBe(true);
      }
    }
  });

  it('과목 전투는 끝까지 돌고, 같은 씨앗이면 같은 결과다', { timeout: 300_000 }, () => {
    const strong = newSave();
    for (const st of Object.keys(strong.stars)) strong.stars[st] = 3;
    const run = (id: string) => {
      const b = new Battle(COURSE_STAGE_BY_COURSE[id]!, makeLoadout(strong), 11);
      playBot(b, 45);
      return [b.result, b.kills, Math.round(b.enemy.hp), Math.round(b.ally.hp)];
    };
    for (const co of ICE_COURSES) {
      const a = run(co.id);
      expect(a, co.id).toEqual(run(co.id));
    }
  });
});
