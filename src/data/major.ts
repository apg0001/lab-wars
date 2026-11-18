import type { CombatStats, Look } from './types';
import type { CourseMods } from '../sim/course-rules';

/**
 * 전공 모드: 전공 = 과목 묶음. 지금은 정보통신공학 하나지만,
 * 복수전공·연계전공·나노디그리도 같은 꼴(MajorDef)로 더하면 된다.
 *
 * 교수님은 전부 가상 인물이다 (실존 인물의 이름을 쓰거나 비틀어 쓰지 않는다).
 * 과목 내용(규칙·설명·대표 적·보스)은 src/data/courses/*.ts 에 과목 id로 나눠 둔다.
 */

export type Grade = 'A+' | 'A0' | 'B+' | 'B0' | 'C+' | 'C0' | 'D+' | 'D0' | 'F';
/** 높은 학점부터 */
export const GRADES: Grade[] = ['A+', 'A0', 'B+', 'B0', 'C+', 'C0', 'D+', 'D0', 'F'];
export const GRADE_POINT: Record<Grade, number> = { 'A+': 4.5, A0: 4.0, 'B+': 3.5, B0: 3.0, 'C+': 2.5, C0: 2.0, 'D+': 1.5, D0: 1.0, F: 0 };
/** 재수강하면 받을 수 있는 최고 학점 (0.20.3부터 제한 없음: A+까지) */
export const RETAKE_CAP: Grade = 'A+';
/** 재수강할 수 있는 학점 (이 학점 이하). 0.20.3부터 모든 학점을 재수강할 수 있다 */
export const RETAKE_FROM: Grade = 'A+';

/** 교수님 생김새 (src/render/characters.ts 의 lecturer 그림) */
export type ProfVariant =
  | 'hanbit' | 'jeonggyu' | 'baepo' | 'gomin' | 'parksort' | 'leebin' | 'bangeq' | 'jocond'
  | 'sangsok' | 'shinsig' | 'woopri' | 'jeonrate' | 'noise' | 'yangq' | 'baekprop' | 'seoboan';

export interface ProfessorDef {
  id: ProfVariant;
  /** 성 + 이름 (교수님은 빼고) — 전부 가상, 전공 말장난 */
  name: string;
  /** 한 줄 성격 */
  trait: string;
  look: Look;
  en: { name: string; trait: string };
}

export interface CourseDef {
  id: string;
  name: string;
  year: 1 | 2 | 3 | 4;
  sem: 1 | 2;
  credits: number;
  /** 선수과목 (D0 이상 이수해야 열린다) */
  prereq: string[];
  prof: ProfVariant;
  /** 설계 과목 (캡스톤 등) */
  design?: boolean;
  en: { name: string };
}

/** 과목 내용: src/data/courses/*.ts */
export interface CourseContent {
  /** 규칙 한 줄 (아이콘 표시 포함, "{icon} 이름: 설명") */
  rule: string;
  /** 스테이지 설명: 어떤 수업·상황인지 2~3문장, 유머 */
  desc: string;
  /** 교수님 첫 수업 한마디 */
  quote: string;
  /** 전투 규칙 */
  mods: CourseMods;
  /** 출현 적 (기존 적 id → 가중치). 대표 적은 자동으로 들어간다 */
  pool: Record<string, number>;
  /** 과목 대표 적 (그림은 기존 적 그림을 색만 바꿔 쓴다) */
  foe: {
    name: string;
    role: string;
    desc: string;
    look: Look;
    /** 기본 능력치 (스테이지 배율이 곱해진다) + 범용 능력 */
    stats: CombatStats;
    reward: number;
    weight: number;
    en: { name: string; role: string; desc: string };
  };
  /** 기말 보스(담당 교수님) 패턴: 대표 적을 부른다 */
  boss: { summon: number; count: number; stomp?: boolean; say: [string, string]; extra?: Partial<CombatStats> };
  en: { rule: string; desc: string; quote: string };
}

