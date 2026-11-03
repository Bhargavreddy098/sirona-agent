import { useState, useEffect, useCallback } from "react";
import sironaApi from "./sironaClient";

export function useSystemHealth() {
  const [health, setHealth] = useState<{ status: string; service: string; db: boolean } | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    sironaApi.health
      .live()
      .then((data) => setHealth(data))
      .catch(() => setHealth({ status: "offline", service: "sirona-desktop", db: false }))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 30000);
    return () => clearInterval(interval);
  }, [refresh]);

  return { health, loading, refresh };
}

export function useProviders() {
  const [providers, setProviders] = useState<any[]>([]);
  const [connections, setConnections] = useState<any[]>([]);
  const [models, setModels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, cRes, mRes] = await Promise.allSettled([
        sironaApi.providers.providers(),
        sironaApi.providers.connections(),
        sironaApi.providers.models(),
      ]);

      if (pRes.status === "fulfilled" && pRes.value?.data) {
        setProviders(pRes.value.data);
      }
      if (cRes.status === "fulfilled" && cRes.value?.data) {
        setConnections(cRes.value.data);
      }
      if (mRes.status === "fulfilled" && mRes.value?.data) {
        setModels(mRes.value.data);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { providers, connections, models, loading, refresh };
}

export function useTools() {
  const [tools, setTools] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await sironaApi.tools.tools();
      if (res?.data) setTools(res.data);
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { tools, loading, refresh };
}

export function useProjects() {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await sironaApi.projects.list();
      if (res?.data) setProjects(res.data);
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { projects, loading, refresh };
}

export function useApprovals() {
  const [approvals, setApprovals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await sironaApi.governance.approvals();
      if (res?.data) setApprovals(res.data);
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { approvals, loading, refresh };
}
