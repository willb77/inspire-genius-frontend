import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, ChevronRight, Plus } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useAgentConversation } from "@/hooks/agents/useAgentConversation";
import { useListDocuments } from "@/hooks/documents/useListDocuments";

const AGENT_ID = "meridian";

// localStorage keys — tile open/closed state + the client-side Projects list
// both survive reloads (the wireframe brief: "session-remembered open/closed
// state"). Projects has no backend yet, so the tile keeps a local list so the
// control is genuinely interactive rather than a dead stub.
const TILES_STORAGE_KEY = "meridian:tiles:v2";
const PROJECTS_STORAGE_KEY = "meridian:projects:v2";

type TileId = "active" | "history" | "last5" | "projects" | "knowledge";

// Default open/closed per the wireframe: Active OPEN, History COLLAPSED,
// the rest OPEN.
const DEFAULT_OPEN: Record<TileId, boolean> = {
  active: true,
  history: false,
  last5: true,
  projects: true,
  knowledge: true,
};

/** Every tile shut — the starting state for the horizontal dropdown row. */
const ALL_CLOSED: Record<TileId, boolean> = {
  active: false,
  history: false,
  last5: false,
  projects: false,
  knowledge: false,
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

type LocalProject = { id: string; name: string };

function loadProjects(): LocalProject[] {
  try {
    const raw = localStorage.getItem(PROJECTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as LocalProject[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// ── Conversation shapes (from useAgentConversation) ──────────────────────
type ConversationRow = {
  id: string;
  title?: string;
  created_at?: string;
  updated_at?: string;
};
type ConversationListResponse = { data?: { conversations?: ConversationRow[] } };

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

// ── Document shapes (from useListDocuments) ───────────────────────────────
type DocFile = { id: string; filename: string; file_type?: string };
type DocGroup = { files?: DocFile[] };
type DocListResponse = { date_groups?: DocGroup[] };

type PillTone = "ink" | "orange" | "green" | "gray";

function Pill({ tone, children }: { tone: PillTone; children: React.ReactNode }) {
  const toneClass: Record<PillTone, string> = {
    ink: "bg-ink/10 text-ink",
    orange: "bg-accent-orange/15 text-accent-orange-dark",
    green: "bg-emerald-100 text-emerald-800",
    gray: "bg-panel text-mute",
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
    <section className="rounded-2xl border border-hairline bg-white shadow-sm">
      <button
        type="button"
        className="flex w-full items-center justify-between px-4 py-3"
        aria-expanded={open}
        aria-controls={`meridian-rail-${id}`}
        onClick={() => onToggle(id)}
        data-testid={`rail-toggle-${id}`}
      >
        <span className="flex items-center gap-2">
          <ChevronRight
            className={cn(
              "size-4 text-accent-orange-dark transition-transform",
              open && "rotate-90",
            )}
          />
          <span className="text-sm font-semibold text-ink">{title}</span>
        </span>
        {badge}
      </button>
      {open && (
        <div
          id={`meridian-rail-${id}`}
          className="border-t border-hairline"
          data-testid={`rail-body-${id}`}
        >
          {children}
        </div>
      )}
    </section>
  );
}

/**
 * Horizontal variant of {@link Tile} — the same tile, rendered as a compact
 * dropdown trigger in a top row. `Popover` rather than `DropdownMenu` because
 * two of the bodies contain a text input and scrollable lists, which a menu's
 * roving-focus/keyboard model fights with.
 *
 * The open/closed contract is identical to the vertical tile (same `openState`
 * map, same localStorage persistence, same `rail-toggle-*` / `rail-body-*`
 * test ids), so every existing behaviour and test carries over unchanged.
 */
function TileDropdown({ id, title, open, onToggle, badge, children }: TileProps) {
  return (
    <Popover open={open} onOpenChange={() => onToggle(id)}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={`meridian-rail-${id}`}
          data-testid={`rail-toggle-${id}`}
          className={cn(
            "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-hairline bg-white px-3 text-sm font-semibold text-ink shadow-sm hover:bg-panel",
            open && "border-accent-orange bg-panel",
          )}
        >
          <span>{title}</span>
          {badge}
          <ChevronDown
            className={cn(
              "size-3.5 text-accent-orange-dark transition-transform",
              open && "rotate-180",
            )}
          />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-80 overflow-hidden p-0"
        id={`meridian-rail-${id}`}
        data-testid={`rail-body-${id}`}
      >
        {children}
      </PopoverContent>
    </Popover>
  );
}

export type MeridianTileRailProps = {
  /** Currently-active conversation id (highlighted in the lists). */
  activeConversationId?: string;
  /** Make a conversation active when a rail row is clicked. */
  onSelectConversation?: (id: string) => void;
  className?: string;
  /**
   * `"vertical"` (default) — stacked cards in the left rail.
   * `"horizontal"` — a row of dropdown triggers, for mounting in the page
   * header under the agent names instead of down the left side.
   */
  orientation?: "vertical" | "horizontal";
  /**
   * Restrict the rail to a subset of tiles, in the rail's own order. Omit for
   * all five.
   *
   * Added 2026-07-31 so Meridian's header can show **Projects only**, inline
   * among the New Chat / Documents / History / Export buttons, without either
   * duplicating the tile's implementation or dragging the other four tiles into
   * a row that no longer wants them. Filtering here keeps one source of truth
   * for what a tile is and does.
   */
  tiles?: readonly TileId[];
};

/**
 * MeridianTileRail — the five conversation/knowledge tiles of the Meridian Chat
 * V2 surface:
 *
 *   Active Sessions — three most-recent conversations (real, useAgentConversation)
 *   History         — full conversation list (real)
 *   Last 5 Chats    — five most-recent conversations (real)
 *   Projects        — client-side project list (localStorage; no backend yet)
 *   Knowledge       — uploaded documents (real, useListDocuments)
 *
 * Two arrangements of the same tiles, chosen with `orientation`:
 *
 *   "horizontal" (Meridian Chat, 2026-07-28) — a row of dropdown triggers in the
 *     page header under the agent names, freeing the full page width for the
 *     conversation.
 *   "vertical" (default) — stacked cards down a left rail:
 *     nav (UserLayout) │ tile rail │ [Compose Prompt / Conversation].
 *
 * Open/closed state persists in localStorage and is shared by both
 * arrangements. Skinned with the HomeV2 design tokens (ink / accent-orange /
 * panel / hairline). RTL-safe (logical spacing).
 */
export default function MeridianTileRail({
  activeConversationId,
  onSelectConversation,
  className,
  orientation = "vertical",
  tiles,
}: MeridianTileRailProps) {
  const { t } = useTranslation("chat");
  const isHorizontal = orientation === "horizontal";
  const BaseTileShell = isHorizontal ? TileDropdown : Tile;
  // `tiles` narrows which of the five render. Implemented as a wrapper rather
  // than five conditionals so adding a tile later can't forget the filter.
  const visible = tiles ? new Set<TileId>(tiles) : null;
  const TileShell = (props: TileProps) =>
    visible && !visible.has(props.id) ? null : <BaseTileShell {...props} />;
  // Horizontal tiles are dropdowns: they start CLOSED regardless of the stored
  // state, because five popovers open at once on load would blanket the page.
  // Toggling still persists, so the vertical rail's remembered state is intact.
  const [openState, setOpenState] = useState<Record<TileId, boolean>>(() =>
    isHorizontal ? { ...ALL_CLOSED } : loadTileState(),
  );

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

  // ── Conversations (Active / History / Last 5) ──────────────────────────
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

  // ── Projects (client-side list; no backend yet) ────────────────────────
  const [projects, setProjects] = useState<LocalProject[]>(loadProjects);
  const [projectDraft, setProjectDraft] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>(
    undefined,
  );

  const persistProjects = useCallback((next: LocalProject[]) => {
    setProjects(next);
    try {
      localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore quota / private-mode failures
    }
  }, []);

  const addProject = useCallback(() => {
    const name = projectDraft.trim();
    if (!name) return;
    // No Date/Math.random dependency needed — a monotonically-unique id from
    // the current list length + name is enough for a local-only list.
    const id = `proj-${name.toLowerCase().replace(/\s+/g, "-")}-${projects.length}`;
    persistProjects([...projects, { id, name }]);
    setProjectDraft("");
  }, [projectDraft, projects, persistProjects]);

  // ── Knowledge (real documents) ─────────────────────────────────────────
  const { data: docData, isLoading: docsLoading } = useListDocuments(1, 10);
  const documents = useMemo<DocFile[]>(() => {
    const resp = docData as DocListResponse | undefined;
    const groups = resp?.date_groups;
    if (!Array.isArray(groups)) return [];
    return groups.flatMap((g) => g.files ?? []);
  }, [docData]);

  const renderConvRow = (c: ConversationRow, badge?: React.ReactNode) => {
    const title =
      (c.title && c.title.trim()) ||
      t("common.untitledConversation", { defaultValue: "Untitled conversation" });
    const when = formatRelative(c.updated_at || c.created_at);
    const isActive = activeConversationId === c.id;
    return (
      <li key={c.id}>
        <button
          type="button"
          onClick={() => onSelectConversation?.(c.id)}
          className={cn(
            "flex w-full items-start justify-between gap-2 px-4 py-3 text-start hover:bg-panel",
            isActive && "bg-accent-orange/10",
          )}
          data-testid={`rail-conv-${c.id}`}
        >
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-ink">
              {title}
            </span>
            {when && <span className="mt-0.5 block text-xs text-mute">{when}</span>}
          </span>
          {badge}
        </button>
      </li>
    );
  };

  return (
    <aside
      className={cn(
        isHorizontal ? "flex flex-wrap items-center gap-2" : "flex flex-col gap-4",
        className,
      )}
      aria-label={t("tiles.rail.aria", { defaultValue: "Conversations and projects" })}
      data-testid="meridian-tile-rail"
      data-orientation={orientation}
    >
      {/* Active Sessions */}
      <TileShell
        id="active"
        title={t("tiles.active.title", { defaultValue: "Active Sessions" })}
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
          <EmptyRow>{t("tiles.active.empty", { defaultValue: "No active sessions yet." })}</EmptyRow>
        ) : (
          <ul className="divide-y divide-hairline">
            {activeSessions.map((c, i) =>
              renderConvRow(
                c,
                <Pill tone={i === 0 ? "orange" : "ink"}>
                  {i === 0
                    ? t("tiles.active.badge.live", { defaultValue: "live" })
                    : t("tiles.active.badge.open", { defaultValue: "open" })}
                </Pill>,
              ),
            )}
          </ul>
        )}
      </TileShell>

      {/* History */}
      <TileShell
        id="history"
        title={t("tiles.history.title", { defaultValue: "History" })}
        open={openState.history}
        onToggle={toggleTile}
        badge={<Pill tone="gray">{conversations.length}</Pill>}
      >
        {convLoading ? (
          <RowSkeleton rows={4} />
        ) : conversations.length === 0 ? (
          <EmptyRow>{t("common.noConversations", { defaultValue: "No conversations yet. Send a message to start one." })}</EmptyRow>
        ) : (
          <ul className="max-h-56 divide-y divide-hairline overflow-y-auto">
            {conversations.map((c) => renderConvRow(c))}
          </ul>
        )}
      </TileShell>

      {/* Last 5 Chats */}
      <TileShell
        id="last5"
        title={t("tiles.last5.title", { defaultValue: "Last 5 Chats" })}
        open={openState.last5}
        onToggle={toggleTile}
        badge={<Pill tone="gray">{lastFive.length}</Pill>}
      >
        {convLoading ? (
          <RowSkeleton rows={5} />
        ) : lastFive.length === 0 ? (
          <EmptyRow>{t("tiles.last5.empty", { defaultValue: "Nothing here yet." })}</EmptyRow>
        ) : (
          <ul className="divide-y divide-hairline">
            {lastFive.map((c) => renderConvRow(c))}
          </ul>
        )}
      </TileShell>

      {/* Projects — client-side list (no backend yet) */}
      <TileShell
        id="projects"
        title={t("tiles.projects.title", { defaultValue: "Projects" })}
        open={openState.projects}
        onToggle={toggleTile}
        badge={<Pill tone="gray">{projects.length}</Pill>}
      >
        <div className="flex items-center gap-2 border-b border-hairline p-3">
          <input
            type="text"
            value={projectDraft}
            onChange={(e) => setProjectDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addProject();
              }
            }}
            placeholder={t("tiles.projects.inputPlaceholder", { defaultValue: "New project name…" })}
            aria-label={t("tiles.projects.inputAria", { defaultValue: "New project name" })}
            className="min-w-0 flex-1 rounded-lg border border-hairline bg-white px-2.5 py-1.5 text-sm text-ink placeholder:text-mute focus:border-accent-orange focus:outline-none"
            data-testid="rail-project-input"
          />
          <button
            type="button"
            onClick={addProject}
            disabled={!projectDraft.trim()}
            aria-label={t("tiles.projects.addAria", { defaultValue: "Add project" })}
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-ink text-white transition-colors hover:bg-accent-orange disabled:cursor-not-allowed disabled:opacity-40"
            data-testid="rail-project-add"
          >
            <Plus className="size-4" />
          </button>
        </div>
        {projects.length === 0 ? (
          <EmptyRow>{t("tiles.projects.empty", { defaultValue: "No projects yet. Group related chats under a project." })}</EmptyRow>
        ) : (
          <ul className="max-h-56 divide-y divide-hairline overflow-y-auto">
            {projects.map((p) => {
              const isSel = selectedProjectId === p.id;
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedProjectId(isSel ? undefined : p.id)}
                    className={cn(
                      "flex w-full items-center justify-between gap-2 px-4 py-3 text-start hover:bg-panel",
                      isSel && "bg-accent-orange/10",
                    )}
                    data-testid={`rail-project-${p.id}`}
                  >
                    <span className="block truncate text-sm font-semibold text-ink">
                      {p.name}
                    </span>
                    {isSel && <Pill tone="orange">{t("tiles.projects.badge.active", { defaultValue: "active" })}</Pill>}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </TileShell>

      {/* Knowledge — real documents */}
      <TileShell
        id="knowledge"
        title={t("tiles.knowledge.title", { defaultValue: "Knowledge" })}
        open={openState.knowledge}
        onToggle={toggleTile}
        badge={<Pill tone="gray">{documents.length}</Pill>}
      >
        {docsLoading ? (
          <RowSkeleton rows={3} />
        ) : documents.length === 0 ? (
          <EmptyRow>{t("common.noDocuments", { defaultValue: "No documents uploaded yet." })}</EmptyRow>
        ) : (
          <ul className="max-h-56 divide-y divide-hairline overflow-y-auto">
            {documents.map((d) => (
              <li
                key={d.id}
                className="flex items-center justify-between gap-2 px-4 py-3"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-ink">
                    {d.filename}
                  </span>
                  {d.file_type && (
                    <span className="mt-0.5 block text-xs uppercase text-mute">
                      {d.file_type}
                    </span>
                  )}
                </span>
                <Pill tone="green">{t("tiles.knowledge.badge.indexed", { defaultValue: "indexed" })}</Pill>
              </li>
            ))}
          </ul>
        )}
      </TileShell>
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
  return <div className="px-4 py-3 text-sm text-mute">{children}</div>;
}
