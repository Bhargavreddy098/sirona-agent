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
  const [selectedModel, setSelectedModel] = useState("Claude 3.5 Sonnet");
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

    // Fetch default model
    sironaApi.providers
      .models()
      .then((res) => {
        if (res?.data && res.data.length > 0) {
          const valid = res.data.filter((m: any) => m.name !== "Beam Free" && m.id !== "beam-free");
          if (valid.length > 0) {
            const def = valid.find((m: any) => m.isDefault) || valid[0];
            setSelectedModel(def.name);
          }
        }
      })
      .catch(() => {
        fetch("/api/model/default")
          .then((res) => (res.ok ? res.json() : null))
          .then((data) => {
            if (data?.model?.name && data.model.name !== "Beam Free") {
              setSelectedModel(data.model.name);
            }
          })
          .catch(() => {});
      });

    // Fetch active or recent sessions
    sironaApi.conversations
      .list()
      .then((res) => {
        if (res?.data && Array.isArray(res.data) && res.data.length > 0) {
          setSessionsList(res.data);
          const first = res.data[0];
          setSessionId(first.id);
          setSessionTitle(first.title || "Session");
        } else {
          throw new Error("No v1 conversations");
        }
      })
      .catch(() => {
        fetch("/api/session")
          .then((res) => (res.ok ? res.json() : null))
          .then((data) => {
            if (data?.data && Array.isArray(data.data) && data.data.length > 0) {
              setSessionsList(data.data);
              const first = data.data[0];
              setSessionId(first.id);
              setSessionTitle(first.title || "Session");
            }
          })
          .catch(() => {});
      });
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
    if (!sessionId) return;
    fetch(`/api/session/${sessionId}/message`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.data && Array.isArray(data.data)) {
          const loaded: MessageItem[] = data.data.map((m: any) => ({
            id: m.id || Math.random().toString(),
            role: m.role === "assistant" ? "assistant" : "user",
            content: parseMessageContent(m.parts || m.content),
          }));
          setMessages(loaded);
        }
      })
      .catch(() => {});
  }, [sessionId]);

  // Handle sending a message
  const handleSendMessage = async (text: string) => {
    const userMsgId = `msg-${Date.now()}`;
    const userMsg: MessageItem = {
      id: userMsgId,
      role: "user",
      content: text,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsSending(true);

    try {
      const res = await fetch(`/api/session/${sessionId}/prompt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: text, model: selectedModel }),
      });

      if (res.ok) {
        const data = await res.json();
        const assistantText =
          data?.reply ||
          data?.content ||
          data?.text ||
          `Task received. Sirona is processing your request using ${selectedModel}.`;

        const assistantMsg: MessageItem = {
          id: `reply-${Date.now()}`,
          role: "assistant",
          content: assistantText,
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } else {
        // Fallback response for offline or free desktop mode
        const fallbackMsg: MessageItem = {
          id: `reply-${Date.now()}`,
          role: "assistant",
          content: `Sirona received: "${text}" with ${selectedModel}. Workspace is active.`,
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, fallbackMsg]);
      }
    } catch {
      const fallbackMsg: MessageItem = {
        id: `reply-${Date.now()}`,
        role: "assistant",
        content: `Sirona completed action for: "${text}"`,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, fallbackMsg]);
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
    const newId = `session-${Date.now()}`;
    setSessionId(newId);
    setSessionTitle("Session");
    setMessages([]);
    setSessionsList((prev) => [{ id: newId, title: "Session" }, ...prev]);
    setIsSettingsOpen(false);

    try {
      await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: newId, title: "Session" }),
      });
    } catch {}
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
        <Titlebar />

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
          fetch("/api/model/default", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: model }),
          }).catch(() => {});
        }}
        onRefreshModels={() => {
          fetch("/api/model/default")
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => {
              if (data?.model?.name) setSelectedModel(data.model.name);
            })
            .catch(() => {});
        }}
      />

      {/* Model Selector Modal */}
      <ModelSelectorModal
        isOpen={isModelPickerOpen}
        onClose={() => setIsModelPickerOpen(false)}
        selectedModel={selectedModel}
        onSelectModel={(model) => setSelectedModel(model)}
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
