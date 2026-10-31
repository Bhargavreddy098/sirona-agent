import { useEffect, useState, useCallback } from 'react';
import {
  Calendar,
  Play,
  Pause,
  Plus,
  RefreshCw,
  Bell,
  Activity as ActivityIcon,
  CheckCircle2,
  AlertCircle,
  Zap,
} from 'lucide-react';
import {
  automationApi,
  type scheduleSchema,
  type triggerSchema,
  type notificationSchema,
  type activitySchema,
} from '../../api';
import type { z } from 'zod';

type Schedule = z.infer<typeof scheduleSchema>;
type Trigger = z.infer<typeof triggerSchema>;
type Notification = z.infer<typeof notificationSchema>;
type Activity = z.infer<typeof activitySchema>;

export function AutomationView({
  projectId,
  onBack,
}: {
  projectId?: string;
  onBack: () => void;
}) {
  const [tab, setTab] = useState<'schedules' | 'triggers' | 'activity' | 'notifications'>('schedules');
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [triggers, setTriggers] = useState<Trigger[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // New Schedule Form State
  const [showNewSchedule, setShowNewSchedule] = useState(false);
  const [cron, setCron] = useState('0 9 * * 1-5');
  const [goalTemplate, setGoalTemplate] = useState('Run daily unit tests and verification checks');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (tab === 'schedules' && projectId) {
        const res = await automationApi.schedules(projectId);
        setSchedules(res.schedules || []);
      } else if (tab === 'triggers' && projectId) {
        const res = await automationApi.triggers(projectId);
        setTriggers(res.triggers || []);
      } else if (tab === 'activity') {
        const res = await automationApi.activity();
        setActivities(res.activity || res.items || []);
      } else if (tab === 'notifications') {
        const res = await automationApi.notifications();
        setNotifications(res.notifications || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load automation data');
    } finally {
      setLoading(false);
    }
  }, [tab, projectId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleToggleSchedule = async (schedule: Schedule) => {
    try {
      if (schedule.status === 'active') {
        await automationApi.pauseSchedule(schedule.id);
      } else {
        await automationApi.resumeSchedule(schedule.id);
      }
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle schedule state');
    }
  };

  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId) return;
    try {
      await automationApi.createSchedule(projectId, cron, goalTemplate);
      setShowNewSchedule(false);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create schedule');
    }
  };

  const handleMarkNotificationRead = async (id: string) => {
    try {
      await automationApi.readNotification(id);
      setNotifications(prev => prev.map(n => (n.id === id ? { ...n, read: true } : n)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark notification read');
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 select-none overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
          >
            ← Back
          </button>
          <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-800" />
          <h1 className="text-base font-semibold tracking-tight">Automations & Schedules</h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={loading}
            className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50"
            title="Refresh"
            aria-label="Refresh"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          {tab === 'schedules' && projectId && (
            <button
              onClick={() => setShowNewSchedule(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors"
            >
              <Plus size={14} strokeWidth={2.5} />
              <span>New Schedule</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 px-6 pt-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/20 dark:bg-zinc-900/20">
        <button
          onClick={() => setTab('schedules')}
          className={`flex items-center gap-2 px-3 py-2 text-xs font-medium border-b-2 transition-colors cursor-pointer ${
            tab === 'schedules'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
          }`}
        >
          <Calendar size={14} />
          <span>Schedules</span>
        </button>

        <button
          onClick={() => setTab('triggers')}
          className={`flex items-center gap-2 px-3 py-2 text-xs font-medium border-b-2 transition-colors cursor-pointer ${
            tab === 'triggers'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
          }`}
        >
          <Zap size={14} />
          <span>Triggers & Webhooks</span>
        </button>

        <button
          onClick={() => setTab('activity')}
          className={`flex items-center gap-2 px-3 py-2 text-xs font-medium border-b-2 transition-colors cursor-pointer ${
            tab === 'activity'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
          }`}
        >
          <ActivityIcon size={14} />
          <span>Global Activity</span>
        </button>

        <button
          onClick={() => setTab('notifications')}
          className={`flex items-center gap-2 px-3 py-2 text-xs font-medium border-b-2 transition-colors cursor-pointer ${
            tab === 'notifications'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
          }`}
        >
          <Bell size={14} />
          <span>Notifications</span>
          {notifications.filter(n => !n.read).length > 0 && (
            <span className="w-2 h-2 rounded-full bg-blue-600" />
          )}
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-6">
        {error && (
          <div className="mb-4 flex items-center gap-2 p-3 text-xs bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 rounded-lg">
            <AlertCircle size={15} />
            <span>{error}</span>
          </div>
        )}

        {/* Schedules Tab */}
        {tab === 'schedules' && (
          <div className="space-y-4">
            {!projectId ? (
              <div className="p-8 text-center text-zinc-500 text-xs">
                Select a project to inspect and configure recurring schedules.
              </div>
            ) : schedules.length === 0 && !loading ? (
              <div className="p-8 text-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-500 text-xs">
                No recurring schedules configured for this project.
              </div>
            ) : (
              <div className="grid gap-3">
                {schedules.map(item => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
                          {item.cronExpression}
                        </span>
                        <span
                          className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                            item.status === 'active'
                              ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
                              : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                          }`}
                        >
                          {item.status}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-700 dark:text-zinc-300 font-medium">
                        {item.goalTemplate || item.actionSummary || 'Automated task execution'}
                      </p>
                      {item.nextRunAt && (
                        <p className="text-[11px] text-zinc-500 mt-1">
                          Next run: {new Date(item.nextRunAt).toLocaleString()}
                        </p>
                      )}
                    </div>

                    <button
                      onClick={() => handleToggleSchedule(item)}
                      className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer text-zinc-700 dark:text-zinc-300"
                      title={item.status === 'active' ? 'Pause schedule' : 'Resume schedule'}
                    >
                      {item.status === 'active' ? <Pause size={15} /> : <Play size={15} />}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Triggers Tab */}
        {tab === 'triggers' && (
          <div className="space-y-4">
            {!projectId ? (
              <div className="p-8 text-center text-zinc-500 text-xs">
                Select a project to inspect event and webhook triggers.
              </div>
            ) : triggers.length === 0 && !loading ? (
              <div className="p-8 text-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-500 text-xs">
                No active event triggers registered.
              </div>
            ) : (
              <div className="grid gap-3">
                {triggers.map(item => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Zap size={14} className="text-amber-500" />
                        <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">{item.kind}</span>
                        <span className="text-[10px] font-mono text-zinc-500">{item.id}</span>
                      </div>
                      <p className="text-xs text-zinc-600 dark:text-zinc-400">
                        Webhook endpoint: <code className="text-xs bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded">/api/v1/webhooks/{item.id}</code>
                      </p>
                    </div>
                    <span className="text-xs font-medium px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Activity Tab */}
        {tab === 'activity' && (
          <div className="space-y-3">
            {activities.length === 0 && !loading ? (
              <div className="p-8 text-center text-zinc-500 text-xs">No recent activity recorded.</div>
            ) : (
              activities.map(item => (
                <div
                  key={item.id}
                  className="flex items-start gap-3 p-3.5 rounded-lg border border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/30 dark:bg-zinc-900/20 text-xs"
                >
                  <ActivityIcon size={14} className="text-blue-500 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-zinc-800 dark:text-zinc-200">{item.summary}</p>
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-zinc-400">
                      <span>{item.type}</span>
                      <span>•</span>
                      <span>{new Date(item.timestamp).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Notifications Tab */}
        {tab === 'notifications' && (
          <div className="space-y-2.5">
            {notifications.length === 0 && !loading ? (
              <div className="p-8 text-center text-zinc-500 text-xs">No notifications in your inbox.</div>
            ) : (
              notifications.map(item => (
                <div
                  key={item.id}
                  className={`flex items-start justify-between p-3.5 rounded-lg border text-xs transition-colors ${
                    item.read
                      ? 'border-zinc-200/60 dark:border-zinc-800/60 bg-transparent opacity-75'
                      : 'border-blue-200 dark:border-blue-900/40 bg-blue-50/20 dark:bg-blue-950/20'
                  }`}
                >
                  <div>
                    <h2 className="font-semibold text-zinc-900 dark:text-zinc-100 text-xs mb-0.5">{item.title}</h2>
                    <p className="text-zinc-600 dark:text-zinc-400">{item.message}</p>
                    {item.createdAt && (
                      <span className="text-[11px] text-zinc-400 mt-1 block">
                        {new Date(item.createdAt).toLocaleString()}
                      </span>
                    )}
                  </div>
                  {!item.read && (
                    <button
                      onClick={() => handleMarkNotificationRead(item.id)}
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                    >
                      <CheckCircle2 size={13} />
                      <span>Mark read</span>
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* New Schedule Modal Dialog */}
      {showNewSchedule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl w-full max-w-md p-5 text-xs">
            <h2 className="text-sm font-semibold mb-3">Create Recurring Schedule</h2>
            <form onSubmit={handleCreateSchedule} className="space-y-3">
              <div>
                <label className="block text-zinc-600 dark:text-zinc-400 font-medium mb-1">
                  Cron Expression
                </label>
                <input
                  type="text"
                  required
                  value={cron}
                  onChange={e => setCron(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 font-mono text-xs focus:outline-none focus:border-blue-500"
                />
                <span className="text-[11px] text-zinc-400 mt-1 block">
                  Example: <code>0 9 * * 1-5</code> (Every weekday at 9:00 AM)
                </span>
              </div>

              <div>
                <label className="block text-zinc-600 dark:text-zinc-400 font-medium mb-1">
                  Goal Action Template
                </label>
                <textarea
                  required
                  rows={3}
                  value={goalTemplate}
                  onChange={e => setGoalTemplate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowNewSchedule(false)}
                  className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors shadow-xs"
                >
                  Create Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
