import React, { useEffect, useRef } from 'react'
import { useStore } from '@nanostores/react'
import { Sparkles } from 'lucide-react'
import { $messages, $streamingState, $composerDraft } from '../../store/messageStore'
import { $activeClarifyRequest } from '../../store/clarifyStore'
import { UserMessageBubble } from './UserMessageBubble'
import { AssistantMessage } from './AssistantMessage'
import { ToolExecutionCard } from './ToolExecutionCard'
import { ClarifyCard } from '../clarify/ClarifyCard'
import { SuggestionGrid } from './SuggestionGrid'
import { Loader } from '../ui/Loader'

export const TranscriptCanvas: React.FC = () => {
  const messages = useStore($messages)
  const streaming = useStore($streamingState)
  const activeClarify = useStore($activeClarifyRequest)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streaming.currentTokens, streaming.currentReasoning, streaming.activeTool, activeClarify])

  const handleSelectSuggestion = (promptText: string) => {
    $composerDraft.set(promptText)
  }

  return (
    <div className="flex-1 overflow-y-auto py-6 px-4 flex flex-col justify-start">
      <div className="max-w-[800px] w-full mx-auto flex-1 flex flex-col justify-start">
        {messages.length === 0 && !streaming.isStreaming && (
          <div className="flex-1 flex flex-col items-center justify-center text-center select-none py-12">
            <div className="w-12 h-12 rounded-[14px] bg-[var(--dt-card)] border border-[var(--dt-border)] flex items-center justify-center mb-4 shadow-sm">
              <Sparkles className="w-6 h-6 text-[var(--dt-primary)]" />
            </div>
            <h2 className="text-[22px] font-semibold text-[var(--dt-foreground)] mb-2 tracking-tight">
              What do you want to explore?
            </h2>
            <p className="text-[13.5px] text-[var(--dt-muted-foreground)] max-w-md font-normal leading-relaxed mb-6">
              Sirona is your autonomous developer agent. Inspect schemas, review git diffs, execute sandboxed tests, and automate code migrations.
            </p>

            <SuggestionGrid onSelectSuggestion={handleSelectSuggestion} />
          </div>
        )}

        {messages.map((m) => {
          if (m.role === 'user') {
            return <UserMessageBubble key={m.id} content={m.content || ''} timestamp={m.timestamp} />
          } else if (m.role === 'tool') {
            return (
              <ToolExecutionCard
                key={m.id}
                toolName={m.tool_name || 'tool'}
                toolCallId={m.tool_call_id}
                args={m.tool_args}
                result={m.content}
                durationMs={m.duration_ms}
              />
            )
          } else {
            return (
              <AssistantMessage
                key={m.id}
                content={m.content || ''}
                reasoning={m.reasoning}
                interrupted={m.interrupted}
                sessionId={m.session_id}
              />
            )
          }
        })}

        {/* Live streaming bubble if active */}
        {streaming.isStreaming && (
          <div className="flex flex-col my-4">
            {/* Completed tool executions in this turn */}
            {streaming.completedTools.map((tool) => (
              <ToolExecutionCard
                key={tool.toolCallId}
                toolName={tool.toolName}
                toolCallId={tool.toolCallId}
                args={tool.args}
                result={tool.result}
                durationMs={tool.durationMs}
                status={tool.status}
                isRunning={false}
              />
            ))}

            {/* Currently running tool */}
            {streaming.activeTool && (
              <ToolExecutionCard
                toolName={streaming.activeTool.toolName}
                toolCallId={streaming.activeTool.toolCallId}
                args={streaming.activeTool.args}
                startedAt={streaming.activeTool.startedAt}
                status="running"
                isRunning={true}
              />
            )}

            {streaming.currentTokens || streaming.currentReasoning ? (
              <AssistantMessage
                content={streaming.currentTokens}
                reasoning={streaming.currentReasoning}
                isStreaming={true}
                isReasoningStreaming={streaming.isReasoningStreaming}
                sessionId={streaming.sessionId || undefined}
              />
            ) : (
              <div className="flex items-center gap-2 text-[13px] text-[var(--dt-primary)] my-3 px-1">
                <Loader />
                <span className="text-[var(--dt-muted-foreground)] font-normal">Sirona is researching...</span>
              </div>
            )}
          </div>
        )}

        {/* Active Clarification Request Card */}
        {activeClarify && (
          <ClarifyCard request={activeClarify} />
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  )
}
