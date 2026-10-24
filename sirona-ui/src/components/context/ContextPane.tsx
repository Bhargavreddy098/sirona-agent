import React from 'react'
import { FolderTree, GitCompare, Terminal as TerminalIcon, Eye } from 'lucide-react'
import { useStore } from '@nanostores/react'
import {
  $contextPaneOpen,
  $activeContextTab,
  setActiveContextTab,
  type ContextTab,
} from '../../store/layoutStore'
import { $artifacts } from '../../store/artifactStore'
import { $repoStatus } from '../../store/gitStore'
import { FileTreeExplorer } from './FileTreeExplorer'
import { DiffReviewView } from './DiffReviewView'
import { TerminalDeck } from './TerminalDeck'
import { PreviewPane } from './PreviewPane'

export const ContextPane: React.FC = () => {
  const isOpen = useStore($contextPaneOpen)
  const activeTab = useStore($activeContextTab)
  const artifacts = useStore($artifacts)
  const repoStatus = useStore($repoStatus)

  if (!isOpen) return null

  const changedCount = repoStatus?.total_changed ?? 0

  const tabs: Array<{ id: ContextTab; label: string; icon: React.ReactNode; badge?: number }> = [
    { id: 'files', label: 'Files', icon: <FolderTree className="w-3.5 h-3.5" /> },
    {
      id: 'review',
      label: 'Review',
      icon: <GitCompare className="w-3.5 h-3.5" />,
      badge: changedCount > 0 ? changedCount : undefined,
    },
    { id: 'terminal', label: 'Terminal', icon: <TerminalIcon className="w-3.5 h-3.5" /> },
    {
      id: 'preview',
      label: 'Preview',
      icon: <Eye className="w-3.5 h-3.5" />,
      badge: artifacts.length > 0 ? artifacts.length : undefined,
    },
  ]

  const isWide = activeTab === 'preview' || activeTab === 'review'

  return (
    <aside
      className={`h-full flex flex-col bg-[var(--dt-sidebar)] border-l border-[var(--dt-sidebar-border)] select-none z-10 transition-[width] duration-150 ${
        isWide ? 'w-[520px] max-w-[50vw] min-w-[380px]' : 'w-80'
      }`}
    >
      {/* Tab strip */}
      <div className="flex items-center px-3 border-b border-[var(--dt-sidebar-border)] bg-[var(--dt-sidebar)] h-10 shrink-0">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveContextTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 text-[12.5px] border-b-2 transition-colors cursor-pointer ${
                isActive
                  ? 'border-[var(--dt-primary)] text-[var(--dt-primary)] font-medium'
                  : 'border-transparent text-[var(--dt-muted-foreground)] hover:text-[var(--dt-foreground)] font-normal'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span className="ml-0.5 text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-[var(--dt-primary)] text-white">
                  {tab.badge}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden flex flex-col bg-[var(--dt-background)]">
        {activeTab === 'files' && <FileTreeExplorer />}
        {activeTab === 'review' && <DiffReviewView />}
        {activeTab === 'terminal' && <TerminalDeck />}
        {activeTab === 'preview' && <PreviewPane />}
      </div>
    </aside>
  )
}
