/**
 * 패치노트. 맨 위가 최신 버전이고, 맨 위 버전이 곧 게임 버전(package.json)이다.
 * 새 버전을 낼 때는 맨 위에 항목 하나를 추가하면 된다.
 * 글자 속 `{sparkle}` 같은 표시는 손그림 아이콘으로 바뀐다 (이모지는 쓰지 않는다).
 */
import { localizeAll } from '../i18n';

export interface PatchNote {
  version: string;
  /** YYYY-MM-DD */
  date: string;
  title: string;
  items: string[];
  /** 영어 (src/i18n): 아이콘 표시는 원문과 같게 */
  en?: PatchNoteEn;
}

export interface PatchNoteEn {
  title: string;
  items: string[];
}

export const PATCH_NOTES: PatchNote[] = [
  {
    version: '0.16.2',
    date: '2026-11-17',
    title: '연타 주의',
    items: [
      '{check} 숫자키를 꾹 누른 채 소환하다가 경품 추첨 창이 뜨면 카드가 저절로 골라지던 문제를 고쳤어요. 이제 키에서 손을 뗐다가 다시 눌러야 골라져요',
    ],
    en: {
      title: 'Mind the Mashing',
      items: [
        '{check} Holding a number key to summon no longer auto-picks a prize card when the draft pops up. Release and press again to choose',
      ],
    },
  },
  {
    version: '0.16.1',
    date: '2026-11-17',
    title: '내 얼굴을 걸고',
    items: [
      '{star} 대표 캐릭터: 옷장에서 가진 유닛 하나를 대표로 정하면, 입힌 차림 그대로 프로필과 순위표에 나와요',
      '{trophy} 순위표에 심사 결과 칭호가 이름 아래 함께 보여요',
    ],
    en: {
      title: 'Putting a Face on It',
      items: [
        '{star} Profile character: pick any unit you own in the Wardrobe and it shows on your profile and the leaderboard, outfit and all',
        '{trophy} Your Peer Review title now appears under your name on the leaderboard',
      ],
    },
  },
  {
    version: '0.16.0',
    date: '2026-11-17',
    title: 'Hello, World!',
    items: [
      '{sparkle} 영어 지원: 브라우저 언어가 한국어가 아니면 영어로 나와요. 타이틀 오른쪽 위나 설정에서 언제든 바꿀 수 있어요',
      '{scroll} 스토리 105개 장면 전부 영어로 번역했어요. 리뷰어 2는 영어로도 리뷰어 2예요',
    ],
    en: {
      title: 'Hello, World!',
      items: [
        '{sparkle} English is here: the game follows your browser language. Switch anytime from the title corner or settings',
        '{scroll} All 105 story scenes are translated. Reviewer 2 is still Reviewer 2',
      ],
    },
  },
  {
    version: '0.15.0',
    date: '2026-11-17',
    title: '운도 실력이다',
    items: [
      '{envelope} 학회 경품 추첨: 러시를 막아 내면 봉투 3장 중 하나를 골라요. 이번 판에만 통하는 일반·희귀·전설·저주 카드 16종',
      '{stamp} 심사 결과 뽑기: 연구비로 논문을 투고하고 모자·옷 색·칭호를 받아요. 능력치는 그대로, 보기만 달라져요',
      '{hanger} 옷장: 유닛마다 모자와 옷 색을 골라 입히고, 이름 옆에 칭호를 달 수 있어요',
      '{infinity} 무한 모드를 처음부터 할 수 있어요 (외전은 엔딩 뒤 그대로)',
      '{sword} 무한 모드가 너무 쉽다는 의견을 반영해 판마다 더 빨리 강해져요',
    ],
    en: {
      title: 'Luck Is a Skill Too',
      items: [
        '{envelope} Conference Raffle: hold off a rush and pick one of 3 envelopes. 16 Common, Rare, Legendary and Cursed cards that last for that battle only',
        '{stamp} Peer Review draws: spend Funding to submit papers and get hats, outfit colors and titles. Stats stay the same; only the looks change',
        '{hanger} Wardrobe: dress each unit in a hat and outfit color, and show a title next to your name',
        '{infinity} Endless Mode is available from the start (Side Stories still unlock after the ending)',
        '{sword} Endless Mode was too easy, so it now ramps up faster every round',
      ],
    },
  },
  {
    version: '0.14.1',
    date: '2026-11-17',
    title: '전체 화면은 어디서든',
    items: [
      '{fullscreen} 지도·연구실·도감·전투·컷신 어디서든 전체 화면을 켜고 끌 수 있어요',
      '{check} 짧은 화면에서 패치노트 창 아래가 잘려 확인 버튼이 안 보이던 문제를 고쳤어요',
      '{sparkle} 제작자 크레딧을 실명(박기찬)으로 바꿨어요',
    ],
    en: {
      title: 'Fullscreen Everywhere',
      items: [
        '{fullscreen} Toggle fullscreen from the map, lab, encyclopedia, battle and cutscenes',
        '{check} Fixed the patch notes window getting cut off on short screens, hiding the OK button',
        '{sparkle} Changed the creator credit to the real name (Gichan Park)',
      ],
    },
  },
  {
    version: '0.14.0',
    date: '2026-11-17',
    title: '야근 금지, 호통 주의',
    items: [
      '{clock} 스테이지 시간 제한: 일반 5분, 보스 6분. 넘기면 야근 확정(패배)이에요',
      '{anger} 보스 호통: 보스 체력이 66%·33% 아래로 떨어지면 아군 전체가 잠깐 기절하고 밀려나요 (총장님은 3번)',
      '{sword} 난이도 상향: 2~4챕터·7챕터·외전의 적이 5~10% 강해졌어요. 대신 가장 높던 5~6챕터 벽은 조금 낮췄어요',
      '{moon} 밤샘 모드 너프: 6초, 공격 속도 ×1.4, 이동 속도 ×1.15, 멘탈 55',
      '{user} 닉네임: 로그인 아이디와 별개로 순위표에 보일 이름을 정할 수 있어요',
      '{megaphone} 의견 보내기: 타이틀에서 문의·건의·버그를 보내 주세요. 다음 패치에 반영할게요',
      '{scroll} 접속하면 업데이트 소식을 보여 주고, 타이틀에서 패치노트를 언제든 볼 수 있어요',
      '{sparkle} 타이틀과 엔딩에 제작자 크레딧 (made by 박기찬)',
    ],
    en: {
      title: 'No Overtime, Beware the Yelling',
      items: [
        '{clock} Stage time limits: 5 minutes for normal stages, 6 for bosses. Go over and it’s overtime (defeat)',
        '{anger} Boss yell: when a boss drops below 66% and 33% HP, all allies are briefly stunned and pushed back (the President does it 3 times)',
        '{sword} Difficulty up: enemies in chapters 2–4, chapter 7 and the Side Stories are 5–10% stronger. The steepest wall in chapters 5–6 is a little lower',
        '{moon} All-Nighter Mode nerf: 6s, attack speed ×1.4, move speed ×1.15, 55 Sanity',
        '{user} Nicknames: pick a leaderboard name separate from your login ID',
        '{megaphone} Send feedback: send questions, suggestions and bug reports from the title screen. We’ll work them into the next patch',
        '{scroll} Update news appears when you log in, and you can read the patch notes anytime from the title screen',
        '{sparkle} Creator credit on the title screen and ending (made by Gichan Park)',
      ],
    },
  },
  {
    version: '0.13.0',
    date: '2026-11-17',
    title: '손그림 아이콘',
    items: [
      '화면 곳곳의 이모지를 게임 그림체에 맞춘 손그림 아이콘으로 바꿨어요',
      '기기마다 아이콘 모양이 달라 보이던 문제가 사라졌어요',
    ],
    en: {
      title: 'Hand-Drawn Icons',
      items: [
        'Replaced emoji all over the screen with hand-drawn icons that match the game’s art style',
        'Icons no longer look different from device to device',
      ],
    },
  },
  {
    version: '0.12.0',
    date: '2026-11-17',
    title: '교수님 비상 소집',
    items: [
      '동료를 잔뜩 쌓아 밀어붙이면 교수님이 비상 소집을 걸어요',
      '교수실 체력이 75%, 50%, 25%가 될 때마다 충격파로 앞줄을 밀어내고 지원군을 불러요',
      '물량만으로는 쉽게 안 깨지니, 타이밍을 노려 보세요',
    ],
    en: {
      title: 'Prof’s Emergency Summons',
      items: [
        'Stack up a huge pile of labmates and the prof will call an emergency summons',
        'Every time the Prof’s Office hits 75%, 50% and 25% HP, a shockwave pushes back the front line and reinforcements arrive',
        'Brute numbers won’t win it easily anymore. Watch for your timing',
      ],
    },
  },
  {
    version: '0.11.0',
    date: '2026-11-17',
    title: '강화 비용과 난이도 상향',
    items: [
      '단계가 오를수록 연구실 강화 비용이 더 가파르게 올라요',
      '전체적으로 난이도가 올라갔어요 (1챕터 튜토리얼은 그대로)',
      '포탑 사거리 강화 단계가 늘어났어요',
    ],
    en: {
      title: 'Pricier Upgrades, Harder Stages',
      items: [
        'Lab upgrade costs climb more steeply at higher levels',
        'Overall difficulty is up (the chapter 1 tutorial is unchanged)',
        'More levels for the turret range upgrade',
      ],
    },
  },
  {
    version: '0.10.1',
    date: '2026-11-17',
    title: '3배속과 편의 개선',
    items: [
      '전투를 3배속으로 돌릴 수 있어요',
      '연구실 강화 후에도 목록 스크롤 위치가 그대로 유지돼요',
    ],
    en: {
      title: '3x Speed and Quality of Life',
      items: [
        'Battles can now run at 3x speed',
        'The list keeps its scroll position after a lab upgrade',
      ],
    },
  },
  {
    version: '0.10.0',
    date: '2026-11-17',
    title: '외전 3편',
    items: [
      '{redbook} 엔딩 뒤 외전 3편 공개: 조교수 생존기 · 대학원 괴담 · 연구자의 고충',
      '외전마다 으스스한 전용 배경과 음악, 특수 규칙, 전용 적과 보스가 있어요',
      '전장 바닥선을 올려 소환 버튼과 겹치지 않게 했어요',
      '예전 저장 계정도 순위표에 나와요',
    ],
    en: {
      title: 'Three Side Stories',
      items: [
        '{redbook} Three Side Stories after the ending: Assistant Prof Survival Guide · Grad School Ghost Stories · A Researcher’s Struggles',
        'Each Side Story has its own spooky backgrounds and music, special rules, and unique enemies and bosses',
        'Raised the battlefield floor so it no longer overlaps the deploy buttons',
        'Old saved accounts now show up on the leaderboard too',
      ],
    },
  },
  {
    version: '0.9.1',
    date: '2026-11-17',
    title: '진행도 버그 수정',
    items: [
      '예전 진행도를 옮길 때 안 깬 스테이지가 클리어로 표시되던 문제를 고쳤어요',
    ],
    en: {
      title: 'Progress Bug Fix',
      items: [
        'Fixed stages you hadn’t cleared showing as cleared after migrating old progress',
      ],
    },
  },
  {
    version: '0.9.0',
    date: '2026-11-17',
    title: '70스테이지와 스토리 몰아보기',
    items: [
      '챕터마다 10스테이지, 모두 70스테이지로 늘었어요',
      '스테이지마다 짧은 스토리 장면이 붙었어요',
      '{scroll} 스토리 다시 보기에서 몰아보기와 이어보기를 할 수 있어요',
      '새 시설 일정 관리 앱: 동료 재소환 대기시간이 줄어요',
      '도감에 스킬 탭이 생기고, 화면 흔들림을 없앴어요',
    ],
    en: {
      title: '70 Stages and Story Binge Mode',
      items: [
        '10 stages per chapter, 70 stages in total',
        'Every stage now has a short story scene',
        '{scroll} Story replay now supports binge-watching and resuming where you left off',
        'New facility, Planner App: shortens labmate redeploy cooldowns',
        'Added a Skills tab to the encyclopedia and removed screen shake',
      ],
    },
  },
  {
    version: '0.8.1',
    date: '2026-11-17',
    title: '스토리 열림 수정',
    items: [
      '예전 진행도를 옮긴 계정도 깬 만큼 스토리 다시 보기와 엔딩이 열려요',
    ],
    en: {
      title: 'Story Unlock Fix',
      items: [
        'Accounts with migrated progress now unlock story replay and the ending for everything they’ve cleared',
      ],
    },
  },
  {
    version: '0.8.0',
    date: '2026-11-16',
    title: '7챕터 캠페인과 무한 모드',
    items: [
      '학부생부터 포닥까지 7챕터 캠페인이 열렸어요',
      '방학, 학회, 졸업논문 같은 특별 스테이지와 새 보스 2종',
      '움직이는 스토리 컷신과 엔딩, 스토리 다시 보기',
      '{infinity} 무한 모드와 순위표',
      '동료가 많아도 소환 칸이 넘치지 않고, 10~12번 단축키가 생겼어요',
    ],
    en: {
      title: '7-Chapter Campaign and Endless Mode',
      items: [
        'A 7-chapter campaign from undergrad all the way to postdoc',
        'Special stages like breaks, conferences and thesis season, plus 2 new bosses',
        'Animated story cutscenes, an ending, and story replay',
        '{infinity} Endless Mode and a leaderboard',
        'The deploy bar no longer overflows with lots of labmates, and hotkeys 10–12 were added',
      ],
    },
  },
  {
    version: '0.7.0',
    date: '2026-11-16',
    title: '소리와 타격감',
    items: [
      '때리고 맞을 때의 연출이 훨씬 시원해졌어요',
      '{note} 배경음악과 효과음이 생겼어요',
      '{sound} 소리 설정에서 음악과 효과음을 따로 조절할 수 있어요',
    ],
    en: {
      title: 'Sound and Impact',
      items: [
        'Hitting and getting hit feels way punchier',
        '{note} Added background music and sound effects',
        '{sound} Adjust music and sound effects separately in the sound settings',
      ],
    },
  },
  {
    version: '0.6.0',
    date: '2026-11-16',
    title: '넓은 화면 대응',
    items: [
      '폰 화면을 좌우 빈 띠 없이 꽉 채워요',
      '한글 입력 상태에서도 단축키가 먹혀요',
    ],
    en: {
      title: 'Wide Screen Support',
      items: [
        'Fills phone screens edge to edge with no side bars',
        'Hotkeys work even while the Korean input mode is on',
      ],
    },
  },
];
localizeAll(PATCH_NOTES);

/** 현재 게임 버전 (패치노트 맨 위) */
export const GAME_VERSION = PATCH_NOTES[0]!.version;

/** '0.10.1' 같은 버전을 비교한다. a가 더 새로우면 양수. */
export function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d) return d;
  }
  return 0;
}

/** 마지막으로 본 버전보다 새 패치노트 (최신 순). 본 적이 없으면(새 플레이어) 빈 목록. */
export function unseenNotes(lastSeen: string | null | undefined, notes: PatchNote[] = PATCH_NOTES): PatchNote[] {
  if (!lastSeen) return [];
  return notes.filter((n) => compareVersions(n.version, lastSeen) > 0);
}
