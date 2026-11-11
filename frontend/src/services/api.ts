const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

// In-Memory SWR (Stale-While-Revalidate) Cache Store
const apiCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL_MS = 60000; // 1 minute TTL for GET requests

export function clearApiCache(pathPrefix?: string) {
  if (!pathPrefix) {
    apiCache.clear();
    return;
  }
  for (const key of apiCache.keys()) {
    if (key.includes(pathPrefix)) {
      apiCache.delete(key);
    }
  }
}

async function request<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const method = (options.method || 'GET').toUpperCase();
  const cacheKey = `${method}:${endpoint}`;

  // Serve GET requests from SWR cache instantly if available (excluding /auth endpoints)
  if (method === 'GET' && !endpoint.startsWith('/auth')) {
    const cached = apiCache.get(cacheKey);
    const now = Date.now();
    if (cached && now - cached.timestamp < CACHE_TTL_MS) {
      // Revalidate in background asynchronously
      fetchAndCache<T>(endpoint, options, cacheKey).catch(() => {});
      return cached.data as T;
    }
  } else {
    // Invalidate cache on write operations (POST, PUT, DELETE, PATCH)
    clearApiCache(endpoint.split('?')[0].replace(/\/[^/]+$/, ''));
  }

  return fetchAndCache<T>(endpoint, options, cacheKey);
}

