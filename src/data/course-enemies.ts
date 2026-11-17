import type { EnemyDef } from './types';
import { ICE_COURSES, PROF_BY_ID } from './major';
import { COURSE_CONTENT } from './courses';

/**
 * 전공 모드 적: 과목마다 대표 적(ce-과목)과 기말 보스(boss-과목, 담당 교수님).
 * 교수님은 가상 인물이고, 같은 교수님이 여러 과목을 맡으면 과목마다 패턴이 다르다.
 */
/** 학년이 오를수록 보스가 세진다 */
const BOSS_BY_YEAR = [
  { hp: 1900, atk: 32 },
  { hp: 2900, atk: 44 },
  { hp: 4300, atk: 56 },
  { hp: 6000, atk: 68 },
];

export function courseEnemies(): EnemyDef[] {
  const out: EnemyDef[] = [];
  for (const co of ICE_COURSES) {
    const ct = COURSE_CONTENT[co.id];
    if (!ct) continue;
    const f = ct.foe;
    out.push({
      ...f.stats,
      id: `ce-${co.id}`,
      name: f.name,
      role: f.role,
      desc: f.desc,
      reward: f.reward,
      look: f.look,
      en: f.en,
    });
    const prof = PROF_BY_ID[co.prof];
    const base = BOSS_BY_YEAR[co.year - 1]!;
    const last = co.id === 'capstone2';
    const hp = Math.round(base.hp * (co.sem === 2 ? 1.12 : 1) * (last ? 1.3 : 1));
    const atk = Math.round(base.atk * (co.sem === 2 ? 1.08 : 1));
    out.push({
      hp, atk, range: 32, speed: 18, interval: 1.6,
      ...ct.boss.extra,
      id: `boss-${co.id}`,
      name: `${prof.name} 교수님`,
      role: `${co.name} 기말`,
      desc: prof.trait,
      reward: 150 + co.year * 60,
      boss: {
        // 1학년 교수님은 대표 적을 덜 자주, 적게 부른다 (부른 적이 쌓이면 초반에 감당이 안 된다)
        summon: { id: `ce-${co.id}`, every: Math.max(ct.boss.summon, co.year === 1 ? 12 : 8), count: Math.min(ct.boss.count, co.year === 1 ? 2 : 4) },
        ...(ct.boss.stomp ? { stomp: { dmg: Math.round(atk * 1.1), radius: 120, every: 8 } } : {}),
        say: ct.boss.say,
      },
      look: { ...prof.look, scale: 2 },
      en: { name: `Prof. ${prof.en.name}`, role: `${co.en.name} Final`, desc: prof.en.trait },
    });
  }
  return out;
}
