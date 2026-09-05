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
  initialsOf,
  pendingRequests,
  type ApprovalRequest,
  type RiskLevel,
} from "@/lib/mock-data"
import {
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  FileText,
  Layers,
  Plus,
  ShieldCheck,
  Store,
  Tag,
  TriangleAlert,
  User,
  Wallet,
  Wallet2,
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
          <h1 className="text-2xl font-semibold tracking-tight text-balance">결재 대기</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            팀원이 올린 AI 초안 영수증 요청을 검토하세요.
          </p>
        </div>
        <AddRequestDialog onAdd={addRequest} />
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <StatCard
          icon={<Clock className="size-4" />}
          label="검토 대기"
          value={`${pending.length}건`}
          sub={`합계 ${currency(pendingTotal)}`}
        />
        <StatCard
          icon={<CheckCircle2 className="size-4 text-success" />}
          label="오늘 승인"
          value={`${approvedCount}건`}
        />
        <StatCard
          icon={<Wallet className="size-4" />}
          label="오늘 반려"
          value={`${rejectedCount}건`}
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        {pending.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-success/10">
              <CheckCircle2 className="size-6 text-success" />
            </div>
            <p className="mt-4 text-sm font-medium text-foreground">모두 처리했습니다</p>
            <p className="mt-1 text-xs text-muted-foreground">
              대기 중인 요청을 전부 검토했습니다.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-5">신청자</TableHead>
                <TableHead>가맹점</TableHead>
                <TableHead className="hidden lg:table-cell">사용 내역</TableHead>
                <TableHead>AI 위험 분석</TableHead>
                <TableHead className="hidden sm:table-cell">사용일자</TableHead>
                <TableHead className="text-right">금액</TableHead>
                <TableHead className="pr-5 text-right">결재</TableHead>
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
  { level: "compliant", short: "정상", label: "규정 준수" },
  { level: "warning", short: "주의", label: "주의: 검토 필요" },
  { level: "high", short: "위험", label: "위험: 수동 검토 필요" },
]

const categoryOptions = ["식비", "출장", "소프트웨어", "숙박", "장비", "기타"]

function formatDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  const date = match
    ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
    : new Date()
  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
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
    category: draft.category.trim() || "기타",
    date: formatDate(draft.date),
    amount: Number.parseFloat(draft.amount.replace(/[^0-9.]/g, "")) || 0,
    item: draft.item.trim() || draft.merchant.trim(),
    purpose: draft.purpose.trim() || "결재자가 직접 추가한 요청입니다.",
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
      setError("신청자와 가맹점은 필수 항목입니다.")
      return
    }
    const amount = Number.parseFloat(draft.amount.replace(/[^0-9.]/g, ""))
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("0보다 큰 금액을 입력해 주세요.")
      return
    }
    onAdd(draft)
    openChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={openChange}>
      <DialogTrigger render={<Button variant="outline" size="sm" className="gap-1" />}>
        <Plus />
        요청 추가
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>요청 직접 추가</DialogTitle>
          <DialogDescription>
            영수증 요청을 직접 입력하면 결재 대기 목록에 바로 올라갑니다.
          </DialogDescription>
        </DialogHeader>

        <form id="add-request-form" onSubmit={submit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="new-employee" label="신청자" icon={<User className="size-4" />}>
              <Input
                id="new-employee"
                value={draft.employee}
                onChange={(e) => update("employee", e.target.value)}
                placeholder="김서연"
              />
            </Field>
            <Field id="new-merchant" label="가맹점" icon={<Store className="size-4" />}>
              <Input
                id="new-merchant"
                value={draft.merchant}
                onChange={(e) => update("merchant", e.target.value)}
                placeholder="블루보틀 삼청"
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field id="new-category" label="분류" icon={<Layers className="size-4" />}>
              <Input
                id="new-category"
                list="new-category-options"
                value={draft.category}
                onChange={(e) => update("category", e.target.value)}
                placeholder="식비"
              />
              <datalist id="new-category-options">
                {categoryOptions.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </Field>
            <Field id="new-date" label="사용일자" icon={<Calendar className="size-4" />}>
              <Input
                id="new-date"
                type="date"
                value={draft.date}
                onChange={(e) => update("date", e.target.value)}
              />
            </Field>
            <Field id="new-amount" label="금액 (원)" icon={<Wallet2 className="size-4" />}>
              <Input
                id="new-amount"
                inputMode="numeric"
                value={draft.amount}
                onChange={(e) => update("amount", e.target.value)}
                placeholder="0"
              />
            </Field>
          </div>

          <Field id="new-item" label="품목명" icon={<Tag className="size-4" />}>
            <Input
              id="new-item"
              value={draft.item}
              onChange={(e) => update("item", e.target.value)}
              placeholder="팀 오프사이트 커피"
            />
          </Field>

          <Field id="new-purpose" label="사용 목적" icon={<FileText className="size-4" />}>
            <Textarea
              id="new-purpose"
              rows={2}
              value={draft.purpose}
              onChange={(e) => update("purpose", e.target.value)}
              placeholder="에이콘 계정팀과 진행한 고객 온보딩 킥오프 미팅."
              className="resize-none"
            />
          </Field>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">AI 위험 분석</Label>
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
          <DialogClose render={<Button variant="outline" />}>취소</DialogClose>
          <Button type="submit" form="add-request-form" className="gap-1">
            <Plus className="size-4" />
            대기 목록에 추가
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
            <span className="hidden sm:inline">승인</span>
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onDecide(req.id, "rejected")}
            className="gap-1 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            <X className="size-4" />
            <span className="hidden sm:inline">반려</span>
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
