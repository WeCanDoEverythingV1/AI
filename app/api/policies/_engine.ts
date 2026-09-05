import type {
  PolicyEvaluationInput,
  PolicyEvaluationResult,
  PolicyRule,
  PolicyRuleset,
  PolicySourceClause,
} from "@/types/policy"

/**
 * TEMPORARY deterministic evaluator for the policy stub.
 *
 * This is the half of the design that must NOT be an LLM call: caps, prohibited
 * keywords and time/weekend conditions are decidable in code, so they run here —
 * fast, free and identical on every render. Only what this cannot settle (no rule
 * matched, or wording that needs semantic judgment) should fall through to a
 * model, with just the relevant clauses attached.
 *
 * The real backend should reimplement this logic; it is the reference behaviour.
 */
export function evaluate(
  input: PolicyEvaluationInput,
  ruleset: PolicyRuleset,
): PolicyEvaluationResult {
  const findings: { severity: PolicyRule["severity"]; summary: string; rule: PolicyRule }[] =
    []

  const haystack = [input.merchant, input.itemName, input.purpose]
    .filter(Boolean)
    .join(" ")

  for (const rule of ruleset.rules) {
    // A prohibition rule applies regardless of the claimed category.
    const prohibited = rule.prohibitions.find((word) => haystack.includes(word))
    if (prohibited) {
      findings.push({
        severity: rule.severity,
        summary: `‘${prohibited}’ 관련 지출은 정산 대상이 아닙니다`,
        rule,
      })
      continue
    }

    if (rule.category !== input.category) continue

    // Amount caps. PER_PERSON divides by the attendee count when one is given.
    if (rule.limit !== null) {
      const perUnit =
        rule.scope === "PER_PERSON" && input.attendees && input.attendees > 0
          ? input.amount / input.attendees
          : input.amount

      if (perUnit > rule.limit) {
        findings.push({
          severity: rule.severity,
          summary: `${scopeLabel(rule.scope)} 한도 ${won(rule.limit)}을 ${won(
            Math.round(perUnit - rule.limit),
          )} 초과했습니다`,
          rule,
        })
        continue
      }

      if (perUnit >= rule.limit * 0.8) {
        findings.push({
          severity: "WARNING",
          summary: `${scopeLabel(rule.scope)} 한도 ${won(rule.limit)}의 80%를 넘었습니다`,
          rule,
        })
        continue
      }
    }

    // Time condition — only checkable when the caller supplied a time.
    if (rule.conditions.latestHour != null && input.time) {
      const hour = Number.parseInt(input.time.slice(0, 2), 10)
      if (Number.isFinite(hour) && hour >= rule.conditions.latestHour) {
        findings.push({
          severity: rule.severity,
          summary: `${rule.conditions.latestHour}시 이후 지출이라 ${
            rule.requiredEvidence[0] ?? "추가 승인"
          }이 필요합니다`,
          rule,
        })
        continue
      }
    }

    if (rule.conditions.weekendAllowed === false && isWeekend(input.date)) {
      findings.push({
        severity: rule.severity,
        summary: "주말 지출은 사전 승인이 필요합니다",
        rule,
      })
      continue
    }

    if (rule.conditions.minAttendees != null && (input.attendees ?? 0) < rule.conditions.minAttendees) {
      findings.push({
        severity: "WARNING",
        summary: `최소 참석 인원 ${rule.conditions.minAttendees}명 조건을 확인해 주세요`,
        rule,
      })
    }
  }

  const matched = ruleset.rules.filter((r) => r.category === input.category)

  // Nothing decidable applied — this is exactly the case the real service should
  // hand to an LLM along with the matching clauses, rather than passing silently.
  if (findings.length === 0 && matched.length === 0) {
    return {
      level: "WARNING",
      summary: "이 분류에 해당하는 규정 조항을 찾지 못했습니다. 결재자 확인이 필요합니다.",
      citedClauses: [],
      matchedRuleIds: [],
      rulesetVersion: ruleset.version,
      deterministic: false,
    }
  }

  if (findings.length === 0) {
    const cited = matched.filter((r) => r.limit !== null).slice(0, 2)
    return {
      level: "COMPLIANT",
      summary: `규정 준수 — ${matched.length}개 조항을 모두 충족합니다`,
      citedClauses: cited.map((r) => r.sourceClause),
      matchedRuleIds: cited.map((r) => r.id),
      rulesetVersion: ruleset.version,
      deterministic: true,
    }
  }

  // Worst finding wins.
  const violation = findings.find((f) => f.severity === "VIOLATION")
  const decisive = violation ?? findings[0]

  return {
    level: violation ? "VIOLATION" : "WARNING",
    summary: `${decisive.rule.sourceClause.article} — ${decisive.summary}`,
    citedClauses: dedupeClauses(findings.map((f) => f.rule.sourceClause)),
    matchedRuleIds: findings.map((f) => f.rule.id),
    rulesetVersion: ruleset.version,
    deterministic: true,
  }
}

const scopeLabels: Record<PolicyRule["scope"], string> = {
  PER_PERSON: "1인",
  PER_RECEIPT: "건당",
  PER_MONTH: "월",
  PER_TRIP: "출장당",
}

const scopeLabel = (scope: PolicyRule["scope"]) => scopeLabels[scope]

const won = (value: number) =>
  value.toLocaleString("ko-KR", {
    style: "currency",
    currency: "KRW",
    maximumFractionDigits: 0,
  })

function isWeekend(date: string) {
  const parsed = new Date(`${date}T00:00:00`)
  const day = parsed.getDay()
  return day === 0 || day === 6
}

function dedupeClauses(clauses: PolicySourceClause[]) {
  const seen = new Set<string>()
  return clauses.filter((c) => {
    if (seen.has(c.article)) return false
    seen.add(c.article)
    return true
  })
}
