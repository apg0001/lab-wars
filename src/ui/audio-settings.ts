import { audio, type AudioSettings } from '../audio/engine';
import { sfx } from '../audio/sfx';
import { h } from './dom';
import { getLang, setLang, tr, type Lang } from '../i18n';

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
    const toggle = h('button.toggle', { 'aria-label': tr(`${label} 켜기/끄기`, `${label} on/off`) });
    const slider = h('input.vol', { type: 'range', min: '0', max: '100', step: '5', 'aria-label': tr(`${label} 볼륨`, `${label} volume`) }) as HTMLInputElement;
    const pct = h('span.vol-pct');
    const sync = (): void => {
      const cur: AudioSettings = audio.settings;
      toggle.classList.toggle('on', cur[onKey]);
      toggle.textContent = cur[onKey] ? tr('켜짐', 'On') : tr('꺼짐', 'Off');
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

  /** 언어: 바꾸면 화면이 새 언어로 다시 그려지고, 이 창도 새 화면 위에 다시 연다 */
  const langRow = (): HTMLElement => {
    const pick = (l: Lang): HTMLElement => h(`button.btn.small${getLang() === l ? '.primary' : ''}`, {
      onclick: () => {
        if (getLang() === l) return;
        setLang(l);
        const next = overlay.isConnected ? host : document.querySelector('.stage > .screen');
        overlay.remove();
        showAudioSettings(next, onClose);
      },
    }, l === 'ko' ? '한국어' : 'English');
    return h('div.audio-row.lang-row', {}, h('span.audio-label', {}, tr('{book} 언어', '{book} Language')), h('div.lang-pick', {}, pick('ko'), pick('en')));
  };

  overlay.append(h('div.panel.audio-panel', {},
    h('h2', {}, tr('{sound} 설정', '{sound} Settings')),
    row(tr('{note} 배경음악', '{note} Music'), 'musicOn', 'musicVol'),
    row(tr('{sound} 효과음', '{sound} Sound FX'), 'sfxOn', 'sfxVol', () => sfx.summon()),
    langRow(),
    h('p.muted', {}, tr('설정은 이 기기에 저장돼요.', 'Settings are saved on this device.')),
    h('button.btn.primary', { onclick: close }, tr('닫기', 'Close')),
  ));
  host.append(overlay);
}

/** 현재 상태를 보여주는 아이콘 */
export function audioIcon(): string {
  const s = audio.settings;
  const on = (s.musicOn && s.musicVol > 0) || (s.sfxOn && s.sfxVol > 0);
  return on ? '{sound}' : '{mute}';
}
