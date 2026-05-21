import React, { useMemo } from 'react';
import cn from 'clsx';

import intl from 'panel/common/intl';
import { AutoClient, NormalizedTopClients } from 'panel/initialState';
import { normalizeWhois } from 'panel/helpers/helpers';
import { LOCAL_STORAGE_KEYS, LocalStorageHelper } from 'panel/helpers/localStorageHelper';
import { Table as ReactTable, TableColumn } from 'panel/common/ui/Table';
import { Icon } from 'panel/common/ui/Icon';
import theme from 'panel/lib/theme';

import s from './RuntimeClientsTable.module.pcss';

const DEFAULT_PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = [5, 10, 20, 50, 100];

type Props = {
    autoClients: AutoClient[];
    normalizedTopClients?: NormalizedTopClients;
    loading?: boolean;
};

type WhoisValue = string | number | boolean | null | undefined;
type WhoisInfo = Record<string, WhoisValue>;

const formatWhoisLabel = (value: string) => value.replace(/_/g, ' ');

export const RuntimeClientsTable = ({
    autoClients,
    normalizedTopClients,
    loading = false,
}: Props) => {
    const pageSize = useMemo(
        () =>
            LocalStorageHelper.getItem(LOCAL_STORAGE_KEYS.AUTO_CLIENTS_PAGE_SIZE) ||
            DEFAULT_PAGE_SIZE,
        [],
    );

    const renderWhoisTooltip = (whoisInfo: WhoisInfo) => {
        const normalizedWhois = normalizeWhois(whoisInfo || {});
        const entries = Object.entries(normalizedWhois).filter(([, value]) => Boolean(value));

        if (entries.length === 0) {
            return <span>—</span>;
        }

        return (
            <div className={s.whoisCell}>
                <span className={s.whoisTrigger} tabIndex={0}>
                    {intl.getMessage('whois')}
                </span>

                <div className={s.tooltip}>
                    {entries.map(([key, value]) => (
                        <div key={key} className={s.tooltipRow}>
                            <span className={s.tooltipLabel}>{formatWhoisLabel(key)}:</span>
                            <span>{String(value)}</span>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const columns: TableColumn<AutoClient>[] = useMemo(
        () => [
            {
                key: 'ip',
                header: {
                    text: intl.getMessage('ip_address'),
                    className: s.headerCell,
                },
                accessor: 'ip',
                sortable: false,
                render: (value: string) => (
                    <div className={s.cell}>
                        <span className={s.cellLabel}>{intl.getMessage('ip_address')}</span>

                        <div className={s.cellValue}>
                            <span className={theme.common.textOverflow} title={value}>
                                {value}
                            </span>
                        </div>
                    </div>
                ),
            },
            {
                key: 'name',
                header: {
                    text: intl.getMessage('name_table_header'),
                    className: s.headerCell,
                },
                accessor: 'name',
                sortable: false,
                render: (value: string) => (
                    <div className={s.cell}>
                        <span className={s.cellLabel}>{intl.getMessage('name_table_header')}</span>

                        <div className={s.cellValue}>
                            <span className={theme.common.textOverflow} title={value || '—'}>
                                {value || '—'}
                            </span>
                        </div>
                    </div>
                ),
            },
            {
                key: 'source',
                header: {
                    text: intl.getMessage('source_label'),
                    className: s.headerCell,
                },
                accessor: 'source',
                sortable: false,
                render: (value: string) => (
                    <div className={s.cell}>
                        <span className={s.cellLabel}>{intl.getMessage('source_label')}</span>

                        <div className={s.cellValue}>
                            <span>{value || '—'}</span>
                        </div>
                    </div>
                ),
            },
            {
                key: 'whois',
                header: {
                    text: intl.getMessage('whois'),
                    className: s.headerCell,
                },
                accessor: 'whois_info',
                sortable: false,
                render: (value: WhoisInfo) => (
                    <div className={s.cell}>
                        <span className={s.cellLabel}>{intl.getMessage('whois')}</span>

                        <div className={s.cellValue}>{renderWhoisTooltip(value)}</div>
                    </div>
                ),
            },
            {
                key: 'requests',
                header: {
                    text: intl.getMessage('requests_count'),
                    className: s.headerCell,
                },
                sortable: false,
                render: (_value: unknown, row: AutoClient) => (
                    <div className={s.cell}>
                        <span className={s.cellLabel}>{intl.getMessage('requests_count')}</span>

                        <div className={s.cellValue}>
                            <span>
                                {(normalizedTopClients?.auto[row.ip] || 0).toLocaleString()}
                            </span>
                        </div>
                    </div>
                ),
            },
        ],
        [normalizedTopClients],
    );

    const handlePageSizeChange = (newSize: number) => {
        LocalStorageHelper.setItem(LOCAL_STORAGE_KEYS.AUTO_CLIENTS_PAGE_SIZE, newSize);
    };

    const emptyTableContent = (
        <div className={s.emptyTableContent}>
            <Icon icon="not_found_search" color="gray" className={s.emptyTableIcon} />

            <div className={cn(theme.text.t3, s.emptyTableDesc)}>
                {intl.getMessage('clients_not_found')}
            </div>
        </div>
    );

    return (
        <ReactTable<AutoClient>
            data={autoClients}
            className={s.table}
            columns={columns}
            emptyTable={emptyTableContent}
            loading={loading}
            sortable={false}
            pageSize={pageSize}
            pageSizeOptions={PAGE_SIZE_OPTIONS}
            onPageSizeChange={handlePageSizeChange}
            getRowId={(row) => row.ip}
        />
    );
};
