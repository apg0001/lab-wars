import { ApiError, type AccountApi, type AccountUser, type FeedbackCategory, type FeedbackItem } from '../save/remote';
import { h } from './dom';
import { tr } from '../i18n';
import { feedbackLabel } from '../i18n/server';

/**
 * 계정 부가 기능 창: 닉네임 바꾸기, 의견 보내기, 관리자용 의견함.
 * 사용자가 적은 글은 아이콘 표시로 바뀌지 않도록 글자 노드로 넣는다.
 */

const text = (s: string): Text => document.createTextNode(s);

const errMsg = (e: unknown): string => (e instanceof ApiError ? e.message : tr('서버에 연결할 수 없어요. 인터넷 연결을 확인해 주세요.', 'Can\'t reach the server. Please check your internet connection.'));

function openOverlay(host: Element | null, panel: HTMLElement): () => void {
  const overlay = h('div.overlay', {}, panel);
  host?.append(overlay);
  return () => overlay.remove();
}

/** 닉네임 바꾸기 (로그인한 계정만) */
export function showNicknameForm(host: Element | null, api: AccountApi, onDone: (u: AccountUser) => void): void {
  const cur = api.user;
  const input = h('input.name-input', { maxlength: '12', placeholder: tr('닉네임 (2~12자)', 'Nickname (2–12 chars)'), enterkeyhint: 'done' }) as HTMLInputElement;
  input.value = cur?.nickname || cur?.username || '';
  const msg = h('p.form-msg');
  const save = async (): Promise<void> => {
    msg.textContent = tr('잠시만요…', 'One moment…');
    try {
      const u = await api.setNickname(input.value);
      close();
      onDone(u);
    } catch (e) {
      msg.textContent = errMsg(e);
    }
  };
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') void save();
  });
  const close = openOverlay(host, h('div.panel.login', {},
    h('h2', {}, tr('{pencil} 닉네임 바꾸기', '{pencil} Change nickname')),
    h('p.muted', {}, tr('순위표와 화면에 보이는 이름이에요. 로그인 아이디는 바뀌지 않아요.', 'This name shows on the leaderboard and in game. Your login ID stays the same.')),
    cur ? h('p.muted', {}, text(tr(`로그인 아이디: ${cur.username}`, `Login ID: ${cur.username}`))) : null,
    h('div.title-actions', {}, input),
    msg,
    h('div.btn-row', {},
      h('button.btn', { onclick: () => close() }, tr('닫기', 'Close')),
      h('button.btn.primary', { onclick: () => void save() }, tr('{check} 저장', '{check} Save')),
    ),
  ));
  input.focus();
  input.select();
}

const CATEGORIES: { id: FeedbackCategory; label: string }[] = [
  { id: '건의', get label() { return tr('{sparkle} 개선 건의', '{sparkle} Suggestion'); } },
  { id: '문의', get label() { return tr('{mic} 문의', '{mic} Question'); } },
  { id: '버그', get label() { return tr('{warn} 버그 제보', '{warn} Bug report'); } },
];

/** 의견 보내기. api가 없으면(서버 없는 버전) 안내만 보여 준다. */
export function showFeedbackForm(host: Element | null, api: AccountApi | null, guestName = ''): void {
  if (!api) {
    const close = openOverlay(host, h('div.panel.login', {},
      h('h2', {}, tr('{megaphone} 의견 보내기', '{megaphone} Send feedback')),
      h('p', {}, tr('이 버전은 의견 서버와 연결되어 있지 않아요.', 'This build isn\'t connected to the feedback server.')),
      h('p.muted', {}, tr('온라인 버전(로그인 버튼이 보이는 버전)에서 보내 주시면 꼭 읽어 볼게요!', 'Send it from the online version (the one with a login button) and we\'ll read it!')),
      h('button.btn.primary', { onclick: () => close() }, tr('닫기', 'Close')),
    ));
    return;
  }
  let category: FeedbackCategory = '건의';
  const tabs = CATEGORIES.map((c) => h(`button.btn.small.fb-cat${c.id === category ? '.on' : ''}`, {
    onclick: () => {
      category = c.id;
      tabs.forEach((t, i) => t.classList.toggle('on', CATEGORIES[i]!.id === category));
    },
  }, c.label));
  const area = h('textarea.fb-text', { maxlength: '1000', rows: '5', placeholder: tr('불편했던 점, 바라는 점, 궁금한 점을 자유롭게 적어 주세요. (1000자까지)', 'Tell us what bugged you, what you\'d like, or what you\'re curious about. (up to 1000 chars)') }) as HTMLTextAreaElement;
  const count = h('span.fb-count', {}, '0/1000');
  area.addEventListener('input', () => {
    count.textContent = `${area.value.length}/1000`;
  });
  const account = api.user;
  const nameInput = account ? null : h('input.name-input.fb-name', { maxlength: '20', placeholder: tr('이름 (선택)', 'Name (optional)') }) as HTMLInputElement;
  if (nameInput) nameInput.value = guestName;
  const msg = h('p.form-msg');
  const sendBtn = h('button.btn.primary', { onclick: () => void send() }, tr('{check} 보내기', '{check} Send')) as HTMLButtonElement;
  const send = async (): Promise<void> => {
    if (!area.value.trim()) {
      msg.textContent = tr('내용을 적어 주세요.', 'Please write something.');
      return;
    }
    msg.textContent = tr('보내는 중…', 'Sending…');
    sendBtn.disabled = true;
    try {
      await api.sendFeedback(category, area.value.trim(), nameInput?.value.trim() ?? '');
      panel.replaceChildren(
        h('h2', {}, tr('{check} 고마워요!', '{check} Thank you!')),
        h('p', {}, tr('보내 주신 의견은 개발자가 직접 읽고 다음 업데이트에 참고할게요.', 'The developer reads every message personally and uses it for the next update.')),
        h('button.btn.primary', { onclick: () => close() }, tr('닫기', 'Close')),
      );
    } catch (e) {
      // 적은 글은 그대로 두고 다시 보낼 수 있게 한다
      msg.textContent = errMsg(e);
      sendBtn.disabled = false;
    }
  };
  const panel = h('div.panel.login.fb-panel', {},
    h('h2', {}, tr('{megaphone} 의견 보내기', '{megaphone} Send feedback')),
    h('div.btn-row.fb-cats', {}, ...tabs),
    area,
    h('div.fb-meta', {}, nameInput ?? h('span.muted', {}, text(tr(`보내는 사람: ${account ? (account.nickname || account.username) : ''}`, `From: ${account ? (account.nickname || account.username) : ''}`))), count),
    msg,
    h('div.btn-row', {}, h('button.btn', { onclick: () => close() }, tr('닫기', 'Close')), sendBtn),
  );
  const close = openOverlay(host, panel);
  area.focus();
}

