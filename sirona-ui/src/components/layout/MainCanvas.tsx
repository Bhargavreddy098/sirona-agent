import React from 'react'
import { useStore } from '@nanostores/react'
import { $terminalDeckOpen } from '../../store/layoutStore'
import { SessionTabs } from './SessionTabs'
import { TranscriptCanvas } from '../chat/TranscriptCanvas'
import { Composer } from '../composer/Composer'
import { CardStack } from '../approvals/CardStack'
import { TerminalDeck } from '../context/TerminalDeck'

export const MainCanvas: React.FC = () => {
  const terminalDeckOpen = useStore($terminalDeckOpen)

  return (
    <main className="flex-1 h-full flex flex-col bg-[var(--dt-background)] relative overflow-hidden text-[var(--dt-foreground)]">
      {/* 1. Multi-Tab Session Bar */}
      <SessionTabs />

      {/* 2. Transcript Scrolling Canvas */}
      <TranscriptCanvas />

      {/* 3. Floating CardStack Approvals */}
      <CardStack />

      {/* 4. Optional Docked Bottom Terminal Deck */}
      {terminalDeckOpen && (
        <div className="h-64 border-t border-[var(--dt-border)] flex flex-col bg-[var(--dt-background)]">
          <TerminalDeck />
        </div>
      )}

      {/* 5. Bottom Composer Floating Studio */}
      <Composer />
    </main>
  )
}
