import { Configuration, LogLevel } from '@azure/msal-browser';

export interface AuthConfig {
  clientId: string;
  authority?: string;
  redirectUri?: string;
  postLogoutRedirectUri?: string;
  catalogueUrl?: string;
  appName?: string;
}

const DEFAULT_AUTHORITY = 'https://login.microsoftonline.com/organizations';
const DEFAULT_CATALOGUE_URL = 'http://localhost:3000';

export function createMsalConfig(config: AuthConfig): Configuration {
  const redirectUri = config.redirectUri || window.location.origin;
  const postLogoutRedirectUri = config.postLogoutRedirectUri || config.catalogueUrl || DEFAULT_CATALOGUE_URL;

  return {
    auth: {
      clientId: config.clientId,
      authority: config.authority || DEFAULT_AUTHORITY,
      redirectUri,
      postLogoutRedirectUri,
      navigateToLoginRequestUrl: true,
    },
    cache: {
      cacheLocation: 'localStorage',
      // Disable cookie storage - it causes issues with SameSite restrictions in dev
      storeAuthStateInCookie: false,
    },
    system: {
      loggerOptions: {
        loggerCallback: (level, message, containsPii) => {
          if (containsPii) return;
          const prefix = config.appName ? `[${config.appName}]` : '[MSAL]';
          switch (level) {
            case LogLevel.Error:
              console.error(`${prefix} ${message}`);
              break;
            case LogLevel.Warning:
              console.warn(`${prefix} ${message}`);
              break;
            case LogLevel.Info:
              console.info(`${prefix} ${message}`);
              break;
            case LogLevel.Verbose:
              console.debug(`${prefix} ${message}`);
              break;
          }
        },
        logLevel: LogLevel.Warning,
      },
    },
  };
}

export function createLoginRequest(clientId: string) {
  return {
    scopes: ['User.Read', 'openid', 'profile', 'email'],
  };
}

export function createApiRequest(clientId: string) {
  return {
    scopes: [`api://${clientId}/access_as_user`],
  };
}

export { DEFAULT_CATALOGUE_URL };
