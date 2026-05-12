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
    - [React Component Style](#react-component-style)
    - [Colors](#colors)
    - [Translations](#translations)
    - [Accessibility](#accessibility)
    - [Testing](#testing)
    - [Dependency Management](#dependency-management)
    - [Configuration & Documentation](#configuration--documentation)
    - [Markdown Formatting](#markdown-formatting)

## Project Overview

AdGuard Home is a free and open-source network-wide DNS server for blocking
ads and tracking. It operates as a DNS sinkhole that re-routes tracking
domains to a "black hole," preventing devices from connecting to ad/tracking
servers. The frontend dashboard (`client_v2`) is a React SPA that provides
the administration interface for configuring DNS settings, managing filter
lists, blocked services, encryption, and viewing query logs and statistics.

## Technical Context

| Field | Value |
| --- | --- |
| **Language** | TypeScript (ESNext target), Go 1.26.2 (backend) |
| **Frontend framework** | React 16 + Redux + Redux Thunk |
| **Bundler** | Webpack 5 (Babel loader for TS/TSX) |
| **Styling** | PostCSS with CSS Modules (`.pcss` files) |
| **Linters** | ESLint (airbnb + prettier + @typescript-eslint) |
| **Formatter** | Prettier (single quotes, trailing commas, 120 print width, 4-space tabs) |
| **Type checking** | `tsc --noEmit` (strict mode planned, currently loose) |
| **Testing** | Vitest (unit), Playwright (E2E) |
| **Translations** | JSON locale files via `@adguard/translate` + i18next |
| **Target platform** | Web (browsers > 1% market share) |
| **Project type** | Web application (Go backend + React frontend) |
| **Package manager** | npm (frontend) |
| **Storage** | BoltDB (backend), localStorage (frontend state) |

## Project Structure

```text
.
├── client_v2/                  # Frontend dashboard (React SPA)
│   ├── src/
│   │   ├── index.tsx           # App entry point
│   │   ├── configureStore.ts   # Redux store configuration
│   │   ├── initialState.ts     # Root state shape
│   │   ├── i18n.ts             # i18next initialization
│   │   ├── components/         # Feature components
│   │   │   ├── App/            # Root app shell, routing
│   │   │   ├── Settings/       # General settings
│   │   │   ├── DnsSettings/    # DNS configuration
│   │   │   ├── Encryption/     # TLS/HTTPS settings
│   │   │   ├── FilterLists/    # Block/allowlists, DNS rewrites
│   │   │   ├── BlockedServices/# Service blocking
│   │   │   └── SetupGuide/     # Setup wizard
│   │   ├── common/             # Shared code
│   │   │   ├── ui/             # Reusable UI components (Button, Dialog, etc.)
│   │   │   ├── controls/       # Form controls (Input, Checkbox, Select, etc.)
│   │   │   ├── intl/           # Translation helper (intl object)
│   │   │   └── styles/         # CSS variables, color tokens
│   │   ├── actions/            # Redux action creators
│   │   ├── reducers/           # Redux reducers
│   │   ├── api/                # API client (axios)
│   │   ├── helpers/            # Utility functions, constants, validators
│   │   ├── lib/                # Theme CSS modules, helper hooks
│   │   ├── stories/            # Storybook stories
│   │   ├── types/              # TypeScript type declarations
│   │   ├── __locales/          # Translation JSON files (12 locales)
│   │   └── __tests__/          # Unit tests (Vitest)
│   ├── tests/                  # E2E tests (Playwright)
│   ├── public/                 # Static HTML templates
│   ├── package.json            # Dependencies and scripts
│   ├── tsconfig.json           # TypeScript configuration
│   ├── webpack.common.js       # Shared Webpack config
│   ├── webpack.dev.js          # Dev Webpack config
│   ├── webpack.prod.js         # Prod Webpack config
│   ├── vitest.config.ts        # Vitest configuration
│   ├── playwright.config.ts    # Playwright configuration
│   ├── postcss.config.js       # PostCSS plugins
│   ├── .eslintrc.cjs           # ESLint configuration
│   └── .prettierrc             # Prettier configuration
├── internal/                   # Go backend packages
├── openapi/                    # API specifications
├── Makefile                    # Build orchestration
├── go.mod                      # Go module definition
└── main.go                     # Go entry point
```

## Build And Test Commands

All frontend commands run from the repository root using the Makefile, which
delegates to npm in the `client_v2` directory.

| Command | Description |
| --- | --- |
| `make js-deps` | Install frontend dependencies (`npm ci`) |
| `make js-build` | Production build (`webpack --config webpack.prod.js`) |
| `make js-lint` | Run ESLint (`eslint --ext .ts,.tsx src`) |
| `make js-typecheck` | Type-check (`tsc --noEmit`) |
| `make js-test` | Run unit tests (`vitest --run`) |
| `make js-test-e2e` | Run E2E tests (`playwright test`) |

Or directly with npm from `client_v2/`:

| Command | Description |
| --- | --- |
| `npm ci` | Install dependencies |
| `npm run build-prod` | Production build |
| `npm run build-dev` | Development build |
| `npm run watch` | Webpack watch mode |
| `npm run watch:hot` | Webpack dev server with HMR |
| `npm run lint` | ESLint |
| `npm run lint:fix` | ESLint with auto-fix |
| `npm run typecheck` | TypeScript type check |
| `npm run test` | Unit tests (Vitest) |
| `npm run test:e2e` | E2E tests (Playwright) |

## Contribution Instructions

- You MUST verify your changes with the linter, formatter, and type checker.

  Use the following commands (from `client_v2/`):
    - `npm run typecheck` to check for type errors
    - `npm run lint` to run the linter
    - `npm run lint:fix` to fix linting issues automatically

- You MUST update unit tests for changed utility/helper code.

- You MUST run tests with `npm run test` to verify that your changes do not
  break existing functionality.

- When making changes to the project structure, ensure the Project Structure
  section in `AGENTS.md` is updated and remains valid.

- If the prompt essentially asks you to refactor or improve existing code,
  check if you can phrase it as a code guideline. If it's possible, add it
  to the relevant Code Guidelines section in `AGENTS.md`.

- After completing the task you MUST verify that the code you've written
  follows the Code Guidelines in this file.

- New translation keys MUST be added to
  `client_v2/src/__locales/en.json`. Other locales are managed externally.

- Do NOT edit generated or vendored files. If the API layer changes, update
  `openapi/` specs and coordinate with the backend.

## Code Guidelines

### System Design

Design for a web application with a Go backend serving a React SPA:

- The frontend is a single-page application served as static files from the
  Go backend. There is no SSR — all rendering happens client-side.
- State that must persist across page reloads is stored in `localStorage` or
  fetched from the backend API on initialization.
- The frontend communicates with the backend exclusively through REST API
  calls (axios). There are no WebSocket connections.
- Keep the frontend bundle small — avoid large dependencies that bloat the
  download. The application is typically accessed over LAN but may be
  exposed to WAN with limited bandwidth.
- Handle API errors gracefully — show toast notifications for failures,
  never crash or show a blank screen when the backend is unreachable.

### Architecture

Design principles the codebase follows:

- **Separation of Concerns** — UI components, state management (Redux), and
  API communication live in separate layers.
- **Single Responsibility Principle** — each component handles one UI
  concern; each reducer manages one slice of state.
- **Dependency Direction** — components depend on actions/reducers/API, never
  the reverse.
- **Data Flow Clarity** — unidirectional data flow via Redux: components
  dispatch actions → reducers update state → components re-render.
- **Minimize Coupling, Maximize Cohesion** — feature components are
  self-contained directories; shared code lives in `common/`.
- **Keep It Boring** — prefer well-understood React + Redux patterns over
  clever or novel solutions.

The project's layers, from top to bottom:

```text
Components (UI rendering, user interaction)
     ↓
Actions (async thunks, dispatch side effects)
     ↓
Reducers (state transformations)
     ↓
API layer (axios HTTP calls to backend)
     ↓
Backend REST API
```

Components may call Actions. Actions call the API layer and dispatch to
Reducers. No layer may depend on a layer above it.

### Code Quality

- **Static analysis**: ESLint (airbnb + prettier + @typescript-eslint) is the
  primary gate. All code must pass `npm run lint` before merge.
- **Formatting**: Prettier enforces single quotes, trailing commas, 120-char
  line width, 4-space indentation, always-parenthesized arrow params.
- **TypeScript**: While `strict: false` currently, new code SHOULD use proper
  types. Avoid `any` where possible; prefer explicit typing or `unknown`
  with type guards. The goal is to enable strict mode.
- **No `console.log`**: Use `console.warn` or `console.error` only when
  necessary. ESLint warns on `console` usage.
- **Naming conventions**:
    - Files: PascalCase for components (`Button.tsx`), camelCase for
      utilities (`helpers.ts`), kebab-case for locale files (`zh-cn.json`).
    - Components: PascalCase (`Settings`, `DnsSettings`).
    - Variables and functions: camelCase.
    - Constants: UPPER_SNAKE_CASE for regex patterns and magic values.
    - CSS module import: always `s` (`import s from './Foo.module.pcss'`).
- **Import conventions**:
    - Use the `panel/*` path alias for cross-directory imports
      (`import intl from 'panel/common/intl'`).
    - Use relative imports within the same feature directory.
    - Re-export from `index.ts` files for clean public APIs.
- **Max line length**: 120 characters (enforced by ESLint).
- **Do not modify linter/formatter configs** (`.eslintrc.cjs`,
  `.prettierrc`) without team agreement.

### React Component Style

- **Functional components only** — no class components. Use arrow functions:
  ```tsx
  export const MyComponent = ({ label }: Props) => {
      return <div>{label}</div>;
  };
  ```

- **Props type naming** — use `type Props` for internal component props.
  Export as `ComponentNameProps` only when consumers need it:
  ```tsx
  type Props = {
      label: string;
      disabled?: boolean;
  };
  ```

- **`forwardRef` for form controls** — input components (Input, Checkbox,
  Select, Textarea) use `forwardRef` to expose the DOM element. Always set
  `displayName` after defining a forwardRef component:
  ```tsx
  const Input = forwardRef<HTMLInputElement, Props>((props, ref) => {
      // ...
  });
  Input.displayName = 'Input';
  ```

- **CSS Modules** — import with `s` alias, compose classes with `clsx`
  (imported as `cn`):
  ```tsx
  import cn from 'clsx';
  import s from './Button.module.pcss';

  <button className={cn(s.button, s[variant], { [s.active]: isActive })}>
  ```

- **Component file structure** — each component lives in its own directory:
  ```text
  Button/
  ├── Button.tsx          # Implementation
  ├── Button.module.pcss  # Styles
  └── index.ts            # Re-export
  ```

- **Theme utility** — for shared layout/typography styles, use the theme
  object from `panel/lib/theme`:
  ```tsx
  import theme from 'panel/lib/theme';
  <h1 className={cn(theme.layout.title, theme.title.h4)}>...</h1>
  ```

- **Forms** — use `react-hook-form` for form state management. Prefer
  `Controller` for custom inputs:
  ```tsx
  const { control } = useForm({ mode: 'onBlur', defaultValues });
  <Controller name="field" control={control} render={...} />
  ```

### Colors

- **Never hardcode color hex values** in component styles or inline styles.
  Always reference CSS custom properties defined in
  `client_v2/src/common/styles/colors/`:

  ```pcss
  /* correct */
  color: var(--default-main-text);
  background: var(--default-page-background);

  /* wrong */
  color: #3d3d3d;
  background: #ffffff;
  ```

- Color tokens are organized in three files:
    - `adg.css` — base color palette (product-primary, gray, red, etc.)
    - `light.css` — semantic tokens for light theme (`:root`)
    - `dark.css` — semantic tokens for dark theme (`[data-theme='dark']`)

- Using the semantic CSS variables means dark mode is handled automatically.
  Never write conditional logic for themes in JavaScript — rely on CSS
  custom properties.

- When adding a new color token, define it in both `light.css` and
  `dark.css` to ensure both themes work correctly.

### Translations

- All user-facing strings MUST be localized. Add new keys to
  `client_v2/src/__locales/en.json`. Other locale files are managed
  externally — do not edit them.

- Access translations via the `intl` object from `panel/common/intl`:
  ```tsx
  import intl from 'panel/common/intl';

  // Simple message
  {intl.getMessage('settings_title')}

  // With interpolation (supports JSX via tagged values)
  {intl.getMessage('settings_desc', {
      a: (text: string) => <Link href={url}>{text}</Link>,
  })}

  // Plurals
  {intl.getPlural('items_count', { count: items.length })}
  ```

- Translation keys should be descriptive and scoped to the feature:
  `feature_element_description` (e.g., `dns_settings_upstream_title`).

- **Never use dynamic or computed keys** with `intl.getMessage()`. All
  translation keys must be static string literals so they can be statically
  analyzed. If you need to select a translation based on a variable, use an
  explicit `switch` or a helper function with static `intl.getMessage('...')`
  calls for each case:
  ```tsx
  // BAD — dynamic key
  intl.getMessage(DAY_KEYS[day]);
  intl.getMessage(`prefix_${id}`);

  // GOOD — static keys in a switch helper
  const getDayName = (day: DayKey, intl) => {
      switch (day) {
          case 'mon': return intl.getMessage('monday');
          case 'tue': return intl.getMessage('tuesday');
          // ...
      }
  };
  ```

- The project supports 12 locales: en, de, es, fr, it, ja, ko, ru, pt-br,
  pt-pt, zh-cn, zh-tw.

- Do not add duplicate keys to locale files.

### Accessibility

All components must comply with these accessibility rules:

- **Use semantic HTML controls** for every interaction — `<button>`,
  `<a>`, `<input>`, `<select>`. Do NOT attach `onClick` to `<div>`,
  `<span>`, or icon elements.

- **Every interactive element must have an accessible name**:
    - Icon-only buttons → `aria-label` with a translation key.
    - Visible label → `<label htmlFor={id}>` paired with a matching `id`
      on the input.
    - Buttons with text content get their accessible name from the text.

- **Form controls** must associate labels:
  ```tsx
  <label htmlFor={id}>{label}</label>
  <input id={id} type="text" />
  ```

- **Disabled states** must use the `disabled` attribute on the native
  element, not just visual styling.

- **Focus management** — interactive elements must be keyboard-accessible.
  Only remove from tab order (`tabIndex={-1}`) with justification (e.g.,
  auxiliary icon buttons that duplicate functionality).

- **Error states** must be perceivable — use `aria-invalid` on inputs with
  errors, and associate error messages via `aria-describedby` or visible
  adjacent text.

- Every new `aria-label` string must have a dedicated translation key in
  `en.json`.

### Testing

- **Unit tests** (Vitest): Required for utility functions, helpers, and
  non-trivial data transformations in `helpers/` and `lib/`.
    - Test files live in `src/__tests__/` with the `.test.ts` extension.
    - Use `describe` / `test` / `expect` from Vitest.
    - Run with `npm run test`.

- **E2E tests** (Playwright): Required for user-facing features and flows.
    - Test files live in `tests/e2e/` with the `.spec.ts` extension.
    - Run with `npm run test:e2e`.
    - Tests use global setup/teardown for the AdGuard Home server.

- **Mocking**: Use `vi.fn()` and `vi.mock()` from Vitest. Mock API calls
  and external dependencies — do not mock internal utilities.

- All tests must pass before merge. Do not skip or disable tests without
  a comment explaining why and a tracking issue.

### Dependency Management

- **Pin all dependency versions explicitly** — do not use version ranges
  that allow automatic upgrades to untested versions.
- **Prefer vanilla solutions** — use the language's standard library and
  built-in APIs when they adequately solve the problem. Only add a
  dependency when it provides significant value over a vanilla
  implementation.
- **Reputable sources only** — dependencies MUST come from
  well-established, actively maintained projects. Evaluate by download
  counts, repository activity, and known maintainers.
- **Avoid unpopular libraries** — do NOT add niche or obscure packages
  with limited community adoption. These pose security risks and may
  become unmaintained.
- **Minimize dependency count** — each new dependency increases attack
  surface, bundle size, and maintenance burden. Justify every addition.
- **Use the latest stable version** — when adding a new dependency,
  explicitly check the npm registry for the latest stable release and
  use it. Do not copy outdated version numbers from memory, training
  data, or existing lock files of other projects.

**Rationale**: Fewer, well-vetted dependencies reduce security
vulnerabilities, supply chain risks, and long-term maintenance costs.

**Known exclusions** (to be addressed):

- `date-fns` is pinned at v1.29.0 — significantly outdated, should be
  updated to v3+ or replaced with native `Intl.DateTimeFormat`.
- `redux-actions` v2.6.5 — deprecated package, consider removing in favor
  of plain Redux action creators or Redux Toolkit.
- Version ranges (`^`) are used instead of exact pins — this is the current
  convention but exact pinning is preferred for new additions.

### Configuration & Documentation

- The frontend is configured at build time via environment variables
  passed through Webpack (`BUILD_ENV`). Runtime configuration comes from
  the backend API (`/control/status`).
- No `.env` files — build environment is controlled by the Makefile
  (`NODE_ENV`, `BUILD_ENV`).
- API base URL is determined at runtime (same origin as the served page).
- User preferences (theme, language) are stored in `localStorage`.
- When changing build commands, project structure, or API interactions,
  update this `AGENTS.md` and the `README.md` accordingly.

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
  NOT use two-space line breaks — use a blank line instead.
- **Bare URLs**: Bare URLs are permitted and do not need to be wrapped
  in angle brackets.
- **Table formatting**: Align table columns with padding when the table
  fits within 80 characters. If the table exceeds 80 characters or
  triggers an MD060 linter warning, switch to a compact format using
  single spaces only. This applies to the separator row as well — it
  should be written as `| --- |`, not `|--|`.

  Example of correct layout:

  ```markdown
  | Col1 | Col2 |
  | --- | --- |
  | Value1 | Value2 |
  ```

  Do NOT use extra padding or alignment characters beyond single spaces.

**Rationale**: Uniform Markdown formatting improves readability for both
humans and AI agents that consume project documentation.
