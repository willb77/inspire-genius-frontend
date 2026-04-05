/**
 * Collapsible panel for editing template-level metadata.
 */

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ChevronDown, ChevronUp, X } from "lucide-react";
import { useDagStore } from "../hooks/useDagStore";

const metadataSchema = z.object({
  name: z.string().min(1, "Template name is required").max(255),
  description: z.string().min(1, "Description is required"),
});

type MetadataForm = z.infer<typeof metadataSchema>;

export function TemplateMetadataPanel({ className }: { className?: string }) {
  const [expanded, setExpanded] = useState(false);
  const { template, updateTemplate, isDirty } = useDagStore();
  const [keywords, setKeywords] = useState<string[]>(
    template.triggerKeywords ?? []
  );
  const [kwInput, setKwInput] = useState("");

  const { register, watch } = useForm<MetadataForm>({
    resolver: zodResolver(metadataSchema),
    defaultValues: {
      name: template.name ?? "",
      description: template.description ?? "",
    },
  });

  const values = watch();

  useEffect(() => {
    const timer = setTimeout(() => {
      updateTemplate({ name: values.name, description: values.description });
    }, 300);
    return () => clearTimeout(timer);
  }, [values.name, values.description]);

  const addKeyword = () => {
    const kw = kwInput.trim();
    if (kw && !keywords.includes(kw)) {
      const updated = [...keywords, kw];
      setKeywords(updated);
      updateTemplate({ triggerKeywords: updated });
    }
    setKwInput("");
  };

  const removeKeyword = (kw: string) => {
    const updated = keywords.filter((k) => k !== kw);
    setKeywords(updated);
    updateTemplate({ triggerKeywords: updated });
  };

  if (!expanded) {
    return (
      <div
        className={`px-4 py-2 bg-white border-b border-slate-200 flex items-center justify-between cursor-pointer hover:bg-slate-50 ${className ?? ""}`}
        onClick={() => setExpanded(true)}
      >
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium text-slate-700">
            Template: {template.name || "Untitled"}
          </span>
          {template.version && (
            <span className="text-xs text-slate-400">v{template.version}</span>
          )}
          {isDirty && (
            <span className="text-xs text-amber-500">· Unsaved changes</span>
          )}
        </div>
        <ChevronDown size={16} className="text-slate-400" />
      </div>
    );
  }

  return (
    <div
      className={`bg-white border-b border-slate-200 ${className ?? ""}`}
    >
      <div
        className="px-4 py-2 flex items-center justify-between cursor-pointer hover:bg-slate-50"
        onClick={() => setExpanded(false)}
      >
        <span className="text-sm font-semibold text-slate-700">
          Template Metadata
        </span>
        <ChevronUp size={16} className="text-slate-400" />
      </div>

      <div className="px-4 pb-4 grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-medium text-slate-600 block mb-1">
            Name *
          </label>
          <input
            {...register("name")}
            className="w-full border border-slate-200 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600 block mb-1">
            Version
          </label>
          <input
            value={template.version ?? 1}
            readOnly
            className="w-full border border-slate-100 bg-slate-50 rounded-md px-3 py-1.5 text-sm text-slate-400"
          />
        </div>
        <div className="col-span-2">
          <label className="text-xs font-medium text-slate-600 block mb-1">
            Description *
          </label>
          <textarea
            {...register("description")}
            rows={2}
            className="w-full border border-slate-200 rounded-md px-3 py-1.5 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div className="col-span-2">
          <label className="text-xs font-medium text-slate-600 block mb-1">
            Trigger Keywords
          </label>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {keywords.map((kw) => (
              <span
                key={kw}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full"
              >
                {kw}
                <button onClick={() => removeKeyword(kw)}>
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={kwInput}
              onChange={(e) => setKwInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addKeyword())}
              placeholder="Add keyword..."
              className="flex-1 border border-slate-200 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={addKeyword}
              className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
            >
              Add
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
