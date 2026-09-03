"use client"

import { useEffect, useRef, useState, type FormEvent } from "react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Field } from "@/components/field"
import { cn } from "@/lib/utils"
import type { RiskLevel } from "@/lib/mock-data"
import {
  analyzeReceipt,
  submitApprovalRequest,
  validateReceiptFile,
  ReceiptApiError,
  type ReceiptAnalysis,
} from "@/lib/receipt-api"
import {
  Calendar,
  CheckCircle2,
  DollarSign,
  FileText,
  Loader2,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Store,
  Tag,
  TriangleAlert,
  UploadCloud,
  User,
} from "lucide-react"

type FormState = {
  merchant: string
  date: string
  amount: string
  item: string
  purpose: string
  employeeName: string
}

const emptyForm: FormState = {
  merchant: "",
  date: "",
  amount: "",
  item: "",
  purpose: "",
  employeeName: "",
}

/** Prefill the editable form from the analysis so the user can correct it. */
function toFormState(analysis: ReceiptAnalysis): FormState {
  return {
    merchant: analysis.merchant,
    date: analysis.date ?? "",
    amount: analysis.amount.toFixed(2),
    item: analysis.item ?? "",
    purpose: analysis.purpose,
    employeeName: analysis.employeeName,
  }
}

type Stage = "idle" | "analyzing" | "ready" | "submitting" | "submitted"

