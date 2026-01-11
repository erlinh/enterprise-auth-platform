import { Configuration, LogLevel } from '@azure/msal-browser';

const clientId = import.meta.env.VITE_ENTRA_CLIENT_ID || 'd0796ea8-a245-48b9-9317-feffbdd00213';
const tenantId = import.meta.env.VITE_ENTRA_TENANT_ID || 'organizations';

export const createMsalConfig = (port: number): Configuration => ({
  auth: {
    clientId,
    authority: `https://login.microsoftonline.com/${tenantId}`,
    redirectUri: `http://localhost:${port}`,
    postLogoutRedirectUri: `http://localhost:${port}`,
    navigateToLoginRequestUrl: true,
  },
  cache: {
    cacheLocation: 'localStorage',
    storeAuthStateInCookie: false,
  },
  system: {
    loggerOptions: {
      loggerCallback: (level, message, containsPii) => {
        if (containsPii) return;
        switch (level) {
          case LogLevel.Error:
            console.error(message);
            break;
          case LogLevel.Warning:
            console.warn(message);
            break;
          case LogLevel.Info:
            console.info(message);
            break;
          case LogLevel.Verbose:
            console.debug(message);
            break;
        }
      },
      logLevel: LogLevel.Warning,
    },
  },
});

export const loginRequest = {
  scopes: ['User.Read', 'openid', 'profile', 'email'],
};

export const graphConfig = {
  graphMeEndpoint: 'https://graph.microsoft.com/v1.0/me',
};

export const appLinks = [
  { name: 'Dashboard', port: 3001, description: 'View metrics and analytics', icon: '📊' },
  { name: 'Reports', port: 3002, description: 'Generate and view reports', icon: '📋' },
  { name: 'Settings', port: 3003, description: 'Manage your preferences', icon: '⚙️' },
];

export const cataloguePort = 3000;
