/**
 * 패치노트. 맨 위가 최신 버전이고, 맨 위 버전이 곧 게임 버전(package.json)이다.
 * 새 버전을 낼 때는 맨 위에 항목 하나를 추가하면 된다.
 * 글자 속 `{sparkle}` 같은 표시는 손그림 아이콘으로 바뀐다 (이모지는 쓰지 않는다).
 */
export interface PatchNote {
  version: string;
  /** YYYY-MM-DD */
  date: string;
  title: string;
  items: string[];
}

export const PATCH_NOTES: PatchNote[] = [
  {
    version: '0.14.0',
    date: '2026-11-17',
    title: '난이도 조정과 새 기능',
    items: [
      '적이 전체적으로 10~20% 강해졌어요 (5~6챕터 벽은 완화)',
      '밤샘 모드 너프: 6초, 공격 속도 ×1.4, 멘탈 55',
      '타이틀과 엔딩에 제작자 크레딧 추가',
      '접속하면 업데이트 소식을 보여 줘요',
    ],
  },
  {
    version: '0.13.0',
    date: '2026-11-17',
    title: '손그림 아이콘',
    items: [
      '화면 곳곳의 이모지를 게임 그림체에 맞춘 손그림 아이콘으로 바꿨어요',
      '기기마다 아이콘 모양이 달라 보이던 문제가 사라졌어요',
    ],
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
  },
  {
    version: '0.10.1',
    date: '2026-11-17',
    title: '3배속과 편의 개선',
    items: [
      '전투를 3배속으로 돌릴 수 있어요',
      '연구실 강화 후에도 목록 스크롤 위치가 그대로 유지돼요',
    ],
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
  },
  {
    version: '0.9.1',
    date: '2026-11-17',
    title: '진행도 버그 수정',
    items: [
      '예전 진행도를 옮길 때 안 깬 스테이지가 클리어로 표시되던 문제를 고쳤어요',
    ],
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
  },
  {
    version: '0.8.1',
    date: '2026-11-17',
    title: '스토리 열림 수정',
    items: [
      '예전 진행도를 옮긴 계정도 깬 만큼 스토리 다시 보기와 엔딩이 열려요',
    ],
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
  },
  {
    version: '0.6.0',
    date: '2026-11-16',
    title: '넓은 화면 대응',
    items: [
      '폰 화면을 좌우 빈 띠 없이 꽉 채워요',
      '한글 입력 상태에서도 단축키가 먹혀요',
    ],
  },
];

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
