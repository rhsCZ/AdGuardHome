import React, { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import cn from 'clsx';
import { useDispatch, useSelector } from 'react-redux';

import { ConfirmDialog } from 'panel/common/ui/ConfirmDialog';
import intl from 'panel/common/intl';
import { PageLoader } from 'panel/common/ui/Loader';
import { initSettings, toggleBlocking, toggleBlockingForClient, toggleSetting } from 'panel/actions';
import { getFilteringStatus, setRules, checkHost, toggleFilterStatus } from 'panel/actions/filtering';
import { getRewritesList, updateRewrite, deleteRewrite } from 'panel/actions/rewrites';
import { getBlockedServices, getAllBlockedServices, updateBlockedServices } from 'panel/actions/services';
import { addSuccessToast } from 'panel/actions/toasts';
import { BLOCK_ACTIONS } from 'panel/helpers/constants';
import { RootState } from 'panel/initialState';
import theme from 'panel/lib/theme';

import { CheckForm } from './blocks/CheckForm';
import { CheckResult } from './blocks/CheckResult';
import { Examples } from './blocks/Examples';
import { RewriteDialog } from './blocks/RewriteDialog';
import { RulesEditor } from './blocks/RulesEditor';
import { CheckFormValues, DNS_RECORD_TYPE_OPTIONS, ResultActionKind, RewriteDialogState, RewriteEntry, UserRulesFormValues } from './types';

import s from './UserRules.module.pcss';

const getPlainText = (value: React.ReactNode): string => {
    if (typeof value === 'string' || typeof value === 'number') {
        return String(value);
    }

    if (Array.isArray(value)) {
        return value.map(getPlainText).join('');
    }

    if (React.isValidElement(value)) {
        return getPlainText(value.props.children);
    }

    return '';
};

export const UserRules = () => {
    const dispatch = useDispatch();

    const userRules = useSelector((state: RootState) => state.filtering.userRules);
    const filters = useSelector((state: RootState) => state.filtering.filters);
    const whitelistFilters = useSelector((state: RootState) => state.filtering.whitelistFilters);
    const processingRules = useSelector((state: RootState) => state.filtering.processingRules);
    const processingCheck = useSelector((state: RootState) => state.filtering.processingCheck);
    const processingFilters = useSelector((state: RootState) => state.filtering.processingFilters);
    const checkResult = useSelector((state: RootState) => state.filtering.check);
    const settingsList = useSelector((state: RootState) => state.settings.settingsList);
    const rewrites = useSelector((state: RootState) => state.rewrites);
    const services = useSelector((state: RootState) => state.services);

    const [lastSubmittedCheck, setLastSubmittedCheck] = useState<CheckFormValues | null>(null);
    const [isResultVisible, setIsResultVisible] = useState(Boolean(checkResult?.hostname));
    const [rewriteDialogState, setRewriteDialogState] = useState<RewriteDialogState | null>(null);
    const [rewriteToDelete, setRewriteToDelete] = useState<RewriteEntry | null>(null);

    const isDataLoading = processingFilters;
    const isActionProcessing =
        processingRules ||
        processingCheck ||
        rewrites.processingDelete ||
        rewrites.processingUpdate ||
        services.processingSet;

    useEffect(() => {
        dispatch(getFilteringStatus());
        dispatch(initSettings());
        dispatch(getRewritesList());
        dispatch(getBlockedServices());
        dispatch(getAllBlockedServices());
    }, [dispatch]);

    useEffect(() => {
        if (checkResult?.hostname) {
            setIsResultVisible(true);
        }
    }, [checkResult?.hostname]);

    const {
        control: rulesControl,
        handleSubmit: handleRulesSubmit,
        reset: resetRulesForm,
    } = useForm<UserRulesFormValues>({
        defaultValues: {
            userRules: userRules || '',
        },
        mode: 'onChange',
    });

    useEffect(() => {
        resetRulesForm({ userRules: userRules || '' });
    }, [userRules, resetRulesForm]);

    const {
        control: checkControl,
        handleSubmit: handleCheckSubmit,
        formState: { isValid: isCheckValid },
    } = useForm<CheckFormValues>({
        defaultValues: {
            hostname: '',
            client: '',
            qtype: DNS_RECORD_TYPE_OPTIONS[0].value,
        },
        mode: 'onChange',
    });

    const matchedRewrite = useMemo(() => {
        const matches = rewrites.list.filter((entry) => {
            if (entry.domain !== checkResult?.hostname) {
                return false;
            }

            if (checkResult?.cname) {
                return entry.answer === checkResult.cname;
            }

            return Boolean(checkResult?.ip_addrs?.includes(entry.answer));
        });

        return matches.length === 1 ? matches[0] : null;
    }, [checkResult?.cname, checkResult?.hostname, checkResult?.ip_addrs, rewrites.list]);

    const recheckCurrentTarget = async () => {
        if (!lastSubmittedCheck) {
            return;
        }

        await dispatch(
            checkHost({
                name: lastSubmittedCheck.hostname,
                client: lastSubmittedCheck.client || undefined,
                qtype: lastSubmittedCheck.qtype || undefined,
            }),
        );
        setIsResultVisible(true);
    };

    const onRulesSubmit = (data: UserRulesFormValues) => {
        dispatch(setRules(data.userRules));
    };

    const onCheckSubmit = (data: CheckFormValues) => {
        const payload = {
            name: data.hostname.trim(),
            client: data.client.trim() || undefined,
            qtype: data.qtype || undefined,
        };

        setLastSubmittedCheck({
            hostname: payload.name,
            client: payload.client || '',
            qtype: payload.qtype || '',
        });
        setIsResultVisible(true);
        dispatch(checkHost(payload));
    };

    const handleRuleToggle = async (type: (typeof BLOCK_ACTIONS)[keyof typeof BLOCK_ACTIONS]) => {
        if (!checkResult?.hostname || !lastSubmittedCheck) {
            return;
        }

        const action = lastSubmittedCheck.client
            ? toggleBlockingForClient(type, checkResult.hostname, lastSubmittedCheck.client)
            : toggleBlocking(type, checkResult.hostname);

        await dispatch(action);
        await recheckCurrentTarget();
    };

    const handleDisableSafeBrowsing = async () => {
        const ok = await dispatch(toggleSetting('safebrowsing', true));
        if (!ok) {
            return;
        }

        dispatch(addSuccessToast(intl.getMessage('user_rules_browsing_security_disabled')));
        await recheckCurrentTarget();
    };

    const handleDisableParental = async () => {
        const ok = await dispatch(toggleSetting('parental', true));
        if (!ok) {
            return;
        }

        dispatch(addSuccessToast(intl.getMessage('user_rules_parental_control_disabled')));
        await recheckCurrentTarget();
    };

    const handleDisableSafeSearch = async () => {
        const currentSafeSearch = settingsList?.safesearch;
        if (!currentSafeSearch) {
            return;
        }

        const ok = await dispatch(toggleSetting('safesearch', { ...currentSafeSearch, enabled: false }));
        if (!ok) {
            return;
        }

        dispatch(addSuccessToast(intl.getMessage('user_rules_safe_search_disabled')));
        await recheckCurrentTarget();
    };

    const handleDisableFilter = async () => {
        const filterId = checkResult?.rules?.[0]?.filter_list_id;
        if (filterId === undefined) {
            return;
        }

        const matchedFilter =
            filters.find((filter) => filter.id === filterId) ??
            whitelistFilters.find((filter) => filter.id === filterId);
        if (!matchedFilter) {
            return;
        }

        const isWhitelist = whitelistFilters.some((filter) => filter.id === filterId);

        await dispatch(
            toggleFilterStatus(
                matchedFilter.url,
                {
                    name: matchedFilter.name,
                    url: matchedFilter.url,
                    enabled: false,
                },
                isWhitelist,
            ),
        );
        dispatch(
            addSuccessToast(
                getPlainText(intl.getMessage('user_rules_filter_was_disabled', { value: matchedFilter.name })),
            ),
        );
        await recheckCurrentTarget();
    };

    const handleAllowBlockedService = async () => {
        const matchedService = services.allServices.find((service) => service.name === checkResult?.service_name);
        if (!matchedService) {
            return;
        }

        await dispatch(
            updateBlockedServices(
                {
                    ...services.list,
                    ids: (services.list.ids || []).filter((id) => id !== matchedService.id),
                },
                { showToast: false },
            ),
        );
        dispatch(
            addSuccessToast(
                getPlainText(intl.getMessage('user_rules_service_allowed', { value: matchedService.name })),
            ),
        );
        await recheckCurrentTarget();
    };

    const handleRewriteUpdate = async (update: RewriteEntry) => {
        if (!matchedRewrite) {
            return;
        }

        await dispatch(updateRewrite({ target: matchedRewrite, update }, { showToast: false }));
        dispatch(addSuccessToast(intl.getMessage('settings_notify_changes_saved')));
        setRewriteDialogState(null);
        await recheckCurrentTarget();
    };

    const handleRewriteDelete = async () => {
        if (!rewriteToDelete) {
            return;
        }

        await dispatch(deleteRewrite(rewriteToDelete, { showToast: false }));
        dispatch(addSuccessToast(intl.getMessage('user_rules_dns_rewrite_removed')));
        setRewriteToDelete(null);
        await recheckCurrentTarget();
    };

    const handleAction = async (action: ResultActionKind) => {
        switch (action) {
            case 'allow':
                await handleRuleToggle(BLOCK_ACTIONS.UNBLOCK);
                break;
            case 'block':
                await handleRuleToggle(BLOCK_ACTIONS.BLOCK);
                break;
            case 'disable-parental':
                await handleDisableParental();
                break;
            case 'disable-safebrowsing':
                await handleDisableSafeBrowsing();
                break;
            case 'disable-safesearch':
                await handleDisableSafeSearch();
                break;
            case 'disable-blocked-service':
                await handleAllowBlockedService();
                break;
            case 'disable-filter':
                await handleDisableFilter();
                break;
            case 'edit-rewrite':
            case 'delete-rewrite':
            default:
                break;
        }
    };

    if (isDataLoading) {
        return (
            <div className={theme.layout.container}>
                <div className={cn(theme.layout.containerIn, theme.layout.containerIn_one_col)}>
                    <PageLoader />
                </div>
            </div>
        );
    }

    return (
        <>
            <div className={theme.layout.container}>
                <div className={s.container}>
                    <div className={s.wrapper}>
                        <h1 className={cn(theme.title.h4, theme.title.h3_tablet, s.pageTitle)}>
                            {intl.getMessage('user_rules_title')}
                        </h1>

                        <RulesEditor
                            control={rulesControl}
                            handleSubmit={handleRulesSubmit}
                            onSubmit={onRulesSubmit}
                            processingRules={processingRules}
                        />

                        <Examples />
                    </div>

                    <div className={s.check}>
                        <div className={s.card}>
                            <h2 className={cn(theme.title.h6, s.checkTitle)}>
                                {intl.getMessage('user_rules_check_title')}
                            </h2>

                            <CheckForm
                                control={checkControl}
                                handleSubmit={handleCheckSubmit}
                                onSubmit={onCheckSubmit}
                                isValid={isCheckValid}
                                processingCheck={processingCheck}
                            />
                        </div>

                        {isResultVisible && (
                            <CheckResult
                                checkResult={checkResult}
                                processingRules={isActionProcessing}
                                onDismiss={() => setIsResultVisible(false)}
                                onAction={handleAction}
                                onEditRewrite={() =>
                                    matchedRewrite && setRewriteDialogState({ visible: true, target: matchedRewrite })
                                }
                                onDeleteRewrite={() => matchedRewrite && setRewriteToDelete(matchedRewrite)}
                                hasMatchedRewrite={Boolean(matchedRewrite)}
                            />
                        )}
                    </div>
                </div>
            </div>

            <RewriteDialog
                visible={Boolean(rewriteDialogState?.visible)}
                initialValue={rewriteDialogState?.target || null}
                processing={Boolean(rewrites.processingUpdate)}
                onClose={() => setRewriteDialogState(null)}
                onSubmit={handleRewriteUpdate}
            />

            {rewriteToDelete && (
                <ConfirmDialog
                    title={intl.getMessage('delete_table_action')}
                    text={intl.getMessage('rewrite_confirm_delete', { key: rewriteToDelete.domain })}
                    buttonText={intl.getMessage('delete_table_action')}
                    cancelText={intl.getMessage('cancel')}
                    submitDisabled={Boolean(rewrites.processingDelete)}
                    onConfirm={handleRewriteDelete}
                    onClose={() => setRewriteToDelete(null)}
                />
            )}
        </>
    );
};
