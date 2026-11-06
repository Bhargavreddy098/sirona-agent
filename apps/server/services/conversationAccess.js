import { query } from '../config/db.js';
export function conversationError(status,message,code='CONVERSATION_ERROR') { return Object.assign(new Error(message),{status,code}); }
export async function requireConversation(id,principal) {
  const result=await query(`SELECT s.* FROM sessions s LEFT JOIN projects p ON p.id=s.project_id
    WHERE s.id=$1 AND s.deleted_at IS NULL AND COALESCE(s.workspace_id,p.workspace_id)=$2
    AND (s.project_id IS NOT NULL OR s.user_id=$3)`,[id,principal.workspaceId,principal.principalId]);
  if(!result.rows[0]) throw conversationError(404,'Conversation not found');
  return result.rows[0];
}
export async function requireProject(id,principal) {
  const result=await query('SELECT id FROM projects WHERE id=$1 AND workspace_id=$2',[id,principal.workspaceId]);
  if(!result.rows[0]) throw conversationError(404,'Project not found');
}
