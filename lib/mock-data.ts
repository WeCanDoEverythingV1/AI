export type Role = "employee" | "approver"

export type RiskLevel = "compliant" | "warning" | "high"

export type RiskAnalysis = {
  level: RiskLevel
  label: string
}

export type ApprovalRequest = {
  id: string
  employee: string
  initials: string
  merchant: string
  category: string
  date: string
  amount: number
  item: string
  purpose: string
  risk: RiskAnalysis
}

export const roleLabels: Record<Role, string> = {
  employee: "사원",
  approver: "결재자",
}

export const pendingRequests: ApprovalRequest[] = [
  {
    id: "REQ-2041",
    employee: "김서연",
    initials: "서연",
    merchant: "블루보틀 삼청",
    category: "식비",
    date: "2026년 8월 14일",
    amount: 48500,
    item: "팀 오프사이트 커피",
    purpose: "에이콘 계정팀과 진행한 고객 온보딩 킥오프 미팅.",
    risk: { level: "compliant", label: "규정 준수" },
  },
  {
    id: "REQ-2040",
    employee: "이준호",
    initials: "준호",
    merchant: "대한항공",
    category: "출장",
    date: "2026년 8월 13일",
    amount: 1860000,
    item: "인천 ↔ JFK 왕복 항공권",
    purpose: "엔터프라이즈 고객사 분기 비즈니스 리뷰 출장.",
    risk: { level: "high", label: "위험: 예산 초과" },
  },
  {
    id: "REQ-2039",
    employee: "박지민",
    initials: "지민",
    merchant: "Figma",
    category: "소프트웨어",
    date: "2026년 8월 12일",
    amount: 62000,
    item: "Figma Professional 1좌석",
    purpose: "신규 제품 마케팅 사이트 디자인 작업용 도구.",
    risk: { level: "high", label: "위험: 중복 결제 감지" },
  },
  {
    id: "REQ-2038",
    employee: "최도현",
    initials: "도현",
    merchant: "파라다이스 호텔 부산",
    category: "숙박",
    date: "2026년 8월 11일",
    amount: 289000,
    item: "1박 숙박",
    purpose: "부산 지역 영업 서밋 참석에 따른 1박 숙박.",
    risk: { level: "warning", label: "주의: 주말 지출" },
  },
  {
    id: "REQ-2037",
    employee: "정하윤",
    initials: "하윤",
    merchant: "카카오 T",
    category: "출장",
    date: "2026년 8월 11일",
    amount: 32700,
    item: "공항 이동 택시",
    purpose: "데모 당일 호텔에서 고객사 본사까지 이동.",
    risk: { level: "warning", label: "주의: 심야 시간대 이용" },
  },
]

export type SubscriptionAction = "reclaim" | "downgrade" | "cancel"

export type WastedSubscription = {
  id: string
  name: string
  category: string
  monthlyCost: number
  seats: number
  activeSeats: number
  lastUsed: string
  recommendation: string
  severity: "high" | "medium" | "low"
  action: SubscriptionAction
  actionLabel: string
}

export const wastedSubscriptions: WastedSubscription[] = [
  {
    id: "sub-1",
    name: "Salesforce Sales Cloud",
    category: "고객관리(CRM)",
    monthlyCost: 4200000,
    seats: 40,
    activeSeats: 18,
    lastUsed: "사용 편차 큼",
    recommendation: "미사용 좌석 22개 회수 — 월 231만 원 절감.",
    severity: "high",
    action: "reclaim",
    actionLabel: "미사용 좌석 22개 회수",
  },
  {
    id: "sub-2",
    name: "Adobe Creative Cloud",
    category: "디자인",
    monthlyCost: 1400000,
    seats: 20,
    activeSeats: 6,
    lastUsed: "43일 전",
    recommendation: "8좌석으로 축소 — 월 98만 원 절감.",
    severity: "high",
    action: "downgrade",
    actionLabel: "8좌석으로 축소",
  },
  {
    id: "sub-3",
    name: "Notion Enterprise",
    category: "협업",
    monthlyCost: 800000,
    seats: 80,
    activeSeats: 52,
    lastUsed: "2일 전",
    recommendation: "60좌석으로 조정 — 월 20만 원 절감.",
    severity: "medium",
    action: "downgrade",
    actionLabel: "60좌석으로 조정",
  },
  {
    id: "sub-4",
    name: "Zoom One Business",
    category: "커뮤니케이션",
    monthlyCost: 600000,
    seats: 30,
    activeSeats: 11,
    lastUsed: "19일 전",
    recommendation: "기존 Meet 요금제와 통합 — 월 38만 원 절감.",
    severity: "medium",
    action: "downgrade",
    actionLabel: "통합 후 축소",
  },
  {
    id: "sub-5",
    name: "Miro Consultant",
    category: "화이트보드",
    monthlyCost: 200000,
    seats: 10,
    activeSeats: 1,
    lastUsed: "78일 전",
    recommendation: "해지 — 사용률이 거의 없어 월 20만 원 절감.",
    severity: "high",
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

export function buildVendorEmail(sub: WastedSubscription) {
  const idle = sub.seats - sub.activeSeats
  const monthlySaving = Math.round((sub.monthlyCost / sub.seats) * idle)
  const vendor = sub.name.split(" ")[0]

  if (sub.action === "cancel") {
    return {
      subject: `[해지 요청] ${sub.name} — 한빛테크`,
      body: `${vendor} 담당자님, 안녕하세요.

한빛테크 재무운영팀입니다. 현재 이용 중인 ${sub.name} 구독과 관련해 문의드립니다.

내부 사용량 점검 결과 해당 계정이 사실상 사용되지 않고 있음을 확인했습니다(마지막 유의미한 사용: ${sub.lastUsed}, 전체 ${sub.seats}석 중 ${sub.activeSeats}석만 활성). 이에 현재 결제 주기가 끝나는 시점에 구독을 해지하고자 합니다.

해지 예정일과, 사전에 완료해야 할 데이터 내보내기·오프보딩 절차가 있다면 함께 안내해 주시면 감사하겠습니다.

도움 주셔서 감사합니다.

한빛테크 재무운영팀 드림`,
    }
  }

  const targetSeats =
    sub.action === "reclaim" ? sub.activeSeats : Math.max(sub.activeSeats, sub.seats - idle)

  return {
    subject: `[플랜 조정 요청] ${sub.name} — 한빛테크`,
    body: `${vendor} 담당자님, 안녕하세요.

한빛테크 재무운영팀입니다. 현재 이용 중인 ${sub.name} 플랜과 관련해 문의드립니다.

최근 사용량 검토 결과, 계약된 ${sub.seats}석 중 ${sub.activeSeats}석만 실제로 사용되고 있습니다(마지막 사용: ${sub.lastUsed}). 실제 사용량에 맞춰 지출을 정렬하고자, 다음 결제 주기부터 ${sub.seats}석에서 ${targetSeats}석으로 축소하고 싶습니다.

현재 좌석당 단가 기준으로 월 ${currency(monthlySaving)} 수준의 조정으로 예상됩니다. 변경 후 단가와 적용 시점, 그리고 별도의 계약 변경 절차가 필요한지 확인 부탁드립니다.

계정 규모를 적정하게 유지할 수 있도록 도와주셔서 감사합니다.

한빛테크 재무운영팀 드림`,
  }
}
