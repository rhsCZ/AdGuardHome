import React from 'react';
import cn from 'clsx';

import intl from 'panel/common/intl';
import { Button } from 'panel/common/ui/Button';
import { Dialog } from 'panel/common/ui/Dialog';
import theme from 'panel/lib/theme';

import { checkBlockedService, formatElapsedMs, getServiceName, type Filter } from 'panel/helpers/helpers';
import {
    getQueryReasonDetails,
    getQueryReasonLabel,
    getQueryReasonKey,
    getQueryStatusLabel,
    getQueryStatusKey,
    getStatusClassName,
    getProtocolName,
    isBlockedReason,
    formatLogTimeDetailed,
    formatLogDate,
} from '../../helpers';
import { LogEntry, ResponseEntry, Service } from '../../types';

import { DetailRow } from './DetailRow';
import s from './DetailModal.module.pcss';

type Props = {
    entry: LogEntry;
    filters: Filter[];
    services: Service[];
    whitelistFilters: Filter[];
    onClose: () => void;
    onBlock: (domain: string) => void;
    onAddToAllowlist: (domain: string) => void;
    onAllowService: (serviceId: string) => void;
};

const formatResponses = (responses: ResponseEntry[] = []) => responses
    .map(({ type, value, ttl }) => {
        if (!value) {
            return '';
        }

        const entry = [type, value].filter(Boolean).join(': ');

        if (ttl || ttl === 0) {
            return `${entry} (ttl=${ttl})`;
        }

        return entry;
    })
    .filter(Boolean);

const getSourceNode = (trackerSource?: { url?: string; name?: string }) => {
    const sourceValue = trackerSource?.url ? trackerSource.url : trackerSource?.name;
    if (trackerSource?.url) {
        return (
            <a href={trackerSource.url} target="_blank" rel="noopener noreferrer" className={cn(s.link, s.value)}>
                {trackerSource.name}
            </a>
        );
    }
    if (sourceValue) {
        return <span className={s.value}>{trackerSource?.name}</span>;
    }
    return null;
};

