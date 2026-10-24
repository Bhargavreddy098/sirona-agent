import React, { useEffect } from 'react'
import { Check, X, ShieldAlert } from 'lucide-react'
import { Button } from '../ui/Button'
import { type PendingApproval } from '../../store/approvalStore'

export interface ApprovalCardProps {
  approval: PendingApproval
  onApprove: () => void
  onDeny: () => void
  isTop?: boolean
}

export const ApprovalCard: React.FC<ApprovalCardProps> = ({
  approval,
  onApprove,
  onDeny,
  isTop = true,
}) => {
  useEffect(() => {
    if (!isTop) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        onApprove()
      } else if (e.key === 'Escape') {
        e.preventDefault()
        onDeny()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isTop, onApprove, onDeny])

  return (
    <div className="w-[480px] p-4 rounded-[16px] bg-[#fdfbfa] border border-[#d1d1cd] shadow-[var(--shadow-subtle)] text-[13px] text-[#27251e]">
      {/* Header */}
      <div className="flex items-center gap-2 mb-2.5 text-[#b91c1c] font-medium">
        <ShieldAlert className="w-4 h-4 text-[#b91c1c]" />
        <span>Action Approval Required</span>
      </div>

      {/* Tool details */}
      <div className="mb-3 text-[#72706b]">
        <div>
          Tool: <span className="font-mono font-medium text-[#27251e]">{approval.tool_name}</span>
        </div>
        <div className="mt-1.5">
          Arguments:
          <pre className="mt-1 p-2.5 rounded-[12px] bg-[#faf8f5] border border-[#d1d1cd] text-[#27251e] font-mono text-[11px] overflow-x-auto whitespace-pre-wrap leading-relaxed">
            {JSON.stringify(approval.tool_args, null, 2)}
          </pre>
        </div>
      </div>

      {/* Action buttons with shortcuts */}
      <div className="flex items-center justify-end gap-2.5 pt-2.5 border-t border-[#d1d1cd]">
        <Button variant="ghost" size="sm" onClick={onDeny}>
          <X className="w-3.5 h-3.5 mr-1 text-[#b91c1c]" />
          Deny <span className="text-[10px] text-[#92918b] ml-1">(Esc)</span>
        </Button>
        <Button variant="teal" size="sm" onClick={onApprove}>
          <Check className="w-3.5 h-3.5 mr-1" />
          Approve <span className="text-[10px] text-white/80 ml-1">(↵)</span>
        </Button>
      </div>
    </div>
  )
}
