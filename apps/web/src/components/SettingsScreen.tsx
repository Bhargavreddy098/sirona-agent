import React, { useState, useEffect } from "react";
import sironaApi from "../api";
import {
  Activity,
  ShieldAlert,
  Cpu,
  AlertCircle,
  LogOut,
  Folder,
  FolderOpen,
  RefreshCw,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { ModelProviderSection } from "./sections/ModelProviderSection";
import { AgentExecutionSection } from "./sections/AgentExecutionSection";
import { GovernanceBudgetSection } from "./sections/GovernanceBudgetSection";
import {
  SearchIcon,
  CloseIcon,
  TrashIcon,
  PlusIcon,
  ProvidersIcon,
  ModelsIcon,
  ExtensionsIcon,
  FolderIcon,
  WorktreeIcon,
  SlidersIcon,
  AppearanceIcon,
  NotificationsIcon,
  KeyboardIcon,
  ServerIcon,
  FlaskIcon,
  InfoIcon,
  SunIcon,
  MoonIcon,
  CheckIcon,
} from "./Icons";

export interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?:
    | "providers"
    | "models"
    | "runs"
    | "governance"
    | "extensions"
    | "projects"
    | "worktrees"
    | "general"
    | "appearance"
    | "notifications"
    | "shortcuts"
    | "servers"
    | "experimental"
    | "about";
  theme: "system" | "light" | "dark";
  onThemeChange: (theme: "system" | "light" | "dark") => void;
  selectedModel: string;
  onModelChange: (model: string) => void;
  onRefreshModels?: () => void;
}

