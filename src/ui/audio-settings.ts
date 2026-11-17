import { audio, type AudioSettings } from '../audio/engine';
import { sfx } from '../audio/sfx';
import { h } from './dom';

/** 배경음악·효과음 각각 켜기/끄기와 볼륨 조절 창 */
export function showAudioSettings(host: Element | null, onClose?: () => void): void {
  if (!host) return;
  audio.unlock();
  const close = (): void => {
    overlay.remove();
    onClose?.();
  };
  const overlay = h('div.overlay.audio-overlay', { onclick: (e: Event) => { if (e.target === overlay) close(); } });

  const row = (label: string, onKey: 'musicOn' | 'sfxOn', volKey: 'musicVol' | 'sfxVol', preview?: () => void): HTMLElement => {
    const toggle = h('button.toggle', { 'aria-label': `${label} 켜기/끄기` });
    const slider = h('input.vol', { type: 'range', min: '0', max: '100', step: '5', 'aria-label': `${label} 볼륨` }) as HTMLInputElement;
    const pct = h('span.vol-pct');
    const sync = (): void => {
      const cur: AudioSettings = audio.settings;
      toggle.classList.toggle('on', cur[onKey]);
      toggle.textContent = cur[onKey] ? '켜짐' : '꺼짐';
      slider.value = String(Math.round(cur[volKey] * 100));
      slider.disabled = !cur[onKey];
      pct.textContent = `${Math.round(cur[volKey] * 100)}`;
    };
    toggle.addEventListener('click', () => {
      audio.update({ [onKey]: !audio.settings[onKey] });
      sync();
      preview?.();
    });
    slider.addEventListener('input', () => {
      audio.update({ [volKey]: Number(slider.value) / 100 });
      sync();
    });
    slider.addEventListener('change', () => preview?.());
    sync();
    return h('div.audio-row', {}, h('span.audio-label', {}, label), toggle, slider, pct);
  };

  overlay.append(h('div.panel.audio-panel', {},
    h('h2', {}, '{sound} 소리 설정'),
    row('{note} 배경음악', 'musicOn', 'musicVol'),
    row('{sound} 효과음', 'sfxOn', 'sfxVol', () => sfx.summon()),
    h('p.muted', {}, '설정은 이 기기에 저장돼요.'),
    h('button.btn.primary', { onclick: close }, '닫기'),
  ));
  host.append(overlay);
}

/** 현재 상태를 보여주는 아이콘 */
export function audioIcon(): string {
  const s = audio.settings;
  const on = (s.musicOn && s.musicVol > 0) || (s.sfxOn && s.sfxVol > 0);
  return on ? '{sound}' : '{mute}';
}
