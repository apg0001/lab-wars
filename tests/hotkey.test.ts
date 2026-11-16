import { describe, expect, it } from 'vitest';
import { keyOf } from '../src/ui/keys';

describe('keyOf', () => {
  it('한글 입력 상태에서도 물리 키로 판정한다', () => {
    expect(keyOf({ code: 'KeyQ', key: 'ㅂ' })).toBe('q');
    expect(keyOf({ code: 'KeyW', key: 'Process' })).toBe('w');
    expect(keyOf({ code: 'Digit3', key: '3' })).toBe('3');
    expect(keyOf({ code: 'Numpad5', key: '5' })).toBe('5');
    expect(keyOf({ code: 'Escape', key: 'Escape' })).toBe('escape');
    expect(keyOf({ code: 'ArrowLeft', key: 'ArrowLeft' })).toBe('arrowleft');
  });
});
