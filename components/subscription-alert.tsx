"use client"

import { useState } from "react"
import { Bar, BarChart, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import {
  buildVendorEmail,
  currency,
  wastedSubscriptions,
  type WastedSubscription,
} from "@/lib/mock-data"
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  Check,
  Copy,
  Loader2,
  Sparkles,
  TrendingDown,
  Wand2,
} from "lucide-react"

type Stage = "idle" | "scanning" | "revealed"

const severityStyles: Record<string, string> = {
  high: "bg-destructive/10 text-destructive",
  medium: "bg-warning/15 text-warning-foreground",
  low: "bg-muted text-muted-foreground",
}

export function SubscriptionAlert() {
  const [stage, setStage] = useState<Stage>("idle")
  const [selected, setSelected] = useState<WastedSubscription | null>(null)

  const totalWaste = wastedSubscriptions.reduce((sum, s) => {
    const idle = s.seats - s.activeSeats
    return sum + (s.monthlyCost / s.seats) * idle
  }, 0)

  const chartData = wastedSubscriptions.map((s) => ({
    name: s.name.split(" ")[0],
    waste: Math.round((s.monthlyCost / s.seats) * (s.seats - s.activeSeats)),
    severity: s.severity,
  }))

  const runScan = () => {
    setStage("scanning")
    window.setTimeout(() => setStage("revealed"), 1600)
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-balance">Spend insights</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Detect unused or wasted SaaS subscription fees across the company.
        </p>
      </div>

      {/* Magic button banner */}
      <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-accent to-card p-6 shadow-sm sm:p-8">
        <div className="relative z-10 flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-md">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-card px-2.5 py-1 text-[11px] font-medium text-primary">
              <Sparkles className="size-3" />
              AI Spend Analyzer
            </div>
            <h2 className="mt-3 text-lg font-semibold tracking-tight text-foreground">
              Find wasted subscription spend
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Run the analyzer to surface idle seats, duplicate tools and cancellation
              opportunities.
            </p>
          </div>
          <Button
            size="lg"
            onClick={runScan}
            disabled={stage === "scanning"}
            className="gap-2 shadow-lg shadow-primary/25"
          >
            {stage === "scanning" ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Analyzing spend…
              </>
            ) : (
              <>
                <Wand2 className="size-4" />
                {stage === "revealed" ? "Re-run analysis" : "Run Magic Analysis"}
              </>
            )}
          </Button>
        </div>
        <Wand2
          aria-hidden="true"
          className="pointer-events-none absolute -right-6 -top-6 size-40 rotate-12 text-primary/5"
        />
      </div>

      {/* Results */}
      {stage === "revealed" && (
        <div className="mt-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="mb-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 sm:col-span-1">
              <div className="flex items-center gap-2 text-xs font-medium text-destructive">
                <AlertTriangle className="size-4" />
                Estimated monthly waste
              </div>
              <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight text-foreground">
                {currency(totalWaste)}
              </p>
              <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                <TrendingDown className="size-3.5 text-success" />
                {currency(totalWaste * 12)} annualized savings potential
              </p>
            </div>

            <div className="rounded-xl border border-border bg-card p-4 shadow-sm sm:col-span-2">
              <p className="mb-1 text-xs font-medium text-muted-foreground">
                Waste by subscription (monthly)
              </p>
              <div className="h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                    <XAxis
                      dataKey="name"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                      tickFormatter={(v) => `$${v}`}
                    />
                    <Tooltip
                      cursor={{ fill: "var(--muted)" }}
                      contentStyle={{
                        borderRadius: 10,
                        border: "1px solid var(--border)",
                        background: "var(--card)",
                        fontSize: 12,
                      }}
                      formatter={(v: number) => [currency(v), "Monthly waste"]}
                    />
                    <Bar dataKey="waste" radius={[6, 6, 0, 0]}>
                      {chartData.map((entry) => (
                        <Cell
                          key={entry.name}
                          fill={
                            entry.severity === "high"
                              ? "var(--destructive)"
                              : entry.severity === "medium"
                                ? "var(--warning)"
                                : "var(--chart-5)"
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <h3 className="mb-3 text-sm font-medium text-foreground">
            Recommendations ({wastedSubscriptions.length})
          </h3>
          <ul className="space-y-2.5">
            {wastedSubscriptions.map((sub) => {
              const idle = sub.seats - sub.activeSeats
              const waste = Math.round((sub.monthlyCost / sub.seats) * idle)
              return (
                <li
                  key={sub.id}
                  className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-sm sm:flex-row sm:items-center"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-xs font-semibold text-secondary-foreground">
                      {sub.name.slice(0, 2)}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium text-foreground">
                          {sub.name}
                        </p>
                        <Badge
                          className={cn(
                            "font-medium capitalize",
                            severityStyles[sub.severity],
                          )}
                        >
                          {sub.severity}
                        </Badge>
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {sub.activeSeats}/{sub.seats} seats active · last used {sub.lastUsed}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-4 sm:justify-end">
                    <div className="flex items-center gap-1.5 rounded-lg bg-destructive/5 px-2.5 py-1.5 text-sm font-semibold tabular-nums text-destructive">
                      <ArrowDownRight className="size-4" />
                      {currency(waste)}/mo
                    </div>
                    <Button
                      variant={sub.action === "cancel" ? "outline" : "secondary"}
                      size="sm"
                      onClick={() => setSelected(sub)}
                      className={cn(
                        "shrink-0 gap-1.5",
                        sub.action === "cancel" &&
                          "border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive",
                      )}
                    >
                      {sub.actionLabel}
                      <ArrowRight className="size-3.5" />
                    </Button>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {stage === "idle" && (
        <div className="mt-6 flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 py-16 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-accent">
            <Wand2 className="size-6 text-primary" />
          </div>
          <p className="mt-4 text-sm font-medium text-foreground">No analysis yet</p>
          <p className="mt-1 max-w-xs text-xs text-muted-foreground">
            Hit the magic button above to reveal wasted subscription costs and savings
            recommendations.
          </p>
        </div>
      )}

      <EmailDraftDialog
        sub={selected}
        onOpenChange={(open) => !open && setSelected(null)}
      />
    </main>
  )
}

function EmailDraftDialog({
  sub,
  onOpenChange,
}: {
  sub: WastedSubscription | null
  onOpenChange: (open: boolean) => void
}) {
  const [copied, setCopied] = useState(false)

  const email = sub ? buildVendorEmail(sub) : null
  const fullText = email ? `Subject: ${email.subject}\n\n${email.body}` : ""

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(fullText)
    } catch {
      // Clipboard may be unavailable; still surface the confirmation.
    }
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Dialog
      open={sub !== null}
      onOpenChange={(open) => {
        if (!open) setCopied(false)
        onOpenChange(open)
      }}
    >
      <DialogContent className="max-h-[90vh] gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="space-y-2 border-b border-border p-5">
          <div className="inline-flex w-fit items-center gap-1.5 rounded-full border border-primary/20 bg-accent px-2.5 py-1 text-[11px] font-medium text-primary">
            <Sparkles className="size-3" />
            AI-drafted vendor email
          </div>
          <DialogTitle className="text-base">
            {sub?.action === "cancel" ? "Cancellation request" : "Plan downgrade request"} ·{" "}
            {sub?.name}
          </DialogTitle>
          <DialogDescription>
            Review the draft below, then copy it to send from your email client.
          </DialogDescription>
        </DialogHeader>

        {email && (
          <div className="max-h-[50vh] overflow-y-auto p-5">
            <div className="rounded-lg border border-border bg-secondary/50 p-4">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Subject
              </p>
              <p className="mt-0.5 text-sm font-medium text-foreground">{email.subject}</p>
              <div className="my-3 h-px bg-border" />
              <p className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-foreground">
                {email.body}
              </p>
            </div>
          </div>
        )}

        <DialogFooter className="flex-row items-center justify-between gap-3 border-t border-border p-5">
          <p className="text-xs text-muted-foreground">Generated by Ledgerly AI · editable</p>
          <Button onClick={copy} className="gap-1.5">
            {copied ? (
              <>
                <Check className="size-4" />
                Copied
              </>
            ) : (
              <>
                <Copy className="size-4" />
                Copy Draft
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
