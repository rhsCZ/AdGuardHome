import { describe, expect, it } from 'vitest';
import { validateIdentifier } from 'panel/helpers/validators';

describe('validateIdentifier', () => {
    it('returns required error for empty string', () => {
        const result = validateIdentifier('', [], 0);
        expect(result).toBeTruthy();
    });

    it('returns required error for whitespace-only string', () => {
        const result = validateIdentifier('   ', [], 0);
        expect(result).toBeTruthy();
    });

    it('returns undefined for valid IPv4', () => {
        const result = validateIdentifier('192.168.1.1', ['192.168.1.1'], 0);
        expect(result).toBeUndefined();
    });

    it('returns undefined for valid IPv6', () => {
        const result = validateIdentifier('::1', ['::1'], 0);
        expect(result).toBeUndefined();
    });

    it('returns undefined for valid MAC', () => {
        const result = validateIdentifier('aa:bb:cc:dd:ee:ff', ['aa:bb:cc:dd:ee:ff'], 0);
        expect(result).toBeUndefined();
    });

    it('returns undefined for valid CIDR', () => {
        const result = validateIdentifier('192.168.1.0/24', ['192.168.1.0/24'], 0);
        expect(result).toBeUndefined();
    });

    it('returns undefined for valid ClientID', () => {
        const result = validateIdentifier('my-client-01', ['my-client-01'], 0);
        expect(result).toBeUndefined();
    });

    it('returns format error for invalid identifier', () => {
        const result = validateIdentifier('not a valid id!!!', [], 0);
        expect(result).toBeTruthy();
    });

    it('returns duplicate error for repeated identifier', () => {
        const result = validateIdentifier('test-id', ['other-id', 'test-id'], 0);
        expect(result).toBeTruthy();
    });

    it('returns undefined for unique identifiers', () => {
        const result = validateIdentifier('test-id', ['other-id', 'another-id'], 0);
        expect(result).toBeUndefined();
    });
});