export const DetailModal = ({
    entry,
    filters,
    services,
    whitelistFilters,
    onClose,
    onBlock,
    onAddToAllowlist,
    onAllowService,
}: Props) => {
    const statusKey = getQueryStatusKey(entry.reason, entry.originalResponse ?? []);
    const reasonKey = getQueryReasonKey(entry.reason, entry.rules ?? []);
    const isBlocked = isBlockedReason(entry.reason);
    const isBlockedService = checkBlockedService(entry.reason);
    const reasonDetails = getQueryReasonDetails({
        elapsedMs: entry.elapsedMs,
        filters,
        reason: entry.reason,
        rules: entry.rules ?? [],
        serviceName: entry.service_name || entry.serviceName,
        services,
        whitelistFilters,
    });
    const statusClassName = getStatusClassName(entry.reason);
    const clientName = entry.client_info?.name || '';
    const protocol = getProtocolName(entry.client_proto);
    const responseList = formatResponses(entry.response);
    const originalResponseList = formatResponses(entry.originalResponse);
    const trackerSource = entry.tracker?.sourceData;
    const country = entry.client_info?.whois?.country;
    const network = entry.client_info?.whois?.orgname;
    const serviceId = entry.serviceName || entry.service_name;
    const serviceName = serviceId ? getServiceName(services, serviceId) || serviceId : '';
    const sourceNode = getSourceNode(trackerSource);

    const handleBlock = () => {
        onBlock(entry.domain);
        onClose();
    };

    const handleAddToAllowlist = () => {
        onAddToAllowlist(entry.domain);
        onClose();
    };

    const handleAllowService = () => {
        if (!serviceId) {
            return;
        }

        onAllowService(serviceId);
        onClose();
    };

    return (
        <Dialog
            visible
            onClose={onClose}
            title={<span data-testid="query-log-detail-title">{intl.getMessage('query_details')}</span>}
            className={s.dialog}
            wrapClassName={s.wrap}
        >
            <div className={s.content} data-testid="query-log-detail-modal">
                <div className={s.scrollArea} data-testid="query-log-detail-scroll-area">
                    <div className={s.section}>
                        {entry.answer_dnssec && (
                            <div className={cn(s.row, theme.text.t3, theme.text.semibold)}>
                                {intl.getMessage('validated_with_dnssec')}
                            </div>
                        )}
                        <DetailRow testId="query-log-detail-time" dataField="time" label={intl.getMessage('query_log_detail_time')} value={formatLogTimeDetailed(entry.time)} />
                        <DetailRow testId="query-log-detail-date" dataField="date" label={intl.getMessage('query_log_detail_date')} value={formatLogDate(entry.time)} />
                        <DetailRow testId="query-log-detail-domain" dataField="domain" label={intl.getMessage('query_log_detail_domain')} value={entry.unicodeName || entry.domain} />
                        <DetailRow testId="query-log-detail-ecs" dataField="ecs" label={intl.getMessage('query_log_detail_ecs')} value={entry.ecs} />
                        <DetailRow testId="query-log-detail-type" dataField="type" label={intl.getMessage('query_log_detail_type')} value={entry.type} />
                        <DetailRow testId="query-log-detail-protocol" dataField="protocol" label={intl.getMessage('query_log_detail_protocol')} value={protocol} />
                    </div>

                    {entry.tracker && (
                        <div className={s.section}>
                            <h3 className={cn(s.sectionTitle, theme.title.h6)}>{intl.getMessage('known_tracker')}</h3>
                            <DetailRow testId="query-log-detail-tracker-name" dataField="tracker-name" label={intl.getMessage('query_log_detail_name')} value={entry.tracker.name} />
                            <DetailRow testId="query-log-detail-tracker-category" dataField="tracker-category" label={intl.getMessage('query_log_detail_category')} value={entry.tracker.category} />
                            <DetailRow testId="query-log-detail-tracker-source" dataField="tracker-source" label={intl.getMessage('query_log_detail_source')} value={sourceNode} />
                        </div>
                    )}

                    <div className={s.section}>
                        <h3 className={cn(s.sectionTitle, theme.title.h6)}>{intl.getMessage('response_details')}</h3>
                        <DetailRow
                            testId="query-log-detail-status"
                            dataField="status"
                            label={intl.getMessage('query_log_detail_status')}
                            value={(
                                <span
                                    className={cn(s.value, s.statusValue, theme.text.semibold, statusClassName)}
                                >
                                    {getQueryStatusLabel(statusKey)}
                                </span>
                            )}
                        />
                        {reasonKey !== 'none' && (
                            <DetailRow
                                testId="query-log-detail-reason"
                                dataField="reason"
                                label={intl.getMessage('query_log_detail_reason')}
                                value={
                                    <div className={cn(s.value, s.detailStack)}>
                                        <span>
                                            {getQueryReasonLabel(reasonKey)}&nbsp;{reasonDetails && (
                                                <span className={s.detailHint}>{reasonDetails}</span>
                                            )}
                                        </span>
                                    </div>
                                }
                            />
                        )}
                        <DetailRow testId="query-log-detail-cached" dataField="cached" label={intl.getMessage('query_log_detail_served_from_cache')} value={entry.cached ? intl.getMessage('yes') : intl.getMessage('no')} />
                        <DetailRow testId="query-log-detail-dns-server" dataField="dns-server" label={intl.getMessage('query_log_detail_dns_server')} value={entry.upstream} />
                        <DetailRow testId="query-log-detail-elapsed" dataField="elapsed" label={intl.getMessage('query_log_detail_elapsed')} value={entry.elapsedMs ? formatElapsedMs(entry.elapsedMs, (key) => intl.getMessage(key)) : null} />
                        <DetailRow testId="query-log-detail-response-code" dataField="response-code" label={intl.getMessage('query_log_detail_response_code')} value={entry.status} />
                        <DetailRow
                            testId="query-log-detail-response"
                            dataField="response"
                            label={intl.getMessage('query_log_detail_response')}
                            value={responseList.length > 0 ? (
                                <div className={cn(s.value, s.responseList)}>
                                    {responseList.map((response, index) => (
                                        <div
                                            key={index}
                                            className={theme.text.t3}
                                        >
                                            {response}
                                        </div>
                                    ))}
                                </div>
                            ) : null}
                        />
                        <DetailRow testId="query-log-detail-service-name" dataField="service-name" label={intl.getMessage('query_log_detail_service_name')} value={serviceName} />
                        <DetailRow
                            testId="query-log-detail-rules"
                            dataField="rules"
                            label={intl.getMessage('query_log_detail_rules')}
                            value={entry.rules?.length ? (
                                <div className={cn(s.value, s.responseList)}>
                                    {entry.rules.map((rule, index) => (
                                        <div
                                            key={`${rule.text}-${index}`}
                                            className={theme.text.t3}
                                        >
                                            {rule.text}
                                        </div>
                                    ))}
                                </div>
                            ) : entry.rule}
                        />
                        <DetailRow
                            testId="query-log-detail-original-response"
                            dataField="original-response"
                            label={intl.getMessage('query_log_detail_original_response')}
                            value={originalResponseList.length > 0 ? (
                                <div className={cn(s.value, s.responseList)}>
                                    {originalResponseList.map((response, index) => (
                                        <div
                                            key={index}
                                            className={theme.text.t3}
                                        >
                                            {response}
                                        </div>
                                    ))}
                                </div>
                            ) : null}
                        />
                    </div>

                    <div className={s.section}>
                        <h3 className={cn(s.sectionTitle, theme.title.h6)}>{intl.getMessage('client_details')}</h3>
                        <DetailRow testId="query-log-detail-client-address" dataField="client-address" label={intl.getMessage('query_log_detail_address')} value={entry.client} />
                        <DetailRow testId="query-log-detail-client-name" dataField="client-name" label={intl.getMessage('query_log_detail_name')} value={clientName || entry.client_id} />
                        <DetailRow testId="query-log-detail-client-country" dataField="client-country" label={intl.getMessage('query_log_detail_country')} value={country} />
                        <DetailRow testId="query-log-detail-client-network" dataField="client-network" label={intl.getMessage('query_log_detail_network')} value={network} />
                    </div>
                </div>

                <div className={s.actionFooter} data-testid="query-log-detail-action-footer">
                    {!isBlocked && (
                        <Button
                            data-testid="query-log-detail-action-block"
                            data-action="block"
                            type="button"
                            variant="danger"
                            size="small"
                            className={s.actionButton}
                            onClick={handleBlock}
                        >
                            {intl.getMessage('block')}
                        </Button>
                    )}

                    {isBlocked && (
                        <Button
                            data-testid="query-log-detail-action-allowlist"
                            data-action="allowlist"
                            type="button"
                            variant="primary"
                            size="small"
                            className={s.actionButton}
                            onClick={handleAddToAllowlist}
                        >
                            {intl.getMessage('add_to_allowlist')}
                        </Button>
                    )}

                    {isBlockedService && serviceId && (
                        <Button
                            data-testid="query-log-detail-action-allow-service"
                            data-action="allow-service"
                            type="button"
                            variant="secondary"
                            size="small"
                            className={s.actionButton}
                            onClick={handleAllowService}
                        >
                            {intl.getMessage('allow_service')}
                        </Button>
                    )}
                </div>
            </div>
        </Dialog>
    );
};
