import { useEffect, useState } from 'react';
import { RiRefreshLine, RiCloseLine } from '@remixicon/react';
import type { Conversation } from '../api/schemas';
import { useWorkspace } from '../hooks/useWorkspace';
import { api } from '../api/client';
import { Sidebar } from '../components/layout/Sidebar';
import { Header } from '../components/layout/Header';
import { Dialog } from '../components/ui/Dialog';
import { Chat } from '../features/chat/Chat';
import { CodingWorkspace } from '../features/workspace/CodingWorkspace';
import {
  WorkspaceCompanion,
  type CompanionTab,
} from '../features/workspace/WorkspaceCompanion';
import { Providers } from '../features/model-providers/Providers';
import { AutomationView } from '../features/automation/AutomationView';
import { MemoryView } from '../features/memory/MemoryView';

export default function App() {
  const w = useWorkspace();
  const [page, setPage] = useState<'chat' | 'settings' | 'workspace' | 'automation' | 'memory'>('chat');
  const [sidebar, setSidebar] = useState(() => window.innerWidth >= 900);
  const [actions, setActions] = useState(false);
  const [rename, setRename] = useState(false);
  const [title, setTitle] = useState('');
  const [remove, setRemove] = useState(false);
  const [conversationToRemove, setConversationToRemove] = useState<Conversation | null>(null);
  const [executionBusy, setExecutionBusy] = useState(false);
  const [companionOpen, setCompanionOpen] = useState(false);
  const [companionTab, setCompanionTab] = useState<CompanionTab>('files');
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('sirona-theme') : null;
    if (saved === 'dark' || saved === 'light') return saved;
    return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  });

  useEffect(() => {
    try {
      localStorage.setItem('sirona-theme', theme);
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
        document.documentElement.setAttribute('data-theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.setAttribute('data-theme', 'light');
      }
    } catch {}
  }, [theme]);

  const locked = w.running || executionBusy;
  const navigate = (next: typeof page) => {
    if (locked) return;
    setPage(next);
  };

  const confirmDelete = (conversation?: Conversation | null) => {
    const target = conversation || w.active;
    if (!target) return;
    setConversationToRemove(target);
    setActions(false);
    setRemove(true);
  };

  const handleOpenCompanion = (tab?: CompanionTab) => {
    if (tab) setCompanionTab(tab);
    setCompanionOpen(true);
  };

  const attachedProject = w.projects.find(p => p.id === w.projectId);

  return (
    <div className={`app-shell ${sidebar ? '' : 'sidebar-collapsed'} flex h-screen w-screen overflow-hidden bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans antialiased`}>
      {sidebar && (
        <Sidebar
          page={page}
          locked={locked}
          conversations={w.conversations}
          activeConversationId={w.active?.id}
          onNavigate={navigate}
          onNewChat={() => {
            w.newChat();
            setPage('chat');
          }}
          onOpenConversation={conversation => {
            void w.open(conversation);
            setPage('chat');
          }}
          onDeleteConversation={confirmDelete}
          onCollapse={() => setSidebar(false)}
        />
      )}

      <main className="flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
        <Header
          page={page}
          sidebarVisible={sidebar}
          activeTitle={w.active?.title}
          locked={locked}
          onExpandSidebar={() => setSidebar(true)}
          onOpenActions={() => setActions(true)}
          onDeleteChat={() => confirmDelete(w.active)}
          companionOpen={companionOpen}
          onToggleCompanion={() => setCompanionOpen(prev => !prev)}
          attachedProjectName={attachedProject?.name}
          theme={theme}
          onToggleTheme={() => setTheme(t => (t === 'dark' ? 'light' : 'dark'))}
        />

        {w.error && (
          <div className="global-notice flex items-center justify-between px-4 py-2 bg-red-50 dark:bg-red-950/40 border-b border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 text-xs" role="alert">
            <span>{w.error}</span>
            <button
              className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
              aria-label="Dismiss error"
              onClick={() => w.setError('')}
            >
              <RiCloseLine size={16} />
            </button>
          </div>
        )}

        {!w.connected && (
          <div className="connection-notice flex items-center justify-between px-4 py-2 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-900/50 text-amber-700 dark:text-amber-300 text-xs" role="status">
            <span>
              {w.initializing
                ? 'Connecting to your workspace…'
                : 'Desktop connection required'}
            </span>
            <button
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded border border-amber-300 dark:border-amber-800 bg-white dark:bg-zinc-900 hover:bg-amber-100/50 transition-colors cursor-pointer text-xs font-medium disabled:opacity-50"
              disabled={w.initializing}
              onClick={() => void w.connect()}
            >
              <RiRefreshLine size={14} className={w.initializing ? 'animate-spin' : ''} />
              <span>Reconnect</span>
            </button>
          </div>
        )}

        {page === 'chat' ? (
          <div className="flex-1 flex min-h-0 overflow-hidden relative">
            <Chat
              workspace={w}
              onProviders={() => setPage('settings')}
              onOpenCompanion={handleOpenCompanion}
              isCompanionOpen={companionOpen}
              activeCompanionTab={companionTab}
            />
            {companionOpen && (
              <WorkspaceCompanion
                projects={w.projects}
                activeProjectId={w.projectId}
                onSelectProject={id => w.attachProject(id)}
                activeTab={companionTab}
                onChangeTab={setCompanionTab}
                onClose={() => setCompanionOpen(false)}
                onBusy={setExecutionBusy}
                connected={w.connected}
              />
            )}
          </div>
        ) : page === 'workspace' ? (
          <CodingWorkspace
            key={w.projectId ?? 'all'}
            projects={w.projects}
            connected={w.connected}
            initialProjectId={w.projectId}
            onBusy={setExecutionBusy}
          />
        ) : page === 'automation' ? (
          <AutomationView projectId={w.projectId} onBack={() => setPage('chat')} />
        ) : page === 'memory' ? (
          <MemoryView projectId={w.projectId} onBack={() => setPage('chat')} />
        ) : (
          <Providers onBack={() => setPage('chat')} onRefresh={w.loadModels} />
        )}
      </main>

      <Dialog open={actions} onClose={() => setActions(false)} title="Conversation">
        <div className="conversation-actions flex flex-col gap-2 pt-2">
          <button
            className="w-full text-left px-3 py-2 text-xs font-medium rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-900 dark:text-zinc-100 transition-colors cursor-pointer"
            onClick={() => {
              setTitle(w.active?.title ?? '');
              setActions(false);
              setRename(true);
            }}
          >
            Rename conversation
          </button>
          <button
            className="w-full text-left px-3 py-2 text-xs font-medium rounded-lg border border-red-200 dark:border-red-900/40 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
            onClick={() => confirmDelete(w.active)}
          >
            Delete conversation
          </button>
        </div>
      </Dialog>

      <Dialog open={rename} onClose={() => setRename(false)} title="Rename conversation">
        <form
          className="space-y-4 pt-2"
          onSubmit={event => {
            event.preventDefault();
            if (w.active) {
              void api
                .rename(w.active.id, title)
                .then(async ({ conversation }) => {
                  await w.loadHistory();
                  await w.open(conversation);
                  setRename(false);
                })
                .catch(cause => w.setError(cause.message));
            }
          }}
        >
          <div>
            <label htmlFor="chat-title" className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              Title
            </label>
            <input
              autoFocus
              id="chat-title"
              name="title"
              required
              maxLength={255}
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
            <button
              type="button"
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              onClick={() => setRename(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3.5 py-1.5 text-xs font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors cursor-pointer"
            >
              Save title
            </button>
          </div>
        </form>
      </Dialog>

      <Dialog
        open={remove}
        onClose={() => {
          setRemove(false);
          setConversationToRemove(null);
        }}
        title="Delete this conversation?"
      >
        <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed mb-4">
          {conversationToRemove?.title
            ? `"${conversationToRemove.title}" will be permanently removed from your chat history.`
            : 'It will be removed from your saved chat history.'}
        </p>
        <div className="dialog-actions flex items-center justify-end gap-2 pt-3 border-t border-zinc-200 dark:border-zinc-800">
          <button
            autoFocus
            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
            onClick={() => {
              setRemove(false);
              setConversationToRemove(null);
            }}
          >
            Keep conversation
          </button>
          <button
            className="px-3.5 py-1.5 text-xs font-medium rounded-lg bg-red-600 hover:bg-red-700 text-white shadow-xs transition-colors cursor-pointer"
            onClick={() => {
              const target = conversationToRemove || w.active;
              if (target) {
                void api
                  .remove(target.id)
                  .then(async () => {
                    setRemove(false);
                    setConversationToRemove(null);
                    if (w.active?.id === target.id) {
                      w.newChat();
                    }
                    await w.loadHistory();
                  })
                  .catch(cause => w.setError(cause.message));
              }
            }}
          >
            Delete conversation
          </button>
        </div>
      </Dialog>
    </div>
  );
}
