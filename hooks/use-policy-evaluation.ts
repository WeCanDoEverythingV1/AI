"use client"

import { useEffect, useRef, useState } from "react"

import { resolveVerdict, type Verdict } from "@/components/compliance"
import { ApiError } from "@/lib/api/client"
import { isAbort, messageFor } from "@/lib/api/endpoints"
import { evaluateExpense } from "@/lib/api/policies"
import type { PolicyEvaluationInput } from "@/types/policy"

/** Long enough that typing a five-digit amount is one request, not five. */
const DEBOUNCE_MS = 600

export type LivePolicyEvaluation = {
  verdict: Verdict | null
  loading: boolean
  /** The server has no active ruleset, so there is nothing to evaluate against. */
  unavailable: boolean
  error: string | null
}

/**
 * Re-judges an expense against the active ruleset as the user edits it.
 *
 * Every verdict comes from `POST /api/policies/evaluate` — the client still never
 * decides compliance itself, it just asks again when the inputs change. Passing
 * `null` (incomplete form) leaves the last verdict in place rather than blanking
 * the panel on every keystroke.
 */
export function usePolicyEvaluation(input: PolicyEvaluationInput | null): LivePolicyEvaluation {
  const [verdict, setVerdict] = useState<Verdict | null>(null)
  const [loading, setLoading] = useState(false)
  const [unavailable, setUnavailable] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Serializing gives a stable dependency without re-running on object identity.
  const key = input ? JSON.stringify(input) : null

  // A 409 means no ruleset is active; re-asking on every keystroke is pointless.
  const unavailableRef = useRef(false)

  useEffect(() => {
    if (!key || unavailableRef.current) return

    const payload = JSON.parse(key) as PolicyEvaluationInput
    const controller = new AbortController()

    const timer = setTimeout(() => {
      setLoading(true)
      setError(null)

      evaluateExpense(payload, { signal: controller.signal })
        .then((result) => {
          if (controller.signal.aborted) return
          setVerdict(
            resolveVerdict({
              complianceLevel: result.level,
              complianceSummary: result.summary,
              citedClauses: result.citedClauses,
              rulesetVersion: result.rulesetVersion,
            }),
          )
        })
        .catch((caught: unknown) => {
          if (controller.signal.aborted || isAbort(caught)) return
          if (caught instanceof ApiError && caught.status === 409) {
            unavailableRef.current = true
            setUnavailable(true)
            return
          }
          setError(messageFor(caught, "규정 판정을 가져오지 못했습니다."))
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false)
        })
    }, DEBOUNCE_MS)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [key])

  return { verdict, loading, unavailable, error }
}
