import { COURSE_BY_ID, GRADES, GRADE_POINT, MAJORS, RETAKE_CAP, RETAKE_FROM, type CourseDef, type Grade } from '../data/major';
import { isCleared, type SaveData } from './progression';

/**
 * 전공 모드 학점: 이기면 연구실 체력으로 A+~D0, 지면 F.
 * 들었던 과목은 학점과 상관없이 몇 번이든 재수강할 수 있고, 더 좋은 학점이 남는다 (상한 없음).
 */

/** 전공 모드가 열리는 때: 1장 보스(전공 교수님 면담)를 깬 뒤 = 전공 배정 */
export const MAJOR_UNLOCK_STAGE = '1-10';
export const isMajorOpen = (save: SaveData): boolean => isCleared(save, MAJOR_UNLOCK_STAGE);

const rank = (g: Grade): number => GRADES.indexOf(g);
/** a가 b보다 좋은 학점인가 */
export const better = (a: Grade, b: Grade): boolean => rank(a) < rank(b);

export function gradeFor(win: boolean, baseHpRatio: number): Grade {
  if (!win) return 'F';
  const steps: [number, Grade][] = [[0.9, 'A+'], [0.8, 'A0'], [0.7, 'B+'], [0.6, 'B0'], [0.5, 'C+'], [0.4, 'C0'], [0.25, 'D+']];
  for (const [at, g] of steps) if (baseHpRatio >= at) return g;
  return 'D0';
}

export const passed = (g: Grade | undefined): boolean => !!g && g !== 'F';

/** 수강 방식: 처음 듣기 / 재수강(몇 번이든, 더 좋은 학점이 남음). 'review'는 예전 규칙의 흔적으로 지금은 쓰지 않는다 */
export type TakeMode = 'first' | 'retake' | 'review';
export function takeMode(save: SaveData, courseId: string): TakeMode {
  const g = save.grades[courseId];
  if (!g) return 'first';
  return rank(g) >= rank(RETAKE_FROM) ? 'retake' : 'review';
}

export interface GradeResult {
  /** 이번 판에서 받은 학점 (재수강 상한 적용 후) */
  got: Grade;
  /** 상한 적용 전 학점 */
  raw: Grade;
  mode: TakeMode;
  /** 저장된 최고 학점 */
  best: Grade;
  improved: boolean;
}

/** 결과를 학점으로 남긴다 */
export function recordGrade(save: SaveData, courseId: string, win: boolean, baseHpRatio: number): GradeResult {
  const mode = takeMode(save, courseId);
  const raw = gradeFor(win, baseHpRatio);
  const got = mode === 'retake' && better(raw, RETAKE_CAP) ? RETAKE_CAP : raw;
  const prev = save.grades[courseId];
  let best = prev ?? got;
  if (mode === 'first' || (mode === 'retake' && better(got, prev!))) best = got;
  const improved = best !== prev;
  save.grades[courseId] = best;
  save.updatedAt = Date.now();
  return { got, raw, mode, best, improved };
}

/** 이수 학점 (F 제외) */
export function earnedCredits(save: SaveData): number {
  return Object.entries(save.grades).reduce((a, [id, g]) => a + (passed(g) ? COURSE_BY_ID[id]?.credits ?? 0 : 0), 0);
}

/** 평점 평균 (F 포함, 4.5 만점). 들은 과목이 없으면 null */
export function gpa(save: SaveData): number | null {
  let pts = 0;
  let cr = 0;
  for (const [id, g] of Object.entries(save.grades)) {
    const c = COURSE_BY_ID[id];
    if (!c) continue;
    pts += GRADE_POINT[g] * c.credits;
    cr += c.credits;
  }
  return cr ? Math.round((pts / cr) * 100) / 100 : null;
}

/** 학년이 열리는 데 필요한 이수 학점: 2학년 12, 3학년 30, 4학년 51 */
export const YEAR_CREDITS = [0, 12, 30, 51];

/** 과목이 열렸는가: 전공 배정 + 학년 학점 + 선수과목 이수 */
export function isCourseOpen(save: SaveData, courseId: string): boolean {
  const co = COURSE_BY_ID[courseId];
  if (!co || !isMajorOpen(save)) return false;
  if (save.grades[courseId]) return true;
  return lockReason(save, co) === null;
}

/** 아직 못 듣는 이유 (들을 수 있으면 null) */
export function lockReason(save: SaveData, co: CourseDef): { kind: 'year'; need: number } | { kind: 'prereq'; missing: string[] } | null {
  const need = YEAR_CREDITS[co.year - 1]!;
  if (earnedCredits(save) < need) return { kind: 'year', need };
  const missing = co.prereq.filter((id) => !passed(save.grades[id]));
  return missing.length ? { kind: 'prereq', missing } : null;
}

/** 졸업 요건: 전 과목 이수 */
export function isGraduated(save: SaveData, majorId = 'ice'): boolean {
  const m = MAJORS.find((x) => x.id === majorId);
  return !!m && m.courses.every((co) => passed(save.grades[co.id]));
}
