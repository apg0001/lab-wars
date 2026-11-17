import { ApiError, type AccountApi, type AccountUser, type FeedbackCategory, type FeedbackItem } from '../save/remote';
import { h } from './dom';

/**
 * 계정 부가 기능 창: 닉네임 바꾸기, 의견 보내기, 관리자용 의견함.
 * 사용자가 적은 글은 아이콘 표시로 바뀌지 않도록 글자 노드로 넣는다.
 */

const text = (s: string): Text => document.createTextNode(s);

const errMsg = (e: unknown): string => (e instanceof ApiError ? e.message : '서버에 연결할 수 없어요. 인터넷 연결을 확인해 주세요.');

function openOverlay(host: Element | null, panel: HTMLElement): () => void {
  const overlay = h('div.overlay', {}, panel);
  host?.append(overlay);
  return () => overlay.remove();
}

/** 닉네임 바꾸기 (로그인한 계정만) */
export function showNicknameForm(host: Element | null, api: AccountApi, onDone: (u: AccountUser) => void): void {
  const cur = api.user;
  const input = h('input.name-input', { maxlength: '12', placeholder: '닉네임 (2~12자)', enterkeyhint: 'done' }) as HTMLInputElement;
  input.value = cur?.nickname || cur?.username || '';
  const msg = h('p.form-msg');
  const save = async (): Promise<void> => {
    msg.textContent = '잠시만요…';
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
    h('h2', {}, '{pencil} 닉네임 바꾸기'),
    h('p.muted', {}, '순위표와 화면에 보이는 이름이에요. 로그인 아이디는 바뀌지 않아요.'),
    cur ? h('p.muted', {}, text(`로그인 아이디: ${cur.username}`)) : null,
    h('div.title-actions', {}, input),
    msg,
    h('div.btn-row', {},
      h('button.btn', { onclick: () => close() }, '닫기'),
      h('button.btn.primary', { onclick: () => void save() }, '{check} 저장'),
    ),
  ));
  input.focus();
  input.select();
}

const CATEGORIES: { id: FeedbackCategory; label: string }[] = [
  { id: '건의', label: '{sparkle} 개선 건의' },
  { id: '문의', label: '{mic} 문의' },
  { id: '버그', label: '{warn} 버그 제보' },
];

/** 의견 보내기. api가 없으면(서버 없는 버전) 안내만 보여 준다. */
export function showFeedbackForm(host: Element | null, api: AccountApi | null, guestName = ''): void {
  if (!api) {
    const close = openOverlay(host, h('div.panel.login', {},
      h('h2', {}, '{megaphone} 의견 보내기'),
      h('p', {}, '이 버전은 의견 서버와 연결되어 있지 않아요.'),
      h('p.muted', {}, '온라인 버전(로그인 버튼이 보이는 버전)에서 보내 주시면 꼭 읽어 볼게요!'),
      h('button.btn.primary', { onclick: () => close() }, '닫기'),
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
  const area = h('textarea.fb-text', { maxlength: '1000', rows: '5', placeholder: '불편했던 점, 바라는 점, 궁금한 점을 자유롭게 적어 주세요. (1000자까지)' }) as HTMLTextAreaElement;
  const count = h('span.fb-count', {}, '0/1000');
  area.addEventListener('input', () => {
    count.textContent = `${area.value.length}/1000`;
  });
  const account = api.user;
  const nameInput = account ? null : h('input.name-input.fb-name', { maxlength: '20', placeholder: '이름 (선택)' }) as HTMLInputElement;
  if (nameInput) nameInput.value = guestName;
  const msg = h('p.form-msg');
  const sendBtn = h('button.btn.primary', { onclick: () => void send() }, '{check} 보내기') as HTMLButtonElement;
  const send = async (): Promise<void> => {
    if (!area.value.trim()) {
      msg.textContent = '내용을 적어 주세요.';
      return;
    }
    msg.textContent = '보내는 중…';
    sendBtn.disabled = true;
    try {
      await api.sendFeedback(category, area.value.trim(), nameInput?.value.trim() ?? '');
      panel.replaceChildren(
        h('h2', {}, '{check} 고마워요!'),
        h('p', {}, '보내 주신 의견은 개발자가 직접 읽고 다음 업데이트에 참고할게요.'),
        h('button.btn.primary', { onclick: () => close() }, '닫기'),
      );
    } catch (e) {
      // 적은 글은 그대로 두고 다시 보낼 수 있게 한다
      msg.textContent = errMsg(e);
      sendBtn.disabled = false;
    }
  };
  const panel = h('div.panel.login.fb-panel', {},
    h('h2', {}, '{megaphone} 의견 보내기'),
    h('div.btn-row.fb-cats', {}, ...tabs),
    area,
    h('div.fb-meta', {}, nameInput ?? h('span.muted', {}, text(`보내는 사람: ${account ? (account.nickname || account.username) : ''}`)), count),
    msg,
    h('div.btn-row', {}, h('button.btn', { onclick: () => close() }, '닫기'), sendBtn),
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
  const body = h('div.fb-list', {}, h('p.muted', {}, '불러오는 중…'));
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
    }, f.done ? '{retry} 다시 열기' : '{check} 처리됨');
    return h(`div.fb-item${f.done ? '.done' : ''}`, {},
      h('div.fb-head', {},
        h(`span.fb-tag.cat-${f.category}`, {}, f.category),
        h('b.fb-author', {}, f.guest ? '{phone} ' : '{key} ', text(f.author)),
        h('span.muted', {}, text(`${when(f.createdAt)}${f.version ? ` · ${f.version}` : ''}`)),
        btn,
      ),
      h('p.fb-body', {}, text(f.text)),
    );
  };

  const render = (): void => {
    const open = items.filter((f) => !f.done).length;
    summary.textContent = `처리 전 ${open}건 / 전체 ${items.length}건`;
    filterBtn.replaceChildren(text(openOnly ? '전체 보기' : '처리 전만 보기'));
    const shown = openOnly ? items.filter((f) => !f.done) : items;
    body.replaceChildren(...(shown.length ? shown.map(row) : [h('p.muted', {}, openOnly ? '처리할 의견이 없어요.' : '아직 받은 의견이 없어요.')]));
  };

  const load = (): void => {
    body.replaceChildren(h('p.muted', {}, '불러오는 중…'));
    api.listFeedback().then((r) => {
      items = r.items;
      render();
    }).catch((e) => body.replaceChildren(h('p.form-msg', {}, errMsg(e))));
  };

  const close = openOverlay(host, h('div.panel.rank-panel.fb-inbox', {},
    h('h2', {}, '{mail} 의견함'),
    h('div.fb-bar', {}, summary, filterBtn, h('button.btn.small', { onclick: load }, '{retry} 새로고침')),
    body,
    h('button.btn.primary', { onclick: () => close() }, '닫기'),
  ));
  load();
}
