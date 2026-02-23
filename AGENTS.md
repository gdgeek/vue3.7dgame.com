# Repository Guidelines

## Project Structure & Module Organization
- `src/` contains the Vue 3 app (views, components, router, store, services, styles, utils).
- `public/` hosts static assets copied as-is at build time.
- `mock/` provides local mock data/services (toggle via `.env.development`).
- `test/` holds Vitest unit tests (e.g., `test/unit/...`).
- `tests/e2e/` contains Playwright end-to-end tests.
- `docs/`, `scripts/`, and `docker/` include documentation, maintenance scripts, and deployment tooling.
- `dist/` is the production build output (generated).

## Build, Test, and Development Commands
Use `pnpm` (enforced by `preinstall`).
- `pnpm install`: install dependencies.
- `pnpm dev`: start Vite dev server (default port 3001).
- `pnpm build`: type-check then production build.
- `pnpm build:7dgame_com`: build for a specific domain mode (see `.env.*`).
- `pnpm preview`: preview the production build.
- `pnpm test` / `pnpm test:run`: run Vitest (watch / once).
- `pnpm test:coverage`: run tests with coverage output in `coverage/`.
- `pnpm lint:eslint` / `pnpm lint:prettier` / `pnpm lint:stylelint`: fix lint/format issues.
- `pnpm storybook`: run Storybook (UI components).

## Coding Style & Naming Conventions
- Indentation: 2 spaces (see `.editorconfig`).
- TypeScript + Vue SFCs; use `@` alias for `src/` imports.
- Formatting is enforced by Prettier; linting by ESLint + Stylelint. Run the lint scripts or rely on Husky + lint-staged.

## Testing Guidelines
- Unit tests: Vitest + jsdom. Test files live under `test/**` or alongside code as `*.spec.ts`/`*.test.ts`.
- E2E tests: Playwright in `tests/e2e/`. Base URL is `http://localhost:3003` per `playwright.config.ts`.
- Coverage reports: generated via `pnpm test:coverage`.

## Commit & Pull Request Guidelines
- Commit messages follow Conventional Commits (see `commitlint.config.cjs`): `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, etc.
- Prefer `pnpm run commit` (Commitizen) to format messages correctly.
- PRs should include a clear description of changes, link relevant issues, and add screenshots for UI changes when applicable.

## Configuration Tips
- Environment files: `.env.development`, `.env.production`, and domain-specific `.env.*` control API URLs, ports, and mock settings.
- Mock API: set `VITE_MOCK_DEV_SERVER=true` in `.env.development` to enable local mock responses.
