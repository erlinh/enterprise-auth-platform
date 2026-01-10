import { useMsal, useIsAuthenticated } from '@azure/msal-react';
import { InteractionStatus } from '@azure/msal-browser';
import { loginRequest, apiRequest } from './msalConfig';

export function useAuth() {
  const { instance, accounts, inProgress } = useMsal();
  const isAuthenticated = useIsAuthenticated();

  const user = accounts[0];

  const login = async () => {
    try {
      await instance.loginRedirect(loginRequest);
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  const logout = async () => {
    try {
      await instance.logoutRedirect();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const getAccessToken = async (): Promise<string | null> => {
    if (!user) return null;

    try {
      const response = await instance.acquireTokenSilent({
        ...apiRequest,
        account: user,
      });
      return response.accessToken;
    } catch (error) {
      console.error('Token acquisition failed:', error);
      // Fall back to interactive login
      try {
        await instance.acquireTokenRedirect(apiRequest);
        return null; // Redirect will occur
      } catch (interactiveError) {
        console.error('Interactive token acquisition failed:', interactiveError);
        return null;
      }
    }
  };

  return {
    isAuthenticated,
    isLoading: inProgress !== InteractionStatus.None,
    user: user
      ? {
          id: user.localAccountId,
          name: user.name || user.username,
          email: user.username,
          tenantId: user.tenantId,
        }
      : null,
    login,
    logout,
    getAccessToken,
  };
}

