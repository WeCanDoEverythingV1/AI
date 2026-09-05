import { NextResponse } from "next/server"

import { activeRuleset } from "@/app/api/policies/_store"

/**
 * TEMPORARY stub for `GET /api/policies/active` — the ruleset judgments run
 * against, or `null` when a company has not activated one yet.
 */
export async function GET() {
  return NextResponse.json(activeRuleset())
}
