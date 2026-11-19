/**
 * 스토리 대본. 장면마다 배경, 처음 서 있는 인물, 대사와 연출(등장·퇴장·점프·흔들림·감정 표현)을 적는다.
 * {name}은 플레이어 이름으로 바뀐다.
 */
import { STAGE_SCENES } from './stage-scenes';
import { SIDE_SCENES } from './side-scenes';
import { localizeScenes } from './en';
import type { TrackId } from '../audio/music';

export type Bg = 'classroom' | 'lab' | 'night' | 'office' | 'conference' | 'hall' | 'sunny' | 'haunted' | 'tenure' | 'rain' | 'deadline' | 'ai' | 'startup' | 'blackout' | 'industry';

export type ActorId =
  | 'hero' | 'senior' | 'claudy' | 'codexy' | 'jaeminai' | 'newbie'
  | 'prof1' | 'prof2' | 'reviewer2' | 'chair' | 'committee' | 'dean' | 'president'
  | 'tenure' | 'ghost' | 'ghost13' | 'printer3am' | 'imposter' | 'reviewer3' | 'mom'
  | 'submitsys' | 'autoreview' | 'vc' | 'mainbreaker' | 'pagelimit' | 'citation' | 'hallucite' | 'injection' | 'cloudbill' | 'powerstrip' | 'breaker'
  | 'exec' | 'datadrive' | 'nda' | 'reqchange' | 'mergedcell' | 'noreply';

export type Action =
  | { a: 'enter'; id: ActorId; from: 'left' | 'right'; to: number }
  | { a: 'move'; id: ActorId; to: number }
  | { a: 'exit'; id: ActorId; to: 'left' | 'right' }
  | { a: 'jump'; id: ActorId }
  | { a: 'face'; id: ActorId; dir: 1 | -1 }
  | { a: 'shake' }
  | { a: 'flash' }
  /** 주인공이 교수로 변한다 (엔딩) */
  | { a: 'becomeProf' }
  | { a: 'banner'; text: string }
  | { a: 'bg'; bg: Bg };

export interface Line {
  /** 말하는 인물 (없으면 내레이션) */
  who?: ActorId;
  text: string;
  /** 머리 위 감정 표현 */
  emote?: string;
  do?: Action[];
}

export interface Scene {
  id: string;
  title?: string;
  bg: Bg;
  /** 배경 현수막 글자 (학회 등) */
  sign?: string;
  /** 처음부터 서 있는 인물: 위치는 화면 너비 비율(0~1) */
  cast?: { id: ActorId; x: number; face?: 1 | -1 }[];
  lines: Line[];
  /** 엔딩처럼 건너뛸 수 없는 장면 */
  noSkip?: boolean;
  music?: TrackId;
}

