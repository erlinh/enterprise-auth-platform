import { Configuration, LogLevel } from '@azure/msal-browser';

const clientId = import.meta.env.VITE_ENTRA_CLIENT_ID || 'd0796ea8-a245-48b9-9317-feffbdd00213';
const tenantId = import.meta.env.VITE_ENTRA_TENANT_ID || 'organizations';

export const msalConfig: Configuration = {
  auth: {
    clientId,
    authority: `https://login.microsoftonline.com/${tenantId}`,
    redirectUri: 'http://localhost:3000',
    postLogoutRedirectUri: 'http://localhost:3000',
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
        if (level === LogLevel.Error) console.error(message);
      },
      logLevel: LogLevel.Error,
    },
  },
};

export const loginRequest = {
  scopes: ['User.Read', 'openid', 'profile', 'email'],
};

export const appLinks = [
  { name: 'Dashboard', port: 3001, description: 'View metrics and analytics', icon: '📊' },
  { name: 'Reports', port: 3002, description: 'Generate and view reports', icon: '📋' },
  { name: 'Settings', port: 3003, description: 'Manage your preferences', icon: '⚙️' },
];
