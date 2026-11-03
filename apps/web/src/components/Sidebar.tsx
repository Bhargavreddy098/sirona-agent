import React from "react";
import {
  HomeIcon,
  SidebarToggleIcon,
  SearchIcon,
  EditIcon,
  SettingsGearIcon,
  SessionPencilIcon,
  CloseIcon,
  PlusIcon,
  SparklesIcon,
} from "./Icons";

export interface SessionMeta {
  id: string;
  title: string;
}

export interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  activeView?: "session" | "settings";
  isSettingsOpen?: boolean;
  onNavigateHome: () => void;
  onOpenSettings: () => void;
  onNewSession: () => void;
  activeSessionTitle?: string;
  onCloseSessionTab?: () => void;
  sessions?: SessionMeta[];
  currentSessionId?: string;
  onSelectSession?: (id: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onToggle,
  activeView = "session",
  isSettingsOpen = false,
  onNavigateHome,
  onOpenSettings,
  onNewSession,
  activeSessionTitle = "Session",
  onCloseSessionTab,
  sessions = [],
  currentSessionId,
  onSelectSession,
}) => {
  return (
    <>
      <aside
        id="vertical-tabs-sidebar"
        data-slot="vertical-tabs-sidebar"
        className="relative z-20 h-full min-h-0 shrink-0 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] border-r border-v2-border-border-base/70 bg-v2-background-bg-deep select-none"
        data-state={isOpen ? "open" : "closed"}
        style={{
          width: isOpen ? "264px" : "0px",
          overflow: isOpen ? "visible" : "hidden",
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? "auto" : "none",
        }}
      >
        <div className="absolute inset-0 flex flex-col justify-between overflow-hidden">
          {/* Top & Scrollable Middle Content */}
          <div className="flex flex-col h-full min-h-0 px-3 pt-3 pb-2">
            {/* Header: Sirona Brand & Sidebar Collapse Toggle */}
            <div className="flex items-center justify-between pb-3.5 pt-0.5">
              <button
                type="button"
                onClick={onNavigateHome}
                className={`group flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-[13px] font-semibold transition-all duration-150 cursor-pointer ${
                  activeView === "session"
                    ? "text-v2-text-text-base bg-v2-overlay-simple-overlay-selected"
                    : "text-v2-text-text-muted hover:text-v2-text-text-base hover:bg-v2-overlay-simple-overlay-hover"
                }`}
                aria-label="Home"
              >
                <div className="size-6 rounded-md flex items-center justify-center bg-gradient-to-tr from-neutral-800 to-neutral-700 dark:from-neutral-200 dark:to-neutral-100 text-white dark:text-neutral-900 shadow-xs transition-transform duration-150 group-hover:scale-105">
                  <HomeIcon size={13} />
                </div>
                <span className="tracking-tight font-medium">Sirona</span>
                <kbd className="ms-1.5 hidden group-hover:inline-flex items-center text-[9px] font-mono px-1 py-0.5 rounded bg-v2-background-bg-base border border-v2-border-border-base text-v2-text-text-faint">
                  Ctrl+B
                </kbd>
              </button>

              <button
                type="button"
                aria-label="Toggle sidebar"
                aria-expanded={isOpen}
                onClick={onToggle}
                className="p-1.5 rounded-lg text-v2-text-text-faint hover:text-v2-text-text-base hover:bg-v2-overlay-simple-overlay-hover transition-colors cursor-pointer"
                title="Collapse sidebar (Ctrl+B)"
              >
                <SidebarToggleIcon size={16} />
              </button>
            </div>

            {/* Main Action: New Session Button */}
            <div className="mb-2">
              <button
                type="button"
                onClick={onNewSession}
                className="group relative flex h-9 w-full items-center justify-between rounded-xl px-3 text-[13px] font-medium text-v2-text-text-base bg-v2-background-bg-base hover:bg-v2-overlay-simple-overlay-hover border border-v2-border-border-base shadow-xs hover:shadow-sm hover:border-v2-border-border-strong transition-all duration-200 cursor-pointer"
                aria-label="New session"
              >
                <div className="flex items-center gap-2.5">
                  <div className="size-5 rounded-md flex items-center justify-center bg-neutral-100 dark:bg-neutral-800 text-v2-text-text-base group-hover:bg-neutral-900 group-hover:text-white dark:group-hover:bg-white dark:group-hover:text-neutral-900 transition-colors">
                    <SparklesIcon size={12} />
                  </div>
                  <span>New session</span>
                </div>
                <kbd className="inline-flex items-center text-[10px] font-mono px-1.5 py-0.5 rounded bg-v2-background-bg-deep border border-v2-border-border-base text-v2-text-text-faint">
                  Ctrl+T
                </kbd>
              </button>
            </div>

            {/* Quick Search Item */}
            <div className="mb-3">
              <button
                type="button"
                className="group flex h-8 w-full items-center gap-2.5 rounded-lg px-2.5 text-[13px] text-v2-text-text-muted hover:text-v2-text-text-base hover:bg-v2-overlay-simple-overlay-hover transition-colors cursor-pointer"
              >
                <SearchIcon size={14} className="text-v2-icon-icon-muted group-hover:text-v2-text-text-base transition-colors" />
                <span className="truncate">Search sessions</span>
                <kbd className="ms-auto hidden group-hover:inline-flex items-center text-[9px] font-mono px-1.5 py-0.5 rounded bg-v2-background-bg-base border border-v2-border-border-base text-v2-text-text-faint">
                  Ctrl+Shift+F
                </kbd>
              </button>
            </div>

            {/* Sessions Section Header */}
            <div className="flex items-center justify-between px-2 pt-2 pb-1.5">
              <span className="text-[10px] font-bold tracking-wider text-v2-text-text-faint uppercase">
                Sessions
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-v2-overlay-simple-overlay-hover text-v2-text-text-faint">
                  {sessions.length > 0 ? sessions.length : 1}
                </span>
                <button
                  type="button"
                  onClick={onNewSession}
                  className="p-1 rounded text-v2-text-text-faint hover:text-v2-text-text-base hover:bg-v2-overlay-simple-overlay-hover transition-colors cursor-pointer"
                  title="Create new session"
                >
                  <PlusIcon size={12} />
                </button>
              </div>
            </div>

            {/* Sessions Tab & History List */}
            <div className="flex-1 min-h-0 overflow-y-auto space-y-1 pr-0.5">
              {/* Active Session Tab */}
              <div
                className={`group relative flex h-9 w-full items-center gap-2.5 rounded-xl px-3 text-[13px] transition-all duration-150 cursor-pointer ${
                  activeView === "session"
                    ? "bg-v2-background-bg-base border border-v2-border-border-base text-v2-text-text-base font-medium shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
                    : "text-v2-text-text-muted hover:text-v2-text-text-base hover:bg-v2-overlay-simple-overlay-hover"
                }`}
                onClick={onNavigateHome}
              >
                {/* Active Indicator Strip */}
                {activeView === "session" && (
                  <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full bg-neutral-900 dark:bg-neutral-100" />
                )}

                <span className="flex size-4 shrink-0 items-center justify-center">
                  <SessionPencilIcon
                    size={14}
                    className={activeView === "session" ? "text-v2-text-text-base" : "text-v2-icon-icon-muted"}
                  />
                </span>

                <span className="min-w-0 flex-1 truncate text-[13px] leading-snug">
                  {activeSessionTitle}
                </span>

                {onCloseSessionTab && (
                  <div
                    data-slot="tab-close"
                    onClick={(e) => {
                      e.stopPropagation();
                      onCloseSessionTab();
                    }}
                  >
                    <button
                      type="button"
                      aria-label="Close tab"
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-v2-overlay-simple-overlay-hover hover:text-red-500 rounded-md transition-all duration-150 cursor-pointer"
                      title="Close session"
                    >
                      <CloseIcon size={12} />
                    </button>
                  </div>
                )}
              </div>

              {/* Extra past sessions */}
              {sessions
                .filter((s) => s.id !== currentSessionId)
                .slice(0, 15)
                .map((s) => (
                  <div
                    key={s.id}
                    className="group flex h-8 w-full items-center gap-2 rounded-lg px-2.5 text-[13px] text-v2-text-text-muted hover:text-v2-text-text-base hover:bg-v2-overlay-simple-overlay-hover transition-colors cursor-pointer"
                    onClick={() => onSelectSession?.(s.id)}
                  >
                    <span className="flex size-4 shrink-0 items-center justify-center text-v2-icon-icon-muted group-hover:text-v2-text-text-base transition-colors">
                      <SessionPencilIcon size={13} />
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[13px] leading-4">
                      {s.title || "Session"}
                    </span>
                  </div>
                ))}
            </div>

            {/* Pinned Bottom Area: Settings & Workspace Status */}
            <div className="pt-2 border-t border-v2-border-border-base/70 mt-auto flex flex-col gap-1.5">
              {/* Settings Action Row Pinned to Bottom */}
              <button
                type="button"
                data-action="vertical-tabs-settings"
                onClick={onOpenSettings}
                className={`group flex h-9 w-full items-center gap-2.5 rounded-xl px-2.5 text-[13px] transition-all duration-150 cursor-pointer ${
                  isSettingsOpen
                    ? "text-v2-text-text-base bg-v2-background-bg-base border border-v2-border-border-base font-semibold shadow-xs"
                    : "text-v2-text-text-muted hover:text-v2-text-text-base hover:bg-v2-overlay-simple-overlay-hover"
                }`}
                aria-label="Settings"
                aria-pressed={isSettingsOpen}
              >
                <div className={`size-5 rounded flex items-center justify-center transition-colors ${
                  isSettingsOpen
                    ? "text-v2-text-text-base"
                    : "text-v2-icon-icon-muted group-hover:text-v2-text-text-base"
                }`}>
                  <SettingsGearIcon size={15} />
                </div>
                <span className="font-medium">Settings</span>
                <kbd className="ms-auto inline-flex items-center text-[10px] font-mono px-1.5 py-0.5 rounded bg-v2-background-bg-base border border-v2-border-border-base text-v2-text-text-faint">
                  Ctrl+,
                </kbd>
              </button>

              {/* Workspace Badge */}
              <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-v2-background-bg-base/50 border border-v2-border-border-base/40 text-[11px] text-v2-text-text-faint">
                <div className="flex items-center gap-1.5 truncate">
                  <span className="size-2 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
                  <span className="truncate font-medium text-v2-text-text-muted">personal -agent</span>
                </div>
                <span className="font-mono text-[10px] text-v2-text-text-faint shrink-0">Local</span>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Floating Collapsed Sidebar Toggle */}
      {!isOpen && (
        <div
          data-slot="collapsed-sidebar-toggle"
          className="absolute top-[calc(var(--shell-top-inset,8px)+8px)] start-[calc(var(--shell-inline-inset,8px)+8px)] z-40 flex shrink-0"
        >
          <button
            type="button"
            aria-label="Toggle sidebar"
            aria-expanded={false}
            onClick={onToggle}
            className="p-2 rounded-xl bg-v2-background-bg-base/95 backdrop-blur-md shadow-md hover:shadow-lg hover:scale-105 hover:bg-v2-overlay-simple-overlay-hover text-v2-text-text-muted hover:text-v2-text-text-base cursor-pointer border border-v2-border-border-base transition-all duration-200"
            title="Expand sidebar (Ctrl+B)"
          >
            <SidebarToggleIcon size={16} />
          </button>
        </div>
      )}
    </>
  );
};
