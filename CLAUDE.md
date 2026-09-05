# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

"바로" (Baro) — an AI-powered receipt approval and SaaS spend management app, built with Next.js App Router. All user-facing copy is Korean and amounts are KRW (`currency()` in `lib/mock-data.ts` formats `ko-KR`/KRW).

The frontend talks to a **deployed backend**, not mocks: `NEXT_PUBLIC_API_URL` (see `.env.example`; the deployed instance is `https://baro-2fl1.onrender.com`). Its OpenAPI document is the contract — read `$NEXT_PUBLIC_API_URL/v3/api-docs` before changing anything in `types/api.ts`. The backend runs on Render's free tier, so the first request after idle can take up to a minute — hence the per-operation timeouts in `lib/api/client.ts`.

The SaaS subscription inventory stays client-side (`companySubscriptions` in `lib/mock-data.ts`) because the backend has no subscription store — `/api/subscriptions/analyze` takes the list in the request body.

The backend has no endpoint to move a decided request back to `PENDING`, so approve/reject is one-way in the UI.

### Expense policy

Replaces hardcoded spend limits with rules extracted from each company's own 복무규정 PDF. The design splits **interpretation** (rare, at upload) from **judgment** (every expense), so the approver table never makes a per-row AI call and verdicts do not drift between renders. The endpoints are live on the same backend as everything else.

- `types/policy.ts` mirrors the backend's `PolicyRulesetDto` / `PolicyRuleDto` / `PolicyEvaluationInputDto`; `lib/api/policies.ts` calls them. Watch the naming — the wire shape is **not** what the field is called in the UI: `expenseCategory`, `limitAmount`, and a **flat** `clauseArticle`/`clauseText`/`clausePage` (no nested clause object). `evaluate` takes `attendeeCount` and an integer `hour`, not a `HH:mm` string. Almost every field except `expenseCategory`/`scope`/`severity`/`clauseText` can come back `null`.
- `components/policy-console.tsx` is the 규정 관리 screen (upload → human review → activate, plus a test console). Never let extracted rules go live without the review step — one misread limit would apply company-wide.
- Activation **archives** the previous version server-side; the console then deletes the leftovers so only the current version is listed. That cleanup is best-effort on purpose: the server refuses to delete a version an approval request still cites, and that refusal must not fail the activation.
- `confidence` is never rendered as a score, only as a "확인 필요" flag — see `ReviewFlag` in `components/policy-rule-editor.tsx` for why.
- **Not wired yet**: `deriveRisk` / `categoryLimits` in `lib/policy.ts` still drive the badges on the employee and approver screens. Switching them over needs the backend to evaluate at `POST /api/approval-requests` and persist the verdict (`complianceLevel`, `citedClauses`, `rulesetVersion`) on the record.
- **Extraction is still canned**: `POST /api/policies` returns the same two-rule Korean fixture whatever PDF you upload (verified against the deployed service). Everything else — persistence, review edits, activation, evaluation including the LLM fallback — is real.

The project was scaffolded/is maintained via v0.app (see `generator: 'v0.app'` in `app/layout.tsx` and the v0-sandbox entries in `.gitignore`).

## Commands

Package manager is pnpm (`pnpm-lock.yaml` is the authoritative lockfile; a `package-lock.json` also exists but pnpm is what the `package.json` `pnpm.overrides` field targets).

- `pnpm dev` — start the Next.js dev server
- `pnpm build` — production build
- `pnpm start` — run the production build
- `pnpm lint` — runs `eslint .`, but no ESLint config file exists in the repo root; expect this to need a config before it will run.

There is no test suite configured in this repo.

## Architecture

This is a single-page app with no routing — everything lives under `app/page.tsx` → `AppShell`, and view switching is done entirely through React state, not URL/route changes.

- `app/page.tsx` renders `AppShell` (`components/app-shell.tsx`), the root client component.
- `AppShell` holds two pieces of state: the signed-in `role` (`"employee" | "approver"`, from `lib/mock-data.ts`) and, for approvers, the active `ApproverView` (`"approvals" | "spend"`).
  - No `role` selected → renders `UserSelection` (role picker, no real auth).
  - `role === "employee"` → renders `EmployeeDashboard` (receipt upload → `POST /api/receipts/scan` → editable form → `POST /api/approval-requests`). `AppShell` passes the signed-in name down as `employeeName`, because the scan result has no employee field.
  - `role === "approver"` and view `"approvals"` → renders `ApproverDashboard` (fetches `GET /api/approval-requests`, buckets by `status`, approve/reject via `PATCH`). The three stat cards double as the PENDING/APPROVED/REJECTED filter.
  - `role === "approver"` and view `"spend"` → renders `SubscriptionAlert` (`POST /api/subscriptions/analyze`, then `POST /api/subscriptions/draft-email` per row).
  - `DashboardHeader` is shared chrome across both roles and drives approver view navigation via the `onNavigate` callback passed down from `AppShell`.

### API layer

- `types/api.ts` holds the wire DTOs and enums, mirroring the backend's OpenAPI document. Keep it a faithful copy of the contract — UI-facing labels and derived values belong in `lib/policy.ts`.
- `lib/api/client.ts` owns `API_BASE_URL`, the `apiFetch` wrapper (timeout, abort forwarding, `ApiError` normalization including the server's `fieldErrors` envelope) and `parseServerTimestamp`. **Always parse `createdAt` with `parseServerTimestamp`** — the backend emits `LocalDateTime` with no timezone, so plain `new Date()` reads it as browser-local and lands hours off.
- `lib/api/endpoints.ts` is the only place that names an endpoint path. Components import functions from here and never call `fetch` themselves. The receipt upload sends `FormData` with **no** `Content-Type` header so the browser sets the multipart boundary; the part must be named `file`.
- `lib/policy.ts` translates the wire enums to Korean (`categoryLabels`, `statusLabels`), coerces the scan's free-text `category` into the `ExpenseCategory` enum (`toExpenseCategory`), and holds the client-side spend policy (`categoryLimits`, `deriveRisk`).
- `lib/mock-data.ts` keeps what is genuinely client-owned: the `Role` type and labels, the `companySubscriptions` inventory, and the shared formatters (`currency`, `formatApiDate`, `initialsOf`).
- `components/ui/*` are shadcn/ui primitives (style `base-nova`, base color `neutral`) generated per `components.json`. Prefer using/extending these over hand-rolling new primitives; add new shadcn components via the `shadcn` CLI dependency rather than writing them by hand where possible.
- Path alias `@/*` maps to the repo root (`tsconfig.json`), matching the aliases declared in `components.json` (`@/components`, `@/lib`, `@/components/ui`, `@/hooks`).
- Styling is Tailwind v4 via `app/globals.css`, which imports `tailwindcss`, `tw-animate-css`, and `shadcn/tailwind.css`, and defines the full theme as CSS variables (colors in OKLCH) under `:root`/`.dark`, including non-standard semantic tokens `--success` and `--warning` alongside the usual shadcn tokens — use these (`bg-success`, `text-warning-foreground`, etc.) instead of introducing ad hoc colors.
- `next.config.mjs` sets `typescript.ignoreBuildErrors: true` and `images.unoptimized: true` — TypeScript errors will not fail `pnpm build`, so don't rely on the build to catch type errors.
