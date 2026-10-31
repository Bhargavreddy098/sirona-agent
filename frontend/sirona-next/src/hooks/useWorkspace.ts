import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api/client';
import type { Conversation, Message, Model, Project, Settings } from '../api/schemas';

export function useWorkspace() {
  const [connected, setConnected] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [error, setError] = useState('');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [attachedFolder, setAttachedFolder] = useState<{ name: string; path?: string } | null>(null);
  const projects: Project[] = attachedFolder
    ? [{ id: attachedFolder.name, name: attachedFolder.name, primaryPath: attachedFolder.path, status: 'active', createdAt: '', updatedAt: '' } as Project]
    : [];
  const [models, setModels] = useState<Model[]>([]);
  const [settings, setSettings] = useState<Settings>();
  const [active, setActive] = useState<Conversation>();
  const [projectId, setProjectId] = useState<string>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [modelId, setModelId] = useState('');
  const [running, setRunning] = useState(false);
  const [stream, setStream] = useState('');
  const [pendingPrompt, setPendingPrompt] = useState('');
  const [failedPrompt, setFailedPrompt] = useState('');
  const [modelSaving, setModelSaving] = useState(false);

  const busy = useRef(false);
  const abort = useRef<AbortController | null>(null);
  const selection = useRef(0);
  const activeRef = useRef<Conversation | undefined>(undefined);

  const loadModels = useCallback(async () => {
    const [{ models }, preferences] = await Promise.all([api.models(), api.settings()]);
    setModels(models);
    setSettings(preferences);
    setModelId(current =>
      current ||
      (models.some(m => m.id === preferences.primaryModel && m.hasConfiguredApiKey)
        ? preferences.primaryModel
        : models.find(m => m.hasConfiguredApiKey)?.id ?? '')
    );
  }, []);

  const loadHistory = useCallback(async () => {
    const history = await api.conversations();
    setConversations(history.sessions);
  }, []);

  const connect = useCallback(async () => {
    setInitializing(true);
    setError('');
    try {
      await api.bootstrap();
      await Promise.all([loadModels(), loadHistory()]);
      setConnected(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not connect');
    } finally {
      setInitializing(false);
    }
  }, [loadHistory, loadModels]);

  useEffect(() => {
    void connect();
    return () => abort.current?.abort();
  }, [connect]);

  useEffect(() => {
    const expired = () => {
      setConnected(false);
      setError('Your desktop session expired or was revoked. Reconnect to continue.');
      abort.current?.abort();
    };
    window.addEventListener('sirona-session-expired', expired);
    return () => window.removeEventListener('sirona-session-expired', expired);
  }, []);

  const open = async (conversation: Conversation) => {
    if (busy.current) return;
    const version = ++selection.current;
    setError('');
    setFailedPrompt('');
    setActive(conversation);
    activeRef.current = conversation;
    setProjectId(conversation.project_id ?? undefined);
    setModelId(conversation.model);
    setMessages([]);
    try {
      const result = await api.messages(conversation.id);
      if (selection.current === version) setMessages(result.messages);
    } catch (cause) {
      if (selection.current === version) setError(String(cause instanceof Error ? cause.message : cause));
    }
  };

  const newChat = (project?: string) => {
    if (busy.current) return;
    ++selection.current;
    setActive(undefined);
    activeRef.current = undefined;
    setMessages([]);
    setProjectId(project);
    setError('');
    setFailedPrompt('');
    setStream('');
    setModelId(
      models.some(m => m.id === settings?.primaryModel && m.hasConfiguredApiKey)
        ? settings!.primaryModel
        : models.find(m => m.hasConfiguredApiKey)?.id ?? ''
    );
  };

  const chooseModel = (id: string) => {
    if (busy.current || modelSaving) return;
    setModelId(id);
    const conversation = activeRef.current;
    if (conversation) {
      setModelSaving(true);
      void api
        .updateModel(conversation.id, id)
        .then(({ conversation: updated }) => {
          if (activeRef.current?.id === updated.id) {
            activeRef.current = updated;
            setActive(updated);
          }
        })
        .catch(cause => setError(cause.message))
        .finally(() => setModelSaving(false));
    }
  };

  const send = async (prompt: string, retryOf?: string) => {
    if (busy.current || modelSaving || !prompt.trim()) return;
    if (!models.some(m => m.id === modelId && m.hasConfiguredApiKey)) {
      setError('Select a model from a configured provider. Availability is confirmed only by a successful turn.');
      return;
    }
    busy.current = true;
    setRunning(true);
    setError('');
    setFailedPrompt('');
    setStream('');
    setPendingPrompt(prompt);
    const controller = new AbortController();
    abort.current = controller;
    const requestId = crypto.randomUUID();
    let conversation = activeRef.current;
    try {
      if (!conversation) {
        conversation = (await api.create(prompt.trim().slice(0, 80), modelId)).conversation;
        activeRef.current = conversation;
        setActive(conversation);
        await loadHistory();
      }
      await api.turn(
        conversation.id,
        prompt,
        modelId,
        requestId,
        controller.signal,
        token => setStream(value => value + token),
        retryOf,
        projectId
      );
    } catch (cause) {
      setFailedPrompt(prompt);
      setError(
        controller.signal.aborted
          ? 'Generation stopped. Reconciling saved messages…'
          : cause instanceof Error
          ? cause.message
          : 'The turn failed'
      );
    } finally {
      if (conversation) {
        try {
          let saved = await api.messages(conversation.id);
          for (
            let count = 0;
            count < 8 && saved.messages.some(m => ['pending', 'streaming'].includes(m.status));
            count++
          ) {
            await new Promise(resolve => setTimeout(resolve, 500));
            saved = await api.messages(conversation.id);
          }
          setMessages(saved.messages);
          if (
            saved.messages.some(
              m => m.role === 'assistant' && m.clientTurnId === requestId && m.status === 'completed'
            )
          ) {
            setError('');
            setFailedPrompt('');
          }
          if (saved.messages.some(m => ['pending', 'streaming'].includes(m.status))) {
            setError('The backend is still reconciling this turn. Reopen this chat before trying again.');
          }
          await loadHistory();
        } catch {
          setError('Could not reconcile saved messages. Reopen this conversation before retrying.');
        }
      }
      setRunning(false);
      busy.current = false;
      abort.current = null;
      setStream('');
      setPendingPrompt('');
    }
  };

  const attachFolder = (name: string, path?: string) => {
    setAttachedFolder({ name, path });
    setProjectId(name);
  };

  const detachFolder = () => {
    setAttachedFolder(null);
    setProjectId(undefined);
  };

  const attachProject = (id: string) => {
    attachFolder(id);
  };

  const detachProject = () => {
    detachFolder();
  };

  const createProject = async (name: string, primaryPath?: string) => {
    attachFolder(name, primaryPath);
    return { id: name, name, primaryPath, status: 'active', createdAt: '', updatedAt: '' } as Project;
  };

  return {
    connected,
    initializing,
    error,
    setError,
    conversations,
    projects,
    models,
    settings,
    active,
    projectId,
    attachedFolder,
    attachFolder,
    detachFolder,
    messages,
    modelId,
    setModelId: chooseModel,
    modelSaving,
    failedPrompt,
    running,
    stream,
    pendingPrompt,
    connect,
    open,
    newChat,
    attachProject,
    detachProject,
    createProject,
    send,
    stop: () => abort.current?.abort(),
    loadHistory,
    loadModels,
  };
}

export type Workspace = ReturnType<typeof useWorkspace>;
