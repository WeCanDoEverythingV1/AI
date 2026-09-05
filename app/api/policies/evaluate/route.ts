import { NextResponse } from "next/server"

import { evaluate } from "@/app/api/policies/_engine"
import { activeRuleset } from "@/app/api/policies/_store"
import type { PolicyEvaluationInput } from "@/types/policy"

/**
 * TEMPORARY stub for `POST /api/policies/evaluate` — judge one hypothetical
 * expense against the active ruleset.
 */
export async function POST(request: Request) {
  let body: PolicyEvaluationInput
  try {
    body = (await request.json()) as PolicyEvaluationInput
  } catch {
    return NextResponse.json(
      { message: "JSON 형식의 본문이 필요합니다.", status: 400 },
      { status: 400 },
    )
  }

  const ruleset = activeRuleset()
  if (!ruleset) {
    return NextResponse.json(
      {
        message: "활성화된 규정이 없습니다. 규정집을 올리고 활성화해 주세요.",
        status: 409,
      },
      { status: 409 },
    )
  }

  const amount = Number(body.amount)
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json(
      {
        message: "Validation failed",
        status: 400,
        fieldErrors: { amount: "0보다 큰 금액이 필요합니다" },
      },
      { status: 400 },
    )
  }
  if (!body.category || !body.date) {
    return NextResponse.json(
      {
        message: "Validation failed",
        status: 400,
        fieldErrors: {
          ...(body.category ? {} : { category: "category is required" }),
          ...(body.date ? {} : { date: "date is required" }),
        },
      },
      { status: 400 },
    )
  }

  // Stand in for the LLM leg the real service falls back to.
  await new Promise((resolve) => setTimeout(resolve, 500))

  return NextResponse.json(evaluate({ ...body, amount }, ruleset))
}
