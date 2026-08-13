import { describe, it, expect, vi, afterEach } from 'vitest';
import { createRateLimiter, clientIp } from '../rateLimit';

describe('createRateLimiter', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('allows up to the limit within a window, then rejects', () => {
    const limiter = createRateLimiter(3, 60_000);
    expect(limiter.allow('ip-1')).toBe(true);
    expect(limiter.allow('ip-1')).toBe(true);
    expect(limiter.allow('ip-1')).toBe(true);
    expect(limiter.allow('ip-1')).toBe(false);
    // Other keys are unaffected
    expect(limiter.allow('ip-2')).toBe(true);
  });

  it('resets after the window elapses', () => {
    vi.useFakeTimers();
    const limiter = createRateLimiter(1, 60_000);
    expect(limiter.allow('k')).toBe(true);
    expect(limiter.allow('k')).toBe(false);
    vi.advanceTimersByTime(60_001);
    expect(limiter.allow('k')).toBe(true);
  });

  it('prunes expired buckets so memory stays bounded', () => {
    vi.useFakeTimers();
    const limiter = createRateLimiter(5, 10_000, 2);
    limiter.allow('a');
    limiter.allow('b');
    vi.advanceTimersByTime(10_001);
    // Third key forces a prune pass; first two buckets are expired.
    limiter.allow('c');
    expect(limiter.allow('a')).toBe(true);
  });

  it('rejects immediately once the last entry is a fresh bucket', () => {
    const limiter = createRateLimiter(1, 60_000);
    limiter.allow('only');
    expect(limiter.allow('only')).toBe(false);
  });
});

describe('clientIp', () => {
  it('uses x-forwarded-for when present', () => {
    expect(clientIp({ headers: { 'x-forwarded-for': '1.2.3.4, 10.0.0.1' }, ip: '10.0.0.1' })).toBe('1.2.3.4');
  });

  it('falls back to req.ip then socket remoteAddress', () => {
    expect(clientIp({ headers: {}, ip: '203.0.113.9' })).toBe('203.0.113.9');
    expect(clientIp({ headers: {}, socket: { remoteAddress: '::ffff:127.0.0.1' } })).toBe('127.0.0.1');
    expect(clientIp({ headers: {} })).toBe('unknown');
  });
});