import React from 'react'
import { Database, GitBranch, Cpu, TerminalSquare } from 'lucide-react'

export interface SuggestionGridProps {
  onSelectSuggestion: (text: string) => void
}

export const SuggestionGrid: React.FC<SuggestionGridProps> = ({ onSelectSuggestion }) => {
  const suggestions = [
    {
      title: 'Inspect repository architecture & schema',
      desc: 'Analyze modules, database structure, and dependency graphs',
      icon: <Database className="w-4 h-4 text-[var(--dt-primary)]" />,
      prompt: 'Analyze the repository architecture and database schema in detail.',
    },
    {
      title: 'Verify SQLite WAL mode & ACID integrity',
      desc: 'Check journal mode, pragma settings, and index performance',
      icon: <Cpu className="w-4 h-4 text-[var(--dt-primary)]" />,
      prompt: 'Verify the SQLite database WAL mode, pragmas, and indexing status.',
    },
    {
      title: 'Review git branch changes & pending diffs',
      desc: 'Inspect modified files, staged changes, and branch history',
      icon: <GitBranch className="w-4 h-4 text-[var(--dt-primary)]" />,
      prompt: 'Review git status and generate a clean breakdown of pending changes.',
    },
    {
      title: 'Execute sandboxed commands & run tests',
      desc: 'Run test suites, inspect stdout logs, and verify builds',
      icon: <TerminalSquare className="w-4 h-4 text-[var(--dt-primary)]" />,
      prompt: 'Run the pytest test suite and report results.',
    },
  ]

  return (
    <div className="w-full max-w-[800px] mx-auto px-4 mt-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
        {suggestions.map((item, idx) => (
          <div
            key={idx}
            onClick={() => onSelectSuggestion(item.prompt)}
            className="flex items-start gap-3 p-3.5 bg-[var(--dt-card)] hover:bg-[var(--dt-background)] rounded-[12px] shadow-[var(--shadow-subtle)] cursor-pointer transition-all duration-150 border border-[var(--dt-border)]/60 hover:border-[var(--dt-border)] text-left select-none group"
          >
            <div className="p-2 rounded-[8px] bg-[var(--dt-background)] group-hover:bg-[var(--dt-secondary)] transition-colors shrink-0">
              {item.icon}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-[13.5px] font-medium text-[var(--dt-foreground)] leading-snug group-hover:text-[var(--dt-primary)] transition-colors">
                {item.title}
              </h4>
              <p className="text-[12px] text-[var(--dt-muted-foreground)] mt-0.5 leading-snug">
                {item.desc}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
