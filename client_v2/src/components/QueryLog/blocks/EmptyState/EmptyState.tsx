import React, { ReactNode } from 'react';
import cn from 'clsx';

import intl from 'panel/common/intl';
import { Icon } from 'panel/common/ui/Icon';
import { Link } from 'panel/common/ui/Link';
import { RoutePath } from 'panel/components/Routes/Paths';

import s from './EmptyState.module.pcss';

type Variant = 'default' | 'filtered' | 'rotation-disabled';

type Props = {
    className?: string;
    hasActiveFilters: boolean;
    isLogRotationDisabled: boolean;
    messageClassName?: string;
};

const getEmptyState = (hasActiveFilters: boolean, isLogRotationDisabled: boolean): {
    message: ReactNode;
    variant: Variant;
} => {
    if (hasActiveFilters) {
        return {
            message: intl.getMessage('no_logs_found'),
            variant: 'filtered',
        };
    }

    if (isLogRotationDisabled) {
        return {
            message: intl.getMessage('query_log_nothing_available_rotation', {
                a: (text: string) => <Link to={RoutePath.SettingsPage}>{text}</Link>,
            }),
            variant: 'rotation-disabled',
        };
    }

    return {
        message: intl.getMessage('query_log_nothing_available'),
        variant: 'default',
    };
};

export const EmptyState = ({
    className,
    hasActiveFilters,
    isLogRotationDisabled,
    messageClassName,
}: Props) => {
    const { message, variant } = getEmptyState(hasActiveFilters, isLogRotationDisabled);

    return (
        <div
            className={cn(s.root, className)}
            data-testid="query-log-empty-state"
            data-empty-state-variant={variant}
        >
            <div className={s.iconWrap} data-testid="query-log-empty-state-icon">
                <Icon icon="not_found_search" color="gray" className={s.icon} />
            </div>

            <div className={cn(s.message, messageClassName)}>{message}</div>
        </div>
    );
};