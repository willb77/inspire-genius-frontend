import { Bell, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/context/useAuth";
import ConfirmDialog from "@/components/shared/ConfirmDialog";

export default function UserTopHeader() {
  const { user, logout } = useAuth();
  const email = user?.email ?? "";
  const name = (email && email.split("@")[0]) || "User";
  const initial = (name?.[0] ?? "U").toUpperCase();
  return (
    <div className="mt-2 flex items-center justify-between w-full">
      <div className="ml-1 w-full flex flex-col text-left">
        <p className="text-base md:text-2xl font-medium text-black-250">Welcome! {name}</p>
        <p className="text-xs text-black-250">
          Your AI coaches are ready—let’s begin!
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" aria-label="Notifications" className="relative">
          <Bell className="size-5" />
          <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Open profile menu"
              className="flex items-center gap-2 rounded-2xl bg-gray-50 px-2.5 py-1.5 shadow-sm hover:bg-gray-100"
            >
              <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-amber-200">
                <span className="text-sm font-semibold leading-none">{initial}</span>
              </span>
              <ChevronDown className="h-4 w-4 text-gray-700" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72">
            <DropdownMenuLabel className="font-normal">
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-amber-200">
                  <span className="text-sm font-semibold leading-none">{initial}</span>
                </span>
                <div>
                  <p className="text-sm font-medium">{name}</p>
                  <p className="text-xs text-muted-foreground break-all">{email}</p>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Profile</DropdownMenuItem>
            <DropdownMenuItem>Settings</DropdownMenuItem>
            <DropdownMenuItem>Help &amp; Support</DropdownMenuItem>
            <DropdownMenuSeparator />
            <ConfirmDialog
              title="Log out"
              description="Are you sure you want to log out?"
              confirmText="Log out"
              onConfirm={logout}
              trigger={
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                  Logout
                </DropdownMenuItem>
              }
            />
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
