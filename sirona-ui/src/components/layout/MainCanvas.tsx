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
    <main className="flex-1 h-full flex flex-col bg-[#faf8f5] relative overflow-hidden text-[#27251e]">
      {/* 1. Multi-Tab Session Bar */}
      <SessionTabs />

      {/* 2. Transcript Scrolling Canvas */}
      <TranscriptCanvas />

      {/* 3. Floating CardStack Approvals */}
      <CardStack />

      {/* 4. Optional Docked Bottom Terminal Deck */}
      {terminalDeckOpen && (
        <div className="h-64 border-t border-[#d1d1cd] flex flex-col bg-[#faf8f5]">
          <TerminalDeck />
        </div>
      )}

      {/* 5. Bottom Composer Focal Artifact */}
      <Composer />
    </main>
  )
}
