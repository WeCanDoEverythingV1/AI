import { apiFetch, TIMEOUT } from "@/lib/api/client"
import type {
  PolicyEvaluationInput,
  PolicyEvaluationResult,
  PolicyRule,
  PolicyRuleset,
} from "@/types/policy"

/**
 * Expense-policy calls, served by the same backend as everything else in
 * `endpoints.ts`. See `types/policy.ts` for the wire contract.
 */

type Options = { signal?: AbortSignal }

export const MAX_POLICY_BYTES = 10 * 1024 * 1024

/** Client-side pre-check. Returns a Korean error message, or `null` when usable. */
export function validatePolicyFile(file: File): string | null {
  const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name)

  if (!isPdf) return "규정집은 PDF 파일만 올릴 수 있습니다. HWP는 PDF로 저장한 뒤 올려 주세요."
  if (file.size === 0) return "비어 있는 파일입니다."
  if (file.size > MAX_POLICY_BYTES) {
    return `파일 크기가 ${(file.size / 1024 / 1024).toFixed(1)}MB입니다 — 최대 10MB까지 올릴 수 있습니다.`
  }
  return null
}

/**
 * `POST /api/policies` — upload the 복무규정 PDF and get back a **draft** ruleset.
 * Nothing takes effect until a reviewer activates it.
 */
export function uploadPolicyDocument(
  file: File,
  { signal }: Options = {},
): Promise<PolicyRuleset> {
  const formData = new FormData()
  formData.append("file", file, file.name)

  return apiFetch<PolicyRuleset>("/api/policies", {
    method: "POST",
    formData,
    // Parsing a long PDF and extracting rules is the slowest call in the app.
    timeoutMs: TIMEOUT.scan,
    signal,
  })
}

/** `GET /api/policies` — every version, newest first. */
export function listPolicyRulesets({ signal }: Options = {}): Promise<PolicyRuleset[]> {
  return apiFetch<PolicyRuleset[]>("/api/policies", { signal })
}

/** `GET /api/policies/active` — the ruleset judgments run against, or `null`. */
export function getActivePolicy({ signal }: Options = {}): Promise<PolicyRuleset | null> {
  return apiFetch<PolicyRuleset | null>("/api/policies/active", { signal })
}

/** `PUT /api/policies/{id}/rules` — save the reviewer's corrections. */
export function savePolicyRules(
  id: string,
  rules: PolicyRule[],
  { signal }: Options = {},
): Promise<PolicyRuleset> {
  return apiFetch<PolicyRuleset>(`/api/policies/${encodeURIComponent(id)}/rules`, {
    method: "PUT",
    json: { rules },
    timeoutMs: TIMEOUT.write,
    signal,
  })
}

/**
 * `POST /api/policies/{id}/activate` — make this version the one in force.
 * The server archives whatever was active before; it does not delete it.
 */
export function activatePolicy(
  id: string,
  { signal }: Options = {},
): Promise<PolicyRuleset> {
  return apiFetch<PolicyRuleset>(`/api/policies/${encodeURIComponent(id)}/activate`, {
    method: "POST",
    timeoutMs: TIMEOUT.write,
    signal,
  })
}

/**
 * `DELETE /api/policies/{id}` — remove a version permanently. Responds 204.
 *
 * The server refuses versions an approval request still cites, so a failure here
 * is a legitimate answer, not necessarily a bug.
 */
export function deletePolicyRuleset(id: string, { signal }: Options = {}): Promise<void> {
  return apiFetch<void>(`/api/policies/${encodeURIComponent(id)}`, {
    method: "DELETE",
    timeoutMs: TIMEOUT.write,
    signal,
  })
}

/** `POST /api/policies/evaluate` — judge one hypothetical expense. */
export function evaluateExpense(
  input: PolicyEvaluationInput,
  { signal }: Options = {},
): Promise<PolicyEvaluationResult> {
  return apiFetch<PolicyEvaluationResult>("/api/policies/evaluate", {
    method: "POST",
    json: input,
    timeoutMs: TIMEOUT.ai,
    signal,
  })
}
