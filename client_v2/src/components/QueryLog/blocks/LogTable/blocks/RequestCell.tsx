import React from 'react';
import cn from 'clsx';

import intl from 'panel/common/intl';
import { Dropdown } from 'panel/common/ui/Dropdown';
import theme from 'panel/lib/theme';
import { Icon } from 'panel/common/ui/Icon';
import { getProtocolName } from 'panel/components/QueryLog/helpers';
import { QueryDetailsTooltipContent } from 'panel/components/QueryLog/blocks/LogTable/blocks/QueryDetailsTooltipContent';
import { LogEntry } from 'panel/components/QueryLog/types';

import s from '../LogTable.module.pcss';

type Props = {
    row: LogEntry;
};

export const RequestCell = ({ row }: Props) => {
    const renderDnsSec = () => {
        if (!row.answer_dnssec) {
            return null;
        }

        return (
            <Dropdown
                trigger="hover"
                position="bottomLeft"
                overlayClassName={s.iconTooltipOverlay}
                menu={<div className={cn(theme.dropdown.menu, s.iconTooltipMenu)}>{intl.getMessage('validated_with_dnssec')}</div>}
                childrenClassName={s.iconTooltipTrigger}
                noIcon
            >
                <Icon icon="lock" color="green" className={s.requestIcon} data-testid="query-log-request-dnssec-icon" />
            </Dropdown>
        );
    }

    return (
        <div
            className={s.requestCell}
            data-testid="query-log-request-cell"
            data-domain={row.domain}
            data-type={row.type}
            data-protocol={row.client_proto}
            data-has-dnssec={String(row.answer_dnssec)}
            data-has-tracker={String(Boolean(row.tracker))}
        >
            <div className={s.requestContent} data-testid="query-log-request-content">
                <div className={s.requestPrimary}>
                    <span
                        className={cn(s.domain, theme.text.t3)}
                        title={row.unicodeName || row.domain}
                        data-testid="query-log-request-domain"
                    >
                        {row.unicodeName || row.domain}
                    </span>

                    <div className={s.requestIcons} data-testid="query-log-request-icons">
                        <Dropdown
                            trigger="hover"
                            position="bottomLeft"
                            overlayClassName={s.iconTooltipOverlay}
                            menu={(
                                <div className={cn(theme.dropdown.menu, s.queryDetailsTooltipMenu)}>
                                    <QueryDetailsTooltipContent row={row} />
                                </div>
                            )}
                            childrenClassName={s.iconTooltipTrigger}
                            noIcon
                        >
                            <button
                                type="button"
                                className={s.queryDetailsTooltipButton}
                                data-testid="query-log-query-details-trigger"
                                data-domain={row.domain}
                                aria-label={intl.getMessage('query_details')}
                                title={intl.getMessage('query_details')}
                                onClick={(event) => event.stopPropagation()}
                            >
                                <Icon
                                    icon="tracking"
                                    color={row.tracker ? 'green' : 'gray'}
                                    className={s.requestIcon}
                                    data-testid="query-log-request-tracker-icon"
                                />
                            </button>
                        </Dropdown>

                        {renderDnsSec()}
                    </div>
                </div>
                <span className={cn(s.secondaryLine, theme.text.t4)}>
                    {intl.getMessage('type_value', { value: row.type })}, {getProtocolName(row.client_proto)}
                </span>
            </div>
        </div>
    );
};
