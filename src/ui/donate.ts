import { DONATE_URL } from '../data/donate';
import { getLang, tr } from '../i18n';
import { h } from './dom';

/** 지금 언어에 맞는 후원 링크 버튼 (링크가 없으면 null) */
export function donateLink(cls = ''): HTMLElement | null {
  const url = DONATE_URL[getLang()];
  if (!url) return null;
  return h(`a.donate-link${cls ? '.' + cls : ''}`, { href: url, target: '_blank', rel: 'noopener' },
    tr('{coffee} 개발자에게 커피 사 주기', '{coffee} Buy the dev a coffee'));
}