async function fetchAndCache<T = any>(
  endpoint: string,
  options: RequestInit,
  cacheKey: string
): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('ff_token') : null;

  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  if (options.body) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}/api${endpoint}`, { ...options, headers });

  if (!res.ok) {
    if (res.status === 401 && endpoint !== '/auth/login' && endpoint !== '/auth/register') {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('ff_token');
        localStorage.removeItem('ff_user');
        window.location.href = '/';
      }
    }
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || err.message || `HTTP ${res.status}`);
  }

  const data = await res.json();
  if ((options.method || 'GET').toUpperCase() === 'GET') {
    apiCache.set(cacheKey, { data, timestamp: Date.now() });
  }
  return data;
}

export const BASE_URL_DIRECT = BASE_URL;

export const api = {
  auth: {
    login: (body: { email: string; password: string }) => {
      clearApiCache();
      return request('/auth/login', { method: 'POST', body: JSON.stringify(body) });
    },
    register: (body: { username: string; email: string; password: string; gender?: string }) => {
      clearApiCache();
      return request('/auth/register', { method: 'POST', body: JSON.stringify(body) });
    },
    googleLogin: (body: { email: string; name?: string; picture?: string; gender?: string; credential?: string }) => {
      clearApiCache();
      return request('/auth/google', { method: 'POST', body: JSON.stringify(body) });
    },
    me: () => request('/auth/me'),
    update: (body: { username?: string; gender?: string; avatar?: string | null; oldPassword?: string; newPassword?: string }) => {
      clearApiCache('/auth');
      return request('/auth/update', { method: 'PUT', body: JSON.stringify(body) });
    },
    upgradePlan: (plan: 'FREE' | 'PRO_MONTHLY' | 'PRO_YEARLY') => {
      clearApiCache('/auth');
      return request('/auth/upgrade-plan', { method: 'POST', body: JSON.stringify({ plan }) });
    },
  },
  projects: {
    list: () => request('/projects'),
    get: (id: string) => request(`/projects/${id}`),
    create: (body: { name: string; description?: string }) => {
      clearApiCache('/projects');
      return request('/projects', { method: 'POST', body: JSON.stringify(body) });
    },
    update: (id: string, body: any) => {
      clearApiCache('/projects');
      return request(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(body) });
    },
    delete: (id: string) => {
      clearApiCache('/projects');
      return request(`/projects/${id}`, { method: 'DELETE' });
    },
  },
  workflows: {
    list: (projectId: string) => request(`/projects/${projectId}/workflows`),
    get: (id: string) => request(`/workflows/${id}`),
    create: (projectId: string, body: any) => {
      clearApiCache('/workflows');
      clearApiCache('/projects');
      return request(`/projects/${projectId}/workflows`, { method: 'POST', body: JSON.stringify(body) });
    },
    update: (id: string, body: any) => {
      clearApiCache(`/workflows/${id}`);
      return request(`/workflows/${id}`, { method: 'PUT', body: JSON.stringify(body) });
    },
    delete: (id: string) => {
      clearApiCache('/workflows');
      return request(`/workflows/${id}`, { method: 'DELETE' });
    },
    publish: (id: string, isPublished: boolean) => {
      clearApiCache(`/workflows/${id}`);
      return request(`/workflows/${id}/publish`, { method: 'POST', body: JSON.stringify({ isPublished }) });
    },
    gatewayConfig: (id: string) => request(`/workflows/${id}/gateway-config`),
    updateGatewayConfig: (id: string, body: any) => {
      clearApiCache(`/workflows/${id}/gateway-config`);
      return request(`/workflows/${id}/gateway-config`, { method: 'PUT', body: JSON.stringify(body) });
    },
  },
  analytics: {
    get: (projectId: string, params?: { workflowId?: string; range?: string }) => {
      const q = new URLSearchParams(params as any).toString();
      return request(`/projects/${projectId}/analytics${q ? '?' + q : ''}`);
    },
    logs: (projectId: string, params?: { workflowId?: string; limit?: number; page?: number; status?: string }) => {
      const q = new URLSearchParams(params as any).toString();
      return request(`/projects/${projectId}/logs${q ? '?' + q : ''}`);
    },
  },
  services: {
    list: (projectId: string) => request(`/projects/${projectId}/services`),
    create: (projectId: string, body: any) => {
      clearApiCache('/services');
      return request(`/projects/${projectId}/services`, { method: 'POST', body: JSON.stringify(body) });
    },
    update: (projectId: string, serviceId: string, body: any) => {
      clearApiCache('/services');
      return request(`/projects/${projectId}/services/${serviceId}`, { method: 'PUT', body: JSON.stringify(body) });
    },
    delete: (projectId: string, serviceId: string) => {
      clearApiCache('/services');
      return request(`/projects/${projectId}/services/${serviceId}`, { method: 'DELETE' });
    },
    createRoute: (projectId: string, serviceId: string, body: any) => {
      clearApiCache('/services');
      return request(`/projects/${projectId}/services/${serviceId}/routes`, { method: 'POST', body: JSON.stringify(body) });
    },
    deleteRoute: (projectId: string, serviceId: string, routeId: string) => {
      clearApiCache('/services');
      return request(`/projects/${projectId}/services/${serviceId}/routes/${routeId}`, { method: 'DELETE' });
    },
  },
  exporter: {
    exportProject: (projectId: string, pushToGit: boolean) =>
      request(`/projects/${projectId}/export`, { method: 'POST', body: JSON.stringify({ pushToGit }) }),
    getJobStatus: (projectId: string, jobId: string) =>
      request(`/projects/${projectId}/export/status/${jobId}`),
    getDownloadUrl: (projectId: string) => `${BASE_URL}/api/projects/${projectId}/export/download`,
    getPreview: (projectId: string) => request(`/projects/${projectId}/export/preview`),
  },
  git: {
    getConfig: () => request('/git-config'),
    saveConfig: (body: any) => {
      clearApiCache('/git-config');
      return request('/git-config', { method: 'POST', body: JSON.stringify(body) });
    },
  },
  ai: {
    generateWorkflow: (prompt: string) => {
      clearApiCache('/auth');
      return request('/ai/generate-workflow', { method: 'POST', body: JSON.stringify({ prompt }) });
    },
  },
  notifications: {
    list: () => request<{ notifications: any[]; unreadCount: number }>('/notifications'),
    markAsRead: (id: string) => request<{ notification: any }>(`/notifications/${id}/read`, { method: 'PATCH' }),
    markAllAsRead: () => request<{ message: string }>('/notifications/read-all', { method: 'POST' }),
    delete: (id: string) => request<{ message: string }>(`/notifications/${id}`, { method: 'DELETE' }),
    clearAll: () => request<{ message: string }>('/notifications/clear-all', { method: 'DELETE' }),
  },
};

