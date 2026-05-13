import React from 'react';
import cn from 'clsx';

import intl from 'panel/common/intl';
import { captitalizeWords } from 'panel/helpers/helpers';
import theme from 'panel/lib/theme';
import {
    formatLogDate,
    formatLogTimeDetailed,
    getProtocolName,
} from 'panel/components/QueryLog/helpers';
import { LogEntry } from 'panel/components/QueryLog/types';

import s from '../LogTable.module.pcss';

type Props = {
    row: LogEntry;
};

type TooltipRowProps = {
    label: string;
    value: React.ReactNode;
    testId: string;
};

const TooltipRow = ({ label, value, testId }: TooltipRowProps) => (
    <div className={s.queryDetailsTooltipItem} data-testid={testId}>
        <span className={cn(s.queryDetailsTooltipLabel, theme.text.t3, theme.text.semibold)}>{label}</span>&nbsp;
        <span className={cn(s.queryDetailsTooltipValue, theme.text.t3)}>{value}</span>
    </div>
);

export const QueryDetailsTooltipContent = ({ row }: Props) => {
    const trackerSource = row.tracker?.sourceData;
    const displayDomain = row.unicodeName || row.domain;

    return (
        <div
            className={s.queryDetailsTooltipContent}
            data-testid="query-log-query-details-tooltip"
            data-domain={row.domain}
            data-has-tracker={String(Boolean(row.tracker))}
            onClick={(e) => e.stopPropagation()}
        >
            <div className={cn(s.queryDetailsTooltipTitle, theme.text.t2, theme.text.semibold)}>
                {intl.getMessage('query_details')}
            </div>

            <div className={s.queryDetailsTooltipSection}>
                <TooltipRow
                    testId="query-log-query-details-time"
                    label={intl.getMessage('query_log_detail_time')}
                    value={formatLogTimeDetailed(row.time)}
                />
                <TooltipRow
                    testId="query-log-query-details-date"
                    label={intl.getMessage('query_log_detail_date')}
                    value={formatLogDate(row.time)}
                />
                <TooltipRow
                    testId="query-log-query-details-domain"
                    label={intl.getMessage('query_log_detail_domain')}
                    value={displayDomain}
                />
                <TooltipRow
                    testId="query-log-query-details-type"
                    label={intl.getMessage('query_log_detail_type')}
                    value={row.type}
                />
                <TooltipRow
                    testId="query-log-query-details-protocol"
                    label={intl.getMessage('query_log_detail_protocol')}
                    value={getProtocolName(row.client_proto)}
                />
            </div>

            {row.tracker && (
                <>
                    <div
                        className={cn(
                            s.queryDetailsTooltipTitle,
                            s.queryDetailsTooltipTitleSeparated,
                            theme.text.t2,
                            theme.text.semibold,
                        )}
                        data-testid="query-log-query-details-known-tracker"
                    >
                        {intl.getMessage('known_tracker')}
                    </div>

                    <div className={s.queryDetailsTooltipSection}>
                        <TooltipRow
                            testId="query-log-query-details-tracker-name"
                            label={intl.getMessage('query_log_detail_name')}
                            value={row.tracker.name}
                        />
                        <TooltipRow
                            testId="query-log-query-details-tracker-category"
                            label={intl.getMessage('query_log_detail_category')}
                            value={captitalizeWords(row.tracker.category)}
                        />
                        {trackerSource?.name && (
                            <TooltipRow
                                testId="query-log-query-details-tracker-source"
                                label={intl.getMessage('query_log_detail_source')}
                                value={trackerSource.url ? (
                                    <a
                                        href={trackerSource.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={cn(s.queryDetailsTooltipLink, theme.status.statusGreen)}
                                    >
                                        {trackerSource.name}
                                    </a>
                                ) : (
                                    <span className={theme.status.statusGreen}>{trackerSource.name}</span>
                                )}
                            />
                        )}
                    </div>
                </>
            )}
        </div>
    );
};
