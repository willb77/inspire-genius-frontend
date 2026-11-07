import { Link } from "react-router-dom"
import { ChevronDown, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { VIEW_AS_OPTIONS } from "@/constants/house/superAdminNav"

/**
 * "View as…" — replaces the classic "Role Views" menu group (house style,
 * area `admin`).
 *
 * Display only. Each option is a plain link to that role's home page, the same
 * destination the classic menu entry opens. It does not change the signed-in
 * role, the token, or any permission: what the page then shows is decided by
 * the same route guards as before.
 */
export function ViewAsSwitcher() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Eye className="h-4 w-4" aria-hidden="true" />
          View as…
          <ChevronDown className="h-4 w-4" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
          Opens that role's home page. Your own access doesn't change.
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {VIEW_AS_OPTIONS.map(({ to, label, icon: Icon }) => (
          <DropdownMenuItem key={to} asChild>
            <Link to={to} className="flex items-center gap-2">
              <Icon className="h-4 w-4" aria-hidden="true" />
              {label}
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
