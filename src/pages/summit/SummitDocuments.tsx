import { useState } from "react";
import {
  FileText,
  PenLine,
  IdCard,
  History,
  BookOpen,
  Linkedin,
  CheckSquare,
  Square,
  Sparkles,
  Gauge,
  Layers,
  RefreshCw,
  Copy,
  Download,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { WRITERS, type Writer } from "@/pages/summit/summitData";
import { PageHead, Card, MiniLabel, SampleNotice } from "@/pages/summit/components/ui";
import { generateDocuments, type DocType, type GeneratedDoc } from "@/services/summit/documentWriter";
import { cn } from "@/lib/utils";

const ICONS: Record<string, typeof FileText> = {
  file: FileText,
  penLine: PenLine,
  idCard: IdCard,
  history: History,
  book: BookOpen,
  linkedin: Linkedin,
};

export default function SummitDocuments() {
  const [selected, setSelected] = useState<Record<string, boolean>>({ resume: true, linkedin: true });
  const [built, setBuilt] = useState<GeneratedDoc[] | null>(null);
  const [building, setBuilding] = useState(false);

  const selKeys = WRITERS.filter((w) => selected[w.key]).map((w) => w.key as DocType);
  const n = selKeys.length;
  const allSel = n === WRITERS.length;

  const toggle = (key: string) => {
    setSelected((prev) => ({ ...prev, [key]: !prev[key] }));
    setBuilt(null);
  };
  const selectAll = () => {
    setBuilt(null);
    if (allSel) setSelected({});
    else setSelected(Object.fromEntries(WRITERS.map((w) => [w.key, true])));
  };
  const build = async () => {
    if (n === 0 || building) return;
    setBuilding(true);
    try {
      setBuilt(await generateDocuments(selKeys));
    } finally {
      setBuilding(false);
    }
  };

  const nameFor = (t: DocType) => WRITERS.find((w) => w.key === t)?.name ?? t;
  const iconFor = (key: string) => ICONS[WRITERS.find((w) => w.key === key)?.icon ?? "file"] ?? FileText;

  return (
    <div className="flex flex-col gap-[18px]">
      <PageHead
        eyebrow="Career document writer"
        title="Build the documents your goals point to"
        sub="When this is wired, Summit will draft these from your own history, your current role, your ambitions and how you're wired — in a voice tuned to your PRISM strengths."
      />
      {/* The generator is not connected: `POST /v1/documents/generate` does not
          exist, and `generateDocuments` returns fixed drafts written for the
          wireframe's fictional person. Those drafts have Copy and Download
          buttons on them, so somebody could walk away with a CV of someone
          else's invented career believing it was theirs. Until the endpoint
          ships, this has to be impossible to mistake. */}
      <SampleNotice what="The drafts this produces are fixed examples for a made-up person — the writer isn't connected to your profile yet, so don't use them as your own." />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {WRITERS.map((w: Writer) => {
          const Icon = ICONS[w.icon] ?? FileText;
          const sel = !!selected[w.key];
          return (
            <button
              key={w.key}
              onClick={() => toggle(w.key)}
              className={cn(
                "flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition-all hover:-translate-y-0.5",
                sel ? "border-[#127A8A] bg-gradient-to-br from-white to-[#127A8A]/10" : "border-slate-200 bg-white hover:border-[#127A8A]",
              )}
            >
              <span className={cn("mt-0.5 flex-shrink-0", sel ? "text-[#127A8A]" : "text-[#7C93B5]")}>
                {sel ? <CheckSquare className="h-5 w-5" /> : <Square className="h-5 w-5" />}
              </span>
              <span className={cn("grid h-9 w-9 flex-shrink-0 place-items-center rounded-[10px]", sel ? "bg-[#127A8A] text-white" : "bg-[#F1ECE2] text-[#13294B]")}>
                <Icon className="h-5 w-5" />
              </span>
              <span className="min-w-0">
                <span className="block text-[15px] font-bold text-[#0B1B33]">{w.name}</span>
                <span className="mt-0.5 block text-[12.5px] leading-snug text-[#13294B]/80">{w.desc}</span>
                <span className="mt-1.5 flex flex-col gap-1 text-[11px] text-[#7C93B5]">
                  <span className="inline-flex items-center gap-1.5">
                    <Gauge className="h-3 w-3" /> {w.len}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Layers className="h-3 w-3" /> {w.pulls}
                  </span>
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-3.5 rounded-xl border border-slate-200 bg-white px-4 py-3">
        <button onClick={selectAll} className="inline-flex items-center gap-2 text-[13.5px] font-semibold text-[#13294B]">
          <span className="text-[#127A8A]">{allSel ? <CheckSquare className="h-[18px] w-[18px]" /> : <Square className="h-[18px] w-[18px]" />}</span>
          {allSel ? "Clear all" : "Select all"}
        </button>
        <span className="ml-auto text-[13px] text-[#7C93B5]">
          {n} of {WRITERS.length} selected
        </span>
        <button
          onClick={build}
          disabled={n === 0 || building}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#127A8A] px-3.5 py-2 text-[13px] font-bold text-white hover:bg-[#0E5F6B] disabled:cursor-not-allowed disabled:opacity-45"
        >
          {building ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          Build{n ? ` (${n})` : ""}
        </button>
      </div>

      {built && built.length > 0 && (
        <>
          <MiniLabel>Sample drafts · {built.length}</MiniLabel>
          {/* Repeated next to the Copy/Download buttons on purpose: someone who
              scrolled straight to a result never saw the notice at the top. */}
          <SampleNotice what="These are example documents for a made-up person, not drafts about you." />
          {built.map((doc) => {
            const Icon = iconFor(doc.type);
            return (
              <Card key={doc.type} className="overflow-hidden !p-0">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-[#FBF7F0] px-4 py-3">
                  <div className="flex items-center gap-2 text-[14.5px] font-bold text-[#0B1B33]">
                    <Icon className="h-4 w-4" /> {nameFor(doc.type)}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={build}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11.5px] font-semibold text-[#13294B] hover:border-[#127A8A] hover:text-[#0E5F6B]"
                    >
                      <RefreshCw className="h-3 w-3" /> Regenerate
                    </button>
                    <button
                      onClick={() => {
                        void navigator.clipboard?.writeText(doc.content);
                        toast.success(`${nameFor(doc.type)} copied`);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11.5px] font-semibold text-[#13294B] hover:border-[#127A8A] hover:text-[#0E5F6B]"
                    >
                      <Copy className="h-3 w-3" /> Copy
                    </button>
                    <button
                      onClick={() => {
                        const blob = new Blob([doc.content], { type: "text/plain" });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = `${doc.type}.txt`;
                        a.click();
                        URL.revokeObjectURL(url);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11.5px] font-semibold text-[#13294B] hover:border-[#127A8A] hover:text-[#0E5F6B]"
                    >
                      <Download className="h-3 w-3" /> Download
                    </button>
                  </div>
                </div>
                <pre className="max-h-[340px] overflow-y-auto whitespace-pre-wrap break-words px-4 py-4 font-mono text-[12px] leading-relaxed text-[#13294B]">
                  {doc.content}
                </pre>
              </Card>
            );
          })}
        </>
      )}
    </div>
  );
}
