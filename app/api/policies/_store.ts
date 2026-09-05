import type { PolicyRule, PolicyRuleset } from "@/types/policy"

/**
 * TEMPORARY in-memory store for the policy stub.
 *
 * Delete this whole folder once the real backend serves `/api/policies/*` and
 * `NEXT_PUBLIC_POLICY_API_URL` points at it. State lives on `globalThis` so it
 * survives dev-server hot reloads, but **not** a restart — that is fine for a
 * stub and is surfaced in the UI by `usingPolicyStub`.
 */

type Store = { rulesets: PolicyRuleset[]; nextVersion: number }

const globalRef = globalThis as unknown as { __baroPolicyStore?: Store }

export const store: Store = (globalRef.__baroPolicyStore ??= {
  rulesets: [],
  nextVersion: 1,
})

export const findRuleset = (id: string) => store.rulesets.find((r) => r.id === id)

export const activeRuleset = () =>
  store.rulesets.find((r) => r.status === "ACTIVE") ?? null

/**
 * Stands in for the AI extraction pass.
 *
 * The real implementation parses the PDF, feeds it to an LLM under a constrained
 * output schema, and returns whatever it can map — including the clauses it
 * could not. This returns a fixed, realistic Korean ruleset so the review and
 * evaluation flows are exercisable end to end.
 */
export function extractRuleset(fileName: string, version: number): PolicyRuleset {
  const id = `pol-${Date.now().toString(36)}`

  const rules: PolicyRule[] = [
    {
      id: `${id}-r1`,
      category: "MEALS",
      scope: "PER_PERSON",
      limit: 70_000,
      conditions: {},
      requiredEvidence: ["참석자 명단"],
      prohibitions: [],
      severity: "VIOLATION",
      note: "임직원 1인당 식대는 1회 7만원을 초과할 수 없습니다.",
      sourceClause: {
        article: "제12조 1항",
        page: 4,
        text: "임직원의 업무 관련 식사비는 1인 1회 70,000원을 초과하지 아니한다.",
      },
      confidence: 0.94,
    },
    {
      id: `${id}-r2`,
      category: "MEALS",
      scope: "PER_RECEIPT",
      limit: null,
      conditions: { latestHour: 22 },
      requiredEvidence: ["부서장 사전 승인"],
      prohibitions: [],
      severity: "WARNING",
      note: "22시 이후 발생한 식대는 부서장 사전 승인이 필요합니다.",
      sourceClause: {
        article: "제12조 3항",
        page: 4,
        text: "22시 이후 발생한 식사비는 부서장의 사전 승인을 받은 경우에 한하여 정산한다.",
      },
      confidence: 0.81,
    },
    {
      id: `${id}-r3`,
      category: "TRAVEL",
      scope: "PER_TRIP",
      limit: 1_500_000,
      conditions: {},
      requiredEvidence: ["출장신청서"],
      prohibitions: [],
      severity: "VIOLATION",
      note: "국내외 출장 교통비는 1회 출장당 150만원을 초과할 수 없습니다.",
      sourceClause: {
        article: "제18조",
        page: 6,
        text: "출장 교통비는 1회 출장을 기준으로 1,500,000원의 범위 내에서 실비 정산한다.",
      },
      confidence: 0.9,
    },
    {
      id: `${id}-r4`,
      category: "LODGING",
      scope: "PER_PERSON",
      limit: 150_000,
      conditions: {},
      requiredEvidence: [],
      prohibitions: [],
      severity: "VIOLATION",
      note: "숙박비는 1인 1박 15만원까지 인정됩니다.",
      sourceClause: {
        article: "제19조 2항",
        page: 6,
        text: "숙박비는 1인 1박당 150,000원을 한도로 하며, 초과분은 개인 부담으로 한다.",
      },
      confidence: 0.88,
    },
    {
      id: `${id}-r5`,
      category: "SOFTWARE",
      scope: "PER_MONTH",
      limit: 500_000,
      conditions: {},
      requiredEvidence: ["구매요청서"],
      prohibitions: [],
      severity: "WARNING",
      note: "부서별 SaaS 구독료는 월 50만원을 초과할 경우 구매요청서가 필요합니다.",
      sourceClause: {
        article: "제24조",
        page: 8,
        text: "소프트웨어 및 구독 서비스 비용이 부서당 월 500,000원을 초과하는 경우 구매요청서를 첨부하여야 한다.",
      },
      confidence: 0.72,
    },
    {
      id: `${id}-r6`,
      category: "OFFICE_SUPPLIES",
      scope: "PER_RECEIPT",
      limit: 200_000,
      conditions: {},
      requiredEvidence: [],
      prohibitions: [],
      severity: "WARNING",
      note: "사무용품은 건당 20만원까지 부서 자율 집행이 가능합니다.",
      sourceClause: {
        article: "제21조",
        page: 7,
        text: "사무용품 구입은 건당 200,000원 이내에서 부서장 전결로 집행할 수 있다.",
      },
      confidence: 0.85,
    },
    {
      id: `${id}-r7`,
      category: "OTHER",
      scope: "PER_RECEIPT",
      limit: null,
      conditions: {},
      requiredEvidence: [],
      prohibitions: ["주류", "유흥", "골프", "노래방"],
      severity: "VIOLATION",
      note: "주류·유흥·골프 등 접대성 지출은 정산 대상이 아닙니다.",
      sourceClause: {
        article: "제13조",
        page: 5,
        text: "유흥업소 이용료, 주류 구입비, 골프장 이용료는 어떠한 경우에도 정산하지 아니한다.",
      },
      confidence: 0.68,
    },
  ]

  return {
    id,
    version,
    status: "DRAFT",
    sourceFileName: fileName,
    pageCount: 14,
    createdAt: new Date().toISOString(),
    activatedAt: null,
    rules,
    unmappedClauses: [
      "제31조 (해외출장) 지역별 일비는 별표 2에 따른다. — 별표를 참조하는 조항이라 금액을 확정하지 못했습니다.",
      "제14조 (경조사비) 사회통념상 상당한 범위 내에서 지급한다. — 금액 기준이 명시되어 있지 않습니다.",
    ],
  }
}
