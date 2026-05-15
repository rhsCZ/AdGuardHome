import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { UserRules } from 'panel/components/UserRules/UserRules';
import { BLOCK_ACTIONS, FILTERED_STATUS, SETTINGS_NAMES } from 'panel/helpers/constants';
import { initialState, RootState } from 'panel/initialState';

const mocks = vi.hoisted(() => ({
    state: null as unknown as RootState,
    dispatch: vi.fn((action) => action),
    getFilteringStatus: vi.fn(() => ({ type: 'getFilteringStatus' })),
    setRules: vi.fn((rules) => ({ type: 'setRules', payload: rules })),
    checkHost: vi.fn((payload) => ({ type: 'checkHost', payload })),
    initSettings: vi.fn(() => ({ type: 'initSettings' })),
    toggleBlocking: vi.fn((type, domain) => ({ type: 'toggleBlocking', payload: { type, domain } })),
    toggleBlockingForClient: vi.fn((type, domain, client) => ({
        type: 'toggleBlockingForClient',
        payload: { type, domain, client },
    })),
    toggleSetting: vi.fn(() => Promise.resolve(true)),
    getRewritesList: vi.fn(() => ({ type: 'getRewritesList' })),
    updateRewrite: vi.fn((payload) => Promise.resolve({ type: 'updateRewrite', payload })),
    deleteRewrite: vi.fn((payload) => Promise.resolve({ type: 'deleteRewrite', payload })),
    getBlockedServices: vi.fn(() => ({ type: 'getBlockedServices' })),
    getAllBlockedServices: vi.fn(() => ({ type: 'getAllBlockedServices' })),
    updateBlockedServices: vi.fn((payload) => Promise.resolve({ type: 'updateBlockedServices', payload })),
    addSuccessToast: vi.fn((message) => ({ type: 'addSuccessToast', payload: message })),
}));

vi.mock('react-redux', () => ({
    useDispatch: () => mocks.dispatch,
    useSelector: (selector: (state: RootState) => unknown) => selector(mocks.state),
}));

vi.mock('panel/actions/filtering', () => ({
    getFilteringStatus: mocks.getFilteringStatus,
    setRules: mocks.setRules,
    checkHost: mocks.checkHost,
}));

vi.mock('panel/actions', () => ({
    initSettings: mocks.initSettings,
    toggleBlocking: mocks.toggleBlocking,
    toggleBlockingForClient: mocks.toggleBlockingForClient,
    toggleSetting: mocks.toggleSetting,
}));

vi.mock('panel/actions/rewrites', () => ({
    getRewritesList: mocks.getRewritesList,
    updateRewrite: mocks.updateRewrite,
    deleteRewrite: mocks.deleteRewrite,
}));

vi.mock('panel/actions/services', () => ({
    getBlockedServices: mocks.getBlockedServices,
    getAllBlockedServices: mocks.getAllBlockedServices,
    updateBlockedServices: mocks.updateBlockedServices,
}));

vi.mock('panel/actions/toasts', () => ({
    addSuccessToast: mocks.addSuccessToast,
}));

type RenderOptions = {
    filtering?: Partial<RootState['filtering']>;
    settings?: Partial<RootState['settings']>;
    rewrites?: Partial<RootState['rewrites']>;
    services?: Partial<RootState['services']>;
};

const createState = (overrides: RenderOptions = {}): RootState => ({
    ...initialState,
    filtering: {
        ...initialState.filtering,
        ...overrides.filtering,
    },
    settings: {
        ...initialState.settings,
        settingsList: {
            parental: { enabled: true },
            safebrowsing: { enabled: true },
            safesearch: { enabled: true },
            ...(overrides.settings?.settingsList || {}),
        },
        ...overrides.settings,
    },
    rewrites: {
        ...initialState.rewrites,
        ...overrides.rewrites,
    },
    services: {
        ...initialState.services,
        list: {
            ids: [],
            ...(overrides.services?.list || {}),
        },
        ...overrides.services,
    },
});

const renderUserRules = (overrides: RenderOptions = {}) => {
    mocks.state = createState(overrides);

    return render(<UserRules />);
};

