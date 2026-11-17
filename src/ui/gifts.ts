import { ApiError, type AccountApi, type GiftItem, type PlayerRow, type SentGift } from '../save/remote';
import { fmt, h } from './dom';
import { tr } from '../i18n';

/**
 * 선물: 관리자가 플레이어를 골라 연구비·장비 뽑기권을 보내고,
 * 받는 사람은 선물함에서 받는다 (거절 없음). 사람이 적은 글은 글자 노드로 넣는다.
 */

const text = (s: string): Text => document.createTextNode(s);

const errMsg = (e: unknown): string => (e instanceof ApiError ? e.message : tr('서버에 연결할 수 없어요. 인터넷 연결을 확인해 주세요.', 'Can\'t reach the server. Please check your internet connection.'));

const when = (t: number): string => {
  const d = new Date(t);
  const p = (n: number): string => String(n).padStart(2, '0');
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
};

function openOverlay(host: Element | null, panel: HTMLElement): () => void {
  const overlay = h('div.overlay', {}, panel);
  host?.append(overlay);
  return () => overlay.remove();
}

/** 선물 내용 한 줄: "{coin} 100,000 · {ticket} 10" */
const contents = (g: { money: number; tickets: number }): string =>
  [g.money ? `{coin} ${fmt(g.money)}` : '', g.tickets ? tr(`{ticket} 뽑기권 ${g.tickets}장`, `{ticket} ${g.tickets} ticket(s)`) : ''].filter(Boolean).join(' · ');

/**
 * 내 선물함. 받으면 onClaim으로 합계를 넘기고, 게임이 저장에 더한다.
 * 서버가 먼저 받음 처리하므로 같은 선물을 두 번 받을 수 없다.
 */
export function showGiftBox(host: Element | null, api: AccountApi, onClaim: (money: number, tickets: number) => void, onClose: (claimed: boolean) => void = () => undefined): void {
  let items: GiftItem[] = [];
  let claimed = false;
  const list = h('div.fb-list.gift-list', {}, h('p.muted', {}, tr('불러오는 중…', 'Loading…')));
  const msg = h('p.form-msg');
  const allBtn = h('button.btn.primary', { disabled: 'true', onclick: () => void claim() }, tr('{gift} 모두 받기', '{gift} Claim all')) as HTMLButtonElement;

  const claim = async (ids?: number[]): Promise<void> => {
    allBtn.disabled = true;
    msg.textContent = tr('받는 중…', 'Claiming…');
    try {
      const r = await api.claimGifts(ids);
      if (r.money || r.tickets) {
        claimed = true;
        onClaim(r.money, r.tickets);
      }
      const got = new Set(r.items.map((g) => g.id));
      items = items.filter((g) => !got.has(g.id));
      msg.replaceChildren(r.items.length ? h('span', {}, tr(`{check} ${contents(r)} 받았어요!`, `{check} Received ${contents(r)}!`)) : '');
      render();
    } catch (e) {
      msg.textContent = errMsg(e);
      allBtn.disabled = !items.length;
    }
  };

  const render = (): void => {
    allBtn.disabled = !items.length;
    list.replaceChildren(...(items.length
      ? items.map((g) => h('div.fb-item.gift-item', {},
        h('div.fb-head', {},
          h('b.gift-what', {}, contents(g)),
          h('span.muted', {}, text(`${g.sender} · ${when(g.createdAt)}`)),
          h('button.btn.small.primary', { onclick: () => void claim([g.id]) }, tr('받기', 'Claim')),
        ),
        g.message ? h('p.fb-body', {}, text(g.message)) : null,
      ))
      : [h('p.muted', {}, tr('받을 선물이 없어요.', 'No gifts right now.'))]));
  };

  const remove = openOverlay(host, h('div.panel.rank-panel.gift-box', {},
    h('h2', {}, tr('{gift} 선물함', '{gift} Gift box')),
    list,
    msg,
    h('div.btn-row', {}, h('button.btn', { onclick: () => close() }, tr('닫기', 'Close')), allBtn),
  ));
  const close = (): void => {
    remove();
    onClose(claimed);
  };
  api.gifts().then((g) => {
    items = g;
    render();
  }).catch((e) => list.replaceChildren(h('p.form-msg', {}, errMsg(e))));
}

