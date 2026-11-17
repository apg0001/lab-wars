import { CHAPTERS, SIDE_CHAPTERS, SIDE_STAGES, STAGES, STAGE_BY_ID, endlessStage, type StageDef, type StageKind } from '../data/stages';

/** 지도 탭 번호: 1~7 챕터, 8 무한, 9 외전 */
const SIDE_TAB = CHAPTERS.length + 2;
/** 스토리 장면 속 주인공 모습 (외전은 시절이 다르다) */
const heroChapter = (s: StageDef): number => (s.side ? SIDE_CHAPTERS[s.side - 1]!.heroChapter : s.chapter);
import { ENEMY_BY_ID } from '../data/enemies';
import { UNITS, UNIT_BY_ID, isGachaUnit, rarityLabel, rarityOf } from '../data/units';
import { FACILITIES, SKILLS, facilityCost } from '../data/upgrades';
import type { UnitDef } from '../data/types';
import {
  applyOutcome, canEvolve, canLevelUp, canSubscribe, evolve, evolveCost, isCleared, isEndlessOpen, isSideOpen, isSkillOpen, isStageOpen,
  isUnitOwned, levelUp, levelUpCost, makeLoadout, newSave, subscribe, unitProgress, unitStats,
  upgradeFacility, takeMigrationNotes, REPLAY_MUL, type SaveData,
  LOADOUT_MAX, MAX_PASSION, loadPreset, moveSquad, ownedUnits, passionOf, savePreset, toggleSquad, unitLevelCap,
} from '../sim/progression';
import { gearTab, passionPips } from './unit-gacha';
import { GUIDE_SQUAD, GUIDE_TUTORIAL, markSeen, shouldPromptSquad, shouldShowTutorial } from '../sim/guide';

