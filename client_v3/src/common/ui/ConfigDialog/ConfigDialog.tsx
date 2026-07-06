import { type JSX, splitProps } from 'solid-js';
import cn from 'clsx';

import { Dialog } from 'panel/common/ui/Dialog';
import { Button } from 'panel/common/ui/Button';
import intl from 'panel/common/intl';

import s from './ConfigDialog.module.pcss';

type Props = {
    open: boolean;
    title: string;
    onClose: () => void;
    onSubmit: () => void;
    processing?: boolean;
    dirty?: boolean;
    submitDisabled?: boolean;
    class?: string;
    children?: JSX.Element;
    footer?: JSX.Element;
    description?: string;
};

export const ConfigDialog = (props: Props) => {
    const [local] = splitProps(props, [
        'open',
        'title',
        'onClose',
        'onSubmit',
        'processing',
        'dirty',
        'submitDisabled',
        'class',
        'children',
        'footer',
        'description',
    ]);

    const isDisabled = () => !!local.processing || !!local.submitDisabled;

    return (
        <Dialog
            visible={local.open}
            onClose={local.onClose}
            title={local.title}
            wrapClass={cn('rc-dialog-update', s.configDialog, local.class)}
        >
            {local.description && <div class={s.description}>{local.description}</div>}

            <fieldset disabled={!!local.processing} class={s.body}>
                {local.children}
            </fieldset>
            <div class={s.footer}>
                {local.footer}
                <Button
                    variant="primary"
                    class={s.saveButton}
                    disabled={isDisabled()}
                    data-testid="config-dialog-save"
                    onClick={local.onSubmit}
                >
                    {intl.getMessage('save')}
                </Button>
            </div>
        </Dialog>
    );
};
