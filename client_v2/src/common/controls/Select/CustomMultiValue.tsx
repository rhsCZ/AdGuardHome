import React from 'react';
import { components, MultiValueProps } from 'react-select';
import intl from 'panel/common/intl';
import { Icon } from 'panel/common/ui/Icon';

import s from './CustomMultiValue.module.pcss';

export const CustomMultiValue = <T extends Record<string, any> = any>(
    props: MultiValueProps<T, true>,
) => {
    const { data, removeProps } = props;
    const label = data.label as string;

    return (
        <components.MultiValue {...props}>
            <div className={s.pill}>
                <span className={s.label}>{label}</span>
                <button
                    type="button"
                    className={s.removeBtn}
                    onClick={
                        removeProps.onClick as unknown as React.MouseEventHandler<HTMLButtonElement>
                    }
                    onMouseDown={
                        removeProps.onMouseDown as unknown as React.MouseEventHandler<HTMLButtonElement>
                    }
                    onTouchEnd={
                        removeProps.onTouchEnd as unknown as React.TouchEventHandler<HTMLButtonElement>
                    }
                    aria-label={intl.getMessage('remove_tag', { value: label })}
                >
                    <Icon icon="cross" color="gray" />
                </button>
            </div>
        </components.MultiValue>
    );
};
