# Incremental Implementation Plan

## Phase 1 · Prune & Stabilise
- Remove dead or duplicate assets (`components/Dashboard.tsx`, `lib/db-upstash.ts`, legacy test/cleanup routes) in small PRs. Validate via route smoke tests plus `npm run lint` and `npm run type-check`. Manually confirm admin and dashboard flows.
- Collapse ingestion to a single typed endpoint, unify error handling, and trim noisy logging. Add integration tests for valid/invalid payloads. Ship once linters, type checks, and new tests pass.

## Phase 2 · Observability & Safety
- Introduce `lib/logger.ts` (structured logging) and replace `console` usage across API/DB layers. Add unit coverage to ensure logger cannot throw in production.
- Protect admin/test surfaces with a lightweight guard (feature flag or shared token) while full auth is pending. Add integration tests for 401/403 paths. Merge after verifying guard behaviour locally and in CI.

## Phase 3 · Data Service Refactor
- Extract KV access into service modules in `lib/services/*`, updating callers to avoid direct KV mutations from UI components. Cover services with KV-mocked unit tests.
- Switch to incremental column/news updates instead of whole-array rewrites; seed the default dashboard via an explicit migration script and document the runbook. Regression tests for column add/remove/cleanup flows.

## Phase 4 · User Experience Enhancements
- Implement preference storage (e.g., `user_preferences:anonymous`) to back default/favourite dashboard selection pre-auth. Update `app/page.tsx` redirect logic and the dashboard picker UI. Add unit tests for the preference service plus UI integration checks.
- Improve dashboard picker UX and introduce placeholder indicators for future shared dashboards without changing API contracts. Perform manual QA on multi-dashboard navigation.

## Phase 5 · Scalability Preparation
- Document the storage abstraction decisions and outline the migration path to managed services (Postgres/Firestore) on GCP; create infrastructure backlog items. Instrument KV latency/payload metrics to guide timing.
- Prototype a background job interface for cleanup/sync tasks so later Cloud Run or cron jobs can reuse it. Add job-level tests and dry-run scripts.

_Authentication (Google/OAuth) and full GCP migration remain out of scope until the above groundwork is complete._
