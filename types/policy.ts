/**
 * Wire types for the expense-policy endpoints.
 *
 * Mirrors the deployed OpenAPI document at `${NEXT_PUBLIC_API_URL}/v3/api-docs`
 * (`PolicyRulesetDto`, `PolicyRuleDto`, `PolicyEvaluationInputDto`, …). Keep this
 * a faithful copy of that contract — Korean labels and derived values belong in
 * `lib/policy.ts`.
 *
 * The design splits interpretation from judgment: a company uploads its 복무규정
 * PDF once and the server extracts a structured ruleset that a human reviews and
 * activates; every expense is then judged against that stored ruleset, so no
 * screen makes a per-row AI call and verdicts do not drift between renders.
 */

import type { ExpenseCategory } from "@/types/api"

/** How a monetary limit is counted. */
export type RuleScope = "PER_PERSON" | "PER_RECEIPT" | "PER_MONTH" | "PER_TRIP"

/**
 * `ARCHIVED` is what activation does to the previously active version — the
 * server never deletes it, so a past decision keeps the clauses it cited.
 */
export type PolicyStatus = "DRAFT" | "ACTIVE" | "ARCHIVED"

export type ComplianceLevel = "COMPLIANT" | "WARNING" | "VIOLATION"

/** What breaking a rule amounts to. A rule is never itself "compliant". */
export type RuleSeverity = Exclude<ComplianceLevel, "COMPLIANT">

export interface RuleConditions {
  /** `false` → spend on Sat/Sun is flagged. */
  weekendAllowed?: boolean | null
  /** Spend logged at or after this hour (0–23) is flagged. */
  latestHour?: number | null
  minAttendees?: number | null
}

/**
 * One extracted rule.
 *
 * The clause it came from is carried flat (`clauseArticle` / `clauseText` /
 * `clausePage`) so a verdict can quote its basis instead of showing a bare
 * number. Only `expenseCategory`, `scope`, `severity` and `clauseText` are
 * guaranteed by the server; everything else can come back `null`.
 */
export interface PolicyRule {
  id: string
  expenseCategory: ExpenseCategory
  scope: RuleScope
  /** KRW cap; `null` for rules that only prohibit or require evidence. */
  limitAmount?: number | null
  conditions?: RuleConditions | null
  /** Documents the claim must attach, e.g. `참석자 명단`. */
  requiredEvidence?: string[] | null
  /** Keywords that are never reimbursable, e.g. `유흥업소`. */
  prohibitions?: string[] | null
  severity: RuleSeverity
  /** Plain-language restatement shown to the reviewer. Often `null`. */
  note?: string | null
  /** e.g. `제12조 1항` */
  clauseArticle?: string | null
  /** Verbatim text from the PDF. */
  clauseText: string
  clausePage?: number | null
  /**
   * The model's own extraction confidence, 0–1. Below 0.8 the console flags the
   * rule for a human check. Never rendered as a score — self-reported confidence
   * is poorly calibrated, and a displayed percentage invites reviewers to skip
   * the high ones. Treat it as a triage hint, not a measurement.
   */
  confidence?: number | null
}

export interface PolicyRuleset {
  id: string
  companyId?: number
  version: number
  status: PolicyStatus
  sourceFileName?: string | null
  /** SHA-256 of the upload; the server skips re-extraction on a repeat. */
  sourceFileHash?: string | null
  pageCount?: number | null
  createdAt: string
  activatedAt?: string | null
  rules: PolicyRule[]
  /**
   * Clauses the extractor read but could not turn into a rule (references to
   * appendices, discretionary wording). Surfaced so nobody assumes full coverage.
   */
  unmappedClauses?: string[] | null
}

/** Body of `POST /api/policies/evaluate`. */
export interface PolicyEvaluationInput {
  category: ExpenseCategory
  amount: number
  /** `YYYY-MM-DD`. */
  date: string
  /** Hour of day 0–23, when known — receipts carry a time the approval record does not. */
  hour?: number
  merchant?: string
  itemName?: string
  purpose?: string
  attendeeCount?: number
}

/** The clause a verdict cites. */
export interface CitedClause {
  article?: string | null
  text?: string | null
  page?: number | null
}

export interface PolicyEvaluationResult {
  level: ComplianceLevel
  /** One sentence an approver can act on. */
  summary: string
  citedClauses?: CitedClause[] | null
  matchedRuleIds?: string[] | null
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
