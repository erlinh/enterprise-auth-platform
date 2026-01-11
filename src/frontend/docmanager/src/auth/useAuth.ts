import { useMsal, useAccount } from '@azure/msal-react';
import { loginRequest, apiRequest } from './msalConfig';

export function useAuth() {
  const { instance, accounts, inProgress } = useMsal();
  const account = useAccount(accounts[0] || null);

  const login = async () => {
    try {
      await instance.loginRedirect(loginRequest);
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  const logout = async () => {
    // Clear all MSAL cache from localStorage
    const keys = Object.keys(localStorage).filter(k => k.startsWith('msal.'));
    keys.forEach(k => localStorage.removeItem(k));
    
    // Redirect to Microsoft logout, then back to catalogue
    await instance.logoutRedirect({
      postLogoutRedirectUri: 'http://localhost:3000',
    });
  };

  const getAccessToken = async (forceRefresh = false): Promise<string | null> => {
    if (!account) return null;
    
    try {
      const response = await instance.acquireTokenSilent({
        ...apiRequest,
        account,
        forceRefresh, // Force token refresh to validate session
      });
      return response.accessToken;
    } catch (error) {
      console.error('Token acquisition failed:', error);
      // Session is invalid - clear local state and redirect to catalogue
      const keys = Object.keys(localStorage).filter(k => k.startsWith('msal.'));
      keys.forEach(k => localStorage.removeItem(k));
      sessionStorage.clear();
      throw error; // Re-throw so caller can handle
    }
  };

  return {
    isAuthenticated: !!account,
    isLoading: inProgress !== 'none',
    user: account ? {
      id: account.localAccountId,
      name: account.name || 'Unknown',
      email: account.username,
      tenantId: account.tenantId,
    } : null,
    login,
    logout,
    getAccessToken,
    account,
  };
}
