import React, { ReactNode } from 'react';
import cn from 'clsx';

import intl from 'panel/common/intl';
import { Icon, IconType } from 'panel/common/ui/Icon';
import { Link } from 'panel/common/ui/Link';
import { RoutePath } from 'panel/components/Routes/Paths';

import theme from 'panel/lib/theme';
import s from './EmptyState.module.pcss';

type Variant = 'default' | 'disabled' | 'rotation-disabled';

type Props = {
    className?: string;
    isLogEnabled: boolean;
    messageClassName?: string;
};

const getEmptyState = (isLogEnabled: boolean): {
    message: ReactNode;
    variant: Variant;
    icon: IconType;
} => {
    if (!isLogEnabled) {
        return {
            message: intl.getMessage('query_log_nothing_available_rotation', {
                a: (text: string) => <Link to={RoutePath.SettingsPage}>{text}</Link>,
            }),
            variant: 'disabled',
            icon: 'settings_info',
        };
    }

    return {
        message: intl.getMessage('query_log_nothing_available'),
        variant: 'default',
        icon: 'not_found_search',
    };
};

export const EmptyState = ({
    className,
    isLogEnabled,
    messageClassName,
}: Props) => {
    const { message, variant, icon } = getEmptyState(isLogEnabled);

    return (
        <div
            className={cn(s.root, className)}
            data-testid="query-log-empty-state"
            data-empty-state-variant={variant}
        >
            <div className={s.iconWrap} data-testid="query-log-empty-state-icon">
                <Icon icon={icon} color="gray" className={s.icon} />
            </div>

            <div className={cn(s.message, theme.text.t2, messageClassName)}>{message}</div>
        </div>
    );
};
