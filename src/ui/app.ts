import { CHAPTERS, SIDE_CHAPTERS, SIDE_STAGES, STAGES, STAGE_BY_ID, endlessStage, type StageDef, type StageKind } from '../data/stages';

/** 지도 탭 번호: 1~7 챕터, 8 무한, 9 외전 */
const SIDE_TAB = CHAPTERS.length + 2;
/** 스토리 장면 속 주인공 모습 (외전은 시절이 다르다) */
const heroChapter = (s: StageDef): number => (s.side ? SIDE_CHAPTERS[s.side - 1]!.heroChapter : s.chapter);
import { ENEMY_BY_ID } from '../data/enemies';
import { UNITS } from '../data/units';
import { FACILITIES, SKILLS, facilityCost } from '../data/upgrades';
import type { UnitDef } from '../data/types';
import {
  applyOutcome, canEvolve, canLevelUp, canSubscribe, evolve, evolveCost, isCleared, isEndlessOpen, isSkillOpen, isStageOpen,
  isUnitOwned, levelCap, levelUp, levelUpCost, makeLoadout, newSave, subscribe, unitProgress, unitStats,
  upgradeFacility, takeMigrationNotes, REPLAY_MUL, type SaveData,
} from '../sim/progression';
import { RANGED_THRESHOLD } from '../data/types';
import { kv, LocalSaveStore, ProfileManager, type Profile, type SaveStore } from '../save/store';
import { AccountApi, AccountSaveStore, API_URL, ApiError, progressScore, type RankRow, type SyncState } from '../save/remote';
import { mountBattle } from './battle-screen';
import { music } from '../audio/music';
import { audioIcon, showAudioSettings } from './audio-settings';
import { mountGallery } from './gallery';
import { isFullscreen, onFullscreenChange, shouldOfferFullscreen, toggleFullscreen } from './fullscreen';
import { h, fmt, setRich } from './dom';
import { iconEl } from '../render/doodle';
import { portrait } from './icons';
import { SCENES, type Scene } from '../story/script';
import { STORY_ORDER, scenesOfStage, unlockedScenes } from '../story/unlock';
import { playMarathon, playScenes } from '../story/player';

const KIND_ICON: Partial<Record<StageKind, string>> = { vacation: '{beach}', conference: '{mic}', thesis: '{paper}' };

interface Settings {
  /** 전투 배속 1~3 */
  speed: number;
  /** 스토리 몰아보기: 다음에 볼 장면 id */
  storyAt?: string;
}

export class App {
  private readonly localStore = new LocalSaveStore();
  private readonly api = API_URL ? new AccountApi(API_URL) : null;
  private readonly accountStore = this.api ? new AccountSaveStore(this.api) : null;
  private readonly profiles = new ProfileManager(this.localStore);
  private sync: SyncState | null = null;
  private notice = '';
  private profile: Profile | null = null;
  private save: SaveData = newSave();
  private settings: Settings = { speed: 1 };
  private chapter = 1;
  private cleanup: (() => void) | null = null;

  private storeFor(p: Profile): SaveStore {
    return p.kind === 'account' && this.accountStore ? this.accountStore : this.localStore;
  }

  constructor(private readonly root: HTMLElement) {
    // 전체 화면이 켜지거나 꺼지면 버튼 글자를 바꾼다
    onFullscreenChange(() => {
      const btn = this.root.querySelector('.fs-btn');
      if (btn) setRich(btn, fsLabel());
    });
    if (this.accountStore) {
      this.accountStore.onSync = (st) => {
        this.sync = st;
        const chip = this.root.querySelector('.sync-chip');
        if (chip) chip.replaceWith(this.syncChip());
      };
      this.accountStore.onReplaced = (data) => {
        // 다른 기기에서 더 많이 진행했다: 화면이 전투 중이 아니면 바로 반영한다.
        this.save = data;
        if (this.root.querySelector('.map')) this.showMap();
      };
    }
    try {
      const raw = JSON.parse(kv.get('settings') ?? '{}') as Partial<Settings> & { speed2x?: boolean };
      // 예전 2배속 켜기/끄기 설정을 이어받는다
      if (raw.speed === undefined && raw.speed2x) raw.speed = 2;
      delete raw.speed2x;
      this.settings = { ...this.settings, ...raw };
    } catch {
      /* 기본값 사용 */
    }
  }

  async start(): Promise<void> {
    // 자동 접속: 마지막으로 쓴 프로필이 있으면 바로 불러온다.
    const last = this.profiles.lastUsed();
    if (last) await this.enter(last, false);
    this.showTitle();
  }

  private swap(el: HTMLElement): void {
    this.cleanup?.();
    this.cleanup = null;
    this.root.replaceChildren(el);
  }

