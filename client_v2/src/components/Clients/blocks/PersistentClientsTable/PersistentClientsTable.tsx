import React, { useMemo } from 'react';
import cn from 'clsx';

import intl from 'panel/common/intl';
import { Client, NormalizedTopClients } from 'panel/initialState';
import { LOCAL_STORAGE_KEYS, LocalStorageHelper } from 'panel/helpers/localStorageHelper';
import { Table as ReactTable, TableColumn } from 'panel/common/ui/Table';
import { Icon } from 'panel/common/ui/Icon';
import theme from 'panel/lib/theme';

import s from './PersistentClientsTable.module.pcss';

const DEFAULT_PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = [5, 10, 20, 50, 100];

type Props = {
    clients: Client[];
    normalizedTopClients?: NormalizedTopClients;
    loading?: boolean;
    onEdit: (name: string) => void;
    onDelete: (name: string) => void;
    editDisabled?: boolean;
    deleteDisabled?: boolean;
};

export const PersistentClientsTable = ({
    clients,
    normalizedTopClients,
    loading = false,
    onEdit,
    onDelete,
    editDisabled = false,
    deleteDisabled = false,
}: Props) => {
    const pageSize = useMemo(
        () => LocalStorageHelper.getItem(LOCAL_STORAGE_KEYS.CLIENTS_PAGE_SIZE) || DEFAULT_PAGE_SIZE,
        [],
    );

    const columns: TableColumn<Client>[] = useMemo(
        () => [
            {
                key: 'ids',
                header: {
                    text: intl.getMessage('client_identifier'),
                    className: s.headerCell,
                },
                accessor: 'ids',
                sortable: false,
                render: (value: string[]) => (
                    <div className={s.cell}>
                        <span className={s.cellLabel}>{intl.getMessage('client_identifier')}</span>

                        <div className={s.cellValue}>
                            <div className={s.ids}>
                                {value.map((id) => (
                                    <span key={id} className={theme.common.textOverflow} title={id}>
                                        {id}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                ),
            },
            {
                key: 'name',
                header: {
                    text: intl.getMessage('name'),
                    className: s.headerCell,
                },
                accessor: 'name',
                sortable: false,
                render: (value: string) => (
                    <div className={s.cell}>
                        <span className={s.cellLabel}>{intl.getMessage('name')}</span>

                        <div className={s.cellValue}>
                            <span className={theme.common.textOverflow} title={value}>
                                {value}
                            </span>
                        </div>
                    </div>
                ),
            },
            {
                key: 'settings',
                header: {
                    text: intl.getMessage('settings'),
                    className: s.headerCell,
                },
                accessor: 'use_global_settings',
                sortable: false,
                render: (value: boolean) => (
                    <div className={s.cell}>
                        <span className={s.cellLabel}>{intl.getMessage('settings')}</span>

                        <div className={s.cellValue}>
                            <span>
                                {intl.getMessage(value ? 'settings_global' : 'settings_custom')}
                            </span>
                        </div>
                    </div>
                ),
            },
            {
                key: 'blocked_services',
                header: {
                    text: intl.getMessage('blocked_services'),
                    className: s.headerCell,
                },
                accessor: 'use_global_blocked_services',
                sortable: false,
                render: (value: boolean) => (
                    <div className={s.cell}>
                        <span className={s.cellLabel}>{intl.getMessage('blocked_services')}</span>

                        <div className={s.cellValue}>
                            <span>
                                {intl.getMessage(value ? 'settings_global' : 'settings_custom')}
                            </span>
                        </div>
                    </div>
                ),
            },
            {
                key: 'upstreams',
                header: {
                    text: intl.getMessage('upstreams'),
                    className: s.headerCell,
                },
                accessor: 'upstreams',
                sortable: false,
                render: (value: string[]) => (
                    <div className={s.cell}>
                        <span className={s.cellLabel}>{intl.getMessage('upstreams')}</span>

                        <div className={s.cellValue}>
                            <span>
                                {intl.getMessage(
                                    value.length > 0 ? 'settings_custom' : 'settings_global',
                                )}
                            </span>
                        </div>
                    </div>
                ),
            },
            {
                key: 'tags',
                header: {
                    text: intl.getMessage('tags_title'),
                    className: s.headerCell,
                },
                accessor: 'tags',
                sortable: false,
                render: (value: string[]) => (
                    <div className={s.cell}>
                        <span className={s.cellLabel}>{intl.getMessage('tags_title')}</span>

                        <div className={s.cellValue}>
                            {value.length > 0 ? (
                                <div className={s.tags}>
                                    {value.map((tag) => (
                                        <span key={tag} className={s.tag}>
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            ) : (
                                <span>—</span>
                            )}
                        </div>
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
                render: (_value: unknown, row: Client) => (
                    <div className={s.cell}>
                        <span className={s.cellLabel}>{intl.getMessage('requests_count')}</span>

                        <div className={s.cellValue}>
                            <span>
                                {(normalizedTopClients?.configured[row.name] || 0).toLocaleString()}
                            </span>
                        </div>
                    </div>
                ),
            },
            {
                key: 'actions',
                header: {
                    text: intl.getMessage('actions_table_header'),
                    className: s.headerCell,
                },
                sortable: false,
                fitContent: true,
                render: (_value: unknown, row: Client) => (
                    <div className={s.cell}>
                        <span className={s.cellLabel}>
                            {intl.getMessage('actions_table_header')}
                        </span>

                        <div className={s.cellValue}>
                            <div className={s.cellActions}>
                                <button
                                    type="button"
                                    onClick={() => onEdit(row.name)}
                                    disabled={editDisabled}
                                    className={s.action}
                                    title={intl.getMessage('edit_table_action')}
                                >
                                    <Icon icon="edit" color="gray" />
                                </button>

                                <button
                                    type="button"
                                    onClick={() => onDelete(row.name)}
                                    disabled={deleteDisabled}
                                    className={cn(s.action, s.action_danger)}
                                    title={intl.getMessage('delete_table_action')}
                                >
                                    <Icon icon="delete" color="red" />
                                </button>
                            </div>
                        </div>
                    </div>
                ),
            },
        ],
        [deleteDisabled, editDisabled, normalizedTopClients, onDelete, onEdit],
    );

    const handlePageSizeChange = (newSize: number) => {
        LocalStorageHelper.setItem(LOCAL_STORAGE_KEYS.CLIENTS_PAGE_SIZE, newSize);
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
        <ReactTable<Client>
            data={clients}
            className={s.table}
            columns={columns}
            emptyTable={emptyTableContent}
            loading={loading}
            sortable={false}
            pageSize={pageSize}
            pageSizeOptions={PAGE_SIZE_OPTIONS}
            onPageSizeChange={handlePageSizeChange}
            getRowId={(row) => row.name}
        />
    );
};
