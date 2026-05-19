import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { addSuccessToast } from 'panel/actions/toasts';
import toasts from 'panel/reducers/toasts';

describe('toasts reducer', () => {
    it('stores a rich ReactNode success message instead of treating it as a toast payload object', () => {
        const message = (
            <>
                The <strong>YouTube</strong> service was allowed
            </>
        );

        const state = toasts(undefined, addSuccessToast(message));

        render(<>{state.notices[0].message}</>);

        expect(screen.getByText('YouTube', { selector: 'strong' })).toBeInTheDocument();
        expect(screen.getByText(/The/)).toBeInTheDocument();
        expect(state.notices[0].type).toBe('success');
    });

    it('preserves action-style success toast payloads', () => {
        const onAction = vi.fn();
        const payload = {
            message: 'Rule added',
            actionLabel: 'Undo',
            onAction,
        };

        const state = toasts(undefined, addSuccessToast(payload));

        expect(state.notices[0]).toMatchObject({
            message: 'Rule added',
            actionLabel: 'Undo',
            onAction,
            type: 'success',
        });
    });
});
