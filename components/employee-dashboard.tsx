"use client"

import { useEffect, useRef, useState, type FormEvent } from "react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Field } from "@/components/field"
import { cn } from "@/lib/utils"
import { currency } from "@/lib/mock-data"
import {
  createApprovalRequest,
  isAbort,
  messageFor,
  scanReceipt,
  validateReceiptFile,
} from "@/lib/api/endpoints"
import {
  categoryLabels,
  deriveRisk,
  expenseCategories,
  statusLabels,
  toExpenseCategory,
  type RiskLevel,
} from "@/lib/policy"
import type {
  ApprovalRequestCreateDto,
  ApprovalRequestResponseDto,
  ExpenseCategory,
  ReceiptScanResultDto,
} from "@/types/api"
import {
  Calendar,
  CheckCircle2,
  Copy,
  FileText,
  Layers,
  Loader2,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Store,
  Tag,
  TriangleAlert,
  UploadCloud,
  User,
  Wallet2,
} from "lucide-react"

type FormState = {
  merchant: string
  date: string
  amount: string
  itemName: string
  purpose: string
  employeeName: string
  expenseCategory: ExpenseCategory
}

const emptyForm: FormState = {
  merchant: "",
  date: "",
  amount: "",
  itemName: "",
  purpose: "",
  employeeName: "",
  expenseCategory: "OTHER",
}

/** Prefill the editable form from the scan so the user can correct it. */
function toFormState(scan: ReceiptScanResultDto, employeeName: string): FormState {
  return {
    merchant: scan.merchant ?? "",
    date: scan.date ?? "",
    amount: scan.amount != null ? String(scan.amount) : "",
    itemName: scan.itemName ?? "",
    purpose: scan.purpose ?? "",
    // The scan has no employee field — it is whoever is signed in.
    employeeName,
    expenseCategory: toExpenseCategory(scan.category),
  }
}

type Stage = "idle" | "scanning" | "ready" | "submitting" | "submitted"