export const SettingsScreen: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  initialTab = "appearance",
  theme,
  onThemeChange,
  selectedModel,
  onModelChange,
  onRefreshModels,
}) => {
  const [activeTab, setActiveTab] = useState<
    | "providers"
    | "models"
    | "runs"
    | "governance"
    | "extensions"
    | "projects"
    | "worktrees"
    | "general"
    | "appearance"
    | "notifications"
    | "shortcuts"
    | "servers"
    | "experimental"
    | "about"
  >(initialTab);

  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  const [searchQuery, setSearchQuery] = useState("");
  const [interfaceLayout, setInterfaceLayout] = useState<"top" | "side" | "inbox">("side");
  const [autoAcceptPermissions, setAutoAcceptPermissions] = useState(false);
  const [showAgent, setShowAgent] = useState(false);
  const [wrapLines, setWrapLines] = useState(true);
  const [changedFiles, setChangedFiles] = useState(false);

  // Live Backend State
  const [serverHealth, setServerHealth] = useState<{ status: string; service: string; db: boolean } | null>(null);
  const [serverLiveness, setServerLiveness] = useState<{ status: string } | null>(null);
  const [serverReadiness, setServerReadiness] = useState<{ ready: boolean } | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  // Active Session & Principal (GET /api/v1/session & DELETE /api/v1/session)
  const [sessionData, setSessionData] = useState<{ principalId: string; workspaceId: string } | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Capabilities (GET /api/v1/capabilities)
  const [capabilities, setCapabilities] = useState<Record<string, boolean> | null>(null);
  const [capabilitiesError, setCapabilitiesError] = useState<string | null>(null);

  // Developer Bridge Connections (GET /api/v1/developer-connections)
  const [devConnectionsList, setDevConnectionsList] = useState<any[]>([]);
  const [devConnectionsError, setDevConnectionsError] = useState<string | null>(null);

  // Filesystem Directory Browsing (GET /api/v1/fs/directories)
  const [fsDirectories, setFsDirectories] = useState<Array<{ name: string; path: string; isDirectory: boolean }>>([]);
  const [fsCurrentDir, setFsCurrentDir] = useState<string>("");
  const [fsError, setFsError] = useState<string | null>(null);
  const [isFsBrowserOpen, setIsFsBrowserOpen] = useState(false);
  const [isLoadingFs, setIsLoadingFs] = useState(false);

  const [toolsList, setToolsList] = useState<any[]>([]);
  const [toolsError, setToolsError] = useState<string | null>(null);
  const [projectsList, setProjectsList] = useState<any[]>([]);
  const [projectsError, setProjectsError] = useState<string | null>(null);
  const [notificationsList, setNotificationsList] = useState<any[]>([]);
  const [notificationsError, setNotificationsError] = useState<string | null>(null);
  const [workspaceStatus, setWorkspaceStatus] = useState<any>(null);
  const [isLoadingTab, setIsLoadingTab] = useState(false);

  // Dynamic Providers & Models State
  const [providersList, setProvidersList] = useState<any[]>([]);
  const [modelsList, setModelsList] = useState<any[]>([]);
  const [isAddingProvider, setIsAddingProvider] = useState(false);
  const [newProviderName, setNewProviderName] = useState("");
  const [newProviderType, setNewProviderType] = useState("openai_compatible");
  const [newProviderBaseUrl, setNewProviderBaseUrl] = useState("");
  const [newProviderApiKey, setNewProviderApiKey] = useState("");
  const [newProviderModels, setNewProviderModels] = useState("");
  const [newModelInput, setNewModelInput] = useState("");
  const [providerError, setProviderError] = useState("");
  const [isSavingProvider, setIsSavingProvider] = useState(false);

  const loadProvidersAndModels = async () => {
    setIsLoadingTab(true);
    try {
      const [pRes, cRes, mRes] = await Promise.allSettled([
        sironaApi.providers.providers(),
        sironaApi.providers.connections(),
        sironaApi.providers.models(),
      ]);

      const conns =
        cRes.status === "fulfilled" && cRes.value?.data
          ? Array.isArray(cRes.value.data)
            ? cRes.value.data
            : (cRes.value.data as any)?.connections || []
          : [];

      // Include active environment-based provider
      const allProviders = [
        {
          id: "google-env",
          name: "Google Gemini",
          type: "google",
          baseUrl: "https://generativelanguage.googleapis.com",
          isActive: true,
          configuredFrom: "environment",
        },
        ...conns.map((c: any) => ({
          id: c.id,
          name: c.name,
          type: c.kind || "openai_compatible",
          baseUrl: c.baseUrl || c.base_url,
          isActive: c.isActive !== false,
          configuredFrom: "vault",
        })),
      ];
      setProvidersList(allProviders);

      if (mRes.status === "fulfilled" && mRes.value?.data) {
        const raw =
          (mRes.value.data as any)?.models ||
          (Array.isArray(mRes.value.data) ? mRes.value.data : []);
        const clean = raw.filter((m: any) => m.name !== "Beam Free" && m.id !== "beam-free");
        setModelsList(clean);
      }
    } catch {} finally {
      setIsLoadingTab(false);
    }
  };

  const handleSaveProvider = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newProviderName.trim()) {
      setProviderError("Provider name is required");
      return;
    }
    setProviderError("");
    setIsSavingProvider(true);
    try {
      await sironaApi.providers.saveConnection({
        name: newProviderName.trim(),
        kind: newProviderType,
        baseUrl: newProviderBaseUrl.trim() || undefined,
        apiKey: newProviderApiKey.trim() || undefined,
      });
      setIsAddingProvider(false);
      setNewProviderName("");
      setNewProviderBaseUrl("");
      setNewProviderApiKey("");
      setNewProviderModels("");
      await loadProvidersAndModels();
      onRefreshModels?.();
    } catch (err: any) {
      setProviderError(err.message || "Failed to save provider connection");
    } finally {
      setIsSavingProvider(false);
    }
  };

  const handleDeleteProvider = async (id: string, name: string) => {
    if (id === "google-env") {
      alert("Google Gemini is configured via environment variable (GEMINI_API_KEY) in apps/server/.env");
      return;
    }
    if (!window.confirm(`Remove provider "${name}"?`)) return;
    try {
      await sironaApi.providers.removeConnection(id);
      await loadProvidersAndModels();
      onRefreshModels?.();
    } catch {}
  };

  const handleDeleteModel = async (id: string, name: string) => {
    if (!window.confirm(`Remove model "${name}"?`)) return;
    try {
      await sironaApi.providers.removeConnection(id).catch(() => {});
      await loadProvidersAndModels();
      onRefreshModels?.();
    } catch {}
  };

  const handleAddModel = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newModelInput.trim()) return;
    try {
      setNewModelInput("");
      await loadProvidersAndModels();
      onRefreshModels?.();
    } catch {}
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    setSessionError(null);
    try {
      await sironaApi.identity.logout();
      setSessionData(null);
      await sironaApi.identity.bootstrap().catch(() => {});
      const s = await sironaApi.identity.session().catch(() => null);
      if (s?.data) setSessionData(s.data);
    } catch (err: any) {
      setSessionError(err.message || "Failed to sign out / terminate session");
    } finally {
      setIsLoggingOut(false);
    }
  };

  const browseDirectory = async (targetPath?: string) => {
    setIsLoadingFs(true);
    setFsError(null);
    try {
      const res = await sironaApi.workspace.browseDirectories(targetPath);
      const items = Array.isArray(res?.data) ? res.data : [];
      setFsDirectories(items);
      if (targetPath !== undefined) setFsCurrentDir(targetPath);
    } catch (err: any) {
      setFsError(err.message || "Failed to browse filesystem directory");
    } finally {
      setIsLoadingFs(false);
    }
  };

  // Fetch real data on tab change
  useEffect(() => {
    if (!isOpen) return;

    if (activeTab === "providers" || activeTab === "models") {
      loadProvidersAndModels();
    } else if (activeTab === "servers") {
      setIsLoadingTab(true);
      setServerError(null);
      Promise.allSettled([
        sironaApi.health.live(),
        sironaApi.health.ready(),
        sironaApi.health.health(),
      ])
        .then(([lRes, rRes, hRes]) => {
          if (lRes.status === "fulfilled") setServerLiveness(lRes.value);
          else setServerError(lRes.reason?.message || "Liveness check failed");

          if (rRes.status === "fulfilled") setServerReadiness(rRes.value);
          else setServerError((prev) => prev || rRes.reason?.message || "Readiness check failed");

          if (hRes.status === "fulfilled") setServerHealth(hRes.value);
          else setServerError((prev) => prev || hRes.reason?.message || "Health check failed");
        })
        .finally(() => setIsLoadingTab(false));
    } else if (activeTab === "extensions") {
      setIsLoadingTab(true);
      setToolsError(null);
      setDevConnectionsError(null);
      Promise.allSettled([
        sironaApi.tools.tools(),
        sironaApi.tools.connections(),
      ])
        .then(([tRes, cRes]) => {
          if (tRes.status === "fulfilled") {
            const list = Array.isArray(tRes.value?.data) ? tRes.value.data : ((tRes.value?.data as any)?.items || []);
            setToolsList(list);
          } else {
            setToolsError(tRes.reason?.message || "Failed to load tools");
            setToolsList([]);
          }

          if (cRes.status === "fulfilled") {
            setDevConnectionsList(Array.isArray(cRes.value?.data) ? cRes.value.data : []);
          } else {
            setDevConnectionsError(cRes.reason?.message || "Failed to load developer connections");
            setDevConnectionsList([]);
          }
        })
        .finally(() => setIsLoadingTab(false));
    } else if (activeTab === "experimental") {
      setIsLoadingTab(true);
      setCapabilitiesError(null);
      sironaApi.identity
        .capabilities()
        .then((res) => {
          setCapabilities(res?.data || null);
        })
        .catch((err) => {
          setCapabilitiesError(err.message || "Failed to load capabilities");
          setCapabilities(null);
        })
        .finally(() => setIsLoadingTab(false));
    } else if (activeTab === "general" || activeTab === "about") {
      setSessionError(null);
      sironaApi.identity
        .session()
        .then((res) => {
          setSessionData(res?.data || null);
        })
        .catch((err) => {
          setSessionError(err.message || "Failed to load active session");
          setSessionData(null);
        });
    } else if (activeTab === "projects") {
      setIsLoadingTab(true);
      setProjectsError(null);
      sironaApi.projects
        .list()
        .then((res: any) => {
          const list = res?.data?.projects || (Array.isArray(res?.data) ? res.data : []);
          setProjectsList(list);
        })
        .catch((err) => {
          setProjectsError(err.message || "Failed to load projects");
          setProjectsList([]);
        })
        .finally(() => setIsLoadingTab(false));
    } else if (activeTab === "notifications") {
      setIsLoadingTab(true);
      setNotificationsError(null);
      sironaApi.automation
        .notifications()
        .then((res) => {
          if (res?.data) setNotificationsList(res.data);
        })
        .catch((err) => {
          setNotificationsError(err.message || "Failed to load notifications");
          setNotificationsList([]);
        })
        .finally(() => setIsLoadingTab(false));
    } else if (activeTab === "worktrees") {
      setIsLoadingTab(true);
      sironaApi.workspace
        .readiness("personal-agent")
        .then((res) => setWorkspaceStatus(res?.data))
        .catch((err) => setWorkspaceStatus({ error: err.message || "Failed to load worktree readiness" }))
        .finally(() => setIsLoadingTab(false));
    }
  }, [activeTab, isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Modern Toggle Switch Component
  const ToggleSwitch: React.FC<{
    checked: boolean;
    onChange: (checked: boolean) => void;
    id?: string;
  }> = ({ checked, onChange, id }) => (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
        checked ? "bg-neutral-900 dark:bg-neutral-100" : "bg-neutral-200 dark:bg-neutral-700"
      }`}
    >
      <span
        className={`pointer-events-none inline-block size-4 transform rounded-full bg-white dark:bg-neutral-900 shadow-md ring-0 transition duration-200 ease-in-out ${
          checked ? "translate-x-4" : "translate-x-0"
        }`}
      />
    </button>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fadeIn select-none"
      style={{
        backgroundColor: "rgba(0, 0, 0, 0.45)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
      }}
      onClick={onClose}
    >
      {/* Centered Modal Card */}
      <div
        role="dialog"
        aria-modal="true"
        data-testid="settings-screen"
        className="settings-screen relative w-full max-w-[940px] h-[640px] max-h-[90vh] bg-[var(--surface-bg)] border border-[var(--border-subtle)] rounded-[var(--radius-xl)] shadow-[var(--shadow-floating)] flex overflow-hidden ring-1 ring-white/5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left Settings Sidebar */}
        <aside className="w-[240px] shrink-0 border-r border-[var(--border-subtle)] bg-[var(--sidebar-bg)] p-4 flex flex-col gap-3.5 overflow-y-auto select-none">
          {/* Header Title with Esc Badge */}
          <div className="flex items-center justify-between pb-1">
            <h2 className="text-[14px] font-semibold tracking-tight text-neutral-100">Settings</h2>
            <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded-[var(--radius-sm)] bg-[var(--surface-bg)] border border-[var(--border-subtle)] text-neutral-400">
              Esc
            </kbd>
          </div>

          {/* Search Bar */}
          <div className="relative flex items-center">
            <SearchIcon size={14} className="absolute left-3 text-v2-icon-icon-muted pointer-events-none" />
            <input
              type="search"
              placeholder="Search settings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-v2-background-bg-base rounded-xl py-1.5 pl-8.5 pr-7 text-[12px] text-v2-text-text-base placeholder:text-v2-text-text-faint border border-v2-border-border-base focus:border-v2-border-border-strong focus:outline-none transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 text-v2-text-text-faint hover:text-v2-text-text-base p-0.5 cursor-pointer"
              >
                <CloseIcon size={12} />
              </button>
            )}
          </div>

          {/* Navigation Categories */}
          <div className="flex flex-col gap-4 text-[13px]">
            {/* AI & Governance Group */}
            <div className="flex flex-col gap-0.5">
              <div className="px-2.5 py-1 text-[11px] font-medium text-v2-text-text-faint">
                AI & governance
              </div>
              <button
                type="button"
                onClick={() => setActiveTab("providers")}
                className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-start transition-all cursor-pointer ${
                  activeTab === "providers" || activeTab === "models"
                    ? "bg-v2-background-bg-base border border-v2-border-border-base text-v2-text-text-base font-semibold shadow-xs"
                    : "text-v2-text-text-muted hover:text-v2-text-text-base hover:bg-v2-overlay-simple-overlay-hover"
                }`}
              >
                <Cpu size={15} />
                <span>Models & Providers</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("runs")}
                className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-start transition-all cursor-pointer ${
                  activeTab === "runs"
                    ? "bg-v2-background-bg-base border border-v2-border-border-base text-v2-text-text-base font-semibold shadow-xs"
                    : "text-v2-text-text-muted hover:text-v2-text-text-base hover:bg-v2-overlay-simple-overlay-hover"
                }`}
              >
                <Activity size={15} />
                <span>Runs & Sandbox</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("governance")}
                className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-start transition-all cursor-pointer ${
                  activeTab === "governance"
                    ? "bg-v2-background-bg-base border border-v2-border-border-base text-v2-text-text-base font-semibold shadow-xs"
                    : "text-v2-text-text-muted hover:text-v2-text-text-base hover:bg-v2-overlay-simple-overlay-hover"
                }`}
              >
                <ShieldAlert size={15} />
                <span>Governance & Limits</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("projects")}
                className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-start transition-all cursor-pointer ${
                  activeTab === "projects"
                    ? "bg-v2-background-bg-base border border-v2-border-border-base text-v2-text-text-base font-semibold shadow-xs"
                    : "text-v2-text-text-muted hover:text-v2-text-text-base hover:bg-v2-overlay-simple-overlay-hover"
                }`}
              >
                <FolderIcon size={15} />
                <span>Projects</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("worktrees")}
                className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-start transition-all cursor-pointer ${
                  activeTab === "worktrees"
                    ? "bg-v2-background-bg-base border border-v2-border-border-base text-v2-text-text-base font-semibold shadow-xs"
                    : "text-v2-text-text-muted hover:text-v2-text-text-base hover:bg-v2-overlay-simple-overlay-hover"
                }`}
              >
                <WorktreeIcon size={15} />
                <span>Worktrees</span>
              </button>
            </div>

            {/* Preferences Group */}
            <div className="flex flex-col gap-0.5 border-t border-v2-border-border-base/70 pt-3">
              <div className="px-2.5 py-1 text-[11px] font-medium text-v2-text-text-faint">
                Preferences
              </div>
              <button
                type="button"
                onClick={() => setActiveTab("appearance")}
                className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-start transition-all cursor-pointer ${
                  activeTab === "appearance"
                    ? "bg-v2-background-bg-base border border-v2-border-border-base text-v2-text-text-base font-semibold shadow-xs"
                    : "text-v2-text-text-muted hover:text-v2-text-text-base hover:bg-v2-overlay-simple-overlay-hover"
                }`}
              >
                <AppearanceIcon size={15} />
                <span>Appearance</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("general")}
                className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-start transition-all cursor-pointer ${
                  activeTab === "general"
                    ? "bg-v2-background-bg-base border border-v2-border-border-base text-v2-text-text-base font-semibold shadow-xs"
                    : "text-v2-text-text-muted hover:text-v2-text-text-base hover:bg-v2-overlay-simple-overlay-hover"
                }`}
              >
                <SlidersIcon size={15} />
                <span>General</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("notifications")}
                className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-start transition-all cursor-pointer ${
                  activeTab === "notifications"
                    ? "bg-v2-background-bg-base border border-v2-border-border-base text-v2-text-text-base font-semibold shadow-xs"
                    : "text-v2-text-text-muted hover:text-v2-text-text-base hover:bg-v2-overlay-simple-overlay-hover"
                }`}
              >
                <NotificationsIcon size={15} />
                <span>Notifications</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("shortcuts")}
                className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-start transition-all cursor-pointer ${
                  activeTab === "shortcuts"
                    ? "bg-v2-background-bg-base border border-v2-border-border-base text-v2-text-text-base font-semibold shadow-xs"
                    : "text-v2-text-text-muted hover:text-v2-text-text-base hover:bg-v2-overlay-simple-overlay-hover"
                }`}
              >
                <KeyboardIcon size={15} />
                <span>Shortcuts</span>
              </button>
            </div>

            {/* System Group */}
            <div className="flex flex-col gap-0.5 border-t border-v2-border-border-base/70 pt-3">
              <div className="px-2.5 py-1 text-[11px] font-medium text-v2-text-text-faint">
                System
              </div>
              <button
                type="button"
                onClick={() => setActiveTab("servers")}
                className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-start transition-all cursor-pointer ${
                  activeTab === "servers"
                    ? "bg-v2-background-bg-base border border-v2-border-border-base text-v2-text-text-base font-semibold shadow-xs"
                    : "text-v2-text-text-muted hover:text-v2-text-text-base hover:bg-v2-overlay-simple-overlay-hover"
                }`}
              >
                <ServerIcon size={15} />
                <span>Servers</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("experimental")}
                className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-start transition-all cursor-pointer ${
                  activeTab === "experimental"
                    ? "bg-v2-background-bg-base border border-v2-border-border-base text-v2-text-text-base font-semibold shadow-xs"
                    : "text-v2-text-text-muted hover:text-v2-text-text-base hover:bg-v2-overlay-simple-overlay-hover"
                }`}
              >
                <FlaskIcon size={15} />
                <span>Experimental</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("about")}
                className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-start transition-all cursor-pointer ${
                  activeTab === "about"
                    ? "bg-v2-background-bg-base border border-v2-border-border-base text-v2-text-text-base font-semibold shadow-xs"
                    : "text-v2-text-text-muted hover:text-v2-text-text-base hover:bg-v2-overlay-simple-overlay-hover"
                }`}
              >
                <InfoIcon size={15} />
                <span>About Sirona</span>
              </button>
            </div>
          </div>
        </aside>

        {/* Right Content Area inside Popup */}
        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-[var(--panel-bg)]">
          {/* Top Bar with Category Breadcrumb and Close Button (X) */}
          <div className="flex items-center justify-between px-8 pt-5 pb-3 shrink-0 border-b border-[var(--border-subtle)]">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
              Settings &nbsp;/&nbsp; <span className="text-neutral-200 capitalize">{activeTab}</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-[var(--radius-sm)] text-neutral-400 hover:text-neutral-200 hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
              aria-label="Close settings"
              title="Close (Esc)"
            >
              <CloseIcon size={16} />
            </button>
          </div>

          {/* Scrollable Tab Content Area */}
          <div className="flex-1 p-8 overflow-y-auto">
            {/* Appearance Tab with Premium Visual Theme Pickers */}
            {activeTab === "appearance" && (
              <div className="space-y-8 animate-fadeIn max-w-[680px]">
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-v2-text-text-base">Appearance</h2>
                  <p className="text-[13px] text-v2-text-text-muted mt-1">
                    Customize theme, colors, and visual ergonomics for your workspace.
                  </p>
                </div>

                {/* Theme Mode Cards */}
                <div className="space-y-3.5">
                  <div className="text-[13px] font-semibold text-v2-text-text-base">Interface Theme</div>
                  <div className="grid grid-cols-3 gap-4">
                    {/* Light Card */}
                    <div
                      onClick={() => onThemeChange("light")}
                      className={`group relative p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                        theme === "light"
                          ? "border-neutral-900 dark:border-white bg-white dark:bg-neutral-800 shadow-md ring-2 ring-neutral-900/10 dark:ring-white/10"
                          : "border-v2-border-border-base hover:border-v2-border-border-strong bg-v2-background-bg-deep"
                      }`}
                    >
                      <div className="h-20 rounded-xl bg-neutral-100 border border-neutral-200/80 p-2.5 flex flex-col justify-between mb-3 shadow-inner">
                        <div className="flex items-center justify-between">
                          <div className="size-3 rounded-full bg-neutral-300" />
                          <SunIcon size={14} className="text-neutral-500" />
                        </div>
                        <div className="space-y-1">
                          <div className="h-2 w-3/4 rounded-full bg-neutral-300" />
                          <div className="h-1.5 w-1/2 rounded-full bg-neutral-200" />
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-[13px] text-v2-text-text-base">Light</span>
                        {theme === "light" && (
                          <span className="size-5 rounded-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 flex items-center justify-center">
                            <CheckIcon size={12} />
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Dark Card */}
                    <div
                      onClick={() => onThemeChange("dark")}
                      className={`group relative p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                        theme === "dark"
                          ? "border-neutral-900 dark:border-white bg-white dark:bg-neutral-800 shadow-md ring-2 ring-neutral-900/10 dark:ring-white/10"
                          : "border-v2-border-border-base hover:border-v2-border-border-strong bg-v2-background-bg-deep"
                      }`}
                    >
                      <div className="h-20 rounded-xl bg-neutral-900 border border-neutral-800 p-2.5 flex flex-col justify-between mb-3 shadow-inner">
                        <div className="flex items-center justify-between">
                          <div className="size-3 rounded-full bg-neutral-700" />
                          <MoonIcon size={14} className="text-neutral-400" />
                        </div>
                        <div className="space-y-1">
                          <div className="h-2 w-3/4 rounded-full bg-neutral-700" />
                          <div className="h-1.5 w-1/2 rounded-full bg-neutral-800" />
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-[13px] text-v2-text-text-base">Dark</span>
                        {theme === "dark" && (
                          <span className="size-5 rounded-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 flex items-center justify-center">
                            <CheckIcon size={12} />
                          </span>
                        )}
                      </div>
                    </div>

                    {/* System Card */}
                    <div
                      onClick={() => onThemeChange("system")}
                      className={`group relative p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                        theme === "system"
                          ? "border-neutral-900 dark:border-white bg-white dark:bg-neutral-800 shadow-md ring-2 ring-neutral-900/10 dark:ring-white/10"
                          : "border-v2-border-border-base hover:border-v2-border-border-strong bg-v2-background-bg-deep"
                      }`}
                    >
                      <div className="h-20 rounded-xl overflow-hidden border border-neutral-200/80 dark:border-neutral-700 flex mb-3 shadow-inner">
                        <div className="w-1/2 bg-neutral-100 p-2 flex flex-col justify-between">
                          <SunIcon size={12} className="text-neutral-500" />
                          <div className="h-2 w-full rounded-full bg-neutral-300" />
                        </div>
                        <div className="w-1/2 bg-neutral-900 p-2 flex flex-col justify-between">
                          <MoonIcon size={12} className="text-neutral-400 ms-auto" />
                          <div className="h-2 w-full rounded-full bg-neutral-700 ms-auto" />
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-[13px] text-v2-text-text-base">System</span>
                        {theme === "system" && (
                          <span className="size-5 rounded-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 flex items-center justify-center">
                            <CheckIcon size={12} />
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* General Preferences Tab */}
            {activeTab === "general" && (
              <div className="space-y-8 animate-fadeIn max-w-[680px]">
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-v2-text-text-base">General Preferences</h2>
                  <p className="text-[13px] text-v2-text-text-muted mt-1">
                    Customize layout, automatic actions, and session defaults.
                  </p>
                </div>

                {/* Interface Layout Cards */}
                <div className="space-y-3">
                  <div className="text-[13px] font-semibold text-v2-text-text-base">Tab & Navigation Layout</div>
                  <div className="grid grid-cols-3 gap-3.5">
                    <div
                      onClick={() => setInterfaceLayout("top")}
                      className={`p-3.5 rounded-xl border-2 text-start cursor-pointer transition-all ${
                        interfaceLayout === "top"
                          ? "border-neutral-900 dark:border-white bg-v2-overlay-simple-overlay-selected font-medium shadow-xs"
                          : "border-v2-border-border-base hover:border-v2-border-border-strong bg-v2-background-bg-deep"
                      }`}
                    >
                      <div className="font-semibold text-[13px] text-v2-text-text-base">Top Tabs</div>
                      <div className="text-[11px] text-v2-text-text-muted mt-1">Browser-style horizontal tabs</div>
                    </div>

                    <div
                      onClick={() => setInterfaceLayout("side")}
                      className={`p-3.5 rounded-xl border-2 text-start cursor-pointer transition-all ${
                        interfaceLayout === "side"
                          ? "border-neutral-900 dark:border-white bg-v2-overlay-simple-overlay-selected font-medium shadow-xs"
                          : "border-v2-border-border-base hover:border-v2-border-border-strong bg-v2-background-bg-deep"
                      }`}
                    >
                      <div className="font-semibold text-[13px] text-v2-text-text-base">Sidebar Tabs</div>
                      <div className="text-[11px] text-v2-text-text-muted mt-1">Vertical navigation sidebar</div>
                    </div>

                    <div
                      onClick={() => setInterfaceLayout("inbox")}
                      className={`p-3.5 rounded-xl border-2 text-start cursor-pointer transition-all ${
                        interfaceLayout === "inbox"
                          ? "border-neutral-900 dark:border-white bg-v2-overlay-simple-overlay-selected font-medium shadow-xs"
                          : "border-v2-border-border-base hover:border-v2-border-border-strong bg-v2-background-bg-deep"
                      }`}
                    >
                      <div className="font-semibold text-[13px] text-v2-text-text-base flex items-center gap-1.5">
                        <span>Unified Inbox</span>
                        <span className="text-[9px] bg-neutral-200 dark:bg-neutral-700 px-1 py-0.5 rounded text-neutral-600 dark:text-neutral-300 font-bold uppercase">
                          Beta
                        </span>
                      </div>
                      <div className="text-[11px] text-v2-text-text-muted mt-1">Sessions sorted by priority</div>
                    </div>
                  </div>
                </div>

                {/* Toggles & Options */}
                <div className="divide-y divide-v2-border-border-base/70 pt-2 space-y-4 text-[13px]">
                  <div className="flex items-center justify-between py-3">
                    <div>
                      <div className="font-semibold text-v2-text-text-base">Auto-accept Permissions</div>
                      <div className="text-v2-text-text-muted text-[12px] mt-0.5">
                        Automatically approve tool execution requests without prompting
                      </div>
                    </div>
                    <ToggleSwitch checked={autoAcceptPermissions} onChange={setAutoAcceptPermissions} />
                  </div>

                  <div className="flex items-center justify-between py-3">
                    <div>
                      <div className="font-semibold text-v2-text-text-base">Show Agent Switcher</div>
                      <div className="text-v2-text-text-muted text-[12px] mt-0.5">
                        Show agent selector inside the prompt composer
                      </div>
                    </div>
                    <ToggleSwitch checked={showAgent} onChange={setShowAgent} />
                  </div>

                  <div className="flex items-center justify-between py-3">
                    <div>
                      <div className="font-semibold text-v2-text-text-base">Wrap Lines in Code Diffs</div>
                      <div className="text-v2-text-text-muted text-[12px] mt-0.5">
                        Soft-wrap long lines in unified diffs instead of horizontal scrolling
                      </div>
                    </div>
                    <ToggleSwitch checked={wrapLines} onChange={setWrapLines} />
                  </div>

                  <div className="flex items-center justify-between py-3">
                    <div>
                      <div className="font-semibold text-v2-text-text-base">Show Changed Files Summary</div>
                      <div className="text-v2-text-text-muted text-[12px] mt-0.5">
                        List modified files at the end of every agent turn
                      </div>
                    </div>
                    <ToggleSwitch checked={changedFiles} onChange={setChangedFiles} />
                  </div>
                </div>
              </div>
            )}

            {/* Models & Providers Tab */}
            {(activeTab === "providers" || activeTab === "models") && (
              <div className="space-y-6 animate-fadeIn">
                <ModelProviderSection onRefreshModels={onRefreshModels} />
              </div>
            )}

            {/* Runs & Sandbox Tab */}
            {activeTab === "runs" && (
              <div className="space-y-6 animate-fadeIn">
                <AgentExecutionSection />
              </div>
            )}

            {/* Governance & Limits Tab */}
            {activeTab === "governance" && (
              <div className="space-y-6 animate-fadeIn">
                <GovernanceBudgetSection />
              </div>
            )}

            {/* About & Active Session Tab (GET /api/v1/session & DELETE /api/v1/session) */}
            {activeTab === "about" && (
              <div className="space-y-8 animate-fadeIn max-w-[680px]">
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-v2-text-text-base">About Sirona & Session</h2>
                  <p className="text-[13px] text-v2-text-text-muted mt-1">
                    Local-first autonomous coding and agent workspace session management.
                  </p>
                </div>

                {/* Active Session & Principal Identity */}
                <div className="rounded-2xl border border-v2-border-border-base bg-v2-background-bg-base p-5 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-v2-border-border-base">
                    <div>
                      <h3 className="font-semibold text-sm text-v2-text-text-base">Authenticated Principal</h3>
                      <p className="text-[11px] text-v2-text-text-muted">Bound session credentials and workspace scope</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border-rose-500/20"
                      onClick={handleLogout}
                      isLoading={isLoggingOut}
                    >
                      <LogOut className="size-3.5 mr-1.5" />
                      Sign out / End session
                    </Button>
                  </div>

                  {sessionError ? (
                    <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-2">
                      <AlertCircle className="size-4 text-rose-400 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-semibold text-rose-400">Session API Notice</div>
                        <div className="text-[11px] font-mono leading-relaxed">{sessionError}</div>
                      </div>
                    </div>
                  ) : sessionData ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
                      <div className="p-3 rounded-xl bg-v2-background-bg-deep border border-v2-border-border-base">
                        <div className="text-v2-text-text-faint text-[10px] uppercase tracking-wider mb-1">Principal ID</div>
                        <div className="text-v2-text-text-base truncate select-text">{sessionData.principalId}</div>
                      </div>
                      <div className="p-3 rounded-xl bg-v2-background-bg-deep border border-v2-border-border-base">
                        <div className="text-v2-text-text-faint text-[10px] uppercase tracking-wider mb-1">Workspace ID</div>
                        <div className="text-v2-text-text-base truncate select-text">{sessionData.workspaceId}</div>
                      </div>
                    </div>
                  ) : (
                    <div className="py-2 text-xs text-v2-text-text-muted font-mono">
                      Fetching active session metadata...
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-v2-border-border-base bg-v2-background-bg-base divide-y divide-v2-border-border-base/70 text-[13px]">
                  <div className="flex justify-between items-center p-4">
                    <span className="text-v2-text-text-muted">Version</span>
                    <span className="font-mono font-medium text-v2-text-text-base bg-v2-background-bg-deep px-2 py-0.5 rounded border border-v2-border-border-base">
                      1.0.0 (build 2026.11)
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-4">
                    <span className="text-v2-text-text-muted">Frontend Architecture</span>
                    <span className="font-medium text-v2-text-text-base">React 19 + TypeScript + Vite + Tailwind v4</span>
                  </div>
                  <div className="flex justify-between items-center p-4">
                    <span className="text-v2-text-text-muted">Desktop Runtime</span>
                    <span className="font-medium text-v2-text-text-base">Electron + Local Node.js Proxy</span>
                  </div>
                </div>
              </div>
            )}

            {/* Servers & Health Diagnostics Tab (GET /health/live, GET /health/ready, GET /health) */}
            {activeTab === "servers" && (
              <div className="space-y-8 animate-fadeIn max-w-[680px]">
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-v2-text-text-base">Backend & Server Health</h2>
                  <p className="text-[13px] text-v2-text-text-muted mt-1">
                    Live system status, active database connections, and operational diagnostics.
                  </p>
                </div>

                {serverError && (
                  <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-2.5">
                    <AlertCircle className="size-4 text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold text-rose-400">Health Probe Warning</div>
                      <div className="text-[11px] font-mono leading-relaxed mt-0.5">{serverError}</div>
                    </div>
                  </div>
                )}

                <div className="rounded-2xl border border-v2-border-border-base bg-v2-background-bg-base divide-y divide-v2-border-border-base/70 text-[13px]">
                  {/* Liveness Probe: GET /health/live */}
                  <div className="flex justify-between items-center p-4">
                    <div>
                      <span className="font-semibold text-v2-text-text-base">Server Liveness (GET /health/live)</span>
                      <p className="text-[11px] text-v2-text-text-muted">Process lifecycle heartbeat on HTTP loopback</p>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1.5 ${
                        serverLiveness?.status === "live"
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                          : "bg-neutral-200 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-400"
                      }`}
                    >
                      <span
                        className={`size-1.5 rounded-full ${
                          serverLiveness?.status === "live" ? "bg-emerald-500 animate-pulse" : "bg-neutral-500"
                        }`}
                      />
                      {serverLiveness?.status ? `Status: ${serverLiveness.status}` : "Probing..."}
                    </span>
                  </div>

                  {/* Readiness Probe: GET /health/ready */}
                  <div className="flex justify-between items-center p-4">
                    <div>
                      <span className="font-semibold text-v2-text-text-base">Service Readiness (GET /health/ready)</span>
                      <p className="text-[11px] text-v2-text-text-muted">Dependency readiness (database & task leases available)</p>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1.5 ${
                        serverReadiness?.ready
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                          : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                      }`}
                    >
                      <span
                        className={`size-1.5 rounded-full ${
                          serverReadiness?.ready ? "bg-emerald-500" : "bg-amber-500 animate-pulse"
                        }`}
                      />
                      {serverReadiness !== null
                        ? serverReadiness.ready
                          ? "Ready (200 OK)"
                          : "Unready (503 Service Unavailable)"
                        : "Probing..."}
                    </span>
                  </div>

                  {/* Canonical Database Probe: GET /health */}
                  <div className="flex justify-between items-center p-4">
                    <div>
                      <span className="font-semibold text-v2-text-text-base">Database Health (GET /health)</span>
                      <p className="text-[11px] text-v2-text-text-muted">Target Postgres architecture connectivity</p>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1.5 ${
                        serverHealth?.db
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                          : "bg-neutral-200 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-400"
                      }`}
                    >
                      <span
                        className={`size-1.5 rounded-full ${serverHealth?.db ? "bg-emerald-500" : "bg-neutral-500"}`}
                      />
                      {serverHealth !== null
                        ? serverHealth.db
                          ? "Connected"
                          : "Disconnected"
                        : "Probing..."}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Extensions & Tools Tab (GET /api/v1/tools & GET /api/v1/developer-connections) */}
            {activeTab === "extensions" && (
              <div className="space-y-8 animate-fadeIn max-w-[680px]">
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-v2-text-text-base">Tools & Developer Bridges</h2>
                  <p className="text-[13px] text-v2-text-text-muted mt-1">
                    Autonomous agent tool execution boundary and external developer bridge connections.
                  </p>
                </div>

                {/* Developer Connections (GET /api/v1/developer-connections) */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-v2-text-text-base">Developer Bridge Connections</h3>
                    <span className="font-mono text-[11px] text-v2-text-text-faint">{devConnectionsList.length} connections</span>
                  </div>

                  {devConnectionsError ? (
                    <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-2.5">
                      <AlertCircle className="size-4 text-rose-400 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-semibold text-rose-400">Developer Connections API Error</div>
                        <div className="text-[11px] font-mono leading-relaxed mt-0.5">{devConnectionsError}</div>
                      </div>
                    </div>
                  ) : devConnectionsList.length > 0 ? (
                    <div className="space-y-2">
                      {devConnectionsList.map((conn: any) => (
                        <div
                          key={conn.id}
                          className="flex items-center justify-between p-3.5 rounded-xl border border-v2-border-border-base bg-v2-background-bg-base"
                        >
                          <div>
                            <div className="font-semibold text-[13px] text-v2-text-text-base">{conn.name}</div>
                            <div className="text-[11px] font-mono text-v2-text-text-muted mt-0.5">{conn.type} • {conn.id}</div>
                          </div>
                          <span
                            className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                              conn.status === "active" || conn.status === "connected"
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : "bg-neutral-800 text-neutral-400"
                            }`}
                          >
                            {conn.status || "idle"}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl border border-dashed border-v2-border-border-base text-center text-xs text-v2-text-text-muted font-mono">
                      No external developer bridges connected
                    </div>
                  )}
                </div>

                {/* Registered Agent Tools (GET /api/v1/tools) */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-v2-text-text-base">Registered Agent Tools</h3>
                    <span className="font-mono text-[11px] text-v2-text-text-faint">{toolsList.length} tools</span>
                  </div>

                  {toolsError ? (
                    <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-2.5">
                      <AlertCircle className="size-4 text-rose-400 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-semibold text-rose-400">Tools API Notice</div>
                        <div className="text-[11px] font-mono leading-relaxed mt-0.5">{toolsError}</div>
                      </div>
                    </div>
                  ) : toolsList.length > 0 ? (
                    <div className="space-y-2">
                      {toolsList.map((t: any) => (
                        <div
                          key={t.id}
                          className="flex items-center justify-between p-3.5 rounded-xl border border-v2-border-border-base bg-v2-background-bg-base"
                        >
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-[13px] text-v2-text-text-base">{t.name}</span>
                              <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-v2-background-bg-deep border border-v2-border-border-base text-v2-text-text-faint">
                                {t.id}
                              </span>
                            </div>
                            <p className="text-[11px] text-v2-text-text-muted">{t.description}</p>
                          </div>
                          <span
                            className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                              t.requiresApproval
                                ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            }`}
                          >
                            {t.requiresApproval ? "Approval required" : "Auto-approved"}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl border border-dashed border-v2-border-border-base text-center text-xs text-v2-text-text-muted font-mono">
                      No registered tools returned
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Projects Tab with Directory Browser (GET /api/v1/fs/directories) */}
            {activeTab === "projects" && (
              <div className="space-y-8 animate-fadeIn max-w-[680px]">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold tracking-tight text-v2-text-text-base">Workspaces & Projects</h2>
                    <p className="text-[13px] text-v2-text-text-muted mt-1">
                      Canonical workspace directories and active Git VCS bindings.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => {
                      setIsFsBrowserOpen(!isFsBrowserOpen);
                      if (!isFsBrowserOpen) browseDirectory();
                    }}
                  >
                    <FolderOpen className="size-3.5 mr-1.5" />
                    {isFsBrowserOpen ? "Close directory browser" : "Browse filesystem"}
                  </Button>
                </div>

                {/* Directory Browser Explorer Dialog */}
                {isFsBrowserOpen && (
                  <div className="rounded-2xl border border-v2-border-border-base bg-v2-background-bg-base p-4 space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-v2-border-border-base">
                      <div className="flex items-center gap-2 min-w-0">
                        <Folder className="size-4 text-amber-400 shrink-0" />
                        <span className="font-mono text-xs text-v2-text-text-base truncate">
                          {fsCurrentDir || "Workspace Root"}
                        </span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-6 text-[10px] px-2"
                        onClick={() => {
                          const parent = fsCurrentDir.includes("/")
                            ? fsCurrentDir.substring(0, fsCurrentDir.lastIndexOf("/"))
                            : fsCurrentDir.includes("\\")
                            ? fsCurrentDir.substring(0, fsCurrentDir.lastIndexOf("\\"))
                            : "";
                          browseDirectory(parent);
                        }}
                      >
                        Navigate up
                      </Button>
                    </div>

                    {fsError ? (
                      <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-2">
                        <AlertCircle className="size-4 text-rose-400 shrink-0 mt-0.5" />
                        <div>
                          <div className="font-semibold text-rose-400">Directory API Error</div>
                          <div className="text-[11px] font-mono leading-relaxed">{fsError}</div>
                        </div>
                      </div>
                    ) : isLoadingFs ? (
                      <div className="py-6 text-center text-xs text-v2-text-text-muted font-mono">
                        Scanning directories...
                      </div>
                    ) : fsDirectories.length > 0 ? (
                      <div className="max-h-48 overflow-y-auto space-y-1">
                        {fsDirectories.map((item) => (
                          <div
                            key={item.path}
                            onClick={() => item.isDirectory && browseDirectory(item.path)}
                            className={`flex items-center justify-between p-2 rounded-lg text-xs font-mono transition-colors ${
                              item.isDirectory
                                ? "hover:bg-v2-overlay-simple-overlay-hover cursor-pointer text-v2-text-text-base"
                                : "text-v2-text-text-muted cursor-default"
                            }`}
                          >
                            <div className="flex items-center gap-2 truncate">
                              <Folder className="size-3.5 text-neutral-400 shrink-0" />
                              <span className="truncate">{item.name}</span>
                            </div>
                            <span className="text-[10px] text-v2-text-text-faint">{item.path}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-4 text-center text-xs text-v2-text-text-muted font-mono">
                        No subdirectories found in current path
                      </div>
                    )}
                  </div>
                )}

                {projectsError ? (
                  <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-2.5">
                    <AlertCircle className="size-4 text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold text-rose-400">Projects API Notice</div>
                      <div className="text-[11px] font-mono leading-relaxed mt-0.5">{projectsError}</div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {projectsList.map((p: any) => (
                      <div
                        key={p.id}
                        className="p-4 rounded-xl border border-v2-border-border-base bg-v2-background-bg-base space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-[14px] text-v2-text-text-base">{p.name}</span>
                          <span className="px-2 py-0.5 text-[11px] rounded bg-neutral-200 dark:bg-neutral-700 text-v2-text-text-base font-mono">
                            {p.vcs || "git"}
                          </span>
                        </div>
                        <p className="text-[12px] font-mono text-v2-text-text-muted truncate">{p.canonical}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Notifications Tab */}
            {activeTab === "notifications" && (
              <div className="space-y-8 animate-fadeIn max-w-[680px]">
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-v2-text-text-base">Notifications & Activity</h2>
                  <p className="text-[13px] text-v2-text-text-muted mt-1">
                    System activity log, audit events, and agent completion receipts.
                  </p>
                </div>

                <div className="space-y-3">
                  {notificationsList.map((n: any) => (
                    <div
                      key={n.id}
                      className="flex items-center justify-between p-3.5 rounded-xl border border-v2-border-border-base bg-v2-background-bg-base"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className={`size-2 rounded-full ${n.read ? "bg-neutral-300 dark:bg-neutral-600" : "bg-blue-500 animate-pulse"}`} />
                        <span className="text-[13px] text-v2-text-text-base">{n.message}</span>
                      </div>
                      <span className="text-[11px] text-v2-text-text-faint">
                        {new Date(n.createdAt || Date.now()).toLocaleTimeString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Worktrees Tab */}
            {activeTab === "worktrees" && (
              <div className="space-y-8 animate-fadeIn max-w-[680px]">
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-v2-text-text-base">Worktrees & Isolation</h2>
                  <p className="text-[13px] text-v2-text-text-muted mt-1">
                    Multi-worktree branch isolation and PTY terminal containers.
                  </p>
                </div>

                <div className="rounded-2xl border border-v2-border-border-base bg-v2-background-bg-base p-5 space-y-3 text-[13px]">
                  <div className="flex items-center justify-between">
                    <span className="text-v2-text-text-muted">Primary Worktree</span>
                    <span className="font-mono text-[12px] text-v2-text-text-base">main</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-v2-text-text-muted">Isolation Readiness</span>
                    <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                      {workspaceStatus?.ready ? "Ready" : "Active"}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Shortcuts Tab */}
            {activeTab === "shortcuts" && (
              <div className="space-y-8 animate-fadeIn max-w-[680px]">
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-v2-text-text-base">Keyboard Shortcuts</h2>
                  <p className="text-[13px] text-v2-text-text-muted mt-1">
                    Quick navigation and action hotkeys.
                  </p>
                </div>

                <div className="rounded-2xl border border-v2-border-border-base bg-v2-background-bg-base divide-y divide-v2-border-border-base/70 text-[13px]">
                  <div className="flex justify-between items-center p-3.5">
                    <span className="text-v2-text-text-base">Toggle Settings Popup</span>
                    <kbd className="font-mono text-[11px] px-2 py-0.5 rounded bg-v2-background-bg-deep border border-v2-border-border-base text-v2-text-text-faint">
                      Ctrl+,
                    </kbd>
                  </div>
                  <div className="flex justify-between items-center p-3.5">
                    <span className="text-v2-text-text-base">New Chat Session</span>
                    <kbd className="font-mono text-[11px] px-2 py-0.5 rounded bg-v2-background-bg-deep border border-v2-border-border-base text-v2-text-text-faint">
                      Ctrl+T
                    </kbd>
                  </div>
                  <div className="flex justify-between items-center p-3.5">
                    <span className="text-v2-text-text-base">Toggle Sidebar Collapse</span>
                    <kbd className="font-mono text-[11px] px-2 py-0.5 rounded bg-v2-background-bg-deep border border-v2-border-border-base text-v2-text-text-faint">
                      Ctrl+B
                    </kbd>
                  </div>
                  <div className="flex justify-between items-center p-3.5">
                    <span className="text-v2-text-text-base">Close Modal / Dialog</span>
                    <kbd className="font-mono text-[11px] px-2 py-0.5 rounded bg-v2-background-bg-deep border border-v2-border-border-base text-v2-text-text-faint">
                      Esc
                    </kbd>
                  </div>
                </div>
              </div>
            )}

            {/* Experimental & Platform Capabilities Tab (GET /api/v1/capabilities) */}
            {activeTab === "experimental" && (
              <div className="space-y-8 animate-fadeIn max-w-[680px]">
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-v2-text-text-base">Platform & Agent Capabilities</h2>
                  <p className="text-[13px] text-v2-text-text-muted mt-1">
                    Live runtime capabilities negotiated by the Sirona kernel from GET /api/v1/capabilities.
                  </p>
                </div>

                {capabilitiesError ? (
                  <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-2.5">
                    <AlertCircle className="size-4 text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold text-rose-400">Capabilities API Error</div>
                      <div className="text-[11px] font-mono leading-relaxed mt-0.5">{capabilitiesError}</div>
                    </div>
                  </div>
                ) : capabilities ? (
                  <div className="rounded-2xl border border-v2-border-border-base bg-v2-background-bg-base divide-y divide-v2-border-border-base/70 text-[13px]">
                    {Object.entries(capabilities).map(([capKey, isEnabled]) => (
                      <div key={capKey} className="flex items-center justify-between p-3.5">
                        <div className="space-y-0.5">
                          <span className="font-mono text-xs text-v2-text-text-base font-medium">{capKey}</span>
                          <p className="text-[11px] text-v2-text-text-muted">Kernel capability flag</p>
                        </div>
                        <span
                          className={`font-mono text-[10px] px-2 py-0.5 rounded ${
                            isEnabled
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : "bg-neutral-800 text-neutral-400"
                          }`}
                        >
                          {isEnabled ? "enabled" : "disabled"}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center text-xs text-v2-text-text-muted font-mono border border-dashed border-v2-border-border-base rounded-2xl">
                    Querying kernel capabilities from /api/v1/capabilities...
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
