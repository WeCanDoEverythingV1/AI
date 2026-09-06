import { apiFetch, ApiError, TIMEOUT } from "@/lib/api/client"
import type {
  ApprovalRequestCreateDto,
  ApprovalRequestResponseDto,
  EmailDraftDto,
  EmailDraftRequestDto,
  ReceiptScanResultDto,
  SubscriptionAnalysisDto,
  SubscriptionDto,
} from "@/types/api"

type Options = { signal?: AbortSignal }

/* ------------------------------------------------------------------ *
 * Receipts
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

/** Client-side pre-check. Returns a Korean error message, or `null` when usable. */
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

/**
 * `POST /api/receipts/scan` — multipart with a single `file` part.
 *
 * `employeeName` is a **required query parameter**, not a form field: the server
 * needs to know who is claiming before it can run the duplicate and policy checks.
 */
export function scanReceipt(
  file: File,
  { employeeName, signal }: Options & { employeeName: string },
): Promise<ReceiptScanResultDto> {
  const formData = new FormData()
  formData.append("file", file, file.name)

  const query = new URLSearchParams({ employeeName })

  return apiFetch<ReceiptScanResultDto>(`/api/receipts/scan?${query}`, {
    method: "POST",
    formData,
    timeoutMs: TIMEOUT.scan,
    signal,
  })
}

/* ------------------------------------------------------------------ *
 * Approval requests
 * ------------------------------------------------------------------ */

export function listApprovalRequests(
  { signal }: Options = {},
): Promise<ApprovalRequestResponseDto[]> {
  return apiFetch<ApprovalRequestResponseDto[]>("/api/approval-requests", { signal })
}

export function listPendingApprovalRequests(
  { signal }: Options = {},
): Promise<ApprovalRequestResponseDto[]> {
  return apiFetch<ApprovalRequestResponseDto[]>("/api/approval-requests/pending", {
    signal,
  })
}

export function createApprovalRequest(
  body: ApprovalRequestCreateDto,
  { signal }: Options = {},
): Promise<ApprovalRequestResponseDto> {
  return apiFetch<ApprovalRequestResponseDto>("/api/approval-requests", {
    method: "POST",
    json: body,
    timeoutMs: TIMEOUT.write,
    signal,
  })
}

export function approveRequest(
  id: number,
  { signal }: Options = {},
): Promise<ApprovalRequestResponseDto> {
  return apiFetch<ApprovalRequestResponseDto>(`/api/approval-requests/${id}/approve`, {
    method: "PATCH",
    timeoutMs: TIMEOUT.write,
    signal,
  })
}

export function rejectRequest(
  id: number,
  { signal }: Options = {},
): Promise<ApprovalRequestResponseDto> {
  return apiFetch<ApprovalRequestResponseDto>(`/api/approval-requests/${id}/reject`, {
    method: "PATCH",
    timeoutMs: TIMEOUT.write,
    signal,
  })
}

/* ------------------------------------------------------------------ *
 * Subscriptions
 * ------------------------------------------------------------------ */

/** Strip UI-only fields — the server rejects nothing, but only these are the contract. */
const toSubscriptionDto = (sub: SubscriptionDto): SubscriptionDto => ({
  id: sub.id,
  name: sub.name,
  category: sub.category,
  monthlyCost: sub.monthlyCost,
  seats: sub.seats,
  activeSeats: sub.activeSeats,
  lastUsed: sub.lastUsed,
})

export function analyzeSubscriptions(
  subscriptions: SubscriptionDto[],
  { signal }: Options = {},
): Promise<SubscriptionAnalysisDto[]> {
  return apiFetch<SubscriptionAnalysisDto[]>("/api/subscriptions/analyze", {
    method: "POST",
    json: { subscriptions: subscriptions.map(toSubscriptionDto) },
    timeoutMs: TIMEOUT.ai,
    signal,
  })
}

export function draftVendorEmail(
  subscription: SubscriptionDto,
  action: string,
  { language = "ko", signal }: Options & { language?: string } = {},
): Promise<EmailDraftDto> {
  const body: EmailDraftRequestDto = {
    subscription: toSubscriptionDto(subscription),
    action,
    language,
  }

  return apiFetch<EmailDraftDto>("/api/subscriptions/draft-email", {
    method: "POST",
    json: body,
    timeoutMs: TIMEOUT.ai,
    signal,
  })
}

/* ------------------------------------------------------------------ *
 * Shared error handling
 * ------------------------------------------------------------------ */

/** Every screen shows failures the same way: server message, or a generic fallback. */
export function messageFor(error: unknown, fallback = "요청을 처리하지 못했습니다. 다시 시도해 주세요."): string {
  if (error instanceof ApiError) return error.message
  return fallback
}

/** An abort we triggered ourselves is not an error worth showing. */
export function isAbort(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError"
}
