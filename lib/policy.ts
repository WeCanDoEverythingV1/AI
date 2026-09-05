import type { ApprovalStatus, ExpenseCategory } from "@/types/api"

/* ------------------------------------------------------------------ *
 * Labels — wire enums to the Korean strings the UI renders
 * ------------------------------------------------------------------ */

export const categoryLabels: Record<ExpenseCategory, string> = {
  MEALS: "식비",
  TRAVEL: "출장",
  LODGING: "숙박",
  SOFTWARE: "소프트웨어",
  OFFICE_SUPPLIES: "사무용품",
  OTHER: "기타",
}

export const expenseCategories = Object.keys(categoryLabels) as ExpenseCategory[]

export const statusLabels: Record<ApprovalStatus, string> = {
  PENDING: "결재 대기",
  APPROVED: "승인 완료",
  REJECTED: "반려됨",
}

/**
 * The receipt scan returns `category` as free text from the AI, but
 * `POST /api/approval-requests` demands the enum. Accept the enum itself, the
 * Korean label, or a loose English word; fall back to `OTHER`.
 */
export function toExpenseCategory(raw: string | undefined | null): ExpenseCategory {
  const value = (raw ?? "").trim()
  if (!value) return "OTHER"

  const upper = value.toUpperCase().replace(/[\s-]+/g, "_")
  if ((expenseCategories as string[]).includes(upper)) return upper as ExpenseCategory

  const byLabel = expenseCategories.find((c) => categoryLabels[c] === value)
  if (byLabel) return byLabel

  const lower = value.toLowerCase()
  const aliases: Record<string, ExpenseCategory> = {
    meal: "MEALS",
    meals: "MEALS",
    food: "MEALS",
    dining: "MEALS",
    restaurant: "MEALS",
    travel: "TRAVEL",
    transport: "TRAVEL",
    transportation: "TRAVEL",
    flight: "TRAVEL",
    taxi: "TRAVEL",
    lodging: "LODGING",
    hotel: "LODGING",
    accommodation: "LODGING",
    software: "SOFTWARE",
    saas: "SOFTWARE",
    subscription: "SOFTWARE",
    office: "OFFICE_SUPPLIES",
    supplies: "OFFICE_SUPPLIES",
    stationery: "OFFICE_SUPPLIES",
    equipment: "OFFICE_SUPPLIES",
  }
  return aliases[lower] ?? "OTHER"
}

/* ------------------------------------------------------------------ *
 * Client-side policy check
 * ------------------------------------------------------------------ */

export type RiskLevel = "compliant" | "warning" | "high"

export type RiskAnalysis = {
  level: RiskLevel
  label: string
}

/**
 * Per-category spend caps, in KRW.
 *
 * The backend returns no risk field on an approval request — only the receipt
 * scan flags duplicates. So the approver's risk column is derived here from the
 * two facts the API does give us (category + amount). Change these numbers to
 * match the real expense policy; nothing else depends on them.
 */
export const categoryLimits: Record<ExpenseCategory, number> = {
  MEALS: 75_000,
  TRAVEL: 1_000_000,
  LODGING: 300_000,
  SOFTWARE: 200_000,
  OFFICE_SUPPLIES: 200_000,
  OTHER: 300_000,
}

/** Flag at 80% of the cap so an approver sees a request creeping toward the limit. */
const WARN_RATIO = 0.8

export function deriveRisk(amount: number, category: ExpenseCategory): RiskAnalysis {
  const limit = categoryLimits[category]
  const label = categoryLabels[category]

  if (amount > limit) return { level: "high", label: `위험: ${label} 한도 초과` }
  if (amount >= limit * WARN_RATIO) return { level: "warning", label: "주의: 한도 임박" }
  return { level: "compliant", label: "규정 준수" }
}

/* ------------------------------------------------------------------ *
 * Subscription analysis
 * ------------------------------------------------------------------ */

export type Severity = "high" | "medium" | "low"

/** `SubscriptionAnalysisDto.severity` is an untyped string; pin it to a known level. */
export function toSeverity(raw: string | undefined | null): Severity {
  const value = (raw ?? "").trim().toLowerCase()
  return value === "high" || value === "medium" || value === "low" ? value : "medium"
}

export const severityLabels: Record<Severity, string> = {
  high: "높음",
  medium: "보통",
  low: "낮음",
}
