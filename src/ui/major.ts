import { h, fmt } from './dom';
import { powerCompare } from './power';
import { tr } from '../i18n';
import { portrait } from './icons';
import { ENEMY_BY_ID } from '../data/enemies';
import { COURSE_STAGE_BY_COURSE, type StageDef } from '../data/stages';
import { COURSE_CONTENT } from '../data/courses';
import { COURSE_BY_ID, GRADE_POINT, MAJORS, PROF_BY_ID, RETAKE_CAP, type CourseDef, type Grade } from '../data/major';
import { earnedCredits, gpa, isCourseOpen, isGraduated, lockReason, passed, takeMode, YEAR_CREDITS, type GradeResult } from '../sim/grades';
import type { SaveData } from '../sim/progression';

/**
 * 전공 모드 화면: 이수체계도처럼 1~4학년 × 1·2학기 칸에 과목 카드를 늘어놓는다.
 * 과목을 누르면 담당 교수님·첫 수업 한마디·스테이지 설명·규칙을 보여 주고 수강(전투)한다.
 */

export interface MajorCtx {
  save: SaveData;
  host: () => Element | null;
  start: (stage: StageDef) => void;
}

const GRADE_CLASS = (g: Grade): string => (g === 'F' ? 'f' : g[0]!.toLowerCase());

export const gradeChip = (g: Grade | undefined): HTMLElement | null => (g ? h(`span.grade-chip.g-${GRADE_CLASS(g)}`, {}, g) : null);

const termLabel = (co: CourseDef): string => tr(`${co.year}학년 ${co.sem}학기`, `Year ${co.year} · Term ${co.sem}`);

/** 위쪽 요약: 평점, 이수 학점, 졸업 */
export function majorSummary(save: SaveData): HTMLElement {
  const m = MAJORS[0]!;
  const g = gpa(save);
  const cr = earnedCredits(save);
  return h('div.major-summary', {},
    h('b', {}, tr(`{cap} ${m.name} 전공`, `{cap} Major: ${m.name}`)),
    h('span', {}, tr(`평점 ${g === null ? '-' : g.toFixed(2)} / 4.5`, `GPA ${g === null ? '-' : g.toFixed(2)} / 4.5`)),
    h('span', {}, tr(`이수 ${cr}/${m.gradCredits}학점`, `Credits ${cr}/${m.gradCredits}`)),
    isGraduated(save) ? h('span.grad-chip', {}, tr('{party} 졸업!', '{party} Graduated!')) : null,
  );
}

/** 이수체계도: 학년 칸(세로) × 학기 줄 */
export function majorBoard(ctx: MajorCtx): HTMLElement {
  const m = MAJORS[0]!;
  const cr = earnedCredits(ctx.save);
  const cols = [1, 2, 3, 4].map((year) => {
    const locked = cr < YEAR_CREDITS[year - 1]!;
    return h(`div.major-year${locked ? '.locked' : ''}`, {},
      h('div.year-head', {}, tr(`${year}학년`, `Year ${year}`), locked ? h('small', {}, tr(`{lock} ${YEAR_CREDITS[year - 1]}학점 이수 후`, `{lock} after ${YEAR_CREDITS[year - 1]} credits`)) : null),
      ...[1, 2].map((sem) => h('div.major-term', {},
        h('div.term-head', {}, tr(`${sem}학기`, `Term ${sem}`)),
        ...m.courses.filter((co) => co.year === year && co.sem === sem && COURSE_STAGE_BY_COURSE[co.id]).map((co) => courseCard(ctx, co)),
      )),
    );
  });
  return h('div.major-board', {}, ...cols);
}

function courseCard(ctx: MajorCtx, co: CourseDef): HTMLElement {
  const g = ctx.save.grades[co.id];
  const open = isCourseOpen(ctx.save, co.id);
  const why = open ? null : lockReason(ctx.save, co);
  const prof = PROF_BY_ID[co.prof];
  const sub = why?.kind === 'prereq'
    ? tr(`{lock} 선수: ${why.missing.map((id) => COURSE_BY_ID[id]!.name).join(', ')}`, `{lock} Needs: ${why.missing.map((id) => COURSE_BY_ID[id]!.name).join(', ')}`)
    : why ? '{lock}' : tr(`${prof.name} 교수님`, `Prof. ${prof.name}`);
  return h(`button.course-card${open ? '' : '.locked'}${g ? (passed(g) ? '.done' : '.failed') : ''}${co.design ? '.design' : ''}`, {
    disabled: open ? undefined : 'true',
    onclick: () => showCourseInfo(ctx, co),
    title: co.name,
  },
  h('span.course-name', {}, co.name),
  h('span.course-sub', {}, sub),
  gradeChip(g) ?? h('span.course-cr', {}, tr(`${co.credits}학점`, `${co.credits} cr`)),
  );
}

