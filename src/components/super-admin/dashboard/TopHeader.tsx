//this file is currently not being used, based on the feedback will be adding this header to the super admin dashboard
import { Bell, ChevronDown, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import SearchBar from "@/components/shared/SearchBar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export default function TopHeader() {
  return (
    <div className="mt-2 flex items-center justify-between w-full">
      <SearchBar />
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Notifications"
          className="relative"
        >
          <Bell className="size-5" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Open profile menu"
              className="flex items-center gap-2 "
            >
              <Avatar className="h-8 w-8 bg-gray-200">
                <AvatarFallback className="flex items-center justify-center">
                  <User className="h-5 w-5 text-gray-600" />
                </AvatarFallback>
              </Avatar>

              <span className="text-sm font-medium text-gray-600">
                David Smith
              </span>
              <ChevronDown className="h-4 w-4 text-gray-700" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex items-center gap-3">
                <div>
                  <p className="text-sm font-medium">Jhon</p>
                  <p className="text-xs text-muted-foreground">
                    john@example.com
                  </p>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Profile</DropdownMenuItem>
            <DropdownMenuItem>Settings</DropdownMenuItem>
            <DropdownMenuItem>Help &amp; Support</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Logout</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
