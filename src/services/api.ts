/**
 * HTTP Client API Service for Backend Communication
 * Automatically attaches JWT Authorization headers.
 */

const API_BASE_URL =
  (typeof window !== 'undefined' && (import.meta as any).env?.VITE_API_BASE_URL) ||
  (typeof window !== 'undefined' ? '/api' : 'http://localhost:5000/api');

export function getAuthToken(): string | null {
  try {
    const directToken = sessionStorage.getItem('library_token') || localStorage.getItem('library_token');
    if (directToken) return directToken;

    const sessionStr = localStorage.getItem('college_lms_auth_session');
    if (sessionStr) {
      const parsed = JSON.parse(sessionStr);
      if (parsed?.token) return parsed.token;
    }
  } catch {
    // Ignore parse error
  }
  return null;
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ success: boolean; data?: T; message?: string; error?: any }> {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  const token = getAuthToken();
  if (token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    const contentType = response.headers.get('content-type');
    let data: any = null;
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    if (!response.ok) {
      const message = (typeof data === 'object' && data?.message) || `Request failed with status ${response.status}`;
      return {
        success: false,
        message,
        error: data,
      };
    }

    return {
      success: true,
      data,
    };
  } catch (error: any) {
    console.warn(`[API] Network error requesting ${url}:`, error.message);
    return {
      success: false,
      message: error.message || 'Network request failed',
      error,
    };
  }
}

export const api = {
  get: <T = any>(endpoint: string) => apiRequest<T>(endpoint, { method: 'GET' }),
  post: <T = any>(endpoint: string, body?: any) =>
    apiRequest<T>(endpoint, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  put: <T = any>(endpoint: string, body?: any) =>
    apiRequest<T>(endpoint, { method: 'PUT', body: body ? JSON.stringify(body) : undefined }),
  delete: <T = any>(endpoint: string) => apiRequest<T>(endpoint, { method: 'DELETE' }),
};
