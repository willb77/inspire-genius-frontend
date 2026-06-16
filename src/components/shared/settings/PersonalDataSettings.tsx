/**
 * PersonalDataSettings — structured profile-fact form (G6).
 *
 * Replaces P4's file-only drop-zones. Each section is a single fact
 * `(category, key)` plus a free-form `value` textarea. Per-row Save
 * writes via `useCreateFact()`. Resume upload is preserved but the
 * fact-extraction step is deliberately stubbed — server-side extraction
 * is a future change.
 */

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Save, Upload } from "lucide-react";
import { toast } from "sonner";

import { useMyProfile, useCreateFact } from "@/hooks/profile/useProfile";
import { useDocumentUpload } from "@/hooks/documents/useDocumentUpload";
import type { ProfileFact } from "@/types/profile/profile-types";

const BIO_MAX_CHARS = 500;

type Row = {
  category: string;
  key: string;
  label: string;
  placeholder: string;
  multiline: boolean;
  maxChars?: number;
};

const ROWS: Row[] = [
  {
    category: "bio",
    key: "summary",
    label: "Bio / short summary",
    placeholder: "Tell Meridian a little about yourself…",
    multiline: true,
    maxChars: BIO_MAX_CHARS,
  },
  {
    category: "career",
    key: "current_role",
    label: "Current role",
    placeholder: "e.g. Senior Product Manager",
    multiline: false,
  },
  {
    category: "career",
    key: "industry",
    label: "Industry",
    placeholder: "e.g. Healthcare SaaS",
    multiline: false,
  },
  {
    category: "career",
    key: "years_experience",
    label: "Years of experience",
    placeholder: "e.g. 12",
    multiline: false,
  },
  {
    category: "goals",
    key: "primary_goals",
    label: "Goals",
    placeholder: "What are you working toward right now? (one per line is fine)",
    multiline: true,
  },
  {
    category: "constraints",
    key: "primary_constraints",
    label: "Constraints",
    placeholder: "Anything Meridian should avoid or be aware of?",
    multiline: true,
  },
];

function pickLatestValue(
  facts: ProfileFact[] | undefined,
  category: string,
  key: string,
): string {
  if (!facts) return "";
  // Server returns facts ordered by created_at desc; take the first non-superseded.
  const match = facts.find(
    (f) => f.category === category && f.key === key && !f.superseded_at,
  );
  return match?.value ?? "";
}

