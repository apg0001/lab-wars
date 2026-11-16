import { CHAPTERS, STAGES, STAGE_BY_ID, type StageDef } from '../data/stages';
import { ENEMY_BY_ID } from '../data/enemies';
import { UNITS } from '../data/units';
import { FACILITIES, SKILLS, facilityCost } from '../data/upgrades';
import type { UnitDef } from '../data/types';
import {
  applyOutcome, canEvolve, canLevelUp, canSubscribe, evolve, evolveCost, isCleared, isSkillOpen, isStageOpen,
  isUnitOwned, levelCap, levelUp, levelUpCost, makeLoadout, newSave, subscribe, unitProgress, unitStats,
  upgradeFacility, type SaveData,
} from '../sim/progression';
import { RANGED_THRESHOLD } from '../data/types';
import { kv, LocalSaveStore, ProfileManager, type Profile, type SaveStore } from '../save/store';
import { AccountApi, AccountSaveStore, API_URL, ApiError, progressScore, type SyncState } from '../save/remote';
import { mountBattle } from './battle-screen';
import { mountGallery } from './gallery';
import { h, fmt } from './dom';
import { portrait } from './icons';

interface Settings {
  speed2x: boolean;
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
  private settings: Settings = { speed2x: false };
  private chapter = 1;
  private cleanup: (() => void) | null = null;

  private storeFor(p: Profile): SaveStore {
    return p.kind === 'account' && this.accountStore ? this.accountStore : this.localStore;
  }

  constructor(private readonly root: HTMLElement) {
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
      this.settings = { ...this.settings, ...JSON.parse(kv.get('settings') ?? '{}') };
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
    this.save = (await this.storeFor(p).load(p.id)) ?? newSave();
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
    const label = { synced: '☁️ 저장됨', pending: '⏳ 저장 중', offline: '📴 오프라인', error: '⚠️ 동기화 오류' };
    return h('span.sync-chip', {}, this.sync ? label[this.sync] : '📱 이 기기');
  }

  private saveSettings(): void {
    kv.set('settings', JSON.stringify(this.settings));
  }

  // ───────────────────── 타이틀 / 프로필 ─────────────────────

