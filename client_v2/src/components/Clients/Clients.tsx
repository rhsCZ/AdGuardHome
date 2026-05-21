import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import cn from 'clsx';

import intl from 'panel/common/intl';
import { ConfirmDialog } from 'panel/common/ui/ConfirmDialog';
import { Icon } from 'panel/common/ui/Icon';
import { getClients } from 'panel/actions';
import { deleteClient, toggleClientModal } from 'panel/actions/clients';
import { getStats } from 'panel/actions/stats';
import { MODAL_TYPE } from 'panel/helpers/constants';
import { RootState } from 'panel/initialState';
import theme from 'panel/lib/theme';

import { PersistentClientsTable } from './blocks/PersistentClientsTable/PersistentClientsTable';
import { RuntimeClientsTable } from './blocks/RuntimeClientsTable/RuntimeClientsTable';
import s from './Clients.module.pcss';

export const Clients = () => {
    const dispatch = useDispatch();
    const [clientNameToDelete, setClientNameToDelete] = useState('');

    const dashboard = useSelector((state: RootState) => state.dashboard);
    const stats = useSelector((state: RootState) => state.stats);
    const clientsState = useSelector((state: RootState) => state.clients);

    const clients = dashboard?.clients || [];
    const autoClients = dashboard?.autoClients || [];
    const processingClients = dashboard?.processingClients || false;
    const processingStats = stats?.processingStats || false;
    const normalizedTopClients = stats?.normalizedTopClients;
    const processingDeleting = clientsState?.processingDeleting || false;

    useEffect(() => {
        dispatch(getClients());
        dispatch(getStats());
    }, [dispatch]);

    const handleAddClient = () => {
        dispatch(toggleClientModal({ type: MODAL_TYPE.ADD_CLIENT }));
    };

    const handleEditClient = (name: string) => {
        dispatch(toggleClientModal({ type: MODAL_TYPE.EDIT_CLIENT, name }));
    };

    const handleDeleteClient = (name: string) => {
        setClientNameToDelete(name);
    };

    const handleDeleteClose = () => {
        setClientNameToDelete('');
    };

    const handleDeleteConfirm = () => {
        dispatch(deleteClient({ name: clientNameToDelete }));
        handleDeleteClose();
    };

    const isLoading = processingClients || processingStats;

    return (
        <div className={theme.layout.container}>
            <div className={theme.layout.containerIn}>
                <div className={s.header}>
                    <h1 className={cn(theme.layout.title, theme.title.h4, theme.title.h3_tablet)}>
                        {intl.getMessage('client_settings')}
                    </h1>

                    <button
                        type="button"
                        onClick={handleAddClient}
                        className={cn(s.button, s.button_add)}
                    >
                        <Icon icon="plus" color="green" />
                        {intl.getMessage('client_add')}
                    </button>
                </div>

                <div className={s.section}>
                    <h2 className={cn(theme.title.h5, s.sectionTitle)}>
                        {intl.getMessage('clients_title')}
                    </h2>
                    <div className={s.desc}>{intl.getMessage('clients_desc')}</div>
                </div>

                <div className={cn(s.section, s.sectionStretch)}>
                    <PersistentClientsTable
                        clients={clients}
                        normalizedTopClients={normalizedTopClients}
                        loading={isLoading}
                        onEdit={handleEditClient}
                        onDelete={handleDeleteClient}
                        deleteDisabled={processingDeleting}
                    />
                </div>

                <div className={s.section}>
                    <h2 className={cn(theme.title.h5, s.sectionTitle)}>
                        {intl.getMessage('auto_clients_title')}
                    </h2>
                    <div className={s.desc}>{intl.getMessage('auto_clients_desc')}</div>
                </div>

                <div className={cn(s.section, s.sectionStretch)}>
                    <RuntimeClientsTable
                        autoClients={autoClients}
                        normalizedTopClients={normalizedTopClients}
                        loading={isLoading}
                    />
                </div>

                {clientNameToDelete && (
                    <ConfirmDialog
                        onClose={handleDeleteClose}
                        onConfirm={handleDeleteConfirm}
                        submitDisabled={processingDeleting}
                        buttonText={intl.getMessage('remove')}
                        cancelText={intl.getMessage('cancel')}
                        title={intl.getMessage('remove')}
                        text={intl.getMessage('client_confirm_delete', { key: clientNameToDelete })}
                        buttonVariant="danger"
                    />
                )}
            </div>
        </div>
    );
};
