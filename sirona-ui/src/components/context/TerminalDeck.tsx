import React, { useEffect, useRef, useState } from 'react'

export const TerminalDeck: React.FC = () => {
  const [lines, setLines] = useState<string[]>([
    'Sirona Interactive PTY Console v0.1.0',
    'Session: active local subshell (sandboxed)',
    'Type commands below or trigger agent actions:',
  ])
  const [input, setInput] = useState('')
  const terminalEndRef = useRef<HTMLDivElement>(null)
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    let wsUrl: string
    if (typeof window !== 'undefined' && window.location.protocol.startsWith('http') && window.location.host) {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      wsUrl = `${protocol}//${window.location.host}/ws/terminal`
    } else {
      wsUrl = 'ws://127.0.0.1:8000/ws/terminal'
    }
    try {
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onmessage = (event) => {
        setLines((prev) => [...prev, event.data])
      }

      return () => ws.close()
    } catch (e) {
      console.warn('Terminal WS unavailable (offline mode)', e)
    }
  }, [])

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [lines])

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return
    const cmd = input
    setInput('')
    setLines((prev) => [...prev, `$ ${cmd}`])
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(cmd + '\n')
    }
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[#1c1b18] font-mono text-[12px] select-text">
      {/* Terminal Output */}
      <div className="flex-1 overflow-y-auto p-3.5 flex flex-col gap-1 text-[#f5f3ef]">
        {lines.map((l, i) => (
          <div key={i} className="whitespace-pre-wrap leading-relaxed text-[#d1d1cd]">
            {l}
          </div>
        ))}
        <div ref={terminalEndRef} />
      </div>

      {/* Terminal Input Bar */}
      <form
        onSubmit={handleSend}
        className="flex items-center px-3.5 py-2.5 border-t border-[rgba(255,255,255,0.08)] bg-[#141412]"
      >
        <span className="text-[#016a71] mr-2.5 font-bold select-none text-[13px]">$</span>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Run shell command..."
          className="flex-1 bg-transparent text-[#faf8f5] outline-none font-mono text-[12px] placeholder:text-[#72706b]"
        />
      </form>
    </div>
  )
}
