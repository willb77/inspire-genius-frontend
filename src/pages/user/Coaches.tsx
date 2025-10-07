import { useMemo, useState } from "react";
import UserLayout from "@/layouts/UserLayout";
import CoachCard from "@/components/onboarding/CoachCard";
import IconInput from "@/components/ui/icon-input";
import { Search } from "lucide-react";
import { toast } from "sonner";

export default function Coaches() {
  const [query, setQuery] = useState("");

  const coaches = useMemo(
    () => [
      { title: "Team Coach", gender: "Male", accent: "American", tone: "Warm , Motivative", extraCount: 3 },
      { title: "Train Coach", gender: "Male", accent: "American", tone: "Warm , Motivative", extraCount: 3 },
      { title: "Job Fit Coach", gender: "Male", accent: "American", tone: "Warm , Motivative", extraCount: 3 },
      { title: "Leadership Coach", gender: "Male", accent: "American", tone: "Motivative" },
      { title: "Well Being Coach", gender: "Male", accent: "American", tone: "Calm" },
      { title: "Career Coach", gender: "Male", accent: "American", tone: "Warm , Motivative", extraCount: 3 },
    ],
    []
  );

  const filtered = useMemo(
    () => coaches.filter((c) => c.title.toLowerCase().includes(query.trim().toLowerCase())),
    [coaches, query]
  );

  const handleSaved = (coachTitle: string) => {
    toast.success("Changes Saved Successfully!", {
      description: `Your changes on ${coachTitle} have been saved successfully.`,
    });
  };

  return (
    <UserLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight">Coaches</h1>
          <div className="w-full max-w-xs">
            <IconInput
              placeholder="Search.."
              leftIcon={<Search className="size-4" />}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="rounded-xl bg-gray-100"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((c, idx) => {
            const tourAttr =
              idx === 0 ? { 'data-tour': 'coach-card-1-coaches' } :
              idx === 1 ? { 'data-tour': 'coach-card-2-coaches' } :
              idx === 2 ? { 'data-tour': 'coach-card-3-coaches' } : {};
            return (
              <div key={c.title} {...tourAttr}>
                <CoachCard
                  title={c.title}
                  gender={c.gender}
                  accent={c.accent}
                  tone={c.tone}
                  extraCount={c.extraCount}
                  onEdit={() => handleSaved(c.title)}
                />
              </div>
            );
          })}
        </div>
      </div>
    </UserLayout>
  );
}
