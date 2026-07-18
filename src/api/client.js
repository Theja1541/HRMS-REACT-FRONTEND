import axios from 'axios';
import { useAuthStore } from '../store/auth.store';
import { isPersonSessionToken, workspaceIdFromAnyToken } from '../utils/jwt';
import { isPlatformPortal } from '../utils/portalContext';
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
  const authState = useAuthStore.getState();
  if (!isPublicAuth) {
    const token = authState.accessToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } else {
    delete config.headers.Authorization;
  }

  // Align API RBAC with the portal role the user selected (manager / employee / hr / …)
  const portalRole =
    authState.selectedRole && authState.roles?.includes(authState.selectedRole)
      ? authState.selectedRole
      : authState.defaultRole || authState.user?.role || null;
  if (portalRole && portalRole !== 'super_admin') {
    config.headers['X-Active-Role'] = portalRole;
  } else {
    delete config.headers['X-Active-Role'];
  }

  const tenantId = authState.selectedTenantId;
  const token = authState.accessToken;
  const workspace = authState.workspace;
  const isGlobalSmtpScope = config.params?.scope === 'global';
  const isPlatformRequest =
    isPlatformPortal(token, workspace) || workspaceIdFromAnyToken(token) === 'platform';
  const isAuthPersonFlow =
    config.url?.includes('/auth/workspaces') || config.url?.includes('/auth/activate-workspace');
  if (
    tenantId &&
    token &&
    !isPersonSessionToken(token) &&
    !isPlatformRequest &&
    !isAuthPersonFlow &&
    !isGlobalSmtpScope
  ) {
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
        let newToken = data.data.accessToken;
        const { promoteToWorkspaceAccessToken } = await import('../utils/workspaceSession');
        if (!isPersonSessionToken(newToken)) {
          newToken = await promoteToWorkspaceAccessToken(newToken);
        }

        processQueue(null, newToken);
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        useAuthStore.getState().logout();
        const onAuthPage = ['/login', '/select-workspace', '/mfa-verify'].includes(window.location.pathname);
        if (!onAuthPage) {
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
