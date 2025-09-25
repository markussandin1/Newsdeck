# Repository Guidelines

## Project Structure & Module Organization
- `app/` holds the Next.js App Router, including API routes under `app/api/` and admin views in `app/admin/`.
- `components/` contains reusable React components; keep feature-specific UI close to its owning route.
- `lib/` centralizes data access (`db.ts`, `db-persistent.ts`) and shared types; extend these before adding new persistence layers.
- `public/` serves static assets, while `testdata.json` offers sample payloads for local experiments.
- `.github/` stores CI workflows and issue templates; align new automation there.

## Build, Test, and Development Commands
- `npm run dev` launches the local dev server with hot reload at `http://localhost:3000`.
- `npm run build` compiles the production bundle; run before shipping complex changes.
- `npm run start` serves the production build locally for sanity checks.
- `npm run lint` runs ESLint via Next.js; pass `-- --fix` to auto-resolve style issues.
- `npm run type-check` validates the codebase with the strict TypeScript configuration.

## Coding Style & Naming Conventions
- Stick to TypeScript, 2-space indentation, and trailing commas where ESLint expects them.
- Name React components with PascalCase and hook/util functions with camelCase.
- Co-locate component styles using Tailwind utility classes; prefer composable class lists to ad-hoc CSS.
- Import shared utilities via the `@/` alias instead of relative `../../` chains.

## Testing Guidelines
- There is no default test runner yet; safeguard changes with `npm run lint` and `npm run type-check` at minimum.
- When adding automated tests, colocate specs (e.g., `Component.test.tsx`) next to the feature and document any new script in `package.json`.
- Use `testdata.json` or dedicated fixtures to simulate incoming payloads for API columns.

## Commit & Pull Request Guidelines
- Recent commits favour imperative subjects with optional Conventional Commit prefixes (`feat:`, `debug(scope):`); mirror that style.
- Keep commits focused and include context in the body if the headline exceeds ~60 characters.
- PRs should describe the user-facing change, list validation steps (lint/type-check/build), and attach screenshots or GIFs for UI tweaks.
- Link issues or deployment notes when relevant so the GitHub Actions workflows can reference them.

## Configuration & Secrets
- Create `.env.local` for local KV credentials (`KV_REST_API_URL`, `KV_REST_API_TOKEN`).
- Never commit secrets; add example keys to documentation or `.env.example` if new variables are introduced.