export function EmployeeDashboard({ employeeName }: { employeeName: string }) {
  const [stage, setStage] = useState<Stage>("idle")
  const [dragging, setDragging] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [scan, setScan] = useState<ReceiptScanResultDto | null>(null)
  const [submitted, setSubmitted] = useState<ApprovalRequestResponseDto | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [confirmed, setConfirmed] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const inputRef = useRef<HTMLInputElement>(null)
  const requestRef = useRef<AbortController | null>(null)

  // Cancel any in-flight request when the dashboard unmounts (role switch).
  useEffect(() => () => requestRef.current?.abort(), [])

  const showPreview = (nextFile: File) => {
    setPreviewUrl((previous) => {
      if (previous) URL.revokeObjectURL(previous)
      return nextFile.type.startsWith("image/") ? URL.createObjectURL(nextFile) : null
    })
  }

  const clearPreview = () =>
    setPreviewUrl((previous) => {
      if (previous) URL.revokeObjectURL(previous)
      return null
    })

  /** Upload the file, show the loading state, handle failures. */
  const runScan = async (nextFile: File) => {
    requestRef.current?.abort()
    const controller = new AbortController()
    requestRef.current = controller

    setStage("scanning")
    setError(null)
    setScan(null)
    setSubmitted(null)
    setForm(emptyForm)
    setConfirmed(false)

    try {
      const result = await scanReceipt(nextFile, { signal: controller.signal })
      if (controller.signal.aborted) return

      setScan(result)
      setForm(toFormState(result, employeeName))
      setStage("ready")
    } catch (caught) {
      if (controller.signal.aborted || isAbort(caught)) return
      setError(messageFor(caught, "영수증을 분석하지 못했습니다. 다시 시도해 주세요."))
      setStage("idle")
    } finally {
      if (requestRef.current === controller) requestRef.current = null
    }
  }

  /** File selection — shared by the file input and the drop zone. */
  const handleFiles = (files: FileList | null) => {
    const picked = files?.[0]
    if (!picked) return

    const invalid = validateReceiptFile(picked)
    if (invalid) {
      setError(invalid)
      return
    }

    setFile(picked)
    showPreview(picked)
    void runScan(picked)
  }

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((previous) => ({ ...previous, [key]: value }))

  const reset = () => {
    requestRef.current?.abort()
    requestRef.current = null
    clearPreview()
    setStage("idle")
    setFile(null)
    setScan(null)
    setSubmitted(null)
    setForm(emptyForm)
    setConfirmed(false)
    setError(null)
    if (inputRef.current) inputRef.current.value = ""
  }

  /** Send the fields the user verified/corrected as a real approval request. */
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (stage !== "ready") return

    const amount = Number(form.amount)
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("제출하기 전에 올바른 금액을 입력해 주세요.")
      return
    }
    if (!form.merchant.trim()) {
      setError("제출하기 전에 가맹점을 입력해 주세요.")
      return
    }
    if (!form.date) {
      setError("사용일자를 선택해 주세요.")
      return
    }
    if (!form.employeeName.trim()) {
      setError("제출자 이름을 입력해 주세요.")
      return
    }

    const body: ApprovalRequestCreateDto = {
      employeeName: form.employeeName.trim(),
      merchant: form.merchant.trim(),
      date: form.date,
      amount,
      itemName: form.itemName.trim() || form.merchant.trim(),
      purpose: form.purpose.trim() || "제출자가 목적을 입력하지 않았습니다.",
      expenseCategory: form.expenseCategory,
    }

    const controller = new AbortController()
    requestRef.current = controller
    setStage("submitting")
    setError(null)

    try {
      const created = await createApprovalRequest(body, { signal: controller.signal })
      if (controller.signal.aborted) return

      setSubmitted(created)
      setStage("submitted")
    } catch (caught) {
      if (controller.signal.aborted || isAbort(caught)) return
      setError(messageFor(caught, "결재 요청을 등록하지 못했습니다."))
      setStage("ready")
    } finally {
      if (requestRef.current === controller) requestRef.current = null
    }
  }

  const busy = stage === "scanning"
  const parsedAmount = Number(form.amount)
  const risk =
    Number.isFinite(parsedAmount) && parsedAmount > 0
      ? deriveRisk(parsedAmount, form.expenseCategory)
      : null

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-balance">영수증 제출</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          사진을 올리면 AI가 결재 요청서를 대신 작성해 드립니다.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        {/* Upload area */}
        <section aria-labelledby="upload-heading">
          <h2 id="upload-heading" className="mb-3 text-sm font-medium text-foreground">
            영수증 사진 업로드
          </h2>
          <div
            role="button"
            tabIndex={busy ? -1 : 0}
            aria-label="영수증 사진 업로드. 파일을 끌어다 놓거나 눌러서 선택하세요."
            aria-busy={busy}
            onClick={() => {
              if (!busy) inputRef.current?.click()
            }}
            onKeyDown={(e) => {
              if (!busy && (e.key === "Enter" || e.key === " ")) {
                e.preventDefault()
                inputRef.current?.click()
              }
            }}
            onDragOver={(e) => {
              if (busy) return
              e.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDragging(false)
              if (!busy) handleFiles(e.dataTransfer.files)
            }}
            className={cn(
              "flex min-h-72 flex-col items-center justify-center rounded-xl border-2 border-dashed bg-card p-8 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              busy ? "cursor-wait" : "cursor-pointer",
              dragging ? "border-primary bg-accent" : "border-border hover:border-primary/50",
            )}
          >
            <input
              ref={inputRef}
              type="file"
              accept="image/*,.pdf"
              className="sr-only"
              onChange={(e) => handleFiles(e.target.files)}
            />
            {stage === "scanning" ? (
              <>
                <div className="flex size-14 items-center justify-center rounded-full bg-accent">
                  <Loader2 className="size-6 animate-spin text-primary" />
                </div>
                <p className="mt-4 text-sm font-medium text-foreground">
                  영수증을 읽는 중…
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  가맹점, 금액, 품목을 추출하고 있어요 — 서버가 절전 상태였다면 1분 넘게
                  걸릴 수 있습니다
                </p>
              </>
            ) : file ? (
              <>
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="업로드한 영수증 미리보기"
                    className="max-h-32 rounded-md border border-border object-contain"
                  />
                ) : (
                  <div className="flex size-14 items-center justify-center rounded-full bg-success/10">
                    <CheckCircle2 className="size-6 text-success" />
                  </div>
                )}
                <p className="mt-4 max-w-full truncate text-sm font-medium text-foreground">
                  {file.name}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {scan
                    ? "인식 완료 — 오른쪽에서 초안을 확인하세요"
                    : "인식 실패 — 아래에서 다시 시도해 주세요"}
                </p>
                <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                  {!scan && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      onClick={(e) => {
                        e.stopPropagation()
                        void runScan(file)
                      }}
                    >
                      <RotateCcw className="size-3.5" />
                      다시 인식
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      reset()
                    }}
                  >
                    다른 파일 올리기
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="flex size-14 items-center justify-center rounded-full bg-accent">
                  <UploadCloud className="size-6 text-primary" />
                </div>
                <p className="mt-4 text-sm font-medium text-foreground">
                  여기에 영수증을 끌어다 놓으세요
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  또는 클릭해서 선택 · PNG, JPG, PDF · 최대 10MB
                </p>
              </>
            )}
          </div>

          {error && (
            <div
              role="alert"
              className="mt-4 flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/10 p-3"
            >
              <TriangleAlert className="mt-0.5 size-4 shrink-0 text-destructive" />
              <p className="text-xs leading-relaxed text-destructive">{error}</p>
            </div>
          )}

          <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-border bg-secondary/60 p-3">
            <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" />
            <p className="text-xs leading-relaxed text-muted-foreground">
              바로 AI가 영수증을 읽고 지출을 분류해 요청서를 미리 채워 줍니다. 제출 전에
              무엇이든 직접 수정할 수 있습니다.
            </p>
          </div>
        </section>

        {/* Draft form */}
        <section aria-labelledby="form-heading">
          <div className="mb-3 flex items-center justify-between">
            <h2 id="form-heading" className="text-sm font-medium text-foreground">
              결재 요청서
            </h2>
            {scan && stage !== "submitted" && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-2.5 py-1 text-[11px] font-medium text-accent-foreground">
                <Sparkles className="size-3" />
                AI 자동 입력
              </span>
            )}
          </div>

          <form
            onSubmit={handleSubmit}
            className="rounded-xl border border-border bg-card p-5 shadow-sm sm:p-6"
          >
            {stage === "submitted" && submitted ? (
              <div className="flex flex-col items-center py-10 text-center">
                <div className="flex size-14 items-center justify-center rounded-full bg-success/10">
                  <CheckCircle2 className="size-7 text-success" />
                </div>
                <p className="mt-4 text-base font-semibold text-foreground">
                  결재 요청이 접수되었습니다
                </p>
                <p className="mt-1 max-w-xs text-sm text-muted-foreground">
                  {submitted.merchant} · {currency(submitted.amount)} 건이 결재자에게
                  전달되었습니다.
                </p>
                <p className="mt-2 font-mono text-xs text-muted-foreground">
                  REQ-{submitted.id} · {statusLabels[submitted.status]}
                </p>
                <Button variant="outline" size="sm" className="mt-5" onClick={reset}>
                  다른 영수증 제출하기
                </Button>
              </div>
            ) : (
              <fieldset
                disabled={stage !== "ready"}
                className={cn(
                  "space-y-4 transition-opacity",
                  stage !== "ready" && "opacity-55",
                )}
              >
                {scan && (
                  <>

                    {scan.possibleDuplicate && (
                      <DuplicateBanner note={scan.duplicateNote} />
                    )}
                  </>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    id="merchant"
                    label="가맹점 / 사용처"
                    icon={<Store className="size-4" />}
                  >
                    <Input
                      id="merchant"
                      value={form.merchant}
                      onChange={(e) => update("merchant", e.target.value)}
                      placeholder="인식 대기 중…"
                    />
                  </Field>
                  <Field id="date" label="사용일자" icon={<Calendar className="size-4" />}>
                    <Input
                      id="date"
                      type="date"
                      value={form.date}
                      onChange={(e) => update("date", e.target.value)}
                    />
                  </Field>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field id="amount" label="금액 (원)" icon={<Wallet2 className="size-4" />}>
                    <Input
                      id="amount"
                      inputMode="numeric"
                      value={form.amount}
                      onChange={(e) => update("amount", e.target.value)}
                      placeholder="0"
                    />
                  </Field>
                  <Field id="category" label="지출 분류" icon={<Layers className="size-4" />}>
                    <select
                      id="category"
                      value={form.expenseCategory}
                      onChange={(e) =>
                        update("expenseCategory", e.target.value as ExpenseCategory)
                      }
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-100"
                    >
                      {expenseCategories.map((c) => (
                        <option key={c} value={c}>
                          {categoryLabels[c]}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field id="itemName" label="품목명" icon={<Tag className="size-4" />}>
                    <Input
                      id="itemName"
                      value={form.itemName}
                      onChange={(e) => update("itemName", e.target.value)}
                      placeholder="인식 대기 중…"
                    />
                  </Field>
                  <Field
                    id="employeeName"
                    label="제출자"
                    icon={<User className="size-4" />}
                  >
                    <Input
                      id="employeeName"
                      value={form.employeeName}
                      onChange={(e) => update("employeeName", e.target.value)}
                      placeholder="이름"
                    />
                  </Field>
                </div>

                <Field id="purpose" label="사용 목적" icon={<FileText className="size-4" />}>
                  <Textarea
                    id="purpose"
                    rows={3}
                    value={form.purpose}
                    onChange={(e) => update("purpose", e.target.value)}
                    placeholder="인식 대기 중…"
                    className="resize-none"
                  />
                </Field>

                {risk && <PolicyNote level={risk.level} label={risk.label} />}

                <div className="flex flex-col gap-4 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <label
                    htmlFor="confirm-accurate"
                    className="flex max-w-xs cursor-pointer items-start gap-2.5 text-xs leading-relaxed text-muted-foreground"
                  >
                    <Checkbox
                      id="confirm-accurate"
                      checked={confirmed}
                      onCheckedChange={(v) => setConfirmed(v === true)}
                      className="mt-0.5"
                    />
                    <span>
                      위 내용이 정확하며 업로드한 영수증과 일치함을 확인합니다.
                    </span>
                  </label>
                  <Button
                    type="submit"
                    disabled={!confirmed || stage === "submitting"}
                    className="shrink-0 gap-1.5"
                  >
                    {stage === "submitting" && <Loader2 className="size-4 animate-spin" />}
                    {stage === "submitting" ? "제출 중…" : "결재 요청하기"}
                  </Button>
                </div>
              </fieldset>
            )}
          </form>
        </section>
      </div>
    </main>
  )
}

/** The one compliance signal the scan endpoint actually returns. */
function DuplicateBanner({ note }: { note: string }) {
  return (
    <div
      role="status"
      className="flex items-start gap-2.5 rounded-lg border border-warning/40 bg-warning/12 p-3"
    >
      <Copy className="mt-0.5 size-4 shrink-0 text-warning-foreground" />
      <div className="min-w-0">
        <p className="text-xs font-semibold text-warning-foreground">중복 제출 의심</p>
        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
          {note || "이미 제출된 영수증과 비슷합니다. 제출 전에 확인해 주세요."}
        </p>
      </div>
      <span className="ml-auto hidden shrink-0 items-center gap-1 self-center rounded-full bg-card px-2 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline-flex">
        <Sparkles className="size-2.5" />
        AI 중복 검사
      </span>
    </div>
  )
}

const policyStyles: Record<RiskLevel, { wrap: string; text: string; icon: React.ReactNode }> = {
  compliant: {
    wrap: "border-success/25 bg-success/8",
    text: "text-success",
    icon: <ShieldCheck className="mt-0.5 size-4 shrink-0 text-success" />,
  },
  warning: {
    wrap: "border-warning/40 bg-warning/12",
    text: "text-warning-foreground",
    icon: <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning-foreground" />,
  },
  high: {
    wrap: "border-destructive/30 bg-destructive/10",
    text: "text-destructive",
    icon: <TriangleAlert className="mt-0.5 size-4 shrink-0 text-destructive" />,
  },
}

/** Client-side policy verdict — see `categoryLimits` in `lib/policy.ts`. */
function PolicyNote({ level, label }: { level: RiskLevel; label: string }) {
  const style = policyStyles[level]
  return (
    <div className={cn("flex items-start gap-2.5 rounded-lg border p-3", style.wrap)}>
      {style.icon}
      <div className="min-w-0">
        <p className={cn("text-xs font-semibold", style.text)}>{label}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
          사내 지출 한도 기준으로 자동 판정한 결과입니다. 최종 판단은 결재자가 합니다.
        </p>
      </div>
    </div>
  )
}
