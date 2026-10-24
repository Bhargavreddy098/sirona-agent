import { atom } from 'nanostores'
import { api } from '../api/client'

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
  $pendingApprovals.set([...$pendingApprovals.get(), approval])
}

export async function resolvePendingApproval(promptId: string, approved: boolean): Promise<void> {
  const list = $pendingApprovals.get()
  const current = list.find((a) => a.prompt_id === promptId)
  if (!current) return

  try {
    await api.respondApproval('current_run', promptId, approved)
  } catch (e) {
    console.error('Failed to send approval response', e)
  }

  $pendingApprovals.set(list.filter((a) => a.prompt_id !== promptId))
}
