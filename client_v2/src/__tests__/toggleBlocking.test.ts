import { beforeEach, describe, expect, it, vi } from 'vitest';

import intl from 'panel/common/intl';
import { BLOCK_ACTIONS } from 'panel/helpers/constants';
import { toggleBlocking } from 'panel/actions';

const mocks = vi.hoisted(() => ({
    setRules: vi.fn((rules, options) => ({ type: 'setRules', payload: { rules, options } })),
    getFilteringStatus: vi.fn(() => ({ type: 'getFilteringStatus' })),
    addSuccessToast: vi.fn((payload) => ({ type: 'addSuccessToast', payload })),
}));

vi.mock('panel/actions/filtering', () => ({
    setRules: mocks.setRules,
    getFilteringStatus: mocks.getFilteringStatus,
}));

vi.mock('panel/actions/toasts', () => ({
    addSuccessToast: mocks.addSuccessToast,
    addErrorToast: vi.fn(),
    addNoticeToast: vi.fn(),
}));

describe('toggleBlocking', () => {
    const dispatch = vi.fn(async (action) => action);

    beforeEach(() => {
        dispatch.mockClear();
        mocks.setRules.mockClear();
        mocks.getFilteringStatus.mockClear();
        mocks.addSuccessToast.mockClear();
    });

    it('replaces an allowlist rule with a blocking rule and shows the add toast', async () => {
        const getState = () => ({
            filtering: {
                userRules: '@@||allowed.example^$important\n',
            },
        });

        await toggleBlocking(BLOCK_ACTIONS.BLOCK, 'allowed.example')(dispatch, getState as never);

        expect(mocks.setRules).toHaveBeenCalledWith('||allowed.example^$important\n', { showToast: false });
        expect(mocks.addSuccessToast).toHaveBeenCalledWith(
            expect.objectContaining({
                message: intl.getMessage('user_rules_rule_added_to_custom_filtering_rules'),
                actionLabel: intl.getMessage('notify_undo'),
            }),
        );
        expect(mocks.getFilteringStatus).toHaveBeenCalled();
    });

    it('replaces a blocking rule with an allowlist rule and shows the add toast', async () => {
        const getState = () => ({
            filtering: {
                userRules: '||blocked.example^$important\n',
            },
        });

        await toggleBlocking(BLOCK_ACTIONS.UNBLOCK, 'blocked.example')(dispatch, getState as never);

        expect(mocks.setRules).toHaveBeenCalledWith('@@||blocked.example^$important\n', { showToast: false });
        expect(mocks.addSuccessToast).toHaveBeenCalledWith(
            expect.objectContaining({
                message: intl.getMessage('user_rules_rule_added_to_allowlist'),
                actionLabel: intl.getMessage('notify_undo'),
            }),
        );
        expect(mocks.getFilteringStatus).toHaveBeenCalled();
    });
});
