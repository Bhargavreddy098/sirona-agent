import type { Conversation } from '../../api/schemas';
import {
  StarIcon,
  SideIcon,
  PlusIcon,
  ChatIcon,
  FolderIcon,
  InboxIcon,
  BoltIcon,
  GearIcon,
  MoonIcon,
  SunIcon,
} from '../ui/Icons';

export type AppPage = 'chat' | 'files' | 'inbox' | 'automations' | 'settings';

export interface SidebarProps {
  page: AppPage;
  locked: boolean;
  conversations: Conversation[];
  activeConversationId?: string;
  pendingApprovalsCount?: number;
  connected?: boolean;
  theme: 'light' | 'dark';
  loadingHistory?: boolean;
  onNavigate: (page: AppPage) => void;
  onNewChat: () => void;
  onOpenConversation: (conversation: Conversation) => void;
  onDeleteConversation?: (conversation: Conversation) => void;
  onCollapse: () => void;
  onToggleTheme: () => void;
}

const NAV_ITEMS: Array<{ id: AppPage; label: string; icon: typeof ChatIcon }> = [
  { id: 'chat', label: 'Chat', icon: ChatIcon },
  { id: 'files', label: 'Files', icon: FolderIcon },
  { id: 'inbox', label: 'Inbox', icon: InboxIcon },
  { id: 'automations', label: 'Automations', icon: BoltIcon },
  { id: 'settings', label: 'Settings', icon: GearIcon },
];

export function Sidebar({
  page,
  locked,
  conversations,
  activeConversationId,
  pendingApprovalsCount = 0,
  connected = true,
  theme,
  loadingHistory = false,
  onNavigate,
  onNewChat,
  onOpenConversation,
  onCollapse,
  onToggleTheme,
}: SidebarProps) {
  const activeNavIndex = NAV_ITEMS.findIndex(item => item.id === page);

  return (
    <aside className="sb" aria-label="Main navigation">
      <div className="sbi">
        {/* Brand */}
        <div className="brand">
          <span className="logo" id="logo" aria-hidden="true">
            <StarIcon size={16} />
          </span>
          <b>Sirona</b>
          <button
            className="ib"
            id="col"
            title="Collapse sidebar (Ctrl+B)"
            aria-label="Collapse sidebar"
            onClick={onCollapse}
          >
            <SideIcon size={18} />
          </button>
        </div>

        {/* New Chat Button */}
        <button
          className="nc"
          id="nc"
          disabled={locked}
          onClick={onNewChat}
          title="New chat (Ctrl+K)"
        >
          <PlusIcon size={16} />
          <span>New chat</span>
          <kbd>Ctrl K</kbd>
        </button>

        {/* Primary Navigation with sliding spring indicator */}
        <nav className="nav" id="nav" aria-label="Sections">
          <i
            className="ind"
            id="ind"
            style={{
              transform: `translateY(${Math.max(0, activeNavIndex) * 38}px)`,
            }}
          />
          {NAV_ITEMS.map(item => {
            const Icon = item.icon;
            const isActive = page === item.id;
            return (
              <button
                key={item.id}
                className={`ni ${isActive ? 'on' : ''}`}
                data-p={item.id}
                disabled={locked}
                onClick={() => onNavigate(item.id)}
              >
                <Icon size={18} />
                <span>{item.label}</span>
                {item.id === 'inbox' && pendingApprovalsCount > 0 && (
                  <span className="bd pop" id="bd">
                    {pendingApprovalsCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Recents Conversation List */}
        <div className="lab" data-r="GET /conversations">
          Recents
        </div>
        <div className="rcs" id="rcs">
          {loadingHistory ? (
            <>
              <i className="sk2" />
              <i className="sk2" />
              <i className="sk2" />
            </>
          ) : conversations.length === 0 ? (
            <div className="px-2.5 py-2 text-xs text-[var(--t3)]">No previous chats</div>
          ) : (
            conversations.map((c, i) => (
              <button
                key={c.id}
                className={`rc ${activeConversationId === c.id ? 'on' : ''}`}
                style={{ animationDelay: `${i * 50}ms` }}
                onClick={() => onOpenConversation(c)}
                title={c.title || 'Untitled chat'}
              >
                {c.title || 'Untitled chat'}
              </button>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="ft">
          <span className={`dot ${connected ? '' : 'off'}`} id="cdot" />
          <span id="conn" data-r="GET /session · /capabilities">
            {connected ? 'Connected' : 'Connecting…'}
          </span>
          <button
            className="ib"
            id="thm"
            title="Toggle theme"
            aria-label="Toggle theme"
            onClick={onToggleTheme}
          >
            {theme === 'dark' ? <SunIcon size={16} /> : <MoonIcon size={16} />}
          </button>
        </div>
      </div>
    </aside>
  );
}
