import { DateTime } from '../../types/date-time';

describe('DateTime', () => {
  it('should create from current time', () => {
    const dt = DateTime.now();
    expect(dt.toISO()).toBeDefined();
  });

  it('should create from ISO string', () => {
    const iso = '2024-01-15T10:00:00.000Z';
    const dt = DateTime.fromISO(iso);
    expect(dt.toISO()).toBe(iso);
  });

  it('should add days', () => {
    const dt = DateTime.fromISO('2024-01-01T00:00:00.000Z');
    const next = dt.addDays(5);
    expect(next.toISO()).toBe('2024-01-06T00:00:00.000Z');
  });

  it('should calculate diff in days', () => {
    const a = DateTime.fromISO('2024-01-10T00:00:00.000Z');
    const b = DateTime.fromISO('2024-01-01T00:00:00.000Z');
    expect(a.diffInDays(b)).toBe(9);
  });

  it('should be immutable on addDays', () => {
    const original = DateTime.fromISO('2024-01-01T00:00:00.000Z');
    original.addDays(10);
    expect(original.toISO()).toBe('2024-01-01T00:00:00.000Z');
  });

  it('should be equal for same time', () => {
    const a = DateTime.fromISO('2024-01-01T00:00:00.000Z');
    const b = DateTime.fromISO('2024-01-01T00:00:00.000Z');
    expect(a.equals(b)).toBe(true);
  });
});