export const PROFESSORS: ProfessorDef[] = [
  { id: 'hanbit', name: '한비트', trait: '모든 수업을 Hello, World!로 시작하는 새내기 담당. 세미콜론 하나에 눈물을 흘린다.', look: { kind: 'lecturer', variant: 'hanbit', color: '#42a5f5', accent: '#ffee58' }, en: { name: 'Han Bit', trait: 'Teaches the freshmen and opens every class with Hello, World!. A missing semicolon makes them cry.' } },
  { id: 'jeonggyu', name: '정규화', trait: '결측치를 보면 손이 떨린다. 모든 걸 0과 1 사이로 맞추고 싶어 한다.', look: { kind: 'lecturer', variant: 'jeonggyu', color: '#26a69a', accent: '#e0f2f1' }, en: { name: 'Jeong Gyuhwa', trait: 'Hands shake at the sight of missing values. Wants everything scaled between 0 and 1.' } },
  { id: 'baepo', name: '배포중', trait: '"제 브라우저에선 됩니다"가 입버릇. 금요일 오후 6시에 배포하는 걸 즐긴다.', look: { kind: 'lecturer', variant: 'baepo', color: '#ff7043', accent: '#263238' }, en: { name: 'Bae Pojung', trait: '"Works in my browser" is the catchphrase. Loves deploying at 6 PM on Fridays.' } },
  { id: 'gomin', name: '고민중', trait: '팀플의 수호자. 무임승차를 귀신같이 잡아내지만 정작 본인 회의는 늘 길다.', look: { kind: 'lecturer', variant: 'gomin', color: '#ab47bc', accent: '#fff59d' }, en: { name: 'Go Minjung', trait: 'Guardian of team projects. Spots free riders instantly, yet their own meetings always run long.' } },
  { id: 'parksort', name: '박정렬', trait: '책상 위 펜도 길이순으로 정렬한다. 시간 복잡도를 물어보면 눈이 반짝인다.', look: { kind: 'lecturer', variant: 'parksort', color: '#5c6bc0', accent: '#c5cae9' }, en: { name: 'Park Jeongryeol', trait: 'Sorts the pens on the desk by length. Ask about time complexity and their eyes light up.' } },
  { id: 'leebin', name: '이진수', trait: '0과 1로만 대답한다. 기분이 좋으면 16진수도 쓴다.', look: { kind: 'lecturer', variant: 'leebin', color: '#78909c', accent: '#76ff03' }, en: { name: 'Lee Jinsu', trait: 'Answers only in 0s and 1s. Uses hexadecimal when in a good mood.' } },
  { id: 'bangeq', name: '방정식', trait: '칠판을 세 번 지우고 네 번 채운다. "자명하다"고 말한 증명은 두 시간 걸린다.', look: { kind: 'lecturer', variant: 'bangeq', color: '#8d6e63', accent: '#fafafa' }, en: { name: 'Bang Jeongsik', trait: 'Erases the board three times and fills it four. Any proof called "trivial" takes two hours.' } },
  { id: 'jocond', name: '조건부', trait: '모든 질문에 "경우에 따라 다르죠"라고 답한다. 출석은 확률적으로 부른다.', look: { kind: 'lecturer', variant: 'jocond', color: '#ec407a', accent: '#f8bbd0' }, en: { name: 'Jo Geonbu', trait: 'Answers every question with "it depends." Takes attendance probabilistically.' } },
  { id: 'sangsok', name: '상속자', trait: '부모 클래스에 대한 존경심이 깊다. override를 하면 섭섭해한다.', look: { kind: 'lecturer', variant: 'sangsok', color: '#7e57c2', accent: '#ffd54f' }, en: { name: 'Sang Sokja', trait: 'Deep respect for parent classes. Gets a little hurt when you override.' } },
  { id: 'shinsig', name: '신호등', trait: '푸리에 변환으로 점심 메뉴를 고른다. 잡음이 섞인 대답은 듣지 않는다.', look: { kind: 'lecturer', variant: 'shinsig', color: '#66bb6a', accent: '#ef5350' }, en: { name: 'Shin Hodeung', trait: 'Picks lunch with a Fourier transform. Ignores any answer with noise in it.' } },
  { id: 'woopri', name: '우선순', trait: '면담 신청은 우선순위 큐로 처리한다. 대학원생은 늘 우선순위가 낮다.', look: { kind: 'lecturer', variant: 'woopri', color: '#ffa726', accent: '#5d4037' }, en: { name: 'Woo Seonsun', trait: 'Handles office-hour requests with a priority queue. Grad students are always low priority.' } },
  { id: 'jeonrate', name: '전송률', trait: '말이 빠르다. 패킷이 손실되면 처음부터 다시 말한다.', look: { kind: 'lecturer', variant: 'jeonrate', color: '#29b6f6', accent: '#01579b' }, en: { name: 'Jeon Songryul', trait: 'Talks fast. If a packet drops, starts the whole sentence over.' } },
  { id: 'noise', name: '노이주', trait: '목소리에 늘 백색 잡음이 섞여 있다. 신호 대 잡음비가 낮은 날은 휴강한다.', look: { kind: 'lecturer', variant: 'noise', color: '#90a4ae', accent: '#eceff1' }, en: { name: 'No Iju', trait: 'Their voice always carries a hint of white noise. Cancels class on low-SNR days.' } },
  { id: 'yangq', name: '양자화', trait: '모든 숫자를 반올림한다. 시험 점수도 8단계로만 준다.', look: { kind: 'lecturer', variant: 'yangq', color: '#d4e157', accent: '#33691e' }, en: { name: 'Yang Jahwa', trait: 'Rounds every number. Even exam scores come in just eight levels.' } },
  { id: 'baekprop', name: '백전파', trait: '틀린 답을 들으면 처음까지 거슬러 올라가 고쳐 준다. 학습률은 늘 조금 높다.', look: { kind: 'lecturer', variant: 'baekprop', color: '#ef5350', accent: '#ffcdd2' }, en: { name: 'Baek Jeonpa', trait: 'Hears a wrong answer and traces it all the way back to fix it. Learning rate always a bit too high.' } },
  { id: 'seoboan', name: '서보안', trait: '연구실 비밀번호를 매주 바꾸고 아무에게도 알려 주지 않는다.', look: { kind: 'lecturer', variant: 'seoboan', color: '#37474f', accent: '#00e676' }, en: { name: 'Seo Boan', trait: 'Changes the lab password every week and tells no one.' } },
];

