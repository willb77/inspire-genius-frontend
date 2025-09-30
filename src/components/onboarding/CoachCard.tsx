import { Button } from "@/components/ui/button";
import { CircleQuestionMark, Volume2, SquarePen } from "lucide-react";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import MultiSelect from "@/components/ui/multi-select";

export interface CoachCardProps {
  title: string;
  gender: string;
  accent: string;
  tone: string;
  extraCount?: number; // e.g., 3 for "3+"
  onEdit?: () => void;
}

const GENDER_OPTIONS = [
  { label: "Male", value: "male" },
  { label: "Female", value: "female" },
  { label: "Other", value: "other" },
] as const;

const ACCENT_OPTIONS = [
  { label: "American", value: "american" },
  { label: "British", value: "british" },
  { label: "Indian", value: "indian" },
  { label: "Australian", value: "australian" },
] as const;

const TONE_OPTIONS = [
  { label: "Warm", value: "warm" },
  { label: "Motivative", value: "motivativ" },
  { label: "Calm", value: "calm" },
  { label: "Friendly", value: "friendly" },
  { label: "Confident", value: "confident" },
  { label: "Professional", value: "professional" },
];

export default function CoachCard({ title, gender, accent, tone, extraCount = 0, onEdit }: CoachCardProps) {
  const [isEditing, setIsEditing] = useState(false);

  // local edit state
  const [g, setG] = useState<string | undefined>(
    GENDER_OPTIONS.find((x) => x.label.toLowerCase() === gender.toLowerCase())?.value ?? "male"
  );
  const [a, setA] = useState<string | undefined>(
    ACCENT_OPTIONS.find((x) => x.label.toLowerCase() === accent.toLowerCase())?.value ?? "american"
  );
  const initialTones = tone
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .map((t) => TONE_OPTIONS.find((x) => x.label.toLowerCase() === t)?.value)
    .filter(Boolean) as string[];
  const [tones, setTones] = useState<string[]>(initialTones.length ? initialTones : ["warm", "motivativ"]);

  return (
    <div className="bg-white rounded-2xl shadow-[4px_4px_20px_4px_rgba(0,0,0,0.1)] p-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <h3 className="text-xl font-semibold tracking-tight">{title}</h3>
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground rounded-full p-1"
          aria-label="Help"
        >
          <CircleQuestionMark className="h-4 w-4" />
        </button>
      </div>

      {/* Fields */}
      <div className="mt-4 space-y-3 text-sm">
        <div>
          <div className="text-muted-foreground mb-1">Gender</div>
          {isEditing ? (
            <Select value={g} onValueChange={setG}>
              <SelectTrigger className="h-11 w-full rounded-xl bg-gray-100 border border-gray-10">
                <SelectValue placeholder="Select gender" />
              </SelectTrigger>
              <SelectContent>
                {GENDER_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <div className="bg-gray-100 text-foreground rounded-xl px-3 py-2 font-medium">{gender}</div>
          )}
        </div>
        <div>
          <div className="text-muted-foreground mb-1">Voice Accent</div>
          {isEditing ? (
            <Select value={a} onValueChange={setA}>
              <SelectTrigger className="h-11 w-full rounded-xl bg-gray-100 border border-gray-10">
                <SelectValue placeholder="Select accent" />
              </SelectTrigger>
              <SelectContent>
                {ACCENT_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <div className="bg-gray-100 text-foreground rounded-xl px-3 py-2 font-medium">{accent}</div>
          )}
        </div>
        <div>
          <div className="text-muted-foreground mb-1">Voice Tone</div>
          {isEditing ? (
            <MultiSelect
              value={tones}
              onChange={setTones}
              options={TONE_OPTIONS}
              placeholder="Select tones"
              className="rounded-xl"
              maxVisible={3}
            />
          ) : (
            <div className="bg-gray-100 text-foreground rounded-xl px-3 py-2 font-medium flex items-center gap-2">
              <span className="flex-1">{tone}</span>
              {extraCount > 0 ? (
                <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-lg font-medium">
                  {extraCount}+
                </span>
              ) : null}
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="mt-6 flex items-center gap-3">
        <Button variant="outline" size="icon" className="h-11 w-11 rounded-xl border border-blue-primary">
          <Volume2 className="h-5 w-5" />
        </Button>
        {isEditing ? (
          <div className="flex-1 flex gap-3">
            <Button
              variant="outline"
              className="h-11 flex-1 rounded-xl"
              onClick={() => setIsEditing(false)}
            >
              Cancel
            </Button>
            <Button
              className="h-11 flex-1 rounded-xl"
              onClick={() => {
                setIsEditing(false);
                onEdit?.();
              }}
            >
              Save
            </Button>
          </div>
        ) : (
          <Button
            variant="secondary"
            className="h-11 flex-1 rounded-xl bg-blue-10 hover:bg-blue-100 text-blue-primary"
            onClick={() => setIsEditing(true)}
          >
            Edit
            <SquarePen className="h-4 w-4 ml-2" />
          </Button>
        )}
      </div>
    </div>
  );
}
