import type { RiskLevel } from "@/lib/mock-data"

/* ------------------------------------------------------------------ *
 * 1. Response types
 * ------------------------------------------------------------------ */

/** Lifecycle of an approval request once the receipt has been analyzed. */
export type ReceiptStatus = "draft" | "pending" | "approved" | "rejected"

/** AI policy check the backend runs alongside OCR extraction. */
export type ComplianceCheck = {
  level: RiskLevel
  title: string
  detail: string
}

/**
 * What `POST /api/approval-request` returns.
 *
 * The first block is guaranteed by the backend contract. The second block is
 * best-effort OCR output — a blurry receipt may not yield a date or line item,
 * so every screen must render fine when those are missing.
 */
export type ReceiptAnalysis = {
  id: string
  amount: number
  merchant: string
  employeeName: string
  purpose: string
  status: ReceiptStatus
  /** ISO-8601 timestamp of when the analysis record was created. */
  createdAt: string

  /** Transaction date printed on the receipt, `YYYY-MM-DD`. */
  date?: string
  /** Line item / description. */
  item?: string
  /** Spend category the AI assigned (식비, 출장, …). */
  category?: string
  /** ISO-4217 code; treated as KRW when the backend omits it. */
  currency?: string
  /** OCR confidence, 0–1. Below 0.8 the UI nudges the user to double-check. */
  confidence?: number
  compliance?: ComplianceCheck
}

/** Body of `POST /api/approval-request/:id/submit` — the user-corrected fields. */
export type ApprovalSubmission = {
  merchant: string
  date: string
  amount: number
  item: string
  purpose: string
  employeeName: string
}

/* ------------------------------------------------------------------ *
 * Config
 * ------------------------------------------------------------------ */

/**
 * An empty base URL means same-origin, which hits the stub route handlers in
 * `app/api/approval-request/*`. Point `NEXT_PUBLIC_API_BASE_URL` at the real service
 * (e.g. http://localhost:8000) to talk to the actual backend instead.
 */
const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").replace(/\/+$/, "")

export const analyzeEndpoint = () => `${API_BASE_URL}/api/approval-request`
export const submitEndpoint = (id: string) =>
  `${API_BASE_URL}/api/approval-request/${encodeURIComponent(id)}/submit`

/** OCR plus LLM analysis is slow; give it a generous ceiling before bailing. */
const ANALYZE_TIMEOUT_MS = 45_000
const SUBMIT_TIMEOUT_MS = 15_000

/* ------------------------------------------------------------------ *
 * 2. File validation (client side, mirrors the server limits)
 * ------------------------------------------------------------------ */

export const MAX_FILE_BYTES = 10 * 1024 * 1024

const ACCEPTED_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/heic",
  "image/heif",
  "application/pdf",
]

/** Returns a user-facing error message, or `null` when the file is usable. */
export function validateReceiptFile(file: File): string | null {
  // Drag and drop bypasses the file input `accept` filter, so re-check here.
  const typeOk =
    ACCEPTED_TYPES.includes(file.type) ||
    (file.type === "" && /\.(png|jpe?g|webp|heic|heif|pdf)$/i.test(file.name))

  if (!typeOk) return "지원하지 않는 파일 형식입니다 — PNG, JPG, WEBP 또는 PDF 파일을 올려 주세요."
  if (file.size === 0) return "비어 있는 파일입니다."
  if (file.size > MAX_FILE_BYTES) {
    return `파일 크기가 ${(file.size / 1024 / 1024).toFixed(1)}MB입니다 — 최대 10MB까지 올릴 수 있습니다.`
  }
  return null
}

/* ------------------------------------------------------------------ *
 * Errors
 * ------------------------------------------------------------------ */

export class ReceiptApiError extends Error {
  readonly status?: number
  readonly code?: string

  constructor(message: string, options?: { status?: number; code?: string }) {
    super(message)
    this.name = "ReceiptApiError"
    this.status = options?.status
    this.code = options?.code
  }
}

/* ------------------------------------------------------------------ *
 * 3–4. Upload: FormData + POST (no manual Content-Type)
 * ------------------------------------------------------------------ */

export async function analyzeReceipt(
  file: File,
  options: { employeeName?: string; signal?: AbortSignal } = {},
): Promise<ReceiptAnalysis> {
  const formData = new FormData()
  formData.append("file", file, file.name)
  if (options.employeeName) formData.append("employeeName", options.employeeName)

  const response = await request(analyzeEndpoint(), {
    method: "POST",
    // Deliberately no Content-Type header: the browser has to set
    // multipart/form-data and generate the boundary itself.
    body: formData,
    signal: options.signal,
    timeoutMs: ANALYZE_TIMEOUT_MS,
  })

  return normalizeAnalysis(await readJson(response))
}

/* ------------------------------------------------------------------ *
 * 6. Final submit of the user-verified fields
 * ------------------------------------------------------------------ */

export async function submitApprovalRequest(
  id: string,
  submission: ApprovalSubmission,
  options: { signal?: AbortSignal } = {},
): Promise<ReceiptAnalysis> {
  const response = await request(submitEndpoint(id), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(submission),
    signal: options.signal,
    timeoutMs: SUBMIT_TIMEOUT_MS,
  })

  return normalizeAnalysis(await readJson(response))
}

