import React, { useEffect, useState } from 'react'
import { Cpu, ShieldCheck, Gauge } from 'lucide-react'
import { api, type SystemStatus } from '../../api/client'

export const StatusBar: React.FC = () => {
  const [status, setStatus] = useState<SystemStatus | null>(null)

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await api.getStatus()
        setStatus(res)
      } catch (e) {
        // Fallback
      }
    }
    fetchStatus()
    const timer = setInterval(fetchStatus, 5000)
    return () => clearInterval(timer)
  }, [])

  return (
    <footer className="h-7 w-full flex items-center justify-between px-4 bg-[#faf8f5] border-t border-[#d1d1cd] text-[11px] text-[#72706b] font-mono select-none z-30">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5 text-[#016a71]">
          <span className="w-2 h-2 rounded-full bg-[#016a71] inline-block shadow-sm" />
          <span>Gateway: Local Ready</span>
        </div>
        <div className="flex items-center gap-1 text-[#72706b]">
          <ShieldCheck className="w-3.5 h-3.5 text-[#016a71]" />
          <span>Security: Supervised</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1">
          <Gauge className="w-3.5 h-3.5 text-[#92918b]" />
          <span>Context: 12%</span>
        </div>
        <div className="flex items-center gap-1">
          <Cpu className="w-3.5 h-3.5 text-[#92918b]" />
          <span>
            CPU: {status?.cpu_pct ?? 0}% | Mem: {status?.mem_pct ?? 0}%
          </span>
        </div>
      </div>
    </footer>
  )
}
