import type { ApiErrorBody } from "@/types/api"

/**
 * Base URL of the Baro backend, e.g. `https://baro-2fl1.onrender.com`.
 * An empty value falls back to same-origin, which is only useful behind a proxy.
 */
export const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/+$/, "")

export const apiUrl = (path: string) => `${API_BASE_URL}${path}`

/**
 * Base URL for the expense-policy endpoints, which the deployed backend does not
 * serve yet. Empty means same-origin, which reaches the temporary stub in
 * `app/api/policies/*`. Set `NEXT_PUBLIC_POLICY_API_URL` once the real service
 * implements them, then delete the stub.
 */
export const POLICY_BASE_URL = (process.env.NEXT_PUBLIC_POLICY_API_URL ?? "").replace(
  /\/+$/,
  "",
)

/** True while the policy screens are talking to the local stub, not a real service. */
export const usingPolicyStub = POLICY_BASE_URL === ""

/** The AI endpoints call a model, so they need far more headroom than a CRUD read. */
export const TIMEOUT = {
  read: 20_000,
  write: 20_000,
  /** Vision model on a cold Render instance. */
  scan: 120_000,
  /** LLM analysis / drafting. */
  ai: 90_000,
} as const

export class ApiError extends Error {
  readonly status?: number
  readonly code?: "timeout" | "network" | "bad_response" | "http"
  readonly fieldErrors?: Record<string, string> | null

  constructor(
    message: string,
    options: {
      status?: number
      code?: ApiError["code"]
      fieldErrors?: Record<string, string> | null
    } = {},
  ) {
    super(message)
    this.name = "ApiError"
    this.status = options.status
    this.code = options.code
    this.fieldErrors = options.fieldErrors
  }
}

type RequestOptions = {
  method?: string
  /** Serialized as JSON; mutually exclusive with `formData`. */
  json?: unknown
  /** Sent as-is so the browser can set the multipart boundary itself. */
  formData?: FormData
  timeoutMs?: number
  signal?: AbortSignal
  /** Override the host, e.g. `POLICY_BASE_URL`. Defaults to `API_BASE_URL`. */
  base?: string
}

/**
 * Single entry point for every backend call: applies the timeout, forwards
 * caller-side aborts, and normalizes failures into `ApiError`.
 */
export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const {
    method = "GET",
    json,
    formData,
    timeoutMs = TIMEOUT.read,
    signal,
    base = API_BASE_URL,
  } = options

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  const forwardAbort = () => controller.abort()
  if (signal) {
    if (signal.aborted) forwardAbort()
    else signal.addEventListener("abort", forwardAbort, { once: true })
  }

  let response: Response
  try {
    response = await fetch(`${base}${path}`, {
      method,
      // No Content-Type for FormData: the browser must set the boundary.
      headers: json !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: json !== undefined ? JSON.stringify(json) : formData,
      signal: controller.signal,
    })
  } catch (error) {
    if (signal?.aborted) throw error // caller cancelled on purpose — let it bubble
    if (controller.signal.aborted) {
      throw new ApiError("서버 응답이 너무 오래 걸립니다. 잠시 후 다시 시도해 주세요.", {
        code: "timeout",
      })
    }
    throw new ApiError(
      "서버에 연결할 수 없습니다. 네트워크 상태를 확인한 뒤 다시 시도해 주세요.",
      { code: "network" },
    )
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener("abort", forwardAbort)
  }

  if (!response.ok) throw await toApiError(response)

  if (response.status === 204) return undefined as T

  try {
    return (await response.json()) as T
  } catch {
    throw new ApiError("서버 응답을 해석할 수 없습니다.", { code: "bad_response" })
  }
}

/** Turns the backend's `{ message, status, fieldErrors }` envelope into an `ApiError`. */
async function toApiError(response: Response): Promise<ApiError> {
  const fallback =
    response.status === 413
      ? "서버가 처리하기에 파일이 너무 큽니다."
      : response.status === 415
        ? "서버가 해당 파일 형식을 거부했습니다."
        : response.status === 404
          ? "요청한 내역을 찾을 수 없습니다."
          : response.status >= 500
            ? "서버에 오류가 발생했습니다. 잠시 후 다시 시도해 주세요."
            : `요청에 실패했습니다 (${response.status}).`

  let body: ApiErrorBody | null = null
  try {
    const text = await response.text()
    if (text) body = JSON.parse(text) as ApiErrorBody
  } catch {
    // Non-JSON error page — fall through to the status-based message.
  }

  const fieldErrors = body?.fieldErrors ?? null
  const detail = fieldErrors ? Object.values(fieldErrors).join(" · ") : ""
  const message = body?.message?.trim()

  return new ApiError(
    // A validation failure's generic "Validation failed" is useless on its own,
    // so append the per-field detail the server sent with it.
    [message || fallback, detail].filter(Boolean).join(" — "),
    { status: response.status, code: "http", fieldErrors },
  )
}

/**
 * The backend emits `LocalDateTime` with no timezone (`2026-09-05T05:37:42.7677`)
 * and runs on UTC. `new Date()` would read that as browser-local time, so pin it
 * to UTC and trim the sub-millisecond digits JS cannot represent.
 */
export function parseServerTimestamp(value: string): Date {
  const hasZone = /(?:Z|[+-]\d{2}:?\d{2})$/.test(value)
  const trimmed = value.replace(/(\.\d{3})\d+/, "$1")
  return new Date(hasZone ? trimmed : `${trimmed}Z`)
}
