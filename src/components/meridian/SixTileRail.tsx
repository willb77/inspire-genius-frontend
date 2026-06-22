import { useCallback, useMemo, useState } from "react";
import { ChevronRight, Plus } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useAgentConversation } from "@/hooks/agents/useAgentConversation";
import { useListDocuments } from "@/hooks/documents/useListDocuments";
import { useProjects, useUpdateProjectInstructions } from "@/hooks/projects/useProjects";

const AGENT_ID = "meridian";

// localStorage key for tile open/closed state — survives reloads, per the
// wireframe brief ("Same chevron + session-remembered open/closed state").
const TILES_STORAGE_KEY = "meridian:tiles";

type TileId =
  | "active"
  | "history"
  | "last5"
  | "projects"
  | "instructions"
  | "knowledge";

// Default-state map mirrors the wireframe + the wiring-plan Phase-1 spec:
// Active OPEN, History COLLAPSED, the rest OPEN.
const DEFAULT_OPEN: Record<TileId, boolean> = {
  active: true,
  history: false,
  last5: true,
  projects: true,
  instructions: true,
  knowledge: true,
};

function loadTileState(): Record<TileId, boolean> {
  try {
    const raw = localStorage.getItem(TILES_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_OPEN };
    const parsed = JSON.parse(raw) as Partial<Record<TileId, boolean>>;
    return { ...DEFAULT_OPEN, ...parsed };
  } catch {
    return { ...DEFAULT_OPEN };
  }
}

// ── Conversation shapes (from useAgentConversation) ────────────────────
type ConversationRow = {
  id: string;
  title?: string;
  created_at?: string;
  updated_at?: string;
};

type ConversationListResponse = {
  data?: { conversations?: ConversationRow[] };
};

function formatRelative(input?: string): string {
  if (!input) return "";
  try {
    const d = new Date(input);
    if (Number.isNaN(d.getTime())) return "";
    return formatDistanceToNow(d, { addSuffix: true });
  } catch {
    return "";
  }
}

// ── Document shapes (from useListDocuments) ────────────────────────────
type DocFile = {
  id: string;
  filename: string;
  file_type?: string;
};

type DocGroup = { files?: DocFile[] };
type DocListResponse = { date_groups?: DocGroup[] };

type PillTone = "navy" | "orange" | "green" | "gray";

function Pill({ tone, children }: { tone: PillTone; children: React.ReactNode }) {
  const toneClass: Record<PillTone, string> = {
    navy: "bg-primary/10 text-primary",
    orange: "bg-amber-100 text-amber-800",
    green: "bg-emerald-100 text-emerald-800",
    gray: "bg-muted text-muted-foreground",
  };
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-semibold",
        toneClass[tone],
      )}
    >
      {children}
    </span>
  );
}

type TileProps = {
  id: TileId;
  title: string;
  open: boolean;
  onToggle: (id: TileId) => void;
  badge?: React.ReactNode;
  children: React.ReactNode;
};

function Tile({ id, title, open, onToggle, badge, children }: TileProps) {
  return (
    <section className="rounded-xl border bg-card">
      <button
        type="button"
        className="flex w-full items-center justify-between px-4 py-3"
        aria-expanded={open}
        aria-controls={`rail-tile-${id}`}
        onClick={() => onToggle(id)}
        data-testid={`rail-toggle-${id}`}
      >
        <span className="flex items-center gap-2">
          <ChevronRight
            className={cn(
              "size-4 text-primary transition-transform",
              open && "rotate-90",
            )}
          />
          <span className="text-sm font-bold text-primary">{title}</span>
        </span>
        {badge}
      </button>
      {open && (
        <div id={`rail-tile-${id}`} className="border-t" data-testid={`rail-body-${id}`}>
          {children}
        </div>
      )}
    </section>
  );
}

export type SixTileRailProps = {
  /** Currently-active conversation id (highlighted in the lists). */
  activeConversationId?: string;
  /** Make a conversation active when a rail row is clicked. */
  onSelectConversation?: (id: string) => void;
  className?: string;
};

/**
 * SixTileRail — Surface 1 (Meridian Chat) Phase 1, layout-only.
 *
 * The standard collapsible IG left nav already exists (UserLayout →
 * SidebarScaffold). This component adds the second rail the wireframe
 * introduces, so the desktop layout reads: nav │ six-tile rail │ main.
 *
 * Tiles:
 *   Active sessions — recent conversations (real, useAgentConversation)
 *   History         — full conversation list (real)
 *   Last 5 chats    — five most-recent conversations (real)
 *   Projects        — STUB (useProjects → projectsService; no backend yet)
 *   Instructions    — STUB, project-scoped guidance textarea
 *   Knowledge       — uploaded documents (real, useListDocuments)
 *
 * Open/closed state per tile persists in localStorage under "meridian:tiles".
 * Wireframe: https://dj7od5nj42063.cloudfront.net/ig-surfaces/meridian-chat/
 */
