"use client"

import type { Role } from "@/lib/mock-data"
import { ArrowRight, ReceiptText, ShieldCheck, Sparkles, UserRound } from "lucide-react"

export function UserSelection({ onSelect }: { onSelect: (role: Role) => void }) {
  return (
    <main className="relative flex min-h-svh flex-col items-center justify-center overflow-hidden px-6 py-16">
      {/* subtle grid backdrop */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 [background-image:linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] [background-size:44px_44px] opacity-40 [mask-image:radial-gradient(ellipse_60%_50%_at_50%_40%,black,transparent)]"
      />

      <div className="relative z-10 w-full max-w-md">
        <div className="mb-10 flex flex-col items-center text-center">
          <div className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm">
            <Sparkles className="size-3.5 text-primary" />
            AI-powered finance operations
          </div>
          <div className="mt-6 flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/25">
            <ReceiptText className="size-7" />
          </div>
          <h1 className="mt-5 text-3xl font-semibold tracking-tight text-balance">
            Welcome to Ledgerly
          </h1>
          <p className="mt-2 text-pretty text-sm leading-relaxed text-muted-foreground">
            Receipt approvals and SaaS spend, automated. Choose how you want to sign in.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <RoleButton
            icon={<UserRound className="size-5" />}
            title="Continue as Employee"
            description="Upload receipts and submit approval requests"
            onClick={() => onSelect("employee")}
          />
          <RoleButton
            icon={<ShieldCheck className="size-5" />}
            title="Continue as Approver"
            description="Review requests and monitor company spend"
            onClick={() => onSelect("approver")}
          />
        </div>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          Demo experience · No credentials required
        </p>
      </div>
    </main>
  )
}

function RoleButton({
  icon,
  title,
  description,
  onClick,
}: {
  icon: React.ReactNode
  title: string
  description: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex items-center gap-4 rounded-xl border border-border bg-card p-4 text-left shadow-sm transition-all hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-card-foreground">{title}</span>
        <span className="block truncate text-xs text-muted-foreground">{description}</span>
      </span>
      <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
    </button>
  )
}
