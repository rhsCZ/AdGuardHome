import { type JSX, For, Show, createMemo, createSignal, createEffect } from 'solid-js';
import cn from 'clsx';
import {
    Select as ArkSelect,
    Combobox as ArkCombobox,
    createListCollection,
    useSelectContext,
    useSelectItemContext,
    useComboboxContext,
    useComboboxItemContext,
} from '@ark-ui/solid';
import { Icon } from 'panel/common/ui/Icon';
import intl from 'panel/common/intl';
import { IOption } from 'panel/lib/helpers/utils';
import theme from 'panel/lib/theme';

import { SelectMultiValue } from './SelectMultiValue';

import './Select.pcss';
import s from './MenuList.module.pcss';

const SEARCH_ENABLE_LIMIT = 10;

export type ISelectSize = 'auto' | 'small' | 'medium' | 'big' | 'big-limit' | 'responsive';
export type ISelectHeight = 'small' | 'medium' | 'big' | 'big-mobile';
export type ISelectMenuSize = 'small' | 'medium' | 'big' | 'large';
export type ISelectValue<T, Multi extends boolean> = Multi extends true ? IOption<T>[] : IOption<T>;

interface SelectProps<
    T,
    Multi extends boolean = false,
    ExtendOption extends Record<any, any> = object,
> {
    size?: ISelectSize;
    height?: ISelectHeight;
    menuSize?: ISelectMenuSize;
    menuPosition?: 'right';
    mobile?: boolean;
    isDisabled?: boolean;
    isMulti?: Multi;
    menuIsOpen?: boolean;
    placeholder?: JSX.Element;
    class?: string;
    autoFocus?: boolean;
    low?: boolean;
    options: (IOption<T> & ExtendOption)[];
    onChange: (
        value: Multi extends true ? (IOption<T> & ExtendOption)[] : IOption<T> & ExtendOption,
    ) => void;
    value?: (IOption<T> & ExtendOption) | (IOption<T> & ExtendOption)[];
    formatGroupLabel?: (group: any) => string;
    isSearchable?: boolean;
    id?: string;
    inputId?: string;
    borderless?: boolean;
    adaptiveHeight?: boolean;
    lazyList?: boolean;
    closeMenuOnSelect?: boolean;
    menuPlacement?: 'top' | 'bottom' | 'auto';
    isClearable?: boolean;
    onMenuScrollToBottom?: () => void;
    isLoading?: boolean;
    isDropdownSelect?: boolean;
    onMenuOpen?: () => void;
    onMenuClose?: () => void;
    onBlur?: () => void;
    showIcons?: boolean;
    showOptionIcon?: boolean;
    optionTestIdPrefix?: string;
    /** Optional footer rendered after the scrollable item list inside the dropdown */
    menuFooter?: JSX.Element;
}

/** Multi-value pills for the non-searchable Select branch (reads from select context). */
const SelectMultiValueDisplay = (props: { placeholder?: string }) => {
    const selectCtx = useSelectContext();

    return (
        <Show
            when={selectCtx().hasSelectedItems}
            fallback={<span class="solid-select-placeholder">{props.placeholder ?? ''}</span>}
        >
            <SelectMultiValue
                items={selectCtx().selectedItems as any[]}
                onRemove={(item) => selectCtx().clearValue(String(item.value))}
            />
        </Show>
    );
};

/** Multi-value pills + inline search input for Combobox multi-select (react-select parity). */
const ComboboxMultiValueDisplay = (props: {
    placeholder?: string;
    inputId?: string;
    onInputRef?: (el: HTMLInputElement) => void;
}) => {
    const comboCtx = useComboboxContext();

    return (
        <>
            <Show when={comboCtx().hasSelectedItems}>
                <SelectMultiValue
                    items={comboCtx().selectedItems as any[]}
                    onRemove={(item) => comboCtx().clearValue(String(item.value))}
                />
            </Show>
            <ArkCombobox.Input
                id={props.inputId}
                placeholder={comboCtx().hasSelectedItems ? '' : (props.placeholder ?? '')}
                ref={props.onInputRef}
            />
        </>
    );
};

/** Check/dot icon for item indicators (check when selected, dot when not). */
const OptionCheckIcon = () => {
    // eslint-disable-next-line solid/reactivity
    const itemCtx = useSelectItemContext();
    const state = itemCtx();
    return <Icon icon={state.selected ? 'check' : 'dot'} />;
};

