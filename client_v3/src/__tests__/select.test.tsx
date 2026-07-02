import { render } from '@solidjs/testing-library';
import { describe, it, expect } from 'vitest';
import { Select } from '../common/controls/Select/Select';

const OPTIONS = [
    { value: '0.0.0.0', label: 'All interfaces' },
    { value: '127.0.0.1', label: 'Loopback' },
];

describe('Select', () => {
    it('renders the indicator inside the trigger button', () => {
        render(() => (
            <Select
                options={OPTIONS}
                value={OPTIONS[0]}
                onChange={() => {}}
                placeholder="Select interface"
            />
        ));

        const trigger = document.querySelector(
            '[data-scope="select"][data-part="trigger"]',
        ) as HTMLElement;
        const indicator = trigger?.querySelector('[data-part="indicator"]');

        // The indicator (arrow icon) should be inside the trigger.
        expect(indicator).toBeTruthy();
    });
});

describe('Select — single-select (searchable combobox)', () => {
    it('shows the selected value via an overlay above the input', () => {
        // react-select parity: the value text is rendered behind the search
        // input (same grid cell) so it stays visible until the user types.
        render(() => (
            <Select
                options={OPTIONS}
                value={OPTIONS[1]}
                onChange={() => {}}
                isSearchable
                placeholder="Select interface"
            />
        ));

        const overlay = document.querySelector('.solid-combobox-single-value');
        expect(overlay).toBeInTheDocument();
        expect(overlay?.textContent).toBe(OPTIONS[1].label);

        // The overlay and the input share the same grid wrapper.
        const wrapper = document.querySelector('.solid-combobox-single-value-wrapper');
        expect(wrapper).toBeInTheDocument();
        expect(
            wrapper?.querySelector('[data-scope="combobox"][data-part="input"]'),
        ).toBeInTheDocument();

        // The input's own placeholder is empty — the overlay shows the value.
        const input = document.querySelector(
            '[data-scope="combobox"][data-part="input"]',
        ) as HTMLInputElement;
        expect(input.placeholder).toBe('');
    });

    it('shows the placeholder overlay when no value is selected', () => {
        render(() => (
            <Select
                options={OPTIONS}
                value={undefined}
                onChange={() => {}}
                isSearchable
                placeholder="Select interface"
            />
        ));

        // No value overlay.
        expect(document.querySelector('.solid-combobox-single-value')).not.toBeInTheDocument();

        // Placeholder text is rendered instead.
        const placeholder = document.querySelector('.solid-select-placeholder');
        expect(placeholder).toBeInTheDocument();
        expect(placeholder?.textContent).toBe('Select interface');
    });
});

describe('Select — multi-select (searchable combobox)', () => {
    it('places the search input inline inside the multi-value container', () => {
        render(() => (
            <Select
                options={OPTIONS}
                value={[]}
                onChange={() => {}}
                isMulti
                isSearchable
                placeholder="Pick tags"
            />
        ));

        const container = document.querySelector('.solid-select-multi-value-container');
        expect(container).toBeInTheDocument();

        // The search input must be a descendant of the multi-value container so
        // it flows inline after the pills (mimics react-select).
        const inputInside = container?.querySelector('[data-scope="combobox"][data-part="input"]');
        expect(inputInside).toBeInTheDocument();
    });

    it('hides the dropdown arrow and shows the clear button when values exist', () => {
        // NOTE: isClearable is intentionally NOT passed. react-select v2's
        // CustomClearIndicator only checks hasValue, and no consumer passes
        // isClearable, so the clear button must appear for multi-select
        // whenever values exist.
        render(() => (
            <Select
                options={OPTIONS}
                value={[OPTIONS[1]]}
                onChange={() => {}}
                isMulti
                isSearchable
            />
        ));

        // Dropdown arrow is replaced by the clear button (react-select parity).
        const trigger = document.querySelector('[data-scope="combobox"][data-part="trigger"]');
        expect(trigger).not.toBeInTheDocument();

        const clearTrigger = document.querySelector(
            '[data-scope="combobox"][data-part="clear-trigger"]',
        );
        expect(clearTrigger).toBeInTheDocument();
    });
});

describe('Select — multi-select (non-searchable) regression', () => {
    it('keeps the multi-value container that wraps the pills', () => {
        // SelectMultiValue no longer renders its own container div; both the
        // searchable and non-searchable branches must provide it (see C1 fix).
        render(() => (
            <Select
                options={OPTIONS}
                value={[OPTIONS[1]]}
                onChange={() => {}}
                isMulti
                isSearchable={false}
            />
        ));

        const container = document.querySelector('.solid-select-multi-value-container');
        expect(container).toBeInTheDocument();
    });
});

describe('Select — empty state (nothing found)', () => {
    it('renders a nothing-found message when the search yields no options', () => {
        render(() => (
            <Select options={[]} onChange={() => {}} isSearchable menuIsOpen placeholder="Search" />
        ));

        const empty = document.querySelector('[data-scope="combobox"][data-part="empty"]');
        expect(empty).toBeInTheDocument();
        expect(empty?.textContent).toContain('Nothing found');
    });
});
