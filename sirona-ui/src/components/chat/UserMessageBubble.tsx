import React from 'react'

export const UserMessageBubble: React.FC<{ content: string; timestamp?: number }> = ({
  content,
  timestamp,
}) => {
  const timeStr = timestamp
    ? new Date(timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : undefined

  return (
    <div className="flex justify-end my-3 select-text">
      <div className="max-w-2xl px-4 py-2.5 rounded-2xl bg-[var(--dt-user-bubble)] border border-[var(--dt-user-bubble-border)] text-[var(--dt-foreground)] text-[13.5px] leading-relaxed shadow-[var(--shadow-subtle)]">
        <div className="whitespace-pre-wrap">{content}</div>
        {timeStr && (
          <div className="text-[10.5px] text-[var(--dt-muted-foreground)] text-right mt-1 font-mono">
            {timeStr}
          </div>
        )}
      </div>
    </div>
  )
}
