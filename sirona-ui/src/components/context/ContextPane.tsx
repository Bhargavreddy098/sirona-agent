import React from 'react'
import { FolderTree, GitCompare, Terminal as TerminalIcon } from 'lucide-react'
import { useStore } from '@nanostores/react'
import {
  $contextPaneOpen,
  $activeContextTab,
  setActiveContextTab,
  type ContextTab,
} from '../../store/layoutStore'
import { FileTreeExplorer } from './FileTreeExplorer'
import { DiffReviewView } from './DiffReviewView'
import { TerminalDeck } from './TerminalDeck'

export const ContextPane: React.FC = () => {
  const isOpen = useStore($contextPaneOpen)
  const activeTab = useStore($activeContextTab)

  if (!isOpen) return null

  const tabs: Array<{ id: ContextTab; label: string; icon: React.ReactNode }> = [
    { id: 'files', label: 'Files', icon: <FolderTree className="w-3.5 h-3.5" /> },
    { id: 'review', label: 'Review', icon: <GitCompare className="w-3.5 h-3.5" /> },
    { id: 'terminal', label: 'Terminal', icon: <TerminalIcon className="w-3.5 h-3.5" /> },
  ]

  return (
    <aside className="w-80 h-full flex flex-col bg-[#faf8f5] border-l border-[#d1d1cd] select-none z-10">
      {/* Tab strip */}
      <div className="flex items-center px-3 border-b border-[#d1d1cd] bg-[#faf8f5] h-10">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveContextTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 text-[13px] border-b-2 transition-colors cursor-pointer ${
                isActive
                  ? 'border-[#016a71] text-[#016a71] font-medium'
                  : 'border-transparent text-[#72706b] hover:text-[#27251e] font-normal'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden flex flex-col bg-[#faf8f5]">
        {activeTab === 'files' && <FileTreeExplorer />}
        {activeTab === 'review' && <DiffReviewView />}
        {activeTab === 'terminal' && <TerminalDeck />}
      </div>
    </aside>
  )
}
