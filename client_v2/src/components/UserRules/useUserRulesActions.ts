import { useMemo, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { useDispatch } from 'react-redux';

import intl from 'panel/common/intl';
import { getClients, initSettings, toggleBlocking, toggleBlockingForClient, toggleSetting } from 'panel/actions';
import { updateClient } from 'panel/actions/clients';
import { checkHost, toggleFilterStatus } from 'panel/actions/filtering';
import { updateRewrite, deleteRewrite } from 'panel/actions/rewrites';
import { getBlockedServices, updateBlockedServices } from 'panel/actions/services';
import { addSuccessToast } from 'panel/actions/toasts';
import { BLOCK_ACTIONS, MODAL_TYPE, SPECIAL_FILTER_ID } from 'panel/helpers/constants';
import { Client, RootState } from 'panel/initialState';
import { openModal } from 'panel/reducers/modals';
import type { AppDispatch } from 'panel/store/types';

import {
    CLIENT_SCOPED_ACTIONS,
    findMatchedBlockedService,
    findMatchedRewrite,
    findPersistentClient,
    getEffectiveBlockedServices,
    getEffectiveClientProtectionSettings,
    getPrimaryRule,
} from './helpers';
import { CheckFormValues, CheckResultData, ResultActionKind, RewriteEntry } from './types';

const EMPTY_REWRITE: RewriteEntry = {
    domain: '',
    answer: '',
    enabled: false,
};

type UseUserRulesActionsParams = {
    checkResult: CheckResultData | null;
    filters: RootState['filtering']['filters'];
    whitelistFilters: RootState['filtering']['whitelistFilters'];
    filteringEnabled: boolean;
    settingsList?: RootState['settings']['settingsList'];
    persistentClients: Client[];
    rewritesList: RootState['rewrites']['list'];
    services: RootState['services'];
    lastSubmittedCheck: CheckFormValues | null;
    setIsResultVisible: Dispatch<SetStateAction<boolean>>;
};

type UseUserRulesActionsResult = {
    currentRewrite: RewriteEntry;
    setCurrentRewrite: Dispatch<SetStateAction<RewriteEntry>>;
    matchedRewrite: RewriteEntry | null;
    hiddenActionKinds: ResultActionKind[];
    handleAction: (action: ResultActionKind) => Promise<void>;
    handleRewriteUpdate: (update: RewriteEntry) => Promise<boolean>;
    handleRewriteDelete: () => Promise<boolean>;
    openEditRewriteModal: () => void;
    openDeleteRewriteModal: () => void;
    resetCurrentRewrite: () => void;
};

export const useUserRulesActions = ({
    checkResult,
    filters,
    whitelistFilters,
    filteringEnabled,
    settingsList,
    persistentClients,
    rewritesList,
    services,
    lastSubmittedCheck,
    setIsResultVisible,
}: UseUserRulesActionsParams): UseUserRulesActionsResult => {
    const dispatch = useDispatch<AppDispatch>();
    const [currentRewrite, setCurrentRewrite] = useState<RewriteEntry>(EMPTY_REWRITE);

    const matchedRewrite = useMemo(() => findMatchedRewrite(rewritesList, checkResult), [rewritesList, checkResult]);

    const resolvedClient = useMemo(
        () => findPersistentClient(persistentClients, lastSubmittedCheck?.client),
        [persistentClients, lastSubmittedCheck?.client],
    );

    const hiddenActionKinds = useMemo(() => {
        if (!lastSubmittedCheck?.client || resolvedClient) {
            return [];
        }

        return CLIENT_SCOPED_ACTIONS;
    }, [resolvedClient, lastSubmittedCheck?.client]);

    const runWithClosedResult = async <T>(callback: () => Promise<T>): Promise<T> => {
        setIsResultVisible(false);

        return callback();
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

    const updateResolvedClient = async (transform: (client: Client) => Client | null) => {
        if (!resolvedClient) {
            return false;
        }

        const updatedClient = transform(resolvedClient);

        if (!updatedClient) {
            return false;
        }

        return dispatch(
            updateClient(updatedClient, resolvedClient.name, {
                showToast: false,
                toggleModal: false,
            }),
        );
    };

    const handleRuleToggle = async (type: (typeof BLOCK_ACTIONS)[keyof typeof BLOCK_ACTIONS]) => {
        if (!checkResult?.hostname || !lastSubmittedCheck) {
            return;
        }

        const primaryRule = getPrimaryRule(checkResult);
        const matchedCustomRule =
            !lastSubmittedCheck.client && primaryRule?.filter_list_id === SPECIAL_FILTER_ID.CUSTOM_FILTERING_RULES
                ? primaryRule.text
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
            const ok = await dispatch(action);

            if (ok === false) {
                return false;
            }

            await recheckCurrentTarget();

            return true;
        });
    };

    const handleDisableSafeBrowsing = async () => {
        await runWithClosedResult(async () => {
            const ok = lastSubmittedCheck?.client
                ? await updateResolvedClient((client) => {
                      const effectiveSettings = getEffectiveClientProtectionSettings({
                          client,
                          globalFilteringEnabled: filteringEnabled,
                          settingsList,
                      });

                      if (!effectiveSettings) {
                          return null;
                      }

                      return {
                          ...client,
                          ...effectiveSettings,
                          use_global_settings: false,
                          safebrowsing_enabled: false,
                      };
                  })
                : await dispatch(toggleSetting('safebrowsing', true));

            if (!ok) {
                return false;
            }

            const clientSnapshot = resolvedClient;

            dispatch(
                addSuccessToast({
                    message: intl.getMessage('user_rules_browsing_security_disabled'),
                    actionLabel: intl.getMessage('notify_undo'),
                    onAction: async () => {
                        const didUndo =
                            lastSubmittedCheck?.client && clientSnapshot
                                ? await dispatch(
                                      updateClient(
                                          { ...clientSnapshot, safebrowsing_enabled: true },
                                          clientSnapshot.name,
                                          { showToast: false, toggleModal: false },
                                      ),
                                  )
                                : await dispatch(toggleSetting('safebrowsing', false));

                        if (didUndo) {
                            await dispatch(initSettings());
                            await dispatch(getClients());
                        }
                    },
                }),
            );
            await recheckCurrentTarget();

            return true;
        });
    };

    const handleDisableParental = async () => {
        await runWithClosedResult(async () => {
            const ok = lastSubmittedCheck?.client
                ? await updateResolvedClient((client) => {
                      const effectiveSettings = getEffectiveClientProtectionSettings({
                          client,
                          globalFilteringEnabled: filteringEnabled,
                          settingsList,
                      });

                      if (!effectiveSettings) {
                          return null;
                      }

                      return {
                          ...client,
                          ...effectiveSettings,
                          use_global_settings: false,
                          parental_enabled: false,
                      };
                  })
                : await dispatch(toggleSetting('parental', true));

            if (!ok) {
                return false;
            }

            dispatch(addSuccessToast(intl.getMessage('user_rules_parental_control_disabled')));
            await recheckCurrentTarget();

            return true;
        });
    };

    const handleDisableSafeSearch = async () => {
        const currentSafeSearch = settingsList?.safesearch;

        if (!lastSubmittedCheck?.client && !currentSafeSearch) {
            return;
        }

        await runWithClosedResult(async () => {
            const ok = lastSubmittedCheck?.client
                ? await updateResolvedClient((client) => {
                      const effectiveSettings = getEffectiveClientProtectionSettings({
                          client,
                          globalFilteringEnabled: filteringEnabled,
                          settingsList,
                      });

                      if (!effectiveSettings) {
                          return null;
                      }

                      const safeSearch = {
                          ...effectiveSettings.safe_search,
                          enabled: false,
                      };

                      return {
                          ...client,
                          ...effectiveSettings,
                          use_global_settings: false,
                          safe_search: safeSearch,
                          safesearch_enabled: safeSearch.enabled,
                      };
                  })
                : await dispatch(toggleSetting('safesearch', { ...currentSafeSearch, enabled: false }));

            if (!ok) {
                return false;
            }

            dispatch(addSuccessToast(intl.getMessage('user_rules_safe_search_disabled')));
            await recheckCurrentTarget();

            return true;
        });
    };

    const handleDisableFilter = async () => {
        const filterId = getPrimaryRule(checkResult)?.filter_list_id;
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
            const ok = await dispatch(
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

            if (!ok) {
                return false;
            }

            dispatch(addSuccessToast(intl.getMessage('user_rules_filter_was_disabled', { value: matchedFilter.name })));
            await recheckCurrentTarget();

            return true;
        });
    };

    const handleAllowBlockedService = async () => {
        const matchedService = findMatchedBlockedService(services.allServices, checkResult);

        if (!matchedService) {
            return;
        }

        const previousBlockedServiceIds = [...(services.list.ids || [])];

        await runWithClosedResult(async () => {
            const ok = lastSubmittedCheck?.client
                ? await updateResolvedClient((client) => {
                      const effectiveBlockedServices = getEffectiveBlockedServices(client, services.list);

                      if (!effectiveBlockedServices) {
                          return null;
                      }

                      return {
                          ...client,
                          ...effectiveBlockedServices,
                          use_global_blocked_services: false,
                          blocked_services: effectiveBlockedServices.blocked_services.filter(
                              (id) => id !== matchedService.id,
                          ),
                      };
                  })
                : await dispatch(
                      updateBlockedServices({
                          ...services.list,
                          ids: (services.list.ids || []).filter((id: string) => id !== matchedService.id),
                      }),
                  );

            if (!ok) {
                return false;
            }

            const clientSnapshot = resolvedClient;

            dispatch(
                addSuccessToast({
                    message: intl.getMessage('user_rules_service_allowed', { value: matchedService.name }),
                    actionLabel: intl.getMessage('notify_undo'),
                    onAction: async () => {
                        const didUndo =
                            lastSubmittedCheck?.client && clientSnapshot
                                ? await dispatch(
                                      updateClient(
                                          { ...clientSnapshot, blocked_services: [...previousBlockedServiceIds] },
                                          clientSnapshot.name,
                                          { showToast: false, toggleModal: false },
                                      ),
                                  )
                                : await dispatch(
                                      updateBlockedServices({
                                          ...services.list,
                                          ids: previousBlockedServiceIds,
                                      }),
                                  );

                        if (didUndo) {
                            await dispatch(getBlockedServices());
                            await dispatch(getClients());
                        }
                    },
                }),
            );
            await recheckCurrentTarget();

            return true;
        });
    };

    const handleRewriteUpdate = async (update: RewriteEntry) => {
        if (!currentRewrite.domain) {
            return false;
        }

        return runWithClosedResult(async () => {
            const ok = await dispatch(
                updateRewrite({ target: currentRewrite, update }, { showToast: false, closeModal: false }),
            );

            if (!ok) {
                return false;
            }

            dispatch(addSuccessToast(intl.getMessage('settings_notify_changes_saved')));
            await recheckCurrentTarget();

            return true;
        });
    };

    const handleRewriteDelete = async () => {
        if (!currentRewrite.domain) {
            return false;
        }

        return runWithClosedResult(async () => {
            const ok = await dispatch(deleteRewrite(currentRewrite, { showToast: false }));

            if (!ok) {
                return false;
            }

            dispatch(addSuccessToast(intl.getMessage('user_rules_dns_rewrite_removed')));
            await recheckCurrentTarget();

            return true;
        });
    };

    const resetCurrentRewrite = () => {
        setCurrentRewrite(EMPTY_REWRITE);
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

    return {
        currentRewrite,
        setCurrentRewrite,
        matchedRewrite,
        hiddenActionKinds,
        handleAction,
        handleRewriteUpdate,
        handleRewriteDelete,
        openEditRewriteModal,
        openDeleteRewriteModal,
        resetCurrentRewrite,
    };
};
