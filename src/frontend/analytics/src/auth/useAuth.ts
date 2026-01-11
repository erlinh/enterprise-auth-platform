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

  const getAccessToken = async (): Promise<string | null> => {
    if (!account) return null;
    
    try {
      const response = await instance.acquireTokenSilent({
        ...apiRequest,
        account,
      });
      return response.accessToken;
    } catch (error) {
      console.error('Token acquisition failed:', error);
      try {
        await instance.acquireTokenRedirect(apiRequest);
      } catch (redirectError) {
        console.error('Redirect failed:', redirectError);
      }
      return null;
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