const S: Scene[] = [
  // ───────────── 1장 학부생 ─────────────
  {
    id: 'ch1-intro', title: '1장 · 학부생', bg: 'classroom',
    cast: [{ id: 'hero', x: 0.3 }],
    lines: [
      { text: '공대 3학년 {name}. 학점은 그럭저럭, 꿈은 막연히 "연구자".' },
      { who: 'hero', text: '연구실 인턴 모집…? 경력에 좋다던데. 한번 가볼까?', emote: '?' },
      { who: 'senior', text: '어, 너 혹시 지원하러 왔어? 마침 사람 필요했는데!', do: [{ a: 'enter', id: 'senior', from: 'right', to: 0.65 }] },
      { who: 'hero', text: '아, 네! 그냥 구경만 하러…', emote: '💦' },
      { who: 'senior', text: '구경은 원래 그렇게 시작하는 거야. 일단 이 서류부터 좀 막아줘.', do: [{ a: 'jump', id: 'senior' }] },
      { text: '그때까지만 해도 몰랐다. 저 문 너머에서 쪽지가 날아오고 있다는 것을.', do: [{ a: 'shake' }] },
    ],
  },
  {
    id: 'ch1-boss', title: '전공 교수님 면담', bg: 'office',
    cast: [{ id: 'hero', x: 0.28 }, { id: 'prof1', x: 0.7, face: -1 }],
    lines: [
      { who: 'prof1', text: '자네가 요즘 연구실 들락거린다는 학생인가?' },
      { who: 'hero', text: '네! 연구에 관심이 많아서요!', emote: '!' },
      { who: 'prof1', text: '관심만으로는 안 되지. 이번 주까지 이것 좀 해와.', do: [{ a: 'shake' }] },
      { who: 'hero', text: '(서류 더미가… 걸어온다?!)', emote: '💦' },
    ],
  },
  {
    id: 'ch1-clear', bg: 'lab',
    cast: [{ id: 'hero', x: 0.3 }, { id: 'senior', x: 0.62, face: -1 }],
    lines: [
      { who: 'senior', text: '오, 교수님 서류를 다 막아냈어? 재능 있네.' },
      { who: 'claudy', text: '안녕하세요! AI 조수 클로디예요. 논문 첨삭, 회복, 응원 다 됩니다.', do: [{ a: 'enter', id: 'claudy', from: 'right', to: 0.82 }, { a: 'jump', id: 'claudy' }] },
      { who: 'hero', text: '연구실엔 별게 다 있네요…', emote: '?' },
      { who: 'senior', text: '정식으로 학부연구생 할래? 월급은… 커피는 무제한이야.' },
    ],
  },

  // ───────────── 2장 학연생 ─────────────
  {
    id: 'ch2-intro', title: '2장 · 학연생', bg: 'lab',
    cast: [{ id: 'hero', x: 0.3 }],
    lines: [
      { text: '학부연구생이 되었다. 책상 하나, 의자 하나, 그리고 끝없는 잡무.' },
      { who: 'hero', text: '제 자리가 생겼어요! 모니터도 두 개!', emote: '♪', do: [{ a: 'jump', id: 'hero' }] },
      { who: 'senior', text: '그 모니터, 하나는 실험 로그 전용이야. 꺼지면 안 돼.', do: [{ a: 'enter', id: 'senior', from: 'right', to: 0.66 }] },
      { who: 'claudy', text: '제가 24시간 지켜볼게요. 저는 잠을 안 자거든요.', do: [{ a: 'enter', id: 'claudy', from: 'right', to: 0.85 }] },
    ],
  },
  {
    id: 'ch2-boss', title: '지도교수님', bg: 'office',
    cast: [{ id: 'hero', x: 0.28 }, { id: 'prof2', x: 0.7, face: -1 }],
    lines: [
      { who: 'prof2', text: '{name} 학생, 과제 보고서 마감이 내일인 건 알지?' },
      { who: 'hero', text: '그 과제… 제가 참여하는 줄 오늘 알았는데요.', emote: '?' },
      { who: 'prof2', text: '이제 알았으니 됐네. 랩미팅은 오늘 밤 10시.', do: [{ a: 'shake' }] },
    ],
  },
  {
    id: 'ch2-clear', bg: 'lab',
    cast: [{ id: 'hero', x: 0.3 }, { id: 'prof2', x: 0.7, face: -1 }],
    lines: [
      { who: 'prof2', text: '흠, 보고서가 제법이군. 자네, 대학원 생각 있나?' },
      { who: 'hero', text: '대학원이요? 저는 취업을…', emote: '💦' },
      { who: 'prof2', text: '학석사 통합과정이면 1년 일찍 끝나. 장학금도 있고.', do: [{ a: 'jump', id: 'prof2' }] },
      { text: '"1년 일찍"이라는 말에 넘어갔다. 그 말이 사실이었는지는 아무도 모른다.' },
    ],
  },

  // ───────────── 3장 학석사 ─────────────
  {
    id: 'ch3-intro', title: '3장 · 학석사', bg: 'lab',
    cast: [{ id: 'hero', x: 0.3 }, { id: 'senior', x: 0.62, face: -1 }],
    lines: [
      { text: '학석사 통합과정에 들어왔다. 수업도 듣고, 연구도 하고, 조교도 한다.' },
      { who: 'hero', text: '선배, 통합과정이면 일이 반으로 줄어드는 거 맞죠?', emote: '?' },
      { who: 'senior', text: '두 배로 늘어나는 거야. 학부 일 + 대학원 일.' },
      { who: 'codexy', text: '코드는 제가 쏟아낼게요. 버그도 같이 쏟아질 수 있어요.', do: [{ a: 'enter', id: 'codexy', from: 'right', to: 0.85 }] },
    ],
  },
  {
    id: 'ch3-boss', title: '리뷰어 2의 습격', bg: 'conference', sign: 'Paper Review',
    cast: [{ id: 'hero', x: 0.28 }, { id: 'reviewer2', x: 0.72, face: -1 }],
    lines: [
      { who: 'hero', text: '첫 논문 투고! 리뷰 결과가 나왔다!', emote: '!' },
      { who: 'reviewer2', text: '저자는 기본 개념을 이해하지 못한 것으로 보입니다.', do: [{ a: 'shake' }] },
      { who: 'reviewer2', text: '실험 12개 추가, 관련 연구 40편 인용, 그리고… 제 논문도 인용하세요.' },
      { who: 'hero', text: '리뷰어 2…! 소문으로만 듣던…', emote: '💢' },
    ],
  },
  {
    id: 'ch3-clear', bg: 'lab',
    cast: [{ id: 'hero', x: 0.3 }, { id: 'senior', x: 0.6, face: -1 }],
    lines: [
      { who: 'hero', text: '억셉트됐어요!! 제 첫 논문!', emote: '♪', do: [{ a: 'jump', id: 'hero' }, { a: 'flash' }] },
      { who: 'senior', text: '축하해. 이제 석사 학위 논문 써야지?' },
      { who: 'hero', text: '…쉬는 날은 언제 와요?', emote: '…' },
    ],
  },

  // ───────────── 4장 석사 ─────────────
  {
    id: 'ch4-intro', title: '4장 · 석사', bg: 'night',
    cast: [{ id: 'hero', x: 0.35 }],
    lines: [
      { text: '석사과정. 조교, 과제, 학회, 그리고 디펜스.' },
      { who: 'hero', text: '새벽 3시인데 왜 다들 연구실에 있죠?', emote: '?' },
      { who: 'jaeminai', text: '저희는 둘이라서 두 배로 깨어 있어요!', do: [{ a: 'enter', id: 'jaeminai', from: 'right', to: 0.7 }, { a: 'jump', id: 'jaeminai' }] },
      { who: 'hero', text: '…그건 자랑이 아니야.' },
    ],
  },
  {
    id: 'ch4-boss', title: '동계 학회 기조연설', bg: 'conference', sign: '동계 학술대회',
    cast: [{ id: 'hero', x: 0.28 }, { id: 'chair', x: 0.72, face: -1 }],
    lines: [
      { who: 'chair', text: '이번 기조연설 주제는 "젊은 연구자의 열정"입니다.' },
      { who: 'chair', text: '그러니 젊은 연구자 여러분이 학회 운영을 맡아 주세요. 무급으로.', do: [{ a: 'shake' }] },
      { who: 'hero', text: '열정 페이…!', emote: '💢' },
    ],
  },
  {
    id: 'ch4-clear', bg: 'hall',
    cast: [{ id: 'hero', x: 0.4 }],
    lines: [
      { text: '석사 학위 수여. 학사모를 던지려는 순간—' },
      { who: 'prof2', text: '{name} 군, 박사 과정으로 바로 전환하지? 석박 통합이면 졸업이 빨라.', do: [{ a: 'enter', id: 'prof2', from: 'right', to: 0.75 }] },
      { who: 'hero', text: '그 "빨라"는 저번에도 들었던 것 같은데요.', emote: '…' },
    ],
  },

  // ───────────── 5장 석박 ─────────────
  {
    id: 'ch5-intro', title: '5장 · 석박', bg: 'lab',
    cast: [{ id: 'hero', x: 0.3 }, { id: 'senior', x: 0.62, face: -1 }],
    lines: [
      { text: '석박 통합과정. 졸업하려면 졸업논문이 필요하다.' },
      { who: 'senior', text: '나 이번에 졸업해. 이제 네가 랩장이야.', do: [{ a: 'jump', id: 'senior' }] },
      { who: 'hero', text: '네?! 선배 없으면 서류는 누가 막아요?', emote: '!' },
      { who: 'senior', text: '네가. 힘내.', do: [{ a: 'exit', id: 'senior', to: 'right' }] },
    ],
  },
  {
    id: 'ch5-boss', title: '졸업논문 심사', bg: 'office',
    cast: [{ id: 'hero', x: 0.28 }, { id: 'committee', x: 0.72, face: -1 }],
    lines: [
      { who: 'committee', text: '심사를 시작하겠습니다. 발표는 20분, 질문은… 무제한입니다.' },
      { who: 'hero', text: '(도장… 저 빨간 도장만은…!)', emote: '💦' },
      { who: 'committee', text: '3장 그래프, 축 이름이 왜 영어인가요?', do: [{ a: 'shake' }] },
    ],
  },
  {
    id: 'ch5-clear', bg: 'office',
    cast: [{ id: 'hero', x: 0.3 }, { id: 'committee', x: 0.7, face: -1 }],
    lines: [
      { who: 'committee', text: '…통과입니다. 수고했어요.', do: [{ a: 'flash' }] },
      { who: 'hero', text: '통과…! 저 이제 졸업…', emote: '♪', do: [{ a: 'jump', id: 'hero' }] },
      { who: 'committee', text: '석박 통합이니 박사 졸업까지 남은 건 4년쯤?' },
      { who: 'hero', text: '……네?', emote: '…' },
    ],
  },

  // ───────────── 6장 박사 ─────────────
  {
    id: 'ch6-intro', title: '6장 · 박사', bg: 'night',
    cast: [{ id: 'hero', x: 0.35 }, { id: 'newbie', x: 0.7, face: -1 }],
    lines: [
      { text: '박사과정. 이제 후배가 생겼다.' },
      { who: 'newbie', text: '선배님! 이 서류는 어떻게 막아요?', emote: '?' },
      { who: 'hero', text: '일단… 커피부터 마셔. 길게 갈 거야.' },
      { who: 'hero', text: '(어디서 들어본 말인데.)', emote: '…' },
    ],
  },
  {
    id: 'ch6-boss', title: '학과장실', bg: 'office',
    cast: [{ id: 'hero', x: 0.28 }, { id: 'dean', x: 0.72, face: -1 }],
    lines: [
      { who: 'dean', text: '학과 평가가 다가오니 연구실마다 실적 보고서를 50장씩 내도록.' },
      { who: 'hero', text: '연구할 시간에 연구 실적 보고서를 쓰라는 거죠?', emote: '💢' },
      { who: 'dean', text: '그게 바로 연구 행정이라는 거라네.', do: [{ a: 'shake' }] },
    ],
  },
  {
    id: 'ch6-clear', bg: 'hall',
    cast: [{ id: 'hero', x: 0.4 }],
    lines: [
      { text: '박사 학위 수여식. 이번엔 진짜다.', do: [{ a: 'flash' }] },
      { who: 'hero', text: '박사…! 이제 정말 끝이다!', emote: '♪', do: [{ a: 'jump', id: 'hero' }] },
      { text: '하지만 교수가 되려면 포닥이라는 관문이 하나 더 남아 있었다.' },
    ],
  },

  // ───────────── 7장 포닥 ─────────────
  {
    id: 'ch7-intro', title: '7장 · 포닥', bg: 'lab',
    cast: [{ id: 'hero', x: 0.35 }],
    lines: [
      { text: '박사후연구원. 계약 기간 2년, 목표는 교수 임용.' },
      { who: 'hero', text: '연구비, 논문, 강의, 학생 지도… 이게 다 내 일이라고?', emote: '💦' },
      { who: 'claudy', text: '저는 아직 여기 있어요. 버전만 몇 번 올라갔죠.', do: [{ a: 'enter', id: 'claudy', from: 'right', to: 0.7 }] },
      { who: 'hero', text: '마지막이야. 교수 임용까지 버틴다.' },
    ],
  },
  {
    id: 'ch7-boss', title: '총장실', bg: 'hall',
    cast: [{ id: 'hero', x: 0.28 }, { id: 'president', x: 0.72, face: -1 }],
    lines: [
      { who: 'president', text: '자네가 그 소문의 포닥인가. 서류란 서류는 다 막아냈다지.' },
      { who: 'hero', text: '임용을 걸고 겨루겠습니다, 총장님.', emote: '!' },
      { who: 'president', text: '좋네. 대학의 모든 회의를 보내 주지.', do: [{ a: 'shake' }, { a: 'shake' }] },
    ],
    music: 'boss',
  },

  // ───────────── 엔딩 (건너뛸 수 없음) ─────────────
  {
    id: 'ending', title: '엔딩', bg: 'hall', noSkip: true,
    cast: [{ id: 'hero', x: 0.3 }, { id: 'president', x: 0.72, face: -1 }],
    lines: [
      { who: 'president', text: '훌륭하군. {name} 박사, 오늘부로 우리 대학 조교수로 임용하네.', do: [{ a: 'flash' }] },
      { who: 'hero', text: '제가… 교수…?', emote: '!' },
      { text: '임용장을 받는 순간, 무언가가 바뀌었다.', do: [{ a: 'shake' }] },
      { text: '…', do: [{ a: 'becomeProf' }, { a: 'flash' }] },
      { who: 'president', text: '그럼 이만. 교수 회의는 매주 월요일 아침 8시라네.', do: [{ a: 'exit', id: 'president', to: 'right' }] },
      { text: '몇 달 뒤, 연구실.', do: [{ a: 'bg', bg: 'lab' }, { a: 'move', id: 'hero', to: 0.35 }, { a: 'banner', text: '몇 달 뒤' }] },
      { who: 'newbie', text: '저… 연구실 인턴 모집 보고 왔는데요. 구경만 하러…', do: [{ a: 'enter', id: 'newbie', from: 'right', to: 0.7 }], emote: '?' },
      { who: 'hero', text: '구경은 원래 그렇게 시작하는 거지.', emote: '♪' },
      { who: 'hero', text: '자, 이번 주까지 이것 좀 해와.', do: [{ a: 'shake' }] },
      { who: 'newbie', text: '(서류 더미가… 걸어온다?!)', emote: '💦' },
      { text: '그렇게 또 한 명의 교수님이 탄생했다.' },
      { text: '그리고 연구실의 하루는 오늘도 끝나지 않는다.' },
      { text: '— 랩워즈 끝 —   외전 3편이 열렸습니다.', do: [{ a: 'banner', text: 'THE END?' }] },
      { text: '기획·개발·대학원 생존: 박기찬', do: [{ a: 'banner', text: 'made by 박기찬' }] },
      { text: '플레이해 주셔서 감사합니다. 오늘도 버티는 모든 대학원생에게.' },
    ],
  },
];

/** 모든 장면 (챕터 장면 + 스테이지별 장면). 순서는 story/unlock.ts의 STORY_ORDER */
const ALL = [...S, ...STAGE_SCENES, ...SIDE_SCENES];
localizeScenes(ALL);
export const SCENES: Record<string, Scene> = Object.fromEntries(ALL.map((s) => [s.id, s]));