const getBootstrapDispatchTypes = () => mocks.dispatch.mock.calls.map(([action]) => action?.type);

const submitCheckForm = async (
    user: ReturnType<typeof userEvent.setup>,
    options: { hostname: string; client?: string; qtype?: string },
) => {
    await user.type(screen.getByLabelText('Hostname or domain name'), options.hostname);

    if (options.client) {
        await user.type(screen.getByLabelText('Client identifier (name, ClientID, or IP address)'), options.client);
    }

    if (options.qtype) {
        await user.click(screen.getByLabelText('DNS record type'));
        await user.click(screen.getByText(options.qtype));
    }

    await user.tab();
    await user.click(screen.getByRole('button', { name: 'Check' }));
};

beforeEach(() => {
    mocks.state = createState();
    mocks.dispatch.mockReset();
    mocks.dispatch.mockImplementation((action) => action);

    mocks.getFilteringStatus.mockClear();
    mocks.setRules.mockClear();
    mocks.checkHost.mockClear();
    mocks.initSettings.mockClear();
    mocks.toggleBlocking.mockClear();
    mocks.toggleBlockingForClient.mockClear();
    mocks.toggleSetting.mockClear();
    mocks.toggleSetting.mockResolvedValue(true);
    mocks.getRewritesList.mockClear();
    mocks.updateRewrite.mockClear();
    mocks.deleteRewrite.mockClear();
    mocks.getBlockedServices.mockClear();
    mocks.getAllBlockedServices.mockClear();
    mocks.updateBlockedServices.mockClear();
    mocks.addSuccessToast.mockClear();
});

