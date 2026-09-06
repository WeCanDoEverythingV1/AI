import { cn } from "@/lib/utils"
import type { RiskAnalysisDto } from "@/types/api"
import type { CitedClause, ComplianceLevel } from "@/types/policy"
import { HelpCircle, ShieldCheck, Sparkles, TriangleAlert, XCircle } from "lucide-react"

/**
 * Shared rendering for the server's verdict on an expense.
 *
 * The backend returns two independent signals and either can be absent:
 *
 * - `complianceLevel` / `complianceSummary` / `citedClauses` — judged against the
 *   activated 복무규정 ruleset. Authoritative, and can quote the clause it used.
 *   Null on records created before a ruleset was active.
 * - `risk` — the AI's own heuristic read (`주의: 주말 지출`, `위험: 예산 초과`).
 *   Present far more often, but cites nothing.
 *
 * Prefer the policy verdict, fall back to the risk read, and say "판정 없음" only
 * when neither exists. The frontend never computes a verdict itself.
 */

const styles: Record<ComplianceLevel, { label: string; wrap: string; icon: React.ReactNode }> = {
  COMPLIANT: {
    label: "규정 준수",
    wrap: "border-success/30 bg-success/10 text-success",
    icon: <ShieldCheck className="size-3.5" />,
  },
  WARNING: {
    label: "주의",
    wrap: "border-warning/45 bg-warning/15 text-warning-foreground",
    icon: <TriangleAlert className="size-3.5" />,
  },
  VIOLATION: {
    label: "규정 위반",
    wrap: "border-destructive/30 bg-destructive/10 text-destructive",
    icon: <XCircle className="size-3.5" />,
  },
}

const unjudged = {
  label: "판정 없음",
  wrap: "border-border bg-muted text-muted-foreground",
  icon: <HelpCircle className="size-3.5" />,
}

/** `RiskAnalysisDto` says `HIGH` where `ComplianceLevel` says `VIOLATION`. */
const riskToCompliance = (level: RiskAnalysisDto["level"]): ComplianceLevel =>
  level === "HIGH" ? "VIOLATION" : level

export type Verdict = {
  level: ComplianceLevel | null
  /** Badge text — the risk read brings its own wording, e.g. `주의: 주말 지출`. */
  label: string
  summary?: string | null
  clauses?: CitedClause[] | null
  rulesetVersion?: number | null
  source: "policy" | "risk" | "none"
}

/** Anything carrying the server's verdict: an approval request or a receipt scan. */
export type VerdictSource = {
  complianceLevel?: ComplianceLevel | null
  complianceSummary?: string | null
  citedClauses?: CitedClause[] | null
  rulesetVersion?: number | null
  risk?: RiskAnalysisDto | null
}

export function resolveVerdict(input: VerdictSource): Verdict {
  if (input.complianceLevel) {
    return {
      level: input.complianceLevel,
      label: styles[input.complianceLevel].label,
      summary: input.complianceSummary,
      clauses: input.citedClauses,
      rulesetVersion: input.rulesetVersion,
      source: "policy",
    }
  }

  if (input.risk?.level) {
    const level = riskToCompliance(input.risk.level)
    return {
      level,
      label: input.risk.label || styles[level].label,
      summary: input.risk.label,
      source: "risk",
    }
  }

  return { level: null, label: unjudged.label, source: "none" }
}

const styleFor = (level: ComplianceLevel | null) => (level ? styles[level] : unjudged)

/** Compact pill for tables. `summary` becomes the tooltip so rows stay scannable. */
export function ComplianceBadge({ verdict }: { verdict: Verdict }) {
  const style = styleFor(verdict.level)
  return (
    <span
      title={
        verdict.source === "none"
          ? "활성화된 규정이 없고 AI 위험 분석도 없는 요청입니다."
          : (verdict.summary ?? undefined)
      }
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-medium",
        style.wrap,
      )}
    >
      {style.icon}
      {verdict.label}
    </span>
  )
}

/** The clauses a policy verdict cites — the reason an approver can act on. */
export function CitedClauses({ clauses }: { clauses?: CitedClause[] | null }) {
  const list = (clauses ?? []).filter((c) => c.text || c.article)
  if (list.length === 0) return null

  return (
    <div className="space-y-2.5">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        근거 조항
      </p>
      {list.map((clause, i) => (
        <figure
          key={`${clause.article ?? "clause"}-${i}`}
          className="border-l-2 border-border pl-3"
        >
          {clause.text && (
            <blockquote className="text-xs leading-relaxed text-muted-foreground">
              {clause.text}
            </blockquote>
          )}
          {clause.article && (
            <figcaption className="mt-1 text-[11px] text-muted-foreground/70">
              {clause.article}
              {clause.page ? ` · ${clause.page}쪽` : ""}
            </figcaption>
          )}
        </figure>
      ))}
    </div>
  )
}

/** Full panel: verdict, what produced it, the reason, and the clauses behind it. */
export function CompliancePanel({
  verdict,
  footnote,
}: {
  verdict: Verdict
  footnote?: string
}) {
  const style = styleFor(verdict.level)

  return (
    <div className={cn("rounded-lg border p-3", style.wrap.replace(/text-\S+/g, ""))}>
      <div className="flex flex-wrap items-center gap-2">
        <ComplianceBadge verdict={{ ...verdict, summary: null }} />
        <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
          {verdict.source === "policy" ? (
            `규정 v${verdict.rulesetVersion ?? "?"} 기준`
          ) : verdict.source === "risk" ? (
            <>
              <Sparkles className="size-3 text-primary" />
              AI 위험 분석
            </>
          ) : null}
        </span>
      </div>

      {verdict.summary && verdict.summary !== verdict.label && (
        <p className="mt-2 text-xs leading-relaxed text-foreground">{verdict.summary}</p>
      )}

      {verdict.source === "none" && (
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          활성화된 사내 규정이 없어 자동 판정을 하지 않았습니다.
        </p>
      )}

      {verdict.source === "risk" && (
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          사내 규정 기준 판정이 아직 없어 AI 위험 분석 결과를 표시합니다. 규정집을
          등록하면 조항을 근거로 판정합니다.
        </p>
      )}

      <div className="mt-3">
        <CitedClauses clauses={verdict.clauses} />
      </div>

      <p className="mt-3 border-t border-border/60 pt-2 text-[11px] leading-relaxed text-muted-foreground/80">
        {footnote ?? "자동 판정은 참고용입니다. 최종 판단은 결재자가 합니다."}
      </p>
    </div>
  )
}