  private async enter(p: Profile, go = true): Promise<void> {
    this.profile = p;
    this.sync = p.kind === 'account' ? 'pending' : null;
    takeMigrationNotes();
    this.save = (await this.storeFor(p).load(p.id)) ?? newSave();
    const notes = takeMigrationNotes();
    if (notes.length) {
      // 환불 등 정리된 데이터를 바로 저장해 같은 일이 두 번 일어나지 않게 한다
      this.notice = [...new Set(notes)].join(' ');
      this.persist();
    }
    if (p.kind === 'account' && this.api && !this.api.user) {
      // 갱신 토큰이 만료돼 로그아웃됐다
      this.profiles.drop(p.id);
      this.profile = null;
      this.save = newSave();
      this.notice = '로그인이 만료됐어요. 다시 로그인해 주세요.';
      this.showTitle();
      return;
    }
    this.profiles.remember(p);
    const next = STAGES.find((s) => !isCleared(this.save, s.id)) ?? STAGES[STAGES.length - 1]!;
    this.chapter = next.chapter;
    if (go) this.showMap();
  }

  private persist(): void {
    if (this.profile) void this.storeFor(this.profile).save(this.profile.id, this.save);
  }

  private syncChip(): HTMLElement {
    const label = { synced: '{cloud} 저장됨', pending: '{hourglass} 저장 중', offline: '{offline} 오프라인', error: '{warn} 동기화 오류' };
    return h('span.sync-chip', {}, this.sync ? label[this.sync] : '{phone} 이 기기');
  }

  private saveSettings(): void {
    kv.set('settings', JSON.stringify(this.settings));
  }

  // ───────────────────── 타이틀 / 프로필 ─────────────────────

  /** 소리 설정 버튼 (누르면 아이콘도 갱신) */
  private audioBtn(cls = ''): HTMLElement {
    const btn = h(`button.icon-btn.audio-btn${cls}`, { title: '소리 설정', onclick: () => showAudioSettings(this.root.firstElementChild, () => { setRich(btn, audioIcon()); }) }, audioIcon());
    return btn;
  }

  showTitle(): void {
    music.play('lobby');
    const p = this.profile;
    const cast = h('div.title-cast', {},
      h('img', { src: portrait(UNITS[2]!.look, 3, 'coder'), alt: '' }),
      h('img', { src: portrait(UNITS[0]!.look, 1, 'grunt'), alt: '' }),
      h('img.vs', { src: portrait(UNITS[9]!.look, 1, 'claudy'), alt: '' }),
      h('span.vs-mark', {}, 'VS'),
      h('img.big', { src: portrait(ENEMY_BY_ID.president!.look, 1, 'president', -1), alt: '' }),
      h('img', { src: portrait(ENEMY_BY_ID.reviewer!.look, 1, 'reviewer', -1), alt: '' }),
    );
    const body = p
      ? h('div.title-actions', {},
        h('button.btn.primary.big', { onclick: () => this.showMap() }, `▶ ${p.name} 연구실로`),
        h('div.btn-row', {},
          h('button.btn.small', { onclick: () => this.showProfiles() }, '{user} 프로필 변경'),
          this.api && p.kind !== 'account' ? h('button.btn.small', { onclick: () => this.showLogin() }, '{key} 로그인 / 가입') : null,
        ),
      )
      : this.newProfileForm();
    const notice = this.notice ? h('p.notice', {}, this.notice) : null;
    this.notice = '';
    const fsBtn = shouldOfferFullscreen() || isFullscreen()
      ? h('button.icon-btn.fs-btn', { title: '전체 화면', onclick: () => void toggleFullscreen(this.root.firstElementChild) }, fsLabel())
      : null;
    this.swap(h('div.screen.title', {},
      h('div.title-corner', {}, this.audioBtn(), fsBtn),
      h('div.title-logo', {}, h('h1', {}, '랩워즈'), h('p', {}, '교수님에게서 연구실을 지켜라!')),
      cast,
      body,
      notice,
      h('p.title-foot', {}, p
        ? (p.kind === 'account' ? `{key} ${p.name} 계정으로 자동 로그인됨 · 어느 기기에서든 이어서 플레이` : '게스트 · 이 기기에만 저장 중' + (this.api ? ' (로그인하면 다른 기기에서도 이어서 할 수 있어요)' : ''))
        : '진행 상황은 이 기기에 저장됩니다'),
    ));
  }

