import { NextResponse } from "next/server"

import { MAX_FILE_BYTES } from "@/lib/receipt-api"

/**
 * Development stub for `POST /api/approval-request`.
 *
 * It implements the same contract as the real analysis service so the employee
 * flow is runnable before the backend in `AI/` exists. Delete this file — or
 * just set `NEXT_PUBLIC_API_BASE_URL` — once the real endpoint is up.
 */
export async function POST(request: Request) {
  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json(
      { message: "multipart/form-data 형식의 본문이 필요합니다." },
      { status: 400 },
    )
  }

  const file = formData.get("file")
  if (!(file instanceof File)) {
    return NextResponse.json({ message: "`file` 항목이 없습니다." }, { status: 400 })
  }
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ message: "파일 크기가 너무 큽니다." }, { status: 413 })
  }

  // Stand in for OCR latency so the loading state is actually exercised.
  await new Promise((resolve) => setTimeout(resolve, 1800))

  const employeeName =
    (formData.get("employeeName") as string | null)?.trim() || "김대리"

  return NextResponse.json({
    id: `REQ-${Math.floor(2100 + Math.random() * 800)}`,
    amount: 48500,
    currency: "KRW",
    merchant: "블루보틀 삼청",
    employeeName,
    purpose: "에이콘 계정팀과 진행한 고객 온보딩 킥오프 미팅.",
    status: "draft",
    createdAt: new Date().toISOString(),
    date: "2026-08-14",
    item: "팀 오프사이트 커피 (6잔)",
    category: "식비",
    confidence: 0.94,
    compliance: {
      level: "compliant",
      title: "규정 준수: 식대 한도 이내",
      detail:
        "48,500원은 1인 식대 한도 75,000원 이내이며, 분류도 고객 온보딩 예산과 일치합니다.",
    },
  })
}
