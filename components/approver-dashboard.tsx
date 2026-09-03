"use client"

import { useMemo, useState, type FormEvent } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Field } from "@/components/field"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"
import {
  currency,
  pendingRequests,
  type ApprovalRequest,
  type RiskLevel,
} from "@/lib/mock-data"
import {
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  DollarSign,
  FileText,
  Layers,
  Plus,
  ShieldCheck,
  Store,
  Tag,
  TriangleAlert,
  User,
  Wallet,
  X,
} from "lucide-react"

type Decision = "approved" | "rejected"

export function ApproverDashboard() {
  const [requests, setRequests] = useState<ApprovalRequest[]>(pendingRequests)
  const [decisions, setDecisions] = useState<Record<string, Decision>>({})

  const pending = requests.filter((r) => !decisions[r.id])
  const pendingTotal = useMemo(
    () => pending.reduce((sum, r) => sum + r.amount, 0),
    [pending],
  )
  const approvedCount = Object.values(decisions).filter((d) => d === "approved").length
  const rejectedCount = Object.values(decisions).filter((d) => d === "rejected").length

  const decide = (id: string, decision: Decision) =>
    setDecisions((prev) => ({ ...prev, [id]: decision }))

  const addRequest = (draft: NewRequestDraft) =>
    setRequests((prev) => [buildRequest(draft, prev), ...prev])

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-balance">
            Pending approvals
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Review AI-drafted receipt requests from your team.
          </p>
        </div>
        <AddRequestDialog onAdd={addRequest} />
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <StatCard
          icon={<Clock className="size-4" />}
          label="Awaiting review"
          value={String(pending.length)}
          sub={`${currency(pendingTotal)} in flight`}
        />
        <StatCard
          icon={<CheckCircle2 className="size-4 text-success" />}
          label="Approved today"
          value={String(approvedCount)}
        />
        <StatCard
          icon={<Wallet className="size-4" />}
          label="Rejected today"
          value={String(rejectedCount)}
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        {pending.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-success/10">
              <CheckCircle2 className="size-6 text-success" />
            </div>
            <p className="mt-4 text-sm font-medium text-foreground">All caught up</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Every pending request has been reviewed.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-5">Employee</TableHead>
                <TableHead>Merchant</TableHead>
                <TableHead className="hidden lg:table-cell">Purpose</TableHead>
                <TableHead>AI Risk Analysis</TableHead>
                <TableHead className="hidden sm:table-cell">Date</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="pr-5 text-right">Decision</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pending.map((req) => (
                <Row key={req.id} req={req} onDecide={decide} />
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </main>
  )
}

type NewRequestDraft = {
  employee: string
  merchant: string
  category: string
  date: string
  amount: string
  item: string
  purpose: string
  risk: RiskLevel
}

const emptyDraft: NewRequestDraft = {
  employee: "",
  merchant: "",
  category: "",
  date: "",
  amount: "",
  item: "",
  purpose: "",
  risk: "compliant",
}

const riskPresets: { level: RiskLevel; short: string; label: string }[] = [
  { level: "compliant", short: "Compliant", label: "Policy Compliant" },
  { level: "warning", short: "Warning", label: "Warning: Needs review" },
  { level: "high", short: "High risk", label: "High Risk: Manual review" },
]

const categoryOptions = ["Meals", "Travel", "Software", "Lodging", "Equipment", "Other"]

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "??"
  return parts
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join("")
}

function formatDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  const date = match
    ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
    : new Date()
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function nextRequestId(existing: ApprovalRequest[]) {
  const highest = existing.reduce((max, r) => {
    const n = Number.parseInt(r.id.replace(/\D/g, ""), 10)
    return Number.isNaN(n) ? max : Math.max(max, n)
  }, 2041)
  return `REQ-${highest + 1}`
}

function buildRequest(
  draft: NewRequestDraft,
  existing: ApprovalRequest[],
): ApprovalRequest {
  const preset = riskPresets.find((r) => r.level === draft.risk) ?? riskPresets[0]
  return {
    id: nextRequestId(existing),
    employee: draft.employee.trim(),
    initials: initialsOf(draft.employee),
    merchant: draft.merchant.trim(),
    category: draft.category.trim() || "Other",
    date: formatDate(draft.date),
    amount: Number.parseFloat(draft.amount.replace(/[^0-9.]/g, "")) || 0,
    item: draft.item.trim() || draft.merchant.trim(),
    purpose: draft.purpose.trim() || "Manually added by approver.",
    risk: { level: preset.level, label: preset.label },
  }
}

function AddRequestDialog({ onAdd }: { onAdd: (draft: NewRequestDraft) => void }) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<NewRequestDraft>(emptyDraft)
  const [error, setError] = useState<string | null>(null)

  const update = <K extends keyof NewRequestDraft>(key: K, value: NewRequestDraft[K]) =>
    setDraft((prev) => ({ ...prev, [key]: value }))

  const openChange = (next: boolean) => {
    setOpen(next)
    if (!next) {
      setDraft(emptyDraft)
      setError(null)
    }
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!draft.employee.trim() || !draft.merchant.trim()) {
      setError("Employee and merchant are required.")
      return
    }
    const amount = Number.parseFloat(draft.amount.replace(/[^0-9.]/g, ""))
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Enter an amount greater than 0.")
      return
    }
    onAdd(draft)
    openChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={openChange}>
      <DialogTrigger render={<Button variant="outline" size="sm" className="gap-1" />}>
        <Plus />
        추가
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add a request</DialogTitle>
          <DialogDescription>
            Log a receipt request manually — it drops straight into the pending queue.
          </DialogDescription>
        </DialogHeader>

        <form id="add-request-form" onSubmit={submit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="new-employee" label="Employee" icon={<User className="size-4" />}>
              <Input
                id="new-employee"
                value={draft.employee}
                onChange={(e) => update("employee", e.target.value)}
                placeholder="Sarah Chen"
              />
            </Field>
            <Field id="new-merchant" label="Merchant" icon={<Store className="size-4" />}>
              <Input
                id="new-merchant"
                value={draft.merchant}
                onChange={(e) => update("merchant", e.target.value)}
                placeholder="Blue Bottle Coffee"
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field id="new-category" label="Category" icon={<Layers className="size-4" />}>
              <Input
                id="new-category"
                list="new-category-options"
                value={draft.category}
                onChange={(e) => update("category", e.target.value)}
                placeholder="Meals"
              />
              <datalist id="new-category-options">
                {categoryOptions.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </Field>
            <Field id="new-date" label="Date" icon={<Calendar className="size-4" />}>
              <Input
                id="new-date"
                type="date"
                value={draft.date}
                onChange={(e) => update("date", e.target.value)}
              />
            </Field>
            <Field id="new-amount" label="Amount" icon={<DollarSign className="size-4" />}>
              <Input
                id="new-amount"
                inputMode="decimal"
                value={draft.amount}
                onChange={(e) => update("amount", e.target.value)}
                placeholder="0.00"
              />
            </Field>
          </div>

          <Field id="new-item" label="Item name" icon={<Tag className="size-4" />}>
            <Input
              id="new-item"
              value={draft.item}
              onChange={(e) => update("item", e.target.value)}
              placeholder="Team offsite coffee"
            />
          </Field>

          <Field id="new-purpose" label="Purpose" icon={<FileText className="size-4" />}>
            <Textarea
              id="new-purpose"
              rows={2}
              value={draft.purpose}
              onChange={(e) => update("purpose", e.target.value)}
              placeholder="Client onboarding kickoff with the Acme account team."
              className="resize-none"
            />
          </Field>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">AI risk analysis</Label>
            <div className="flex flex-wrap gap-2">
              {riskPresets.map((r) => (
                <Button
                  key={r.level}
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => update("risk", r.level)}
                  className={cn("gap-1.5", draft.risk === r.level && riskStyles[r.level].wrap)}
                >
                  {riskStyles[r.level].icon}
                  {r.short}
                </Button>
              ))}
            </div>
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}
        </form>

        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
          <Button type="submit" form="add-request-form" className="gap-1">
            <Plus className="size-4" />
            Add to queue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Row({
  req,
  onDecide,
}: {
  req: ApprovalRequest
  onDecide: (id: string, decision: Decision) => void
}) {
  return (
    <TableRow>
      <TableCell className="pl-5">
        <div className="flex items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
            {req.initials}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">{req.employee}</p>
            <p className="text-xs text-muted-foreground">{req.id}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">{req.merchant}</p>
          <Badge variant="secondary" className="mt-0.5 font-normal">
            {req.category}
          </Badge>
        </div>
      </TableCell>
      <TableCell className="hidden max-w-56 lg:table-cell">
        <p className="truncate text-sm text-muted-foreground" title={req.purpose}>
          {req.item}
        </p>
        <p className="truncate text-xs text-muted-foreground/70" title={req.purpose}>
          {req.purpose}
        </p>
      </TableCell>
      <TableCell>
        <RiskBadge level={req.risk.level} label={req.risk.label} />
      </TableCell>
      <TableCell className="hidden whitespace-nowrap text-sm text-muted-foreground sm:table-cell">
        {req.date}
      </TableCell>
      <TableCell className="whitespace-nowrap text-right text-sm font-semibold tabular-nums text-foreground">
        {currency(req.amount)}
      </TableCell>
      <TableCell className="pr-5">
        <div className="flex items-center justify-end gap-2">
          <Button
            size="sm"
            onClick={() => onDecide(req.id, "approved")}
            className="gap-1 bg-success text-success-foreground hover:bg-success/90"
          >
            <Check className="size-4" />
            <span className="hidden sm:inline">Approve</span>
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onDecide(req.id, "rejected")}
            className="gap-1 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            <X className="size-4" />
            <span className="hidden sm:inline">Reject</span>
          </Button>
        </div>
      </TableCell>
    </TableRow>
  )
}

const riskStyles: Record<
  RiskLevel,
  { wrap: string; dot: string; icon: React.ReactNode }
> = {
  compliant: {
    wrap: "border-success/30 bg-success/10 text-success",
    dot: "bg-success",
    icon: <ShieldCheck className="size-3.5" />,
  },
  warning: {
    wrap: "border-warning/45 bg-warning/15 text-warning-foreground",
    dot: "bg-warning",
    icon: <TriangleAlert className="size-3.5" />,
  },
  high: {
    wrap: "border-destructive/30 bg-destructive/10 text-destructive",
    dot: "bg-destructive",
    icon: <TriangleAlert className="size-3.5" />,
  },
}

function RiskBadge({ level, label }: { level: RiskLevel; label: string }) {
  const style = riskStyles[level]
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-medium",
        style.wrap,
      )}
    >
      {style.icon}
      {label}
    </span>
  )
}

function StatCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode
  label: string
  value: string
  sub?: string
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-foreground">
        {value}
      </p>
      {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
    </div>
  )
}
