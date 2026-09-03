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
      { message: "Expected a multipart/form-data body." },
      { status: 400 },
    )
  }

  const file = formData.get("file")
  if (!(file instanceof File)) {
    return NextResponse.json({ message: "Missing `file` field." }, { status: 400 })
  }
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ message: "That file is too large." }, { status: 413 })
  }

  // Stand in for OCR latency so the loading state is actually exercised.
  await new Promise((resolve) => setTimeout(resolve, 1800))

  const employeeName =
    (formData.get("employeeName") as string | null)?.trim() || "Sarah Chen"

  return NextResponse.json({
    id: `REQ-${Math.floor(2100 + Math.random() * 800)}`,
    amount: 48.5,
    currency: "USD",
    merchant: "Blue Bottle Coffee",
    employeeName,
    purpose: "Client onboarding kickoff with the Acme account team.",
    status: "draft",
    createdAt: new Date().toISOString(),
    date: "2026-08-14",
    item: "Team offsite coffee (6 drinks)",
    category: "Meals",
    confidence: 0.94,
    compliance: {
      level: "compliant",
      title: "Compliant: Within meal allowance",
      detail:
        "$48.50 is under the $75/person meal cap and the category matches the client-onboarding budget.",
    },
  })
}