describe('UserRules harness', () => {
    it('loads Testing Library matchers', () => {
        const view = render(<div>ready</div>);

        expect(view.getByText('ready')).toBeInTheDocument();
    });

    it('submits hostname, client, and qtype from the check form', async () => {
        const user = userEvent.setup();

        renderUserRules();

        await user.type(screen.getByLabelText('Hostname or domain name'), 'qtype.example');
        await user.type(screen.getByLabelText('Client identifier (name, ClientID, or IP address)'), 'office-laptop');
        await user.click(screen.getByLabelText('DNS record type'));
        await user.click(screen.getByText('CNAME'));
        await user.click(screen.getByRole('button', { name: 'Check' }));

        expect(mocks.checkHost).toHaveBeenCalledWith({
            name: 'qtype.example',
            client: 'office-laptop',
            qtype: 'CNAME',
        });
    });

    it('bootstraps supporting state and hides the result card after dismiss', async () => {
        const user = userEvent.setup();

        renderUserRules({
            filtering: {
                check: {
                    hostname: 'example.com',
                    reason: FILTERED_STATUS.NOT_FILTERED_NOT_FOUND,
                    rules: [],
                },
            },
        });

        await waitFor(() => {
            expect(getBootstrapDispatchTypes()).toEqual([
                'getFilteringStatus',
                'initSettings',
                'getRewritesList',
                'getBlockedServices',
                'getAllBlockedServices',
            ]);
        });

        await user.click(screen.getByRole('button', { name: 'Close result' }));

        expect(screen.queryByText('Domain is processed')).not.toBeInTheDocument();
    });

    it('renders the allowlist action for a custom filtering block', () => {
        renderUserRules({
            filtering: {
                check: {
                    hostname: 'blocked.example',
                    reason: FILTERED_STATUS.FILTERED_BLACK_LIST,
                    rules: [{ filter_list_id: 0, text: '||blocked.example^' }],
                },
            },
        });

        expect(screen.getByText('Domain is blocked')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Add to allowlist' })).toBeInTheDocument();
    });

    it('renders the custom-rule action for an unmatched domain', () => {
        renderUserRules({
            filtering: {
                check: {
                    hostname: 'plain.example',
                    reason: FILTERED_STATUS.NOT_FILTERED_NOT_FOUND,
                    rules: [],
                },
            },
        });

        expect(screen.getByText('Domain is processed')).toBeInTheDocument();
        expect(screen.getByText('No rules matched')).toBeInTheDocument();
        expect(screen.queryByText(/\[object Object\]/)).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Add to custom filtering rules' })).toBeInTheDocument();
    });

    it('uses the client-specific toggle when allowlisting a client-specific block', async () => {
        const user = userEvent.setup();

        renderUserRules({
            filtering: {
                check: {
                    hostname: 'blocked.example',
                    reason: FILTERED_STATUS.FILTERED_BLACK_LIST,
                    rules: [{ filter_list_id: 0, text: '||blocked.example^' }],
                },
            },
        });

        await submitCheckForm(user, {
            hostname: 'blocked.example',
            client: 'office-laptop',
        });

        mocks.checkHost.mockClear();
        await user.click(screen.getByRole('button', { name: 'Add to allowlist' }));

        expect(mocks.toggleBlockingForClient).toHaveBeenCalledWith(
            BLOCK_ACTIONS.UNBLOCK,
            'blocked.example',
            'office-laptop',
        );
        expect(mocks.toggleBlocking).not.toHaveBeenCalled();
        expect(mocks.checkHost).toHaveBeenCalledWith({
            name: 'blocked.example',
            client: 'office-laptop',
            qtype: undefined,
        });
    });

    it('disables safe browsing from a blocked result and rechecks the target', async () => {
        const user = userEvent.setup();

        renderUserRules({
            filtering: {
                check: {
                    hostname: 'malware.example',
                    reason: FILTERED_STATUS.FILTERED_SAFE_BROWSING,
                    rules: [],
                },
            },
        });

        await submitCheckForm(user, {
            hostname: 'malware.example',
        });

        mocks.checkHost.mockClear();
        await user.click(screen.getByRole('button', { name: 'Disable Browsing security' }));

        expect(mocks.toggleSetting).toHaveBeenCalledWith(SETTINGS_NAMES.safebrowsing, true);
        expect(mocks.checkHost).toHaveBeenCalledWith({
            name: 'malware.example',
            client: undefined,
            qtype: undefined,
        });
    });

    it('removes the matched blocked service and rechecks the current target', async () => {
        const user = userEvent.setup();

        renderUserRules({
            filtering: {
                check: {
                    hostname: 'video.example',
                    reason: FILTERED_STATUS.FILTERED_BLOCKED_SERVICE,
                    rules: [],
                    service_name: 'YouTube',
                },
            },
            services: {
                list: {
                    ids: ['youtube'],
                },
                allServices: [{ id: 'youtube', name: 'YouTube' }],
            },
        });

        await submitCheckForm(user, {
            hostname: 'video.example',
        });

        mocks.checkHost.mockClear();
        await user.click(screen.getByRole('button', { name: 'Disable blocked service' }));

        expect(mocks.updateBlockedServices).toHaveBeenCalledWith({ ids: [] });
        expect(mocks.checkHost).toHaveBeenCalledWith({
            name: 'video.example',
            client: undefined,
            qtype: undefined,
        });
    });

    it('shows edit and delete actions only for rewrite-list results', () => {
        renderUserRules({
            filtering: {
                check: {
                    hostname: 'rewrite.example',
                    reason: FILTERED_STATUS.REWRITE_RULE,
                    cname: 'target.example',
                    rules: [],
                },
            },
            rewrites: {
                list: [{ domain: 'rewrite.example', answer: 'target.example' }],
            },
        });

        expect(screen.getByRole('button', { name: 'Edit DNS rewrite' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
    });

    it('does not show rewrite edit actions for hosts-file rewrites', () => {
        renderUserRules({
            filtering: {
                check: {
                    hostname: 'hosts.example',
                    reason: FILTERED_STATUS.REWRITE_HOSTS,
                    ip_addrs: ['127.0.0.1'],
                    rules: [],
                },
            },
        });

        expect(screen.queryByRole('button', { name: 'Edit DNS rewrite' })).not.toBeInTheDocument();
    });

    it('renders the check card before the result card in the right column', () => {
        renderUserRules();

        const checkCard = screen.getByText('Check domain filtering globally or for a client').closest('div');
        const resultCard = screen.queryByTestId('user-rules-result-card');

        expect(checkCard).toBeTruthy();
        expect(resultCard).toBeNull();
    });
});
