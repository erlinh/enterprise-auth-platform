export interface User {
  id: string;
  name: string;
  email: string;
  tenantId?: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
}

export interface AuthActions {
  login: () => Promise<void>;
  logout: () => Promise<void>;
  getAccessToken: (forceRefresh?: boolean) => Promise<string | null>;
  checkSsoSession: () => Promise<boolean>;
  /** Validates Microsoft session and handles redirect if invalid */
  validateSession: () => Promise<boolean>;
}

export type UseAuthReturn = AuthState & AuthActions;
