import { DONATE_URL } from '../data/donate';
import { getLang, tr } from '../i18n';
import { h } from './dom';

/** 휴대폰·태블릿인지 (카카오페이 송금코드 링크는 휴대폰에서만 열린다) */
function isMobile(): boolean {
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

/** PC에서 누르면: 휴대폰으로 여는 방법 안내 + 링크 복사 */
function showPcGuide(url: string, host: Element | null): void {
  if (!host) return;
  const overlay = h('div.overlay', { onclick: (e: Event) => { if (e.target === overlay) overlay.remove(); } });
  const status = h('p.muted.donate-status', {}, '');
  const copy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(url);
      status.textContent = tr('복사했어요! 카카오톡 "나와의 채팅"에 붙여 넣고 휴대폰에서 눌러 주세요.', 'Copied! Paste it to yourself and open it on your phone.');
    } catch {
      status.textContent = url;
    }
  };
  overlay.append(h('div.panel.donate-panel', {},
    h('h2', {}, tr('{coffee} 커피 한 잔 후원', '{coffee} Buy the dev a coffee')),
    h('p', {}, tr('카카오페이 송금 링크는 휴대폰에서만 열려요.', 'This KakaoPay link only opens on a phone.')),
    h('ol.donate-steps', {},
      h('li', {}, tr('아래 버튼으로 링크를 복사해요', 'Copy the link below')),
      h('li', {}, tr('카카오톡 "나와의 채팅"에 붙여 넣어요', 'Send it to yourself (e.g. KakaoTalk "Chat with me")')),
      h('li', {}, tr('휴대폰에서 링크를 누르면 송금 화면이 열려요', 'Tap it on your phone to open the transfer screen')),
    ),
    h('code.donate-url', {}, url),
    status,
    h('div.btn-row', {},
      h('button.btn', { onclick: () => void copy() }, tr('{clipboard} 링크 복사', '{clipboard} Copy link')),
      h('button.btn.primary', { onclick: () => overlay.remove() }, tr('닫기', 'Close')),
    ),
  ));
  host.append(overlay);
}

/** 지금 언어에 맞는 후원 링크 버튼 (링크가 없으면 null). PC에서는 휴대폰으로 여는 안내 창을 띄운다. */
export function donateLink(cls = ''): HTMLElement | null {
  const url = DONATE_URL[getLang()];
  if (!url) return null;
  const a = h(`a.donate-link${cls ? '.' + cls : ''}`, {
    href: url, target: '_blank', rel: 'noopener',
    onclick: (e: Event) => {
      if (isMobile()) return;
      e.preventDefault();
      showPcGuide(url, a.closest('.stage') ?? document.body);
    },
  }, tr('{coffee} 개발자에게 커피 사 주기', '{coffee} Buy the dev a coffee'));
  return a;
}
