import { useEffect, useCallback, useRef } from 'react';
import { useMsal } from '@azure/msal-react';
import { clearMsalCache, redirectToCatalogue, hasLogoutParam, clearLogoutParam, isRedirectInProgress } from '../utils';

export interface UseSsoSyncOptions {
  isAuthenticated: boolean;
  isLoading: boolean;
  loginRequest: { scopes: string[] };
  catalogueUrl?: string;
  appName?: string;
  /** If true, this is the main catalogue app that handles logout signals */
  isCatalogue?: boolean;
}

/**
 * Hook to synchronize SSO state across apps
 * 
 * For demo apps: Triggers SSO login if not authenticated (will silently authenticate if user is logged in at Microsoft)
 * For catalogue: Handles logout query parameter from other apps
 * 
 * Note: Each app on a different port has its own localStorage, so they need to authenticate independently.
 * SSO works because Microsoft maintains the session - once logged in at Microsoft, other apps can silently authenticate.
 */
export function useSsoSync(options: UseSsoSyncOptions): void {
  const {
    isAuthenticated,
    isLoading,
    loginRequest,
    catalogueUrl = 'http://localhost:3000',
    appName = 'App',
    isCatalogue = false,
  } = options;

  const { instance } = useMsal();
  const hasHandledLogout = useRef(false);
  const hasTriggeredLogin = useRef(false);

  // Log on mount
  useEffect(() => {
    console.log(`[${appName}] useSsoSync initialized:`, {
      isCatalogue,
      isAuthenticated,
      isLoading,
      hasLogoutParam: hasLogoutParam(),
      url: window.location.href,
    });
  }, [appName, isCatalogue, isAuthenticated, isLoading]);

  // Force logout and redirect
  const forceLogout = useCallback(() => {
    console.log(`[${appName}] Force logout triggered - clearing MSAL cache`);
    console.log(`[${appName}] localStorage before clear:`, Object.keys(localStorage).filter(k => k.startsWith('msal.')));
    clearMsalCache();
    console.log(`[${appName}] localStorage after clear:`, Object.keys(localStorage).filter(k => k.startsWith('msal.')));
    
    if (isCatalogue) {
      console.log(`[${appName}] Clearing logout param and reloading`);
      clearLogoutParam();
      window.location.reload();
    } else {
      console.log(`[${appName}] Redirecting to catalogue with logout=true`);
      redirectToCatalogue(catalogueUrl, true);
    }
  }, [appName, catalogueUrl, isCatalogue]);

  // Handle logout query parameter (catalogue only)
  useEffect(() => {
    const hasLogout = hasLogoutParam();
    console.log(`[${appName}] Checking logout param:`, { isCatalogue, hasLogout, hasHandledLogout: hasHandledLogout.current });
    
    if (isCatalogue && hasLogout && !hasHandledLogout.current) {
      console.log(`[${appName}] *** RECEIVED LOGOUT SIGNAL FROM ANOTHER APP ***`);
      hasHandledLogout.current = true;
      forceLogout();
    }
  }, [isCatalogue, forceLogout, appName]);

  // For demo apps: trigger SSO login if not authenticated
  // For catalogue: do nothing (login page will be shown)
  useEffect(() => {
    // Check if another redirect is already in progress (e.g., from getAccessToken failing)
    const redirecting = isRedirectInProgress();
    console.log(`[${appName}] SSO sync effect:`, { 
      isCatalogue, 
      isAuthenticated, 
      isLoading, 
      hasTriggeredLogin: hasTriggeredLogin.current,
      redirectInProgress: redirecting,
    });
    
    // Don't trigger login if we're already redirecting to catalogue
    if (redirecting) {
      console.log(`[${appName}] Redirect already in progress, skipping login trigger`);
      return;
    }
    
    if (!isCatalogue && !isAuthenticated && !isLoading && !hasTriggeredLogin.current) {
      hasTriggeredLogin.current = true;
      console.log(`[${appName}] Not authenticated, triggering SSO login redirect to Microsoft`);
      
      // Use loginRedirect - if user is already logged in at Microsoft, this will silently succeed
      // If not, they'll see the Microsoft login page
      instance.loginRedirect(loginRequest).catch((error) => {
        console.error(`[${appName}] SSO login failed:`, error);
        // If SSO fails, redirect to catalogue
        redirectToCatalogue(catalogueUrl, false);
      });
    }
  }, [isCatalogue, isAuthenticated, isLoading, instance, loginRequest, catalogueUrl, appName]);
}
