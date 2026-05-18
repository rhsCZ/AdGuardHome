import { describe, expect, it } from 'vitest';

import intl from 'panel/common/intl';
import { FILTERED_STATUS, SPECIAL_FILTER_ID } from 'panel/helpers/constants';

import { getCheckResultMeta } from '../components/UserRules/checkResultHelpers';

describe('getCheckResultMeta', () => {
    const filters = [
        {
            id: 101,
            name: 'Example Blocklist',
            url: 'https://filters.example/blocklist.txt',
            enabled: true,
            lastUpdated: '',
            rulesCount: 12,
        },
    ];

    it('localizes filter and allowlist reasons through translation keys', () => {
        const blockedMeta = getCheckResultMeta({
            reason: FILTERED_STATUS.FILTERED_BLACK_LIST,
            rules: [{ filter_list_id: 101, text: '||filtered.example^' }],
            filters,
            whitelistFilters: [],
        });

        const allowedMeta = getCheckResultMeta({
            reason: FILTERED_STATUS.NOT_FILTERED_WHITE_LIST,
            rules: [{ filter_list_id: 101, text: '@@||allowed.example^$important' }],
            filters,
            whitelistFilters: [],
        });

        expect(blockedMeta.reason).toBe(
            intl.getMessage('user_rules_reason_filtered_by', { source: 'Example Blocklist' }),
        );
        expect(allowedMeta.reason).toBe(
            intl.getMessage('user_rules_reason_allowed_by', { source: 'Example Blocklist' }),
        );
    });

    it('localizes custom filtering and protection reasons through translation keys', () => {
        const customMeta = getCheckResultMeta({
            reason: FILTERED_STATUS.FILTERED_BLACK_LIST,
            rules: [{ filter_list_id: SPECIAL_FILTER_ID.CUSTOM_FILTERING_RULES, text: '||blocked.example^' }],
            filters: [],
            whitelistFilters: [],
        });

        const safeBrowsingMeta = getCheckResultMeta({
            reason: FILTERED_STATUS.FILTERED_SAFE_BROWSING,
            rules: [],
            filters: [],
            whitelistFilters: [],
        });

        const blockedServicesMeta = getCheckResultMeta({
            reason: FILTERED_STATUS.FILTERED_BLOCKED_SERVICE,
            rules: [],
            filters: [],
            whitelistFilters: [],
        });

        expect(customMeta.reason).toBe(
            intl.getMessage('user_rules_reason_blocked_by', {
                source: intl.getMessage('custom_filtering_rules'),
            }),
        );
        expect(safeBrowsingMeta.reason).toBe(
            intl.getMessage('user_rules_reason_blocked_by', {
                source: intl.getMessage('safe_browsing'),
            }),
        );
        expect(blockedServicesMeta.reason).toBe(
            intl.getMessage('user_rules_reason_blocked_by', {
                source: intl.getMessage('blocked_services'),
            }),
        );
    });

    it('omits filter and allowlist reasons when the source name is unavailable', () => {
        const blockedMeta = getCheckResultMeta({
            reason: FILTERED_STATUS.FILTERED_BLACK_LIST,
            rules: [{ filter_list_id: 999, text: '||filtered.example^' }],
            filters: [],
            whitelistFilters: [],
        });

        const allowedMeta = getCheckResultMeta({
            reason: FILTERED_STATUS.NOT_FILTERED_WHITE_LIST,
            rules: [{ filter_list_id: 999, text: '@@||allowed.example^$important' }],
            filters: [],
            whitelistFilters: [],
        });

        expect(blockedMeta.reason).toBeUndefined();
        expect(allowedMeta.reason).toBeUndefined();
    });
});
