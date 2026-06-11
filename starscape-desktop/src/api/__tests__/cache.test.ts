import { describe, it, expect, beforeEach } from 'vitest';
import { cacheGet, cacheSet, CacheKeys } from '../cache';

describe('cache', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns null for a key that was never set', () => {
    expect(cacheGet('nonexistent')).toBeNull();
  });

  it('returns data immediately after cacheSet', () => {
    cacheSet('mykey', { value: 42 }, 60_000);
    expect(cacheGet('mykey')).toEqual({ value: 42 });
  });

  it('returns null after TTL has expired', () => {
    cacheSet('expiring', 'stale', -1); // negative TTL → already expired
    expect(cacheGet('expiring')).toBeNull();
  });

  it('removes the expired entry from localStorage on read', () => {
    cacheSet('expiring', 'stale', -1);
    cacheGet('expiring');
    expect(localStorage.getItem('starscape:expiring')).toBeNull();
  });

  it('two different keys do not interfere with each other', () => {
    cacheSet('a', 1, 60_000);
    cacheSet('b', 2, 60_000);
    expect(cacheGet('a')).toBe(1);
    expect(cacheGet('b')).toBe(2);
  });

  it('overwrites a key on second cacheSet', () => {
    cacheSet('k', 'first', 60_000);
    cacheSet('k', 'second', 60_000);
    expect(cacheGet('k')).toBe('second');
  });

  it('CacheKeys.planets produces a namespaced key', () => {
    const key = CacheKeys.planets('2026-06-11T12');
    expect(typeof key).toBe('string');
    expect(key).toContain('planets');
  });

  it('CacheKeys.skyConditions rounds lat/lon to 2 dp', () => {
    const key = CacheKeys.skyConditions(51.47892, 0.00153);
    expect(key).toBe('sky:51.48,0.00');
  });
});
