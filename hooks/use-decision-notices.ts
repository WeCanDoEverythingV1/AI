"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import { isAbort, listApprovalRequests, messageFor } from "@/lib/api/endpoints"
import { parseServerTimestamp } from "@/lib/api/client"
import type { ApprovalRequestResponseDto, ApprovalStatus } from "@/types/api"

/**
 * Tells an employee when their request gets approved or rejected.
 *
 * The backend has no push channel and no per-user endpoint, so this polls
 * `GET /api/approval-requests`, keeps the ones submitted under this name, and
 * reports any that changed away from `PENDING` since the last check. What has
 * already been shown is remembered in `localStorage`, so a refresh does not
 * replay old decisions — and the very first visit seeds that record silently
 * instead of announcing every past decision at once.
 *
 * Identity is a plain name string because the app has no auth; two people with
 * the same name would see each other's notices.
 */

const POLL_MS = 20_000

const storageKey = (employeeName: string) => `baro:seen-decisions:${employeeName}`

type SeenMap = Record<string, ApprovalStatus>

function readSeen(key: string): SeenMap | null {
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as SeenMap) : null
  } catch {
    // Blocked or unavailable storage — decisions simply re-announce next session.
    return null
  }
}

function writeSeen(key: string, value: SeenMap) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* ignore */
  }
}

export type DecisionNotice = {
  id: number
  merchant: string
  amount: number
  status: Exclude<ApprovalStatus, "PENDING">
}

export function useDecisionNotices(employeeName: string) {
  const [notices, setNotices] = useState<DecisionNotice[]>([])
  /** This employee's own requests, newest first — the same poll feeds the list. */
  const [requests, setRequests] = useState<ApprovalRequestResponseDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const pollRef = useRef<AbortController | null>(null)

  const check = useCallback(async () => {
    if (!employeeName) return

    pollRef.current?.abort()
    const controller = new AbortController()
    pollRef.current = controller

    try {
      const all = await listApprovalRequests({ signal: controller.signal })
      if (controller.signal.aborted) return

      const mine = all
        .filter((r) => r.employeeName === employeeName)
        .sort(
          (a, b) =>
            parseServerTimestamp(b.createdAt).getTime() -
            parseServerTimestamp(a.createdAt).getTime(),
        )
      setRequests(mine)
      setError(null)

      const key = storageKey(employeeName)
      const seen = readSeen(key)

      const current: SeenMap = {}
      for (const r of mine) current[r.id] = r.status

      // No record yet: adopt the current state rather than announcing history.
      if (seen === null) {
        writeSeen(key, current)
        return
      }

      const fresh = mine.filter(
        (r) => r.status !== "PENDING" && seen[r.id] !== r.status,
      )

      writeSeen(key, current)
      if (fresh.length === 0) return

      setNotices((prev) => {
        const known = new Set(prev.map((n) => n.id))
        const added = fresh
          .filter((r) => !known.has(r.id))
          .map((r) => ({
            id: r.id,
            merchant: r.merchant,
            amount: r.amount,
            status: r.status as DecisionNotice["status"],
          }))
        return added.length > 0 ? [...added, ...prev] : prev
      })
    } catch (caught) {
      if (controller.signal.aborted || isAbort(caught)) return
      // A failed poll must not interrupt the form; surface it only in the list.
      setError(messageFor(caught, "결재 현황을 불러오지 못했습니다."))
    } finally {
      if (pollRef.current === controller) {
        pollRef.current = null
        setLoading(false)
      }
    }
  }, [employeeName])

  useEffect(() => {
    void check()
    const timer = window.setInterval(() => void check(), POLL_MS)

    // Coming back to the tab is the moment a decision is most likely waiting.
    const onFocus = () => {
      if (document.visibilityState === "visible") void check()
    }
    document.addEventListener("visibilitychange", onFocus)
    window.addEventListener("focus", onFocus)

    return () => {
      window.clearInterval(timer)
      document.removeEventListener("visibilitychange", onFocus)
      window.removeEventListener("focus", onFocus)
      pollRef.current?.abort()
    }
  }, [check])

  const dismiss = useCallback(
    (id: number) => setNotices((prev) => prev.filter((n) => n.id !== id)),
    [],
  )

  return { notices, dismiss, refresh: check, requests, loading, error }
}
