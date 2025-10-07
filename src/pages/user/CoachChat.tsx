import UserLayout from "@/layouts/UserLayout";
import ChatHistory from "@/components/user/chat/ChatHistory";
import ChatWindow from "@/components/user/chat/ChatWindow";
import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { HistoryGroup } from "@/types/home-dashboard-types";

function titleCaseFromSlug(slug: string): string {
  if (!slug) return "Coach";
  return slug
    .split("-")
    .filter(Boolean)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" ");
}

export default function CoachChat() {
  const { coach = "" } = useParams();
  const navigate = useNavigate();
  const coachName = useMemo(() => titleCaseFromSlug(coach), [coach]);

  const [selectedId, setSelectedId] = useState<string | undefined>("1");

  const groups: HistoryGroup[] = [
    {
      label: "Today",
      items: [
        { id: "1", title: "Sample Name", preview: "Lorem ipsum shared message...", timeLabel: "1 min ago" },
        { id: "2", title: "Sample Name", preview: "Lorem ipsum shared message...", timeLabel: "10 mins ago" },
        { id: "3", title: "Sample Name", preview: "Lorem ipsum shared message...", timeLabel: "24 mins ago" },
      ],
    },
    {
      label: "Yesterday",
      items: [
        { id: "4", title: "Sample Name", preview: "Lorem ipsum shared message...", timeLabel: "10:17 PM" },
        { id: "5", title: "Sample Name", preview: "Lorem ipsum shared message...", timeLabel: "8:53 PM" },
        { id: "6", title: "Sample Name", preview: "Lorem ipsum shared message...", timeLabel: "7:30 PM" },
      ],
    },
  ];

  return (
    <UserLayout>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-4 h-full" data-tour="chat-history">
          <ChatHistory
            groups={groups}
            selectedId={selectedId}
            onSelect={setSelectedId}
            className="h-full"
          />
        </div>
        <div className="lg:col-span-8" data-tour="chat-window">
          <ChatWindow coachName={`${coachName} Coach`} onBack={() => navigate(-1)} />
        </div>
      </div>
    </UserLayout>
  );
}
