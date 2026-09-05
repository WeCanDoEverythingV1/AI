"use client"

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Field } from "@/components/field"
import { PolicyRuleEditor, LOW_CONFIDENCE } from "@/components/policy-rule-editor"
import { cn } from "@/lib/utils"
import { usingPolicyStub } from "@/lib/api/client"
import { isAbort, messageFor } from "@/lib/api/endpoints"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  activatePolicy,
  deletePolicyRuleset,
  evaluateExpense,
  getActivePolicy,
  listPolicyRulesets,
  savePolicyRules,
  uploadPolicyDocument,
  validatePolicyFile,
} from "@/lib/api/policies"
import { categoryLabels, expenseCategories } from "@/lib/policy"
import type { ExpenseCategory } from "@/types/api"
import type {
  ComplianceLevel,
  PolicyEvaluationResult,
  PolicyRule,
  PolicyRuleset,
} from "@/types/policy"
import {
  BadgeCheck,
  CheckCircle2,
  FileText,
  FlaskConical,
  Layers,
  Loader2,
  Quote,
  Save,
  ShieldCheck,
  Sparkles,
  Trash2,
  TriangleAlert,
  UploadCloud,
  Wallet2,
  XCircle,
} from "lucide-react"

export function PolicyConsole() {
  const [active, setActive] = useState<PolicyRuleset | null>(null)
  const [versions, setVersions] = useState<PolicyRuleset[]>([])
  /** The freshly extracted ruleset under review, if any. */
  const [draft, setDraft] = useState<PolicyRuleset | null>(null)

  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  /** The version awaiting delete confirmation. */
  const [pendingDelete, setPendingDelete] = useState<PolicyRuleset | null>(null)
  const [deleting, setDeleting] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)
  const uploadRef = useRef<AbortController | null>(null)

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true)
    setError(null)
    try {
      const [activeRuleset, all] = await Promise.all([
        getActivePolicy({ signal }),
        listPolicyRulesets({ signal }),
      ])
      if (signal?.aborted) return
      setActive(activeRuleset)
      setVersions(all)
      // Resume review if a draft is still waiting for someone.
      setDraft((current) => current ?? all.find((r) => r.status === "DRAFT") ?? null)
    } catch (caught) {
      if (signal?.aborted || isAbort(caught)) return
      setError(messageFor(caught, "규정 정보를 불러오지 못했습니다."))
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    void load(controller.signal)
    return () => {
      controller.abort()
      uploadRef.current?.abort()
    }
  }, [load])

  const handleFiles = async (files: FileList | null) => {
    const picked = files?.[0]
    if (!picked) return

    const invalid = validatePolicyFile(picked)
    if (invalid) {
      setError(invalid)
      return
    }

    uploadRef.current?.abort()
    const controller = new AbortController()
    uploadRef.current = controller

    setUploading(true)
    setError(null)
    setNotice(null)

    try {
      const extracted = await uploadPolicyDocument(picked, { signal: controller.signal })
      if (controller.signal.aborted) return
      setDraft(extracted)
      setVersions((prev) => [extracted, ...prev])
      setNotice(
        `${extracted.rules.length}개 조항을 추출했습니다. 활성화 전에 내용을 확인해 주세요.`,
      )
    } catch (caught) {
      if (controller.signal.aborted || isAbort(caught)) return
      setError(messageFor(caught, "규정집을 분석하지 못했습니다."))
    } finally {
      if (uploadRef.current === controller) uploadRef.current = null
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  const updateDraftRules = (rules: PolicyRule[]) =>
    setDraft((current) => (current ? { ...current, rules } : current))

  const save = async () => {
    if (!draft) return
    setSaving(true)
    setError(null)
    try {
      const updated = await savePolicyRules(draft.id, draft.rules)
      setDraft(updated)
      setNotice("수정 내용을 저장했습니다.")
    } catch (caught) {
      setError(messageFor(caught, "수정 내용을 저장하지 못했습니다."))
    } finally {
      setSaving(false)
    }
  }

  const activate = async () => {
    if (!draft) return
    setSaving(true)
    setError(null)
    try {
      // Persist edits first so the activated version is what the reviewer sees.
      await savePolicyRules(draft.id, draft.rules)
      const activated = await activatePolicy(draft.id)
      setActive(activated)
      setDraft(null)
      setNotice(`규정 v${activated.version}을 활성화했습니다.`)
      await load()
    } catch (caught) {
      setError(messageFor(caught, "규정을 활성화하지 못했습니다."))
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = async () => {
    const target = pendingDelete
    if (!target) return

    setDeleting(true)
    setError(null)
    try {
      await deletePolicyRuleset(target.id)
      setVersions((prev) => prev.filter((v) => v.id !== target.id))
      // Drop it from wherever else it is on screen.
      setDraft((current) => (current?.id === target.id ? null : current))
      setActive((current) => (current?.id === target.id ? null : current))
      setPendingDelete(null)
      setNotice(
        target.status === "ACTIVE"
          ? `규정 v${target.version}을 삭제했습니다. 적용 중인 규정이 없으니 다른 버전을 활성화해 주세요.`
          : `규정 v${target.version}을 삭제했습니다.`,
      )
    } catch (caught) {
      setError(messageFor(caught, "규정을 삭제하지 못했습니다."))
    } finally {
      setDeleting(false)
    }
  }

  const lowConfidenceCount =
    draft?.rules.filter((r) => r.confidence < LOW_CONFIDENCE).length ?? 0

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-balance">규정 관리</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            사내 복무규정 PDF를 올리면 AI가 지출 규칙을 뽑아냅니다. 확인 후 활성화하면
            결재 판정 기준이 됩니다.
          </p>
        </div>
        {active && (
          <Badge className="gap-1.5 border-success/30 bg-success/10 font-medium text-success">
            <BadgeCheck className="size-3.5" />
            활성 규정 v{active.version}
          </Badge>
        )}
      </div>

      {usingPolicyStub && (
        <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-warning/45 bg-warning/12 p-3">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning-foreground" />
          <p className="text-xs leading-relaxed text-warning-foreground">
            <span className="font-semibold">임시 서버로 동작 중입니다.</span> 실제 AI가
            PDF를 읽는 것이 아니라 고정된 예시 규칙을 돌려줍니다. 저장한 규정은 개발 서버를
            재시작하면 사라집니다. 백엔드가 준비되면{" "}
            <code className="font-mono">NEXT_PUBLIC_POLICY_API_URL</code>을 설정하세요.
          </p>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="mb-4 flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/10 p-3"
        >
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-destructive" />
          <p className="text-xs leading-relaxed text-destructive">{error}</p>
        </div>
      )}

      {notice && !error && (
        <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-border bg-secondary/60 p-3">
          <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" />
          <p className="text-xs leading-relaxed text-muted-foreground">{notice}</p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        {/* Step 1 — upload */}
        <section aria-labelledby="upload-heading">
          <StepHeading step={1} id="upload-heading" title="규정집 업로드" />
          <div
            role="button"
            tabIndex={uploading ? -1 : 0}
            aria-label="복무규정 PDF 업로드. 파일을 끌어다 놓거나 눌러서 선택하세요."
            aria-busy={uploading}
            onClick={() => {
              if (!uploading) inputRef.current?.click()
            }}
            onKeyDown={(e) => {
              if (!uploading && (e.key === "Enter" || e.key === " ")) {
                e.preventDefault()
                inputRef.current?.click()
              }
            }}
            onDragOver={(e) => {
              if (uploading) return
              e.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDragging(false)
              if (!uploading) void handleFiles(e.dataTransfer.files)
            }}
            className={cn(
              "flex min-h-56 flex-col items-center justify-center rounded-xl border-2 border-dashed bg-card p-8 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              uploading ? "cursor-wait" : "cursor-pointer",
              dragging ? "border-primary bg-accent" : "border-border hover:border-primary/50",
            )}
          >
            <input
              ref={inputRef}
              type="file"
              accept="application/pdf,.pdf"
              className="sr-only"
              onChange={(e) => void handleFiles(e.target.files)}
            />
            {uploading ? (
              <>
                <div className="flex size-14 items-center justify-center rounded-full bg-accent">
                  <Loader2 className="size-6 animate-spin text-primary" />
                </div>
                <p className="mt-4 text-sm font-medium text-foreground">
                  규정집을 읽는 중…
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  조항을 찾아 지출 규칙으로 변환하고 있습니다
                </p>
              </>
            ) : (
              <>
                <div className="flex size-14 items-center justify-center rounded-full bg-accent">
                  <UploadCloud className="size-6 text-primary" />
                </div>
                <p className="mt-4 text-sm font-medium text-foreground">
                  복무규정 PDF를 끌어다 놓으세요
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  또는 클릭해서 선택 · PDF만 · 최대 10MB
                </p>
                <p className="mt-3 max-w-xs text-[11px] leading-relaxed text-muted-foreground/70">
                  HWP 파일은 한글에서 PDF로 저장한 뒤 올려 주세요.
                </p>
              </>
            )}
          </div>

          <VersionList
            versions={versions}
            loading={loading}
            onDelete={setPendingDelete}
          />
        </section>

        {/* Step 2 — review */}
        <section aria-labelledby="review-heading">
          <StepHeading
            step={2}
            id="review-heading"
            title="추출 결과 검수"
            hint={
              draft
                ? `${draft.rules.length}개 규칙${
                    lowConfidenceCount > 0 ? ` · 확인 필요 ${lowConfidenceCount}건` : ""
                  }`
                : undefined
            }
          />

          {draft ? (
            <>
              <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
                AI가 읽은 내용이 원문과 맞는지 확인하세요. 잘못 추출된 한도 하나가 전사
                결재에 그대로 적용됩니다.
              </p>

              <PolicyRuleEditor rules={draft.rules} onChange={updateDraftRules} />

              {draft.unmappedClauses.length > 0 && (
                <div className="mt-4 rounded-lg border border-warning/45 bg-warning/12 p-3">
                  <p className="text-xs font-semibold text-warning-foreground">
                    규칙으로 변환하지 못한 조항 {draft.unmappedClauses.length}건
                  </p>
                  <ul className="mt-1.5 space-y-1">
                    {draft.unmappedClauses.map((clause) => (
                      <li
                        key={clause}
                        className="flex gap-1.5 text-xs leading-relaxed text-muted-foreground"
                      >
                        <Quote className="mt-0.5 size-3 shrink-0" />
                        {clause}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => void save()}
                  disabled={saving}
                  className="gap-1.5"
                >
                  {saving ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Save className="size-4" />
                  )}
                  임시 저장
                </Button>
                <Button onClick={() => void activate()} disabled={saving} className="gap-1.5">
                  <CheckCircle2 className="size-4" />
                  검수 완료 · 활성화
                </Button>
              </div>
            </>
          ) : active ? (
            <>
              <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
                현재 적용 중인 규칙입니다. 수정하려면 새 규정집을 올려 새 버전을 만드세요.
              </p>
              <PolicyRuleEditor rules={active.rules} readOnly />
            </>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 py-16 text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-accent">
                {loading ? (
                  <Loader2 className="size-6 animate-spin text-primary" />
                ) : (
                  <FileText className="size-6 text-primary" />
                )}
              </div>
              <p className="mt-4 text-sm font-medium text-foreground">
                {loading ? "규정을 불러오는 중…" : "아직 등록된 규정이 없습니다"}
              </p>
              <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                왼쪽에서 복무규정 PDF를 올리면 추출된 규칙이 여기에 표시됩니다.
              </p>
            </div>
          )}
        </section>
      </div>

      {/* Step 3 — test */}
      <section aria-labelledby="test-heading" className="mt-8">
        <StepHeading step={3} id="test-heading" title="판정 테스트" />
        <PolicyTestConsole active={active} />
      </section>

      <DeleteVersionDialog
        target={pendingDelete}
        busy={deleting}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => void confirmDelete()}
      />
    </main>
  )
}

function StepHeading({
  step,
  id,
  title,
  hint,
}: {
  step: number
  id: string
  title: string
  hint?: string
}) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">
        {step}
      </span>
      <h2 id={id} className="text-sm font-medium text-foreground">
        {title}
      </h2>
      {hint && <span className="text-xs text-muted-foreground">· {hint}</span>}
    </div>
  )
}

function VersionList({
  versions,
  loading,
  onDelete,
}: {
  versions: PolicyRuleset[]
  loading: boolean
  onDelete: (ruleset: PolicyRuleset) => void
}) {
  if (loading && versions.length === 0) return null
  if (versions.length === 0) return null

  return (
    <div className="mt-4 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <p className="border-b border-border px-4 py-2.5 text-xs font-medium text-muted-foreground">
        규정 버전 {versions.length}개
      </p>
      <ul className="divide-y divide-border">
        {versions.map((v) => (
          <li key={v.id} className="flex items-center gap-2 px-4 py-2.5">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">
                v{v.version} · {v.sourceFileName}
              </p>
              <p className="text-[11px] text-muted-foreground">
                규칙 {v.rules.length}개
                {v.pageCount ? ` · ${v.pageCount}쪽` : ""}
              </p>
            </div>
            <StatusPill status={v.status} />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onDelete(v)}
              aria-label={`규정 v${v.version} 삭제`}
              title="삭제"
              className="shrink-0 text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="size-3.5" />
            </Button>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Deletion is permanent, so it never happens on a single click. */
function DeleteVersionDialog({
  target,
  busy,
  onCancel,
  onConfirm,
}: {
  target: PolicyRuleset | null
  busy: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  const isActive = target?.status === "ACTIVE"

  return (
    <Dialog
      open={target !== null}
      onOpenChange={(open) => {
        if (!open && !busy) onCancel()
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>규정 v{target?.version} 삭제</DialogTitle>
          <DialogDescription>
            {target?.sourceFileName}에서 추출한 규칙 {target?.rules.length}개가 함께
            삭제됩니다. 되돌릴 수 없습니다.
          </DialogDescription>
        </DialogHeader>

        {isActive && (
          <div className="flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/10 p-3">
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-destructive" />
            <p className="text-xs leading-relaxed text-destructive">
              <span className="font-semibold">현재 적용 중인 규정입니다.</span> 삭제하면
              지출 판정 기준이 사라져, 다른 버전을 활성화할 때까지 판정이 동작하지
              않습니다.
            </p>
          </div>
        )}

        <DialogFooter>
          <DialogClose render={<Button variant="outline" disabled={busy} />}>
            취소
          </DialogClose>
          <Button
            variant="outline"
            onClick={onConfirm}
            disabled={busy}
            className="gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            {busy ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Trash2 className="size-4" />
            )}
            {busy ? "삭제 중…" : "삭제"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function StatusPill({ status }: { status: PolicyRuleset["status"] }) {
  const style =
    status === "ACTIVE"
      ? "border-success/30 bg-success/10 text-success"
      : status === "DRAFT"
        ? "border-warning/45 bg-warning/15 text-warning-foreground"
        : "border-border bg-muted text-muted-foreground"

  const label = status === "ACTIVE" ? "적용 중" : status === "DRAFT" ? "검수 대기" : "보관"

  return (
    <span
      className={cn(
        "shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium",
        style,
      )}
    >
      {label}
    </span>
  )
}

/* ------------------------------------------------------------------ *
 * Test console
 * ------------------------------------------------------------------ */

type TestInput = {
  category: ExpenseCategory
  amount: string
  date: string
  time: string
  attendees: string
  merchant: string
  purpose: string
}

const emptyTest: TestInput = {
  category: "MEALS",
  amount: "",
  date: "",
  time: "",
  attendees: "",
  merchant: "",
  purpose: "",
}

const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"

/** Lets the reviewer try a hypothetical expense before trusting the ruleset. */
function PolicyTestConsole({ active }: { active: PolicyRuleset | null }) {
  const [input, setInput] = useState<TestInput>(emptyTest)
  const [result, setResult] = useState<PolicyEvaluationResult | null>(null)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const update = <K extends keyof TestInput>(key: K, value: TestInput[K]) =>
    setInput((prev) => ({ ...prev, [key]: value }))

  const run = async (e: FormEvent) => {
    e.preventDefault()

    const amount = Number.parseFloat(input.amount.replace(/[^0-9.]/g, ""))
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("0보다 큰 금액을 입력해 주세요.")
      return
    }

    setRunning(true)
    setError(null)
    try {
      setResult(
        await evaluateExpense({
          category: input.category,
          amount,
          date: input.date || new Date().toISOString().slice(0, 10),
          time: input.time || undefined,
          merchant: input.merchant.trim() || undefined,
          purpose: input.purpose.trim() || undefined,
          attendees: input.attendees ? Number(input.attendees) : undefined,
        }),
      )
    } catch (caught) {
      setResult(null)
      setError(messageFor(caught, "판정에 실패했습니다."))
    } finally {
      setRunning(false)
    }
  }

  if (!active) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 py-12 text-center">
        <FlaskConical className="size-6 text-muted-foreground" />
        <p className="mt-3 text-sm font-medium text-foreground">
          활성화된 규정이 없습니다
        </p>
        <p className="mt-1 max-w-xs text-xs text-muted-foreground">
          규정을 활성화하면 여기서 가상의 지출을 넣어 판정 결과를 미리 볼 수 있습니다.
        </p>
      </div>
    )
  }

  return (
    <div className="grid gap-4 rounded-xl border border-border bg-card p-5 shadow-sm lg:grid-cols-2">
      <form onSubmit={run} className="space-y-4">
        <p className="text-xs leading-relaxed text-muted-foreground">
          규정 v{active.version} 기준으로 가상의 지출을 판정해 봅니다. 실제 결재에는
          영향을 주지 않습니다.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="test-category" label="분류" icon={<Layers className="size-4" />}>
            <select
              id="test-category"
              className={selectClass}
              value={input.category}
              onChange={(e) => update("category", e.target.value as ExpenseCategory)}
            >
              {expenseCategories.map((c) => (
                <option key={c} value={c}>
                  {categoryLabels[c]}
                </option>
              ))}
            </select>
          </Field>
          <Field id="test-amount" label="금액 (원)" icon={<Wallet2 className="size-4" />}>
            <Input
              id="test-amount"
              inputMode="numeric"
              value={input.amount}
              onChange={(e) => update("amount", e.target.value)}
              placeholder="120000"
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field id="test-date" label="사용일자">
            <Input
              id="test-date"
              type="date"
              value={input.date}
              onChange={(e) => update("date", e.target.value)}
            />
          </Field>
          <Field id="test-time" label="사용 시각">
            <Input
              id="test-time"
              type="time"
              value={input.time}
              onChange={(e) => update("time", e.target.value)}
            />
          </Field>
          <Field id="test-attendees" label="참석 인원">
            <Input
              id="test-attendees"
              inputMode="numeric"
              value={input.attendees}
              onChange={(e) => update("attendees", e.target.value.replace(/[^0-9]/g, ""))}
              placeholder="2"
            />
          </Field>
        </div>

        <Field id="test-merchant" label="가맹점">
          <Input
            id="test-merchant"
            value={input.merchant}
            onChange={(e) => update("merchant", e.target.value)}
            placeholder="블루보틀 삼청"
          />
        </Field>

        <Field id="test-purpose" label="사용 목적">
          <Textarea
            id="test-purpose"
            rows={2}
            value={input.purpose}
            onChange={(e) => update("purpose", e.target.value)}
            placeholder="고객사 저녁 식사"
            className="resize-none"
          />
        </Field>

        {error && <p className="text-xs text-destructive">{error}</p>}

        <Button type="submit" disabled={running} className="gap-1.5">
          {running ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <FlaskConical className="size-4" />
          )}
          {running ? "판정 중…" : "판정해 보기"}
        </Button>
      </form>

      <div className="rounded-lg border border-border bg-secondary/40 p-4">
        {result ? (
          <VerdictPanel result={result} />
        ) : (
          <div className="flex h-full flex-col items-center justify-center py-8 text-center">
            <FlaskConical className="size-5 text-muted-foreground" />
            <p className="mt-2 text-xs text-muted-foreground">
              왼쪽에 지출 내역을 넣고 판정해 보세요.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

const verdictStyles: Record<
  ComplianceLevel,
  { wrap: string; label: string; icon: React.ReactNode }
> = {
  COMPLIANT: {
    wrap: "border-success/30 bg-success/10 text-success",
    label: "규정 준수",
    icon: <ShieldCheck className="size-3.5" />,
  },
  WARNING: {
    wrap: "border-warning/45 bg-warning/15 text-warning-foreground",
    label: "주의",
    icon: <TriangleAlert className="size-3.5" />,
  },
  VIOLATION: {
    wrap: "border-destructive/30 bg-destructive/10 text-destructive",
    label: "규정 위반",
    icon: <XCircle className="size-3.5" />,
  },
}

function VerdictPanel({ result }: { result: PolicyEvaluationResult }) {
  const style = verdictStyles[result.level]

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
            style.wrap,
          )}
        >
          {style.icon}
          {style.label}
        </span>
        <span className="text-[11px] text-muted-foreground">
          규정 v{result.rulesetVersion} · {result.deterministic ? "규칙 판정" : "AI 판단"}
        </span>
      </div>

      <p className="mt-3 text-sm leading-relaxed text-foreground">{result.summary}</p>

      {result.citedClauses.length > 0 && (
        <div className="mt-4 space-y-2.5">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            근거 조항
          </p>
          {result.citedClauses.map((clause) => (
            <figure key={clause.article} className="border-l-2 border-border pl-3">
              <blockquote className="text-xs leading-relaxed text-muted-foreground">
                {clause.text}
              </blockquote>
              <figcaption className="mt-1 text-[11px] text-muted-foreground/70">
                {clause.article}
                {clause.page ? ` · ${clause.page}쪽` : ""}
              </figcaption>
            </figure>
          ))}
        </div>
      )}

      <p className="mt-4 border-t border-border pt-3 text-[11px] leading-relaxed text-muted-foreground/70">
        자동 판정은 결재자를 돕기 위한 참고 정보입니다. 최종 승인 여부는 결재자가
        결정합니다.
      </p>
    </div>
  )
}

