"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { currency } from "@/lib/mock-data"
import { categoryLabels, expenseCategories } from "@/lib/policy"
import type { ExpenseCategory } from "@/types/api"
import type { PolicyRule, RuleScope, RuleSeverity } from "@/types/policy"
import { Sparkles, Trash2, TriangleAlert } from "lucide-react"

/**
 * Threshold for raising the "확인 필요" flag. Used internally only — the score
 * itself is never shown; see `ReviewFlag` for why.
 */
export const LOW_CONFIDENCE = 0.8

const scopeLabels: Record<RuleScope, string> = {
  PER_PERSON: "1인당",
  PER_RECEIPT: "건당",
  PER_MONTH: "월별",
  PER_TRIP: "출장당",
}

const scopes = Object.keys(scopeLabels) as RuleScope[]

const severityLabels: Record<RuleSeverity, string> = {
  WARNING: "주의",
  VIOLATION: "위반",
}

const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"

export function PolicyRuleEditor({
  rules,
  readOnly,
  onChange,
}: {
  rules: PolicyRule[]
  readOnly?: boolean
  onChange?: (rules: PolicyRule[]) => void
}) {
  const update = (id: string, patch: Partial<PolicyRule>) =>
    onChange?.(rules.map((r) => (r.id === id ? { ...r, ...patch } : r)))

  const remove = (id: string) => onChange?.(rules.filter((r) => r.id !== id))

  if (rules.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
        추출된 규칙이 없습니다.
      </p>
    )
  }

  return (
    <ul className="space-y-3">
      {rules.map((rule) => {
        // A missing confidence is not a vote of confidence — flag it for review.
        const uncertain = (rule.confidence ?? 0) < LOW_CONFIDENCE
        const evidence = rule.requiredEvidence ?? []
        const prohibitions = rule.prohibitions ?? []
        return (
          <li
            key={rule.id}
            className={cn(
              "rounded-xl border bg-card p-4 shadow-sm",
              uncertain ? "border-warning/50" : "border-border",
            )}
          >
            <div className="mb-3 flex flex-wrap items-center gap-2">
              {rule.clauseArticle && (
                <Badge variant="secondary" className="font-normal">
                  {rule.clauseArticle}
                </Badge>
              )}
              {/*
                Title is the verbatim clause, never `note`: the server copies the
                clause in the document's own language but writes `note` in
                English, so leading with `note` puts English on a Korean screen.
                The note still shows below, marked as AI commentary.
              */}
              <p className="min-w-0 flex-1 text-sm font-medium text-foreground">
                {rule.clauseText}
              </p>
              {uncertain && <ReviewFlag />}
              {!readOnly && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => remove(rule.id)}
                  aria-label="규칙 삭제"
                  className="shrink-0 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              )}
            </div>

            {uncertain && (
              <p className="mb-3 flex items-start gap-1.5 text-xs text-warning-foreground">
                <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
                AI가 이 조항을 정확히 읽었는지 확실하지 않습니다. 아래 원문과 대조해
                확인해 주세요.
              </p>
            )}

            <div className="grid gap-3 sm:grid-cols-4">
              <FieldRow id={`${rule.id}-category`} label="분류">
                <select
                  id={`${rule.id}-category`}
                  className={selectClass}
                  disabled={readOnly}
                  value={rule.expenseCategory}
                  onChange={(e) =>
                    update(rule.id, { expenseCategory: e.target.value as ExpenseCategory })
                  }
                >
                  {expenseCategories.map((c) => (
                    <option key={c} value={c}>
                      {categoryLabels[c]}
                    </option>
                  ))}
                </select>
              </FieldRow>

              <FieldRow id={`${rule.id}-scope`} label="기준">
                <select
                  id={`${rule.id}-scope`}
                  className={selectClass}
                  disabled={readOnly}
                  value={rule.scope}
                  onChange={(e) => update(rule.id, { scope: e.target.value as RuleScope })}
                >
                  {scopes.map((s) => (
                    <option key={s} value={s}>
                      {scopeLabels[s]}
                    </option>
                  ))}
                </select>
              </FieldRow>

              <FieldRow id={`${rule.id}-limit`} label="한도 (원)">
                <Input
                  id={`${rule.id}-limit`}
                  inputMode="numeric"
                  disabled={readOnly}
                  value={rule.limitAmount ?? ""}
                  placeholder="한도 없음"
                  onChange={(e) => {
                    const digits = e.target.value.replace(/[^0-9]/g, "")
                    update(rule.id, { limitAmount: digits === "" ? null : Number(digits) })
                  }}
                />
              </FieldRow>

              <FieldRow id={`${rule.id}-severity`} label="위반 시">
                <select
                  id={`${rule.id}-severity`}
                  className={selectClass}
                  disabled={readOnly}
                  value={rule.severity}
                  onChange={(e) =>
                    update(rule.id, { severity: e.target.value as RuleSeverity })
                  }
                >
                  {(Object.keys(severityLabels) as RuleSeverity[]).map((s) => (
                    <option key={s} value={s}>
                      {severityLabels[s]}
                    </option>
                  ))}
                </select>
              </FieldRow>
            </div>

            {(evidence.length > 0 ||
              prohibitions.length > 0 ||
              rule.conditions?.latestHour != null ||
              rule.conditions?.weekendAllowed === false) && (
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                {evidence.map((e) => (
                  <Badge key={e} variant="outline" className="font-normal">
                    첨부 {e}
                  </Badge>
                ))}
                {prohibitions.map((p) => (
                  <Badge
                    key={p}
                    className="border-destructive/30 bg-destructive/10 font-normal text-destructive"
                  >
                     {p} 금지
                  </Badge>
                ))}
                {rule.conditions?.latestHour != null && (
                  <Badge variant="outline" className="font-normal">
                    {rule.conditions.latestHour}시 이후 제한
                  </Badge>
                )}
                {rule.conditions?.weekendAllowed === false && (
                  <Badge variant="outline" className="font-normal">
                    주말 제한
                  </Badge>
                )}
              </div>
            )}

            {/* AI commentary — carries the currency conversion the server applied. */}
            {rule.note && (
              <p className="mt-3 flex gap-1.5 text-xs leading-relaxed text-muted-foreground">
                <Sparkles className="mt-0.5 size-3 shrink-0 text-primary" />
                {rule.note}
              </p>
            )}

            <figure className="mt-3 border-l-2 border-border pl-3">
              <figcaption className="text-[11px] text-muted-foreground/70">
                {rule.clauseArticle ?? "출처 미상"}
                {rule.clausePage ? ` · ${rule.clausePage}쪽` : ""}
                {rule.limitAmount != null && ` · 현재 한도 ${currency(rule.limitAmount)}`}
              </figcaption>
            </figure>
          </li>
        )
      })}
    </ul>
  )
}

function FieldRow({
  id,
  label,
  children,
}: {
  id: string
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  )
}

/**
 * A flag, deliberately not a score.
 *
 * `confidence` is the model's own estimate, and self-reported confidence tracks
 * real accuracy only loosely — a model is often confidently wrong. Rendering it
 * as "신뢰도 94%" implies a precision that does not exist and invites the
 * reviewer to skip the high numbers, which is the exact failure this review step
 * exists to prevent. So the value only decides whether to raise a flag.
 */
function ReviewFlag() {
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-warning/45 bg-warning/15 px-2 py-0.5 text-[11px] font-medium text-warning-foreground">
      <TriangleAlert className="size-3" />
      확인 필요
    </span>
  )
}
