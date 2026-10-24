import React from 'react'

export const UserMessageBubble: React.FC<{ content: string; timestamp?: number }> = ({
  content,
  timestamp,
}) => {
  const timeStr = timestamp
    ? new Date(timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : undefined

  return (
    <div className="flex justify-end my-4 select-text">
      <div className="max-w-2xl px-4 py-3 rounded-[16px] bg-[#fdfbfa] border border-[#d1d1cd] text-[#27251e] text-[14px] leading-relaxed shadow-[var(--shadow-subtle)]">
        <div className="whitespace-pre-wrap">{content}</div>
        {timeStr && (
          <div className="text-[11px] text-[#92918b] text-right mt-1 font-mono">
            {timeStr}
          </div>
        )}
      </div>
    </div>
  )
}
