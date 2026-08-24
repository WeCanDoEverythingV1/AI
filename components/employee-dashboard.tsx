"use client"

import { useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import {
  Calendar,
  CheckCircle2,
  DollarSign,
  FileText,
  Loader2,
  ShieldCheck,
  Sparkles,
  Store,
  Tag,
  TriangleAlert,
  UploadCloud,
} from "lucide-react"

type FormState = {
  merchant: string
  date: string
  amount: string
  item: string
  purpose: string
}

const emptyForm: FormState = {
  merchant: "",
  date: "",
  amount: "",
  item: "",
  purpose: "",
}

const aiExtracted: FormState = {
  merchant: "Blue Bottle Coffee",
  date: "2026-08-14",
  amount: "48.50",
  item: "Team offsite coffee (6 drinks)",
  purpose: "Client onboarding kickoff with the Acme account team.",
}

type ComplianceResult = {
  status: "compliant" | "warning"
  title: string
  detail: string
}

const aiCompliance: ComplianceResult = {
  status: "compliant",
  title: "Compliant: Within meal allowance",
  detail:
    "$48.50 is under the $75/person meal cap and the category matches the client-onboarding budget.",
}

type Stage = "idle" | "processing" | "ready" | "submitted"

export function EmployeeDashboard() {
  const [stage, setStage] = useState<Stage>("idle")
  const [dragging, setDragging] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [confirmed, setConfirmed] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const startProcessing = (name: string) => {
    setFileName(name)
    setStage("processing")
    setForm(emptyForm)
    setConfirmed(false)
    window.setTimeout(() => {
      setForm(aiExtracted)
      setStage("ready")
    }, 1800)
  }

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return
    startProcessing(files[0].name)
  }

  const update = (key: keyof FormState, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const reset = () => {
    setStage("idle")
    setFileName(null)
    setForm(emptyForm)
    setConfirmed(false)
  }

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
            tabIndex={0}
            aria-label="Upload receipt photo. Drag and drop or activate to browse files."
            onClick={() => inputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault()
                inputRef.current?.click()
              }
            }}
            onDragOver={(e) => {
              e.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDragging(false)
              handleFiles(e.dataTransfer.files)
            }}
            className={cn(
              "flex min-h-72 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed bg-card p-8 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
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
            {stage === "processing" ? (
              <>
                <div className="flex size-14 items-center justify-center rounded-full bg-accent">
                  <Loader2 className="size-6 animate-spin text-primary" />
                </div>
                <p className="mt-4 text-sm font-medium text-foreground">Reading your receipt…</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Extracting merchant, amount and line items
                </p>
              </>
            ) : fileName ? (
              <>
                <div className="flex size-14 items-center justify-center rounded-full bg-success/10">
                  <CheckCircle2 className="size-6 text-success" />
                </div>
                <p className="mt-4 max-w-full truncate text-sm font-medium text-foreground">
                  {fileName}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Scanned successfully — review the draft on the right
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={(e) => {
                    e.stopPropagation()
                    reset()
                  }}
                >
                  Upload another
                </Button>
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
            {stage === "ready" && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-2.5 py-1 text-[11px] font-medium text-accent-foreground">
                <Sparkles className="size-3" />
                AI auto-filled
              </span>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              setStage("submitted")
            }}
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
                  Your request for {form.merchant || "this receipt"} was routed to your approver.
                </p>
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
                {stage === "ready" && (
                  <div
                    role="status"
                    className={cn(
                      "flex items-start gap-2.5 rounded-lg border p-3",
                      aiCompliance.status === "compliant"
                        ? "border-success/25 bg-success/8"
                        : "border-warning/40 bg-warning/12",
                    )}
                  >
                    {aiCompliance.status === "compliant" ? (
                      <ShieldCheck className="mt-0.5 size-4 shrink-0 text-success" />
                    ) : (
                      <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning-foreground" />
                    )}
                    <div className="min-w-0">
                      <p
                        className={cn(
                          "text-xs font-semibold",
                          aiCompliance.status === "compliant"
                            ? "text-success"
                            : "text-warning-foreground",
                        )}
                      >
                        {aiCompliance.title}
                      </p>
                      <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                        {aiCompliance.detail}
                      </p>
                    </div>
                    <span className="ml-auto hidden shrink-0 items-center gap-1 self-center rounded-full bg-card px-2 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline-flex">
                      <Sparkles className="size-2.5" />
                      AI policy check
                    </span>
                  </div>
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
                    disabled={!confirmed}
                    className="shrink-0 gap-1.5"
                  >
                    Submit for Approval
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

function Field({
  id,
  label,
  icon,
  children,
}: {
  id: string
  label: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span className="text-muted-foreground/70">{icon}</span>
        {label}
      </Label>
      {children}
    </div>
  )
}