  showTitle(): void {
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
          h('button.btn.small', { onclick: () => this.showProfiles() }, '👤 프로필 변경'),
          this.api && p.kind !== 'account' ? h('button.btn.small', { onclick: () => this.showLogin() }, '🔐 로그인 / 가입') : null,
        ),
      )
      : this.newProfileForm();
    const notice = this.notice ? h('p.notice', {}, this.notice) : null;
    this.notice = '';
    const fsBtn = canFullscreen()
      ? h('button.icon-btn.fs-btn', { title: '전체 화면', onclick: () => void enterFullscreen() }, '⛶ 전체 화면')
      : null;
    this.swap(h('div.screen.title', {},
      fsBtn,
      h('div.title-logo', {}, h('h1', {}, '랩워즈'), h('p', {}, '교수님에게서 연구실을 지켜라!')),
      cast,
      body,
      notice,
      h('p.title-foot', {}, p
        ? (p.kind === 'account' ? `🔐 ${p.name} 계정으로 자동 로그인됨 · 어느 기기에서든 이어서 플레이` : '게스트 · 이 기기에만 저장 중' + (this.api ? ' (로그인하면 다른 기기에서도 이어서 할 수 있어요)' : ''))
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
    return h('div.title-actions', {}, input, h('button.btn.primary.big', { onclick: () => void go() }, '🎓 게스트로 시작'),
      h('div.btn-row', {},
        this.api ? h('button.btn.small', { onclick: () => this.showLogin() }, '🔐 로그인 / 가입') : null,
        this.profiles.list().length ? h('button.btn.small', { onclick: () => this.showProfiles() }, '👤 기존 프로필') : null,
      ));
  }

  private showProfiles(): void {
    const list = this.profiles.list();
    const overlay = h('div.overlay');
    const close = (): void => overlay.remove();
    const rows = list.map((p) => h('div.profile-row', {},
      h('button.btn.profile-pick', { onclick: async () => { close(); await this.enter(p); } }, `${p.id === this.profile?.id ? '✅ ' : ''}${p.kind === 'account' ? '🔐 ' : '📱 '}${p.name}`),
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
      h('h2', {}, '🔐 로그인'),
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
      back ? h('button.btn.small', { onclick: back }, '← 뒤로') : h('button.btn.small', { onclick: () => this.showTitle() }, `👤 ${this.profile?.name ?? ''}`),
      h('h2.top-title', {}, title),
      h('div.top-right', {}, this.syncChip(), h('div.money', {}, `💰 ${fmt(this.save.money)}`)),
    );
  }

  showMap(): void {
    const ch = CHAPTERS[this.chapter - 1]!;
    const tabs = h('div.chapter-tabs', {}, ...CHAPTERS.map((c) => {
      const open = isStageOpen(this.save, STAGE_BY_ID[`${c.id}-1`]!);
      return h(`button.chapter-tab${c.id === this.chapter ? '.on' : ''}`, {
        disabled: open ? undefined : 'true',
        onclick: () => { this.chapter = c.id; this.showMap(); },
      }, open ? `${c.id}. ${c.name}` : `🔒 ${c.name}`);
    }));
    const stages = STAGES.filter((s) => s.chapter === ch.id);
    const nodes = h('div.stage-path', {}, ...stages.map((s) => {
      const open = isStageOpen(this.save, s);
      const stars = this.save.stars[s.id] ?? 0;
      return h(`button.stage-node${s.boss ? '.boss' : ''}${open ? '' : '.locked'}${stars ? '.cleared' : ''}`, {
        disabled: open ? undefined : 'true',
        onclick: () => this.showStageInfo(s),
      },
      s.boss ? h('img', { src: portrait(ENEMY_BY_ID[s.boss]!.look, 1, s.boss, -1), alt: '' }) : null,
      h('span.node-id', {}, open ? s.id : '🔒'),
      h('span.node-name', {}, s.name),
      h('span.node-stars', {}, open ? '★'.repeat(stars) + '☆'.repeat(3 - stars) : ''),
      );
    }));
    const totalStars = Object.values(this.save.stars).reduce((a, b) => a + b, 0);
    this.swap(h('div.screen.map', {},
      this.topBar('스테이지'),
      tabs,
      h('div.chapter-title', {}, h('b', {}, `${ch.name}: ${ch.subtitle}`), h('span.muted', {}, ` · 총 별 ${totalStars}/${STAGES.length * 3}`)),
      nodes,
      h('div.map-actions', {},
        h('button.btn.lab-btn', { onclick: () => this.showLab() }, '🔬 연구실 강화'),
        h('button.btn.dex-btn', { onclick: () => this.showGallery() }, '📖 도감'),
      ),
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
      s.boss ? h('p.boss-warn', {}, `⚠️ 보스: ${ENEMY_BY_ID[s.boss]!.name}`) : null,
      h('p.muted', {}, '등장하는 적'),
      h('div.enemy-row', {}, ...enemyIds.map((id) => h('figure', {}, h('img', { src: portrait(ENEMY_BY_ID[id]!.look, 1, id, -1), alt: '' }), h('figcaption', {}, ENEMY_BY_ID[id]!.name)))),
      h('p', {}, first ? `첫 클리어 보상 💰 최대 ${fmt(s.reward * 1.2)}` : `재도전 보상 💰 최대 ${fmt(s.reward * 1.2 * 0.4)} + 처치 보상`),
      h('p.muted', {}, `출전 유닛 ${deck.length}종`),
      h('div.btn-row', {},
        h('button.btn', { onclick: close }, '닫기'),
        h('button.btn.primary', { onclick: () => { close(); this.startBattle(s); } }, '⚔️ 출전!'),
      ),
    ));
    this.root.firstElementChild?.append(overlay);
  }

  // ───────────────────── 전투 ─────────────────────

  private startBattle(stage: StageDef): void {
    const holder = h('div.screen');
    this.swap(holder);
    const before = this.unlockSnapshot();
    this.cleanup = mountBattle(holder, {
      stage,
      loadout: makeLoadout(this.save),
      speed2x: this.settings.speed2x,
      onSpeedChange: (on) => { this.settings.speed2x = on; this.saveSettings(); },
      onEnd: (e) => {
        const out = applyOutcome(this.save, stage, e.win, e.baseHpRatio, e.killReward);
        this.persist();
        const lines = [
          e.win ? `클리어 보상 💰 ${fmt(out.clearReward)}${out.firstClear ? ' (첫 클리어!)' : ''}` : '연구비는 처치한 만큼 받았어요.',
          `처치 보상 💰 ${fmt(out.killReward)} · 처치 ${e.kills}`,
          ...this.unlockNews(before),
        ];
        return { title: e.win ? '🎉 교수실 함락!' : '😵 연구실이 망가졌다…', lines, stars: out.stars };
      },
      actions: (win) => {
        const next = STAGES[stage.order + 1];
        if (win) {
          return [
            ...(next ? [{ label: `다음: ${next.id} ${next.name}`, primary: true, run: () => { this.chapter = next.chapter; this.startBattle(next); } }] : []),
            { label: '🔬 연구실 강화', primary: !next, run: () => this.showLab() },
            { label: '🗺️ 지도로', run: () => this.showMap() },
          ];
        }
        return [
          { label: '🔬 연구실 강화', primary: true, run: () => this.showLab() },
          { label: '🔁 다시 도전', run: () => this.startBattle(stage) },
          { label: '🗺️ 지도로', run: () => this.showMap() },
        ];
      },
      onQuit: () => this.showMap(),
    });
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
      if (kind === 'u') news.push(`🎉 새 동료 합류: ${UNITS.find((u) => u.id === id)!.names[0]}`);
      if (kind === 's') news.push(`🤖 AI 조수 구독 가능: ${UNITS.find((u) => u.id === id)!.names[0]}`);
      if (kind === 'k') news.push(`✨ 새 스킬: ${SKILLS.find((k) => k.id === id)!.name}`);
      if (kind === 'c') news.push(`📖 새 챕터: ${CHAPTERS[Number(id) - 1]!.name}`);
    }
    return news;
  }

  showGallery(): void {
    const holder = h('div.screen');
    this.swap(holder);
    this.cleanup = mountGallery(holder, this.save, () => this.showMap());
  }

  // ───────────────────── 연구실 강화 ─────────────────────

  showLab(tab: 'units' | 'facilities' = 'units'): void {
    const body = tab === 'units' ? this.unitCards() : this.facilityCards();
    this.swap(h('div.screen.lab', {},
      this.topBar('연구실 강화', () => this.showMap()),
      h('div.lab-tabs', {},
        h(`button.chapter-tab${tab === 'units' ? '.on' : ''}`, { onclick: () => this.showLab('units') }, '🧑‍🎓 동료'),
        h(`button.chapter-tab${tab === 'facilities' ? '.on' : ''}`, { onclick: () => this.showLab('facilities') }, '🏗️ 시설'),
      ),
      h('div.card-grid', {}, ...body),
    ));
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
        }, can ? `구독 💰${fmt(u.unlock.subscribe)}` : `🔒 ${u.unlock.stage} 클리어`);
      } else action = h('span.lock-note', {}, `🔒 ${u.unlock.stage} 클리어 시 합류`);
    } else if (p.level >= levelCap(p.tier) && p.tier < 3) {
      action = h('button.btn.small.evolve', {
        disabled: canEvolve(this.save, u) ? undefined : 'true',
        onclick: () => { if (evolve(this.save, u)) { this.persist(); refresh(); } },
      }, `✨ ${u.names[p.tier]}(으)로 진화 💰${fmt(evolveCost(u, p.tier))}`);
    } else if (p.level >= 15) {
      action = h('span.lock-note', {}, '🏆 최고 단계');
    } else {
      action = h('button.btn.small.primary', {
        disabled: canLevelUp(this.save, u) ? undefined : 'true',
        onclick: () => { if (levelUp(this.save, u)) { this.persist(); refresh(); } },
      }, `레벨업 💰${fmt(levelUpCost(u, p.level))}`);
    }
    const ranged = u.range >= RANGED_THRESHOLD;
    return h(`div.card${owned ? '' : '.locked'}`, {},
      h('div.card-pic', {}, h('img', { src: portrait(u.look, owned ? p.tier : 1, u.id), alt: '' }), owned ? h('span.tier', {}, ['Ⅰ', 'Ⅱ', 'Ⅲ'][p.tier - 1]!) : null),
      h('div.card-body', {},
        h('b', {}, owned ? u.names[p.tier - 1]! : u.names[0]),
        h('span.muted', {}, ` ${u.role}${u.flying ? ' · 공중' : ''}${ranged ? ' · 대공' : ''}`),
        owned ? h('div.lv', {}, `Lv ${p.level}/${levelCap(p.tier)}`, h('div.lv-track', {}, h('div.lv-fill', { style: { width: `${(p.level / levelCap(p.tier)) * 100}%` } }))) : null,
        h('div.stats', {}, `❤️${fmt(st.hp)} ⚔️${Math.round(st.atk)} ☕${u.cost}${u.count ? ` ×${u.count}` : ''}`),
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
        h('div.card-pic.emoji', {}, f.icon),
        h('div.card-body', {},
          h('b', {}, f.name),
          h('div.lv', {}, `Lv ${lv}/${f.max}`, h('div.lv-track', {}, h('div.lv-fill', { style: { width: `${(lv / f.max) * 100}%` } }))),
          h('p.desc', {}, f.desc),
          lv >= f.max
            ? h('span.lock-note', {}, '🏆 최대 레벨')
            : h('button.btn.small.primary', {
              disabled: this.save.money >= cost ? undefined : 'true',
              onclick: () => { if (upgradeFacility(this.save, f.id)) { this.persist(); this.showLab('facilities'); } },
            }, `강화 💰${fmt(cost)}`),
        ),
      );
    });
  }
}

function canFullscreen(): boolean {
  const standalone = window.matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches;
  return !standalone && !!document.documentElement.requestFullscreen && !document.fullscreenElement;
}

/** 모바일에서 전체 화면으로 전환하고 가능하면 가로로 고정한다. */
async function enterFullscreen(): Promise<void> {
  try {
    await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
    const o = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> };
    await o.lock?.('landscape');
  } catch {
    /* 지원하지 않는 브라우저(iOS Safari 등)는 무시 */
  }
  document.querySelector('.fs-btn')?.remove();
}
