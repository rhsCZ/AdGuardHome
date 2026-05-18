import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
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
    toggleFilterStatus: vi.fn((url, data, whitelist) =>
        Promise.resolve({ type: 'toggleFilterStatus', payload: { url, data, whitelist } }),
    ),
    initSettings: vi.fn(() => ({ type: 'initSettings' })),
    toggleBlocking: vi.fn((type, domain) => ({ type: 'toggleBlocking', payload: { type, domain } })),
    toggleBlockingForClient: vi.fn((type, domain, client) => ({
        type: 'toggleBlockingForClient',
        payload: { type, domain, client },
    })),
    toggleSetting: vi.fn(() => Promise.resolve(true)),
    getRewritesList: vi.fn(() => ({ type: 'getRewritesList' })),
    updateRewrite: vi.fn((payload, options) => Promise.resolve({ type: 'updateRewrite', payload, options })),
    deleteRewrite: vi.fn((payload, options) => Promise.resolve({ type: 'deleteRewrite', payload, options })),
    getBlockedServices: vi.fn(() => ({ type: 'getBlockedServices' })),
    getAllBlockedServices: vi.fn(() => ({ type: 'getAllBlockedServices' })),
    updateBlockedServices: vi.fn((payload, options) =>
        Promise.resolve({ type: 'updateBlockedServices', payload, options }),
    ),
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
    toggleFilterStatus: mocks.toggleFilterStatus,
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

type CheckResult = NonNullable<RootState['filtering']['check']>;

const EXAMPLE_FILTER = {
    id: 101,
    name: 'Example Blocklist',
    url: 'https://filters.example/blocklist.txt',
    enabled: true,
    lastUpdated: '',
    rulesCount: 12,
};