/* ------------------------------------------------------------------ *
 * Internals
 * ------------------------------------------------------------------ */

type RequestInitWithTimeout = RequestInit & { timeoutMs: number }

async function request(
  url: string,
  { timeoutMs, signal, ...init }: RequestInitWithTimeout,
): Promise<Response> {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), timeoutMs)

  // Forward an externally supplied abort (component unmount, "Cancel" button).
  const forwardAbort = () => controller.abort()
  if (signal) {
    if (signal.aborted) forwardAbort()
    else signal.addEventListener("abort", forwardAbort, { once: true })
  }

  let response: Response
  try {
    response = await fetch(url, { ...init, signal: controller.signal })
  } catch (error) {
    if (signal?.aborted) throw error // caller cancelled on purpose — let it bubble
    if (controller.signal.aborted) {
      throw new ReceiptApiError(
        "서버 응답이 너무 오래 걸립니다. 잠시 후 다시 시도해 주세요.",
        { code: "timeout" },
      )
    }
    throw new ReceiptApiError(
      "분석 서버에 연결할 수 없습니다. 네트워크 상태를 확인한 뒤 다시 시도해 주세요.",
      { code: "network" },
    )
  } finally {
    window.clearTimeout(timer)
    signal?.removeEventListener("abort", forwardAbort)
  }

  if (!response.ok) {
    throw new ReceiptApiError(await readErrorMessage(response), {
      status: response.status,
    })
  }

  return response
}

async function readErrorMessage(response: Response): Promise<string> {
  const fallback =
    response.status === 413
      ? "서버가 처리하기에 파일이 너무 큽니다."
      : response.status === 415
        ? "서버가 해당 파일 형식을 거부했습니다."
        : response.status >= 500
          ? "분석 서비스에 오류가 발생했습니다. 잠시 후 다시 시도해 주세요."
          : `요청에 실패했습니다 (${response.status}).`

  try {
    const text = await response.text()
    if (!text) return fallback
    try {
      const body = JSON.parse(text) as Record<string, unknown>
      const message = body.message ?? body.error ?? body.detail
      return typeof message === "string" && message ? message : fallback
    } catch {
      return text.slice(0, 200)
    }
  } catch {
    return fallback
  }
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json()
  } catch {
    throw new ReceiptApiError("서버 응답을 해석할 수 없습니다.", {
      code: "bad_response",
    })
  }
}

/**
 * OCR backends are loose with types — amounts arrive as `"6.00"`, dates as
 * `"2026/08/14"`. Normalize once here so components can trust `ReceiptAnalysis`.
 * A `{ data: … }` envelope is unwrapped if present.
 */
function normalizeAnalysis(payload: unknown): ReceiptAnalysis {
  const root = payload as Record<string, unknown> | null
  const raw = (root && typeof root === "object" && "data" in root
    ? root.data
    : root) as Record<string, unknown> | null

  if (!raw || typeof raw !== "object") {
    throw new ReceiptApiError("서버가 예상과 다른 형식으로 응답했습니다.", {
      code: "bad_response",
    })
  }

  const amount = toNumber(raw.amount)
  if (raw.id === undefined || amount === null) {
    throw new ReceiptApiError(
      "영수증을 읽지 못했습니다. 더 선명한 사진으로 다시 시도하거나 직접 입력해 주세요.",
      { code: "incomplete_analysis" },
    )
  }

  return {
    id: String(raw.id),
    amount,
    merchant: toText(raw.merchant),
    employeeName: toText(raw.employeeName ?? raw.employee_name),
    purpose: toText(raw.purpose),
    status: toStatus(raw.status),
    createdAt: toText(raw.createdAt ?? raw.created_at) || new Date().toISOString(),
    date: toDate(raw.date ?? raw.transactionDate ?? raw.transaction_date),
    item: toText(raw.item) || undefined,
    category: toText(raw.category) || undefined,
    currency: toText(raw.currency) || undefined,
    confidence: toNumber(raw.confidence) ?? undefined,
    compliance: toCompliance(raw.compliance),
  }
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null
  if (typeof value === "string") {
    const parsed = Number(value.replace(/[^0-9.-]/g, ""))
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function toText(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

function toStatus(value: unknown): ReceiptStatus {
  const status = toText(value)
  return status === "pending" || status === "approved" || status === "rejected"
    ? status
    : "draft"
}

/** Accepts `2026-08-14`, `2026/08/14` or an ISO timestamp; emits `YYYY-MM-DD`. */
function toDate(value: unknown): string | undefined {
  const text = toText(value)
  if (!text) return undefined

  const match = text.replace(/\//g, "-").match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (!match) return undefined

  const [, year, month, day] = match
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`
}

function toCompliance(value: unknown): ComplianceCheck | undefined {
  if (!value || typeof value !== "object") return undefined
  const raw = value as Record<string, unknown>
  const level = toText(raw.level)
  if (level !== "compliant" && level !== "warning" && level !== "high") return undefined

  return {
    level,
    title: toText(raw.title) || "AI 규정 검토",
    detail: toText(raw.detail),
  }
}