/** 관리자: 플레이어 목록에서 골라 선물 보내기 + 보낸 기록 */
export function showGiftAdmin(host: Element | null, api: AccountApi): void {
  let players: PlayerRow[] = [];
  const picked = new Set<number>();
  let query = '';

  const search = h('input.name-input.gift-search', { placeholder: tr('이름·아이디 찾기', 'Search name / ID') }) as HTMLInputElement;
  search.addEventListener('input', () => {
    query = search.value.trim().toLowerCase();
    renderPlayers();
  });
  const count = h('span.muted');
  const allBox = h('input', { type: 'checkbox', title: tr('보이는 사람 모두 고르기', 'Select all shown') }) as HTMLInputElement;
  allBox.addEventListener('change', () => {
    for (const p of shown()) {
      if (allBox.checked) picked.add(p.id);
      else picked.delete(p.id);
    }
    renderPlayers();
  });
  const list = h('div.fb-list.gift-players', {}, h('p.muted', {}, tr('불러오는 중…', 'Loading…')));

  const money = h('input.name-input.gift-num', { type: 'number', min: '0', max: '10000000', step: '1000', placeholder: '0', inputmode: 'numeric' }) as HTMLInputElement;
  const tickets = h('input.name-input.gift-num', { type: 'number', min: '0', max: '1000', step: '1', placeholder: '0', inputmode: 'numeric' }) as HTMLInputElement;
  const note = h('input.name-input.gift-note', { maxlength: '100', placeholder: tr('메시지 (선택, 100자)', 'Message (optional, 100 chars)') }) as HTMLInputElement;
  const msg = h('p.form-msg');
  const sendBtn = h('button.btn.primary', { onclick: () => void send() }, tr('{gift} 선물 보내기', '{gift} Send gift')) as HTMLButtonElement;

  const shown = (): PlayerRow[] => players.filter((p) => !query || p.nickname.toLowerCase().includes(query) || p.username.toLowerCase().includes(query));

  const renderPlayers = (): void => {
    const rows = shown();
    count.textContent = tr(`${picked.size}명 고름 / ${players.length}명`, `${picked.size} picked / ${players.length}`);
    allBox.checked = rows.length > 0 && rows.every((p) => picked.has(p.id));
    list.replaceChildren(...(rows.length ? rows.map((p) => {
      const box = h('input', { type: 'checkbox' }) as HTMLInputElement;
      box.checked = picked.has(p.id);
      box.addEventListener('change', () => {
        if (box.checked) picked.add(p.id);
        else picked.delete(p.id);
        renderPlayers();
      });
      return h(`label.fb-item.gift-player${box.checked ? '.on' : ''}`, {},
        box,
        h('b', {}, text(p.nickname)),
        p.nickname !== p.username ? h('span.muted', {}, text(`(${p.username})`)) : null,
        h('span.gift-stats', {}, `{coin} ${fmt(p.money)} · {ticket} ${p.tickets} · ${tr(`${p.cleared}스테이지`, `${p.cleared} stages`)}${p.endless ? ` · {infinity} ${p.endless}` : ''}`),
        h('span.muted.gift-seen', {}, text(p.lastSave ? when(p.lastSave) : tr('저장 없음', 'No save'))),
      );
    }) : [h('p.muted', {}, tr('플레이어가 없어요.', 'No players.'))]));
  };

  const send = async (): Promise<void> => {
    const m = Math.floor(Number(money.value) || 0);
    const t = Math.floor(Number(tickets.value) || 0);
    if (!picked.size) return void (msg.textContent = tr('받는 사람을 골라 주세요.', 'Please pick at least one recipient.'));
    if (m < 0 || t < 0 || m + t === 0) return void (msg.textContent = tr('연구비나 뽑기권을 넣어 주세요.', 'Enter funds or tickets.'));
    const names = players.filter((p) => picked.has(p.id)).map((p) => p.nickname);
    const who = names.length > 3 ? tr(`${names.slice(0, 3).join(', ')} 외 ${names.length - 3}명`, `${names.slice(0, 3).join(', ')} and ${names.length - 3} more`) : names.join(', ');
    const what = [m ? tr(`연구비 ${fmt(m)}`, `${fmt(m)} funds`) : '', t ? tr(`뽑기권 ${t}장`, `${t} ticket(s)`) : ''].filter(Boolean).join(' + ');
    if (!confirm(tr(`${who}에게 ${what}을(를) 보낼까요?`, `Send ${what} to ${who}?`))) return;
    sendBtn.disabled = true;
    msg.textContent = tr('보내는 중…', 'Sending…');
    try {
      const n = await api.sendGifts([...picked], m, t, note.value.trim());
      msg.textContent = tr(`${n}명에게 보냈어요. 받는 사람이 선물함에서 받으면 들어가요.`, `Sent to ${n} player(s). They get it when they claim it from their gift box.`);
      picked.clear();
      money.value = '';
      tickets.value = '';
      note.value = '';
      renderPlayers();
    } catch (e) {
      msg.textContent = errMsg(e);
    } finally {
      sendBtn.disabled = false;
    }
  };

  const showLog = (): void => {
    const body = h('div.fb-list', {}, h('p.muted', {}, tr('불러오는 중…', 'Loading…')));
    const closeLog = openOverlay(host, h('div.panel.rank-panel.fb-inbox', {},
      h('h2', {}, tr('{scroll} 보낸 선물', '{scroll} Sent gifts')),
      body,
      h('button.btn.primary', { onclick: () => closeLog() }, tr('닫기', 'Close')),
    ));
    api.sentGifts().then((items: SentGift[]) => body.replaceChildren(...(items.length ? items.map((g) => h(`div.fb-item${g.claimedAt ? '.done' : ''}`, {},
      h('div.fb-head', {},
        h('b', {}, text(g.to)),
        h('span', {}, contents(g)),
        h('span.muted', {}, text(when(g.createdAt))),
        h('span.fb-tag', {}, g.claimedAt ? tr('받음', 'Claimed') : tr('대기', 'Waiting')),
      ),
      g.message ? h('p.fb-body', {}, text(g.message)) : null,
    )) : [h('p.muted', {}, tr('아직 보낸 선물이 없어요.', 'No gifts sent yet.'))]))).catch((e) => body.replaceChildren(h('p.form-msg', {}, errMsg(e))));
  };

  const close = openOverlay(host, h('div.panel.rank-panel.fb-inbox.gift-admin', {},
    h('h2', {}, tr('{gift} 선물 보내기', '{gift} Send gifts')),
    h('div.fb-bar', {}, h('label.gift-all', {}, allBox, count), search, h('button.btn.small', { onclick: showLog }, tr('{scroll} 보낸 기록', '{scroll} Log'))),
    list,
    h('div.gift-form', {},
      h('label', {}, '{coin}', money),
      h('label', {}, '{ticket}', tickets),
      note,
    ),
    msg,
    h('div.btn-row', {}, h('button.btn', { onclick: () => close() }, tr('닫기', 'Close')), sendBtn),
  ));
  api.players().then((p) => {
    players = p;
    renderPlayers();
  }).catch((e) => list.replaceChildren(h('p.form-msg', {}, errMsg(e))));
}