const MATCHED_REWRITE = {
    domain: 'rewrite.example',
    answer: 'target.example',
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

const createCheckResult = (overrides: Partial<CheckResult> = {}): CheckResult =>
    ({
        hostname: 'example.test',
        reason: FILTERED_STATUS.NOT_FILTERED_NOT_FOUND,
        rules: [],
        ...overrides,
    }) as CheckResult;

const renderCheckResult = (check: Partial<CheckResult>, overrides: RenderOptions = {}) =>
    renderUserRules({
        ...overrides,
        filtering: {
            ...overrides.filtering,
            check: createCheckResult(check),
        },
    });

const renderMatchedFilterResult = (hostname = 'filtered.example') =>
    renderCheckResult(
        {
            hostname,
            reason: FILTERED_STATUS.FILTERED_BLACK_LIST,
            rules: [{ filter_list_id: EXAMPLE_FILTER.id, text: `||${hostname}^` }],
        },
        {
            filtering: {
                filters: [EXAMPLE_FILTER],
            },
        },
    );

const renderMatchedRewriteResult = () =>
    renderCheckResult(
        {
            hostname: MATCHED_REWRITE.domain,
            reason: FILTERED_STATUS.REWRITE_RULE,
            cname: MATCHED_REWRITE.answer,
        },
        {
            rewrites: {
                list: [MATCHED_REWRITE],
            },
        },
    );

const getBootstrapDispatchTypes = () => mocks.dispatch.mock.calls.map(([action]) => action?.type);

const submitCheckForm = async (
    user: ReturnType<typeof userEvent.setup>,
    options: { hostname: string; client?: string; qtype?: string },
) => {
    const qtype = options.qtype ?? 'A';

    await user.type(screen.getByTestId('user-rules-check-hostname'), options.hostname);

    if (options.client) {
        await user.type(screen.getByTestId('user-rules-check-client'), options.client);
    }

    if (qtype !== 'A') {
        await user.click(screen.getByLabelText('DNS record type'));
        await user.click(within(screen.getByRole('listbox')).getByText(qtype));
    }

    await user.tab();
    await user.click(screen.getByTestId('user-rules-check-submit'));
};

const expectRecheck = (hostname: string, client?: string, qtype = 'A') => {
    expect(mocks.checkHost).toHaveBeenCalledWith({
        name: hostname,
        client,
        qtype,
    });
};

const resultActionScenarios = [
    {
        name: 'custom filtering blocks',
        renderScenario: () =>
            renderCheckResult({
                hostname: 'blocked.example',
                reason: FILTERED_STATUS.FILTERED_BLACK_LIST,
                rules: [{ filter_list_id: 0, text: '||blocked.example^' }],
            }),
        title: 'Domain is blocked',
        actions: [['allow', 'Add to allowlist']],
    },
    {
        name: 'parental results',
        renderScenario: () =>
            renderCheckResult({
                hostname: 'adult.example',
                reason: FILTERED_STATUS.FILTERED_PARENTAL,
            }),
        actions: [
            ['allow', 'Add to allowlist'],
            ['disable-parental', 'Disable Parental control'],
        ],
    },
    {
        name: 'non-custom filter blocks',
        renderScenario: () => renderMatchedFilterResult(),
        actions: [
            ['allow', 'Add to allowlist'],
            ['disable-filter', 'Disable filter'],
        ],
    },
    {
        name: 'processed results',
        renderScenario: () =>
            renderCheckResult({
                hostname: 'plain.example',
                reason: FILTERED_STATUS.NOT_FILTERED_NOT_FOUND,
            }),
        title: 'Domain is processed',
        description: 'No rules matched',
        rejectsObjectObject: true,
        actions: [
            ['allow', 'Add to allowlist'],
            ['block', 'Block'],
        ],
    },
    {
        name: 'allowed results',
        renderScenario: () =>
            renderCheckResult({
                hostname: 'allowed.example',
                reason: FILTERED_STATUS.NOT_FILTERED_WHITE_LIST,
                rules: [{ filter_list_id: 0, text: '@@||allowed.example^$important' }],
            }),
        title: 'Domain is allowed',
        actions: [['block', 'Block']],
    },
];

const settingToggleScenarios = [
    {
        name: 'safe browsing',
        actionKind: 'disable-safebrowsing',
        hostname: 'malware.example',
        reason: FILTERED_STATUS.FILTERED_SAFE_BROWSING,
        settingKey: SETTINGS_NAMES.safebrowsing,
        expectedSettingValue: true,
        toast: 'Browsing security disabled',
    },
    {
        name: 'parental control',
        actionKind: 'disable-parental',
        hostname: 'adult.example',
        reason: FILTERED_STATUS.FILTERED_PARENTAL,
        settingKey: SETTINGS_NAMES.parental,
        expectedSettingValue: true,
        toast: 'Parental control disabled',
    },
    {
        name: 'safe search',
        actionKind: 'disable-safesearch',
        hostname: 'search.example',
        reason: FILTERED_STATUS.FILTERED_SAFE_SEARCH,
        settingKey: SETTINGS_NAMES.safesearch,
        expectedSettingValue: expect.objectContaining({ enabled: false }),
        toast: 'Safe search disabled',
    },
];

beforeEach(() => {
    mocks.state = createState();
    mocks.dispatch.mockReset();
    mocks.dispatch.mockImplementation((action) => action);

    [
        mocks.getFilteringStatus,
        mocks.setRules,
        mocks.checkHost,
        mocks.toggleFilterStatus,
        mocks.initSettings,
        mocks.toggleBlocking,
        mocks.toggleBlockingForClient,
        mocks.toggleSetting,
        mocks.getRewritesList,
        mocks.updateRewrite,
        mocks.deleteRewrite,
        mocks.getBlockedServices,
        mocks.getAllBlockedServices,
        mocks.updateBlockedServices,
        mocks.addSuccessToast,
    ].forEach((mock) => mock.mockClear());
    mocks.toggleSetting.mockResolvedValue(true);
});

describe('UserRules harness', () => {
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

    it('uses the default qtype when submitting the check form', async () => {
        const user = userEvent.setup();

        renderUserRules();

        await submitCheckForm(user, { hostname: 'required.example' });

        expect(screen.getByTestId('user-rules-check-submit')).toBeEnabled();
        expect(mocks.checkHost).toHaveBeenCalledWith({
            name: 'required.example',
            client: undefined,
            qtype: 'A',
        });
    });

    it('bootstraps supporting state and hides the result card after dismiss', async () => {
        const user = userEvent.setup();

        renderCheckResult({ hostname: 'example.com' });

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

    resultActionScenarios.forEach(({ name, renderScenario, title, description, rejectsObjectObject, actions }) => {
        it(`renders expected result actions for ${name}`, () => {
            renderScenario();

            if (title) {
                expect(screen.getByText(title)).toBeInTheDocument();
            }

            if (description) {
                expect(screen.getByText(description)).toBeInTheDocument();
            }

            if (rejectsObjectObject) {
                expect(screen.queryByText(/\[object Object\]/)).not.toBeInTheDocument();
            }

            actions.forEach(([actionKind, label]) => {
                expect(screen.getByTestId(`user-rules-result-action-${actionKind}`)).toHaveTextContent(label);
            });
        });
    });

    it('does not show qtype or source rows in the result details', async () => {
        const user = userEvent.setup();

        renderMatchedFilterResult();

        await submitCheckForm(user, { hostname: 'filtered.example', qtype: 'A' });

        const resultCard = screen.getByTestId('user-rules-result-card');

        expect(within(resultCard).queryByText(/DNS record type:/)).not.toBeInTheDocument();
        expect(within(resultCard).queryByText(/Source:/)).not.toBeInTheDocument();
    });

    it('does not show a reason row when a matched filter has no source name', () => {
        renderCheckResult({
            hostname: 'filtered.example',
            reason: FILTERED_STATUS.FILTERED_BLACK_LIST,
            rules: [{ filter_list_id: 999, text: '||filtered.example^' }],
        });

        const resultCard = screen.getByTestId('user-rules-result-card');

        expect(within(resultCard).queryByText('Reason:', { selector: 'strong' })).not.toBeInTheDocument();
    });

    it('uses the client-specific toggle when allowlisting a client-specific block', async () => {
        const user = userEvent.setup();

        renderCheckResult({
            hostname: 'blocked.example',
            reason: FILTERED_STATUS.FILTERED_BLACK_LIST,
            rules: [{ filter_list_id: 0, text: '||blocked.example^' }],
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
        expectRecheck('blocked.example', 'office-laptop');
    });

    settingToggleScenarios.forEach(
        ({ name, actionKind, hostname, reason, settingKey, expectedSettingValue, toast }) => {
            it(`disables ${name} from result actions and rechecks the target`, async () => {
                const user = userEvent.setup();

                renderCheckResult({ hostname, reason });

                await submitCheckForm(user, { hostname });
                mocks.checkHost.mockClear();

                await user.click(screen.getByTestId(`user-rules-result-action-${actionKind}`));

                expect(mocks.toggleSetting).toHaveBeenCalledWith(settingKey, expectedSettingValue);
                expect(mocks.addSuccessToast).toHaveBeenCalledWith(toast);
                expectRecheck(hostname);
            });
        },
    );

    it('disables the matched filter and rechecks the host', async () => {
        const user = userEvent.setup();

        renderMatchedFilterResult();

        await submitCheckForm(user, { hostname: 'filtered.example', qtype: 'A' });
        mocks.checkHost.mockClear();

        await user.click(screen.getByTestId('user-rules-result-action-disable-filter'));

        expect(mocks.toggleFilterStatus).toHaveBeenCalledWith(
            'https://filters.example/blocklist.txt',
            {
                name: EXAMPLE_FILTER.name,
                url: EXAMPLE_FILTER.url,
                enabled: false,
            },
            false,
        );
        expect(mocks.addSuccessToast).toHaveBeenCalledWith('Example Blocklist was disabled');
        expectRecheck('filtered.example');
    });

    it('allows the blocked service with the user-rules toast copy', async () => {
        const user = userEvent.setup();

        renderCheckResult(
            {
                hostname: 'video.example',
                reason: FILTERED_STATUS.FILTERED_BLOCKED_SERVICE,
                service_name: 'YouTube',
            },
            {
                services: {
                    list: {
                        ids: ['youtube'],
                    },
                    allServices: [{ id: 'youtube', name: 'YouTube' }],
                },
            },
        );

        await submitCheckForm(user, {
            hostname: 'video.example',
        });

        mocks.checkHost.mockClear();
        await user.click(screen.getByTestId('user-rules-result-action-disable-blocked-service'));

        expect(mocks.updateBlockedServices).toHaveBeenCalledWith({ ids: [] }, { showToast: false });
        expect(mocks.addSuccessToast).toHaveBeenCalledWith('The YouTube service was allowed');
        expectRecheck('video.example');
    });

    it('does not show rewrite edit actions for hosts-file rewrites', () => {
        renderCheckResult({
            hostname: 'hosts.example',
            reason: FILTERED_STATUS.REWRITE_HOSTS,
            ip_addrs: ['127.0.0.1'],
        });

        expect(screen.queryByTestId('user-rules-result-action-edit-rewrite')).not.toBeInTheDocument();
    });

    it('uses the User Rules delete toast when removing a matched rewrite', async () => {
        const user = userEvent.setup();

        renderMatchedRewriteResult();

        expect(screen.getByTestId('user-rules-result-action-edit-rewrite')).toHaveTextContent('Edit DNS rewrite');
        expect(screen.getByTestId('user-rules-result-action-delete-rewrite')).toHaveTextContent('Remove DNS rewrite');

        await user.click(screen.getByTestId('user-rules-result-action-delete-rewrite'));
        await user.click(screen.getByRole('button', { name: 'Delete' }));

        expect(mocks.deleteRewrite).toHaveBeenCalledWith(MATCHED_REWRITE, { showToast: false });
        expect(mocks.addSuccessToast).toHaveBeenCalledWith('Rule removed from DNS rewrite');
    });

    it('uses the generic changes-saved toast when editing a matched rewrite', async () => {
        const user = userEvent.setup();

        renderMatchedRewriteResult();

        await user.click(screen.getByTestId('user-rules-result-action-edit-rewrite'));
        await user.clear(screen.getByLabelText('Answer'));
        await user.type(screen.getByLabelText('Answer'), 'new-target.example');

        const dialog = screen.getByRole('dialog');
        await user.click(within(dialog).getByRole('button', { name: 'Save' }));

        expect(mocks.updateRewrite).toHaveBeenCalledWith(
            {
                target: MATCHED_REWRITE,
                update: { ...MATCHED_REWRITE, answer: 'new-target.example' },
            },
            { showToast: false },
        );
        expect(mocks.addSuccessToast).toHaveBeenCalledWith('Changes saved');
    });
});
