"use client"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { currency } from "@/lib/mock-data"
import type { DecisionNotice } from "@/hooks/use-decision-notices"
import { Check, X, XCircle } from "lucide-react"

/**
 * Decision toasts for the employee.
 *
 * They stay until dismissed rather than auto-hiding: a rejection is something to
 * act on, and a notice that vanishes while you are reading the form is worse
 * than none. Only the newest few are stacked so the screen stays usable.
 */

const MAX_VISIBLE = 3

const styles = {
  APPROVED: {
    label: "승인되었습니다",
    wrap: "border-success/40 bg-success/10",
    accent: "text-success",
    icon: <Check className="size-4" />,
  },
  REJECTED: {
    label: "반려되었습니다",
    wrap: "border-destructive/40 bg-destructive/10",
    accent: "text-destructive",
    icon: <XCircle className="size-4" />,
  },
} as const

export function DecisionNotices({
  notices,
  onDismiss,
}: {
  notices: DecisionNotice[]
  onDismiss: (id: number) => void
}) {
  const visible = notices.slice(0, MAX_VISIBLE)
  if (visible.length === 0) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex flex-col gap-2 sm:inset-x-auto sm:right-6 sm:w-80"
    >
      {visible.map((notice) => {
        const style = styles[notice.status]
        return (
          <div
            key={notice.id}
            className={cn(
              "pointer-events-auto flex items-start gap-2.5 rounded-xl border bg-card p-3.5 shadow-lg animate-in fade-in slide-in-from-bottom-2",
              style.wrap,
            )}
          >
            <span className={cn("mt-0.5 shrink-0", style.accent)}>{style.icon}</span>

            <div className="min-w-0 flex-1">
              <p className={cn("text-sm font-semibold", style.accent)}>
                결재 요청이 {style.label}
              </p>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {notice.merchant} · {currency(notice.amount)}
              </p>
              <p className="mt-0.5 font-mono text-[11px] text-muted-foreground/70">
                REQ-{notice.id}
              </p>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDismiss(notice.id)}
              aria-label="알림 닫기"
              className="-mr-1 -mt-1 shrink-0 text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" />
            </Button>
          </div>
        )
      })}

      {notices.length > MAX_VISIBLE && (
        <p className="pointer-events-auto rounded-lg bg-muted px-3 py-1.5 text-center text-[11px] text-muted-foreground">
          외 {notices.length - MAX_VISIBLE}건 더
        </p>
      )}
    </div>
  )
}
