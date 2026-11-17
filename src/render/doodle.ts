/**
 * 손그림 낙서풍 아이콘. 캐릭터와 같은 진한 외곽선(INK)과 납작한 색으로 그린다.
 * 컬러 이모지 대신 HUD·버튼·캔버스 글자 안에서 같이 쓴다. 이미지 파일 없이 SVG 문자열로만 만든다.
 *
 * 글자 안에 `{coin}`처럼 쓰면 drawRich / richNodes가 그 자리에 아이콘을 그린다.
 */

const INK = '#2b2430';

const P: Record<string, string> = {
  coffee: '<path d="M7 13h15v9a5 5 0 0 1-5 5h-5a5 5 0 0 1-5-5z" fill="#fff"/><path d="M9 15.5h11" stroke="#8d5a3b" stroke-width="3"/><path d="M22 15h2a3 3 0 0 1 0 6h-2"/><path d="M11 9c0-2 2-2 2-4M16.5 9c0-2 2-2 2-4" stroke="#9e9e9e"/>',
  brain: '<path d="M10 26c-4 0-6-3-5-6-2-2-1-6 2-7 0-4 4-6 7-4 2-2 6-2 8 0 3-1 6 1 6 4 2 1 3 5 0 7 1 3-2 6-5 6-1 2-4 2-6 0-2 2-5 2-7 0z" fill="#f8bbd0"/><path d="M16 9v16M10.5 14c2 0 3 1 3 3M21.5 14c-2 0-3 1-3 3M11 21c1.5 0 2.5-1 2.5-2M21 21c-1.5 0-2.5-1-2.5-2" stroke-width="1.8"/>',
  coin: '<circle cx="16" cy="16" r="11" fill="#ffd54f"/><circle cx="16" cy="16" r="7.5" stroke="#c49000" stroke-width="1.5"/><path d="M11.5 12.5l2 7 2.5-5 2.5 5 2-7M11 15.5h10" stroke-width="1.8"/>',
  lab: '<rect x="6" y="9" width="20" height="18" rx="1.5" fill="#90caf9"/><rect x="10" y="4.5" width="9" height="5" fill="#fff"/><rect x="9" y="13" width="7" height="5" fill="#4dd0e1"/><rect x="18" y="18" width="5" height="9" fill="#5c6bc0"/>',
  prof: '<circle cx="16" cy="15" r="10" fill="#ffe0c2"/><path d="M7 13c0-4 2-6 4-7M25 13c0-4-2-6-4-7" stroke="#9e9e9e" stroke-width="3"/><circle cx="12" cy="14" r="2.6" fill="#fff"/><circle cx="20" cy="14" r="2.6" fill="#fff"/><path d="M14.6 14h2.8M9 9.5l5 2.5M23 9.5l-5 2.5"/><path d="M11 20.5c2-1.5 8-1.5 10 0" stroke="#5d4037" stroke-width="3"/>',
  lock: '<rect x="7" y="14" width="18" height="13" rx="2.5" fill="#ffca28"/><path d="M11 14v-3a5 5 0 0 1 10 0v3"/><circle cx="16" cy="20" r="1.6" fill="#2b2430"/>',
  star: '<path d="M16 4l3.5 7.5 8 1-6 5.5 1.7 8L16 22l-7.2 4 1.7-8-6-5.5 8-1z" fill="#ffd54f"/>',
  starOff: '<path d="M16 4l3.5 7.5 8 1-6 5.5 1.7 8L16 22l-7.2 4 1.7-8-6-5.5 8-1z" fill="#eceff1" stroke="#b0bec5"/>',
  heart: '<path d="M16 27S5 20 5 12a5.5 5.5 0 0 1 11-1 5.5 5.5 0 0 1 11 1c0 8-11 15-11 15z" fill="#ef5350"/>',
  sword: '<path d="M25 4l3 3-13 13-3-3z" fill="#cfd8dc"/><path d="M9.5 16.5l6 6"/><path d="M12 19.5l-6 6" stroke="#8d6e63" stroke-width="3.4"/>',
  target: '<circle cx="16" cy="16" r="11" fill="#fff"/><circle cx="16" cy="16" r="7" fill="#ef5350"/><circle cx="16" cy="16" r="3" fill="#fff"/>',
  boot: '<path d="M10 5h7v12l8 3c2 1 2.5 3 2.5 5v2H6l1-10z" fill="#8d6e63"/><path d="M6 23h21.5"/>',
  clock: '<circle cx="16" cy="16" r="11" fill="#fff"/><path d="M16 9v7l5 3"/>',
  snack: '<path d="M19 4c5 0 9 4 9 9 0 6-6 9-11 7l-5 5a3 3 0 1 1-4-1 3 3 0 1 1-1-4l5-5c-2-5 1-11 7-11z" fill="#d7893f"/><path d="M20 8c2 0 4 2 4 4" stroke="#fff3e0" stroke-width="1.8"/>',
  moon: '<path d="M20 5a11 11 0 1 0 8 15A9 9 0 0 1 20 5z" fill="#ffe082"/><path d="M8 5l1 2.2 2.2 1-2.2 1L8 11.4l-1-2.2-2.2-1 2.2-1z" fill="#fff59d" stroke-width="1.4"/>',
  snow: '<circle cx="16" cy="16" r="12" fill="#e1f5fe"/><path d="M16 6v20M7.3 11l17.4 10M7.3 21l17.4-10M13 7.5l3 2.5 3-2.5M13 24.5l3-2.5 3 2.5" stroke="#0277bd"/>',
  books: '<rect x="5" y="20" width="22" height="6" rx="1" fill="#ef5350"/><rect x="7" y="14" width="19" height="6" rx="1" fill="#42a5f5"/><rect x="6" y="8" width="18" height="6" rx="1" fill="#66bb6a"/><path d="M10 4l9 2" stroke="#ff9800" stroke-width="2.6"/>',
  remodel: '<rect x="4" y="18" width="13" height="9" fill="#e57373"/><path d="M4 22.5h13M10.5 18v4.5M7 22.5V27M14 22.5V27" stroke-width="1.5"/><path d="M21 13l6 13" stroke="#8d6e63" stroke-width="3.4"/><path d="M14 9l10-4 2 5-10 4z" fill="#90a4ae"/>',
  coffeeMachine: '<rect x="7" y="4" width="18" height="24" rx="2" fill="#78909c"/><rect x="10" y="7" width="12" height="5" fill="#4dd0e1"/><path d="M14 14h4v3h-4z" fill="#37474f"/><path d="M12 20h8v5h-8z" fill="#fff"/>',
  tumbler: '<path d="M9 9h14l-2 18H11z" fill="#4fc3f7"/><path d="M8 9h16" stroke-width="3"/><path d="M18 9l4-6" stroke="#ef5350" stroke-width="2.6"/><path d="M11.5 15h9" stroke="#fff" stroke-width="1.6"/>',
  meditate: '<path d="M16 6c4 4 4 10 0 15-4-5-4-11 0-15z" fill="#f48fb1"/><path d="M16 21c-5 0-9-3-11-8 5 0 9 3 11 8zM16 21c5 0 9-3 11-8-5 0-9 3-11 8z" fill="#f8bbd0"/><path d="M6 26h20" stroke="#66bb6a"/>',
  planner: '<rect x="5" y="7" width="22" height="20" rx="2" fill="#fff"/><path d="M5 9a2 2 0 0 1 2-2h18a2 2 0 0 1 2 2v4H5z" fill="#ef5350"/><path d="M10 4v5M22 4v5"/><path d="M11 19l3 3 6-6" stroke="#43a047" stroke-width="2.6"/>',
  printer: '<rect x="5" y="12" width="22" height="11" rx="2" fill="#cfd8dc"/><rect x="9" y="5" width="14" height="7" fill="#fff"/><rect x="9" y="19" width="14" height="9" fill="#fff"/><path d="M12 23.5h8" stroke-width="1.5"/><circle cx="23" cy="16" r="1.4" fill="#43a047" stroke="none"/>',
  ruler: '<path d="M3 21L23 9.5l4.5 7.8-20 11.5z" fill="#ffd54f"/><path d="M8 18.4l1.5 2.6M12 16.1l1 1.7M16 13.8l1.5 2.6M20 11.5l1 1.7" stroke-width="1.6"/>',
  beach: '<path d="M5 15a11 9 0 0 1 22 0z" fill="#ff8a65"/><path d="M12 15a4 9 0 0 1 8 0z" fill="#fff"/><path d="M16 15v11"/><path d="M4 27h24" stroke="#ffcc80" stroke-width="3"/>',
  mic: '<rect x="11" y="4" width="10" height="15" rx="5" fill="#90a4ae"/><path d="M11 9h4M11 13h4" stroke-width="1.4"/><path d="M7 15a9 9 0 0 0 18 0M16 24v4M11 28h10"/>',
  paper: '<path d="M7 4h11l6 6v18H7z" fill="#fff"/><path d="M18 4v6h6"/><path d="M10 15h9M10 19h9M10 23h5" stroke-width="1.6"/><path d="M21 19l6-6 2.5 2.5-6 6-3.5 1z" fill="#ef5350" stroke-width="1.6"/>',
  flask: '<path d="M14 4v8L7 25a2 2 0 0 0 2 3h14a2 2 0 0 0 2-3l-7-13V4z" fill="#e3f2fd"/><path d="M10 20.5h12l2.5 4.5a1 1 0 0 1-1 1.5H8.5a1 1 0 0 1-1-1.5z" fill="#81c784" stroke="none"/><path d="M12 4h8"/><path d="M14 4v8L7 25a2 2 0 0 0 2 3h14a2 2 0 0 0 2-3l-7-13V4"/>',
  book: '<path d="M4 7c4-2 8-2 12 1v19c-4-3-8-3-12-1z" fill="#fff59d"/><path d="M28 7c-4-2-8-2-12 1v19c4-3 8-3 12-1z" fill="#fff"/>',
  scroll: '<rect x="8" y="6" width="18" height="20" rx="2" fill="#ffe0b2"/><path d="M6 8a2 2 0 0 1 4 0v18a2 2 0 0 1-4 0z" fill="#ffcc80"/><path d="M13 12h9M13 16h9M13 20h6" stroke-width="1.7"/>',
  trophy: '<path d="M11 27h10l-1-5h-8z" fill="#ffb300"/><path d="M10 5h12v6a6 6 0 0 1-12 0z" fill="#ffd54f"/><path d="M10 7H6c0 4 2 6 4 6M22 7h4c0 4-2 6-4 6M16 17v5"/>',
  sound: '<path d="M5 12h5l7-6v20l-7-6H5z" fill="#fff"/><path d="M21 11c2 2 2 8 0 10M24.5 8c4 4 4 12 0 16"/>',
  mute: '<path d="M5 12h5l7-6v20l-7-6H5z" fill="#fff"/><path d="M21 12l7 8M28 12l-7 8" stroke="#e53935"/>',
  sweat: '<path d="M12 5c-3 5-5 8-5 11a5 5 0 0 0 10 0c0-3-2-6-5-11z" fill="#4fc3f7"/><path d="M23 13c-2 3-3 5-3 6.5a3 3 0 0 0 6 0c0-1.5-1-3.5-3-6.5z" fill="#81d4fa"/>',
  anger: '<path d="M8 13c3 0 5-2 5-5M24 13c-3 0-5-2-5-5M8 19c3 0 5 2 5 5M24 19c-3 0-5 2-5 5" stroke="#e53935" stroke-width="3.4"/>',
  note: '<path d="M12 23V7l13-3v15" stroke-width="2.6"/><ellipse cx="8.5" cy="23" rx="4" ry="3" fill="#2b2430"/><ellipse cx="21.5" cy="19" rx="4" ry="3" fill="#2b2430"/>',
  alarm: '<path d="M9 22v-7a7 7 0 0 1 14 0v7z" fill="#ef5350"/><path d="M13 14a3 3 0 0 1 3-3" stroke="#fff" stroke-width="1.6"/><rect x="6" y="22" width="20" height="5" rx="1" fill="#90a4ae"/><path d="M16 2.5v3M5 8l2 2M27 8l-2 2"/>',
  megaphone: '<path d="M5 13h5l12-6v18l-12-6H5z" fill="#ffca28"/><path d="M8 19l2 7h3l-1-6"/><path d="M26 13.5v5"/>',
  warn: '<path d="M16 4l13 23H3z" fill="#ffd54f"/><path d="M16 12v7"/><circle cx="16" cy="23" r="1.3" fill="#2b2430"/>',
  clipboard: '<rect x="7" y="6" width="18" height="22" rx="2" fill="#fff"/><rect x="12" y="3" width="8" height="5" rx="1.5" fill="#90a4ae"/><path d="M11 14l2 2 3-3M11 21l2 2 3-3M18.5 15h4M18.5 22h4" stroke-width="1.6"/>',
  dizzy: '<circle cx="16" cy="17" r="11" fill="#b0bec5"/><path d="M10 14l3 3M13 14l-3 3M19 14l3 3M22 14l-3 3M12 23c2-1.5 6-1.5 8 0"/>',
  candle: '<rect x="12" y="13" width="8" height="14" rx="1" fill="#fff8e1"/><path d="M16 13v-2"/><path d="M16 3.5c3 3 3 6 0 7-3-1-3-4 0-7z" fill="#ffb74d"/>',
  rain: '<path d="M9 18a5 5 0 0 1 1-10 7 7 0 0 1 13 2 4 4 0 0 1 0 8z" fill="#b0bec5"/><path d="M11 22l-1 4M17 22l-1 4M23 22l-1 4" stroke="#4fc3f7"/>',
  sparkle: '<path d="M16 3l3 10 10 3-10 3-3 10-3-10-10-3 10-3z" fill="#fff176"/>',
  swords: '<path d="M6 4l13 13M26 4L13 17" stroke="#90a4ae" stroke-width="3.4"/><path d="M6 4l13 13M26 4L13 17"/><path d="M8 22l6-6M24 22l-6-6"/><path d="M6 27l4-4M26 27l-4-4" stroke="#8d6e63" stroke-width="3.4"/>',
  medal1: '<path d="M10 3l4 9M22 3l-4 9" stroke="#e53935" stroke-width="3"/><circle cx="16" cy="20" r="8" fill="#ffd54f"/><path d="M15 17l2-1v8" stroke-width="2"/>',
  medal2: '<path d="M10 3l4 9M22 3l-4 9" stroke="#1e88e5" stroke-width="3"/><circle cx="16" cy="20" r="8" fill="#cfd8dc"/><path d="M13.5 17.5a2.5 2.5 0 1 1 4 2l-4 4h5" stroke-width="2"/>',
  medal3: '<path d="M10 3l4 9M22 3l-4 9" stroke="#43a047" stroke-width="3"/><circle cx="16" cy="20" r="8" fill="#d7a26b"/><path d="M13.5 17h4l-2 2.5a2.3 2.3 0 1 1-2 3" stroke-width="2"/>',
  cloud: '<path d="M9 25a6 6 0 0 1-1-12 8 8 0 0 1 15-2 6 6 0 0 1 1 14z" fill="#e3f2fd"/><path d="M12 19l3 3 6-6" stroke="#43a047" stroke-width="2.4"/>',
  hourglass: '<path d="M8 4h16M8 28h16M10 4c0 7 12 7 12 12S10 21 10 28M22 4c0 7-12 7-12 12s12 5 12 12"/><path d="M12 25c1-2 7-2 8 0z" fill="#ffca28"/>',
  phone: '<rect x="9" y="3" width="14" height="26" rx="3" fill="#90caf9"/><rect x="11.5" y="7" width="9" height="15" fill="#e3f2fd" stroke-width="1.4"/><circle cx="16" cy="25.5" r="1" fill="#2b2430"/>',
  offline: '<rect x="9" y="3" width="14" height="26" rx="3" fill="#cfd8dc"/><path d="M5 5l22 22" stroke="#e53935" stroke-width="2.6"/>',
  user: '<circle cx="16" cy="11" r="6" fill="#ffe0c2"/><path d="M5 28c0-7 5-10 11-10s11 3 11 10z" fill="#7cc4ff"/>',
  key: '<circle cx="11" cy="16" r="6" fill="#ffd54f"/><circle cx="11" cy="16" r="2" fill="#fff"/><path d="M17 16h11M24 16v4M28 16v3"/>',
  check: '<circle cx="16" cy="16" r="12" fill="#a5d6a7"/><path d="M10 16l4 4 8-8" stroke-width="2.8"/>',
  cap: '<path d="M2 12l14-6 14 6-14 6z" fill="#37474f"/><path d="M8 15v6c4 4 12 4 16 0v-6" fill="#455a64"/><path d="M27 13v8" stroke="#ffd54f" stroke-width="2.4"/><circle cx="27" cy="22.5" r="1.8" fill="#ffd54f"/>',
  infinity: '<path d="M16 16c-3-4-5-6-8-6a6 6 0 0 0 0 12c3 0 5-2 8-6s5-6 8-6a6 6 0 0 1 0 12c-3 0-5-2-8-6z" stroke="#7e57c2" stroke-width="3"/>',
  redbook: '<rect x="7" y="4" width="18" height="24" rx="2" fill="#c62828"/><path d="M10 4v24" stroke="#8e0000" stroke-width="2"/><path d="M14 10h7M14 14h5" stroke="#ffcdd2" stroke-width="1.6"/>',
  retry: '<path d="M25 12a10 10 0 1 0 1 7" stroke-width="2.8"/><path d="M26 5v8h-8" fill="none" stroke-width="2.8"/>',
  party: '<path d="M4 28l6-17 11 11z" fill="#ffca28"/><path d="M8 18l6 6M6.5 23l3 3" stroke="#ef5350" stroke-width="1.8"/><path d="M18 9c1-3 4-3 5-6M22 13c3-1 5 1 7-1M15 6l1-3" stroke="#42a5f5"/><circle cx="26" cy="7" r="1.6" fill="#ef5350"/>',
  ghost: '<path d="M7 28V14a9 9 0 0 1 18 0v14l-3-3-3 3-3-3-3 3-3-3z" fill="#eceff1"/><circle cx="12.5" cy="15" r="2" fill="#3949ab" stroke="none"/><circle cx="19.5" cy="15" r="2" fill="#3949ab" stroke="none"/>',
  tie: '<path d="M12 3h8l-2 5h-4z" fill="#c62828"/><path d="M14 8h4l3 15-5 6-5-6z" fill="#e53935"/>',
  map: '<path d="M4 8l8-3 8 3 8-3v19l-8 3-8-3-8 3z" fill="#fff8e1"/><path d="M12 5v19M20 8v19"/><path d="M15 15l3 3M18 15l-3 3" stroke="#e53935" stroke-width="2"/>',
  robot: '<rect x="7" y="10" width="18" height="15" rx="4" fill="#b2ebf2"/><circle cx="12.5" cy="17" r="2" fill="#2b2430"/><circle cx="19.5" cy="17" r="2" fill="#2b2430"/><path d="M16 10V5M4 17v4M28 17v4"/><circle cx="16" cy="4.5" r="1.6" fill="#ef5350"/>',
  student: '<circle cx="16" cy="14" r="7" fill="#ffe0c2"/><path d="M2 8l14-5 14 5-14 5z" fill="#37474f"/><path d="M6 29c0-6 4-8 10-8s10 2 10 8z" fill="#7cc4ff"/><circle cx="13" cy="15" r="1.2" fill="#2b2430"/><circle cx="19" cy="15" r="1.2" fill="#2b2430"/>',
  pause: '<rect x="8" y="6" width="5.5" height="20" rx="1.5" fill="#fff"/><rect x="18.5" y="6" width="5.5" height="20" rx="1.5" fill="#fff"/>',
  fullscreen: '<path d="M5 12V5h7M27 12V5h-7M5 20v7h7M27 20v7h-7" stroke-width="2.8"/>',
  pencil: '<path d="M21 5l6 6-14 14-7 1 1-7z" fill="#ffd54f"/><path d="M18 8l6 6"/><path d="M7 19l6 6" stroke-width="1.6"/><path d="M21 5l6 6 1.5-1.5a2 2 0 0 0 0-3L26.5 4.5a2 2 0 0 0-3 0z" fill="#f48fb1"/>',
  hanger: '<path d="M16 9a3 3 0 1 1 3-3"/><path d="M16 9v3L4 21a2 2 0 0 0 1 3.5h22A2 2 0 0 0 28 21L16 12" fill="#fff"/><path d="M8 24.5h16" stroke="#ef5350" stroke-width="1.6"/>',
  stamp: '<path d="M12 4h8v8l3 4H9l3-4z" fill="#8d6e63"/><rect x="5" y="16" width="22" height="6" rx="1.5" fill="#ef5350"/><path d="M6 27h20" stroke="#ef5350" stroke-width="3"/>',
  crown: '<path d="M5 24l-1-14 7 6 5-9 5 9 7-6-1 14z" fill="#ffd54f"/><circle cx="16" cy="19" r="2" fill="#e53935" stroke-width="1.6"/><path d="M5 24h22"/>',
  meeting: '<rect x="8" y="4" width="16" height="24" rx="1.5" fill="#a1887f"/><circle cx="20.5" cy="17" r="1.3" fill="#2b2430" stroke="none"/><path d="M12 8l4-3 4 3"/><rect x="5" y="9" width="22" height="7" rx="1.5" fill="#fff59d"/><path d="M8.5 12.5h4M15 12.5h2M19.5 12.5h4" stroke="#e53935" stroke-width="1.8"/>',
  envelope: '<rect x="3" y="7" width="26" height="18" rx="2" fill="#fff8e1"/><path d="M4 9l12 9 12-9"/><path d="M4 24l8.5-7.5M28 24l-8.5-7.5" stroke-width="1.6"/><circle cx="16" cy="17.5" r="3.6" fill="#e53935"/><path d="M14.6 17.5h2.8" stroke="#ffcdd2" stroke-width="1.4"/>',
  mail: '<rect x="4" y="8" width="24" height="17" rx="2" fill="#fff"/><path d="M5 10l11 8 11-8"/><circle cx="25" cy="8" r="4" fill="#ef5350" stroke-width="1.8"/>',
  fire: '<path d="M16 28c-6 0-9-4-9-9 0-5 4-7 5-12 2 3 3 5 3 7 1-2 3-4 3-8 5 4 8 8 8 13 0 5-4 9-10 9z" fill="#ff7043"/><path d="M16 27c-3 0-4-2-4-4 0-3 3-4 4-7 2 3 4 4 4 7 0 2-2 4-4 4z" fill="#ffd54f" stroke-width="1.6"/>',
  snail: '<path d="M4 25h20c3 0 4-2 4-4" fill="none"/><circle cx="14" cy="17" r="7.5" fill="#81d4fa"/><path d="M14 17m-3 0a3 3 0 1 1 3 3" stroke-width="1.8"/><path d="M24 21v-7M27 21v-6" stroke-width="1.8"/>',
  guard: '<path d="M16 4l10 4v7c0 7-5 11-10 13-5-2-10-6-10-13V8z" fill="#4dd0e1"/><path d="M11 16l4 4 6-8" stroke-width="2.6"/>',
  ticket: '<path d="M4 9h24v4a3 3 0 0 0 0 6v4H4v-4a3 3 0 0 0 0-6z" fill="#ffca28"/><path d="M20 10v12" stroke-dasharray="2 2.4" stroke-width="1.6"/><path d="M9 14h7M9 18h5" stroke-width="1.8"/>',
  crate: '<path d="M4 11l12-5 12 5v13l-12 5-12-5z" fill="#bcaaa4"/><path d="M4 11l12 5 12-5M16 16v13" /><path d="M10 8.5l12 5v4" stroke-width="1.8"/>',
  chip: '<rect x="8" y="8" width="16" height="16" rx="2" fill="#455a64"/><rect x="12" y="12" width="8" height="8" fill="#80d8ff" stroke-width="1.6"/><path d="M12 4v4M16 4v4M20 4v4M12 24v4M16 24v4M20 24v4M4 12h4M4 16h4M4 20h4M24 12h4M24 16h4M24 20h4" stroke-width="1.8"/>',
  bolt: '<path d="M18 3L7 18h7l-2 11 11-15h-7z" fill="#ffeb3b"/>',
};