/** Like OptionCheckIcon, for the searchable Combobox branch. */
const ComboboxOptionCheckIcon = () => {
    // eslint-disable-next-line solid/reactivity
    const itemCtx = useComboboxItemContext();
    const state = itemCtx();
    return <Icon icon={state.selected ? 'check' : 'dot'} />;
};

/** Option row rendered inside the dropdown list. */
const SelectItemContent = <T, ExtendOption extends Record<any, any>>(props: {
    option: IOption<T> & ExtendOption;
    isMulti?: boolean;
    showOptionIcon?: boolean;
    showIcons?: boolean;
}) => {
    // eslint-disable-next-line solid/reactivity
    const data = props.option as any;

    return (
        <>
            <Show when={props.showOptionIcon !== false}>
                <ArkSelect.ItemIndicator>
                    <OptionCheckIcon />
                </ArkSelect.ItemIndicator>
            </Show>
            <Show when={props.showIcons && data.icon}>
                <div class={s.selectIconContainer}>
                    <Icon icon={data.icon} />
                </div>
            </Show>
            <ArkSelect.ItemText>{data.label}</ArkSelect.ItemText>
        </>
    );
};

/** Single-select overlay: shows the selected value behind the input, hidden while typing.
 *  Reads from the combobox context (not props.value) so the label updates in the
 *  same tick as inputValue clears — avoiding a flash of the previous value. */
const ComboboxSingleValueDisplay = (props: { placeholder?: string }) => {
    const comboCtx = useComboboxContext();
    const selectedLabel = createMemo(() => {
        const items = comboCtx().selectedItems;
        return items && items.length > 0 ? (items[0] as any).label : '';
    });

    return (
        <Show when={!comboCtx().inputValue}>
            <Show
                when={comboCtx().hasSelectedItems}
                fallback={<span class="solid-select-placeholder">{props.placeholder ?? ''}</span>}
            >
                <span class="solid-combobox-single-value">{selectedLabel()}</span>
            </Show>
        </Show>
    );
};

/** Clears the combobox input on close so stale search text doesn't persist. */
const ComboboxInputReset = (): null => {
    const comboCtx = useComboboxContext();
    let prevOpen = false;

    createEffect((): void => {
        const isOpen = comboCtx().open;
        if (prevOpen && !isOpen) {
            comboCtx().setInputValue('', 'script');
        }
        prevOpen = isOpen;
    });

    return null;
};

export const Select = <
    T,
    Multi extends boolean = false,
    ExtendOption extends Record<any, any> = object,
