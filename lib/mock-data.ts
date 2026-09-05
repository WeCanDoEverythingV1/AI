import type { SubscriptionDto } from "@/types/api"

/**
 * Client-owned app data and shared formatting helpers.
 *
 * Approval requests now live in the backend (`lib/api/endpoints.ts`). What stays
 * here is the SaaS subscription inventory — the backend has no subscription
 * store, `POST /api/subscriptions/analyze` takes the list in the request body —
 * plus the sign-in roles and the formatters every screen shares.
 */

export type Role = "employee" | "approver"

export const roleLabels: Record<Role, string> = {
  employee: "사원",
  approver: "결재자",
}

/** What we ask the vendor for; sent as `EmailDraftRequestDto.action`. */
export type SubscriptionAction = "reclaim" | "downgrade" | "cancel"

/** A subscription plus the UI-only bits the wire type has no room for. */
export type CompanySubscription = SubscriptionDto & {
  action: SubscriptionAction
  actionLabel: string
}

export const companySubscriptions: CompanySubscription[] = [
  {
    id: "sub-1",
    name: "Salesforce Sales Cloud",
    category: "고객관리(CRM)",
    monthlyCost: 4_200_000,
    seats: 40,
    activeSeats: 18,
    lastUsed: "사용 편차 큼",
    action: "reclaim",
    actionLabel: "미사용 좌석 회수",
  },
  {
    id: "sub-2",
    name: "Adobe Creative Cloud",
    category: "디자인",
    monthlyCost: 1_400_000,
    seats: 20,
    activeSeats: 6,
    lastUsed: "43일 전",
    action: "downgrade",
    actionLabel: "좌석 수 축소",
  },
  {
    id: "sub-3",
    name: "Notion Enterprise",
    category: "협업",
    monthlyCost: 800_000,
    seats: 80,
    activeSeats: 52,
    lastUsed: "2일 전",
    action: "downgrade",
    actionLabel: "좌석 수 조정",
  },
  {
    id: "sub-4",
    name: "Zoom One Business",
    category: "커뮤니케이션",
    monthlyCost: 600_000,
    seats: 30,
    activeSeats: 11,
    lastUsed: "19일 전",
    action: "downgrade",
    actionLabel: "통합 후 축소",
  },
  {
    id: "sub-5",
    name: "Miro Consultant",
    category: "화이트보드",
    monthlyCost: 200_000,
    seats: 10,
    activeSeats: 1,
    lastUsed: "78일 전",
    action: "cancel",
    actionLabel: "구독 해지",
  },
]

export const currency = (value: number) =>
  value.toLocaleString("ko-KR", {
    style: "currency",
    currency: "KRW",
    maximumFractionDigits: 0,
  })

/** `YYYY-MM-DD` from the API → `2026년 8월 14일`. */
export function formatApiDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return value

  return new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
  ).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })
}

/**
 * Avatar initials. Korean names have no spaces, so fall back to the given name
 * (김서연 → 서연); Latin names keep the usual first-letter initials.
 */
export function initialsOf(name: string) {
  const trimmed = name.trim()
  if (!trimmed) return "??"
  if (/^[가-힣]+$/.test(trimmed)) return trimmed.slice(-2)
  return trimmed
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("")
}
