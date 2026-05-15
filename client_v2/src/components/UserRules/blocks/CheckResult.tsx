import React from 'react';
import cn from 'clsx';
import { useSelector } from 'react-redux';

import intl from 'panel/common/intl';
import theme from 'panel/lib/theme';
import { Icon } from 'panel/common/ui/Icon';
import { FILTERED_STATUS } from 'panel/helpers/constants';
import { RootState } from 'panel/initialState';

import { getActionLabel, getCheckResultMeta } from '../checkResultHelpers';
import { CheckResultData, ResultActionKind } from '../types';

import s from '../UserRules.module.pcss';

type Props = {
    checkResult: CheckResultData;
    processingRules: boolean;
    onDismiss?: () => void;
    onAction: (action: ResultActionKind) => void;
    onEditRewrite?: () => void;
    onDeleteRewrite?: () => void;
    hasMatchedRewrite?: boolean;
    checkedQtype?: string;
};

const getStatusClassName = (tone: ReturnType<typeof getCheckResultMeta>['tone']) => {
    if (tone === 'blocked') {
        return s.checkResultTitleBlocked;
    }

    if (tone === 'allowed') {
        return s.checkResultTitleAllowed;
    }

    if (tone === 'rewritten') {
        return s.checkResultTitleRewritten;
    }

    return '';
};

export const CheckResult = ({
    checkResult,
    processingRules,
    onDismiss,
    onAction,
    onEditRewrite,
    onDeleteRewrite,
    hasMatchedRewrite = false,
    checkedQtype,
}: Props) => {
    const filters = useSelector((state: RootState) => state.filtering.filters);
    const whitelistFilters = useSelector((state: RootState) => state.filtering.whitelistFilters);

    const { hostname, reason, rules, service_name, cname, ip_addrs } = checkResult;

    if (!hostname) {
        return null;
    }

    const meta = getCheckResultMeta({ reason, rules, filters, whitelistFilters });
    const statusClassName = getStatusClassName(meta.tone);
    const actionLabel = getActionLabel(meta.action);
    const showRewriteActions = reason === FILTERED_STATUS.REWRITE_RULE && hasMatchedRewrite;
    const hasStandaloneResultMessage =
        reason === FILTERED_STATUS.NOT_FILTERED_NOT_FOUND ||
        reason === 'NotFilteredError' ||
        reason === 'FilteredInvalid';

    return (
        <div className={cn(s.checkResult, theme.text.t2)} data-testid="user-rules-result-card">
            <div className={s.checkResultHeader}>
                <h3
                    className={cn(theme.title.h6, s.checkResultTitle, statusClassName)}
                    data-testid="user-rules-result-title"
                >
                    {meta.title}
                </h3>

                {onDismiss && (
                    <button
                        type="button"
                        className={s.dismissButton}
                        aria-label={intl.getMessage('close_result')}
                        data-testid="user-rules-result-dismiss"
                        onClick={onDismiss}
                    >
                        <Icon icon="cross" color="gray" />
                    </button>
                )}
            </div>

            <div className={s.resultItem}>{intl.getMessage('user_rules_domain', { value: hostname })}</div>

            <div className={s.resultItem}>
                {hasStandaloneResultMessage
                    ? meta.reason
                    : intl.getMessage('user_rules_reason', { reason: meta.reason })}
            </div>

            {checkedQtype && (
                <div className={s.resultItem}>
                    {intl.getMessage('user_rules_dns_record_type', { type: checkedQtype })}
                </div>
            )}

            {meta.rule && (
                <div className={s.resultItem}>{intl.getMessage('user_rules_rule', { rule: meta.rule })}</div>
            )}

            {meta.source && (
                <div className={s.resultItem}>
                    {intl.getMessage('user_rules_source', { value: meta.source })}
                </div>
            )}

            {service_name && (
                <div className={s.resultItem}>
                    {intl.getMessage('user_rules_service', { service: service_name })}
                </div>
            )}

            {cname && <div className={s.resultItem}>{intl.getMessage('user_rules_cname', { cname })}</div>}

            {ip_addrs && ip_addrs.length > 0 && (
                <div className={s.resultItem}>
                    {intl.getMessage('user_rules_ip', { ip: ip_addrs.join(', ') })}
                </div>
            )}

            <div className={s.actionButtons}>
                {meta.action !== 'none' && (
                    <button
                        type="button"
                        disabled={processingRules}
                        className={cn(s.actionLink, theme.text.t2)}
                        data-testid="user-rules-result-primary-action"
                        onClick={() => onAction(meta.action)}
                    >
                        {actionLabel}
                    </button>
                )}

                {showRewriteActions && onEditRewrite && (
                    <button
                        type="button"
                        disabled={processingRules}
                        className={cn(s.actionLink, theme.text.t2)}
                        data-testid="user-rules-result-edit-rewrite"
                        onClick={onEditRewrite}
                    >
                        {intl.getMessage('rewrite_edit')}
                    </button>
                )}

                {showRewriteActions && onDeleteRewrite && (
                    <button
                        type="button"
                        disabled={processingRules}
                        className={cn(s.actionLink, theme.text.t2)}
                        data-testid="user-rules-result-delete-rewrite"
                        onClick={onDeleteRewrite}
                    >
                        {intl.getMessage('delete_table_action')}
                    </button>
                )}
            </div>
        </div>
    );
};
