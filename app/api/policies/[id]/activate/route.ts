import { NextResponse } from "next/server"

import { findRuleset, store } from "@/app/api/policies/_store"

/**
 * TEMPORARY stub for `POST /api/policies/{id}/activate` — make this version the
 * one in force. Exactly one ruleset is ACTIVE; the previous one is archived
 * rather than deleted so past verdicts keep their basis.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  const ruleset = findRuleset(id)
  if (!ruleset) {
    return NextResponse.json(
      { message: `규정 버전을 찾을 수 없습니다: ${id}`, status: 404 },
      { status: 404 },
    )
  }
  if (ruleset.rules.length === 0) {
    return NextResponse.json(
      { message: "규칙이 하나도 없는 규정은 활성화할 수 없습니다.", status: 409 },
      { status: 409 },
    )
  }

  await new Promise((resolve) => setTimeout(resolve, 400))

  for (const other of store.rulesets) {
    if (other.id !== ruleset.id && other.status === "ACTIVE") other.status = "ARCHIVED"
  }

  ruleset.status = "ACTIVE"
  ruleset.activatedAt = new Date().toISOString()

  return NextResponse.json(ruleset)
}
