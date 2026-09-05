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

const severityLabels: Record<string, string> = {
  high: "높음",
  medium: "보통",
  low: "낮음",
}

/** Won amounts run to seven digits, so the axis reads in 만 원 units. */
const compactWon = (value: number) => `${Math.round(value / 10000).toLocaleString("ko-KR")}만`

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
        <h1 className="text-2xl font-semibold tracking-tight text-balance">지출 인사이트</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          회사 전체에서 쓰이지 않거나 낭비되는 SaaS 구독료를 찾아냅니다.
        </p>
      </div>

      {/* Magic button banner */}
      <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-accent to-card p-6 shadow-sm sm:p-8">
        <div className="relative z-10 flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-md">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-card px-2.5 py-1 text-[11px] font-medium text-primary">
              <Sparkles className="size-3" />
              AI 지출 분석기
            </div>
            <h2 className="mt-3 text-lg font-semibold tracking-tight text-foreground">
              낭비되는 구독료 찾기
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              분석을 실행하면 미사용 좌석, 중복 도구, 해지 대상을 한 번에 찾아 줍니다.
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
                지출 분석 중…
              </>
            ) : (
              <>
                <Wand2 className="size-4" />
                {stage === "revealed" ? "다시 분석하기" : "AI 분석 실행"}
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
                월 예상 낭비액
              </div>
              <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight text-foreground">
                {currency(totalWaste)}
              </p>
              <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                <TrendingDown className="size-3.5 text-success" />
                연간 {currency(totalWaste * 12)} 절감 가능
              </p>
            </div>

            <div className="rounded-xl border border-border bg-card p-4 shadow-sm sm:col-span-2">
              <p className="mb-1 text-xs font-medium text-muted-foreground">
                구독별 월 낭비액
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
                      tickFormatter={compactWon}
                    />
                    <Tooltip
                      cursor={{ fill: "var(--muted)" }}
                      contentStyle={{
                        borderRadius: 10,
                        border: "1px solid var(--border)",
                        background: "var(--card)",
                        fontSize: 12,
                      }}
                      formatter={(v) => [currency(Number(v)), "월 낭비액"]}
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
            추천 조치 ({wastedSubscriptions.length}건)
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
                          className={cn("font-medium", severityStyles[sub.severity])}
                        >
                          {severityLabels[sub.severity]}
                        </Badge>
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        좌석 {sub.activeSeats}/{sub.seats} 사용 중 · 마지막 사용{" "}
                        {sub.lastUsed}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-4 sm:justify-end">
                    <div className="flex items-center gap-1.5 rounded-lg bg-destructive/5 px-2.5 py-1.5 text-sm font-semibold tabular-nums text-destructive">
                      <ArrowDownRight className="size-4" />월 {currency(waste)}
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
          <p className="mt-4 text-sm font-medium text-foreground">아직 분석 결과가 없습니다</p>
          <p className="mt-1 max-w-xs text-xs text-muted-foreground">
            위의 버튼을 눌러 낭비되는 구독료와 절감 방안을 확인하세요.
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
  const fullText = email ? `제목: ${email.subject}\n\n${email.body}` : ""

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
            AI가 작성한 공급사 메일
          </div>
          <DialogTitle className="text-base">
            {sub?.action === "cancel" ? "해지 요청" : "플랜 축소 요청"} · {sub?.name}
          </DialogTitle>
          <DialogDescription>
            초안을 확인한 뒤 복사해서 메일로 보내세요.
          </DialogDescription>
        </DialogHeader>

        {email && (
          <div className="max-h-[50vh] overflow-y-auto p-5">
            <div className="rounded-lg border border-border bg-secondary/50 p-4">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                제목
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
          <p className="text-xs text-muted-foreground">바로 AI가 작성 · 수정 가능</p>
          <Button onClick={copy} className="gap-1.5">
            {copied ? (
              <>
                <Check className="size-4" />
                복사됨
              </>
            ) : (
              <>
                <Copy className="size-4" />
                초안 복사
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
