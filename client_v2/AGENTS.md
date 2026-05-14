# AGENTS.md

## Table of Contents

- [Project Overview](#project-overview)
- [Technical Context](#technical-context)
- [Project Structure](#project-structure)
- [Build And Test Commands](#build-and-test-commands)
- [Contribution Instructions](#contribution-instructions)
- [Code Guidelines](#code-guidelines)
    - [System Design](#system-design)
    - [Architecture](#architecture)
    - [Code Quality](#code-quality)
    - [Testing](#testing)
    - [Dependency Management](#dependency-management)
    - [Configuration & Documentation](#configuration--documentation)
    - [Markdown Formatting](#markdown-formatting)
    - [Other](#other)

## Project Overview

This file covers `client_v2` only.

`client_v2` is the active frontend dashboard for AdGuard Home. It is a
TypeScript React single-page application that builds static assets into
`../build/static/`, where the parent application serves them at runtime.
The package owns the browser UI, frontend state, route screens, shared
controls, frontend translations, and browser-level tests.

Use [DEVELOPMENT.md](DEVELOPMENT.md) for environment setup and local
tooling. Keep this file focused on in-package conventions, structure,
and verification.

## Technical Context

- **Language/Version**: TypeScript with `target: ESNext`, `strict: false`,
  and `noImplicitAny: true`.
- **Primary Dependencies**: React 16.13.1, Redux 4, `redux-thunk`,
  `react-hook-form`, `i18next`, Webpack 5, PostCSS, Storybook 9.
- **Storage**: Browser `localStorage` for UI preferences and cached client
  state; backend state is fetched through the AdGuard Home HTTP API.
- **Testing**: Vitest 3 with jsdom and Testing Library for unit tests;
  Playwright 1.56.0 for browser flows.
- **Target Platform**: Browser-based admin UI served from the same origin as
  the AdGuard Home backend.
- **Project Type**: Bundled frontend web application.
- **Performance Goals**: N/A in repo docs. Keep route payloads, bundle
  growth, and client-side work modest.
- **Constraints**: Hash-based routing with `hashType="noslash"`; no SSR;
  assets must remain compatible with the parent application's
  `../build/static/` contract; Playwright depends on the repo-root
  `./AdGuardHome` binary.
- **Scale/Scope**: Admin dashboard for a single self-hosted AdGuard Home
  instance.

## Project Structure

```text
client_v2/
├── src/                    # Application source
│   ├── index.tsx           # Main dashboard entry point
│   ├── configureStore.ts   # Redux store wiring
│   ├── initialState.ts     # Root state types and defaults
│   ├── i18n.ts             # i18next bootstrap
│   ├── actions/            # Async thunks and action creators
│   ├── reducers/           # Redux reducers and state slices
│   ├── api/                # Shared HTTP client for backend requests
│   ├── components/         # Route screens and feature UI
│   ├── common/             # Shared controls, UI primitives, styles, intl
│   ├── helpers/            # Constants, formatters, validators, storage
│   ├── hooks/              # Shared React hooks
│   ├── __locales/          # Locale files; en.json is the source of truth
│   ├── __tests__/          # Vitest and Testing Library coverage
│   ├── stories/            # Storybook stories
│   ├── login/              # Standalone login page entry
│   ├── install/            # Standalone install page entry
│   └── forgot_password/    # Standalone password-reset page entry
├── tests/
│   └── e2e/                # Playwright specs and harness scripts
├── scripts/                # Translation audit and maintenance helpers
├── public/                 # HTML templates and copied static assets
├── .storybook/             # Storybook configuration
├── package.json            # Frontend scripts and dependency manifest
├── tsconfig.json           # TypeScript compiler options and path aliases
├── vitest.config.ts        # Vitest config and module aliases
├── playwright.config.ts    # Playwright config and webServer boot
├── webpack.common.js       # Shared bundling configuration
├── webpack.dev.js          # Watch mode and dev-server configuration
├── webpack.prod.js         # Production bundle configuration
├── .eslintrc.cjs           # ESLint rules
└── .prettierrc             # Prettier formatting rules
```

## Build And Test Commands

Run these commands from `client_v2/` unless noted otherwise.

- `npm ci` installs dependencies from `package-lock.json`.
- `npm run build-dev` creates a development build.
- `npm run build-prod` creates the production bundle in
  `../build/static/`.
- `npm run watch` rebuilds on file changes.
- `npm run watch:hot` starts `webpack-dev-server` with HMR.
- `npm run lint` runs ESLint on `src/`.
- `npm run lint:fix` runs ESLint with autofix.
- `npx prettier --check .` checks formatting.
- `npx prettier --write <paths>` formats selected files.
- `npm run typecheck` runs `tsc --noEmit`.
- `npm run typecheck:watch` runs the type checker in watch mode.
- `npm run test` runs Vitest once.
- `npm run test:watch` runs Vitest in watch mode.
- `npm run translations:check` audits `intl` usage against
  `src/__locales/en.json`.
- `npm run storybook` starts Storybook.
- `npm run build-storybook` builds the static Storybook site.
- `npm run test:e2e` runs the Playwright suite.
- `npm exec -- playwright test tests/e2e/<spec>.ts` runs a focused
  Playwright spec from `client_v2/`.

Notes:

- `npm run test:e2e` expects the repo-root `./AdGuardHome` binary to exist,
  because Playwright starts the parent application with `--local-frontend`.
- After frontend changes, rebuild with `npm run build-prod` before browser
  verification. The Playwright harness serves files from `../build/static/`.

## Contribution Instructions

- You MUST verify frontend changes with the formatter, linter, and type
  checker before finishing.

    Use the following commands:
    - `npx prettier --check .`
    - `npm run lint`
    - `npm run typecheck`

    Use the following fix commands when needed:
    - `npx prettier --write <paths>`
    - `npm run lint:fix`

- You MUST update unit tests in `src/__tests__/` when you change non-trivial
  UI logic, helpers, formatting, selectors, or state mapping.

- You MUST run the relevant tests and make them pass.

    Use these commands as applicable:
    - `npm run test` for unit coverage
    - `npm run translations:check` when you touch locale keys or `intl`
      usage
    - `npm run build-prod` before browser verification
    - `npm run test:e2e` for browser-visible flows

- When making changes to the package structure, you MUST update the Project
  Structure section in this file.

- If the task is effectively a refactor or repeated cleanup, you MUST turn
  the reusable rule you discovered into a Code Guidelines entry in this file.

- After completing the task, you MUST verify that your changes follow the
  Code Guidelines in this file.

- New translation keys MUST be added only to `src/__locales/en.json`.
  Other locale files are managed outside this package.

- You MUST NOT edit generated outputs such as `../build/static/`,
  `playwright-report/`, or `test-results/` manually.

## Code Guidelines

### System Design

Design for a bundled browser admin application:

- The package ships a client-side SPA only. There is no SSR, and route
  handling is hash-based rather than server-routed.
- The parent application serves the built assets from `../build/static/`.
  Changes to routing, entry points, or static asset names must respect that
  contract.
- Frontend state that must survive reloads belongs in backend APIs or
  browser storage, not in ad-hoc in-memory globals.
- The UI talks to the backend through the HTTP API and must tolerate auth
  redirects, unavailable services, and partial data without blank screens.
- Keep client-side work lightweight. Avoid unnecessary dependencies, large
  data reshaping in render paths, and duplicate fetches.
- Preserve the current URL model unless there is a coordinated product
  change. `HashRouter` uses `hashType="noslash"`, so runtime URLs look like
  `#logs?...` rather than `#/logs`.

### Architecture

- **Separation of Concerns**: Keep route components, shared UI, store logic,
  API access, and helper code in separate directories.
- **Single Responsibility Principle**: Each reducer, helper, and component
  should have one clear reason to change. Several route files are already
  large, so new unrelated logic should be extracted instead of appended.
- **Dependency Direction**: Dependencies should flow from entry points and UI
  down to shared helpers and the API boundary, never upward.
- **Explicit Boundaries**: Reuse shared code through `common/`, `helpers/`,
  `hooks/`, and `index.ts` re-exports instead of reaching into sibling
  feature internals.
- **Data Flow Clarity**: User interaction should dispatch actions, actions
  should call helpers or the API client, reducers should update state, and
  components should read state through selectors.
- **Minimize Coupling, Maximize Cohesion**: Keep feature-specific logic with
  the feature; move only stable reusable pieces into shared folders.
- **Make Invalid States Impossible**: TypeScript is not strict yet, so use
  narrow types, guarded parsing, and form validation to prevent illegal
  states.
- **Observability Built-in**: Surface request failures through UI state or
  toasts; avoid silent failures and avoid adding casual console logging.
- **Keep It Boring**: Prefer the existing React 16, Redux, CSS Modules, and
  `react-hook-form` patterns over introducing new state or styling systems.

The easiest way to achieve these principles is **layered architecture**.
This package's layers, from top to bottom:

- Entry points and route shells: `src/index.tsx`, `src/login/`,
  `src/install/`, `src/forgot_password/`.
- Feature UI: `src/components/` for route screens and feature blocks.
- Shared presentation: `src/common/ui/`, `src/common/controls/`,
  `src/lib/theme/`, `src/hooks/`.
- State orchestration: `src/actions/`, `src/configureStore.ts`.
- State storage: `src/reducers/`, `src/initialState.ts`.
- External boundaries: `src/api/Api.ts`, browser APIs such as
  `localStorage`, and the parent application's HTTP endpoints.

```text
Entry points and route shells
     ↓
Feature components and shared UI
     ↓ dispatch / select
Actions and thunks  ←→  Store and reducers
     ↓
API client and browser helpers
     ↓
AdGuard Home HTTP API and browser storage
```

Components may depend on shared UI, hooks, helpers, actions, and selectors.
Actions may depend on helpers and the API client. Lower layers must not
import route components.

**Known exclusions** (to be fixed):

- Some components still import modal helpers directly from
  `src/reducers/modals` instead of going through action creators. Keep new
  code on the action-driven path instead of copying that dependency.

### Code Quality

- ESLint and Prettier are the style gates. Treat `npm run lint` and
  `npx prettier --check .` as authoritative, and do not weaken their config
  to land a change.
- Formatting follows the checked-in Prettier rules: 4-space indentation,
  semicolons, single quotes, trailing commas, and a 120-character print
  width.
- TypeScript is intentionally non-strict today, but `noImplicitAny` is on.
  New code should still avoid `any` when a real type, union, or `unknown`
  plus narrowing will work.
- Keep API access inside `src/api/Api.ts` and action thunks. Components
  should not issue ad-hoc `fetch` calls.
- Preserve existing naming conventions: PascalCase component files and
  directories, camelCase helpers and local variables, `type Props` for local
  component props, `s` for CSS Module imports, and `cn` for `clsx` helpers.
- Use the `panel/*` alias for cross-package imports. Use relative imports
  only for nearby files inside the same feature tree.
- Prefer wrapped UI error handling over logs. The API client throws request
  errors; callers should convert failures into visible UI state, form errors,
  or toasts instead of swallowing them.

**Known exclusions** (to be fixed):

- Translation usage audits are best-effort because some current files still
  call `intl.getMessage(...)` with variable keys. Do not add new dynamic
  key lookups.
- A few legacy styles and stories still contain raw hex values. Do not use
  them as precedent for new feature styles.

### Testing

- Unit tests live under `src/__tests__/` and are matched by
  `src/__tests__/**/*.{test,spec}.{ts,tsx}`.
- Vitest runs in jsdom and loads `src/__tests__/setup.ts`, which installs
  Testing Library matchers and cleans up the DOM after each test.
- Prefer unit tests for helpers, state mapping, query-log formatting, and
  component behavior that can be exercised without a full backend.
- Use Playwright only for route-level behavior, backend/frontend contracts,
  and browser interactions that matter end-to-end.
- Playwright specs live in `tests/e2e/*.spec.ts`. The harness prepares a
  temporary config, starts the repo-root `./AdGuardHome` binary with
  `--local-frontend`, and points it at `../build/static/`.
- Rebuild with `npm run build-prod` before Playwright verification when
  frontend assets changed.
- Mock external boundaries with `vi.mock()` and `vi.fn()` when unit tests
  need isolation. Prefer asserting visible behavior or state changes over
  mocking deep internal helper chains.
- No coverage percentage target is documented. Add the narrowest automated
  test that proves the change you made.

### Dependency Management

- **Pin all dependency versions explicitly** in `package.json`. Do not use
  version ranges that allow automatic upgrades to untested versions.
- **Prefer vanilla solutions**. Use browser APIs, React primitives, and
  Node.js built-ins when they solve the problem cleanly enough.
- **Reputable sources only**. New dependencies MUST come from maintained,
  well-known projects with active releases and visible maintainers.
- **Avoid unpopular libraries**. Do NOT add niche packages with limited
  adoption when an established option already exists.
- **Minimize dependency count**. Every addition increases bundle size,
  review cost, and supply-chain risk.
- **Use the latest stable version**. When adding a dependency, check the
  registry directly instead of copying a version from memory or another repo.

**Rationale**: Fewer, well-vetted dependencies reduce security
vulnerabilities, supply-chain risk, and long-term maintenance cost.

**Known exclusions** (to be fixed):

- `package.json` currently uses `^` ranges for most dependencies instead of
  exact pins.
- `date-fns` is still on the v1 line.
- `redux-actions` remains in use even though the package is legacy and the
  surrounding Redux code could be migrated to plainer patterns over time.
- `path` is listed as a dev dependency even though Node.js already provides a
  built-in `path` module.

### Configuration & Documentation

- Build-time behavior is controlled by package scripts and Webpack config,
  primarily through `NODE_ENV`, `BUILD_ENV`, and `DEV_SERVER_PORT`.
- Runtime API access is same-origin. The frontend is bundled into
  `../build/static/` and served by the parent application.
- Persist browser settings through the existing local-storage helpers and
  keys. Do not add ad-hoc storage keys when a shared helper already exists.
- `src/__locales/en.json` is the authoritative locale file in this package.
  If you change translation usage or keys, run `npm run translations:check`.
- When you change scripts, project structure, or workflow guidance, update
  this file and `DEVELOPMENT.md` together if either document becomes stale.
- When you change frontend toolchain behavior, keep the owning config files
  in sync: `tsconfig.json`, `vitest.config.ts`, `playwright.config.ts`,
  `webpack*.js`, `.eslintrc.cjs`, `.prettierrc`, and `.storybook/`.
- Do not commit secrets, machine-specific paths, or real credentials. The
  E2E harness uses temporary files and test credentials only.
- Do not edit generated artifacts manually, including `../build/static/`,
  `playwright-report/`, and `test-results/`.

### Markdown Formatting

All Markdown files MUST follow these formatting rules:

- **Line length**: Keep lines at most 80 characters. This is not a hard
  lint gate, but SHOULD be followed for readability. Lines inside fenced
  code blocks are exempt from this limit.
- **Unordered lists**: Use dashes (`-`) for bullet points. Indent nested
  list items by 4 spaces.
- **Emphasis**: Use asterisks (`*`) for emphasis (`*italic*`,
  `**bold**`). Do NOT use underscores.
- **Headings**: Duplicate heading names are allowed only among sibling
  headings (same parent level). Avoid duplicates across different levels.
- **Inline HTML**: Avoid raw HTML in Markdown. The only allowed elements
  are `<a>`, `<p>`, `<details>`, `<summary>`, and `<img>`.
- **Trailing spaces**: Do NOT leave trailing whitespace on any line. Do
  NOT use two-space line breaks. Use a blank line instead.
- **Bare URLs**: Bare URLs are permitted and do not need to be wrapped
  in angle brackets.
- **Table formatting**: Align table columns with padding when the table fits
  within 80 characters. If the table exceeds 80 characters or triggers an
  MD060 linter warning, switch to a compact format using single spaces only.
  This applies to the separator row as well. It should be written as
  `| --- |`, not `|--|`.

    Example of correct layout:

    ```markdown
    | Col1   | Col2   |
    | ------ | ------ |
    | Value1 | Value2 |
    ```

    Do NOT use extra padding or alignment characters beyond single spaces.

**Rationale**: Uniform Markdown formatting improves readability for both
humans and AI agents that consume project documentation.

### Other

- Prefer functional React components. The current `src/` tree does not use
  class components.
- Shared form controls in `src/common/controls/` use `forwardRef`; keep the
  exported ref type correct and set `displayName` on forwarded components.
- Use `react-hook-form` for non-trivial forms. Prefer `Controller`,
  `useForm`, and `FormProvider` patterns that match existing screens.
- Use CSS Modules with `.module.pcss` files for component styles. Keep
  shared typography and layout in `src/lib/theme/` and prefer semantic color
  tokens from `src/common/styles/colors/`.
- New user-facing strings belong behind `intl.getMessage()` or
  `intl.getPlural()`, and new keys belong in `src/__locales/en.json` only.
- Keep translation keys static when possible. Static keys are required for
  accurate translation audits.
- Use semantic HTML controls, accessible names, and native `disabled`
  attributes. For form errors, use `aria-invalid` and connect helper text
  with `aria-describedby`.
