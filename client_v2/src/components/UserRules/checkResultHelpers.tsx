import intl from 'panel/common/intl';
import { FILTERED_STATUS, SPECIAL_FILTER_ID } from 'panel/helpers/constants';
import { checkFiltered, getFilterName, type Filter } from 'panel/helpers/helpers';

import { CheckResultData, ResultActionKind } from './types';

type CheckResultMeta = {
    tone: 'blocked' | 'allowed' | 'rewritten' | 'processed';
    title: string;
    reason: string;
    action: ResultActionKind;
    rule?: string;
    source?: string;
};

const getPrimaryRule = (rules: CheckResultData['rules']) => rules?.[0];

const getSourceName = (rules: CheckResultData['rules'], filters: Filter[], whitelistFilters: Filter[]) => {
    const primaryRule = getPrimaryRule(rules);

    if (primaryRule?.filter_list_id === undefined) {
        return undefined;
    }

    return getFilterName(filters, whitelistFilters, primaryRule.filter_list_id);
};

export const getCheckResultMeta = ({
    reason,
    rules,
    filters,
    whitelistFilters,
}: {
    reason?: string;
    rules?: CheckResultData['rules'];
    filters: Filter[];
    whitelistFilters: Filter[];
}): CheckResultMeta => {
    const primaryRule = getPrimaryRule(rules);
    const sourceName = getSourceName(rules, filters, whitelistFilters);
    const isCustomRule = primaryRule?.filter_list_id === SPECIAL_FILTER_ID.CUSTOM_FILTERING_RULES;

    switch (reason) {
        case FILTERED_STATUS.FILTERED_BLACK_LIST:
            return {
                tone: 'blocked',
                title: intl.getMessage('user_rules_domain_blocked'),
                reason: isCustomRule ? 'Blocked by Custom filtering rules' : `Filtered by ${sourceName || 'filter'}`,
                action: isCustomRule ? 'allow' : 'disable-filter',
                rule: primaryRule?.text,
                source: sourceName,
            };
        case FILTERED_STATUS.NOT_FILTERED_WHITE_LIST:
            return {
                tone: 'allowed',
                title: intl.getMessage('user_rules_domain_is_allowed'),
                reason: `Allowed by ${sourceName || 'allowlist'}`,
                action: 'block',
                rule: primaryRule?.text,
                source: sourceName,
            };
        case FILTERED_STATUS.NOT_FILTERED_NOT_FOUND:
        case 'NotFilteredError':
        case 'FilteredInvalid':
            return {
                tone: 'processed',
                title: intl.getMessage('user_rules_domain_is_processed'),
                reason: intl.getMessage('user_rules_no_rules_matched'),
                action: 'block',
            };
        case FILTERED_STATUS.FILTERED_SAFE_BROWSING:
            return {
                tone: 'blocked',
                title: intl.getMessage('user_rules_domain_blocked'),
                reason: `Blocked by ${intl.getMessage('safe_browsing')}`,
                action: 'disable-safebrowsing',
            };
        case FILTERED_STATUS.FILTERED_PARENTAL:
            return {
                tone: 'blocked',
                title: intl.getMessage('user_rules_domain_blocked'),
                reason: `Blocked by ${intl.getMessage('parental_control')}`,
                action: 'disable-parental',
            };
        case FILTERED_STATUS.FILTERED_SAFE_SEARCH:
            return {
                tone: 'blocked',
                title: intl.getMessage('user_rules_domain_blocked'),
                reason: `Blocked by ${intl.getMessage('safe_search')}`,
                action: 'disable-safesearch',
            };
        case FILTERED_STATUS.FILTERED_BLOCKED_SERVICE:
            return {
                tone: 'blocked',
                title: intl.getMessage('user_rules_domain_blocked'),
                reason: `Blocked by ${intl.getMessage('blocked_services')}`,
                action: 'disable-blocked-service',
            };
        case FILTERED_STATUS.REWRITE:
        case FILTERED_STATUS.REWRITE_RULE:
            return {
                tone: 'rewritten',
                title: intl.getMessage('user_rules_rewrite_rule_is_applied'),
                reason: intl.getMessage('rewrite_applied'),
                action: 'none',
            };
        case FILTERED_STATUS.REWRITE_HOSTS:
            return {
                tone: 'rewritten',
                title: intl.getMessage('user_rules_rewrite_rule_is_applied'),
                reason: intl.getMessage('rewrite_hosts_applied'),
                action: 'none',
                source: intl.getMessage('system_host_files'),
            };
        default: {
            const isFilteredReason = reason ? checkFiltered(reason) : false;

            return {
                tone: isFilteredReason ? 'blocked' : 'processed',
                title: isFilteredReason
                    ? intl.getMessage('user_rules_domain_blocked')
                    : intl.getMessage('user_rules_domain_is_processed'),
                reason: reason || intl.getMessage('check_not_found'),
                action: 'none',
                rule: primaryRule?.text,
                source: sourceName,
            };
        }
    }
};

export const getActionLabel = (action: ResultActionKind) => {
    switch (action) {
        case 'allow':
            return intl.getMessage('user_rules_add_to_allowlist');
        case 'block':
            return intl.getMessage('user_rules_add_to_custom_filtering_rules');
        case 'disable-parental':
            return intl.getMessage('user_rules_disable_parental_control');
        case 'disable-safebrowsing':
            return intl.getMessage('user_rules_disable_browsing_security');
        case 'disable-safesearch':
            return intl.getMessage('user_rules_disable_safe_search');
        case 'disable-blocked-service':
            return intl.getMessage('user_rules_disable_blocked_service');
        case 'disable-filter':
            return intl.getMessage('user_rules_disable_filter');
        default:
            return '';
    }
};
