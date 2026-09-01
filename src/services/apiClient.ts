// apiClient.ts - Cliente HTTP Resiliente para PWA e Web
// Garante que o aplicativo nunca apresente telas em branco após suspensão no celular

export const API_AUTH_INVALID_EVENT = 'acorde-auth-invalid';
export const APP_RESUMED_EVENT = 'app-resumed';

// Helper de Cache Local SWR (Stale-While-Revalidate)
export function getStoredCache<T>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(`acorde_swr_${key}`);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn(`[SWR] Erro ao ler cache de ${key}:`, e);
  }
  return defaultValue;
}

export function setStoredCache<T>(key: string, data: T): void {
  try {
    if (data !== undefined && data !== null) {
      localStorage.setItem(`acorde_swr_${key}`, JSON.stringify(data));
    }
  } catch (e) {
    console.warn(`[SWR] Erro ao salvar cache de ${key}:`, e);
  }
}

// Fetch global com tratamento de token e auto-renovação
export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const token = localStorage.getItem('acorde_token');
  const headers = new Headers(init?.headers || {});

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  // Previne cache HTTP estático desatualizado em requisições GET
  const method = (init?.method || 'GET').toUpperCase();
  if (method === 'GET' && !headers.has('Cache-Control')) {
    headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  }

  const newInit: RequestInit = {
    ...init,
    headers,
  };

  try {
    const response = await fetch(input, newInit);

    // Se o servidor enviou um novo token renovado no header, atualiza automaticamente
    const refreshedToken = response.headers.get('x-refreshed-token');
    if (refreshedToken) {
      localStorage.setItem('acorde_token', refreshedToken);
    }

    // Se a autenticação foi rejeitada de forma definitiva
    if (response.status === 401 || response.status === 403) {
      const cloned = response.clone();
      cloned.json().then(body => {
        if (body?.error && String(body.error).toLowerCase().includes('token')) {
          console.warn('[API] Sessão expirada detectada pelo servidor:', body.error);
          window.dispatchEvent(new CustomEvent(API_AUTH_INVALID_EVENT, { detail: body }));
        }
      }).catch(() => {});
    }

    return response;
  } catch (networkError) {
    console.warn('[API Network Error]:', networkError);
    throw networkError;
  }
}

// Get com retorno tipado seguro e fallback
export async function apiGet<T>(url: string, fallback: T): Promise<T> {
  try {
    const res = await apiFetch(url);
    if (!res.ok) return fallback;
    const data = await res.json();
    return data as T;
  } catch (e) {
    return fallback;
  }
}

// SWR Fetcher: Lê cache e faz revalidação em background
export async function fetchWithSwr<T>(
  cacheKey: string,
  url: string,
  onData: (data: T) => void,
  fallback: T
): Promise<T> {
  // 1. Emite dados do cache local imediatamente (0 delay)
  const cached = getStoredCache<T>(cacheKey, fallback);
  if (cached !== undefined && cached !== null) {
    onData(cached);
  }

  // 2. Busca na rede para atualizar com os dados mais recentes
  try {
    const networkData = await apiGet<T>(url, fallback);
    if (networkData !== undefined && networkData !== null) {
      setStoredCache(cacheKey, networkData);
      onData(networkData);
      return networkData;
    }
  } catch (e) {
    console.warn(`[SWR] Rede indisponível temporariamente para ${url}, mantendo cache.`);
  }

  return cached;
}

// Inicializador de escuta de Wake-Up do Mobile / PWA
let isListenerSetup = false;
export function setupAppResumeListener() {
  if (isListenerSetup || typeof window === 'undefined') return;
  isListenerSetup = true;

  let lastResumeTime = Date.now();

  const handleResume = () => {
    const now = Date.now();
    // Debounce de 3 segundos para evitar disparos em excesso
    if (now - lastResumeTime > 3000) {
      lastResumeTime = now;
      console.log('[PWA] Aplicativo retornou ao primeiro plano. Revalidando dados...');
      window.dispatchEvent(new Event(APP_RESUMED_EVENT));
    }
  };

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      handleResume();
    }
  });

  window.addEventListener('focus', handleResume);
  window.addEventListener('online', handleResume);
}
