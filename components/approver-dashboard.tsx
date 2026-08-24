"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
  Check,
  CheckCircle2,
  Clock,
  ShieldCheck,
  TriangleAlert,
  Wallet,
  X,
} from "lucide-react"

type Decision = "approved" | "rejected"

export function ApproverDashboard() {
  const [decisions, setDecisions] = useState<Record<string, Decision>>({})

  const pending = pendingRequests.filter((r) => !decisions[r.id])
  const pendingTotal = useMemo(
    () => pending.reduce((sum, r) => sum + r.amount, 0),
    [pending],
  )
  const approvedCount = Object.values(decisions).filter((d) => d === "approved").length
  const rejectedCount = Object.values(decisions).filter((d) => d === "rejected").length

  const decide = (id: string, decision: Decision) =>
    setDecisions((prev) => ({ ...prev, [id]: decision }))

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-balance">
          Pending approvals
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Review AI-drafted receipt requests from your team.
        </p>
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
