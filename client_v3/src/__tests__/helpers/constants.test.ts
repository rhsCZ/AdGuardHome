import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('panel/common/intl', () => ({
    default: { getMessage: vi.fn((key: string) => key) },
}));

import { getUpstreamModeOptions, DNS_REQUEST_OPTIONS } from 'panel/helpers/constants';

describe('getUpstreamModeOptions', () => {
    beforeEach(() => vi.clearAllMocks());

    it('returns exactly 3 options (FR-003)', () => {
        const options = getUpstreamModeOptions();
        expect(options).toHaveLength(3);
    });

    it('returns LOAD_BALANCING, PARALLEL, FASTEST_ADDR values (FR-003)', () => {
        const options = getUpstreamModeOptions();
        expect(options[0].value).toBe(DNS_REQUEST_OPTIONS.LOAD_BALANCING);
        expect(options[1].value).toBe(DNS_REQUEST_OPTIONS.PARALLEL);
        expect(options[2].value).toBe(DNS_REQUEST_OPTIONS.FASTEST_ADDR);
    });

    it('returns i18n-correct text (factory re-executes getMessage)', () => {
        const options = getUpstreamModeOptions();
        expect(options[0].text).toBe('upstream_dns_load_balancing');
        expect(options[1].text).toBe('upstream_dns_parallel_requests');
        expect(options[2].text).toBe('upstream_dns_fastest_addr');
    });

    it('returns warning only for fastest_addr option', () => {
        const options = getUpstreamModeOptions();
        expect(options[0].warning).toBeUndefined();
        expect(options[1].warning).toBeUndefined();
        expect(options[2].warning).toBe('upstream_dns_fastest_addr_warning');
    });
});
