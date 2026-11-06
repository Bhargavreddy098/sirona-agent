import React, { useState, useMemo } from "react";
import sironaApi from "../api";
import {
  Terminal,
  Search,
  Plus,
  X,
  ChevronDown,
  ChevronRight,
  Settings,
  Clock,
  PanelLeftClose,
  PanelLeft,
  MessageSquare,
  Pin,
  Trash2,
  FolderGit2,
  AlertCircle,
  Check,
  ChevronsUpDown,
  RefreshCw,
} from "lucide-react";

export interface SessionMeta {
  id: string;
  title: string;
  createdAt?: number;
  isPinned?: boolean;
}

export interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  isSettingsOpen?: boolean;
  onNavigateHome: () => void;
  onOpenSettings: (tab?: any) => void;
  onNewSession: () => void;
  activeSessionTitle?: string;
  onCloseSessionTab?: () => void;
  sessions?: SessionMeta[];
  currentSessionId?: string;
  onSelectSession?: (id: string) => void;
  onDeleteSession?: (id: string) => void;
  workspaceName?: string;
  branchName?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onToggle,
  isSettingsOpen = false,
  onNavigateHome,
  onOpenSettings,
  onNewSession,
  activeSessionTitle = "Session",
  onCloseSessionTab,
  sessions = [],
  currentSessionId,
  onSelectSession,
  onDeleteSession,
  workspaceName = "personal-agent",
  branchName = "main",
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isHistoryOpen, setIsHistoryOpen] = useState(true);
  const [pinnedSessionIds, setPinnedSessionIds] = useState<Set<string>>(new Set());

  // Interactive Multi-Workspace State (Endpoint: GET /api/v1/workspaces)
  const [isWorkspaceMenuOpen, setIsWorkspaceMenuOpen] = useState(false);
  const [workspaces, setWorkspaces] = useState<Array<{ id: string; name: string; isDefault?: boolean }>>([]);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  const [isLoadingWorkspaces, setIsLoadingWorkspaces] = useState(false);
  const [selectedWorkspaceName, setSelectedWorkspaceName] = useState(workspaceName);

  const fetchWorkspaces = async () => {
    setIsLoadingWorkspaces(true);
    setWorkspaceError(null);
    try {
      const res = await sironaApi.identity.workspaces();
      const list = Array.isArray(res?.data) ? res.data : [];
      setWorkspaces(list);
    } catch (err: any) {
      setWorkspaceError(err.message || "Failed to fetch workspaces from server");
    } finally {
      setIsLoadingWorkspaces(false);
    }
  };

  const handleToggleWorkspaceMenu = async () => {
    const nextState = !isWorkspaceMenuOpen;
    setIsWorkspaceMenuOpen(nextState);
    if (nextState) {
      await fetchWorkspaces();
    }
  };

  // Toggle pin
  const togglePin = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setPinnedSessionIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Filtered sessions based on search
  const filteredSessions = useMemo(() => {
    if (!searchQuery.trim()) return sessions;
    const q = searchQuery.toLowerCase();
    return sessions.filter(
      (s) => s.title.toLowerCase().includes(q) || s.id.toLowerCase().includes(q)
    );
  }, [sessions, searchQuery]);

  const pinnedSessions = useMemo(() => {
    return filteredSessions.filter((s) => pinnedSessionIds.has(s.id));
  }, [filteredSessions, pinnedSessionIds]);

  const regularSessions = useMemo(() => {
    return filteredSessions.filter((s) => !pinnedSessionIds.has(s.id));
  }, [filteredSessions, pinnedSessionIds]);

  return (
    <>
      <aside
        id="vertical-tabs-sidebar"
        data-slot="vertical-tabs-sidebar"
        className="relative z-20 h-full min-h-0 shrink-0 border-r border-[var(--border-subtle)] bg-[var(--sidebar-bg)] select-none flex flex-col transition-[width,opacity] duration-200 ease-out"
        data-state={isOpen ? "open" : "closed"}
        style={{
          width: isOpen ? "264px" : "0px",
          overflow: isOpen ? "visible" : "hidden",
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? "auto" : "none",
        }}
      >
        <div className="absolute inset-0 flex flex-col justify-between overflow-hidden">
          {/* Main Top + Center Container */}
          <div className="flex flex-col h-full min-h-0 px-3 pt-3 pb-2">

            {/* 1. Header: Brand & Workspace Pill & Collapse Action */}
            <div className="flex items-center justify-between h-9 px-1 mb-2.5">
              <button
                type="button"
                onClick={onNavigateHome}
                className="group flex items-center gap-2 text-left rounded-[var(--radius-md)] px-2 py-1.5 -mx-1 hover:bg-[var(--surface-hover)] border border-transparent hover:border-[var(--border-subtle)] transition-all cursor-pointer"
                title="Go to Agent Workspace"
              >
                <div className="size-5 rounded-[var(--radius-sm)] bg-neutral-900 border border-white/10 text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                  <Terminal className="size-3 text-neutral-200" strokeWidth={2} />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-xs tracking-tight text-neutral-100">
                    Sirona
                  </span>
                  <span className="font-mono text-[9px] uppercase tracking-wider px-1 py-0.2 rounded bg-neutral-800 text-neutral-400 border border-neutral-700/50">
                    core
                  </span>
                </div>
              </button>

              <button
                type="button"
                aria-label="Collapse sidebar"
                onClick={onToggle}
                className="p-1.5 rounded-[var(--radius-sm)] text-neutral-400 hover:text-neutral-100 hover:bg-[var(--surface-hover)] border border-transparent hover:border-[var(--border-subtle)] transition-all cursor-pointer"
                title="Collapse sidebar (Ctrl+B)"
              >
                <PanelLeftClose className="size-3.5" strokeWidth={1.5} />
              </button>
            </div>

            {/* 2. Interactive Workspace Switcher (GET /api/v1/workspaces) */}
            <div className="relative mb-2.5 px-0.5">
              <button
                type="button"
                onClick={handleToggleWorkspaceMenu}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-[var(--radius-md)] bg-[var(--surface-bg)] hover:bg-[var(--surface-hover)] border border-[var(--border-subtle)] hover:border-[var(--border-active)] text-[11px] font-mono text-neutral-400 shadow-xs transition-all cursor-pointer group"
                title="Switch active workspace"
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <FolderGit2 className="size-3.5 text-neutral-500 group-hover:text-neutral-300 shrink-0" strokeWidth={1.5} />
                  <span className="truncate text-neutral-200 font-medium group-hover:text-white">
                    {selectedWorkspaceName}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[10px] text-neutral-500">
                  <span className="text-neutral-500">/</span>
                  <span className="text-neutral-400 truncate max-w-[50px]">{branchName}</span>
                  <ChevronsUpDown className="size-3 text-neutral-500 ml-0.5" strokeWidth={1.5} />
                </div>
              </button>

              {/* Workspace Switcher Popover */}
              {isWorkspaceMenuOpen && (
                <div className="absolute top-full left-0 right-0 mt-1.5 z-50 p-2 rounded-[var(--radius-lg)] bg-[var(--surface-bg)] border border-[var(--border-active)] shadow-[var(--shadow-floating)] animate-fadeIn">
                  <div className="flex items-center justify-between px-1.5 pb-1.5 mb-1.5 border-b border-[var(--border-subtle)]">
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-neutral-400">
                      Workspaces
                    </span>
                    <button
                      type="button"
                      onClick={fetchWorkspaces}
                      disabled={isLoadingWorkspaces}
                      className="p-1 rounded text-neutral-400 hover:text-neutral-200 hover:bg-[var(--surface-hover)] cursor-pointer"
                      title="Refresh workspaces"
                    >
                      <RefreshCw className={`size-2.5 ${isLoadingWorkspaces ? "animate-spin" : ""}`} />
                    </button>
                  </div>

                  {isLoadingWorkspaces ? (
                    <div className="py-3 text-center text-xs text-neutral-500 font-mono text-[11px]">
                      Loading workspaces...
                    </div>
                  ) : workspaceError ? (
                    <div className="p-2 rounded bg-rose-500/10 border border-rose-500/20 text-rose-300 text-[11px] leading-relaxed select-text space-y-1">
                      <div className="flex items-center gap-1 font-semibold text-rose-400">
                        <AlertCircle className="size-3 shrink-0" />
                        <span>Workspace Error</span>
                      </div>
                      <div>{workspaceError}</div>
                    </div>
                  ) : workspaces.length === 0 ? (
                    <div className="py-2.5 px-2 text-neutral-400 text-[11px] text-center font-mono">
                      No workspaces returned
                    </div>
                  ) : (
                    <div className="max-h-40 overflow-y-auto space-y-0.5">
                      {workspaces.map((ws) => {
                        const isSelected = selectedWorkspaceName === ws.name || selectedWorkspaceName === ws.id;
                        return (
                          <button
                            key={ws.id}
                            type="button"
                            onClick={() => {
                              setSelectedWorkspaceName(ws.name || ws.id);
                              setIsWorkspaceMenuOpen(false);
                            }}
                            className={`w-full flex items-center justify-between px-2 py-1.5 rounded-[var(--radius-sm)] text-left text-xs transition-colors cursor-pointer ${
                              isSelected
                                ? "bg-[var(--surface-hover)] text-white font-medium border border-[var(--border-active)]"
                                : "text-neutral-300 hover:text-white hover:bg-[var(--surface-hover)] border border-transparent"
                            }`}
                          >
                            <div className="flex items-center gap-1.5 min-w-0 pr-1">
                              <span className="truncate font-mono text-[11px]">{ws.name || ws.id}</span>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              {ws.isDefault && (
                                <span className="text-[9px] px-1 py-0.2 rounded bg-neutral-800 text-neutral-400 font-mono">
                                  default
                                </span>
                              )}
                              {isSelected && <Check className="size-3 text-emerald-400" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 3. Primary Action: New Chat Button */}
            <div className="mb-2.5">
              <button
                type="button"
                onClick={onNewSession}
                className="group relative flex h-8.5 w-full items-center justify-between rounded-[var(--radius-md)] px-2.5 text-xs text-neutral-100 bg-[var(--surface-bg)] hover:bg-[var(--surface-hover)] border border-[var(--border-subtle)] hover:border-[var(--border-active)] shadow-[var(--shadow-panel)] hover:shadow-sm transition-all duration-150 cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <div className="size-4 rounded-full bg-neutral-800 flex items-center justify-center group-hover:bg-neutral-700 transition-colors">
                    <Plus className="size-3 text-neutral-300 group-hover:text-white" strokeWidth={2} />
                  </div>
                  <span className="font-medium text-[11px] tracking-tight">New chat</span>
                </div>
                <kbd className="inline-flex items-center text-[10px] font-mono px-1.5 py-0.2 rounded bg-neutral-800/80 border border-[var(--border-subtle)] text-neutral-400">
                  Ctrl+T
                </kbd>
              </button>
            </div>

            {/* 4. Filter Search Input */}
            <div className="mb-3">
              <div className="relative flex items-center">
                <Search className="absolute left-2.5 size-3.5 text-neutral-500 pointer-events-none" strokeWidth={1.5} />
                <input
                  type="text"
                  placeholder="Filter chats & actions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-8 pl-8 pr-7 text-xs rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-bg)] text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:border-[var(--border-active)] focus:bg-[var(--surface-hover)] transition-all"
                />
                {searchQuery ? (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2 p-0.5 rounded-[var(--radius-sm)] hover:bg-[var(--surface-hover)] text-neutral-400 hover:text-neutral-200 cursor-pointer"
                  >
                    <X className="size-3" strokeWidth={1.5} />
                  </button>
                ) : (
                  <kbd className="absolute right-2 text-[10px] font-mono text-neutral-500 px-1 py-0.2 rounded border border-[var(--border-subtle)] bg-neutral-900/40">
                    /
                  </kbd>
                )}
              </div>
            </div>

            {/* 5. Scrollable Chat History */}
            <div className="flex-1 min-h-0 overflow-y-auto space-y-3 pr-0.5">
              {/* Pinned Section if any */}
              {pinnedSessions.length > 0 && (
                <div>
                  <div className="flex items-center justify-between px-1.5 py-1 text-xs font-medium text-neutral-500">
                    <div className="flex items-center gap-1.5">
                      <Pin className="size-3 text-amber-500/80" strokeWidth={1.5} />
                      <span className="text-[10px] uppercase tracking-wider font-semibold text-neutral-400">Pinned</span>
                    </div>
                    <span className="font-mono text-[10px] tabular-nums text-neutral-500">
                      {pinnedSessions.length}
                    </span>
                  </div>
                  <div className="space-y-0.5 mt-1">
                    {pinnedSessions.map((s) => (
                      <div
                        key={s.id}
                        className={`group relative flex h-7.5 w-full items-center justify-between rounded-[var(--radius-md)] px-2 text-xs transition-all cursor-pointer ${
                          s.id === currentSessionId
                            ? "bg-[var(--surface-bg)] border border-[var(--border-active)] text-neutral-100 font-medium shadow-xs"
                            : "text-neutral-300 hover:text-neutral-100 hover:bg-[var(--surface-hover)] border border-transparent hover:border-[var(--border-subtle)]"
                        }`}
                        onClick={() => onSelectSession?.(s.id)}
                      >
                        <div className="flex items-center gap-1.5 min-w-0 pr-1">
                          <MessageSquare className="size-3 text-neutral-400 shrink-0" strokeWidth={1.5} />
                          <span className="truncate font-mono text-[11px]">{s.title || "Untitled chat"}</span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={(e) => togglePin(s.id, e)}
                            className="p-1 hover:bg-neutral-800 text-neutral-400 hover:text-amber-400 rounded-[var(--radius-sm)] transition-colors"
                            title="Unpin"
                          >
                            <Pin className="size-3 fill-amber-400 text-amber-400" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Chats Section */}
              <div>
                <button
                  type="button"
                  onClick={() => setIsHistoryOpen(!isHistoryOpen)}
                  className="flex items-center justify-between w-full px-1.5 py-1 text-xs font-medium text-neutral-500 hover:text-neutral-300 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-neutral-400">Recents</span>
                    <span className="font-mono text-[10px] tabular-nums text-neutral-500">
                      {regularSessions.length + (activeSessionTitle ? 1 : 0)}
                    </span>
                  </div>
                  {isHistoryOpen ? (
                    <ChevronDown className="size-3 text-neutral-500" strokeWidth={1.5} />
                  ) : (
                    <ChevronRight className="size-3 text-neutral-500" strokeWidth={1.5} />
                  )}
                </button>

                {isHistoryOpen && (
                  <div className="space-y-0.5 mt-1">
                    {/* Active In-Progress Session Item */}
                    <div
                      className="group relative flex h-8 w-full items-center justify-between rounded-[var(--radius-md)] px-2.5 text-xs transition-all cursor-pointer bg-[var(--surface-bg)] border border-[var(--border-active)] text-neutral-100 font-medium shadow-xs"
                      onClick={onNavigateHome}
                    >
                      <div className="flex items-center gap-2 min-w-0 pr-2">
                        <span className="size-1.5 rounded-full bg-emerald-500 shrink-0" />
                        <span className="truncate font-mono text-[11px]">{activeSessionTitle}</span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {onCloseSessionTab && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onCloseSessionTab();
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 rounded-[var(--radius-sm)] transition-opacity cursor-pointer"
                            title="Reset session"
                          >
                            <X className="size-3" strokeWidth={1.5} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Historical Regular Sessions */}
                    {regularSessions
                      .filter((s) => s.id !== currentSessionId)
                      .slice(0, 30)
                      .map((s) => (
                        <div
                          key={s.id}
                          className="group relative flex h-7.5 w-full items-center justify-between rounded-[var(--radius-md)] px-2 text-xs text-neutral-400 hover:text-neutral-100 hover:bg-[var(--surface-hover)] border border-transparent hover:border-[var(--border-subtle)] transition-all cursor-pointer"
                          onClick={() => onSelectSession?.(s.id)}
                        >
                          <div className="flex items-center gap-2 min-w-0 pr-1">
                            <Clock className="size-3 text-neutral-500 group-hover:text-neutral-400 shrink-0" strokeWidth={1.5} />
                            <span className="truncate font-mono text-[11px]">{s.title || "Untitled chat"}</span>
                          </div>

                          <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              type="button"
                              onClick={(e) => togglePin(s.id, e)}
                              className="p-1 hover:bg-neutral-800 text-neutral-500 hover:text-neutral-200 rounded-[var(--radius-sm)] transition-colors"
                              title="Pin chat"
                            >
                              <Pin className="size-3" strokeWidth={1.5} />
                            </button>
                            {onDeleteSession && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDeleteSession(s.id);
                                }}
                                className="p-1 hover:bg-neutral-800 text-neutral-500 hover:text-rose-400 rounded-[var(--radius-sm)] transition-colors"
                                title="Delete chat"
                              >
                                <Trash2 className="size-3" strokeWidth={1.5} />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}

                    {regularSessions.length === 0 && !activeSessionTitle && (
                      <div className="py-4 text-center text-xs text-neutral-500 font-mono text-[11px]">
                        No chats matching &quot;{searchQuery}&quot;
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* 7. Pinned Footer Dock */}
            <div className="pt-2 border-t border-[var(--border-subtle)] mt-auto flex flex-col gap-1">
              {/* Settings Action Button */}
              <button
                type="button"
                onClick={() => onOpenSettings()}
                className={`group flex h-8 w-full items-center justify-between rounded-[var(--radius-md)] px-2.5 text-xs transition-all cursor-pointer ${
                  isSettingsOpen
                    ? "text-neutral-100 bg-[var(--surface-bg)] border border-[var(--border-active)] font-medium"
                    : "text-neutral-400 hover:text-neutral-100 hover:bg-[var(--surface-hover)] border border-transparent hover:border-[var(--border-subtle)]"
                }`}
                aria-label="Settings"
              >
                <div className="flex items-center gap-2">
                  <Settings className="size-3.5 text-neutral-400 group-hover:text-neutral-200" strokeWidth={1.5} />
                  <span className="text-[11px]">Settings</span>
                </div>
                <kbd className="inline-flex items-center text-[10px] font-mono px-1.5 py-0.5 rounded bg-neutral-800 border border-[var(--border-subtle)] text-neutral-400">
                  Ctrl+,
                </kbd>
              </button>

              {/* Live Runtime Status Pill */}
              <div className="flex items-center justify-between px-2.5 py-1 text-xs text-neutral-500">
                <div className="flex items-center gap-1.5">
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[11px]">Runtime</span>
                </div>
                <span className="font-mono text-[10px] text-neutral-400 tabular-nums">127.0.0.1:8000</span>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Collapsed Sidebar Expand Button */}
      {!isOpen && (
        <div
          data-slot="collapsed-sidebar-toggle"
          className="absolute top-2.5 left-2.5 z-40 flex shrink-0"
        >
          <button
            type="button"
            aria-label="Expand sidebar"
            onClick={onToggle}
            className="p-1.5 rounded-[var(--radius-sm)] bg-[var(--surface-bg)] text-neutral-400 hover:text-neutral-100 cursor-pointer border border-[var(--border-subtle)] shadow-xs transition-colors hover:border-[var(--border-active)]"
            title="Expand sidebar (Ctrl+B)"
          >
            <PanelLeft className="size-3.5" strokeWidth={1.5} />
          </button>
        </div>
      )}
    </>
  );
};
