import { useEffect, useState } from 'react';
import type { Conversation } from '../api/schemas';
import { useWorkspace } from '../hooks/useWorkspace';
import { Sidebar, type AppPage } from '../components/layout/Sidebar';
import { Header } from '../components/layout/Header';
import { Chat } from '../features/chat/Chat';
import { InboxView } from '../features/inbox/InboxView';
import { AutomationView } from '../features/automation/AutomationView';
import { SettingsView } from '../features/settings/SettingsView';
import { DiffReviewModal } from '../features/editor/DiffReviewModal';
import { executionApi } from '../api';

export default function App() {
  const w = useWorkspace();
  const [page, setPage] = useState<AppPage>('chat');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => window.innerWidth < 760);
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [fileDrawerOpen, setFileDrawerOpen] = useState(false);
  const [apiMapActive, setApiMapActive] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastFading, setToastFading] = useState(false);
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0);

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('sirona-theme') : null;
    if (saved === 'dark' || saved === 'light') return saved;
    return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  });

  // Apply theme
  useEffect(() => {
    try {
      localStorage.setItem('sirona-theme', theme);
      document.documentElement.dataset.theme = theme;
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } catch {}
  }, [theme]);

  // Global keyboard shortcuts (Ctrl+K: New Chat, Ctrl+B: Toggle Sidebar, Ctrl+`: Toggle Terminal)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCmd = e.ctrlKey || e.metaKey;
      if (isCmd && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        w.newChat();
        setPage('chat');
      } else if (isCmd && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setSidebarCollapsed(prev => !prev);
      } else if (e.ctrlKey && (e.key === '`' || e.key === '~')) {
        e.preventDefault();
        setTerminalOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [w]);

  // Load pending approvals count periodically
  useEffect(() => {
    const fetchPendingCount = async () => {
      try {
        const res = await executionApi.approvals(w.projectId);
        const count = (res.approvals || []).filter(a => a.state === 'pending').length;
        setPendingApprovalsCount(count);
      } catch {
        // Fallback
      }
    };
    void fetchPendingCount();
    const interval = setInterval(fetchPendingCount, 8000);
    return () => clearInterval(interval);
  }, [w.projectId]);

  // Toast helper
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setToastFading(false);
    setTimeout(() => setToastFading(true), 2400);
    setTimeout(() => {
      setToastMessage(null);
      setToastFading(false);
    }, 2900);
  };

  // Toggle API map
  const handleToggleApiMap = () => {
    setApiMapActive(prev => {
      const next = !prev;
      if (next) {
        document.body.classList.add('map');
      } else {
        document.body.classList.remove('map');
      }
      return next;
    });
  };

  // Navigation router
  const handleNavigate = (next: AppPage) => {
    if (next === 'files') {
      setPage('chat');
      setFileDrawerOpen(prev => !prev);
      return;
    }
    setPage(next);
    if (window.innerWidth < 760) {
      setSidebarCollapsed(true);
    }
  };

  // Native folder picker
  const handleOpenFolder = async () => {
    if (window.sirona?.pickFolder) {
      try {
        const chosen = await window.sirona.pickFolder();
        if (chosen) {
          const name = chosen.replace(/[\\/]+$/, '').split(/[\\/]/).pop() || chosen;
          await w.createProject(name, chosen);
          showToast(`Opened folder: ${name}`);
        }
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Folder selection failed');
      }
      return;
    }

    if (typeof window.showDirectoryPicker === 'function') {
      try {
        const dirHandle = await window.showDirectoryPicker();
        if (dirHandle) {
          await w.createProject(dirHandle.name);
          showToast(`Opened folder: ${dirHandle.name}`);
        }
        return;
      } catch (err: unknown) {
        if ((err as Error)?.name === 'AbortError') return;
      }
    }

    // Fallback: create project with default name
    try {
      await w.createProject('billing-service');
      showToast('Opened folder: billing-service');
    } catch {
      showToast('Project folder attached');
    }
  };

  const attachedProject = w.projects.find(p => p.id === w.projectId);

  return (
    <div className={`app ${sidebarCollapsed ? 'c' : ''}`} id="app">
      {/* Collapsible Left Sidebar */}
      <Sidebar
        page={page}
        locked={w.running}
        conversations={w.conversations}
        activeConversationId={w.active?.id}
        pendingApprovalsCount={pendingApprovalsCount}
        connected={w.connected}
        theme={theme}
        loadingHistory={w.initializing}
        onNavigate={handleNavigate}
        onNewChat={() => {
          w.newChat();
          setPage('chat');
        }}
        onOpenConversation={(conversation: Conversation) => {
          void w.open(conversation);
          setPage('chat');
        }}
        onCollapse={() => setSidebarCollapsed(true)}
        onToggleTheme={() => setTheme(t => (t === 'dark' ? 'light' : 'dark'))}
      />

      {/* Main Column */}
      <main className="mn">
        {/* Top Header */}
        <Header
          page={page}
          sidebarVisible={!sidebarCollapsed}
          attachedProjectName={attachedProject?.name}
          terminalOpen={terminalOpen}
          apiMapActive={apiMapActive}
          onExpandSidebar={() => setSidebarCollapsed(false)}
          onOpenFolder={() => void handleOpenFolder()}
          onToggleTerminal={() => setTerminalOpen(prev => !prev)}
          onToggleApiMap={handleToggleApiMap}
        />

        {/* Views */}
        {page === 'chat' && (
          <section className="view on" id="v-chat">
            <Chat
              workspace={w}
              terminalOpen={terminalOpen}
              fileDrawerOpen={fileDrawerOpen}
              onToggleTerminal={() => setTerminalOpen(prev => !prev)}
              onToggleFileDrawer={() => setFileDrawerOpen(prev => !prev)}
              onOpenFolder={() => void handleOpenFolder()}
              onProviders={() => setPage('settings')}
              onToast={showToast}
            />
          </section>
        )}

        {page === 'inbox' && (
          <section className="view on" id="v-inbox">
            <InboxView
              projectId={w.projectId}
              onOpenInChat={() => setPage('chat')}
              onToast={showToast}
            />
          </section>
        )}

        {page === 'automations' && (
          <section className="view on" id="v-automations">
            <AutomationView
              projectId={w.projectId}
              onToast={showToast}
            />
          </section>
        )}

        {page === 'settings' && (
          <section className="view on" id="v-settings">
            <SettingsView
              projectId={w.projectId}
              onToast={showToast}
              onRefreshModels={w.loadModels}
            />
          </section>
        )}
      </main>

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className={`ts ${toastFading ? 'x' : ''}`} role="status">
          {toastMessage}
        </div>
      )}

      {/* Side-by-Side Monaco Diff Review Modal */}
      <DiffReviewModal />
    </div>
  );
}
