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
};

const TooltipRow = ({ label, value }: TooltipRowProps) => (
    <div className={s.queryDetailsTooltipItem}>
        <span className={cn(s.queryDetailsTooltipLabel, theme.text.t3, theme.text.semibold)}>{label}</span>&nbsp;
        <span className={cn(s.queryDetailsTooltipValue, theme.text.t3)}>{value}</span>
    </div>
);

export const QueryDetailsTooltipContent = ({ row }: Props) => {
    const trackerSource = row.tracker?.sourceData;
    const displayDomain = row.unicodeName || row.domain;

    return (
        <div className={s.queryDetailsTooltipContent} onClick={(e) => e.stopPropagation()}>
            <div className={cn(s.queryDetailsTooltipTitle, theme.text.t2, theme.text.semibold)}>
                {intl.getMessage('query_details')}
            </div>

            <div className={s.queryDetailsTooltipSection}>
                <TooltipRow label={intl.getMessage('query_log_detail_time')} value={formatLogTimeDetailed(row.time)} />
                <TooltipRow label={intl.getMessage('query_log_detail_date')} value={formatLogDate(row.time)} />
                <TooltipRow label={intl.getMessage('query_log_detail_domain')} value={displayDomain} />
                <TooltipRow label={intl.getMessage('query_log_detail_type')} value={row.type} />
                <TooltipRow label={intl.getMessage('query_log_detail_protocol')} value={getProtocolName(row.client_proto)} />
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
                    >
                        {intl.getMessage('known_tracker')}
                    </div>

                    <div className={s.queryDetailsTooltipSection}>
                        <TooltipRow label={intl.getMessage('query_log_detail_name')} value={row.tracker.name} />
                        <TooltipRow label={intl.getMessage('query_log_detail_category')} value={captitalizeWords(row.tracker.category)} />
                        {trackerSource?.name && (
                            <TooltipRow
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
