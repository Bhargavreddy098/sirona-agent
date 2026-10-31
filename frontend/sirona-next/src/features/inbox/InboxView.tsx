import { useEffect, useState, useCallback } from 'react';
import { CheckIcon } from '../../components/ui/Icons';
import { InlineApprovalCard } from '../chat/InlineApprovalCard';
import { executionApi, automationApi, deploymentApi, type Approval, type Run } from '../../api';

export interface InboxViewProps {
  projectId?: string;
  onOpenInChat: () => void;
  onToast: (msg: string) => void;
}

interface FailureItem {
  runId: string;
  title: string;
  description: string;
  runObj?: Run;
}

interface AlertItem {
  id: string;
  title: string;
  detail: string;
  read: boolean;
}

interface DeploymentItem {
  id: string;
  runId: string;
  environment: string;
  status: string;
  url?: string | null;
}

export function InboxView({ projectId, onOpenInChat, onToast }: InboxViewProps) {
  const [tab, setTab] = useState<'ib' | 'fl' | 'al' | 'dp'>('ib');
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [failures, setFailures] = useState<FailureItem[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [deployments, setDeployments] = useState<DeploymentItem[]>([
    {
      id: 'd_stg_01',
      runId: 'r_deploy_preview',
      environment: 'staging',
      status: 'active',
      url: 'https://staging.sirona.local',
    },
  ]);
  const [loading, setLoading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const appRes = await executionApi.approvals(projectId);
      setApprovals((appRes.approvals || []).filter(a => a.state === 'pending'));

      const runsRes = projectId ? await executionApi.runs(projectId) : await executionApi.listAllRuns();
      const failedRuns = (runsRes || []).filter(
        r => r.state === 'failed' || r.state === 'stopped' || r.state === 'error'
      );
      if (failedRuns.length > 0) {
        setFailures(
          failedRuns.map(r => ({
            runId: r.id,
            title: `Run ${r.id.slice(0, 8)} stopped`,
            description: `State: ${r.state}. Progress: ${r.progress.completedTasks}/${r.progress.totalTasks} tasks completed. Checkpoint intact.`,
            runObj: r,
          }))
        );
      } else {
        setFailures([
          {
            runId: 'r_38',
            title: 'Run r_38 stopped while applying a patch',
            description: 'The file changed after the preview, so the checksum no longer matched. Nothing was written.',
          },
        ]);
      }

      const notifRes = await automationApi.notifications();
      const notifs = notifRes.notifications || [];
      if (notifs.length > 0) {
        setAlerts(
          notifs.map(n => ({
            id: n.id,
            title: n.title,
            detail: n.message,
            read: n.read,
          }))
        );
      } else {
        setAlerts([
          {
            id: 'n_1',
            title: 'Nightly dependency audit finished',
            detail: '2 minor updates available',
            read: true,
          },
        ]);
      }
    } catch {
      // Graceful fallback
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void loadData();
    const interval = setInterval(() => void loadData(), 10000);
    return () => clearInterval(interval);
  }, [loadData]);

  const activeTabIndex = tab === 'ib' ? 0 : tab === 'fl' ? 1 : tab === 'al' ? 2 : 3;

  const handleResumeRun = async (item: FailureItem) => {
    if (item.runObj) {
      try {
        await executionApi.control(item.runObj, 'resume', crypto.randomUUID());
        onToast(`Resumed run ${item.runId.slice(0, 8)}`);
        void loadData();
        return;
      } catch (err) {
        onToast(err instanceof Error ? err.message : 'Resume failed');
      }
    }
    onToast(`POST /runs/${item.runId}/resume`);
  };

  const handleRepairRun = async (item: FailureItem) => {
    if (item.runObj) {
      try {
        await executionApi.execute(item.runId, crypto.randomUUID());
        onToast(`Repaired run ${item.runId.slice(0, 8)}`);
        void loadData();
        return;
      } catch (err) {
        onToast(err instanceof Error ? err.message : 'Repair failed');
      }
    }
    onToast(`POST /runs/${item.runId}/repairs`);
  };

  return (
    <div className="pg">
      <h2>Inbox</h2>

      {/* Tabs with sliding underline */}
      <div className="tbs">
        <button
          className={`tb ${tab === 'ib' ? 'on' : ''}`}
          data-t="ib"
          onClick={() => setTab('ib')}
        >
          <span>Approvals</span>
          <span className="rk n" id="tc">
            {approvals.length}
          </span>
        </button>
        <button
          className={`tb ${tab === 'fl' ? 'on' : ''}`}
          data-t="fl"
          onClick={() => setTab('fl')}
        >
          Failures
        </button>
        <button
          className={`tb ${tab === 'al' ? 'on' : ''}`}
          data-t="al"
          onClick={() => setTab('al')}
        >
          Alerts
        </button>
        <button
          className={`tb ${tab === 'dp' ? 'on' : ''}`}
          data-t="dp"
          onClick={() => setTab('dp')}
        >
          Deployments
        </button>
        <i
          className="ul-indicator"
          id="ul"
          style={{
            width: tab === 'ib' ? '108px' : tab === 'fl' ? '76px' : tab === 'al' ? '64px' : '108px',
            transform: `translateX(${activeTabIndex * 86}px)`,
          }}
        />
      </div>

      {/* Approvals Pane */}
      {tab === 'ib' && (
        <div className="pane on lst" id="ib" data-r="GET /approvals">
          {loading && approvals.length === 0 ? (
            <div className="p-4 text-xs text-[var(--t3)]">Checking approvals…</div>
          ) : approvals.length === 0 ? (
            <div className="emp">
              <div className="ic">
                <CheckIcon size={22} />
              </div>
              <b>You’re all caught up</b>
              <div className="mut">No actions are waiting for a decision.</div>
            </div>
          ) : (
            approvals.map(approval => (
              <InlineApprovalCard
                key={approval.id}
                approval={approval}
                projectId={projectId}
                inboxMode={true}
                onOpenInChat={onOpenInChat}
                onDecided={() => void loadData()}
              />
            ))
          )}
        </div>
      )}

      {/* Failures Pane */}
      {tab === 'fl' && (
        <div className="pane on" id="fl" data-r="GET /runs/:id/failures · POST /runs/:id/repairs">
          {failures.length === 0 ? (
            <div className="emp">
              <div className="ic">
                <CheckIcon size={22} />
              </div>
              <b>No failure checkpoints</b>
              <div className="mut">All recent executions completed cleanly.</div>
            </div>
          ) : (
            failures.map(item => (
              <div key={item.runId} className="cd mb-3">
                <div className="row">
                  <span className="rk r">Failed</span>
                  <b>{item.title}</b>
                </div>
                <p>{item.description}</p>
                <div className="row2">
                  <button
                    className="bt p sm"
                    data-act="toast"
                    data-m="POST /runs/:id/repairs"
                    onClick={() => void handleRepairRun(item)}
                  >
                    Repair
                  </button>
                  <button
                    className="bt sm"
                    data-act="toast"
                    data-m="POST /runs/:id/resume"
                    onClick={() => void handleResumeRun(item)}
                  >
                    Resume from checkpoint
                  </button>
                  <button className="bt sm" data-act="go" onClick={onOpenInChat}>
                    Open in chat
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Alerts Pane */}
      {tab === 'al' && (
        <div className="pane on" id="al" data-r="GET /notifications · POST /notifications/:id/read">
          {alerts.length === 0 ? (
            <div className="emp">
              <div className="ic">
                <CheckIcon size={22} />
              </div>
              <b>No new alerts</b>
              <div className="mut">System notifications will show up here.</div>
            </div>
          ) : (
            alerts.map(item => (
              <button
                key={item.id}
                className="li"
                data-act="toast"
                onClick={async () => {
                  try {
                    await automationApi.readNotification(item.id);
                    onToast(`Notification marked read: ${item.title}`);
                    void loadData();
                  } catch {
                    onToast(`POST /notifications/${item.id}/read`);
                  }
                }}
              >
                <span className={`rk ${item.read ? 'g' : 'y'} n`}>
                  {item.read ? 'Done' : 'New'}
                </span>
                <div>
                  <b>{item.title}</b>
                  <div className="mut">{item.detail}</div>
                </div>
              </button>
            ))
          )}
        </div>
      )}
      {/* Deployments Pane */}
      {tab === 'dp' && (
        <div className="pane on lst" id="dp" data-r="POST …/deployment-previews · POST …/deployments · POST …/rollback">
          {deployments.length === 0 ? (
            <div className="emp">
              <div className="ic">
                <CheckIcon size={22} />
              </div>
              <b>No deployments active</b>
              <div className="mut">Deployments triggered from verified runs appear here.</div>
            </div>
          ) : (
            deployments.map(item => (
              <div key={item.id} className="cd" style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <b>Deployment {item.id} ({item.environment})</b>
                  <span className="rk g n">{item.status}</span>
                </div>
                <div className="mut mono" style={{ fontSize: '12px', marginBottom: '8px' }}>
                  Target: {item.url || 'localhost'} · run {item.runId}
                </div>
                <div className="row2" style={{ gap: '6px' }}>
                  <button
                    className="bt sm"
                    data-act="toast"
                    onClick={async () => {
                      try {
                        await deploymentApi.rollbackPreview(item.id);
                        onToast(`Rollback preview calculated for ${item.id}`);
                      } catch {
                        onToast(`POST /deployments/${item.id}/rollback-previews`);
                      }
                    }}
                  >
                    Rollback preview
                  </button>
                  <button
                    className="bt sm"
                    data-act="toast"
                    onClick={async () => {
                      try {
                        await deploymentApi.rollback(item.id, 'User initiated rollback');
                        setDeployments(prev => prev.map(d => d.id === item.id ? { ...d, status: 'rolled_back' } : d));
                        onToast(`Deployment ${item.id} rolled back`);
                      } catch {
                        onToast(`POST /deployments/${item.id}/rollback`);
                      }
                    }}
                  >
                    Rollback
                  </button>
                  <button
                    className="bt sm"
                    data-act="toast"
                    onClick={async () => {
                      try {
                        await deploymentApi.createQaSession(item.runId, item.url || 'http://localhost:3000');
                        onToast('Browser QA session launched');
                      } catch {
                        onToast('POST /runs/:id/browser-qa-sessions');
                      }
                    }}
                  >
                    Launch Browser QA
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
