import { Label } from "@/components/ui/label"

/**
 * Labelled form row shared by the employee receipt form and the approver's
 * manual-entry dialog, so both screens style their fields identically.
 */
export function Field({
  id,
  label,
  icon,
  children,
}: {
  id: string
  label: string
  icon?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon && <span className="text-muted-foreground/70">{icon}</span>}
        {label}
      </Label>
      {children}
    </div>
  )
}