export function EmployeeDashboard() {
  const [stage, setStage] = useState<Stage>("idle")
  const [dragging, setDragging] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [analysis, setAnalysis] = useState<ReceiptAnalysis | null>(null)
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

  /* 3–5. Upload the file, show the loading state, handle failures. */
  const runAnalysis = async (nextFile: File) => {
    requestRef.current?.abort()
    const controller = new AbortController()
    requestRef.current = controller

    setStage("analyzing")
    setError(null)
    setAnalysis(null)
    setForm(emptyForm)
    setConfirmed(false)

    try {
      const result = await analyzeReceipt(nextFile, { signal: controller.signal })
      if (controller.signal.aborted) return

      setAnalysis(result)
      setForm(toFormState(result))
      setStage("ready")
    } catch (caught) {
      if (controller.signal.aborted) return
      setError(messageFor(caught))
      setStage("idle")
    } finally {
      if (requestRef.current === controller) requestRef.current = null
    }
  }

  /* 2. File selection — shared by the file input and the drop zone. */
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
    void runAnalysis(picked)
  }

  const update = (key: keyof FormState, value: string) =>
    setForm((previous) => ({ ...previous, [key]: value }))

  const reset = () => {
    requestRef.current?.abort()
    requestRef.current = null
    clearPreview()
    setStage("idle")
    setFile(null)
    setAnalysis(null)
    setForm(emptyForm)
    setConfirmed(false)
    setError(null)
    if (inputRef.current) inputRef.current.value = ""
  }

  /* 6. Send the fields the user verified/corrected for approval. */
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!analysis) return

    const amount = Number(form.amount)
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Enter a valid amount before submitting.")
      return
    }
    if (!form.merchant.trim()) {
      setError("Merchant is required before submitting.")
      return
    }

    const controller = new AbortController()
    requestRef.current = controller
    setStage("submitting")
    setError(null)

    try {
      const submitted = await submitApprovalRequest(
        analysis.id,
        {
          merchant: form.merchant.trim(),
          date: form.date,
          amount,
          item: form.item.trim(),
          purpose: form.purpose.trim(),
          employeeName: form.employeeName.trim(),
        },
        { signal: controller.signal },
      )
      if (controller.signal.aborted) return

      setAnalysis(submitted)
      setStage("submitted")
    } catch (caught) {
      if (controller.signal.aborted) return
      setError(messageFor(caught))
      setStage("ready")
    } finally {
      if (requestRef.current === controller) requestRef.current = null
    }
  }

  const busy = stage === "analyzing"
  const lowConfidence = analysis?.confidence !== undefined && analysis.confidence < 0.8

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-balance">
          Submit a receipt
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload a photo and our AI drafts the approval request for you to review.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        {/* Upload area */}
        <section aria-labelledby="upload-heading">
          <h2 id="upload-heading" className="mb-3 text-sm font-medium text-foreground">
            Receipt photo upload
          </h2>
          <div
            role="button"
            tabIndex={busy ? -1 : 0}
            aria-label="Upload receipt photo. Drag and drop or activate to browse files."
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
            {stage === "analyzing" ? (
              <>
                <div className="flex size-14 items-center justify-center rounded-full bg-accent">
                  <Loader2 className="size-6 animate-spin text-primary" />
                </div>
                <p className="mt-4 text-sm font-medium text-foreground">
                  Reading your receipt…
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Extracting merchant, amount and line items — this can take a few seconds
                </p>
              </>
            ) : file ? (
              <>
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="Uploaded receipt preview"
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
                  {analysis
                    ? "Scanned successfully — review the draft on the right"
                    : "Upload failed — try again below"}
                </p>
                <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                  {!analysis && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      onClick={(e) => {
                        e.stopPropagation()
                        void runAnalysis(file)
                      }}
                    >
                      <RotateCcw className="size-3.5" />
                      Retry scan
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
                    Upload another
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="flex size-14 items-center justify-center rounded-full bg-accent">
                  <UploadCloud className="size-6 text-primary" />
                </div>
                <p className="mt-4 text-sm font-medium text-foreground">
                  Drag &amp; drop your receipt here
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  or click to browse · PNG, JPG or PDF up to 10MB
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
              Ledgerly AI reads the receipt, categorizes the spend and pre-fills the request.
              You stay in control — edit anything before submitting.
            </p>
          </div>
        </section>

        {/* AI form */}
        <section aria-labelledby="form-heading">
          <div className="mb-3 flex items-center justify-between">
            <h2 id="form-heading" className="text-sm font-medium text-foreground">
              Approval request
            </h2>
            {analysis && stage !== "submitted" && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-2.5 py-1 text-[11px] font-medium text-accent-foreground">
                <Sparkles className="size-3" />
                AI auto-filled
              </span>
            )}
          </div>

          <form
            onSubmit={handleSubmit}
            className="rounded-xl border border-border bg-card p-5 shadow-sm sm:p-6"
          >
            {stage === "submitted" ? (
              <div className="flex flex-col items-center py-10 text-center">
                <div className="flex size-14 items-center justify-center rounded-full bg-success/10">
                  <CheckCircle2 className="size-7 text-success" />
                </div>
                <p className="mt-4 text-base font-semibold text-foreground">
                  Submitted for approval
                </p>
                <p className="mt-1 max-w-xs text-sm text-muted-foreground">
                  Your request for {form.merchant || "this receipt"} was routed to your
                  approver.
                </p>
                {analysis && (
                  <p className="mt-2 font-mono text-xs text-muted-foreground">
                    {analysis.id} · {analysis.status}
                  </p>
                )}
                <Button variant="outline" size="sm" className="mt-5" onClick={reset}>
                  Submit another receipt
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
                {analysis && (
                  <>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                      <span className="font-mono">{analysis.id}</span>
                      <span aria-hidden>·</span>
                      <span>Scanned {formatTimestamp(analysis.createdAt)}</span>
                      {analysis.category && (
                        <>
                          <span aria-hidden>·</span>
                          <span>{analysis.category}</span>
                        </>
                      )}
                      {analysis.confidence !== undefined && (
                        <>
                          <span aria-hidden>·</span>
                          <span>{Math.round(analysis.confidence * 100)}% confidence</span>
                        </>
                      )}
                    </div>

                    {analysis.compliance && (
                      <ComplianceBanner
                        level={analysis.compliance.level}
                        title={analysis.compliance.title}
                        detail={analysis.compliance.detail}
                      />
                    )}

                    {lowConfidence && (
                      <p className="text-xs leading-relaxed text-warning-foreground">
                        The scan was not fully confident — double-check every field before
                        submitting.
                      </p>
                    )}
                  </>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    id="merchant"
                    label="Merchant / Usage"
                    icon={<Store className="size-4" />}
                  >
                    <Input
                      id="merchant"
                      value={form.merchant}
                      onChange={(e) => update("merchant", e.target.value)}
                      placeholder="Awaiting scan…"
                    />
                  </Field>
                  <Field id="date" label="Date" icon={<Calendar className="size-4" />}>
                    <Input
                      id="date"
                      type="date"
                      value={form.date}
                      onChange={(e) => update("date", e.target.value)}
                    />
                  </Field>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field id="amount" label="Amount" icon={<DollarSign className="size-4" />}>
                    <Input
                      id="amount"
                      inputMode="decimal"
                      value={form.amount}
                      onChange={(e) => update("amount", e.target.value)}
                      placeholder="0.00"
                    />
                  </Field>
                  <Field id="item" label="Item name" icon={<Tag className="size-4" />}>
                    <Input
                      id="item"
                      value={form.item}
                      onChange={(e) => update("item", e.target.value)}
                      placeholder="Awaiting scan…"
                    />
                  </Field>
                </div>

                <Field
                  id="employeeName"
                  label="Submitted by"
                  icon={<User className="size-4" />}
                >
                  <Input
                    id="employeeName"
                    value={form.employeeName}
                    onChange={(e) => update("employeeName", e.target.value)}
                    placeholder="Awaiting scan…"
                  />
                </Field>

                <Field id="purpose" label="Purpose" icon={<FileText className="size-4" />}>
                  <Textarea
                    id="purpose"
                    rows={3}
                    value={form.purpose}
                    onChange={(e) => update("purpose", e.target.value)}
                    placeholder="Awaiting scan…"
                    className="resize-none"
                  />
                </Field>

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
                      I confirm that the details above are accurate and match the uploaded
                      receipt.
                    </span>
                  </label>
                  <Button
                    type="submit"
                    disabled={!confirmed || stage === "submitting"}
                    className="shrink-0 gap-1.5"
                  >
                    {stage === "submitting" && <Loader2 className="size-4 animate-spin" />}
                    {stage === "submitting" ? "Submitting…" : "Submit for Approval"}
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

function messageFor(error: unknown): string {
  if (error instanceof ReceiptApiError) return error.message
  return "Something went wrong while analyzing the receipt. Please try again."
}

function formatTimestamp(iso: string): string {
  const parsed = new Date(iso)
  if (Number.isNaN(parsed.getTime())) return iso
  return parsed.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

const complianceStyles: Record<
  RiskLevel,
  { wrap: string; title: string; icon: React.ReactNode }
> = {
  compliant: {
    wrap: "border-success/25 bg-success/8",
    title: "text-success",
    icon: <ShieldCheck className="mt-0.5 size-4 shrink-0 text-success" />,
  },
  warning: {
    wrap: "border-warning/40 bg-warning/12",
    title: "text-warning-foreground",
    icon: <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning-foreground" />,
  },
  high: {
    wrap: "border-destructive/30 bg-destructive/10",
    title: "text-destructive",
    icon: <TriangleAlert className="mt-0.5 size-4 shrink-0 text-destructive" />,
  },
}

function ComplianceBanner({
  level,
  title,
  detail,
}: {
  level: RiskLevel
  title: string
  detail: string
}) {
  const style = complianceStyles[level]

  return (
    <div role="status" className={cn("flex items-start gap-2.5 rounded-lg border p-3", style.wrap)}>
      {style.icon}
      <div className="min-w-0">
        <p className={cn("text-xs font-semibold", style.title)}>{title}</p>
        {detail && (
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{detail}</p>
        )}
      </div>
      <span className="ml-auto hidden shrink-0 items-center gap-1 self-center rounded-full bg-card px-2 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline-flex">
        <Sparkles className="size-2.5" />
        AI policy check
      </span>
    </div>
  )
}
