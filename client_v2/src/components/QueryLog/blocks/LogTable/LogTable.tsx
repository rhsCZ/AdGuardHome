import React, { useMemo, useCallback } from 'react';
import type { MouseEvent } from 'react';

import intl from 'panel/common/intl';
import { Table, TableColumn } from 'panel/common/ui/Table/Table';

import { LogEntry, Service } from 'panel/components/QueryLog/types';
import { hasPersistentClient, isBlockedReason } from 'panel/components/QueryLog/helpers';

import { Filter } from 'panel/helpers/helpers';
import { InfiniteScrollTrigger } from '../InfiniteScrollTrigger';
import { EmptyState } from '../EmptyState/EmptyState';
import { ClientCell, RequestCell, ReasonCell, StatusCell, TimeCell } from './blocks';

import s from './LogTable.module.pcss';
import { ActionsMenu } from '../ActionsMenu';

type Props = {
    logs: LogEntry[];
    isLogEnabled: boolean;
    hasMore: boolean;
    isLoadingMore: boolean;
    isRequestInFlight: boolean;
    onLoadMore: () => void;
    onRowClick: (entry: LogEntry) => void;
    onBlock: (domain: string) => void;
    onUnblock: (domain: string) => void;
    onBlockClient: (domain: string, client: string) => void;
    onDisallowClient: (ip: string) => void;
    onAddPersistentClient: (clientId: string) => void;
    onSearchSelect: (value: string) => void;
    filters: Filter[];
    services: Service[];
    whitelistFilters: Filter[];
    persistentClientIds: string[];
    persistentClientsLoaded: boolean;
};

export const LogTable = ({
    logs,
    isLogEnabled,
    hasMore,
    isLoadingMore,
    isRequestInFlight,
    onLoadMore,
    onRowClick,
    onBlock,
    onUnblock,
    onBlockClient,
    onDisallowClient,
    onAddPersistentClient,
    onSearchSelect,
    filters,
    services,
    whitelistFilters,
    persistentClientIds,
    persistentClientsLoaded,
}: Props) => {

    const handleSearchSelect = useCallback(
        (value: string) => (event: MouseEvent<HTMLButtonElement>) => {
            event.stopPropagation();
            onSearchSelect(value);
        },
        [onSearchSelect],
    );

    const columns: TableColumn<LogEntry>[] = useMemo(
        () => [
            {
                key: 'time',
                header: { text: intl.getMessage('time_table_header') },
                render: (_value: unknown, row: LogEntry) => <TimeCell row={row} />,
                width: 108,
                sortable: false,
            },
            {
                key: 'domain',
                header: { text: intl.getMessage('request_table_header') },
                render: (_value: unknown, row: LogEntry) => <RequestCell row={row} />,
                sortable: false,
            },
            {
                key: 'status',
                header: { text: intl.getMessage('status_table_header') },
                render: (_value: unknown, row: LogEntry) => <StatusCell row={row} />,
                width: 'minmax(108px, 0.7fr)',
                sortable: false,
            },
            {
                key: 'reason',
                header: { text: intl.getMessage('reason_table_header') },
                render: (_value: unknown, row: LogEntry) => {
                    return (
                        <ReasonCell
                            row={row}
                            filters={filters}
                            services={services}
                            whitelistFilters={whitelistFilters}
                        />
                    );
                },
                width: 'minmax(136px, 0.9fr)',
                sortable: false,
            },
            {
                key: 'client',
                header: { text: intl.getMessage('client_table_header') },
                render: (_value: unknown, row: LogEntry) => (
                    <ClientCell onSearchSelect={handleSearchSelect} row={row} />
                ),
                sortable: false,
            },
            {
                key: 'actions',
                header: { text: intl.getMessage('actions_table_header') },
                render: (_value: unknown, row: LogEntry) => (
                    <div
                        className={s.actionsCell}
                        data-testid="query-log-actions-cell"
                        data-domain={row.domain}
                        data-client={row.client}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <ActionsMenu
                            domain={row.domain}
                            client={row.client}
                            clientId={row.client_id || row.client}
                            onBlock={onBlock}
                            onUnblock={onUnblock}
                            onBlockClient={onBlockClient}
                            onDisallowClient={() => onDisallowClient(row.client)}
                            onAddPersistentClient={onAddPersistentClient}
                            isBlocked={isBlockedReason(row.reason)}
                            showAddPersistentClient={
                                persistentClientsLoaded && !hasPersistentClient(row, persistentClientIds)
                            }
                            testIdPrefix="query-log-row"
                        />
                    </div>
                ),
                width: 87,
                sortable: false,
            },
        ],
        [
            filters,
            handleSearchSelect,
            onAddPersistentClient,
            onBlock,
            onUnblock,
            onBlockClient,
            onDisallowClient,
            persistentClientIds,
            persistentClientsLoaded,
            services,
            whitelistFilters,
        ],
    );

    return (
        <div className={s.tableContainer}>
            <Table
                data={logs}
                columns={columns}
                emptyTable={(
                    <EmptyState
                        className={s.emptyTableWrapper}
                        isLogEnabled={isLogEnabled}
                        messageClassName={s.emptyTableTitle}
                    />
                )}
                pagination={false}
                sortable={false}
                className={s.table}
                onRowClick={onRowClick}
                tableRowClassName={s.tableRow}
                tableHeaderClassName={s.tableHeader}
            />

            {logs.length > 0 && (
                <InfiniteScrollTrigger
                    hasMore={hasMore}
                    loading={isLoadingMore}
                    disabled={isRequestInFlight}
                    onLoadMore={onLoadMore}
                    className={s.loadingRow}
                />
            )}
        </div>
    );
};
