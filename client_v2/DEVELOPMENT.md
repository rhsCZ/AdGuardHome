# DEVELOPMENT.md

## Table of Contents

- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
    - [Install Dependencies](#install-dependencies)
    - [Build the Frontend](#build-the-frontend)
    - [Run Locally](#run-locally)
- [Development Workflow](#development-workflow)
    - [Development Server with HMR](#development-server-with-hmr)
    - [Watch Mode](#watch-mode)
    - [Local Frontend Flag](#local-frontend-flag)
    - [Linting](#linting)
    - [Type Checking](#type-checking)
    - [Running Tests](#running-tests)
    - [Storybook](#storybook)
- [Available Scripts](#available-scripts)
- [E2E Testing](#e2e-testing)
    - [Prerequisites for E2E](#prerequisites-for-e2e)
    - [Running E2E Tests](#running-e2e-tests)
- [Project Configuration](#project-configuration)
    - [Webpack](#webpack)
    - [Path Aliases](#path-aliases)
    - [PostCSS](#postcss)
    - [Environment Variables](#environment-variables)
- [Troubleshooting](#troubleshooting)
- [Additional Resources](#additional-resources)

## Prerequisites

| Tool | Version | Purpose |
| --- | --- | --- |
| Node.js | 20.x or later | JavaScript runtime |
| npm | 10.x or later (ships with Node.js) | Package manager |
| Go | 1.26.2 | Backend (needed for local-frontend dev) |
| AdGuardHome binary | Current build | Running the backend for full-stack dev |

Optional tools:

- **Playwright browsers** — installed via `npx playwright install` for E2E
  tests
- **Storybook** — no extra tools needed, runs via npm script

## Getting Started

All frontend commands are run from the `client_v2/` directory.

### Install Dependencies

```sh
cd client_v2
npm ci
```

Use `npm ci` (not `npm install`) to get a reproducible build from the
lockfile.

### Build the Frontend

Development build (faster, includes source maps):

```sh
npm run build-dev
```

Production build (optimized, minified):

```sh
npm run build-prod
```

Both builds output files to `../build/static/` relative to `client_v2/`.

### Run Locally

To see the frontend in action, you need the AdGuard Home backend running:

1. Build the frontend:

   ```sh
   npm run build-prod
   ```

2. From the repository root, run the backend with `--local-frontend`:

   ```sh
   ./AdGuardHome --local-frontend -v
   ```

   This tells AdGuard Home to serve files from `./build/static/` instead
   of the embedded frontend.

3. Open http://127.0.0.1:3000 (or whatever `bind_port` is configured in
   `AdGuardHome.yaml`).

## Development Workflow

### Development Server with HMR

The fastest iteration loop uses webpack-dev-server with hot module
replacement. It proxies API requests to the running AdGuard Home backend.

1. Ensure AdGuard Home is running (see [Run Locally](#run-locally) step 2).

2. Start the dev server:

   ```sh
   npm run watch:hot
   ```

3. The dev server reads `../AdGuardHome.yaml` to determine the backend
   address, then starts on port `backend_port + 8000` (e.g., if the
   backend runs on port 3000, the dev server runs on port 11000).

   Override the dev server port with `DEV_SERVER_PORT`:

   ```sh
   DEV_SERVER_PORT=8080 npm run watch:hot
   ```

4. The browser opens automatically. Changes to `.tsx`, `.ts`, and `.pcss`
   files are hot-reloaded without full page refresh.

### Watch Mode

If you don't need HMR (e.g., testing in the actual backend-served UI),
use watch mode which rebuilds on file changes:

```sh
npm run watch
```

Then access the UI through the backend at its configured port.

### Local Frontend Flag

The `--local-frontend` flag on the AdGuard Home binary tells it to serve
frontend files from `./build/static/` on disk rather than the compiled-in
assets. This is required for both watch mode and dev-server workflows.

### Linting

Run ESLint:

```sh
npm run lint
```

Auto-fix issues:

```sh
npm run lint:fix
```

ESLint is configured with airbnb + prettier + @typescript-eslint. See
`.eslintrc.cjs` for the full configuration.

### Type Checking

```sh
npm run typecheck
```

For continuous type checking during development:

```sh
npm run typecheck:watch
```

### Running Tests

Unit tests (Vitest):

```sh
npm run test
```

Watch mode for tests:

```sh
npm run test:watch
```

### Storybook

Storybook is available for developing and previewing UI components in
isolation:

```sh
npm run storybook
```

This starts Storybook on http://localhost:6006.

Build a static Storybook site:

```sh
npm run build-storybook
```

## Available Scripts

All scripts are defined in `client_v2/package.json` and run from the
`client_v2/` directory.

| Script | Command | Description |
| --- | --- | --- |
| `build-dev` | `npm run build-dev` | Development build (source maps, no minification) |
| `build-prod` | `npm run build-prod` | Production build (minified, chunkhash filenames) |
| `watch` | `npm run watch` | Rebuild on file changes |
| `watch:hot` | `npm run watch:hot` | Webpack dev server with HMR |
| `lint` | `npm run lint` | Run ESLint on `src/` |
| `lint:fix` | `npm run lint:fix` | ESLint with auto-fix |
| `test` | `npm run test` | Run unit tests (Vitest) |
| `test:watch` | `npm run test:watch` | Unit tests in watch mode |
| `test:e2e` | `npm run test:e2e` | Run E2E tests (Playwright) |
| `test:e2e:interactive` | `npm run test:e2e:interactive` | E2E tests with Playwright UI |
| `test:e2e:debug` | `npm run test:e2e:debug` | E2E tests in debug mode |
| `test:e2e:codegen` | `npm run test:e2e:codegen` | Playwright test recorder |
| `typecheck` | `npm run typecheck` | TypeScript type checking |
| `typecheck:watch` | `npm run typecheck:watch` | Continuous type checking |
| `storybook` | `npm run storybook` | Start Storybook dev server |
| `build-storybook` | `npm run build-storybook` | Build static Storybook |

Equivalent Makefile targets (from the repository root):

| Target | Description |
| --- | --- |
| `make js-deps` | `npm ci` in `client_v2/` |
| `make js-build` | Production build |
| `make js-lint` | ESLint |
| `make js-typecheck` | TypeScript type check |
| `make js-test` | Unit tests |
| `make js-test-e2e` | E2E tests |

## E2E Testing

### Prerequisites for E2E

1. Install Playwright browsers:

   ```sh
   npx playwright install chromium
   ```

2. Build the AdGuard Home binary from the repository root (requires Go):

   ```sh
   make go-build
   ```

3. The test suite starts AdGuard Home automatically using the binary at
   `../AdGuardHome` with a temporary config at `/tmp/AdGuard.e2e.yaml`
   and a temporary work directory at `/tmp/AdGuard.e2e.work`.
   The seeded config binds DNS to port `5353`, so `sudo` is not required.

### Running E2E Tests

```sh
npm run test:e2e
```

Interactive mode (opens Playwright UI for selecting and debugging tests):

```sh
npm run test:e2e:interactive
```

Debug mode (step through tests with inspector):

```sh
npm run test:e2e:debug
```

Record new tests with Playwright codegen:

```sh
npm run test:e2e:codegen
```

E2E tests run in headless Chromium by default. The global setup performs
login-friendly bootstrap checks, and global teardown removes the temporary
config file and work directory.

## Project Configuration

### Webpack

Three Webpack configs compose the build:

- `webpack.common.js` — shared config (entry points, loaders, plugins,
  output path)
- `webpack.dev.js` — development overrides (source maps, dev server proxy)
- `webpack.prod.js` — production overrides (minimal stats, no perf hints)

Entry points:

- `src/index.tsx` — main dashboard SPA
- `src/install/index.tsx` — installation wizard
- `src/login/index.tsx` — login page
- `src/forgot_password/index.tsx` — password recovery

Output directory: `../build/static/` (served by the Go backend).

### Path Aliases

Defined in `tsconfig.json` and mirrored in Webpack:

| Alias | Resolves to |
| --- | --- |
| `panel/*` | `./src/*` |

Use the alias for cross-directory imports:

```tsx
import intl from 'panel/common/intl';
import { Button } from 'panel/common/ui/Button';
```

Use relative imports within the same feature directory.

### PostCSS

Configured in `postcss.config.js` with:

- `postcss-import` — `@import` resolution
- `postcss-nested` — nesting support (Sass-like `&` syntax)
- `autoprefixer` — vendor prefix insertion (last 2 versions)

CSS Modules use the `.module.pcss` extension. Regular global styles use
`.pcss` or `.css`.

### Environment Variables

| Variable | Used By | Description |
| --- | --- | --- |
| `BUILD_ENV` | Webpack | `dev` or `prod` — controls Webpack mode |
| `NODE_ENV` | Webpack/Babel | `development` or `production` |
| `DEV_SERVER_PORT` | webpack-dev-server | Override the dev server port |
| `CI` | Playwright | Adjusts E2E config (retries, workers, stdout) |

No `.env` file is used. Variables are passed via command line or the
Makefile.

## Troubleshooting

**`npm ci` fails with peer dependency conflicts**

Try:

```sh
npm ci --legacy-peer-deps
```

Some packages have unresolved peer dependency ranges.

**Dev server can't connect to backend**

- Verify AdGuard Home is running with `--local-frontend`.
- Check that `../AdGuardHome.yaml` exists and contains valid `bind_host`
  and `bind_port` values.
- If the backend binds to `0.0.0.0`, the dev server uses `127.0.0.1` as
  the proxy target.

**TypeScript reports `baseUrl` deprecation warning**

This is a known warning with TypeScript 7.x:

```
Option 'baseUrl' is deprecated and will stop functioning in TypeScript 7.0.
```

It does not block type checking. The project uses `baseUrl` for path alias
resolution. A migration to `paths`-only resolution is planned.

**E2E tests require sudo on macOS**

The Playwright config runs `sudo ./AdGuardHome` because binding to low
ports (like 3000) may require elevated permissions on macOS. If you see
permission errors, run the tests with `sudo`:

```sh
sudo npm run test:e2e
```

**Styles not updating in watch mode**

Disable the browser cache (DevTools → Network → "Disable cache") to ensure
you see the latest compiled CSS.

**Port already in use**

If the dev server or backend reports a port conflict:

```sh
lsof -i :3000    # Find the process on the backend port
lsof -i :11000   # Find the process on the dev server port
kill <PID>
```

## Additional Resources

- [AGENTS.md](AGENTS.md) — code guidelines, architecture, and contribution
  rules
- [README.md](README.md) — project overview and user documentation
- [CHANGELOG.md](CHANGELOG.md) — release history
- [openapi/](openapi/) — API specification
- [Playwright docs](https://playwright.dev/docs/intro) — E2E testing
  framework
- [Vitest docs](https://vitest.dev/guide/) — unit testing framework
- [Storybook docs](https://storybook.js.org/docs) — component development