type GachaTab = 'gear' | 'draw' | 'closet';
type LabTab = 'units' | 'facilities';
/** 연구실 동료 탭 정렬 기준 */
const LAB_SORT: SortKey[] = ['default', 'rarity', 'level', 'cost', 'atk', 'hp', 'name'];
import { RANGED_THRESHOLD } from '../data/types';
import { kv, LocalSaveStore, ProfileManager, type Profile, type SaveStore } from '../save/store';
import { AccountApi, AccountSaveStore, API_URL, ApiError, displayName, progressScore, type RankRow, type SyncState } from '../save/remote';
import { showFeedbackForm, showFeedbackInbox, showNicknameForm } from './feedback';
import { mountBattle } from './battle-screen';
import { music } from '../audio/music';
import { audioIcon, showAudioSettings } from './audio-settings';
import { mountGallery, statTags } from './gallery';
import { RARITY_RANK, loadPref, sortBar, sortByPref, type SortKey } from './sort';
import { maybeShowUpdates, showPatchNotes } from './patch-notes';
import { fullscreenButton } from './fullscreen';
import { h, fmt, setRich } from './dom';
import { iconEl } from '../render/doodle';
import { portrait } from './icons';
import { closetTab, drawTab } from './gacha';
import { donateLink } from './donate';
import { myAvatar, rankAvatar } from './avatar';
import { COSMETIC_BY_ID } from '../data/cosmetics';
import { titleName } from '../sim/gacha';
import { setWardrobe } from '../render/characters';
import { SCENES, type Scene } from '../story/script';
import { STORY_ORDER, scenesOfStage, unlockedScenes } from '../story/unlock';
import { playMarathon, playScenes } from '../story/player';
import { getLang, onLangChange, setLang, tr } from '../i18n';
import { rankTitle } from '../i18n/server';

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
  /** 연구실 동료 탭 정렬·보기 (기기에 기억) */
  private readonly labPref = loadPref('lab', LAB_SORT);

  private storeFor(p: Profile): SaveStore {
    return p.kind === 'account' && this.accountStore ? this.accountStore : this.localStore;
  }

  constructor(private readonly root: HTMLElement) {
    onLangChange(() => this.rerender());
    if (this.accountStore) {
      this.accountStore.onSync = (st) => {
        this.sync = st;
        const chip = this.root.querySelector('.sync-chip');
        if (chip) chip.replaceWith(this.syncChip());
      };
      this.accountStore.onReplaced = (data) => {
        // 다른 기기에서 더 많이 진행했다: 화면이 전투 중이 아니면 바로 반영한다.
        this.save = data;
        setWardrobe(data.cosmetics.outfits);
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
    setWardrobe(this.save.cosmetics.outfits);
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
      this.notice = tr('로그인이 만료됐어요. 다시 로그인해 주세요.', 'Your login expired. Please log in again.');
      this.showTitle();
      return;
    }
    // 자동 로그인으로 받은 최신 닉네임을 프로필 이름에 반영한다
    const acct = p.kind === 'account' ? this.api?.user : null;
    if (acct && displayName(acct) !== p.name) this.profile = p = this.profiles.upsertAccount(acct.id, displayName(acct));
    this.profiles.remember(p);
    const next = STAGES.find((s) => !isCleared(this.save, s.id)) ?? STAGES[STAGES.length - 1]!;
    this.chapter = next.chapter;
    if (go) this.showMap();
  }

  private persist(): void {
    setWardrobe(this.save.cosmetics.outfits);
    if (this.profile) void this.storeFor(this.profile).save(this.profile.id, this.save);
  }

  private syncChip(): HTMLElement {
    const label = {
      synced: tr('{cloud} 저장됨', '{cloud} Saved'),
      pending: tr('{hourglass} 저장 중', '{hourglass} Saving'),
      offline: tr('{offline} 오프라인', '{offline} Offline'),
      error: tr('{warn} 동기화 오류', '{warn} Sync error'),
    };
    return h('span.sync-chip', {}, this.sync ? label[this.sync] : tr('{phone} 이 기기', '{phone} This device'));
  }

  private saveSettings(): void {
    kv.set('settings', JSON.stringify(this.settings));
  }

  // ───────────────────── 타이틀 / 프로필 ─────────────────────

  /** 소리 설정 버튼 (누르면 아이콘도 갱신) */
  private audioBtn(cls = ''): HTMLElement {
    const btn = h(`button.icon-btn.audio-btn${cls}`, { title: tr('소리 설정', 'Sound settings'), onclick: () => showAudioSettings(this.root.firstElementChild, () => { setRich(btn, audioIcon()); }) }, audioIcon());
    return btn;
  }

  /** 언어 바꾸기 버튼: 다른 언어 이름을 보여 준다 */
  private langBtn(): HTMLElement {
    return h('button.icon-btn.lang-btn', {
      title: tr('언어', 'Language'),
      onclick: () => setLang(getLang() === 'ko' ? 'en' : 'ko'),
    }, getLang() === 'ko' ? 'English' : '한국어');
  }

  /** 언어가 바뀌면 지금 화면을 다시 그린다 (전투·컷신 중이면 다음 화면부터) */
  private rerender(): void {
    const scr = this.root.firstElementChild;
    if (!scr) return;
    const has = (c: string): boolean => scr.classList.contains(c);
    if (has('title')) this.showTitle();
    else if (has('gacha')) this.showGacha(((scr.querySelector('.gacha-body') as HTMLElement | null)?.dataset.tab ?? 'gear') as GachaTab);
    else if (has('squad-screen')) this.showSquad();
    else if (has('lab')) this.showLab(((scr.querySelector('.card-grid') as HTMLElement | null)?.dataset.tab ?? 'units') as LabTab);
    else if (has('map')) this.showMap();
    else if (scr.querySelector('.dex-grid')) this.showGallery();
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
        h('button.btn.primary.big', { onclick: () => this.showMap() }, tr(`▶ ${p.name} 연구실로`, `▶ To ${p.name}'s Lab`)),
        h('div.btn-row', {},
          h('button.btn.small', { onclick: () => this.showProfiles() }, tr('{user} 프로필 변경', '{user} Switch profile')),
          this.api && p.kind !== 'account' ? h('button.btn.small', { onclick: () => this.showLogin() }, tr('{key} 로그인 / 가입', '{key} Log in / Sign up')) : null,
          ...this.accountButtons(),
        ),
      )
      : this.newProfileForm();
    const notice = this.notice ? h('p.notice', {}, this.notice) : null;
    this.notice = '';
    const fsBtn = fullscreenButton(() => this.root.firstElementChild, { label: true });
    this.swap(h('div.screen.title', {},
      h('div.title-corner', {}, h('button.icon-btn.patch-btn', { title: tr('패치노트', 'Patch notes'), onclick: () => showPatchNotes(this.root.firstElementChild) }, tr('{scroll} 패치노트', '{scroll} Patch notes')), this.langBtn(), this.audioBtn(), fsBtn),
      h('div.title-logo', {}, h('h1', {}, tr('랩워즈', 'Lab Wars')), h('p', {}, tr('교수님에게서 연구실을 지켜라!', 'Defend your lab from the professors!'))),
      cast,
      body,
      notice,
      h('p.title-foot', {}, p
        ? (p.kind === 'account'
          ? tr(`{key} ${this.api?.user?.username ?? p.name} 계정으로 자동 로그인됨 · 어느 기기에서든 이어서 플레이`, `{key} Logged in as ${this.api?.user?.username ?? p.name} · continue on any device`)
          : tr('게스트 · 이 기기에만 저장 중', 'Guest · saved on this device only') + (this.api ? tr(' (로그인하면 다른 기기에서도 이어서 할 수 있어요)', ' (log in to continue on other devices)') : ''))
        : tr('진행 상황은 이 기기에 저장됩니다', 'Progress is saved on this device')),
      h('div.title-credits', {},
        donateLink(),
        h('a.title-credit', { href: 'https://github.com/apg0001', target: '_blank', rel: 'noopener' }, tr('기획·개발 박기찬', 'Made by Gichan Park')),
      ),
    ));
    maybeShowUpdates(this.root.firstElementChild, this.profiles.list().length > 0);
  }

  private newProfileForm(): HTMLElement {
    const input = h('input.name-input', { maxlength: '12', placeholder: tr('이름 (예: 김석사)', 'Name (e.g. Dr. Maybe)'), enterkeyhint: 'done' }) as HTMLInputElement;
    const go = async (): Promise<void> => {
      const p = this.profiles.create(input.value);
      await this.enter(p);
      this.persist();
    };
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') void go();
    });
    return h('div.title-actions', {}, input, h('button.btn.primary.big', { onclick: () => void go() }, tr('{cap} 게스트로 시작', '{cap} Play as guest')),
      h('div.btn-row', {},
        this.api ? h('button.btn.small', { onclick: () => this.showLogin() }, tr('{key} 로그인 / 가입', '{key} Log in / Sign up')) : null,
        this.profiles.list().length ? h('button.btn.small', { onclick: () => this.showProfiles() }, tr('{user} 기존 프로필', '{user} Profiles')) : null,
        ...this.accountButtons(),
      ));
  }

  /** 타이틀 버튼 줄: 닉네임 바꾸기(계정), 의견함(관리자), 의견 보내기(누구나) */
  private accountButtons(): (HTMLElement | null)[] {
    const host = (): Element | null => this.root.firstElementChild;
    const user = this.profile?.kind === 'account' ? this.api?.user : null;
    return [
      user && this.api ? h('button.btn.small', { onclick: () => showNicknameForm(host(), this.api!, (u) => {
        if (this.profile?.kind === 'account') this.profile = this.profiles.upsertAccount(u.id, displayName(u));
        this.showTitle();
      }) }, tr('{pencil} 닉네임', '{pencil} Nickname')) : null,
      user?.admin && this.api ? h('button.btn.small', { onclick: () => showFeedbackInbox(host(), this.api!) }, tr('{mail} 의견함', '{mail} Inbox')) : null,
      h('button.btn.small', { onclick: () => showFeedbackForm(host(), this.api, this.profile?.kind === 'guest' ? this.profile.name : '') }, tr('{megaphone} 의견 보내기', '{megaphone} Feedback')),
    ];
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
      } }, tr('로그아웃', 'Log out')) : h('button.btn.small.danger', { onclick: async () => {
        if (!confirm(tr(`'${p.name}' 프로필과 진행 상황을 삭제할까요? 되돌릴 수 없습니다.`, `Delete profile '${p.name}' and all its progress? This can't be undone.`))) return;
        await this.profiles.remove(p.id);
        if (this.profile?.id === p.id) {
          this.profile = null;
          this.save = newSave();
        }
        close();
        this.showTitle();
        if (this.profiles.list().length) this.showProfiles();
      } }, tr('삭제', 'Delete')),
    ));
    overlay.append(h('div.panel.profiles', {},
      h('h2', {}, tr('프로필', 'Profiles')),
      h('div.profile-list', {}, ...rows),
      h('div.btn-row', {},
        h('button.btn.primary', { onclick: () => { close(); this.profile = null; this.profiles.forget(); this.showTitle(); } }, tr('＋ 새 프로필', '＋ New profile')),
        h('button.btn', { onclick: close }, tr('닫기', 'Close')),
      ),
    ));
    this.root.firstElementChild?.append(overlay);
  }

  private showLogin(): void {
    const api = this.api;
    if (!api) return;
    const overlay = h('div.overlay');
    const close = (): void => overlay.remove();
    const user = h('input.name-input', { maxlength: '16', placeholder: tr('아이디 (2~16자)', 'Username (2–16 chars)'), autocomplete: 'username', autocapitalize: 'off' }) as HTMLInputElement;
    const pass = h('input.name-input', { type: 'password', maxlength: '128', placeholder: tr('비밀번호 (8자 이상)', 'Password (8+ chars)'), autocomplete: 'current-password' }) as HTMLInputElement;
    const msg = h('p.form-msg');
    const guest = this.profile && this.profile.kind === 'guest' ? { p: this.profile, save: this.save } : null;
    const submit = async (mode: 'login' | 'register'): Promise<void> => {
      msg.textContent = tr('잠시만요…', 'One moment…');
      try {
        const u = mode === 'login' ? await api.login(user.value.trim(), pass.value) : await api.register(user.value.trim(), pass.value);
        const acct = this.profiles.upsertAccount(u.id, displayName(u));
        // 계정이 비어 있고 지금 게스트로 진행한 게 있으면 옮길지 묻는다
        if (guest && progressScore(guest.save) > 0) {
          const remote = await api.getSave().catch(() => null);
          if (remote && remote.data === null && confirm(tr(`게스트 '${guest.p.name}'의 진행 상황을 '${u.username}' 계정으로 옮길까요?`, `Move guest '${guest.p.name}' progress to account '${u.username}'?`))) {
            await this.localStore.save(acct.id, guest.save);
          }
        }
        close();
        await this.enter(acct);
      } catch (e) {
        msg.textContent = e instanceof ApiError ? e.message : tr('서버에 연결할 수 없어요. 인터넷 연결을 확인해 주세요.', 'Can\'t reach the server. Please check your internet connection.');
      }
    };
    pass.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') void submit('login');
    });
    overlay.append(h('div.panel.login', {},
      h('h2', {}, tr('{key} 로그인', '{key} Log in')),
      h('p.muted', {}, tr('로그인하면 진행 상황이 계정에 저장되어 다른 기기에서도 이어서 할 수 있어요.', 'Log in to save progress to your account and continue on other devices.')),
      h('div.title-actions', {}, user, pass),
      msg,
      h('div.btn-row', {},
        h('button.btn', { onclick: close }, tr('닫기', 'Close')),
        h('button.btn', { onclick: () => void submit('register') }, tr('회원가입', 'Sign up')),
        h('button.btn.primary', { onclick: () => void submit('login') }, tr('로그인', 'Log in')),
      ),
    ));
    this.root.firstElementChild?.append(overlay);
    user.focus();
  }

  // ───────────────────── 스테이지 지도 ─────────────────────

  private topBar(title: string, back?: () => void): HTMLElement {
    return h('div.topbar', {},
      back ? h('button.btn.small', { onclick: back }, tr('← 뒤로', '← Back')) : h('button.btn.small.profile-btn', { onclick: () => this.showTitle() }, h('img.avatar-mini', { src: myAvatar(this.save), alt: '' }), this.profile?.name ?? '', titleName(this.save) ? h('span.title-chip', {}, titleName(this.save)) : null),
      h('h2.top-title', {}, title),
      h('div.top-right', {}, this.syncChip(), h('div.money', {}, `{coin} ${fmt(this.save.money)}`), this.audioBtn(), fullscreenButton(() => this.root.firstElementChild)),
    );
  }

  showMap(): void {
    music.play('lobby');
    const endlessOpen = isEndlessOpen(this.save);
    const sideOpen = isSideOpen(this.save);
    if (this.chapter === SIDE_TAB && !sideOpen) this.chapter = CHAPTERS.length;
    const tabs = h('div.chapter-tabs', {}, ...CHAPTERS.map((c) => {
      const open = isStageOpen(this.save, STAGE_BY_ID[`${c.id}-1`]!);
      return h(`button.chapter-tab${c.id === this.chapter ? '.on' : ''}`, {
        disabled: open ? undefined : 'true',
        onclick: () => { this.chapter = c.id; this.showMap(); },
      }, open ? c.name : `{lock} ${c.name}`);
    }), h(`button.chapter-tab.endless-tab${this.chapter === CHAPTERS.length + 1 ? '.on' : ''}`, {
      disabled: endlessOpen ? undefined : 'true',
      onclick: () => { this.chapter = CHAPTERS.length + 1; this.showMap(); },
    }, endlessOpen ? tr('{infinity} 무한', '{infinity} Endless') : '{lock} {infinity}'), h(`button.chapter-tab.side-tab${this.chapter === SIDE_TAB ? '.on' : ''}`, {
      disabled: sideOpen ? undefined : 'true',
      onclick: () => { this.chapter = SIDE_TAB; this.showMap(); },
    }, sideOpen ? tr('{redbook} 외전', '{redbook} Side') : '{lock} {redbook}'));
    if (this.chapter === SIDE_TAB) return this.showSideMap(tabs);
    if (this.chapter > CHAPTERS.length) return this.showEndlessMap(tabs);
    const ch = CHAPTERS[this.chapter - 1]!;
    const stages = STAGES.filter((s) => s.chapter === ch.id);
    const nodes = h('div.stage-path', {}, ...stages.map((s) => this.stageNode(s)));
    const totalStars = Object.values(this.save.stars).reduce((a, b) => a + b, 0);
    const toast = this.notice ? h('div.toast', { onclick: (e: Event) => (e.currentTarget as HTMLElement).remove() }, this.notice) : null;
    this.notice = '';
    this.swap(h('div.screen.map', {},
      this.topBar(tr('스테이지', 'Stages')),
      toast,
      tabs,
      h('div.chapter-title', {}, h('b', {}, tr(`${ch.id}장 ${ch.name}: ${ch.subtitle}`, `Ch. ${ch.id} ${ch.name}: ${ch.subtitle}`)), h('span.muted', {}, tr(` · 총 별 ${totalStars}/${STAGES.length * 3}`, ` · Stars ${totalStars}/${STAGES.length * 3}`))),
      nodes,
      this.mapActions(),
    ));
    if (shouldPromptSquad(this.save)) this.showSquadGuide();
  }

  /** 편성(0.17.0)을 아직 안 써 본 사람에게 한 번만: 설명하고 편성 화면으로 데려간다 */
  private showSquadGuide(): void {
    const overlay = h('div.overlay');
    const done = (go: boolean): void => {
      overlay.remove();
      if (go) return this.showSquad();
      if (markSeen(this.save, GUIDE_SQUAD)) this.persist();
    };
    overlay.append(h('div.panel.squad-guide', {},
      h('h2', {}, tr('{swords} 새 기능: 편성', '{swords} New: Squad')),
      h('p', {}, tr(`전투에 데려갈 동료를 최대 ${LOADOUT_MAX}명까지 직접 고를 수 있어요. 편성 순서가 곧 단축키(1~9)예요. 자주 쓰는 조합은 프리셋에 저장해 두세요.`, `Pick up to ${LOADOUT_MAX} labmates to bring into battle. Their order is the hotkey order (1–9). Save your favorite lineups as presets.`)),
      h('p.muted', {}, tr('지도 아래 {swords} 편성 버튼으로 언제든 바꿀 수 있어요.', 'You can change it anytime with the {swords} Squad button on the map.')),
      h('div.btn-row', {},
        h('button.btn', { onclick: () => done(false) }, tr('나중에', 'Later')),
        h('button.btn.primary', { onclick: () => done(true) }, tr('편성하러 가기', 'Open Squad')),
      ),
    ));
    this.root.firstElementChild?.append(overlay);
  }

  private mapActions(): HTMLElement {
    return h('div.map-actions', {},
      h('button.btn.lab-btn', { onclick: () => this.showLab() }, tr('{flask} 연구실 강화', '{flask} Upgrade Lab')),
      h('button.btn.squad-btn', { onclick: () => this.showSquad() }, tr(`{swords} 편성 ${this.save.loadout.length}/${LOADOUT_MAX}`, `{swords} Squad ${this.save.loadout.length}/${LOADOUT_MAX}`)),
      h('button.btn.dex-btn', { onclick: () => this.showGallery() }, tr('{book} 도감', '{book} Codex')),
      h('button.btn.story-btn', { onclick: () => this.showStory() }, tr('{scroll} 스토리', '{scroll} Story')),
      h('button.btn.rank-btn', { onclick: () => this.showLeaderboard() }, tr('{trophy} 순위', '{trophy} Ranks')),
      h('button.btn.gacha-btn', { onclick: () => this.showGacha() }, tr('{crate} 장비 지원 · 심사', '{crate} Grants & Reviews'), this.save.gear.tickets ? h('span.badge', {}, `{ticket}${this.save.gear.tickets}`) : null),
    );
  }

  /** 뽑기 화면: 장비 지원(유닛 뽑기) · 심사 결과(꾸미기 뽑기) · 옷장 */
  private showGacha(tab: GachaTab = 'gear'): void {
    music.play('lobby');
    const ctx = {
      save: this.save,
      heroName: this.profile?.name ?? tr('나', 'Me'),
      persist: () => this.persist(),
      redraw: (t: 'draw' | 'closet') => this.showGacha(t),
      host: () => this.root.firstElementChild,
    };
    const prev = this.root.querySelector<HTMLElement>(`.gacha .gacha-body[data-tab="${tab}"]`);
    const keep = prev ? prev.scrollTop : 0;
    const content = tab === 'gear' ? gearTab({ ...ctx, redraw: () => this.showGacha('gear') }) : tab === 'draw' ? drawTab(ctx) : closetTab(ctx);
    const body = h('div.gacha-body', { 'data-tab': tab }, content);
    this.swap(h(`div.screen.gacha${tab === 'gear' ? '.gear-screen' : ''}`, {},
      this.topBar(tab === 'gear' ? tr('장비 지원', 'Equipment Grant') : tr('심사 결과', 'Peer Review'), () => this.showMap()),
      h('div.lab-tabs', {},
        h(`button.chapter-tab${tab === 'gear' ? '.on' : ''}`, { onclick: () => this.showGacha('gear') }, tr('{crate} 장비 지원', '{crate} Equipment Grant')),
        h(`button.chapter-tab${tab === 'draw' ? '.on' : ''}`, { onclick: () => this.showGacha('draw') }, tr('{mail} 심사 결과', '{mail} Peer Review')),
        h(`button.chapter-tab${tab === 'closet' ? '.on' : ''}`, { onclick: () => this.showGacha('closet') }, tr('{hanger} 옷장', '{hanger} Wardrobe')),
      ),
      body,
    ));
    if (keep) body.scrollTop = keep;
  }

  /** 무한 모드: 다음 판 도전과 최고 기록 */
  /** 외전: 엔딩 뒤에 열리는 세 가지 이야기 */
  private showSideMap(tabs: HTMLElement): void {
    const rows = SIDE_CHAPTERS.map((sc) => {
      const stages = SIDE_STAGES.filter((s) => s.side === sc.id);
      const done = stages.filter((s) => isCleared(this.save, s.id)).length;
      return h(`div.side-row.theme-${sc.theme}`, {},
        h('div.side-head', {}, h('b', {}, tr(`외전 ${sc.id} · ${sc.name}`, `Side Story ${sc.id} · ${sc.name}`)), h('span', {}, sc.subtitle), h('small', {}, `${done}/5 · ${sc.rule.split(':')[0]}`)),
        h('div.side-nodes', {}, ...stages.map((s) => this.stageNode(s))),
      );
    });
    this.swap(h('div.screen.map.side-map', {},
      this.topBar(tr('스테이지', 'Stages')),
      tabs,
      h('div.chapter-title', {}, h('b', {}, tr('{redbook} 외전: 아무도 말해 주지 않은 이야기', '{redbook} Side Stories: what nobody tells you')), h('span.muted', {}, tr(' · 으스스한 특수 규칙', ' · spooky special rules'))),
      h('div.side-list', {}, ...rows),
      this.mapActions(),
    ));
    if (shouldPromptSquad(this.save)) this.showSquadGuide();
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
      this.topBar(tr('스테이지', 'Stages')),
      tabs,
      h('div.chapter-title', {}, h('b', {}, tr('{infinity} 무한 모드: 교수가 되어도 일은 끝나지 않는다', '{infinity} Endless Mode: the work never ends, even as a professor')), h('span.muted', {}, tr(` · 최고 기록 ${best}판`, ` · Best: round ${best}`))),
      h('div.endless-box', {},
        h('div.endless-best', {}, h('span', {}, tr('최고 기록', 'Best')), h('b', {}, tr(`${best}판`, `Round ${best}`))),
        h('div.endless-list', {}, ...recent.map((n) => {
          const st = endlessStage(n);
          const open = isStageOpen(this.save, st);
          return h(`button.btn${n === best + 1 ? '.primary.big' : ''}`, { disabled: open ? undefined : 'true', onclick: () => this.showStageInfo(st) },
            `${n === best + 1 ? tr('도전: ', 'Challenge: ') : '{retry} '}${st.name}${st.boss ? ` (${ENEMY_BY_ID[st.boss]!.name})` : ''}`);
        })),
        h('p.muted', {}, tr(`다음 판 적 능력치 ×${next.scale.toFixed(1)} · 5판마다 보스 · 처음 넘는 판은 보상 전액`, `Next round enemy stats ×${next.scale.toFixed(1)} · boss every 5 rounds · full reward for new records`)),
      ),
      this.mapActions(),
    ));
    if (shouldPromptSquad(this.save)) this.showSquadGuide();
  }

  private showStageInfo(s: StageDef): void {
    const overlay = h('div.overlay');
    const close = (): void => overlay.remove();
    const enemyIds = [...s.pool.map((p) => p.id), ...(s.boss ? [s.boss] : [])];
    const first = !isCleared(this.save, s.id);
    const deck = makeLoadout(this.save).deck;
    overlay.append(h('div.panel.stage-info', {},
      h('h2', {}, `${s.id} ${s.name}`),
      s.boss ? h('p.boss-warn', {}, tr(`{warn} 보스: ${ENEMY_BY_ID[s.boss]!.name}`, `{warn} Boss: ${ENEMY_BY_ID[s.boss]!.name}`)) : null,
      s.note ? h('p.stage-note', {}, s.note) : null,
      h('p.muted', {}, tr('등장하는 적', 'Enemies')),
      h('div.enemy-row', {}, ...enemyIds.map((id) => h('figure', {}, h('img', { src: portrait(ENEMY_BY_ID[id]!.look, 1, id, -1), alt: '' }), h('figcaption', {}, ENEMY_BY_ID[id]!.name)))),
      s.kind === 'endless'
        ? h('p', {}, s.index > this.save.endless ? tr(`첫 돌파 보상 {coin} ${fmt(s.reward)}`, `New record reward {coin} ${fmt(s.reward)}`) : tr(`재도전 보상 {coin} ${fmt(s.reward * 0.4)} + 처치 보상`, `Replay reward {coin} ${fmt(s.reward * 0.4)} + kill rewards`))
        : h('p', {}, first ? tr(`첫 클리어 보상 {coin} 최대 ${fmt(s.reward * 1.2)}`, `First clear reward {coin} up to ${fmt(s.reward * 1.2)}`) : tr(`재도전 보상 {coin} 최대 ${fmt(s.reward * 1.2 * REPLAY_MUL)} + 처치 보상`, `Replay reward {coin} up to ${fmt(s.reward * 1.2 * REPLAY_MUL)} + kill rewards`)),
      h('p.muted', {}, tr(`출전 유닛 ${deck.length}종`, `Deploying ${deck.length} unit types`)),
      h('div.btn-row', {},
        h('button.btn', { onclick: close }, tr('닫기', 'Close')),
        h('button.btn.primary', { onclick: () => { close(); this.startBattle(s); } }, tr('출전!', 'Fight!')),
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
    playScenes(this.root, scenes, { heroName: this.profile?.name ?? tr('나', 'Me'), chapter, skippable }, then);
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
      if (id.startsWith('side') && id.endsWith('-clear')) return tr('{party} 외전 클리어', '{party} Side Story clear');
      if (id.startsWith('side') && id.endsWith('-boss')) return `{ghost} ${STAGE_BY_ID[`S${id[4]}-5`]?.name ?? tr('보스', 'Boss')}`;
      if (id.startsWith('st-')) return `${id.slice(3)} ${STAGE_BY_ID[id.slice(3)]?.name ?? ''}`;
      if (id.endsWith('-intro')) return `{book} ${sc.title ?? id}`;
      if (id.endsWith('-boss')) return `{tie} ${sc.title ?? id}`;
      if (id === 'ending') return tr('{cap} 엔딩', '{cap} Ending');
      return tr(`{party} ${groupOf(id)}장 클리어`, `{party} Ch. ${groupOf(id)} clear`);
    };
    const run = (start: number): void => {
      close();
      this.swap(h('div.screen.story-backdrop'));
      playMarathon(this.root, open.map((id) => SCENES[id]!), start, {
        heroName: this.profile?.name ?? tr('나', 'Me'),
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
      ...CHAPTERS.map((c) => ({ key: String(c.id), name: tr(`${c.id}장 · ${c.name}`, `Ch. ${c.id} · ${c.name}`) })),
      ...SIDE_CHAPTERS.map((c) => ({ key: `S${c.id}`, name: tr(`{redbook} 외전 ${c.id} · ${c.name}`, `{redbook} Side Story ${c.id} · ${c.name}`) })),
    ].map((g) => ({ ...g, ids: open.filter((id) => groupOf(id) === g.key) })).filter((g) => g.ids.length);
    overlay.append(h('div.panel.story-list', {},
      h('h2', {}, tr('{scroll} 스토리 다시 보기', '{scroll} Story Replay')),
      open.length
        ? h('div', {},
          h('p.muted', {}, tr(`열린 장면 ${open.length} / ${STORY_ORDER.length} · 장면을 누르면 거기서부터 쭉 이어서 봐요`, `Unlocked ${open.length} / ${STORY_ORDER.length} · tap a scene to watch from there`)),
          h('div.story-top', {},
            ...(at > 0 ? [h('button.btn.primary', { onclick: () => run(at) }, tr(`⏩ 이어서 보기 (${label(open[at]!)})`, `⏩ Continue (${label(open[at]!)})`))] : []),
            h('button.btn', { onclick: () => run(0) }, tr('▶ 처음부터 몰아보기', '▶ Watch from the start')),
          ),
          h('div.story-grid', {}, ...groups.flatMap((g) => [
            h('div.story-ch', {}, g.name),
            ...g.ids.map((id) => h(`button.btn.small${open.indexOf(id) === at ? '.here' : ''}`, { onclick: () => run(open.indexOf(id)) }, label(id))),
          ])),
        )
        : h('p.muted', {}, tr('아직 본 장면이 없어요. 스테이지에 들어가면 이야기가 시작돼요.', 'No scenes yet. The story starts when you enter a stage.')),
      h('button.btn', { onclick: close }, tr('닫기', 'Close')),
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
      onTutorialDone: shouldShowTutorial(this.save, stage) ? () => { if (markSeen(this.save, GUIDE_TUTORIAL)) this.persist(); } : undefined,
      onEnd: (e) => {
        const out = applyOutcome(this.save, stage, e.win, e.baseHpRatio, e.killReward);
        this.persist();
        const lines = [
          ...(e.timeout ? [tr('{clock} 시간 초과! 제한 시간 안에 교수실을 함락하지 못했어요.', '{clock} Time\'s up! You didn\'t take the Prof\'s Office in time.')] : []),
          e.win ? tr(`클리어 보상 {coin} ${fmt(out.clearReward)}${out.firstClear ? ' (첫 클리어!)' : ''}`, `Clear reward {coin} ${fmt(out.clearReward)}${out.firstClear ? ' (first clear!)' : ''}`) : tr('연구비는 처치한 만큼 받았어요.', 'You still earned funding for your kills.'),
          ...(out.tickets ? [tr(`{ticket} 무료 뽑기권 +${out.tickets} (장비 지원에서 써요)`, `{ticket} Free ticket +${out.tickets} (use it in Equipment Grant)`)] : []),
          tr(`처치 보상 {coin} ${fmt(out.killReward)} · 처치 ${e.kills}`, `Kill reward {coin} ${fmt(out.killReward)} · ${e.kills} kills`),
          ...this.unlockNews(before),
        ];
        const title = e.win ? tr('{party} 교수실 함락!', '{party} Prof\'s Office taken!') : e.timeout ? tr('{clock} 야근 확정… 시간 초과', '{clock} Overtime again… time\'s up') : tr('{dizzy} 연구실이 망가졌다…', '{dizzy} The lab is wrecked…');
        return { title, lines, stars: out.stars };
      },
      actions: (win) => {
        const next = stage.kind === 'endless' ? endlessStage(stage.index + 1) : stage.side ? STAGE_BY_ID[`S${stage.side}-${stage.index + 1}`] : STAGES[stage.order + 1];
        // 보스를 처음 이기면 챕터 마무리 장면, 마지막 보스면 엔딩
        const clearId = scenesOfStage(stage).after[0] ?? '';
        const clearScene = win && clearId && !this.save.seen.includes(clearId) ? SCENES[clearId] : undefined;
        if (clearScene?.id === 'ending') {
          return [{ label: tr('{cap} 엔딩 보기', '{cap} Watch the ending'), primary: true, run: () => {
            this.swap(h('div.screen.story-backdrop'));
            this.play([clearScene], () => {
              this.chapter = CHAPTERS.length + 1;
              this.notice = tr('{redbook} 외전 3편이 열렸어요! 교수가 되어도 일은 끝나지 않는다.', '{redbook} 3 Side Stories unlocked! Even as a professor, the work never ends.');
              this.showMap();
            }, 7);
          } }];
        }
        const wrap = (run: () => void) => (clearScene ? () => { this.swap(h('div.screen.story-backdrop')); this.play([clearScene], run, heroChapter(stage)); } : run);
        if (win) {
          return [
            ...(next ? [{ label: tr('다음: ', 'Next: ') + `${next.kind === 'endless' ? next.name : `${next.id} ${next.name}`}`, primary: true, run: wrap(() => { this.chapter = next.chapter; this.startBattle(next); }) }] : []),
            { label: tr('{flask} 연구실 강화', '{flask} Upgrade Lab'), primary: !next, run: wrap(() => this.showLab()) },
            { label: tr('{map} 지도로', '{map} Map'), run: wrap(() => this.showMap()) },
          ];
        }
        return [
          { label: tr('{flask} 연구실 강화', '{flask} Upgrade Lab'), primary: true, run: () => this.showLab() },
          { label: tr('{retry} 다시 도전', '{retry} Retry'), run: () => this.startBattle(stage) },
          { label: tr('{map} 지도로', '{map} Map'), run: () => this.showMap() },
        ];
      },
      onQuit: () => this.showMap(),
    });
  }

  /** 순위표: 무한 모드 최고 기록 → 캠페인 별 순 */
  private showLeaderboard(): void {
    const overlay = h('div.overlay');
    const close = (): void => overlay.remove();
    const body = h('div.rank-body', {}, h('p.muted', {}, tr('불러오는 중…', 'Loading…')));
    const isAccount = this.profile?.kind === 'account';
    overlay.append(h('div.panel.rank-panel', {},
      h('h2', {}, tr('{trophy} 연구실 순위', '{trophy} Lab Rankings')),
      h('p.muted.rank-sub', {}, tr('무한 모드 최고 기록 → 캠페인 별 순서예요. 계정 닉네임이 표시돼요.', 'Ranked by Endless best, then campaign stars. Account nicknames are shown.')),
      body,
      isAccount || !this.api ? null : h('p.notice', {}, tr('{key} 로그인하면 내 기록도 순위에 올라가요.', '{key} Log in to get your record on the board.')),
      h('button.btn.primary', { onclick: close }, tr('닫기', 'Close')),
    ));
    this.root.firstElementChild?.append(overlay);
    if (!this.api) {
      body.replaceChildren(h('p.muted', {}, tr('순위 서버가 연결되지 않은 버전이에요.', 'This build has no ranking server.')));
      return;
    }
    // 내 최신 기록이 반영되도록 먼저 저장을 밀어 둔다
    if (isAccount) this.persist();
    const row = (r: RankRow, me = false): HTMLElement => h(`div.rank-row${me ? '.me' : ''}${r.rank <= 3 ? `.top${r.rank}` : ''}`, {},
      h('span.rank-no', {}, r.rank <= 3 ? ['{medal1}', '{medal2}', '{medal3}'][r.rank - 1]! : String(r.rank)),
      h('img.rank-avatar', { src: rankAvatar(r.avatar, r.avatarTier, r.fit), alt: '' }),
      h('span.rank-name', {}, r.name, r.badge && COSMETIC_BY_ID[r.badge]?.kind === 'title' ? h('small.rank-badge', {}, COSMETIC_BY_ID[r.badge]!.name) : null),
      h('span.rank-title', {}, rankTitle(r.title)),
      h('span.rank-endless', {}, r.endless ? tr(`{infinity} ${r.endless}판`, `{infinity} R${r.endless}`) : '—'),
      h('span.rank-stars', {}, `{star} ${r.stars}`),
    );
    this.api.leaderboard().then((lb) => {
      if (!lb.top.length) {
        body.replaceChildren(h('p.muted', {}, tr('아직 순위에 오른 사람이 없어요. 첫 번째가 되어 보세요!', 'Nobody on the board yet. Be the first!')));
        return;
      }
      const meName = this.api?.user ? displayName(this.api.user) : undefined;
      body.replaceChildren(
        h('div.rank-list', {}, ...lb.top.map((r) => row(r, !!r.mine || (lb.me !== null && lb.me.mine === undefined && r.name === meName)))),
        ...(lb.me && lb.me.rank > lb.top.length ? [h('div.rank-list.mine', {}, row(lb.me, true))] : []),
        h('p.muted', {}, tr(`총 ${lb.total}명`, `${lb.total} players`)),
      );
    }).catch(() => body.replaceChildren(h('p.muted', {}, tr('순위를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.', 'Couldn\'t load rankings. Please try again later.'))));
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
      if (kind === 'u') news.push(tr('{party} 새 동료 합류: ', '{party} New labmate: ') + `${UNITS.find((u) => u.id === id)!.names[0]}`);
      if (kind === 's') news.push(tr('{robot} AI 조수 구독 가능: ', '{robot} AI assistant available: ') + `${UNITS.find((u) => u.id === id)!.names[0]}`);
      if (kind === 'k') news.push(tr('{sparkle} 새 스킬: ', '{sparkle} New skill: ') + `${SKILLS.find((k) => k.id === id)!.name}`);
      if (kind === 'c') news.push(tr('{book} 새 챕터: ', '{book} New chapter: ') + `${CHAPTERS[Number(id) - 1]!.name}`);
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

  showLab(tab: LabTab | 'squad' = 'units', keepScroll = true): void {
    // 편성은 따로 떨어진 화면 (예전 연구실 탭으로 부르던 곳도 그쪽으로)
    if (tab === 'squad') return this.showSquad();
    music.play('lobby');
    const body = tab === 'units'
      ? [sortBar('lab', this.labPref, LAB_SORT, () => this.showLab('units', false)), ...this.unitCards()]
      : this.facilityCards();
    // 같은 탭을 다시 그릴 때(레벨업·강화 후)는 보던 위치를 지킨다. 정렬·보기를 바꾸면 맨 위로
    const prev = keepScroll ? this.root.querySelector<HTMLElement>(`.lab .card-grid[data-tab="${tab}"]`) : null;
    const keep = prev ? prev.scrollTop : 0;
    const grid = h(`div.card-grid${tab === 'units' && this.labPref.compact ? '.compact' : ''}`, { 'data-tab': tab }, ...body);
    this.swap(h('div.screen.lab', {},
      this.topBar(tr('연구실 강화', 'Upgrade Lab'), () => this.showMap()),
      h('div.lab-tabs', {},
        h(`button.chapter-tab${tab === 'units' ? '.on' : ''}`, { onclick: () => this.showLab('units') }, tr('{student} 동료', '{student} Labmates')),
        h(`button.chapter-tab${tab === 'facilities' ? '.on' : ''}`, { onclick: () => this.showLab('facilities') }, tr('{remodel} 시설', '{remodel} Facilities')),
      ),
      grid,
    ));
    if (keep) grid.scrollTop = keep;
  }

  /** 편성 화면: 지도에서 바로 연다. 처음 열면 첫 안내도 본 것으로 남긴다. */
  showSquad(): void {
    music.play('lobby');
    if (markSeen(this.save, GUIDE_SQUAD)) this.persist();
    const prev = this.root.querySelector<HTMLElement>('.squad-screen .card-grid');
    const keep = prev ? prev.scrollTop : 0;
    const grid = h('div.card-grid', { 'data-tab': 'squad' }, this.squadPanel());
    this.swap(h('div.screen.lab.squad-screen', {},
      this.topBar(tr('편성', 'Squad'), () => this.showMap()),
      grid,
    ));
    if (keep) grid.scrollTop = keep;
  }

  /** 편성: 위에 9칸, 아래에 가진 유닛. 누르면 넣고 빼고, 칸 안에서 ◀ ▶로 순서를 바꾼다. 프리셋 3개. */
  private squadPanel(): HTMLElement {
    const s = this.save;
    const refresh = (): void => this.showSquad();
    const act = (fn: () => boolean): void => {
      if (fn()) {
        this.persist();
        refresh();
      }
    };
    const slots = Array.from({ length: LOADOUT_MAX }, (_, i) => {
      const id = s.loadout[i];
      const u = id ? UNIT_BY_ID[id] : undefined;
      if (!u) return h('div.squad-slot.empty', {}, h('span.slot-key', {}, String(i + 1)), h('span.q', {}, '+'));
      const p = unitProgress(s, u.id);
      return h(`div.squad-slot.u-${rarityOf(u)}`, {},
        h('span.slot-key', {}, String(i + 1)),
        h('button.slot-main', { title: tr('빼기', 'Remove'), onclick: () => act(() => toggleSquad(s, u.id)) },
          h('img', { src: portrait(u.look, p.tier, u.id), alt: '' }),
          h('small', {}, u.names[p.tier - 1]!),
        ),
        h('div.slot-move', {},
          h('button', { disabled: i > 0 ? undefined : 'true', onclick: () => act(() => moveSquad(s, u.id, -1)), 'aria-label': tr('앞으로', 'Move left') }, '◀'),
          h('button', { disabled: i < s.loadout.length - 1 ? undefined : 'true', onclick: () => act(() => moveSquad(s, u.id, 1)), 'aria-label': tr('뒤로', 'Move right') }, '▶'),
        ),
      );
    });
    const full = s.loadout.length >= LOADOUT_MAX;
    const pool = ownedUnits(s).map((u) => {
      const p = unitProgress(s, u.id);
      const on = s.loadout.includes(u.id);
      return h(`button.squad-pick.u-${rarityOf(u)}${on ? '.on' : ''}`, {
        disabled: !on && full ? 'true' : undefined,
        onclick: () => act(() => toggleSquad(s, u.id)),
      },
      h('img', { src: portrait(u.look, p.tier, u.id), alt: '' }),
      h('small', {}, u.names[p.tier - 1]!),
      h('span.pick-cost', {}, `{coffee}${u.cost}`),
      on ? h('span.pick-on', {}, String(s.loadout.indexOf(u.id) + 1)) : null);
    });
    return h('div.squad', {},
      h('div.squad-head', {},
        h('b', {}, tr(`전투에 데려갈 동료 (${s.loadout.length}/${LOADOUT_MAX}) · 단축키 1~9`, `Squad for battle (${s.loadout.length}/${LOADOUT_MAX}) · keys 1–9`)),
        h('div.presets', {}, ...s.presets.map((pr, i) => h('div.preset', {},
          h('button.btn.small', { disabled: pr.length ? undefined : 'true', onclick: () => act(() => loadPreset(s, i)), title: tr('불러오기', 'Load') }, tr(`프리셋 ${i + 1} (${pr.length})`, `Preset ${i + 1} (${pr.length})`)),
          h('button.btn.small.save-preset', { onclick: () => act(() => savePreset(s, i)), title: tr('지금 편성 저장', 'Save current squad') }, tr('저장', 'Save')),
        ))),
      ),
      h('div.squad-slots', {}, ...slots),
      h('p.muted.squad-tip', {}, tr('아래 동료를 눌러 넣고 빼요. 9칸이 차면 먼저 하나를 빼야 해요.', 'Tap a labmate below to add or remove. When all 9 slots are full, remove one first.')),
      h('div.squad-pool', {}, ...pool),
    );
  }

  private unitCards(): HTMLElement[] {
    const s = this.save;
    // 기본 동료는 모두, 뽑기 장비는 가진 것만 보여 준다 (나머지는 도감에서 실루엣으로)
    const list = UNITS.filter((u) => !isGachaUnit(u) || isUnitOwned(s, u));
    return sortByPref(list, this.labPref, (u, key) => {
      const owned = isUnitOwned(s, u);
      const p = unitProgress(s, u.id);
      // 레벨은 같으면 진화 단계가 높은 쪽이 위. 아직 없는 동료는 맨 뒤
      if (key === 'level') return owned ? p.level * 10 + p.tier : null;
      if (key === 'rarity') return RARITY_RANK[rarityOf(u)];
      if (key === 'cost') return u.cost;
      if (key === 'name') return owned ? u.names[p.tier - 1]! : u.names[0];
      return unitStats(u, p)[key];
    }).map((u) => this.unitCard(u));
  }

  private unitCard(u: UnitDef): HTMLElement {
    const owned = isUnitOwned(this.save, u);
    const p = unitProgress(this.save, u.id);
    const st = unitStats(u, p);
    // 간단히 보기: 작은 카드에 그림·이름·레벨·버튼만 (버튼 글자도 짧게)
    const mini = this.labPref.compact;
    const refresh = (): void => this.showLab('units');
    let action: HTMLElement;
    if (!owned) {
      if (u.unlock.subscribe) {
        const can = canSubscribe(this.save, u);
        action = h('button.btn.small.primary', {
          disabled: can && this.save.money >= u.unlock.subscribe ? undefined : 'true',
          onclick: () => { if (subscribe(this.save, u)) { this.persist(); refresh(); } },
        }, can ? (mini ? `{coin}${fmt(u.unlock.subscribe)}` : tr(`구독 {coin}${fmt(u.unlock.subscribe)}`, `Subscribe {coin}${fmt(u.unlock.subscribe)}`)) : (mini ? `{lock} ${u.unlock.stage}` : tr(`{lock} ${u.unlock.stage} 클리어`, `{lock} Clear ${u.unlock.stage}`)));
      } else action = h('span.lock-note', {}, mini ? `{lock} ${u.unlock.stage}` : tr(`{lock} ${u.unlock.stage} 클리어 시 합류`, `{lock} Joins after ${u.unlock.stage}`));
    } else if (p.level >= unitLevelCap(this.save, u) && p.tier < 3) {
      action = h('button.btn.small.evolve', {
        disabled: canEvolve(this.save, u) ? undefined : 'true',
        onclick: () => { if (evolve(this.save, u)) { this.persist(); refresh(); } },
      }, mini ? `{sparkle}{coin}${fmt(evolveCost(u, p.tier))}` : tr(`{sparkle} ${u.names[p.tier]}(으)로 진화 {coin}${fmt(evolveCost(u, p.tier))}`, `{sparkle} Evolve to ${u.names[p.tier]} {coin}${fmt(evolveCost(u, p.tier))}`));
    } else if (p.tier >= 3 && p.level >= unitLevelCap(this.save, u)) {
      action = h('span.lock-note', {}, isGachaUnit(u) && passionOf(this.save, u.id) < MAX_PASSION
        ? (mini ? '{fire}' : tr('{fire} 중복으로 열정을 올리면 레벨 상한 +1', '{fire} Dupes raise Passion: level cap +1'))
        : (mini ? '{trophy}' : tr('{trophy} 최고 단계', '{trophy} Max tier')));
    } else {
      action = h('button.btn.small.primary', {
        disabled: canLevelUp(this.save, u) ? undefined : 'true',
        onclick: () => { if (levelUp(this.save, u)) { this.persist(); refresh(); } },
      }, mini ? `{coin}${fmt(levelUpCost(u, p.level))}` : tr(`레벨업 {coin}${fmt(levelUpCost(u, p.level))}`, `Level up {coin}${fmt(levelUpCost(u, p.level))}`));
    }
    const ranged = u.range >= RANGED_THRESHOLD;
    const cap = unitLevelCap(this.save, u);
    const r = rarityOf(u);
    const lv = owned ? h('div.lv', {}, `Lv ${p.level}/${cap}`, h('div.lv-track', {}, h('div.lv-fill', { style: { width: `${(p.level / cap) * 100}%` } })), isGachaUnit(u) && !mini ? passionPips(passionOf(this.save, u.id)) : null) : null;
    return h(`div.card.u-${r}${owned ? '' : '.locked'}${mini ? '.mini' : ''}`, {},
      h('div.card-pic', {}, h('img', { src: portrait(u.look, owned ? p.tier : 1, u.id), alt: '' }), owned ? h('span.tier', {}, ['Ⅰ', 'Ⅱ', 'Ⅲ'][p.tier - 1]!) : null,
        r !== 'basic' ? h('span.rarity-chip.mini', {}, rarityLabel(r)) : null),
      h('div.card-body', {},
        h('b', {}, owned ? u.names[p.tier - 1]! : u.names[0], owned && this.save.loadout.includes(u.id) ? h('span.in-squad', { title: tr('편성 중', 'In squad') }, '{swords}') : null),
        mini ? null : h('span.muted', {}, ` ${u.role}${u.flying ? tr(' · 공중', ' · Air') : ''}${ranged ? tr(' · 대공', ' · Anti-air') : ''}`),
        lv,
        mini ? null : h('div.stats', {}, `{heart}${fmt(st.hp)} {sword}${Math.round(st.atk)} {coffee}${u.cost}${u.count ? ` ×${u.count}` : ''}`),
        // 자세히 보기: 사거리·이동·공격 간격·재소환과 능력 요약
        mini ? null : h('div.stats.more', {}, `{target}${st.range} {boot}${st.speed} {clock}${st.interval}${tr('초', 's')} {hourglass}${u.cooldown}${tr('초', 's')}`),
        mini ? null : h('p.muted.ability', {}, statTags(st)),
        mini ? null : h('p.desc', {}, u.desc),
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
            ? h('span.lock-note', {}, tr('{trophy} 최대 레벨', '{trophy} Max level'))
            : h('button.btn.small.primary', {
              disabled: this.save.money >= cost ? undefined : 'true',
              onclick: () => { if (upgradeFacility(this.save, f.id)) { this.persist(); this.showLab('facilities'); } },
            }, tr(`강화 {coin}${fmt(cost)}`, `Upgrade {coin}${fmt(cost)}`)),
        ),
      );
    });
  }
}

