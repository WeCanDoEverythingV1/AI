import { NextResponse } from "next/server"

/**
 * Development stub for `POST /api/approval-request/:id/submit`.
 *
 * Takes the fields the employee verified/corrected and echoes back the record
 * with `status: "pending"`. See the sibling `route.ts` for why this exists.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ message: "JSON 형식의 본문이 필요합니다." }, { status: 400 })
  }

  const amount = Number(body.amount)
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json(
      { message: "`amount`는 0보다 큰 숫자여야 합니다." },
      { status: 422 },
    )
  }
  if (typeof body.merchant !== "string" || !body.merchant.trim()) {
    return NextResponse.json({ message: "`merchant`는 필수 항목입니다." }, { status: 422 })
  }

  await new Promise((resolve) => setTimeout(resolve, 700))

  return NextResponse.json({
    id,
    amount,
    merchant: body.merchant,
    employeeName: body.employeeName ?? "",
    purpose: body.purpose ?? "",
    status: "pending",
    createdAt: new Date().toISOString(),
    date: body.date,
    item: body.item,
  })
}
