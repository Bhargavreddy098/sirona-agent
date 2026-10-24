import React, { useEffect, useState } from 'react'
import { Loader } from '../ui/Loader'

export const RunTicker: React.FC<{ startedAt?: number }> = ({ startedAt }) => {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const start = startedAt || Date.now()
    const timer = setInterval(() => {
      setElapsed(((Date.now() - start) / 1000))
    }, 100)
    return () => clearInterval(timer)
  }, [startedAt])

  return (
    <div className="flex items-center gap-1.5 font-mono text-[11px] text-[#016a71]">
      <Loader size="sm" />
      <span>{elapsed.toFixed(1)}s</span>
    </div>
  )
}