const when = (t: number): string => {
  const d = new Date(t);
  const p = (n: number): string => String(n).padStart(2, '0');
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
};

/** 관리자용 의견함: 최신순, 처리됨 표시 */
export function showFeedbackInbox(host: Element | null, api: AccountApi): void {
  let items: FeedbackItem[] = [];
  let openOnly = true;
  const body = h('div.fb-list', {}, h('p.muted', {}, tr('불러오는 중…', 'Loading…')));
  const summary = h('span.muted');
  const filterBtn = h('button.btn.small', { onclick: () => { openOnly = !openOnly; render(); } });

  const row = (f: FeedbackItem): HTMLElement => {
    const btn = h(`button.btn.small${f.done ? '' : '.primary'}`, {
      onclick: async () => {
        btn.setAttribute('disabled', 'true');
        try {
          await api.markFeedback(f.id, !f.done);
          f.done = !f.done;
          f.doneAt = f.done ? Date.now() : null;
          render();
        } catch (e) {
          btn.removeAttribute('disabled');
          alert(errMsg(e));
        }
      },
    }, f.done ? tr('{retry} 다시 열기', '{retry} Reopen') : tr('{check} 처리됨', '{check} Done'));
    return h(`div.fb-item${f.done ? '.done' : ''}`, {},
      h('div.fb-head', {},
        h(`span.fb-tag.cat-${f.category}`, {}, feedbackLabel(f.category)),
        h('b.fb-author', {}, f.guest ? '{phone} ' : '{key} ', text(f.author)),
        h('span.muted', {}, text(`${when(f.createdAt)}${f.version ? ` · ${f.version}` : ''}`)),
        btn,
      ),
      h('p.fb-body', {}, text(f.text)),
    );
  };

  const render = (): void => {
    const open = items.filter((f) => !f.done).length;
    summary.textContent = tr(`처리 전 ${open}건 / 전체 ${items.length}건`, `${open} open / ${items.length} total`);
    filterBtn.replaceChildren(text(openOnly ? tr('전체 보기', 'Show all') : tr('처리 전만 보기', 'Open only')));
    const shown = openOnly ? items.filter((f) => !f.done) : items;
    body.replaceChildren(...(shown.length ? shown.map(row) : [h('p.muted', {}, openOnly ? tr('처리할 의견이 없어요.', 'Nothing to handle.') : tr('아직 받은 의견이 없어요.', 'No feedback yet.'))]));
  };

  const load = (): void => {
    body.replaceChildren(h('p.muted', {}, tr('불러오는 중…', 'Loading…')));
    api.listFeedback().then((r) => {
      items = r.items;
      render();
    }).catch((e) => body.replaceChildren(h('p.form-msg', {}, errMsg(e))));
  };

  const close = openOverlay(host, h('div.panel.rank-panel.fb-inbox', {},
    h('h2', {}, tr('{mail} 의견함', '{mail} Feedback inbox')),
    h('div.fb-bar', {}, summary, filterBtn, h('button.btn.small', { onclick: load }, tr('{retry} 새로고침', '{retry} Refresh'))),
    body,
    h('button.btn.primary', { onclick: () => close() }, tr('닫기', 'Close')),
  ));
  load();
}