  private newProfileForm(): HTMLElement {
    const input = h('input.name-input', { maxlength: '12', placeholder: '이름 (예: 김석사)', enterkeyhint: 'done' }) as HTMLInputElement;
    const go = async (): Promise<void> => {
      const p = this.profiles.create(input.value);
      await this.enter(p);
      this.persist();
    };
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') void go();
    });
    return h('div.title-actions', {}, input, h('button.btn.primary.big', { onclick: () => void go() }, '{cap} 게스트로 시작'),
      h('div.btn-row', {},
        this.api ? h('button.btn.small', { onclick: () => this.showLogin() }, '{key} 로그인 / 가입') : null,
        this.profiles.list().length ? h('button.btn.small', { onclick: () => this.showProfiles() }, '{user} 기존 프로필') : null,
      ));
  }

  private showProfiles(): void {
    const list = this.profiles.list();
    const overlay = h('div.overlay');
    const close = (): void => overlay.remove();
    const rows = list.map((p) => h('div.profile-row', {},
      h('button.btn.profile-pick', { onclick: async () => { close(); await this.enter(p); } }, `${p.id === this.profile?.id ? '{check} ' : ''}${p.kind === 'account' ? '{key} ' : '{phone} '}${p.name}`),
      p.kind === 'account' ? h('button.btn.small', { onclick: async () => {
        await this.api?.logout();
        await this.localStore.remove(p.id);
        this.profiles.drop(p.id);
        if (this.profile?.id === p.id) {
          this.profile = null;
          this.save = newSave();
        }
        close();
        this.showTitle();
      } }, '로그아웃') : h('button.btn.small.danger', { onclick: async () => {
        if (!confirm(`'${p.name}' 프로필과 진행 상황을 삭제할까요? 되돌릴 수 없습니다.`)) return;
        await this.profiles.remove(p.id);
        if (this.profile?.id === p.id) {
          this.profile = null;
          this.save = newSave();
        }
        close();
        this.showTitle();
        if (this.profiles.list().length) this.showProfiles();
      } }, '삭제'),
    ));
    overlay.append(h('div.panel.profiles', {},
      h('h2', {}, '프로필'),
      h('div.profile-list', {}, ...rows),
      h('div.btn-row', {},
        h('button.btn.primary', { onclick: () => { close(); this.profile = null; this.profiles.forget(); this.showTitle(); } }, '＋ 새 프로필'),
        h('button.btn', { onclick: close }, '닫기'),
      ),
    ));
    this.root.firstElementChild?.append(overlay);
  }

  private showLogin(): void {
    const api = this.api;
    if (!api) return;
    const overlay = h('div.overlay');
    const close = (): void => overlay.remove();
    const user = h('input.name-input', { maxlength: '16', placeholder: '아이디 (2~16자)', autocomplete: 'username', autocapitalize: 'off' }) as HTMLInputElement;
    const pass = h('input.name-input', { type: 'password', maxlength: '128', placeholder: '비밀번호 (8자 이상)', autocomplete: 'current-password' }) as HTMLInputElement;
    const msg = h('p.form-msg');
    const guest = this.profile && this.profile.kind === 'guest' ? { p: this.profile, save: this.save } : null;
    const submit = async (mode: 'login' | 'register'): Promise<void> => {
      msg.textContent = '잠시만요…';
      try {
        const u = mode === 'login' ? await api.login(user.value.trim(), pass.value) : await api.register(user.value.trim(), pass.value);
        const acct = this.profiles.upsertAccount(u.id, u.username);
        // 계정이 비어 있고 지금 게스트로 진행한 게 있으면 옮길지 묻는다
        if (guest && progressScore(guest.save) > 0) {
          const remote = await api.getSave().catch(() => null);
          if (remote && remote.data === null && confirm(`게스트 '${guest.p.name}'의 진행 상황을 '${u.username}' 계정으로 옮길까요?`)) {
            await this.localStore.save(acct.id, guest.save);
          }
        }
        close();
        await this.enter(acct);
      } catch (e) {
        msg.textContent = e instanceof ApiError ? e.message : '서버에 연결할 수 없어요. 인터넷 연결을 확인해 주세요.';
      }
    };
    pass.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') void submit('login');
    });
    overlay.append(h('div.panel.login', {},
      h('h2', {}, '{key} 로그인'),
      h('p.muted', {}, '로그인하면 진행 상황이 계정에 저장되어 다른 기기에서도 이어서 할 수 있어요.'),
      h('div.title-actions', {}, user, pass),
      msg,
      h('div.btn-row', {},
        h('button.btn', { onclick: close }, '닫기'),
        h('button.btn', { onclick: () => void submit('register') }, '회원가입'),
        h('button.btn.primary', { onclick: () => void submit('login') }, '로그인'),
      ),
    ));
    this.root.firstElementChild?.append(overlay);
    user.focus();
  }

  // ───────────────────── 스테이지 지도 ─────────────────────

  private topBar(title: string, back?: () => void): HTMLElement {
    return h('div.topbar', {},
      back ? h('button.btn.small', { onclick: back }, '← 뒤로') : h('button.btn.small', { onclick: () => this.showTitle() }, `{user} ${this.profile?.name ?? ''}`),
      h('h2.top-title', {}, title),
      h('div.top-right', {}, this.syncChip(), h('div.money', {}, `{coin} ${fmt(this.save.money)}`), this.audioBtn()),
    );
  }

  showMap(): void {
    music.play('lobby');
    const endlessOpen = isEndlessOpen(this.save);
    if (this.chapter > CHAPTERS.length && !endlessOpen) this.chapter = CHAPTERS.length;
    const tabs = h('div.chapter-tabs', {}, ...CHAPTERS.map((c) => {
      const open = isStageOpen(this.save, STAGE_BY_ID[`${c.id}-1`]!);
      return h(`button.chapter-tab${c.id === this.chapter ? '.on' : ''}`, {
        disabled: open ? undefined : 'true',
        onclick: () => { this.chapter = c.id; this.showMap(); },
      }, open ? c.name : `{lock} ${c.name}`);
    }), h(`button.chapter-tab.endless-tab${this.chapter === CHAPTERS.length + 1 ? '.on' : ''}`, {
      disabled: endlessOpen ? undefined : 'true',
      onclick: () => { this.chapter = CHAPTERS.length + 1; this.showMap(); },
    }, endlessOpen ? '{infinity} 무한' : '{lock} {infinity}'), h(`button.chapter-tab.side-tab${this.chapter === SIDE_TAB ? '.on' : ''}`, {
      disabled: endlessOpen ? undefined : 'true',
      onclick: () => { this.chapter = SIDE_TAB; this.showMap(); },
    }, endlessOpen ? '{redbook} 외전' : '{lock} {redbook}'));
    if (this.chapter === SIDE_TAB) return this.showSideMap(tabs);
    if (this.chapter > CHAPTERS.length) return this.showEndlessMap(tabs);
    const ch = CHAPTERS[this.chapter - 1]!;
    const stages = STAGES.filter((s) => s.chapter === ch.id);
    const nodes = h('div.stage-path', {}, ...stages.map((s) => this.stageNode(s)));
    const totalStars = Object.values(this.save.stars).reduce((a, b) => a + b, 0);
    const toast = this.notice ? h('div.toast', { onclick: (e: Event) => (e.currentTarget as HTMLElement).remove() }, this.notice) : null;
    this.notice = '';
    this.swap(h('div.screen.map', {},
      this.topBar('스테이지'),
      toast,
      tabs,
      h('div.chapter-title', {}, h('b', {}, `${ch.id}장 ${ch.name}: ${ch.subtitle}`), h('span.muted', {}, ` · 총 별 ${totalStars}/${STAGES.length * 3}`)),
      nodes,
      this.mapActions(),
    ));
  }

  private mapActions(): HTMLElement {
    return h('div.map-actions', {},
      h('button.btn.lab-btn', { onclick: () => this.showLab() }, '{flask} 연구실 강화'),
      h('button.btn.dex-btn', { onclick: () => this.showGallery() }, '{book} 도감'),
      h('button.btn.story-btn', { onclick: () => this.showStory() }, '{scroll} 스토리'),
      h('button.btn.rank-btn', { onclick: () => this.showLeaderboard() }, '{trophy} 순위'),
    );
  }

  /** 무한 모드: 다음 판 도전과 최고 기록 */
  /** 외전: 엔딩 뒤에 열리는 세 가지 이야기 */
  private showSideMap(tabs: HTMLElement): void {
    const rows = SIDE_CHAPTERS.map((sc) => {
      const stages = SIDE_STAGES.filter((s) => s.side === sc.id);
      const done = stages.filter((s) => isCleared(this.save, s.id)).length;
      return h(`div.side-row.theme-${sc.theme}`, {},
        h('div.side-head', {}, h('b', {}, `외전 ${sc.id} · ${sc.name}`), h('span', {}, sc.subtitle), h('small', {}, `${done}/5 · ${sc.rule.split(':')[0]}`)),
        h('div.side-nodes', {}, ...stages.map((s) => this.stageNode(s))),
      );
    });
    this.swap(h('div.screen.map.side-map', {},
      this.topBar('스테이지'),
      tabs,
      h('div.chapter-title', {}, h('b', {}, '{redbook} 외전: 아무도 말해 주지 않은 이야기'), h('span.muted', {}, ' · 으스스한 특수 규칙')),
      h('div.side-list', {}, ...rows),
      this.mapActions(),
    ));
  }

  private stageNode(s: StageDef): HTMLElement {
    const open = isStageOpen(this.save, s);
    const stars = this.save.stars[s.id] ?? 0;
    return h(`button.stage-node${s.boss ? '.boss' : ''}${open ? '' : '.locked'}${stars ? '.cleared' : ''}`, {
      disabled: open ? undefined : 'true',
      onclick: () => this.showStageInfo(s),
    },
    s.boss ? h('img', { src: portrait(ENEMY_BY_ID[s.boss]!.look, 1, s.boss, -1), alt: '' }) : null,
    KIND_ICON[s.kind] ? h('span.node-kind', {}, KIND_ICON[s.kind]!) : null,
    h('span.node-id', {}, open ? s.id : '{lock}'),
    h('span.node-name', {}, s.name),
    h('span.node-stars', {}, open ? '{star}'.repeat(stars) + '{starOff}'.repeat(3 - stars) : ''),
    );
  }

  private showEndlessMap(tabs: HTMLElement): void {
    const best = this.save.endless;
    const next = endlessStage(best + 1);
    const recent = [Math.max(1, best - 1), best, best + 1].filter((n, i, a) => n >= 1 && a.indexOf(n) === i);
    this.swap(h('div.screen.map', {},
      this.topBar('스테이지'),
      tabs,
      h('div.chapter-title', {}, h('b', {}, '{infinity} 무한 모드: 교수가 되어도 일은 끝나지 않는다'), h('span.muted', {}, ` · 최고 기록 ${best}판`)),
      h('div.endless-box', {},
        h('div.endless-best', {}, h('span', {}, '최고 기록'), h('b', {}, `${best}판`)),
        h('div.endless-list', {}, ...recent.map((n) => {
          const st = endlessStage(n);
          const open = isStageOpen(this.save, st);
          return h(`button.btn${n === best + 1 ? '.primary.big' : ''}`, { disabled: open ? undefined : 'true', onclick: () => this.showStageInfo(st) },
            `${n === best + 1 ? '도전: ' : '{retry} '}${st.name}${st.boss ? ` (${ENEMY_BY_ID[st.boss]!.name})` : ''}`);
        })),
        h('p.muted', {}, `다음 판 적 능력치 ×${next.scale.toFixed(1)} · 5판마다 보스 · 처음 넘는 판은 보상 전액`),
      ),
      this.mapActions(),
    ));
  }

  private showStageInfo(s: StageDef): void {
    const overlay = h('div.overlay');
    const close = (): void => overlay.remove();
    const enemyIds = [...s.pool.map((p) => p.id), ...(s.boss ? [s.boss] : [])];
    const first = !isCleared(this.save, s.id);
    const deck = makeLoadout(this.save).deck;
    overlay.append(h('div.panel.stage-info', {},
      h('h2', {}, `${s.id} ${s.name}`),
      s.boss ? h('p.boss-warn', {}, `{warn} 보스: ${ENEMY_BY_ID[s.boss]!.name}`) : null,
      s.note ? h('p.stage-note', {}, s.note) : null,
      h('p.muted', {}, '등장하는 적'),
      h('div.enemy-row', {}, ...enemyIds.map((id) => h('figure', {}, h('img', { src: portrait(ENEMY_BY_ID[id]!.look, 1, id, -1), alt: '' }), h('figcaption', {}, ENEMY_BY_ID[id]!.name)))),
      s.kind === 'endless'
        ? h('p', {}, s.index > this.save.endless ? `첫 돌파 보상 {coin} ${fmt(s.reward)}` : `재도전 보상 {coin} ${fmt(s.reward * 0.4)} + 처치 보상`)
        : h('p', {}, first ? `첫 클리어 보상 {coin} 최대 ${fmt(s.reward * 1.2)}` : `재도전 보상 {coin} 최대 ${fmt(s.reward * 1.2 * REPLAY_MUL)} + 처치 보상`),
      h('p.muted', {}, `출전 유닛 ${deck.length}종`),
      h('div.btn-row', {},
        h('button.btn', { onclick: close }, '닫기'),
        h('button.btn.primary', { onclick: () => { close(); this.startBattle(s); } }, '출전!'),
      ),
    ));
    this.root.firstElementChild?.append(overlay);
  }

  // ───────────────────── 전투 ─────────────────────

  // ───────────────────── 스토리 ─────────────────────

  /** 이 스테이지에 들어가기 전에 볼 장면 (아직 안 본 것만) */
  private scenesBefore(stage: StageDef): Scene[] {
    const ids = scenesOfStage(stage).before;
    return ids.filter((id) => !this.save.seen.includes(id)).map((id) => SCENES[id]!);
  }

  private play(scenes: Scene[], then: () => void, chapter: number): void {
    if (!scenes.length) return then();
    music.play(scenes[0]!.music ?? 'lobby');
    const first = scenes.some((sc) => !this.save.seen.includes(sc.id));
    for (const sc of scenes) if (!this.save.seen.includes(sc.id)) this.save.seen.push(sc.id);
    if (first) this.persist();
    // 처음 보는 엔딩은 건너뛸 수 없다
    const skippable = !scenes.some((sc) => sc.noSkip && first);
    playScenes(this.root, scenes, { heroName: this.profile?.name ?? '나', chapter, skippable }, then);
  }

  /** 스토리 다시 보기: 장면을 골라 거기서부터 몰아보기, 또는 보던 곳부터 이어서 보기 */
  private showStory(): void {
    const overlay = h('div.overlay');
    const close = (): void => overlay.remove();
    const open = unlockedScenes(this.save);
    const at = this.settings.storyAt ? open.indexOf(this.settings.storyAt) : -1;
    /** 묶음: 1~7 챕터, 외전은 'S1'~'S3' */
    const groupOf = (id: string): string => {
      const side = /^(?:side|st-S)(\d)/.exec(id);
      if (side) return `S${side[1]}`;
      return id === 'ending' ? '7' : (/^(?:ch|st-)(\d)/.exec(id)?.[1] ?? '1');
    };
    /** 장면 속 주인공 모습을 정하는 챕터 */
    const chapterOf = (id: string): number => {
      const g = groupOf(id);
      return g.startsWith('S') ? SIDE_CHAPTERS[Number(g[1]) - 1]!.heroChapter : Number(g);
    };
    const label = (id: string): string => {
      const sc = SCENES[id]!;
      if (id.startsWith('side') && id.endsWith('-clear')) return '{party} 외전 클리어';
      if (id.startsWith('side') && id.endsWith('-boss')) return `{ghost} ${STAGE_BY_ID[`S${id[4]}-5`]?.name ?? '보스'}`;
      if (id.startsWith('st-')) return `${id.slice(3)} ${STAGE_BY_ID[id.slice(3)]?.name ?? ''}`;
      if (id.endsWith('-intro')) return `{book} ${sc.title ?? id}`;
      if (id.endsWith('-boss')) return `{tie} ${sc.title ?? id}`;
      if (id === 'ending') return '{cap} 엔딩';
      return `{party} ${groupOf(id)}장 클리어`;
    };
    const run = (start: number): void => {
      close();
      this.swap(h('div.screen.story-backdrop'));
      playMarathon(this.root, open.map((id) => SCENES[id]!), start, {
        heroName: this.profile?.name ?? '나',
        chapterOf: (sc) => chapterOf(sc.id),
        locked: (sc) => !!sc.noSkip && !this.save.seen.includes(sc.id),
        onSeen: (sc, i) => {
          if (!this.save.seen.includes(sc.id)) { this.save.seen.push(sc.id); this.persist(); }
          const nextId = open[i + 1];
          if (nextId) this.settings.storyAt = nextId;
          else delete this.settings.storyAt;
          this.saveSettings();
        },
        onEnd: () => { this.showMap(); this.showStory(); },
      });
    };
    const groups = [
      ...CHAPTERS.map((c) => ({ key: String(c.id), name: `${c.id}장 · ${c.name}` })),
      ...SIDE_CHAPTERS.map((c) => ({ key: `S${c.id}`, name: `{redbook} 외전 ${c.id} · ${c.name}` })),
    ].map((g) => ({ ...g, ids: open.filter((id) => groupOf(id) === g.key) })).filter((g) => g.ids.length);
    overlay.append(h('div.panel.story-list', {},
      h('h2', {}, '{scroll} 스토리 다시 보기'),
      open.length
        ? h('div', {},
          h('p.muted', {}, `열린 장면 ${open.length} / ${STORY_ORDER.length} · 장면을 누르면 거기서부터 쭉 이어서 봐요`),
          h('div.story-top', {},
            ...(at > 0 ? [h('button.btn.primary', { onclick: () => run(at) }, `⏩ 이어서 보기 (${label(open[at]!)})`)] : []),
            h('button.btn', { onclick: () => run(0) }, '▶ 처음부터 몰아보기'),
          ),
          h('div.story-grid', {}, ...groups.flatMap((g) => [
            h('div.story-ch', {}, g.name),
            ...g.ids.map((id) => h(`button.btn.small${open.indexOf(id) === at ? '.here' : ''}`, { onclick: () => run(open.indexOf(id)) }, label(id))),
          ])),
        )
        : h('p.muted', {}, '아직 본 장면이 없어요. 스테이지에 들어가면 이야기가 시작돼요.'),
      h('button.btn', { onclick: close }, '닫기'),
    ));
    this.root.firstElementChild?.append(overlay);
  }

  private startBattle(stage: StageDef): void {
    const intro = this.scenesBefore(stage);
    if (intro.length) {
      this.swap(h('div.screen.story-backdrop'));
      return this.play(intro, () => this.startBattle(stage), heroChapter(stage));
    }
    const holder = h('div.screen');
    this.swap(holder);
    const before = this.unlockSnapshot();
    this.cleanup = mountBattle(holder, {
      stage,
      loadout: makeLoadout(this.save),
      speed: this.settings.speed,
      onSpeedChange: (sp) => { this.settings.speed = sp; this.saveSettings(); },
      onEnd: (e) => {
        const out = applyOutcome(this.save, stage, e.win, e.baseHpRatio, e.killReward);
        this.persist();
        const lines = [
          ...(e.timeout ? ['{clock} 시간 초과! 제한 시간 안에 교수실을 함락하지 못했어요.'] : []),
          e.win ? `클리어 보상 {coin} ${fmt(out.clearReward)}${out.firstClear ? ' (첫 클리어!)' : ''}` : '연구비는 처치한 만큼 받았어요.',
          `처치 보상 {coin} ${fmt(out.killReward)} · 처치 ${e.kills}`,
          ...this.unlockNews(before),
        ];
        const title = e.win ? '{party} 교수실 함락!' : e.timeout ? '{clock} 야근 확정… 시간 초과' : '{dizzy} 연구실이 망가졌다…';
        return { title, lines, stars: out.stars };
      },
      actions: (win) => {
        const next = stage.kind === 'endless' ? endlessStage(stage.index + 1) : stage.side ? STAGE_BY_ID[`S${stage.side}-${stage.index + 1}`] : STAGES[stage.order + 1];
        // 보스를 처음 이기면 챕터 마무리 장면, 마지막 보스면 엔딩
        const clearId = scenesOfStage(stage).after[0] ?? '';
        const clearScene = win && clearId && !this.save.seen.includes(clearId) ? SCENES[clearId] : undefined;
        if (clearScene?.id === 'ending') {
          return [{ label: '{cap} 엔딩 보기', primary: true, run: () => {
            this.swap(h('div.screen.story-backdrop'));
            this.play([clearScene], () => {
              this.chapter = CHAPTERS.length + 1;
              this.notice = '{infinity} 무한 모드와 {redbook} 외전 3편이 열렸어요! 교수가 되어도 일은 끝나지 않는다.';
              this.showMap();
            }, 7);
          } }];
        }
        const wrap = (run: () => void) => (clearScene ? () => { this.swap(h('div.screen.story-backdrop')); this.play([clearScene], run, heroChapter(stage)); } : run);
        if (win) {
          return [
            ...(next ? [{ label: `다음: ${next.kind === 'endless' ? next.name : `${next.id} ${next.name}`}`, primary: true, run: wrap(() => { this.chapter = next.chapter; this.startBattle(next); }) }] : []),
            { label: '{flask} 연구실 강화', primary: !next, run: wrap(() => this.showLab()) },
            { label: '{map} 지도로', run: wrap(() => this.showMap()) },
          ];
        }
        return [
          { label: '{flask} 연구실 강화', primary: true, run: () => this.showLab() },
          { label: '{retry} 다시 도전', run: () => this.startBattle(stage) },
          { label: '{map} 지도로', run: () => this.showMap() },
        ];
      },
      onQuit: () => this.showMap(),
    });
  }

  /** 순위표: 무한 모드 최고 기록 → 캠페인 별 순 */
  private showLeaderboard(): void {
    const overlay = h('div.overlay');
    const close = (): void => overlay.remove();
    const body = h('div.rank-body', {}, h('p.muted', {}, '불러오는 중…'));
    const isAccount = this.profile?.kind === 'account';
    overlay.append(h('div.panel.rank-panel', {},
      h('h2', {}, '{trophy} 연구실 순위'),
      h('p.muted.rank-sub', {}, '무한 모드 최고 기록 → 캠페인 별 순서예요. 계정 아이디가 표시돼요.'),
      body,
      isAccount || !this.api ? null : h('p.notice', {}, '{key} 로그인하면 내 기록도 순위에 올라가요.'),
      h('button.btn.primary', { onclick: close }, '닫기'),
    ));
    this.root.firstElementChild?.append(overlay);
    if (!this.api) {
      body.replaceChildren(h('p.muted', {}, '순위 서버가 연결되지 않은 버전이에요.'));
      return;
    }
    // 내 최신 기록이 반영되도록 먼저 저장을 밀어 둔다
    if (isAccount) this.persist();
    const row = (r: RankRow, me = false): HTMLElement => h(`div.rank-row${me ? '.me' : ''}${r.rank <= 3 ? `.top${r.rank}` : ''}`, {},
      h('span.rank-no', {}, r.rank <= 3 ? ['{medal1}', '{medal2}', '{medal3}'][r.rank - 1]! : String(r.rank)),
      h('span.rank-name', {}, r.name),
      h('span.rank-title', {}, r.title),
      h('span.rank-endless', {}, r.endless ? `{infinity} ${r.endless}판` : '—'),
      h('span.rank-stars', {}, `{star} ${r.stars}`),
    );
    this.api.leaderboard().then((lb) => {
      if (!lb.top.length) {
        body.replaceChildren(h('p.muted', {}, '아직 순위에 오른 사람이 없어요. 첫 번째가 되어 보세요!'));
        return;
      }
      const meName = this.api?.user?.username;
      body.replaceChildren(
        h('div.rank-list', {}, ...lb.top.map((r) => row(r, r.name === meName))),
        ...(lb.me && lb.me.rank > lb.top.length ? [h('div.rank-list.mine', {}, row(lb.me, true))] : []),
        h('p.muted', {}, `총 ${lb.total}명`),
      );
    }).catch(() => body.replaceChildren(h('p.muted', {}, '순위를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.')));
  }

  private unlockSnapshot(): Set<string> {
    const s = new Set<string>();
    for (const u of UNITS) {
      if (isUnitOwned(this.save, u)) s.add(`u:${u.id}`);
      if (canSubscribe(this.save, u)) s.add(`s:${u.id}`);
    }
    for (const k of SKILLS) if (isSkillOpen(this.save, k)) s.add(`k:${k.id}`);
    for (const c of CHAPTERS) if (isStageOpen(this.save, STAGE_BY_ID[`${c.id}-1`]!)) s.add(`c:${c.id}`);
    return s;
  }

  private unlockNews(before: Set<string>): string[] {
    const news: string[] = [];
    const after = this.unlockSnapshot();
    for (const key of after) {
      if (before.has(key)) continue;
      const [kind, id] = key.split(':') as [string, string];
      if (kind === 'u') news.push(`{party} 새 동료 합류: ${UNITS.find((u) => u.id === id)!.names[0]}`);
      if (kind === 's') news.push(`{robot} AI 조수 구독 가능: ${UNITS.find((u) => u.id === id)!.names[0]}`);
      if (kind === 'k') news.push(`{sparkle} 새 스킬: ${SKILLS.find((k) => k.id === id)!.name}`);
      if (kind === 'c') news.push(`{book} 새 챕터: ${CHAPTERS[Number(id) - 1]!.name}`);
    }
    return news;
  }

  showGallery(): void {
    music.play('lobby');
    const holder = h('div.screen');
    this.swap(holder);
    this.cleanup = mountGallery(holder, this.save, () => this.showMap());
  }

  // ───────────────────── 연구실 강화 ─────────────────────

  showLab(tab: 'units' | 'facilities' = 'units'): void {
    music.play('lobby');
    const body = tab === 'units' ? this.unitCards() : this.facilityCards();
    // 같은 탭을 다시 그릴 때(레벨업·강화 후)는 보던 위치를 지킨다
    const prev = this.root.querySelector<HTMLElement>(`.lab .card-grid[data-tab="${tab}"]`);
    const keep = prev ? prev.scrollTop : 0;
    const grid = h('div.card-grid', { 'data-tab': tab }, ...body);
    this.swap(h('div.screen.lab', {},
      this.topBar('연구실 강화', () => this.showMap()),
      h('div.lab-tabs', {},
        h(`button.chapter-tab${tab === 'units' ? '.on' : ''}`, { onclick: () => this.showLab('units') }, '{student} 동료'),
        h(`button.chapter-tab${tab === 'facilities' ? '.on' : ''}`, { onclick: () => this.showLab('facilities') }, '{remodel} 시설'),
      ),
      grid,
    ));
    if (keep) grid.scrollTop = keep;
  }

  private unitCards(): HTMLElement[] {
    return UNITS.map((u) => this.unitCard(u));
  }

  private unitCard(u: UnitDef): HTMLElement {
    const owned = isUnitOwned(this.save, u);
    const p = unitProgress(this.save, u.id);
    const st = unitStats(u, p);
    const refresh = (): void => this.showLab('units');
    let action: HTMLElement;
    if (!owned) {
      if (u.unlock.subscribe) {
        const can = canSubscribe(this.save, u);
        action = h('button.btn.small.primary', {
          disabled: can && this.save.money >= u.unlock.subscribe ? undefined : 'true',
          onclick: () => { if (subscribe(this.save, u)) { this.persist(); refresh(); } },
        }, can ? `구독 {coin}${fmt(u.unlock.subscribe)}` : `{lock} ${u.unlock.stage} 클리어`);
      } else action = h('span.lock-note', {}, `{lock} ${u.unlock.stage} 클리어 시 합류`);
    } else if (p.level >= levelCap(p.tier) && p.tier < 3) {
      action = h('button.btn.small.evolve', {
        disabled: canEvolve(this.save, u) ? undefined : 'true',
        onclick: () => { if (evolve(this.save, u)) { this.persist(); refresh(); } },
      }, `{sparkle} ${u.names[p.tier]}(으)로 진화 {coin}${fmt(evolveCost(u, p.tier))}`);
    } else if (p.level >= 15) {
      action = h('span.lock-note', {}, '{trophy} 최고 단계');
    } else {
      action = h('button.btn.small.primary', {
        disabled: canLevelUp(this.save, u) ? undefined : 'true',
        onclick: () => { if (levelUp(this.save, u)) { this.persist(); refresh(); } },
      }, `레벨업 {coin}${fmt(levelUpCost(u, p.level))}`);
    }
    const ranged = u.range >= RANGED_THRESHOLD;
    return h(`div.card${owned ? '' : '.locked'}`, {},
      h('div.card-pic', {}, h('img', { src: portrait(u.look, owned ? p.tier : 1, u.id), alt: '' }), owned ? h('span.tier', {}, ['Ⅰ', 'Ⅱ', 'Ⅲ'][p.tier - 1]!) : null),
      h('div.card-body', {},
        h('b', {}, owned ? u.names[p.tier - 1]! : u.names[0]),
        h('span.muted', {}, ` ${u.role}${u.flying ? ' · 공중' : ''}${ranged ? ' · 대공' : ''}`),
        owned ? h('div.lv', {}, `Lv ${p.level}/${levelCap(p.tier)}`, h('div.lv-track', {}, h('div.lv-fill', { style: { width: `${(p.level / levelCap(p.tier)) * 100}%` } }))) : null,
        h('div.stats', {}, `{heart}${fmt(st.hp)} {sword}${Math.round(st.atk)} {coffee}${u.cost}${u.count ? ` ×${u.count}` : ''}`),
        h('p.desc', {}, u.desc),
        action,
      ),
    );
  }

  private facilityCards(): HTMLElement[] {
    return FACILITIES.map((f) => {
      const lv = this.save.facilities[f.id];
      const cost = facilityCost(f, lv);
      return h('div.card', {},
        h('div.card-pic.icon', {}, iconEl(f.icon)),
        h('div.card-body', {},
          h('b', {}, f.name),
          h('div.lv', {}, `Lv ${lv}/${f.max}`, h('div.lv-track', {}, h('div.lv-fill', { style: { width: `${(lv / f.max) * 100}%` } }))),
          h('p.desc', {}, f.desc),
          lv >= f.max
            ? h('span.lock-note', {}, '{trophy} 최대 레벨')
            : h('button.btn.small.primary', {
              disabled: this.save.money >= cost ? undefined : 'true',
              onclick: () => { if (upgradeFacility(this.save, f.id)) { this.persist(); this.showLab('facilities'); } },
            }, `강화 {coin}${fmt(cost)}`),
        ),
      );
    });
  }
}

function fsLabel(): string {
  return isFullscreen() ? '{fullscreen} 전체 화면 끄기' : '{fullscreen} 전체 화면';
}
