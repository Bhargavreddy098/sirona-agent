import { atom } from 'nanostores'
import { api } from '../api/client'
import { gateway } from '../api/gateway'

export type ApprovalChoice = 'once' | 'always' | 'deny'

export interface PendingApproval {
  prompt_id: string
  session_id: string
  tool_name: string
  tool_args: Record<string, any>
  danger_level: string
  diff?: string
  created_at: number
}

export const $pendingApprovals = atom<PendingApproval[]>([])

export function pushApproval(approval: PendingApproval): void {
  const current = $pendingApprovals.get()
  // Deduplicate by prompt_id
  if (!current.some((a) => a.prompt_id === approval.prompt_id)) {
    $pendingApprovals.set([...current, approval])
  }
}

export async function resolvePendingApproval(
  promptId: string,
  decision: boolean | ApprovalChoice
): Promise<void> {
  const list = $pendingApprovals.get()
  const current = list.find((a) => a.prompt_id === promptId)
  if (!current) return

  const choice: ApprovalChoice =
    typeof decision === 'string' ? decision : decision ? 'once' : 'deny'

  try {
    if (gateway.isConnected) {
      await gateway.respondApproval(current.session_id, promptId, choice)
    } else {
      await api.respondApproval(current.session_id || 'current_run', promptId, choice !== 'deny')
    }
  } catch (e) {
    console.error('Failed to send approval response', e)
  }

  $pendingApprovals.set(list.filter((a) => a.prompt_id !== promptId))
}