export default function SixTileRail({
  activeConversationId,
  onSelectConversation,
  className,
}: SixTileRailProps) {
  const [openState, setOpenState] = useState<Record<TileId, boolean>>(loadTileState);

  const toggleTile = useCallback((id: TileId) => {
    setOpenState((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try {
        localStorage.setItem(TILES_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // best-effort persistence; ignore quota / private-mode failures
      }
      return next;
    });
  }, []);

  // ── Conversations (Active / History / Last 5) ────────────────────────
  const { data: convData, isLoading: convLoading } = useAgentConversation(AGENT_ID, {
    page: 1,
    limit: 50,
  });

  const conversations = useMemo<ConversationRow[]>(() => {
    const resp = convData as ConversationListResponse | undefined;
    const list = resp?.data?.conversations;
    if (!Array.isArray(list)) return [];
    return [...list].sort((a, b) => {
      const aT = new Date(a.updated_at || a.created_at || 0).getTime();
      const bT = new Date(b.updated_at || b.created_at || 0).getTime();
      return bT - aT;
    });
  }, [convData]);

  const activeSessions = useMemo(() => conversations.slice(0, 3), [conversations]);
  const lastFive = useMemo(() => conversations.slice(0, 5), [conversations]);

  // ── Projects + Instructions (STUB) ───────────────────────────────────
  const { data: projects = [], isLoading: projectsLoading } = useProjects();
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>(
    undefined,
  );
  const selectedProject = useMemo(
    () => projects.find((p) => p.id === selectedProjectId) ?? projects[0],
    [projects, selectedProjectId],
  );
  const [instructionsDraft, setInstructionsDraft] = useState<string | null>(null);
  const updateInstructions = useUpdateProjectInstructions();

  const instructionsValue =
    instructionsDraft ?? selectedProject?.instructions ?? "";

  // ── Knowledge (real documents) ───────────────────────────────────────
  const { data: docData, isLoading: docsLoading } = useListDocuments(1, 10);
  const documents = useMemo<DocFile[]>(() => {
    const resp = docData as DocListResponse | undefined;
    const groups = resp?.date_groups;
    if (!Array.isArray(groups)) return [];
    return groups.flatMap((g) => g.files ?? []);
  }, [docData]);

  const renderConvRow = (c: ConversationRow, badge?: React.ReactNode) => {
    const title = (c.title && c.title.trim()) || "Untitled conversation";
    const when = formatRelative(c.updated_at || c.created_at);
    const isActive = activeConversationId === c.id;
    return (
      <li key={c.id}>
        <button
          type="button"
          onClick={() => onSelectConversation?.(c.id)}
          className={cn(
            "flex w-full items-start justify-between gap-2 px-4 py-3 text-left hover:bg-muted",
            isActive && "bg-primary/5",
          )}
          data-testid={`rail-conv-${c.id}`}
        >
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-primary">
              {title}
            </span>
            {when && (
              <span className="mt-0.5 block text-xs text-muted-foreground">{when}</span>
            )}
          </span>
          {badge}
        </button>
      </li>
    );
  };

  return (
    <aside
      className={cn("flex flex-col gap-4", className)}
      aria-label="Conversations and projects"
      data-testid="meridian-six-tile-rail"
    >
      {/* Tile: Active sessions (open by default) */}
      <Tile
        id="active"
        title="Active sessions"
        open={openState.active}
        onToggle={toggleTile}
        badge={
          activeSessions.length > 0 ? (
            <Pill tone="orange">{activeSessions.length}</Pill>
          ) : undefined
        }
      >
        {convLoading ? (
          <RowSkeleton rows={3} />
        ) : activeSessions.length === 0 ? (
          <EmptyRow>No active sessions yet.</EmptyRow>
        ) : (
          <ul className="divide-y">
            {activeSessions.map((c, i) =>
              renderConvRow(c, <Pill tone={i === 0 ? "orange" : "navy"}>{i === 0 ? "live" : "open"}</Pill>),
            )}
          </ul>
        )}
      </Tile>

      {/* Tile: History (collapsed by default) */}
      <Tile
        id="history"
        title="History"
        open={openState.history}
        onToggle={toggleTile}
        badge={<Pill tone="gray">{conversations.length}</Pill>}
      >
        {convLoading ? (
          <RowSkeleton rows={4} />
        ) : conversations.length === 0 ? (
          <EmptyRow>No conversations yet. Send a message to start one.</EmptyRow>
        ) : (
          <ul className="max-h-56 divide-y overflow-y-auto">
            {conversations.map((c) => renderConvRow(c))}
          </ul>
        )}
      </Tile>

      {/* Tile: Last 5 chats (open by default) */}
      <Tile
        id="last5"
        title="Last 5 chats"
        open={openState.last5}
        onToggle={toggleTile}
        badge={<Pill tone="gray">{lastFive.length}</Pill>}
      >
        {convLoading ? (
          <RowSkeleton rows={5} />
        ) : lastFive.length === 0 ? (
          <EmptyRow>Nothing here yet.</EmptyRow>
        ) : (
          <ul className="divide-y">{lastFive.map((c) => renderConvRow(c))}</ul>
        )}
      </Tile>

      {/* Tile: Projects (STUB — no backend yet) */}
      <Tile
        id="projects"
        title="Projects"
        open={openState.projects}
        onToggle={toggleTile}
        badge={<Pill tone="gray">{projects.length}</Pill>}
      >
        <div className="border-b p-3">
          <Button
            type="button"
            variant="default"
            className="w-full gap-1.5"
            disabled
            title="Project creation arrives with the projects backend (Phase 2)"
          >
            <Plus className="size-4" />
            Create new project
          </Button>
        </div>
        {projectsLoading ? (
          <RowSkeleton rows={4} />
        ) : (
          <ul className="max-h-56 divide-y overflow-y-auto">
            {projects.map((p) => {
              const isSel = (selectedProject?.id ?? "") === p.id;
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedProjectId(p.id);
                      setInstructionsDraft(null);
                    }}
                    className={cn(
                      "flex w-full items-center justify-between gap-2 px-4 py-3 text-left hover:bg-muted",
                      isSel && "bg-primary/5",
                    )}
                    data-testid={`rail-project-${p.id}`}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-primary">
                        {p.name}
                      </span>
                      {p.description && (
                        <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                          {p.description}
                        </span>
                      )}
                    </span>
                    {isSel && <Pill tone="orange">active</Pill>}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Tile>

      {/* Tile: Instructions (STUB — project-scoped guidance) */}
      <Tile
        id="instructions"
        title="Instructions"
        open={openState.instructions}
        onToggle={toggleTile}
        badge={
          selectedProject ? <Pill tone="navy">{selectedProject.name}</Pill> : undefined
        }
      >
        <div className="px-4 py-3">
          <p className="mb-2 text-xs text-muted-foreground">
            System guidance Meridian applies to every chat in this project.
          </p>
          <Textarea
            value={instructionsValue}
            onChange={(e) => setInstructionsDraft(e.target.value)}
            className="min-h-[120px]"
            placeholder="Describe how Meridian should approach this project…"
            data-testid="rail-instructions-text"
          />
          <div className="mt-2 flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground">
              {instructionsDraft !== null
                ? "unsaved changes"
                : "saved"}
            </span>
            <Button
              type="button"
              size="sm"
              disabled={instructionsDraft === null || !selectedProject}
              onClick={() => {
                if (!selectedProject || instructionsDraft === null) return;
                updateInstructions.mutate(
                  { projectId: selectedProject.id, instructions: instructionsDraft },
                  { onSuccess: () => setInstructionsDraft(null) },
                );
              }}
            >
              Save
            </Button>
          </div>
        </div>
      </Tile>

      {/* Tile: Knowledge (real documents) */}
      <Tile
        id="knowledge"
        title="Knowledge"
        open={openState.knowledge}
        onToggle={toggleTile}
        badge={
          selectedProject ? <Pill tone="navy">{selectedProject.name}</Pill> : undefined
        }
      >
        {docsLoading ? (
          <RowSkeleton rows={3} />
        ) : documents.length === 0 ? (
          <EmptyRow>No documents uploaded yet.</EmptyRow>
        ) : (
          <ul className="max-h-56 divide-y overflow-y-auto">
            {documents.map((d) => (
              <li
                key={d.id}
                className="flex items-center justify-between gap-2 px-4 py-3"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-primary">
                    {d.filename}
                  </span>
                  {d.file_type && (
                    <span className="mt-0.5 block text-xs uppercase text-muted-foreground">
                      {d.file_type}
                    </span>
                  )}
                </span>
                <Pill tone="green">indexed</Pill>
              </li>
            ))}
          </ul>
        )}
      </Tile>
    </aside>
  );
}

function RowSkeleton({ rows }: { rows: number }) {
  return (
    <div className="space-y-2 p-3" data-testid="rail-skeleton">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="space-y-1.5 px-1 py-1">
          <Skeleton className="h-3.5 w-3/4" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      ))}
    </div>
  );
}

function EmptyRow({ children }: { children: React.ReactNode }) {
  return <div className="px-4 py-3 text-sm text-muted-foreground">{children}</div>;
}
