import { describe, expect, it } from 'vitest';
import { formatFileSize } from './formatFileSize';

describe('formatFileSize', () => {
  it('formats bytes correctly', () => {
    expect(formatFileSize(0)).toBe('0 B');
    expect(formatFileSize(500)).toBe('500 B');
  });

  it('formats kilobytes correctly', () => {
    expect(formatFileSize(1024)).toBe('1.0 KB');
  });

  it('formats megabytes correctly', () => {
    expect(formatFileSize(1048576)).toBe('1.0 MB');
  });

  it('formats larger files correctly', () => {
    expect(formatFileSize(10485760)).toBe('10.0 MB');
  });

  it('rejects negative values', () => {
    expect(() => formatFileSize(-1)).toThrow(RangeError);
  });

  it('rejects non-finite values', () => {
    expect(() => formatFileSize(Number.NaN)).toThrow(RangeError);
    expect(() => formatFileSize(Infinity)).toThrow(RangeError);
  });
});
