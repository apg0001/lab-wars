/** 입력 언어와 무관한 키 이름: KeyQ → 'q', Digit1/Numpad1 → '1', Escape → 'escape' */
export function keyOf(e: Pick<KeyboardEvent, 'code' | 'key'>): string {
  const c = e.code ?? '';
  if (/^Key[A-Z]$/.test(c)) return c.slice(3).toLowerCase();
  if (/^(Digit|Numpad)[0-9]$/.test(c)) return c.slice(-1);
  return (c || e.key).toLowerCase();
}