export const PROF_BY_ID = Object.fromEntries(PROFESSORS.map((p) => [p.id, p])) as Record<ProfVariant, ProfessorDef>;

const c = (id: string, name: string, year: CourseDef['year'], sem: CourseDef['sem'], prof: ProfVariant, prereq: string[], en: string, design = false): CourseDef =>
  ({ id, name, year, sem, credits: 3, prereq, prof, ...(design ? { design } : {}), en: { name: en } });

/** 정보통신공학 교과과정 (학년·학기 순) */
export const ICE_COURSES: CourseDef[] = [
  c('ict', 'ICT와소프트웨어', 1, 1, 'hanbit', [], 'ICT and Software'),
  c('progbasic', '프로그래밍기초와실습', 1, 1, 'hanbit', [], 'Programming Fundamentals Lab'),
  c('dataprog', '데이터프로그래밍', 1, 1, 'jeonggyu', [], 'Data Programming'),
  c('adventure', '어드벤처디자인', 1, 2, 'gomin', [], 'Adventure Design', true),
  c('iceprog', '정보통신프로그래밍', 1, 2, 'hanbit', ['progbasic'], 'ICE Programming'),
  c('aiprog', '인공지능프로그래밍', 1, 2, 'jeonggyu', ['dataprog'], 'AI Programming'),
  c('webprog', '인터넷프로그래밍', 1, 2, 'baepo', ['progbasic'], 'Internet Programming'),
  c('ds', '자료구조와실습', 2, 1, 'parksort', ['progbasic'], 'Data Structures Lab'),
  c('icemath', '정보통신수학및실습', 2, 1, 'bangeq', [], 'ICE Mathematics Lab'),
  c('linalg', '공학선형대수학', 2, 1, 'bangeq', [], 'Engineering Linear Algebra'),
  c('probstat', '확률및통계학', 2, 1, 'jocond', [], 'Probability and Statistics'),
  c('arch', '컴퓨터구성', 2, 2, 'leebin', ['ds'], 'Computer Organization'),
  c('oop', '객체지향언어와실습', 2, 2, 'sangsok', ['ds'], 'Object-Oriented Programming Lab'),
  c('algo', '컴퓨터알고리즘설계', 2, 2, 'parksort', ['ds'], 'Computer Algorithm Design'),
  c('randproc', '확률및랜덤프로세스', 2, 2, 'jocond', ['probstat'], 'Probability and Random Processes'),
  c('sigsys', '신호와시스템', 2, 2, 'shinsig', ['icemath'], 'Signals and Systems'),
  c('os', '운영체제', 3, 1, 'woopri', ['arch'], 'Operating Systems'),
  c('embedded', '임베디드소프트웨어와스마트모빌리티', 3, 1, 'leebin', ['arch'], 'Embedded Software and Smart Mobility'),
  c('datacomm', '데이터통신', 3, 1, 'jeonrate', ['sigsys'], 'Data Communications'),
  c('dsp', '디지털신호처리', 3, 1, 'shinsig', ['sigsys'], 'Digital Signal Processing'),
  c('commtheory', '통신이론', 3, 1, 'noise', ['randproc', 'sigsys'], 'Communication Theory'),
  c('mobile', '모바일소프트웨어', 3, 2, 'baepo', ['oop'], 'Mobile Software'),
  c('micro', '마이크로프로세서', 3, 2, 'leebin', ['arch'], 'Microprocessors'),
  c('db', '데이터베이스체제', 3, 2, 'woopri', ['ds'], 'Database Systems'),
  c('network', '컴퓨터네트워크', 3, 2, 'jeonrate', ['datacomm'], 'Computer Networks'),
  c('imageproc', '디지털영상처리', 3, 2, 'shinsig', ['dsp'], 'Digital Image Processing'),
  c('digitalcomm', '디지털통신', 3, 2, 'noise', ['commtheory'], 'Digital Communications'),
  c('swe', '소프트웨어공학', 4, 1, 'baepo', ['oop'], 'Software Engineering'),
  c('ml', '머신러닝', 4, 1, 'jeonggyu', ['probstat', 'linalg'], 'Machine Learning'),
  c('rl', '강화학습', 4, 1, 'baekprop', ['ml'], 'Reinforcement Learning'),
  c('iotplat', '스마트홈IoT플랫폼및특허분석', 4, 1, 'yangq', ['embedded'], 'Smart Home IoT Platforms and Patents'),
  c('netprog', '네트워크프로그래밍', 4, 1, 'jeonrate', ['network'], 'Network Programming'),
  c('compress', '데이터압축', 4, 1, 'yangq', ['dsp'], 'Data Compression'),
  c('wireless', '무선통신', 4, 1, 'noise', ['digitalcomm'], 'Wireless Communications'),
  c('capstone1', '캡스톤디자인1', 4, 1, 'gomin', ['adventure'], 'Capstone Design 1', true),
  c('dl', '딥러닝', 4, 2, 'baekprop', ['ml'], 'Deep Learning'),
  c('netsec', '네트워크보안', 4, 2, 'seoboan', ['network'], 'Network Security'),
  c('iotsys', '스마트홈IoT시스템설계및지식재산권', 4, 2, 'yangq', ['iotplat'], 'Smart Home IoT System Design and IP'),
  c('commsim', '통신시스템소프트웨어', 4, 2, 'jocond', ['digitalcomm'], 'Communication System Software'),
  c('crypto', '암호알고리즘및응용', 4, 2, 'seoboan', ['icemath'], 'Cryptographic Algorithms and Applications'),
  c('capstone2', '캡스톤디자인2', 4, 2, 'gomin', ['capstone1'], 'Capstone Design 2', true),
];

export interface MajorDef {
  id: string;
  name: string;
  courses: CourseDef[];
  /** 졸업에 필요한 학점 */
  gradCredits: number;
  en: { name: string };
}

export const MAJORS: MajorDef[] = [
  { id: 'ice', name: '정보통신공학', courses: ICE_COURSES, gradCredits: ICE_COURSES.length * 3, en: { name: 'Information & Communication Engineering' } },
];

export const COURSE_BY_ID: Record<string, CourseDef> = Object.fromEntries(MAJORS.flatMap((m) => m.courses).map((co) => [co.id, co]));
