/**
 * Wire types for the expense-policy feature.
 *
 * **These endpoints are not on the deployed backend yet.** They are served by
 * the temporary stub in `app/api/policies/*` until the real service implements
 * them; point `NEXT_PUBLIC_POLICY_API_URL` at it to switch over.
 *
 * The design deliberately splits interpretation from judgment:
 *   1. a company uploads its 복무규정 PDF once → the AI extracts a structured
 *      `PolicyRuleset`, which a human reviews and activates;
 *   2. every expense is then judged against that stored ruleset, so the
 *      approver table needs no per-row AI call and verdicts never drift.
 */

import type { ExpenseCategory } from "@/types/api"

/** How a monetary limit is counted. */
export type RuleScope = "PER_PERSON" | "PER_RECEIPT" | "PER_MONTH" | "PER_TRIP"

export type PolicyStatus = "DRAFT" | "ACTIVE" | "ARCHIVED"

export type ComplianceLevel = "COMPLIANT" | "WARNING" | "VIOLATION"

/** What breaking a rule amounts to. A rule is never itself "compliant". */
export type RuleSeverity = Exclude<ComplianceLevel, "COMPLIANT">

/**
 * The passage a rule was extracted from. Every rule carries one so a verdict can
 * quote its basis instead of showing a bare number.
 */
export interface PolicySourceClause {
  /** e.g. `제12조 2항` */
  article: string
  /** Verbatim text from the PDF. */
  text: string
  page?: number
}

export interface PolicyRuleConditions {
  /** `false` → spend on Sat/Sun is flagged. */
  weekendAllowed?: boolean
  /** Spend logged after this hour (0–23) is flagged. */
  latestHour?: number | null
  minAttendees?: number | null
  maxAttendees?: number | null
}

export interface PolicyRule {
  id: string
  category: ExpenseCategory
  scope: RuleScope
  /** KRW cap; `null` for rules that only prohibit or require evidence. */
  limit: number | null
  conditions: PolicyRuleConditions
  /** Documents the claim must attach, e.g. `참석자 명단`. */
  requiredEvidence: string[]
  /** Keywords that are never reimbursable, e.g. `유흥업소`. */
  prohibitions: string[]
  severity: RuleSeverity
  /** Plain-language restatement shown to the reviewer. */
  note: string
  sourceClause: PolicySourceClause
  /** Extraction confidence 0–1. Below 0.8 the console asks for a human check. */
  confidence: number
}

export interface PolicyRuleset {
  id: string
  version: number
  status: PolicyStatus
  sourceFileName: string
  pageCount?: number
  createdAt: string
  activatedAt?: string | null
  rules: PolicyRule[]
  /**
   * Clauses the extractor read but could not turn into a rule (references to
   * appendices, discretionary wording). Surfaced so nobody assumes full coverage.
   */
  unmappedClauses: string[]
}

/** Body of `POST /api/policies/evaluate`. */
export interface PolicyEvaluationInput {
  category: ExpenseCategory
  amount: number
  /** `YYYY-MM-DD`. */
  date: string
  /** `HH:mm`, when known — receipts often carry a time the approval record does not. */
  time?: string
  merchant?: string
  itemName?: string
  purpose?: string
  attendees?: number
}

export interface PolicyEvaluationResult {
  level: ComplianceLevel
  /** One sentence an approver can act on. */
  summary: string
  citedClauses: PolicySourceClause[]
  matchedRuleIds: string[]
  rulesetVersion: number
  /**
   * `true` when a stored rule decided it outright; `false` when the case was
   * ambiguous and an LLM had to judge it. Useful for cost and audit reporting.
   */
  deterministic: boolean
}

/** Body of `PUT /api/policies/{id}/rules` — the reviewer's corrections. */
export interface PolicyRulesUpdateDto {
  rules: PolicyRule[]
}
