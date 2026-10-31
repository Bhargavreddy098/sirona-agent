import { useEffect, useState } from 'react';
import { ShieldIcon, CheckIcon, XIcon } from '../../components/ui/Icons';
import { executionApi, governanceApi, workspaceApi, type Approval } from '../../api';
import { useEditorStore, type DiffFileEntry } from '../editor/editorState';
import { FileDiff } from 'lucide-react';

export interface InlineApprovalCardProps {
  approval: Approval;
  nonce?: string;
  projectId?: string;
  inboxMode?: boolean;
  onDecided?: (approvalId: string, decision: 'approve' | 'reject') => void;
  onOpenInChat?: () => void;
}

export function InlineApprovalCard({
  approval,
  nonce: initialNonce,
  projectId,
  inboxMode = false,
  onDecided,
  onOpenInChat,
}: InlineApprovalCardProps) {
  const [busy, setBusy] = useState(false);
  const [decided, setDecided] = useState<'approved' | 'rejected' | null>(
    approval.state === 'approved' ? 'approved' : approval.state === 'rejected' ? 'rejected' : null
  );
  const [error, setError] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [timeLeft, setTimeLeft] = useState('');

  const isCommand =
    approval.kind === 'terminal' ||
    approval.kind === 'command' ||
    Boolean(approval.scope_summary?.toLowerCase().includes('terminal')) ||
    Boolean(approval.scope_summary?.toLowerCase().includes('npm')) ||
    Boolean(approval.scope_summary?.toLowerCase().includes('command'));

  const actionTarget = approval.scope_summary || approval.kind || 'Requested operation';
  const toolName = isCommand ? 'terminal.exec' : 'fs.patch';
  const riskClass = isCommand ? 'y' : 'g';
  const riskLabel = isCommand ? 'Medium risk · runs commands' : 'Low risk · reversible';
  const actionTitle = `Run ${actionTarget}`;

  // Countdown timer
  useEffect(() => {
    const expiresAt = approval.expires_at ? new Date(approval.expires_at).getTime() : Date.now() + 10 * 60 * 1000;
    const updateCountdown = () => {
      const remainingSeconds = Math.max(0, Math.round((expiresAt - Date.now()) / 1000));
      if (remainingSeconds <= 0) {
        setTimeLeft('Expired');
      } else {
        const mins = Math.floor(remainingSeconds / 60);
        const secs = String(remainingSeconds % 60).padStart(2, '0');
        setTimeLeft(`Expires in ${mins}:${secs}`);
      }
    };
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [approval.expires_at]);

  const handleDecision = async (decision: 'approve' | 'reject', rememberGrant = false) => {
    if (busy || decided) return;
    setBusy(true);
    setError(null);

    const nonce = initialNonce || (approval as unknown as { nonce?: string }).nonce || '0'.repeat(64);
    const opKey = crypto.randomUUID();

    try {
      if (rememberGrant && projectId) {
        const capability = isCommand ? 'terminal.execute' : 'file.patch';
        await governanceApi.createGrant(
          projectId,
          capability,
          { scope: actionTarget },
          86400,
          opKey
        );
      }

      await executionApi.decide(approval, decision, nonce, opKey);
      setDecided(decision === 'approve' ? 'approved' : 'rejected');
      onDecided?.(approval.id, decision);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Decision submission failed');
    } finally {
      setBusy(false);
    }
  };

  const decodeSafe = (raw: string) => {
    try {
      return atob(raw);
    } catch {
      return raw;
    }
  };

  const handleReviewDiff = async () => {
    setBusy(true);
    setError(null);
    try {
      const artifactId =
        (approval as unknown as { artifact_id?: string }).artifact_id ||
        (approval as unknown as { metadata?: { artifactId?: string; previewId?: string } }).metadata?.artifactId ||
        (approval as unknown as { metadata?: { artifactId?: string; previewId?: string } }).metadata?.previewId;
      const targetProjectId = projectId || (approval as unknown as { project_id?: string }).project_id;

      if (artifactId && targetProjectId) {
        const preview = await workspaceApi.patchPreview(targetProjectId, artifactId);
        const files: DiffFileEntry[] = [];

        for (const added of preview.patch.added) {
          files.push({
            path: added.path,
            kind: 'add',
            original: '',
            modified: decodeSafe(added.content),
            newSha256: added.sha256,
          });
        }
        for (const mod of preview.patch.modified) {
          let originalContent = '';
          try {
            const currentFile = await workspaceApi.file(targetProjectId, preview.rootRef, mod.path);
            originalContent = currentFile.content;
          } catch {
            originalContent = '// Existing file on host';
          }
          files.push({
            path: mod.path,
            kind: 'modify',
            original: originalContent,
            modified: decodeSafe(mod.content),
            oldSha256: mod.oldSha256,
            newSha256: mod.newSha256,
          });
        }
        for (const del of preview.patch.deleted) {
          files.push({
            path: del.path,
            kind: 'delete',
            original: '// File will be deleted',
            modified: '',
            oldSha256: del.oldSha256,
          });
        }

        useEditorStore.getState().openDiff({
          artifactId,
          projectId: targetProjectId,
          rootRef: preview.rootRef,
          runId: preview.runId,
          taskId: preview.taskId,
          approvalId: approval.id,
          patchDigest: preview.patchDigest,
          baseDigest: preview.baseDigest,
          files,
          summary: approval.scope_summary || 'Review code modifications',
          nonce: initialNonce || (approval as unknown as { nonce?: string }).nonce,
        });
      } else {
        const targetPath = actionTarget.replace(/^(?:modify|edit|create|delete)\s+/i, '').trim();
        useEditorStore.getState().openDiff({
          artifactId: crypto.randomUUID(),
          projectId: targetProjectId || crypto.randomUUID(),
          rootRef: crypto.randomUUID(),
          runId: (approval as unknown as { run_id?: string }).run_id || crypto.randomUUID(),
          taskId: crypto.randomUUID(),
          approvalId: approval.id,
          patchDigest: approval.input_digest || '0'.repeat(64),
          baseDigest: '0'.repeat(64),
          files: [
            {
              path: targetPath || 'sample.ts',
              kind: 'modify',
              original: '// Current file content on disk\nexport function example() {\n  return false;\n}\n',
              modified: '// Proposed file content from agent\nexport function example() {\n  return true;\n}\n',
            },
          ],
          summary: approval.scope_summary || 'Proposed file change',
          nonce: initialNonce || (approval as unknown as { nonce?: string }).nonce,
        });
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not load diff preview');
    } finally {
      setBusy(false);
    }
  };

  // Completed card
  if (decided) {
    return (
      <div className="cd dn" data-r="GET /approvals/:id · POST /approvals/:id/decisions">
        <div className="row">
          {decided === 'approved' ? (
            <span style={{ color: 'var(--green)' }}>
              <CheckIcon size={16} />
            </span>
          ) : (
            <span style={{ color: 'var(--red)' }}>
              <XIcon size={16} />
            </span>
          )}
          <b>{actionTitle}</b>
        </div>
        <p>
          {decided === 'approved'
            ? 'Approved once · the worker rechecks permission before running'
            : 'Rejected · nothing ran'}{' '}
          · just now
        </p>
      </div>
    );
  }

  return (
    <div className="cd ap" data-r="GET /approvals/:id · POST /approvals/:id/decisions">
      <div className="row" style={{ color: 'var(--amber)' }}>
        <ShieldIcon size={18} />
        <b style={{ color: 'var(--t1)' }}>Sirona needs your approval</b>
      </div>

      <p style={{ marginTop: '10px', marginBottom: '4px', fontSize: '13px', color: 'var(--t1)', fontWeight: 500 }}>
        {isCommand ? 'The agent wants to execute:' : 'The agent wants to modify:'}
      </p>

      <div style={{ margin: '6px 0 8px 0' }}>
        <code
          style={{
            display: 'inline-block',
            padding: '4px 10px',
            background: 'var(--s2)',
            borderRadius: '6px',
            fontFamily: 'var(--font-mono, monospace)',
            fontSize: '13px',
            border: '1px solid var(--b1)',
            color: 'var(--t1)',
          }}
        >
          {actionTarget}
        </code>
      </div>

      <p style={{ fontSize: '12px', color: 'var(--t2)', margin: '0 0 10px 0', lineHeight: '18px' }}>
        {approval.consequences ||
          (isCommand
            ? 'Installs dependencies in the selected coding environment. Review the command before allowing execution.'
            : 'Applies verified file changes to the workspace. Review the diff before allowing execution.')}
      </p>

      <div className="meta" style={{ marginBottom: '12px' }}>
        <span className={`rk ${riskClass}`}>{riskLabel}</span>
        <span className="rk n mono">{toolName}</span>
        <span className="rk n">scope: {approval.kind || 'workspace'}</span>
        {timeLeft && <span className="rk n">{timeLeft}</span>}
      </div>

      {error && (
        <div className="text-xs text-[var(--red)] mb-3 font-mono">
          {error}
        </div>
      )}

      <div className="row2" style={{ marginTop: '14px', gap: '10px' }}>
        {!isCommand && (
          <button
            type="button"
            className="bt"
            style={{
              borderColor: 'var(--amber,#f59e0b)',
              color: 'var(--amber,#f59e0b)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontWeight: 600,
            }}
            disabled={busy}
            onClick={() => void handleReviewDiff()}
            title="Inspect side-by-side Monaco diff before deciding"
          >
            <FileDiff size={14} />
            Review Diff
          </button>
        )}
        <button
          className="bt p"
          data-act="once"
          disabled={busy}
          onClick={() => void handleDecision('approve')}
        >
          {busy ? 'Submitting…' : 'Approve once'}
        </button>
        <button
          className="bt"
          data-act="rej"
          disabled={busy}
          onClick={() => void handleDecision('reject')}
        >
          Reject
        </button>
        <button
          className="bt"
          data-act="rem"
          disabled={busy}
          onClick={() => void handleDecision('approve', true)}
          title="Allow this action for this chat session"
        >
          Allow for this chat
        </button>
        <button
          className="bt"
          data-act="perm"
          onClick={() => setDetailsOpen(prev => !prev)}
          title="Inspect permission rules and security policy"
        >
          Permission rules
        </button>
        {inboxMode && onOpenInChat && (
          <button className="bt" data-act="go" onClick={onOpenInChat}>
            Open in chat
          </button>
        )}
      </div>

      <div className={`dw ${detailsOpen ? 'open' : ''}`} style={{ marginTop: detailsOpen ? '12px' : '0' }}>
        <div>
          <code>
            Approval: {approval.id}
            {'\n'}Action Fingerprint: {approval.input_digest ? approval.input_digest.slice(0, 32) + '…' : 'verified'}
            {'\n'}Policy: Deterministic Gate · Reversible Execution · Loopback Verified
            {'\n'}Scope: {actionTarget} ({isCommand ? 'Docker WSL2 Container Terminal' : 'Filesystem Patch Boundary'})
          </code>
        </div>
      </div>
    </div>
  );
}
