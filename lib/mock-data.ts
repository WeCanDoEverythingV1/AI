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

export const pendingRequests: ApprovalRequest[] = [
  {
    id: "REQ-2041",
    employee: "Sarah Chen",
    initials: "SC",
    merchant: "Blue Bottle Coffee",
    category: "Meals",
    date: "Aug 14, 2026",
    amount: 48.5,
    item: "Team offsite coffee",
    purpose: "Client onboarding kickoff with the Acme account team.",
    risk: { level: "compliant", label: "Policy Compliant" },
  },
  {
    id: "REQ-2040",
    employee: "Marcus Lee",
    initials: "ML",
    merchant: "Delta Air Lines",
    category: "Travel",
    date: "Aug 13, 2026",
    amount: 612.0,
    item: "Round-trip SFO → JFK",
    purpose: "On-site quarterly business review with enterprise customer.",
    risk: { level: "high", label: "High Risk: Budget exceeded" },
  },
  {
    id: "REQ-2039",
    employee: "Priya Nair",
    initials: "PN",
    merchant: "Figma",
    category: "Software",
    date: "Aug 12, 2026",
    amount: 45.0,
    item: "Figma Professional seat",
    purpose: "Design tooling for the new product marketing site.",
    risk: { level: "high", label: "High Risk: Duplicate detected" },
  },
  {
    id: "REQ-2038",
    employee: "David Okafor",
    initials: "DO",
    merchant: "The Grand Hotel",
    category: "Lodging",
    date: "Aug 11, 2026",
    amount: 289.99,
    item: "1 night stay",
    purpose: "Overnight for the regional sales summit in Chicago.",
    risk: { level: "warning", label: "Warning: Weekend spend" },
  },
  {
    id: "REQ-2037",
    employee: "Elena Rossi",
    initials: "ER",
    merchant: "Uber",
    category: "Travel",
    date: "Aug 11, 2026",
    amount: 32.75,
    item: "Airport transfer",
    purpose: "Transport from hotel to customer HQ for demo day.",
    risk: { level: "warning", label: "Warning: Unusual dining hour" },
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
    category: "CRM",
    monthlyCost: 3200,
    seats: 40,
    activeSeats: 18,
    lastUsed: "Mixed usage",
    recommendation: "Reclaim 22 idle seats — save $1,760/mo.",
    severity: "high",
    action: "reclaim",
    actionLabel: "Reclaim 22 inactive seats",
  },
  {
    id: "sub-2",
    name: "Adobe Creative Cloud",
    category: "Design",
    monthlyCost: 1100,
    seats: 20,
    activeSeats: 6,
    lastUsed: "43 days ago",
    recommendation: "Downgrade to 8 seats — save $770/mo.",
    severity: "high",
    action: "downgrade",
    actionLabel: "Downgrade to 8 seats",
  },
  {
    id: "sub-3",
    name: "Notion Enterprise",
    category: "Productivity",
    monthlyCost: 640,
    seats: 80,
    activeSeats: 52,
    lastUsed: "2 days ago",
    recommendation: "Right-size to 60 seats — save $160/mo.",
    severity: "medium",
    action: "downgrade",
    actionLabel: "Right-size to 60 seats",
  },
  {
    id: "sub-4",
    name: "Zoom One Business",
    category: "Communication",
    monthlyCost: 480,
    seats: 30,
    activeSeats: 11,
    lastUsed: "19 days ago",
    recommendation: "Consolidate with existing Meet plan — save $310/mo.",
    severity: "medium",
    action: "downgrade",
    actionLabel: "Consolidate & downgrade",
  },
  {
    id: "sub-5",
    name: "Miro Consultant",
    category: "Whiteboarding",
    monthlyCost: 160,
    seats: 10,
    activeSeats: 1,
    lastUsed: "78 days ago",
    recommendation: "Cancel — near-zero usage, save $160/mo.",
    severity: "high",
    action: "cancel",
    actionLabel: "Cancel subscription",
  },
]

export const currency = (value: number) =>
  value.toLocaleString("en-US", { style: "currency", currency: "USD" })

export function buildVendorEmail(sub: WastedSubscription) {
  const idle = sub.seats - sub.activeSeats
  const monthlySaving = Math.round((sub.monthlyCost / sub.seats) * idle)
  const vendor = sub.name.split(" ")[0]

  if (sub.action === "cancel") {
    return {
      subject: `Cancellation request — ${sub.name} (Acme Corp)`,
      body: `Hi ${vendor} Team,

I'm reaching out on behalf of Acme Corp's finance operations team regarding our ${sub.name} subscription.

After an internal usage audit, we found the account has been effectively inactive (last meaningful usage ${sub.lastUsed.toLowerCase()}, ${sub.activeSeats} of ${sub.seats} seats active). As a result, we'd like to cancel this subscription at the end of the current billing cycle.

Could you please confirm the cancellation date and outline any offboarding or data-export steps we should complete beforehand?

Thank you for your help.

Best regards,
Acme Corp — Finance Operations`,
    }
  }

  const targetSeats = sub.action === "reclaim" ? sub.activeSeats : Math.max(sub.activeSeats, sub.seats - idle)

  return {
    subject: `Plan adjustment request — ${sub.name} (Acme Corp)`,
    body: `Hi ${vendor} Team,

I'm reaching out on behalf of Acme Corp's finance operations team regarding our ${sub.name} plan.

Our latest usage review shows ${sub.activeSeats} of ${sub.seats} licensed seats are actively used (last activity ${sub.lastUsed.toLowerCase()}). To align our spend with actual usage, we'd like to reduce our plan from ${sub.seats} seats to ${targetSeats} seats, effective the next billing cycle.

Based on your current per-seat pricing, this represents roughly ${currency(monthlySaving)}/month. Could you confirm the adjusted rate and the effective date, and let us know if any contract amendment is required?

Appreciate your help keeping our account right-sized.

Best regards,
Acme Corp — Finance Operations`,
  }
}
