import { describe, it, expect } from 'vitest';
import { SessionSchema, createSession } from '../../../src/schemas/session';

describe('Session Schema', () => {
  describe('SessionSchema.parse', () => {
    it('accepts valid session', () => {
      const validSession = {
        timestamp: '2025-12-06T10:00:00.000Z',
        cli_version: '1.0.0',
      };
      expect(() => SessionSchema.parse(validSession)).not.toThrow();
    });

    it('requires timestamp', () => {
      const missingTimestamp = {
        cli_version: '1.0.0',
      };
      expect(() => SessionSchema.parse(missingTimestamp)).toThrow();
    });

    it('requires cli_version', () => {
      const missingVersion = {
        timestamp: '2025-12-06T10:00:00.000Z',
      };
      expect(() => SessionSchema.parse(missingVersion)).toThrow();
    });

    it('validates timestamp format', () => {
      const invalidTimestamp = {
        timestamp: 'invalid-date',
        cli_version: '1.0.0',
      };
      expect(() => SessionSchema.parse(invalidTimestamp)).toThrow();

      const dateOnly = {
        timestamp: '2025-12-06',
        cli_version: '1.0.0',
      };
      expect(() => SessionSchema.parse(dateOnly)).toThrow();
    });

    it('accepts valid ISO datetime formats', () => {
      // Zod's datetime() only accepts specific ISO formats
      const formats = [
        '2025-12-06T10:00:00.000Z',
        '2025-12-06T10:00:00Z',
      ];

      for (const timestamp of formats) {
        expect(() =>
          SessionSchema.parse({ timestamp, cli_version: '1.0.0' })
        ).not.toThrow();
      }
    });

    it('accepts any version string', () => {
      const versions = ['1.0.0', '0.1.0-beta', '2.0.0-rc.1', 'dev'];

      for (const cli_version of versions) {
        expect(() =>
          SessionSchema.parse({
            timestamp: '2025-12-06T10:00:00.000Z',
            cli_version,
          })
        ).not.toThrow();
      }
    });
  });

  describe('createSession', () => {
    it('returns valid Session', () => {
      const session = createSession('1.0.0');
      expect(() => SessionSchema.parse(session)).not.toThrow();
    });

    it('sets cli_version correctly', () => {
      const session = createSession('2.0.0');
      expect(session.cli_version).toBe('2.0.0');
    });

    it('sets timestamp to current time', () => {
      const before = new Date().toISOString();
      const session = createSession('1.0.0');
      const after = new Date().toISOString();

      expect(session.timestamp).toBeDefined();
      expect(session.timestamp >= before).toBe(true);
      expect(session.timestamp <= after).toBe(true);
    });

    it('creates new session each time', () => {
      const session1 = createSession('1.0.0');
      const session2 = createSession('1.0.0');
      expect(session1).not.toBe(session2);
    });
  });
});
