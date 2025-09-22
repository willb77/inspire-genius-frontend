import ProgressBar from "@/components/onboarding/ProgressBar";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "@/constants/routes";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function OnboardingDetailsOne() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-6">
        <ProgressBar current={1} total={2} />

        <div className="bg-white rounded-2xl shadow-[0_12px_30px_rgba(0,0,0,0.08)] p-6 md:p-8">
          <div className="text-center space-y-1">
            <h2 className="text-2xl font-semibold">Tell us more about you</h2>
            <p className="text-sm text-muted-foreground">Fill the forms below to add your details.</p>
          </div>

          <form
            className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              navigate(ROUTES.ONBOARDING_DETAILS.TWO);
            }}
          >
            <input
              placeholder="First Name"
              className="h-11 w-full rounded-md border border-gray-10 bg-transparent px-3 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring"
            />
            <input
              placeholder="Last Name"
              className="h-11 w-full rounded-md border border-gray-10 bg-transparent px-3 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring"
            />
            <input
              placeholder="Date of Birth"
              type="date"
              className="h-11 w-full rounded-md border border-gray-10 bg-transparent px-3 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring"
            />
            <input
              placeholder="Category"
              className="h-11 w-full rounded-md border border-gray-10 bg-transparent px-3 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring"
            />
            <div className="md:col-span-1 col-span-1">
              <Select>
                <SelectTrigger className="h-11 w-full rounded-md border border-gray-10">
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="owner">Owner</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <input
              placeholder="Category"
              className="h-11 w-full rounded-md border border-gray-10 bg-transparent px-3 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring"
            />
            <textarea
              placeholder="Tell us more about you (optional)"
              className="md:col-span-2 col-span-1 min-h-24 w-full rounded-md border border-gray-10 bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring"
            />

            <div className="md:col-span-2 col-span-1 mt-2 flex justify-end">
              <Button type="submit" className="h-11 w-36">
                Next
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
