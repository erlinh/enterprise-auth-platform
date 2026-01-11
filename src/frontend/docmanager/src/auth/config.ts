import { createMsalConfig, createLoginRequest, createApiRequest } from '@platform/shared-auth';

// Get client ID from environment variable or use placeholder
const CLIENT_ID = import.meta.env.VITE_ENTRA_CLIENT_ID || 'YOUR_ENTRA_CLIENT_ID';
const CATALOGUE_URL = 'http://localhost:3000';
const APP_NAME = 'DocManager';

export const msalConfig = createMsalConfig({
  clientId: CLIENT_ID,
  catalogueUrl: CATALOGUE_URL,
  appName: APP_NAME,
});

export const loginRequest = createLoginRequest(CLIENT_ID);
export const apiRequest = createApiRequest(CLIENT_ID);

export { CATALOGUE_URL, APP_NAME, CLIENT_ID };
