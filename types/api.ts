/**
 * Wire types for the Baro backend.
 *
 * Mirrors the deployed OpenAPI document at `${NEXT_PUBLIC_API_URL}/v3/api-docs`.
 * Keep this file in sync with that spec — it is the contract, not a convenience
 * shape. UI-facing types (Korean labels, derived risk levels) live in
 * `lib/policy.ts` so the wire shape stays untouched.
 */

export type ExpenseCategory =
  | "MEALS"
  | "TRAVEL"
  | "LODGING"
  | "SOFTWARE"
  | "OFFICE_SUPPLIES"
  | "OTHER"

export type ApprovalStatus = "PENDING" | "APPROVED" | "REJECTED"

/** `POST /api/receipts/scan` — OCR + AI extraction of an uploaded receipt. */
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
