# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

"바로" (Baro) — an AI-powered receipt approval and SaaS spend management demo, built with Next.js App Router. All user-facing copy and mock data are Korean and amounts are KRW (`currency()` in `lib/mock-data.ts` formats `ko-KR`/KRW). Mostly a UI prototype: there is no database, and the approver/spend screens are driven by static arrays in `lib/mock-data.ts`.

The one real data flow is the employee receipt upload: `components/employee-dashboard.tsx` POSTs the file to `/api/approval-request` and renders whatever comes back. That endpoint is expected to be served by the separate backend in `AI/` (its own git repo, currently just a README); until it exists, `app/api/approval-request/` holds a development stub implementing the same contract. Point `NEXT_PUBLIC_API_BASE_URL` at the real service to switch over (see `.env.example`).

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
  - `role === "employee"` → renders `EmployeeDashboard` (receipt upload → simulated AI extraction → editable form → submit).
  - `role === "approver"` and view `"approvals"` → renders `ApproverDashboard` (table of pending requests with AI risk badges, approve/reject).
  - `role === "approver"` and view `"spend"` → renders `SubscriptionAlert` (SaaS spend/waste insights).
  - `DashboardHeader` is shared chrome across both roles and drives approver view navigation via the `onNavigate` callback passed down from `AppShell`.
- `lib/receipt-api.ts` owns the receipt-analysis contract: the `ReceiptAnalysis` / `ApprovalSubmission` types, endpoint URLs, client-side file validation, `ReceiptApiError`, and the `analyzeReceipt` / `submitApprovalRequest` fetch calls. Components should never call `fetch` for receipts directly. The upload sends `FormData` with **no** `Content-Type` header so the browser sets the multipart boundary. Responses are run through a normalizer that coerces loose OCR output (string amounts, `2026/08/14` dates, a `{ data: … }` envelope, snake_case keys) into the typed shape, so treat `ReceiptAnalysis` as trustworthy downstream.
- `lib/mock-data.ts` is the single source of truth for domain types (`Role`, `RiskLevel`, `ApprovalRequest`, `WastedSubscription`, etc.) and mock datasets (`pendingRequests`, `wastedSubscriptions`), plus shared helpers (`currency`, `buildVendorEmail`). New mock data/types should go here rather than being inlined in components.
- `components/ui/*` are shadcn/ui primitives (style `base-nova`, base color `neutral`) generated per `components.json`. Prefer using/extending these over hand-rolling new primitives; add new shadcn components via the `shadcn` CLI dependency rather than writing them by hand where possible.
- Path alias `@/*` maps to the repo root (`tsconfig.json`), matching the aliases declared in `components.json` (`@/components`, `@/lib`, `@/components/ui`, `@/hooks`).
- Styling is Tailwind v4 via `app/globals.css`, which imports `tailwindcss`, `tw-animate-css`, and `shadcn/tailwind.css`, and defines the full theme as CSS variables (colors in OKLCH) under `:root`/`.dark`, including non-standard semantic tokens `--success` and `--warning` alongside the usual shadcn tokens — use these (`bg-success`, `text-warning-foreground`, etc.) instead of introducing ad hoc colors.
- `next.config.mjs` sets `typescript.ignoreBuildErrors: true` and `images.unoptimized: true` — TypeScript errors will not fail `pnpm build`, so don't rely on the build to catch type errors.
