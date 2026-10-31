import { useEffect, useRef, useState, useCallback } from 'react'
import {
  ArrowDownToLine,
  Check,
  Code2,
  Copy,
  FileText,
  FolderOpen,
  PanelLeftOpen,
  Pencil,
  Sparkles,
  X,
  ChevronDown,
  ChevronRight,
  BrainCircuit,
  Loader2,
  Database
} from 'lucide-react'
import AIComposer, { type AIComposerSubmission } from '@/components/ui/ai-prompt-composer-with-model-selector'
import { SettingsModal } from '@/components/SettingsModal'
import Sidebar from '@/components/Sidebar'
import { api, type SessionItem, type MessageItem, type AppSettings } from '@/lib/api'
import { getSocket, joinSessionRoom, leaveSessionRoom } from '@/lib/socket'
import './App.css'

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  reasoning?: string | null;
  attachedFiles?: string[];
  mode?: string;
  modelName?: string;
  effort?: string;
  createdAt: string;
}

export interface Conversation {
  id: string;
  title: string;
  model?: string;
  messages: ChatMessage[];
  updatedAt: string;
}

const STORAGE = 'sirona.chat.v1'
const createFallbackConversation = (): Conversation => ({
  id: crypto.randomUUID(),
  title: 'New conversation',
  model: 'gemini-2.5-flash',
  messages: [],
  updatedAt: new Date().toISOString()
})

const suggestions = [
  { icon: Code2, title: 'Build something', description: 'Turn an idea into a starting point', prompt: 'Help me build a new feature with Sirona. Let us plan the architecture and files first.' },
  { icon: FolderOpen, title: 'Explore a codebase', description: 'Find your way around a project', prompt: 'Help me understand @codebase. Start with the structure and explain how the main backend and frontend pieces fit together.' },
  { icon: FileText, title: 'Make a plan', description: 'Break a big task into clear steps', prompt: 'Help me make a step-by-step implementation plan. Ask me what I want to achieve before making changes.' },
]

