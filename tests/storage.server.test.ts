// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { createStorage } from '@/storage';
import { number } from '@/values';

describe('storage on the server', () => {
  it('reads defaults and ignores writes, so values never leak between requests', () => {
    const local = createStorage('local', { count: number(0) });
    local.setItem('count', 5);
    expect(local.getItem('count')).toBe(0);
    // A second store (e.g. another request) sees nothing either
    expect(createStorage('local', { count: number(0) }).getItem('count')).toBe(0);
  });
});
