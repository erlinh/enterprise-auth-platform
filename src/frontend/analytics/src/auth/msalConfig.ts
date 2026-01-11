import { Configuration, LogLevel } from '@azure/msal-browser';

const ENTRA_CLIENT_ID = import.meta.env.VITE_ENTRA_CLIENT_ID || 'YOUR_ENTRA_CLIENT_ID';

export const msalConfig: Configuration = {
  auth: {
    clientId: ENTRA_CLIENT_ID,
    authority: 'https://login.microsoftonline.com/organizations',
    redirectUri: window.location.origin,
    postLogoutRedirectUri: window.location.origin,
  },
  cache: {
    cacheLocation: 'localStorage', // Use localStorage for cross-tab SSO
    storeAuthStateInCookie: true, // Enable for IE11/Edge compatibility and cross-site SSO
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
        }
      },
      logLevel: LogLevel.Warning,
    },
  },
};

export const loginRequest = {
  scopes: ['User.Read', 'openid', 'profile', 'email'],
};

export const apiRequest = {
  scopes: [`api://${msalConfig.auth.clientId}/access_as_user`],
};