>(
    props: SelectProps<T, Multi, ExtendOption>,
) => {
    /* ---- Derived state ---- */
    const selectClass = createMemo(() =>
        cn(
            { 'desktop-select-always': props.mobile === false },
            { 'mobile-select-always': props.mobile },
            'solid-select',
            { 'solid-select--multi': props.isMulti },
            { 'solid-select-big': props.size === 'big' },
            { 'solid-select-medium': props.size === 'medium' },
            { 'solid-select-small': props.size === 'small' },
            { 'solid-select-responsive': props.size === 'responsive' },
            { 'solid-select--big-limit': props.size === 'big-limit' },
            { 'solid-select--menu-small': props.menuSize === 'small' },
            { 'solid-select--menu-medium': props.menuSize === 'medium' },
            { 'solid-select--menu-big': props.menuSize === 'big' },
            { 'solid-select--menu-right': props.menuPosition === 'right' },
            { 'solid-select--borderless': props.borderless },
            { 'solid-select--adaptive-height': props.adaptiveHeight },
            { 'solid-select--height-small': props.height === 'small' },
            { 'solid-select--height-medium': props.height === 'medium' },
            { 'solid-select--height-big': props.height === 'big' },
            { 'solid-select--height-big-mobile': props.height === 'big-mobile' },
            { 'solid-select--dropdown': props.isDropdownSelect },
            { low: props.low },
            props.class,
        ),
    );

    const isSearchable = createMemo(() => {
        // Explicit isSearchable prop takes precedence over defaults.
        if (props.isSearchable !== undefined) {
            return props.isSearchable;
        }
        // Default: only non-multi selects with > SEARCH_ENABLE_LIMIT options are searchable.
        return !(props.isMulti ?? false) && props.options.length > SEARCH_ENABLE_LIMIT;
    });

    const isDisabled = createMemo(() => props.isDisabled ?? false);
    const isMulti = createMemo(() => props.isMulti ?? false);
    const isClearable = createMemo(() => props.isClearable ?? false);

    /* ---- Combobox search input tracking ---- */
    const [searchInput, setSearchInput] = createSignal('');
    /** DOM ref to the Combobox input (used for the multi-mode defensive clear). */
    let inputRef: HTMLInputElement | undefined;

    const filteredOptions = createMemo(() => {
        const query = searchInput().toLowerCase();
        if (!query) return props.options;
        return props.options.filter((opt) => String(opt.label).toLowerCase().includes(query));
    });

    /* ---- Build collection from filtered options ---- */
    const collection = createMemo(() =>
        createListCollection({
            items: filteredOptions() as any[],
            itemToString: (item: any) => item.label,
            itemToValue: (item: any) => String(item.value),
            isItemDisabled: (item: any) => item.isDisabled ?? item.disabled ?? false,
        }),
    );

    /* ---- Compute current value as string[] for Ark UI ---- */
    const currentValue = createMemo<string[]>(() => {
        if (!props.value) return [];
        const arr = Array.isArray(props.value) ? props.value : [props.value];
        return arr.map((v: any) => String(v.value));
    });

    /* ---- onChange handler ---- */
    const handleValueChange = (details: { items: any[] }) => {
        if (isMulti()) {
            props.onChange(details.items as any);
        } else {
            props.onChange(details.items[0] as any);
        }
    };

    /* ---- Scroll to bottom ---- */
    const handleContentScroll = (e: Event) => {
        const el = e.currentTarget as HTMLElement;
        if (el.scrollHeight - el.scrollTop <= el.clientHeight + 50) {
            props.onMenuScrollToBottom?.();
        }
    };

    return (
        <Show
            when={isSearchable()}
            fallback={
                /* ===== Non-searchable mode: Ark UI Select ===== */
                <div class={selectClass()} id={props.id}>
                    <ArkSelect.Root
                        collection={collection()}
                        value={currentValue()}
                        onValueChange={handleValueChange}
                        multiple={isMulti()}
                        disabled={isDisabled()}
                        closeOnSelect={props.closeMenuOnSelect ?? true}
                        open={props.menuIsOpen}
                        onOpenChange={(details) => {
                            if (details.open) {
                                props.onMenuOpen?.();
                            } else {
                                props.onMenuClose?.();
                            }
                        }}
                        positioning={{
                            placement:
                                props.menuPlacement === 'top'
                                    ? ('top-start' as const)
                                    : ('bottom-start' as const),
                            sameWidth: true,
                            fitViewport: true,
                            flip:
                                props.menuPlacement === 'auto'
                                    ? true
                                    : props.menuPlacement === 'top'
                                      ? ['top-start', 'bottom-start']
                                      : ['bottom-start', 'top-start'],
                        }}
                    >
                        <Show when={!props.isDropdownSelect}>
                            <ArkSelect.Control>
                                <ArkSelect.Trigger>
                                    <Show
                                        when={!isMulti()}
                                        fallback={
                                            <div class="solid-select-multi-value-container">
                                                <SelectMultiValueDisplay
                                                    placeholder={props.placeholder as string}
                                                />
                                            </div>
                                        }
                                    >
                                        <ArkSelect.ValueText
                                            placeholder={props.placeholder as string}
                                        />
                                    </Show>
                                    <Show when={!isMulti() || !currentValue().length}>
                                        <ArkSelect.Indicator>
                                            <Icon icon="arrow_bottom" />
                                        </ArkSelect.Indicator>
                                    </Show>
                                </ArkSelect.Trigger>
                                <Show when={isClearable() && !isMulti()}>
                                    <ArkSelect.ClearTrigger>
                                        <Icon icon="cross" />
                                    </ArkSelect.ClearTrigger>
                                </Show>
                            </ArkSelect.Control>
                        </Show>
                        <ArkSelect.Positioner>
                            <ArkSelect.Content onScroll={handleContentScroll}>
                                <Show
                                    when={!props.isLoading}
                                    fallback={
                                        <div class={theme.select.menuLoaderOverlay}>
                                            <Icon icon="loader" class={theme.select.menuLoader} />
                                        </div>
                                    }
                                >
                                    <ArkSelect.ItemGroup>
                                        <Show
                                            when={props.lazyList}
                                            fallback={
                                                <For each={props.options}>
                                                    {(option) => {
                                                        const data = option as any;
                                                        return (
                                                            <ArkSelect.Item
                                                                item={option as any}
                                                                data-testid={
                                                                    props.optionTestIdPrefix
                                                                        ? `${props.optionTestIdPrefix}-${String(data.value)}`
                                                                        : undefined
                                                                }
                                                            >
                                                                <SelectItemContent
                                                                    option={option as any}
                                                                    isMulti={isMulti()}
                                                                    showOptionIcon={
                                                                        props.showOptionIcon
                                                                    }
                                                                    showIcons={props.showIcons}
                                                                />
                                                            </ArkSelect.Item>
                                                        );
                                                    }}
                                                </For>
                                            }
                                        >
                                            <div class={s.menuList}>
                                                <For each={props.options}>
                                                    {(option) => {
                                                        const data = option as any;
                                                        return (
                                                            <ArkSelect.Item
                                                                item={option as any}
                                                                data-testid={
                                                                    props.optionTestIdPrefix
                                                                        ? `${props.optionTestIdPrefix}-${String(data.value)}`
                                                                        : undefined
                                                                }
                                                            >
                                                                <SelectItemContent
                                                                    option={option as any}
                                                                    isMulti={isMulti()}
                                                                    showOptionIcon={
                                                                        props.showOptionIcon
                                                                    }
                                                                    showIcons={props.showIcons}
                                                                />
                                                            </ArkSelect.Item>
                                                        );
                                                    }}
                                                </For>
                                            </div>
                                        </Show>
                                    </ArkSelect.ItemGroup>
                                    <Show when={props.menuFooter}>{props.menuFooter}</Show>
                                </Show>
                            </ArkSelect.Content>
                        </ArkSelect.Positioner>
                    </ArkSelect.Root>
                </div>
            }
        >
            {/* ===== Searchable (Combobox) mode: Ark UI Combobox ===== */}
            <div class={selectClass()} id={props.id}>
                <ArkCombobox.Root
                    collection={collection()}
                    value={currentValue()}
                    onValueChange={handleValueChange}
                    multiple={isMulti()}
                    disabled={isDisabled()}
                    closeOnSelect={props.closeMenuOnSelect ?? true}
                    openOnClick
                    autoFocus={props.autoFocus}
                    open={props.menuIsOpen}
                    // Input holds only search text; value shown via the overlay.
                    selectionBehavior="clear"
                    onInputValueChange={(details) => {
                        if (details.reason === 'input-change') {
                            setSearchInput(details.inputValue);
                        } else {
                            // Non-typing change (select/clear/close): reset filter.
                            setSearchInput('');
                            if (isMulti() && inputRef) {
                                inputRef.value = '';
                            }
                        }
                    }}
                    onOpenChange={(details) => {
                        if (details.open) {
                            setSearchInput('');
                            props.onMenuOpen?.();
                        } else {
                            // Stale search cleared by ComboboxInputReset.
                            props.onMenuClose?.();
                        }
                    }}
                    positioning={{
                        placement:
                            props.menuPlacement === 'top'
                                ? ('top-start' as const)
                                : ('bottom-start' as const),
                        sameWidth: true,
                        fitViewport: true,
                        flip:
                            props.menuPlacement === 'auto'
                                ? true
                                : props.menuPlacement === 'top'
                                  ? ['top-start', 'bottom-start']
                                  : ['bottom-start', 'top-start'],
                    }}
                >
                    {/* Clears the search input on close so the value overlay reappears. */}
                    <ComboboxInputReset />
                    <Show when={!props.isDropdownSelect}>
                        <ArkCombobox.Control
                            onClick={(e: MouseEvent) => {
                                // Click the input when clicking the control's dead zone.
                                if (e.target === e.currentTarget) {
                                    const input = (e.currentTarget as HTMLElement).querySelector(
                                        'input',
                                    );
                                    input?.click();
                                }
                            }}
                        >
                            <Show when={isMulti()}>
                                {/* Pills + input share a flex-wrap flow (inline). */}
                                <div class="solid-select-multi-value-container">
                                    <ComboboxMultiValueDisplay
                                        placeholder={props.placeholder as string}
                                        inputId={props.inputId}
                                        onInputRef={(el) => {
                                            inputRef = el;
                                        }}
                                    />
                                </div>
                                {/* Clear button shown whenever values exist (react-select v2 only checks hasValue). */}
                                <Show when={currentValue().length > 0}>
                                    <ArkCombobox.ClearTrigger>
                                        <Icon icon="cross" />
                                    </ArkCombobox.ClearTrigger>
                                </Show>
                                {/* Arrow hidden when values exist (clear button takes its place). */}
                                <Show when={!currentValue().length}>
                                    <ArkCombobox.Trigger>
                                        <Icon icon="arrow_bottom" />
                                    </ArkCombobox.Trigger>
                                </Show>
                            </Show>
                            <Show when={!isMulti()}>
                                {/* Single-select: value overlay + input share a grid cell. */}
                                <div class="solid-combobox-single-value-wrapper">
                                    <ComboboxSingleValueDisplay
                                        placeholder={props.placeholder as string}
                                    />
                                    <ArkCombobox.Input
                                        id={props.inputId}
                                        placeholder=""
                                        ref={(el) => {
                                            inputRef = el;
                                        }}
                                    />
                                </div>
                                <Show when={isClearable() && currentValue().length > 0}>
                                    <ArkCombobox.ClearTrigger>
                                        <Icon icon="cross" />
                                    </ArkCombobox.ClearTrigger>
                                </Show>
                                <ArkCombobox.Trigger>
                                    <Icon icon="arrow_bottom" />
                                </ArkCombobox.Trigger>
                            </Show>
                        </ArkCombobox.Control>
                    </Show>
                    <ArkCombobox.Positioner>
                        <ArkCombobox.Content onScroll={handleContentScroll}>
                            <Show
                                when={!props.isLoading}
                                fallback={
                                    <div class={theme.select.menuLoaderOverlay}>
                                        <Icon icon="loader" class={theme.select.menuLoader} />
                                    </div>
                                }
                            >
                                <ArkCombobox.ItemGroup>
                                    <Show
                                        when={props.lazyList}
                                        fallback={
                                            <For each={filteredOptions()}>
                                                {(option) => {
                                                    const data = option as any;
                                                    return (
                                                        <ArkCombobox.Item
                                                            item={option as any}
                                                            data-testid={
                                                                props.optionTestIdPrefix
                                                                    ? `${props.optionTestIdPrefix}-${String(data.value)}`
                                                                    : undefined
                                                            }
                                                        >
                                                            <Show
                                                                when={
                                                                    props.showOptionIcon !== false
                                                                }
                                                            >
                                                                <ArkCombobox.ItemIndicator>
                                                                    <ComboboxOptionCheckIcon />
                                                                </ArkCombobox.ItemIndicator>
                                                            </Show>
                                                            <Show
                                                                when={props.showIcons && data.icon}
                                                            >
                                                                <div class={s.selectIconContainer}>
                                                                    <Icon icon={data.icon} />
                                                                </div>
                                                            </Show>
                                                            <ArkCombobox.ItemText>
                                                                {data.label}
                                                            </ArkCombobox.ItemText>
                                                        </ArkCombobox.Item>
                                                    );
                                                }}
                                            </For>
                                        }
                                    >
                                        <div class={s.menuList}>
                                            <For each={filteredOptions()}>
                                                {(option) => {
                                                    const data = option as any;
                                                    return (
                                                        <ArkCombobox.Item
                                                            item={option as any}
                                                            data-testid={
                                                                props.optionTestIdPrefix
                                                                    ? `${props.optionTestIdPrefix}-${String(data.value)}`
                                                                    : undefined
                                                            }
                                                        >
                                                            <Show
                                                                when={
                                                                    props.showOptionIcon !== false
                                                                }
                                                            >
                                                                <ArkCombobox.ItemIndicator>
                                                                    <ComboboxOptionCheckIcon />
                                                                </ArkCombobox.ItemIndicator>
                                                            </Show>
                                                            <Show
                                                                when={props.showIcons && data.icon}
                                                            >
                                                                <div class={s.selectIconContainer}>
                                                                    <Icon icon={data.icon} />
                                                                </div>
                                                            </Show>
                                                            <ArkCombobox.ItemText>
                                                                {data.label}
                                                            </ArkCombobox.ItemText>
                                                        </ArkCombobox.Item>
                                                    );
                                                }}
                                            </For>
                                            <Show when={props.menuFooter}>{props.menuFooter}</Show>
                                        </div>
                                    </Show>
                                </ArkCombobox.ItemGroup>
                                {/* Empty state: shown when the search yields no matches
                                    (collection.size === 0), like react-select's
                                    NoOptionsMessage / CustomNoOptionsMessage. */}
                                <ArkCombobox.Empty>
                                    {intl.getMessage('nothing_found')}
                                </ArkCombobox.Empty>
                            </Show>
                        </ArkCombobox.Content>
                    </ArkCombobox.Positioner>
                </ArkCombobox.Root>
            </div>
        </Show>
    );
};
