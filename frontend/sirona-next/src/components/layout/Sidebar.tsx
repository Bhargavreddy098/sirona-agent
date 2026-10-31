import {
  Asterisk,
  PanelLeftClose,
  Plus,
  MessageSquare,
  Settings,
  Zap,
  Brain,
} from 'lucide-react';
import type { Conversation } from '../../api/schemas';
import { History } from './History';

export interface SidebarProps {
  page: 'chat' | 'settings' | 'workspace' | 'automation' | 'memory';
  locked: boolean;
  conversations: Conversation[];
  activeConversationId?: string;
  onNavigate: (page: 'chat' | 'settings' | 'workspace' | 'automation' | 'memory') => void;
  onNewChat: () => void;
  onOpenConversation: (conversation: Conversation) => void;
  onDeleteConversation?: (conversation: Conversation) => void;
  onCollapse: () => void;
}

export function Sidebar({
  page,
  locked,
  conversations,
  activeConversationId,
  onNavigate,
  onNewChat,
  onOpenConversation,
  onDeleteConversation,
  onCollapse,
}: SidebarProps) {
  return (
    <aside
      className="sidebar flex flex-col shrink-0 w-[282px] h-[100dvh] bg-zinc-50 dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 select-none antialiased transition-colors duration-150"
      aria-label="Main navigation"
    >
      {/* Brand & Collapse Header */}
      <div className="brand flex items-center gap-2.5 px-4 pt-3 pb-2.5">
        <div className="brand-logo inline-flex items-center justify-center w-7 h-7 shrink-0 rounded-lg bg-blue-600 text-white shadow-xs">
          <Asterisk className="w-4 h-4" strokeWidth={2.5} />
        </div>
        <strong className="flex-1 min-w-0 truncate text-[14.5px] font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          Sirona
        </strong>
        <button
          className="icon-button sidebar-collapse inline-flex items-center justify-center w-7 h-7 p-0 rounded-md text-zinc-400 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 hover:text-zinc-700 dark:hover:text-zinc-200 transition-all cursor-pointer ml-auto"
          aria-label="Collapse sidebar"
          title="Collapse sidebar"
          onClick={onCollapse}
        >
          <PanelLeftClose className="w-4 h-4" strokeWidth={2} />
        </button>
      </div>

      {/* New Chat Primary Action Button */}
      <div className="px-3 pt-1 pb-2">
        <button
          className="new-chat w-full flex items-center justify-between px-3 py-2 border border-zinc-200 dark:border-zinc-700/80 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-[13px] font-semibold shadow-xs hover:not-disabled:bg-zinc-100 dark:hover:not-disabled:bg-zinc-750 active:not-disabled:scale-[0.99] transition-all cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
          disabled={locked}
          onClick={onNewChat}
        >
          <div className="flex items-center gap-2">
            <Plus className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" strokeWidth={2.5} />
            <span>New chat</span>
          </div>
          <kbd className="hidden sm:inline-block text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-700/60 text-zinc-500 dark:text-zinc-400 border border-zinc-200/80 dark:border-zinc-700">
            Ctrl+K
          </kbd>
        </button>
      </div>

      {/* Primary Navigation */}
      <nav className="primary-navigation flex flex-col gap-0.5 px-3 mb-2" aria-label="Sections">
        <button
          className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-[13px] text-left transition-all cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed ${
            page === 'chat'
              ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-semibold'
              : 'bg-transparent text-zinc-600 dark:text-zinc-400 font-medium hover:not-disabled:bg-zinc-200/50 dark:hover:not-disabled:bg-zinc-800 hover:not-disabled:text-zinc-900 dark:hover:not-disabled:text-zinc-100'
          }`}
          aria-current={page === 'chat' ? 'page' : undefined}
          disabled={locked}
          onClick={() => onNavigate('chat')}
        >
          <MessageSquare className="w-4 h-4 shrink-0" strokeWidth={2} />
          <span>Chat & Code</span>
        </button>
        <button
          className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-[13px] text-left transition-all cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed ${
            page === 'automation'
              ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-semibold'
              : 'bg-transparent text-zinc-600 dark:text-zinc-400 font-medium hover:not-disabled:bg-zinc-200/50 dark:hover:not-disabled:bg-zinc-800 hover:not-disabled:text-zinc-900 dark:hover:not-disabled:text-zinc-100'
          }`}
          aria-current={page === 'automation' ? 'page' : undefined}
          disabled={locked}
          onClick={() => onNavigate('automation')}
        >
          <Zap className="w-4 h-4 shrink-0" strokeWidth={2} />
          <span>Automations</span>
        </button>
        <button
          className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-[13px] text-left transition-all cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed ${
            page === 'memory'
              ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-semibold'
              : 'bg-transparent text-zinc-600 dark:text-zinc-400 font-medium hover:not-disabled:bg-zinc-200/50 dark:hover:not-disabled:bg-zinc-800 hover:not-disabled:text-zinc-900 dark:hover:not-disabled:text-zinc-100'
          }`}
          aria-current={page === 'memory' ? 'page' : undefined}
          disabled={locked}
          onClick={() => onNavigate('memory')}
        >
          <Brain className="w-4 h-4 shrink-0" strokeWidth={2} />
          <span>Memory</span>
        </button>
      </nav>

      {/* History Feed */}
      <History
        conversations={conversations}
        active={page === 'chat' ? activeConversationId : undefined}
        disabled={locked}
        onOpen={onOpenConversation}
        onDelete={onDeleteConversation}
      />

      {/* Settings Bottom Link */}
      <div className="p-3 border-t border-zinc-200 dark:border-zinc-800">
        <button
          className={`settings-nav w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] text-left transition-all cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed ${
            page === 'settings'
              ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-semibold'
              : 'bg-transparent text-zinc-600 dark:text-zinc-400 font-medium hover:not-disabled:bg-zinc-200/50 dark:hover:not-disabled:bg-zinc-800 hover:not-disabled:text-zinc-900 dark:hover:not-disabled:text-zinc-100'
          }`}
          aria-current={page === 'settings' ? 'page' : undefined}
          disabled={locked}
          onClick={() => onNavigate('settings')}
        >
          <Settings className="w-4 h-4 shrink-0" strokeWidth={2} />
          <span>Settings</span>
        </button>
      </div>
    </aside>
  );
}
