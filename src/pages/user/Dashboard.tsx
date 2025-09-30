import UserLayout from "@/layouts/UserLayout";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import UserCoachCard from "@/components/user/UserCoachCard";
import { useNavigate } from "react-router-dom";

const COACHES = [
  { title: "Team Coach", gender: "Male", accent: "American", tone: "Warm , Motivative", extraCount: 3 },
  { title: "Train Coach", gender: "Male", accent: "American", tone: "Warm , Motivative", extraCount: 3 },
  { title: "Job Fit Coach", gender: "Male", accent: "American", tone: "Warm , Motivative", extraCount: 3 },
  { title: "Leadership Coach", gender: "Male", accent: "American", tone: "Motivative", extraCount: 0 },
  { title: "Well Being Coach", gender: "Male", accent: "American", tone: "Calm", extraCount: 0 },
  { title: "Career Coach", gender: "Male", accent: "American", tone: "Warm , Motivative", extraCount: 3 },
] as const;

export default function Dashboard() {
  const navigate = useNavigate();
  const slugify = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-");
  return (
    <UserLayout>
      <div className="space-y-6">
        <div className="bg-transparent rounded-xl p-4" data-tour="dashboard-coach-list">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold">Choose a coach to chat</h2>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input placeholder="Search.." className="!bg-white pl-9" />
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {COACHES.map((c, idx) => (
              <div key={c.title} data-tour={idx < 3 ? `coach-card-${idx + 1}` : undefined}>
                <UserCoachCard
                  title={c.title}
                  gender={c.gender}
                  accent={c.accent}
                  tone={c.tone}
                  extraCount={c.extraCount}
                  onChat={() => navigate(`/dashboard/${slugify(c.title)}/chat`)}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </UserLayout>
  );
}
