import { describe, it, expect, vi } from 'vitest';

vi.mock('panel/common/intl', () => ({
    default: {
        getMessage: vi.fn((key: string, values?: Record<string, string | number>) => {
            if (key === 'form_error_format_line') {
                return `Invalid format on line ${values?.line}`;
            }
            if (key === 'form_error_format_lines') {
                return `Invalid format on lines ${values?.lines}`;
            }
            if (key === 'form_error_format') {
                return 'Invalid format';
            }
            return key;
        }),
    },
}));

import { validateDomainsPerLine } from 'panel/helpers/validators';

describe('validateDomainsPerLine', () => {
    it('returns undefined for empty string', () => {
        expect(validateDomainsPerLine('')).toBeUndefined();
    });

    it('returns undefined for plain domain', () => {
        expect(validateDomainsPerLine('example.org')).toBeUndefined();
    });

    it('returns undefined for wildcard domain', () => {
        expect(validateDomainsPerLine('*.example.org')).toBeUndefined();
    });

    it('returns undefined for AdGuard URL filter rule', () => {
        expect(validateDomainsPerLine('||example.org^')).toBeUndefined();
    });

    it('returns undefined for regex pattern', () => {
        expect(validateDomainsPerLine('/regex.pattern/')).toBeUndefined();
    });

    it('returns undefined for comment line', () => {
        expect(validateDomainsPerLine('# this is a comment')).toBeUndefined();
    });

    it('returns undefined for mixed valid lines with comments', () => {
        expect(
            validateDomainsPerLine('# comment\nexample.org\n||ads.example.org^'),
        ).toBeUndefined();
    });

    it('returns "Invalid format" for entry without dot', () => {
        expect(validateDomainsPerLine('notadomain')).toBe('Invalid format');
    });

    it('returns "Invalid format on line N" when specific line has no dot', () => {
        expect(validateDomainsPerLine('example.org\nnodot')).toBe('Invalid format on line 2');
    });

    it('returns "Invalid format on lines N, M" when multiple lines invalid', () => {
        expect(validateDomainsPerLine('nodot1\nexample.org\nnodot2')).toBe(
            'Invalid format on lines 1, 3',
        );
    });
});
