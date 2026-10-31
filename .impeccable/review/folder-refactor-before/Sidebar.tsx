import { useRef, useEffect } from 'react'
import {
  ArrowUpRight,
  MessageSquare,
  PanelLeftClose,
  Plus,
  Search,
  Settings2,
  Sparkles,
  Trash2
} from 'lucide-react'
import type { Conversation } from '@/App'

interface SidebarProps {
  open: boolean
  onClose: () => void
  conversations: Conversation[]
  activeId: string | null
  query: string
  onQueryChange: (value: string) => void
  filtered: Conversation[]
  onSelectConversation: (id: string) => void
  onNewConversation: () => void
  onDeleteConversation: (id: string) => void
  onRenameConversation: (id: string) => void
  onOpenSettings: () => void
}

export default function Sidebar({
  open,
  onClose,
  conversations,
  activeId,
  query,
  onQueryChange,
  filtered,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  onRenameConversation,
  onOpenSettings,
}: SidebarProps) {
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      window.setTimeout(() => searchRef.current?.focus(), 0)
    }
  }, [open])

  return (
    <>
      {open && (
        <button
          className="sidebar-scrim"
          aria-label="Close sidebar"
          onClick={onClose}
        />
      )}

      <aside className="sidebar" aria-label="Conversations" aria-hidden={!open} inert={!open}>
        <div className="sidebar-brand">
          <span className="brand-mark"><Sparkles size={19} strokeWidth={1.6} /></span>
          <strong>sirona<span className="brand-dot">.</span></strong>
          <button className="icon-button" aria-label="Close sidebar" title="Close sidebar" onClick={onClose}>
            <PanelLeftClose size={17} />
          </button>
        </div>

        <button className="new-chat" onClick={onNewConversation}>
          <Plus size={17} /> New conversation <ArrowUpRight size={15} />
        </button>

        <label className="history-search">
          <Search size={15} />
          <input
            ref={searchRef}
            value={query}
            onChange={event => onQueryChange(event.target.value)}
            placeholder="Search conversations"
            aria-label="Search conversations"
          />
          <kbd>Ctrl K</kbd>
        </label>

        <div className="history-heading">
          Conversations <span>{conversations.filter(chat => chat.messages.length).length}</span>
        </div>

        <nav className="conversation-list">
          {filtered.length === 0 && <p className="no-results">No matching conversations.</p>}
          {filtered.map(chat => (
            <div className={`history-row ${activeId === chat.id ? 'selected' : ''}`} key={chat.id}>
              <button
                className="history-item"
                title="Double-click to rename"
                onDoubleClick={() => onRenameConversation(chat.id)}
                aria-current={activeId === chat.id ? 'page' : undefined}
                onClick={() => onSelectConversation(chat.id)}
              >
                <MessageSquare size={15} />
                <span>{chat.title}</span>
              </button>
              <button
                className="history-delete"
                aria-label={`Delete ${chat.title}`}
                title="Delete conversation"
                onClick={() => onDeleteConversation(chat.id)}
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </nav>

        {/* Sidebar Bottom: Settings & Model Providers Button */}
        <div className="sidebar-bottom">
          <button
            type="button"
            className="sidebar-settings-button"
            onClick={onOpenSettings}
            title="Open Settings & Model Providers"
          >
            <div className="settings-btn-icon">
              <Settings2 size={16} />
            </div>
            <div className="settings-btn-info">
              <span className="settings-btn-title">Settings</span>
              <span className="settings-btn-sub">Model Providers & Preferences</span>
            </div>
          </button>
        </div>
      </aside>
    </>
  )
}

</content>