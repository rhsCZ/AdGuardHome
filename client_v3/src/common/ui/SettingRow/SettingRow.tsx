import { type JSX, Show, splitProps, createMemo } from 'solid-js';
import cn from 'clsx';

import { Switch } from 'panel/common/controls/Switch';
import { Icon } from 'panel/common/ui/Icon';

import s from './SettingRow.module.pcss';
import theme from 'panel/lib/theme';

type SettingRowVariant = 'switch' | 'link' | 'switch-link';

type Props = {
    id: string;
    title: string;
    description?: string | JSX.Element;
    value?: string;
    variant: SettingRowVariant;
    checked?: boolean;
    disabled?: boolean;
    titleClass?: string;
    onChange?: (checked: boolean) => void;
    onClick?: () => void;
    class?: string;
    children?: JSX.Element;
    divider?: boolean;
    align?: 'top' | 'center';
};

export const SettingRow = (props: Props) => {
    const [local] = splitProps(props, [
        'id',
        'title',
        'description',
        'value',
        'variant',
        'checked',
        'disabled',
        'titleClass',
        'onChange',
        'onClick',
        'class',
        'children',
        'divider',
        'align',
    ]);

    let inputRef: HTMLInputElement | undefined;

    const isSwitch = createMemo(() => local.variant === 'switch');
    const isLink = createMemo(() => local.variant === 'link');
    const isSwitchLink = createMemo(() => local.variant === 'switch-link');

    const handleRowClick = (e?: MouseEvent) => {
        if (local.disabled) {
            return;
        }
        // Skip programmatic click if the user already clicked the switch/label
        // — the native label behaviour already toggles it.
        if (e) {
            const target = e.target as HTMLElement;
            if (target.tagName === 'INPUT' || target.closest('label')) {
                return;
            }
        }
        if (isSwitch()) {
            inputRef?.click();
        } else if (isLink() || isSwitchLink()) {
            local.onClick?.();
        }
    };

    const handleSwitchChange = (e: Event) => {
        e.stopPropagation();
        if (local.disabled) {
            return;
        }
        const target = e.target as HTMLInputElement;
        local.onChange?.(target.checked);
    };

    const handleLinkClick = (e: Event) => {
        e.stopPropagation();
        if (local.disabled) {
            return;
        }
        local.onClick?.();
    };

    const handleInputClick = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        const isSwitchClick = target.tagName === 'INPUT' || !!target.closest('label');

        // Native label click already toggled the switch — don't double-fire.
        if (isSwitchClick) {
            return;
        }

        if ((isSwitch() || isSwitchLink()) && !local.disabled) {
            e.stopPropagation();
            inputRef?.click();
        }
    };

    const isSwitchVariant = () => isSwitch() || isSwitchLink();

    const isLinkVariant = () => isLink();

    return (
        <div
            class={cn(s.switch, local.class, {
                [s.switchDisabled]: local.disabled,
            })}
            role="button"
            tabIndex={local.disabled ? -1 : 0}
            onClick={handleRowClick}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleRowClick();
                }
            }}
        >
            <div
                class={cn(s.row, {
                    [s.rowTop]: local.align === 'top',
                    [s.rowCenter]: local.align === 'center',
                })}
            >
                <div class={s.text}>
                    <div
                        class={cn(s.title, local.titleClass, theme.text.t2, {
                            [s.titleDisabled]: local.disabled,
                        })}
                    >
                        {local.title}
                    </div>
                    <Show when={local.description}>
                        <div
                            class={cn(s.desc, theme.text.t3, { [s.descDisabled]: local.disabled })}
                        >
                            {local.description}
                        </div>
                    </Show>
                    <Show when={local.value}>
                        <div
                            class={cn(s.value, theme.text.t3, {
                                [s.valueDisabled]: local.disabled,
                            })}
                        >
                            {local.value}
                        </div>
                    </Show>
                </div>
                <Show when={isSwitchLink() && local.divider}>
                    <div class={s.divider} />
                </Show>
                <div class={s.input} onClick={handleInputClick}>
                    <Show when={isSwitchVariant()}>
                        <Switch
                            id={local.id}
                            checked={!!local.checked}
                            disabled={!!local.disabled}
                            onChange={handleSwitchChange}
                            ref={(el: HTMLInputElement) => {
                                inputRef = el;
                            }}
                        />
                    </Show>
                    <Show when={isLinkVariant()}>
                        <button
                            type="button"
                            class={s.link}
                            disabled={!!local.disabled}
                            onClick={handleLinkClick}
                        >
                            <Icon icon="arrow" class={s.arrow} />
                        </button>
                    </Show>
                </div>
            </div>
            <Show when={local.children}>
                <div class={s.content}>{local.children}</div>
            </Show>
        </div>
    );
};
