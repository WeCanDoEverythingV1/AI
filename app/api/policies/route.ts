import { NextResponse } from "next/server"

import { extractRuleset, store } from "@/app/api/policies/_store"
import { MAX_POLICY_BYTES } from "@/lib/api/policies"

/**
 * TEMPORARY stub for `GET /api/policies` and `POST /api/policies`.
 * See `app/api/policies/_store.ts` for why this exists and when to delete it.
 */

/** Every version, newest first. */
export async function GET() {
  return NextResponse.json([...store.rulesets].sort((a, b) => b.version - a.version))
}

/** Upload the 복무규정 PDF; returns a DRAFT ruleset awaiting human review. */
export async function POST(request: Request) {
  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json(
      { message: "multipart/form-data 형식의 본문이 필요합니다.", status: 400 },
      { status: 400 },
    )
  }

  const file = formData.get("file")
  if (!(file instanceof File)) {
    return NextResponse.json(
      { message: "`file` 항목이 없습니다.", status: 400 },
      { status: 400 },
    )
  }
  if (file.type !== "application/pdf" && !/\.pdf$/i.test(file.name)) {
    return NextResponse.json(
      { message: "규정집은 PDF 파일만 올릴 수 있습니다.", status: 415 },
      { status: 415 },
    )
  }
  if (file.size > MAX_POLICY_BYTES) {
    return NextResponse.json(
      { message: "파일 크기가 너무 큽니다.", status: 413 },
      { status: 413 },
    )
  }

  // Stand in for PDF parsing plus the extraction pass.
  await new Promise((resolve) => setTimeout(resolve, 2200))

  const draft = extractRuleset(file.name, store.nextVersion)
  store.nextVersion += 1
  store.rulesets.push(draft)

  return NextResponse.json(draft)
}
