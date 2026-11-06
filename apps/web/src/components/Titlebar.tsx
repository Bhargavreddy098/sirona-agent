import React from "react";
import {
  SidebarToggleIcon,
  SettingsGearIcon,
  SunIcon,
  MoonIcon,
  SparklesIcon,
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
}

export const Titlebar: React.FC<TitlebarProps> = ({
  sidebarOpen = true,
  onToggleSidebar,
  selectedModel = "Gemini 2.5 Flash Lite",
  onOpenModelPicker,
  onOpenSettings,
  theme = "light",
  onToggleTheme,
  activeSessionTitle = "Session",
  isBackendConnected = true,
}) => {
  return (
    <header
      data-slot="web-navbar"
      className="shrink-0 relative flex flex-row items-center justify-between h-12 px-3 border-b border-v2-border-border-base/60 bg-v2-background-bg-deep select-none z-30"
    >
      {/* Left: Sidebar Toggle, Logo & Session Title */}
      <div className="flex items-center gap-2.5 min-w-0">
        {onToggleSidebar && (
          <button
            type="button"
            onClick={onToggleSidebar}
            title={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
            className="p-1.5 rounded-md text-v2-text-text-muted hover:text-v2-text-text-primary hover:bg-v2-surface-surface-raised transition-colors"
          >
            <SidebarToggleIcon size={18} />
          </button>
        )}

        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm tracking-tight text-v2-text-text-primary">
            Sirona
          </span>
          <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 font-medium">
            Web
          </span>
        </div>

        <span className="text-v2-text-text-muted/40 text-xs">/</span>

        <span className="text-xs text-v2-text-text-muted truncate max-w-[200px]" title={activeSessionTitle}>
          {activeSessionTitle}
        </span>
      </div>

      {/* Center: Model Selector Badge */}
      <div className="flex items-center">
        {onOpenModelPicker ? (
          <button
            type="button"
            onClick={onOpenModelPicker}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium text-v2-text-text-primary bg-v2-surface-surface-raised border border-v2-border-border-base/70 hover:border-v2-border-border-base hover:bg-v2-surface-surface-active transition-all cursor-pointer shadow-xs"
            title="Switch AI model"
          >
            <SparklesIcon size={13} className="text-amber-500" />
            <span className="truncate max-w-[160px]">{selectedModel}</span>
            <ChevronDownIcon size={13} className="text-v2-text-text-muted" />
          </button>
        ) : (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium text-v2-text-text-muted bg-v2-surface-surface-raised">
            <SparklesIcon size={13} className="text-amber-500" />
            <span>{selectedModel}</span>
          </div>
        )}
      </div>

      {/* Right: Server connection status, Theme toggle, Settings button */}
      <div className="flex items-center gap-1.5">
        {/* Backend status dot */}
        <div
          className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] text-v2-text-text-muted"
          title={isBackendConnected ? "Connected to Sirona server (127.0.0.1:8000)" : "Connecting to server..."}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              isBackendConnected ? "bg-emerald-500 shadow-xs shadow-emerald-500/50" : "bg-amber-500 animate-pulse"
            }`}
          />
          <span className="hidden sm:inline font-mono text-[10px]">
            {isBackendConnected ? "online" : "offline"}
          </span>
        </div>

        {/* Theme Toggle */}
        {onToggleTheme && (
          <button
            type="button"
            onClick={onToggleTheme}
            title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            className="p-1.5 rounded-md text-v2-text-text-muted hover:text-v2-text-text-primary hover:bg-v2-surface-surface-raised transition-colors"
          >
            {theme === "dark" ? <SunIcon size={16} /> : <MoonIcon size={16} />}
          </button>
        )}

        {/* Settings button */}
        {onOpenSettings && (
          <button
            type="button"
            onClick={onOpenSettings}
            title="Settings (Providers, Keys, Appearance)"
            className="p-1.5 rounded-md text-v2-text-text-muted hover:text-v2-text-text-primary hover:bg-v2-surface-surface-raised transition-colors"
          >
            <SettingsGearIcon size={17} />
          </button>
        )}
      </div>
    </header>
  );
};
