import React from "react";
import {
  SidebarToggleIcon,
  SettingsGearIcon,
  SunIcon,
  MoonIcon,
  ChevronDownIcon,
} from "./Icons";

export interface TitlebarProps {
  sidebarOpen?: boolean;
  onToggleSidebar?: () => void;
  selectedModel?: string;
  onOpenModelPicker?: () => void;
  onOpenSettings?: () => void;
  theme?: "system" | "light" | "dark";
  onToggleTheme?: () => void;
  activeSessionTitle?: string;
  isBackendConnected?: boolean;
  isBackendReady?: boolean;
  backendError?: string;
}

export const Titlebar: React.FC<TitlebarProps> = ({
  sidebarOpen = true,
  onToggleSidebar,
  selectedModel = "Gemini 2.5 Flash Lite",
  onOpenModelPicker,
  onOpenSettings,
  theme = "dark",
  onToggleTheme,
  activeSessionTitle = "Session",
  isBackendConnected = false,
  isBackendReady = false,
  backendError,
}) => {
  const isDark =
    theme === "dark" ||
    (theme === "system" && typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches);

  return (
    <header
      data-slot="web-navbar"
      className="shrink-0 relative flex flex-row items-center justify-between h-11 px-3 border-b border-[var(--border-subtle)] bg-[var(--app-bg)] select-none z-30"
    >
      {/* Left: Sidebar Toggle, Logo & Session Title */}
      <div className="flex items-center gap-2.5 min-w-0">
        {onToggleSidebar && (
          <button
            type="button"
            onClick={onToggleSidebar}
            title={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
            className="p-1.5 rounded-[var(--radius-sm)] text-neutral-400 hover:text-neutral-200 hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
          >
            <SidebarToggleIcon size={16} />
          </button>
        )}

        <div className="flex items-center gap-2">
          <span className="font-semibold text-xs tracking-tight text-neutral-900 dark:text-neutral-100">
            Sirona
          </span>
          <span className="font-mono text-[10px] text-neutral-400 dark:text-neutral-500">
            core
          </span>
        </div>

        <span className="text-neutral-400 dark:text-neutral-600 text-xs font-light">/</span>

        <span className="text-xs text-neutral-500 dark:text-neutral-400 truncate max-w-[200px] font-mono text-[11px]" title={activeSessionTitle}>
          {activeSessionTitle}
        </span>
      </div>

      {/* Center: Model Selector Pill */}
      <div className="flex items-center">
        {onOpenModelPicker ? (
          <button
            type="button"
            onClick={onOpenModelPicker}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium text-neutral-800 dark:text-neutral-200 bg-[var(--surface-bg)] border border-[var(--border-subtle)] hover:border-[var(--border-active)] hover:bg-[var(--surface-hover)] transition-all duration-150 cursor-pointer shadow-xs"
            title="Switch model"
          >
            <span className="truncate max-w-[170px] font-mono text-[11px]">{selectedModel}</span>
            <ChevronDownIcon size={12} className="text-neutral-400" />
          </button>
        ) : (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium text-neutral-400 bg-[var(--surface-bg)] border border-[var(--border-subtle)]">
            <span className="font-mono text-[11px]">{selectedModel}</span>
          </div>
        )}
      </div>

      {/* Right: Server connection status, Theme toggle, Settings button */}
      <div className="flex items-center gap-1">
        {/* Backend status dot */}
        <div
          className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] text-neutral-500"
          title={
            backendError
              ? `Health probe error: ${backendError}`
              : isBackendConnected && isBackendReady
              ? "Live & Ready: Connected to Sirona server (127.0.0.1:8000)"
              : isBackendConnected
              ? "Live: Server active, dependencies initializing..."
              : "Offline: Cannot reach Sirona backend server"
          }
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              backendError
                ? "bg-rose-500 animate-pulse"
                : isBackendConnected && isBackendReady
                ? "bg-emerald-500"
                : isBackendConnected
                ? "bg-amber-400"
                : "bg-neutral-600"
            }`}
          />
          <span className="hidden sm:inline font-mono text-[10px] text-neutral-400">
            {backendError
              ? "error"
              : isBackendConnected && isBackendReady
              ? "ready"
              : isBackendConnected
              ? "live"
              : "offline"}
          </span>
        </div>

        {/* Theme Toggle */}
        {onToggleTheme && (
          <button
            type="button"
            onClick={onToggleTheme}
            title={`Switch to ${isDark ? "light" : "dark"} mode`}
            className="p-1.5 rounded-[var(--radius-sm)] text-neutral-400 hover:text-neutral-200 hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
          >
            {isDark ? <SunIcon size={15} /> : <MoonIcon size={15} />}
          </button>
        )}

        {/* Settings button */}
        {onOpenSettings && (
          <button
            type="button"
            onClick={onOpenSettings}
            title="Settings (Providers, Keys, Appearance)"
            className="p-1.5 rounded-[var(--radius-sm)] text-neutral-400 hover:text-neutral-200 hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
          >
            <SettingsGearIcon size={16} />
          </button>
        )}
      </div>
    </header>
  );
};
