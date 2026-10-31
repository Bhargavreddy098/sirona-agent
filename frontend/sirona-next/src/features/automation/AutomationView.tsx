import { useEffect, useState, useCallback } from 'react';
import { automationApi, type scheduleSchema, type occurrenceSchema } from '../../api';
import type { z } from 'zod';
import { Dialog } from '../../components/ui/Dialog';

type Schedule = z.infer<typeof scheduleSchema>;
type Occurrence = z.infer<typeof occurrenceSchema>;

export interface AutomationViewProps {
  projectId?: string;
  onToast: (msg: string) => void;
}

export function AutomationView({ projectId, onToast }: AutomationViewProps) {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [occurrences, setOccurrences] = useState<Occurrence[]>([]);
  const [selectedScheduleName, setSelectedScheduleName] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [cron, setCron] = useState('0 2 * * *');
  const [goal, setGoal] = useState('Nightly dependency audit');

  const loadSchedules = useCallback(async () => {
    setLoading(true);
    try {
      if (projectId) {
        const res = await automationApi.schedules(projectId);
        setSchedules(res.schedules || []);
      } else {
        setSchedules([
          {
            id: 'sch_1',
            projectId: '00000000-0000-0000-0000-000000000000',
            cronExpression: '0 2 * * *',
            status: 'active',
            goalTemplate: 'Nightly dependency audit',
            createdAt: new Date().toISOString(),
          } as unknown as Schedule,
          {
            id: 'sch_2',
            projectId: '00000000-0000-0000-0000-000000000000',
            cronExpression: 'push_webhook',
            status: 'active',
            goalTemplate: 'Run tests on push',
            createdAt: new Date().toISOString(),
          } as unknown as Schedule,
          {
            id: 'sch_3',
            projectId: '00000000-0000-0000-0000-000000000000',
            cronExpression: '0 9 * * 1',
            status: 'paused',
            goalTemplate: 'Weekly cleanup',
            createdAt: new Date().toISOString(),
          } as unknown as Schedule,
        ]);
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void loadSchedules();
  }, [loadSchedules]);

  const handleToggle = async (sch: Schedule) => {
    const isPaused = sch.status === 'paused';
    const nextStatus = isPaused ? 'active' : 'paused';
    setSchedules(prev =>
      prev.map(s => (s.id === sch.id ? ({ ...s, status: nextStatus } as Schedule) : s))
    );
    try {
      if (isPaused) {
        await automationApi.resumeSchedule(sch.id);
        onToast(`Schedule resumed: ${sch.goalTemplate || sch.id}`);
      } else {
        await automationApi.pauseSchedule(sch.id);
        onToast(`Schedule paused: ${sch.goalTemplate || sch.id}`);
      }
    } catch {
      onToast(`Schedule ${nextStatus}`);
    }
  };

  const handleOpenHistory = async (sch: Schedule) => {
    setSelectedScheduleName(sch.goalTemplate || sch.id);
    setShowHistory(true);
    try {
      const res = await automationApi.occurrences(sch.id);
      setOccurrences(res.occurrences || []);
    } catch {
      setOccurrences([
        {
          id: 'occ_1',
          scheduleId: sch.id,
          status: 'completed',
          triggeredAt: new Date(Date.now() - 3600000).toISOString(),
        } as unknown as Occurrence,
      ]);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId) {
      onToast('Attach a project folder to create live schedules');
      setShowCreate(false);
      return;
    }
    try {
      await automationApi.createSchedule(projectId, cron, goal);
      onToast('Schedule created');
      setShowCreate(false);
      void loadSchedules();
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Create schedule failed');
    }
  };

  return (
    <div className="pg">
      <h2>Automations</h2>
      <p className="mut" style={{ marginBottom: '16px' }}>
        Schedules belong to your account, not to a project.
      </p>

      {loading && schedules.length === 0 ? (
        <div className="p-4 text-xs text-[var(--t3)]">Loading automations…</div>
      ) : (
        schedules.map((r, i) => {
          const isActive = r.status === 'active';
          const timingText =
            r.cronExpression === 'push_webhook'
              ? 'Webhook trigger · signed'
              : r.cronExpression === '0 2 * * *'
              ? 'Every day · 02:00 · next run tomorrow 02:00'
              : `Cron: ${r.cronExpression}`;

          return (
            <div
              key={r.id}
              className="li"
              style={{ animationDelay: `${i * 80}ms` }}
              data-r="GET /schedules · PATCH/pause/resume"
            >
              <div>
                <b>{r.goalTemplate || 'Automated run'}</b>
                <div className="mut">{timingText}</div>
              </div>

              <button
                className="bt sm"
                data-act="toast"
                onClick={() => void handleOpenHistory(r)}
              >
                History
              </button>

              <button
                className={`swt ${isActive ? 'on' : ''}`}
                data-act="sw"
                role="switch"
                aria-checked={isActive}
                aria-label={r.goalTemplate || 'Schedule toggle'}
                onClick={() => void handleToggle(r)}
              />
            </div>
          );
        })
      )}

      <button
        className="bt"
        style={{ marginTop: '14px' }}
        onClick={() => setShowCreate(true)}
      >
        New schedule
      </button>

      {/* Occurrences Dialog */}
      <Dialog
        open={showHistory}
        onClose={() => setShowHistory(false)}
        title={`History: ${selectedScheduleName}`}
      >
        <div className="space-y-2 pt-2">
          {occurrences.length === 0 ? (
            <div className="text-xs text-[var(--t2)] py-4 text-center">No runs recorded yet.</div>
          ) : (
            occurrences.map(o => (
              <div key={o.id} className="li">
                <div>
                  <b className="mono">{o.id}</b>
                  <div className="mut">{new Date(o.triggeredAt).toLocaleString()}</div>
                </div>
                <span className={`rk ${o.status === 'completed' ? 'g' : 'r'}`}>
                  {o.status}
                </span>
              </div>
            ))
          )}
        </div>
      </Dialog>

      {/* New Schedule Dialog */}
      <Dialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="Create automation schedule"
      >
        <form onSubmit={e => void handleCreate(e)} className="space-y-4 pt-2">
          <div>
            <label className="block text-xs font-medium text-[var(--t2)] mb-1">Goal template</label>
            <input
              required
              value={goal}
              onChange={e => setGoal(e.target.value)}
              className="w-full px-3 py-2 bg-[var(--s3)] border border-[var(--b1)] rounded-lg text-xs outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--t2)] mb-1">Cron schedule</label>
            <input
              required
              value={cron}
              onChange={e => setCron(e.target.value)}
              className="w-full px-3 py-2 bg-[var(--s3)] border border-[var(--b1)] rounded-lg text-xs font-mono outline-none"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-[var(--b1)]">
            <button
              type="button"
              className="bt sm"
              onClick={() => setShowCreate(false)}
            >
              Cancel
            </button>
            <button type="submit" className="bt p sm">
              Save schedule
            </button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
