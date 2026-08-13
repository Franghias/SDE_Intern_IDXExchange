import { describe, it, expect } from 'vitest';
import { formatDate, formatPrice, formatTime, parsePhotos } from '../utils/format';

describe('format utils', () => {
  describe('formatDate', () => {
    it('returns empty string when input is falsy', () => {
      expect(formatDate('')).toBe('');
      expect(formatDate(null)).toBe('');
    });

    it('formats YYYY-MM-DD date-only strings consistently in local timezone without UTC offset shift', () => {
      expect(formatDate('2024-08-01', 'en-US')).toBe('Thursday, Aug 1, 2024');
      expect(formatDate('2024-08-31', 'en-US')).toBe('Saturday, Aug 31, 2024');
    });

    it('returns original input if date string is invalid', () => {
      expect(formatDate('All')).toBe('All');
    });
  });

  describe('formatPrice', () => {
    it('formats numbers to USD currency', () => {
      expect(formatPrice(459900)).toBe('$459,900');
      expect(formatPrice(null)).toBe('N/A');
    });
  });

  describe('formatTime', () => {
    it('formats time string into AM/PM', () => {
      expect(formatTime('14:00:00')).toBe('2:00 PM');
      expect(formatTime('09:30:00')).toBe('9:30 AM');
    });
  });

  describe('parsePhotos', () => {
    it('parses valid JSON photo array', () => {
      expect(parsePhotos('["http://example.com/1.jpg"]')).toEqual(['http://example.com/1.jpg']);
      expect(parsePhotos('invalid')).toEqual([]);
    });

    it('filters out 404 error payloads and Media record not found messages', () => {
      const payload404 = JSON.stringify([
        'http://example.com/good.jpg',
        '{"code":"404","message":"Media record not found!"}'
      ]);
      expect(parsePhotos(payload404)).toEqual(['http://example.com/good.jpg']);
    });
  });
});
