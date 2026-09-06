/**
 * Wire types for the Baro backend.
 *
 * Mirrors the deployed OpenAPI document at `${NEXT_PUBLIC_API_URL}/v3/api-docs`.
 * Keep this file in sync with that spec — it is the contract, not a convenience
 * shape. UI-facing types (Korean labels, derived risk levels) live in
 * `lib/policy.ts` so the wire shape stays untouched.
 */

// Type-only import; `types/policy.ts` imports ExpenseCategory back from here,
// which is fine because both sides are erased at compile time.
import type { CitedClause, ComplianceLevel, PolicyEvaluationResult } from "@/types/policy"

export type ExpenseCategory =
  | "MEALS"
  | "TRAVEL"
  | "LODGING"
  | "SOFTWARE"
  | "OFFICE_SUPPLIES"
  | "OTHER"

export type ApprovalStatus = "PENDING" | "APPROVED" | "REJECTED"

/**
 * Server-side risk verdict.
 *
 * Note the vocabulary differs from `ComplianceLevel` in `types/policy.ts`, which
 * uses `VIOLATION` where this uses `HIGH`. They are separate fields on the same
 * records, so don't assume one can be cast to the other.
 */
export interface RiskAnalysisDto {
  level: "COMPLIANT" | "WARNING" | "HIGH"
  label: string
}

/**
 * `POST /api/receipts/scan` — OCR + AI extraction of an uploaded receipt.
 * Takes `employeeName` as a required query parameter.
 */
export interface ReceiptScanResultDto {
  merchant: string
  /** `YYYY-MM-DD`. */
  date: string
  amount: number
  itemName: string
  purpose: string
  /** Free-text category from the AI; map with `toExpenseCategory` before submitting. */
  category: string
  possibleDuplicate: boolean
  duplicateNote: string
  risk?: RiskAnalysisDto | null
  /** Verdict against the active policy ruleset. Absent when no ruleset is active. */
  policyCheck?: PolicyEvaluationResult | null
}

/** Body of `POST /api/approval-requests`. Every field is required by the server. */
export interface ApprovalRequestCreateDto {
  employeeName: string
  merchant: string
  /** `YYYY-MM-DD`. */
  date: string
  amount: number
  itemName: string
  purpose: string
  expenseCategory: ExpenseCategory
}

/** Returned by every `/api/approval-requests` endpoint. */
export interface ApprovalRequestResponseDto {
  id: number
  employeeName: string
  merchant: string
  /** `YYYY-MM-DD`. */
  date: string
  amount: number
  itemName: string
  purpose: string
  status: ApprovalStatus
  /**
   * Server-local ISO timestamp with **no** timezone suffix
   * (e.g. `2026-09-05T05:37:42.767777832`). Parse it with `parseServerTimestamp`
   * — `new Date()` would read it as browser-local time and be hours off.
   */
  createdAt: string
  expenseCategory: ExpenseCategory

  /* The policy verdict, stamped at creation. See `types/policy.ts`. */
  risk?: RiskAnalysisDto | null
  complianceLevel?: ComplianceLevel | null
  complianceSummary?: string | null
  citedClauses?: CitedClause[] | null
  /** Which ruleset version decided it — the audit trail for a past decision. */
  rulesetVersion?: number | null
}

/**
 * One SaaS subscription in the company inventory.
 *
 * The backend has no subscription store — the client owns the inventory and
 * posts it to `/api/subscriptions/analyze`. `activeSeatsWithinLimit` is a
 * server-side validation flag and is absent from the spec's `required` list, so
 * it is optional here and never sent.
 */
export interface SubscriptionDto {
  id: string
  name: string
  category: string
  monthlyCost: number
  seats: number
  activeSeats: number
  lastUsed: string
  activeSeatsWithinLimit?: boolean
}

/** Body of `POST /api/subscriptions/analyze`. */
export interface SubscriptionAnalysisRequest {
  subscriptions: SubscriptionDto[]
}

/** One analysis result, joined back to its subscription by `id`. */
export interface SubscriptionAnalysisDto {
  id: string
  name: string
  idleSeats: number
  monthlyWaste: number
  /** `"high" | "medium" | "low"` in practice, but typed loosely per the spec. */
  severity: string
  recommendation: string
}

/** Body of `POST /api/subscriptions/draft-email`. */
export interface EmailDraftRequestDto {
  subscription: SubscriptionDto
  /** e.g. `"reclaim" | "downgrade" | "cancel"`. */
  action: string
  /** BCP-47-ish language tag, e.g. `"ko"` or `"en"`. */
  language: string
}

export interface EmailDraftDto {
  subject: string
  body: string
}

/** Error envelope the backend returns for 4xx/5xx. */
export interface ApiErrorBody {
  message?: string
  status?: number
  timestamp?: string
  /** Present on 400 validation failures: `{ merchant: "merchant is required" }`. */
  fieldErrors?: Record<string, string> | null
}