export default function App() {
  const [conversations, setConversations] = useState<Conversation[]>(() => [createFallbackConversation()])
  const [activeId, setActiveId] = useState<string | null>(null)
  const active = conversations.find(chat => chat.id === activeId) || conversations[0] || createFallbackConversation()

  const [query, setQuery] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth > 760)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const theme = 'light' as const
  const [draft, setDraft] = useState({ text: '', revision: 0 })
  const [notice, setNotice] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [renaming, setRenaming] = useState(false)
  const [newTitle, setNewTitle] = useState('')

  // Real-time backend & streaming states
  const [isBackendOnline, setIsBackendOnline] = useState<boolean | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [streamingToken, setStreamingToken] = useState('')
  const [streamingReasoning, setStreamingReasoning] = useState('')
  const [expandedReasoning, setExpandedReasoning] = useState<{ [msgId: string]: boolean }>({})
  const [activeSettings, setActiveSettings] = useState<AppSettings>({ default_model: 'gemini-2.5-flash' })

  const transcriptRef = useRef<HTMLDivElement>(null)
  const shouldScroll = useRef(true)

  // 1. Initial Health Check & Load Sessions from PostgreSQL
  const refreshSessionsFromBackend = useCallback(async () => {
    try {
      const health = await api.getHealth();
      setIsBackendOnline(Boolean(health.db));

      const sessionsRes = await api.listSessions();
      if (sessionsRes?.sessions && sessionsRes.sessions.length > 0) {
        const loadedChats: Conversation[] = sessionsRes.sessions.map((s: SessionItem) => ({
          id: s.id,
          title: s.title || 'Untitled Session',
          model: s.model,
          messages: [],
          updatedAt: s.last_activity_at || new Date().toISOString(),
        }));
        setConversations(loadedChats);
        if (!activeId || !sessionsRes.sessions.some(s => s.id === activeId)) {
          setActiveId(sessionsRes.sessions[0].id);
        }
      }
    } catch {
      setIsBackendOnline(false);
      // Fallback to localStorage if backend offline
      try {
        const saved = JSON.parse(localStorage.getItem(STORAGE) || '[]');
        if (Array.isArray(saved) && saved.length > 0) {
          setConversations(saved);
        }
      } catch {
        // Keep initial fallback
      }
    }
  }, [activeId]);

  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect
    refreshSessionsFromBackend();

    // Load remote settings
    api.getSettings().then(res => {
      if (res?.settings) setActiveSettings(res.settings);
    }).catch(() => {});
  }, [refreshSessionsFromBackend]);

  // 2. Fetch Messages for Active Session
  useEffect(() => {
    if (!active?.id) return;

    joinSessionRoom(active.id);

    if (isBackendOnline) {
      api.getSessionMessages(active.id)
        .then(res => {
          if (res?.messages) {
            const mapped: ChatMessage[] = res.messages.map((m: MessageItem) => ({
              id: m.id,
              role: m.role === 'assistant' ? 'assistant' : 'user',
              content: m.content,
              reasoning: m.reasoning,
              createdAt: m.created_at,
            }));
            setConversations(prev => prev.map(c => c.id === active.id ? { ...c, messages: mapped } : c));
          }
        })
        .catch(err => {
          console.warn('Could not fetch messages for session:', err.message);
        });
    }

    return () => {
      leaveSessionRoom(active.id);
    };
  }, [active?.id, isBackendOnline]);

  // 3. Socket.IO Streaming Event Listeners
  useEffect(() => {
    const socket = getSocket();

    const handleStreamToken = (data: { token: string; session_id: string }) => {
      if (data.session_id === active.id) {
        setStreamingToken(prev => prev + data.token);
      }
    };

    const handleStreamReasoning = (data: { thought: string; session_id: string }) => {
      if (data.session_id === active.id) {
        setStreamingReasoning(prev => prev + data.thought);
      }
    };

    const handleStreamDone = () => {
      setIsGenerating(false);
      // Refresh current messages to ensure persisted state
      if (active.id) {
        api.getSessionMessages(active.id).then(res => {
          if (res?.messages) {
            const mapped: ChatMessage[] = res.messages.map((m: MessageItem) => ({
              id: m.id,
              role: m.role === 'assistant' ? 'assistant' : 'user',
              content: m.content,
              reasoning: m.reasoning,
              createdAt: m.created_at,
            }));
            setConversations(prev => prev.map(c => c.id === active.id ? { ...c, messages: mapped } : c));
          }
        }).catch(() => {});
      }
      setStreamingToken('');
      setStreamingReasoning('');
    };

    const handleStreamError = (data: { error: string }) => {
      setIsGenerating(false);
      setNotice(`Streaming error: ${data.error}`);
    };

    socket.on('stream.token', handleStreamToken);
    socket.on('stream.reasoning', handleStreamReasoning);
    socket.on('stream.done', handleStreamDone);
    socket.on('stream.error', handleStreamError);

    return () => {
      socket.off('stream.token', handleStreamToken);
      socket.off('stream.reasoning', handleStreamReasoning);
      socket.off('stream.done', handleStreamDone);
      socket.off('stream.error', handleStreamError);
    };
  }, [active.id]);

  // Sync to localStorage as backup
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE, JSON.stringify(conversations));
    } catch {
      // Ignore
    }
  }, [conversations]);

  // Auto-scroll transcript
  useEffect(() => {
    if (shouldScroll.current && transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [active.messages.length, streamingToken, streamingReasoning]);

  // Keyboard shortcut Ctrl+K
  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
        event.preventDefault();
        setSidebarOpen(true);
      }
      if (event.key === 'Escape') {
        setSettingsOpen(false);
        setRenaming(false);
      }
    };
    window.addEventListener('keydown', keydown);
    return () => window.removeEventListener('keydown', keydown);
  }, []);

  function seedPrompt(text: string) {
    setDraft(previous => ({ text, revision: previous.revision + 1 }));
  }

  async function newConversation() {
    try {
      if (isBackendOnline) {
        const res = await api.createSession({
          title: 'New conversation',
          model: activeSettings.default_model || 'gemini-2.5-flash',
          reasoning_effort: activeSettings.default_reasoning_effort || 'medium',
        });
        if (res?.session) {
          const newChat: Conversation = {
            id: res.session.id,
            title: res.session.title || 'New conversation',
            model: res.session.model,
            messages: [],
            updatedAt: res.session.created_at || new Date().toISOString(),
          };
          setConversations(prev => [newChat, ...prev]);
          setActiveId(newChat.id);
          seedPrompt('');
          setQuery('');
          setNotice('');
          shouldScroll.current = true;
          if (window.innerWidth <= 760) setSidebarOpen(false);
          return;
        }
      }
    } catch {
      // Offline fallback
    }

    const fallback = createFallbackConversation();
    setConversations(prev => [fallback, ...prev]);
    setActiveId(fallback.id);
    seedPrompt('');
    setQuery('');
    setNotice('');
    shouldScroll.current = true;
    if (window.innerWidth <= 760) setSidebarOpen(false);
  }

  async function submit(submission: AIComposerSubmission) {
    const userPrompt = submission.prompt.trim();
    if (!userPrompt && submission.attachedFiles.length === 0) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: userPrompt || submission.attachedFiles.join(', '),
      attachedFiles: submission.attachedFiles,
      mode: submission.mode,
      modelName: submission.modelName,
      effort: submission.effort,
      createdAt: new Date().toISOString(),
    };

    shouldScroll.current = true;
    let targetSessionId = active.id;

    // 1. Ensure a session exists on the backend
    if (isBackendOnline && active.messages.length === 0) {
      try {
        const createRes = await api.createSession({
          title: (userPrompt || 'New Session').slice(0, 48),
          model: submission.modelId || activeSettings.default_model || 'gemini-2.5-flash',
          reasoning_effort: (submission.effort || 'Medium').toLowerCase(),
        });
        if (createRes?.session) {
          targetSessionId = createRes.session.id;
          setActiveId(targetSessionId);
        }
      } catch (err: any) {
        console.warn('Failed to pre-create session on backend:', err.message);
      }
    }

    // 2. Pre-flight user prompt into local state
    setConversations(prev =>
      prev.map(chat =>
        chat.id === active.id || chat.id === targetSessionId
          ? {
              ...chat,
              id: targetSessionId,
              title: chat.messages.length === 0 ? (userPrompt || 'New conversation').slice(0, 48) : chat.title,
              messages: [...chat.messages, userMessage],
              updatedAt: userMessage.createdAt,
            }
          : chat
      )
    );

    // 3. Initiate AI turn execution
    if (isBackendOnline) {
      setIsGenerating(true);
      setStreamingToken('');
      setStreamingReasoning('');

      try {
        const effortLower = (submission.effort || 'Medium').toLowerCase();
        const chatRes = await api.sendChatPrompt(targetSessionId, {
          prompt: userPrompt,
          reasoning_effort: effortLower === 'max' ? 'high' : effortLower,
        });

        // If turn was not streamed or finished immediately, append final message
        if (chatRes?.response && !streamingToken) {
          const assistantMsg: ChatMessage = {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: chatRes.response,
            createdAt: new Date().toISOString(),
          };
          setConversations(prev =>
            prev.map(c => c.id === targetSessionId ? { ...c, messages: [...c.messages, assistantMsg] } : c)
          );
        }
      } catch (err: any) {
        setNotice(`Execution notice: ${err.message}`);
        setIsGenerating(false);
      }
    } else {
      setNotice('Backend offline. Saved prompt locally. Run `node server.js` in backend folder to enable live streaming.');
    }
  }

  async function deleteConversation(id: string) {
    if (isBackendOnline) {
      await api.deleteSession(id).catch(() => {});
    }
    setConversations(previous => {
      const next = previous.filter(chat => chat.id !== id);
      return next.length ? next : [createFallbackConversation()];
    });
    if (active.id === id) {
      setActiveId(null);
      seedPrompt('');
      setNotice('');
    }
  }

  async function copy(message: ChatMessage) {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopiedId(message.id);
      window.setTimeout(() => setCopiedId(null), 1800);
    } catch {
      setNotice('Clipboard access failed. Select text to copy.');
    }
  }

  function exportChat() {
    const url = URL.createObjectURL(new Blob([JSON.stringify(active, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `sirona-${active.title.toLowerCase().replace(/\s+/g, '-')}.json`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const toggleReasoning = (msgId: string) => {
    setExpandedReasoning(prev => ({ ...prev, [msgId]: !prev[msgId] }));
  };

  const filtered = [...conversations]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .filter(chat => `${chat.title} ${chat.messages.map(m => m.content).join(' ')}`.toLowerCase().includes(query.toLowerCase()));

  const handleSelectConversation = (id: string) => {
    setActiveId(id);
    seedPrompt('');
    setNotice('');
    shouldScroll.current = true;
    if (window.innerWidth <= 760) setSidebarOpen(false);
  };

  const handleRenameConversation = (id: string) => {
    const chat = conversations.find(c => c.id === id);
    if (chat) {
      setActiveId(id);
      setNewTitle(chat.title);
      setRenaming(true);
    }
  };

  return (
    <div className={`studio ${theme} ${sidebarOpen ? 'with-sidebar' : ''}`}>
      <a className="skip-link" href="#conversation">Skip to conversation</a>

      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        conversations={conversations}
        activeId={activeId}
        query={query}
        onQueryChange={setQuery}
        filtered={filtered}
        onSelectConversation={handleSelectConversation}
        onNewConversation={newConversation}
        onDeleteConversation={deleteConversation}
        onRenameConversation={handleRenameConversation}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      {/* ================= MAIN CHAT AREA ================= */}
      <main className="main-area" id="conversation">
        <header className="topbar">
          <div className="topbar-left">
            {!sidebarOpen && (
              <button className="icon-button" aria-label="Open sidebar" onClick={() => setSidebarOpen(true)}>
                <PanelLeftOpen size={18} />
              </button>
            )}
            <span className="workspace-name">{active.title}</span>
          </div>

          <div className="topbar-actions">
            {isBackendOnline !== null && (
              <span className={`backend-status-pill ${isBackendOnline ? 'online' : 'offline'}`}>
                <Database size={12} />
                <span>{isBackendOnline ? 'PostgreSQL Active' : 'Backend Offline'}</span>
              </span>
            )}
            <button
              className="icon-button"
              title="Export conversation"
              aria-label="Export conversation"
              disabled={!active.messages.length}
              onClick={exportChat}
            >
              <ArrowDownToLine size={17} />
            </button>
          </div>
        </header>

        {renaming && (
          <form
            className="rename-bar"
            onSubmit={event => {
              event.preventDefault();
              if (newTitle.trim()) {
                const updated = newTitle.trim().slice(0, 80);
                setConversations(previous => previous.map(chat => chat.id === active.id ? { ...chat, title: updated } : chat));
                if (isBackendOnline) api.updateSession(active.id, { title: updated }).catch(() => {});
              }
              setRenaming(false);
            }}
          >
            <label htmlFor="conversation-title">Conversation name</label>
            <input
              id="conversation-title"
              autoFocus
              maxLength={80}
              value={newTitle}
              onChange={event => setNewTitle(event.target.value)}
            />
            <button type="submit">Save</button>
            <button type="button" aria-label="Cancel rename" onClick={() => setRenaming(false)}>
              <X size={16} />
            </button>
          </form>
        )}

        <div
          className={`conversation-body ${active.messages.length || isGenerating ? 'has-messages' : ''}`}
          ref={transcriptRef}
          onScroll={event => {
            const element = event.currentTarget;
            shouldScroll.current = element.scrollHeight - element.scrollTop - element.clientHeight < 80;
          }}
        >
          {!active.messages.length && !isGenerating ? (
            <div className="welcome">
              <div className="welcome-symbol">
                <Sparkles size={30} strokeWidth={1.25} />
              </div>
              <h1>A little idea.<br /><span>A lot of possibility.</span></h1>
              <p>What would you like to build or automate today?</p>
              <div className="suggestions">
                {suggestions.map(item => (
                  <button key={item.title} onClick={() => seedPrompt(item.prompt)}>
                    <item.icon size={19} strokeWidth={1.6} />
                    <strong>{item.title}</strong>
                    <span>{item.description}</span>
                    <ArrowUpRight size={15} className="suggestion-arrow" />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="transcript" role="log" aria-label="Conversation messages" aria-live="polite">
              {active.messages.map(message => (
                <article className={`message ${message.role}`} key={message.id}>
                  <div className="message-heading">
                    <span className={`avatar ${message.role === 'assistant' ? 'assistant-avatar' : ''}`}>
                      {message.role === 'assistant' ? <Sparkles size={14} /> : 'Y'}
                    </span>
                    <strong>{message.role === 'assistant' ? 'Sirona Agent' : 'You'}</strong>
                    <time dateTime={message.createdAt}>
                      {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </time>
                    <div className="message-actions">
                      {message.role === 'user' && (
                        <button className="icon-button" title="Edit as new prompt" aria-label="Edit as new prompt" onClick={() => seedPrompt(message.content)}>
                          <Pencil size={14} />
                        </button>
                      )}
                      <button className="icon-button" aria-label="Copy message" title="Copy message" onClick={() => void copy(message)}>
                        {copiedId === message.id ? <Check size={14} /> : <Copy size={14} />}
                      </button>
                    </div>
                  </div>

                  {/* Collapsible Reasoning Block */}
                  {message.reasoning && (
                    <div className="reasoning-box">
                      <div
                        className="reasoning-box-header"
                        onClick={() => toggleReasoning(message.id)}
                      >
                        <BrainCircuit size={14} />
                        <span>Reasoning & Thought Process</span>
                        {expandedReasoning[message.id] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </div>
                      {expandedReasoning[message.id] && (
                        <div className="reasoning-content">
                          {message.reasoning}
                        </div>
                      )}
                    </div>
                  )}

                  <p className="message-text">{message.content}</p>

                  {message.attachedFiles && message.attachedFiles.length > 0 && (
                    <div className="message-files">
                      {message.attachedFiles.map((file, index) => (
                        <span key={`${file}-${index}`}><FileText size={13} />{file}</span>
                      ))}
                    </div>
                  )}

                  {message.role === 'user' && message.modelName && (
                    <div className="message-metadata">
                      {message.mode}
                      <span>·</span>
                      {message.modelName}
                      <span>·</span>
                      {message.effort} effort
                    </div>
                  )}
                </article>
              ))}

              {/* Real-time Streaming Bubble */}
              {isGenerating && (
                <article className="message assistant streaming">
                  <div className="message-heading">
                    <span className="avatar assistant-avatar">
                      <Sparkles size={14} />
                    </span>
                    <strong>Sirona Agent</strong>
                    <time>Thinking...</time>
                  </div>

                  {streamingReasoning && (
                    <div className="reasoning-box">
                      <div className="reasoning-box-header">
                        <BrainCircuit size={14} />
                        <span>Thinking...</span>
                        <Loader2 size={12} className="spin" />
                      </div>
                      <div className="reasoning-content">
                        {streamingReasoning}
                      </div>
                    </div>
                  )}

                  <p className="message-text">
                    {streamingToken}
                    <span className="streaming-indicator" />
                  </p>
                </article>
              )}
            </div>
          )}
        </div>

        {/* ================= COMPOSER DOCK ================= */}
        <footer className="composer-dock">
          {notice && (
            <div className="inline-notice" role="status">
              <span>{notice}</span>
              <button className="icon-button" aria-label="Dismiss notice" onClick={() => setNotice('')}>
                <X size={14} />
              </button>
            </div>
          )}

          <AIComposer
            key={active.id}
            initialTheme={theme}
            embedded
            draftPrompt={draft}
            showUpgradeBanner={false}
            showWalkthroughControl
            onSubmit={submit}
          />

          <div className="composer-caption">
            <span>Think it through. Make it happen.</span>
            <span><kbd>Enter</kbd> to send <span className="caption-divider">·</span> <kbd>Shift Enter</kbd> for a new line</span>
          </div>
        </footer>
      </main>

      {/* ================= SETTINGS & MODEL PROVIDERS CARD ================= */}
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onSettingsSaved={(newSettings) => {
          setActiveSettings(newSettings);
          setNotice('Model provider preferences updated successfully.');
        }}
      />
    </div>
  )
}

</content>