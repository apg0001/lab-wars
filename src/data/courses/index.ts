import type { CourseContent } from '../major';
import { Y12 } from './y12';
import { Y34 } from './y34';

/** 과목 id → 과목 내용 (규칙·설명·대표 적·보스) */
export const COURSE_CONTENT: Record<string, CourseContent> = { ...Y12, ...Y34 };
