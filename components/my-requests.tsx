"use client"

import { Button } from "@/components/ui/button"
import { ComplianceBadge, resolveVerdict } from "@/components/compliance"
import { ApprovalStatusBadge } from "@/components/status-badge"
import { cn } from "@/lib/utils"
import { currency, formatApiDate } from "@/lib/mock-data"
import type { ApprovalRequestResponseDto } from "@/types/api"
import { FileText, Loader2, RefreshCw, Trash2, TriangleAlert } from "lucide-react"

/**
 * 내 결재 현황 — where a decision notice lands.
 *
 * Rows the employee has not acknowledged yet (still showing as a toast) are
 * highlighted, so dismissing the toast leaves something to come back to rather
 * than the decision vanishing.
 */
export function MyRequests({
  requests,
  loading,
  error,
  freshIds,
  onRefresh,
  onHide,
}: {
  requests: ApprovalRequestResponseDto[]
  loading: boolean
  error: string | null
  /** Ids with an undismissed decision notice. */
  freshIds: Set<number>
  onRefresh: () => void
  onHide: (id: number) => void
}) {
  const pending = requests.filter((r) => r.status === "PENDING").length

  return (
    <section aria-labelledby="my-requests-heading" className="mt-8">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-baseline gap-2">
          <h2 id="my-requests-heading" className="text-sm font-medium text-foreground">
            내 결재 현황
          </h2>
          {requests.length > 0 && (
            <span className="text-xs text-muted-foreground">
              {requests.length}건{pending > 0 ? ` · 대기 ${pending}건` : ""}
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onRefresh}
          disabled={loading}
          className="gap-1.5 text-muted-foreground"
        >
          <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
          <span className="hidden sm:inline">새로고침</span>
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        {loading && requests.length === 0 ? (
          <Empty
            icon={<Loader2 className="size-6 animate-spin text-primary" />}
            title="현황을 불러오는 중…"
          />
        ) : error && requests.length === 0 ? (
          <Empty
            icon={<TriangleAlert className="size-6 text-destructive" />}
            title="현황을 불러오지 못했습니다"
            hint={error}
          />
        ) : requests.length === 0 ? (
          <Empty
            icon={<FileText className="size-6 text-muted-foreground" />}
            title="아직 제출한 요청이 없습니다"
            hint="위에서 영수증을 올리면 여기에 표시됩니다."
          />
        ) : (
          <ul className="divide-y divide-border">
            {requests.map((req) => {
              const fresh = freshIds.has(req.id)
              return (
                <li
                  key={req.id}
                  className={cn(
                    "flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 transition-colors",
                    fresh && "bg-accent/50",
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium text-foreground">
                        {req.merchant}
                      </p>
                      {fresh && (
                        <span
                          aria-label="새 결과"
                          className="size-1.5 shrink-0 rounded-full bg-primary"
                        />
                      )}
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {formatApiDate(req.date)} · REQ-{req.id}
                      {req.itemName ? ` · ${req.itemName}` : ""}
                    </p>
                  </div>

                  <p className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
                    {currency(req.amount)}
                  </p>

                  <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
                    <ComplianceBadge verdict={resolveVerdict(req)} />
                    <ApprovalStatusBadge status={req.status} />
                    {/* Clears the row for this employee only — no server delete exists. */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onHide(req.id)}
                      aria-label={`REQ-${req.id} 목록에서 숨기기`}
                      title="이 목록에서 숨기기 (서버에서 삭제되지는 않습니다)"
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {error && requests.length > 0 && (
        <p className="mt-2 text-[11px] text-muted-foreground">
          {error} 마지막으로 불러온 내용을 표시하고 있습니다.
        </p>
      )}
    </section>
  )
}

function Empty({
  icon,
  title,
  hint,
}: {
  icon: React.ReactNode
  title: string
  hint?: string
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="flex size-11 items-center justify-center rounded-full bg-muted">
        {icon}
      </div>
      <p className="mt-3 text-sm font-medium text-foreground">{title}</p>
      {hint && <p className="mt-1 max-w-xs text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}
