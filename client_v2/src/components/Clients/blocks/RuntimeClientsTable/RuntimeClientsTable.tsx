import React, { useMemo } from 'react';
import cn from 'clsx';

import intl from 'panel/common/intl';
import { AutoClient, NormalizedTopClients } from 'panel/initialState';
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

const renderWhoisCell = (whoisInfo: WhoisInfo, ip: string) => {
    const raw = whoisInfo || {};
    const country = raw.country as string | undefined;
    const orgname = (raw.orgname || raw.org) as string | undefined;
    const hasData = country || orgname;

    if (!hasData) {
        return <span>-</span>;
    }

    const stripHtml = (str: string) => str.replace(/<\/?span>/g, '');

    return (
        <div className={s.whoisCell}>
            <div className={s.whoisInline}>
                {country && (
                    <span className={s.whoisRow}>
                        <Icon icon="location" color="green" className={s.whoisIcon} />
                        <span className={s.whoisText}>{country}</span>
                    </span>
                )}
                {orgname && (
                    <span className={s.whoisRow}>
                        <Icon icon="wifi" color="green" className={s.whoisIcon} />
                        <span className={cn(theme.common.textOverflow, s.whoisText)}>
                            {orgname}
                        </span>
                    </span>
                )}
            </div>

            <div className={s.tooltip}>
                <div className={s.tooltipTitle}>
                    {intl.getMessage('client_details')}
                </div>
                <div className={s.tooltipRow}>
                    {stripHtml(
                        intl.getMessage('query_log_detail_address', {
                            value: ip,
                            span: (v: string) => v,
                        }),
                    )}
                </div>
                {country && (
                    <div className={s.tooltipRow}>
                        {stripHtml(
                            intl.getMessage('query_log_detail_country', {
                                value: country,
                                span: (v: string) => v,
                            }),
                        )}
                    </div>
                )}
                {orgname && (
                    <div className={s.tooltipRow}>
                        {stripHtml(
                            intl.getMessage('query_log_detail_network', {
                                value: orgname,
                                span: (v: string) => v,
                            }),
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

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

    const columns: TableColumn<AutoClient>[] = useMemo(
        () => [
            {
                key: 'ip',
                header: {
                    text: intl.getMessage('ip_address'),
                    className: s.headerCell,
                },
                accessor: 'ip',
                sortable: true,
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
                sortable: true,
                render: (value: string) => (
                    <div className={s.cell}>
                        <span className={s.cellLabel}>{intl.getMessage('name_table_header')}</span>

                        <div className={s.cellValue}>
                            <span className={theme.common.textOverflow} title={value || '-'}>
                                {value || '-'}
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
                sortable: true,
                render: (value: string) => (
                    <div className={s.cell}>
                        <span className={s.cellLabel}>{intl.getMessage('source_label')}</span>

                        <div className={s.cellValue}>
                            <span>{value || '-'}</span>
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
                render: (value: WhoisInfo, row: AutoClient) => (
                    <div className={s.cell}>
                        <span className={s.cellLabel}>{intl.getMessage('whois')}</span>

                        <div className={s.cellValue}>{renderWhoisCell(value, row.ip)}</div>
                    </div>
                ),
            },
            {
                key: 'requests',
                header: {
                    text: intl.getMessage('requests_table_header'),
                    className: s.headerCell,
                },
                accessor: (row: AutoClient) => normalizedTopClients?.auto[row.ip] || 0,
                sortable: true,
                render: (_value: unknown, row: AutoClient) => (
                    <div className={s.cell}>
                        <span className={s.cellLabel}>{intl.getMessage('requests_table_header')}</span>

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
            pageSize={pageSize}
            pageSizeOptions={PAGE_SIZE_OPTIONS}
            onPageSizeChange={handlePageSizeChange}
            getRowId={(row) => row.ip}
        />
    );
};
