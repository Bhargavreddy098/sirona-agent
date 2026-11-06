import React, { useState, useEffect, useCallback } from "react";
import sironaApi from "./api";
import { Titlebar } from "./components/Titlebar";
import { Sidebar } from "./components/Sidebar";
import { MainCanvas, MessageItem } from "./components/MainCanvas";
import { SettingsScreen } from "./components/SettingsScreen";
import { ModelSelectorModal } from "./components/ModelSelectorModal";

export const App: React.FC = () => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<
    | "providers"
    | "models"
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
  >("appearance");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedModel, setSelectedModel] = useState("Gemini 3.5 Flash Lite");
  const [selectedModelId, setSelectedModelId] = useState("gemini-3.5-flash-lite");
  const [availableModels, setAvailableModels] = useState<any[]>([]);
  const [isModelPickerOpen, setIsModelPickerOpen] = useState(false);
  const [theme, setTheme] = useState<"system" | "light" | "dark">("light");
  const [sessionId, setSessionId] = useState<string>("session-default");
  const [sessionTitle, setSessionTitle] = useState<string>("Session");
  const [sessionsList, setSessionsList] = useState<Array<{ id: string; title: string }>>([]);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [isSending, setIsSending] = useState(false);

  // Apply theme to document
  const applyTheme = useCallback((newTheme: "system" | "light" | "dark") => {
    setTheme(newTheme);
    localStorage.setItem("sirona-theme", newTheme);
    const root = document.documentElement;
    const isDark =
      newTheme === "dark" ||
      (newTheme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);

    if (isDark) {
      root.classList.add("dark");
      root.dataset.theme = "dark";
      root.style.setProperty("--v2-background-bg-deep", "#121212");
      root.style.setProperty("--v2-background-bg-base", "#1e1e1e");
    } else {
      root.classList.remove("dark");
      root.dataset.theme = "light";
      root.style.setProperty("--v2-background-bg-deep", "#fafafa");
      root.style.setProperty("--v2-background-bg-base", "#ffffff");
    }
  }, []);

  useEffect(() => {
    const savedTheme = (localStorage.getItem("sirona-theme") as "system" | "light" | "dark") || "light";
    applyTheme(savedTheme);
  }, [applyTheme]);

  // Initial data loading from backend
  useEffect(() => {
    // Bootstrap v1 session
    sironaApi.identity.bootstrap().catch(() => {});

    // Fetch registered models from canonical provider gateway
    sironaApi.providers
      .models()
      .then((res) => {
        const list = res?.data?.models || (Array.isArray(res?.data) ? res.data : []);
        if (Array.isArray(list) && list.length > 0) {
          const clean = list.filter((m: any) => m.name !== "Beam Free" && m.id !== "beam-free");
          setAvailableModels(clean);
          const currentValid = clean.find((m: any) => m.id === selectedModelId || m.name === selectedModel);
          if (!currentValid) {
            const ready = clean.find((m: any) => m.hasConfiguredApiKey) || clean[0];
            if (ready) {
              setSelectedModel(ready.name);
              setSelectedModelId(ready.id);
            }
          }
        }
      })
      .catch(() => {});

    // Fetch active or recent sessions
    sironaApi.conversations
      .list()
      .then((res) => {
        const sessions = res?.data || [];
        if (Array.isArray(sessions) && sessions.length > 0) {
          setSessionsList(sessions);
          const first = sessions[0];
          setSessionId(first.id);
          setSessionTitle(first.title || "Session");
        }
      })
      .catch(() => {});
  }, []);

  const parseMessageContent = (raw: any): string => {
    if (typeof raw === "string") {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed.map((p) => (typeof p === "string" ? p : p.text || "")).join("\n");
        }
        if (parsed && typeof parsed === "object") {
          return parsed.text || parsed.content || raw;
        }
      } catch {}
      return raw;
    }
    if (Array.isArray(raw)) {
      return raw.map((p) => (typeof p === "string" ? p : p.text || "")).join("\n");
    }
    if (raw && typeof raw === "object") {
      return raw.text || raw.content || JSON.stringify(raw);
    }
    return String(raw || "");
  };

  // Fetch messages when sessionId changes
  useEffect(() => {
    if (!sessionId || sessionId.startsWith("session-")) {
      setMessages([]);
      return;
    }
    sironaApi.conversations
      .messages(sessionId)
      .then((res) => {
        const list = res?.data || [];
        if (Array.isArray(list)) {
          const loaded: MessageItem[] = list.map((m: any) => ({
            id: String(m.id || Math.random()),
            role: m.role === "assistant" ? "assistant" : "user",
            content: parseMessageContent(m.content),
            timestamp: m.created_at ? new Date(m.created_at).getTime() : Date.now(),
          }));
          setMessages(loaded);
        }
      })
      .catch(() => {});
  }, [sessionId]);

  // Handle sending a message through the Canonical Gateway
  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isSending) return;

    const userMsgId = `msg-${Date.now()}`;
    const userMsg: MessageItem = {
      id: userMsgId,
      role: "user",
      content: text,
      timestamp: Date.now(),
    };

    const replyId = `reply-${Date.now()}`;
    const assistantMsg: MessageItem = {
      id: replyId,
      role: "assistant",
      content: "",
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setIsSending(true);

    try {
      // 1. Ensure a valid canonical conversation exists
      let currentConvId = sessionId;
      if (!currentConvId || currentConvId.startsWith("session-")) {
        const createRes = await sironaApi.conversations.create({
          title: text.length > 25 ? `${text.slice(0, 25)}…` : text,
          modelId: selectedModelId || "gemini-2.5-flash-lite",
        });
        const created = (createRes as any)?.data?.conversation;
        if (created?.id) {
          currentConvId = created.id;
          setSessionId(created.id);
          setSessionTitle(created.title || "Chat");
          setSessionsList((prev) => [
            { id: created.id, title: created.title || "Chat" },
            ...prev.filter((s) => s.id !== sessionId),
          ]);
        }
      }

      // 2. Stream turn via Gateway SSE
      let accumulated = "";
      await new Promise<void>((resolve, reject) => {
        sironaApi.conversations.streamTurns(
          currentConvId,
          {
            prompt: text,
            modelId: selectedModelId || "gemini-2.5-flash-lite",
          },
          {
            onToken: (chunk) => {
              accumulated += chunk;
              setMessages((prev) =>
                prev.map((m) => (m.id === replyId ? { ...m, content: accumulated } : m))
              );
            },
            onError: (err) => {
              const msg = err?.message || String(err);
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === replyId
                    ? {
                        ...m,
                        content: accumulated
                          ? `${accumulated}\n\n[Gateway Notice: ${msg}]`
                          : `⚠️ ${msg}`,
                      }
                    : m
                )
              );
              reject(err);
            },
            onDone: () => {
              resolve();
            },
          }
        );
      });
    } catch (err: any) {
      console.warn("[Gateway stream failed]:", err?.message);
      const msg = err?.message || String(err);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === replyId && !m.content
            ? { ...m, content: `⚠️ Failed to start turn: ${msg}` }
            : m
        )
      );
    } finally {
      setIsSending(false);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+, or Cmd+, for settings popup
      if ((e.ctrlKey || e.metaKey) && e.key === ",") {
        e.preventDefault();
        setIsSettingsOpen((o) => !o);
      }
      // Ctrl+B or Cmd+B for sidebar toggle
      if ((e.ctrlKey || e.metaKey) && (e.key === "b" || e.key === "B") && !e.shiftKey) {
        e.preventDefault();
        setSidebarOpen((o) => !o);
      }
      // Ctrl+T or Cmd+T for new session
      if ((e.ctrlKey || e.metaKey) && (e.key === "t" || e.key === "T")) {
        e.preventDefault();
        handleNewSession();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleNewSession = async () => {
    try {
      const conv = await sironaApi.conversations.create({
        title: "New chat",
        modelId: selectedModelId || "gemini-2.5-flash-lite",
      });
      const newId = (conv as any)?.data?.conversation?.id || `session-${Date.now()}`;
      setSessionId(newId);
      setSessionTitle("New chat");
      setMessages([]);
      setSessionsList((prev) => [{ id: newId, title: "New chat" }, ...prev]);
    } catch {
      const newId = `session-${Date.now()}`;
      setSessionId(newId);
      setSessionTitle("Session");
      setMessages([]);
      setSessionsList((prev) => [{ id: newId, title: "Session" }, ...prev]);
    }
    setIsSettingsOpen(false);
  };

  return (
    <div
      className="relative bg-v2-background-bg-deep flex-1 min-h-0 min-w-0 flex flex-col select-none [&_input]:select-text [&_textarea]:select-text [&_[contenteditable]]:select-text"
      style={{
        height: "100vh",
        minHeight: "100vh",
        width: "100%",
        // @ts-ignore
        "--shell-inline-inset": "8px",
        "--shell-top-inset": "8px",
        "--shell-bottom-inset":
          "max(0px, calc(8px - var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 0px))))",
      }}
    >
      {/* Main App Background UI - blurred when settings popup is open */}
      <div
        className="flex-1 min-h-0 min-w-0 flex flex-col transition-[filter,opacity] duration-200"
        style={{
          filter: isSettingsOpen ? "blur(8px)" : "none",
          WebkitFilter: isSettingsOpen ? "blur(8px)" : "none",
          opacity: isSettingsOpen ? 0.75 : 1,
          pointerEvents: isSettingsOpen ? "none" : "auto",
        }}
      >
        <Titlebar
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen((o) => !o)}
          selectedModel={selectedModel}
          onOpenModelPicker={() => setIsModelPickerOpen(true)}
          onOpenSettings={() => {
            setSettingsTab("providers");
            setIsSettingsOpen(true);
          }}
          theme={theme}
          onToggleTheme={() => applyTheme(theme === "dark" ? "light" : "dark")}
          activeSessionTitle={sessionTitle}
          isBackendConnected={true}
        />

        <div className="relative flex flex-1 min-h-0 min-w-0 flex-row">
          <Sidebar
            isOpen={sidebarOpen}
            onToggle={() => setSidebarOpen((o) => !o)}
            isSettingsOpen={isSettingsOpen}
            onNavigateHome={() => setIsSettingsOpen(false)}
            onOpenSettings={() => {
              setSettingsTab("appearance");
              setIsSettingsOpen(true);
            }}
            onNewSession={handleNewSession}
            activeSessionTitle={sessionTitle}
            onCloseSessionTab={() => {
              setMessages([]);
              setSessionTitle("Session");
            }}
            sessions={sessionsList}
            currentSessionId={sessionId}
            onSelectSession={(id) => {
              const target = sessionsList.find((s) => s.id === id);
              setSessionId(id);
              setSessionTitle(target?.title || "Session");
              setIsSettingsOpen(false);
            }}
          />

          <MainCanvas
            selectedModel={selectedModel}
            onOpenModelPicker={() => setIsModelPickerOpen(true)}
            onSendMessage={handleSendMessage}
            messages={messages}
            isSending={isSending}
          />
        </div>
      </div>

      {/* Settings Modal Popup */}
      <SettingsScreen
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        initialTab={settingsTab}
        theme={theme}
        onThemeChange={applyTheme}
        selectedModel={selectedModel}
        onModelChange={(model) => {
          setSelectedModel(model);
          const found = availableModels.find((m) => m.name === model || m.id === model);
          if (found) setSelectedModelId(found.id);
          sironaApi.providers.saveSettings({ primaryModel: found?.id || model, defaultModel: found?.id || model }).catch(() => {});
        }}
        onRefreshModels={() => {
          sironaApi.providers.models().then((res) => {
            const list = res?.data?.models || (Array.isArray(res?.data) ? res.data : []);
            if (Array.isArray(list) && list.length > 0) {
              const clean = list.filter((m: any) => m.name !== "Beam Free" && m.id !== "beam-free");
              setAvailableModels(clean);
            }
          }).catch(() => {});
        }}
      />

      {/* Model Selector Modal */}
      <ModelSelectorModal
        isOpen={isModelPickerOpen}
        onClose={() => setIsModelPickerOpen(false)}
        selectedModel={selectedModel}
        availableModels={availableModels}
        onSelectModel={(modelName, modelId) => {
          setSelectedModel(modelName);
          if (modelId) {
            setSelectedModelId(modelId);
          } else {
            const found = availableModels.find((m) => m.name === modelName);
            if (found) setSelectedModelId(found.id);
          }
          sironaApi.providers.saveSettings({ primaryModel: modelId || modelName, defaultModel: modelId || modelName }).catch(() => {});
        }}
        onOpenProviderSettings={() => {
          setSettingsTab("providers");
          setIsModelPickerOpen(false);
          setIsSettingsOpen(true);
        }}
      />
    </div>
  );
};

export default App;
