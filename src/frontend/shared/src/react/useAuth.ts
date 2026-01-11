import { useMsal, useIsAuthenticated, useAccount } from '@azure/msal-react';
import { InteractionStatus } from '@azure/msal-browser';
import { useCallback, useMemo, useEffect } from 'react';
import type { UseAuthReturn, User } from '../types';
import { clearMsalCache, redirectToCatalogue, setRedirectInProgress } from '../utils';

export interface UseAuthOptions {
  loginRequest: { scopes: string[] };
  apiRequest: { scopes: string[] };
  catalogueUrl?: string;
  appName?: string;
  /** If true, this is the catalogue app (won't redirect to itself on session invalid) */
  isCatalogue?: boolean;
}

export function useAuth(options: UseAuthOptions): UseAuthReturn {
  const { loginRequest, apiRequest, catalogueUrl = 'http://localhost:3000', appName = 'App', isCatalogue = false } = options;
  const { instance, accounts, inProgress } = useMsal();
  const isAuthenticated = useIsAuthenticated();
  const account = useAccount(accounts[0] || null);

  // Log auth state on every render for debugging
  useEffect(() => {
    console.log(`[${appName}] Auth State:`, {
      isAuthenticated,
      inProgress,
      accountCount: accounts.length,
      account: account?.username || 'none',
      localStorageKeys: Object.keys(localStorage).filter(k => k.startsWith('msal.')),
    });
  }, [appName, isAuthenticated, inProgress, accounts.length, account?.username]);

  const user: User | null = useMemo(() => {
    if (!account) return null;
    return {
      id: account.localAccountId,
      name: account.name || account.username,
      email: account.username,
      tenantId: account.tenantId,
    };
  }, [account]);

  const login = useCallback(async () => {
    try {
      console.log(`[${appName}] login called`);
      await instance.loginRedirect(loginRequest);
    } catch (error) {
      console.error(`[${appName}] Login failed:`, error);
    }
  }, [instance, loginRequest, appName]);

  const logout = useCallback(async () => {
    try {
      console.log(`[${appName}] logout called - clearing local cache`);
      console.log(`[${appName}] localStorage keys before clear:`, Object.keys(localStorage).filter(k => k.startsWith('msal.')));
      clearMsalCache();
      console.log(`[${appName}] localStorage keys after clear:`, Object.keys(localStorage).filter(k => k.startsWith('msal.')));
      
      // Redirect to Microsoft logout, which will then redirect to catalogue with logout=true
      // This signals the catalogue to also clear its cache
      const logoutUrl = `${catalogueUrl}?logout=true`;
      console.log(`[${appName}] Redirecting to Microsoft logout, then to: ${logoutUrl}`);
      
      await instance.logoutRedirect({
        postLogoutRedirectUri: logoutUrl,
      });
    } catch (error) {
      console.error(`[${appName}] Logout failed:`, error);
    }
  }, [instance, catalogueUrl, appName]);

  const getAccessToken = useCallback(async (forceRefresh = false): Promise<string | null> => {
    if (!account) {
      console.log(`[${appName}] No account, returning null`);
      return null;
    }

    try {
      // Normal token acquisition - use default caching behavior
      const response = await instance.acquireTokenSilent({
        ...apiRequest,
        account,
        forceRefresh,
      });
      return response.accessToken;
    } catch (error: unknown) {
      // Check if this is an interaction required error
      const isInteractionRequired = error instanceof Error && 
        (error.name === 'InteractionRequiredAuthError' || 
         error.message.includes('interaction_required') ||
         error.message.includes('login_required'));
      
      if (isInteractionRequired) {
        console.log(`[${appName}] Token requires interaction - Microsoft session is invalid`);
        
        // Clear local MSAL cache since the Microsoft session is gone
        console.log(`[${appName}] Clearing local MSAL cache`);
        clearMsalCache();
        
        // Set redirect flag to prevent useSsoSync from racing with us
        setRedirectInProgress(true);
        
        if (isCatalogue) {
          // For catalogue: just reload to show login page
          console.log(`[${appName}] Catalogue: Reloading to show login page`);
          window.location.reload();
        } else {
          // For demo apps: redirect to catalogue (which will show login page)
          console.log(`[${appName}] Demo app: Redirecting to catalogue`);
          redirectToCatalogue(catalogueUrl, true); // Signal catalogue to also clear cache
        }
        return null;
      }
      
      console.error(`[${appName}] Token acquisition failed:`, error);
      throw error;
    }
  }, [instance, account, apiRequest, isCatalogue, catalogueUrl, appName]);

  const checkSsoSession = useCallback(async (): Promise<boolean> => {
    console.log(`[${appName}] checkSsoSession called`);
    try {
      await instance.ssoSilent({
        ...loginRequest,
        loginHint: account?.username,
      });
      console.log(`[${appName}] SSO session is valid`);
      return true;
    } catch (error) {
      console.log(`[${appName}] SSO session check failed:`, error);
      return false;
    }
  }, [instance, loginRequest, account, appName]);

  /**
   * Validates that the Microsoft session is still active.
   * This uses ssoSilent which checks the actual Microsoft session via iframe,
   * not just the local cached tokens.
   * 
   * Returns true if session is valid.
   * Returns false and handles redirect if session is invalid.
   */
  const validateSession = useCallback(async (): Promise<boolean> => {
    if (!account) {
      console.log(`[${appName}] validateSession: No account`);
      return false;
    }

    console.log(`[${appName}] Validating Microsoft session...`);
    
    try {
      // Use ssoSilent to check if Microsoft session is still valid
      // This sends a request to Microsoft via hidden iframe
      // If the session is gone (user logged out), this will throw
      await instance.ssoSilent({
        ...loginRequest,
        loginHint: account.username,
      });
      console.log(`[${appName}] Microsoft session is valid`);
      return true;
    } catch (error: unknown) {
      // Check if this is because the session is gone
      const isSessionGone = error instanceof Error && 
        (error.name === 'InteractionRequiredAuthError' || 
         error.message.includes('interaction_required') ||
         error.message.includes('login_required') ||
         error.message.includes('AADSTS50058') || // No user signed in
         error.message.includes('AADSTS160021')); // User session doesn't exist

      if (isSessionGone) {
        console.log(`[${appName}] Microsoft session is INVALID - user logged out elsewhere`);
        
        // Clear local MSAL cache
        console.log(`[${appName}] Clearing local MSAL cache`);
        clearMsalCache();
        
        // Set redirect flag to prevent useSsoSync from racing with us
        setRedirectInProgress(true);
        
        if (isCatalogue) {
          console.log(`[${appName}] Catalogue: Reloading to show login page`);
          window.location.reload();
        } else {
          console.log(`[${appName}] Demo app: Redirecting to catalogue`);
          redirectToCatalogue(catalogueUrl, true);
        }
        return false;
      }
      
      // Some other error - log it but don't treat as logout
      console.error(`[${appName}] Session validation error (not treating as logout):`, error);
      return true; // Assume session is valid for non-logout errors
    }
  }, [instance, account, loginRequest, isCatalogue, catalogueUrl, appName]);

  return {
    isAuthenticated,
    isLoading: inProgress !== InteractionStatus.None,
    user,
    login,
    logout,
    getAccessToken,
    checkSsoSession,
    validateSession,
  };
}
