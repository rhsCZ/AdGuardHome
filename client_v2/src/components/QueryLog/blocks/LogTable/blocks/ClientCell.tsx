import React, { MouseEvent } from 'react';
import cn from 'clsx';

import { Icon } from 'panel/common/ui/Icon';
import theme from 'panel/lib/theme';
import { getClientLocation } from 'panel/components/QueryLog/helpers';
import { LogEntry } from 'panel/components/QueryLog/types';

import s from '../LogTable.module.pcss';

type Props = {
    onSearchSelect: (value: string) => (event: MouseEvent<HTMLButtonElement>) => void;
    row: LogEntry;
};

export const ClientCell = ({ onSearchSelect, row }: Props) => {
    const clientName = row.client_info?.name || '';
    const clientLocation = getClientLocation(row.client_info?.whois);

    return (
        <div
            className={s.clientCell}
            data-testid="query-log-client-cell"
            data-client-ip={row.client}
            data-client-name={clientName || undefined}
            data-client-location={clientLocation || undefined}
        >
            <div className={s.clientPrimary}>
                <button
                    data-testid="query-log-client-ip-button"
                    data-value={row.client}
                    type="button"
                    className={cn(s.clientButtonPlain, s.clientIp, theme.text.t3)}
                    title={row.client}
                    onClick={onSearchSelect(row.client)}
                >
                    {row.client}
                </button>
            </div>
            <div className={s.clientSecondary}>
                {clientName && (
                    <button
                        data-testid="query-log-client-name-button"
                        data-value={clientName}
                        type="button"
                        className={cn(s.clientButtonPlain, s.clientName, theme.text.t4)}
                        title={clientName}
                        onClick={onSearchSelect(clientName)}
                    >
                        {clientName}
                    </button>
                )}

                {clientName && clientLocation && (
                    <span
                        className={s.clientLocationDivider}
                        data-testid="query-log-client-location-divider"
                    />
                )}

                {clientLocation && (
                    <span
                        className={s.clientLocation}
                        data-testid="query-log-client-location"
                        title={clientLocation}
                    >
                        <Icon
                            icon="location"
                            className={s.clientLocationIcon}
                        />
                        <span className={cn(s.clientLocationText, theme.text.t4)}>{clientLocation}</span>
                    </span>
                )}
            </div>
        </div>
    );
};
