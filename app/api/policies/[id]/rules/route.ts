import { NextResponse } from "next/server"

import { findRuleset } from "@/app/api/policies/_store"
import type { PolicyRulesUpdateDto } from "@/types/policy"

/**
 * TEMPORARY stub for `PUT /api/policies/{id}/rules` — persist the reviewer's
 * corrections to an extracted ruleset.
 */
export async function PUT(
  request: Request,
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
  if (ruleset.status === "ARCHIVED") {
    return NextResponse.json(
      { message: "보관된 규정은 수정할 수 없습니다.", status: 409 },
      { status: 409 },
    )
  }

  let body: PolicyRulesUpdateDto
  try {
    body = (await request.json()) as PolicyRulesUpdateDto
  } catch {
    return NextResponse.json(
      { message: "JSON 형식의 본문이 필요합니다.", status: 400 },
      { status: 400 },
    )
  }

  if (!Array.isArray(body.rules)) {
    return NextResponse.json(
      {
        message: "Validation failed",
        status: 400,
        fieldErrors: { rules: "rules must be an array" },
      },
      { status: 400 },
    )
  }

  await new Promise((resolve) => setTimeout(resolve, 400))

  ruleset.rules = body.rules
  return NextResponse.json(ruleset)
}
