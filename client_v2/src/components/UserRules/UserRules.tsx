import React, { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import cn from 'clsx';
import { useDispatch, useSelector } from 'react-redux';

import intl from 'panel/common/intl';
import { initSettings, toggleBlocking, toggleBlockingForClient, toggleSetting } from 'panel/actions';
import { getFilteringStatus, setRules, checkHost, toggleFilterStatus } from 'panel/actions/filtering';
import { getRewritesList, updateRewrite, deleteRewrite } from 'panel/actions/rewrites';
import { getBlockedServices, getAllBlockedServices, updateBlockedServices } from 'panel/actions/services';
import { addSuccessToast } from 'panel/actions/toasts';
import { BLOCK_ACTIONS, MODAL_TYPE, SPECIAL_FILTER_ID } from 'panel/helpers/constants';
import { RootState } from 'panel/initialState';
import theme from 'panel/lib/theme';
import { Loader } from 'panel/common/ui/Loader';
import { openModal } from 'panel/reducers/modals';
import { ConfigureRewritesModal } from 'panel/components/FilterLists/blocks/ConfigureRewritesModal/ConfigureRewritesModal';
import { DeleteRewriteModal } from 'panel/components/FilterLists/blocks/DeleteRewriteModal';

import { CheckForm } from './blocks/CheckForm';
import { CheckResult } from './blocks/CheckResult';
import { Examples } from './blocks/Examples';
import { RulesEditor } from './blocks/RulesEditor';
import { CheckFormValues, DNS_RECORD_TYPE_OPTIONS, ResultActionKind, RewriteEntry, UserRulesFormValues } from './types';

import s from './UserRules.module.pcss';

export const UserRules = () => {
    const dispatch = useDispatch();

    const userRules = useSelector((state: RootState) => state.filtering.userRules);
    const filters = useSelector((state: RootState) => state.filtering.filters);
    const whitelistFilters = useSelector((state: RootState) => state.filtering.whitelistFilters);
    const processingRules = useSelector((state: RootState) => state.filtering.processingRules);
    const processingCheck = useSelector((state: RootState) => state.filtering.processingCheck);
    const checkResult = useSelector((state: RootState) => state.filtering.check);
    const settingsList = useSelector((state: RootState) => state.settings.settingsList);
    const rewrites = useSelector((state: RootState) => state.rewrites);
    const services = useSelector((state: RootState) => state.services);

    const [lastSubmittedCheck, setLastSubmittedCheck] = useState<CheckFormValues | null>(null);
    const [isResultVisible, setIsResultVisible] = useState(Boolean(checkResult?.hostname));
    const [currentRewrite, setCurrentRewrite] = useState<RewriteEntry>({
        domain: '',
        answer: '',
        enabled: false,
    });
    const [isResultRefreshing, setIsResultRefreshing] = useState(false);

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

    const runWithResultRefresh = async (callback: () => Promise<void>) => {
        setIsResultVisible(true);
        setIsResultRefreshing(true);

        try {
            await callback();
        } finally {
            setIsResultRefreshing(false);
        }
    };

    const runWithClosedResult = async (callback: () => Promise<void>) => {
        setIsResultVisible(false);

        await callback();
    };

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

    const onCheckSubmit = async (data: CheckFormValues) => {
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

        await runWithResultRefresh(async () => {
            await dispatch(checkHost(payload));
        });
    };

    const handleRuleToggle = async (type: (typeof BLOCK_ACTIONS)[keyof typeof BLOCK_ACTIONS]) => {
        if (!checkResult?.hostname || !lastSubmittedCheck) {
            return;
        }

        const matchedCustomRule =
            !lastSubmittedCheck.client &&
            checkResult?.rules?.[0]?.filter_list_id === SPECIAL_FILTER_ID.CUSTOM_FILTERING_RULES
                ? checkResult.rules?.[0]?.text
                : undefined;

        let action;

        if (lastSubmittedCheck.client) {
            action = toggleBlockingForClient(type, checkResult.hostname, lastSubmittedCheck.client);
        } else if (matchedCustomRule) {
            action = toggleBlocking(type, checkResult.hostname, undefined, undefined, matchedCustomRule);
        } else {
            action = toggleBlocking(type, checkResult.hostname);
        }

        await runWithClosedResult(async () => {
            await dispatch(action);
            await recheckCurrentTarget();
        });
    };

    const handleDisableSafeBrowsing = async () => {
        await runWithClosedResult(async () => {
            const ok = await dispatch(toggleSetting('safebrowsing', true));
            if (!ok) {
                return;
            }

            dispatch(addSuccessToast(intl.getMessage('user_rules_browsing_security_disabled')));
            await recheckCurrentTarget();
        });
    };

    const handleDisableParental = async () => {
        await runWithClosedResult(async () => {
            const ok = await dispatch(toggleSetting('parental', true));
            if (!ok) {
                return;
            }

            dispatch(addSuccessToast(intl.getMessage('user_rules_parental_control_disabled')));
            await recheckCurrentTarget();
        });
    };

    const handleDisableSafeSearch = async () => {
        const currentSafeSearch = settingsList?.safesearch;
        if (!currentSafeSearch) {
            return;
        }

        await runWithClosedResult(async () => {
            const ok = await dispatch(toggleSetting('safesearch', { ...currentSafeSearch, enabled: false }));
            if (!ok) {
                return;
            }

            dispatch(addSuccessToast(intl.getMessage('user_rules_safe_search_disabled')));
            await recheckCurrentTarget();
        });
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

        await runWithClosedResult(async () => {
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
            dispatch(addSuccessToast(intl.getMessage('user_rules_filter_was_disabled', { value: matchedFilter.name })));
            await recheckCurrentTarget();
        });
    };

    const handleAllowBlockedService = async () => {
        const currentRule = checkResult?.rules?.[0]?.text;
        const normalizedServiceName = checkResult?.service_name?.trim().toLowerCase();
        const matchedService = services.allServices.find((service) => {
            if (normalizedServiceName) {
                const matchesName = service.name?.toLowerCase() === normalizedServiceName;
                const matchesId = service.id?.toLowerCase() === normalizedServiceName;

                if (matchesName || matchesId) {
                    return true;
                }
            }

            return Boolean(currentRule) && service.rules?.includes(currentRule);
        });

        if (!matchedService) {
            return;
        }

        await runWithClosedResult(async () => {
            await dispatch(
                updateBlockedServices({
                    ...services.list,
                    ids: (services.list.ids || []).filter((id: string) => id !== matchedService.id),
                }),
            );
            dispatch(addSuccessToast(intl.getMessage('user_rules_service_allowed', { value: matchedService.name })));
            await recheckCurrentTarget();
        });
    };

    const handleRewriteUpdate = async (update: RewriteEntry) => {
        if (!currentRewrite.domain) {
            return;
        }

        await runWithClosedResult(async () => {
            await dispatch(updateRewrite({ target: currentRewrite, update }, { showToast: false }));
            dispatch(addSuccessToast(intl.getMessage('settings_notify_changes_saved')));
            await recheckCurrentTarget();
        });
    };

    const handleRewriteDelete = async () => {
        if (!currentRewrite.domain) {
            return;
        }

        await runWithClosedResult(async () => {
            await dispatch(deleteRewrite(currentRewrite, { showToast: false }));
            dispatch(addSuccessToast(intl.getMessage('user_rules_dns_rewrite_removed')));
            await recheckCurrentTarget();
        });
    };

    const resetCurrentRewrite = () => {
        setCurrentRewrite({
            domain: '',
            answer: '',
            enabled: false,
        });
    };

    const openEditRewriteModal = () => {
        if (!matchedRewrite) {
            return;
        }

        setCurrentRewrite(matchedRewrite);
        dispatch(openModal(MODAL_TYPE.EDIT_REWRITE));
    };

    const openDeleteRewriteModal = () => {
        if (!matchedRewrite) {
            return;
        }

        setCurrentRewrite(matchedRewrite);
        dispatch(openModal(MODAL_TYPE.DELETE_REWRITE));
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

    const showResultLoader = isResultVisible && isResultRefreshing;
    const showResultCard = isResultVisible && !isResultRefreshing && Boolean(checkResult?.hostname);

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

                        {showResultLoader && (
                            <div
                                className={cn(s.card, s.resultLoadingCard)}
                                data-testid="user-rules-result-loader"
                                aria-busy="true"
                            >
                                <Loader className={s.resultLoaderIcon} />
                            </div>
                        )}

                        {showResultCard && (
                            <CheckResult
                                checkResult={checkResult}
                                processingRules={isActionProcessing}
                                onDismiss={() => setIsResultVisible(false)}
                                onAction={handleAction}
                                onEditRewrite={openEditRewriteModal}
                                onDeleteRewrite={openDeleteRewriteModal}
                                hasMatchedRewrite={Boolean(matchedRewrite)}
                            />
                        )}
                    </div>
                </div>
            </div>

            <ConfigureRewritesModal
                modalId={MODAL_TYPE.EDIT_REWRITE}
                rewriteToEdit={currentRewrite}
                onSubmit={handleRewriteUpdate}
                onClose={resetCurrentRewrite}
            />

            <DeleteRewriteModal
                rewriteToDelete={currentRewrite}
                setRewriteToDelete={setCurrentRewrite}
                onConfirm={handleRewriteDelete}
            />
        </>
    );
};
