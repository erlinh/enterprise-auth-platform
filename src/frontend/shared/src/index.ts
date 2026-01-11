// Configuration
export {
  createMsalConfig,
  createLoginRequest,
  createApiRequest,
  DEFAULT_CATALOGUE_URL,
} from './config';
export type { AuthConfig } from './config';

// Types
export type { User, AuthState, AuthActions, UseAuthReturn } from './types';

// Utilities
export {
  clearMsalCache,
  clearStaleMsalCookies,
  redirectToCatalogue,
  hasLogoutParam,
  clearLogoutParam,
  isRedirectInProgress,
  setRedirectInProgress,
} from './utils';

// React hooks (re-export for convenience)
export { useAuth, useSsoSync } from './react';
export type { UseAuthOptions, UseSsoSyncOptions } from './react';
