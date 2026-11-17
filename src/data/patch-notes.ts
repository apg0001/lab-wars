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
    version: '0.19.2',
    date: '2026-11-18',
    title: '선물이 왔어요',
    items: [
      '{gift} 게임을 켜 둔 동안에도 선물이 오면 "선물이 도착했어요!" 알림이 뜨고 선물함 배지가 바로 바뀌어요',
      '{infinity} 캠페인을 다 깼다면 "연구실로"를 누를 때 바로 무한 모드가 열려요',
      '{phone} 홈 화면 앱(아이폰 세로): 위쪽 반투명 그라데이션을 없애고 아래쪽 빈 공간을 줄였어요. 홈 화면 아이콘을 지우고 다시 추가해야 적용돼요',
    ],
    en: {
      title: 'Special Delivery',
      items: [
        '{gift} Gifts that arrive while you play now pop a "You\'ve got gifts!" notice and update the inbox badge right away',
        '{infinity} Once the campaign is cleared, "To the Lab" opens Endless Mode directly',
        '{phone} Home-screen app (iPhone portrait): removed the translucent gradient at the top and trimmed the empty space at the bottom. Re-add the home-screen icon to apply',
      ],
    },
  },
  {
    version: '0.19.1',
    date: '2026-11-18',
    title: '숨 고르기',
    items: [
      '{envelope} 학회 경품 추첨이 열리기 전에 잠깐 슬로우모션과 함께 화면이 어두워져요. 그동안 키 입력은 쉬어요',
      '{check} 소환하던 숫자키로 카드를 실수로 고르지 않게, 카드가 다 뒤집히고 잠깐 뒤부터 1·2·3으로 고를 수 있어요 (클릭·탭은 바로)',
      '{sparkle} 렙장처럼 주변을 강하게 하는 유닛의 오로라 범위가 발밑에 보여요. 조교의 범위는 빨갛게 보여요',
    ],
    en: {
      title: 'Catch Your Breath',
      items: [
        '{envelope} Before the Conference Raffle opens, the battle slows down and the screen dims for a moment. Keys rest during it',
        '{check} So summon keys don\'t pick a card by accident, 1·2·3 work a moment after all cards flip (clicks and taps work right away)',
        '{sparkle} Aura units like the Lab Chief now show their range at their feet. The TA\'s range shows in red',
      ],
    },
  },
  {
    version: '0.19.0',
    date: '2026-11-18',
    title: '외전 4·5·6·7',
    items: [
      '{redbook} 외전 4편 추가! 엔딩 뒤 외전 지도에서 할 수 있어요',
      '{clock} 외전 4 · 마감 24시: 시간 제한이 짧고, 시간이 갈수록 적이 빨라져요. 보스는 학회 제출 시스템',
      '{robot} 외전 5 · AI 시대의 연구실: 내가 소환한 유닛을 적이 복제해 내보내요. 보스는 자동 리뷰 AI',
      '{coin} 외전 6 · 졸업 후: 랩실 창업기: 카페인 충전이 점점 줄어드는 번레이트. 보스는 투자 심사역',
      '{warn} 외전 7 · 연구실 정전의 날: 20초마다 순간 정전으로 기절하고 일부는 저장 안 한 데이터처럼 사라져요. 무정전 전원 장치(UPS) 근처는 안전',
      '{scroll} 새 적 15종, 새 배경음악 2곡, 컷신 28개',
    ],
    en: {
      title: 'Side Stories 4–7',
      items: [
        '{redbook} Four new side stories, on the side-story map after the ending',
        '{clock} 4 · 24 Hours to Deadline: a short time limit and enemies that speed up over time. Boss: the Submission System',
        '{robot} 5 · The Lab in the Age of AI: the enemy clones units you summon. Boss: the Auto-Review AI',
        '{coin} 6 · The Lab Startup: caffeine income keeps shrinking (burn rate). Boss: the VC Partner',
        '{warn} 7 · Blackout Day: power blips every 20s stun your squad and may wipe unsaved units. Stay near a UPS',
        '{scroll} 15 new enemies, 2 new music tracks, 28 cutscenes',
      ],
    },
  },
  {
    version: '0.18.1',
    date: '2026-11-17',
    title: '간단히 보기 고침',
    items: [
      '{check} 연구실 간단히 보기에서 카드 그림이 칸 밖으로 커져 다른 카드를 덮던 문제를 고쳤어요',
      '{book} 넓은 화면의 간단히 보기는 한 줄에 더 많이 보여요 (연구실 7칸, 도감 10칸)',
    ],
    en: {
      title: 'Compact View Fix',
      items: [
        '{check} Fixed card pictures in the lab\'s compact view growing past their box and covering other cards',
        '{book} Compact view fits more per row on wide screens (7 in the lab, 10 in the Codex)',
      ],
    },
  },
  {
    version: '0.18.0',
    date: '2026-11-17',
    title: '편해진 연구실',
    items: [
      '{bolt} 전투가 훨씬 가벼워졌어요. 캐릭터 그림을 미리 그려 두고 찍어서, 유닛이 많은 난전과 교수님 비상 소집 순간에도 덜 끊겨요',
      '{swords} 지도에 편성 버튼이 따로 생겼어요. 연구실 강화는 동료·시설만 다뤄요',
      '{flask} 연구실 강화와 도감에서 정렬 기준(등급·레벨·비용·공격력·체력·이름)과 순서를 고를 수 있어요',
      '{book} 간단히 보기로 카드를 한눈에, 자세히 보기로 능력치와 능력 설명까지 볼 수 있어요. 고른 방식은 기억해요',
      '{cap} 처음 하는 분을 위한 첫 전투 안내가 생겼어요. 편성을 아직 안 해 본 분께는 한 번 편성 화면을 안내해요',
      '{gift} 선물함이 생겼어요. 운영자가 보낸 연구비·장비 뽑기권을 선물함에서 받을 수 있어요 (계정 로그인)',
      '{book} 기본 동료와 모든 적·보스에 도감 설정 글이 생겼어요. 리뷰어 2가 왜 그러는지 이제 알 수 있어요',
    ],
    en: {
      title: 'A Comfier Lab',
      items: [
        '{bolt} Battles run much lighter. Characters are pre-drawn and stamped, so big fights and the Prof\'s emergency summons stutter far less',
        '{swords} The map now has its own Squad button; Upgrade Lab handles labmates and facilities',
        '{flask} Upgrade Lab and the Codex can sort by rarity, level, cost, attack, HP or name, in either order',
        '{book} Compact view shows more cards at once; detailed view adds stats and ability text. Your choice is remembered',
        '{cap} New players get a short guide in their first battle, and players who haven\'t set a squad get one pointer to it',
        '{gift} Gift box: claim funds and gear tickets sent by the dev (account login)',
        '{book} Starter labmates and every enemy and boss now have Codex entries. Now you know why Reviewer 2 is like that',
      ],
    },
  },
  {
    version: '0.17.2',
    date: '2026-11-17',
    title: '세로 화면 다듬기',
    items: [
      '{phone} 아이폰 세로 화면에서 위아래에 생기던 검은 띠를 게임 배경색으로 바꿨어요',
      '{check} 덜 길쭉한 세로 화면에서 지도 아래 버튼(장비 지원 등)이 잘리던 문제를 고쳤어요',
      '{star} 지도의 총 별이 외전 별까지 세어 최대치를 넘던 문제를 고쳤어요',
      '{swords} 소환 카드 테두리를 통일했어요. 등급은 카드 위쪽 색 띠로 보여요',
      '{coffee} PC에서 후원 버튼을 누르면 휴대폰으로 여는 방법을 안내해요 (카카오페이 링크는 휴대폰 전용)',
    ],
    en: {
      title: 'Portrait Polish',
      items: [
        '{phone} The dark bars above and below the game on iPhone portrait now match the game background',
        '{check} Map buttons (Equipment Grant etc.) no longer get cut off on shorter portrait screens',
        '{star} The map star total no longer counts side-story stars past the maximum',
        '{swords} Summon cards share one border style; rarity shows as a colored strip on top',
        '{coffee} On PC, the support button explains how to open the phone-only KakaoPay link',
      ],
    },
  },
  {
    version: '0.17.1',
    date: '2026-11-17',
    title: '커피 한 잔의 여유',
    items: [
      '{coffee} 타이틀과 패치노트 창에 개발자 후원 링크(카카오페이)를 달았어요. 대학원생 개발자의 카페인이 됩니다',
      '{fire} 장비 지원 화면에 "열정"이 무엇인지 설명을 넣었어요. 중복으로 나온 장비는 마지막 단계 레벨 상한이 올라가요',
    ],
    en: {
      title: 'Coffee Break',
      items: [
        '{coffee} Added a small support link for Korean players (KakaoPay)',
        '{fire} The Equipment Grant screen now explains Passion: duplicate gear raises its final-tier level cap',
      ],
    },
  },
  {
    version: '0.17.0',
    date: '2026-11-17',
    title: '장비 지원 사업 선정',
    items: [
      '{sparkle} 장비 지원 뽑기: 연구비로 뽑기권을 사서 정보통신·전자 장비 유닛 28종(레어 14·에픽 9·레전더리 5)을 뽑아요. 10연차는 에픽 이상 보장, 100회면 레전더리를 골라 받아요',
      '{swords} 편성 9칸: 연구실의 편성 탭에서 데리고 나갈 9명을 고르고 프리셋 3개를 저장해요. 단축키는 1~9',
      '{flask} 새 전투 능력: 화상, 둔화, 빙결, 관통, 연쇄 번개, 방어력 감소, 띄우기, 흡혈, 보호막, 회복, 포탑·소환, 부활, 전장 폭격',
      '{infinity} 무한 모드 버그 군단: 세그폴트, 메모리 누수, 무한 루프, 머지 컨플릭트, 블루스크린, 정전. 30판부터는 커널 패닉과 레거시 코드',
      '{redbook} 같은 장비가 또 나오면 레벨 상한이 올라가요 (최대 +5). 보스 첫 클리어와 무한 10판마다 뽑기권 1장',
    ],
    en: {
      title: 'Equipment Grant Approved',
      items: [
        '{sparkle} Equipment Grant: buy tickets with funding and pull 28 ICT/electronics gear units (14 Rare, 9 Epic, 5 Legendary). 10-pulls guarantee Epic+, and 100 pulls let you pick a Legendary',
        '{swords} 9-slot Squad: choose who deploys in the Lab’s Squad tab and save up to 3 presets. Hotkeys 1–9',
        '{flask} New abilities: burn, slow, freeze, pierce, chain lightning, armor shred, knock-up, lifesteal, shields, healing, turrets & summons, revive, field strikes',
        '{infinity} Endless bug army: Segfault, Memory Leak, Infinite Loop, Merge Conflict, Blue Screen, Power Outage — and from round 30, Kernel Panic and Legacy Code',
        '{redbook} Duplicates raise that unit’s level cap (up to +5). Free tickets for first boss clears and every 10 endless rounds',
      ],
    },
  },
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