export type IconName = keyof typeof P;
export const ICON_NAMES = Object.keys(P);

export function iconSvg(name: string): string {
  const body = P[name] ?? P.sparkle!;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none" stroke="${INK}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
}

/** DOM 아이콘 (글자 크기에 맞춘다) */
export function iconEl(name: string, cls = ''): HTMLElement {
  const s = document.createElement('span');
  s.className = `ico${cls ? ` ${cls}` : ''}`;
  s.setAttribute('aria-hidden', 'true');
  s.innerHTML = iconSvg(name);
  return s;
}

const TOKEN = /\{([a-zA-Z0-9]+)\}/g;

/** '{coin} 120'처럼 토큰이 섞인 글을 글자·아이콘 노드로 바꾼다. */
export function richNodes(text: string): (string | HTMLElement)[] {
  const out: (string | HTMLElement)[] = [];
  let last = 0;
  for (const m of text.matchAll(TOKEN)) {
    if (m.index! > last) out.push(text.slice(last, m.index));
    out.push(P[m[1]!] ? iconEl(m[1]!) : m[0]);
    last = m.index! + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

/** 토큰을 지운 순수 글 (접근성·제목용) */
export const plainText = (text: string): string => text.replace(TOKEN, '').replace(/\s+/g, ' ').trim();

// ───────────── 캔버스 ─────────────

const imgCache = new Map<string, HTMLImageElement>();

/** 캔버스용 아이콘 이미지 (처음엔 로딩 중이라 그리지 않는다) */
export function iconImg(name: string): HTMLImageElement | null {
  if (typeof Image === 'undefined') return null;
  let img = imgCache.get(name);
  if (!img) {
    img = new Image();
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(iconSvg(name))}`;
    imgCache.set(name, img);
  }
  return img.complete && img.naturalWidth ? img : null;
}

/** 자주 쓰는 아이콘을 미리 불러 둔다 */
export function preloadIcons(): void {
  for (const n of ICON_NAMES) iconImg(n);
}

/**
 * 토큰 섞인 글을 캔버스에 가운데 정렬로 그린다. 글씨는 외곽선(stroke) 후 채우기.
 * ctx.font는 미리 정해 둔다.
 */
export function drawRich(ctx: CanvasRenderingContext2D, text: string, cx: number, y: number, size: number, fill: string, strokeW: number): void {
  const parts: { t?: string; icon?: string; w: number }[] = [];
  let last = 0;
  const gap = size * 0.12;
  for (const m of text.matchAll(TOKEN)) {
    if (m.index! > last) {
      const t = text.slice(last, m.index);
      parts.push({ t, w: ctx.measureText(t).width });
    }
    parts.push({ icon: m[1]!, w: size * 1.1 + gap * 2 });
    last = m.index! + m[0].length;
  }
  if (last < text.length) {
    const t = text.slice(last);
    parts.push({ t, w: ctx.measureText(t).width });
  }
  const total = parts.reduce((s, p) => s + p.w, 0);
  let x = cx - total / 2;
  ctx.save();
  ctx.textAlign = 'left';
  for (const p of parts) {
    if (p.t !== undefined) {
      if (strokeW > 0) {
        ctx.lineWidth = strokeW;
        ctx.strokeStyle = INK;
        ctx.strokeText(p.t, x, y);
      }
      ctx.fillStyle = fill;
      ctx.fillText(p.t, x, y);
    } else {
      const img = iconImg(p.icon!);
      const s = size * 1.1;
      if (img) ctx.drawImage(img, x + gap, y - s * 0.82, s, s);
    }
    x += p.w;
  }
  ctx.restore();
}
