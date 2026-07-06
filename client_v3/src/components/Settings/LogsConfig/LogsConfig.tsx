import { createSignal, createEffect, Show } from 'solid-js';

import { ConfirmDialog } from 'panel/common/ui/ConfirmDialog';
import { ConfigDialog } from 'panel/common/ui/ConfigDialog';
import intl from 'panel/common/intl';
import { formatIntervalText } from 'panel/components/Settings/helpers';
import { setLogsConfig, queryLogsState } from 'panel/stores/queryLogs';
import { HOUR } from 'panel/helpers/constants';

import { Form, FormValues } from './Form';

export type LogsConfigPayload = {
    interval: number;
};

type Props = {
    interval: number;
    customInterval?: number;
    processing: boolean;
    modalOpen: boolean;
    onModalClose: () => void;
};

export const LogsConfig = (props: Props) => {
    const [formValues, setFormValues] = createSignal<FormValues>({
        interval: 0,
        customInterval: null,
    });
    const [confirmConfig, setConfirmConfig] = createSignal<LogsConfigPayload | null>(null);

    // Reset form values when modal opens
    createEffect(() => {
        if (props.modalOpen) {
            setFormValues({
                interval: props.interval,
                customInterval: props.customInterval,
            });
        }
    });

    const handleFormChange = (values: FormValues) => {
        setFormValues(values);
    };

    const handleSave = () => {
        const values = formValues();
        const newInterval = values.customInterval
            ? values.customInterval >= HOUR
                ? values.customInterval
                : values.customInterval * HOUR
            : values.interval;

        // If decreasing retention, show confirmation
        if (newInterval < props.interval) {
            setConfirmConfig({ interval: newInterval });
        } else {
            // Save with all required fields from current state
            setLogsConfig({
                enabled: queryLogsState.enabled,
                anonymize_client_ip: queryLogsState.anonymize_client_ip,
                ignored: queryLogsState.ignored,
                ignored_enabled: queryLogsState.ignored_enabled,
                interval: newInterval,
                customInterval: values.customInterval,
            });
            props.onModalClose();
        }
    };

    const handleConfirmDecrease = () => {
        const config = confirmConfig();
        if (config) {
            setLogsConfig({
                enabled: queryLogsState.enabled,
                anonymize_client_ip: queryLogsState.anonymize_client_ip,
                ignored: queryLogsState.ignored,
                ignored_enabled: queryLogsState.ignored_enabled,
                interval: config.interval,
                customInterval: formValues().customInterval,
            });
            props.onModalClose();
        }
        setConfirmConfig(null);
    };

    return (
        <>
            <ConfigDialog
                open={props.modalOpen}
                title={intl.getMessage('query_log_retention')}
                onClose={props.onModalClose}
                onSubmit={handleSave}
                processing={props.processing}
            >
                <Form
                    initialValues={{
                        interval: props.interval,
                        customInterval: props.customInterval,
                    }}
                    processing={props.processing}
                    onValuesChange={handleFormChange}
                />
            </ConfigDialog>

            <Show when={confirmConfig()}>
                {(config) => (
                    <ConfirmDialog
                        onClose={() => setConfirmConfig(null)}
                        onConfirm={handleConfirmDecrease}
                        buttonText={intl.getMessage('settings_yes_decrease')}
                        cancelText={intl.getMessage('cancel')}
                        title={intl.getMessage('settings_confirm_decrease_log_rotation_interval')}
                        text={intl.getMessage(
                            'settings_confirm_decrease_log_rotation_interval_desc',
                            {
                                value: formatIntervalText(config().interval),
                            },
                        )}
                        buttonVariant="danger"
                    />
                )}
            </Show>
        </>
    );
};
