"use client"

import { useCallback, useEffect, useState } from "react"

/**
 * Lets a screen clear finished requests out of its own list.
 *
 * The backend has no `DELETE /api/approval-requests/{id}`, so nothing is
 * removed server-side — this only hides rows for this person, in this browser.
 * That is why the UI says 숨기기 rather than 삭제: the approver hiding a row
 * does not remove it from the employee's list, and vice versa. Hiding is one-way
 * by request: there is no restore control, so clearing the storage key below is
 * the only way to bring a hidden row back.
 *
 * `scope` separates the lists (e.g. `approver`, `employee:김대리`).
 */

const storageKey = (scope: string) => `baro:hidden-requests:${scope}`

function read(scope: string): Set<number> {
  try {
    const raw = window.localStorage.getItem(storageKey(scope))
    return raw ? new Set(JSON.parse(raw) as number[]) : new Set()
  } catch {
    return new Set()
  }
}

function write(scope: string, ids: Set<number>) {
  try {
    window.localStorage.setItem(storageKey(scope), JSON.stringify([...ids]))
  } catch {
    // Blocked storage — hiding just does not survive a reload.
  }
}

export function useHiddenRequests(scope: string) {
  const [hidden, setHidden] = useState<Set<number>>(new Set())
  // localStorage is unavailable during SSR, so the first value arrives after mount.
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    setHidden(read(scope))
    setLoaded(true)
  }, [scope])

  useEffect(() => {
    if (loaded) write(scope, hidden)
  }, [scope, hidden, loaded])

  const hide = useCallback((id: number) => {
    setHidden((prev) => {
      if (prev.has(id)) return prev
      const next = new Set(prev)
      next.add(id)
      return next
    })
  }, [])

  return { hidden, hide }
}
