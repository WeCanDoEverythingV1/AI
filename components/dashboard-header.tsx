"use client"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { initialsOf, roleLabels, type Role } from "@/lib/mock-data"
import { LogOut, ReceiptText } from "lucide-react"

export type ApproverView = "approvals" | "spend"

export function DashboardHeader({
  role,
  activeView,
  onNavigate,
  onSignOut,
  userName,
}: {
  role: Role
  activeView?: ApproverView
  onNavigate?: (view: ApproverView) => void
  onSignOut: () => void
  userName: string
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-card/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <ReceiptText className="size-4.5" />
          </div>
          <span className="text-sm font-semibold tracking-tight">바로</span>
        </div>

        {role === "approver" && onNavigate && (
          <nav className="ml-4 hidden items-center gap-1 sm:flex">
            <NavItem
              active={activeView === "approvals"}
              onClick={() => onNavigate("approvals")}
            >
              결재 요청
            </NavItem>
            <NavItem active={activeView === "spend"} onClick={() => onNavigate("spend")}>
              지출 인사이트
            </NavItem>
          </nav>
        )}

        <div className="ml-auto flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <p className="text-xs font-medium leading-tight text-foreground">{userName}</p>
            <p className="text-[11px] leading-tight text-muted-foreground">
              {roleLabels[role]}
            </p>
          </div>
          <div className="flex size-8 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
            {initialsOf(userName)}
          </div>
          <Button variant="ghost" size="sm" onClick={onSignOut} className="gap-1.5">
            <LogOut className="size-4" />
            <span className="hidden sm:inline">역할 전환</span>
          </Button>
        </div>
      </div>

      {role === "approver" && onNavigate && (
        <nav className="flex items-center gap-1 border-t border-border px-4 py-2 sm:hidden">
          <NavItem active={activeView === "approvals"} onClick={() => onNavigate("approvals")}>
            결재 요청
          </NavItem>
          <NavItem active={activeView === "spend"} onClick={() => onNavigate("spend")}>
            지출 인사이트
          </NavItem>
        </nav>
      )}
    </header>
  )
}

function NavItem({
  active,
  onClick,
  children,
}: {
  active?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
        active
          ? "bg-accent text-accent-foreground"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      {children}
    </button>
  )
}
