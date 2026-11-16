/** 아주 작은 DOM 도우미: h('div.cls', {onclick}, children) */
export function h(
  tag: string,
  props: Partial<Record<string, unknown>> = {},
  ...children: (Node | string | null | undefined | false)[]
): HTMLElement {
  const [name, ...classes] = tag.split('.');
  const el = document.createElement(name!);
  if (classes.length) el.className = classes.join(' ');
  for (const [k, v] of Object.entries(props)) {
    if (v === undefined || v === null || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v as EventListener);
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k === 'html') el.innerHTML = String(v);
    else el.setAttribute(k, String(v));
  }
  for (const c of children) if (c !== null && c !== undefined && c !== false) el.append(c);
  return el;
}

export const fmt = (n: number): string => Math.floor(n).toLocaleString('ko-KR');
