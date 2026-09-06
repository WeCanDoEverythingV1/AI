"use client"

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react"
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
import { currency, formatApiDate, initialsOf } from "@/lib/mock-data"
import {
  approveRequest,
  createApprovalRequest,
  isAbort,
  listApprovalRequests,
  messageFor,
  rejectRequest,
} from "@/lib/api/endpoints"
import { parseServerTimestamp } from "@/lib/api/client"
import { ComplianceBadge, resolveVerdict } from "@/components/compliance"
import { ApprovalStatusBadge } from "@/components/status-badge"
import { useHiddenRequests } from "@/hooks/use-hidden-requests"
import { categoryLabels, expenseCategories } from "@/lib/policy"
import type {
  ApprovalRequestCreateDto,
  ApprovalRequestResponseDto,
  ApprovalStatus,
  ExpenseCategory,
} from "@/types/api"
import {
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  FileText,
  Layers,
  Loader2,
  Plus,
  RefreshCw,
  Store,
  Tag,
  Trash2,
  TriangleAlert,
  User,
  Wallet2,
  X,
  XCircle,
} from "lucide-react"

/** Which bucket the table below the stat cards is showing. */
type View = ApprovalStatus

const viewOrder: View[] = ["PENDING", "APPROVED", "REJECTED"]

const viewMeta: Record<
  View,
  { label: string; emptyTitle: string; emptyHint: string; emptyIcon: React.ReactNode }
> = {
  PENDING: {
    label: "검토 대기",
    emptyTitle: "모두 처리했습니다",
    emptyHint: "대기 중인 요청이 없습니다.",
    emptyIcon: <CheckCircle2 className="size-6 text-success" />,
  },
  APPROVED: {
    label: "승인한 요청",
    emptyTitle: "승인한 요청이 없습니다",
    emptyHint: "승인 버튼을 누르면 여기에 모입니다.",
    emptyIcon: <CheckCircle2 className="size-6 text-muted-foreground" />,
  },
  REJECTED: {
    label: "반려한 요청",
    emptyTitle: "반려한 요청이 없습니다",
    emptyHint: "반려 버튼을 누르면 여기에 모입니다.",
    emptyIcon: <XCircle className="size-6 text-muted-foreground" />,
  },
}

const sumOf = (list: ApprovalRequestResponseDto[]) =>
  list.reduce((sum, r) => sum + r.amount, 0)

