"use client"

import { useState } from "react"
import type { Role } from "@/lib/mock-data"
import { UserSelection } from "@/components/user-selection"
import { DashboardHeader, type ApproverView } from "@/components/dashboard-header"
import { EmployeeDashboard } from "@/components/employee-dashboard"
import { ApproverDashboard } from "@/components/approver-dashboard"
import { SubscriptionAlert } from "@/components/subscription-alert"
import { PolicyConsole } from "@/components/policy-console"

const names: Record<Role, string> = {
  employee: "김대리",
  approver: "정부장",
}

export function AppShell() {
  const [role, setRole] = useState<Role | null>(null)
  const [approverView, setApproverView] = useState<ApproverView>("approvals")

  if (!role) {
    return <UserSelection onSelect={setRole} />
  }

  return (
    <div className="min-h-svh bg-background">
      <DashboardHeader
        role={role}
        userName={names[role]}
        activeView={role === "approver" ? approverView : undefined}
        onNavigate={role === "approver" ? setApproverView : undefined}
        onSignOut={() => {
          setRole(null)
          setApproverView("approvals")
        }}
      />
      {role === "employee" && <EmployeeDashboard employeeName={names[role]} />}
      {role === "approver" && approverView === "approvals" && <ApproverDashboard />}
      {role === "approver" && approverView === "spend" && <SubscriptionAlert />}
      {role === "approver" && approverView === "policy" && <PolicyConsole />}
    </div>
  )
}
