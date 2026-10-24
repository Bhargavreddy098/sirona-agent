import React from 'react'
import { useStore } from '@nanostores/react'
import { $pendingApprovals, resolvePendingApproval } from '../../store/approvalStore'
import { ApprovalCard } from './ApprovalCard'

export const CardStack: React.FC = () => {
  const approvals = useStore($pendingApprovals)

  if (approvals.length === 0) return null

  const topApproval = approvals[0]
  const hasMultiple = approvals.length > 1

  return (
    <div className="fixed bottom-28 left-1/2 -translate-x-1/2 z-[140] pointer-events-auto">
      <div className="relative">
        {/* Silhouette shadow card behind when multiple */}
        {hasMultiple && (
          <div
            className="absolute inset-0 -top-[8px] scale-[0.96] rounded-[12px] bg-[var(--dt-sidebar)] border border-[var(--dt-border)] opacity-70 pointer-events-none transition-all duration-200"
          />
        )}

        {/* Top Active Approval Card */}
        <div className="relative z-10 transition-transform duration-200">
          <ApprovalCard
            approval={topApproval}
            onApprove={() => resolvePendingApproval(topApproval.prompt_id, true)}
            onDeny={() => resolvePendingApproval(topApproval.prompt_id, false)}
            isTop={true}
          />
        </div>
      </div>
    </div>
  )
}
