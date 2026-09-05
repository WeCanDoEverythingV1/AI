import { NextResponse } from "next/server"

import { findRuleset, store } from "@/app/api/policies/_store"

/**
 * TEMPORARY stub for `DELETE /api/policies/{id}`.
 *
 * Deleting the ACTIVE version is allowed — the console confirms that case — but
 * it leaves nothing in force, so `evaluate` will 409 until another version is
 * activated. A real service that has already stamped verdicts onto approval
 * records should soft-delete instead, or refuse while records still cite it.
 */
export async function DELETE(
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

  await new Promise((resolve) => setTimeout(resolve, 300))

  store.rulesets = store.rulesets.filter((r) => r.id !== id)

  return new NextResponse(null, { status: 204 })
}