/** 과목 정보: 교수님, 첫 수업 한마디, 스테이지 설명, 규칙, 등장 적, 학점 */
export function showCourseInfo(ctx: MajorCtx, co: CourseDef): void {
  const st = COURSE_STAGE_BY_COURSE[co.id];
  const ct = COURSE_CONTENT[co.id];
  if (!st || !ct) return;
  const prof = PROF_BY_ID[co.prof];
  const g = ctx.save.grades[co.id];
  const mode = takeMode(ctx.save, co.id);
  const overlay = h('div.overlay');
  const close = (): void => overlay.remove();
  const enemyIds = [...st.pool.map((p) => p.id), st.boss!];
  const status = !g
    ? tr('처음 듣는 과목이에요. 이기면 연구실 체력으로 학점이 매겨지고, 지면 F예요.', 'First time taking this. Win and your Lab\'s HP sets the grade; lose and it\'s an F.')
    : mode === 'retake'
      ? (g === RETAKE_CAP
        ? tr(`지금 학점 ${g}. 이미 최고 학점이지만 몇 번이든 다시 들을 수 있어요.`, `Current grade ${g}. Already the top grade, but you can retake it any time.`)
        : tr(`지금 학점 ${g}. 몇 번이든 재수강할 수 있고, 더 좋은 학점이 남아요.`, `Current grade ${g}. Retake as many times as you like; your best grade stays.`))
      : tr(`지금 학점 ${g}. 다시 들어도 학점은 그대로예요 (복습).`, `Current grade ${g}. Taking it again won't change the grade (review).`);
  const btn = !g ? tr('{pencil} 수강하기', '{pencil} Take the course') : mode === 'retake' ? tr('{retry} 재수강', '{retry} Retake') : tr('{book} 복습하기', '{book} Review');
  overlay.append(h('div.panel.stage-info.course-info', {},
    h('h2', {}, co.name, ' ', gradeChip(g)),
    h('p.muted', {}, tr(`${termLabel(co)} · ${co.credits}학점${co.design ? ' · 설계' : ''}`, `${termLabel(co)} · ${co.credits} credits${co.design ? ' · design' : ''}`)),
    h('div.prof-row', {},
      h('img', { src: portrait(prof.look, 1, `boss-${co.id}`, -1), alt: '' }),
      h('div', {},
        h('b', {}, tr(`${prof.name} 교수님`, `Prof. ${prof.name}`)),
        h('p.muted', {}, prof.trait),
        h('p.prof-quote', {}, ct.quote),
      ),
    ),
    h('p.course-desc', {}, ct.desc),
    h('p.stage-note', {}, ct.rule),
    h('p.muted', {}, tr('등장하는 적', 'Enemies')),
    h('div.enemy-row', {}, ...enemyIds.filter((id) => ENEMY_BY_ID[id]).map((id) => h('figure', {}, h('img', { src: portrait(ENEMY_BY_ID[id]!.look, 1, id, -1), alt: '' }), h('figcaption', {}, ENEMY_BY_ID[id]!.name)))),
    powerCompare(ctx.save, st),
    h('p', {}, status),
    h('p.muted', {}, tr(`첫 이수 보상 {coin} 최대 ${fmt(st.reward * 1.2)}`, `First pass reward {coin} up to ${fmt(st.reward * 1.2)}`)),
    h('div.btn-row', {},
      h('button.btn', { onclick: close }, tr('닫기', 'Close')),
      h('button.btn.primary', { onclick: () => { close(); ctx.start(st); } }, btn),
    ),
  ));
  ctx.host()?.append(overlay);
}

/** 전투 결과 화면에 붙일 학점 줄 */
export function gradeLines(save: SaveData, r: GradeResult): string[] {
  const g = gpa(save);
  const lines = [
    r.got === 'F'
      ? tr('{warn} 학점 F… 몇 번이든 재수강할 수 있어요.', '{warn} Grade F… you can retake it as many times as you like.')
      : tr(`{cap} 학점 ${r.got}${r.raw !== r.got ? ` (재수강 상한, 원래 ${r.raw})` : ''} · ${GRADE_POINT[r.got].toFixed(1)}점`, `{cap} Grade ${r.got}${r.raw !== r.got ? ` (retake cap, earned ${r.raw})` : ''} · ${GRADE_POINT[r.got].toFixed(1)} pts`),
  ];
  if (r.mode === 'review') lines.push(tr(`복습이라 학점은 ${r.best} 그대로예요.`, `Review run: your grade stays ${r.best}.`));
  else if (r.mode === 'retake' && !r.improved) lines.push(tr(`기존 학점 ${r.best}가 더 높아서 그대로 둬요.`, `Your previous ${r.best} was higher, so it stays.`));
  lines.push(tr(`평점 ${g === null ? '-' : g.toFixed(2)} · 이수 ${earnedCredits(save)}학점`, `GPA ${g === null ? '-' : g.toFixed(2)} · ${earnedCredits(save)} credits`));
  if (isGraduated(save)) lines.push(tr('{party} 전 과목 이수! 졸업을 축하해요!', '{party} Every course passed! Congratulations on graduating!'));
  return lines;
}
