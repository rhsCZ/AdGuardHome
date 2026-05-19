import React, { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';

import intl from 'panel/common/intl';
import { Input } from 'panel/common/controls/Input';
import { Button } from 'panel/common/ui/Button';
import { Dialog } from 'panel/common/ui/Dialog';
import theme from 'panel/lib/theme';

import { RewriteEntry } from '../types';

type Props = {
    visible: boolean;
    initialValue: RewriteEntry | null;
    processing: boolean;
    onClose: () => void;
    onSubmit: (values: RewriteEntry) => void;
};

export const RewriteDialog = ({ visible, initialValue, processing, onClose, onSubmit }: Props) => {
    const { control, handleSubmit, reset } = useForm<RewriteEntry>({
        defaultValues: initialValue || {
            domain: '',
            answer: '',
            enabled: false,
        },
        mode: 'onBlur',
    });

    useEffect(() => {
        reset(
            initialValue || {
                domain: '',
                answer: '',
                enabled: false,
            },
        );
    }, [initialValue, reset]);

    if (!visible) {
        return null;
    }

    return (
        <Dialog visible onClose={onClose} title={intl.getMessage('rewrite_edit')}>
            <form onSubmit={handleSubmit(onSubmit)}>
                <div className={theme.form.group}>
                    <Controller
                        name="domain"
                        control={control}
                        rules={{ required: intl.getMessage('form_error_required') }}
                        render={({ field, fieldState }) => (
                            <Input
                                {...field}
                                id="user-rules-rewrite-domain"
                                type="text"
                                label={intl.getMessage('domain')}
                                errorMessage={fieldState.error?.message}
                            />
                        )}
                    />

                    <Controller
                        name="answer"
                        control={control}
                        rules={{ required: intl.getMessage('form_error_required') }}
                        render={({ field, fieldState }) => (
                            <Input
                                {...field}
                                id="user-rules-rewrite-answer"
                                type="text"
                                label={intl.getMessage('answer')}
                                errorMessage={fieldState.error?.message}
                            />
                        )}
                    />
                </div>

                <div className={theme.dialog.footer}>
                    <Button
                        type="submit"
                        variant="primary"
                        size="small"
                        disabled={processing}
                        className={theme.dialog.button}
                    >
                        {intl.getMessage('save')}
                    </Button>

                    <Button
                        type="button"
                        variant="secondary"
                        size="small"
                        onClick={onClose}
                        className={theme.dialog.button}
                    >
                        {intl.getMessage('cancel')}
                    </Button>
                </div>
            </form>
        </Dialog>
    );
};