export default function PersonalDataSettings() {
  const { data: profile, isLoading } = useMyProfile();
  const createFact = useCreateFact();

  // Local form state keyed by `${category}.${key}`. Initialised from the
  // profile snapshot once it arrives; the user can override and Save.
  const [values, setValues] = useState<Record<string, string>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    const next: Record<string, string> = {};
    for (const row of ROWS) {
      const k = `${row.category}.${row.key}`;
      next[k] = pickLatestValue(profile.facts, row.category, row.key);
    }
    setValues(next);
  }, [profile]);

  const handleChange = (rowKey: string, value: string, max?: number) => {
    const next = max ? value.slice(0, max) : value;
    setValues((prev) => ({ ...prev, [rowKey]: next }));
  };

  const handleSaveRow = async (row: Row) => {
    const rowKey = `${row.category}.${row.key}`;
    const value = (values[rowKey] ?? "").trim();
    if (!value) {
      toast.error(`${row.label} is empty.`);
      return;
    }
    setSavingKey(rowKey);
    try {
      await createFact.mutateAsync({
        category: row.category,
        key: row.key,
        value,
        source: "user_input",
      });
      toast.success(`${row.label} saved.`);
    } catch (err) {
      const msg =
        (err as { response?: { data?: { message?: string } }; message?: string })
          .response?.data?.message ??
        (err as Error).message ??
        "Failed to save.";
      toast.error(msg);
    } finally {
      setSavingKey(null);
    }
  };

  // Resume upload — preserves the existing useDocumentUpload pipeline.
  // The fact-extraction step is intentionally a stub; see the TODO below.
  const upload = useDocumentUpload();
  const [resumeFile, setResumeFile] = useState<File | null>(null);

  const handleResumeUpload = async () => {
    if (!resumeFile) return;
    try {
      const doc = await upload.mutateAsync({
        file: resumeFile,
        docKind: "resume",
        tags: ["resume", "profile-source"],
      });
      // TODO: server-side fact extraction not wired yet. Once the extractor
      // lands (separate PR) this hook can fire a POST to the agent-engine
      // that parses doc → facts and the profile snapshot will auto-refresh.
      console.debug("TODO: server-side fact extraction not wired yet", doc);
      toast.success(`Uploaded ${resumeFile.name}.`);
      setResumeFile(null);
    } catch (err) {
      const msg = (err as Error).message ?? "Upload failed.";
      toast.error(msg);
    }
  };

  const remainingByRow = useMemo(() => {
    const out: Record<string, number | undefined> = {};
    for (const row of ROWS) {
      if (!row.maxChars) continue;
      const rowKey = `${row.category}.${row.key}`;
      out[rowKey] = row.maxChars - (values[rowKey]?.length ?? 0);
    }
    return out;
  }, [values]);

  return (
    <Card className="shadow-sm" data-testid="personal-data-settings">
      <CardHeader className="text-left">
        <CardTitle className="text-lg font-semibold">Personal Data</CardTitle>
        <p className="text-sm text-muted-foreground">
          Share a short profile so Meridian can be more useful. Each row saves
          individually — only fields you fill in are stored.
        </p>
      </CardHeader>
      <CardContent className="space-y-5 text-left">
        {ROWS.map((row) => {
          const rowKey = `${row.category}.${row.key}`;
          const remaining = remainingByRow[rowKey];
          const isSaving = savingKey === rowKey;
          const value = values[rowKey] ?? "";
          const inputId = `pds-${row.category}-${row.key}`;
          return (
            <div key={rowKey} className="space-y-2">
              <Label htmlFor={inputId}>{row.label}</Label>
              {row.multiline ? (
                <Textarea
                  id={inputId}
                  rows={row.key === "summary" ? 3 : 4}
                  placeholder={row.placeholder}
                  value={value}
                  disabled={isLoading || isSaving}
                  onChange={(e) =>
                    handleChange(rowKey, e.target.value, row.maxChars)
                  }
                />
              ) : (
                <Input
                  id={inputId}
                  type="text"
                  placeholder={row.placeholder}
                  value={value}
                  disabled={isLoading || isSaving}
                  onChange={(e) => handleChange(rowKey, e.target.value)}
                />
              )}
              <div className="flex items-center justify-between">
                {row.maxChars !== undefined ? (
                  <span className="text-xs text-muted-foreground">
                    {remaining ?? 0} characters left
                  </span>
                ) : (
                  <span />
                )}
                <Button
                  type="button"
                  size="sm"
                  onClick={() => handleSaveRow(row)}
                  disabled={isSaving || isLoading || !value.trim()}
                >
                  {isSaving ? (
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-1.5 h-4 w-4" />
                  )}
                  Save
                </Button>
              </div>
            </div>
          );
        })}

        {/* Resume upload — optional, preserves existing upload pipeline. */}
        <div className="space-y-2 pt-2 border-t">
          <Label htmlFor="pds-resume">Upload resume (optional)</Label>
          <div className="flex items-center gap-2 flex-wrap">
            <Input
              id="pds-resume"
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={(e) => setResumeFile(e.target.files?.[0] ?? null)}
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={!resumeFile || upload.isPending}
              onClick={handleResumeUpload}
            >
              {upload.isPending ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-1.5 h-4 w-4" />
              )}
              Upload
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            We store the file and (soon) auto-extract role / industry / skills.
            For now you can still upload — extraction will be wired in a follow-up.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