export function ApproverDashboard() {
  const [requests, setRequests] = useState<ApprovalRequestResponseDto[]>([])
  const [view, setView] = useState<View>("PENDING")
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  /** Ids with a PATCH in flight, so only that row shows a spinner. */
  const [deciding, setDeciding] = useState<Record<number, boolean>>({})
  const [actionError, setActionError] = useState<string | null>(null)

  /** Rows this approver cleared from their own view; no server delete exists. */
  const hidden = useHiddenRequests("approver")

  const loadRef = useRef<AbortController | null>(null)

  const load = useCallback(async () => {
    loadRef.current?.abort()
    const controller = new AbortController()
    loadRef.current = controller

    setLoading(true)
    setLoadError(null)

    try {
      const data = await listApprovalRequests({ signal: controller.signal })
      if (controller.signal.aborted) return
      setRequests(data)
    } catch (error) {
      if (controller.signal.aborted || isAbort(error)) return
      setLoadError(messageFor(error, "결재 요청을 불러오지 못했습니다."))
    } finally {
      if (loadRef.current === controller) {
        loadRef.current = null
        setLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    void load()
    return () => loadRef.current?.abort()
  }, [load])

  const buckets = useMemo(() => {
    // Newest first within each bucket. Hidden rows leave the counts too, so the
    // stat cards never disagree with the list under them.
    const sorted = [...requests].filter((r) => !hidden.hidden.has(r.id)).sort(
      (a, b) =>
        parseServerTimestamp(b.createdAt).getTime() -
        parseServerTimestamp(a.createdAt).getTime(),
    )
    return {
      PENDING: sorted.filter((r) => r.status === "PENDING"),
      APPROVED: sorted.filter((r) => r.status === "APPROVED"),
      REJECTED: sorted.filter((r) => r.status === "REJECTED"),
    }
  }, [requests, hidden.hidden])

  const visible = buckets[view]
  const meta = viewMeta[view]

  const decide = async (id: number, next: Exclude<ApprovalStatus, "PENDING">) => {
    setDeciding((prev) => ({ ...prev, [id]: true }))
    setActionError(null)
    try {
      const updated =
        next === "APPROVED" ? await approveRequest(id) : await rejectRequest(id)
      setRequests((prev) => prev.map((r) => (r.id === updated.id ? updated : r)))
    } catch (error) {
      setActionError(messageFor(error, "결재 처리에 실패했습니다."))
    } finally {
      setDeciding((prev) => {
        const rest = { ...prev }
        delete rest[id]
        return rest
      })
    }
  }

  const addRequest = (created: ApprovalRequestResponseDto) => {
    setRequests((prev) => [created, ...prev])
    // A new request is always PENDING, so show it even from a history tab.
    setView("PENDING")
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-balance">결재 요청</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            팀원이 올린 AI 초안 영수증 요청을 검토하고, 처리한 내역을 확인하세요.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void load()}
            disabled={loading}
            className="gap-1.5 text-muted-foreground"
          >
            <RefreshCw className={cn("size-4", loading && "animate-spin")} />
            <span className="hidden sm:inline">새로고침</span>
          </Button>
          <AddRequestDialog onAdd={addRequest} />
        </div>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        {viewOrder.map((status) => (
          <StatCard
            key={status}
            icon={statCardIcons[status]}
            label={statCardLabels[status]}
            value={`${buckets[status].length}건`}
            sub={`합계 ${currency(sumOf(buckets[status]))}`}
            active={view === status}
            onClick={() => setView(status)}
          />
        ))}
      </div>

      {actionError && (
        <div
          role="alert"
          className="mb-4 flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/10 p-3"
        >
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-destructive" />
          <p className="text-xs leading-relaxed text-destructive">{actionError}</p>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <p className="text-sm font-medium text-foreground">{meta.label}</p>
          <p className="text-xs tabular-nums text-muted-foreground">{visible.length}건</p>
        </div>

        {loading && requests.length === 0 ? (
          <StatePanel
            icon={<Loader2 className="size-6 animate-spin text-primary" />}
            title="결재 요청을 불러오는 중…"
            hint="서버가 절전 상태였다면 조금 더 걸릴 수 있습니다."
          />
        ) : loadError ? (
          <StatePanel
            icon={<TriangleAlert className="size-6 text-destructive" />}
            title="목록을 불러오지 못했습니다"
            hint={loadError}
            action={
              <Button variant="outline" size="sm" onClick={() => void load()} className="gap-1.5">
                <RefreshCw className="size-3.5" />
                다시 시도
              </Button>
            }
          />
        ) : visible.length === 0 ? (
          <StatePanel icon={meta.emptyIcon} title={meta.emptyTitle} hint={meta.emptyHint} />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-5">신청자</TableHead>
                <TableHead>가맹점</TableHead>
                <TableHead className="hidden lg:table-cell">사용 내역</TableHead>
                <TableHead>정책 검토</TableHead>
                <TableHead className="hidden sm:table-cell">사용일자</TableHead>
                <TableHead className="text-right">금액</TableHead>
                <TableHead className="pr-5 text-right">
                  {view === "PENDING" ? "결재" : "처리 결과"}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((req) => (
                <Row
                  key={req.id}
                  req={req}
                  busy={Boolean(deciding[req.id])}
                  onDecide={decide}
                  onHide={hidden.hide}
                />
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </main>
  )
}

const statCardLabels: Record<View, string> = {
  PENDING: "검토 대기",
  APPROVED: "승인",
  REJECTED: "반려",
}

const statCardIcons: Record<View, React.ReactNode> = {
  PENDING: <Clock className="size-4" />,
  APPROVED: <CheckCircle2 className="size-4 text-success" />,
  REJECTED: <XCircle className="size-4 text-destructive" />,
}

function StatePanel({
  icon,
  title,
  hint,
  action,
}: {
  icon: React.ReactNode
  title: string
  hint: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-muted">
        {icon}
      </div>
      <p className="mt-4 text-sm font-medium text-foreground">{title}</p>
      <p className="mt-1 max-w-sm text-xs text-muted-foreground">{hint}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

/* ------------------------------------------------------------------ *
 * Manual entry
 * ------------------------------------------------------------------ */

type NewRequestDraft = {
  employeeName: string
  merchant: string
  expenseCategory: ExpenseCategory
  date: string
  amount: string
  itemName: string
  purpose: string
}

const emptyDraft: NewRequestDraft = {
  employeeName: "",
  merchant: "",
  expenseCategory: "MEALS",
  date: "",
  amount: "",
  itemName: "",
  purpose: "",
}

function AddRequestDialog({
  onAdd,
}: {
  onAdd: (created: ApprovalRequestResponseDto) => void
}) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<NewRequestDraft>(emptyDraft)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const update = <K extends keyof NewRequestDraft>(key: K, value: NewRequestDraft[K]) =>
    setDraft((prev) => ({ ...prev, [key]: value }))

  const openChange = (next: boolean) => {
    if (saving) return
    setOpen(next)
    if (!next) {
      setDraft(emptyDraft)
      setError(null)
    }
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()

    // The server requires every field, so catch it here rather than round-tripping.
    if (!draft.employeeName.trim() || !draft.merchant.trim()) {
      setError("신청자와 가맹점은 필수 항목입니다.")
      return
    }
    if (!draft.date) {
      setError("사용일자를 선택해 주세요.")
      return
    }
    const amount = Number.parseFloat(draft.amount.replace(/[^0-9.]/g, ""))
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("0보다 큰 금액을 입력해 주세요.")
      return
    }

    const body: ApprovalRequestCreateDto = {
      employeeName: draft.employeeName.trim(),
      merchant: draft.merchant.trim(),
      date: draft.date,
      amount,
      itemName: draft.itemName.trim() || draft.merchant.trim(),
      purpose: draft.purpose.trim() || "결재자가 직접 추가한 요청입니다.",
      expenseCategory: draft.expenseCategory,
    }

    setSaving(true)
    setError(null)
    try {
      onAdd(await createApprovalRequest(body))
      setDraft(emptyDraft)
      setOpen(false)
    } catch (caught) {
      setError(messageFor(caught, "요청을 등록하지 못했습니다."))
    } finally {
      setSaving(false)
    }
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
                value={draft.employeeName}
                onChange={(e) => update("employeeName", e.target.value)}
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
              <select
                id="new-category"
                value={draft.expenseCategory}
                onChange={(e) =>
                  update("expenseCategory", e.target.value as ExpenseCategory)
                }
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {expenseCategories.map((c) => (
                  <option key={c} value={c}>
                    {categoryLabels[c]}
                  </option>
                ))}
              </select>
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
              value={draft.itemName}
              onChange={(e) => update("itemName", e.target.value)}
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

          <p className="text-xs leading-relaxed text-muted-foreground">
            등록하면 서버가 사내 규정 기준으로 판정하고, 결과가 목록에 표시됩니다.
          </p>

          {error && <p className="text-xs text-destructive">{error}</p>}
        </form>

        <DialogFooter>
          <DialogClose render={<Button variant="outline" disabled={saving} />}>
            취소
          </DialogClose>
          <Button type="submit" form="add-request-form" disabled={saving} className="gap-1">
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            {saving ? "등록 중…" : "대기 목록에 추가"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/* ------------------------------------------------------------------ *
 * Table row
 * ------------------------------------------------------------------ */

function Row({
  req,
  busy,
  onDecide,
  onHide,
}: {
  req: ApprovalRequestResponseDto
  busy: boolean
  onDecide: (id: number, next: Exclude<ApprovalStatus, "PENDING">) => void
  onHide: (id: number) => void
}) {
  return (
    <TableRow>
      <TableCell className="pl-5">
        <div className="flex items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
            {initialsOf(req.employeeName)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">
              {req.employeeName}
            </p>
            <p className="text-xs text-muted-foreground">REQ-{req.id}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">{req.merchant}</p>
          <Badge variant="secondary" className="mt-0.5 font-normal">
            {categoryLabels[req.expenseCategory]}
          </Badge>
        </div>
      </TableCell>
      <TableCell className="hidden max-w-56 lg:table-cell">
        <p className="truncate text-sm text-muted-foreground" title={req.purpose}>
          {req.itemName}
        </p>
        <p className="truncate text-xs text-muted-foreground/70" title={req.purpose}>
          {req.purpose}
        </p>
      </TableCell>
      <TableCell>
        <ComplianceBadge verdict={resolveVerdict(req)} />
      </TableCell>
      <TableCell className="hidden whitespace-nowrap text-sm text-muted-foreground sm:table-cell">
        {formatApiDate(req.date)}
      </TableCell>
      <TableCell className="whitespace-nowrap text-right text-sm font-semibold tabular-nums text-foreground">
        {currency(req.amount)}
      </TableCell>
      <TableCell className="pr-5">
        {req.status === "PENDING" ? (
          <div className="flex items-center justify-end gap-2">
            <Button
              size="sm"
              disabled={busy}
              onClick={() => onDecide(req.id, "APPROVED")}
              className="gap-1 bg-success text-success-foreground hover:bg-success/90"
            >
              {busy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Check className="size-4" />
              )}
              <span className="hidden sm:inline">승인</span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => onDecide(req.id, "REJECTED")}
              className="gap-1 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <X className="size-4" />
              <span className="hidden sm:inline">반려</span>
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-end gap-1">
            <div className="text-right">
              <ApprovalStatusBadge status={req.status} />
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {formatCreatedAt(req.createdAt)} 접수
              </p>
            </div>
            {/* Hides the row for this approver only — there is no server delete. */}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onHide(req.id)}
              aria-label={`REQ-${req.id} 목록에서 숨기기`}
              title="이 목록에서 숨기기 (서버에서 삭제되지는 않습니다)"
              className="shrink-0 text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        )}
      </TableCell>
    </TableRow>
  )
}

function formatCreatedAt(value: string) {
  const date = parseServerTimestamp(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString("ko-KR", {
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

/* ------------------------------------------------------------------ *
 * Badges
 * ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ *
 * Stat cards — also the filter control for the list below
 * ------------------------------------------------------------------ */

function StatCard({
  icon,
  label,
  value,
  sub,
  active,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  value: string
  sub?: string
  active?: boolean
  onClick?: () => void
}) {
  const body = (
    <>
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-foreground">
        {value}
      </p>
      {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
    </>
  )

  const shell = cn(
    "rounded-xl border p-4 text-left shadow-sm transition-colors",
    active ? "border-primary/50 bg-accent" : "border-border bg-card",
  )

  if (!onClick) return <div className={shell}>{body}</div>

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        shell,
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        !active && "hover:border-primary/30 hover:bg-accent/40",
      )}
    >
      {body}
    </button>
  )
}
