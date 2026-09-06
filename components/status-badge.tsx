import { cn } from "@/lib/utils"
import { statusLabels } from "@/lib/policy"
import type { ApprovalStatus } from "@/types/api"
import { Check, Clock, X } from "lucide-react"

/** Where an approval request stands. Shared by the approver table and 내 결재 현황. */

const styles: Record<ApprovalStatus, { wrap: string; icon: React.ReactNode }> = {
  PENDING: {
    wrap: "border-border bg-muted text-muted-foreground",
    icon: <Clock className="size-3.5" />,
  },
  APPROVED: {
    wrap: "border-success/30 bg-success/10 text-success",
    icon: <Check className="size-3.5" />,
  },
  REJECTED: {
    wrap: "border-destructive/30 bg-destructive/10 text-destructive",
    icon: <X className="size-3.5" />,
  },
}

export function ApprovalStatusBadge({ status }: { status: ApprovalStatus }) {
  const style = styles[status]
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-medium",
        style.wrap,
      )}
    >
      {style.icon}
      {statusLabels[status]}
    </span>
  )
}
