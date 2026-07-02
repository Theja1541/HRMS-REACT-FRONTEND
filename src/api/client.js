import axios from 'axios';
import { useAuthStore } from '../store/auth.store';
import { SUBSCRIPTION_BLOCK_CODES, markSubscriptionBlocked } from '../utils/subscriptionAccess';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

/** Auth routes where 401 is an expected outcome — never trigger token refresh. */
const AUTH_NO_REFRESH_PATHS = [
  '/auth/refresh',
  '/auth/login',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/platform-branding',
];

function isAuthNoRefreshUrl(url) {
  if (!url) return false;
  return AUTH_NO_REFRESH_PATHS.some((path) => url.includes(path));
}

api.interceptors.request.use((config) => {
  const isPublicAuth = isAuthNoRefreshUrl(config.url) && !config.url?.includes('/auth/refresh');
  if (!isPublicAuth) {
    const token = useAuthStore.getState().accessToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } else {
    delete config.headers.Authorization;
  }
  const tenantId = useAuthStore.getState().selectedTenantId;
  const isGlobalSmtpScope = config.params?.scope === 'global';
  if (tenantId && !isGlobalSmtpScope) {
    config.params = { ...config.params, tenant_id: tenantId };
  }
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }
  return config;
});

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve(token);
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !isAuthNoRefreshUrl(originalRequest.url)
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data } = await axios.post('/api/auth/refresh', {}, { withCredentials: true });
        const newToken = data.data.accessToken;
        useAuthStore.getState().setAccessToken(newToken);
        processQueue(null, newToken);
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        useAuthStore.getState().logout();
        const onLoginPage = window.location.pathname === '/login';
        if (!onLoginPage) {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
    if (error.response?.status === 403) {
      const code = error.response?.data?.error?.code;
      const role = useAuthStore.getState().user?.role;
      if (role && role !== 'super_admin' && SUBSCRIPTION_BLOCK_CODES.has(code)) {
        markSubscriptionBlocked(code);
        if (!window.location.pathname.startsWith('/subscription-expired')) {
          window.location.href = '/subscription-expired';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
